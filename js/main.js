// Ties the game together: taps, phone movement, drawing, saving, hints.
import { newState, act, hintFor, ITEMS, PINS, NOTES } from './logic.js';
import { scene, icon, blinkCSS, pictureFiles } from './art.js';
import { Sound } from './audio.js';
import { Ads } from './ads.js';

const SAVE = 'saltlight.v2';
const SLOTS = 7;
const $ = (id) => document.getElementById(id);
const el = {
  stage: $('stage'), scene: $('scene'), prev: $('prev'), next: $('next'), back: $('back'),
  caption: $('caption'), inv: $('inv'), flash: $('flash'),
  title: $('title'), end: $('end'), endLine: $('endLine'),
  hint: $('hint'), hintNudge: $('hintNudge'), hintAnswer: $('hintAnswer'), hintMore: $('hintMore'),
  note: $('note'), noteText: $('noteText'), notes: $('notes'), notesList: $('notesList'),
};

let s = load() || newState();
let playing = false;
let timers = [];
let captionTimer = 0;
let glowTimer = 0;
let bottleTaps = 0;

function load() {
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved && saved.f && Array.isArray(saved.inv) ? { ...newState(), ...saved, sel: null, glow: false } : null;
  } catch { return null; }
}
function save() {
  try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch { /* private window: play without saving */ }
}
function forget() {
  try { localStorage.removeItem(SAVE); } catch { /* nothing to forget */ }
}

function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function say(text) {
  clearTimeout(captionTimer);
  if (!text) { el.caption.classList.remove('show'); return; }
  el.caption.textContent = text;
  el.caption.classList.add('show');
  captionTimer = setTimeout(() => el.caption.classList.remove('show'), 4600);
}

// A note from Grandad, shown as a slip of paper.
function showNote(id) {
  el.noteText.textContent = NOTES[id];
  el.note.hidden = false;
}
function openNotes() {
  if (!playing) return;
  el.notesList.innerHTML = '';
  for (const id of s.notes) {
    const p = document.createElement('p');
    p.className = 'paper';
    p.textContent = NOTES[id];
    el.notesList.appendChild(p);
  }
  el.notes.hidden = false;
}

function draw(fx, motion, detail) {
  el.scene.innerHTML = scene(s, fx, detail);
  el.scene.className = 'scene' + (motion ? ' ' + motion : '');
  el.prev.hidden = el.next.hidden = !!s.view || s.won;
  el.back.hidden = !s.view || s.won;
  drawTray();
}

function drawTray(fresh) {
  let html = '';
  for (let i = 0; i < SLOTS; i++) {
    const item = s.inv[i];
    if (!item) { html += '<div class="slot"></div>'; continue; }
    const cls = ['slot'];
    if (s.sel === item) cls.push('held');
    if (fresh === item) cls.push('new');
    if (item === 'jar' && s.glow) cls.push('glowing');
    html += `<button class="${cls.join(' ')}" type="button" data-item="${item}" aria-label="${ITEMS[item]}" aria-pressed="${s.sel === item}">${icon(item)}</button>`;
  }
  el.inv.innerHTML = html;
}

// ---------- small rewards

let lastTap = null; // where the last tap landed, in window coordinates
const BURSTS = { light: '#F0BE48', toplight: '#F0BE48', chest: '#E6B23A', clock: '#E6B23A', lock: '#E6B23A', panel: '#E6B23A', rings: '#E6B23A', hatch: '#E6B23A', door: '#F3EAD0', page: '#EDE6D3', lens: '#C9D3C4', crank: '#E6B23A', drum: '#E6B23A', oil: '#E6B23A' };

