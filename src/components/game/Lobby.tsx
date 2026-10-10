import React, { useState, useEffect, useRef } from "react";
import { playTabChime } from "@/game/sounds";
import {
  Bot,
  Braces,
  ChevronLeft,
  Cpu,
  Crosshair,
  Network,
  Orbit,
  Palette,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const logoPath = "/itclub-logo-badge.svg";

interface LobbyProps {
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (
    roomId: string,
    playerName: string,
  ) => Promise<{ hostName: string }>;
  onRoomCreated: (playerName: string, roomId: string) => void;
  onRoomJoined: (
    playerName: string,
    roomId: string,
    opponentName: string,
  ) => void;
  onOpenLeaderboard?: () => void;
  connectionError?: string;
}

const missions = [
  {
    code: "01",
    titleAr: "اكتب الكلمات",
    titleEn: "TYPE THE WORDS",
    descAr: "اكتب 10 كلمات بسرعة، وكل كلمة صح تبني قطعة من الدرع!",
    descEn: "Type 10 words fast. Every correct word builds a piece of your shield!",
    status: "active",
  },
  {
    code: "02",
    titleAr: "الأسهم والمطابقة",
    titleEn: "Arrows & Matching",
    descAr: "اضغط المفتاح المطلوب، وشاهد الصورة المخفية تظهر شيئاً فشيئاً.",
    descEn: "Press the key shown on screen and watch the hidden picture appear.",
    status: "upcoming",
  },
  {
    code: "03",
    titleAr: "كتابة الكلمة",
    titleEn: "Type the Word",
    descAr: "اكتب الكلمة الظاهرة أمامك بسرعة، فهذا آخر تحدٍّ قبل الفوز!",
    descEn: "Type the word you see, as fast as you can. It is the last challenge!",
    status: "upcoming",
  },
] as const;

const specialties = [
  {
    id: "cyber",
    short: "CYBER",
    title: "Cybersecurity",
    titleAr: "الأمن السيبراني",
    description: "Defend systems, think like an attacker, and secure every layer of the network.",
    descAr: "حماية الأنظمة والتصدي للثغرات، تفكير المهاجم وبناء دروع الحماية السيبرانية الشاملة.",
    skills: ["Ethical Hacking", "Network Security", "Digital Forensics"],
    stat: "98.7%",
    statLabel: "THREAT COVERAGE",
    icon: ShieldCheck,
    glowClass: "specialty-tab-cyber",
  },
  {
    id: "ai",
    short: "AI / DATA",
    title: "AI & Data Analytics",
    titleAr: "الذكاء الاصطناعي والبيانات",
    description: "Train intelligent models and turn raw data into decisions that matter.",
    descAr: "بناء النماذج الذكية واستخراج القيمة من البيانات لتشغيل جيل المستقبل الرقمي.",
    skills: ["Machine Learning", "Data Analysis", "Predictive AI"],
    stat: "42 TB",
    statLabel: "DATA PROCESSED",
    icon: Bot,
    glowClass: "specialty-tab-ai",
  },
  {
    id: "software",
    short: "CS / SWE",
    title: "Computer Science & Software Engineering",
    titleAr: "علوم الحاسوب وهندسة البرمجيات",
    description: "Engineer scalable software, from clean algorithms to full-stack products.",
    descAr: "تطوير البرمجيات المعقدة، بناء الخوارزميات وتصميم السيرفرات والتطبيقات القابلة للتوسع.",
    skills: ["Full-Stack Dev", "Algorithms", "System Design"],
    stat: "127",
    statLabel: "SYSTEM BUILDS",
    icon: Braces,
    glowClass: "specialty-tab-software",
  },
  {
    id: "media",
    short: "MEDIA",
    title: "Digital Multimedia & Graphic Design",
    titleAr: "الوسائط والتقنيات الرقمية",
    description: "Craft interfaces, 3D worlds, and interactive media people remember.",
    descAr: "صناعة التجربة البصرية، الهويات الرقمية، وتصميم الواجهات السيبرانية التفاعلية.",
    skills: ["UI/UX Design", "3D Modeling", "Motion Graphics"],
    stat: "4K",
    statLabel: "CREATIVE OUTPUT",
    icon: Palette,
    glowClass: "specialty-tab-media",
  },
] as const;

export const Lobby: React.FC<LobbyProps> = ({
  createRoom,
  joinRoom,
  onRoomCreated,
  onRoomJoined,
  onOpenLeaderboard,
  connectionError,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [creating, setCreating] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState(0);
  const [showOrbit, setShowOrbit] = useState(false);
  const playerNameRef = useRef(playerName);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    if (connectionError) setError(connectionError);
  }, [connectionError]);

  const current = specialties[activeSpecialty];
  const CurrentIcon = current.icon;

  const selectSpecialty = (index: number, withSound = true) => {
    if (index === activeSpecialty) return;
    if (withSound) playTabChime();
    setActiveSpecialty(index);
  };

  const handleCreate = async () => {
    const name = playerName.trim();
    if (!name) {
      setError("Enter your hacker name first.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const roomId = await createRoom(name);
      setCreating(false);
      onRoomCreated(name, roomId);
    } catch (err) {
      setCreating(false);
      setError(err instanceof Error ? err.message : "Could not create a room.");
    }
  };

  const handleJoin = async () => {
    const name = playerName.trim();
    if (!name) {
      setError("Enter your hacker name first.");
      return;
    }
    if (!roomInput.trim()) {
      setError("Enter a Room ID.");
      return;
    }
    setError("");
    const roomId = roomInput.trim().toUpperCase();
    try {
      const { hostName } = await joinRoom(roomId, name);
      onRoomJoined(name, roomId, hostName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the room.");
    }
  };

  return (
    <div className="relative z-10 flex h-dvh w-full overflow-y-auto p-4 lg:p-5">
      <div className="m-auto flex w-full max-w-5xl flex-col items-stretch gap-6 lg:flex-row">
        {/* ── Login Card ── */}
        <div className="flex-shrink-0 lg:w-[420px] w-full glass-card p-6 rounded-lg shadow-2xl flex flex-col">
          <div className="logo-slot mb-4 flex items-center justify-center px-6 py-4">
            <span className="logo-slot-corner left-0 top-0 border-l-2 border-t-2" aria-hidden="true" />
            <span className="logo-slot-corner right-0 top-0 border-r-2 border-t-2" aria-hidden="true" />
            <span className="logo-slot-corner bottom-0 left-0 border-b-2 border-l-2" aria-hidden="true" />
            <span className="logo-slot-corner bottom-0 right-0 border-b-2 border-r-2" aria-hidden="true" />
            <img
              src={logoPath}
              alt="IT Club Logo"
              className="pointer-events-none mx-auto aspect-square h-auto w-full max-w-[132px] rounded-md border border-primary/60 object-cover shadow-[0_0_12px_hsl(var(--primary)/0.55),0_0_32px_hsl(var(--primary)/0.2)]"
            />
          </div>

          <h1 className="neon-title mb-1 text-center text-4xl font-black leading-tight tracking-wide">
            CYBER RESCUE
          </h1>
          <p className="mb-6 text-center text-sm uppercase tracking-widest text-secondary text-glow-secondary">
            1 vs 1 Cyber Battle
          </p>

          <label className="text-xs uppercase tracking-widest text-muted-foreground mb-1 block">
            Your Hacker Name
          </label>
          <input
            type="text"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            className="w-full bg-input border border-border text-foreground p-4 mb-5 text-xl text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            autoFocus
          />

          {mode === "choice" && (
            <div className="flex flex-col gap-3">
              {/* PRIMARY: CREATE ROOM — fires socket directly */}
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="h-auto w-full rounded-none border border-primary py-4 text-xl font-bold glow-pulse hover:bg-background hover:text-primary"
              >
                {creating ? "⏳ GENERATING ROOM…" : "+ CREATE ROOM"}
              </Button>

              <Button
                onClick={() => {
                  if (!playerName.trim()) {
                    setError("Enter your hacker name first.");
                    return;
                  }
                  setError("");
                  setMode("join");
                }}
                variant="secondary"
                className="h-auto w-full rounded-none border border-secondary py-4 text-xl font-bold hover:bg-background hover:text-secondary"
              >
                → JOIN ROOM
              </Button>
            </div>
          )}

          {mode === "join" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-1 block">
                Room ID
              </label>
              <input
                type="text"
                placeholder="e.g. AB12CD"
                value={roomInput}
                onChange={(e) => {
                  setRoomInput(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                className="w-full bg-input border border-border text-foreground p-4 text-xl text-center tracking-widest focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                maxLength={8}
                autoFocus
              />
              <Button
                onClick={handleJoin}
                variant="secondary"
                className="h-auto w-full rounded-none border border-secondary py-4 text-xl font-bold hover:bg-background hover:text-secondary"
              >
                JOIN BATTLE
              </Button>
              <Button
                onClick={() => {
                  setMode("choice");
                  setError("");
                }}
                variant="ghost"
                className="text-muted-foreground text-sm"
              >
                <ChevronLeft aria-hidden="true" /> Back
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-destructive text-center font-bold animate-pulse">
              {error}
            </p>
          )}
        </div>

        {/* ── IT Club Showcase + Mission Briefing ── */}
        <div className="briefing-console relative flex min-w-0 flex-1 flex-col overflow-hidden border border-primary/20 bg-card/85 backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-primary to-secondary" />

          <header className="flex items-center justify-between gap-4 border-b border-primary/20 px-5 py-2.5">
            <div className="min-w-0">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                System Protocol // Academic Division
              </span>
              <h2 className="text-2xl font-black uppercase leading-tight text-foreground">
                IT CLUB <span className="text-primary text-glow-primary">SHOWCASE</span>
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span className="border border-secondary/25 bg-secondary/5 px-2 py-1 text-secondary">● Active</span>
              <span className="flex h-7 w-7 items-center justify-center border border-secondary/40 bg-secondary/5" title="Systems online">
                <Cpu className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              </span>
            </div>
          </header>

          <section aria-label="IT Club disciplines" className="border-b border-primary/20 px-5 pb-3 pt-2.5">
            <div
              className="flex items-start justify-center gap-3 sm:gap-6"
              role="tablist"
              aria-label="Choose a discipline"
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const delta = e.key === "ArrowRight" ? 1 : -1;
                const next = (activeSpecialty + delta + specialties.length) % specialties.length;
                selectSpecialty(next);
                document.getElementById(`discipline-tab-${specialties[next].id}`)?.focus();
              }}
            >
              {specialties.map((specialty, index) => {
                const Icon = specialty.icon;
                const active = index === activeSpecialty;
                return (
                  <button
                    key={specialty.id}
                    id={`discipline-tab-${specialty.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="discipline-stage"
                    tabIndex={active ? 0 : -1}
                    onClick={() => selectSpecialty(index)}
                    onMouseEnter={() => selectSpecialty(index, false)}
                    className={`discipline-avatar ${specialty.glowClass} group flex w-[72px] flex-col items-center gap-2 focus-visible:outline-none sm:w-20 ${
                      active ? "discipline-avatar-active" : ""
                    }`}
                  >
                    <span className="discipline-avatar-ring flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                    </span>
                    <span className="discipline-avatar-label whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-wider">
                      {specialty.short}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              id="discipline-stage"
              role="tabpanel"
              aria-labelledby={`discipline-tab-${current.id}`}
              key={current.id}
              className="discipline-stage mt-2.5 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-stretch"
            >
              <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:justify-center sm:border-r sm:border-primary/15 sm:pr-4">
                <span className="discipline-stage-icon flex h-11 w-11 items-center justify-center rounded-full">
                  <CurrentIcon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="flex flex-col sm:items-center">
                  <strong className="font-mono text-xl leading-none text-secondary text-glow-secondary">{current.stat}</strong>
                  <span className="mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground/60 sm:text-center">
                    {current.statLabel}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div dir="rtl" lang="ar" className="text-right">
                  <h3 className="font-arabic text-xl font-extrabold leading-snug text-primary text-glow-primary">
                    {current.titleAr}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55" dir="ltr">
                    {current.title}
                  </p>
                  <p className="mt-1 font-arabic text-base font-semibold leading-relaxed text-foreground [text-wrap:pretty]">
                    {current.descAr}
                  </p>
                </div>
                <ul className="mt-auto flex flex-wrap justify-end gap-1.5" aria-label="Key skills">
                  {current.skills.map((skill) => (
                    <li key={skill} className="skill-tag whitespace-nowrap px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide">
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="flex flex-1 flex-col px-5 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Quick Mission Briefing</h3>
              </div>
              <div className="flex items-center gap-3">
                <p dir="rtl" lang="ar" className="font-arabic text-sm font-bold text-foreground/80">
                  المراحل — اقرأ قبل المعركة
                </p>
                <button
                  type="button"
                  onClick={() => setShowOrbit(true)}
                  className="flex items-center gap-1.5 border border-primary/40 bg-primary/5 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary transition hover:border-primary hover:shadow-[0_0_12px_var(--color-primary)]"
                >
                  <Orbit className="h-3.5 w-3.5" aria-hidden="true" />
                  Orbital View
                </button>
                <button type="button" onClick={onOpenLeaderboard} className="flex items-center gap-1.5 border border-secondary/40 bg-secondary/5 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-secondary transition hover:border-secondary">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> LEADERBOARD
                </button>
              </div>
            </div>
            <ol className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              {missions.map((mission) => {
                const isActive = mission.status === "active";
                return (
                  <li
                    key={mission.code}
                    className={`stage-card flex flex-col gap-1.5 p-3 ${isActive ? "stage-card-active" : "stage-card-upcoming"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`whitespace-nowrap font-mono text-xs font-black tracking-[0.15em] ${isActive ? "text-secondary" : "text-primary/70"}`}>
                        STAGE {mission.code}{mission.code === "01" ? " · SHIELD BUILDER" : ""}
                      </span>
                      <span
                        className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                          isActive ? "border-secondary/50 bg-secondary/10 text-secondary" : "border-primary/20 text-primary/60"
                        }`}
                      >
                        {isActive ? "Active" : "Upcoming"}
                      </span>
                    </div>
                    <h4 className="font-mono text-xs font-bold uppercase leading-snug text-foreground">{mission.titleEn}</h4>
                    <p className="font-mono text-xs leading-relaxed text-foreground/80">{mission.descEn}</p>
                    <div dir="rtl" lang="ar" className="text-right">
                      <p className={`font-arabic text-[15px] font-bold leading-snug ${isActive ? "text-secondary" : "text-primary"}`}>
                        {mission.titleAr}
                      </p>
                      <p className="mt-1 font-arabic text-sm leading-relaxed text-foreground/90">{mission.descAr}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-2.5 flex items-center justify-center gap-2 border border-chart-4/30 bg-chart-4/5 p-1.5 text-center text-chart-4">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span dir="rtl" lang="ar" className="font-arabic text-sm font-bold leading-relaxed">
                أول من ينهي المراحل الثلاث هو الفائز، فكن سريعاً ودقيقاً!
              </span>
              <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </div>
          </section>
        </div>
      </div>
      {showOrbit && (
        <div role="dialog" aria-modal="true" aria-label="Cyber mission phases" className="fixed inset-0 z-50">
          <RadialOrbitalTimeline onClose={() => setShowOrbit(false)} />
        </div>
      )}
    </div>
  );
};
