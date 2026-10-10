import type { MatchRecord } from "./types";
const MATCH_KEY = "cyberrescue_matches_v1";
const PENDING_KEY = "cyberrescue_pending_v1";
export interface ResultsStore { saveMatch(r: MatchRecord): Promise<void>; listMatches(limit?: number): Promise<MatchRecord[]> }

export class LocalResultsStore implements ResultsStore {
  async saveMatch(record: MatchRecord) {
    try {
      const records = await this.listMatches(500);
      localStorage.setItem(MATCH_KEY, JSON.stringify([record, ...records.filter((r) => r.matchId !== record.matchId)].slice(0, 500)));
    } catch { /* Storage may be disabled or full. */ }
  }
  async listMatches(limit = 500) {
    try { return (JSON.parse(localStorage.getItem(MATCH_KEY) || "[]") as MatchRecord[]).slice(0, limit); }
    catch { return []; }
  }
  async pending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]") as MatchRecord[]; }
    catch { return []; }
  }
  async setPending(records: MatchRecord[]) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(records.slice(0, 500))); }
    catch { /* Best-effort offline queue. */ }
  }
}
