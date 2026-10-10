import React from 'react';
const radarPath = "/radar-stage3.webp";

function Panel({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 168,
        zIndex: 15,
        pointerEvents: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft:  side === 'left'  ? 12 : 0,
        paddingRight: side === 'right' ? 12 : 0,
      }}
    >
      {/* Dark tinted backing */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            side === 'left'
              ? 'linear-gradient(90deg, rgba(0,0,10,0.85) 0%, rgba(0,5,20,0.6) 100%)'
              : 'linear-gradient(270deg, rgba(0,0,10,0.85) 0%, rgba(0,5,20,0.6) 100%)',
        }}
      />

      {/* Animated scanline sweep */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(6,182,212,0.04) 0px, rgba(6,182,212,0.04) 1px, transparent 1px, transparent 4px)',
          animation: 's3-scan 2s linear infinite',
        }}
      />

      {/* Vertical neon border (inner edge) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side === 'left' ? 'right' : 'left']: 0,
          width: 2,
          background:
            'linear-gradient(180deg, transparent 0%, rgba(6,182,212,0.6) 20%, rgba(36,107,181,1) 50%, rgba(6,182,212,0.6) 80%, transparent 100%)',
          boxShadow: '0 0 12px rgba(6,182,212,0.6)',
          animation: 's3-border-pulse 1.4s ease-in-out infinite',
        }}
      />

      {/* STAGE 3 label — top */}
      <div
        style={{
          position: 'absolute',
          top: '9%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontFamily: 'monospace',
            fontWeight: 900,
            letterSpacing: '0.22em',
            color: '#ef4444',
            textShadow: '0 0 8px #ef4444, 0 0 16px #ef4444',
            animation: 's3-red-blink 0.7s steps(1) infinite',
            whiteSpace: 'nowrap',
          }}
        >
          ◆ STAGE 3 ◆
        </div>
        <div
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            letterSpacing: '0.14em',
            color: 'rgba(6,182,212,0.7)',
            whiteSpace: 'nowrap',
          }}
        >
          FINAL STRIKE
        </div>
        <div
          style={{
            width: 60,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)',
            boxShadow: '0 0 6px rgba(239,68,68,0.5)',
          }}
        />
      </div>

      {/* ── Central logo + radar overlay ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {/* Stage 03 radar artwork — isolated from Stage 01/02 side treatments */}
        <div
          style={{
            position: 'absolute',
            width: 164,
            height: 164,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            borderRadius: '50%',
            overflow: 'hidden',
            opacity: 0.82,
            filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.75))',
            pointerEvents: 'none',
          }}
        >
          <img src={radarPath} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'contain', animation: 's3-radar 1.2s linear infinite' }} />
        </div>
        {/* Outer pulse ring */}
        <div
          style={{
            position: 'absolute',
            width: 166,
            height: 166,
            borderRadius: '50%',
            border: '1px solid rgba(36,107,181,0.35)',
            animation: 's3-ring-pulse 1.4s ease-in-out infinite',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            pointerEvents: 'none',
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: '50%',
            border: '1px solid rgba(6,182,212,0.22)',
            animation: 's3-ring-pulse 1.4s 0.3s ease-in-out infinite',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-label="IT Club radar node"
          style={{
            width: 132,
            height: 132,
            padding: 10,
            border: '1px solid rgba(6,182,212,0.5)',
            borderRadius: 18,
            background: 'rgba(0,15,30,0.72)',
            boxShadow: '0 0 15px rgba(0,240,255,0.3), inset 0 0 14px rgba(6,182,212,0.18)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <img src={radarPath} alt="IT Club radar" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 0 5px rgba(0,200,255,0.95))' }} />
        </div>
      </div>

      {/* Bottom: CRITICAL alert */}
      <div
        style={{
          position: 'absolute',
          bottom: '9%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            width: 60,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)',
            boxShadow: '0 0 6px rgba(239,68,68,0.5)',
          }}
        />
        <div
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            letterSpacing: '0.12em',
            color: '#ef4444',
            textShadow: '0 0 8px #ef4444',
            animation: 's3-red-blink 0.5s steps(1) infinite',
            whiteSpace: 'nowrap',
          }}
        >
          ▶ CRITICAL
        </div>
        <div
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            letterSpacing: '0.12em',
            color: 'rgba(6,182,212,0.6)',
            whiteSpace: 'nowrap',
          }}
        >
          THREAT LVL
        </div>
        {/* Threat bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          {[1, 0.75, 0.5].map((opacity, i) => (
            <div
              key={i}
              style={{
                width: 50 - i * 8,
                height: 3,
                background: '#ef4444',
                boxShadow: '0 0 6px #ef4444',
                opacity,
                animation: `s3-bar-flicker 0.4s ${i * 0.12}s steps(1) infinite`,
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating circuit lines — decorative vertical lines */}
      {[20, 35, 55, 75].map((topPct, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${topPct}%`,
            [side === 'left' ? 'right' : 'left']: 14,
            width: 18,
            height: 1,
            background: 'rgba(6,182,212,0.4)',
            animation: `s3-circuit ${0.9 + i * 0.18}s ease-in-out ${i * 0.2}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export const Stage3SidePanels: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes s3-scan {
          0%   { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        @keyframes s3-radar {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes s3-ring-pulse {
          0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); }
          50%     { opacity: 1;   transform: translate(-50%,-50%) scale(1.06); }
        }
        @keyframes s3-logo-intensity {
          0%,100% {
            filter: drop-shadow(0 0 10px rgba(36,107,181,1))
                    drop-shadow(0 0 28px rgba(36,107,181,0.8))
                    drop-shadow(0 0 60px rgba(36,107,181,0.4));
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(36,107,181,1))
                    drop-shadow(0 0 50px rgba(6,182,212,1))
                    drop-shadow(0 0 90px rgba(6,182,212,0.65));
            opacity: 1;
          }
        }
        @keyframes s3-glitch-r {
          0%,100% { transform: translate(0,0);    opacity: 0; }
          8%       { transform: translate(-3px,1px); opacity: 0.3; }
          16%      { transform: translate(2px,-1px);  opacity: 0; }
          42%      { transform: translate(-2px,2px); opacity: 0.22; }
          50%      { transform: translate(0,0);    opacity: 0; }
          78%      { transform: translate(3px,-2px); opacity: 0.28; }
          86%      { transform: translate(0,0);    opacity: 0; }
        }
        @keyframes s3-glitch-c {
          0%,100% { transform: translate(0,0);   opacity: 0; }
          12%      { transform: translate(3px,0); opacity: 0.25; }
          20%      { transform: translate(0,0);   opacity: 0; }
          55%      { transform: translate(-3px,1px); opacity: 0.2; }
          63%      { transform: translate(0,0);   opacity: 0; }
          88%      { transform: translate(2px,-1px); opacity: 0.22; }
          94%      { transform: translate(0,0);   opacity: 0; }
        }
        @keyframes s3-border-pulse {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1; box-shadow: 0 0 20px rgba(6,182,212,0.9); }
        }
        @keyframes s3-red-blink {
          0%,46%,54%,100% { opacity: 1; }
          49%,51%          { opacity: 0.15; }
        }
        @keyframes s3-text-flicker {
          0%,94%,100% { opacity: 1; }
          95%          { opacity: 0.2; }
          97%          { opacity: 1; }
          98%          { opacity: 0.35; }
        }
        @keyframes s3-bar-flicker {
          0%,45%,55%,100% { opacity: 1; }
          50%              { opacity: 0.3; }
        }
        @keyframes s3-circuit {
          from { opacity: 0.2; width: 14px; }
          to   { opacity: 0.7; width: 28px; }
        }
        @media (max-width: 1060px) {
          .stage3-panels-hide { display: none !important; }
        }
      `}</style>
      <div className="stage3-panels-hide">
        <Panel side="left" />
        <Panel side="right" />
      </div>
    </>
  );
};
