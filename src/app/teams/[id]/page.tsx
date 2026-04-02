"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeam,
  addPlayerToTeam,
  updateTeam,
  updatePlayer,
  deletePlayer,
  deleteTeam,
  fetchTeamPlayerStats,
  fetchTeamEventsByTeam,
  createTeamEvent,
  deleteTeamEvent,
  fetchPlayerGameLines,
  upsertPlayerGameStats,
} from "@/lib/supabase-queries";
import type { Player, PlayerGameStats } from "@/types";
import type { TeamEvent, TeamEventType, PlayerGameStatLine } from "@/lib/supabase-queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { EventDetailSheet } from "@/components/events/EventDetailSheet";

function formatTeamEventDateTime(date: string, time: string): string {
  if (!date) return "";
  if (!time) return date;

  const localDate = new Date(`${date}T${time}`);
  if (Number.isNaN(localDate.getTime())) return `${date} · ${time}`;

  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(localDate);

  return `${date} · ${formattedTime}`;
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newPosition, setNewPosition] = useState("");

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [deletePlayerConfirmOpen, setDeletePlayerConfirmOpen] = useState(false);

  type SectionTab = "roster" | "stats" | "events";
  const [sectionTab, setSectionTab] = useState<SectionTab>("roster");
  const [statsView, setStatsView] = useState<"perGame" | "total">("perGame");
  const [deleteTeamConfirmOpen, setDeleteTeamConfirmOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamWins, setEditTeamWins] = useState("");
  const [editTeamLosses, setEditTeamLosses] = useState("");

  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<TeamEventType>("practice");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventOpponent, setNewEventOpponent] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [deleteEventConfirmOpen, setDeleteEventConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const [editStatsPlayer, setEditStatsPlayer] = useState<Player | null>(null);
  const [editStatsGameLines, setEditStatsGameLines] = useState<PlayerGameStatLine[]>([]);
  const [editStatsSelectedGame, setEditStatsSelectedGame] = useState<PlayerGameStatLine | null>(null);
  const [editStatsForm, setEditStatsForm] = useState<PlayerGameStats | null>(null);
  const [editStatsLoading, setEditStatsLoading] = useState(false);
  const [editStatsSaving, setEditStatsSaving] = useState(false);

  const router = useRouter();
  const { canEditTeams, canEditEvents } = usePermissions();

  useEffect(() => {
    if (editingPlayer) {
      setEditName(editingPlayer.name);
      setEditNumber(String(editingPlayer.number));
      setEditPosition(editingPlayer.position);
    }
  }, [editingPlayer]);

  const queryClient = useQueryClient();
  const { data: team, isPending, error } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => fetchTeam(teamId),
    enabled: !!teamId,
  });

  const { data: teamEvents = [] } = useQuery({
    queryKey: ["teamEvents", teamId],
    queryFn: () => fetchTeamEventsByTeam(teamId),
    enabled: !!teamId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: teamPlayerStats = [] } = useQuery({
    queryKey: ["teamPlayerStats", teamId],
    queryFn: () => fetchTeamPlayerStats(teamId),
    enabled: !!teamId && sectionTab === "stats",
  });

  const openEditStats = async (player: Player) => {
    setEditStatsPlayer(player);
    setEditStatsSelectedGame(null);
    setEditStatsForm(null);
    setEditStatsLoading(true);
    try {
      const lines = await fetchPlayerGameLines(player.id);
      setEditStatsGameLines(lines);
    } catch {
      setEditStatsGameLines([]);
    } finally {
      setEditStatsLoading(false);
    }
  };

  const closeEditStats = () => {
    setEditStatsPlayer(null);
    setEditStatsGameLines([]);
    setEditStatsSelectedGame(null);
    setEditStatsForm(null);
  };

  const selectGameLine = (line: PlayerGameStatLine) => {
    setEditStatsSelectedGame(line);
    setEditStatsForm({ ...line.stats });
  };

  const handleEditStatsSave = async () => {
    if (!editStatsSelectedGame || !editStatsForm || !editStatsPlayer) return;
    setEditStatsSaving(true);
    try {
      await upsertPlayerGameStats(
        editStatsSelectedGame.gameId,
        editStatsPlayer.id,
        "home",
        editStatsForm
      );
      await queryClient.invalidateQueries({ queryKey: ["teamPlayerStats", teamId] });
      await queryClient.refetchQueries({ queryKey: ["teamPlayerStats", teamId], type: "active" });
    } catch (e) {
      console.error(e);
    } finally {
      closeEditStats();
      setEditStatsSaving(false);
    }
  };

  const updateEditField = (key: keyof PlayerGameStats, value: number) => {
    if (!editStatsForm) return;
    let next = { ...editStatsForm, [key]: value };
    if (key === "offensiveRebounds" || key === "defensiveRebounds") {
      next = { ...next, rebounds: next.offensiveRebounds + next.defensiveRebounds };
    }
    setEditStatsForm(next);
  };

  const addPlayerMutation = useMutation({
    mutationFn: () =>
      addPlayerToTeam(teamId, {
        name: newName.trim() || "—",
        number: parseInt(newNumber, 10) || 0,
        position: newPosition.trim() || "—",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      setAddPlayerOpen(false);
      setNewName("");
      setNewNumber("");
      setNewPosition("");
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: () =>
      updatePlayer(editingPlayer!.id, {
        name: editName.trim() || "—",
        number: parseInt(editNumber, 10) || 0,
        position: editPosition.trim() || "—",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      setEditingPlayer(null);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: () => deletePlayer(editingPlayer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      setEditingPlayer(null);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () => deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setDeleteTeamConfirmOpen(false);
      router.push("/teams");
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: () =>
      updateTeam(teamId, {
        name: editTeamName.trim() || team.name,
        wins: Math.max(0, parseInt(editTeamWins, 10) || 0),
        losses: Math.max(0, parseInt(editTeamLosses, 10) || 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setEditTeamOpen(false);
    },
  });

  const createEventMutation = useMutation({
    mutationFn: createTeamEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamEvents"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteTeamEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamEvents"] });
    },
  });

  if (isPending || (!team && !error)) {
    return (
      <div className="min-h-screen bg-pb-dark flex items-center justify-center">
        <p className="text-pb-muted">Loading…</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-pb-dark flex items-center justify-center">
        <p className="text-pb-muted text-lg">Team not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex items-center justify-center size-11 shrink-0 rounded-full bg-pb-card active:bg-pb-card-hover transition-colors"
        >
          <ArrowLeft className="size-5 text-white" />
        </Link>
        <h1 className="flex-1 truncate text-2xl font-bold text-white">
          {team.name}
        </h1>
        {canEditTeams && (
          <button
            type="button"
            onClick={() => {
              setEditTeamName(team.name);
              setEditTeamWins(String(team.record.wins));
              setEditTeamLosses(String(team.record.losses));
              setEditTeamOpen(true);
            }}
            className="flex items-center justify-center size-11 shrink-0 rounded-full bg-pb-card text-white active:bg-pb-card-hover transition-colors"
            aria-label="Edit team"
          >
            <Edit className="size-5" />
          </button>
        )}
        {canEditTeams && (
          <button
            type="button"
            onClick={() => setDeleteTeamConfirmOpen(true)}
            className="flex items-center justify-center size-11 shrink-0 rounded-full bg-pb-card text-red-400 active:bg-pb-card-hover hover:bg-red-500/10 transition-colors"
            aria-label="Delete team"
          >
            <Trash2 className="size-5" />
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-pb-card rounded-[14px] p-4 text-center">
          <p className="text-2xl font-bold text-pb-orange">
            {team.record.wins}-{team.record.losses}
          </p>
          <p className="text-pb-muted text-sm mt-1">Record</p>
        </div>
        <div className="bg-pb-card rounded-[14px] p-4 text-center">
          <p className="text-2xl font-bold text-white">{team.players.length}</p>
          <p className="text-pb-muted text-sm mt-1">Players</p>
        </div>
      </div>

      {/* Roster / Stats / Events section with tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 rounded-xl bg-pb-surface p-1">
            <button
              type="button"
              onClick={() => setSectionTab("roster")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                sectionTab === "roster"
                  ? "bg-pb-orange text-white"
                  : "text-pb-muted active:text-white"
              }`}
            >
              Roster
            </button>
            <button
              type="button"
              onClick={() => setSectionTab("stats")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                sectionTab === "stats"
                  ? "bg-pb-orange text-white"
                  : "text-pb-muted active:text-white"
              }`}
            >
              Stats
            </button>
            <button
              type="button"
              onClick={() => setSectionTab("events")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                sectionTab === "events"
                  ? "bg-pb-orange text-white"
                  : "text-pb-muted active:text-white"
              }`}
            >
              Events
            </button>
          </div>
          {sectionTab === "roster" && canEditTeams && (
            <button
              type="button"
              onClick={() => setAddPlayerOpen(true)}
              className="flex items-center justify-center size-11 rounded-full bg-pb-orange active:bg-pb-orange/80 transition-colors"
            >
              <Plus className="size-5 text-white" />
            </button>
          )}
          {sectionTab === "events" && canEditEvents && (
            <button
              type="button"
              onClick={() => setAddEventOpen(true)}
              className="flex items-center justify-center size-11 rounded-full bg-pb-orange active:bg-pb-orange/80 transition-colors"
            >
              <Plus className="size-5 text-white" />
            </button>
          )}
        </div>

        {sectionTab === "roster" && (
          <div className="flex flex-col gap-2">
            {team.players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setEditingPlayer(player)}
                className="w-full flex items-center justify-between bg-pb-card rounded-[14px] px-4 py-3 text-left active:bg-pb-card-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-full bg-pb-active">
                    <span className="text-pb-orange font-bold text-sm">
                      {player.number}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{player.name}</p>
                    <p className="text-pb-muted text-sm">{player.position}</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-pb-muted" />
              </button>
            ))}
          </div>
        )}

        {sectionTab === "events" && (
          <div className="flex flex-col gap-2">
            {teamEvents.length === 0 ? (
              <p className="text-pb-muted text-center py-8 text-sm">
                No events yet. Tap + to add one.
              </p>
            ) : (
              teamEvents.map((evt) => {
                const typeColors: Record<string, string> = {
                  practice: "bg-pb-blue/20 text-pb-blue",
                  game: "bg-pb-orange/20 text-pb-orange",
                  meeting: "bg-green-500/20 text-green-400",
                  other: "bg-pb-muted/20 text-pb-muted",
                };
                return (
                  <div
                    key={evt.id}
                    className="bg-pb-card rounded-[14px] px-4 py-3 flex flex-col gap-1.5 cursor-pointer active:bg-pb-card-hover transition-colors"
                    onClick={() => {
                      setSelectedEvent(evt);
                      setEventDetailOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-white font-bold text-base truncate">{evt.title}</p>
                        <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[evt.type]}`}>
                          {evt.type}
                        </span>
                      </div>
                      {canEditEvents && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEventToDelete(evt.id); setDeleteEventConfirmOpen(true); }}
                          aria-label="Delete event"
                          className="shrink-0 flex items-center justify-center size-8 rounded-full text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-pb-muted text-sm">
                      {formatTeamEventDateTime(evt.date, evt.time)}
                    </p>
                    {evt.location ? (
                      <p className="text-pb-muted text-xs mt-0.5">📍 {evt.location}</p>
                    ) : null}
                    {evt.opponent ? (
                      <p className="text-pb-muted text-xs mt-0.5">vs {evt.opponent}</p>
                    ) : null}
                    {evt.notes ? (
                      <p className="text-pb-muted text-xs mt-0.5">{evt.notes}</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )}

        {sectionTab === "stats" && (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-xl bg-pb-surface p-1">
              <button
                type="button"
                onClick={() => setStatsView("perGame")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  statsView === "perGame"
                    ? "bg-pb-blue text-white"
                    : "text-pb-muted active:text-white"
                }`}
              >
                Per Game
              </button>
              <button
                type="button"
                onClick={() => setStatsView("total")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  statsView === "total"
                    ? "bg-pb-blue text-white"
                    : "text-pb-muted active:text-white"
                }`}
              >
                Total
              </button>
            </div>
            {teamPlayerStats.length === 0 ? (
              <p className="text-pb-muted text-center py-8 text-sm">
                No stats yet. Stats appear here once this team has played games.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-pb-border bg-pb-card">
                <table className="w-full min-w-[640px] text-xs">
                  <thead>
                    <tr className="border-b border-pb-border text-pb-muted">
                      <th className="sticky left-0 bg-pb-card px-3 py-2.5 text-left font-semibold">
                        Player
                      </th>
                      <th className="px-2 py-2.5 text-center font-semibold">GP</th>
                      <th className="px-2 py-2.5 text-center font-semibold">PTS</th>
                      <th className="px-2 py-2.5 text-center font-semibold">FG</th>
                      <th className="px-2 py-2.5 text-center font-semibold">3PT</th>
                      <th className="px-2 py-2.5 text-center font-semibold">FT</th>
                      <th className="px-2 py-2.5 text-center font-semibold">OREB</th>
                      <th className="px-2 py-2.5 text-center font-semibold">DREB</th>
                      <th className="px-2 py-2.5 text-center font-semibold">REB</th>
                      <th className="px-2 py-2.5 text-center font-semibold">AST</th>
                      <th className="px-2 py-2.5 text-center font-semibold">STL</th>
                      <th className="px-2 py-2.5 text-center font-semibold">BLK</th>
                      <th className="px-2 py-2.5 text-center font-semibold">TO</th>
                      <th className="px-2 py-2.5 text-center font-semibold">PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayerStats.map(({ player, gamesPlayed, total, perGame }) => {
                      const s = statsView === "perGame" ? perGame : total;
                      const fmt = (n: number) =>
                        statsView === "perGame" ? n.toFixed(1) : String(Math.round(n));
                      return (
                        <tr
                          key={player.id}
                          onClick={() => canEditTeams && openEditStats(player)}
                          className={`border-b border-pb-border/50 text-white${canEditTeams ? " cursor-pointer transition-colors hover:bg-pb-surface/40" : ""}`}
                        >
                          <td className="sticky left-0 bg-pb-card px-3 py-2 font-medium whitespace-nowrap">
                            #{player.number} {player.name}
                          </td>
                          <td className="px-2 py-2 text-center">{gamesPlayed}</td>
                          <td className="px-2 py-2 text-center font-bold">
                            {fmt(s.points)}
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
                            {fmt(s.offensiveRebounds)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {fmt(s.defensiveRebounds)}
                          </td>
                          <td className="px-2 py-2 text-center">{fmt(s.rebounds)}</td>
                          <td className="px-2 py-2 text-center">{fmt(s.assists)}</td>
                          <td className="px-2 py-2 text-center">{fmt(s.steals)}</td>
                          <td className="px-2 py-2 text-center">{fmt(s.blocks)}</td>
                          <td className="px-2 py-2 text-center">{fmt(s.turnovers)}</td>
                          <td className="px-2 py-2 text-center">{fmt(s.fouls)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Player Stats Dialog */}
      <Dialog open={!!editStatsPlayer} onOpenChange={(open) => !open && closeEditStats()}>
        <DialogContent className="max-h-[90dvh] max-w-lg border-pb-border bg-pb-dark text-white overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editStatsPlayer && `#${editStatsPlayer.number} ${editStatsPlayer.name}`}
            </DialogTitle>
            <p className="text-sm text-pb-muted">
              Select a game to edit stats for this player.
            </p>
          </DialogHeader>

          {editStatsLoading ? (
            <p className="py-6 text-center text-sm text-pb-muted">Loading games…</p>
          ) : editStatsGameLines.length === 0 ? (
            <p className="py-6 text-center text-sm text-pb-muted">
              No game stats found for this player.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {editStatsGameLines.map((line) => {
                  const isSelected = editStatsSelectedGame?.gameId === line.gameId;
                  return (
                    <button
                      key={line.gameId}
                      type="button"
                      onClick={() => selectGameLine(line)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-pb-orange text-white"
                          : "bg-pb-surface text-white hover:bg-pb-card-hover"
                      }`}
                    >
                      <span className="font-medium">vs {line.opponent}</span>
                      {line.gameDate && (
                        <span className="ml-2 text-xs text-pb-muted">{line.gameDate}</span>
                      )}
                      <span className="ml-2 text-xs text-pb-muted">
                        {line.stats.points} PTS
                      </span>
                    </button>
                  );
                })}
              </div>

              {editStatsForm && (
                <div className="rounded-lg border border-pb-border bg-pb-surface p-3">
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
                          value={editStatsForm[key]}
                          disabled={key === "rebounds"}
                          onChange={(e) => {
                            const v = parseInt(
                              e.target.value.replace(/\D/g, "") || "0",
                              10
                            );
                            updateEditField(key, v);
                          }}
                          className="h-8 border-pb-border bg-pb-card text-sm text-white disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeEditStats}
              disabled={editStatsSaving}
              className="border-pb-border text-white hover:bg-pb-card"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditStatsSave}
              disabled={!editStatsForm || editStatsSaving}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {editStatsSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="bg-pb-card border-pb-border text-white"
              />
              <Input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="bg-pb-card border-pb-border text-white"
              />
            </div>
            <select
              value={newEventType}
              onChange={(e) => setNewEventType(e.target.value as typeof newEventType)}
              className="w-full rounded-md border border-pb-border bg-pb-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pb-orange"
            >
              <option value="practice">Practice</option>
              <option value="game">Game</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
            <Input
              placeholder="Location (optional)"
              value={newEventLocation}
              onChange={(e) => setNewEventLocation(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Opponent (optional)"
              value={newEventOpponent}
              onChange={(e) => setNewEventOpponent(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Notes (optional)"
              value={newEventNotes}
              onChange={(e) => setNewEventNotes(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddEventOpen(false)}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={!newEventTitle.trim() || !newEventDate || createEventMutation.isPending}
              onClick={() => {
                createEventMutation.mutate(
                  {
                    teamId,
                    title: newEventTitle.trim(),
                    date: newEventDate,
                    time: newEventTime,
                    type: newEventType,
                    location: newEventLocation.trim(),
                    opponent: newEventOpponent.trim(),
                    notes: newEventNotes.trim(),
                  },
                  {
                    onSuccess: () => {
                      setAddEventOpen(false);
                      setNewEventTitle("");
                      setNewEventDate("");
                      setNewEventTime("");
                      setNewEventType("practice");
                      setNewEventNotes("");
                      setNewEventLocation("");
                      setNewEventOpponent("");
                    },
                  }
                );
              }}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {createEventMutation.isPending ? "Adding…" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Number"
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Position"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddPlayerOpen(false)}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => addPlayerMutation.mutate()}
              disabled={addPlayerMutation.isPending}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {addPlayerMutation.isPending ? "Adding…" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog
        open={!!editingPlayer}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlayer(null);
            setIsEditingPlayer(false);
            setDeletePlayerConfirmOpen(false);
          }
        }}
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditingPlayer ? "Edit Player" : "Player Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-pb-muted mb-1 block">Name</label>
              <Input
                placeholder="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                readOnly={!isEditingPlayer}
                className={`bg-pb-card border-pb-border text-white ${!isEditingPlayer ? "opacity-80 cursor-default" : ""}`}
              />
            </div>
            <div>
              <label className="text-xs text-pb-muted mb-1 block">Number</label>
              <Input
                placeholder="Number"
                type="number"
                min={0}
                max={99}
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                readOnly={!isEditingPlayer}
                className={`bg-pb-card border-pb-border text-white ${!isEditingPlayer ? "opacity-80 cursor-default" : ""}`}
              />
            </div>
            <div>
              <label className="text-xs text-pb-muted mb-1 block">Position</label>
              <Input
                placeholder="Position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                readOnly={!isEditingPlayer}
                className={`bg-pb-card border-pb-border text-white ${!isEditingPlayer ? "opacity-80 cursor-default" : ""}`}
              />
            </div>
          </div>
          {isEditingPlayer ? (
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (editingPlayer) {
                    setEditName(editingPlayer.name);
                    setEditNumber(String(editingPlayer.number));
                    setEditPosition(editingPlayer.position);
                  }
                  setIsEditingPlayer(false);
                }}
                className="border-pb-border text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updatePlayerMutation.mutate(undefined, {
                    onSuccess: () => setIsEditingPlayer(false),
                  });
                }}
                disabled={
                  updatePlayerMutation.isPending ||
                  editNumber === "" ||
                  Number.isNaN(parseInt(editNumber, 10)) ||
                  parseInt(editNumber, 10) < 0 ||
                  parseInt(editNumber, 10) > 99
                }
                className="bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                {updatePlayerMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              {canEditTeams && (
                <Button
                  variant="outline"
                  onClick={() => setDeletePlayerConfirmOpen(true)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400 order-3 sm:order-1"
                >
                  Delete Player
                </Button>
              )}
              <div className="flex gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingPlayer(null);
                    setIsEditingPlayer(false);
                  }}
                  className="border-pb-border text-white"
                >
                  Close
                </Button>
                {canEditTeams && (
                  <Button
                    onClick={() => setIsEditingPlayer(true)}
                    className="bg-pb-orange text-white hover:bg-pb-orange/90"
                  >
                    <Edit className="size-4 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Player Confirmation */}
      <Dialog
        open={deletePlayerConfirmOpen}
        onOpenChange={(open) =>
          !deletePlayerMutation.isPending && setDeletePlayerConfirmOpen(open)
        }
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete player?</DialogTitle>
            <p className="text-sm text-pb-muted">
              Are you sure you want to remove {editingPlayer?.name ?? "this player"} from the team?
              This cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletePlayerConfirmOpen(false)}
              disabled={deletePlayerMutation.isPending}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                deletePlayerMutation.mutate(undefined, {
                  onSuccess: () => {
                    setDeletePlayerConfirmOpen(false);
                    setEditingPlayer(null);
                  },
                });
              }}
              disabled={deletePlayerMutation.isPending || !editingPlayer}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletePlayerMutation.isPending ? "Deleting…" : "Delete player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventDetailSheet
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={(open) => {
          setEventDetailOpen(open);
          if (!open) setSelectedEvent(null);
        }}
      />

      {/* Delete Event Confirmation */}
      <Dialog
        open={deleteEventConfirmOpen}
        onOpenChange={setDeleteEventConfirmOpen}
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete event?</DialogTitle>
            <p className="text-sm text-pb-muted">
              Are you sure you want to delete this event? This cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setDeleteEventConfirmOpen(false); setEventToDelete(null); }}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteEventMutation.isPending}
              onClick={() => {
                if (eventToDelete) {
                  deleteEventMutation.mutate(eventToDelete, {
                    onSuccess: () => {
                      setDeleteEventConfirmOpen(false);
                      setEventToDelete(null);
                    },
                  });
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteEventMutation.isPending ? "Deleting…" : "Delete event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation */}
      <Dialog
        open={deleteTeamConfirmOpen}
        onOpenChange={(open) => !deleteTeamMutation.isPending && setDeleteTeamConfirmOpen(open)}
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete team?</DialogTitle>
            <p className="text-sm text-pb-muted">
              Are you sure you want to delete {team.name}? This will remove the
              team and all its players. This cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTeamConfirmOpen(false)}
              disabled={deleteTeamMutation.isPending}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteTeamMutation.mutate()}
              disabled={deleteTeamMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteTeamMutation.isPending ? "Deleting…" : "Delete team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog
        open={editTeamOpen}
        onOpenChange={(open) => !updateTeamMutation.isPending && setEditTeamOpen(open)}
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-pb-muted mb-1 block">Team Name</label>
              <Input
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                placeholder="Team name"
                className="bg-pb-card border-pb-border text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-pb-muted mb-1 block">Wins</label>
                <Input
                  type="number"
                  min={0}
                  value={editTeamWins}
                  onChange={(e) => setEditTeamWins(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
              <div>
                <label className="text-xs text-pb-muted mb-1 block">Losses</label>
                <Input
                  type="number"
                  min={0}
                  value={editTeamLosses}
                  onChange={(e) => setEditTeamLosses(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditTeamOpen(false)}
              disabled={updateTeamMutation.isPending}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateTeamMutation.mutate()}
              disabled={updateTeamMutation.isPending || !editTeamName.trim()}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              {updateTeamMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
