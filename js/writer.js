/*
 * Workoholic · Bereich „Schriftliche Arbeiten“
 * ---------------------------------------------------------------
 * Vorgangsliste + Aufnahme-Assistent (Schritt für Schritt) + fertiger Bericht.
 * Speichert ausschließlich über WBridge in den verschlüsselten Tresor (AES-256-GCM),
 * nie in localStorage/sessionStorage, nie an einen Server. Module liefern Fragen und Text
 * (z. B. js/vuf.js); dieser Teil kennt nur Feldtypen und zeichnet sie.
 */
(() => {
  'use strict';
  const W = () => window.WBridge;
  const MODULES = {};
  if (window.WVUF) MODULES[window.WVUF.id] = window.WVUF;
  if (window.WVermisst) MODULES[window.WVermisst.id] = window.WVermisst;
  if (window.WHG) MODULES[window.WHG.id] = window.WHG;
  if (window.WAnzeige) MODULES[window.WAnzeige.id] = window.WAnzeige;
  if (window.WFEB) MODULES[window.WFEB.id] = window.WFEB;
  if (window.WSKZ) MODULES[window.WSKZ.id] = window.WSKZ;
  /** Module, die man direkt neu anlegen kann (der FE-Bericht entsteht nur aus der FE-Prüfung). */
  const creatable = () => Object.values(MODULES).filter(m => !m.noNew);
  /** Beschriftungen je Modul (m.labels), sonst die der Verkehrsunfallflucht. */
  const lab = (m, k, def) => (m && m.labels && m.labels[k]) || def;
  /** Zusätzliche Reiter eines Moduls im Ergebnis (m.extraTabs: [{k, l, when?, hint?, text}]). */
  const extraTabs = (m, data) => ((m && m.extraTabs) || []).filter(t => !t.when || t.when(data));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const todayKey = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const has = v => v != null && String(v).trim() !== '';
  const fmtWhen = t => { const d = new Date(t), n = new Date(); const same = d.toDateString() === n.toDateString(); return (same ? 'heute' : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`) + ` ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const stable = v => { if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'; if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'; return JSON.stringify(v ?? null); };
  const getP = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setP(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }

  /* ======================= Zustand ======================= */
  const U = { view: 'list', id: null, step: 0, tab: 'bericht', lastJson: '', vis: [], moreParts: {} };
  try { const s = JSON.parse(sessionStorage.getItem('workoholic:writer') || 'null'); if (s && typeof s === 'object') { U.view = s.view === 'result' ? 'result' : s.view === 'wizard' ? 'wizard' : 'list'; U.id = s.id || null; } } catch (e) { /* egal */ }
  const remember = () => { try { sessionStorage.setItem('workoholic:writer', JSON.stringify({ view: U.view, id: U.id })); } catch (e) { /* egal */ } };
  const doc = () => (U.id ? W().find(U.id) : null);
  const mod = d => (d && MODULES[d.type]) || null;
  const visibleSteps = (m, d) => m.steps.filter(s => !s.when || s.when(d));

  let saveTimer = 0, previewTimer = 0;
  function persist(full = false) {
    const d = doc(); if (!d) return;
    const m = mod(d);
    if (m) d.title = (m.title(d.data) || '').slice(0, 120);
    U.lastJson = stable(d.data);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { W().touch(d, full); renderList(); }, full ? 0 : 350);
  }

  /* ======================= Felder zeichnen ======================= */
  const DGRADE = ['', 'PKA', 'PKAin', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'EPHK', 'EPHKin', 'KA', 'KAin', 'KK', 'KKin', 'KOK', 'KOKin', 'KHK', 'KHKin', 'EKHK', 'EKHKin', 'PR', 'PRin', 'POR', 'PORin', 'KR', 'KRin'];
  /** Amtsbezeichnung aus den Rollen eines Teammitglieds (z. B. Rolle „POK“). */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => ((Array.isArray(roles) ? roles : []).find(r => RANK_RE.test(String(r).trim())) || '').trim();
  const nameKey = n => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
  /** Nachname aus „Max Müller“, „Müller, Max“ oder „Max von der Heide“. */
  const nachname = n => { n = String(n || '').trim(); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  const FZ_ARTEN = [['pkw', 'Pkw'], ['transporter', 'Transporter'], ['lkw', 'Lkw'], ['krad', 'Kraftrad'], ['roller', 'Roller'], ['rad', 'Fahrrad'], ['pedelec', 'Pedelec'], ['anhaenger', 'Anhänger'], ['wohnmobil', 'Wohnmobil'], ['bus', 'Bus'], ['sonst', 'Sonstiges']];
  const FARBEN = ['schwarz', 'weiß', 'silber', 'grau', 'rot', 'blau', 'grün', 'gelb', 'braun', 'beige', 'orange'];
  const ANREDE = [['m', 'Herr'], ['w', 'Frau'], ['d', 'Divers']];

  /** Feldeigenschaften dürfen Funktionen sein (d = Antworten, item = Listeneintrag) – so passt sich z. B. „Er/Sie habe …“ an. */
  const R = (x, d, item, base) => (typeof x === 'function' ? x(d || {}, item, base) : x);
  const label = (f, forId, d, item) => { const l = R(f.l, d, item), h = R(f.h, d, item); return (l ? `<label class="w-lbl" ${forId ? `for="${forId}"` : ''}>${esc(l)}${f.req ? ' <i class="w-req" title="Für den Text wichtig">•</i>' : ''}</label>` : '') + (h ? `<p class="w-hint">${esc(h)}</p>` : ''); };
  const answered = v => (Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.keys(v).length > 0 : has(v));
  /** Werte desselben Feldes aus früheren Vorgängen (neueste zuerst) – zum Antippen statt Tippen. */
  function recentFrom(keys) {
    const docs = ((W() && W().docs()) || []).filter(x => x.id !== U.id).sort((a, b) => (b.u || 0) - (a.u || 0));
    const out = [], seen = new Set();
    for (const x of docs) {
      const vals = {}; let ok = true;
      for (const k of keys) { const v = getP(x.data, k); if (has(v) && typeof v !== 'object') vals[k] = String(v).trim(); }
      if (!has(vals[keys[keys.length - 1]])) ok = false;
      const lab = keys.map(k => vals[k]).filter(Boolean).join(' ');
      if (ok && !seen.has(lab)) { seen.add(lab); out.push({ lab, vals }); }
      if (out.length >= 3) break;
    }
    return out;
  }
  const chipRow = (items, cls = '') => (items.length ? `<div class="w-quick ${cls}">${items.join('')}</div>` : '');
  /** Satzbaustein: fester Satzanfang (grau) + Eingabe, die genau diesen Satz fortsetzt (Beispiel als Platzhalter). */
  function sentenceHtml(f, k, v, d, item, half, ans) {
    const pre = R(f.pre, d, item) || '', post = R(f.post, d, item) || '', ph = R(f.ph, d, item) || '';
    const single = f.t === 'text';
    const caps = single || (pre && !/:$/.test(pre)) ? 'off' : 'sentences';
    const sugg = (R(f.sugg, d, item) || []).filter(x => x && has(x[1])).map(([l, val]) => `<button type="button" class="chip sm" data-sugg="${esc(k)}" data-v="${esc(val)}"${f.join ? ` data-join="${esc(f.join)}"` : ''} aria-pressed="${String(v === val)}">${esc(l)}</button>`);
    const recent = f.recent ? recentFrom(Array.isArray(f.recent) ? f.recent : [k]).map(r => `<button type="button" class="chip sm w-recent" data-multi="${esc(JSON.stringify(r.vals))}">↺ ${esc(r.lab)}</button>`) : [];
    return `<div class="w-q${half}${ans ? ' ans' : ''}" data-q="${esc(k)}">${label(f, fid(k), d, item)}<div class="w-sent${pre ? '' : ' nopre'}${post ? ' haspost' : ''}">${pre ? `<span class="w-sent-pre" aria-hidden="true">${esc(pre)}</span>` : ''}<textarea class="w-sent-in${single ? '' : ' multi'}" id="${fid(k)}" data-k="${esc(k)}" rows="1" style="--rows:${single ? 1 : (f.rows || 3)}"${single ? ' data-single="1" enterkeyhint="next"' : ''}${f.lint ? ` data-lint="${esc(f.lint)}"` : ''}${pre ? ` data-pre="${esc(pre)}"` : ''} placeholder="${esc(ph)}" aria-label="${esc([R(f.l, d, item), pre].filter(Boolean).join(' – '))}" autocomplete="off" autocapitalize="${caps}" spellcheck="${single ? 'false' : 'true'}" maxlength="${f.max || (single ? 240 : 4000)}">${esc(v ?? '')}</textarea>${post ? `<span class="w-sent-post" aria-hidden="true">… ${esc(post)}</span>` : ''}</div><p class="w-lint" hidden></p>${chipRow(recent.concat(sugg))}</div>`;
  }
  const fid = k => 'wf-' + k.replace(/[^\w-]/g, '_');

  function fieldHtml(f, d, base = '') {
    const k = base ? (f.k ? base + '.' + f.k : base) : f.k;
    const v = k ? getP(d, k) : undefined;
    const half = f.w === 'half' ? ' half' : '';
    const item = base ? (getP(d, base) || {}) : undefined; // auch die noch leere erste Listenkarte hat ein Objekt
    const ans = answered(v);
    const Q = `<div class="w-q${half}${ans ? ' ans' : ''}" data-q="${esc(k || '')}">`;
    const L = forId => label(f, forId, d, item);
    switch (f.t) {
      case 'info': return `<div class="w-q full"><div class="w-info">${esc(R(f.text, d, item))}</div></div>`;
      /* Schnellwahl: ein Tipp setzt mehrere Antworten (o: [[Beschriftung, {Pfad: Wert|null}, Zusatz?]]) */
      case 'preset': {
        const o = (R(f.o, d, item, base) || []).filter(x => x && x[1]);
        if (!o.length) return '';
        const same = vals => Object.entries(vals).every(([kk, vv]) => JSON.stringify(getP(d, kk) ?? null) === JSON.stringify(vv ?? null));
        return `<div class="w-q full w-preset">${f.l ? `<span class="w-lbl">${esc(R(f.l, d, item))}</span>` : ''}<div class="w-pre-row">${o.map(([lab, vals, sub]) => { const on = same(vals); return `<button type="button" class="w-pre${on ? ' on' : ''}" data-multi="${esc(JSON.stringify(vals))}" aria-pressed="${on}"><b>${esc(lab)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`; }).join('')}</div></div>`;
      }
      /* Ausgabe: live erzeugter Text des Moduls (f.fn), zum Durchgeben/Kopieren direkt im Schritt */
      case 'out': {
        const m = mod(doc()); const txt = m && typeof m[f.fn] === 'function' ? m[f.fn](d) : '';
        return `<div class="w-q full w-out"><div class="w-out-h"><span class="w-lbl">${esc(R(f.l, d, item) || 'Text')}</span><button type="button" class="btn btn-light btn-sm" data-copy-out="${esc(f.fn)}">Kopieren</button></div>${f.h ? `<p class="w-hint">${esc(R(f.h, d, item))}</p>` : ''}<pre class="w-out-t" data-fn="${esc(f.fn)}">${esc(txt || '– noch nichts erfasst –')}</pre></div>`;
      }
      /* Eigenes Bedienelement eines Moduls (z. B. Zeichenfläche); das Modul füllt es über m.mount(el, k, data, api) */
      case 'custom': return `<div class="w-q full w-custom" data-custom="${esc(f.k)}"></div>`;
      /* Zwischentitel: gliedert einen Schritt in Abschnitte (keine Antwort, kein Datenfeld) */
      case 'head': return `<div class="w-q full w-head"><span class="w-head-t">${esc(R(f.text, d, item))}</span>${f.h ? `<span class="w-head-h">${esc(R(f.h, d, item))}</span>` : ''}</div>`;
      case 'yn': {
        const o = Array.isArray(R(f.o, d, item)) ? R(f.o, d, item) : [['ja', 'Ja'], ['nein', 'Nein']];
        return `${Q}${L()}<div class="w-seg" role="group" aria-label="${esc(R(f.l, d, item) || '')}">${o.map(([val, lab]) => `<button type="button" class="w-opt${val === 'ja' ? ' yes' : val === 'nein' ? ' no' : ''}" data-set="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(v === val)}">${esc(lab)}</button>`).join('')}</div></div>`;
      }
      case 'choice': return `${Q}${L()}<div class="w-chips" role="group">${R(f.o, d, item).map(([val, lab]) => `<button type="button" class="chip" data-set="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(v === val)}">${esc(lab)}</button>`).join('')}</div></div>`;
      case 'multi': { const a = Array.isArray(v) ? v : []; return `${Q}${L()}<div class="w-chips" role="group">${R(f.o, d, item).map(([val, lab]) => `<button type="button" class="chip" data-toggle="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(a.includes(val))}">${esc(lab)}</button>`).join('')}</div></div>`; }
      case 'text': case 'area': {
        if (f.pre || f.t === 'area') return sentenceHtml(f, k, v, d, item, half, ans);
        const ph = R(f.ph, d, item) || '';
        const recent = f.recent ? recentFrom(Array.isArray(f.recent) ? f.recent : [k]).map(r => `<button type="button" class="chip sm w-recent" data-multi="${esc(JSON.stringify(r.vals))}">↺ ${esc(r.lab)}</button>`) : [];
        const sugg = (R(f.sugg, d, item, base) || []).filter(x => x && has(x[1])).map(([l, val]) => `<button type="button" class="chip sm" data-sugg="${esc(k)}" data-v="${esc(val)}"${f.join ? ` data-join="${esc(f.join)}"` : ''} aria-pressed="${String(v === val)}">${esc(l)}</button>`);
        return `${Q}${L(fid(k))}<input class="input" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false" enterkeyhint="next" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} maxlength="${f.max || 200}">${chipRow(recent.concat(sugg))}</div>`;
      }
      case 'crewpick': {
        const all = [...(getP(d, 'einsatz.kraefte') || []), ...(getP(d, 'einsatz.wagen') || []).flatMap(w => (w && Array.isArray(w.crew) ? w.crew : []))];
        const crew = [...new Set(all.filter(c => c && has(c.name)).map(c => [c.grad, f.kurz ? nachname(c.name) : c.name].filter(Boolean).join(' ')))];
        return `${Q}${L(fid(k))}${crew.length ? `<div class="w-chips">${crew.map(c => `<button type="button" class="chip" data-set="${esc(k)}" data-v="${esc(c)}" aria-pressed="${String(v === c)}">${esc(c)}</button>`).join('')}</div>` : ''}<input class="input${crew.length ? ' w-after-chips' : ''}" id="${fid(k)}" data-k="${esc(k)}" value="${esc(crew.includes(v) ? '' : (v ?? ''))}" placeholder="${crew.length ? 'oder andere Person, z. B. PK Weber' : 'z. B. POK Müller'}" autocomplete="off" spellcheck="false" enterkeyhint="next" maxlength="60"></div>`;
      }
      case 'date': {
        const q = f.q ? `<div class="w-quick">${(f.q === 'heute' ? [['Heute', todayKey(0)], ['Gestern', todayKey(-1)]] : [['Gestern', todayKey(-1)], ['Heute', todayKey(0)]]).map(([l, val]) => `<button type="button" class="chip sm" data-set="${esc(k)}" data-v="${val}" aria-pressed="${String(v === val)}">${l}</button>`).join('')}</div>` : '';
        return `${Q}${L(fid(k))}<input class="input" type="date" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}">${q}</div>`;
      }
      case 'time': {
        const q = f.q ? `<div class="w-quick"><button type="button" class="chip sm" data-set="${esc(k)}" data-v="__now">Jetzt</button></div>` : '';
        return `${Q}${L(fid(k))}<input class="input" type="time" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}">${q}</div>`;
      }
      case 'number': case 'euro': {
        const step = f.step || 1, unit = f.t === 'euro' ? '€' : (f.unit || '');
        const sl = f.t === 'euro' || step % 1 ? '' : step;
        const qv = R(f.q, d, item);
        const q = Array.isArray(qv) ? `<div class="w-quick">${qv.map(n => `<button type="button" class="chip sm" data-set="${esc(k)}" data-v="${n}" data-n="1" aria-pressed="${String(Number(v) === n)}">${f.t === 'euro' ? n.toLocaleString('de-DE') + ' €' : n.toLocaleString('de-DE') + (unit && unit !== '€' ? ' ' + unit : '')}</button>`).join('')}</div>` : '';
        return `${Q}${L(fid(k))}<div class="w-num"><button type="button" class="step" data-step="${esc(k)}" data-d="${-step}" aria-label="weniger">−${sl}</button><input class="input mono" type="number" inputmode="${step % 1 ? 'decimal' : 'numeric'}" id="${fid(k)}" data-k="${esc(k)}" data-num="1" value="${esc(v ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${step}" placeholder="–">${unit ? `<span class="w-unit">${unit}</span>` : ''}<button type="button" class="step" data-step="${esc(k)}" data-d="${step}" aria-label="mehr">+${sl}</button></div>${q}</div>`;
      }
      case 'crew': {
        const rows = Array.isArray(v) && v.length ? v : [{}];
        const max = f.max || 6;
        // Wer schon in einer Besatzung dieses Vorgangs steht, wird nicht noch einmal angeboten
        const used = new Set([...rows, ...(getP(d, 'einsatz.kraefte') || []), ...(getP(d, 'einsatz.wagen') || []).flatMap(w => (w && Array.isArray(w.crew) ? w.crew : []))].filter(r => r && has(r.name)).map(r => nameKey(r.name)));
        const team = rows.filter(r => r && has(r.name)).length < max ? ((W() && W().team && W().team()) || []).filter(p => p && has(p.name) && !used.has(nameKey(p.name))) : [];
        const sel = (r, i) => { const g = (r && r.grad) || ''; const list = DGRADE.includes(g) ? DGRADE : [...DGRADE, g]; return `<select class="input w-grad" data-k="${esc(k)}.${i}.grad" aria-label="Amtsbezeichnung">${list.map(x => `<option value="${esc(x)}" ${g === x ? 'selected' : ''}>${esc(x || 'Amtsbez.')}</option>`).join('')}</select>`; };
        const chips = team.length ? `<div class="w-crew-team"><div class="w-chips">${team.slice(0, 40).map(p => { const g = rankOf(p.roles); return `<button type="button" class="chip sm" data-crew-pick="${esc(k)}" data-v="${esc(JSON.stringify({ grad: g, name: p.name }))}">+ ${esc([g, p.name].filter(Boolean).join(' '))}</button>`; }).join('')}</div></div>` : '';
        return `<div class="w-q full">${L()}${chips}<div class="w-crew">${rows.map((r, i) => `<div class="w-crew-row">${sel(r, i)}<input class="input" data-k="${esc(k)}.${i}.name" value="${esc(r && r.name || '')}" placeholder="Name" autocomplete="off" spellcheck="false" maxlength="60"><button type="button" class="icon-btn sm" data-crew-del="${i}" data-crew-k="${esc(k)}" aria-label="Entfernen" ${rows.length === 1 && !has(r && r.name) ? 'disabled' : ''}><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('')}</div>${rows.length < max ? `<button type="button" class="chip" data-crew-add="${esc(k)}">+ Weitere Person</button>` : ''}${lastCrew(rows, k)}</div>`;
      }
      /* Streifenwagen: je Fahrzeug eine Karte, Personen per Anfangsbuchstaben aus Team und früheren Vorgängen */
      case 'streifen': {
        const cars = Array.isArray(v) && v.length ? v : [{}];
        const any = cars.some(w => w && Array.isArray(w.crew) && w.crew.some(c => c && has(c.name)));
        const cards = cars.map((w, ci) => {
          const crew = (w && Array.isArray(w.crew) ? w.crew : []).map((c, pi) => [c, pi]).filter(([c]) => c && has(c.name));
          return `<div class="w-sub w-car"><div class="w-sub-h">SW ${ci + 1}<b>Streifenwagen ${ci + 1}</b><span class="grow"></span>${cars.length > 1 ? `<button type="button" class="link danger" data-car-del="${esc(k)}" data-i="${ci}">Entfernen</button>` : ''}</div>${crew.length ? `<div class="w-pers-row">${crew.map(([c, pi]) => `<span class="w-pers">${has(c.grad) ? `<i>${esc(c.grad)}</i>` : ''}<span>${esc(c.name)}</span><button type="button" data-pers-del="${esc(k)}" data-i="${ci}.${pi}" aria-label="${esc([c.grad, c.name].filter(Boolean).join(' '))} entfernen"><svg class="i" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></span>`).join('')}</div>` : ''}<div class="w-combo"><input class="input" id="${fid(k)}-${ci}" data-combo="pers" data-ck="${esc(k)}" data-ci="${ci}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-label="Person für Streifenwagen ${ci + 1}" placeholder="${crew.length ? '+ weitere Person' : 'Person, z. B. M …'}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="60"></div></div>`;
        }).join('');
        return `${Q}${L()}<div class="w-cars">${cards}</div><div class="w-quick w-car-add"><button type="button" class="chip" data-car-add="${esc(k)}">+ Streifenwagen</button>${any ? '' : lastWagen(k)}</div><p class="w-hint">Anfangsbuchstaben tippen: Vorschläge aus deinem Team und früheren Vorgängen. Enter übernimmt, neue Namen gehen auch. Im Text stehen Amtsbezeichnung und Nachname.</p></div>`;
      }
      /* Anschrift im Kreis Gütersloh: Straße mit Vorschlägen (PLZ, Ort), Ortsteil zum Antippen – gemerkt aus früheren Vorgängen */
      case 'adresse': {
        const o = (v && typeof v === 'object') ? v : {};
        const G = window.WGT;
        const list = G ? G.ortsteile(o.ort) : [];
        const cur = String(o.ortsteil || '').trim(), mem = otMemory(o.ort, o.strasse);
        const opts = list.slice(); if (cur && cur !== '-' && !opts.includes(cur)) opts.push(cur);
        const note = cur && cur !== '-' && cur === mem ? 'aus einem früheren Vorgang' : (!list.length && has(o.ort) ? 'für diesen Ort nicht hinterlegt – frei eintragen' : '');
        const inp = (sub, l, ph, extra = '', cls = 'half') => `<div class="w-q ${cls}"><label class="w-lbl" for="${fid(k + '.' + sub)}">${l}</label><input class="input" id="${fid(k + '.' + sub)}" data-k="${esc(k)}.${sub}" value="${esc(o[sub] ?? '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false" ${extra}></div>`;
        return `${Q}${L()}<div class="w-grid w-addr">
          <div class="w-q half w-combo a-str"><label class="w-lbl" for="${fid(k + '.strasse')}">Straße</label><input class="input" id="${fid(k + '.strasse')}" data-k="${esc(k)}.strasse" data-combo="str" data-ck="${esc(k)}" role="combobox" aria-autocomplete="list" aria-expanded="false" value="${esc(o.strasse ?? '')}" placeholder="z. B. Am Fichtenbusch" autocomplete="off" spellcheck="false" enterkeyhint="next" maxlength="120"></div>
          ${inp('hausnr', 'Hausnummer', '32', 'maxlength="12" enterkeyhint="next"', 'half a-hnr')}
          ${inp('plz', 'PLZ', '33378', 'inputmode="numeric" maxlength="5" enterkeyhint="next"', 'half a-plz')}
          ${inp('ort', 'Ort', 'Rheda-Wiedenbrück', `list="wGtOrte" maxlength="60" data-rerender="1" enterkeyhint="next"`, 'half a-ort')}
          <datalist id="wGtOrte">${(G ? G.orte() : []).map(x => `<option value="${esc(x)}"></option>`).join('')}</datalist>
          <div class="w-q full a-ot"><span class="w-lbl">Ortsteil${note ? ` <i class="w-ot-note">· ${esc(note)}</i>` : ''}</span><div class="w-chips">${opts.map(x => `<button type="button" class="chip" data-set="${esc(k)}.ortsteil" data-v="${esc(x)}" aria-pressed="${String(cur === x)}">${esc(x)}</button>`).join('')}<button type="button" class="chip w-recent" data-set="${esc(k)}.ortsteil" data-v="-" aria-pressed="${String(cur === '-')}">ohne Ortsteil</button></div><input class="input w-after-chips w-ot-free" data-k="${esc(k)}.ortsteil" value="${esc(cur && cur !== '-' && !list.includes(cur) ? cur : '')}" placeholder="anderer Ortsteil" autocomplete="off" spellcheck="false" maxlength="40" aria-label="Anderer Ortsteil" data-rerender="1"></div>
        </div>${G ? `<p class="w-hint">${G.count().toLocaleString('de-DE')} Straßen im Kreis Gütersloh. ${esc(G.quelle)}.</p>` : ''}</div>`;
      }
      case 'person': {
        const p = (v && typeof v === 'object') ? v : {};
        const want = f.fields || ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift', 'tel', 'email'];
        const parts = [];
        if (want.includes('geschlecht')) parts.push(`<div class="w-q full"><span class="w-lbl">Anrede</span><div class="w-chips">${ANREDE.map(([val, lab]) => `<button type="button" class="chip" data-set="${esc(k)}.geschlecht" data-v="${val}" aria-pressed="${String(p.geschlecht === val)}">${lab}</button>`).join('')}</div></div>`);
        const txt = (sub, l, ph, extra = '') => `<div class="w-q half"><label class="w-lbl" for="${fid(k + '.' + sub)}">${l}</label><input class="input" id="${fid(k + '.' + sub)}" data-k="${esc(k)}.${sub}" value="${esc(p[sub] ?? '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false" maxlength="120" ${extra}></div>`;
        if (want.includes('nachname')) parts.push(txt('nachname', 'Nachname', 'Nachname'));
        if (want.includes('vorname')) parts.push(txt('vorname', 'Vorname', 'Vorname'));
        if (want.includes('geb')) parts.push(`<div class="w-q half"><label class="w-lbl" for="${fid(k + '.geb')}">Geburtsdatum</label><input class="input" type="date" id="${fid(k + '.geb')}" data-k="${esc(k)}.geb" value="${esc(p.geb ?? '')}"></div>`);
        if (want.includes('tel')) parts.push(txt('tel', 'Telefon', 'nur auf dem Original', 'inputmode="tel"'));
        if (want.includes('anschrift')) parts.push(`<div class="w-q full"><label class="w-lbl" for="${fid(k + '.anschrift')}">Anschrift</label><input class="input" id="${fid(k + '.anschrift')}" data-k="${esc(k)}.anschrift" value="${esc(p.anschrift ?? '')}" placeholder="Straße Nr., PLZ Ort" autocomplete="off" spellcheck="false" maxlength="160"></div>`);
        if (want.includes('email')) parts.push(txt('email', 'E-Mail (optional)', 'für digitale Unfallmitteilung', 'inputmode="email"'));
        return `<div class="w-sub"><div class="w-sub-h">${esc(R(f.l, d, item) || 'Person')}</div><div class="w-grid">${parts.join('')}</div></div>`;
      }
      case 'vehicle': {
        const fz = (v && typeof v === 'object') ? v : {};
        return `<div class="w-sub"><div class="w-sub-h">${esc(R(f.l, d, item) || 'Fahrzeug')}</div><div class="w-grid">
          <div class="w-q full"><span class="w-lbl">Fahrzeugart</span><div class="w-chips">${FZ_ARTEN.map(([val, lab]) => `<button type="button" class="chip" data-set="${esc(k)}.art" data-v="${val}" aria-pressed="${String(fz.art === val)}">${lab}</button>`).join('')}</div></div>
          <div class="w-q half"><label class="w-lbl" for="${fid(k + '.marke')}">Marke</label><input class="input" id="${fid(k + '.marke')}" data-k="${esc(k)}.marke" value="${esc(fz.marke ?? '')}" placeholder="z. B. VW" autocomplete="off" spellcheck="false" maxlength="40"></div>
          <div class="w-q half"><label class="w-lbl" for="${fid(k + '.modell')}">Modell</label><input class="input" id="${fid(k + '.modell')}" data-k="${esc(k)}.modell" value="${esc(fz.modell ?? '')}" placeholder="z. B. Golf" autocomplete="off" spellcheck="false" maxlength="40"></div>
          <div class="w-q full"><label class="w-lbl" for="${fid(k + '.farbe')}">Farbe</label><input class="input" id="${fid(k + '.farbe')}" data-k="${esc(k)}.farbe" value="${esc(fz.farbe ?? '')}" placeholder="z. B. schwarz metallic" autocomplete="off" spellcheck="false" maxlength="40"><div class="w-quick">${FARBEN.map(c => `<button type="button" class="chip sm" data-set="${esc(k)}.farbe" data-v="${c}" aria-pressed="${String(fz.farbe === c)}">${c}</button>`).join('')}</div></div>
          <div class="w-q half"><label class="w-lbl" for="${fid(k + '.kz')}">Kennzeichen${f.fragment ? ' (auch Fragmente, ? für Unbekanntes)' : ''}</label><input class="input mono w-kz" id="${fid(k + '.kz')}" data-k="${esc(k)}.kz" value="${esc(fz.kz ?? '')}" placeholder="ST-AB 123" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16"></div>
          ${f.fragment ? `<div class="w-q half"><span class="w-lbl">Kennzeichen</span><div class="w-seg"><button type="button" class="w-opt" data-set="${esc(k)}.kzFragment" data-v="__false" aria-pressed="${String(!fz.kzFragment)}">vollständig</button><button type="button" class="w-opt" data-set="${esc(k)}.kzFragment" data-v="__true" aria-pressed="${String(!!fz.kzFragment)}">nur Fragment</button></div></div>
          <div class="w-q half"><span class="w-lbl">Ausländisches Kennzeichen?</span><div class="w-seg">${[['ja', 'Ja'], ['nein', 'Nein'], ['unbekannt', '?']].map(([val, lab]) => `<button type="button" class="w-opt" data-set="${esc(k)}.ausland" data-v="${val}" aria-pressed="${String(fz.ausland === val)}">${lab}</button>`).join('')}</div></div>` : ''}
        </div></div>`;
      }
      case 'parts': return partsHtml(f, k, Array.isArray(v) ? v : []);
      case 'list': {
        const items = Array.isArray(v) ? v : [];
        // fixed: zeigt nur schon erfasste Einträge (z. B. die Personen aus einem früheren Schritt) – ohne Hinzufügen/Entfernen
        const fixed = !!f.fixed;
        // min1: die erste Karte steht sofort da – Tippen legt den Eintrag an, kein „Hinzufügen“ nötig
        const rows = items.length ? items : (!fixed && f.min1 ? [{}] : []);
        const shown = rows.map((it, i) => [it, i]).filter(([it, i]) => !f.only || (it && typeof it === 'object' && f.only(d, it, i)));
        const head = (it, i) => (typeof f.item === 'function' ? f.item(it || {}, i, d) : `${f.item || 'Eintrag'} ${i + 1}`);
        const cards = shown.map(([it, i]) => `<div class="w-sub w-item-card"><div class="w-sub-h"><b>${esc(head(it, i))}</b><span class="grow"></span>${items.length && !fixed ? `<button type="button" class="link danger" data-list-del="${esc(k)}" data-i="${i}">Entfernen</button>` : ''}</div><div class="w-grid">${f.sub.filter(sf => !sf.when || sf.when(d, it || {})).map(sf => fieldHtml(sf, d, `${k}.${i}`)).join('')}</div></div>`).join('');
        const add = !fixed && rows.length < (f.max || 8) ? `<button type="button" class="btn btn-ghost btn-sm" data-list-add="${esc(k)}"${f.min1 ? ' data-min1="1"' : ''}>+ ${esc(f.add || (f.item && typeof f.item === 'string' ? f.item + ' hinzufügen' : 'Eintrag hinzufügen'))}</button>` : '';
        const none = shown.length ? '' : `<p class="w-hint">${esc(R(f.empty, d) || `Noch keine ${R(f.l, d) || 'Einträge'} erfasst.`)}</p>`;
        return `<div class="w-q full">${L()}${cards}${add}${none}</div>`;
      }
      /* Markierung je Umstand: Antippen wechselt durch die Zustände (z. B. festgestellt → geschildert → angenommen → aus).
         auto(d) liefert Vorbelegungen aus früheren Antworten; „nein“ hebt eine Vorbelegung auf. */
      case 'marks': {
        const val = v && typeof v === 'object' ? v : {};
        const auto = typeof f.auto === 'function' ? (f.auto(d) || {}) : {};
        const S = f.states || [['fest', 'festgestellt'], ['angabe', 'geschildert'], ['annahme', 'angenommen']];
        const sl = Object.fromEntries(S);
        const groups = R(f.groups, d, item) || [];
        const legend = `<div class="w-mk-legend">${S.map(([s, l]) => `<span><i class="w-mk-dot" data-s="${esc(s)}"></i>${esc(l)}</span>`).join('')}</div>`;
        return `<div class="w-q full w-marks" data-q="${esc(k)}">${L()}${legend}${groups.map(([gt, opts]) => `<div class="w-mk-g"><span class="w-mk-gt">${esc(gt)}</span><div class="w-chips">${opts.map(([key, l]) => {
          const u = val[key], s = u === 'nein' ? '' : (u || auto[key] || ''), isAuto = !u && !!auto[key];
          return `<button type="button" class="chip w-mk${isAuto ? ' auto' : ''}" data-mark="${esc(k)}" data-v="${esc(key)}" data-auto="${esc(auto[key] || '')}" data-s="${esc(s)}" aria-pressed="${String(!!s)}"><span>${esc(l)}</span>${s ? `<small>${esc(sl[s] || (s === 'ja' ? 'liegt vor' : s))}${isAuto ? ' · übernommen' : ''}</small>` : ''}</button>`;
        }).join('')}</div></div>`).join('')}</div>`;
      }
      default: return '';
    }
  }

  /** „Wie beim letzten Vorgang“ – Kräfte mit einem Tipp übernehmen (auch aus der ersten Streifenwagenbesatzung). */
  function lastCrew(rows, k = 'einsatz.kraefte') {
    if (rows.some(r => r && has(r.name))) return '';
    const crewOf = x => { const a = getP(x.data, 'einsatz.kraefte'); if (Array.isArray(a) && a.some(c => c && has(c.name))) return a; const w = getP(x.data, 'einsatz.wagen'); return Array.isArray(w) && w[0] && Array.isArray(w[0].crew) ? w[0].crew : []; };
    const docs = ((W() && W().docs()) || []).filter(x => x.id !== U.id).sort((a, b) => (b.u || 0) - (a.u || 0));
    const prev = docs.find(x => crewOf(x).some(c => c && has(c.name)));
    if (!prev) return '';
    const crew = crewOf(prev).filter(c => c && has(c.name)).map(c => ({ grad: c.grad || '', name: c.name }));
    const vals = { [k]: crew }; const ruf = k === 'einsatz.kraefte' ? getP(prev.data, 'einsatz.rufname') : ''; if (has(ruf)) vals['einsatz.rufname'] = ruf;
    return `<button type="button" class="chip w-recent" data-multi="${esc(JSON.stringify(vals))}">↺ Wie zuletzt: ${esc(crew.map(c => [c.grad, c.name].filter(Boolean).join(' ')).join(' · '))}${has(ruf) ? ' (' + esc(ruf) + ')' : ''}</button>`;
  }

  /** „Wie zuletzt“ für alle Streifenwagen eines früheren Vorgangs. */
  function lastWagen(k) {
    const docs = ((W() && W().docs()) || []).filter(x => x.id !== U.id).sort((a, b) => (b.u || 0) - (a.u || 0));
    const crewsOf = x => (getP(x.data, k) || []).map(w => (w && Array.isArray(w.crew) ? w.crew : []).filter(c => c && has(c.name)).map(c => ({ grad: c.grad || '', name: c.name }))).filter(c => c.length);
    const prev = docs.find(x => Array.isArray(getP(x.data, k)) && crewsOf(x).length);
    if (!prev) return '';
    const w = crewsOf(prev);
    return `<button type="button" class="chip w-recent" data-multi="${esc(JSON.stringify({ [k]: w.map(c => ({ crew: c })) }))}">↺ Wie zuletzt: ${esc(w.map(c => c.map(p => [p.grad, nachname(p.name)].filter(Boolean).join(' ')).join('/')).join(' · '))}</button>`;
  }
  /** Ortsteil, der für dieselbe Straße zuletzt gewählt wurde (aus früheren Vorgängen). */
  function otMemory(ort, strasse) {
    if (!has(ort) || !has(strasse)) return '';
    const docs = ((W() && W().docs()) || []).filter(x => x.id !== U.id).sort((a, b) => (b.u || 0) - (a.u || 0));
    for (const x of docs) { const o = getP(x.data, 'ort'); if (o && o.ort === ort && o.strasse === strasse && has(o.ortsteil) && o.ortsteil !== '-') return o.ortsteil; }
    return '';
  }
  /* ---------- Vorschlagslisten: Kollegen und Straßen ---------- */
  const fold = s => (window.WGT ? window.WGT.fold(s) : String(s || '').toLowerCase().trim());
  const gradOf = t => { const m = /^(e?p[ho]?k|p[ho]?m|pka|e?k[ho]?k|kka|ka|p?or|pr|pd|lpd|kr|kor|kd|lkd)(in)?$/i.exec(t || ''); return m ? m[1].toUpperCase() + (m[2] ? 'in' : '') : ''; };
  const capW = n => (n && n === n.toLowerCase() ? n.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : n);
  const parsePerson = s => { const t = String(s || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean); const g = gradOf(t[0]); return g ? { grad: g, name: capW(t.slice(1).join(' ')) } : { grad: '', name: capW(t.join(' ')) }; };
  /** Team (zuletzt im Dienst zuerst) plus alle Besatzungen früherer Vorgänge, nach Häufigkeit. */
  function crewPool() {
    const out = new Map();
    const add = (grad, name, n) => { if (!has(name)) return; const key = nameKey(name); const ex = out.get(key); if (ex) { ex.n += n; if (!ex.grad && has(grad)) ex.grad = grad; } else out.set(key, { grad: grad || '', name: String(name).trim(), n }); };
    for (const p of ((W() && W().team && W().team()) || [])) add(rankOf(p.roles), p.name, 0);
    for (const x of ((W() && W().docs()) || [])) { if (x.id === U.id) continue; for (const c of [...(getP(x.data, 'einsatz.kraefte') || []), ...(getP(x.data, 'einsatz.wagen') || []).flatMap(w => (w && Array.isArray(w.crew) ? w.crew : []))]) if (c) add(c.grad, c.name, 1); }
    return [...out.values()].sort((a, b) => b.n - a.n);
  }
  const markHit = (txt, q) => { const toks = fold(q).split(' ').filter(Boolean); const f = fold(txt); if (!toks.length || f.length !== String(txt).length) return esc(txt); const on = new Array(f.length).fill(false); for (const t of toks) { let i = -1; while ((i = f.indexOf(t, i + 1)) >= 0) if (i === 0 || f[i - 1] === ' ') { for (let j = i; j < i + t.length; j++) on[j] = true; break; } } let o = false, r = ''; [...String(txt)].forEach((c, i) => { if (on[i] !== o) { r += on[i] ? '<mark>' : '</mark>'; o = on[i]; } r += esc(c); }); return r + (o ? '</mark>' : ''); };
  function persItems(q, k) {
    const toks = fold(q).split(' ').filter(Boolean); if (!toks.length) return [];
    const d = doc(); const usedK = new Set(((d && getP(d.data, k)) || []).flatMap(w => (w && Array.isArray(w.crew) ? w.crew : [])).filter(c => c && has(c.name)).map(c => nameKey(c.name)));
    const hits = crewPool().filter(p => !usedK.has(nameKey(p.name)) && toks.every(t => fold(`${p.grad} ${p.name}`).split(' ').some(w => w.startsWith(t)))).slice(0, 7);
    const typed = parsePerson(q);
    const out = hits.map(p => ({ val: p, html: `<i class="w-pop-g">${esc(p.grad)}</i><span class="w-pop-m">${markHit(p.name, q)}</span>${p.n > 1 ? `<span class="w-pop-s">${p.n}×</span>` : ''}` }));
    if (has(typed.name) && !hits.some(p => nameKey(p.name) === nameKey(typed.name))) out.push({ val: typed, cls: 'w-pop-new', html: `<span class="w-pop-m">„${esc([typed.grad, typed.name].filter(Boolean).join(' '))}“ übernehmen</span>` });
    return hits.length ? [{ head: 'Aus deinem Team' }, ...out] : out;
  }
  function strItems(q) {
    if (!window.WGT) return [];
    const d = doc(); const docs = ((W() && W().docs()) || []).filter(x => x.id !== (d && d.id)).sort((a, b) => (b.u || 0) - (a.u || 0));
    const last = docs.map(x => getP(x.data, 'ort.ort')).find(has) || '';
    return window.WGT.search(q, last, 14).map(s => ({ val: s, cls: 'w-pop-2', html: `<span class="w-pop-m">${markHit(s.strasse, q.replace(/\s+\d+\s?[a-zA-Z]?\s*$/, ''))}</span><span class="w-pop-s">${esc(s.plz)} ${esc(s.ort)}</span>` }));
  }
  const CB = { el: null, list: [], act: -1, picked: 0 };
  function cbClose() { const p = $('#wPop'); if (p) p.remove(); if (CB.el) { CB.el.setAttribute('aria-expanded', 'false'); CB.el.removeAttribute('aria-activedescendant'); } CB.el = null; CB.list = []; CB.act = -1; }
  function cbDraw(el) {
    CB.el = el; CB.list = el.dataset.combo === 'pers' ? persItems(el.value, el.dataset.ck) : strItems(el.value);
    let p = $('#wPop');
    if (!CB.list.length) { if (p) p.remove(); el.setAttribute('aria-expanded', 'false'); CB.act = -1; return; }
    if (!p || p.parentNode !== el.parentNode) { if (p) p.remove(); p = document.createElement('ul'); p.id = 'wPop'; p.className = 'w-pop'; p.setAttribute('role', 'listbox'); el.parentNode.append(p); el.setAttribute('aria-controls', 'wPop'); }
    if (CB.act < 0 || !CB.list[CB.act] || CB.list[CB.act].head) CB.act = CB.list.findIndex(x => !x.head);
    p.innerHTML = CB.list.map((it, i) => (it.head ? `<li class="w-pop-h" role="presentation">${esc(it.head)}</li>` : `<li role="option" id="wPop-${i}" data-i="${i}" class="${it.cls || ''}" aria-selected="${String(i === CB.act)}">${it.html}</li>`)).join('');
    el.setAttribute('aria-expanded', 'true'); if (CB.act >= 0) el.setAttribute('aria-activedescendant', 'wPop-' + CB.act);
  }
  function cbMove(dir) { const idx = CB.list.map((x, i) => (x.head ? -1 : i)).filter(i => i >= 0); if (!idx.length || !CB.el) return; const p = idx.indexOf(CB.act); CB.act = idx[(p + dir + idx.length) % idx.length]; const el = CB.el; cbDraw(el); const li = $(`#wPop [data-i="${CB.act}"]`); if (li) li.scrollIntoView({ block: 'nearest' }); }
  function addPers(k, ci, p, refocus) {
    const d = doc(); if (!d || !p || !has(p.name)) return;
    const cars = Array.isArray(getP(d.data, k)) && getP(d.data, k).length ? JSON.parse(JSON.stringify(getP(d.data, k))) : [{}];
    const car = cars[ci] || (cars[ci] = {}); const crew = (Array.isArray(car.crew) ? car.crew : []).filter(c => c && has(c.name));
    if (cars.some(w => w && Array.isArray(w.crew) && w.crew.some(c => c && nameKey(c.name) === nameKey(p.name)))) return;
    crew.push({ grad: p.grad || '', name: p.name }); car.crew = crew;
    setP(d.data, k, cars); persist(false); renderMain();
    if (refocus) { const el = $(`#wFields [data-combo="pers"][data-ci="${ci}"]`); if (el) el.focus(); }
  }
  function pickStreet(k, s) {
    const d = doc(); if (!d || !s) return;
    const o = { ...(getP(d.data, k) || {}), strasse: s.strasse, plz: s.plz, ort: s.ort };
    if (s.hn && !has(o.hausnr)) o.hausnr = s.hn;
    const mem = otMemory(s.ort, s.strasse); o.ortsteil = mem || '';
    if (!o.ortsteil) delete o.ortsteil;
    setP(d.data, k, o); persist(false); renderMain();
    const nx = $(`#wFields [data-k="${CSS.escape(k + (has(o.hausnr) ? '.ortsteil' : '.hausnr'))}"]`); if (nx && !(W().mobile() && has(o.hausnr))) nx.focus();
  }
  function cbPick(el, it) {
    const kind = el.dataset.combo, k = el.dataset.ck; CB.picked = Date.now();
    if (kind === 'pers') { const p = it ? it.val : parsePerson(el.value); cbClose(); addPers(k, Number(el.dataset.ci), p, true); }
    else if (kind === 'str' && it) { cbClose(); pickStreet(k, it.val); }
  }

  /* ---------- Karosserie-Picker ---------- */
  const KARO = (window.WVUF_CORE && window.WVUF_CORE.KAROSSERIE) || [];
  const SCHADEN = (window.WVUF_CORE && window.WVUF_CORE.SCHADEN) || {};
  const VERLAUF = [['punktuell', 'punktuell'], ['horizontal', 'horizontal'], ['vertikal', 'vertikal'], ['diagonal', 'diagonal'], ['flaechig', 'flächig']];
  const MATERIAL = [['kunststoff', 'Kunststoff'], ['gummi', 'Gummi'], ['metall', 'Metall'], ['glas', 'Glas'], ['holz', 'Holz'], ['mineral', 'Stein / Pflaster']];

  /* ======================= Schadensbild: Fahrzeugskizze ======================= */
  /** Draufsicht, Front oben, linke Fahrzeugseite links. Jede Fläche ist ein Fahrzeugteil aus dem Katalog. */
  const CAR_ZONES = [
    ['Frontschürze links', 46, 22, 46, 24], ['Frontschürze Mitte', 94, 22, 52, 24], ['Frontschürze rechts', 148, 22, 46, 24],
    ['Scheinwerfer links', 46, 48, 34, 20], ['Scheinwerfer rechts', 160, 48, 34, 20],
    ['Motorhaube', 82, 48, 76, 82],
    ['Kotflügel vorne links', 46, 70, 34, 60], ['Kotflügel vorne rechts', 160, 70, 34, 60],
    ['Frontscheibe', 60, 132, 120, 28],
    ['Vordertür links', 46, 162, 30, 80], ['Vordertür rechts', 164, 162, 30, 80],
    ['Hintertür links', 46, 244, 30, 74], ['Hintertür rechts', 164, 244, 30, 74],
    ['Dach', 78, 162, 84, 156],
    ['Seitenwand hinten links', 46, 320, 34, 78], ['Seitenwand hinten rechts', 160, 320, 34, 78],
    ['Heckscheibe', 82, 320, 76, 24], ['Heckklappe', 82, 346, 76, 70],
    ['Rückleuchte links', 46, 400, 34, 16], ['Rückleuchte rechts', 160, 400, 34, 16],
    ['Heckschürze links', 46, 418, 46, 22], ['Heckschürze Mitte', 94, 418, 52, 22], ['Heckschürze rechts', 148, 418, 46, 22]
  ];
  const CAR_OUT = [
    ['Außenspiegel links', 20, 150, 24, 14, 5], ['Außenspiegel rechts', 196, 150, 24, 14, 5],
    ['Felge vorne links', 32, 84, 12, 38, 4], ['Felge vorne rechts', 196, 84, 12, 38, 4],
    ['Felge hinten links', 32, 336, 12, 38, 4], ['Felge hinten rechts', 196, 336, 12, 38, 4]
  ];
  const CAR_PARTS = new Set([...CAR_ZONES, ...CAR_OUT].map(z => z[0]));
  function carSvg(k, names) {
    const z = ([n, x, y, w, h, rx = 5]) => `<rect class="w-z${names.includes(n) ? ' on' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" data-part="${esc(k)}" data-v="${esc(n)}" role="button" tabindex="0" aria-pressed="${String(names.includes(n))}" aria-label="${esc(n)}"><title>${esc(n)}</title></rect>`;
    return `<svg class="w-car-svg" viewBox="0 0 240 462" role="group" aria-label="Fahrzeug von oben – beschädigte Stelle antippen">
      <defs><clipPath id="wCarClip-${esc(k.replace(/\W/g, '_'))}"><rect x="44" y="20" width="152" height="422" rx="38"/></clipPath></defs>
      <text class="w-car-t" x="120" y="12" text-anchor="middle">VORNE</text>
      <text class="w-car-t" x="120" y="458" text-anchor="middle">HINTEN</text>
      <text class="w-car-t" x="10" y="235" text-anchor="middle" transform="rotate(-90 10 235)">LINKS</text>
      <text class="w-car-t" x="230" y="235" text-anchor="middle" transform="rotate(90 230 235)">RECHTS</text>
      ${CAR_OUT.map(z).join('')}
      <rect class="w-car-body" x="44" y="20" width="152" height="422" rx="38"/>
      <g clip-path="url(#wCarClip-${esc(k.replace(/\W/g, '_'))})">${CAR_ZONES.map(z).join('')}</g>
      <g class="w-car-l" aria-hidden="true"><text x="120" y="92">Haube</text><text x="120" y="149">Scheibe</text><text x="120" y="243">Dach</text><text x="120" y="335">Scheibe</text><text x="120" y="384">Heck</text><text x="61" y="205">Tür</text><text x="179" y="205">Tür</text><text x="61" y="284">Tür</text><text x="179" y="284">Tür</text></g>
    </svg>`;
  }
  function partsHtml(f, k, parts) {
    const names = parts.map(p => p && p.name);
    // Seltenere Teile (Säulen, Seitenscheiben, Schweller, Radläufe, Reifen …) als Chips, zugeklappt bis gebraucht
    const rest = KARO.flatMap(b => b.rows.flat()).filter(n => !CAR_PARTS.has(n));
    const restOn = rest.filter(n => names.includes(n)).length, openRest = U.moreParts[k] || restOn > 0;
    const more = `<div class="w-car-more"><button type="button" class="w-more-btn" data-more-parts="${esc(k)}" aria-expanded="${openRest}">Weitere Teile${restOn ? ` · ${restOn} gewählt` : ''}<span aria-hidden="true">${openRest ? '−' : '+'}</span></button>${openRest ? `<div class="w-chips w-rest">${rest.map(n => `<button type="button" class="chip sm w-part-chip" data-part="${esc(k)}" data-v="${esc(n)}" aria-pressed="${String(names.includes(n))}">${esc(n)}</button>`).join('')}</div>` : ''}</div>`;
    const sel = names.filter(Boolean);
    const grid = `<div class="w-car"><div class="w-car-pic">${carSvg(k, names)}</div><div class="w-car-side"><p class="w-hint w-car-hint">${sel.length ? `<b>${sel.length} ${sel.length === 1 ? 'Teil' : 'Teile'}:</b> ${esc(sel.join(', '))}` : 'Auf der Skizze die beschädigten Stellen antippen – erneut tippen hebt die Auswahl auf.'}</p>${more}</div></div>`;
    const cards = parts.map((p, i) => {
      const base = `${k}.${i}`;
      const arten = Array.isArray(p.arten) ? p.arten : [];
      const mat = Array.isArray(p.material) ? p.material : [];
      return `<div class="w-sub w-part-card" id="wpart-${i}"><div class="w-sub-h"><b>${esc(p.name)}</b><span class="grow"></span>${i > 0 ? `<button type="button" class="link" data-part-copy="${esc(k)}" data-i="${i}">↩ wie ${esc(parts[i - 1].name)}</button>` : ''}<button type="button" class="link danger" data-part-del="${esc(k)}" data-i="${i}">Entfernen</button></div><div class="w-grid">
        <div class="w-q full"><span class="w-lbl">Art der Beschädigung <i class="w-hint-i">(Mehrfachauswahl)</i></span><div class="w-chips">${Object.entries(SCHADEN).map(([val, s]) => `<button type="button" class="chip" data-toggle="${base}.arten" data-v="${val}" aria-pressed="${String(arten.includes(val))}">${esc(s.label)}</button>`).join('')}</div><input class="input" data-k="${base}.artFrei" value="${esc(p.artFrei ?? '')}" placeholder="Weitere Beschädigung mit Artikel, z. B. „eine Lackabplatzung“" enterkeyhint="next" autocomplete="off" maxlength="120" style="margin-top:8px"></div>
        <div class="w-q full"><span class="w-lbl">Verlauf</span><div class="w-chips">${VERLAUF.map(([val, lab]) => `<button type="button" class="chip" data-set="${base}.verlauf" data-v="${val}" aria-pressed="${String(p.verlauf === val)}">${lab}</button>`).join('')}</div></div>
        <div class="w-q half"><label class="w-lbl" for="${fid(base + '.von')}">Anstoßhöhe von (cm)</label><div class="w-num"><button type="button" class="step" data-step="${base}.von" data-d="-5">−5</button><input class="input mono" type="number" inputmode="numeric" id="${fid(base + '.von')}" data-k="${base}.von" data-num="1" value="${esc(p.von ?? '')}" min="0" max="400" placeholder="–"><button type="button" class="step" data-step="${base}.von" data-d="5">+5</button></div><div class="w-quick">${[30, 40, 50, 60, 70].map(n => `<button type="button" class="chip sm" data-set="${base}.von" data-v="${n}" data-n="1" aria-pressed="${String(Number(p.von) === n)}">${n}</button>`).join('')}</div></div>
        <div class="w-q half"><label class="w-lbl" for="${fid(base + '.bis')}">bis (cm)</label><div class="w-num"><button type="button" class="step" data-step="${base}.bis" data-d="-5">−5</button><input class="input mono" type="number" inputmode="numeric" id="${fid(base + '.bis')}" data-k="${base}.bis" data-num="1" value="${esc(p.bis ?? '')}" min="0" max="400" placeholder="–"><button type="button" class="step" data-step="${base}.bis" data-d="5">+5</button></div><div class="w-quick">${[30, 40, 50, 60, 70].map(n => `<button type="button" class="chip sm" data-set="${base}.bis" data-v="${n}" data-n="1" aria-pressed="${String(Number(p.bis) === n)}">${n}</button>`).join('')}</div></div>
        <div class="w-q half"><span class="w-lbl">Fremdlackanhaftung?</span><div class="w-seg"><button type="button" class="w-opt yes" data-set="${base}.fremdlack" data-v="ja" aria-pressed="${String(p.fremdlack === 'ja')}">Ja</button><button type="button" class="w-opt no" data-set="${base}.fremdlack" data-v="nein" aria-pressed="${String(p.fremdlack === 'nein')}">Nein</button></div></div>
        ${p.fremdlack === 'ja' ? `<div class="w-q half"><label class="w-lbl" for="${fid(base + '.farbe')}">Farbe des Fremdlacks</label><input class="input" id="${fid(base + '.farbe')}" data-k="${base}.farbe" value="${esc(p.farbe ?? '')}" placeholder="z. B. rot" autocomplete="off" maxlength="40"><div class="w-quick">${FARBEN.map(c => `<button type="button" class="chip sm" data-set="${base}.farbe" data-v="${c}" aria-pressed="${String(p.farbe === c)}">${c}</button>`).join('')}</div></div>` : '<div class="w-q half"></div>'}
        <div class="w-q full"><span class="w-lbl">Weiteres Fremdmaterial</span><div class="w-chips">${MATERIAL.map(([val, lab]) => `<button type="button" class="chip" data-toggle="${base}.material" data-v="${val}" aria-pressed="${String(mat.includes(val))}">${lab}</button>`).join('')}</div></div>
        <div class="w-q full"><span class="w-lbl">Altschaden?</span><div class="w-seg"><button type="button" class="w-opt" data-set="${base}.alt" data-v="nein" aria-pressed="${String(p.alt === 'nein')}">Nein, frisch</button><button type="button" class="w-opt" data-set="${base}.alt" data-v="moeglich" aria-pressed="${String(p.alt === 'moeglich')}">Unklar</button><button type="button" class="w-opt" data-set="${base}.alt" data-v="ja" aria-pressed="${String(p.alt === 'ja')}">Ja, alt</button></div></div>
        <div class="w-q full"><label class="w-lbl" for="${fid(base + '.notiz')}">Ergänzung (optional)</label><input class="input" id="${fid(base + '.notiz')}" data-k="${base}.notiz" value="${esc(p.notiz ?? '')}" placeholder="Ganzer Satz, z. B. „Der Verlauf steigt nach hinten leicht an.“" enterkeyhint="next" autocomplete="off" maxlength="300"></div>
      </div></div>`;
    }).join('');
    return `<div class="w-q full">${label(f)}${grid}${parts.length ? `<p class="w-hint">${parts.length} ${parts.length === 1 ? 'Teil' : 'Teile'} gewählt – Details unten. Die Anstoßhöhe immer über der Fahrbahnoberfläche messen und mit Maßstab fotografieren.</p>` : '<p class="w-hint">Beschädigte Teile antippen – danach erscheinen die Details je Teil.</p>'}${cards}</div>`;
  }

  /* ======================= Vorgangsliste ======================= */
  function renderList() {
    const host = $('#wList'); if (!host) return;
    const docs = (W() && W().docs()) || [];
    const q = (($('#search') || {}).value || '').trim().toLocaleLowerCase('de');
    const rows = docs.slice().sort((a, b) => (b.u || b.updatedAt || 0) - (a.u || a.updatedAt || 0)).filter(d => !q || (d.title + ' ' + (mod(d) ? mod(d).subtitle(d.data) : '')).toLocaleLowerCase('de').includes(q));
    $('#wCount').textContent = docs.length;
    if (!rows.length) { host.innerHTML = `<div class="empty w-empty"><h3>${docs.length ? 'Nichts gefunden' : 'Noch kein Vorgang'}</h3><p>${docs.length ? 'Suche anpassen.' : 'Ein Vorgang führt dich Schritt für Schritt durch die Aufnahme – alles wird verschlüsselt gespeichert, du kannst jederzeit unterbrechen.'}</p>${docs.length ? '' : `<div class="row">${creatable().map((m, i) => `<button type="button" class="btn ${i ? 'btn-ghost' : 'btn-accent'} btn-sm" data-w="new" data-mod="${esc(m.id)}">${esc(lab(m, 'newBtn', 'Neue ' + m.name.replace(/ ohne Personenschaden$/, '')))}</button>`).join('')}</div>`}</div>`; return; }
    host.innerHTML = `<ul class="w-docs">${rows.map(d => {
      const m = mod(d); const total = m ? visibleSteps(m, d.data).length : 1;
      const pct = d.status === 'fertig' ? 100 : Math.round(Math.min(d.step, total) / total * 100);
      return `<li data-sw="${d.id}"><button type="button" class="w-sw-del" data-sw-del="${d.id}" tabindex="-1" aria-hidden="true"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>Löschen</button><button type="button" class="w-doc${d.id === U.id ? ' on' : ''}" data-open="${d.id}"><span class="w-doc-tile${d.status === 'fertig' ? ' done' : ''}">${m ? esc(m.kurz) : '?'}</span><span class="w-doc-main"><span class="w-doc-t">${esc(d.title || (m ? m.name : 'Vorgang'))}</span><span class="w-doc-s">${esc(m ? m.subtitle(d.data) || m.name : d.type)}</span></span><span class="w-doc-side"><span class="pill ${d.status === 'fertig' ? 'pill-lime' : 'pill-quiet'}">${d.status === 'fertig' ? 'Fertig' : pct + ' %'}</span><span class="w-doc-when">${fmtWhen(d.u || d.updatedAt)}</span></span></button></li>`;
    }).join('')}</ul>`;
  }

  /* ---------- Vorgangsliste: nach links wischen löscht (mit Rückgängig) ----------
     Ganz durchwischen (über 45 % der Breite) löscht sofort; ein kürzerer Wisch lässt die Zeile offen und zeigt „Löschen“ zum Antippen. */
  const SW = { li: null, mode: '', x0: 0, y0: 0, base: 0, dx: 0, w: 0, id: null, pid: null, at: 0 };
  const SW_OPEN = 104;
  function swSet(li, x, anim) { const c = $('.w-doc', li); if (!c) return; c.style.transition = anim ? 'transform .24s var(--ease-out)' : 'none'; c.style.transform = x ? `translateX(${x}px)` : ''; }
  function swClose(except) { $$('#wList li.open').forEach(li => { if (li !== except) { li.classList.remove('open'); swSet(li, 0, true); } }); }
  function swDelete(id, li) {
    const d = W().find(id); if (!d) return;
    const title = String(d.title || 'Vorgang');
    const go = () => { const snap = W().remove(id); if (!snap) return; if (U.id === id) { U.id = null; U.view = 'list'; renderMain(); } renderList(); W().toast(`Gelöscht: ${title.length > 40 ? title.slice(0, 39) + '…' : title}`, { undo: snap }); };
    if (!li || matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
    li.classList.add('gone'); const c = $('.w-doc', li); c.style.transition = 'transform .2s var(--ease-out)'; c.style.transform = 'translateX(-110%)';
    setTimeout(go, 200);
  }
  const wl = $('#wList');
  if (wl) {
    wl.addEventListener('pointerdown', e => {
      const li = e.target.closest('li[data-sw]'); if (!li || e.button > 0 || e.target.closest('.w-sw-del')) return;
      swClose(li);
      const base = li.classList.contains('open') ? -SW_OPEN : 0;
      Object.assign(SW, { li, mode: '', x0: e.clientX, y0: e.clientY, base, dx: base, w: li.offsetWidth, id: li.dataset.sw, pid: e.pointerId });
    });
    wl.addEventListener('pointermove', e => {
      if (!SW.li || e.pointerId !== SW.pid) return;
      const dx = e.clientX - SW.x0, dy = e.clientY - SW.y0;
      if (!SW.mode) {
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { SW.li = null; return; } // senkrecht: Liste scrollt
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2 || (dx > 0 && !SW.base)) return;
        SW.mode = 'x'; SW.li.classList.add('sw'); try { SW.li.setPointerCapture(e.pointerId); } catch (er) { /* egal */ }
      }
      const x = Math.min(0, SW.base + dx); SW.dx = x;
      SW.li.classList.toggle('arm', -x > SW.w * 0.45);
      swSet(SW.li, x, false);
    });
    const swEnd = e => {
      if (!SW.li || e.pointerId !== SW.pid) return;
      const li = SW.li; SW.li = null;
      if (SW.mode !== 'x') return;
      SW.at = Date.now(); li.classList.toggle('sw', false);
      if (e.type === 'pointerup' && -SW.dx > SW.w * 0.45) { li.classList.toggle('arm', false); li.classList.toggle('open', false); swDelete(SW.id, li); }
      else if (-SW.dx > 56) { li.classList.toggle('arm', false); li.classList.add('open'); swSet(li, -SW_OPEN, true); }
      else { li.classList.toggle('arm', false); li.classList.toggle('open', false); swSet(li, 0, true); }
    };
    wl.addEventListener('pointerup', swEnd); wl.addEventListener('pointercancel', swEnd);
    document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('#wList li.open')) swClose(); }, true);
  }

  /* ======================= Assistent ======================= */
  function renderMain() {
    const host = $('#wMain'); if (!host) return;
    const d = doc();
    document.body.classList.toggle('w-open', U.view !== 'list' && !!d);
    if (!d || U.view === 'list') { U.view = 'list'; remember(); host.innerHTML = introHtml(); return; }
    const m = mod(d);
    if (!m) { host.innerHTML = `<div class="empty w-empty"><h3>Unbekanntes Modul „${esc(d.type)}“</h3><p>Dieser Vorgang stammt aus einer neueren Version.</p></div>`; return; }
    if (typeof m.upgrade === 'function') { const nd = m.upgrade(d.data); if (nd && typeof nd === 'object') { d.data = nd; persist(true); } }
    { let tt = ''; try { tt = (m.title(d.data) || '').slice(0, 120); } catch (e) { tt = ''; } if (tt && tt !== d.title) persist(true); } // veralteten Titel (z. B. nach Umbenennung eines Moduls) beim Öffnen auffrischen
    U.lastJson = stable(d.data);
    if (U.view === 'result') { host.innerHTML = resultHtml(d, m); remember(); return; }
    const steps = visibleSteps(m, d.data);
    U.step = Math.max(0, Math.min(U.step, steps.length - 1));
    const st = steps[U.step];
    U.vis = visibleKeys(st, d.data);
    const phases = [...new Set(steps.map(s => s.phase))];
    const phaseIdx = phases.indexOf(st.phase);
    const stepsInPhase = steps.filter(s => s.phase === st.phase), posInPhase = stepsInPhase.indexOf(st) + 1;
    const prev = $('#wPreview') && $('#wPreview').open;
    host.innerHTML = `
      <div class="w-top">
        <button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button>
        <div class="w-top-t"><span class="spaced">${esc(m.short)} · ${esc(st.phase)} ${posInPhase}/${stepsInPhase.length}</span><div class="w-title">${esc(d.title || m.name)}</div></div>
        <button type="button" class="btn btn-ghost btn-sm" data-w="overview">Übersicht</button>
      </div>
      <nav class="w-rail" aria-label="Phasen">${phases.map((p, i) => `<button type="button" class="w-rail-p${i < phaseIdx ? ' done' : i === phaseIdx ? ' on' : ''}" data-jump="${steps.findIndex(s => s.phase === p)}" title="${esc(p)}"${i === phaseIdx ? ' aria-current="step"' : ''}><i></i><b>${esc(p)}</b></button>`).join('')}</nav>
      <div class="w-prog"><i style="transform:scaleX(${((U.step + 1) / steps.length).toFixed(3)})"></i></div>
      <div class="w-step" data-step="${esc(st.id)}">
        <h2 class="w-h">${esc(R(st.title, d.data))}</h2>
        ${st.lead ? `<p class="w-lead">${esc(R(st.lead, d.data))}</p>` : ''}
        <div class="w-grid" id="wFields">${st.fields.filter(f => !f.when || f.when(d.data)).map(f => fieldHtml(f, d.data)).join('')}</div>
      </div>
      <details class="w-preview" id="wPreview" ${prev ? 'open' : ''}><summary>So steht es im Bericht</summary><pre class="w-pre" id="wPre">${esc(m.preview(st.id, d.data) || '– noch nichts erfasst –')}</pre></details>
      <div class="w-nav">
        <button type="button" class="btn btn-ghost" data-w="prev" ${U.step === 0 ? 'disabled' : ''}>Zurück</button>
        <span class="w-nav-i mono">${U.step + 1} / ${steps.length}</span>
        <span class="grow"></span>
        ${U.step < steps.length - 1 ? `<button type="button" class="btn btn-accent" data-w="next">Weiter</button>` : `<button type="button" class="btn btn-accent" data-w="finish">Bericht erstellen</button>`}
      </div>`;
    remember();
    layoutSentences();
    mountCustom(d, m);
  }
  const visibleKeys = (st, data) => st.fields.filter(f => !f.when || f.when(data)).map(f => f.k || f.text).join('|');

  function introHtml() {
    const mods = creatable();
    return `<div class="w-intro">
      <span class="spaced">Schriftliche Arbeiten</span>
      <h2 class="w-intro-h">Aufnehmen, ohne zu tippen.</h2>
      <p class="w-intro-p">Fragen beantworten – Ja/Nein, antippen, Zahlen – und am Ende steht ein fertiger Text in sauberer Satzführung, bei der Verkehrsunfallflucht der vollständige Befundbericht. Es erscheinen nur Fragen, die zu deinem Fall passen; jede lässt sich überspringen. Alles bleibt verschlüsselt in deinem Tresor; jeder Schritt wird sofort gesichert, du kannst jederzeit unterbrechen.</p>
      <div class="w-mods">${mods.map(m => `<button type="button" class="w-mod" data-w="new" data-mod="${esc(m.id)}"><span class="w-mod-tile">${esc(m.kurz)}</span><span><b>${esc(m.name)}</b><small>${((n) => (n === 1 ? 'Ein Abschnitt' : n + ' Phasen'))(new Set(m.steps.map(s => s.phase)).size)}, nur passende Fragen · ${esc(m.desc || 'Befundbericht nach Anlage 6, Kurzsachverhalt, Fahndungstext, offene Punkte')}</small></span></button>`).join('')}</div>
      <p class="w-hint">Tastatur: <b class="kbd">N</b> neuer Vorgang · <b class="kbd">S</b> Bereich wechseln (<b class="kbd">7</b>) · <b class="kbd">⌘/Strg ⏎</b> weiter</p>
    </div>`;
  }

  /* ======================= Ergebnis ======================= */
  function resultHtml(d, m) {
    const sec = m.text(d.data);
    const offen = m.offen(d.data);
    const fah = m.fahndung(d.data);
    const extras = extraTabs(m, d.data);
    const tabs = [['bericht', lab(m, 'bericht', 'Befundbericht')], ...extras.map(t => [t.k, t.l]), ['kurz', lab(m, 'kurz', 'Kurzsachverhalt')], ...(fah ? [['fahndung', 'Fahndung']] : []), ['offen', `${lab(m, 'offen', 'Offene Punkte')}${offen.length ? ' · ' + offen.length : ''}`], ['pers', 'Personalien']];
    if (!tabs.some(t => t[0] === U.tab)) U.tab = 'bericht';
    const extra = extras.find(t => t.k === U.tab);
    let body = '';
    if (U.tab === 'bericht') body = `<div class="w-report">${sec.map(([n, t, txt, sid]) => txt == null ? `<h3 class="w-rh">${n} ${esc(t)}</h3>` : `<div class="w-rs"><h4 class="w-rsh">${n} ${esc(t)}<button type="button" class="link" data-edit="${esc(stepForSection(m, sid, d.data))}">Bearbeiten</button></h4><div class="w-rb${/\[[^\]]+\]/.test(txt) ? ' has-ph' : ''}">${reportHtml(txt)}</div></div>`).join('')}</div>`;
    else if (extra) { const tx = extra.text(d.data) || ''; body = `<div class="w-report">${extra.hint ? `<p class="w-hint">${esc(extra.hint)}</p>` : ''}<div class="w-rb${/\[[^\]]+\]/.test(tx) ? ' has-ph' : ''}">${reportHtml(tx)}</div></div>`; }
    else if (U.tab === 'kurz') body = `<div class="w-report"><p class="w-hint">${esc(lab(m, 'kurzHint', 'Für die Kurzbeschreibung im Vorgang und die Unfallmitteilung. Vor dem Nachsenden der Unfallmitteilung ist der Kurzsachverhalt aus der ViVA-Kurzbeschreibung zu löschen (DA 1.1).'))}</p><div class="w-rb">${reportHtml(m.kurzText(d.data))}</div></div>`;
    else if (U.tab === 'fahndung') body = `<div class="w-report"><p class="w-hint">${esc(lab(m, 'fahndungHint', 'Für die Leitstelle / Funkfahndung – kurz und sendefähig.'))}</p><div class="w-rb">${esc(fah)}</div></div>`;
    else if (U.tab === 'offen') body = `<div class="w-report">${offen.length ? `<ul class="w-offen">${offen.map((o, i) => `<li><label class="check-line"><input type="checkbox" data-offen="${i}"> <span>${esc(o)}</span></label></li>`).join('')}</ul><p class="w-hint">${esc(lab(m, 'offenHint', 'Angehakte Punkte landen als Todos im Planner.'))}</p><button type="button" class="btn btn-ghost btn-sm" data-w="todos">Ausgewählte als Todos anlegen</button>` : `<div class="empty w-empty"><h3>Nichts offen</h3><p>${esc(lab(m, 'offenEmpty', 'Alle Pflichtpunkte aus Erlass und Dienstanweisung sind abgedeckt.'))}</p></div>`}</div>`;
    else body = `<div class="w-report"><p class="w-hint">${esc(lab(m, 'persHint', 'Gesondert vom Befundbericht – Telefonnummern nur auf dem Original (DA 1.1). Nicht in den Berichtstext kopieren.'))}</p><div class="w-rb mono-sm">${esc(m.personalien(d.data))}</div></div>`;
    const phCount = sec.reduce((n, s) => n + (s[2] ? (s[2].match(/\[[^\]]+\]/g) || []).length : 0), 0);
    return `
      <div class="w-top">
        <button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button>
        <div class="w-top-t"><span class="spaced">${esc(m.short)} · ${d.status === 'fertig' ? 'Fertig' : 'Entwurf'}</span><div class="w-title">${esc(d.title || m.name)}</div></div>
        <button type="button" class="btn btn-ghost btn-sm" data-w="edit">Bearbeiten</button>
      </div>
      ${phCount ? `<div class="w-warn">${phCount} ${phCount === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} (in eckigen Klammern markiert) – über „Bearbeiten“ am Abschnitt direkt nachtragen.</div>` : ''}
      <div class="w-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" class="fchip" data-tab="${k}" aria-selected="${String(U.tab === k)}">${esc(l)}</button>`).join('')}</div>
      ${body}
      <div class="w-nav">
        <button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button>
        <span class="grow"></span>
        <button type="button" class="btn btn-ghost btn-sm" data-w="txt">Als Datei</button>
        <button type="button" class="btn btn-ghost btn-sm" data-w="done">${d.status === 'fertig' ? 'Wieder öffnen' : 'Als fertig markieren'}</button>
        <button type="button" class="btn btn-light" data-w="copy">Kopieren</button>
      </div>`;
  }
  function stepForSection(m, id, data) {
    const steps = visibleSteps(m, data);
    const i = steps.findIndex(s => s.id === id);
    if (i >= 0) return i;
    const all = m.steps.findIndex(s => s.id === id);
    const j = all < 0 ? -1 : steps.findIndex(s => m.steps.indexOf(s) >= all);
    return j < 0 ? 0 : j;
  }
  /** Berichtstext → HTML: Platzhalter markieren, Zwischenzeilen (Fahrzeug UB 01, UB 02, Z 01) hervorheben. */
  const reportHtml = t => esc(t).replace(/^(Fahrzeug UB \d{2}|UB \d{2}|Z \d{2})$/gm, '<b class="w-rlab">$1</b>').replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>');
  function currentText(d, m) {
    const extra = extraTabs(m, d.data).find(t => t.k === U.tab);
    if (extra) return extra.text(d.data) || '';
    if (U.tab === 'kurz') return m.kurzText(d.data);
    if (U.tab === 'fahndung') return m.fahndung(d.data);
    if (U.tab === 'offen') return m.offen(d.data).map(o => '– ' + o).join('\n');
    if (U.tab === 'pers') return m.personalien(d.data);
    return m.plain(d.data);
  }

  /* ======================= Aktionen ======================= */
  function open(id, view) {
    const d = W().find(id); if (!d) return;
    U.id = id; U.view = view || (d.status === 'fertig' ? 'result' : 'wizard'); U.step = d.step || 0; U.tab = 'bericht';
    renderMain(); renderList();
    window.scrollTo({ top: 0 });
  }
  /** Neuer Vorgang. Ohne Typ und mit mehreren Modulen: erst die Auswahl zeigen. `preset` füllt Daten vor (z. B. Besatzung aus der laufenden Schicht). */
  function newDoc(type, preset) {
    if (!W() || !W().unlocked()) return;
    if (!type && creatable().length > 1) { U.view = 'list'; U.id = null; renderMain(); renderList(); window.scrollTo({ top: 0 }); return; }
    const m = MODULES[type] || creatable()[0]; if (!m) return;
    const pre = preset && typeof preset === 'object' ? preset : ((W().preset && W().preset()) || {});
    const data = { ...pre, einsatz: { datum: todayKey(0), zeit: nowHM(), ...(pre.einsatz || {}) } };
    for (const k of Object.keys(data.einsatz)) if (data.einsatz[k] == null || data.einsatz[k] === '' || (Array.isArray(data.einsatz[k]) && !data.einsatz[k].length)) delete data.einsatz[k];
    // inherit: Einstellungen wie die eigene Vorlage aus dem letzten Vorgang desselben Moduls übernehmen
    for (const ik of (m.inherit || [])) { const prev = (W().docs() || []).filter(x => x.type === m.id && x.data && x.data[ik] != null).sort((a, b) => (b.u || 0) - (a.u || 0))[0]; if (prev) data[ik] = JSON.parse(JSON.stringify(prev.data[ik])); }
    let t0 = ''; try { t0 = (m.title && m.title(data)) || ''; } catch (e) { t0 = ''; }
    const d = W().add({ type: m.id, title: (t0 || m.name).slice(0, 120), status: 'entwurf', step: 0, data });
    if (!d) { W().toast('Vorgang konnte nicht angelegt werden.'); return; }
    open(d.id, 'wizard');
    setTimeout(() => { const f = $('#wFields input, #wFields button'); if (f && !W().mobile()) f.focus(); }, 60);
    return d;
  }
  function go(delta) {
    const d = doc(); if (!d) return;
    const m = mod(d); const steps = visibleSteps(m, d.data);
    U.step = Math.max(0, Math.min(steps.length - 1, U.step + delta));
    d.step = Math.max(d.step || 0, U.step);
    persist(false);
    renderMain(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  /** Fehlen wichtige Angaben, kurz erwähnen – weiter geht es trotzdem (im Bericht stehen dann Platzhalter). */
  function hintMissing() {
    const d = doc(); if (!d) return;
    const st = visibleSteps(mod(d), d.data)[U.step]; if (!st) return;
    const miss = st.fields.filter(f => f.req && f.k && (!f.when || f.when(d.data)) && !answered(getP(d.data, f.k))).map(f => R(f.l, d.data));
    if (miss.length) W().toast(`Noch offen: ${miss.join(', ')} – im Bericht als [Platzhalter] markiert.`);
  }
  function finish() {
    const d = doc(); if (!d) return;
    const m = mod(d); d.step = visibleSteps(m, d.data).length;
    U.view = 'result'; U.tab = 'bericht';
    persist(false); renderMain(); window.scrollTo({ top: 0 });
  }
  /* ---------- Satzbausteine: Satzanfang bündig vor die Eingabe setzen, Höhe mitwachsen lassen ---------- */
  function grow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    let h = ta.scrollHeight;
    if (!ta.value && ta.placeholder) { ta.value = ta.placeholder; h = Math.max(h, ta.scrollHeight); ta.value = ''; }
    ta.style.height = h + 'px';
  }
  /** Eigene Bedienelemente der Module einhängen; Änderungen laufen über api.set → verschlüsselt speichern. */
  function mountCustom(d, m) {
    if (typeof m.mount !== 'function') return;
    $$('#wFields [data-custom]').forEach(el => {
      try { m.mount(el, el.dataset.custom, d.data, { set: (path, v) => { setP(d.data, path, v); persist(); }, get: path => getP(d.data, path), title: () => d.title || m.name }); }
      catch (e) { el.textContent = 'Dieses Element konnte nicht geladen werden.'; }
    });
  }
  function layoutSentences() {
    $$('#wMain .w-sent').forEach(box => {
      const pre = $('.w-sent-pre', box), ta = $('textarea', box); if (!ta) return;
      if (pre) {
        box.classList.remove('block'); ta.style.textIndent = '';
        const pw = pre.getBoundingClientRect().width, tw = ta.clientWidth;
        if (pw > 0 && tw > 0 && pw <= tw * 0.6) ta.style.textIndent = Math.ceil(pw + 5) + 'px';
        else box.classList.add('block');
      }
      grow(ta);
      lintField(ta);
    });
  }
  let layoutTimer = 0;
  addEventListener('resize', () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layoutSentences, 120); });
  /** Kleine Grammatik-Hilfe: indirekte Rede, 3. Person, kein doppelter Satzanfang. */
  function lintText(el) {
    const raw = String(el.value || '').trim(); if (raw.length < 6) return '';
    const t = ' ' + raw.toLowerCase().replace(/[„“"()]/g, ' ') + ' ';
    const pre = (el.dataset.pre || '').toLowerCase().replace(/[:.]$/, '').trim();
    if (pre) { const w = pre.split(/\s+/).slice(0, 2).join(' '); if (w && raw.toLowerCase().startsWith(w)) return 'Der Satzanfang steht schon da – einfach weiterschreiben.'; }
    if (el.dataset.lint === 'konj') {
      const pr = /^(Er|Sie)\b/.test(el.dataset.pre || '') ? el.dataset.pre.split(' ')[0] : 'Er';
      if (/[\s,.](ich|mich|mir|mein|meine|meinen|meinem|meiner|wir|uns|unser|unsere)[\s,.;:!?]/.test(t)) return `In der 3. Person schreiben: „${pr} habe …“ statt „Ich habe …“.`;
      if (raw.length > 14 && /\s(ist|hat|war|waren|bin|sind|hatte|hatten|kam|fuhr|sah)[\s,.;:]/.test(t) && !/\s(habe|sei|seien|hätte|hätten|wäre|wären|käme|führe)[\s,.;:]/.test(t)) return 'Indirekte Rede: „sei“ statt „ist/war“, „habe“ statt „hat“, „sei gefahren“ statt „fuhr“.';
    }
    if (el.dataset.single && /[.!?]\s+[A-ZÄÖÜ]/.test(raw)) return 'Hier nur diesen einen Satz fortsetzen – Weiteres passt in ein eigenes Feld.';
    return '';
  }
  function lintField(el) {
    const q = el.closest('.w-q'); const box = q && $('.w-lint', q); if (!box) return;
    const msg = lintText(el); box.textContent = msg; box.hidden = !msg;
  }
  /** Nach einer Antwort sanft zur nächsten offenen Frage führen. */
  function focusNext(k) {
    const cur = $(`#wFields [data-q="${CSS.escape(k)}"]`); if (!cur) return;
    const qs = $$('#wFields > [data-q]'); const i = qs.indexOf(cur); if (i < 0) return;
    const nxt = qs.slice(i + 1).find(q => !q.classList.contains('ans'));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!nxt) { if (qs.every(q => q.classList.contains('ans'))) { const go = $('.w-nav [data-w=next], .w-nav [data-w=finish]'); if (go) { go.classList.remove('w-go'); void go.offsetWidth; go.classList.add('w-go'); } } return; }
    const r = nxt.getBoundingClientRect(), vh = window.visualViewport ? visualViewport.height : innerHeight;
    if (r.top > vh * 0.7 || r.top < 60) nxt.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    nxt.classList.remove('w-next'); void nxt.offsetWidth; nxt.classList.add('w-next');
  }
  function setVal(k, v, rerender = true) {
    const d = doc(); if (!d) return;
    if (v === '__now') v = nowHM();
    if (v === '__true') v = true; else if (v === '__false') v = false;
    const cur = getP(d.data, k);
    const off = cur === v && typeof v !== 'boolean'; // zweites Tippen hebt die Auswahl auf …
    const now = Date.now();
    if (off && U.lastSet && U.lastSet.k === k && U.lastSet.v === v && now - U.lastSet.t < 700) return; // … aber nicht bei einem Doppel-Tipp
    U.lastSet = { k, v, t: now };
    setP(d.data, k, off ? '' : v);
    persist(false);
    if (rerender) { renderMain(); if (!off) focusNext(k); } else schedulePreview();
  }
  function toggleVal(k, v) {
    const d = doc(); if (!d) return;
    const a = Array.isArray(getP(d.data, k)) ? getP(d.data, k).slice() : [];
    const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v);
    setP(d.data, k, a.length ? a : undefined);
    persist(false); renderMain();
  }
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const d = doc(); if (!d) return; const m = mod(d);
      $$('.w-out-t').forEach(el => { const fn = m && m[el.dataset.fn]; if (typeof fn === 'function') el.textContent = fn(d.data) || '– noch nichts erfasst –'; });
      const pre = $('#wPre'); if (!pre) return; const st = $('.w-step'); if (!st) return; pre.textContent = m.preview(st.dataset.step, d.data) || '– noch nichts erfasst –';
    }, 250);
  }
  async function del() {
    const d = doc(); if (!d) return;
    const r = await W().ask({ title: 'Vorgang löschen?', text: `„${d.title}“ wird aus dem Tresor entfernt – auch auf synchronisierten Geräten. Du kannst es direkt danach rückgängig machen.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
    if (!r) return;
    const snap = W().remove(d.id);
    U.id = null; U.view = 'list'; renderMain(); renderList();
    W().toast('Vorgang gelöscht', { undo: snap });
  }
  async function copy(text) {
    const d = doc(); if (!d) return;
    const t = typeof text === 'string' ? text : currentText(d, mod(d));
    try { await navigator.clipboard.writeText(t); W().toast('In die Zwischenablage kopiert'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); W().toast('Kopiert'); } catch (er) { W().toast('Kopieren nicht möglich – Text markieren und manuell kopieren.'); } ta.remove(); }
  }
  async function download() {
    const d = doc(); if (!d) return;
    const r = await W().ask({ title: 'Als Textdatei speichern', text: 'Die Datei ist unverschlüsselter Klartext und enthält personenbezogene Daten. Nur auf einem dafür vorgesehenen Gerät speichern und danach löschen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Speichern', value: 'ok', cls: 'btn-accent', submit: true }] });
    if (!r) return;
    const m = mod(d);
    const name = (d.title || m.name).replace(/[^\wäöüÄÖÜß.-]+/g, '_').slice(0, 60) + '.txt';
    W().download(name, m.plain(d.data) + extraTabs(m, d.data).map(t => '\n\n---\n' + t.l + '\n' + (t.text(d.data) || '')).join('') + '\n\n---\n' + lab(m, 'kurz', 'Kurzsachverhalt') + '\n' + m.kurzText(d.data) + (m.fahndung(d.data) ? '\n\n---\nFahndung\n' + m.fahndung(d.data) : '') + '\n\n---\nPersonalien (nur Original)\n' + m.personalien(d.data) + '\n', 'text/plain;charset=utf-8');
  }
  function todos() {
    const d = doc(); if (!d) return;
    const m = mod(d); const offen = m.offen(d.data);
    const sel = $$('[data-offen]:checked').map(c => offen[Number(c.dataset.offen)]).filter(Boolean);
    if (!sel.length) { W().toast('Erst Punkte anhaken.'); return; }
    let n = 0;
    for (const o of sel) if (W().addTodo && W().addTodo(o.replace(/\s*\([^)]*\)\.?$/, '').slice(0, 300), d.title)) n++;
    W().toast(n ? `${n} ${n === 1 ? 'Todo' : 'Todos'} im Planner angelegt` : 'Konnte keine Todos anlegen.');
  }
  function overview() {
    const d = doc(); if (!d) return;
    const m = mod(d); const steps = visibleSteps(m, d.data);
    const host = $('#wMain');
    host.innerHTML = `<div class="w-top"><button type="button" class="icon-btn sm w-back" data-w="resume" aria-label="Zurück"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button><div class="w-top-t"><span class="spaced">Übersicht</span><div class="w-title">${esc(d.title || m.name)}</div></div><button type="button" class="btn btn-ghost btn-sm" data-w="finish">Bericht</button></div>
      <ol class="w-ov">${steps.map((s, i) => { const ph = i === 0 || steps[i - 1].phase !== s.phase ? `<li class="w-ov-ph">${esc(s.phase)}</li>` : ''; const answered = s.fields.filter(f => f.k && !(f.when && !f.when(d.data))).filter(f => { const v = getP(d.data, f.k); return Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v).length : has(v); }).length; const total = s.fields.filter(f => f.k && !(f.when && !f.when(d.data))).length; return `${ph}<li><button type="button" class="w-ov-i${i === U.step ? ' on' : ''}" data-jump="${i}"><span class="w-ov-n mono">${i + 1}</span><span class="w-ov-t"><b>${esc(R(s.title, d.data))}</b>${s.lead ? `<small>${esc(R(s.lead, d.data))}</small>` : ''}</span><span class="pill ${answered === total && total ? 'pill-lime' : answered ? 'pill-accent-soft' : 'pill-quiet'}">${answered}/${total}</span></button></li>`; }).join('')}</ol>`;
    window.scrollTo({ top: 0 });
  }

  /* ======================= Ereignisse ======================= */
  const root = $('#schreiben');
  if (root) {
    root.addEventListener('keydown', e => {
      const z = e.target.closest && e.target.closest('.w-z');
      if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); z.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    root.addEventListener('click', e => {
      const sb = e.target.closest('.w-sent');
      if (sb && e.target.tagName !== 'TEXTAREA') { const ta = $('textarea', sb); if (ta) { ta.focus(); const n = ta.value.length; try { ta.setSelectionRange(n, n); } catch (er) { /* egal */ } } return; }
      const b = e.target.closest('button, [data-edit], .w-z'); if (!b) return;
      if (b.dataset.copyOut) { const d = doc(); const m = mod(d); if (d && m && typeof m[b.dataset.copyOut] === 'function') copy(m[b.dataset.copyOut](d.data)); return; }
      if (b.dataset.moreParts) { U.moreParts[b.dataset.moreParts] = b.getAttribute('aria-expanded') !== 'true'; renderMain(); return; }
      if (b.dataset.w) {
        const a = b.dataset.w;
        if (a === 'new') newDoc(b.dataset.mod);
        else if (a === 'list') { U.view = 'list'; U.id = null; renderMain(); renderList(); }
        else if (a === 'prev') go(-1);
        else if (a === 'next') { hintMissing(); go(1); }
        else if (a === 'finish') finish();
        else if (a === 'edit') { const d = doc(); if (d) { U.view = 'wizard'; U.step = 0; renderMain(); } }
        else if (a === 'resume') renderMain();
        else if (a === 'overview') overview();
        else if (a === 'delete') del();
        else if (a === 'copy') copy();
        else if (a === 'txt') download();
        else if (a === 'todos') todos();
        else if (a === 'done') { const d = doc(); if (d) { d.status = d.status === 'fertig' ? 'entwurf' : 'fertig'; persist(true); renderMain(); W().toast(d.status === 'fertig' ? 'Als fertig markiert' : 'Wieder geöffnet'); } }
        return;
      }
      if (b.dataset.swDel) { swDelete(b.dataset.swDel, b.closest('li')); return; }
      if (b.dataset.open) { if (Date.now() - SW.at < 400) return; if (b.closest('li.open')) { swClose(); return; } open(b.dataset.open); return; }
      if (b.dataset.jump) { U.step = Number(b.dataset.jump); const d = doc(); if (d) { d.step = Math.max(d.step || 0, U.step); persist(false); } renderMain(); return; }
      if (b.dataset.edit != null) { U.view = 'wizard'; U.step = Number(b.dataset.edit) || 0; renderMain(); window.scrollTo({ top: 0 }); return; }
      if (b.dataset.tab) { U.tab = b.dataset.tab; renderMain(); return; }
      if (b.dataset.sugg) {
        const d = doc(); if (!d) return;
        const k = b.dataset.sugg; let v = b.dataset.v; const cur = String(getP(d.data, k) || '').trim();
        if (b.dataset.join && cur && cur !== v.trim() && !cur.includes(v.trim())) v = cur.replace(/[\s,;]+$/, '') + b.dataset.join + v;
        setP(d.data, k, v); persist(false); renderMain();
        const ta = $(`#wFields [data-k="${CSS.escape(k)}"]`);
        if (ta && /\s$/.test(v)) { ta.focus(); const n = ta.value.length; try { ta.setSelectionRange(n, n); } catch (er) { /* egal */ } }
        else focusNext(k);
        return;
      }
      if (b.dataset.multi) {
        const d = doc(); if (!d) return;
        let o = {}; try { o = JSON.parse(b.dataset.multi); } catch (er) { return; }
        for (const [k, v] of Object.entries(o)) setP(d.data, k, JSON.parse(JSON.stringify(v)));
        persist(false); renderMain(); W().toast('Übernommen');
        return;
      }
      if (b.dataset.mark) {
        const d = doc(); if (!d) return;
        const S = ['fest', 'angabe', 'annahme'];
        const path = b.dataset.mark + '.' + b.dataset.v, u = getP(d.data, path), auto = b.dataset.auto || '';
        const eff = u === 'nein' ? '' : (u || auto), i = S.indexOf(eff);
        const next = !eff ? S[0] : i < 0 ? S[0] : (i < S.length - 1 ? S[i + 1] : '');
        setP(d.data, path, next || (auto ? 'nein' : undefined));
        persist(false); renderMain(); return;
      }
      if (b.dataset.set) { setVal(b.dataset.set, b.dataset.n ? Number(b.dataset.v) : b.dataset.v); return; }
      if (b.dataset.toggle) { toggleVal(b.dataset.toggle, b.dataset.v); return; }
      if (b.dataset.step) { const d = doc(); if (!d) return; const cur = Number(getP(d.data, b.dataset.step)); const inp = $(`[data-k="${CSS.escape(b.dataset.step)}"]`, root); const min = inp && inp.min !== '' ? Number(inp.min) : 0, max = inp && inp.max !== '' ? Number(inp.max) : Infinity; const v = Math.max(min, Math.min(max, (Number.isFinite(cur) && has(getP(d.data, b.dataset.step)) ? cur : 0) + Number(b.dataset.d))); setP(d.data, b.dataset.step, v); persist(false); if (inp) inp.value = v; schedulePreview(); $$(`[data-set="${CSS.escape(b.dataset.step)}"]`, root).forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.v) === v))); return; }
      if (b.dataset.part) { const d = doc(); if (!d) return; const k = b.dataset.part, a = Array.isArray(getP(d.data, k)) ? getP(d.data, k).slice() : []; const i = a.findIndex(p => p && p.name === b.dataset.v); if (i >= 0) a.splice(i, 1); else a.push({ name: b.dataset.v, alt: 'nein' }); setP(d.data, k, a.length ? a : undefined); persist(false); renderMain(); if (i < 0) setTimeout(() => { const c = $(`#wpart-${a.length - 1}`); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); return; }
      if (b.dataset.partDel) { const d = doc(); if (!d) return; const a = getP(d.data, b.dataset.partDel).slice(); a.splice(Number(b.dataset.i), 1); setP(d.data, b.dataset.partDel, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.partCopy) { const d = doc(); if (!d) return; const a = getP(d.data, b.dataset.partCopy); const i = Number(b.dataset.i); a[i] = { ...JSON.parse(JSON.stringify(a[i - 1])), name: a[i].name }; persist(false); renderMain(); return; }
      if (b.dataset.listAdd) { const d = doc(); if (!d) return; const a = Array.isArray(getP(d.data, b.dataset.listAdd)) ? getP(d.data, b.dataset.listAdd).slice() : []; if (!a.length && b.dataset.min1) a.push({}); a.push({}); setP(d.data, b.dataset.listAdd, a); persist(false); renderMain(); const cs = $$('#wFields .w-item-card'); if (cs.length) cs[cs.length - 1].scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (b.dataset.listDel) { const d = doc(); if (!d) return; const cur = getP(d.data, b.dataset.listDel); if (!Array.isArray(cur)) return; const a = cur.slice(); a.splice(Number(b.dataset.i), 1); setP(d.data, b.dataset.listDel, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.carAdd) { const d = doc(); if (!d) return; const k = b.dataset.carAdd; const a = Array.isArray(getP(d.data, k)) && getP(d.data, k).length ? getP(d.data, k).slice() : [{}]; a.push({}); setP(d.data, k, a); persist(false); renderMain(); const el = $(`#wFields [data-combo="pers"][data-ci="${a.length - 1}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!W().mobile()) el.focus(); } return; }
      if (b.dataset.carDel) { const d = doc(); if (!d) return; const a = (getP(d.data, b.dataset.carDel) || []).slice(); a.splice(Number(b.dataset.i), 1); setP(d.data, b.dataset.carDel, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.persDel) { const d = doc(); if (!d) return; const [ci, pi] = b.dataset.i.split('.').map(Number); const a = JSON.parse(JSON.stringify(getP(d.data, b.dataset.persDel) || [])); if (a[ci] && Array.isArray(a[ci].crew)) a[ci].crew.splice(pi, 1); setP(d.data, b.dataset.persDel, a); persist(false); renderMain(); return; }
      if (b.dataset.crewAdd) { const d = doc(); if (!d) return; const a = Array.isArray(getP(d.data, b.dataset.crewAdd)) ? getP(d.data, b.dataset.crewAdd).slice() : [{}]; a.push({}); setP(d.data, b.dataset.crewAdd, a); persist(false); renderMain(); return; }
      if (b.dataset.crewDel != null) { const d = doc(); if (!d) return; const ck = b.dataset.crewK || 'einsatz.kraefte'; const a = (getP(d.data, ck) || []).slice(); a.splice(Number(b.dataset.crewDel), 1); setP(d.data, ck, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.crewPick) { const d = doc(); if (!d) return; let c = {}; try { c = JSON.parse(b.dataset.v); } catch (er) { return; } const ck = b.dataset.crewPick; const a = (Array.isArray(getP(d.data, ck)) ? getP(d.data, ck) : []).filter(r => r && (has(r.name) || has(r.grad))); a.push({ grad: c.grad || '', name: c.name }); setP(d.data, ck, a); persist(false); renderMain(); return; }
    });
    root.addEventListener('input', e => {
      const el = e.target; if (!el.dataset || !el.dataset.k) return;
      const d = doc(); if (!d) return;
      if (el.dataset.single && /\n/.test(el.value)) { const p0 = el.selectionStart; el.value = el.value.replace(/\s*\n\s*/g, ' '); try { el.setSelectionRange(p0, p0); } catch (er) { /* egal */ } }
      let v = el.value;
      if (el.dataset.num) { v = v === '' ? undefined : Number(v); if (v != null && !Number.isFinite(v)) v = undefined; }
      if (el.classList.contains('w-sent-in')) { grow(el); lintField(el); }
      const q = el.closest('#wFields > [data-q]'); if (q && q.dataset.q === el.dataset.k) q.classList.toggle('ans', has(v));
      if (el.classList.contains('w-kz')) v = v.toUpperCase();
      setP(d.data, el.dataset.k, v);
      persist(false); schedulePreview();
      if (el.classList.contains('w-kz') && el.value !== v) { const p = el.selectionStart; el.value = v; try { el.setSelectionRange(p, p); } catch (er) { /* egal */ } }
    });
    root.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.combo) { CB.act = -1; cbDraw(el); } });
    root.addEventListener('keydown', e => {
      const el = e.target; if (!el.dataset || !el.dataset.combo || e.isComposing) return;
      const open = CB.el === el && !!$('#wPop');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) cbDraw(el); cbMove(e.key === 'ArrowDown' ? 1 : -1); return; }
      if (e.key === 'Escape' && open) { e.stopPropagation(); cbClose(); return; }
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (open && CB.act >= 0) { e.preventDefault(); e.stopImmediatePropagation(); cbPick(el, CB.list[CB.act]); return; }
      if (el.dataset.combo === 'pers' && has(el.value)) { e.preventDefault(); e.stopImmediatePropagation(); cbPick(el, null); return; }
      cbClose();
    });
    root.addEventListener('pointerdown', e => { const li = e.target.closest && e.target.closest('#wPop li[data-i]'); if (!li || !CB.el) return; e.preventDefault(); cbPick(CB.el, CB.list[Number(li.dataset.i)]); });
    // Verlässt man das Feld mit einem getippten Namen (z. B. Tipp auf „+ Streifenwagen“), wird er trotzdem übernommen
    root.addEventListener('focusout', e => {
      const el = e.target; if (!el.dataset || !el.dataset.combo) return;
      const val = el.value, live = el.isConnected && Date.now() - CB.picked > 400, ck = el.dataset.ck, ci = Number(el.dataset.ci);
      setTimeout(() => {
        if (document.activeElement === el) return;
        if (CB.el === el) cbClose();
        if (el.dataset.combo === 'pers' && live && has(val) && Date.now() - CB.picked > 400) addPers(ck, ci, parsePerson(val), false);
      }, 150);
    });
    root.addEventListener('keydown', e => {
      const el = e.target;
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      if (!el.closest || !el.closest('#wFields')) return;
      if (el.tagName === 'TEXTAREA' && !el.dataset.single) return;
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
      e.preventDefault();
      const all = $$('#wFields input, #wFields textarea, #wFields select').filter(x => !x.disabled && x.type !== 'hidden' && x.offsetParent !== null);
      const nx = all[all.indexOf(el) + 1];
      if (nx) nx.focus(); else el.blur();
    });
    root.addEventListener('change', e => {
      const el = e.target; if (!el.dataset || !el.dataset.k) return;
      const d = doc(); if (!d) return;
      if (el.tagName === 'SELECT') { setP(d.data, el.dataset.k, el.value || undefined); persist(false); schedulePreview(); return; }
      if (el.dataset.rerender) { renderMain(); return; }
      // Nur neu zeichnen, wenn sich dadurch sichtbare Felder ändern (sonst bleibt der Fokus, wo er ist)
      const st = $('.w-step'); if (!st) return;
      const m = mod(d); const s = m.steps.find(x => x.id === st.dataset.step); if (!s) return;
      if (visibleKeys(s, d.data) !== U.vis) renderMain();
    });
    document.addEventListener('keydown', e => {
      if (document.body.dataset.area !== 'schreiben' || !W() || !W().unlocked()) return;
      if ($('dialog[open]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && U.view === 'wizard') { e.preventDefault(); const d = doc(); if (!d) return; const steps = visibleSteps(mod(d), d.data); if (U.step < steps.length - 1) go(1); else finish(); }
    });
    const si = $('#search'); if (si) si.addEventListener('input', () => { if (document.body.dataset.area === 'schreiben') renderList(); });
  }

  /* ======================= Öffentlich ======================= */
  window.WWriter = Object.freeze({
    render() {
      if (!W() || !W().unlocked()) return;
      renderList();
      const d = doc();
      if (U.view !== 'list' && !d) { U.view = 'list'; U.id = null; renderMain(); return; }
      if (U.view === 'list') { if (!$('#wMain .w-intro')) renderMain(); return; }
      // Von außen (Sync, Rückgängig) geänderte Daten nur übernehmen, wenn hier gerade nicht getippt wird
      const typing = document.activeElement && document.activeElement.closest('#wMain');
      if (stable(d.data) !== U.lastJson && !typing) renderMain();
      else if (!$('#wMain .w-top')) renderMain();
      else requestAnimationFrame(layoutSentences); // nach dem Einblenden neu ausmessen
    },
    newDoc, open
  });
})();
