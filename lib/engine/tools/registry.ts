import { z, type ZodTypeAny } from 'zod'
import type { Tool } from '@anthropic-ai/sdk/resources'

export interface ToolContext {
  runId: string
  agencyId: string
  scopeId?: string
  sessionToken?: string
  context: Record<string, unknown>
}

export interface ToolDef<I extends ZodTypeAny, O extends ZodTypeAny> {
  name: string
  description: string
  inputSchema: I
  inputJsonSchema: Tool['input_schema']
  outputSchema: O
  execute: (input: z.infer<I>, ctx: ToolContext) => Promise<z.infer<O>>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, ToolDef<any, any>>()

export function registerTool<I extends ZodTypeAny, O extends ZodTypeAny>(def: ToolDef<I, O>) {
  registry.set(def.name, def)
}

export function getTool(name: string) {
  return registry.get(name)
}

export function getAnthropicTools(names: string[]): Tool[] {
  return names.map((name) => {
    const tool = registry.get(name)
    if (!tool) throw new Error(`Tool not registered: ${name}`)
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputJsonSchema,
    }
  })
}
