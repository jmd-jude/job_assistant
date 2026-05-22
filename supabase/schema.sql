-- Paychex Assistant Schema
-- Run this in the Supabase SQL editor

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  org_team text,
  notes text,
  rapport int check (rapport between 1 and 5),
  last_interaction_date date,
  created_at timestamptz not null default now()
);

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  person_a_id uuid not null references people(id) on delete cascade,
  person_b_id uuid not null references people(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('reports_to', 'peers_with', 'works_with')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  owner_person_id uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text,
  date date not null,
  attendee_ids uuid[],
  raw_notes text,
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text,
  outcome text,
  alternatives_considered text,
  meeting_id uuid references meetings(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  owner_type text not null check (owner_type in ('me', 'other')),
  owner_person_id uuid references people(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  related_meeting_id uuid references meetings(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists wins_and_observations (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists open_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  context text,
  status text not null default 'open' check (status in ('open', 'answered')),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists parsed_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  item_type text not null check (item_type in ('decision', 'action_item', 'observation', 'open_question')),
  content text not null,
  linked_record_id uuid,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security on all tables
alter table people enable row level security;
alter table relationships enable row level security;
alter table projects enable row level security;
alter table meetings enable row level security;
alter table decisions enable row level security;
alter table action_items enable row level security;
alter table wins_and_observations enable row level security;
alter table open_questions enable row level security;
alter table parsed_items enable row level security;

-- RLS policies: only authenticated user can access their data
create policy "authenticated only" on people for all to authenticated using (true) with check (true);
create policy "authenticated only" on relationships for all to authenticated using (true) with check (true);
create policy "authenticated only" on projects for all to authenticated using (true) with check (true);
create policy "authenticated only" on meetings for all to authenticated using (true) with check (true);
create policy "authenticated only" on decisions for all to authenticated using (true) with check (true);
create policy "authenticated only" on action_items for all to authenticated using (true) with check (true);
create policy "authenticated only" on wins_and_observations for all to authenticated using (true) with check (true);
create policy "authenticated only" on open_questions for all to authenticated using (true) with check (true);
create policy "authenticated only" on parsed_items for all to authenticated using (true) with check (true);

-- Migration 001: observation type + person linking on open questions

alter table wins_and_observations
  add column if not exists type text not null default 'observation'
  check (type in ('win', 'observation', 'intelligence'));

alter table open_questions
  add column if not exists related_person_id uuid references people(id) on delete set null;

-- Migration 002: vector embeddings on parsed_items

create extension if not exists vector;

alter table parsed_items
  add column if not exists embedding vector(1536);

create index if not exists parsed_items_embedding_idx
  on parsed_items
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Migration 003: recaps table + parsed_items recap type

create table if not exists recaps (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  week_ending date not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

alter table recaps enable row level security;
create policy "authenticated only" on recaps for all to authenticated using (true) with check (true);

alter table parsed_items
  drop constraint if exists parsed_items_item_type_check;

alter table parsed_items
  add constraint parsed_items_item_type_check
  check (item_type in ('decision', 'action_item', 'observation', 'open_question', 'recap'));

create or replace function match_parsed_items(
  query_embedding vector(1536),
  match_count int default 15
)
returns table (
  id uuid,
  meeting_id uuid,
  item_type text,
  content text,
  linked_record_id uuid,
  similarity float
)
language sql stable
as $$
  select
    id,
    meeting_id,
    item_type,
    content,
    linked_record_id,
    1 - (embedding <=> query_embedding) as similarity
  from parsed_items
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Migration 004: conversational ask

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('ask', 'prep')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table conversations enable row level security;
alter table conversation_turns enable row level security;

create policy "authenticated only" on conversations for all to authenticated using (true) with check (true);
create policy "authenticated only" on conversation_turns for all to authenticated using (true) with check (true);

