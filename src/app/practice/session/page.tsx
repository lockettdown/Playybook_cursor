"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
} from "lucide-react";
import { practicePlans } from "@/lib/mock-data";
import type { PracticeBlock } from "@/types";

const plan = practicePlans[0];
const blocks = plan.blocks;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PracticeSessionPage() {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(blocks[0].duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blockIndexRef = useRef(currentBlockIndex);
  blockIndexRef.current = currentBlockIndex;

  const currentBlock = blocks[currentBlockIndex];
  const nextBlock = currentBlockIndex < blocks.length - 1 ? blocks[currentBlockIndex + 1] : null;

  const resetTimerForBlock = useCallback((index: number) => {
    setTimeRemaining(blocks[index].duration * 60);
    setCurrentBlockIndex(index);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const idx = blockIndexRef.current;
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (idx < blocks.length - 1) {
            setCurrentBlockIndex(idx + 1);
            return blocks[idx + 1].duration * 60;
          }
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleSkipNext = () => {
    if (currentBlockIndex < blocks.length - 1) {
      resetTimerForBlock(currentBlockIndex + 1);
    }
  };

  const handleSkipPrev = () => {
    if (currentBlockIndex > 0) {
      resetTimerForBlock(currentBlockIndex - 1);
    }
  };

  const handleReset = () => {
    setTimeRemaining(blocks[currentBlockIndex].duration * 60);
  };

  const displayTime = timeRemaining;
  const isComplete = timeRemaining === 0 && currentBlockIndex === blocks.length - 1;

  return (
    <div className="flex min-h-dvh flex-col bg-pb-dark touch-manipulation select-none">
      {/* Minimal header */}
      <header className="flex min-h-14 shrink-0 items-center justify-between px-4">
        <Link
          href="/practice"
          className="flex size-12 -ml-2 items-center justify-center rounded-full text-pb-muted transition-colors active:bg-pb-active active:text-white"
          aria-label="Close session"
        >
          <X size={28} strokeWidth={2} />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-white">
          Practice Session
        </h1>
        <div className="w-12" />
      </header>

      {/* Main content - scrollable */}
      <main className="flex flex-1 flex-col overflow-y-auto px-4 pb-6">
        {/* Large countdown timer - hero element */}
        <div className="mt-8 flex flex-col items-center">
          <div
            className={`font-mono text-7xl font-bold tabular-nums tracking-tight md:text-8xl ${
              isComplete ? "text-pb-muted" : "text-white"
            }`}
          >
            {isComplete ? "00:00" : formatTime(displayTime)}
          </div>
          {isComplete && (
            <p className="mt-4 text-center text-lg font-semibold text-pb-orange">
              Session Complete
            </p>
          )}
        </div>

        {/* Current activity info */}
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold text-white">{currentBlock.name}</h2>
          <p className="mt-2 text-sm text-pb-muted">{currentBlock.description}</p>
          <p className="mt-3 text-sm text-pb-muted">
            Activity {currentBlockIndex + 1} of {blocks.length}
          </p>
        </div>

        {/* Next up preview */}
        {nextBlock && (
          <div className="mt-6 rounded-[14px] bg-pb-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-pb-muted" />
              <span className="text-sm text-pb-muted">Up Next:</span>
            </div>
            <p className="mt-1 font-semibold text-white">
              {nextBlock.name} ({nextBlock.duration} min)
            </p>
          </div>
        )}

        {/* Control buttons - large & touch-friendly for gym use */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <button
            type="button"
            onClick={handleSkipPrev}
            disabled={currentBlockIndex === 0}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pb-card text-pb-muted transition-colors active:bg-pb-card-hover disabled:opacity-40 disabled:active:bg-pb-card min-h-12 min-w-12"
            aria-label="Previous activity"
          >
            <SkipBack size={24} />
          </button>

          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            disabled={isComplete}
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-pb-orange text-white transition-colors active:bg-pb-orange/90 disabled:opacity-60 disabled:active:bg-pb-orange min-h-16 min-w-16"
            aria-label={isRunning ? "Pause" : "Play"}
          >
            {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>

          <button
            type="button"
            onClick={handleSkipNext}
            disabled={currentBlockIndex === blocks.length - 1}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pb-card text-pb-muted transition-colors active:bg-pb-card-hover disabled:opacity-40 disabled:active:bg-pb-card min-h-12 min-w-12"
            aria-label="Next activity"
          >
            <SkipForward size={24} />
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isComplete}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-pb-card text-pb-muted transition-colors active:bg-pb-card-hover disabled:opacity-40 disabled:active:bg-pb-card min-h-12 min-w-12"
            aria-label="Reset timer"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* Activity timeline - horizontal scroll */}
        <div className="mt-10">
          <p className="mb-3 text-sm font-medium text-pb-muted">Timeline</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {blocks.map((block: PracticeBlock, index: number) => {
              const isCurrent = index === currentBlockIndex;
              const isCompleted = index < currentBlockIndex;
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    resetTimerForBlock(index);
                    setIsRunning(false);
                  }}
                  className={`min-w-[140px] shrink-0 rounded-[14px] border-2 px-3 py-3 text-left transition-colors active:bg-pb-card-hover ${
                    isCurrent
                      ? "border-pb-orange bg-pb-card"
                      : isCompleted
                        ? "border-transparent bg-pb-surface opacity-70"
                        : "border-pb-surface bg-pb-card"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-white">{block.name}</p>
                  <p className="mt-0.5 text-xs text-pb-muted">{block.duration} min</p>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