// A handful of sparks from where you tapped, and the room gives a small jolt.
function burst(color) {
  if (!el.stage.animate) return;
  const box = el.stage.getBoundingClientRect();
  const x = lastTap ? lastTap.x - box.left : box.width / 2;
  const y = lastTap ? lastTap.y - box.top : box.height / 2;
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('span');
    dot.className = 'spark';
    dot.style.cssText = `left:${x}px;top:${y}px;background:${color}`;
    el.stage.appendChild(dot);
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5, far = 38 + Math.random() * 46;
    dot.animate(
      [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * far}px, ${Math.sin(a) * far - 14}px) scale(0.2)`, opacity: 0 }],
      { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)' },
    ).onfinish = () => dot.remove();
  }
  el.stage.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.014)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
}

// What you pick up flies from where it lay to its place in the tray.
function flyToTray(item) {
  const slot = el.inv.querySelector(`[data-item="${item}"]`);
  if (!slot || !lastTap || !slot.animate) return;
  const to = slot.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  ghost.innerHTML = slot.innerHTML;
  ghost.style.left = lastTap.x + 'px';
  ghost.style.top = lastTap.y + 'px';
  document.body.appendChild(ghost);
  slot.style.opacity = '0';
  const dx = to.left + to.width / 2 - lastTap.x, dy = to.top + to.height / 2 - lastTap.y;
  ghost.animate(
    [{ transform: 'translate(0,0) scale(1.9)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 50}px) scale(1.5)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) scale(1)` }],
    { duration: 480, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
  ).onfinish = () => { ghost.remove(); slot.style.opacity = ''; };
}

function doAct(id, fxAfter) {
  if (!playing) return;
  const before = { area: s.area, wall: s.wall, view: s.view, inv: s.inv.length };
  const r = act(s, id);
  const moved = before.view !== s.view || before.wall !== s.wall || before.area !== s.area;
  if (moved) { bottleTaps = 0; if (r.fx !== 'play') clearTimers(); }

  let motion = '';
  if (r.turn) motion = 'turn-' + r.turn;
  else if (before.view !== s.view) motion = 'zoom';
  draw(r.fx || fxAfter, motion, r);
  if (s.inv.length > before.inv) { drawTray(s.inv[s.inv.length - 1]); flyToTray(s.inv[s.inv.length - 1]); }
  if (BURSTS[r.fx]) burst(BURSTS[r.fx]);

  if (r.sfx) Sound.play(r.sfx);
  if (r.note) { say(''); later(() => showNote(r.note), 450); }
  else if (r.msg !== undefined || moved || r.sfx) say(r.msg || '');
  if (r.fx === 'glow') {
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => { act(s, 'unglow'); if (playing) draw(); }, 7000);
  }
  if (r.fx === 'play') playBox();
  if (r.after) later(() => doAct(r.after, r.fx === 'lock' ? 'cabinet' : undefined), 1300);
  if (r.fx === 'door') finish();
  save();
}

// The music box: five notes, one for each pin as it rises.
function playBox() {
  clearTimers();
  PINS.forEach((level, i) => later(() => Sound.note(level), 150 + i * 600));
}

function finish() {
  playing = false;
  later(() => el.flash.classList.add('on'), 900);
  later(() => {
    const total = Math.round(s.ms / 1000);
    const mm = Math.floor(total / 60), ss = String(total % 60).padStart(2, '0');
    const hints = s.hints === 0 ? 'no hints' : s.hints === 1 ? '1 hint' : s.hints + ' hints';
    el.endLine.textContent = `You left the lighthouse in ${mm}:${ss}, with ${hints}.`;
    el.end.hidden = false;
    el.flash.classList.remove('on');
  }, 2600);
}

function start(fresh) {
  if (fresh) { s = newState(); forget(); }
  clearTimers();
  clearTimeout(glowTimer);
  el.end.hidden = true;
  el.flash.classList.remove('on');
  draw();
  say('');
  playing = true;
  Sound.wake();
  el.title.classList.add('leaving');
  setTimeout(() => { el.title.hidden = true; }, 520);
  if (!s.ms) later(() => showNote('intro'), 700);
}

// ---------- the phone itself: shaking and turning it over

let motionSeen = false;
let lastShake = 0;
let upsideDown = false;

