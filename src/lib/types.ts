export interface Person {
  id: string
  name: string
  title: string | null
  org_team: string | null
  notes: string | null
  rapport: number | null
  last_interaction_date: string | null
  created_at: string
}

export interface Meeting {
  id: string
  title: string | null
  date: string
  attendee_ids: string[] | null
  raw_notes: string | null
  created_at: string
}

export interface ActionItem {
  id: string
  description: string
  owner_type: 'me' | 'other'
  owner_person_id: string | null
  due_date: string | null
  status: 'open' | 'done' | 'dropped'
  related_meeting_id: string | null
  created_at: string
  people?: Person
}

export interface OpenQuestion {
  id: string
  question: string
  context: string | null
  status: 'open' | 'answered'
  answered_at: string | null
  created_at: string
}

export interface Decision {
  id: string
  title: string
  context: string | null
  outcome: string | null
  alternatives_considered: string | null
  meeting_id: string | null
  created_at: string
}

export interface WinObservation {
  id: string
  content: string
  date: string
  created_at: string
}

export interface ParsedItems {
  id: string
  meeting_id: string | null
  item_type: 'decision' | 'action_item' | 'observation' | 'open_question'
  content: string
  linked_record_id: string | null
  created_at: string
}

export interface ParseResult {
  people: { name: string; title?: string; org_team?: string }[]
  decisions: { title: string; context?: string; outcome?: string; alternatives_considered?: string }[]
  action_items: { description: string; owner_type: 'me' | 'other'; owner_name?: string; due_date?: string | null }[]
  open_questions: { question: string; context?: string }[]
  observations: { content: string }[]
  suggested_meeting_title: string
}
