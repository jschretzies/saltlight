// The rules of the lighthouse. No drawing, no sound: only what is allowed and
// what happens. tests/solve.mjs plays this file from start to finish.
//
// Two places: the keeper's room (four walls) and the lantern room above it
// (two views), joined by a ladder and a bolted hatch.
//
// The room turns on one idea: light and dark. With the lamp out you see the
// sea and the marks that glow. With the lamp lit you can read and work, and
// the window becomes a mirror.

// ---- what the player is shown. The answers further down are worked out
// ---- from these, so a clue and its lock can never drift apart.

export const DRAWN_CLOCK = { h: 4, m: 7 };   // logbook sketch: the clock as the window reflects it
export const PINS = [2, 3, 1, 1, 3];          // music box pins, left to right (1 low, 3 high)
export const BUOYS = [
  { shape: 'circle', blinks: 3 },
  { shape: 'triangle', blinks: 5 },
  { shape: 'square', blinks: 2 },
];
export const LOCK_ORDER = ['triangle', 'square', 'circle'];
// One hidden arrow per wall of the room, each with dots for its place in line.
export const GLOW = [
  { wall: 0, dir: 'U', dots: 2 },
  { wall: 1, dir: 'D', dots: 4 },
  { wall: 2, dir: 'L', dots: 1 },
  { wall: 3, dir: 'L', dots: 3 },
];
// What the great light picks out, one thing in each direction.
export const SYMBOLS = ['anchor', 'star', 'wave', 'moon', 'fish', 'wheel'];
export const DIRS = ['N', 'E', 'S', 'W'];
export const SIGHTS = { N: 'star', E: 'fish', S: 'moon', W: 'wave' };

const mirrorHour = (v) => (12 - v) % 12 || 12;
export const ANSWERS = {
  // a mirror swaps left and right on a clock face
  clock: { h: mirrorHour(DRAWN_CLOCK.h), m: (12 - DRAWN_CLOCK.m) % 12 },
  dials: LOCK_ORDER.map((shape) => BUOYS.find((b) => b.shape === shape).blinks),
  arrows: [...GLOW].sort((a, b) => a.dots - b.dots).map((g) => g.dir),
  // the panel hangs upside down: read the pins right to left, and high becomes low
  sliders: [...PINS].reverse().map((v) => 4 - v),
  rings: DIRS.map((d) => SYMBOLS.indexOf(SIGHTS[d])),
};

export const ITEMS = {
  matches: 'Matches',
  jar: 'Jar of seawater',
  lens: 'Lens',
  crank: 'Crank',
  oil: 'Oil can',
  page: 'Torn page',
  drum: 'Pinned drum',
  hkey: 'Small key',
  key: 'Door key',
};
// Tools stay with you. Everything else is used exactly once.
export const KEEP = ['matches', 'jar'];

// The story, told in what Grandad left behind. Each note is found once and
// can be read again from the Notes button.
export const NOTES = {
  intro: "You fell asleep on Grandad's cot with the storm at the window.\n\nNow the lamp is out, the door is locked, and he is gone.",
  matches: 'Light is for reading. The dark is for seeing. In this room you will want both.\n\nA.',
  jar: 'Sea sparkle, caught off the Teeth in June. It only shines when it is disturbed.\n\nWake it gently.',
  lens: 'For the long glass. And mind: a lit window shows you nothing but yourself.',
  oil: 'Oil for the old girl upstairs. She has not gone dry in forty years.\n\nTonight I had no time.',
  page: 'Torn out so no stranger could read the clock. Put it back where it belongs.',
  drum: "Your grandmother's five notes. She played them every evening.\n\nI hung the brass panel by the door in the dark, and badly.",
  hkey: 'Too small for the door, and you know it.\n\nLook up.',
  key: 'If you are reading this, the light is burning and I can find my way home.\n\nCome down to the rocks.\n\nGrandad',
};

const PARENT = { book: 'desk' };
const WALLS = { room: 4, top: 2 };

