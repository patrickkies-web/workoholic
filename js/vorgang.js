/*
 * Workoholic · Vorgang aus mehreren Abschnitten
 * ---------------------------------------------------------------
 * Ein Vorgang reiht Abschnitte aneinander (Allgemeines/Einsatzanlass → Eintreffsituation → Schilderungen → …) und fügt ihre
 * Texte zum Gesamtsachverhalt zusammen. Jeder Abschnitt bleibt ein eigener, verschlüsselt gespeicherter Vorgangsteil mit
 * seiner gewohnten Maske; der Vorgang selbst hält nur die Reihenfolge (data.teile = [{ id }]).
 *
 * Die Abschnitte bauen aufeinander auf – was einer erfasst, steht den anderen zur Verfügung. Wer wem was gibt, steht in der
 * KONTEXT-MATRIX unten: die Besatzungen aus „Allgemeines“ sind in allen Folgeabschnitten die Auswahl, sobald nach einer
 * Kollegin oder einem Kollegen gefragt wird; die Personen der Eintreffsituation (Name, Rolle, Verletzungen) lassen sich in den
 * Schilderungen antippen, statt sie neu anzulegen – die Verletzungen stehen dann nur einmal im Sachverhalt.
 *
 * Reine Logik (Matrix, Kontext, Abgleich, Gesamttext) ohne DOM, in Node testbar. Die Maske zeichnet writer.js über m.screen.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const str = v => (v == null ? '' : String(v)).trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const fmtDate = iso => { const m = ISO.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };

  /** Umgebung aus writer.js: Vorgangsteile nachschlagen und die Module (Titel, Text) erreichen. */
  let ENV = { find: () => null, modules: {} };
  const bind = env => { ENV = { ...ENV, ...env }; };
  const mod = t => ENV.modules[t] || null;

  /* ======================= Kontext-Matrix ======================= */
  /**
   * Zeile = Abschnitt (Modul). pos = übliche Stelle im Sachverhalt (neue Abschnitte reihen sich so ein, ↑ ändert es),
   * gibt = was der Abschnitt in den Vorgang einbringt, nimmt = was er von den anderen übernimmt.
   * nr = der Abschnitt trägt seine Nummer selbst (data.nr), kopf = seine Überschrift hat keine Nummer – beide werden bei
   * „nach Reihenfolge nummerieren“ mit ihrer Stelle im Vorgang versehen. Die übrigen behalten ihre eigene Nummerierung.
   *
   *                      gibt                      nimmt
   *   Allgemeines        Kräfte                    –
   *   Eintreffsituation  Personen, Art             Namen (der Personen, die nur in den Schilderungen stehen)
   *   Schilderungen      Namen                     Kräfte, Personen, Art
   *   Häusliche Gewalt   –                         Kräfte
   *   Unfallörtlichkeit  –                         –
   *   Blutprobe          –                         Kräfte
   *   PsychKG            –                         Kräfte
   *   Gewahrsam          –                         Kräfte
   */
  const MATRIX = {
    anzeige: { pos: 1, gibt: ['kraefte'], nimmt: [], kopf: true },
    eintreffen: { pos: 2, gibt: ['personen', 'art'], nimmt: ['namen'], nr: true },
    sch: { pos: 3, gibt: ['namen'], nimmt: ['kraefte', 'personen', 'art'], nr: true },
    hgv: { pos: 4, gibt: [], nimmt: ['kraefte'] },
    unfallort: { pos: 5, gibt: [], nimmt: [], kopf: true },
    blutprobe: { pos: 6, gibt: [], nimmt: ['kraefte'] },
    psychkg: { pos: 7, gibt: [], nimmt: ['kraefte'] },
    gewahrsam: { pos: 8, gibt: [], nimmt: ['kraefte'] }
  };
  const TYPEN = Object.keys(MATRIX).sort((a, b) => MATRIX[a].pos - MATRIX[b].pos);
  const STANDARD = ['anzeige', 'eintreffen', 'sch'];

  /** Besatzungen eines Abschnitts als eine Liste (alle Streifenwagen nacheinander), ohne Doppelte. */
  function kraefte(data) {
    const out = [], seen = new Set();
    for (const c of [...arr(get(data, 'einsatz.wagen')).flatMap(w => arr(w && w.crew)), ...arr(get(data, 'einsatz.kraefte'))]) {
      if (!c || !has(c.name)) continue;
      const k = str(c.name).toLowerCase().replace(/\s+/g, ' '); if (seen.has(k)) continue;
      seen.add(k); out.push(has(c.grad) ? { grad: str(c.grad), name: str(c.name) } : { name: str(c.name) });
    }
    return out;
  }
  /**
   * Was übernommen werden kann: l = Beschriftung, lesen = Wert aus dem gebenden Abschnitt, leer = zählt ein leerer Wert nicht
   * als Quelle (dann sucht der Vorgang weiter bzw. der Abschnitt behält seine eigenen Angaben).
   */
  const KONTEXT = {
    kraefte: { l: 'Kräfte', lesen: kraefte, leer: v => !v.length },
    personen: { l: 'Personen', lesen: data => arr(data && data.personen).filter(p => p && has(p.pid)).map(p => ({ pid: p.pid, rolle: p.rolle, ub: p.ub, g: p.g, nachname: p.nachname, vorname: p.vorname, verl: p.verl })), leer: () => false },
    art: { l: '', lesen: data => (data && data.art) || '', leer: () => false }, // kommt mit den Personen, steht nicht eigens im Hinweis
    // Namen der Personen, die ein Abschnitt selbst führt (nicht übernommen hat) – nur damit Namen und Kürzel überall gleich ausfallen
    namen: { l: '', lesen: data => arr(data && data.personen).filter(p => p && !p.ref && has(p.nachname)).map(p => ({ vorname: str(p.vorname), nachname: str(p.nachname) })), leer: v => !v.length }
  };

  /* ======================= Vorgang und seine Abschnitte ======================= */
  /** Abschnitte in der Reihenfolge des Vorgangs: [{ id, doc, m, cfg }] – nur die, die es gibt und deren Modul geladen ist. */
  function teile(data) {
    return arr(data && data.teile).map(t => {
      const doc = t && has(t.id) ? ENV.find(t.id) : null, m = doc ? mod(doc.type) : null;
      return doc && m && MATRIX[doc.type] ? { id: doc.id, doc, m, cfg: MATRIX[doc.type] } : null;
    }).filter(Boolean);
  }
  /** Der Vorgang, zu dem ein Abschnitt gehört (oder null). */
  const containerOf = (docs, id) => arr(docs).find(d => d && d.type === 'vorgang' && arr(d.data && d.data.teile).some(t => t && t.id === id)) || null;
  /** IDs aller Vorgangsteile, die in einem Vorgang stecken – sie erscheinen nicht einzeln in der Vorgangsliste. */
  function partIds(docs) {
    const all = new Set(arr(docs).map(d => d && d.id)), out = new Set();
    for (const d of arr(docs)) if (d && d.type === 'vorgang') for (const t of arr(d.data && d.data.teile)) if (t && all.has(t.id)) out.add(t.id);
    return out;
  }
  const auto = data => !(data && data.num === 'aus');

  /**
   * Kontext für einen Abschnitt: je übernommener Art der Wert aus dem ersten anderen Abschnitt, der sie gibt, dazu woher er
   * kommt (…Aus = Name des Abschnitts). Beispiel: { kraefte: [...], kraefteAus: 'Allgemeines/Einsatzanlass',
   * personen: [...], personenAus: 'Eintreffsituation', art: 'straf', nrAuto: true, quellen: [['Kräfte', 'Einsatzanlass']] }.
   */
  function kontext(data, doc) {
    const T = teile(data), cfg = MATRIX[doc && doc.type] || { nimmt: [] };
    const ctx = { vorgang: true, nrAuto: auto(data) && !!cfg.nr, quellen: [] };
    for (const kind of cfg.nimmt) {
      const K = KONTEXT[kind];
      const src = T.find(t => t.id !== doc.id && t.cfg.gibt.includes(kind) && !K.leer(K.lesen(t.doc.data)));
      if (!src) continue;
      ctx[kind] = K.lesen(src.doc.data); ctx[kind + 'Aus'] = src.m.name;
      if (!K.l) continue;
      const n = src.m.short || src.m.name, q = ctx.quellen.find(x => x[1] === n);
      if (q) q[0] += ', ' + K.l; else ctx.quellen.push([K.l, n]);
    }
    return ctx;
  }
  const sig = v => JSON.stringify(v);
  /** Die im Abschnitt selbst eingetragene Besatzung (einsatz.kraefte) in einheitlicher Form. */
  const eigene = data => arr(get(data, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => (has(c.grad) ? { grad: str(c.grad), name: str(c.name) } : { name: str(c.name) }));
  /**
   * Besatzungen übernehmen: Der Abschnitt folgt „Allgemeines“, solange dort nicht von Hand eine eigene Besatzung eingetragen
   * wurde (data.vgk merkt sich den zuletzt übernommenen Stand). Liefert true, wenn sich etwas geändert hat.
   */
  function kraefteAnwenden(data, liste) {
    if (!data || !arr(liste).length) return false;
    const own = eigene(data);
    const neu = sig(liste), folgt = !own.length || sig(own) === data.vgk;
    if (!folgt) return false;
    if (sig(own) === neu && data.vgk === neu) return false;
    if (!data.einsatz || typeof data.einsatz !== 'object') data.einsatz = {};
    data.einsatz.kraefte = JSON.parse(neu); data.vgk = neu;
    return true;
  }
  /**
   * Abgleich eines Vorgangs: Abschnitte nach Reihenfolge nummerieren (wenn gewünscht), Kontext in die Abschnitte übernehmen,
   * Verweise auf gelöschte Abschnitte entfernen, Status des Vorgangs nachführen.
   * Liefert die geänderten Vorgangsteile und ob sich der Vorgang selbst geändert hat – speichern muss der Aufrufer.
   */
  function sync(vg) {
    const out = { teile: [], selbst: false };
    if (!vg || !vg.data || typeof vg.data !== 'object') return out;
    const data = vg.data, roh = arr(data.teile);
    const da = roh.filter(t => t && has(t.id) && ENV.find(t.id));
    if (da.length !== roh.length || !Array.isArray(data.teile)) { data.teile = da; out.selbst = true; }
    const T = teile(data), ch = new Set();
    T.forEach((t, i) => {
      if (auto(data) && t.cfg.nr && t.doc.data.nr !== String(i + 1)) { t.doc.data.nr = String(i + 1); ch.add(t.doc); }
      const ctx = kontext(data, t.doc);
      if (t.cfg.nimmt.includes('kraefte') && kraefteAnwenden(t.doc.data, ctx.kraefte)) ch.add(t.doc);
      if (t.m.kontext && typeof t.m.kontext.nimmt === 'function' && t.m.kontext.nimmt(t.doc.data, ctx)) ch.add(t.doc);
    });
    const st = T.length && T.every(t => t.doc.status === 'fertig') ? 'fertig' : 'entwurf';
    if (vg.status !== st) { vg.status = st; out.selbst = true; }
    out.teile = [...ch];
    return out;
  }

  /* ======================= Texte ======================= */
  /** Text eines Abschnitts im Gesamtsachverhalt; Überschriften ohne eigene Nummer bekommen die Stelle im Vorgang. */
  function teilText(data, t, i) {
    let p = ''; try { p = t.m.plain(t.doc.data) || ''; } catch (e) { p = ''; }
    return auto(data) && t.cfg.kopf ? `${i + 1} ${p}` : p;
  }
  const gesamt = data => teile(data).map((t, i) => teilText(data, t, i)).join('\n\n');

  function title(data) {
    if (has(data && data.name)) return `Vorgang – ${str(data.name)}`;
    const T = teile(data), ea = T.find(t => t.doc.type === 'anzeige');
    const anlass = ea ? str(get(ea.doc.data, 'einsatz.anlass')) : '';
    if (anlass) return ['Vorgang', anlass.length > 48 ? anlass.slice(0, 47).replace(/\s+\S*$/, '') + ' …' : anlass, has(get(ea.doc.data, 'einsatz.datum')) ? fmtDate(get(ea.doc.data, 'einsatz.datum')) : ''].filter(Boolean).join(' · ');
    const mit = T.find(t => arr(t.doc.data.personen).some(p => p && has(p.nachname)));
    if (mit) { let s = ''; try { s = mit.m.title(mit.doc.data) || ''; } catch (e) { s = ''; } const n = s.split(' – ')[1]; if (n) return `Vorgang – ${n}`; }
    return 'Vorgang';
  }
  function subtitle(data) { const T = teile(data); return T.length ? T.map(t => t.m.short || t.m.name).join(' · ') : 'Noch keine Abschnitte'; }
  function pill(data) { const T = teile(data); return T.length ? `${T.filter(t => t.doc.status === 'fertig').length}/${T.length}` : 'neu'; }
  /** Stand eines Abschnitts für die Übersicht. */
  function stand(t) {
    if (t.doc.status === 'fertig') return 'Fertig';
    if (typeof t.m.pill === 'function') { try { return t.m.pill(t.doc.data); } catch (e) { return 'Entwurf'; } }
    const n = arr(t.m.steps).filter(s => !s.when || s.when(t.doc.data)).length || 1;
    return Math.round(Math.min(t.doc.step || 0, n) / n * 100) + ' %';
  }

  /* ======================= Maske ======================= */
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  const ICON_UP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  /** Ansicht je Vorgang: 'ov' (Abschnitte) oder 'text' (Gesamtsachverhalt). */
  const V = { id: null, s: 'ov' };
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };
  const topBar = (back, kicker, ttl) => `<div class="w-top"><button type="button" class="icon-btn sm${back === 'list' ? ' w-back' : ''}" ${back === 'list' ? 'data-w="list" aria-label="Zur Liste"' : `data-sd="${back}" aria-label="Zurück zur Übersicht"`}>${ICON_BACK}</button><div class="w-top-t"><span class="spaced">${esc(kicker)}</span><div class="w-title" data-live="title">${esc(ttl)}</div></div></div>`;

  function open(d) { V.id = d.id; V.s = 'ov'; }

  function ovHtml(d) {
    const data = d.data, T = teile(data);
    const items = T.map((t, i) => {
      const ctx = kontext(data, t.doc), fertig = t.doc.status === 'fertig';
      let sub = ''; try { sub = t.m.subtitle(t.doc.data) || ''; } catch (e) { sub = ''; }
      const von = ctx.quellen.map(([was, aus]) => `${was} aus „${aus}“`);
      return `<li class="sd-item"><div class="sd-row"><button type="button" class="sd-card" data-open="${esc(t.id)}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(t.m.name).replace('/', '/<wbr>')}</b><small>${esc(sub || 'noch leer')}</small></span><span class="pill ${fertig ? 'pill-lime' : 'pill-quiet'}">${esc(stand(t))}</span></button>${T.length > 1 ? `<button type="button" class="sd-up" data-sd="up" data-i="${i}" aria-label="${esc(t.m.name)} nach oben"${i ? '' : ' disabled'}>${ICON_UP}</button>` : ''}<button type="button" class="sd-up vg-x" data-sd="rm" data-i="${i}" aria-label="${esc(t.m.name)} entfernen">${ICON_X}</button></div>${von.length ? `<p class="w-hint vg-ctx">↳ übernimmt ${esc(joinUnd(von))}</p>` : ''}</li>`;
    }).join('');
    const da = new Set(T.map(t => t.doc.type));
    const frei = TYPEN.filter(k => mod(k) && !da.has(k));
    const std = STANDARD.filter(k => frei.includes(k));
    const add = frei.length
      ? `<div class="sd-add"><span class="w-lbl">${T.length ? 'Weiteren Abschnitt hinzufügen' : 'Welche Abschnitte gehören zum Vorgang?'}</span>${!T.length && std.length === STANDARD.length ? `<div class="sd-add-row vg-std"><button type="button" class="sd-add-b" data-sd="std"><i aria-hidden="true">+</i><span>Üblicher Anfang<small>${esc(STANDARD.map(k => mod(k).short || mod(k).name).join(' → '))}</small></span></button></div>` : ''}<div class="sd-add-row">${frei.map(k => `<button type="button" class="sd-add-b" data-sd="add" data-v="${k}"><i aria-hidden="true">+</i>${esc(mod(k).name)}</button>`).join('')}</div><p class="w-hint sd-hint">Antippen reiht den Abschnitt an seiner üblichen Stelle ein; mit ↑ änderst du die Reihenfolge. Jeder Abschnitt baut auf den anderen auf: Besatzungen aus „Allgemeines“ und Personen aus der „Eintreffsituation“ stehen danach zur Auswahl.</p></div>`
      : '';
    return `${topBar('list', `Vorgang · ${T.length} ${T.length === 1 ? 'Abschnitt' : 'Abschnitte'}`, title(data))}
      <div class="w-grid sd-grid">
        <div class="w-q" data-q="name"><label class="w-lbl" for="vgName">Bezeichnung <i class="w-hint-i">(optional – sonst aus dem Einsatzanlass)</i></label><input class="input" id="vgName" data-sk="name" value="${esc(data.name || '')}" placeholder="z. B. Körperverletzung Lindenstraße" autocomplete="off" spellcheck="false" enterkeyhint="done" maxlength="80"></div>
        ${T.length ? `<div class="w-q"><span class="w-lbl">Abschnitte <span class="sd-cnt mono">${T.length}</span></span><ol class="sd-list vg-list">${items}</ol></div>` : ''}
        ${add ? `<div class="w-q">${add}</div>` : ''}
        ${T.length ? `<div class="w-q" data-q="num"><div class="w-chips"><button type="button" class="chip" data-sd="num" aria-pressed="${String(auto(data))}">Nach Reihenfolge nummerieren (1, 2, 3 …)</button></div><p class="w-hint sd-hint">${auto(data) ? 'Allgemeines, Eintreffsituation, Schilderungen und Unfallörtlichkeit bekommen die Nummer ihrer Stelle; andere Abschnitte behalten ihre eigene.' : 'Jeder Abschnitt behält die Nummer, die du dort einträgst.'}</p></div>` : ''}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${T.length ? '<button type="button" class="btn btn-accent" data-sd="text">Gesamtsachverhalt</button>' : ''}</div>`;
  }

  function textHtml(d) {
    const data = d.data, T = teile(data), txt = gesamt(data);
    const ph = (txt.match(/\[[^\]]+\]/g) || []).length;
    const blocks = T.map((t, i) => `<div class="w-q"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">${esc(t.m.name)}</span><span class="vg-tools"><button type="button" class="btn btn-ghost btn-sm" data-open="${esc(t.id)}">Bearbeiten</button><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></span></div><pre class="w-out-t">${esc(teilText(data, t, i) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `${topBar('ov', 'Vorgang · Gesamtsachverhalt', title(data))}
      <div class="w-grid sd-grid">
        ${ph ? `<div class="w-q"><div class="w-warn">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} (in eckigen Klammern) – über „Bearbeiten“ am Abschnitt nachtragen.</div></div>` : ''}
        ${blocks}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="ov">Zu den Abschnitten</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copyall">Alles kopieren</button></div>`;
  }

  function render(d) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (V.s === 'text' && !teile(d.data).length) V.s = 'ov';
    return V.s === 'text' ? textHtml(d) : ovHtml(d);
  }

  /** Abschnitt anlegen und an seiner üblichen Stelle einreihen. Datum, Uhrzeit und Besatzung kommen aus dem Vorgang. */
  function addTeil(api, type) {
    const d = api.d, data = d.data;
    if (!MATRIX[type] || !mod(type) || teile(data).some(t => t.doc.type === type)) return null;
    const pre = { einsatz: JSON.parse(JSON.stringify(data.einsatz && typeof data.einsatz === 'object' ? data.einsatz : {})) };
    const nd = api.create(type, pre); if (!nd) return null;
    // Die Vorbelegung aus der Schicht gilt nicht als eigene Eingabe: „Allgemeines“ darf sie ersetzen
    if (MATRIX[type].nimmt.includes('kraefte')) { const own = eigene(nd.data); if (own.length) nd.data.vgk = sig(own); }
    const list = arr(data.teile).filter(t => t && has(t.id));
    let at = list.findIndex(t => { const x = ENV.find(t.id); return x && MATRIX[x.type] && MATRIX[x.type].pos > MATRIX[type].pos; });
    if (at < 0) at = list.length;
    list.splice(at, 0, { id: nd.id });
    data.teile = list;
    return nd;
  }
  /** Nach jeder Änderung an der Zusammenstellung: abgleichen, alles Geänderte speichern, neu zeichnen. */
  function commit(api, extra = []) {
    const r = sync(api.d);
    for (const x of new Set([...r.teile, ...extra])) api.touch(x);
    api.persist(true); api.render();
  }
  async function rmTeil(api, i) {
    const d = api.d, T = teile(d.data), t = T[i]; if (!t) return;
    const ok = await api.ask({ title: 'Abschnitt entfernen?', text: `„${t.m.name}“ wird mit allem, was dort eingetragen ist, aus dem Vorgang gelöscht. Du kannst es direkt danach rückgängig machen.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
    if (!ok) return;
    const snap = api.removeDocs([t.id]);
    d.data.teile = arr(d.data.teile).filter(x => x && x.id !== t.id);
    commit(api);
    api.toast(`Entfernt: ${t.m.name}`, snap ? { undo: snap } : {});
  }

  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    if (b.disabled) return true;
    const d = api.d, data = d.data, a = b.dataset.sd;
    switch (a) {
      case 'add': { const nd = addTeil(api, b.dataset.v); if (!nd) { api.toast('Abschnitt konnte nicht angelegt werden.'); return true; } commit(api, [nd]); return true; }
      case 'std': { const neu = STANDARD.map(k => addTeil(api, k)).filter(Boolean); commit(api, neu); return true; }
      case 'up': { const i = Number(b.dataset.i), T = teile(data); if (i > 0 && T[i]) { const ids = T.map(t => ({ id: t.id })); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; data.teile = ids; commit(api); } return true; }
      case 'rm': rmTeil(api, Number(b.dataset.i)); return true;
      case 'num': { if (auto(data)) data.num = 'aus'; else delete data.num; commit(api); return true; }
      case 'text': V.s = 'text'; api.render(); top0(); return true;
      case 'ov': V.s = 'ov'; api.render(); top0(); return true;
      case 'copy1': { const T = teile(data), i = Number(b.dataset.i); if (T[i]) api.copy(teilText(data, T[i], i)); return true; }
      case 'copyall': api.copy(gesamt(data)); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || el.dataset.sk !== 'name') return false;
    if (has(el.value)) api.d.data.name = el.value; else delete api.d.data.name;
    api.persist(false);
    document.querySelectorAll('#wMain [data-live="title"]').forEach(n => { n.textContent = title(api.d.data); });
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    e.preventDefault(); el.blur(); return true;
  }
  /** ⌘/Strg + Enter: zum Gesamtsachverhalt, dort alles kopieren. */
  function submit(api) {
    if (V.s === 'ov') { if (teile(api.d.data).length) { V.s = 'text'; api.render(); top0(); } }
    else api.copy(gesamt(api.d.data));
  }

  root.WVorgang = Object.freeze({
    id: 'vorgang', name: 'Vorgang aus Abschnitten', short: 'Vorgang', kurz: 'VG',
    desc: 'Mehrere Abschnitte zu einem Sachverhalt kombinieren – Besatzungen und Personen werden von Abschnitt zu Abschnitt übernommen',
    intro: 'Abschnitte auswählen (Allgemeines, Eintreffsituation, Schilderungen …) – sie reihen sich aneinander und bauen aufeinander auf · Gesamtsachverhalt zum Kopieren',
    labels: { newBtn: 'Vorgang aus Abschnitten', bericht: 'Gesamtsachverhalt' },
    steps: [],
    title, subtitle, pill,
    plain: gesamt,
    text: data => teile(data).map((t, i) => ['', t.m.name, teilText(data, t, i), '']),
    preview: () => '', kurzText: () => '', fahndung: () => '', offen: () => [], personalien: () => '',
    screen: { open, render, click, input, keydown, submit },
    bind,
    core: { MATRIX, KONTEXT, TYPEN, teile, containerOf, partIds, kontext, kraefte, kraefteAnwenden, sync, gesamt, teilText, auto }
  });
})(typeof window !== 'undefined' ? window : globalThis);
