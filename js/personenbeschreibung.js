/*
 * Workoholic · Zusatzbaustein „Personenbeschreibung“
 * ---------------------------------------------------------------
 * Geführte Abfrage vor Ort: Jemand steht vor dir und kann eine Person beschreiben. Je Beschreibung gibt es eine Übersicht der
 * Überpunkte – man sieht, was wo gefragt wird, und tippt entweder nur an, wozu es Angaben gibt, oder fragt alles der Reihe
 * nach ab („Zurück / Weiter“). Nichts wird vergessen, und niemand muss sich durch Folien drücken, zu denen es nichts gibt.
 *
 * Die Reihenfolge folgt dem, was man an einem Menschen zuerst wahrnimmt und was Zeuginnen und Zeugen am häufigsten angeben
 * können: erst der Gesamteindruck (Geschlecht, Alter, Größe, Statur, Erscheinungsbild), dann der Kopf (Haare, Bart), danach,
 * was jemand an sich trägt (Bekleidung, besondere Merkmale). Was zusammengehört, steht auf einer Folie – Haarlänge, Haarfarbe
 * und Frisur werden zusammen gefragt, nicht verstreut.
 *
 * Die Ausgabe ist genauso gegliedert: „Körperliche Merkmale“ (was zum Menschen selbst gehört) und „Bekleidung und besondere
 * Merkmale“ – als Liste (Vorgabe: übersichtlich und als reiner Text in jedes andere Programm kopierbar) oder als Fließtext:
 *   Frau Müller beschrieb den Täter wie folgt:
 *   Körperliche Merkmale:
 *   – Geschlecht: männlich
 *   – Alter: 30 bis 35 Jahre
 *   Bekleidung und besondere Merkmale:
 *   – Bekleidung: dunkel gekleidet
 *   Weitere Angaben zu dem Täter konnten nicht gemacht werden.
 * Was nicht beantwortet wird, steht nicht im Text und wird nicht verneint – dafür gibt es den einen Schlusssatz.
 *
 * Im Vorgang steht der Abschnitt ganz vorn – er wird zuerst aufgenommen und ist sofort kopierbar. Die Beschreibung gehört
 * zunächst zu niemandem; der eingetragene Name dient der eigenen Zuordnung. In den Schilderungen lässt sie sich später bei
 * der Person übernehmen, die sie abgegeben hat (js/schilderung.js, Folie „Hat … jemanden beschrieben?“). Dann steht sie dort mit der
 * Person als Satzgegenstand („Die Zeugin Müller beschrieb den Täter wie folgt: …“) und im Gesamtsachverhalt nicht doppelt.
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
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const klein = s => s.charAt(0).toLowerCase() + s.slice(1);
  /** Vergleich unabhängig von der Reihenfolge der Schlüssel – der Tresor legt Objekte sortiert ab. */
  const stabil = v => (Array.isArray(v) ? '[' + v.map(stabil).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stabil(v[k])).join(',') + '}' : JSON.stringify(v ?? null));
  const same = (a, b) => stabil(a) === stabil(b);
  const num = v => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  /** Freitext als Stichworte mit Komma: Leerraum geglättet, ohne Satzzeichen am Rand. Zahlen wie „1,80“ bleiben, wie sie sind. */
  const frei = s => str(s).replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, (m, at, t) => (/\d$/.test(t.slice(0, at)) && /^\d/.test(t.slice(at + m.length)) ? ',' : ', '))
    .replace(/^[\s,;]+|[\s.,;]+$/g, '');
  const mit = (...t) => t.filter(Boolean).join(', ');
  const nur = (l, x) => (x ? `${l}: ${x}` : '');

  /* ======================= Kataloge ======================= */
  /**
   * Die Überpunkte der Abfrage in der Reihenfolge der Folien – vom Gesamteindruck zum Einzelnen, vom Kopf abwärts.
   *   gr     'A' = gehört zum Menschen selbst (körperliche Merkmale) · 'B' = was jemand an sich trägt oder hat
   *   fragt  was auf der Folie gefragt wird – steht in der Übersicht, solange der Punkt offen ist
   */
  const PUNKTE = [
    { k: 'wer', l: 'Wer beschreibt wen?', fragt: 'Name für deine Zuordnung · Bezeichnung im Text' },
    { k: 'ga', gr: 'A', l: 'Geschlecht und Alter', fragt: 'Männlich oder weiblich · Alter' },
    { k: 'gs', gr: 'A', l: 'Größe und Statur', fragt: 'Körpergröße · Statur' },
    { k: 'ph', gr: 'A', l: 'Erscheinungsbild', fragt: 'Phänotyp · Weiteres zum Aussehen' },
    { k: 'haar', gr: 'A', l: 'Haare', fragt: 'Länge · Farbe · Frisur' },
    { k: 'bart', gr: 'A', l: 'Bart', fragt: 'Art · Farbe' },
    { k: 'kl', gr: 'B', l: 'Bekleidung', fragt: 'Einzelheiten von oben nach unten' },
    { k: 'bm', gr: 'B', l: 'Besondere Merkmale', fragt: 'Narben, Tätowierungen, Brille, Schmuck, Mitgeführtes' },
    { k: 'ab', l: 'Abschluss', fragt: 'Keine weiteren Angaben · Wahllichtbildvorlage' }
  ];
  /** Die zwei Blöcke der Ausgabe. */
  const GRUPPE = { A: 'Körperliche Merkmale', B: 'Bekleidung und besondere Merkmale' };
  /** Die einzelnen Merkmale (für „was blieb offen“): [Schlüssel, Bezeichnung in der Liste]. */
  const MERKMALE = [['g', 'Geschlecht'], ['alter', 'Alter'], ['gr', 'Größe'], ['statur', 'Statur'], ['phaeno', 'Erscheinungsbild'], ['haar', 'Haare'], ['bart', 'Bart'], ['kl', 'Bekleidung'], ['bm', 'Besondere Merkmale']];
  /**
   * Spannen (Alter, Größe): Leiste von min bis max mit zwei Markierungen – am Rand heißt „keine Angabe“ –, grob = Raster der
   * Leiste (beim Festhalten wird sie feiner, bis auf 1), ca = Werte der Circa-Auswahl. Dazu die Satzteile.
   */
  const reihe = (a, b, s) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (x, i) => a + i * s);
  const SPANNE = {
    alter: {
      l: 'Alter', min: 10, max: 80, grob: 5, ca: reihe(10, 80, 5), einheit: 'Jahre', fein: 'auf das Jahr genau',
      text: { ca: c => `etwa ${c} Jahre alt`, vb: (a, b) => `${a} bis ${b} Jahre alt`, ab: a => `mindestens ${a} Jahre alt`, bis: b => `höchstens ${b} Jahre alt` }
    },
    gr: {
      l: 'Größe', min: 160, max: 210, grob: 5, ca: reihe(160, 210, 5), einheit: 'cm', fein: 'auf den Zentimeter genau',
      text: { ca: c => `ca. ${c} cm groß`, vb: (a, b) => `${a} bis ${b} cm groß`, ab: a => `mindestens ${a} cm groß`, bis: b => `höchstens ${b} cm groß` }
    }
  };
  /** Statur als Skala von schmal nach kräftig: [Schlüssel, Chip, im Text vor „Statur“]. */
  const STATUR = [['hager', 'Hager', 'hagere'], ['schmaechtig', 'Schmächtig', 'schmächtige'], ['schlank', 'Schlank', 'schlanke'], ['normal', 'Normal', 'normale'], ['sportlich', 'Sportlich', 'sportliche'], ['kraeftig', 'Kräftig', 'kräftige'], ['staemmig', 'Stämmig', 'stämmige'], ['korpulent', 'Korpulent', 'korpulente']];
  /**
   * Erscheinungsbild: neutrale, geografische Bezeichnungen, wie sie die polizeilichen Kataloge zum „Phänotypus“ führen
   * (vgl. Abgeordnetenhaus Berlin, Drs. 17/14582) – dazu das im Bericht übliche „mitteleuropäisch“. [Schlüssel, Chip, im Text].
   */
  const PHAENO = [['meu', 'mitteleuropäisch'], ['neu', 'nordeuropäisch'], ['oeu', 'osteuropäisch'], ['soeu', 'südosteuropäisch'], ['seu', 'südeuropäisch'], ['naf', 'nordafrikanisch'], ['was', 'westasiatisch'], ['sas', 'südasiatisch'], ['oas', 'ostasiatisch'], ['afr', 'afrikanisch'], ['msam', 'mittel-/südamerikanisch', 'mittel- oder südamerikanisch']];
  /** Haar- und Bartfarbe: [Schlüssel, Chip, vor „Haare“, vor „Bart“]. */
  const FARBE = [['hell', 'hell', 'helle', 'heller'], ['blond', 'blond', 'blonde', 'blonder'], ['dblond', 'dunkelblond', 'dunkelblonde', 'dunkelblonder'], ['rot', 'rot', 'rote', 'roter'], ['braun', 'braun', 'braune', 'brauner'], ['dbraun', 'dunkelbraun', 'dunkelbraune', 'dunkelbrauner'], ['schwarz', 'schwarz', 'schwarze', 'schwarzer'], ['dunkel', 'dunkel', 'dunkle', 'dunkler'], ['grau', 'grau', 'graue', 'grauer'], ['weiss', 'weiß', 'weiße', 'weißer']];
  /** Haarlänge: [Schlüssel, Chip, vor „Haare“] – Glatze steht für sich. */
  const LAENGE = [['glatze', 'Glatze', ''], ['sk', 'Sehr kurz', 'sehr kurze'], ['kurz', 'Kurz', 'kurze'], ['mittel', 'Mittellang', 'mittellange'], ['schulter', 'Schulterlang', 'schulterlange'], ['lang', 'Lang', 'lange']];
  /** Gesichtsbehaarung: [Schlüssel, Chip, Zusatz vor der Farbe, Nomen, mit Farbe?]. */
  const BART = [['kein', 'Kein Bart', '', 'kein Bart', false], ['3tage', 'Dreitagebart', '', 'Dreitagebart', true], ['ober', 'Oberlippenbart', '', 'Oberlippenbart', true], ['kinn', 'Kinnbart', '', 'Kinnbart', true], ['oberkinn', 'Oberlippen- und Kinnbart', '', 'Oberlippen- und Kinnbart', true], ['voll', 'Vollbart', '', 'Vollbart', true], ['lang', 'Langer Vollbart', 'langer', 'Vollbart', true]];
  /** Wie die beschriebene Person im Text heißt: [Schlüssel, Chip, Formen je Geschlecht: Nominativ, Akkusativ, Dativ]. x = Geschlecht nicht bekannt (wie in Fahndungen üblich die Grundform). */
  const BEZ = [
    ['taeter', 'Täter/in', { m: ['der Täter', 'den Täter', 'dem Täter'], w: ['die Täterin', 'die Täterin', 'der Täterin'], x: ['der Täter', 'den Täter', 'dem Täter'] }],
    ['tv', 'Tatverdächtige/r', { m: ['der Tatverdächtige', 'den Tatverdächtigen', 'dem Tatverdächtigen'], w: ['die Tatverdächtige', 'die Tatverdächtige', 'der Tatverdächtigen'], x: ['der Tatverdächtige', 'den Tatverdächtigen', 'dem Tatverdächtigen'] }],
    ['person', 'Unbekannte Person', { x: ['die unbekannte Person', 'die unbekannte Person', 'der unbekannten Person'] }],
    ['fahrer', 'Fahrer/in', { m: ['der Fahrzeugführer', 'den Fahrzeugführer', 'dem Fahrzeugführer'], w: ['die Fahrzeugführerin', 'die Fahrzeugführerin', 'der Fahrzeugführerin'], x: ['der Fahrzeugführer', 'den Fahrzeugführer', 'dem Fahrzeugführer'] }]
  ];
  const WLV = [['ja', 'Ja'], ['unsicher', 'Nicht sicher'], ['nein', 'Nein']];
  /** Darstellung der Ausgabe: gegliederte Liste (Vorgabe) oder Fließtext. */
  const FORMEN = [['liste', 'Liste'], ['text', 'Fließtext']];

  /* ======================= Text ======================= */
  /** Vorgabe für die Bezeichnung: in Verkehrsangelegenheiten die Fahrerin oder der Fahrer, sonst die Täterin oder der Täter. */
  const bezOf = (b, art) => (BEZ.some(x => x[0] === (b && b.bez)) ? b.bez : art === 'verkehr' ? 'fahrer' : 'taeter');
  /** { nom, akk, dat } – „der Täter“ / „den Täter“ / „dem Täter“, bei mehreren beschriebenen Personen mit Nummer. */
  function formen(b, art) {
    const F = BEZ.find(x => x[0] === bezOf(b, art))[2];
    const g = b && (b.g === 'm' || b.g === 'w') ? b.g : 'x';
    const f = F[g] || F.x, n = num(b && b.nr), nr = n ? ' ' + n : '';
    return { nom: f[0] + nr, akk: f[1] + nr, dat: f[2] + nr };
  }
  /** Satzteil zu Alter oder Größe ('' = keine Angabe). Eine Markierung am Rand der Leiste zählt als offen. */
  function spanneText(k, o) {
    const S = SPANNE[k], T = S.text; o = o && typeof o === 'object' ? o : {};
    if (o.m === 'ca') { const c = num(o.ca); return c == null ? '' : T.ca(c); }
    const v = num(o.von), b = num(o.bis);
    const von = v != null && v > S.min ? Math.min(v, S.max) : null, bis = b != null && b < S.max ? Math.max(b, S.min) : null;
    if (von == null && bis == null) return '';
    if (von != null && bis != null) return von >= bis ? T.ca(bis) : T.vb(von, bis);
    return von != null ? T.ab(von) : T.bis(bis);
  }
  /** Kurzfassung für die Anzeige über der Leiste: „175 – 185 cm“, „ab 175 cm“, „ca. 180 cm“. */
  function spanneKurz(k, von, bis) {
    const S = SPANNE[k], e = S.einheit;
    const a = von != null && von > S.min ? von : null, b = bis != null && bis < S.max ? bis : null;
    if (a == null && b == null) return '';
    if (a != null && b != null) return a >= b ? `ca. ${b} ${e}` : `${a} – ${b} ${e}`;
    return a != null ? `ab ${a} ${e}` : `bis ${b} ${e}`;
  }
  /**
   * Die Angaben einer Beschreibung, in der Reihenfolge der Abfrage. Je Merkmal:
   *   p  Überpunkt (Folie) · k Merkmal · l Bezeichnung in der Liste · v Wert in der Liste („kurz, dunkelbraun“)
   *   s  Satzteil im Fließtext („kurze dunkelbraune Haare“) · gr Block ('A' körperlich, 'B' Bekleidung und Besonderes)
   * Nur was beantwortet ist, kommt vor – Offenes wird nicht verneint. Freitext hängt als Stichworte hinter der Auswahl;
   * steht er allein, nennt der Fließtext das Merkmal dazu („Haare: lockig“), damit klar bleibt, worauf er sich bezieht.
   */
  function werte(b) {
    b = b && typeof b === 'object' ? b : {};
    const W = [], add = (p, k, l, v, s) => { if (has(v)) W.push({ p, k, l, v, s: has(s) ? s : v, gr: p === 'kl' || p === 'bm' ? 'B' : 'A' }); };
    if (b.g === 'm' || b.g === 'w') add('ga', 'g', 'Geschlecht', b.g === 'm' ? 'männlich' : 'weiblich');
    for (const k of ['alter', 'gr']) { const s = spanneText(k, b[k]); if (s) add(k === 'alter' ? 'ga' : 'gs', k, SPANNE[k].l, s.replace(/ (alt|groß)$/, ''), s); }
    const st = STATUR.filter(x => arr(b.statur).includes(x[0])), stX = frei(b.staturX);
    if (st.length || stX) {
      const von = st[0], bis = st[st.length - 1];
      add('gs', 'statur', 'Statur', mit(st.length > 1 ? `${klein(von[1])} bis ${klein(bis[1])}` : von ? klein(von[1]) : '', stX), st.length ? mit(`${st.length > 1 ? `${von[2]} bis ${bis[2]}` : von[2]} Statur`, stX) : nur('Statur', stX));
    }
    const ph = PHAENO.filter(x => arr(b.phaeno).includes(x[0])).map(x => x[2] || x[1]), phX = frei(b.phaenoX);
    if (ph.length || phX) add('ph', 'phaeno', 'Erscheinungsbild', mit(ph.join(' oder '), phX), ph.length ? mit(`${ph.map(x => x + 'es').join(' oder ')} Erscheinungsbild`, phX) : nur('Erscheinungsbild', phX));
    const glatze = b.haarL === 'glatze', hl = LAENGE.find(x => x[0] === b.haarL), hf = glatze ? null : FARBE.find(x => x[0] === b.haarF), hX = frei(b.haarX);
    if (hl || hf || hX) add('haar', 'haar', 'Haare', mit(glatze ? 'Glatze' : hl ? klein(hl[1]) : '', hf ? hf[1] : '', hX), hl || hf ? mit(glatze ? 'Glatze' : `${[hl && hl[2], hf && hf[2]].filter(Boolean).join(' ')} Haare`, hX) : nur('Haare', hX));
    if (b.g !== 'w') {
      const t = BART.find(x => x[0] === b.bart), bf = t && t[4] ? FARBE.find(x => x[0] === b.bartF) : null, bX = frei(b.bartX);
      if (t || bX) add('bart', 'bart', 'Bart', mit(t ? [t[2], t[3]].filter(Boolean).join(' ') : '', bf ? bf[1] : '', bX), t ? mit([t[2], bf && bf[3], t[3]].filter(Boolean).join(' '), bX) : nur('Bart', bX));
    }
    add('kl', 'kl', 'Bekleidung', mit(b.dunkel ? 'dunkel gekleidet' : '', frei(b.kl)));
    add('bm', 'bm', 'Besondere Merkmale', frei(b.bm));
    return W;
  }
  /** Die Angaben als Aufzählung von Satzteilen – für Kurzfassungen. */
  const liste = b => werte(b).map(x => x.s);
  /** Antwort zu einem Überpunkt, wie sie in der Übersicht steht: „männlich · 30 bis 35 Jahre“. */
  const punktWert = (b, p) => werte(b).filter(x => x.p === p).map(x => x.v).join(' · ');
  /** Merkmale, zu denen nichts eingetragen ist – sie stehen nicht im Text; der Schlusssatz deckt sie ab. */
  const offene = b => { const da = new Set(werte(b).map(x => x.k)); return MERKMALE.filter(([k]) => !da.has(k) && !(k === 'bart' && b && b.g === 'w')).map(x => x[1]); };
  const formOf = b => (b && b.form === 'text' ? 'text' : 'liste');
  /** Gegliederte Liste: je Block eine Überschrift, je Merkmal eine Zeile. Reiner Text – übersteht jedes Kopieren. */
  const alsListe = W => ['A', 'B'].map(g => { const X = W.filter(x => x.gr === g); return X.length ? [`${GRUPPE[g]}:`, ...X.map(x => `– ${x.l}: ${x.v}`)].join('\n') : ''; }).filter(Boolean).join('\n');
  /** Fließtext: erst das Körperliche als Aufzählung, dann Bekleidung und besondere Merkmale je mit ihrem Stichwort. */
  function alsText(W) {
    const a = W.filter(x => x.gr === 'A').map(x => x.s), S = a.length ? [a.join(', ') + '.'] : [];
    W.filter(x => x.gr === 'B').forEach((x, n) => S.push(!a.length && n === 0 ? `${x.s}.` : `${x.l}: ${x.s}.`));
    return S.join(' ');
  }
  /**
   * Die Bausteine des Textes einer Beschreibung.
   *   o.wer   „die Zeugin Müller“ – Satzgegenstand, wenn die Beschreibung bei einer Person der Schilderungen steht
   *   o.pr    deren Pronomen ({ er: 'sie' … }) für die Folgesätze
   *   o.art   Art der Sache (Strafanzeige/Verkehr) für die Vorgabe der Bezeichnung
   * Ohne o.wer steht der frei eingetragene Name vorn („Frau Müller beschrieb …“), ohne Namen das Passiv.
   * Liefert { F, W, intro, schluss } – Einleitungssatz, Angaben und die Sätze danach (keine weiteren Angaben, Wahllichtbildvorlage).
   */
  function teile(b, o = {}) {
    b = b && typeof b === 'object' ? b : {};
    const F = formen(b, o.art), W = werte(b), S = [];
    const subj = has(o.wer) ? str(o.wer) : str(b.von);
    const er = has(o.wer) && o.pr && has(o.pr.er) ? o.pr.er : '';
    const intro = subj ? `${cap(subj)} beschrieb ${F.akk} wie folgt:` : `${cap(F.nom)} wurde wie folgt beschrieben:`;
    if (b.sonst === true) {
      if (!W.length) S.push(subj ? `${cap(subj)} konnte ${F.akk} nicht beschreiben.` : `${cap(F.nom)} konnte nicht beschrieben werden.`);
      else S.push(er ? `Weitere Angaben zu ${F.dat} könne ${er} nicht machen.` : `Weitere Angaben zu ${F.dat} konnten nicht gemacht werden.`);
    }
    if (b.wlv) {
      const kern = { ja: `${F.akk} bei einer Wahllichtbildvorlage wiedererkennen zu können`, unsicher: `nicht sicher zu sein, ${F.akk} bei einer Wahllichtbildvorlage wiedererkennen zu können`, nein: `${F.akk} bei einer Wahllichtbildvorlage nicht wiedererkennen zu können` }[b.wlvA];
      const wer = (W.length || S.length) && er ? er : subj;
      if (!kern) S.push('[Wahllichtbildvorlage: Würde die Person wiedererkannt?]');
      else S.push(wer ? `Auf Nachfrage gab ${wer} an, ${kern}.` : `Auf Nachfrage wurde angegeben, ${kern}.`);
    }
    return { F, W, intro, schluss: S };
  }
  /** Der Text einer Beschreibung – als gegliederte Liste oder als Fließtext (b.form), Optionen wie bei teile(). */
  function text(b, o = {}) {
    if (!b || typeof b !== 'object') return '';
    const T = teile(b, o);
    if (formOf(b) === 'text') return [T.W.length ? `${T.intro} ${alsText(T.W)}` : '', ...T.schluss].filter(Boolean).join(' ');
    return [T.W.length ? `${T.intro}\n${alsListe(T.W)}` : '', T.schluss.join(' ')].filter(Boolean).join('\n');
  }
  /** Kurzfassung für Listen und Chips: die ersten Merkmale. */
  function kurz(b, n = 4) {
    const L = liste(b);
    return L.length > n ? L.slice(0, n).join(' · ') + ' …' : L.join(' · ');
  }
  /** Noch nichts eingetragen – eine versehentlich angelegte Beschreibung verschwindet wieder. */
  const istLeer = b => !b || (!has(b.von) && !werte(b).length && b.sonst !== true && !b.wlv && !b.bez && !b.nr);
  /**
   * Schlusssatz vorwählen (liefert true, wenn er gesetzt wurde): sobald etwas beschrieben ist und anderes offen blieb – genau
   * dafür ist er da. Nur solange noch nichts entschieden ist; wer ihn abwählt, bekommt ihn nicht wieder untergeschoben.
   */
  const sonstVorwahl = b => { if (!b || b.sonst !== undefined || !werte(b).length || !offene(b).length) return false; b.sonst = true; return true; };

  const B_ = data => arr(data && data.pb).filter(b => b && typeof b === 'object');
  /** Bei wem die Beschreibung in den Schilderungen steht ('' = bei niemandem). */
  const beiWem = (data, b) => str(((data && data.zu) || {})[b && b.id]);
  /** Beschreibungen, die (noch) bei keiner Schilderung stehen – nur sie stehen im Gesamtsachverhalt als eigener Abschnitt. */
  const freie = data => B_(data).filter(b => !beiWem(data, b));
  const rumpf = (data, list) => list.map(b => text(b, { art: data && data.art })).filter(Boolean).join('\n');
  /** Der ganze Abschnitt zum Kopieren – alle Beschreibungen, auch die, die schon bei einer Schilderung stehen. */
  const abschnitt = data => `Personenbeschreibung\n${rumpf(data, B_(data)) || '[Noch nichts erfasst]'}`;
  /** Im Gesamtsachverhalt: nur, was nicht schon in einer Schilderung steht. */
  const plain = data => { const t = rumpf(data, freie(data)); return t ? `Personenbeschreibung\n${t}` : ''; };
  /** Steht im Gesamtsachverhalt gerade nichts von diesem Abschnitt? (leer oder alles bei den Schilderungen) */
  const still = data => !rumpf(data, freie(data));

  /* ---------- Was noch fehlt ---------- */
  const nenne = (b, i) => `Beschreibung ${i + 1}${has(b.von) ? ` (${str(b.von)})` : ''}`;
  /** Lücken, die im Text als Platzhalter stünden oder ihn leer ließen. Der Name ist nur für die eigene Zuordnung – er fehlt nicht. */
  function luecken(data) {
    const m = [], B = B_(data);
    if (!B.length) m.push('Personenbeschreibung aufnehmen');
    B.forEach((b, i) => {
      if (!werte(b).length && b.sonst !== true) m.push(`${nenne(b, i)}: noch keine Angaben`);
      if (b.wlv && !b.wlvA) m.push(`${nenne(b, i)}: Antwort zur Wahllichtbildvorlage`);
    });
    return m;
  }
  /** Gibt es im Vorgang Schilderungen, soll jede Beschreibung dort bei ihrer Person stehen. */
  const unverteilt = data => (data && data.schDa ? B_(data).filter(b => !beiWem(data, b)) : []);
  const offen = data => [...luecken(data), ...unverteilt(data).map(b => `${nenne(b, B_(data).indexOf(b))}: noch bei keiner Schilderung übernommen`)];

  /* ---------- Listen-Texte ---------- */
  const namen = data => B_(data).map(b => str(b.von)).filter(Boolean);
  function title(data) { const n = namen(data); return n.length ? `Personenbeschreibung – ${n.join(', ')}` : 'Personenbeschreibung'; }
  function subtitle(data) {
    const B = B_(data), n = B.length; if (!n) return 'noch keine Beschreibung';
    return `${n} ${n === 1 ? 'Beschreibung' : 'Beschreibungen'}${namen(data).length ? ' · ' + namen(data).join(', ') : ''}`;
  }
  function pill(data) { const B = B_(data); return B.length ? `${B.filter(b => b.fertig).length}/${B.length}` : 'neu'; }

  /* ======================= Kontext aus dem Vorgang ======================= */
  /**
   * Übernimmt aus dem Vorgang (rein, ohne DOM; liefert true, wenn sich etwas geändert hat):
   * – die Art der Sache (für die Vorgabe „Täter/in“ oder „Fahrer/in“),
   * – bei wem welche Beschreibung in den Schilderungen steht (data.zu) und ob es Schilderungen gibt (data.schDa).
   */
  function nimmt(data, ctx) {
    if (!data || typeof data !== 'object' || !ctx) return false;
    let ch = false;
    const set = (k, v) => { if (same(data[k], v)) return; if (v == null || v === '') delete data[k]; else data[k] = v; ch = true; };
    set('art', ctx.art || undefined);
    const zu = {};
    for (const n of arr(ctx.nutzung)) if (n && has(n.id) && B_(data).some(b => b.id === n.id)) zu[n.id] = str(n.wer) || 'eine Person';
    set('zu', Object.keys(zu).length ? zu : undefined);
    set('schDa', ctx.nutzungAus ? true : undefined);
    return ch;
  }

  /* ======================= Maske ======================= */
  /*
   * Ansichten:
   *   Abschnitt:        'liste' Wer hat jemanden beschrieben? (nur bei mehreren Beschreibungen)  →  'done' fertiger Text zum Kopieren
   *   je Beschreibung:  'b' mit V.f = 'hub' (Übersicht der Überpunkte) oder einer Folie, eine je Überpunkt:
   *                     'wer' → 'ga' → 'gs' → 'ph' → 'haar' → 'bart' (entfällt bei „weiblich“) → 'kl' → 'bm' → 'ab'
   * Die Übersicht ist die Drehscheibe: Antippen öffnet einen Punkt, „Der Reihe nach abfragen“ beginnt beim ersten offenen.
   * In den Folien geht es mit „Zurück / Weiter“ durch alle Punkte; „Übersicht“ führt jederzeit zurück. Wer einen Punkt in
   * der Übersicht angetippt hat (V.direkt), kommt mit dem Knopf unten links auch wieder dorthin.
   */
  const V = { id: null, s: 'liste', i: -1, f: 'hub', direkt: false, zurueck: '', neu: false, focus: '' };
  const $ = s => document.querySelector(s);
  const punkt = k => PUNKTE.find(p => p.k === k);
  const folien = b => PUNKTE.map(p => p.k).filter(k => !(k === 'bart' && b && b.g === 'w'));
  /** Ist zu dem Überpunkt etwas eingetragen? */
  const punktDa = (b, k) => { b = b || {}; return k === 'wer' ? has(b.von) : k === 'ab' ? b.sonst === true || !!b.wlv : !!punktWert(b, k); };
  /** Der erste Punkt, zu dem noch nichts eingetragen ist – dort beginnt „Der Reihe nach abfragen“. */
  const erstesOffene = b => folien(b).find(k => !punktDa(b, k)) || 'ab';
  const neuId = B => { let id; do { id = 'b' + Math.random().toString(36).slice(2, 8); } while (arr(B).some(b => b && b.id === id)); return id; };
  /** Bringt die Liste in Form (liefert true, wenn etwas geändert wurde): nur Beschreibungen, jede mit eigener Kennung – über sie verweisen die Schilderungen. */
  function ordnen(data) {
    if (!data || data.pb == null) return false;
    let ch = false;
    const B = B_(data), seen = new Set();
    if (!Array.isArray(data.pb) || B.length !== data.pb.length) ch = true;
    for (const b of B) { if (!has(b.id) || seen.has(b.id)) { b.id = neuId(B); ch = true; } seen.add(b.id); }
    if (ch) { if (B.length) data.pb = B; else delete data.pb; }
    return ch;
  }
  const ctxOf = api => (api && typeof api.ctx === 'function' ? api.ctx() : null);
  const subOf = (B, i) => `Beschreibung ${i + 1} von ${B.length}${has(B[i] && B[i].von) ? ' · ' + str(B[i].von) : ''}`;
  const WLV_KURZ = { ja: 'würde wiedererkennen', unsicher: 'nicht sicher', nein: 'würde nicht wiedererkennen' };
  /** Was in der Übersicht unter dem Punkt steht: die Antwort – oder, solange er offen ist, was dort gefragt wird. */
  function punktZeile(data, b, k) {
    if (k === 'wer') return has(b.von) ? `${str(b.von)} beschreibt ${formen(b, data.art).akk}` : punkt(k).fragt;
    if (k === 'ab') return [b.sonst === true ? 'Keine weiteren Angaben' : '', b.wlv ? `Wahllichtbildvorlage: ${WLV_KURZ[b.wlvA] || 'Antwort offen'}` : ''].filter(Boolean).join(' · ') || punkt(k).fragt;
    return punktWert(b, k) || punkt(k).fragt;
  }
  /** Was die Folie zum Text beiträgt – in der gewählten Darstellung. */
  function folieText(data, b, f) {
    const T = teile(b, { art: data.art });
    if (f === 'wer') return `${T.intro} …`;
    if (f === 'ab') return T.schluss.join(' ') || 'Kein Schlusssatz gewählt.';
    const X = T.W.filter(x => x.p === f);
    if (!X.length) return 'Noch keine Angabe – der Punkt bleibt aus dem Text.';
    return formOf(b) === 'text' ? X.map(x => (x.gr === 'B' ? `${x.l}: ${x.s}` : x.s)).join(', ') : X.map(x => `${x.l}: ${x.v}`).join('\n');
  }
  const ganzerText = (data, b) => text(b, { art: data.art }) || 'Noch nichts erfasst.';
  /** Personen des Vorgangs als Vorschlag für den Namen: „Frau Müller“. */
  const personName = q => [q.g === 'w' ? 'Frau' : q.g === 'm' ? 'Herr' : '', str(q.nachname)].filter(Boolean).join(' ');
  const rolleL = q => { const C = root.WSchild && root.WSchild.core; const l = C && q ? C.rolleLabel(q) : ''; return l === 'Rolle offen' ? '' : l; };

  function open(d) {
    const B = B_(d && d.data);
    V.id = d.id; V.f = 'hub'; V.direkt = false; V.zurueck = ''; V.focus = '';
    V.neu = !B.length; // leer geöffnet: gleich mit der ersten Beschreibung beginnen
    if (d.status === 'fertig' && B.length) { V.s = 'done'; V.i = -1; }
    else if (B.length === 1) { V.s = 'b'; V.i = 0; } // eine Beschreibung: gleich ihre Übersicht
    else { V.s = 'liste'; V.i = -1; }
  }
  const key = () => `${V.s}:${V.i}:${V.s === 'b' ? V.f : ''}`;

  /* ---------- Bausteine der Folien ---------- */
  const eins = (pfad, cur, opts, cls = 'chip') => opts.map(([v, l]) => `<button type="button" class="${cls}" data-sd="eins" data-p="${esc(pfad)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('');
  const imText = (data, b, f) => `<div class="w-q pb-im" data-q="im"><span class="w-mk-gt">So steht es im Text</span><p class="pb-satz" data-live="satz">${esc(folieText(data, b, f))}</p></div>`;
  /** Freies Feld für Stichworte mit Komma – ins Einzelne gehen bei dem Punkt, der gerade an der Reihe ist. */
  const freiFeld = (id, pfad, wert, label, ph, hin = '') => `<div class="w-q" data-q="${id}"><label class="w-lbl" for="${id}">${esc(label)} <i class="w-hint-i">(optional, Stichworte mit Komma)</i></label><textarea class="input es-ta" id="${id}" data-sk="${esc(pfad)}" data-single="1" rows="1" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="true" enterkeyhint="done" maxlength="400">${esc(wert || '')}</textarea>${hin ? `<p class="w-hint sd-hint">${esc(hin)}</p>` : ''}</div>`;
  /** Umschalter der Darstellung: gegliederte Liste oder Fließtext – gilt für alle Beschreibungen des Abschnitts. */
  const formWahl = b => `<span class="pb-modus" role="group" aria-label="Darstellung">${FORMEN.map(([v, l]) => `<button type="button" class="chip sm" data-sd="form" data-v="${v}" aria-pressed="${String(formOf(b) === v)}">${l}</button>`).join('')}</span>`;

  /** Leiste mit zwei Markierungen (von – bis). Gezeichnet und bewegt wird sie in leisteBinden(). */
  function leisteHtml(k, o, pfad) {
    const S = SPANNE[k], v = num(o.von), b = num(o.bis);
    const von = Math.max(S.min, Math.min(S.max, v == null ? S.min : v)), bis = Math.max(von, Math.min(S.max, b == null ? S.max : b));
    return `<div class="pb-rng" data-rng="${k}" data-p="${esc(pfad)}" data-von="${von}" data-bis="${bis}">
        <div class="pb-rng-kopf"><b class="pb-rng-wert" data-rng-wert></b><button type="button" class="link" data-sd="rngx" data-p="${esc(pfad)}" data-rng-x hidden>Zurücksetzen</button></div>
        <div class="pb-rng-rahmen" data-rng-rahmen><div class="pb-rng-bahn" data-rng-bahn>
          <div class="pb-rng-skala" data-rng-skala aria-hidden="true"></div>
          <div class="pb-rng-band" data-rng-band></div>
          <div class="pb-rng-m" data-m="von" role="slider" tabindex="0" aria-label="${S.l} von" aria-valuemin="${S.min}" aria-valuemax="${S.max}" aria-valuenow="${von}"><b class="mono"></b><i></i></div>
          <div class="pb-rng-m" data-m="bis" role="slider" tabindex="0" aria-label="${S.l} bis" aria-valuemin="${S.min}" aria-valuemax="${S.max}" aria-valuenow="${bis}"><b class="mono"></b><i></i></div>
        </div></div>
        <p class="w-hint pb-rng-tip" data-rng-tip></p>
      </div>`;
  }
  /** Circa-Angabe als Rad zum Drehen: der Wert in der Mitte gilt. */
  function radHtml(k, o, pfad) {
    const S = SPANNE[k], c = num(o.ca);
    return `<div class="pb-rad" data-rad="${k}" data-p="${esc(pfad)}.ca" data-v="${c == null ? '' : c}">
        <span class="pb-rad-vor">ca.</span>
        <div class="pb-rad-f" data-radf tabindex="0" role="listbox" aria-label="${S.l} circa"><span class="pb-rad-p"></span><button type="button" class="pb-rad-i" data-v="" role="option">–</button>${S.ca.map(n => `<button type="button" class="pb-rad-i mono" data-v="${n}" role="option">${n}</button>`).join('')}<span class="pb-rad-p"></span></div>
        <span class="pb-rad-e">${S.einheit}</span>
      </div>
      <p class="w-hint pb-rng-tip">Drehen oder antippen – der Wert in der Mitte gilt. Der Strich heißt: keine Angabe.</p>`;
  }
  /** Alter oder Größe: Umschalter „Von – bis“ / „Circa“ und darunter die passende Eingabe. */
  function spanneHtml(k, b, base) {
    const S = SPANNE[k], o = b[k] && typeof b[k] === 'object' ? b[k] : {}, ca = o.m === 'ca', pfad = `${base}.${k}`;
    const modus = `<div class="pb-modus" role="group" aria-label="${S.l}: Art der Angabe">${[['vb', 'Von – bis'], ['ca', 'Circa']].map(([v, l]) => `<button type="button" class="chip sm" data-sd="modus" data-p="${esc(pfad)}.m" data-v="${v}" aria-pressed="${String(ca === (v === 'ca'))}">${l}</button>`).join('')}</div>`;
    return `<div class="w-q pb-sp" data-q="${k}"><div class="pb-sp-h"><span class="w-lbl">${S.l}</span>${modus}</div>${ca ? radHtml(k, o, pfad) : leisteHtml(k, o, pfad)}</div>`;
  }

  /* ---------- Folien einer Beschreibung: je Überpunkt eine ---------- */
  function werHtml(data, b, base, api, B) {
    const ctx = ctxOf(api), L = arr(ctx && ctx.leute).filter(q => q && has(q.nachname));
    const vor = L.length ? `<div class="w-chips sd-sugg">${L.map(q => { const n = personName(q); return `<button type="button" class="chip sm" data-sd="von" data-v="${esc(n)}" aria-pressed="${String(str(b.von) === n)}">${esc(n)}${rolleL(q) ? `<small class="sd-sm">${esc(rolleL(q))}</small>` : ''}</button>`; }).join('')}</div>` : '';
    const bz = bezOf(b, data.art);
    const bez = BEZ.filter(([k]) => k !== 'fahrer' || data.art !== 'straf' || bz === 'fahrer').map(([k, l]) => `<button type="button" class="chip" data-sd="setze" data-p="${base}.bez" data-v="${k}" aria-pressed="${String(bz === k)}">${esc(l)}</button>`).join('');
    const nrQ = B.length > 1 || b.nr ? `<div class="w-q" data-q="nr"><span class="w-lbl">Mehrere beschriebene Personen? <i class="w-hint-i">(Nummer, optional)</i></span><div class="w-chips">${eins(`${base}.nr`, String(b.nr || ''), [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], 'chip mono')}</div></div>` : '';
    return `<div class="w-q" data-q="von"><label class="w-lbl" for="pbVon">Wer beschreibt?</label><input class="input" id="pbVon" data-sk="${base}.von" value="${esc(b.von || '')}" placeholder="z. B. Frau Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="80">${vor}<p class="w-hint sd-hint">Nur für deine Zuordnung – bei den Schilderungen übernimmst du die Beschreibung später mit einem Tipp bei der richtigen Person.</p></div>
      <div class="w-q" data-q="bez"><span class="w-lbl">Wer wird beschrieben?</span><div class="w-chips" role="group" aria-label="Bezeichnung im Text">${bez}</div></div>
      ${nrQ}`;
  }
  function gaHtml(b, base) {
    return `<div class="w-q" data-q="g"><span class="w-lbl">Geschlecht</span><div class="w-seg" role="group" aria-label="Geschlecht">${eins(`${base}.g`, b.g, [['m', 'Männlich'], ['w', 'Weiblich']], 'w-opt')}</div></div>${spanneHtml('alter', b, base)}`;
  }
  function gsHtml(b, base) {
    const sel = arr(b.statur);
    return `${spanneHtml('gr', b, base)}
      <div class="w-q" data-q="statur"><span class="w-lbl">Statur</span><div class="pb-skala" role="group" aria-label="Statur, von schmal nach kräftig">${STATUR.map(([k, l], n) => `<button type="button" class="chip pb-st" data-sd="mehr" data-p="${base}.statur" data-v="${k}" data-max="2" aria-pressed="${String(sel.includes(k))}"><i aria-hidden="true" style="--n:${n}"></i>${l}</button>`).join('')}</div><p class="w-hint sd-hint">Von schmal nach kräftig. Zwei antippen ergibt eine Spanne, z. B. „schlank bis sportlich“.</p></div>
      ${freiFeld('pbStX', `${base}.staturX`, b.staturX, 'Weiteres zur Gestalt', 'z. B. breite Schultern, leicht gebeugte Haltung')}`;
  }
  function phHtml(b, base) {
    const sel = arr(b.phaeno);
    return `<div class="w-q" data-q="phaeno"><span class="w-lbl">Erscheinungsbild</span><div class="w-chips" role="group" aria-label="Erscheinungsbild">${PHAENO.map(([k, l]) => `<button type="button" class="chip" data-sd="mehr" data-p="${base}.phaeno" data-v="${k}" data-max="2" aria-pressed="${String(sel.includes(k))}">${l}</button>`).join('')}</div><p class="w-hint sd-hint">So, wie es die Person beschreibt. Ist sie unsicher: zwei antippen – im Text steht dann „… oder …“.</p></div>
      ${freiFeld('pbPhX', `${base}.phaenoX`, b.phaenoX, 'Weiteres zum Aussehen', 'z. B. heller Teint, Sommersprossen')}`;
  }
  function haarHtml(b, base) {
    const glatze = b.haarL === 'glatze';
    return `<div class="w-q" data-q="haarL"><span class="w-lbl">Haarlänge</span><div class="w-chips" role="group" aria-label="Haarlänge">${eins(`${base}.haarL`, b.haarL, LAENGE.map(x => [x[0], x[1]]))}</div></div>
      <div class="w-q" data-q="haarF"><span class="w-lbl">Haarfarbe</span><div class="w-chips${glatze ? ' pb-aus' : ''}" role="group" aria-label="Haarfarbe">${eins(`${base}.haarF`, b.haarF, FARBE.map(x => [x[0], x[1]]))}</div>${glatze ? '<p class="w-hint sd-hint">Bei „Glatze“ steht keine Haarfarbe im Text.</p>' : ''}</div>
      ${freiFeld('pbHaarX', `${base}.haarX`, b.haarX, 'Weiteres zu den Haaren', 'z. B. lockig, zum Zopf gebunden, Geheimratsecken')}`;
  }
  function bartHtml(b, base) {
    const t = BART.find(x => x[0] === b.bart), farbe = t && t[4];
    const wieHaar = farbe && b.haarF && b.haarL !== 'glatze' ? `<div class="w-quick"><button type="button" class="chip sm" data-sd="setze" data-p="${base}.bartF" data-v="${esc(b.haarF)}" aria-pressed="${String(b.bartF === b.haarF)}">Wie die Haare: ${esc((FARBE.find(x => x[0] === b.haarF) || [])[1] || '')}</button></div>` : '';
    return `<div class="w-q" data-q="bart"><span class="w-lbl">Gesichtsbehaarung</span><div class="w-chips" role="group" aria-label="Gesichtsbehaarung">${eins(`${base}.bart`, b.bart, BART.map(x => [x[0], x[1]]))}</div></div>
      ${farbe ? `<div class="w-q" data-q="bartF"><span class="w-lbl">Farbe des Bartes</span><div class="w-chips" role="group" aria-label="Farbe des Bartes">${eins(`${base}.bartF`, b.bartF, FARBE.map(x => [x[0], x[1]]))}</div>${wieHaar}</div>` : ''}
      ${freiFeld('pbBartX', `${base}.bartX`, b.bartX, 'Weiteres zum Bart', 'z. B. gepflegt, grau meliert')}`;
  }
  function klHtml(b, base) {
    return `<div class="w-q" data-q="dunkel"><span class="w-lbl">Schnellwahl</span><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.dunkel" aria-pressed="${String(!!b.dunkel)}">Dunkel gekleidet</button></div><p class="w-hint sd-hint">Mehr weiß die Person nicht? Dann reicht das.</p></div>
      ${freiFeld('pbKl', `${base}.kl`, b.kl, 'Einzelheiten', 'z. B. schwarze Kapuzenjacke, blaue Jeans, weiße Turnschuhe', 'Von oben nach unten: Kopfbedeckung, Oberteil, Hose, Schuhe. Klein beginnen – außer bei Hauptwörtern.')}`;
  }
  function bmHtml(b, base) {
    return freiFeld('pbBm', `${base}.bm`, b.bm, 'Besondere Merkmale', 'z. B. Narbe an der linken Wange, Tätowierung am Hals, Brille, schwarzer Rucksack', 'Was jemand an sich trägt oder hat: Narben, Tätowierungen, Piercings, Brille, Schmuck, Tasche, Fahrrad.');
  }
  function abHtml(data, b, base) {
    const F = formen(b, data.art), O = offene(b);
    const satz = `„Weitere Angaben zu ${F.dat} konnten nicht gemacht werden.“`;
    const hin = !werte(b).length ? `Ohne jede Angabe steht im Text, dass ${F.nom} nicht beschrieben werden konnte.`
      : O.length ? `Offen geblieben: ${O.join(', ')}. Das steht nicht im Text und wird nicht verneint – dafür der eine Satz: ${satz}`
        : `Fügt den Satz an: ${satz}`;
    return `<div class="w-q" data-q="sonst"><div class="w-chips"><button type="button" class="chip" data-sd="sonst" aria-pressed="${String(b.sonst === true)}">Sonst keine weiteren Angaben</button></div><p class="w-hint sd-hint">${esc(hin)}</p></div>
      <div class="w-q" data-q="wlv"><span class="w-lbl">Wahllichtbildvorlage</span><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.wlv" aria-pressed="${String(!!b.wlv)}">Danach gefragt</button></div>${b.wlv ? `<div class="sd-sub"><span class="w-lbl">Würde ${has(b.von) ? esc(str(b.von)) : 'die Person'} ${esc(F.akk)} wiedererkennen? <i class="w-req" title="Pflicht">•</i></span><div class="w-seg" role="group" aria-label="Wiedererkennen">${eins(`${base}.wlvA`, b.wlvA, WLV, 'w-opt')}</div></div>` : ''}</div>`;
  }
  /**
   * Übersicht einer Beschreibung: alle Überpunkte untereinander, in der Reihenfolge der Abfrage und gegliedert wie die Ausgabe.
   * Offene Punkte zeigen ihre Nummer und was dort gefragt wird, beantwortete den Haken und die Antwort. Darunter der Text,
   * wie er gerade steht. Sobald etwas erfasst ist, liegt unten neben „Fertig“ das Kopieren – zum schnellen Weitergeben auch
   * mitten in der Abfrage.
   */
  function hubHtml(d, api) {
    const data = d.data, B = B_(data), i = V.i, b = B[i] || {}, base = `pb.${i}`, F = folien(b);
    const leer = !werte(b).length && b.sonst !== true && !b.wlv;
    const zeile = k => {
      const da = punktDa(b, k);
      const knopf = `<button type="button" class="sd-add-b pb-pkt" data-sd="pkt" data-v="${k}" aria-pressed="${String(da)}"><i aria-hidden="true">${da ? '✓' : F.indexOf(k) + 1}</i><span>${esc(punkt(k).l)}<small>${esc(punktZeile(data, b, k))}</small></span></button>`;
      // Schnellwahl bei der Bekleidung: ein Tipp, und der Punkt ist erledigt
      return k === 'kl' ? `${knopf}<div class="pb-kurz"><button type="button" class="chip" data-sd="tog" data-p="${base}.dunkel" aria-pressed="${String(!!b.dunkel)}">Dunkel gekleidet</button></div>` : knopf;
    };
    const block = (q, titel, K) => `<div class="w-q" data-q="${q}">${titel ? `<span class="w-mk-gt">${esc(titel)}</span>` : ''}<div class="zs-list pb-pkte">${K.filter(k => F.includes(k)).map(zeile).join('')}</div></div>`;
    const up = B.length > 1 ? { label: 'Beschreibungen', attr: 'data-sd="menu"' } : { label: ctxOf(api) ? 'Vorgang' : 'Alle Vorgänge', attr: 'data-sd="raus"' };
    const next = leer ? { label: 'Der Reihe nach abfragen', attr: 'data-sd="reihe"' } : { label: 'Fertig', attr: 'data-sd="done1"', ok: true };
    return `${api.kopf({ up, sub: subOf(B, i), titel: has(b.von) ? `Was kann ${str(b.von)} beschreiben?` : 'Was kann die Person beschreiben?', lead: leer ? 'Der Reihe nach abfragen – oder nur antippen, wozu es Angaben gibt. Was offen bleibt, steht nicht im Text.' : 'Antippen öffnet den Punkt. Was offen bleibt, steht nicht im Text.' })}
      <div class="w-grid sd-grid">
        ${block('p-wer', '', ['wer'])}
        ${block('p-a', GRUPPE.A, ['ga', 'gs', 'ph', 'haar', 'bart'])}
        ${block('p-b', GRUPPE.B, ['kl', 'bm'])}
        ${block('p-ab', '', ['ab'])}
        <div class="w-q" data-q="im"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">So steht es im Text</span>${formWahl(b)}</div><pre class="w-out-t" data-live="satz">${esc(ganzerText(data, b))}</pre></div></div>
      </div>
      <div class="fo-fein"><button type="button" class="link danger" data-sd="del">Beschreibung entfernen</button></div>
      ${api.fuss({ back: leer ? null : { label: 'Kopieren', attr: `data-sd="copy1" data-i="${i}"`, plain: true }, next })}`;
  }
  function bHtml(d, api) {
    const data = d.data, B = B_(data), i = V.i, b = B[i] || {}, base = `pb.${i}`;
    const F = folien(b); if (!F.includes(V.f)) V.f = 'hub';
    if (V.f === 'hub') return hubHtml(d, api);
    const k = F.indexOf(V.f), last = k === F.length - 1;
    const zurHub = { label: 'Übersicht', attr: 'data-sd="hub"' };
    const kopf = (titel, lead) => api.kopf({ up: zurHub, sub: subOf(B, i), subLive: 'sub', pos: [k + 1, F.length], titel, lead });
    const fuss = api.fuss({ back: V.direkt || !k ? zurHub : { attr: 'data-sd="pf" data-v="-1"' }, next: last ? { label: 'Fertig', attr: 'data-sd="done1"', ok: true } : { attr: 'data-sd="pf" data-v="1"' } });
    const seite = (titel, lead, inhalt) => `${kopf(titel, lead)}<div class="w-grid sd-grid">${inhalt}${imText(data, b, V.f)}</div>${fuss}`;
    if (V.f === 'ga') return seite('Mann oder Frau – und wie alt?', '', gaHtml(b, base));
    if (V.f === 'gs') return seite('Wie groß, welche Statur?', '', gsHtml(b, base));
    if (V.f === 'ph') return seite('Welches Erscheinungsbild?', '', phHtml(b, base));
    if (V.f === 'haar') return seite('Welche Haare?', '', haarHtml(b, base));
    if (V.f === 'bart') return seite('Bart?', '', bartHtml(b, base));
    if (V.f === 'kl') return seite('Wie war die Person gekleidet?', '', klHtml(b, base));
    if (V.f === 'bm') return seite('Was fiel sonst auf?', 'Kann leer bleiben.', bmHtml(b, base));
    if (V.f === 'ab') return seite('Zum Abschluss', 'Mehr nicht bekannt? Würde die Person wiedererkannt?', abHtml(data, b, base));
    return seite('Wer beschreibt wen?', '', werHtml(data, b, base, api, B));
  }

  /* ---------- Folien des Abschnitts ---------- */
  function listeHtml(d, api) {
    const data = d.data, B = B_(data);
    const items = B.map((b, i) => {
      const zu = beiWem(data, b), F = formen(b, data.art);
      const hin = zu ? `<p class="w-hint vg-ctx">↳ steht in der Schilderung: ${esc(zu)}</p>` : data.schDa ? '<p class="w-hint vg-ctx">↳ noch bei keiner Schilderung übernommen</p>' : '';
      return `<li class="sd-item"><div class="sd-row"><button type="button" class="sd-card" data-sd="edit" data-i="${i}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(`${has(b.von) ? str(b.von) : 'Name offen'} beschreibt ${F.akk}`)}</b><small>${esc(kurz(b) || 'noch keine Angaben')}</small></span><span class="pill ${b.fertig ? 'pill-lime' : 'pill-quiet'}">${b.fertig ? 'Erfasst' : 'Entwurf'}</span></button></div>${hin}</li>`;
    }).join('');
    return `${api.kopf({ titel: 'Wer hat jemanden beschrieben?', lead: B.length ? 'Antippen, um eine Beschreibung zu ändern – oder eine weitere aufnehmen.' : 'Geführte Abfrage vom Gesamteindruck zum Einzelnen – der Text entsteht dabei von selbst.' })}
      <div class="w-grid sd-grid">
        ${B.length ? `<div class="w-q"><ol class="sd-list es-list">${items}</ol></div>` : ''}
        <div class="w-q" data-q="add"><div class="sd-add"><span class="w-lbl">${B.length ? 'Weitere Beschreibung aufnehmen' : 'Beschreibung aufnehmen'}</span><div class="sd-add-row"><button type="button" class="sd-add-b" data-sd="add"><i aria-hidden="true">+</i>Personenbeschreibung</button></div><p class="w-hint sd-hint">Je Person, die jemanden beschreibt, eine eigene Beschreibung – auch wenn zwei dieselbe Person beschreiben.</p></div></div>
      </div>
      ${api.fuss({ next: B.length ? { label: 'Fertig', attr: 'data-sd="alle"', ok: true } : null })}`;
  }
  /** Abschluss: der fertige Text, groß „Kopieren“, unten der Weg zum nächsten Abschnitt. */
  function doneHtml(d, api) {
    const data = d.data, B = B_(data), miss = luecken(data), frei2 = unverteilt(data), n = miss.length + frei2.length;
    const zu = B.filter(b => beiWem(data, b));
    const blocks = B.map((b, i) => `<div class="w-q"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">${esc(has(b.von) ? `Von ${str(b.von)}` : `Beschreibung ${i + 1}`)}${beiWem(data, b) ? ` <i class="w-hint-i">steht in der Schilderung: ${esc(beiWem(data, b))}</i>` : ''}</span>${B.length > 1 ? `<span class="vg-tools"><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></span>` : ''}</div><pre class="w-out-t">${esc(text(b, { art: data.art }) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `${api.kopf({ fertig: n ? `Fertig · ${n} offen` : 'Fertig', offen: n > 0, titel: 'So steht es im Text' })}
      <div class="w-grid sd-grid">
        ${miss.length ? `<div class="w-q"><div class="w-warn fo-warn"><span>Noch offen: ${esc(miss.join(' · '))}</span><button type="button" class="btn btn-ghost btn-sm" data-sd="go" data-v="liste">Nachtragen</button></div></div>` : ''}
        <div class="w-q" data-q="form"><div class="pb-form"><span class="w-lbl">Darstellung</span>${formWahl(B[0])}</div></div>
        ${blocks}
      </div>
      <button type="button" class="btn btn-light fo-wide" data-sd="copy">Text kopieren</button>
      ${arr((ctxOf(api) || {}).fahrzeuge).length && root.WFZ ? '<button type="button" class="btn btn-ghost fo-wide pb-beides" data-sd="copy2">Mit Fahrzeugbeschreibung kopieren</button>' : ''}
      ${frei2.length ? `<div class="w-info pb-nach">${frei2.length === 1 ? 'Diese Beschreibung steht' : `${frei2.length} Beschreibungen stehen`} noch bei keiner Schilderung. In den Schilderungen bei der Person antippen (Folie „Hat … beschrieben?“) – dann steht sie dort mit Rolle und Namen.</div>` : zu.length ? '<p class="w-hint pb-nach">Im Gesamtsachverhalt steht die Beschreibung bei der Schilderung, nicht noch einmal vorn. Hier bleibt sie zum Kopieren.</p>' : ''}
      ${api.fein({ mehr: '<button type="button" class="link" data-sd="add">+ Weitere Beschreibung</button>' })}
      ${api.fuss({ back: { label: 'Bearbeiten', attr: 'data-sd="go" data-v="liste"' }, next: api.danach() })}`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    const data = d.data;
    if (ordnen(data)) api.persist(false);
    if (nimmt(data, ctxOf(api))) api.persist(false);
    if (V.neu) { V.neu = false; if (!B_(data).length) { data.pb = [{ id: neuId([]) }]; V.s = 'b'; V.i = 0; V.f = 'hub'; api.persist(false); } }
    if (V.s === 'b' && !B_(data)[V.i]) V.s = 'liste';
    if (V.s === 'done' && !B_(data).length) V.s = 'liste';
    return V.s === 'b' ? bHtml(d, api) : V.s === 'done' ? doneHtml(d, api) : listeHtml(d, api);
  }

  /* ======================= Leiste und Rad ======================= */
  /**
   * Leiste mit zwei senkrechten Markierungen. Ziehen setzt den Wert im groben Raster; wer die Markierung festhält, bekommt
   * den Bereich darunter vergrößert (erst 20, dann 10 Einheiten breit) und wählt auf 1 genau. Loslassen zeigt wieder alles.
   * Eine Markierung am Rand heißt „keine Angabe“. Während des Ziehens wird nichts neu gezeichnet – erst beim Loslassen
   * wandert der Wert in die Daten.
   */
  function leisteBinden(el, api) {
    const S = SPANNE[el.dataset.rng]; if (!S) return;
    const q = s => el.querySelector(s);
    const rahmenEl = q('[data-rng-rahmen]'), bahn = q('[data-rng-bahn]'), skala = q('[data-rng-skala]'), band = q('[data-rng-band]'), wert = q('[data-rng-wert]'), tip = q('[data-rng-tip]'), xBtn = q('[data-rng-x]');
    const M = { von: q('[data-m="von"]'), bis: q('[data-m="bis"]') };
    const min = S.min, max = S.max, pfad = el.dataset.p;
    const st = { von: Number(el.dataset.von), bis: Number(el.dataset.bis), zoom: 0, a: min, b: max, zieht: '', pid: null, x: 0, x0: 0, versatz: 0, ruhigX: 0, ruhigSeit: 0, takt: 0 };
    const breite = () => bahn.getBoundingClientRect().width || 1;
    const pos = v => (v - st.a) / (st.b - st.a) * 100;
    const grenze = p => Math.max(0, Math.min(100, p));
    const jetzt = () => (root.performance && performance.now ? performance.now() : Date.now());
    function skalaZeichnen() {
      const fein = st.zoom > 0, klein = fein ? 1 : S.grob, gross = fein ? (st.zoom > 1 ? 1 : 5) : S.grob * 2;
      let h = '';
      for (let v = Math.ceil(st.a / klein - 1e-9) * klein; v <= st.b + 1e-9; v += klein) {
        if (v < min || v > max) continue;
        const g = v % gross === 0;
        h += `<i class="${g ? 'g' : ''}${fein && v % 5 === 0 ? ' f' : ''}" style="left:${pos(v).toFixed(3)}%">${g ? `<em>${v}</em>` : ''}</i>`;
      }
      skala.innerHTML = h;
    }
    function zeichnen() {
      for (const m of ['von', 'bis']) {
        const v = st[m], p = pos(v), e = M[m];
        e.style.left = grenze(p) + '%';
        e.classList.toggle('weg', p < -0.5 || p > 100.5);                 // im vergrößerten Ausschnitt nicht zu sehen
        e.classList.toggle('frei', m === 'von' ? v <= min : v >= max);    // am Rand: keine Angabe
        e.classList.toggle('zieht', st.zieht === m);
        e.setAttribute('aria-valuenow', String(v));
        e.querySelector('b').textContent = String(v);
      }
      const l = grenze(pos(st.von)), r = grenze(pos(st.bis));
      band.style.left = l + '%'; band.style.width = Math.max(0, r - l) + '%';
      const leer = st.von <= min && st.bis >= max;
      band.classList.toggle('leer', leer);
      wert.textContent = spanneKurz(el.dataset.rng, st.von, st.bis) || 'Noch keine Angabe';
      wert.classList.toggle('leer', leer);
      el.classList.toggle('aktiv', !!st.zieht);
      el.classList.toggle('fein', st.zoom > 0);
      tip.textContent = st.zoom ? `Feineinstellung – ${S.fein}. Loslassen übernimmt.` : `Markierungen ziehen. Festhalten vergrößert den Bereich – dann ${S.fein}.`;
      if (xBtn) xBtn.hidden = leer;
    }
    function setze(m, v) {
      v = Math.max(min, Math.min(max, v));
      if (m === 'von') st.von = Math.min(v, st.bis); else st.bis = Math.max(v, st.von);
    }
    const runde = v => { const s = st.zoom ? 1 : S.grob; return Math.round(v / s) * s; };
    const ausX = x => st.a + Math.max(0, Math.min(1, x / breite())) * (st.b - st.a);
    function speichern() {
      const d = api.d.data;
      setPath(d, pfad + '.von', st.von > min ? st.von : undefined);
      setPath(d, pfad + '.bis', st.bis < max ? st.bis : undefined);
      const o = getPath(d, pfad); if (o && typeof o === 'object' && !Object.keys(o).length) setPath(d, pfad, undefined);
      api.persist(false); live(api);
    }
    /** Festgehalten? Dann den Ausschnitt um den Wert unter dem Finger vergrößern. */
    function pruefen() {
      if (!el.isConnected) { clearInterval(st.takt); return; } // die Folie wurde inzwischen neu gezeichnet
      if (!st.zieht || st.zieht === '?' || st.zoom >= 2) return;
      if (jetzt() - st.ruhigSeit < (st.zoom ? 650 : 420)) return;
      const v = st[st.zieht], span = st.zoom ? 10 : 20, frac = Math.max(0, Math.min(1, (st.x - st.versatz) / breite()));
      st.zoom++; st.a = v - frac * span; st.b = st.a + span; st.ruhigSeit = jetzt();
      skalaZeichnen(); zeichnen();
    }
    function ende() {
      if (!st.zieht) return;
      clearInterval(st.takt); st.zieht = ''; st.pid = null; st.zoom = 0; st.a = min; st.b = max;
      skalaZeichnen(); zeichnen(); speichern();
    }
    rahmenEl.addEventListener('pointerdown', e => {
      if (e.button > 0 || st.zieht) return;
      const r = bahn.getBoundingClientRect(), x = e.clientX - r.left, w = r.width || 1;
      const mEl = e.target.closest && e.target.closest('[data-m]');
      const xVon = pos(st.von) / 100 * w, xBis = pos(st.bis) / 100 * w;
      let m = mEl ? mEl.dataset.m : (Math.abs(x - xVon) <= Math.abs(x - xBis) ? 'von' : 'bis');
      const zusammen = st.von === st.bis;                                // übereinander: die Richtung entscheidet
      st.versatz = mEl && !zusammen ? x - (m === 'von' ? xVon : xBis) : 0;
      st.zieht = zusammen ? '?' : m; st.pid = e.pointerId; st.x = x; st.x0 = x; st.ruhigX = x; st.ruhigSeit = jetzt();
      try { rahmenEl.setPointerCapture(e.pointerId); } catch (er) { /* egal */ }
      if (!mEl && !zusammen) setze(m, runde(ausX(x)));
      clearInterval(st.takt); st.takt = setInterval(pruefen, 80);
      zeichnen(); e.preventDefault();
    });
    rahmenEl.addEventListener('pointermove', e => {
      if (!st.zieht || e.pointerId !== st.pid) return;
      const x = e.clientX - bahn.getBoundingClientRect().left;
      if (st.zieht === '?') { if (Math.abs(x - st.x0) < 4) return; st.zieht = x < st.x0 ? 'von' : 'bis'; }
      if (Math.abs(x - st.ruhigX) > 7) { st.ruhigX = x; st.ruhigSeit = jetzt(); }
      st.x = x;
      setze(st.zieht, runde(ausX(x - st.versatz)));
      zeichnen();
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) rahmenEl.addEventListener(ev, e => { if (st.pid == null || e.pointerId === st.pid) ende(); });
    for (const m of ['von', 'bis']) M[m].addEventListener('keydown', e => {
      const dv = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
      if (dv == null && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      setze(m, e.key === 'Home' ? min : e.key === 'End' ? max : st[m] + dv);
      zeichnen(); speichern();
    });
    skalaZeichnen(); zeichnen();
  }
  /** Rad für die Circa-Angabe: senkrecht drehen, der Eintrag in der Mitte gilt. */
  function radBinden(el, api) {
    const f = el.querySelector('[data-radf]'); if (!f) return;
    const items = [...f.querySelectorAll('.pb-rad-i')], pfad = el.dataset.p;
    const H = () => (items[0] && items[0].offsetHeight) || 44;
    const idx = () => Math.max(0, Math.min(items.length - 1, Math.round(f.scrollTop / H())));
    const mark = i => items.forEach((it, j) => { it.classList.toggle('on', j === i); it.setAttribute('aria-selected', String(j === i)); });
    let stand = Math.max(0, items.findIndex(it => it.dataset.v === String(el.dataset.v || ''))), t = 0;
    f.scrollTop = stand * H(); mark(stand);
    const uebernehmen = () => {
      const j = idx(); if (j === stand) return; stand = j;
      const v = items[j].dataset.v;
      setPath(api.d.data, pfad, v === '' ? undefined : Number(v));
      api.persist(false); live(api);
    };
    f.addEventListener('scroll', () => { mark(idx()); clearTimeout(t); t = setTimeout(uebernehmen, 140); }, { passive: true });
    const zu = i => { const top = Math.max(0, Math.min(items.length - 1, i)) * H(); try { f.scrollTo({ top, behavior: 'smooth' }); } catch (e) { f.scrollTop = top; } };
    f.addEventListener('click', e => { const it = e.target.closest && e.target.closest('.pb-rad-i'); if (it) zu(items.indexOf(it)); });
    f.addEventListener('keydown', e => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); zu(idx() + (e.key === 'ArrowDown' ? 1 : -1)); });
  }
  const grow = ta => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  function mounted(host, api) {
    const h = host || $('#wMain'); if (!h) return;
    h.querySelectorAll('.pb-rng').forEach(el => leisteBinden(el, api));
    h.querySelectorAll('.pb-rad').forEach(el => radBinden(el, api));
    h.querySelectorAll('textarea.es-ta').forEach(grow);
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus({ preventScroll: true }); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
    // Zurück in der Übersicht: der Punkt, von dem man kommt, steht wieder im Blick (nach dem Sprung an den Seitenanfang, den der Folienwechsel auslöst)
    if (V.zurueck) {
      const k = V.zurueck; V.zurueck = '';
      if (V.s === 'b' && V.f === 'hub') setTimeout(() => { const el = h.querySelector(`[data-sd="pkt"][data-v="${k}"]`); if (el && el.isConnected && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 0);
    }
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (Fokus und Finger bleiben, wo sie sind). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    const B = B_(data), b = B[V.i];
    if (V.s === 'b' && b) { put('satz', V.f === 'hub' ? ganzerText(data, b) : folieText(data, b, V.f)); put('sub', subOf(B, V.i)); }
  }

  /* ======================= Ereignisse ======================= */
  /** Zurück zur Liste: eine versehentlich angelegte, leere Beschreibung verschwindet wieder. */
  function leave(data) {
    const B = B_(data);
    if (V.s === 'b' && istLeer(B[V.i])) { B.splice(V.i, 1); if (B.length) data.pb = B; else delete data.pb; }
    V.s = 'liste'; V.i = -1; V.f = 'hub'; V.direkt = false;
  }
  async function del(api) {
    const data = api.d.data, B = B_(data), b = B[V.i]; if (!b) return;
    if (!istLeer(b)) {
      const zu = beiWem(data, b);
      const ok = await api.ask({ title: 'Beschreibung entfernen?', text: `Die Personenbeschreibung${has(b.von) ? ` von ${str(b.von)}` : ''} wird gelöscht${zu ? ` – auch in der Schilderung (${zu})` : ''}.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
      if (!ok) return;
    }
    B.splice(V.i, 1); if (B.length) data.pb = B; else delete data.pb;
    V.s = 'liste'; V.i = -1; V.f = 'hub'; V.direkt = false;
    if (!B.length && api.d.status === 'fertig') api.d.status = 'entwurf';
    api.persist(true); api.render();
  }
  /** Abschnitt abschließen: fertig markieren und den Text zum Kopieren zeigen. Blieb etwas offen, ist der Schlusssatz vorgewählt. */
  function fertig(api) {
    const d = api.d, data = d.data;
    if (V.s === 'b') { const b = B_(data)[V.i]; if (b && !istLeer(b)) { sonstVorwahl(b); b.fertig = true; } leave(data); }
    if (!B_(data).length) { api.toast('Noch nichts eingetragen – erst eine Beschreibung aufnehmen.'); api.persist(false); api.render(); return; }
    d.status = 'fertig'; V.s = 'done';
    api.persist(true); api.render();
    const miss = luecken(data);
    if (miss.length) api.toast(`Fertig – noch offen: ${miss.length} ${miss.length === 1 ? 'Punkt' : 'Punkte'}.`);
  }
  function click(e, api) {
    const b0 = e.target.closest && e.target.closest('[data-sd]'); if (!b0 || !b0.closest('#wMain')) return false;
    if (b0.disabled) return true;
    const d = api.d, data = d.data, a = b0.dataset.sd, v = b0.dataset.v, pfad = b0.dataset.p;
    const B = () => { if (!Array.isArray(data.pb)) data.pb = []; return data.pb; };
    const cur = () => B()[V.i];
    const save = () => { api.persist(false); api.render(); };
    /** Folie zeigen. Beim Abschluss ist der Schlusssatz vorgewählt, sobald etwas beschrieben ist und anderes offen blieb. */
    const zeige = (b, f) => { V.f = folien(b).includes(f) ? f : 'hub'; if (V.f === 'wer' && !api.mobile()) V.focus = 'pbVon'; if (V.f === 'ab' && sonstVorwahl(b)) api.persist(false); api.render(); };
    switch (a) {
      case 'add': {
        if (d.status === 'fertig') d.status = 'entwurf';
        const neu = { id: neuId(B()) }; if (formOf(B()[0]) === 'text') neu.form = 'text'; // dieselbe Darstellung wie die übrigen
        B().push(neu);
        V.i = B().length - 1; V.s = 'b'; V.f = 'hub'; V.direkt = false;
        save(); return true;
      }
      case 'edit': V.i = Number(b0.dataset.i); V.s = 'b'; V.f = 'hub'; V.direkt = false; api.render(); return true;
      case 'menu': leave(data); save(); return true;
      /* aus der Übersicht hinaus – in den Vorgang oder zur Liste aller Vorgänge */
      case 'raus': leave(data); api.persist(false); if (typeof api.list === 'function') api.list(); else api.render(); return true;
      /* Bearbeiten/Nachtragen: bei einer einzigen Beschreibung gleich in ihre Übersicht */
      case 'go': { if (V.s === 'b') leave(data); if (B_(data).length === 1) { V.s = 'b'; V.i = 0; V.f = 'hub'; } else { V.s = 'liste'; V.i = -1; } save(); return true; }
      case 'hub': V.zurueck = V.f; V.f = 'hub'; V.direkt = false; api.render(); return true;
      /* einen Punkt in der Übersicht antippen · alles der Reihe nach, beginnend beim ersten offenen */
      case 'pkt': { const b = cur(); if (!b) return true; V.direkt = true; zeige(b, v); return true; }
      case 'reihe': { const b = cur(); if (!b) return true; V.direkt = false; zeige(b, erstesOffene(b)); return true; }
      case 'pf': { const b = cur(); if (!b) return true; const F = folien(b), k = Math.max(0, Math.min(F.length - 1, F.indexOf(V.f) + Number(v))); V.direkt = false; zeige(b, F[k]); return true; }
      case 'done1': case 'alle': fertig(api); return true;
      case 'del': del(api); return true;
      /* eine Auswahl – ein zweiter Tipp nimmt sie zurück */
      case 'eins': { const c = getPath(data, pfad); setPath(data, pfad, String(c ?? '') === v ? undefined : (/\.nr$/.test(pfad) ? Number(v) : v)); save(); return true; }
      case 'setze': setPath(data, pfad, v); save(); return true;
      /* mehrere bis zu einer Höchstzahl – darüber fällt die älteste Auswahl weg */
      case 'mehr': {
        const max = Number(b0.dataset.max) || 0, a2 = arr(getPath(data, pfad)).slice(), k = a2.indexOf(v);
        if (k >= 0) a2.splice(k, 1); else { a2.push(v); if (max && a2.length > max) a2.shift(); }
        setPath(data, pfad, a2.length ? a2 : undefined); save(); return true;
      }
      case 'tog': setPath(data, pfad, getPath(data, pfad) ? undefined : true); save(); return true;
      /* Schlusssatz: ja oder ausdrücklich nein – so bleibt eine Abwahl stehen und wird nicht wieder vorgewählt */
      case 'sonst': { const b = cur(); if (!b) return true; b.sonst = b.sonst !== true; save(); return true; }
      /* Darstellung für alle Beschreibungen des Abschnitts: Liste (Vorgabe) oder Fließtext */
      case 'form': { for (const b of B_(data)) { if (v === 'text') b.form = 'text'; else delete b.form; } save(); return true; }
      case 'modus': setPath(data, pfad, v === 'ca' ? 'ca' : undefined); { const o = getPath(data, pfad.replace(/\.m$/, '')); if (o && typeof o === 'object' && !Object.keys(o).length) setPath(data, pfad.replace(/\.m$/, ''), undefined); } save(); return true;
      case 'rngx': { const o = getPath(data, pfad); if (o && typeof o === 'object') { delete o.von; delete o.bis; if (!Object.keys(o).length) setPath(data, pfad, undefined); } save(); return true; }
      case 'von': { const b = cur(); if (!b) return true; if (str(b.von) === v) delete b.von; else b.von = v; save(); return true; }
      case 'copy': api.copy(abschnitt(data), b0); return true;
      case 'copy1': { const b = B_(data)[Number(b0.dataset.i)]; if (b) api.copy(text(b, { art: data.art }), b0); return true; }
      /* Personen- und Fahrzeugbeschreibung in einem Stück – zum schnellen Weitergeben */
      case 'copy2': { const FZ = root.WFZ && root.WFZ.core, fz = FZ ? arr((ctxOf(api) || {}).fahrzeuge).map(f => FZ.text(f && f.d)).filter(Boolean).join('\n') : ''; api.copy([abschnitt(data), fz ? `Fahrzeugbeschreibung\n${fz}` : ''].filter(Boolean).join('\n\n'), b0); return true; }
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.dataset.single && /\n/.test(el.value)) { const at = el.selectionStart; el.value = el.value.replace(/\s*\n\s*/g, ' '); try { el.setSelectionRange(at, at); } catch (er) { /* egal */ } }
    if (el.classList.contains('es-ta')) grow(el);
    setPath(api.d.data, el.dataset.sk, el.value);
    api.persist(false); live(api);
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    e.preventDefault(); el.blur();
    return true;
  }
  /** ⌘/Strg + Enter: der eine nächste Schritt der Folie – wie der Knopf unten rechts. */
  function submit() { const b = $('#wMain .fo-nav .fo-next'); if (b) b.click(); }

  root.WPB = Object.freeze({
    id: 'pb', name: 'Personenbeschreibung', short: 'Personenbeschreibung', kurz: 'PB', noNew: true,
    desc: 'Geführte Abfrage vom Gesamteindruck zum Einzelnen – gegliedert in körperliche Merkmale sowie Bekleidung und besondere Merkmale',
    intro: 'Übersicht der Überpunkte: der Reihe nach abfragen oder nur antippen · Text als Liste oder Fließtext, sofort kopierbar · später bei der Schilderung übernehmen',
    labels: { newBtn: 'Personenbeschreibung', bericht: 'Personenbeschreibung' },
    steps: [],
    title, subtitle, pill,
    plain, still,
    text: data => [['', 'Personenbeschreibung', rumpf(data, B_(data)), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, keydown, submit, key },
    kontext: { nimmt },
    /* Zusatzbaustein (Untermenü im Vorgang): wird zuerst aufgenommen und steht deshalb ganz vorn */
    zusatz: {
      wann: 'zuerst',
      punkte: [{ k: 'pb', l: 'Personenbeschreibung', h: 'Geführte Abfrage, sofort kopierbar' }],
      hat: () => true, setzen: () => true, leer: data => !B_(data).length,
      info: data => { const n = B_(data).length; return n ? `${n} erfasst${namen(data).length ? ' · ' + namen(data).join(', ') : ''}` : ''; }
    },
    core: { PUNKTE, GRUPPE, MERKMALE, SPANNE, STATUR, PHAENO, FARBE, LAENGE, BART, BEZ, WLV, FORMEN, bezOf, formen, spanneText, spanneKurz, werte, liste, punktWert, punktDa, offene, formOf, teile, text, kurz, istLeer, sonstVorwahl, folien, erstesOffene, luecken, offen, abschnitt, plain, still, nimmt, ordnen }
  });
})(typeof window !== 'undefined' ? window : globalThis);
