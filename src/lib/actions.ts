'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markActionItemDone(id: string, status: 'done' | 'dropped') {
  const supabase = await createClient()
  await supabase.from('action_items').update({ status, resolved_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/')
}

export async function updateActionItem(
  id: string,
  data: { description: string; due_date: string | null; owner_type: 'me' | 'other' }
) {
  const supabase = await createClient()
  await supabase.from('action_items').update(data).eq('id', id)
  revalidatePath('/')
}

export async function markQuestionAnswered(id: string) {
  const supabase = await createClient()
  await supabase
    .from('open_questions')
    .update({ status: 'answered', answered_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/')
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient()
  await supabase.from('open_questions').delete().eq('id', id)
  revalidatePath('/')
}
