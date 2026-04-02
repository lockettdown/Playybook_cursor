import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type {
  Team,
  Player,
  Game,
  GameEvent,
  PlayerGameStats,
  GameStatus,
} from "@/types";

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// --- Teams ---

export async function fetchTeams(): Promise<Team[]> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: teamsRows, error } = await supabase
    .from("teams")
    .select("id, name, wins, losses")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!teamsRows?.length) return [];

  const teamIds = teamsRows.map((r) => r.id);
  const { data: playersRows, error: playersError } = await supabase
    .from("players")
    .select("id, team_id, name, number, position")
    .in("team_id", teamIds);

  if (playersError) throw playersError;

  const playersByTeam = new Map<string, Player[]>();
  for (const row of playersRows ?? []) {
    const player: Player = {
      id: row.id,
      name: row.name,
      number: row.number,
      position: row.position ?? "",
    };
    const list = playersByTeam.get(row.team_id) ?? [];
    list.push(player);
    playersByTeam.set(row.team_id, list);
  }

  return teamsRows.map((row) => ({
    id: row.id,
    name: row.name,
    record: { wins: row.wins ?? 0, losses: row.losses ?? 0 },
    players: playersByTeam.get(row.id) ?? [],
    playbook: [],
  }));
}

export async function createTeam(
  name: string,
  players: { id?: string; name: string; number: number; position: string }[]
): Promise<Team> {
  const supabase = getSupabaseBrowser();
  const { data: teamRow, error: teamError } = await supabase
    .from("teams")
    .insert({ name, wins: 0, losses: 0 })
    .select("id, name, wins, losses")
    .single();

  if (teamError) throw teamError;
  const teamId = teamRow.id;

  if (players.length > 0) {
    const playerRows = players.map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      team_id: teamId,
      name: p.name,
      number: p.number,
      position: p.position ?? "",
    }));
    const { error: playersError } = await supabase.from("players").insert(playerRows);
    if (playersError) throw playersError;
  }

  return {
    id: teamId,
    name: teamRow.name,
    record: { wins: teamRow.wins ?? 0, losses: teamRow.losses ?? 0 },
    players: players.map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      name: p.name,
      number: p.number,
      position: p.position ?? "",
    })),
    playbook: [],
  };
}

export async function addPlayerToTeam(
  teamId: string,
  player: { name: string; number: number; position: string }
): Promise<Player> {
  const supabase = getSupabaseBrowser();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("players").insert({
    id,
    team_id: teamId,
    name: player.name,
    number: player.number,
    position: player.position ?? "",
  });
  if (error) throw error;
  return {
    id,
    name: player.name,
    number: player.number,
    position: player.position ?? "",
  };
}

export async function updatePlayer(
  playerId: string,
  data: { name: string; number: number; position: string }
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("players")
    .update({
      name: data.name,
      number: data.number,
      position: data.position ?? "",
    })
    .eq("id", playerId);
  if (error) throw error;
}

export async function deletePlayer(playerId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .eq("team_id", teamId);
  if (playersError) throw playersError;
  const { error: teamError } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);
  if (teamError) throw teamError;
}

export async function updateTeamRecord(
  teamId: string,
  wins: number,
  losses: number
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("teams")
    .update({ wins, losses })
    .eq("id", teamId);
  if (error) throw error;
}

export async function updateTeam(
  teamId: string,
  data: { name: string; wins: number; losses: number }
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("teams")
    .update({
      name: data.name,
      wins: data.wins,
      losses: data.losses,
    })
    .eq("id", teamId);
  if (error) throw error;
}

export async function fetchTeam(id: string): Promise<Team | null> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: teamRow, error: teamError } = await supabase
    .from("teams")
    .select("id, name, wins, losses")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (teamError || !teamRow) return null;

  const { data: playersRows, error: playersError } = await supabase
    .from("players")
    .select("id, name, number, position")
    .eq("team_id", id);

  if (playersError) throw playersError;

  const players: Player[] = (playersRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    number: row.number,
    position: row.position ?? "",
  }));

  return {
    id: teamRow.id,
    name: teamRow.name,
    record: { wins: teamRow.wins ?? 0, losses: teamRow.losses ?? 0 },
    players,
    playbook: [],
  };
}

