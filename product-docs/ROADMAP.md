# Roadmap

## Immediate (next meaningful release)

**Done/Drop feedback toast** — Marking an action item done removes it silently with no confirmation. A brief toast ("Marked done") is the fix. Low effort, material for building the habit of acting on items. *(Known issue from UX audit; not yet implemented.)*

**Decisions log at `/decisions`** — Decisions are stored but have no dedicated surface. They don't appear on the dashboard and are hard to find outside of Ask or meeting detail views. A `/decisions` page (chronological, filterable, linked to source meeting) would make the record of what's been decided accessible without needing to query for it. Low-medium effort; schema is complete.

**Editable person notes** — The `people.notes` field exists but has no UI. A simple editable textarea on the person detail page would let you build running context on someone outside of meeting captures. Low effort.

---

## Near-term

**Communication tool integrations (forward/paste model)** — The informal layer (Slack threads, email) is where real decisions and commitments live and currently evaporate. The simpler version: let the capture surface accept Slack thread exports or forwarded emails alongside meeting notes. The parse prompt likely handles this without changes; worth testing before building anything new. *(Backlog item.)*

**Relationship mapping UI** — The `relationships` table (person A, person B, relationship type) exists but has no UI. Linking people on the person detail page would feed organizational context into Prep Me and make the knowledge base meaningfully richer over time. Medium effort; schema is complete. *(Backlog item.)*

**Bulk / multi-meeting capture** — A full day of notes across multiple meetings stresses the current single-meeting parse model. A two-pass extraction mode (Claude first segments, then parses each segment) would address this. Worth testing the current parse prompt with a day's notes before assuming a new mode is needed. *(Backlog item.)*

**Accessible nav active states** — `aria-current="page"` is missing from nav items. Low effort. *(UX audit finding.)*

**Link person names in meeting detail to people pages** — Owner names on meeting detail view are plain text, not linked. Schema has the relationship; it just needs to be surfaced. Low effort. *(UX audit finding.)*

---

## Longer-term / Exploratory

**Quarterly synthesis** — Once 8-12 weekly recaps exist, ask Claude to synthesize them into a month or quarter-in-review. One-liner prompt change, no schema work. The infrastructure is already there. *(Backlog item.)*

**Passive Slack capture** — A Slack app that watches specified channels or DMs and surfaces things worth capturing. A different product from forward/paste, more infrastructure, but the parsing pipeline is built. The question is editorial control vs ambient capture for a personal tool. *(Backlog item, explicitly two-phased.)*

**Conversation history browser** — The DB persists conversation turns already. Building a UI to browse and resume past conversations is a natural next step once multi-session use builds up meaningful history.

**Capture with intermediate feedback** — The ~20-second parse with no progress signal reads as frozen on mobile. A pulsing animation or "Calling Claude..." status line would improve perceived responsiveness. *(UX audit finding, marked "Later.")*

---

## Explicitly Deprioritized

**Multi-user support** — Out of scope by design. This is a single-user personal tool.

**Daily recaps** — Low signal-to-noise. The dashboard covers the "right now" view; weekly recaps are the right cadence for narrative synthesis.

**Auto-save for recaps** — Deferred to keep the recaps archive clean and user-controlled.

**Delta detection in recaps** — The snapshot model (each recap is a point-in-time artifact) is simpler and more honest than trying to track what changed since the last recap.

**Editing saved recaps** — Recaps are immutable artifacts. If something's wrong, generate and save a new one.
