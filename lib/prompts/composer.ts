import { CORE_BEHAVIOR } from './core-behavior'
import type { AgencyConfig, ProjectTypeConfig } from '@/types'

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

export function composeIntakePrompt(
  agency: AgencyConfig,
  projectType: ProjectTypeConfig | null
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

  return sections.join('\n\n---\n\n')
}
