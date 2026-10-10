import React, { useState, useEffect, useRef } from 'react';
const imgPath = "/robot-new.webp";

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="60" y="50" width="80" height="90" rx="12" stroke="currentColor" strokeWidth="3" />
      <circle cx="85" cy="80" r="10" fill="currentColor" opacity="0.6" />
      <circle cx="115" cy="80" r="10" fill="currentColor" opacity="0.6" />
      <rect x="80" y="105" width="40" height="8" rx="4" fill="currentColor" opacity="0.4" />
      <line x1="100" y1="20" x2="100" y2="50" stroke="currentColor" strokeWidth="3" />
      <circle cx="100" cy="18" r="6" stroke="currentColor" strokeWidth="3" />
      <rect x="50" y="140" width="20" height="30" rx="4" stroke="currentColor" strokeWidth="3" />
      <rect x="130" y="140" width="20" height="30" rx="4" stroke="currentColor" strokeWidth="3" />
      <line x1="60" y1="70" x2="40" y2="75" stroke="currentColor" strokeWidth="3" />
      <circle cx="35" cy="75" r="6" stroke="currentColor" strokeWidth="3" />
      <line x1="140" y1="70" x2="160" y2="75" stroke="currentColor" strokeWidth="3" />
      <circle cx="165" cy="75" r="6" stroke="currentColor" strokeWidth="3" />
      <rect x="70" y="160" width="60" height="6" rx="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M100 20 L170 50 L170 110 Q170 160 100 180 Q30 160 30 110 L30 50 Z" stroke="currentColor" strokeWidth="3" />
      <path d="M100 50 L140 65 L140 105 Q140 135 100 150 Q60 135 60 105 L60 65 Z" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <path d="M80 100 L95 115 L125 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Stage3Props {
  onComplete: () => void;
  freezeTimer: () => void;
  addScore: (amount: number) => void;
  onProgress: (progress: number) => void;
  t: any;
  gameOver?: boolean;
}

