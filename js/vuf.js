/*
 * Workoholic · Schriftliche Arbeiten · Modul „Verkehrsunfallflucht ohne Personenschaden“
 * ---------------------------------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 *  - STEPS: der Fragenkatalog (Phasen → Schritte → Felder), mit Bedingungen `when(d)`.
 *  - text(d): erzeugt den Verkehrsunfallbefundbericht nach der Gliederung aus Anlage 6 des
 *    Erlasses „Aufgaben der Polizei bei Straßenverkehrsunfällen“ (1 Allgemeines … 6 Sonstiges),
 *    dazu Kurzsachverhalt, Fahndungstext und die Liste offener Punkte.
 *  - Satzführung passt sich an: Geschlecht/Rolle (Geschädigter/Geschädigte, Zeuge/Zeugin),
 *    Ein-/Mehrzahl (Kräfte, Folien, Teile), Zeitpunkt vs. Zeitraum, Straße vs. Parkplatz,
 *    geparkt vs. fahrend, mit/ohne Hinweise auf den Verursacher, Klarnamen an/aus.
 *
 * Fachliche Grundlagen: DA Verkehrsunfallbearbeitung KPB Steinfurt (3.1 Verkehrsunfallflucht),
 * Fragebogen zur Verkehrsunfallflucht (Anlage 2), Gliederung Unfallbefundbericht (Anlage 6),
 * Spurenkatalog Spurensicherungsfolie (PP Dortmund / AK Spurfix), § 142 StGB.
 */
