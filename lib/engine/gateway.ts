import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const ENGINE_MODEL = 'claude-sonnet-4-6'
export const INTAKE_ENGINE_MODEL = 'claude-haiku-4-5-20251001'

export interface GatewayRequest {
  model: string
  system: string
  messages: MessageParam[]
  tools: Tool[]
  maxTokens?: number
}

export interface GatewayResponse {
  stopReason: string
  content: Anthropic.ContentBlock[]
  inputTokens: number
  outputTokens: number
}

export async function callGateway(req: GatewayRequest): Promise<GatewayResponse> {
  const response = await client.messages.create({
    model: req.model,
    max_tokens: req.maxTokens ?? 4000,
    system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
    messages: req.messages,
    tools: req.tools,
    tool_choice: { type: 'auto' },
  })

  return {
    stopReason: response.stop_reason ?? 'end_turn',
    content: response.content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
