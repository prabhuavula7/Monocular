'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Message } from '@/types'
import { ThemeToggle } from '@/components/ThemeToggle'

// Stages are purely for the label — progress bar uses a continuous percentage.
type ProgressStage = 'starting' | 'exploring' | 'detailing' | 'wrapping' | 'complete'

const STAGES: ProgressStage[] = ['starting', 'exploring', 'detailing', 'wrapping', 'complete']

const STAGE_META: Record<ProgressStage, { label: string; description: string }> = {
  starting:  { label: 'Getting started',          description: 'Tell us about your project' },
  exploring: { label: 'Understanding your project', description: 'Digging into the details'   },
  detailing: { label: 'Nailing the details',       description: 'Covering the specifics'      },
  wrapping:  { label: 'Almost done',               description: 'Final questions'              },
  complete:  { label: 'All done',                  description: 'Scope on its way'             },
}

function getProgressStage(userMessageCount: number, isComplete: boolean): ProgressStage {
  if (isComplete)              return 'complete'
  if (userMessageCount <= 2)   return 'starting'
  if (userMessageCount <= 6)   return 'exploring'
  if (userMessageCount <= 11)  return 'detailing'
  return 'wrapping'
}

// Smooth percentage: starts at 4%, grows ~11% per exchange (assumes ~8 exchanges for a full intake).
// Each message is a visible jump. Caps at 97% until Claude signals completion.
function getProgressPercent(userMessageCount: number, isComplete: boolean): number {
  if (isComplete) return 100
  if (userMessageCount === 0) return 4
  return Math.min(4 + Math.round((userMessageCount / 8) * 93), 97)
}

