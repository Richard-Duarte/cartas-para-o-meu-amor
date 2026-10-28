/* eslint-disable */
// @ts-nocheck
// Prévia 3D da entrega. Os GLB ficam em public/models e podem ser trocados arquivo por arquivo
// (pigeon, plane, stork, swan, horse, donkey, turtle + *_eyes.json e *_gait.json).
// Só o animal desta carta é baixado.
import 'leaflet/dist/leaflet.css';
import { mountJourneyScene } from './journeyScene.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { buildScene, softTex } from './scenes.js';
import { TIER } from './tier.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const SHELL = `
<section class="card map-card"><div id="map"></div><canvas id="mapfx"></canvas>
  <div class="map-ui"><div class="eta"><span id="eta">Em voo…</span><div class="bar"><i id="prog"></i></div></div><button id="skip" class="btn" type="button">Simular chegada</button></div></section>
<section id="arrival" class="arrival hidden">
  <div class="card stage-card"><p class="eyebrow">chegou para você</p><h2 id="landed"></h2><div class="stage" id="stageWrap"><canvas id="stage"></canvas></div><p id="hint" class="hint">Toque no animal para receber a carta · arraste para girar</p></div>
  <div class="card env-card"><p class="eyebrow">sua carta</p><h2 id="envTitle">Aguardando…</h2><div class="stage"><canvas id="envc"></canvas></div><p id="envHint" class="hint dim">Receba a carta</p></div>
</section>
<div id="flyer" class="flyer"></div>
<div id="letter" class="letter-overlay" aria-hidden="true"><article class="letter"><button id="close" class="close" type="button" aria-label="Fechar"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
<div id="letterPages"></div></article></div>`;

export async function mountDeliveryPreview(root, options) {
/** Versão dos .glb (troque quando um modelo mudar) para não usar a cópia antiga do cache. */
const MODEL_VERSION = 2;
/** Reduz texturas acima de `max` px (mantém proporção) antes de subir para a GPU. */
function capTextures(obj, max) {
  const seen = new Set();
  obj.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) for (const k of Object.keys(m)) {
      const t = m[k];
      if (!t || !t.isTexture || seen.has(t)) continue;
      seen.add(t);
      const img = t.image; const w = img && (img.width || img.videoWidth), h = img && (img.height || img.videoHeight);
      if (!w || !h || Math.max(w, h) <= max) continue;
      try {
        const s = max / Math.max(w, h); const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        if (img.close) try { img.close(); } catch (e) {}
        t.image = c; t.needsUpdate = true;
      } catch (e) {}
    }
  });
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => root.querySelector('#' + id);
// Sem endereço: cena ilustrada no lugar do mapa (sem Leaflet, sem tiles, sem coordenadas).
const SCENE = options.scene === 'sky' || options.scene === 'campo' ? options.scene : null;
const L = SCENE ? null : (await import('leaflet')).default;
const off = [];
const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };
let alive = true;
root.innerHTML = SHELL;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tweens = [];
let simMs = 0;
function tween(dur, fn, done) { tweens.push({ t0: simMs, dur: reduced ? Math.min(dur, 120) : dur, fn, done }); }
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; const u = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(ease(u), u); if (u >= 1) { tweens.splice(i, 1); tw.done && tw.done(); } }
}
const renderers = [];
function trackRenderer(r) {
  renderers.push(r);
  return r;
}
function loseRenderer(r) {
  if (!r) return;
  try { r.dispose(); } catch (e) {}
  try { r.forceContextLoss(); } catch (e) {}
}
function loseAllRenderers() {
  while (renderers.length) loseRenderer(renderers.pop());
}
// Sinal para o componente: o iOS derrubou um contexto WebGL (memória) → cai no mapa/cena estático.
let disposing = false;
function watchContext(canvas) {
  canvas.addEventListener('webglcontextlost', (e) => {
    if (disposing || !alive) return;
    try { e.preventDefault(); } catch (err) {}
    if (typeof options.onContextLost === 'function') options.onContextLost();
  }, { once: true });
}
function makeRenderer(canvas) {
  watchContext(canvas);
  const opts = [
    { antialias: true, alpha: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false },
    { antialias: false, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
  ];
  let last = null;
  for (const o of opts) {
    try {
      const r = new THREE.WebGLRenderer({ canvas, ...o });
      r.setPixelRatio(Math.min(devicePixelRatio, TIER.dpr));
      r.outputColorSpace = THREE.SRGBColorSpace;
      return trackRenderer(r);
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error('webgl-unavailable');
}
function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xd9c7b0, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); scene.add(d);
}
function fit(renderer, camera, el) {
  if (!el || !camera || !renderer || typeof renderer.setSize !== 'function') return;
  const w = el.clientWidth, h = el.clientHeight; if (w < 2 || h < 2) return; renderer.setSize(w, h, false);
  if (camera.isPerspectiveCamera) camera.aspect = w / h; else { camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2; }
  camera.updateProjectionMatrix();
}

// ---------- load model ----------
const draco = new DRACOLoader().setDecoderPath('/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
const ANIMALS = {
  pigeon: { n: 'O pombo', v: 'voa', land: 'O pombo pousou', fly: true, sp: 1 },
  plane: { n: 'O aviãozinho', v: 'voa', land: 'O aviãozinho pousou', fly: true, sp: 1.1 },
  stork: { n: 'A cegonha', v: 'voa', land: 'A cegonha pousou', fly: true, sp: 1 },
  swan: { n: 'O cisne', v: 'voa', land: 'O cisne pousou', fly: true, sp: 0.95 },
  horse: { n: 'O cavalo', v: 'trota', land: 'O cavalo chegou', fly: false, sp: 0.85 },
  donkey: { n: 'O burrinho', v: 'caminha', land: 'O burrinho chegou', fly: false, sp: 0.75 },
  turtle: { n: 'A tartaruga', v: 'caminha devagar', land: 'A tartaruga chegou', fly: false, sp: 0.5 },
};
const rawId = String(options.animalId || '').toLowerCase().trim();
const AID = ANIMALS[rawId] ? rawId : (ANIMALS[options.animalId] ? options.animalId : 'pigeon');
const AN = ANIMALS[AID];
$('landed').textContent = AN.land;
let gltf;
try {
  gltf = await loader.loadAsync(`/models/${AID}.glb?v=${MODEL_VERSION}`);
} catch (err) {
  draco.dispose();
  throw new Error(`model-load-failed:${AID}:${err && err.message ? err.message : err}`);
}
if (!alive || !root.isConnected) { draco.dispose(); return () => {}; }
// Teto de textura: cada contexto WebGL guarda a sua cópia (mapa, palco e envelope). Uma 4096² RGBA
// são 64 MB (+mipmaps) — no iPhone isso derrubava a página. Reduz qualquer textura maior que o teto.
capTextures(gltf.scene, TIER.name === 'low' ? 1024 : 2048);
// R7: the glTF exporter writes a stale first sample on every baked track (pose left over from the previous NLA strip),
// which popped at every clip start and loop wrap. Replace sample 0 by linear extrapolation of samples 1-2.
if (AID === 'stork') for (const cl of gltf.animations) for (const tr of cl.tracks) if (/morphTargetInfluences/.test(tr.name)) tr.setInterpolation(THREE.InterpolateDiscrete); /* R7j stork: RootTuck is an on/off swap; linear blending showed a 1-frame paper wing */
for (const cl of gltf.animations) for (const tr of cl.tracks) { const v = tr.values, c = v.length / tr.times.length; if (tr.times.length < 3 || /morphTargetInfluences/.test(tr.name)) continue;
  for (let k = 0; k < c; k++) v[k] = 2 * v[c + k] - v[2 * c + k];
  if (c === 4 && /quaternion/.test(tr.name)) { const l = Math.hypot(v[0], v[1], v[2], v[3]) || 1; for (let k = 0; k < 4; k++) v[k] /= l; } }
const clips = Object.fromEntries(gltf.animations.map((a) => [a.name, a]));
function instance() {
  const root = skClone(gltf.scene); root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  const mixer = new THREE.AnimationMixer(root);
  const noopAct = () => ({
    play() { return this; },
    reset() { return this; },
    stop() { return this; },
    fadeIn() { return this; },
    fadeOut() { return this; },
    crossFadeTo() { return this; },
    setLoop() { return this; },
    setEffectiveWeight() { return this; },
    setEffectiveTimeScale() { return this; },
    getEffectiveWeight() { return 0; },
    enabled: false,
    time: 0,
    clampWhenFinished: false,
  });
  const act = (n, once) => {
    const clip = clips[n];
    if (!clip) return noopAct();
    const a = mixer.clipAction(clip);
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    return a;
  };
  return { root, mixer, act, branch: root.getObjectByName('Branch'), envelope: root.getObjectByName('Envelope'), bundleMesh: root.getObjectByName('Bundle') };
}

// ---------- sound ----------
let muted = localStorage.getItem('cartas-mute') === '1', audioOK = false;
const SND = Object.fromEntries(['arrive', 'deliver', 'pet'].map((k) => {
  const a = new Audio(`/snd/${AID}_${k}.mp3`);
  a.preload = 'auto';
  a.playsInline = true;
  a.volume = 0.7;
  return [k, a];
}));
function play(k, vol = 0.7) {
  if (muted) return;
  const a = SND[k];
  if (!a) return;
  try {
    a.volume = vol;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.then) p.then(() => { audioOK = true; }).catch(() => {});
  } catch (e) {}
}
function unlock() {
  if (audioOK) return;
  // Destrava com áudio real (não mudo) — Chrome só libera playback unmuted no gesto do usuário.
  Object.values(SND).forEach((a) => {
    try {
      a.muted = false;
      a.volume = 0.001;
      const p = a.play();
      if (p && p.then) {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
          a.volume = 0.7;
          audioOK = true;
        }).catch(() => {
          a.volume = 0.7;
        });
      }
    } catch (e) {}
  });
}
['pointerdown', 'keydown', 'touchstart'].forEach((e) => listen(window, e, unlock, { once: true, capture: true }));
const muteBtn = document.createElement('button'); muteBtn.id = 'mute'; muteBtn.type = 'button'; muteBtn.className = 'mute';
const setMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', muted ? 'Ativar som' : 'Silenciar'); };
muteBtn.onclick = () => {
  unlock();
  muted = !muted;
  localStorage.setItem('cartas-mute', muted ? '1' : '0');
  setMute();
  if (!muted) play('pet', 0.4);
};
setMute();
root.appendChild(muteBtn);

// ---------- 1. map ----------
function endpoint(geo, fallback) {
  const lat = Number(geo && geo.lat), lng = Number(geo && geo.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : fallback;
}
const fromLL = endpoint(options.from, [-23.5505, -46.6333]);
const toLL = endpoint(options.to, [-22.9068, -43.1729]);
// Pins stay on the exact address; only the drawn route is nudged if the points coincide.
let routeFrom = fromLL;
let routeTo = toLL;
if (Math.hypot(routeFrom[0] - routeTo[0], routeFrom[1] - routeTo[1]) < 0.01) {
  routeTo = [routeTo[0] + 0.02, routeTo[1] + 0.02];
}
const span = Math.hypot(routeTo[0] - routeFrom[0], routeTo[1] - routeFrom[1]) || 1;
const bow = Math.max(span * 0.18, 0.08);
const CTRL = [(routeFrom[0] + routeTo[0]) / 2 + (-(routeTo[1] - routeFrom[1]) / span) * bow, (routeFrom[1] + routeTo[1]) / 2 + ((routeTo[0] - routeFrom[0]) / span) * bow];
const bez = (t) => [0, 1].map((k) => (1 - t) ** 2 * routeFrom[k] + 2 * (1 - t) * t * CTRL[k] + t * t * routeTo[k]);
const route = Array.from({ length: 80 }, (_, i) => bez(i / 79));
let map = null, sceneApi = null, routeBounds = null;
if (SCENE) {
  sceneApi = mountJourneyScene($('map'), { kind: SCENE, fromLabel: options.from.label, fromAnon: Boolean(options.from.anonymous), toLabel: options.to.label, reduced, frame: root.querySelector('.map-card') });
  root.querySelector('.map-card').classList.add('is-scene');
} else {
  map = L.map($('map'), { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap', maxZoom: 16 }).addTo(map);
  L.polyline(route, { color: '#e85a7a', weight: 3, dashArray: '6 9', opacity: 0.8 }).addTo(map);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pin = (ll, t) => {
    const icon = L.divIcon({
      className: 'delivery-pin-wrap',
      html: `<span class="delivery-pin"><span class="delivery-pin-name">${esc(t)}</span><span class="delivery-pin-dot" aria-hidden="true"></span></span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    return L.marker(ll, { icon, interactive: false, keyboard: false }).addTo(map);
  };
  pin(fromLL, options.from.label || 'Origem');
  pin(toLL, options.to.label || 'Destino');
  routeBounds = L.latLngBounds([fromLL, toLL, ...route]);
  var refreshLeaflet = function () {
    if (!alive) return;
    try {
      map.invalidateSize({ animate: false, pan: false });
      map.fitBounds(routeBounds, { paddingTopLeft: [56, 104], paddingBottomRight: [56, 56], maxZoom: 14 });
    } catch (e) {}
  };
  map.fitBounds(routeBounds, { paddingTopLeft: [56, 104], paddingBottomRight: [56, 56], maxZoom: 14 });
}
function refreshMapLayout() {
  if (!alive) return;
  if (!SCENE && typeof refreshLeaflet === 'function') refreshLeaflet();
  ARC = null;
}
const mapCanvas = $('mapfx'), mapEl = root.querySelector('.map-card');
let map3dOk = true;
let mr, ms, mc, flyer, yawG, bankG, aTravel, aGlide;
try {
  mr = makeRenderer(mapCanvas);
  ms = new THREE.Scene(); lights(ms);
  mc = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
  const tilt = THREE.MathUtils.degToRad(40); mc.position.set(0, 1500 * Math.cos(tilt), 1500 * Math.sin(tilt)); mc.lookAt(0, 0, 0);
  fit(mr, mc, mapEl);
  flyer = instance(); if (flyer.branch) flyer.branch.visible = false;
  yawG = new THREE.Group(); bankG = new THREE.Group(); yawG.add(bankG); bankG.add(flyer.root); ms.add(yawG);
  flyer.root.scale.setScalar(window.innerWidth < 700 ? 95 : 130); /* see FLY_SCALE */ flyer.root.position.y = -20;
  aTravel = flyer.act('Travel') || flyer.act('Idle');
  aGlide = clips.Glide ? flyer.act('Glide') : null;
  if (aTravel) aTravel.play();
  if (aGlide) { aGlide.play(); aGlide.setEffectiveWeight(0); }
} catch (err) {
  console.error('[delivery-map3d]', err);
  map3dOk = false;
  loseAllRenderers();
  mr = { render() {}, setSize() {}, dispose() {}, forceContextLoss() {}, info: { render: { calls: 0 } } };
  ms = null; mc = null;
  flyer = { mixer: { update() {} }, root: { scale: { setScalar() {} } }, act: () => null, branch: null, envelope: null, bundleMesh: null };
  yawG = { visible: true, position: { copy() {}, x: 0, y: 0, z: 0 }, rotation: { y: 0 }, updateMatrixWorld() {}, add() {} };
  bankG = { rotation: { z: 0 }, position: { y: 0 }, add() {} };
  aTravel = null; aGlide = null;
  if (mapCanvas) mapCanvas.style.display = 'none';
}
let gliding = false, phaseT = 0, phaseLim = 3;
function updateFlightMode(dt) {
  if (!map3dOk || !aGlide || !aTravel) return;
  phaseT += dt; const edge = progress < 0.1 || progress > 0.88;   // always flap at take-off and before landing
  if (((phaseT > phaseLim && !edge) || (gliding && edge)) && !reduced) { phaseT = 0; gliding = !gliding; phaseLim = gliding ? 1.4 + Math.random() * 1.2 : 2.4 + Math.random() * 1.8; const from = gliding ? aTravel : aGlide, to = gliding ? aGlide : aTravel; to.enabled = true; to.setEffectiveTimeScale(1); to.setEffectiveWeight(1); to.time = 0; from.crossFadeTo(to, 0.5, false); }
}
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function screenToWorld(px, py) {
  const w = mapEl.clientWidth, h = mapEl.clientHeight; ray.setFromCamera(new THREE.Vector2((px / w) * 2 - 1, -(py / h) * 2 + 1), mc);
  const v = new THREE.Vector3(); ray.ray.intersectPlane(plane, v); return v;
}
// sub-pixel container point (Leaflet's latLngToContainerPoint rounds to whole pixels -> visible stepping)
const pt = (t) => { if (sceneApi) return sceneApi.point(t); const ll = bez(Math.min(1, Math.max(0, t))); return map.project(L.latLng(ll[0], ll[1])).subtract(map.getPixelOrigin()).add(map._getMapPanePos()); };
// arc-length table (screen px) so the speed along the curve is uniform, plus an eased velocity profile
let ARC = null;
function buildArc() { const n = 240; const P = [], L = [0]; for (let i = 0; i <= n; i++) P.push(pt(i / n)); for (let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y)); ARC = { n, L, len: L[n] }; }
function arcT(f) { if (!ARC) buildArc(); const target = f * ARC.len, L = ARC.L; let lo = 0, hi = ARC.n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < target) lo = m; else hi = m; } const u = (target - L[lo]) / Math.max(1e-6, L[hi] - L[lo]); return (lo + u) / ARC.n; }
// velocity profile: smooth ramp-up over the first 10%, ramp-down over the last 12%; F(tau) = normalised integral
const VPROF = (() => { const n = 400, a = 0.1, b = 0.12, ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }; const v = (x) => Math.max(0.04, ss(x / a)) * Math.max(0.04, ss((1 - x) / b)); const F = [0]; for (let i = 1; i <= n; i++) F.push(F[i - 1] + v((i - 0.5) / n)); return F.map((x) => x / F[n]); })();
const arcFrac = (tau) => { const x = Math.min(1, Math.max(0, tau)) * (VPROF.length - 1); const i = Math.min(VPROF.length - 2, Math.floor(x)); return VPROF[i] + (VPROF[i + 1] - VPROF[i]) * (x - i); };
let progress = 0, yawS = null, yawRate = 0, bank = 0, arrived = false, tScale = 1;
let skipping = false, skipFrom = 0, skipElapsed = 0, synced = false;
const FLY_SCALE = window.innerWidth < 700 ? 95 : 130;
let GAIT = null; if (!AN.fly) fetch(`/models/${AID}_gait.json`).then((r) => r.ok ? r.json() : null).then((g) => { if (!alive || !g) return; GAIT = g; }).catch(() => {});
const prevPos = new THREE.Vector3(); let havePrev = false;
$('skip').onclick = () => {
  unlock();
  if (arrived || skipping) return;
  skipping = true;
  skipFrom = progress;
  skipElapsed = 0;
  play('pet', 0.25);
};

