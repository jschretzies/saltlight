// Every drawing in the game, as SVG. The look is a paper diorama: cut shapes
// in a few inks, each layer casting a soft shadow on the one behind, with real
// light on top (lamp glow, night, moonlight, the glow of sea sparkle).
import { BUOYS, LOCK_ORDER, PINS, DRAWN_CLOCK, GLOW, SYMBOLS, DIRS, SIGHTS } from './logic.js';
import { M3 } from './art3d.js';

// ---------- inks

const K = {
  wall: '#3B6672', wall2: '#366069', side: '#2C535E', ceil: '#15323B',
  dado: '#284C56', dado2: '#22434D', floor: '#1F414B', floor2: '#1A3943',
  wood: '#12303A', wood2: '#1D4250', wood3: '#2B5663', deep: '#0A1D24', ink: '#12303A',
  paper: '#EDE6D3', paper2: '#D8D0B9', paper3: '#E6DEC8',
  brass: '#E6B23A', brass2: '#B98A2A', brass3: '#F5D98A',
  red: '#A6342B', red2: '#86271F', red3: '#C4503F',
  fog: '#C9D3C4', glass: '#8DB3AC', glass2: '#B9D6CD',
  sky: '#1D4250', sea: '#2F5560', moon: '#C9D3C4', flame: '#F0BE48', phos: '#9FF0C8',
};

// ---------- small drawing kit

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (v) => Math.round(v * 10) / 10;
const col = (c) => K[c] || c;

// Polygon whose corners are nudged a little, so nothing is ruler-straight.
function P(pts, fill, extra = '', j = 1.2) {
  const r = rng(pts.length * 7919 + Math.round(pts[0][0] * 31 + pts[0][1] * 17 + pts[1][0] * 13 + pts[1][1] * 7));
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + n(x + (r() - 0.5) * 2 * j) + ' ' + n(y + (r() - 0.5) * 2 * j)).join(' ') + 'Z';
  return `<path d="${d}" fill="${col(fill)}" ${extra}/>`;
}
const R = (x, y, w, h, fill, extra, j) => P([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, extra, j);
const B = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col(fill)}" ${extra}/>`;
const C = (cx, cy, r, fill, extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${col(fill)}" ${extra}/>`;
const O = (cx, cy, r, stroke, w, extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="none" stroke="${col(stroke)}" stroke-width="${w}" ${extra}/>`;
const L = (x1, y1, x2, y2, stroke, w, extra = '') =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${col(stroke)}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
const S = (d, stroke, w, extra = '') =>
  `<path d="${d}" stroke="${col(stroke)}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const F = (d, fill, extra = '') => `<path d="${d}" fill="${col(fill)}" ${extra}/>`;
const T = (x, y, text, size, fill, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" class="lbl" fill="${col(fill)}" ${extra}>${text}</text>`;
// A line in Grandad's hand.
const H = (x, y, text, size = 16, anchor = 'start') => `<text class="hand" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${K.ink}">${text}</text>`;
const hot = (id, x, y, w, h) => `<rect class="hot" data-act="${id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;

const handAt = (cx, cy, steps, len, stroke, w) => {
  const a = (steps * 30 * Math.PI) / 180;
  return L(cx, cy, cx + len * Math.sin(a), cy - len * Math.cos(a), stroke, w);
};

function clockFace(cx, cy, r, h, m, o = {}) {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180, sx = Math.sin(a), sy = -Math.cos(a);
    if (i === 0) out += P([[cx, cy - r * 0.98], [cx + r * 0.07, cy - r * 0.86], [cx, cy - r * 0.74], [cx - r * 0.07, cy - r * 0.86]], 'red', '', 0.3);
    else out += L(cx + sx * r * 0.8, cy + sy * r * 0.8, cx + sx * r * 0.93, cy + sy * r * 0.93, 'ink', i % 3 === 0 ? r * 0.05 : r * 0.028);
  }
  if (h != null) out += handAt(cx, cy, h, r * 0.5, 'ink', r * 0.085);
  if (m != null) out += handAt(cx, cy, m, r * 0.78, 'ink', r * 0.045);
  if (!o.noHub) out += C(cx, cy, r * 0.06, 'ink');
  return out;
}

function anchor(cx, cy, k, stroke, rot = 0) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k})">` +
    S('M0 -9 V11 M-5 -4 H5 M-9 3 Q-8 11 0 11 Q8 11 9 3', stroke, 2.4) + O(0, -12, 3, stroke, 2.2) + '</g>';
}

// The six signs used by the great light and its pedestal.
function sign(name, cx, cy, k, ink) {
  const g = (inner) => `<g transform="translate(${cx} ${cy}) scale(${k})">${inner}</g>`;
  switch (name) {
    case 'anchor': return anchor(cx, cy, k * 0.95, ink);
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? 5.2 : 13; pts.push(`${n(Math.cos(a) * rr)},${n(Math.sin(a) * rr)}`); }
      return g(`<polygon points="${pts.join(' ')}" fill="${col(ink)}"/>`);
    }
    case 'wave': return g(S('M-13 -4 q6.5 -9 13 0 t13 0 M-13 6 q6.5 -9 13 0 t13 0', ink, 2.8));
    case 'moon': return g(F('M5 -12 A13 13 0 1 0 5 12 A15 15 0 0 1 5 -12Z', ink));
    case 'fish': return g(F('M-13 0 Q-3 -10 7 0 Q-3 10 -13 0Z M6 0 L14 -7 V7Z', ink) + C(-7, -1.5, 1.4, 'paper'));
    case 'wheel': return g(O(0, 0, 9, ink, 2.6) + S('M0 -14 V14 M-14 0 H14 M-10 -10 L10 10 M-10 10 L10 -10', ink, 2));
  }
  return '';
}

