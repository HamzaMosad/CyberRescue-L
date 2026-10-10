let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  ctx: AudioContext
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/** Short ascending two-tone beep — played on every stage completion. */
export function playStageBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(880,  t,        0.13, 0.28, 'sine', ctx);
  playTone(1320, t + 0.13, 0.18, 0.22, 'sine', ctx);
}

/** Triumphant ascending fanfare — played when the local player wins. */
export function playWinFanfare() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // C5 E5 G5 C6 — classic major-chord ascent
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    playTone(freq, t + i * 0.14, 0.32, 0.22, 'sine', ctx);
  });
  // Add a little shimmer on the last note
  playTone(2093, t + notes.length * 0.14, 0.25, 0.10, 'sine', ctx);
}

/** Descending minor sting — played when the local player loses. */
export function playLoseSting() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // G4 Eb4 B3 — descending minor feel
  const notes = [392, 311, 247];
  notes.forEach((freq, i) => {
    playTone(freq, t + i * 0.22, 0.38, 0.18, 'sawtooth', ctx);
  });
}

/** Crisp, subtle high-tech cyber click — played on every keypress. */
export function playKeyClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Short bright blip with a slight random detune so repeats feel organic
  const freq = 1400 + Math.random() * 400;
  playTone(freq, t, 0.045, 0.10, 'square', ctx);
  playTone(freq * 2, t, 0.03, 0.04, 'sine', ctx);
}

/** Distinct synth error tone — played when an incorrect character is entered. */
export function playErrorTone() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Harsh descending buzz
  playTone(220, t, 0.14, 0.16, 'sawtooth', ctx);
  playTone(165, t + 0.05, 0.16, 0.14, 'sawtooth', ctx);
}

/** Subtle low-frequency damp click — played on Backspace. */
export function playBackspaceClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.07);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.09);
}

/** Halt any in-flight oscillators so a hard match stop is silent. */
export function stopAllSounds() {
  if (!_ctx) return;
  try {
    void _ctx.close();
  } catch {
    /* already closed */
  }
  _ctx = null;
}

/** Smooth neon futuristic pulse / activation chime — played when switching specialty tabs. */
export function playTabChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Rising two-note chime with a soft shimmer tail
  playTone(660, t, 0.12, 0.14, 'sine', ctx);
  playTone(990, t + 0.07, 0.18, 0.12, 'sine', ctx);
  playTone(1980, t + 0.12, 0.22, 0.05, 'sine', ctx);
}
