/*
 * Workoholic · Modul „Schilderungen“
 * ---------------------------------------------------------------
 * Schilderungen von Zeugen, Geschädigten, Beschuldigten und Betroffenen für eine Strafanzeige oder eine
 * Verkehrsangelegenheit. Ablauf: Liste mit „+“ → je Person eine Maske (Rolle, Anrede, Name, belehrt durch,
 * gegenüber, Hinweis auf das Zeugnisverweigerungsrecht, Schilderung) → „Abschließen“ zeigt den Text und führt
 * zurück zur Liste → „Alle Schilderungen hinzugefügt“ liefert das Gesamtpaket mit Abschnittsnummer zum Kopieren.
 *
 * Die Textlogik (unten „Text“) ist rein und ohne DOM testbar. Die Maske zeichnet writer.js über m.screen.
 * Gespeichert wird ausschließlich über writer.js / WBridge im verschlüsselten Tresor.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const str = v => (v == null ? '' : String(v)).trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lc = s => str(s).toLocaleLowerCase('de');
  const norm = s => lc(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nameKey = n => norm(n).replace(/\s+/g, ' ');
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);

  /* Amtsbezeichnungen: „POK“, „POKin“ … – die weibliche Form endet auf „in“. */
  const DGRADE = ['', 'PKA', 'PKAin', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'EPHK', 'EPHKin', 'KA', 'KAin', 'KK', 'KKin', 'KOK', 'KOKin', 'KHK', 'KHKin', 'EKHK', 'EKHKin', 'PR', 'PRin', 'POR', 'PORin', 'KR', 'KRin'];
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => arr(roles).map(str).find(r => RANK_RE.test(r)) || '';
  /** „pok“ → „POK“, „pokin“ → „POKin“; keine Amtsbezeichnung → ''. */
  function canonRank(t) {
    t = str(t); if (!t || t.length > 7) return '';
    const up = t.toUpperCase(); if (RANK_RE.test(up)) return up;
    if (/in$/i.test(t)) { const f = t.slice(0, -2).toUpperCase() + 'in'; if (RANK_RE.test(f)) return f; }
    return '';
  }
  /** Nachname aus „Max Müller“, „Müller, Max“ oder „Max von der Heide“. */
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  /** Geschlecht einer Beamtin / eines Beamten aus der Amtsbezeichnung ('' = unbekannt). */
  const offG = o => (o && has(o.grad) ? (/in$/.test(str(o.grad)) ? 'w' : 'm') : '');
  /** Im Text: Amtsbezeichnung + Nachname, z. B. „POKin Schulz“. */
  const offName = o => (o && has(o.name) ? `${has(o.grad) ? str(o.grad) : '[Amtsbez.]'} ${nachname(o.name)}` : '');

  /** Amtsbezeichnungen, die die App schon kennt (Team, frühere Vorgänge) – die Maske füllt das aus WBridge. */
  let RANKS = new Map();
  const rankFor = name => RANKS.get(nameKey(name)) || '';

  /* ======================= Rollen ======================= */
  const ROLLEN = [
    ['zeuge', { m: 'Zeuge', w: 'Zeugin', x: 'Zeuge/Zeugin', art: { m: 'der Zeuge', w: 'die Zeugin' }, zeug: true, bel: 'Zeugenschaftliche Belehrung' }],
    ['gs', { m: 'Geschädigter', w: 'Geschädigte', x: 'Geschädigte/r', art: { m: 'der Geschädigte', w: 'die Geschädigte' }, zeug: true, bel: 'Zeugenschaftliche Belehrung – wie bei Zeugen' }],
    ['bs', { m: 'Beschuldigter', w: 'Beschuldigte', x: 'Beschuldigte/r', art: { m: 'der Beschuldigte', w: 'die Beschuldigte' }, bel: 'Beschuldigtenbelehrung (§ 163a Abs. 4, § 136 StPO)' }],
    ['betr', { m: 'Betroffener', w: 'Betroffene', x: 'Betroffene/r', art: { m: 'der Betroffene', w: 'die Betroffene' }, owi: true, bel: 'Betroffenenbelehrung zur Anhörung (§ 55 OWiG)' }]
  ];
  const ROLLE = Object.fromEntries(ROLLEN);
  /** Betroffene/r gibt es nur in Verkehrsangelegenheiten (Ordnungswidrigkeiten) – außer die Person hat die Rolle schon. */
  const rollenFor = (art, cur) => ROLLEN.filter(([k, r]) => !r.owi || art === 'verkehr' || cur === k);
  const ARTEN = [['straf', 'Strafanzeige'], ['verkehr', 'Verkehrsangelegenheit']];
  const ARTL = Object.fromEntries(ARTEN);
  const rolleLabel = p => { const r = ROLLE[p && p.rolle]; return r ? (p.g === 'm' || p.g === 'w' ? r[p.g] : r.x) : 'Rolle offen'; };

  /* ======================= Text ======================= */
  const crewOf = data => [...arr(getPath(data, 'einsatz.kraefte')), ...arr(getPath(data, 'einsatz.wagen')).flatMap(w => arr(w && w.crew))].filter(c => c && has(c.name));
  const ini = s => (s ? s.charAt(0).toLocaleUpperCase('de') : '');
  const prefix = (s, n) => s.slice(0, 1).toLocaleUpperCase('de') + s.slice(1, n).toLocaleLowerCase('de');

  /**
   * Verkehrsangelegenheit: nur Anfangsbuchstabe des Nachnamens („M.“). Teilen sich mehrere Personen diesen
   * Buchstaben, kommt der des Vornamens davor („A. M.“), reicht das nicht, der zweite Buchstabe („An. M.“) usw.
   */
  function kuerzel(P, i) {
    const all = P.map(q => ({ vn: str(q && q.vorname), nn: str(q && q.nachname) }));
    const me = all[i]; if (!me || !me.nn) return '[Nachname]';
    const N = ini(me.nn) + '.';
    const grp = all.filter((q, j) => j !== i && q.nn && lc(ini(q.nn)) === lc(ini(me.nn)));
    if (!grp.length) return N;
    if (!me.vn) return `[V.] ${N}`;
    const v = lc(me.vn);
    for (let n = 1; n <= me.vn.length; n++) if (!grp.some(q => lc(q.vn).slice(0, n) === v.slice(0, n))) return `${prefix(me.vn, n)}. ${N}`;
    // Gleicher Vorname bei gleichem Anfangsbuchstaben: Nachname um einen Buchstaben verlängern
    return `${prefix(me.vn, 1)}. ${prefix(me.nn, 2)}.`;
  }
  /** Name der Person im Text: Strafanzeige ausgeschrieben (bei gleichem Nachnamen mit Vorname), Verkehr als Kürzel. */
  function nameOf(data, i) {
    const P = arr(data && data.personen), p = P[i] || {};
    if (data && data.art === 'verkehr') return kuerzel(P, i);
    const nn = str(p.nachname); if (!nn) return '[Nachname]';
    const twin = P.some((q, j) => j !== i && q && norm(q.nachname) === norm(nn));
    return twin ? `${str(p.vorname) || '[Vorname]'} ${nn}` : nn;
  }
  const anrede = p => (p.g === 'w' ? 'der Frau' : p.g === 'm' ? 'des Herrn' : '[des Herrn/der Frau]');
  /** Unterüberschrift: „Schilderung der Frau Müller“ / „Schilderung des Herrn M. M.“ */
  const heading = (data, i) => `Schilderung ${anrede(arr(data.personen)[i] || {})} ${nameOf(data, i)}`;
  /** „der Zeuge“ / „die Geschädigte“ … */
  const rolleArt = p => { const r = ROLLE[p.rolle]; if (!r) return '[Rolle]'; return p.g === 'm' || p.g === 'w' ? r.art[p.g] : `[${r.art.m}/${r.art.w}]`; };

  /** „den eingesetzten Beamten“ – nur wenn ausschließlich Beamtinnen eingesetzt sind: „Beamtinnen“. */
  function beamte(data) {
    const gs = crewOf(data).map(c => offG({ grad: has(c.grad) ? c.grad : rankFor(c.name) }));
    return gs.length && gs.every(g => g === 'w') ? 'Beamtinnen' : 'Beamten';
  }
  /** Wem gegenüber: nur die belehrende Person → „diesem/dieser gegenüber“, sonst Namen oder „den eingesetzten Beamten“. */
  function gegenText(data, p) {
    p = p || {};
    const g = arr(p.gegen);
    if (g.some(x => x && x.ref === 'alle')) return `gegenüber den eingesetzten ${beamte(data)}`;
    const list = [], seen = new Set();
    for (const x of g) {
      const o = x && x.ref === 'bel' ? p.bel : x;
      if (!o || !has(o.name)) continue;
      const k = nameKey(o.name); if (seen.has(k)) continue;
      seen.add(k); list.push(o);
    }
    if (!list.length) return 'gegenüber [Beamtin/Beamter]';
    if (list.length === 1 && p.bel && has(p.bel.name) && nameKey(list[0].name) === nameKey(p.bel.name)) {
      const gg = offG(p.bel); if (gg) return gg === 'w' ? 'dieser gegenüber' : 'diesem gegenüber';
    }
    return 'gegenüber ' + joinUnd(list.map(offName));
  }
  /** Einleitungssatz vor der Schilderung. */
  function einleitung(data, i) {
    const p = arr(data.personen)[i] || {};
    const r = ROLLE[p.rolle];
    const wer = `${rolleArt(p)} ${nameOf(data, i)}`;
    const durch = p.bel && has(p.bel.name) ? offName(p.bel) : '[belehrende Person]';
    let bel;
    if (!r) bel = 'Nach erfolgter [Belehrung]';
    else if (r.zeug) bel = 'Nach erfolgter zeugenschaftlicher Belehrung' + (p.zvr ? ' mit besonderem Hinweis auf das Zeugnisverweigerungsrecht gemäß § 52 StPO' : '');
    else if (p.rolle === 'bs') bel = 'Nach erfolgter Beschuldigtenbelehrung';
    else bel = 'Nach erfolgter Betroffenenbelehrung gemäß § 55 OWiG';
    const gg = gegenText(data, p);
    const bereit = r && r.zeug && p.zvr && p.bereit !== false;
    return `${bel} durch ${durch} ${bereit ? `erklärte sich ${wer} zur Aussage bereit und machte ${gg}` : `machte ${wer} ${gg}`} sinngemäß folgende Angaben:`;
  }
  const schilderung = p => str(p && p.text).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  /** Eine Schilderung: Unterüberschrift, Einleitungssatz, Text. num = „3.1“ oder ''. */
  function block(data, i, num = '') {
    const t = schilderung(arr(data.personen)[i]);
    return `${num ? num + ' ' : ''}${heading(data, i)}\n${einleitung(data, i)}\n${t || '[Schilderung]'}`;
  }
  /** Abschnittsnummer ohne Punkt dahinter: „3.“ → „3“, „3.2.“ → „3.2“. */
  const cleanNr = s => str(s).replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
  /** Gesamtpaket: „3 Schilderungen“, darunter „3.1 Schilderung …“, „3.2 …“. */
  function paket(data) {
    const P = arr(data && data.personen), nr = cleanNr(data && data.nr);
    const head = `${nr ? nr + ' ' : ''}Schilderungen`;
    if (!P.length) return head + '\n\n[Noch keine Person erfasst]';
    return [head, ...P.map((p, i) => block(data, i, nr ? `${nr}.${i + 1}` : ''))].join('\n\n');
  }

  function title(data) {
    const P = arr(data && data.personen);
    const names = P.map((p, i) => (has(p && p.nachname) ? nameOf(data, i) : '')).filter(Boolean);
    return names.length ? `Schilderungen – ${names.join(', ')}` : 'Schilderungen';
  }
  function subtitle(data) {
    const n = arr(data && data.personen).length, nr = cleanNr(data && data.nr);
    return `${ARTL[data && data.art] || 'Art offen'} · ${n} ${n === 1 ? 'Person' : 'Personen'}${nr ? ' · Abschnitt ' + nr : ''}`;
  }
  function pill(data) {
    const P = arr(data && data.personen);
    return P.length ? `${P.filter(p => p && p.fertig).length}/${P.length}` : 'neu';
  }
  const fehlt = p => {
    const m = [];
    if (!p.rolle) m.push('Rolle');
    if (p.g !== 'm' && p.g !== 'w') m.push('Anrede');
    if (!has(p.nachname)) m.push('Nachname');
    if (!(p.bel && has(p.bel.name))) m.push('belehrt durch');
    if (!arr(p.gegen).length) m.push('gegenüber');
    if (!has(p.text)) m.push('Schilderung');
    return m;
  };

  /* ======================= Maske ======================= */
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_UP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  /** Ansicht je Vorgang: 'menu' (Liste mit +), 'person' (Maske), 'done' (Gesamtpaket). q = Suchtext der Namensfelder. */
  const V = { id: null, s: 'menu', i: -1, last: -1, q: { bel: '', gegen: '' }, focus: '' };
  const $ = s => document.querySelector(s);
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };

  function open(d) { V.id = d.id; V.s = d.status === 'fertig' && arr(d.data.personen).length ? 'done' : 'menu'; V.i = -1; V.last = -1; V.q = { bel: '', gegen: '' }; V.focus = ''; }

  function loadRanks(api) {
    const m = new Map();
    const put = (name, grad) => { const k = nameKey(name), g = str(grad); if (k && g && RANK_RE.test(g) && !m.has(k)) m.set(k, g); };
    for (const t of api.team()) if (t) put(t.name, rankOf(t.roles));
    for (const x of api.docs().slice().sort((a, b) => (b.u || 0) - (a.u || 0))) {
      const dt = (x && x.data) || {};
      for (const c of crewOf(dt)) put(c.name, c.grad);
      if (x.type !== 'sch') continue;
      for (const p of arr(dt.personen)) {
        if (p && p.bel && typeof p.bel === 'object') put(p.bel.name, p.bel.grad);
        for (const g of arr(p && p.gegen)) if (g && !g.ref) put(g.name, g.grad);
      }
    }
    RANKS = m;
  }
  /** Wer kommt als belehrende Person oder Gesprächspartner in Frage: zuerst in diesem Vorgang schon genannt, dann Besatzung, dann Team. */
  function pool(api, data) {
    const out = [], idx = new Map();
    const add = (grad, name, src) => {
      name = str(name); if (!name) return;
      const k = nameKey(name), g = str(grad) || rankFor(name);
      if (idx.has(k)) { const o = idx.get(k); if (!o.grad && g) o.grad = g; return; }
      const o = { grad: g, name, src }; idx.set(k, o); out.push(o);
    };
    for (const p of arr(data.personen).slice().reverse()) {
      if (p && p.bel && typeof p.bel === 'object') add(p.bel.grad, p.bel.name, 'doc');
      for (const x of arr(p && p.gegen)) if (x && !x.ref) add(x.grad, x.name, 'doc');
    }
    for (const c of crewOf(data)) add(c.grad, c.name, 'crew');
    for (const t of api.team()) if (t) add(rankOf(t.roles), t.name, 'team');
    return out;
  }
  function matches(o, q) {
    const qq = norm(q).replace(/\s+/g, ' '); if (!qq) return true;
    const n = nameKey(o.name), g = norm(o.grad);
    const hay = [n, ...n.split(/[\s-]+/), `${g} ${norm(nachname(o.name))}`, `${g} ${n}`];
    return hay.some(h => h.startsWith(qq)) || (qq.length >= 3 && n.includes(qq));
  }
  function suggest(api, data, key) {
    const p = arr(data.personen)[V.i] || {};
    const q = str(V.q[key]);
    const excl = new Set();
    if (key === 'gegen') {
      if (p.bel && has(p.bel.name)) excl.add(nameKey(p.bel.name));
      for (const x of arr(p.gegen)) if (x && !x.ref && has(x.name)) excl.add(nameKey(x.name));
    }
    const list = pool(api, data).filter(o => !excl.has(nameKey(o.name)));
    if (!q) { const near = list.filter(o => o.src !== 'team'); return (near.length ? near : list).slice(0, 8); }
    return list.filter(o => matches(o, q)).slice(0, 8);
  }
  function suggHtml(api, data, key) {
    const q = str(V.q[key]);
    const list = suggest(api, data, key);
    const exact = q && list.some(o => nameKey(o.name) === nameKey(q) || nameKey(`${o.grad} ${nachname(o.name)}`) === nameKey(q));
    const chips = list.map(o => `<button type="button" class="chip" data-sd="pick" data-ta="${key}" data-v="${esc(JSON.stringify({ grad: o.grad || '', name: o.name }))}">${o.grad ? `<b>${esc(o.grad)}</b> ` : ''}${esc(o.name)}</button>`);
    if (q && !exact) chips.push(`<button type="button" class="chip sd-free" data-sd="pick" data-ta="${key}" data-free="1">+ „${esc(q)}“ übernehmen</button>`);
    if (!chips.length) return `<p class="w-hint sd-hint">Noch niemand im Team – Namen mit Amtsbezeichnung tippen, z. B. „POK Müller“.</p>`;
    return chips.join('');
  }
  /** Eingabefeld mit Vorschlägen (Tippen filtert Team und Besatzung). */
  function ta(api, data, key, id, ph) {
    return `<div class="sd-ta"><input class="input" id="${id}" data-ta="${key}" value="${esc(V.q[key] || '')}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="60" aria-label="${key === 'bel' ? 'Belehrt durch' : 'Gegenüber'} – Namen tippen"><div class="w-chips sd-sugg" data-ta-list="${key}">${suggHtml(api, data, key)}</div></div>`;
  }
  /** Gewählte Beamtin / gewählter Beamter. Fehlt die Amtsbezeichnung, steht eine Auswahl davor. */
  function tok(o, path, act, j) {
    const nn = nachname(o.name);
    const lbl = has(o.grad) ? `${o.grad} ${nn}` : nn;
    const sel = has(o.grad) ? '' : `<select class="sd-grad" data-sk="${esc(path)}.grad" aria-label="Amtsbezeichnung für ${esc(o.name)}">${DGRADE.map(x => `<option value="${esc(x)}">${esc(x || 'Amtsbez.?')}</option>`).join('')}</select>`;
    return `<span class="sd-tok${has(o.grad) ? '' : ' warn'}">${sel}<b>${esc(lbl)}</b>${nn !== str(o.name) ? `<small>${esc(o.name)}</small>` : ''}<button type="button" data-sd="${act}"${j != null ? ` data-j="${j}"` : ''} aria-label="${esc(lbl)} entfernen">${ICON_X}</button></span>`;
  }
  const topBar = (back, kicker, ttl) => `<div class="w-top"><button type="button" class="icon-btn sm${back === 'list' ? ' w-back' : ''}" ${back === 'list' ? 'data-w="list" aria-label="Zur Liste"' : `data-sd="${back}" aria-label="Zurück zur Übersicht"`}>${ICON_BACK}</button><div class="w-top-t"><span class="spaced">${esc(kicker)}</span><div class="w-title"${back === 'menu' ? ' data-live="head"' : ''}>${esc(ttl)}</div></div></div>`;

  function menuHtml(d) {
    const data = d.data, P = arr(data.personen), art = data.art;
    const artQ = `<div class="w-q"><span class="w-lbl">Worum geht es?${art ? '' : ' <i class="w-req" title="Pflicht">•</i>'}</span><div class="w-seg" role="group" aria-label="Art">${ARTEN.map(([v, l]) => `<button type="button" class="w-opt" data-sd="art" data-v="${v}" aria-pressed="${String(art === v)}">${l}</button>`).join('')}</div><p class="w-hint sd-hint">${art === 'verkehr' ? 'Namen nur mit Anfangsbuchstaben: „Frau M.“ – teilen sich Personen den Buchstaben, „A. M.“, dann „An. M.“.' : art === 'straf' ? 'Nachname ausgeschrieben – bei gleichem Nachnamen mit Vorname.' : 'Davon hängt ab, wie die Namen im Text stehen.'}</p></div>`;
    const items = P.map((p, i) => {
      p = p || {};
      const meta = [rolleLabel(p), p.bel && has(p.bel.name) ? 'belehrt durch ' + offName(p.bel) : 'Belehrung offen'];
      const snip = str(p.text).replace(/\s+/g, ' ');
      const opened = i === V.last;
      return `<li class="sd-item${opened ? ' open' : ''}"><div class="sd-row"><button type="button" class="sd-card" data-sd="edit" data-i="${i}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(heading(data, i))}</b><small>${esc(meta.join(' · '))}${snip ? ` · „${esc(snip.slice(0, 80))}${snip.length > 80 ? '…' : ''}“` : ''}</small></span><span class="pill ${p.fertig ? 'pill-lime' : 'pill-quiet'}">${p.fertig ? 'Fertig' : 'Entwurf'}</span></button>${P.length > 1 ? `<button type="button" class="sd-up" data-sd="up" data-i="${i}" aria-label="Nach oben"${i ? '' : ' disabled'}>${ICON_UP}</button>` : ''}</div>${opened ? `<div class="w-out sd-last"><div class="w-out-h"><span class="w-lbl">Abgeschlossen – so steht es in der Anzeige</span><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></div><pre class="w-out-t">${esc(block(data, i))}</pre></div>` : ''}</li>`;
    }).join('');
    const add = art
      ? `<div class="sd-add"><span class="w-lbl">${P.length ? 'Weitere Person hinzufügen' : 'Person hinzufügen'}</span><div class="sd-add-row">${rollenFor(art).map(([v, r]) => `<button type="button" class="sd-add-b" data-sd="add" data-v="${v}"><i aria-hidden="true">+</i>${esc(r.x)}</button>`).join('')}</div></div>`
      : `<div class="sd-add off"><span class="w-lbl">Person hinzufügen</span><p class="w-hint sd-hint">Erst oben wählen: Strafanzeige oder Verkehrsangelegenheit.</p></div>`;
    const done = d.status === 'fertig';
    return `${topBar('list', `Schilderungen · ${ARTL[art] || 'Art offen'}`, title(data))}
      <div class="w-grid sd-grid">${artQ}
        ${P.length ? `<div class="w-q"><span class="w-lbl">Erfasst <span class="sd-cnt mono">${P.length}</span></span><ol class="sd-list">${items}</ol></div>` : ''}
        <div class="w-q">${add}</div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${P.length ? `<button type="button" class="btn btn-accent" data-sd="alle">${done ? 'Zum Gesamtpaket' : 'Alle Schilderungen hinzugefügt'}</button>` : ''}</div>`;
  }

  function personHtml(d, api) {
    const data = d.data, P = arr(data.personen), i = V.i, p = P[i] || {}, base = `personen.${i}`;
    const r = ROLLE[p.rolle];
    const roles = rollenFor(data.art, p.rolle).map(([v, x]) => `<button type="button" class="chip" data-sd="set" data-p="${base}.rolle" data-v="${v}" aria-pressed="${String(p.rolle === v)}">${esc(p.g === 'm' || p.g === 'w' ? x[p.g] : x.x)}</button>`).join('');
    const anr = [['m', 'Herr'], ['w', 'Frau']].map(([v, l]) => `<button type="button" class="w-opt" data-sd="set" data-p="${base}.g" data-v="${v}" aria-pressed="${String(p.g === v)}">${l}</button>`).join('');
    const hasBel = p.bel && has(p.bel.name);
    const g = arr(p.gegen);
    const belOn = g.some(x => x && x.ref === 'bel'), alleOn = g.some(x => x && x.ref === 'alle');
    const others = g.map((x, j) => [x, j]).filter(([x]) => x && !x.ref && has(x.name));
    const gegenChips = `<div class="w-chips">${hasBel ? `<button type="button" class="chip" data-sd="gbel" aria-pressed="${String(belOn)}">${esc(offName(p.bel))}<small class="sd-sm">hat belehrt</small></button>` : ''}<button type="button" class="chip" data-sd="galle" aria-pressed="${String(alleOn)}">den eingesetzten ${beamte(data)}</button></div>`;
    return `${topBar('menu', `Schilderungen · Person ${i + 1} von ${P.length}`, heading(data, i))}
      <div class="w-grid sd-grid">
        <div class="w-q"><span class="w-lbl">Rolle <i class="w-req" title="Pflicht">•</i></span><div class="w-chips" role="group" aria-label="Rolle">${roles}</div></div>
        <div class="w-q"><span class="w-lbl">Anrede <i class="w-req" title="Pflicht">•</i></span><div class="w-seg" role="group" aria-label="Anrede">${anr}</div></div>
        <div class="w-q half"><label class="w-lbl" for="sdNn">Nachname <i class="w-req" title="Pflicht">•</i></label><input class="input" id="sdNn" data-sk="${base}.nachname" data-next="sdVn" value="${esc(p.nachname || '')}" placeholder="z. B. Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" maxlength="80"></div>
        <div class="w-q half"><label class="w-lbl" for="sdVn">Vorname</label><input class="input" id="sdVn" data-sk="${base}.vorname" data-next="${hasBel ? 'sdText' : 'sdBel'}" value="${esc(p.vorname || '')}" placeholder="z. B. Anna" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" maxlength="80"></div>
        <p class="sd-im">Im Text: <b data-live="head">${esc(heading(data, i))}</b></p>
        <div class="w-q"><span class="w-lbl">Belehrt durch <i class="w-req" title="Pflicht">•</i></span>${r ? `<p class="w-hint">${esc(r.bel)}</p>` : ''}${hasBel ? `<div class="sd-toks">${tok(p.bel, `${base}.bel`, 'unbel')}</div>` : ta(api, data, 'bel', 'sdBel', 'Namen tippen, z. B. Schulz')}</div>
        <div class="w-q"><span class="w-lbl">Gegenüber <i class="w-req" title="Pflicht">•</i></span>${gegenChips}${others.length ? `<div class="sd-toks">${others.map(([x, j]) => tok(x, `${base}.gegen.${j}`, 'ungegen', j)).join('')}</div>` : ''}${ta(api, data, 'gegen', 'sdGegen', 'Weitere Person tippen …')}<p class="sd-im">Im Text: <b data-live="gegen">${esc(gegenText(data, p))}</b></p></div>
        ${r && r.zeug ? `<div class="w-q"><span class="w-lbl">Belehrung</span><div class="w-chips"><button type="button" class="chip" data-sd="zvr" aria-pressed="${String(!!p.zvr)}">Besonderer Hinweis auf das Zeugnisverweigerungsrecht</button>${p.zvr ? `<button type="button" class="chip" data-sd="bereit" aria-pressed="${String(p.bereit !== false)}">Zur Aussage bereit erklärt</button>` : ''}</div><p class="w-hint sd-hint">Steht mit „gemäß § 52 StPO“ im Text. Gilt für Verlobte, Ehegatten, eingetragene Lebenspartner, Verwandte und Verschwägerte der beschuldigten Person.</p></div>` : ''}
        <div class="w-q"><label class="w-lbl" for="sdText">Schilderung <i class="w-req" title="Pflicht">•</i></label><div class="sd-sent" data-sd="focus"><span class="sd-intro" data-live="intro">${esc(einleitung(data, i))}</span><textarea class="sd-text" id="sdText" data-sk="${base}.text" placeholder="Was hat die Person sinngemäß geschildert? Ich-Form oder indirekte Rede." autocomplete="off" autocapitalize="sentences" spellcheck="true" maxlength="12000">${esc(p.text || '')}</textarea></div></div>
        <div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So steht es in der Anzeige</span><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></div><pre class="w-out-t" data-live="block">${esc(block(data, i))}</pre></div></div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-sd="del">Entfernen</button><span class="grow"></span><span class="w-nav-i mono">${i + 1} / ${P.length}</span><button type="button" class="btn btn-accent" data-sd="done1">Abschließen</button></div>`;
  }

  const nrHint = nr => (nr ? `Überschrift „${nr} Schilderungen“, darunter ${nr}.1, ${nr}.2 … – ohne Punkt hinter der Zahl.` : 'Ohne Nummer stehen die Überschriften ohne Gliederungsziffer da.');
  function doneHtml(d) {
    const data = d.data, nr = cleanNr(data.nr), txt = paket(data);
    const ph = (txt.match(/\[[^\]]+\]/g) || []).length;
    return `${topBar('menu', 'Schilderungen · Gesamtpaket', title(data))}
      <div class="w-grid sd-grid">
        <div class="w-q"><label class="w-lbl" for="sdNr">Welche Nummer haben die Schilderungen in deiner Anzeige?</label><div class="sd-nr"><input class="input mono" id="sdNr" data-sk="nr" value="${esc(data.nr || '')}" placeholder="z. B. 3" inputmode="decimal" autocomplete="off" maxlength="8"><div class="w-chips">${['2', '3', '4', '5', '6'].map(n => `<button type="button" class="chip" data-sd="set" data-p="nr" data-v="${n}" aria-pressed="${String(nr === n)}">${n}</button>`).join('')}</div></div><p class="w-hint sd-hint" data-live="nrhint">${esc(nrHint(nr))}</p></div>
        ${ph ? `<div class="w-q"><div class="w-warn">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} (in eckigen Klammern) – über „Weitere Person“ in der Übersicht die Person antippen und nachtragen.</div></div>` : ''}
        <div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">Gesamtpaket</span><button type="button" class="btn btn-light btn-sm" data-sd="copyall">Kopieren</button></div><pre class="w-out-t" data-live="paket">${esc(txt)}</pre></div></div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="menu">+ Weitere Person</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copyall">Gesamtpaket kopieren</button></div>`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    loadRanks(api);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (V.s === 'person' && !arr(d.data.personen)[V.i]) V.s = 'menu';
    if (V.s === 'done' && !arr(d.data.personen).length) V.s = 'menu';
    return V.s === 'person' ? personHtml(d, api) : V.s === 'done' ? doneHtml(d) : menuHtml(d);
  }
  function grow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function mounted() {
    grow($('#sdText'));
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (Fokus bleibt im Feld). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    const p = arr(data.personen)[V.i];
    if (V.s === 'person' && p) { put('head', heading(data, V.i)); put('intro', einleitung(data, V.i)); put('block', block(data, V.i)); put('gegen', gegenText(data, p)); }
    if (V.s === 'done') { const nr = cleanNr(data.nr); put('paket', paket(data)); put('nrhint', nrHint(nr)); host.querySelectorAll('[data-sd="set"][data-p="nr"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === nr))); }
  }
  const isEmpty = p => !p || (!has(p.nachname) && !has(p.vorname) && !has(p.text) && !(p.bel && has(p.bel.name)) && !arr(p.gegen).some(x => x && !x.ref));
  /** Zurück zur Übersicht: eine versehentlich angelegte, leere Person verschwindet wieder. */
  function leavePerson(data) {
    const P = arr(data.personen);
    if (V.s === 'person' && isEmpty(P[V.i])) { P.splice(V.i, 1); if (!P.length) delete data.personen; }
    V.s = 'menu'; V.i = -1; V.last = -1;
  }
  function parseFree(api, data, q) {
    q = str(q).replace(/\s+/g, ' '); if (!q) return null;
    const t = q.split(' '), g0 = canonRank(t[0]);
    if (g0 && t.length > 1) return { grad: g0, name: t.slice(1).join(' ') };
    const hits = pool(api, data).filter(o => norm(nachname(o.name)) === norm(q) || nameKey(o.name) === nameKey(q));
    if (hits.length === 1) return { grad: hits[0].grad, name: hits[0].name };
    return { grad: '', name: q };
  }
  function pick(b, api) {
    const data = api.d.data, key = b.dataset.ta, p = arr(data.personen)[V.i]; if (!p) return;
    let o = null;
    if (b.dataset.free) o = parseFree(api, data, V.q[key]);
    else { try { o = JSON.parse(b.dataset.v); } catch (e) { o = null; } }
    if (!o || !has(o.name)) return;
    o = { grad: str(o.grad) || rankFor(o.name), name: str(o.name) };
    if (!o.grad) delete o.grad;
    if (key === 'bel') {
      p.bel = o;
      if (!arr(p.gegen).length) p.gegen = [{ ref: 'bel' }];
      V.focus = has(p.text) ? '' : 'sdText';
    } else {
      const g = arr(p.gegen).filter(x => x && x.ref !== 'alle');
      const k = nameKey(o.name);
      if (p.bel && nameKey(p.bel.name) === k) { if (!g.some(x => x.ref === 'bel')) g.push({ ref: 'bel' }); }
      else if (!g.some(x => !x.ref && nameKey(x.name) === k)) g.push(o);
      p.gegen = g;
      V.focus = api.mobile() ? '' : 'sdGegen';
    }
    V.q[key] = '';
    api.persist(false); api.render();
  }
  async function delPerson(api) {
    const data = api.d.data, P = arr(data.personen), p = P[V.i]; if (!p) return;
    if (!isEmpty(p)) {
      const ok = await api.ask({ title: 'Person entfernen?', text: `„${heading(data, V.i)}“ wird mit der Schilderung aus diesem Vorgang gelöscht.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
      if (!ok) return;
    }
    P.splice(V.i, 1); if (!P.length) delete data.personen;
    V.s = 'menu'; V.i = -1; V.last = -1;
    api.persist(false); api.render(); top0();
  }
  function finishPerson(api) {
    const data = api.d.data, p = arr(data.personen)[V.i]; if (!p) return;
    const miss = fehlt(p);
    p.fertig = true; V.last = V.i; V.s = 'menu'; V.i = -1;
    api.persist(false); api.render(); top0();
    api.toast(miss.length ? `Abgeschlossen – noch offen: ${miss.join(', ')} (im Text als [Platzhalter]).` : 'Schilderung abgeschlossen');
  }
  function toDone(api) {
    const d = api.d, data = d.data;
    if (!has(data.nr)) {
      const prev = api.docs().filter(x => x && x.type === 'sch' && x.id !== d.id && has(x.data && x.data.nr)).sort((a, b) => (b.u || 0) - (a.u || 0))[0];
      if (prev) data.nr = cleanNr(prev.data.nr);
    }
    d.status = 'fertig'; V.s = 'done'; V.last = -1;
    api.persist(true); api.render(); top0();
  }

  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    if (b.disabled) return true;
    const d = api.d, data = d.data, a = b.dataset.sd;
    const P = () => { if (!Array.isArray(data.personen)) data.personen = []; return data.personen; };
    const cur = () => P()[V.i];
    const save = () => { api.persist(false); api.render(); };
    switch (a) {
      case 'focus': { if (e.target.tagName !== 'TEXTAREA') { const t = $('#sdText'); if (t) { t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch (er) { /* egal */ } } } return true; }
      case 'art': data.art = b.dataset.v; save(); return true;
      case 'add': {
        if (d.status === 'fertig') d.status = 'entwurf';
        P().push({ rolle: b.dataset.v });
        V.i = P().length - 1; V.s = 'person'; V.last = -1; V.q = { bel: '', gegen: '' };
        save(); top0(); return true;
      }
      case 'edit': V.i = Number(b.dataset.i); V.s = 'person'; V.last = -1; V.q = { bel: '', gegen: '' }; api.render(); top0(); return true;
      case 'up': { const i = Number(b.dataset.i), a2 = P(); if (i > 0 && a2[i]) { [a2[i - 1], a2[i]] = [a2[i], a2[i - 1]]; V.last = V.last === i ? i - 1 : V.last === i - 1 ? i : V.last; save(); } return true; }
      case 'menu': leavePerson(data); save(); top0(); return true;
      case 'set': {
        const path = b.dataset.p;
        setPath(data, path, b.dataset.v);
        if (/\.g$/.test(path) && cur() && !has(cur().nachname)) V.focus = 'sdNn';
        if (path === 'nr') { api.persist(false); live(api); const inp = $('#sdNr'); if (inp) inp.value = b.dataset.v; return true; }
        save(); return true;
      }
      case 'zvr': { const p = cur(); if (!p) return true; if (p.zvr) { delete p.zvr; delete p.bereit; } else p.zvr = true; save(); return true; }
      case 'bereit': { const p = cur(); if (!p) return true; if (p.bereit === false) delete p.bereit; else p.bereit = false; save(); return true; }
      case 'pick': pick(b, api); return true;
      case 'unbel': { const p = cur(); if (!p) return true; delete p.bel; V.focus = 'sdBel'; save(); return true; }
      case 'ungegen': { const p = cur(); if (!p) return true; const g = arr(p.gegen).slice(); g.splice(Number(b.dataset.j), 1); if (g.length) p.gegen = g; else delete p.gegen; save(); return true; }
      case 'gbel': { const p = cur(); if (!p) return true; const g = arr(p.gegen).filter(x => x && x.ref !== 'alle'); const on = g.some(x => x.ref === 'bel'); const n = on ? g.filter(x => x.ref !== 'bel') : [{ ref: 'bel' }, ...g]; if (n.length) p.gegen = n; else delete p.gegen; save(); return true; }
      case 'galle': { const p = cur(); if (!p) return true; if (arr(p.gegen).some(x => x && x.ref === 'alle')) delete p.gegen; else p.gegen = [{ ref: 'alle' }]; save(); return true; }
      case 'copy1': api.copy(block(data, Number(b.dataset.i))); return true;
      case 'copyall': api.copy(paket(data)); return true;
      case 'done1': finishPerson(api); return true;
      case 'del': delPerson(api); return true;
      case 'alle': toDone(api); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.ta) {
      V.q[el.dataset.ta] = el.value;
      const box = $(`[data-ta-list="${el.dataset.ta}"]`); if (box) box.innerHTML = suggHtml(api, api.d.data, el.dataset.ta);
      return true;
    }
    if (el.dataset.sk && el.tagName !== 'SELECT') {
      setPath(api.d.data, el.dataset.sk, el.value);
      api.persist(false);
      if (el.id === 'sdText') grow(el);
      live(api);
      return true;
    }
    return false;
  }
  function change(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.tagName === 'SELECT') { setPath(api.d.data, el.dataset.sk, el.value || undefined); api.persist(false); api.render(); }
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.ta) {
      e.preventDefault();
      const first = $(`[data-ta-list="${el.dataset.ta}"] [data-sd="pick"]`);
      if (first) first.click();
      return true;
    }
    if (el.dataset.next) {
      e.preventDefault();
      const n = document.getElementById(el.dataset.next) || $('#sdText');
      if (n) n.focus(); else el.blur();
      return true;
    }
    return false;
  }
  /** ⌘/Strg + Enter: Person abschließen, in der Übersicht zum Gesamtpaket, dort kopieren. */
  function submit(api) {
    const data = api.d.data;
    if (V.s === 'person') finishPerson(api);
    else if (V.s === 'menu' && arr(data.personen).length) toDone(api);
    else if (V.s === 'done') api.copy(paket(data));
  }

  root.WSchild = Object.freeze({
    id: 'sch', name: 'Schilderungen', short: 'Schilderungen', kurz: 'SCH',
    desc: 'Zeugen, Geschädigte, Beschuldigte und Betroffene · Belehrung, gegenüber, Schilderung · Gesamtpaket mit Abschnittsnummer',
    intro: 'Personen mit + anlegen, je Person Belehrung und Schilderung · Strafanzeige oder Verkehr · Gesamtpaket mit Abschnittsnummer kopieren',
    labels: { newBtn: 'Schilderungen', bericht: 'Schilderungen' },
    steps: [],
    title, subtitle, pill,
    plain: paket,
    text: data => [['', 'Schilderungen', paket(data), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen: () => [], personalien: () => '',
    screen: { open, render, mounted, click, input, change, keydown, submit },
    core: { nameOf, kuerzel, heading, einleitung, gegenText, block, paket, cleanNr, canonRank, parseFree: (data, q, team = []) => parseFree({ team: () => team, docs: () => [] }, data, q), setRanks: m => { RANKS = new Map(Object.entries(m || {}).map(([k, v]) => [nameKey(k), v])); } }
  });
})(typeof window !== 'undefined' ? window : globalThis);
