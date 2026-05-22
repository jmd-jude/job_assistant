# Workplace Assistant

A mobile-first personal work assistant for a product strategy manager. Captures raw meeting notes, extracts structured data via Claude, and surfaces action items, decisions, open questions, and intelligence through a daily dashboard.

## What it does

Paste or dictate notes from a meeting. Claude parses them into structured records: people, decisions, action items, open questions, and observations (wins, intelligence, notable observations). Everything lands in Supabase and is immediately queryable through the dashboard or the freeform Ask interface.

The dashboard ("Morning Review") shows open action items split by owner, open questions, and a rolling 7-day window of wins and intelligence. Items link back to their source meeting so you can follow the thread.

## Stack

- **Next.js 15** (App Router, server components, server actions)
- **Supabase** (Postgres + Auth + RLS)
- **Anthropic Claude** (`claude-sonnet-4-6`) for parsing and querying
- **Tailwind CSS** with the Lanterne Rouge design system

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with:
   ```
   ANTHROPIC_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

3. Run the schema against your Supabase instance. Open the SQL editor and run `supabase/schema.sql` top to bottom. The file includes both the base table definitions and subsequent migrations — run the whole thing on a fresh database, or just the `ALTER TABLE` blocks at the bottom if the base tables already exist.

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Pages

| Route | Purpose |
|---|---|
| `/` | Morning Review dashboard |
| `/capture` | Paste raw notes, trigger parse |
| `/meetings` | Meeting log |
| `/meetings/[id]` | Meeting detail with extracted items |
| `/people` | Contact list |
| `/people/[id]` | Person detail with associated meetings and action items |
| `/query` | Freeform question against all data |

## API routes

- `POST /api/parse` — takes raw notes, calls Claude to extract structured JSON, writes to Supabase
- `POST /api/query` — serializes up to 50 records from each table, asks Claude a freeform question
- `POST /api/synthesize` — two modes: `weekly` (7-day summary) and `prep` (pre-meeting brief for a person or meeting)

## Design system

The UI follows the Lanterne Rouge design system (`DESIGN.md`). Key rules:

- `0.5px` borders via `.lr-border` / `.lr-border-med` utility classes
- Palette tokens as CSS custom properties: `bg-lr-ink`, `bg-lr-parchment`, `bg-lr-white`, `text-lr-stone`, `text-lr-red`, etc.
- Georgia serif (`font-serif`) for `h1` headlines only
- No `box-shadow` — elevation through background color layering
- Red exclusively for interaction states
- `.label-caps` for all section title labels

Dark mode is supported via `[data-theme="dark"]` on `<html>`, toggled by `ThemeToggle` and persisted to `localStorage`.

## Commands

```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```
