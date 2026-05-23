'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV = [
  { href: '/capture', label: 'Capture', icon: PlusIcon },
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/meetings', label: 'Meetings', icon: CalendarIcon },
  { href: '/query', label: 'Ask', icon: SearchIcon },
]

const MORE_LINKS = [
  { href: '/people', label: 'People', description: 'Contacts and relationships' },
  { href: '/decisions', label: 'Decisions', description: 'Log of captured decisions' },
  { href: '/recaps', label: 'Recaps', description: 'Saved weekly summaries' },
  { href: '/intel', label: 'Intel', description: 'Wins, observations, intelligence' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = MORE_LINKS.some(l => pathname.startsWith(l.href))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="fixed top-0 left-0 right-0 flex justify-end items-center gap-1 px-4 py-2 z-50">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="text-lr-stone hover:text-lr-ink transition-colors p-1"
          title="Sign out"
        >
          <SignOutIcon className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 pt-8">
        {children}
      </main>

      {moreOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-lr-white lr-border-t shadow-none">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-1">
            {MORE_LINKS.map(({ href, label, description }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-lr-parchment text-lr-ink'
                    : 'hover:bg-lr-parchment text-lr-stone hover:text-lr-ink'
                }`}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-lr-stone">{description}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="bg-lr-white lr-border-t flex z-50 shrink-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-lr-ink' : 'text-lr-stone hover:text-lr-ink'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            moreActive || moreOpen ? 'text-lr-ink' : 'text-lr-stone hover:text-lr-ink'
          }`}
        >
          <GridIcon className="w-5 h-5" />
          More
        </button>
      </nav>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
