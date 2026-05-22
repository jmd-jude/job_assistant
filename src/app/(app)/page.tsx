import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { markQuestionAnswered, deleteQuestion } from '@/lib/actions'
import { EditableActionItem } from '@/components/EditableActionItem'
import type { OpenQuestion, WinObservation } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

  const [
    { data: myItems },
    { data: othersItems },
    { data: questions },
    { data: wins },
    { data: intelligence },
    { data: observations },
  ] = await Promise.all([
    supabase
      .from('action_items')
      .select('*, people(name), meetings(id, title, date)')
      .eq('status', 'open')
      .eq('owner_type', 'me')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('action_items')
      .select('*, people(name), meetings(id, title, date)')
      .eq('status', 'open')
      .eq('owner_type', 'other')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('open_questions')
      .select('*, people(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    supabase
      .from('wins_and_observations')
      .select('*')
      .eq('type', 'win')
      .gte('date', cutoff)
      .order('date', { ascending: false }),
    supabase
      .from('wins_and_observations')
      .select('*')
      .eq('type', 'intelligence')
      .gte('date', cutoff)
      .order('date', { ascending: false }),
    supabase
      .from('wins_and_observations')
      .select('*')
      .eq('type', 'observation')
      .gte('date', cutoff)
      .order('date', { ascending: false }),
  ])

  // Look up source meetings for open questions via parsed_items
  const questionIds = questions?.map(q => q.id) ?? []
  const questionMeetingMap: Record<string, { id: string; title: string | null; date: string }> = {}
  if (questionIds.length > 0) {
    const { data: parsedLinks } = await supabase
      .from('parsed_items')
      .select('linked_record_id, meetings(id, title, date)')
      .in('linked_record_id', questionIds)
      .eq('item_type', 'open_question')
    for (const link of parsedLinks ?? []) {
      if (link.linked_record_id && link.meetings) {
        questionMeetingMap[link.linked_record_id] = link.meetings as unknown as { id: string; title: string | null; date: string }
      }
    }
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-semibold">Morning Review</h1>
        <span className="text-sm text-lr-stone">
          {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <Section title="My open items" count={myItems?.length}>
        {myItems?.length ? (
          myItems.map(item => (
            <EditableActionItem key={item.id} item={item} />
          ))
        ) : (
          <Empty>Nothing open.</Empty>
        )}
      </Section>

      <Section title="Waiting on others" count={othersItems?.length}>
        {othersItems?.length ? (
          othersItems.map(item => (
            <EditableActionItem key={item.id} item={item} showOwner />
          ))
        ) : (
          <Empty>No open commitments from others.</Empty>
        )}
      </Section>

      <Section title="Open questions" count={questions?.length}>
        {questions?.length ? (
          questions.map(q => (
            <QuestionRow key={q.id} question={q} meeting={questionMeetingMap[q.id] ?? null} markAnswered={markQuestionAnswered} deleteQ={deleteQuestion} />
          ))
        ) : (
          <Empty>No open questions.</Empty>
        )}
      </Section>

      {!!wins?.length && (
        <Section title="Wins" count={wins.length} archiveHref="/intel?type=win">
          {wins.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      {!!intelligence?.length && (
        <Section title="Intelligence" count={intelligence.length} archiveHref="/intel?type=intelligence">
          {intelligence.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      {!!observations?.length && (
        <Section title="Observations" count={observations.length} archiveHref="/intel?type=observation">
          {observations.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      <div className="mt-8 mb-6">
        <Link
          href="/capture"
          className="block w-full py-3 text-center rounded-lg bg-lr-ink text-lr-parchment font-medium hover:opacity-80 transition-opacity"
        >
          + Capture something
        </Link>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  archiveHref,
  children,
}: {
  title: string
  count?: number
  archiveHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="label-caps text-lr-stone">{title}</h2>
        {!!count && (
          <span className="text-xs bg-lr-parchment text-lr-stone rounded-full px-2 py-0.5">{count}</span>
        )}
        {archiveHref && (
          <Link href={archiveHref} className="ml-auto text-xs text-lr-stone hover:text-lr-red transition-colors">
            View all
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function QuestionRow({
  question,
  meeting,
  markAnswered,
  deleteQ,
}: {
  question: OpenQuestion
  meeting: { id: string; title: string | null; date: string } | null
  markAnswered: (id: string) => Promise<void>
  deleteQ: (id: string) => Promise<void>
}) {
  return (
    <div className="bg-lr-white rounded-lg lr-border-med px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-lr-ink">{question.question}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {question.people?.name && (
            <span className="text-xs text-lr-red">{question.people.name}</span>
          )}
          {question.context && (
            <span className="text-xs text-lr-stone line-clamp-1">{question.context}</span>
          )}
          {meeting && (
            <Link href={`/meetings/${meeting.id}`} className="text-xs text-lr-stone hover:text-lr-red transition-colors">
              {meeting.title ?? 'Untitled'} · {formatDate(meeting.date)}
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <form>
          <button
            formAction={async () => { 'use server'; await markAnswered(question.id) }}
            className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment transition-colors"
          >
            Answered
          </button>
        </form>
        <form>
          <button
            formAction={async () => { 'use server'; await deleteQ(question.id) }}
            className="text-xs px-2 py-1 rounded bg-lr-parchment text-lr-stone hover:bg-lr-red hover:text-lr-white transition-colors"
            title="Remove question"
          >
            ×
          </button>
        </form>
      </div>
    </div>
  )
}

function ObsRow({ item }: { item: WinObservation }) {
  return (
    <div className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
      <p className="text-sm text-lr-ink">{item.content}</p>
      <p className="text-xs text-lr-stone mt-1">{formatDate(item.date)}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-lr-stone py-1">{children}</p>
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
