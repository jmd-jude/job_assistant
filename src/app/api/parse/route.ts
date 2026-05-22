import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { ParseResult } from '@/lib/types'
import { CLAUDE_MODEL } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

const SYSTEM_PROMPT = `You are a personal work assistant helping a product strategy manager at a large company capture and organize information from their day.

The user will give you raw, unstructured notes from a meeting or interaction. Extract the following into a JSON object with these keys:

- people: array of {name, title, org_team} — anyone mentioned by name
- decisions: array of {title, context, outcome, alternatives_considered}
- action_items: array of {description, owner_type ("me" or "other"), owner_name (if other), due_date (ISO 8601 date if an explicit date or day was stated, otherwise null — do not infer dates from vague terms like "soon" or "EOW")}
- open_questions: array of {question, context, related_person_name (name of person the question is about, if applicable, else null)} — only include questions the user explicitly flagged as unresolved or uncertain. Do not infer questions from subtext, observations, or things the user didn't directly state as open.
- observations: array of {content, type} — type is one of: "win" (a positive outcome or accomplishment), "intelligence" (political or organizational insight worth remembering), or "observation" (anything else notable)
- suggested_meeting_title: string — infer a short title if none was provided

Return only valid JSON. No preamble, no explanation, no markdown fences.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { raw_notes, meeting_title, meeting_date } = await request.json()
    if (!raw_notes?.trim()) {
      return NextResponse.json({ error: 'No notes provided' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: raw_notes }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    console.log('[parse] stop_reason:', message.stop_reason, '| output length:', text.length)

    let parsed: ParseResult
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      console.error('[parse] JSON parse failed:', e, '\nRaw text:', raw)
      return NextResponse.json({ error: 'Failed to parse response', raw: text }, { status: 500 })
    }

    const date = meeting_date || new Date().toISOString().split('T')[0]
    const title = meeting_title || parsed.suggested_meeting_title || null

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({ title, date, raw_notes })
      .select()
      .single()

    if (meetingError) {
      console.error('[parse] meeting insert failed:', meetingError)
      return NextResponse.json({ error: meetingError.message }, { status: 500 })
    }

    const personIdMap: Record<string, string> = {}
    for (const p of parsed.people ?? []) {
      const { data: existing } = await supabase
        .from('people')
        .select('id')
        .ilike('name', p.name)
        .maybeSingle()

      if (existing) {
        personIdMap[p.name] = existing.id
        await supabase.from('people').update({ last_interaction_date: date }).eq('id', existing.id)
      } else {
        const { data: newPerson, error: personError } = await supabase
          .from('people')
          .insert({ name: p.name, title: p.title ?? null, org_team: p.org_team ?? null, last_interaction_date: date })
          .select('id')
          .single()
        if (personError) console.error('[parse] person insert failed:', p.name, personError)
        if (newPerson) personIdMap[p.name] = newPerson.id
      }
    }

    const insertParsedItem = async (
      item_type: string,
      content: string,
      linked_record_id?: string,
      meetingTitle?: string | null
    ) => {
      const { data: pi, error: piError } = await supabase.from('parsed_items').insert({
        meeting_id: meeting.id,
        item_type,
        content,
        linked_record_id: linked_record_id ?? null,
      }).select('id').single()
      if (piError) {
        console.error(`[parse] parsed_items (${item_type}) insert failed:`, piError)
        return
      }
      try {
        const embeddingText = meetingTitle ? `${meetingTitle}: ${content}` : content
        const vector = await embed(embeddingText)
        const { error: embError } = await supabase
          .from('parsed_items')
          .update({ embedding: vector })
          .eq('id', pi.id)
        if (embError) console.error(`[parse] embedding update failed (${item_type}):`, embError)
      } catch (e) {
        console.error(`[parse] embed() failed (${item_type}):`, e)
      }
    }

    for (const d of parsed.decisions ?? []) {
      const { data: decision, error: decisionError } = await supabase
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

      if (decisionError) console.error('[parse] decision insert failed:', d.title, decisionError)
      if (decision) await insertParsedItem('decision', d.title, decision.id, title)
    }

    for (const a of parsed.action_items ?? []) {
      const owner_person_id = a.owner_name ? (personIdMap[a.owner_name] ?? null) : null
      const { data: actionItem, error: aiError } = await supabase
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

      if (aiError) console.error('[parse] action_item insert failed:', a.description, aiError)
      if (actionItem) await insertParsedItem('action_item', a.description, actionItem.id, title)
    }

    for (const q of parsed.open_questions ?? []) {
      const related_person_id = q.related_person_name
        ? (personIdMap[q.related_person_name] ?? null)
        : null

      const { data: question, error: qError } = await supabase
        .from('open_questions')
        .insert({
          question: q.question,
          context: q.context ?? null,
          status: 'open',
          related_person_id,
        })
        .select('id')
        .single()

      if (qError) console.error('[parse] open_question insert failed:', q.question, qError)
      if (question) await insertParsedItem('open_question', q.question, question.id, title)
    }

    for (const o of parsed.observations ?? []) {
      const { error: obsError } = await supabase.from('wins_and_observations').insert({
        content: o.content,
        date,
        type: o.type ?? 'observation',
      })
      if (obsError) console.error('[parse] wins_and_observations insert failed:', o.content, obsError)
      await insertParsedItem('observation', o.content, undefined, title)
    }

    const attendeeIds = Object.values(personIdMap)
    if (attendeeIds.length > 0) {
      const { error: attendeeError } = await supabase
        .from('meetings')
        .update({ attendee_ids: attendeeIds })
        .eq('id', meeting.id)
      if (attendeeError) console.error('[parse] attendee_ids update failed:', attendeeError)
    }

    return NextResponse.json({ meeting, parsed })
  } catch (e) {
    console.error('[parse] unhandled error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
