import { inngest } from '../client'
import { runGenerateScope } from '@/lib/run-generate-scope'

export const generateScope = inngest.createFunction(
  { id: 'generate-scope', retries: 2, triggers: [{ event: 'scope/generate' }] },
  async ({ event }: { event: { data: { scopeId: string } } }) => {
    await runGenerateScope(event.data.scopeId)
    return { scopeId: event.data.scopeId }
  }
)
