'use client'

import { useState } from 'react'
import Link from 'next/link'
import Markdown from 'react-markdown'

type Mode = 'ask' | 'weekly' | 'prep'
type Status = 'idle' | 'loading' | 'done' | 'error'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function QueryPage() {
  const [mode, setMode] = useState<Mode>('ask')
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode !== 'weekly' && !input.trim()) return
    setStatus('loading')
    setAnswer(null)
    setError(null)
    setSaveStatus('idle')

    const endpoint = mode === 'ask' ? '/api/query' : '/api/synthesize'
    const body = mode === 'ask'
      ? { question: input }
      : { mode, input }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  async function handleSave() {
    if (!answer) return
    setSaveStatus('saving')
    const weekEnding = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/recaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: answer, week_ending: weekEnding }),
    })
    if (res.ok) {
      setSaveStatus('saved')
    } else {
      setSaveStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setAnswer(null)
    setInput('')
    setError(null)
    setSaveStatus('idle')
  }

  const MODES: { id: Mode; label: string }[] = [
    { id: 'ask', label: 'Ask' },
    { id: 'weekly', label: 'Week recap' },
    { id: 'prep', label: 'Prep me' },
  ]

  const placeholders: Record<Mode, string> = {
    ask: 'What do I owe? What decisions were made about pricing? What\'s still open from last Tuesday?',
    weekly: '',
    prep: 'Name a person or meeting to prep for — e.g. "1:1 with David" or "Priya Nair"',
  }

  const submitLabels: Record<Mode, string> = {
    ask: 'Ask',
    weekly: 'Summarize my week',
    prep: 'Prep me',
  }

  const loadingLabels: Record<Mode, string> = {
    ask: 'Thinking...',
    weekly: 'Synthesizing...',
    prep: 'Pulling context...',
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-serif font-semibold mb-4">Ask</h1>

      <div className="flex gap-2 mb-4">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); reset() }}
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
        {mode === 'ask' && (
          <p className="text-xs text-lr-stone -mt-2">Ask anything about your meetings, decisions, and action items.</p>
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
              onClick={reset}
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
