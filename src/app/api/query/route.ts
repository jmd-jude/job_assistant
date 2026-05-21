import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await request.json()
  if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  // Pull relevant context from the DB
  const [
    { data: actionItems },
    { data: openQuestions },
    { data: decisions },
    { data: people },
    { data: meetings },
    { data: wins },
  ] = await Promise.all([
    supabase.from('action_items').select('*, people(name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('open_questions').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('people').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('meetings').select('*').order('date', { ascending: false }).limit(20),
    supabase.from('wins_and_observations').select('*').order('date', { ascending: false }).limit(20),
  ])

  const context = JSON.stringify({
    action_items: actionItems,
    open_questions: openQuestions,
    decisions,
    people,
    meetings,
    wins_and_observations: wins,
  }, null, 2)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a personal work assistant for a product strategy manager. Answer questions about their work based on the data provided. Be direct and specific. Use plain language. Reference specific names, dates, and details from the data. If something isn't in the data, say so plainly.`,
    messages: [
      {
        role: 'user',
        content: `Here is my work data:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''
  return NextResponse.json({ answer })
}
