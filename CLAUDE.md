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

One optional env var:

```
CLAUDE_MODEL=claude-sonnet-4-6   # defaults to claude-sonnet-4-6 if unset
```

`OPENAI_API_KEY` is used exclusively for generating embeddings via `text-embedding-3-small`. All reasoning and generation still goes through Claude. The active Claude model is controlled by `CLAUDE_MODEL` via `src/lib/utils.ts` and consumed by all three API routes that call Anthropic.

## Architecture

This is a mobile-first personal work assistant for a product strategy manager. It captures meeting notes, extracts structured data via Claude, and surfaces action items, decisions, and open questions through a dashboard.

**Auth and routing.** `src/proxy.ts` acts as a middleware-like function that gates all routes behind Supabase session auth, redirecting unauthenticated users to `/login`. The `(app)` route group wraps all authenticated pages.

**Data layer.** Supabase (Postgres) is the only database. The schema lives in `supabase/schema.sql`. Tables: `people`, `relationships`, `projects`, `meetings`, `decisions`, `action_items`, `wins_and_observations`, `open_questions`, `parsed_items`, `recaps`, `conversations`, `conversation_turns`, `notes`. Two Supabase client utilities exist: `src/lib/supabase/server.ts` (server components and API routes) and `src/lib/supabase/client.ts` (client components). All tables have RLS enabled; authenticated users see all rows (single-user app).

`parsed_items` is the retrieval backbone. It has an `embedding vector(1536)` column populated at ingest time and a `match_parsed_items(query_embedding, match_count)` RPC function for cosine similarity search. The `pgvector` extension must be enabled in Supabase for this to work. Notes and recaps are dual-written: the record goes to its own table (`notes`, `recaps`) and a corresponding row in `parsed_items` with `linked_record_id` pointing back, so Ask can retrieve them without changes to the query route.

**API routes:**
- `POST /api/parse` — takes raw meeting notes, calls Claude to extract structured JSON (people, decisions, action items, open questions, observations), writes everything to Supabase in sequence, then generates an OpenAI embedding for each `parsed_items` row (with meeting title prepended for context). People are upsert-matched by name (case-insensitive `ilike`). Also updates `meetings.attendee_ids` with resolved person UUIDs and stores the raw Claude JSON in `meetings.raw_parse`.
- `POST /api/query` — embeds the incoming question via OpenAI, calls the `match_parsed_items` Supabase RPC to retrieve the 15 most semantically similar records, fetches their linked records with joins, and asks Claude to answer based on that relevant context. Supports multi-turn conversations: pass an optional `conversation_id` to continue a thread; omit it to start a new one. Prior turns are fetched from `conversation_turns` and prepended to the Claude messages array. The response always includes a `conversation_id`.
- `POST /api/synthesize` — four modes: `weekly` (7-day summary), `prep` (pre-meeting brief, person-aware), and `patterns` (aggregate stats analysis). All use direct table queries, not vector retrieval. `prep` filters meetings via `attendee_ids`, fetches open and recently-resolved action items per person, relationships, and person notes. `patterns` computes per-person follow-through rates, meeting decision yield, question aging, and interaction gaps in JS before passing structured stats to Claude.
- `POST /api/recaps` — saves a weekly recap to the `recaps` table and dual-writes to `parsed_items` with `item_type = 'recap'`. `GET /api/recaps` returns the full list.

**Server actions.** `src/lib/actions.ts` contains all DB mutations: `markActionItemDone`, `updateActionItem`, `markQuestionAnswered`, `dropQuestion`, `deleteQuestion`, `createActionItem`, `updatePersonNotes`. All call `revalidatePath` after writing.

**Client components.**
- `src/components/EditableActionItem.tsx` — inline edit for action items on the dashboard
- `src/components/EditablePersonNotes.tsx` — click-to-edit notes field on person detail pages
- `src/components/AssistantBubble.tsx` — renders an Ask response with an inline "+ Capture action item" form below it

**Pages:**
- `/` — dashboard ("Morning Review"): open action items split by owner (me vs. others), open questions with Answered/Drop/delete controls, wins/intelligence/observations from the last 7 days
- `/capture` — two tabs: meeting notes (posts to `/api/parse`) and quick note (freeform, stored in `notes` table, embedded via `parsed_items`)
- `/meetings` and `/meetings/[id]` — meeting log and detail view; detail fetches questions via two-step `parsed_items` → `open_questions` lookup (not a subquery)
- `/people` and `/people/[id]` — contact list and detail; detail includes editable notes, rapport dots, last interaction date, and a Prep me shortcut
- `/query` — four-tab interface: Ask (persistent chat thread), Week recap, Prep me, Patterns; Ask uses `conversations`/`conversation_turns`; Patterns and Week recap need no text input
- `/recaps` and `/recaps/[id]` — saved weekly recaps list and full-text detail

**Types.** All shared TypeScript interfaces are in `src/lib/types.ts`, including `ParseResult` (the Claude extraction schema). `OpenQuestion.status` is `'open' | 'answered' | 'dropped'`.

## Known Gotchas

**Markdown fence stripping.** Claude occasionally wraps JSON responses in ` ```json ` fences despite being instructed not to. `/api/parse/route.ts` strips them before `JSON.parse`. Don't remove that step.

**Meeting detail questions query.** `open_questions` are linked to meetings via `parsed_items`, not directly. The meeting detail page fetches `parsed_items` rows with `item_type = 'open_question'` first, extracts the `linked_record_id` values, then queries `open_questions` with `.in('id', questionIds)`. A subquery passed directly to `.eq()` silently returns nothing in Supabase JS.

**Schema migrations.** `supabase/schema.sql` includes numbered migrations at the bottom. Migrations 001-006 are documented there. If standing up a fresh instance, run the full file top to bottom. If the live DB already has the base tables, only the migration blocks need to be run. Migration 006 is idempotent (uses `add column if not exists` and `drop constraint if exists`).

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
