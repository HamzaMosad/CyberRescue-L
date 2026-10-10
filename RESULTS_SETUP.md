# Match results setup

Leave `VITE_RESULTS_ENDPOINT` empty to save results in this browser's local storage. Results are private to that browser.

To share results across devices, set `VITE_RESULTS_ENDPOINT` to a Google Apps Script web app URL or another JSON endpoint. `GET` should return `{ "matches": MatchRecord[] }`. `POST` receives one JSON `MatchRecord` using `Content-Type: text/plain;charset=utf-8`; the endpoint should deduplicate records by `matchId`.

The adapter is selected in `src/lib/results/store.ts`. A future Cloudflare D1 or Supabase adapter can implement the same `ResultsStore` interface (`saveMatch` and `listMatches`) and be selected there.
