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
  Trash2,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam } from "@/lib/supabase-queries";
import { PageTransition } from "@/components/layout/PageTransition";
import { AddTeamModal, type CreatedTeamData } from "@/components/AddTeamModal";
import { useEventsStore, type TeamEvent, type TeamEventType } from "@/store/eventsStore";
import { EventDetailSheet } from "@/components/events/EventDetailSheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const coachTools = [
  { label: "Practice Planner", href: "/practice", icon: CalendarDays },
  { label: "Game Center", href: "/game-center", icon: Trophy },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "White Board", href: "/whiteboard", icon: PenTool },
];

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function sortedUpcoming(events: ReturnType<typeof useEventsStore.getState>["events"]) {
  const today = new Date().toISOString().slice(0, 10);
  return [...events]
    .sort((a, b) => {
      const diffA = Math.abs(new Date(a.date).getTime() - new Date(today).getTime());
      const diffB = Math.abs(new Date(b.date).getTime() - new Date(today).getTime());
      return diffA - diffB;
    });
}

export default function HomePage() {
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState<TeamEventType>("practice");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventOpponent, setNewEventOpponent] = useState("");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [newEventTeamId, setNewEventTeamId] = useState("");
  const queryClient = useQueryClient();
  const allEvents = useEventsStore((s) => s.events);
  const addEvent = useEventsStore((s) => s.addEvent);
  const removeEvent = useEventsStore((s) => s.removeEvent);
  const { canEditEvents } = usePermissions();
  const upcomingEvents = sortedUpcoming(allEvents);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 0,
    refetchOnMount: true,
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
      queryClient.refetchQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      console.error("Failed to create team:", error);
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
            className="rounded-[10px] bg-pb-active px-3 py-2 text-xs font-semibold text-pb-orange border-t-[2px] border-r-[2px] border-b-[2px] border-l-[2px] rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px]"
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

      {/* Upcoming Events */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={24} className="text-pb-blue" />
            <h2 className="text-lg font-semibold text-pb-blue">
              Upcoming Events
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAddEventOpen(true)}
            className="rounded-[10px] bg-pb-active px-3 py-2 text-xs font-semibold text-pb-orange border-t-[2px] border-r-[2px] border-b-[2px] border-l-[2px] rounded-tl-[20px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px]"
          >
            + Add Event
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {upcomingEvents.length === 0 ? (
            <p className="text-pb-muted text-sm text-center py-6">
              No events yet. Add one from any team&apos;s Events tab.
            </p>
          ) : (
            upcomingEvents.slice(0, 3).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-[14px] bg-pb-card px-4 py-4 active:bg-pb-card-hover transition-colors"
              >
                <button
                  type="button"
                  onClick={() => { setSelectedEvent(evt); setEventDetailOpen(true); }}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-bold text-white">{evt.title}</p>
                  <p className="mt-1 text-xs text-pb-muted">
                    {evt.date}{evt.time ? ` · ${formatTime(evt.time)}` : ""} · {evt.teamName}
                  </p>
                </button>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pb-active text-pb-orange capitalize">
                    {evt.type}
                  </span>
                  {canEditEvents && (
                    <button
                      type="button"
                      onClick={() => removeEvent(evt.id)}
                      aria-label="Delete event"
                      className="flex items-center justify-center size-8 rounded-full text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>

    <EventDetailSheet
      event={selectedEvent}
      open={eventDetailOpen}
      onOpenChange={(open) => { setEventDetailOpen(open); if (!open) setSelectedEvent(null); }}
    />

    <AddTeamModal
      open={addTeamOpen}
      onOpenChange={setAddTeamOpen}
      onCreated={handleTeamCreated}
    />

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
            onChange={(e) => setNewEventType(e.target.value as TeamEventType)}
            className="w-full rounded-md border border-pb-border bg-pb-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pb-orange"
          >
            <option value="practice">Practice</option>
            <option value="game">Game</option>
            <option value="meeting">Meeting</option>
            <option value="other">Other</option>
          </select>
          <select
            value={newEventTeamId}
            onChange={(e) => setNewEventTeamId(e.target.value)}
            className="w-full rounded-md border border-pb-border bg-pb-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pb-orange"
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
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
            disabled={!newEventTitle.trim() || !newEventDate || !newEventTeamId}
            onClick={() => {
              const selectedTeam = teams.find((t) => t.id === newEventTeamId);
              addEvent({
                id: crypto.randomUUID(),
                teamId: newEventTeamId,
                teamName: selectedTeam?.name ?? "",
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
              setNewEventLocation("");
              setNewEventOpponent("");
              setNewEventNotes("");
              setNewEventTeamId("");
            }}
            className="bg-pb-orange text-white hover:bg-pb-orange/90"
          >
            Add Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </PageTransition>
  );
}