// ---------- 2. arrival stage (real 3D set per animal) ----------
const stageEl = $('stage').parentElement;
let stageReady = true;
let sr;
try {
  sr = makeRenderer($('stage'));
} catch (err) {
  console.error('[delivery-stage-gl]', err);
  stageReady = false;
  // Continua só com o mapa — evita a tela vermelha quando o aparelho limita WebGL.
  sr = {
    dispose() {},
    forceContextLoss() {},
    setSize() {},
    render() {},
    shadowMap: { enabled: false, type: 0 },
    toneMapping: 0,
    toneMappingExposure: 1,
    info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } },
  };
}
const ss = new THREE.Scene();
if (stageReady) {
  sr.shadowMap.enabled = true; sr.shadowMap.type = TIER.softShadow ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; sr.toneMapping = THREE.ACESFilmicToneMapping; sr.toneMappingExposure = 0.95;
}
const HGT = { plane: 0.5, pigeon: 0.62, stork: 0.8, swan: 0.62, horse: 0.62, donkey: 0.62, turtle: 0.4 }[AID];
const kit = null;
const SET = buildScene(AID, kit, HGT); ss.add(SET.root);
if (SET.fog) ss.fog = new THREE.Fog(...SET.fog);
if (stageReady) {
  if (TIER.name === 'low') { // no 1.4 MB HDR on phones: tiny procedural sky/ground gradient environment
    const es_ = new THREE.Scene(); const g = new THREE.SphereGeometry(10, 24, 12); const c = []; const top = new THREE.Color(SET.sky[0]), hor = new THREE.Color(SET.sky[1]), gr = new THREE.Color(0x9c8a6a);
    for (let i = 0; i < g.attributes.position.count; i++) { const y = g.attributes.position.getY(i) / 10; const col = y > 0 ? hor.clone().lerp(top, Math.min(1, y * 1.6)) : hor.clone().lerp(gr, Math.min(1, -y * 3)); c.push(col.r, col.g, col.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); es_.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pm = new THREE.PMREMGenerator(sr); ss.environment = pm.fromScene(es_, 0.04).texture; ss.environmentIntensity = AID === 'plane' ? 0.75 : 0.45; pm.dispose();
  } else new RGBELoader().load('/env/sky_1k.hdr', (t) => { if (!alive || !stageReady) { t.dispose(); return; } t.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(sr); ss.environment = pm.fromEquirectangular(t).texture; ss.environmentIntensity = AID === 'plane' ? 0.75 : 0.45; t.dispose(); pm.dispose(); });
}
ss.add(new THREE.HemisphereLight(0xfff1dc, 0xb3a487, 0.85));
const sun = new THREE.DirectionalLight(0xffdfb8, 2.0); sun.position.set(2.5, 4.5, 2.2); sun.castShadow = stageReady; if (stageReady) sun.shadow.mapSize.set(TIER.shadow, TIER.shadow);
if (stageReady) Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 16 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; ss.add(sun); ss.add(sun.target);
const perch = instance(); ss.add(perch.root);
if (perch.branch) perch.branch.visible = false;
perch.root.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });
if (SET.sink) perch.root.position.y = SET.sink;
const ENV_HIDDEN = { turtle: 1, plane: 1 }[AID]; // pony/donkey: the letter peeks out of the satchel during the carry
if ((ENV_HIDDEN || AID === 'stork') && perch.envelope) perch.envelope.visible = false;
let bundleCarried = AID === 'stork';
const MB = AID === 'stork' && !!perch.bundleMesh; /* r7s: the carried bundle is a clay mesh skinned to the head bone inside the glb */
// soft contact shadow (cblob) that follows the animal's root bone
const boneBy = (re) => { let b = null; perch.root.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
const rootBone = boneBy(/^(tripo)?:*Root$|Root/), headBone = boneBy(/Head_1$/) || boneBy(/Head_0$/);
const cblob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softTex('soft'), color: 0x2a2010, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
cblob.material.map.colorSpace = THREE.NoColorSpace; cblob.rotation.x = -Math.PI / 2; cblob.renderOrder = 2;
if (SET.groundY !== null && AID !== 'pigeon' && AID !== 'stork') ss.add(cblob);
// ----- eyelids: clay lids that follow the head curvature, built from eye data found on the texture -----
const EYES = await fetch(`/models/${AID}_eyes.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
const lids = [];
/* R7n turtle: modelled eyelids (Lid_0/Lid_1, skinned to the head, morphs Blink25..Blink100) replace the runtime lids */
const TLIDS = []; if (AID === 'turtle') perch.root.traverse((o) => { if (o.isMesh && /^Lid_/.test(o.name) && o.morphTargetInfluences) { o.frustumCulled = false; o.visible = false; o.userData.mlid = true; TLIDS.push(o); } });
if (EYES && !TLIDS.length) {
  perch.root.updateMatrixWorld(true);
  const bn = EYES.bone.replace(/[\[\]\.:\/]/g, '').replace(/\s/g, '_'); let hb = null; perch.root.traverse((o) => { if (!hb && o.isBone && o.name === bn) hb = o; });
  if (!hb) hb = perch.root.getObjectByName(bn) || headBone;
  // rigid (bone-parented) model (the plane): read the eye domes straight from the loaded 'Eye' material meshes
  { let sk = false; perch.root.traverse((o) => { if (o.isSkinnedMesh) sk = true; });
    if (!sk) { const pts = []; const v = new THREE.Vector3(); perch.root.traverse((o) => { if (o.isMesh && /^Eye/.test(o.material.name)) { const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pts.push(v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).clone()); } });
      if (pts.length) { const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length; EYES.eyes = [1, -1].map((sg) => { const q = pts.filter((p) => (p.x - cx) * sg > 0); const bb = new THREE.Box3().setFromPoints(q); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3()); const r = Math.max(sz.x, sz.y) / 2; const n = new THREE.Vector3(0, 0, 1); const base = c.clone(); base.z = bb.min.z + 0.002; const apex = base.clone().addScaledVector(n, Math.max(sz.z, r * 0.5));
        const k = 1.25 * r; const P = { xp: base.clone().add(new THREE.Vector3(k, 0, 0)), xm: base.clone().add(new THREE.Vector3(-k, 0, 0)), yp: base.clone().add(new THREE.Vector3(0, k, 0)), ym: base.clone().add(new THREE.Vector3(0, -k, 0)) };
        return { c: apex.toArray(), n: [0, 0, 1], rw: r, rh: r, skin: [0.11, 0.13, 0.27], P: Object.fromEntries(Object.entries(P).map(([kk, vv]) => [kk, vv.toArray()])) }; }); } } }
  // R6: refine every eye against the real texture: centre on the dark painted eye, size from its spread,
  // and lid colour = median skin colour in a ring just around the eye
  let LB = null; perch.root.traverse((o) => { if (o.isSkinnedMesh && !/Envelope|Satchel/.test(o.name) && (!LB || o.geometry.attributes.position.count > LB.geometry.attributes.position.count)) LB = o; });
  const TS = (() => { const img = LB && LB.material && LB.material.map && LB.material.map.image; if (!img || !img.width) return null; const w = Math.min(512, img.width), h = Math.min(512, img.height); const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h); const d = cx.getImageData(0, 0, w, h).data; return (u, v) => { const x = Math.min(w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * w))), y = Math.min(h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * h))); const i = (y * w + x) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; }; })();
  // R7j+: refine against geometry-space positions when meshopt remapped the body (Q folded into boneInverses)
  let geoInv = null;
  if (LB && LB.isSkinnedMesh && LB.skeleton) {
    perch.root.updateMatrixWorld(true); LB.updateMatrixWorld(true);
    const hi0 = Math.max(0, LB.skeleton.bones.findIndex((b) => b.name === bn || b.name.endsWith(bn)));
    geoInv = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().multiplyMatrices(LB.skeleton.bones[hi0].matrixWorld, LB.skeleton.boneInverses[hi0]), LB.bindMatrix).premultiply(LB.bindMatrixInverse).premultiply(LB.matrixWorld).invert().multiply(perch.root.matrixWorld);
  }
  if (TS && LB.geometry.attributes.uv) for (const e of EYES.eyes) {
    const P = LB.geometry.attributes.position, UV = LB.geometry.attributes.uv, NN = LB.geometry.attributes.normal; const c0 = new THREE.Vector3(...e.c); if (geoInv) c0.applyMatrix4(geoInv); let n0 = new THREE.Vector3(...e.n).normalize(); const R0 = Math.max(e.rw, e.rh) * 2.2; const v = new THREE.Vector3(), nv = new THREE.Vector3();
    const dark = [], ring = [], darkN = [];
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const d = v.distanceTo(c0); if (d > R0 * 1.25) continue; if (NN) { nv.fromBufferAttribute(NN, i); if (nv.dot(n0) < 0.2) continue; } const col = TS(UV.getX(i), UV.getY(i)); const lum = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2]; if (lum < 0.2 && d < R0) { dark.push(v.clone()); if (NN) darkN.push(nv.clone()); } else if (d > R0 * 0.75) ring.push(col); }
    if (AID !== 'turtle' && dark.length >= 4) { const cd = dark.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / dark.length); const sh = cd.clone().sub(c0); sh.addScaledVector(n0, -sh.dot(n0)); if (sh.length() < Math.max(e.rw, e.rh) * 1.2) { let shM = sh.clone(); if (geoInv) { const invG = geoInv.clone().invert(); const a = c0.clone().applyMatrix4(invG), b = c0.clone().add(sh).applyMatrix4(invG); shM = b.sub(a); } for (const k of Object.keys(e.P)) e.P[k] = new THREE.Vector3(...e.P[k]).add(shM).toArray(); e.c = new THREE.Vector3(...e.c).add(shM).toArray(); } e.refined = dark.length; }
    if (ring.length >= 6) { const bright = ring.filter((c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] > 0.28); const src = bright.length >= 4 ? bright : ring; const med = [0, 1, 2].map((k) => { const a = src.map((c) => c[k]).sort((x, y) => x - y); return a[a.length >> 1]; }); e.skin = med; }
  }
  if (AID === 'turtle') for (const e of EYES.eyes) {
    // eyes.json centers from eyes2; chibi eyes face +Z — build shutter axes in model space (not lateral hit normals)
    e.rw = Math.max(e.rw * 1.9, 0.03); e.rh = Math.max(e.rh * 2.5, 0.028);
    const c = new THREE.Vector3(...e.c);
    const n = new THREE.Vector3(Math.sign(c.x || 1) * 0.15, 0.05, 1).normalize(); // slight outward
    e.n = n.toArray();
    const up = new THREE.Vector3(0, 1, 0), rt = new THREE.Vector3().crossVectors(up, n).normalize();
    up.copy(new THREE.Vector3().crossVectors(n, rt).normalize()); // re-orthonormalize
    const k = 1.45;
    e.P = { xp: c.clone().addScaledVector(rt, e.rw * k).toArray(), xm: c.clone().addScaledVector(rt, -e.rw * k).toArray(),
            yp: c.clone().addScaledVector(up, e.rh * k).toArray(), ym: c.clone().addScaledVector(up, -e.rh * k).toArray() };
    e.refined = e.refined || 1;
  }
  if (AID === 'donkey') for (const e of EYES.eyes) {
    // R7o3: face-matched tan-grey (blend ring sample toward clean muzzle grey); forward normal
    e.rw = Math.max(e.rw, 0.026); e.rh = Math.max(e.rh, 0.026);
    const n = new THREE.Vector3(...e.n).normalize();
    n.z = Math.max(n.z, 0.82); n.normalize(); e.n = n.toArray();
    const face = [0.78, 0.72, 0.64];
    if (e.skin) { const lum = 0.3 * e.skin[0] + 0.59 * e.skin[1] + 0.11 * e.skin[2];
      e.skin = e.skin.map((x, i) => Math.min(0.9, (lum > 0.4 ? x * 0.55 + face[i] * 0.45 : face[i]))); }
    else e.skin = face;
  }
  for (const e of EYES.eyes) {
    if (AID === 'plane') continue; // r7p: no lids
    const c = new THREE.Vector3(...e.c); let n = new THREE.Vector3(...e.n).normalize(); if (n.z < 0.2) n.z = 0.2; n.normalize();
    const up0 = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize(), rt0 = new THREE.Vector3().crossVectors(up0, n).normalize();
    if (AID === 'donkey') {
      /* R7o4/r7p: shader spherical-cap lid — donkey only (plane: no blink). */
      const re = Math.max(e.rw, e.rh);
      const R = re * 1.22;
      const skCol = e.skin || [0.78, 0.72, 0.64];
      const skC = new THREE.Color().setRGB(...skCol, THREE.SRGBColorSpace);
      const geo = new THREE.SphereGeometry(R, 64, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: skC, roughness: 0.58, metalness: 0.03,
        side: THREE.FrontSide, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const uClose = { value: 0 }, uArch = { value: 0.16 }, uCrease = { value: 0.82 };
      mat.userData.uClose = uClose; // shared object — setLids mutates .value
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uClose = uClose;
        shader.uniforms.uArch = uArch;
        shader.uniforms.uCrease = uCrease;
        // derivatives for smooth rim AA
        mat.userData.shader = shader;
        shader.vertexShader = 'varying vec3 vLidDir;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLidDir = normalize(transformed);\n');
        shader.fragmentShader = 'varying vec3 vLidDir;\nuniform float uClose;\nuniform float uArch;\nuniform float uCrease;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
          '#include <map_fragment>',
          '  if (vLidDir.z < -0.05) discard;',
          '  float elev = asin(clamp(vLidDir.y, -1.0, 1.0));',
          '  float azim = atan(vLidDir.x, max(0.05, vLidDir.z));',
          '  float arch = uArch * (azim * azim) * (1.0 + 0.5 * uClose);',
          '  float edge = 1.57079632679 - uClose * 3.14159265 - arch;',
          '  float aa = max(0.06, fwidth(elev) * 3.0);',
          '  float keep = smoothstep(edge - aa, edge + aa * 0.5, elev);',
          '  if (keep < 0.01) discard;',
          '  diffuseColor.rgb *= mix(uCrease, 1.0, keep);',
          '  float crown = pow(max(0.0, vLidDir.z), 1.2) * max(0.0, 0.2 + vLidDir.y);',
          '  diffuseColor.rgb += crown * 0.14;',
          '  diffuseColor.a *= keep;',
        ].join('\n'));
      };
      mat.customProgramCacheKey = () => 'shaderLid_' + AID;
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; m.frustumCulled = false; m.userData.shaderLid = true; m.userData.steps = null;
      // Orient: local +Y=up0, +Z=n, +X=rt0; place at eye centre (slightly along n so shell clears cornea)
      const basis = new THREE.Matrix4().makeBasis(rt0, up0, n);
      const q = new THREE.Quaternion().setFromRotationMatrix(basis);
      const pos = c.clone().addScaledVector(n, re * 0.04);
      lids.push(m);
      perch.root.updateMatrixWorld(true);
      if (hb) {
        hb.updateWorldMatrix(true, false);
        const posW = pos.clone(); perch.root.localToWorld(posW);
        const qWorld = q.clone();
        const qParent = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(hb.matrixWorld));
        const scl = new THREE.Vector3(); hb.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scl);
        const sAvg = Math.max(1e-6, (Math.abs(scl.x) + Math.abs(scl.y) + Math.abs(scl.z)) / 3);
        hb.add(m);
        hb.worldToLocal(posW); m.position.copy(posW);
        m.quaternion.copy(qParent.clone().invert().multiply(qWorld));
        m.scale.setScalar(1 / sAvg); // Body/bone scale must not shrink the spherical shell
      } else {
        m.position.copy(pos); m.quaternion.copy(q); perch.root.add(m);
      }
      continue;
    }
    const steps = [];
    let Rh;
    const up = up0, rt = rt0;
    const rw = e.rw * (AID === 'turtle' ? 2.1 : 1.6), rh = e.rh * (AID === 'turtle' ? 2.3 : 1.55); Rh = Math.max(rw, rh) * 2.4; const eps = Math.max(rw, rh) * (AID === 'turtle' ? 0.32 : 0.12);
    const PV = (k) => new THREE.Vector3(...e.P[k]); const sc_ = AID === 'turtle' ? 1.2 : 0.9;
    const QX = PV('xp').sub(PV('xm')).multiplyScalar(0.5 * sc_), QY = PV('yp').sub(PV('ym')).multiplyScalar(0.5 * sc_);
    const QXX = PV('xp').add(PV('xm')).multiplyScalar(0.5).sub(c).multiplyScalar(sc_ * sc_), QYY = PV('yp').add(PV('ym')).multiplyScalar(0.5).sub(c).multiplyScalar(sc_ * sc_);
    n.crossVectors(QX, QY).normalize(); if (n.z < 0) n.negate();
    for (let s = 1; s <= 8; s++) {
      const k = s / 8, pos = [], idx = [], NA = 14, NB = 8;
      for (let j = 0; j <= NB; j++) for (let i = 0; i <= NA; i++) {
        const u = i / NA * 2 - 1; const top = 1.0; const closeK = AID === 'horse' ? 2.25 : 2.12; const low = 1 - closeK * k + 0.2 * k * u * u; const v = j / NB; const vv = top + (low - top) * v;
        const span = Math.pow(Math.max(0.0005, 1 - Math.pow(Math.abs(vv) / 1.02, 2.3)), 1 / 2.3); const uu = u * span;
        const p = c.clone().addScaledVector(QX, uu).addScaledVector(QY, vv).addScaledVector(QXX, uu * uu).addScaledVector(QYY, vv * vv).addScaledVector(n, eps * (1 - 0.35 * Math.abs(uu)) * (1 - 0.2 * vv * vv)); pos.push(p.x, p.y, p.z);
        if (i < NA && j < NB) { const q = j * (NA + 1) + i; idx.push(q, q + NA + 1, q + 1, q + 1, q + NA + 1, q + NA + 2); }
      }
      const cols = []; const sk = new THREE.Color().setRGB(...e.skin, THREE.SRGBColorSpace);
      { const lum = 0.3 * sk.r + 0.59 * sk.g + 0.11 * sk.b; if (lum < 0.38) { const lift = (0.42 - lum) / Math.max(lum, 1e-3); sk.r = Math.min(1, sk.r * (1 + lift * 0.55)); sk.g = Math.min(1, sk.g * (1 + lift * 0.55)); sk.b = Math.min(1, sk.b * (1 + lift * 0.55)); } }
      const lash = sk.clone().multiplyScalar(AID === 'horse' ? 0.62 : 0.38);
      for (let j = 0; j <= NB; j++) for (let i = 0; i <= NA; i++) { const cc = j >= NB - 1 && k > 0.6 ? lash : j === NB - 2 && k > 0.6 ? sk.clone().lerp(lash, 0.45) : sk; cols.push(cc.r, cc.g, cc.b); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); steps.push(g);
    }
    const sk0 = e.skin || [0.7, 0.67, 0.64];
    const m = new THREE.Mesh(steps[0], new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    m.visible = false; m.userData.steps = steps; lids.push(m);
    let body = null; perch.root.traverse((o) => { if (o.isSkinnedMesh && !/Envelope/.test(o.name) && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
    if (body) {
      /* Meshopt (pigeon/swan/horse/turtle/stork) folds dequant Q into boneInverses -> geometry != model space.
         Q = boneWorld(rest)*boneInverse ≈ I when uncompressed, so this inv is safe for every skinned animal. */
      const inv = new THREE.Matrix4();
      const bp = body.geometry.attributes.position, si = body.geometry.attributes.skinIndex, sw = body.geometry.attributes.skinWeight;
      perch.root.updateMatrixWorld(true); body.updateMatrixWorld(true);
      const hi = Math.max(0, body.skeleton.bones.findIndex((b) => b.name === bn || b.name.endsWith(bn)));
      inv.multiplyMatrices(new THREE.Matrix4().multiplyMatrices(body.skeleton.bones[hi].matrixWorld, body.skeleton.boneInverses[hi]), body.bindMatrix).premultiply(body.bindMatrixInverse).premultiply(body.matrixWorld).invert().multiply(perch.root.matrixWorld);
      const cl = c.clone().applyMatrix4(inv), near = []; const tv = new THREE.Vector3(); const lim = (Rh * (AID === 'turtle' ? 1.35 : 0.9)) ** 2;
      const headIdx = hi;
      for (let i = 0; i < bp.count; i++) {
        tv.fromBufferAttribute(bp, i); if (tv.distanceToSquared(cl) > lim) continue;
        let hw = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === headIdx) hw += sw.getComponent(i, k);
        if (AID === 'turtle' && hw < 0.35) continue;
        near.push(i);
      }
      if (near.length < 8) { for (let i = 0; i < bp.count; i++) { tv.fromBufferAttribute(bp, i); if (tv.distanceToSquared(cl) < lim) near.push(i); } }
      for (const g of steps) {
        const gp = g.attributes.position, SI = new Uint16Array(gp.count * 4), SW = new Float32Array(gp.count * 4);
        for (let v = 0; v < gp.count; v++) { tv.fromBufferAttribute(gp, v).applyMatrix4(inv); gp.setXYZ(v, tv.x, tv.y, tv.z); let best = near[0] ?? 0, bd = 1e9; for (const i of near) { const d = (bp.getX(i) - tv.x) ** 2 + (bp.getY(i) - tv.y) ** 2 + (bp.getZ(i) - tv.z) ** 2; if (d < bd) { bd = d; best = i; } } for (let k = 0; k < 4; k++) { SI[v * 4 + k] = si.getComponent(best, k); SW[v * 4 + k] = sw.getComponent(best, k); } }
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); g.computeVertexNormals();
      }
      const sm = new THREE.SkinnedMesh(steps[0], m.material); sm.visible = false; sm.frustumCulled = false; sm.userData.steps = steps; body.parent.add(sm); sm.position.copy(body.position); sm.quaternion.copy(body.quaternion); sm.scale.copy(body.scale); sm.bind(body.skeleton, body.bindMatrix); lids[lids.length - 1] = sm;
    } else { perch.root.add(m); hb.attach(m); }
  }
}


var PET_SMILE = false;
let blinkK = 0, blinkT = 2 + Math.random() * 3, blinkPh = -1, blinkDouble = false, forceLid = null;
function setLids(k) {
  for (const l of TLIDS) { if (k <= 0.02) { l.visible = false; continue; } l.visible = true; const x = Math.min(4, k * 4), i = Math.min(3, Math.floor(x)), fr = x - i, mi = l.morphTargetInfluences; mi.fill(0); if (x >= 4) mi[3] = 1; else { if (i > 0) mi[i - 1] = 1 - fr; mi[i] = fr; } }
  for (const l of lids) {
    if (l.userData.shaderLid) {
      const u = l.material && l.material.userData && l.material.userData.uClose;
      if (u) u.value = k;
      if (k <= 0.02) { l.visible = false; continue; }
      l.visible = true;
      continue;
    }
    if (k <= 0.02) { l.visible = false; continue; }
    l.visible = true;
    l.geometry = l.userData.steps[Math.min(7, Math.max(0, Math.round(k * 8) - 1))];
  }
}
function updBlink(dt) {
  if (AID === 'plane') { setLids(0); return; } // r7p: plane never blinks — keep original eyes
  const petting = petA && petA.isRunning() && petA.getEffectiveWeight() > 0.3;
  if (forceLid !== null) { setLids(forceLid); return; }
  if (petting) { blinkK = Math.min(1, blinkK + dt * 8); setLids(blinkK); return; }
  if (blinkPh < 0) { blinkT -= dt; if (blinkT <= 0) { blinkPh = 0; blinkDouble = !blinkDouble && Math.random() < 0.22; } else { blinkK = Math.max(0, blinkK - dt * 8); setLids(blinkK); return; } }
  blinkPh += dt; const c = 0.07, h = 0.05, o = 0.1; const t = blinkPh;
  blinkK = t < c ? t / c : t < c + h ? 1 : Math.max(0, 1 - (t - c - h) / o);
  if (t > c + h + o) { blinkPh = -1; blinkK = 0; blinkT = blinkDouble ? 0.12 : 2 + Math.random() * 4; }
  setLids(blinkK);
}
// ----- spontaneous fidgets while waiting / after delivery -----
const FIDS = [1, 2, 3].map((i) => `Fidget_${i}`).filter((n) => clips[n]);
let fidT = 6 + Math.random() * 9, fidA = null;
const FID_SND = { stork: { 3: ['deliver', 0.25] }, donkey: { 3: ['arrive', 0.2] }, plane: { 3: ['pet', 0.3] }, horse: { 2: ['arrive', 0.2] }, pigeon: { 2: ['pet', 0.25] } }[AID] || {};
// R7: weight-conserving crossfade: every perch action that is currently contributing fades out, target fades in
// (chained crossFadeTo calls left the total weight < 1 and the rig blended towards the bind pose -> pops)
function xfade(to, dur) { for (const a of perch.mixer._actions) { if (a !== to && a.enabled && a.getEffectiveWeight() > 0) a.fadeOut(dur); } to.enabled = true; to.reset().setEffectiveWeight(1).fadeIn(dur).play(); }
function stopFidget(fade = 0.2) { if (fidA && fidA.isRunning()) { xfade(idleA, fade); } fidA = null; }
function playFidget(i) {
  const n = FIDS[i % FIDS.length]; if (!n) return; fidA = perch.act(n, true); const a = fidA; xfade(a, 0.35);
  const s = FID_SND[i + 1]; if (s) play(s[0], s[1]);
  if (AID === 'plane' && i === 2) at(clipDur(n) * 0.4, () => { const p = new THREE.Vector3(); rootBone.getWorldPosition(p); emit('soft', p.add(new THREE.Vector3(0, 0.1, -0.35)), 8, { spread: 0.12, speed: 0.15, up: 0.3, life: 1.6, size: 0.1, grow: 0.5, op: 0.8 }); });
  if (AID === 'swan' && i === 0) at(clipDur(n) * 0.4, () => { const p = headPos(new THREE.Vector3()); ripple(p.x, p.z, 0.004, 0.06, 1.8); emit('splash', new THREE.Vector3(p.x, 0.02, p.z), 6, { spread: 0.05, speed: 0.3, up: 0.6, g: 1.5, life: 0.6, size: 0.025 }); });
  perch.mixer.addEventListener('finished', function f(e) { if (e.action !== a) return; perch.mixer.removeEventListener('finished', f); if (fidA === a) { xfade(idleA, 0.4); fidA = null; } });
}
function updFidget(dt) {
  if (!FIDS.length) return; const petting = petA && petA.isRunning() && petA.getEffectiveWeight() > 0.3;
  if ((stageState !== 'waiting' && stageState !== 'delivered') || petting || fidA) return;
  fidT -= dt; if (fidT <= 0) { fidT = 6 + Math.random() * 9; playFidget(Math.floor(Math.random() * FIDS.length)); }
}
const scam = new THREE.PerspectiveCamera(34, 1, 0.1, 100); // R7: tighter near/far for depth precision (lids, contact shadow)
const T0 = new THREE.Vector3(...SET.target), C0 = new THREE.Vector3(...SET.cam);
scam.position.copy(C0); scam.lookAt(T0);
const orbit = new OrbitControls(scam, $('stage'));
if (matchMedia('(pointer: coarse)').matches) $('stage').style.touchAction = 'pan-y'; // page can still scroll vertically; horizontal drags orbit
Object.assign(orbit, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: HGT * 2.0, maxDistance: HGT * 7, minPolarAngle: 0.2, maxPolarAngle: AID === 'plane' ? Math.PI * 0.75 : Math.PI / 2 - 0.04, rotateSpeed: 0.7 });
orbit.target.copy(T0); orbit.update();
let downXY = null, dragged = false, stageTapAt = 0;
$('stage').addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; dragged = false; });
$('stage').addEventListener('pointermove', (e) => { if (downXY && Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > (e.pointerType === 'touch' ? 12 : 6)) dragged = true; });
$('stage').addEventListener('pointercancel', () => { downXY = null; dragged = false; });
$('stage').addEventListener('pointerup', (e) => {
  const wasDrag = dragged;
  downXY = null;
  if (!e.pointerType || e.pointerType === 'mouse') return;
  dragged = false;
  if (wasDrag) return;
  stageTapAt = performance.now();
  stageTap(e);
});

// ----- particles (sprites) -----
const PT = { heart: softTex('heart'), star: softTex('star'), dust: softTex('dust'), petal: softTex('petal'), splash: softTex('splash'), soft: softTex('soft') };
const parts = [];
function emit(kind, pos, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: PT[kind], transparent: true, depthWrite: false, opacity: 0 }); const s = new THREE.Sprite(m);
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * (o.spread ?? 0.1), (Math.random() - 0.3) * (o.spreadY ?? 0.05), (Math.random() - 0.5) * (o.spread ?? 0.1)));
    const sp = o.speed ?? 0.4; s.userData = { v: new THREE.Vector3((Math.random() - 0.5) * sp, (o.up ?? 0.5) * sp * (0.6 + Math.random() * 0.8), (Math.random() - 0.5) * sp), life: (o.life ?? 1.2) * (0.7 + Math.random() * 0.6), age: 0, size: (o.size ?? 0.06) * (0.7 + Math.random() * 0.6), g: o.g ?? 0, grow: o.grow ?? 0.3, op: o.op ?? 1, spin: (Math.random() - 0.5) * 3 };
    ss.add(s); parts.push(s);
  }
}
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const s = parts[i], u = s.userData; u.age += dt; const k = u.age / u.life;
    if (k >= 1) { ss.remove(s); s.material.dispose(); parts.splice(i, 1); continue; }
    u.v.y -= u.g * dt; u.v.multiplyScalar(1 - 1.2 * dt); s.position.addScaledVector(u.v, dt);
    s.material.opacity = u.op * Math.min(1, k * 6) * (1 - k); s.material.rotation += u.spin * dt; s.scale.setScalar(u.size * (1 + u.grow * k * 4));
  }
}
// ripples on water
const ripples = [];
function ripple(x, z, y = 0.004, s0 = 0.1, life = 2.2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.userData = { age: 0, life, s0 }; ss.add(m); ripples.push(m);
}
function updRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], u = r.userData; u.age += dt; const k = u.age / u.life; if (k >= 1) { ss.remove(r); ripples.splice(i, 1); continue; } r.scale.setScalar(u.s0 + k * 0.9); r.material.opacity = 0.45 * (1 - k); }
}

// ----- the travelling envelope used in every delivery -----
function miniEnvelope() {
  const g = new THREE.Group(); const w = 0.16, h = 0.11;
  const pm = new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.8 }), fm = new THREE.MeshStandardMaterial({ color: 0xecdcbc, roughness: 0.85, side: THREE.DoubleSide });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), pm); b.castShadow = true; g.add(b);
  const fl = new THREE.Shape(); fl.moveTo(-w / 2, h / 2); fl.lineTo(w / 2, h / 2); fl.lineTo(0, -h * 0.1); fl.lineTo(-w / 2, h / 2);
  const f = new THREE.Mesh(new THREE.ShapeGeometry(fl), fm); f.position.z = 0.0065; g.add(f);
  const hs = new THREE.Shape(); hs.moveTo(0, -0.012); hs.bezierCurveTo(-0.002, -0.008, -0.016, -0.002, -0.014, 0.006); hs.bezierCurveTo(-0.012, 0.013, -0.003, 0.014, 0, 0.007); hs.bezierCurveTo(0.003, 0.014, 0.012, 0.013, 0.014, 0.006); hs.bezierCurveTo(0.016, -0.002, 0.002, -0.008, 0, -0.012);
  const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.004, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xe85a7a, roughness: 0.3 })); hm.position.set(0, -0.004, 0.007); hm.scale.setScalar(1.3); g.add(hm);
  g.scale.setScalar(HGT / 0.62); return g;
}
const penv = miniEnvelope(); penv.visible = false; ss.add(penv);
// parachute for the plane drop
const chute = new THREE.Group(); { const cm = new THREE.MeshStandardMaterial({ color: 0xf28aa5, roughness: 0.6, side: THREE.DoubleSide }); const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), cm); c.position.y = 0.3; chute.add(c); const lm = new THREE.LineBasicMaterial({ color: 0x9a7a6a }); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; chute.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15), new THREE.Vector3(0, 0.04, 0)]), lm)); } chute.visible = false; ss.add(chute); }
// cloth bundle for the stork
const bundle = new THREE.Group(); { const cm = new THREE.MeshStandardMaterial({ color: 0xd9c6a2, roughness: 0.88, side: THREE.DoubleSide }); const dots = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), cm); pouch.position.y = 0.065; pouch.scale.y = 0.85; pouch.castShadow = true; bundle.add(pouch); bundle.userData.pouch = pouch;
  { const rm = new THREE.MeshStandardMaterial({ color: 0xb59c74, roughness: 0.9 }); for (const a of [0.66, -0.66]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.0755, 0.0085, 8, 40), rm); t.rotation.set(a, Math.PI / 2, 0); pouch.add(t); } }
  const flaps = []; for (let i = 0; i < 4; i++) { const pv = new THREE.Group(); pv.rotation.y = i * Math.PI / 2 + Math.PI / 4; const sh = new THREE.Shape(); sh.moveTo(0, -0.05); sh.quadraticCurveTo(0.09, -0.04, 0.13, 0); sh.quadraticCurveTo(0.09, 0.04, 0, 0.05); sh.lineTo(0, -0.05);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), cm); m.rotation.x = -Math.PI / 2; m.castShadow = true; const hinge = new THREE.Group(); hinge.position.x = 0.02; hinge.add(m); pv.add(hinge); hinge.rotation.z = 1.35; pv.position.y = 0.01; bundle.add(pv); flaps.push(hinge);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), dots); dot.position.set(0.07, 0, 0.0); m.add(dot); }
  bundle.userData.flaps = flaps; const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), cm); knot.position.y = 0.15; bundle.add(knot); bundle.userData.knot = knot; bundle.visible = false; bundle.scale.setScalar(HGT / 0.62); ss.add(bundle); }
const mapBundle = map3dOk && AID === 'stork' && !MB ? bundle.clone(true) : null;
if (MB && flyer.envelope) flyer.envelope.visible = false;
if (mapBundle && ms) { mapBundle.visible = true; mapBundle.scale.setScalar((HGT / 0.62) * FLY_SCALE); ms.add(mapBundle); if (flyer.envelope) flyer.envelope.visible = false; }

// envelope carry position (works for skinned or bone-parented envelope)
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
let envInfo = null;
function carryPos(out) {
  const e = perch.envelope; if (!e) return out.set(0, HGT * 0.6, 0);
  if (e.isSkinnedMesh) {
    if (!envInfo) { e.geometry.computeBoundingBox(); const c = e.geometry.boundingBox.getCenter(new THREE.Vector3()); const sw = e.geometry.attributes.skinWeight, si = e.geometry.attributes.skinIndex; let best = 0, bi = 0; for (let k = 0; k < 4; k++) if (sw.getComponent(0, k) > best) { best = sw.getComponent(0, k); bi = si.getComponent(0, k); } envInfo = { c, bi }; }
    const b = e.skeleton.bones[envInfo.bi]; out.copy(envInfo.c).applyMatrix4(e.bindMatrix).applyMatrix4(e.skeleton.boneInverses[envInfo.bi]); return out.applyMatrix4(b.matrixWorld);
  }
  return new THREE.Box3().setFromObject(e).getCenter(out);
}
// beak tip: the most forward rest vertex skinned mostly to the head bone, evaluated with skinning each frame
const BEAKBONE = { pigeon: /Head_1$/, stork: /Head_0$/, swan: /Head_2$/ }[AID];
const beakCache = new Map();
function beakTip(out, inst = perch) {
  let beakInfo = beakCache.get(inst);
  if (!beakInfo) {
    let body = null; inst.root.traverse((o) => { if (o.isSkinnedMesh && o.name !== 'Envelope' && o.name !== 'Satchel' && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
    if (!body || !BEAKBONE) { beakInfo = { none: true }; }
    else {
      const bi = body.skeleton.bones.findIndex((b) => BEAKBONE.test(b.name)); const P = body.geometry.attributes.position, sw = body.geometry.attributes.skinWeight, si = body.geometry.attributes.skinIndex;
      let best = -1e9, idx = 0; for (let i = 0; i < P.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w > 0.6 && P.getZ(i) > best) { best = P.getZ(i); idx = i; } }
      beakInfo = { body, idx };
    }
    beakCache.set(inst, beakInfo);
  }
  if (beakInfo.none) return headPos(out);
  beakInfo.body.getVertexPosition(beakInfo.idx, out); return out.applyMatrix4(beakInfo.body.matrixWorld);
}
function headPos(out) { if (!headBone) return out.set(0, HGT, 0.1); headBone.getWorldPosition(out); return out; }

let stageState = 'idle', idleA, curClip = null;
const clipDur = (n) => (clips[n] ? clips[n].duration : 1);
// ----- timeline helper in sim time -----
const events = []; let simT = 0;
function at(sec, fn) { events.push({ t: simT + sec, fn }); }
function runEvents() { for (let i = events.length - 1; i >= 0; i--) if (events[i].t <= simT) { const e = events.splice(i, 1)[0]; e.fn(); } }
const fol = []; // per-frame followers (functions returning false when done)

function startArrival(opts) {
  $('arrival').classList.remove('hidden');
  if (stageReady) fit(sr, scam, stageEl);
  if (envReady) fit(er, ecam, envEl);
  if (!(opts && opts.quiet)) $('arrival').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (!stageReady) {
    stageState = 'waiting';
    if (envReady) showEnvelope();
    else openRead();
    return;
  }
  idleA = perch.act('Idle_Wait');
  if (reduced || (opts && opts.quiet)) { idleA.play(); stageState = 'waiting'; return; }
  unlock();
  const a = perch.act('Arrive', true); a.play(); stageState = 'arriving'; curClip = a;
  play('arrive', 0.75);
  at(0.25, () => play('arrive', 0.55));
  const D = clipDur('Arrive');
  if (AID === 'plane') { SET.cloudBoost = 6; tween(D * 1000, (k) => (SET.cloudBoost = 6 - 5 * k)); }
  if (SET.dust) for (let k = 0.05; k < 0.55; k += 0.06) at(D * k, () => { const p = new THREE.Vector3(); rootBone.getWorldPosition(p); p.y = 0.02; emit('dust', p, 3, { spread: 0.3, speed: 0.25, up: 0.6, life: 1.1, size: 0.09, op: 0.7 }); });
  if (AID === 'horse') at(D * 0.9, () => emit('dust', new THREE.Vector3(0, 0.02, 0.1), 10, { spread: 0.4, speed: 0.5, up: 0.5, life: 1.3, size: 0.1, op: 0.75 }));
  if (AID === 'swan') { for (let k = 0.6; k < 1; k += 0.08) at(D * k, () => ripple(0, 0.05, 0.004, 0.15)); at(D * 0.62, () => emit('splash', new THREE.Vector3(0, 0.05, 0.05), 14, { spread: 0.3, speed: 0.8, up: 0.8, g: 2, life: 0.8, size: 0.05 })); }
  if (AID === 'turtle') at(D * 0.6, () => emit('star', new THREE.Vector3(0, 0.12, 0.05), 6, { spread: 0.2, speed: 0.3, life: 1, size: 0.05 }));
  if (AID === 'pigeon' || AID === 'stork') at(D * 0.6, () => { emit('petal', new THREE.Vector3(0, 0.05, 0), 8, { spread: 0.3, speed: 0.3, up: 0.3, g: 0.25, life: 2, size: 0.04 }); });
  perch.mixer.addEventListener('finished', function f(e) { if (e.action === a) { perch.mixer.removeEventListener('finished', f); xfade(idleA, 0.35); stageState = 'waiting'; } });
}
let petA = null;
function hearts(ev) {
  const w = $('stageWrap'), r = w.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const h = document.createElement('span'); h.className = 'heart'; h.textContent = '♥';
    h.style.left = (ev.clientX - r.left + (Math.random() - 0.5) * 40) + 'px'; h.style.top = (ev.clientY - r.top - 20) + 'px';
    h.style.setProperty('--dx', ((Math.random() - 0.5) * 120).toFixed(0) + 'px'); h.style.setProperty('--rot', ((Math.random() - 0.5) * 50).toFixed(0) + 'deg');
    h.style.animationDelay = (i * 0.08) + 's'; h.style.fontSize = (18 + Math.random() * 16) + 'px';
    w.appendChild(h); setTimeout(() => h.remove(), 1700 + i * 80);
  }
}
// camera glide helper (orbit disabled during a staged move)
function camMove(pos, tgt, ms) {
  const p0 = scam.position.clone(), t0 = orbit.target.clone(); orbit.enabled = false;
  tween(ms, (k) => { scam.position.lerpVectors(p0, pos, k); orbit.target.lerpVectors(t0, tgt, k); scam.lookAt(orbit.target); }, () => { orbit.enabled = true; });
}
// ----- per-animal delivery choreography -----
const fwd = new THREE.Vector3(0, 0, 1);
function deliverEnvelope(D) {
  const p = new THREE.Vector3(); const land = new THREE.Vector3();
  const show = () => { if (perch.envelope) perch.envelope.visible = false; carryPos(p); penv.position.copy(p); penv.visible = true; };
  const rel = { pigeon: 0.34, stork: 0.6, swan: 0.4, plane: 0.4, horse: 0.6, donkey: 0.55, turtle: 0.5 }[AID] * D;
  const sndAt = { donkey: 0.6 }[AID] ?? (rel / D);
  at(sndAt * D, () => play('deliver'));
  const sideCam = { horse: [1.9, 0.7, 1.3], donkey: [1.2, 0.6, 2.0], pigeon: [1.0, 0.5, 2.2], stork: [1.0, 0.1, 2.2], swan: [1.3, 0.5, 2.1], plane: [1.6, -0.2, 1.9], turtle: [0.9, 0.45, 1.5] }[AID];
  if (AID !== 'stork') camMove(new THREE.Vector3(...sideCam), new THREE.Vector3(T0.x, T0.y * (AID === 'plane' ? -1 : 0.8), T0.z + 0.15), 1300);
  const settle = (ms) => at(ms / 1000, () => flyEnvelope());
  if (AID === 'pigeon') {
    at(rel, () => { show(); emit('star', p, 6, { speed: 0.2, life: 0.8, size: 0.04 }); const p0 = p.clone(); let t = 0; fol.push((dt) => { t += dt; const u = Math.min(1, t / (0.12 * D)); const hp = beakTip(new THREE.Vector3()).add(new THREE.Vector3(0, -0.035 * HGT / 0.62, 0)); penv.position.lerpVectors(p0, hp, u * u * (3 - 2 * u)); penv.rotation.set(0, 0, Math.sin(t * 8) * 0.06 * (1 - u)); return t < (0.53 * D); }); });
    at(0.87 * D, () => { const s = penv.position.clone(); land.set(0.02, 0.3, 0.4); let t = 0; fol.push((dt) => { t += dt; const u = Math.min(1, t / 1.4); const e = 1 - Math.pow(1 - u, 3); penv.position.lerpVectors(s, land, e); penv.position.y += Math.sin(u * Math.PI) * 0.08 + Math.sin(t * 4) * 0.01; penv.rotation.set(-0.3 * e, Math.sin(t * 3) * 0.3, Math.sin(t * 5) * 0.12); if (u >= 1 && !penv.userData.done) { penv.userData.done = 1; emit('heart', land, 6, { speed: 0.25, up: 0.8, life: 1.2, size: 0.05 }); } return u < 1; }); settle(2000); });
  } else if (AID === 'stork') {
    const gy = SET.groundY; camMove(new THREE.Vector3(1.7, 0.15, 3.1), new THREE.Vector3(0.1, -0.15, 0.2), 1500);
    at(rel, () => { if (MB) { let bm = null; perch.bundleMesh.traverse((o) => { if (o.isSkinnedMesh && (!bm || o.geometry.attributes.position.count > bm.geometry.attributes.position.count)) bm = o; }); perch.root.updateMatrixWorld(true); const c = new THREE.Vector3(), q = new THREE.Vector3(); const n = bm.geometry.attributes.position.count; let m = 0; for (let i = 0; i < n; i += 17) { bm.getVertexPosition(i, q); c.add(q.applyMatrix4(bm.matrixWorld)); m++; } c.multiplyScalar(1 / m); const k = HGT / 0.62; bundle.position.set(c.x, c.y - 0.065 * k * 0.85 * 0.95, c.z); bundle.scale.setScalar(k); } bundleCarried = false; if (MB) perch.bundleMesh.visible = false; bundle.visible = true; penv.visible = false; bundle.rotation.set(0, bundle.rotation.y, 0);
      const vel = new THREE.Vector3(0.0, -0.05, 0.08); const g = 9.8 * 0.55; let t = 0, bounces = 0, rest = false, spin = 2.2;
      fol.push((dt) => { t += dt; if (!rest) { vel.y -= g * dt; bundle.position.addScaledVector(vel, dt); bundle.rotation.y += spin * dt; bundle.rotation.z = Math.sin(t * 6) * 0.15 * (1 - bounces / 3);
        const floor = gy + 0.0; if (bundle.position.y <= floor && vel.y < 0) { bundle.position.y = floor; bounces++; play('pet'); emit('dust', bundle.position.clone().add(new THREE.Vector3(0, 0.02, 0)), 6 - bounces * 2, { spread: 0.15, speed: 0.3, up: 0.4, life: 0.8, size: 0.06, op: 0.6 });
          // squash on impact, then a damped bounce
          bundle.scale.set(1.25, 0.7, 1.25).multiplyScalar(HGT / 0.62); vel.y = -vel.y * 0.38; vel.x *= 0.5; vel.z *= 0.5; spin *= 0.4; if (bounces >= 3 || vel.y < 0.12) { rest = true; vel.set(0, 0, 0); } }
        const k = HGT / 0.62; bundle.scale.lerp(new THREE.Vector3(k, k, k), Math.min(1, dt * 10)); return true; }
        bundle.rotation.z *= 0.8; land.copy(bundle.position);
        // unwrap: cloth corners fall open, the knot shrinks and the envelope rises out
        let k = 0; penv.visible = true; penv.position.copy(land); emit('petal', land.clone().add(new THREE.Vector3(0, 0.05, 0)), 14, { speed: 0.5, up: 0.7, g: 0.4, life: 2, size: 0.04 });
        fol.push((dt2) => { k += dt2 / 0.9; const e2 = Math.min(1, k); const eo = 1 - Math.pow(1 - e2, 3); bundle.userData.flaps.forEach((h) => (h.rotation.z = 1.35 * (1 - eo) - 0.05 * Math.sin(eo * Math.PI))); bundle.userData.knot.scale.setScalar(Math.max(0.001, 1 - e2)); bundle.userData.pouch.scale.set(1 - 0.3 * eo, 0.85 - 0.75 * eo, 1 - 0.3 * eo); bundle.userData.pouch.position.y = 0.065 - 0.05 * eo; penv.position.y = land.y + 0.14 * e2 + Math.sin(k * 5) * 0.005; penv.rotation.set(-0.2, k * 0.8, 0); return k < 1.6; });
        return false; });
      settle(3600); });
  } else if (AID === 'swan') {
    at(rel, () => { show(); const p0 = p.clone(); let th = 0; fol.push((dt) => { th += dt; const u = Math.min(1, th / (0.1 * D)); const bt = beakTip(new THREE.Vector3()).add(new THREE.Vector3(0, -0.03 * HGT / 0.62, 0)); penv.position.lerpVectors(p0, bt, u * u * (3 - 2 * u)); penv.rotation.set(0, 0.3 * u, 0); return th < 0.47 * D; }); });
    at(0.88 * D, () => { const s = penv.position.clone(); land.set(0, 0.012, 0.62); let t = 0; fol.push((dt) => { t += dt; const u = Math.min(1, t / 0.9); const e = u * u * (3 - 2 * u); penv.position.lerpVectors(s, land, e); penv.position.y += Math.sin(u * Math.PI) * 0.06; penv.rotation.set(-Math.PI / 2 * e, 0.4 * e, 0); if (u >= 1) { penv.position.y = land.y + Math.sin(t * 2.5) * 0.006; penv.rotation.z = Math.sin(t * 1.7) * 0.08; if (!penv.userData.r) { penv.userData.r = 1; ripple(land.x, land.z, 0.006, 0.05, 2.4); at(0.5, () => ripple(land.x, land.z, 0.006, 0.05, 2.4)); emit('splash', land, 8, { spread: 0.1, speed: 0.4, up: 0.6, g: 1.5, life: 0.7, size: 0.03 }); } } return t < 6; }); settle(2300); });
    for (let k = 0.05; k < 0.55; k += 0.12) at(k * D, () => { const r = new THREE.Vector3(); rootBone.getWorldPosition(r); ripple(r.x, r.z, 0.004, 0.2, 1.8); });
  } else if (AID === 'plane') {
    at(rel, () => { show(); const s = p.clone(); chute.visible = true; chute.scale.setScalar(0.01); let t = 0; fol.push((dt) => { t += dt; const open = Math.min(1, Math.max(0, (t - 0.25) / 0.4)); chute.scale.setScalar(0.01 + 0.99 * (1 - Math.pow(1 - open, 3)) * (HGT / 0.5)); const fall = t < 0.3 ? 2.5 * t * t : 0.225 + (t - 0.3) * 0.18; penv.position.set(s.x + Math.sin(t * 1.6) * 0.18, s.y - fall, s.z + 0.15 * Math.min(1, t)); penv.rotation.set(0.2 * Math.sin(t * 2.2), t * 0.4, 0.35 * Math.sin(t * 1.6)); chute.position.copy(penv.position).add(new THREE.Vector3(0, 0.03, 0)); chute.rotation.z = 0.35 * Math.sin(t * 1.6); return t < 6; }); settle(2600); emit('star', p, 8, { speed: 0.3, life: 1, size: 0.05 }); });
  } else if (AID === 'horse' || AID === 'donkey') {
    const hi = AID === 'donkey' ? 0.55 : 0.32, spins = AID === 'donkey' ? 2 : 1;
    at(rel, () => { show(); const s = p.clone(); land.set(AID === 'horse' ? 0.15 : 0.1, 0.012, 0.5); emit('star', s, 8, { speed: 0.5, life: 0.8, size: 0.05 }); let t = 0; const dur = AID === 'donkey' ? 0.95 : 0.8;
      fol.push((dt) => { t += dt; const u = Math.min(1, t / dur); penv.position.lerpVectors(s, land, u); penv.position.y += Math.sin(u * Math.PI) * hi; penv.rotation.set(-Math.PI / 2 * u, spins * Math.PI * 2 * u, 0); if (u >= 1 && !penv.userData.l) { penv.userData.l = 1; emit('dust', land, 6, { spread: 0.15, speed: 0.3, up: 0.4, life: 0.9, size: 0.06, op: 0.6 }); emit('heart', land, 4, { speed: 0.2, up: 0.9, life: 1.1, size: 0.05 }); } return u < 1; }); settle(1900); });
  } else { // turtle
    at(rel, () => { show(); const s = p.clone(); s.y = 0.012; land.set(0, 0.012, 0.5); penv.rotation.set(-Math.PI / 2, 0, 0); let t = 0; fol.push((dt) => { t += dt; const u = Math.min(1, t / (0.45 * D)); const e = u * u * (3 - 2 * u); penv.position.lerpVectors(s, land, e); penv.position.y = 0.012 + Math.sin(u * Math.PI) * 0.01; if (u >= 1 && !penv.userData.l) { penv.userData.l = 1; emit('heart', land, 6, { speed: 0.2, up: 0.9, life: 1.3, size: 0.04 }); } return u < 1; }); settle(0.45 * D * 1000 + 800); });
  }
}
function stageTap(ev) {
  stopFidget(0.3);
  if (stageState === 'delivered') {
    unlock(); hearts(ev); play('pet'); const hp = headPos(new THREE.Vector3()); emit('heart', hp, 5, { spread: 0.15, speed: 0.25, up: 1, life: 1.3, size: 0.045 });
    if (!clips.Pet) return;
    if (!petA) {
      petA = perch.act('Pet', true);
      perch.mixer.addEventListener('finished', (e) => { if (e.action === petA && stageState === 'delivered') { xfade(idleA, 0.3); } });
    }
    if (petA.isRunning() && petA.getEffectiveWeight() > 0.5) { petA.time = 0; return; }
    xfade(petA, 0.3);
    return;
  }
  if (stageState !== 'waiting') return;
  stageState = 'delivering'; $('hint').textContent = 'Entregando…';
  const d = perch.act('Deliver', true); xfade(d, 0.35);
  deliverEnvelope(clipDur('Deliver'));
  perch.mixer.addEventListener('finished', function f(e) {
    if (e.action !== d) return; perch.mixer.removeEventListener('finished', f);
    const c = perch.act('Celebrate', true); xfade(c, AID === 'stork' ? 0.12 : 0.35); /* R7l stork: the wing swap (RootTuck off) is at Celebrate ~f9; a 0.35s fade still mixed Deliver's tucked wing in -> paper trace */
    emit('star', headPos(new THREE.Vector3()), 10, { spread: 0.3, speed: 0.5, life: 1.2, size: 0.05 });
    perch.mixer.addEventListener('finished', function g(e2) { if (e2.action !== c) return; perch.mixer.removeEventListener('finished', g); xfade(idleA, 0.3); stageState = 'delivered'; });
  });
}
$('stage').addEventListener('click', (ev) => {
  if (dragged) { dragged = false; return; }
  if (performance.now() - stageTapAt < 800) return;
  stageTap(ev);
});
// Leva o cartão do envelope inteiro para a vista (abaixo do cabeçalho) e espera a rolagem parar.
function bringEnvIntoView() {
  const card = $('envc').closest('.env-card') || $('envc');
  const header = document.querySelector('.site-header');
  const top0 = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
  const r = card.getBoundingClientRect();
  const vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
  const lo = r.bottom - vh + 12, hi = r.top - top0 - 12; // faixa de deltas que deixa o cartão todo visível
  let delta = lo <= hi ? (0 < lo ? lo : 0 > hi ? hi : 0) : hi;
  if (Math.abs(delta) < 4) return Promise.resolve();
  window.scrollTo({ top: Math.max(0, scrollY + delta), behavior: reduced ? 'auto' : 'smooth' });
  return new Promise((resolve) => {
    let last = -1, still = 0; const t0 = performance.now();
    const tick = () => {
      if (!alive) return resolve();
      const y = Math.round(scrollY);
      still = y === last ? still + 1 : 0; last = y;
      if (still >= 6 || performance.now() - t0 > 1500) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function whenEnvVisible() {
  const card = $('envc').closest('.env-card') || $('envc');
  return new Promise((resolve) => {
    if (typeof IntersectionObserver === 'undefined') return resolve();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.intersectionRatio >= 0.8)) { io.disconnect(); resolve(); } }, { threshold: [0, 0.8, 1] });
    io.observe(card);
    setTimeout(() => { io.disconnect(); resolve(); }, 2500);
  });
}
let autoOpenEnv = false;
function flyEnvelope() {
  bringEnvIntoView().then(() => { if (alive) flyEnvelopeNow(); });
}
function flyEnvelopeNow() {
  autoOpenEnv = true;
  const p = penv.visible ? penv.getWorldPosition(new THREE.Vector3()) : carryPos(new THREE.Vector3()); p.project(scam);
  const r = $('stage').getBoundingClientRect(), e = $('envc').getBoundingClientRect();
  const x0 = r.left + (p.x * 0.5 + 0.5) * r.width - 45, y0 = r.top + (-p.y * 0.5 + 0.5) * r.height - 30;
  const x1 = e.left + e.width / 2 - 45, y1 = e.top + e.height / 2 - 30;
  penv.visible = false; chute.visible = false; bundle.visible = false; const f = $('flyer'); f.style.display = 'block';
  camMove(C0.clone(), T0.clone(), 1400);
  const anim = f.animate([{ transform: `translate(${x0}px,${y0}px) scale(.5) rotate(-8deg)` }, { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 120}px) scale(1.1) rotate(10deg)`, offset: 0.5 }, { transform: `translate(${x1}px,${y1}px) scale(1.6) rotate(0deg)` }], { duration: reduced ? 1 : 1100, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
  anim.onfinish = () => { f.style.display = 'none'; showEnvelope(); $('hint').textContent = `Carta entregue ♥ Toque ${AN.n.startsWith('A ') ? 'na' : 'no'} ${AN.n.slice(2).toLowerCase()} para fazer carinho`; };
}
// camera collision: keep the camera outside prop volumes (vertical cylinders) and above the ground
function keepCamClear() {
  const c = scam.position;
  for (const k of SET.colliders || []) { const dx = c.x - k.c.x, dz = c.z - k.c.z, d = Math.hypot(dx, dz), r = k.r + 0.15; if (d < r && c.y < k.y0 + k.h + 0.2) { const s = r / Math.max(d, 1e-3); c.x = k.c.x + dx * s; c.z = k.c.z + dz * s; } }
  if (SET.groundY !== null && SET.groundY !== undefined) c.y = Math.max(c.y, SET.groundY + 0.15);
  const d = c.distanceTo(orbit.target); if (d < HGT * 1.6) c.sub(orbit.target).setLength(HGT * 1.6).add(orbit.target);
  scam.lookAt(orbit.target);
}
let idleFx = 0;
function stageTick(dt, t) {
  if (!stageReady) return;
  updFidget(dt); perch.mixer.update(dt); updBlink(dt); SET.tick(t, dt);
  perch.root.updateMatrixWorld(true);
  if (MB) { perch.bundleMesh.visible = bundleCarried; if (bundleCarried) bundle.visible = false; }
  else if (bundleCarried && stageState !== 'idle') { const k = HGT / 0.62; beakTip(bundle.position); bundle.position.y -= 0.17 * k * 0.8; bundle.scale.setScalar(k * 0.8); bundle.rotation.set(0, 0.6 + Math.sin(t * 1.3) * 0.08, Math.sin(t * 2.1) * 0.05); bundle.visible = !(mapBundle && mapBundle.visible && yawG.visible); } // R7: never two bundles at once
  for (let i = fol.length - 1; i >= 0; i--) if (fol[i](dt) === false) fol.splice(i, 1);
  updParts(dt); updRipples(dt);
  if (rootBone && SET.groundY !== null) { const p = rootBone.getWorldPosition(_v); cblob.position.set(p.x, SET.groundY + 0.006, p.z); const s = HGT * (AID === 'turtle' ? 1.8 : 1.1); cblob.scale.set(s, s * 0.8, 1); cblob.material.opacity = 0.32 * THREE.MathUtils.clamp(1 - (p.y - SET.groundY) / (HGT * 2.5), 0, 1); }
  if (SET.ripples && stageState !== 'arriving') { idleFx += dt; if (idleFx > 1.6) { idleFx = 0; const p = rootBone.getWorldPosition(new THREE.Vector3()); if (AID === 'swan') ripple(p.x, p.z, 0.004, 0.18, 2.6); else ripple(1.15 + (Math.random() - 0.5), -0.55 + (Math.random() - 0.5), -0.015, 0.05, 2.2); } }
  if (orbit.enabled) orbit.update();
  keepCamClear();
  if (onScreen(stageEl)) sr.render(ss, scam);
}