function shape(kind, cx, cy, r, fill, extra = '') {
  if (kind === 'circle') return C(cx, cy, r, fill, extra);
  if (kind === 'square') return R(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, fill, extra, 0.6);
  return P([[cx, cy - r * 1.1], [cx + r * 1.1, cy + r * 0.85], [cx - r * 1.1, cy + r * 0.85]], fill, extra, 0.6);
}
const SHAPE_INK = { circle: '#E6B23A', triangle: '#C4503F', square: '#EDE6D3' };

function flame(cx, base, h, cls = 'flame') {
  const w = h * 0.36;
  return `<path class="${cls}" d="M${cx} ${base - h} q${w} ${n(h * 0.5)} 0 ${h} q${-w} ${n(-h * 0.5)} 0 ${-h}Z" fill="${K.flame}"/>` +
    `<path class="${cls}" d="M${cx} ${n(base - h * 0.55)} q${n(w * 0.45)} ${n(h * 0.28)} 0 ${n(h * 0.55)} q${n(-w * 0.45)} ${n(-h * 0.28)} 0 ${n(-h * 0.55)}Z" fill="${K.paper}"/>`;
}

// ---------- the keeper's room: the shell every wall shares

function glowMark(s, fx) {
  if (s.area !== 'room' || s.lit || !s.glow || s.view) return '';
  const g = GLOW.find((m) => m.wall === s.wall);
  const [cx, cy] = M3['wall' + s.wall].anchors.mark;
  const rot = { U: 0, R: 90, D: 180, L: 270 }[g.dir];
  let o = `<g class="glowmark ${fx === 'glow' ? 'fx-glowin' : ''}">`;
  o += `<ellipse cx="${cx + 18}" cy="${cy}" rx="62" ry="34" fill="url(#phos)"/>`;
  o += `<g transform="translate(${cx} ${cy}) rotate(${rot})">` + S('M0 14 V-12 M-9 -3 L0 -13 L9 -3', 'phos', 4.5) + '</g>';
  for (let i = 0; i < g.dots; i++) o += C(cx + 26 + i * 12, cy, 3.6, 'phos');
  return o + '</g>';
}

// ---------- wall 1: the window

function seaView(x, y, w, h, horizon) {
  let o = B(x, y, w, h, 'sky');
  o += C(x + w * 0.78, y + h * 0.24, 20, 'moon') + C(x + w * 0.78 + 7, y + h * 0.24 - 5, 15, '#DDE5D8');
  for (const [sx, sy] of [[0.1, 0.14], [0.28, 0.3], [0.44, 0.1], [0.58, 0.36], [0.92, 0.5], [0.2, 0.46]]) o += C(x + w * sx, y + h * sy, 1.1, 'moon', 'class="twinkle"');
  o += P([[x, y + h * 0.36], [x + w * 0.3, y + h * 0.3], [x + w * 0.55, y + h * 0.38], [x + w * 0.42, y + h * 0.45], [x, y + h * 0.48]], 'ink', 'opacity="0.8"', 0.8);
  o += B(x, horizon, w, y + h - horizon, 'sea');
  const r = rng(77);
  for (let i = 0; i < 12; i++) {
    const wx = x + w * (0.56 + r() * 0.36), wy = horizon + 6 + i * ((y + h - horizon - 10) / 12), ww = 16 + r() * 44;
    o += R(wx - ww / 2, wy, ww, 3, 'moon', `class="shimmer" style="animation-delay:${n(-r() * 4)}s"`, 0.6);
  }
  for (let i = 0; i < 5; i++) o += R(x + 10 + r() * w * 0.4, horizon + 12 + r() * (y + h - horizon - 24), 14 + r() * 24, 2.6, 'moon', 'opacity="0.55"', 0.6);
  return o;
}

// ---------- close-ups in the room

// The last entry in the log.
const LOG = [
  'Wind NW and rising.', 'A schooner is on the', 'Teeth. I hear her bell.', 'The great lamp is dry', 'and there is no time.', 'I am taking the boat.',
  'The child sleeps. I have', 'locked the door. The', 'sea won&#39;t get us both.', 'If you wake: you know', 'how I hide things.', 'Light the lamp.   A.',
];

// ---------- the lantern room

const beamDir = (s) => DIRS[s.beam];


// What the beam finds out there, one sight per direction.
function sight(dir) {
  const name = SIGHTS[dir];
  const board = (x, y) => C(x, y, 19, 'paper') + O(x, y, 19, 'ink', 2) + sign(name, x, y, 0.9, 'ink');
  switch (dir) {
    case 'N': // a wreck, mast still standing
      return P([[120, 300], [286, 286], [262, 322], [144, 326]], '#0A1D24') + L(200, 300, 222, 196, '#0A1D24', 6) + L(180, 232, 250, 220, '#0A1D24', 4) + S('M150 300 q20 -30 60 -34', '#0A1D24', 3) + board(238, 172);
    case 'E': // a stack of rock with a painted mark
      return P([[140, 326], [158, 250], [190, 214], [232, 222], [258, 268], [270, 326]], '#0A1D24') + P([[176, 250], [196, 226], [222, 232], [214, 262]], '#17363F') + board(206, 276);
    case 'S': // the pier beacon
      return B(120, 300, 170, 9, '#0A1D24') + B(136, 306, 7, 30, '#0A1D24') + B(266, 306, 7, 30, '#0A1D24') + B(200, 306, 7, 30, '#0A1D24') + B(214, 196, 8, 106, '#0A1D24') + P([[204, 196], [232, 196], [226, 178], [210, 178]], '#0A1D24') + board(218, 236);
    case 'W': // a bell buoy
      return P([[160, 318], [260, 318], [240, 276], [180, 276]], '#0A1D24') + L(184, 276, 204, 206, '#0A1D24', 5) + L(236, 276, 216, 206, '#0A1D24', 5) + L(196, 232, 224, 232, '#0A1D24', 4) + C(210, 200, 9, '#0A1D24') + board(210, 256);
  }
  return '';
}

