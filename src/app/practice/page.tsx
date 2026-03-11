"use client";

import Link from "next/link";
import {
  CalendarDays,
  Play,
  Plus,
  Save,
  GripVertical,
  MoreVertical,
  Clock,
} from "lucide-react";
import { practicePlans, teams } from "@/lib/mock-data";
import type { PracticeBlock, PracticeBlockType } from "@/types";
import { PageTransition } from "@/components/layout/PageTransition";

const plan = practicePlans[0];
const team = teams.find((t) => t.id === plan.teamId);

const blockTypeStyles: Record<
  PracticeBlockType,
  string
> = {
  warmup: "bg-pb-card",
  skill: "bg-[#3a2a1a]",
  team: "bg-[#3d2e1a]",
  situational: "bg-[#352820]",
  cooldown: "bg-pb-card",
};

function TimelineBlock({ block }: { block: PracticeBlock }) {
  const bgClass = blockTypeStyles[block.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] p-4 transition-colors active:bg-pb-card-hover ${bgClass}`}
    >
      <button
        type="button"
        className="mt-1 shrink-0 touch-manipulation text-pb-muted active:text-pb-orange"
        aria-label="Drag to reorder"
      >
        <GripVertical size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-white">{block.name}</h3>
        <p className="mt-0.5 truncate text-sm text-pb-muted">{block.description}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-pb-orange">
        {block.duration} min
      </span>
      <button
        type="button"
        className="shrink-0 rounded p-1.5 text-pb-muted active:bg-pb-active active:text-pb-orange"
        aria-label="More options"
      >
        <MoreVertical size={20} />
      </button>
    </div>
  );
}

export default function PracticePlannerPage() {
  return (
    <PageTransition>
    <div className="px-4 pt-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays size={28} className="shrink-0 text-pb-blue" />
          <h1 className="truncate text-2xl font-bold text-white">
            Practice Planner
          </h1>
        </div>
        <Link
          href="/practice/session"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pb-orange text-white transition-colors active:bg-pb-orange/90"
          aria-label="Start practice session"
        >
          <Play size={24} fill="currentColor" />
        </Link>
      </header>

      {/* Stats bar */}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 rounded-[14px] bg-pb-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-pb-orange" />
          <span className="text-sm text-pb-muted">Total Duration:</span>
          <span className="text-sm font-semibold text-white">
            {plan.totalDuration} min
          </span>
        </div>
        <div>
          <span className="text-sm text-pb-muted">Activities:</span>
          <span className="ml-1.5 text-sm font-semibold text-white">
            {plan.blocks.length}
          </span>
        </div>
        <div>
          <span className="text-sm text-pb-muted">Team:</span>
          <span className="ml-1.5 text-sm font-semibold text-white">
            {team?.name ?? "—"}
          </span>
        </div>
      </div>

      {/* Add from Library + Save */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-pb-orange py-3.5 text-sm font-semibold text-white transition-colors active:bg-pb-orange/90"
        >
          <Plus size={20} />
          Add from Library
        </button>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-[14px] bg-pb-card p-3.5 text-pb-orange transition-colors active:bg-pb-card-hover"
          aria-label="Save practice plan"
        >
          <Save size={22} />
        </button>
      </div>

      {/* Practice Timeline */}
      <h2 className="mt-8 text-lg font-semibold text-pb-blue">
        Practice Timeline
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {plan.blocks.map((block) => (
          <TimelineBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
    </PageTransition>
  );
}
