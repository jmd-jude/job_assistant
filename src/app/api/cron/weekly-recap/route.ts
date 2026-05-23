import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLAUDE_MODEL } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

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

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `You are a personal work assistant for a product strategy manager who is new to a large company. Write a concise weekly synthesis based on their captured data. Cover: who they talked to, what moved forward, what's still stuck, and 1-2 things they should be thinking about. Be direct and specific. Use their actual names and details. 3-5 short paragraphs, no headers.`,
    messages: [{ role: 'user', content: `Here is my work data from this week:\n\n${context}\n\nGive me the weekly synthesis.` }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!content) {
    return NextResponse.json({ error: 'Empty response from Claude' }, { status: 500 })
  }

  const weekEnding = new Date().toISOString().split('T')[0]

  const { data: recap, error: recapError } = await supabase
    .from('recaps')
    .insert({ content, week_ending: weekEnding })
    .select('id, week_ending')
    .single()

  if (recapError) {
    console.error('[cron/weekly-recap] recap insert failed:', recapError)
    return NextResponse.json({ error: recapError.message }, { status: 500 })
  }

  try {
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: content })
    const vector = res.data[0].embedding

    await supabase.from('recaps').update({ embedding: vector }).eq('id', recap.id)

    const { data: pi } = await supabase
      .from('parsed_items')
      .insert({ meeting_id: null, item_type: 'recap', content: content.slice(0, 2000), linked_record_id: recap.id })
      .select('id')
      .single()

    if (pi) {
      await supabase.from('parsed_items').update({ embedding: vector }).eq('id', pi.id)
    }
  } catch (e) {
    console.error('[cron/weekly-recap] embed failed:', e)
  }

  console.log(`[cron/weekly-recap] saved recap ${recap.id} for week ending ${recap.week_ending}`)
  return NextResponse.json({ ok: true, recap_id: recap.id, week_ending: recap.week_ending })
}
