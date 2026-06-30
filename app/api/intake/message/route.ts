import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeSessions, projectTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { composeIntakePrompt } from '@/lib/prompts/composer'
import { anthropic, INTAKE_MODEL } from '@/lib/anthropic'
import { runEngine } from '@/lib/engine'
import type { AgencyConfig, ProjectTypeConfig, Message } from '@/types'

type IntakeSession = typeof intakeSessions.$inferSelect

const MAX_MESSAGES = 30
const USE_ENGINE = process.env.USE_ENGINE === 'true'

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

  if (session.status === 'completed' || (session.isComplete && session.status !== 'awaiting_confirmation')) {
    return new Response('Intake already completed', { status: 400 })
  }

  if ((session.messageCount ?? 0) >= MAX_MESSAGES) {
    return new Response('Message limit reached', { status: 429 })
  }

  const RATE_LIMIT_MS = 2000
  if (session.updatedAt && Date.now() - session.updatedAt.getTime() < RATE_LIMIT_MS) {
    return new Response('Too many requests', { status: 429 })
  }

  const messages = (session.messages as Message[]).slice()

  messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  })

  if (USE_ENGINE) {
    return handleEngineMessage(session, messages, message, token)
  }
  return handleLegacyMessage(session, messages, token)
}

// ── Engine path (non-streaming) ────────────────────────────────────────────────

async function handleEngineMessage(
  session: IntakeSession,
  messages: Message[],
  userMessage: string,
  token: string
) {
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, session.agencyId)).limit(1)

  let engineResult
  try {
    engineResult = await runEngine({
      mode: 'intake',
      agencyId: session.agencyId,
      vertical: 'web-dev',
      sessionToken: token,
      context: {
        // Pass history without the new user message — engine appends it via userMessage
        messages: messages.slice(0, -1),
        userMessage,
        agencyName: agency?.name,
      },
    })
  } catch (err) {
    console.error('[intake/message] engine failed, falling back to legacy', err)
    return handleLegacyMessage(session, messages, token)
  }

  if (engineResult.kind !== 'followup' || !engineResult.followupQuestion) {
    console.error('[intake/message] unexpected engine result kind:', engineResult.kind)
    return handleLegacyMessage(session, messages, token)
  }

  const question = engineResult.followupQuestion
  const readyToComplete = engineResult.readyToComplete ?? false

  // Persist the assistant response
  messages.push({
    role: 'assistant',
    content: question,
    timestamp: new Date().toISOString(),
  })

  let newStatus = session.status ?? 'active'
  if (session.status === 'awaiting_confirmation') {
    newStatus = 'active'
  } else if (readyToComplete) {
    newStatus = 'awaiting_confirmation'
  }

  await db
    .update(intakeSessions)
    .set({
      messages,
      status: newStatus,
      messageCount: (session.messageCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(intakeSessions.token, token))

  return NextResponse.json({ question, readyToComplete })
}

// ── Legacy streaming path ──────────────────────────────────────────────────────

async function handleLegacyMessage(
  session: IntakeSession,
  messages: Message[],
  token: string
) {
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, session.agencyId)).limit(1)

  let projectType: ProjectTypeConfig | null = null
  if (session.projectTypeId) {
    const [pt] = await db.select().from(projectTypes).where(eq(projectTypes.id, session.projectTypeId)).limit(1)
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
  const recentMessages = messages.slice(-20)
  const claudeMessages = recentMessages.map((m) => ({
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
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: claudeMessages,
        })

        for await (const chunk of claudeStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(encoder.encode(text))
          }
        }

        const COMPLETION_SIGNAL = 'I think I have everything I need'
        const readyToComplete = fullResponse.includes(COMPLETION_SIGNAL)

        messages.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString(),
        })

        let newStatus = session.status ?? 'active'
        if (session.status === 'awaiting_confirmation') {
          newStatus = 'active'
        } else if (readyToComplete) {
          newStatus = 'awaiting_confirmation'
        }

        isComplete = readyToComplete

        await db
          .update(intakeSessions)
          .set({
            messages,
            status: newStatus,
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
      'X-Intake-Ready-To-Complete': isComplete ? 'true' : 'false',
    },
  })
}
