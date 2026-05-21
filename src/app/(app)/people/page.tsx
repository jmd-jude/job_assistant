import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Person } from '@/lib/types'

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: people } = await supabase
    .from('people')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="px-4 pt-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">People</h1>
      {people?.length ? (
        <div className="space-y-2">
          {people.map(person => (
            <PersonRow key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">No people yet. They appear automatically when you capture notes.</p>
      )}
    </div>
  )
}

function PersonRow({ person }: { person: Person }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-gray-100">{person.name}</p>
        {(person.title || person.org_team) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {[person.title, person.org_team].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {person.rapport != null && (
          <RapportDots value={person.rapport} />
        )}
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

function RapportDots({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= value ? 'bg-blue-400' : 'bg-gray-700'}`}
        />
      ))}
    </div>
  )
}
