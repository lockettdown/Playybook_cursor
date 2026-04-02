"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, X, MapPin, Trophy } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeamEvent, deleteTeamEvent } from "@/lib/supabase-queries";
import type { TeamEvent, TeamEventType } from "@/lib/supabase-queries";

const typeColors: Record<string, string> = {
  practice: "bg-pb-blue/20 text-pb-blue",
  game: "bg-pb-orange/20 text-pb-orange",
  meeting: "bg-green-500/20 text-green-400",
  other: "bg-pb-muted/20 text-pb-muted",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

interface EventDetailSheetProps {
  event: TeamEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailSheet({ event, open, onOpenChange }: EventDetailSheetProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState<TeamEventType>("practice");
  const [editLocation, setEditLocation] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateTeamEvent>[1] }) =>
      updateTeamEvent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamEvents"] });
      setEditing(false);
      onOpenChange(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeamEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamEvents"] });
      onOpenChange(false);
    },
  });

  function startEditing() {
    if (!event) return;
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditTime(event.time);
    setEditType(event.type);
    setEditLocation(event.location);
    setEditOpponent(event.opponent);
    setEditNotes(event.notes);
    setEditing(true);
  }

  function handleSave() {
    if (!event) return;
    updateMutation.mutate({
      id: event.id,
      updates: {
        title: editTitle.trim() || event.title,
        date: editDate || event.date,
        time: editTime,
        type: editType,
        location: editLocation.trim(),
        opponent: editOpponent.trim(),
        notes: editNotes.trim(),
      },
    });
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false);
    }
    onOpenChange(open);
  }

  if (!event) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-pb-dark border-pb-border rounded-t-2xl h-[100dvh] max-h-[100dvh] flex flex-col p-0"
        >
        <SheetHeader className="px-5 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-white text-lg font-bold truncate">
                {editing ? "Edit Event" : event.title}
              </SheetTitle>
              {!editing && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={startEditing}
                    className="bg-pb-orange text-white hover:bg-pb-orange/90"
                  >
                    <Edit className="size-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="shrink-0 flex items-center justify-center size-8 rounded-full bg-pb-card text-pb-muted hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <SheetDescription className="sr-only">
            Event details
          </SheetDescription>
        </SheetHeader>

        {editing ? (
          <>
            <div className="px-5 pt-4 pb-28 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-pb-muted text-xs font-medium mb-1 block">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-pb-muted text-xs font-medium mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-pb-card border-pb-border text-white"
                  />
                </div>
                <div>
                  <label className="text-pb-muted text-xs font-medium mb-1 block">Time</label>
                  <Input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="bg-pb-card border-pb-border text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-pb-muted text-xs font-medium mb-1 block">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as TeamEventType)}
                  className="w-full rounded-md border border-pb-border bg-pb-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pb-orange"
                >
                  <option value="practice">Practice</option>
                  <option value="game">Game</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-pb-muted text-xs font-medium mb-1 block">Location</label>
                <Input
                  placeholder="Optional"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
              <div>
                <label className="text-pb-muted text-xs font-medium mb-1 block">Opponent</label>
                <Input
                  placeholder="Optional"
                  value={editOpponent}
                  onChange={(e) => setEditOpponent(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
              <div>
                <label className="text-pb-muted text-xs font-medium mb-1 block">Notes</label>
                <Input
                  placeholder="Optional"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-pb-card border-pb-border text-white"
                />
              </div>
            </div>
            <div className="sticky bottom-0 z-10 flex gap-2 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shrink-0 border-t border-pb-border bg-pb-dark">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 border-pb-border text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editTitle.trim() || !editDate || updateMutation.isPending}
                className="flex-1 bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 pt-3 pb-28 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Title</p>
                  <p className="text-white text-sm">{event.title}</p>
                </div>

                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Date & Time</p>
                  <p className="text-white text-sm">
                    {formatDate(event.date)}
                    {event.time ? ` · ${formatTime(event.time)}` : ""}
                  </p>
                </div>

                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Type</p>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[event.type]}`}>
                    {event.type}
                  </span>
                </div>

                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Location</p>
                  {event.location ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-pb-muted" />
                      <p className="text-white text-sm">{event.location}</p>
                    </div>
                  ) : (
                    <p className="text-pb-muted text-sm">—</p>
                  )}
                </div>

                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Opponent</p>
                  <p className={event.opponent ? "text-white text-sm" : "text-pb-muted text-sm"}>
                    {event.opponent ? `vs ${event.opponent}` : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Notes</p>
                  <p className={event.notes ? "text-white text-sm" : "text-pb-muted text-sm"}>
                    {event.notes || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex gap-2 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shrink-0 border-t border-pb-border bg-pb-dark">
              {event.type === "game" && (
                <Button
                  onClick={() => {
                    const params = event.opponent ? `?opponent=${encodeURIComponent(event.opponent)}` : "";
                    onOpenChange(false);
                    router.push(`/game-center${params}`);
                  }}
                  className="w-full bg-pb-blue text-white hover:bg-pb-blue/90"
                >
                  <Trophy className="size-4 mr-2" />
                  Score
                </Button>
              )}
            </div>
          </>
        )}
        </SheetContent>
      </Sheet>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete event?</DialogTitle>
            <p className="text-sm text-pb-muted">
              Are you sure you want to delete this event? This cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-pb-border text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(event.id, {
                  onSuccess: () => setDeleteConfirmOpen(false),
                })
              }
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
