import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateWithWeekday } from '@/lib/utils'
import type { Recap } from '@/lib/types'

function previewText(content: string): string {
  const firstSentence = content.split(/\.\s+/)[0]
  return firstSentence.length > 140 ? firstSentence.slice(0, 137) + '...' : firstSentence + '.'
}

export default async function RecapsPage() {
  const supabase = await createClient()
  const { data: recaps } = await supabase
    .from('recaps')
    .select('id, week_ending, generated_at, content, created_at')
    .order('week_ending', { ascending: false }) as { data: Recap[] | null }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-semibold">Saved recaps</h1>
        <Link href="/query" className="text-sm text-lr-stone hover:text-lr-ink transition-colors">Ask</Link>
      </div>

      {recaps?.length ? (
        <div className="space-y-2">
          {recaps.map(r => (
            <Link
              key={r.id}
              href={`/recaps/${r.id}`}
              className="block bg-lr-white rounded-lg lr-border-med px-4 py-3 hover:bg-lr-parchment transition-colors"
            >
              <p className="text-xs label-caps text-lr-stone mb-1">
                Week of {formatDateWithWeekday(r.week_ending)}
              </p>
              <p className="text-sm text-lr-ink leading-snug">{previewText(r.content)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-lr-stone">No recaps saved yet. Generate a week recap and hit "Save this recap" to keep it.</p>
      )}
    </div>
  )
}
