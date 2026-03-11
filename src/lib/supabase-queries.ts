import { supabase } from "@/lib/supabase";
import type {
  Team,
  Player,
  Game,
  GameEvent,
  PlayerGameStats,
  GameStatus,
} from "@/types";

// --- Teams ---

export async function fetchTeams(): Promise<Team[]> {
  const { data: teamsRows, error } = await supabase
    .from("teams")
    .select("id, name, wins, losses")
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
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
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
  const { error } = await supabase
    .from("teams")
    .update({ wins, losses })
    .eq("id", teamId);
  if (error) throw error;
}

export async function fetchTeam(id: string): Promise<Team | null> {
  const { data: teamRow, error: teamError } = await supabase
    .from("teams")
    .select("id, name, wins, losses")
    .eq("id", id)
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
  const [teamRes, gamesRes] = await Promise.all([
    fetchTeam(teamId),
    supabase.from("games").select("id").eq("home_team_id", teamId),
  ]);

  const team = teamRes;
  if (!team) return [];

  const gameIds = (gamesRes.data ?? []).map((r) => r.id);
  if (gameIds.length === 0) {
    return team.players.map((player) => ({
      player,
      gamesPlayed: 0,
      total: { ...EMPTY_STATS },
      perGame: { ...EMPTY_STATS },
    }));
  }

  const { data: statsRows, error } = await supabase
    .from("player_game_stats")
    .select("*")
    .in("game_id", gameIds)
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
  const { data: rows, error } = await supabase
    .from("games")
    .select("*")
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
  const { error } = await supabase.from("player_game_stats").upsert(
    {
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
      offensive_rebounds: stats.offensiveRebounds,
      defensive_rebounds: stats.defensiveRebounds,
      assists: stats.assists,
      steals: stats.steals,
      blocks: stats.blocks,
      turnovers: stats.turnovers,
      fouls: stats.fouls,
      minutes: stats.minutes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "game_id,player_id" }
  );
  if (error) throw error;
}

export async function fetchGameWithDetails(gameId: string): Promise<Game | null> {
  const { data: gameRow, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
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

export async function addPlayerToGameRoster(
  gameId: string,
  teamSide: "home" | "away",
  player: Player
): Promise<void> {
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
