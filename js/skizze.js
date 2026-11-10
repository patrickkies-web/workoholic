/*
 * Workoholic · Schreiben · Modul „Unfallskizze“
 * ---------------------------------------------------------------
 * Luftbild (Screenshot von oben) einfügen, Kartenrichtung wählen, Fahrzeuge hinzufügen und ihren Fahrweg
 * mit einem Wisch einzeichnen, Kollisionsort antippen; optional ein Foto mit Markierung. Daraus entstehen
 * ein Gesamtbild zum Teilen und ein Text mit Herkunft, Fahrtrichtung und Abbiegevorgang je Fahrzeug –
 * Grundlage für die Beschreibung der Unfallörtlichkeit.
 * Bilder liegen verschlüsselt in der Ablage (Ordner „Unfallskizzen“), die Skizze selbst im Vorgang.
 * Keine Netzwerkzugriffe.
 */
((root) => {
  'use strict';
  const B = () => root.WBridge;
  const has = v => v != null && String(v).trim() !== '';
  const get = (o, p) => p.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const arr = v => (Array.isArray(v) ? v : []);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  const FOLDER = 'Unfallskizzen';

  /* ======================= Stammdaten ======================= */
  const VT = [['pkw', 'Pkw'], ['transp', 'Transporter'], ['lkw', 'Lkw'], ['bus', 'Bus'], ['krad', 'Krad'], ['rad', 'Fahrrad'], ['fuss', 'Fußgänger']];
  const VL = Object.fromEntries(VT);
  const COLORS = ['#ffd23f', '#4dabff', '#ff6b5e', '#7ee081', '#c58cff', '#36d6c3', '#ff9f43', '#f78fb3'];
  const UP = [['N', 'Norden'], ['NO', 'Nordosten'], ['O', 'Osten'], ['SO', 'Südosten'], ['S', 'Süden'], ['SW', 'Südwesten'], ['W', 'Westen'], ['NW', 'Nordwesten']];
  const UPDEG = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };
  const DIR8 = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  const SCREEN8 = ['oben', 'oben rechts', 'rechts', 'unten rechts', 'unten', 'unten links', 'links', 'oben links'];

  /* ======================= Richtung aus dem Fahrweg ======================= */
  const norm360 = a => ((a % 360) + 360) % 360;
  /** Bildwinkel (0 = nach oben, im Uhrzeigersinn) eines Vektors in Bildpixeln */
  const screenAngle = (dx, dy) => norm360(Math.atan2(dx, -dy) * 180 / Math.PI);
  const dir8 = deg => Math.round(norm360(deg) / 45) % 8;
  function pathLen(pts, w, h) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot((pts[i][0] - pts[i - 1][0]) * w, (pts[i][1] - pts[i - 1][1]) * h); return L; }
  /** Richtung am Anfang bzw. Ende: über die ersten/letzten ~20 % des Weges gemittelt */
  function headings(pts, w, h) {
    const L = pathLen(pts, w, h); if (L < 1) return null;
    const take = Math.max(L * 0.2, 1);
    const along = (fromEnd) => {
      const p = fromEnd ? pts.slice().reverse() : pts; let acc = 0, i = 1;
      for (; i < p.length && acc < take; i++) acc += Math.hypot((p[i][0] - p[i - 1][0]) * w, (p[i][1] - p[i - 1][1]) * h);
      const a = p[0], b = p[Math.min(i, p.length - 1)];
      return fromEnd ? screenAngle((a[0] - b[0]) * w, (a[1] - b[1]) * h) : screenAngle((b[0] - a[0]) * w, (b[1] - a[1]) * h);
    };
    return { start: along(false), end: along(true), len: L };
  }
  /** Beschreibung eines Fahrwegs: Herkunft, Fahrtrichtung, Abbiegen – in Himmelsrichtungen, wenn die Kartenrichtung bekannt ist */
  function describe(v, sk) {
    const w = sk.w || 1000, h = sk.h || 1000, pts = arr(v.path);
    const name = `${v.n} ${VL[v.t] || 'Fahrzeug'}`;
    const geht = v.t === 'fuss';
    if (!pts.length) return { name, txt: 'Fahrweg noch nicht eingezeichnet', ok: false };
    const hd = pts.length > 1 ? headings(pts, w, h) : null;
    if (!hd || hd.len < Math.max(w, h) * 0.03) return { name, txt: geht ? 'Standort markiert (ohne Bewegung)' : 'Standort markiert (stehend/geparkt)', ok: true };
    const upd = has(sk.up) ? UPDEG[sk.up] : null;
    const toT = deg => (upd == null ? `nach ${SCREEN8[dir8(deg)]}` : `in Richtung ${DIR8[dir8(deg + upd)]}`);
    const fromT = deg => (upd == null ? `von ${SCREEN8[dir8(deg + 180)]}` : `aus Richtung ${DIR8[dir8(deg + 180 + upd)]}`);
    const fahrt = deg => (upd == null ? SCREEN8[dir8(deg)] : DIR8[dir8(deg + upd)]);
    let d = norm360(hd.end - hd.start); if (d > 180) d -= 360;
    let txt;
    if (geht) txt = Math.abs(d) < 35 ? `kommt ${fromT(hd.start)} und geht ${toT(hd.start)}` : `kommt ${fromT(hd.start)} und geht ${toT(hd.end)}`;
    else if (Math.abs(d) < 35) txt = `kommt ${fromT(hd.start)} und fährt geradeaus ${toT(hd.start)}`;
    else if (Math.abs(d) >= 150) txt = upd == null ? `kommt ${fromT(hd.start)} und wendet` : `kommt ${fromT(hd.start)} (Fahrtrichtung ${fahrt(hd.start)}) und wendet`;
    else if (upd == null) txt = `kommt ${fromT(hd.start)} und biegt nach ${d > 0 ? 'rechts' : 'links'} ab`;
    else txt = `kommt ${fromT(hd.start)} (Fahrtrichtung ${fahrt(hd.start)}) und biegt nach ${d > 0 ? 'rechts' : 'links'} ab ${toT(hd.end)}`;
    return { name, txt, ok: true, start: hd.start, end: hd.end };
  }

  /* ======================= Bilder (verschlüsselte Ablage) ======================= */
  const urls = new Map();
  async function imgFor(id) {
    if (!id) return null;
    if (urls.has(id)) return urls.get(id);
    const p = (async () => {
      const blob = await B().fileBlob(id); if (!blob) return null;
      const u = URL.createObjectURL(blob);
      const img = new Image(); img.decoding = 'async'; img.src = u;
      await img.decode().catch(() => new Promise(r => { img.onload = r; img.onerror = r; }));
      return img;
    })();
    urls.set(id, p);
    return p;
  }
  /** Bild verkleinern (lange Seite max. 2400 px) und als JPEG verschlüsselt ablegen */
  async function importImage(file, label) {
    const src = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = src;
      await img.decode();
      const max = 2400, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.88));
      const d = new Date(), name = `${label} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}.jpg`;
      const id = await B().addBlob(blob, name, FOLDER);
      return id ? { id, w, h } : null;
    } catch (e) { B().toast('Bild konnte nicht gelesen werden.'); return null; }
    finally { URL.revokeObjectURL(src); }
  }

  /* ======================= Zeichnen (Editor und Export) ======================= */
  const DIM = { pkw: [4.6, 1.9], transp: [5.5, 2.1], lkw: [9, 2.5], bus: [12, 2.6], krad: [2.3, 0.85], rad: [1.9, 0.65], fuss: [0.9, 0.9] };
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawMarker(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 1.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2d2d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(2, r * 0.26); ctx.lineCap = 'round';
    const q = r * 0.45; ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke();
    ctx.restore();
  }
  /** Skizze auf ctx zeichnen: Bild, Fahrwege mit Pfeil, Fahrzeuge an der Startposition, Kollisionsort, Nordpfeil */
  function paint(ctx, W, H, img, sk, opt = {}) {
    if (img) ctx.drawImage(img, 0, 0, W, H); else { ctx.fillStyle = '#1b1b1d'; ctx.fillRect(0, 0, W, H); }
    const u = Math.min(W, H) / 100 * 1.15;       // Grundeinheit: an der kürzeren Seite, damit Fahrzeuge zur Straße passen
    const car = u * (opt.carScale || 1);
    arr(sk.veh).forEach((v, i) => {
      const col = COLORS[i % COLORS.length], pts = arr(v.path).map(([x, y]) => [x * W, y * H]);
      if (!pts.length) return;
      if (pts.length > 1) {
        ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = u * 1.25; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = u * 0.7; ctx.setLineDash(v.t === 'fuss' ? [u * 1.2, u * 0.9] : []); ctx.stroke(); ctx.setLineDash([]);
        const [x2, y2] = pts[pts.length - 1]; let k = pts.length - 2; while (k > 0 && Math.hypot(x2 - pts[k][0], y2 - pts[k][1]) < u * 2) k--;
        const a = Math.atan2(y2 - pts[k][1], x2 - pts[k][0]), L = u * 3.2;
        ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = u * 0.3;
        ctx.beginPath(); ctx.moveTo(x2 + Math.cos(a) * L * 0.35, y2 + Math.sin(a) * L * 0.35); ctx.lineTo(x2 - Math.cos(a - 0.5) * L, y2 - Math.sin(a - 0.5) * L); ctx.lineTo(x2 - Math.cos(a + 0.5) * L, y2 - Math.sin(a + 0.5) * L); ctx.closePath(); ctx.stroke(); ctx.fill();
        ctx.restore();
      }
      /* Fahrzeug am Startpunkt, ausgerichtet nach der Anfangsrichtung */
      const [x0, y0] = pts[0];
      let ang = 0; if (pts.length > 1) { let j = 1; while (j < pts.length - 1 && Math.hypot(pts[j][0] - x0, pts[j][1] - y0) < u * 2.5) j++; ang = Math.atan2(pts[j][1] - y0, pts[j][0] - x0); }
      const [lm, bm] = DIM[v.t] || DIM.pkw, s = car * 1.05;
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
      ctx.fillStyle = col; ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.5, u * 0.28);
      if (v.t === 'fuss') { ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else { roundRect(ctx, -lm * s * 0.5, -bm * s * 0.5, lm * s, bm * s, Math.min(bm * s * 0.3, s * 0.6)); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(lm * s * 0.18, -bm * s * 0.36, lm * s * 0.12, bm * s * 0.72); }
      ctx.restore();
      /* Nummer als Plakette, immer lesbar */
      const r = u * 1.9, bx = x0 + u * 2.6, by = y0 - u * 2.6;
      ctx.save(); ctx.fillStyle = '#111'; ctx.strokeStyle = col; ctx.lineWidth = u * 0.4;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.05)}px system-ui, -apple-system, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.n, bx, by + r * 0.05);
      ctx.restore();
    });
    if (sk.hit) drawMarker(ctx, sk.hit[0] * W, sk.hit[1] * H, u * 2.1);
    if (opt.north && has(sk.up)) {
      const R = u * 5, cx = W - R * 2.2, cy = R * 2.2, a = -UPDEG[sk.up] * Math.PI / 180;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = u * 0.25;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = '#d11'; ctx.beginPath(); ctx.moveTo(0, -R * 0.78); ctx.lineTo(R * 0.3, R * 0.1); ctx.lineTo(-R * 0.3, R * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(0, R * 0.62); ctx.lineTo(R * 0.24, R * 0.1); ctx.lineTo(-R * 0.24, R * 0.1); ctx.closePath(); ctx.fill();
      ctx.rotate(-a); const ny = -Math.cos(a) * R * 1.35, nx = Math.sin(a) * R * 1.35;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = u * 0.5; ctx.font = `800 ${Math.round(R * 0.72)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText('N', nx, ny); ctx.fillText('N', nx, ny);
      ctx.restore();
    }
  }

  /** Zeichenfläche passt immer ganz auf den Bildschirm (beim Wischen kann die Seite nicht scrollen) */
  function fit(cw, ratio) {
    const maxH = Math.max(260, Math.round((root.innerHeight || 800) * 0.7));
    let W = Math.round(cw), H = Math.round(W * ratio);
    if (H > maxH) { H = maxH; W = Math.round(H / ratio); }
    return [W, H];
  }
  /* ======================= Editor (Schritt „Luftbild“) ======================= */
  const HINT = {
    none: 'Fahrzeug hinzufügen, danach seinen Fahrweg mit dem Finger wischen.',
    draw: 'Jetzt wischen: vom Ausgangspunkt des Fahrzeugs in Fahrtrichtung über das Bild – auch um die Kurve. Nur antippen = stehendes Fahrzeug.',
    hit: 'Jetzt die Kollisionsstelle im Bild antippen.'
  };
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  function mountSketch(el, api) {
    let sk = clone(api.get('sk')); sk.veh = arr(sk.veh);
    const ui = { mode: 'none', sel: sk.veh.length ? sk.veh.length - 1 : -1, picking: false, undo: [] };
    const save = () => { api.set('sk', clone(sk)); };
    const snap = () => { ui.undo.push(JSON.stringify(sk)); if (ui.undo.length > 40) ui.undo.shift(); };
    let img = null, cv = null, ctx = null, cur = null;
    function html() {
      if (!sk.img) return `<label class="sk-drop"><input type="file" accept="image/*" data-sk-file hidden><span class="sk-drop-i" aria-hidden="true">+</span><b>Luftbild einfügen</b><span>Screenshot aus der Karten-App, von oben (2D), Unfallstelle möglichst mittig. Den Kompass sichtbar lassen.</span></label>`;
      const vehs = sk.veh.map((v, i) => `<button type="button" class="sk-v${i === ui.sel ? ' on' : ''}" data-sk-sel="${i}" style="--c:${COLORS[i % COLORS.length]}"><i></i>${esc(v.n)} ${esc(VL[v.t] || '')}${arr(v.path).length ? '' : ' · ohne Weg'}</button>`).join('');
      return `<div class="sk-sec"><span class="w-lbl">Oben im Bild ist … <small>(Buchstabe am Kompass der Karten-App)</small></span><div class="w-chips sk-up">${UP.map(([k, l]) => `<button type="button" class="chip" data-sk-up="${k}" aria-pressed="${sk.up === k}" title="${l}">${k}</button>`).join('')}</div></div>
        <div class="sk-sec"><span class="w-lbl">Fahrzeuge</span><div class="sk-vs">${vehs}<button type="button" class="sk-add" data-sk-add aria-expanded="${ui.picking}">+ Fahrzeug</button></div>
        ${ui.picking ? `<div class="w-chips sk-types">${VT.map(([k, l]) => `<button type="button" class="chip" data-sk-type="${k}">${l}</button>`).join('')}</div>` : ''}</div>
        <div class="sk-tools">
          <button type="button" class="btn btn-ghost btn-sm" data-sk-mode="draw"${ui.sel < 0 ? ' disabled' : ''} aria-pressed="${ui.mode === 'draw'}">Fahrweg wischen</button>
          <button type="button" class="btn btn-ghost btn-sm sk-hitb" data-sk-mode="hit" aria-pressed="${ui.mode === 'hit'}">Kollisionsort</button>
          <button type="button" class="btn btn-ghost btn-sm" data-sk-undo${ui.undo.length ? '' : ' disabled'}>Rückgängig</button>
          <button type="button" class="btn btn-ghost btn-sm btn-danger" data-sk-del${ui.sel < 0 ? ' disabled' : ''}>Fahrzeug entfernen</button>
        </div>
        <p class="sk-hint" data-mode="${ui.mode}">${esc(HINT[ui.mode])}</p>
        <div class="sk-stage" data-mode="${ui.mode}"><canvas class="sk-cv" aria-label="Unfallskizze"></canvas></div>
        <ul class="sk-sum">${sk.veh.map((v, i) => { const s = describe(v, sk); return `<li style="--c:${COLORS[i % COLORS.length]}"><b>${esc(s.name)}</b> ${esc(s.txt)}</li>`; }).join('')}${sk.hit ? '<li class="sk-sum-hit"><b>Kollisionsort</b> im Bild rot markiert</li>' : ''}</ul>
        <label class="btn btn-ghost btn-sm sk-replace"><input type="file" accept="image/*" data-sk-file hidden>Anderes Luftbild</label>`;
    }
    function layout() {
      if (!cv) return;
      const [W, H] = fit(cv.parentElement.clientWidth || 320, sk.h && sk.w ? sk.h / sk.w : 0.75), dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      draw();
    }
    function draw() { if (!ctx) return; const tmp = cur && ui.sel >= 0 ? { ...sk, veh: sk.veh.map((v, i) => (i === ui.sel ? { ...v, path: cur } : v)) } : sk; paint(ctx, cv.width, cv.height, img, tmp, { carScale: 1 }); }
    function render() {
      el.innerHTML = `<div class="sk">${html()}</div>`;
      cv = el.querySelector('.sk-cv'); ctx = cv ? cv.getContext('2d') : null;
      if (cv) { layout(); if (!img) imgFor(sk.img).then(i => { img = i; draw(); }); bindCanvas(); if (ui.mode !== 'none') requestAnimationFrame(() => { const st = el.querySelector('.sk-stage'); if (st) st.scrollIntoView({ block: 'center', behavior: 'auto' }); }); }
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    function simplify(pts) {
      const W = sk.w || 1000, H = sk.h || 1000, eps = Math.max(W, H) * 0.004;
      const out = [pts[0]]; for (const p of pts.slice(1)) { const q = out[out.length - 1]; if (Math.hypot((p[0] - q[0]) * W, (p[1] - q[1]) * H) >= eps) out.push(p); }
      if (out.length > 1 && out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
      const step = Math.ceil(out.length / 80); return out.filter((_, i) => i % step === 0 || i === out.length - 1).map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
    }
    function bindCanvas() {
      cv.addEventListener('pointerdown', e => {
        if (ui.mode === 'hit') { e.preventDefault(); snap(); sk.hit = pt(e).map(v => Math.round(v * 10000) / 10000); ui.mode = 'none'; save(); render(); return; }
        if (ui.mode !== 'draw' || ui.sel < 0) return;
        e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [pt(e)]; draw();
      });
      cv.addEventListener('pointermove', e => { if (!cur) return; e.preventDefault(); cur.push(pt(e)); draw(); });
      const end = () => { if (!cur) return; snap(); sk.veh[ui.sel].path = simplify(cur); cur = null; ui.mode = 'none'; save(); render(); };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => { cur = null; draw(); });
    }
    async function onFile(input) {
      const f = input.files && input.files[0]; if (!f) return;
      const r = await importImage(f, 'Luftbild'); if (!r) return;
      snap(); sk.img = r.id; sk.w = r.w; sk.h = r.h; img = null; save(); render();
    }
    el.addEventListener('change', e => { const f = e.target.closest('[data-sk-file]'); if (f) onFile(f); });
    el.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.dataset.skUp) { snap(); sk.up = sk.up === t.dataset.skUp ? '' : t.dataset.skUp; save(); render(); return; }
      if (t.hasAttribute('data-sk-add')) { ui.picking = !ui.picking; render(); return; }
      if (t.dataset.skType) { snap(); sk.veh.push({ n: pad(sk.veh.length + 1), t: t.dataset.skType, path: [] }); ui.sel = sk.veh.length - 1; ui.picking = false; ui.mode = 'draw'; save(); render(); return; }
      if (t.dataset.skSel != null) { ui.sel = +t.dataset.skSel; ui.mode = arr(sk.veh[ui.sel].path).length ? 'none' : 'draw'; render(); return; }
      if (t.dataset.skMode) { ui.mode = ui.mode === t.dataset.skMode ? 'none' : t.dataset.skMode; render(); return; }
      if (t.hasAttribute('data-sk-undo')) { const s = ui.undo.pop(); if (s) { const keepImg = sk.img; sk = JSON.parse(s); if (sk.img !== keepImg) img = null; ui.sel = Math.min(ui.sel, sk.veh.length - 1); ui.mode = 'none'; save(); render(); } return; }
      if (t.hasAttribute('data-sk-del')) { if (ui.sel < 0) return; snap(); sk.veh.splice(ui.sel, 1); sk.veh.forEach((v, i) => { v.n = pad(i + 1); }); ui.sel = sk.veh.length - 1; ui.mode = 'none'; save(); render(); }
    });
    let rz = 0; const ro = new ResizeObserver(() => { if (!el.isConnected) { ro.disconnect(); return; } cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); }); ro.observe(el);
    render();
  }

  /* ======================= Foto mit Markierung ======================= */
  function mountFoto(el, api) {
    let fo = clone(api.get('foto'));
    let img = null, cv = null, ctx = null;
    const save = () => api.set('foto', clone(fo));
    function render() {
      el.innerHTML = `<div class="sk">${!fo.img ? `<label class="sk-drop"><input type="file" accept="image/*" data-sk-file hidden><span class="sk-drop-i" aria-hidden="true">+</span><b>Foto einfügen (optional)</b><span>Ein Bild aus Sicht eines Beteiligten. Danach die Unfallstelle im Foto antippen.</span></label>`
        : `<p class="sk-hint" data-mode="hit">Unfallstelle im Foto antippen${fo.hit ? ' – erneut tippen zum Verschieben' : ''}.</p><div class="sk-stage" data-mode="hit"><canvas class="sk-cv" aria-label="Foto"></canvas></div><div class="sk-tools"><button type="button" class="btn btn-ghost btn-sm" data-fo-clear${fo.hit ? '' : ' disabled'}>Markierung entfernen</button><label class="btn btn-ghost btn-sm"><input type="file" accept="image/*" data-sk-file hidden>Anderes Foto</label></div>`}</div>`;
      cv = el.querySelector('.sk-cv'); ctx = cv ? cv.getContext('2d') : null;
      if (cv) {
        layout(); imgFor(fo.img).then(i => { img = i; draw(); });
        cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); fo.hit = [Math.round((e.clientX - r.left) / r.width * 10000) / 10000, Math.round((e.clientY - r.top) / r.height * 10000) / 10000]; save(); render(); });
      }
    }
    function layout() { if (!cv) return; const [W, H] = fit(cv.parentElement.clientWidth || 320, fo.h && fo.w ? fo.h / fo.w : 0.75), dpr = Math.min(2, root.devicePixelRatio || 1); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw(); }
    function draw() { if (!ctx) return; if (img) ctx.drawImage(img, 0, 0, cv.width, cv.height); if (fo.hit) drawMarker(ctx, fo.hit[0] * cv.width, fo.hit[1] * cv.height, Math.max(cv.width, cv.height) / 100 * 2.1); }
    el.addEventListener('change', async e => { const f = e.target.closest('[data-sk-file]'); if (!f || !f.files[0]) return; const r = await importImage(f.files[0], 'Foto'); if (!r) return; fo = { ...fo, img: r.id, w: r.w, h: r.h, hit: null }; img = null; save(); render(); });
    el.addEventListener('click', e => { if (e.target.closest('[data-fo-clear]')) { fo.hit = null; save(); render(); } });
    let rz = 0; const ro = new ResizeObserver(() => { if (!el.isConnected) { ro.disconnect(); return; } cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); }); ro.observe(el);
    render();
  }

  /* ======================= Export: ein Bild + Text ======================= */
  function wrap(ctx, text, maxW) { const words = String(text).split(/\s+/), lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
  async function exportImage(data) {
    const sk = data.sk || {}, fo = data.foto || {};
    const aImg = await imgFor(sk.img), fImg = fo.img ? await imgFor(fo.img) : null;
    const W = Math.min(1600, Math.max(900, sk.w || 1200));
    const hA = aImg ? Math.round(W * (sk.h / sk.w)) : 0, hF = fImg ? Math.round(W * (fo.h / fo.w)) : 0;
    const lines = summaryLines(data), pad0 = Math.round(W * 0.03), fs = Math.round(W * 0.022);
    const m = document.createElement('canvas').getContext('2d'); m.font = `500 ${fs}px system-ui, sans-serif`;
    const wrapped = lines.map(l => wrap(m, l.txt, W - pad0 * 2 - fs * 1.6));
    const legendH = pad0 * 2 + fs * 2 + wrapped.reduce((n, l) => n + l.length, 0) * fs * 1.4 + pad0;
    const tf = Math.round(fs * 1.25); m.font = `700 ${tf}px system-ui, sans-serif`;
    const tLines = wrap(m, ['Unfallskizze', get(data, 'ort.text'), fmtDate(get(data, 'ort.datum'))].filter(has).join(' · '), W - pad0 * 2);
    const headH = Math.round(pad0 * 1.2 + tLines.length * tf * 1.3);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Math.round(headH + hA + legendH + (hF ? hF + fs * 2.6 : 0));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, cv.height);
    ctx.fillStyle = '#111'; ctx.font = `700 ${tf}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
    tLines.forEach((t, i) => ctx.fillText(t, pad0, pad0 * 0.6 + tf * 0.65 + i * tf * 1.3));
    let y = headH;
    if (aImg) { ctx.save(); ctx.translate(0, y); paint(ctx, W, hA, aImg, sk, { north: true, carScale: 1.1 }); ctx.restore(); y += hA; }
    y += pad0; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.fillStyle = '#111'; ctx.fillText('Legende', pad0, y + fs * 0.5); y += fs * 1.8;
    ctx.font = `500 ${fs}px system-ui, sans-serif`;
    lines.forEach((l, i) => {
      if (l.col) { ctx.fillStyle = l.col; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pad0 + fs * 0.45, y + fs * 0.1, fs * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else if (l.hit) drawMarker(ctx, pad0 + fs * 0.45, y + fs * 0.1, fs * 0.45);
      ctx.fillStyle = '#111';
      wrapped[i].forEach((t, k) => { ctx.fillText(t, pad0 + fs * 1.6, y + fs * 0.1); y += fs * 1.4; if (k === wrapped[i].length - 1) y += 0; });
    });
    if (fImg) {
      y += fs * 1.2; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.fillText('Foto', pad0, y); y += fs * 1.4;
      ctx.drawImage(fImg, 0, y, W, hF); if (fo.hit) drawMarker(ctx, fo.hit[0] * W, y + fo.hit[1] * hF, W / 100 * 2.1);
    }
    return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  }
  function summaryLines(data) {
    const sk = data.sk || {}, out = [];
    if (has(sk.up)) out.push({ txt: `Kartenausrichtung: oben im Bild ist ${UP.find(u => u[0] === sk.up)[1]}.` });
    else out.push({ txt: 'Kartenausrichtung: nicht angegeben – Richtungen beziehen sich auf das Bild.' });
    arr(sk.veh).forEach((v, i) => { const s = describe(v, sk); out.push({ col: COLORS[i % COLORS.length], txt: `${s.name}: ${s.txt}.` }); });
    if (sk.hit) out.push({ hit: true, txt: 'Kollisionsort (rot markiert).' });
    return out;
  }
  function mountExport(el, api) {
    const data = () => ({ sk: api.get('sk') || {}, foto: api.get('foto') || {}, ort: api.get('ort') || {} });
    const render = () => {
      const d = data(), ok = !!(d.sk && d.sk.img);
      el.innerHTML = `<div class="sk"><pre class="sk-pre">${esc(text2(d))}</pre>
        <div class="sk-tools"><button type="button" class="btn btn-accent" data-sk-share${ok ? '' : ' disabled'}>Bild und Text teilen</button><button type="button" class="btn btn-ghost" data-sk-save${ok ? '' : ' disabled'}>Bild speichern</button><button type="button" class="btn btn-ghost" data-sk-copy>Text kopieren</button></div>
        ${ok ? '' : '<p class="sk-hint">Zuerst im Schritt „Luftbild“ ein Bild einfügen.</p>'}<p class="w-hint">Das Gesamtbild enthält Luftbild mit Fahrwegen, Nordpfeil, Kollisionsort, Legende und – falls vorhanden – das Foto. Zusammen mit dem Text genügt das, um die Unfallörtlichkeit zu beschreiben.</p></div>`;
    };
    el.addEventListener('click', async e => {
      const d = data(), name = `Unfallskizze ${has(get(d, 'ort.datum')) ? get(d, 'ort.datum') : new Date().toISOString().slice(0, 10)}.jpg`;
      if (e.target.closest('[data-sk-copy]')) { try { await navigator.clipboard.writeText(text2(d)); B().toast('Text kopiert'); } catch (er) { B().toast('Kopieren nicht möglich'); } return; }
      const sh = e.target.closest('[data-sk-share]'), sv = e.target.closest('[data-sk-save]'); if (!sh && !sv) return;
      const blob = await exportImage(d); if (!blob) { B().toast('Bild konnte nicht erzeugt werden.'); return; }
      const file = new File([blob], name, { type: 'image/jpeg' });
      if (sh && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Unfallskizze', text: text2(d) }); } catch (er) { /* abgebrochen */ } return; }
      const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      if (sh) B().toast('Teilen nicht möglich – Bild wurde gespeichert');
    });
    render();
  }

  /* ======================= Text ======================= */
  const LAGE = [['io', 'innerorts'], ['ao', 'außerorts']];
  const VMAX = [['30', '30 km/h'], ['50', '50 km/h'], ['70', '70 km/h'], ['100', '100 km/h'], ['frei', 'ohne Beschränkung'], ['?', 'unbekannt']];
  const REGEL = [['lza', 'Ampel in Betrieb'], ['lzaaus', 'Ampel aus / gelb blinkend'], ['vz', 'Vorfahrt durch Schilder'], ['rvl', 'Rechts vor links'], ['kreisel', 'Kreisverkehr'], ['fgue', 'Fußgängerüberweg'], ['keine', 'keine Kreuzung']];
  const WETTER = [['trocken', 'trocken'], ['regen', 'Regen'], ['nebel', 'Nebel'], ['schnee', 'Schnee / Glätte']];
  const FB = [['trocken', 'trocken'], ['nass', 'nass'], ['glatt', 'glatt'], ['verschm', 'verschmutzt']];
  const LICHT = [['tag', 'Tageslicht'], ['daemm', 'Dämmerung'], ['dunkel', 'Dunkelheit mit Beleuchtung'], ['dunkelohne', 'Dunkelheit ohne Beleuchtung']];
  const lab = (o, v) => (o.find(x => x[0] === v) || [])[1] || '';
  function angaben(d) {
    const o = d.ort || {}, rows = [];
    const add = (l, v) => { if (has(v)) rows.push(`${l}: ${v}`); };
    add('Ort', o.text); add('Datum / Uhrzeit', [fmtDate(o.datum), o.zeit ? o.zeit + ' Uhr' : ''].filter(Boolean).join(', '));
    add('Lage', lab(LAGE, o.lage)); add('Zulässige Höchstgeschwindigkeit', lab(VMAX, o.vmax));
    add('Verkehrsregelung', arr(o.regel).map(v => lab(REGEL, v)).filter(Boolean).join(', '));
    add('Witterung', lab(WETTER, o.wetter)); add('Fahrbahn', lab(FB, o.fahrbahn)); add('Licht', lab(LICHT, o.licht));
    add('Besonderheiten', o.bes);
    return rows;
  }
  function text2(d) {
    const rows = angaben(d), sk = d.sk || {}, fo = d.foto || {};
    return ['Unfallskizze – Angaben zur Unfallörtlichkeit', '', ...rows, '', ...summaryLines(d).map(l => l.txt), '', `Bildmaterial: Luftbild ${sk.img ? 'ja' : 'fehlt'}${fo.img ? ', Foto mit Markierung' + (fo.hit ? '' : ' (Unfallstelle nicht markiert)') : ''}.`].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function text(d) {
    d = d || {};
    return [
      ['1', 'Örtlichkeit', angaben(d).join('\n') || '[Angaben zur Örtlichkeit]', 'angaben'],
      ['2', 'Beteiligte und Fahrwege', summaryLines(d).map(l => l.txt).join('\n'), 'luftbild'],
      ['3', 'Bildmaterial', `Luftbild ${get(d, 'sk.img') ? 'eingefügt' : '[fehlt]'}; Foto ${get(d, 'foto.img') ? 'eingefügt' : 'nicht vorhanden'}.`, 'foto']
    ];
  }
  const plain = d => text2(d || {});
  function offen(d) {
    d = d || {}; const sk = d.sk || {}, out = [];
    if (!sk.img) out.push('Luftbild einfügen');
    if (sk.img && !has(sk.up)) out.push('Kartenausrichtung (oben im Bild) angeben – sonst keine Himmelsrichtungen');
    if (!arr(sk.veh).length) out.push('Mindestens ein Fahrzeug einzeichnen');
    arr(sk.veh).forEach(v => { if (!arr(v.path).length) out.push(`Fahrweg für ${v.n} ${VL[v.t] || ''} wischen`); });
    if (!sk.hit) out.push('Kollisionsort im Luftbild markieren');
    if (!has(get(d, 'ort.text'))) out.push('Ort (Straße, Kreuzung, Gemeinde) angeben');
    if (!has(get(d, 'ort.lage'))) out.push('Innerorts oder außerorts angeben');
    if (!has(get(d, 'ort.vmax'))) out.push('Zulässige Höchstgeschwindigkeit angeben');
    return out;
  }
  const title = d => ['Skizze', get(d || {}, 'ort.text') || null, fmtDate(get(d || {}, 'ort.datum')) || null].filter(Boolean).join(' · ');
  const subtitle = d => { const n = arr(get(d || {}, 'sk.veh')).length; return [n ? `${n} ${n === 1 ? 'Fahrzeug' : 'Fahrzeuge'}` : 'noch keine Fahrzeuge', get(d || {}, 'sk.img') ? 'Luftbild' : ''].filter(Boolean).join(' · '); };
  function preview(stepId, d) { return stepId === 'angaben' ? (angaben(d || {}).join('\n') || '') : summaryLines(d || {}).map(l => l.txt).join('\n'); }

  const STEPS = [
    { id: 'luftbild', phase: 'Luftbild', title: 'Luftbild, Fahrzeuge, Fahrwege', lead: 'Screenshot von oben einfügen, Kartenrichtung wählen, je Fahrzeug den Fahrweg wischen, Kollisionsort antippen.',
      fields: [{ k: 'sk', t: 'custom' }] },
    { id: 'foto', phase: 'Foto', title: 'Foto der Unfallstelle', lead: 'Optional: ein echtes Foto, zum Beispiel aus Sicht eines Beteiligten – mit Markierung der Unfallstelle.',
      fields: [{ k: 'foto', t: 'custom' }, { k: 'foto.blick', t: 'choice', l: 'Blickrichtung des Fotos (optional)', o: UP.map(([k]) => [k, k]) }] },
    { id: 'angaben', phase: 'Angaben', title: 'Angaben zur Örtlichkeit', lead: 'Was das Bild nicht zeigt.',
      fields: [
        { k: 'ort.text', t: 'text', l: 'Ort', ph: 'Gütersloher Straße / Tecklenburger Weg, Herzebrock-Clarholz', req: true, recent: ['ort.text'] },
        { k: 'ort.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' }, { k: 'ort.zeit', t: 'time', l: 'Uhrzeit', w: 'half', q: true },
        { k: 'ort.lage', t: 'choice', l: 'Lage', o: LAGE },
        { k: 'ort.vmax', t: 'choice', l: 'Zulässige Höchstgeschwindigkeit', o: VMAX },
        { k: 'ort.regel', t: 'multi', l: 'Verkehrsregelung', o: REGEL },
        { k: 'ort.wetter', t: 'choice', l: 'Witterung', o: WETTER, w: 'half' }, { k: 'ort.fahrbahn', t: 'choice', l: 'Fahrbahn', o: FB, w: 'half' },
        { k: 'ort.licht', t: 'choice', l: 'Licht', o: LICHT },
        { k: 'ort.bes', t: 'area', rows: 2, l: 'Besonderheiten (optional)', pre: 'Auffällig:', ph: 'Baustelle, Sichtbehinderung durch Hecke, abgefahrene Markierung …' }
      ] },
    { id: 'teilen', phase: 'Teilen', title: 'Bild und Text teilen', lead: 'Ein Gesamtbild mit Legende und der Text dazu – zum Senden oder für den Bericht.',
      fields: [{ k: 'export', t: 'custom' }] }
  ];
  function mount(el, k, data, api) {
    if (k === 'sk') return mountSketch(el, api);
    if (k === 'foto') return mountFoto(el, api);
    if (k === 'export') return mountExport(el, api);
  }

  root.WSKZ = Object.freeze({
    id: 'skizze', name: 'Unfallskizze', short: 'Skizze', kurz: 'SK',
    desc: 'Luftbild mit Fahrzeugen, Fahrwegen und Kollisionsort, Foto, Angaben – als Bild und Text zum Teilen',
    labels: { bericht: 'Zusammenfassung', newBtn: 'Unfallskizze', kurzHint: 'Kurzfassung.', offen: 'Offene Punkte', offenEmpty: 'Skizze vollständig.', persHint: 'Die Skizze enthält keine Personalien.' },
    steps: STEPS, text, plain, preview, kurzText: d => summaryLines(d || {}).map(l => l.txt).join(' '), fahndung: () => '', offen, personalien: () => 'Keine Personalien.', title, subtitle, mount,
    _test: { describe, summaryLines, text2, exportImage }
  });
})(typeof window !== 'undefined' ? window : globalThis);
