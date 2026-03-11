-- Run this in your Supabase SQL Editor to create the messaging tables.

-- App members: coach (owner), parents, players
CREATE TABLE IF NOT EXISTS app_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('owner', 'parent', 'player')) DEFAULT 'player',
  invite_token text UNIQUE,
  invite_status text NOT NULL CHECK (invite_status IN ('pending', 'accepted')) DEFAULT 'pending',
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_members_user_id ON app_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_members_invite_token ON app_members(invite_token);

-- Conversations (1:1 between two members)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id_1 uuid NOT NULL REFERENCES app_members(id) ON DELETE CASCADE,
  member_id_2 uuid NOT NULL REFERENCES app_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id_1, member_id_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_member1 ON conversations(member_id_1);
CREATE INDEX IF NOT EXISTS idx_conversations_member2 ON conversations(member_id_2);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES app_members(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Enable realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS Policies (enable RLS first)
ALTER TABLE app_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- app_members: anyone authenticated can read accepted members
CREATE POLICY "Authenticated users can read accepted members"
  ON app_members FOR SELECT
  TO authenticated
  USING (invite_status = 'accepted');

-- app_members: owner can read all (including pending)
CREATE POLICY "Owner can read all members"
  ON app_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_members owner
      WHERE owner.user_id = auth.uid() AND owner.role = 'owner'
    )
  );

-- app_members: owner can insert/update/delete
CREATE POLICY "Owner can manage members"
  ON app_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_members owner
      WHERE owner.user_id = auth.uid() AND owner.role = 'owner'
    )
  );

-- app_members: user can read/update own row
CREATE POLICY "Users can read own member row"
  ON app_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own member row"
  ON app_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- conversations: participants can read
CREATE POLICY "Participants can read conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_members m
      WHERE m.user_id = auth.uid()
        AND (m.id = member_id_1 OR m.id = member_id_2)
    )
  );

-- conversations: authenticated can insert
CREATE POLICY "Authenticated can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_members m
      WHERE m.user_id = auth.uid()
        AND (m.id = member_id_1 OR m.id = member_id_2)
    )
  );

-- messages: participants can read
CREATE POLICY "Participants can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN app_members m ON m.user_id = auth.uid()
      WHERE c.id = conversation_id
        AND (m.id = c.member_id_1 OR m.id = c.member_id_2)
    )
  );

-- messages: participants can insert
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN app_members m ON m.user_id = auth.uid()
      WHERE c.id = conversation_id
        AND (m.id = c.member_id_1 OR m.id = c.member_id_2)
        AND m.id = sender_id
    )
  );
