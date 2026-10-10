export type MatchRecord = {
  matchId: string;
  roomCode: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  winnerName: string;
  endReason: "FINISHED" | "TIME_UP" | "DISCONNECTED";
  players: Array<{
    name: string;
    stageReached: number;
    stageScores: { s1: number; s2: number; s3: number };
    totalScore: number;
    elapsedMs: number | null;
    status: "WINNER" | "TIME_UP" | "DISCONNECTED";
  }>;
};
