import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agencies, intakeIterations, intakeLinks, intakeSessions, projectTypes } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { composeIntakePrompt } from '@/lib/prompts/composer'
import { anthropic, INTAKE_MODEL } from '@/lib/anthropic'
import type { AgencyConfig, IntakeLinkContext, IterativeMemory, ProjectTypeConfig } from '@/types'

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

  // Check for existing session
  const [existing] = await db
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.token, token))
    .limit(1)

  // If a completed session still exists (client navigated away before refreshing),
  // clean it up so we start fresh for the next iteration
  if (existing && (existing.status === 'completed' || existing.isComplete)) {
    await db.delete(intakeSessions).where(eq(intakeSessions.token, token))
  } else if (existing) {
    // Resume an active or awaiting_confirmation session
    const messages = existing.messages as Array<{ role: string; content: string; timestamp: string }>
    const opening = messages.find((m) => m.role === 'assistant')
    const [agency] = await db
      .select({ name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, link.agencyId))
      .limit(1)

    return NextResponse.json({
      openingMessage: opening?.content ?? 'Hi! Tell me about the project you have in mind.',
      agencyName: agency?.name ?? 'the team',
      messages,
      readyToComplete: existing.status === 'awaiting_confirmation',
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

  // Load prior iteration history for this link
  const priorIterations = await db
    .select()
    .from(intakeIterations)
    .where(eq(intakeIterations.intakeLinkId, link.id))
    .orderBy(asc(intakeIterations.iterationNumber))

  const iterativeHistory: IterativeMemory[] = priorIterations.map((it) => ({
    iterationNumber: it.iterationNumber,
    conversationSummary: it.conversationSummary,
    scopeSummary: it.scopeSummary ?? null,
    changeLog: it.changeLog ?? null,
    openQuestions: it.openQuestions ?? null,
  }))

  // Build compact prior iteration summary for session storage
  const priorIterationSummary = iterativeHistory.length > 0
    ? iterativeHistory.map(h =>
        `Round ${h.iterationNumber}: ${h.conversationSummary.slice(0, 300)}`
      ).join('\n\n')
    : null

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

  // Build link context from stored fields
  const linkContext: IntakeLinkContext = {
    label: link.label,
    clientCompany: link.clientCompany,
    clientWebsite: link.clientWebsite,
    clientIndustry: link.clientIndustry,
    primaryObjective: link.primaryObjective,
    successDefinition: link.successDefinition,
    budgetContext: link.budgetContext,
    timelineContext: link.timelineContext,
    stakeholderContext: link.stakeholderContext,
    technicalContext: link.technicalContext,
    mustCapture: link.mustCapture,
    excludedTopics: link.excludedTopics,
    agencyInstructions: link.agencyInstructions,
    engagementType: (link.engagementType as 'general' | 'template') ?? 'general',
  }

  const hasLinkContext = Object.values(linkContext).some(v => v !== null && v !== undefined && v !== 'general')

  const systemPrompt = composeIntakePrompt(
    agencyConfig,
    projectType,
    hasLinkContext ? linkContext : null,
    iterativeHistory.length > 0 ? iterativeHistory : null,
  )

  // Generate opening message — use a different prompt if this is a follow-up round
  const startPrompt = iterativeHistory.length > 0
    ? '__RESUME_INTAKE__'   // Claude will see the prior history context and open appropriately
    : '__START_INTAKE__'

  const openingResponse = await anthropic.messages.create({
    model: INTAKE_MODEL,
    max_tokens: 400,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: startPrompt }],
  })

  const openingMessage =
    openingResponse.content[0].type === 'text'
      ? openingResponse.content[0].text
      : 'Hi! Tell me about the project you have in mind.'

  const now = new Date().toISOString()
  const firstMessage = [{ role: 'assistant', content: openingMessage, timestamp: now }]

  const iterationNumber = (link.iterationCount ?? 0) + 1
  const parentScopeId = link.latestScopeId ?? null

  await db.insert(intakeSessions).values({
    token,
    agencyId: agency.id,
    projectTypeId: link.projectTypeId ?? null,
    messages: firstMessage,
    extractedData: {},
    isComplete: false,
    messageCount: 0,
    status: 'active',
    iterationNumber,
    parentScopeId,
    priorIterationSummary,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  return NextResponse.json({
    openingMessage,
    agencyName: agency.name,
    messages: firstMessage,
    iterationNumber,
    isFollowUp: iterativeHistory.length > 0,
  })
}
