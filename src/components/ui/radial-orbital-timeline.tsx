import { useState, useEffect, useRef, useCallback } from "react";
import type { ElementType, MouseEvent } from "react";
import { ArrowLeft, Code, Cpu, Link, Shield, Terminal, X, Zap } from "lucide-react";

interface TimelineItem {
  id: number;
  title: string;
  titleAr: string;
  content: string;
  category: string;
  icon: ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

const timelineData: TimelineItem[] = [
  {
    id: 1,
    title: "STAGE 01: SHIELD BUILDER",
    titleAr: "بناء الدرع",
    content: "اكتب 10 كلمات، وكل كلمة صحيحة تضيف قطعة إلى درعك.",
    category: "Code",
    icon: Terminal,
    relatedIds: [2],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "STAGE 02: MATCHING",
    titleAr: "الأسهم والمطابقة",
    content: "استخدم الأسهم لمطابقة المسارات السيبرانية الصحيحة بدقة عالية.",
    category: "Network",
    icon: Shield,
    relatedIds: [1, 3],
    status: "in-progress",
    energy: 70,
  },
  {
    id: 3,
    title: "STAGE 03: TYPE WORD",
    titleAr: "كتابة الكلمة",
    content: "أدخل المفتاح النهائي المفكوك لتأكيد الحماية التامة والتصدر.",
    category: "System",
    icon: Code,
    relatedIds: [2],
    status: "pending",
    energy: 40,
  },
];

const ORBIT_RADIUS = 130;

const statusLabel: Record<TimelineItem["status"], string> = {
  completed: "ACTIVE",
  "in-progress": "IN PROGRESS",
  pending: "UPCOMING",
};

const statusStyles: Record<TimelineItem["status"], string> = {
  completed: "text-[#00ffcc] bg-[#00ffcc]/10 border-[#00ffcc]",
  "in-progress": "text-[#00ff66] bg-[#00ff66]/10 border-[#00ff66] animate-pulse",
  pending: "text-white/50 bg-black/40 border-white/20",
};

interface RadialOrbitalTimelineProps {
  onClose?: () => void;
}

export default function RadialOrbitalTimeline({ onClose }: RadialOrbitalTimelineProps) {
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const autoRotate = activeNodeId === null;

  const resetView = useCallback(() => {
    setActiveNodeId(null);
    setPulseEffect({});
  }, []);

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) resetView();
  };

  const toggleItem = (id: number) => {
    if (activeNodeId === id) {
      resetView();
      return;
    }
    const nodeIndex = timelineData.findIndex((item) => item.id === id);
    const current = timelineData[nodeIndex];
    setActiveNodeId(id);
    setPulseEffect(Object.fromEntries(current.relatedIds.map((relId) => [relId, true])));
    setRotationAngle(270 - (nodeIndex / timelineData.length) * 360);
  };

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => setRotationAngle((prev) => (prev + 0.4) % 360), 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeNodeId !== null) resetView();
      else onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeNodeId, onClose, resetView]);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;
    return {
      x: ORBIT_RADIUS * Math.cos(radian),
      y: ORBIT_RADIUS * Math.sin(radian),
      zIndex: Math.round(100 + 50 * Math.cos(radian)),
      opacity: Math.max(0.6, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))),
    };
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative flex h-screen max-h-screen w-full select-none flex-col items-center justify-center overflow-hidden bg-[#050b14] font-mono text-cyan-400"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(#00ffcc 1px, transparent 1px), linear-gradient(to right, #00ffcc0a 1px, transparent 1px), linear-gradient(to bottom, #00ffcc0a 1px, transparent 1px)",
          backgroundSize: "20px 20px, 40px 40px, 40px 40px",
        }}
      />

      <header className="absolute left-6 top-4 z-20 flex items-center gap-3 border-l-2 border-[#00ffcc] pl-3">
        <Terminal className="animate-pulse text-[#00ffcc]" size={20} aria-hidden="true" />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-cyan-500">SYSTEM PROTOCOL // STAGES</p>
          <h2 className="text-sm font-bold tracking-wider text-white">CYBER MISSION PHASES</h2>
        </div>
      </header>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close mission phases"
          className="absolute right-[4.5rem] top-3 z-20 flex h-9 w-9 items-center justify-center border border-[#00ffcc]/40 bg-[#0a1526]/80 text-[#00ffcc] transition hover:border-[#00ffcc] hover:shadow-[0_0_15px_rgba(0,255,204,0.4)]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}

      <p
        dir="rtl"
        lang="ar"
        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap font-arabic text-xs text-cyan-200/60"
      >
        اضغط على أي مرحلة لعرض تفاصيلها
      </p>

      <div className="relative flex h-full w-full max-w-2xl items-center justify-center">
        <div ref={orbitRef} className="absolute flex h-full w-full items-center justify-center">
          <div className="absolute z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[#00ffcc] bg-[#00ffcc]/10 shadow-[0_0_20px_rgba(0,255,204,0.4)]">
            <div className="absolute h-20 w-20 animate-ping rounded-full border border-[#00ffcc]/30 opacity-50" />
            <Cpu className="h-8 w-8 animate-pulse text-[#00ffcc]" aria-hidden="true" />
          </div>

          <div
            aria-hidden="true"
            className="absolute rounded-full border border-dashed border-[#00ffcc]/20 animate-[spin_60s_linear_infinite]"
            style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }}
          />

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = activeNodeId === item.id;
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="absolute transition-all duration-500"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  zIndex: isExpanded ? 200 : position.zIndex,
                  opacity: isExpanded ? 1 : position.opacity,
                }}
              >
                <div
                  aria-hidden="true"
                  className={`absolute -inset-2 rounded-full ${isPulsing ? "animate-ping opacity-75" : "opacity-20"}`}
                  style={{ background: "radial-gradient(circle, rgba(0,255,204,0.4) 0%, transparent 70%)" }}
                />

                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={item.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItem(item.id);
                  }}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-lg border backdrop-blur-md transition-all duration-300 ${
                    isExpanded
                      ? "scale-125 border-white bg-[#00ffcc] text-black shadow-[0_0_25px_#00ffcc]"
                      : "border-[#00ffcc]/40 bg-[#0a1526]/80 text-[#00ffcc] hover:border-[#00ffcc]"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>

                <span
                  className={`pointer-events-none absolute left-1/2 top-13 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    isExpanded ? "scale-110 text-[#00ffcc]" : "text-cyan-200/70"
                  }`}
                >
                  {item.title}
                </span>

                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-1/2 top-[4.5rem] z-50 w-60 -translate-x-1/2 border border-[#00ffcc]/50 bg-[#081220]/95 text-white shadow-[0_0_30px_rgba(0,255,204,0.2)] backdrop-blur-xl"
                  >
                    <div className="border-b border-white/10 p-3 pb-2">
                      <div className="flex items-center justify-between">
                        <span className={`border px-2 py-0.5 text-[9px] font-bold tracking-wider ${statusStyles[item.status]}`}>
                          {statusLabel[item.status]}
                        </span>
                        <span className="text-[10px] text-cyan-400/60">{item.category.toUpperCase()}</span>
                      </div>
                      <h3 className="mt-1.5 text-xs font-bold tracking-wide text-[#00ffcc]">{item.title}</h3>
                    </div>

                    <div dir="rtl" lang="ar" className="p-3 text-right font-arabic">
                      <p className="text-sm font-bold leading-relaxed text-[#00ff66]">{item.titleAr}</p>
                      <p className="mt-0.5 text-xs leading-[1.8] text-cyan-100/80">{item.content}</p>

                      <div className="mt-2.5 border-t border-white/10 pt-2">
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Zap size={10} aria-hidden="true" />
                            الطاقة المطلوبة
                          </span>
                          <span className="font-mono text-[#00ffcc]">{item.energy}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full border border-cyan-500/20 bg-black/60">
                          <div
                            className="h-full bg-gradient-to-l from-cyan-500 to-[#00ff66]"
                            style={{ width: `${item.energy}%` }}
                          />
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-2.5 border-t border-white/10 pt-2">
                          <div className="mb-1.5 flex items-center gap-1 text-cyan-400">
                            <Link size={10} aria-hidden="true" />
                            <h4 className="text-[10px] font-medium">المراحل المرتبطة</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return (
                                <button
                                  key={relatedId}
                                  type="button"
                                  onClick={() => toggleItem(relatedId)}
                                  className="flex h-5 items-center gap-1 border border-[#00ffcc]/30 bg-[#00ffcc]/5 px-2 font-mono text-[9px] text-cyan-200 transition hover:bg-[#00ffcc]/20"
                                >
                                  {relatedItem?.title.split(":")[0]}
                                  <ArrowLeft size={8} className="text-cyan-400" aria-hidden="true" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
