"use client";

import Link from "next/link";
import { Users, Plus, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam } from "@/lib/supabase-queries";
import { AddTeamModal, type CreatedTeamData } from "@/components/AddTeamModal";
import { useState } from "react";

export default function TeamsPage() {
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams = [], isPending, error } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: CreatedTeamData) => {
      const players = data.members
        .filter((m) => m.name.trim() || m.number.trim() || m.position.trim())
        .map((m) => ({
          id: m.id,
          name: m.name.trim() || "—",
          number: parseInt(m.number, 10) || 0,
          position: m.position.trim() || "—",
        }));
      return createTeam(data.teamName, players);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setAddTeamOpen(false);
    },
  });

  const handleTeamCreated = (data: CreatedTeamData) => {
    createTeamMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-full bg-pb-blue/20">
            <Users className="size-5 text-pb-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
        </div>
        <button
          type="button"
          onClick={() => setAddTeamOpen(true)}
          className="flex items-center justify-center size-11 rounded-full bg-pb-orange active:bg-pb-orange/80 transition-colors"
        >
          <Plus className="size-5 text-white" />
        </button>
      </div>

      {isPending && (
        <p className="text-pb-muted text-sm">Loading teams…</p>
      )}
      {error && (
        <p className="text-red-400 text-sm">Failed to load teams. Try again.</p>
      )}
      {!isPending && !error && (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <div className="flex items-center justify-between bg-pb-card rounded-[14px] p-4 active:bg-pb-card-hover transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-white font-bold text-lg">{team.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-pb-orange font-semibold">
                      {team.record.wins}-{team.record.losses}
                    </span>
                    <span className="text-pb-muted text-sm">
                      {team.players.length} players
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-pb-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <AddTeamModal
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        onCreated={handleTeamCreated}
      />
    </div>
  );
}
