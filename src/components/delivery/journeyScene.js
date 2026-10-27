/* eslint-disable */
// @ts-nocheck
// Viagem sem endereço (anônima ou para quem não tem endereço): sem mapa, sem tiles, sem
// coordenadas. "sky" = céu com nuvens (quem voa); "campo" = estrada no campo (quem anda).
// Camadas em SVG; o movimento é só transform (CSS), o caminho dá a posição do animal 3D.

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const cloud = (x, y, s, o) =>
  `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><ellipse cx="0" cy="0" rx="26" ry="11"/><ellipse cx="-14" cy="-6" rx="13" ry="10"/><ellipse cx="8" cy="-10" rx="15" ry="12"/><ellipse cx="22" cy="-3" rx="10" ry="8"/></g>`;
const tree = (x, y, s) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1.6" y="-2" width="3.2" height="12" rx="1.2" fill="#8a6a4a"/><circle cx="0" cy="-8" r="8" fill="#7fb36d"/><circle cx="-5" cy="-4" r="5.5" fill="#8cc07a"/><circle cx="5" cy="-5" r="6" fill="#74a863"/></g>`;
const flower = (x, y, c) => `<g transform="translate(${x} ${y})"><circle r="1.8" fill="${c}"/><circle r="0.8" fill="#fff3c4"/></g>`;

// duas cópias lado a lado (0..400 e 400..800) → laço sem emenda ao andar -400
const twice = (fn) => fn(0) + fn(400);

