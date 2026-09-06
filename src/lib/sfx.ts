let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  at: number,
  dur = 0.18,
  type: OscillatorType = "triangle",
  gain = 0.16
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + at;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const UP = [523.25, 659.25, 783.99]; // C5 E5 G5

export function playCorrect(streak: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  const notes = streak >= 3 ? [...UP, 1046.5] : streak >= 2 ? UP : UP.slice(0, 2);
  notes.forEach((f, i) => tone(ctx, f, i * 0.08, 0.2));
}

export function playMilestone(): void {
  const ctx = getCtx();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
    tone(ctx, f, i * 0.07, 0.24, "triangle", 0.18)
  );
}

export function playWrong(): void {
  const ctx = getCtx();
  if (!ctx) return;
  tone(ctx, 330, 0, 0.16, "sine", 0.08);
  tone(ctx, 262, 0.12, 0.2, "sine", 0.08);
}

