let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  if (!enabled) return;
  unlockAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  place() {
    tone(240 + Math.random() * 30, 0.07, "triangle", 0.05);
    tone(620 + Math.random() * 40, 0.05, "square", 0.02);
  },
  remove() {
    tone(180, 0.09, "sawtooth", 0.03, -80);
  },
  deny() {
    tone(110, 0.1, "square", 0.03);
  },
  rotate() {
    tone(740, 0.045, "triangle", 0.03);
  },
  paint() {
    tone(880, 0.04, "sine", 0.03);
  },
  undo() {
    tone(420, 0.06, "triangle", 0.03, -120);
  },
  ok() {
    tone(520, 0.06, "sine", 0.03);
  },
};
