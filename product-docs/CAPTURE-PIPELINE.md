# Capture Pipeline

How information gets into the system — two paths, different levels of processing.

---

## Meeting Notes

Full extraction. Claude reads your raw notes and pulls out structured records.

```
You paste raw meeting notes
(+ optional title and date)
        |
        v
  POST /api/parse
        |
        v
  Claude (claude-sonnet-4-6)
  reads the full notes block
  extracts structured JSON:
  - people (name, title, org)
  - decisions (title, context, outcome)
  - action items (description, owner, due date)
  - open questions (question, context)
  - observations (content, type)
  - suggested meeting title
        |
        v
  JSON written to Supabase
  one record per extracted item,
  each to its own table:
  meetings / people / decisions /
  action_items / open_questions /
  wins_and_observations
        |
        +-- raw_notes and raw_parse
        |   also saved on meetings row
        |   (audit trail, future reparse)
        |
        v
  Each item also written to
  parsed_items as a flat row
  with item_type + content +
  linked_record_id
        |
        v
  OpenAI Embeddings
  text-embedding-3-small
  embeds each parsed_items row
  (meeting title prepended for context)
  vector stored on the row
        |
        v
  Record is now searchable via Ask
```

### What the extraction prompt does

Claude is given a system prompt that defines the exact JSON schema to return. It's instructed to extract only what's explicitly stated — not to infer action items from subtext, not to guess dates from vague language like "soon" or "EOW." The prompt also classifies observations into three types: `win`, `intelligence`, or `observation`.

People are upserted by name (case-insensitive match) so the same person across multiple meetings resolves to one record, not many.

---

## Quick Notes

No extraction. Raw text stored and embedded directly.

```
You type a freeform note
        |
        v
  POST /api/notes
        |
        v
  Content written to notes table
  as-is, no processing
        |
        v
  Written to parsed_items
  item_type = 'note'
  content truncated to 2000 chars
  linked_record_id = notes.id
  meeting_id = null
        |
        v
  OpenAI Embeddings
  text-embedding-3-small
  embeds the raw content
  vector stored on parsed_items row
        |
        v
  Note is now searchable via Ask
```

---

## How the two paths compare

```
                  Meeting Notes        Quick Note
                  -------------        ----------
Input             Block of prose       One thought
Processing        Claude extraction    None
Records created   5-6 tables          notes only
Structured data   Yes                 No
Searchable        Yes                 Yes
Time to write     Post-meeting        Anytime
```

---

## The parsed_items table

Both paths converge here. Every piece of information in the system — regardless of where it came from — has a row in `parsed_items` with an embedding. This is the single surface the Ask pipeline searches. It's what makes the vector search work without needing to know which table a record lives in.

```
parsed_items row
  id
  item_type       (decision | action_item | open_question |
                   observation | recap | note)
  content         (the searchable text)
  embedding       (1536-dimension vector)
  meeting_id      (null for notes and recaps)
  linked_record_id (points back to the source record)
```

When Ask retrieves a row, `linked_record_id` is used to join back to the full source record for richer context in the Claude prompt.
