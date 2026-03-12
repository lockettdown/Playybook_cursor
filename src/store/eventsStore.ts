import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TeamEventType = "practice" | "game" | "meeting" | "other";

export interface TeamEvent {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  date: string;
  time: string;
  type: TeamEventType;
  location: string;
  opponent: string;
  notes: string;
}

interface EventsState {
  events: TeamEvent[];
  addEvent: (event: TeamEvent) => void;
  updateEvent: (id: string, updates: Partial<Omit<TeamEvent, "id">>) => void;
  removeEvent: (id: string) => void;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set((state) => ({ events: [...state.events, event] })),
      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      removeEvent: (id) =>
        set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
    }),
    { name: "playybook-team-events" }
  )
);
