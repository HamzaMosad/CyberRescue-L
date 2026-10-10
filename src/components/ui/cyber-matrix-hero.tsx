import { useEffect, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/?;:"[]{}\\|!@#$%^&*()_+-=';
const TILE_SIZE = 60;

const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

interface CyberMatrixHeroProps {
  logoSrc?: string;
  onEnter?: () => void;
}

const CyberMatrixHero = ({
  logoSrc = "/itclub-logo-badge.svg",
  onEnter,
}: CyberMatrixHeroProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let centers: { x: number; y: number }[] = [];
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const timeouts = new Set<number>();

    const measure = () => {
      centers = Array.from(grid.children).map((tile) => {
        const rect = tile.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    };

    const buildGrid = () => {
      const columns = Math.max(1, Math.floor(grid.clientWidth / TILE_SIZE));
      const rows = Math.max(1, Math.floor(grid.clientHeight / TILE_SIZE));
      grid.style.setProperty("--columns", String(columns));
      grid.style.setProperty("--rows", String(rows));

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < columns * rows; i++) {
        const tile = document.createElement("span");
        tile.className = "matrix-tile";
        tile.textContent = randomChar();
        fragment.appendChild(tile);
      }
      grid.replaceChildren(fragment);
      requestAnimationFrame(measure);
    };

    const paint = () => {
      frame = 0;
      if (!pointer) return;
      const radius = window.innerWidth / 4;
      const tiles = grid.children;
      for (let i = 0; i < tiles.length; i++) {
        const c = centers[i];
        if (!c) continue;
        const distance = Math.hypot(pointer.x - c.x, pointer.y - c.y);
        const intensity = Math.max(0, 1 - distance / radius);
        (tiles[i] as HTMLElement).style.setProperty("--intensity", intensity.toFixed(3));
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains("matrix-tile")) return;
      target.textContent = randomChar();
      target.classList.add("glitch");
      const id = window.setTimeout(() => {
        target.classList.remove("glitch");
        timeouts.delete(id);
      }, 200);
      timeouts.add(id);
    };

    buildGrid();
    window.addEventListener("resize", buildGrid);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("pointermove", handlePointerMove);
    grid.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(frame);
      timeouts.forEach((id) => clearTimeout(id));
      window.removeEventListener("resize", buildGrid);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("pointermove", handlePointerMove);
      grid.removeEventListener("click", handleClick);
    };
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15 + 0.3, duration: 0.7, ease: "easeInOut" },
    }),
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4"
    >
      <div ref={gridRef} aria-hidden="true" className="matrix-tiles" />

      <style>{`
        .matrix-tiles {
          display: grid;
          grid-template-columns: repeat(var(--columns), 1fr);
          grid-template-rows: repeat(var(--rows), 1fr);
          position: absolute;
          inset: 0;
        }
        .matrix-tile {
          --intensity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          font-family: var(--font-mono);
          font-size: 1.15rem;
          opacity: calc(0.12 + var(--intensity) * 0.88);
          color: hsl(var(--secondary) / calc(0.55 + var(--intensity) * 0.45));
          text-shadow: 0 0 calc(var(--intensity) * 14px) hsl(var(--secondary));
          transform: scale(calc(1 + var(--intensity) * 0.2));
          transition: color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease;
        }
        .matrix-tile.glitch { animation: matrix-glitch 0.2s ease; }
        @keyframes matrix-glitch {
          50% { transform: scale(1.25); color: hsl(var(--primary)); text-shadow: 0 0 10px hsl(var(--primary)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .matrix-tile { transition: none; transform: none; }
          .matrix-tile.glitch { animation: none; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_85%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center rounded-xl border border-primary/20 bg-background/70 px-6 py-10 text-center shadow-[0_0_60px_-15px_hsl(var(--primary)/0.45)] backdrop-blur-md md:px-12">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
          <img
            src={logoSrc}
            alt="IT Club logo"
            width={112}
            height={117}
            className="h-28 w-auto rounded-lg border border-primary/30 shadow-[0_0_24px_hsl(var(--primary)/0.35)]"
          />
        </motion.div>

        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5"
        >
          <ShieldCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            IT Club // 1v1 Cyber Battle
          </span>
        </motion.div>

        <motion.h1
          id="hero-title"
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-4 font-mono text-5xl font-extrabold uppercase tracking-tighter text-primary text-glow-primary text-balance md:text-7xl"
        >
          Cyber Rescue
        </motion.h1>

        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mb-2 max-w-xl font-body text-lg leading-relaxed text-foreground/85 text-pretty"
        >
          Race a friend through three cyber-rescue stages. Build a shield, reveal a hidden picture, and restore a damaged file.
        </motion.p>
        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          dir="rtl"
          className="mx-auto mb-8 max-w-xl font-body text-base font-semibold text-muted-foreground"
        >
          تحدَّ صديقك في معركة سيبرانية من ثلاث مراحل
        </motion.p>

        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
          <Button
            onClick={onEnter}
            size="lg"
            className="h-auto gap-2 rounded-md px-8 py-4 font-mono text-base font-bold uppercase tracking-wider glow-pulse"
          >
            Enter the Arena
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CyberMatrixHero;
