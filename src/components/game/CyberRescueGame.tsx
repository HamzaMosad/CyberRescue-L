import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, LeaderboardEntry, MatchStanding } from "@/game/types";
import { translations } from "@/game/translations";
import { playLoseSting, playStageBeep, playWinFanfare, stopAllSounds } from "@/game/sounds";
import { useMultiplayer, type MatchOverPayload } from "@/game/useMultiplayer";
import { MatrixRain } from "./MatrixRain";
import { Stage1PhishHunter, type Stage1PeerMsg } from "./Stage1PhishHunter";
import { Stage2 } from "./Stage2";
import { Stage3 } from "./Stage3";
import { Lobby } from "./Lobby";
import CyberMatrixHero from "@/components/ui/cyber-matrix-hero";
import { WaitingRoom } from "./WaitingRoom";
import { VSBar } from "./VSBar";
import { GameOverModal } from "./GameOverModal";
import { Stage3SidePanels } from "./Stage3SidePanels";
import { Leaderboard } from "./Leaderboard";
import logoAsset from "@/assets/itclub-logo.svg.asset.json";
import { MAX_MATCH_MS } from "@/lib/match-config";
import { getResultsStore } from "@/lib/results/store";
import type { MatchRecord } from "@/lib/results/types";
import { RemoteResultsStore } from "@/lib/results/remoteStore";

const logoPath = logoAsset.url;
const t = translations;
const TOTAL_TIME = 0;
const ROBOT_VICTORY_MS = 3000;
const FORCE_ACK_GAP_MS = 300;
const FORCE_SEND_MAX = 4;
const STAGE_STEP_TOTALS = [0, 10, 5, 3];
const ROBOT_IMG = "/robot-new.webp";

function formatStageReached(stage: number, progress: number) {
  const total = STAGE_STEP_TOTALS[stage] ?? 1;
  const done = Math.max(0, Math.min(total, Math.round((progress / 100) * total)));
  return `Stage ${stage} - ${done}/${total}`;
}

function buildStandings(opts: {
  localName: string;
  localScore: number;
  localStage: number;
  localProgress: number;
  opponentName: string;
  opponentScore: number;
  opponentStage: number;
  opponentProgress: number;
  winnerId: string;
  localStageScores?: { s1: number; s2: number; s3: number };
  opponentStageScores?: { s1: number; s2: number; s3: number };
  elapsedMs?: number | null;
  opponentDisconnected?: boolean;
  timeUp?: boolean;
}): MatchStanding[] {
  const localName = opts.localName || "Player";
  const opp = opts.opponentName || "Opponent";
  const localWon = opts.winnerId === localName;
  const rows: MatchStanding[] = [
    {
      name: localName,
      score: opts.localScore,
      stageLabel: formatStageReached(opts.localStage, opts.localProgress),
      isWinner: localWon,
      badge: opts.timeUp ? "TIME'S UP" : localWon ? "FINISHED FIRST" : opts.opponentDisconnected ? "DISCONNECTED" : "TIME'S UP",
      ...(opts.localStageScores ? { stageScores: opts.localStageScores } : {}),
      elapsedMs: localWon ? opts.elapsedMs ?? null : null,
    },
    {
      name: opp,
      score: opts.opponentScore,
      stageLabel: formatStageReached(opts.opponentStage, opts.opponentProgress),
      isWinner: !localWon,
      badge: opts.timeUp ? "TIME'S UP" : localWon ? opts.opponentDisconnected ? "DISCONNECTED" : "TIME'S UP" : "FINISHED FIRST",
      ...(opts.opponentStageScores ? { stageScores: opts.opponentStageScores } : {}),
      elapsedMs: !localWon ? opts.elapsedMs ?? null : null,
    },
  ];
  return rows.sort((a, b) => Number(b.isWinner) - Number(a.isWinner));
}

const INITIAL_STATE: GameState = {
  screen: "lobby",
  playerName: "",
  roomId: "",
  timeLeft: TOTAL_TIME,
  score: 0,
  currentStage: 1,
  stageProgress: 0,
  opponentName: "",
  opponentScore: 0,
  opponentStage: 1,
  opponentStageProgress: 0,
  countdown: null,
  isWinner: null,
  winnerName: "",
  loserName: "",
  leaderboard: [],
};