export function newState() {
  return {
    area: 'room',
    wall: 0,
    view: null,
    lit: false,
    inv: [],
    sel: null,
    f: {},
    clock: { h: 3, m: 0 },
    dials: [0, 0, 0],
    sliders: [2, 2, 2, 2, 2],
    rings: [0, 0, 0, 0],
    beam: 0,
    seq: [],
    notes: ['intro'],
    glow: false,
    hints: 0,
    hintSeen: {},
    ms: 0,
    won: false,
  };
}

const DARK = 'Too dark to make anything out.';
const NOFIT = "That doesn't belong here.";

function take(s, item, msg) {
  s.inv.push(item);
  return { sfx: 'pickup', msg: msg || ITEMS[item] + '.' };
}
// Picking something up can come with a note from Grandad.
function found(s, item, note) {
  const r = take(s, item);
  if (!s.notes.includes(note)) s.notes.push(note);
  r.note = note;
  return r;
}
function spend(s, item) {
  s.inv = s.inv.filter((i) => i !== item);
  s.sel = null;
}
function same(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// One tap (or one movement of the phone). Changes the state and returns what
// the screen should do about it.
export function act(s, id) {
  if (s.won) return {};
  const [name, arg] = id.split(':');
  const sel = s.sel;

  if (name === 'left' || name === 'right') {
    if (s.view) return {};
    const n = WALLS[s.area];
    s.wall = (s.wall + (name === 'right' ? 1 : n - 1)) % n;
    return { sfx: 'step', turn: name };
  }
  if (name === 'back') {
    if (!s.view) return {};
    s.view = PARENT[s.view] || null;
    return { sfx: 'step' };
  }
  if (name === 'inv') {
    if (!s.inv.includes(arg)) return {};
    s.sel = s.sel === arg ? null : arg;
    return { sfx: 'tick' };
  }
  // The phone itself: a shake stirs the jar, turning it over empties the bottle.
  if (name === 'shake') {
    if (!s.inv.includes('jar')) return {};
    if (s.area === 'room' && s.lit) return { sfx: 'sparkle', msg: 'The water sparkles faintly, lost in the lamplight.' };
    s.glow = true;
    return { sfx: 'sparkle', fx: 'glow' };
  }
  if (name === 'unglow') {
    s.glow = false;
    return {};
  }
  if (name === 'flip') {
    if (s.view !== 'bottle' || s.f.pageOut) return {};
    s.f.pageOut = true;
    return { sfx: 'paper', fx: 'flip', msg: 'The paper slides out of the neck.' };
  }

  const r = hotspot(s, name, arg, sel);
  // A held item that was not used is put away after any tap on the room.
  if (sel && s.sel === sel && !r.keep) {
    s.sel = null;
    if (!r.used) {
      if (!r.msg) r.msg = NOFIT;
      if (!r.sfx) r.sfx = 'deny';
    }
  }
  return r;
}

function hotspot(s, name, arg, sel) {
  const f = s.f;
  const where = s.view || (s.area === 'room' ? 'wall' : 'top') + s.wall;

  switch (where + '/' + name) {
    // ================= the keeper's room =================

    // ---- wall 0: the door
    case 'wall0/door':
      if (sel === 'key') {
        spend(s, 'key');
        f.doorOpen = true;
        s.won = true;
        return { sfx: 'unlock', fx: 'door', used: true };
      }
      if (sel) return {};
      return { sfx: 'deny', msg: 'Locked, and the key is gone. He did this on purpose.' };
    case 'wall0/coat':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: "Grandad's oilskin, still dripping. He has been out once already tonight." };
    case 'wall0/boots':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: 'His good boots. So he took the sea boots.' };
    case 'wall0/ring':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: 'The life ring off the Maren. He never says what happened to her.' };
    case 'wall0/panel':
      if (!s.lit) return { msg: DARK };
      s.view = 'panel';
      return { sfx: 'step', keep: true };

    // ---- wall 1: the window
    case 'wall1/window':
      if (sel) return {};
      if (s.lit) {
        s.view = 'mirror';
        return { sfx: 'step' };
      }
      return { msg: 'Three buoy lights out past the Teeth. Too far to tell apart by eye.' };
    case 'mirror/glass':
      if (sel) return {};
      return { msg: 'With the lamp lit, the window only shows the room behind me. Everything the wrong way round.' };
    case 'wall1/jar':
      if (sel) return {};
      if (f.jarTaken) return {};
      f.jarTaken = true;
      return found(s, 'jar', 'jar');
    case 'wall1/rope':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: 'Spare line, coiled the way he taught me.' };
    case 'wall1/scope':
      s.view = 'scope';
      return { sfx: 'step', keep: true };
    case 'scope/eyepiece': {
      const glare = s.lit ? 'Nothing but our own lamp, glaring back off the window.' : '';
      if (f.lensFitted) return sel ? {} : { msg: glare };
      if (sel === 'lens') {
        spend(s, 'lens');
        f.lensFitted = true;
        return { sfx: 'fit', fx: 'lens', used: true, msg: glare };
      }
      if (sel) return {};
      return { sfx: 'deny', msg: "Grandad's long glass. The eyepiece is empty: he has taken the lens out." };
    }
    case 'wall1/chest':
      if (!s.lit) return { msg: DARK };
      s.view = 'chest';
      return { sfx: 'step', keep: true };
    case 'chest/arrow':
      if (sel) return {};
      if (f.chestOpen) return {};
      s.seq.push(arg);
      if (s.seq.length < ANSWERS.arrows.length) return { sfx: 'slide', fx: 'press', at: arg };
      if (same(s.seq, ANSWERS.arrows)) {
        f.chestOpen = true;
        s.seq = [];
        return { sfx: 'unlock', fx: 'chest' };
      }
      s.seq = [];
      return { sfx: 'deny', fx: 'shake' };
    case 'chest/lens':
      if (sel) return {};
      if (!f.chestOpen || f.lensTaken) return {};
      f.lensTaken = true;
      return found(s, 'lens', 'lens');

    // ---- wall 2: the desk and the ladder
    case 'wall2/desk':
      s.view = 'desk';
      return { sfx: 'step', keep: true };
    case 'wall2/board':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: 'Tide tables. He knows them by heart and checks them anyway.' };
    case 'wall2/ladder':
      if (f.hatchOpen) {
        if (sel) return {};
        s.area = 'top';
        s.wall = 0;
        return { sfx: 'climb', turn: 'up', msg: f.topLit ? '' : 'The lantern room. Cold glass all round, and the great lamp dark.' };
      }
      if (sel === 'hkey') {
        spend(s, 'hkey');
        f.hatchOpen = true;
        return { sfx: 'unlock', fx: 'hatch', used: true };
      }
      if (sel) return {};
      return { sfx: 'deny', msg: 'The ladder to the lantern room. The hatch is bolted, with a small keyhole.' };
    case 'desk/drawer':
      if (sel) return {};
      f.drawerOpen = !f.drawerOpen;
      return { sfx: 'drawer', fx: 'drawer' };
    case 'desk/matches':
      if (sel) return {};
      if (!f.drawerOpen || f.matchesTaken) return {};
      f.matchesTaken = true;
      return found(s, 'matches', 'matches');
    case 'desk/lamp':
      if (sel && sel !== 'matches') return {};
      if (s.lit) {
        s.lit = false;
        s.sel = null;
        return { sfx: 'puff', fx: 'dark', used: true };
      }
      if (s.inv.includes('matches')) {
        s.lit = true;
        s.glow = false;
        s.sel = null;
        return { sfx: 'strike', fx: 'light', used: true };
      }
      return { msg: 'The desk lamp. Cold. He always keeps matches close by.' };
    case 'desk/book':
      if (!s.lit) return { msg: 'Too dark to read.' };
      s.view = 'book';
      return { sfx: 'paper', keep: true };
    case 'book/page':
      if (f.pageUsed) return sel ? {} : { msg: 'He drew the clock through the cross of the window frame. From his chair, at night.' };
      if (sel === 'page') {
        spend(s, 'page');
        f.pageUsed = true;
        return { sfx: 'paper', fx: 'page', used: true };
      }
      if (sel) return {};
      return { msg: 'His log. The last page is torn down the middle, and half of it is gone.' };

    // ---- wall 3: clock, cabinet, shelf
    case 'wall3/clock':
      if (!s.lit) return { msg: DARK };
      s.view = 'clock';
      return { sfx: 'step', keep: true };
    case 'wall3/cabinet':
      if (!s.lit) return { msg: DARK };
      if (f.lockOpen) return sel ? {} : { msg: f.crankTaken && f.oilTaken ? 'Empty now.' : '' };
      s.view = 'lock';
      return { sfx: 'step', keep: true };
    case 'wall3/crank':
    case 'wall3/oil': {
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      const flag = name + 'Taken';
      if (!f.lockOpen || f[flag]) return {};
      f[flag] = true;
      return name === 'oil' ? found(s, 'oil', 'oil') : take(s, 'crank', "The crank of Gran's music box.");
    }
    case 'wall3/books':
      if (!s.lit) return { msg: DARK };
      if (sel) return {};
      return { msg: 'Almanacs. And one novel he thinks nobody knows about.' };
    case 'wall3/box':
      if (!s.lit) return { msg: DARK };
      s.view = 'box';
      return { sfx: 'step', keep: true };
    case 'wall3/bottle':
      if (!s.lit) return { msg: DARK };
      s.view = 'bottle';
      return { sfx: 'step', keep: true };
    case 'bottle/bottle':
      if (sel) return {};
      if (f.pageOut) return {};
      return { msg: 'A rolled paper in the bottle, stuck below the neck. It will not come out this way up.' };
    case 'bottle/page':
      if (sel) return {};
      if (!f.pageOut || f.pageTaken) return {};
      f.pageTaken = true;
      return found(s, 'page', 'page');

    case 'clock/knobH':
    case 'clock/knobM':
      if (sel) return {};
      if (f.clockSolved) return {};
      if (name === 'knobH') s.clock.h = (s.clock.h % 12) + 1;
      else s.clock.m = (s.clock.m + 1) % 12;
      if (s.clock.h === ANSWERS.clock.h && s.clock.m === ANSWERS.clock.m) {
        f.clockSolved = true;
        return { sfx: 'chime', fx: 'clock' };
      }
      return { sfx: 'tick', fx: 'hand', at: name === 'knobH' ? 'h' : 'm' };
    case 'clock/drum':
      if (sel) return {};
      if (!f.clockSolved || f.drumTaken) return {};
      f.drumTaken = true;
      return found(s, 'drum', 'drum');
    case 'clock/face':
      if (sel) return {};
      return { msg: f.clockSolved ? '' : 'The wall clock has stopped. He never lets it stop. Two knobs underneath.' };

    case 'lock/dial':
      if (sel) return {};
      if (f.lockOpen) return {};
      s.dials[+arg] = (s.dials[+arg] + 1) % 10;
      if (same(s.dials, ANSWERS.dials)) {
        f.lockOpen = true;
        return { sfx: 'unlock', fx: 'lock', after: 'back' };
      }
      return { sfx: 'tick', fx: 'dial', at: +arg };

    case 'box/body':
      if (sel === 'crank' && !f.crankFitted) {
        spend(s, 'crank');
        f.crankFitted = true;
        return { sfx: 'fit', fx: 'crank', used: true };
      }
      if (sel === 'drum' && !f.drumFitted) {
        spend(s, 'drum');
        f.drumFitted = true;
        return { sfx: 'fit', fx: 'drum', used: true };
      }
      if (sel) return {};
      if (f.crankFitted && f.drumFitted) return {};
      if (!f.crankFitted && !f.drumFitted) return { sfx: 'deny', msg: "Gran's music box, stripped. No crank, and nothing inside to play." };
      return { sfx: 'deny', msg: f.crankFitted ? 'The cradle inside is empty.' : 'There is a socket for a crank.' };
    case 'box/crank':
      if (sel) return {};
      if (!f.crankFitted) return {};
      if (!f.drumFitted) return { sfx: 'slide', msg: 'It turns. Nothing inside to play.' };
      f.boxPlayed = true;
      return { fx: 'play' };

    // ---- the panel by the door
    case 'panel/slider':
      if (sel) return {};
      if (f.panelOpen) return {};
      const from = s.sliders[+arg];
      s.sliders[+arg] = (from % 3) + 1;
      if (same(s.sliders, ANSWERS.sliders)) {
        f.panelOpen = true;
        return { sfx: 'unlock', fx: 'panel' };
      }
      return { sfx: 'slide', fx: 'slider', at: +arg, from };
    case 'panel/hkey':
      if (sel) return {};
      if (!f.panelOpen || f.hkeyTaken) return {};
      f.hkeyTaken = true;
      return found(s, 'hkey', 'hkey');

    // ================= the lantern room =================

    case 'top0/down':
    case 'top1/down':
      if (sel) return {};
      s.area = 'room';
      s.wall = 2;
      return { sfx: 'climb', turn: 'down' };
    case 'top0/filler':
      if (f.oiled) return sel ? {} : { msg: 'The reservoir is full.' };
      if (sel === 'oil') {
        spend(s, 'oil');
        f.oiled = true;
        return { sfx: 'pour', fx: 'oil', used: true };
      }
      if (sel) return {};
      return { sfx: 'deny', msg: 'The reservoir of the great lamp. Bone dry, like he wrote.' };
    case 'top0/burner':
      if (sel && sel !== 'matches') return {};
      if (f.topLit) return { msg: 'The great lamp burns.', used: true };
      if (!f.oiled) return { sfx: 'deny', msg: 'No oil. It will not catch.', used: true };
      if (!s.inv.includes('matches')) return { msg: 'It wants a flame.' };
      f.topLit = true;
      s.sel = null;
      return { sfx: 'strike', fx: 'toplight', used: true, msg: 'The great lamp catches. Now he can see where home is.' };
    case 'top0/wheel':
      if (sel) return {};
      s.beam = (s.beam + 1) % 4;
      return { sfx: 'crankturn', fx: 'beam' };
    case 'top0/pedestal':
      s.view = 'rings';
      return { sfx: 'step', keep: true };
    case 'rings/ring':
      if (sel) return {};
      if (f.ringsOpen) return {};
      s.rings[+arg] = (s.rings[+arg] + 1) % SYMBOLS.length;
      if (same(s.rings, ANSWERS.rings)) {
        f.ringsOpen = true;
        return { sfx: 'unlock', fx: 'rings' };
      }
      return { sfx: 'tick', fx: 'ring', at: +arg };
    case 'rings/key':
      if (sel) return {};
      if (!f.ringsOpen || f.keyTaken) return {};
      f.keyTaken = true;
      return found(s, 'key', 'key');
    case 'top1/sea':
      if (sel) return {};
      return { msg: f.topLit ? '' : 'Black water all round. Somewhere out there he is rowing blind.' };
  }
  return {};
}

