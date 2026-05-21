'use client'

import { useState } from 'react'
import Markdown from 'react-markdown'

type Mode = 'ask' | 'weekly' | 'prep'
type Status = 'idle' | 'loading' | 'done' | 'error'

export default function QueryPage() {
  const [mode, setMode] = useState<Mode>('ask')
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode !== 'weekly' && !input.trim()) return
    setStatus('loading')
    setAnswer(null)
    setError(null)

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

  function reset() {
    setStatus('idle')
    setAnswer(null)
    setInput('')
    setError(null)
  }

  const MODES: { id: Mode; label: string }[] = [
    { id: 'ask', label: 'Ask' },
    { id: 'weekly', label: 'Week recap' },
    { id: 'prep', label: 'Prep me' },
  ]

  const placeholders: Record<Mode, string> = {
    ask: 'What do I owe Marcus? What decisions were made about pricing? What\'s still open from last Tuesday?',
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
      <h1 className="text-xl font-semibold mb-4">Ask</h1>

      <div className="flex gap-2 mb-4">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); reset() }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === m.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 placeholder-gray-600 border border-gray-800 focus:outline-none focus:border-blue-500 text-sm resize-none"
            autoFocus
          />
        )}
        {mode === 'weekly' && (
          <p className="text-sm text-gray-500 py-2">
            Pulls everything from the last 7 days — meetings, action items, decisions, intelligence — and gives you a plain-language synthesis.
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'loading' || (mode !== 'weekly' && !input.trim())}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? loadingLabels[mode] : submitLabels[mode]}
        </button>
      </form>

      {answer && (
        <div className="mt-6">
          <div className="bg-gray-900 rounded-lg px-4 py-4 text-sm text-gray-200 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-white">
            <Markdown>{answer}</Markdown>
          </div>
          <button
            onClick={reset}
            className="mt-3 text-sm text-gray-500 hover:text-gray-300"
          >
            Ask another
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}
