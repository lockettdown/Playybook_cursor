"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Users, Undo2, Trash2, Save, X, PencilLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Court dimensions in feet (portrait orientation)
const CW = 50;
const CH = 94;
const SHELF_H = 14; // row of circles under court
const TOTAL_H = CH + SHELF_H;
const CENTER_R = 6;
const INNER_R = 2;
const LANE_W = 16;
const LANE_H = 19;
const FT_R = 6;
const THREE_R = 23.75;
const CORNER_X = 3;
const BASKET_Y = 5.25;
const RIM_R = 0.75;
const BB_W = 6;
// Full-court background: add your image to public/court-bg.png (e.g. wooden court with white lines)
const COURT_IMAGE_SRC = "/court-bg.png";

const PEN_COLORS = [
  { label: "Red", hex: "#ef4444" },
  { label: "Blue", hex: "#007efb" },
  { label: "Black", hex: "#000000" },
] as const;

type DrawLine = { points: number[]; color: string };
type PlayerMarker = {
  id: string;
  cx: number;
  cy: number;
  team: "blue" | "red";
  num: number;
};
type Snapshot = { lines: DrawLine[]; players: PlayerMarker[] };
type Mode = "pen" | "players";

type SavedPlay = {
  id: string;
  name: string;
  players: PlayerMarker[];
};

const MAX_SAVED_PLAYS = 5;

// Default: circles in a row under the court (shelf), blue 1–5 then red 1–5
function getDefaultPlayers(): PlayerMarker[] {
  const rowY = CH + SHELF_H / 2;
  const spacing = CW / 11;
  const result: PlayerMarker[] = [];
  for (let i = 0; i < 5; i++) {
    result.push({
      id: `b${i + 1}`,
      cx: spacing * (i + 1),
      cy: rowY,
      team: "blue",
      num: i + 1,
    });
  }
  for (let i = 0; i < 5; i++) {
    result.push({
      id: `r${i + 1}`,
      cx: spacing * (i + 6),
      cy: rowY,
      team: "red",
      num: i + 1,
    });
  }
  return result;
}
const INIT_PLAYERS = getDefaultPlayers();