// ---------- 3. envelope panel ----------
const envEl = $('envc').parentElement;
let envReady = true;
let er;
try {
  er = makeRenderer($('envc'));
} catch (err) {
  console.error('[delivery-env-gl]', err);
  envReady = false;
  er = {
    dispose() {},
    forceContextLoss() {},
    setSize() {},
    render() {},
    info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } },
  };
}
const es = new THREE.Scene(); lights(es);
const rim = new THREE.DirectionalLight(0xffe2ea, 0.8); rim.position.set(-3, 2, -2); es.add(rim);
const ecam = new THREE.PerspectiveCamera(35, 1, 0.1, 50); ecam.position.set(0, 0.1, 3.4); ecam.lookAt(0, 0, 0);
const env = new THREE.Group(); env.visible = false; es.add(env);
const paperTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f3e7d1'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${120 + Math.random() * 50},${80},${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const paper = new THREE.MeshStandardMaterial({ color: 0xffffff, map: paperTex, roughness: 0.85 });
const paperIn = new THREE.MeshStandardMaterial({ color: 0xe9d6b4, roughness: 0.9, side: THREE.DoubleSide });
const paperFold = new THREE.MeshStandardMaterial({ color: 0xf6ecdb, map: paperTex, roughness: 0.85, side: THREE.DoubleSide });
const rose = new THREE.MeshStandardMaterial({ color: 0xe85a7a, roughness: 0.3, metalness: 0.05 });
const W = 1.6, H = 1.05, D = 0.07;
const rbox = (w, h, d, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 }); g.translate(0, 0, -d / 2); return g; };
const back = new THREE.Mesh(rbox(W, H, D, 0.05), paper); env.add(back);
const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, H - 0.06), paperIn); inner.position.z = D / 2 + 0.013; env.add(inner);
const tri = (pts, mat, z, depth = 0.012) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((p) => s.lineTo(...p)); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2 }), mat); m.position.z = z; return m; };
// front pocket (letter sits between inner and pocket)
const pocket = new THREE.Group(); pocket.position.z = D / 2 + 0.05; env.add(pocket);
pocket.add(tri([[-W / 2, -H / 2], [0, 0.0], [-W / 2, H / 2]], paperFold, 0), tri([[W / 2, -H / 2], [W / 2, H / 2], [0, 0.0]], paperFold, 0.004), tri([[-W / 2, -H / 2], [W / 2, -H / 2], [0, 0.06]], paper, 0.01));
const flapPivot = new THREE.Group(); flapPivot.position.set(0, H / 2, D / 2 + 0.075); env.add(flapPivot);
const flapS = new THREE.Shape(); flapS.moveTo(-W / 2, 0); flapS.lineTo(W / 2, 0); flapS.quadraticCurveTo(0.12, -0.5, 0, -0.64); flapS.quadraticCurveTo(-0.12, -0.5, -W / 2, 0);
const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(flapS, { depth: 0.01, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.004, bevelSegments: 2 }), paperFold); flapPivot.add(flap);
const hs = new THREE.Shape(); hs.moveTo(0, -0.12); hs.bezierCurveTo(-0.02, -0.08, -0.16, -0.02, -0.14, 0.06); hs.bezierCurveTo(-0.12, 0.13, -0.03, 0.14, 0, 0.07); hs.bezierCurveTo(0.03, 0.14, 0.12, 0.13, 0.14, 0.06); hs.bezierCurveTo(0.16, -0.02, 0.02, -0.08, 0, -0.12);
const seal = new THREE.Group(); seal.position.set(0, -0.6, 0.02); flapPivot.add(seal);
const waxMat = new THREE.MeshStandardMaterial({ color: 0xc93d5f, roughness: 0.35, transparent: true });
// R7: ROUND wax disc, only a slight irregular wobble on the rim
const blob = new THREE.Shape(); for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, r = 0.2 + Math.sin(a * 7 + 0.4) * 0.004 + Math.sin(a * 11 + 2.1) * 0.003 + Math.sin(a * 3 + 1) * 0.003; i ? blob.lineTo(Math.cos(a) * r, Math.sin(a) * r) : blob.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
const disc = new THREE.Mesh(new THREE.ExtrudeGeometry(blob, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 64 }), waxMat); seal.add(disc);
const heartMat = new THREE.MeshStandardMaterial({ color: 0xd9506f, roughness: 0.3, metalness: 0.05, transparent: true });
// embossed heart: low relief INSIDE the circle (max radius ~0.11 < disc 0.2), sitting on the disc face (z 0.05)
const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.006, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 4, curveSegments: 24 }), heartMat); heart.scale.set(0.72, 0.72, 1); heart.position.set(0, 0.012, 0.046); seal.add(heart);
const hit = new THREE.Mesh(new THREE.SphereGeometry(0.32), new THREE.MeshBasicMaterial({ visible: false })); seal.add(hit);
let realSheet = false;
let sheetReady = Promise.resolve(false);
const letterCanvas = document.createElement('canvas');
letterCanvas.width = 768;
letterCanvas.height = 1024;
const letterTex = new THREE.CanvasTexture(letterCanvas);
letterTex.colorSpace = THREE.SRGBColorSpace;
letterTex.anisotropy = 4;
function paintLetter() {
  const g = letterCanvas.getContext('2d');
  if (!g) return;
  const greet = ((options.getLetter && options.getLetter().greeting) || 'Meu amor,').slice(0, 28);
  const drawGreeting = () => {
    g.fillStyle = '#e85a7a';
    g.font = 'italic 42px serif';
    g.fillText(greet, 48, 84);
  };
  const drawFallback = () => {
    g.fillStyle = '#fbf6f0';
    g.fillRect(0, 0, letterCanvas.width, letterCanvas.height);
    g.strokeStyle = 'rgba(196,163,90,.35)';
    for (let y = 120; y < letterCanvas.height - 40; y += 36) {
      g.beginPath();
      g.moveTo(48, y);
      g.lineTo(letterCanvas.width - 48, y);
      g.stroke();
    }
    drawGreeting();
    letterTex.needsUpdate = true;
  };
  // Evita retângulo preto enquanto a textura carrega.
  drawFallback();
  const src = options.designSrc;
  if (!src) return;
  // SVG sem width/height falha no drawImage → usa JPG do design.
  const raster = String(src)
    .replace(/\/blank-([a-z0-9-]+)\.svg$/i, '/$1.jpg')
    .replace(/\.svg$/i, '.jpg');
  const urls = raster === src ? [src] : [raster, src];
  const loadUrl = (i) => {
    if (i >= urls.length) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!alive || realSheet) return;
      try {
        g.drawImage(img, 0, 0, letterCanvas.width, letterCanvas.height);
        g.fillStyle = 'rgba(251,246,240,0.14)';
        g.fillRect(0, 0, letterCanvas.width, letterCanvas.height);
        drawGreeting();
        letterTex.needsUpdate = true;
      } catch (e) {
        loadUrl(i + 1);
      }
    };
    img.onerror = () => loadUrl(i + 1);
    img.src = urls[i];
  };
  loadUrl(0);
}
paintLetter();
const letterMat = new THREE.MeshBasicMaterial({ map: letterTex, toneMapped: false });
const letter = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.96, 0.008), letterMat);
letter.position.set(0, -0.02, D / 2 + 0.03);
env.add(letter);
  // Folha de verdade: a 1ª página da carta (papel + textos + adesivos), em 3:4.
  if (options.paintSheet) {
    const off = document.createElement('canvas');
    off.width = letterCanvas.width;
    off.height = letterCanvas.height;
    sheetReady = Promise.race([Promise.resolve(options.paintSheet(off)), new Promise((r) => setTimeout(() => r(false), 3500))]);
    sheetReady.then((ok) => {
      if (!ok || !alive) return;
      try {
        off.getContext('2d').getImageData(0, 0, 1, 1); // canvas "sujo" (CORS) não vira textura
        const g = letterCanvas.getContext('2d');
        g.clearRect(0, 0, letterCanvas.width, letterCanvas.height);
        g.drawImage(off, 0, 0);
        realSheet = true;
        letterTex.needsUpdate = true;
      } catch (e) { /* fica a folha genérica */ }
    }, () => {});
  }
  // Frente do envelope: Para (destaque) e De (menor).
  if (options.paintNames) {
    const nc = document.createElement('canvas');
    nc.width = 1024;
    nc.height = 280;
    options.paintNames(nc);
    const nt = new THREE.CanvasTexture(nc);
    nt.colorSpace = THREE.SRGBColorSpace;
    nt.anisotropy = 4;
    const names = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.25), new THREE.MeshBasicMaterial({ map: nt, transparent: true, toneMapped: false, depthWrite: false }));
    names.position.set(0, -0.375, D / 2 + 0.05 + 0.032);
    env.add(names);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!alive) return; options.paintNames(nc); nt.needsUpdate = true; });
  }
