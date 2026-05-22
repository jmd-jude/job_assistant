# Features & Capabilities

## Core Features

### Capture and Parse
Paste raw meeting notes (or any unstructured text about a work interaction) and Claude extracts structured records: people mentioned, decisions made, action items assigned, open questions flagged, and observations worth remembering (wins, organizational intelligence, general observations). A meeting record is created automatically. All output is written to Supabase and immediately queryable.

The extraction quality scales with note explicitness. The system is designed for the user to write naturally, not to fill in structured fields.

### Morning Review Dashboard
The default view after login. Shows open action items split into two sections: "My open items" (owner = me) and "Waiting on others" (owner = someone else, with their name). Both sort by due date ascending, overdue items turn red, undated items go to the bottom. Open questions are shown below, sorted oldest first. Wins and intelligence from the last 7 days appear at the bottom.

Items persist until explicitly resolved. Marking Done or Drop both clear the item from the dashboard. There is no automatic aging-off.

### Conversational Ask
Freeform question-answering against the full knowledge base. Uses vector similarity search (OpenAI embeddings) to retrieve the 15 most semantically relevant records regardless of age, then asks Claude to answer based on that context. Supports multi-turn conversation within a session — prior turns are preserved so questions can build on each other. Starting a new conversation resets the thread.

### Week Recap
Generates a 3-5 paragraph synthesis of the last 7 days: who you talked to, what moved forward, what's stuck, and a couple things worth thinking about. Takes no input — just pulls the 7-day window of data. Output can be saved as a persistent recap artifact, which then becomes queryable via Ask.

### Prep Me
Pre-meeting brief for a named person or meeting. Detects known person names from your contact records; if matched, pulls full history (all action items, open questions, meetings, decisions linked to that person) with no date cap. Falls back to a broader unfiltered snapshot if no match is found.

### Intel Archive
All wins, organizational intelligence, and observations across all time, filterable by type. The dashboard shows only the last 7 days; the intel archive at `/intel` shows everything with filter tabs for Wins / Intelligence / Observations.

### Saved Recaps
Weekly recaps can be saved and browsed at `/recaps`. Each saved recap is also embedded and indexed so Ask can surface it. Enables time-spanning questions like "what was I focused on in early May" once several recaps have accumulated.

### Meetings Log
Chronological list of all captured meetings with a detail view per meeting showing extracted items (decisions, action items, open questions, observations) and attendees.

### People Directory
List of everyone mentioned in captured notes. Person detail shows associated meetings, action items, and open questions. People are matched case-insensitively by name at capture time — the same name across multiple meetings resolves to one record.

---

## Out of Scope

- Team use: no multi-user support, no shared views, no permissions model
- Integrations with calendars, Slack, or email (forward/paste is the only capture mechanism currently)
- Push notifications or reminders
- Real-time collaboration or commenting
- Mobile native app (mobile-first web)
- Editing extracted records other than action items (description and due date) and deleting open questions

---

## Known Limitations

**Editing is partial.** Action items have an inline edit for description and due date. Open questions can be deleted. Decisions, observations, and meeting titles have no edit UI after capture. Fixing a bad extraction requires going into Supabase directly or recapturing.

**People matching is name-string only.** "Marcus Chen" and "Marcus" are two different people if the strings don't match. Inconsistent naming across notes creates duplicate contact records with no merge UI.

**Week Recap and Prep Me don't scale with history.** Ask uses vector retrieval and scales well. Recap and Prep Me use time-bounded or fixed-count queries; as history grows, older records may fall out of their context windows.

**No post-capture feedback on Done/Drop.** Marking an action item done removes it from the dashboard immediately with no toast or confirmation. *(Known issue, backlogged.)*

**No decisions surface on the dashboard.** Decisions are stored but only accessible through Ask or buried in the meeting detail view. *(Backlogged as Decisions Log.)*

**Relationship and project tables exist but have no UI.** The `relationships` and `projects` tables are in the schema but are placeholder stubs with no surfaces in the product yet.
