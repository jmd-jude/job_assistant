'use client'

import { useState } from 'react'
import type { ParseResult } from '@/lib/types'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function CapturePage() {
  const [notes, setNotes] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ meeting: { id: string; title: string }; parsed: ParseResult } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notes.trim()) return
    setStatus('loading')
    setError(null)
    setResult(null)

    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_notes: notes, meeting_title: title || undefined, meeting_date: date }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setStatus('error')
    } else {
      setResult(data)
      setStatus('done')
      setNotes('')
      setTitle('')
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError(null)
  }

  if (status === 'done' && result) {
    return <ParseConfirmation result={result} onReset={reset} />
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Capture</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 border border-gray-800 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Meeting title (optional — will be inferred)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 placeholder-gray-600 border border-gray-800 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <textarea
            placeholder="What happened? Who was there, what was decided, what do you need to do, what's still unclear..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 placeholder-gray-600 border border-gray-800 focus:outline-none focus:border-blue-500 text-sm resize-none"
            autoFocus
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={status === 'loading' || !notes.trim()}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Parsing...' : 'Parse and save'}
        </button>
      </form>
    </div>
  )
}

function ParseConfirmation({
  result,
  onReset,
}: {
  result: { meeting: { id: string; title: string }; parsed: ParseResult }
  onReset: () => void
}) {
  const { parsed } = result
  const total =
    (parsed.people?.length ?? 0) +
    (parsed.decisions?.length ?? 0) +
    (parsed.action_items?.length ?? 0) +
    (parsed.open_questions?.length ?? 0) +
    (parsed.observations?.length ?? 0)

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-100">Saved</p>
          <p className="text-sm text-gray-500">{result.meeting.title || 'Untitled meeting'} &mdash; {total} items extracted</p>
        </div>
      </div>

      <div className="space-y-4">
        <ExtractSection title="People" items={parsed.people?.map(p => p.name)} />
        <ExtractSection title="Decisions" items={parsed.decisions?.map(d => d.title)} />
        <ExtractSection
          title="Action items"
          items={parsed.action_items?.map(a =>
            a.owner_type === 'other' && a.owner_name
              ? `${a.owner_name}: ${a.description}`
              : a.description
          )}
        />
        <ExtractSection title="Open questions" items={parsed.open_questions?.map(q => q.question)} />
        <ExtractSection title="Observations" items={parsed.observations?.map(o => o.content)} />
      </div>

      <button
        onClick={onReset}
        className="mt-6 w-full py-3 rounded-lg bg-gray-800 text-gray-200 font-medium hover:bg-gray-700 transition-colors"
      >
        Capture another
      </button>
    </div>
  )
}

function ExtractSection({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-900 rounded-lg px-4 py-2.5 text-sm text-gray-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
