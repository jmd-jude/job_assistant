# PRD: Personal Work Assistant — Day 1 System
**Owner:** Jude  
**Target:** Claude Code implementation  
**Backend:** Supabase (existing account)  
**Status:** Ready to build

---

## What this is

A personal intelligence layer for succeeding as a new IC (Product Strategy Manager, Services) at a large company. It captures raw context from your day — people, meetings, decisions, loose ends — and makes it queryable and reviewable. It runs on your personal Mac and is accessed from your phone or personal machine. The Paychex corporate machine never touches it.

The system has two jobs: (1) remember things you don't have time to synthesize in the moment, and (2) surface them back to you when you need them.

---

## What it is not

Not a task manager. Not a wiki. Not a second Notion. Not something you maintain — it maintains itself from your brain dumps.

---

## Core interaction patterns

**Capture (phone, after meetings):** You type a free-form note. No fields to fill. Just whatever you'd say out loud walking back to your desk. The system parses it.

**Morning review (Mac or phone):** A single screen that shows open action items, unanswered open questions, and a log of recent activity. Builds the habit.

**Ad hoc query (Mac or phone):** Plain language. "What decisions were made about X?" "What do I owe Marcus?" "What's still open from last Tuesday?"

---

## Schema

All tables live in Supabase (Postgres). Use UUIDs for all primary keys. All tables include `created_at` timestamp defaulting to `now()`.

### `people`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| title | text | nullable |
| org_team | text | nullable |
| notes | text | free text, evolves over time |
| rapport | int | 1–5 scale, nullable |
| last_interaction_date | date | nullable |

### `relationships`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| person_a_id | uuid FK → people | |
| person_b_id | uuid FK → people | |
| relationship_type | text | `reports_to`, `peers_with`, `works_with` |
| notes | text | nullable |

### `projects`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| description | text | nullable |
| status | text | `active`, `paused`, `closed` |
| owner_person_id | uuid FK → people | nullable |

### `meetings`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| title | text | nullable — inferred from notes if blank |
| date | date | |
| attendee_ids | uuid[] | array of person IDs |
| raw_notes | text | your unedited brain dump |

### `parsed_items`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| meeting_id | uuid FK → meetings | nullable — can exist without a meeting |
| item_type | text | `decision`, `action_item`, `observation`, `open_question` |
| content | text | |
| linked_record_id | uuid | nullable — points to decisions, action_items, etc. |

### `decisions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| context | text | |
| outcome | text | |
| alternatives_considered | text | nullable |
| meeting_id | uuid FK → meetings | nullable |

### `action_items`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| description | text | |
| owner_type | text | `me` or `other` |
| owner_person_id | uuid FK → people | nullable — populated if owner_type is `other` |
| due_date | date | nullable |
| status | text | `open`, `done`, `dropped` |
| related_meeting_id | uuid FK → meetings | nullable |

### `wins_and_observations`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| content | text | |
| date | date | |

### `open_questions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| question | text | |
| context | text | nullable |
| status | text | `open`, `answered` |
| answered_at | timestamp | nullable |

---

## Application

### Tech stack
- **Frontend:** React (single page, mobile-responsive)
- **Backend:** Supabase (Postgres + auto-generated REST API)
- **AI parsing:** Anthropic API (`claude-sonnet-4-20250514`) — called server-side
- **Hosting:** Vercel (personal account)
- **Auth:** Supabase Auth, single user (you), email/password is fine

### Views to build

**1. Capture view** (default on mobile)  
A single large text input. Date pre-populated to today. Optional meeting title field. Submit sends raw text to the parse endpoint. Confirmation shows what was extracted.

**2. Dashboard / morning review**  
- Open action items (mine first, then others' commitments to me), sorted by due date
- Open questions, sorted by age
- Recent wins/observations (last 7 days)
- Quick link to today's capture

**3. People view**  
Searchable list. Tap a person to see their notes, rapport, last interaction, any action items linked to them, any decisions they appeared in.

**4. Query view**  
Plain text input. Sends question + relevant DB context to Claude. Returns a plain language answer. Not a chatbot — single turn, no conversation history needed initially.

---

## Division of labor: Claude vs. the app

This distinction should guide every implementation decision. When in doubt, ask: is this a thinking job or a storing/showing job?

**Claude's jobs (Anthropic API calls):**
- Parse raw meeting notes into structured records
- Answer plain language queries against your data ("what do I owe Marcus?", "what decisions were made about pricing?")
- Infer missing context (meeting titles, relationships between people mentioned, whether something is an action item vs. an observation)

**The app's jobs (keep these dumb and fast):**
- Store and retrieve records reliably
- Render the mobile UI for capture and review
- Pass the right data to Claude when a query or parse is triggered
- Keep state between sessions

The app should never try to be clever. Filtering, sorting, displaying — the app. Interpreting, extracting, synthesizing — Claude. This keeps the codebase simple and makes the system easy to iterate on: tune the prompts, not the application logic.

---

## AI parsing — how it works

When you submit a brain dump, the app calls the Anthropic API with:

- A system prompt defining the extraction task
- Your raw notes as the user message
- A strict JSON response schema

The model returns structured JSON. The app writes each extracted item to the appropriate table(s) and creates `parsed_items` records linking everything back to the source `meeting_id`.

### Parsing system prompt (include verbatim)

```
You are a personal work assistant helping a product strategy manager at a large company capture and organize information from their day.

The user will give you raw, unstructured notes from a meeting or interaction. Extract the following into a JSON object with these keys:

- people: array of {name, title, org_team} — anyone mentioned
- decisions: array of {title, context, outcome, alternatives_considered}
- action_items: array of {description, owner_type ("me" or "other"), owner_name (if other), due_date (ISO format if mentioned, else null)}
- open_questions: array of {question, context}
- observations: array of {content} — anything notable that doesn't fit above
- suggested_meeting_title: string — infer a short title if none was provided

Return only valid JSON. No preamble, no explanation, no markdown fences.
```

---

## What Claude Code needs to do

1. Connect to the existing Supabase project (user will provide URL and anon key)
2. Run the schema migrations to create all tables
3. Build the React frontend with the three views above
4. Implement the parse endpoint (can be a Supabase Edge Function or a lightweight API route)
5. Wire the Anthropic API call to the parsing flow
6. Deploy to Vercel

### Environment variables needed
```
SUPABASE_URL
SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

---

## Out of scope for v1

- Graph relationships between people (build when you have enough data to make it useful)
- Vector search / semantic retrieval
- Automated reminders or notifications
- Integrations with Paychex systems (never, on principle)
- Multi-user support

---

## Definition of done

- You can type a raw note on your phone and see structured output in under 10 seconds
- Morning review loads in one tap with no configuration
- Open action items and open questions are always accurate
- The whole thing runs on your personal infrastructure, zero contact with Paychex IT

---

## First thing to do in Claude Code

Open a new project. Paste this PRD. Say: "Build this. Ask me for my Supabase URL, anon key, and Anthropic API key before writing any code."
