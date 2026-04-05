import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeSessions, projectTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { composeIntakePrompt } from '@/lib/prompts/composer'
import { anthropic, INTAKE_MODEL } from '@/lib/anthropic'
import type { AgencyConfig, ProjectTypeConfig, Message } from '@/types'

const MAX_MESSAGES = 30

export async function POST(req: NextRequest) {
  const { token, message } = await req.json()

  if (!token || !message) {
    return new Response('Missing token or message', { status: 400 })
  }

  if (typeof message !== 'string' || message.length > 2000) {
    return new Response('Message too long', { status: 400 })
  }

  const [session] = await db
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.token, token))
    .limit(1)

  if (!session) {
    return new Response('Session expired or not found', { status: 404 })
  }

  if (session.expiresAt < new Date()) {
    return new Response('Session expired', { status: 410 })
  }

  if (session.isComplete) {
    return new Response('Intake already completed', { status: 400 })
  }

  if ((session.messageCount ?? 0) >= MAX_MESSAGES) {
    return new Response('Message limit reached', { status: 429 })
  }

  const messages = (session.messages as Message[]).slice()

  messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  })

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, session.agencyId))
    .limit(1)

  let projectType: ProjectTypeConfig | null = null
  if (session.projectTypeId) {
    const [pt] = await db
      .select()
      .from(projectTypes)
      .where(eq(projectTypes.id, session.projectTypeId))
      .limit(1)
    if (pt) projectType = pt as ProjectTypeConfig
  }

  const agencyConfig: AgencyConfig = {
    id: agency.id,
    name: agency.name,
    tonePreference: agency.tonePreference ?? 'professional',
    standardAssumptions: agency.standardAssumptions ?? [],
    customRiskFlags: agency.customRiskFlags ?? [],
    rateMin: agency.rateMin,
    rateMax: agency.rateMax,
    rateCurrency: agency.rateCurrency ?? 'USD',
  }

  const systemPrompt = composeIntakePrompt(agencyConfig, projectType)

  const claudeMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const encoder = new TextEncoder()
  let isComplete = false

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''

      try {
        const claudeStream = anthropic.messages.stream({
          model: INTAKE_MODEL,
          max_tokens: 500,
          system: systemPrompt,
          messages: claudeMessages,
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(encoder.encode(text))
          }
        }

        const COMPLETION_SIGNAL = 'I think I have everything I need'
        isComplete = fullResponse.includes(COMPLETION_SIGNAL)

        messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString(),
        })

        // TODO (V1.1): run lightweight extraction here and update extractedData per turn

        await db
          .update(intakeSessions)
          .set({
            messages,
            isComplete,
            messageCount: (session.messageCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(intakeSessions.token, token))
      } catch (err) {
        console.error('[intake/message] stream error', err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Intake-Complete': isComplete ? 'true' : 'false',
    },
  })
}
