-- ─── Team Events ──────────────────────────────────────────────────────────────
create table if not exists team_events (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid default auth.uid() references auth.users(id),
  title      text not null,
  date       text not null default '',
  time       text not null default '',
  type       text not null default 'practice',
  location   text not null default '',
  opponent   text not null default '',
  notes      text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table team_events add column if not exists user_id uuid default auth.uid() references auth.users(id);

-- ─── Enable RLS ──────────────────────────────────────────────────────────────
alter table team_events enable row level security;

create policy "users_select_own_team_events"
  on team_events for select using (auth.uid() = user_id);
create policy "users_insert_own_team_events"
  on team_events for insert with check (auth.uid() = user_id);
create policy "users_update_own_team_events"
  on team_events for update using (auth.uid() = user_id);
create policy "users_delete_own_team_events"
  on team_events for delete using (auth.uid() = user_id);
