/* eslint-disable */
// @ts-nocheck
import { TIER } from './tier.js';
// Round 5: soft, rounded, clay-like dioramas built procedurally (no blocky low-poly kit).
// Everything is smooth-shaded: noise-displaced subdivided spheres (canopies, bushes, rocks, hills),
// lathe profiles (trunks, hay bales, mushrooms, posts), rounded boxes (barn planks, trim, cottage).
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (a, b) => a + (b - a) * rnd();
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- noise ----------
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf); const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w) * 2 - 1;
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.6 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.12;

// ---------- textures ----------
function canvasTex(w, h, draw, rep = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t;
}
function speckle(g, w, h, base, cols, n, smin, smax, a0 = 0.05, a1 = 0.22) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = R(a0, a1); const s = R(smin, smax); g.beginPath(); g.ellipse(R(0, w), R(0, h), s, s * R(0.5, 1), R(0, 3), 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
const grassTex = (base = '#97ab78', cols = ['#8aa06c', '#a3b585', '#86996a', '#b0bd8c', '#7f9466']) => canvasTex(512, 512, (g, w, h) => speckle(g, w, h, base, cols, 3200, 4, 26, 0.04, 0.16), 14);
const strawTex = () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d6bf86'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.strokeStyle = ['#c3a768', '#e4d1a0', '#b39657', '#cbb177'][i % 4]; g.globalAlpha = 0.55; g.lineWidth = R(0.6, 1.6); const x = R(0, w), y = R(0, h), a = R(-0.5, 0.5); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y + R(-3, 3), x + Math.cos(a) * 20, y + Math.sin(a) * 20); g.stroke(); } }, 1);
const _texMemo = new Map(); const memoTex = (k, f) => { if (!_texMemo.has(k)) _texMemo.set(k, f()); return _texMemo.get(k); };
const barkTex = () => memoTex('bark', () => canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#8a6c55'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = i % 2 ? '#74583f' : '#9b7d63'; g.globalAlpha = 0.45; g.lineWidth = R(2, 6); g.beginPath(); const x = R(0, w); g.moveTo(x, 0); g.bezierCurveTo(x + R(-10, 10), h / 3, x + R(-10, 10), h * 2 / 3, x + R(-6, 6), h); g.stroke(); } }, 1));
const woodTex = (base) => memoTex('wood' + base, () => canvasTex(64, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { g.strokeStyle = i % 2 ? 'rgba(60,35,20,.18)' : 'rgba(255,240,220,.12)'; g.lineWidth = R(1, 3); g.beginPath(); const x = R(0, w); g.moveTo(x, 0); g.bezierCurveTo(x + R(-4, 4), h / 3, x + R(-4, 4), 2 * h / 3, x, h); g.stroke(); } }, 1));
// path with soft, noisy, transparent edges + pebbles
const pathTex = () => canvasTex(256, 512, (g, w, h) => {
  speckle(g, w, h, '#cbb593', ['#bca382', '#d8c6a6', '#b49a78', '#e0d0b4'], 1800, 2, 10, 0.06, 0.25);
  for (let i = 0; i < 220; i++) { g.fillStyle = ['#a8968a', '#bdb0a2', '#958274'][i % 3]; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(R(0, w), R(0, h), R(2, 5), R(1.5, 3.5), R(0, 3), 0, 7); g.fill(); }
  g.globalAlpha = 1; const img = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = Math.abs(x / w - 0.5) * 2; const n = vnoise(x * 0.05, y * 0.05, 3.1) * 0.12 + vnoise(x * 0.2, y * 0.2, 1.7) * 0.05;
    const a = 1 - THREE.MathUtils.smoothstep(u, 0.62 + n, 0.98 + n); img.data[(y * w + x) * 4 + 3] = Math.max(0, Math.min(255, a * 255));
  }
  g.putImageData(img, 0, 0);
}, 1);

