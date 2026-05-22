import { createClient } from '@/lib/supabase/server'
import { formatDateWithWeekday } from '@/lib/utils'

type FilterType = 'all' | 'win' | 'intelligence' | 'observation'

export default async function IntelPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const filter = (['win', 'intelligence', 'observation'].includes(type ?? '') ? type : 'all') as FilterType

  const supabase = await createClient()
  let query = supabase
    .from('wins_and_observations')
    .select('*')
    .order('date', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('type', filter)
  }

  const { data: items } = await query

  const counts = {
    all: items?.length ?? 0,
    win: items?.filter(i => i.type === 'win').length ?? 0,
    intelligence: items?.filter(i => i.type === 'intelligence').length ?? 0,
    observation: items?.filter(i => i.type === 'observation').length ?? 0,
  }

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'win', label: 'Wins' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'observation', label: 'Observations' },
  ]

  const typeLabel: Record<string, string> = {
    win: 'Win',
    intelligence: 'Intel',
    observation: 'Obs',
  }

  const typeBadge: Record<string, string> = {
    win: 'bg-lr-green/15 text-lr-green',
    intelligence: 'bg-lr-red/10 text-lr-red',
    observation: 'bg-lr-parchment text-lr-stone',
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-serif font-semibold">Intel archive</h1>
        <span className="text-sm text-lr-stone">{counts.all} total</span>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <a
            key={f.id}
            href={f.id === 'all' ? '/intel' : `/intel?type=${f.id}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-lr-ink text-lr-parchment'
                : 'bg-lr-parchment text-lr-stone hover:bg-lr-ink hover:text-lr-parchment'
            }`}
          >
            {f.label}
            {f.id !== 'all' && counts[f.id] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{counts[f.id]}</span>
            )}
          </a>
        ))}
      </div>

      {items?.length ? (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-lr-white rounded-lg lr-border-med px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${typeBadge[item.type] ?? 'bg-lr-parchment text-lr-stone'}`}>
                  {typeLabel[item.type] ?? item.type}
                </span>
                <p className="text-sm text-lr-ink flex-1">{item.content}</p>
              </div>
              <p className="text-xs text-lr-stone mt-1.5 ml-9">{formatDateWithWeekday(item.date)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-lr-stone py-2">Nothing here yet.</p>
      )}
    </div>
  )
}

