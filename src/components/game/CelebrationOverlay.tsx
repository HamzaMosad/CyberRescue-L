import React, { useEffect, useState, useMemo } from 'react';
const robotImg = "/robot-new.webp";
import logoAsset from "@/assets/itclub-logo.svg.asset.json";
const logoPath = logoAsset.url;

interface CelebrationOverlayProps {
  isWinner: boolean;
  winnerName: string;
  loserName: string;
  countdown: number;
}

const BURST_COLORS = ['#FBBF24', '#FFD700', '#FFF176', '#FFA500', '#FFFFFF', '#00FF80', '#06B6D4'];
const CONFETTI_COLORS = ['#FBBF24', '#06B6D4', '#22C55E', '#EC4899', '#A78BFA', '#FFFFFF', '#F97316'];

function VictoryParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: 20 + Math.random() * 60,
      top: 20 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 260,
      vy: -(Math.random() * 200 + 60),
      size: 5 + Math.floor(Math.random() * 9),
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
      delay: Math.random() * 0.8,
      duration: 1.4 + Math.random() * 1.2,
      isCircle: Math.random() > 0.4,
    }))
  , []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            boxShadow: `0 0 6px ${p.color}`,
            animation: `cel-burst-fly ${p.duration}s ${p.delay}s ease-out forwards`,
            ['--vx' as string]: `${p.vx}px`,
            ['--vy' as string]: `${p.vy}px`,
          }}
        />
      ))}
    </div>
  );
}

