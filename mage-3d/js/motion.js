// Движение: кривые, треки действий (как state machine у Talking Tom), шаг, пружинящие звенья.
export const E = {
  out: (u) => 1 - (1 - u) ** 3, in: (u) => u ** 3,
  io: (u) => (u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  sine: (u) => (1 - Math.cos(Math.PI * u)) / 2,
  back: (u) => { const c = 1.4; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
};
export function sample(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i];
    return a[1] + (b[1] - a[1]) * E[b[2] || 'io']((t - a[0]) / (b[0] - a[0]));
  }
  return keys[keys.length - 1][1];
}

// Все каналы, которыми действие может управлять. Значения — смещения от позы покоя.
export const CHANNELS = ['y', 'sq', 'lean', 'twist', 'headYaw', 'headPitch', 'headRoll', 'armL', 'armR', 'armLx', 'armRx', 'gripY', 'glow', 'hatSq'];

// Действия. priority: реакция (2) прерывает фоновую возню (1); события — по имени, их исполняет сцена.
export const ACTIONS = {
  party: { label: 'тап → party', priority: 2, dur: 1500, tracks: {
    y:       [[0, 0], [160, 0], [430, 7.5, 'out'], [530, 7.5], [750, 0, 'in']],
    sq:      [[0, 0], [160, -.09, 'out'], [320, .06, 'out'], [500, 0], [750, 0], [800, -.08, 'out'], [990, .015, 'out'], [1250, 0]],
    headYaw: [[0, 0], [360, -1.1, 'out'], [1150, -1.1], [1500, 0, 'io']],
    twist:   [[0, 0], [360, -.25, 'out'], [1150, -.25], [1500, 0, 'io']],
    armL:    [[0, 0], [320, -1.95, 'back'], [480, -1.55], [640, -1.95], [800, -1.55], [960, -1.95], [1400, 0, 'io']],
    glow:    [[0, 0], [430, 1, 'out'], [1500, 0]],
  }, events: [[440, 'burstSmall'], [760, 'puff'], [1100, 'partyOpen']] },

  cast: { label: 'колдует', priority: 2, dur: 2200, tracks: {
    sq:        [[0, 0], [380, -.06, 'out'], [760, .05, 'back'], [1000, 0]],
    y:         [[0, 0], [760, 1.4, 'back'], [1450, 1.4], [1950, 0, 'io']],
    lean:      [[0, 0], [380, .08, 'out'], [780, -.1, 'back'], [1450, -.1], [1950, 0, 'io']],
    armR:      [[0, 0], [380, -.2, 'out'], [780, 1.45, 'back'], [1450, 1.45], [1950, 0, 'io']],
    armRx:     [[0, 0], [780, 0], [950, .22, 'sine'], [1120, -.18, 'sine'], [1290, .12, 'sine'], [1450, 0, 'sine']],
    armL:      [[0, 0], [780, -.9, 'back'], [1450, -.9], [1950, 0, 'io']],
    headPitch: [[0, 0], [780, -.25, 'out'], [1450, -.25], [1950, 0, 'io']],
    glow:      [[0, 0], [380, -.35, 'out'], [800, 2.2, 'out'], [1500, .8, 'io'], [2200, 0, 'io']],
  }, events: [[800, 'burstBig'], [960, 'ringSmall']] },

  // Реакции на касание частей тела
  hatBoop: { label: 'по шляпе', priority: 2, dur: 700, tracks: {
    hatSq:     [[0, 0], [90, -.2, 'out'], [260, .09, 'out'], [460, -.03, 'io'], [700, 0, 'io']],
    headPitch: [[0, 0], [90, .14, 'out'], [460, 0, 'io']],
    sq:        [[0, 0], [90, -.04, 'out'], [300, .02, 'out'], [520, 0]],
  }, events: [[60, 'hatFlick']] },
  giggle: { label: 'щекотно', priority: 2, dur: 900, tracks: {
    sq:    [[0, 0], [80, -.07, 'out'], [180, .05, 'io'], [280, -.045, 'io'], [380, .03, 'io'], [500, -.015, 'io'], [650, 0, 'io']],
    twist: [[0, 0], [120, .12, 'out'], [240, -.1, 'io'], [360, .07, 'io'], [480, -.04, 'io'], [650, 0, 'io']],
    armL:  [[0, 0], [150, .25, 'out'], [650, 0, 'io']],
    armR:  [[0, 0], [150, -.2, 'out'], [650, 0, 'io']],
  }, events: [] },
  lookBack: { label: 'оглянулся', priority: 2, dur: 1500, tracks: {
    headYaw:   [[0, 0], [320, -1.2, 'out'], [1150, -1.2], [1500, 0, 'io']],
    twist:     [[0, 0], [360, -.3, 'out'], [1150, -.3], [1500, 0, 'io']],
    headPitch: [[0, 0], [500, .12, 'io'], [700, 0, 'io'], [900, .12, 'io'], [1100, 0, 'io']],
  }, events: [] },

  // Фоновая возня в покое — чтобы персонаж жил сам
  look: { label: 'idle · оглядывается', priority: 1, dur: 3200, tracks: {
    headYaw: [[0, 0], [600, .55, 'io'], [1400, .55], [2000, -.45, 'io'], [2700, -.45], [3200, 0, 'io']],
    twist:   [[0, 0], [600, .12, 'io'], [1400, .12], [2000, -.1, 'io'], [2700, -.1], [3200, 0, 'io']],
  }, events: [] },
  stretch: { label: 'idle · потягивается', priority: 1, dur: 2400, tracks: {
    armL:      [[0, 0], [800, -1.35, 'io'], [1600, -1.35], [2300, 0, 'io']],
    armR:      [[0, 0], [800, .55, 'io'], [1600, .55], [2300, 0, 'io']],
    sq:        [[0, 0], [800, .05, 'io'], [1600, .05], [2300, 0, 'io']],
    y:         [[0, 0], [800, .7, 'io'], [1600, .7], [2300, 0, 'io']],
    headPitch: [[0, 0], [800, -.22, 'io'], [1600, -.22], [2300, 0, 'io']],
    headRoll:  [[0, 0], [900, .1, 'io'], [1500, -.08, 'io'], [2200, 0, 'io']],
  }, events: [] },
  tapStaff: { label: 'idle · стучит посохом', priority: 1, dur: 1500, tracks: {
    gripY: [[0, 0], [260, 2.6, 'out'], [420, -.3, 'in'], [520, 0, 'out'], [800, 2.2, 'out'], [960, -.3, 'in'], [1060, 0, 'out']],
    sq:    [[0, 0], [420, -.02, 'in'], [520, 0], [960, -.02, 'in'], [1060, 0]],
    glow:  [[0, 0], [420, .6, 'out'], [700, 0], [960, .6, 'out'], [1400, 0]],
  }, events: [[420, 'staffTap'], [960, 'staffTap']] },
};