export function CyberRescueGame() {
  const [gs, setGs] = useState<GameState>(INITIAL_STATE);
  const [rematchReady, setRematchReady] = useState(false);
  const [stage1Seed, setStage1Seed] = useState(1);
  const [stage1Msg, setStage1Msg] = useState<Stage1PeerMsg | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [matchOver, setMatchOver] = useState<MatchOverPayload | null>(null);
  const [standings, setStandings] = useState<MatchStanding[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [robotVictory, setRobotVictory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [matchId, setMatchId] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved ✓" | "saving..." | "offline (will retry)" | "">("");
  const [practiceActive, setPracticeActive] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [connectionTrouble, setConnectionTrouble] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameFinishedRef = useRef(false);
  const forceHandledRef = useRef(false);
  const ackReceivedRef = useRef(false);
  const localWinnerRef = useRef(false);
  const localFinishedAtRef = useRef(0);
  const scoreRef = useRef(0);
  const playerNameRef = useRef("");
  const opponentNameRef = useRef("");
  const stageRef = useRef(1);
  const stageProgressRef = useRef(0);
  const opponentScoreRef = useRef(0);
  const opponentStageRef = useRef(1);
  const opponentStageProgressRef = useRef(0);
  const opponentStageScoresRef = useRef({ s1: 0, s2: 0, s3: 0 });
  const robotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mpRef = useRef<ReturnType<typeof useMultiplayer> | null>(null);
  const matchStartAtRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const scheduledStartRef = useRef<{ hostStartAt: number; localStartAt: number } | null>(null);
  const finishCandidatesRef = useRef<Array<{ playerId: string; elapsedMs: number }>>([]);
  const finishResolveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectedRef = useRef(false);
  const savedRef = useRef(false);
  const matchIdRef = useRef("");
  const stageScoresRef = useRef({ s1: 0, s2: 0, s3: 0 });
  useEffect(() => {
    scoreRef.current = gs.score;
    playerNameRef.current = gs.playerName;
    opponentNameRef.current = gs.opponentName;
    stageRef.current = gs.currentStage;
    stageProgressRef.current = gs.stageProgress;
    opponentScoreRef.current = gs.opponentScore;
    opponentStageRef.current = gs.opponentStage;
    opponentStageProgressRef.current = gs.opponentStageProgress;
  }, [gs]);

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("dark");
    void getResultsStore();
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const freezeTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearForceRetries = useCallback(() => {
    forceRetryTimersRef.current.forEach(clearTimeout);
    forceRetryTimersRef.current = [];
  }, []);

  const freezeMatch = useCallback(() => {
    freezeTimer();
    stopAllSounds();
    gameFinishedRef.current = true;
    setGameOver(true);
  }, [freezeTimer]);

  const resetMatchFlags = useCallback(() => {
    gameFinishedRef.current = false;
    forceHandledRef.current = false;
    ackReceivedRef.current = false;
    localWinnerRef.current = false;
    localFinishedAtRef.current = 0;
    finishCandidatesRef.current = [];
    if (finishResolveRef.current) clearTimeout(finishResolveRef.current);
    finishResolveRef.current = null;
    disconnectedRef.current = false;
    savedRef.current = false;
    clearForceRetries();
    if (robotTimerRef.current) clearTimeout(robotTimerRef.current);
    robotTimerRef.current = null;
    if (disconnectFallbackRef.current) clearTimeout(disconnectFallbackRef.current);
    disconnectFallbackRef.current = null;
    setGameOver(false);
    setRobotVictory(false);
    setStandings([]);
  }, [clearForceRetries]);

  const openScoreboard = useCallback(
    (payload: MatchOverPayload, nextStandings: MatchStanding[]) => {
      if (robotTimerRef.current) {
        clearTimeout(robotTimerRef.current);
        robotTimerRef.current = null;
      }
      setRobotVictory(false);
      setStandings(nextStandings);
      setMatchOver(payload);
      setGs((prev) => ({
        ...prev,
        screen: "leaderboard",
        isWinner: payload.isWinner,
        winnerName: payload.winnerName,
        loserName: payload.loserName,
        leaderboard: payload.leaderboard,
      }));
    },
    [],
  );

  const showRobotThenScoreboard = useCallback(
    (payload: MatchOverPayload, nextStandings: MatchStanding[]) => {
      setRobotVictory(true);
      if (robotTimerRef.current) clearTimeout(robotTimerRef.current);
      robotTimerRef.current = setTimeout(() => {
        robotTimerRef.current = null;
        openScoreboard(payload, nextStandings);
      }, ROBOT_VICTORY_MS);
    },
    [openScoreboard],
  );

  const localStandings = useCallback(
    (winnerId: string, opponentScore: number, opponentStage: number, opponentProgress: number, timeUp = false) =>
      buildStandings({
        localName: playerNameRef.current,
        localScore: scoreRef.current,
        localStage: stageRef.current,
        localProgress: stageProgressRef.current,
        opponentName: opponentNameRef.current,
        opponentScore,
        opponentStage,
        opponentProgress,
        winnerId,
        localStageScores: { ...stageScoresRef.current },
        opponentStageScores: { ...opponentStageScoresRef.current },
        elapsedMs: Math.max(0, Date.now() - matchStartAtRef.current),
        opponentDisconnected: disconnectedRef.current,
        timeUp,
      }),
    [],
  );

  const sendForceGameOverBurst = useCallback((payload: Record<string, unknown>) => {
    ackReceivedRef.current = false;
    clearForceRetries();
    const fire = (attempt: number) => {
      if (ackReceivedRef.current) return;
      mpRef.current?.sendRaw(payload);
      if (attempt >= FORCE_SEND_MAX) return;
      const id = setTimeout(() => fire(attempt + 1), FORCE_ACK_GAP_MS);
      forceRetryTimersRef.current.push(id);
    };
    fire(1);
  }, [clearForceRetries]);

  // ── Realtime multiplayer wiring ──────────────────────────────────────────
  const mp = useMultiplayer({
    onPracticeStart: (seed) => { setStage1Seed(seed); setPracticeActive(true); setGs((prev) => ({ ...prev, screen: "waiting", countdown: null })); },
    onClockSynced: (offset) => { clockOffsetRef.current = offset; setClockOffsetMs(offset); },
    onConnectionProblem: () => {
      console.debug(`[NET ${new Date().toISOString()}] connection problem UI shown`, new Error().stack);
      disconnectedRef.current = true;
      setConnectionTrouble(true);
    },
    onConnectionStatus: (isReconnecting) => setReconnecting(isReconnecting),
    onStageMessage: (msg) => setStage1Msg({ ...(msg as unknown as Stage1PeerMsg) }),
    onGameStart: (seed, startAt, incomingMatchId, clockOffset) => {
      setPracticeActive(false);
      setConnectionError("");
      setStage1Seed(seed);
      matchStartAtRef.current = startAt;
      clockOffsetRef.current = clockOffset;
      setClockOffsetMs(clockOffset);
      scheduledStartRef.current = { hostStartAt: startAt, localStartAt: startAt - clockOffset };
      const activeMatchId = incomingMatchId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setMatchId(activeMatchId);
      matchIdRef.current = activeMatchId;
      stageScoresRef.current = { s1: 0, s2: 0, s3: 0 };
      scoreRef.current = 0;
      setStage1Msg(null);
      resetMatchFlags();
      setMatchOver(null);
      setRematchReady(false);
      setGs((prev) => ({
        ...prev,
        screen: "waiting",
        countdown: 3,
        timeLeft: TOTAL_TIME,
        score: 0,
        currentStage: 1,
        stageProgress: 0,
        opponentScore: 0,
        opponentStage: 1,
        opponentStageProgress: 0,
      }));
    },
    onOpponentJoined: (opponentName) =>
      setGs((prev) => ({ ...prev, opponentName })),
    onOpponentProgress: ({ score, stage, stageProgress, stageScores }) => {
      opponentStageScoresRef.current = stageScores;
      setGs((prev) => ({
        ...prev,
        opponentScore: score,
        opponentStage: stage,
        opponentStageProgress: stageProgress,
      }));
    },
    onShowScoreboard: () => {
      gameFinishedRef.current = true;
      freezeMatch();
      setFinalScore(scoreRef.current);
      setGs((prev) => ({
        ...prev,
        screen: "leaderboard",
        isWinner: false,
        winnerName: prev.opponentName || "Opponent",
        loserName: prev.playerName,
      }));
    },
    onMatchOver: (payload) => {
      if (forceHandledRef.current) return;
      freezeMatch();
      if (payload.isWinner) playWinFanfare();
      else playLoseSting();
      setFinalScore(scoreRef.current);
      const winnerId = payload.isWinner ? playerNameRef.current : opponentNameRef.current;
      openScoreboard(
        payload,
        localStandings(winnerId, opponentScoreRef.current, opponentStageRef.current, opponentStageProgressRef.current),
      );
    },
    onOpponentDisconnected: () => {
      if (forceHandledRef.current) return;
      disconnectedRef.current = true;
      setGs((prev) => ({ ...prev, opponentName: `${prev.opponentName || "Opponent"} · DISCONNECTED` }));
    },
    onRematchStarting: () => {
      setRematchReady(false);
      setFinalScore(0);
      setMatchOver(null);
      resetMatchFlags();
      setGs((prev) => ({
        ...INITIAL_STATE,
        screen: "waiting",
        playerName: prev.playerName,
        opponentName: prev.opponentName,
        roomId: prev.roomId,
      }));
    },
  });
  mpRef.current = mp;

  useEffect(() => {
    const scheduled = scheduledStartRef.current;
    if (!scheduled || gs.screen !== "waiting") return;
    let frame = 0;
    const tick = () => {
      const remaining = scheduled.localStartAt - Date.now();
      if (remaining <= 0) {
        scheduledStartRef.current = null;
        setGs((prev) => ({ ...prev, screen: "playing", countdown: null, timeLeft: Math.max(0, Math.floor((Date.now() + clockOffsetRef.current - scheduled.hostStartAt) / 1000)) }));
        return;
      }
      const count = Math.min(3, Math.max(0, Math.ceil(remaining / 1000) - 1));
      setGs((prev) => prev.countdown === count ? prev : { ...prev, countdown: count });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [gs.screen, gs.countdown]);

  const persistMatch = useCallback((winnerName: string, endReason: MatchRecord["endReason"]) => {
    if (savedRef.current || (!mp.isHost() && !disconnectedRef.current)) return;
    savedRef.current = true;
    setSaveStatus("saving...");
    const finishedAt = Date.now();
    const hostName = playerNameRef.current || "Player";
    const guestName = opponentNameRef.current.replace(" · DISCONNECTED", "") || "Opponent";
    const won = winnerName === hostName;
    const record: MatchRecord = {
      matchId: matchIdRef.current || `${finishedAt}-${Math.random().toString(36).slice(2)}`,
      roomCode: gs.roomId,
      startedAt: matchStartAtRef.current,
      finishedAt,
      durationMs: Math.max(0, finishedAt - matchStartAtRef.current),
      winnerName,
      endReason,
      players: [
        { name: hostName, stageReached: stageRef.current, stageScores: { ...stageScoresRef.current }, totalScore: scoreRef.current, elapsedMs: won ? finishedAt - matchStartAtRef.current : null, status: won ? "WINNER" : endReason === "DISCONNECTED" ? "DISCONNECTED" : "TIME_UP" },
        { name: guestName, stageReached: opponentStageRef.current, stageScores: { ...opponentStageScoresRef.current }, totalScore: opponentScoreRef.current, elapsedMs: !won && endReason === "FINISHED" ? finishedAt - matchStartAtRef.current : null, status: !won && endReason === "FINISHED" ? "WINNER" : disconnectedRef.current ? "DISCONNECTED" : "TIME_UP" },
      ],
    };
    const store = getResultsStore();
    void store.saveMatch(record).then(() => {
      if (store instanceof RemoteResultsStore && !store.online) {
        setSaveStatus("offline (will retry)");
        if (saveStatusTimerRef.current) clearInterval(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setInterval(() => {
          if (store.online) {
            setSaveStatus("saved ✓");
            if (saveStatusTimerRef.current) clearInterval(saveStatusTimerRef.current);
            saveStatusTimerRef.current = null;
          }
        }, 30_000);
      } else setSaveStatus("saved ✓");
    }).catch(() => setSaveStatus("offline (will retry)"));
  }, [gs.roomId, mp]);

  // ── Match clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (gs.screen !== "playing" || gameOver) {
      freezeTimer();
      return;
    }
    timerRef.current = setInterval(() => {
      setGs((prev) => {
        if (prev.screen !== "playing") return prev;
        const elapsed = Math.floor((Date.now() + clockOffsetRef.current - (matchStartAtRef.current || Date.now() + clockOffsetRef.current)) / 1000);
        return { ...prev, timeLeft: elapsed };
      });
    }, 1000);
    return freezeTimer;
  }, [gs.screen, gameOver, freezeTimer]);

  const finishGame = useCallback(
    (isCompleted = false) => {
      if (forceHandledRef.current) return;
      if (!isCompleted) return;
      playStageBeep();
      const total = scoreRef.current;
      scoreRef.current = total;
      setFinalScore(total);
      setGs((prev) => ({ ...prev, score: total }));

      const role = mp.isHost() ? "host" : "guest";
      const candidate = { playerId: mp.isHost() || disconnectedRef.current ? "host" : "guest", elapsedMs: Math.max(0, Date.now() - matchStartAtRef.current) };
      if (mp.isHost() || disconnectedRef.current) {
        finishCandidatesRef.current.push(candidate);
        if (!finishResolveRef.current) finishResolveRef.current = setTimeout(() => {
          finishResolveRef.current = null;
          const winner = [...finishCandidatesRef.current].sort((a, b) => a.elapsedMs - b.elapsedMs)[0] ?? candidate;
          const winnerId = winner.playerId === "host" ? playerNameRef.current || "Player" : opponentNameRef.current || "Opponent";
          const oppId = winner.playerId === "host" ? opponentNameRef.current || "Opponent" : playerNameRef.current || "Player";
          const payload = { type: "FORCE_GAME_OVER", winnerId, finishedAt: matchStartAtRef.current + winner.elapsedMs, elapsedMs: winner.elapsedMs,
            scores: { [playerNameRef.current || "Player"]: scoreRef.current, [opponentNameRef.current || "Opponent"]: opponentScoreRef.current },
            stage: { [playerNameRef.current || "Player"]: 3, [opponentNameRef.current || "Opponent"]: opponentStageRef.current },
            stageProgress: { [playerNameRef.current || "Player"]: 100, [opponentNameRef.current || "Opponent"]: opponentStageProgressRef.current },
            endReason: disconnectedRef.current ? "DISCONNECTED" : "FINISHED",
            players: [
              { name: playerNameRef.current || "Player", stageReached: 3, stageScores: { ...stageScoresRef.current }, totalScore: scoreRef.current, status: winnerId === (playerNameRef.current || "Player") ? "WINNER" : disconnectedRef.current ? "DISCONNECTED" : "TIME_UP", elapsedMs: winnerId === (playerNameRef.current || "Player") ? winner.elapsedMs : null },
              { name: opponentNameRef.current || "Opponent", stageReached: opponentStageRef.current, stageScores: { ...opponentStageScoresRef.current }, totalScore: opponentScoreRef.current, status: winnerId === (opponentNameRef.current || "Opponent") ? "WINNER" : disconnectedRef.current ? "DISCONNECTED" : "TIME_UP", elapsedMs: winnerId === (opponentNameRef.current || "Opponent") ? winner.elapsedMs : null },
            ] };
          forceHandledRef.current = true;
          localWinnerRef.current = winnerId === (playerNameRef.current || "Player");
          persistMatch(winnerId, disconnectedRef.current ? "DISCONNECTED" : "FINISHED");
          sendForceGameOverBurst(payload);
          const result: MatchOverPayload = { isWinner: localWinnerRef.current, winnerName: winnerId, loserName: oppId, leaderboard: [] };
          freezeMatch();
          showRobotThenScoreboard(result, localStandings(winnerId, opponentScoreRef.current, opponentStageRef.current, opponentStageProgressRef.current));
        }, 300);
      } else {
        if (disconnectedRef.current) {
          const winnerId = playerNameRef.current || "Player";
          persistMatch(winnerId, "DISCONNECTED");
          const result: MatchOverPayload = { isWinner: true, winnerName: winnerId, loserName: opponentNameRef.current || "Opponent", leaderboard: [] };
          freezeMatch();
          showRobotThenScoreboard(result, localStandings(winnerId, opponentScoreRef.current, opponentStageRef.current, opponentStageProgressRef.current));
          return;
        }
        mp.sendRaw({ type: "PLAYER_FINISHED", playerId: role, elapsedMs: candidate.elapsedMs });
      }
    },
    [freezeMatch, localStandings, mp, persistMatch, sendForceGameOverBurst, showRobotThenScoreboard],
  );

  useEffect(() => {
    const onPeerData = (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const msg = raw as {
        type?: string;
        endReason?: string;
        playerId?: string;
        elapsedMs?: number;
        winnerId?: string;
        finishedAt?: number;
        scores?: Record<string, number>;
        stage?: Record<string, number>;
        stageProgress?: Record<string, number>;
      };
      if (msg.type === "FORCE_GAME_OVER_ACK") {
        ackReceivedRef.current = true;
        clearForceRetries();
        return;
      }
      if (msg.type === "PLAYER_FINISHED" && mp.isHost() && !forceHandledRef.current) {
        finishCandidatesRef.current.push({ playerId: "guest", elapsedMs: Math.max(0, Number(msg.elapsedMs) || Date.now() - matchStartAtRef.current) });
        if (!finishResolveRef.current) finishResolveRef.current = setTimeout(() => {
          finishResolveRef.current = null;
          const winner = [...finishCandidatesRef.current].sort((a, b) => a.elapsedMs - b.elapsedMs)[0];
          if (!winner || forceHandledRef.current) return;
          const hostName = playerNameRef.current || "Player";
          const guestName = opponentNameRef.current || "Opponent";
          const winnerId = winner.playerId === "host" ? hostName : guestName;
          const payload = { type: "FORCE_GAME_OVER", winnerId, finishedAt: matchStartAtRef.current + winner.elapsedMs,
            scores: { [hostName]: scoreRef.current, [guestName]: opponentScoreRef.current },
            stage: { [hostName]: stageRef.current, [guestName]: opponentStageRef.current },
            stageProgress: { [hostName]: stageProgressRef.current, [guestName]: opponentStageProgressRef.current },
            endReason: "FINISHED",
            players: [
              { name: hostName, stageReached: stageRef.current, stageScores: { ...stageScoresRef.current }, totalScore: scoreRef.current, status: winnerId === hostName ? "WINNER" : "TIME_UP", elapsedMs: winnerId === hostName ? winner.elapsedMs : null },
              { name: guestName, stageReached: opponentStageRef.current, stageScores: { ...opponentStageScoresRef.current }, totalScore: opponentScoreRef.current, status: winnerId === guestName ? "WINNER" : "TIME_UP", elapsedMs: winnerId === guestName ? winner.elapsedMs : null },
            ] };
          forceHandledRef.current = true;
          localWinnerRef.current = winnerId === hostName;
          persistMatch(winnerId, "FINISHED");
          sendForceGameOverBurst(payload);
          const result: MatchOverPayload = { isWinner: localWinnerRef.current, winnerName: winnerId, loserName: winnerId === hostName ? guestName : hostName, leaderboard: [] };
          freezeMatch();
          showRobotThenScoreboard(result, localStandings(winnerId, opponentScoreRef.current, opponentStageRef.current, opponentStageProgressRef.current));
        }, 300);
        return;
      }
      if (msg.type !== "FORCE_GAME_OVER") return;

      mp.sendRaw({ type: "FORCE_GAME_OVER_ACK" });

      const myId = playerNameRef.current || "Player";
      const incomingWinner = String(msg.winnerId ?? "");
      const incomingAt = Number(msg.finishedAt ?? Date.now());
      if (forceHandledRef.current && localWinnerRef.current) {
        if (incomingWinner !== myId && localFinishedAtRef.current && localFinishedAtRef.current <= incomingAt) {
          return;
        }
        if (incomingWinner === myId) return;
      }
      if (forceHandledRef.current && !localWinnerRef.current) return;

      forceHandledRef.current = true;
      localWinnerRef.current = incomingWinner === myId;
      freezeMatch();

      const oppId = opponentNameRef.current || "Opponent";
      const localScore = scoreRef.current;
      setFinalScore(localScore);

      const winnerId = incomingWinner || oppId;
      const opponentScore =
        winnerId === myId
          ? Number(msg.scores?.[oppId] ?? opponentScoreRef.current)
          : Number(msg.scores?.[winnerId] ?? opponentScoreRef.current);
      const opponentStage =
        winnerId === myId
          ? Number(msg.stage?.[oppId] ?? opponentStageRef.current)
          : Number(msg.stage?.[winnerId] ?? opponentStageRef.current);
      const opponentProgress =
        winnerId === myId
          ? Number(msg.stageProgress?.[oppId] ?? opponentStageProgressRef.current)
          : Number(msg.stageProgress?.[winnerId] ?? opponentStageProgressRef.current);

      const payload: MatchOverPayload = {
        isWinner: winnerId === myId,
        winnerName: winnerId === myId ? myId : oppId,
        loserName: winnerId === myId ? oppId : myId,
        leaderboard: [],
      };
      showRobotThenScoreboard(
        payload,
        localStandings(
          payload.winnerName,
          opponentScore,
          opponentStage,
          winnerId === myId ? opponentProgress : 100,
          msg.endReason === "TIME_UP",
        ),
      );
    };
    return mp.subscribeData(onPeerData);
  }, [clearForceRetries, freezeMatch, localStandings, mp, persistMatch, sendForceGameOverBurst, showRobotThenScoreboard]);

  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (!gameFinishedRef.current && !forceHandledRef.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", block, true);
    window.addEventListener("keyup", block, true);
    return () => {
      window.removeEventListener("keydown", block, true);
      window.removeEventListener("keyup", block, true);
    };
  }, []);

  useEffect(() => {
    if (!gs.screen || gs.screen !== "playing" || !mp.isHost() || !matchStartAtRef.current) return;
    const id = window.setInterval(() => {
      if (Date.now() - matchStartAtRef.current < MAX_MATCH_MS || forceHandledRef.current) return;
      const localWins = stageRef.current > opponentStageRef.current || (stageRef.current === opponentStageRef.current && (stageProgressRef.current > opponentStageProgressRef.current || (stageProgressRef.current === opponentStageProgressRef.current && scoreRef.current >= opponentScoreRef.current)));
      const winnerId = localWins ? playerNameRef.current || "Player" : opponentNameRef.current || "Opponent";
      const payload = { type: "FORCE_GAME_OVER", winnerId, finishedAt: Date.now(), endReason: "TIME_UP",
        scores: { [playerNameRef.current || "Player"]: scoreRef.current, [opponentNameRef.current || "Opponent"]: opponentScoreRef.current },
        stage: { [playerNameRef.current || "Player"]: stageRef.current, [opponentNameRef.current || "Opponent"]: opponentStageRef.current },
        stageProgress: { [playerNameRef.current || "Player"]: stageProgressRef.current, [opponentNameRef.current || "Opponent"]: opponentStageProgressRef.current },
        players: [
          { name: playerNameRef.current || "Player", stageReached: stageRef.current, stageScores: { ...stageScoresRef.current }, totalScore: scoreRef.current, status: winnerId === (playerNameRef.current || "Player") ? "WINNER" : "TIME_UP", elapsedMs: null },
          { name: opponentNameRef.current || "Opponent", stageReached: opponentStageRef.current, stageScores: { ...opponentStageScoresRef.current }, totalScore: opponentScoreRef.current, status: winnerId === (opponentNameRef.current || "Opponent") ? "WINNER" : disconnectedRef.current ? "DISCONNECTED" : "TIME_UP", elapsedMs: null },
        ] };
      forceHandledRef.current = true;
      persistMatch(winnerId, "TIME_UP");
      sendForceGameOverBurst(payload);
      const result: MatchOverPayload = { isWinner: winnerId === (playerNameRef.current || "Player"), winnerName: winnerId, loserName: winnerId === (playerNameRef.current || "Player") ? opponentNameRef.current : playerNameRef.current, leaderboard: [] };
      freezeMatch();
      showRobotThenScoreboard(result, localStandings(winnerId, opponentScoreRef.current, opponentStageRef.current, opponentStageProgressRef.current, true));
    }, 1000);
    return () => window.clearInterval(id);
  }, [gs.screen, mp, sendForceGameOverBurst, freezeMatch, showRobotThenScoreboard, localStandings, persistMatch]);

  useEffect(() => {
    if (gs.screen === "playing") {
      mp.sendProgress({
        score: gs.score,
        stage: gs.currentStage,
        stageProgress: gs.stageProgress,
        stageScores: { ...stageScoresRef.current },
      });
    }
  }, [gs.score, gs.currentStage, gs.stageProgress, gs.screen, mp]);

  // ── Local-only room mocks (no backend calls) ─────────────────────────────
  const localCreateRoom = useCallback(async (_name: string) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }, []);
  const localJoinRoom = useCallback(async (_code: string, _name: string) => ({ hostName: "CPU Rival" }), []);
  useEffect(() => {
    return () => {
      clearForceRetries();
      if (robotTimerRef.current) clearTimeout(robotTimerRef.current);
      if (disconnectFallbackRef.current) clearTimeout(disconnectFallbackRef.current);
      if (saveStatusTimerRef.current) clearInterval(saveStatusTimerRef.current);
    };
  }, [clearForceRetries]);

  // ── Screen callbacks ─────────────────────────────────────────────────────
  const handleRoomCreated = useCallback((playerName: string, roomId: string) => {
    setConnectionError("");
    setClockOffsetMs(null);
    setGs((prev) => ({ ...prev, playerName, roomId, screen: "waiting", countdown: null }));
  }, []);

  const handleRoomJoined = useCallback(
    (playerName: string, roomId: string, opponentName: string) => {
      setConnectionError("");
      setClockOffsetMs(null);
      setGs((prev) => ({
        ...prev,
        playerName,
        roomId,
        opponentName,
        screen: "waiting",
      }));
    },
    [],
  );

  const addScore = useCallback((amount: number) => {
    if (forceHandledRef.current || gameFinishedRef.current) return;
    const key = `s${Math.max(1, Math.min(3, stageRef.current))}` as "s1" | "s2" | "s3";
    stageScoresRef.current[key] += amount;
    scoreRef.current += amount;
    setGs((prev) => ({ ...prev, score: prev.score + amount }));
  }, []);

  const sendStage1 = useCallback((msg: Stage1PeerMsg) => mp.sendStageMessage(msg as unknown as Record<string, unknown>), [mp]);

  const advanceStage = useCallback((nextStage: 2 | 3) => {
    if (forceHandledRef.current || gameFinishedRef.current) return;
    playStageBeep();
    stageRef.current = nextStage;
    stageProgressRef.current = 0;
    setGs((prev) => ({
      ...prev,
      screen: "playing",
      currentStage: nextStage,
      stageProgress: 0,
    }));
  }, []);

  const handleStageProgress = useCallback((progress: number) => {
    if (forceHandledRef.current || gameFinishedRef.current) return;
    setGs((prev) => ({ ...prev, stageProgress: progress }));
  }, []);

  const handlePlayAgainClick = useCallback(() => {
    setRematchReady(true);
    mp.sendRematchReady();
  }, [mp]);

  const handleReturnToLobby = useCallback(() => {
    console.debug(`[NET ${new Date().toISOString()}] leave game action`, new Error().stack);
    mp.leave();
    setConnectionTrouble(false);
    setMatchOver(null);
    setRematchReady(false);
    setFinalScore(0);
    resetMatchFlags();
    setGs(INITIAL_STATE);
  }, [mp, resetMatchFlags]);

  const isGameStage = gs.screen === "playing";

  return (
    <div className="h-screen max-h-screen w-full relative scanlines bg-background text-foreground font-mono overflow-hidden">
      {!gameOver && <MatrixRain />}

      {gs.screen !== "playing" && <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="fixed top-2.5 right-3 z-[9999] flex items-center justify-center w-9 h-9 rounded border border-primary/40 bg-black/60 text-primary hover:bg-primary/20 hover:border-primary transition-all backdrop-blur-sm"
        style={{ boxShadow: "0 0 10px rgba(6,182,212,0.2)" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isFullscreen ? (
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </>
          ) : (
            <>
              <path d="M3 8V5a2 2 0 0 1 2-2h3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
            </>
          )}
        </svg>
      </button>}

      {gs.screen === "lobby" && showIntro && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <CyberMatrixHero onEnter={() => setShowIntro(false)} />
        </div>
      )}

      {gs.screen === "lobby" && !showIntro && (
        <Lobby
          createRoom={mp.createRoom}
          joinRoom={mp.joinRoom}
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
          onOpenLeaderboard={() => setGs((prev) => ({ ...prev, screen: "leaderboard" }))}
          connectionError={connectionError}
        />
      )}

      {gs.screen === "leaderboard" && !matchOver && <Leaderboard onReturnToLobby={() => setGs((prev) => ({ ...prev, screen: "lobby" }))} />}

      {gs.screen === "waiting" && (
        <WaitingRoom
          roomId={gs.roomId}
          playerName={gs.playerName}
          opponentName={gs.opponentName || null}
          countdown={gs.countdown}
          clockOffsetMs={clockOffsetMs}
        />
      )}

      {gs.screen === "playing" && connectionTrouble && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-6">
          <section className="w-full max-w-md border border-destructive/60 bg-card p-7 text-center shadow-2xl">
            <h2 className="mb-3 text-xl font-bold text-destructive">Connection problem</h2>
            <p className="mb-6 text-sm text-muted-foreground">Your game is still running locally. The opponent connection has been unavailable for 15 seconds.</p>
            <div className="flex justify-center gap-3">
              <button className="border border-primary px-4 py-2 text-primary" onClick={() => { setConnectionTrouble(false); mp.retryConnection(); }}>Retry connection</button>
              <button className="border border-secondary px-4 py-2 text-secondary" onClick={() => { disconnectedRef.current = true; setConnectionTrouble(false); }}>Continue solo</button>
            </div>
          </section>
        </div>
      )}
      {gs.screen === "playing" && !connectionTrouble && reconnecting && (
        <div className="fixed right-4 top-4 z-[10000] border border-secondary/60 bg-card/90 px-3 py-1 font-mono text-xs text-secondary">Reconnecting...</div>
      )}

      {gs.screen === "waiting" && practiceActive && (
        <Stage1PhishHunter
          isHost={mp.isHost()} seed={stage1Seed} playerName={gs.playerName} opponentName={gs.opponentName}
          sendToPeer={sendStage1} peerMessage={stage1Msg} addScore={() => {}} onProgress={() => {}}
          onStageComplete={() => {}} gameOver={false} practiceOnly onPracticeReady={mp.reportPracticeReady}
        />
      )}
      {gs.screen === "waiting" && gs.countdown !== null && (
        <div className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center bg-black/65 font-mono text-8xl font-black tracking-widest text-[#00f0ff]" aria-live="assertive">
          {gs.countdown === 0 ? "GO!" : gs.countdown}
        </div>
      )}

      {isGameStage && gs.currentStage !== 1 && (
        <img
          src={logoPath}
          alt="IT Club"
          style={{
            position: "fixed",
            top: 8,
            left: 12,
            width: 52,
            opacity: 0.55,
            objectFit: "contain",
            filter: "drop-shadow(0 0 5px rgba(36,107,181,0.8))",
            zIndex: 9998,
            pointerEvents: "none",
          }}
        />
      )}

      {isGameStage && gs.currentStage !== 1 && gs.opponentName && (
        <div className="fixed top-0 left-0 right-0 z-40">
          <div className="bg-background/90 border-b border-border backdrop-blur pl-8 pr-20 h-14 flex items-center justify-between">
            <div className="text-xl font-bold text-glow-primary text-primary">
              {t.score}: {gs.score}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest hidden md:block">
              THE CYBERRESCUE CHALLENGE
            </div>
            <div
              className="text-2xl font-bold tabular-nums text-primary text-glow-primary"
            >
              {`${String(Math.floor(gs.timeLeft / 60)).padStart(2, "0")}:${String(gs.timeLeft % 60).padStart(2, "0")}`}
            </div>
          </div>
          <VSBar
            playerName={gs.playerName}
            playerScore={gs.score}
            playerStage={gs.currentStage}
            playerStageProgress={gs.stageProgress}
            opponentName={gs.opponentName}
            opponentScore={gs.opponentScore}
            opponentStage={gs.opponentStage}
            opponentStageProgress={gs.opponentStageProgress}
          />
        </div>
      )}

      {gs.screen === "playing" && gs.currentStage === 3 && !robotVictory && <Stage3SidePanels />}

      {gs.screen === "playing" && !robotVictory && (
        <div className="fixed inset-0 pt-28 z-10 w-full flex items-stretch justify-center">
          {gs.currentStage === 1 && (
            <Stage1PhishHunter
              isHost={mp.isHost()}
              seed={stage1Seed}
              playerName={gs.playerName}
              opponentName={gs.opponentName}
              sendToPeer={sendStage1}
              peerMessage={stage1Msg}
              addScore={addScore}
              onProgress={handleStageProgress}
              onStageComplete={() => advanceStage(2)}
              gameOver={gameOver}
              startAt={matchStartAtRef.current}
              clockOffset={clockOffsetRef.current}
            />
          )}
          {gs.currentStage === 2 && (
            <Stage2
              onComplete={() => advanceStage(3)}
              addScore={addScore}
              onProgress={handleStageProgress}
              t={t}
              gameOver={gameOver}
            />
          )}
          {gs.currentStage === 3 && (
            <Stage3
              onComplete={() => finishGame(true)}
              freezeTimer={freezeTimer}
              addScore={addScore}
              onProgress={handleStageProgress}
              t={t}
              gameOver={gameOver}
            />
          )}
        </div>
      )}

      {robotVictory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95" role="dialog" aria-label="Robot victory">
          <img src={ROBOT_IMG} alt="" className="max-h-[72vh] max-w-[min(90vw,720px)] object-contain" />
        </div>
      )}

      {matchOver && !robotVictory && (
        <GameOverModal
          isWinner={matchOver.isWinner}
          winnerName={matchOver.winnerName}
          loserName={matchOver.loserName}
          finalScore={finalScore}
          initialLeaderboard={matchOver.leaderboard}
          standings={standings}
          onPlayAgain={handlePlayAgainClick}
          rematchReady={rematchReady}
          onReturnToLobby={handleReturnToLobby}
          saveStatus={saveStatus}
        />
      )}
    </div>
  );
}
