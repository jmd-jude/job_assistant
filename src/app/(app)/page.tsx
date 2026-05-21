import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
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
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    supabase
      .from('wins_and_observations')
      .select('*')
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
          myItems.map(item => <ActionItemRow key={item.id} item={item} />)
        ) : (
          <Empty>Nothing open.</Empty>
        )}
      </Section>

      <Section title="Waiting on others" count={othersItems?.length}>
        {othersItems?.length ? (
          othersItems.map(item => <ActionItemRow key={item.id} item={item} showOwner />)
        ) : (
          <Empty>No open commitments from others.</Empty>
        )}
      </Section>

      <Section title="Open questions" count={questions?.length}>
        {questions?.length ? (
          questions.map(q => <QuestionRow key={q.id} question={q} />)
        ) : (
          <Empty>No open questions.</Empty>
        )}
      </Section>

      <Section title="Recent wins and observations" count={wins?.length}>
        {wins?.length ? (
          wins.map(w => <WinRow key={w.id} win={w} />)
        ) : (
          <Empty>Nothing in the last 7 days.</Empty>
        )}
      </Section>

      <div className="mt-8 mb-6">
        <Link
          href="/capture"
          className="block w-full py-3 text-center rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
        >
          + Capture something
        </Link>
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</h2>
        {!!count && (
          <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ActionItemRow({ item, showOwner }: { item: ActionItem & { people?: { name: string } }; showOwner?: boolean }) {
  const overdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0]
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3">
      <p className="text-sm text-gray-100">{item.description}</p>
      <div className="flex gap-3 mt-1">
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
  )
}

function QuestionRow({ question }: { question: OpenQuestion }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3">
      <p className="text-sm text-gray-100">{question.question}</p>
      {question.context && <p className="text-xs text-gray-500 mt-1">{question.context}</p>}
      <p className="text-xs text-gray-600 mt-1">{formatDate(question.created_at.split('T')[0])}</p>
    </div>
  )
}

function WinRow({ win }: { win: WinObservation }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3">
      <p className="text-sm text-gray-100">{win.content}</p>
      <p className="text-xs text-gray-600 mt-1">{formatDate(win.date)}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 py-1">{children}</p>
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
