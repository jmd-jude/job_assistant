import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateWithWeekday } from '@/lib/utils'
import type { Decision } from '@/lib/types'

type DecisionWithMeeting = Decision & {
  meetings: { id: string; title: string; date: string } | null
}

export default async function DecisionsPage() {
  const supabase = await createClient()
  const { data: decisions } = await supabase
    .from('decisions')
    .select('*, meetings(id, title, date)')
    .order('created_at', { ascending: false }) as { data: DecisionWithMeeting[] | null }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-semibold">Decisions</h1>
        <Link href="/query" className="text-sm text-lr-stone hover:text-lr-ink transition-colors">Ask</Link>
      </div>

      {decisions?.length ? (
        <div className="space-y-2">
          {decisions.map(d => (
            <div
              key={d.id}
              className="bg-lr-white rounded-lg lr-border-med px-4 py-3"
            >
              <p className="text-sm font-medium text-lr-ink">{d.title}</p>
              {d.outcome && (
                <p className="text-sm text-lr-stone mt-1 leading-snug">{d.outcome}</p>
              )}
              {(d.context && !d.outcome) && (
                <p className="text-sm text-lr-stone mt-1 leading-snug">{d.context}</p>
              )}
              {d.meetings && (
                <Link
                  href={`/meetings/${d.meetings.id}`}
                  className="inline-block text-xs label-caps text-lr-stone hover:text-lr-ink transition-colors mt-2"
                >
                  {d.meetings.title || 'Untitled meeting'} &middot; {formatDateWithWeekday(d.meetings.date)}
                </Link>
              )}
              {!d.meetings && (
                <p className="text-xs label-caps text-lr-stone mt-2">
                  {formatDateWithWeekday(d.created_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-lr-stone">No decisions captured yet. Add meeting notes to extract decisions.</p>
      )}
    </div>
  )
}
