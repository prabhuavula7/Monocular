import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeLinks, intakeSessions, projectTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { composeIntakePrompt } from '@/lib/prompts/composer'
import { anthropic, INTAKE_MODEL } from '@/lib/anthropic'
import type { AgencyConfig, ProjectTypeConfig } from '@/types'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const [link] = await db
    .select()
    .from(intakeLinks)
    .where(eq(intakeLinks.token, token))
    .limit(1)

  if (!link) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  }

  if (link.isDeprecated) {
    return NextResponse.json({ error: 'This link has been deactivated' }, { status: 410 })
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  // Check if a session already exists for this token
  const [existing] = await db
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.token, token))
    .limit(1)

  // If the link was previously completed (usedAt set) and an old session somehow
  // still exists, clear it so the client gets a fresh conversation.
  if (existing && link.usedAt) {
    await db.delete(intakeSessions).where(eq(intakeSessions.token, token))
  } else if (existing) {
    const messages = existing.messages as Array<{ role: string; content: string; timestamp: string }>
    const opening = messages.find((m) => m.role === 'assistant')
    const [agency] = await db
      .select({ name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, link.agencyId))
      .limit(1)

    // Session is complete but the client never hit /intake/complete (closed the tab
    // right after the AI's final message). Resume and let the client UI trigger
    // completion normally — it will check X-Intake-Complete on the next send,
    // or the user can just submit. Return isComplete flag so the client can
    // immediately show the completion screen.
    if (existing.isComplete) {
      return NextResponse.json({
        openingMessage: opening?.content ?? 'Hi! Tell me about the project you have in mind.',
        agencyName: agency?.name ?? 'the team',
        messages,
        alreadyComplete: true,
      })
    }

    return NextResponse.json({
      openingMessage: opening?.content ?? 'Hi! Tell me about the project you have in mind.',
      agencyName: agency?.name ?? 'the team',
      messages,
    })
  }

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, link.agencyId))
    .limit(1)

  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  }

  let projectType: ProjectTypeConfig | null = null
  if (link.projectTypeId) {
    const [pt] = await db
      .select()
      .from(projectTypes)
      .where(eq(projectTypes.id, link.projectTypeId))
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

  const openingResponse = await anthropic.messages.create({
    model: INTAKE_MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: 'user', content: '__START_INTAKE__' }],
  })

  const openingMessage =
    openingResponse.content[0].type === 'text'
      ? openingResponse.content[0].text
      : 'Hi! Tell me about the project you have in mind.'

  const now = new Date().toISOString()
  const firstMessage = [{ role: 'assistant', content: openingMessage, timestamp: now }]

  await db.insert(intakeSessions).values({
    token,
    agencyId: agency.id,
    projectTypeId: link.projectTypeId ?? null,
    messages: firstMessage,
    extractedData: {},
    isComplete: false,
    messageCount: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  return NextResponse.json({
    openingMessage,
    agencyName: agency.name,
    messages: firstMessage,
  })
}
