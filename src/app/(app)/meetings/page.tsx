import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('date', { ascending: false })

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-semibold">Meeting log</h1>
        <Link href="/capture" className="text-sm text-lr-red hover:opacity-70 transition-opacity">+ Capture</Link>
      </div>

      {meetings?.length ? (
        <div className="space-y-2">
          {meetings.map(m => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="flex items-center justify-between bg-lr-white rounded-lg lr-border-med px-4 py-3 hover:bg-lr-parchment transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-lr-ink">{m.title || 'Untitled'}</p>
                <p className="text-xs text-lr-stone mt-0.5">{formatDate(m.date)}</p>
              </div>
              <svg className="w-4 h-4 text-lr-stone shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-lr-stone">No meetings yet.</p>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
