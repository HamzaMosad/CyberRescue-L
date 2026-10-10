import { useCallback, useEffect, useRef } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { LeaderboardEntry } from "./types";
import { getShieldWords } from "@/lib/shield-builder";

type Role = "host" | "guest";

const PEER_PREFIX = "cyberrescue-room-";
const DEBUG_NET = import.meta.env.DEV;
const netLog = (event: string, detail?: unknown) => {
  if (DEBUG_NET) console.debug(`[NET ${new Date().toISOString()}] ${event}`, detail ?? "", new Error().stack?.split("\n")[2]?.trim());
};
const EVENT_MAP: Record<string, string> = {
  progress: "UPDATE_SCORE",
  show_scoreboard: "SHOW_SCOREBOARD",
  force_game_over: "FORCE_GAME_OVER",
};
const REVERSE_MAP: Record<string, string> = {
  UPDATE_SCORE: "progress",
  SHOW_SCOREBOARD: "show_scoreboard",
  FORCE_GAME_OVER: "force_game_over",
};

interface Msg {
  type: string;
  name?: string;
  count?: number;
  seed?: number;
  score?: number;
  stage?: number;
  stageProgress?: number;
  stageScores?: { s1: number; s2: number; s3: number };
  timeLeft?: number;
  isCompleted?: boolean;
  winnerRole?: string;
  winnerName?: string;
  loserName?: string;
  leaderboard?: LeaderboardEntry[];
  winnerId?: string;
  finalScores?: { host: number; guest: number };
  destroyed?: number;
  accuracy?: number;
  shield?: number;
  combo?: number;
  timeMs?: number;
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export interface MatchOverPayload {
  isWinner: boolean;
  winnerName: string;
  loserName: string;
  leaderboard: LeaderboardEntry[];
}

export interface MultiplayerHandlers {
  onPracticeStart: (seed: number) => void;
  onGameStart: (seed: number, startAt: number, matchId: string, clockOffset: number) => void;
  onClockSynced: (offset: number) => void;
  onConnectionProblem: () => void;
  onConnectionStatus?: (reconnecting: boolean) => void;
  onStageMessage?: (msg: Record<string, unknown>) => void;
  onOpponentJoined: (name: string) => void;
  onOpponentProgress: (progress: {
    score: number;
    stage: number;
    stageProgress: number;
    stageScores: { s1: number; s2: number; s3: number };
  }) => void;
  onMatchOver: (payload: MatchOverPayload) => void;
  onShowScoreboard: () => void;
  onForceGameOver?: (payload: {
    winnerId: string;
    finalScores: { host: number; guest: number };
  }) => void;
  onOpponentDisconnected: () => void;
  onRematchStarting: () => void;
}

/**
 * Replaces the original socket.io layer. Rooms live in the database so a code
 * can be shared and validated; everything in-match travels over a Realtime
 * broadcast channel, with the room host acting as the authority that generates
 * packet sequences and resolves the winner.
 */
export function useMultiplayer(handlers: MultiplayerHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const roleRef = useRef<Role>("host");
  const codeRef = useRef("");
  const myNameRef = useRef("");
  const matchIdRef = useRef("");
  const matchStartedRef = useRef(false);
  const opponentNameRef = useRef("");
  const matchLiveRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const readyRef = useRef({ host: false, guest: false });
  const practiceReadyRef = useRef({ host: false, guest: false });
  const practiceStartedRef = useRef(false);
  const seedRef = useRef(1);
  const hostStartAtRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const startedMatchesRef = useRef(new Set<string>());
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const syncSamplesRef = useRef<Array<{ rtt: number; offset: number }>>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageRef = useRef(Date.now());
  const problemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemShownRef = useRef(false);
  const redialCountRef = useRef(0);
  const nextMsgIdRef = useRef(1);
  const pendingCriticalRef = useRef(new Map<number, { packet: Record<string, unknown>; tries: number; timer: ReturnType<typeof setTimeout> | null }>());
  const receivedCriticalRef = useRef(new Set<number>());

  const rematchRef = useRef<{ host: boolean; guest: boolean }>({
    host: false,
    guest: false,
  });
  const clearTimers = useCallback(() => {
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    readyTimerRef.current = null;
    syncTimerRefs.current.forEach(clearTimeout);
    syncTimerRefs.current = [];
  }, []);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    const conn = connRef.current;
    if (conn?.open) conn.send({ type: EVENT_MAP[event] ?? event, ...payload });
  }, []);

  const sendRaw = useCallback((msg: Record<string, unknown>) => {
    const conn = connRef.current;
    const critical = ["GAME_START", "PLAYER_FINISHED", "FORCE_GAME_OVER", "READY"].includes(String(msg["type"]));
    const msgId = typeof msg["msgId"] === "number" ? msg["msgId"] : critical ? nextMsgIdRef.current++ : undefined;
    const packet = msgId === undefined ? msg : { ...msg, msgId };
    if (critical && msgId !== undefined && !pendingCriticalRef.current.has(msgId)) {
      const entry = { packet, tries: 0, timer: null as ReturnType<typeof setTimeout> | null };
      const retry = () => {
        if (!pendingCriticalRef.current.has(msgId)) return;
        if (entry.tries >= 8) { pendingCriticalRef.current.delete(msgId); return; }
        entry.tries++;
        if (connRef.current?.open) connRef.current.send(packet);
        entry.timer = setTimeout(retry, 400);
      };
      pendingCriticalRef.current.set(msgId, entry);
      entry.timer = setTimeout(retry, 400);
    }
    if (conn?.open) conn.send(packet);
  }, []);

  const dataListenersRef = useRef(new Set<(raw: unknown) => void>());
  const subscribeData = useCallback((fn: (raw: unknown) => void) => {
    dataListenersRef.current.add(fn);
    return () => {
      dataListenersRef.current.delete(fn);
    };
  }, []);

  const startGame = useCallback(() => {
    if (roleRef.current !== "host" || !practiceReadyRef.current.host || !practiceReadyRef.current.guest || hostStartAtRef.current) return;
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    readyTimerRef.current = null;
    const startAt = Date.now() + 4500;
    hostStartAtRef.current = startAt;
    const packet = { type: "GAME_START", seed: seedRef.current, startAt, matchId: matchIdRef.current };
    sendRaw(packet);
    const retry1 = setTimeout(() => sendRaw(packet), 200);
    const retry2 = setTimeout(() => sendRaw(packet), 400);
    syncTimerRefs.current.push(retry1, retry2);
    startedMatchesRef.current.add(matchIdRef.current);
    handlersRef.current.onGameStart(seedRef.current, startAt, matchIdRef.current, 0);
  }, [sendRaw]);

  const startPractice = useCallback(() => {
    if (roleRef.current !== "host" || !readyRef.current.host || !readyRef.current.guest || practiceStartedRef.current) return;
    practiceStartedRef.current = true;
    practiceReadyRef.current = { host: false, guest: false };
    handlersRef.current.onPracticeStart(seedRef.current);
    sendRaw({ type: "PRACTICE_START", matchId: matchIdRef.current, seed: seedRef.current });
  }, [sendRaw]);

  const reportPracticeReady = useCallback(() => {
    if (roleRef.current === "host") {
      practiceReadyRef.current.host = true;
      startGame();
    } else sendRaw({ type: "READY", phase: "practice" });
  }, [sendRaw, startGame]);

  // ── Host authority: each player practices before the synchronized GO ────
  const startMatch = useCallback(() => {
    if (roleRef.current !== "host") return;
    clearTimers();
    if (matchStartedRef.current) matchIdRef.current = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    matchStartedRef.current = true;
    sessionActiveRef.current = true;
    hostStartAtRef.current = 0;
    seedRef.current = Math.floor(Math.random() * 2 ** 31);
    startedMatchesRef.current.delete(matchIdRef.current);
    readyRef.current = { host: true, guest: false };
    rematchRef.current = { host: false, guest: false };
    practiceReadyRef.current = { host: false, guest: false };
    practiceStartedRef.current = false;
    handlersRef.current.onClockSynced(0);
    getShieldWords(seedRef.current);
    sendRaw({ type: "READY", phase: "assets", seed: seedRef.current });
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
      readyTimerRef.current = setTimeout(() => {
        if (!readyRef.current.guest || hostStartAtRef.current) return;
        netLog("host readiness timeout; guest still loading", { timeoutMs: 12000 });
      }, 12000);
  }, [clearTimers, sendRaw]);

  const handleMessage = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const { type, ...payload } = raw as Msg;
      switch (type) {
        case "STAGE1_SEED":
        case "STAGE1_PROGRESS":
        case "STAGE1_DONE":
          handlersRef.current.onStageMessage?.(raw as Record<string, unknown>);
          return;
        case "SYNC_PING":
          sendRaw({ type: "SYNC_PONG", t0: Number((payload as { t0?: number }).t0), hostNow: Date.now() });
          return;
        case "SYNC_PONG": {
          if (roleRef.current !== "guest") return;
          const t0 = Number((payload as { t0?: number }).t0);
          const now = Date.now();
          const rtt = Math.max(0, now - t0);
          const hostNow = Number((payload as { hostNow?: number }).hostNow);
          syncSamplesRef.current.push({ rtt, offset: hostNow - (t0 + rtt / 2) });
          if (syncSamplesRef.current.length >= 5) {
            const best = [...syncSamplesRef.current].sort((a, b) => a.rtt - b.rtt)[0]!;
            clockOffsetRef.current = best.offset;
            handlersRef.current.onClockSynced(best.offset);
            getShieldWords(seedRef.current);
            sendRaw({ type: "READY", phase: "assets", seed: seedRef.current });
            syncSamplesRef.current = [];
          }
          return;
        }
        case "READY":
          if (roleRef.current === "host") {
            if ((payload as { phase?: string }).phase === "practice") {
              practiceReadyRef.current.guest = true;
              startGame();
            } else {
              readyRef.current.guest = true;
              startPractice();
            }
          } else if ((payload as { phase?: string }).phase === "assets") {
            seedRef.current = Number(payload.seed ?? seedRef.current);
            getShieldWords(seedRef.current);
          }
          return;
        case "CONNECTION_PROBLEM":
          sessionActiveRef.current = false;
          handlersRef.current.onConnectionProblem();
          return;
        case "PRACTICE_START":
          matchIdRef.current = String((payload as Msg & { matchId?: string }).matchId ?? matchIdRef.current);
          seedRef.current = Number((payload as Msg & { seed?: number }).seed ?? seedRef.current);
          handlersRef.current.onPracticeStart(seedRef.current);
          return;
      }
      if (type === "GAME_START") {
        const incomingMatchId = String((payload as Msg & { matchId?: string }).matchId ?? "");
        if (!incomingMatchId || startedMatchesRef.current.has(incomingMatchId)) return;
        startedMatchesRef.current.add(incomingMatchId);
        matchIdRef.current = incomingMatchId;
        const startAt = Number((payload as Msg & { startAt?: number }).startAt ?? Date.now());
        hostStartAtRef.current = startAt;
        matchLiveRef.current = Date.now() + clockOffsetRef.current >= startAt;
        handlersRef.current.onGameStart(Number(payload.seed ?? 1), startAt, incomingMatchId, clockOffsetRef.current);
        return;
      }
      const event = REVERSE_MAP[type] ?? type;
      const role = roleRef.current;
      switch (event) {
        case "hello":
          if (role !== "host") return;
          opponentNameRef.current = String(payload.name ?? "Opponent");
          handlersRef.current.onOpponentJoined(opponentNameRef.current);
          send("welcome", { name: myNameRef.current });
          if (!matchStartedRef.current) startMatch();
          return;
        case "welcome":
          opponentNameRef.current = String(payload.name ?? "Opponent");
          handlersRef.current.onOpponentJoined(opponentNameRef.current);
          return;
        case "progress":
          handlersRef.current.onOpponentProgress({
            score: Number(payload.score ?? 0),
            stage: Number(payload.stage ?? 1),
            stageProgress: Number(payload.stageProgress ?? 0),
            stageScores: payload.stageScores ?? { s1: 0, s2: 0, s3: 0 },
          });
          return;
        case "show_scoreboard":
          matchLiveRef.current = false;
          handlersRef.current.onShowScoreboard();
          return;
        case "force_game_over":
        case "FORCE_GAME_OVER":
        case "FORCE_GAME_OVER_ACK":
          // Hard-stop sync is owned by the game-root PeerJS data listener.
          matchLiveRef.current = false;
          clearTimers();
          return;
        case "match_over":
          matchLiveRef.current = false;
          handlersRef.current.onMatchOver({
            isWinner: payload.winnerRole === role,
            winnerName: String(payload.winnerName ?? ""),
            loserName: String(payload.loserName ?? ""),
            leaderboard: (payload.leaderboard ?? []) as LeaderboardEntry[],
          });
          return;
        case "rematch_ready":
          if (role !== "host") return;
          rematchRef.current.guest = true;
          if (rematchRef.current.host) {
            send("rematch_start", {});
            handlersRef.current.onRematchStarting();
            startMatch();
          }
          return;
        case "rematch_start":
          handlersRef.current.onRematchStarting();
          readyRef.current = { host: false, guest: true };
          sessionActiveRef.current = true;
          sendRaw({ type: "READY", phase: "assets", seed: seedRef.current });
          return;
      }
    },
    [send, sendRaw, startMatch, startPractice, startGame],
  );

  const attachConnection = useCallback(
    (conn: DataConnection) => {
      netLog("connection attached", { peer: conn.peer });
      connRef.current = conn;
      conn.on("open", () => {
        netLog("conn open", { peer: conn.peer });
        lastMessageRef.current = Date.now();
        if (problemTimerRef.current) clearTimeout(problemTimerRef.current);
        problemTimerRef.current = null;
        if (roleRef.current === "host") sessionActiveRef.current = true;
        pendingCriticalRef.current.forEach((entry) => { if (connRef.current?.open) connRef.current.send(entry.packet); });
      });
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (connRef.current?.open) connRef.current.send({ type: "HB", t: Date.now() });
      }, 2000);
      conn.on("data", (raw) => {
        lastMessageRef.current = Date.now();
        handlersRef.current.onConnectionStatus?.(false);
        const received = raw as { type?: string; msgId?: number };
        if (received?.type === "ACK" && typeof received.msgId === "number") {
          const pending = pendingCriticalRef.current.get(received.msgId);
          if (pending?.timer) clearTimeout(pending.timer);
          pendingCriticalRef.current.delete(received.msgId);
          return;
        }
        if (typeof received?.msgId === "number") {
          conn.send({ type: "ACK", msgId: received.msgId });
          if (receivedCriticalRef.current.has(received.msgId)) return;
          receivedCriticalRef.current.add(received.msgId);
          if (receivedCriticalRef.current.size > 500) receivedCriticalRef.current.clear();
        }
        const message = raw as { type?: string };
        if (message?.type === "HB") { conn.send({ type: "HB_ACK", t: Date.now() }); }
        handleMessage(raw);
        dataListenersRef.current.forEach((fn) => fn(raw));
      });
      conn.on("close", () => {
        netLog("conn close", { peer: conn.peer });
        handlersRef.current.onConnectionStatus?.(true);
        if (connRef.current === conn) connRef.current = null;
        if (roleRef.current === "guest") {
          const redial = (attempt: number) => {
            if (attempt >= 10 || connRef.current?.open) return;
            const delay = Math.min(1000 * 2 ** attempt, 30000);
            setTimeout(() => {
              const peer = peerRef.current;
              if (!peer || peer.destroyed || connRef.current?.open) return;
              redialCountRef.current = attempt + 1;
              try {
                if (peer.disconnected) peer.reconnect();
                const next = peer.connect(PEER_PREFIX + codeRef.current.toUpperCase(), { reliable: true, serialization: "json" });
                attachConnection(next);
              } catch (err) { netLog("guest re-dial error", err); redial(attempt + 1); }
            }, delay);
          };
          redial(redialCountRef.current);
        }
        if (problemTimerRef.current) clearTimeout(problemTimerRef.current);
        problemTimerRef.current = setTimeout(() => {
          if (connRef.current?.open || Date.now() - lastMessageRef.current < 15000) return;
          netLog("connection problem threshold after close", { timeoutMs: 15000 });
          handlersRef.current.onConnectionProblem();
        }, 15000);
      });
      const monitor = setInterval(() => {
        const quietFor = Date.now() - lastMessageRef.current;
        if (quietFor >= 6000) handlersRef.current.onConnectionStatus?.(true);
        if (quietFor >= 15000 && !problemShownRef.current) {
          problemShownRef.current = true;
          netLog("connection problem modal threshold", { quietFor });
          handlersRef.current.onConnectionProblem();
        }
      }, 500);
      conn.once("close", () => clearInterval(monitor));
      conn.on("error", (err) => netLog("conn error", { type: err.type, err }));
      conn.on("iceStateChanged", (state) => netLog("conn iceStateChange", state));
    },
    [clearTimers, handleMessage],
  );

  const openPeer = useCallback(async (id?: string) => {
    const { default: PeerCtor } = await import("peerjs");
    return new Promise<Peer>((resolve, reject) => {
      const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
        ...(import.meta.env["VITE_TURN_URL"] ? [{ urls: import.meta.env["VITE_TURN_URL"], username: import.meta.env["VITE_TURN_USER"], credential: import.meta.env["VITE_TURN_PASS"] }] : []),
      ];
      const peer = id ? new PeerCtor(id, { config: { iceServers } }) : new PeerCtor({ config: { iceServers } });
      peer.on("open", (peerId) => netLog("peer open", { peerId }));
      peer.on("connection", (incoming) => netLog("peer connection", { peer: incoming.peer }));
      peer.on("disconnected", () => {
        netLog("peer disconnected; signaling reconnect scheduled");
        let tries = 0;
        const reconnect = () => {
          if (peer.destroyed || !peer.disconnected || tries >= 10) return;
          const delay = Math.min(1000 * 2 ** tries, 30000); tries++;
          setTimeout(() => { try { if (peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (err) { netLog("peer reconnect error", err); reconnect(); } }, delay);
        };
        reconnect();
      });
      peer.on("close", () => netLog("peer close"));
      peer.on("error", (err) => netLog("peer error", { type: err.type, err }));
      const fail = (err: { type?: string }) => {
        peer.destroy();
        reject(err);
      };
      peer.once("open", () => {
        peer.off("error", fail);
        resolve(peer);
      });
      peer.once("error", fail);
    });
  }, []);

  const startClockSync = useCallback(() => {
    syncSamplesRef.current = [];
    let sent = 0;
    const ping = () => {
      if (sent >= 5) return;
      sent++;
      sendRaw({ type: "SYNC_PING", t0: Date.now() });
      if (sent < 5) syncTimerRefs.current.push(setTimeout(ping, 200));
    };
    ping();
  }, [sendRaw]);

  const createRoom = useCallback(
    async (name: string) => {
      roleRef.current = "host";
      myNameRef.current = name;
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        try {
          const peer = await openPeer(PEER_PREFIX + code);
          peerRef.current = peer;
          codeRef.current = code;
          matchIdRef.current = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          matchStartedRef.current = false;
          peer.on("connection", (conn) => {
            netLog("host accepts/replaces connection", { peer: conn.peer });
            if (connRef.current && connRef.current !== conn) connRef.current.close();
            attachConnection(conn);
          });
          return code;
        } catch (err) {
          if ((err as { type?: string }).type !== "unavailable-id") {
            throw new Error("Could not open a room. Check your connection and try again.");
          }
        }
      }
      throw new Error("Could not open a room. Please try again.");
    },
    [attachConnection, openPeer],
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      roleRef.current = "guest";
      myNameRef.current = name;
      codeRef.current = code;
      let peer: Peer;
      try {
        peer = await openPeer();
      } catch {
        throw new Error("Connection problem. Please try again.");
      }
      peerRef.current = peer;
      const conn = await new Promise<DataConnection>((resolve, reject) => {
        const c = peer.connect(PEER_PREFIX + code.toUpperCase(), { reliable: true, serialization: "json" });
        const timer = setTimeout(() => reject(new Error("Room not found. Check the Room ID.")), 8000);
        peer.once("error", (err) => {
          clearTimeout(timer);
          reject(
            new Error(
              err.type === "peer-unavailable"
                ? "Room not found. Check the Room ID."
                : "Connection problem. Please try again.",
            ),
          );
        });
        c.once("open", () => {
          clearTimeout(timer);
          resolve(c);
        });
      }).catch((e) => {
        peer.destroy();
        peerRef.current = null;
        throw e;
      });
      attachConnection(conn);
      sessionActiveRef.current = true;
      send("hello", { name });
      startClockSync();
      return { hostName: opponentNameRef.current || "Host" };
    },
    [attachConnection, openPeer, send, startClockSync],
  );

  const sendProgress = useCallback(
    (progress: { score: number; stage: number; stageProgress: number; stageScores?: { s1: number; s2: number; s3: number } }) => {
      send("progress", progress);
    },
    [send],
  );

  const sendShowScoreboard = useCallback(() => {
    send("show_scoreboard", {});
  }, [send]);

  const sendForceGameOver = useCallback(
    (payload: Record<string, unknown>) => {
      matchLiveRef.current = false;
      send("force_game_over", payload);
    },
    [send],
  );

  const sendRematchReady = useCallback(() => {
    if (roleRef.current === "host") {
      rematchRef.current.host = true;
      if (rematchRef.current.guest) {
        send("rematch_start", {});
        handlersRef.current.onRematchStarting();
        startMatch();
      }
    } else {
      send("rematch_ready", { name: myNameRef.current });
    }
  }, [send, startMatch]);

  const leave = useCallback(() => {
    netLog("leave/destroy called", new Error().stack);
    clearTimers();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    if (problemTimerRef.current) clearTimeout(problemTimerRef.current);
    problemTimerRef.current = null;
    matchLiveRef.current = false;
    sessionActiveRef.current = false;
    hostStartAtRef.current = 0;
    startedMatchesRef.current.clear();
    rematchRef.current = { host: false, guest: false };
    connRef.current?.close();
    connRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
  }, [clearTimers]);

  const retryConnection = useCallback(() => {
    netLog("manual retry requested");
    const peer = peerRef.current;
    if (!peer || peer.destroyed || roleRef.current !== "guest") return;
    if (peer.disconnected) peer.reconnect();
    const conn = peer.connect(PEER_PREFIX + codeRef.current.toUpperCase(), { reliable: true, serialization: "json" });
    attachConnection(conn);
    conn.once("open", () => { send("hello", { name: myNameRef.current }); startClockSync(); });
    problemShownRef.current = false;
  }, [attachConnection, send, startClockSync]);

  useEffect(() => {
    const onUnload = () => { netLog("beforeunload destroy"); peerRef.current?.destroy(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const sendStageMessage = useCallback((msg: Record<string, unknown>) => {
    const conn = connRef.current;
    if (conn?.open) conn.send(msg);
  }, []);
  const isHost = useCallback(() => roleRef.current === "host", []);

  return {
    createRoom,
    joinRoom,
    sendProgress,
    sendShowScoreboard,
    sendForceGameOver,
    sendRaw,
    subscribeData,
    sendRematchReady,
    leave,
    sendStageMessage,
    reportPracticeReady,
    isHost,
    retryConnection,
  };
}

