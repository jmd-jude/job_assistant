'use client'

import { useState, useTransition } from 'react'
import { updatePersonNotes } from '@/lib/actions'

type Props = {
  personId: string
  initialNotes: string | null
}

export function EditablePersonNotes({ personId, initialNotes }: Props) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isPending, startTransition] = useTransition()

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          placeholder="Communication style, org context, history predating the tool..."
          className="w-full bg-lr-parchment text-sm text-lr-ink rounded-lg px-4 py-3 lr-border focus:outline-none focus:ring-2 focus:ring-lr-red/20 resize-none"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              startTransition(async () => {
                await updatePersonNotes(personId, notes)
                setEditing(false)
              })
            }}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-lr-ink text-lr-parchment hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setNotes(initialNotes ?? '')
              setEditing(false)
            }}
            className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer group"
    >
      {notes ? (
        <div className="flex items-start justify-between gap-3 bg-lr-parchment rounded-lg px-4 py-3">
          <p className="text-sm text-lr-ink whitespace-pre-wrap flex-1">{notes}</p>
          <span className="text-xs text-lr-stone opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">Edit</span>
        </div>
      ) : (
        <div className="bg-lr-parchment rounded-lg px-4 py-3 lr-border border-dashed">
          <p className="text-sm text-lr-stone">Add notes</p>
        </div>
      )}
    </div>
  )
}