export type TeamPlayerStats = {
  player: Player;
  gamesPlayed: number;
  total: PlayerGameStats;
  perGame: PlayerGameStats;
};

export async function fetchTeamPlayerStats(
  teamId: string
): Promise<TeamPlayerStats[]> {
  const team = await fetchTeam(teamId);
  if (!team) return [];

  const playerIds = team.players.map((p) => p.id);
  if (playerIds.length === 0) {
    return [];
  }

  // Query stats directly by player ID — works regardless of whether games
  // have home_team_id set correctly.
  const supabase = getSupabaseBrowser();
  const { data: statsRows, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .in("player_id", playerIds)
    .eq("team_side", "home");

  if (error) return team.players.map((p) => ({
    player: p,
    gamesPlayed: 0,
    total: { ...EMPTY_STATS },
    perGame: { ...EMPTY_STATS },
  }));

  const byPlayer = new Map<string, { games: number; total: PlayerGameStats }>();
  for (const row of statsRows ?? []) {
    const pid = row.player_id as string;
    const stats = rowToPlayerGameStats(row);
    const prev = byPlayer.get(pid);
    if (!prev) {
      byPlayer.set(pid, { games: 1, total: { ...stats } });
    } else {
      prev.games += 1;
      prev.total = {
        points: prev.total.points + stats.points,
        fgMade: prev.total.fgMade + stats.fgMade,
        fgAttempts: prev.total.fgAttempts + stats.fgAttempts,
        threeMade: prev.total.threeMade + stats.threeMade,
        threeAttempts: prev.total.threeAttempts + stats.threeAttempts,
        ftMade: prev.total.ftMade + stats.ftMade,
        ftAttempts: prev.total.ftAttempts + stats.ftAttempts,
        rebounds: prev.total.rebounds + stats.rebounds,
        offensiveRebounds: prev.total.offensiveRebounds + stats.offensiveRebounds,
        defensiveRebounds: prev.total.defensiveRebounds + stats.defensiveRebounds,
        assists: prev.total.assists + stats.assists,
        steals: prev.total.steals + stats.steals,
        blocks: prev.total.blocks + stats.blocks,
        turnovers: prev.total.turnovers + stats.turnovers,
        fouls: prev.total.fouls + stats.fouls,
        minutes: prev.total.minutes + stats.minutes,
      };
    }
  }

  function perGame(total: PlayerGameStats, games: number): PlayerGameStats {
    if (games === 0) return { ...EMPTY_STATS };
    return {
      points: Math.round((total.points / games) * 10) / 10,
      fgMade: Math.round((total.fgMade / games) * 10) / 10,
      fgAttempts: Math.round((total.fgAttempts / games) * 10) / 10,
      threeMade: Math.round((total.threeMade / games) * 10) / 10,
      threeAttempts: Math.round((total.threeAttempts / games) * 10) / 10,
      ftMade: Math.round((total.ftMade / games) * 10) / 10,
      ftAttempts: Math.round((total.ftAttempts / games) * 10) / 10,
      rebounds: Math.round((total.rebounds / games) * 10) / 10,
      offensiveRebounds: Math.round((total.offensiveRebounds / games) * 10) / 10,
      defensiveRebounds: Math.round((total.defensiveRebounds / games) * 10) / 10,
      assists: Math.round((total.assists / games) * 10) / 10,
      steals: Math.round((total.steals / games) * 10) / 10,
      blocks: Math.round((total.blocks / games) * 10) / 10,
      turnovers: Math.round((total.turnovers / games) * 10) / 10,
      fouls: Math.round((total.fouls / games) * 10) / 10,
      minutes: Math.round((total.minutes / games) * 10) / 10,
    };
  }

  return team.players.map((player) => {
    const agg = byPlayer.get(player.id);
    const gamesPlayed = agg?.games ?? 0;
    const total = agg?.total ?? { ...EMPTY_STATS };
    return {
      player,
      gamesPlayed,
      total,
      perGame: perGame(total, gamesPlayed),
    };
  });
}

// --- Games ---

export async function fetchGames(): Promise<Game[]> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: rows, error } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  const games: Game[] = [];
  for (const row of rows) {
    const game = await fetchGameWithDetails(row.id);
    if (game) games.push(game);
  }
  return games;
}

