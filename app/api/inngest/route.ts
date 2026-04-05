import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { generateScope } from '@/inngest/functions/generate-scope'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateScope],
})
