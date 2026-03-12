"use client";

import { useState } from "react";
import { Edit, X, MapPin, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEventsStore, type TeamEvent, type TeamEventType } from "@/store/eventsStore";
import { usePermissions } from "@/hooks/usePermissions";

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

interface EventDetailSheetProps {
  event: TeamEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailSheet({ event, open, onOpenChange }: EventDetailSheetProps) {
  const { canEditEvents } = usePermissions();
  const updateEvent = useEventsStore((s) => s.updateEvent);
  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState<TeamEventType>("practice");
  const [editLocation, setEditLocation] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editNotes, setEditNotes] = useState("");

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
    updateEvent(event.id, {
      title: editTitle.trim() || event.title,
      date: editDate || event.date,
      time: editTime,
      type: editType,
      location: editLocation.trim(),
      opponent: editOpponent.trim(),
      notes: editNotes.trim(),
    });
    setEditing(false);
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-pb-dark border-pb-border rounded-t-2xl max-h-[85vh] overflow-y-auto p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-white text-lg font-bold truncate">
              {editing ? "Edit Event" : event.title}
            </SheetTitle>
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
          <div className="px-5 pb-5 pt-4 space-y-3">
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
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 border-pb-border text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editTitle.trim() || !editDate}
                className="flex-1 bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-3">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[event.type]}`}>
                {event.type}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-pb-muted text-xs font-medium mb-0.5">Date & Time</p>
                <p className="text-white text-sm">
                  {formatDate(event.date)}
                  {event.time ? ` · ${event.time}` : ""}
                </p>
              </div>

              <div>
                <p className="text-pb-muted text-xs font-medium mb-0.5">Team</p>
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-pb-orange" />
                  <p className="text-white text-sm">{event.teamName}</p>
                </div>
              </div>

              {event.location && (
                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Location</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-pb-muted" />
                    <p className="text-white text-sm">{event.location}</p>
                  </div>
                </div>
              )}

              {event.opponent && (
                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Opponent</p>
                  <p className="text-white text-sm">vs {event.opponent}</p>
                </div>
              )}

              {event.notes && (
                <div>
                  <p className="text-pb-muted text-xs font-medium mb-0.5">Notes</p>
                  <p className="text-white text-sm">{event.notes}</p>
                </div>
              )}
            </div>

            {canEditEvents && (
              <Button
                onClick={startEditing}
                className="w-full mt-5 bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                <Edit className="size-4 mr-2" />
                Edit Event
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
