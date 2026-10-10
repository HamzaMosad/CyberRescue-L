import React, { useState, useEffect, useRef } from "react";
import { LeaderboardEntry, type MatchStanding } from "@/game/types";
import { fetchLeaderboard, submitEntries } from "@/game/multiplayer";

interface GameOverModalProps {
  isWinner: boolean;
  winnerName: string;
  loserName: string;
  finalScore: number;
  initialLeaderboard: LeaderboardEntry[];
  standings?: MatchStanding[];
  onPlayAgain: () => void;
  rematchReady: boolean;
  onReturnToLobby: () => void;
  saveStatus?: string;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isWinner,
  winnerName,
  loserName,
  finalScore,
  initialLeaderboard,
  standings = [],
  onPlayAgain,
  rematchReady,
  onReturnToLobby,
  saveStatus,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [winnerDisplayName, setWinnerDisplayName] = useState(
    winnerName || "CyberRescue_Agent",
  );
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fallback = (): LeaderboardEntry[] =>
      initialLeaderboard && initialLeaderboard.length > 0
        ? initialLeaderboard
        : [
            {
              name: winnerName || "CyberRescue_Agent",
              score: finalScore,
            } as LeaderboardEntry,
          ];

    fetchLeaderboard()
      .then((data) => {
        if (!isMounted) return;
        setLeaderboard(data.length > 0 ? data : fallback());
        setLbLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLeaderboard(fallback());
        setLbLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialLeaderboard, winnerName, finalScore]);

