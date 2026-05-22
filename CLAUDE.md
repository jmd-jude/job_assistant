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

Four env vars are required in `.env.local`:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`OPENAI_API_KEY` is used exclusively for generating embeddings via `text-embedding-3-small`. All reasoning and generation still goes through Claude.

## Architecture

This is a mobile-first personal work assistant for a product strategy manager. It captures meeting notes, extracts structured data via Claude, and surfaces action items, decisions, and open questions through a dashboard.

**Auth and routing.** `src/proxy.ts` acts as a middleware-like function that gates all routes behind Supabase session auth, redirecting unauthenticated users to `/login`. The `(app)` route group wraps all authenticated pages.

**Data layer.** Supabase (Postgres) is the only database. The schema lives in `supabase/schema.sql`. Tables: `people`, `relationships`, `projects`, `meetings`, `decisions`, `action_items`, `wins_and_observations`, `open_questions`, `parsed_items`, `recaps`. Two Supabase client utilities exist: `src/lib/supabase/server.ts` (server components and API routes) and `src/lib/supabase/client.ts` (client components). All tables have RLS enabled; authenticated users see all rows (single-user app).

`parsed_items` is the retrieval backbone. It has an `embedding vector(1536)` column populated at ingest time and a `match_parsed_items(query_embedding, match_count)` RPC function for cosine similarity search. The `pgvector` extension must be enabled in Supabase for this to work.

**API routes:**
- `POST /api/parse` — takes raw meeting notes, calls `claude-sonnet-4-6` to extract structured JSON (people, decisions, action items, open questions, observations), writes everything to Supabase in sequence, then generates an OpenAI embedding for each `parsed_items` row (with meeting title prepended for context). People are upsert-matched by name (case-insensitive `ilike`).
- `POST /api/query` — embeds the incoming question via OpenAI, calls the `match_parsed_items` Supabase RPC to retrieve the 15 most semantically similar records, fetches their linked records with joins, and asks Claude to answer based on that relevant context.
- `POST /api/synthesize` — two modes: `weekly` (7-day summary using time-bounded queries) and `prep` (pre-meeting brief for a named person or meeting, with person-aware filtering). These modes use direct table queries, not vector retrieval.
- `POST /api/recaps` — saves a weekly recap narrative to the `recaps` table, embeds it, and also writes a row to `parsed_items` with `item_type = 'recap'` and `linked_record_id` pointing at the recap. This dual-write lets the existing `match_parsed_items` RPC surface recaps in Ask results without any changes to the query route. `GET /api/recaps` returns the full list for the server-rendered list page.

**Server actions.** `src/lib/actions.ts` has two mutations used directly in form `formAction` props: `markActionItemDone` and `markQuestionAnswered`. These use inline `'use server'` directives inside the dashboard page's form buttons.

**Pages:**
- `/` — dashboard ("Morning Review"): open action items split by owner (me vs. others), open questions, wins/intelligence/observations from the last 7 days
- `/capture` — textarea for raw notes, posts to `/api/parse`, shows extracted results
- `/meetings` and `/meetings/[id]` — meeting log and detail view with parsed items
- `/people` and `/people/[id]` — contact list and detail
- `/query` — freeform ask interface (Ask, Week recap, Prep me modes); weekly recap mode shows a "Save this recap" button post-generation
- `/recaps` and `/recaps/[id]` — chronological list of saved weekly recaps and full-text detail view

**Types.** All shared TypeScript interfaces are in `src/lib/types.ts`, including `ParseResult` (the Claude extraction schema).

## Known Gotchas

**Markdown fence stripping.** Claude occasionally wraps JSON responses in ` ```json ` fences despite being instructed not to. `/api/parse/route.ts` strips them before `JSON.parse`. Don't remove that step.

**Schema migrations.** `supabase/schema.sql` includes numbered migrations at the bottom. Migration 001 adds `type` to `wins_and_observations` and `related_person_id` to `open_questions`. Migration 002 adds the `embedding` column and `match_parsed_items` RPC to `parsed_items`. Migration 003 adds the `recaps` table and updates the `parsed_items_item_type_check` constraint to include `'recap'`. If standing up a fresh instance, run the full file top to bottom. If the live DB already has the base tables, only the migration blocks need to be run.

## Design System

The UI implements the "Lanterne Rouge" design system defined in `DESIGN.md`. Key rules:
- `0.5px` borders everywhere (not `1px`) — use the `.lr-border` / `.lr-border-med` CSS utility classes
- Palette tokens are CSS custom properties defined in `@theme` in `globals.css`: `bg-lr-ink`, `bg-lr-parchment`, `bg-lr-white`, `text-lr-stone`, `text-lr-red`, etc.
- Georgia serif (`font-serif`) for page `h1` headlines only; system sans for everything else
- No `box-shadow` — elevation via background color layering (parchment page → white card → parchment inner)
- Red (`text-lr-red`, `bg-lr-red`) exclusively for interaction states; no second accent color
- `.label-caps` CSS class for all section title labels (11px, bold, uppercase, tracked)
- Primary buttons: `bg-lr-ink text-lr-parchment hover:opacity-80`

**Dark mode** is implemented via `[data-theme="dark"]` on `<html>`. The same token names resolve to dark-palette values. A `ThemeToggle` component in `src/components/ThemeToggle.tsx` handles the toggle and persists to `localStorage`. An anti-flash inline script in `src/app/layout.tsx` applies the stored theme before paint.
