import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, week_ending } = await request.json()
    if (!content?.trim()) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    const weekEnding = week_ending || new Date().toISOString().split('T')[0]

    const { data: recap, error: recapError } = await supabase
      .from('recaps')
      .insert({ content, week_ending: weekEnding })
      .select('id, week_ending, generated_at, created_at')
      .single()

    if (recapError) {
      console.error('[recaps] insert failed:', recapError.message, recapError.code, recapError.details)
      return NextResponse.json({ error: recapError.message }, { status: 500 })
    }

    try {
      const vector = await embed(content)

      await supabase.from('recaps').update({ embedding: vector }).eq('id', recap.id)

      const { data: pi, error: piError } = await supabase
        .from('parsed_items')
        .insert({
          meeting_id: null,
          item_type: 'recap',
          content: content.slice(0, 2000),
          linked_record_id: recap.id,
        })
        .select('id')
        .single()

      if (piError) {
        console.error('[recaps] parsed_items insert failed:', piError)
      } else if (pi) {
        const { error: embError } = await supabase
          .from('parsed_items')
          .update({ embedding: vector })
          .eq('id', pi.id)
        if (embError) console.error('[recaps] parsed_items embedding update failed:', embError)
      }
    } catch (e) {
      console.error('[recaps] embed failed:', e)
    }

    return NextResponse.json({ recap })
  } catch (e) {
    console.error('[recaps] unhandled error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: recaps, error } = await supabase
      .from('recaps')
      .select('id, week_ending, generated_at, content, created_at')
      .order('week_ending', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recaps })
  } catch (e) {
    console.error('[recaps] GET unhandled error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