function skyMarkup(night) {
  const top = night ? '#2c2552' : '#ffd6e0';
  const mid = night ? '#5b4a7c' : '#ffe9e4';
  const low = night ? '#8f6f8f' : '#fff6ec';
  const stars = night
    ? Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 73) % 400}" cy="${(i * 37) % 150 + 6}" r="${i % 3 ? 0.7 : 1.1}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`).join('')
    : '';
  return `
  <defs><linearGradient id="js-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#js-sky)"/>
  ${stars}
  <circle cx="318" cy="58" r="${night ? 16 : 22}" fill="${night ? '#fff6dc' : '#ffe7a8'}" opacity="${night ? 0.95 : 0.85}"/>
  <g class="js-drift js-far" fill="#fff" >${twice((o) => cloud(40 + o, 70, 0.9, 0.55) + cloud(190 + o, 46, 0.7, 0.45) + cloud(320 + o, 110, 0.8, 0.5))}</g>
  <g class="js-drift js-mid" fill="#fff">${twice((o) => cloud(110 + o, 150, 1.2, 0.75) + cloud(280 + o, 190, 1.05, 0.7))}</g>
  <g class="js-drift js-near" fill="#fff">${twice((o) => cloud(20 + o, 268, 1.9, 0.92) + cloud(170 + o, 284, 2.2, 0.95) + cloud(320 + o, 262, 1.8, 0.9))}</g>`;
}

function campoMarkup(night) {
  const top = night ? '#3a3360' : '#ffe3e6';
  const low = night ? '#8d7a95' : '#fff4e8';
  return `
  <defs><linearGradient id="js-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${low}"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#js-sky)"/>
  <circle cx="320" cy="52" r="18" fill="${night ? '#fff6dc' : '#ffe7a8'}" opacity=".9"/>
  <g class="js-drift js-far" fill="#fff">${twice((o) => cloud(60 + o, 48, 0.7, 0.6) + cloud(250 + o, 36, 0.6, 0.5))}</g>
  <g class="js-drift js-far">${twice((o) => `<path d="M${o} 150 Q ${o + 70} 112 ${o + 140} 142 T ${o + 280} 136 T ${o + 400} 148 V 300 H ${o} Z" fill="${night ? '#6f7f78' : '#cfe3c2'}"/>`)}</g>
  <g class="js-drift js-mid">${twice((o) => `<path d="M${o} 186 Q ${o + 90} 150 ${o + 190} 180 T ${o + 400} 176 V 300 H ${o} Z" fill="${night ? '#5f7466' : '#b5d6a4'}"/>` + tree(o + 40, 172, 0.9) + tree(o + 230, 178, 0.8) + tree(o + 330, 170, 1))}</g>
  <path d="M0 214 Q 110 186 220 210 T 400 204 V 300 H 0 Z" fill="${night ? '#55705a' : '#9cc98b'}"/>
  <path class="js-road-edge" d="M70 300 C 84 272, 80 252, 140 232 S 250 216, 266 190 S 306 152, 322 136" fill="none" stroke="#d9c09a" stroke-width="26" stroke-linecap="round"/>
  <path class="js-road" d="M70 300 C 84 272, 80 252, 140 232 S 250 216, 266 190 S 306 152, 322 136" fill="none" stroke="#ead6b4" stroke-width="18" stroke-linecap="round"/>
  <g class="js-drift js-near">${twice((o) => tree(o + 10, 292, 1.7) + tree(o + 370, 286, 1.5) + flower(o + 90, 284, '#f29bb0') + flower(o + 150, 292, '#f7c1cf') + flower(o + 210, 280, '#f29bb0') + flower(o + 300, 294, '#fbd38d'))}</g>`;
}

export function mountJourneyScene(el, opts) {
  const kind = opts.kind === 'campo' ? 'campo' : 'sky';
  const hour = new Date().getHours();
  const night = hour >= 19 || hour < 6;
  const pathD = kind === 'campo'
    ? 'M94 254 C 104 244, 112 238, 140 232 S 250 216, 266 190 S 306 152, 322 136'
    : 'M96 228 C 150 130, 232 260, 318 98';
  const fromMark = opts.fromAnon
    ? `<circle r="13" fill="#fff" stroke="#e85a7a" stroke-width="2.5"/><text y="5.5" text-anchor="middle" font-size="16" font-weight="700" fill="#e85a7a" font-family="Fraunces, serif">?</text>`
    : `<circle r="7" fill="#fff" stroke="#e85a7a" stroke-width="3"/>`;
  const heart = `<path d="M0 9 C -14 0 -13 -10 -6 -11 C -2 -11.5 0 -8 0 -6 C 0 -8 2 -11.5 6 -11 C 13 -10 14 0 0 9 Z" fill="#e85a7a" stroke="#fff" stroke-width="2"/>`;
  const start = kind === 'campo' ? [94, 254] : [96, 228];
  const end = kind === 'campo' ? [322, 136] : [318, 98];
  const label = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" class="js-label">${esc(t)}</text>`;
  el.classList.add('journey-scene', `is-${kind}`);
  if (night) el.classList.add('is-night');
  if (opts.reduced) el.classList.add('is-still');
  el.innerHTML = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${kind === 'campo' ? 'Estrada no campo' : 'Viagem pelo céu'}">
    ${kind === 'campo' ? campoMarkup(night) : skyMarkup(night)}
    <defs><mask id="js-done-mask" maskUnits="userSpaceOnUse"><path class="js-done" d="${pathD}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/></mask></defs>
    <path class="js-trail" d="${pathD}" fill="none" stroke="${kind === 'campo' ? '#b9936a' : '#ffffff'}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 7" opacity=".9"/>
    <path class="js-trail-done" d="${pathD}" fill="none" stroke="#e85a7a" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 7" mask="url(#js-done-mask)"/>
    <g transform="translate(${start[0]} ${start[1]})">${fromMark}</g>
    ${label(start[0], start[1] + 26, opts.fromLabel || 'Alguém especial')}
    <g transform="translate(${end[0]} ${end[1]})">${heart}</g>
    ${label(end[0], end[1] - 18, opts.toLabel || 'Você')}
  </svg>`;
  const svg = el.querySelector('svg');
  const path = el.querySelector('.js-trail');
  const done = el.querySelector('.js-done');
  let len = 0;
  try { len = path.getTotalLength(); } catch (e) { len = 400; }
  const setProgress = (p) => {
    const v = Math.max(0, Math.min(1, p)) * len;
    done.setAttribute('stroke-dasharray', `${v} ${len + 10}`);
  };
  setProgress(opts.progress || 0);
  const frame = opts.frame || el;
  return {
    /** Ponto do caminho (0..1) em px do contêiner do mapa, como o Leaflet devolvia. */
    point(t) {
      const p = path.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
      const m = svg.getScreenCTM();
      const r = frame.getBoundingClientRect();
      if (!m) return { x: 0, y: 0 };
      const q = new DOMPoint(p.x, p.y).matrixTransform(m);
      return { x: q.x - r.left, y: q.y - r.top };
    },
    setProgress,
    /** Para quando chega (as nuvens/morros seguem bem devagar). */
    settle() { el.classList.add('is-arrived'); },
    dispose() { el.replaceChildren(); },
  };
}
