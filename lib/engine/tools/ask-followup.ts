import { z } from 'zod'
import { registerTool } from './registry'

registerTool({
  name: 'ask_followup',
  description:
    'Ask the client a follow-up question to gather more information needed for scoping. ' +
    'Call this to continue the intake conversation. The conversation pauses and your question is shown to the client. ' +
    'Set readyToComplete: true when you have gathered enough information to produce a credible scope document — ' +
    'the client will be offered a chance to wrap up after your question.',
  inputSchema: z.object({
    question: z.string(),
    reasoning: z.string().optional(),
    readyToComplete: z.boolean().optional().default(false),
  }),
  inputJsonSchema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'The follow-up question to show the client' },
      reasoning: { type: 'string', description: 'Internal note on why you need this information' },
      readyToComplete: {
        type: 'boolean',
        description:
          'Set to true when you have sufficient information to produce a credible scope. ' +
          'The client will be prompted to wrap up after this question.',
      },
    },
    required: ['question'],
  },
  outputSchema: z.object({ question: z.string(), readyToComplete: z.boolean() }),
  // Loop-exit: orchestrator intercepts this tool call and exits immediately
  execute: async (input) => ({ question: input.question, readyToComplete: input.readyToComplete ?? false }),
})
