import { createClient } from '@/lib/supabase/server'

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
    win: 'bg-green-900/50 text-green-400',
    intelligence: 'bg-blue-900/50 text-blue-400',
    observation: 'bg-gray-800 text-gray-400',
  }

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Intel archive</h1>
        <span className="text-sm text-gray-500">{counts.all} total</span>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <a
            key={f.id}
            href={f.id === 'all' ? '/intel' : `/intel?type=${f.id}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
            <div key={item.id} className="bg-gray-900 rounded-lg px-4 py-3">
              <div className="flex items-start gap-3">
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${typeBadge[item.type] ?? 'bg-gray-800 text-gray-400'}`}>
                  {typeLabel[item.type] ?? item.type}
                </span>
                <p className="text-sm text-gray-100 flex-1">{item.content}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 ml-9">{formatDate(item.date)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600 py-2">Nothing here yet.</p>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