export async function createGame(
  homeTeamName: string,
  awayTeamName: string,
  homeRoster: Player[],
  homeTeamId?: string | null
): Promise<Game> {
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().slice(0, 10);
  const { data: gameRow, error: gameError } = await supabase
    .from("games")
    .insert({
      home_team_id: homeTeamId ?? null,
      home_team_name: homeTeamName,
      away_team_name: awayTeamName,
      home_score: 0,
      away_score: 0,
      status: "live",
      quarter: 1,
      date: today,
    })
    .select("id")
    .single();

  if (gameError) throw gameError;
  const gameId = gameRow.id;

  // Insert home roster into game_rosters
  if (homeRoster.length > 0) {
    const rosterRows = homeRoster.map((p) => ({
      game_id: gameId,
      player_id: p.id,
      team_side: "home",
      player_name: p.name,
      player_number: p.number,
      player_position: p.position ?? "",
    }));
    await supabase.from("game_rosters").insert(rosterRows);
  }

  return {
    id: gameId,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    homeScore: 0,
    awayScore: 0,
    status: "live",
    quarter: 1,
    date: today,
    events: [],
    homeRoster,
    awayRoster: [],
  };
}

export async function saveGameState(
  gameId: string,
  homeScore: number,
  awayScore: number,
  quarter: number,
  status?: GameStatus
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const payload: Record<string, unknown> = {
    home_score: homeScore,
    away_score: awayScore,
    quarter,
  };
  if (status !== undefined) payload.status = status;
  const { error } = await supabase.from("games").update(payload).eq("id", gameId);
  if (error) throw error;
}

export async function addGameEvent(
  gameId: string,
  event: Omit<GameEvent, "id">
): Promise<GameEvent> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("game_events")
    .insert({
      game_id: gameId,
      timestamp: event.timestamp,
      quarter: event.quarter,
      player_id: event.playerId,
      player_name: event.playerName,
      team_side: event.team,
      action: event.action,
      points: event.points ?? null,
    })
    .select("id, timestamp, quarter, player_id, player_name, team_side, action, points")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    timestamp: data.timestamp,
    quarter: data.quarter,
    playerId: data.player_id,
    playerName: data.player_name,
    team: data.team_side as "home" | "away",
    action: data.action,
    points: data.points ?? undefined,
  };
}

export async function deleteGameEvent(
  gameId: string,
  eventId: string
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("game_events")
    .delete()
    .eq("id", eventId)
    .eq("game_id", gameId);
  if (error) throw error;
}

const EMPTY_STATS: PlayerGameStats = {
  points: 0,
  fgMade: 0,
  fgAttempts: 0,
  threeMade: 0,
  threeAttempts: 0,
  ftMade: 0,
  ftAttempts: 0,
  rebounds: 0,
  offensiveRebounds: 0,
  defensiveRebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fouls: 0,
  minutes: 0,
};