// Minimal markdown renderer — handles bold, headers, bullets as fallback
// The system prompt instructs Claude not to use markdown, but this guards
// against any that slips through.
function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  function inlineRender(raw: string, key: string | number): React.ReactNode {
    // Split on **bold** and *italic* tokens
    const parts = raw.split(/(\*\*[^*]+?\*\*|\*[^*\n]+?\*)/g)
    return (
      <span key={key}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i}>{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={i}>{part.slice(1, -1)}</em>
          return part
        })}
      </span>
    )
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.match(/^#{1,3}\s/)) {
      // Strip header marker, render as semibold
      nodes.push(
        <span key={i} className="font-semibold block">
          {inlineRender(line.replace(/^#+\s+/, ''), i)}
        </span>
      )
    } else if (line.match(/^[-*]\s/)) {
      nodes.push(
        <span key={i} className="flex gap-2 ml-1 mt-0.5">
          <span className="mt-2 w-1 h-1 rounded-full bg-current flex-shrink-0" />
          <span>{inlineRender(line.replace(/^[-*]\s+/, ''), i)}</span>
        </span>
      )
    } else if (line === '') {
      nodes.push(<span key={i} className="block h-2" />)
    } else {
      nodes.push(
        <span key={i} className="block">
          {inlineRender(line, i)}
        </span>
      )
    }
    i++
  }

  return <>{nodes}</>
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  streaming?: boolean
  streamText?: string
}

function MessageBubble({ message, streaming, streamText }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const text = streaming ? streamText ?? '' : message.content

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-orange text-white rounded-br-sm whitespace-pre-wrap'
            : 'bg-panel text-ink border border-line rounded-bl-sm panel-shadow'
        }`}
      >
        {isUser ? text : parseMarkdown(text)}
      </div>
    </div>
  )
}

interface Props {
  token: string
  agencyName: string
}

export default function IntakeChatClient({ token, agencyName }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [readyToComplete, setReadyToComplete] = useState(false)  // Claude has enough info — show decision card
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [completingIntake, setCompletingIntake] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const userMessageCount = messages.filter((m) => m.role === 'user').length
  const stage = getProgressStage(userMessageCount, isComplete)
  const percent = getProgressPercent(userMessageCount, isComplete)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText, isLoading])

  const handleComplete = useCallback(async () => {
    setCompletingIntake(true)
    try {
      await fetch('/api/intake/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch {
      // Non-blocking — the scope is still created server-side
    }
    setIsComplete(true)
    setReadyToComplete(false)
    setCompletingIntake(false)
  }, [token])

  const handleContinue = useCallback(() => {
    // Client chose to keep chatting — dismiss the decision card
    setReadyToComplete(false)
  }, [])

  const handleModify = useCallback(() => {
    // Client wants to clarify — inject a local assistant prompt and re-enable input
    setReadyToComplete(false)
    const modifyPrompt: Message = {
      role: 'assistant',
      content: 'Got it — what would you like to change or clarify?',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, modifyPrompt])
  }, [])

  useEffect(() => {
    async function start() {
      try {
        const res = await fetch('/api/intake/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!res.ok) throw new Error('Failed to start session')
        const data = await res.json()
        setMessages(data.messages ?? [{ role: 'assistant', content: data.openingMessage, timestamp: new Date().toISOString() }])
        setIsStarted(true)
        // Session was in awaiting_confirmation when client rejoined — restore decision card
        if (data.readyToComplete) {
          setReadyToComplete(true)
        }
      } catch {
        setError('Failed to start intake. Please refresh the page.')
      }
    }
    start()
  }, [token, handleComplete])

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading || isComplete || readyToComplete) return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setStreamText('')
    setError(null)

    try {
      const res = await fetch('/api/intake/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, message: text }),
      })

      if (!res.ok || !res.body) throw new Error('Failed to get response')

      const intakeReadyToComplete = res.headers.get('X-Intake-Ready-To-Complete') === 'true'
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamText(full)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: full, timestamp: new Date().toISOString() }])
      setStreamText('')
      if (intakeReadyToComplete) setReadyToComplete(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setMessages((prev) => prev.filter((m) => m !== userMsg))
      setInputValue(text)
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, isComplete, token, handleComplete])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isStarted && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex items-center gap-2.5 text-ink-2">
          <div className="w-4 h-4 border-2 border-line border-t-orange rounded-full animate-spin" />
          <span className="text-sm">Setting up your intake...</span>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="max-w-md text-center px-6">
          <div className="w-12 h-12 bg-orange-dim border border-orange-border rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-ink mb-2">Thanks — we&apos;re on it.</h1>
          <p className="text-ink-2 text-sm leading-relaxed">
            Your responses have been sent to {agencyName}. The team will review and follow up with a detailed proposal.
          </p>
          <p className="text-ink-3 text-xs leading-relaxed mt-3">
            If anything changes or you want to refine the scope, you can reopen this link at any time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* Progress bar header — full viewport width */}
      <div className="bg-panel border-b border-line px-6 pt-3 pb-3">
        {/* Top row: [spacer] · logo (centered) · stage info + theme toggle */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-2.5">
          <div />
          <div className="flex items-center justify-center">
            <img src="/monocular-blacktext.svg" alt="Monocular" className="h-7 w-auto dark:hidden" />
            <img src="/monocular-whitetext.svg" alt="Monocular" className="h-7 w-auto hidden dark:block" />
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <span className="text-xs font-medium text-ink-2">{STAGE_META[stage].label}</span>
              <span className="text-xs text-ink-3 ml-2 tabular-nums">{percent}%</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Progress bar — h-2 so it's actually visible */}
        <div className="h-2 bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange to-amber-400 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Description updates every stage */}
        <p className="text-[11px] text-ink-3 mt-1.5 transition-all duration-300">{STAGE_META[stage].description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isLoading && streamText && (
            <MessageBubble
              message={{ role: 'assistant', content: '', timestamp: '' }}
              streaming
              streamText={streamText}
            />
          )}

          {isLoading && !streamText && (
            <div className="flex justify-start">
              <div className="bg-panel border border-line rounded-2xl rounded-bl-sm panel-shadow">
                <TypingIndicator />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 justify-center">
              <p className="text-xs text-red-500">{error}</p>
              <button
                onClick={() => { setError(null); setInputValue(inputValue) }}
                className="text-xs text-orange underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Decision card — shown when Claude signals it has enough info */}
          {readyToComplete && !isLoading && (
            <div className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-panel border border-orange/30 rounded-2xl p-4 panel-shadow">
                <p className="text-sm font-medium text-ink mb-1">Ready to wrap up?</p>
                <p className="text-xs text-ink-3 mb-4 leading-relaxed">
                  The team has what they need. You can complete the intake, ask for changes, or keep going.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleComplete}
                    disabled={completingIntake}
                    className="w-full bg-orange text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-orange-hover disabled:opacity-50 transition-colors"
                  >
                    {completingIntake ? 'Submitting...' : 'Complete intake'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleModify}
                      className="flex-1 border border-line text-ink-2 rounded-xl py-2 text-xs font-medium hover:bg-panel-hover transition-colors"
                    >
                      Modify / clarify
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex-1 border border-line text-ink-2 rounded-xl py-2 text-xs font-medium hover:bg-panel-hover transition-colors"
                    >
                      Keep going
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-panel border-t border-line">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={readyToComplete ? 'Choose an option above or keep typing...' : 'Type your message...'}
              disabled={isLoading || !isStarted || readyToComplete}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-line bg-canvas text-ink placeholder-ink-3 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange/30 focus:border-orange/50 disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto transition-shadow"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim() || !isStarted || readyToComplete}
              className="flex-shrink-0 w-10 h-10 bg-orange text-white rounded-xl flex items-center justify-center hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-ink-3 mt-2 text-center">
            Your responses are shared with {agencyName} to prepare your project scope.
          </p>
        </div>
      </div>
    </div>
  )
}