export default function WhiteboardPage() {
  const [K, setK] = useState<typeof import("react-konva") | null>(null);
  const [mode, setMode] = useState<Mode>("players");
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [players, setPlayers] = useState<PlayerMarker[]>(() =>
    getDefaultPlayers()
  );
  const [penColor, setPenColor] = useState<(typeof PEN_COLORS)[number]["hex"]>(
    PEN_COLORS[0].hex
  );
  const [size, setSize] = useState({ w: 400, h: 700 });
  const [courtImage, setCourtImage] = useState<HTMLImageElement | null>(null);
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const historyRef = useRef<Snapshot[]>([]);
  const stateRef = useRef({ lines, players });
  stateRef.current = { lines, players };

  useEffect(() => {
    import("react-konva").then(setK);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setCourtImage(img);
    img.onerror = () => setCourtImage(null);
    img.src = COURT_IMAGE_SRC;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    sync();
    const obs = new ResizeObserver(sync);
    obs.observe(el);
    return () => obs.disconnect();
  }, [K]);

  const sc = Math.min(size.w / CW, size.h / TOTAL_H);
  const ox = (size.w - CW * sc) / 2;
  const oy = (size.h - TOTAL_H * sc) / 2;
  const tx = useCallback((x: number) => ox + x * sc, [ox, sc]);
  const ty = useCallback((y: number) => oy + y * sc, [oy, sc]);

  const saveSnap = useCallback(() => {
    const { lines: l, players: p } = stateRef.current;
    historyRef.current.push({
      lines: l.map((ln) => ({ ...ln, points: [...ln.points] })),
      players: p.map((pl) => ({ ...pl })),
    });
  }, []);

  const onDown = useCallback(
    (e: any) => {
      if (mode !== "pen") return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      saveSnap();
      setLines((prev) => [
        ...prev,
        { points: [pos.x, pos.y], color: penColor },
      ]);
      isDrawing.current = true;
    },
    [mode, penColor, saveSnap]
  );

  const onMove = useCallback(
    (e: any) => {
      if (!isDrawing.current || mode !== "pen") return;
      const pt = e.target.getStage()?.getPointerPosition();
      if (!pt) return;
      setLines((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, points: [...last.points, pt.x, pt.y] },
        ];
      });
    },
    [mode]
  );

  const onUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const onDragStart = useCallback(() => {
    saveSnap();
  }, [saveSnap]);

  const onDragEnd = useCallback(
    (id: string, e: any) => {
      const n = e.target;
      const courtX = Math.max(0, Math.min(CW, (n.x() - ox) / sc));
      const courtY = Math.max(0, Math.min(TOTAL_H, (n.y() - oy) / sc));
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, cx: courtX, cy: courtY } : p))
      );
    },
    [ox, oy, sc]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return;
    const snap = h.pop()!;
    setLines(snap.lines);
    setPlayers(snap.players);
  }, []);

  const clear = useCallback(() => {
    saveSnap();
    setLines([]);
    setPlayers(getDefaultPlayers());
  }, [saveSnap]);

  const savePosition = useCallback(() => {
    if (savedPlays.length >= MAX_SAVED_PLAYS) return;
    const name = `Play ${savedPlays.length + 1}`;
    setSavedPlays((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        players: players.map((p) => ({ ...p })),
      },
    ]);
  }, [players, savedPlays.length]);

  const recallPlay = useCallback(
    (play: SavedPlay) => {
      saveSnap();
      setPlayers(play.players.map((p) => ({ ...p })));
    },
    [saveSnap]
  );

  const deleteSavedPlay = useCallback((id: string) => {
    setSavedPlays((prev) => prev.filter((p) => p.id !== id));
    if (editingPlayId === id) {
      setEditingPlayId(null);
      setEditingName("");
    }
  }, [editingPlayId]);

  const startEditingPlay = useCallback((play: SavedPlay) => {
    setEditingPlayId(play.id);
    setEditingName(play.name);
  }, []);

  const saveEditedName = useCallback(() => {
    if (!editingPlayId) return;
    const name = editingName.trim();
    setSavedPlays((prev) =>
      prev.map((p) =>
        p.id === editingPlayId ? { ...p, name: name || p.name } : p
      )
    );
    setEditingPlayId(null);
    setEditingName("");
  }, [editingPlayId, editingName]);

  const cancelEditingPlay = useCallback(() => {
    setEditingPlayId(null);
    setEditingName("");
  }, []);

  useEffect(() => {
    if (!editingPlayId) return;
    const el = document.getElementById("whiteboard-edit-play-input");
    el?.focus();
  }, [editingPlayId]);

  const PR = 16;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black">
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {K && (
          <K.Stage
            width={size.w}
            height={size.h}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onTouchStart={onDown}
            onTouchMove={onMove}
            onTouchEnd={onUp}
            style={{ cursor: mode === "pen" ? "crosshair" : "default" }}
          >
            <K.Layer listening={false}>
              <Court
                K={K}
                tx={tx}
                ty={ty}
                sc={sc}
                courtImage={courtImage}
              />
            </K.Layer>

            <K.Layer listening={mode === "pen"}>
              {lines.map((l, i) => (
                <K.Line
                  key={i}
                  points={l.points}
                  stroke={l.color}
                  strokeWidth={3}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
            </K.Layer>

            <K.Layer>
              {players.map((p) => (
                <K.Group
                  key={p.id}
                  x={tx(p.cx)}
                  y={ty(p.cy)}
                  draggable={mode === "players"}
                  onDragStart={onDragStart}
                  onDragEnd={(e: any) => onDragEnd(p.id, e)}
                  onMouseEnter={(e: any) => {
                    if (mode === "players") {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "grab";
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    const c = e.target.getStage()?.container();
                    if (c)
                      c.style.cursor =
                        mode === "pen" ? "crosshair" : "default";
                  }}
                >
                  <K.Circle
                    radius={PR}
                    fill={p.team === "blue" ? "#007efb" : "#ef4444"}
                    stroke="white"
                    strokeWidth={2}
                    shadowColor="rgba(0,0,0,0.5)"
                    shadowBlur={6}
                  />
                  <K.Text
                    text={String(p.num)}
                    fontSize={14}
                    fontStyle="bold"
                    fill="white"
                    width={PR * 2}
                    height={PR * 2}
                    offsetX={PR}
                    offsetY={PR}
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </K.Group>
              ))}
            </K.Layer>
          </K.Stage>
        )}
      </div>

      <div className="shrink-0 bg-pb-dark px-4 pb-6 pt-3 md:pb-4">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setMode("pen")}
            className={`flex size-10 md:size-12 items-center justify-center rounded-xl transition-colors ${
              mode === "pen"
                ? "bg-pb-orange text-white"
                : "bg-pb-card text-pb-muted"
            }`}
            aria-label="Pen tool"
          >
            <Pencil size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
          <button
            type="button"
            onClick={() => setMode("players")}
            className={`flex size-10 md:size-12 items-center justify-center rounded-xl transition-colors ${
              mode === "players"
                ? "bg-pb-orange text-white"
                : "bg-pb-card text-pb-muted"
            }`}
            aria-label="Players tool"
          >
            <Users size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
          <button
            type="button"
            onClick={undo}
            className="flex size-10 md:size-12 items-center justify-center rounded-xl bg-pb-card text-pb-muted transition-colors hover:text-white"
            aria-label="Undo"
          >
            <Undo2 size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex size-10 md:size-12 items-center justify-center rounded-xl bg-pb-card text-pb-muted transition-colors hover:text-white"
            aria-label="Clear court"
          >
            <Trash2 size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
          <button
            type="button"
            onClick={savePosition}
            disabled={savedPlays.length >= MAX_SAVED_PLAYS}
            className="flex size-10 md:size-12 items-center justify-center rounded-xl bg-pb-card text-pb-muted transition-colors hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Save positions"
            title={
              savedPlays.length >= MAX_SAVED_PLAYS
                ? `Max ${MAX_SAVED_PLAYS} plays`
                : "Save circle positions"
            }
          >
            <Save size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>

        {/* Color row: always in layout so court size stays constant when switching pen/players */}
        <div
          className={`mt-2 flex items-center justify-center gap-3 ${
            mode !== "pen" ? "invisible pointer-events-none" : ""
          }`}
        >
          <span className="text-xs font-semibold text-pb-muted">Color:</span>
          {PEN_COLORS.map(({ label, hex }) => (
            <button
              key={hex}
              type="button"
              onClick={() => setPenColor(hex)}
              className={`size-9 rounded-lg transition-transform active:scale-95 ${
                penColor === hex
                  ? "ring-2 ring-white ring-offset-2 ring-offset-pb-dark"
                  : ""
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`Select ${label}`}
            />
          ))}
        </div>

        {/* Saved plays: fixed-height area so court size stays constant with 0 or N plays */}
        <div className="mt-1.5 flex min-h-[52px] md:min-h-[72px] flex-col gap-1.5 md:gap-2">
          <p className="text-center text-xs font-semibold text-pb-muted">
            Saved plays
          </p>
          {editingPlayId ? (
            <div className="flex w-full max-w-xs mx-auto items-center gap-2">
              <Input
                id="whiteboard-edit-play-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEditedName();
                  if (e.key === "Escape") cancelEditingPlay();
                }}
                className="h-8 flex-1 rounded-lg border-pb-border bg-pb-dark px-3 text-xs text-white"
                placeholder="Play name"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 shrink-0 bg-pb-orange text-white hover:bg-pb-orange/90"
                onClick={saveEditedName}
              >
                Done
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-pb-muted"
                onClick={cancelEditingPlay}
              >
                Cancel
              </Button>
            </div>
          ) : savedPlays.length === 0 ? (
            <p className="text-center text-xs text-pb-muted">
              Save positions with the Save button above (max {MAX_SAVED_PLAYS})
            </p>
          ) : null}
          {savedPlays.length > 0 && !editingPlayId ? (
            <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1">
              {savedPlays.map((play) => (
                <div
                  key={play.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-pb-card px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => recallPlay(play)}
                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-white hover:text-pb-orange"
                    title={`Recall ${play.name}`}
                  >
                    {play.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingPlay(play)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#374151] text-pb-blue transition-colors hover:bg-[#4b5563]"
                    aria-label={`Rename ${play.name}`}
                  >
                    <PencilLine size={18} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSavedPlay(play.id)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#374151] text-pb-blue transition-colors hover:bg-[#4b5563] hover:text-red-400"
                    aria-label={`Delete ${play.name}`}
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CourtImage({
  K,
  courtImage,
  courtX,
  courtY,
  courtW,
  courtH,
}: {
  K: typeof import("react-konva");
  courtImage: HTMLImageElement;
  courtX: number;
  courtY: number;
  courtW: number;
  courtH: number;
}) {
  const iw = courtImage.naturalWidth || 1;
  const ih = courtImage.naturalHeight || 1;
  const scale = Math.max(courtW / iw, courtH / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const x = courtX + (courtW - drawW) / 2;
  const y = courtY + (courtH - drawH) / 2;
  return (
    <K.Image
      image={courtImage}
      x={x}
      y={y}
      width={drawW}
      height={drawH}
      listening={false}
    />
  );
}

function Court({
  K,
  tx,
  ty,
  sc,
  courtImage,
}: {
  K: typeof import("react-konva");
  tx: (x: number) => number;
  ty: (y: number) => number;
  sc: number;
  courtImage: HTMLImageElement | null;
}) {
  const half = CW / 2;
  const cornerOff = half - CORNER_X;
  const cornerAngle = Math.acos(cornerOff / THREE_R);
  const arcMeetY = Math.sqrt(THREE_R ** 2 - cornerOff ** 2);
  const S = "white";
  const W = 2;
  const PAINT = "rgba(255,94,0,0.4)";

  return (
    <K.Group>
      {/* Court background: image (aspect-ratio preserved, cover) or filled rect */}
      {courtImage ? (
        <K.Group
          clip={{ x: tx(0), y: ty(0), width: CW * sc, height: CH * sc }}
          listening={false}
        >
          <CourtImage
            K={K}
            courtImage={courtImage}
            courtX={tx(0)}
            courtY={ty(0)}
            courtW={CW * sc}
            courtH={CH * sc}
          />
        </K.Group>
      ) : (
        <K.Rect
          x={tx(0)}
          y={ty(0)}
          width={CW * sc}
          height={CH * sc}
          fill="#2a2520"
          listening={false}
        />
      )}

      {/* Shelf row background (under court) */}
      <K.Rect
        x={tx(0)}
        y={ty(CH)}
        width={CW * sc}
        height={SHELF_H * sc}
        fill="#1e1e1e"
        listening={false}
      />

      {!courtImage && (
        <>
      {/* Boundary */}
      <K.Rect
        x={tx(0)}
        y={ty(0)}
        width={CW * sc}
        height={CH * sc}
        stroke={S}
        strokeWidth={W}
      />

      {/* Center line */}
      <K.Line
        points={[tx(0), ty(CH / 2), tx(CW), ty(CH / 2)]}
        stroke={S}
        strokeWidth={W}
      />

      {/* Center circles */}
      <K.Circle
        x={tx(half)}
        y={ty(CH / 2)}
        radius={CENTER_R * sc}
        stroke={S}
        strokeWidth={W}
      />
      <K.Circle
        x={tx(half)}
        y={ty(CH / 2)}
        radius={INNER_R * sc}
        stroke={S}
        strokeWidth={W}
      />

      {/* ===== TOP HALF ===== */}

      {/* Painted area */}
      <K.Rect
        x={tx(half - LANE_W / 2)}
        y={ty(0)}
        width={LANE_W * sc}
        height={LANE_H * sc}
        fill={PAINT}
        stroke={S}
        strokeWidth={W}
      />

      {/* FT semicircle - solid half (away from basket) */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(tx(half), ty(LANE_H), FT_R * sc, 0, Math.PI, false);
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
      />
      {/* FT semicircle - dashed half (toward basket) */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(
            tx(half),
            ty(LANE_H),
            FT_R * sc,
            Math.PI,
            2 * Math.PI,
            false
          );
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
        dash={[8, 6]}
      />

      {/* 3pt corner lines */}
      <K.Line
        points={[
          tx(CORNER_X),
          ty(0),
          tx(CORNER_X),
          ty(BASKET_Y + arcMeetY),
        ]}
        stroke={S}
        strokeWidth={W}
      />
      <K.Line
        points={[
          tx(CW - CORNER_X),
          ty(0),
          tx(CW - CORNER_X),
          ty(BASKET_Y + arcMeetY),
        ]}
        stroke={S}
        strokeWidth={W}
      />

      {/* 3pt arc */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(
            tx(half),
            ty(BASKET_Y),
            THREE_R * sc,
            cornerAngle,
            Math.PI - cornerAngle,
            false
          );
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
      />

      {/* Backboard */}
      <K.Line
        points={[
          tx(half - BB_W / 2),
          ty(BASKET_Y - 1.5),
          tx(half + BB_W / 2),
          ty(BASKET_Y - 1.5),
        ]}
        stroke={S}
        strokeWidth={W}
      />

      {/* Basket */}
      <K.Circle
        x={tx(half)}
        y={ty(BASKET_Y)}
        radius={RIM_R * sc}
        stroke={S}
        strokeWidth={W}
      />

      {/* ===== BOTTOM HALF ===== */}

      {/* Painted area */}
      <K.Rect
        x={tx(half - LANE_W / 2)}
        y={ty(CH - LANE_H)}
        width={LANE_W * sc}
        height={LANE_H * sc}
        fill={PAINT}
        stroke={S}
        strokeWidth={W}
      />

      {/* FT semicircle - solid half (away from basket = upward) */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(
            tx(half),
            ty(CH - LANE_H),
            FT_R * sc,
            Math.PI,
            2 * Math.PI,
            false
          );
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
      />
      {/* FT semicircle - dashed half (toward basket = downward) */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(
            tx(half),
            ty(CH - LANE_H),
            FT_R * sc,
            0,
            Math.PI,
            false
          );
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
        dash={[8, 6]}
      />

      {/* 3pt corner lines */}
      <K.Line
        points={[
          tx(CORNER_X),
          ty(CH),
          tx(CORNER_X),
          ty(CH - BASKET_Y - arcMeetY),
        ]}
        stroke={S}
        strokeWidth={W}
      />
      <K.Line
        points={[
          tx(CW - CORNER_X),
          ty(CH),
          tx(CW - CORNER_X),
          ty(CH - BASKET_Y - arcMeetY),
        ]}
        stroke={S}
        strokeWidth={W}
      />

      {/* 3pt arc */}
      <K.Shape
        sceneFunc={(ctx: any, shape: any) => {
          ctx.beginPath();
          ctx.arc(
            tx(half),
            ty(CH - BASKET_Y),
            THREE_R * sc,
            -(Math.PI - cornerAngle),
            -cornerAngle,
            false
          );
          ctx.strokeShape(shape);
        }}
        stroke={S}
        strokeWidth={W}
      />

      {/* Backboard */}
      <K.Line
        points={[
          tx(half - BB_W / 2),
          ty(CH - BASKET_Y + 1.5),
          tx(half + BB_W / 2),
          ty(CH - BASKET_Y + 1.5),
        ]}
        stroke={S}
        strokeWidth={W}
      />

      {/* Basket */}
      <K.Circle
        x={tx(half)}
        y={ty(CH - BASKET_Y)}
        radius={RIM_R * sc}
        stroke={S}
        strokeWidth={W}
      />
        </>
      )}
    </K.Group>
  );
}
