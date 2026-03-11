"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Circle, Plus, X, Undo2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchGameWithDetails,
  addGameEvent,
  deleteGameEvent,
  upsertPlayerGameStats,
  saveGameState,
  addPlayerToGameRoster,
  fetchTeam,
  updateTeamRecord,
} from "@/lib/supabase-queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Game, GameEvent, Player, PlayerGameStats } from "@/types";

const MAX_ON_COURT = 5;

type ActiveTeam = "home" | "away";
type BottomTab = "feed" | "boxscore" | "shotchart";

type UndoableAction = {
  localEventId: string;
  serverEventId: string;
  points: number | undefined;
  statDelta: Partial<PlayerGameStats>;
  playerId: string;
  team: ActiveTeam;
};

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

function initPlayerStats(players: Player[]): Map<string, PlayerGameStats> {
  const map = new Map<string, PlayerGameStats>();
  for (const p of players) {
    map.set(p.id, { ...EMPTY_STATS, ...(p.stats ?? {}) } as PlayerGameStats);
  }
  return map;
}

function formatQuarter(q: number): string {
  if (q <= 0) return "Pre";
  if (q === 1) return "Q1";
  if (q === 2) return "Q2";
  if (q === 3) return "Q3";
  if (q === 4) return "Q4";
  return `OT${q - 4}`;
}