// Where the player is stuck, and what to tell them. First a nudge, then the answer.
export function hintFor(s) {
  const f = s.f;
  const has = (i) => s.inv.includes(i);
  const words = { U: 'up', D: 'down', L: 'left', R: 'right' };
  const level = ['', 'low', 'middle', 'high'];
  const compass = { N: 'north', E: 'east', S: 'south', W: 'west' };

  if (!f.matchesTaken) {
    return {
      stage: 'light',
      nudge: 'Start at the desk.',
      answer: 'Open the desk drawer and take the matches. With them, a tap on the oil lamp lights it. Another tap puts it out.',
    };
  }
  if (!f.chestOpen) {
    return {
      stage: 'chest',
      nudge: f.jarTaken
        ? 'Sea sparkle glows when the water is shaken, and it only shows with the lamp out. Try it on every wall.'
        : 'There is a jar on the window sill. Take it with you.',
      answer: `Take the jar from the window sill. Put the lamp out, then shake your phone (or tap the jar) while facing each wall: an arrow lights up, with dots. Follow the dots from one to four: ${ANSWERS.arrows.map((d) => words[d]).join(', ')}. Light the lamp and press that on the sea chest under the window.`,
    };
  }
  if (!f.lensFitted) {
    return {
      stage: 'lens',
      nudge: f.lensTaken ? 'Something by the window is missing a piece of glass.' : 'The chest is open. Look inside.',
      answer: 'Take the lens from the sea chest and fit it in the telescope by the window.',
    };
  }
  if (!f.lockOpen) {
    return {
      stage: 'lock',
      nudge: 'A lit window is a mirror. To see out, the room has to be dark. Then count the flashes.',
      answer: `Put the lamp out and look through the telescope. Circle flashes 3, triangle 5, square 2. The lock reads triangle, square, circle: ${ANSWERS.dials.join(' ')}. Light the lamp again to work the lock.`,
    };
  }
  if (!f.crankTaken || !f.oilTaken) {
    return { stage: 'cabinet', nudge: 'The cabinet stands open. Empty it.', answer: 'Take both the crank and the oil can from the open cabinet.' };
  }
  if (!f.pageUsed) {
    return {
      stage: 'page',
      nudge: f.pageTaken
        ? 'The logbook on the desk is missing half a page.'
        : 'There is paper in the bottle on the shelf, and it only comes out one way.',
      answer: f.pageTaken
        ? 'Open the logbook on the desk and place the torn page on it.'
        : 'Look at the bottle on the shelf and turn your phone upside down (or tap the bottle twice). Take the paper that slides out and place it on the logbook.',
    };
  }
  if (!f.clockSolved) {
    return {
      stage: 'clock',
      nudge: 'The keeper drew the clock through a window frame. Light the lamp and look at the window.',
      answer: `The sketch shows the clock as the window reflects it, so left and right are swapped. Set the real clock: short hand on ${ANSWERS.clock.h}, long hand on ${ANSWERS.clock.m} (twenty-five past).`,
    };
  }
  if (!f.drumTaken) {
    return { stage: 'drum', nudge: 'The clock case opened.', answer: 'Take the pinned drum from the open clock case.' };
  }
  if (!f.crankFitted || !f.drumFitted) {
    return {
      stage: 'box',
      nudge: 'The music box on the shelf is missing two parts. You are carrying them.',
      answer: 'Open the music box on the shelf and fit both the crank and the pinned drum.',
    };
  }
  if (!f.panelOpen) {
    return {
      stage: 'panel',
      nudge: 'Play the music box and watch the pins. Then look closely at the anchor on the panel by the door.',
      answer: `The panel hangs upside down, so turn the pins around: read them right to left, and swap high and low. Set the sliders to ${ANSWERS.sliders.map((v) => level[v]).join(', ')}.`,
    };
  }
  if (!f.hatchOpen) {
    return {
      stage: 'hatch',
      nudge: 'The key from the panel is too small for the door. Look up.',
      answer: 'Take the small key from the panel and use it on the ladder next to the desk. It unbolts the hatch in the ceiling.',
    };
  }
  if (!f.topLit) {
    return {
      stage: 'toplight',
      nudge: 'The great lamp upstairs is dry and cold. You carry what it needs.',
      answer: 'Climb the ladder. Use the oil can on the round filler cap, then tap the burner inside the lens to light it with your matches.',
    };
  }
  if (!f.ringsOpen) {
    return {
      stage: 'rings',
      nudge: 'Turn the wheel to swing the beam, then look out over the sea. There is something to find in every direction.',
      answer: `The beam shows one sign in each direction: ${DIRS.map((d) => compass[d] + ' ' + SIGHTS[d]).join(', ')}. Set the four rings on the pedestal to match.`,
    };
  }
  return {
    stage: 'door',
    nudge: 'The pedestal gave up a heavy key. There is a heavy lock downstairs.',
    answer: has('key') ? 'Go down, hold the door key and tap the door.' : 'Take the door key from the pedestal, climb down, and use it on the door.',
  };
}