export const Stage3: React.FC<Stage3Props> = ({ onComplete, freezeTimer, addScore, onProgress, t, gameOver = false }) => {
  const [glitchLevel, setGlitchLevel] = useState(6);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [input, setInput] = useState('');
  const [isVictory, setIsVictory] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [victorySeconds, setVictorySeconds] = useState(3);
  const [robotImageFailed, setRobotImageFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryTimerRef = useRef<number | null>(null);
  const victoryStartedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const gameOverRef = useRef(gameOver);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    if (popTimerRef.current) { clearTimeout(popTimerRef.current); popTimerRef.current = null; }
    if (victoryTimerRef.current) { clearTimeout(victoryTimerRef.current); victoryTimerRef.current = null; }
    inputRef.current?.blur();
  }, [gameOver]);

  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (popTimerRef.current) { clearTimeout(popTimerRef.current); popTimerRef.current = null; }
      if (victoryTimerRef.current) { clearTimeout(victoryTimerRef.current); victoryTimerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isVictory) return;
    setVictorySeconds(3);
    const countdown = window.setInterval(() => setVictorySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(countdown);
  }, [isVictory]);

  const phrases: string[] = t.stage3Phrases;
  const currentPhrase = phrases[phraseIndex] ?? phrases[0];

  const completePhrase = () => {
      if (gameOverRef.current || isVictory || completedRef.current) return;
      addScore(15);
      setInput('');

      const newIndex = phraseIndex + 1;
      setPhraseIndex(newIndex);
      setIsPopping(true);

      const progress = Math.round((newIndex / phrases.length) * 100);
      onProgressRef.current(progress);

      if (popTimerRef.current) clearTimeout(popTimerRef.current);

      setIsPopping(false);
      const newGlitch = Math.round(6 * (1 - newIndex / phrases.length));
      setGlitchLevel(Math.max(0, newGlitch));

      if (newIndex >= phrases.length && !victoryStartedRef.current) {
        // Lock synchronously before any React update so one final keystroke can only complete once.
        victoryStartedRef.current = true;
        completedRef.current = true;
        freezeTimer();
        setGlitchLevel(0);
        if (popTimerRef.current) clearTimeout(popTimerRef.current);
        onCompleteRef.current();
      }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameOverRef.current || isVictory || completedRef.current) return;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      setInput((value) => value.slice(0, -1));
      return;
    }
    if (event.key.length !== 1) return;
    event.preventDefault();
    let ch = event.key.toLowerCase();
    if (!/^[a-z0-9]$/.test(ch)) {
      const letter = /^Key([A-Z])$/.exec(event.code);
      const digit = /^Digit([0-9])$/.exec(event.code);
      ch = letter?.[1]?.toLowerCase() ?? digit?.[1] ?? ch;
    }
    const expected = currentPhrase[input.length]?.toLowerCase();
    if (ch !== expected) return;
    const next = input + ch;
    setInput(next);
    if (next.length === currentPhrase.length) completePhrase();
  };

  const getFilterStyle = (): React.CSSProperties => {
    if (glitchLevel === 0 || isVictory) return {};
    const blur = glitchLevel * 1.5;
    const brightness = 1 - glitchLevel * 0.1;
    const hue = glitchLevel * 15;
    return {
      filter: `blur(${blur}px) brightness(${brightness}) hue-rotate(${hue}deg) contrast(${100 + glitchLevel * 20}%)`,
    };
  };

  if (isVictory) {
    return (
      <div
        className="fixed inset-0 z-50 flex h-full w-full cursor-pointer flex-col items-center justify-center bg-background/95 px-6"
        role="button"
        tabIndex={0}
        aria-label="Open final scoreboard"
        onClick={() => {
          if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
          victoryTimerRef.current = null;
          onCompleteRef.current();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
            victoryTimerRef.current = null;
            onCompleteRef.current();
          }
        }}
      >
        <div className="s3-neon-frame-victory relative flex items-center justify-center overflow-hidden">
          {!robotImageFailed ? (
            <img src={imgPath} alt="Secured Robot" className="relative z-10 h-full w-full object-contain" onError={() => setRobotImageFailed(true)} />
          ) : (
            <RobotIcon className="h-32 w-32 text-primary drop-shadow-[0_0_16px_currentColor]" />
          )}
        </div>
        <ShieldIcon className="w-12 h-12 text-secondary mt-4 animate-pulse" />
        <h1 className="text-5xl md:text-7xl font-bold text-secondary text-glow-secondary text-center mb-4 animate-pulse mt-4" style={{ lineHeight: 1.15 }}>
          SYSTEM SECURED!
        </h1>
        <h2 className="text-3xl md:text-5xl font-bold text-primary text-glow-primary text-center">
          ROBOT SAVED!
        </h2>
        <p className="mt-6 text-muted-foreground text-sm uppercase tracking-widest">
          SCOREBOARD SYNC IN {victorySeconds}s
        </p>
        <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-muted" aria-label={`Victory transition ${victorySeconds} seconds remaining`}>
          <div className="h-full bg-primary shadow-[0_0_12px_currentColor] transition-[width] duration-1000" style={{ width: `${((3 - victorySeconds) / 3) * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full pt-6 flex flex-col items-center justify-center relative overflow-hidden">

      <div className="absolute top-0 left-0 right-0 text-center bg-background/80 pl-4 pr-20 py-2 border-b border-border z-10">
        <p className="text-lg text-primary text-glow-primary">{t.stage3Objective}</p>
        <div className="w-full bg-input h-2 mt-1">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(phraseIndex / phrases.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {phraseIndex} / {phrases.length}
        </p>
      </div>

      {/* Centered neon frame with image + SVG fallback */}
      <div className="relative mb-4 flex-shrink-0">
        <div
          className={`s3-neon-frame relative overflow-hidden bg-black glow-pulse ${glitchLevel > 0 ? 'glitch-effect' : ''} ${isPopping ? 'img-pop-out' : ''}`}
          style={{
            width: "min(320px, 36vh)",
            aspectRatio: "1 / 1",
            ...getFilterStyle(),
          }}
        >
          <img src={imgPath} alt="Target" className="relative z-10 w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        </div>

        {/* SVG robot fallback — shows behind the image while it loads */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
          <RobotIcon className="w-24 h-24 text-primary/30" />
        </div>

        {glitchLevel > 0 && !isPopping && (
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay animate-pulse pointer-events-none" />
        )}
      </div>

      <div className="w-full max-w-xl text-center px-4 flex-shrink-0">
        <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">
          Type this word:
        </p>
        <div className="text-4xl font-bold mb-4 text-destructive text-glow-destructive tracking-widest bg-destructive/10 p-4 border border-destructive uppercase">
          {currentPhrase}
        </div>
        <input
          ref={inputRef}
          data-testid="input-stage3"
          type="text"
          value={input}
          onKeyDown={handleKeyDown}
          readOnly
          placeholder={t.typeHere}
          className="w-full bg-input border-2 border-primary text-primary p-4 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-primary text-glow-primary"
          autoFocus
          onBlur={() => inputRef.current?.focus()}
        />
      </div>
    </div>
  );
};
