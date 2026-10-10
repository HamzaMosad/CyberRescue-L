export type ScreenType =
  | 'lobby'
  | 'waiting'
  | 'playing'
  | 'celebration'
  | 'result'
  | 'leaderboard'
  | 'resetting';

export interface LeaderboardEntry {
  name: string;
  score: number;
  timeRemaining: number;
  date: string;
  result?: 'WIN' | 'LOSS';
}

export interface MatchStanding {
  name: string;
  score: number;
  stageLabel: string;
  badge: "FINISHED FIRST" | "TIME'S UP" | "DISCONNECTED";
  isWinner: boolean;
  stageScores?: { s1: number; s2: number; s3: number };
  elapsedMs?: number | null;
}

export interface GameState {
  screen: ScreenType;
  playerName: string;
  roomId: string;
  timeLeft: number;
  score: number;
  currentStage: number;
  stageProgress: number;
  opponentName: string;
  opponentScore: number;
  opponentStage: number;
  opponentStageProgress: number;
  countdown: number | null;
  isWinner: boolean | null;
  winnerName: string;
  loserName: string;
  leaderboard: LeaderboardEntry[];
}
