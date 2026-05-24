import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await request.json()
    if (!content?.trim()) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ content: content.trim() })
      .select('id, content, created_at')
      .single()

    if (noteError) {
      console.error('[notes] insert failed:', noteError)
      return NextResponse.json({ error: noteError.message }, { status: 500 })
    }

    try {
      const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: content.trim() })
      const vector = res.data[0].embedding

      const { data: pi } = await supabase
        .from('parsed_items')
        .insert({
          meeting_id: null,
          item_type: 'note',
          content: content.trim().slice(0, 2000),
          linked_record_id: note.id,
        })
        .select('id')
        .single()

      if (pi) {
        await supabase.from('parsed_items').update({ embedding: vector }).eq('id', pi.id)
      }
    } catch (e) {
      console.error('[notes] embed failed:', e)
    }

    return NextResponse.json({ note })
  } catch (e) {
    console.error('[notes] unhandled error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