// ---------- the room as rendered pictures
//
// The four walls are built in 3D (tools/blender/build.py) and rendered with
// real light. Each wall is one picture as the game starts, plus a patch for
// every other state of a part (cabinet open, chest open, ...), once with the
// lamp lit and once dark. What still changes too often to render (clock hands,
// slider knobs, the view through the window) is drawn on top.

const pic = (file, rect = [0, 0, 400, 500], cls = '') =>
  `<image href="art3d/${file}.webp" x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}" preserveAspectRatio="none" ${cls ? `class="${cls}"` : ''}/>`;

// Small movements keep their picture; anything bigger lets the new patch fade in.
const SMALL = ['light', 'dark', 'toplight', 'glow', 'hand', 'dial', 'slider', 'ring', 'press', 'play', 'beam', 'flip', 'shake'];

function rendered(view, states, s, fx, lit = s.lit) {
  const m = M3[view];
  const fresh = fx && !SMALL.includes(fx) ? 'fx-patch' : '';
  const layer = (tone) => {
    let o = pic(`${view}_${tone}`);
    for (const [name, st] of Object.entries(states)) {
      const r = m.regions[name];
      if (st !== r.states[0]) o += pic(`${view}_${name}_${st}_${tone}`, r.rect, fresh);
    }
    return o;
  };
  if (!m.tones.includes('dark')) return layer('lit');
  const on = fx === 'light' || fx === 'toplight';
  if (lit) return layer('lit') + (on ? `<g class="fx-nightout">${layer('dark')}</g>` : '');
  return (fx === 'dark' ? layer('lit') : '') + `<g class="${fx === 'dark' ? 'fx-nightin' : ''}">${layer('dark')}</g>`;
}
const hot3 = (view, name, act = name) => hot(act, ...M3[view].hots[name]);
const dim = (s) => (s.lit ? 1 : 0.28);

function r0(s, fx) {
  const f = s.f, m = M3.wall0, A = m.anchors;
  let a = rendered('wall0', { door: f.doorOpen ? 'open' : 'closed', panel: f.panelOpen ? (f.hkeyTaken ? 'empty' : 'key') : 'closed' }, s, fx);
  if (!f.panelOpen) {
    let k = anchor(A.emblem[0], A.emblem[1], 0.5, '#2A1E12', 180);
    s.sliders.forEach((v, i) => {
      const x = A.slot_a[0] + ((A.slot_b[0] - A.slot_a[0]) * i) / 4;
      const y = A.slot_a[1] + ((A.slot_b[1] - A.slot_a[1]) * (v - 1)) / 2;
      k += C(x, y, 4.2, '#1B1410') + C(x - 1.2, y - 1.2, 1.3, '#8A6A3A');
    });
    a += `<g opacity="${dim(s)}">${k}</g>`;
  }
  let h = '';
  if (!f.doorOpen) h += hot3('wall0', 'door');
  h += hot3('wall0', 'coat') + hot3('wall0', 'boots') + hot3('wall0', 'ring') + hot3('wall0', 'panel');
  return { art: a, hots: h, glow: [200, 620, 520], noNight: true, soft: true };
}

