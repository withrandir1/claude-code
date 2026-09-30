// Эффекты: кольца света, искры-звёздочки, облачка пыли. Мало, медленно, по дугам.
import * as THREE from 'three';
import { starShape, sphere } from './geometry.js';
import { E } from './motion.js';

export function createFx(scene, camera, reduced) {
  const live = [];
  const sparkGeo = new THREE.ShapeGeometry(starShape(4, 1.1));
  const basic = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
  function add(m, o) { scene.add(m); live.push({ m, t: -(o.delay || 0), ...o }); }
  return {
    ring(pos, r1 = 10, dur = 700, flat = false) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, flat ? .12 : .06, 8, 64), basic(0xffffff));
      m.position.copy(pos); if (flat) m.rotation.x = Math.PI / 2;
      add(m, { kind: 'ring', dur, r1, flat });
    },
    sparkles(pos, n, tint) {
      if (reduced) n = Math.min(n, 2);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * (.3 + Math.random() * .9);
        const m = new THREE.Mesh(sparkGeo, basic(i % 3 === 1 ? tint : 0xffffff)); m.position.copy(pos);
        add(m, { kind: 'spark', delay: i * 50, dur: 1200 + Math.random() * 400, v: new THREE.Vector3(Math.cos(a) * 14, -Math.sin(a) * 14, (Math.random() - .5) * 6), spin: (Math.random() - .5) * 2, s: .28 + Math.random() * .18 });
      }
    },
    puff(pos, spread = 7) {
      for (const s of [-1, 1]) { const m = new THREE.Mesh(sphere(2, 16, 10), basic(0xffffff)); m.position.set(pos.x + s * spread, pos.y + 1, pos.z); add(m, { kind: 'puff', dur: 560, s }); }
    },
    step(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i]; p.t += dt * 1000;
        p.m.visible = p.t >= 0; if (p.t < 0) continue;
        const u = p.t / p.dur;
        if (u >= 1) { scene.remove(p.m); p.m.material.dispose(); if (p.kind !== 'spark') p.m.geometry.dispose(); live.splice(i, 1); continue; }
        if (p.kind === 'ring') {
          p.m.scale.setScalar(1 + (p.r1 - 1) * (1 - 2 ** (-10 * u)));
          if (!p.flat) p.m.quaternion.copy(camera.quaternion);
          p.m.material.opacity = .85 * (1 - E.out(u));
        } else if (p.kind === 'spark') {
          p.v.multiplyScalar(Math.exp(-2.2 * dt)); p.v.y += 3 * dt; p.m.position.addScaledVector(p.v, dt);
          p.m.scale.setScalar(Math.max(.001, (u < .22 ? E.back(u / .22) : 1 - E.in((u - .22) / .78)) * p.s));
          p.m.quaternion.copy(camera.quaternion); p.m.rotateZ(p.spin * E.out(u));
        } else {
          p.m.position.x += p.s * 10 * dt * (1 - u); p.m.scale.setScalar(.5 + E.out(u) * 1.1); p.m.material.opacity = .6 * (1 - E.in(u));
        }
      }
    },
  };
}
