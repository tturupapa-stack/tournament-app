-- Supabase Schema for Tournament App
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tournaments: 대회 정보
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  game VARCHAR(100) NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 16,
  deadline DATE NOT NULL,
  description TEXT,
  status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- participants: 참가자
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  nickname VARCHAR(20) NOT NULL,
  skill VARCHAR(10) NOT NULL,
  skill_value INTEGER NOT NULL CHECK (skill_value BETWEEN 1 AND 5),
  card_tier VARCHAR(10) DEFAULT '브론즈',
  profile_image_url TEXT,
  card_image_url TEXT,
  is_joker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, LOWER(nickname))
);

-- teams: 팀
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  avg_skill DECIMAL(3,1) NOT NULL,
  has_joker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- team_members: 팀-참가자 관계
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE
);

-- bracket_matches: 대진표
CREATE TABLE IF NOT EXISTS bracket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_order INTEGER NOT NULL,
  team1_name VARCHAR(50) NOT NULL,
  team2_name VARCHAR(50) NOT NULL,
  winner_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_bracket_tournament ON bracket_matches(tournament_id);

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access for tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Public read access for participants"
  ON participants FOR SELECT
  USING (true);

CREATE POLICY "Public read access for teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Public read access for team_members"
  ON team_members FOR SELECT
  USING (true);

CREATE POLICY "Public read access for bracket_matches"
  ON bracket_matches FOR SELECT
  USING (true);

-- Public insert for participants (registration)
CREATE POLICY "Public insert for participants"
  ON participants FOR INSERT
  WITH CHECK (true);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access tournaments"
  ON tournaments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access participants"
  ON participants FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access teams"
  ON teams FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access team_members"
  ON team_members FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access bracket_matches"
  ON bracket_matches FOR ALL
  USING (auth.role() = 'service_role');

-- Anonymous users can also insert/update/delete (using anon key for simplicity)
-- In production, you might want to restrict these more
CREATE POLICY "Anon full access tournaments"
  ON tournaments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon delete access participants"
  ON participants FOR DELETE
  USING (true);

CREATE POLICY "Anon update access participants"
  ON participants FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon full access teams"
  ON teams FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon full access team_members"
  ON team_members FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon full access bracket_matches"
  ON bracket_matches FOR ALL
  USING (true)
  WITH CHECK (true);