(function (root) {
  'use strict';

  /* ======================= Kleine Helfer ======================= */
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const str = v => (v == null ? '' : String(v)).trim();
  const has = v => str(v) !== '';
  const num = v => { const t = String(v ?? '').trim().replace(',', '.'); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const low = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const arr = v => (Array.isArray(v) ? v : []);
  const endDot = s => { s = str(s); if (!s) return ''; return /[.!?:]$/.test(s) ? s : s + '.'; };
  const quote = s => '„' + str(s) + '“';
  const EINS = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
  const numWord = (n, fem = false) => { n = Math.round(Number(n) || 0); if (n === 1) return fem ? 'eine' : 'ein'; return EINS[n] || String(n); };
  const euro = v => { const n = num(v); if (n == null) return ''; return n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €'; };
  function joinList(list, word = 'und') {
    const a = list.filter(Boolean);
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' ' + word + ' ' + a[a.length - 1];
  }
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso));
    return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso);
  }
  const fmtTime = t => (has(t) ? str(t) + ' Uhr' : '');
  /** „am 07.11.2026 gegen 10:35 Uhr“ – mit Platzhaltern, wenn etwas fehlt. */
  function when(datum, zeit, prep = 'gegen') {
    const d = has(datum) ? 'am ' + fmtDate(datum) : '';
    const t = has(zeit) ? prep + ' ' + fmtTime(zeit) : '';
    return [d, t].filter(Boolean).join(' ');
  }
  /** Zeitraum: gleicher Tag → „am … in der Zeit zwischen … und …“, sonst „im Zeitraum vom …, … Uhr, bis zum …, … Uhr“ */
  function period(vd, vt, bd, bt) {
    if (!has(vd) && !has(bd)) return '';
    if (has(vd) && (!has(bd) || vd === bd)) {
      if (has(vt) && has(bt)) return `am ${fmtDate(vd)} in der Zeit zwischen ${fmtTime(vt)} und ${fmtTime(bt)}`;
      if (has(vt)) return `am ${fmtDate(vd)} nach ${fmtTime(vt)}`;
      if (has(bt)) return `am ${fmtDate(vd)} vor ${fmtTime(bt)}`;
      return `am ${fmtDate(vd)}`;
    }
    const a = has(vd) ? fmtDate(vd) + (has(vt) ? ', ' + fmtTime(vt) + ',' : ',') : '';
    const b = has(bd) ? fmtDate(bd) + (has(bt) ? ', ' + fmtTime(bt) : '') : '';
    if (a && b) return `im Zeitraum vom ${a} bis zum ${b}`;
    if (a) return `nach dem ${a.replace(/,$/, '')}`;
    return `vor dem ${b}`;
  }
  const PH = s => `[${s}]`; // Platzhalter im Text, wenn Pflichtangaben fehlen

  /* ======================= Personen & Grammatik ======================= */
  /** Rollenbezeichnungen – nominativ/dativ/akkusativ, Pronomen, Possessiv; divers über „… Person“. */
  const ROLE = {
    gesch:  { m: ['der Geschädigte', 'dem Geschädigten', 'den Geschädigten', 'des Geschädigten'], w: ['die Geschädigte', 'der Geschädigten', 'die Geschädigte', 'der Geschädigten'], d: ['die geschädigte Person', 'der geschädigten Person', 'die geschädigte Person', 'der geschädigten Person'], kurz: 'Geschädigte/r' },
    zeuge:  { m: ['der Zeuge', 'dem Zeugen', 'den Zeugen', 'des Zeugen'], w: ['die Zeugin', 'der Zeugin', 'die Zeugin', 'der Zeugin'], d: ['die Zeugenperson', 'der Zeugenperson', 'die Zeugenperson', 'der Zeugenperson'], kurz: 'Zeuge/Zeugin' },
    besch:  { m: ['der Beschuldigte', 'dem Beschuldigten', 'den Beschuldigten', 'des Beschuldigten'], w: ['die Beschuldigte', 'der Beschuldigten', 'die Beschuldigte', 'der Beschuldigten'], d: ['die beschuldigte Person', 'der beschuldigten Person', 'die beschuldigte Person', 'der beschuldigten Person'], kurz: 'Beschuldigte/r' },
    fahrer: { m: ['der Fahrzeugführer', 'dem Fahrzeugführer', 'den Fahrzeugführer', 'des Fahrzeugführers'], w: ['die Fahrzeugführerin', 'der Fahrzeugführerin', 'die Fahrzeugführerin', 'der Fahrzeugführerin'], d: ['die fahrzeugführende Person', 'der fahrzeugführenden Person', 'die fahrzeugführende Person', 'der fahrzeugführenden Person'], kurz: 'Fahrzeugführer/in' },
    halter: { m: ['der Halter', 'dem Halter', 'den Halter', 'des Halters'], w: ['die Halterin', 'der Halterin', 'die Halterin', 'der Halterin'], d: ['die haltende Person', 'der haltenden Person', 'die haltende Person', 'der haltenden Person'], kurz: 'Halter/in' }
  };
  /**
   * Personenreferenz: p = { geschlecht: 'm'|'w'|'d', nachname, vorname }, opts = { klarnamen, nr: 'UB 02' }
   * → Objekt mit nom/dat/akk/gen (mit Suffix „(UB 02)“ bei erster Nennung), Pronomen und Possessiv-Formen.
   */
  function person(role, p, opts = {}) {
    p = p || {};
    const g = p.geschlecht === 'w' ? 'w' : p.geschlecht === 'd' ? 'd' : 'm';
    const f = ROLE[role][g];
    const fem = g !== 'm';
    const name = opts.klarnamen && has(p.nachname) ? (g === 'w' ? 'Frau ' : g === 'm' ? 'Herr ' : '') + [str(p.vorname), str(p.nachname)].filter(Boolean).join(' ') : '';
    const tag = [name, opts.nr].filter(Boolean).join(', ');
    const first = c => f[c] + (tag ? ` (${tag})` : '');
    return {
      g, fem,
      nom: f[0], dat: f[1], akk: f[2], gen: f[3],
      Nom: cap(f[0]), Dat: cap(f[1]), Akk: cap(f[2]),
      firstNom: first(0), firstDat: first(1), firstAkk: first(2),
      FirstNom: cap(first(0)), FirstDat: cap(first(1)),
      er: fem ? 'sie' : 'er', Er: fem ? 'Sie' : 'Er',
      ihm: fem ? 'ihr' : 'ihm', ihn: fem ? 'sie' : 'ihn',
      // Possessiv: sein/ihr mit Endung je Kasus/Genus des Bezugsworts
      poss: (kasus, genus) => (fem ? 'ihr' : 'sein') + POSS_END[kasus][genus],
      nr: opts.nr || '', name
    };
  }
  const POSS_END = { nom: { m: '', w: 'e', n: '', p: 'e' }, akk: { m: 'en', w: 'e', n: '', p: 'e' }, dat: { m: 'em', w: 'er', n: 'em', p: 'en' }, gen: { m: 'es', w: 'er', n: 'es', p: 'er' } };

  /** Eingesetzte Kräfte als Aufzählung („POK Müller und PKin Schmidt“). */
  function crewText(kraefte) {
    return joinList(arr(kraefte).filter(k => has(k && k.name)).map(k => [str(k.grad), str(k.name)].filter(Boolean).join(' ')));
  }

  /* ======================= Fahrzeuge ======================= */
  const FZ_ART = {
    pkw: { n: 'Pkw', g: 'm' }, lkw: { n: 'Lkw', g: 'm' }, transporter: { n: 'Transporter', g: 'm' }, bus: { n: 'Kraftomnibus', g: 'm' },
    krad: { n: 'Kraftrad', g: 'n' }, roller: { n: 'Motorroller', g: 'm' }, rad: { n: 'Fahrrad', g: 'n' }, pedelec: { n: 'Pedelec', g: 'n' },
    anhaenger: { n: 'Anhänger', g: 'm' }, wohnmobil: { n: 'Wohnmobil', g: 'n' }, sonst: { n: 'Fahrzeug', g: 'n' }
  };
  const ART_DEF = { m: ['der', 'dem', 'den', 'des'], n: ['das', 'dem', 'das', 'des'], w: ['die', 'der', 'die', 'der'] };
  const GEN_S = { Pkw: 'Pkw', Lkw: 'Lkw', Transporter: 'Transporters', Kraftomnibus: 'Kraftomnibusses', Kraftrad: 'Kraftrads', Motorroller: 'Motorrollers', Fahrrad: 'Fahrrads', Pedelec: 'Pedelecs', Anhänger: 'Anhängers', Wohnmobil: 'Wohnmobils', Fahrzeug: 'Fahrzeugs' };
  /**
   * Fahrzeugphrase. kasus: 'nom'|'dat'|'akk'|'gen'; full → mit Marke/Modell/Farbe/Kennzeichen in Klammern.
   * „der Pkw VW Golf (schwarz, amtl. Kennzeichen ST-AB 123)“ / „dem Pkw“
   */
  function vehicle(fz, kasus = 'nom', full = false) {
    fz = fz || {};
    const a = FZ_ART[fz.art] || FZ_ART.sonst;
    const ki = { nom: 0, dat: 1, akk: 2, gen: 3 }[kasus] || 0;
    let noun = a.n; if (ki === 3) noun = GEN_S[noun] || noun;
    let s = ART_DEF[a.g][ki] + ' ' + noun;
    if (full) {
      const mm = [str(fz.marke), str(fz.modell)].filter(Boolean).join(' ');
      if (mm) s += ' ' + mm;
      const det = [];
      if (has(fz.farbe)) det.push(low(str(fz.farbe)));
      if (has(fz.kz)) det.push((fz.ausland === 'ja' ? 'ausländisches Kennzeichen ' : 'amtl. Kennzeichen ') + str(fz.kz).toUpperCase() + (fz.kzFragment ? ' [Fragment]' : ''));
      if (det.length) s += ' (' + det.join(', ') + ')';
    }
    return s;
  }
  const vehicleG = fz => ((FZ_ART[(fz || {}).art] || FZ_ART.sonst).g);

  /* ======================= Karosserie ======================= */
  const KAROSSERIE = [
    { label: 'Front', rows: [['Motorhaube'], ['Frontscheibe'], ['Scheinwerfer links', 'Scheinwerfer rechts'], ['Kotflügel vorne links', 'Kotflügel vorne rechts'], ['Frontschürze links', 'Frontschürze Mitte', 'Frontschürze rechts'], ['Nebelscheinwerfer links', 'Nebelscheinwerfer rechts'], ['Kennzeichen vorne']] },
    { label: 'Seite', rows: [['Außenspiegel links', 'Außenspiegel rechts'], ['Vordertür links', 'Vordertür rechts'], ['Hintertür links', 'Hintertür rechts'], ['A-Säule links', 'A-Säule rechts'], ['B-Säule links', 'B-Säule rechts'], ['C-Säule links', 'C-Säule rechts'], ['Seitenscheibe vorne links', 'Seitenscheibe vorne rechts'], ['Seitenscheibe hinten links', 'Seitenscheibe hinten rechts'], ['Schweller links', 'Schweller rechts'], ['Radlauf vorne links', 'Radlauf vorne rechts'], ['Radlauf hinten links', 'Radlauf hinten rechts'], ['Felge vorne links', 'Felge vorne rechts'], ['Felge hinten links', 'Felge hinten rechts'], ['Reifen vorne links', 'Reifen vorne rechts'], ['Reifen hinten links', 'Reifen hinten rechts'], ['Dach']] },
    { label: 'Heck', rows: [['Heckklappe'], ['Heckscheibe'], ['Rückleuchte links', 'Rückleuchte rechts'], ['Seitenwand hinten links', 'Seitenwand hinten rechts'], ['Heckschürze links', 'Heckschürze Mitte', 'Heckschürze rechts'], ['Anhängerkupplung'], ['Kennzeichen hinten'], ['Auspuff']] }
  ];
  const SCHADEN = {
    kratzer: { np: 'Kratzspuren mit Lackabrieb', pl: true, label: 'Kratzer / Lackabrieb' },
    schramme: { np: 'Schürf- und Schrammspuren', pl: true, label: 'Schürfspuren' },
    delle: { np: 'eine Delle', pl: false, label: 'Delle' },
    beule: { np: 'eine Beule', pl: false, label: 'Beule' },
    deform: { np: 'eine Deformierung', pl: false, label: 'Deformierung' },
    riss: { np: 'ein Riss', pl: false, label: 'Riss' },
    bruch: { np: 'ein Bruch', pl: false, label: 'Bruch' },
    abriss: { np: 'eine teilweise Ablösung des Fahrzeugteils', pl: false, label: 'abgerissen / lose' },
    glas: { np: 'ein Glasbruch', pl: false, label: 'Glasbruch' },
    eindruck: { np: 'eine Eindruckstelle', pl: false, label: 'Eindruckstelle' }
  };
  const VERLAUF = { punktuell: 'punktuell', horizontal: 'in horizontalem Verlauf', vertikal: 'in vertikalem Verlauf', diagonal: 'in diagonalem Verlauf', flaechig: 'flächig' };
  const MATERIAL = { lack: 'Fremdlack', kunststoff: 'Kunststoffabrieb', gummi: 'Gummiabrieb', metall: 'Metallabrieb', glas: 'Glassplitter', holz: 'Holzfasern', mineral: 'mineralische Anhaftungen (Stein/Pflaster)' };

  /** „Am Kotflügel vorne links“ / „An der Motorhaube“ – Genus aus dem Grundwort. */
  const FEM_PART = /(haube|scheibe|schürze|tür|säule|felge|klappe|leuchte|wand|kupplung|stoßstange|blende|zierleiste|leiste)/i;
  function partAt(name) {
    if (!has(name)) return 'An ' + PH('Fahrzeugteil');
    return (FEM_PART.test(str(name)) ? 'An der ' : 'Am ') + str(name);
  }

  /** Schadenssätze zu einem Fahrzeugteil. */
  function partText(t) {
    const arten = arr(t.arten).map(a => SCHADEN[a]).filter(Boolean);
    const nps = arten.map(a => a.np);
    if (has(t.artFrei)) nps.push(str(t.artFrei));
    const plural = arten.some(a => a.pl) || nps.length > 1;
    const np = nps.length ? joinList(nps, 'sowie') : PH('Art der Beschädigung');
    const verb = plural ? 'befanden sich' : 'befand sich';
    let s = `${partAt(t.name)} ${verb} ${np}`;
    if (t.verlauf && VERLAUF[t.verlauf]) s += ' ' + VERLAUF[t.verlauf];
    const von = num(t.von), bis = num(t.bis);
    if (von != null && bis != null) s += ` in einer Höhe von ${von} bis ${bis} cm über der Fahrbahnoberfläche`;
    else if (von != null) s += ` in einer Höhe von ca. ${von} cm über der Fahrbahnoberfläche`;
    else if (bis != null) s += ` bis in eine Höhe von ca. ${bis} cm über der Fahrbahnoberfläche`;
    const out = [s + '.'];
    if (t.fremdlack === 'ja') out.push(`An der Anstoßstelle wurden Fremdlackanhaftungen${has(t.farbe) ? ' in der Farbe ' + cap(str(t.farbe)) : ''} festgestellt.`);
    else if (t.fremdlack === 'nein') out.push('Fremdlackanhaftungen waren dort nicht erkennbar.');
    const mat = arr(t.material).map(m => MATERIAL[m]).filter(Boolean);
    if (mat.length) out.push(`Zudem ${mat.length > 1 || /^(Kratz|Glass|Holz|mineral)/.test(mat[0]) ? 'hafteten' : 'haftete'} ${joinList(mat)} an.`);
    if (t.alt === 'ja') out.push('Die Beschädigung wies Korrosion bzw. Verschmutzung im Spurenbild auf, sodass es sich hierbei um einen Altschaden handeln dürfte.');
    else if (t.alt === 'moeglich') out.push('Ob es sich hierbei um einen frischen Schaden oder einen Altschaden handelt, konnte vor Ort nicht abschließend beurteilt werden.');
    else if (t.alt === 'nein') out.push('Die Beschädigung stellte sich als frisch dar (blanke Spuren ohne Korrosion oder Verschmutzung).');
    if (has(t.notiz)) out.push(endDot(t.notiz));
    return out.join(' ');
  }

  root.WVUF_CORE = { get, str, has, num, cap, low, arr, endDot, quote, numWord, euro, joinList, fmtDate, fmtTime, when, period, PH, person, crewText, vehicle, vehicleG, FZ_ART, KAROSSERIE, SCHADEN, VERLAUF, MATERIAL, partAt, partText };
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Fragenkatalog ======================= */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  const { get, has, arr } = C;
  const JN = [['ja', 'Ja'], ['nein', 'Nein']];
  const JNU = [['ja', 'Ja'], ['nein', 'Nein'], ['unbekannt', 'Unbekannt']];
  const istStrasse = d => get(d, 'ort.art') === 'strasse';
  const istParkflaeche = d => ['parkplatz', 'parkhaus'].includes(get(d, 'ort.art'));
  const istFahrzeug = d => get(d, 'ub02.typ') !== 'sache';
  const geparkt = d => istFahrzeug(d) && get(d, 'ub02.zustand') !== 'fahrend';
  const hinweise = d => get(d, 'taeter.hinweise') === 'ja';
  const ermittelt = d => hinweise(d) && get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja';
  const fzAngetroffen = d => hinweise(d) && get(d, 'taeter.ermittlung.fzAngetroffen') === 'ja';

  const GRADE = ['PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'KA', 'KAin', 'PR', 'PRin', 'EPHK', 'EPHKin'];
  const PERSON_FIELDS = ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift', 'tel', 'email'];

  const STEPS = [
    /* ---------- Phase 1: Einsatz ---------- */
    {
      id: 'einsatz', phase: 'Einsatz', title: 'Einsatzübernahme', lead: 'Wann und auf welchem Weg kam der Einsatz?', gen: 'allg1',
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit der Einsatzübernahme', w: 'half', q: 'jetzt' },
        { k: 'einsatz.meldeweg', t: 'choice', l: 'Meldeweg', o: [['leitstelle', 'Leitstelle / Funk'], ['telefon', 'Telefonisch bei der Wache'], ['wache', 'Persönlich auf der Wache'], ['streife', 'Eigene Feststellung / Ansprache auf Streife'], ['online', 'Online-Anzeige']] },
        { t: 'info', when: d => get(d, 'einsatz.meldeweg') === 'online', text: 'DA 3.1: Der Verweis auf eine Online-Anzeige oder das Aufsuchen einer Wache ist bei einer Verkehrsunfallflucht ungeeignet – ein Einsatzmittel ist zur Unfallstelle zu entsenden.' },
        { k: 'einsatz.mitteiler', t: 'choice', l: 'Mitteiler', o: [['gesch', 'Geschädigte/r selbst'], ['zeuge', 'Zeuge/Zeugin'], ['dritte', 'Dritte (Anwohner, Firma …)'], ['unbekannt', 'Unbekannt']] },
        { k: 'einsatz.aufnahmeort', t: 'choice', l: 'Wo wird aufgenommen?', o: [['unfallort', 'Am Unfallort'], ['wache', 'Protokollaufnahme auf der Wache']] },
        { k: 'einsatz.unfallstelleAufgesucht', t: 'yn', l: 'Unfallstelle (nachträglich) aufgesucht?', h: 'DA 3.1: Auch nach Protokollaufnahme ist die Unfallstelle aufzusuchen, um Sachverhalt und Spurenbild abzugleichen.', when: d => get(d, 'einsatz.aufnahmeort') === 'wache' }
      ]
    },
    {
      id: 'kraefte', phase: 'Einsatz', title: 'Eingesetzte Kräfte', lead: 'Wer hat aufgenommen?', gen: 'allg1',
      fields: [
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half' },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Beamtinnen und Beamte', grade: GRADE, max: 6 },
        { k: 'einsatz.eintreffZeit', t: 'time', l: 'Eintreffzeit am Unfallort', w: 'half', q: 'jetzt', when: d => get(d, 'einsatz.aufnahmeort') !== 'wache' || get(d, 'einsatz.unfallstelleAufgesucht') === 'ja' }
      ]
    },
    {
      id: 'erkenntnis', phase: 'Einsatz', title: 'Erkenntnislage', lead: 'Was war bei Einsatzübernahme bekannt?', gen: 'allg2',
      fields: [
        { k: 'einsatz.erkenntnis', t: 'area', l: 'Gemeldeter Sachverhalt (Telegrammstil)', ph: 'z. B. Pkw auf Parkplatz beschädigt, Verursacher unbekannt, Zeuge vor Ort', rows: 3 },
        { k: 'einsatz.anfahrt', t: 'area', l: 'Feststellungen während der Anfahrt (optional)', ph: 'z. B. kein flüchtendes Fahrzeug festgestellt; Sonderrechte nicht in Anspruch genommen', rows: 2 }
      ]
    },

    /* ---------- Phase 2: Unfallort & Zeit ---------- */
    {
      id: 'zeit', phase: 'Unfallort', title: 'Unfallzeit', lead: 'Wann oder in welchem Zeitraum hat sich der Unfall ereignet?', gen: 'ort',
      fields: [
        { k: 'zeit.art', t: 'choice', l: 'Angabe', o: [['zeitraum', 'Zeitraum (Fahrzeug abgestellt)'], ['zeitpunkt', 'Konkreter Zeitpunkt'], ['unbekannt', 'Unbekannt']] },
        { k: 'zeit.vonDatum', t: 'date', l: 'Von (Datum)', w: 'half', q: 'gestern', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.vonZeit', t: 'time', l: 'Von (Uhrzeit)', w: 'half', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.bisDatum', t: 'date', l: 'Bis (Datum)', w: 'half', q: 'heute', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.bisZeit', t: 'time', l: 'Bis (Uhrzeit)', w: 'half', q: 'jetzt', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', when: d => get(d, 'zeit.art') === 'zeitpunkt' },
        { k: 'zeit.zeit', t: 'time', l: 'Uhrzeit (ca.)', w: 'half', q: 'jetzt', when: d => get(d, 'zeit.art') === 'zeitpunkt' }
      ]
    },
    {
      id: 'ort', phase: 'Unfallort', title: 'Unfallörtlichkeit', lead: 'Wo hat sich der Unfall ereignet?', gen: 'ort',
      fields: [
        { k: 'ort.art', t: 'choice', l: 'Art der Örtlichkeit', o: [['strasse', 'Straße'], ['parkplatz', 'Parkplatz'], ['parkhaus', 'Parkhaus / Tiefgarage'], ['sonst', 'Sonstige Fläche']] },
        { k: 'ort.strasse', t: 'text', l: 'Straße', ph: 'z. B. Bahnhofstraße', w: 'half', req: true },
        { k: 'ort.hausnr', t: 'text', l: 'Haus-Nr. / Höhe', ph: '12', w: 'half' },
        { k: 'ort.plz', t: 'text', l: 'PLZ', ph: '48565', w: 'half', inputmode: 'numeric' },
        { k: 'ort.stadt', t: 'text', l: 'Ort', ph: 'Steinfurt', w: 'half', req: true },
        { k: 'ort.ortsteil', t: 'text', l: 'Ortsteil (optional)', ph: 'z. B. Borghorst', w: 'half' },
        { k: 'ort.lage', t: 'choice', l: 'Lage', w: 'half', o: [['innerorts', 'innerorts'], ['ausserorts', 'außerorts']], when: istStrasse },
        { k: 'ort.strassentyp', t: 'choice', l: 'Straßenart', o: [['gemeinde', 'Gemeindestraße'], ['kreis', 'Kreisstraße'], ['land', 'Landesstraße'], ['bundes', 'Bundesstraße'], ['bab', 'Autobahn']], when: istStrasse },
        { k: 'ort.zugehoerigkeit', t: 'text', l: 'Zugehörigkeit der Fläche', ph: 'z. B. Kundenparkplatz des REWE-Marktes', when: d => !istStrasse(d) },
        { k: 'ort.oeffentlich', t: 'choice', l: 'Für jedermann zugänglich (öffentlicher Verkehrsraum)?', h: '§ 142 StGB setzt einen Unfall im öffentlichen Verkehrsraum voraus. Auch Privatflächen zählen, wenn sie tatsächlich für jedermann zugänglich sind.', o: [['ja', 'Ja, frei zugänglich'], ['nein', 'Nein (Schranke/Tor, nur Berechtigte)'], ['unklar', 'Zu prüfen']], when: d => !istStrasse(d) },
        { k: 'ort.position', t: 'area', l: 'Genaue Lage der Unfallstelle', ph: 'z. B. in der zweiten Parkreihe von Norden, Stellplatz Nr. 14 / am rechten Fahrbahnrand in Fahrtrichtung Norden, Höhe Haus-Nr. 12', rows: 2 },
        { k: 'ort.ortSicher', t: 'choice', l: 'Wie sicher ist die Ortsangabe des Geschädigten?', w: 'half', o: [['sicher', 'Sicher'], ['unsicher', 'Nicht sicher']] }
      ]
    },
    {
      id: 'strasse', phase: 'Unfallort', title: 'Straße & Verkehrsregelung', lead: 'Wie ist die Straße an der Unfallstelle beschaffen?', gen: 'ort', when: istStrasse,
      fields: [
        { k: 'ort.tempo', t: 'number', l: 'Zulässige Höchstgeschwindigkeit (km/h)', q: [30, 50, 70, 100], w: 'half', min: 5, max: 130, step: 10 },
        { k: 'ort.tempoGrund', t: 'choice', l: 'Grundlage', o: [['vz274', 'Zeichen 274'], ['zone', 'Zone (Zeichen 274.1)'], ['ortschaft', 'Geschlossene Ortschaft'], ['bereich', 'Verkehrsberuhigter Bereich']], when: d => has(get(d, 'ort.tempo')) },
        { k: 'ort.fahrstreifen', t: 'number', l: 'Fahrstreifen je Richtung', q: [1, 2], w: 'half', min: 1, max: 6, step: 1 },
        { k: 'ort.trennung', t: 'choice', l: 'Trennung der Richtungsfahrbahnen', o: [['keine', 'keine Markierung'], ['leitlinie', 'unterbrochene Leitlinie'], ['mittellinie', 'durchgezogene Mittellinie'], ['doppel', 'doppelte durchgezogene Linie'], ['mittelstreifen', 'baulicher Mittelstreifen']] },
        { k: 'ort.parkordnung', t: 'choice', l: 'Parken am Fahrbahnrand', o: [['laengs', 'Längsparken'], ['quer', 'Querparken'], ['schraeg', 'Schrägparken'], ['bucht', 'Parkbuchten'], ['verbot', 'Parkverbot']] },
        { k: 'ort.verlauf', t: 'choice', l: 'Streckenverlauf', w: 'half', o: [['gerade', 'gerade'], ['links', 'Linkskurve'], ['rechts', 'Rechtskurve'], ['kreuzung', 'Kreuzung / Einmündung']] },
        { k: 'ort.steigung', t: 'choice', l: 'Höhenprofil', w: 'half', o: [['eben', 'eben'], ['gefaelle', 'Gefälle'], ['steigung', 'Steigung']] },
        { k: 'ort.fahrtrichtung', t: 'text', l: 'Bezugs-Fahrtrichtung', ph: 'z. B. stadteinwärts / Richtung Burgsteinfurt', w: 'half' },
        { k: 'ort.besonderheiten', t: 'multi', l: 'Besonderheiten', o: [['engstelle', 'Engstelle'], ['baustelle', 'Arbeitsstelle'], ['kuppe', 'Kuppe'], ['bushalt', 'Bushaltestelle'], ['fgue', 'Fußgängerüberweg'], ['radweg', 'Radverkehrsanlage'], ['einbahn', 'Einbahnstraße'], ['spielstr', 'Verkehrsberuhigt']] },
        { k: 'ort.verkehr', t: 'choice', l: 'Verkehrsaufkommen bei der Aufnahme', w: 'half', o: [['gering', 'gering'], ['maessig', 'mäßig'], ['stark', 'stark'], ['stau', 'zähfließend / Stau']] }
      ]
    },
    {
      id: 'verhaeltnisse', phase: 'Unfallort', title: 'Fahrbahn, Licht & Wetter', lead: 'Wie waren die Verhältnisse bei der Aufnahme?', gen: 'ort',
      fields: [
        { k: 'ort.belag', t: 'choice', l: 'Fahrbahnbelag', o: [['asphalt', 'Asphalt'], ['beton', 'Beton'], ['pflaster', 'Pflaster'], ['kopfstein', 'Kopfsteinpflaster'], ['schotter', 'Schotter / unbefestigt']] },
        { k: 'ort.fahrbahn', t: 'choice', l: 'Fahrbahnzustand', o: [['trocken', 'trocken'], ['feucht', 'feucht'], ['nass', 'nass'], ['laub', 'mit Laub / verschmutzt'], ['schnee', 'schneebedeckt'], ['eis', 'vereist']] },
        { k: 'ort.licht', t: 'choice', l: 'Lichtverhältnisse', w: 'half', o: [['tag', 'Tageslicht'], ['daemmerung', 'Dämmerung'], ['dunkel', 'Dunkelheit']] },
        { k: 'ort.beleuchtung', t: 'choice', l: 'Straßen-/Platzbeleuchtung', w: 'half', o: [['betrieb', 'in Betrieb'], ['aus', 'vorhanden, aus'], ['keine', 'nicht vorhanden']], when: d => get(d, 'ort.licht') !== 'tag' },
        { k: 'ort.wetter', t: 'choice', l: 'Witterung', o: [['trocken', 'trocken'], ['regen', 'Regen'], ['nieselregen', 'Nieselregen'], ['schnee', 'Schneefall'], ['nebel', 'Nebel'], ['sonne', 'tiefstehende Sonne']] },
        { k: 'ort.sicht', t: 'choice', l: 'Sichtverhältnisse', w: 'half', o: [['gut', 'gut'], ['eingeschraenkt', 'eingeschränkt'], ['schlecht', 'schlecht']] },
        { k: 'ort.sichtbehinderung', t: 'text', l: 'Sichtbehinderung durch …', ph: 'z. B. geparkte Fahrzeuge, Hecke, Lieferwagen', when: d => ['eingeschraenkt', 'schlecht'].includes(get(d, 'ort.sicht')) }
      ]
    },
    {
      id: 'eintreff', phase: 'Unfallort', title: 'Eintreffsituation', lead: 'Was wurde beim Eintreffen vorgefunden?', gen: 'allg3', when: d => get(d, 'einsatz.aufnahmeort') !== 'wache' || get(d, 'einsatz.unfallstelleAufgesucht') === 'ja',
      fields: [
        { k: 'spuren.eintreff.text', t: 'area', l: 'Standort / Stellung des geschädigten Fahrzeugs, anwesende Personen', ph: 'z. B. Pkw stand unverändert vorwärts in der Parkbucht; Geschädigter und Zeuge warteten am Fahrzeug', rows: 3 },
        { k: 'spuren.eintreff.veraendert', t: 'yn', l: 'Wurde die Unfallstelle vor dem Eintreffen verändert?', h: 'z. B. Fahrzeug umgesetzt, Teile aufgesammelt' },
        { k: 'spuren.eintreff.veraendertText', t: 'text', l: 'Welche Veränderung?', ph: 'z. B. Geschädigter hat Spiegelglasteile aufgesammelt', when: d => get(d, 'spuren.eintreff.veraendert') === 'ja' },
        { k: 'spuren.eintreff.fotos', t: 'yn', l: 'Übersichtsaufnahmen der Eintreffsituation gefertigt?' }
      ]
    },

    /* ---------- Phase 3: Geschädigtes Fahrzeug / Sache ---------- */
    {
      id: 'ub02', phase: 'Geschädigtes Fahrzeug', title: 'Was wurde beschädigt?', lead: 'Fahrzeug oder sonstige Sache?', gen: 'fz02',
      fields: [
        { k: 'ub02.typ', t: 'choice', l: 'Beschädigt wurde', o: [['fahrzeug', 'Ein Fahrzeug'], ['sache', 'Eine sonstige Sache']] },
        { k: 'ub02.sache', t: 'area', l: 'Beschreibung der Sache', ph: 'z. B. Gartenzaun aus Holz, Grundstück Bahnhofstraße 12', rows: 2, when: d => !istFahrzeug(d) },
        { k: 'ub02.fz', t: 'vehicle', l: 'Fahrzeug (UB 02)', when: istFahrzeug },
        { k: 'ub02.zustand', t: 'choice', l: 'Zum Unfallzeitpunkt', o: [['geparkt', 'Abgestellt / geparkt'], ['fahrend', 'Im fließenden Verkehr']], when: istFahrzeug }
      ]
    },
    {
      id: 'park', phase: 'Geschädigtes Fahrzeug', title: 'Wie war das Fahrzeug abgestellt?', lead: 'Fragebogen Anlage 2, Fragen 5–7', gen: 'fz02', when: geparkt,
      fields: [
        { k: 'ub02.park.richtung', t: 'choice', l: 'Eingeparkt', w: 'half', o: [['vorwaerts', 'vorwärts'], ['rueckwaerts', 'rückwärts']] },
        { k: 'ub02.park.ordnung', t: 'choice', l: 'Parkposition', o: [['laengs', 'längs am Fahrbahnrand'], ['quer', 'quer'], ['schraeg', 'schräg'], ['bucht', 'in einer Parkbucht'], ['stellplatz', 'auf einem markierten Stellplatz'], ['frei', 'frei auf der Fläche']] },
        { k: 'ub02.park.seite', t: 'choice', l: 'Fahrbahnseite', w: 'half', o: [['rechts', 'rechter Fahrbahnrand'], ['links', 'linker Fahrbahnrand']], when: istStrasse },
        { k: 'ub02.park.abgestelltVon', t: 'choice', l: 'Wer hat das Fahrzeug abgestellt?', o: [['gesch', 'Geschädigte/r selbst'], ['andere', 'Eine andere Person']] },
        { k: 'ub02.park.fahrer', t: 'person', l: 'Person, die das Fahrzeug abgestellt hat', fields: ['geschlecht', 'nachname', 'vorname', 'tel'], when: d => get(d, 'ub02.park.abgestelltVon') === 'andere' },
        { k: 'ub02.park.beladen', t: 'yn', l: 'War das Fahrzeug beladen oder besetzt?', w: 'half' },
        { k: 'ub02.park.beladenText', t: 'text', l: 'Womit / mit wem?', when: d => get(d, 'ub02.park.beladen') === 'ja' }
      ]
    },
    {
      id: 'fahrt', phase: 'Geschädigtes Fahrzeug', title: 'Fahrvorgang', lead: 'Was tat das geschädigte Fahrzeug gerade?', gen: 'fz02', when: d => istFahrzeug(d) && get(d, 'ub02.zustand') === 'fahrend',
      fields: [
        { k: 'ub02.fahrt.vorgang', t: 'choice', l: 'Vorgang', o: [['geradeaus', 'Geradeausfahrt'], ['warten', 'Warten (Ampel/Stau)'], ['abbiegen', 'Abbiegen'], ['ueberholen', 'Überholen / Vorbeifahren'], ['einparken', 'Einparken'], ['ausparken', 'Ausparken'], ['kreisverkehr', 'Kreisverkehr']] },
        { k: 'ub02.fahrt.richtung', t: 'text', l: 'Fahrtrichtung', ph: 'z. B. stadtauswärts', w: 'half' },
        { k: 'ub02.fahrt.tempo', t: 'number', l: 'Geschwindigkeit ca. (km/h)', w: 'half', q: [0, 10, 30, 50], min: 0, max: 200, step: 5 },
        { k: 'ub02.fahrt.text', t: 'area', l: 'Kurzbeschreibung des Vorgangs', ph: 'z. B. UB 02 wartete an der roten LZA, als ein von hinten kommendes Fahrzeug auffuhr', rows: 3 }
      ]
    },
    {
      id: 'teile02', phase: 'Geschädigtes Fahrzeug', title: 'Schadensbild', lead: 'Welche Fahrzeugteile sind beschädigt?', gen: 'fz02', when: istFahrzeug,
      fields: [{ k: 'ub02.teile', t: 'parts', l: 'Beschädigte Fahrzeugteile' }]
    },
    {
      id: 'sache02', phase: 'Geschädigtes Fahrzeug', title: 'Schadensbild an der Sache', lead: 'Wie sieht der Schaden aus?', gen: 'fz02', when: d => !istFahrzeug(d),
      fields: [
        { k: 'ub02.sacheSchaden', t: 'area', l: 'Beschreibung der Beschädigung', ph: 'z. B. zwei Zaunfelder eingedrückt, Pfosten geknickt; Anstoßhöhe ca. 40–60 cm', rows: 3 },
        { k: 'ub02.sacheFremdlack', t: 'yn', l: 'Fremdlack / Fremdmaterial an der Anstoßstelle?' },
        { k: 'ub02.sacheFarbe', t: 'text', l: 'Farbe / Material', ph: 'z. B. silberner Lackabrieb', when: d => get(d, 'ub02.sacheFremdlack') === 'ja' },
        { k: 'ub02.sacheEigentuemer', t: 'text', l: 'Eigentümer / Zuständiger', ph: 'z. B. Stadt Steinfurt (Verkehrszeichen) / Grundstückseigentümer' }
      ]
    },
    {
      id: 'abschluss02', phase: 'Geschädigtes Fahrzeug', title: 'Schadenshöhe & Verbleib', lead: 'Zahlen und Ergebnis', gen: 'fz02',
      fields: [
        { k: 'ub02.wert', t: 'euro', l: 'Geschätzte Schadenshöhe (€)', q: [300, 500, 1000, 1500, 2500, 5000], step: 100, min: 0 },
        { k: 'ub02.verdeckt', t: 'yn', l: 'Hinweis auf mögliche verdeckte Schäden aufnehmen?', h: '„Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden … nicht ausgeschlossen werden.“' },
        { k: 'ub02.fahrbereit', t: 'yn', l: 'Fahrzeug fahrbereit und verkehrssicher?', w: 'half', when: istFahrzeug },
        { k: 'ub02.verbleib', t: 'choice', l: 'Verbleib des Fahrzeugs', o: [['vorort', 'verblieb vor Ort'], ['gefahren', 'vom Geschädigten weitergenutzt'], ['abgeschleppt', 'abgeschleppt']], when: istFahrzeug },
        { k: 'ub02.altschaden', t: 'choice', l: 'Altschäden am Fahrzeug insgesamt?', o: [['nein', 'keine erkennbar'], ['ja', 'ja, abgrenzbar'], ['unklar', 'nicht sicher abgrenzbar']], when: istFahrzeug },
        { k: 'ub02.altschadenText', t: 'text', l: 'Welche Altschäden?', ph: 'z. B. ältere Kratzer an der Heckschürze rechts, korrodiert', when: d => ['ja', 'unklar'].includes(get(d, 'ub02.altschaden')) }
      ]
    },

    /* ---------- Phase 4: Spuren ---------- */
    {
      id: 'spurenfz', phase: 'Spuren', title: 'Spurensicherung am Fahrzeug', lead: 'Was wurde am geschädigten Fahrzeug gesichert?', gen: 'fz02', when: istFahrzeug,
      fields: [
        { t: 'info', text: 'Spurenkatalog: Spurfix-Folie dient nur der optischen Vorauswertung (Mikrospuren auf dem Lack). Für ein gerichtsverwertbares LKA-Gutachten Lackproben immer durch Schneiden/Ausheben bis zum Träger gewinnen – nicht schaben, nicht auf Folie. Zwei bis drei kleine Folien (10 cm) an markanten Berührungspunkten reichen; nur den Beschriftungsstreifen beschriften.' },
        { k: 'spuren.fz.spurfix', t: 'yn', l: 'Spurensicherungsfolie (Spurfix) aufgebracht?' },
        { k: 'spuren.fz.spurfixAnzahl', t: 'number', l: 'Anzahl der Folien', q: [1, 2, 3], w: 'half', min: 1, max: 20, step: 1, when: d => get(d, 'spuren.fz.spurfix') === 'ja' },
        { k: 'spuren.fz.spurfixDoku', t: 'yn', l: 'Folien nummeriert, Klebestellen beschrieben und fotografiert?', when: d => get(d, 'spuren.fz.spurfix') === 'ja' },
        { k: 'spuren.fz.lackprobe', t: 'yn', l: 'Fremdlack-Anriebe/Splitter gesondert gesichert?', h: 'Pergamintüte / Spurensicherungsbeutel, durch Schneiden oder Ausheben' },
        { k: 'spuren.fz.lackprobeArt', t: 'choice', l: 'Gewonnen durch', w: 'half', o: [['schneiden', 'Schneiden / Ausheben'], ['abnehmen', 'Abnehmen loser Splitter']], when: d => get(d, 'spuren.fz.lackprobe') === 'ja' },
        { k: 'spuren.fz.eigenlack', t: 'yn', l: 'Vergleichsprobe des Eigenlacks gesichert?', w: 'half', when: d => get(d, 'spuren.fz.lackprobe') === 'ja' },
        { k: 'spuren.fz.fremdteile', t: 'yn', l: 'Fremdteile des Verursacherfahrzeugs aufgefunden?', h: 'z. B. Spiegelglas, Blinkerglas, Zierleiste, Stoßfängerfragment' },
        { k: 'spuren.fz.fremdteileText', t: 'text', l: 'Welche Teile, wo?', ph: 'z. B. Spiegelgehäuse schwarz, lag neben dem Vorderrad links', when: d => get(d, 'spuren.fz.fremdteile') === 'ja' },
        { k: 'spuren.fz.fremdteileSicher', t: 'yn', l: 'Fremdteile sichergestellt?', w: 'half', when: d => get(d, 'spuren.fz.fremdteile') === 'ja' },
        { k: 'spuren.fz.fotosMassstab', t: 'yn', l: 'Beschädigungen mit Maßstab fotografiert (Anstoßhöhe)?' },
        { k: 'spuren.fz.mikroskop', t: 'yn', l: 'Optische Vorauswertung (Handmikroskop) durchgeführt?', w: 'half' }
      ]
    },
    {
      id: 'spurenort', phase: 'Spuren', title: 'Spuren am Unfallort', lead: 'Fahrbahn, Umfeld und sonstige Gegenstände', gen: 'spuren',
      fields: [
        { k: 'spuren.fahrbahn.vorhanden', t: 'yn', l: 'Spuren auf der Fahrbahn oder im Umfeld festgestellt?' },
        { k: 'spuren.fahrbahn.arten', t: 'multi', l: 'Art der Spuren', o: [['splitter', 'Glas-/Kunststoffsplitter'], ['teile', 'Fahrzeugteile'], ['lack', 'Lackpartikel'], ['reifen', 'Reifen-/Rangierspuren'], ['fluessig', 'Flüssigkeiten'], ['schmutz', 'Schmutzabwurf'], ['kratz', 'Kratzspuren am Boden']], when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.fahrbahn.text', t: 'area', l: 'Lage und Verlauf', ph: 'z. B. Splitterfeld ca. 1 m hinter dem Fahrzeug, Rangierspur in Richtung Ausfahrt', rows: 2, when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.fahrbahn.gesichert', t: 'yn', l: 'Spuren fotografiert und ggf. gesichert?', w: 'half', when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.sonst.vorhanden', t: 'yn', l: 'Spuren an sonstigen Gegenständen (Poller, Zaun, Verkehrszeichen)?' },
        { k: 'spuren.sonst.text', t: 'area', l: 'Welche?', ph: 'z. B. Poller mit Lackabrieb in der Farbe Schwarz, Höhe 35–45 cm', rows: 2, when: d => get(d, 'spuren.sonst.vorhanden') === 'ja' }
      ]
    },

    /* ---------- Phase 5: Verursacher ---------- */
    {
      id: 'taeter', phase: 'Verursacher', title: 'Hinweise auf den Verursacher', lead: 'Gibt es Hinweise auf Fahrzeug oder Person?', gen: 'taeter',
      fields: [
        { k: 'taeter.hinweise', t: 'yn', l: 'Hinweise auf den Unfallflüchtigen vorhanden?' },
        { k: 'taeter.quelle', t: 'multi', l: 'Woher stammen die Hinweise?', o: [['zeuge', 'Zeuge'], ['zettel', 'Zettel am Fahrzeug'], ['kamera', 'Video / Dashcam'], ['teile', 'Fahrzeugteile'], ['gesch', 'Geschädigte/r selbst'], ['spuren', 'Spurenbild']], when: hinweise }
      ]
    },
    {
      id: 'taeterfz', phase: 'Verursacher', title: 'Verursacherfahrzeug', lead: 'Was ist über das flüchtige Fahrzeug bekannt?', gen: 'taeter', when: hinweise,
      fields: [
        { k: 'taeter.fz', t: 'vehicle', l: 'Flüchtiges Fahrzeug (UB 01)', fragment: true },
        { k: 'taeter.fz.besonderheiten', t: 'text', l: 'Besonderheiten', ph: 'z. B. Dachbox, Aufkleber, Firmenaufschrift, Beschädigung vorne rechts' },
        { k: 'taeter.fz.fluchtrichtung', t: 'text', l: 'Fluchtrichtung', ph: 'z. B. in Richtung Innenstadt', w: 'half' }
      ]
    },
    {
      id: 'taeterperson', phase: 'Verursacher', title: 'Personen & Verhalten', lead: 'Fragebogen Anlage 2 – Fragen zum Unfallflüchtigen', gen: 'taeter', when: hinweise,
      fields: [
        { k: 'taeter.personen.anzahl', t: 'number', l: 'Personen im Fahrzeug', q: [1, 2, 3], w: 'half', min: 1, max: 9, step: 1 },
        { k: 'taeter.personen.fahrer', t: 'choice', l: 'Fahrer/in', w: 'half', o: [['m', 'männlich'], ['w', 'weiblich'], ['u', 'nicht sicher']] },
        { k: 'taeter.personen.beschreibung', t: 'area', l: 'Beschreibung (Alter, Gestalt, Haare, Brille, Kleidung)', rows: 2 },
        { k: 'taeter.personen.wiedererkennen', t: 'choice', l: 'Würde der Fahrer wiedererkannt?', w: 'half', o: [['ja', 'Ja'], ['evtl', 'Eventuell'], ['nein', 'Nein']] },
        { k: 'taeter.verhalten.angehalten', t: 'yn', l: 'Hat der Fahrer nach dem Anstoß angehalten?', o: JNU },
        { k: 'taeter.verhalten.ausgestiegen', t: 'yn', l: 'Ist er ausgestiegen / hat er den Schaden begutachtet?', o: JNU, when: d => get(d, 'taeter.verhalten.angehalten') === 'ja' },
        { k: 'taeter.verhalten.wartezeit', t: 'number', l: 'Wartezeit vor Ort (Minuten)', q: [0, 1, 5, 10, 30], w: 'half', min: 0, max: 600, step: 1, when: d => get(d, 'taeter.verhalten.angehalten') === 'ja' },
        { k: 'taeter.verhalten.aufgefordert', t: 'yn', l: 'Wurde er aufgefordert, zu bleiben?', o: JNU },
        { k: 'taeter.verhalten.aufgefordertVon', t: 'text', l: 'Von wem?', ph: 'z. B. von der Geschädigten / vom Zeugen', w: 'half', when: d => get(d, 'taeter.verhalten.aufgefordert') === 'ja' },
        { k: 'taeter.verhalten.zettel', t: 'yn', l: 'Zettel mit Kontaktdaten hinterlassen?', o: JNU },
        { k: 'taeter.verhalten.zettelText', t: 'text', l: 'Inhalt des Zettels', ph: 'z. B. Name und Telefonnummer, unleserlich …', when: d => get(d, 'taeter.verhalten.zettel') === 'ja' },
        { k: 'taeter.verhalten.geraeusch', t: 'yn', l: 'War der Anstoß so laut/deutlich, dass der Fahrer ihn bemerken musste?', o: JNU },
        { k: 'taeter.verhalten.tempo', t: 'number', l: 'Geschätzte Geschwindigkeit (km/h)', q: [5, 10, 20, 30, 50], w: 'half', min: 0, max: 200, step: 5 },
        { k: 'taeter.verhalten.alkohol', t: 'yn', l: 'Anzeichen für Alkohol-/Drogeneinfluss?', o: JNU, w: 'half' },
        { k: 'taeter.verhalten.alkoholText', t: 'text', l: 'Woran bemerkt?', ph: 'z. B. unsicherer Gang, lallende Aussprache', when: d => get(d, 'taeter.verhalten.alkohol') === 'ja' }
      ]
    },
    {
      id: 'ermittlung', phase: 'Verursacher', title: 'Sofortmaßnahmen & Ermittlungen', lead: 'DA 3.1: Bei Hinweisen auf einen Verursacher umgehend Sofortmaßnahmen einleiten.', gen: 'massnahmen', when: hinweise,
      fields: [
        { k: 'taeter.ermittlung.fahndung', t: 'yn', l: 'Fahndung eingeleitet?' },
        { k: 'taeter.ermittlung.fahndungArt', t: 'multi', l: 'Art', o: [['nah', 'Nahbereichsfahndung'], ['funk', 'Funkfahndung über Leitstelle'], ['sach', 'Sachfahndung (INPOL)']], when: d => get(d, 'taeter.ermittlung.fahndung') === 'ja' },
        { k: 'taeter.ermittlung.halterabfrage', t: 'yn', l: 'Halterabfrage zum Kennzeichen durchgeführt?', when: d => has(get(d, 'taeter.fz.kz')) },
        { k: 'taeter.ermittlung.halterErgebnis', t: 'choice', l: 'Ergebnis', o: [['treffer', 'Halter ermittelt'], ['passt', 'Halter ermittelt, Fahrzeug passt zur Beschreibung'], ['passtnicht', 'Fahrzeug passt nicht zur Beschreibung'], ['kein', 'Kein Treffer / Fragment zu unvollständig']], when: d => get(d, 'taeter.ermittlung.halterabfrage') === 'ja' },
        { k: 'taeter.ermittlung.anschrift', t: 'choice', l: 'Ermittlungen an der Halteranschrift', o: [['ja', 'Durchgeführt'], ['spaeter', 'Veranlasst / folgt'], ['nein', 'Nicht möglich / entbehrlich']], when: d => ['treffer', 'passt'].includes(get(d, 'taeter.ermittlung.halterErgebnis')) },
        { k: 'taeter.ermittlung.fzAngetroffen', t: 'yn', l: 'Verursacherfahrzeug angetroffen?', when: d => get(d, 'taeter.ermittlung.anschrift') === 'ja' },
        { k: 'taeter.ermittlung.schadenKorr', t: 'choice', l: 'Korrespondiert das Schadensbild?', o: [['ja', 'Ja, in Höhe und Verlauf'], ['teils', 'Teilweise'], ['nein', 'Nein'], ['offen', 'Nicht beurteilbar']], when: fzAngetroffen },
        { k: 'taeter.ermittlung.fahrerErmittelt', t: 'yn', l: 'Fahrer/in zum Unfallzeitpunkt ermittelt?', when: d => get(d, 'taeter.ermittlung.anschrift') === 'ja' },
        { k: 'taeter.ermittlung.text', t: 'area', l: 'Weitere Ermittlungen / Ergebnis', ph: 'z. B. Halter nicht angetroffen, Benachrichtigung hinterlassen; Nachbarn befragt', rows: 2 }
      ]
    },
    {
      id: 'besch', phase: 'Verursacher', title: 'Beschuldigte Person', lead: 'Personalien, Belehrung und Einlassung', gen: 'subj', when: ermittelt,
      fields: [
        { k: 'taeter.person', t: 'person', l: 'Beschuldigte/r (UB 01)', fields: PERSON_FIELDS },
        { k: 'taeter.person.halter', t: 'yn', l: 'Ist die Person zugleich Halter/in?', w: 'half' },
        { k: 'taeter.person.fs', t: 'yn', l: 'Fahrerlaubnis vorgelegt?', w: 'half' },
        { k: 'taeter.person.belehrt', t: 'yn', l: 'Als Beschuldigte/r belehrt?' },
        { k: 'taeter.person.belehrtVon', t: 'text', l: 'Belehrt durch', ph: 'z. B. POK Müller', w: 'half', when: d => get(d, 'taeter.person.belehrt') === 'ja' },
        { k: 'taeter.person.einlassung', t: 'choice', l: 'Einlassung', o: [['angaben', 'Machte Angaben'], ['keine', 'Keine Angaben zur Sache'], ['verweigert', 'Verweigerte Angaben / Anwalt']], when: d => get(d, 'taeter.person.belehrt') === 'ja' },
        { k: 'taeter.person.text', t: 'area', l: 'Sinngemäße Angaben', ph: 'z. B. Er habe beim Ausparken einen leichten Ruck bemerkt, aber keinen Schaden gesehen …', rows: 4, when: d => get(d, 'taeter.person.einlassung') === 'angaben' }
      ]
    },
    {
      id: 'teile01', phase: 'Verursacher', title: 'Schadensbild am Verursacherfahrzeug', lead: 'Beschädigungen und Spuren am Fahrzeug UB 01', gen: 'fz01', when: fzAngetroffen,
      fields: [
        { k: 'taeter.teile', t: 'parts', l: 'Beschädigte / spurentragende Fahrzeugteile' },
        { k: 'taeter.spurfix', t: 'yn', l: 'Spurfix-Folie am Verursacherfahrzeug aufgebracht?', w: 'half' },
        { k: 'taeter.lackprobe', t: 'yn', l: 'Lackprobe (Eigenlack UB 01) gesichert?', w: 'half' },
        { k: 'taeter.fotos', t: 'yn', l: 'Lichtbilder vom Fahrzeug UB 01 gefertigt?', w: 'half' }
      ]
    },

    /* ---------- Phase 6: Personen & Angaben ---------- */
    {
      id: 'gesch', phase: 'Personen', title: 'Geschädigte Person', lead: 'Personalien und Rolle (UB 02)', gen: 'subj',
      fields: [
        { k: 'gesch', t: 'person', l: 'Geschädigte/r', fields: PERSON_FIELDS },
        { k: 'gesch.rolle', t: 'choice', l: 'Stellung zum Fahrzeug', o: [['halterfahrer', 'Halter/in und Fahrer/in'], ['halter', 'Halter/in'], ['fahrer', 'Fahrer/in (nicht Halter)'], ['nutzer', 'Nutzungsberechtigt (Firma/Miete)'], ['eigentuemer', 'Eigentümer/in der Sache']] },
        { k: 'gesch.firma', t: 'text', l: 'Firma / Halter (falls abweichend)', ph: 'z. B. Musterbau GmbH, Steinfurt', when: d => ['fahrer', 'nutzer'].includes(get(d, 'gesch.rolle')) },
        { k: 'gesch.anwesend', t: 'yn', l: 'Bei der Aufnahme vor Ort anwesend?', w: 'half' }
      ]
    },
    {
      id: 'geschangaben', phase: 'Personen', title: 'Angaben der geschädigten Person', lead: 'Fragebogen Anlage 2, Fragen 8–11', gen: 'subj',
      fields: [
        { k: 'gesch.belehrt', t: 'yn', l: 'Zeugenschaftlich belehrt?', w: 'half' },
        { k: 'gesch.belehrtVon', t: 'text', l: 'Belehrt durch', ph: 'z. B. PKin Schmidt', w: 'half', when: d => get(d, 'gesch.belehrt') === 'ja' },
        { k: 'gesch.aufmerksam', t: 'choice', l: 'Wie wurde die Person auf den Unfall aufmerksam?', o: [['selbst', 'Eigene Feststellung bei Rückkehr'], ['zeuge', 'Durch Zeugen'], ['nachbar', 'Durch Nachbarn / Anwohner'], ['zettel', 'Zettel am Fahrzeug'], ['geraeusch', 'Anstoßgeräusch gehört'], ['beobachtet', 'Unfall selbst beobachtet']] },
        { k: 'gesch.standort', t: 'text', l: 'Wo befand sich die Person zum Unfallzeitpunkt?', ph: 'z. B. im Supermarkt / in der Wohnung', w: 'half' },
        { k: 'gesch.sichtkontakt', t: 'yn', l: 'Sichtkontakt zum Fahrzeug?', w: 'half' },
        { k: 'gesch.modus', t: 'choice', l: 'Vorlage für die Schilderung', o: [['abgestellt', 'Fahrzeug abgestellt – beschädigt vorgefunden'], ['beobachtet', 'Unfall selbst wahrgenommen'], ['frei', 'Freitext']] },
        { k: 'gesch.zwischenzeit', t: 'yn', l: 'Feststellungen in der Zwischenzeit (Zwischenkontrolle)?', when: d => get(d, 'gesch.modus') === 'abgestellt' },
        { k: 'gesch.zwischenzeitText', t: 'text', l: 'Welche?', ph: 'z. B. gegen 12:00 Uhr Fahrzeug noch unbeschädigt gesehen', when: d => get(d, 'gesch.zwischenzeit') === 'ja' },
        { k: 'gesch.freitext', t: 'area', l: 'Sinngemäße Angaben', ph: 'Im Konjunktiv, z. B.: Sie habe … / Er sei …', rows: 4, when: d => ['beobachtet', 'frei'].includes(get(d, 'gesch.modus')) },
        { k: 'gesch.schaden', t: 'euro', l: 'Schadenssumme laut Geschädigtem (€)', q: [300, 500, 1000, 2000], step: 100 },
        { k: 'gesch.altschaden', t: 'choice', l: 'Könnte es sich um Altschäden handeln (Angabe des Geschädigten)?', o: [['nein', 'Nein'], ['ja', 'Ja'], ['unsicher', 'Nicht sicher']] },
        { k: 'gesch.fragebogen', t: 'yn', l: 'Fragebogen zur Verkehrsunfallflucht ausgehändigt / ausgefüllt?', w: 'half' }
      ]
    },
    {
      id: 'zeugen', phase: 'Personen', title: 'Zeugen', lead: 'Alle Zeugen mit Personalien erfassen – Knallzeugen kenntlich machen.', gen: 'subj',
      fields: [{
        k: 'zeugen', t: 'list', l: 'Zeugen', item: 'Zeuge', max: 8,
        sub: [
          { k: 'p', t: 'person', l: 'Personalien', fields: PERSON_FIELDS },
          { k: 'art', t: 'choice', l: 'Wahrnehmung', o: [['sicht', 'Unfall beobachtet'], ['knall', 'Knallzeuge (nur gehört)'], ['nachher', 'Nachträgliche Feststellung']] },
          { k: 'standort', t: 'text', l: 'Standort', ph: 'z. B. Balkon 2. OG, Haus-Nr. 14', w: 'half' },
          { k: 'entfernung', t: 'number', l: 'Entfernung ca. (m)', q: [5, 10, 20, 50], w: 'half', min: 0, max: 2000, step: 5 },
          { k: 'sicht', t: 'choice', l: 'Sicht auf die Unfallstelle', w: 'half', o: [['frei', 'frei'], ['eingeschraenkt', 'eingeschränkt']] },
          { k: 'belehrt', t: 'yn', l: 'Belehrt?', w: 'half' },
          { k: 'angaben', t: 'area', l: 'Sinngemäße Angaben', ph: 'Im Konjunktiv, z. B.: Er habe gegen 14:10 Uhr einen lauten Knall gehört und …', rows: 4 },
          { k: 'wiedererkennen', t: 'choice', l: 'Fahrer/Fahrzeug wiedererkennen?', w: 'half', o: [['ja', 'Ja'], ['evtl', 'Eventuell'], ['nein', 'Nein']] },
          { k: 'erreichbar', t: 'choice', l: 'Erreichbarkeit', w: 'half', o: [['vorort', 'vor Ort angetroffen'], ['telefon', 'nur telefonisch'], ['spaeter', 'nachträglich zu kontaktieren']] }
        ]
      }]
    },
    {
      id: 'dritte', phase: 'Personen', title: 'Sonstige Angaben Dritter', lead: 'Anwohner, Firmen, Angehörige – keine unmittelbaren Zeugen', gen: 'subj',
      fields: [
        { k: 'dritte.vorhanden', t: 'yn', l: 'Angaben Dritter vorhanden?' },
        { k: 'dritte.text', t: 'area', l: 'Wer hat was mitgeteilt?', ph: 'z. B. Marktleiter: Kamera erfasst den Parkplatz nur teilweise; Aufzeichnung wird 72 Stunden vorgehalten', rows: 3, when: d => get(d, 'dritte.vorhanden') === 'ja' }
      ]
    },

    /* ---------- Phase 7: Maßnahmen ---------- */
    {
      id: 'massnahmen1', phase: 'Maßnahmen', title: 'Dokumente & Dokumentation', lead: 'Unfallmitteilung, Lichtbilder, Skizze', gen: 'massnahmen',
      fields: [
        { k: 'massnahmen.unfallmitteilung', t: 'choice', l: 'Unfallmitteilung', h: 'DA 1.1: vor Ort eine Durchschrift aushändigen; sonst unverzüglich nachsenden und den Versand im Text vermerken.', o: [['vorort', 'Durchschrift vor Ort ausgehändigt'], ['nachgesandt', 'Wird nachgesandt'], ['digital', 'Digital per E-Mail übersandt'], ['keine', 'Nicht ausgehändigt']] },
        { k: 'massnahmen.lichtbilder', t: 'yn', l: 'Lichtbilder gefertigt?' },
        { k: 'massnahmen.lichtbilderAnzahl', t: 'number', l: 'Anzahl ca.', q: [4, 8, 12, 20], w: 'half', min: 1, max: 500, step: 1, when: d => get(d, 'massnahmen.lichtbilder') === 'ja' },
        { k: 'massnahmen.mappe', t: 'choice', l: 'Lichtbildmappe', h: 'DA 1.5: Bei Verkehrsunfallfluchten ist eine Lichtbildmappe zu fertigen (2 Bilder je Seite, Farbausdruck, PDF unter dem ViVA-Az.).', w: 'half', o: [['ja', 'Gefertigt'], ['offen', 'Folgt'], ['nein', 'Nicht erforderlich']], when: d => get(d, 'massnahmen.lichtbilder') === 'ja' },
        { k: 'massnahmen.skizze', t: 'yn', l: 'Skizze / Luftbildskizze gefertigt?', w: 'half' },
        { k: 'massnahmen.anzeige', t: 'yn', l: 'Verkehrsunfallanzeige (§ 142 StGB) gefertigt?', w: 'half' },
        { k: 'massnahmen.az', t: 'text', l: 'Aktenzeichen / Vorgangsnummer', ph: 'optional', w: 'half' }
      ]
    },
    {
      id: 'massnahmen2', phase: 'Maßnahmen', title: 'Ermittlungsansätze', lead: 'Kameras, Zeugensuche, Asservate', gen: 'massnahmen',
      fields: [
        { k: 'massnahmen.kamera', t: 'yn', l: 'Unfallörtlichkeit auf Kameraüberwachung geprüft?', h: 'Anliegende Firmen, Tankstellen, Haltestellen, Dashcams' },
        { k: 'massnahmen.kameraErgebnis', t: 'choice', l: 'Ergebnis', o: [['keine', 'Keine Kamera vorhanden'], ['vorhanden', 'Kamera vorhanden, Sicherung veranlasst'], ['gesichert', 'Aufzeichnung gesichert'], ['angefragt', 'Anfrage läuft']], when: d => get(d, 'massnahmen.kamera') === 'ja' },
        { k: 'massnahmen.kameraText', t: 'text', l: 'Details', ph: 'z. B. Kamera REWE, Ansprechpartner Marktleitung, Speicherdauer 72 h', when: d => get(d, 'massnahmen.kamera') === 'ja' && get(d, 'massnahmen.kameraErgebnis') !== 'keine' },
        { k: 'massnahmen.zeugensuche', t: 'yn', l: 'Aktiv nach weiteren Zeugen gesucht?' },
        { k: 'massnahmen.zeugensucheArt', t: 'multi', l: 'Wie?', o: [['anwohner', 'Anwohnerbefragung'], ['umfeld', 'Umfeld / Geschäfte'], ['zettel', 'Zeugenaufruf hinterlassen'], ['nachbarfz', 'Nachbarfahrzeuge geprüft']], when: d => get(d, 'massnahmen.zeugensuche') === 'ja' },
        { k: 'massnahmen.zeugensucheErgebnis', t: 'choice', l: 'Ergebnis', w: 'half', o: [['keine', 'ohne Ergebnis'], ['hinweise', 'mit Hinweisen']], when: d => get(d, 'massnahmen.zeugensuche') === 'ja' },
        { k: 'massnahmen.asservate', t: 'yn', l: 'Asservate (Folien, Lackproben, Teile) zum Vorgang genommen?' },
        { k: 'massnahmen.asservateText', t: 'text', l: 'Welche?', ph: 'z. B. 2 Spurfix-Folien, 1 Pergamintüte Lackanrieb, Spiegelgehäuse', when: d => get(d, 'massnahmen.asservate') === 'ja' },
        { k: 'massnahmen.sonstige', t: 'multi', l: 'Weitere Maßnahmen', o: [['anschluss', 'Anschlussermittlungen veranlasst'], ['vk', 'VK informiert'], ['sbl', 'Straßenbaulastträger informiert'], ['eigentum', 'Eigentumssicherung'], ['verkehr', 'Verkehrslenkung / Absicherung']] },
        { k: 'massnahmen.weiteres', t: 'area', l: 'Sonstiges', rows: 2 },
        { k: 'massnahmen.einsatzende', t: 'time', l: 'Einsatzende', w: 'half', q: 'jetzt' }
      ]
    },

    /* ---------- Phase 8: Bewertung ---------- */
    {
      id: 'bewertung', phase: 'Bewertung', title: 'Deutung & vermutlicher Hergang', lead: 'Eigene Schlussfolgerungen der aufnehmenden Beamten', gen: 'bewertung',
      fields: [
        { k: 'bewertung.hergangArt', t: 'choice', l: 'Das Spurenbild spricht für …', o: [['rangieren', 'Rangieren / Ein- oder Ausparken'], ['vorbeifahrt', 'Streifkontakt bei Vorbeifahrt'], ['tuer', 'Anschlagen einer Fahrzeugtür'], ['wagen', 'Einkaufswagen / Handwagen'], ['auffahren', 'Auffahren von hinten'], ['unklar', 'Nicht eindeutig']] },
        { k: 'bewertung.uebereinstimmung', t: 'choice', l: 'Aussagen und Spurenbild', o: [['stimmig', 'stimmen überein'], ['teils', 'stimmen teilweise überein'], ['widerspruch', 'widersprechen sich'], ['keine', 'keine Aussagen vorhanden']] },
        { k: 'bewertung.hergang', t: 'area', l: 'Vermutlicher Unfallhergang in eigenen Worten (optional)', ph: 'Aus Sicht der Polizei, nicht der Beteiligten', rows: 3 },
        { k: 'bewertung.widersprueche', t: 'yn', l: 'Widersprüche festgestellt?' },
        { k: 'bewertung.widerspruecheText', t: 'area', l: 'Welche?', rows: 2, when: d => get(d, 'bewertung.widersprueche') === 'ja' },
        { k: 'bewertung.manipulation', t: 'choice', l: 'Anhaltspunkte für Vortäuschung oder Manipulation?', h: 'Spurenkatalog: Spuren an untypischen Stellen (unterhalb von Stoßfängerkanten), Basalt-/Pflasteranhaftungen, Stanzformen – DA 3.6: gesonderter Vermerk an die Sachbearbeitung.', o: [['nein', 'Nein'], ['vermutung', 'Vermutung (Vermerk)'], ['konkret', 'Konkrete Verdachtsmomente']] },
        { k: 'bewertung.manipulationText', t: 'area', l: 'Welche Anhaltspunkte?', rows: 2, when: d => get(d, 'bewertung.manipulation') !== 'nein' && has(get(d, 'bewertung.manipulation')) },
        { k: 'meta.klarnamen', t: 'yn', l: 'Klarnamen im Berichtstext verwenden?', h: 'DA 1.2: Im Unfallbefundbericht auf Klarnamen verzichten – Rollen und Ordnungsnummern genügen. Personalien stehen gesondert am Ende.', o: [['nein', 'Nein (Rollen + Nr.)'], ['ja', 'Ja']] }
      ]
    }
  ];

  root.WVUF_STEPS = STEPS;
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Textgenerator ======================= */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  const { get, str, has, num, cap, low, arr, endDot, numWord, euro, joinList, fmtDate, fmtTime, when, period, PH, person, crewText, vehicle, vehicleG, partText } = C;

  /* ---------- Kontext: Personen & Fahrzeuge mit passender Referenz ---------- */
  function ctx(d) {
    const kl = get(d, 'meta.klarnamen') === 'ja';
    const g = person('gesch', get(d, 'gesch'), { klarnamen: kl, nr: 'UB 02' });
    const b = person('besch', get(d, 'taeter.person'), { klarnamen: kl, nr: 'UB 01' });
    const istFz = get(d, 'ub02.typ') !== 'sache';
    const fz02 = get(d, 'ub02.fz') || {};
    const fz01 = get(d, 'taeter.fz') || {};
    const geparkt = istFz && get(d, 'ub02.zustand') !== 'fahrend';
    const zeugen = arr(get(d, 'zeugen')).map((z, i) => ({ z, p: person('zeuge', z && z.p, { klarnamen: kl, nr: 'Z ' + String(i + 1).padStart(2, '0') }) }));
    return { d, kl, g, b, istFz, fz02, fz01, geparkt, zeugen, hinweise: get(d, 'taeter.hinweise') === 'ja', ermittelt: get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja', strasse: get(d, 'ort.art') === 'strasse' };
  }
  const P = (...xs) => xs.filter(s => has(s)).join(' ');          // Sätze zu einem Absatz
  const B = (...xs) => xs.filter(s => has(s)).join('\n\n');       // Absätze zu einem Block

  /* ---------- Zeit & Ort als Phrasen ---------- */
  function zeitPhrase(d) {
    const z = get(d, 'zeit') || {};
    if (z.art === 'zeitpunkt') return when(z.datum, z.zeit) || PH('Unfallzeit');
    if (z.art === 'zeitraum') return period(z.vonDatum, z.vonZeit, z.bisDatum, z.bisZeit) || PH('Unfallzeitraum');
    if (z.art === 'unbekannt') return 'zu einem nicht näher bekannten Zeitpunkt';
    return PH('Unfallzeit');
  }
  const STRASSENTYP = { gemeinde: 'Gemeindestraße', kreis: 'Kreisstraße', land: 'Landesstraße', bundes: 'Bundesstraße', bab: 'Bundesautobahn' };
  function adresse(d, kurz = false) {
    const o = get(d, 'ort') || {};
    const s = [str(o.strasse) || PH('Straße'), str(o.hausnr)].filter(Boolean).join(' ');
    if (kurz) return s + (has(o.stadt) ? ' in ' + str(o.stadt) : '');
    return s + ', ' + [str(o.plz), str(o.stadt) || PH('Ort')].filter(Boolean).join(' ') + (has(o.ortsteil) ? ' (Ortsteil ' + str(o.ortsteil) + ')' : '');
  }
  /** „am rechten Fahrbahnrand der Bahnhofstraße 12 in Steinfurt“ / „auf dem Kundenparkplatz des REWE-Marktes, Bahnhofstraße 12 in Steinfurt“ */
  function ortKurz(d) {
    const o = get(d, 'ort') || {};
    if (o.art === 'strasse') {
      const seite = get(d, 'ub02.park.seite');
      const rand = seite === 'links' ? 'am linken Fahrbahnrand der ' : seite === 'rechts' ? 'am rechten Fahrbahnrand der ' : 'auf der ';
      return rand + adresse(d, true);
    }
    const zu = str(o.zugehoerigkeit);
    const art = o.art === 'parkhaus' ? 'im Parkhaus' : o.art === 'parkplatz' ? 'auf dem Parkplatz' : 'auf der Fläche';
    return (zu ? (o.art === 'parkhaus' ? 'im ' : 'auf dem ') + zu : art) + ', ' + adresse(d, true);
  }

  /* ---------- 1 Allgemeines ---------- */
  function allg1(d) {
    const e = get(d, 'einsatz') || {};
    const crew = arr(e.kraefte).filter(k => has(k && k.name));
    const wer = crew.length ? crewText(crew) : PH('eingesetzte Kräfte');
    const ruf = has(e.rufname) ? ` (${str(e.rufname)})` : '';
    const verb = crew.length === 1 ? 'erhielt' : 'erhielten';
    const weg = { leitstelle: 'über die Leitstelle', telefon: 'nach telefonischer Mitteilung bei der Polizeiwache', wache: 'nach persönlichem Erscheinen des Mitteilers auf der Polizeiwache', streife: 'durch eigene Feststellung bzw. Ansprache während des Streifendienstes', online: 'im Wege einer Online-Anzeige' }[e.meldeweg] || '';
    const mit = { gesch: 'Mitteiler war ' + (has(get(d, 'gesch.geschlecht')) ? person('gesch', get(d, 'gesch')).nom : 'die geschädigte Person') + ' selbst.', zeuge: 'Mitteiler war ein Zeuge.', dritte: 'Mitteiler war eine dritte Person.', unbekannt: 'Der Mitteiler ist nicht bekannt.' }[e.mitteiler] || '';
    const s1 = `${cap(when(e.datum, e.zeit, 'um') || PH('Datum/Uhrzeit'))} ${verb} ${wer}${ruf} ${weg ? weg + ' ' : ''}den Einsatz „Verkehrsunfallflucht mit Sachschaden“ an der Örtlichkeit ${adresse(d, true)}.`;
    let s3 = '';
    if (e.aufnahmeort === 'wache') {
      s3 = 'Die Unfallaufnahme erfolgte zunächst als Protokollaufnahme auf der Polizeiwache.';
      if (e.unfallstelleAufgesucht === 'ja') s3 += ' Die Unfallstelle wurde im Anschluss aufgesucht, um die Sachverhaltsdarstellung mit dem Spurenbild abzugleichen und weitergehende Maßnahmen zu prüfen.';
      else if (e.unfallstelleAufgesucht === 'nein') s3 += ' Die Unfallstelle wurde nicht aufgesucht.';
    } else if (e.aufnahmeort === 'unfallort') s3 = 'Die Unfallaufnahme erfolgte am Unfallort.';
    const anf = has(e.anfahrt) ? 'Anfahrt: ' + endDot(e.anfahrt) : '';
    return B(P(s1, mit, s3), anf);
  }
  function allg2(d) {
    const e = get(d, 'einsatz') || {};
    const t = [];
    if (has(e.zeit)) t.push('Meldezeit: ' + fmtTime(e.zeit));
    const mit = { gesch: get(d, 'gesch.geschlecht') === 'w' ? 'Geschädigte' : get(d, 'gesch.geschlecht') === 'm' ? 'Geschädigter' : 'geschädigte Person', zeuge: 'Zeuge/Zeugin', dritte: 'Dritte', unbekannt: 'unbekannt' }[e.mitteiler];
    if (mit) t.push('Mitteiler: ' + mit);
    t.push('Sachverhalt: ' + (has(e.erkenntnis) ? str(e.erkenntnis) : 'Verkehrsunfallflucht, Sachschaden, Verursacher ' + (get(d, 'taeter.hinweise') === 'ja' ? 'mit Hinweisen' : 'unbekannt')));
    return t.join('; ') + '.';
  }
  function allg3(d) {
    const e = get(d, 'einsatz') || {}, s = get(d, 'spuren.eintreff') || {};
    if (e.aufnahmeort === 'wache' && e.unfallstelleAufgesucht !== 'ja') return 'Entfällt – Protokollaufnahme auf der Wache ohne Aufsuchen der Unfallstelle.';
    const x = ctx(d);
    const zeit = has(e.eintreffZeit) ? `Beim Eintreffen um ${fmtTime(e.eintreffZeit)}` : 'Beim Eintreffen';
    let s1;
    if (has(s.text)) s1 = `${zeit} ergab sich folgende Situation: ${endDot(s.text)}`;
    else if (x.istFz && x.geparkt) s1 = `${zeit} stand ${vehicle(x.fz02, 'nom', true)} ${x.g.gen} ${parkPhrase(d, 'kurz')}.`;
    else s1 = `${zeit} ${PH('Eintreffsituation: Standorte, Personen, Fahrzeuge')}.`;
    const v = s.veraendert === 'ja' ? `Die Unfallstelle war vor dem Eintreffen verändert worden${has(s.veraendertText) ? ' (' + str(s.veraendertText) + ')' : ''}.` : s.veraendert === 'nein' ? 'Veränderungen an der Unfallstelle vor dem Eintreffen wurden nicht festgestellt.' : '';
    const f = s.fotos === 'ja' ? 'Die Eintreffsituation wurde durch Übersichtsaufnahmen fotografisch dokumentiert.' : '';
    return P(s1, v, f);
  }

  /* ---------- 2.1 Unfallort ---------- */
  function ort(d) {
    const o = get(d, 'ort') || {}, x = ctx(d);
    const out = [];
    if (o.art === 'strasse') {
      const lage = o.lage === 'innerorts' ? 'innerorts gelegene ' : o.lage === 'ausserorts' ? 'außerorts gelegene ' : '';
      const typ = STRASSENTYP[o.strassentyp] || 'Straße';
      out.push(`Bei der Unfallörtlichkeit handelt es sich um die ${lage}${typ} ${quoteStr(o.strasse)}${has(o.hausnr) ? ' in Höhe der Hausnummer ' + str(o.hausnr) : ''}, ${[str(o.plz), str(o.stadt) || PH('Ort')].filter(Boolean).join(' ')}${has(o.ortsteil) ? ' (Ortsteil ' + str(o.ortsteil) + ')' : ''}.`);
    } else {
      const was = o.art === 'parkhaus' ? 'das Parkhaus' : o.art === 'parkplatz' ? 'den Parkplatz' : 'die Verkehrsfläche';
      out.push(`Bei der Unfallörtlichkeit handelt es sich um ${has(o.zugehoerigkeit) ? was + ' ' + quoteStr(o.zugehoerigkeit) : was}, ${adresse(d)}.`);
      if (o.oeffentlich === 'ja') out.push('Die Fläche ist für jedermann zugänglich und damit öffentlicher Verkehrsraum.');
      else if (o.oeffentlich === 'nein') out.push('Die Fläche ist nicht für jedermann zugänglich (Zugang nur für Berechtigte); es handelt sich nach den Feststellungen vor Ort nicht um öffentlichen Verkehrsraum.');
      else if (o.oeffentlich === 'unklar') out.push('Ob die Fläche öffentlicher Verkehrsraum ist, bedarf der Prüfung durch die Sachbearbeitung.');
    }
    if (has(o.position)) out.push(`Die Unfallstelle befindet sich ${lowFirst(o.position)}.`);
    if (o.ortSicher === 'unsicher') out.push(`${x.g.Nom} konnte den Unfallort nicht mit Sicherheit angeben.`);
    const p1 = out.join(' ');

    // Verkehrsregelung (Straße)
    const v = [];
    if (o.art === 'strasse') {
      const t = num(o.tempo);
      if (t != null) {
        const grund = { vz274: 'angeordnet durch Zeichen 274', zone: `angeordnet als Tempo-${t}-Zone (Zeichen 274.1)`, ortschaft: 'ergibt sich aus der Lage innerhalb geschlossener Ortschaft', bereich: 'ergibt sich aus dem verkehrsberuhigten Bereich' }[o.tempoGrund];
        v.push(`Die zulässige Höchstgeschwindigkeit beträgt dort ${t} km/h${grund ? ' (' + grund + ')' : ''}.`);
      }
      const fs = num(o.fahrstreifen);
      const tr = { keine: 'nicht markiert', leitlinie: 'durch eine unterbrochene Leitlinie markiert', mittellinie: 'durch eine durchgezogene Mittellinie getrennt', doppel: 'durch eine doppelte durchgezogene Linie getrennt', mittelstreifen: 'baulich durch einen Mittelstreifen getrennt' }[o.trennung];
      const fsw = fs === 1 ? 'einen Fahrstreifen' : numWord(fs) + ' Fahrstreifen';
      if (fs != null && tr) v.push(`Die Fahrbahn verfügt über ${fsw} je Richtung; die Richtungsfahrbahnen sind ${tr}.`);
      else if (fs != null) v.push(`Die Fahrbahn verfügt über ${fsw} je Richtung.`);
      else if (tr) v.push(`Die Richtungsfahrbahnen sind ${tr}.`);
      const po = { laengs: 'Am Fahrbahnrand wird in Längsaufstellung geparkt.', quer: 'Am Fahrbahnrand wird in Queraufstellung geparkt.', schraeg: 'Am Fahrbahnrand wird in Schrägaufstellung geparkt.', bucht: 'Entlang der Fahrbahn sind Parkbuchten angelegt.', verbot: 'Im Bereich der Unfallstelle besteht ein Parkverbot.' }[o.parkordnung];
      if (po) v.push(po);
      const vl = { gerade: 'verläuft gerade', links: 'verläuft in einer Linkskurve', rechts: 'verläuft in einer Rechtskurve', kreuzung: 'liegt im Bereich einer Kreuzung bzw. Einmündung' }[o.verlauf];
      const st = { eben: 'ist eben', gefaelle: 'weist ein Gefälle auf', steigung: 'weist eine Steigung auf' }[o.steigung];
      const fr = has(o.fahrtrichtung) ? ` (bezogen auf die Fahrtrichtung ${str(o.fahrtrichtung)})` : '';
      if (vl && st) v.push(`Der Streckenabschnitt ${vl} und ${st}${fr}.`);
      else if (vl) v.push(`Der Streckenabschnitt ${vl}${fr}.`);
      else if (st) v.push(`Der Streckenabschnitt ${st}${fr}.`);
      const BES = { engstelle: 'eine Engstelle', baustelle: 'eine Arbeitsstelle', kuppe: 'eine Kuppe', bushalt: 'eine Bushaltestelle', fgue: 'ein Fußgängerüberweg', radweg: 'eine Radverkehrsanlage', einbahn: 'eine Einbahnstraßenregelung', spielstr: 'ein verkehrsberuhigter Bereich' };
      const bes = arr(o.besonderheiten).map(k => BES[k]).filter(Boolean);
      if (bes.length) v.push(`Als Besonderheit ${bes.length > 1 ? 'sind' : 'ist'} ${joinList(bes)} vorhanden.`);
      const vk = { gering: 'geringes', maessig: 'mäßiges', stark: 'starkes', stau: 'zähfließendes bis stockendes' }[o.verkehr];
      if (vk) v.push(`Zum Zeitpunkt der Unfallaufnahme herrschte ${vk} Verkehrsaufkommen.`);
    }
    // Fahrbahn, Licht, Witterung – immer „zum Zeitpunkt der Unfallaufnahme“ (Unfallzeit meist unbekannt)
    const w = [];
    const belag = { asphalt: 'Asphalt', beton: 'Beton', pflaster: 'Pflaster', kopfstein: 'Kopfsteinpflaster', schotter: 'unbefestigtem Material' }[o.belag];
    const fb = { trocken: 'trocken', feucht: 'feucht', nass: 'nass', laub: 'mit Laub bzw. Schmutz bedeckt', schnee: 'schneebedeckt', eis: 'vereist' }[o.fahrbahn];
    if (belag && fb) w.push(`Die Fahrbahn besteht aus ${belag} und war zum Zeitpunkt der Unfallaufnahme ${fb}.`);
    else if (belag) w.push(`Die Fahrbahn besteht aus ${belag}.`);
    else if (fb) w.push(`Die Fahrbahn war zum Zeitpunkt der Unfallaufnahme ${fb}.`);
    const li = { tag: 'Es herrschte Tageslicht.', daemmerung: 'Es herrschte Dämmerung', dunkel: 'Es war dunkel' }[o.licht];
    const bl = { betrieb: 'die Straßenbeleuchtung war in Betrieb', aus: 'die vorhandene Straßenbeleuchtung war ausgeschaltet', keine: 'eine Straßenbeleuchtung ist nicht vorhanden' }[o.beleuchtung];
    if (o.licht === 'tag') w.push(li);
    else if (li) w.push(li + (bl ? '; ' + bl : '') + '.');
    const we = { trocken: 'Die Witterung war trocken.', regen: 'Es regnete.', nieselregen: 'Es fiel Nieselregen.', schnee: 'Es schneite.', nebel: 'Es herrschte Nebel.', sonne: 'Die Sonne stand tief.' }[o.wetter];
    if (we) w.push(we);
    const si = { gut: 'Die Sichtverhältnisse waren gut.', eingeschraenkt: 'Die Sichtverhältnisse waren eingeschränkt', schlecht: 'Die Sichtverhältnisse waren schlecht' }[o.sicht];
    if (o.sicht === 'gut') w.push(si);
    else if (si) w.push(si + (has(o.sichtbehinderung) ? ' (Sichtbehinderung durch ' + str(o.sichtbehinderung) + ')' : '') + '.');
    return B(p1, v.join(' '), w.join(' '));
  }
  const quoteStr = s => (has(s) ? '„' + str(s) + '“' : PH('Straße'));
  const lowFirst = s => { s = str(s); return /^[A-ZÄÖÜ][a-zäöüß]/.test(s) && !/^(Nr|Haus|Reihe|Stellplatz|Höhe|Parkplatz|Parkbucht|Richtung|Fahrtrichtung)/.test(s) ? low(s) : s; };

  /* ---------- Parkphrase ---------- */
  function parkPhrase(d, mode = 'voll') {
    const p = get(d, 'ub02.park') || {};
    const ri = { vorwaerts: 'vorwärts', rueckwaerts: 'rückwärts' }[p.richtung];
    const ord = { laengs: 'in Längsaufstellung', quer: 'in Queraufstellung', schraeg: 'in Schrägaufstellung', bucht: 'in einer Parkbucht', stellplatz: 'auf einem markierten Stellplatz', frei: '' }[p.ordnung];
    if (mode === 'angabe') return [ord, ri].filter(Boolean).join(' ');
    const teile = [ord, ri ? ri + ' eingeparkt' : (mode === 'voll' ? 'abgestellt' : '')].filter(Boolean).join(' ');
    return [ortKurz(d), teile].filter(Boolean).join(' ');
  }

  /* ---------- 2.3 Fahrzeug UB 02 ---------- */
  function fz02(d) {
    const x = ctx(d), u = get(d, 'ub02') || {};
    if (!x.istFz) {
      const out = [];
      out.push(`Beschädigt wurde ${has(u.sache) ? lowFirst(u.sache) : PH('Sache')}${has(u.sacheEigentuemer) ? '; ' + str(u.sacheEigentuemer) : ''}.`);
      if (has(u.sacheSchaden)) out.push(endDot(u.sacheSchaden));
      if (u.sacheFremdlack === 'ja') out.push(`An der Anstoßstelle ${has(u.sacheFarbe) ? 'wurde ' + lowFirst(u.sacheFarbe) + ' festgestellt' : 'wurden Fremdlack- bzw. Fremdmaterialanhaftungen festgestellt'}.`);
      else if (u.sacheFremdlack === 'nein') out.push('Fremdlack- oder Fremdmaterialanhaftungen waren an der Anstoßstelle nicht erkennbar.');
      return B(out.join(' '), wertText(d));
    }
    const intro = [];
    const fzFull = vehicle(x.fz02, 'nom', true);
    const poss = ['halterfahrer', 'halter', 'eigentuemer'].includes(get(d, 'gesch.rolle')) ? x.g.gen : has(get(d, 'gesch.firma')) ? 'der Firma ' + str(get(d, 'gesch.firma')) : x.g.gen;
    if (x.geparkt) {
      const p = u.park || {};
      intro.push(`${cap(fzFull)} ${poss} war ${zeitPhrase(d)} ${parkPhrase(d)}.`);
      if (p.abgestelltVon === 'andere') {
        const f = person('fahrer', p.fahrer, { klarnamen: x.kl });
        intro.push(`Abgestellt wurde das Fahrzeug nicht ${x.g.dat} selbst, sondern ${x.kl && f.name ? f.name : 'einer anderen Person'} (siehe Personalien).`);
      }
      if (p.beladen === 'ja') intro.push(`Das Fahrzeug war ${has(p.beladenText) ? 'beladen bzw. besetzt (' + str(p.beladenText) + ')' : 'beladen bzw. besetzt'}.`);
      else if (p.beladen === 'nein') intro.push('Das Fahrzeug war unbeladen und unbesetzt.');
    } else {
      const f = u.fahrt || {};
      const vg = { geradeaus: 'befuhr die Straße in Geradeausfahrt', warten: 'stand verkehrsbedingt wartend', abbiegen: 'befand sich im Abbiegevorgang', ueberholen: 'befand sich im Überhol- bzw. Vorbeifahrvorgang', einparken: 'befand sich im Einparkvorgang', ausparken: 'befand sich im Ausparkvorgang', kreisverkehr: 'befuhr den Kreisverkehr' }[f.vorgang] || PH('Fahrvorgang');
      intro.push(`${cap(fzFull)} ${poss} ${vg}${has(f.richtung) ? ' in Fahrtrichtung ' + str(f.richtung) : ''}${num(f.tempo) ? ' mit ca. ' + num(f.tempo) + ' km/h' : ''}, als es ${zeitPhrase(d)} an der Unfallörtlichkeit ${ortKurz(d)} zu dem Zusammenstoß kam.`);
      if (has(f.text)) intro.push(endDot(f.text));
    }
    const teile = arr(u.teile).filter(t => t && has(t.name));
    let schaden;
    if (teile.length) schaden = `Am Fahrzeug wurden folgende unfallbedingte Beschädigungen und Spuren festgestellt:\n` + teile.map(t => '– ' + partText(t)).join('\n');
    else schaden = `Am Fahrzeug ${PH('Beschädigungen – noch keine Fahrzeugteile erfasst')}.`;
    const nach = [];
    if (u.verdeckt === 'ja') nach.push('Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten und Verformungselementen, nicht ausgeschlossen werden.');
    if (u.altschaden === 'ja') nach.push(`Davon abgrenzbar wies das Fahrzeug Altschäden auf${has(u.altschadenText) ? ' (' + str(u.altschadenText) + ')' : ''}, die nicht dem Unfallgeschehen zuzuordnen sind.`);
    else if (u.altschaden === 'unklar') nach.push(`Eine sichere Abgrenzung zu möglichen Altschäden war vor Ort nicht möglich${has(u.altschadenText) ? ' (' + str(u.altschadenText) + ')' : ''}.`);
    else if (u.altschaden === 'nein') nach.push('Weitere, nicht unfallbedingte Altschäden waren am Fahrzeug nicht erkennbar.');
    const wt = wertText(d);
    if (u.fahrbereit === 'ja') nach.push('Das Fahrzeug war fahrbereit und verkehrssicher.');
    else if (u.fahrbereit === 'nein') nach.push('Das Fahrzeug war nicht mehr fahrbereit bzw. nicht verkehrssicher.');
    const vb = { vorort: 'Es verblieb am Unfallort.', gefahren: `Es wurde ${x.g.dat} belassen und weitergenutzt.`, abgeschleppt: 'Es wurde abgeschleppt.' }[u.verbleib];
    if (vb) nach.push(vb);
    return B(intro.join(' '), schaden, P(...nach, wt), spurenFz(d));
  }
  function wertText(d) {
    const w = num(get(d, 'ub02.wert'));
    return w != null ? `Die Höhe des sichtbaren Sachschadens wird auf ca. ${euro(w)} geschätzt.` : '';
  }
  function spurenFz(d) {
    const s = get(d, 'spuren.fz') || {};
    const out = [];
    if (s.spurfix === 'ja') {
      const n = num(s.spurfixAnzahl);
      out.push(`Zur Sicherung von Mikrospuren ${n === 1 ? 'wurde an der Anstoßstelle eine Spurensicherungsfolie (Spurfix) aufgebracht' : `wurden an den markanten Berührungspunkten ${n != null ? numWord(n) : PH('Anzahl')} Spurensicherungsfolien (Spurfix) aufgebracht`}${s.spurfixDoku === 'ja' ? ', fortlaufend nummeriert, die Klebestellen beschrieben und fotografisch dokumentiert' : ''}. Die ${n === 1 ? 'Folie liegt' : 'Folien liegen'} dem Vorgang bei.`);
    } else if (s.spurfix === 'nein') out.push('Auf das Aufbringen einer Spurensicherungsfolie wurde verzichtet.');
    if (s.lackprobe === 'ja') {
      out.push(`Fremdlackanriebe bzw. -splitter wurden ${s.lackprobeArt === 'schneiden' ? 'durch Schneiden bzw. Ausheben bis zum Träger' : 'als lose Partikel'} gesondert gesichert und dem Vorgang als Asservat beigefügt (für eine mögliche Materialuntersuchung beim LKA geeignet).`);
      if (s.eigenlack === 'ja') out.push('Zu Vergleichszwecken wurde zusätzlich eine Probe des Eigenlacks des geschädigten Fahrzeugs gesichert.');
    }
    if (s.fremdteile === 'ja') out.push(`${has(s.fremdteileText) ? 'Als Fremdteile wurden aufgefunden: ' + endDot(s.fremdteileText) : 'Es wurden Fremdteile des Verursacherfahrzeugs aufgefunden.'} ${s.fremdteileSicher === 'ja' ? 'Die Teile wurden sichergestellt und dem Vorgang beigefügt.' : s.fremdteileSicher === 'nein' ? 'Eine Sicherstellung erfolgte nicht.' : ''}`.trim());
    else if (s.fremdteile === 'nein') out.push('Fremdteile des Verursacherfahrzeugs wurden nicht aufgefunden.');
    if (s.fotosMassstab === 'ja') out.push('Die Beschädigungen wurden unter Verwendung eines Maßstabs fotografisch dokumentiert, sodass die Anstoßhöhen nachvollziehbar sind.');
    if (s.mikroskop === 'ja') out.push('Eine optische Vorauswertung der Anhaftungen (Handmikroskop) wurde im Ersten Angriff durchgeführt.');
    return out.join(' ');
  }

  /* ---------- 2.3 Fahrzeug UB 01 ---------- */
  function fz01(d) {
    const x = ctx(d), t = get(d, 'taeter') || {};
    if (!x.hinweise) return '';
    if (get(d, 'taeter.ermittlung.fzAngetroffen') !== 'ja') return '';
    const out = [];
    const e = t.ermittlung || {};
    out.push(`${cap(vehicle(x.fz01, 'nom', true))} wurde ${e.anschrift === 'ja' ? 'an der Halteranschrift' : ''} angetroffen und in Augenschein genommen.`.replace('  ', ' '));
    const teile = arr(t.teile).filter(p => p && has(p.name));
    if (teile.length) out.push('Am Fahrzeug wurden folgende Beschädigungen und Spuren festgestellt:\n' + teile.map(p => '– ' + partText(p)).join('\n'));
    else out.push(`Beschädigungen am Fahrzeug: ${PH('keine Fahrzeugteile erfasst')}.`);
    const korr = { ja: 'Das Schadensbild korrespondiert in Anstoßhöhe und Verlauf mit den Beschädigungen am Fahrzeug ' + x.g.gen + '.', teils: 'Das Schadensbild korrespondiert nur teilweise mit den Beschädigungen am Fahrzeug ' + x.g.gen + '.', nein: 'Das Schadensbild korrespondiert nicht mit den Beschädigungen am Fahrzeug ' + x.g.gen + '.', offen: 'Ob das Schadensbild mit den Beschädigungen am Fahrzeug ' + x.g.gen + ' korrespondiert, konnte vor Ort nicht abschließend beurteilt werden.' }[e.schadenKorr];
    const s = [];
    if (korr) s.push(korr);
    if (t.spurfix === 'ja') s.push('Auch am Verursacherfahrzeug wurde eine Spurensicherungsfolie aufgebracht.');
    if (t.lackprobe === 'ja') s.push('Eine Probe des Eigenlacks des Verursacherfahrzeugs wurde zu Vergleichszwecken gesichert.');
    if (t.fotos === 'ja') s.push('Das Fahrzeug wurde fotografisch dokumentiert.');
    return B(out.join('\n'), s.join(' '));
  }

  /* ---------- 2.2 / 2.5 Spuren am Unfallort ---------- */
  function spuren(d) {
    const f = get(d, 'spuren.fahrbahn') || {}, s = get(d, 'spuren.sonst') || {};
    const out = [];
    if (f.vorhanden === 'nein') out.push('Auf der Fahrbahn und im näheren Umfeld der Unfallstelle wurden keine unfallbezogenen Spuren festgestellt.');
    else if (f.vorhanden === 'ja') {
      const ART = { splitter: 'Glas- bzw. Kunststoffsplitter', teile: 'Fahrzeugteile', lack: 'Lackpartikel', reifen: 'Reifen- bzw. Rangierspuren', fluessig: 'Flüssigkeitsspuren', schmutz: 'Schmutzabwurf', kratz: 'Kratzspuren am Boden' };
      const a = arr(f.arten).map(k => ART[k]).filter(Boolean);
      out.push(`Auf der Fahrbahn ${a.length ? 'wurden ' + joinList(a) + ' festgestellt' : 'wurden Spuren festgestellt'}${has(f.text) ? ': ' + endDot(f.text) : '.'}`);
      if (f.gesichert === 'ja') out.push('Die Spuren wurden fotografisch dokumentiert und, soweit möglich, gesichert.');
      else if (f.gesichert === 'nein') out.push('Eine Sicherung der Spuren war nicht möglich bzw. nicht erforderlich.');
    } else out.push(PH('Spuren auf der Fahrbahn'));
    const p1 = out.join(' ');
    let p2 = '';
    if (s.vorhanden === 'ja') p2 = 'Spuren an sonstigen Gegenständen: ' + (has(s.text) ? endDot(s.text) : PH('Beschreibung'));
    else if (s.vorhanden === 'nein') p2 = 'Spuren an sonstigen Gegenständen (Verkehrseinrichtungen, Gebäude, Zäune) wurden nicht festgestellt.';
    return B(p1, p2);
  }

  /* ---------- 2.x Verursacher: Hinweise ---------- */
  function taeter(d) {
    const x = ctx(d), t = get(d, 'taeter') || {};
    if (!x.hinweise) return has(t.hinweise) ? 'Hinweise auf den Unfallverursacher bzw. das Verursacherfahrzeug liegen nicht vor.' : PH('Hinweise auf den Verursacher: ja/nein');
    const out = [];
    const Q = { zeuge: 'Zeugenangaben', zettel: 'einen am Fahrzeug hinterlassenen Zettel', kamera: 'Videoaufzeichnungen', teile: 'aufgefundene Fahrzeugteile', gesch: 'Angaben ' + x.g.gen, spuren: 'das Spurenbild' };
    const q = arr(t.quelle).map(k => Q[k]).filter(Boolean);
    out.push(`Hinweise auf den Unfallverursacher liegen vor${q.length ? ' (durch ' + joinList(q) + ')' : ''}.`);
    const f = t.fz || {};
    if (has(f.art) || has(f.marke) || has(f.farbe) || has(f.kz)) {
      out.push(`Bei dem flüchtigen Fahrzeug soll es sich um ${vehicle(f, 'akk', true)} handeln${has(f.besonderheiten) ? '; Besonderheiten: ' + str(f.besonderheiten) : ''}.`);
      if (f.kzFragment && has(f.kz)) out.push('Das Kennzeichen konnte nur fragmentarisch abgelesen werden.');
    } else if (has(f.besonderheiten)) out.push('Besonderheiten des Verursacherfahrzeugs: ' + endDot(f.besonderheiten));
    if (has(f.fluchtrichtung)) out.push(`Das Fahrzeug entfernte sich ${str(f.fluchtrichtung)}.`);
    const pe = t.personen || {};
    const n = num(pe.anzahl);
    const fa = { m: 'ein männlicher Fahrer', w: 'eine weibliche Fahrerin', u: 'eine Person, deren Geschlecht nicht sicher angegeben werden konnte' }[pe.fahrer];
    if (n != null || fa) out.push(`${n != null ? 'In dem Fahrzeug befand' + (n === 1 ? ' sich eine Person' : 'en sich ' + numWord(n) + ' Personen') : 'Zu den Insassen'}${fa ? (n != null ? '; am Steuer saß ' : ' wurde angegeben: am Steuer saß ') + fa : ''}.`);
    if (has(pe.beschreibung)) out.push('Beschreibung: ' + endDot(pe.beschreibung));
    const fg = pe.fahrer === 'w' ? 'der Fahrerin' : 'des Fahrers';
    const we = { ja: `${pe.fahrer === 'w' ? 'Die Fahrerin' : 'Der Fahrer'} würde wiedererkannt werden.`, evtl: `Ein Wiedererkennen ${fg} wird für möglich gehalten.`, nein: `Ein Wiedererkennen ${fg} ist nicht möglich.` }[pe.wiedererkennen];
    if (we) out.push(we);
    const v = t.verhalten || {};
    const tf = pe.fahrer === 'w' ? { Nom: 'Die Fahrerin', er: 'sie', Er: 'Sie' } : { Nom: 'Der Fahrer', er: 'er', Er: 'Er' };
    const vh = [];
    if (v.angehalten === 'ja') {
      const wz = num(v.wartezeit);
      vh.push(`${tf.Nom} hielt nach dem Anstoß zunächst an${v.ausgestiegen === 'ja' ? ', stieg aus und begutachtete den Schaden' : v.ausgestiegen === 'nein' ? ', ohne auszusteigen,' : ''}${wz != null ? ' und verblieb ' + (wz === 0 ? 'nur wenige Augenblicke' : 'ca. ' + wz + ' Minute' + (wz === 1 ? '' : 'n')) + ' vor Ort' : ''}, bevor ${tf.er} sich entfernte.`);
    } else if (v.angehalten === 'nein') vh.push(`${tf.Nom} hielt nach dem Anstoß nicht an und setzte die Fahrt unmittelbar fort.`);
    if (v.aufgefordert === 'ja') vh.push(`${tf.Er} wurde${has(v.aufgefordertVon) ? ' ' + (/^(von|vom|durch)\b/i.test(str(v.aufgefordertVon)) ? '' : 'von ') + str(v.aufgefordertVon) : ''} aufgefordert, an der Unfallstelle zu bleiben, kam dem jedoch nicht nach.`);
    else if (v.aufgefordert === 'nein') vh.push('Eine Aufforderung, an der Unfallstelle zu bleiben, erfolgte nicht.');
    if (v.zettel === 'ja') vh.push(`Am Fahrzeug ${x.g.gen} wurde ein Zettel hinterlassen${has(v.zettelText) ? ' (' + str(v.zettelText) + ')' : ''}; eine Benachrichtigung der Polizei oder ${x.g.gen} erfolgte durch den Verursacher nicht.`);
    else if (v.zettel === 'nein') vh.push('Ein Zettel mit Kontaktdaten wurde nicht hinterlassen.');
    if (v.geraeusch === 'ja') vh.push(`Nach den Angaben vor Ort war der Anstoß so laut und deutlich wahrnehmbar, dass er ${tf.er === 'sie' ? 'der Fahrerin' : 'dem Fahrer'} nicht entgangen sein kann.`);
    else if (v.geraeusch === 'nein') vh.push(`Ob ${tf.er === 'sie' ? 'die Fahrerin' : 'der Fahrer'} den Anstoß bemerkt hat, ist nach den Angaben vor Ort fraglich.`);
    if (num(v.tempo) != null) vh.push(`Die Geschwindigkeit des Verursacherfahrzeugs wurde auf ca. ${num(v.tempo)} km/h geschätzt.`);
    if (v.alkohol === 'ja') vh.push(`Es bestanden Anzeichen für eine alkohol- bzw. drogenbedingte Beeinflussung ${tf.er === 'sie' ? 'der Fahrerin' : 'des Fahrers'}${has(v.alkoholText) ? ' (' + str(v.alkoholText) + ')' : ''}.`);
    else if (v.alkohol === 'nein') vh.push('Anzeichen für eine Beeinflussung durch Alkohol oder Drogen wurden nicht geschildert.');
    return B(out.join(' '), vh.join(' '));
  }

  /* ---------- 3 Subjektiver Befund ---------- */
  function subj(d) {
    const x = ctx(d), g = get(d, 'gesch') || {};
    const blocks = [];
    // 3.1 Geschädigte/r
    const s = [];
    const anw = g.anwesend === 'ja' ? ' war bei der Unfallaufnahme vor Ort anwesend.' : g.anwesend === 'nein' ? ' war bei der Unfallaufnahme nicht vor Ort anwesend.' : '';
    const rolle = { halterfahrer: `${x.g.Er} ist Halter${x.g.fem ? 'in' : ''} und ${x.g.fem ? 'Führerin' : 'Führer'} des Fahrzeugs.`, halter: `${x.g.Er} ist Halter${x.g.fem ? 'in' : ''} des Fahrzeugs.`, fahrer: `${x.g.Er} ist ${x.g.fem ? 'Führerin' : 'Führer'}, nicht jedoch Halter${x.g.fem ? 'in' : ''} des Fahrzeugs${has(g.firma) ? ' (Halter: ' + str(g.firma) + ')' : ''}.`, nutzer: `${x.g.Er} ist nutzungsberechtigt${has(g.firma) ? ' (Halter: ' + str(g.firma) + ')' : ''}.`, eigentuemer: `${x.g.Er} ist Eigentümer${x.g.fem ? 'in' : ''} der beschädigten Sache.` }[g.rolle] || '';
    s.push(`${x.g.FirstNom}${anw || '.'} ${rolle}`.trim());
    const bel = g.belehrt === 'ja' ? `Nach zeugenschaftlicher Belehrung${has(g.belehrtVon) ? ' durch ' + str(g.belehrtVon) : ''} gab ${x.g.er} sinngemäß Folgendes an:` : g.belehrt === 'nein' ? `Im Rahmen der informatorischen Befragung gab ${x.g.er} sinngemäß Folgendes an:` : `${PH('Belehrung')} ${cap(x.g.er)} gab sinngemäß Folgendes an:`;
    let ang = '';
    if (g.modus === 'abgestellt') {
      const z = get(d, 'zeit') || {};
      const ab = z.art === 'zeitraum' ? when(z.vonDatum, z.vonZeit) : '';
      const rk = z.art === 'zeitraum' ? when(z.bisDatum, z.bisZeit) : '';
      const fzRef = x.istFz ? x.g.poss('akk', vehicleG(x.fz02)) + ' ' + vehicle(x.fz02).split(' ').slice(1).join(' ') : 'die Sache';
      ang = `${x.g.Er} habe ${fzRef} ${ab || PH('Abstellzeit')} ${ortKurz(d)} ${parkPhrase(d, 'angabe')} abgestellt. Bei ${x.g.poss('dat', 'w')} Rückkehr ${rk || PH('Rückkehrzeit')} habe ${x.g.er} das Fahrzeug beschädigt vorgefunden.`.replace(/\s+/g, ' ');
      const auf = { selbst: '', zeuge: ` Auf den Unfall sei ${x.g.er} durch einen Zeugen aufmerksam gemacht worden.`, nachbar: ` Auf den Unfall sei ${x.g.er} durch Nachbarn bzw. Anwohner aufmerksam gemacht worden.`, zettel: ` Auf den Unfall sei ${x.g.er} durch einen am Fahrzeug hinterlassenen Zettel aufmerksam geworden.`, geraeusch: ` ${x.g.Er} habe ein Anstoßgeräusch gehört und daraufhin nachgesehen.`, beobachtet: ` ${x.g.Er} habe den Unfall selbst beobachtet.` }[g.aufmerksam] || '';
      ang += auf;
      if (has(g.standort)) ang += ` Zum Unfallzeitpunkt habe ${x.g.er} sich ${lowFirst(g.standort)} befunden${g.sichtkontakt === 'ja' ? ' und Sichtkontakt zum Fahrzeug gehabt' : g.sichtkontakt === 'nein' ? ' und keinen Sichtkontakt zum Fahrzeug gehabt' : ''}.`;
      if (g.zwischenzeit === 'ja') ang += ` In der Zwischenzeit habe ${x.g.er} Folgendes festgestellt: ${has(g.zwischenzeitText) ? endDot(g.zwischenzeitText) : PH('Zwischenfeststellung')}`;
      else if (g.zwischenzeit === 'nein') ang += ` Weitere Feststellungen in der Zwischenzeit habe ${x.g.er} nicht gemacht.`;
      ang += ` ${x.g.Er} gehe davon aus, dass es in diesem Zeitraum zu einem Verkehrsunfall gekommen sei, bei dem das Fahrzeug beschädigt wurde, und dass sich der Verursacher entfernt habe, ohne die erforderlichen Feststellungen zu ermöglichen.`;
    } else if (g.modus === 'beobachtet' || g.modus === 'frei') {
      ang = has(g.freitext) ? str(g.freitext) : PH('Angaben der geschädigten Person');
      if (g.modus === 'beobachtet' && has(g.standort)) ang += ` Zum Unfallzeitpunkt habe ${x.g.er} sich ${lowFirst(g.standort)} befunden.`;
    } else ang = PH('Vorlage für die Schilderung wählen');
    const sch = num(g.schaden);
    const nach = [];
    if (sch != null) nach.push(`Den entstandenen Schaden schätzt ${x.g.er} auf ca. ${euro(sch)}.`);
    const alt = { nein: `Altschäden an den betroffenen Stellen schloss ${x.g.er} aus.`, ja: `${x.g.Er} räumte ein, dass es sich teilweise um Altschäden handeln könne.`, unsicher: `Ob es sich teilweise um Altschäden handeln könnte, konnte ${x.g.er} nicht sicher sagen.` }[g.altschaden];
    if (alt) nach.push(alt);
    if (g.fragebogen === 'ja') nach.push(`Der Fragebogen zur Verkehrsunfallflucht wurde ${x.g.dat} ausgehändigt und liegt dem Vorgang bei.`);
    blocks.push(B(s.join(' '), bel + '\n' + ang, nach.join(' ')));
    // 3.1 Beschuldigte/r
    if (x.ermittelt) {
      const b = get(d, 'taeter.person') || {};
      const t = [];
      t.push(`${x.b.FirstNom} wurde als ${x.b.fem ? 'Führerin' : 'Führer'} des Verursacherfahrzeugs ermittelt${b.halter === 'ja' ? ' und ist zugleich dessen Halter' + (x.b.fem ? 'in' : '') : b.halter === 'nein' ? '; Halter des Fahrzeugs ist eine andere Person' : ''}.`);
      if (b.fs === 'ja') t.push('Eine gültige Fahrerlaubnis wurde vorgelegt.');
      else if (b.fs === 'nein') t.push('Eine Fahrerlaubnis wurde nicht vorgelegt.');
      if (b.belehrt === 'ja') {
        const e = { angaben: `Nach Beschuldigtenbelehrung${has(b.belehrtVon) ? ' durch ' + str(b.belehrtVon) : ''} machte ${x.b.er} sinngemäß folgende Angaben:\n${has(b.text) ? str(b.text) : PH('Einlassung')}`, keine: `Nach Beschuldigtenbelehrung${has(b.belehrtVon) ? ' durch ' + str(b.belehrtVon) : ''} machte ${x.b.er} keine Angaben zur Sache.`, verweigert: `Nach Beschuldigtenbelehrung${has(b.belehrtVon) ? ' durch ' + str(b.belehrtVon) : ''} verweigerte ${x.b.er} jegliche Angaben und verwies auf ${x.b.poss('akk', 'm')} Rechtsbeistand.` }[b.einlassung] || `${x.b.Er} wurde als Beschuldigte${x.b.fem ? '' : 'r'} belehrt.`;
        t.push(e);
      } else if (b.belehrt === 'nein') t.push(`Eine Beschuldigtenbelehrung erfolgte vor Ort nicht; ${x.b.er} wurde lediglich informatorisch angehört.`);
      blocks.push(t.join(' '));
    }
    // 3.2 Zeugen
    if (x.zeugen.length) {
      x.zeugen.forEach(({ z, p }) => {
        const t = [];
        const art = { sicht: `${p.FirstNom} beobachtete den Unfall unmittelbar.`, knall: `${p.FirstNom} wurde durch ein Anstoßgeräusch auf den Vorfall aufmerksam (Knallzeuge).`, nachher: `${p.FirstNom} traf nachträgliche Feststellungen.` }[z.art] || `${p.FirstNom}:`;
        t.push(art);
        const ent = num(z.entfernung);
        const sicht = { frei: 'mit freier Sicht auf die Unfallstelle', eingeschraenkt: 'mit eingeschränkter Sicht auf die Unfallstelle' }[z.sicht];
        if (has(z.standort) || ent != null || sicht) t.push(`Zum Unfallzeitpunkt befand ${p.er} sich ${[has(z.standort) ? lowFirst(z.standort) : '', ent != null ? 'in ca. ' + ent + ' m Entfernung' : '', sicht].filter(Boolean).join(', ')}.`);
        const bel = z.belehrt === 'ja' ? `Nach zeugenschaftlicher Belehrung gab ${p.er} sinngemäß an:` : z.belehrt === 'nein' ? `Bei der informatorischen Befragung gab ${p.er} sinngemäß an:` : `${PH('Belehrung')} ${p.Er} gab sinngemäß an:`;
        t.push(bel + '\n' + (has(z.angaben) ? str(z.angaben) : PH('Angaben')));
        const we = { ja: `${p.Er} würde den Fahrer bzw. das Fahrzeug wiedererkennen.`, evtl: `${p.Er} hält ein Wiedererkennen für möglich.`, nein: `${p.Er} könnte den Fahrer bzw. das Fahrzeug nicht wiedererkennen.` }[z.wiedererkennen];
        if (we) t.push(we);
        const er = { vorort: '', telefon: `${p.Er} war nur telefonisch erreichbar; eine nachträgliche Kontaktaufnahme ist erforderlich.`, spaeter: `${p.Er} ist nachträglich zu kontaktieren.` }[z.erreichbar];
        if (er) t.push(er);
        blocks.push(t.join(' '));
      });
    } else blocks.push('Unmittelbare Unfallzeugen konnten nicht festgestellt werden.');
    // 3.3 Dritte
    const dr = get(d, 'dritte') || {};
    if (dr.vorhanden === 'ja') blocks.push('Sonstige Angaben Dritter: ' + (has(dr.text) ? endDot(dr.text) : PH('Angaben Dritter')));
    else if (dr.vorhanden === 'nein') blocks.push('Sonstige Angaben Dritter liegen nicht vor.');
    return blocks;
  }

  /* ---------- 4 Bewertung ---------- */
  function bewertung(d) {
    const x = ctx(d), b = get(d, 'bewertung') || {};
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const out = [];
    const hoehen = teile.map(t => [num(t.von), num(t.bis)]).filter(h => h[0] != null || h[1] != null);
    const hmin = hoehen.length ? Math.min(...hoehen.map(h => h[0] ?? h[1])) : null, hmax = hoehen.length ? Math.max(...hoehen.map(h => h[1] ?? h[0])) : null;
    const hs = hmin != null ? (hmin === hmax ? `von ca. ${hmin} cm` : `von ${hmin} bis ${hmax} cm`) : '';
    const verl = [...new Set(teile.map(t => t.verlauf).filter(Boolean))];
    const vs = verl.length === 1 ? { punktuell: 'der punktuelle Charakter', horizontal: 'der horizontale Verlauf', vertikal: 'der vertikale Verlauf', diagonal: 'der diagonale Verlauf', flaechig: 'der flächige Charakter' }[verl[0]] : '';
    const wo = teile.length ? ' (' + joinList(teile.map(t => t.name)) + ')' : '';
    const art = { rangieren: 'einen Anstoß durch ein rangierendes bzw. ein- oder ausparkendes Fahrzeug', vorbeifahrt: 'einen Streifkontakt mit einem vorbeifahrenden Fahrzeug', tuer: 'das Anschlagen einer Fahrzeugtür eines daneben abgestellten Fahrzeugs', wagen: 'einen Anstoß durch einen Einkaufs- oder Handwagen', auffahren: 'ein Auffahren eines nachfolgenden Fahrzeugs', unklar: '' }[b.hergangArt];
    if (b.hergangArt && b.hergangArt !== 'unklar') {
      const subj = hs && vs ? `Die Anstoßhöhe ${hs} und ${vs}` : hs ? `Die Anstoßhöhe ${hs}` : vs ? cap(vs) : 'Das Spurenbild';
      out.push(`${subj} der Beschädigungen${wo} ${hs && vs ? 'sprechen' : 'spricht'} für ${art}.`);
    }
    else if (b.hergangArt === 'unklar') out.push('Aus dem Spurenbild lässt sich der Entstehungsvorgang der Beschädigungen nicht eindeutig ableiten.');
    const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
    if (farben.length) out.push(`Die Fremdlackanhaftungen in der Farbe ${joinList(farben)} lassen auf ein entsprechend lackiertes Verursacherfahrzeug schließen.`);
    const ue = { stimmig: 'Da die Angaben der Beteiligten und Zeugen sowie das festgestellte Spurenbild übereinstimmen, kann davon ausgegangen werden, dass sich der Unfall wie folgt ereignet hat:', teils: 'Die Angaben der Beteiligten und Zeugen stimmen mit dem Spurenbild nur teilweise überein. Aus polizeilicher Sicht dürfte sich der Unfall wie folgt ereignet haben:', widerspruch: 'Aufgrund der widersprüchlichen Angaben und des Spurenbildes kann der Unfallhergang aus Sicht der aufnehmenden Beamten nicht eindeutig geklärt werden. Vermutlicher Hergang:', keine: 'Angaben zum Unfallhergang liegen nicht vor. Aus dem Spurenbild ergibt sich folgender vermutlicher Hergang:' }[b.uebereinstimmung] || 'Vermutlicher Unfallhergang:';
    let herg = has(b.hergang) ? str(b.hergang) : autoHergang(x, b);
    out.push(ue + '\n' + herg);
    const wd = b.widersprueche === 'ja' ? 'Widersprüche: ' + (has(b.widerspruecheText) ? endDot(b.widerspruecheText) : PH('Widersprüche')) : b.widersprueche === 'nein' ? 'Widersprüche zwischen den Angaben und dem Spurenbild wurden nicht festgestellt.' : '';
    const man = { nein: 'Anhaltspunkte für einen vorgetäuschten oder manipulierten Verkehrsunfall ergaben sich nicht.', vermutung: 'Es besteht die Vermutung, dass der Unfall vorgetäuscht bzw. manipuliert worden sein könnte' + (has(b.manipulationText) ? ' (' + str(b.manipulationText) + ')' : '') + '. Dies wird der Sachbearbeitung per gesondertem Vermerk mitgeteilt.', konkret: 'Es bestehen konkrete Verdachtsmomente für einen vorgetäuschten bzw. manipulierten Unfall' + (has(b.manipulationText) ? ' (' + str(b.manipulationText) + ')' : '') + '. Die betreffende Person wurde als Beschuldigte belehrt; es wird gesondert angezeigt.' }[b.manipulation];
    return B(out.join(' ').replace(':\n', ':\n'), P(wd, man));
  }
  function autoHergang(x, b) {
    const d = x.d;
    const ver = x.hinweise ? `der ${x.ermittelt ? 'ermittelte' : 'bislang unbekannte'} Führer ${vehicle(x.fz01, 'gen', has(get(d, 'taeter.fz.marke')) || has(get(d, 'taeter.fz.farbe')))}` : 'der Führer eines bislang unbekannten Fahrzeugs';
    const akt = { rangieren: 'beim Rangieren bzw. Ein- oder Ausparken', vorbeifahrt: 'bei der Vorbeifahrt', tuer: 'beim Öffnen einer Fahrzeugtür', wagen: 'mit einem Einkaufs- bzw. Handwagen', auffahren: 'durch Auffahren' }[b.hergangArt] || 'auf nicht näher bekannte Weise';
    const obj = x.istFz ? `${vehicle(x.fz02, 'akk', false)} ${x.g.gen}` : (has(get(d, 'ub02.sache')) ? 'die Sache „' + str(get(d, 'ub02.sache')) + '“' : 'eine fremde Sache');
    const wo = x.istFz && x.geparkt ? ` ${ortKurz(d)} abgestellten` : '';
    const obj2 = x.istFz ? `${x.geparkt ? 'den' + wo + ' ' + vehicle(x.fz02, 'akk', false).split(' ').slice(1).join(' ') : vehicle(x.fz02, 'akk', false)} ${x.g.gen}` : obj;
    return `${cap(zeitPhrase(d))} beschädigte ${ver} ${akt} ${obj2} und entfernte sich anschließend vom Unfallort, ohne die nach § 142 StGB erforderlichen Feststellungen zu ermöglichen oder zu dulden.`;
  }

  /* ---------- 5 Maßnahmen ---------- */
  function massnahmen(d) {
    const x = ctx(d), m = get(d, 'massnahmen') || {}, e = get(d, 'taeter.ermittlung') || {};
    const s1 = [], s2 = [], s3 = [];
    if (x.hinweise) {
      if (e.fahndung === 'ja') {
        const A = { nah: 'eine Nahbereichsfahndung', funk: 'eine Funkfahndung über die Leitstelle', sach: 'eine Sachfahndung' };
        const a = arr(e.fahndungArt).map(k => A[k]).filter(Boolean);
        s1.push(`Aufgrund der vorliegenden Hinweise wurde${a.length ? ' ' + joinList(a) : ' eine Fahndung'} eingeleitet.`);
      } else if (e.fahndung === 'nein') s1.push('Fahndungsmaßnahmen wurden mangels ausreichender Hinweise nicht eingeleitet.');
      if (e.halterabfrage === 'ja') {
        const r = { treffer: 'Der Halter konnte ermittelt werden.', passt: 'Der Halter konnte ermittelt werden; das zugelassene Fahrzeug entspricht der Beschreibung.', passtnicht: 'Das zu dem Kennzeichen zugelassene Fahrzeug entspricht nicht der Beschreibung des Verursacherfahrzeugs.', kein: 'Eine Halterfeststellung war anhand des (unvollständigen) Kennzeichens nicht möglich.' }[e.halterErgebnis] || '';
        s1.push(`Zum Kennzeichen wurde eine Halterabfrage durchgeführt. ${r}`.trim());
      }
      const an = { ja: 'Es wurden unverzüglich Ermittlungen an der Halteranschrift durchgeführt.', spaeter: 'Ermittlungen an der Halteranschrift wurden veranlasst.', nein: 'Ermittlungen an der Halteranschrift waren nicht möglich bzw. entbehrlich.' }[e.anschrift];
      if (an) s1.push(an + (e.fzAngetroffen === 'nein' && e.anschrift === 'ja' ? ' Das Verursacherfahrzeug wurde dort nicht angetroffen.' : ''));
      if (e.fahrerErmittelt === 'nein' && e.anschrift === 'ja') s1.push('Der Fahrzeugführer zum Unfallzeitpunkt konnte bislang nicht ermittelt werden.');
      if (has(e.text)) s1.push(endDot(e.text));
    }
    const um = { vorort: `${x.g.Dat} wurde vor Ort eine Durchschrift der Unfallmitteilung ausgehändigt.`, nachgesandt: `Die Unfallmitteilung konnte vor Ort nicht ausgehändigt werden und wird ${x.g.dat} unverzüglich nachgesandt.`, digital: `${x.g.Dat} wurde die Unfallmitteilung in digitaler Form per E-Mail übersandt.`, keine: 'Eine Unfallmitteilung wurde nicht ausgehändigt.' }[m.unfallmitteilung];
    if (um) s2.push(um);
    if (m.lichtbilder === 'ja') {
      const n = num(m.lichtbilderAnzahl);
      const mp = { ja: ' und in einer Lichtbildmappe zusammengefasst, die dem Vorgang beigefügt ist', offen: '; eine Lichtbildmappe wird gefertigt und dem Vorgang nachgereicht', nein: '' }[m.mappe] || '';
      s2.push(`Es wurden ${n != null ? 'ca. ' + n + ' ' : ''}Lichtbilder von der Unfallörtlichkeit und den Beschädigungen gefertigt${mp}. Die Bilder werden unter dem Aktenzeichen auf dem Bilddatenserver gespeichert.`);
    } else if (m.lichtbilder === 'nein') s2.push('Lichtbilder wurden nicht gefertigt.');
    if (m.skizze === 'ja') s2.push('Eine Skizze der Unfallörtlichkeit wurde gefertigt und ist dem Vorgang beigefügt.');
    if (m.kamera === 'ja') {
      const k = { keine: 'Eine Kameraüberwachung, die den Unfallort erfasst, ist nicht vorhanden.', vorhanden: 'Die Unfallörtlichkeit wird videoüberwacht; die Sicherung der Aufzeichnungen wurde veranlasst', gesichert: 'Die Unfallörtlichkeit wird videoüberwacht; die Aufzeichnungen wurden gesichert und sind dem Vorgang beigefügt', angefragt: 'Die Unfallörtlichkeit wird möglicherweise videoüberwacht; eine Anfrage beim Betreiber läuft' }[m.kameraErgebnis] || 'Die Unfallörtlichkeit wurde auf eine Kameraüberwachung geprüft';
      s3.push(k + (m.kameraErgebnis !== 'keine' && has(m.kameraText) ? ' (' + str(m.kameraText) + ').' : k.endsWith('.') ? '' : '.'));
    } else if (m.kamera === 'nein') s3.push('Eine Prüfung auf Kameraüberwachung erfolgte nicht.');
    if (m.zeugensuche === 'ja') {
      const Z = { anwohner: 'Befragung der Anwohner', umfeld: 'Befragung im Umfeld (Geschäfte, Passanten)', zettel: 'Hinterlassen eines Zeugenaufrufs', nachbarfz: 'Überprüfung benachbart abgestellter Fahrzeuge auf korrespondierende Schäden' };
      const z = arr(m.zeugensucheArt).map(k => Z[k]).filter(Boolean);
      s3.push(`Es wurde aktiv nach weiteren Zeugen gesucht${z.length ? ' (' + joinList(z) + ')' : ''}${m.zeugensucheErgebnis === 'keine' ? ' – ohne Ergebnis.' : m.zeugensucheErgebnis === 'hinweise' ? '; hierbei ergaben sich weitere Hinweise.' : '.'}`);
    } else if (m.zeugensuche === 'nein') s3.push('Eine aktive Zeugensuche im Umfeld erfolgte nicht.');
    if (m.asservate === 'ja') s3.push(`Folgende Asservate wurden zum Vorgang genommen: ${has(m.asservateText) ? endDot(m.asservateText) : PH('Asservate')} Die Erfassung erfolgt nach den Richtlinien des Asservatenmanagementsystems.`);
    const SO = { anschluss: 'Anschlussermittlungen wurden veranlasst.', vk: 'Das Verkehrskommissariat wurde informiert.', sbl: 'Der Straßenbaulastträger wurde über die Beschädigung informiert.', eigentum: 'Maßnahmen zur Eigentumssicherung wurden getroffen.', verkehr: 'Die Unfallstelle wurde abgesichert; der Verkehr wurde vorübergehend geregelt.' };
    arr(m.sonstige).forEach(k => { if (SO[k]) s3.push(SO[k]); });
    if (has(m.weiteres)) s3.push(endDot(m.weiteres));
    if (m.anzeige === 'ja') s3.push('Eine Verkehrsunfallanzeige wegen des Verdachts des unerlaubten Entfernens vom Unfallort (§ 142 StGB) wurde gefertigt.');
    else if (m.anzeige === 'nein') s3.push('Eine Verkehrsunfallanzeige wurde noch nicht gefertigt.');
    return { s1: s1.join(' '), s2: s2.join(' '), s3: s3.join(' ') };
  }

  /* ---------- 6 Sonstiges ---------- */
  function sonst(d) {
    const m = get(d, 'massnahmen') || {}, e = get(d, 'einsatz') || {}, s = get(d, 'spuren.fz') || {};
    const anl = [];
    if (m.lichtbilder === 'ja') anl.push(m.mappe === 'ja' ? 'Lichtbildmappe' : 'Lichtbilder');
    if (m.skizze === 'ja') anl.push('Skizze');
    if (get(d, 'gesch.fragebogen') === 'ja') anl.push('Fragebogen zur Verkehrsunfallflucht');
    if (s.spurfix === 'ja') anl.push('Spurensicherungsfolien');
    if (s.lackprobe === 'ja') anl.push('Lackprobe(n)');
    if (s.fremdteile === 'ja' && s.fremdteileSicher === 'ja') anl.push('sichergestellte Fremdteile');
    if (m.kameraErgebnis === 'gesichert') anl.push('Videoaufzeichnung');
    if (get(d, 'bewertung.manipulation') === 'vermutung') anl.push('gesonderter Vermerk (Manipulationsverdacht)');
    const a1 = anl.length ? 'Dem Vorgang beigefügt bzw. gesondert vorgelegt: ' + joinList(anl) + '.' : 'Gesonderte Berichte oder Anlagen: keine.';
    const crew = crewText(get(d, 'einsatz.kraefte'));
    const a2 = `Eingesetzte Kräfte: ${crew || PH('Kräfte')}${has(e.rufname) ? ' (' + str(e.rufname) + ')' : ''}.`;
    const a3 = has(m.einsatzende) ? `Einsatzende: ${fmtTime(m.einsatzende)}.` : `Einsatzende: ${PH('Uhrzeit')}.`;
    return B(a1, a2, a3);
  }

  /* ---------- Personalien (gesondert, nicht im Berichtstext) ---------- */
  function personalien(d) {
    const rows = [];
    const fmtP = (label, p, extra = []) => {
      p = p || {};
      const g = { m: 'männlich', w: 'weiblich', d: 'divers' }[p.geschlecht] || '';
      const line = [[str(p.nachname).toUpperCase(), str(p.vorname)].filter(Boolean).join(', ') || PH('Name'), has(p.geb) ? 'geb. ' + fmtDate(p.geb) : '', g, str(p.anschrift), has(p.tel) ? 'Tel. ' + str(p.tel) : '', has(p.email) ? str(p.email) : '', ...extra].filter(Boolean).join(' · ');
      rows.push(`${label}: ${line}`);
    };
    const g = get(d, 'gesch') || {};
    fmtP('UB 02 (Geschädigte/r)', g, [has(g.firma) ? 'Halter: ' + str(g.firma) : '']);
    const f = get(d, 'ub02.fz') || {};
    if (get(d, 'ub02.typ') !== 'sache') rows.push(`Fahrzeug UB 02: ${[C.FZ_ART[f.art] ? C.FZ_ART[f.art].n : '', str(f.marke), str(f.modell), str(f.farbe), has(f.kz) ? 'Kz. ' + str(f.kz).toUpperCase() : ''].filter(Boolean).join(' ') || PH('Fahrzeug')}`);
    const pf = get(d, 'ub02.park.fahrer');
    if (get(d, 'ub02.park.abgestelltVon') === 'andere') fmtP('Abstellende Person', pf);
    if (get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja') fmtP('UB 01 (Beschuldigte/r)', get(d, 'taeter.person'));
    const tf = get(d, 'taeter.fz') || {};
    if (get(d, 'taeter.hinweise') === 'ja' && (has(tf.kz) || has(tf.marke))) rows.push(`Fahrzeug UB 01: ${[C.FZ_ART[tf.art] ? C.FZ_ART[tf.art].n : '', str(tf.marke), str(tf.modell), str(tf.farbe), has(tf.kz) ? 'Kz. ' + str(tf.kz).toUpperCase() + (tf.kzFragment ? ' (Fragment)' : '') : ''].filter(Boolean).join(' ')}`);
    arr(get(d, 'zeugen')).forEach((z, i) => fmtP('Z ' + String(i + 1).padStart(2, '0'), z && z.p));
    return rows.join('\n');
  }

  /* ---------- Kurzsachverhalt ---------- */
  function kurz(d) {
    const x = ctx(d);
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const w = num(get(d, 'ub02.wert'));
    const s = [];
    s.push(autoHergang(x, get(d, 'bewertung') || {}));
    if (teile.length) {
      const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
      s.push(`Beschädigt: ${joinList(teile.map(t => t.name))}${farben.length ? '; Fremdlack ' + joinList(farben) : ''}.`);
    }
    if (w != null) s.push(`Sachschaden ca. ${euro(w)}.`);
    if (x.hinweise) {
      const f = x.fz01;
      s.push(`Hinweise auf den Verursacher: ${has(f.art) || has(f.marke) || has(f.kz) ? vehicle(f, 'nom', true).replace(/^(der|die|das) /, '') : 'vorhanden'}${x.ermittelt ? '; Fahrzeugführer ermittelt' : ''}.`);
    } else s.push('Hinweise auf den Verursacher: keine.');
    return s.join(' ');
  }

  /* ---------- Fahndungstext ---------- */
  function fahndung(d) {
    const x = ctx(d);
    if (!x.hinweise) return '';
    const f = x.fz01, pe = get(d, 'taeter.personen') || {}, v = get(d, 'taeter.verhalten') || {};
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const s = [];
    s.push(`Gesucht wird nach einer Verkehrsunfallflucht ${zeitPhrase(d)} ${ortKurz(d)}: ${vehicle(f, 'nom', true)}${has(f.besonderheiten) ? ', ' + str(f.besonderheiten) : ''}.`);
    const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
    if (teile.length) s.push(`Am Verursacherfahrzeug sind frische Schäden${farben.length ? '' : ''} in einer Höhe von ${(() => { const h = teile.map(t => [num(t.von), num(t.bis)]).filter(h => h[0] != null || h[1] != null); if (!h.length) return PH('Höhe'); const a = Math.min(...h.map(q => q[0] ?? q[1])), b = Math.max(...h.map(q => q[1] ?? q[0])); return a === b ? 'ca. ' + a + ' cm' : a + '–' + b + ' cm'; })()} zu erwarten${farben.length ? ' (Eigenlack vermutlich ' + joinList(farben) + ')' : ''}.`);
    if (has(pe.beschreibung) || pe.fahrer) s.push(`Fahrer/in: ${[{ m: 'männlich', w: 'weiblich', u: 'Geschlecht unklar' }[pe.fahrer], str(pe.beschreibung)].filter(Boolean).join(', ')}${num(pe.anzahl) != null ? '; Insassen: ' + num(pe.anzahl) : ''}.`);
    if (has(f.fluchtrichtung)) s.push(`Fluchtrichtung: ${str(f.fluchtrichtung)}.`);
    if (v.alkohol === 'ja') s.push('Hinweis: mögliche Beeinflussung durch Alkohol/Drogen.');
    return s.join(' ');
  }

  /* ---------- Offene Punkte (Checkliste aus den Antworten) ---------- */
  function offen(d) {
    const o = [];
    const m = get(d, 'massnahmen') || {}, e = get(d, 'einsatz') || {}, t = get(d, 'taeter') || {}, s = get(d, 'spuren.fz') || {};
    if (e.aufnahmeort === 'wache' && e.unfallstelleAufgesucht !== 'ja') o.push('Unfallstelle aufsuchen (lassen) – Spurenbild mit Sachverhalt abgleichen (DA 3.1).');
    if (m.unfallmitteilung === 'nachgesandt') o.push('Unfallmitteilung nachsenden; vorher Kurzsachverhalt aus der ViVA-Kurzbeschreibung löschen; Versand im VU-Text vermerken (DA 1.1).');
    if (!has(m.unfallmitteilung) || m.unfallmitteilung === 'keine') o.push('Unfallmitteilung aushändigen bzw. nachsenden (DA 1.1).');
    if (m.lichtbilder !== 'ja') o.push('Lichtbilder fertigen (Übersicht, Detail mit Maßstab) – bei VU-Flucht Pflicht (DA 1.4/1.5).');
    if (m.lichtbilder === 'ja' && m.mappe !== 'ja') o.push('Lichtbildmappe fertigen: PDF unter ViVA-Az. im Ordner „Bildmappen“, Farbausdruck 2 Bilder/Seite zum Vorgang, unterschreiben (DA 1.5).');
    if (s.spurfix !== 'ja' && get(d, 'ub02.typ') !== 'sache') o.push('Spurensicherungsfolie an den Berührungspunkten aufbringen (auch bei Regen sinnvoll), nummerieren und fotografieren.');
    if (s.lackprobe !== 'ja' && arr(get(d, 'ub02.teile')).some(p => p && p.fremdlack === 'ja')) o.push('Fremdlack gesondert sichern (Schneiden/Ausheben, Pergamintüte) – nur so ist eine LKA-Materialuntersuchung möglich.');
    const w = num(get(d, 'ub02.wert'));
    if (w != null && w >= 1300) o.push('Bedeutender Schaden (≥ 1.300 €): Lacksplitter/-anriebe für eine Materialuntersuchung beim LKA vorhalten.');
    if (m.kamera !== 'ja') o.push('Unfallörtlichkeit auf Kameraüberwachung prüfen (Firmen, Tankstellen, Haltestellen, Dashcams).');
    if (m.kameraErgebnis === 'vorhanden' || m.kameraErgebnis === 'angefragt') o.push('Videoaufzeichnungen sichern – Speicherfristen beachten.');
    if (m.zeugensuche !== 'ja') o.push('Aktiv nach Zeugen suchen (Anwohner, Umfeld, Nachbarfahrzeuge mit korrespondierenden Schäden).');
    if (t.hinweise === 'ja') {
      if (has(get(d, 'taeter.fz.kz')) && t.ermittlung && t.ermittlung.halterabfrage !== 'ja') o.push('Halterabfrage zum Kennzeichen durchführen.');
      if (t.ermittlung && t.ermittlung.anschrift === 'spaeter') o.push('Ermittlungen an der Halteranschrift (Fahrzeug in Augenschein nehmen, Schäden vergleichen, Fahrer ermitteln).');
      if (t.ermittlung && t.ermittlung.fahndung !== 'ja') o.push('Fahndung prüfen/einleiten (Nahbereich, Funkfahndung, ggf. Sachfahndung).');
    }
    arr(get(d, 'zeugen')).forEach((z, i) => { if (z && (z.erreichbar === 'telefon' || z.erreichbar === 'spaeter')) o.push(`Zeuge Z ${String(i + 1).padStart(2, '0')} nachträglich kontaktieren und Aussage aufnehmen.`); });
    if (m.asservate === 'ja') o.push('Asservate im AMS erfassen; Verbleib dokumentieren.');
    if (m.anzeige !== 'ja') o.push('Verkehrsunfallanzeige (§ 142 StGB) fertigen; Ordnungsnummern: geparktes Fahrzeug mit „00“ Benutzern, Verursacher UB 01.');
    if (get(d, 'bewertung.manipulation') === 'vermutung') o.push('Gesonderten Vermerk zum Manipulationsverdacht an die Sachbearbeitung fertigen (DA 3.6).');
    if (arr(m.sonstige).indexOf('anschluss') === -1 && t.hinweise === 'ja') o.push('Anschlussermittlungen im VU-Text ausdrücklich vermerken.');
    return o;
  }

  /* ---------- Gesamtbericht ---------- */
  function text(d) {
    const M = massnahmen(d);
    const S = subj(d);
    const sec = [
      ['1', 'Allgemeines'],
      ['1.1', 'Einsatzübernahme', allg1(d)],
      ['1.2', 'Erkenntnislage', allg2(d)],
      ['1.3', 'Eintreffsituation', allg3(d)],
      ['2', 'Objektiver Befund'],
      ['2.1', 'Unfallort', ort(d)],
      ['2.2', 'Spuren auf der Fahrbahn und an sonstigen Gegenständen', spuren(d)],
      ['2.3', get(d, 'ub02.typ') === 'sache' ? 'Beschädigte Sache' : 'Spuren am Fahrzeug UB 02', fz02(d)],
      ...(fz01(d) ? [['2.4', 'Spuren am Fahrzeug UB 01', fz01(d)]] : []),
      ['2.5', 'Hinweise auf den Unfallverursacher', taeter(d)],
      ['3', 'Subjektiver Befund'],
      ['3.1', 'Unfallschilderung der Beteiligten', S.filter((_, i) => i === 0 || (ctx(d).ermittelt && i === 1)).join('\n\n')],
      ['3.2', 'Unfallschilderung der Zeugen', S.slice(ctx(d).ermittelt ? 2 : 1, S.length - (hasDritte(d) ? 1 : 0)).join('\n\n')],
      ['3.3', 'Sonstige Angaben Dritter', hasDritte(d) ? S[S.length - 1] : 'Sonstige Angaben Dritter liegen nicht vor.'],
      ['4', 'Zusammenfassung und eigene Schlussfolgerungen', bewertung(d)],
      ['5', 'Maßnahmen'],
      ['5.1', 'Gefahrenabwehrende / strafprozessuale Maßnahmen', P(M.s1, M.s2) || 'Keine weiteren Maßnahmen.'],
      ['5.2', 'Anforderungen / Benachrichtigungen / weitere Veranlassungen', M.s3 || 'Keine.'],
      ['6', 'Sonstiges', sonst(d)]
    ];
    return sec;
  }
  const hasDritte = d => has(get(d, 'dritte.vorhanden'));
  /** Reiner Text (zum Kopieren) aus den Abschnitten. */
  function plain(d) {
    const sec = text(d);
    const head = `Verkehrsunfallbefundbericht – Verkehrsunfallflucht mit Sachschaden (§ 142 StGB)${has(get(d, 'massnahmen.az')) ? '\nAz.: ' + str(get(d, 'massnahmen.az')) : ''}`;
    return head + '\n\n' + sec.map(([n, t, body]) => body == null ? `${n} ${t}` : `${n} ${t}\n${body}`).join('\n\n');
  }
  /** Vorschau je Schritt – nutzt die Abschnittsfunktion des Schritts. */
  function preview(stepId, d) {
    const st = root.WVUF_STEPS.find(s => s.id === stepId);
    if (!st) return '';
    switch (st.gen) {
      case 'allg1': return allg1(d);
      case 'allg2': return allg2(d);
      case 'allg3': return allg3(d);
      case 'ort': return ort(d);
      case 'spuren': return spuren(d);
      case 'fz02': return fz02(d);
      case 'fz01': return fz01(d);
      case 'taeter': return taeter(d);
      case 'subj': return subj(d).join('\n\n');
      case 'bewertung': return bewertung(d);
      case 'massnahmen': { const M = massnahmen(d); return B(M.s1, M.s2, M.s3); }
      default: return '';
    }
  }
  /** Titel für die Vorgangsliste. */
  function title(d) {
    const o = get(d, 'ort') || {};
    const ortS = [str(o.strasse), str(o.hausnr)].filter(Boolean).join(' ') || str(o.zugehoerigkeit) || '';
    const z = get(d, 'zeit') || {};
    const dat = z.art === 'zeitpunkt' ? fmtDate(z.datum) : z.art === 'zeitraum' ? fmtDate(z.bisDatum || z.vonDatum) : fmtDate(get(d, 'einsatz.datum'));
    return ['VUF', ortS, has(o.stadt) ? str(o.stadt) : '', dat].filter(Boolean).join(' · ') || 'Verkehrsunfallflucht';
  }
  function subtitle(d) {
    const f = get(d, 'ub02.fz') || {};
    const v = [C.FZ_ART[f.art] ? C.FZ_ART[f.art].n : '', str(f.marke), str(f.modell), has(f.kz) ? str(f.kz).toUpperCase() : ''].filter(Boolean).join(' ');
    const h = get(d, 'taeter.hinweise') === 'ja' ? 'mit Hinweisen' : get(d, 'taeter.hinweise') === 'nein' ? 'ohne Hinweise' : '';
    return [v, h].filter(Boolean).join(' · ');
  }

  root.WVUF = Object.freeze({
    id: 'vuf', name: 'Verkehrsunfallflucht ohne Personenschaden', short: 'VUF Sachschaden', kurz: 'VUF',
    steps: root.WVUF_STEPS, text, plain, preview, kurzText: kurz, fahndung, offen, personalien, title, subtitle, ctx
  });
})(typeof window !== 'undefined' ? window : globalThis);
