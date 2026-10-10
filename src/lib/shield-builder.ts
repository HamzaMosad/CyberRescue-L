export const SB_CONFIG = {
  WORDS: ["bug", "hack", "spam", "worm", "wifi", "data", "mail", "lock", "code", "pass", "scam", "fake", "user", "key", "virus", "cyber", "admin", "login"],
  WORD_COUNT: 10,
  PRACTICE_SECONDS: 10,
  WORD_SCORE: 100,
  SPEED_BASE: 600,
  SPEED_SECONDS: 30,
  SPEED_PENALTY_PER_SECOND: 8,
  ACCURACY_BONUSES: [{ minimum: 1, points: 200 }, { minimum: 0.9, points: 100 }, { minimum: 0.8, points: 50 }] as const,
} as const;

export function getShieldWords(seed: number): string[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const shuffled = [...SB_CONFIG.WORDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.sort((a, b) => a.length - b.length).slice(0, SB_CONFIG.WORD_COUNT);
}

export function getShieldScore(seconds: number, accuracy: number): number {
  const speed = Math.round(Math.max(0, SB_CONFIG.SPEED_BASE - SB_CONFIG.SPEED_PENALTY_PER_SECOND * Math.max(0, seconds - SB_CONFIG.SPEED_SECONDS)));
  const accuracyBonus = SB_CONFIG.ACCURACY_BONUSES.find((bonus) => accuracy >= bonus.minimum)?.points ?? 0;
  return SB_CONFIG.WORD_COUNT * SB_CONFIG.WORD_SCORE + speed + accuracyBonus;
}

export interface ShieldTypingState {
  word: string;
  typed: string;
  mistakes: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  completed: boolean;
}

export function applyKey(state: ShieldTypingState, key: string, code: string): ShieldTypingState {
  if (key === "Backspace") {
    if (!state.typed) return state;
    return { ...state, typed: state.typed.slice(0, -1), completed: false };
  }
  if (key.length !== 1) return state;
  let ch = key.toLowerCase();
  if (!/^[a-z0-9]$/.test(ch)) {
    const letter = /^Key([A-Z])$/.exec(code);
    const digit = /^Digit([0-9])$/.exec(code);
    ch = letter?.[1]?.toLowerCase() ?? digit?.[1] ?? ch;
  }
  const expected = state.word[state.typed.length];
  const correct = ch === expected;
  return {
    ...state,
    typed: correct ? state.typed + ch : state.typed,
    mistakes: state.mistakes + (correct ? 0 : 1),
    correctKeystrokes: state.correctKeystrokes + (correct ? 1 : 0),
    totalKeystrokes: state.totalKeystrokes + 1,
    completed: correct && state.typed.length + 1 === state.word.length,
  };
}

if (import.meta.env.DEV) {
  const initial: ShieldTypingState = { word: "pass", typed: "", mistakes: 0, correctKeystrokes: 0, totalKeystrokes: 0, completed: false };
  const wrong = [..."vvvv"].reduce((state, key) => applyKey(state, key, ""), initial);
  console.assert(wrong.typed.length === 0 && !wrong.completed, 'Typing "vvvv" must not advance the word "pass".');
  const right = [..."pass"].reduce((state, key) => applyKey(state, key, ""), initial);
  console.assert(right.typed === "pass" && right.completed, 'Typing "pass" must complete the word.');
}
