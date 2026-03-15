-- ─── Teams ───────────────────────────────────────────────────────────────────
create table if not exists teams (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  wins     integer not null default 0,
  losses   integer not null default 0,
  created_at timestamptz default now()
);

-- ─── Players ─────────────────────────────────────────────────────────────────
create table if not exists players (
  id       uuid primary key default gen_random_uuid(),
  team_id  uuid not null references teams(id) on delete cascade,
  name     text not null,
  number   integer not null default 0,
  position text not null default '',
  created_at timestamptz default now()
);

-- ─── Games ───────────────────────────────────────────────────────────────────
create table if not exists games (
  id              uuid primary key default gen_random_uuid(),
  home_team_id    uuid references teams(id) on delete set null,
  home_team_name  text not null default '',
  away_team_name  text not null default '',
  home_score      integer not null default 0,
  away_score      integer not null default 0,
  status          text not null default 'upcoming',
  quarter         integer not null default 1,
  date            text not null default '',
  time            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Add home_team_id column if it was missing from an older schema
alter table games add column if not exists home_team_id uuid references teams(id) on delete set null;

-- ─── Game Rosters ─────────────────────────────────────────────────────────────
create table if not exists game_rosters (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references games(id) on delete cascade,
  player_id       uuid not null,
  team_side       text not null,  -- 'home' | 'away'
  player_name     text not null,
  player_number   integer not null default 0,
  player_position text not null default '',
  created_at      timestamptz default now()
);

-- ─── Game Events ─────────────────────────────────────────────────────────────
create table if not exists game_events (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  player_id   uuid not null,
  player_name text not null,
  team_side   text not null,
  action      text not null,
  points      integer,
  quarter     integer not null default 1,
  timestamp   text not null default '',
  created_at  timestamptz default now()
);

-- ─── Player Game Stats ────────────────────────────────────────────────────────
create table if not exists player_game_stats (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references games(id) on delete cascade,
  player_id           uuid not null,
  team_side           text not null,  -- 'home' | 'away'
  points              integer not null default 0,
  fg_made             integer not null default 0,
  fg_attempts         integer not null default 0,
  three_made          integer not null default 0,
  three_attempts      integer not null default 0,
  ft_made             integer not null default 0,
  ft_attempts         integer not null default 0,
  rebounds            integer not null default 0,
  offensive_rebounds  integer not null default 0,
  defensive_rebounds  integer not null default 0,
  assists             integer not null default 0,
  steals              integer not null default 0,
  blocks              integer not null default 0,
  turnovers           integer not null default 0,
  fouls               integer not null default 0,
  minutes             integer not null default 0,
  updated_at          timestamptz default now(),
  unique (game_id, player_id)
);

-- Add any columns that may be missing from older player_game_stats schemas
alter table player_game_stats add column if not exists offensive_rebounds integer not null default 0;
alter table player_game_stats add column if not exists defensive_rebounds integer not null default 0;
alter table player_game_stats add column if not exists fg_made            integer not null default 0;
alter table player_game_stats add column if not exists fg_attempts        integer not null default 0;
alter table player_game_stats add column if not exists three_made         integer not null default 0;
alter table player_game_stats add column if not exists three_attempts     integer not null default 0;
alter table player_game_stats add column if not exists ft_made            integer not null default 0;
alter table player_game_stats add column if not exists ft_attempts        integer not null default 0;
alter table player_game_stats add column if not exists rebounds           integer not null default 0;
alter table player_game_stats add column if not exists assists            integer not null default 0;
alter table player_game_stats add column if not exists steals             integer not null default 0;
alter table player_game_stats add column if not exists blocks             integer not null default 0;
alter table player_game_stats add column if not exists turnovers          integer not null default 0;
alter table player_game_stats add column if not exists fouls              integer not null default 0;
alter table player_game_stats add column if not exists minutes            integer not null default 0;

-- ─── Disable RLS (dev) ───────────────────────────────────────────────────────
alter table teams             disable row level security;
alter table players           disable row level security;
alter table games             disable row level security;
alter table game_rosters      disable row level security;
alter table game_events       disable row level security;
alter table player_game_stats disable row level security;
