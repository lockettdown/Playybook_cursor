export type PlayType = "offense" | "defense" | "special";
export type DrillCategory = "shooting" | "passing" | "dribbling" | "defense" | "conditioning" | "rebounding" | "footwork";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type PracticeBlockType = "warmup" | "skill" | "team" | "situational" | "cooldown";

export interface PlayerPosition {
  id: string;
  x: number;
  y: number;
  label: string;
  isDefense?: boolean;
}

export interface PlayStep {
  id: string;
  positions: PlayerPosition[];
  arrows: Arrow[];
  description: string;
}

export interface Arrow {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: "pass" | "dribble" | "cut" | "screen";
}

export interface Play {
  id: string;
  name: string;
  type: PlayType;
  tags: string[];
  description: string;
  steps: PlayStep[];
  isFavorite: boolean;
  createdAt: string;
  duration?: string;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  level: SkillLevel;
  tags: string[];
  description: string;
  duration: number;
  coachingCues: string[];
  progressions: DrillProgression[];
  isFavorite: boolean;
  createdAt: string;
  playerCount?: string;
}

export interface DrillProgression {
  level: string;
  description: string;
}

export interface PracticeBlock {
  id: string;
  name: string;
  description: string;
  type: PracticeBlockType;
  duration: number;
  playId?: string;
  drillId?: string;
}

export interface PracticePlan {
  id: string;
  name: string;
  teamId: string;
  date: string;
  blocks: PracticeBlock[];
  totalDuration: number;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  stats?: PlayerGameStats;
}

export interface PlayerGameStats {
  points: number;
  fgMade: number;
  fgAttempts: number;
  threeMade: number;
  threeAttempts: number;
  ftMade: number;
  ftAttempts: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
}

export interface Team {
  id: string;
  name: string;
  record: { wins: number; losses: number };
  players: Player[];
  playbook: string[];
}

export type GameStatus = "upcoming" | "live" | "final";

export interface GameEvent {
  id: string;
  timestamp: string;
  quarter: number;
  playerId: string;
  playerName: string;
  team: "home" | "away";
  action: string;
  points?: number;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: string | null;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
  quarter: number;
  date: string;
  time?: string;
  events: GameEvent[];
  homeRoster: Player[];
  awayRoster: Player[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// --- Messaging ---

export type MemberRole = "owner" | "parent" | "player";
export type InviteStatus = "pending" | "accepted";

export interface AppMember {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  role: MemberRole;
  inviteToken: string | null;
  inviteStatus: InviteStatus;
  playerId: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  memberId1: string;
  memberId2: string;
  createdAt: string;
  updatedAt: string;
  otherMember?: AppMember;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
