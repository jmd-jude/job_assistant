import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ParseResult } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a personal work assistant helping a product strategy manager at a large company capture and organize information from their day.

The user will give you raw, unstructured notes from a meeting or interaction. Extract the following into a JSON object with these keys:

- people: array of {name, title, org_team} — anyone mentioned
- decisions: array of {title, context, outcome, alternatives_considered}
- action_items: array of {description, owner_type ("me" or "other"), owner_name (if other), due_date (ISO format if mentioned, else null)}
- open_questions: array of {question, context}
- observations: array of {content} — anything notable that doesn't fit above
- suggested_meeting_title: string — infer a short title if none was provided

Return only valid JSON. No preamble, no explanation, no markdown fences.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { raw_notes, meeting_title, meeting_date } = await request.json()
  if (!raw_notes?.trim()) {
    return NextResponse.json({ error: 'No notes provided' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: raw_notes }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  let parsed: ParseResult
  try {
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  const date = meeting_date || new Date().toISOString().split('T')[0]
  const title = meeting_title || parsed.suggested_meeting_title || null

  // Insert meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({ title, date, raw_notes })
    .select()
    .single()

  if (meetingError) return NextResponse.json({ error: meetingError.message }, { status: 500 })

  // Upsert people and collect id map
  const personIdMap: Record<string, string> = {}
  for (const p of parsed.people ?? []) {
    const { data: existing } = await supabase
      .from('people')
      .select('id')
      .ilike('name', p.name)
      .maybeSingle()

    if (existing) {
      personIdMap[p.name] = existing.id
    } else {
      const { data: newPerson } = await supabase
        .from('people')
        .insert({ name: p.name, title: p.title ?? null, org_team: p.org_team ?? null })
        .select('id')
        .single()
      if (newPerson) personIdMap[p.name] = newPerson.id
    }
  }

  // Insert decisions
  for (const d of parsed.decisions ?? []) {
    const { data: decision } = await supabase
      .from('decisions')
      .insert({
        title: d.title,
        context: d.context ?? null,
        outcome: d.outcome ?? null,
        alternatives_considered: d.alternatives_considered ?? null,
        meeting_id: meeting.id,
      })
      .select('id')
      .single()

    if (decision) {
      await supabase.from('parsed_items').insert({
        meeting_id: meeting.id,
        item_type: 'decision',
        content: d.title,
        linked_record_id: decision.id,
      })
    }
  }

  // Insert action items
  for (const a of parsed.action_items ?? []) {
    const owner_person_id = a.owner_name ? (personIdMap[a.owner_name] ?? null) : null
    const { data: actionItem } = await supabase
      .from('action_items')
      .insert({
        description: a.description,
        owner_type: a.owner_type,
        owner_person_id,
        due_date: a.due_date ?? null,
        status: 'open',
        related_meeting_id: meeting.id,
      })
      .select('id')
      .single()

    if (actionItem) {
      await supabase.from('parsed_items').insert({
        meeting_id: meeting.id,
        item_type: 'action_item',
        content: a.description,
        linked_record_id: actionItem.id,
      })
    }
  }

  // Insert open questions
  for (const q of parsed.open_questions ?? []) {
    const { data: question } = await supabase
      .from('open_questions')
      .insert({ question: q.question, context: q.context ?? null, status: 'open' })
      .select('id')
      .single()

    if (question) {
      await supabase.from('parsed_items').insert({
        meeting_id: meeting.id,
        item_type: 'open_question',
        content: q.question,
        linked_record_id: question.id,
      })
    }
  }

  // Insert observations
  for (const o of parsed.observations ?? []) {
    await supabase.from('wins_and_observations').insert({ content: o.content, date })
    await supabase.from('parsed_items').insert({
      meeting_id: meeting.id,
      item_type: 'observation',
      content: o.content,
    })
  }

  // Update meeting attendee_ids
  const attendeeIds = Object.values(personIdMap)
  if (attendeeIds.length > 0) {
    await supabase.from('meetings').update({ attendee_ids: attendeeIds }).eq('id', meeting.id)
  }

  return NextResponse.json({ meeting, parsed })
}
