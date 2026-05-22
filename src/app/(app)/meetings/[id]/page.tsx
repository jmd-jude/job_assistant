import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: meeting },
    { data: actionItems },
    { data: decisions },
    { data: questions },
    { data: observations },
  ] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', id).single(),
    supabase.from('action_items').select('*, people(name)').eq('related_meeting_id', id),
    supabase.from('decisions').select('*').eq('meeting_id', id),
    supabase.from('open_questions').select('*, people(name)').eq(
      'id',
      supabase.from('parsed_items').select('linked_record_id').eq('meeting_id', id).eq('item_type', 'open_question')
    ),
    supabase.from('parsed_items').select('*').eq('meeting_id', id).eq('item_type', 'observation'),
  ])

  if (!meeting) notFound()

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto pb-8">
      <Link href="/meetings" className="text-sm text-lr-stone hover:text-lr-red mb-4 inline-block transition-colors">
        &larr; Meeting log
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-serif font-semibold">{meeting.title || 'Untitled meeting'}</h1>
        <p className="text-sm text-lr-stone mt-1">{formatDate(meeting.date)}</p>
      </div>

      {decisions && decisions.length > 0 && (
        <Section title="Decisions">
          {decisions.map(d => (
            <div key={d.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
              <p className="text-sm font-medium text-lr-ink">{d.title}</p>
              {d.outcome && <p className="text-xs text-lr-stone mt-1">{d.outcome}</p>}
              {d.context && <p className="text-xs text-lr-stone mt-1">{d.context}</p>}
            </div>
          ))}
        </Section>
      )}

      {actionItems && actionItems.length > 0 && (
        <Section title="Action items">
          {actionItems.map(a => (
            <div key={a.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
              <p className="text-sm text-lr-ink">{a.description}</p>
              <div className="flex gap-2 mt-1">
                {a.owner_type === 'other' && a.people?.name && (
                  <span className="text-xs text-lr-stone">{a.people.name}</span>
                )}
                {a.due_date && <span className="text-xs text-lr-stone">{formatDate(a.due_date)}</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  a.status === 'open' ? 'bg-lr-amber/15 text-lr-amber' :
                  a.status === 'done' ? 'bg-lr-green/15 text-lr-green' :
                  'bg-lr-parchment text-lr-stone'
                }`}>{a.status}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {questions && questions.length > 0 && (
        <Section title="Open questions">
          {questions.map((q: { id: string; question: string; context: string | null; status: string; people?: { name: string } }) => (
            <div key={q.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
              <p className="text-sm text-lr-ink">{q.question}</p>
              <div className="flex gap-2 mt-1">
                {q.people?.name && <span className="text-xs text-lr-red">{q.people.name}</span>}
                {q.context && <span className="text-xs text-lr-stone">{q.context}</span>}
                <span className={`text-xs ${q.status === 'answered' ? 'text-lr-green' : 'text-lr-stone'}`}>{q.status}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {observations && observations.length > 0 && (
        <Section title="Observations">
          {observations.map(o => (
            <div key={o.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
              <p className="text-sm text-lr-ink">{o.content}</p>
            </div>
          ))}
        </Section>
      )}

      {meeting.raw_notes && (
        <Section title="Raw notes">
          <div className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
            <p className="text-sm text-lr-stone whitespace-pre-wrap leading-relaxed">{meeting.raw_notes}</p>
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="label-caps text-lr-stone mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

