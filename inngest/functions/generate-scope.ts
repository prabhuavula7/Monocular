import { inngest } from '../client'
import { db } from '@/lib/db'
import { agencies, projectTypes, scopes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { anthropic, GENERATION_MODEL } from '@/lib/anthropic'
import { buildGenerationPrompt } from '@/lib/prompts/generation'
import { GeneratedScopeSchema } from '@/lib/schemas'
import type { AgencyConfig, GeneratedScope, ProjectTypeConfig, ReviewFlag, Message } from '@/types'

export const generateScope = inngest.createFunction(
  { id: 'generate-scope', retries: 2, triggers: [{ event: 'scope/generate' }] },
  async ({ event }: { event: { data: { scopeId: string } } }) => {
    const { scopeId } = event.data

    const [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.id, scopeId))
      .limit(1)

    if (!scope) throw new Error(`Scope ${scopeId} not found`)

    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, scope.agencyId))
      .limit(1)

    let projectType: ProjectTypeConfig | null = null
    if (scope.projectTypeId) {
      const [pt] = await db
        .select()
        .from(projectTypes)
        .where(eq(projectTypes.id, scope.projectTypeId))
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

    const generationPrompt = buildGenerationPrompt(
      agencyConfig,
      projectType,
      scope.transcript as Message[]
    )

    const generationResponse = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: generationPrompt }],
    })

    const rawJson =
      generationResponse.content[0].type === 'text'
        ? generationResponse.content[0].text
        : '{}'

    const clean = rawJson.replace(/```json|```/g, '').trim()

    const parsed = GeneratedScopeSchema.safeParse(JSON.parse(clean))
    if (!parsed.success) {
      throw new Error(`Scope validation failed: ${JSON.stringify(parsed.error.flatten())}`)
    }
    const rawScope = parsed.data

    // ── Pricing guardrail ────────────────────────────────────────────────────
    const reviewFlags: ReviewFlag[] = []
    let pricingEstimate = { ...rawScope.pricingEstimate }

    if (agencyConfig.rateMin && agencyConfig.rateMax) {
      const tooLow = pricingEstimate.low < agencyConfig.rateMin * 0.5
      const tooHigh = pricingEstimate.high > agencyConfig.rateMax * 2
      if (tooLow || tooHigh) {
        pricingEstimate = {
          ...pricingEstimate,
          low: Math.max(pricingEstimate.low, agencyConfig.rateMin),
          high: Math.min(pricingEstimate.high, agencyConfig.rateMax * 1.5),
          clamped: true,
        }
        reviewFlags.push({
          id: 'rf-pricing',
          type: 'pricing',
          message:
            'Pricing estimate was outside agency rate range and has been adjusted. Confirm before sending.',
        })
      }
    }

    // ── Confidence scoring ───────────────────────────────────────────────────
    const msgCount = (scope.transcript as Message[]).filter((m) => m.role === 'user').length
    const confidence: GeneratedScope['confidence'] =
      msgCount >= 8 ? 'high' : msgCount >= 4 ? 'medium' : 'low'

    if (confidence === 'low') {
      reviewFlags.push({
        id: 'rf-confidence',
        type: 'missing_info',
        message:
          'Intake was short — scope may be missing key details. Review assumptions carefully.',
      })
    }

    const hasIntegrations = rawScope.riskFlags.some(
      (r) =>
        r.description.toLowerCase().includes('integrat') ||
        r.title.toLowerCase().includes('integrat')
    )
    if (hasIntegrations) {
      reviewFlags.push({
        id: 'rf-integration',
        type: 'integration',
        message:
          'Third-party integrations detected. Confirm technical requirements before committing to timeline.',
      })
    }

    const generatedScope: GeneratedScope = {
      ...rawScope,
      pricingEstimate,
      requiresHumanReview: reviewFlags.length > 0 || confidence !== 'high',
      reviewFlags,
      confidence,
    }

    await db
      .update(scopes)
      .set({ generatedScope, updatedAt: new Date() })
      .where(eq(scopes.id, scopeId))

    return { scopeId, confidence, reviewFlagCount: reviewFlags.length }
  }
)