function r1(s, fx) {
  const f = s.f, m = M3.wall1, A = m.anchors;
  const a = rendered('wall1', { jar: f.jarTaken ? 'gone' : 'there', chest: f.chestOpen ? (f.lensTaken ? 'empty' : 'lens') : 'closed' }, s, fx);
  // the glass: four panes between the bars of the rendered frame
  const gx = A.glass_a[0], gy = A.glass_a[1], gw = A.glass_b[0] - gx, gh = A.glass_b[1] - gy;
  const bw = gw * 0.0324, bh = gh * 0.0474;
  const pane = (x, y, w, h) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`;
  let over = `<clipPath id="panes">${pane(gx, gy, gw / 2 - bw / 2, gh / 2 - bh / 2)}${pane(gx + gw / 2 + bw / 2, gy, gw / 2 - bw / 2, gh / 2 - bh / 2)}` +
    `${pane(gx, gy + gh / 2 + bh / 2, gw / 2 - bw / 2, gh / 2 - bh / 2)}${pane(gx + gw / 2 + bw / 2, gy + gh / 2 + bh / 2, gw / 2 - bw / 2, gh / 2 - bh / 2)}</clipPath>`;
  // everything inside is drawn on the old 256 x 180 window and stretched to fit
  let view = '';
  if (s.lit) {
    // a lit window is a mirror: the room behind you, faint and backwards
    view += B(72, 84, 256, 180, '#0C242C') + `<g opacity="0.62">` + R(96, 176, 74, 88, '#1E4450') + R(220, 100, 52, 120, '#1E4450') + P([[220, 100], [246, 86], [272, 100]], '#1E4450') +
      C(246, 132, 19, '#D5CEB9') + clockFace(246, 132, 19, 12 - s.clock.h, (12 - s.clock.m) % 12) + '</g>' + C(142, 222, 30, 'url(#lampglow)') + flame(142, 232, 16, 'flame');
  } else {
    view += seaView(72, 84, 256, 180, 196);
    [[142, 206], [186, 200], [222, 210]].forEach(([x, y], i) => { view += B(x - 1, y, 2, 6, 'ink') + C(x, y - 2, 2.4, 'moon', `class="twinkle t${i}"`); });
    const rr = rng(5);
    for (let i = 0; i < 14; i++) { const x = 76 + rr() * 250, y = 84 + rr() * 150; view += L(x, y, x - 4, y + 13, 'moon', 0.9, `class="rain" style="animation-delay:${n(-rr() * 1.4)}s"`); }
  }
  if (f.topLit) view += `<path class="sweepband" d="M-60 84 L10 84 L-40 264 L-110 264Z" fill="#FFE08A"/>`;
  over += `<g clip-path="url(#panes)"><g transform="translate(${n(gx)} ${n(gy)}) scale(${n(gw / 256 * 100) / 100} ${n(gh / 180 * 100) / 100}) translate(-72 -84)">${view}</g></g>`;
  if (!f.jarTaken && !s.lit) {
    const j = m.hots.jar;
    over += C(j[0] + j[2] / 2 - 3, j[1] + j[3] / 2 + 6, 1.4, 'phos', 'class="twinkle"') + C(j[0] + j[2] / 2 + 4, j[1] + j[3] / 2 + 12, 1.1, 'phos', 'class="twinkle t1"');
  }
  let h = hot('window', n(gx), n(gy), n(gw), n(gh));
  if (!f.jarTaken) h += hot3('wall1', 'jar');
  h += hot3('wall1', 'rope') + hot3('wall1', 'scope') + hot3('wall1', 'chest');
  return { art: a, over, hots: h, glow: [470, 300, 430], noNight: true, soft: true };
}

function r2(s, fx) {
  const f = s.f, A = M3.wall2.anchors;
  const a = rendered('wall2', { hatch: f.hatchOpen ? 'open' : 'closed' }, s, fx);
  const h = hot3('wall2', 'board') + hot3('wall2', 'desk') + hot3('wall2', 'ladder');
  return { art: a, hots: h, glow: [A.flame[0], A.flame[1], 150], noNight: true, soft: true };
}

function r3(s, fx) {
  const f = s.f, A = M3.wall3.anchors;
  const cab = !f.lockOpen ? 'closed' : !f.crankTaken && !f.oilTaken ? 'both' : !f.crankTaken ? 'crank' : !f.oilTaken ? 'oil' : 'empty';
  let a = rendered('wall3', {
    case: f.clockSolved ? (f.drumTaken ? 'empty' : 'drum') : 'closed',
    box: f.crankFitted ? 'crank' : 'plain',
    bottle: !f.pageOut ? 'paper' : !f.pageTaken ? 'out' : 'empty',
    cabinet: cab,
  }, s, fx);
  const [cx, cy] = A.clock_c, r = A.clock_r[0] - A.clock_c[0];
  a += `<g opacity="${s.lit ? 1 : 0.4}">` + handAt(cx, cy, s.clock.h, r * 0.5, '#1B1410', r * 0.11) + handAt(cx, cy, s.clock.m, r * 0.78, '#1B1410', r * 0.06) + '</g>';
  let h = hot3('wall3', 'clock') + hot3('wall3', 'cabinet') + hot3('wall3', 'books') + hot3('wall3', 'box') + hot3('wall3', 'bottle');
  if (f.lockOpen && !f.crankTaken) h += hot3('wall3', 'crank');
  if (f.lockOpen && !f.oilTaken) h += hot3('wall3', 'oil');
  return { art: a, hots: h, glow: [-70, 300, 430], noNight: true, soft: true };
}

// ---------- close-ups, from the same 3D room with the camera nearer

const DARKINK = '#1B1410';
// Four panes between the bars of a rendered window.
function panes(id, gx, gy, gw, gh) {
  const bw = gw * 0.0324, bh = gh * 0.0474;
  const r = (x, y, w, h) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`;
  return `<clipPath id="${id}">${r(gx, gy, gw / 2 - bw / 2, gh / 2 - bh / 2)}${r(gx + gw / 2 + bw / 2, gy, gw / 2 - bw / 2, gh / 2 - bh / 2)}` +
    `${r(gx, gy + gh / 2 + bh / 2, gw / 2 - bw / 2, gh / 2 - bh / 2)}${r(gx + gw / 2 + bw / 2, gy + gh / 2 + bh / 2, gw / 2 - bw / 2, gh / 2 - bh / 2)}</clipPath>`;
}

function kDesk(s, fx) {
  const f = s.f, A = M3.desk.anchors;
  const a = rendered('desk', { drawer: f.drawerOpen ? (f.matchesTaken ? 'empty' : 'matches') : 'closed' }, s, fx);
  let h = hot3('desk', 'lamp') + hot3('desk', 'book') + hot3('desk', 'drawer');
  if (f.drawerOpen && !f.matchesTaken) h += hot3('desk', 'matches');
  return { art: a, hots: h, glow: [A.flame[0], A.flame[1], 180], noNight: true, soft: true };
}

function kBook(s, fx) {
  const R = M3.book.rects, Lp = R.pageL, Rp = R.pageR;
  let a = rendered('book', { page: s.f.pageUsed ? 'full' : 'half' }, s, fx, true);
  // Grandad's hand, written on the rendered page
  const lh = Lp[3] / 13.4;
  LOG.forEach((line, i) => { a += H(Lp[0] + Lp[2] * 0.07, Lp[1] + lh * (i + 1.35), line, n(lh * 0.57)); });
  // his sketch: drawn on a 166 x 350 page and stretched onto the rendered one
  const sketch = `<rect x="216" y="150" width="146" height="166" fill="none" stroke="${K.ink}" stroke-width="2.2"/>` + L(216, 233, 362, 233, 'ink', 1.5) +
    O(289, 233, 60, 'ink', 2.4) + clockFace(289, 233, 60, DRAWN_CLOCK.h, DRAWN_CLOCK.m, { noHub: true }) + C(289, 233, 4, 'ink') +
    S('M232 300 q7 -12 0 -22 q-7 10 0 22Z M222 306 h20', 'ink', 1.8) + S('M226 276 l-5 -5 M232 272 v-7 M238 276 l5 -5', 'ink', 1.4) +
    H(289, 356, 'The clock, as I see it', 16, 'middle') + H(289, 378, 'from my chair at night.', 16, 'middle');
  a += `<g transform="translate(${Rp[0]} ${Rp[1]}) scale(${n(Rp[2] / 166 * 1000) / 1000} ${n(Rp[3] / 350 * 1000) / 1000}) translate(-206 -66)">` +
    `<clipPath id="bkL"><rect x="206" y="66" width="83" height="350"/></clipPath><clipPath id="bkR"><rect x="289" y="66" width="83" height="350"/></clipPath>` +
    `<g clip-path="url(#bkL)">${sketch}</g>` + (s.f.pageUsed ? `<g clip-path="url(#bkR)" class="${fx === 'page' ? 'fx-patch' : ''}">${sketch}</g>` : '') + '</g>';
  return { art: a, hots: hot('page', ...Rp.map(Math.round)), glow: [420, 60, 380], noNight: true, soft: true };
}

