'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { markActionItemDone, updateActionItem } from '@/lib/actions'
import type { ActionItem, Person } from '@/lib/types'

type Props = {
  item: ActionItem & { people?: Pick<Person, 'name'> }
  showOwner?: boolean
}

export function EditableActionItem({ item, showOwner }: Props) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(item.description)
  const [dueDate, setDueDate] = useState(item.due_date ?? '')
  const [isPending, startTransition] = useTransition()

  const overdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0]

  if (editing) {
    return (
      <div className="bg-lr-white rounded-lg lr-border-med px-4 py-3 space-y-2">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-lr-parchment text-sm text-lr-ink rounded px-2 py-1.5 lr-border focus:outline-none focus:ring-2 focus:ring-lr-red/20 resize-none"
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-lr-parchment text-sm text-lr-stone rounded px-2 py-1.5 lr-border focus:outline-none focus:ring-2 focus:ring-lr-red/20"
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              startTransition(async () => {
                await updateActionItem(item.id, {
                  description,
                  due_date: dueDate || null,
                  owner_type: item.owner_type,
                })
                setEditing(false)
              })
            }}
            disabled={isPending || !description.trim()}
            className="text-xs px-2 py-1 rounded bg-lr-ink text-lr-parchment hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setDescription(item.description)
              setDueDate(item.due_date ?? '')
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
    <div className="bg-lr-white rounded-lg lr-border-med px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-lr-ink">{item.description}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {showOwner && item.people?.name && (
            <span className="text-xs text-lr-stone">{item.people.name}</span>
          )}
          {item.due_date && (
            <span className={`text-xs ${overdue ? 'text-lr-red' : 'text-lr-stone'}`}>
              {formatDate(item.due_date)}
            </span>
          )}
          {item.meetings && (
            <Link
              href={`/meetings/${item.meetings.id}`}
              className="text-xs text-lr-stone hover:text-lr-red transition-colors"
            >
              {item.meetings.title ?? 'Untitled'} · {formatDate(item.meetings.date)}
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => startTransition(() => markActionItemDone(item.id, 'done'))}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-green/20 hover:text-lr-green disabled:opacity-40 transition-colors"
        >
          Done
        </button>
        <button
          onClick={() => startTransition(() => markActionItemDone(item.id, 'dropped'))}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment disabled:opacity-40 transition-colors"
        >
          Drop
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