function onMotion(e) {
  let force = 0;
  const a = e.acceleration;
  if (a && a.x != null) force = Math.hypot(a.x, a.y, a.z);
  else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
    const g = e.accelerationIncludingGravity;
    force = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81);
  } else return;
  motionSeen = true;
  const now = Date.now();
  if (force > 13 && now - lastShake > 900) { lastShake = now; doAct('shake'); }
}
let tilt0 = null;
function setParallax(px, py) {
  el.scene.style.setProperty('--px', px.toFixed(2));
  el.scene.style.setProperty('--py', py.toFixed(2));
}
function onTilt(e) {
  if (e.beta == null) return;
  // the paper layers slide a little, as if you look into a box
  if (e.gamma != null && e.beta > 0 && e.beta < 150) {
    if (!tilt0) tilt0 = { b: e.beta, g: e.gamma };
    tilt0.b += (e.beta - tilt0.b) * 0.01; // drift back to however the phone is being held
    tilt0.g += (e.gamma - tilt0.g) * 0.01;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    setParallax(clamp((e.gamma - tilt0.g) / 14) * -9, clamp((e.beta - tilt0.b) / 14) * -6);
  }
  motionSeen = true;
  const flipped = e.beta < -50 && e.beta > -150;
  if (flipped && !upsideDown) { upsideDown = true; doAct('flip'); }
  else if (!flipped && e.beta > 20) upsideDown = false;
}
// iPhones only hand out movement after a tap and a yes from the player.
function wireMotion() {
  const ask = (E) => (E && typeof E.requestPermission === 'function' ? E.requestPermission().catch(() => 'denied') : Promise.resolve('granted'));
  Promise.all([ask(window.DeviceMotionEvent), ask(window.DeviceOrientationEvent)]).then(() => {
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', onTilt);
  });
}

// ---------- hints (the only place an advert may ever appear)

function openHint() {
  if (!playing) return;
  const h = hintFor(s);
  const seen = s.hintSeen[h.stage] || 0;
  el.hintNudge.textContent = h.nudge;
  el.hintAnswer.textContent = h.answer;
  el.hintNudge.hidden = seen < 1;
  el.hintAnswer.hidden = seen < 2;
  el.hintMore.hidden = seen >= 2;
  el.hintMore.textContent = seen === 0 ? 'Give me a nudge' : 'Show the answer';
  el.hint.hidden = false;
}
async function moreHint() {
  const h = hintFor(s);
  const seen = s.hintSeen[h.stage] || 0;
  if (seen >= 2) return;
  el.hintMore.disabled = true;
  const watched = await Ads.rewarded('hint');
  el.hintMore.disabled = false;
  if (!watched) return;
  s.hintSeen[h.stage] = seen + 1;
  s.hints++;
  save();
  openHint();
}

// ---------- wiring

// Swipe sideways to turn, swipe down to step back. The picture follows your finger.
let drag = null;
let swallowClick = false;
el.stage.addEventListener('pointerdown', (e) => {
  if (!playing || e.target.closest('button')) return;
  drag = { x: e.clientX, y: e.clientY, moved: false };
});
el.stage.addEventListener('pointermove', (e) => {
  if (!drag) {
    // with a mouse, the diorama follows the pointer
    if (e.pointerType === 'mouse' && !motionSeen) {
      const box = el.stage.getBoundingClientRect();
      setParallax(((e.clientX - box.left) / box.width - 0.5) * -14, ((e.clientY - box.top) / box.height - 0.5) * -9);
    }
    return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 14) return;
  drag.moved = true;
  const svg = el.scene.firstElementChild;
  if (!svg) return;
  el.scene.classList.add('dragging');
  svg.style.transform = s.view ? `translateY(${Math.max(0, dy) * 0.5}px)` : `translateX(${dx * 0.55}px)`;
});
const endDrag = (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, moved = drag.moved;
  drag = null;
  if (!moved) return;
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 60);
  el.scene.classList.remove('dragging');
  const svg = el.scene.firstElementChild;
  if (!s.view && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) { doAct(dx < 0 ? 'right' : 'left'); return; }
  if (s.view && dy > 70 && dy > Math.abs(dx)) { doAct('back'); return; }
  if (svg) { el.scene.classList.add('snap'); svg.style.transform = ''; setTimeout(() => el.scene.classList.remove('snap'), 220); }
};
el.stage.addEventListener('pointerup', endDrag);
el.stage.addEventListener('pointercancel', endDrag);