function kMirror(s, fx) {
  const A = M3.mirror.anchors;
  const gx = A.glass_a[0], gy = A.glass_a[1], gw = A.glass_b[0] - gx, gh = A.glass_b[1] - gy;
  const a = rendered('mirror', {}, s, fx, true);
  // the room behind you, backwards: drawn for a 400 x 500 window and stretched onto the glass
  const view = B(-5, -5, 410, 510, '#0C242C') + `<g opacity="0.72">` + B(0, 0, 400, 500, '#16353E') + R(214, 20, 176, 232, '#1E4450') +
    C(302, 128, 84, '#2B5663') + C(302, 128, 76, '#D5CEB9') + clockFace(302, 128, 76, 12 - s.clock.h, (12 - s.clock.m) % 12) + C(302, 128, 5, 'brass2') +
    R(222, 300, 150, 200, '#1E4450') + R(232, 312, 60, 90, '#17363F') + R(302, 312, 60, 90, '#17363F') + R(20, 150, 150, 9, '#1E4450') + R(60, 112, 62, 38, '#7E3229') + '</g>' +
    C(96, 372, 92, 'url(#lampglow)') + R(74, 400, 44, 14, 'brass2') + C(96, 392, 16, 'brass') + flame(96, 372, 40);
  const over = panes('mpanes', gx, gy, gw, gh) + `<g clip-path="url(#mpanes)"><g transform="translate(${n(gx)} ${n(gy)}) scale(${n(gw / 400 * 1000) / 1000} ${n(gh / 500 * 1000) / 1000})">${view}</g></g>`;
  return { art: a, over, hots: hot('glass', 0, 0, 400, 500), noNight: true, noGlow: true };
}

function kChest(s, fx, q) {
  const f = s.f, A = M3.chest.anchors;
  let a = rendered('chest', { chest: f.chestOpen ? (f.lensTaken ? 'empty' : 'lens') : 'closed' }, s, fx, true);
  let h = '';
  if (!f.chestOpen) {
    const rot = { U: 0, R: 90, D: 180, L: 270 };
    let k = '';
    for (const d of 'UDLR') {
      const [x, y] = A['btn' + d];
      k += `<g class="${fx === 'press' && q.at === d ? 'fx-press' : ''}" style="transform-origin:${x}px ${y}px"><g transform="translate(${x} ${y}) rotate(${rot[d]})">` + S('M0 7 V-6 M-5 -1 L0 -7 L5 -1', 'paper', 2.8) + '</g></g>';
      h += hot('arrow:' + d, Math.round(x - 21), Math.round(y - 18), 42, 36);
    }
    for (let i = 0; i < 4; i++) k += i < s.seq.length ? C(A.pips[0] - 15 + i * 10, A.pips[1], 3, 'paper') : O(A.pips[0] - 15 + i * 10, A.pips[1], 2.6, DARKINK, 1.2);
    a += `<g class="${fx === 'shake' ? 'fx-shake' : ''}" style="transform-origin:${A.pips[0]}px ${A.pips[1]}px">${k}</g>`;
  } else if (!f.lensTaken) h += hot3('chest', 'lens');
  return { art: a, hots: h, glow: [470, 120, 400], noNight: true, soft: true };
}

function kClock(s, fx, q) {
  const f = s.f, A = M3.clock.anchors;
  const [cx, cy] = A.clock_c, r = A.clock_r[0] - cx;
  let a = rendered('clock', { case: f.clockSolved ? (f.drumTaken ? 'empty' : 'drum') : 'closed' }, s, fx, true);
  const hand = (which, steps, len, w) => `<g class="${fx === 'hand' && q.at === which ? 'fx-hand' : ''}" style="transform-origin:${cx}px ${cy}px">${handAt(cx, cy, steps, len, DARKINK, w)}</g>`;
  a += hand('h', s.clock.h, r * 0.5, r * 0.11) + hand('m', s.clock.m, r * 0.78, r * 0.06) + C(cx, cy, r * 0.07, 'brass2');
  // which knob turns which hand: a short mark and a long one
  a += L(A.knobH[0], A.knobH[1] - 3, A.knobH[0], A.knobH[1] + 3, DARKINK, 4) + L(A.knobM[0], A.knobM[1] - 7, A.knobM[0], A.knobM[1] + 7, DARKINK, 2.2);
  let h = hot3('clock', 'face');
  if (!f.clockSolved) h += hot3('clock', 'knobH') + hot3('clock', 'knobM');
  if (f.clockSolved && !f.drumTaken) h += hot3('clock', 'drum');
  return { art: a, hots: h, glow: [-80, 200, 420], noNight: true, soft: true };
}

function kLock(s, fx, q) {
  const A = M3.lock.anchors;
  let a = rendered('lock', {}, s, fx, true);
  let h = '';
  LOCK_ORDER.forEach((sh, i) => { a += shape(sh, A['shape' + i][0], A['shape' + i][1], 12, SHAPE_INK[sh]); });
  s.dials.forEach((d, i) => {
    const [x, y] = A['dial' + i];
    a += `<clipPath id="dw${i}"><rect x="${x - 29}" y="${y - 44}" width="58" height="88"/></clipPath><g clip-path="url(#dw${i})"><text x="${x}" y="${y + 19}" text-anchor="middle" class="digit ${fx === 'dial' && q.at === i ? 'fx-roll' : ''}" style="font-size:54px">${d}</text></g>`;
    if (!s.f.lockOpen) h += hot('dial:' + i, Math.round(x - 38), Math.round(y - 52), 76, 104);
  });
  return { art: a, hots: h, glow: [-80, 200, 420], noNight: true, soft: true };
}

