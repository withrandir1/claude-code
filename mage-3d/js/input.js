// Ввод: вращение пальцем с инерцией и тап по частям тела (зоны, как у Talking Tom).
import * as THREE from 'three';

export function createInput({ canvas, stage, camera, root, parallax, onTap }) {
  const st = { yawOff: 0, yawVel: 0, dragging: false, lastDrag: -1e9 };
  let lastX = 0, moved = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => { st.dragging = true; lastX = e.clientX; moved = 0; st.yawVel = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width) * 2 - 1; parallax.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!st.dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    const d = dx / stage.clientWidth * Math.PI * 1.6; st.yawOff += d; st.yawVel = d * 60;
  });
  canvas.addEventListener('pointerleave', () => { parallax.tx = parallax.ty = 0; });
  canvas.addEventListener('pointerup', (e) => {
    st.dragging = false; st.lastDrag = performance.now();
    if (moved >= 6) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(root, true).find((h) => h.object.userData.zone);
    onTap(hit ? hit.object.userData.zone : null);
  });
  st.update = (dt) => {
    if (st.dragging) return;
    st.yawOff += st.yawVel * dt; st.yawVel *= Math.exp(-4 * dt);
    if (performance.now() - st.lastDrag > 1400) st.yawOff += -st.yawOff * (1 - Math.exp(-dt / .45));
  };
  return st;
}
