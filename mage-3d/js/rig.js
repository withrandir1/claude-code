// Скелет: точки крепления. Анимации двигают только их; скины только крепятся к ним.
import * as THREE from 'three';
import { mesh, joint, sphere } from './geometry.js';
import { skinMat, withRim } from './engine.js';

export const ARM_REST = .5;
export const ATTACH_POINTS = ['body', 'chest', 'head', 'hat', 'armL', 'armR', 'handL', 'handR', 'grip', 'footL', 'footR'];

export function createRig(scene) {
  const root = new THREE.Group(); scene.add(root);
  const hopper = joint(root);                                   // прыжки, раскачка шага
  const body = joint(hopper);                                   // дыхание, сжатие от земли
  const chest = joint(body, [0, 14, 0]);                        // верх тела: наклон, поворот
  const head = joint(chest, [0, 16, 0]);                        // шея
  const hat = joint(head, [0, 11.2, 0]);                        // макушка — место шляпы
  const armL = joint(chest, [-8.8, 12.4, 0], [0, 0, -ARM_REST]);
  const armR = joint(chest, [8.8, 12.4, 0], [0, 0, ARM_REST]);
  const handL = joint(armL, [0, -13.4, .4]);
  const handR = joint(armR, [0, -13.4, .4]);
  const grip = joint(handR, [0, 0, 1.4]);                       // хват посоха
  const footL = joint(body, [-4.4, 0, 2.2]);
  const footR = joint(body, [4.4, 0, 2.2]);

  // Лицо и руки — часть тела, не скин.
  const skin = skinMat();
  const zone = (o, z) => ((o.userData.zone = z), o);
  zone(mesh(sphere(6.3), skin, head, [0, 6.2, .4]), 'head');
  zone(mesh(sphere(1.95), skin, head, [0, 6.3, 6.9]), 'head');
  for (const s of [-1, 1]) {
    zone(mesh(sphere(1.5), skin, head, [s * 6.25, 6.4, .6], [.55, 1, .9]), 'head');
    mesh(sphere(1.25, 24, 16), withRim(new THREE.MeshPhysicalMaterial({ color: 0xf4a79d, roughness: .7 })), head, [s * 3.7, 5.1, 5.35], [1, .75, .4]);
    const eye = mesh(new THREE.TorusGeometry(1.1, .3, 12, 28, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x23426f, roughness: .3, clearcoat: 1 }), head, [s * 2.6, 7.7, 6.05]);
    eye.castShadow = false;
    const hand = joint(s < 0 ? handL : handR);
    zone(mesh(sphere(2.4), skin, hand, [0, 0, 0], [1, 1.05, .95]), 'body');
    mesh(sphere(1), skin, hand, [s * -1.5, .7, 1.2]);
  }
  return { root, hopper, body, chest, head, hat, armL, armR, handL, handR, grip, footL, footR };
}
