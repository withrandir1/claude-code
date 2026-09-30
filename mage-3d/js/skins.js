// Скины по слотам. build(rig) крепит части к точкам скелета и возвращает api:
//   chains — пружинящие звенья (инерция), focus — точка магии, glowMat — светящийся материал,
//   update(t, dt) — собственная жизнь скина (вращение звезды, орбиты искр).
import * as THREE from 'three';
import { lathe, taperTube, star3D, trimTexture, mesh, joint, sphere } from './geometry.js';
import { cloth, withRim } from './engine.js';

const DS = THREE.DoubleSide;
export let stateLight = new THREE.Color('#BFE6FF');
export const setStateLight = (c) => { stateLight = new THREE.Color(c); };
const glowMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: stateLight, emissiveIntensity: 3, roughness: .2 });
const woodMat = () => withRim(new THREE.MeshPhysicalMaterial({ color: 0xc9a27a, roughness: .72, clearcoat: .25 }), { color: 0xffe9d2, strength: .3 });
const metalMat = () => new THREE.MeshPhysicalMaterial({ color: 0xeef3f9, roughness: .22, metalness: .85 });

// ---------------- МАНТИЯ ----------------
const ROBE_FOLDS = { folds: 12, foldAmp: .055, foldTop: 17, foldBottom: 0 };
const SLEEVE_FOLDS = { folds: 7, foldAmp: .07, foldTop: 0, foldBottom: -12.6 };
function robe(r, p) {
  const m = cloth(p.cloth);
  const trim = cloth(0xffffff, { map: trimTexture(p.trimBase, p.trimMark, 22), side: DS, roughness: .75 });
  mesh(lathe([[0, .6], [11.8, .4], [13.9, 1.6], [14.4, 4], [13.5, 10], [11.5, 17], [9.6, 23], [8.8, 26.4], [7.2, 28.6], [4.4, 29.8], [0, 30.2]], { seg: 96, ...ROBE_FOLDS }), m, r.body, [0, 0, 0], [1, 1, .86]);
  mesh(lathe([[14.62, 4.7], [14.72, 3], [14.12, 1.3]], { seg: 96, keepUV: true, ...ROBE_FOLDS }), trim, r.body, [0, 0, 0], [1, 1, .86]);
  const beltM = cloth(p.belt);
  mesh(new THREE.TorusGeometry(12.1, .9, 18, 96), beltM, r.body, [0, 15, 0], [1, .86, 1], [Math.PI / 2, 0, 0]);
  mesh(sphere(1.7), beltM, r.body, [0, 15, -10.5], [1.3, 1, .8]);
  const chains = [];
  const tails = [];
  for (const s of [-1, 1]) {
    const j = joint(r.body, [s * .9, 14.4, -10.6], [.08, 0, s * .2]);
    mesh(taperTube([[0, 0, 0], [s * .2, -2.6, -.3], [s * .3, -5.2, -.2]], .8, .5, { radial: 14 }).geo, beltM, j, [0, 0, 0], [1, 1, .7]);
    mesh(sphere(.55, 16, 12), beltM, j, [s * .3, -5.2, -.2]);
    tails.push({ g: j, rx: .08, rz: s * .2, k: 1 });
  }
  chains.push({ links: tails, gain: 1.2 });
  // шарф и его концы на спине
  const scarfM = cloth(p.belt);
  mesh(new THREE.TorusGeometry(5.9, 2.3, 24, 64), scarfM, r.chest, [0, 15.4, 0], [1, .92, .9], [Math.PI / 2, 0, 0]);
  const ends = [];
  for (const s of [-1, 1]) {
    const j = joint(r.chest, [s * 1.6, 14.4, -6.6], [.5, 0, s * .12]);
    mesh(taperTube([[0, 0, 0], [0, -3, -.4], [s * .3, -6.4, -.3]], 1.5, 1.1, { radial: 18 }).geo, scarfM, j, [0, 0, 0], [1, 1, .45]);
    ends.push({ g: j, rx: .5, rz: s * .12, k: 1 });
  }
  chains.push({ links: ends, gain: 1 });
  // рукава с манжетами
  const cuffTrim = cloth(0xffffff, { map: trimTexture(p.trimBase, p.trimMark, 9), side: DS, roughness: .75 });
  for (const arm of [r.armL, r.armR]) {
    mesh(lathe([[0, .4], [3, 0], [3.6, -5], [5.2, -10.5], [5.6, -12.2], [4.4, -12.9], [0, -12.7]], { seg: 64, ...SLEEVE_FOLDS }), m, arm);
    mesh(lathe([[5.36, -10.2], [5.66, -11.5], [5.82, -12.35]], { seg: 64, keepUV: true, ...SLEEVE_FOLDS }), cuffTrim, arm);
  }
  return { chains };
}

