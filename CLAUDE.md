# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists yet.

## Environment

Three env vars are required in `.env.local`:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Architecture

This is a mobile-first personal work assistant for a product strategy manager. It captures meeting notes, extracts structured data via Claude, and surfaces action items, decisions, and open questions through a dashboard.

**Auth and routing.** `src/proxy.ts` acts as a middleware-like function that gates all routes behind Supabase session auth, redirecting unauthenticated users to `/login`. The `(app)` route group wraps all authenticated pages.

**Data layer.** Supabase (Postgres) is the only database. The schema lives in `supabase/schema.sql`. Tables: `people`, `relationships`, `projects`, `meetings`, `decisions`, `action_items`, `wins_and_observations`, `open_questions`, `parsed_items`. Two Supabase client utilities exist: `src/lib/supabase/server.ts` (server components and API routes) and `src/lib/supabase/client.ts` (client components). All tables have RLS enabled; authenticated users see all rows (single-user app).

**Three API routes, each calling Claude:**
- `POST /api/parse` — takes raw meeting notes, calls `claude-sonnet-4-6` to extract structured JSON (people, decisions, action items, open questions, observations), then writes everything to Supabase in sequence. People are upsert-matched by name (case-insensitive `ilike`).
- `POST /api/query` — pulls up to 50 records from each table, serializes to JSON, and asks Claude to answer a freeform question.
- `POST /api/synthesize` — two modes: `weekly` (7-day summary) and `prep` (pre-meeting brief for a named person or meeting).

**Server actions.** `src/lib/actions.ts` has two mutations used directly in form `formAction` props: `markActionItemDone` and `markQuestionAnswered`. These use inline `'use server'` directives inside the dashboard page's form buttons.

**Pages:**
- `/` — dashboard ("Morning Review"): open action items split by owner (me vs. others), open questions, wins/intelligence/observations from the last 7 days
- `/capture` — textarea for raw notes, posts to `/api/parse`, shows extracted results
- `/meetings` and `/meetings/[id]` — meeting log and detail view with parsed items
- `/people` and `/people/[id]` — contact list and detail
- `/query` — freeform ask interface calling `/api/query`

**Types.** All shared TypeScript interfaces are in `src/lib/types.ts`, including `ParseResult` (the Claude extraction schema).

## Design System

The UI uses a "Lanterne Rouge" design system defined in `DESIGN.md`. Key rules:
- `0.5px` borders everywhere (not `1px`)
- Palette: ink `#1a1a1a`, red `#C8313A`, parchment `#f5f1ec`, stone `#8a7d6e`
- Georgia serif for headlines and score numerals only; system sans for body
- No `box-shadow` — elevation is achieved through background color layering (parchment > white > parchment)
- Red is used exclusively for interaction states; no second accent color
- `label-caps` style (11px, bold, uppercase, tracked) for section titles

Note: the current implementation uses a dark Tailwind theme (gray-900 backgrounds) that diverges from the parchment-based DESIGN.md spec. The design doc represents the intended direction.
