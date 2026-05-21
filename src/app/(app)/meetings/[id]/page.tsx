import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
      <Link href="/meetings" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block">
        &larr; Meeting log
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">{meeting.title || 'Untitled meeting'}</h1>
        <p className="text-sm text-gray-500 mt-1">{formatDate(meeting.date)}</p>
      </div>

      {decisions && decisions.length > 0 && (
        <Section title="Decisions">
          {decisions.map(d => (
            <div key={d.id} className="bg-gray-900 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-gray-100">{d.title}</p>
              {d.outcome && <p className="text-xs text-gray-400 mt-1">{d.outcome}</p>}
              {d.context && <p className="text-xs text-gray-500 mt-1">{d.context}</p>}
            </div>
          ))}
        </Section>
      )}

      {actionItems && actionItems.length > 0 && (
        <Section title="Action items">
          {actionItems.map(a => (
            <div key={a.id} className="bg-gray-900 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-100">{a.description}</p>
              <div className="flex gap-2 mt-1">
                {a.owner_type === 'other' && a.people?.name && (
                  <span className="text-xs text-gray-500">{a.people.name}</span>
                )}
                {a.due_date && <span className="text-xs text-gray-500">{formatDate(a.due_date)}</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  a.status === 'open' ? 'bg-yellow-900/50 text-yellow-400' :
                  a.status === 'done' ? 'bg-green-900/50 text-green-400' :
                  'bg-gray-800 text-gray-500'
                }`}>{a.status}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {questions && questions.length > 0 && (
        <Section title="Open questions">
          {questions.map((q: { id: string; question: string; context: string | null; status: string; people?: { name: string } }) => (
            <div key={q.id} className="bg-gray-900 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-100">{q.question}</p>
              <div className="flex gap-2 mt-1">
                {q.people?.name && <span className="text-xs text-blue-400">{q.people.name}</span>}
                {q.context && <span className="text-xs text-gray-500">{q.context}</span>}
                <span className={`text-xs ${q.status === 'answered' ? 'text-green-400' : 'text-gray-600'}`}>{q.status}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {observations && observations.length > 0 && (
        <Section title="Observations">
          {observations.map(o => (
            <div key={o.id} className="bg-gray-900 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-100">{o.content}</p>
            </div>
          ))}
        </Section>
      )}

      {meeting.raw_notes && (
        <Section title="Raw notes">
          <div className="bg-gray-900 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{meeting.raw_notes}</p>
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
