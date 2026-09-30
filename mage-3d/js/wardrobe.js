// Гардероб: надеть скин = снять всё, что прикрепил прежний, и собрать новый. Набор — обычные данные.
import { ATTACH_POINTS } from './rig.js';

export function createWardrobe(rig, SLOTS, defaults, storageKey = 'mage.loadout') {
  const worn = {};
  function equip(slot, id) {
    const def = SLOTS[slot]; if (!def?.skins[id]) return;
    const old = worn[slot];
    if (old) old.objects.forEach((o) => { o.parent?.remove(o); o.traverse((n) => n.geometry?.dispose()); });
    rig.root.updateMatrixWorld(true);
    const before = new Map(ATTACH_POINTS.map((p) => [p, new Set(rig[p].children)]));
    const api = def.skins[id].build(rig) || {};
    const objects = [];
    for (const p of ATTACH_POINTS) for (const c of rig[p].children) if (!before.get(p).has(c)) objects.push(c);
    objects.forEach((o) => o.traverse((n) => { if (n.isMesh && !n.userData.zone) n.userData.zone = def.zone; }));
    worn[slot] = { id, objects, api };
    try { localStorage.setItem(storageKey, JSON.stringify(loadout())); } catch {}
  }
  const loadout = () => Object.fromEntries(Object.entries(worn).map(([k, v]) => [k, v.id]));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch {}
  for (const slot of Object.keys(SLOTS)) equip(slot, SLOTS[slot].skins[saved[slot]] ? saved[slot] : defaults[slot]);
  return { worn, equip, loadout, apis: () => Object.values(worn).map((w) => w.api) };
}
