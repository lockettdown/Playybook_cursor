"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Trophy,
  PenTool,
  Users,
  ChevronRight,
  LayoutGrid,
  MessageCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam } from "@/lib/supabase-queries";
import { PageTransition } from "@/components/layout/PageTransition";
import { AddTeamModal, type CreatedTeamData } from "@/components/AddTeamModal";

const coachTools = [
  { label: "Practice Planner", href: "/practice", icon: CalendarDays },
  { label: "Game Center", href: "/game-center", icon: Trophy },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "White Board", href: "/whiteboard", icon: PenTool },
];

export default function HomePage() {
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams = [] } = useQuery({
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
    <PageTransition>
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white">Welcome back, Coach</h1>

      {/* Coach's Tools */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <LayoutGrid size={24} className="text-pb-blue" />
          <h2 className="text-lg font-semibold text-pb-blue">
            Coach&apos;s Tools
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {coachTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex flex-col gap-3 rounded-[14px] bg-pb-card p-4 transition-colors active:bg-pb-card-hover"
              >
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-pb-active">
                  <Icon size={24} className="text-pb-orange" />
                </div>
                <span className="text-sm font-bold text-white">
                  {tool.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* My Teams */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-pb-blue" />
            <h2 className="text-lg font-semibold text-pb-blue">My Teams</h2>
          </div>
          <button
            type="button"
            onClick={() => setAddTeamOpen(true)}
            className="rounded-[10px] bg-pb-active px-3 py-2 text-xs font-semibold text-pb-orange"
          >
            + Add Team
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="flex items-center justify-between rounded-[14px] bg-pb-card px-4 py-4 transition-colors active:bg-pb-card-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-pb-active">
                  <Users size={20} className="text-pb-orange" />
                </div>
                <span className="text-sm font-bold text-white">
                  {team.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-[10px] bg-pb-active px-3 py-2 text-xs font-semibold text-pb-orange">
                  Manage
                </span>
                <ChevronRight size={16} className="text-pb-muted" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Practice */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <CalendarDays size={24} className="text-pb-blue" />
          <h2 className="text-lg font-semibold text-pb-blue">
            Upcoming Practice
          </h2>
        </div>

        <Link
          href="/practice"
          className="mt-3 flex items-center justify-between rounded-[14px] bg-pb-card px-4 py-4 transition-colors active:bg-pb-card-hover"
        >
          <div>
            <p className="text-sm font-bold text-white">Tuesday Practice</p>
            <p className="mt-1 text-xs text-pb-muted">
              Feb 24 &middot; 100 min &middot; Varsity Tigers
            </p>
          </div>
          <ChevronRight size={20} className="text-pb-muted" />
        </Link>
      </section>
    </div>

    <AddTeamModal
      open={addTeamOpen}
      onOpenChange={setAddTeamOpen}
      onCreated={handleTeamCreated}
    />
    </PageTransition>
  );
}
