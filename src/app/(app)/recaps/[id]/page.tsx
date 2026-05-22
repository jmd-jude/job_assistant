import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Markdown from 'react-markdown'
import { formatDateWithWeekday } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { Recap } from '@/lib/types'

export default async function RecapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recap } = await supabase
    .from('recaps')
    .select('id, week_ending, generated_at, content, created_at')
    .eq('id', id)
    .single() as { data: Recap | null }

  if (!recap) notFound()

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/recaps" className="text-sm text-lr-stone hover:text-lr-ink transition-colors">
          &larr; Recaps
        </Link>
      </div>

      <p className="label-caps text-lr-stone mb-3">Week of {formatDateWithWeekday(recap.week_ending)}</p>

      <div className="bg-lr-white rounded-xl lr-border-med px-4 py-4 text-sm text-lr-ink leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-lr-ink prose-headings:text-lr-ink prose-a:text-lr-red">
        <Markdown>{recap.content}</Markdown>
      </div>

      <p className="mt-4 text-xs text-lr-stone">
        Saved {new Date(recap.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}