export default function LiveScoringPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const gameId = params.id as string;

  const { data: fetchedGame, isPending, isError } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameWithDetails(gameId),
    enabled: !!gameId,
  });

  const [gameData, setGameData] = useState<Game | undefined>(undefined);
  useEffect(() => {
    if (fetchedGame) setGameData(fetchedGame);
  }, [fetchedGame]);

  const hasCheckedStorage = !isPending;

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [quarter, setQuarter] = useState(1);
  const [clockDisplay] = useState("4:32");
  const [activeTeam, setActiveTeam] = useState<ActiveTeam>("home");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [bottomTab, setBottomTab] = useState<BottomTab>("feed");

  const [homeStats, setHomeStats] = useState<Map<string, PlayerGameStats>>(
    () => new Map()
  );
  const [awayStats, setAwayStats] = useState<Map<string, PlayerGameStats>>(
    () => new Map()
  );

  const [onCourtHome, setOnCourtHome] = useState<string[]>([]);
  const [onCourtAway, setOnCourtAway] = useState<string[]>([]);

  const [selectedStatsPlayerId, setSelectedStatsPlayerId] = useState<
    string | null
  >(null);

  const [createPlayerOpen, setCreatePlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");

  const [lastUndoable, setLastUndoable] = useState<UndoableAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const [endGameRecapOpen, setEndGameRecapOpen] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  useEffect(() => {
    if (!gameData) return;
    setHomeScore(gameData.homeScore);
    setAwayScore(gameData.awayScore);
    setQuarter(gameData.quarter);
    setEvents(gameData.events ?? []);
    setHomeStats(initPlayerStats(gameData.homeRoster ?? []));
    setAwayStats(initPlayerStats(gameData.awayRoster ?? []));
    setLastUndoable(null);
  }, [gameData?.id]);

  // Persist score/quarter to Supabase when they change
  useEffect(() => {
    if (!gameId || !gameData) return;
    saveGameState(gameId, homeScore, awayScore, quarter).catch(console.error);
  }, [gameId, gameData?.id, homeScore, awayScore, quarter]);

  const roster =
    activeTeam === "home"
      ? gameData?.homeRoster ?? []
      : gameData?.awayRoster ?? [];

  const onCourtIds =
    activeTeam === "home" ? onCourtHome : onCourtAway;
  const setOnCourtIds =
    activeTeam === "home" ? setOnCourtHome : setOnCourtAway;

  const onCourtPlayers = useMemo(
    () => roster.filter((p) => onCourtIds.includes(p.id)),
    [roster, onCourtIds]
  );
  const availableToAdd = useMemo(
    () => roster.filter((p) => !onCourtIds.includes(p.id)),
    [roster, onCourtIds]
  );

  const addToCourt = useCallback(
    (playerId: string) => {
      if (onCourtIds.length >= MAX_ON_COURT || onCourtIds.includes(playerId))
        return;
      setOnCourtIds((prev) => [...prev, playerId]);
    },
    [onCourtIds, setOnCourtIds]
  );

  const removeFromCourt = useCallback(
    (playerId: string) => {
      setOnCourtIds((prev) => prev.filter((id) => id !== playerId));
      if (selectedPlayerId === playerId) setSelectedPlayerId(null);
    },
    [setOnCourtIds, selectedPlayerId]
  );

  const addPlayerToRoster = useCallback(
    () => {
      if (!gameData) return;
      const number = parseInt(newPlayerNumber, 10);
      if (Number.isNaN(number) || number < 0 || number > 99) return;

      const newPlayer: Player = {
        id: `player-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        name: newPlayerName.trim() || "—",
        number,
        position: newPlayerPosition.trim() || "—",
      };

      const team = activeTeam;

      addPlayerToGameRoster(gameId, team, newPlayer).catch(console.error);
      upsertPlayerGameStats(gameId, newPlayer.id, team, EMPTY_STATS).catch(
        console.error
      );

      const updated: Game = {
        ...gameData,
        homeRoster:
          team === "home"
            ? [...(gameData.homeRoster ?? []), newPlayer]
            : gameData.homeRoster ?? [],
        awayRoster:
          team === "away"
            ? [...(gameData.awayRoster ?? []), newPlayer]
            : gameData.awayRoster ?? [],
      };

      setGameData(updated);
      if (team === "home") {
        setHomeStats((prev) => {
          const next = new Map(prev);
          next.set(newPlayer.id, { ...EMPTY_STATS });
          return next;
        });
      } else {
        setAwayStats((prev) => {
          const next = new Map(prev);
          next.set(newPlayer.id, { ...EMPTY_STATS });
          return next;
        });
      }

      setCreatePlayerOpen(false);
      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPosition("");
    },
    [
      gameData,
      activeTeam,
      newPlayerName,
      newPlayerNumber,
      newPlayerPosition,
      gameId,
    ]
  );

  const selectedPlayer = roster.find((p) => p.id === selectedPlayerId) ?? null;
  const statsMap = activeTeam === "home" ? homeStats : awayStats;
  const setStatsMap = activeTeam === "home" ? setHomeStats : setAwayStats;

  const allPlayers = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of gameData?.homeRoster ?? []) map.set(p.id, p);
    for (const p of gameData?.awayRoster ?? []) map.set(p.id, p);
    return map;
  }, [gameData]);

  const addEvent = useCallback(
    (
      action: string,
      points?: number
    ): { localEvent: GameEvent; promise: Promise<GameEvent | null> } | null => {
      if (!selectedPlayer) return null;
      const team = activeTeam;
      const newEvent: GameEvent = {
        id: `e-${Date.now()}`,
        timestamp: `${formatQuarter(quarter)} ${clockDisplay}`,
        quarter,
        playerId: selectedPlayer.id,
        playerName: `${selectedPlayer.name.split(" ")[0][0]}. ${selectedPlayer.name.split(" ").slice(1).join(" ")}`,
        team,
        action,
        points,
      };
      setEvents((prev) => [newEvent, ...prev]);
      if (points) {
        if (team === "home") setHomeScore((s) => s + points);
        else setAwayScore((s) => s + points);
      }
      const promise = gameId
        ? addGameEvent(gameId, {
            timestamp: newEvent.timestamp,
            quarter: newEvent.quarter,
            playerId: newEvent.playerId,
            playerName: newEvent.playerName,
            team: newEvent.team,
            action: newEvent.action,
            points: newEvent.points,
          })
        : Promise.resolve(null);
      if (gameId) promise.catch(console.error);
      return { localEvent: newEvent, promise };
    },
    [selectedPlayer, activeTeam, quarter, clockDisplay, gameId]
  );

  const recordStat = useCallback(
    (
      action: string,
      updater: (s: PlayerGameStats) => PlayerGameStats,
      points?: number
    ) => {
      if (!selectedPlayerId) return;
      const current = statsMap.get(selectedPlayerId) ?? { ...EMPTY_STATS };
      const newStats = updater(current);
      setStatsMap((prev) => {
        const next = new Map(prev);
        next.set(selectedPlayerId, newStats);
        return next;
      });
      const result = addEvent(action, points);
      if (gameId) {
        upsertPlayerGameStats(
          gameId,
          selectedPlayerId,
          activeTeam,
          newStats
        ).catch(console.error);
      }
      if (result?.promise && gameId) {
        const statDelta: Partial<PlayerGameStats> = {
          points: newStats.points - current.points,
          fgMade: newStats.fgMade - current.fgMade,
          fgAttempts: newStats.fgAttempts - current.fgAttempts,
          threeMade: newStats.threeMade - current.threeMade,
          threeAttempts: newStats.threeAttempts - current.threeAttempts,
          ftMade: newStats.ftMade - current.ftMade,
          ftAttempts: newStats.ftAttempts - current.ftAttempts,
          rebounds: newStats.rebounds - current.rebounds,
          offensiveRebounds: newStats.offensiveRebounds - current.offensiveRebounds,
          defensiveRebounds: newStats.defensiveRebounds - current.defensiveRebounds,
          assists: newStats.assists - current.assists,
          steals: newStats.steals - current.steals,
          blocks: newStats.blocks - current.blocks,
          turnovers: newStats.turnovers - current.turnovers,
          fouls: newStats.fouls - current.fouls,
          minutes: newStats.minutes - current.minutes,
        };
        result.promise.then((serverEvent) => {
          if (serverEvent) {
            setLastUndoable({
              localEventId: result.localEvent.id,
              serverEventId: serverEvent.id,
              points,
              statDelta,
              playerId: selectedPlayerId,
              team: activeTeam,
            });
          }
        });
      }
    },
    [selectedPlayerId, setStatsMap, addEvent, gameId, activeTeam, statsMap]
  );

  const handleUndo = useCallback(() => {
    if (!lastUndoable || !gameId || isUndoing) return;
    setIsUndoing(true);
    const { localEventId, serverEventId, points, statDelta, playerId, team } =
      lastUndoable;
    const setStats = team === "home" ? setHomeStats : setAwayStats;
    const statsMapForTeam = team === "home" ? homeStats : awayStats;
    const current = statsMapForTeam.get(playerId) ?? { ...EMPTY_STATS };
    const reverted: PlayerGameStats = {
      points: current.points - (statDelta.points ?? 0),
      fgMade: current.fgMade - (statDelta.fgMade ?? 0),
      fgAttempts: current.fgAttempts - (statDelta.fgAttempts ?? 0),
      threeMade: current.threeMade - (statDelta.threeMade ?? 0),
      threeAttempts: current.threeAttempts - (statDelta.threeAttempts ?? 0),
      ftMade: current.ftMade - (statDelta.ftMade ?? 0),
      ftAttempts: current.ftAttempts - (statDelta.ftAttempts ?? 0),
      rebounds: current.rebounds - (statDelta.rebounds ?? 0),
      offensiveRebounds: current.offensiveRebounds - (statDelta.offensiveRebounds ?? 0),
      defensiveRebounds: current.defensiveRebounds - (statDelta.defensiveRebounds ?? 0),
      assists: current.assists - (statDelta.assists ?? 0),
      steals: current.steals - (statDelta.steals ?? 0),
      blocks: current.blocks - (statDelta.blocks ?? 0),
      turnovers: current.turnovers - (statDelta.turnovers ?? 0),
      fouls: current.fouls - (statDelta.fouls ?? 0),
      minutes: current.minutes - (statDelta.minutes ?? 0),
    };
    setEvents((prev) => prev.filter((e) => e.id !== localEventId));
    if (points) {
      if (team === "home") setHomeScore((s) => s - points);
      else setAwayScore((s) => s - points);
    }
    setStats((prev) => {
      const next = new Map(prev);
      next.set(playerId, reverted);
      return next;
    });
    setLastUndoable(null);
    deleteGameEvent(gameId, serverEventId)
      .then(() =>
        upsertPlayerGameStats(gameId, playerId, team, reverted)
      )
      .catch(console.error)
      .finally(() => setIsUndoing(false));
  }, [
    lastUndoable,
    gameId,
    isUndoing,
    homeStats,
    awayStats,
    setHomeStats,
    setAwayStats,
  ]);

  const updatePlayerStat = useCallback(
    (
      team: ActiveTeam,
      playerId: string,
      key: keyof PlayerGameStats,
      value: number
    ) => {
      const setStats = team === "home" ? setHomeStats : setAwayStats;
      const statsMapForTeam = team === "home" ? homeStats : awayStats;
      const current = statsMapForTeam.get(playerId) ?? { ...EMPTY_STATS };
      let newStats = { ...current, [key]: value };
      if (key === "offensiveRebounds" || key === "defensiveRebounds") {
        newStats = {
          ...newStats,
          rebounds:
            newStats.offensiveRebounds + newStats.defensiveRebounds,
        };
      }
      setStats((prev) => {
        const next = new Map(prev);
        next.set(playerId, newStats);
        return next;
      });
      if (gameId) {
        upsertPlayerGameStats(gameId, playerId, team, newStats).catch(
          console.error
        );
      }
    },
    [gameId, homeStats, awayStats]
  );

  const selectedStatsPlayer = useMemo(() => {
    if (!selectedStatsPlayerId || !gameData) return null;
    const home = gameData.homeRoster?.find((p) => p.id === selectedStatsPlayerId);
    if (home)
      return {
        player: home,
        team: "home" as ActiveTeam,
        stats: homeStats.get(home.id) ?? { ...EMPTY_STATS },
      };
    const away = gameData.awayRoster?.find((p) => p.id === selectedStatsPlayerId);
    if (away)
      return {
        player: away,
        team: "away" as ActiveTeam,
        stats: awayStats.get(away.id) ?? { ...EMPTY_STATS },
      };
    return null;
  }, [
    selectedStatsPlayerId,
    gameData,
    homeStats,
    awayStats,
  ]);

  const handleConfirmEndGame = useCallback(async () => {
    if (!gameId || !gameData || isEndingGame) return;
    setIsEndingGame(true);
    try {
      await saveGameState(gameId, homeScore, awayScore, quarter, "final");
      setGameData((prev) => (prev ? { ...prev, status: "final" } : prev));
      if (gameData.homeTeamId) {
        const team = await fetchTeam(gameData.homeTeamId);
        if (team) {
          const homeWon = homeScore > awayScore;
          await updateTeamRecord(
            gameData.homeTeamId,
            team.record.wins + (homeWon ? 1 : 0),
            team.record.losses + (homeWon ? 0 : 1)
          );
          queryClient.invalidateQueries({ queryKey: ["teams"] });
          queryClient.invalidateQueries({
            queryKey: ["team", gameData.homeTeamId],
          });
        }
      }
      setEndGameRecapOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEndingGame(false);
    }
  }, [
    gameId,
    gameData,
    homeScore,
    awayScore,
    quarter,
    isEndingGame,
    queryClient,
  ]);

  if (!hasCheckedStorage || !gameData) {
    if (hasCheckedStorage && !gameData) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-pb-dark px-4">
          <p className="text-lg text-white">Game not found</p>
          <button
            onClick={() => router.push("/game-center")}
            className="mt-4 rounded-lg bg-pb-orange px-6 py-3 font-semibold text-white"
          >
            Back to Game Center
          </button>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark">
        <p className="text-pb-muted">Loading game…</p>
      </div>
    );
  }

  const statButtons: {
    label: string;
    color: string;
    handler?: () => void;
    rebOptions?: boolean;
  }[] = [
    {
      label: "2PT Made",
      color: "bg-emerald-600 active:bg-emerald-700",
      handler: () =>
        recordStat(
          "2PT Made",
          (s) => ({
            ...s,
            points: s.points + 2,
            fgMade: s.fgMade + 1,
            fgAttempts: s.fgAttempts + 1,
          }),
          2
        ),
    },
    {
      label: "2PT Miss",
      color: "bg-red-600 active:bg-red-700",
      handler: () =>
        recordStat("2PT Miss", (s) => ({
          ...s,
          fgAttempts: s.fgAttempts + 1,
        })),
    },
    {
      label: "3PT Made",
      color: "bg-emerald-600 active:bg-emerald-700",
      handler: () =>
        recordStat(
          "3PT Made",
          (s) => ({
            ...s,
            points: s.points + 3,
            fgMade: s.fgMade + 1,
            fgAttempts: s.fgAttempts + 1,
            threeMade: s.threeMade + 1,
            threeAttempts: s.threeAttempts + 1,
          }),
          3
        ),
    },
    {
      label: "3PT Miss",
      color: "bg-red-600 active:bg-red-700",
      handler: () =>
        recordStat("3PT Miss", (s) => ({
          ...s,
          fgAttempts: s.fgAttempts + 1,
          threeAttempts: s.threeAttempts + 1,
        })),
    },
    {
      label: "FT Made",
      color: "bg-emerald-600 active:bg-emerald-700",
      handler: () =>
        recordStat(
          "FT Made",
          (s) => ({
            ...s,
            points: s.points + 1,
            ftMade: s.ftMade + 1,
            ftAttempts: s.ftAttempts + 1,
          }),
          1
        ),
    },
    {
      label: "FT Miss",
      color: "bg-red-600 active:bg-red-700",
      handler: () =>
        recordStat("FT Miss", (s) => ({
          ...s,
          ftAttempts: s.ftAttempts + 1,
        })),
    },
    {
      label: "REB",
      color: "bg-[#af1aff] active:bg-[#8f15cc]",
      rebOptions: true,
    },
    {
      label: "AST",
      color: "bg-[#af1aff] active:bg-[#8f15cc]",
      handler: () =>
        recordStat("Assist", (s) => ({ ...s, assists: s.assists + 1 })),
    },
    {
      label: "STL",
      color: "bg-[#af1aff] active:bg-[#8f15cc]",
      handler: () =>
        recordStat("Steal", (s) => ({ ...s, steals: s.steals + 1 })),
    },
    {
      label: "BLK",
      color: "bg-[#af1aff] active:bg-[#8f15cc]",
      handler: () =>
        recordStat("Block", (s) => ({ ...s, blocks: s.blocks + 1 })),
    },
    {
      label: "TO",
      color: "bg-[rgb(231,0,11)] active:bg-[rgb(185,0,9)]",
      handler: () =>
        recordStat("Turnover", (s) => ({
          ...s,
          turnovers: s.turnovers + 1,
        })),
    },
    {
      label: "FOUL",
      color: "bg-[rgba(231,0,11,1)] active:bg-[rgb(185,0,9)]",
      handler: () =>
        recordStat("Foul", (s) => ({ ...s, fouls: s.fouls + 1 })),
    },
  ];

  const boxScoreRoster = (team: "home" | "away") => {
    const players =
      team === "home"
        ? gameData.homeRoster
        : gameData.awayRoster;
    const stats = team === "home" ? homeStats : awayStats;
    return players.map((p) => ({
      player: p,
      stats: stats.get(p.id) ?? { ...EMPTY_STATS },
    }));
  };

  const isGameFinal = gameData?.status === "final";

  return (
    <div className="flex min-h-screen flex-col bg-pb-dark">
      {/* ───── STICKY SCOREBOARD ───── */}
      <header className="sticky top-0 z-50 border-b border-pb-border bg-pb-dark">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => router.push("/game-center")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-pb-card"
            aria-label="Back"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="flex-1 truncate text-base font-semibold text-white">
            {gameData.homeTeam} vs {gameData.awayTeam}
          </h1>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!lastUndoable || isUndoing}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pb-card text-pb-muted transition-colors hover:bg-pb-card-hover hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Undo last action"
          >
            <Undo2 size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 px-4 pb-3">
          <div className="flex-1 text-center">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-pb-muted">
              {gameData.homeTeam}
            </p>
            <p className="text-4xl font-bold text-white">{homeScore}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setQuarter((q) => (q >= 4 ? 1 : q + 1))
            }
            className="flex flex-col items-center gap-0.5 rounded-md bg-pb-surface px-4 py-2 text-white transition-colors active:bg-pb-card-hover"
            aria-label="Change quarter"
          >
            <span className="text-xs font-bold">
              {formatQuarter(quarter)}
            </span>
            <span className="text-[10px] font-medium text-pb-muted">
              Tap to change
            </span>
          </button>
          <div className="flex-1 text-center">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-pb-muted">
              {gameData.awayTeam}
            </p>
            <p className="text-4xl font-bold text-white">{awayScore}</p>
          </div>
        </div>
      </header>

      {/* ───── MAIN SCORING AREA ───── */}
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4">
        {/* Team Toggle */}
        <div className="flex overflow-hidden rounded-xl bg-pb-surface">
          <button
            onClick={() => {
              setActiveTeam("home");
              setSelectedPlayerId(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition-colors ${
              activeTeam === "home"
                ? "bg-pb-orange text-white"
                : "text-pb-muted active:text-white"
            }`}
          >
            {gameData.homeTeam}
          </button>
          <button
            onClick={() => {
              setActiveTeam("away");
              setSelectedPlayerId(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition-colors ${
              activeTeam === "away"
                ? "bg-pb-orange text-white"
                : "text-pb-muted active:text-white"
            }`}
          >
            {gameData.awayTeam}
          </button>
        </div>

        {/* On court — 5 slots, add/remove, tap to select */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-pb-muted">
            On court
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: MAX_ON_COURT }, (_, i) => {
              const player = onCourtPlayers[i];
              const slotKey = player?.id ?? `empty-${i}`;
              if (player) {
                return (
                  <div
                    key={slotKey}
                    className="flex items-center gap-1 rounded-xl bg-pb-card pr-1"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        selectedPlayerId === player.id
                          ? "bg-pb-orange text-white ring-2 ring-pb-orange/50"
                          : "bg-pb-surface text-white active:bg-pb-card-hover"
                      }`}
                    >
                      {player.number}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCourt(player.id);
                      }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-pb-muted transition-colors hover:bg-pb-card-hover hover:text-white"
                      aria-label={`Remove ${player.name} from court`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              }
              if (onCourtIds.length >= MAX_ON_COURT) return null;
              return (
                <DropdownMenu key={slotKey}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-pb-border bg-pb-card text-pb-muted transition-colors hover:border-pb-orange hover:text-pb-orange active:bg-pb-card-hover"
                      aria-label="Add player to court"
                    >
                      <Plus size={20} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 overflow-y-auto bg-pb-card border-pb-border"
                  >
                    {availableToAdd.length === 0 ? (
                      <div className="px-2 py-3 text-center text-sm text-pb-muted">
                        All players on court
                      </div>
                    ) : (
                      availableToAdd.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() => addToCourt(p.id)}
                          className="text-white focus:bg-pb-card-hover focus:text-white"
                        >
                          #{p.number} {p.name}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
          <div className="mt-2 h-5">
            {selectedPlayer ? (
              <p className="text-sm font-medium text-white">
                <span className="text-pb-orange">#{selectedPlayer.number}</span>{" "}
                {selectedPlayer.name}{" "}
                <span className="text-pb-muted">· {selectedPlayer.position}</span>
              </p>
            ) : (
              <p className="text-sm text-pb-muted">Select a player on court</p>
            )}
          </div>
        </div>

        {/* All players — tap to add to court */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-pb-muted">
              All players
            </p>
            <button
              type="button"
              onClick={() => setCreatePlayerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-pb-orange bg-pb-orange px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pb-orange/90 active:bg-pb-orange/90 [border-image:none]"
            >
              <Plus size={14} />
              Create player
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {roster.map((p) => {
              const isOnCourt = onCourtIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (isOnCourt) {
                      setSelectedPlayerId(p.id);
                    } else if (onCourtIds.length < MAX_ON_COURT) {
                      addToCourt(p.id);
                    }
                  }}
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isOnCourt
                      ? "bg-pb-orange/30 text-pb-orange ring-2 ring-pb-orange/50"
                      : selectedPlayerId === p.id
                        ? "bg-pb-orange text-white ring-2 ring-pb-orange/50"
                        : "border border-pb-orange bg-pb-card text-white active:bg-pb-card-hover"
                  }`}
                  title={isOnCourt ? `Select ${p.name}` : `Add ${p.name} to court`}
                >
                  {p.number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create player dialog */}
        <Dialog open={createPlayerOpen} onOpenChange={setCreatePlayerOpen}>
          <DialogContent className="border-pb-border bg-pb-dark text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                Create player
              </DialogTitle>
              <p className="text-sm text-pb-muted">
                Player will be added to{" "}
                {activeTeam === "home"
                  ? gameData.homeTeam
                  : gameData.awayTeam}
              </p>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                  Name (optional)
                </label>
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                    Number
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    placeholder="0"
                    className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                    Position (optional)
                  </label>
                  <Input
                    value={newPlayerPosition}
                    onChange={(e) => setNewPlayerPosition(e.target.value)}
                    placeholder="e.g. PG, SG"
                    className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCreatePlayerOpen(false)}
                className="border-pb-border text-white hover:bg-pb-card"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addPlayerToRoster()}
                disabled={
                  newPlayerNumber === "" ||
                  Number.isNaN(parseInt(newPlayerNumber, 10)) ||
                  parseInt(newPlayerNumber, 10) < 0 ||
                  parseInt(newPlayerNumber, 10) > 99
                }
                className="bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                Add player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stat Buttons Grid */}
        <div
          className={`grid grid-cols-3 gap-2 sm:grid-cols-4 ${
            !selectedPlayerId ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {statButtons.map((btn) =>
            btn.rebOptions ? (
              <DropdownMenu key={btn.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!selectedPlayerId}
                    className={`flex min-h-[60px] items-center justify-center rounded-xl text-sm font-bold text-white transition-colors ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-pb-card border-pb-border"
                >
                  <DropdownMenuItem
                    onClick={() =>
                      recordStat("Offensive Rebound", (s) => ({
                        ...s,
                        rebounds: s.rebounds + 1,
                        offensiveRebounds: s.offensiveRebounds + 1,
                      }))
                    }
                    className="text-white focus:bg-pb-card-hover focus:text-white"
                  >
                    Offensive Rebound
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      recordStat("Defensive Rebound", (s) => ({
                        ...s,
                        rebounds: s.rebounds + 1,
                        defensiveRebounds: s.defensiveRebounds + 1,
                      }))
                    }
                    className="text-white focus:bg-pb-card-hover focus:text-white"
                  >
                    Defensive Rebound
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                key={btn.label}
                onClick={btn.handler}
                disabled={!selectedPlayerId}
                className={`flex min-h-[60px] items-center justify-center rounded-xl text-sm font-bold text-white transition-colors ${btn.color}`}
              >
                {btn.label}
              </button>
            )
          )}
        </div>

        {/* ───── BOTTOM TABS ───── */}
        <div className="mt-2 flex overflow-hidden rounded-xl bg-pb-surface">
          {(
            [
              ["feed", "Live Feed"],
              ["boxscore", "Box Score"],
              ["shotchart", "Player Stats"],
            ] as [BottomTab, string][]
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setBottomTab(tab)}
              className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${
                bottomTab === tab
                  ? "bg-pb-blue text-white"
                  : "text-pb-muted active:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl bg-pb-card p-3">
          {/* ── Live Feed ── */}
          {bottomTab === "feed" && (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {events.length === 0 ? (
                <p className="py-6 text-center text-sm text-pb-muted">
                  No events yet — start scoring!
                </p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 odd:bg-pb-surface/50"
                  >
                    <Circle
                      size={8}
                      className={
                        ev.team === "home"
                          ? "shrink-0 fill-pb-orange text-pb-orange"
                          : "shrink-0 fill-pb-blue text-pb-blue"
                      }
                    />
                    <span className="w-16 shrink-0 text-xs tabular-nums text-pb-muted">
                      {ev.timestamp}
                    </span>
                    <span className="flex-1 truncate text-xs text-white">
                      <span className="font-semibold">{ev.playerName}</span>{" "}
                      {ev.action}
                    </span>
                    {ev.points && (
                      <span className="shrink-0 text-xs font-bold text-pb-orange">
                        +{ev.points}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Box Score ── */}
          {bottomTab === "boxscore" && (
            <div className="space-y-4">
              {(["home", "away"] as const).map((team) => {
                const teamName =
                  team === "home" ? gameData.homeTeam : gameData.awayTeam;
                const rows = boxScoreRoster(team);
                return (
                  <div key={team}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-pb-orange">
                      {teamName}
                    </h3>
                    <div className="-mx-3 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-pb-muted">
                            <th className="sticky left-0 bg-pb-card px-3 py-2 text-left font-semibold">
                              Player
                            </th>
                            {[
                              "PTS",
                              "FG",
                              "3PT",
                              "FT",
                              "OREB",
                              "DREB",
                              "REB",
                              "AST",
                              "STL",
                              "BLK",
                              "TO",
                              "PF",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-2 py-2 text-center font-semibold"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ player, stats: s }) => (
                            <tr
                              key={player.id}
                              className="border-b border-white/5 text-white"
                            >
                              <td className="sticky left-0 bg-pb-card px-3 py-2 font-medium whitespace-nowrap">
                                #{player.number} {player.name}
                              </td>
                              <td className="px-2 py-2 text-center font-bold">
                                {s.points}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.fgMade}-{s.fgAttempts}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.threeMade}-{s.threeAttempts}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.ftMade}-{s.ftAttempts}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.offensiveRebounds}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.defensiveRebounds}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.rebounds}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.assists}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.steals}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.blocks}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.turnovers}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {s.fouls}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Player Stats (edit) ── */}
          {bottomTab === "shotchart" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {(["home", "away"] as const).map((team) => {
                  const teamName =
                    team === "home" ? gameData.homeTeam : gameData.awayTeam;
                  const players =
                    team === "home"
                      ? gameData.homeRoster ?? []
                      : gameData.awayRoster ?? [];
                  return (
                    <div key={team}>
                      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-pb-muted">
                        {teamName}
                      </h3>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {players.map((p) => {
                          const isSelected =
                            selectedStatsPlayerId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setSelectedStatsPlayerId(
                                  isSelected ? null : p.id
                                )
                              }
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                isSelected
                                  ? "bg-pb-orange text-white"
                                  : "bg-pb-surface text-white hover:bg-pb-card-hover"
                              }`}
                            >
                              #{p.number} {p.name}
                            </button>
                          );
                        })}
                        {players.length === 0 && (
                          <p className="py-2 text-xs text-pb-muted">
                            No players
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedStatsPlayer ? (
                <div className="rounded-lg border border-pb-border bg-pb-surface p-3">
                  <h4 className="mb-3 text-sm font-bold text-white">
                    #{selectedStatsPlayer.player.number}{" "}
                    {selectedStatsPlayer.player.name}
                    <span className="ml-2 text-xs font-normal text-pb-muted">
                      · {selectedStatsPlayer.player.position}
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    {(
                      [
                        ["points", "PTS"],
                        ["fgMade", "FG Made"],
                        ["fgAttempts", "FG Att"],
                        ["threeMade", "3PT Made"],
                        ["threeAttempts", "3PT Att"],
                        ["ftMade", "FT Made"],
                        ["ftAttempts", "FT Att"],
                        ["offensiveRebounds", "OREB"],
                        ["defensiveRebounds", "DREB"],
                        ["rebounds", "REB"],
                        ["assists", "AST"],
                        ["steals", "STL"],
                        ["blocks", "BLK"],
                        ["turnovers", "TO"],
                        ["fouls", "PF"],
                        ["minutes", "MIN"],
                      ] as [keyof PlayerGameStats, string][]
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-0.5 block text-[10px] font-medium text-pb-muted">
                          {label}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={selectedStatsPlayer.stats[key]}
                          onChange={(e) => {
                            const v = parseInt(
                              e.target.value.replace(/\D/g, "") || "0",
                              10
                            );
                            updatePlayerStat(
                              selectedStatsPlayer.team,
                              selectedStatsPlayer.player.id,
                              key,
                              v
                            );
                          }}
                          className="h-8 border-pb-border bg-pb-card text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-pb-muted">
                  Select a player to view and edit their stats
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* End Game button - fixed at bottom when game is live */}
      {!isGameFinal && (
        <div className="border-t border-pb-border bg-pb-dark px-4 py-4 pb-safe">
          <button
            type="button"
            onClick={() => setEndGameRecapOpen(true)}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-red-700 active:bg-red-800"
          >
            End Game
          </button>
        </div>
      )}

      {/* End Game Recap Dialog */}
      <Dialog
        open={endGameRecapOpen}
        onOpenChange={(open) => !isEndingGame && setEndGameRecapOpen(open)}
      >
        <DialogContent className="max-h-[90dvh] max-w-lg border-pb-border bg-pb-dark text-white overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">End Game — Final Recap</DialogTitle>
            <p className="text-sm text-pb-muted">
              Stats from this game are saved. Team record will be updated.
            </p>
          </DialogHeader>
          {gameData && (
            <div className="space-y-4 py-2">
              {/* Final Score */}
              <div className="flex items-center justify-center gap-6 rounded-xl bg-pb-card p-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-pb-muted">
                    {gameData.homeTeam}
                  </p>
                  <p className="text-3xl font-bold text-pb-orange">{homeScore}</p>
                </div>
                <span className="text-xl font-bold text-pb-muted">–</span>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-pb-muted">
                    {gameData.awayTeam}
                  </p>
                  <p className="text-3xl font-bold text-white">{awayScore}</p>
                </div>
              </div>
              {/* Box Score Recap */}
              <div className="space-y-3">
                {(["home", "away"] as const).map((team) => {
                  const teamName =
                    team === "home" ? gameData.homeTeam : gameData.awayTeam;
                  const rows = boxScoreRoster(team);
                  return (
                    <div key={team}>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-pb-orange">
                        {teamName}
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-pb-border">
                        <table className="w-full min-w-[320px] text-xs">
                          <thead>
                            <tr className="border-b border-pb-border bg-pb-card text-pb-muted">
                              <th className="px-3 py-2 text-left font-semibold">
                                Player
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                PTS
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                FG
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                OREB
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                DREB
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                REB
                              </th>
                              <th className="px-2 py-2 text-center font-semibold">
                                AST
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(({ player, stats: s }) => (
                              <tr
                                key={player.id}
                                className="border-b border-pb-border/50 text-white"
                              >
                                <td className="px-3 py-2 font-medium">
                                  #{player.number} {player.name}
                                </td>
                                <td className="px-2 py-2 text-center font-bold">
                                  {s.points}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.fgMade}-{s.fgAttempts}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.offensiveRebounds}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.defensiveRebounds}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.rebounds}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {s.assists}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEndGameRecapOpen(false)}
              disabled={isEndingGame}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEndGame}
              disabled={isEndingGame}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {isEndingGame ? "Ending…" : "Confirm End Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
