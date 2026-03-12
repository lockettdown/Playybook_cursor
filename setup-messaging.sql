-- Run this in your Supabase Dashboard → SQL Editor

-- 1. App members (coaches, parents, players, owner)
CREATE TABLE IF NOT EXISTS app_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'player'
                    CHECK (role IN ('owner', 'coach', 'parent', 'player')),
  invite_token    UUID,
  invite_status   TEXT NOT NULL DEFAULT 'pending'
                    CHECK (invite_status IN ('pending', 'accepted')),
  player_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Group team chat messages
CREATE TABLE IF NOT EXISTS team_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL,
  sender_name  TEXT NOT NULL DEFAULT '',
  sender_role  TEXT NOT NULL DEFAULT 'player',
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Disable RLS (same as other tables in this project)
ALTER TABLE app_members   DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages DISABLE ROW LEVEL SECURITY;

-- 4. Enable realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
