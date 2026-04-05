import { z } from 'zod'

// Shared Zod schemas for validating Claude's scope generation output.
// Used in the Inngest generate-scope function.

export const PricingEstimateSchema = z.object({
  low: z.number().positive(),
  high: z.number().positive(),
  currency: z.string().default('USD'),
  notes: z.string(),
  clamped: z.boolean().optional(),
})

export const RiskFlagSchema = z.object({
  id: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  description: z.string(),
})

export const DeliverableSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  phase: z.string(),
})

export const MilestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.string(),
  deliverables: z.array(z.string()),
  order: z.number(),
})

// Claude outputs this shape — requiresHumanReview/reviewFlags/confidence
// are computed server-side and NOT included in the generation prompt output.
export const GeneratedScopeSchema = z.object({
  executiveSummary: z.string(),
  deliverables: z.array(DeliverableSchema),
  milestones: z.array(MilestoneSchema),
  outOfScope: z.array(z.string()),
  riskFlags: z.array(RiskFlagSchema),
  assumptions: z.array(z.string()),
  pricingEstimate: PricingEstimateSchema,
  generatedAt: z.string(),
})

export type GeneratedScopeRaw = z.infer<typeof GeneratedScopeSchema>
