import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, LockKeyhole, Zap } from "lucide-react";
import { playErrorTone, playKeyClick, playStageBeep, playTabChime, stopAllSounds } from "@/game/sounds";
import { arrangeTiles, buildTilePlan, fixedCount, TILE_COUNT, TILE_GRID } from "@/game/image-tiles";
import targetAsset from "@/assets/stage2-target.webp";
import { MatrixRain } from "./MatrixRain";

const GRID_SIZE = 4;
const CODES = Array.from({ length: 16 }, (_, i) => `${"ABCD"[i % 4]}${Math.floor(i / 4) + 1}`);
const STEPS = ["MATCH", "CONNECT", "FIREWALL", "DECRYPT", "RESTORE"];
const TILE_SEED = 20260210;
const IMG = targetAsset;

function newGrid() {
  const grid = [...CODES];
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j]!, grid[i]!];
  }
  return { grid, target: grid[Math.floor(Math.random() * grid.length)] ?? "A1" };
}

interface Stage2Props {
  onComplete: () => void;
  addScore: (amount: number) => void;
  onProgress: (progress: number) => void;
  t: { stage2Objective: string; targetCipher?: string };
  gameOver: boolean;
}

export function Stage2({ onComplete, addScore, onProgress, t, gameOver }: Stage2Props) {
  const [round, setRound] = useState({ grid: [] as string[], target: "", step: 0 });
  const [cursor, setCursor] = useState(0);
  const [trail, setTrail] = useState<number | null>(null);
  const [boardPx, setBoardPx] = useState(0);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const typedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settling, setSettling] = useState(false);
  const [wrongKey, setWrongKey] = useState<number | null>(null);
  const [burnKey, setBurnKey] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [flashTiles, setFlashTiles] = useState<number[]>([]);
  const [glitchTile, setGlitchTile] = useState<number | null>(null);
  const [redFlicker, setRedFlicker] = useState(false);
  const [restored, setRestored] = useState(false);
  const roundRef = useRef(round);
  const cursorRef = useRef(0);
  const typedRef = useRef("");
  const lockedRef = useRef(false);
  const solvedRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOverRef = useRef(gameOver);
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  const [hintActive, setHintActive] = useState(false);
  const idleSinceRef = useRef(Date.now());
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  const callbacksRef = useRef({ onComplete, addScore, onProgress });
  useEffect(() => { callbacksRef.current = { onComplete, addScore, onProgress }; }, [onComplete, addScore, onProgress]);
  const later = (fn: () => void, ms: number) => { timersRef.current.push(setTimeout(fn, ms)); };

  const plan = useMemo(() => buildTilePlan(TILE_SEED), []);

  useEffect(() => {
    if (!gameOver) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (typedTimerRef.current) clearTimeout(typedTimerRef.current);
    stopAllSounds();
  }, [gameOver]);

  useEffect(() => {
    const first = { ...newGrid(), step: 0 };
    roundRef.current = first;
    setRound(first);
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (typedTimerRef.current) clearTimeout(typedTimerRef.current);
    };
  }, []);

  const completed = round.step + (settling ? 1 : 0);
  const fixed = useMemo(() => new Set(plan.fixOrder.slice(0, fixedCount(completed))), [plan, completed]);
  const slots = useMemo(() => arrangeTiles(plan, fixed), [plan, fixed]);
  const quality = 1 - completed / STEPS.length;
  const imagePanel = useMemo(() => (
    <div className="relative grid min-h-0 flex-1 place-items-center">
      <div className={`s2-frame relative h-auto max-h-full w-full max-w-full ${restored ? "s2-frame-ok" : ""}`} style={{ aspectRatio: "3 / 2" }}>
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-background">
          {Array.from({ length: TILE_COUNT }, (_, tile) => {
            const slot = slots[tile] ?? tile;
            const isFixed = fixed.has(tile);
            const glitch = glitchTile === tile;
            const blur = isFixed && !glitch ? 0 : 2 + quality * 8;
            const split = isFixed && !glitch ? 0 : Math.max(1, quality * 8);
            return <div key={tile} className={`s2-tile absolute ${isFixed && !glitch ? "" : "s2-tile-loose"} ${flashTiles.includes(tile) ? "s2-tile-flash" : ""}`}
              style={{ width: `${100 / TILE_GRID}%`, height: `${100 / TILE_GRID}%`, left: `${(slot % TILE_GRID) * 100 / TILE_GRID}%`, top: `${Math.floor(slot / TILE_GRID) * 100 / TILE_GRID}%`, backgroundImage: `url(${IMG})`, backgroundSize: `${TILE_GRID * 100}% ${TILE_GRID * 100}%`, backgroundPosition: `${(tile % TILE_GRID) * 100 / (TILE_GRID - 1)}% ${Math.floor(tile / TILE_GRID) * 100 / (TILE_GRID - 1)}%`, transform: isFixed ? "none" : `rotate(${plan.rotations[tile]}deg)`, filter: blur ? `blur(${blur}px) contrast(1.4) drop-shadow(${split}px 0 0 var(--destructive)) drop-shadow(-${split}px 0 0 var(--primary))` : "none", imageRendering: isFixed ? "auto" : "pixelated" }} />;
          })}
          <div className="s2-noise pointer-events-none absolute inset-0" style={{ opacity: quality * 0.35 }} />
          <div className="s2-scan pointer-events-none absolute inset-0" />
          {restored && <div className="s2-shock pointer-events-none absolute left-1/2 top-1/2 rounded-full" />}
          {restored && <div className="absolute inset-0 grid place-items-center"><span className="rounded-lg bg-background/80 px-4 py-2 text-xl font-black text-secondary text-glow-secondary sm:text-3xl">SIGNAL RESTORED 100%</span></div>}
        </div>
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => <span key={c} className={`s2-bracket absolute h-6 w-6 ${c}`} />)}
        <span className="absolute left-3 top-2 text-sm text-primary">SIGNAL {completed * 20}%</span>
        <span className="absolute right-3 top-2 text-sm text-destructive">REC ●</span>
      </div>
    </div>
  ), [completed, fixed, flashTiles, glitchTile, plan, quality, restored, slots]);

  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoardPx(Math.floor(Math.min(el.clientWidth, el.clientHeight))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clearTyped = useCallback(() => {
    typedRef.current = ""; setTyped("");
    if (typedTimerRef.current) clearTimeout(typedTimerRef.current);
  }, []);

  const move = useCallback((dr: number, dc: number) => {
    if (gameOverRef.current || lockedRef.current || solvedRef.current >= STEPS.length) return;
    const prev = cursorRef.current;
    setTrail(prev);
    later(() => setTrail((t) => (t === prev ? null : t)), 260);
    playKeyClick();
    const r = (Math.floor(cursorRef.current / GRID_SIZE) + dr + GRID_SIZE) % GRID_SIZE;
    const c = (cursorRef.current % GRID_SIZE + dc + GRID_SIZE) % GRID_SIZE;
    cursorRef.current = r * GRID_SIZE + c;
    setCursor(cursorRef.current);
  }, []);

  const select = useCallback((index: number) => {
    const current = roundRef.current;
    if (gameOverRef.current || lockedRef.current || !current.target || current.step !== solvedRef.current || solvedRef.current >= STEPS.length) return;
    cursorRef.current = index;
    setCursor(index);
    setPressedKey(index);
    later(() => setPressedKey(null), 120);
    idleSinceRef.current = Date.now(); setHintActive(false);
    typedRef.current = ""; setTyped("");
    if (current.grid[index] !== current.target) {
      playErrorTone();
      setWrongKey(index); later(() => setWrongKey(null), 300);
      setRedFlicker(true); later(() => setRedFlicker(false), 250);
      const locked = plan.fixOrder.slice(0, fixedCount(current.step));
      if (locked.length) { setGlitchTile(locked[Math.floor(Math.random() * locked.length)]!); later(() => setGlitchTile(null), 1000); }
      return;
    }
    // Guard synchronously, before any callbacks or React updates can run again.
    lockedRef.current = true;
    const done = current.step + 1;
    solvedRef.current = done;
    setBurnKey(index);
    setFlashTiles(plan.fixOrder.slice(fixedCount(current.step), fixedCount(done)));
    later(() => setFlashTiles([]), 400);
    setSettling(true);
    playStageBeep(); playTabChime();
    callbacksRef.current.addScore(20);
    callbacksRef.current.onProgress(Math.round(done / STEPS.length * 100));
    if (done === STEPS.length) {
      setRestored(true);
      later(() => callbacksRef.current.onComplete(), 1600);
      return;
    }
    later(() => {
      const next = { ...newGrid(), step: done };
      cursorRef.current = 0; setCursor(0);
      roundRef.current = next;
      setRound(next);
      setSettling(false);
      setBurnKey(null);
      lockedRef.current = false;
    }, 550);
  }, [plan]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOverRef.current || e.altKey || e.ctrlKey || e.metaKey) return;
      const code = e.code;
      const letter = /^Key([A-D])$/.exec(code)?.[1] ?? (/^[a-d]$/i.test(e.key) ? e.key.toUpperCase() : undefined);
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(code)?.[1] ?? (/^[1-4]$/.test(e.key) ? e.key : undefined);
      const dirs: Record<string, [number, number]> = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (code === "Escape") { clearTyped(); return; }
      if (code === "Enter" || code === "NumpadEnter" || code === "Space") { e.preventDefault(); if (!e.repeat) select(cursorRef.current); return; }
      if (dirs[code]) { e.preventDefault(); move(...dirs[code]!); return; }
      if (letter) {
        // A / D double as WASD left/right while also starting a code.
        if (letter === "A") move(0, -1);
        if (letter === "D") move(0, 1);
        typedRef.current = letter; setTyped(letter);
        if (typedTimerRef.current) clearTimeout(typedTimerRef.current);
        typedTimerRef.current = setTimeout(clearTyped, 1200);
        return;
      }
      if (digit && typedRef.current.length === 1) {
        const idx = roundRef.current.grid.indexOf(typedRef.current + digit);
        clearTyped();
        if (idx >= 0) select(idx);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move, select, clearTyped, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const focus = () => inputRef.current?.focus({ preventScroll: true });
    focus();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [gameOver, round.step]);

  useEffect(() => {
    if (gameOver || !round.target) return;
    const id = window.setInterval(() => {
      setHintActive(Date.now() - idleSinceRef.current >= 6000);
    }, 250);
    return () => window.clearInterval(id);
  }, [round.step, gameOver, round.target]);

  return (
    <section className={`s2 relative isolate grid h-full w-full max-w-[1800px] grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden px-3 pb-3 font-mono sm:px-5 ${redFlicker ? "s2-red" : ""}`} aria-label="Stage 02 crypto matrix">
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-20"><MatrixRain /></div>

      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Sequential patches">
        {STEPS.map((step, index) => {
          const done = index < completed;
          const active = index === round.step && !settling;
          return (
            <li key={step} data-testid={`circuit-step-${index + 1}`} data-state={done ? "complete" : active ? "active" : "locked"} aria-current={active ? "step" : undefined}
              className={`circuit-node flex items-center justify-between gap-1 !py-1.5 ${done ? "circuit-node-done" : active ? "circuit-node-active" : "circuit-node-locked"}`}>
              <span className="truncate text-sm font-bold">0{index + 1} <span className="hidden sm:inline">{step}</span></span>
              {done ? <Check size={16} /> : active ? <Zap size={16} /> : <LockKeyhole size={14} />}
            </li>
          );
        })}
      </ol>

      <div className="grid min-h-0 grid-cols-[45fr_55fr] gap-3">
        {/* DECRYPTION FEED */}
        <div className="s2-panel flex min-h-0 flex-col gap-2 p-2 sm:p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="hidden text-sm text-muted-foreground lg:inline">{t.targetCipher || "TARGET CIPHER KEY"}</span>
              <span key={round.target} data-testid="cipher-target" className="s2-target text-4xl font-black text-secondary text-glow-secondary sm:text-5xl">{round.target || "—"}</span>
              <span className="truncate text-sm text-primary">{settling ? "VERIFIED" : STEPS[round.step]}</span>
              {typed && <span className="rounded-full border border-primary/50 px-2 text-base text-primary">{typed}_</span>}
            </div>
            <div className="flex shrink-0 gap-1">{STEPS.map((s, i) => <span key={s} className={`h-2.5 w-5 rounded-full ${i < completed ? "bg-secondary" : "bg-muted"}`} />)}</div>
          </div>

          {imagePanel}

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm text-muted-foreground">SYSTEM INTEGRITY: {completed * 20}%</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary shadow-[0_0_12px_var(--primary)] transition-all duration-500" style={{ width: `${completed * 20}%` }} /></div>
          </div>
        </div>

        {/* INPUT BUS */}
        <div className="s2-panel relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-4 sm:p-5" role="group" aria-label="Cipher circuit array">
          <span className="s2-screw left-3 top-3" aria-hidden="true" /><span className="s2-screw right-3 top-3" aria-hidden="true" />
          <span className="s2-screw bottom-3 left-3" aria-hidden="true" /><span className="s2-screw bottom-3 right-3" aria-hidden="true" />
          <div className="flex min-h-9 items-center justify-between gap-3 border-b border-cyan-300/15 pb-2 text-xs uppercase tracking-[.18em] text-muted-foreground sm:text-sm">
            <span className="font-bold text-cyan-100">INPUT BUS <span className="text-cyan-400/60">4 x 4</span></span>
            <span className="rounded-full border border-cyan-300/20 bg-black/40 px-3 py-1 font-bold text-cyan-200" aria-live="polite">{typed ? `${typed}_` : "_ _"}</span>
            <span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${wrongKey !== null ? "bg-red-400" : "bg-emerald-300 animate-pulse"}`} />{wrongKey !== null ? "MISMATCH" : settling ? "PATCHED" : "AWAITING"}</span>
          </div>
          <div ref={boardWrapRef} className="s2-board-wrap relative min-h-0 flex-1 py-3">
            <div ref={inputRef} tabIndex={0} autoFocus className="s2-board absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2" role="listbox" aria-label="Cipher keys" style={{ width: boardPx, height: boardPx, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(0, 1fr))" }}>
              {round.grid.map((code, index) => {
                const accent = code[0]?.toLowerCase() ?? "a";
                return <button type="button" tabIndex={-1} key={`${round.step}-${index}`} role="option" aria-label={`Key ${code}`} aria-selected={index === cursor} data-testid={`cipher-cell-${index}`} onClick={() => !settling && select(index)}
                  className={`s2-key s2-key-${accent} ${index === cursor ? "s2-key-focus" : ""} ${trail === index ? "s2-key-trail" : ""} ${wrongKey === index ? "s2-key-wrong" : ""} ${burnKey === index ? "s2-key-burn" : ""} ${pressedKey === index ? "s2-key-pressed" : ""} ${hintActive && round.target === code ? "s2-key-hint" : ""}`} style={{ animationDelay: `${index * 20}ms` }}>
                  <span className="s2-key-index">{String(index + 1).padStart(2, "0")}</span><i className="s2-key-led" />
                  {index === cursor && <><span className="s2-corner s2-c1" /><span className="s2-corner s2-c2" /><span className="s2-corner s2-c3" /><span className="s2-corner s2-c4" /><span className="s2-sweep" /></>}
                  {burnKey === index && <><span className="s2-ring" /><span className="s2-zap" /></>}
                  <span className="s2-key-label"><b>{burnKey === index ? "✓" : code[0]}</b><small>{code[1]}</small></span>
                </button>;
              })}
            </div>
          </div>
          <p className="shrink-0 border-t border-cyan-300/15 pt-2 text-center text-[10px] tracking-wide text-muted-foreground sm:text-xs"><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> MOVE <span className="px-1 text-cyan-500/60">|</span> <kbd>ENTER</kbd> / <kbd>SPACE</kbd> SELECT <span className="px-1 text-cyan-500/60">|</span> TYPE <kbd>C4</kbd></p>
        </div>
      </div>
    </section>
  );
}
