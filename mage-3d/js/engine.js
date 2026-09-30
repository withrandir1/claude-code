// Сцена: рендер, свет витрины «как в играх», подиум, постобработка, мягкий контур-rim для материалов.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { radialTexture } from './geometry.js';

export function createEngine(stage) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = radialTexture([[0, '#7cc9ff'], [.6, '#2ea4ff'], [1, '#0391fb']], 20, 380, 200);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .35;

  const camera = new THREE.PerspectiveCamera(30, 5 / 6, 1, 1000);
  const camBase = new THREE.Vector3(0, 40, 150), camLook = new THREE.Vector3(0, 32, 0);
  camera.position.copy(camBase); camera.lookAt(camLook);

  // Свет: небо сверху, тёплый ключ, два холодных контровых — белый персонаж отделяется от неба.
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x6fb3f2, .7));
  const key = new THREE.DirectionalLight(0xfff1e2, 2.0);
  key.position.set(-40, 95, 75); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 85, bottom: -10, near: 10, far: 320 });
  key.shadow.radius = 7; key.shadow.bias = -.0003; key.shadow.normalBias = .3;
  scene.add(key);
  const rimA = new THREE.DirectionalLight(0xcfe9ff, 1.7); rimA.position.set(40, 55, -85); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xe8f4ff, 1.0); rimB.position.set(-50, 35, -65); scene.add(rimB);

  // Подиум, как на экране выбора персонажа.
  const podium = new THREE.Group(); scene.add(podium);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(22, 23.5, 2.2, 96), new THREE.MeshPhysicalMaterial({ color: 0xe6f2ff, roughness: .38, clearcoat: .7, clearcoatRoughness: .3 }));
  top.position.y = -1.1; top.receiveShadow = true; podium.add(top);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(23, .35, 12, 128), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }));
  edge.rotation.x = Math.PI / 2; edge.position.y = -.05; podium.add(edge);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(210,238,255,.32)'], [.55, 'rgba(210,238,255,.1)'], [1, 'rgba(210,238,255,0)']], 0, 256), transparent: true, depthWrite: false }));
  glowDisc.rotation.x = -Math.PI / 2; glowDisc.position.y = -2.3; podium.add(glowDisc);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(17, 48), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(10,79,156,.45)'], [1, 'rgba(10,79,156,0)']], 0, 256), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .03; scene.add(blob);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .4, 1.15);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  // Камера витрины: едва заметно плывёт и тянется к пальцу (параллакс).
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  function updateCamera(dt, t) {
    const k = 1 - Math.exp(-dt / .5);
    par.x += (par.tx - par.x) * k; par.y += (par.ty - par.y) * k;
    camera.position.set(camBase.x + par.x * 8 + Math.sin(t / 5) * 1.5, camBase.y - par.y * 5 + Math.sin(t / 4) * .8, camBase.z);
    camera.lookAt(camLook);
  }
  return { renderer, scene, camera, composer, bloom, blob, resize, updateCamera, parallax: par };
}

// Мягкий свет по краю формы (френель) — отличительный признак мультяшных игровых персонажей.
export function withRim(mat, { color = 0xe2f2ff, strength = .45, power = 2.4 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: new THREE.Color(color) };
    sh.uniforms.rimStrength = { value: strength };
    sh.uniforms.rimPower = { value: power };
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimStrength;\nuniform float rimPower;\n' +
      sh.fragmentShader.replace('#include <opaque_fragment>',
        'float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), rimPower);\n' +
        'outgoingLight += rimColor * rimF * rimStrength;\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => `rim-${strength}-${power}`;
  return mat;
}
export const cloth = (color, { rim, ...o } = {}) => withRim(new THREE.MeshPhysicalMaterial({ color, roughness: .82, sheen: .45, sheenRoughness: .55, sheenColor: 0xffffff, ...o }), rim);
export const skinMat = () => withRim(new THREE.MeshPhysicalMaterial({ color: 0xf2c6aa, roughness: .55, sheen: .4, sheenColor: 0xffe2d2 }), { color: 0xffe7da, strength: .3 });
