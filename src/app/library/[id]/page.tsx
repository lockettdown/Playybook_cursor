"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Star,
  Clock,
  Plus,
  ChevronRight,
} from "lucide-react";
import { plays, drills, tagColors } from "@/lib/mock-data";
import type { Play as PlayData, Drill, Arrow, PlayerPosition } from "@/types";

const COURT_W = 400;
const COURT_H = 420;
const STEP_DURATION_MS = 1000;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePositions(
  from: PlayerPosition[],
  to: PlayerPosition[],
  t: number,
): PlayerPosition[] {
  return to.map((pos) => {
    const prev = from.find((p) => p.id === pos.id);
    if (!prev) return { ...pos };
    return {
      ...pos,
      x: lerp(prev.x, pos.x, t),
      y: lerp(prev.y, pos.y, t),
    };
  });
}

const ARROW_STYLES: Record<
  Arrow["type"],
  { stroke: string; dash?: number[]; width: number }
> = {
  pass: { stroke: "#007efb", width: 2.5 },
  dribble: { stroke: "#ff5e00", dash: [10, 6], width: 2.5 },
  cut: { stroke: "#ffffff", dash: [4, 4], width: 2 },
  screen: { stroke: "#eab308", width: 4 },
};

const KEY_POINTS: Record<string, string[]> = {
  offense: [
    "Read the defense before making your move",
    "Set solid screens with a wide base",
    "Space the floor — maintain 15-18 ft spacing",
    "Ball handler should attack downhill off screens",
    "Roll man must read the help defense",
    "Weak-side players stay ready to shoot",
  ],
  defense: [
    "Communication is the foundation of team defense",
    "Jump to the ball on every pass",
    "Maintain ball-you-man triangle",
    "Close out under control — high hands, choppy feet",
    "Help one pass away, recover on the skip",
    "Box out and pursue every rebound",
  ],
  special: [
    "Execute quickly — you only have 5 seconds",
    "Use misdirection with initial movement",
    "Screener must hold screen until the cutter clears",
    "Inbounder should fake before delivering the pass",
    "Have a safety valve option in case primary is denied",
    "Practice timing until it becomes second nature",
  ],
};

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  segments = 48,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segments);
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return pts;
}

type TabId = "overview" | "steps" | "keypoints";

export default function PlayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const play = plays.find((p) => p.id === id);
  const drill = drills.find((d) => d.id === id);

  if (!play && !drill) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-pb-dark p-6">
        <p className="text-lg text-pb-muted">Item not found</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 rounded-lg bg-pb-card px-4 py-2 text-white transition-colors hover:bg-pb-card-hover"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (play) return <PlayDetailView play={play} onBack={() => router.back()} />;
  return <DrillDetailView drill={drill!} onBack={() => router.back()} />;
}

/* ═══════════════════════════════════════════════════════════
   Play Detail
   ═══════════════════════════════════════════════════════════ */

