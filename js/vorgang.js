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
 * Zusatzbausteine – Seltenes wie die Personenbeschreibung oder Fragen zu Nahbereichsfahndung, Spurensicherung,
 * Videoaufzeichnungen und Lichtbildmappe – wählt man im Untermenü „Zusatzbausteine“. Je nach Art reihen sie sich ganz vorn
 * ein (wird vor Ort zuerst aufgenommen) oder ganz hinten (Abschnitt „Maßnahmen“, wird zuletzt abgefragt).
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
   * „nach Reihenfolge nummerieren“ fortlaufend gezählt. Ein Abschnitt mit eigener Gliederung (Modul liefert `gliederung`,
   * z. B. Häusliche Gewalt: Eintreffsituation, Maßnahmen …) zählt mit jedem seiner Teile mit. Blutprobe, PsychKG und
   * Gewahrsam tragen keine Gliederungsnummer und zählen nicht – siehe plan().
   *
   *                      gibt                      nimmt
   *   Allgemeines        Kräfte, Anschrift         –
   *   Eintreffsituation  Personen, Art             Namen (der Personen, die nur in den Schilderungen stehen)
   *   Schilderungen      Namen                     Kräfte, Personen, Art
   *   Häusliche Gewalt   –                         Kräfte, Anschrift (Tatort), Personen (Anrede, Familienname),
   *                                                 Antrefforte (Gebäude, Geschoss, Seite der Wohnung)
   *   Unfallörtlichkeit  –                         Datum
   *   Blutprobe          –                         Kräfte, Datum, Personen (Beschuldigte/r, Betroffene/r)
   *   PsychKG            –                         Kräfte, Datum, Personen (betroffene Person), Anschrift (als Vorschlag)
   *   Gewahrsam          –                         Kräfte, Datum, Personen (betroffene Person), Anschrift und Antrefforte (als Vorschlag)
   *
   * Zusatzbausteine (zusatz: true) wählt man im Untermenü „Zusatzbausteine“, nicht über die Abschnittsknöpfe – jeder reiht
   * sich an seiner Stelle ein:
   *   Personenbeschreibung  Beschreibungen         Art, Personen (als Namensvorschlag), wer welche Beschreibung übernommen hat
   *                         → ganz vorn (pos 0): wird vor Ort zuerst aufgenommen; im Gesamtsachverhalt steht sie dort nur,
   *                           solange sie bei keiner Schilderung übernommen ist (ohne Nummer – sie zählt nicht mit)
   *   Fahrzeugbeschreibung  Fahrzeuge              Personen (als Namensvorschlag), Personenbeschreibungen (wer stieg ein?), wer sie übernommen hat
   *                         → vorn, gleich nach der Personenbeschreibung (pos 0.5); sonst wie diese
   *   Maßnahmen             –                      Art, Personen (als Vorschlag für „wer hat Videoaufzeichnungen“)
   *                         → ganz hinten (pos 9): fragt am Ende, was im Untermenü gewählt wurde
   */
  const MATRIX = {
    pb: { pos: 0, gibt: ['beschreibungen'], nimmt: ['art', 'leute', 'nutzung', 'fahrzeuge'], vorschlag: ['leute', 'fahrzeuge'], zusatz: true },
    fz: { pos: 0.5, gibt: ['fahrzeuge'], nimmt: ['art', 'leute', 'nutzung', 'beschreibungen'], vorschlag: ['leute', 'beschreibungen'], zusatz: true },
    anzeige: { pos: 1, gibt: ['kraefte', 'ort', 'datum'], nimmt: [], kopf: true },
    eintreffen: { pos: 2, gibt: ['personen', 'art', 'plaetze'], nimmt: ['namen'], nr: true },
    sch: { pos: 3, gibt: ['namen', 'art', 'nutzung'], nimmt: ['kraefte', 'personen', 'art', 'beschreibungen', 'fahrzeuge'], nr: true },
    hgv: { pos: 4, gibt: [], nimmt: ['kraefte', 'ort', 'personen', 'plaetze'] },
    unfallort: { pos: 5, gibt: [], nimmt: ['datum'], kopf: true },
    blutprobe: { pos: 6, gibt: [], nimmt: ['kraefte', 'datum', 'leute'] },
    psychkg: { pos: 7, gibt: [], nimmt: ['kraefte', 'datum', 'leute', 'ort'], vorschlag: ['ort'] },
    gewahrsam: { pos: 8, gibt: [], nimmt: ['kraefte', 'datum', 'leute', 'ort', 'plaetze'], vorschlag: ['ort', 'plaetze'], kopf: d => !!(d && d.gw && d.gw.art) }, // Überschrift erst, wenn die Gewahrsamsart steht
    massnahmen: { pos: 9, gibt: [], nimmt: ['art', 'leute'], vorschlag: ['leute'], nr: true, zusatz: true }
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
    /* Wo die Personen angetroffen wurden: die Satzbausteine („im Wohnzimmer der Wohnung im 2. Obergeschoss links des
       Mehrfamilienhauses“) und – aus dem Ort-Assistenten – Gebäude, Geschoss und Seite der Wohnung */
    plaetze: { l: 'Antrefforte', lesen: data => {
      const O = arr(data && data.orte).filter(o => o && typeof o === 'object' && o.wie !== 'weg');
      const texte = [...new Set(O.map(o => str(o.text)).filter(Boolean))];
      const g = O.find(o => o.w && has(o.w.geb)), ja = v => has(v) && v !== '-';
      const wh = O.find(o => o.w && has(o.w.geb) && (o.w.wo === 'whg' || (o.w.wo === 'tuer' && o.w.tuer === 'whg')) && ja(o.w.etage));
      return texte.length || g ? { texte, geb: g ? str(g.w.geb) : '', etage: wh ? str(wh.w.etage) : '', lage: wh && ja(wh.w.lage) ? str(wh.w.lage) : '' } : null;
    }, leer: v => !v },
    datum: { l: 'Datum', lesen: data => str(get(data, 'einsatz.datum')), leer: v => !v },
    // Einsatzörtlichkeit in der Form, wie Folgeabschnitte sie schreiben: „Am Bach 36“ und „33829 Borgholzhausen“
    ort: { l: 'Anschrift', lesen: data => { const o = (data && data.ort) || {}; const strasse = [str(o.strasse), str(o.hausnr)].filter(Boolean).join(' '), plz = [str(o.plz), str(o.ort)].filter(Boolean).join(' '); return has(o.strasse) || has(o.ort) ? { str: strasse, plz } : null; }, leer: v => !v },
    personen: { l: 'Personen', lesen: data => arr(data && data.personen).filter(p => p && has(p.pid)).map(p => ({ pid: p.pid, rolle: p.rolle, ub: p.ub, g: p.g, nachname: p.nachname, vorname: p.vorname, verl: p.verl })), leer: () => false },
    art: { l: '', lesen: data => (data && data.art) || '', leer: v => !v }, // kommt mit den Personen, steht nicht eigens im Hinweis
    // Personenbeschreibungen (Zusatzbaustein): in den Schilderungen bei der Person übernehmbar, die sie abgegeben hat
    beschreibungen: { l: 'Personenbeschreibungen', lesen: data => arr(data && data.pb).filter(b => b && typeof b === 'object' && has(b.id)).map(b => ({ id: b.id, von: str(b.von), d: JSON.parse(JSON.stringify(b)) })), leer: v => !v.length },
    // Fahrzeugbeschreibungen (Zusatzbaustein): wie die Personenbeschreibungen in den Schilderungen übernehmbar
    fahrzeuge: { l: 'Fahrzeugbeschreibungen', lesen: data => arr(data && data.fz).filter(f => f && typeof f === 'object' && has(f.id)).map(f => ({ id: f.id, von: str(f.von), d: JSON.parse(JSON.stringify(f)) })), leer: v => !v.length },
    // Wer welche Personen- oder Fahrzeugbeschreibung übernommen hat – dort steht sie dann, vorn im Gesamtsachverhalt nicht noch einmal
    nutzung: { l: '', lesen: data => { const C = root.WSchild && root.WSchild.core; return arr(data && data.personen).flatMap((p, i) => [...arr(p && p.pb), ...arr(p && p.fz)].filter(id => typeof id === 'string' && id).map(id => ({ id, wer: C ? C.werVon(data, i) : str(p.nachname) }))); }, leer: () => false },
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
    const gl = (mod(doc && doc.type) || {}).gliederung || null;
    const mv = (mod(doc && doc.type) || {}).vg || null;
    const ctx = { vorgang: true, nrAuto: auto(data) && !!(cfg.nr || gl || (mv && mv.nr)), quellen: [] };
    // Teile, die im Gesamtsachverhalt an einen anderen Abschnitt angehängt werden (HG-Eintreffsituation → „Eintreffsituation“)
    if (gl) { const an = {}; for (const [k, typ] of Object.entries(gl.slot || {})) { const z = T.find(t => t.id !== doc.id && t.doc.type === typ); if (z) an[k] = z.m.name; } if (Object.keys(an).length) ctx.angehaengt = an; }
    for (const kind of cfg.nimmt) {
      if (kind === 'leute') { // Personen kommen aus allen anderen Abschnitten, nicht nur aus einem
        const L = leute(data, doc); if (!L.length) continue;
        ctx.leute = L;
        if ((cfg.vorschlag || []).includes('leute')) continue; // nur zum Antippen angeboten – steht nicht unter „übernimmt“
        for (const n of [...new Set(L.map(q => q.aus))]) { const q = ctx.quellen.find(x => x[1] === n); if (q) q[0] += ', Personen'; else ctx.quellen.push(['Personen', n]); }
        continue;
      }
      const K = KONTEXT[kind];
      const src = T.find(t => t.id !== doc.id && t.cfg.gibt.includes(kind) && !K.leer(K.lesen(t.doc.data)));
      if (!src) continue;
      ctx[kind] = K.lesen(src.doc.data); ctx[kind + 'Aus'] = src.m.name;
      if (!K.l) continue;
      if ((cfg.vorschlag || []).includes(kind)) continue; // nur als Vorschlag angeboten – steht nicht unter „übernimmt“
      const n = src.m.short || src.m.name, q = ctx.quellen.find(x => x[1] === n);
      if (q) q[0] += ', ' + K.l; else ctx.quellen.push([K.l, n]);
    }
    return ctx;
  }
  const sig = v => JSON.stringify(v);
  /** Die im Abschnitt selbst eingetragene Besatzung (einsatz.kraefte) in einheitlicher Form. */
  const eigene = data => arr(get(data, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => (has(c.grad) ? { grad: str(c.grad), name: str(c.name) } : { name: str(c.name) }));
  /* ---------- Folgeabschnitte (Blutprobe, PsychKG, Gewahrsam, Unfallörtlichkeit): Person, Datum ---------- */
  /* Ein Modul sagt mit `vg`, wo seine Angaben liegen: { person: { pfad, rolle?(data), nach?(data, q) }, datum: Pfad,
     kraefte: Pfad, nr: { feld, anzahl? } }. Der Vorgang füllt sie und führt sie nach, solange dort nichts von Hand
     geändert wurde (data.vgv merkt sich das zuletzt Übernommene). */
  const setP = (o, path, v) => { const ks = path.split('.'); let cur = o; for (let i = 0; i < ks.length - 1; i++) { if (!cur[ks[i]] || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {}; cur = cur[ks[i]]; } if (v === undefined || v === null || v === '') delete cur[ks[ks.length - 1]]; else cur[ks[ks.length - 1]] = v; };
  const nKey = q => `${str(q && q.vorname)}|${str(q && q.nachname)}`.toLocaleLowerCase('de').replace(/\s+/g, ' ');
  const G3 = g => (g === 'm' || g === 'w' || g === 'd' ? g : '');
  const P_FELDER = ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift'];
  /**
   * Alle Personen, die in den ANDEREN Abschnitten des Vorgangs stehen: [{ key, rolle, g, nachname, vorname, geb?, anschrift?, aus }].
   * Zuerst die Eintreffsituation, dann eigene Personen der Schilderungen, dann die betroffene Person aus PsychKG/Gewahrsam.
   * Wer dort nur übernommen ist (ref), zählt nicht als eigene Quelle – ergänzt aber Geburtsdatum und Anschrift.
   */
  function leute(data, doc) {
    const out = [], by = new Map();
    const add = (key, q, aus, nurErgaenzen) => {
      if (!q || !has(q.nachname)) return;
      let e = by.get(nKey(q));
      if (!e) { if (nurErgaenzen) return; e = { key, rolle: str(q.rolle), g: G3(q.g), nachname: str(q.nachname), vorname: str(q.vorname), aus }; if (q.ub) e.ub = q.ub; by.set(nKey(q), e); out.push(e); }
      if (!e.g && G3(q.g)) e.g = G3(q.g);
      if (!e.geb && has(q.geb)) e.geb = str(q.geb);
      if (!e.anschrift && has(q.anschrift)) e.anschrift = str(q.anschrift);
    };
    const T = teile(data).filter(t => !doc || t.id !== doc.id), n = t => t.m.short || t.m.name;
    for (const t of T) if (t.doc.type === 'eintreffen') for (const p of arr(t.doc.data.personen)) if (p && has(p.pid)) add(`${t.id}:${p.pid}`, p, n(t));
    for (const t of T) if (t.doc.type === 'sch') for (const p of arr(t.doc.data.personen)) if (p && !p.ref) add(`${t.id}:${nKey(p)}`, p, n(t));
    for (const t of T) {
      const pf = t.m.vg && t.m.vg.person; if (!pf) continue;
      const p = get(t.doc.data, pf.pfad); if (!p || typeof p !== 'object') continue;
      add(`${t.id}:p`, { ...p, g: p.geschlecht, rolle: typeof pf.rolle === 'function' ? pf.rolle(t.doc.data) : 'bt' }, n(t), !!p.ref);
    }
    return out;
  }
  /** Person q in das Personenfeld des Abschnitts schreiben und verknüpfen; true, wenn sich etwas geändert hat. */
  function personSetzen(data, pf, q) {
    let p = get(data, pf.pfad); if (!p || typeof p !== 'object') { setP(data, pf.pfad, {}); p = get(data, pf.pfad); }
    let ch = false; const neu = p.ref !== q.key;
    const put = (k, val) => { val = str(val); if (str(p[k]) === val) return; if (val) p[k] = val; else delete p[k]; ch = true; };
    if (neu) { p.ref = q.key; ch = true; }
    put('nachname', q.nachname); put('vorname', q.vorname);
    if (q.g) put('geschlecht', q.g);                             // Anrede folgt der Quelle, wenn sie dort steht
    if (!has(p.geb) && q.geb) put('geb', q.geb);                 // Geburtsdatum und Anschrift nur ergänzen
    if (!has(p.anschrift) && q.anschrift) put('anschrift', q.anschrift);
    if (neu) { if (data.vgv && data.vgv.pfrei) delete data.vgv.pfrei; if (typeof pf.nach === 'function') pf.nach(data, q); }
    return ch;
  }
  /** Verknüpfung lösen: Die Angaben bleiben stehen und gehören ab jetzt dem Abschnitt selbst. */
  function personLoesen(data, pf) {
    const p = get(data, pf.pfad); if (!p || typeof p !== 'object' || !p.ref) return false;
    delete p.ref; if (!data.vgv || typeof data.vgv !== 'object') data.vgv = {}; data.vgv.pfrei = 1;
    return true;
  }
  /**
   * Personenfeld nachführen: Eine verknüpfte Person folgt ihrer Quelle (Name, Anrede); fehlt die Quelle, bleibt sie als
   * eigene Person stehen. Ist das Feld noch leer und steht im Vorgang genau eine Person (Zeugen zählen dabei nicht),
   * wird sie gleich eingetragen; bei mehreren wählt man sie in der Eingabe mit einem Tipp.
   */
  function personAnwenden(data, pf, L) {
    const p = get(data, pf.pfad), leer = !p || typeof p !== 'object' || !P_FELDER.some(k => has(p[k]));
    if (p && p.ref) { const q = arr(L).find(x => x.key === p.ref); if (!q) { delete p.ref; return true; } return personSetzen(data, pf, q); }
    if (data.vgv && data.vgv.pfrei) return false; // von Hand gelöst: nicht wieder von selbst verknüpfen
    // schon eingetragen und dieselbe Person wie in einem anderen Abschnitt: verknüpfen, damit Änderungen dort hier ankommen
    if (!leer && has(p.nachname)) { const q = arr(L).find(x => nKey(x) === nKey(p)); return q ? personSetzen(data, pf, q) : false; }
    // noch leer: steht im Vorgang genau eine Person, die nicht nur Zeugin oder Zeuge ist, wird sie eingetragen
    const K = arr(L).filter(x => x.rolle !== 'zeuge');
    return leer && K.length === 1 ? personSetzen(data, pf, K[0]) : false;
  }
  /**
   * Einen Wert aus dem Vorgang übernehmen und nachführen (key = Merker in data.vgv): Er folgt, solange das Feld leer ist,
   * denselben Wert trägt oder noch den zuletzt übernommenen. Was von Hand anders eingetragen wurde, bleibt.
   */
  function wertFolgt(data, pfad, key, wert) {
    wert = str(wert); if (!wert) return false;
    const v = data.vgv && typeof data.vgv === 'object' ? data.vgv : {}, cur = str(get(data, pfad)), alt = str(v[key]);
    if (cur && cur !== alt && cur !== wert) return false; // selbst eingetragen
    if (cur === wert && alt === wert) return false;       // steht schon
    if (!cur && alt === wert) return false;               // bewusst geleert
    setP(data, pfad, wert); v[key] = wert; data.vgv = v;
    return true;
  }
  /** Folgt die Angabe noch dem Vorgang? (für die Anzeige: dann wird sie nicht noch einmal abgefragt) */
  const kraefteFolgen = data => { const own = eigene(data); return own.length > 0 && sig(own) === data.vgk; };
  const datumFolgt = (data, pfad) => { const cur = str(get(data, pfad)); return !!cur && cur === str(data.vgv && data.vgv.datum); };
  /**
   * Was ein Folgeabschnitt gerade aus dem Vorgang bezieht – damit die Eingabe es zeigt, statt noch einmal zu fragen:
   * { kraefte: { feld, aus, liste }, datum: { feld, aus, wert }, nr: { feld }, person: { feld, leute, q } } (je nur, wenn es zutrifft).
   */
  function sicht(data, doc) {
    const m = mod(doc && doc.type), mv = m && m.vg; if (!mv) return null;
    const ctx = kontext(data, doc), d = doc.data || {}, out = {};
    if (mv.kraefte && kraefteFolgen(d)) out.kraefte = { feld: mv.kraefte, aus: ctx.kraefteAus || '', liste: eigene(d) };
    if (mv.datum && ctx.datum && datumFolgt(d, mv.datum)) out.datum = { feld: mv.datum, aus: ctx.datumAus || '', wert: ctx.datum };
    if (mv.nr && ctx.nrAuto) out.nr = { feld: mv.nr.feld };
    const adr = ctx.ort ? [ctx.ort.str, ctx.ort.plz].filter(Boolean).join(', ') : '';
    if (adr) out.adresse = { text: adr, aus: ctx.ortAus || '' }; // Einsatzörtlichkeit – als Vorschlag für die Anschrift der Person
    if (mv.orte) { // Felder, die nach einem Ort fragen: Vorschläge [Beschriftung, Text] aus dem, was der Vorgang schon kennt
      const kurz = t => (t.length > 96 ? t.slice(0, 94).replace(/\s+\S*$/, '') + ' …' : t), V = {}; // die Chips brechen um
      for (const [feld, art] of Object.entries(mv.orte)) {
        const L = [];
        if (art === 'platz') { for (const t of (ctx.plaetze ? ctx.plaetze.texte : [])) L.push([kurz(t), t]); if (ctx.ort && ctx.ort.str) L.push([`an der Anschrift ${ctx.ort.str}`, `an der Anschrift ${ctx.ort.str}${ctx.ort.plz ? `, in ${ctx.ort.plz}` : ''}`]); }
        else if (adr) L.push([adr, art === 'adresse,' ? adr + ',' : adr]);
        if (L.length) V[feld] = L;
      }
      if (Object.keys(V).length) out.vorschlag = V;
    }
    if (mv.person && ctx.leute) { const p = get(d, mv.person.pfad); out.person = { feld: mv.person.pfad, leute: ctx.leute, q: p && p.ref ? ctx.leute.find(x => x.key === p.ref) || null : null }; }
    return out;
  }

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
    // Was ein Abschnitt übernimmt, kann ändern, was ein anderer gibt (Namen, Verknüpfungen) – deshalb abgleichen, bis nichts
    // mehr nachrückt. Zwei Runden reichen; die dritte ist die Sicherung gegen Schleifen.
    for (let runde = 0; runde < 3; runde++) {
      let neu = false;
      const merk = doc => { ch.add(doc); neu = true; };
      if (auto(data)) {
        const je = new Map(); // gegliederter Abschnitt → { Teil: Nummer }
        for (const b of plan(data)) {
          if (b.k) { if (!je.has(b.t)) je.set(b.t, {}); je.get(b.t)[b.k] = b.nr; }
          else if (b.t.cfg.nr && b.t.doc.data.nr !== b.nr) { b.t.doc.data.nr = b.nr; merk(b.t.doc); }
          else if (b.t.m.vg && b.t.m.vg.nr && b.nr && str(get(b.t.doc.data, b.t.m.vg.nr.feld)) !== b.nr) { setP(b.t.doc.data, b.t.m.vg.nr.feld, b.nr); merk(b.t.doc); }
          for (const x of b.mit) { if (!je.has(x.t)) je.set(x.t, {}); je.get(x.t)[x.k] = b.nr; }
        }
        for (const [t, map] of je) if (t.m.gliederung.setNr(t.doc.data, map)) merk(t.doc);
      }
      T.forEach(t => {
        const ctx = kontext(data, t.doc);
        if (t.cfg.nimmt.includes('kraefte') && kraefteAnwenden(t.doc.data, ctx.kraefte)) merk(t.doc);
        const mv = t.m.vg;
        if (mv && mv.datum && ctx.datum && wertFolgt(t.doc.data, mv.datum, 'datum', ctx.datum)) merk(t.doc);
        if (mv && mv.person && personAnwenden(t.doc.data, mv.person, ctx.leute)) merk(t.doc);
        if (t.m.kontext && typeof t.m.kontext.nimmt === 'function' && t.m.kontext.nimmt(t.doc.data, ctx)) merk(t.doc);
      });
      if (!neu) break;
    }
    const st = T.length && T.every(t => t.doc.status === 'fertig') ? 'fertig' : 'entwurf';
    if (vg.status !== st) { vg.status = st; out.selbst = true; }
    out.teile = [...ch];
    return out;
  }

  /* ======================= Bausteine und Texte ======================= */
  /**
   * Bausteine des Gesamtsachverhalts in der Reihenfolge, in der sie im Text stehen: [{ t, k?, mit, nr }].
   * Regelfall: ein Abschnitt = ein Baustein. Ein Abschnitt mit eigener Gliederung liefert je Teil einen (k = Teil). Teile,
   * die an die Stelle eines anderen Abschnitts gehören (gliederung.slot, z. B. die Eintreffsituation der Häuslichen Gewalt):
   *   – gibt es diesen Abschnitt im Vorgang, werden sie dort als Absatz angehängt (mit) – eine Überschrift, eine Nummer;
   *   – sonst stehen sie als eigener Baustein an dessen üblicher Stelle, also vor den Schilderungen.
   * nr = fortlaufende Nummer bei „nach Reihenfolge nummerieren“ ('' = ohne bzw. eigene Nummer des Abschnitts).
   */
  /** Trägt der Abschnitt eine Überschrift ohne eigene Nummer, die der Vorgang nummeriert? (beim Gewahrsam erst mit Gewahrsamsart) */
  const kopfOk = t => (typeof t.cfg.kopf === 'function' ? !!t.cfg.kopf(t.doc.data) : !!t.cfg.kopf);
  /** Hat der Abschnitt gerade keinen eigenen Text im Gesamtsachverhalt? (Modul meldet es mit `still`) */
  const istStill = t => { try { return typeof t.m.still === 'function' && !!t.m.still(t.doc.data); } catch (e) { return false; } };
  function plan(data) {
    const T = teile(data), out = [];
    const gl = T.find(t => t.m.gliederung) || null, G = gl ? gl.m.gliederung : null;
    const vor = G ? G.keys.filter(k => G.slot && G.slot[k]) : [];
    const ziel = k => T.find(t => t !== gl && t.doc.type === G.slot[k]) || null;
    const frei = vor.filter(k => !ziel(k)); // ohne Zielabschnitt: eigener Baustein an dessen üblicher Stelle
    const ab = frei.length ? Math.min(...frei.map(k => (MATRIX[G.slot[k]] || { pos: 0 }).pos)) : 0;
    const vorAt = frei.length ? T.findIndex(t => t === gl || t.cfg.pos > ab) : -1;
    T.forEach((t, i) => {
      if (i === vorAt) for (const k of frei) out.push({ t: gl, k, mit: [] });
      if (t !== gl && istStill(t)) return; // steht gerade nicht im Gesamtsachverhalt (z. B. Personenbeschreibung, die bei einer Schilderung übernommen ist)
      if (t === gl) { for (const k of G.keys) if (!vor.includes(k)) out.push({ t, k, mit: [] }); }
      else out.push({ t, mit: gl ? vor.filter(k => ziel(k) === t).map(k => ({ t: gl, k })) : [] });
    });
    let n = 0;
    for (const b of out) {
      const nrFeld = !b.k && b.t.m.vg && b.t.m.vg.nr;
      if (!auto(data) || !(b.k || b.t.cfg.nr || kopfOk(b.t) || nrFeld)) { b.nr = ''; continue; }
      b.nr = String(n + 1); n += (nrFeld && nrFeld.anzahl) || 1; // die Blutprobe hat zwei Überschriften und braucht zwei Nummern
    }
    return out;
  }
  /** Beschriftung eines Bausteins: „Eintreffsituation“, „Häusliche Gewalt · Gefahrenprognose“. */
  function bausteinName(b) {
    const n = b.t.m.short || b.t.m.name;
    return b.k ? `${n} · ${b.t.m.gliederung.titel(b.t.doc.data, b.k)}` : n;
  }
  /** Text eines Bausteins; Überschriften ohne eigene Nummer bekommen die fortlaufende, angehängte Teile folgen als Absatz. */
  function bausteinText(data, b) {
    const d = b.t.doc.data;
    if (b.k) { try { return b.t.m.gliederung.abschnitt(d, b.k) || ''; } catch (e) { return ''; } }
    let p = ''; try { p = b.t.m.plain(d) || ''; } catch (e) { p = ''; }
    if (b.nr && kopfOk(b.t)) p = `${b.nr} ${p}`;
    for (const x of b.mit) {
      let r = ''; try { r = x.t.m.gliederung.rumpf(x.t.doc.data, x.k) || ''; } catch (e) { r = ''; }
      if (r) p = /\n\[noch nichts erfasst\]\s*$/i.test(p) ? p.replace(/\n\[noch nichts erfasst\]\s*$/i, '\n' + r) : p + '\n' + r; // steht dort noch nichts, ersetzt der Absatz den Platzhalter
    }
    return p;
  }
  /** Text eines Abschnitts, wie er im Gesamtsachverhalt steht (alle seine Bausteine). */
  const teilText = (data, t) => plan(data).filter(b => b.t.id === t.id).map(b => bausteinText(data, b)).join('\n\n');
  const gesamt = data => plan(data).map(b => bausteinText(data, b)).join('\n\n');

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
  /** Offene Pflichtangaben eines Abschnitts (Anzahl) – so, wie sein Modul sie meldet. */
  function offenN(t) { try { return typeof t.m.offen === 'function' ? arr(t.m.offen(t.doc.data)).length : 0; } catch (e) { return 0; } }
  /** Stand eines Abschnitts für die Übersicht: „Fertig“ heißt abgeschlossen und ohne Lücken. */
  function stand(t) {
    if (t.doc.status === 'fertig') { const n = offenN(t); return n ? `${n} offen` : 'Fertig'; }
    if (typeof t.m.pill === 'function') { try { return t.m.pill(t.doc.data); } catch (e) { return 'Entwurf'; } }
    const n = arr(t.m.steps).filter(s => !s.when || s.when(t.doc.data)).length || 1;
    const pct = Math.round(Math.min(t.doc.step || 0, n) / n * 100);
    return pct ? pct + ' %' : 'Entwurf';
  }

  /* ======================= Maske ======================= */
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  const ICON_UP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  /** Ansicht je Vorgang: 'ov' (Abschnitte), 'text' (Gesamtsachverhalt) oder 'zus' (Untermenü Zusatzbausteine). ord = Pfeile und ✕ zum Ordnen/Entfernen zeigen. */
  const V = { id: null, s: 'ov', ord: false };
  /** Module mit Zusatzbausteinen, in der Reihenfolge ihrer Stelle im Vorgang: [{ type, m, z }]. */
  const zusatzModule = () => TYPEN.filter(k => MATRIX[k].zusatz && mod(k) && mod(k).zusatz).map(k => ({ type: k, m: mod(k), z: mod(k).zusatz }));
  /** Ist der Punkt k des Moduls x in diesem Vorgang gewählt? */
  const punktAn = (T, x, k) => { const t = T.find(y => y.doc.type === x.type); try { return !!t && !!x.z.hat(t.doc.data, k); } catch (e) { return false; } };

  function open(d) { V.id = d.id; V.s = 'ov'; V.ord = false; }

  /** Übersicht: die Abschnitte als Liste – antippen öffnet, unten rechts geht es beim nächsten offenen weiter. */
  function ovHtml(d, api) {
    const data = d.data, T = teile(data);
    const items = T.map((t, i) => {
      const ctx = kontext(data, t.doc), fertig = t.doc.status === 'fertig', luecken = fertig && offenN(t) > 0;
      let sub = ''; try { sub = t.m.subtitle(t.doc.data) || ''; } catch (e) { sub = ''; }
      const von = ctx.quellen.map(([was, aus]) => `${was} aus „${aus}“`);
      const ordnen = V.ord ? `${T.length > 1 ? `<button type="button" class="sd-up" data-sd="up" data-i="${i}" aria-label="${esc(t.m.name)} nach oben"${i ? '' : ' disabled'}>${ICON_UP}</button>` : ''}<button type="button" class="sd-up vg-x" data-sd="rm" data-i="${i}" aria-label="${esc(t.m.name)} entfernen">${ICON_X}</button>` : '';
      return `<li class="sd-item"><div class="sd-row"><button type="button" class="sd-card" data-open="${esc(t.id)}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(t.m.name).replace('/', '/<wbr>')}</b><small>${esc(sub || 'noch leer')}</small></span><span class="pill ${luecken ? 'pill-accent-soft' : fertig ? 'pill-lime' : 'pill-quiet'}">${esc(stand(t))}</span></button>${ordnen}</div>${von.length ? `<p class="w-hint vg-ctx">↳ übernimmt ${esc(joinUnd(von))}</p>` : ''}</li>`;
    }).join('');
    const da = new Set(T.map(t => t.doc.type));
    const frei = TYPEN.filter(k => mod(k) && !da.has(k) && !MATRIX[k].zusatz); // Zusatzbausteine wählt man im Untermenü
    const std = STANDARD.filter(k => frei.includes(k));
    // Tür zum Untermenü „Zusatzbausteine“: Seltenes, das sich je nach Art vorn oder hinten einreiht
    const Z = zusatzModule(), zP = Z.flatMap(x => x.z.punkte.map(p => ({ x, p }))), zN = zP.filter(({ x, p }) => punktAn(T, x, p.k)).length;
    const tor = zP.length ? `<div class="sd-add-row vg-tor"><button type="button" class="sd-add-b" data-sd="zus" aria-pressed="${String(zN > 0)}"><i aria-hidden="true">${zN ? '✓' : '+'}</i><span>Zusatzbausteine<small>${zN ? `${zN} gewählt · ` : ''}${esc(zP.map(({ p }) => p.l).join(' · '))}</small></span></button></div>` : '';
    const add = frei.length || tor
      ? `<div class="sd-add"><span class="w-lbl">${T.length ? 'Weiteren Abschnitt hinzufügen' : 'Welche Abschnitte gehören zum Vorgang?'}</span>${!T.length && std.length === STANDARD.length ? `<div class="sd-add-row vg-std"><button type="button" class="sd-add-b" data-sd="std"><i aria-hidden="true">+</i><span>Üblicher Anfang<small>${esc(STANDARD.map(k => mod(k).short || mod(k).name).join(' → '))}</small></span></button></div>` : ''}${frei.length ? `<div class="sd-add-row">${frei.map(k => `<button type="button" class="sd-add-b" data-sd="add" data-v="${k}"><i aria-hidden="true">+</i>${esc(mod(k).name)}</button>`).join('')}</div>` : ''}${tor}<p class="w-hint sd-hint">Jeder Abschnitt reiht sich an seiner üblichen Stelle ein und baut auf den anderen auf: Besatzungen aus „Allgemeines“ und Personen aus der „Eintreffsituation“ stehen danach zur Auswahl.</p></div>`
      : '';
    const fertigN = T.filter(t => t.doc.status === 'fertig').length, offen = T.find(t => t.doc.status !== 'fertig');
    const angeh = T.filter(t => kontext(data, t.doc).angehaengt).map(t => `<p class="w-hint vg-ctx">↳ „${esc(t.m.short || t.m.name)}“: die Eintreffsituation von dort wird im Gesamtsachverhalt an den Abschnitt „Eintreffsituation“ angehängt.</p>`).join('');
    const next = !T.length ? null : offen ? { label: `Weiter: ${offen.m.short || offen.m.name}`, attr: `data-open="${esc(offen.id)}"` } : { label: 'Gesamtsachverhalt', attr: 'data-sd="text"' };
    return `${api.kopf({ sub: T.length ? `${fertigN} von ${T.length} ${T.length === 1 ? 'Abschnitt' : 'Abschnitten'} abgeschlossen` : 'noch ohne Abschnitte', titel: title(data), live: 'title', lead: T.length ? 'Abschnitt antippen, um ihn auszufüllen – der Text entsteht dabei von selbst.' : '' })}
      <div class="w-grid sd-grid">
        ${T.length ? `<div class="w-q"><ol class="sd-list vg-list">${items}</ol>${angeh}</div>` : ''}
        ${T.length && offen ? '<div class="w-q"><button type="button" class="btn btn-ghost fo-wide vg-gesamt" data-sd="text">Gesamtsachverhalt ansehen</button></div>' : ''}
        ${add ? `<div class="w-q" data-q="add">${add}</div>` : ''}
        <div class="w-q" data-q="name"><label class="w-lbl" for="vgName">Bezeichnung <i class="w-hint-i">(optional – sonst aus dem Einsatzanlass)</i></label><input class="input" id="vgName" data-sk="name" value="${esc(data.name || '')}" placeholder="z. B. Körperverletzung Lindenstraße" autocomplete="off" spellcheck="false" enterkeyhint="done" maxlength="80"></div>
        ${T.length ? `<div class="w-q" data-q="num"><div class="w-chips"><button type="button" class="chip" data-sd="num" aria-pressed="${String(auto(data))}">Nach Reihenfolge nummerieren (1, 2, 3 …)</button></div><p class="w-hint sd-hint">${auto(data) ? 'Alle Überschriften werden fortlaufend gezählt – auch die Teile der Häuslichen Gewalt und die beiden der Blutprobe.' : 'Jeder Abschnitt behält die Nummer, die du dort einträgst.'}</p></div>` : ''}
      </div>
      ${api.fein({ mehr: T.length ? `<button type="button" class="link" data-sd="ord">${V.ord ? 'Ordnen beenden' : 'Abschnitte ordnen oder entfernen'}</button>` : '' })}
      ${api.fuss({ next })}`;
  }

  /** Gesamtsachverhalt: alle Abschnitte hintereinander, einzeln oder zusammen zu kopieren. */
  function textHtml(d, api) {
    const data = d.data, B = plan(data), txt = gesamt(data);
    const ph = (txt.match(/\[[^\]]+\]/g) || []).length;
    const blocks = B.map((b, i) => `<div class="w-q"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">${esc(bausteinName(b))}${b.mit.length ? ` <i class="w-hint-i">mit ${esc(joinUnd(b.mit.map(x => x.t.m.short || x.t.m.name)))}</i>` : ''}</span><span class="vg-tools"><button type="button" class="btn btn-ghost btn-sm" data-open="${esc(b.t.id)}">Bearbeiten</button><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></span></div><pre class="w-out-t">${esc(bausteinText(data, b) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `${api.kopf({ up: { label: 'Abschnitte', attr: 'data-sd="ov"' }, sub: 'Gesamtsachverhalt', fertig: ph ? `${ph} ${ph === 1 ? 'Angabe' : 'Angaben'} offen` : 'Vollständig', offen: ph > 0, titel: 'Gesamtsachverhalt', lead: 'Alle Abschnitte hintereinander – einzeln oder alles zusammen kopieren.' })}
      <div class="w-grid sd-grid">
        ${ph ? `<div class="w-q"><div class="w-warn">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} (in eckigen Klammern) – über „Bearbeiten“ am Abschnitt nachtragen.</div></div>` : ''}
        ${blocks}
      </div>
      ${api.fuss({ back: { label: 'Abschnitte', attr: 'data-sd="ov"' }, next: { label: 'Alles kopieren', attr: 'data-sd="copyall"', plain: true } })}`;
  }

  /**
   * Untermenü „Zusatzbausteine“: Seltenes, das nicht in jeden Bericht gehört. Was sofort aufgenommen wird (Personenbeschreibung),
   * öffnet sich beim Antippen und steht im Vorgang ganz vorn; alles andere wird nur angehakt und am Ende im Abschnitt
   * „Maßnahmen“ abgefragt. Welche Punkte es gibt, sagen die Module selbst (m.zusatz).
   */
  function zusHtml(d, api) {
    const data = d.data, T = teile(data), Z = zusatzModule();
    const zeile = (x, p) => {
      const t = T.find(y => y.doc.type === x.type) || null, an = punktAn(T, x, p.k);
      if (x.z.wann === 'zuerst') {
        let info = ''; try { info = an && typeof x.z.info === 'function' ? x.z.info(t.doc.data) : ''; } catch (e) { info = ''; }
        return `<button type="button" class="sd-add-b" data-sd="zo" data-m="${esc(x.type)}" aria-pressed="${String(an)}"><i aria-hidden="true">${an ? '✓' : '+'}</i><span>${esc(p.l)}<small>${esc(info || p.h)}</small></span><em>${an ? 'Öffnen' : 'Aufnehmen'}</em></button>`;
      }
      return `<button type="button" class="sd-add-b" data-sd="zt" data-m="${esc(x.type)}" data-v="${esc(p.k)}" aria-pressed="${String(an)}"><i aria-hidden="true">${an ? '✓' : '+'}</i><span>${esc(p.l)}<small>${esc(p.h)}</small></span></button>`;
    };
    const gruppe = (vorn, titel, hin, nach) => {
      const X = Z.filter(x => (x.z.wann === 'zuerst') === vorn); if (!X.length) return '';
      return `<div class="w-q" data-q="${vorn ? 'zvorn' : 'zende'}"><div class="sd-add"><span class="w-lbl">${titel} <i class="w-hint-i">${hin}</i></span><div class="zs-list">${X.map(x => x.z.punkte.map(p => zeile(x, p)).join('')).join('')}</div>${nach ? `<p class="w-hint sd-hint">${nach}</p>` : ''}</div></div>`;
    };
    // Der eine nächste Schritt: was sofort aufgenommen wird und noch offen ist – sonst zurück in den Vorgang
    const vorn = T.find(t => t.m.zusatz && t.m.zusatz.wann === 'zuerst' && t.doc.status !== 'fertig');
    const next = vorn ? { label: `Weiter: ${vorn.m.short || vorn.m.name}`, attr: `data-open="${esc(vorn.id)}"` } : { label: 'Zum Vorgang', attr: 'data-sd="ov"' };
    return `${api.kopf({ up: { label: 'Vorgang', attr: 'data-sd="ov"' }, sub: 'Zusatzbausteine', titel: 'Was soll noch in den Bericht?', lead: 'Seltenes, das nicht in jeden Bericht gehört. Antippen nimmt es auf – jedes an seiner Stelle.' })}
      <div class="w-grid sd-grid">
        ${gruppe(true, 'Gleich aufnehmen', '– steht im Vorgang ganz vorn', 'Lässt sich später in den Schilderungen bei der Person übernehmen, die sie abgegeben hat.')}
        ${gruppe(false, 'Am Ende abfragen', '– im letzten Abschnitt „Maßnahmen“', 'Dort lässt sich später noch etwas dazunehmen, wenn dir etwas einfällt.')}
      </div>
      ${api.fuss({ back: vorn ? { label: 'Vorgang', attr: 'data-sd="ov"' } : null, next })}`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (V.s === 'text' && !teile(d.data).length) V.s = 'ov';
    return V.s === 'text' ? textHtml(d, api) : V.s === 'zus' ? zusHtml(d, api) : ovHtml(d, api);
  }

  /** Abschnitt anlegen und an seiner üblichen Stelle einreihen. Datum, Uhrzeit und Besatzung kommen aus dem Vorgang. */
  function addTeil(api, type) {
    const d = api.d, data = d.data;
    if (!MATRIX[type] || !mod(type) || teile(data).some(t => t.doc.type === type)) return null;
    const pre = { einsatz: JSON.parse(JSON.stringify(data.einsatz && typeof data.einsatz === 'object' ? data.einsatz : {})) };
    const nd = api.create(type, pre); if (!nd) return null;
    // Die Vorbelegung aus der Schicht gilt nicht als eigene Eingabe: „Allgemeines“ darf sie ersetzen
    if (MATRIX[type].nimmt.includes('kraefte')) { const own = eigene(nd.data); if (own.length) nd.data.vgk = sig(own); }
    const mv = mod(type).vg; // ebenso das heutige Datum: Es folgt dem Datum aus „Allgemeines“
    if (mv && mv.datum && has(get(nd.data, mv.datum))) nd.data.vgv = { ...(nd.data.vgv || {}), datum: str(get(nd.data, mv.datum)) };
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
      case 'text': V.s = 'text'; api.render(); return true;
      case 'ov': V.s = 'ov'; api.render(); return true;
      case 'zus': V.s = 'zus'; api.render(); return true;
      /* Zusatzbaustein, der am Ende abgefragt wird: an- oder abwählen. Der Abschnitt entsteht mit dem ersten Punkt und geht mit dem letzten. */
      case 'zt': {
        const type = b.dataset.m, k = b.dataset.v, m = mod(type), z = m && m.zusatz; if (!z) return true;
        const t = teile(data).find(x => x.doc.type === type) || null;
        let doc = t ? t.doc : null;
        if (!(doc && z.hat(doc.data, k))) {
          if (!doc) { doc = addTeil(api, type); if (!doc) { api.toast('Abschnitt konnte nicht angelegt werden.'); return true; } }
          z.setzen(doc.data, k, true);
          if (doc.status === 'fertig') doc.status = 'entwurf'; // es kommt eine Frage dazu
          commit(api, [doc]);
        } else if (z.punkte.filter(p => z.hat(doc.data, p.k)).length <= 1) {
          // der letzte Punkt: der Abschnitt geht mit – samt Antworten, deshalb mit „Rückgängig“
          const snap = api.removeDocs([doc.id]);
          data.teile = arr(data.teile).filter(x => x && x.id !== doc.id);
          commit(api);
          api.toast(`Entfernt: ${m.name}`, snap ? { undo: snap } : {});
        } else { z.setzen(doc.data, k, false); commit(api, [doc]); }
        return true;
      }
      /* Zusatzbaustein, der sofort aufgenommen wird: anlegen (falls nötig) und gleich öffnen */
      case 'zo': {
        const type = b.dataset.m, t = teile(data).find(x => x.doc.type === type) || null;
        let doc = t ? t.doc : null;
        if (!doc) {
          doc = addTeil(api, type); if (!doc) { api.toast('Abschnitt konnte nicht angelegt werden.'); return true; }
          const r = sync(d); for (const x of new Set([...r.teile, doc])) api.touch(x);
          api.touch(d); // sofort sichern – gleich danach wird der Abschnitt geöffnet
        }
        api.open(doc.id); return true;
      }
      case 'ord': V.ord = !V.ord; api.render(); return true;
      case 'copy1': { const B = plan(data), i = Number(b.dataset.i); if (B[i]) api.copy(bausteinText(data, B[i]), b); return true; }
      case 'copyall': api.copy(gesamt(data), b); return true;
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
  /** ⌘/Strg + Enter: der eine nächste Schritt – wie der Knopf unten rechts. */
  function submit() { const b = document.querySelector('#wMain .fo-nav .fo-next'); if (b) b.click(); }

  root.WVorgang = Object.freeze({
    id: 'vorgang', name: 'Vorgang aus Abschnitten', short: 'Vorgang', kurz: 'VG',
    desc: 'Mehrere Abschnitte zu einem Sachverhalt kombinieren – Besatzungen und Personen werden von Abschnitt zu Abschnitt übernommen',
    intro: 'Abschnitte auswählen (Allgemeines, Eintreffsituation, Schilderungen …) – sie reihen sich aneinander und bauen aufeinander auf · Gesamtsachverhalt zum Kopieren',
    labels: { newBtn: 'Vorgang aus Abschnitten', bericht: 'Gesamtsachverhalt' },
    steps: [],
    title, subtitle, pill,
    plain: gesamt,
    text: data => plan(data).map(b => ['', bausteinName(b), bausteinText(data, b), '']),
    preview: () => '', kurzText: () => '', fahndung: () => '', offen: () => [], personalien: () => '',
    screen: { open, render, click, input, keydown, submit, key: d => `${V.s}:${d ? teile(d.data).length : 0}`, show: s2 => { V.s = s2 === 'text' || s2 === 'zus' ? s2 : 'ov'; } },
    bind,
    core: { MATRIX, KONTEXT, TYPEN, teile, containerOf, partIds, kontext, kraefte, kraefteAnwenden, sync, plan, bausteinText, bausteinName, gesamt, teilText, auto, stand, leute, sicht, personSetzen, personLoesen, zusatzModule }
  });

  /**
   * „Zusatzbausteine“ als eigene Kachel. Kein eigener Vorgangsteil: Sie legt einen Vorgang an und öffnet dort gleich das
   * Untermenü (als = was angelegt und welche Ansicht gezeigt wird, siehe writer.js). So gehört, was vor Ort zuerst aufgenommen
   * wird, von Anfang an zu dem Vorgang, in den später die übrigen Abschnitte kommen.
   */
  root.WZusatz = Object.freeze({
    id: 'zusatz', name: 'Zusatzbausteine', short: 'Zusatzbausteine', kurz: 'ZB',
    desc: 'Seltenes für den Bericht – Personen- und Fahrzeugbeschreibung gleich aufnehmen, Maßnahmen am Ende abfragen',
    intro: 'Seltenes für den Bericht: Personen- und Fahrzeugbeschreibung gleich aufnehmen · Nahbereichsfahndung, Spurensicherung, Videoaufzeichnungen und Lichtbildmappe am Ende unter „Maßnahmen“ abfragen',
    labels: { newBtn: 'Zusatzbausteine' },
    steps: [],
    als: { type: 'vorgang', zeige: 'zus' }
  });
})(typeof window !== 'undefined' ? window : globalThis);
