import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: person },
    { data: actionItems },
    { data: decisions },
    { data: meetings },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase.from('action_items').select('*, meetings(title, date)').eq('owner_person_id', id).order('created_at', { ascending: false }),
    supabase.from('decisions').select('*, meetings(title, date)').eq('meeting_id',
      supabase.from('meetings').select('id').contains('attendee_ids', [id])
    ),
    supabase.from('meetings').select('*').contains('attendee_ids', [id]).order('date', { ascending: false }).limit(10),
  ])

  if (!person) notFound()

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <Link href="/people" className="text-sm text-lr-stone hover:text-lr-red mb-4 inline-block transition-colors">
        &larr; People
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-semibold">{person.name}</h1>
        {(person.title || person.org_team) && (
          <p className="text-lr-stone mt-1">{[person.title, person.org_team].filter(Boolean).join(' · ')}</p>
        )}
        {person.last_interaction_date && (
          <p className="text-sm text-lr-stone mt-1">Last interaction: {formatDate(person.last_interaction_date)}</p>
        )}
        {person.rapport != null && (
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= person.rapport! ? 'bg-lr-red' : 'bg-lr-stone/30'}`} />
            ))}
          </div>
        )}
      </div>

      {person.notes && (
        <div className="mb-6">
          <h2 className="label-caps text-lr-stone mb-2">Notes</h2>
          <p className="text-sm text-lr-ink bg-lr-parchment rounded-lg px-4 py-3">{person.notes}</p>
        </div>
      )}

      {meetings && meetings.length > 0 && (
        <div className="mb-6">
          <h2 className="label-caps text-lr-stone mb-2">Recent meetings</h2>
          <div className="space-y-2">
            {meetings.map(m => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="block bg-lr-white rounded-lg lr-border-med px-4 py-3 hover:border-lr-red/40 transition-colors">
                <p className="text-sm text-lr-ink">{m.title || 'Untitled'}</p>
                <p className="text-xs text-lr-stone mt-0.5">{formatDate(m.date)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {actionItems && actionItems.length > 0 && (
        <div className="mb-6">
          <h2 className="label-caps text-lr-stone mb-2">Action items</h2>
          <div className="space-y-2">
            {actionItems.map(a => (
              <div key={a.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
                <p className="text-sm text-lr-ink">{a.description}</p>
                <div className="flex gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === 'open' ? 'bg-lr-amber/15 text-lr-amber' :
                    a.status === 'done' ? 'bg-lr-green/15 text-lr-green' :
                    'bg-lr-parchment text-lr-stone'
                  }`}>{a.status}</span>
                  {a.due_date && <span className="text-xs text-lr-stone">{formatDate(a.due_date)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
