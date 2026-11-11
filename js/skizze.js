/*
 * Workoholic · Schreiben · Modul „Unfallskizze“
 * ---------------------------------------------------------------
 * Luftbild (Screenshot von oben) einfügen und im Vollbild-Editor bearbeiten: zoomen und verschieben,
 * Fahrzeuge hinzufügen, an die Kollisionsposition ziehen und drehen, je Fahrzeug „Woher kam es?“
 * (gefahrener Weg, durchgezogen) und „Wohin wollte es?“ (beabsichtigte Fahrtrichtung, gestrichelt mit
 * Pfeil) einzeichnen, Kollisionsort setzen. Optional ein Foto mit Markierung.
 * Daraus entstehen ein Gesamtbild mit Zeichenerklärung und ein Text in Himmelsrichtungen – so, dass auch
 * eine KI eindeutig versteht, wer woher kam und wohin wollte.
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
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r4 = v => Math.round(v * 10000) / 10000;
  const FOLDER = 'Unfallskizzen';

  /* ======================= Stammdaten ======================= */
  const VT = [['pkw', 'Pkw'], ['transp', 'Transporter'], ['lkw', 'Lkw'], ['bus', 'Bus'], ['krad', 'Krad'], ['rad', 'Fahrrad'], ['fuss', 'Fußgänger']];
  const VL = Object.fromEntries(VT);
  const COLORS = ['#ffd23f', '#4dabff', '#ff6b5e', '#7ee081', '#c58cff', '#36d6c3', '#ff9f43', '#f78fb3'];
  const UP = [['N', 'Norden'], ['NO', 'Nordosten'], ['O', 'Osten'], ['SO', 'Südosten'], ['S', 'Süden'], ['SW', 'Südwesten'], ['W', 'Westen'], ['NW', 'Nordwesten']];
  const UPDEG = { N: 0, NO: 45, O: 90, SO: 135, S: 180, SW: 225, W: 270, NW: 315 };
  const DIR8 = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  const SCREEN8 = ['oben', 'oben rechts', 'rechts', 'unten rechts', 'unten', 'unten links', 'links', 'oben links'];
  /* Länge × Breite in „Metern“ (relativ zur Grundeinheit) */
  const DIM = { pkw: [4.6, 1.9], transp: [5.5, 2.1], lkw: [9, 2.5], bus: [12, 2.6], krad: [2.3, 0.85], rad: [1.9, 0.65], fuss: [0.9, 0.9] };

  /* ======================= Geometrie und Richtungen ======================= */
  const norm360 = a => ((a % 360) + 360) % 360;
  /** Bildwinkel (0 = nach oben, im Uhrzeigersinn) eines Vektors in Bildpixeln */
  const screenAngle = (dx, dy) => norm360(Math.atan2(dx, -dy) * 180 / Math.PI);
  const dir8 = deg => Math.round(norm360(deg) / 45) % 8;
  const toPx = (pts, w, h) => arr(pts).map(([x, y]) => [x * w, y * h]);
  function lenPx(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
  /** Richtung am Anfang bzw. Ende eines Linienzugs (Bildpixel), über ~20 % der Länge gemittelt */
  function headPx(p, fromEnd) {
    const L = lenPx(p); if (p.length < 2 || L < 1) return null;
    const q = fromEnd ? p.slice().reverse() : p, take = Math.max(L * 0.2, 1); let acc = 0, i = 1;
    for (; i < q.length && acc < take; i++) acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    const a = q[0], b = q[i - 1];
    return fromEnd ? screenAngle(a[0] - b[0], a[1] - b[1]) : screenAngle(b[0] - a[0], b[1] - a[1]);
  }
  /** Altdaten (v1: ein Fahrweg „path“) in das neue Modell übernehmen */
  function normVeh(v, sk) {
    if (!v || typeof v !== 'object') return null;
    if ('x' in v && 'y' in v) return { n: v.n, t: v.t || 'pkw', x: +v.x || 0.5, y: +v.y || 0.5, rot: norm360(+v.rot || 0), rotSet: !!v.rotSet, pre: arr(v.pre), post: arr(v.post) };
    const p = arr(v.path), w = (sk && sk.w) || 1000, h = (sk && sk.h) || 1000;
    /* mit Kollisionsort: Fahrweg dort teilen → davor = Herkunft, danach = beabsichtigte Richtung */
    if (p.length > 2 && sk && Array.isArray(sk.hit)) {
      let k = 0, best = Infinity; p.forEach(([x, y], i) => { const d = Math.hypot((x - sk.hit[0]) * w, (y - sk.hit[1]) * h); if (d < best) { best = d; k = i; } });
      if (k > 0 && k < p.length - 1) { const pre = p.slice(0, k + 1), post = p.slice(k); return { n: v.n, t: v.t || 'pkw', x: p[k][0], y: p[k][1], rot: Math.round(headPx(toPx(pre, w, h), true) || 0), rotSet: false, pre, post }; }
    }
    const hd = p.length > 1 ? headPx(toPx(p, w, h), false) : null;
    return { n: v.n, t: v.t || 'pkw', x: p.length ? p[0][0] : 0.5, y: p.length ? p[0][1] : 0.5, rot: hd || 0, rotSet: false, pre: [], post: p.length > 1 ? p : [] };
  }
  const vehs = sk => arr(sk && sk.veh).map(v => normVeh(v, sk)).filter(Boolean);

  /** Beschreibung je Fahrzeug: woher, Fahrtrichtung bei der Kollision, beabsichtigte Weiterfahrt */
  function describe(v0, sk) {
    const v = normVeh(v0, sk), w = sk.w || 1000, h = sk.h || 1000;
    const name = `${v.n} ${VL[v.t] || 'Fahrzeug'}`, geht = v.t === 'fuss';
    const upd = has(sk.up) ? UPDEG[sk.up] : null;
    const word = deg => (upd == null ? SCREEN8[dir8(deg)] : DIR8[dir8(deg + upd)]);
    const toT = deg => (upd == null ? `nach ${SCREEN8[dir8(deg)]}` : `in Richtung ${DIR8[dir8(deg + upd)]}`);
    const fromT = deg => (upd == null ? `von ${SCREEN8[dir8(deg + 180)]}` : `aus Richtung ${DIR8[dir8(deg + 180 + upd)]}`);
    const pre = toPx(v.pre, w, h), post = toPx(v.post, w, h), minL = Math.min(w, h) * 0.03;
    const hasPre = pre.length > 1 && lenPx(pre) >= minL, hasPost = post.length > 1 && lenPx(post) >= minL;
    const dirNow = hasPre ? headPx(pre, true) : v.rot;      // Fahrtrichtung bei der Kollision
    const parts = [];
    if (hasPre) parts.push(`kam ${fromT(headPx(pre, false))} (${geht ? 'Gehrichtung' : 'Fahrtrichtung'} ${word(dirNow)})`);
    else parts.push(`${geht ? 'stand' : 'stand bzw. fuhr'} mit ${geht ? 'Blick' : 'Front'} ${toT(dirNow)} (Herkunft nicht eingezeichnet)`);
    if (hasPost) {
      const end = headPx(post, true); let d = norm360(end - dirNow); if (d > 180) d -= 360;
      if (geht) parts.push(`wollte ${toT(end)} gehen`);
      else if (Math.abs(d) < 35) parts.push(`beabsichtigte, geradeaus ${toT(end)} weiterzufahren`);
      else if (Math.abs(d) >= 150) parts.push('beabsichtigte zu wenden');
      else parts.push(`beabsichtigte, nach ${d > 0 ? 'rechts' : 'links'} ${upd == null ? '' : toT(end) + ' '}abzubiegen`.replace(/\s+abzubiegen/, ' abzubiegen'));
    } else parts.push('beabsichtigte Fahrtrichtung nicht eingezeichnet');
    return { name, txt: parts.join(' und '), ok: hasPre || hasPost, pre: hasPre, post: hasPost };
  }

  /* ======================= Bilder (verschlüsselte Ablage) ======================= */
  const imgs = new Map();
  function imgFor(id) {
    if (!id) return Promise.resolve(null);
    if (imgs.has(id)) return imgs.get(id);
    const p = (async () => {
      const blob = await B().fileBlob(id); if (!blob) return null;
      const img = new Image(); img.decoding = 'async'; img.src = URL.createObjectURL(blob);
      await img.decode().catch(() => new Promise(r => { img.onload = r; img.onerror = r; }));
      return img;
    })();
    imgs.set(id, p);
    return p;
  }
  /** Bild verkleinern (lange Seite max. 2400 px) und als JPEG verschlüsselt ablegen */
  async function importImage(file, label) {
    const src = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = src;
      await img.decode();
      const sc = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
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

  /* ======================= Zeichnen (in Bildpixeln) ======================= */
  const unit = sk => Math.min(sk.w || 1000, sk.h || 1000) / 100 * 1.15 * (+sk.vs || 1);
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawMarker(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 1.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2d2d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.26); ctx.lineCap = 'round';
    const q = r * 0.45; ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke();
    ctx.restore();
  }
  function arrowHead(ctx, x, y, ang, L, col, lw) {
    ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * L * 0.35, y + Math.sin(ang) * L * 0.35); ctx.lineTo(x - Math.cos(ang - 0.5) * L, y - Math.sin(ang - 0.5) * L); ctx.lineTo(x - Math.cos(ang + 0.5) * L, y - Math.sin(ang + 0.5) * L); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
  function strokePath(ctx, p, col, lw, dash) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); p.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = lw * 1.8; ctx.setLineDash(dash ? dash.map(d => d) : []); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
  }
  /** Linienzug-Punkt in einer bestimmten Entfernung vom Anfang (für Richtungspfeile entlang der Herkunftslinie) */
  function along(p, dist) { let acc = 0; for (let i = 1; i < p.length; i++) { const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + L >= dist) { const t = (dist - acc) / L; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t, Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0])]; } acc += L; } return null; }
  /** Fahrzeugmaße in Bildpixeln */
  function vehBox(v, sk) { const u = unit(sk), [l, b] = DIM[v.t] || DIM.pkw; return v.t === 'fuss' ? [u * 1.7, u * 1.7] : [l * u, b * u]; }
  /**
   * Szene zeichnen; ctx ist auf Bildpixel transformiert. opt.px = Bildpixel je Bildschirmpixel (für gleich große Bedienelemente),
   * opt.sel = gewähltes Fahrzeug (Griffe), opt.live = Linie, die gerade gezeichnet wird.
   */
  function paint(ctx, sk, img, opt = {}) {
    const w = sk.w || 1000, h = sk.h || 1000, u = unit(sk), px = opt.px || 0;
    if (img) ctx.drawImage(img, 0, 0, w, h); else { ctx.fillStyle = '#1b1b1d'; ctx.fillRect(0, 0, w, h); }
    const lw = Math.max(u * 0.55, px * 3);
    const V = vehs(sk);
    V.forEach((v, i) => {
      const col = COLORS[i % COLORS.length], c = [v.x * w, v.y * h];
      const pre = toPx(v.pre, w, h), post = toPx(v.post, w, h);
      if (pre.length > 1) {
        strokePath(ctx, pre, col, lw);
        const L = lenPx(pre), step = Math.max(u * 6, px * 46);
        for (let d = step * 0.6; d < L - u * 3; d += step) { const a = along(pre, d); if (a) arrowHead(ctx, a[0], a[1], a[2], Math.max(u * 1.6, px * 11), col, Math.max(u * 0.18, px)); }
        ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = Math.max(u * 0.2, px); ctx.beginPath(); ctx.arc(pre[0][0], pre[0][1], Math.max(u * 0.9, px * 6), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      if (post.length > 1) {
        const dsh = Math.max(u * 1.6, px * 10);
        strokePath(ctx, post, col, lw, [dsh, dsh * 0.7]);
        const [x2, y2] = post[post.length - 1]; let k = post.length - 2; while (k > 0 && Math.hypot(x2 - post[k][0], y2 - post[k][1]) < u * 2) k--;
        arrowHead(ctx, x2, y2, Math.atan2(y2 - post[k][1], x2 - post[k][0]), Math.max(u * 3.2, px * 20), col, Math.max(u * 0.3, px * 1.5));
      }
      /* Fahrzeug: Front zeigt in Richtung rot (0 = oben) */
      const [L, Bw] = vehBox(v, sk);
      ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(v.rot * Math.PI / 180);
      ctx.fillStyle = col; ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1, u * 0.28);
      if (v.t === 'fuss') { ctx.beginPath(); ctx.arc(0, 0, L / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(0, -L / 2 - u * 0.6); ctx.lineTo(u * 0.5, -L / 2 + u * 0.2); ctx.lineTo(-u * 0.5, -L / 2 + u * 0.2); ctx.closePath(); ctx.fill(); }
      else {
        roundRect(ctx, -Bw / 2, -L / 2, Bw, L, Math.min(Bw * 0.3, u * 0.6)); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-Bw * 0.36, -L * 0.32, Bw * 0.72, L * 0.12);   // Frontscheibe
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -L / 2 - u * 0.9); ctx.lineTo(Bw * 0.28, -L / 2 + u * 0.1); ctx.lineTo(-Bw * 0.28, -L / 2 + u * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      /* Nummer als Plakette, immer lesbar */
      const r = Math.max(u * 1.6, px * 12), bx = c[0] + Math.max(L, Bw) * 0.55 + r * 0.6, by = c[1] - r * 1.1;
      ctx.save(); ctx.fillStyle = '#111'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(u * 0.35, px * 2.5);
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.05)}px system-ui, -apple-system, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.n, bx, by + r * 0.05);
      ctx.restore();
    });
    if (opt.live && opt.live.pts.length > 1) strokePath(ctx, opt.live.pts, '#ffffff', lw, opt.live.kind === 'post' ? [u * 1.6, u * 1.1] : null);
    if (sk.hit) drawMarker(ctx, sk.hit[0] * w, sk.hit[1] * h, Math.max(u * 2, px * 14));
    /* Auswahl: Rahmen und Drehgriff obenauf (nur im Editor) */
    const v = opt.sel >= 0 ? V[opt.sel] : null;
    if (v && px) {
      const [L, Bw] = vehBox(v, sk), m = px * 8, hy = -L / 2 - m - px * 30;
      ctx.save(); ctx.translate(v.x * w, v.y * h); ctx.rotate(v.rot * Math.PI / 180);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = px * 4; ctx.strokeRect(-Bw / 2 - m, -L / 2 - m, Bw + 2 * m, L + 2 * m);
      ctx.setLineDash([px * 5, px * 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = px * 2; ctx.strokeRect(-Bw / 2 - m, -L / 2 - m, Bw + 2 * m, L + 2 * m); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, -L / 2 - m); ctx.lineTo(0, hy); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = px * 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = px * 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = px * 2; ctx.beginPath(); ctx.arc(0, hy, px * 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, hy, px * 6.5, -2.4, 1.4); ctx.stroke();
      const ax = Math.cos(1.4) * px * 6.5, ay = hy + Math.sin(1.4) * px * 6.5; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(ax + px * 3.5, ay - px * 1.5); ctx.lineTo(ax - px * 3, ay - px * 2.5); ctx.lineTo(ax, ay + px * 3.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  /** Nordpfeil (in Bildschirm- bzw. Exportpixeln) */
  function drawNorth(ctx, cx, cy, R, up) {
    const a = -UPDEG[up] * Math.PI / 180;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = '#d11'; ctx.beginPath(); ctx.moveTo(0, -R * 0.78); ctx.lineTo(R * 0.3, R * 0.1); ctx.lineTo(-R * 0.3, R * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(0, R * 0.62); ctx.lineTo(R * 0.24, R * 0.1); ctx.lineTo(-R * 0.24, R * 0.1); ctx.closePath(); ctx.fill();
    ctx.rotate(-a); const ny = -Math.cos(a) * R * 1.4, nx = Math.sin(a) * R * 1.4;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = R * 0.12; ctx.font = `800 ${Math.round(R * 0.72)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('N', nx, ny); ctx.fillText('N', nx, ny);
    ctx.restore();
  }

  /* ======================= Schritt „Luftbild“: Vorschau + Vollbild-Editor ======================= */
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  const normSk = s => { const sk = clone(s); sk.veh = vehs(sk); return sk; };
  function fitBox(cw, ratio) { const maxH = Math.max(260, Math.round((root.innerHeight || 800) * 0.6)); let W = Math.round(cw), H = Math.round(W * ratio); if (H > maxH) { H = maxH; W = Math.round(H / ratio); } return [W, H]; }
  function mountSketch(el, api) {
    let sk = normSk(api.get('sk'));
    const save = () => api.set('sk', clone(sk));
    function sumHtml() { return `<ul class="sk-sum">${sk.veh.map((v, i) => { const s = describe(v, sk); return `<li style="--c:${COLORS[i % COLORS.length]}"><b>${esc(s.name)}</b> ${esc(s.txt)}</li>`; }).join('')}${sk.hit ? '<li class="sk-sum-hit"><b>Kollisionsort</b> im Bild rot markiert</li>' : ''}</ul>`; }
    function render() {
      if (!sk.img) { el.innerHTML = `<div class="sk"><label class="sk-drop"><input type="file" accept="image/*" data-sk-file hidden><span class="sk-drop-i" aria-hidden="true">+</span><b>Luftbild einfügen</b><span>Screenshot aus der Karten-App, von oben (2D), Unfallstelle möglichst mittig. Den Kompass sichtbar lassen.</span></label></div>`; return; }
      el.innerHTML = `<div class="sk"><div class="sk-sec"><span class="w-lbl">Oben im Bild ist … <small>(Buchstabe am Kompass der Karten-App)</small></span><div class="w-chips sk-up">${UP.map(([k, l]) => `<button type="button" class="chip" data-sk-up="${k}" aria-pressed="${sk.up === k}" title="${l}">${k}</button>`).join('')}</div></div>
        <button type="button" class="sk-prev" data-sk-edit aria-label="Skizze im Vollbild bearbeiten"><canvas class="sk-cv"></canvas><span class="sk-prev-b">Skizze bearbeiten · Vollbild</span></button>
        ${sk.veh.length ? sumHtml() : '<p class="sk-hint">Noch keine Fahrzeuge – „Skizze bearbeiten“ öffnen, dort „+ Fahrzeug“.</p>'}
        <div class="sk-tools"><button type="button" class="btn btn-accent" data-sk-edit>Skizze bearbeiten</button><label class="btn btn-ghost btn-sm sk-replace"><input type="file" accept="image/*" data-sk-file hidden>Anderes Luftbild</label></div></div>`;
      const cv = el.querySelector('.sk-cv'), ctx = cv.getContext('2d');
      const [W, H] = fitBox((el.clientWidth || 320) - 2, sk.h / sk.w), dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      imgFor(sk.img).then(img => { const k = cv.width / sk.w; ctx.setTransform(k, 0, 0, k, 0, 0); paint(ctx, sk, img, { px: 1 / k }); ctx.setTransform(1, 0, 0, 1, 0, 0); if (has(sk.up)) drawNorth(ctx, cv.width - 42 * dpr, 34 * dpr, 16 * dpr, sk.up); });
    }
    el.addEventListener('change', async e => { const f = e.target.closest('[data-sk-file]'); if (!f || !f.files[0]) return; const r = await importImage(f.files[0], 'Luftbild'); if (!r) return; sk.img = r.id; sk.w = r.w; sk.h = r.h; save(); render(); });
    el.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.dataset.skUp) { sk.up = sk.up === t.dataset.skUp ? '' : t.dataset.skUp; save(); render(); return; }
      if (t.hasAttribute('data-sk-edit')) openEditor(sk, next => { sk = next; save(); }, () => render());
    });
    let rw = el.clientWidth; const ro = new ResizeObserver(() => { if (!el.isConnected) { ro.disconnect(); return; } if (Math.abs(el.clientWidth - rw) > 4) { rw = el.clientWidth; render(); } }); ro.observe(el);
    render();
  }

  /* ----------------------- Vollbild-Editor ----------------------- */
  const HINTS = {
    none: 'Fahrzeug antippen = bearbeiten · zwei Finger = zoomen',
    sel: 'Ziehen = verschieben · weißer Griff = drehen',
    pre: 'Woher kam es? Gefahrenen Weg bis zum Fahrzeug ziehen',
    post: 'Wohin wollte es? Vom Fahrzeug aus in die Richtung ziehen',
    hit: 'Kollisionsstelle antippen',
    pick: 'Welches Fahrzeug?'
  };
  function openEditor(sk0, onChange, onClose) {
    let sk = normSk(sk0);
    const ui = { mode: 'none', sel: -1, undo: [] };
    const V = { s: 1, ox: 0, oy: 0, fit: 1 };
    const w = sk.w, h = sk.h;
    const ov = document.createElement('div'); ov.className = 'skx'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Skizze bearbeiten');
    ov.innerHTML = `<div class="skx-top"><button type="button" class="btn btn-ghost btn-sm" data-x="undo" disabled>Rückgängig</button><span class="grow"></span><div class="skx-zoom" role="group" aria-label="Zoom"><button type="button" data-x="zout" aria-label="Verkleinern">−</button><button type="button" data-x="zfit" aria-label="Ganzes Bild">Ganz</button><button type="button" data-x="zin" aria-label="Vergrößern">+</button></div><button type="button" class="btn btn-accent btn-sm" data-x="done">Fertig</button></div>
      <div class="skx-stage"><canvas></canvas><p class="skx-hint"></p></div><div class="skx-bar"></div>`;
    document.body.appendChild(ov); document.body.classList.add('skx-open');
    const stage = ov.querySelector('.skx-stage'), cv = stage.querySelector('canvas'), ctx = cv.getContext('2d'), bar = ov.querySelector('.skx-bar'), hint = ov.querySelector('.skx-hint');
    let img = null; imgFor(sk.img).then(i => { img = i; draw(); });
    let cssW = 0, cssH = 0, dpr = 1;
    const commit = () => onChange(clone(sk));
    const snap = () => { ui.undo.push(JSON.stringify(sk)); if (ui.undo.length > 60) ui.undo.shift(); };
    function sizeCanvas(refit) {
      const r = stage.getBoundingClientRect(); cssW = r.width; cssH = r.height; dpr = Math.min(2, root.devicePixelRatio || 1);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      const fit = Math.min(cssW / w, cssH / h);
      if (refit || !V.fit) { V.s = fit; V.ox = (cssW - w * fit) / 2; V.oy = (cssH - h * fit) / 2; }
      V.fit = fit; clampPan(); draw();
    }
    function clampPan() { const iw = w * V.s, ih = h * V.s, m = 80; V.ox = clamp(V.ox, Math.min(m - iw, (cssW - iw) / 2), Math.max(cssW - m, (cssW - iw) / 2)); V.oy = clamp(V.oy, Math.min(m - ih, (cssH - ih) / 2), Math.max(cssH - m, (cssH - ih) / 2)); }
    function zoomAt(f, cx, cy) { const ns = clamp(V.s * f, V.fit * 0.8, V.fit * 12), k = ns / V.s; V.ox = cx - (cx - V.ox) * k; V.oy = cy - (cy - V.oy) * k; V.s = ns; clampPan(); draw(); }
    let live = null;
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0c0c0d'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * V.s, 0, 0, dpr * V.s, dpr * V.ox, dpr * V.oy);
      paint(ctx, sk, img, { px: 1 / V.s, sel: ui.sel, live });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (has(sk.up)) drawNorth(ctx, cv.width - 46 * dpr, 40 * dpr, 18 * dpr, sk.up);
    }
    const toImg = (cx, cy) => [(cx - V.ox) / V.s, (cy - V.oy) / V.s];
    const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    /* Trefferprüfung in Bildpixeln */
    function vehAt(p) {
      for (let i = sk.veh.length - 1; i >= 0; i--) {
        const v = sk.veh[i], [L, Bw] = vehBox(v, sk), a = -v.rot * Math.PI / 180, dx = p[0] - v.x * w, dy = p[1] - v.y * h;
        const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a), m = 14 / V.s;
        if (Math.abs(lx) <= Bw / 2 + m && Math.abs(ly) <= L / 2 + m) return i;
      }
      return -1;
    }
    function onRotHandle(p) {
      if (ui.sel < 0) return false; const v = sk.veh[ui.sel], [L] = vehBox(v, sk), a = v.rot * Math.PI / 180, dist = L / 2 + 8 / V.s + 30 / V.s;
      const hx = v.x * w + Math.sin(a) * dist, hy = v.y * h - Math.cos(a) * dist;
      return Math.hypot(p[0] - hx, p[1] - hy) <= 22 / V.s;
    }
    const onMarker = p => sk.hit && Math.hypot(p[0] - sk.hit[0] * w, p[1] - sk.hit[1] * h) <= Math.max(unit(sk) * 2, 16 / V.s) + 8 / V.s;
    function simplify(p) {
      const eps = Math.max(w, h) * 0.003, out = [p[0]];
      for (const q of p.slice(1)) { const l = out[out.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= eps) out.push(q); }
      if (out.length > 1 && out[out.length - 1] !== p[p.length - 1]) out.push(p[p.length - 1]);
      const st = Math.ceil(out.length / 80); return out.filter((_, i) => i % st === 0 || i === out.length - 1).map(([x, y]) => [r4(x / w), r4(y / h)]);
    }
    function finishLine(kind, pts) {
      const v = sk.veh[ui.sel], c = [v.x * w, v.y * h];
      if (pts.length < 2 || lenPx(pts) < 24 / V.s) { B().toast('Linie zu kurz – etwas länger ziehen.'); return; }
      let p = pts.slice();
      const dS = Math.hypot(p[0][0] - c[0], p[0][1] - c[1]), dE = Math.hypot(p[p.length - 1][0] - c[0], p[p.length - 1][1] - c[1]);
      if (kind === 'pre' ? dS < dE : dE < dS) p.reverse();
      /* am fahrzeugnächsten Punkt abschneiden – falls über das Fahrzeug hinaus gezogen wurde */
      let k = 0, best = Infinity; p.forEach((q, i) => { const dd = Math.hypot(q[0] - c[0], q[1] - c[1]); if (dd < best) { best = dd; k = i; } });
      p = kind === 'pre' ? p.slice(0, k + 1) : p.slice(k);
      if (kind === 'pre') p.push(c); else p.unshift(c);
      if (lenPx(p) < 24 / V.s) { B().toast('Linie zu kurz – etwas länger ziehen.'); return; }
      snap();
      if (kind === 'pre') { v.pre = simplify(p); if (!v.rotSet) v.rot = Math.round(headPx(p, true)); }
      else { v.post = simplify(p); if (!v.rotSet && !arr(v.pre).length) v.rot = Math.round(headPx(p, false)); }
      commit();
    }
    function barHtml() {
      if (ui.mode === 'pick') return `<div class="skx-row">${VT.map(([k, l]) => `<button type="button" class="chip" data-x="type" data-t="${k}">${l}</button>`).join('')}<button type="button" class="btn btn-ghost btn-sm" data-x="cancel">Abbrechen</button></div>`;
      if (ui.mode === 'pre' || ui.mode === 'post' || ui.mode === 'hit') return `<div class="skx-row"><button type="button" class="btn btn-ghost btn-sm" data-x="cancel">Abbrechen</button></div>`;
      if (ui.sel >= 0) {
        const v = sk.veh[ui.sel], col = COLORS[ui.sel % COLORS.length];
        const hp = arr(v.pre).length, hq = arr(v.post).length;
        return `<div class="skx-row"><span class="skx-name" style="--c:${col}"><i></i>${esc(v.n)} ${esc(VL[v.t] || '')}</span><span class="grow"></span><button type="button" class="btn btn-ghost btn-sm" data-x="rotl" aria-label="15 Grad nach links drehen">⟲ 15°</button><button type="button" class="btn btn-ghost btn-sm" data-x="rotr" aria-label="15 Grad nach rechts drehen">⟳ 15°</button><button type="button" class="btn btn-light btn-sm" data-x="desel">Fertig</button></div>
          <div class="skx-row skx-two"><button type="button" class="skx-b skx-pre${hp ? ' on' : ''}" data-x="pre" style="--c:${col}"><b>Woher kam es?</b><small>${hp ? '✓ neu zeichnen' : 'gefahrener Weg'}</small></button><button type="button" class="skx-b skx-post${hq ? ' on' : ''}" data-x="post" style="--c:${col}"><b>Wohin wollte es?</b><small>${hq ? '✓ neu zeichnen' : 'beabsichtigte Richtung'}</small></button></div>
          <div class="skx-row">${hp || hq ? '<button type="button" class="btn btn-ghost btn-sm" data-x="clr">Linien löschen</button>' : ''}<button type="button" class="btn btn-ghost btn-sm btn-danger" data-x="del">Fahrzeug entfernen</button></div>`;
      }
      return `<div class="skx-row"><button type="button" class="btn btn-accent btn-sm" data-x="add">+ Fahrzeug</button><button type="button" class="btn btn-ghost btn-sm skx-hitb" data-x="hit">${sk.hit ? 'Kollisionsort neu' : 'Kollisionsort'}</button><span class="grow"></span><span class="skx-size">Größe <button type="button" data-x="vs-" aria-label="Fahrzeuge kleiner">−</button><button type="button" data-x="vs+" aria-label="Fahrzeuge größer">+</button></span></div>
        ${sk.veh.length ? `<div class="skx-row skx-vs">${sk.veh.map((v, i) => `<button type="button" class="skx-v" data-x="sel" data-i="${i}" style="--c:${COLORS[i % COLORS.length]}"><i></i>${esc(v.n)} ${esc(VL[v.t] || '')}</button>`).join('')}</div>` : ''}`;
    }
    function updateUi() {
      bar.innerHTML = barHtml();
      hint.textContent = HINTS[ui.mode !== 'none' ? ui.mode : ui.sel >= 0 ? 'sel' : 'none'];
      stage.dataset.mode = ui.mode;
      ov.querySelector('[data-x="undo"]').disabled = !ui.undo.length;
      draw();
    }
    /* Gesten: ein Finger = Werkzeug/Fahrzeug/Verschieben, zwei Finger = Zoom und Verschieben */
    const P = new Map(); let G = null;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* synthetischer Zeiger */ }
      const s = local(e); P.set(e.pointerId, s);
      if (P.size === 2) { if (G && G.moved && /^(move|rot|hit)$/.test(G.k)) commit(); const [a, b] = [...P.values()]; live = null; G = { k: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s0: V.s, ox0: V.ox, oy0: V.oy }; draw(); return; }
      if (P.size > 2) return;
      const p = toImg(s[0], s[1]);
      if (ui.mode === 'pre' || ui.mode === 'post') { live = { kind: ui.mode, pts: [p] }; G = { k: 'draw' }; draw(); return; }
      if (ui.mode === 'hit') { snap(); sk.hit = [r4(p[0] / w), r4(p[1] / h)]; ui.mode = 'none'; commit(); updateUi(); G = null; return; }
      if (ui.mode === 'pick') return;
      if (onRotHandle(p)) { snap(); G = { k: 'rot' }; return; }
      const vi = vehAt(p);
      if (vi >= 0) { const v = sk.veh[vi]; const was = ui.sel; ui.sel = vi; snap(); G = { k: 'move', dx: p[0] - v.x * w, dy: p[1] - v.y * h, moved: false, sel: was !== vi }; if (was !== vi) updateUi(); return; }
      if (onMarker(p)) { snap(); G = { k: 'hit', moved: false }; return; }
      G = { k: 'pan', s0: s, ox0: V.ox, oy0: V.oy, moved: false };
    });
    cv.addEventListener('pointermove', e => {
      if (!P.has(e.pointerId)) return; e.preventDefault();
      const s = local(e); P.set(e.pointerId, s); if (!G) return;
      if (G.k === 'pinch' && P.size >= 2) { const [a, b] = [...P.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const ns = clamp(G.s0 * d / G.d0, V.fit * 0.8, V.fit * 12), k = ns / G.s0; V.s = ns; V.ox = m[0] - (G.m0[0] - G.ox0) * k; V.oy = m[1] - (G.m0[1] - G.oy0) * k; clampPan(); draw(); return; }
      const p = toImg(s[0], s[1]);
      if (G.k === 'draw') { const l = live.pts[live.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) * V.s > 3) { live.pts.push(p); draw(); } return; }
      if (G.k === 'move') { const v = sk.veh[ui.sel]; const nx = clamp((p[0] - G.dx) / w, 0, 1), ny = clamp((p[1] - G.dy) / h, 0, 1); if (!G.moved && Math.hypot((nx - v.x) * w, (ny - v.y) * h) * V.s < 3) return; G.moved = true; const ddx = nx - v.x, ddy = ny - v.y; v.x = r4(nx); v.y = r4(ny); v.pre = arr(v.pre).map(([x, y], i, a) => (i === a.length - 1 ? [r4(x + ddx), r4(y + ddy)] : [x, y])); v.post = arr(v.post).map(([x, y], i) => (i === 0 ? [r4(x + ddx), r4(y + ddy)] : [x, y])); draw(); return; }
      if (G.k === 'rot') { const v = sk.veh[ui.sel]; v.rot = Math.round(screenAngle(p[0] - v.x * w, p[1] - v.y * h)); v.rotSet = true; G.moved = true; draw(); return; }
      if (G.k === 'hit') { sk.hit = [r4(clamp(p[0] / w, 0, 1)), r4(clamp(p[1] / h, 0, 1))]; G.moved = true; draw(); return; }
      if (G.k === 'pan') { const dx = s[0] - G.s0[0], dy = s[1] - G.s0[1]; if (!G.moved && Math.hypot(dx, dy) < 4) return; G.moved = true; V.ox = G.ox0 + dx; V.oy = G.oy0 + dy; clampPan(); draw(); }
    });
    const up = e => {
      if (!P.has(e.pointerId)) return; P.delete(e.pointerId);
      if (!G) return;
      if (G.k === 'pinch') { if (!P.size) G = null; return; }
      if (G.k === 'draw') { const pts = live ? live.pts : []; const kind = ui.mode; live = null; ui.mode = 'none'; G = null; finishLine(kind, pts); updateUi(); return; }
      if (G.k === 'move') { if (G.moved) commit(); else ui.undo.pop(); G = null; updateUi(); return; }
      if (G.k === 'rot' || G.k === 'hit') { if (G.moved) commit(); else ui.undo.pop(); G = null; updateUi(); return; }
      if (G.k === 'pan') { if (!G.moved && ui.sel >= 0) { ui.sel = -1; updateUi(); } G = null; }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { live = null; up(e); draw(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); const s = local(e), dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; zoomAt(Math.exp(clamp(-dy, -120, 120) * 0.0022), s[0], s[1]); }, { passive: false });
    ov.addEventListener('gesturestart', e => e.preventDefault());
    let closed = false;
    const close = () => { if (closed) return; closed = true; ro.disconnect(); mo.disconnect(); document.removeEventListener('keydown', onKey, true); ov.remove(); document.body.classList.remove('skx-open'); onClose(); };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (ui.mode !== 'none' || ui.sel >= 0) { ui.mode = 'none'; ui.sel = -1; live = null; updateUi(); } else close(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && ui.sel >= 0 && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); act('del'); }
    };
    document.addEventListener('keydown', onKey, true);
    /* Tresor gesperrt → Editor schließen (nichts bleibt offen sichtbar) */
    const mo = new MutationObserver(() => { if (document.body.classList.contains('locked')) close(); }); mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    function act(x, t) {
      const v = ui.sel >= 0 ? sk.veh[ui.sel] : null;
      switch (x) {
        case 'done': close(); return;
        case 'undo': { const s = ui.undo.pop(); if (s) { sk = JSON.parse(s); ui.sel = Math.min(ui.sel, sk.veh.length - 1); ui.mode = 'none'; commit(); } break; }
        case 'zin': zoomAt(1.5, cssW / 2, cssH / 2); return;
        case 'zout': zoomAt(1 / 1.5, cssW / 2, cssH / 2); return;
        case 'zfit': V.s = V.fit; V.ox = (cssW - w * V.fit) / 2; V.oy = (cssH - h * V.fit) / 2; draw(); return;
        case 'add': ui.mode = 'pick'; ui.sel = -1; break;
        case 'cancel': ui.mode = 'none'; live = null; break;
        case 'type': {
          snap(); const c = toImg(cssW / 2, cssH / 2);
          sk.veh.push({ n: pad(sk.veh.length + 1), t: t.dataset.t, x: r4(clamp(c[0] / w, 0.02, 0.98)), y: r4(clamp(c[1] / h, 0.02, 0.98)), rot: 0, rotSet: false, pre: [], post: [] });
          ui.sel = sk.veh.length - 1; ui.mode = 'none'; commit();
          B().toast(`${pad(sk.veh.length)} ${VL[t.dataset.t]}: an die Kollisionsposition ziehen, am Griff drehen`);
          break;
        }
        case 'sel': ui.sel = +t.dataset.i; ui.mode = 'none'; break;
        case 'desel': ui.sel = -1; break;
        case 'pre': case 'post': ui.mode = x; break;
        case 'hit': ui.mode = 'hit'; ui.sel = -1; break;
        case 'rotl': case 'rotr': if (v) { snap(); v.rot = norm360(Math.round(v.rot / 15) * 15 + (x === 'rotl' ? -15 : 15)); v.rotSet = true; commit(); } break;
        case 'clr': if (v) { snap(); v.pre = []; v.post = []; commit(); } break;
        case 'del': if (v) { snap(); sk.veh.splice(ui.sel, 1); sk.veh.forEach((q, i) => { q.n = pad(i + 1); }); ui.sel = -1; commit(); } break;
        case 'vs-': case 'vs+': snap(); sk.vs = Math.round(clamp((+sk.vs || 1) * (x === 'vs+' ? 1.2 : 1 / 1.2), 0.4, 3) * 100) / 100; commit(); break;
        default: return;
      }
      updateUi();
    }
    ov.addEventListener('click', e => { const t = e.target.closest('[data-x]'); if (t && ov.contains(t)) act(t.dataset.x, t); });
    const ro = new ResizeObserver(() => sizeCanvas(false)); ro.observe(stage);
    sizeCanvas(true); updateUi();
    const api = { close, state: () => ({ sk, ui, V }) }; ov._skx = api;
    return api;
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
        cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); fo.hit = [r4((e.clientX - r.left) / r.width), r4((e.clientY - r.top) / r.height)]; save(); render(); });
      }
    }
    function layout() { if (!cv) return; const [W, H] = fitBox(cv.parentElement.clientWidth || 320, fo.h && fo.w ? fo.h / fo.w : 0.75), dpr = Math.min(2, root.devicePixelRatio || 1); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw(); }
    function draw() { if (!ctx) return; if (img) ctx.drawImage(img, 0, 0, cv.width, cv.height); if (fo.hit) drawMarker(ctx, fo.hit[0] * cv.width, fo.hit[1] * cv.height, Math.max(cv.width, cv.height) / 100 * 2.1); }
    el.addEventListener('change', async e => { const f = e.target.closest('[data-sk-file]'); if (!f || !f.files[0]) return; const r = await importImage(f.files[0], 'Foto'); if (!r) return; fo = { ...fo, img: r.id, w: r.w, h: r.h, hit: null }; img = null; save(); render(); });
    el.addEventListener('click', e => { if (e.target.closest('[data-fo-clear]')) { fo.hit = null; save(); render(); } });
    let rz = 0; const ro = new ResizeObserver(() => { if (!el.isConnected) { ro.disconnect(); return; } cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); }); ro.observe(el);
    render();
  }

  /* ======================= Export: ein Bild mit Zeichenerklärung + Text ======================= */
  function wrap(ctx, text, maxW) { const words = String(text).split(/\s+/), lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }
  const KEY = 'Zeichenerklärung: Fahrzeugsymbol = Position bei der Kollision, weiße Spitze = Fahrzeugfront. Durchgezogene Linie mit Pfeilen = gefahrener Weg (woher das Fahrzeug kam). Gestrichelte Linie mit Pfeilspitze = beabsichtigte Fahrtrichtung (wohin es wollte). Roter Kreis mit Kreuz = Kollisionsort.';
  async function exportImage(data) {
    const sk = normSk(data.sk || {}), fo = data.foto || {};
    const aImg = await imgFor(sk.img), fImg = fo.img ? await imgFor(fo.img) : null;
    const W = Math.min(1600, Math.max(900, sk.w || 1200));
    const hA = aImg ? Math.round(W * (sk.h / sk.w)) : 0, hF = fImg ? Math.round(W * (fo.h / fo.w)) : 0;
    const lines = summaryLines(data), p0 = Math.round(W * 0.03), fs = Math.round(W * 0.021);
    const m = document.createElement('canvas').getContext('2d');
    m.font = `500 ${fs}px system-ui, sans-serif`;
    const wrapped = lines.map(l => wrap(m, l.txt, W - p0 * 2 - fs * 1.6));
    const keyLines = wrap(m, KEY, W - p0 * 2);
    const tf = Math.round(fs * 1.25); m.font = `700 ${tf}px system-ui, sans-serif`;
    const tLines = wrap(m, ['Unfallskizze', get(data, 'ort.text'), fmtDate(get(data, 'ort.datum'))].filter(has).join(' · '), W - p0 * 2);
    const headH = Math.round(p0 * 1.2 + tLines.length * tf * 1.3);
    const keyH = Math.round(fs * 2.4 + fs * 1.6 + keyLines.length * fs * 1.35 + p0 * 0.6);
    const legendH = Math.round(p0 + fs * 1.8 + wrapped.reduce((n, l) => n + l.length, 0) * fs * 1.4 + p0 * 0.6);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Math.round(headH + hA + keyH + legendH + (hF ? hF + fs * 2.6 : 0));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, cv.height);
    ctx.fillStyle = '#111'; ctx.font = `700 ${tf}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
    tLines.forEach((t, i) => ctx.fillText(t, p0, p0 * 0.6 + tf * 0.65 + i * tf * 1.3));
    let y = headH;
    if (aImg) { const k = W / sk.w; ctx.save(); ctx.translate(0, y); ctx.scale(k, k); paint(ctx, sk, aImg, { px: 1 / k }); ctx.restore(); if (has(sk.up)) drawNorth(ctx, W - W * 0.07, y + W * 0.07, W * 0.04, sk.up); y += hA; }
    /* Zeichenerklärung mit Mustern */
    y += fs * 1.2; const sx = p0, sw = W * 0.13, cy = y;
    ctx.save(); ctx.strokeStyle = '#333'; ctx.lineWidth = fs * 0.32; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + sw, cy); ctx.stroke(); arrowHead(ctx, sx + sw * 0.55, cy, 0, fs * 0.9, '#333', 1); ctx.restore();
    ctx.fillStyle = '#111'; ctx.font = `500 ${fs}px system-ui, sans-serif`; ctx.fillText('gefahrener Weg', sx + sw + fs * 0.5, cy);
    const sx2 = W * 0.42;
    ctx.save(); ctx.strokeStyle = '#333'; ctx.lineWidth = fs * 0.32; ctx.lineCap = 'round'; ctx.setLineDash([fs * 0.7, fs * 0.5]); ctx.beginPath(); ctx.moveTo(sx2, cy); ctx.lineTo(sx2 + sw, cy); ctx.stroke(); ctx.setLineDash([]); arrowHead(ctx, sx2 + sw, cy, 0, fs * 1.2, '#333', 1); ctx.restore();
    ctx.fillStyle = '#111'; ctx.fillText('beabsichtigte Richtung', sx2 + sw + fs * 0.9, cy);
    y += fs * 1.6; ctx.font = `400 ${Math.round(fs * 0.92)}px system-ui, sans-serif`; ctx.fillStyle = '#333';
    keyLines.forEach(t => { ctx.fillText(t, p0, y + fs * 0.1); y += fs * 1.35; });
    y += p0 * 0.6; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.fillStyle = '#111'; ctx.fillText('Legende', p0, y + fs * 0.5); y += fs * 1.8;
    ctx.font = `500 ${fs}px system-ui, sans-serif`;
    lines.forEach((l, i) => {
      if (l.col) { ctx.fillStyle = l.col; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p0 + fs * 0.45, y + fs * 0.1, fs * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else if (l.hit) drawMarker(ctx, p0 + fs * 0.45, y + fs * 0.1, fs * 0.45);
      ctx.fillStyle = '#111';
      wrapped[i].forEach(t => { ctx.fillText(t, p0 + fs * 1.6, y + fs * 0.1); y += fs * 1.4; });
    });
    if (fImg) {
      y += fs * 1.2; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.fillText('Foto', p0, y); y += fs * 1.4;
      ctx.drawImage(fImg, 0, y, W, hF); if (fo.hit) drawMarker(ctx, fo.hit[0] * W, y + fo.hit[1] * hF, W / 100 * 2.1);
    }
    return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  }
  function summaryLines(data) {
    const sk = data.sk || {}, out = [];
    if (has(sk.up)) out.push({ txt: `Kartenausrichtung: oben im Bild ist ${UP.find(u => u[0] === sk.up)[1]}.` });
    else out.push({ txt: 'Kartenausrichtung: nicht angegeben – Richtungen beziehen sich auf das Bild.' });
    vehs(sk).forEach((v, i) => { const s = describe(v, sk); out.push({ col: COLORS[i % COLORS.length], txt: `${s.name}: ${s.txt}.` }); });
    if (sk.hit) out.push({ hit: true, txt: 'Kollisionsort (rot markiert).' });
    return out;
  }
  function mountExport(el, api) {
    const data = () => ({ sk: api.get('sk') || {}, foto: api.get('foto') || {}, ort: api.get('ort') || {} });
    const d0 = data(), ok = !!(d0.sk && d0.sk.img);
    el.innerHTML = `<div class="sk"><pre class="sk-pre">${esc(text2(d0))}</pre>
      <div class="sk-tools"><button type="button" class="btn btn-accent" data-sk-share${ok ? '' : ' disabled'}>Bild und Text teilen</button><button type="button" class="btn btn-ghost" data-sk-save${ok ? '' : ' disabled'}>Bild speichern</button><button type="button" class="btn btn-ghost" data-sk-copy>Text kopieren</button></div>
      ${ok ? '' : '<p class="sk-hint">Zuerst im Schritt „Luftbild“ ein Bild einfügen.</p>'}<p class="w-hint">Das Gesamtbild enthält Luftbild mit Fahrzeugen, gefahrenem Weg (durchgezogen) und beabsichtigter Richtung (gestrichelt), Nordpfeil, Kollisionsort, Zeichenerklärung, Legende und – falls vorhanden – das Foto.</p></div>`;
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
    return ['Unfallskizze – Angaben zur Unfallörtlichkeit', '', ...rows, '', ...summaryLines(d).map(l => l.txt), '', KEY, '', `Bildmaterial: Luftbild ${sk.img ? 'ja' : 'fehlt'}${fo.img ? ', Foto mit Markierung' + (fo.hit ? '' : ' (Unfallstelle nicht markiert)') : ''}.`].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function text(d) {
    d = d || {};
    return [
      ['1', 'Örtlichkeit', angaben(d).join('\n') || '[Angaben zur Örtlichkeit]', 'angaben'],
      ['2', 'Beteiligte, Herkunft und Fahrtrichtungen', summaryLines(d).map(l => l.txt).join('\n'), 'luftbild'],
      ['3', 'Bildmaterial', `Luftbild ${get(d, 'sk.img') ? 'eingefügt' : '[fehlt]'}; Foto ${get(d, 'foto.img') ? 'eingefügt' : 'nicht vorhanden'}.`, 'foto']
    ];
  }
  const plain = d => text2(d || {});
  function offen(d) {
    d = d || {}; const sk = d.sk || {}, out = [];
    if (!sk.img) out.push('Luftbild einfügen');
    if (sk.img && !has(sk.up)) out.push('Kartenausrichtung (oben im Bild) angeben – sonst keine Himmelsrichtungen');
    const V = vehs(sk);
    if (!V.length) out.push('Mindestens ein Fahrzeug einzeichnen');
    V.forEach(v => { if (!arr(v.pre).length) out.push(`${v.n} ${VL[v.t] || ''}: „Woher kam es?“ einzeichnen`); if (!arr(v.post).length) out.push(`${v.n} ${VL[v.t] || ''}: „Wohin wollte es?“ einzeichnen`); });
    if (!sk.hit) out.push('Kollisionsort markieren');
    if (!has(get(d, 'ort.text'))) out.push('Ort (Straße, Kreuzung, Gemeinde) angeben');
    if (!has(get(d, 'ort.lage'))) out.push('Innerorts oder außerorts angeben');
    if (!has(get(d, 'ort.vmax'))) out.push('Zulässige Höchstgeschwindigkeit angeben');
    return out;
  }
  const title = d => ['Skizze', get(d || {}, 'ort.text') || null, fmtDate(get(d || {}, 'ort.datum')) || null].filter(Boolean).join(' · ');
  const subtitle = d => { const n = arr(get(d || {}, 'sk.veh')).length; return [n ? `${n} ${n === 1 ? 'Fahrzeug' : 'Fahrzeuge'}` : 'noch keine Fahrzeuge', get(d || {}, 'sk.img') ? 'Luftbild' : ''].filter(Boolean).join(' · '); };
  function preview(stepId, d) { return stepId === 'angaben' ? (angaben(d || {}).join('\n') || '') : summaryLines(d || {}).map(l => l.txt).join('\n'); }

  const STEPS = [
    { id: 'luftbild', phase: 'Luftbild', title: 'Luftbild, Fahrzeuge, Fahrtrichtungen', lead: 'Screenshot von oben einfügen, Kartenrichtung wählen, dann „Skizze bearbeiten“: Fahrzeuge setzen, je Fahrzeug „Woher kam es?“ und „Wohin wollte es?“ einzeichnen, Kollisionsort setzen.',
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
    { id: 'teilen', phase: 'Teilen', title: 'Bild und Text teilen', lead: 'Ein Gesamtbild mit Zeichenerklärung und Legende und der Text dazu – zum Senden oder für den Bericht.',
      fields: [{ k: 'export', t: 'custom' }] }
  ];
  function mount(el, k, data, api) {
    if (k === 'sk') return mountSketch(el, api);
    if (k === 'foto') return mountFoto(el, api);
    if (k === 'export') return mountExport(el, api);
  }

  root.WSKZ = Object.freeze({
    id: 'skizze', name: 'Unfallskizze', short: 'Skizze', kurz: 'SK',
    desc: 'Luftbild mit Fahrzeugen, gefahrenem Weg, beabsichtigter Richtung und Kollisionsort, Foto, Angaben – als Bild und Text zum Teilen',
    labels: { bericht: 'Zusammenfassung', newBtn: 'Unfallskizze', kurzHint: 'Kurzfassung.', offen: 'Offene Punkte', offenEmpty: 'Skizze vollständig.', persHint: 'Die Skizze enthält keine Personalien.' },
    steps: STEPS, text, plain, preview, kurzText: d => summaryLines(d || {}).map(l => l.txt).join(' '), fahndung: () => '', offen, personalien: () => 'Keine Personalien.', title, subtitle, mount,
    _test: { describe, summaryLines, text2, exportImage, normVeh }
  });
})(typeof window !== 'undefined' ? window : globalThis);