const easeOutBack = (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
let envState = 'none', floatAmt = 1;
function showEnvelope() {
  paintLetter();
  env.visible = true; envState = 'revealing';
  tween(reduced ? 1 : 1100, (k, u) => { const b = easeOutBack(u); env.scale.setScalar(Math.max(0.01, b)); env.rotation.y = (1 - easeOutCubic(u)) * -2.2; env.position.y = (1 - easeOutCubic(u)) * -0.6; }, () => {
    envState = 'closed';
    // Veio do toque no animal: abre sozinho quando o envelope está inteiro na tela.
    if (autoOpenEnv) { autoOpenEnv = false; Promise.all([whenEnvVisible(), sheetReady]).then(() => { if (alive && envState === 'closed') setTimeout(() => { if (alive && envState === 'closed') openEnv(); }, 250); }); }
  });
  $('envTitle').textContent = 'Uma carta para você'; $('envHint').textContent = 'Toque no selo para abrir'; $('envHint').classList.remove('dim');
}
function envTap(ev) {
  if (envState === 'open') { openLetter(); return; }
  if (envState !== 'closed') return;
  const r = ev.target.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ecam);
  if (!ray.intersectObject(seal, true).length) return;
  openEnv();
}
let envDown = null, envDrag = false, envTapAt = 0;
$('envc').addEventListener('pointerdown', (e) => { envDown = [e.clientX, e.clientY]; envDrag = false; });
$('envc').addEventListener('pointermove', (e) => { if (envDown && Math.hypot(e.clientX - envDown[0], e.clientY - envDown[1]) > (e.pointerType === 'touch' ? 12 : 6)) envDrag = true; });
$('envc').addEventListener('pointercancel', () => { envDown = null; envDrag = false; });
$('envc').addEventListener('pointerup', (e) => {
  const wasDrag = envDrag;
  envDown = null;
  if (!e.pointerType || e.pointerType === 'mouse' || wasDrag) { envDrag = false; return; }
  envDrag = false;
  envTapAt = performance.now();
  envTap(e);
});
$('envc').addEventListener('click', (ev) => {
  if (performance.now() - envTapAt < 800) return;
  envTap(ev);
});
function openEnv() {
  envState = 'opening'; $('envHint').textContent = 'Abrindo…';
  tween(220, (k, u) => (floatAmt = 1 - u));
  // 1. seal pops
  tween(280, (k, u) => seal.scale.setScalar(1 + 0.45 * easeOutBack(u)), () =>
    tween(520, (k, u) => { const e = easeOutCubic(u); seal.position.z = 0.02 + e * 1.4; seal.position.y = -0.6 + e * 0.5; seal.rotation.z = e * 3; seal.scale.setScalar(1.45 * (1 - u) + 0.01); waxMat.opacity = heartMat.opacity = 1 - u; }, () => {
      seal.visible = false;
      // 2. flap opens (eased), goes behind letter once past vertical
      // R7: the flap opens fully FIRST: swings up to vertical, its hinge slides back onto the back panel (behind the letter plane)
      // while it stands above the top edge, then it leans back past vertical. Only then does the letter move.
      tween(1000, (k, u) => { const e = easeInOut(u); flapPivot.rotation.x = -Math.PI * 1.18 * e; const v = Math.min(1, Math.max(0, (e - 0.8) / 0.08)); flapPivot.position.z = (D / 2 + 0.075) * (1 - v) + (D / 2 + 0.004) * v; }, () => {
        // 3. letter slides out
        tween(950, (k, u) => { const e = easeInOut(u); letter.position.y = -0.02 + e * 1.07; }, () =>
          tween(450, (k, u) => { const e = easeOutCubic(u); letter.position.z = D / 2 + 0.03 + e * 0.9; letter.rotation.x = -0.15 * e; }, () => { envState = 'open'; openLetter(true); }));
      });
    }));
}
function openLetter(fromEnv) {
  paintLetter();
  const o = $('letter');
  if (fromEnv) {
    const p = new THREE.Vector3(); letter.getWorldPosition(p); p.project(ecam);
    const r = $('envc').getBoundingClientRect(); const x = r.left + (p.x * 0.5 + 0.5) * r.width, y = r.top + (-p.y * 0.5 + 0.5) * r.height;
    o.style.setProperty('--tx', (x - innerWidth / 2) + 'px'); o.style.setProperty('--ty', (y - innerHeight / 2) + 'px');
  }
  requestAnimationFrame(() => { o.classList.add('open'); o.setAttribute('aria-hidden', 'false'); if (options.onOpened) options.onOpened(); });
  $('envHint').textContent = 'Toque na carta para ler de novo';
}
// R7d: closing plays the opening in reverse: overlay shrinks onto the 3D letter, letter tilts back and slides down into the
// pocket (same x/z plane it came out on -> no intersections), the flap closes (eased, hinge slides forward again while it is
// vertical, mirror of the opening), then the round wax seal reappears with a small pop and the envelope floats again.
function closeEnv() {
  if (envState !== 'open') return;
  envState = 'closing'; $('envHint').textContent = 'Guardando…';
  tween(450, (k, u) => { const e = easeInOut(u); letter.position.z = D / 2 + 0.03 + (1 - e) * 0.9; letter.rotation.x = -0.15 * (1 - e); }, () =>
    tween(950, (k, u) => { const e = easeInOut(u); letter.position.y = -0.02 + (1 - e) * 1.07; }, () =>
      tween(1000, (k, u) => { const e = 1 - easeInOut(u); flapPivot.rotation.x = -Math.PI * 1.18 * e; const v = Math.min(1, Math.max(0, (e - 0.8) / 0.08)); flapPivot.position.z = (D / 2 + 0.075) * (1 - v) + (D / 2 + 0.004) * v; }, () => {
        flapPivot.rotation.x = 0; flapPivot.position.z = D / 2 + 0.075;
        seal.visible = true; seal.position.set(0, -0.6, 0.02); seal.rotation.z = 0; waxMat.opacity = heartMat.opacity = 1;
        // seal reappears: grows in, overshoots and settles with a small pop
        tween(420, (k, u) => seal.scale.setScalar(Math.max(0.01, easeOutBack(u) * (1 + 0.12 * Math.sin(Math.PI * u)))), () => {
          seal.scale.setScalar(1); tween(400, (k, u) => (floatAmt = u)); envState = 'closed';
          $('envHint').textContent = 'Toque no selo para abrir';
        });
      })));
}
function closeLetter() {
  const o = $('letter'); if (!o.classList.contains('open')) return;
  const p = new THREE.Vector3(); letter.getWorldPosition(p); p.project(ecam);
  const r = $('envc').getBoundingClientRect(); const x = r.left + (p.x * 0.5 + 0.5) * r.width, y = r.top + (-p.y * 0.5 + 0.5) * r.height;
  o.style.setProperty('--tx', (x - innerWidth / 2) + 'px'); o.style.setProperty('--ty', (y - innerHeight / 2) + 'px');
  o.classList.remove('open'); o.setAttribute('aria-hidden', 'true');
  tween(reduced ? 1 : 620, () => {}, () => closeEnv());
}
function openRead() {
  const o = $('letter');
  if (!o) return;
  o.classList.add('open');
  o.setAttribute('aria-hidden', 'false');
  if (options.onOpened) options.onOpened();
}
root.__openRead = openRead;
$('close').onclick = () => closeLetter();
$('letter').addEventListener('click', (e) => { if (e.target.id === 'letter') $('close').onclick(); });

