'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Markdown from 'react-markdown'

type Mode = 'ask' | 'weekly' | 'prep'
type Status = 'idle' | 'loading' | 'done' | 'error'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Turn = { role: 'user' | 'assistant'; content: string }

function QueryPageInner() {
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as Mode) || 'ask'
  const initialInput = searchParams.get('input') || ''

  const [mode, setMode] = useState<Mode>(initialMode)
  const [input, setInput] = useState(initialInput)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // Ask mode: conversational thread
  const [turns, setTurns] = useState<Turn[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Weekly/Prep: single-turn
  const [answer, setAnswer] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (mode === 'ask' && turns.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [turns, mode])

  function switchMode(m: Mode) {
    setMode(m)
    setInput('')
    setStatus('idle')
    setError(null)
    setTurns([])
    setConversationId(null)
    setAnswer(null)
    setSaveStatus('idle')
  }

  function newConversation() {
    setTurns([])
    setConversationId(null)
    setInput('')
    setStatus('idle')
    setError(null)
    inputRef.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode !== 'weekly' && !input.trim()) return
    setStatus('loading')
    setError(null)

    try {
      if (mode === 'ask') {
        const userQuestion = input.trim()
        setTurns(prev => [...prev, { role: 'user', content: userQuestion }])
        setInput('')

        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userQuestion, conversation_id: conversationId, mode }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Something went wrong')
          setStatus('error')
          setTurns(prev => prev.slice(0, -1))
        } else {
          setTurns(prev => [...prev, { role: 'assistant', content: data.answer }])
          setConversationId(data.conversation_id)
          setStatus('done')
        }
      } else {
        setAnswer(null)
        setSaveStatus('idle')

        const res = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, input }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Something went wrong')
          setStatus('error')
        } else {
          setAnswer(data.answer)
          setStatus('done')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
      setStatus('error')
      if (mode === 'ask') setTurns(prev => prev.slice(0, -1))
    }
  }

  async function handleSave() {
    if (!answer) return
    setSaveStatus('saving')
    const weekEnding = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/recaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: answer, week_ending: weekEnding }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
  }

  const MODES: { id: Mode; label: string }[] = [
    { id: 'ask', label: 'Ask' },
    { id: 'weekly', label: 'Week recap' },
    { id: 'prep', label: 'Prep me' },
  ]

  const placeholders: Record<Mode, string> = {
    ask: 'Ask about meetings, decisions, and action items...',
    weekly: '',
    prep: 'Help prep for a meeting — e.g. "1:1 with David"',
  }

  const submitLabels: Record<Mode, string> = {
    ask: 'Send',
    weekly: 'Summarize my week',
    prep: 'Prep me',
  }

  const loadingLabels: Record<Mode, string> = {
    ask: 'Thinking...',
    weekly: 'Synthesizing...',
    prep: 'Pulling context...',
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-serif font-semibold">Ask</h1>
        {mode === 'ask' && turns.length > 0 && (
          <button
            onClick={newConversation}
            className="text-xs text-lr-stone hover:text-lr-ink transition-colors"
          >
            New conversation
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-lr-ink text-lr-parchment'
                : 'bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Ask: chat thread */}
      {mode === 'ask' && (
        <div className="flex flex-col flex-1">
          {turns.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {turns.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {turn.role === 'user' ? (
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-lr-ink text-lr-parchment text-sm">
                      {turn.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] px-4 py-3 rounded-2xl bg-lr-white lr-border-med text-sm text-lr-ink leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-lr-ink prose-headings:text-lr-ink prose-a:text-lr-red">
                      <Markdown>{turn.content}</Markdown>
                    </div>
                  )}
                </div>
              ))}
              {status === 'loading' && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-lr-white lr-border-med text-sm text-lr-stone">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className={turns.length === 0 ? 'mt-0' : 'mt-auto'}>
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                placeholder={placeholders.ask}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim() && status !== 'loading') handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                rows={2}
                className="flex-1 px-4 py-3 rounded-xl bg-lr-white text-lr-ink placeholder-lr-stone lr-border-med focus:outline-none focus:ring-2 focus:ring-lr-red/20 text-sm resize-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={status === 'loading' || !input.trim()}
                className="px-4 py-3 rounded-xl bg-lr-ink text-lr-parchment font-medium hover:opacity-80 disabled:opacity-40 transition-opacity text-sm whitespace-nowrap"
              >
                {status === 'loading' ? loadingLabels.ask : submitLabels.ask}
              </button>
            </form>
            {turns.length === 0 && (
              <p className="text-xs text-lr-stone mt-2">Press Enter to send, Shift+Enter for a new line.</p>
            )}
          </div>
        </div>
      )}

      {/* Weekly / Prep: single-turn */}
      {mode !== 'ask' && (
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'weekly' && (
              <textarea
                placeholder={placeholders[mode]}
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-lr-white text-lr-ink placeholder-lr-stone lr-border-med focus:outline-none focus:ring-2 focus:ring-lr-red/20 text-sm resize-none"
                autoFocus
              />
            )}
            {mode === 'weekly' && (
              <p className="text-sm text-lr-stone py-2">
                Pulls everything from the last 7 days — meetings, action items, decisions, intelligence — and gives you a plain-language synthesis.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading' || (mode !== 'weekly' && !input.trim())}
              className="w-full py-3 rounded-lg bg-lr-ink text-lr-parchment font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {status === 'loading' ? loadingLabels[mode] : submitLabels[mode]}
            </button>
          </form>

          {answer && (
            <div className="mt-6">
              <div className="bg-lr-white rounded-xl lr-border-med px-4 py-4 text-sm text-lr-ink leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-lr-ink prose-headings:text-lr-ink prose-a:text-lr-red">
                <Markdown>{answer}</Markdown>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => { setAnswer(null); setInput(''); setStatus('idle'); setSaveStatus('idle') }}
                  className="text-sm text-lr-stone hover:text-lr-ink"
                >
                  Ask another
                </button>

                {mode === 'weekly' && (
                  <>
                    {saveStatus === 'saved' ? (
                      <span className="text-sm text-lr-stone">Saved</span>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={saveStatus === 'saving'}
                        className="text-sm text-lr-red hover:opacity-70 disabled:opacity-40 transition-opacity"
                      >
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed — retry?' : 'Save this recap'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-lr-red">{error}</p>}

      {mode === 'weekly' && status !== 'loading' && (
        <div className="mt-8 pt-4 lr-border-t">
          <Link href="/recaps" className="text-xs text-lr-stone hover:text-lr-ink transition-colors">
            View saved recaps
          </Link>
        </div>
      )}
    </div>
  )
}

export default function QueryPage() {
  return (
    <Suspense>
      <QueryPageInner />
    </Suspense>
  )
}
