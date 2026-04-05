import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Haiku for intake turns (fast, cheap ~$0.03/session)
export const INTAKE_MODEL = 'claude-haiku-4-5-20251001'

// Sonnet for scope generation (higher quality, ~$0.04/generation)
export const GENERATION_MODEL = 'claude-sonnet-4-6'
