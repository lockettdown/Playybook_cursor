-- ============================================================================
-- Per-User Data Isolation Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ─── 0. Clean slate (recommended for dev) ───────────────────────────────────
-- Remove all existing data so every user starts fresh after migration.
-- Comment this out and use the UPDATE approach below if you want to keep data.

TRUNCATE teams, players, games, game_rosters, game_events,
         player_game_stats, team_messages, app_members, team_events CASCADE;

-- Alternative: assign existing rows to a specific user (replace the UUID)
-- UPDATE teams             SET user_id = '<your-auth-user-uuid>';
-- UPDATE players           SET user_id = '<your-auth-user-uuid>';
-- UPDATE games             SET user_id = '<your-auth-user-uuid>';
-- UPDATE game_rosters      SET user_id = '<your-auth-user-uuid>';
-- UPDATE game_events       SET user_id = '<your-auth-user-uuid>';
-- UPDATE player_game_stats SET user_id = '<your-auth-user-uuid>';
-- UPDATE team_messages     SET user_id = '<your-auth-user-uuid>';
-- UPDATE app_members       SET owner_id = '<your-auth-user-uuid>';
-- UPDATE team_events       SET user_id = '<your-auth-user-uuid>';

-- ─── 1. Add user_id columns ────────────────────────────────────────────────

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE game_rosters
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE game_events
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE player_game_stats
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE team_messages
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE app_members
  ADD COLUMN IF NOT EXISTS owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- ─── 2. Create indexes on user_id ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_teams_user_id             ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id           ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id             ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rosters_user_id      ON game_rosters(user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_user_id       ON game_events(user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_user_id ON player_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_user_id     ON team_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_app_members_owner_id      ON app_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_events_user_id       ON team_events(user_id);

-- ─── 3. Enable RLS on all tables ───────────────────────────────────────────

ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rosters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_events       ENABLE ROW LEVEL SECURITY;

-- ─── 4. Drop any conflicting policies (idempotent) ─────────────────────────

DROP POLICY IF EXISTS "Allow all for anon on game_events" ON game_events;
DROP POLICY IF EXISTS "Allow all for anon on game_rosters" ON game_rosters;
DROP POLICY IF EXISTS "Allow all for anon on games" ON games;
DROP POLICY IF EXISTS "Allow all for anon on player_game_stats" ON player_game_stats;
DROP POLICY IF EXISTS "Allow all for anon on players" ON players;
DROP POLICY IF EXISTS "Allow all for anon on teams" ON teams;

DO $$ DECLARE
  _tbl  text;
  _pol  text;
BEGIN
  FOR _tbl, _pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'teams','players','games','game_rosters',
        'game_events','player_game_stats','team_messages','app_members',
        'team_events'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', _pol, _tbl);
  END LOOP;
END $$;

-- ─── 5. Create RLS policies ────────────────────────────────────────────────

-- teams
CREATE POLICY "users_select_own_teams"
  ON teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_teams"
  ON teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_teams"
  ON teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_teams"
  ON teams FOR DELETE USING (auth.uid() = user_id);

-- players
CREATE POLICY "users_select_own_players"
  ON players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_players"
  ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_players"
  ON players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_players"
  ON players FOR DELETE USING (auth.uid() = user_id);

-- games
CREATE POLICY "users_select_own_games"
  ON games FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_games"
  ON games FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_games"
  ON games FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_games"
  ON games FOR DELETE USING (auth.uid() = user_id);

-- game_rosters
CREATE POLICY "users_select_own_game_rosters"
  ON game_rosters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_game_rosters"
  ON game_rosters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_game_rosters"
  ON game_rosters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_game_rosters"
  ON game_rosters FOR DELETE USING (auth.uid() = user_id);

-- game_events
CREATE POLICY "users_select_own_game_events"
  ON game_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_game_events"
  ON game_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_game_events"
  ON game_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_game_events"
  ON game_events FOR DELETE USING (auth.uid() = user_id);

-- player_game_stats
CREATE POLICY "users_select_own_player_game_stats"
  ON player_game_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_player_game_stats"
  ON player_game_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_player_game_stats"
  ON player_game_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_player_game_stats"
  ON player_game_stats FOR DELETE USING (auth.uid() = user_id);

-- team_messages
CREATE POLICY "users_select_own_team_messages"
  ON team_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_team_messages"
  ON team_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_team_messages"
  ON team_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_team_messages"
  ON team_messages FOR DELETE USING (auth.uid() = user_id);

-- app_members: owner manages roster; invited user can see own row
CREATE POLICY "members_select"
  ON app_members FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = user_id);
CREATE POLICY "members_insert"
  ON app_members FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "members_update"
  ON app_members FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = user_id);
CREATE POLICY "members_delete"
  ON app_members FOR DELETE USING (auth.uid() = owner_id);

-- team_events
CREATE POLICY "users_select_own_team_events"
  ON team_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_team_events"
  ON team_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_team_events"
  ON team_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_team_events"
  ON team_events FOR DELETE USING (auth.uid() = user_id);
