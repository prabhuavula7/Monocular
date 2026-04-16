import { CORE_BEHAVIOR } from './core-behavior'
import type { AgencyConfig, IntakeLinkContext, IterativeMemory, ProjectTypeConfig } from '@/types'

function renderAgencyContext(agency: AgencyConfig): string {
  const parts: string[] = []

  parts.push(`Agency name: ${agency.name}`)

  if (agency.tonePreference) {
    parts.push(`Tone preference: ${agency.tonePreference}`)
  }

  if (agency.rateMin && agency.rateMax) {
    parts.push(
      `Typical project range: ${agency.rateCurrency}${agency.rateMin.toLocaleString()}–${agency.rateCurrency}${agency.rateMax.toLocaleString()}`
    )
  }

  if (agency.standardAssumptions.length > 0) {
    parts.push(
      `Standard assumptions for all projects:\n${agency.standardAssumptions.map((a) => `- ${a}`).join('\n')}`
    )
  }

  if (agency.customRiskFlags.length > 0) {
    parts.push(
      `Agency-specific risk flags to probe for:\n${agency.customRiskFlags.map((f) => `- ${f}`).join('\n')}`
    )
  }

  return parts.join('\n\n')
}

function renderProjectTypeContext(pt: ProjectTypeConfig): string {
  const parts: string[] = []

  if (pt.description) {
    parts.push(`Project type description: ${pt.description}`)
  }

  const requiredFields = pt.extractionSchema.filter((f) => f.required)
  const optionalFields = pt.extractionSchema.filter((f) => !f.required)

  if (requiredFields.length > 0) {
    parts.push(
      `Required information to extract:\n${requiredFields
        .map((f) => `- ${f.label}${f.probeHint ? ` (${f.probeHint})` : ''}`)
        .join('\n')}`
    )
  }

  if (optionalFields.length > 0) {
    parts.push(
      `Additional useful information (extract if natural):\n${optionalFields
        .map((f) => `- ${f.label}`)
        .join('\n')}`
    )
  }

  if (pt.milestonePattern.length > 0) {
    parts.push(
      `Standard milestone phases for this project type: ${pt.milestonePattern.join(' → ')}`
    )
  }

  if (pt.riskFlags.length > 0) {
    parts.push(
      `Risk flags specific to this project type:\n${pt.riskFlags.map((f) => `- ${f}`).join('\n')}`
    )
  }

  if (pt.pricingContext) {
    parts.push(`Pricing context: ${pt.pricingContext}`)
  }

  return parts.join('\n\n')
}

function renderLinkContext(ctx: IntakeLinkContext): string {
  const parts: string[] = []

  const clientParts: string[] = []
  if (ctx.clientCompany) clientParts.push(ctx.clientCompany)
  if (ctx.clientWebsite) clientParts.push(`(${ctx.clientWebsite})`)
  if (ctx.clientIndustry) clientParts.push(`— ${ctx.clientIndustry} sector`)
  if (clientParts.length > 0) parts.push(`Client: ${clientParts.join(' ')}`)

  if (ctx.primaryObjective) parts.push(`Primary objective: ${ctx.primaryObjective}`)
  if (ctx.successDefinition) parts.push(`Success looks like: ${ctx.successDefinition}`)
  if (ctx.budgetContext) parts.push(`Budget context: ${ctx.budgetContext}`)
  if (ctx.timelineContext) parts.push(`Timeline context: ${ctx.timelineContext}`)
  if (ctx.stakeholderContext) parts.push(`Stakeholders: ${ctx.stakeholderContext}`)
  if (ctx.technicalContext) parts.push(`Technical context: ${ctx.technicalContext}`)
  if (ctx.mustCapture) parts.push(`Must cover in this conversation: ${ctx.mustCapture}`)
  if (ctx.excludedTopics) parts.push(`Excluded topics (do not explore): ${ctx.excludedTopics}`)
  if (ctx.agencyInstructions) parts.push(`Internal guidance: ${ctx.agencyInstructions}`)

  return parts.join('\n\n')
}

function renderIterativeMemoryContext(history: IterativeMemory[]): string {
  if (history.length === 0) return ''

  // Compress older rounds into one block, keep latest round detailed
  const latest = history[history.length - 1]
  const older = history.slice(0, -1)

  const parts: string[] = []
  parts.push(`This is a follow-up intake conversation. The client has spoken with this team before.`)

  if (older.length > 0) {
    const olderSummary = older
      .map(h => `Round ${h.iterationNumber}: ${h.conversationSummary.slice(0, 200)}`)
      .join('\n')
    parts.push(`Earlier rounds (compressed):\n${olderSummary}`)
  }

  parts.push(`Most recent round (Round ${latest.iterationNumber}):`)
  parts.push(`Conversation: ${latest.conversationSummary}`)
  if (latest.scopeSummary) parts.push(`Scope generated: ${latest.scopeSummary}`)
  if (latest.changeLog) parts.push(`Changes requested: ${latest.changeLog}`)
  if (latest.openQuestions && latest.openQuestions.length > 0) {
    parts.push(`Open questions from last round:\n${latest.openQuestions.map(q => `- ${q}`).join('\n')}`)
  }

  parts.push(
    `Your goal in this round: gather any updates or clarifications, not rediscover the entire project. ` +
    `Use the prior scope as the baseline and focus on what has changed or remained unclear.`
  )

  return parts.join('\n\n')
}

export function composeIntakePrompt(
  agency: AgencyConfig,
  projectType: ProjectTypeConfig | null,
  linkContext?: IntakeLinkContext | null,
  iterativeHistory?: IterativeMemory[] | null,
): string {
  const sections: string[] = [CORE_BEHAVIOR]

  sections.push(`## AGENCY CONTEXT\n${renderAgencyContext(agency)}`)

  if (projectType) {
    sections.push(
      `## PROJECT TYPE: ${projectType.name.toUpperCase()}\n${renderProjectTypeContext(projectType)}`
    )
  } else {
    sections.push(
      `## PROJECT TYPE\nThe project type has not been pre-selected. ` +
        `Start by understanding what kind of project the client needs, ` +
        `then adapt your questions accordingly.`
    )
  }

  if (linkContext) {
    const ctx = renderLinkContext(linkContext)
    if (ctx) sections.push(`## CLIENT CONTEXT\n${ctx}`)
  }

  if (iterativeHistory && iterativeHistory.length > 0) {
    sections.push(`## PRIOR HISTORY\n${renderIterativeMemoryContext(iterativeHistory)}`)
  }

  return sections.join('\n\n---\n\n')
}
