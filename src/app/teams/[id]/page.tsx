"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeam, addPlayerToTeam, updatePlayer, deletePlayer, deleteTeam, fetchTeamPlayerStats } from "@/lib/supabase-queries";
import type { Player } from "@/types";
import { useEventsStore, type TeamEventType } from "@/store/eventsStore";
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

  type SectionTab = "roster" | "stats" | "events";
  const [sectionTab, setSectionTab] = useState<SectionTab>("roster");
  const [statsView, setStatsView] = useState<"perGame" | "total">("perGame");
  const [deleteTeamConfirmOpen, setDeleteTeamConfirmOpen] = useState(false);

  const addEvent = useEventsStore((s) => s.addEvent);
  const allEvents = useEventsStore((s) => s.events);
  const teamEvents = allEvents.filter((e) => e.teamId === teamId);

  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<TeamEventType>("practice");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventOpponent, setNewEventOpponent] = useState("");

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

  const { data: teamPlayerStats = [] } = useQuery({
    queryKey: ["teamPlayerStats", teamId],
    queryFn: () => fetchTeamPlayerStats(teamId),
    enabled: !!teamId && sectionTab === "stats",
  });

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

      {/* Roster / Stats section with tabs */}
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
              <div
                key={player.id}
                className="flex items-center justify-between bg-pb-card rounded-[14px] px-4 py-3"
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
                {canEditTeams && (
                  <button
                    type="button"
                    onClick={() => setEditingPlayer(player)}
                    className="flex items-center justify-center size-11 rounded-full active:bg-pb-card-hover transition-colors"
                    aria-label={`Edit ${player.name}`}
                  >
                    <Edit className="size-4 text-pb-muted" />
                  </button>
                )}
              </div>
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
                    className="flex items-start justify-between bg-pb-card rounded-[14px] px-4 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold">{evt.title}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[evt.type]}`}>
                          {evt.type}
                        </span>
                      </div>
                      <p className="text-pb-muted text-sm">
                        {evt.date}{evt.time ? ` · ${evt.time}` : ""}
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
                          className="border-b border-pb-border/50 text-white"
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
              disabled={!newEventTitle.trim() || !newEventDate}
              onClick={() => {
                addEvent({
                  id: crypto.randomUUID(),
                  teamId,
                  teamName: team?.name ?? "",
                  title: newEventTitle.trim(),
                  date: newEventDate,
                  time: newEventTime,
                  type: newEventType,
                  location: newEventLocation.trim(),
                  opponent: newEventOpponent.trim(),
                  notes: newEventNotes.trim(),
                });
                setAddEventOpen(false);
                setNewEventTitle("");
                setNewEventDate("");
                setNewEventTime("");
                setNewEventType("practice");
                setNewEventNotes("");
                setNewEventLocation("");
                setNewEventOpponent("");
              }}
              className="bg-pb-orange text-white hover:bg-pb-orange/90"
            >
              Add Event
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
        onOpenChange={(open) => !open && setEditingPlayer(null)}
      >
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Number"
              type="number"
              min={0}
              max={99}
              value={editNumber}
              onChange={(e) => setEditNumber(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
            <Input
              placeholder="Position"
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
              className="bg-pb-card border-pb-border text-white"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={() => deletePlayerMutation.mutate()}
              disabled={deletePlayerMutation.isPending}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400 order-2 sm:order-1"
            >
              {deletePlayerMutation.isPending ? "Deleting…" : "Delete Player"}
            </Button>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={() => setEditingPlayer(null)}
                className="border-pb-border text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => updatePlayerMutation.mutate()}
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
            </div>
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
    </div>
  );
}
