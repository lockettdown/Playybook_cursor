"use client";

import { CalendarDays } from "lucide-react";
import { useEventsStore, type TeamEvent } from "@/store/eventsStore";
import { PageTransition } from "@/components/layout/PageTransition";

const typeColors: Record<string, string> = {
  practice: "bg-pb-blue/20 text-pb-blue",
  game: "bg-pb-orange/20 text-pb-orange",
  meeting: "bg-green-500/20 text-green-400",
  other: "bg-pb-muted/20 text-pb-muted",
};

function sortedByDate(events: TeamEvent[]): TeamEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return [...events].sort((a, b) => {
    const diffA = Math.abs(new Date(a.date).getTime() - new Date(today).getTime());
    const diffB = Math.abs(new Date(b.date).getTime() - new Date(today).getTime());
    if (diffA !== diffB) return diffA - diffB;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.time ?? "") < (b.time ?? "") ? -1 : 1;
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function EventsPage() {
  const events = useEventsStore((s) => s.events);
  const sorted = sortedByDate(events);

  return (
    <PageTransition>
      <div className="px-4 pt-6 pb-24">
        <header className="flex items-center gap-2 mb-6">
          <CalendarDays size={28} className="shrink-0 text-pb-orange" />
          <h1 className="text-2xl font-bold text-white">Events</h1>
        </header>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarDays size={48} className="text-pb-muted mb-4" />
            <p className="text-white font-semibold text-lg">No events yet</p>
            <p className="text-pb-muted text-sm mt-1">
              Add events from each team's Events tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((evt) => (
              <div
                key={evt.id}
                className="bg-pb-card rounded-[14px] px-4 py-4 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-bold text-base truncate">{evt.title}</p>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[evt.type]}`}>
                    {evt.type}
                  </span>
                </div>
                <p className="text-pb-muted text-sm">
                  {formatDate(evt.date)}{evt.time ? ` · ${evt.time}` : ""}
                </p>
                <p className="text-pb-orange text-xs font-medium">{evt.teamName}</p>
                {evt.notes ? (
                  <p className="text-pb-muted text-xs mt-0.5">{evt.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
