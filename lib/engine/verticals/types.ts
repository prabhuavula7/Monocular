export interface RiskPattern {
  trigger: string
  severity: 'low' | 'medium' | 'high'
  note: string
}

export interface VerticalConfig {
  id: string
  name: string
  // Deep persona prompt for the intake orchestrator
  intakePersonaPrompt: string
  // Supplement injected into the generation system prompt (null = use default only)
  generationSystemSupplement: string | null
  // Topics the agent must cover before calling synthesize_scope
  extractionPriorities: string[]
  // Known risk patterns — flagged automatically when detected in transcript
  riskLibrary: RiskPattern[]
}

const verticals = new Map<string, VerticalConfig>()

export function registerVertical(config: VerticalConfig) {
  verticals.set(config.id, config)
}

export function getVerticalConfig(id: string): VerticalConfig {
  const v = verticals.get(id)
  if (!v) throw new Error(`Unknown vertical: ${id}`)
  return v
}

export function listVerticals(): VerticalConfig[] {
  return Array.from(verticals.values())
}
