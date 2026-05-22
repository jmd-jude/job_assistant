# Workplace Assistant: Operator Guide

This is a personal work assistant built for one user: you. The premise is simple. You talk to it by dumping raw notes after a meeting or interaction, and it converts that unstructured text into structured data that gets stored, surfaced on a dashboard, and made queryable. The app handles storage, routing, and display. Claude handles extraction, synthesis, and answering questions.

The split matters. The app doesn't summarize or interpret on its own. It shows you exactly what Claude pulled out of your notes, organized into categories. Claude doesn't have opinions about what's important unless you ask. The goal is low-friction capture with high-fidelity retrieval.

---

## Dashboard (Morning Review)

The dashboard is the first thing you see after login. It's a daily briefing view built around three active categories: your open action items, things you're waiting on from others, and open questions. Below those, if anything was captured in the last 7 days, you'll also see wins, intelligence, and observations.

**My open items** and **Waiting on others** are both drawn from the same `action_items` table, split by `owner_type`. Items assigned to you show up in the first section. Items assigned to someone else show up in the second, with the person's name visible. Both sections sort by due date ascending, with undated items pushed to the bottom.

An item stays on the dashboard until you act on it. You can mark it Done or Drop it. Done means it happened. Drop means you're deliberately clearing it without it being complete. Both remove it from the dashboard by setting `status` to either `done` or `dropped`. There's no automatic aging off. An action item from six months ago will still show up if you never resolved it.

**Open questions** work the same way. They persist until you hit "Answered." They sort by creation date ascending, oldest first, so the questions you've been sitting on longest float to the top.

The wins/intelligence/observations sections only show the last 7 days and disappear entirely if there's nothing in that window. These aren't actionable, so there's no interaction on them.

---

## Capture

Capture is the main input surface. You get a date field (defaults to today), an optional title, and a large textarea. Fill in the textarea with whatever happened. The title field is genuinely optional: if you leave it blank, Claude will infer a title from your notes and it'll show up in the meeting log.

After you hit "Parse and save," the app sends your raw text to Claude, waits for structured JSON back, writes everything to the database in sequence, and then shows you a confirmation screen listing what was extracted: people, decisions, action items, open questions, observations. If the parse failed or Claude returned something that couldn't be interpreted as JSON, you'll see an error and the raw text.

The confirmation screen is read-only. There's no editing step. If Claude got something wrong, you'd need to go fix it directly in the database (or just re-capture with more explicit notes).

**How to write good notes for this.** The extraction quality is directly proportional to how explicit you are. Claude isn't inferring from subtext; it's pattern-matching against clear signals.

For action items: say who owns it. "Marcus will send the updated deck by Friday" is parseable. "We should probably revisit this" is not. If you don't name an owner, Claude will assume it's yours. If there's a real due date, state it in terms Claude can recognize as a date ("Friday," "June 3rd," "by EOW"). Vague urgency words like "soon" or "ASAP" get ignored by design.

For open questions: explicitly flag them as open. "I still don't know who owns the API migration" or "unclear: does this need legal sign-off?" Claude is instructed not to infer questions from subtext or observations. If you didn't directly state something as unresolved, it won't show up as an open question.

For intelligence: this is the high-value category for organizational context you want to remember. "David and Priya seem misaligned on the roadmap prioritization" or "the platform team is currently blocked on infra, not feature work." Claude will categorize something as `intelligence` if it reads as political or organizational insight.

For wins: anything you want to remember as a positive outcome. "The pilot got approved," "Stakeholder X finally came around." These surface on the dashboard for 7 days.

For people: anyone you mention by name gets extracted. The app does a case-insensitive match against existing people in the database before creating a new record, so "Marcus" and "marcus" resolve to the same person. If the same person appears multiple times across meetings, their record is reused.

---

## Ask

The Ask tab has three modes: Ask, Week recap, and Prep me.

