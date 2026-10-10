import type { MatchRecord } from "./types";
import { LocalResultsStore, type ResultsStore } from "./localStore";

export class RemoteResultsStore implements ResultsStore {
  online = true;
  constructor(private endpoint: string, private local = new LocalResultsStore()) {}
  async saveMatch(record: MatchRecord) {
    await this.local.saveMatch(record);
    const pending = await this.local.pending();
    await this.local.setPending([...pending.filter((r) => r.matchId !== record.matchId), record]);
    await this.retryPending();
  }
  async listMatches(limit = 500) {
    const local = await this.local.listMatches(limit);
    try {
      const response = await fetch(this.endpoint);
      if (!response.ok) {
        console.warn(`[Results] GET failed with HTTP ${response.status}.`);
        throw new Error(`Results request failed (${response.status})`);
      }
      this.online = true;
      const body = await response.json() as { matches?: MatchRecord[] };
      return merge(body.matches ?? [], local).slice(0, limit);
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("Results request failed ("))) console.warn("[Results] GET failed.", error);
      this.online = false;
      return local;
    }
  }
  async testConnection() {
    try {
      const response = await fetch(this.endpoint, { redirect: "follow" });
      if (!response.ok) {
        console.warn(`[Results] Connection test GET failed with HTTP ${response.status}.`);
        throw new Error(`Connection failed (${response.status})`);
      }
      const body = await response.json() as { matches?: MatchRecord[] };
      this.online = true;
      return Array.isArray(body.matches) ? body.matches.length : 0;
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("Connection failed ("))) console.warn("[Results] Connection test GET failed.", error);
      this.online = false;
      throw error;
    }
  }
  async retryPending() {
    const pending = await this.local.pending();
    if (pending.length === 0) return;
    const failed: MatchRecord[] = [];
    for (const record of pending) {
      try {
        const response = await fetch(this.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(record), redirect: "follow" });
        if (!response.ok) {
          console.warn(`[Results] POST failed with HTTP ${response.status}.`);
          failed.push(record);
        }
      } catch (error) {
        console.warn("[Results] POST failed.", error);
        failed.push(record);
      }
    }
    await this.local.setPending(failed);
    this.online = failed.length === 0;
  }
}
function merge(remote: MatchRecord[], local: MatchRecord[]) {
  return [...new Map([...remote, ...local].map((r) => [r.matchId, r])).values()].sort((a, b) => b.finishedAt - a.finishedAt);
}
