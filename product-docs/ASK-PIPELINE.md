# Ask Pipeline

How a question becomes an answer — step by step.

```
You type a question
        |
        v
  OpenAI Embeddings
  text-embedding-3-small
  converts question to a
  vector (1536 numbers)
        |
        v
  Supabase Vector Search
  match_parsed_items RPC
  cosine similarity against
  every embedded record
  returns top 15 matches
        |
        v
  Record Enrichment
  joins parsed_items rows
  back to source records:
  full decisions, action items,
  meetings, notes, recaps
        |
        v
  Conversation History
  prior turns fetched from
  conversation_turns and
  prepended to message array
        |
        v
  Claude (claude-sonnet-4-6)
  receives: retrieved context
  + conversation history
  + system prompt
  answers only from context —
  no speculation, no fill
        |
        v
  Answer returned to you
  both turns written to
  conversation_turns for
  next question in thread
```

## What gets searched

Every record type is embedded at write time and lives in `parsed_items`:

- Decisions
- Action items
- Open questions
- Observations / wins / intelligence
- Weekly recaps
- Quick notes

The search is semantic, not keyword. "What do I know about the platform team" and "API timeline concerns" will surface the same records if they're semantically related — even if no words overlap.

## Why answers are only as good as your capture

The retrieval ceiling is the quality of what's in the system. Claude is constrained to answer from retrieved context only. A sparse record produces a sparse answer. A well-written note with names, specifics, and your own interpretation produces a rich one.

The flip side: when the answer is thin, that's signal. It means the gap is in the capture, not the model.

## Conversation threading

Each Ask session has a `conversation_id`. Prior turns are fetched and prepended to every new Claude call, so you can drill down, follow a thread, and think out loud without re-establishing context. Starting a new conversation resets the thread.
