import React from 'react';
import { LeaderboardEntry } from "@/game/types";

interface MatchResultProps {
  isWinner: boolean;
  winnerName: string;
  loserName: string;
  leaderboard: LeaderboardEntry[];
  onContinue: () => void;
}

export const MatchResult: React.FC<MatchResultProps> = ({
  isWinner,
  winnerName,
  loserName,
  leaderboard,
  onContinue,
}) => {
  const winnerEntry = leaderboard.find((e) => e.result === 'WIN') || leaderboard[0];
  const loserEntry = leaderboard.find((e) => e.result === 'LOSS') || leaderboard[1];
  const winnerScore = winnerEntry?.score ?? 0;
  const loserScore = loserEntry?.score ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #000005 100%)' }}
    >
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Animated grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,128,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-5xl px-6 flex flex-col items-center gap-6">

        {/* Header */}
        <div className="text-center">
          <div
            className="text-xs font-mono tracking-[0.5em] uppercase mb-1"
            style={{ color: '#00ff80', textShadow: '0 0 10px #00ff80' }}
          >
            // PACKET PATCH 1v1
          </div>
          <div
            className="text-5xl sm:text-6xl font-black tracking-tight uppercase"
            style={{
              color: '#fff',
              textShadow: '0 0 30px rgba(0,255,128,0.6), 0 0 60px rgba(0,255,128,0.3)',
              fontFamily: 'monospace',
            }}
          >
            BATTLE.COMPLETE
          </div>
        </div>

        {/* VS separator line */}
        <div className="flex items-center gap-4 w-full max-w-2xl">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #00ff80)' }} />
          <div
            className="text-2xl font-black tracking-widest px-4"
            style={{ color: '#00ff80', textShadow: '0 0 20px #00ff80' }}
          >
            VS
          </div>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #ff003c, transparent)' }} />
        </div>

        {/* Podium Cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-3xl">

          {/* CHAMPION Card */}
          <div
            className="flex-1 relative flex flex-col items-center p-6 rounded-sm"
            style={{
              border: '2px solid #00ff80',
              boxShadow: isWinner
                ? '0 0 40px rgba(0,255,128,0.6), 0 0 80px rgba(0,255,128,0.3), inset 0 0 30px rgba(0,255,128,0.08)'
                : '0 0 20px rgba(0,255,128,0.25), inset 0 0 15px rgba(0,255,128,0.04)',
              background: 'rgba(0,255,128,0.04)',
              transition: 'all 0.3s',
            }}
          >
            {/* Rank badge */}
            <div
              className="text-6xl sm:text-7xl font-black mb-1 leading-none"
              style={{ color: '#00ff80', textShadow: '0 0 30px #00ff80, 0 0 60px #00ff80' }}
            >
              #1
            </div>

            <div
              className="text-xs tracking-[0.4em] uppercase font-bold mb-4"
              style={{ color: '#00ff80', opacity: 0.8 }}
            >
              CHAMPION
            </div>

            {/* Divider */}
            <div className="w-full h-px mb-4" style={{ background: 'rgba(0,255,128,0.3)' }} />

            {/* Player name */}
            <div
              className="text-2xl sm:text-3xl font-black uppercase text-center mb-2 break-all"
              style={{
                color: '#fff',
                textShadow: '0 0 20px rgba(0,255,128,0.8)',
                maxWidth: '100%',
              }}
            >
              {winnerName || '???'}
            </div>

            {isWinner && (
              <div
                className="text-xs tracking-widest uppercase font-bold mb-3 animate-pulse"
                style={{ color: '#00ff80' }}
              >
                ← YOU
              </div>
            )}

            {/* Score */}
            <div className="flex flex-col items-center mt-2">
              <div className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(0,255,128,0.6)' }}>
                FINAL SCORE
              </div>
              <div
                className="text-4xl font-black tabular-nums"
                style={{ color: '#00ff80', textShadow: '0 0 20px #00ff80' }}
              >
                {winnerScore.toLocaleString()}
              </div>
            </div>

            {/* YOU badge in corner */}
            {isWinner && (
              <div
                className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-sm"
                style={{ background: '#00ff80', color: '#000', letterSpacing: '0.1em' }}
              >
                YOU
              </div>
            )}
          </div>

          {/* RUNNER-UP Card */}
          <div
            className="flex-1 relative flex flex-col items-center p-6 rounded-sm"
            style={{
              border: '2px solid #ff003c',
              boxShadow: !isWinner
                ? '0 0 40px rgba(255,0,60,0.6), 0 0 80px rgba(255,0,60,0.3), inset 0 0 30px rgba(255,0,60,0.08)'
                : '0 0 20px rgba(255,0,60,0.25), inset 0 0 15px rgba(255,0,60,0.04)',
              background: 'rgba(255,0,60,0.04)',
            }}
          >
            {/* Rank badge */}
            <div
              className="text-6xl sm:text-7xl font-black mb-1 leading-none"
              style={{ color: '#ff003c', textShadow: '0 0 30px #ff003c, 0 0 60px #ff003c' }}
            >
              #2
            </div>

            <div
              className="text-xs tracking-[0.4em] uppercase font-bold mb-4"
              style={{ color: '#ff003c', opacity: 0.8 }}
            >
              RUNNER-UP
            </div>

            {/* Divider */}
            <div className="w-full h-px mb-4" style={{ background: 'rgba(255,0,60,0.3)' }} />

            {/* Player name */}
            <div
              className="text-2xl sm:text-3xl font-black uppercase text-center mb-2 break-all"
              style={{
                color: '#fff',
                textShadow: '0 0 20px rgba(255,0,60,0.8)',
                maxWidth: '100%',
              }}
            >
              {loserName || '???'}
            </div>

            {!isWinner && (
              <div
                className="text-xs tracking-widest uppercase font-bold mb-3 animate-pulse"
                style={{ color: '#ff003c' }}
              >
                ← YOU
              </div>
            )}

            {/* Score */}
            <div className="flex flex-col items-center mt-2">
              <div className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(255,0,60,0.6)' }}>
                FINAL SCORE
              </div>
              <div
                className="text-4xl font-black tabular-nums"
                style={{ color: '#ff003c', textShadow: '0 0 20px #ff003c' }}
              >
                {loserScore.toLocaleString()}
              </div>
            </div>

            {/* YOU badge in corner */}
            {!isWinner && (
              <div
                className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-sm"
                style={{ background: '#ff003c', color: '#fff', letterSpacing: '0.1em' }}
              >
                YOU
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        <div className="text-center">
          {isWinner ? (
            <div
              className="text-3xl sm:text-4xl font-black uppercase tracking-widest animate-pulse"
              style={{ color: '#00ff80', textShadow: '0 0 30px #00ff80' }}
            >
              🏆 VICTORY ACHIEVED
            </div>
          ) : (
            <div
              className="text-3xl sm:text-4xl font-black uppercase tracking-widest animate-pulse"
              style={{ color: '#ff003c', textShadow: '0 0 30px #ff003c' }}
            >
              💀 SYSTEM FAILURE
            </div>
          )}
        </div>

        {/* Manual continue button */}
        <button
          onClick={onContinue}
          className="mt-2 px-8 py-3 font-black uppercase tracking-widest text-sm transition-all"
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.05)',
            fontFamily: 'monospace',
            letterSpacing: '0.3em',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.6)';
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          VIEW LEADERBOARD →
        </button>
      </div>
    </div>
  );
};
