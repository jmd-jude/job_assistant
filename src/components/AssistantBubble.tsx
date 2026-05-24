'use client'

import { useState, useTransition } from 'react'
import Markdown from 'react-markdown'
import { createActionItem } from '@/lib/actions'

type CaptureStatus = 'idle' | 'open' | 'saving' | 'saved'

export function AssistantBubble({ content }: { content: string }) {
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()

  function openCapture() {
    setDescription('')
    setDueDate('')
    setCaptureStatus('open')
  }

  function cancel() {
    setCaptureStatus('idle')
  }

  function save() {
    if (!description.trim()) return
    startTransition(async () => {
      setCaptureStatus('saving')
      await createActionItem(description.trim(), dueDate || null)
      setCaptureStatus('saved')
      setTimeout(() => setCaptureStatus('idle'), 2000)
    })
  }

  return (
    <div className="max-w-[90%]">
      <div className="px-4 py-3 rounded-2xl bg-lr-white lr-border-med text-sm text-lr-ink leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-lr-ink prose-headings:text-lr-ink prose-a:text-lr-red">
        <Markdown>{content}</Markdown>
      </div>

      <div className="mt-1.5 px-1">
        {captureStatus === 'idle' && (
          <button
            onClick={openCapture}
            className="text-xs text-lr-stone hover:text-lr-ink transition-colors"
          >
            + Capture action item
          </button>
        )}

        {captureStatus === 'saved' && (
          <span className="text-xs text-lr-stone">Saved to dashboard</span>
        )}

        {(captureStatus === 'open' || captureStatus === 'saving') && (
          <div className="bg-lr-parchment rounded-lg px-3 py-2.5 space-y-2 lr-border">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's the action item?"
              rows={2}
              autoFocus
              className="w-full bg-lr-white text-sm text-lr-ink rounded px-2 py-1.5 lr-border focus:outline-none focus:ring-2 focus:ring-lr-red/20 resize-none"
            />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              placeholder="Set due date"
              className="bg-lr-white text-sm text-lr-stone rounded px-2 py-1.5 lr-border focus:outline-none focus:ring-2 focus:ring-lr-red/20"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={isPending || !description.trim()}
                className="text-xs px-2 py-1 rounded bg-lr-ink text-lr-parchment hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancel}
                className="text-xs px-2 py-1 rounded bg-lr-white text-lr-stone hover:bg-lr-ink hover:text-lr-parchment transition-colors lr-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
