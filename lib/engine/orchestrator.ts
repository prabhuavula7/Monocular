import type { MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources'
import { callGateway, ENGINE_MODEL, INTAKE_ENGINE_MODEL } from './gateway'
import { getTool, getAnthropicTools, type ToolContext } from './tools/registry'
import { recordStep, updateRun } from './runs'
import type { EngineInput, EngineResult } from './index'

// Import tool registrations (side-effect imports)
import './tools/ask-followup'
import './tools/synthesize-scope'
import './tools/research'

// Import vertical registrations
import './verticals/web-dev'

import { getVerticalConfig } from './verticals/types'

const MAX_STEPS = 10
const MAX_INPUT_TOKENS_PER_RUN = 60_000

export async function runOrchestrator(
  input: EngineInput,
  runId: string
): Promise<Omit<EngineResult, 'runId'>> {
  const vertical = getVerticalConfig(input.vertical)
  const { mode } = input

  const toolNames =
    mode === 'intake' ? ['ask_followup'] : ['synthesize_scope', 'research']

  const tools = getAnthropicTools(toolNames)
  const model = mode === 'intake' ? INTAKE_ENGINE_MODEL : ENGINE_MODEL
  const systemPrompt = buildSystemPrompt(vertical, mode, input)
  const messages: MessageParam[] = buildInitialMessages(input)

  const ctx: ToolContext = {
    runId,
    agencyId: input.agencyId,
    scopeId: input.scopeId,
    sessionToken: input.sessionToken,
    context: input.context,
  }

  let steps = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  while (steps < MAX_STEPS) {
    if (totalInputTokens > MAX_INPUT_TOKENS_PER_RUN) {
      await updateRun(runId, { status: 'aborted', error: 'token_budget_exceeded' })
      return { kind: 'aborted', steps, tokensUsed: totalInputTokens + totalOutputTokens }
    }

    const stepStart = Date.now()
    const response = await callGateway({ model, system: systemPrompt, messages, tools })

    totalInputTokens += response.inputTokens
    totalOutputTokens += response.outputTokens
    steps++

    await recordStep({
      runId,
      stepIndex: steps,
      type: 'model_call',
      input: { messageCount: messages.length },
      output: {
        stopReason: response.stopReason,
        contentTypes: response.content.map((b) => b.type),
      },
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: Date.now() - stepStart,
    })

    const toolUseBlock = response.content.find(
      (b): b is ToolUseBlock => b.type === 'tool_use'
    )

    if (response.stopReason === 'end_turn' || !toolUseBlock) {
      break
    }

    // Append assistant turn to history before executing tool
    messages.push({ role: 'assistant', content: response.content })

    const tool = getTool(toolUseBlock.name)
    const toolStart = Date.now()
    let toolResultContent: string

    try {
      if (!tool) throw new Error(`Unknown tool: ${toolUseBlock.name}`)

      const parsedInput = tool.inputSchema.parse(toolUseBlock.input)
      const result = await tool.execute(parsedInput, ctx)
      toolResultContent = JSON.stringify(result)

      await recordStep({
        runId,
        stepIndex: steps + 0.5,
        type: 'tool_call',
        toolName: toolUseBlock.name,
        input: toolUseBlock.input,
        output: result,
        latencyMs: Date.now() - toolStart,
      })

      // Loop-exit tools: return immediately without feeding result back to model
      if (toolUseBlock.name === 'ask_followup') {
        const r = result as { question: string }
        await updateRun(runId, {
          status: 'completed',
          kind: 'followup',
          totalInputTokens,
          totalOutputTokens,
          totalSteps: steps,
        })
        return {
          kind: 'followup',
          followupQuestion: r.question,
          steps,
          tokensUsed: totalInputTokens + totalOutputTokens,
        }
      }

      if (toolUseBlock.name === 'synthesize_scope') {
        await updateRun(runId, {
          status: 'completed',
          kind: 'scope_generated',
          totalInputTokens,
          totalOutputTokens,
          totalSteps: steps,
        })
        return {
          kind: 'scope_generated',
          scopeId: input.scopeId,
          steps,
          tokensUsed: totalInputTokens + totalOutputTokens,
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      toolResultContent = JSON.stringify({ error: errMsg })

      await recordStep({
        runId,
        stepIndex: steps + 0.5,
        type: 'tool_call',
        toolName: toolUseBlock.name,
        input: toolUseBlock.input,
        output: { error: errMsg },
        latencyMs: Date.now() - toolStart,
      })
    }

    // Feed tool result back into the conversation
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: toolResultContent,
        },
      ],
    })
  }

  await updateRun(runId, {
    status: 'aborted',
    error: 'max_steps_reached',
    totalInputTokens,
    totalOutputTokens,
    totalSteps: steps,
  })

  return { kind: 'aborted', steps, tokensUsed: totalInputTokens + totalOutputTokens }
}

function buildSystemPrompt(
  vertical: ReturnType<typeof getVerticalConfig>,
  mode: string,
  input: EngineInput
): string {
  if (mode === 'intake') {
    const parts = [vertical.intakePersonaPrompt]
    if (input.context?.agencyName) {
      parts.push(`\nYou are conducting this intake on behalf of ${input.context.agencyName}.`)
    }
    return parts.join('')
  }

  // generate mode: instruct Claude to assess transcript quality and call synthesize_scope
  const parts = [
    `You are an expert project scoping analyst. Your job is to assess the intake transcript provided and generate a structured scope document.`,
    ``,
    `Review the transcript carefully, then call the synthesize_scope tool with your confidence assessment. `,
    `If the transcript is too sparse (fewer than 3 substantive client responses), still call synthesize_scope with confidence='low' — do not refuse.`,
    ``,
    `Before calling synthesize_scope, you may call the research tool once if the client provided a URL that would significantly improve scope accuracy.`,
  ]

  if (vertical.generationSystemSupplement) {
    parts.push(``, vertical.generationSystemSupplement)
  }

  if (input.context?.agencyName) {
    parts.push(``, `This scope is being generated for ${input.context.agencyName}.`)
  }

  return parts.join('\n')
}

function buildInitialMessages(input: EngineInput): MessageParam[] {
  if (input.mode === 'intake') {
    // Intake mode: conversation history + latest user message
    const history = (input.context?.messages as Array<{ role: string; content: string }>) ?? []
    const mapped: MessageParam[] = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    if (input.context?.userMessage) {
      mapped.push({ role: 'user', content: input.context.userMessage as string })
    }

    // Orchestrator must respond via ask_followup — add instruction if no history
    if (mapped.length === 0) {
      mapped.push({ role: 'user', content: '__START_INTAKE__' })
    }

    return mapped
  }

  // generate mode: send transcript as user message
  const transcriptLines = (
    (input.context?.transcript as Array<{ role: string; content: string }>) ?? []
  )
    .map((m) => `${m.role === 'user' ? 'CLIENT' : 'INTAKE'}: ${m.content}`)
    .join('\n')

  const userContent = [
    `## INTAKE TRANSCRIPT`,
    transcriptLines || '(No transcript available)',
  ]

  if (input.context?.priorScopeSummary) {
    userContent.unshift(
      `## PRIOR SCOPE BASELINE`,
      `This is a follow-up. Use the prior scope as baseline and update only what changed.`,
      input.context.priorScopeSummary as string,
      ``
    )
  }

  return [{ role: 'user', content: userContent.join('\n') }]
}
