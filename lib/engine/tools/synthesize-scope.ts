import { z } from 'zod'
import { registerTool } from './registry'
import { runGenerateScope } from '@/lib/run-generate-scope'

registerTool({
  name: 'synthesize_scope',
  description:
    'Generate the structured scope document from the completed intake transcript. ' +
    'Call this once you have enough information to produce a complete, credible scope. ' +
    'Include your confidence level and any gaps that should be flagged for human review.',
  inputSchema: z.object({
    confidence: z.enum(['high', 'medium', 'low']),
    gaps: z.array(z.string()).optional(),
    readinessNotes: z.string().optional(),
  }),
  inputJsonSchema: {
    type: 'object' as const,
    properties: {
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Your confidence in the scope completeness based on the intake transcript',
      },
      gaps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Information gaps or assumptions that should be flagged for human review',
      },
      readinessNotes: {
        type: 'string',
        description: 'Brief note about the intake quality or anything the reviewer should know',
      },
    },
    required: ['confidence'],
  },
  outputSchema: z.object({ success: z.boolean(), scopeId: z.string() }),
  execute: async (_input, ctx) => {
    if (!ctx.scopeId) throw new Error('synthesize_scope requires a scopeId in context')
    await runGenerateScope(ctx.scopeId)
    return { success: true, scopeId: ctx.scopeId }
  },
})
