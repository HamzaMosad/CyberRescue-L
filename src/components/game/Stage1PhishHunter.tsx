import { useEffect, useMemo, useRef, useState } from "react";
import { applyKey, getShieldScore, getShieldWords, SB_CONFIG, type ShieldTypingState } from "@/lib/shield-builder";
import { playBackspaceClick, playErrorTone, playStageBeep } from "@/game/sounds";
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";

export type Stage1PeerMsg =
  | { type: "STAGE1_SEED"; seed: number }
  | { type: "STAGE1_PROGRESS"; segments: number; score: number }
  | { type: "STAGE1_DONE"; segments: number; score: number };

interface Props {
  isHost: boolean;
  seed: number;
  playerName: string;
  opponentName: string;
  sendToPeer: (msg: Stage1PeerMsg) => void;
  peerMessage: Stage1PeerMsg | null;
  addScore: (amount: number) => void;
  onProgress: (progress: number) => void;
  onStageComplete: (score: number) => void;
  gameOver?: boolean;
  practiceOnly?: boolean;
  onPracticeReady?: () => void;
  startAt?: number;
  clockOffset?: number;
}

export function Stage1PhishHunter({ seed, opponentName, sendToPeer, peerMessage, addScore, onProgress, onStageComplete, gameOver = false, practiceOnly = false, onPracticeReady, startAt, clockOffset = 0 }: Props) {
  const words = useMemo(() => getShieldWords(seed), [seed]);
  const [practiceLeft, setPracticeLeft] = useState<number>(practiceOnly ? SB_CONFIG.PRACTICE_SECONDS : 0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const practicing = practiceOnly || practiceLeft > 0;
  const word = practicing ? ["pass", "bug"][practiceIndex % 2] : words[wordIndex] ?? words.at(-1)!;
  const [typing, setTyping] = useState<ShieldTypingState>(() => ({ word, typed: "", mistakes: 0, correctKeystrokes: 0, totalKeystrokes: 0, completed: false }));
  const typingRef = useRef(typing);
  const [elapsed, setElapsed] = useState(0);
  const [opponentSegments, setOpponentSegments] = useState(0);
  const [complete, setComplete] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [bolt, setBolt] = useState(0);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const practiceReadyRef = useRef(false);
  typingRef.current = typing;

  useEffect(() => {
    if (!practiceOnly || practiceLeft <= 0 || gameOver) return;
    const interval = window.setInterval(() => setPracticeLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [practiceOnly, practiceLeft, gameOver]);

  useEffect(() => {
    if (!practiceOnly || practiceLeft > 0 || gameOver || practiceReadyRef.current) return;
    practiceReadyRef.current = true;
    onPracticeReady?.();
  }, [practiceOnly, practiceLeft, gameOver, onPracticeReady]);

  useEffect(() => {
    if (practicing || gameOver || complete) return;
    startRef.current ??= startAt ?? Date.now() + clockOffset;
    const interval = window.setInterval(() => setElapsed((Date.now() + clockOffset - startRef.current!) / 1000), 100);
    return () => window.clearInterval(interval);
  }, [practicing, gameOver, complete, startAt, clockOffset]);

  useEffect(() => {
    if (peerMessage?.type === "STAGE1_PROGRESS" || peerMessage?.type === "STAGE1_DONE") {
      setOpponentSegments(Number(peerMessage.segments) || 0);
    }
  }, [peerMessage]);

  useEffect(() => {
    if (gameOver || complete || (practiceOnly && practiceLeft <= 0)) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (event.key === "Enter" && practiceOnly) {
        event.preventDefault();
        setPracticeLeft(0);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        playBackspaceClick();
        const next = applyKey(typingRef.current, event.key, event.code);
        typingRef.current = next;
        setTyping(next);
        return;
      }
      if (event.key.length !== 1) return;
      event.preventDefault();
      const previous = typingRef.current;
      const next = applyKey(previous, event.key, event.code);
      typingRef.current = next;
      setTyping(next);
      const correct = next.correctKeystrokes > previous.correctKeystrokes;
      if (!correct) {
        playErrorTone();
        setWrongFlash(true);
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setWrongFlash(false), 150);
        return;
      }
      if (practicing) {
        if (next.completed) {
          const nextPracticeIndex = practiceIndex + 1;
          const nextWord = ["pass", "bug"][nextPracticeIndex % 2];
          const reset = { ...next, word: nextWord, typed: "", completed: false };
          typingRef.current = reset;
          setTyping(reset);
          setPracticeIndex(nextPracticeIndex);
        }
        return;
      }
      if (next.completed) {
        const finishedWords = wordIndex + 1;
        setBolt(finishedWords);
        playStageBeep();
        const ratio = next.totalKeystrokes ? next.correctKeystrokes / next.totalKeystrokes : 1;
        const score = finishedWords * SB_CONFIG.WORD_SCORE;
        addScore(SB_CONFIG.WORD_SCORE);
        onProgress((finishedWords / SB_CONFIG.WORD_COUNT) * 100);
        sendToPeer({ type: "STAGE1_PROGRESS", segments: finishedWords, score });
        const nextWord = practicing ? word : words[Math.min(finishedWords, words.length - 1)]!;
        const reset = { ...next, word: nextWord, typed: "", completed: false };
        typingRef.current = reset;
        setTyping(reset);
        setWordIndex(finishedWords);
        if (finishedWords >= SB_CONFIG.WORD_COUNT) {
          if (doneRef.current) return;
          doneRef.current = true;
          const wordPoints = SB_CONFIG.WORD_COUNT * SB_CONFIG.WORD_SCORE;
          const finalScore = getShieldScore((Date.now() + clockOffset - (startRef.current ?? Date.now() + clockOffset)) / 1000, ratio);
          addScore(finalScore - wordPoints);
          setComplete(true);
          sendToPeer({ type: "STAGE1_DONE", segments: SB_CONFIG.WORD_COUNT, score: finalScore });
          completeTimerRef.current = window.setTimeout(() => onStageComplete(finalScore), 1000);
        } else setWordIndex(finishedWords);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [practiceOnly, practiceLeft, practicing, gameOver, complete, word, practiceIndex, wordIndex, words, addScore, onProgress, onStageComplete, sendToPeer]);

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}.${Math.floor((elapsed * 10) % 10)}`;
  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
  }, []);
  const localSegments = Math.min(wordIndex, SB_CONFIG.WORD_COUNT);
  return (
    <main className="fixed inset-0 z-20 flex h-screen w-screen items-center justify-center overflow-hidden bg-[#050b14] px-4 text-[#dffaff]">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#00f0ff18 1px,transparent 1px),linear-gradient(90deg,#00f0ff18 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
      <header className="absolute left-6 right-20 top-5 flex items-center justify-between font-mono text-xs tracking-[.2em] text-[#00f0ff]">
        <b>STAGE 01 · SHIELD BUILDER</b><b>STOPWATCH {time}</b>
      </header>
      <section className="relative flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <div className="relative flex h-[min(48vh,420px)] w-[min(48vh,420px)] items-center justify-center">
          <RotatingEarth width={380} height={380} className="shield-earth pointer-events-none absolute inset-0 opacity-75" />
          <div className="shield-orbit absolute inset-0 animate-[spin_36s_linear_infinite] rounded-full border border-dashed border-cyan-300/40" />
          <div className="shield-orbit absolute inset-[9%] animate-[spin_24s_linear_infinite_reverse] rounded-full border border-cyan-400/30" />
          <div className="relative h-[62%] w-[62%] overflow-hidden rounded-full border border-cyan-300/70 bg-[radial-gradient(circle_at_35%_30%,#47e2cd,#176e93_42%,#07172c_74%)] shadow-[0_0_55px_#00f0ff66,inset_-25px_-12px_35px_#020611]">
            <div className="absolute inset-y-0 left-[35%] w-[18%] rounded-[50%] border-x border-cyan-100/30 bg-cyan-200/10" />
            <div className="absolute inset-x-0 top-[37%] h-[22%] border-y border-cyan-100/30 bg-cyan-200/10" />
          </div>
          <div className="pointer-events-none absolute inset-[15%] rounded-full border border-cyan-300/20" />
          <div className="absolute inset-0">
            {Array.from({ length: SB_CONFIG.WORD_COUNT }, (_, i) => {
              const angle = (360 / SB_CONFIG.WORD_COUNT) * i;
              return <div key={i} className={`shield-segment absolute left-1/2 top-1/2 h-5 w-11 rounded-md border transition-all ${i < localSegments ? "shield-locked border-[#00ff66] bg-[#00ff66]/35 shadow-[0_0_18px_#00ff66]" : "border-[#00f0ff]/60 bg-black/50"}`} style={{ transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-17vh) rotate(${-angle}deg)` }} />;
            })}
          </div>
          {bolt > 0 && <div key={bolt} className="shield-bolt absolute left-1/2 top-1/2 z-10 text-2xl text-[#00f0ff]">⚡</div>}
        </div>
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/40 px-7 py-2 font-mono text-[clamp(3rem,8vw,6rem)] font-black tracking-[.18em] shadow-[0_0_30px_#00f0ff22] backdrop-blur-md" aria-live="polite">
          {word.split("").map((letter, i) => <span key={`${word}-${i}`} className={wrongFlash && i === typing.typed.length ? "text-[#ff3366]" : i < typing.typed.length ? "text-[#00ff66]" : i === typing.typed.length ? "text-[#00f0ff] underline decoration-4 underline-offset-8" : "text-white/45"}>{letter}</span>)}
        </div>
        {practicing ? <p className="font-mono text-sm text-cyan-200">PRACTICE · {practiceOnly ? practiceLeft : "10"}s · Try “pass” and “bug”{practiceOnly && <span> · ENTER TO SKIP</span>}</p> : <p className="font-mono text-xs text-cyan-100/70">WORD {Math.min(wordIndex + 1, SB_CONFIG.WORD_COUNT)} / {SB_CONFIG.WORD_COUNT} · SHIELD {localSegments}/10 · Type the letters · Backspace corrects</p>}
        <div className="font-mono text-xs tracking-widest text-cyan-100/70">{opponentName || "OPPONENT"} · SHIELD {opponentSegments}/10</div>
        {complete && <div className="absolute inset-0 flex items-center justify-center bg-[#050b14]/90 font-mono text-4xl font-black tracking-widest text-[#00ff66]">SHIELD ONLINE</div>}
      </section>
      <style>{`.shield-earth { z-index: 0; } .shield-earth > div { position: absolute !important; left: 50%; top: 50%; transform: translate(-50%,-50%); } .shield-earth canvas { border-radius: 50%; } @keyframes shield-lock { 50% { transform: scale(1.18); filter: brightness(1.8); } } @keyframes shield-bolt { 0% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(120px,-150px) scale(.4); } } .shield-locked { animation: shield-lock 260ms ease-out 1; } .shield-bolt { animation: shield-bolt 420ms ease-out forwards; } @media (prefers-reduced-motion: reduce) { .shield-orbit,.shield-locked,.shield-bolt { animation: none !important; transition: none !important; } }`}</style>
    </main>
  );
}