function kBottle(s, fx) {
  const f = s.f;
  const a = `<g class="${fx === 'flip' ? 'fx-flip' : ''}" style="transform-origin:200px 250px">` + rendered('bottle', { bottle: !f.pageOut ? 'paper' : !f.pageTaken ? 'out' : 'empty' }, s, fx, true) + '</g>';
  let h = hot3('bottle', 'bottle');
  if (f.pageOut && !f.pageTaken) h += hot3('bottle', 'page');
  return { art: a, hots: h, glow: [-80, 200, 420], noNight: true, soft: true };
}

function kBox(s, fx) {
  const f = s.f, A = M3.box.anchors;
  const st = f.crankFitted && f.drumFitted ? 'both' : f.crankFitted ? 'crank' : f.drumFitted ? 'drum' : 'plain';
  let a = rendered('box', { box: st }, s, fx, true);
  if (st === 'both') {
    // the pins rise out of the box as the drum turns
    const base = A.pin_a[1], full = A.pin_a[1] - A.pin_h[1];
    let pins = '';
    PINS.forEach((v, i) => {
      const x = A.pin_a[0] + ((A.pin_e[0] - A.pin_a[0]) * i) / 4, rise = [0, 0.3, 0.64, 1][v] * full;
      pins += `<g class="pin ${fx === 'play' ? 'play' : ''}" style="--rise:${n(rise)}px;--d:${n(i * 0.6)}s">` + B(x - 2.5, base, 5, full + 10, '#D9A441') + C(x, base, 8, 'paper') + C(x - 2.2, base - 2.2, 2.4, '#FFFFFF', 'opacity="0.7"') + '</g>';
    });
    a += `<clipPath id="pinclip"><rect x="0" y="0" width="400" height="${n(base + 5)}"/></clipPath><g clip-path="url(#pinclip)">${pins}</g>`;
  }
  let h = hot3('box', 'body');
  if (f.crankFitted) h += hot3('box', 'crank');
  return { art: a, hots: h, glow: [-80, 200, 420], noNight: true, soft: true };
}

function kPanel(s, fx, q) {
  const f = s.f, A = M3.panel.anchors;
  let a = rendered('panel', { panel: f.panelOpen ? (f.hkeyTaken ? 'empty' : 'key') : 'closed' }, s, fx, true);
  let h = '';
  if (!f.panelOpen) {
    const dx = (A.slot_b[0] - A.slot_a[0]) / 4, dy = (A.slot_b[1] - A.slot_a[1]) / 2;
    // the anchor is the wrong way up: the whole panel was mounted upside down
    a += anchor(A.emblem[0], A.emblem[1], 1.5, '#2A1E12', 180);
    s.sliders.forEach((v, i) => {
      const x = A.slot_a[0] + dx * i, y = A.slot_a[1] + dy * (v - 1);
      for (let lv = 0; lv < 3; lv++) a += L(x - 17, A.slot_a[1] + dy * lv, x - 10, A.slot_a[1] + dy * lv, '#2A1E12', 2.4) + L(x + 10, A.slot_a[1] + dy * lv, x + 17, A.slot_a[1] + dy * lv, '#2A1E12', 2.4);
      const glide = fx === 'slider' && q.at === i ? `class="fx-glide" style="--dy:${n(dy * (q.from - v))}px"` : '';
      a += `<g ${glide}>` + C(x, y, 15, DARKINK) + C(x, y, 5, 'paper') + S(`M${n(x - 9)} ${n(y - 6)} a11 11 0 0 1 8 -5`, '#6B5A45', 2) + '</g>';
      h += hot('slider:' + i, Math.round(x - dx / 2), Math.round(A.slot_b[1] - 28), Math.round(dx), Math.round(A.slot_a[1] - A.slot_b[1] + 56));
    });
  } else if (!f.hkeyTaken) h += hot3('panel', 'hkey');
  return { art: a, hots: h, glow: [200, 700, 520], noNight: true, soft: true };
}

function kScope(s, fx) {
  if (!s.f.lensFitted) return { art: rendered('scope', {}, s, fx), hots: hot('eyepiece', 20, 40, 360, 420), noNight: true, noGlow: true };
  let inner;
  if (s.lit) {
    // lamp lit: the telescope looks straight into the reflection on the glass
    inner = `<g style="filter:blur(6px)">${pic('mirror_lit')}</g>` + C(200, 250, 180, 'url(#lampglow)') + C(200, 250, 100, 'url(#lampglow)');
  } else {
    const A = M3.sea.anchors;
    inner = pic('sea_dark');
    BUOYS.forEach((b, i) => {
      const [x, y] = A['buoy' + i], [wx, wy] = A['water' + i], ink = SHAPE_INK[b.shape];
      inner += `<g class="blink blink${b.blinks}">` + C(x, y, 32, 'url(#lampglow)') + C(x, y, 13, ink, 'opacity="0.55"') + C(x, y, 6.5, '#F7F1DE') +
        `<ellipse cx="${wx}" cy="${n(wy + 16)}" rx="7" ry="24" fill="${ink}" opacity="0.45"/></g>`;
    });
  }
  const o = B(-5, -5, 410, 510, '#061419') + `<clipPath id="lensc"><circle cx="200" cy="250" r="178"/></clipPath>` +
    `<g clip-path="url(#lensc)" class="${fx === 'lens' ? 'fx-focus' : ''}">${inner}</g>` + O(200, 250, 178, '#B98A2A', 9) + O(200, 250, 183, '#F5D98A', 1.5, 'opacity="0.5"');
  return { art: '', over: o, hots: hot('eyepiece', 20, 60, 360, 380), noGlow: true, noNight: true };
}

// ---------- the lantern room

