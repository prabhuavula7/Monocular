import { z } from 'zod'
import { registerTool } from './registry'

registerTool({
  name: 'ask_followup',
  description:
    'Ask the client a follow-up question to gather more information needed for scoping. ' +
    'Call this to continue the intake conversation. The conversation pauses and your question is shown to the client.',
  inputSchema: z.object({
    question: z.string(),
    reasoning: z.string().optional(),
  }),
  inputJsonSchema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'The follow-up question to show the client' },
      reasoning: { type: 'string', description: 'Internal note on why you need this information' },
    },
    required: ['question'],
  },
  outputSchema: z.object({ question: z.string() }),
  // Loop-exit: orchestrator intercepts this tool call and exits immediately
  execute: async (input) => ({ question: input.question }),
})
