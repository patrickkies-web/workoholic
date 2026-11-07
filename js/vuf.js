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
    halter: { m: ['der Halter', 'dem Halter', 'den Halter', 'des Halters'], w: ['die Halterin', 'der Halterin', 'die Halterin', 'der Halterin'], d: ['die haltende Person', 'der haltenden Person', 'die haltende Person', 'der haltenden Person'], kurz: 'Halter/in' },
    eigent: { m: ['der Eigentümer', 'dem Eigentümer', 'den Eigentümer', 'des Eigentümers'], w: ['die Eigentümerin', 'der Eigentümerin', 'die Eigentümerin', 'der Eigentümerin'], d: ['die eigentumsberechtigte Person', 'der eigentumsberechtigten Person', 'die eigentumsberechtigte Person', 'der eigentumsberechtigten Person'], kurz: 'Eigentümer/in' }
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
      firstNom: first(0), firstDat: first(1), firstAkk: first(2), firstGen: first(3),
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
  const ART_INDEF = { m: ['ein', 'einem', 'einen', 'eines'], n: ['ein', 'einem', 'ein', 'eines'], w: ['eine', 'einer', 'eine', 'einer'] };
  const GEN_S = { Pkw: 'Pkw', Lkw: 'Lkw', Transporter: 'Transporters', Kraftomnibus: 'Kraftomnibusses', Kraftrad: 'Kraftrads', Motorroller: 'Motorrollers', Fahrrad: 'Fahrrads', Pedelec: 'Pedelecs', Anhänger: 'Anhängers', Wohnmobil: 'Wohnmobils', Fahrzeug: 'Fahrzeugs' };
  /**
   * Fahrzeugphrase. kasus: 'nom'|'dat'|'akk'|'gen'; full → mit Marke/Modell/Farbe/Kennzeichen in Klammern.
   * „der Pkw VW Golf (schwarz, amtl. Kennzeichen ST-AB 123)“ / „dem Pkw“; indef → „ein Pkw …“ / „einen Pkw …“
   */
  function vehicle(fz, kasus = 'nom', full = false, indef = false) {
    fz = fz || {};
    const a = FZ_ART[fz.art] || FZ_ART.sonst;
    const ki = { nom: 0, dat: 1, akk: 2, gen: 3 }[kasus] || 0;
    let noun = a.n; if (ki === 3) noun = GEN_S[noun] || noun;
    let s = (indef ? ART_INDEF : ART_DEF)[a.g][ki] + ' ' + noun;
    if (full) {
      const mm = [str(fz.marke), str(fz.modell)].filter(Boolean).join(' ');
      if (mm) s += ' ' + mm;
      const det = [];
      if (has(fz.farbe)) det.push(low(str(fz.farbe)));
      if (has(fz.kz)) det.push((fz.ausland === 'ja' ? 'ausländisches Kennzeichen ' : 'amtl. Kennzeichen ') + str(fz.kz).toUpperCase() + (fz.kzFragment ? ', unvollständig' : ''));
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
  const VERLAUF_S = { punktuell: ['war punktuell begrenzt', 'waren punktuell begrenzt'], horizontal: ['verlief horizontal', 'verliefen horizontal'], vertikal: ['verlief vertikal', 'verliefen vertikal'], diagonal: ['verlief diagonal', 'verliefen diagonal'], flaechig: ['erstreckte sich flächig', 'erstreckten sich flächig'] };
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
    const von = num(t.von), bis = num(t.bis);
    if (von != null && bis != null && von !== bis) s += ` in einer Höhe von ${Math.min(von, bis)} bis ${Math.max(von, bis)} cm über der Fahrbahnoberfläche`;
    else if (von != null) s += ` in einer Höhe von ca. ${von} cm über der Fahrbahnoberfläche`;
    else if (bis != null) s += ` bis in eine Höhe von ca. ${bis} cm über der Fahrbahnoberfläche`;
    // Verlauf als eigener Satzteil – sonst stapeln sich die Präpositionalgruppen
    const VS = VERLAUF_S[t.verlauf];
    if (VS) s += `; ${plural ? (arten.length === 1 && arten[0].pl && !has(t.artFrei) ? 'die Spuren' : 'die Beschädigungen') : 'die Beschädigung'} ${VS[plural ? 1 : 0]}`;
    const out = [s + '.'];
    if (t.fremdlack === 'ja') out.push(`An der Anstoßstelle wurden Fremdlackanhaftungen${has(t.farbe) ? ' in der Farbe ' + cap(str(t.farbe)) : ''} festgestellt.`);
    else if (t.fremdlack === 'nein') out.push('Fremdlackanhaftungen waren dort nicht erkennbar.');
    const mat = arr(t.material).map(m => MATERIAL[m]).filter(Boolean);
    if (mat.length) out.push(`Zudem ${mat.length > 1 || /^(Kratz|Glass|Holz|mineral)/.test(mat[0]) ? 'hafteten' : 'haftete'} ${joinList(mat)} an.`);
    if (t.alt === 'ja') out.push('Die Beschädigung wies Korrosion bzw. Verschmutzung im Spurenbild auf, sodass es sich hierbei um einen Altschaden handeln dürfte.');
    else if (t.alt === 'moeglich') out.push('Ob es sich hierbei um einen frischen Schaden oder einen Altschaden handelt, konnte vor Ort nicht abschließend beurteilt werden.');
    else if (t.alt === 'nein') out.push('Die Beschädigung stellte sich als frisch dar (blanke Spuren ohne Korrosion oder Verschmutzung).');
    if (has(t.notiz)) out.push(sent(t.notiz));
    return out.join(' ');
  }

  /* ---------- Satzbausteine ----------
   * slot(): Text, der einen vorgegebenen Satzanfang fortsetzt – ohne Schlusspunkt; das erste Wort wird
   *         kleingeschrieben, wenn es kein Substantiv/Name ist („In der zweiten Reihe“ → „in der zweiten Reihe“).
   * sent(): eigenständige Sätze (z. B. Angaben in indirekter Rede) – großer Anfang, Schlusspunkt.
   */
  const SMALL = new Set(('in im ins am an ans auf aus bei beim vor vom von neben hinter zwischen gegenüber unter über mit ohne nach zu zum zur durch für gegen um ' +
    'entlang innerhalb außerhalb unmittelbar direkt ca etwa rund nur lediglich unverändert kurz noch bereits ' +
    'der die das den dem des ein eine einen einem einer eines kein keine keinen keinem zwei drei vier fünf sechs mehrere einige zahlreiche ' +
    'er sie es stand standen lag lagen war waren hatte hatten wurde wurden befand befanden hielt hielten wartete warteten saß saßen ' +
    'ältere älterer älteres älteren frische frischer leichte leichter deutliche deutlicher starke starker starken geringe ' +
    'schwarze schwarzer schwarzes weiße weißer weißes rote roter rotes blaue blauer blaues graue grauer graues silberne silberner silbernes ' +
    'grüne grüner gelbe gelber braune brauner beiger orange ihrer ihrem ihren seiner seinem seinen lediglich teilweise ' +
    'persönlich telefonisch schriftlich mündlich später zuvor zunächst dort hier wenige mehrere frisch frische').split(' '));
  function slot(v) {
    let s = str(v).replace(/\s+/g, ' ').replace(/[\s.;,:]+$/, '');
    const first = (s.match(/^[^\s.,;:()„"]+/) || [''])[0];
    if (/^[A-ZÄÖÜ]/.test(first) && SMALL.has(first.toLowerCase())) s = s.charAt(0).toLowerCase() + s.slice(1);
    return s;
  }
  const sent = v => endDot(cap(str(v).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n')));

  root.WVUF_CORE = { get, str, has, num, cap, low, arr, endDot, quote, numWord, euro, joinList, fmtDate, fmtTime, when, period, PH, person, crewText, vehicle, vehicleG, FZ_ART, KAROSSERIE, SCHADEN, VERLAUF, MATERIAL, partAt, partText, slot, sent };
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Fragenkatalog ======================= */
/*
 * Reihenfolge = Ablauf am Unfallort: erst Einsatz und geschädigte Person (wer, wann, wie erreicht),
 * dann Örtlichkeit, Schaden und Spuren, dann Zeugen und Umfeld (Kameras, Zeugensuche) – daraus ergeben
 * sich die Hinweise auf den Verursacher –, zuletzt Maßnahmen und eigene Bewertung.
 * Jede Frage erscheint nur, wenn sie zum Fall passt (`when`). Eigenschaften dürfen Funktionen sein
 * (d = Antworten, it = Listeneintrag), damit Beschriftungen und Satzanfänge zu Geschlecht und Lage passen.
 * `gen` nennt die Abschnitte des Befundberichts (Anlage 6), die in der Vorschau des Schritts erscheinen.
 */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  const { get, has, arr } = C;
  const JNU = [['ja', 'Ja'], ['nein', 'Nein'], ['unbekannt', 'Unbekannt']];
  const istStrasse = d => get(d, 'ort.art') === 'strasse';
  const istFahrzeug = d => get(d, 'ub02.typ') !== 'sache';
  const geparkt = d => istFahrzeug(d) && get(d, 'ub02.zustand') !== 'fahrend';
  const fahrend = d => istFahrzeug(d) && get(d, 'ub02.zustand') === 'fahrend';
  const hinweise = d => get(d, 'taeter.hinweise') === 'ja';
  const ermittelt = d => hinweise(d) && get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja';
  const fzAngetroffen = d => hinweise(d) && get(d, 'taeter.ermittlung.fzAngetroffen') === 'ja';
  const aufWache = d => get(d, 'einsatz.aufnahmeort') === 'wache';
  const vorOrt = d => !aufWache(d) || get(d, 'einsatz.unfallstelleAufgesucht') === 'ja';
  /** Wie wurde die geschädigte Person erreicht? (ältere Vorgänge: gesch.anwesend) */
  const kontakt = d => get(d, 'gesch.kontakt') || ({ ja: 'vorort', nein: 'telefon' }[get(d, 'gesch.anwesend')] || '');
  const erreicht = d => kontakt(d) !== 'nein';
  const zeugenJa = d => get(d, 'zg.vorhanden') === 'ja' || (get(d, 'zg.vorhanden') !== 'nein' && arr(get(d, 'zeugen')).length > 0);
  const alk = d => get(d, 'taeter.person.alkohol') === 'ja';
  const wert = d => Number(get(d, 'ub02.wert')) || 0;
  const freiModus = d => ['frei', 'beobachtet'].includes(get(d, 'gesch.modus'));

  const ER = g => (g === 'm' ? 'Er' : g === 'w' || g === 'd' ? 'Sie' : 'Er/Sie');
  const erL = g => ER(g).toLowerCase();
  const posse = (g, end) => (g === 'm' ? 'sein' + end : g ? 'ihr' + end : 'sein' + end + '/ihr' + end);
  const gG = d => get(d, 'gesch.geschlecht');
  const gB = d => get(d, 'taeter.person.geschlecht');
  const ZG = it => it && it.p && it.p.geschlecht;
  const geschNom = d => ({ m: 'der Geschädigte', w: 'die Geschädigte', d: 'die geschädigte Person' }[gG(d)] || 'der Geschädigte');
  const geschAkk = d => ({ m: 'den Geschädigten', w: 'die Geschädigte', d: 'die geschädigte Person' }[gG(d)] || 'den Geschädigten');
  const geschGen = d => ({ m: 'des Geschädigten', w: 'der Geschädigten', d: 'der geschädigten Person' }[gG(d)] || 'des Geschädigten');
  const beschDat = d => ({ m: 'dem Beschuldigten', w: 'der Beschuldigten' }[gB(d)] || 'der beschuldigten Person');
  /** Fahrzeugführer laut Hinweisgebern – „nicht sicher“/leer → neutral. */
  const fahrerG = d => get(d, 'taeter.personen.fahrer');
  const fahrerNom = d => ({ m: 'Der Fahrzeugführer', w: 'Die Fahrzeugführerin' }[fahrerG(d)] || 'Die fahrzeugführende Person');
  const fahrerKl = d => fahrerNom(d).replace(/^D/, 'd');
  const fahrerEr = d => (fahrerG(d) === 'm' ? 'er' : 'sie');
  function asservatVorschlag(d) {
    const s = get(d, 'spuren.fz') || {}, t = get(d, 'taeter') || {}, a = [];
    const n = Number(s.spurfixAnzahl) || 0;
    if (s.spurfix === 'ja') a.push(n === 1 ? 'eine Spurfix-Folie' : (n ? C.numWord(n, true) + ' ' : '') + 'Spurfix-Folien');
    if (s.lackprobe === 'ja') a.push('eine Pergamintüte mit Fremdlackanrieb');
    if (s.eigenlack === 'ja') a.push('eine Vergleichsprobe des Eigenlacks');
    if (s.fremdteile === 'ja' && s.fremdteileSicher === 'ja') a.push('die aufgefundenen Fremdteile');
    if (t.spurfix === 'ja') a.push('eine Spurfix-Folie vom Verursacherfahrzeug');
    if (t.lackprobe === 'ja') a.push('eine Lackprobe des Verursacherfahrzeugs');
    return C.joinList(a);
  }

  const GRADE = ['PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'KA', 'KAin', 'PR', 'PRin', 'EPHK', 'EPHKin'];
  const PERSON_FIELDS = ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift', 'tel', 'email'];
  const N2 = i => String(i + 1).padStart(2, '0');

  const STEPS = [
    /* ---------- Phase 1: Einsatz ---------- */
    {
      id: 'lage', phase: 'Einsatz', title: 'Worum geht es?', lead: 'Ein paar kurze Antworten – danach fragt der Assistent nur noch, was zu deinem Fall passt.', gen: ['kurz'],
      fields: [
        { k: 'ort.art', t: 'choice', l: 'Wo ist es passiert?', req: true, o: [['strasse', 'Auf einer Straße'], ['parkplatz', 'Auf einem Parkplatz'], ['parkhaus', 'Parkhaus / Tiefgarage'], ['sonst', 'Sonstige Fläche']] },
        { k: 'ub02.typ', t: 'choice', l: 'Was wurde beschädigt?', req: true, o: [['fahrzeug', 'Ein Fahrzeug'], ['sache', 'Eine Sache (Zaun, Poller, Verkehrszeichen …)']] },
        { k: 'ub02.zustand', t: 'choice', l: 'Das beschädigte Fahrzeug war …', o: [['geparkt', 'abgestellt / geparkt'], ['fahrend', 'im fließenden Verkehr']], when: istFahrzeug },
        { k: 'taeter.hinweise', t: 'yn', l: 'Gibt es Hinweise auf den Verursacher?', h: 'Zeugen, Kennzeichen, Zettel, Video, Fahrzeugteile, Selbstmeldung … – lässt sich später jederzeit ändern.' },
        { k: 'einsatz.aufnahmeort', t: 'choice', l: 'Wo nimmst du auf?', o: [['unfallort', 'Am Unfallort'], ['wache', 'Auf der Wache (Protokoll)']] }
      ]
    },
    {
      id: 'einsatz', phase: 'Einsatz', title: 'Einsatzübernahme & Erkenntnislage', lead: 'Wann und auf welchem Weg kam der Einsatz – und was war zu dem Zeitpunkt bekannt?', gen: ['1.1', '1.2'],
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', req: true },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit der Einsatzübernahme', w: 'half', q: 'jetzt', req: true },
        { k: 'einsatz.meldeweg', t: 'choice', l: 'Meldeweg', o: [['leitstelle', 'Leitstelle / Funk'], ['telefon', 'Telefonisch bei der Wache'], ['wache', 'Persönlich auf der Wache'], ['streife', 'Eigene Feststellung auf Streife'], ['online', 'Online-Anzeige']] },
        { t: 'info', when: d => get(d, 'einsatz.meldeweg') === 'online', text: 'DA 3.1: Der Verweis auf eine Online-Anzeige oder das Aufsuchen einer Wache ist bei einer Verkehrsunfallflucht ungeeignet – ein Einsatzmittel ist zur Unfallstelle zu entsenden.' },
        { k: 'einsatz.mitteiler', t: 'choice', l: 'Wer hat den Unfall gemeldet?', o: [['gesch', 'Geschädigte/r selbst'], ['zeuge', 'Zeuge/Zeugin'], ['dritte', 'Dritte (Anwohner, Firma …)'], ['unbekannt', 'Unbekannt']], when: d => get(d, 'einsatz.meldeweg') !== 'streife' },
        { k: 'einsatz.erkenntnis', t: 'area', rows: 2, l: 'Was wurde gemeldet? (Telegrammstil)', pre: 'Sachverhalt:', ph: d => (istFahrzeug(d) ? (fahrend(d) ? 'Pkw im fließenden Verkehr angefahren' : 'geparkter Pkw beschädigt') : 'Zaun beschädigt') + ', Verursacher ' + (hinweise(d) ? 'mit Kennzeichen bekannt' : 'unbekannt') + (get(d, 'einsatz.mitteiler') === 'zeuge' ? ', Zeugin vor Ort' : '') },
        { k: 'einsatz.anfahrt', t: 'text', l: 'Feststellungen während der Anfahrt (optional)', pre: 'Während der Anfahrt', ph: 'wurden keine unfallbezogenen Feststellungen gemacht', sugg: [['Keine Feststellungen', 'wurden keine unfallbezogenen Feststellungen gemacht'], ['Kein flüchtiges Fahrzeug', 'wurde kein flüchtiges Fahrzeug festgestellt']], when: d => !aufWache(d) },
        { k: 'einsatz.unfallstelleAufgesucht', t: 'yn', l: 'Wurde die Unfallstelle (nachträglich) aufgesucht?', h: 'DA 3.1: Auch nach einer Protokollaufnahme ist die Unfallstelle aufzusuchen, um Sachverhalt und Spurenbild abzugleichen.', when: aufWache }
      ]
    },
    {
      id: 'kraefte', phase: 'Einsatz', title: 'Eingesetzte Kräfte', lead: 'Wer hat aufgenommen? Ein Tipp übernimmt die Besatzung vom letzten Vorgang.', gen: ['1.1', '6.2'],
      fields: [
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half', recent: true },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Beamtinnen und Beamte', grade: GRADE, max: 6 },
        { k: 'einsatz.eintreffZeit', t: 'time', l: 'Eintreffzeit am Unfallort', w: 'half', q: 'jetzt', when: vorOrt }
      ]
    },

    /* ---------- Phase 2: Geschädigte ---------- */
    {
      id: 'gesch', phase: 'Geschädigte', title: 'Geschädigte Person (UB 02)', lead: 'Zuerst: Hast du die Person erreicht? Danach passen alle Fragen und Satzvorschläge – auch zum Geschlecht.', gen: ['3.1'],
      fields: [
        { k: 'gesch.kontakt', t: 'choice', l: 'Hast du die geschädigte Person erreicht?', req: true, o: d => [[aufWache(d) ? 'wache' : 'vorort', aufWache(d) ? 'Ja, auf der Wache' : 'Ja, vor Ort'], ['telefon', 'Ja, telefonisch'], ['nein', 'Nein, nicht erreicht']] },
        { t: 'info', when: d => kontakt(d) === 'nein', text: d => (istFahrzeug(d) ? 'Dann die Daten aus der Halterabfrage eintragen.' : 'Dann die Daten der Eigentümerin bzw. des Eigentümers eintragen, soweit bekannt.') + ' Benachrichtigung und Unfallmitteilung erscheinen automatisch in den offenen Punkten.' },
        { k: 'gesch', t: 'person', l: d => (kontakt(d) === 'nein' ? (istFahrzeug(d) ? 'Halter/in laut Halterabfrage' : 'Eigentümer/in bzw. zuständige Stelle') : 'Geschädigte/r'), fields: PERSON_FIELDS },
        { k: 'gesch.rolle', t: 'choice', l: d => (istFahrzeug(d) ? 'Stellung zum Fahrzeug' : 'Stellung zur Sache'), o: d => (istFahrzeug(d) ? [['halterfahrer', 'Halter/in und Fahrer/in'], ['halter', 'Halter/in'], ['fahrer', 'Fahrer/in, nicht Halter/in'], ['nutzer', 'Nutzungsberechtigt (Firma, Miete)']] : [['eigentuemer', 'Eigentümer/in'], ['zustaendig', 'Zuständig (Firma, Behörde, Verwaltung)']]), when: d => erreicht(d) || !istFahrzeug(d) },
        { k: 'gesch.firma', t: 'text', l: d => (get(d, 'gesch.rolle') === 'zustaendig' ? 'Wem gehört die Sache?' : 'Wer ist Halter?'), pre: d => (get(d, 'gesch.rolle') === 'zustaendig' ? 'Eigentümer der Sache ist' : 'Halter des Fahrzeugs ist'), ph: d => (get(d, 'gesch.rolle') === 'zustaendig' ? 'die Stadt Steinfurt' : 'die Musterbau GmbH, Steinfurt'), when: d => erreicht(d) && ['fahrer', 'nutzer', 'zustaendig'].includes(get(d, 'gesch.rolle')) },
        { k: 'gesch.benachrichtigung', t: 'multi', l: 'Wie wird die Person informiert?', o: d => [['zettel', istFahrzeug(d) ? 'Nachricht am Fahrzeug' : 'Nachricht vor Ort'], ['nachbar', 'Über Nachbarn / Anwohner'], ['telefon', 'Anruf versucht'], ['schriftlich', 'Schriftlich per Post']], when: d => kontakt(d) === 'nein' }
      ]
    },
    {
      id: 'zeit', phase: 'Geschädigte', title: 'Unfallzeit', lead: d => (geparkt(d) ? 'Wann wurde das Fahrzeug abgestellt – und wann wurde der Schaden bemerkt?' : 'Wann hat sich der Unfall ereignet?'), gen: ['kurz'],
      fields: [
        { k: 'zeit.art', t: 'choice', l: 'Angabe', req: true, o: d => (geparkt(d) ? [['zeitraum', 'Zeitraum (abgestellt → bemerkt)'], ['zeitpunkt', 'Genauer Zeitpunkt bekannt'], ['unbekannt', 'Unbekannt']] : [['zeitpunkt', 'Zeitpunkt'], ['zeitraum', 'Zeitraum'], ['unbekannt', 'Unbekannt']]) },
        { k: 'zeit.vonDatum', t: 'date', l: d => (geparkt(d) ? 'Abgestellt am' : 'Von (Datum)'), w: 'half', q: 'gestern', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.vonZeit', t: 'time', l: d => (geparkt(d) ? 'um (Uhrzeit)' : 'Von (Uhrzeit)'), w: 'half', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.bisDatum', t: 'date', l: d => (geparkt(d) ? 'Schaden bemerkt am' : 'Bis (Datum)'), w: 'half', q: 'heute', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.bisZeit', t: 'time', l: d => (geparkt(d) ? 'um (Uhrzeit)' : 'Bis (Uhrzeit)'), w: 'half', q: 'jetzt', when: d => get(d, 'zeit.art') === 'zeitraum' },
        { k: 'zeit.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', when: d => get(d, 'zeit.art') === 'zeitpunkt' },
        { k: 'zeit.zeit', t: 'time', l: 'Uhrzeit (ca.)', w: 'half', q: 'jetzt', when: d => get(d, 'zeit.art') === 'zeitpunkt' }
      ]
    },
    {
      id: 'geschangaben', phase: 'Geschädigte', title: d => 'Angaben ' + geschGen(d), lead: 'Fragebogen Anlage 2, Fragen 8–11. Aus den Antworten entsteht ein Textbaustein – eigene Worte gehen immer.', gen: ['3.1'], when: erreicht,
      fields: [
        { k: 'gesch.belehrt', t: 'yn', l: 'Zeugenschaftlich belehrt?', w: 'half' },
        { k: 'gesch.belehrtVon', t: 'crewpick', l: 'Belehrt durch', w: 'half', when: d => get(d, 'gesch.belehrt') === 'ja' },
        { k: 'gesch.aufmerksam', t: 'choice', l: d => 'Wie wurde ' + geschNom(d) + ' auf den Schaden aufmerksam?', o: d => [['selbst', geparkt(d) ? 'Bei der Rückkehr selbst bemerkt' : 'Selbst bemerkt'], ['zeuge', 'Durch einen Zeugen'], ['nachbar', 'Durch Nachbarn / Anwohner'], ...(istFahrzeug(d) ? [['zettel', 'Durch einen Zettel am Fahrzeug']] : []), ['geraeusch', 'Anstoßgeräusch gehört'], ['beobachtet', 'Unfall selbst beobachtet']], when: d => !fahrend(d) },
        { k: 'gesch.standort', t: 'text', l: d => 'Wo war ' + geschNom(d) + ' zum Unfallzeitpunkt?', pre: d => 'Zum Unfallzeitpunkt habe ' + erL(gG(d)) + ' sich', post: 'befunden.', ph: 'in einem nahegelegenen Geschäft', sugg: d => [['Wohnung', 'in ' + posse(gG(d), 'er') + ' Wohnung'], ['Arbeit', 'an ' + posse(gG(d), 'em') + ' Arbeitsplatz'], ['Geschäft', 'in einem nahegelegenen Geschäft'], ['unbekannt', 'an einem anderen Ort']], when: d => !fahrend(d) },
        { k: 'gesch.sichtkontakt', t: 'yn', l: 'Sichtkontakt zum Fahrzeug?', w: 'half', when: d => geparkt(d) && has(get(d, 'gesch.standort')) },
        { k: 'gesch.modus', t: 'choice', l: 'Wie soll die Schilderung entstehen?', h: 'Ohne Auswahl nimmt der Bericht den Textbaustein. „Unfall selbst beobachtet“ braucht eigene Worte.', o: d => [[geparkt(d) ? 'abgestellt' : 'kurz', 'Textbaustein aus den Antworten'], ['frei', 'Eigene Schilderung (indirekte Rede)']] },
        { k: 'gesch.zwischenzeit', t: 'yn', l: 'Hat die Person das Fahrzeug zwischendurch gesehen (Zwischenkontrolle)?', when: d => geparkt(d) && !freiModus(d) },
        { k: 'gesch.zwischenzeitText', t: 'area', rows: 2, l: 'Was wurde dabei festgestellt?', pre: d => 'In der Zwischenzeit habe ' + erL(gG(d)) + ' Folgendes festgestellt:', ph: 'Gegen 12:00 Uhr sei das Fahrzeug noch unbeschädigt gewesen.', lint: 'konj', when: d => get(d, 'gesch.zwischenzeit') === 'ja' && !freiModus(d) },
        { k: 'gesch.freitext', t: 'area', l: 'Was hat die Person geschildert? (indirekte Rede)', pre: d => ER(gG(d)) + ' gab sinngemäß Folgendes an:', ph: d => (get(d, 'gesch.aufmerksam') === 'beobachtet' || fahrend(d) ? ER(gG(d)) + ' habe an der roten Ampel gewartet, als ' + erL(gG(d)) + ' plötzlich einen Stoß von hinten gespürt habe. Der Pkw dahinter sei anschließend davongefahren.' : ER(gG(d)) + ' habe das Fahrzeug am Vormittag abgestellt und am Nachmittag beschädigt vorgefunden.'), lint: 'konj', rows: 4, when: freiModus },
        { k: 'gesch.ergaenzung', t: 'area', rows: 2, l: 'Ergänzende Angaben (optional, indirekte Rede)', ph: d => ER(gG(d)) + ' habe das Fahrzeug erst vor zwei Wochen neu lackieren lassen.', lint: 'konj', when: d => !freiModus(d) },
        { k: 'gesch.schaden', t: 'euro', l: 'Schadenshöhe nach eigener Schätzung (€)', q: [300, 500, 1000, 2000], step: 100, min: 0 },
        { k: 'gesch.altschaden', t: 'choice', l: 'Könnte es sich teilweise um Altschäden handeln (eigene Angabe)?', o: [['nein', 'Nein'], ['ja', 'Ja'], ['unsicher', 'Nicht sicher']], when: istFahrzeug },
        { k: 'gesch.fragebogen', t: 'choice', l: 'Fragebogen zur Verkehrsunfallflucht', o: [['ausgefuellt', 'ausgefüllt, liegt bei'], ['ausgehaendigt', 'ausgehändigt, kommt zurück'], ['nein', 'nicht verwendet']] }
      ]
    },

    /* ---------- Phase 3: Unfallort ---------- */
    {
      id: 'eintreff', phase: 'Unfallort', title: 'Eintreffsituation', lead: 'Was hast du beim Eintreffen vorgefunden? Personen, Fahrzeuge, Veränderungen.', gen: ['1.3'], when: vorOrt,
      fields: [
        { k: 'spuren.eintreff.text', t: 'area', rows: 2, l: 'Was wurde beim Eintreffen vorgefunden?', pre: d => 'Beim Eintreffen' + (has(get(d, 'einsatz.eintreffZeit')) ? ' um ' + get(d, 'einsatz.eintreffZeit') + ' Uhr' : ''), ph: d => (istFahrzeug(d) ? (geparkt(d) ? 'stand das Fahrzeug unverändert am Abstellort' : 'standen die Fahrzeuge am Fahrbahnrand') : 'war die beschädigte Sache unverändert') + '; ' + (['vorort', 'wache'].includes(kontakt(d)) ? geschNom(d) + ' wartete vor Ort' : 'Personen waren nicht anwesend') },
        { k: 'spuren.eintreff.veraendert', t: 'yn', l: 'Wurde die Unfallstelle vor dem Eintreffen verändert?', h: 'z. B. Fahrzeug umgesetzt, Teile aufgesammelt, Regen' },
        { k: 'spuren.eintreff.veraendertText', t: 'text', l: 'Was wurde verändert?', pre: 'Vor dem Eintreffen', ph: d => 'hatte ' + geschNom(d) + ' Fahrzeugteile aufgesammelt', sugg: d => [['Teile aufgesammelt', 'hatte ' + geschNom(d) + ' Fahrzeugteile aufgesammelt'], ['Fahrzeug umgesetzt', 'hatte ' + geschNom(d) + ' das Fahrzeug umgesetzt'], ['Regen', 'hatte Regen die Spuren teilweise verwischt']], when: d => get(d, 'spuren.eintreff.veraendert') === 'ja' },
        { k: 'spuren.eintreff.fotos', t: 'yn', l: 'Übersichtsaufnahmen der Eintreffsituation gefertigt?' }
      ]
    },
    {
      id: 'ort', phase: 'Unfallort', title: 'Unfallörtlichkeit', lead: 'Wo genau hat sich der Unfall ereignet?', gen: ['2.1'],
      fields: [
        { k: 'ort.strasse', t: 'text', l: 'Straße', ph: 'z. B. Bahnhofstraße', w: 'half', req: true },
        { k: 'ort.hausnr', t: 'text', l: 'Hausnummer', ph: '12', w: 'half', h: 'Nur die Nummer – „in Höhe der Hausnummer“ ergänzt der Bericht.' },
        { k: 'ort.plz', t: 'text', l: 'PLZ', ph: '48565', w: 'half', inputmode: 'numeric' },
        { k: 'ort.stadt', t: 'text', l: 'Ort', ph: 'Steinfurt', w: 'half', req: true, recent: ['ort.plz', 'ort.stadt'] },
        { k: 'ort.ortsteil', t: 'text', l: 'Ortsteil (optional)', ph: 'z. B. Borghorst', w: 'half' },
        { k: 'ort.lage', t: 'choice', l: 'Lage', w: 'half', o: [['innerorts', 'innerorts'], ['ausserorts', 'außerorts']], when: istStrasse },
        { k: 'ort.strassentyp', t: 'choice', l: 'Straßenart', o: [['gemeinde', 'Gemeindestraße'], ['kreis', 'Kreisstraße'], ['land', 'Landesstraße'], ['bundes', 'Bundesstraße'], ['bab', 'Autobahn']], when: istStrasse },
        { k: 'ort.zugehoerigkeit', t: 'text', l: 'Zu wem gehört die Fläche?', pre: d => 'Bei der Unfallörtlichkeit handelt es sich um ' + ({ parkhaus: 'das Parkhaus', parkplatz: 'den Parkplatz' }[get(d, 'ort.art')] || 'die Verkehrsfläche'), ph: d => ({ parkhaus: 'des Einkaufszentrums „Stadtgalerie“', parkplatz: 'des REWE-Marktes' }[get(d, 'ort.art')] || 'vor dem Rathaus'), h: 'Genitiv („des …“) oder Ortsangabe („vor dem …“) – die Adresse hängt der Bericht selbst an.', when: d => !istStrasse(d) },
        { k: 'ort.oeffentlich', t: 'choice', l: 'Für jedermann zugänglich (öffentlicher Verkehrsraum)?', h: '§ 142 StGB setzt einen Unfall im öffentlichen Verkehrsraum voraus. Auch Privatflächen zählen, wenn sie tatsächlich für jedermann zugänglich sind.', o: [['ja', 'Ja, frei zugänglich'], ['nein', 'Nein (Schranke, Tor, nur Berechtigte)'], ['unklar', 'Zu prüfen']], when: d => !istStrasse(d) },
        { k: 'ort.position', t: 'text', l: 'Genaue Lage der Unfallstelle', pre: 'Die Unfallstelle befindet sich', ph: d => (istStrasse(d) ? 'am rechten Fahrbahnrand in Fahrtrichtung Norden' : 'in der zweiten Parkreihe von Norden, Stellplatz 14'), sugg: d => (istStrasse(d) ? [['rechter Fahrbahnrand', 'am rechten Fahrbahnrand '], ['linker Fahrbahnrand', 'am linken Fahrbahnrand '], ['Einmündung', 'im Einmündungsbereich '], ['Parkbucht', 'in einer Parkbucht ']] : [['Parkreihe', 'in der Parkreihe '], ['Einfahrt', 'im Bereich der Einfahrt '], ['Stellplatz', 'auf dem Stellplatz Nr. ']]) },
        { k: 'ort.ortSicher', t: 'choice', l: d => 'Wie sicher ist die Ortsangabe ' + geschGen(d) + '?', w: 'half', o: [['sicher', 'Sicher'], ['unsicher', 'Nicht sicher']], when: erreicht }
      ]
    },
    {
      id: 'strasse', phase: 'Unfallort', title: 'Straße & Verkehrsregelung', lead: 'Wie ist die Straße an der Unfallstelle beschaffen?', gen: ['2.1'], when: istStrasse,
      fields: [
        { k: 'ort.tempo', t: 'number', l: 'Zulässige Höchstgeschwindigkeit (km/h)', q: [30, 50, 70, 100], w: 'half', min: 5, max: 130, step: 10 },
        { k: 'ort.tempoGrund', t: 'choice', l: 'Grundlage', o: [['vz274', 'Zeichen 274'], ['zone', 'Zone (Zeichen 274.1)'], ['ortschaft', 'Geschlossene Ortschaft'], ['bereich', 'Verkehrsberuhigter Bereich']], when: d => has(get(d, 'ort.tempo')) },
        { k: 'ort.fahrstreifen', t: 'number', l: 'Fahrstreifen je Richtung', q: [1, 2], w: 'half', min: 1, max: 6, step: 1 },
        { k: 'ort.trennung', t: 'choice', l: 'Trennung der Fahrtrichtungen', o: [['keine', 'keine Markierung'], ['leitlinie', 'unterbrochene Leitlinie'], ['mittellinie', 'durchgezogene Linie'], ['doppel', 'doppelte durchgezogene Linie'], ['mittelstreifen', 'baulicher Mittelstreifen']] },
        { k: 'ort.parkordnung', t: 'choice', l: 'Parken am Fahrbahnrand', o: [['laengs', 'Längsparken'], ['quer', 'Querparken'], ['schraeg', 'Schrägparken'], ['bucht', 'Parkbuchten'], ['verbot', 'Parkverbot']] },
        { k: 'ort.verlauf', t: 'choice', l: 'Streckenverlauf', w: 'half', o: [['gerade', 'gerade'], ['links', 'Linkskurve'], ['rechts', 'Rechtskurve'], ['kreuzung', 'Kreuzung / Einmündung']] },
        { k: 'ort.steigung', t: 'choice', l: 'Höhenprofil', w: 'half', o: [['eben', 'eben'], ['gefaelle', 'Gefälle'], ['steigung', 'Steigung']] },
        { k: 'ort.fahrtrichtung', t: 'text', l: 'Bezugs-Fahrtrichtung', pre: 'bezogen auf die Fahrtrichtung', ph: 'Burgsteinfurt' },
        { k: 'ort.besonderheiten', t: 'multi', l: 'Besonderheiten', o: [['engstelle', 'Engstelle'], ['baustelle', 'Arbeitsstelle'], ['kuppe', 'Kuppe'], ['bushalt', 'Bushaltestelle'], ['fgue', 'Fußgängerüberweg'], ['radweg', 'Radverkehrsanlage'], ['einbahn', 'Einbahnstraße'], ['spielstr', 'Verkehrsberuhigter Bereich']] },
        { k: 'ort.verkehr', t: 'choice', l: 'Verkehrsaufkommen bei der Aufnahme', w: 'half', o: [['gering', 'gering'], ['maessig', 'mäßig'], ['stark', 'stark'], ['stau', 'zähfließend / Stau']] }
      ]
    },
    {
      id: 'verhaeltnisse', phase: 'Unfallort', title: 'Fahrbahn, Licht & Wetter', lead: 'Wie waren die Verhältnisse bei der Aufnahme?', gen: ['2.1'],
      fields: [
        { k: 'ort.belag', t: 'choice', l: 'Belag', o: [['asphalt', 'Asphalt'], ['beton', 'Beton'], ['pflaster', 'Pflaster'], ['kopfstein', 'Kopfsteinpflaster'], ['schotter', 'Schotter / unbefestigt']] },
        { k: 'ort.fahrbahn', t: 'choice', l: 'Zustand', o: [['trocken', 'trocken'], ['feucht', 'feucht'], ['nass', 'nass'], ['laub', 'mit Laub / verschmutzt'], ['schnee', 'schneebedeckt'], ['eis', 'vereist']] },
        { k: 'ort.licht', t: 'choice', l: 'Lichtverhältnisse', w: 'half', o: [['tag', 'Tageslicht'], ['daemmerung', 'Dämmerung'], ['dunkel', 'Dunkelheit']] },
        { k: 'ort.beleuchtung', t: 'choice', l: 'Straßen-/Platzbeleuchtung', w: 'half', o: [['betrieb', 'in Betrieb'], ['aus', 'vorhanden, aus'], ['keine', 'nicht vorhanden']], when: d => has(get(d, 'ort.licht')) && get(d, 'ort.licht') !== 'tag' },
        { k: 'ort.wetter', t: 'choice', l: 'Witterung', o: [['trocken', 'trocken'], ['regen', 'Regen'], ['nieselregen', 'Nieselregen'], ['schnee', 'Schneefall'], ['nebel', 'Nebel'], ['sonne', 'tiefstehende Sonne']] },
        { k: 'ort.sicht', t: 'choice', l: 'Sichtverhältnisse', w: 'half', o: [['gut', 'gut'], ['eingeschraenkt', 'eingeschränkt'], ['schlecht', 'schlecht']] },
        { k: 'ort.sichtbehinderung', t: 'text', l: 'Wodurch war die Sicht eingeschränkt?', pre: 'Die Sicht war eingeschränkt durch', ph: 'am Fahrbahnrand geparkte Fahrzeuge', sugg: [['geparkte Fahrzeuge', 'am Fahrbahnrand geparkte Fahrzeuge'], ['Bewuchs', 'Randbewuchs'], ['tiefe Sonne', 'die tiefstehende Sonne'], ['Regen', 'starken Regen']], when: d => ['eingeschraenkt', 'schlecht'].includes(get(d, 'ort.sicht')) }
      ]
    },

    /* ---------- Phase 4: Schaden ---------- */
    {
      id: 'ub02', phase: 'Schaden', title: d => (istFahrzeug(d) ? 'Beschädigtes Fahrzeug (UB 02)' : 'Beschädigte Sache'), lead: d => (istFahrzeug(d) ? 'Art, Marke, Farbe und Kennzeichen' : 'Was genau wurde beschädigt?'), gen: d => (istFahrzeug(d) ? ['2.3'] : ['2.5']),
      fields: [
        { k: 'ub02.sache', t: 'text', l: 'Was wurde beschädigt?', pre: 'Bei der beschädigten Sache handelt es sich um', ph: 'einen Gartenzaun aus Holz (Grundstück Bahnhofstraße 12)', h: 'Mit Artikel im Akkusativ („einen …“, „ein …“, „eine …“) – so passt es auch in den Hergang.', sugg: [['Zaun', 'einen Zaun '], ['Poller', 'einen Poller '], ['Verkehrszeichen', 'ein Verkehrszeichen '], ['Laterne', 'eine Straßenlaterne '], ['Mauer', 'eine Mauer ']], when: d => !istFahrzeug(d) },
        { k: 'ub02.fz', t: 'vehicle', l: 'Fahrzeug UB 02', when: istFahrzeug }
      ]
    },
    {
      id: 'park', phase: 'Schaden', title: 'Wie war das Fahrzeug abgestellt?', lead: 'Fragebogen Anlage 2, Fragen 5–7', gen: ['2.3'], when: geparkt,
      fields: [
        { k: 'ub02.park.ordnung', t: 'choice', l: 'Parkposition', o: [['laengs', 'längs am Fahrbahnrand'], ['quer', 'quer'], ['schraeg', 'schräg'], ['bucht', 'in einer Parkbucht'], ['stellplatz', 'auf einem markierten Stellplatz'], ['frei', 'frei auf der Fläche']] },
        { k: 'ub02.park.richtung', t: 'choice', l: 'Eingeparkt', w: 'half', o: [['vorwaerts', 'vorwärts'], ['rueckwaerts', 'rückwärts']] },
        { k: 'ub02.park.seite', t: 'choice', l: 'Fahrbahnseite', w: 'half', o: [['rechts', 'rechter Fahrbahnrand'], ['links', 'linker Fahrbahnrand']], when: istStrasse },
        { k: 'ub02.park.abgestelltVon', t: 'choice', l: 'Wer hat das Fahrzeug abgestellt?', o: d => [['gesch', erreicht(d) ? 'Geschädigte/r selbst' : 'Halter/in selbst'], ['andere', 'Eine andere Person'], ...(erreicht(d) ? [] : [['unbekannt', 'Unbekannt']])] },
        { k: 'ub02.park.fahrer', t: 'person', l: 'Person, die das Fahrzeug abgestellt hat', fields: ['geschlecht', 'nachname', 'vorname', 'tel'], when: d => get(d, 'ub02.park.abgestelltVon') === 'andere' },
        { k: 'ub02.park.beladen', t: 'yn', l: 'War das Fahrzeug beladen oder besetzt?', w: 'half' },
        { k: 'ub02.park.beladenText', t: 'text', l: 'Womit / mit wem?', pre: 'Das Fahrzeug war', ph: 'mit Einkäufen beladen', sugg: [['Einkäufe', 'mit Einkäufen beladen'], ['Person', 'mit einer Person besetzt'], ['Werkzeug', 'mit Werkzeug beladen']], when: d => get(d, 'ub02.park.beladen') === 'ja' }
      ]
    },
    {
      id: 'fahrt', phase: 'Schaden', title: 'Fahrvorgang', lead: 'Was tat das beschädigte Fahrzeug gerade?', gen: ['2.3'], when: fahrend,
      fields: [
        { k: 'ub02.fahrt.vorgang', t: 'choice', l: 'Vorgang', o: [['geradeaus', 'Geradeausfahrt'], ['warten', 'Warten (Ampel, Stau)'], ['abbiegen', 'Abbiegen'], ['ueberholen', 'Überholen / Vorbeifahren'], ['einparken', 'Einparken'], ['ausparken', 'Ausparken'], ['kreisverkehr', 'Kreisverkehr']] },
        { k: 'ub02.fahrt.richtung', t: 'text', l: 'Fahrtrichtung', pre: 'in Fahrtrichtung', ph: 'Emsdetten' },
        { k: 'ub02.fahrt.tempo', t: 'number', l: 'Geschwindigkeit ca. (km/h)', w: 'half', q: [0, 10, 30, 50], min: 0, max: 200, step: 5, when: d => get(d, 'ub02.fahrt.vorgang') !== 'warten' },
        { k: 'ub02.fahrt.text', t: 'area', l: 'Kurzbeschreibung des Vorgangs (ganze Sätze, Präteritum)', ph: 'Das Kraftrad wartete an der roten Ampel, als ein nachfolgender Pkw auffuhr.', rows: 3 }
      ]
    },
    {
      id: 'teile02', phase: 'Schaden', title: 'Schadensbild', lead: 'Welche Fahrzeugteile sind beschädigt? Antippen – danach erscheinen die Details je Teil.', gen: ['2.3'], when: istFahrzeug,
      fields: [{ k: 'ub02.teile', t: 'parts', l: 'Beschädigte Fahrzeugteile' }]
    },
    {
      id: 'sache02', phase: 'Schaden', title: 'Schadensbild an der Sache', lead: 'Wie sieht der Schaden aus?', gen: ['2.5'], when: d => !istFahrzeug(d),
      fields: [
        { k: 'ub02.sacheSchaden', t: 'area', rows: 2, l: 'Wie sieht die Beschädigung aus?', pre: 'An der Sache', ph: 'waren zwei Zaunfelder eingedrückt und ein Pfosten geknickt; die Anstoßhöhe lag bei ca. 30 bis 70 cm' },
        { k: 'ub02.sacheFremdlack', t: 'yn', l: 'Fremdlack oder Fremdmaterial an der Anstoßstelle?' },
        { k: 'ub02.sacheFarbe', t: 'text', l: 'Welches Fremdmaterial?', pre: 'An der Anstoßstelle fand sich', ph: 'silberner Lackabrieb', sugg: [['schwarzer Lack', 'schwarzer Lackabrieb'], ['weißer Lack', 'weißer Lackabrieb'], ['silberner Lack', 'silberner Lackabrieb'], ['Kunststoff', 'schwarzer Kunststoffabrieb']], when: d => get(d, 'ub02.sacheFremdlack') === 'ja' },
        { k: 'ub02.sacheEigentuemer', t: 'text', l: 'Wem gehört die Sache?', pre: 'Eigentümer bzw. zuständig ist', ph: 'die Stadt Steinfurt', sugg: [['Kommune', 'die Stadt bzw. Gemeinde '], ['Kreis', 'der Kreis als Straßenbaulastträger'], ['Straßen.NRW', 'der Landesbetrieb Straßen.NRW']], when: d => !has(get(d, 'gesch.firma')) }
      ]
    },
    {
      id: 'abschluss02', phase: 'Schaden', title: 'Schadenshöhe & Verbleib', lead: 'Zahlen, Altschäden und ob noch mehr beschädigt wurde', gen: d => (istFahrzeug(d) ? ['2.3'] : ['2.5']),
      fields: [
        { k: 'ub02.wert', t: 'euro', l: 'Geschätzte Schadenshöhe (€)', q: [300, 500, 1000, 1500, 2500, 5000], step: 100, min: 0, h: 'Ab ca. 1.300 € gilt ein Schaden als bedeutend.' },
        { k: 'ub02.verdeckt', t: 'yn', l: 'Hinweis auf mögliche verdeckte Schäden aufnehmen?', h: '„Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden … nicht ausgeschlossen werden.“', when: istFahrzeug },
        { k: 'ub02.fahrbereit', t: 'yn', l: 'Fahrzeug fahrbereit und verkehrssicher?', w: 'half', when: istFahrzeug },
        { k: 'ub02.verbleib', t: 'choice', l: 'Verbleib des Fahrzeugs', o: [['vorort', 'verblieb vor Ort'], ['gefahren', 'weitergenutzt'], ['abgeschleppt', 'abgeschleppt']], when: istFahrzeug },
        { k: 'ub02.altschaden', t: 'choice', l: 'Altschäden am Fahrzeug insgesamt?', o: [['nein', 'keine erkennbar'], ['ja', 'ja, abgrenzbar'], ['unklar', 'nicht sicher abgrenzbar']], when: istFahrzeug },
        { k: 'ub02.altschadenText', t: 'text', l: 'Welche Altschäden?', pre: d => (get(d, 'ub02.altschaden') === 'ja' ? 'Als Altschäden erkennbar waren' : 'Als mögliche Altschäden in Betracht kommen'), ph: 'ältere, korrodierte Kratzer an der Heckschürze rechts', when: d => ['ja', 'unklar'].includes(get(d, 'ub02.altschaden')) },
        { k: 'ub02.weitere', t: 'yn', l: 'Wurden weitere Fahrzeuge oder Sachen beschädigt?', h: 'z. B. ein daneben geparktes Fahrzeug mit korrespondierendem Schaden' }
      ]
    },
    {
      id: 'weitere', phase: 'Schaden', title: 'Weitere Schäden', lead: 'Jedes weitere beschädigte Fahrzeug bzw. jede Sache erhält eine eigene Ordnungsnummer (UB 03 …).', gen: ['2.3', '2.5'], when: d => get(d, 'ub02.weitere') === 'ja',
      fields: [{
        k: 'weitere', t: 'list', l: 'Weitere Schäden', item: (it, i) => 'UB ' + String(i + 3).padStart(2, '0'), add: 'Weiteren Schaden hinzufügen', max: 6, min1: true,
        sub: [
          { k: 'typ', t: 'choice', l: 'Was wurde beschädigt?', o: [['fz', 'Ein Fahrzeug'], ['sache', 'Eine Sache']] },
          { k: 'fz', t: 'vehicle', l: 'Fahrzeug', when: (d, it) => it.typ !== 'sache' },
          { k: 'sache', t: 'text', l: 'Welche Sache?', pre: 'Zudem beschädigte der Verursacher', ph: 'einen Poller vor dem Haus Nr. 14', h: 'Mit Artikel im Akkusativ („einen …“).', when: (d, it) => it.typ === 'sache' },
          { k: 'halter', t: 'person', l: (d, it) => (it.typ === 'sache' ? 'Eigentümer/in' : 'Halter/in'), fields: ['geschlecht', 'nachname', 'vorname', 'anschrift', 'tel'] },
          { k: 'schaden', t: 'area', rows: 2, l: 'Beschädigungen (ganze Sätze, Präteritum)', ph: (d, it) => (it.typ === 'sache' ? 'Der Poller war in ca. 40 cm Höhe verschrammt.' : 'An der Heckschürze rechts befanden sich frische Kratzspuren in ca. 50 cm Höhe.') },
          { k: 'wert', t: 'euro', l: 'Geschätzter Schaden (€)', q: [300, 500, 1000, 2000], step: 100, min: 0 },
          { k: 'info', t: 'choice', l: 'Benachrichtigt?', o: [['vorort', 'vor Ort informiert'], ['nachricht', 'Nachricht hinterlassen'], ['offen', 'noch offen']] }
        ]
      }]
    },

    /* ---------- Phase 5: Spuren ---------- */
    {
      id: 'spurenfz', phase: 'Spuren', title: 'Spurensicherung am Fahrzeug', lead: 'Was wurde am beschädigten Fahrzeug gesichert?', gen: ['2.3'], when: istFahrzeug,
      fields: [
        { t: 'info', text: 'Spurenkatalog: Die Spurfix-Folie dient nur der optischen Vorauswertung (Mikrospuren auf dem Lack). Für ein gerichtsverwertbares LKA-Gutachten Lackproben immer durch Schneiden oder Ausheben bis zum Träger gewinnen – nicht schaben, nicht auf Folie. Zwei bis drei kleine Folien (10 cm) an markanten Berührungspunkten reichen; nur den Beschriftungsstreifen beschriften.' },
        { k: 'spuren.fz.spurfix', t: 'yn', l: 'Spurensicherungsfolie (Spurfix) aufgebracht?' },
        { k: 'spuren.fz.spurfixAnzahl', t: 'number', l: 'Anzahl der Folien', q: [1, 2, 3], w: 'half', min: 1, max: 20, step: 1, when: d => get(d, 'spuren.fz.spurfix') === 'ja' },
        { k: 'spuren.fz.spurfixDoku', t: 'yn', l: 'Folien nummeriert, Klebestellen beschrieben und fotografiert?', when: d => get(d, 'spuren.fz.spurfix') === 'ja' },
        { k: 'spuren.fz.lackprobe', t: 'yn', l: 'Fremdlackanriebe oder -splitter gesondert gesichert?', h: 'Pergamintüte / Spurensicherungsbeutel, durch Schneiden oder Ausheben' },
        { k: 'spuren.fz.lackprobeArt', t: 'choice', l: 'Gewonnen durch', w: 'half', o: [['schneiden', 'Schneiden / Ausheben'], ['abnehmen', 'Abnehmen loser Splitter']], when: d => get(d, 'spuren.fz.lackprobe') === 'ja' },
        { k: 'spuren.fz.eigenlack', t: 'yn', l: 'Vergleichsprobe des Eigenlacks gesichert?', w: 'half', when: d => get(d, 'spuren.fz.lackprobe') === 'ja' },
        { k: 'spuren.fz.fremdteile', t: 'yn', l: 'Fremdteile des Verursacherfahrzeugs aufgefunden?', h: 'z. B. Spiegelglas, Blinkerglas, Zierleiste, Stoßfängerfragment' },
        { k: 'spuren.fz.fremdteileText', t: 'text', l: 'Welche Teile, wo?', pre: 'Folgende Fremdteile wurden aufgefunden:', ph: 'ein schwarzes Spiegelgehäuse aus Kunststoff neben dem Vorderrad links', when: d => get(d, 'spuren.fz.fremdteile') === 'ja' },
        { k: 'spuren.fz.fremdteileSicher', t: 'yn', l: 'Fremdteile sichergestellt?', w: 'half', when: d => get(d, 'spuren.fz.fremdteile') === 'ja' },
        { k: 'spuren.fz.fotosMassstab', t: 'yn', l: 'Beschädigungen mit Maßstab fotografiert (Anstoßhöhe)?' },
        { k: 'spuren.fz.mikroskop', t: 'yn', l: 'Optische Vorauswertung (Handmikroskop) durchgeführt?', w: 'half' }
      ]
    },
    {
      id: 'spurenort', phase: 'Spuren', title: 'Spuren am Unfallort', lead: 'Fahrbahn, Umfeld und sonstige Gegenstände', gen: ['2.2', '2.5'],
      fields: [
        { k: 'spuren.fahrbahn.vorhanden', t: 'yn', l: d => (istStrasse(d) ? 'Spuren auf der Fahrbahn oder im Umfeld festgestellt?' : 'Spuren auf der Fläche oder im Umfeld festgestellt?') },
        { k: 'spuren.fahrbahn.arten', t: 'multi', l: 'Art der Spuren', o: [['splitter', 'Glas-/Kunststoffsplitter'], ['teile', 'Fahrzeugteile'], ['lack', 'Lackpartikel'], ['reifen', 'Reifen-/Rangierspuren'], ['fluessig', 'Flüssigkeiten'], ['schmutz', 'Schmutzabwurf'], ['kratz', 'Kratzspuren am Boden']], when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.fahrbahn.text', t: 'text', l: 'Wo genau?', pre: 'Die Spuren befanden sich', ph: 'ca. 0,5 m neben dem Vorderrad links, verteilt auf ca. 1 m²', when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.fahrbahn.gesichert', t: 'yn', l: 'Spuren fotografiert und, soweit möglich, gesichert?', w: 'half', when: d => get(d, 'spuren.fahrbahn.vorhanden') === 'ja' },
        { k: 'spuren.sonst.vorhanden', t: 'yn', l: 'Spuren an sonstigen Gegenständen (Poller, Zaun, Verkehrszeichen)?' },
        { k: 'spuren.sonst.text', t: 'text', l: 'Woran?', pre: 'Weitere Spuren fanden sich an', ph: 'einem Poller vor Haus Nr. 14 (schwarzer Lackabrieb in 35 bis 45 cm Höhe)', h: 'Dativ: „an einem Poller“, „an der Hauswand“.', when: d => get(d, 'spuren.sonst.vorhanden') === 'ja' }
      ]
    },

    /* ---------- Phase 6: Zeugen & Umfeld ---------- */
    {
      id: 'zeugen', phase: 'Zeugen', title: 'Zeugen', lead: 'Alle Zeugen mit Personalien erfassen – Knallzeugen werden als solche kenntlich gemacht.', gen: ['3.2'],
      fields: [
        { k: 'zg.vorhanden', t: 'yn', l: 'Gibt es Zeugen?' },
        {
          k: 'zeugen', t: 'list', l: 'Zeugen', item: (it, i) => (ZG(it) === 'w' ? 'Zeugin ' : 'Zeuge ') + 'Z ' + N2(i) + (it.p && it.p.nachname ? ' · ' + it.p.nachname : ''), add: 'Weitere Person hinzufügen', max: 8, min1: true, when: zeugenJa,
          sub: [
            { k: 'p', t: 'person', l: 'Personalien', fields: PERSON_FIELDS },
            { k: 'mitteiler', t: 'yn', l: 'Hat diese Person die Polizei verständigt?', w: 'half', when: d => get(d, 'einsatz.mitteiler') === 'zeuge' },
            { k: 'art', t: 'choice', l: 'Was hat die Person wahrgenommen?', o: [['sicht', 'Unfall gesehen'], ['knall', 'Nur gehört (Knallzeuge)'], ['nachher', 'Nur nachträgliche Feststellung']] },
            { k: 'standort', t: 'text', l: 'Wo war die Person?', pre: (d, it) => 'Zum Unfallzeitpunkt befand ' + erL(ZG(it)) + ' sich', ph: 'auf dem Balkon im 2. OG des Hauses Nr. 14', sugg: [['Balkon', 'auf dem Balkon '], ['Fenster', 'am Fenster '], ['Gehweg', 'auf dem Gehweg '], ['Parkplatz', 'auf dem Parkplatz ']], when: (d, it) => it.art !== 'nachher' },
            { k: 'entfernung', t: 'number', l: 'Entfernung ca. (m)', q: [5, 10, 20, 50], w: 'half', min: 0, max: 2000, step: 5, when: (d, it) => it.art !== 'nachher' },
            { k: 'sicht', t: 'choice', l: 'Sicht auf die Unfallstelle', w: 'half', o: [['frei', 'frei'], ['eingeschraenkt', 'eingeschränkt']], when: (d, it) => it.art === 'sicht' },
            { k: 'belehrt', t: 'yn', l: 'Zeugenschaftlich belehrt?', w: 'half' },
            { k: 'angaben', t: 'area', l: 'Was hat die Person geschildert? (indirekte Rede)', pre: (d, it) => ER(ZG(it)) + ' gab sinngemäß an:', ph: (d, it) => (it.art === 'nachher' ? ER(ZG(it)) + ' sei gegen 13:00 Uhr am Fahrzeug vorbeigegangen und habe frische Kratzer an der Fahrertür bemerkt.' : ER(ZG(it)) + ' habe gegen 14:10 Uhr einen lauten Knall gehört und daraufhin gesehen, wie ein roter Kleinwagen davongefahren sei.'), lint: 'konj', rows: 4 },
            { k: 'wiedererkennen', t: 'choice', l: 'Würde die Person Fahrer oder Fahrzeug wiedererkennen?', w: 'half', o: [['ja', 'Ja'], ['evtl', 'Eventuell'], ['nein', 'Nein']], when: (d, it) => it.art !== 'nachher' },
            { k: 'medien', t: 'yn', l: 'Hat die Person Fotos oder Videos gemacht?', w: 'half' },
            { k: 'medienGesichert', t: 'yn', l: 'Aufnahmen übernommen und gesichert?', w: 'half', when: (d, it) => it.medien === 'ja' },
            { k: 'erreichbar', t: 'choice', l: 'Erreichbarkeit', o: [['vorort', 'vor Ort angetroffen'], ['telefon', 'nur telefonisch'], ['spaeter', 'nachträglich zu kontaktieren']] }
          ]
        }
      ]
    },
    {
      id: 'umfeld', phase: 'Zeugen', title: 'Umfeld: Kameras, Zeugensuche, Dritte', lead: 'DA 3.1: Unfallörtlichkeit auf Kameraüberwachung prüfen und Videoaufnahmen sichern.', gen: ['3.3', '5.1'],
      fields: [
        { k: 'massnahmen.kamera', t: 'yn', l: 'Unfallörtlichkeit auf Kameraüberwachung geprüft?', h: 'Anliegende Firmen, Tankstellen, Haltestellen, Parkhäuser, Dashcams' },
        { k: 'massnahmen.kameraErgebnis', t: 'choice', l: 'Ergebnis', o: [['keine', 'Keine Kamera vorhanden'], ['vorhanden', 'Kamera vorhanden, Sicherung veranlasst'], ['gesichert', 'Aufzeichnung gesichert'], ['angefragt', 'Anfrage läuft']], when: d => get(d, 'massnahmen.kamera') === 'ja' },
        { k: 'massnahmen.kameraText', t: 'text', l: 'Kamera und Ansprechpartner', pre: 'Kamera / Ansprechpartner:', ph: 'Tankstelle Ecke Lindenstraße, Herr M., Speicherdauer 72 Stunden', when: d => get(d, 'massnahmen.kamera') === 'ja' && get(d, 'massnahmen.kameraErgebnis') !== 'keine' },
        { k: 'massnahmen.zeugensuche', t: 'yn', l: 'Aktiv nach (weiteren) Zeugen gesucht?' },
        { k: 'massnahmen.zeugensucheArt', t: 'multi', l: 'Wie?', o: [['anwohner', 'Anwohnerbefragung'], ['umfeld', 'Umfeld / Geschäfte'], ['zettel', 'Zeugenaufruf hinterlassen'], ['nachbarfz', 'Nachbarfahrzeuge geprüft']], when: d => get(d, 'massnahmen.zeugensuche') === 'ja' },
        { k: 'massnahmen.zeugensucheErgebnis', t: 'choice', l: 'Ergebnis', w: 'half', o: [['keine', 'ohne Ergebnis'], ['hinweise', 'mit Hinweisen']], when: d => get(d, 'massnahmen.zeugensuche') === 'ja' },
        { k: 'dritte.vorhanden', t: 'yn', l: 'Angaben Dritter (Anwohner, Marktleitung, Angehörige – keine Unfallzeugen)?' },
        { k: 'dritte.text', t: 'area', l: 'Wer hat was mitgeteilt? (ganze Sätze)', ph: 'Der Marktleiter teilte mit, die Parkplatzkamera erfasse nur die Einfahrt; die Aufzeichnung werde 72 Stunden gespeichert.', rows: 3, when: d => get(d, 'dritte.vorhanden') === 'ja' }
      ]
    },

    /* ---------- Phase 7: Verursacher ---------- */
    {
      id: 'taeter', phase: 'Verursacher', title: 'Hinweise auf den Verursacher', lead: d => (zeugenJa(d) && !hinweise(d) ? 'Du hast Zeugen erfasst – haben sich daraus Hinweise ergeben?' : 'Stand jetzt – lässt sich jederzeit ändern.'), gen: ['4.1'],
      fields: [
        { k: 'taeter.hinweise', t: 'yn', l: 'Gibt es Hinweise auf den Verursacher?' },
        { k: 'taeter.quelle', t: 'multi', l: 'Woher stammen die Hinweise? (Mehrfachauswahl)', o: [['zeuge', 'Zeugen'], ['zettel', 'Zettel am Fahrzeug'], ['kamera', 'Video / Dashcam'], ['teile', 'Fahrzeugteile'], ['gesch', 'Geschädigte/r'], ['spuren', 'Spurenbild'], ['selbst', 'Selbstmeldung']], when: hinweise },
        { t: 'info', when: d => !hinweise(d) && has(get(d, 'taeter.hinweise')), text: 'Ohne Hinweise bleiben Zeugensuche, Kameraprüfung und Spurensicherung die wichtigsten Ermittlungsansätze – sie stehen sonst in den offenen Punkten.' }
      ]
    },
    {
      id: 'taeterfz', phase: 'Verursacher', title: 'Verursacherfahrzeug (UB 01)', lead: 'Was ist über das flüchtige Fahrzeug bekannt?', gen: ['4.1'], when: hinweise,
      fields: [
        { k: 'taeter.fz', t: 'vehicle', l: 'Flüchtiges Fahrzeug', fragment: true },
        { k: 'taeter.fz.besonderheiten', t: 'text', l: 'Besonderheiten', pre: 'Besonderheiten am Fahrzeug:', ph: 'Fahrradträger am Heck, Aufschrift „Muster GmbH“ auf der Heckscheibe' },
        { k: 'taeter.fz.fluchtrichtung', t: 'text', l: 'Fluchtrichtung', pre: 'Das Fahrzeug entfernte sich', ph: 'in Richtung Innenstadt', sugg: [['Richtung …', 'in Richtung '], ['unbekannt', 'in unbekannte Richtung']] }
      ]
    },
    {
      id: 'taeterperson', phase: 'Verursacher', title: 'Personen & Verhalten', lead: 'Fragebogen Anlage 2 – Fragen zum Unfallflüchtigen', gen: ['4.1'], when: hinweise,
      fields: [
        { k: 'taeter.personen.anzahl', t: 'number', l: 'Personen im Fahrzeug', q: [1, 2, 3], w: 'half', min: 1, max: 9, step: 1 },
        { k: 'taeter.personen.fahrer', t: 'choice', l: 'Am Steuer saß', w: 'half', o: [['m', 'ein Mann'], ['w', 'eine Frau'], ['u', 'nicht sicher']] },
        { k: 'taeter.personen.beschreibung', t: 'text', l: 'Wie sah die Person am Steuer aus?', pre: d => fahrerNom(d) + ' wurde beschrieben als', ph: 'ca. 60 Jahre alt, schlank, mit kurzen grauen Haaren und Brille' },
        { k: 'taeter.personen.wiedererkennen', t: 'choice', l: d => 'Würde ' + fahrerKl(d) + ' wiedererkannt?', w: 'half', o: [['ja', 'Ja'], ['evtl', 'Eventuell'], ['nein', 'Nein']] },
        { k: 'taeter.verhalten.angehalten', t: 'yn', l: d => 'Hat ' + fahrerKl(d) + ' nach dem Anstoß angehalten?', o: JNU },
        { k: 'taeter.verhalten.ausgestiegen', t: 'yn', l: d => 'Ist ' + fahrerEr(d) + ' ausgestiegen und hat den Schaden angesehen?', o: JNU, when: d => get(d, 'taeter.verhalten.angehalten') === 'ja' },
        { k: 'taeter.verhalten.wartezeit', t: 'number', l: 'Wartezeit vor Ort (Minuten)', q: [0, 1, 5, 10, 30], w: 'half', min: 0, max: 600, step: 1, when: d => get(d, 'taeter.verhalten.angehalten') === 'ja' },
        { k: 'taeter.verhalten.aufgefordert', t: 'yn', l: d => 'Wurde ' + fahrerEr(d) + ' aufgefordert, am Unfallort zu bleiben?', o: JNU },
        { k: 'taeter.verhalten.aufgefordertVon', t: 'text', l: 'Von wem?', pre: 'Die Aufforderung erfolgte durch', ph: d => geschAkk(d), sugg: d => [['Geschädigte/r', geschAkk(d)], ['Zeuge', 'einen Zeugen'], ['Zeugin', 'eine Zeugin']], when: d => get(d, 'taeter.verhalten.aufgefordert') === 'ja' },
        { k: 'taeter.verhalten.zettel', t: 'yn', l: 'Wurde ein Zettel mit Kontaktdaten hinterlassen?', o: JNU, when: istFahrzeug },
        { k: 'taeter.verhalten.zettelText', t: 'text', l: 'Was stand auf dem Zettel?', pre: 'Auf dem Zettel war vermerkt:', ph: 'lediglich ein Vorname und eine unvollständige Telefonnummer', when: d => get(d, 'taeter.verhalten.zettel') === 'ja' },
        { k: 'taeter.verhalten.geraeusch', t: 'yn', l: d => 'War der Anstoß so deutlich, dass ' + fahrerKl(d) + ' ihn bemerken musste?', o: JNU },
        { k: 'taeter.verhalten.tempo', t: 'number', l: 'Geschätzte Geschwindigkeit (km/h)', q: [5, 10, 20, 30, 50], w: 'half', min: 0, max: 200, step: 5 },
        { k: 'taeter.verhalten.alkohol', t: 'yn', l: 'Anzeichen für Alkohol- oder Drogeneinfluss?', o: JNU, w: 'half' },
        { k: 'taeter.verhalten.alkoholText', t: 'text', l: 'Woran bemerkt?', pre: 'Dies zeigte sich an', ph: 'einem unsicheren Gang und einer verwaschenen Aussprache', join: ' und ', sugg: [['unsicherer Gang', 'einem unsicheren Gang'], ['Aussprache', 'einer verwaschenen Aussprache'], ['Alkoholgeruch', 'deutlichem Alkoholgeruch']], when: d => get(d, 'taeter.verhalten.alkohol') === 'ja' }
      ]
    },
    {
      id: 'ermittlung', phase: 'Verursacher', title: 'Sofortmaßnahmen & Ermittlungen', lead: 'DA 3.1: Fahndung einleiten, Halteranschrift unverzüglich aufsuchen (lassen).', gen: ['5.1'], when: hinweise,
      fields: [
        { k: 'taeter.ermittlung.fahndung', t: 'yn', l: 'Fahndung eingeleitet?' },
        { k: 'taeter.ermittlung.fahndungArt', t: 'multi', l: 'Art', o: [['nah', 'Nahbereichsfahndung'], ['funk', 'Funkfahndung über die Leitstelle'], ['sach', 'Sachfahndung (INPOL)']], when: d => get(d, 'taeter.ermittlung.fahndung') === 'ja' },
        { k: 'taeter.ermittlung.halterabfrage', t: 'yn', l: 'Halterabfrage zum Kennzeichen durchgeführt?', when: d => has(get(d, 'taeter.fz.kz')) },
        { k: 'taeter.ermittlung.halterErgebnis', t: 'choice', l: 'Ergebnis', o: [['treffer', 'Halter ermittelt'], ['passt', 'Halter ermittelt, Fahrzeug passt zur Beschreibung'], ['passtnicht', 'Fahrzeug passt nicht zur Beschreibung'], ['kein', 'Kein Treffer / Fragment zu unvollständig']], when: d => get(d, 'taeter.ermittlung.halterabfrage') === 'ja' },
        { k: 'taeter.ermittlung.anschrift', t: 'choice', l: 'Ermittlungen an der Halteranschrift', o: [['ja', 'Durchgeführt'], ['spaeter', 'Veranlasst / folgt'], ['nein', 'Nicht möglich / entbehrlich']], when: d => ['treffer', 'passt'].includes(get(d, 'taeter.ermittlung.halterErgebnis')) },
        { k: 'taeter.ermittlung.fahrerErmittelt', t: 'yn', l: 'Wurde die Person am Steuer ermittelt?', h: 'Auch bei Selbstmeldung oder Zeugenhinweis – danach folgen Personalien, Belehrung und Verkehrstüchtigkeit.' },
        { k: 'taeter.ermittlung.weg', t: 'choice', l: 'Wie ermittelt?', o: [['anschrift', 'An der Halteranschrift'], ['selbst', 'Selbstmeldung'], ['zeuge', 'Durch Zeugenhinweis'], ['kamera', 'Durch Videoauswertung'], ['sonst', 'Auf anderem Weg']], when: d => get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja' },
        { k: 'taeter.ermittlung.meldungDatum', t: 'date', l: 'Gemeldet am', w: 'half', q: 'heute', when: d => get(d, 'taeter.ermittlung.weg') === 'selbst' },
        { k: 'taeter.ermittlung.meldungZeit', t: 'time', l: 'um (Uhrzeit)', w: 'half', q: 'jetzt', when: d => get(d, 'taeter.ermittlung.weg') === 'selbst' },
        { k: 'taeter.ermittlung.meldungBei', t: 'text', l: 'Wo bzw. wie?', pre: d => 'Die Person meldete sich', ph: 'persönlich auf der Polizeiwache Steinfurt', sugg: [['Wache', 'persönlich auf der Polizeiwache '], ['Telefon', 'telefonisch bei der Polizei'], ['Notruf', 'über den Notruf 110']], when: d => get(d, 'taeter.ermittlung.weg') === 'selbst' },
        { t: 'info', when: d => get(d, 'taeter.ermittlung.weg') === 'selbst', text: '§ 142 Abs. 4 StGB (tätige Reue): Das Gericht mildert die Strafe oder sieht von ihr ab, wenn die Feststellungen binnen 24 Stunden freiwillig nachträglich ermöglicht werden – nur bei Unfällen außerhalb des fließenden Verkehrs mit ausschließlich nicht bedeutendem Sachschaden. Uhrzeit der Meldung genau festhalten.' },
        { k: 'taeter.ermittlung.fzAngetroffen', t: 'yn', l: 'Verursacherfahrzeug angetroffen und in Augenschein genommen?', when: d => get(d, 'taeter.ermittlung.anschrift') === 'ja' || get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja' },
        { k: 'taeter.ermittlung.schadenKorr', t: 'choice', l: 'Passt das Schadensbild zusammen?', o: [['ja', 'Ja, in Höhe und Verlauf'], ['teils', 'Teilweise'], ['nein', 'Nein'], ['offen', 'Nicht beurteilbar']], when: fzAngetroffen },
        { k: 'taeter.ermittlung.text', t: 'area', l: 'Weitere Ermittlungen / Ergebnis (ganze Sätze, Präteritum)', ph: 'Der Halter wurde an der Anschrift nicht angetroffen; eine Benachrichtigung wurde hinterlassen.', rows: 2 }
      ]
    },
    {
      id: 'besch', phase: 'Verursacher', title: 'Beschuldigte Person (UB 01)', lead: 'Personalien, Belehrung und Einlassung', gen: ['3.1'], when: ermittelt,
      fields: [
        { k: 'taeter.person', t: 'person', l: 'Beschuldigte/r (UB 01)', fields: PERSON_FIELDS },
        { k: 'taeter.person.halter', t: 'yn', l: 'Zugleich Halter/in des Fahrzeugs?', w: 'half' },
        { k: 'taeter.person.dolmetscher', t: 'yn', l: 'Dolmetscher hinzugezogen?', w: 'half' },
        { k: 'taeter.person.belehrt', t: 'yn', l: d => 'Als ' + ({ m: 'Beschuldigter', w: 'Beschuldigte' }[gB(d)] || 'beschuldigte Person') + ' belehrt?', w: 'half' },
        { k: 'taeter.person.belehrtVon', t: 'crewpick', l: 'Belehrt durch', w: 'half', when: d => get(d, 'taeter.person.belehrt') === 'ja' },
        { k: 'taeter.person.einlassung', t: 'choice', l: 'Einlassung', o: [['angaben', 'Machte Angaben'], ['keine', 'Keine Angaben zur Sache'], ['verweigert', 'Verweigerte Angaben / Anwalt']], when: d => get(d, 'taeter.person.belehrt') === 'ja' },
        { k: 'taeter.person.text', t: 'area', l: 'Was hat die Person angegeben? (indirekte Rede)', pre: d => ER(gB(d)) + ' machte sinngemäß folgende Angaben:', ph: d => ER(gB(d)) + ' habe beim Ausparken einen leichten Ruck bemerkt, aber keinen Schaden gesehen. ' + ER(gB(d)) + ' sei davon ausgegangen, nur den Bordstein berührt zu haben.', lint: 'konj', rows: 4, when: d => get(d, 'taeter.person.einlassung') === 'angaben' }
      ]
    },
    {
      id: 'besch2', phase: 'Verursacher', title: 'Verkehrstüchtigkeit & Führerschein', lead: d => 'Feststellungen bei ' + beschDat(d) + ' – Anlage 6, Punkte 2.4 und 5.1', gen: ['2.4', '5.1'], when: ermittelt,
      fields: [
        { k: 'taeter.person.fs', t: 'choice', l: 'Führerschein', o: [['ja', 'vorgelegt'], ['nein', 'nicht mitgeführt'], ['keine', 'keine Fahrerlaubnis']] },
        { t: 'info', when: d => get(d, 'taeter.person.fs') === 'keine', text: 'Fahren ohne Fahrerlaubnis (§ 21 StVG) gesondert prüfen und anzeigen.' },
        { k: 'taeter.person.alkohol', t: 'yn', l: 'Anzeichen für Alkohol-, Drogen- oder Medikamenteneinfluss?' },
        { k: 'taeter.person.alkoholText', t: 'text', l: 'Welche Anzeichen?', pre: 'Festgestellt wurden', ph: 'deutlicher Alkoholgeruch und eine verwaschene Aussprache', join: ' und ', sugg: [['Alkoholgeruch', 'deutlicher Alkoholgeruch'], ['Aussprache', 'eine verwaschene Aussprache'], ['Gang', 'ein unsicherer Gang'], ['Augen', 'gerötete Augen'], ['Reaktion', 'verzögerte Reaktionen']], when: alk },
        { k: 'taeter.person.aat', t: 'choice', l: 'Atemalkoholtest', o: [['ja', 'durchgeführt'], ['verweigert', 'verweigert'], ['nein', 'nicht durchgeführt']], when: alk },
        { k: 'taeter.person.aatWert', t: 'number', l: 'Ergebnis (‰)', unit: '‰', w: 'half', min: 0, max: 5, step: 0.01, q: [0.3, 0.5, 1.1], when: d => alk(d) && get(d, 'taeter.person.aat') === 'ja' },
        { k: 'taeter.person.aatZeit', t: 'time', l: 'Uhrzeit des Tests', w: 'half', q: 'jetzt', when: d => alk(d) && get(d, 'taeter.person.aat') === 'ja' },
        { k: 'taeter.person.blutprobe', t: 'yn', l: 'Blutprobe entnommen?', h: '§ 81a StPO – Anordnung mit Dienstgrad und Name dokumentieren (Anlage 6, 5.1).', when: alk },
        { k: 'taeter.person.blutprobeVon', t: 'crewpick', l: 'Angeordnet durch', w: 'half', when: d => alk(d) && get(d, 'taeter.person.blutprobe') === 'ja' },
        { k: 'taeter.person.blutprobeZeit', t: 'time', l: 'Entnahmezeit', w: 'half', q: 'jetzt', when: d => alk(d) && get(d, 'taeter.person.blutprobe') === 'ja' },
        { k: 'taeter.person.weiterfahrt', t: 'yn', l: 'Weiterfahrt untersagt?', w: 'half', when: alk },
        { k: 'taeter.person.fsMassnahme', t: 'choice', l: 'Was geschah mit dem Führerschein?', h: d => 'DA 2.2: Sicherstellung (freiwillige Herausgabe) und Beschlagnahme klar trennen. Eine Beschlagnahme muss binnen drei Tagen über die StA richterlich bestätigt werden; den Führerschein beim Vorgang belassen und mit ihm unverzüglich der StA übersenden.' + (wert(d) >= 1300 ? ' Bedeutender Schaden: Entziehung nach § 69 Abs. 2 Nr. 3 StGB kommt in Betracht.' : ''), o: [['keine', 'belassen'], ['sichergestellt', 'sichergestellt (freiwillig)'], ['beschlagnahmt', 'beschlagnahmt']], when: d => get(d, 'taeter.person.fs') === 'ja' && (alk(d) || wert(d) >= 1300) },
        { k: 'taeter.person.fsVon', t: 'crewpick', l: 'Angeordnet durch', w: 'half', when: d => get(d, 'taeter.person.fs') === 'ja' && ['sichergestellt', 'beschlagnahmt'].includes(get(d, 'taeter.person.fsMassnahme')) },
        { k: 'taeter.person.ausland', t: 'yn', l: 'Kein fester Wohnsitz im Inland?', h: 'Dann kommt eine Sicherheitsleistung nach § 132 StPO in Betracht (Vordruck NW 2f).', w: 'half' },
        { k: 'taeter.person.sicherheit', t: 'choice', l: 'Sicherheitsleistung', w: 'half', o: [['erhoben', 'erhoben'], ['nein', 'nicht erhoben']], when: d => get(d, 'taeter.person.ausland') === 'ja' },
        { k: 'taeter.person.sicherheitBetrag', t: 'euro', l: 'Betrag (€)', q: [100, 250, 500, 1000], step: 50, min: 0, when: d => get(d, 'taeter.person.ausland') === 'ja' && get(d, 'taeter.person.sicherheit') === 'erhoben' }
      ]
    },
    {
      id: 'teile01', phase: 'Verursacher', title: 'Schadensbild am Verursacherfahrzeug', lead: 'Beschädigungen und Spuren am Fahrzeug UB 01', gen: ['2.3', '4.1'], when: fzAngetroffen,
      fields: [
        { k: 'taeter.teile', t: 'parts', l: 'Beschädigte / spurentragende Fahrzeugteile' },
        { k: 'taeter.spurfix', t: 'yn', l: 'Spurfix-Folie am Verursacherfahrzeug aufgebracht?', w: 'half' },
        { k: 'taeter.lackprobe', t: 'yn', l: 'Lackprobe (Eigenlack UB 01) gesichert?', w: 'half' },
        { k: 'taeter.fotos', t: 'yn', l: 'Lichtbilder vom Fahrzeug UB 01 gefertigt?', w: 'half' }
      ]
    },

    /* ---------- Phase 8: Maßnahmen ---------- */
    {
      id: 'massnahmen1', phase: 'Maßnahmen', title: 'Unfallmitteilung & Dokumentation', lead: 'Unfallmitteilung, Lichtbilder, Skizze, Anzeige', gen: ['6.1'],
      fields: [
        { k: 'massnahmen.unfallmitteilung', t: 'choice', l: 'Unfallmitteilung', h: d => 'DA 1.1: vor Ort eine Durchschrift aushändigen; sonst unverzüglich nachsenden und den Versand im Text vermerken.' + (erreicht(d) ? '' : ' Die geschädigte Person wurde nicht erreicht – also nachsenden.'), o: d => (erreicht(d) ? [['vorort', 'Durchschrift vor Ort ausgehändigt'], ['nachgesandt', 'Wird nachgesandt'], ['digital', 'Digital per E-Mail übersandt'], ['keine', 'Nicht ausgehändigt']] : [['nachgesandt', 'Wird nachgesandt'], ['digital', 'Digital per E-Mail übersandt'], ['keine', 'Noch nicht']]) },
        { k: 'massnahmen.lichtbilder', t: 'yn', l: 'Lichtbilder gefertigt?' },
        { k: 'massnahmen.lichtbilderAnzahl', t: 'number', l: 'Anzahl ca.', q: [4, 8, 12, 20], w: 'half', min: 1, max: 500, step: 1, when: d => get(d, 'massnahmen.lichtbilder') === 'ja' },
        { k: 'massnahmen.mappe', t: 'choice', l: 'Lichtbildmappe', h: 'DA 1.5: Bei Verkehrsunfallfluchten ist eine Lichtbildmappe zu fertigen (zwei Bilder je Seite, Farbausdruck, PDF unter dem ViVA-Az.).', w: 'half', o: [['ja', 'Gefertigt'], ['offen', 'Folgt'], ['nein', 'Nicht erforderlich']], when: d => get(d, 'massnahmen.lichtbilder') === 'ja' },
        { k: 'massnahmen.skizze', t: 'yn', l: 'Skizze gefertigt?', w: 'half' },
        { k: 'massnahmen.anzeige', t: 'yn', l: 'Verkehrsunfallanzeige (§ 142 StGB) gefertigt?', w: 'half' },
        { k: 'massnahmen.az', t: 'text', l: 'Aktenzeichen / Vorgangsnummer', ph: 'optional', w: 'half' }
      ]
    },
    {
      id: 'massnahmen2', phase: 'Maßnahmen', title: 'Asservate & weitere Veranlassungen', lead: 'Was wurde sichergestellt, wer wurde informiert?', gen: ['5.1', '5.2', '5.3', '6.3'],
      fields: [
        { k: 'massnahmen.asservate', t: 'yn', l: 'Asservate (Folien, Lackproben, Teile) zum Vorgang genommen?' },
        { k: 'massnahmen.asservateText', t: 'text', l: 'Welche?', pre: 'Folgende Asservate wurden zum Vorgang genommen:', ph: 'zwei Spurfix-Folien (Nr. 1 und 2) und eine Pergamintüte mit Lackanrieb', sugg: d => { const a = asservatVorschlag(d); return a ? [['Aus den Spuren übernehmen', a]] : []; }, when: d => get(d, 'massnahmen.asservate') === 'ja' },
        { k: 'massnahmen.sonstige', t: 'multi', l: 'Weitere Maßnahmen und Benachrichtigungen', o: [['verkehr', 'Unfallstelle abgesichert'], ['eigentum', 'Eigentumssicherung'], ['vk', 'VK informiert'], ['sta', 'StA informiert'], ['sbl', 'Straßenbaulastträger informiert'], ['svb', 'Straßenverkehrsbehörde informiert'], ['anschluss', 'Anschlussermittlungen veranlasst']] },
        { k: 'massnahmen.weiteres', t: 'area', l: 'Sonstiges (ganze Sätze)', ph: 'Der Bauhof wurde gebeten, den beschädigten Poller zu sichern.', rows: 2 },
        { k: 'massnahmen.einsatzende', t: 'time', l: 'Einsatzende (Ende der Maßnahmen am Unfallort)', w: 'half', q: 'jetzt' }
      ]
    },

    /* ---------- Phase 9: Bewertung ---------- */
    {
      id: 'bewertung', phase: 'Bewertung', title: 'Deutung & vermutlicher Hergang', lead: 'Eigene Schlussfolgerungen – Anlage 6, Punkte 4.1 bis 4.3', gen: ['4.1', '4.2', '4.3'],
      fields: [
        { k: 'bewertung.hergangArt', t: 'choice', l: 'Das Spurenbild spricht für …', o: d => [['rangieren', 'Rangieren / Ein- oder Ausparken'], ['vorbeifahrt', 'Streifkontakt bei Vorbeifahrt'], ['tuer', 'Anschlagen einer Fahrzeugtür'], ['wagen', 'Einkaufswagen / Handwagen'], ...(fahrend(d) || !istFahrzeug(d) ? [['auffahren', 'Auffahren / Anfahren']] : []), ['unklar', 'Nicht eindeutig']] },
        { k: 'bewertung.uebereinstimmung', t: 'choice', l: 'Aussagen und Spurenbild …', o: [['stimmig', 'stimmen überein'], ['teils', 'stimmen teilweise überein'], ['widerspruch', 'widersprechen sich'], ['keine', 'keine Aussagen vorhanden']] },
        { k: 'bewertung.hergang', t: 'area', l: 'Vermutlicher Unfallhergang – leer lassen übernimmt den grauen Vorschlag', ph: d => (root.WVUF ? root.WVUF.hergangVorschlag(d) : ''), sugg: d => (root.WVUF ? [['Vorschlag übernehmen und anpassen', root.WVUF.hergangVorschlag(d)]] : []), rows: 4 },
        { k: 'bewertung.widersprueche', t: 'yn', l: 'Widersprüche festgestellt?' },
        { k: 'bewertung.widerspruecheText', t: 'area', rows: 2, l: 'Welche?', ph: 'Der Beschuldigte will nur einen leichten Ruck bemerkt haben; das Schadensbild spricht für einen deutlich wahrnehmbaren Anstoß.', when: d => get(d, 'bewertung.widersprueche') === 'ja' },
        { k: 'bewertung.manipulation', t: 'choice', l: 'Anhaltspunkte für Vortäuschung oder Manipulation?', h: 'Spurenkatalog: Spuren an untypischen Stellen (unterhalb von Stoßfängerkanten), Basalt- oder Pflasteranhaftungen, Stanzformen. DA 3.6: gesonderter Vermerk an die Sachbearbeitung.', o: [['nein', 'Nein'], ['vermutung', 'Vermutung (Vermerk)'], ['konkret', 'Konkrete Verdachtsmomente']] },
        { k: 'bewertung.manipulationText', t: 'text', l: 'Welche Anhaltspunkte?', pre: 'Anhaltspunkte:', ph: 'Kratzspuren unterhalb der Stoßfängerkante, Anhaftungen von Pflastersteinmaterial', when: d => ['vermutung', 'konkret'].includes(get(d, 'bewertung.manipulation')) },
        { k: 'meta.klarnamen', t: 'yn', l: 'Klarnamen im Berichtstext verwenden?', h: 'DA 1.2: Im Unfallbefundbericht auf Klarnamen verzichten – Rollen und Ordnungsnummern genügen. Die Personalien stehen gesondert.', o: [['nein', 'Nein (Rollen + Nr.)'], ['ja', 'Ja']] }
      ]
    }
  ];

  root.WVUF_STEPS = STEPS;
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Textgenerator ======================= */
/*
 * Gliederung exakt nach Anlage 6 des Erlasses (1.1 … 6.3). Leere Pflichtangaben erscheinen als [Platzhalter].
 * Personen werden über Rolle + Ordnungsnummer bezeichnet (UB 01 Verursacher, UB 02 geschädigte Person,
 * UB 03 … weitere Geschädigte, Z 01 … Zeugen); Klarnamen nur auf Wunsch (DA 1.2).
 */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  const { get, str, has, num, cap, arr, numWord, euro, joinList, fmtDate, fmtTime, when, period, PH, person, crewText, vehicle, vehicleG, partText, slot, sent } = C;
  const N2 = n => String(n).padStart(2, '0');
  const P = (...xs) => xs.filter(s => has(s)).join(' ');          // Sätze zu einem Absatz
  const B = (...xs) => xs.filter(s => has(s)).join('\n\n');       // Absätze zu einem Block
  const hasObj = o => o && typeof o === 'object' && Object.keys(o).some(k => { const v = o[k]; return Array.isArray(v) ? v.length : v && typeof v === 'object' ? hasObj(v) : has(v); });
  /** „Führer“ / „Führerin“ / „fahrzeugführende Person“ – passend zur Person */
  const fuehrer = p => (p.g === 'w' ? 'Führerin' : p.g === 'd' ? 'fahrzeugführende Person' : 'Führer');
  const halterW = p => (p.g === 'w' ? 'Halterin' : p.g === 'd' ? 'haltende Person' : 'Halter');
  const deNum = n => String(n).replace('.', ',');

  /* ---------- Kontext: Personen & Fahrzeuge mit passender Referenz ---------- */
  function ctx(d) {
    const kl = get(d, 'meta.klarnamen') === 'ja';
    const g = person('gesch', get(d, 'gesch'), { klarnamen: kl, nr: 'UB 02' });
    const b = person('besch', get(d, 'taeter.person'), { klarnamen: kl, nr: 'UB 01' });
    const pe = get(d, 'taeter.personen') || {};
    const f = person('fahrer', { geschlecht: pe.fahrer === 'w' ? 'w' : pe.fahrer === 'm' ? 'm' : 'd' });
    const istFz = get(d, 'ub02.typ') !== 'sache';
    const geparkt = istFz && get(d, 'ub02.zustand') !== 'fahrend';
    const zg = get(d, 'zg.vorhanden');
    const zeugen = (zg === 'nein' ? [] : arr(get(d, 'zeugen'))).filter(hasObj).map((z, i) => ({ z, i, nr: 'Z ' + N2(i + 1), p: person('zeuge', z.p, { klarnamen: kl, nr: 'Z ' + N2(i + 1) }) }));
    const weitere = get(d, 'ub02.weitere') === 'ja' ? arr(get(d, 'weitere')).filter(hasObj).map((w, i) => ({ w, nr: 'UB ' + N2(i + 3), h: person(w.typ === 'sache' ? 'eigent' : 'halter', w.halter, { klarnamen: kl, nr: 'UB ' + N2(i + 3) }) })) : [];
    const kontakt = get(d, 'gesch.kontakt') || ({ ja: 'vorort', nein: 'telefon' }[get(d, 'gesch.anwesend')] || '');
    const hinweise = get(d, 'taeter.hinweise') === 'ja';
    return {
      d, kl, g, b, f, istFz, geparkt, fahrend: istFz && !geparkt, zeugen, weitere, kontakt, erreicht: kontakt !== 'nein',
      fz02: get(d, 'ub02.fz') || {}, fz01: get(d, 'taeter.fz') || {},
      hinweise, ermittelt: hinweise && get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja', angetroffen: hinweise && get(d, 'taeter.ermittlung.fzAngetroffen') === 'ja',
      strasse: get(d, 'ort.art') === 'strasse'
    };
  }

  /* ---------- Zeit & Ort als Phrasen ---------- */
  function zeitPhrase(d) {
    const z = get(d, 'zeit') || {};
    if (z.art === 'zeitpunkt') return when(z.datum, z.zeit) || PH('Unfallzeit');
    if (z.art === 'zeitraum') return period(z.vonDatum, z.vonZeit, z.bisDatum, z.bisZeit) || PH('Unfallzeitraum');
    if (z.art === 'unbekannt') return 'zu einem nicht näher bekannten Zeitpunkt';
    return PH('Unfallzeit');
  }
  const STRASSENTYP = { gemeinde: 'Gemeindestraße', kreis: 'Kreisstraße', land: 'Landesstraße', bundes: 'Bundesstraße', bab: 'Bundesautobahn' };
  const reineNr = s => /^\d+\s*[a-z]?(\s*[-–/]\s*\d+\s*[a-z]?)?$/i.test(str(s));
  function adresse(d, kurz = false) {
    const o = get(d, 'ort') || {};
    const s = [str(o.strasse) || PH('Straße'), str(o.hausnr)].filter(Boolean).join(' ');
    if (kurz) return s + (has(o.stadt) ? ' in ' + str(o.stadt) : '');
    return s + ', ' + [str(o.plz), str(o.stadt) || PH('Ort')].filter(Boolean).join(' ') + (has(o.ortsteil) ? ' (Ortsteil ' + str(o.ortsteil) + ')' : '');
  }
  /** „der Bahnhofstraße in Höhe der Hausnummer 12 in Steinfurt“ */
  function strassePhrase(d) {
    const o = get(d, 'ort') || {};
    const nr = has(o.hausnr) ? (reineNr(o.hausnr) ? ' in Höhe der Hausnummer ' + str(o.hausnr) : ' (' + str(o.hausnr) + ')') : '';
    return (str(o.strasse) || PH('Straße')) + nr + (has(o.stadt) ? ' in ' + str(o.stadt) : '');
  }
  /**
   * Ortsangabe im Satz: „am rechten Fahrbahnrand der Bahnhofstraße …“ / „auf dem Parkplatz des REWE-Marktes,
   * Bahnhofstraße 12 in Steinfurt“. mitte = true schließt die Apposition mit Komma, wenn der Satz weitergeht.
   */
  function ortKurz(d, mitte = false) {
    const o = get(d, 'ort') || {};
    if (o.art === 'strasse' || !has(o.art)) {
      const seite = get(d, 'ub02.park.seite');
      return (seite === 'links' ? 'am linken Fahrbahnrand der ' : seite === 'rechts' ? 'am rechten Fahrbahnrand der ' : 'auf der ') + strassePhrase(d);
    }
    const zu = slot(o.zugehoerigkeit);
    const art = o.art === 'parkhaus' ? 'im Parkhaus' : o.art === 'parkplatz' ? 'auf dem Parkplatz' : 'auf der Fläche';
    return art + (zu ? ' ' + zu : '') + ', ' + adresse(d, true) + (mitte ? ',' : '');
  }
  /** „in Queraufstellung vorwärts eingeparkt“ / „in einer Parkbucht abgestellt“ */
  function parkArt(d) {
    const p = get(d, 'ub02.park') || {};
    const ri = { vorwaerts: 'vorwärts', rueckwaerts: 'rückwärts' }[p.richtung];
    const ord = { laengs: 'in Längsaufstellung', quer: 'in Queraufstellung', schraeg: 'in Schrägaufstellung', bucht: 'in einer Parkbucht', stellplatz: 'auf einem markierten Stellplatz', frei: '' }[p.ordnung] || '';
    return [ord, ri ? ri + ' eingeparkt' : 'abgestellt'].filter(Boolean).join(' ');
  }
  /** Fahrzeug ohne Artikel: „Pkw“ */
  const fzNoun = (fz, kasus = 'akk') => vehicle(fz, kasus, false).split(' ').slice(1).join(' ');
  /** Akkusativ-Artikel + Partizip: „den … abgestellten Pkw“ / „das … abgestellte Kraftrad“ */
  const akkPart = (fz, mid, part) => { const g = vehicleG(fz); return `${{ m: 'den', n: 'das', w: 'die' }[g]} ${mid} ${part}${g === 'm' ? 'en' : 'e'} ${fzNoun(fz)}`; };

  /* ======================= 1 Allgemeines ======================= */
  function allg1(d) {
    const e = get(d, 'einsatz') || {};
    const crew = arr(e.kraefte).filter(k => has(k && k.name));
    const wer = crew.length ? crewText(crew) : PH('eingesetzte Kräfte');
    const ruf = has(e.rufname) ? ` (${str(e.rufname)})` : '';
    const viele = crew.length > 1;
    const wann = cap(when(e.datum, e.zeit, 'um') || PH('Datum/Uhrzeit'));
    let s1;
    if (e.meldeweg === 'streife') s1 = `${wann} ${viele ? 'wurden' : 'wurde'} ${wer}${ruf} während des Streifendienstes an der Örtlichkeit ${adresse(d, true)} auf eine Verkehrsunfallflucht mit Sachschaden aufmerksam.`;
    else {
      const weg = { leitstelle: 'über die Leitstelle', telefon: 'nach telefonischer Mitteilung bei der Polizeiwache', wache: 'nach persönlicher Vorsprache auf der Polizeiwache', online: 'aufgrund einer Online-Anzeige' }[e.meldeweg] || '';
      s1 = `${wann} ${viele ? 'erhielten' : 'erhielt'} ${wer}${ruf} ${weg ? weg + ' ' : ''}den Einsatz „Verkehrsunfallflucht mit Sachschaden“ an der Örtlichkeit ${adresse(d, true)}.`;
    }
    let s3 = '';
    if (e.aufnahmeort === 'wache') {
      s3 = 'Die Unfallaufnahme erfolgte zunächst als Protokollaufnahme auf der Polizeiwache.';
      if (e.unfallstelleAufgesucht === 'ja') s3 += ' Die Unfallstelle wurde im Anschluss aufgesucht, um die Sachverhaltsdarstellung mit dem Spurenbild abzugleichen und weitere Ermittlungsansätze zu prüfen.';
      else if (e.unfallstelleAufgesucht === 'nein') s3 += ' Die Unfallstelle wurde nicht aufgesucht.';
    } else if (e.aufnahmeort === 'unfallort') s3 = 'Die Unfallaufnahme erfolgte am Unfallort.';
    const anf = has(e.anfahrt) ? `Während der Anfahrt ${slot(e.anfahrt)}.` : '';
    return B(P(s1, s3), anf);
  }
  function allg2(d) {
    const e = get(d, 'einsatz') || {}, x = ctx(d);
    const t = [];
    if (has(e.zeit)) t.push('Meldezeit: ' + fmtTime(e.zeit));
    const zm = x.zeugen.find(z => z.z.mitteiler === 'ja');
    const gw = { m: 'Geschädigter', w: 'Geschädigte' }[x.g.g] || 'geschädigte Person';
    const mit = e.meldeweg === 'streife' ? 'eigene Feststellung' : { gesch: gw + ' selbst', zeuge: zm ? (zm.p.g === 'w' ? 'Zeugin' : 'Zeuge') + ' (' + zm.nr + ')' : 'Zeuge/Zeugin', dritte: 'Dritte/r', unbekannt: 'unbekannt' }[e.mitteiler];
    if (mit) t.push('Mitteiler: ' + mit);
    t.push('Sachverhalt: ' + (has(e.erkenntnis) ? str(e.erkenntnis).replace(/[.;\s]+$/, '') : 'Verkehrsunfallflucht mit Sachschaden, Verursacher ' + (x.hinweise ? 'mit Hinweisen' : 'unbekannt')));
    return t.join('; ') + '.';
  }
  function allg3(d) {
    const e = get(d, 'einsatz') || {}, s = get(d, 'spuren.eintreff') || {};
    if (e.aufnahmeort === 'wache' && e.unfallstelleAufgesucht !== 'ja') return 'Entfällt – Protokollaufnahme auf der Polizeiwache ohne Aufsuchen der Unfallstelle.';
    const x = ctx(d);
    const zeit = has(e.eintreffZeit) ? `Beim Eintreffen um ${fmtTime(e.eintreffZeit)}` : 'Beim Eintreffen';
    let s1;
    if (has(s.text)) s1 = `${zeit} ${slot(s.text)}.`;
    else if (x.istFz && x.geparkt) s1 = `${zeit} stand ${vehicle(x.fz02, 'nom', true)} ${x.g.gen} ${ortKurz(d)}.` + (x.kontakt === 'vorort' ? ` ${x.g.Nom} war vor Ort.` : '');
    else s1 = `${zeit} ${PH('Eintreffsituation: Standorte, Personen, Fahrzeuge')}.`;
    const v = s.veraendert === 'ja' ? (has(s.veraendertText) ? `Vor dem Eintreffen ${slot(s.veraendertText)}.` : 'Die Unfallstelle war vor dem Eintreffen verändert worden.') : s.veraendert === 'nein' ? 'Veränderungen an der Unfallstelle vor dem Eintreffen wurden nicht festgestellt.' : '';
    const f = s.fotos === 'ja' ? 'Die Eintreffsituation wurde durch Übersichtsaufnahmen fotografisch dokumentiert.' : '';
    return P(s1, v, f);
  }

  /* ======================= 2 Objektiver Befund ======================= */
  /* ---------- 2.1 Unfallort ---------- */
  function ort(d) {
    const o = get(d, 'ort') || {}, x = ctx(d);
    const out = [];
    if (o.art === 'strasse') {
      const lage = o.lage === 'innerorts' ? 'innerorts gelegene ' : o.lage === 'ausserorts' ? 'außerorts gelegene ' : '';
      const typ = STRASSENTYP[o.strassentyp] || 'Straße';
      const nr = has(o.hausnr) ? (reineNr(o.hausnr) ? ' in Höhe der Hausnummer ' + str(o.hausnr) : ' (' + str(o.hausnr) + ')') : '';
      out.push(`Bei der Unfallörtlichkeit handelt es sich um die ${lage}${typ} ${has(o.strasse) ? '„' + str(o.strasse) + '“' : PH('Straße')}${nr}, ${[str(o.plz), str(o.stadt) || PH('Ort')].filter(Boolean).join(' ')}${has(o.ortsteil) ? ' (Ortsteil ' + str(o.ortsteil) + ')' : ''}.`);
    } else {
      const was = o.art === 'parkhaus' ? 'das Parkhaus' : o.art === 'parkplatz' ? 'den Parkplatz' : 'die Verkehrsfläche';
      out.push(`Bei der Unfallörtlichkeit handelt es sich um ${was}${has(o.zugehoerigkeit) ? ' ' + slot(o.zugehoerigkeit) : ''}, ${adresse(d)}.`);
      if (o.oeffentlich === 'ja') out.push('Die Fläche ist für jedermann zugänglich und damit öffentlicher Verkehrsraum.');
      else if (o.oeffentlich === 'nein') out.push('Die Fläche ist nicht für jedermann zugänglich (Zugang nur für Berechtigte); nach den Feststellungen vor Ort handelt es sich nicht um öffentlichen Verkehrsraum.');
      else if (o.oeffentlich === 'unklar') out.push('Ob die Fläche öffentlicher Verkehrsraum ist, bedarf der Prüfung durch die Sachbearbeitung.');
    }
    if (has(o.position)) out.push(`Die Unfallstelle befindet sich ${slot(o.position)}.`);
    if (o.ortSicher === 'unsicher' && x.erreicht) out.push(`${x.g.Nom} konnte den Unfallort nicht mit Sicherheit angeben.`);
    const p1 = out.join(' ');

    const v = [];
    if (o.art === 'strasse') {
      const t = num(o.tempo);
      if (t != null) {
        const grund = { vz274: 'angeordnet durch Zeichen 274', zone: `angeordnet als Tempo-${t}-Zone, Zeichen 274.1`, ortschaft: 'innerhalb geschlossener Ortschaft', bereich: 'im verkehrsberuhigten Bereich' }[o.tempoGrund];
        v.push(`Die zulässige Höchstgeschwindigkeit beträgt dort ${t} km/h${grund ? ' (' + grund + ')' : ''}.`);
      }
      const fs = num(o.fahrstreifen);
      const tr = { keine: 'nicht durch eine Markierung getrennt', leitlinie: 'durch eine unterbrochene Leitlinie getrennt', mittellinie: 'durch eine durchgezogene Linie getrennt', doppel: 'durch eine doppelte durchgezogene Linie getrennt', mittelstreifen: 'baulich durch einen Mittelstreifen getrennt' }[o.trennung];
      const fsw = fs === 1 ? 'einen Fahrstreifen' : numWord(fs) + ' Fahrstreifen';
      if (fs != null && tr) v.push(`Die Fahrbahn verfügt über ${fsw} je Richtung; die Fahrtrichtungen sind ${tr}.`);
      else if (fs != null) v.push(`Die Fahrbahn verfügt über ${fsw} je Richtung.`);
      else if (tr) v.push(`Die Fahrtrichtungen sind ${tr}.`);
      const po = { laengs: 'Am Fahrbahnrand wird in Längsaufstellung geparkt.', quer: 'Am Fahrbahnrand wird in Queraufstellung geparkt.', schraeg: 'Am Fahrbahnrand wird in Schrägaufstellung geparkt.', bucht: 'Entlang der Fahrbahn sind Parkbuchten angelegt.', verbot: 'Im Bereich der Unfallstelle besteht ein Parkverbot.' }[o.parkordnung];
      if (po) v.push(po);
      const vl = { gerade: 'verläuft gerade', links: 'verläuft in einer Linkskurve', rechts: 'verläuft in einer Rechtskurve', kreuzung: 'liegt im Bereich einer Kreuzung bzw. Einmündung' }[o.verlauf];
      const st = { eben: 'ist eben', gefaelle: 'weist ein Gefälle auf', steigung: 'weist eine Steigung auf' }[o.steigung];
      const fr = has(o.fahrtrichtung) ? ` (bezogen auf die Fahrtrichtung ${slot(o.fahrtrichtung)})` : '';
      if (vl && st) v.push(`Der Streckenabschnitt ${vl} und ${st}${fr}.`);
      else if (vl || st) v.push(`Der Streckenabschnitt ${vl || st}${fr}.`);
      const BES = { engstelle: 'eine Engstelle', baustelle: 'eine Arbeitsstelle', kuppe: 'eine Kuppe', bushalt: 'eine Bushaltestelle', fgue: 'ein Fußgängerüberweg', radweg: 'eine Radverkehrsanlage', einbahn: 'eine Einbahnstraßenregelung', spielstr: 'ein verkehrsberuhigter Bereich' };
      const bes = arr(o.besonderheiten).map(k => BES[k]).filter(Boolean);
      if (bes.length) v.push(`Als Besonderheit ${bes.length > 1 ? 'sind' : 'ist'} ${joinList(bes)} vorhanden.`);
      const vk = { gering: 'geringes', maessig: 'mäßiges', stark: 'starkes', stau: 'zähfließendes bis stockendes' }[o.verkehr];
      if (vk) v.push(`Zum Zeitpunkt der Unfallaufnahme herrschte ${vk} Verkehrsaufkommen.`);
    }
    // Fahrbahn, Licht, Witterung – immer „zum Zeitpunkt der Unfallaufnahme“ (die Unfallzeit ist meist unbekannt)
    const w = [];
    const flaeche = o.art === 'strasse' ? 'Die Fahrbahn' : 'Die Verkehrsfläche';
    const belag = { asphalt: 'Asphalt', beton: 'Beton', pflaster: 'Pflaster', kopfstein: 'Kopfsteinpflaster', schotter: 'unbefestigtem Material' }[o.belag];
    const fb = { trocken: 'trocken', feucht: 'feucht', nass: 'nass', laub: 'mit Laub bzw. Schmutz bedeckt', schnee: 'schneebedeckt', eis: 'vereist' }[o.fahrbahn];
    if (belag && fb) w.push(`${flaeche} besteht aus ${belag} und war zum Zeitpunkt der Unfallaufnahme ${fb}.`);
    else if (belag) w.push(`${flaeche} besteht aus ${belag}.`);
    else if (fb) w.push(`${flaeche} war zum Zeitpunkt der Unfallaufnahme ${fb}.`);
    const bl = { betrieb: 'die Beleuchtung war in Betrieb', aus: 'die vorhandene Beleuchtung war ausgeschaltet', keine: 'eine Beleuchtung ist nicht vorhanden' }[o.beleuchtung];
    if (o.licht === 'tag') w.push('Es herrschte Tageslicht.');
    else if (o.licht === 'daemmerung' || o.licht === 'dunkel') w.push((o.licht === 'dunkel' ? 'Es war dunkel' : 'Es herrschte Dämmerung') + (bl ? '; ' + bl : '') + '.');
    const we = { trocken: 'Die Witterung war trocken.', regen: 'Es regnete.', nieselregen: 'Es fiel Nieselregen.', schnee: 'Es schneite.', nebel: 'Es herrschte Nebel.', sonne: 'Die Sonne stand tief.' }[o.wetter];
    if (we) w.push(we);
    if (o.sicht === 'gut') w.push('Die Sichtverhältnisse waren gut.');
    else if (o.sicht === 'eingeschraenkt') w.push(has(o.sichtbehinderung) ? `Die Sicht war eingeschränkt durch ${slot(o.sichtbehinderung)}.` : 'Die Sichtverhältnisse waren eingeschränkt.');
    else if (o.sicht === 'schlecht') w.push('Die Sichtverhältnisse waren schlecht' + (has(o.sichtbehinderung) ? `; die Sicht war zusätzlich eingeschränkt durch ${slot(o.sichtbehinderung)}.` : '.'));
    return B(p1, v.join(' '), w.join(' '));
  }

  /* ---------- 2.2 Spuren auf der Fahrbahn ---------- */
  function spurenFahrbahn(d) {
    const f = get(d, 'spuren.fahrbahn') || {};
    const wo = get(d, 'ort.art') === 'strasse' ? 'Auf der Fahrbahn' : 'Auf der Verkehrsfläche';
    if (f.vorhanden === 'nein') return `${wo} und im näheren Umfeld der Unfallstelle wurden keine unfallbezogenen Spuren festgestellt.`;
    if (f.vorhanden !== 'ja') return PH('Spuren auf der Fahrbahn: ja/nein');
    const ART = { splitter: 'Glas- bzw. Kunststoffsplitter', teile: 'Fahrzeugteile', lack: 'Lackpartikel', reifen: 'Reifen- bzw. Rangierspuren', fluessig: 'Flüssigkeitsspuren', schmutz: 'Schmutzabwurf', kratz: 'Kratzspuren am Boden' };
    const a = arr(f.arten).map(k => ART[k]).filter(Boolean);
    const out = [`${wo} ${a.length ? 'wurden ' + joinList(a) + ' festgestellt' : 'wurden unfallbezogene Spuren festgestellt'}.`];
    if (has(f.text)) out.push(`Die Spuren befanden sich ${slot(f.text)}.`);
    if (f.gesichert === 'ja') out.push('Die Spuren wurden fotografisch dokumentiert und, soweit möglich, gesichert.');
    else if (f.gesichert === 'nein') out.push('Eine Sicherung der Spuren war nicht möglich bzw. nicht erforderlich.');
    return out.join(' ');
  }

  /* ---------- 2.3 Spuren in/an den Fahrzeugen ---------- */
  function fahrzeuge(d) {
    const x = ctx(d);
    const out = ['Fahrzeug UB 01\n' + fzUB01(d, x)];
    if (x.istFz) out.push('Fahrzeug UB 02\n' + fzUB02(d, x));
    x.weitere.filter(e => e.w.typ !== 'sache').forEach(e => out.push(`Fahrzeug ${e.nr}\n` + weiteresFz(e, x)));
    return out.join('\n\n');
  }
  function fzUB01(d, x) {
    const t = get(d, 'taeter') || {}, e = t.ermittlung || {};
    if (!x.angetroffen) {
      const s = 'Das Verursacherfahrzeug entfernte sich vom Unfallort und konnte bislang nicht in Augenschein genommen werden.';
      return x.hinweise ? s + ' Die Hinweise auf das Fahrzeug sind unter 4.1 zusammengefasst.' : has(t.hinweise) ? s + ' Hinweise auf das Fahrzeug liegen nicht vor.' : s;
    }
    const wo = e.anschrift === 'ja' && (e.weg || 'anschrift') === 'anschrift' ? ' an der Halteranschrift' : '';
    const out = [`${cap(vehicle(x.fz01, 'nom', true))} wurde${wo} angetroffen und in Augenschein genommen.`];
    const teile = arr(t.teile).filter(p => p && has(p.name));
    if (teile.length) out.push('Am Fahrzeug wurden folgende Beschädigungen und Spuren festgestellt:\n' + teile.map(p => '– ' + partText(p)).join('\n'));
    else out.push(`Beschädigungen am Fahrzeug: ${PH('keine Fahrzeugteile erfasst')}.`);
    const s = [];
    if (t.spurfix === 'ja') s.push('Auch am Verursacherfahrzeug wurde eine Spurensicherungsfolie aufgebracht.');
    if (t.lackprobe === 'ja') s.push('Eine Probe des Eigenlacks des Verursacherfahrzeugs wurde zu Vergleichszwecken gesichert.');
    if (t.fotos === 'ja') s.push('Das Fahrzeug wurde fotografisch dokumentiert.');
    return B(out.join('\n'), s.join(' '));
  }
  function fzUB02(d, x) {
    const u = get(d, 'ub02') || {};
    const intro = [];
    const fzFull = vehicle(x.fz02, 'nom', true);
    const poss = x.g.gen + (x.erreicht && ['fahrer', 'nutzer'].includes(get(d, 'gesch.rolle')) && has(get(d, 'gesch.firma')) ? ` (Halter: ${slot(get(d, 'gesch.firma'))})` : '');
    if (x.geparkt) {
      const p = u.park || {};
      intro.push(`${cap(fzFull)} ${poss} war ${zeitPhrase(d)} ${ortKurz(d, true)} ${parkArt(d)}.`);
      if (p.abgestelltVon === 'andere') {
        const f = person('fahrer', p.fahrer, { klarnamen: x.kl });
        intro.push(`Abgestellt hatte das Fahrzeug nicht ${x.g.nom} selbst, sondern ${x.kl && f.name ? f.name : 'eine andere Person'} (siehe Personalien).`);
      } else if (p.abgestelltVon === 'unbekannt') intro.push('Wer das Fahrzeug abgestellt hatte, ist nicht bekannt.');
      if (p.beladen === 'ja') intro.push(has(p.beladenText) ? `Das Fahrzeug war ${slot(p.beladenText)}.` : 'Das Fahrzeug war beladen bzw. besetzt.');
      else if (p.beladen === 'nein') intro.push('Das Fahrzeug war weder beladen noch besetzt.');
    } else {
      const f = u.fahrt || {};
      const VG = { geradeaus: ['fuhr', 'geradeaus'], warten: ['stand', 'verkehrsbedingt wartend'], abbiegen: ['befand sich', 'im Abbiegevorgang'], ueberholen: ['befand sich', 'im Überhol- bzw. Vorbeifahrvorgang'], einparken: ['befand sich', 'im Einparkvorgang'], ausparken: ['befand sich', 'im Ausparkvorgang'], kreisverkehr: ['befuhr', 'den Kreisverkehr'] }[f.vorgang] || ['befand sich', PH('Fahrvorgang')];
      const tempo = num(f.tempo) && f.vorgang !== 'warten' ? ` mit ca. ${num(f.tempo)} km/h` : '';
      const ri = has(f.richtung) ? ` in Fahrtrichtung ${slot(f.richtung)}` : '';
      intro.push(`${cap(fzFull)} ${poss} ${VG[0]}${ri}${tempo} ${VG[1]}, als es ${zeitPhrase(d)} ${ortKurz(d)} zum Zusammenstoß kam.`);
      if (has(f.text)) intro.push(sent(f.text));
    }
    const teile = arr(u.teile).filter(t => t && has(t.name));
    const schaden = teile.length ? 'Am Fahrzeug wurden folgende unfallbedingte Beschädigungen und Spuren festgestellt:\n' + teile.map(t => '– ' + partText(t)).join('\n') : `Am Fahrzeug ${PH('Beschädigungen – noch keine Fahrzeugteile erfasst')}.`;
    const nach = [];
    if (u.verdeckt === 'ja') nach.push('Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten und Verformungselementen, nicht ausgeschlossen werden.');
    if (u.altschaden === 'ja') nach.push(has(u.altschadenText) ? `Als Altschäden erkennbar waren ${slot(u.altschadenText)}; diese sind nicht dem Unfallgeschehen zuzuordnen.` : 'Das Fahrzeug wies abgrenzbare Altschäden auf, die nicht dem Unfallgeschehen zuzuordnen sind.');
    else if (u.altschaden === 'unklar') nach.push('Eine sichere Abgrenzung zu möglichen Altschäden war vor Ort nicht möglich.' + (has(u.altschadenText) ? ` Als mögliche Altschäden in Betracht kommen ${slot(u.altschadenText)}.` : ''));
    else if (u.altschaden === 'nein') nach.push('Altschäden waren am Fahrzeug nicht erkennbar.');
    const w = num(u.wert);
    if (w != null) nach.push(`Die Höhe des sichtbaren Sachschadens wird auf ca. ${euro(w)} geschätzt.`);
    if (u.fahrbereit === 'ja') nach.push('Das Fahrzeug war fahrbereit und verkehrssicher.');
    else if (u.fahrbereit === 'nein') nach.push('Das Fahrzeug war nicht mehr fahrbereit bzw. nicht verkehrssicher.');
    const vb = { vorort: 'Es verblieb am Unfallort.', gefahren: `Es wurde von ${x.g.dat} weitergenutzt.`, abgeschleppt: 'Es wurde abgeschleppt.' }[u.verbleib];
    if (vb) nach.push(vb);
    return B(intro.join(' '), schaden, nach.join(' '), spurenFz(d));
  }
  function spurenFz(d) {
    const s = get(d, 'spuren.fz') || {};
    const out = [];
    if (s.spurfix === 'ja') {
      const n = num(s.spurfixAnzahl);
      const ein = n === 1;
      out.push(`Zur Sicherung von Mikrospuren ${ein ? 'wurde an der Anstoßstelle eine Spurensicherungsfolie (Spurfix) aufgebracht' : `wurden an den markanten Berührungspunkten ${n != null ? numWord(n, true) : PH('Anzahl')} Spurensicherungsfolien (Spurfix) aufgebracht`}${s.spurfixDoku === 'ja' ? (ein ? ' und nummeriert; die Klebestelle wurde beschrieben und fotografisch dokumentiert' : ' und fortlaufend nummeriert; die Klebestellen wurden beschrieben und fotografisch dokumentiert') : ''}. Die ${ein ? 'Folie liegt' : 'Folien liegen'} dem Vorgang bei.`);
    } else if (s.spurfix === 'nein') out.push('Auf das Aufbringen einer Spurensicherungsfolie wurde verzichtet.');
    if (s.lackprobe === 'ja') {
      out.push(`Fremdlackanriebe bzw. -splitter wurden ${s.lackprobeArt === 'schneiden' ? 'durch Schneiden bzw. Ausheben bis zum Träger' : s.lackprobeArt === 'abnehmen' ? 'als lose Partikel' : ''} gesondert gesichert und dem Vorgang als Asservat beigefügt; sie eignen sich für eine Materialuntersuchung beim LKA.`.replace('wurden  gesondert', 'wurden gesondert'));
      if (s.eigenlack === 'ja') out.push('Zu Vergleichszwecken wurde zusätzlich eine Probe des Eigenlacks des beschädigten Fahrzeugs gesichert.');
    }
    if (s.fremdteile === 'ja') out.push(P(has(s.fremdteileText) ? `Folgende Fremdteile wurden aufgefunden: ${slot(s.fremdteileText)}.` : 'Es wurden Fremdteile des Verursacherfahrzeugs aufgefunden.', s.fremdteileSicher === 'ja' ? 'Die Teile wurden sichergestellt und dem Vorgang beigefügt.' : s.fremdteileSicher === 'nein' ? 'Eine Sicherstellung erfolgte nicht.' : ''));
    else if (s.fremdteile === 'nein') out.push('Fremdteile des Verursacherfahrzeugs wurden nicht aufgefunden.');
    if (s.fotosMassstab === 'ja') out.push('Die Beschädigungen wurden mit Maßstab fotografisch dokumentiert, sodass die Anstoßhöhen nachvollziehbar sind.');
    if (s.mikroskop === 'ja') out.push('Eine optische Vorauswertung der Anhaftungen (Handmikroskop) wurde im ersten Angriff durchgeführt.');
    return out.join(' ');
  }
  function weiteresFz(e, x) {
    const w = e.w, h = e.h;
    const halter = hasObj(w.halter) ? ' ' + h.firstGen : '';
    const out = [`${cap(vehicle(w.fz, 'nom', true))}${halter} wurde ebenfalls beschädigt.`];
    if (has(w.schaden)) out.push(sent(w.schaden));
    if (num(w.wert) != null) out.push(`Die Höhe des Sachschadens wird auf ca. ${euro(w.wert)} geschätzt.`);
    return out.join(' ');
  }

  /* ---------- 2.4 Spuren an Personen ---------- */
  function personenSpuren(d) {
    const x = ctx(d);
    const out = ['Nach den Feststellungen vor Ort wurde bei dem Verkehrsunfall niemand verletzt.'];
    if (x.ermittelt) {
      const b = get(d, 'taeter.person') || {};
      const t = [];
      if (b.alkohol === 'ja') {
        t.push(`Bei ${x.b.firstDat} ergaben sich Anzeichen für eine Beeinflussung durch Alkohol, Drogen oder Medikamente.` + (has(b.alkoholText) ? ` Festgestellt wurden ${slot(b.alkoholText)}.` : ''));
        if (b.aat === 'ja') { const v = num(b.aatWert); t.push(`Ein freiwilliger Atemalkoholtest${has(b.aatZeit) ? ' um ' + fmtTime(b.aatZeit) : ''} ergab einen Wert von ${v != null ? deNum(v) + ' ‰' : PH('Wert')}.`); }
        else if (b.aat === 'verweigert') t.push(`Einen Atemalkoholtest lehnte ${x.b.er} ab.`);
        else if (b.aat === 'nein') t.push('Ein Atemalkoholtest wurde nicht durchgeführt.');
      } else if (b.alkohol === 'nein') t.push(`Anhaltspunkte für eine Beeinflussung ${x.b.firstGen} durch Alkohol, Drogen oder Medikamente ergaben sich nicht.`);
      const fs = { ja: `${x.b.Er} legte einen Führerschein vor.`, nein: `Einen Führerschein führte ${x.b.er} nicht mit.`, keine: `${x.b.Er} ist nach eigenen Angaben bzw. den Ermittlungen nicht im Besitz einer Fahrerlaubnis.` }[b.fs];
      if (fs) t.push(fs);
      if (t.length) out.push(t.join(' '));
    }
    return out.join(' ');
  }

  /* ---------- 2.5 Spuren an sonstigen Gegenständen ---------- */
  function sonstGegenst(d) {
    const x = ctx(d), u = get(d, 'ub02') || {}, s = get(d, 'spuren.sonst') || {};
    const out = [];
    if (!x.istFz) {
      const a = [`Bei der beschädigten Sache handelt es sich um ${has(u.sache) ? slot(u.sache) : PH('Sache')}.`];
      if (has(u.sacheEigentuemer)) a.push(`Eigentümer bzw. zuständig ist ${slot(u.sacheEigentuemer)}.`);
      if (has(u.sacheSchaden)) a.push(`An der Sache ${slot(u.sacheSchaden)}.`);
      if (u.sacheFremdlack === 'ja') a.push(has(u.sacheFarbe) ? `An der Anstoßstelle fand sich ${slot(u.sacheFarbe)}.` : 'An der Anstoßstelle wurden Fremdlack- bzw. Fremdmaterialanhaftungen festgestellt.');
      else if (u.sacheFremdlack === 'nein') a.push('Fremdlack- oder Fremdmaterialanhaftungen waren an der Anstoßstelle nicht erkennbar.');
      const w = num(u.wert);
      if (w != null) a.push(`Die Höhe des Sachschadens wird auf ca. ${euro(w)} geschätzt.`);
      out.push(a.join(' '));
    }
    x.weitere.filter(e => e.w.typ === 'sache').forEach(e => {
      const a = [`Zudem beschädigte der Verursacher ${has(e.w.sache) ? slot(e.w.sache) : PH('Sache')} (${e.nr}).`];
      if (has(e.w.schaden)) a.push(sent(e.w.schaden));
      if (num(e.w.wert) != null) a.push(`Die Höhe des Sachschadens wird auf ca. ${euro(e.w.wert)} geschätzt.`);
      out.push(a.join(' '));
    });
    if (s.vorhanden === 'ja') out.push(`Weitere Spuren fanden sich an ${has(s.text) ? slot(s.text) : PH('Gegenstand')}.`);
    else if (s.vorhanden === 'nein' && x.istFz && !out.length) out.push('Spuren an sonstigen Gegenständen (Verkehrseinrichtungen, Gebäude, Zäune) wurden nicht festgestellt.');
    else if (!has(s.vorhanden) && x.istFz && !out.length) out.push(PH('Spuren an sonstigen Gegenständen: ja/nein'));
    return out.join('\n\n');
  }

  /* ======================= 3 Subjektiver Befund ======================= */
  /* ---------- 3.1 Beteiligte: UB 01, dann UB 02 ---------- */
  function beteiligte(d) {
    const x = ctx(d);
    return 'UB 01\n' + ub01Angaben(d, x) + '\n\nUB 02\n' + ub02Angaben(d, x);
  }
  function ub01Angaben(d, x) {
    if (!x.ermittelt) return x.hinweise ? 'Die Person, die das Verursacherfahrzeug zum Unfallzeitpunkt führte, konnte bislang nicht ermittelt werden; Angaben liegen nicht vor.' : 'Der Unfallverursacher ist unbekannt; Angaben liegen nicht vor.';
    const b = get(d, 'taeter.person') || {}, e = get(d, 'taeter.ermittlung') || {};
    const t = [];
    const weg = e.weg || (e.anschrift === 'ja' ? 'anschrift' : '');
    const halter = b.halter === 'ja' ? ` und ist zugleich ${x.b.fem ? 'dessen ' + halterW(x.b) : 'dessen Halter'}` : b.halter === 'nein' ? '; Halter des Fahrzeugs ist eine andere Person' : '';
    if (weg === 'selbst') {
      const wann = when(e.meldungDatum, e.meldungZeit, 'um');
      t.push(`${x.b.FirstNom} meldete sich ${wann ? wann + ' ' : ''}${has(e.meldungBei) ? slot(e.meldungBei) : 'bei der Polizei'} und gab an, das Verursacherfahrzeug geführt zu haben.`);
      if (halter) t.push(`${x.b.Er} ist ${b.halter === 'ja' ? 'zugleich ' + halterW(x.b) + ' des Fahrzeugs' : 'nicht ' + halterW(x.b) + ' des Fahrzeugs'}.`);
    } else {
      const wie = { anschrift: ' im Rahmen der Ermittlungen an der Halteranschrift', zeuge: ' aufgrund von Zeugenhinweisen', kamera: ' anhand von Videoaufzeichnungen' }[weg] || '';
      t.push(`${x.b.FirstNom} wurde${wie} als ${fuehrer(x.b)} des Verursacherfahrzeugs ermittelt${halter}.`);
    }
    if (b.dolmetscher === 'ja') t.push('Belehrung und Befragung erfolgten unter Hinzuziehung eines Dolmetschers.');
    const durch = has(b.belehrtVon) ? ' durch ' + str(b.belehrtVon) : '';
    if (b.belehrt === 'ja') {
      t.push({
        angaben: `Nach Beschuldigtenbelehrung${durch} machte ${x.b.er} sinngemäß folgende Angaben:\n${has(b.text) ? sent(b.text) : PH('Einlassung')}`,
        keine: `Nach Beschuldigtenbelehrung${durch} machte ${x.b.er} keine Angaben zur Sache.`,
        verweigert: `Nach Beschuldigtenbelehrung${durch} verweigerte ${x.b.er} Angaben zur Sache und verwies auf ${x.b.poss('akk', 'm')} Rechtsbeistand.`
      }[b.einlassung] || `${x.b.Er} wurde als ${x.b.g === 'm' ? 'Beschuldigter' : x.b.g === 'w' ? 'Beschuldigte' : 'beschuldigte Person'} belehrt.`);
    } else if (b.belehrt === 'nein') t.push(`Eine Beschuldigtenbelehrung erfolgte vor Ort nicht; ${x.b.er} wurde lediglich informatorisch befragt.`);
    else t.push(PH('Belehrung und Einlassung'));
    return t.join(' ');
  }
  /** Wie ist die Person auf den Schaden aufmerksam geworden? (indirekte Rede) */
  function aufmerksamSatz(x, g, rk, ohneZeit) {
    const Rk = rk ? cap(rk) : ohneZeit;
    const zg = x.zeugen.length === 1 ? x.zeugen[0].p.akk + ' (' + x.zeugen[0].nr + ')' : 'einen Zeugen';
    return {
      zeuge: `${Rk} sei ${x.g.er} durch ${zg} auf die Beschädigung aufmerksam gemacht worden.`,
      nachbar: `${Rk} sei ${x.g.er} durch Nachbarn bzw. Anwohner auf die Beschädigung aufmerksam gemacht worden.`,
      zettel: `${Rk} sei ${x.g.er} durch einen am Fahrzeug hinterlassenen Zettel auf die Beschädigung aufmerksam geworden.`,
      geraeusch: `${Rk} habe ${x.g.er} ein Anstoßgeräusch gehört, nachgesehen und die Beschädigung festgestellt.`,
      beobachtet: `${x.g.Er} habe den Unfall selbst beobachtet.`
    }[g.aufmerksam] || '';
  }
  function ub02Angaben(d, x) {
    const g = get(d, 'gesch') || {};
    if (!x.erreicht) {
      const wer = x.istFz ? `Halter des Fahrzeugs ist nach der Halterabfrage ${x.g.firstNom}.` : `Eigentümer der Sache ist ${x.g.firstNom}.`;
      return `${wer} ${x.g.Er} konnte bislang nicht erreicht werden; Angaben liegen daher nicht vor.`;
    }
    const anw = { vorort: ' war bei der Unfallaufnahme vor Ort anwesend.', wache: ' erschien zur Protokollaufnahme auf der Polizeiwache.', telefon: ' wurde telefonisch erreicht und befragt.' }[x.kontakt] || '';
    const fem = x.g.fem && x.g.g === 'w';
    const H = fem ? 'Halterin' : 'Halter', F = fem ? 'Führerin' : 'Führer';
    const rolle = {
      halterfahrer: `${x.g.Er} ist ${H} und ${F} des Fahrzeugs.`,
      halter: `${x.g.Er} ist ${H} des Fahrzeugs.`,
      fahrer: `${x.g.Er} ist ${F}, nicht jedoch ${H} des Fahrzeugs.${has(g.firma) ? ` Halter des Fahrzeugs ist ${slot(g.firma)}.` : ''}`,
      nutzer: `${x.g.Er} ist nutzungsberechtigt.${has(g.firma) ? ` Halter des Fahrzeugs ist ${slot(g.firma)}.` : ''}`,
      eigentuemer: `${x.g.Er} ist ${fem ? 'Eigentümerin' : 'Eigentümer'} der beschädigten Sache.`,
      zustaendig: `${x.g.Er} ist für die beschädigte Sache zuständig.${has(g.firma) ? ` Eigentümer der Sache ist ${slot(g.firma)}.` : ''}`
    }[g.rolle] || '';
    const kopf = anw ? `${x.g.FirstNom}${anw} ${rolle}`.trim() : rolle ? rolle.replace(x.g.Er + ' ', x.g.FirstNom + ' ') : `${x.g.FirstNom}:`;
    const bel = g.belehrt === 'ja' ? `Nach zeugenschaftlicher Belehrung${has(g.belehrtVon) ? ' durch ' + str(g.belehrtVon) : ''} gab ${x.g.er} sinngemäß Folgendes an:` : g.belehrt === 'nein' ? `Im Rahmen der informatorischen Befragung gab ${x.g.er} sinngemäß Folgendes an:` : `${PH('Belehrung')} ${cap(x.g.er)} gab sinngemäß Folgendes an:`;
    // Welche Vorlage? Frei, wenn gewählt oder Freitext vorhanden; „selbst beobachtet“ braucht eigene Worte.
    const raw = g.modus === 'beobachtet' ? 'frei' : g.modus;
    let modus = raw || (has(g.freitext) || g.aufmerksam === 'beobachtet' ? 'frei' : x.geparkt ? 'abgestellt' : 'kurz');
    if (modus === 'abgestellt' && !x.geparkt) modus = 'kurz';
    const z = get(d, 'zeit') || {};
    const zr = z.art === 'zeitraum';
    const ab = zr ? (when(z.vonDatum, z.vonZeit) || PH('Abstellzeit')) : '';
    const gleicherTag = has(z.bisZeit) && z.bisDatum === z.vonDatum;
    const rk = zr ? (when(gleicherTag ? '' : z.bisDatum, z.bisZeit) || PH('Zeit der Feststellung')) : '';
    let ang = '';
    if (modus === 'frei') {
      ang = has(g.freitext) ? sent(g.freitext) : PH('Schilderung ' + x.g.gen);
      if (has(g.standort)) ang += ` Zum Unfallzeitpunkt habe ${x.g.er} sich ${slot(g.standort)} befunden.`;
    } else if (modus === 'abgestellt') {
      const fzRef = x.g.poss('akk', vehicleG(x.fz02)) + ' ' + fzNoun(x.fz02);
      ang = get(d, 'ub02.park.abgestelltVon') === 'andere'
        ? `${cap(x.g.poss('nom', vehicleG(x.fz02)))} ${fzNoun(x.fz02, 'nom')} sei${ab ? ' ' + ab : ''} von einer anderen Person ${ortKurz(d, true)} ${parkArt(d)} worden.`
        : `${x.g.Er} habe ${fzRef}${ab ? ' ' + ab : ''} ${ortKurz(d, true)} ${parkArt(d)}.`;
      const auf = aufmerksamSatz(x, g, rk, 'Später');
      ang += ' ' + (auf || `Bei ${x.g.poss('dat', 'w')} Rückkehr${rk ? ' ' + rk : ''} habe ${x.g.er} das Fahrzeug beschädigt vorgefunden.`);
      if (has(g.standort)) ang += ` Zum Unfallzeitpunkt habe ${x.g.er} sich ${slot(g.standort)} befunden${g.sichtkontakt === 'ja' ? ' und Sichtkontakt zum Fahrzeug gehabt' : g.sichtkontakt === 'nein' ? ' und keinen Sichtkontakt zum Fahrzeug gehabt' : ''}.`;
      if (g.zwischenzeit === 'ja') ang += ` In der Zwischenzeit habe ${x.g.er} Folgendes festgestellt: ${has(g.zwischenzeitText) ? sent(g.zwischenzeitText) : PH('Zwischenfeststellung')}`;
      else if (g.zwischenzeit === 'nein') ang += ` Zwischenzeitlich habe ${x.g.er} das Fahrzeug nicht gesehen.`;
      ang += ` ${x.g.Er} gehe davon aus, dass ${zr ? 'in diesem Zeitraum' : 'in der Zwischenzeit'} ein bislang unbekannter Verkehrsteilnehmer das Fahrzeug beschädigt und sich anschließend entfernt habe, ohne die erforderlichen Feststellungen zu ermöglichen.`;
    } else if (x.istFz) {
      const fzRef = x.g.poss('akk', vehicleG(x.fz02)) + ' ' + fzNoun(x.fz02);
      ang = `${x.g.Er} habe ${fzRef} ${zeitPhrase(d)} ${ortKurz(d)} geführt, als es zu einem Zusammenstoß mit einem anderen Fahrzeug gekommen sei. Dessen ${x.f.g === 'w' ? 'Führerin' : 'Führer'} habe sich anschließend vom Unfallort entfernt.`;
    } else {
      ang = `${x.g.Er} habe die Beschädigung${rk ? ' ' + rk : ''} festgestellt.`;
      const auf = aufmerksamSatz(x, g, rk, 'Zuvor');
      if (auf && g.aufmerksam !== 'selbst') ang = auf;
      if (has(g.standort)) ang += ` Zum Unfallzeitpunkt habe ${x.g.er} sich ${slot(g.standort)} befunden.`;
    }
    if (has(g.ergaenzung) && modus !== 'frei') ang += ' ' + sent(g.ergaenzung);
    const nach = [];
    const sch = num(g.schaden);
    if (sch != null) nach.push(`Den entstandenen Schaden bezifferte ${x.g.er} auf ca. ${euro(sch)}.`);
    const alt = { nein: `Altschäden an den betroffenen Stellen schloss ${x.g.er} aus.`, ja: `${x.g.Er} räumte ein, dass es sich teilweise um Altschäden handeln könne.`, unsicher: `Ob es sich teilweise um Altschäden handeln könnte, konnte ${x.g.er} nicht sicher sagen.` }[g.altschaden];
    if (alt && x.istFz) nach.push(alt);
    return B(kopf, bel + '\n' + ang.replace(/\s+/g, ' ').trim(), nach.join(' '));
  }

  /* ---------- 3.2 Zeugen ---------- */
  function zeugenText(d) {
    const x = ctx(d);
    if (!x.zeugen.length) return get(d, 'zg.vorhanden') === 'ja' ? PH('Zeugen erfassen') : 'Unmittelbare Unfallzeugen konnten nicht festgestellt werden.';
    return x.zeugen.map(({ z, p, nr }) => {
      const t = [];
      const knall = p.g === 'w' ? 'Knallzeugin' : 'Knallzeuge';
      t.push({ sicht: `${p.FirstNom} beobachtete den Unfall unmittelbar.`, knall: `${p.FirstNom} wurde durch ein Anstoßgeräusch auf den Vorfall aufmerksam (${knall}).`, nachher: `${p.FirstNom} traf nachträgliche Feststellungen; den Unfall selbst nahm ${p.er} nicht wahr.` }[z.art] || `${p.FirstNom}:`);
      if (z.mitteiler === 'ja') t.push(`${p.Er} verständigte die Polizei.`);
      if (z.art !== 'nachher') {
        const ent = num(z.entfernung);
        const sicht = z.art === 'sicht' ? { frei: 'mit freier Sicht auf die Unfallstelle', eingeschraenkt: 'mit eingeschränkter Sicht auf die Unfallstelle' }[z.sicht] : '';
        const teile = [has(z.standort) ? slot(z.standort) : '', ent != null ? 'in ca. ' + ent + ' m Entfernung' : '', sicht].filter(Boolean);
        if (teile.length) t.push(`Zum Unfallzeitpunkt befand ${p.er} sich ${teile.join(', ')}.`);
      }
      const bel = z.belehrt === 'ja' ? `Nach zeugenschaftlicher Belehrung gab ${p.er} sinngemäß an:` : z.belehrt === 'nein' ? `Bei der informatorischen Befragung gab ${p.er} sinngemäß an:` : `${PH('Belehrung')} ${p.Er} gab sinngemäß an:`;
      const nachText = [];
      if (z.art !== 'nachher') {
        const we = { ja: `${p.Er} würde den Fahrzeugführer bzw. das Fahrzeug wiedererkennen.`, evtl: `${p.Er} hält ein Wiedererkennen für möglich.`, nein: `${p.Er} könnte den Fahrzeugführer bzw. das Fahrzeug nicht wiedererkennen.` }[z.wiedererkennen];
        if (we) nachText.push(we);
      }
      if (z.medien === 'ja') nachText.push(`${p.Er} fertigte Foto- bzw. Videoaufnahmen${z.medienGesichert === 'ja' ? ', die übernommen und gesichert wurden' : ''}.`);
      const er = { telefon: `${p.Er} war nur telefonisch erreichbar; eine nachträgliche Kontaktaufnahme ist erforderlich.`, spaeter: `${p.Er} ist nachträglich zu kontaktieren.` }[z.erreichbar];
      if (er) nachText.push(er);
      return `${nr}\n${t.join(' ')} ${bel}\n${has(z.angaben) ? sent(z.angaben) : PH('Angaben')}${nachText.length ? '\n' + nachText.join(' ') : ''}`;
    }).join('\n\n');
  }

  /* ---------- 3.3 Dritte ---------- */
  function dritteText(d) {
    const dr = get(d, 'dritte') || {};
    if (dr.vorhanden === 'ja') return has(dr.text) ? sent(dr.text) : PH('Angaben Dritter');
    return 'Sonstige Angaben Dritter liegen nicht vor.';
  }

  /* ======================= 4 Zusammenfassung und eigene Schlussfolgerungen ======================= */
  /* ---------- Hinweise auf den Verursacher (Teil von 4.1) ---------- */
  function hinweiseText(d, x) {
    const t = get(d, 'taeter') || {};
    if (!x.hinweise) return has(t.hinweise) ? 'Hinweise auf den Unfallverursacher bzw. das Verursacherfahrzeug ergaben sich nicht.' : PH('Hinweise auf den Verursacher: ja/nein');
    const out = [];
    const qs = arr(t.quelle);
    const ang = [qs.includes('zeuge') ? (x.zeugen.length === 1 ? x.zeugen[0].p.gen + ' (' + x.zeugen[0].nr + ')' : 'der Zeugen') : '', qs.includes('gesch') ? x.g.gen : ''].filter(Boolean);
    const Q = { zettel: 'einem am Fahrzeug hinterlassenen Zettel', kamera: 'Videoaufzeichnungen', teile: 'aufgefundenen Fahrzeugteilen', spuren: 'dem Spurenbild', selbst: 'der Selbstmeldung des Verursachers' };
    const q = [ang.length ? 'den Angaben ' + joinList(ang) : '', ...qs.map(k => Q[k])].filter(Boolean);
    out.push(`Hinweise auf den Unfallverursacher ergaben sich${q.length ? ' aus ' + joinList(q) : ''}.`);
    const f = t.fz || {};
    if (has(f.art) || has(f.marke) || has(f.farbe) || has(f.kz)) {
      out.push(`Bei dem flüchtigen Fahrzeug soll es sich um ${vehicle(f, 'akk', true, true)} handeln.`);
    }
    if (has(f.besonderheiten)) out.push(`Besonderheiten am Fahrzeug: ${slot(f.besonderheiten)}.`);
    if (has(f.fluchtrichtung)) out.push(`Das Fahrzeug entfernte sich ${slot(f.fluchtrichtung)}.`);
    const pe = t.personen || {};
    const n = num(pe.anzahl);
    const fa = { m: 'ein Mann', w: 'eine Frau', u: 'eine Person, deren Geschlecht nicht sicher angegeben werden konnte' }[pe.fahrer];
    if (n === 1) out.push(fa ? `Am Steuer saß ${fa}; weitere Insassen wurden nicht bemerkt.` : 'Im Fahrzeug befand sich nur eine Person.');
    else if (n != null) out.push(`Im Fahrzeug befanden sich ${numWord(n, true)} Personen${fa ? '; am Steuer saß ' + fa : ''}.`);
    else if (fa) out.push(`Am Steuer saß ${fa}.`);
    if (has(pe.beschreibung)) out.push(`${x.f.Nom} wurde beschrieben als ${slot(pe.beschreibung)}.`);
    const we = { ja: `${x.f.Nom} würde nach den Angaben wiedererkannt werden.`, evtl: `Ein Wiedererkennen ${x.f.gen} wird für möglich gehalten.`, nein: `Ein Wiedererkennen ${x.f.gen} ist nach den Angaben nicht möglich.` }[pe.wiedererkennen];
    if (we) out.push(we);
    const v = t.verhalten || {};
    const vh = [];
    if (v.angehalten === 'ja') {
      const a = [v.ausgestiegen === 'nein' ? 'hielt nach dem Anstoß zunächst an, ohne auszusteigen' : 'hielt nach dem Anstoß zunächst an'];
      if (v.ausgestiegen === 'ja') a.push('stieg aus', 'sah sich den Schaden an');
      const wz = num(v.wartezeit);
      if (wz != null) a.push('verblieb ' + (wz === 0 ? 'nur wenige Augenblicke' : 'ca. ' + wz + ' Minute' + (wz === 1 ? '' : 'n')) + ' vor Ort');
      a.push('entfernte sich dann');
      vh.push(`${x.f.Nom} ${a.slice(0, -1).join(', ')} und ${a[a.length - 1]}.`);
    } else if (v.angehalten === 'nein') vh.push(`${x.f.Nom} hielt nach dem Anstoß nicht an und setzte die Fahrt unmittelbar fort.`);
    if (v.aufgefordert === 'ja') {
      let von = slot(v.aufgefordertVon);
      if (/^(den|die) geschädigten?$|^die geschädigte person$/i.test(von)) von = x.g.akk;
      vh.push(`${x.f.Er} wurde${von ? (/^(von|vom|durch)\s/i.test(von) ? ' ' + von : ' durch ' + von) : ''} aufgefordert, am Unfallort zu bleiben, kam dem jedoch nicht nach.`);
    } else if (v.aufgefordert === 'nein') vh.push('Eine Aufforderung, am Unfallort zu bleiben, erfolgte nicht.');
    if (v.zettel === 'ja') vh.push(`${x.f.Nom} hinterließ am Fahrzeug ${x.g.gen} einen Zettel${has(v.zettelText) ? '; darauf war vermerkt: ' + slot(v.zettelText) : ''}.`);
    else if (v.zettel === 'nein') vh.push(`Einen Zettel mit Kontaktdaten hinterließ ${x.f.er} nicht.`);
    if (v.geraeusch === 'ja') vh.push(`Nach den Angaben war der Anstoß so deutlich wahrnehmbar, dass er ${x.f.dat} nicht entgangen sein dürfte.`);
    else if (v.geraeusch === 'nein') vh.push(`Ob ${x.f.nom} den Anstoß bemerkt hat, ist nach den Angaben fraglich.`);
    if (num(v.tempo) != null) vh.push(`Die Geschwindigkeit des Verursacherfahrzeugs wurde auf ca. ${num(v.tempo)} km/h geschätzt.`);
    if (v.alkohol === 'ja') vh.push(`Geschildert wurden Anzeichen für eine Beeinflussung ${x.f.gen} durch Alkohol oder Drogen.${has(v.alkoholText) ? ` Dies zeigte sich an ${slot(v.alkoholText)}.` : ''}`);
    else if (v.alkohol === 'nein') vh.push('Anzeichen für eine Beeinflussung durch Alkohol oder Drogen wurden nicht geschildert.');
    return B(out.join(' '), vh.join(' '));
  }
  /* ---------- 4.1 Deutung und Zuordnung ---------- */
  function deutung(d) {
    const x = ctx(d), b = get(d, 'bewertung') || {}, e = get(d, 'taeter.ermittlung') || {};
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const out = [];
    const hoehen = teile.map(t => [num(t.von), num(t.bis)]).filter(h => h[0] != null || h[1] != null);
    const hmin = hoehen.length ? Math.min(...hoehen.map(h => Math.min(...h.filter(v => v != null)))) : null;
    const hmax = hoehen.length ? Math.max(...hoehen.map(h => Math.max(...h.filter(v => v != null)))) : null;
    const hs = hmin != null ? (hmin === hmax ? `von ca. ${hmin} cm` : `von ${hmin} bis ${hmax} cm`) : '';
    const verl = [...new Set(teile.map(t => t.verlauf).filter(Boolean))];
    const vs = verl.length === 1 ? { punktuell: 'punktueller Charakter', horizontal: 'horizontaler Verlauf', vertikal: 'vertikaler Verlauf', diagonal: 'diagonaler Verlauf', flaechig: 'flächiger Charakter' }[verl[0]] : '';
    const wo = teile.length ? ' (' + joinList(teile.map(t => t.name)) + ')' : '';
    const art = { rangieren: 'einen Anstoß durch ein rangierendes bzw. ein- oder ausparkendes Fahrzeug', vorbeifahrt: 'einen Streifkontakt mit einem vorbeifahrenden Fahrzeug', tuer: 'das Anschlagen der Tür eines daneben abgestellten Fahrzeugs', wagen: 'einen Anstoß durch einen Einkaufs- oder Handwagen', auffahren: 'einen Anstoß durch ein auffahrendes bzw. anfahrendes Fahrzeug' }[b.hergangArt];
    if (art) {
      const bez = teile.length === 1 ? 'der Beschädigung' : 'der Beschädigungen';
      const subj = hs && vs ? `Die Anstoßhöhe ${bez}${wo} ${hs} und ihr ${vs}` : hs ? `Die Anstoßhöhe ${bez}${wo} ${hs}` : vs ? `Der ${vs.replace('r ', ' ')} ${bez}${wo}` : `Das Spurenbild${teile.length ? ' ' + bez + wo : ''}`;
      out.push(`${subj} ${hs && vs ? 'sprechen' : 'spricht'} für ${art}.`);
    } else if (b.hergangArt === 'unklar') out.push('Aus dem Spurenbild lässt sich der Entstehungsvorgang der Beschädigungen nicht eindeutig ableiten.');
    const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
    if (farben.length) out.push(`Die Fremdlackanhaftungen in der Farbe ${joinList(farben, 'bzw.')} lassen auf ein entsprechend lackiertes Verursacherfahrzeug schließen.`);
    if (x.angetroffen) {
      const korr = { ja: `Das Schadensbild am Fahrzeug UB 01 korrespondiert in Anstoßhöhe und Verlauf mit den Beschädigungen am Fahrzeug ${x.g.gen}.`, teils: `Das Schadensbild am Fahrzeug UB 01 korrespondiert nur teilweise mit den Beschädigungen am Fahrzeug ${x.g.gen}.`, nein: `Das Schadensbild am Fahrzeug UB 01 korrespondiert nicht mit den Beschädigungen am Fahrzeug ${x.g.gen}.`, offen: `Ob das Schadensbild am Fahrzeug UB 01 mit den Beschädigungen am Fahrzeug ${x.g.gen} korrespondiert, konnte vor Ort nicht abschließend beurteilt werden.` }[e.schadenKorr];
      if (korr) out.push(korr);
    }
    const manip = has(b.manipulationText) ? ' (Anhaltspunkte: ' + slot(b.manipulationText) + ')' : '';
    const man = { nein: 'Anhaltspunkte für einen vorgetäuschten oder manipulierten Verkehrsunfall ergaben sich nicht.', vermutung: `Es besteht die Vermutung, dass der Unfall vorgetäuscht bzw. manipuliert worden sein könnte${manip}. Dies wird der Sachbearbeitung mit gesondertem Vermerk mitgeteilt.`, konkret: `Es bestehen konkrete Verdachtsmomente für einen vorgetäuschten bzw. manipulierten Unfall${manip}. Die betreffende Person wurde als Beschuldigte belehrt; der Sachverhalt wird gesondert angezeigt.` }[b.manipulation];
    return B(hinweiseText(d, x), P(...out), man || '');
  }
  /* ---------- 4.2 Vermutlicher Unfallhergang ---------- */
  function hergang(d) {
    const x = ctx(d), b = get(d, 'bewertung') || {};
    const ue = {
      stimmig: 'Da die Aussagen der Beteiligten und Zeugen sowie das festgestellte Spurenbild übereinstimmen, kann davon ausgegangen werden, dass sich der Unfall wie folgt ereignet hat:',
      teils: 'Die Aussagen stimmen mit dem Spurenbild nur teilweise überein. Aufgrund der Unfallspuren und Beschädigungen dürfte sich der Unfall wie folgt ereignet haben:',
      widerspruch: 'Aufgrund der widersprüchlichen Aussagen kann der Unfallhergang aus Sicht der aufnehmenden Polizei nicht eindeutig geklärt werden. Nach dem Spurenbild ist folgender Hergang am wahrscheinlichsten:',
      keine: 'Aussagen zum Unfallhergang liegen nicht vor. Aufgrund der Unfallspuren und Beschädigungen dürfte sich der Unfall wie folgt ereignet haben:'
    }[b.uebereinstimmung] || 'Aus polizeilicher Sicht dürfte sich der Unfall wie folgt ereignet haben:';
    return ue + '\n' + (has(b.hergang) ? sent(b.hergang) : autoHergang(x, b));
  }
  function autoHergang(x, b) {
    const d = x.d;
    const kz = has(x.fz01.kz);
    const fzBekannt = has(x.fz01.art) || has(x.fz01.marke) || kz;
    let ver;
    if (b.hergangArt === 'wagen') ver = x.ermittelt ? x.b.firstNom : 'eine bislang unbekannte Person';
    else if (x.ermittelt) ver = `${x.b.firstNom} als ${fuehrer(x.b)} ${vehicle(x.fz01, 'gen', true)}`;
    else if (x.hinweise && fzBekannt) ver = `der bislang unbekannte Führer ${vehicle(x.fz01, 'gen', true, !kz)}`;
    else ver = 'ein bislang unbekannter Fahrzeugführer';
    const akt = { rangieren: 'beim Rangieren bzw. Ein- oder Ausparken', vorbeifahrt: 'bei der Vorbeifahrt', tuer: 'beim Öffnen einer Fahrzeugtür', wagen: 'mit einem Einkaufs- bzw. Handwagen', auffahren: 'durch Auffahren bzw. Anfahren' }[b.hergangArt] || 'auf nicht näher bekannte Weise';
    let obj, wo = '';
    if (!x.istFz) { obj = has(get(d, 'ub02.sache')) ? slot(get(d, 'ub02.sache')) : 'eine fremde Sache'; wo = ' ' + ortKurz(d, true); }
    else if (x.geparkt) obj = `${akkPart(x.fz02, ortKurz(d, true), 'abgestellt')} ${x.g.gen}`;
    else { obj = `${vehicle(x.fz02, 'akk', false)} ${x.g.gen}`; wo = ' ' + ortKurz(d, true); }
    const mehr = x.weitere.map(e => (e.w.typ === 'sache' ? (has(e.w.sache) ? slot(e.w.sache) : 'eine weitere Sache') : vehicle(e.w.fz, 'akk', false, true) + ' (' + e.nr + ')'));
    if (mehr.length) obj += ' sowie ' + joinList(mehr);
    return `${cap(zeitPhrase(d))}${wo} beschädigte ${ver} ${akt} ${obj} und entfernte sich anschließend vom Unfallort, ohne die nach § 142 StGB erforderlichen Feststellungen zu ermöglichen.`.replace(/\s+/g, ' ');
  }
  /* ---------- 4.3 Widersprüche ---------- */
  function widersprueche(d) {
    const b = get(d, 'bewertung') || {};
    if (b.widersprueche === 'ja') return has(b.widerspruecheText) ? sent(b.widerspruecheText) : PH('Widersprüche');
    if (b.widersprueche === 'nein') return 'Widersprüche zwischen den Aussagen und dem Spurenbild wurden nicht festgestellt.';
    return PH('Widersprüche: ja/nein');
  }

  /* ======================= 5 Maßnahmen ======================= */
  function massnahmen(d) {
    const x = ctx(d), m = get(d, 'massnahmen') || {}, e = get(d, 'taeter.ermittlung') || {}, b = get(d, 'taeter.person') || {};
    const s1 = [], s2 = [], s3 = [];
    const so = arr(m.sonstige);
    // 5.1 Gefahrenabwehrende / strafprozessuale Maßnahmen
    if (so.includes('verkehr')) s1.push('Die Unfallstelle wurde abgesichert; der Verkehr wurde vorübergehend geregelt.');
    if (so.includes('eigentum')) s1.push('Maßnahmen zur Eigentumssicherung wurden getroffen.');
    if (x.hinweise) {
      if (e.fahndung === 'ja') {
        const A = { nah: 'eine Nahbereichsfahndung', funk: 'eine Funkfahndung über die Leitstelle', sach: 'eine Sachfahndung' };
        const a = arr(e.fahndungArt).map(k => A[k]).filter(Boolean);
        s1.push(`Aufgrund der vorliegenden Hinweise ${a.length > 1 ? 'wurden' : 'wurde'} ${a.length ? joinList(a) : 'eine Fahndung'} eingeleitet.`);
      } else if (e.fahndung === 'nein') s1.push('Fahndungsmaßnahmen wurden mangels ausreichender Hinweise nicht eingeleitet.');
      if (e.halterabfrage === 'ja') {
        const r = { treffer: 'Der Halter konnte ermittelt werden.', passt: 'Der Halter konnte ermittelt werden; das zugelassene Fahrzeug entspricht der Beschreibung.', passtnicht: 'Das zu dem Kennzeichen zugelassene Fahrzeug entspricht nicht der Beschreibung des Verursacherfahrzeugs.', kein: 'Eine Halterfeststellung war anhand des (unvollständigen) Kennzeichens nicht möglich.' }[e.halterErgebnis] || '';
        s1.push(P('Zum Kennzeichen wurde eine Halterabfrage durchgeführt.', r));
      }
      const an = { ja: 'An der Halteranschrift wurden unverzüglich Ermittlungen durchgeführt.', spaeter: 'Ermittlungen an der Halteranschrift wurden veranlasst.', nein: 'Ermittlungen an der Halteranschrift waren nicht möglich bzw. entbehrlich.' }[e.anschrift];
      if (an) s1.push(an + (e.anschrift === 'ja' && e.fzAngetroffen === 'nein' ? ' Das Verursacherfahrzeug wurde dort nicht angetroffen.' : ''));
      if (e.fahrerErmittelt === 'nein') s1.push('Die Person, die das Fahrzeug zum Unfallzeitpunkt führte, konnte bislang nicht ermittelt werden.');
      if (has(e.text)) s1.push(sent(e.text));
    }
    if (m.kamera === 'ja') {
      const k = { keine: 'Eine Kameraüberwachung, die den Unfallort erfasst, ist nicht vorhanden.', vorhanden: 'Die Unfallörtlichkeit wird videoüberwacht; die Sicherung der Aufzeichnungen wurde veranlasst.', gesichert: 'Die Unfallörtlichkeit wird videoüberwacht; die Aufzeichnungen wurden gesichert.', angefragt: 'Die Unfallörtlichkeit wird möglicherweise videoüberwacht; eine Anfrage beim Betreiber läuft.' }[m.kameraErgebnis] || 'Die Unfallörtlichkeit wurde auf eine Kameraüberwachung geprüft.';
      s1.push(k + (m.kameraErgebnis !== 'keine' && has(m.kameraText) ? ` Kamera / Ansprechpartner: ${slot(m.kameraText)}.` : ''));
    } else if (m.kamera === 'nein') s1.push('Eine Prüfung auf Kameraüberwachung erfolgte nicht.');
    if (m.zeugensuche === 'ja') {
      const Z = { anwohner: 'Befragung der Anwohner', umfeld: 'Befragung im Umfeld', zettel: 'Hinterlassen eines Zeugenaufrufs', nachbarfz: 'Überprüfung benachbart abgestellter Fahrzeuge auf korrespondierende Schäden' };
      const z = arr(m.zeugensucheArt).map(k => Z[k]).filter(Boolean);
      s1.push(`Es wurde aktiv nach weiteren Zeugen gesucht${z.length ? ' (' + joinList(z) + ')' : ''}${m.zeugensucheErgebnis === 'keine' ? '; die Suche verlief ergebnislos.' : m.zeugensucheErgebnis === 'hinweise' ? '; hierbei ergaben sich weitere Hinweise.' : '.'}`);
    } else if (m.zeugensuche === 'nein') s1.push('Eine aktive Zeugensuche im Umfeld erfolgte nicht.');
    if (m.asservate === 'ja') s1.push(`Folgende Asservate wurden zum Vorgang genommen: ${has(m.asservateText) ? slot(m.asservateText) + '.' : PH('Asservate')} Die Erfassung erfolgt nach den Erfassungsrichtlinien des Asservatenmanagementsystems (AMS).`);
    if (x.ermittelt) {
      if (b.alkohol === 'ja' && b.blutprobe === 'ja') s1.push(`Bei ${x.b.dat} wurde${has(b.blutprobeZeit) ? ' um ' + fmtTime(b.blutprobeZeit) : ''} eine Blutprobe entnommen (§ 81a StPO)${has(b.blutprobeVon) ? '; die Anordnung erfolgte durch ' + str(b.blutprobeVon) : ''}.`);
      if (b.fs === 'ja' && b.fsMassnahme === 'sichergestellt') s1.push(`Der Führerschein ${x.b.gen} wurde nach freiwilliger Herausgabe sichergestellt${has(b.fsVon) ? ' (angeordnet durch ' + str(b.fsVon) + ')' : ''}. Er verbleibt beim Vorgang und wird mit diesem unverzüglich der Staatsanwaltschaft übersandt.`);
      else if (b.fs === 'ja' && b.fsMassnahme === 'beschlagnahmt') s1.push(`Der Führerschein ${x.b.gen} wurde beschlagnahmt${has(b.fsVon) ? ' (angeordnet durch ' + str(b.fsVon) + ')' : ''}. Er verbleibt beim Vorgang und wird mit diesem unverzüglich der Staatsanwaltschaft zur richterlichen Bestätigung vorgelegt.`);
      if (b.alkohol === 'ja' && b.weiterfahrt === 'ja') s1.push(`Die Weiterfahrt wurde ${x.b.dat} untersagt.`);
      if (b.ausland === 'ja' && b.sicherheit === 'erhoben') s1.push(`Da ${x.b.nom} keinen festen Wohnsitz im Inland hat, wurde eine Sicherheitsleistung${num(b.sicherheitBetrag) != null ? ' in Höhe von ' + euro(b.sicherheitBetrag) : ''} erhoben (§ 132 StPO).`);
    }
    if (m.anzeige === 'ja') s1.push('Eine Verkehrsunfallanzeige wegen des Verdachts des unerlaubten Entfernens vom Unfallort (§ 142 StGB) wurde gefertigt.');
    else if (m.anzeige === 'nein') s1.push('Eine Verkehrsunfallanzeige wurde noch nicht gefertigt.');
    // 5.2 Anforderungen / Benachrichtigungen
    if (!x.erreicht) {
      const BN = { zettel: x.istFz ? `Am Fahrzeug wurde eine Nachricht für ${x.g.akk} hinterlassen.` : `Vor Ort wurde eine Nachricht für ${x.g.akk} hinterlassen.`, nachbar: `Nachbarn bzw. Anwohner wurden gebeten, ${x.g.akk} zu informieren.`, telefon: `Eine telefonische Benachrichtigung ${x.g.gen} wurde versucht.`, schriftlich: `${x.g.Dat} wird die Unfallmitteilung schriftlich übersandt.` };
      const bn = arr(get(d, 'gesch.benachrichtigung')).map(k => BN[k]).filter(Boolean);
      s2.push(bn.length ? bn.join(' ') : `${x.g.FirstNom} konnte bislang nicht benachrichtigt werden.`);
    }
    x.weitere.forEach(({ w, h, nr }) => {
      const r = hasObj(w.halter) ? h.Nom + ' (' + nr + ')' : (w.typ === 'sache' ? 'Der Eigentümer' : 'Der Halter') + ' (' + nr + ')';
      const t = { vorort: `${r} wurde vor Ort informiert.`, nachricht: `Für ${r.replace(/^D/, 'd').replace(/^der /, 'den ')} wurde eine Nachricht hinterlassen.` }[w.info];
      if (t) s2.push(t);
    });
    if (so.includes('vk')) s2.push('Das Verkehrskommissariat wurde informiert.');
    if (so.includes('sta')) s2.push('Die Staatsanwaltschaft wurde informiert.');
    // 5.3 Weitere Veranlassungen
    if (so.includes('sbl')) s3.push('Der Straßenbaulastträger wurde über die Beschädigung informiert.');
    if (so.includes('svb')) s3.push('Die Straßenverkehrsbehörde wurde informiert.');
    if (so.includes('anschluss')) s3.push('Anschlussermittlungen wurden veranlasst.');
    if (has(m.weiteres)) s3.push(sent(m.weiteres));
    return { s1: s1.join(' ') || 'Keine.', s2: s2.join(' ') || 'Keine.', s3: s3.join(' ') || 'Keine.' };
  }

  /* ======================= 6 Sonstiges ======================= */
  function verweise(d) {
    const x = ctx(d), m = get(d, 'massnahmen') || {}, e = get(d, 'taeter.ermittlung') || {};
    const out = [];
    const um = { vorort: `${x.g.Dat} wurde vor Ort eine Durchschrift der Unfallmitteilung ausgehändigt.`, nachgesandt: `Die Unfallmitteilung wird ${x.g.dat} unverzüglich nachgesandt.`, digital: `${x.g.Dat} wurde die Unfallmitteilung in digitaler Form per E-Mail übersandt.`, keine: 'Eine Unfallmitteilung wurde bislang nicht ausgehändigt.' }[m.unfallmitteilung];
    out.push(um || PH('Unfallmitteilung'));
    if (m.lichtbilder === 'ja') {
      const n = num(m.lichtbilderAnzahl);
      const mp = { ja: ' und in einer Lichtbildmappe zusammengefasst, die dem Vorgang beigefügt ist', offen: '; eine Lichtbildmappe wird gefertigt und nachgereicht', nein: '' }[m.mappe] || '';
      out.push(`Es wurden ${n != null ? 'ca. ' + n + ' ' : ''}Lichtbilder von der Unfallörtlichkeit und den Beschädigungen gefertigt${mp}. Die Bilder sind unter dem Aktenzeichen auf dem Bilddatenserver gespeichert.`);
    } else if (m.lichtbilder === 'nein') out.push('Lichtbilder wurden nicht gefertigt.');
    if (m.skizze === 'ja') out.push('Eine Skizze der Unfallörtlichkeit ist dem Vorgang beigefügt.');
    const fb = get(d, 'gesch.fragebogen');
    if (fb === 'ausgefuellt' || fb === 'ja') out.push('Der ausgefüllte Fragebogen zur Verkehrsunfallflucht liegt dem Vorgang bei.');
    else if (fb === 'ausgehaendigt') out.push(`Der Fragebogen zur Verkehrsunfallflucht wurde ${x.g.dat} ausgehändigt; die Rücksendung steht aus.`);
    if (m.kameraErgebnis === 'gesichert') out.push('Die gesicherten Videoaufzeichnungen sind dem Vorgang beigefügt.');
    x.zeugen.filter(z => z.z.medien === 'ja' && z.z.medienGesichert === 'ja').forEach(z => out.push(`Die Aufnahmen ${z.p.gen} (${z.nr}) sind dem Vorgang beigefügt.`));
    if (x.hinweise && e.anschrift === 'spaeter') out.push('Das Ergebnis der Ermittlungen an der Halteranschrift wird mit gesondertem Bericht nachgereicht.');
    if (get(d, 'bewertung.manipulation') === 'vermutung') out.push('Zum Verdacht eines vorgetäuschten bzw. manipulierten Unfalls wurde ein gesonderter Vermerk gefertigt.');
    return out.join(' ');
  }
  function kraefteText(d) {
    const e = get(d, 'einsatz') || {};
    const crew = crewText(get(d, 'einsatz.kraefte'));
    return `${crew || PH('Kräfte')}${has(e.rufname) ? ', Rufname ' + str(e.rufname) : ''}.`;
  }
  function endeText(d) {
    const t = get(d, 'massnahmen.einsatzende');
    return has(t) ? `Ende der Maßnahmen am Unfallort: ${fmtTime(t)}.` : `Ende der Maßnahmen am Unfallort: ${PH('Uhrzeit')}.`;
  }

  /* ======================= Gesamtbericht ======================= */
  /** Abschnitte: [Nummer, Überschrift, Text, Schritt zum Bearbeiten] – Überschriften ohne Text sind Gliederungsebenen. */
  function text(d) {
    const x = ctx(d), M = massnahmen(d);
    return [
      ['1', 'Allgemeines'],
      ['1.1', 'Einsatzübernahme', allg1(d), 'einsatz'],
      ['1.2', 'Erkenntnislage', allg2(d), 'einsatz'],
      ['1.3', 'Eintreffsituation', allg3(d), 'eintreff'],
      ['2', 'Objektiver Befund'],
      ['2.1', 'Ergänzende Angaben zum Unfallort', ort(d), 'ort'],
      ['2.2', 'Spuren auf der Fahrbahn', spurenFahrbahn(d), 'spurenort'],
      ['2.3', 'Spuren in/an den Fahrzeugen', fahrzeuge(d), x.istFz ? 'teile02' : x.angetroffen ? 'teile01' : 'taeterfz'],
      ['2.4', 'Spuren an Personen', personenSpuren(d), x.ermittelt ? 'besch2' : 'lage'],
      ['2.5', 'Spuren an sonstigen Gegenständen', sonstGegenst(d), x.istFz ? 'spurenort' : 'sache02'],
      ['3', 'Subjektiver Befund'],
      ['3.1', 'Unfallschilderung der Beteiligten', beteiligte(d), x.erreicht ? 'geschangaben' : 'gesch'],
      ['3.2', 'Unfallschilderung der Zeugen', zeugenText(d), 'zeugen'],
      ['3.3', 'Sonstige Angaben Dritter', dritteText(d), 'umfeld'],
      ['4', 'Zusammenfassung und eigene Schlussfolgerungen'],
      ['4.1', 'Deutung und Zuordnung der Spuren/Aussagen', deutung(d), 'bewertung'],
      ['4.2', 'Vermutlicher Unfallhergang', hergang(d), 'bewertung'],
      ['4.3', 'Widersprüche', widersprueche(d), 'bewertung'],
      ['5', 'Maßnahmen'],
      ['5.1', 'Gefahrenabwehrende/strafprozessuale Maßnahmen', M.s1, x.hinweise ? 'ermittlung' : 'umfeld'],
      ['5.2', 'Anforderungen/Benachrichtigungen', M.s2, 'massnahmen2'],
      ['5.3', 'Weitere Veranlassungen', M.s3, 'massnahmen2'],
      ['6', 'Sonstiges'],
      ['6.1', 'Verweis auf gesonderte Berichte', verweise(d), 'massnahmen1'],
      ['6.2', 'Eingesetzte Kräfte', kraefteText(d), 'kraefte'],
      ['6.3', 'Einsatzende', endeText(d), 'massnahmen2']
    ];
  }
  /** Reiner Text (zum Kopieren) aus den Abschnitten. */
  function plain(d) {
    const head = `Verkehrsunfallbefundbericht – Verkehrsunfallflucht mit Sachschaden (§ 142 StGB)${has(get(d, 'massnahmen.az')) ? '\nAz.: ' + str(get(d, 'massnahmen.az')) : ''}`;
    return head + '\n\n' + text(d).map(([n, t, body]) => (body == null ? `${n} ${t}` : `${n} ${t}\n${body}`)).join('\n\n');
  }
  /** Vorschau je Schritt: die Abschnitte, die der Schritt füllt. */
  function preview(stepId, d) {
    const st = root.WVUF_STEPS.find(s => s.id === stepId);
    if (!st) return '';
    const g = typeof st.gen === 'function' ? st.gen(d) : st.gen;
    const ids = Array.isArray(g) ? g : [g];
    if (ids.includes('kurz')) return kurz(d);
    return text(d).filter(s => s[2] != null && ids.includes(s[0])).map(s => `${s[0]} ${s[1]}\n${s[2]}`).join('\n\n');
  }

  /* ---------- Personalien (gesondert, nicht im Berichtstext) ---------- */
  function personalien(d) {
    const x = ctx(d);
    const rows = [];
    const fmtP = (label, p, extra = []) => {
      p = p || {};
      const g = { m: 'männlich', w: 'weiblich', d: 'divers' }[p.geschlecht] || '';
      const line = [[str(p.nachname).toUpperCase(), str(p.vorname)].filter(Boolean).join(', ') || PH('Name'), has(p.geb) ? 'geb. ' + fmtDate(p.geb) : '', g, str(p.anschrift), has(p.tel) ? 'Tel. ' + str(p.tel) : '', has(p.email) ? str(p.email) : '', ...extra].filter(Boolean).join(' · ');
      rows.push(`${label}: ${line}`);
    };
    const fzLine = (label, f, frag) => rows.push(`${label}: ${[C.FZ_ART[f.art] ? C.FZ_ART[f.art].n : '', str(f.marke), str(f.modell), str(f.farbe), has(f.kz) ? 'Kz. ' + str(f.kz).toUpperCase() + (frag && f.kzFragment ? ' (Fragment)' : '') : ''].filter(Boolean).join(' ') || PH('Fahrzeug')}`);
    const g = get(d, 'gesch') || {};
    fmtP(x.erreicht ? 'UB 02 (Geschädigte/r)' : (x.istFz ? 'UB 02 (Halter/in, nicht erreicht)' : 'UB 02 (Eigentümer/in, nicht erreicht)'), g, [x.erreicht && has(g.firma) ? (g.rolle === 'zustaendig' ? 'Eigentümer: ' : 'Halter: ') + str(g.firma) : '']);
    if (x.istFz) fzLine('Fahrzeug UB 02', x.fz02);
    if (get(d, 'ub02.park.abgestelltVon') === 'andere') fmtP('Abstellende Person', get(d, 'ub02.park.fahrer'));
    if (x.ermittelt) {
      const b = get(d, 'taeter.person') || {};
      fmtP('UB 01 (Beschuldigte/r)', b, [b.ausland === 'ja' ? 'Wohnsitz im Ausland' : '', b.dolmetscher === 'ja' ? 'Dolmetscher' : '']);
    }
    const tf = x.fz01;
    if (x.hinweise && (has(tf.kz) || has(tf.marke) || has(tf.art))) fzLine('Fahrzeug UB 01', tf, true);
    x.weitere.forEach(({ w, nr }) => {
      fmtP(`${nr} (${w.typ === 'sache' ? 'Eigentümer/in' : 'Halter/in'})`, w.halter);
      if (w.typ === 'sache') rows.push(`Sache ${nr}: ${has(w.sache) ? slot(w.sache) : PH('Sache')}`);
      else fzLine(`Fahrzeug ${nr}`, w.fz || {});
    });
    x.zeugen.forEach(({ z, nr }) => fmtP(nr, z.p, [z.mitteiler === 'ja' ? 'Mitteiler/in' : '', z.art === 'knall' ? 'Knallzeuge/-zeugin' : '']));
    return rows.join('\n');
  }

  /* ---------- Kurzsachverhalt ---------- */
  function kurz(d) {
    const x = ctx(d);
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const w = num(get(d, 'ub02.wert'));
    const s = [autoHergang(x, get(d, 'bewertung') || {})];
    if (teile.length) {
      const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
      s.push(`Beschädigt: ${joinList(teile.map(t => t.name))}${farben.length ? '; Fremdlack ' + joinList(farben, 'bzw.') : ''}.`);
    }
    if (w != null) s.push(`Sachschaden ca. ${euro(w)}.`);
    if (x.weitere.length) s.push(`Weitere Geschädigte: ${x.weitere.map(e => e.nr).join(', ')}.`);
    if (x.hinweise) {
      const f = x.fz01;
      s.push(`Hinweise auf den Verursacher: ${has(f.art) || has(f.marke) || has(f.kz) ? vehicle(f, 'nom', true, true) : 'vorhanden'}${x.ermittelt ? '; Fahrzeugführer ermittelt' : ''}.`);
    } else s.push('Hinweise auf den Verursacher: keine.');
    return s.join(' ');
  }

  /* ---------- Fahndungstext ---------- */
  function fahndung(d) {
    const x = ctx(d);
    if (!x.hinweise) return '';
    const f = x.fz01, pe = get(d, 'taeter.personen') || {}, v = get(d, 'taeter.verhalten') || {};
    const teile = arr(get(d, 'ub02.teile')).filter(t => t && has(t.name));
    const s = [`Verkehrsunfallflucht ${zeitPhrase(d)} ${ortKurz(d)}.`];
    s.push(`Gesucht wird ${has(f.art) || has(f.marke) || has(f.kz) ? vehicle(f, 'nom', true, true) : 'ein ' + PH('Fahrzeug')}${has(f.besonderheiten) ? ', Besonderheiten: ' + slot(f.besonderheiten) : ''}.`);
    if (teile.length) {
      const h = teile.map(t => [num(t.von), num(t.bis)]).filter(q => q[0] != null || q[1] != null);
      const hs = h.length ? (() => { const a = Math.min(...h.map(q => Math.min(...q.filter(n => n != null)))), b = Math.max(...h.map(q => Math.max(...q.filter(n => n != null)))); return a === b ? 'in ca. ' + a + ' cm Höhe' : 'in ' + a + ' bis ' + b + ' cm Höhe'; })() : '';
      const farben = [...new Set(teile.filter(t => t.fremdlack === 'ja' && has(t.farbe)).map(t => cap(str(t.farbe))))];
      s.push(`Am Verursacherfahrzeug sind frische Schäden${hs ? ' ' + hs : ''} zu erwarten${farben.length ? '; Eigenlack vermutlich ' + joinList(farben, 'bzw.') : ''}.`);
    }
    if (has(pe.beschreibung) || pe.fahrer) s.push(`Am Steuer: ${[{ m: 'männlich', w: 'weiblich', u: 'Geschlecht unklar' }[pe.fahrer], slot(pe.beschreibung)].filter(Boolean).join(', ')}${num(pe.anzahl) != null ? '; Personen im Fahrzeug: ' + num(pe.anzahl) : ''}.`);
    if (has(f.fluchtrichtung)) s.push(`Fluchtrichtung: ${slot(f.fluchtrichtung).replace(/^in /, '')}.`);
    if (v.alkohol === 'ja') s.push('Hinweis: mögliche Beeinflussung durch Alkohol oder Drogen.');
    return s.join(' ');
  }

  /* ---------- Offene Punkte (Checkliste aus den Antworten) ---------- */
  function offen(d) {
    const x = ctx(d), o = [];
    const m = get(d, 'massnahmen') || {}, e = get(d, 'einsatz') || {}, t = get(d, 'taeter') || {}, s = get(d, 'spuren.fz') || {}, er = t.ermittlung || {}, b = t.person || {};
    const w = num(get(d, 'ub02.wert'));
    // Sofort
    if (x.hinweise) {
      if (er.fahndung !== 'ja' && !x.ermittelt) o.push('Fahndung prüfen bzw. einleiten (Nahbereich, Funkfahndung, ggf. Sachfahndung) – bei neuen Erkenntnissen aktualisieren.');
      if (has(get(d, 'taeter.fz.kz')) && er.halterabfrage !== 'ja' && !x.ermittelt) o.push('Halterabfrage zum Kennzeichen durchführen.');
      if (er.halterErgebnis === 'passtnicht') o.push('Kennzeichen und Beschreibung abgleichen – das zugelassene Fahrzeug passt nicht (Ablesefehler? Kennzeichenmissbrauch?).');
      if (er.anschrift === 'spaeter' || (['treffer', 'passt'].includes(er.halterErgebnis) && !has(er.anschrift))) o.push('Unverzüglich Ermittlungen an der Halteranschrift: Fahrzeug in Augenschein nehmen, Schäden vergleichen, Fahrzeugführer ermitteln (DA 3.1).');
    }
    if (m.kameraErgebnis === 'vorhanden' || m.kameraErgebnis === 'angefragt') o.push('Videoaufzeichnungen sichern – Speicherfristen beachten.');
    if (m.kamera !== 'ja') o.push('Unfallörtlichkeit auf Kameraüberwachung prüfen (Firmen, Tankstellen, Haltestellen, Dashcams).');
    x.zeugen.forEach(({ z, p, nr }) => {
      if (z.erreichbar === 'telefon' || z.erreichbar === 'spaeter') o.push(`${p.g === 'w' ? 'Zeugin' : 'Zeuge'} ${nr} nachträglich kontaktieren und Aussage aufnehmen.`);
      if (z.medien === 'ja' && z.medienGesichert !== 'ja') o.push(`Fotos bzw. Videos ${p.g === 'w' ? 'der Zeugin' : 'des Zeugen'} ${nr} übernehmen und unter dem Aktenzeichen sichern.`);
    });
    if (m.zeugensuche !== 'ja') o.push('Aktiv nach Zeugen suchen (Anwohner, Umfeld, Nachbarfahrzeuge mit korrespondierenden Schäden).');
    // Geschädigte
    if (!x.erreicht) o.push(x.istFz ? 'Halter/in benachrichtigen, Angaben (Abstellzeit, Altschäden, Fragebogen) nachholen und Unfallmitteilung übersenden.' : 'Eigentümer/in benachrichtigen, Schadenshöhe und Eigentumsverhältnisse klären und Unfallmitteilung übersenden.');
    x.weitere.forEach(({ w: ww, nr }) => { if (ww.info !== 'vorort' && ww.info !== 'nachricht') o.push(`Geschädigte/n ${nr} benachrichtigen und Unfallmitteilung übersenden.`); });
    if (get(d, 'gesch.fragebogen') === 'ausgehaendigt') o.push('Rücklauf des Fragebogens zur Verkehrsunfallflucht überwachen.');
    // Ort
    if (e.aufnahmeort === 'wache' && e.unfallstelleAufgesucht !== 'ja') o.push('Unfallstelle aufsuchen (lassen) – Spurenbild mit dem Sachverhalt abgleichen (DA 3.1).');
    if (get(d, 'ort.oeffentlich') === 'nein') o.push('Öffentlicher Verkehrsraum fraglich – Anwendbarkeit des § 142 StGB prüfen; ggf. zivilrechtliche Regulierung bzw. andere Straftatbestände prüfen.');
    else if (get(d, 'ort.oeffentlich') === 'unklar') o.push('Öffentlichen Verkehrsraum klären (tatsächliche Zugänglichkeit, Beschilderung, Schranken).');
    // Spuren
    if (s.spurfix !== 'ja' && x.istFz) o.push('Spurensicherungsfolie an den Berührungspunkten aufbringen (auch bei Regen sinnvoll), nummerieren und fotografieren.');
    if (s.lackprobe !== 'ja' && arr(get(d, 'ub02.teile')).some(p => p && p.fremdlack === 'ja')) o.push('Fremdlack gesondert sichern (Schneiden oder Ausheben, Pergamintüte) – nur so ist eine LKA-Materialuntersuchung möglich.');
    if (w != null && w >= 1300) o.push('Bedeutender Schaden (ab ca. 1.300 €): Lacksplitter bzw. -anriebe für eine Materialuntersuchung beim LKA vorhalten.');
    // Beschuldigte/r
    if (x.ermittelt) {
      if (er.weg === 'selbst') {
        if (x.fahrend) o.push('Selbstmeldung: Tätige Reue (§ 142 Abs. 4 StGB) scheidet aus – der Unfall geschah im fließenden Verkehr. Zeitpunkt der Meldung trotzdem festhalten.');
        else if (w != null && w >= 1300) o.push('Selbstmeldung: Tätige Reue (§ 142 Abs. 4 StGB) scheidet voraussichtlich aus – der Sachschaden gilt ab ca. 1.300 € als bedeutend. Zeitpunkt der Meldung festhalten.');
        else o.push('Tätige Reue prüfen lassen (§ 142 Abs. 4 StGB): Meldung binnen 24 Stunden, Unfall außerhalb des fließenden Verkehrs, nur nicht bedeutender Sachschaden – Zeitpunkt der Meldung im Vorgang festhalten.');
      }
      if (b.fs === 'keine') o.push('Fahren ohne Fahrerlaubnis (§ 21 StVG) gesondert anzeigen.');
      if (b.alkohol === 'ja' && b.blutprobe !== 'ja') o.push('Bei Anzeichen für Alkohol- oder Drogeneinfluss: Blutprobe (§ 81a StPO) und Tatbestände nach § 316 StGB bzw. § 24a StVG prüfen.');
      if (b.fs === 'ja' && ['sichergestellt', 'beschlagnahmt'].includes(b.fsMassnahme)) o.push(`Führerschein beim Vorgang belassen und mit diesem unverzüglich der StA übersenden${b.fsMassnahme === 'beschlagnahmt' ? '; Beschlagnahme binnen drei Tagen richterlich bestätigen lassen' : ''} (DA 2.2).`);
      else if (w != null && w >= 1300 && b.fs === 'ja') o.push('Bedeutender Schaden: Entziehung der Fahrerlaubnis (§ 69 Abs. 2 Nr. 3 StGB) kommt in Betracht – Sicherstellung des Führerscheins mit der StA abstimmen.');
      if (b.ausland === 'ja' && b.sicherheit !== 'erhoben') o.push('Sicherheitsleistung (§ 132 StPO) prüfen; Vordruck NW 2f inkl. schriftlicher Vernehmung.');
      if (b.belehrt !== 'ja') o.push('Beschuldigtenbelehrung nachholen bzw. dokumentieren.');
    }
    // Dokumentation
    if (!has(m.unfallmitteilung) || m.unfallmitteilung === 'keine') o.push('Unfallmitteilung aushändigen bzw. nachsenden (DA 1.1).');
    if (m.unfallmitteilung === 'nachgesandt') o.push('Unfallmitteilung nachsenden; vorher den Kurzsachverhalt aus der ViVA-Kurzbeschreibung löschen; Versand im VU-Text vermerken (DA 1.1).');
    if (m.lichtbilder !== 'ja') o.push('Lichtbilder fertigen (Übersicht, Detail mit Maßstab) – bei Verkehrsunfallflucht Pflicht (DA 1.4/1.5).');
    if (m.lichtbilder === 'ja' && m.mappe !== 'ja' && m.mappe !== 'nein') o.push('Lichtbildmappe fertigen: PDF unter ViVA-Az. im Ordner „Bildmappen“, Farbausdruck zwei Bilder je Seite zum Vorgang, unterschreiben (DA 1.5).');
    if (m.asservate === 'ja') o.push('Asservate im AMS erfassen; Verbleib dokumentieren.');
    if (m.anzeige !== 'ja') o.push('Verkehrsunfallanzeige (§ 142 StGB) fertigen.');
    if (get(d, 'bewertung.manipulation') === 'vermutung') o.push('Gesonderten Vermerk zum Manipulationsverdacht an die Sachbearbeitung fertigen (DA 3.6).');
    if (x.hinweise && !arr(m.sonstige).includes('anschluss') && !x.ermittelt) o.push('Anschlussermittlungen im VU-Text ausdrücklich vermerken.');
    return o;
  }

  /* ---------- Liste ---------- */
  function title(d) {
    const o = get(d, 'ort') || {};
    const ortS = [str(o.strasse), str(o.hausnr)].filter(Boolean).join(' ') || (has(o.zugehoerigkeit) ? ({ parkhaus: 'Parkhaus', parkplatz: 'Parkplatz' }[o.art] || 'Fläche') + ' ' + slot(o.zugehoerigkeit) : '');
    const z = get(d, 'zeit') || {};
    const dat = z.art === 'zeitpunkt' ? fmtDate(z.datum) : z.art === 'zeitraum' ? fmtDate(z.bisDatum || z.vonDatum) : fmtDate(get(d, 'einsatz.datum'));
    return ['VUF', ortS, has(o.stadt) ? str(o.stadt) : '', dat].filter(Boolean).join(' · ') || 'Verkehrsunfallflucht';
  }
  function subtitle(d) {
    const f = get(d, 'ub02.fz') || {};
    const v = get(d, 'ub02.typ') === 'sache' ? (has(get(d, 'ub02.sache')) ? slot(get(d, 'ub02.sache')) : 'Sache') : [C.FZ_ART[f.art] ? C.FZ_ART[f.art].n : '', str(f.marke), str(f.modell), has(f.kz) ? str(f.kz).toUpperCase() : ''].filter(Boolean).join(' ');
    const h = get(d, 'taeter.hinweise') === 'ja' ? (get(d, 'taeter.ermittlung.fahrerErmittelt') === 'ja' ? 'Verursacher ermittelt' : 'mit Hinweisen') : get(d, 'taeter.hinweise') === 'nein' ? 'ohne Hinweise' : '';
    return [v, h].filter(Boolean).join(' · ');
  }

  root.WVUF = Object.freeze({
    id: 'vuf', name: 'Verkehrsunfallflucht ohne Personenschaden', short: 'VUF Sachschaden', kurz: 'VUF',
    steps: root.WVUF_STEPS, text, plain, preview, kurzText: kurz, fahndung, offen, personalien, title, subtitle, ctx,
    hergangVorschlag: d => autoHergang(ctx(d), get(d, 'bewertung') || {})
  });
})(typeof window !== 'undefined' ? window : globalThis);
