import { LocalResultsStore, type ResultsStore } from "./localStore";
import { RemoteResultsStore } from "./remoteStore";
export type { ResultsStore } from "./localStore";
let singleton: ResultsStore | null = null;
export function getResultsStore(): ResultsStore {
  if (singleton) return singleton;
  const endpoint = (import.meta.env as ImportMetaEnv & { VITE_RESULTS_ENDPOINT?: string }).VITE_RESULTS_ENDPOINT?.trim();
  singleton = endpoint ? new RemoteResultsStore(endpoint) : new LocalResultsStore();
  if (!endpoint && typeof console !== "undefined") console.warn("[Results] VITE_RESULTS_ENDPOINT is missing; using browser-local storage.");
  if (singleton instanceof RemoteResultsStore && typeof window !== "undefined") {
    void singleton.retryPending();
    const remote = singleton;
    window.setInterval(() => { void remote.retryPending(); }, 30_000);
  }
  return singleton;
}
