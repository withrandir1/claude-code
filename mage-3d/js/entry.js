import { boot } from './main.js';
const stage = document.querySelector('#stage');
function fail(msg) {
  const f = document.querySelector('#fallback') || stage.appendChild(Object.assign(document.createElement('div'), { id: 'fallback', className: 'fallback' }));
  f.textContent = 'Маг не загрузился: ' + msg;
}
window.addEventListener('error', (e) => fail(e.message));
try {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('на этом устройстве выключен WebGL');
  boot({ stage, $: (s) => document.querySelector(s) });
  document.querySelector('#fallback')?.remove();
} catch (e) { fail(e.message); }
