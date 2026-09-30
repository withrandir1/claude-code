// Геометрия-помощники: мягкие мультяшные формы для всех скинов.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

// Тело вращения. Опции:
//  folds / foldAmp / foldTop / foldBottom — вертикальные складки ткани, сильнее книзу;
//  waveAmp / waveCount — волна края (поля шляпы);
//  keepUV — сохранить UV (для орнамента), иначе швы сглаживаются слиянием вершин.
export function lathe(pts, o = {}) {
  const { seg = 64, phiStart = 0, phiLen = TAU, folds = 0, foldAmp = 0, foldTop = 1e9, foldBottom = 0,
    waveAmp = 0, waveCount = 0, keepUV = false } = o;
  let geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
  if (folds || waveAmp) {
    const p = geo.attributes.position;
    let rMax = 0;
    for (let i = 0; i < p.count; i++) rMax = Math.max(rMax, Math.hypot(p.getX(i), p.getZ(i)));
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const phi = Math.atan2(x, z);
      let k = 1;
      if (folds) {
        const f = THREE.MathUtils.clamp((foldTop - y) / (foldTop - foldBottom), 0, 1) ** 1.6;
        k += foldAmp * f * Math.sin(folds * phi);
      }
      p.setXYZ(i, x * k, y + (waveAmp ? waveAmp * Math.sin(waveCount * phi) * (r / rMax) ** 3 : 0), z * k);
    }
  }
  if (!keepUV && phiLen >= TAU - 1e-6) { geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-3); }
  geo.computeVertexNormals();
  return geo;
}

// Трубка по кривой с плавно меняющимся радиусом, по желанию с рёбрами-кручением (кора посоха).
export function taperTube(points, r0, r1, o = {}) {
  const { tubular = 48, radial = 16, ease = (u) => u, ridges = 0, ridgeAmp = 0, twist = 0 } = o;
  const curve = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)));
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular, c = curve.getPointAt(u);
    const r = r0 + (r1 - r0) * ease(u);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      const a = (j / radial) * TAU;
      const rr = r * (1 + ridgeAmp * Math.sin(ridges * a + twist * u * TAU));
      v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(rr).add(c);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return { geo, curve };
}

export function starShape(rOut = 4, rIn = 1.1) {
  const s = new THREE.Shape();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 2 - (k * Math.PI) / 4, r = k % 2 ? rIn : rOut;
    k ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
export function star3D(rOut, rIn, depth = .4, bevel = .6) {
  const g = new THREE.ExtrudeGeometry(starShape(rOut, rIn), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .75, bevelSegments: 5, curveSegments: 4 });
  g.center(); return g;
}

// Орнамент с референса: полоса с треугольниками.
export function trimTexture(base, mark, repeat = 18) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 64);
  g.fillStyle = mark;
  g.fillRect(0, 6, 128, 5); g.fillRect(0, 53, 128, 5);
  for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(i * 64 + 8, 46); g.lineTo(i * 64 + 32, 16); g.lineTo(i * 64 + 56, 46); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeat, 1); t.anisotropy = 8; return t;
}

export function radialTexture(stops, inner, outer, cy = 256) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, cy, inner, 256, 256, outer);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Сборка: меш с тенями, группа-сустав.
export function mesh(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const o = new THREE.Mesh(geo, mat); o.castShadow = o.receiveShadow = true;
  o.position.set(...pos); o.scale.set(...scale); o.rotation.set(...rot); parent.add(o); return o;
}
export function joint(parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); parent.add(g); return g;
}
export const sphere = (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h);
