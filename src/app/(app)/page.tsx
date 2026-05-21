import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { markActionItemDone, markQuestionAnswered } from '@/lib/actions'
import type { ActionItem, OpenQuestion, WinObservation } from '@/lib/types'

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
      .select('*, people(name)')
      .eq('status', 'open')
      .eq('owner_type', 'me')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('action_items')
      .select('*, people(name)')
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

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Morning Review</h1>
        <span className="text-sm text-gray-500">
          {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <Section title="My open items" count={myItems?.length}>
        {myItems?.length ? (
          myItems.map(item => (
            <ActionItemRow key={item.id} item={item} markDone={markActionItemDone} />
          ))
        ) : (
          <Empty>Nothing open.</Empty>
        )}
      </Section>

      <Section title="Waiting on others" count={othersItems?.length}>
        {othersItems?.length ? (
          othersItems.map(item => (
            <ActionItemRow key={item.id} item={item} showOwner markDone={markActionItemDone} />
          ))
        ) : (
          <Empty>No open commitments from others.</Empty>
        )}
      </Section>

      <Section title="Open questions" count={questions?.length}>
        {questions?.length ? (
          questions.map(q => (
            <QuestionRow key={q.id} question={q} markAnswered={markQuestionAnswered} />
          ))
        ) : (
          <Empty>No open questions.</Empty>
        )}
      </Section>

      {!!wins?.length && (
        <Section title="Wins" count={wins.length}>
          {wins.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      {!!intelligence?.length && (
        <Section title="Intelligence" count={intelligence.length}>
          {intelligence.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      {!!observations?.length && (
        <Section title="Observations" count={observations.length}>
          {observations.map(w => <ObsRow key={w.id} item={w} />)}
        </Section>
      )}

      <div className="mt-8 mb-6 space-y-3">
        <Link
          href="/capture"
          className="block w-full py-3 text-center rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
        >
          + Capture something
        </Link>
        <Link
          href="/meetings"
          className="block w-full py-3 text-center rounded-lg bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors"
        >
          Meeting log
        </Link>
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</h2>
        {!!count && (
          <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ActionItemRow({
  item,
  showOwner,
  markDone,
}: {
  item: ActionItem & { people?: { name: string } }
  showOwner?: boolean
  markDone: (id: string, status: 'done' | 'dropped') => Promise<void>
}) {
  const overdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0]
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
        </div>
      </div>
      <form className="flex gap-1 shrink-0">
        <button
          formAction={async () => { 'use server'; await markDone(item.id, 'done') }}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-green-900 hover:text-green-400 transition-colors"
          title="Mark done"
        >
          Done
        </button>
        <button
          formAction={async () => { 'use server'; await markDone(item.id, 'dropped') }}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          title="Drop"
        >
          Drop
        </button>
      </form>
    </div>
  )
}

function QuestionRow({
  question,
  markAnswered,
}: {
  question: OpenQuestion
  markAnswered: (id: string) => Promise<void>
}) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100">{question.question}</p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {question.people?.name && (
            <span className="text-xs text-blue-400">{question.people.name}</span>
          )}
          {question.context && (
            <span className="text-xs text-gray-500 line-clamp-1">{question.context}</span>
          )}
          <span className="text-xs text-gray-600">{formatDate(question.created_at.split('T')[0])}</span>
        </div>
      </div>
      <form className="shrink-0">
        <button
          formAction={async () => { 'use server'; await markAnswered(question.id) }}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-blue-900 hover:text-blue-400 transition-colors"
        >
          Answered
        </button>
      </form>
    </div>
  )
}

function ObsRow({ item }: { item: WinObservation }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3">
      <p className="text-sm text-gray-100">{item.content}</p>
      <p className="text-xs text-gray-600 mt-1">{formatDate(item.date)}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 py-1">{children}</p>
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
