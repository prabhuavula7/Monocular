'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message } from '@/types'

type ProgressStage = 'starting' | 'exploring' | 'detailing' | 'wrapping' | 'complete'

function getProgressStage(messageCount: number, isComplete: boolean): ProgressStage {
  if (isComplete) return 'complete'
  if (messageCount <= 2) return 'starting'
  if (messageCount <= 6) return 'exploring'
  if (messageCount <= 11) return 'detailing'
  return 'wrapping'
}

const STAGE_LABELS: Record<ProgressStage, string> = {
  starting: 'Getting started',
  exploring: 'Understanding your project',
  detailing: 'Getting the details',
  wrapping: 'Wrapping up',
  complete: 'All done',
}

const STAGE_WIDTHS: Record<ProgressStage, string> = {
  starting: 'w-1/4',
  exploring: 'w-1/2',
  detailing: 'w-3/4',
  wrapping: 'w-11/12',
  complete: 'w-full',
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-orange-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
        }`}
      >
        {text}
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
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const userMessageCount = messages.filter((m) => m.role === 'user').length
  const stage = getProgressStage(userMessageCount, isComplete)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText, isLoading])

  // Start session on mount
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
      } catch {
        setError('Failed to start intake. Please refresh the page.')
      }
    }
    start()
  }, [token])

  const handleComplete = useCallback(async () => {
    try {
      await fetch('/api/intake/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch {
      // Non-blocking — scope generation will retry via Inngest
    }
    setIsComplete(true)
  }, [token])

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading || isComplete) return

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

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

      if (!res.ok || !res.body) {
        throw new Error('Failed to get response')
      }

      const intakeComplete = res.headers.get('X-Intake-Complete') === 'true'
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamText(full)
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: full,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])
      setStreamText('')

      if (intakeComplete) {
        await handleComplete()
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-sm">Setting up your intake...</span>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center px-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Thanks — we&apos;re on it.</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your responses have been sent to {agencyName}. The team will review and follow up with a detailed proposal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <img
              src="/monocular_logo_pack/monocular-horizontal-black.svg"
              alt="Monocular"
              className="h-5 w-auto"
            />
            <span className="text-xs text-gray-400">{STAGE_LABELS[stage]}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 ${STAGE_WIDTHS[stage]}`}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
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
              <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || !isStarted}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim() || !isStarted}
              className="flex-shrink-0 w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Your responses are shared with {agencyName} to prepare your project scope.
          </p>
        </div>
      </div>
    </div>
  )
}
