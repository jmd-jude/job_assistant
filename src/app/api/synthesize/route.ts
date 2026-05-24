import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { CLAUDE_MODEL } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mode, input } = await request.json()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

  let context: string
  let systemPrompt: string
  let userMessage: string

  if (mode === 'weekly') {
    const [
      { data: recentMeetings },
      { data: openItems },
      { data: openQuestions },
      { data: recentObs },
      { data: people },
      { data: decisions },
    ] = await Promise.all([
      supabase.from('meetings').select('*').gte('date', cutoff).order('date', { ascending: false }),
      supabase.from('action_items').select('*, people(name)').eq('status', 'open').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('open_questions').select('*, people(name)').eq('status', 'open'),
      supabase.from('wins_and_observations').select('*').gte('date', cutoff).order('date', { ascending: false }),
      supabase.from('people').select('*').order('last_interaction_date', { ascending: false, nullsFirst: false }).limit(20),
      supabase.from('decisions').select('*').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at', { ascending: false }),
    ])

    context = JSON.stringify({
      recent_meetings: recentMeetings,
      open_action_items: openItems,
      open_questions: openQuestions,
      recent_observations: recentObs,
      people,
      recent_decisions: decisions,
    }, null, 2)

    systemPrompt = `You are a personal work assistant for a product strategy manager who is new to a large company. Write a concise weekly synthesis based on their captured data. Cover: who they talked to, what moved forward, what's still stuck, and 1-2 things they should be thinking about. Be direct and specific. Use their actual names and details. 3-5 short paragraphs, no headers.`
    userMessage = `Here is my work data from this week:\n\n${context}\n\nGive me the weekly synthesis.`

  } else if (mode === 'prep') {
    const { data: allPeople } = await supabase.from('people').select('id, name')
    const matched = (allPeople ?? []).filter(p =>
      input.toLowerCase().includes(p.name.toLowerCase())
    )
    const matchedIds = matched.map(p => p.id)
    const hasMatch = matchedIds.length > 0

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      { data: personRecords },
      { data: personMeetings },
      { data: personOpenItems },
      { data: personRecentlyClosedItems },
      { data: personOpenQuestions },
      { data: personRelationships },
      { data: myOpenItems },
      { data: decisions },
    ] = await Promise.all([
      hasMatch
        ? supabase.from('people').select('*').in('id', matchedIds)
        : supabase.from('people').select('*').order('last_interaction_date', { ascending: false, nullsFirst: false }).limit(20),
      // Meetings this person attended, most recent first
      hasMatch
        ? supabase.from('meetings').select('id, title, date, raw_notes').overlaps('attendee_ids', matchedIds).order('date', { ascending: false }).limit(20)
        : supabase.from('meetings').select('id, title, date').order('date', { ascending: false }).limit(15),
      // Open commitments owned by this person
      hasMatch
        ? supabase.from('action_items').select('description, due_date, owner_type, created_at').in('owner_person_id', matchedIds).eq('status', 'open').order('due_date', { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] }),
      // Things they recently resolved (last 30 days) -- shows follow-through
      hasMatch
        ? supabase.from('action_items').select('description, resolved_at').in('owner_person_id', matchedIds).eq('status', 'done').gte('resolved_at', thirtyDaysAgo.toISOString()).order('resolved_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      // All open questions linked to this person
      hasMatch
        ? supabase.from('open_questions').select('question, context, created_at').in('related_person_id', matchedIds).eq('status', 'open')
        : supabase.from('open_questions').select('question, context').eq('status', 'open').limit(20),
      // Relationships: who they report to, peers, collaborators
      hasMatch
        ? supabase.from('relationships').select('relationship_type, notes, person_a_id, person_b_id, people!relationships_person_a_id_fkey(name), people!relationships_person_b_id_fkey(name)').or(`person_a_id.in.(${matchedIds.join(',')}),person_b_id.in.(${matchedIds.join(',')})`)
        : Promise.resolve({ data: [] }),
      // My own open items (what I owe them or need to bring up)
      supabase.from('action_items').select('description, due_date').eq('status', 'open').eq('owner_type', 'me').order('due_date', { ascending: true, nullsFirst: false }),
      // Recent decisions from meetings they attended
      hasMatch
        ? supabase.from('decisions').select('title, context, outcome, created_at, meetings(title, date)').order('created_at', { ascending: false }).limit(30)
        : supabase.from('decisions').select('title, context, outcome, created_at').order('created_at', { ascending: false }).limit(20),
    ])

    context = JSON.stringify({
      people: personRecords,
      relationships: personRelationships,
      meetings_together: personMeetings,
      their_open_commitments: personOpenItems,
      their_recently_completed: personRecentlyClosedItems,
      open_questions_about_them: personOpenQuestions,
      my_open_action_items: myOpenItems,
      recent_decisions: decisions,
    }, null, 2)

    systemPrompt = `You are a personal work assistant for a product strategy manager who is new to a large company. Produce a structured pre-meeting brief with these sections:

**Who they are** — role, team, rapport level (1-5), any notes stored about them, how they relate to others (org relationships). Be direct, not flattering.

**Recent history** — last 2-3 interactions, what was discussed, what moved or didn't. If last_interaction_date is more than 3 weeks ago, flag it.

**Open commitments** — things they owe you (their open action items). Note anything overdue.

**What I need to bring** — my own open action items, especially anything that might be relevant to this person or meeting.

**Open questions** — unresolved questions linked to this person. Surface the oldest ones.

**Things to keep in mind** — 1-2 observations worth going in with. Draw from patterns: follow-through rate, relationship dynamics, anything in their person notes. This is the section to be genuinely useful, not just informational.

Skip any section where there's nothing real to say. Be specific. Use actual names and dates. No filler.`
    userMessage = `Here is my work data:\n\n${context}\n\nPrepare me for: ${input}`

  } else if (mode === 'patterns') {
    const today = new Date().toISOString().split('T')[0]
    const twentyOneDaysAgo = new Date()
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21)

    const [
      { data: allActionItems },
      { data: meetingsWithDecisions },
      { data: openQuestions },
      { data: people },
    ] = await Promise.all([
      supabase.from('action_items').select('owner_type, owner_person_id, status, due_date, created_at, people(name)'),
      supabase.from('meetings').select('id, title, date, attendee_ids, decisions(id)').order('date', { ascending: false }).limit(50),
      supabase.from('open_questions').select('question, created_at, status, people(name)').eq('status', 'open').order('created_at', { ascending: true }),
      supabase.from('people').select('id, name, title, org_team, last_interaction_date').order('last_interaction_date', { ascending: true, nullsFirst: true }),
    ])

    // Per-person action item stats
    const personMap: Record<string, { name: string; total: number; done: number; open: number; overdue: number; oldestOpenDays: number }> = {}
    for (const item of allActionItems ?? []) {
      if (item.owner_type !== 'other' || !item.owner_person_id) continue
      const people = item.people as { name: string } | { name: string }[] | null
      const name = (Array.isArray(people) ? people[0]?.name : people?.name) ?? item.owner_person_id
      if (!personMap[item.owner_person_id]) {
        personMap[item.owner_person_id] = { name, total: 0, done: 0, open: 0, overdue: 0, oldestOpenDays: 0 }
      }
      const p = personMap[item.owner_person_id]
      p.total++
      if (item.status === 'done') p.done++
      if (item.status === 'open') {
        p.open++
        if (item.due_date && item.due_date < today) p.overdue++
        const ageDays = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)
        if (ageDays > p.oldestOpenDays) p.oldestOpenDays = ageDays
      }
    }
    const personStats = Object.values(personMap)
      .filter(p => p.total >= 2)
      .map(p => ({
        ...p,
        completionRate: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0,
      }))
      .sort((a, b) => b.open - a.open)

    // My own backlog
    const myItems = (allActionItems ?? []).filter(i => i.owner_type === 'me')
    const myOpen = myItems.filter(i => i.status === 'open')
    const myOverdue = myOpen.filter(i => i.due_date && i.due_date < today)

    // Meeting decision yield
    const lowYieldMeetings = (meetingsWithDecisions ?? [])
      .filter(m => (m.attendee_ids?.length ?? 0) > 1 && (m.decisions as unknown[]).length === 0)
      .slice(0, 5)
      .map(m => ({ title: m.title, date: m.date }))

    const avgDecisionsPerMeeting = meetingsWithDecisions && meetingsWithDecisions.length > 0
      ? ((meetingsWithDecisions.reduce((sum, m) => sum + (m.decisions as unknown[]).length, 0)) / meetingsWithDecisions.length).toFixed(1)
      : '0'

    // Question aging
    const agingQuestions = (openQuestions ?? []).map(q => ({
      question: q.question,
      person: (Array.isArray(q.people) ? q.people[0]?.name : (q.people as { name: string } | null)?.name) ?? null,
      ageDays: Math.floor((Date.now() - new Date(q.created_at).getTime()) / 86400000),
    }))

    // Interaction gaps
    const gapPeople = (people ?? [])
      .filter(p => {
        if (!p.last_interaction_date) return true
        return new Date(p.last_interaction_date) < twentyOneDaysAgo
      })
      .slice(0, 8)
      .map(p => ({
        name: p.name,
        title: p.title,
        daysSinceContact: p.last_interaction_date
          ? Math.floor((Date.now() - new Date(p.last_interaction_date).getTime()) / 86400000)
          : null,
      }))

    context = JSON.stringify({
      my_backlog: {
        open_count: myOpen.length,
        overdue_count: myOverdue.length,
      },
      person_followthrough_stats: personStats,
      meeting_decision_yield: {
        avg_decisions_per_meeting: avgDecisionsPerMeeting,
        recent_meetings_with_no_decisions: lowYieldMeetings,
      },
      open_question_aging: agingQuestions,
      interaction_gaps: gapPeople,
    }, null, 2)

    systemPrompt = `You are a personal work assistant for a product strategy manager. You have been given operational stats derived from their meeting notes, action items, and contact history. Your job is to identify 2-3 patterns that are genuinely worth knowing — things that aren't obvious from day-to-day but show up clearly in the data.

Be direct and specific. Use real names and numbers. Avoid narrating every stat — pick the ones that actually mean something. A pattern is interesting if it implies something the user should do, reconsider, or keep an eye on. If the data is thin or too sparse to draw real conclusions, say so plainly rather than manufacturing insight.

Format: 2-3 short paragraphs, no headers, no bullet points.`
    userMessage = `Here are my operational stats:\n\n${context}\n\nWhat patterns are worth knowing?`

  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer })
}
