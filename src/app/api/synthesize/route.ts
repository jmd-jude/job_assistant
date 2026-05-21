import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mode, input } = await request.json()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

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

  const context = JSON.stringify({
    recent_meetings: recentMeetings,
    open_action_items: openItems,
    open_questions: openQuestions,
    recent_observations: recentObs,
    people,
    recent_decisions: decisions,
  }, null, 2)

  let systemPrompt: string
  let userMessage: string

  if (mode === 'weekly') {
    systemPrompt = `You are a personal work assistant for a product strategy manager who is new to a large company. Write a concise weekly synthesis based on their captured data. Cover: who they talked to, what moved forward, what's still stuck, and 1-2 things they should be thinking about. Be direct and specific. Use their actual names and details. 3-5 short paragraphs, no headers.`
    userMessage = `Here is my work data from this week:\n\n${context}\n\nGive me the weekly synthesis.`
  } else if (mode === 'prep') {
    systemPrompt = `You are a personal work assistant for a product strategy manager who is new to a large company. Given context about a person or meeting they are about to enter, produce a tight pre-brief: who is involved, what's the relevant history, what open items or questions exist with these people, and 1-2 things they should keep in mind. Be specific. No filler.`
    userMessage = `Here is my work data:\n\n${context}\n\nPrepare me for: ${input}`
  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer })
}