function tLamp(s, fx) {
  const f = s.f, A = M3.top0.anchors, lit = !!f.topLit;
  const a = rendered('top0', {}, s, fx, lit);
  let over = '';
  if (lit) {
    const d = beamDir(s), cls = fx === 'beam' || fx === 'toplight' ? 'fx-beam' : '';
    let beam = '';
    if (d === 'E') beam += `<path class="beam ${cls}" d="M236 200 L410 120 L410 290Z" fill="url(#beamR)"/>`;
    if (d === 'W') beam += `<path class="beam ${cls}" d="M164 200 L-10 120 L-10 290Z" fill="url(#beamL)"/>`;
    if (d === 'N') beam += `<path class="beam ${cls}" d="M176 150 L224 150 L250 -6 L150 -6Z" fill="url(#beamU)"/>`;
    if (d === 'S') beam += `<circle class="beam ${cls}" cx="200" cy="205" r="230" fill="url(#lampglow)"/>`;
    if (fx === 'toplight') beam += `<path class="fx-sweep" d="M200 200 L780 120 L780 280Z" fill="url(#beamR)" style="transform-origin:200px 200px"/>`;
    over += `<g transform="translate(${n(A.flame[0] - 200)} ${n(A.flame[1] - 200)})">${beam}</g>` + C(A.flame[0], A.flame[1], 110, 'url(#lampglow)', 'class="lampglow" opacity="0.7"');
  }
  over += T(A.plaque[0], A.plaque[1] + 4.5, beamDir(s), 12, '#2A1E12', lit ? '' : 'opacity="0.45"');
  const h = hot3('top0', 'burner') + hot3('top0', 'filler') + hot3('top0', 'pedestal') + hot3('top0', 'wheel') + hot3('top0', 'down');
  return { art: a, over, hots: h, dark: !lit, noNight: true, noGlow: true };
}

function tOut(s, fx) {
  const f = s.f, R = M3.top1.rects, lit = !!f.topLit;
  const a = rendered('top1', {}, s, fx, lit);
  let over = '';
  if (lit) {
    let clip = '<clipPath id="outpanes">';
    for (const r of Object.values(R)) clip += `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/>`;
    const dx = { N: -86, E: -54, S: -66, W: -58 }[beamDir(s)];
    over += clip + '</clipPath><g clip-path="url(#outpanes)"><g transform="translate(40 108) scale(0.8 0.95)">' +
      `<path class="beam" d="M170 -110 L230 -110 L330 340 L70 340Z" fill="url(#beamD)"/><ellipse cx="200" cy="304" rx="150" ry="34" fill="${K.brass3}" opacity="0.16"/>` +
      `<g class="fx-sight" transform="translate(${dx} 0)">${sight(beamDir(s))}</g></g></g>`;
  }
  over += `<g opacity="${lit ? 1 : 0.5}">` + R_(178, 452, 44, 26, '#B98A2A') + R_(182, 456, 36, 18, '#D9A441') + T(200, 471, beamDir(s), 15, '#2A1E12') + '</g>';
  return { art: a, over, hots: hot('sea', 0, 0, 400, 440), dark: !lit, noNight: true, noGlow: true };
}
const R_ = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}"/>`;

function kRings(s, fx, q) {
  const f = s.f, A = M3.rings.anchors, lit = !!f.topLit;
  let a = rendered('rings', { rings: !f.ringsOpen ? 'closed' : !f.keyTaken ? 'key' : 'empty' }, s, fx, lit);
  let h = '', marks = '';
  DIRS.forEach((d, i) => {
    const [x, y] = A['ring' + i];
    marks += `<g class="${fx === 'ring' && q.at === i ? 'fx-spin' : ''}" style="transform-origin:${x}px ${y}px">` + sign(SYMBOLS[s.rings[i]], x, y, 1.45, DARKINK) + '</g>';
    marks += T(A.rose[0] + (x - A.rose[0]) * 0.4, A.rose[1] + (y - A.rose[1]) * 0.4 + 5, d, 14, '#2A1E12');
    if (!f.ringsOpen) h += hot('ring:' + i, Math.round(x - 44), Math.round(y - 44), 88, 88);
  });
  a += `<g opacity="${lit ? 1 : 0.55}">${marks}</g>`;
  if (f.ringsOpen && !f.keyTaken) h += hot3('rings', 'key');
  return { art: a, hots: h, dark: !lit, noNight: true, noGlow: true };
}

// Every picture file, so the game can fetch them before they are needed.
export function pictureFiles() {
  const out = [];
  for (const [view, m] of Object.entries(M3)) {
    for (const tone of m.tones || ['lit', 'dark']) {
      out.push(`art3d/${view}_${tone}.webp`);
      for (const [name, r] of Object.entries(m.regions)) for (const st of r.states.slice(1)) out.push(`art3d/${view}_${name}_${st}_${tone}.webp`);
    }
  }
  return out;
}

// ---------- putting a scene together

const WALLS = [r0, r1, r2, r3];
const TOPS = [tLamp, tOut];
const VIEWS = { desk: kDesk, book: kBook, mirror: kMirror, chest: kChest, clock: kClock, lock: kLock, bottle: kBottle, box: kBox, panel: kPanel, scope: kScope, rings: kRings };

const DEFS = `<defs>
<filter id="cut" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="3.5" stdDeviation="3" flood-color="#04121A" flood-opacity="0.6"/></filter>
<radialGradient id="lampglow"><stop offset="0" stop-color="#FFD978" stop-opacity="0.62"/><stop offset="0.4" stop-color="#E6B23A" stop-opacity="0.2"/><stop offset="1" stop-color="#E6B23A" stop-opacity="0"/></radialGradient>
<radialGradient id="phos"><stop offset="0" stop-color="#9FF0C8" stop-opacity="0.4"/><stop offset="1" stop-color="#9FF0C8" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="0.5" cy="0.46" r="0.74"><stop offset="0.5" stop-color="#04121A" stop-opacity="0"/><stop offset="1" stop-color="#04121A" stop-opacity="0.62"/></radialGradient>
<linearGradient id="beamR" x1="0" x2="1"><stop offset="0" stop-color="#FFE08A" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0.08"/></linearGradient>
<linearGradient id="beamL" x1="1" x2="0"><stop offset="0" stop-color="#FFE08A" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0.08"/></linearGradient>
<linearGradient id="beamU" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="#FFE08A" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0.08"/></linearGradient>
<linearGradient id="beamD" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFE08A" stop-opacity="0.5"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0.04"/></linearGradient>
</defs>`;

