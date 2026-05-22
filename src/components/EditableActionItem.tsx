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
      <div className="bg-gray-900 rounded-lg px-4 py-3 space-y-2">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-gray-800 text-sm text-gray-100 rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-gray-800 text-sm text-gray-400 rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-blue-500"
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
            className="text-xs px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setDescription(item.description)
              setDueDate(item.due_date ?? '')
              setEditing(false)
            }}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100">{item.description}</p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {showOwner && item.people?.name && (
            <span className="text-xs text-gray-500">{item.people.name}</span>
          )}
          {item.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
              {formatDate(item.due_date)}
            </span>
          )}
          {item.meetings && (
            <Link
              href={`/meetings/${item.meetings.id}`}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
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
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-green-900 hover:text-green-400 disabled:opacity-50 transition-colors"
        >
          Done
        </button>
        <button
          onClick={() => startTransition(() => markActionItemDone(item.id, 'dropped'))}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Drop
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
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