  const handleSubmitName = async () => {
    if (nameSubmitted || isSubmitting || !winnerDisplayName.trim()) return;
    setIsSubmitting(true);

    try {
      await submitEntries([
        {
          name: winnerDisplayName.trim(),
          score: finalScore,
          timeRemaining: 0,
          result: "WIN",
        },
      ]);
      const updated = await fetchLeaderboard();
      setLeaderboard(updated);
      setNameSubmitted(true);
    } catch {
      setLeaderboard((prev) =>
        [
          ...prev,
          {
            name: winnerDisplayName.trim(),
            score: finalScore,
          } as LeaderboardEntry,
        ].sort((a, b) => b.score - a.score),
      );
      setNameSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      {saveStatus && <div className="fixed right-4 top-4 z-[60] font-mono text-xs text-cyan-300">{saveStatus}</div>}
      {" "}
      <div
        className="w-full max-w-2xl rounded-2xl border flex flex-col relative overflow-hidden bg-[#050b14]"
        style={{
          borderColor: isWinner ? "#00ff80" : "#ff0055",
          boxShadow: isWinner
            ? "0 0 30px rgba(0,255,128,0.15)"
            : "0 0 30px rgba(255,0,85,0.15)",
        }}
      >
        {/* Header Section */}
        <div className="p-6 border-b border-white/5 text-center relative">
          <h1
            className="text-4xl font-black uppercase tracking-wider mb-2"
            style={{
              color: isWinner ? "#00ff80" : "#ff0055",
              textShadow: isWinner
                ? "0 0 10px rgba(0,255,128,0.5)"
                : "0 0 10px rgba(255,0,85,0.5)",
            }}
          >
            {isWinner ? "MISSION ACCOMPLISHED" : "SYSTEM COMPROMISED"}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
            CyberRescue Operational Report
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          {/* Match Verdict */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex justify-between items-center text-sm">
            <div>
              <span className="text-muted-foreground">Winner:</span>{" "}
              <span className="text-emerald-400 font-bold">
                {winnerName || winnerDisplayName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Loser:</span>{" "}
              <span className="text-rose-400 font-bold">
                {loserName || "Opponent"}
              </span>
            </div>
          </div>

          {standings.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Final Scoreboard
              </div>
              {standings.map((row, rank) => (
                <div
                  key={row.name}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="w-8 text-lg font-black text-cyan-400">#{rank + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{row.name}</div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{row.stageLabel}</div>
                    {row.stageScores && <div className="mt-1 font-mono text-[10px] text-cyan-300/80">S1 {row.stageScores.s1} · S2 {row.stageScores.s2} · S3 {row.stageScores.s3}</div>}
                    {row.elapsedMs != null && <div className="font-mono text-[10px] text-emerald-300">TOTAL TIME {Math.floor(row.elapsedMs / 60000)}:{String(Math.floor(row.elapsedMs / 1000) % 60).padStart(2, "0")}</div>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-widest ${
                      row.badge === "FINISHED FIRST"
                        ? "border border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                        : "border border-amber-400/60 bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    {row.badge}
                  </span>
                  <span className="w-20 text-right font-mono text-xl font-black text-cyan-400">{row.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Score Display */}
          <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Final Score
            </div>
            <div className="text-5xl font-black text-cyan-400 font-mono tracking-tight">
              {finalScore}
            </div>
          </div>

          {/* CyberRescue Name Submission */}
          {isWinner && !nameSubmitted && (
            <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex flex-col gap-3">
              <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
                ⚡ Register to CyberRescue Leaderboard
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={winnerDisplayName}
                  onChange={(e) => setWinnerDisplayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitName();
                  }}
                  maxLength={24}
                  disabled={nameSubmitted || isSubmitting}
                  placeholder="CyberRescue Agent Name..."
                  className="flex-1 px-3 py-2 text-sm font-mono rounded border bg-black/60 text-yellow-200 border-yellow-500/30 placeholder-yellow-900/60 outline-none"
                />
                <button
                  onClick={handleSubmitName}
                  disabled={
                    nameSubmitted || isSubmitting || !winnerDisplayName.trim()
                  }
                  className="px-5 py-2 text-sm font-bold uppercase rounded bg-yellow-500 text-black hover:bg-yellow-400 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard Rendering */}
          <div className="flex flex-col flex-1 min-h-[180px]">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              🏆 Top CyberRescue Operations
            </div>
            <div className="flex-1 border border-white/5 bg-black/20 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto font-mono text-sm">
              {lbLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">
                  📡 Fetching global records...
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2 w-16 text-center">Rank</th>
                      <th className="px-4 py-2">Agent</th>
                      <th className="px-4 py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-white/[0.02] hover:bg-white/[0.01]"
                        style={{
                          color:
                            entry.name === winnerDisplayName
                              ? "#00ff80"
                              : "inherit",
                        }}
                      >
                        <td className="px-4 py-2 text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 font-bold">{entry.name}</td>
                        <td className="px-4 py-2 text-right text-cyan-400 font-bold">
                          {entry.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Controls */}
        <div className="w-full px-6 pb-7 pt-2 flex flex-col gap-3">
          <button
            onClick={() => {
              // ⚡ مسح القفل من الذاكرة قبل الانتقال لجولة جديدة
              localStorage.removeItem("show_leaderboard_lock");
              onPlayAgain();
            }}
            disabled={rematchReady}
            className="w-full py-4 text-xl font-black uppercase tracking-widest rounded-xl font-mono transition-all relative overflow-hidden"
            style={{
              background: rematchReady
                ? "rgba(0,255,128,0.08)"
                : "linear-gradient(135deg, rgba(0,255,128,0.15) 0%, rgba(6,182,212,0.1) 100%)",
              border: "2px solid rgba(0,255,128,0.65)",
              color: "#00ff80",
              boxShadow: "0 0 20px rgba(0,255,128,0.3)",
              opacity: rematchReady ? 0.75 : 1,
              cursor: rematchReady ? "default" : "pointer",
            }}
          >
            {rematchReady ? (
              <span className="animate-pulse">⏳ Waiting for opponent...</span>
            ) : (
              <span>جولة جديدة &nbsp;▶&nbsp; Play Again</span>
            )}
          </button>

          <button
            onClick={() => {
              // ⚡ مسح القفل من الذاكرة قبل العودة للوبي
              localStorage.removeItem("show_leaderboard_lock");
              onReturnToLobby();
            }}
            className="w-full py-2 text-sm font-bold uppercase tracking-widest rounded-xl font-mono transition-all"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
            }}
          >
            ← Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