function PlayDetailView({
  play,
  onBack,
}: {
  play: PlayData;
  onBack: () => void;
}) {
  const [KonvaComponents, setKonvaComponents] = useState<typeof import("react-konva") | null>(null);
  const [stageSize, setStageSize] = useState({ width: 400, height: 420 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const totalSteps = play.steps.length;
  const step = play.steps[currentStep];
  const nextStepIndex =
    currentStep < totalSteps - 1 ? currentStep + 1 : isLooping ? 0 : null;
  const nextStep = nextStepIndex !== null ? play.steps[nextStepIndex] : null;

  const displayPositions: PlayerPosition[] =
    transitionProgress < 1 && nextStep && step
      ? interpolatePositions(step.positions, nextStep.positions, transitionProgress)
      : step?.positions ?? [];

  const ballArrow =
    transitionProgress < 1 &&
    nextStep?.arrows.find((a) => a.type === "pass" || a.type === "dribble");
  const ballPos =
    ballArrow && transitionProgress < 1
      ? {
          x: lerp(ballArrow.fromX, ballArrow.toX, transitionProgress),
          y: lerp(ballArrow.fromY, ballArrow.toY, transitionProgress),
        }
      : null;

  useEffect(() => {
    import("react-konva").then(setKonvaComponents);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [KonvaComponents]);

  useEffect(() => {
    if (!isPlaying) return;
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setTransitionProgress((p) => {
        const next = Math.min(1, p + (elapsed / STEP_DURATION_MS));
        if (next >= 1) {
          const atLast = currentStepRef.current >= totalSteps - 1;
          if (atLast && !isLooping) {
            setIsPlaying(false);
            return 1;
          }
          setCurrentStep((s) =>
            s >= totalSteps - 1 ? 0 : s + 1,
          );
          return 0;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, isLooping, totalSteps]);

  const goToStep = (n: number) => {
    const clamped = Math.max(0, Math.min(n, totalSteps - 1));
    setCurrentStep(clamped);
    setTransitionProgress(1);
  };

  const reset = () => {
    setCurrentStep(0);
    setTransitionProgress(1);
    setIsPlaying(false);
  };

  const scaleX = stageSize.width / COURT_W;
  const scaleY = stageSize.height / COURT_H;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (stageSize.width - COURT_W * scale) / 2;
  const offsetY = (stageSize.height - COURT_H * scale) / 2;
  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "steps", label: "Steps" },
    { id: "keypoints", label: "Key Points" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-pb-dark pb-24 md:pb-6">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-pb-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-pb-muted transition-colors hover:bg-pb-card hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="truncate text-lg font-semibold text-white">
          {play.name}
        </h1>
        {play.isFavorite && (
          <Star size={18} className="shrink-0 fill-pb-orange text-pb-orange" />
        )}
      </header>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {play.tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColors[tag] ?? "bg-pb-card text-pb-muted"}`}
          >
            {tag}
          </span>
        ))}
        <span className="rounded-full bg-pb-surface px-2.5 py-0.5 text-xs font-medium capitalize text-white">
          {play.type}
        </span>
      </div>

      {/* Court canvas */}
      <div
        ref={containerRef}
        className="relative mx-4 mt-4 aspect-square max-h-[65vh] overflow-hidden rounded-xl border border-pb-border bg-black"
      >
        {KonvaComponents && (
          <KonvaComponents.Stage
            width={stageSize.width}
            height={stageSize.height}
          >
            <KonvaComponents.Layer>
              <HalfCourt K={KonvaComponents} tx={tx} ty={ty} scale={scale} />
            </KonvaComponents.Layer>

            <KonvaComponents.Layer>
              {step?.arrows.map((arrow) => {
                const style = ARROW_STYLES[arrow.type];
                const angle = Math.atan2(
                  arrow.toY - arrow.fromY,
                  arrow.toX - arrow.fromX,
                );
                const headLen = 10 * scale;
                return (
                  <KonvaComponents.Group key={arrow.id}>
                    <KonvaComponents.Line
                      points={[
                        tx(arrow.fromX),
                        ty(arrow.fromY),
                        tx(arrow.toX),
                        ty(arrow.toY),
                      ]}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      dash={style.dash}
                      lineCap="round"
                    />
                    <KonvaComponents.Line
                      points={[
                        tx(arrow.toX) -
                          headLen * Math.cos(angle - Math.PI / 6),
                        ty(arrow.toY) -
                          headLen * Math.sin(angle - Math.PI / 6),
                        tx(arrow.toX),
                        ty(arrow.toY),
                        tx(arrow.toX) -
                          headLen * Math.cos(angle + Math.PI / 6),
                        ty(arrow.toY) -
                          headLen * Math.sin(angle + Math.PI / 6),
                      ]}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      lineCap="round"
                      lineJoin="round"
                    />
                  </KonvaComponents.Group>
                );
              })}

              {ballPos && (
                <KonvaComponents.Group>
                  <KonvaComponents.Circle
                    x={tx(ballPos.x)}
                    y={ty(ballPos.y)}
                    radius={8 * scale}
                    fill="#fbbf24"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </KonvaComponents.Group>
              )}

              {displayPositions.map((pos) => (
                <KonvaComponents.Group key={pos.id}>
                  <KonvaComponents.Circle
                    x={tx(pos.x)}
                    y={ty(pos.y)}
                    radius={16 * scale}
                    fill={pos.isDefense ? "#007efb" : "#ff5e00"}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <KonvaComponents.Text
                    x={tx(pos.x) - 16 * scale}
                    y={ty(pos.y) - 8 * scale}
                    width={32 * scale}
                    height={16 * scale}
                    text={pos.label}
                    fontSize={14 * scale}
                    fontFamily="Inter, sans-serif"
                    fontStyle="bold"
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                  />
                </KonvaComponents.Group>
              ))}
            </KonvaComponents.Layer>
          </KonvaComponents.Stage>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="flex size-11 items-center justify-center rounded-lg text-pb-muted transition-colors hover:bg-pb-card hover:text-white"
            aria-label="Reset"
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="flex size-11 items-center justify-center rounded-lg text-white transition-colors hover:bg-pb-card disabled:text-pb-muted disabled:hover:bg-transparent"
            aria-label="Previous step"
          >
            <SkipBack size={22} />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex size-12 items-center justify-center rounded-full bg-pb-orange text-white transition-transform active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={22} />
            ) : (
              <Play size={22} className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === totalSteps - 1}
            className="flex size-11 items-center justify-center rounded-lg text-white transition-colors hover:bg-pb-card disabled:text-pb-muted disabled:hover:bg-transparent"
            aria-label="Next step"
          >
            <SkipForward size={22} />
          </button>
          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={`flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-pb-card ${
              isLooping ? "text-pb-orange" : "text-pb-muted"
            }`}
            aria-label={isLooping ? "Disable loop" : "Enable loop"}
          >
            <Repeat size={20} />
          </button>
        </div>
        <span className="text-sm font-medium text-pb-muted">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Step description */}
      {step && (
        <p className="px-4 pb-3 text-sm leading-relaxed text-gray-300">
          {step.description}
        </p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-pb-border px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-pb-orange text-pb-orange"
                : "border-transparent text-pb-muted hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-pb-card p-4">
              <p className="text-sm leading-relaxed text-gray-300">
                {play.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-pb-surface px-3 py-1 text-xs font-medium capitalize text-white">
                {play.type}
              </span>
              {play.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${tagColors[tag] ?? "bg-pb-card text-pb-muted"}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "steps" && (
          <div className="space-y-3">
            {play.steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCurrentStep(i);
                  setIsPlaying(false);
                }}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                  currentStep === i
                    ? "bg-pb-active ring-1 ring-pb-border"
                    : "bg-pb-card hover:bg-pb-card-hover"
                }`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pb-orange text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-gray-300">
                  {s.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {activeTab === "keypoints" && (
          <div className="space-y-3">
            {(KEY_POINTS[play.type] ?? []).map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-pb-card p-3"
              >
                <ChevronRight
                  size={16}
                  className="mt-0.5 shrink-0 text-pb-orange"
                />
                <p className="text-sm leading-relaxed text-gray-300">
                  {point}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Half-Court Drawing
   ═══════════════════════════════════════════════════════════ */

function HalfCourt({
  K,
  tx,
  ty,
  scale,
}: {
  K: typeof import("react-konva");
  tx: (x: number) => number;
  ty: (y: number) => number;
  scale: number;
}) {
  const baselineY = 60;
  const halfCourtY = 400;
  const sideL = 20;
  const sideR = 380;
  const centerX = 200;

  const laneL = 130;
  const laneR = 270;
  const laneBot = 195;

  const basketY = 80;
  const rimR = 8;
  const ftRadius = 55;
  const threeR = 175;
  const restrictedR = 35;

  const lineColor = "rgba(255,255,255,0.6)";
  const lineW = 1.5;

  const ftArc = arcPoints(
    tx(centerX),
    ty(laneBot),
    ftRadius * scale,
    0,
    Math.PI,
  );

  const threeArc = arcPoints(
    tx(centerX),
    ty(basketY),
    threeR * scale,
    0,
    Math.PI,
  );

  const restrictedArc = arcPoints(
    tx(centerX),
    ty(basketY),
    restrictedR * scale,
    0,
    Math.PI,
  );

  return (
    <K.Group>
      {/* Key fill */}
      <K.Rect
        x={tx(laneL)}
        y={ty(baselineY)}
        width={(laneR - laneL) * scale}
        height={(laneBot - baselineY) * scale}
        fill="rgba(255, 94, 0, 0.15)"
      />

      {/* Baseline */}
      <K.Line
        points={[tx(sideL), ty(baselineY), tx(sideR), ty(baselineY)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      {/* Half-court line */}
      <K.Line
        points={[tx(sideL), ty(halfCourtY), tx(sideR), ty(halfCourtY)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      {/* Sidelines */}
      <K.Line
        points={[tx(sideL), ty(baselineY), tx(sideL), ty(halfCourtY)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      <K.Line
        points={[tx(sideR), ty(baselineY), tx(sideR), ty(halfCourtY)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />

      {/* Lane */}
      <K.Line
        points={[tx(laneL), ty(baselineY), tx(laneL), ty(laneBot)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      <K.Line
        points={[tx(laneR), ty(baselineY), tx(laneR), ty(laneBot)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      {/* Free throw line */}
      <K.Line
        points={[tx(laneL), ty(laneBot), tx(laneR), ty(laneBot)]}
        stroke={lineColor}
        strokeWidth={lineW}
      />

      {/* Free throw semicircle */}
      <K.Line points={ftArc} stroke={lineColor} strokeWidth={lineW} />

      {/* Three-point arc */}
      <K.Line points={threeArc} stroke={lineColor} strokeWidth={lineW} />
      {/* Three-point corner lines */}
      <K.Line
        points={[
          tx(centerX - threeR),
          ty(baselineY),
          tx(centerX - threeR),
          ty(baselineY + 30),
        ]}
        stroke={lineColor}
        strokeWidth={lineW}
      />
      <K.Line
        points={[
          tx(centerX + threeR),
          ty(baselineY),
          tx(centerX + threeR),
          ty(baselineY + 30),
        ]}
        stroke={lineColor}
        strokeWidth={lineW}
      />

      {/* Restricted area */}
      <K.Line
        points={restrictedArc}
        stroke={lineColor}
        strokeWidth={lineW}
        dash={[4, 3]}
      />

      {/* Backboard */}
      <K.Line
        points={[
          tx(centerX - 20),
          ty(basketY - 8),
          tx(centerX + 20),
          ty(basketY - 8),
        ]}
        stroke={lineColor}
        strokeWidth={2}
      />

      {/* Rim */}
      <K.Ellipse
        x={tx(centerX)}
        y={ty(basketY)}
        radiusX={rimR * scale}
        radiusY={rimR * scale}
        stroke="#ff5e00"
        strokeWidth={2}
      />
    </K.Group>
  );
}

/* ═══════════════════════════════════════════════════════════
   Drill Detail
   ═══════════════════════════════════════════════════════════ */

function DrillDetailView({
  drill,
  onBack,
}: {
  drill: Drill;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col bg-pb-dark pb-24 md:pb-6">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-pb-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-pb-muted transition-colors hover:bg-pb-card hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="truncate text-lg font-semibold text-white">
          {drill.name}
        </h1>
        {drill.isFavorite && (
          <Star size={18} className="shrink-0 fill-pb-orange text-pb-orange" />
        )}
      </header>

      {/* Tags + Duration */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        {drill.tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColors[tag] ?? "bg-pb-card text-pb-muted"}`}
          >
            {tag}
          </span>
        ))}
        <span className="flex items-center gap-1 rounded-full bg-pb-orange/20 px-2.5 py-0.5 text-xs font-medium text-pb-orange">
          <Clock size={12} />
          {drill.duration} min
        </span>
      </div>

      {/* Description */}
      <div className="mx-4 mt-4 rounded-xl bg-pb-card p-4">
        <p className="text-sm leading-relaxed text-gray-300">
          {drill.description}
        </p>
        {drill.playerCount && (
          <p className="mt-2 text-xs text-pb-muted">
            Players needed: {drill.playerCount}
          </p>
        )}
      </div>

      {/* Coaching Cues */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-pb-muted">
          Coaching Cues
        </h2>
        <div className="space-y-2">
          {drill.coachingCues.map((cue, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl bg-pb-card p-3"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pb-orange/20 text-[10px] font-bold text-pb-orange">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-gray-300">{cue}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Progressions */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-pb-muted">
          Progressions
        </h2>
        <div className="space-y-2">
          {drill.progressions.map((prog, i) => (
            <div key={i} className="rounded-xl bg-pb-card p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-pb-orange/20 px-2 py-0.5 text-xs font-semibold text-pb-orange">
                  {prog.level}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                {prog.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Add to Practice */}
      <div className="px-4 pt-6">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pb-orange py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <Plus size={18} />
          Add to Practice
        </button>
      </div>
    </div>
  );
}
