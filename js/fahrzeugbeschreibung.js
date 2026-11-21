/*
 * Workoholic · Zusatzbaustein „Fahrzeugbeschreibung“
 * ---------------------------------------------------------------
 * Das Gegenstück zur Personenbeschreibung (js/personenbeschreibung.js), mit derselben Bedienung: Je Beschreibung eine
 * Übersicht der Überpunkte – man sieht, was wo gefragt wird, und tippt entweder nur an, wozu es Angaben gibt, oder fragt
 * alles der Reihe nach ab („Zurück / Weiter“).
 *
 * Die Reihenfolge geht vom Groben zum Feinen, so wie man ein Fahrzeug wahrnimmt: erst Art und Form, dann die Farbe (beides
 * wird am ehesten richtig erinnert), danach Marke und Modell (hier irren sich Zeugen häufiger – deshalb „vermutlich“) und
 * das Kennzeichen (oft nur in Bruchstücken), zuletzt Besonderheiten. Der zweite Block hält fest, was mit dem Fahrzeug
 * geschah: wer einstieg und wo, wie viele Personen darin saßen, wohin es fuhr.
 *
 * Verknüpfung mit der Personenbeschreibung: Sind im selben Vorgang Personen beschrieben, stehen sie beim Punkt „Insassen“
 * zur Schnellwahl – „Der Täter stieg als Fahrer auf der Fahrerseite ein“. Welche Plätze es gibt, richtet sich nach der
 * Fahrzeugart (Pkw: Fahrer, Beifahrer, hinten links/rechts · Motorrad: Fahrer, Sozius …). Beides lässt sich auch völlig
 * unabhängig voneinander aufnehmen, in beliebiger Reihenfolge: ein Fahrzeug ohne Bezug zu einer Person bleibt einfach ohne.
 *
 * Ausgabe wie bei der Personenbeschreibung in zwei Blöcken („Fahrzeug“ · „Insassen und Fahrtrichtung“), als Liste (Vorgabe)
 * oder Fließtext, als reiner Text in jedes andere Programm kopierbar. Was nicht beantwortet wird, steht nicht im Text und
 * wird nicht verneint – dafür gibt es den einen Schlusssatz. Im Vorgang steht der Abschnitt vorn, gleich nach der
 * Personenbeschreibung; in den Schilderungen lässt er sich bei der Person übernehmen, die das Fahrzeug beschrieben hat.
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

  /* ======================= Kataloge ======================= */
  /** Die Überpunkte der Abfrage in der Reihenfolge der Folien. gr: 'A' = das Fahrzeug selbst · 'B' = was mit ihm geschah. */
  const PUNKTE = [
    { k: 'wer', l: 'Wer beschreibt was?', fragt: 'Name für deine Zuordnung · Bezeichnung im Text' },
    { k: 'art', gr: 'A', l: 'Art und Form', fragt: 'Pkw, Transporter, Motorrad … · Aufbau' },
    { k: 'farbe', gr: 'A', l: 'Farbe', fragt: 'Farbe · hell oder dunkel' },
    { k: 'marke', gr: 'A', l: 'Marke und Modell', fragt: 'Marke · Modell · sicher oder vermutlich' },
    { k: 'kz', gr: 'A', l: 'Kennzeichen', fragt: 'Ganz oder in Bruchstücken' },
    { k: 'bes', gr: 'A', l: 'Besonderheiten', fragt: 'Aufkleber, Schäden, Felgen, Dachträger, Aufschrift' },
    { k: 'ins', gr: 'B', l: 'Insassen', fragt: 'Wer stieg ein und wo · Anzahl' },
    { k: 'richt', gr: 'B', l: 'Fahrtrichtung', fragt: 'Wohin fuhr es?' },
    { k: 'ab', l: 'Abschluss', fragt: 'Keine weiteren Angaben' }
  ];
  /** Die zwei Blöcke der Ausgabe. */
  const GRUPPE = { A: 'Fahrzeug', B: 'Insassen und Fahrtrichtung' };
  /** Fahrzeugart: [Schlüssel, Chip, im Text, Plätze (PLATZ), Marken (MARKEN)]. Der Aufbau (AUFBAU) hängt an der Art. */
  const ART = [
    ['pkw', 'Pkw', 'Pkw', 'auto', 'pkw'], ['transporter', 'Transporter', 'Transporter', 'kasten', 'pkw'], ['lkw', 'Lkw', 'Lkw', 'lkw', 'lkw'],
    ['krad', 'Motorrad', 'Motorrad', 'zweirad', 'krad'], ['roller', 'Roller', 'Motorroller', 'zweirad', 'krad'],
    ['rad', 'Fahrrad', 'Fahrrad', 'einsitz', ''], ['escooter', 'E-Scooter', 'E-Scooter', 'einsitz', '']
  ];
  const AUFBAU = {
    pkw: ['Kleinwagen', 'Limousine', 'Kombi', 'SUV', 'Van', 'Coupé', 'Cabrio', 'Pick-up'],
    transporter: ['Kastenwagen', 'Kleinbus', 'Hochdachkombi', 'Pritsche'],
    lkw: ['Kofferaufbau', 'Plane', 'Pritsche', 'Sattelzug', 'Kipper'],
    krad: ['Sportmotorrad', 'Chopper', 'Enduro'],
    rad: ['Mountainbike', 'Rennrad', 'Citybike', 'E-Bike', 'Lastenrad']
  };
  const FARBE = ['weiß', 'silber', 'grau', 'schwarz', 'blau', 'rot', 'grün', 'gelb', 'orange', 'braun', 'beige'];
  /** „hell“ und „dunkel“ stehen für sich („dunkel“) oder vor der Farbe („dunkelblau“) – bei Weiß, Schwarz und Silber nicht. */
  const TON = [['hell', 'Hell'], ['dunkel', 'Dunkel']];
  const TONLOS = ['weiß', 'schwarz', 'silber'];
  const MARKEN = {
    pkw: ['VW', 'Mercedes', 'BMW', 'Audi', 'Opel', 'Ford', 'Škoda', 'Seat', 'Renault', 'Peugeot', 'Fiat', 'Toyota', 'Hyundai', 'Kia', 'Dacia'],
    lkw: ['MAN', 'Mercedes', 'DAF', 'Scania', 'Volvo', 'Iveco'],
    krad: ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'BMW', 'KTM', 'Harley-Davidson', 'Vespa']
  };
  /** Wo jemand einstieg – je nach Fahrzeugart: [Schlüssel, Chip, im Text]. */
  const PLATZ = {
    auto: [['f', 'Fahrer', 'als Fahrer auf der Fahrerseite'], ['bf', 'Beifahrer', 'auf der Beifahrerseite'], ['hl', 'Hinten links', 'hinten links'], ['hr', 'Hinten rechts', 'hinten rechts'], ['h', 'Hinten', 'hinten']],
    kasten: [['f', 'Fahrer', 'als Fahrer auf der Fahrerseite'], ['bf', 'Beifahrer', 'auf der Beifahrerseite'], ['st', 'Schiebetür', 'durch die seitliche Schiebetür'], ['lr', 'Laderaum', 'hinten in den Laderaum']],
    lkw: [['f', 'Fahrer', 'als Fahrer auf der Fahrerseite'], ['bf', 'Beifahrer', 'auf der Beifahrerseite']],
    zweirad: [['f', 'Fahrer', 'als Fahrer'], ['soz', 'Sozius', 'als Sozius']],
    einsitz: [['f', 'Fuhr damit', '']]
  };
  /** Besetzung: [Schlüssel, Chip, im Text]. */
  const ZAHL = [['1', '1', 'einer Person'], ['2', '2', 'zwei Personen'], ['3', '3', 'drei Personen'], ['4', '4', 'vier Personen'], ['m', 'Mehr', 'mehreren Personen']];
  /** Wie das Fahrzeug im Text heißt: [Schlüssel, Chip, Nominativ/Akkusativ, Dativ]. */
  const BEZ = [['fz', 'Fahrzeug', 'das Fahrzeug', 'dem Fahrzeug'], ['flucht', 'Fluchtfahrzeug', 'das Fluchtfahrzeug', 'dem Fluchtfahrzeug'], ['tat', 'Tatfahrzeug', 'das Tatfahrzeug', 'dem Tatfahrzeug']];
  /** Darstellung der Ausgabe: gegliederte Liste (Vorgabe) oder Fließtext. */
  const FORMEN = [['liste', 'Liste'], ['text', 'Fließtext']];
  /** Kennung einer Person, die nicht eigens beschrieben ist. */
  const JEMAND = 'x';

  /* ======================= Text ======================= */
  const artOf = f => ART.find(x => x[0] === (f && f.art)) || null;
  /** Plätze, die es bei dieser Fahrzeugart gibt (ohne Angabe: wie beim Pkw). */
  const plaetze = f => PLATZ[(artOf(f) || [])[3] || 'auto'];
  /** Steigt man auf (Motorrad, Fahrrad) statt ein? */
  const aufsteigen = f => ['zweirad', 'einsitz'].includes((artOf(f) || [])[3]);
  const bezOf = f => (BEZ.find(x => x[0] === (f && f.bez)) || BEZ[0]);
  /** { nom, akk, dat } – „das Fluchtfahrzeug“ / „dem Fluchtfahrzeug“, bei mehreren Fahrzeugen mit Nummer. */
  function formen(f) {
    const b = bezOf(f), n = num(f && f.nr), nr = n ? ' ' + n : '';
    return { nom: b[2] + nr, akk: b[2] + nr, dat: b[3] + nr };
  }
  const farbeText = f => (has(f.farbe) ? (f.ton && !TONLOS.includes(f.farbe) ? f.ton + f.farbe : str(f.farbe)) : TON.some(x => x[0] === f.ton) ? f.ton : '');
  /** „Bahnhof“ → „in Richtung Bahnhof“; wer schon „nach Norden“ oder „stadtauswärts“ schreibt, bleibt so stehen. */
  function richtText(s) {
    const t = frei(s); if (!t) return '';
    if (/^richtung\s/i.test(t)) return `in Richtung ${t.replace(/^richtung\s+/i, '')}`;
    return /^(in|auf|nach|zur|zum|über|entlang|durch|gen)\s/i.test(t) || /^(stadt|orts)(ein|aus)wärts/i.test(t) ? t : `in Richtung ${t}`;
  }
  /** Wer wo einstieg: gültige Einträge mit dem Satzteil zum Platz. Ein Platz, den es bei der Art nicht (mehr) gibt, behält seinen Text. */
  function einstiege(f) {
    const P = plaetze(f), alle = Object.values(PLATZ).flat();
    return arr(f && f.ins).filter(x => x && has(x.nom) && has(x.platz)).map(x => ({ k: x.k, nom: str(x.nom), platz: x.platz, wie: ((P.find(p => p[0] === x.platz) || alle.find(p => p[0] === x.platz) || [])[2]) || '' }));
  }
  /**
   * Die Angaben einer Beschreibung, in der Reihenfolge der Abfrage. Je Angabe:
   *   p  Überpunkt (Folie) · k Merkmal · l Bezeichnung in der Liste · v Wert in der Liste · s Satzteil im Fließtext
   *   gr Block ('A' Fahrzeug, 'B' Insassen und Fahrtrichtung)
   * Nur was beantwortet ist, kommt vor – Offenes wird nicht verneint.
   */
  function werte(f) {
    f = f && typeof f === 'object' ? f : {};
    const W = [], add = (p, k, l, v, s, gr) => { if (has(v)) W.push({ p, k, l, v, s: has(s) ? s : v, gr }); };
    const a = artOf(f);
    add('art', 'art', 'Art', mit(a ? a[2] : '', a && arr(AUFBAU[a[0]]).includes(f.aufbau) ? f.aufbau : '', frei(f.artX)), '', 'A');
    add('farbe', 'farbe', 'Farbe', mit(farbeText(f), frei(f.farbeX)), '', 'A');
    const mm = [frei(f.marke), frei(f.modell)].filter(Boolean).join(' ');
    add('marke', 'marke', 'Marke/Modell', mm ? `${f.verm ? 'vermutlich ' : ''}${mm}` : '', '', 'A');
    const kz = frei(f.kz), kl = f.kzTeil ? 'Kennzeichenfragment' : 'Kennzeichen';
    add('kz', 'kz', kl, kz, kz ? `${kl} ${kz}` : '', 'A');
    add('bes', 'bes', 'Besonderheiten', frei(f.bes), '', 'A');
    const E = einstiege(f), z = ZAHL.find(x => x[0] === String(f.zahl ?? ''));
    add('ins', 'ein', aufsteigen(f) ? 'Aufgestiegen' : 'Eingestiegen', E.map(x => [x.nom, x.wie].filter(Boolean).join(' ')).join('; '), '', 'B');
    add('ins', 'zahl', 'Besetzt mit', z ? z[2] : '', '', 'B');
    add('ins', 'insX', 'Insassen', frei(f.insX), '', 'B');
    add('richt', 'richt', 'Fahrtrichtung', richtText(f.richt), '', 'B');
    return W;
  }
  /** Die Angaben zum Fahrzeug selbst als Aufzählung – für Kurzfassungen. */
  const liste = f => werte(f).filter(x => x.gr === 'A').map(x => x.s);
  /** Antwort zu einem Überpunkt, wie sie in der Übersicht steht. */
  const punktWert = (f, p) => werte(f).filter(x => x.p === p).map(x => x.v).join(' · ');
  /** Überpunkte, zu denen nichts eingetragen ist – sie stehen nicht im Text; der Schlusssatz deckt sie ab. */
  const offene = f => { const da = new Set(werte(f).map(x => x.p)); return PUNKTE.filter(p => p.gr && !da.has(p.k)).map(p => p.l); };
  const formOf = f => (f && f.form === 'text' ? 'text' : 'liste');
  /** Gegliederte Liste: je Block eine Überschrift, je Angabe eine Zeile. Reiner Text – übersteht jedes Kopieren. */
  const alsListe = W => ['A', 'B'].map(g => { const X = W.filter(x => x.gr === g); return X.length ? [`${GRUPPE[g]}:`, ...X.map(x => `– ${x.l}: ${x.v}`)].join('\n') : ''; }).filter(Boolean).join('\n');
  /**
   * Die Bausteine des Textes einer Beschreibung.
   *   o.wer   „die Zeugin Müller“ – Satzgegenstand, wenn die Beschreibung bei einer Person der Schilderungen steht
   *   o.pr    deren Pronomen ({ er: 'sie' … }) für die Folgesätze
   * Ohne o.wer steht der frei eingetragene Name vorn („Frau Müller beschrieb …“), ohne Namen das Passiv.
   * Liefert { F, W, intro, saetze, schluss } – saetze = der zweite Block als ganze Sätze (für den Fließtext).
   */
  function teile(f, o = {}) {
    f = f && typeof f === 'object' ? f : {};
    const F = formen(f), W = werte(f), B = [], S = [];
    const subj = has(o.wer) ? str(o.wer) : str(f.von);
    const er = has(o.wer) && o.pr && has(o.pr.er) ? o.pr.er : '';
    const intro = subj ? `${cap(subj)} beschrieb ${F.akk} wie folgt:` : `${cap(F.nom)} wurde wie folgt beschrieben:`;
    const ende = aufsteigen(f) ? 'auf' : 'ein';
    for (const x of einstiege(f)) B.push(`${cap(x.nom)} stieg ${x.wie ? x.wie + ' ' : ''}${ende}.`);
    const z = (W.find(x => x.k === 'zahl') || {}).v, r = (W.find(x => x.k === 'richt') || {}).v, iX = (W.find(x => x.k === 'insX') || {}).v;
    if (z && r) B.push(`${cap(F.nom)} war mit ${z} besetzt und entfernte sich ${r}.`);
    else if (z) B.push(`${cap(F.nom)} war mit ${z} besetzt.`);
    else if (r) B.push(`${cap(F.nom)} entfernte sich ${r}.`);
    if (iX) B.push(`Zu den Insassen: ${iX}.`);
    if (f.sonst === true) {
      if (!W.length) S.push(subj ? `${cap(subj)} konnte ${F.akk} nicht beschreiben.` : `${cap(F.nom)} konnte nicht beschrieben werden.`);
      else S.push(er ? `Weitere Angaben zu ${F.dat} könne ${er} nicht machen.` : `Weitere Angaben zu ${F.dat} konnten nicht gemacht werden.`);
    }
    return { F, W, intro, saetze: B, schluss: S };
  }
  /** Der Text einer Beschreibung – als gegliederte Liste oder als Fließtext (f.form), Optionen wie bei teile(). */
  function text(f, o = {}) {
    if (!f || typeof f !== 'object') return '';
    const T = teile(f, o), A = T.W.filter(x => x.gr === 'A');
    if (formOf(f) === 'text') return [A.length ? `${T.intro} ${A.map(x => x.s).join(', ')}`.replace(/([^.…!?])$/, '$1.') : '', ...T.saetze, ...T.schluss].filter(Boolean).join(' ');
    return [T.W.length ? `${T.intro}\n${alsListe(T.W)}` : '', T.schluss.join(' ')].filter(Boolean).join('\n');
  }
  /** Kurzfassung für Listen und Chips. */
  function kurz(f, n = 4) {
    const L = liste(f);
    return L.length > n ? L.slice(0, n).join(' · ') + ' …' : L.join(' · ');
  }
  /** Noch nichts eingetragen – eine versehentlich angelegte Beschreibung verschwindet wieder. */
  const istLeer = f => !f || (!has(f.von) && !werte(f).length && f.sonst !== true && !f.bez && !f.nr);
  /** Schlusssatz vorwählen (liefert true, wenn er gesetzt wurde): sobald etwas beschrieben ist und anderes offen blieb. */
  const sonstVorwahl = f => { if (!f || f.sonst !== undefined || !werte(f).length || !offene(f).length) return false; f.sonst = true; return true; };

  const F_ = data => arr(data && data.fz).filter(f => f && typeof f === 'object');
  /** Bei wem die Beschreibung in den Schilderungen steht ('' = bei niemandem). */
  const beiWem = (data, f) => str(((data && data.zu) || {})[f && f.id]);
  const freie = data => F_(data).filter(f => !beiWem(data, f));
  const rumpf = (data, list) => list.map(f => text(f)).filter(Boolean).join('\n');
  /** Der ganze Abschnitt zum Kopieren – alle Beschreibungen, auch die, die schon bei einer Schilderung stehen. */
  const abschnitt = data => `Fahrzeugbeschreibung\n${rumpf(data, F_(data)) || '[Noch nichts erfasst]'}`;
  /** Im Gesamtsachverhalt: nur, was nicht schon in einer Schilderung steht. */
  const plain = data => { const t = rumpf(data, freie(data)); return t ? `Fahrzeugbeschreibung\n${t}` : ''; };
  const still = data => !rumpf(data, freie(data));
  /** Personen- und Fahrzeugbeschreibung in einem Stück – zum schnellen Weitergeben. pb = Beschreibungen aus dem Vorgang ([{ d }]). */
  function zusammen(data, pb, art) {
    const PB = root.WPB && root.WPB.core;
    const p = PB ? arr(pb).map(b => PB.text(b && b.d, { art })).filter(Boolean).join('\n') : '';
    return [p ? `Personenbeschreibung\n${p}` : '', abschnitt(data)].filter(Boolean).join('\n\n');
  }

  /* ---------- Was noch fehlt ---------- */
  const nenne = (f, i) => `Fahrzeug ${i + 1}${has(f.von) ? ` (${str(f.von)})` : ''}`;
  function luecken(data) {
    const m = [], L = F_(data);
    if (!L.length) m.push('Fahrzeugbeschreibung aufnehmen');
    L.forEach((f, i) => { if (!werte(f).length && f.sonst !== true) m.push(`${nenne(f, i)}: noch keine Angaben`); });
    return m;
  }
  const unverteilt = data => (data && data.schDa ? F_(data).filter(f => !beiWem(data, f)) : []);
  const offen = data => [...luecken(data), ...unverteilt(data).map(f => `${nenne(f, F_(data).indexOf(f))}: noch bei keiner Schilderung übernommen`)];

  /* ---------- Listen-Texte ---------- */
  const namen = data => F_(data).map(f => str(f.von)).filter(Boolean);
  function title(data) { const k = F_(data).map(f => kurz(f, 2)).filter(Boolean); return k.length ? `Fahrzeugbeschreibung – ${k.join(' / ')}` : 'Fahrzeugbeschreibung'; }
  function subtitle(data) {
    const n = F_(data).length; if (!n) return 'noch keine Beschreibung';
    return `${n} ${n === 1 ? 'Fahrzeug' : 'Fahrzeuge'}${namen(data).length ? ' · ' + namen(data).join(', ') : ''}`;
  }
  function pill(data) { const L = F_(data); return L.length ? `${L.filter(f => f.fertig).length}/${L.length}` : 'neu'; }

  /* ======================= Kontext aus dem Vorgang ======================= */
  /** Die beschriebenen Personen des Vorgangs, wie sie beim Fahrzeug zur Wahl stehen: [{ k, nom, von }]. */
  function personen(ctx) {
    const PB = root.WPB && root.WPB.core;
    return PB ? arr(ctx && ctx.beschreibungen).filter(b => b && has(b.id)).map(b => ({ k: b.id, nom: PB.formen(b.d, ctx.art).nom, von: str(b.von) })) : [];
  }
  /**
   * Übernimmt aus dem Vorgang (rein, ohne DOM; liefert true, wenn sich etwas geändert hat):
   * – bei wem welche Beschreibung in den Schilderungen steht (data.zu) und ob es Schilderungen gibt (data.schDa),
   * – wie die verknüpften Personen der Personenbeschreibung heißen („der Täter“, „die Täterin 2“) – ändert sich dort
   *   Geschlecht, Bezeichnung oder Nummer, stimmt der Satz auch hier. Eine gelöschte Personenbeschreibung lässt den Satz stehen.
   */
  function nimmt(data, ctx) {
    if (!data || typeof data !== 'object' || !ctx) return false;
    let ch = false;
    const set = (k, v) => { if (same(data[k], v)) return; if (v == null || v === '') delete data[k]; else data[k] = v; ch = true; };
    const zu = {};
    for (const n of arr(ctx.nutzung)) if (n && has(n.id) && F_(data).some(f => f.id === n.id)) zu[n.id] = str(n.wer) || 'eine Person';
    set('zu', Object.keys(zu).length ? zu : undefined);
    set('schDa', ctx.nutzungAus ? true : undefined);
    const P = new Map(personen(ctx).map(q => [q.k, q.nom]));
    for (const f of F_(data)) for (const x of arr(f.ins)) if (x && P.has(x.k) && x.nom !== P.get(x.k)) { x.nom = P.get(x.k); ch = true; }
    return ch;
  }

  /* ======================= Maske ======================= */
  /*
   * Ansichten wie bei der Personenbeschreibung:
   *   Abschnitt:        'liste' (nur bei mehreren Fahrzeugen)  →  'done' fertiger Text zum Kopieren
   *   je Beschreibung:  'b' mit V.f = 'hub' (Übersicht der Überpunkte) oder einer Folie, eine je Überpunkt:
   *                     'wer' → 'art' → 'farbe' → 'marke' → 'kz' → 'bes' → 'ins' → 'richt' → 'ab'
   */
  const V = { id: null, s: 'liste', i: -1, f: 'hub', direkt: false, zurueck: '', neu: false, focus: '' };
  const $ = s => document.querySelector(s);
  const punkt = k => PUNKTE.find(p => p.k === k);
  const folien = () => PUNKTE.map(p => p.k);
  const punktDa = (f, k) => { f = f || {}; return k === 'wer' ? has(f.von) : k === 'ab' ? f.sonst === true : !!punktWert(f, k); };
  const erstesOffene = f => folien().find(k => !punktDa(f, k)) || 'ab';
  const neuId = L => { let id; do { id = 'f' + Math.random().toString(36).slice(2, 8); } while (arr(L).some(f => f && f.id === id)); return id; };
  /** Bringt die Liste in Form (liefert true, wenn etwas geändert wurde): nur Beschreibungen, jede mit eigener Kennung. */
  function ordnen(data) {
    if (!data || data.fz == null) return false;
    let ch = false;
    const L = F_(data), seen = new Set();
    if (!Array.isArray(data.fz) || L.length !== data.fz.length) ch = true;
    for (const f of L) { if (!has(f.id) || seen.has(f.id)) { f.id = neuId(L); ch = true; } seen.add(f.id); }
    if (ch) { if (L.length) data.fz = L; else delete data.fz; }
    return ch;
  }
  const ctxOf = api => (api && typeof api.ctx === 'function' ? api.ctx() : null);
  const subOf = (L, i) => `Fahrzeug ${i + 1} von ${L.length}${has(L[i] && L[i].von) ? ' · ' + str(L[i].von) : ''}`;
  /** Was in der Übersicht unter dem Punkt steht: die Antwort – oder, solange er offen ist, was dort gefragt wird. */
  function punktZeile(f, k) {
    if (k === 'wer') return has(f.von) ? `${str(f.von)} beschreibt ${formen(f).akk}` : punkt(k).fragt;
    if (k === 'ab') return f.sonst === true ? 'Keine weiteren Angaben' : punkt(k).fragt;
    return punktWert(f, k) || punkt(k).fragt;
  }
  /** Was die Folie zum Text beiträgt – in der gewählten Darstellung. */
  function folieText(f, k) {
    const T = teile(f);
    if (k === 'wer') return `${T.intro} …`;
    if (k === 'ab') return T.schluss.join(' ') || 'Kein Schlusssatz gewählt.';
    const X = T.W.filter(x => x.p === k);
    if (!X.length) return 'Noch keine Angabe – der Punkt bleibt aus dem Text.';
    if (formOf(f) !== 'text') return X.map(x => `${x.l}: ${x.v}`).join('\n');
    return punkt(k).gr === 'B' ? T.saetze.filter(s => (k === 'richt' ? /entfernte sich/.test(s) : true)).join(' ') : X.map(x => x.s).join(', ');
  }
  const ganzerText = f => text(f) || 'Noch nichts erfasst.';
  const personName = q => [q.g === 'w' ? 'Frau' : q.g === 'm' ? 'Herr' : '', str(q.nachname)].filter(Boolean).join(' ');
  const rolleL = q => { const C = root.WSchild && root.WSchild.core; const l = C && q ? C.rolleLabel(q) : ''; return l === 'Rolle offen' ? '' : l; };

  function open(d) {
    const L = F_(d && d.data);
    V.id = d.id; V.f = 'hub'; V.direkt = false; V.zurueck = ''; V.focus = '';
    V.neu = !L.length; // leer geöffnet: gleich mit der ersten Beschreibung beginnen
    if (d.status === 'fertig' && L.length) { V.s = 'done'; V.i = -1; }
    else if (L.length === 1) { V.s = 'b'; V.i = 0; }
    else { V.s = 'liste'; V.i = -1; }
  }
  const key = () => `${V.s}:${V.i}:${V.s === 'b' ? V.f : ''}`;

  /* ---------- Bausteine der Folien ---------- */
  const eins = (pfad, cur, opts, cls = 'chip') => opts.map(([v, l]) => `<button type="button" class="${cls}" data-sd="eins" data-p="${esc(pfad)}" data-v="${esc(v)}" aria-pressed="${String(String(cur ?? '') === String(v))}">${esc(l)}</button>`).join('');
  const imText = (f, k) => `<div class="w-q pb-im" data-q="im"><span class="w-mk-gt">So steht es im Text</span><p class="pb-satz" data-live="satz">${esc(folieText(f, k))}</p></div>`;
  const feld = (id, pfad, wert, label, ph, o = {}) => `<div class="w-q" data-q="${id}"><label class="w-lbl" for="${id}">${esc(label)}${o.muss ? '' : ` <i class="w-hint-i">(${o.kurz ? 'optional' : 'optional, Stichworte mit Komma'})</i>`}</label><textarea class="input es-ta" id="${id}" data-sk="${esc(pfad)}" data-single="1" rows="1" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="${o.gross ? 'characters' : 'off'}" spellcheck="${o.gross ? 'false' : 'true'}" enterkeyhint="done" maxlength="400">${esc(wert || '')}</textarea>${o.hin ? `<p class="w-hint sd-hint">${esc(o.hin)}</p>` : ''}</div>`;
  const formWahl = f => `<span class="pb-modus" role="group" aria-label="Darstellung">${FORMEN.map(([v, l]) => `<button type="button" class="chip sm" data-sd="form" data-v="${v}" aria-pressed="${String(formOf(f) === v)}">${l}</button>`).join('')}</span>`;

  /* ---------- Folien einer Beschreibung: je Überpunkt eine ---------- */
  function werHtml(f, base, api, L) {
    const ctx = ctxOf(api), P = arr(ctx && ctx.leute).filter(q => q && has(q.nachname));
    const vor = P.length ? `<div class="w-chips sd-sugg">${P.map(q => { const n = personName(q); return `<button type="button" class="chip sm" data-sd="von" data-v="${esc(n)}" aria-pressed="${String(str(f.von) === n)}">${esc(n)}${rolleL(q) ? `<small class="sd-sm">${esc(rolleL(q))}</small>` : ''}</button>`; }).join('')}</div>` : '';
    const nrQ = L.length > 1 || f.nr ? `<div class="w-q" data-q="nr"><span class="w-lbl">Mehrere Fahrzeuge? <i class="w-hint-i">(Nummer, optional)</i></span><div class="w-chips">${eins(`${base}.nr`, f.nr, [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], 'chip mono')}</div></div>` : '';
    return `<div class="w-q" data-q="von"><label class="w-lbl" for="fzVon">Wer beschreibt?</label><input class="input" id="fzVon" data-sk="${base}.von" value="${esc(f.von || '')}" placeholder="z. B. Frau Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="80">${vor}<p class="w-hint sd-hint">Nur für deine Zuordnung – bei den Schilderungen übernimmst du die Beschreibung später mit einem Tipp bei der richtigen Person.</p></div>
      <div class="w-q" data-q="bez"><span class="w-lbl">Wie heißt es im Text?</span><div class="w-chips" role="group" aria-label="Bezeichnung im Text">${BEZ.map(([k, l]) => `<button type="button" class="chip" data-sd="setze" data-p="${base}.bez" data-v="${k}" aria-pressed="${String(bezOf(f)[0] === k)}">${esc(l)}</button>`).join('')}</div></div>
      ${nrQ}`;
  }
  function artHtml(f, base) {
    const a = artOf(f), A = a ? arr(AUFBAU[a[0]]) : [];
    return `<div class="w-q" data-q="art"><span class="w-lbl">Art</span><div class="w-chips" role="group" aria-label="Fahrzeugart">${eins(`${base}.art`, f.art, ART.map(x => [x[0], x[1]]))}</div></div>
      ${A.length ? `<div class="w-q" data-q="aufbau"><span class="w-lbl">Form</span><div class="w-chips" role="group" aria-label="Form">${eins(`${base}.aufbau`, f.aufbau, A.map(x => [x, x]))}</div></div>` : ''}
      ${feld('fzArtX', `${base}.artX`, f.artX, 'Weiteres zu Art und Form', 'z. B. Dreitürer, Wohnmobil, mit Anhänger')}`;
  }
  function farbeHtml(f, base) {
    const tonlos = TONLOS.includes(f.farbe);
    return `<div class="w-q" data-q="ton"><span class="w-lbl">Hell oder dunkel?</span><div class="w-chips${tonlos ? ' pb-aus' : ''}" role="group" aria-label="Helligkeit">${eins(`${base}.ton`, f.ton, TON)}</div><p class="w-hint sd-hint">${tonlos ? `Bei „${esc(f.farbe)}“ steht nur die Farbe im Text.` : 'Reicht für sich („dunkel“) oder steht vor der Farbe („dunkelblau“).'}</p></div>
      <div class="w-q" data-q="farbe"><span class="w-lbl">Farbe</span><div class="w-chips" role="group" aria-label="Farbe">${eins(`${base}.farbe`, f.farbe, FARBE.map(x => [x, x]))}</div></div>
      ${feld('fzFarbeX', `${base}.farbeX`, f.farbeX, 'Weiteres zur Farbe', 'z. B. metallic, matt, zweifarbig, schwarzes Dach')}`;
  }
  function markeHtml(f, base) {
    const M = MARKEN[(artOf(f) || [])[4] ?? 'pkw'] || (artOf(f) ? [] : MARKEN.pkw);
    return `${M.length ? `<div class="w-q" data-q="mk"><span class="w-lbl">Marke</span><div class="w-chips" role="group" aria-label="Marke">${M.map(m => `<button type="button" class="chip" data-sd="marke" data-v="${esc(m)}" aria-pressed="${String(str(f.marke) === m)}">${esc(m)}</button>`).join('')}</div></div>` : ''}
      ${feld('fzMarke', `${base}.marke`, f.marke, M.length ? 'Andere Marke' : 'Marke', 'z. B. Volvo', { kurz: true })}
      ${feld('fzModell', `${base}.modell`, f.modell, 'Modell', 'z. B. Passat', { kurz: true })}
      <div class="w-q" data-q="verm"><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.verm" aria-pressed="${String(!!f.verm)}">Vermutlich</button></div><p class="w-hint sd-hint">Bei Marke und Modell irren sich Zeugen eher als bei der Farbe. Ist die Person nicht sicher, steht „vermutlich“ davor.</p></div>`;
  }
  function kzHtml(f, base) {
    return `${feld('fzKz', `${base}.kz`, f.kz, 'Kennzeichen', 'GT-AB 123', { muss: true, gross: true, hin: 'So eintragen, wie es genannt wird – auch nur die Ortskennung oder einzelne Zeichen, z. B. „GT-A…“ oder „endet auf 47“.' })}
      <div class="w-q" data-q="kzTeil"><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.kzTeil" aria-pressed="${String(!!f.kzTeil)}">Nur ein Bruchstück</button></div><p class="w-hint sd-hint">Im Text steht dann „Kennzeichenfragment“.</p></div>`;
  }
  function insHtml(f, base, api) {
    const ctx = ctxOf(api), P = personen(ctx), auf = aufsteigen(f), Pl = plaetze(f);
    // Wer zur Wahl steht: die beschriebenen Personen, dazu jemand, der nicht eigens beschrieben ist – und wer schon eingetragen ist
    const zeilen = [...P, { k: JEMAND, nom: P.length ? 'eine weitere Person' : 'eine Person', von: '' }];
    for (const x of arr(f.ins)) if (x && has(x.nom) && !zeilen.some(q => q.k === x.k)) zeilen.push({ k: x.k, nom: str(x.nom), von: '' });
    const reihen = zeilen.map(q => {
      const cur = (arr(f.ins).find(x => x && x.k === q.k) || {}).platz;
      return `<div class="fz-pers"><span class="w-lbl">${esc(cap(q.nom))}${q.von ? ` <i class="w-hint-i">laut ${esc(q.von)}</i>` : ''}</span><div class="w-chips" role="group" aria-label="${esc(cap(q.nom))}: ${auf ? 'aufgestiegen' : 'eingestiegen'}">${Pl.map(([v, l]) => `<button type="button" class="chip" data-sd="platz" data-k="${esc(q.k)}" data-n="${esc(q.nom)}" data-v="${v}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div></div>`;
    }).join('');
    const hin = P.length ? 'Zur Wahl stehen die Personen aus der Personenbeschreibung. Nichts antippen heißt: kein Bezug – dann steht dazu nichts im Text.' : 'Ist im Vorgang eine Personenbeschreibung aufgenommen, steht die beschriebene Person hier zur Wahl.';
    return `<div class="w-q" data-q="ein"><span class="w-lbl">${auf ? 'Wer stieg auf?' : 'Wer stieg ein – und wo?'}</span>${reihen}<p class="w-hint sd-hint">${hin}</p></div>
      <div class="w-q" data-q="zahl"><span class="w-lbl">Mit wie vielen Personen besetzt? <i class="w-hint-i">(optional)</i></span><div class="w-chips" role="group" aria-label="Besetzung">${eins(`${base}.zahl`, f.zahl, ZAHL.map(x => [x[0], x[1]]), 'chip mono')}</div></div>
      ${feld('fzInsX', `${base}.insX`, f.insX, 'Weiteres zu den Insassen', 'z. B. Beifahrer trug eine helle Mütze')}`;
  }
  function abHtml(f) {
    const F = formen(f), O = offene(f), satz = `„Weitere Angaben zu ${F.dat} konnten nicht gemacht werden.“`;
    const hin = !werte(f).length ? `Ohne jede Angabe steht im Text, dass ${F.nom} nicht beschrieben werden konnte.`
      : O.length ? `Offen geblieben: ${O.join(', ')}. Das steht nicht im Text und wird nicht verneint – dafür der eine Satz: ${satz}`
        : `Fügt den Satz an: ${satz}`;
    return `<div class="w-q" data-q="sonst"><div class="w-chips"><button type="button" class="chip" data-sd="sonst" aria-pressed="${String(f.sonst === true)}">Sonst keine weiteren Angaben</button></div><p class="w-hint sd-hint">${esc(hin)}</p></div>`;
  }
  /** Übersicht einer Beschreibung: alle Überpunkte untereinander, gegliedert wie die Ausgabe; darunter der Text, wie er gerade steht. */
  function hubHtml(d, api) {
    const data = d.data, L = F_(data), i = V.i, f = L[i] || {}, base = `fz.${i}`, F = folien();
    const leer = !werte(f).length && f.sonst !== true;
    const P = personen(ctxOf(api));
    const kurzwahl = k => {
      // Schnellwahl: „dunkel“ reicht oft schon als Farbe · die beschriebene Person als Fahrer
      if (k === 'farbe') return `<div class="pb-kurz">${TON.slice().reverse().map(([v, l]) => `<button type="button" class="chip" data-sd="eins" data-p="${base}.ton" data-v="${v}" aria-pressed="${String(f.ton === v)}">${l}</button>`).join('')}</div>`;
      if (k === 'ins' && P.length) return `<div class="pb-kurz">${P.slice(0, 2).map(q => `<button type="button" class="chip" data-sd="platz" data-k="${esc(q.k)}" data-n="${esc(q.nom)}" data-v="f" aria-pressed="${String(arr(f.ins).some(x => x && x.k === q.k && x.platz === 'f'))}">${esc(cap(q.nom))} als Fahrer</button>`).join('')}</div>`;
      return '';
    };
    const zeile = k => { const da = punktDa(f, k); return `<button type="button" class="sd-add-b pb-pkt" data-sd="pkt" data-v="${k}" aria-pressed="${String(da)}"><i aria-hidden="true">${da ? '✓' : F.indexOf(k) + 1}</i><span>${esc(punkt(k).l)}<small>${esc(punktZeile(f, k))}</small></span></button>${kurzwahl(k)}`; };
    const block = (q, titel, K) => `<div class="w-q" data-q="${q}">${titel ? `<span class="w-mk-gt">${esc(titel)}</span>` : ''}<div class="zs-list pb-pkte">${K.map(zeile).join('')}</div></div>`;
    const up = L.length > 1 ? { label: 'Fahrzeuge', attr: 'data-sd="menu"' } : { label: ctxOf(api) ? 'Vorgang' : 'Alle Vorgänge', attr: 'data-sd="raus"' };
    const next = leer ? { label: 'Der Reihe nach abfragen', attr: 'data-sd="reihe"' } : { label: 'Fertig', attr: 'data-sd="done1"', ok: true };
    return `${api.kopf({ up, sub: subOf(L, i), titel: has(f.von) ? `Was kann ${str(f.von)} zum Fahrzeug sagen?` : 'Was ist zum Fahrzeug bekannt?', lead: leer ? 'Der Reihe nach abfragen – oder nur antippen, wozu es Angaben gibt. Was offen bleibt, steht nicht im Text.' : 'Antippen öffnet den Punkt. Was offen bleibt, steht nicht im Text.' })}
      <div class="w-grid sd-grid">
        ${block('p-wer', '', ['wer'])}
        ${block('p-a', GRUPPE.A, PUNKTE.filter(p => p.gr === 'A').map(p => p.k))}
        ${block('p-b', GRUPPE.B, PUNKTE.filter(p => p.gr === 'B').map(p => p.k))}
        ${block('p-ab', '', ['ab'])}
        <div class="w-q" data-q="im"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">So steht es im Text</span>${formWahl(f)}</div><pre class="w-out-t" data-live="satz">${esc(ganzerText(f))}</pre></div></div>
      </div>
      <div class="fo-fein"><button type="button" class="link danger" data-sd="del">Beschreibung entfernen</button></div>
      ${api.fuss({ back: leer ? null : { label: 'Kopieren', attr: `data-sd="copy1" data-i="${i}"`, plain: true }, next })}`;
  }
  function bHtml(d, api) {
    const data = d.data, L = F_(data), i = V.i, f = L[i] || {}, base = `fz.${i}`;
    const F = folien(); if (!F.includes(V.f)) V.f = 'hub';
    if (V.f === 'hub') return hubHtml(d, api);
    const k = F.indexOf(V.f), last = k === F.length - 1;
    const zurHub = { label: 'Übersicht', attr: 'data-sd="hub"' };
    const fuss = api.fuss({ back: V.direkt || !k ? zurHub : { attr: 'data-sd="pf" data-v="-1"' }, next: last ? { label: 'Fertig', attr: 'data-sd="done1"', ok: true } : { attr: 'data-sd="pf" data-v="1"' } });
    const seite = (titel, lead, inhalt) => `${api.kopf({ up: zurHub, sub: subOf(L, i), subLive: 'sub', pos: [k + 1, F.length], titel, lead })}<div class="w-grid sd-grid">${inhalt}${imText(f, V.f)}</div>${fuss}`;
    if (V.f === 'art') return seite('Was für ein Fahrzeug?', '', artHtml(f, base));
    if (V.f === 'farbe') return seite('Welche Farbe?', '', farbeHtml(f, base));
    if (V.f === 'marke') return seite('Marke und Modell?', '', markeHtml(f, base));
    if (V.f === 'kz') return seite('Kennzeichen?', 'Auch Bruchstücke helfen.', kzHtml(f, base));
    if (V.f === 'bes') return seite('Was fiel am Fahrzeug auf?', 'Kann leer bleiben.', feld('fzBes', `${base}.bes`, f.bes, 'Besonderheiten', 'z. B. Delle hinten links, Dachbox, Firmenaufschrift, getönte Scheiben', { hin: 'Aufkleber, Schäden, Felgen, Dachträger, Anhängerkupplung, Aufschrift, auffälliges Geräusch.' }));
    if (V.f === 'ins') return seite('Wer saß darin?', 'Kann leer bleiben – das Fahrzeug steht dann für sich.', insHtml(f, base, api));
    if (V.f === 'richt') return seite('Wohin fuhr es?', 'Kann leer bleiben.', feld('fzRicht', `${base}.richt`, f.richt, 'Fahrtrichtung', 'z. B. Bahnhof, Innenstadt, A 2', { kurz: true, hin: 'Ein Ziel genügt – im Text wird daraus „… entfernte sich in Richtung Bahnhof“.' }));
    if (V.f === 'ab') return seite('Zum Abschluss', 'Mehr nicht bekannt?', abHtml(f));
    return seite('Wer beschreibt was?', '', werHtml(f, base, api, L));
  }

  /* ---------- Folien des Abschnitts ---------- */
  function listeHtml(d, api) {
    const data = d.data, L = F_(data);
    const items = L.map((f, i) => {
      const zu = beiWem(data, f);
      const hin = zu ? `<p class="w-hint vg-ctx">↳ steht in der Schilderung: ${esc(zu)}</p>` : data.schDa ? '<p class="w-hint vg-ctx">↳ noch bei keiner Schilderung übernommen</p>' : '';
      return `<li class="sd-item"><div class="sd-row"><button type="button" class="sd-card" data-sd="edit" data-i="${i}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(`${has(f.von) ? str(f.von) : 'Name offen'} beschreibt ${formen(f).akk}`)}</b><small>${esc(kurz(f) || 'noch keine Angaben')}</small></span><span class="pill ${f.fertig ? 'pill-lime' : 'pill-quiet'}">${f.fertig ? 'Erfasst' : 'Entwurf'}</span></button></div>${hin}</li>`;
    }).join('');
    return `${api.kopf({ titel: 'Welche Fahrzeuge wurden beschrieben?', lead: L.length ? 'Antippen, um eine Beschreibung zu ändern – oder eine weitere aufnehmen.' : 'Geführte Abfrage vom Groben zum Feinen – der Text entsteht dabei von selbst.' })}
      <div class="w-grid sd-grid">
        ${L.length ? `<div class="w-q"><ol class="sd-list es-list">${items}</ol></div>` : ''}
        <div class="w-q" data-q="add"><div class="sd-add"><span class="w-lbl">${L.length ? 'Weiteres Fahrzeug aufnehmen' : 'Fahrzeug aufnehmen'}</span><div class="sd-add-row"><button type="button" class="sd-add-b" data-sd="add"><i aria-hidden="true">+</i>Fahrzeugbeschreibung</button></div></div></div>
      </div>
      ${api.fuss({ next: L.length ? { label: 'Fertig', attr: 'data-sd="alle"', ok: true } : null })}`;
  }
  /** Abschluss: der fertige Text, groß „Kopieren“ – auf Wunsch zusammen mit der Personenbeschreibung –, unten der Weg zum nächsten Abschnitt. */
  function doneHtml(d, api) {
    const data = d.data, L = F_(data), miss = luecken(data), frei2 = unverteilt(data), n = miss.length + frei2.length;
    const zu = L.filter(f => beiWem(data, f)), pb = arr((ctxOf(api) || {}).beschreibungen);
    const blocks = L.map((f, i) => `<div class="w-q"><div class="w-out"><div class="w-out-h vg-oh"><span class="w-lbl">${esc(has(f.von) ? `Von ${str(f.von)}` : `Fahrzeug ${i + 1}`)}${beiWem(data, f) ? ` <i class="w-hint-i">steht in der Schilderung: ${esc(beiWem(data, f))}</i>` : ''}</span>${L.length > 1 ? `<span class="vg-tools"><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></span>` : ''}</div><pre class="w-out-t">${esc(text(f) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `${api.kopf({ fertig: n ? `Fertig · ${n} offen` : 'Fertig', offen: n > 0, titel: 'So steht es im Text' })}
      <div class="w-grid sd-grid">
        ${miss.length ? `<div class="w-q"><div class="w-warn fo-warn"><span>Noch offen: ${esc(miss.join(' · '))}</span><button type="button" class="btn btn-ghost btn-sm" data-sd="go" data-v="liste">Nachtragen</button></div></div>` : ''}
        <div class="w-q" data-q="form"><div class="pb-form"><span class="w-lbl">Darstellung</span>${formWahl(L[0])}</div></div>
        ${blocks}
      </div>
      <button type="button" class="btn btn-light fo-wide" data-sd="copy">Text kopieren</button>
      ${pb.length ? '<button type="button" class="btn btn-ghost fo-wide pb-beides" data-sd="copy2">Mit Personenbeschreibung kopieren</button>' : ''}
      ${frei2.length ? `<div class="w-info pb-nach">${frei2.length === 1 ? 'Diese Beschreibung steht' : `${frei2.length} Beschreibungen stehen`} noch bei keiner Schilderung. In den Schilderungen bei der Person antippen (Folie „Hat … beschrieben?“) – dann steht sie dort mit Rolle und Namen.</div>` : zu.length ? '<p class="w-hint pb-nach">Im Gesamtsachverhalt steht die Beschreibung bei der Schilderung, nicht noch einmal vorn. Hier bleibt sie zum Kopieren.</p>' : ''}
      ${api.fein({ mehr: '<button type="button" class="link" data-sd="add">+ Weiteres Fahrzeug</button>' })}
      ${api.fuss({ back: { label: 'Bearbeiten', attr: 'data-sd="go" data-v="liste"' }, next: api.danach() })}`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    const data = d.data;
    if (ordnen(data)) api.persist(false);
    if (nimmt(data, ctxOf(api))) api.persist(false);
    if (V.neu) { V.neu = false; if (!F_(data).length) { data.fz = [{ id: neuId([]) }]; V.s = 'b'; V.i = 0; V.f = 'hub'; api.persist(false); } }
    if (V.s === 'b' && !F_(data)[V.i]) V.s = 'liste';
    if (V.s === 'done' && !F_(data).length) V.s = 'liste';
    return V.s === 'b' ? bHtml(d, api) : V.s === 'done' ? doneHtml(d, api) : listeHtml(d, api);
  }
  const grow = ta => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  function mounted(host) {
    const h = host || $('#wMain'); if (!h) return;
    h.querySelectorAll('textarea.es-ta').forEach(grow);
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus({ preventScroll: true }); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
    // Zurück in der Übersicht: der Punkt, von dem man kommt, steht wieder im Blick
    if (V.zurueck) {
      const k = V.zurueck; V.zurueck = '';
      if (V.s === 'b' && V.f === 'hub') setTimeout(() => { const el = h.querySelector(`[data-sd="pkt"][data-v="${k}"]`); if (el && el.isConnected && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 0);
    }
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (Fokus bleibt, wo er ist). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    const L = F_(data), f = L[V.i];
    if (V.s === 'b' && f) { put('satz', V.f === 'hub' ? ganzerText(f) : folieText(f, V.f)); put('sub', subOf(L, V.i)); }
  }

  /* ======================= Ereignisse ======================= */
  function leave(data) {
    const L = F_(data);
    if (V.s === 'b' && istLeer(L[V.i])) { L.splice(V.i, 1); if (L.length) data.fz = L; else delete data.fz; }
    V.s = 'liste'; V.i = -1; V.f = 'hub'; V.direkt = false;
  }
  async function del(api) {
    const data = api.d.data, L = F_(data), f = L[V.i]; if (!f) return;
    if (!istLeer(f)) {
      const zu = beiWem(data, f);
      const ok = await api.ask({ title: 'Beschreibung entfernen?', text: `Die Fahrzeugbeschreibung${has(f.von) ? ` von ${str(f.von)}` : ''} wird gelöscht${zu ? ` – auch in der Schilderung (${zu})` : ''}.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
      if (!ok) return;
    }
    L.splice(V.i, 1); if (L.length) data.fz = L; else delete data.fz;
    V.s = 'liste'; V.i = -1; V.f = 'hub'; V.direkt = false;
    if (!L.length && api.d.status === 'fertig') api.d.status = 'entwurf';
    api.persist(true); api.render();
  }
  function fertig(api) {
    const d = api.d, data = d.data;
    if (V.s === 'b') { const f = F_(data)[V.i]; if (f && !istLeer(f)) { sonstVorwahl(f); f.fertig = true; } leave(data); }
    if (!F_(data).length) { api.toast('Noch nichts eingetragen – erst ein Fahrzeug aufnehmen.'); api.persist(false); api.render(); return; }
    d.status = 'fertig'; V.s = 'done';
    api.persist(true); api.render();
    const miss = luecken(data);
    if (miss.length) api.toast(`Fertig – noch offen: ${miss.length} ${miss.length === 1 ? 'Punkt' : 'Punkte'}.`);
  }
  function click(e, api) {
    const b0 = e.target.closest && e.target.closest('[data-sd]'); if (!b0 || !b0.closest('#wMain')) return false;
    if (b0.disabled) return true;
    const d = api.d, data = d.data, a = b0.dataset.sd, v = b0.dataset.v, pfad = b0.dataset.p;
    const L = () => { if (!Array.isArray(data.fz)) data.fz = []; return data.fz; };
    const cur = () => L()[V.i];
    const save = () => { api.persist(false); api.render(); };
    const zeige = (f, k) => { V.f = folien().includes(k) ? k : 'hub'; if (V.f === 'wer' && !api.mobile()) V.focus = 'fzVon'; if (V.f === 'ab' && sonstVorwahl(f)) api.persist(false); api.render(); };
    switch (a) {
      case 'add': {
        if (d.status === 'fertig') d.status = 'entwurf';
        const neu = { id: neuId(L()) }; if (formOf(L()[0]) === 'text') neu.form = 'text';
        L().push(neu);
        V.i = L().length - 1; V.s = 'b'; V.f = 'hub'; V.direkt = false;
        save(); return true;
      }
      case 'edit': V.i = Number(b0.dataset.i); V.s = 'b'; V.f = 'hub'; V.direkt = false; api.render(); return true;
      case 'menu': leave(data); save(); return true;
      case 'raus': leave(data); api.persist(false); if (typeof api.list === 'function') api.list(); else api.render(); return true;
      case 'go': { if (V.s === 'b') leave(data); if (F_(data).length === 1) { V.s = 'b'; V.i = 0; V.f = 'hub'; } else { V.s = 'liste'; V.i = -1; } save(); return true; }
      case 'hub': V.zurueck = V.f; V.f = 'hub'; V.direkt = false; api.render(); return true;
      case 'pkt': { const f = cur(); if (!f) return true; V.direkt = true; zeige(f, v); return true; }
      case 'reihe': { const f = cur(); if (!f) return true; V.direkt = false; zeige(f, erstesOffene(f)); return true; }
      case 'pf': { const f = cur(); if (!f) return true; const F = folien(), k = Math.max(0, Math.min(F.length - 1, F.indexOf(V.f) + Number(v))); V.direkt = false; zeige(f, F[k]); return true; }
      case 'done1': case 'alle': fertig(api); return true;
      case 'del': del(api); return true;
      /* eine Auswahl – ein zweiter Tipp nimmt sie zurück. Mit der Art wechselt, welche Formen es gibt. */
      case 'eins': {
        const c = getPath(data, pfad); setPath(data, pfad, String(c ?? '') === v ? undefined : (/\.nr$/.test(pfad) ? Number(v) : v));
        if (/\.art$/.test(pfad)) { const f = cur(); if (f && !arr(AUFBAU[f.art]).includes(f.aufbau)) delete f.aufbau; }
        save(); return true;
      }
      case 'setze': setPath(data, pfad, v); save(); return true;
      case 'tog': setPath(data, pfad, getPath(data, pfad) ? undefined : true); save(); return true;
      case 'marke': { const f = cur(); if (!f) return true; if (str(f.marke) === v) delete f.marke; else f.marke = v; save(); return true; }
      /* Wer wo einstieg (data-k = Person, data-n = wie sie im Text heißt, data-v = Platz) – ein zweiter Tipp nimmt es zurück */
      case 'platz': {
        const f = cur(); if (!f) return true;
        const I = arr(f.ins).filter(x => x && x.k !== b0.dataset.k), alt = arr(f.ins).find(x => x && x.k === b0.dataset.k);
        if (!(alt && alt.platz === v)) I.push({ k: b0.dataset.k, nom: b0.dataset.n, platz: v });
        if (I.length) f.ins = I; else delete f.ins;
        save(); return true;
      }
      case 'sonst': { const f = cur(); if (!f) return true; f.sonst = f.sonst !== true; save(); return true; }
      case 'form': { for (const f of F_(data)) { if (v === 'text') f.form = 'text'; else delete f.form; } save(); return true; }
      case 'von': { const f = cur(); if (!f) return true; if (str(f.von) === v) delete f.von; else f.von = v; save(); return true; }
      case 'copy': api.copy(abschnitt(data), b0); return true;
      case 'copy1': { const f = F_(data)[Number(b0.dataset.i)]; if (f) api.copy(text(f), b0); return true; }
      case 'copy2': { const c = ctxOf(api) || {}; api.copy(zusammen(data, c.beschreibungen, c.art), b0); return true; }
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.dataset.single && /\n/.test(el.value)) { const at = el.selectionStart; el.value = el.value.replace(/\s*\n\s*/g, ' '); try { el.setSelectionRange(at, at); } catch (er) { /* egal */ } }
    if (el.classList.contains('es-ta')) grow(el);
    setPath(api.d.data, el.dataset.sk, el.value);
    // Marke von Hand geändert: die Chips zeigen, ob sie noch passt
    if (/\.marke$/.test(el.dataset.sk)) document.querySelectorAll('#wMain [data-sd="marke"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === el.value.trim())));
    api.persist(false); live(api);
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    e.preventDefault(); el.blur();
    return true;
  }
  function submit() { const b = $('#wMain .fo-nav .fo-next'); if (b) b.click(); }

  root.WFZ = Object.freeze({
    id: 'fz', name: 'Fahrzeugbeschreibung', short: 'Fahrzeugbeschreibung', kurz: 'FZ', noNew: true,
    desc: 'Geführte Abfrage vom Groben zum Feinen – Art und Form, Farbe, Marke, Kennzeichen, Besonderheiten, Insassen, Fahrtrichtung',
    intro: 'Übersicht der Überpunkte: der Reihe nach abfragen oder nur antippen · beschriebene Personen als Insassen wählbar · Text als Liste oder Fließtext, sofort kopierbar',
    labels: { newBtn: 'Fahrzeugbeschreibung', bericht: 'Fahrzeugbeschreibung' },
    steps: [],
    title, subtitle, pill,
    plain, still,
    text: data => [['', 'Fahrzeugbeschreibung', rumpf(data, F_(data)), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, keydown, submit, key },
    kontext: { nimmt },
    /* Zusatzbaustein (Untermenü im Vorgang): wird gleich aufgenommen und steht vorn, nach der Personenbeschreibung */
    zusatz: {
      wann: 'zuerst',
      punkte: [{ k: 'fz', l: 'Fahrzeugbeschreibung', h: 'Geführte Abfrage, sofort kopierbar' }],
      hat: () => true, setzen: () => true, leer: data => !F_(data).length,
      info: data => { const n = F_(data).length; return n ? `${n} erfasst${title(data).includes('–') ? ' · ' + title(data).split('– ')[1] : ''}` : ''; }
    },
    core: { PUNKTE, GRUPPE, ART, AUFBAU, FARBE, TON, MARKEN, PLATZ, ZAHL, BEZ, FORMEN, JEMAND, artOf, plaetze, aufsteigen, formen, farbeText, richtText, einstiege, werte, liste, punktWert, punktDa, offene, formOf, teile, text, kurz, istLeer, sonstVorwahl, folien, erstesOffene, luecken, offen, abschnitt, plain, still, zusammen, personen, nimmt, ordnen }
  });
})(typeof window !== 'undefined' ? window : globalThis);
