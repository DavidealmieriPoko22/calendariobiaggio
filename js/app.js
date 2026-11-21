/* Il baule di dicembre — scena 3D e logica del calendario.
   Non serve modificare questo file: tutto quello che cambia sta in js/config.js. */
(function () {
  'use strict';

  const C = window.CALENDARIO || {};
  const YEAR = Number(C.anno) || new Date().getFullYear();
  const N = 24;
  const NOME = C.nome || 'Amore';
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\n/g, '<br>');
  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignorato */ } };

  /* ---------------- Calendario ---------------- */
  // l'indirizzo può finire con #k=CHIAVE (per la foto cifrata) e/o con la parola dell'anteprima, separati da &
  const hashParts = () => location.hash.slice(1).split('&').map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const preview = () => !!C.demo || (!!C.chiaveAnteprima && hashParts().indexOf(C.chiaveAnteprima) !== -1);
  function photoKey() {
    const p = hashParts().find((x) => x.indexOf('k=') === 0);
    if (p) { try { localStorage.setItem('cielo-chiave-foto', p.slice(2)); } catch (e) { /* ignorato */ } return p.slice(2); }
    try { return localStorage.getItem('cielo-chiave-foto') || ''; } catch (e) { return ''; }
  }
  const storeKey = () => 'cielo-dicembre-' + YEAR + (preview() ? '-anteprima' : '');
  function loadOpened() {
    try { const v = JSON.parse(localStorage.getItem(storeKey()) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveOpened() { try { localStorage.setItem(storeKey(), JSON.stringify(opened)); } catch (e) { /* storage non disponibile */ } }
  let opened = loadOpened();
  const isOpened = (d) => opened.indexOf(d) !== -1;
  const unlockAt = (d) => new Date(YEAR, 11, d, 0, 0, 0, 0).getTime();
  const isUnlocked = (d) => preview() || Date.now() >= unlockAt(d);
  function dayData(d) {
    const g = (C.giorni || []).find((x) => Number(x.giorno) === d) || {};
    return {
      regalo: g.regalo != null && g.regalo !== '' ? String(g.regalo) : pad(d),
      messaggio: g.messaggio || '',
      dove: g.dove || '',
      avviso: g.avviso && g.avviso.testo ? g.avviso : null,
      scherzo: g.scherzo && g.scherzo.tipo ? g.scherzo : null
    };
  }
  function fmtLeft(ms) {
    const m = Math.max(0, Math.ceil(ms / 60000));
    const g = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    if (g > 0) return g + (g === 1 ? ' giorno' : ' giorni') + (h ? ' e ' + h + ' h' : '');
    if (h > 0) return h + ' h ' + pad(mi) + ' min';
    return mi + ' min';
  }
  const finished = () => Date.now() >= new Date(YEAR, 11, 25, 0, 0, 0, 0).getTime();
  const stateOf = (d) => (isOpened(d) ? 'open' : isUnlocked(d) ? 'ready' : 'locked');

  /* ---------------- DOM ---------------- */
  const el = {
    hud: $('#hud'), eyebrow: $('#eyebrow'), title: $('#titolo'), sub: $('#sub'), dots: $('#dots'), rule: $('#rule'),
    hint: $('#hint'), preview: $('#preview'), previewText: $('#preview-text'), reset: $('#btn-reset'),
    finaleBtn: $('#btn-finale'), intro: $('#intro'), introTitle: $('#intro-title'), introEyebrow: $('#intro-eyebrow'), introSub: $('#intro-sub'),
    enter: $('#btn-enter'), introError: $('#intro-error'), promise: $('#promise'), promiseLabel: $('#promise-label'),
    promiseText: $('#promise-text'), promiseErr: $('#promise-err'),
    sheet: $('#sheet'), body: $('#sheet-body'), close: $('#btn-close'),
    finale: $('#finale'), finaleText: $('#finale-text'), back: $('#btn-back'),
    toast: $('#toast'), lightbox: $('#lightbox'), lightboxImg: $('#lightbox-img'), prank: $('#prank'),
    replay: $('#replay'), replayCheck: $('#replay-check'), replayLabel: $('#replay-label'), replayBtn: $('#btn-replay'),
    alert: $('#alert'), alertEyebrow: $('#alert-eyebrow'), alertText: $('#alert-text'), alertSub: $('#alert-sub'), alertBtn: $('#btn-alert')
  };
  el.title.textContent = 'Il baule di ' + NOME;
  el.introTitle.textContent = 'Ciao ' + NOME;
  el.introEyebrow.textContent = "Calendario dell'avvento · dicembre " + YEAR;
  el.introSub.innerHTML = N + ' pacchetti, dal 1 al ' + N + ' dicembre.<br>Se ne apre uno al giorno. Niente sbirciate.';
  el.promiseText.textContent = 'Io, ' + NOME + ', prometto di non arrabbiarmi.';
  el.rule.textContent = 'Un pacchetto al giorno. Il nuovo si sblocca a mezzanotte.';
  el.hint.textContent = 'Trascina per girare · tocca il pacchetto che brilla';
  el.finaleText.textContent = C.fraseFinale || 'Ventiquattro su ventiquattro. Buon Natale.';
  for (let d = 1; d <= N; d++) el.dots.appendChild(document.createElement('i'));

  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
  }

  function updateHud() {
    const now = Date.now();
    const ready = [];
    let nextLocked = 0;
    for (let d = 1; d <= N; d++) {
      const st = stateOf(d);
      el.dots.children[d - 1].className = st;
      if (st === 'ready') ready.push(d);
      if (!nextLocked && !isUnlocked(d)) nextLocked = d;
    }
    el.eyebrow.textContent = 'Dicembre ' + YEAR + ' · ' + pad(opened.length) + '/' + N;
    let s;
    if (finished() && ready.length) s = 'Rivivi i pacchetti che vuoi, nell\'ordine che vuoi.';
    else if (!ready.length && nextLocked === 1) s = 'Si parte tra ' + fmtLeft(unlockAt(1) - now) + '. Abbi pazienza, ' + NOME + '.';
    else if (ready.length === 1) s = 'Oggi tocca al pacchetto ' + ready[0] + '. Toccalo.';
    else if (ready.length > 1) s = 'Hai ' + ready.length + ' pacchetti da aprire. Sei in ritardo.';
    else if (nextLocked) s = 'Il ' + (nextLocked - 1) + ' è fatto. Il ' + nextLocked + ' si sblocca tra ' + fmtLeft(unlockAt(nextLocked) - now) + '.';
    else s = 'Fatto. Tutti e ' + N + '.';
    el.sub.textContent = s;
    el.finaleBtn.hidden = !isOpened(N);
    el.replay.hidden = !(finished() || (preview() && opened.length === N));
    el.rule.textContent = finished() ? 'Il calendario è finito: ora puoi aprirli quando vuoi.' : 'Un pacchetto al giorno. Il nuovo si sblocca a mezzanotte.';
    if (preview()) {
      el.preview.hidden = false;
      el.previewText.textContent = C.demo
        ? 'Anteprima: qui è tutto sbloccato. Sul sito vero se ne apre uno al giorno.'
        : 'Anteprima: tutto sbloccato, solo su questo telefono.';
    }
  }

  /* ---------------- Suoni (Web Audio, nessun file da scaricare) ---------------- */
  let audioCtx = null;
  function ac() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }
  function tone(type, f1, f2, dur, vol, delay) {
    const a = ac(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const chime = () => [1047, 1319, 1568, 2093].forEach((f, i) => tone('triangle', f, f, 0.5, 0.09, i * 0.07));
  const pop = () => { tone('triangle', 900, 180, 0.14, 0.14); tone('sine', 1800, 600, 0.08, 0.05, 0.02); };
  const lidSound = () => [392, 523, 659].forEach((f, i) => tone('sine', f, f, 0.7, 0.07, i * 0.12));
  function alarmSound() {
    for (let i = 0; i < 6; i++) tone('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.19, 0.18, i * 0.22);
  }
  function jingle() {
    // Jingle Bells (1857, di pubblico dominio): prima frase
    const E = 659, G = 784, Cn = 523, D = 587;
    const notes = [[E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [Cn, 1.5], [D, 0.5], [E, 4]];
    let t = 0;
    notes.forEach(([f, len]) => { tone('triangle', f, f, Math.min(0.5, len * 0.2), 0.11, t); t += len * 0.19; });
  }

  /* ---------------- Three.js ---------------- */
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const DEVICE_PR = window.devicePixelRatio || 1;
  let pixelRatio = Math.min(DEVICE_PR, mobile ? 1.75 : 2);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('#cielo'), antialias: pixelRatio < 1.5, powerPreference: 'high-performance' });
  } catch (e) {
    el.enter.hidden = true;
    el.introError.hidden = false;
    return;
  }
  renderer.setPixelRatio(pixelRatio);
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  let W = 1, H = 1;
  const aspect = () => W / H;
  const tanHalf = () => Math.tan((camera.fov * Math.PI) / 360);
  const tmp = new THREE.Color();

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.userData = { canvas: c };
    return t;
  }
  const glowTex = canvasTex(64, 64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.16, 'rgba(255,255,255,0.85)');
    r.addColorStop(0.42, 'rgba(255,255,255,0.2)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  // cerchio fatto a mano attorno al pacchetto del giorno
  const ringTex = canvasTex(128, 128, (g, s) => {
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.6; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      const off = Math.random() * 6.28;
      for (let i = 0; i <= 70; i++) {
        const a = off + (i / 70) * Math.PI * 2 * 1.1;
        const r = s / 2 - 11 + Math.sin(a * 3 + k * 2) * 2.4 + (Math.random() - 0.5) * 1.2;
        const x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r * 0.9;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  });

  const VS = [
    'attribute float aSize; attribute vec3 aColor; attribute float aPhase;',
    'uniform float uTime; uniform float uPR; uniform float uTwinkle;',
    'varying vec3 vColor; varying float vTw;',
    'void main(){',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  vTw = 1.0 - uTwinkle * 0.4 * (0.5 + 0.5 * sin(uTime * 1.6 + aPhase));',
    '  gl_PointSize = min(aSize * uPR * (70.0 / max(-mv.z, 0.5)), 96.0);',
    '  vColor = aColor;',
    '}'
  ].join('\n');
  const FS = [
    'uniform float uFade; varying vec3 vColor; varying float vTw;',
    'void main(){',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  float a = smoothstep(0.5, 0.0, d); a *= a;',
    '  gl_FragColor = vec4(vColor * vTw * uFade, a * uFade);',
    '}'
  ].join('\n');
  const pointMats = [];
  function pointsMaterial() {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: pixelRatio }, uFade: { value: 1 }, uTwinkle: { value: reduced ? 0 : 1 } },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    pointMats.push(m);
    return m;
  }
  function makePoints(pos, col, size, phase) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return new THREE.Points(g, pointsMaterial());
  }
  function glowSprite(color, opacity, scale, map) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: map || glowTex, color: new THREE.Color(color), transparent: true, opacity: opacity,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.scale.set(scale, scale, 1);
    return s;
  }
  function numberTex(d) {
    return canvasTex(128, 128, (g, s) => {
      g.font = '600 56px "IBM Plex Mono", ui-monospace, monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(8,6,15,0.9)'; g.shadowBlur = 12;
      g.fillStyle = '#ffffff';
      g.fillText(String(d), s / 2, s / 2 + 3);
    });
  }
  function heartShape(d, scale, cx, cy, cz) {
    const t = ((d - 1) / N) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new THREE.Vector3(cx + x * scale, cy + y * scale, cz);
  }

  let fontsLoaded = false;
  const fontQueue = [];
  const whenFonts = (fn) => (fontsLoaded ? fn() : fontQueue.push(fn));

  /* Polaroid */
  const photoMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const photos = [];
  let photoIdx = 0;
  function drawPolaroid(img, caption) {
    return canvasTex(512, 620, (g) => {
      g.fillStyle = '#F6F0E6';
      g.fillRect(0, 0, 512, 620);
      const x = 28, y = 28, w = 456, h = 456;
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (img) {
        const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
      } else {
        g.fillStyle = '#1A1D2B'; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(244,239,228,0.9)';
        g.font = '400 40px "Kalam", cursive';
        g.textAlign = 'center';
        g.fillText('qui una foto', 256, 270);
      }
      g.restore();
      g.fillStyle = '#24378A';
      g.font = '400 44px "Kalam", cursive';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(caption, 256, 555);
    });
  }
  function setPhoto(i) {
    if (!photos.length) return;
    photoIdx = ((i % photos.length) + photos.length) % photos.length;
    photoMat.map = photos[photoIdx];
    photoMat.needsUpdate = true;
  }
  const photoList = (Array.isArray(C.foto) ? C.foto : []).map((f) => (typeof f === 'string' ? { src: f } : f)).filter((f) => f && f.src);
  // foto cifrata con AES-GCM: il file contiene 12 byte di IV seguiti dai dati cifrati
  function decryptPhoto(src) {
    const key = photoKey();
    if (!key || !window.crypto || !crypto.subtle) return Promise.resolve('');
    const raw = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    return fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('foto non trovata'))))
      .then((buf) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
        .then((k) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, k, new Uint8Array(buf, 12))))
      .then((plain) => URL.createObjectURL(new Blob([plain], { type: 'image/jpeg' })))
      .catch(() => '');
  }
  function loadPhotos() {
    const def = C.didascalia || NOME;
    photos.push(drawPolaroid(null, def));
    setPhoto(0);
    let first = true;
    photoList.forEach((f) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const tex = drawPolaroid(img, f.testo || def);
        if (first) { photos.length = 0; first = false; }
        photos.push(tex);
        if (photos.length === 1) setPhoto(0);
      };
      if (!f.cifrata) { img.src = f.src; return; }
      decryptPhoto(f.src).then((url) => { if (url) { f.url = url; img.src = url; } });
    });
  }

  /* Coriandoli e scintille */
  const bursts = [];
  const sparkColors = ['#F3B85C', '#FFFFFF', '#FFE2B0', '#A9BEE6'].map((c) => new THREE.Color(c));
  function burst(at, n, power, colors) {
    const cols = colors || sparkColors;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n);
    const vel = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(power * (0.4 + Math.random()));
      vel[i * 3] = v.x; vel[i * 3 + 1] = v.y + power * 0.35; vel[i * 3 + 2] = v.z;
      const c = cols[i % cols.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = 2 + Math.random() * 4;
      phase[i] = Math.random() * 6.28;
    }
    const p = makePoints(pos, col, size, phase);
    p.frustumCulled = false;
    world.add(p);
    bursts.push({ p, vel, life: 0, max: 2 });
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pv = new THREE.Vector3();
  function setRay(x, y) { ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); }

  /* ================================================================
     IL BAULE
     ================================================================ */
  let mode = 'intro';
  const S = (function makeBaule() {
    const root = new THREE.Group();
    world.add(root);
    const BW = 4.2, BD = 2.6, BH = 2.0, TH = 0.12, FLOOR = 0.95;
    let seed = 2026;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    // luci
    root.add(new THREE.AmbientLight(0x8a8fb0, 0.55));
    const key = new THREE.DirectionalLight(0xffe4c4, 0.75); key.position.set(-4, 7, 6); root.add(key);
    const rimL = new THREE.DirectionalLight(0x8fa8ff, 0.35); rimL.position.set(5, 3, -6); root.add(rimL);
    const inner = new THREE.PointLight(0xffb866, 0, 6, 1.4); inner.position.set(0, FLOOR + 1.3, 0.3); root.add(inner);

    // pavimento e ombra
    const floorTex = canvasTex(256, 256, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 6, s / 2, s / 2, s / 2);
      r.addColorStop(0, '#2A2330'); r.addColorStop(0.55, '#17131C'); r.addColorStop(1, '#0E0C12');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);
    const shadowTex = canvasTex(128, 128, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 5, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(0,0,0,0.7)'); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
    root.add(shadow);

    // legno: pannelli gialli da cantiere a tre strati
    const woodTex = canvasTex(512, 512, (g, s) => {
      g.fillStyle = '#D8A54D'; g.fillRect(0, 0, s, s);
      for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(' + (k % 2 ? '120,70,20,0.08' : '255,230,170,0.08') + ')'; g.fillRect(0, (k * s) / 4, s, s / 4); }
      for (let i = 0; i < 160; i++) {
        const y = Math.random() * s;
        g.strokeStyle = 'rgba(90,50,14,' + (0.04 + Math.random() * 0.12) + ')';
        g.lineWidth = 1 + Math.random() * 2.5;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (Math.random() - 0.5) * 2);
        g.stroke();
      }
      for (let k = 1; k < 4; k++) { g.fillStyle = 'rgba(60,32,8,0.28)'; g.fillRect(0, (k * s) / 4 - 1, s, 2); }
    });
    woodTex.generateMipmaps = true; woodTex.minFilter = THREE.LinearMipmapLinearFilter;
    const outM = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
    const inM = new THREE.MeshLambertMaterial({ map: woodTex, color: 0x9c7a52 });
    const metalM = new THREE.MeshStandardMaterial({ color: 0x2b2a30, metalness: 0.7, roughness: 0.38 });
    function box(w, h, d, mat, x, y, z, parent) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      (parent || root).add(m);
      return m;
    }
    const O = outM, I = inM;
    box(BW, TH, BD, O, 0, TH / 2, 0);
    box(BW, BH, TH, [O, O, O, O, O, I], 0, BH / 2, BD / 2 - TH / 2);
    box(BW, BH, TH, [O, O, O, O, I, O], 0, BH / 2, -BD / 2 + TH / 2);
    box(TH, BH, BD - 2 * TH, [I, O, O, O, O, O], -BW / 2 + TH / 2, BH / 2, 0);
    box(TH, BH, BD - 2 * TH, [O, I, O, O, O, O], BW / 2 - TH / 2, BH / 2, 0);
    const strawTex = canvasTex(256, 256, (g, s) => {
      g.fillStyle = '#6B4A22'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 700; i++) {
        const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI, l = 5 + Math.random() * 14;
        g.strokeStyle = ['#E7C277', '#D2A453', '#B88A3E', '#F1D69A'][i % 4];
        g.globalAlpha = 0.5 + Math.random() * 0.5;
        g.lineWidth = 0.8 + Math.random();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      g.globalAlpha = 1;
    });
    box(BW - 2 * TH, 0.05, BD - 2 * TH, new THREE.MeshLambertMaterial({ map: strawTex }), 0, FLOOR, 0);
    // angolari e bordi in metallo
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => box(0.16, BH + 0.02, 0.16, metalM, sx * (BW / 2 - 0.03), BH / 2, sz * (BD / 2 - 0.03)));
    [0.12, BH - 0.07].forEach((y) => {
      box(BW + 0.04, 0.12, 0.04, metalM, 0, y, BD / 2 + 0.01);
      box(BW + 0.04, 0.12, 0.04, metalM, 0, y, -BD / 2 - 0.01);
      box(0.04, 0.12, BD + 0.04, metalM, BW / 2 + 0.01, y, 0);
      box(0.04, 0.12, BD + 0.04, metalM, -BW / 2 - 0.01, y, 0);
    });
    [-1, 1].forEach((sx) => box(0.07, 0.1, 0.6, metalM, sx * (BW / 2 + 0.06), BH * 0.62, 0));
    // serratura con tastierino e led
    box(0.46, 0.56, 0.05, new THREE.MeshStandardMaterial({ color: 0x141318, metalness: 0.4, roughness: 0.5 }), 0, BH - 0.42, BD / 2 + 0.04);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box(0.08, 0.08, 0.02, metalM, -0.11 + c * 0.11, BH - 0.32 - r * 0.11, BD / 2 + 0.07);
    const led = glowSprite('#FF4A3A', 0.9, 0.22);
    led.position.set(0.15, BH - 0.2, BD / 2 + 0.09);
    root.add(led);

    // coperchio, incernierato sul retro
    const lid = new THREE.Group();
    lid.position.set(0, BH, -BD / 2);
    root.add(lid);
    box(BW + 0.1, 0.16, BD + 0.1, [O, O, O, I, O, O], 0, 0.08, BD / 2, lid);
    box(BW + 0.14, 0.2, 0.05, metalM, 0, 0.08, BD + 0.07, lid);
    [-1.25, 1.25].forEach((x) => box(0.16, 0.03, BD + 0.14, metalM, x, 0.17, BD / 2, lid));
    const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.51), photoMat);
    photoMesh.rotation.x = Math.PI / 2;
    photoMesh.position.set(0, -0.012, BD / 2 + 0.1);
    photoMesh.rotation.z = 0.06;
    lid.add(photoMesh);
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.12), new THREE.MeshBasicMaterial({ color: 0xf3b85c, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    tape.rotation.x = Math.PI / 2; tape.position.set(0, -0.016, BD / 2 + 0.1 + 0.72);
    lid.add(tape);
    const photoFlyMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const photoFly = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.51), photoFlyMat);
    photoFly.renderOrder = 20;
    photoFly.visible = false;
    root.add(photoFly);

    // lucine natalizie lungo il bordo del baule
    const BULB_COLORS = ['#F3B85C', '#E8452C', '#7FD1A8', '#8FB3FF', '#FFF4E2'];
    const bulbs = [];
    const edgePath = [[-BW / 2, BD / 2], [BW / 2, BD / 2], [BW / 2, -BD / 2], [-BW / 2, -BD / 2], [-BW / 2, BD / 2]];
    const perEdge = [9, 5, 9, 5];
    for (let e = 0; e < 4; e++) {
      const [x0, z0] = edgePath[e], [x1, z1] = edgePath[e + 1];
      for (let k = 0; k < perEdge[e]; k++) {
        const u = (k + 0.5) / perEdge[e];
        const sag = Math.sin(u * Math.PI) * 0.12;
        const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
        const out = 1.03;
        const col = BULB_COLORS[bulbs.length % BULB_COLORS.length];
        const g = glowSprite(col, 0.9, 0.34);
        g.position.set(x * out, BH - 0.16 - sag, z * out);
        const core = glowSprite('#FFFFFF', 0.9, 0.08);
        core.position.copy(g.position);
        root.add(g, core);
        bulbs.push({ g, core, ph: bulbs.length * 0.9 });
      }
    }

    // luce che esce dal baule
    const spill = glowSprite('#FFC27A', 0, 5.5);
    spill.position.set(0, FLOOR + 0.9, 0);
    root.add(spill);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.1, 3.2, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = BH + 1.4;
    root.add(beam);

    // polvere dorata nella luce
    const DUST = mobile ? 140 : 240;
    const dpos = new Float32Array(DUST * 3), dcol = new Float32Array(DUST * 3), dsize = new Float32Array(DUST), dph = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 3.6; dpos[i * 3 + 1] = FLOOR + Math.random() * 3.6; dpos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
      tmp.set('#FFD9A0').multiplyScalar(0.25 + Math.random() * 0.35);
      dcol[i * 3] = tmp.r; dcol[i * 3 + 1] = tmp.g; dcol[i * 3 + 2] = tmp.b;
      dsize[i] = 0.5 + Math.random() * 0.9;
      dph[i] = Math.random() * 6.28;
    }
    const dust = makePoints(dpos, dcol, dsize, dph);
    root.add(dust);

    // neve che scende
    const SNOW = mobile ? 380 : 700;
    const spos = new Float32Array(SNOW * 3), scol = new Float32Array(SNOW * 3), ssize = new Float32Array(SNOW), sph = new Float32Array(SNOW);
    const sspeed = new Float32Array(SNOW);
    for (let i = 0; i < SNOW; i++) {
      spos[i * 3] = (Math.random() - 0.5) * 26; spos[i * 3 + 1] = Math.random() * 14; spos[i * 3 + 2] = (Math.random() - 0.5) * 26;
      const b = 0.35 + Math.random() * 0.4;
      scol[i * 3] = b; scol[i * 3 + 1] = b; scol[i * 3 + 2] = b * 1.08;
      ssize[i] = 1.2 + Math.random() * 2.2;
      sph[i] = Math.random() * 6.28;
      sspeed[i] = 0.35 + Math.random() * 0.5;
    }
    const snow = makePoints(spos, scol, ssize, sph);
    snow.material.uniforms.uTwinkle.value = 0;
    snow.frustumCulled = false;
    root.add(snow);

    // carte da regalo
    const PAPERS = [
      { c: '#B3372E', p: 'stripes', r: 0xf1d27a }, { c: '#2F5D46', p: 'dots', r: 0xf4efe4 },
      { c: '#C49A5C', p: 'kraft', r: 0xb3372e }, { c: '#23345E', p: 'stars', r: 0xe7b95a },
      { c: '#E9DFC9', p: 'stripes', r: 0xb3372e }, { c: '#C99A2E', p: 'dots', r: 0x23345e }
    ];
    function paperTex(pp) {
      return canvasTex(128, 128, (g, s) => {
        g.fillStyle = pp.c; g.fillRect(0, 0, s, s);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.strokeStyle = 'rgba(255,255,255,0.2)';
        if (pp.p === 'stripes') { g.lineWidth = 7; for (let i = -s; i < s * 2; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); } }
        if (pp.p === 'dots') for (let y = 6; y < s; y += 16) for (let x = (y / 16) % 2 ? 14 : 6; x < s; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
        if (pp.p === 'stars') { g.font = '12px serif'; for (let i = 0; i < 18; i++) g.fillText('✦', Math.random() * s, Math.random() * s); }
        if (pp.p === 'kraft') for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(80,50,20,' + Math.random() * 0.12 + ')'; g.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 3); }
      });
    }
    const paperTexs = PAPERS.map(paperTex);
    const ribMats = PAPERS.map((p) => new THREE.MeshPhongMaterial({ color: p.r, shininess: 60 }));
    const cardM = new THREE.MeshLambertMaterial({ map: paperTex({ c: '#A88458', p: 'kraft' }) });
    const loopGeo = new THREE.TorusGeometry(0.07, 0.022, 6, 12);
    const confetti = PAPERS.map((p) => new THREE.Color(p.c)).concat([new THREE.Color('#F3B85C'), new THREE.Color('#FFFFFF')]);

    // 24 pacchetti, sistemati sempre allo stesso modo
    const COLS = 6, ROWS = 4;
    const cw = (BW - 2 * TH - 0.12) / COLS, cd = (BD - 2 * TH - 0.12) / ROWS;
    const order = Array.from({ length: N }, (_, i) => i + 1);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const items = [];
    const bodies = [];
    for (let cell = 0; cell < N; cell++) {
      const d = order[cell];
      const col = cell % COLS, row = Math.floor(cell / COLS);
      const w = cw * (0.7 + rnd() * 0.22), dd = cd * (0.7 + rnd() * 0.22), h = 0.3 + rnd() * 0.42;
      const pi = (d * 7) % PAPERS.length;
      const grp = new THREE.Group();
      const home = new THREE.Vector3(-((COLS - 1) / 2) * cw + col * cw, FLOOR + 0.03 + h / 2, -((ROWS - 1) / 2) * cd + row * cd);
      const wrapM = new THREE.MeshLambertMaterial({ map: paperTexs[pi], emissive: new THREE.Color(0xffb04a), emissiveIntensity: 0 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), wrapM);
      const rib1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.012, h + 0.012, 0.07), ribMats[pi]);
      const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, h + 0.012, dd + 0.012), ribMats[pi]);
      const bow = new THREE.Group();
      [-1, 1].forEach((sgn) => {
        const loop = new THREE.Mesh(loopGeo, ribMats[pi]);
        loop.position.set(sgn * 0.07, 0, 0); loop.rotation.set(Math.PI / 2.4, sgn * 0.6, 0);
        bow.add(loop);
      });
      bow.position.y = h / 2 + 0.03;
      const box3 = new THREE.Group();
      box3.add(body, rib1, rib2, bow);
      const yaw = (rnd() - 0.5) * 0.36;
      box3.rotation.y = yaw;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      label.position.y = h / 2 + 0.32;
      label.scale.set(0.38, 0.38, 1);
      const ring = glowSprite('#FFFFFF', 0.9, 0.62, ringTex);
      ring.material.blending = THREE.NormalBlending;
      ring.position.y = h / 2 + 0.32;
      const glow = glowSprite('#FFC27A', 0, 1.2);
      glow.position.y = h / 2 + 0.1;
      grp.add(box3, label, ring, glow);
      grp.position.copy(home);
      root.add(grp);
      const it = {
        d, grp, box3, body, ribs: [rib1, rib2, bow], wrapM, label, ring, glow, h, yaw,
        home, world: grp.position, heart: heartShape(d, 0.16, 0, BH + 2.55, 0),
        state: '', flash: 0, lift: 0, shake: 0, labelReady: false
      };
      [body, rib1, rib2].forEach((m) => { m.userData.item = it; bodies.push(m); });
      items.push(it);
      whenFonts(() => { label.material.map = numberTex(d); label.material.needsUpdate = true; it.labelReady = true; });
    }
    function applyState(it) {
      it.state = stateOf(it.d);
      const open = it.state === 'open';
      it.body.material = open ? cardM : it.wrapM;
      it.ribs.forEach((r) => { r.visible = !open; });
      it.ring.visible = it.state === 'ready';
      it.label.material.color.set(it.state === 'locked' ? '#8F93A8' : open ? '#D9CDB5' : '#FFFFFF');
    }

    let lidT = 0, lidWant = 0, photoClock = 0;
    const liftPos = new THREE.Vector3(), tmpV = new THREE.Vector3(), heartPhoto = new THREE.Vector3(0, BH + 2.05, 0.5);
    return {
      items, bg: 0x0e0c12,
      applyState,
      basePhi: 0.9, baseTheta: 0.35, finalePhi: Math.PI / 2 - 0.16,
      phiRange: (m) => (m === 'heart' ? [1.0, 1.65] : [0.4, 1.38]),
      heartCenterY: BH + 2.3,
      view(m, sel) {
        const portrait = aspect() < 0.9;
        if (m === 'intro') return { radius: portrait ? 13 : 11, target: tmpV.set(0, 1.1, 0), shift: portrait ? 0.3 : 0.18 };
        if (m === 'focus' && sel) return { radius: portrait ? 5.4 : 4.4, target: sel.world, shift: 0.2 };
        if (m === 'heart') {
          const r = Math.max(3.0 / (tanHalf() * aspect()), 3.1 / tanHalf()) + 1.5;
          return { radius: r, target: tmpV.set(0, BH + 2.0, 0), shift: 0 };
        }
        return { radius: portrait ? 10 : 8.5, target: tmpV.set(0, 1.2, 0), shift: 0 };
      },
      openLid() { lidWant = 1; },
      closeLid() { lidWant = 0; },
      pick(x, y) {
        // prima il numero/cerchio sopra il pacchetto (è quello che si tocca), poi il pacchetto stesso
        let best = null, bd = 32;
        items.forEach((it) => {
          it.label.getWorldPosition(pv).project(camera);
          if (pv.z > 1) return;
          const dd = Math.hypot(((pv.x + 1) / 2) * W - x, ((1 - pv.y) / 2) * H - y) - (it.state === 'ready' ? 6 : 0);
          if (dd < bd) { bd = dd; best = it; }
        });
        if (best) return best;
        setRay(x, y);
        const hit = ray.intersectObjects(bodies, false);
        return hit.length ? hit[0].object.userData.item : null;
      },
      photoHit(x, y) {
        setRay(x, y);
        return ray.intersectObjects(photoFly.visible ? [photoFly, photoMesh] : [photoMesh], false).length > 0;
      },
      startShake(it) { it.shake = 1; },
      onUnlock(it) {
        it.flash = 1;
        burst(tmpV.copy(it.world).add(new THREE.Vector3(0, it.h / 2, 0)), mobile ? 200 : 320, 3.2, confetti);
      },
      update(t, dt, heartF, m, sel) {
        lidT += (lidWant - lidT) * (1 - Math.exp(-dt * 1.6));
        const lt = ease(clamp(lidT, 0, 1));
        lid.rotation.x = -1.95 * lt;
        inner.intensity = 1.5 * lt * (1 + Math.sin(t * 3) * 0.04);
        spill.material.opacity = 0.32 * lt;
        beam.material.opacity = 0.05 * lt;
        led.material.color.set(lt > 0.5 ? '#3BE07A' : '#FF4A3A');

        const dp = dust.geometry.attributes.position.array;
        for (let i = 0; i < DUST; i++) {
          dp[i * 3 + 1] += dt * 0.12;
          dp[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.04;
          if (dp[i * 3 + 1] > FLOOR + 3.8) dp[i * 3 + 1] = FLOOR + 0.1;
        }
        dust.geometry.attributes.position.needsUpdate = true;
        dust.material.uniforms.uFade.value = lt;

        if (!reduced) {
          const sp = snow.geometry.attributes.position.array;
          const fast = 1 + heartF * 1.5;
          for (let i = 0; i < SNOW; i++) {
            sp[i * 3 + 1] -= sspeed[i] * dt * fast;
            sp[i * 3] += Math.sin(t * 0.6 + sph[i]) * dt * 0.15;
            if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = 13 + Math.random();
          }
          snow.geometry.attributes.position.needsUpdate = true;
        }

        for (let i = 0; i < bulbs.length; i++) {
          const b = bulbs[i];
          const on = reduced ? 0.85 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + b.ph));
          b.g.material.opacity = on;
          b.core.material.opacity = on;
        }

        photoClock += dt;
        if (photos.length > 1 && photoClock > 9 && heartF < 0.5) { photoClock = 0; setPhoto(photoIdx + 1); }

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const isSel = it === sel && m === 'focus';
          it.lift += ((isSel ? 1 : 0) - it.lift) * (1 - Math.exp(-dt * 3.2));
          const lf = ease(clamp(it.lift, 0, 1));
          const bob = it.state === 'ready' ? Math.sin(t * 2.4 + it.d) * 0.05 + 0.06 : 0;
          liftPos.copy(it.home); liftPos.y += 1.9; liftPos.z += 0.5;
          it.grp.position.copy(it.home).lerp(liftPos, lf);
          it.grp.position.y += bob * (1 - lf);
          const f = ease(clamp(heartF * 1.8 - (i / N) * 0.8, 0, 1));
          if (f > 0) it.grp.position.lerp(it.heart, f);
          it.box3.rotation.y += dt * (lf * 0.6 + f * 0.8);
          it.shake = Math.max(0, it.shake - dt * 1.8);
          const sh = it.shake > 0 ? Math.sin(t * 46) * 0.16 * it.shake : 0;
          it.box3.rotation.z = sh;
          it.box3.rotation.x = Math.sin(t * 0.8 + it.d) * 0.08 * Math.max(lf, f) + sh * 0.5;
          const sc = (1 - f * 0.42) * (1 + it.shake * 0.08);
          it.grp.scale.set(sc, sc, sc);
          it.flash = Math.max(0, it.flash - dt * 0.9);
          it.wrapM.emissiveIntensity = it.state === 'ready' ? 0.12 + Math.sin(t * 2.4 + it.d) * 0.08 + it.shake * 0.4 : 0;
          it.glow.material.opacity = (it.state === 'ready' ? 0.35 : 0) + it.flash * 0.9 + f * 0.4 + it.shake * 0.5;
          it.ring.material.rotation = Math.sin(t * 0.7 + it.d) * 0.25;
          it.ring.material.opacity = 0.9 * Math.max(0, 1 - heartF * 3);
          it.ring.visible = it.state === 'ready' && heartF < 0.33;
          if (it.labelReady) it.label.material.opacity = (it.state === 'locked' ? 0.55 : 1) * Math.max(0, 1 - f * 1.6);
        }

        const hf = ease(clamp(heartF, 0, 1));
        photoFly.visible = hf > 0.02;
        if (photoFly.visible) {
          if (photoFlyMat.map !== photoMat.map) { photoFlyMat.map = photoMat.map; photoFlyMat.needsUpdate = true; }
          photoMesh.getWorldPosition(tmpV);
          photoFly.position.lerpVectors(tmpV, heartPhoto, hf);
          photoFly.quaternion.copy(camera.quaternion);
          const s = 0.6 + hf * 0.62;
          photoFly.scale.set(s, s, s);
        }
        photoMesh.visible = hf < 0.98;
      }
    };
  })();
  renderer.setClearColor(S.bg, 1);
  world.fog = new THREE.Fog(S.bg, 13, 30);

  /* ---------------- Camera ---------------- */
  let selected = null;
  let shift = S.view('intro').shift || 0;
  let heartF = 0, heartTarget = 0;
  let userZoom = 1;
  const v0 = S.view('intro');
  const cam = { theta: S.baseTheta, phi: S.basePhi, radius: v0.radius, target: v0.target.clone() };
  const want = { theta: S.baseTheta, phi: S.basePhi, radius: v0.radius, target: v0.target.clone() };

  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.fov = aspect() < 0.8 ? 62 : 52;
    camera.aspect = W / H;
    applyShift(true);
  }
  function applyShift(force) {
    if (shift > 0.0005) camera.setViewOffset(W, H, 0, shift * H, W, H);
    else if (force || camera.view) camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  let resizeRaf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(resize); });
  resize();

  /* ---------------- Tocco: trascina, pizzica per lo zoom, tocca ---------------- */
  const canvas = renderer.domElement;
  const pointers = new Map();
  let down = null, pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorato */ }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = userZoom;
      down = null;
    } else if (pointers.size === 1) {
      down = { t: performance.now(), moved: 0, lx: e.clientX, ly: e.clientY };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch0 && mode === 'free') {
      const [a, b] = [...pointers.values()];
      userZoom = clamp(zoom0 * (pinch0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))), 0.6, 1.5);
      return;
    }
    if (!down) return;
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY;
    down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 6 && mode !== 'intro') {
      const r = S.phiRange(mode);
      want.theta -= dx * 0.006;
      want.phi = clamp(want.phi - dy * 0.004, r[0], r[1]);
    }
  });
  function endPointer(e, isUp) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
    if (isUp && down && down.moved < 8 && performance.now() - down.t < 600) tap(e.clientX, e.clientY);
    if (!pointers.size) down = null;
  }
  canvas.addEventListener('pointerup', (e) => endPointer(e, true));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, false));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    userZoom = clamp(userZoom * (1 + e.deltaY * 0.001), 0.6, 1.5);
  }, { passive: false });

  function tap(x, y) {
    if (mode === 'intro' || opening) return;
    if (S.photoHit(x, y)) { openLightbox(); return; }
    if (mode === 'heart') return;
    const it = S.pick(x, y);
    if (!it) { if (mode === 'focus') closeSheet(); return; }
    if (it.state === 'locked') {
      toast('Uno al giorno: il ' + it.d + ' si apre il ' + it.d + ' dicembre. Mancano ' + fmtLeft(unlockAt(it.d) - Date.now()) + '.');
      tone('sine', 220, 160, 0.15, 0.08);
      return;
    }
    openSheet(it);
  }

  /* ---------------- Bigliettino ---------------- */
  const eyebrowFor = (d) => '<p class="eyebrow">Pacchetto ' + pad(d) + ' · ' + d + ' dicembre</p>';
  const metaFor = (d) => 'pacchetto ' + pad(d) + ' di ' + N + (d < N ? ' · domani il ' + (d + 1) : '');
  function renderSheet(s, swap) {
    const D = dayData(s.d);
    let h;
    if (isOpened(s.d)) {
      h = eyebrowFor(s.d) +
        (D.messaggio ? '<p class="message">' + rich(D.messaggio) + '</p>' : '') +
        (D.dove
          ? '<div class="gift where"><span class="gift-label">Oggi il regalo è</span><span class="gift-where">' + esc(D.dove) + '</span>'
          : '<div class="gift"><span class="gift-label">Nel baule cerca il pacchetto</span><span class="gift-code">' + esc(D.regalo) + '</span>') +
        '<span class="gift-meta">' + esc(metaFor(s.d)) + '</span></div>' +
        '<div class="actions">' +
        (s.d === N ? '<button class="btn ink" type="button" data-act="finale">E adesso?</button>' : '') +
        '<button class="btn ' + (s.d === N ? 'outline' : 'ink') + '" type="button" data-act="close">Fatto</button></div>';
    } else {
      h = eyebrowFor(s.d) +
        '<h2 class="sheet-title">' + (s.d === N ? "L'ultimo" : 'Tocca a te') + '</h2>' +
        '<p class="muted">Apri e scopri quale pacchetto prendere dal baule.</p>' +
        '<div class="actions"><button class="btn ink" type="button" data-act="unlock">Apri</button></div>';
    }
    el.body.innerHTML = h;
    if (swap) { el.body.classList.remove('swap'); void el.body.offsetWidth; el.body.classList.add('swap'); }
  }

  /* Avvisi speciali per giorno (con suono) */
  let alertDone = null;
  function showAlert(d, av, then) {
    el.alertEyebrow.textContent = 'Attenzione · pacchetto ' + pad(d);
    el.alertText.textContent = av.testo;
    el.alertSub.textContent = av.sottotitolo || '';
    el.alertSub.hidden = !av.sottotitolo;
    el.alertBtn.textContent = av.pulsante || 'Ok, posso aprire';
    el.alert.hidden = false;
    alertDone = then;
    if (av.suono !== false) alarmSound();
    vibrate([200, 100, 200, 100, 400]);
    el.alertBtn.focus();
  }
  el.alertBtn.addEventListener('click', () => {
    el.alert.hidden = true;
    const f = alertDone; alertDone = null;
    if (f) f();
  });

  /* Scherzi a tutto schermo */
  function photoSrc() {
    const f0 = photoList[0];
    if (f0 && !f0.cifrata) return f0.src;
    if (f0 && f0.url) return f0.url;
    const tex = photos[0];
    return tex ? tex.userData.canvas.toDataURL('image/jpeg', 0.85) : '';
  }
  let prankTimers = [], prankRaf = 0;
  function showPrank(sc, then) {
    const testo = sc.testo || 'HAHA TRUFFATA';
    const src = photoSrc();
    const P = el.prank;
    P.innerHTML = '';
    P.className = 'prank ' + (sc.tipo === 'dvd' ? 'is-dvd' : 'is-win');
    P.hidden = false;
    const layer = document.createElement('div');
    layer.className = 'prank-layer';
    P.appendChild(layer);
    const finale = document.createElement('div');
    finale.className = 'prank-final';
    finale.innerHTML = '<p class="prank-big">' + esc(testo) + '</p>' +
      (sc.sottotitolo ? '<p class="prank-sub">' + esc(sc.sottotitolo) + '</p>' : '') +
      '<button class="btn paper" type="button">' + esc(sc.pulsante || 'Ok, ho capito') + '</button>';
    finale.hidden = true;
    P.appendChild(finale);
    const later = (fn, ms) => prankTimers.push(setTimeout(fn, ms));
    vibrate([60, 60, 60, 60, 300]);

    if (sc.tipo === 'dvd') {
      const cards = [];
      const hues = ['#F3B85C', '#E8452C', '#7FD1A8', '#8FB3FF', '#F28FD0', '#FFFFFF'];
      const addCard = (x, y) => {
        if (cards.length >= (mobile ? 10 : 14)) return;
        const c = document.createElement('div');
        c.className = 'dvd-card';
        c.innerHTML = (src ? '<img alt="" src="' + src + '">' : '') + '<span>' + esc(testo) + '</span>';
        layer.appendChild(c);
        const ang = Math.random() * Math.PI * 2, sp = 190 + Math.random() * 120;
        cards.push({ c, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, w: 0, h: 0, hue: cards.length });
        c.style.borderColor = hues[cards.length % hues.length];
      };
      addCard(innerWidth / 2 - 70, innerHeight / 2 - 90);
      addCard(20, 60);
      addCard(innerWidth - 160, innerHeight * 0.3);
      let last = performance.now(), lastBoing = 0;
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        for (let i = 0; i < cards.length; i++) {
          const k = cards[i];
          if (!k.w) { k.w = k.c.offsetWidth; k.h = k.c.offsetHeight; }
          k.x += k.vx * dt; k.y += k.vy * dt;
          let hit = false;
          if (k.x < 0) { k.x = 0; k.vx = Math.abs(k.vx); hit = true; }
          if (k.y < 0) { k.y = 0; k.vy = Math.abs(k.vy); hit = true; }
          if (k.x + k.w > innerWidth) { k.x = innerWidth - k.w; k.vx = -Math.abs(k.vx); hit = true; }
          if (k.y + k.h > innerHeight) { k.y = innerHeight - k.h; k.vy = -Math.abs(k.vy); hit = true; }
          if (hit) {
            k.hue++;
            k.c.style.borderColor = hues[k.hue % hues.length];
            if (now - lastBoing > 120) { tone('sine', 520, 180, 0.18, 0.12); lastBoing = now; }
            addCard(k.x, k.y);
          }
          k.c.style.transform = 'translate3d(' + k.x + 'px,' + k.y + 'px,0) rotate(' + (k.vx > 0 ? 4 : -4) + 'deg)';
        }
        prankRaf = requestAnimationFrame(step);
      };
      prankRaf = requestAnimationFrame(step);
      later(() => { finale.hidden = false; tone('square', 300, 900, 0.35, 0.1); }, 3200);
    } else {
      const titles = ['truffa.exe', 'Errore', 'Attenzione', 'truffa.exe', NOME + '.jpg', 'Errore critico'];
      const n = mobile ? 22 : 26;
      const W0 = Math.min(250, innerWidth * 0.66);
      for (let i = 0; i < n; i++) {
        later(() => {
          const w = document.createElement('div');
          w.className = 'win';
          w.style.width = W0 + 'px';
          const trail = i < 14;
          const x = trail ? 10 + i * ((innerWidth - W0 - 20) / 13) : Math.random() * (innerWidth - W0);
          const y = trail ? 40 + i * ((innerHeight * 0.55) / 13) : Math.random() * (innerHeight - 260);
          w.style.left = Math.max(0, x) + 'px';
          w.style.top = Math.max(0, y) + 'px';
          w.innerHTML = '<div class="win-bar"><span>' + esc(titles[i % titles.length]) + '</span><i>_</i><i>□</i><i>×</i></div>' +
            '<div class="win-body">' + (src ? '<img alt="" src="' + src + '">' : '') + '<p>' + esc(testo) + '</p></div>' +
            '<div class="win-btns"><b>OK</b><b>Annulla</b></div>';
          layer.appendChild(w);
          if (i % 2 === 0) tone('square', 880, 660, 0.09, 0.07);
        }, 140 + i * (i < 14 ? 110 : 70));
      }
      later(() => { finale.hidden = false; tone('triangle', 400, 1200, 0.4, 0.12); }, 140 + 14 * 110 + (n - 14) * 70 + 500);
    }

    finale.querySelector('button').addEventListener('click', () => {
      prankTimers.forEach(clearTimeout); prankTimers = [];
      cancelAnimationFrame(prankRaf);
      P.classList.add('closing');
      setTimeout(() => { P.hidden = true; P.classList.remove('closing'); P.innerHTML = ''; then(); }, 350);
    });
  }

  function openSheet(s, skipExtras) {
    const D = dayData(s.d);
    if (!skipExtras && !isOpened(s.d)) {
      if (D.scherzo) { showPrank(D.scherzo, () => { openSheet(s, true); unlock(s); }); return; }
      if (D.avviso) { showAlert(s.d, D.avviso, () => openSheet(s, true)); return; }
    }
    selected = s;
    mode = 'focus';
    renderSheet(s, true);
    el.sheet.classList.add('open');
    el.sheet.setAttribute('aria-hidden', 'false');
    el.hint.classList.add('faded');
    el.hud.classList.add('in-focus');
  }
  function closeSheet() {
    el.sheet.classList.remove('open');
    el.sheet.setAttribute('aria-hidden', 'true');
    selected = null;
    if (mode === 'focus') mode = 'free';
    el.hint.classList.remove('faded');
    el.hud.classList.remove('in-focus');
  }
  let opening = false;
  function unlock(s) {
    if (opening || isOpened(s.d)) return;
    opening = true;
    S.startShake(s);
    tone('sine', 300, 600, 0.45, 0.05);
    vibrate([15, 30, 15, 30, 15]);
    setTimeout(() => {
      opened.push(s.d); saveOpened();
      S.applyState(s);
      S.onUnlock(s);
      pop(); chime();
      vibrate([25, 40, 70]);
      updateHud();
      opening = false;
      setTimeout(() => { if (selected === s) renderSheet(s, true); }, 650);
    }, reduced ? 0 : 560);
  }
  el.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !selected) return;
    const act = b.getAttribute('data-act');
    if (act === 'close') closeSheet();
    else if (act === 'unlock') { b.disabled = true; unlock(selected); }
    else if (act === 'finale') startFinale();
  });
  el.close.addEventListener('click', closeSheet);

  /* ---------------- Finale ---------------- */
  function startFinale() {
    closeSheet();
    mode = 'heart';
    heartTarget = 1;
    want.theta = Math.round(cam.theta / (Math.PI * 2)) * Math.PI * 2;
    want.phi = S.finalePhi;
    el.finale.hidden = false;
    el.hint.classList.add('faded');
    el.hud.classList.add('in-finale');
    jingle();
    [1400, 2300, 3100].forEach((t, i) => setTimeout(() => {
      if (mode !== 'heart') return;
      burst(new THREE.Vector3((i - 1) * 1.6, S.heartCenterY + 0.3 + i * 0.3, 0), mobile ? 180 : 300, 4.5);
      tone('triangle', 1200 + i * 200, 1200 + i * 200, 0.3, 0.06);
    }, t));
  }
  function endFinale() {
    heartTarget = 0;
    mode = 'free';
    want.phi = S.basePhi;
    el.finale.hidden = true;
    el.hint.classList.remove('faded');
    el.hud.classList.remove('in-finale');
  }
  el.finaleBtn.addEventListener('click', startFinale);
  el.back.addEventListener('click', endFinale);

  /* ---------------- Lightbox ---------------- */
  function openLightbox() {
    const tex = photos[photoIdx];
    if (!tex) return;
    el.lightboxImg.src = tex.userData.canvas.toDataURL('image/jpeg', 0.9);
    el.lightbox.hidden = false;
  }
  el.lightbox.addEventListener('click', () => { el.lightbox.hidden = true; });

  /* ---------------- Ingresso con promessa ---------------- */
  const NO = ['Senza promessa non si entra.', 'Spunta la casella, ' + NOME + '.', 'Niente promessa, niente regali.', 'Dai, è una casella sola.'];
  let noN = 0;
  el.promise.addEventListener('change', () => {
    el.promiseErr.hidden = true;
    el.promiseLabel.classList.toggle('signed', el.promise.checked);
    if (el.promise.checked) { tone('triangle', 880, 1320, 0.18, 0.08); vibrate(20); }
  });
  el.enter.addEventListener('click', () => {
    if (!el.promise.checked) {
      el.promiseErr.textContent = NO[noN++ % NO.length];
      el.promiseErr.hidden = false;
      el.promiseLabel.classList.remove('shake'); void el.promiseLabel.offsetWidth; el.promiseLabel.classList.add('shake');
      tone('sine', 220, 150, 0.2, 0.1);
      vibrate([40, 40, 40]);
      return;
    }
    el.intro.classList.add('gone');
    setTimeout(() => { el.intro.hidden = true; }, 950);
    el.hud.hidden = false;
    mode = 'free';
    S.openLid();
    lidSound();
    if (reduced) cam.radius = S.view('free').radius;
  });

  /* Ricomincia da capo (dal 25 dicembre) */
  el.replayCheck.addEventListener('change', () => {
    el.replayBtn.hidden = !el.replayCheck.checked;
    if (el.replayCheck.checked) { tone('triangle', 880, 1320, 0.18, 0.08); vibrate(20); }
  });
  el.replayBtn.addEventListener('click', () => {
    opened = [];
    saveOpened();
    if (mode === 'heart') endFinale();
    closeSheet();
    el.replayCheck.checked = false;
    el.replayBtn.hidden = true;
    S.closeLid();
    setTimeout(() => {
      S.items.forEach(S.applyState);
      S.openLid();
      lidSound();
      burst(new THREE.Vector3(0, 3.2, 0), mobile ? 220 : 340, 4);
      updateHud();
      toast('Si ricomincia. Tutti e ' + N + ' i pacchetti sono di nuovo chiusi.');
    }, reduced ? 0 : 1300);
  });

  el.reset.addEventListener('click', () => {
    opened = [];
    saveOpened();
    S.items.forEach(S.applyState);
    if (mode === 'heart') endFinale();
    closeSheet();
    updateHud();
    toast('Azzerato. Si ricomincia.');
  });
  addEventListener('hashchange', () => location.reload());

  /* ---------------- Avvio ---------------- */
  S.items.forEach(S.applyState);
  updateHud();
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all([document.fonts.load('600 56px "IBM Plex Mono"'), document.fonts.load('400 44px "Kalam"')]),
      new Promise((r) => setTimeout(r, 2000))
    ]).catch(() => {})
    : Promise.resolve();
  fontsReady.then(() => {
    fontsLoaded = true;
    fontQueue.splice(0).forEach((fn) => fn());
    loadPhotos();
  });

  setInterval(() => {
    if (document.hidden) return;
    const before = S.items.map((s) => s.state).join();
    S.items.forEach(S.applyState);
    if (before !== S.items.map((s) => s.state).join()) { toast('Si è appena sbloccato un pacchetto nuovo.'); chime(); }
    updateHud();
  }, 30000);

  /* ---------------- Loop ---------------- */
  const clock = new THREE.Clock();
  let rafId = 0, perfFrames = 0, perfTime = 0, perfChecked = false;
  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // qualità adattiva: se il telefono fatica, abbassa la risoluzione una volta sola
    if (!perfChecked && mode !== 'intro') {
      perfFrames++; perfTime += dt;
      if (perfFrames === 90) {
        perfChecked = true;
        if (perfTime / perfFrames > 0.024 && pixelRatio > 1) {
          pixelRatio = Math.max(1, pixelRatio * 0.7);
          renderer.setPixelRatio(pixelRatio);
          pointMats.forEach((m) => { m.uniforms.uPR.value = pixelRatio; });
          resize();
        }
      }
    }

    const v = S.view(mode, selected);
    want.radius = v.radius * (mode === 'free' ? userZoom : 1);
    want.target.copy(v.target);
    const shiftWant = v.shift || 0;

    const k = 1 - Math.exp(-dt * 3);
    const kR = 1 - Math.exp(-dt * 2.6);
    cam.theta += (want.theta - cam.theta) * k;
    cam.phi += (want.phi - cam.phi) * k;
    cam.radius += (want.radius - cam.radius) * kR;
    cam.target.lerp(want.target, k);
    if (mode === 'free' && !down && !reduced) want.theta += dt * 0.025;
    const ns = shift + (shiftWant - shift) * k;
    if (Math.abs(ns - shift) > 0.0002) { shift = ns; applyShift(); }
    camera.position.setFromSphericalCoords(cam.radius, cam.phi, cam.theta).add(cam.target);
    camera.lookAt(cam.target);

    heartF += (heartTarget - heartF) * (1 - Math.exp(-dt * 0.9));
    S.update(t, dt, heartF, mode, selected);

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life += dt;
      const pos = b.p.geometry.attributes.position.array;
      const drag = Math.exp(-dt * 1.8);
      for (let j = 0; j < b.vel.length; j++) { pos[j] += b.vel[j] * dt; b.vel[j] *= drag; }
      for (let j = 1; j < b.vel.length; j += 3) b.vel[j] -= dt * 1.2;
      b.p.geometry.attributes.position.needsUpdate = true;
      b.p.material.uniforms.uFade.value = Math.max(0, 1 - b.life / b.max);
      if (b.life >= b.max) {
        world.remove(b.p); b.p.geometry.dispose(); b.p.material.dispose();
        pointMats.splice(pointMats.indexOf(b.p.material), 1);
        bursts.splice(i, 1);
      }
    }

    for (let i = 0; i < pointMats.length; i++) pointMats[i].uniforms.uTime.value = t;
    renderer.render(world, camera);
  }
  // si ferma quando il telefono è bloccato o si cambia app, per non consumare batteria
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
    else if (!rafId) { clock.getDelta(); frame(); }
  });
  frame();
})();
