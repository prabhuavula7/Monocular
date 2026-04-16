import type { AgencyConfig, ProjectTypeConfig, Message } from '@/types'

export function buildGenerationPrompt(
  agency: AgencyConfig,
  projectType: ProjectTypeConfig | null,
  transcript: Message[],
  priorScopeSummary?: string | null,
): string {
  const transcriptText = transcript
    .map((m) => `${m.role === 'user' ? 'CLIENT' : 'INTAKE'}: ${m.content}`)
    .join('\n')

  return `
You are a project scope document generator for ${agency.name}.

## YOUR TASK
Analyze the intake conversation transcript below and generate a complete,
structured scope document. Output ONLY valid JSON matching the schema below.
No preamble, no markdown fences, no explanation.

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
    "currency": "${agency.rateCurrency || 'USD'}",
    "notes": "Brief rationale for the range"
  },
  "generatedAt": "${new Date().toISOString()}"
}

NOTE: Do NOT include requiresHumanReview, reviewFlags, or confidence in your output.
These fields are computed server-side after your response is validated.

## RULES
- Be specific. Generic deliverables like "Website development" are not acceptable.
- Flag every integration mentioned as a risk flag at minimum medium severity.
- If budget or timeline was mentioned, factor it into the estimate and notes.
- Out-of-scope items should be explicit — they protect the agency.
- If information was missing, make a reasonable assumption and add it to assumptions[].
${
  agency.standardAssumptions.length > 0
    ? `- Include these standard agency assumptions: ${agency.standardAssumptions.join('; ')}`
    : ''
}
${
  projectType?.milestonePattern
    ? `- Use these milestone phases: ${projectType.milestonePattern.join(', ')}`
    : ''
}

${priorScopeSummary ? `## PRIOR SCOPE BASELINE
This is a follow-up iteration. The prior scope is summarized below. Use it as the baseline — update only what the new transcript changes or clarifies. Do not rewrite sections that were not discussed in this round.

${priorScopeSummary}

` : ''}## TRANSCRIPT
${transcriptText}
`.trim()
}
