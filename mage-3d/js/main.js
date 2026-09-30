// Сборка: сцена + скелет + гардероб + движение + эффекты + ввод + пульт.
import * as THREE from 'three';
import { createEngine } from './engine.js';
import { createRig, ARM_REST } from './rig.js';
import { SLOTS, DEFAULT_LOADOUT, setStateLight, stateLight } from './skins.js';
import { createWardrobe } from './wardrobe.js';
import { Player, Chains, walkPose } from './motion.js';
import { createFx } from './fx.js';
import { createInput } from './input.js';

const STATES = [['white', '#FFFFFF', '#BFE6FF'], ['pink', '#ED7A92', '#FFA2B6'], ['red', '#D83B5C', '#FF5176'], ['orange', '#FF6333', '#FCA286'],
  ['yellow', '#F3AD2C', '#FFD17C'], ['green', '#6FB52B', '#BDFD7F'], ['blue', '#045DC3', '#429AFF'], ['purple', '#553AC1', '#8B6EFF']];
const TAP_REACTION = { hat: 'hatBoop', head: 'lookBack', body: 'party', feet: 'party', staff: 'cast' };
const FIDGETS = ['look', 'stretch', 'tapStaff'];

export function boot({ stage, $ }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AMP = reduced ? .4 : 1;
  const eng = createEngine(stage);
  const rig = createRig(eng.scene);
  const wardrobe = createWardrobe(rig, SLOTS, DEFAULT_LOADOUT);
  const fx = createFx(eng.scene, eng.camera, reduced);
  const chains = new Chains();
  const tag = $('#tag');
  let walkOn = false, walkAmp = 0, walkPh = 0, baseYaw = Math.PI;

  const staffLight = new THREE.PointLight(0xbfe6ff, 35, 45, 2); eng.scene.add(staffLight);
  const v3 = () => new THREE.Vector3();
  const focusPos = () => {
    const f = wardrobe.worn.staff?.api.focus;
    return f ? f.getWorldPosition(v3()) : rig.grip.localToWorld(v3().set(0, 30, 0));
  };
  const idleLabel = () => (walkOn ? 'странствует' : 'idle');

  const player = new Player((ev) => {
    const tint = stateLight;
    if (ev === 'burstSmall') { fx.ring(focusPos(), 9, 700); fx.sparkles(focusPos(), 4, tint); }
    else if (ev === 'burstBig') { fx.ring(focusPos(), 14, 900); fx.sparkles(focusPos(), 7, tint); }
    else if (ev === 'ringSmall') fx.ring(focusPos(), 9, 700);
    else if (ev === 'puff') fx.puff(rig.root.getWorldPosition(v3()));
    else if (ev === 'partyOpen') tag.textContent = 'открывается party mode';
    else if (ev === 'hatFlick') { const c = (wardrobe.worn.hat?.api.chains || [])[0]; if (c) chains.kick(c, 5, 3); }
    else if (ev === 'staffTap') { const p = rig.grip.localToWorld(v3().set(0, -15, 0)); p.y = .1; fx.ring(p, 6, 600, true); fx.puff(p, 2); }
    else if (ev === 'end') tag.textContent = idleLabel();
  });
  const play = (name) => { if (player.play(name)) tag.textContent = player.act.label; };

  const input = createInput({
    canvas: eng.renderer.domElement, stage, camera: eng.camera, root: rig.root, parallax: eng.parallax,
    onTap: (zone) => zone && play(TAP_REACTION[zone] || 'party'),
  });

  // ---------- Пульт ----------
  function renderSlots() {
    const host = $('#slots'); host.textContent = '';
    for (const [slot, def] of Object.entries(SLOTS)) {
      const row = document.createElement('div'); row.className = 'slot';
      const b = document.createElement('b'); b.textContent = def.name; row.appendChild(b);
      const chips = document.createElement('div'); chips.className = 'row';
      for (const [id, s] of Object.entries(def.skins)) {
        const c = document.createElement('button'); c.className = 'chip'; c.textContent = s.name;
        c.setAttribute('aria-pressed', wardrobe.worn[slot]?.id === id);
        c.addEventListener('click', () => { wardrobe.equip(slot, id); fx.ring(focusPos(), 7, 500); renderSlots(); });
        chips.appendChild(c);
      }
      row.appendChild(chips); host.appendChild(row);
    }
    $('#loadout').textContent = 'loadout = ' + JSON.stringify(wardrobe.loadout(), null, 2);
  }
  renderSlots();
  document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => play(b.dataset.act)));
  $('#walk').addEventListener('click', (e) => { walkOn = !walkOn; e.currentTarget.setAttribute('aria-pressed', walkOn); if (!player.busy) tag.textContent = idleLabel(); });
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    const target = b.dataset.view === 'front' ? 0 : Math.PI;
    input.yawOff += baseYaw - target; baseYaw = target;
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  STATES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.background = s[1]; b.setAttribute('aria-label', s[0]); b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => {
      setStateLight(s[2]);
      wardrobe.worn.staff?.api.glowMat?.emissive.set(s[2]);
      fx.ring(focusPos(), 8, 600);
      $('#swatches').querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    $('#swatches').appendChild(b);
  });

  // ---------- Кадр ----------
  const mini = $('#mini').getContext('2d');
  const clock = new THREE.Clock();
  let t = 0, lastY = 0, lastVY = 0, lastSide = 0, lastYaw = 0, nextFidget = 5000, lastFidget = '';
  function frame() {
    const dt = Math.max(1e-3, Math.min(.05, clock.getDelta())); t += dt;
    input.update(dt);
    const off = player.update(dt);

    // фоновая возня, когда никто не трогает
    if (!player.busy && !walkOn && !input.dragging) {
      nextFidget -= dt * 1000;
      if (nextFidget <= 0) {
        const pick = FIDGETS.filter((f) => f !== lastFidget)[Math.floor(Math.random() * (FIDGETS.length - 1))];
        lastFidget = pick; play(pick); nextFidget = 6000 + Math.random() * 4000;
      }
    }

    walkAmp += ((walkOn ? 1 : 0) - walkAmp) * (1 - Math.exp(-dt / .25));
    if (walkAmp > .002) walkPh += dt * Math.PI * 2 / 1.05;
    const w = walkPose(walkPh, walkAmp * AMP);
    rig.footL.position.set(-4.4, w.footL[0], 2.2 + w.footL[1]);
    rig.footR.position.set(4.4, w.footR[0], 2.2 + w.footR[1]);

    const br = Math.sin(t * Math.PI * 2 / 3.6) * AMP, brLate = Math.sin(t * Math.PI * 2 / 3.6 - .5) * AMP;
    const sq = off.sq * AMP;
    rig.root.rotation.y = baseYaw + input.yawOff + Math.sin(t / 3.2) * .08 * AMP;
    rig.hopper.position.y = off.y * AMP + w.bob;
    rig.hopper.rotation.z = w.sway;
    rig.body.scale.set(1 - sq * .55 - br * .006, 1 + sq + br * .012, 1 - sq * .55 - br * .006);
    rig.chest.rotation.set(off.lean + brLate * .012, off.twist, -w.sway * .5);
    rig.head.rotation.set(off.headPitch + Math.sin(t * Math.PI * 2 / 3.6 - 1) * .018 * AMP, off.headYaw, off.headRoll);
    rig.armL.rotation.set(off.armLx + w.swing, 0, -ARM_REST + off.armL - brLate * .025);
    rig.armR.rotation.set(off.armRx - w.swing * .5, 0, ARM_REST + off.armR + brLate * .025);
    rig.grip.rotation.z = -ARM_REST - off.armR * .9;
    rig.grip.position.y = off.gripY;
    const hs = off.hatSq; rig.hat.scale.set(1 - hs * .5, 1 + hs, 1 - hs * .5);

    // пружинящие звенья: от вертикального ускорения, раскачки и вращения
    const y = rig.hopper.position.y, vy = (y - lastY) / dt, ay = (vy - lastVY) / dt;
    lastY = y; lastVY = vy;
    const sideNow = w.sway + off.twist * .5 + rig.root.rotation.y * .25;
    const side = (sideNow - lastSide) / dt; lastSide = sideNow;
    chains.drive(wardrobe.apis().flatMap((a) => a.chains || []), { ay, side, t, amp: AMP }, dt);
    wardrobe.apis().forEach((a) => a.update?.(t, dt));

    const api = wardrobe.worn.staff?.api || {};
    if (api.glowMat) api.glowMat.emissiveIntensity = 2.6 + Math.sin(t * 2) * .3 + off.glow * 3;
    staffLight.position.copy(focusPos()); staffLight.color.copy(stateLight); staffLight.intensity = 30 + off.glow * 110;
    eng.bloom.strength = .45 + Math.max(0, off.glow) * .45;
    eng.blob.scale.setScalar(1 - Math.min(.5, y * .04)); eng.blob.material.opacity = 1 - Math.min(.6, y * .06);

    fx.step(dt);
    eng.updateCamera(dt, t);
    eng.composer.render();
    const c = eng.renderer.domElement, s = c.height * .9;
    mini.clearRect(0, 0, 168, 159);
    mini.drawImage(c, (c.width - s * 1.057) / 2, c.height * .02, s * 1.057, s, 0, 0, 168, 159);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