function ConfettiRain() {
  const flakes = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 2.5 + Math.random() * 2,
      size: 6 + Math.floor(Math.random() * 8),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      isCircle: Math.random() > 0.45,
      drift: (Math.random() - 0.5) * 130,
    }))
  , []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: '-40px',
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            ['--drift' as string]: `${p.drift}px`,
            animation: `cel-confetti-fall ${p.duration}s ${p.delay}s ease-in infinite`,
            boxShadow: `0 0 4px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isWinner,
  winnerName,
  loserName,
  countdown,
}) => {
  const [showRobot, setShowRobot] = useState(isWinner);
  const [robotImageFailed, setRobotImageFailed] = useState(false);

  useEffect(() => {
    if (!isWinner) return;
    setShowRobot(true);
    const t = setTimeout(() => setShowRobot(false), 1500);
    return () => clearTimeout(t);
  }, [isWinner]);

  const barPct = Math.max(0, (countdown / 7) * 100);

  return (
    <>
      <style>{`
        @keyframes cel-burst-fly {
          0%   { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translate(var(--vx),var(--vy)) rotate(720deg) scale(0.2); }
        }
        @keyframes cel-confetti-fall {
          0%   { opacity: 1; transform: translateY(-40px) rotate(0deg) translateX(0px); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(110vh) rotate(900deg) translateX(var(--drift)); }
        }
        @keyframes cel-pop-in {
          0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          65%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          85%  { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes cel-slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes cel-gold-glow {
          0%,100% { text-shadow: 0 0 30px #FBBF24, 0 0 60px #FBBF24, 0 0 100px #FFA500; }
          50%      { text-shadow: 0 0 60px #FBBF24, 0 0 120px #FBBF24, 0 0 200px #FFA500; }
        }
        @keyframes cel-trophy-bounce {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-14px) scale(1.12); }
        }
        @keyframes cel-robot-appear {
          0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cel-robot-exit {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        @keyframes cel-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cel-logo-drop {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.85); }
          60%  { transform: translateX(-50%) translateY(4px) scale(1.04); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[90] flex items-center justify-center"
        style={{
          background: isWinner
            ? 'radial-gradient(ellipse at center, rgba(251,191,36,0.2) 0%, #000008 65%)'
            : 'radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, #000008 65%)',
          animation: 'cel-fade-in 0.4s ease-out',
        }}
      >
        {isWinner && <VictoryParticles />}
        {isWinner && <ConfettiRain />}

        {/* ── IT Club logo — cleanly centered above card, static cyan/blue glow ── */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(50% - 310px)',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            animation: 'cel-logo-drop 0.55s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <img
            src={logoPath}
            alt="IT Club"
            style={{
              width: 100,
              objectFit: 'contain',
              filter:
                'drop-shadow(0 0 8px rgba(36,107,181,1)) drop-shadow(0 0 22px rgba(36,107,181,0.65)) drop-shadow(0 0 45px rgba(36,107,181,0.3))',
              opacity: 0.95,
            }}
          />
          <div
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              letterSpacing: '0.35em',
              color: 'rgba(6,182,212,0.65)',
              textShadow: '0 0 8px rgba(6,182,212,0.5)',
              textTransform: 'uppercase',
            }}
          >
            IT CLUB
          </div>
        </div>

        {/* ── WINNER ── */}
        {isWinner && (
          <div
            className="relative flex flex-col items-center gap-4 text-center px-10 py-8 rounded-2xl"
            style={{
              background: 'rgba(0,0,8,0.8)',
              border: '2px solid rgba(251,191,36,0.65)',
              boxShadow: '0 0 60px rgba(251,191,36,0.4), 0 0 120px rgba(251,191,36,0.15)',
              backdropFilter: 'blur(10px)',
              maxWidth: '520px',
              width: '92%',
              animation: 'cel-pop-in 0.6s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* Robot appears for first 3 s */}
            {showRobot && (
              <div
                style={{
                  animation: 'cel-robot-appear 0.5s ease-out both',
                  width: 180,
                  height: 180,
                }}
              >
          {robotImageFailed ? (
            <svg viewBox="0 0 200 200" role="img" aria-label="Secured Robot fallback" style={{ width: "100%", height: "100%", color: "#FBBF24" }}>
              <rect x="55" y="50" width="90" height="85" rx="14" fill="none" stroke="currentColor" strokeWidth="5" />
              <circle cx="82" cy="88" r="9" fill="currentColor" /><circle cx="118" cy="88" r="9" fill="currentColor" />
              <path d="M78 112h44M100 50V28M92 28h16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          ) : <img
            src={robotImg}
            alt="Secured Robot"
            onError={() => setRobotImageFailed(true)}
            style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 12,
                    boxShadow: '0 0 40px rgba(251,191,36,0.7), 0 0 80px rgba(251,191,36,0.3)',
                    border: '3px solid rgba(251,191,36,0.8)',
                  }}
                />}
              </div>
            )}

            {/* Trophy — shows after robot exits */}
            {!showRobot && (
              <div
                className="text-7xl select-none"
                style={{ animation: 'cel-trophy-bounce 1.2s ease-in-out infinite' }}
              >
                🏆
              </div>
            )}

            <div
              className="text-5xl sm:text-6xl font-black uppercase tracking-tight"
              style={{
                color: '#FBBF24',
                fontFamily: 'monospace',
                animation: 'cel-gold-glow 1.5s ease-in-out infinite',
              }}
            >
              VICTORY!
            </div>

            <div className="text-xl font-bold text-yellow-200 tracking-widest uppercase">
              {winnerName}
            </div>

            <div className="text-sm text-yellow-300/80 uppercase tracking-[0.3em] font-semibold"
              style={{ textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
              ⚡ SYSTEM DOMINANCE ACHIEVED ⚡
            </div>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-1 w-full mt-1">
              <div className="text-xs text-yellow-500/70 uppercase tracking-widest">
                Battle Complete screen in
              </div>
              <div className="text-3xl font-black tabular-nums"
                style={{ color: '#FBBF24', textShadow: '0 0 20px #FBBF24' }}>
                {countdown}
              </div>
              <div className="w-full h-1 bg-yellow-900/40 rounded overflow-hidden">
                <div className="h-full rounded"
                  style={{
                    background: '#FBBF24',
                    boxShadow: '0 0 8px #FBBF24',
                    width: `${barPct}%`,
                    transition: 'width 0.95s linear',
                  }} />
              </div>
            </div>
          </div>
        )}

        {/* ── LOSER ── */}
        {!isWinner && (
          <div
            className="relative flex flex-col items-center gap-5 text-center px-10 py-8 rounded-2xl"
            style={{
              background: 'rgba(0,0,8,0.82)',
              border: '2px solid rgba(139,92,246,0.55)',
              boxShadow: '0 0 40px rgba(139,92,246,0.35)',
              backdropFilter: 'blur(10px)',
              maxWidth: '500px',
              width: '92%',
              animation: 'cel-slide-up 0.5s ease-out both',
            }}
          >
            <div className="text-6xl select-none">💜</div>

            <div
              className="text-4xl sm:text-5xl font-black uppercase tracking-tight"
              style={{
                color: '#A78BFA',
                textShadow: '0 0 30px rgba(139,92,246,0.8), 0 0 60px rgba(139,92,246,0.4)',
                fontFamily: 'monospace',
              }}
            >
              GOOD LUCK
            </div>
            <div className="text-2xl font-bold text-purple-300 uppercase tracking-wider"
              style={{ textShadow: '0 0 15px rgba(139,92,246,0.6)' }}>
              NEXT TIME!
            </div>

            <div className="text-sm text-purple-300/70 uppercase tracking-[0.2em] font-semibold">
              Recalibrate &amp; Return Stronger
            </div>
            <div className="text-base text-purple-200/80 font-bold tracking-widest">
              {loserName}
            </div>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-1 w-full mt-1">
              <div className="text-xs text-purple-500/70 uppercase tracking-widest">
                Battle Complete screen in
              </div>
              <div className="text-3xl font-black tabular-nums"
                style={{ color: '#A78BFA', textShadow: '0 0 20px #A78BFA' }}>
                {countdown}
              </div>
              <div className="w-full h-1 bg-purple-900/40 rounded overflow-hidden">
                <div className="h-full rounded"
                  style={{
                    background: '#A78BFA',
                    boxShadow: '0 0 8px #A78BFA',
                    width: `${barPct}%`,
                    transition: 'width 0.95s linear',
                  }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