// ---------------- ВОЛОСЫ И БОРОДА ----------------
function hair(r, len) {
  const h = cloth(0xfbfcff, { roughness: .92, sheen: 1, side: DS, rim: { strength: .6 } });
  mesh(new THREE.SphereGeometry(6.8, 64, 40, Math.PI / 2 + 1, Math.PI * 2 - 2), h, r.head, [0, 6.3, .2]);
  const locks = [];
  for (const i of [-1, 0, 1]) {
    const j = joint(r.head, [i * 2.7, 6.2, -5.4], [.38 - Math.abs(i) * .04, 0, i * .14]);
    const w = i ? .82 : 1;
    mesh(lathe([[0, 1], [2.9, .3], [3.2, -2.5], [2.5, -6.5], [1.3, -9.4], [0, -10.8]], { seg: 40 }), h, j, [0, 0, 0], [w, i ? .9 : 1, .55]);
    locks.push({ g: j, rx: .38 - Math.abs(i) * .04, rz: i * .14, k: i ? 1.2 : 1 });
  }
  const beardJ = joint(r.head, [0, 3.4, 4.6]);
  mesh(lathe([[0, 3.8], [5.4, 3], [6.1, 0], [5, -len * .45], [2.4, -len * .82], [0, -len]], { seg: 48 }), h, beardJ, [0, 0, 0], [1, 1, .62]);
  for (const s of [-1, 1]) mesh(sphere(2.3), h, r.head, [s * 2.5, 4.9, 6.9], [1.5, .78, .8], [0, 0, -s * .32]);
  for (const s of [-1, 1]) { const b = mesh(new THREE.CapsuleGeometry(.75, 2.6, 6, 16), h, r.head, [s * 2.8, 9.5, 5.7], [1, 1, .8], [0, 0, s * 1.25]); b.userData.zone = 'head'; }
  return { chains: [{ links: locks, gain: 1 }, { links: [{ g: beardJ, rx: 0, rz: 0, k: .5 }], gain: .6 }] };
}