export function softTex(kind) {
  return canvasTex(128, 128, (g, w, h) => {
    if (kind === 'heart') { g.fillStyle = '#f08aa3'; g.beginPath(); g.moveTo(64, 108); g.bezierCurveTo(10, 70, 14, 22, 52, 26); g.bezierCurveTo(60, 28, 64, 36, 64, 40); g.bezierCurveTo(64, 36, 68, 28, 76, 26); g.bezierCurveTo(114, 22, 118, 70, 64, 108); g.fill(); return; }
    if (kind === 'star') { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.15, 'rgba(255,236,170,.9)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 10 : 60; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.fill(); return; }
    if (kind === 'petal') { g.fillStyle = '#f6c6d2'; g.beginPath(); g.ellipse(64, 64, 26, 50, 0.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(58, 50, 8, 22, 0.4, 0, 7); g.fill(); return; }
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const c = kind === 'dust' ? '214,196,165' : kind === 'splash' ? '235,248,255' : '255,255,255';
    gr.addColorStop(0, `rgba(${c},.9)`); gr.addColorStop(0.5, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// ---------- clay material ----------
const matCache = new Map();
function clay(color, o = {}) {
  const key = color + JSON.stringify({ ...o, map: o.map ? o.map.uuid : null }); if (matCache.has(key)) return matCache.get(key);
  const m = new (TIER.name === 'low' ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial)({ color, roughness: o.rough ?? 0.72, metalness: 0, vertexColors: o.vc ?? false, ...(TIER.name === 'low' ? {} : { sheen: o.sheen ?? 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff4e6) }), envMapIntensity: 0.55, map: o.map ?? null, side: o.side ?? THREE.FrontSide });
  matCache.set(key, m); return m;
}
const shade = (m) => { m.traverse?.((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); if (m.isMesh) { m.castShadow = m.receiveShadow = true; } return m; };

// colour per vertex: ambient-occlusion-ish darkening towards the bottom and a hue jitter
function paint(g, base, { dark = 0.62, jitter = 0.05, yMin, yMax, noise = 1.3, s = 0 } = {}) {
  const p = g.attributes.position, c = new THREE.Color(base), out = new Float32Array(p.count * 3), hsl = {}; c.getHSL(hsl);
  g.computeBoundingBox(); const y0 = yMin ?? g.boundingBox.min.y, y1 = yMax ?? g.boundingBox.max.y; const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = THREE.MathUtils.clamp((y - y0) / Math.max(1e-4, y1 - y0), 0, 1);
    const n = fbm(x * noise + s, y * noise, z * noise);
    tmp.setHSL(hsl.h + n * jitter * 0.5, hsl.s * (1 + n * 0.15), hsl.l * (dark + (1 - dark) * Math.pow(k, 0.7)) * (1 + n * jitter * 2));
    out[i * 3] = tmp.r; out[i * 3 + 1] = tmp.g; out[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3)); return g;
}
// noise-displaced subdivided sphere ("clay blob")
function blobGeo(r, { detail = 4, amp = 0.16, freq = 1.6, sy = 1, sx = 1, sz = 1, flatBottom = false, s = R(0, 100) } = {}) {
  let g = new THREE.IcosahedronGeometry(1, Math.max(0, Math.min(detail, 3) - TIER.dd)); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const n = fbm(v.x * freq + s, v.y * freq, v.z * freq + s * 0.3);
    v.multiplyScalar(r * (1 + amp * n)); v.x *= sx; v.y *= sy; v.z *= sz; if (flatBottom && v.y < -r * sy * 0.35) v.y = -r * sy * 0.35 + (v.y + r * sy * 0.35) * 0.15;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
function lathe(profile, seg = 24) { const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg); g.computeVertexNormals(); return g; }
const moved = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { const m = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(s, s, s)); return g.clone().applyMatrix4(m); };
const noUV = (g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; };

// ---------- props ----------
const PAL = {
  leaf: ['#7f9a5e', '#8ba566', '#73905a', '#97a96d', '#6f8a58'], trunk: '#8a6c55', rock: ['#b4aca0', '#a9a397', '#bfb6a6'],
  grassA: '#7f965f', grassB: '#b4c08a', bloom: ['#f2ede4', '#e9b9c4', '#e8cf7e', '#b7a6cf', '#f0c9a8'],
};
function tree(h = 3, o = {}) {
  const g = new THREE.Group(); const lean = o.lean ?? R(-0.08, 0.08);
  // trunk: smooth lathe with root flare, slightly curved by shear
  const r0 = h * 0.055; const prof = [[0, 0]]; for (let i = 0; i <= 10; i++) { const y = (i / 10) * h * 0.72; prof.push([r0 * (0.75 + 1.1 * Math.exp(-y / (h * 0.06))) * (1 - 0.35 * i / 10), y]); } prof.push([0.001, h * 0.74]);
  const tg = lathe(prof, 20); const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + lean * y * y / h); } tg.computeVertexNormals();
  const tm = new THREE.Mesh(tg, clay(PAL.trunk, { map: barkTex() })); g.add(tm);
  // a couple of soft limbs reaching into the canopy
  for (let k = 0; k < 2; k++) { const a = R(0, 6.3); const c = new THREE.CatmullRomCurve3([V3(lean * h * 0.3, h * 0.5, 0), V3(Math.cos(a) * h * 0.12, h * 0.62, Math.sin(a) * h * 0.12), V3(Math.cos(a) * h * 0.2, h * 0.72, Math.sin(a) * h * 0.2)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 10, r0 * 0.35, 8), tm.material)); }
  // canopy: cluster of puffy noise blobs, merged into one vertex-coloured mesh; centre sits on the trunk top
  const parts = []; const cr = h * (o.crown ?? 0.3); const top = V3(lean * h * 0.5, h * 0.78, 0); const n = o.puffs ?? 7; const leafC = o.leaf ?? PAL.leaf[Math.floor(R(0, PAL.leaf.length))];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R(-0.3, 0.3); const d = i === 0 ? 0 : cr * R(0.55, 0.85); const y = i === 0 ? cr * 0.35 : R(-0.2, 0.45) * cr;
    const rr = i === 0 ? cr * 1.0 : cr * R(0.55, 0.78);
    parts.push(moved(blobGeo(rr, { detail: i === 0 ? 3 : 2, amp: 0.14, freq: 1.4, sy: 0.88 }), top.x + Math.cos(a) * d, top.y + y, top.z + Math.sin(a) * d));
  }
  const cg = paint(mergeGeometries(parts), leafC, { dark: 0.55, jitter: 0.12, noise: 1.1 / cr });
  const cm = new THREE.Mesh(cg, clay(0xffffff, { vc: true, rough: 0.8, sheen: 0.5 })); g.add(cm);
  shade(g); g.userData.collider = { r: Math.max(r0 * 2.2, 0.18), h }; return g;
}
function bush(r = 0.5, color) {
  const parts = []; const n = 4; for (let i = 0; i < n; i++) { const a = (i / n) * 6.3 + R(-0.4, 0.4); parts.push(moved(blobGeo(r * R(0.55, 0.8), { detail: 3, amp: 0.15, sy: 0.85 }), Math.cos(a) * r * 0.45, r * R(0.35, 0.55), Math.sin(a) * r * 0.45)); }
  parts.push(moved(blobGeo(r * 0.75, { detail: 3, amp: 0.12, sy: 0.85 }), 0, r * 0.75, 0));
  const g = paint(mergeGeometries(parts), color ?? PAL.leaf[Math.floor(R(0, 5))], { dark: 0.5, jitter: 0.12, yMin: 0, noise: 2 / r });
  return shade(new THREE.Mesh(g, clay(0xffffff, { vc: true, rough: 0.8, sheen: 0.5 })));
}
function rock(r = 0.3, color) {
  const g = paint(blobGeo(r, { detail: 4, amp: 0.22, freq: 1.3, sy: 0.6, flatBottom: true }), color ?? PAL.rock[Math.floor(R(0, 3))], { dark: 0.72, jitter: 0.06, noise: 3 / r });
  const m = shade(new THREE.Mesh(g, clay(0xffffff, { vc: true, rough: 0.85, sheen: 0.2 }))); m.position.y = r * 0.12; return m;
}
function hills(rad, y, color = '#9fb088') {
  const parts = []; const n = 22;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R(-0.1, 0.1); const r = rad * R(0.95, 1.15); const s = rad * R(0.18, 0.3); parts.push(moved(blobGeo(s, { detail: 3, amp: 0.1, freq: 1.0, sy: R(0.28, 0.45), sx: R(1.3, 1.9) }), Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, 0)); }
  // tiny distant trees dotting the hills
  for (let i = 0; i < 70; i++) { const a = R(0, 6.3), r = rad * R(0.78, 0.98); parts.push(moved(blobGeo(R(0.35, 0.7), { detail: 1, amp: 0.1, sy: 1.2 }), Math.cos(a) * r, y + R(0.2, 1.2), Math.sin(a) * r)); }
  const g = paint(mergeGeometries(parts), color, { dark: 0.85, jitter: 0.1, noise: 0.15, yMin: y - 1, yMax: y + rad * 0.12 });
  const m = new THREE.Mesh(g, clay(0xffffff, { vc: true, rough: 0.95, sheen: 0 })); m.receiveShadow = false; return m;
}
// ground with a flat play area that rolls gently into soft mounds further out
function groundMesh(y, r, tex, flat = 4.5) {
  const g = new THREE.CircleGeometry(r, 96, 0, Math.PI * 2); const sub = new THREE.PlaneGeometry(r * 2, r * 2, TIER.ground, TIER.ground);
  const p = sub.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); const d = Math.hypot(x, z); const k = THREE.MathUtils.smoothstep(d, flat, flat + 6); p.setZ(i, k * (fbm(x * 0.12, z * 0.12, 2) * 1.4 + 0.3) + (d > r * 0.95 ? -2 : 0)); }
  sub.computeVertexNormals(); const m = new THREE.Mesh(sub, clay(0xffffff, { map: tex, rough: 0.95, sheen: 0.2 })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.dispose(); return m;
}
// tufts of curved, tapered blades (one tuft = 7 blades), instanced, swaying in the wind
function tuftGeo() {
  const parts = [];
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + R(-0.3, 0.3), lean = R(0.25, 0.7), hgt = R(0.6, 1.0), seg = 3; const pos = [], idx = [], col = [];
    for (let i = 0; i <= seg; i++) { const t = i / seg; const w = 0.026 * (1 - t * 0.92); const bend = lean * t * t * 0.45; const x = Math.cos(a) * (0.03 + bend), z = Math.sin(a) * (0.03 + bend); const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      pos.push(x + px, t * hgt, z + pz, x - px, t * hgt, z - pz); const k = 0.55 + 0.45 * t; col.push(k, k, k, k, k, k); if (i < seg) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); parts.push(g);
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
function grassTufts(n, rMin, rMax, y, avoid, colA = PAL.grassA, colB = PAL.grassB, size = [0.09, 0.17]) {
  n = Math.round(n * TIER.grass);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.85, vertexColors: true });
  const uT = { value: 0 };
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 ip=instanceMatrix*vec4(0,0,0,1); float w=sin(uT*1.5+ip.x*1.1+ip.z*0.8)*0.5+sin(uT*2.6+ip.z*2.0)*0.22; transformed.x+=w*0.25*position.y*position.y; transformed.z+=w*0.1*position.y*position.y;'); };
  const im = new THREE.InstancedMesh(tuftGeo(), m, n); const d = new THREE.Object3D(); const c = new THREE.Color(); const ca = new THREE.Color(colA), cb = new THREE.Color(colB);
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const a = R(0, Math.PI * 2), r = Math.sqrt(R(rMin * rMin, rMax * rMax)); const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (avoid && avoid(x, z)) continue; const s = R(size[0], size[1]) * (1 + 0.6 * THREE.MathUtils.smoothstep(r, 3, 8));
    d.position.set(x, y, z); d.rotation.set(R(-0.1, 0.1), R(0, 6.3), R(-0.1, 0.1)); d.scale.set(s * 1.4, s, s * 1.4); d.updateMatrix(); im.setMatrixAt(k, d.matrix); im.setColorAt(k, c.copy(ca).lerp(cb, R(0, 1))); k++;
  }
  im.count = k; im.receiveShadow = true; im.userData.tick = (t) => (uT.value = t); return im;
}
// real flower shapes: stem + 5-6 rounded petals + centre; one merged geometry per kind, instanced
function flowerGeo(kind) {
  const parts = []; const stemH = kind === 'lav' ? 0.16 : R(0.1, 0.16);
  const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.006, stemH * 0.5, 0), V3(0, stemH, 0.004)]), 4, 0.0035, 4); paint(stem, '#6f8a52', { dark: 0.7 }); parts.push(noUV(stem));
  const leaf = blobGeo(0.02, { detail: 1, amp: 0, sx: 0.5, sy: 0.12, sz: 1.2 }); paint(leaf, '#7a9659', { dark: 0.9 }); parts.push(moved(leaf, 0.012, stemH * 0.3, 0.012, 0, 0.7, 0.3));
  if (kind === 'lav') { for (let i = 0; i < 9; i++) { const b = blobGeo(0.008, { detail: 0, amp: 0 }); paint(b, '#a99ac7', { dark: 0.8 }); parts.push(moved(b, R(-0.004, 0.004), stemH + i * 0.009, R(-0.004, 0.004))); } }
  else {
    const col = { daisy: '#f1ece2', pink: '#e7b3c0', yellow: '#e9cf7c', peach: '#efc6a6' }[kind]; const np = kind === 'daisy' ? 8 : 5; const pr = kind === 'daisy' ? 0.016 : 0.018;
    for (let i = 0; i < np; i++) { const a = (i / np) * Math.PI * 2; const pg = blobGeo(pr, { detail: 0, amp: 0, sx: 0.55, sy: 0.18, sz: 1.0 }); paint(pg, col, { dark: 0.85 }); parts.push(moved(pg, Math.cos(a) * pr * 0.95, stemH + 0.004, Math.sin(a) * pr * 0.95, 0.25, -a + Math.PI / 2, 0)); }
    const cg = blobGeo(pr * 0.45, { detail: 1, amp: 0.1, sy: 0.6 }); paint(cg, kind === 'daisy' ? '#e3b552' : '#c98f4a', { dark: 0.8 }); parts.push(moved(cg, 0, stemH + 0.008, 0));
  }
  const g = mergeGeometries(parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') q.deleteAttribute(k); if (!q.attributes.normal) q.computeVertexNormals(); return q; })); return g;
}
function flowerField(n, rMin, rMax, y, avoid, kinds = ['daisy', 'pink', 'yellow', 'lav', 'peach']) {
  n = Math.max(6, Math.round(n * TIER.flowers));
  const grp = new THREE.Group(); const mat = clay(0xffffff, { vc: true, rough: 0.7, sheen: 0.4, side: THREE.DoubleSide });
  kinds.forEach((kd, j) => {
    const im = new THREE.InstancedMesh(flowerGeo(kd), mat, Math.ceil(n / kinds.length)); const d = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 4 && k < im.count; i++) {
      // flowers grow in little clumps
      const ca = R(0, 6.3), cr = Math.sqrt(R(rMin * rMin, rMax * rMax)); const cnt = Math.floor(R(3, 7));
      for (let q = 0; q < cnt && k < im.count; q++) { const x = Math.cos(ca) * cr + R(-0.18, 0.18), z = Math.sin(ca) * cr + R(-0.18, 0.18); if (avoid && avoid(x, z)) continue; const s = R(0.8, 1.35); d.position.set(x, y, z); d.rotation.set(R(-0.15, 0.15), R(0, 6.3), R(-0.15, 0.15)); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(k++, d.matrix); }
    }
    im.count = k; im.castShadow = false; im.receiveShadow = true; grp.add(im);
  });
  return grp;
}
function pathRibbon(points, width, y, groundTex) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => V3(p[0], y, p[1])));
  const N = 120, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t); const nx = -tg.z, nz = tg.x; const w = width * (0.9 + 0.12 * Math.sin(t * 11) + 0.06 * Math.sin(t * 31));
    for (let j = 0; j <= 4; j++) { const s = j / 4 - 0.5; pos.push(p.x + nx * w * s, y, p.z + nz * w * s); uv.push(j / 4, t * curve.getLength() / (width * 2)); }
    if (i < N) for (let j = 0; j < 4; j++) { const a = i * 5 + j; idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: pathTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; m.renderOrder = 1;
  m.userData.curve = curve; return m;
}
function skyDome(top, mid, bottom, radius = 80) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vp; void main(){ vp=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,mid,bot; varying vec3 vp; void main(){ float y=vp.y; vec3 c= y>0. ? mix(mid,top,pow(smoothstep(0.,1.,y),0.8)) : mix(mid,bot,smoothstep(0.,-0.3,y)); gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}',
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), m); s.renderOrder = -10; return s;
}
function puffCloud(w) { const parts = []; for (let i = 0; i < 6; i++) parts.push(moved(blobGeo(w * R(0.22, 0.38), { detail: 3, amp: 0.08, sy: 0.75 }), (i / 5 - 0.5) * w * 0.9, R(-0.05, 0.12) * w, R(-0.1, 0.1) * w)); const g = paint(mergeGeometries(parts), '#ffffff', { dark: 0.82, jitter: 0 }); return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0xfff6ee, emissiveIntensity: 0.35, fog: true })); }
function water(radius, y, color = 0x7fa9ad) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0, transparent: true, opacity: 0.9 });
  const uT = { value: 0 };
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.fragmentShader = 'uniform float uT;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n vec3 wp=vViewPosition; float a=sin(wp.x*9.+uT*1.3)*0.5+sin(wp.y*11.-uT*1.1)*0.5; normal=normalize(normal+vec3(a*0.03,a*0.03,0.));'); };
  const w = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), m); w.rotation.x = -Math.PI / 2; w.position.y = y; w.receiveShadow = true; w.userData.tick = (t) => (uT.value = t); return w;
}
function roundBale(r = 0.24, l = 0.38) {
  const c = r * 0.28; const prof = [[0.001, -l / 2]]; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; prof.push([r - c + Math.cos(a) * c, -l / 2 + c + Math.sin(a) * c]); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; prof.push([r - c + Math.cos(a) * c, l / 2 - c + Math.sin(a) * c]); } prof.push([0.001, l / 2]);
  const g = lathe(prof, 36); const tex = strawTex(); tex.repeat.set(3, 1);
  const b = new THREE.Mesh(g, clay(0xffffff, { map: tex, rough: 0.95, sheen: 0.5 })); b.rotation.z = Math.PI / 2;
  const grp = new THREE.Group(); grp.add(b);
  // spiral rolled face + twine bands
  for (const s of [-1, 1]) { const sp = []; for (let i = 0; i < 90; i++) { const a = i * 0.32, rr = (i / 90) * r * 0.85; sp.push(V3(s * (l / 2 + 0.002), Math.sin(a) * rr, Math.cos(a) * rr)); } grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 200, 0.004, 4), clay('#b09251', { rough: 1 }))); }
  for (const x of [-0.12, 0.12]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r + 0.003, 0.005, 6, 40), clay('#c45c48')); t.rotation.y = Math.PI / 2; t.position.x = x * l * 2; grp.add(t); }
  shade(grp); grp.position.y = r; return grp;
}
function rbox(w, h, d, r, color, o = {}) { return shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, TIER.name === "low" ? 1 : 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), clay(color, o))); }
function barn(w = 2.4, d = 2.0, h = 1.5) {
  const g = new THREE.Group(); const red = '#b0614f', trim = '#efe6d6';
  // vertical planks with slight tone variation
  const n = Math.round(w / 0.16); const plankTex = woodTex('#b0614f');
  for (const side of [1, -1]) for (let i = 0; i < n; i++) { const c = new THREE.Color(red).offsetHSL(0, R(-0.04, 0.02), R(-0.04, 0.03)); const p = rbox(w / n - 0.01, h, 0.06, 0.02, c.getStyle(), { map: plankTex }); p.position.set(-w / 2 + (i + 0.5) * (w / n), h / 2, side * d / 2); g.add(p); }
  for (const side of [1, -1]) for (let i = 0; i < Math.round(d / 0.16); i++) { const m = Math.round(d / 0.16); const p = rbox(0.06, h, d / m - 0.01, 0.02, red, { map: plankTex }); p.position.set(side * w / 2, h / 2, -d / 2 + (i + 0.5) * (d / m)); g.add(p); }
  // gable ends: rounded (arched) wall pieces
  const arch = new THREE.Shape(); arch.moveTo(-w / 2, 0); arch.absarc(0, 0, w / 2, Math.PI, 0, true); arch.lineTo(-w / 2, 0);
  for (const side of [1, -1]) { const e = shade(new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 24 }), clay(red))); e.scale.y = 0.55; e.position.set(0, h, side * d / 2 - 0.03); g.add(e); }
  // rounded roof: half-cylinder shell with overhang + ridge cap
  const roof = shade(new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.12, w / 2 + 0.12, d + 0.4, 40, 1, true, -Math.PI / 2, Math.PI), clay('#6e5446', { side: THREE.DoubleSide, rough: 0.8 })));
  roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.y = h; g.add(roof);
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; const seam = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, d + 0.36, 3, 8), clay('#5f483c'))); seam.rotation.x = Math.PI / 2; seam.position.set(Math.sin(a) * (w / 2 + 0.13), h + Math.cos(a) * (w / 2 + 0.13) * 0.55, 0); g.add(seam); }
  // white trim: corner boards, door with X brace, round loft window
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) { const t = rbox(0.1, h + 0.02, 0.1, 0.03, trim); t.position.set(x, h / 2, z); g.add(t); }
  const door = new THREE.Group(); const dw = w * 0.36, dh = h * 0.72; const dp = rbox(dw, dh, 0.04, 0.02, '#8c4c3e', { map: plankTex }); dp.position.y = dh / 2; door.add(dp);
  for (const [x, y, ww, hh] of [[0, dh - 0.04, dw + 0.08, 0.08], [0, 0.04, dw + 0.08, 0.08], [-dw / 2, dh / 2, 0.08, dh], [dw / 2, dh / 2, 0.08, dh]]) { const t = rbox(ww, hh, 0.05, 0.025, trim); t.position.set(x, y, 0.03); door.add(t); }
  for (const s of [1, -1]) { const t = rbox(Math.hypot(dw, dh) * 0.95, 0.07, 0.05, 0.025, trim); t.rotation.z = s * Math.atan2(dh, dw); t.position.set(0, dh / 2, 0.035); door.add(t); }
  door.position.set(0, 0, d / 2 + 0.05); g.add(door);
  const win = shade(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 32), clay(trim))); win.position.set(0, h + w * 0.27 * 0.55 + 0.05, d / 2 + 0.03); g.add(win);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 28), clay('#3e3a36', { rough: 0.4 })); glass.position.copy(win.position).add(V3(0, 0, -0.01)); g.add(glass);
  // little hay peeking from the loft
  const hay = shade(new THREE.Mesh(blobGeo(0.12, { detail: 2, amp: 0.3, sy: 0.6 }), clay('#d6bf86'))); hay.position.set(0, h + w * 0.27 * 0.55 - 0.06, d / 2 + 0.02); g.add(hay);
  g.userData.collider = { r: Math.hypot(w, d) / 2 + 0.2, h: h * 1.6 }; return g;
}
function cottage(w = 1.9, d = 1.6, h = 1.4) {
  const g = new THREE.Group();
  const walls = rbox(w, h, d, 0.12, '#efe3cf'); walls.position.y = h / 2; g.add(walls);
  // thick soft roof slabs (rounded boxes) meeting at the ridge
  const pitch = 0.62, sl = (w / 2 + 0.25) / Math.cos(pitch);
  for (const s of [1, -1]) { const r = rbox(sl, 0.14, d + 0.4, 0.06, '#b9806a', { rough: 0.8 }); r.rotation.z = -s * pitch; r.position.set(s * (w / 4 + 0.06), h + Math.tan(pitch) * (w / 4) + 0.06, 0); g.add(r); }
  const gab = new THREE.Shape(); gab.moveTo(-w / 2, 0); gab.lineTo(w / 2, 0); gab.lineTo(0, Math.tan(pitch) * w / 2); gab.lineTo(-w / 2, 0);
  for (const s of [1, -1]) { const e = shade(new THREE.Mesh(new THREE.ExtrudeGeometry(gab, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), clay('#efe3cf'))); e.position.set(0, h - 0.02, s * (d / 2) - 0.025); g.add(e); }
  const door = new THREE.Shape(); door.moveTo(-0.17, 0); door.lineTo(0.17, 0); door.lineTo(0.17, 0.42); door.absarc(0, 0.42, 0.17, 0, Math.PI, false); door.lineTo(-0.17, 0);
  const dm = shade(new THREE.Mesh(new THREE.ExtrudeGeometry(door, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3, curveSegments: 16 }), clay('#8e6a52', { map: woodTex('#8e6a52') }))); dm.position.set(0.25, 0, d / 2); g.add(dm);
  for (const x of [-0.45]) { const f = rbox(0.38, 0.38, 0.06, 0.04, '#f8f3ea'); f.position.set(x, h * 0.55, d / 2 + 0.01); g.add(f); const gl = rbox(0.3, 0.3, 0.05, 0.03, '#5b6f78', { rough: 0.25 }); gl.position.set(x, h * 0.55, d / 2 + 0.02); g.add(gl); const box = rbox(0.42, 0.08, 0.12, 0.03, '#8e6a52'); box.position.set(x, h * 0.55 - 0.24, d / 2 + 0.06); g.add(box); const fl = flowerField(14, 0, 0.001, 0, null, ['pink', 'daisy']); fl.position.set(x, h * 0.55 - 0.2, d / 2 + 0.06); fl.scale.setScalar(0.8); g.add(fl); }
  g.userData.collider = { r: Math.hypot(w, d) / 2 + 0.2, h: h * 1.8 }; return g;
}
function fence(points, y = 0) {
  const g = new THREE.Group(); const wood = '#a88a6c';
  for (let i = 0; i < points.length; i++) { const [x, z] = points[i]; const p = shade(new THREE.Mesh(lathe([[0.001, 0], [0.045, 0], [0.045, 0.5], [0.03, 0.56], [0.001, 0.58]], 12), clay(wood, { map: woodTex(wood) }))); p.position.set(x, y, z); g.add(p);
    if (i) { const [x0, z0] = points[i - 1]; const L = Math.hypot(x - x0, z - z0); for (const hh of [0.22, 0.42]) { const r = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.025, L - 0.02, TIER.name === 'low' ? 2 : 4, TIER.name === 'low' ? 6 : 10), clay(wood))); r.rotation.z = Math.PI / 2; r.rotation.y = -Math.atan2(z - z0, x - x0); r.position.set((x + x0) / 2, y + hh, (z + z0) / 2); g.add(r); } } }
  return g;
}
function mushroom(s = 1, cap = '#c8735e') { const g = new THREE.Group(); const st = shade(new THREE.Mesh(lathe([[0.001, 0], [0.03, 0], [0.025, 0.07], [0.022, 0.1], [0.001, 0.1]], 14), clay('#efe6d6'))); g.add(st); const c = shade(new THREE.Mesh(lathe([[0.001, 0.13], [0.04, 0.125], [0.07, 0.1], [0.075, 0.085], [0.06, 0.08], [0.001, 0.09]], 20), clay(cap))); g.add(c); for (let i = 0; i < 5; i++) { const a = R(0, 6.3), rr = R(0.015, 0.05); const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), clay('#f4ece0')); d.position.set(Math.cos(a) * rr, 0.13 - rr * 0.5, Math.sin(a) * rr); g.add(d); } g.scale.setScalar(s); return g; }
function lily(r = 0.12) { const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.008, 28, 1, false, 0.3, Math.PI * 2 - 0.6), clay('#7d985e', { rough: 0.6 })); g.receiveShadow = true; return g; }
function lotus() { const g = new THREE.Group(); for (let l = 0; l < 2; l++) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + l * 0.5; const p = new THREE.Mesh(blobGeo(0.03 - l * 0.008, { detail: 2, amp: 0, sx: 0.5, sy: 0.25, sz: 1 }), clay(l ? '#f6e8ea' : '#e8b3c1')); p.position.set(Math.cos(a) * 0.025, 0.012 + l * 0.01, Math.sin(a) * 0.025); p.rotation.set(0.6, -a + Math.PI / 2, 0); g.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), clay('#e3c16a')); c.position.y = 0.02; g.add(c); return shade(g); }
function reeds(n, a0, a1, r0, r1, y = 0) {
  const parts = [], heads = []; if (TIER.name === 'low') n = Math.round(n * 0.55);
  for (let i = 0; i < n; i++) { const a = R(a0, a1), r = R(r0, r1), x = Math.cos(a) * r, z = Math.sin(a) * r, hh = R(0.45, 0.95), l = R(-0.08, 0.08);
    parts.push(noUV(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, y, z), V3(x + l * 0.3, y + hh * 0.5, z), V3(x + l, y + hh, z + l * 0.4)]), 6, 0.007, 5)));
    if (i % 2 === 0) heads.push(moved(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), x + l * 0.95, y + hh - 0.05, z + l * 0.38));
    if (i % 3 === 0) { const leaf = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(x, y, z), V3(x + 0.05, y + hh * 0.4, z + 0.02), V3(x + 0.16, y + hh * 0.6, z + 0.05)]), 6, 0.01, 4); parts.push(noUV(leaf)); } }
  const g = new THREE.Group(); g.add(shade(new THREE.Mesh(paint(mergeGeometries(parts), '#7f9258', { dark: 0.6 }), clay(0xffffff, { vc: true })))); g.add(shade(new THREE.Mesh(mergeGeometries(heads.map(noUV)), clay('#7a5a40'))));
  return g;
}
function nest(r = 0.32) {
  const g = new THREE.Group(); const parts = [];
  for (let i = 0; i < 110; i++) { const a = R(0, 6.3), rr = r * R(0.7, 1.05); const p0 = V3(Math.cos(a) * rr, R(0, 0.14), Math.sin(a) * rr); const b = a + R(0.6, 1.2); const p1 = V3(Math.cos(b) * rr * R(0.8, 1.1), R(0, 0.14), Math.sin(b) * rr * R(0.8, 1.1)); parts.push(noUV(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p0.clone().lerp(p1, 0.5).multiplyScalar(1.08), p1]), 5, 0.008, 4))); }
  g.add(shade(new THREE.Mesh(paint(mergeGeometries(parts), '#9a7b5a', { dark: 0.6, jitter: 0.15, noise: 8 }), clay(0xffffff, { vc: true, rough: 1 }))));
  const bowl = shade(new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, r * 0.25, 12, 30), clay('#8a6c4e', { rough: 1 }))); bowl.rotation.x = Math.PI / 2; bowl.position.y = 0.06; g.add(bowl);
  return g;
}
// a perch branch that grows out of a trunk and runs exactly under the animal's feet (feet at origin, branch top at y=0)
function perchBranch(trunkPt, r0, r1, rTip, tipPt) {
  const under = V3(0, -rTip, 0);
  const curve = new THREE.CatmullRomCurve3([trunkPt, trunkPt.clone().lerp(under, 0.45).add(V3(0, 0.06, 0)), under.clone().add(V3(-0.25, 0, 0)), under, tipPt]);
  const N = 40, tube = new THREE.TubeGeometry(curve, N, 1, 12, false); const pa = tube.attributes.position;
  for (let i = 0; i < pa.count; i++) { const seg = Math.floor(i / 13) / N; const p = curve.getPointAt(Math.min(1, seg)); const v = V3(pa.getX(i), pa.getY(i), pa.getZ(i)).sub(p); const t = Math.min(1, seg / 0.8); const rr = seg < 0.8 ? r0 + (r1 - r0) * t : r1 + (rTip * 0.6 - r1) * (seg - 0.8) / 0.2; v.multiplyScalar(rr); pa.setXYZ(i, p.x + v.x, p.y + v.y, p.z + v.z); }
  tube.computeVertexNormals(); const g = new THREE.Group(); const m = clay(PAL.trunk, { map: barkTex() }); g.add(shade(new THREE.Mesh(tube, m)));
  const tip = shade(new THREE.Mesh(new THREE.SphereGeometry(rTip * 0.6, 12, 8), m)); tip.position.copy(tipPt); g.add(tip);
  // leaf clusters on the tip and a twig
  const lv = paint(mergeGeometries([0, 1, 2, 3, 4, 5, 6].map((i) => moved(blobGeo(0.05, { detail: 2, amp: 0.05, sx: 0.5, sy: 0.18, sz: 1.0 }), tipPt.x + R(-0.08, 0.08), tipPt.y + R(-0.02, 0.07), tipPt.z + R(-0.08, 0.08), R(-0.6, 0.6), R(0, 6.3), R(-0.5, 0.5)))), '#86a062', { dark: 0.75, jitter: 0.1 });
  g.add(shade(new THREE.Mesh(lv, clay(0xffffff, { vc: true, side: THREE.DoubleSide }))));
  // R7: measure the real bark top right under the perch point (0,?,0) and shift so the feet (y=0) grip it 3 mm deep
  let best = 1e9, top = 0; for (let i = 0; i <= 400; i++) { const sg = i / 400, p = curve.getPointAt(sg); const d = Math.hypot(p.x, p.z); if (d < best) { best = d; const t = Math.min(1, sg / 0.8); const rr = sg < 0.8 ? r0 + (r1 - r0) * t : r1 + (rTip * 0.6 - r1) * (sg - 0.8) / 0.2; top = p.y + rr; } }
  g.position.y += 0.006 - top; g.userData.perchTop = 0.006;
  return g;
}

