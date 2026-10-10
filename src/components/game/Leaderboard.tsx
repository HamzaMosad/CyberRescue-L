import { useCallback, useEffect, useState } from "react";
import { getResultsStore } from "@/lib/results/store";
import type { MatchRecord } from "@/lib/results/types";
import { RemoteResultsStore } from "@/lib/results/remoteStore";

type Tab = "THIS MATCH" | "TODAY" | "ALL TIME";
export function Leaderboard({ onReturnToLobby }: { onReturnToLobby: () => void }) {
  const [tab, setTab] = useState<Tab>("THIS MATCH");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [remoteConfigured, setRemoteConfigured] = useState(false);
  const [connectionTest, setConnectionTest] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const store = getResultsStore();
      setRemoteConfigured(store instanceof RemoteResultsStore);
      setMatches(await store.listMatches(500));
      setOnline(!(store instanceof RemoteResultsStore) || store.online);
    }
    catch { setOnline(false); }
    finally { setLoading(false); }
  }, []);
  const testConnection = useCallback(async () => {
    const store = getResultsStore();
    if (!(store instanceof RemoteResultsStore)) {
      setConnectionTest("Results endpoint is not configured.");
      return;
    }
    setConnectionTest("Testing…");
    try {
      const count = await store.testConnection();
      setConnectionTest(`Connected ✓ (${count} matches)`);
      setOnline(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      setConnectionTest(message);
      setOnline(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onReturnToLobby();
      if (e.key.toLowerCase() === "r") void refresh();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") setTab((t) => {
        const tabs: Tab[] = ["THIS MATCH", "TODAY", "ALL TIME"];
        return tabs[(tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : 2)) % 3]!;
      });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onReturnToLobby, refresh]);
  const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const today = dateKey(new Date());
  const visibleMatches = tab === "TODAY" ? matches.filter((m) => dateKey(new Date(m.finishedAt)) === today) : matches;
  const ranked = new Map<string, { name: string; wins: number; matches: number; bestTime: number; bestScore: number }>();
  for (const match of visibleMatches) for (const player of match.players) {
    const key = player.name.trim().toLowerCase();
    if (!key) continue;
    const old = ranked.get(key) ?? { name: player.name.trim(), wins: 0, matches: 0, bestTime: Infinity, bestScore: 0 };
    old.matches++;
    if (player.status === "WINNER") { old.wins++; if (player.elapsedMs != null) old.bestTime = Math.min(old.bestTime, player.elapsedMs); }
    old.bestScore = Math.max(old.bestScore, player.totalScore);
    ranked.set(key, old);
  }
  const rows = [...ranked.values()].sort((a, b) => b.wins - a.wins || a.bestTime - b.bestTime || b.bestScore - a.bestScore);
  const fmt = (ms: number) => ms === Infinity ? "—" : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  return <main className="fixed inset-0 z-[100] overflow-auto bg-[#050b14] p-5 text-cyan-50 md:p-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between"><div><p className="font-mono text-xs tracking-[.3em] text-cyan-400">CYBERRESCUE</p><h1 className="mt-2 font-mono text-3xl font-black tracking-widest">LEADERBOARD</h1></div><button className="border border-cyan-400/50 px-4 py-2 font-mono text-sm text-cyan-200" onClick={onReturnToLobby}>ESC · CLOSE</button></header>
      <div className="mb-2 flex items-center gap-2">{(["THIS MATCH", "TODAY", "ALL TIME"] as Tab[]).map((x) => <button key={x} onClick={() => setTab(x)} className={`border px-4 py-2 font-mono text-xs ${tab === x ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-cyan-900 text-cyan-500"}`}>{x}</button>)}<span className={`ml-auto font-mono text-xs ${online ? "text-green-400" : "text-amber-400"}`}>{remoteConfigured ? online ? "ONLINE" : "OFFLINE" : "LOCAL ONLY"} · R TO REFRESH</span></div>
      <div className="mb-5 flex min-h-6 items-center gap-3 font-mono text-[11px] text-cyan-400">
        <button type="button" onClick={() => void testConnection()} className="underline decoration-dotted underline-offset-4 hover:text-cyan-200">Test results connection</button>
        {connectionTest && <span role="status" className={connectionTest.startsWith("Connected") ? "text-green-400" : "text-amber-300"}>{connectionTest}</span>}
      </div>
      {tab !== "THIS MATCH" && <section className="mb-8 overflow-x-auto border border-cyan-900/70"><table className="w-full min-w-[650px] text-left font-mono text-sm"><thead className="bg-cyan-950/60 text-cyan-400"><tr>{["RANK", "NAME", "WINS", "MATCHES", "BEST TIME", "BEST SCORE"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-6 text-center text-cyan-300">Loading…</td></tr> : rows.length ? rows.map((r, i) => <tr key={r.name.toLowerCase()} className="border-t border-cyan-950"><td className="p-3">{i + 1}</td><td className="p-3">{r.name}</td><td className="p-3">{r.wins}</td><td className="p-3">{r.matches}</td><td className="p-3">{fmt(r.bestTime)}</td><td className="p-3">{r.bestScore}</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-cyan-500">No matches yet</td></tr>}</tbody></table></section>}
      {tab === "THIS MATCH" && <section className="mb-8 overflow-x-auto border border-cyan-900/70"><table className="w-full min-w-[650px] text-left font-mono text-sm"><thead className="bg-cyan-950/60 text-cyan-400"><tr>{["RANK", "NAME", "STATUS", "STAGE", "S1 / S2 / S3", "POINTS", "TIME"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-6 text-center text-cyan-300">Loading…</td></tr> : matches[0] ? [...matches[0].players].sort((a, b) => Number(b.status === "WINNER") - Number(a.status === "WINNER")).map((p, i) => <tr key={`${p.name}-${i}`} className="border-t border-cyan-950"><td className="p-3">{i + 1}</td><td className="p-3">{p.name}</td><td className="p-3">{p.status === "WINNER" ? "FINISHED FIRST" : p.status === "TIME_UP" ? "TIME'S UP" : p.status}</td><td className="p-3">Stage {p.stageReached}</td><td className="p-3">{p.stageScores.s1} / {p.stageScores.s2} / {p.stageScores.s3}</td><td className="p-3">{p.totalScore}</td><td className="p-3">{fmt(p.elapsedMs ?? Infinity)}</td></tr>) : <tr><td colSpan={7} className="p-8 text-center text-cyan-500">No matches yet</td></tr>}</tbody></table></section>}
      <section><h2 className="mb-3 font-mono text-sm tracking-[.2em] text-cyan-400">RECENT MATCHES</h2>{loading ? <div className="animate-pulse border border-cyan-900/60 p-6 text-cyan-700">Loading matches…</div> : matches.length ? <div className="space-y-2">{matches.slice(0, 20).map((m) => <article key={m.matchId} className="grid gap-2 border border-cyan-900/50 p-3 font-mono text-xs md:grid-cols-[1fr_1fr_1fr_auto]"><span>{new Date(m.finishedAt).toLocaleString()}</span><span>Winner: {m.winnerName || m.players.find((p) => p.status === "WINNER")?.name || "—"}</span><span>{m.players.map((p) => `${p.name} · Stage ${p.stageReached} · ${p.totalScore}pts`).join(" | ")}</span><span>{fmt(m.durationMs)}</span></article>)}</div> : <p className="border border-cyan-900/50 p-6 text-center font-mono text-cyan-500">No matches yet</p>}</section>
    </div>
  </main>;
}
