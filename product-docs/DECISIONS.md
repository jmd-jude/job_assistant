# Key Product & Design Decisions

**Decision:** Single-user, no multi-tenancy
**Why:** The product is built for one specific person's working style and data model. Multi-user support would require sharing models, permission hierarchies, and collaborative workflows that are out of scope and would add significant complexity. RLS is implemented with a simple "authenticated user sees all rows" policy.
**Tradeoff:** Can't be shared with teammates or used as a team tool without a significant rework of the data and permission layer.

---

**Decision:** Claude extracts structure from raw text; user writes naturally
**Why:** Requiring structured input (filling out forms per meeting) would kill the capture habit. The value is in writing as fast as you would in a notes app and getting structure automatically.
**Tradeoff:** Extraction quality is only as good as the notes. Ambiguous or implicit information doesn't extract reliably. There's no way to correct Claude's output without going into the database directly.

---

**Decision:** Ask uses vector similarity search; Week Recap and Prep Me use direct table queries
**Why:** Ask is designed for open-ended, semantically varied questions across all history. Vector retrieval ensures the right records surface regardless of age. Recap and Prep Me have well-defined, time-bounded or person-bounded scopes that don't need semantic matching.
**Tradeoff:** Ask scales well as history grows. Recap and Prep Me don't — as data volume increases, older records fall out of their fixed context windows.

---

**Decision:** Claude for extraction and generation, OpenAI for embeddings
**Why:** Claude's instruction-following and reasoning quality was the right fit for extraction and synthesis. OpenAI's `text-embedding-3-small` was already an established, cost-effective choice for semantic search at this scale.
**Tradeoff:** Two API dependencies instead of one. If Claude adds a first-party embedding API, this split could be collapsed.

---

**Decision:** No auto-save for weekly recaps; save is user-initiated
**Why:** Not every week warrants a saved recap. Auto-saving would create noise in the recaps archive. The user decides which weekly snapshots are worth keeping.
**Tradeoff:** If the user forgets to save, the recap is lost when they navigate away.

---

**Decision:** Conversational Ask persists turns in the database, not just client state
**Why:** DB persistence means the infrastructure is there for browsing past conversations when that feature is built. Session state would have been simpler but would foreclose that option.
**Tradeoff:** Slightly more infrastructure than a pure client-side approach. The conversation history browser is not yet built, so the DB is being written to but not fully utilized.

---

**Decision:** Saved recaps are indexed via `parsed_items` (dual-write) rather than a separate RPC
**Why:** Reuses the existing `match_parsed_items` RPC for vector search without adding a new query path. Recap content becomes queryable via Ask with zero changes to the query route.
**Tradeoff:** `parsed_items` is no longer a pure "extracted from a meeting" table — it now also contains recap references. The `item_type` constraint had to be relaxed to allow `'recap'`.

---

**Decision:** No box-shadow; elevation via background color layering only
**Why:** The Lanterne Rouge design system achieves depth through the parchment/white/parchment color stack rather than shadows. Shadows read as generic UI; the color approach reads as considered.
**Tradeoff:** Less flexible for surfaces that don't fit the three-layer model. Requires discipline to maintain consistently.

---

**Decision:** Observations don't age off the database; 7-day window is a query filter
**Why:** The data is still there and should be queryable via Ask. Deletion would be irreversible and would break the "knowledge base that compounds over time" premise.
**Tradeoff:** The `wins_and_observations` table grows unbounded. At current capture volumes this is not a problem.

---

**Decision:** People matching is name-string, case-insensitive `ilike`
**Why:** Simple and good enough for a single-user context where the user controls what names they write. More sophisticated entity resolution (fuzzy matching, manual merge UI) was explicitly deferred.
**Tradeoff:** Inconsistent naming creates duplicate people records. No merge UI exists; cleanup requires going into Supabase directly.