**Ask** is a freeform question against all your data. It's designed for specific lookups: "What do I still owe Marcus?" "What did we decide about the pricing model?" "What's still open from last Tuesday?" The answer is rendered as markdown so it can use structure when that's useful.

Under the hood, Ask uses vector similarity search rather than pulling a fixed slice of recent records. Your question gets embedded, and the 15 most semantically similar records from your knowledge base are retrieved and sent to Claude -- regardless of when they were captured. This means older records are just as accessible as recent ones, and the context Claude receives is relevant rather than just recent. The quality of an answer depends on whether you've captured anything related to the question, not on how recently you captured it.

**Week recap** takes no input. It pulls everything from the last 7 days (same 7-day cutoff as the dashboard) and asks Claude to synthesize it into 3-5 short paragraphs: who you talked to, what moved forward, what's stuck, and 1-2 things worth thinking about. Use this on Fridays or before a skip-level when you want a coherent narrative of the week rather than a list of items.

**Prep me** takes a name or meeting description. Give it "1:1 with David" or "Priya Nair" or "the platform roadmap review" and it produces a tight pre-brief: relevant history, open items with these people, and a couple things to keep in mind. If it detects a known person's name in your input (matched against your people records), it pulls their full history across all time: every action item they own, every open question linked to them, plus all meetings and decisions without a date cap. If no name matches, it falls back to a broad unfiltered snapshot. The quality of the output depends on how much you've captured about the relevant people. If you've never written anything about someone, there's nothing to brief you on.

---

## The AI Prompts

### Parse prompt

This is the system prompt sent every time you submit notes in Capture:

```
You are a personal work assistant helping a product strategy manager at a large company capture and organize information from their day.

The user will give you raw, unstructured notes from a meeting or interaction. Extract the following into a JSON object with these keys:

- people: array of {name, title, org_team} — anyone mentioned by name
- decisions: array of {title, context, outcome, alternatives_considered}
- action_items: array of {description, owner_type ("me" or "other"), owner_name (if other), due_date (ISO 8601 date if an explicit date or day was stated, otherwise null — do not infer dates from vague terms like "soon" or "EOW")}
- open_questions: array of {question, context, related_person_name (name of person the question is about, if applicable, else null)} — only include questions the user explicitly flagged as unresolved or uncertain. Do not infer questions from subtext, observations, or things the user didn't directly state as open.
- observations: array of {content, type} — type is one of: "win" (a positive outcome or accomplishment), "intelligence" (political or organizational insight worth remembering), or "observation" (anything else notable)
- suggested_meeting_title: string — infer a short title if none was provided

Return only valid JSON. No preamble, no explanation, no markdown fences.
```

Your notes are passed directly as the user message, unmodified.

What to tune here: if you're finding Claude over-extracts open questions (things you mentioned in passing are showing up as open), the instruction "only include questions the user explicitly flagged as unresolved" can be made more restrictive. If you want more aggressive intelligence tagging, you could expand the definition of `intelligence` in the observations type description. The `EOW` carve-out in due_date parsing is intentional: it was deliberately excluded from date inference because EOW is ambiguous across time zones and workweeks.

### Query prompt

This is the system prompt for the Ask (freeform) mode:

```
You are a personal work assistant for a product strategy manager. Answer questions about their work based on the data provided. Be direct and specific. Use plain language. Reference specific names, dates, and details from the data. If something isn't in the data, say so plainly.
```

The retrieved records (up to 15, selected by vector similarity) are passed as the user message along with your question. Claude only sees what's relevant to what you asked, not your entire database.