function rowToPlayerGameStats(row: Record<string, unknown>): PlayerGameStats {
  const offensiveRebounds = (row.offensive_rebounds as number) ?? 0;
  const defensiveRebounds = (row.defensive_rebounds as number) ?? 0;
  const rebounds = (row.rebounds as number) ?? offensiveRebounds + defensiveRebounds;
  return {
    points: (row.points as number) ?? 0,
    fgMade: (row.fg_made as number) ?? 0,
    fgAttempts: (row.fg_attempts as number) ?? 0,
    threeMade: (row.three_made as number) ?? 0,
    threeAttempts: (row.three_attempts as number) ?? 0,
    ftMade: (row.ft_made as number) ?? 0,
    ftAttempts: (row.ft_attempts as number) ?? 0,
    rebounds,
    offensiveRebounds,
    defensiveRebounds,
    assists: (row.assists as number) ?? 0,
    steals: (row.steals as number) ?? 0,
    blocks: (row.blocks as number) ?? 0,
    turnovers: (row.turnovers as number) ?? 0,
    fouls: (row.fouls as number) ?? 0,
    minutes: (row.minutes as number) ?? 0,
  };
}

export async function upsertPlayerGameStats(
  gameId: string,
  playerId: string,
  teamSide: "home" | "away",
  stats: PlayerGameStats
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const now = new Date().toISOString();
  const basePayload = {
    game_id: gameId,
    player_id: playerId,
    team_side: teamSide,
    points: stats.points,
    fg_made: stats.fgMade,
    fg_attempts: stats.fgAttempts,
    three_made: stats.threeMade,
    three_attempts: stats.threeAttempts,
    ft_made: stats.ftMade,
    ft_attempts: stats.ftAttempts,
    rebounds: stats.rebounds,
    assists: stats.assists,
    steals: stats.steals,
    blocks: stats.blocks,
    turnovers: stats.turnovers,
    fouls: stats.fouls,
    minutes: stats.minutes,
    updated_at: now,
  };

  const payloadWithSplitRebounds = {
    ...basePayload,
    offensive_rebounds: stats.offensiveRebounds,
    defensive_rebounds: stats.defensiveRebounds,
  };

  let { error } = await supabase
    .from("player_game_stats")
    .upsert(payloadWithSplitRebounds, { onConflict: "game_id,player_id" });

  // Backward compatibility for older DB schemas that don't have split rebound columns.
  if (error && /offensive_rebounds|defensive_rebounds/i.test(error.message ?? "")) {
    const retry = await supabase
      .from("player_game_stats")
      .upsert(basePayload, { onConflict: "game_id,player_id" });
    error = retry.error;
  }

  if (error) throw error;
}

export type PlayerGameStatLine = {
  gameId: string;
  gameDate: string;
  opponent: string;
  stats: PlayerGameStats;
};

export async function fetchPlayerGameLines(
  playerId: string
): Promise<PlayerGameStatLine[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("player_game_stats")
    .select("*, games!inner(id, date, home_team_name, away_team_name)")
    .eq("player_id", playerId)
    .eq("team_side", "home")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const game = row.games as Record<string, unknown>;
    return {
      gameId: row.game_id as string,
      gameDate: (game.date as string) ?? "",
      opponent: (game.away_team_name as string) ?? "Unknown",
      stats: rowToPlayerGameStats(row),
    };
  });
}

