import type { AgencyConfig, ProjectTypeConfig, Message } from '@/types'

// Static schema definition — identical across all generations, safe to cache.
const GENERATION_SCHEMA = `
## OUTPUT SCHEMA
{
  "executiveSummary": "2-3 sentence summary of the project",
  "deliverables": [
    {
      "id": "d1",
      "title": "Short deliverable name",
      "description": "1-2 sentence description",
      "phase": "Phase name from milestones"
    }
  ],
  "milestones": [
    {
      "id": "m1",
      "name": "Phase name",
      "duration": "e.g. 2 weeks",
      "deliverables": ["d1", "d2"],
      "order": 1
    }
  ],
  "outOfScope": [
    "Item explicitly excluded or not mentioned"
  ],
  "riskFlags": [
    {
      "id": "r1",
      "severity": "low|medium|high",
      "title": "Short risk name",
      "description": "Why this is a risk and what to watch for"
    }
  ],
  "assumptions": [
    "Assumption the scope is built on"
  ],
  "pricingEstimate": {
    "low": 15000,
    "high": 25000,
    "currency": "USD",
    "notes": "Brief rationale for the range"
  },
  "generatedAt": "<ISO timestamp>"
}

NOTE: Do NOT include requiresHumanReview, reviewFlags, or confidence in your output.
These fields are computed server-side after your response is validated.

## RULES
- Be specific. Generic deliverables like "Website development" are not acceptable.
- Flag every integration mentioned as a risk flag at minimum medium severity.
- If budget or timeline was mentioned, factor it into the estimate and notes.
- Out-of-scope items should be explicit — they protect the agency.
- If information was missing, make a reasonable assumption and add it to assumptions[].
`.trim()

export function buildGenerationSystemPrompt(
  agency: AgencyConfig,
  projectType: ProjectTypeConfig | null,
): string {
  const agencyRules: string[] = []

  if (agency.standardAssumptions.length > 0) {
    agencyRules.push(`- Include these standard agency assumptions: ${agency.standardAssumptions.join('; ')}`)
  }
  if (projectType?.milestonePattern) {
    agencyRules.push(`- Use these milestone phases: ${projectType.milestonePattern.join(', ')}`)
  }
  if (agency.rateCurrency && agency.rateCurrency !== 'USD') {
    agencyRules.push(`- Use currency: ${agency.rateCurrency}`)
  }

  return [
    `You are a project scope document generator for ${agency.name}.`,
    `Analyze the intake conversation transcript in the user message and generate a complete, structured scope document. Output ONLY valid JSON matching the schema below. No preamble, no markdown fences, no explanation.`,
    GENERATION_SCHEMA,
    agencyRules.length > 0 ? `## AGENCY-SPECIFIC RULES\n${agencyRules.join('\n')}` : '',
  ].filter(Boolean).join('\n\n')
}

export function buildGenerationUserPrompt(
  transcript: Message[],
  priorScopeSummary?: string | null,
): string {
  const transcriptText = transcript
    .map((m) => `${m.role === 'user' ? 'CLIENT' : 'INTAKE'}: ${m.content}`)
    .join('\n')

  const parts: string[] = []

  if (priorScopeSummary) {
    parts.push(
      `## PRIOR SCOPE BASELINE\nThis is a follow-up iteration. Use the prior scope as the baseline — update only what the new transcript changes or clarifies. Do not rewrite sections that were not discussed in this round.\n\n${priorScopeSummary}`
    )
  }

  parts.push(`## TRANSCRIPT\n${transcriptText}`)

  return parts.join('\n\n')
}