This prompt is intentionally minimal. It has one behavioral constraint (say so if you don't know) and one stylistic one (be specific). If you want Claude to change how it answers questions, this is the place to tune.

### Synthesize prompts

Week recap:

```
You are a personal work assistant for a product strategy manager who is new to a large company. Write a concise weekly synthesis based on their captured data. Cover: who they talked to, what moved forward, what's still stuck, and 1-2 things they should be thinking about. Be direct and specific. Use their actual names and details. 3-5 short paragraphs, no headers.
```

Prep me:

```
You are a personal work assistant for a product strategy manager who is new to a large company. Given context about a person or meeting they are about to enter, produce a tight pre-brief: who is involved, what's the relevant history, what open items or questions exist with these people, and 1-2 things they should keep in mind. Be specific. No filler.
```

Weekly recap receives a 7-day data snapshot. Prep me receives a broader, person-aware context (see the Prep me section above). The "new to a large company" framing in both prompts is intentional: it tells Claude to treat organizational context and political signals as genuinely useful information rather than noise.

---

## Schema in Plain English

**people** is a contact record. Name, title, org team, a notes field you can use for anything, a rapport score (1-5, unused by the UI currently), and a last interaction date that gets updated automatically every time you capture notes mentioning that person. When you capture notes, anyone you mention by name either gets a new record here or resolves to an existing one via case-insensitive name match.

**meetings** is one row per capture session. It stores the raw notes you typed, the date, the title, and an array of `attendee_ids` referencing people records. Every capture creates one meeting.

**action_items** is every action extracted from any meeting. `owner_type` is `me` or `other`. If it's `other`, `owner_person_id` links to a people record. `status` is `open`, `done`, or `dropped`. `related_meeting_id` links back to the meeting it came from.

**open_questions** is every question you flagged as unresolved. `status` is `open` or `answered`. `related_person_id` optionally links to someone the question is about. `answered_at` is set when you mark it answered.

**decisions** is every decision extracted from a meeting. It stores the title, the context around it, the outcome, and any alternatives considered. Linked to the meeting it came from.

**wins_and_observations** is wins, intelligence observations, and general observations from your notes. `type` distinguishes between them. Date is the meeting date, not the created_at timestamp. This table has a 7-day window on both the dashboard and the synthesize routes.

**parsed_items** is a log of everything extracted from each meeting. It stores the type, the raw content string, and a `linked_record_id` pointing at the actual record in whichever table it ended up in (decisions, action_items, etc.). This is what powers the meeting detail view, letting you see exactly what came out of any given capture.

**relationships** and **projects** tables exist in the schema but have no UI surfaces yet. They're placeholders for future features.

---

## Known Limitations

**Editing is partial.** Action items on the dashboard have an inline Edit button for description and due date. Open questions can be deleted with the × button. But there's no way to edit decisions, observations, or the meeting title after the fact. Duplicate people records still require manual cleanup in the Supabase dashboard.

**People matching is name-only and case-insensitive.** "Marcus Chen" and "Marcus" are two different people if the name strings don't match exactly. If you refer to the same person inconsistently across notes, you'll end up with duplicate records.

**Ask uses semantic retrieval; Week Recap and Prep Me don't.** The Ask route uses vector similarity search to find the most relevant records for your question, so it scales well as your history grows. Week Recap and Prep Me still use time-bounded queries (7-day window and fixed record limits respectively). For those modes, if your history is large, older records may fall out of context.

**Observations and wins don't age off the database.** The 7-day window on the dashboard and synthesize routes is a query filter, not a deletion. Everything is still in the database; it just stops appearing in those views after a week. If you want to surface older observations through Ask, they're accessible there (within the 20-record cap for that table).

**No mobile notification or push.** The app is mobile-first by design, but it's a web app you have to open. Nothing will remind you to capture notes or alert you when something goes overdue.

**Due date display is timezone-naive.** The app renders ISO date strings by appending `T00:00:00` before calling `toLocaleDateString`. This prevents off-by-one date display errors from UTC conversion, but it also means due dates don't carry time information.

**The intel archive is at `/intel`, not in the nav.** Wins, intelligence, and observations that are older than 7 days fall off the dashboard but are all still accessible at `/intel` with filter tabs. The dashboard sections show a "View all" link when there are items in the current window.
