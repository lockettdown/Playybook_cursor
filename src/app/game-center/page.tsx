"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createGame } from "@/lib/supabase-queries";
import type { Team } from "@/types";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STORAGE_KEY_TEAM = "playybook-game-center-team-id";
const STORAGE_KEY_OPPONENT = "playybook-game-center-opponent";

type Step = "intro" | "matchup";

export default function GameCenterPage() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const allTeams: Team[] = teams;
  const selectedTeam = selectedTeamId
    ? allTeams.find((t) => t.id === selectedTeamId)
    : null;
  const canContinue =
    selectedTeam != null && opponentName.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTeam = sessionStorage.getItem(STORAGE_KEY_TEAM);
    const storedOpponent = sessionStorage.getItem(STORAGE_KEY_OPPONENT);
    if (storedTeam && allTeams.some((t) => t.id === storedTeam))
      setSelectedTeamId(storedTeam);
    if (storedOpponent) setOpponentName(storedOpponent);
  }, [allTeams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTeamId)
      sessionStorage.setItem(STORAGE_KEY_TEAM, selectedTeamId);
    if (opponentName.trim())
      sessionStorage.setItem(STORAGE_KEY_OPPONENT, opponentName.trim());
  }, [selectedTeamId, opponentName]);

  const createGameMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeam) throw new Error("No team selected");
      return createGame(
        selectedTeam.name,
        opponentName.trim(),
        selectedTeam.players,
        selectedTeam.id
      );
    },
    onSuccess: (game) => {
      router.push(`/game-center/${game.id}`);
    },
  });

  const handleContinue = () => {
    if (!canContinue) return;
    setStep("matchup");
  };

  const handleBack = () => {
    setStep("intro");
  };

  const handleStartGame = () => {
    if (!selectedTeam) return;
    createGameMutation.mutate();
  };

  // ───── Matchup view: My Team vs Opponent ─────
  if (step === "matchup" && selectedTeam) {
    return (
      <PageTransition>
        <div className="px-4 pt-6 pb-24 md:pb-8">
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors active:bg-pb-card"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              <Trophy size={28} className="text-pb-blue" />
              <h1 className="text-2xl font-bold text-white">Game Center</h1>
            </div>
          </header>

          <div className="mt-8 flex flex-col items-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-pb-muted">
              Matchup
            </p>
            <div className="mt-6 flex w-full max-w-sm flex-col gap-4 rounded-[14px] bg-pb-card p-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-14 items-center justify-center rounded-full bg-pb-orange/20">
                  <Users size={28} className="text-pb-orange" />
                </div>
                <p className="text-center text-lg font-bold text-white">
                  {selectedTeam.name}
                </p>
                <p className="text-xs text-pb-muted">Your team</p>
              </div>
              <p className="text-center text-xl font-bold text-pb-muted">vs</p>
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-14 items-center justify-center rounded-full bg-pb-blue/20">
                  <Users size={28} className="text-pb-blue" />
                </div>
                <p className="text-center text-lg font-bold text-white">
                  {opponentName.trim()}
                </p>
                <p className="text-xs text-pb-muted">Opponent</p>
              </div>
            </div>
            <Button
              onClick={handleStartGame}
              disabled={createGameMutation.isPending}
              className="mt-8 w-full max-w-sm bg-pb-orange text-white hover:bg-pb-orange/90"
              size="lg"
            >
              {createGameMutation.isPending ? "Starting…" : "Start Game"}
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ───── Intro: pick team + enter opponent ─────
  return (
    <PageTransition>
      <div className="px-4 pt-6 pb-24 md:pb-8">
        <header className="flex items-center gap-2">
          <Trophy size={28} className="text-pb-blue" />
          <h1 className="text-2xl font-bold text-white">Game Center</h1>
        </header>
        <p className="mt-2 text-sm text-pb-muted">
          Choose your team and enter your opponent to get started.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-pb-blue">Your team</h2>
          {allTeams.length === 0 ? (
            <p className="mt-2 text-sm text-pb-muted">
              You don’t have a team yet. Create one to continue.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {allTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`flex items-center justify-between rounded-[14px] p-4 text-left transition-colors active:bg-pb-card-hover ${
                    selectedTeamId === team.id
                      ? "bg-pb-orange/20 ring-2 ring-pb-orange"
                      : "bg-pb-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-pb-active">
                      <Users size={24} className="text-pb-orange" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{team.name}</p>
                      <p className="text-xs text-pb-muted">
                        {team.record.wins}-{team.record.losses} · {team.players.length} players
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-pb-muted" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-pb-blue">Opponent</h2>
          <p className="mt-1 text-sm text-pb-muted">
            Who are you playing against?
          </p>
          <Input
            type="text"
            placeholder="Enter opponent team name"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            className="mt-3 bg-pb-card text-white placeholder:text-pb-muted border-pb-border"
          />
        </section>

        <div className="mt-10">
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full bg-pb-orange text-white hover:bg-pb-orange/90 disabled:opacity-50"
            size="lg"
          >
            Continue
          </Button>
        </div>

      </div>
    </PageTransition>
  );
}
