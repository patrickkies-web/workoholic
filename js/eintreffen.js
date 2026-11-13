/*
 * Workoholic · Abschnitt „Eintreffsituation“
 * ---------------------------------------------------------------
 * Öffner für die Folgeabschnitte – unabhängig vom Einsatzanlass (Körperverletzung, Diebstahl, Verkehrsunfall …):
 * Wer war vor Ort, in welcher Rolle, wo wurde wer angetroffen (einzeln oder gemeinsam) und wer war verletzt.
 *
 * Ablauf: „Worum geht es?“ (Strafanzeige oder Verkehrsangelegenheit – davon hängen die Namen im Text ab) → Personen mit „+“.
 * In der Maske der Person steht alles zu ihr: Rolle, Anrede, Name, wo sie angetroffen wurde – allein oder zusammen mit
 * anderen, frei als Satzbaustein oder über die Schnellwahl „Wohngebäude“, die Schritt für Schritt genauer wird (immer nur
 * eine Frage) – und ihre Verletzungen. Intern steht jede Person an genau einem Ort (data.orte[].wer); teilen sich mehrere
 * einen Ort, heißt es im Text „gemeinsam“.
 *
 * Namensregeln, Rollen (auch Unfallbeteiligte 01, 02 …) und die Verletzungen kommen aus js/schilderung.js – die Personen haben
 * dieselbe Form, damit ein Vorgang sie in die Schilderungen übernehmen kann (js/vorgang.js). Die Textlogik ist rein und ohne
 * DOM testbar; die Maske zeichnet writer.js über m.screen. Gespeichert wird ausschließlich im verschlüsselten Tresor.
 */
