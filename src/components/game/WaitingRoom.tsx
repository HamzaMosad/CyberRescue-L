import React from 'react';

interface WaitingRoomProps {
  roomId: string;
  playerName: string;
  opponentName: string | null;
  countdown: number | null;
  clockOffsetMs?: number | null;
  localReady?: boolean;
  opponentReady?: boolean;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomId,
  playerName,
  opponentName,
  countdown,
  clockOffsetMs = null,
  localReady = false,
  opponentReady = false,
}) => {
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).catch(() => {});
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 z-10 relative">
      <div className="max-w-lg w-full bg-card/90 border border-border p-10 rounded-lg shadow-2xl backdrop-blur text-center">

        {opponentName && clockOffsetMs !== null && (
          <p className="mb-5 inline-flex items-center gap-2 border border-secondary/40 bg-secondary/5 px-3 py-1 font-mono text-xs text-secondary">
            Connected ✓ · clock synced (±{Math.round(Math.abs(clockOffsetMs))} ms)
          </p>
        )}
        {opponentName && countdown === null && (
          <div className="mb-5 space-y-1 text-left font-mono text-sm text-muted-foreground">
            <p>You: {localReady ? "ready ✓" : "loading..."}</p>
            <p>Opponent: {opponentReady ? "ready ✓" : "loading..."}</p>
          </div>
        )}

        {countdown !== null ? (
          <>
            <p className="text-muted-foreground text-sm uppercase tracking-widest mb-4">
              Both players connected!
            </p>
            <div
              className="text-9xl font-bold text-primary text-glow-primary animate-pulse tabular-nums"
              style={{ lineHeight: 1 }}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </div>
            <p className="mt-6 text-secondary text-lg font-bold">
              {playerName} <span className="text-muted-foreground">VS</span> {opponentName}
            </p>
          </>
        ) : opponentName ? (
          <>
            <h2 className="text-2xl font-bold text-secondary text-glow-secondary mb-4">
              OPPONENT CONNECTED!
            </h2>
            <p className="text-lg text-primary mb-2">{playerName} <span className="text-muted-foreground">vs</span> {opponentName}</p>
            <p className="text-muted-foreground animate-pulse">Starting soon…</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-primary text-glow-primary mb-6">
              WAITING FOR OPPONENT
            </h2>
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">Your Room ID</p>
            <div
              onClick={copyRoomId}
              className="text-5xl font-bold text-secondary text-glow-secondary tracking-widest border-2 border-secondary p-5 mb-4 cursor-pointer hover:bg-secondary/10 transition-all select-all"
              title="Click to copy"
            >
              {roomId}
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Share this code with your opponent. Click to copy.
            </p>
            <div className="flex justify-center gap-2 items-center text-muted-foreground">
              <span className="animate-pulse text-xl">●</span>
              <span className="animate-pulse text-xl" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="animate-pulse text-xl" style={{ animationDelay: '0.4s' }}>●</span>
              <span className="ml-2 text-sm">Awaiting Player 2…</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
