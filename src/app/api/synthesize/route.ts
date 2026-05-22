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
    // Find people mentioned by name in the input for person-specific full-history context
    const { data: allPeople } = await supabase.from('people').select('id, name')
    const matched = (allPeople ?? []).filter(p =>
      input.toLowerCase().includes(p.name.toLowerCase())
    )
    const matchedIds = matched.map(p => p.id)
    const hasMatch = matchedIds.length > 0

    const [
      { data: meetings },
      { data: allOpenItems },
      { data: allOpenQuestions },
      { data: decisions },
      { data: observations },
      { data: personRecords },
      { data: personActionItems },
      { data: personQuestions },
    ] = await Promise.all([
      // All meetings, not just 7 days
      supabase.from('meetings').select('*').order('date', { ascending: false }).limit(30),
      supabase.from('action_items').select('*, people(name)').eq('status', 'open').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('open_questions').select('*, people(name)').eq('status', 'open'),
      // All decisions, not just 7 days
      supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('wins_and_observations').select('*').order('date', { ascending: false }).limit(30),
      // Person-specific: full records for matched people
      hasMatch
        ? supabase.from('people').select('*').in('id', matchedIds)
        : supabase.from('people').select('*').order('last_interaction_date', { ascending: false, nullsFirst: false }).limit(20),
      // All action items owned by matched people, regardless of date
      hasMatch
        ? supabase.from('action_items').select('*, people(name)').in('owner_person_id', matchedIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      // All questions related to matched people
      hasMatch
        ? supabase.from('open_questions').select('*, people(name)').in('related_person_id', matchedIds)
        : Promise.resolve({ data: [] }),
    ])

    context = JSON.stringify({
      ...(hasMatch ? { people_you_are_meeting: personRecords } : { people: personRecords }),
      ...(hasMatch ? { all_action_items_owned_by_them: personActionItems } : {}),
      ...(hasMatch ? { all_questions_about_them: personQuestions } : {}),
      all_open_action_items: allOpenItems,
      all_open_questions: allOpenQuestions,
      recent_meetings: meetings,
      decisions,
      observations,
    }, null, 2)

    systemPrompt = `You are a personal work assistant for a product strategy manager who is new to a large company. Given context about a person or meeting they are about to enter, produce a tight pre-brief: who is involved, what's the relevant history, what open items or questions exist with these people, and 1-2 things they should keep in mind. Be specific. No filler.`
    userMessage = `Here is my work data:\n\n${context}\n\nPrepare me for: ${input}`

  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer })
}
