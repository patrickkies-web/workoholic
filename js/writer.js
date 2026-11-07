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
  const U = { view: 'list', id: null, step: 0, tab: 'bericht', lastJson: '', vis: [] };
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
  const DGRADE = ['', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'KA', 'KAin', 'KOK', 'KOKin', 'EPHK', 'EPHKin', 'PR', 'PRin'];
  const FZ_ARTEN = [['pkw', 'Pkw'], ['transporter', 'Transporter'], ['lkw', 'Lkw'], ['krad', 'Kraftrad'], ['roller', 'Roller'], ['rad', 'Fahrrad'], ['pedelec', 'Pedelec'], ['anhaenger', 'Anhänger'], ['wohnmobil', 'Wohnmobil'], ['bus', 'Bus'], ['sonst', 'Sonstiges']];
  const FARBEN = ['schwarz', 'weiß', 'silber', 'grau', 'rot', 'blau', 'grün', 'gelb', 'braun', 'beige', 'orange'];
  const ANREDE = [['m', 'Herr'], ['w', 'Frau'], ['d', 'Divers']];

  const label = (f, forId) => (f.l ? `<label class="w-lbl" ${forId ? `for="${forId}"` : ''}>${esc(f.l)}${f.req ? ' <i class="w-req" title="Für den Text wichtig">•</i>' : ''}</label>` : '') + (f.h ? `<p class="w-hint">${esc(f.h)}</p>` : '');
  const fid = k => 'wf-' + k.replace(/[^\w-]/g, '_');

  function fieldHtml(f, d, base = '') {
    const k = base ? (f.k ? base + '.' + f.k : base) : f.k;
    const v = k ? getP(d, k) : undefined;
    const half = f.w === 'half' ? ' half' : '';
    switch (f.t) {
      case 'info': return `<div class="w-q full"><div class="w-info">${esc(f.text)}</div></div>`;
      case 'yn': {
        const o = Array.isArray(f.o) ? f.o : [['ja', 'Ja'], ['nein', 'Nein']];
        return `<div class="w-q${half}">${label(f)}<div class="w-seg" role="group" aria-label="${esc(f.l || '')}">${o.map(([val, lab]) => `<button type="button" class="w-opt${val === 'ja' ? ' yes' : val === 'nein' ? ' no' : ''}" data-set="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(v === val)}">${esc(lab)}</button>`).join('')}</div></div>`;
      }
      case 'choice': return `<div class="w-q${half}">${label(f)}<div class="w-chips" role="group">${f.o.map(([val, lab]) => `<button type="button" class="chip" data-set="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(v === val)}">${esc(lab)}</button>`).join('')}</div></div>`;
      case 'multi': { const a = Array.isArray(v) ? v : []; return `<div class="w-q${half}">${label(f)}<div class="w-chips" role="group">${f.o.map(([val, lab]) => `<button type="button" class="chip" data-toggle="${esc(k)}" data-v="${esc(val)}" aria-pressed="${String(a.includes(val))}">${esc(lab)}</button>`).join('')}</div></div>`; }
      case 'text': return `<div class="w-q${half}">${label(f, fid(k))}<input class="input" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}" autocomplete="off" spellcheck="false" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} maxlength="${f.max || 200}"></div>`;
      case 'area': return `<div class="w-q${half}">${label(f, fid(k))}<textarea class="input" id="${fid(k)}" data-k="${esc(k)}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}" spellcheck="true" maxlength="${f.max || 4000}">${esc(v ?? '')}</textarea></div>`;
      case 'date': {
        const q = f.q ? `<div class="w-quick">${(f.q === 'heute' ? [['Heute', todayKey(0)], ['Gestern', todayKey(-1)]] : [['Gestern', todayKey(-1)], ['Heute', todayKey(0)]]).map(([l, val]) => `<button type="button" class="chip sm" data-set="${esc(k)}" data-v="${val}" aria-pressed="${String(v === val)}">${l}</button>`).join('')}</div>` : '';
        return `<div class="w-q${half}">${label(f, fid(k))}<input class="input" type="date" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}">${q}</div>`;
      }
      case 'time': {
        const q = f.q ? `<div class="w-quick"><button type="button" class="chip sm" data-set="${esc(k)}" data-v="__now">Jetzt</button></div>` : '';
        return `<div class="w-q${half}">${label(f, fid(k))}<input class="input" type="time" id="${fid(k)}" data-k="${esc(k)}" value="${esc(v ?? '')}">${q}</div>`;
      }
      case 'number': case 'euro': {
        const step = f.step || 1, unit = f.t === 'euro' ? '€' : (f.unit || '');
        const q = Array.isArray(f.q) ? `<div class="w-quick">${f.q.map(n => `<button type="button" class="chip sm" data-set="${esc(k)}" data-v="${n}" data-n="1" aria-pressed="${String(Number(v) === n)}">${f.t === 'euro' ? n.toLocaleString('de-DE') + ' €' : n}</button>`).join('')}</div>` : '';
        return `<div class="w-q${half}">${label(f, fid(k))}<div class="w-num"><button type="button" class="step" data-step="${esc(k)}" data-d="${-step}" aria-label="weniger">−${f.t === 'euro' ? '' : step}</button><input class="input mono" type="number" inputmode="${step % 1 ? 'decimal' : 'numeric'}" id="${fid(k)}" data-k="${esc(k)}" data-num="1" value="${esc(v ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${step}" placeholder="–">${unit ? `<span class="w-unit">${unit}</span>` : ''}<button type="button" class="step" data-step="${esc(k)}" data-d="${step}" aria-label="mehr">+${f.t === 'euro' ? '' : step}</button></div>${q}</div>`;
      }
      case 'crew': {
        const rows = Array.isArray(v) && v.length ? v : [{}];
        return `<div class="w-q full">${label(f)}<div class="w-crew">${rows.map((r, i) => `<div class="w-crew-row"><select class="input w-grad" data-k="${esc(k)}.${i}.grad" aria-label="Dienstgrad">${DGRADE.map(g => `<option value="${g}" ${(r && r.grad) === g ? 'selected' : ''}>${g || 'Dienstgrad'}</option>`).join('')}</select><input class="input" data-k="${esc(k)}.${i}.name" value="${esc(r && r.name || '')}" placeholder="Name" autocomplete="off" spellcheck="false" maxlength="60"><button type="button" class="icon-btn sm" data-crew-del="${i}" aria-label="Entfernen" ${rows.length === 1 ? 'disabled' : ''}><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('')}</div>${rows.length < (f.max || 6) ? `<button type="button" class="chip" data-crew-add="${esc(k)}">+ Weitere Person</button>` : ''}</div>`;
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
        return `<div class="w-sub"><div class="w-sub-h">${esc(f.l || 'Person')}</div><div class="w-grid">${parts.join('')}</div></div>`;
      }
      case 'vehicle': {
        const fz = (v && typeof v === 'object') ? v : {};
        return `<div class="w-sub"><div class="w-sub-h">${esc(f.l || 'Fahrzeug')}</div><div class="w-grid">
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
        return `<div class="w-q full">${label(f)}${items.map((it, i) => `<div class="w-sub w-item-card"><div class="w-sub-h">${esc(f.item || 'Eintrag')} ${i + 1}<span class="grow"></span><button type="button" class="link danger" data-list-del="${esc(k)}" data-i="${i}">Entfernen</button></div><div class="w-grid">${f.sub.map(sf => fieldHtml(sf, d, `${k}.${i}`)).join('')}</div></div>`).join('')}${items.length < (f.max || 8) ? `<button type="button" class="btn btn-ghost btn-sm" data-list-add="${esc(k)}">+ ${esc(f.item || 'Eintrag')} hinzufügen</button>` : ''}${!items.length ? `<p class="w-hint">Keine ${esc(f.l || 'Einträge')} erfasst – im Bericht steht dann „konnten nicht festgestellt werden“.</p>` : ''}</div>`;
      }
      default: return '';
    }
  }

  /* ---------- Karosserie-Picker ---------- */
  const KARO = (window.WVUF_CORE && window.WVUF_CORE.KAROSSERIE) || [];
  const SCHADEN = (window.WVUF_CORE && window.WVUF_CORE.SCHADEN) || {};
  const VERLAUF = [['punktuell', 'punktuell'], ['horizontal', 'horizontal'], ['vertikal', 'vertikal'], ['diagonal', 'diagonal'], ['flaechig', 'flächig']];
  const MATERIAL = [['kunststoff', 'Kunststoff'], ['gummi', 'Gummi'], ['metall', 'Metall'], ['glas', 'Glas'], ['holz', 'Holz'], ['mineral', 'Stein / Pflaster']];
  function partsHtml(f, k, parts) {
    const names = parts.map(p => p && p.name);
    const grid = KARO.map(b => `<div class="w-karo-g"><span class="w-karo-l">${esc(b.label)}</span>${b.rows.map(r => `<div class="w-karo-r" style="--n:${r.length}">${r.map(n => `<button type="button" class="w-part" data-part="${esc(k)}" data-v="${esc(n)}" aria-pressed="${String(names.includes(n))}">${esc(n)}</button>`).join('')}</div>`).join('')}</div>`).join('');
    const cards = parts.map((p, i) => {
      const base = `${k}.${i}`;
      const arten = Array.isArray(p.arten) ? p.arten : [];
      const mat = Array.isArray(p.material) ? p.material : [];
      return `<div class="w-sub w-part-card" id="wpart-${i}"><div class="w-sub-h"><b>${esc(p.name)}</b><span class="grow"></span>${i > 0 ? `<button type="button" class="link" data-part-copy="${esc(k)}" data-i="${i}">↩ wie ${esc(parts[i - 1].name)}</button>` : ''}<button type="button" class="link danger" data-part-del="${esc(k)}" data-i="${i}">Entfernen</button></div><div class="w-grid">
        <div class="w-q full"><span class="w-lbl">Art der Beschädigung <i class="w-hint-i">(Mehrfachauswahl)</i></span><div class="w-chips">${Object.entries(SCHADEN).map(([val, s]) => `<button type="button" class="chip" data-toggle="${base}.arten" data-v="${val}" aria-pressed="${String(arten.includes(val))}">${esc(s.label)}</button>`).join('')}</div><input class="input" data-k="${base}.artFrei" value="${esc(p.artFrei ?? '')}" placeholder="Sonstiges …" autocomplete="off" maxlength="120" style="margin-top:8px"></div>
        <div class="w-q full"><span class="w-lbl">Verlauf</span><div class="w-chips">${VERLAUF.map(([val, lab]) => `<button type="button" class="chip" data-set="${base}.verlauf" data-v="${val}" aria-pressed="${String(p.verlauf === val)}">${lab}</button>`).join('')}</div></div>
        <div class="w-q half"><label class="w-lbl" for="${fid(base + '.von')}">Anstoßhöhe von (cm)</label><div class="w-num"><button type="button" class="step" data-step="${base}.von" data-d="-5">−5</button><input class="input mono" type="number" inputmode="numeric" id="${fid(base + '.von')}" data-k="${base}.von" data-num="1" value="${esc(p.von ?? '')}" min="0" max="400" placeholder="–"><button type="button" class="step" data-step="${base}.von" data-d="5">+5</button></div></div>
        <div class="w-q half"><label class="w-lbl" for="${fid(base + '.bis')}">bis (cm)</label><div class="w-num"><button type="button" class="step" data-step="${base}.bis" data-d="-5">−5</button><input class="input mono" type="number" inputmode="numeric" id="${fid(base + '.bis')}" data-k="${base}.bis" data-num="1" value="${esc(p.bis ?? '')}" min="0" max="400" placeholder="–"><button type="button" class="step" data-step="${base}.bis" data-d="5">+5</button></div></div>
        <div class="w-q half"><span class="w-lbl">Fremdlackanhaftung?</span><div class="w-seg"><button type="button" class="w-opt yes" data-set="${base}.fremdlack" data-v="ja" aria-pressed="${String(p.fremdlack === 'ja')}">Ja</button><button type="button" class="w-opt no" data-set="${base}.fremdlack" data-v="nein" aria-pressed="${String(p.fremdlack === 'nein')}">Nein</button></div></div>
        ${p.fremdlack === 'ja' ? `<div class="w-q half"><label class="w-lbl" for="${fid(base + '.farbe')}">Farbe des Fremdlacks</label><input class="input" id="${fid(base + '.farbe')}" data-k="${base}.farbe" value="${esc(p.farbe ?? '')}" placeholder="z. B. rot" autocomplete="off" maxlength="40"><div class="w-quick">${FARBEN.map(c => `<button type="button" class="chip sm" data-set="${base}.farbe" data-v="${c}" aria-pressed="${String(p.farbe === c)}">${c}</button>`).join('')}</div></div>` : '<div class="w-q half"></div>'}
        <div class="w-q full"><span class="w-lbl">Weiteres Fremdmaterial</span><div class="w-chips">${MATERIAL.map(([val, lab]) => `<button type="button" class="chip" data-toggle="${base}.material" data-v="${val}" aria-pressed="${String(mat.includes(val))}">${lab}</button>`).join('')}</div></div>
        <div class="w-q full"><span class="w-lbl">Altschaden?</span><div class="w-seg"><button type="button" class="w-opt" data-set="${base}.alt" data-v="nein" aria-pressed="${String(p.alt === 'nein')}">Nein, frisch</button><button type="button" class="w-opt" data-set="${base}.alt" data-v="moeglich" aria-pressed="${String(p.alt === 'moeglich')}">Unklar</button><button type="button" class="w-opt" data-set="${base}.alt" data-v="ja" aria-pressed="${String(p.alt === 'ja')}">Ja, alt</button></div></div>
        <div class="w-q full"><label class="w-lbl" for="${fid(base + '.notiz')}">Ergänzung (optional)</label><input class="input" id="${fid(base + '.notiz')}" data-k="${base}.notiz" value="${esc(p.notiz ?? '')}" placeholder="z. B. Verlauf von vorne nach hinten ansteigend" autocomplete="off" maxlength="300"></div>
      </div></div>`;
    }).join('');
    return `<div class="w-q full">${label(f)}<div class="w-karo">${grid}</div>${parts.length ? `<p class="w-hint">${parts.length} ${parts.length === 1 ? 'Teil' : 'Teile'} gewählt – Details unten. Die Anstoßhöhe immer über der Fahrbahnoberfläche messen und mit Maßstab fotografieren.</p>` : '<p class="w-hint">Beschädigte Teile antippen – danach erscheinen die Details je Teil.</p>'}${cards}</div>`;
  }

  /* ======================= Vorgangsliste ======================= */
  function renderList() {
    const host = $('#wList'); if (!host) return;
    const docs = (W() && W().docs()) || [];
    const q = (($('#search') || {}).value || '').trim().toLocaleLowerCase('de');
    const rows = docs.slice().sort((a, b) => b.updatedAt - a.updatedAt).filter(d => !q || (d.title + ' ' + (mod(d) ? mod(d).subtitle(d.data) : '')).toLocaleLowerCase('de').includes(q));
    $('#wCount').textContent = docs.length;
    if (!rows.length) { host.innerHTML = `<div class="empty w-empty"><h3>${docs.length ? 'Nichts gefunden' : 'Noch kein Vorgang'}</h3><p>${docs.length ? 'Suche anpassen.' : 'Ein Vorgang führt dich Schritt für Schritt durch die Aufnahme – alles wird verschlüsselt gespeichert, du kannst jederzeit unterbrechen.'}</p>${docs.length ? '' : '<div class="row"><button type="button" class="btn btn-accent btn-sm" data-w="new">Neue Verkehrsunfallflucht</button></div>'}</div>`; return; }
    host.innerHTML = `<ul class="w-docs">${rows.map(d => {
      const m = mod(d); const total = m ? visibleSteps(m, d.data).length : 1;
      const pct = d.status === 'fertig' ? 100 : Math.round(Math.min(d.step, total) / total * 100);
      return `<li><button type="button" class="w-doc${d.id === U.id ? ' on' : ''}" data-open="${d.id}"><span class="w-doc-tile${d.status === 'fertig' ? ' done' : ''}">${m ? esc(m.kurz) : '?'}</span><span class="w-doc-main"><span class="w-doc-t">${esc(d.title || (m ? m.name : 'Vorgang'))}</span><span class="w-doc-s">${esc(m ? m.subtitle(d.data) || m.name : d.type)}</span></span><span class="w-doc-side"><span class="pill ${d.status === 'fertig' ? 'pill-lime' : 'pill-quiet'}">${d.status === 'fertig' ? 'Fertig' : pct + ' %'}</span><span class="w-doc-when">${fmtWhen(d.updatedAt)}</span></span></button></li>`;
    }).join('')}</ul>`;
  }

  /* ======================= Assistent ======================= */
  function renderMain() {
    const host = $('#wMain'); if (!host) return;
    const d = doc();
    document.body.classList.toggle('w-open', U.view !== 'list' && !!d);
    if (!d || U.view === 'list') { U.view = 'list'; remember(); host.innerHTML = introHtml(); return; }
    const m = mod(d);
    if (!m) { host.innerHTML = `<div class="empty w-empty"><h3>Unbekanntes Modul „${esc(d.type)}“</h3><p>Dieser Vorgang stammt aus einer neueren Version.</p></div>`; return; }
    U.lastJson = stable(d.data);
    if (U.view === 'result') { host.innerHTML = resultHtml(d, m); remember(); return; }
    const steps = visibleSteps(m, d.data);
    U.step = Math.max(0, Math.min(U.step, steps.length - 1));
    const st = steps[U.step];
    U.vis = visibleKeys(st, d.data);
    const phases = [...new Set(m.steps.map(s => s.phase))];
    const phaseIdx = phases.indexOf(st.phase);
    const stepsInPhase = steps.filter(s => s.phase === st.phase), posInPhase = stepsInPhase.indexOf(st) + 1;
    const prev = $('#wPreview') && $('#wPreview').open;
    host.innerHTML = `
      <div class="w-top">
        <button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button>
        <div class="w-top-t"><span class="spaced">${esc(m.short)} · ${esc(st.phase)} ${posInPhase}/${stepsInPhase.length}</span><div class="w-title">${esc(d.title || m.name)}</div></div>
        <button type="button" class="btn btn-ghost btn-sm" data-w="overview">Übersicht</button>
      </div>
      <div class="w-rail" aria-hidden="true">${phases.map((p, i) => `<span class="w-rail-p${i < phaseIdx ? ' done' : i === phaseIdx ? ' on' : ''}" title="${esc(p)}"><i></i><b>${esc(p)}</b></span>`).join('')}</div>
      <div class="w-prog"><i style="transform:scaleX(${((U.step + 1) / steps.length).toFixed(3)})"></i></div>
      <div class="w-step" data-step="${esc(st.id)}">
        <h2 class="w-h">${esc(st.title)}</h2>
        ${st.lead ? `<p class="w-lead">${esc(st.lead)}</p>` : ''}
        <div class="w-grid" id="wFields">${st.fields.filter(f => !f.when || f.when(d.data)).map(f => fieldHtml(f, d.data)).join('')}</div>
      </div>
      <details class="w-preview" id="wPreview" ${prev ? 'open' : ''}><summary>So steht es im Bericht</summary><pre class="w-pre" id="wPre">${esc(m.preview(st.id, d.data) || '– noch nichts erfasst –')}</pre></details>
      <div class="w-nav">
        <button type="button" class="btn btn-ghost" data-w="prev" ${U.step === 0 ? 'disabled' : ''}>Zurück</button>
        <span class="w-nav-i mono">${U.step + 1} / ${steps.length}</span>
        <span class="grow"></span>
        ${U.step < steps.length - 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-w="skip">Überspringen</button><button type="button" class="btn btn-accent" data-w="next">Weiter</button>` : `<button type="button" class="btn btn-accent" data-w="finish">Bericht erstellen</button>`}
      </div>`;
    remember();
  }
  const visibleKeys = (st, data) => st.fields.filter(f => !f.when || f.when(data)).map(f => f.k || f.text).join('|');

  function introHtml() {
    const mods = Object.values(MODULES);
    return `<div class="w-intro">
      <span class="spaced">Schriftliche Arbeiten</span>
      <h2 class="w-intro-h">Aufnehmen, ohne zu tippen.</h2>
      <p class="w-intro-p">Fragen beantworten – Ja/Nein, antippen, Zahlen – und am Ende steht ein vollständiger Verkehrsunfallbefundbericht in sauberer Satzführung. Alles bleibt verschlüsselt in deinem Tresor; jeder Schritt wird sofort gesichert, du kannst jederzeit unterbrechen.</p>
      <div class="w-mods">${mods.map(m => `<button type="button" class="w-mod" data-w="new" data-mod="${esc(m.id)}"><span class="w-mod-tile">${esc(m.kurz)}</span><span><b>${esc(m.name)}</b><small>${m.steps.length} Schritte · Befundbericht, Kurzsachverhalt, Fahndungstext, offene Punkte</small></span></button>`).join('')}</div>
      <p class="w-hint">Tastatur: <b class="kbd">N</b> neuer Vorgang · <b class="kbd">S</b> Bereich wechseln · <b class="kbd">⌘/Strg ⏎</b> weiter</p>
    </div>`;
  }

  /* ======================= Ergebnis ======================= */
  function resultHtml(d, m) {
    const sec = m.text(d.data);
    const offen = m.offen(d.data);
    const fah = m.fahndung(d.data);
    const tabs = [['bericht', 'Befundbericht'], ['kurz', 'Kurzsachverhalt'], ...(fah ? [['fahndung', 'Fahndung']] : []), ['offen', `Offene Punkte${offen.length ? ' · ' + offen.length : ''}`], ['pers', 'Personalien']];
    if (!tabs.some(t => t[0] === U.tab)) U.tab = 'bericht';
    let body = '';
    if (U.tab === 'bericht') body = `<div class="w-report">${sec.map(([n, t, txt]) => txt == null ? `<h3 class="w-rh">${n} ${esc(t)}</h3>` : `<div class="w-rs"><h4 class="w-rsh">${n} ${esc(t)}<button type="button" class="link" data-edit="${esc(stepForSection(m, n, d.data))}">Bearbeiten</button></h4><div class="w-rb${/\[[^\]]+\]/.test(txt) ? ' has-ph' : ''}">${esc(txt).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>')}</div></div>`).join('')}</div>`;
    else if (U.tab === 'kurz') body = `<div class="w-report"><p class="w-hint">Für die Kurzbeschreibung im Vorgang und die Unfallmitteilung. Vor dem Nachsenden der Unfallmitteilung ist der Kurzsachverhalt aus der ViVA-Kurzbeschreibung zu löschen (DA 1.1).</p><div class="w-rb">${esc(m.kurzText(d.data)).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>')}</div></div>`;
    else if (U.tab === 'fahndung') body = `<div class="w-report"><p class="w-hint">Für die Leitstelle / Funkfahndung – kurz und sendefähig.</p><div class="w-rb">${esc(fah)}</div></div>`;
    else if (U.tab === 'offen') body = `<div class="w-report">${offen.length ? `<ul class="w-offen">${offen.map((o, i) => `<li><label class="check-line"><input type="checkbox" data-offen="${i}"> <span>${esc(o)}</span></label></li>`).join('')}</ul><p class="w-hint">Angehakte Punkte landen als Todos im Planner.</p><button type="button" class="btn btn-ghost btn-sm" data-w="todos">Ausgewählte als Todos anlegen</button>` : '<div class="empty w-empty"><h3>Nichts offen</h3><p>Alle Pflichtpunkte aus Erlass und Dienstanweisung sind abgedeckt.</p></div>'}</div>`;
    else body = `<div class="w-report"><p class="w-hint">Gesondert vom Befundbericht – Telefonnummern nur auf dem Original (DA 1.1). Nicht in den Berichtstext kopieren.</p><div class="w-rb mono-sm">${esc(m.personalien(d.data))}</div></div>`;
    const phCount = sec.reduce((n, s) => n + (s[2] ? (s[2].match(/\[[^\]]+\]/g) || []).length : 0), 0);
    return `
      <div class="w-top">
        <button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg></button>
        <div class="w-top-t"><span class="spaced">${esc(m.short)} · ${d.status === 'fertig' ? 'Fertig' : 'Entwurf'}</span><div class="w-title">${esc(d.title || m.name)}</div></div>
        <button type="button" class="btn btn-ghost btn-sm" data-w="edit">Bearbeiten</button>
      </div>
      ${phCount ? `<div class="w-warn">${phCount} ${phCount === 1 ? 'Platzhalter' : 'Platzhalter'} in eckigen Klammern – vor dem Kopieren ergänzen oder den Schritt nachtragen.</div>` : ''}
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
  function stepForSection(m, n, data) {
    const map = { '1.1': 'allg1', '1.2': 'allg2', '1.3': 'allg3', '2.1': 'ort', '2.2': 'spuren', '2.3': 'fz02', '2.4': 'fz01', '2.5': 'taeter', '3.1': 'subj', '3.2': 'subj', '3.3': 'subj', '4': 'bewertung', '5.1': 'massnahmen', '5.2': 'massnahmen', '6': 'massnahmen' };
    const g = map[n]; const steps = visibleSteps(m, data);
    const i = steps.findIndex(s => s.gen === g);
    return i < 0 ? 0 : i;
  }
  function currentText(d, m) {
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
  function newDoc(type = 'vuf') {
    if (!W() || !W().unlocked()) return;
    const m = MODULES[type] || Object.values(MODULES)[0]; if (!m) return;
    const d = W().add({ type: m.id, title: m.name, status: 'entwurf', step: 0, data: { einsatz: { datum: todayKey(0), zeit: nowHM() } } });
    if (!d) { W().toast('Vorgang konnte nicht angelegt werden.'); return; }
    open(d.id, 'wizard');
    setTimeout(() => { const f = $('#wFields input, #wFields button'); if (f && !W().mobile()) f.focus(); }, 60);
  }
  function go(delta) {
    const d = doc(); if (!d) return;
    const m = mod(d); const steps = visibleSteps(m, d.data);
    U.step = Math.max(0, Math.min(steps.length - 1, U.step + delta));
    d.step = Math.max(d.step || 0, U.step);
    persist(false);
    renderMain(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function finish() {
    const d = doc(); if (!d) return;
    const m = mod(d); d.step = visibleSteps(m, d.data).length;
    U.view = 'result'; U.tab = 'bericht';
    persist(false); renderMain(); window.scrollTo({ top: 0 });
  }
  function setVal(k, v, rerender = true) {
    const d = doc(); if (!d) return;
    if (v === '__now') v = nowHM();
    if (v === '__true') v = true; else if (v === '__false') v = false;
    const cur = getP(d.data, k);
    setP(d.data, k, (cur === v && typeof v !== 'boolean') ? '' : v); // zweites Tippen hebt die Auswahl auf
    persist(false);
    if (rerender) renderMain(); else schedulePreview();
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
    previewTimer = setTimeout(() => { const d = doc(), pre = $('#wPre'); if (!d || !pre) return; const st = $('.w-step'); if (!st) return; pre.textContent = mod(d).preview(st.dataset.step, d.data) || '– noch nichts erfasst –'; }, 250);
  }
  async function del() {
    const d = doc(); if (!d) return;
    const r = await W().ask({ title: 'Vorgang löschen?', text: `„${d.title}“ wird aus dem Tresor entfernt – auch auf synchronisierten Geräten. Du kannst es direkt danach rückgängig machen.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
    if (!r) return;
    const snap = W().remove(d.id);
    U.id = null; U.view = 'list'; renderMain(); renderList();
    W().toast('Vorgang gelöscht', { undo: snap });
  }
  async function copy() {
    const d = doc(); if (!d) return;
    const t = currentText(d, mod(d));
    try { await navigator.clipboard.writeText(t); W().toast('In die Zwischenablage kopiert'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); W().toast('Kopiert'); } catch (er) { W().toast('Kopieren nicht möglich – Text markieren und manuell kopieren.'); } ta.remove(); }
  }
  async function download() {
    const d = doc(); if (!d) return;
    const r = await W().ask({ title: 'Als Textdatei speichern', text: 'Die Datei ist unverschlüsselter Klartext und enthält personenbezogene Daten. Nur auf einem dafür vorgesehenen Gerät speichern und danach löschen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Speichern', value: 'ok', cls: 'btn-accent', submit: true }] });
    if (!r) return;
    const m = mod(d);
    const name = (d.title || m.name).replace(/[^\wäöüÄÖÜß.-]+/g, '_').slice(0, 60) + '.txt';
    W().download(name, m.plain(d.data) + '\n\n---\nKurzsachverhalt\n' + m.kurzText(d.data) + (m.fahndung(d.data) ? '\n\n---\nFahndung\n' + m.fahndung(d.data) : '') + '\n\n---\nPersonalien (nur Original)\n' + m.personalien(d.data) + '\n', 'text/plain;charset=utf-8');
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
      <ol class="w-ov">${steps.map((s, i) => { const answered = s.fields.filter(f => f.k && !(f.when && !f.when(d.data))).filter(f => { const v = getP(d.data, f.k); return Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v).length : has(v); }).length; const total = s.fields.filter(f => f.k && !(f.when && !f.when(d.data))).length; return `<li><button type="button" class="w-ov-i${i === U.step ? ' on' : ''}" data-jump="${i}"><span class="w-ov-n mono">${i + 1}</span><span class="w-ov-t"><b>${esc(s.title)}</b><small>${esc(s.phase)}</small></span><span class="pill ${answered === total && total ? 'pill-lime' : answered ? 'pill-accent-soft' : 'pill-quiet'}">${answered}/${total}</span></button></li>`; }).join('')}</ol>`;
    window.scrollTo({ top: 0 });
  }

  /* ======================= Ereignisse ======================= */
  const root = $('#schreiben');
  if (root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('button, [data-edit]'); if (!b) return;
      if (b.dataset.w) {
        const a = b.dataset.w;
        if (a === 'new') newDoc(b.dataset.mod || 'vuf');
        else if (a === 'list') { U.view = 'list'; U.id = null; renderMain(); renderList(); }
        else if (a === 'prev') go(-1);
        else if (a === 'next' || a === 'skip') go(1);
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
      if (b.dataset.open) { open(b.dataset.open); return; }
      if (b.dataset.jump) { U.step = Number(b.dataset.jump); const d = doc(); if (d) { d.step = Math.max(d.step || 0, U.step); persist(false); } renderMain(); return; }
      if (b.dataset.edit != null) { U.view = 'wizard'; U.step = Number(b.dataset.edit) || 0; renderMain(); window.scrollTo({ top: 0 }); return; }
      if (b.dataset.tab) { U.tab = b.dataset.tab; renderMain(); return; }
      if (b.dataset.set) { setVal(b.dataset.set, b.dataset.n ? Number(b.dataset.v) : b.dataset.v); return; }
      if (b.dataset.toggle) { toggleVal(b.dataset.toggle, b.dataset.v); return; }
      if (b.dataset.step) { const d = doc(); if (!d) return; const cur = Number(getP(d.data, b.dataset.step)); const inp = $(`[data-k="${CSS.escape(b.dataset.step)}"]`, root); const min = inp && inp.min !== '' ? Number(inp.min) : 0, max = inp && inp.max !== '' ? Number(inp.max) : Infinity; const v = Math.max(min, Math.min(max, (Number.isFinite(cur) && has(getP(d.data, b.dataset.step)) ? cur : 0) + Number(b.dataset.d))); setP(d.data, b.dataset.step, v); persist(false); if (inp) inp.value = v; schedulePreview(); $$(`[data-set="${CSS.escape(b.dataset.step)}"]`, root).forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.v) === v))); return; }
      if (b.dataset.part) { const d = doc(); if (!d) return; const k = b.dataset.part, a = Array.isArray(getP(d.data, k)) ? getP(d.data, k).slice() : []; const i = a.findIndex(p => p && p.name === b.dataset.v); if (i >= 0) a.splice(i, 1); else a.push({ name: b.dataset.v, alt: 'nein' }); setP(d.data, k, a.length ? a : undefined); persist(false); renderMain(); if (i < 0) setTimeout(() => { const c = $(`#wpart-${a.length - 1}`); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); return; }
      if (b.dataset.partDel) { const d = doc(); if (!d) return; const a = getP(d.data, b.dataset.partDel).slice(); a.splice(Number(b.dataset.i), 1); setP(d.data, b.dataset.partDel, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.partCopy) { const d = doc(); if (!d) return; const a = getP(d.data, b.dataset.partCopy); const i = Number(b.dataset.i); a[i] = { ...JSON.parse(JSON.stringify(a[i - 1])), name: a[i].name }; persist(false); renderMain(); return; }
      if (b.dataset.listAdd) { const d = doc(); if (!d) return; const a = Array.isArray(getP(d.data, b.dataset.listAdd)) ? getP(d.data, b.dataset.listAdd).slice() : []; a.push({}); setP(d.data, b.dataset.listAdd, a); persist(false); renderMain(); return; }
      if (b.dataset.listDel) { const d = doc(); if (!d) return; const a = getP(d.data, b.dataset.listDel).slice(); a.splice(Number(b.dataset.i), 1); setP(d.data, b.dataset.listDel, a.length ? a : undefined); persist(false); renderMain(); return; }
      if (b.dataset.crewAdd) { const d = doc(); if (!d) return; const a = Array.isArray(getP(d.data, b.dataset.crewAdd)) ? getP(d.data, b.dataset.crewAdd).slice() : [{}]; a.push({}); setP(d.data, b.dataset.crewAdd, a); persist(false); renderMain(); return; }
      if (b.dataset.crewDel != null) { const d = doc(); if (!d) return; const a = (getP(d.data, 'einsatz.kraefte') || []).slice(); a.splice(Number(b.dataset.crewDel), 1); setP(d.data, 'einsatz.kraefte', a.length ? a : undefined); persist(false); renderMain(); return; }
    });
    root.addEventListener('input', e => {
      const el = e.target; if (!el.dataset || !el.dataset.k) return;
      const d = doc(); if (!d) return;
      let v = el.value;
      if (el.dataset.num) { v = v === '' ? undefined : Number(v); if (v != null && !Number.isFinite(v)) v = undefined; }
      if (el.classList.contains('w-kz')) v = v.toUpperCase();
      setP(d.data, el.dataset.k, v);
      persist(false); schedulePreview();
      if (el.classList.contains('w-kz') && el.value !== v) { const p = el.selectionStart; el.value = v; try { el.setSelectionRange(p, p); } catch (er) { /* egal */ } }
    });
    root.addEventListener('change', e => {
      const el = e.target; if (!el.dataset || !el.dataset.k) return;
      const d = doc(); if (!d) return;
      if (el.tagName === 'SELECT') { setP(d.data, el.dataset.k, el.value || undefined); persist(false); schedulePreview(); return; }
      // Nur neu zeichnen, wenn sich dadurch sichtbare Felder ändern (sonst bleibt der Fokus, wo er ist)
      const st = $('.w-step'); if (!st) return;
      const m = mod(d); const s = m.steps.find(x => x.id === st.dataset.step); if (!s) return;
      if (visibleKeys(s, d.data) !== U.vis) renderMain();
    });
    document.addEventListener('keydown', e => {
      if (document.body.dataset.view !== 'schreiben' || !W() || !W().unlocked()) return;
      if ($('dialog[open]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && U.view === 'wizard') { e.preventDefault(); const d = doc(); if (!d) return; const steps = visibleSteps(mod(d), d.data); if (U.step < steps.length - 1) go(1); else finish(); }
    });
    const si = $('#search'); if (si) si.addEventListener('input', () => { if (document.body.dataset.view === 'schreiben') renderList(); });
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
    },
    newDoc, open
  });
})();