el.scene.addEventListener('click', (e) => {
  if (swallowClick) return;
  lastTap = { x: e.clientX, y: e.clientY };
  const t = e.target.closest('[data-act]');
  const box = el.stage.getBoundingClientRect();
  const ring = document.createElement('span');
  ring.className = 'tap';
  ring.style.left = e.clientX - box.left + 'px';
  ring.style.top = e.clientY - box.top + 'px';
  el.stage.appendChild(ring);
  setTimeout(() => ring.remove(), 420);
  if (!t) { if (s.sel) doAct('inv:' + s.sel); return; }
  const id = t.dataset.act;
  // No movement sensor (a laptop, or the player said no): a second tap turns the bottle over.
  if (id === 'bottle' && !motionSeen && !s.sel && !s.f.pageOut && ++bottleTaps >= 2) { doAct('flip'); return; }
  doAct(id);
});
el.prev.addEventListener('click', () => doAct('left'));
el.next.addEventListener('click', () => doAct('right'));
el.back.addEventListener('click', () => doAct('back'));
el.inv.addEventListener('click', (e) => {
  const b = e.target.closest('[data-item]');
  if (!b) return;
  // The jar is never used on anything: touching it gives it a shake.
  doAct(b.dataset.item === 'jar' ? 'shake' : 'inv:' + b.dataset.item);
});

$('notesBtn').addEventListener('click', openNotes);
$('notesClose').addEventListener('click', () => { el.notes.hidden = true; });
el.notes.addEventListener('click', (e) => { if (e.target === el.notes) el.notes.hidden = true; });
el.note.addEventListener('click', () => { el.note.hidden = true; });
$('hintBtn').addEventListener('click', openHint);
$('hintClose').addEventListener('click', () => { el.hint.hidden = true; });
el.hintMore.addEventListener('click', moreHint);
el.hint.addEventListener('click', (e) => { if (e.target === el.hint) el.hint.hidden = true; });

const soundBtn = $('soundBtn');
soundBtn.addEventListener('click', () => {
  Sound.setMuted(!Sound.muted);
  soundBtn.textContent = Sound.muted ? 'Sound off' : 'Sound on';
  soundBtn.setAttribute('aria-pressed', String(!Sound.muted));
  if (!Sound.muted) Sound.wake();
});

$('beginBtn').addEventListener('click', () => { wireMotion(); start(s.won); });
$('resetBtn').addEventListener('click', () => { wireMotion(); start(true); });
$('againBtn').addEventListener('click', () => start(true));

document.addEventListener('keydown', (e) => {
  if (!playing || !el.hint.hidden || !el.note.hidden || !el.notes.hidden) return;
  if (e.key === 'ArrowLeft') doAct('left');
  if (e.key === 'ArrowRight') doAct('right');
  if (e.key === 'ArrowDown' || e.key === 'Escape') doAct('back');
});

setInterval(() => {
  if (playing && !document.hidden) {
    s.ms += 1000;
    if (s.ms % 5000 === 0) save();
  }
}, 1000);

// ---------- first paint

// fetch every picture of the room now, so nothing pops in later
for (const file of pictureFiles()) { const im = new Image(); im.src = file; }

const style = document.createElement('style');
style.textContent = blinkCSS();
document.head.appendChild(style);

const hasProgress = s.ms > 0 && !s.won;
if (s.won) s = newState();
$('beginBtn').textContent = hasProgress ? 'Continue' : 'Begin';
$('resetBtn').hidden = !hasProgress;
draw();