// ---------- loop (fixed-step capable for deterministic QA) ----------
let lastNow = null, paused = false, simClock = 0, mapFrames = 40;
function advance(dt) {
  simClock += dt; simMs = simClock * 1000; simT = simClock; const t = simClock;
  runTweens(simMs); runEvents();
  if (!arrived) {
    const journey = options.getJourney ? options.getJourney() : { progress: 0, arrived: false, label: '' };
    if (journey.arrived) tellDelivered();
    if (skipping) {
      skipElapsed += dt;
      const dur = reduced ? 0.15 : 1.6;
      progress = Math.min(1, skipFrom + (1 - skipFrom) * Math.min(1, skipElapsed / dur));
    } else {
      const target = Math.min(1, Math.max(0, Number(journey.progress) || 0));
      progress = synced ? Math.max(progress, target) : target;
      synced = true;
    }
    $('prog').style.width = (progress * 100).toFixed(1) + '%';
    if (sceneApi) sceneApi.setProgress(progress);
    if (progress >= 1) $('eta').textContent = (SCENE ? `Chegou para ${options.to.label || 'você'}` : `Chegou em ${options.to.label || 'o destino'}`);
    else if (skipping) $('eta').textContent = `${AN.fly ? "Em voo" : "A caminho"} · ${Math.round(progress * 100)}% do caminho`;
    else $('eta').textContent = (options.getJourney && options.getJourney().label) || '';
    if (map3dOk && mc && aTravel) {
      const f = arcFrac(progress), tc = arcT(f), d = 0.004;
      const a = pt(tc), b = pt(Math.min(1, tc + d)), c = pt(Math.max(0, tc - d));
      const wa = screenToWorld(a.x, a.y), wb = screenToWorld(b.x, b.y), wc = screenToWorld(c.x, c.y);
      yawG.position.copy(wa);
      const dir = wb.clone().sub(wc); const yaw = Math.atan2(dir.x, dir.z);
      if (yawS === null || reduced) yawS = yaw;
      else { let dy = Math.atan2(Math.sin(yaw - yawS), Math.cos(yaw - yawS)); const step = dy * (1 - Math.exp(-dt * 5)); yawS += step; yawRate += (step / Math.max(dt, 1e-3) - yawRate) * (1 - Math.exp(-dt * 4)); }
      const tgtBank = AN.fly ? THREE.MathUtils.clamp(-yawRate * 0.9, -0.5, 0.5) : THREE.MathUtils.clamp(-yawRate * 0.15, -0.08, 0.08);
      bank += (tgtBank - bank) * (1 - Math.exp(-dt * 3));
      yawG.rotation.y = yawS; bankG.rotation.z = bank;
      const edgeK = Math.min(1, progress / 0.1, (1 - progress) / 0.12);
      let bob = 0;
      if (AN.fly && !reduced && clips.Travel) { const tw = aTravel.getEffectiveWeight(), ph = (aTravel.time / clips.Travel.duration) * Math.PI * 2; bob = -Math.sin(ph) * 3.5 * tw; bankG.position.y = (Math.sin(t * 0.55) * 8 + Math.sin(t * 0.23 + 1) * 5 + (gliding ? -3 : 3)) * edgeK + bob; bankG.rotation.x = (gliding ? 0.06 : -0.03) * edgeK; }
      else bankG.position.y = 0;
      // walkers: walk-cycle rate follows the real ground speed (no foot sliding)
      if (!AN.fly) { if (havePrev && dt > 0) { const v = wa.distanceTo(prevPos) / dt; const natural = (GAIT ? GAIT.speed : 0.3) * FLY_SCALE; const matched = THREE.MathUtils.clamp(v / Math.max(1, natural), 0.05, 2.5); const want = v < 12 ? 0.9 : matched; tScale += (want - tScale) * (1 - Math.exp(-dt * 6)); aTravel.setEffectiveTimeScale(tScale); } prevPos.copy(wa); havePrev = true; }
      updateFlightMode(dt);
      flyer.mixer.update(dt);
      if (mapBundle) { yawG.updateMatrixWorld(true); beakTip(mapBundle.position, flyer); mapBundle.position.y -= 0.17 * (HGT / 0.62) * FLY_SCALE; mapBundle.rotation.set(0, yawS + Math.sin(t * 1.7) * 0.15, bank * 0.5 + Math.sin(t * 2.3) * 0.06); mapBundle.visible = yawG.visible; }
    }
    if (progress >= 1) {
      arrived = true;
      $('skip').hidden = true;
      if (map3dOk) tween(500, (k) => flyer.root.scale.setScalar(FLY_SCALE * (1 - 0.08 * k)), () => { yawG.visible = false; if (mapBundle) mapBundle.visible = false; });
      startArrival();
      tellDelivered();
    }
  }
  if (map3dOk && ms && mc && onScreen(mapEl) && (!arrived || mapFrames-- > 0)) mr.render(ms, mc);
  if (!$('arrival').classList.contains('hidden')) {
    if (stageReady) stageTick(dt, t);
    if (envReady) {
      if (env.visible && !reduced && (envState === 'closed' || envState === 'opening')) { const f = floatAmt; env.position.y = Math.sin(t * 1.3) * 0.05 * f; env.rotation.y = Math.sin(t * 0.8) * 0.16 * f; env.rotation.x = Math.sin(t * 1.1) * 0.05 * f; env.rotation.z = Math.sin(t * 0.7) * 0.025 * f; }
      if (onScreen(envEl)) er.render(es, ecam);
    }
  }
}
let told = false;
function tellDelivered() {
  if (told || !options.onDelivered) return;
  const now = options.getJourney ? options.getJourney() : null;
  if (now && now.arrived) { told = true; options.onDelivered(); }
}
const boot = options.getJourney ? options.getJourney() : { progress: 0, arrived: false, label: '' };
if ((boot.arrived || boot.progress >= 1) && options.firstArrival) {
  // Primeira abertura de quem RECEBE uma carta já entregue: o fim da viagem acontece na
  // frente dela e a chegada é completa (mensageiro chegando + envelope), como ao vivo.
  progress = 0.86; synced = true; skipping = true; skipFrom = 0.86; skipElapsed = 0;
  $('skip').hidden = true; $('prog').style.width = '86%';
} else if (boot.arrived || boot.progress >= 1) {
  progress = 1; arrived = true; synced = true;
  yawG.visible = false; if (mapBundle) mapBundle.visible = false;
  $('skip').hidden = true; $('prog').style.width = '100%'; if (sceneApi) { sceneApi.setProgress(1); sceneApi.settle(); }
  $('eta').textContent = (SCENE ? `Chegou para ${options.to.label || 'você'}` : `Chegou em ${options.to.label || 'o destino'}`);
  startArrival({ quiet: true });
  if (boot.arrived) tellDelivered();
}
let rafId = 0;
function loop(now) {
  const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.05); lastNow = now;
  if (!paused && !document.hidden && alive) advance(dt);
  rafId = requestAnimationFrame(loop);
}
function onMapResize() {
  refreshMapLayout();
  fit(mr, mc, mapEl);
  if (stageReady) fit(sr, scam, stageEl);
  if (envReady) fit(er, ecam, envEl);
}
listen(window, 'resize', onMapResize);
listen(document, 'visibilitychange', () => { lastNow = null; if (!document.hidden) onMapResize(); });
let mapRo = null;
if (typeof ResizeObserver !== 'undefined' && mapEl) {
  mapRo = new ResizeObserver(() => onMapResize());
  mapRo.observe(mapEl);
}
// Fora da tela não desenha (o quadro anterior continua no canvas): menos GPU e bateria.
const hiddenEls = new Set();
const visIo = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) hiddenEls.delete(e.target); else hiddenEls.add(e.target); } }, { rootMargin: '120px' })
  : null;