// ---------------- ШЛЯПЫ (маг всегда в шляпе) ----------------
function tipChain(parent, m, segs, accent) {
  const links = []; let p = parent;
  segs.forEach(([y, r0, prof, rx, rz, k], i) => {
    const j = joint(p, [0, y, 0], [rx, 0, rz]);
    mesh(sphere(r0, 40, 28), m, j);
    mesh(lathe(prof, { seg: 48 }), m, j);
    links.push({ g: j, rx, rz, k });
    p = j;
  });
  if (accent) mesh(sphere(1, 24, 16), accent, p, [0, segs[segs.length - 1][2].at(-1)[1] - .3, 0]);
  return links;
}
function hatWanderer(r) {
  const m = cloth(0xdce5f0, { roughness: .78 }), band = cloth(0x9cc1e8);
  mesh(lathe([[0, 1], [13.8, .6], [15.3, -.1], [14.9, -.8], [12, -.9], [0, -.3]], { seg: 96, waveAmp: .9, waveCount: 5 }), m, r.hat, [0, 0, 0], [1, 1, .96]);
  mesh(lathe([[0, 0], [7.5, 0], [7.1, 2.2], [6.3, 4.6], [6.05, 5.5], [5.1, 7.8], [3.9, 10.4], [0, 10.7]], { seg: 72, folds: 5, foldAmp: .035, foldTop: 11, foldBottom: 0 }), m, r.hat);
  mesh(new THREE.TorusGeometry(7.3, 1.1, 18, 72), band, r.hat, [0, 1.6, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const buckle = mesh(new THREE.TorusGeometry(1.2, .32, 10, 4), metalMat(), r.hat, [0, 1.6, -8.25], [1, 1.2, 1], [0, 0, Math.PI / 4]);
  buckle.rotation.y = Math.PI;
  mesh(star3D(1.2, .38, .15, .2), metalMat(), r.hat, [0, 1.6, -8.5]);
  const links = tipChain(r.hat, m, [
    [10.1, 3.8, [[0, 0], [3.8, 0], [3.2, 3.4], [2.5, 5.6], [0, 5.8]], -.1, .22, 1],
    [5.4, 2.5, [[0, 0], [2.5, 0], [1.9, 2.8], [1.4, 4.4], [0, 4.6]], -.14, .38, 1.5],
    [4.2, 1.4, [[0, 0], [1.4, 0], [.9, 2], [.4, 3], [0, 3.2]], -.18, .5, 2.1],
  ], band);
  return { chains: [{ links, gain: 1.3, hat: true }] };
}
function hatStargazer(r) {
  const m = cloth(0xd8e1f3, { roughness: .75 }), band = cloth(0x9cc1e8);
  mesh(lathe([[0, 1], [10.6, .7], [11.8, 0], [11.5, -.7], [9.5, -.8], [0, -.3]], { seg: 96, waveAmp: .35, waveCount: 4 }), m, r.hat, [0, 0, 0], [1, 1, .96]);
  const prof = [[0, 0], [6.8, 0], [6.1, 5], [4.6, 11], [3.1, 15], [0, 15.3]];
  mesh(lathe(prof, { seg: 72 }), m, r.hat);
  mesh(new THREE.TorusGeometry(6.6, 1, 18, 72), band, r.hat, [0, 1.5, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const sm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xdff1ff, emissiveIntensity: .6, roughness: .3, metalness: .4 });
  [[.4, 5.5, 1], [2.1, 8.5, .8], [3.6, 4.2, .9], [4.8, 10.5, .7], [5.9, 6.8, 1], [1.2, 12.3, .6], [3, 13, .55]].forEach(([a, h, s]) => {
    let rad = 0; for (let i = 1; i < prof.length; i++) if (h <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; rad = r0 + (r1 - r0) * (h - y0) / (y1 - y0); break; }
    const st = mesh(star3D(1, .3, .12, .18), sm, r.hat, [Math.sin(a) * (rad + .1), h, Math.cos(a) * (rad + .1)], [s, s, s]);
    st.lookAt(new THREE.Vector3(Math.sin(a) * 50, h, Math.cos(a) * 50).applyMatrix4(r.hat.matrixWorld));
  });
  const links = tipChain(r.hat, m, [[14.8, 3.1, [[0, 0], [3.1, 0], [2.1, 3.5], [1, 5.5], [0, 6]], -.05, .15, 1]], band);
  return { chains: [{ links, gain: 1, hat: true }] };
}

// ---------------- ПОСОХИ ----------------
function staffOrb(r) {
  const w = woodMat();
  mesh(taperTube([[0, -15, 0], [.4, -5, .2], [-.4, 5, -.2], [.3, 15, .2], [0, 25.2, 0]], .98, .78, { tubular: 110, radial: 22, ridges: 5, ridgeAmp: .07, twist: 1.5 }).geo, w, r.grip);
  mesh(sphere(1, 24, 16), w, r.grip, [0, -15, 0]);
  mesh(sphere(1.05), w, r.grip, [.55, 6.5, .3]); mesh(sphere(.9), w, r.grip, [-.45, 17, -.2]);
  mesh(lathe([[1.08, 2.4], [1.18, 1.2], [1.18, -1.2], [1.08, -2.4]], { seg: 40, folds: 10, foldAmp: .04, foldTop: 3, foldBottom: -3 }), cloth(0x9cc1e8), r.grip);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + .3, c = Math.cos(a), s = Math.sin(a);
    const { geo, curve } = taperTube([[0, 24.4, 0], [c * 2.1, 27, s * 2.1], [c * 3.35, 30, s * 3.35], [c * 2.3, 32.8, s * 2.3]], .62, .3, { radial: 12 });
    mesh(geo, w, r.grip); mesh(sphere(.36, 16, 12), w, r.grip, curve.getPointAt(1).toArray());
  }
  const glass = mesh(new THREE.SphereGeometry(2.75, 64, 40), new THREE.MeshPhysicalMaterial({ color: 0xeef8ff, roughness: .04, transmission: 1, thickness: 3, ior: 1.35 }), r.grip, [0, 30.4, 0]);
  glass.castShadow = false;
  const core = mesh(sphere(1.25), glowMat(), r.grip, [0, 30.4, 0]); core.castShadow = false;
  const motes = [0, 1, 2].map((i) => { const mm = mesh(sphere(.28, 12, 8), core.material, r.grip); mm.castShadow = false; return mm; });
  return {
    focus: core, glowMat: core.material,
    update(t) {
      core.scale.setScalar(1 + Math.sin(t * 2.3) * .08);
      motes.forEach((mm, i) => {
        const a = t * (1.4 + i * .35) + i * 2.1, tilt = .6 + i * .5;
        mm.position.set(Math.cos(a) * 4, 30.4 + Math.sin(a) * Math.sin(tilt) * 2.2, Math.sin(a) * Math.cos(tilt) * 4);
      });
    },
  };
}
function staffStar(r) {
  const w = woodMat();
  mesh(new THREE.CylinderGeometry(.75, .9, 42, 24), w, r.grip, [0, 6, 0]);
  mesh(new THREE.TorusGeometry(1.25, .45, 14, 28), metalMat(), r.grip, [0, 27.2, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const st = mesh(star3D(4.1, 1.1, .5, .8), glowMat(), r.grip, [0, 32, 0]); st.castShadow = false;
  return { focus: st, glowMat: st.material, update(t) { st.rotation.y = t * .8; } };
}

// ---------------- БОТИНКИ ----------------
function boots(r, curl) {
  const m = withRim(new THREE.MeshPhysicalMaterial({ color: 0xb2c7e0, roughness: .5, clearcoat: .4, sheen: .3 }), { strength: .35 });
  for (const f of [r.footL, r.footR]) {
    mesh(sphere(3.15), m, f, [0, 1.55, .6], [1, .78, 1.42]);
    mesh(new THREE.TorusGeometry(2.55, .38, 10, 40), cloth(0x9cc1e8), f, [0, 2.9, -.1], [1, 1.15, 1], [Math.PI / 2, 0, 0]);
    if (curl) {
      mesh(taperTube([[0, 1.5, 3], [0, 1.75, 5.6], [0, 3.2, 7.3], [0, 4.75, 7], [0, 5, 5.8]], 2.1, .5, { radial: 18, tubular: 40, ease: (u) => u ** .8 }).geo, m, f);
      mesh(sphere(.85, 20, 14), cloth(0xffffff), f, [0, 5, 5.7]);
    }
  }
  return {};
}

export const SLOTS = {
  hat:   { name: 'Шляпа', required: true, zone: 'hat', skins: { wanderer: { name: 'Странник', build: hatWanderer }, stargazer: { name: 'Звездочёт', build: hatStargazer } } },
  staff: { name: 'Посох', zone: 'staff', skins: { orb: { name: 'Сфера в когтях', build: staffOrb }, star: { name: 'Звезда', build: staffStar } } },
  boots: { name: 'Ботинки', zone: 'feet', skins: { curl: { name: 'Загнутые носы', build: (r) => boots(r, true) }, round: { name: 'Круглые', build: (r) => boots(r, false) } } },
  robe:  { name: 'Мантия', zone: 'body', skins: {
    silver: { name: 'Серебро', build: (r) => robe(r, { cloth: 0xdfe7f1, trimBase: '#9cc1e8', trimMark: '#ffffff', belt: 0xa9c9ec }) },
    dusk:   { name: 'Сумерки', build: (r) => robe(r, { cloth: 0xc6cdf0, trimBase: '#7d8ed6', trimMark: '#eef1ff', belt: 0x8fa0de }) } } },
  beard: { name: 'Борода', zone: 'head', skins: { long: { name: 'Длинная', build: (r) => hair(r, 11.5) }, short: { name: 'Короткая', build: (r) => hair(r, 6.5) } } },
};
export const DEFAULT_LOADOUT = { hat: 'wanderer', staff: 'orb', boots: 'curl', robe: 'silver', beard: 'long' };