// merge every static, non-instanced mesh into one mesh per (material, attribute layout) -> few draw calls
function mergeStatic(root, keep) {
  root.updateMatrixWorld(true); const groups = new Map(), victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.tick) return;
    for (let p = o; p && p !== root; p = p.parent) if (keep.has(p) || p.userData.tick || p.userData.keep) return;
    const m = o.material; if (Array.isArray(m) || m.transparent) return;
    const g = o.geometry;
    // untextured clay: bake the material colour into vertex colours so different colours share one draw call
    const bake = m.isMeshStandardMaterial && !m.onBeforeCompile.toString().includes('uT');
    const attrs = Object.keys(g.attributes).filter((k) => !bake || (k !== 'color' && k !== 'uv1' && (k !== 'uv' || m.map))).sort().join(',');
    const key = (bake ? 'VC|' + (m.map ? m.map.uuid : '') + '|' + m.roughness.toFixed(2) + '|' + m.side : m.uuid) + '|' + attrs + '|' + (g.index ? 'i' : 'n') + '|' + o.castShadow + o.receiveShadow;
    if (!groups.has(key)) groups.set(key, { m, list: [], cs: o.castShadow, rs: o.receiveShadow, bake }); groups.get(key).list.push(o);
  });
  for (const { m, list, cs, rs, bake } of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      if (bake) { const mc = o.material.color, n = g.attributes.position.count, old = o.material.vertexColors && g.attributes.color, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = mc.r * (old ? old.getX(i) : 1); col[i * 3 + 1] = mc.g * (old ? old.getY(i) : 1); col[i * 3 + 2] = mc.b * (old ? old.getZ(i) : 1); } for (const k of (o.material.map ? ['uv1', 'color'] : ['uv', 'uv1', 'color'])) if (g.attributes[k]) g.deleteAttribute(k); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
      return g; });
    const mg = mergeGeometries(geos); if (!mg) continue; geos.forEach((g) => g.dispose());
    const mm = new THREE.Mesh(mg, bake ? clay(0xffffff, { vc: true, rough: m.roughness, side: m.side, ...(m.map ? { map: m.map } : {}) }) : m); mm.castShadow = cs && TIER.name !== 'low'; mm.receiveShadow = rs; mm.matrixAutoUpdate = false; root.add(mm); victims.push(...list);
  }
  victims.forEach((o) => o.removeFromParent());
}
export function buildScene(id, _kit, hgt) {
  seed = 7 + id.length * 13;
  const root = new THREE.Group(); const ticks = []; const S = { colliders: [] };
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.x += x; o.position.y += y; o.position.z += z; o.rotation.y += ry; root.add(o); if (o.userData.tick) ticks.push(o.userData.tick); if (o.userData.collider) S.colliders.push({ c: V3(o.position.x, o.position.y + o.userData.collider.h * 0.5, o.position.z), r: o.userData.collider.r, h: o.userData.collider.h, y0: o.position.y }); return o; };
  const ring = (n, r0, r1, y, mk, avoidFront = true) => { if (TIER.name === "low") n = Math.ceil(n * 0.65); for (let i = 0; i < n; i++) { let a = (i / n) * Math.PI * 2 + R(-0.2, 0.2); if (avoidFront && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.55) continue; const r = R(r0, r1); add(mk(i), Math.cos(a) * r, y, Math.sin(a) * r, R(0, 6.3)); } };
  S.groundY = 0;
  // soft, desaturated, warm palette shared by all sets (sky top, horizon, below-horizon), fog matches the horizon
  S.sky = ['#9fc0dc', '#efe6d6', '#dcdcc8']; S.fog = [0xe8e2d2, 7, 34];

  if (id === 'pigeon') {
    const gy = -1.15; S.groundY = gy; S.perchY = 0;
    add(groundMesh(gy, 40, grassTex())); add(grassTufts(2600, 0.3, 9, gy, null)); add(flowerField(260, 0.6, 6, gy, null));
    const t = add(tree(3.4, { lean: 0.03, crown: 0.3 }), -1.75, gy, -0.55);
    // branch grows from the trunk (at its surface) and passes right under the feet
    add(perchBranch(V3(-1.62, -0.05, -0.5), 0.06, 0.035, 0.03, V3(0.6, 0.06, 0.18)));
    add(tree(2.8), 3.0, gy, -3.4); add(tree(3.2), -4.4, gy, -4.2); add(bush(0.5), 1.6, gy, -1.2); add(bush(0.35), -0.8, gy, 1.3);
    // garden bench with rounded slats
    const bench = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = rbox(1.2, 0.045, 0.12, 0.02, '#8fa59a'); p.position.set(0, 0.42, i * 0.14 - 0.14); bench.add(p); } for (let i = 0; i < 2; i++) { const p = rbox(1.2, 0.1, 0.045, 0.02, '#8fa59a'); p.position.set(0, 0.6 + i * 0.14, -0.24); bench.add(p); }
    for (const x of [-0.52, 0.52]) for (const z of [-0.2, 0.12]) { const l = rbox(0.06, 0.42, 0.06, 0.02, '#4b4743'); l.position.set(x, 0.21, z); bench.add(l); }
    bench.userData.collider = { r: 0.75, h: 0.8 }; add(bench, 2.0, gy, -1.7, -0.5);
    for (let i = 0; i < 7; i++) add(rock(R(0.08, 0.16)), -0.6 + i * 0.4, gy, 1.4 + Math.sin(i) * 0.2);
    ring(16, 6, 12, gy, (i) => (i % 3 ? tree(R(2.6, 3.8)) : bush(R(0.5, 0.9))));
    add(hills(24, gy - 0.5));
    S.cam = [1.2, 0.55, 3.0]; S.target = [0, 0.28, 0];
  } else if (id === 'stork') {
    // lower perch so the dropped bundle can be seen landing on the lawn
    const gy = -1.05; S.groundY = gy; S.perchY = 0;
    add(groundMesh(gy, 40, grassTex())); add(grassTufts(2400, 0.35, 9, gy, (x, z) => Math.hypot(x - 0.05, z - 0.45) < 0.35)); add(flowerField(200, 0.9, 6, gy, (x, z) => Math.hypot(x, z - 0.4) < 0.6));
    const h = add(cottage(), 2.1, gy, -1.9, -0.35);
    const ch = rbox(0.3, 0.75, 0.3, 0.06, '#b9806a'); add(ch, 1.68, gy + 1.4 + 0.75, -1.65);
    const ns = add(nest(0.34), 1.68, gy + 1.4 + 1.12, -1.65); S.nest = ns.position.clone();
    add(tree(3.0, { lean: -0.03, crown: 0.28 }), -2.2, gy, -0.9);
    add(perchBranch(V3(-2.05, -0.12, -0.82), 0.075, 0.045, 0.035, V3(0.55, 0.05, 0.12)));
    add(bush(0.45), -0.9, gy, -1.2); add(bush(0.38), 1.0, gy, 1.5);
    ring(14, 6, 13, gy, (i) => (i % 3 ? tree(R(2.6, 3.6)) : bush(R(0.5, 0.9))));
    add(hills(24, gy - 0.5));
    S.cam = [1.3, 0.45, 3.0]; S.target = [0.1, 0.3, 0];
  } else if (id === 'swan') {
    S.groundY = 0; S.waterY = 0.0; S.sink = -0.11 * hgt / 0.62;
    add(water(3.7, 0.0)); const bed = new THREE.Mesh(new THREE.CircleGeometry(3.7, 48), clay('#5d7d73')); bed.rotation.x = -Math.PI / 2; bed.position.y = -0.3; root.add(bed);
    const bank = groundMesh(0.04, 40, grassTex(), 5); bank.geometry = bank.geometry; root.add(bank);
    // pond cut-out: mask the bank inside the pond by a soft shore ring
    const shore = new THREE.Mesh(new THREE.RingGeometry(3.45, 4.0, 96), clay('#b9ab8d', { rough: 1 })); shore.rotation.x = -Math.PI / 2; shore.position.y = 0.045; root.add(shore);
    bank.material = bank.material.clone(); bank.material.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz;').replace('void main() {', 'varying vec3 vWP;\nvoid main() {'); sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vWP;\nvoid main() {\n if(length(vWP.xz)<3.5) discard;'); };
    add(grassTufts(2200, 3.9, 10, 0.04, null));
    const NR = TIER.name === 'low' ? 16 : 30; for (let i = 0; i < NR; i++) { const a = (i / NR) * 6.3 + R(-0.08, 0.08); add(rock(R(0.12, 0.3)), Math.cos(a) * R(3.55, 3.8), 0.0, Math.sin(a) * R(3.55, 3.8)); }
    for (let i = 0; i < 10; i++) { const a = R(0, 6.3), r = R(1.2, 3.1); add(lily(R(0.1, 0.17)), Math.cos(a) * r, 0.006, Math.sin(a) * r, R(0, 6)); if (i % 3 === 0) add(lotus(), Math.cos(a) * r, 0.006, Math.sin(a) * r); }
    add(reeds(70, 2.2, 4.3, 3.1, 3.7, 0)); add(reeds(30, 0.2, 0.9, 3.2, 3.7, 0));
    add(flowerField(160, 4.0, 7, 0.04, null));
    ring(18, 5.5, 12, 0.04, (i) => (i % 3 ? tree(R(2.6, 3.8)) : bush(R(0.5, 0.9))));
    add(hills(24, -0.4));
    S.cam = [1.3, 0.75, 2.6]; S.target = [0, 0.25, 0]; S.ripples = true;
  } else if (id === 'plane') {
    S.groundY = null; S.sky = ['#7fb0e0', '#cfe2f2', '#eef3f6']; S.fog = [0xdfeaf3, 6, 40];
    const clouds = new THREE.Group(); root.add(clouds); S.clouds = clouds;
    for (let i = 0; i < 34; i++) {
      const layer = i % 3; const c = puffCloud([R(5, 8), R(3, 5), R(1.6, 2.6)][layer]);
      let x = R(-26, 26), y, z; if (layer === 0) { z = R(-30, -16); y = R(-4, 5); } else if (layer === 1) { z = R(-14, 2); y = R(-5.5, -3.0); } else { z = R(-12, -4); y = R(-1.5, 3.0); }
      c.position.set(x, y, z); c.userData.v = [0.25, 0.5, 0.8][layer] * R(0.7, 1.3); clouds.add(c);
    }
    ticks.push((t, dt) => { clouds.children.forEach((s) => { s.position.x -= s.userData.v * dt * (S.cloudBoost || 1); if (s.position.x < -30) s.position.x = 30; }); });
    S.cam = [1.5, 0.35, 1.6]; S.target = [0, 0.18, 0];
  } else if (id === 'horse') {
    add(groundMesh(0, 40, grassTex()));
    const pathPts = [[-0.4, 10], [0.2, 4], [0, 0], [-0.5, -3], [0.4, -9]]; add(pathRibbon(pathPts, 1.3, 0.004));
    const onPath = (x, z) => Math.abs(x - 0.05 * Math.sin(z)) < 0.55;
    add(grassTufts(3200, 0.4, 10, 0, onPath)); add(flowerField(300, 1, 7, 0, (x, z) => Math.abs(x) < 0.9));
    const fp = []; for (let i = -7; i <= 7; i++) fp.push([-1.3 + Math.sin(i * 0.5) * 0.05, i * 1.0]); add(fence(fp));
    add(tree(3.4), 2.8, 0, -2.8); add(tree(3.0), -3.6, 0, -4.2); add(tree(2.6), 3.6, 0, 1.0);
    const log = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.8, 6, 16), clay('#8a6c55', { map: barkTex() }))); log.rotation.z = Math.PI / 2; log.position.y = 0.13; log.userData.collider = { r: 0.55, h: 0.3 }; add(log, 1.6, 0, 0.9, 0.8);
    add(rock(0.22), -2.0, 0, 1.4); add(rock(0.14), 1.2, 0, -1.6); add(bush(0.45), 2.2, 0, -0.6); add(mushroom(1.2), 1.3, 0, 1.3);
    ring(18, 6, 13, 0, (i) => (i % 3 ? tree(R(2.6, 4)) : bush(R(0.5, 1.0))));
    add(hills(24, -0.5));
    S.cam = [1.5, 0.75, 2.3]; S.target = [0, 0.32, 0]; S.dust = true;
  } else if (id === 'donkey') {
    add(groundMesh(0, 40, grassTex('#a3ab78', ['#949e6a', '#b4b886', '#9aa070', '#c0bd8e'])));
    add(pathRibbon([[0.5, 10], [0, 4], [0, 0], [0.4, -3], [-0.6, -9]], 1.35, 0.004));
    add(grassTufts(2800, 0.4, 10, 0, (x, z) => Math.abs(x) < 0.6, '#879461', '#bfbf8a')); add(flowerField(160, 1.2, 7, 0, (x, z) => Math.abs(x) < 0.9, ['daisy', 'yellow', 'lav']));
    add(barn(), -2.7, 0, -3.1, 0.4);
    add(roundBale(0.24, 0.4), 1.25, 0, -0.5, 0.3); add(roundBale(0.24, 0.4), 1.6, 0, -1.05, -0.2); add(roundBale(0.22, 0.38), 2.1, 0, -0.5, 1.4);
    S.colliders.push({ c: V3(1.6, 0.25, -0.7), r: 0.7, h: 0.5, y0: 0 });
    for (let i = 0; i < 30; i++) { const s = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.003, R(0.06, 0.14), 2, 4), clay('#d6bf86'))); s.position.set(R(0.9, 2.2), 0.005, R(-1.4, 0.2)); s.rotation.set(Math.PI / 2, 0, R(0, 6.3)); root.add(s); }
    const fp = []; for (let i = -6; i <= 6; i++) fp.push([2.3 + Math.sin(i * 0.4) * 0.06, i * 1.0]); add(fence(fp));
    // stacked rounded logs
    const logs = new THREE.Group(); [[0, 0], [0.26, 0], [-0.26, 0], [0.13, 0.22], [-0.13, 0.22], [0, 0.44]].forEach(([x, y]) => { const l = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.6, TIER.name === 'low' ? 3 : 6, TIER.name === 'low' ? 10 : 16), clay('#8a6c55', { map: barkTex() }))); l.rotation.x = Math.PI / 2; l.position.set(x, y + 0.12, 0); logs.add(l); const e = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), clay('#d9bf96')); e.position.set(x, y + 0.12, 0.42); logs.add(e); });
    logs.userData.collider = { r: 0.6, h: 0.6 }; add(logs, -1.7, 0, -0.9, 0.6);
    const pumpkin = (s) => { const g = new THREE.Group(); const b = shade(new THREE.Mesh(blobGeo(0.13, { detail: 4, amp: 0.05, sy: 0.75 }), clay('#d98d4f'))); const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 - 0.06 * Math.pow(Math.abs(Math.cos(a * 4)), 6); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } b.geometry.computeVertexNormals(); b.position.y = 0.1; g.add(b); const st = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 8), clay('#6f7a4c'))); st.position.y = 0.21; st.rotation.z = 0.3; g.add(st); g.scale.setScalar(s); return g; };
    add(pumpkin(1.1), -1.0, 0, 0.9, 0.4); add(pumpkin(0.8), -1.35, 0, 1.25); add(pumpkin(0.65), -0.75, 0, 1.35);
    // wheat as soft tufts
    add(grassTufts(400, 0, 1.6, 0, null, '#c9b06a', '#e5d39a', [0.25, 0.35]), 3.6, 0, -0.6);
    ring(16, 7, 13, 0, (i) => (i % 3 ? tree(R(2.6, 4)) : bush(R(0.5, 1.0))));
    add(hills(24, -0.5, '#aab08a'));
    S.sky = ['#a6c2da', '#f2e6d0', '#ddd8c0']; S.fog = [0xeee4d0, 7, 34]; S.cam = [1.4, 0.8, 2.4]; S.target = [0, 0.32, 0]; S.dust = true;
  } else { // turtle
    // R7m: soleGap ~2cm float — sink the perch so feet meet the stone/ground
    S.sink = -0.02;
    add(groundMesh(-0.035, 40, grassTex(), 3.5)); add(water(1.1, -0.02, 0x7fa9ad), 1.15, 0, -0.55);
    const stone = rock(0.42, '#b9b1a3'); stone.scale.y = 0.35; stone.position.y = -0.09; add(stone); S.stone = stone; S.stoneTop = 0.0;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.3; add(rock(R(0.07, 0.13)), 1.15 + Math.cos(a) * 1.12, -0.04, -0.55 + Math.sin(a) * 1.12); }
    add(lily(0.09), 1.3, -0.012, -0.4); add(lily(0.12), 0.9, -0.012, -0.9); add(lotus(), 0.9, -0.012, -0.9);
    add(reeds(18, 4.6, 5.6, 1.0, 1.2, -0.03), 1.15, 0, -0.55);
    add(grassTufts(2600, 0.45, 7, -0.035, (x, z) => (x - 1.15) ** 2 + (z + 0.55) ** 2 < 1.4, PAL.grassA, PAL.grassB, [0.06, 0.12]));
    add(mushroom(1.1), -0.7, -0.035, -0.4); add(mushroom(0.8, '#d6a067'), -0.82, -0.035, -0.3); add(mushroom(0.7), -0.9, -0.035, 0.3);
    add(flowerField(260, 0.7, 5, -0.035, (x, z) => (x - 1.15) ** 2 + (z + 0.55) ** 2 < 1.5 || (z > -0.4 && Math.abs(x) < 0.7 && z < 1.6)));
    add(bush(0.4), -1.3, -0.035, -1.1); add(bush(0.3), 0.4, -0.035, -1.8);
    ring(16, 3.5, 9, -0.035, (i) => (i % 2 ? bush(R(0.4, 0.8)) : tree(R(2.2, 3.2))));
    add(hills(22, -0.5));
    S.cam = [1.1, 0.6, 1.9]; S.target = [0, 0.15, 0]; S.ripples = true;
  }
  mergeStatic(root, new Set([S.clouds].filter(Boolean)));
  S.dome = skyDome(...S.sky); root.add(S.dome);
  S.root = root; S.tick = (t, dt) => ticks.forEach((f) => f(t, dt));
  return S;
}
