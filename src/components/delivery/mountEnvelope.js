/* eslint-disable */
// @ts-nocheck
// Envelope 3D só da carta (sem mapa e sem mensageiro). A folha em si entra em #letterPages.
import * as THREE from "three";

const SHELL = `
<section class="card envelope-only">
  <p class="eyebrow">sua carta</p>
  <h2 id="envTitle"></h2>
  <div class="stage"><canvas id="envc"></canvas></div>
  <p id="envHint" class="hint">Toque no selo para abrir</p>
</section>
<div id="letter" class="letter-overlay" aria-hidden="true">
  <article class="letter">
    <button id="close" class="close" type="button" aria-label="Fechar">×</button>
    <div id="letterPages"></div>
  </article>
</div>`;

export function mountEnvelope(root, options = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => root.querySelector("#" + id);
  root.innerHTML = SHELL;
  root.classList.add("delivery-preview");
  $("envTitle").textContent = options.title || "Uma carta para você";
  if (options.hint) $("envHint").textContent = options.hint;

  const off = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    off.push(() => target.removeEventListener(type, fn, opts));
  };
  let alive = true;
  let rafId = 0;
  let timer = 0;
  let toldClosed = false;
  const tellClosed = () => {
    if (toldClosed) return;
    toldClosed = true;
    options.onClosed && options.onClosed();
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $("envc"), antialias: true, alpha: true });
  } catch {
    root.dataset.envelopeFailed = "1";
    tellClosed();
    return {
      dispose() {
        root.replaceChildren();
      },
      open() {},
      close() {},
    };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xd9c7b0, 1.6));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.15);
  key.position.set(2.4, 3.2, 2.8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2ea, 0.8);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0.1, 3.4);
  camera.lookAt(0, 0, 0);

  const envEl = $("envc").parentElement;
  const fit = () => {
    const w = envEl.clientWidth;
    const h = envEl.clientHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const env = new THREE.Group();
  scene.add(env);
  const paperTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#f3e7d1";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${150 + Math.random() * 60},${120 + Math.random() * 50},${80},${Math.random() * 0.06})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const paper = new THREE.MeshStandardMaterial({ color: 0xffffff, map: paperTex, roughness: 0.85 });
  const paperIn = new THREE.MeshStandardMaterial({ color: 0xe9d6b4, roughness: 0.9, side: THREE.DoubleSide });
  const paperFold = new THREE.MeshStandardMaterial({ color: 0xf6ecdb, map: paperTex, roughness: 0.85, side: THREE.DoubleSide });
  const W = 1.6;
  const H = 1.05;
  const D = 0.07;
  const rbox = (w, h, d, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
    g.translate(0, 0, -d / 2);
    return g;
  };
  env.add(new THREE.Mesh(rbox(W, H, D, 0.05), paper));
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, H - 0.06), paperIn);
  inner.position.z = D / 2 + 0.013;
  env.add(inner);
  const tri = (pts, mat, z, depth = 0.012) => {
    const s = new THREE.Shape();
    s.moveTo(...pts[0]);
    pts.slice(1).forEach((p) => s.lineTo(...p));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2 }), mat);
    m.position.z = z;
    return m;
  };
  const pocket = new THREE.Group();
  pocket.position.z = D / 2 + 0.05;
  env.add(pocket);
  pocket.add(
    tri([[-W / 2, -H / 2], [0, 0], [-W / 2, H / 2]], paperFold, 0),
    tri([[W / 2, -H / 2], [W / 2, H / 2], [0, 0]], paperFold, 0.004),
    tri([[-W / 2, -H / 2], [W / 2, -H / 2], [0, 0.06]], paper, 0.01),
  );
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, H / 2, D / 2 + 0.075);
  env.add(flapPivot);
  const flapS = new THREE.Shape();
  flapS.moveTo(-W / 2, 0);
  flapS.lineTo(W / 2, 0);
  flapS.quadraticCurveTo(0.12, -0.5, 0, -0.64);
  flapS.quadraticCurveTo(-0.12, -0.5, -W / 2, 0);
  const flap = new THREE.Mesh(
    new THREE.ExtrudeGeometry(flapS, { depth: 0.01, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.004, bevelSegments: 2 }),
    paperFold,
  );
  flapPivot.add(flap);
  const hs = new THREE.Shape();
  hs.moveTo(0, -0.12);
  hs.bezierCurveTo(-0.02, -0.08, -0.16, -0.02, -0.14, 0.06);
  hs.bezierCurveTo(-0.12, 0.13, -0.03, 0.14, 0, 0.07);
  hs.bezierCurveTo(0.03, 0.14, 0.12, 0.13, 0.14, 0.06);
  hs.bezierCurveTo(0.16, -0.02, 0.02, -0.08, 0, -0.12);
  const seal = new THREE.Group();
  seal.position.set(0, -0.6, 0.02);
  flapPivot.add(seal);
  const waxMat = new THREE.MeshStandardMaterial({ color: 0xc93d5f, roughness: 0.35, transparent: true });
  const blob = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r = 0.2 + Math.sin(a * 7 + 0.4) * 0.004 + Math.sin(a * 11 + 2.1) * 0.003 + Math.sin(a * 3 + 1) * 0.003;
    i ? blob.lineTo(Math.cos(a) * r, Math.sin(a) * r) : blob.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  seal.add(new THREE.Mesh(new THREE.ExtrudeGeometry(blob, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 64 }), waxMat));
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xd9506f, roughness: 0.3, metalness: 0.05, transparent: true });
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.006, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 4, curveSegments: 24 }), heartMat);
  heart.scale.set(0.72, 0.72, 1);
  heart.position.set(0, 0.012, 0.046);
  seal.add(heart);
  seal.add(new THREE.Mesh(new THREE.SphereGeometry(0.32), new THREE.MeshBasicMaterial({ visible: false })));

  const greet = (options.getGreeting ? options.getGreeting() : "Meu amor,").slice(0, 28);
  const letterCanvas = document.createElement("canvas");
  letterCanvas.width = 768;
  letterCanvas.height = 1024;
  const letterTex = new THREE.CanvasTexture(letterCanvas);
  letterTex.colorSpace = THREE.SRGBColorSpace;
  const paintLetter = () => {
    const g = letterCanvas.getContext("2d");
    if (!g) return;
    const drawGreeting = () => {
      g.fillStyle = "#e85a7a";
      g.font = "italic 42px serif";
      g.fillText(greet, 48, 84);
    };
    const drawFallback = () => {
      g.fillStyle = "#fbf6f0";
      g.fillRect(0, 0, letterCanvas.width, letterCanvas.height);
      g.strokeStyle = "rgba(196,163,90,.35)";
      for (let y = 120; y < letterCanvas.height - 40; y += 36) {
        g.beginPath();
        g.moveTo(48, y);
        g.lineTo(letterCanvas.width - 48, y);
        g.stroke();
      }
      drawGreeting();
      letterTex.needsUpdate = true;
    };
    drawFallback();
    if (!options.designSrc) return;
    const raster = String(options.designSrc)
      .replace(/\/blank-([a-z0-9-]+)\.svg$/i, "/$1.jpg")
      .replace(/\.svg$/i, ".jpg");
    const urls = raster === options.designSrc ? [options.designSrc] : [raster, options.designSrc];
    const loadUrl = (i) => {
      if (i >= urls.length) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!alive) return;
        try {
          g.drawImage(img, 0, 0, letterCanvas.width, letterCanvas.height);
          g.fillStyle = "rgba(251,246,240,0.14)";
          g.fillRect(0, 0, letterCanvas.width, letterCanvas.height);
          drawGreeting();
          letterTex.needsUpdate = true;
        } catch {
          loadUrl(i + 1);
        }
      };
      img.onerror = () => loadUrl(i + 1);
      img.src = urls[i];
    };
    loadUrl(0);
  };
  paintLetter();
  const letter = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.95, 0.008),
    new THREE.MeshBasicMaterial({ map: letterTex, toneMapped: false }),
  );
  letter.position.set(0, -0.02, D / 2 + 0.03);
  env.add(letter);

  const easeOutBack = (u) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  };
  const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const tweens = [];
  let simMs = 0;
  let last = 0;
  function tween(dur, fn, done) {
    tweens.push({ t0: simMs, dur: reduced ? Math.min(dur, 120) : dur, fn, done });
  }
  function runTweens(now) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const u = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(easeInOut(u), u);
      if (u >= 1) {
        tweens.splice(i, 1);
        tw.done && tw.done();
      }
    }
  }

  let envState = "closed";
  let floatAmt = 1;
  const ray = new THREE.Raycaster();

  function showOverlay(fromEnv) {
    const o = $("letter");
    if (fromEnv) {
      const p = new THREE.Vector3();
      letter.getWorldPosition(p);
      p.project(camera);
      const r = $("envc").getBoundingClientRect();
      const x = r.left + (p.x * 0.5 + 0.5) * r.width;
      const y = r.top + (-p.y * 0.5 + 0.5) * r.height;
      o.style.setProperty("--tx", x - innerWidth / 2 + "px");
      o.style.setProperty("--ty", y - innerHeight / 2 + "px");
    }
    o.classList.add("open");
    o.setAttribute("aria-hidden", "false");
    options.onOpened && options.onOpened();
    $("envHint").textContent = "Toque na carta para ler de novo";
  }

  function openEnv() {
    if (envState !== "closed") return;
    envState = "opening";
    $("envHint").textContent = "Abrindo…";
    tween(220, (_k, u) => {
      floatAmt = 1 - u;
    });
    tween(280, (_k, u) => seal.scale.setScalar(1 + 0.45 * easeOutBack(u)), () =>
      tween(520, (_k, u) => {
        const e = easeOutCubic(u);
        seal.position.z = 0.02 + e * 1.4;
        seal.position.y = -0.6 + e * 0.5;
        seal.rotation.z = e * 3;
        seal.scale.setScalar(1.45 * (1 - u) + 0.01);
        waxMat.opacity = heartMat.opacity = 1 - u;
      }, () => {
        seal.visible = false;
        tween(1000, (_k, u) => {
          const e = easeInOut(u);
          flapPivot.rotation.x = -Math.PI * 1.18 * e;
          const v = Math.min(1, Math.max(0, (e - 0.8) / 0.08));
          flapPivot.position.z = (D / 2 + 0.075) * (1 - v) + (D / 2 + 0.004) * v;
        }, () => {
          tween(950, (_k, u) => {
            letter.position.y = -0.02 + easeInOut(u) * 1.07;
          }, () =>
            tween(450, (_k, u) => {
              const e = easeOutCubic(u);
              letter.position.z = D / 2 + 0.03 + e * 0.9;
              letter.rotation.x = -0.15 * e;
            }, () => {
              envState = "open";
              showOverlay(true);
            }),
          );
        });
      }),
    );
  }

  const notifyOnClose = options.intro === "open-then-close";
  function closeEnv() {
    if (envState !== "open") return;
    envState = "closing";
    $("envHint").textContent = "Guardando…";
    tween(450, (_k, u) => {
      const e = easeInOut(u);
      letter.position.z = D / 2 + 0.03 + (1 - e) * 0.9;
      letter.rotation.x = -0.15 * (1 - e);
    }, () =>
      tween(950, (_k, u) => {
        letter.position.y = -0.02 + (1 - easeInOut(u)) * 1.07;
      }, () =>
        tween(1000, (_k, u) => {
          const e = 1 - easeInOut(u);
          flapPivot.rotation.x = -Math.PI * 1.18 * e;
          const v = Math.min(1, Math.max(0, (e - 0.8) / 0.08));
          flapPivot.position.z = (D / 2 + 0.075) * (1 - v) + (D / 2 + 0.004) * v;
        }, () => {
          flapPivot.rotation.x = 0;
          flapPivot.position.z = D / 2 + 0.075;
          seal.visible = true;
          seal.position.set(0, -0.6, 0.02);
          seal.rotation.z = 0;
          waxMat.opacity = heartMat.opacity = 1;
          tween(420, (_k, u) => seal.scale.setScalar(Math.max(0.01, easeOutBack(u) * (1 + 0.12 * Math.sin(Math.PI * u)))), () => {
            seal.scale.setScalar(1);
            tween(400, (_k, u) => {
              floatAmt = u;
            });
            envState = "closed";
            $("envHint").textContent = options.hint || "Toque no selo para abrir";
            if (notifyOnClose) tellClosed();
          });
        }),
      ),
    );
  }

  function closeLetter() {
    window.clearTimeout(timer);
    const o = $("letter");
    if (!o.classList.contains("open")) {
      if (notifyOnClose && envState === "closed") tellClosed();
      return;
    }
    const p = new THREE.Vector3();
    letter.getWorldPosition(p);
    p.project(camera);
    const r = $("envc").getBoundingClientRect();
    const x = r.left + (p.x * 0.5 + 0.5) * r.width;
    const y = r.top + (-p.y * 0.5 + 0.5) * r.height;
    o.style.setProperty("--tx", x - innerWidth / 2 + "px");
    o.style.setProperty("--ty", y - innerHeight / 2 + "px");
    o.classList.remove("open");
    o.setAttribute("aria-hidden", "true");
    tween(reduced ? 1 : 620, () => {}, () => closeEnv());
  }

  function poseClosed() {
    env.visible = true;
    env.scale.setScalar(1);
    env.position.y = 0;
    env.rotation.set(0, 0, 0);
    flapPivot.rotation.x = 0;
    flapPivot.position.z = D / 2 + 0.075;
    letter.position.set(0, -0.02, D / 2 + 0.03);
    letter.rotation.x = 0;
    seal.visible = true;
    seal.position.set(0, -0.6, 0.02);
    seal.rotation.z = 0;
    seal.scale.setScalar(1);
    waxMat.opacity = heartMat.opacity = 1;
    floatAmt = 1;
    envState = "closed";
    const o = $("letter");
    o.classList.remove("open");
    o.setAttribute("aria-hidden", "true");
  }

  function poseOpen() {
    poseClosed();
    flapPivot.rotation.x = -Math.PI * 1.18;
    flapPivot.position.z = D / 2 + 0.004;
    letter.position.y = -0.02 + 1.07;
    letter.position.z = D / 2 + 0.03 + 0.9;
    letter.rotation.x = -0.15;
    seal.visible = false;
    floatAmt = 0;
    envState = "open";
    showOverlay(false);
  }

  function envTap(ev) {
    if (envState === "open") {
      showOverlay(true);
      return;
    }
    if (envState !== "closed") return;
    const r = ev.target.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    if (!ray.intersectObject(seal, true).length) return;
    openEnv();
  }

  let envDown = null;
  let envDrag = false;
  let envTapAt = 0;
  $("envc").addEventListener("pointerdown", (e) => {
    envDown = [e.clientX, e.clientY];
    envDrag = false;
  });
  $("envc").addEventListener("pointermove", (e) => {
    if (envDown && Math.hypot(e.clientX - envDown[0], e.clientY - envDown[1]) > (e.pointerType === "touch" ? 12 : 6)) envDrag = true;
  });
  $("envc").addEventListener("pointercancel", () => {
    envDown = null;
    envDrag = false;
  });
  $("envc").addEventListener("pointerup", (e) => {
    const wasDrag = envDrag;
    envDown = null;
    if (!e.pointerType || e.pointerType === "mouse" || wasDrag) {
      envDrag = false;
      return;
    }
    envDrag = false;
    envTapAt = performance.now();
    envTap(e);
  });
  $("envc").addEventListener("click", (ev) => {
    if (performance.now() - envTapAt < 800) return;
    envTap(ev);
  });
  $("close").onclick = () => closeLetter();
  $("letter").addEventListener("click", (e) => {
    if (e.target.id === "letter") closeLetter();
  });

  const intro = options.intro || "closed";
  if (intro === "open-then-close" && reduced) {
    poseClosed();
    tellClosed();
  } else if (intro === "open-then-close") {
    poseOpen();
    timer = window.setTimeout(() => closeLetter(), 1100);
  } else {
    poseClosed();
    $("envHint").textContent = options.hint || "Toque no selo para abrir";
  }

  listen(window, "resize", fit);
  fit();
  function loop(now) {
    if (!alive) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    simMs += dt * 1000;
    runTweens(simMs);
    if (envState === "closed" || envState === "opening") {
      const t = simMs / 1000;
      const f = floatAmt;
      env.position.y = Math.sin(t * 1.3) * 0.05 * f;
      env.rotation.y = Math.sin(t * 0.8) * 0.16 * f;
      env.rotation.x = Math.sin(t * 1.1) * 0.05 * f;
      env.rotation.z = Math.sin(t * 0.7) * 0.025 * f;
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
  requestAnimationFrame(fit);

  return {
    open() {
      if (envState === "closed") openEnv();
      else if (envState === "open") showOverlay(true);
    },
    close() {
      closeLetter();
    },
    dispose() {
      alive = false;
      window.clearTimeout(timer);
      cancelAnimationFrame(rafId);
      off.forEach((fn) => fn());
      const seen = new Set();
      scene.traverse((obj) => {
        if (obj.geometry && !seen.has(obj.geometry)) {
          seen.add(obj.geometry);
          obj.geometry.dispose();
        }
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        for (const mat of mats) {
          if (seen.has(mat)) continue;
          seen.add(mat);
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      root.replaceChildren();
    },
  };
}