export class Player {
  constructor(onEvent) { this.onEvent = onEvent; this.act = null; this.t = 0; this.fired = 0; this.prev = null; this.prevT = 0; this.off = {}; }
  play(name) {
    const a = ACTIONS[name];
    if (this.act && this.act.priority > a.priority) return false;
    if (this.act) { this.prev = { ...this.off }; this.prevT = 0; }
    this.act = a; this.name = name; this.t = 0; this.fired = 0;
    return true;
  }
  get busy() { return !!this.act; }
  update(dt) {
    const off = this.off;
    for (const k of CHANNELS) off[k] = 0;
    if (this.act) {
      this.t += dt * 1000;
      for (const k in this.act.tracks) off[k] = sample(this.act.tracks[k], this.t);
      while (this.fired < this.act.events.length && this.act.events[this.fired][0] <= this.t) this.onEvent(this.act.events[this.fired++][1]);
      if (this.t >= this.act.dur) { this.act = null; this.onEvent('end'); }
    }
    if (this.prev) {                                     // мягкая сшивка, если действие прервали
      this.prevT += dt * 1000;
      const w = 1 - E.out(Math.min(1, this.prevT / 200));
      for (const k of CHANNELS) off[k] += (this.prev[k] || 0) * w;
      if (w <= 0) this.prev = null;
    }
    return off;
  }
}

// Цикл шага: перенос веса, подъём в момент переноса ноги, ноги по дуге.
export function walkPose(ph, wa) {
  const s = Math.sin(ph);
  return {
    bob: 1.1 * s * s * wa,
    sway: .06 * Math.sin(ph - .3) * wa,
    swing: .32 * s * wa,
    footL: [Math.max(0, s) ** 1.5 * 2.2 * wa, 2.2 * Math.cos(ph) * wa],
    footR: [Math.max(0, -s) ** 1.5 * 2.2 * wa, -2.2 * Math.cos(ph) * wa],
  };
}

// Пружинящие звенья (spring bones): отстают от тела по инерции и докачиваются.
export class Chains {
  constructor() { this.s = new WeakMap(); }
  kick(chain, vx, vz = 0) { const s = this.s.get(chain); if (s) { s.v += vx; s.vz += vz; } }
  drive(chains, { ay, side, t, amp }, dt) {
    for (const c of chains) {
      let s = this.s.get(c); if (!s) this.s.set(c, (s = { x: 0, v: 0, z: 0, vz: 0 }));
      const g = c.gain || 1;
      s.v += (-150 * s.x - 9 * s.v + Math.max(-900, Math.min(900, ay)) * .0009 * g) * dt; s.x += s.v * dt;
      s.vz += (-120 * s.z - 8 * s.vz - side * 2.2 * g) * dt; s.z += s.vz * dt;
      if (!Number.isFinite(s.x + s.v + s.z + s.vz)) Object.assign(s, { x: 0, v: 0, z: 0, vz: 0 });
      c.links.forEach((l, i) => {
        l.g.rotation.x = l.rx + s.x * l.k + Math.sin(t * 1.3 - i * .5) * .03 * l.k * amp;
        l.g.rotation.z = l.rz + s.z * l.k + Math.sin(t * .9 - i * .4) * .022 * l.k * amp;
      });
    }
  }
}