(function (root) {
  'use strict';
  if (!root.WSchild) return;
  const C = root.WSchild.core, UI = root.WSchild.ui;

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const str = v => (v == null ? '' : String(v)).trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ohnePunkt = s => str(s).replace(/[.]+$/, '');
  const satz = s => { s = str(s); return s && !/[.!?]$/.test(s) ? s + '.' : s; };
  const pad2 = n => String(n).padStart(2, '0');

  /* ======================= Personen und Orte ======================= */
  /** Kennung einer Person – über sie verweisen die Orte und später die Schilderungen auf die Person. */
  function pidNew(P) { let id; do { id = 'p' + Math.random().toString(36).slice(2, 8); } while (arr(P).some(p => p && p.pid === id)); return id; }
  const idxOf = (data, pid) => arr(data.personen).findIndex(p => p && p.pid === pid);
  /** Personen eines Ortes als Indizes, in der Reihenfolge, in der sie dem Ort zugeordnet wurden. */
  const mitglieder = (data, g) => arr(g && g.wer).map(pid => idxOf(data, pid)).filter(i => i >= 0);
  /** Nummer des Ortes (ab 0), an dem die Person angetroffen wurde; -1 = noch nicht zugeordnet. */
  const ortVon = (data, p) => arr(data.orte).findIndex(g => p && p.pid && arr(g && g.wer).includes(p.pid));
  /**
   * Bringt die Daten in Form (liefert true, wenn etwas geändert wurde): jede Person bekommt eine Kennung und steht an
   * genau einem Ort – ohne Zuordnung an ihrem eigenen. Orte verweisen nur auf vorhandene Personen; Orte ohne Personen
   * gibt es nicht.
   */
  function ordnen(data) {
    let ch = false;
    if (data.personen != null && !Array.isArray(data.personen)) { delete data.personen; ch = true; }
    const P = arr(data.personen);
    for (let i = 0; i < P.length; i++) { if (!P[i] || typeof P[i] !== 'object') { P[i] = {}; ch = true; } if (!has(P[i].pid)) { P[i].pid = pidNew(P); ch = true; } }
    const ok = new Set(P.map(p => p.pid)), seen = new Set(), roh = data.orte;
    const O = arr(roh).filter(g => g && typeof g === 'object');
    for (const g of O) {
      const w = arr(g.wer), neu = w.filter(pid => ok.has(pid) && !seen.has(pid) && seen.add(pid));
      if (neu.length !== w.length || !Array.isArray(g.wer)) { g.wer = neu; ch = true; }
    }
    const voll = O.filter(g => g.wer.length);
    for (const p of P) if (!seen.has(p.pid)) voll.push({ wer: [p.pid] });
    const gleich = Array.isArray(roh) && roh.length === voll.length && voll.every((g, i) => g === roh[i]);
    if (!gleich && (voll.length || roh != null)) { if (voll.length) data.orte = voll; else delete data.orte; ch = true; }
    return ch;
  }

  /**
   * Kontext aus dem Vorgang: Personen, die nur in den Schilderungen stehen, zählen beim Unterscheiden gleicher Namen mit
   * (data.mit) – so heißt dieselbe Person in allen Abschnitten gleich. Liefert true, wenn sich etwas geändert hat.
   */
  function nimmt(data, ctx) {
    if (!data || typeof data !== 'object') return false;
    const mit = ctx && Array.isArray(ctx.namen) && ctx.namen.length ? ctx.namen : undefined;
    if (JSON.stringify(data.mit ?? null) === JSON.stringify(mit ?? null)) return false;
    if (mit) data.mit = JSON.parse(JSON.stringify(mit)); else delete data.mit;
    return true;
  }

  /* ======================= Text ======================= */
  /** Wie die Personen angetroffen wurden: [Schlüssel, Chip, [Verb Einzahl, Verb Mehrzahl], Satzende, Beispiel für den Ort]. */
  const WIE = [
    ['ang', 'Angetroffen', ['wurde', 'wurden'], ' angetroffen', 'vor dem Haus an der Einsatzörtlichkeit'],
    ['erw', 'Erwartete uns', ['erwartete uns', 'erwarteten uns'], '', 'auf dem Gehweg vor der Einsatzörtlichkeit'],
    ['auf', 'Hielt sich dort auf', ['hielt sich', 'hielten sich'], ' auf', 'im Verkaufsraum des Geschäfts'],
    ['weg', 'Nicht mehr vor Ort', ['war', 'waren'], ' nicht mehr vor Ort', '']
  ];
  const wieOf = g => WIE.find(x => x[0] === (g && g.wie)) || WIE[0];
  const ortText = g => ohnePunkt(g && g.text);
  /**
   * Der Satz zu einem Ort. Der erste Satz des Abschnitts beginnt mit „Bei unserem Eintreffen“, die weiteren mit den Personen:
   *   Bei unserem Eintreffen wurden der Geschädigte Meier und die Zeugin Schulz gemeinsam vor dem Haus angetroffen.
   *   Der Beschuldigte Krause hielt sich im Wohnzimmer der Wohnung auf.
   * ort = fester Text statt des erfassten Ortes (für die Vorschau des Satzbausteins).
   */
  function ortSatz(data, g, erster, ort) {
    const idx = mitglieder(data, g); if (!idx.length) return '';
    const w = wieOf(g), mehr = idx.length > 1, wer = joinUnd(idx.map(i => C.werVon(data, i)));
    const verb = w[2][mehr ? 1 : 0], weg = w[0] === 'weg';
    const gem = mehr && !weg ? ' gemeinsam' : '';
    const wo = weg ? '' : ' ' + (ort != null ? ort : ortText(g) || '[wo?]');
    if (erster) return `Bei unserem Eintreffen${has(data.zeit) ? ` um ${str(data.zeit)} Uhr` : ''} ${verb} ${wer}${gem}${wo}${w[3]}.`;
    if (weg) return `${cap(wer)} ${verb} bei unserem Eintreffen nicht mehr vor Ort.`;
    return `${cap(wer)} ${verb}${gem}${wo}${w[3]}.`;
  }
  /** Ist dieser Ort der erste mit Personen (sein Satz beginnt mit „Bei unserem Eintreffen“)? */
  const istErster = (data, gi) => !arr(data.orte).slice(0, gi).some(g => mitglieder(data, g).length);
  /**
   * Der Abschnitt: je Ort ein Absatz – Antreffen, Ergänzung, danach die Verletzungen der dort angetroffenen Personen.
   * Personen ohne Ort stehen als [Platzhalter] da; zuletzt die weiteren Feststellungen.
   */
  function text(data) {
    data = data || {};
    const P = arr(data.personen), out = [], da = new Set();
    let erster = true;
    for (const g of arr(data.orte)) {
      const idx = mitglieder(data, g); if (!idx.length) continue;
      idx.forEach(i => da.add(i));
      // Eine einzelne Person ist gerade genannt: die Verletzungen schließen mit „Er/Sie …“ an
      const pron = idx.length === 1 && !has(g.zusatz), weg = wieOf(g)[0] === 'weg'; // wer nicht mehr vor Ort war, wurde nicht in Augenschein genommen
      out.push([ortSatz(data, g, erster), satz(g.zusatz), ...(weg ? [] : idx.map(i => C.verletzungText(data, i, pron)))].filter(Boolean).join(' '));
      erster = false;
    }
    P.forEach((p, i) => { if (p && !da.has(i)) out.push([`[Wo wurde ${C.werVon(data, i)} angetroffen?]`, C.verletzungText(data, i)].filter(Boolean).join(' ')); });
    if (has(data.text)) out.push(satz(data.text));
    return out.join('\n');
  }
  /** Abschnittsnummer ohne Punkt dahinter; ohne Angabe „2“ (wie in der Vorlage), „-“ = ohne Nummer. */
  const nrOf = data => (data && data.nr !== undefined ? C.cleanNr(data.nr) : '2');
  const abschnitt = data => `${nrOf(data) ? nrOf(data) + ' ' : ''}Eintreffsituation\n${text(data) || '[Noch nichts erfasst]'}`;

  /* ---------- Was noch fehlt ---------- */
  const kurzName = p => [C.herrFrau(p), str(p.nachname) || '[Nachname]'].join(' ');
  /** weg = die Person war nicht mehr vor Ort – dann ist zu Verletzungen nichts festzustellen. */
  function personFehlt(p, weg = false) {
    const m = [];
    if (!p.rolle) m.push('Rolle');
    if (p.rolle === 'ub' && !C.ubNr(p)) m.push('Nummer');
    if (p.g !== 'm' && p.g !== 'w') m.push('Anrede');
    if (!has(p.nachname)) m.push('Nachname');
    if (!weg && !['nein', 'schmerz', 'ja'].includes(p.verl)) m.push('Verletzungen');
    m.push(...C.verlFehlt(p));
    return m;
  }
  const istWeg = (data, p) => { const gi = ortVon(data, p); return gi >= 0 && wieOf(arr(data.orte)[gi])[0] === 'weg'; };
  function offen(data) {
    data = data || {};
    const m = [], P = arr(data.personen);
    if (!data.art) m.push('Strafanzeige oder Verkehrsangelegenheit wählen');
    if (!P.length) m.push('Personen erfassen');
    P.forEach(p => {
      if (!p) return;
      const f = personFehlt(p, istWeg(data, p)); if (f.length) m.push(`${kurzName(p)}: ${f.join(', ')}`);
      if (ortVon(data, p) < 0) m.push(`${kurzName(p)}: wo angetroffen?`);
    });
    for (const g of arr(data.orte)) { const idx = mitglieder(data, g); if (idx.length && wieOf(g)[0] !== 'weg' && !has(g.text)) m.push(`${joinUnd(idx.map(i => kurzName(P[i])))}: wo angetroffen?`); }
    return m;
  }

  /* ======================= Schnellwahl „Wohngebäude“ ======================= */
  /*
   * Entscheidungsbaum – es erscheint immer nur die nächste Frage:
   *
   *   Wohngebäude
   *   ├─ 1 Gebäude: Einfamilienhaus · Doppelhaushälfte · Reihenhaus · Mehrfamilienhaus · Hochhaus ·
   *   │             Wohn- und Geschäftshaus · Gemeinschaftsunterkunft
   *   │     ├─ Doppelhaushälfte → linke / rechte Haushälfte
   *   │     └─ Reihenhaus       → Reihenendhaus / Reihenmittelhaus
   *   └─ 2 Wo am oder im Gebäude?
   *         ├─ Vor dem Gebäude → Stelle: vor dem Haus · vor der Haustür · Gehweg · Straße · Einfahrt · Parkplatz ·
   *         │                    Garten hinter dem Haus · (Einzelhaus: Vorgarten · Terrasse · Garage) · (Mehrparteien: Hof)
   *         ├─ An der Tür      → Einzelhaus: Haustür
   *         │                    Mehrparteien: Haustür | Wohnungstür → Geschoss → Seite
   *         ├─ Im Gebäude      → (nur Mehrparteien) Hauseingang · Treppenhaus → Geschoss · Hausflur → Geschoss · Aufzug ·
   *         │                    Keller · Tiefgarage · Dachboden · Waschküche
   *         └─ In der Wohnung  → Geschoss → Seite (links, Mitte, rechts) → Raum
   *            / Im Haus       → Geschoss → Raum
   *
   * Jede Auswahl schreibt den Ort als Satzbaustein in das Textfeld („im Wohnzimmer der Wohnung im 2. Obergeschoss links des
   * Mehrfamilienhauses“), wo er sich von Hand ändern lässt. Fragen mit „Überspringen“ dürfen offen bleiben.
   */
  /** [Schlüssel, Chip, Dativ, Genitiv, mehrere Parteien] */
  const GEB = [
    ['efh', 'Einfamilienhaus', 'dem Einfamilienhaus', 'des Einfamilienhauses', false],
    ['dhh', 'Doppelhaushälfte', 'der Doppelhaushälfte', 'der Doppelhaushälfte', false],
    ['rh', 'Reihenhaus', 'dem Reihenhaus', 'des Reihenhauses', false],
    ['mfh', 'Mehrfamilienhaus', 'dem Mehrfamilienhaus', 'des Mehrfamilienhauses', true],
    ['hh', 'Hochhaus', 'dem Hochhaus', 'des Hochhauses', true],
    ['wgh', 'Wohn- und Geschäftshaus', 'dem Wohn- und Geschäftshaus', 'des Wohn- und Geschäftshauses', true],
    ['gu', 'Gemeinschaftsunterkunft', 'der Gemeinschaftsunterkunft', 'der Gemeinschaftsunterkunft', true]
  ];
  /** Genauere Angabe zum Gebäude: [Frage, [[Schlüssel, Chip, Dativ, Genitiv]]] */
  const TEIL = {
    dhh: ['Welche Haushälfte?', [['links', 'Linke Haushälfte', 'der linken Doppelhaushälfte', 'der linken Doppelhaushälfte'], ['rechts', 'Rechte Haushälfte', 'der rechten Doppelhaushälfte', 'der rechten Doppelhaushälfte']]],
    rh: ['Wo in der Reihe?', [['end', 'Reihenendhaus', 'dem Reihenendhaus', 'des Reihenendhauses'], ['mitte', 'Reihenmittelhaus', 'dem Reihenmittelhaus', 'des Reihenmittelhauses']]]
  };
  /** Stellen vor dem Gebäude: [Schlüssel, Chip, Satzbaustein, nur für: 'e' Einzelhaus / 'm' Mehrparteien] */
  const STELLE = [
    ['haus', 'Vor dem Haus', F => `vor ${F.dat}`],
    ['tuer', 'Vor der Haustür', F => `vor der Haustür ${F.gen}`],
    ['gehweg', 'Auf dem Gehweg', F => `auf dem Gehweg vor ${F.dat}`],
    ['strasse', 'Auf der Straße', F => `auf der Straße vor ${F.dat}`],
    ['einfahrt', 'In der Einfahrt', F => `in der Einfahrt ${F.gen}`],
    ['parkplatz', 'Auf dem Parkplatz', F => `auf dem Parkplatz vor ${F.dat}`],
    ['vorgarten', 'Im Vorgarten', F => `im Vorgarten ${F.gen}`, 'e'],
    ['garten', 'Im Garten hinter dem Haus', F => `im Garten hinter ${F.dat}`],
    ['terrasse', 'Auf der Terrasse', F => `auf der Terrasse ${F.gen}`, 'e'],
    ['garage', 'An der Garage', F => `an der Garage ${F.gen}`, 'e'],
    ['hof', 'Im Hof', F => `im Hof ${F.gen}`, 'm']
  ];
  /** Gemeinschaftsbereiche: [Schlüssel, Chip, Satzbaustein, mit Geschoss?] */
  const BEREICH = [
    ['eingang', 'Hauseingang', 'im Hauseingang'], ['treppe', 'Treppenhaus', 'im Treppenhaus', true], ['flur', 'Hausflur', 'im Hausflur', true],
    ['aufzug', 'Aufzug', 'im Aufzug'], ['keller', 'Keller', 'im Keller'], ['tg', 'Tiefgarage', 'in der Tiefgarage'],
    ['boden', 'Dachboden', 'auf dem Dachboden'], ['wasch', 'Waschküche', 'in der Waschküche']
  ];
  const ETAGE_M = [['eg', 'EG'], ['hp', 'Hochparterre'], ['1', '1. OG'], ['2', '2. OG'], ['3', '3. OG'], ['4', '4. OG'], ['5', '5. OG'], ['dg', 'DG'], ['ug', 'Souterrain']];
  const ETAGE_H = [['eg', 'EG'], ...Array.from({ length: 15 }, (x, i) => [String(i + 1), `${i + 1}. OG`])];
  const ETAGE_E = [['eg', 'Erdgeschoss'], ['og', 'Obergeschoss'], ['dg', 'Dachgeschoss'], ['kg', 'Keller']];
  const ETAGE_T = { eg: 'im Erdgeschoss', hp: 'im Hochparterre', og: 'im Obergeschoss', dg: 'im Dachgeschoss', ug: 'im Souterrain', kg: 'im Keller' };
  const LAGE = [['links', 'Links', 'links'], ['mitte', 'Mitte', 'mittig'], ['rechts', 'Rechts', 'rechts']];
  const RAUM = [['flur', 'Flur', 'im Flur'], ['wz', 'Wohnzimmer', 'im Wohnzimmer'], ['kueche', 'Küche', 'in der Küche'], ['sz', 'Schlafzimmer', 'im Schlafzimmer'], ['kz', 'Kinderzimmer', 'im Kinderzimmer'], ['bad', 'Badezimmer', 'im Badezimmer'], ['ez', 'Esszimmer', 'im Esszimmer'], ['balkon', 'Balkon', 'auf dem Balkon']];
  const SKIP = '-';
  /** Reihenfolge der Antworten – wer eine Antwort ändert, verwirft alle späteren. */
  const W_KEYS = ['geb', 'teil', 'wo', 'stelle', 'tuer', 'ber', 'etage', 'lage', 'raum'];

  /** Formen des gewählten Gebäudes: { dat, gen, multi, gu } oder null. */
  function gebForm(w) {
    const g = GEB.find(x => x[0] === (w && w.geb)); if (!g) return null;
    const t = TEIL[g[0]] && TEIL[g[0]][1].find(x => x[0] === w.teil);
    return { dat: t ? t[2] : g[2], gen: t ? t[3] : g[3], multi: g[4], gu: g[0] === 'gu' };
  }
  /** Die Fragen, die nach den bisherigen Antworten anstehen: [{ k, q, o: [[Wert, Chip]], opt }] – in dieser Reihenfolge. */
  function wohnSteps(w) {
    w = w || {};
    const s = [{ k: 'geb', q: 'Was für ein Wohngebäude?', o: GEB.map(x => [x[0], x[1]]) }];
    const F = gebForm(w); if (!F) return s;
    if (TEIL[w.geb]) s.push({ k: 'teil', q: TEIL[w.geb][0], o: TEIL[w.geb][1].map(x => [x[0], x[1]]), opt: true });
    s.push({ k: 'wo', q: 'Wo am oder im Gebäude?', o: F.multi
      ? [['vor', 'Vor dem Gebäude'], ['tuer', 'An der Tür'], ['gem', 'Im Gebäude (Treppenhaus, Keller …)'], ['whg', F.gu ? 'In einem Zimmer' : 'In der Wohnung']]
      : [['vor', 'Vor dem Gebäude'], ['tuer', 'An der Haustür'], ['whg', 'Im Haus']] });
    const etage = { k: 'etage', q: 'In welchem Geschoss?', o: !F.multi ? ETAGE_E : w.geb === 'hh' ? ETAGE_H : ETAGE_M, opt: true };
    const lage = { k: 'lage', q: 'Auf welcher Seite?', o: LAGE.map(x => [x[0], x[1]]), opt: true };
    if (w.wo === 'vor') s.push({ k: 'stelle', q: 'Wo genau vor dem Gebäude?', o: STELLE.filter(x => !x[3] || x[3] === (F.multi ? 'm' : 'e')).map(x => [x[0], x[1]]), opt: true });
    if (w.wo === 'tuer' && F.multi) {
      s.push({ k: 'tuer', q: 'An welcher Tür?', o: [['haus', 'Haustür'], ['whg', F.gu ? 'Zimmertür' : 'Wohnungstür']] });
      if (w.tuer === 'whg') { s.push(etage); if (!F.gu) s.push(lage); }
    }
    if (w.wo === 'gem') {
      s.push({ k: 'ber', q: 'Wo im Gebäude?', o: BEREICH.map(x => [x[0], x[1]]) });
      if ((BEREICH.find(x => x[0] === w.ber) || [])[3]) s.push(etage);
    }
    if (w.wo === 'whg') {
      s.push(etage);
      if (F.multi && !F.gu) s.push(lage);
      if (!F.gu) s.push({ k: 'raum', q: 'In welchem Raum?', o: RAUM.map(x => [x[0], x[1]]), opt: true });
    }
    return s;
  }
  /** Die nächste offene Frage (oder null, wenn alles beantwortet ist). */
  const wohnOffen = w => wohnSteps(w).find(s => (w || {})[s.k] == null) || null;
  /** Antwort setzen: alles, was im Baum danach kommt, wird verworfen. v = undefined stellt die Frage erneut. */
  function wohnSet(w, k, v) {
    const o = {};
    for (const key of W_KEYS) { if (key === k) { if (v != null) o[k] = v; break; } if ((w || {})[key] != null) o[key] = w[key]; }
    return o;
  }
  const kontr = (prae, dat) => (dat.startsWith('dem ') ? (prae === 'in' ? 'im ' : 'am ') + dat.slice(4) : `${prae} ${dat}`);
  /** Satzbaustein aus den bisherigen Antworten – passt hinter „wurde“, „erwartete uns“ und „hielt sich“. */
  function wohnPhrase(w) {
    w = w || {};
    const F = gebForm(w); if (!F) return '';
    const et = has(w.etage) && w.etage !== SKIP ? ' ' + (ETAGE_T[w.etage] || `im ${w.etage}. Obergeschoss`) : '';
    const lg = LAGE.find(x => x[0] === w.lage), la = lg ? ' ' + lg[2] : '';
    if (w.wo === 'vor') { const st = STELLE.find(x => x[0] === w.stelle); return st ? st[2](F) : `vor ${F.dat}`; }
    if (w.wo === 'tuer') return F.multi && w.tuer === 'whg' ? `an der ${F.gu ? 'Zimmertür' : 'Wohnungstür'}${et}${la} ${F.gen}` : `an der Haustür ${F.gen}`;
    if (w.wo === 'gem') { const b = BEREICH.find(x => x[0] === w.ber); return b ? `${b[2]}${b[3] ? et : ''} ${F.gen}` : kontr('in', F.dat); }
    if (w.wo === 'whg') {
      const r = RAUM.find(x => x[0] === w.raum);
      if (F.multi) return r ? `${r[2]} der Wohnung${et}${la} ${F.gen}` : `${F.gu ? 'in einem Zimmer' : 'in der Wohnung'}${et}${la} ${F.gen}`;
      if (r) return `${r[2]}${et} ${F.gen}`;
      return et ? `${et.trim()} ${F.gen}` : kontr('in', F.dat);
    }
    return kontr('an', F.dat);
  }
  /** Beschriftung einer Antwort für die Wegleiste. */
  function wohnLabel(w, k) {
    const st = wohnSteps(wohnSet(w, k, w[k])).find(s => s.k === k), v = w[k];
    if (v === SKIP) return '–';
    const o = st && st.o.find(x => x[0] === v); return o ? o[1] : String(v);
  }

  /* ======================= Listen-Texte ======================= */
  function title(data) {
    const P = arr(data && data.personen);
    const names = P.map((p, i) => (has(p && p.nachname) ? C.nameOf(data, i) : '')).filter(Boolean);
    return names.length ? `Eintreffsituation – ${names.join(', ')}` : 'Eintreffsituation';
  }
  function subtitle(data) {
    const n = arr(data && data.personen).length;
    return `${{ straf: 'Strafanzeige', verkehr: 'Verkehrsangelegenheit' }[data && data.art] || 'Art offen'} · ${n} ${n === 1 ? 'Person' : 'Personen'}`;
  }
  function pill(data) { const n = offen(data).length; return !arr(data && data.personen).length ? 'neu' : n ? `${n} offen` : 'bereit'; }

  /* ======================= Maske ======================= */
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  /**
   * Ansicht je Vorgang: 'menu' (Personen), 'person' (Maske einer Person mit ihrem Ort), 'done' (fertiger Abschnitt).
   * alt = Angaben zum eigenen Ort einer Person, gemerkt für den Fall, dass sie von „zusammen mit …“ zurück zu „allein“ wechselt.
   */
  const V = { id: null, s: 'menu', i: -1, focus: '', alt: {} };
  const $ = s => document.querySelector(s);
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };
  const seg = (path, cur, opts, cls = 'w-seg') => `<div class="${cls}" role="group">${opts.map(([v, l]) => `<button type="button" class="${cls === 'w-seg' ? 'w-opt' : 'chip'}" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  /** Einzeiliges Feld, das mit dem Text mitwächst – der ganze Satzbaustein bleibt auch am Handy lesbar. */
  const textIn = (id, path, val, ph, max = 400) => `<textarea class="input es-ta" id="${id}" data-sk="${esc(path)}" data-single="1" rows="1" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="true" enterkeyhint="done" maxlength="${max}">${esc(val || '')}</textarea>`;
  const grow = ta => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  const topBar = (back, kicker, ttl) => `<div class="w-top"><button type="button" class="icon-btn sm${back === 'list' ? ' w-back' : ''}" ${back === 'list' ? 'data-w="list" aria-label="Zurück"' : `data-sd="${back}" aria-label="Zurück zur Übersicht"`}>${ICON_BACK}</button><div class="w-top-t"><span class="spaced">${esc(kicker)}</span><div class="w-title" data-live="kopf">${esc(ttl)}</div></div></div>`;
  const ARTL = Object.fromEntries(C.ARTEN);
  const vollName = p => [C.herrFrau(p), str(p.vorname), str(p.nachname) || '[Nachname]'].filter(Boolean).join(' ');
  const verlKurz = p => (p.verl === 'nein' ? 'nicht verletzt' : p.verl === 'schmerz' ? 'gibt Schmerzen an' : p.verl === 'ja' ? 'verletzt' : 'Verletzungen offen');
  /** Kurzbeschreibung eines Ortes für Chips und die Personenliste. */
  function ortKurz(g) {
    if (wieOf(g)[0] === 'weg') return 'nicht mehr vor Ort';
    const t = ortText(g); return t ? (t.length > 46 ? t.slice(0, 45) + '…' : t) : 'Ort offen';
  }
  /** Angaben zu einem Ort ohne die Personen. */
  const ortInhalt = g => { const o = {}; for (const k of ['wie', 'text', 'w', 'zusatz']) if (g && g[k] != null && g[k] !== '') o[k] = g[k]; return o; };

  function open(d) { V.id = d.id; V.s = d.status === 'fertig' && arr(d.data && d.data.personen).length ? 'done' : 'menu'; V.i = -1; V.focus = ''; V.alt = {}; }

  /** Schnellwahl „Wohngebäude“ an einem Ort: Wegleiste der bisherigen Antworten und die eine nächste Frage. */
  function wohnHtml(g, gi) {
    const w = g.w;
    if (!w || typeof w !== 'object') return `<div class="es-wahl"><span class="w-mk-gt">Schnellwahl</span><div class="w-chips"><button type="button" class="chip" data-sd="wohn" data-g="${gi}" aria-pressed="false">Wohngebäude</button></div></div>`;
    const steps = wohnSteps(w), frage = steps.find(s => w[s.k] == null);
    const weg = steps.filter(s => w[s.k] != null).map(s => `<i aria-hidden="true">›</i><button type="button" class="chip sm" data-sd="wback" data-g="${gi}" data-k="${s.k}" aria-pressed="true" title="Ab hier neu wählen">${esc(wohnLabel(w, s.k))}</button>`).join('');
    const next = frage
      ? `<div class="es-frage"><span class="w-lbl">${esc(frage.q)}</span><div class="w-chips">${frage.o.map(([v, l]) => `<button type="button" class="chip" data-sd="wset" data-g="${gi}" data-k="${frage.k}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}${frage.opt ? `<button type="button" class="chip w-recent" data-sd="wset" data-g="${gi}" data-k="${frage.k}" data-v="${SKIP}">Überspringen</button>` : ''}</div></div>`
      : '<p class="w-hint es-fertig">Fertig – der Ort steht darunter im Textfeld und lässt sich dort anpassen. Eine Antwort antippen wählt ab dort neu.</p>';
    return `<div class="es-wahl on"><span class="w-mk-gt">Schnellwahl</span><div class="es-weg"><button type="button" class="chip sm" data-sd="wohn" data-g="${gi}" aria-pressed="true" title="Schnellwahl schließen">Wohngebäude ✕</button>${weg}</div>${next}</div>`;
  }

  /** Der Satz zum Ort der Person, mit „…“ an der Stelle des Ortes (über dem Textfeld). */
  function rahmen(data, i) {
    const p = arr(data.personen)[i], gi = ortVon(data, p), g = arr(data.orte)[gi]; if (!g) return '';
    return wieOf(g)[0] === 'weg' ? ortSatz(data, g, istErster(data, gi)) : ortSatz(data, g, istErster(data, gi), '…');
  }
  /**
   * „Wo angetroffen?“ in der Maske einer Person: allein oder zusammen mit jemandem, wie, und der Ort selbst –
   * über die Schnellwahl oder als eigener Text. Ein gemeinsamer Ort wird für alle dort zugleich bearbeitet.
   */
  function woHtml(data, i) {
    const P = arr(data.personen), p = P[i] || {}, O = arr(data.orte), gi = ortVon(data, p), g = O[gi] || {};
    const w = wieOf(g), weg = w[0] === 'weg';
    const mit = mitglieder(data, g).filter(j => j !== i);
    const andere = O.map((x, k) => ({ k, x, wer: mitglieder(data, x).filter(j => j !== i) })).filter(o => o.wer.length);
    const wahl = andere.length
      ? `<div class="w-q" data-q="pzu"><span class="w-lbl">Allein oder zusammen mit jemandem?</span><div class="w-chips es-zu"><button type="button" class="chip" data-sd="pzu" data-v="neu" aria-pressed="${String(!mit.length)}">Allein</button>${andere.map(o => `<button type="button" class="chip" data-sd="pzu" data-v="${o.k}" aria-pressed="${String(o.k === gi)}">Zusammen mit ${esc(joinUnd(o.wer.map(j => kurzName(P[j]))))}<small class="sd-sm">${esc(ortKurz(o.x))}</small></button>`).join('')}</div>${mit.length ? `<p class="w-hint sd-hint">Gemeinsamer Ort – was du hier einträgst, gilt auch für ${esc(joinUnd(mit.map(j => kurzName(P[j]))))}.</p>` : ''}</div>`
      : '';
    const wie = `<div class="w-q" data-q="wie"><span class="w-lbl">Wie?</span>${seg(`orte.${gi}.wie`, w[0], WIE.map(x => [x[0], x[1]]), 'w-chips')}</div>`;
    const wo = weg
      ? `<div class="w-q" data-q="wo"><p class="w-hint sd-hint">Im Text: „<span data-live="rahmen">${esc(rahmen(data, i))}</span>“</p></div>`
      : `<div class="w-q" data-q="wo"><span class="w-lbl">Wo? <i class="w-req" title="Pflicht">•</i></span>${wohnHtml(g, gi)}<div class="sd-inl"><label class="w-hint" for="esOrt">„<span data-live="rahmen">${esc(rahmen(data, i))}</span>“</label>${textIn('esOrt', `orte.${gi}.text`, g.text, w[4])}</div></div>`;
    const zus = `<div class="w-q" data-q="zus"><label class="w-lbl" for="esZus">Ergänzung <i class="w-hint-i">(ganzer Satz, optional)</i></label>${textIn('esZus', `orte.${gi}.zusatz`, g.zusatz, weg ? 'Nach Angaben der Zeugin habe er sich zu Fuß in Richtung Bahnhof entfernt' : 'Er wirkte aufgebracht und redete laut', 600)}</div>`;
    return `<div class="w-q full w-head"><span class="w-head-t">Wo angetroffen?</span><span class="w-head-h">Schnellwahl antippen oder den Ort selbst schreiben – er steht als Satzbaustein im Sachverhalt.</span></div>${wahl}${wie}${wo}${zus}`;
  }

  function menuHtml(d, api) {
    const data = d.data, P = arr(data.personen), O = arr(data.orte), art = data.art;
    const artQ = `<div class="w-q" data-q="art"><span class="w-lbl">Worum geht es?${art ? '' : ' <i class="w-req" title="Pflicht">•</i>'}</span><div class="w-seg" role="group" aria-label="Art">${C.ARTEN.map(([v, l]) => `<button type="button" class="w-opt" data-sd="art" data-v="${v}" aria-pressed="${String(art === v)}">${l}</button>`).join('')}</div><p class="w-hint sd-hint">${art === 'verkehr' ? 'Namen nur mit Anfangsbuchstaben („M.“), Unfallbeteiligte mit Nummer: 01 ist die Verursacherin oder der Verursacher.' : art === 'straf' ? 'Nachname ausgeschrieben – bei gleichem Nachnamen mit Vorname.' : 'Davon hängt ab, wie die Namen im Text stehen – wie bei den Schilderungen.'}</p></div>`;
    const items = P.map((p, i) => {
      const gi = ortVon(data, p), g = O[gi] || {}, weg = wieOf(g)[0] === 'weg';
      const mit = mitglieder(data, g).filter(j => j !== i).map(j => kurzName(P[j]));
      const fehlt = personFehlt(p, weg).length || (!weg && !has(g.text));
      return `<li class="sd-item"><div class="sd-row"><button type="button" class="sd-card" data-sd="edit" data-i="${i}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(vollName(p))}</b><small>${esc([C.rolleLabel(p), ortKurz(g) + (mit.length ? ` (mit ${joinUnd(mit)})` : ''), ...(weg && !p.verl ? [] : [verlKurz(p)])].join(' · '))}</small></span><span class="pill ${fehlt ? 'pill-quiet' : 'pill-lime'}">${fehlt ? 'Offen' : 'Erfasst'}</span></button></div></li>`;
    }).join('');
    const add = art
      ? `<div class="sd-add"><span class="w-lbl">${P.length ? 'Weitere Person hinzufügen' : 'Person hinzufügen'}</span><div class="sd-add-row">${C.rollenFor(art).map(([v, r]) => `<button type="button" class="sd-add-b" data-sd="add" data-v="${v}"><i aria-hidden="true">+</i>${esc(v === 'ub' ? `${r.x} ${pad2(C.nextUb(P))}` : r.x)}</button>`).join('')}</div><p class="w-hint sd-hint">Je Person: Name, wo sie angetroffen wurde – allein oder zusammen mit anderen – und ob sie verletzt war.</p></div>`
      : `<div class="sd-add off"><span class="w-lbl">Person hinzufügen</span><p class="w-hint sd-hint">Erst oben wählen: Strafanzeige oder Verkehrsangelegenheit.</p></div>`;
    const mehr = P.length
      ? `<div class="w-q full w-head"><span class="w-head-t">Sonst noch</span><span class="w-head-h">Beides optional.</span></div>
        <div class="w-q" data-q="zeit"><label class="w-lbl" for="esZeit">Eintreffen um</label><div class="sd-time es-zeit"><input class="input mono" type="time" id="esZeit" data-sk="zeit" value="${esc(data.zeit || '')}"><button type="button" class="chip sm" data-sd="now" data-p="zeit">Jetzt</button></div></div>
        <div class="w-q" data-q="frei"><label class="w-lbl" for="esText">Weitere Feststellungen beim Eintreffen <i class="w-hint-i">(ganze Sätze)</i></label><textarea class="input" id="esText" data-sk="text" rows="3" placeholder="Vor dem Haus hatten sich etwa zehn Schaulustige versammelt." autocomplete="off" autocapitalize="sentences" spellcheck="true" maxlength="2000">${esc(data.text || '')}</textarea></div>`
      : '';
    const miss = offen(data);
    return `${topBar('list', `Eintreffsituation · ${ARTL[art] || 'Art offen'}`, title(data))}
      <div class="w-grid sd-grid">${artQ}
        <div class="w-q full w-head"><span class="w-head-t">Personen vor Ort</span><span class="w-head-h">Die Schilderungen bauen später darauf auf.</span></div>
        ${P.length ? `<div class="w-q"><ol class="sd-list es-list">${items}</ol></div>` : ''}
        <div class="w-q">${add}</div>
        ${mehr}
        ${P.length ? `<div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So steht es in der Anzeige</span><button type="button" class="btn btn-light btn-sm" data-sd="copy">Kopieren</button></div><pre class="w-out-t" data-live="text">${esc(abschnitt(data))}</pre></div></div>` : ''}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${P.length && miss.length ? `<span class="w-nav-i">${miss.length} offen</span>` : ''}${P.length ? '<button type="button" class="btn btn-accent" data-sd="alle">Abschließen</button>' : ''}</div>`;
  }

  function personHtml(d, api) {
    const data = d.data, P = arr(data.personen), i = V.i, p = P[i] || {}, base = `personen.${i}`;
    const roles = C.rollenFor(data.art, p.rolle).map(([v, x]) => `<button type="button" class="chip" data-sd="set" data-p="${base}.rolle" data-v="${v}" aria-pressed="${String(p.rolle === v)}">${esc(p.g === 'm' || p.g === 'w' ? x[p.g] : x.x)}</button>`).join('');
    const ubMax = Math.max(4, ...P.map(C.ubNr)) + (P.filter(x => C.ubNr(x)).length >= 4 ? 1 : 0);
    const ubQ = p.rolle === 'ub' ? `<div class="w-q" data-q="ub"><span class="w-lbl">Nummer <i class="w-req" title="Pflicht">•</i></span><div class="w-chips" role="group" aria-label="Nummer">${Array.from({ length: ubMax }, (x, k) => k + 1).map(n => `<button type="button" class="chip mono" data-sd="ub" data-v="${n}" aria-pressed="${String(C.ubNr(p) === n)}">${pad2(n)}</button>`).join('')}</div><p class="w-hint sd-hint">01 ist die Unfallverursacherin oder der Unfallverursacher – in den Schilderungen als Beschuldigte/r oder Betroffene/r zu belehren, 02 und weitere als Zeugen. Ist die Nummer schon vergeben, tauschen die beiden.</p></div>` : '';
    const anr = [['m', 'Herr'], ['w', 'Frau']].map(([v, l]) => `<button type="button" class="w-opt" data-sd="set" data-p="${base}.g" data-v="${v}" aria-pressed="${String(p.g === v)}">${l}</button>`).join('');
    return `${topBar('menu', `Eintreffsituation · Person ${i + 1} von ${P.length}`, vollName(p))}
      <div class="w-grid sd-grid">
        <div class="w-q full w-head"><span class="w-head-t">Person</span></div>
        <div class="w-q" data-q="rolle"><span class="w-lbl">Rolle <i class="w-req" title="Pflicht">•</i></span><div class="w-chips" role="group" aria-label="Rolle">${roles}</div></div>
        ${ubQ}
        <div class="w-q" data-q="g"><span class="w-lbl">Anrede <i class="w-req" title="Pflicht">•</i></span><div class="w-seg" role="group" aria-label="Anrede">${anr}</div></div>
        <div class="w-q half" data-q="nn"><label class="w-lbl" for="esNn">Nachname <i class="w-req" title="Pflicht">•</i></label><input class="input" id="esNn" data-sk="${base}.nachname" data-next="esVn" value="${esc(p.nachname || '')}" placeholder="z. B. Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" maxlength="80"></div>
        <div class="w-q half" data-q="vn"><label class="w-lbl" for="esVn">Vorname</label><input class="input" id="esVn" data-sk="${base}.vorname" data-next="" value="${esc(p.vorname || '')}" placeholder="z. B. Anna" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="80"></div>
        <p class="sd-im">Im Text: <b data-live="wer">${esc(C.werVon(data, i))}</b></p>
        ${woHtml(data, i)}
        ${istWeg(data, p) ? '' : UI.verletzungHtml(api, p, base, 'Steht im Text direkt hinter dem Antreffen – in den Schilderungen dann nicht noch einmal.')}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-sd="del">Entfernen</button><span class="grow"></span><span class="w-nav-i mono">${i + 1} / ${P.length}</span><button type="button" class="btn btn-accent" data-sd="done1">Fertig</button></div>`;
  }

  const nrHint = nr => (nr ? `Überschrift „${nr} Eintreffsituation“ – ohne Punkt hinter der Zahl.` : 'Ohne Nummer steht die Überschrift ohne Gliederungsziffer da.');
  function doneHtml(d, api) {
    const data = d.data, nr = nrOf(data), txt = abschnitt(data), miss = offen(data);
    const ctx = typeof api.ctx === 'function' ? api.ctx() : null;
    const nrQ = ctx && ctx.nrAuto
      ? `<div class="w-q"><div class="w-info">Abschnitt ${esc(nr || '–')} – die Nummer ergibt sich aus der Reihenfolge im Vorgang.</div></div>`
      : `<div class="w-q"><label class="w-lbl" for="esNr">Welche Nummer hat die Eintreffsituation in deiner Anzeige?</label><div class="sd-nr"><input class="input mono" id="esNr" data-sk="nr" value="${esc(nr)}" placeholder="z. B. 2" inputmode="decimal" autocomplete="off" maxlength="8"><div class="w-chips">${['2', '3', '4'].map(n => `<button type="button" class="chip" data-sd="nr" data-v="${n}" aria-pressed="${String(nr === n)}">${n}</button>`).join('')}<button type="button" class="chip w-recent" data-sd="nr" data-v="-" aria-pressed="${String(!nr)}">ohne</button></div></div><p class="w-hint sd-hint" data-live="nrhint">${esc(nrHint(nr))}</p></div>`;
    return `${topBar('menu', 'Eintreffsituation · Fertiger Abschnitt', title(data))}
      <div class="w-grid sd-grid">
        ${nrQ}
        ${miss.length ? `<div class="w-q"><div class="w-warn">Noch offen: ${esc(miss.join(' · '))}</div></div>` : ''}
        <div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">Eintreffsituation</span><button type="button" class="btn btn-light btn-sm" data-sd="copy">Kopieren</button></div><pre class="w-out-t" data-live="text">${esc(txt)}</pre></div></div>
        ${typeof api.weiter === 'function' && api.weiter() ? `<div class="w-q">${api.weiter()}</div>` : ''}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="menu">Zur Eingabe</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copy">Abschnitt kopieren</button></div>`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (ordnen(d.data)) api.persist(false);
    if (typeof api.ctx === 'function' && nimmt(d.data, api.ctx())) api.persist(false);
    if (V.s === 'person' && !arr(d.data.personen)[V.i]) V.s = 'menu';
    if (V.s === 'done' && !arr(d.data.personen).length) V.s = 'menu';
    return V.s === 'person' ? personHtml(d, api) : V.s === 'done' ? doneHtml(d, api) : menuHtml(d, api);
  }
  function mounted() {
    document.querySelectorAll('#wMain textarea.es-ta').forEach(grow);
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus({ preventScroll: true }); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (der Fokus bleibt im Feld). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    put('text', abschnitt(data));
    if (V.s === 'person' && arr(data.personen)[V.i]) { put('wer', C.werVon(data, V.i)); put('rahmen', rahmen(data, V.i)); put('kopf', vollName(data.personen[V.i])); }
    if (V.s === 'done') { const nr = nrOf(data); put('nrhint', nrHint(nr)); host.querySelectorAll('[data-sd="nr"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === '-' ? !nr : c.dataset.v === nr))); }
  }
  /** Noch nichts eingetragen: weder Name, Anrede, Verletzungen noch ein eigener Ort. */
  function istLeer(data, p) {
    if (!p) return true;
    if (has(p.nachname) || has(p.vorname) || p.g || p.verl) return false;
    const g = arr(data.orte)[ortVon(data, p)];
    return !g || arr(g.wer).length > 1 || !Object.keys(ortInhalt(g)).length;
  }
  /** Zurück zur Übersicht: eine versehentlich angelegte, leere Person verschwindet wieder. */
  function leavePerson(data) {
    const P = arr(data.personen);
    if (V.s === 'person' && istLeer(data, P[V.i])) { P.splice(V.i, 1); if (!P.length) delete data.personen; ordnen(data); }
    V.s = 'menu'; V.i = -1;
  }
  async function delPerson(api) {
    const data = api.d.data, P = arr(data.personen), p = P[V.i]; if (!p) return;
    if (!istLeer(data, p)) {
      const ok = await api.ask({ title: 'Person entfernen?', text: `„${vollName(p)}“ wird aus der Eintreffsituation gelöscht${typeof api.ctx === 'function' && api.ctx() ? ' – in den Schilderungen bleibt sie als eigene Person stehen' : ''}.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
      if (!ok) return;
    }
    P.splice(V.i, 1); if (!P.length) delete data.personen;
    ordnen(data); V.s = 'menu'; V.i = -1;
    api.persist(false); api.render(); top0();
  }
  /**
   * Person an einen Ort setzen: ziel = Ort einer anderen Person (dann stehen sie im Text „gemeinsam“) oder null = eigener
   * Ort (vorlage = dessen frühere Angaben). Orte, an denen danach niemand mehr steht, verschwinden.
   */
  function zuordnen(data, pid, ziel, vorlage) {
    if (!Array.isArray(data.orte)) data.orte = [];
    for (const g of data.orte) if (g && Array.isArray(g.wer)) g.wer = g.wer.filter(x => x !== pid);
    data.orte = data.orte.filter(g => g && (g === ziel || arr(g.wer).length));
    if (ziel) ziel.wer = [...arr(ziel.wer), pid]; else data.orte.push({ ...(vorlage || {}), wer: [pid] });
  }

  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    if (b.disabled) return true;
    const d = api.d, data = d.data, a = b.dataset.sd;
    const P = () => { if (!Array.isArray(data.personen)) data.personen = []; return data.personen; };
    const O = () => { if (!Array.isArray(data.orte)) data.orte = []; return data.orte; };
    const cur = () => P()[V.i];
    const save = () => { api.persist(false); api.render(); };
    const gi = Number(b.dataset.g);
    switch (a) {
      case 'art': data.art = b.dataset.v; save(); return true;
      case 'add': {
        if (d.status === 'fertig') d.status = 'entwurf';
        const p = { pid: pidNew(P()), rolle: b.dataset.v }; if (p.rolle === 'ub') p.ub = C.nextUb(P());
        P().push(p); O().push({ wer: [p.pid] }); // jede Person beginnt an ihrem eigenen Ort
        V.i = P().length - 1; V.s = 'person'; save(); top0(); return true;
      }
      case 'edit': V.i = Number(b.dataset.i); V.s = 'person'; api.render(); top0(); return true;
      case 'menu': if (V.s === 'done') { V.s = 'menu'; api.render(); top0(); return true; } leavePerson(data); save(); top0(); return true;
      case 'done1': leavePerson(data); save(); top0(); return true;
      case 'del': delPerson(api); return true;
      case 'set': {
        const path = b.dataset.p;
        setPath(data, path, b.dataset.v);
        if (/\.rolle$/.test(path) && cur()) { const p = cur(); if (p.rolle === 'ub') { if (!C.ubNr(p)) p.ub = C.nextUb(P().filter(x => x !== p)); } else delete p.ub; }
        if (/\.g$/.test(path) && cur() && !has(cur().nachname) && !api.mobile()) V.focus = 'esNn';
        save(); return true;
      }
      case 'tog': setPath(data, b.dataset.p, getPath(data, b.dataset.p) ? undefined : true); save(); return true;
      case 'now': { const t = new Date(); setPath(data, b.dataset.p, `${pad2(t.getHours())}:${pad2(t.getMinutes())}`); save(); return true; }
      case 'ub': {
        const p = cur(); if (!p) return true; const n = Number(b.dataset.v), old = C.ubNr(p);
        const other = P().find(x => x !== p && C.ubNr(x) === n);
        if (other) other.ub = old || C.nextUb(P().filter(x => x !== other).concat([{ rolle: 'ub', ub: n }]));
        p.ub = n; save(); return true;
      }
      case 'pzu': {
        const p = cur(); if (!p) return true;
        const g = O()[ortVon(data, p)], allein = !!g && arr(g.wer).length === 1;
        if (b.dataset.v === 'neu') { if (allein) return true; zuordnen(data, p.pid, null, V.alt[p.pid]); delete V.alt[p.pid]; }
        else {
          const ziel = O()[Number(b.dataset.v)]; if (!ziel || ziel === g) return true;
          if (allein && Object.keys(ortInhalt(g)).length) V.alt[p.pid] = ortInhalt(g); // falls es doch der eigene Ort sein soll
          zuordnen(data, p.pid, ziel);
        }
        save(); return true;
      }
      case 'wohn': {
        const g = O()[gi]; if (!g) return true;
        if (g.w) { delete g.w; save(); return true; }
        // Meist ist es dasselbe Gebäude wie bei einer anderen Person: Gebäudeart von dort vorbelegen
        const vor = O().slice(0, gi).reverse().find(x => x && x.w && x.w.geb) || O().find(x => x && x !== g && x.w && x.w.geb);
        g.w = vor ? wohnSet(vor.w, 'wo') : {};
        if (vor) g.text = wohnPhrase(g.w);
        save(); return true;
      }
      case 'wset': { const g = O()[gi]; if (!g) return true; g.w = wohnSet(g.w || {}, b.dataset.k, b.dataset.v); g.text = wohnPhrase(g.w); save(); return true; }
      case 'wback': { const g = O()[gi]; if (!g || !g.w) return true; g.w = wohnSet(g.w, b.dataset.k); const t = wohnPhrase(g.w); if (t) g.text = t; else delete g.text; save(); return true; }
      case 'nr': { data.nr = b.dataset.v; api.persist(false); live(api); const inp = $('#esNr'); if (inp) inp.value = nrOf(data); return true; }
      case 'copy': api.copy(abschnitt(data)); return true;
      case 'alle': {
        const miss = offen(data);
        d.status = 'fertig'; V.s = 'done';
        api.persist(true); api.render(); top0();
        if (miss.length) api.toast(`Abgeschlossen – noch offen: ${miss.length} ${miss.length === 1 ? 'Punkt' : 'Punkte'} (im Text als [Platzhalter]).`);
        return true;
      }
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.dataset.single && /\n/.test(el.value)) { const at = el.selectionStart; el.value = el.value.replace(/\s*\n\s*/g, ' '); try { el.setSelectionRange(at, at); } catch (er) { /* egal */ } }
    if (el.classList.contains('es-ta')) grow(el);
    if (el.dataset.sk === 'nr') api.d.data.nr = C.cleanNr(el.value) || '-';
    else setPath(api.d.data, el.dataset.sk, el.value);
    api.persist(false); live(api);
    return true;
  }
  function change(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.type === 'time') { setPath(api.d.data, el.dataset.sk, el.value); api.persist(false); live(api); }
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk || (el.tagName === 'TEXTAREA' && !el.dataset.single)) return false;
    e.preventDefault();
    const n = el.dataset.next ? document.getElementById(el.dataset.next) : null;
    if (n) n.focus(); else el.blur();
    return true;
  }
  /** ⌘/Strg + Enter: Person fertig, in der Übersicht abschließen, im fertigen Abschnitt kopieren. */
  function submit(api) {
    const data = api.d.data;
    if (V.s === 'person') { leavePerson(data); api.persist(false); api.render(); top0(); }
    else if (V.s === 'menu' && arr(data.personen).length) { api.d.status = 'fertig'; V.s = 'done'; api.persist(true); api.render(); top0(); }
    else if (V.s === 'done') api.copy(abschnitt(data));
  }

  root.WEin = Object.freeze({
    id: 'eintreffen', name: 'Eintreffsituation', short: 'Eintreffsituation', kurz: 'ES',
    desc: 'Wer wurde wo angetroffen – einzeln oder gemeinsam, mit Rolle und Verletzungen · Öffner für die Folgeabschnitte',
    intro: 'Personen mit + anlegen: Name, wo angetroffen (allein oder zusammen mit anderen), Verletzungen · Ort frei schreiben oder über die Schnellwahl Wohngebäude · passt zu jedem Einsatzanlass',
    labels: { newBtn: 'Eintreffsituation', bericht: 'Eintreffsituation' },
    steps: [],
    title, subtitle, pill,
    plain: abschnitt,
    text: data => [[nrOf(data), 'Eintreffsituation', text(data), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, change, keydown, submit },
    kontext: { nimmt },
    core: { text, abschnitt, ortSatz, offen, ordnen, zuordnen, nrOf, wohnSteps, wohnOffen, wohnSet, wohnPhrase, wohnLabel, GEB, WIE, SKIP }
  });
})(typeof window !== 'undefined' ? window : globalThis);
