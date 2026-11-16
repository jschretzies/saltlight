// All sound is made in the browser. No sound files.

let ctx = null;
let master = null;
let muted = false;
let seaStarted = false;
let testing = false;
const LEVEL = 1.8;   // overall loudness; measured so the loudest sound stays well under clipping

function ready() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : LEVEL;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended' && !testing) ctx.resume();
  return true;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, slide = 0 } = {}) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// A struck bell: a clear note with a quieter overtone and a long tail.
function bell(freq, { vol = 0.22, at = 0, dur = 1.6 } = {}) {
  tone(freq, dur, { vol, at });
  tone(freq * 2.76, dur * 0.4, { vol: vol * 0.25, at });
}

let noiseBuf = null;
function noise(dur, { vol = 0.2, at = 0, type = 'lowpass', freq = 800, q = 0.7 } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = freq;
  fl.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// The sea outside: slow swells of filtered noise, running the whole time.
function sea() {
  if (seaStarted) return;
  seaStarted = true;
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.value = 520;
  const g = ctx.createGain();
  g.gain.value = 0.11;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const depth = ctx.createGain();
  depth.gain.value = 0.07;
  lfo.connect(depth).connect(g.gain);
  src.connect(fl).connect(g).connect(master);
  src.start();
  lfo.start();
}

const NOTES = [0, 523.25, 659.25, 783.99]; // low, middle, high

const SFX = {
  tick: () => tone(1500, 0.035, { type: 'triangle', vol: 0.12 }),
  step: () => noise(0.13, { vol: 0.55, freq: 500 }),
  pickup: () => { tone(660, 0.12, { vol: 0.16 }); tone(990, 0.2, { vol: 0.16, at: 0.08 }); },
  deny: () => tone(150, 0.14, { type: 'triangle', vol: 0.2, slide: 0.7 }),
  drawer: () => noise(0.24, { vol: 0.7, freq: 380 }),
  paper: () => noise(0.18, { vol: 0.09, type: 'highpass', freq: 2600 }),
  slide: () => { noise(0.08, { vol: 0.08, freq: 900 }); tone(240, 0.07, { type: 'triangle', vol: 0.14 }); },
  fit: () => { tone(420, 0.06, { type: 'triangle', vol: 0.2 }); tone(180, 0.12, { type: 'triangle', vol: 0.2, at: 0.05 }); },
  strike: () => { noise(0.2, { vol: 0.22, type: 'highpass', freq: 3200 }); noise(0.9, { vol: 0.1, freq: 420, at: 0.16 }); },
  puff: () => noise(0.3, { vol: 0.5, freq: 700 }),
  sparkle: () => { [1568, 2093, 1760, 2637, 2349].forEach((fq, i) => tone(fq, 0.5, { vol: 0.07, at: i * 0.09 })); },
  climb: () => { for (let i = 0; i < 4; i++) tone(130 + i * 12, 0.09, { type: 'triangle', vol: 0.2, at: i * 0.17 }); },
  pour: () => { noise(1.1, { vol: 0.32, type: 'bandpass', freq: 900, q: 3 }); tone(300, 1.0, { vol: 0.09, slide: 1.9 }); },
  crankturn: () => { for (let i = 0; i < 5; i++) tone(520, 0.03, { type: 'square', vol: 0.1, at: i * 0.11 }); noise(0.6, { vol: 0.3, freq: 300 }); },
  chime: () => { bell(880, { dur: 2 }); bell(1108.7, { at: 0.28, dur: 2.2 }); },
  unlock: () => { tone(110, 0.16, { type: 'triangle', vol: 0.3, slide: 0.6 }); bell(783.99, { at: 0.12 }); bell(1174.7, { at: 0.3, dur: 2 }); },
};

// For tests only: play into a given (offline) context so the result can be measured.
export function useContextForTest(c) {
  ctx = c;
  testing = true;
  master = ctx.createGain();
  master.gain.value = LEVEL;
  master.connect(ctx.destination);
  noiseBuf = null;
  seaStarted = false;
}

export const Sound = {
  names: () => Object.keys(SFX),
  // Call from the first tap; browsers only allow sound after a touch.
  wake() { if (ready()) sea(); },
  play(name) { if (!muted && SFX[name] && ready()) SFX[name](); },
  note(level) { if (!muted && ready()) bell(NOTES[level], { vol: 0.24, dur: 1.4 }); },
  get muted() { return muted; },
  setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : LEVEL;
  },
};
