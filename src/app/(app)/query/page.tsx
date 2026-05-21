'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function QueryPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setStatus('loading')
    setAnswer(null)
    setError(null)

    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
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

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Ask</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="What do I owe Marcus? What decisions were made about pricing? What's still open from last Tuesday?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 placeholder-gray-600 border border-gray-800 focus:outline-none focus:border-blue-500 text-sm resize-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={status === 'loading' || !question.trim()}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div className="mt-6">
          <div className="bg-gray-900 rounded-lg px-4 py-4">
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
          <button
            onClick={() => { setStatus('idle'); setAnswer(null); setQuestion('') }}
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