export async function fetchGameWithDetails(gameId: string): Promise<Game | null> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: gameRow, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("user_id", userId)
    .single();

  if (gameError || !gameRow) return null;

  const [eventsRes, rosterRes, statsRes] = await Promise.all([
    supabase
      .from("game_events")
      .select("id, timestamp, quarter, player_id, player_name, team_side, action, points")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false }),
    supabase.from("game_rosters").select("*").eq("game_id", gameId),
    supabase.from("player_game_stats").select("*").eq("game_id", gameId),
  ]);

  const homeRoster: Player[] = [];
  const awayRoster: Player[] = [];
  const statsByPlayer = new Map<string, PlayerGameStats>();

  for (const r of rosterRes.data ?? []) {
    const player: Player = {
      id: r.player_id,
      name: r.player_name,
      number: r.player_number,
      position: r.player_position ?? "",
    };
    if (r.team_side === "home") homeRoster.push(player);
    else awayRoster.push(player);
  }

  for (const row of statsRes.data ?? []) {
    statsByPlayer.set(row.player_id, rowToPlayerGameStats(row));
  }

  const homeRosterWithStats = homeRoster.map((p) => ({
    ...p,
    stats: statsByPlayer.get(p.id) ?? EMPTY_STATS,
  }));
  const awayRosterWithStats = awayRoster.map((p) => ({
    ...p,
    stats: statsByPlayer.get(p.id) ?? EMPTY_STATS,
  }));

  const events: GameEvent[] = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    quarter: e.quarter,
    playerId: e.player_id,
    playerName: e.player_name,
    team: e.team_side as "home" | "away",
    action: e.action,
    points: e.points ?? undefined,
  }));

  return {
    id: gameRow.id,
    homeTeam: gameRow.home_team_name,
    awayTeam: gameRow.away_team_name,
    homeTeamId: gameRow.home_team_id ?? undefined,
    homeScore: gameRow.home_score ?? 0,
    awayScore: gameRow.away_score ?? 0,
    status: gameRow.status as GameStatus,
    quarter: gameRow.quarter ?? 1,
    date: gameRow.date,
    time: gameRow.time ?? undefined,
    events,
    homeRoster: homeRosterWithStats,
    awayRoster: awayRosterWithStats,
  };
}

// --- Team Events ---

export type TeamEventType = "practice" | "game" | "meeting" | "other";

export interface TeamEvent {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  date: string;
  time: string;
  type: TeamEventType;
  location: string;
  opponent: string;
  notes: string;
}

function mapEventRow(row: Record<string, unknown>, teamName: string): TeamEvent {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    teamName,
    title: row.title as string,
    date: (row.date as string) ?? "",
    time: (row.time as string) ?? "",
    type: (row.type as TeamEventType) ?? "practice",
    location: (row.location as string) ?? "",
    opponent: (row.opponent as string) ?? "",
    notes: (row.notes as string) ?? "",
  };
}

export async function fetchTeamEvents(): Promise<TeamEvent[]> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: rows, error } = await supabase
    .from("team_events")
    .select("*, teams(name)")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (rows ?? []).map((row: Record<string, unknown>) => {
    const teams = row.teams as { name: string } | null;
    return mapEventRow(row, teams?.name ?? "");
  });
}

export async function fetchTeamEventsByTeam(teamId: string): Promise<TeamEvent[]> {
  const supabase = getSupabaseBrowser();
  const userId = await requireUserId();
  const { data: rows, error } = await supabase
    .from("team_events")
    .select("*, teams(name)")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;
  return (rows ?? []).map((row: Record<string, unknown>) => {
    const teams = row.teams as { name: string } | null;
    return mapEventRow(row, teams?.name ?? "");
  });
}

export async function createTeamEvent(
  event: Omit<TeamEvent, "id" | "teamName">
): Promise<TeamEvent> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("team_events")
    .insert({
      team_id: event.teamId,
      title: event.title,
      date: event.date,
      time: event.time,
      type: event.type,
      location: event.location,
      opponent: event.opponent,
      notes: event.notes,
    })
    .select("*, teams(name)")
    .single();

  if (error) throw error;
  const teams = (data as Record<string, unknown>).teams as { name: string } | null;
  return mapEventRow(data as Record<string, unknown>, teams?.name ?? "");
}

export async function updateTeamEvent(
  id: string,
  updates: Partial<Omit<TeamEvent, "id" | "teamId" | "teamName">>
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.time !== undefined) payload.time = updates.time;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.opponent !== undefined) payload.opponent = updates.opponent;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { error } = await supabase
    .from("team_events")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTeamEvent(id: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("team_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// --- Game Rosters ---

export async function addPlayerToGameRoster(
  gameId: string,
  teamSide: "home" | "away",
  player: Player
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("game_rosters").insert({
    game_id: gameId,
    player_id: player.id,
    team_side: teamSide,
    player_name: player.name,
    player_number: player.number,
    player_position: player.position ?? "",
  });
  if (error) throw error;
}
