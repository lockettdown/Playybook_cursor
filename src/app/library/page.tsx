"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  X,
  Clock,
  Star,
  Users,
} from "lucide-react";
import { plays, drills, tagColors } from "@/lib/mock-data";
import type { Play, Drill } from "@/types";
import { PageTransition } from "@/components/layout/PageTransition";

type TabMode = "plays" | "drills";

function getUniqueTags(items: (Play | Drill)[]): string[] {
  const tagSet = new Set<string>();
  items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export default function LibraryPage() {
  const [tab, setTab] = useState<TabMode>("drills");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const items = tab === "drills" ? drills : plays;
  const allTags = useMemo(() => getUniqueTags(items), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags =
        activeTags.size === 0 ||
        item.tags.some((tag) => activeTags.has(tag));
      return matchesSearch && matchesTags;
    });
  }, [items, searchQuery, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setActiveTags(new Set());
    setSearchQuery("");
  };

  const hasFilters = searchQuery.trim() !== "" || activeTags.size > 0;

  return (
    <PageTransition>
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="flex items-center gap-2">
        <BookOpen size={28} className="text-pb-blue" />
        <h1 className="text-2xl font-bold text-white">Library</h1>
      </header>

      {/* Segmented toggle */}
      <div className="mt-6 flex gap-2 rounded-[10px] bg-pb-card p-1">
        <button
          type="button"
          onClick={() => setTab("plays")}
          className={`flex-1 rounded-[8px] px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "plays"
              ? "bg-pb-orange text-white"
              : "bg-transparent text-pb-muted"
          }`}
        >
          Plays
        </button>
        <button
          type="button"
          onClick={() => setTab("drills")}
          className={`flex-1 rounded-[8px] px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === "drills"
              ? "bg-pb-orange text-white"
              : "bg-transparent text-pb-muted"
          }`}
        >
          Drills
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mt-4">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-pb-muted"
        />
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-[10px] bg-pb-card py-3 pl-11 pr-4 text-sm text-white placeholder:text-pb-muted focus:outline-none focus:ring-2 focus:ring-pb-orange/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-pb-muted hover:text-white"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter chips + Clear filters */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide pb-1">
          {allTags.map((tag) => {
            const isActive = activeTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`shrink-0 rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? tagColors[tag] ?? "bg-pb-orange/20 text-pb-orange"
                    : "bg-pb-card text-pb-muted"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 text-xs font-semibold text-pb-orange"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mt-3 text-sm text-pb-muted">
        {filteredItems.length} {tab === "drills" ? "drill" : "play"}
        {filteredItems.length !== 1 ? "s" : ""} found
      </p>

      {/* Card list */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filteredItems.map((item) => (
          <LibraryCard
            key={item.id}
            item={item}
            tab={tab}
            tagColors={tagColors}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="mt-8 text-center text-sm text-pb-muted">
          No {tab} match your filters. Try adjusting your search or filters.
        </p>
      )}
    </div>
    </PageTransition>
  );
}

interface LibraryCardProps {
  item: Play | Drill;
  tab: TabMode;
  tagColors: Record<string, string>;
}

function LibraryCard({ item, tab, tagColors }: LibraryCardProps) {
  const isDrill = tab === "drills";
  const drill = isDrill ? (item as Drill) : null;
  const play = !isDrill ? (item as Play) : null;

  return (
    <Link
      href={`/library/${item.id}`}
      className="flex flex-col overflow-hidden rounded-[14px] bg-pb-card transition-colors active:bg-pb-card-hover"
    >
      {/* Thumbnail placeholder */}
      <div className="flex h-28 items-center justify-center bg-pb-surface">
        <Users size={40} className="text-pb-orange" />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-white">{item.name}</h3>
          {item.isFavorite && (
            <Star size={18} className="shrink-0 fill-pb-orange text-pb-orange" />
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`rounded-[6px] px-2 py-0.5 text-[10px] font-medium ${
                tagColors[tag] ?? "bg-pb-orange/20 text-pb-orange"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Duration or step count */}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-pb-orange">
          <Clock size={14} />
          {isDrill && drill
            ? `${drill.duration} min`
            : play
              ? `${play.steps.length} steps`
              : null}
        </div>

        <p className="line-clamp-2 text-sm text-pb-muted">{item.description}</p>
      </div>
    </Link>
  );
}
