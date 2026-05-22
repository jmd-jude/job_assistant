import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await request.json()
  if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  // Embed the question and retrieve semantically similar records
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  })
  const queryVector = embRes.data[0].embedding

  const { data: matches, error: matchError } = await supabase.rpc('match_parsed_items', {
    query_embedding: queryVector,
    match_count: 15,
  })

  if (matchError) console.error('[query] vector search failed:', matchError)

  // Fetch full linked records for each match
  const context: Record<string, unknown>[] = []
  for (const match of matches ?? []) {
    const base = {
      type: match.item_type,
      content: match.content,
      similarity: Math.round(match.similarity * 100) / 100,
    }

    if (match.linked_record_id) {
      if (match.item_type === 'action_item') {
        const { data } = await supabase
          .from('action_items')
          .select('*, people(name), meetings(title, date)')
          .eq('id', match.linked_record_id)
          .single()
        context.push({ ...base, record: data })
      } else if (match.item_type === 'decision') {
        const { data } = await supabase
          .from('decisions')
          .select('*, meetings(title, date)')
          .eq('id', match.linked_record_id)
          .single()
        context.push({ ...base, record: data })
      } else if (match.item_type === 'open_question') {
        const { data } = await supabase
          .from('open_questions')
          .select('*, people(name)')
          .eq('id', match.linked_record_id)
          .single()
        context.push({ ...base, record: data })
      } else {
        context.push(base)
      }
    } else {
      context.push(base)
    }
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a personal work assistant for a product strategy manager. Answer questions about their work based on the retrieved records provided. Be direct and specific. Reference names, dates, and details from the data. If the answer isn't in the data, say so plainly.`,
    messages: [
      {
        role: 'user',
        content: `Relevant records from my knowledge base:\n\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`,
      },
    ],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer })
}