export function scene(s, fx, q = {}) {
  const fn = s.view ? VIEWS[s.view] : s.area === 'top' ? TOPS[s.wall] : WALLS[s.wall];
  const p = fn(s, fx, q);
  const dark = p.dark !== undefined ? p.dark : !s.lit;
  const dim = p.dim !== undefined ? p.dim : 0.76;
  let light = '';
  if (!p.noNight) {
    if (dark) light += `<rect class="night ${fx === 'dark' ? 'fx-nightin' : ''}" x="-5" y="-5" width="410" height="510" fill="#04141B" opacity="${dim}"/>`;
    else if (fx === 'light' || fx === 'toplight') light += `<rect class="night fx-nightout" x="-5" y="-5" width="410" height="510" fill="#04141B" opacity="${dim}"/>`;
  }
  if (!dark && p.glow && p.soft) light += `<circle class="lampglow" cx="${p.glow[0]}" cy="${p.glow[1]}" r="${p.glow[2]}" fill="url(#lampglow)" opacity="0.55"/>`;
  else if (!dark && p.glow && !p.noGlow) light += `<g class="lampglow"><circle cx="${p.glow[0]}" cy="${p.glow[1]}" r="${p.glow[2]}" fill="url(#lampglow)"/><circle cx="${p.glow[0]}" cy="${p.glow[1]}" r="${Math.round(p.glow[2] * 0.5)}" fill="url(#lampglow)"/></g>`;
  if (!dark && p.glow && !p.noGlow && !s.view) {
    const mr = rng(31 + s.wall);
    for (let i = 0; i < 9; i++) light += `<circle class="mote" cx="${n(40 + mr() * 320)}" cy="${n(90 + mr() * 260)}" r="${n(0.8 + mr() * 0.9)}" fill="#FFE9B0" style="animation-delay:${n(-mr() * 9)}s;animation-duration:${n(7 + mr() * 6)}s"/>`;
  }
  if (s.glow && dark && s.inv.includes('jar')) light += `<ellipse class="${fx === 'glow' ? 'fx-glowin' : ''}" cx="200" cy="520" rx="260" ry="150" fill="url(#phos)"/>`;
  return `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The lighthouse">${DEFS}<g class="pan"><g>${p.art}</g>${light}${p.over || ''}${glowMark(s, fx)}${p.hots}</g><rect x="-5" y="-5" width="410" height="510" fill="url(#vig)" pointer-events="none"/></svg>`;
}

// The buoy lights: N flashes, then a long dark pause.
export function blinkCSS() {
  let css = '';
  for (const { blinks } of BUOYS) {
    const lead = 1.0, on = 0.42, gap = 0.4, tail = 2.2;
    const total = lead + blinks * (on + gap) + tail;
    let frames = '0%{opacity:0}';
    for (let i = 0; i < blinks; i++) {
      const t = lead + i * (on + gap);
      frames += `${n((t / total) * 100)}%{opacity:1}${n(((t + on) / total) * 100)}%{opacity:0}`;
    }
    frames += '100%{opacity:0}';
    css += `@keyframes blink${blinks}{${frames}}.blink${blinks}{animation:blink${blinks} ${n(total)}s steps(1,end) infinite}`;
  }
  return css;
}

export function icon(item) {
  const svg = (b) => `<svg viewBox="0 0 40 40" aria-hidden="true">${b}</svg>`;
  switch (item) {
    case 'matches': return svg(R(6, 11, 28, 18, 'red', '', 0.6) + R(6, 16, 28, 8, 'paper', '', 0.4) + C(20, 20, 2.6, 'brass'));
    case 'jar': return svg(R(11, 12, 18, 23, 'glass', '', 0.5) + R(13, 22, 14, 12, '#5F9C9A', '', 0.4) + R(10, 6, 20, 6, 'brass2', '', 0.4) + C(17, 27, 1.4, 'phos') + C(23, 30, 1.1, 'phos') + C(21, 25, 0.9, 'phos'));
    case 'page': return svg(P([[13, 5], [31, 6], [32, 35], [11, 34], [14, 27], [10, 20], [14, 13]], 'paper', '', 0.5) + S('M12 20 a11 11 0 0 1 11 -11', 'ink', 1.6) + L(13, 20, 22, 25, 'ink', 1.8));
    case 'lens': return svg(C(20, 20, 14, 'brass2') + C(20, 20, 10.5, 'fog') + P([[14, 14], [19, 12], [17, 18]], 'paper', '', 0.3));
    case 'crank': return svg(S('M9 28 h18 v-15', 'brass', 4.5) + C(27, 11, 5, 'brass') + C(9, 28, 3.6, 'brass2'));
    case 'oil': return svg(P([[9, 34], [27, 34], [24, 16], [12, 16]], 'brass2', '', 0.5) + L(23, 18, 35, 8, 'brass2', 3) + C(18, 14, 3.4, 'brass') + L(13, 20, 14, 31, 'brass3', 1.4));
    case 'drum': return svg(R(6, 13, 28, 14, 'brass', '', 0.4) + C(11, 18, 1.2, 'ink') + C(17, 23, 1.2, 'ink') + C(22, 17, 1.2, 'ink') + C(28, 22, 1.2, 'ink') + C(14, 21, 1.2, 'ink') + C(25, 20, 1.2, 'ink'));
    case 'hkey': return svg(O(13, 20, 5, 'brass', 3) + B(18, 18.6, 14, 2.8, 'brass') + B(27, 21, 2.6, 4.5, 'brass'));
    case 'key': return svg(O(11, 20, 7, 'brass', 4.5) + B(18, 17.8, 18, 4.4, 'brass') + B(27, 22, 4, 7, 'brass') + B(33, 22, 3, 5, 'brass'));
  }
  return '';
}

