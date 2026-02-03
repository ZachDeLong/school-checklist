let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playCheckSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

export function playUncheckSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

export function playCelebrationSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const noteSpacing = 0.1;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const noteStart = now + i * noteSpacing;
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.3);
  });
}