for (const el of [mapEl, stageEl, envEl]) if (el && visIo) visIo.observe(el);
function onScreen(el) { return !el || !hiddenEls.has(el); }
rafId = requestAnimationFrame(loop);
requestAnimationFrame(() => { if (!alive) return; onMapResize(); });
setTimeout(() => { if (alive) onMapResize(); }, 120);
setTimeout(() => { if (alive) onMapResize(); }, 450);
window.__demo = {


  skip: () => $('skip').click(), state: () => ({ progress, stageState, envState, t: simClock, yaw: yawS, bank, tScale, x: yawG.position.x, z: yawG.position.z, y: bankG.position.y, gliding, calls: sr.info.render.calls, tris: sr.info.render.triangles, mcalls: mr.info.render.calls, cam: [+scam.position.x.toFixed(3), +scam.position.y.toFixed(3), +scam.position.z.toFixed(3)] }),
  pause: () => { paused = true; }, resume: () => { paused = false; lastNow = null; },
  step: (sec, fps = 30) => { const n = Math.max(1, Math.round(sec * fps)); for (let i = 0; i < n; i++) advance(1 / fps); return simClock; },
  clickStage: () => { const r = $('stage').getBoundingClientRect(); $('stage').dispatchEvent(new MouseEvent('click', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true })); },
  eyecam: (az, dist) => { orbit.enabled = false; perch.root.updateMatrixWorld(true); const h = headPos(new THREE.Vector3()); const bt = beakTip(new THREE.Vector3()); let c = AID === 'plane' || !BEAKBONE ? h : h.clone().lerp(bt, 0.25); if (lids.length) { setLids(1); const bx = new THREE.Box3(); lids.forEach((l) => { l.computeBoundingBox && l.computeBoundingBox(); bx.union(new THREE.Box3().setFromObject(l, true)); }); if (!bx.isEmpty()) c = bx.getCenter(new THREE.Vector3()); } const yaw = perch.root.rotation.y; scam.position.set(c.x + Math.sin(yaw + az) * dist, c.y + dist * 0.15, c.z + Math.cos(yaw + az) * dist); scam.lookAt(c); scam.updateMatrixWorld(); },
  camera: (az, el, dist) => { const s = new THREE.Spherical(dist, el, az); scam.position.setFromSpherical(s).add(orbit.target); scam.lookAt(orbit.target); },
  snap: () => { // R7 glitch hunt: world positions of every bone + every visible mesh origin, root scale, stage state
    perch.root.updateMatrixWorld(true); const out = []; const v = new THREE.Vector3();
    perch.root.traverse((o) => { if (o.isBone || (o.isMesh && o.visible && o.name === 'Envelope')) { o.getWorldPosition(v); out.push(+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)); } });
    const ws = new THREE.Vector3(); perch.root.getWorldScale(ws);
    return { p: out, s: +ws.x.toFixed(4), st: stageState, bundle: AID === 'stork' ? [bundle.visible, mapBundle ? mapBundle.visible && yawG.visible : false, perch.envelope ? perch.envelope.visible : null, MB ? perch.bundleMesh.visible : null, MB ? flyer.bundleMesh.visible && yawG.visible : null] : null, penv: penv.visible }; },
  snapNames: () => { const n = []; perch.root.traverse((o) => { if (o.isBone) n.push(o.name); }); return n; },
  envShow: () => { if (envState === 'none') showEnvelope(); }, envOpen: () => { if (envState === 'closed') openEnv(); }, envClose: () => closeEnv(), read: () => openRead(), envCam: (x, y, z) => { ecam.position.set(x, y, z); ecam.lookAt(0, 0.3, 0); },
  envCheck: () => { // R7: letter vs flap/back/pocket/inner interpenetration (points of each part inside the letter box and vice versa)
    env.updateMatrixWorld(true); const res = {}; const inv = new THREE.Matrix4().copy(letter.matrixWorld).invert(); const v = new THREE.Vector3();
    const hx = 1.42 / 2 - 0.001, hy = 0.95 / 2 - 0.001, hz = 0.004 + 0.001;
    const parts = { flap, back, inner, pocket0: pocket.children[0], pocket1: pocket.children[1], pocket2: pocket.children[2] };
    for (const [k, m] of Object.entries(parts)) { const P = m.geometry.attributes.position; let n = 0; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (Math.abs(v.x) < hx && Math.abs(v.y) < hy && Math.abs(v.z) < hz) n++; }
      // and letter sample points inside the part's local bounding box (only for thin, convex-ish parts)
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox.clone().expandByScalar(-0.002); const im = new THREE.Matrix4().copy(m.matrixWorld).invert(); let q = 0;
      for (let ix = -10; ix <= 10; ix++) for (let iy = -7; iy <= 7; iy++) { v.set(ix / 10 * hx, iy / 7 * hy, 0).applyMatrix4(letter.matrixWorld).applyMatrix4(im); if (k !== 'pocket0' && k !== 'pocket1' && k !== 'pocket2' && bb.containsPoint(v)) q++; }
      res[k] = [n, q]; }
    return { state: envState, flapRot: +flapPivot.rotation.x.toFixed(3), flapZ: +flapPivot.position.z.toFixed(3), letterY: +letter.position.y.toFixed(3), letterZ: +letter.position.z.toFixed(3), hits: res }; },
  footGap: () => { // R7: skinned sole verts -> raycast down onto scene props; also their screen position
    perch.root.updateMatrixWorld(true); let body = null; perch.root.traverse((o) => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
    if (!body) return null;
    const LEGR = { pigeon: ['0_Left_Limb_0', 'bone_20'], stork: ['bone_12', 'bone_22'], swan: ['bone_15', 'bone_18'] }[AID] || [];
    const sk = body.skeleton, legB = new Set(); sk.bones.forEach((bn, i) => { let q = bn; while (q && q.isBone) { if (LEGR.some((r) => q.name.replace(/[^A-Za-z0-9_]/g, '').endsWith(r))) { legB.add(i); break; } q = q.parent; } });
    const si = body.geometry.attributes.skinIndex, sw = body.geometry.attributes.skinWeight;
    const v = new THREE.Vector3(), P = []; const n = body.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } } if (legB.size && !legB.has(bi)) continue; body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld); P.push(v.clone()); }
    const mn = Math.min(...P.map((q) => q.y)); const sole = P.filter((q) => q.y < mn + 0.012 * HGT / 0.62);
    const ray = new THREE.Raycaster(); const tg = []; SET.root.traverseVisible((o) => { if (o.isMesh && !o.isInstancedMesh) tg.push(o); });
    const res = {}; for (const side of [-1, 1]) { const ft = sole.filter((q) => Math.sign(q.x - perch.root.position.x) === side); if (!ft.length) continue;
      const c = ft.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / ft.length);
      // R7b: per sole-vertex rays (a centroid can fall between toes); gap = median over verts that have support within 5 cm
      const gs = []; for (let i = 0; i < ft.length; i += Math.max(1, Math.floor(ft.length / 40))) { ray.set(ft[i].clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0)); const hh = ray.intersectObjects(tg, false)[0]; if (hh && ft[i].y - hh.point.y < 0.05) gs.push(ft[i].y - hh.point.y); }
      gs.sort((a, b) => a - b); const gm = gs.length ? gs[gs.length >> 1] : null;
      ray.set(c.clone().add(new THREE.Vector3(0, 0.3, 0)), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObjects(tg, false).find((x) => !x.object.parent?.userData?.isPerch);
      const sp = c.clone().project(scam); res[side < 0 ? 'L' : 'R'] = { foot: c.toArray().map((x) => +x.toFixed(3)), hit: h ? h.object.name || h.object.type : null, gap: h ? +(c.y - h.point.y).toFixed(4) : null, soleGap: gm === null ? null : +gm.toFixed(4), supported: +(gs.length / Math.ceil(ft.length / Math.max(1, Math.floor(ft.length / 40)))).toFixed(2), screen: [+(sp.x * 0.5 + 0.5).toFixed(3), +(0.5 - sp.y * 0.5).toFixed(3)] }; }
    return res; },
  bigMeshes: () => { const out = []; ss.traverseVisible((o) => { if (o.isMesh && !o.isSkinnedMesh) { const g = o.geometry; const t = (g.index ? g.index.count : g.attributes.position.count) / 3; if (t > 5000) { g.computeBoundingBox(); out.push([Math.round(t), g.boundingBox.min.toArray().map((x) => +x.toFixed(1)), g.boundingBox.max.toArray().map((x) => +x.toFixed(1)), g.attributes.position.count]); } } }); return out; },
  sceneStats: () => { const out = []; ss.traverseVisible((o) => { if (o.isMesh || o.isPoints || o.isSprite) { const g = o.geometry; const t = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0); out.push([o.type, o.name || o.parent?.name || '', Math.round(t * (o.isInstancedMesh ? o.count : 1)), o.material?.type, o.material?.transparent ? 'T' : '', o.castShadow ? 'cs' : '', o.material?.color?.getHexString(), o.material?.uuid?.slice(0,4), o.parent === SET.root ? 'root' : (o.parent?.type + ':' + (o.parent?.parent === SET.root ? 'root' : 'deep')), !!o.material?.map]); } }); return out.sort((a, b) => b[2] - a[2]); },
  lid: (k) => { forceLid = k; setLids(k); }, lidU: () => lids.map((l) => { const u = l.material && l.material.userData && l.material.userData.uClose; return u && typeof u === 'object' ? u.value : u; }), fidget: (i) => playFidget(i), lids: () => [lids.length, EYES ? EYES.eyes.map((e) => e.refined || 0) : []], lidInfo: () => lids.map((l) => { const b = new THREE.Box3().setFromObject(l); return [l.type, l.visible, l.parent && l.parent.name, b.getCenter(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)), b.getSize(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3))]; }),
  info: () => ({ calls: sr.info.render.calls, tris: sr.info.render.triangles, geo: sr.info.memory.geometries, tex: sr.info.memory.textures }),
};
return () => {
  disposing = true;
  alive = false;
  cancelAnimationFrame(rafId);
  try { if (visIo) visIo.disconnect(); } catch (e) {}
  off.forEach((fn) => fn());
  try { if (mapRo) mapRo.disconnect(); } catch (e) {}
  try { orbit.dispose(); } catch (e) {}
  try { if (map) map.remove(); } catch (e) {}
  try { if (sceneApi) sceneApi.dispose(); } catch (e) {}
  loseAllRenderers();
  try { draco.dispose(); } catch (e) {}
  Object.values(SND).forEach((a) => { try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {} });
  if (window.__demo) delete window.__demo;
  root.replaceChildren();
};
}
