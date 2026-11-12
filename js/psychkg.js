/*
 * Workoholic · Schriftliche Arbeiten · Abschnitt „Maßnahmen nach dem PsychKG“
 * ---------------------------------------------------------------
 * Eigener Abschnitt für Einsätze mit psychisch erkrankten Personen (NRW). Kein Lückentext: Gefahr, Ordnungsbehörde,
 * Ärztin oder Arzt, Entscheidung und Transport werden angetippt; daraus entsteht der fertige Abschnitt in der
 * Satzführung des Musters („Aufgrund der beschriebenen Verhaltensweise …“, „Aus diesem Grund wurde … hinzugezogen.“,
 * „Eine Begleitung durch die eingesetzten Beamten wurde … nicht als erforderlich angesehen.“).
 * Rechtlicher Rahmen (PsychKG NRW, Fassung ab 01.07.2025):
 *   § 11 Abs. 1  gegenwärtige erhebliche Selbstgefährdung oder erhebliche Gefährdung bedeutender Rechtsgüter anderer,
 *                die nicht anders abgewendet werden kann; fehlende Behandlungsbereitschaft allein genügt nicht,
 *   § 11 Abs. 2  gegenwärtig = unmittelbar bevorstehend oder wegen besonderer Umstände jederzeit zu erwarten,
 *   § 14         sofortige Unterbringung durch die örtliche Ordnungsbehörde mit aktuellem ärztlichen Zeugnis.
 * Polizei: Gewahrsam bis zur Entscheidung (§ 35 PolG NRW), Vollzugshilfe (§ 47 PolG NRW), Fesselung (§ 62 PolG NRW).
 * Fehlendes steht als [Platzhalter] im Text. Reine Daten + Textlogik; writer.js zeichnet die Felder.
 * Orientierungshilfe, keine Rechtsberatung – Normen vor Verwendung am amtlichen Wortlaut prüfen.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const str = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  const has = v => str(v) !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const get = (o, p) => p.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const fmtD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(s); };
  const joinList = (a, j = 'und') => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ` ${j} ` + a[a.length - 1]);
  /** Eingetippten Satzteil einsetzen: Punkt am Ende weg (der Satz setzt ihn selbst), Abkürzungen bleiben. */
  const clause = v => str(v).replace(/[,;:]+$/, '').replace(/([^.])\.+$/, (m, a, i, s) => (/(\b[A-ZÄÖÜ]|Dr|Nr|ca|bzw|usw|Str)$/.test(s.slice(0, i + 1)) ? m : a));
  const quoteless = v => str(v).replace(/^[„"“»«']+|[“"”«»']+$/g, '');
  /** Apposition mit Komma schließen, wenn der Satz danach weitergeht: „an die Nachbarin, Frau L., übergeben“. */
  const appos = v => { const x = clause(v); return /,\s*(Herr|Herrn|Frau|Dr\.?)\s[^,]*$/.test(x) ? x + ',' : x; };
  const tidy = s => s.replace(/([.!?])([“"«»])\./g, '$1$2').replace(/\s+([.,:;)])/g, '$1').replace(/\(\s+/g, '(').replace(/([.!?])\.(?=\s|$)/g, '$1').replace(/\s{2,}/g, ' ').trim();
  const um = t => (has(t) ? ` um ${str(t)} Uhr` : '');
  const plural = s => /\s(und|sowie)\s|,/.test(str(s));

  const P = d => (d && d.pk && typeof d.pk === 'object' ? d.pk : {});
  const S = d => (d && d.pkStd && typeof d.pkStd === 'object' ? d.pkStd : {});
  const K = id => 'pk.' + id;
  const inF = (k, v) => d => arr(P(d)[k]).includes(v);
  const isF = (k, v) => d => (Array.isArray(v) ? v.includes(P(d)[k]) : P(d)[k] === v);

  /* Amtsbezeichnung und Name aus der Besatzung („POK Müller“) oder getippt („pok müller“) */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  function kraft(v) {
    const t = str(v).split(' '); if (!t[0]) return '';
    let rank = '';
    if (RANK_RE.test(t[0].toUpperCase())) rank = t[0].toUpperCase();
    else if (/in$/i.test(t[0]) && RANK_RE.test(t[0].slice(0, -2).toUpperCase() + 'in')) rank = t[0].slice(0, -2).toUpperCase() + 'in';
    const rest = (rank ? t.slice(1) : t).join(' ');
    const name = rest === rest.toLowerCase() ? rest.replace(/(^|[\s-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) : rest;
    return [rank, name].filter(Boolean).join(' ');
  }

  /* ======================= Kreis Gütersloh: Städte und Gemeinden ======================= */
  const KOMMUNEN = ['Borgholzhausen', 'Gütersloh', 'Halle (Westf.)', 'Harsewinkel', 'Herzebrock-Clarholz', 'Langenberg', 'Rheda-Wiedenbrück', 'Rietberg', 'Schloß Holte-Stukenbrock', 'Steinhagen', 'Verl', 'Versmold', 'Werther (Westf.)'];
  const GEMEINDEN = ['Herzebrock-Clarholz', 'Langenberg', 'Steinhagen'];
  const kommunen = () => { try { const o = root.WGT && root.WGT.orte && root.WGT.orte(); if (Array.isArray(o) && o.length) return o; } catch (e) { /* Liste unten */ } return KOMMUNEN; };
  const kommuneGen = k => { k = str(k); if (!k) return ''; if (/^(der |die )?(Stadt|Gemeinde|Kreis)\b/i.test(k)) return k.replace(/^(der |die )?/i, 'der '); return (GEMEINDEN.includes(k) ? 'der Gemeinde ' : 'der Stadt ') + k; };

  /* ======================= Satzführung: betroffene Person ======================= */
  const NOUN = {
    betr: { m: ['der Betroffene', 'den Betroffenen', 'dem Betroffenen', 'des Betroffenen'], w: ['die Betroffene', 'die Betroffene', 'der Betroffenen', 'der Betroffenen'], n: ['die betroffene Person', 'die betroffene Person', 'der betroffenen Person', 'der betroffenen Person'] },
    besch: { m: ['der Beschuldigte', 'den Beschuldigten', 'dem Beschuldigten', 'des Beschuldigten'], w: ['die Beschuldigte', 'die Beschuldigte', 'der Beschuldigten', 'der Beschuldigten'], n: ['die beschuldigte Person', 'die beschuldigte Person', 'der beschuldigten Person', 'der beschuldigten Person'] }
  };
  const PRON = { m: { er: 'er', ihn: 'ihn', ihm: 'ihm', poss: 'sein' }, w: { er: 'sie', ihn: 'sie', ihm: 'ihr', poss: 'ihr' }, n: { er: 'sie', ihn: 'sie', ihm: 'ihr', poss: 'ihr' } };
  const gOf = d => { const x = get(d, 'pk.p.geschlecht'); return x === 'm' || x === 'w' ? x : 'n'; };
  /** der/den/dem, des (nachgestellt: „des Betroffenen“ bzw. „von Herrn Muster“), Pronomen. */
  function G(d) {
    const p = get(d, 'pk.p') || {}, g = gOf(d), bez = P(d).bez || 'betr';
    const nn = str(p.nachname), full = [str(p.vorname), nn].filter(Boolean).join(' ');
    let n;
    if (bez === 'name' && nn) n = g === 'm' ? [`Herr ${nn}`, `Herrn ${nn}`, `Herrn ${nn}`, `von Herrn ${nn}`] : g === 'w' ? [`Frau ${nn}`, `Frau ${nn}`, `Frau ${nn}`, `von Frau ${nn}`] : [full, full, full, `von ${full}`];
    else n = NOUN[bez === 'besch' ? 'besch' : 'betr'][g];
    return { g, der: n[0], den: n[1], dem: n[2], des: n[3], ...PRON[g] };
  }
  const bezOpts = d => {
    const g = gOf(d), nn = str(get(d, 'pk.p.nachname'));
    return [['betr', NOUN.betr[g][0]], ['besch', NOUN.besch[g][0]], ['name', nn ? (g === 'm' ? `Herr ${nn}` : g === 'w' ? `Frau ${nn}` : nn) : 'mit Namen']];
  };

  /* ======================= Auswahllisten und Textbausteine ======================= */
  const KRANK = [
    ['bekannt', 'Erkrankung bekannt'], ['medi', 'Medikamente abgesetzt'], ['frueher', 'Früher in Behandlung'],
    ['wahn', 'Wahnhafte Äußerungen'], ['stimmen', 'Hört Stimmen'], ['desor', 'Nicht orientiert'],
    ['denk', 'Sprunghaft, zusammenhanglos'], ['unruhe', 'Getrieben, nicht zu beruhigen'], ['sucht', 'Abhängigkeitserkrankung'], ['eigen', 'Eigene Beobachtung']
  ];
  const QUELLE = { selbst: ['eigene Angaben', 'nach eigenen Angaben'], angeh: ['Angehörige', 'nach Angaben von Angehörigen'], betreu: ['Betreuung', 'nach Angaben der rechtlichen Betreuung'], arzt: ['Ärzte', 'nach Angaben der behandelnden Ärzte'], pol: ['Polizeiliche Erkenntnisse', 'nach polizeilichen Erkenntnissen'] };
  const DROH_S = [['suizid', 'Selbsttötung', 'die Selbsttötung'], ['verl', 'Selbstverletzung', 'eine erhebliche Selbstverletzung'], ['unterk', 'Unterkühlung', 'eine lebensgefährliche Unterkühlung'], ['versorg', 'Unterversorgung (Essen, Trinken, Medikamente)', 'eine lebensbedrohliche Unterversorgung mit Nahrung, Flüssigkeit oder Medikamenten'], ['verkehr', 'Unfall im Straßenverkehr', 'ein lebensgefährlicher Unfall im Straßenverkehr']];
  const DROH_F = [['angriff', 'Angriff auf andere', 'ein Angriff auf Leib oder Leben anderer Personen', ['Leib', 'Leben']], ['brand', 'Brand', 'ein Brand mit Gefahr für Leib und Leben anderer', ['Leib', 'Leben', 'Eigentum']], ['sach', 'Zerstörung bedeutender Sachwerte', 'die Beschädigung oder Zerstörung bedeutender fremder Sachwerte', ['Eigentum']]];
  const drohOpts = d => { const g = P(d).gef; return [...(g === 'fremd' ? [] : DROH_S), ...(g === 'selbst' ? [] : DROH_F), ['eigen', 'Eigene Formulierung']].map(x => [x[0], x[1]]); };
  const MILD = [['freiw', 'Behandlung abgelehnt'], ['angeh', 'Angehörige können nicht betreuen'], ['ambul', 'Ambulante Hilfe reicht nicht'], ['betreu', 'Keine Betreuung mit Aufenthaltsbestimmung'], ['eigen', 'Eigener Grund']];
  const OB = {
    oa: { l: 'Ordnungsamt', nom: k => `das Ordnungsamt ${k}`, acc: k => `das Ordnungsamt ${k}`, von: k => `vom Ordnungsamt ${k}`, kurz: 'das Ordnungsamt', des: 'des Ordnungsamtes' },
    bd: { l: 'Bereitschaftsdienst des Ordnungsamtes', nom: k => `der Bereitschaftsdienst des Ordnungsamtes ${k}`, acc: k => `den Bereitschaftsdienst des Ordnungsamtes ${k}`, von: k => `vom Bereitschaftsdienst des Ordnungsamtes ${k}`, kurz: 'der Bereitschaftsdienst des Ordnungsamtes', des: 'des Ordnungsamtes' },
    fw: { l: 'Feuerwehr für die Ordnungsbehörde', nom: k => `die Feuerwehr ${k} als örtliche Ordnungsbehörde`, acc: k => `die Feuerwehr ${k} als örtliche Ordnungsbehörde`, von: k => `von der Feuerwehr ${k}`, kurz: 'die Feuerwehr', des: 'der Feuerwehr' }
  };
  const ARZT = {
    spdi: { l: 'Sozialpsychiatrischer Dienst', m: 'Arzt', w: 'Ärztin', von: 'vom Sozialpsychiatrischen Dienst', des: 'des Sozialpsychiatrischen Dienstes' },
    kd: { l: 'Krisendienst', m: 'Arzt', w: 'Ärztin', von: 'vom Krisendienst', des: 'des Krisendienstes' },
    klinik: { l: 'Psychiatrische Klinik', m: 'Arzt', w: 'Ärztin', von: 'aus der psychiatrischen Klinik', des: 'der psychiatrischen Klinik' },
    psych: { l: 'Psychiater (Praxis)', m: 'Facharzt für Psychiatrie', w: 'Fachärztin für Psychiatrie', von: '', des: '' },
    na: { l: 'Notarzt', m: 'Notarzt', w: 'Notärztin', von: '', des: '' },
    bd: { l: 'Ärztlicher Bereitschaftsdienst', m: 'Arzt', w: 'Ärztin', von: 'vom ärztlichen Bereitschaftsdienst', des: 'des ärztlichen Bereitschaftsdienstes' },
    haus: { l: 'Hausarzt', m: 'Hausarzt', w: 'Hausärztin', von: '', des: '' }
  };
  const ERG = { sofort: 'Sofortige Unterbringung', freiw: 'Freiwillige Aufnahme', keine: 'Keine Unterbringung' };
  const TRANS = {
    ktw: ['KTW', 'einem Krankentransportwagen (KTW)', 'KTW'], rtw: ['RTW', 'einem Rettungswagen (RTW)', 'RTW'], rtwna: ['RTW mit Notarzt', 'einem Rettungswagen (RTW) mit notärztlicher Begleitung', 'RTW'],
    stw: ['Streifenwagen', 'dem Streifenwagen', 'Streifenwagen'], ob: ['Fahrzeug Ordnungsamt', 'einem Fahrzeug des Ordnungsamtes', 'Fahrzeug des Ordnungsamtes'], priv: ['Angehörige, privat', 'einem Privatfahrzeug von Angehörigen', 'Privatfahrzeug']
  };
  const ZWANG = [['halten', 'Festhalten, Führen', 'Festhalten und Führen'], ['tragen', 'Tragen', 'Tragen zum Fahrzeug'], ['boden', 'Fixieren am Boden', 'Fixieren am Boden'], ['fessel', 'Handfesseln', 'Anlegen von Handfesseln']];
  const FESSEL = [['ang', 'angreifen oder Widerstand leisten', 'Polizeivollzugsbeamte oder Dritte angreifen oder Widerstand leisten'], ['flucht', 'fliehen', 'fliehen'], ['selbst', 'sich töten oder verletzen', 'sich töten oder verletzen']];
  const NACH = [['wohn', 'Wohnung verschlossen'], ['schl', 'Schlüssel übergeben'], ['geraete', 'Herd, Geräte aus'], ['tiere', 'Haustiere versorgt'], ['info', 'Angehörige, Betreuer informiert'], ['ggst', 'Gegenstände sichergestellt']];
  const VERBLEIB = [['wohn', 'Blieb in der Wohnung'], ['ueb', 'Übergabe an Angehörige'], ['hilfe', 'Hilfsangebote aufgezeigt'], ['arzt', 'Arzttermin vereinbart'], ['kh', 'Krankenhaus (körperlich)']];
  const UEB = { pk: 'Maßnahmen nach dem PsychKG', pknrw: 'Maßnahmen nach dem PsychKG NRW', m: 'Maßnahmen' };
  const transportNoetig = d => ['sofort', 'freiw'].includes(P(d).erg);

  /* ======================= Bausteine ======================= */
  const miss = (ctx, l) => { ctx.miss.push(l); return `[${l}]`; };
  /** Ärztin oder Arzt: erste Nennung (nom/acc) und kurze Rückverweise. */
  function arztOf(d, ctx) {
    const f = P(d), A = ARZT[f.arztDienst], g = f.arztG === 'm' || f.arztG === 'w' ? f.arztG : '', name = str(f.arztName), Gd = G(d);
    if (!A) {
      const x = name || miss(ctx, 'Ärztin oder Arzt');
      return { nom: x, acc: x, kurz: name || (g === 'm' ? 'der Arzt' : g === 'w' ? 'die Ärztin' : 'die Ärztin bzw. der Arzt'), g };
    }
    const von = A.von ? ' ' + A.von : '';
    if (g && name) return { nom: `${g === 'm' ? 'der' : 'die'} ${A[g]} ${name}${von}`, acc: `${g === 'm' ? 'den' : 'die'} ${A[g]} ${name}${von}`, kurz: name, g };
    if (g) {
      const des = f.arztDienst === 'haus' ? ' ' + Gd.des : A.des ? ' ' + A.des : '';
      const def = f.arztDienst === 'haus';
      return { nom: `${def ? (g === 'm' ? 'der' : 'die') : (g === 'm' ? 'ein' : 'eine')} ${A[g]}${des}`, acc: `${def ? (g === 'm' ? 'den' : 'die') : (g === 'm' ? 'einen' : 'eine')} ${A[g]}${des}`, kurz: `${g === 'm' ? 'der' : 'die'} ${A[g]}`, g };
    }
    if (name) return { nom: `${name}${von}`, acc: `${name}${von}`, kurz: name, g };
    const x = `${miss(ctx, 'Ärztin oder Arzt')}${von}`;
    return { nom: x, acc: x, kurz: 'die Ärztin bzw. der Arzt', g };
  }
  /** Ordnungsbehörde: Einrichtung, Person vor Ort, kurze Rückverweise. */
  function obOf(d, ctx) {
    const f = P(d), O = OB[f.ob], ort = kommuneGen(S(d).obOrt), g = f.obG === 'm' || f.obG === 'w' ? f.obG : '', name = str(f.obName);
    const k = ort || miss(ctx, 'Stadt oder Gemeinde');
    if (!O) { const x = miss(ctx, 'Ordnungsbehörde'); return { first: { nom: x, acc: x }, ref: 'die Ordnungsbehörde', person: false, pron: '' }; }
    let person = null;
    if (g && name) person = g === 'm' ? { nom: `Herr ${name}`, acc: `Herrn ${name}` } : { nom: `Frau ${name}`, acc: `Frau ${name}` };
    else if (g) person = g === 'm' ? { nom: 'ein Mitarbeiter', acc: 'einen Mitarbeiter', ref: `der Mitarbeiter ${O.des}` } : { nom: 'eine Mitarbeiterin', acc: 'eine Mitarbeiterin', ref: `die Mitarbeiterin ${O.des}` };
    const first = person ? { nom: `${person.nom} ${O.von(k)}`, acc: `${person.acc} ${O.von(k)}` } : { nom: O.nom(k), acc: O.acc(k) };
    return { first, ref: person ? (person.ref || person.nom) : O.kurz, person: !!person, pron: g === 'm' ? 'dieser' : g === 'w' ? 'diese' : '' };
  }

  /* ----- Teil 1: Verhalten und Gefahr (§ 11 PsychKG NRW) ----- */
  function teilGefahr(d, ctx) {
    const f = P(d), g = G(d), s = [];
    const verh = clause(f.verh);
    if (verh) s.push(`${cap(g.der)} ${verh}.`);
    const sel = arr(f.droh);
    const sItems = f.gef === 'fremd' ? [] : DROH_S.filter(x => sel.includes(x[0]));
    const fItems = f.gef === 'selbst' ? [] : DROH_F.filter(x => sel.includes(x[0]));
    const teile = [];
    if (sItems.length) { const t = sItems.map(x => x[2]); if (['suizid', 'verl', 'unterk'].includes(sItems[0][0])) t[0] += ' ' + g.des; teile.push(joinList(t, 'oder')); }
    if (fItems.length) teile.push(joinList(fItems.map(x => x[2]), 'oder'));
    if (sel.includes('eigen')) teile.push(clause(f.drohX) || miss(ctx, 'drohendes Ereignis'));
    const X = teile.length ? joinList(teile, 'oder') : miss(ctx, 'drohendes Ereignis');
    const gw = { unm: 'ein schadenstiftendes Ereignis unmittelbar bevorstand', jzt: 'der Eintritt eines schadenstiftenden Ereignisses zwar nicht vorhersehbar, wegen besonderer Umstände jedoch jederzeit zu erwarten war' }[f.gegenw] || 'ein schadenstiftendes Ereignis unmittelbar bevorstand bzw. sein Eintritt jederzeit zu erwarten war';
    s.push(`Aufgrund ${verh ? 'dieser Verhaltensweise' : `der beschriebenen Verhaltensweise ${g.des}`}, die augenscheinlich krankheitsbedingt war, war davon auszugehen, dass ${gw} (hier: ${X}).`);
    // Anhaltspunkte für eine psychische Erkrankung
    const k = arr(f.krank), items = [];
    if (k.includes('bekannt')) items.push(`${(QUELLE[f.quelle] || [, 'bekanntermaßen'])[1]} an ${clause(f.diag) || 'einer psychischen Erkrankung'} leidet`);
    if (k.includes('sucht')) items.push('an einer Abhängigkeitserkrankung leidet');
    if (k.includes('frueher')) items.push('bereits früher in psychiatrischer Behandlung war');
    if (k.includes('medi')) items.push(`${g.poss}e verordneten Medikamente abgesetzt hatte`);
    if (k.includes('wahn')) items.push('wahnhafte Vorstellungen äußerte');
    if (k.includes('stimmen')) items.push('nach eigenen Angaben Stimmen hörte');
    if (k.includes('desor')) items.push('zeitlich, örtlich oder zur eigenen Person nicht orientiert war');
    if (k.includes('denk')) items.push('sprunghaft und ohne erkennbaren Zusammenhang sprach');
    if (k.includes('unruhe')) items.push('erheblich unruhig und getrieben war und sich nicht beruhigen ließ');
    if (k.includes('eigen')) items.push(clause(f.krankX) || miss(ctx, 'eigene Beobachtung'));
    if (items.length) s.push(`Für eine krankheitsbedingte Ursache sprach, dass ${g.er} ${joinList(items)}.`);
    if ((k.includes('wahn') || k.includes('stimmen')) && has(f.wahnX)) { const q = quoteless(f.wahnX); s.push(`${cap(g.er)} äußerte wörtlich: „${q}“${/[.!?…]$/.test(q) ? '' : '.'}`); }
    // Rechtsgüter
    if (!f.gef) s.push(`Damit bestand ${miss(ctx, 'Selbst- oder Fremdgefährdung')}.`);
    else {
      const rg = [...new Set(fItems.flatMap(x => x[3]))];
      const rgT = rg.length ? ` (${joinList(rg)})` : '';
      if (f.gef === 'selbst') s.push(`Damit bestand eine gegenwärtige erhebliche Selbstgefährdung; bedroht waren mit Leben und Gesundheit ${g.des} bedeutende Rechtsgüter.`);
      else if (f.gef === 'fremd') s.push(`Damit bestand eine gegenwärtige erhebliche Gefährdung bedeutender Rechtsgüter anderer${rgT}.`);
      else s.push(`Damit bestand eine gegenwärtige erhebliche Selbstgefährdung sowie eine erhebliche Gefährdung bedeutender Rechtsgüter anderer${rgT}.`);
      if (f.gef !== 'selbst' && has(f.wen)) s.push(`Gefährdet ${plural(f.wen) ? 'waren' : 'war'} insbesondere ${clause(f.wen)}.`);
    }
    // nicht anders abwendbar
    const m = arr(f.mild), ms = [];
    if (m.includes('freiw')) ms.push(`Eine freiwillige Behandlung lehnte ${g.der} ab.`);
    if (m.includes('angeh')) ms.push('Angehörige oder andere Bezugspersonen konnten eine ausreichende Betreuung und Beaufsichtigung nicht sicherstellen.');
    if (m.includes('ambul')) ms.push('Ambulante Hilfen (behandelnde Ärzte, Sozialpsychiatrischer Dienst, Krisendienst) reichten nicht aus.');
    if (m.includes('betreu')) ms.push('Eine rechtliche Betreuung mit dem Aufgabenkreis Aufenthaltsbestimmung bestand nicht.');
    if (m.includes('eigen')) s.push(`Die Gefahr ließ sich nicht anders abwenden, weil ${clause(f.mildX) || miss(ctx, 'Grund')}.`, ...ms);
    else if (ms.length) s.push('Die Gefahr ließ sich nicht anders abwenden:', ...ms);
    return tidy(s.join(' '));
  }

  /* ----- Teil 2: Ordnungsbehörde, Sicherung, Ärztin oder Arzt, Begutachtung ----- */
  function teilBehoerde(d, ctx) {
    const f = P(d), g = G(d), s = [], O = obOf(d, ctx), A = arztOf(d, ctx);
    let obSubj = false; // war die Person der Ordnungsbehörde Subjekt des letzten Satzes? Dann „Dieser/Diese“
    if (has(f.obWer)) s.push(`Aus diesem Grund zog ${kraft(f.obWer)}${um(f.obT)} ${O.first.acc} hinzu.`);
    else { s.push(`Aus diesem Grund wurde${um(f.obT)} ${O.first.nom} hinzugezogen.`); obSubj = O.person; }
    const refStart = () => cap(obSubj && O.pron ? O.pron : O.ref);
    // bis zur Entscheidung
    const norm = { selbst: '§ 35 Abs. 1 Nr. 1 PolG NRW', fremd: '§ 35 Abs. 1 Nr. 2 PolG NRW', beide: '§ 35 Abs. 1 Nr. 1 und 2 PolG NRW' }[f.gef] || '§ 35 Abs. 1 PolG NRW';
    if (f.sicher === 'frei') { s.push(`Bis zum Eintreffen der Ordnungsbehörde blieb ${g.der} freiwillig in Begleitung der Einsatzkräfte.`); obSubj = false; }
    else if (f.sicher === 'aufs') { s.push(`Bis zum Eintreffen der Ordnungsbehörde blieben die Einsatzkräfte bei ${g.dem}.`); obSubj = false; }
    else if (f.sicher === 'gew') {
      s.push(has(f.gewWer) ? `${kraft(f.gewWer)} nahm ${g.den}${um(f.gewT)} bis zur Entscheidung der Ordnungsbehörde nach ${norm} in Gewahrsam (gesonderter Bericht).` : `${cap(g.der)} wurde${um(f.gewT)} bis zur Entscheidung der Ordnungsbehörde nach ${norm} in Gewahrsam genommen (gesonderter Bericht).`);
      obSubj = false;
    }
    const wer = f.arztWer || 'ob';
    if (has(f.obAnk)) s.push(`${refStart()} traf${um(f.obAnk)} vor Ort ein${wer === 'ob' ? ` und bestellte ${A.acc}` : ''}.`);
    // Ärztin oder Arzt
    if (wer === 'ob' && !has(f.obAnk)) s.push(`${refStart()} bestellte ${A.acc}.`);
    else if (wer === 'pol') s.push(has(f.arztPolWer) ? `${kraft(f.arztPolWer)} verständigte ${A.acc}.` : `Die Einsatzkräfte verständigten ${A.acc}.`);
    else if (wer === 'vorort') s.push(`${cap(A.nom)} war bereits vor Ort.`);
    else if (wer === 'ang') s.push(`Angehörige hatten bereits ${A.acc} verständigt.`);
    if (has(f.arztT) && wer !== 'vorort') s.push(`${cap(A.kurz)} traf${um(f.arztT)} ein.`);
    // Begutachtung und Zeugnis
    const plus = arr(f.begutPlus).map(x => ({ angeh: 'Dabei wurden auch Angehörige befragt.', pol: 'Die eingesetzten Beamten schilderten ihre Feststellungen.' }[x])).filter(Boolean);
    const zeug = f.erg === 'sofort';
    if (f.begut === 'beide') {
      if (zeug && !plus.length) s.push(`Beide machten sich ein umfassendes Bild von ${g.dem}, woraufhin ${A.kurz}${um(f.zeugT)} ein entsprechendes ärztliches Zeugnis erstellte.`);
      else { s.push(`Beide machten sich ein umfassendes Bild von ${g.dem}.`, ...plus); if (zeug) s.push(`Daraufhin erstellte ${A.kurz}${um(f.zeugT)} ein entsprechendes ärztliches Zeugnis.`); }
    } else {
      if (zeug && !plus.length) s.push(`${cap(A.kurz)} untersuchte ${g.den} persönlich und erstellte${um(f.zeugT)} ein entsprechendes ärztliches Zeugnis.`);
      else { s.push(`${cap(A.kurz)} untersuchte ${g.den} persönlich.`, ...plus); if (zeug) s.push(`Daraufhin erstellte ${A.kurz}${um(f.zeugT)} ein entsprechendes ärztliches Zeugnis.`); }
    }
    return tidy(s.join(' '));
  }

  /* ----- Teil 3: Entscheidung ----- */
  function teilEntscheidung(d, ctx) {
    const f = P(d), g = G(d), s = [];
    if (!f.erg) return `${miss(ctx, 'Ergebnis: sofortige Unterbringung, freiwillige Aufnahme oder keine Unterbringung')}`;
    const O = obOf(d, { miss: [] }), A = arztOf(d, { miss: [] });
    if (f.erg === 'sofort') {
      if (f.anord === 'antrag') {
        s.push(`${cap(A.kurz)} beantragte die zwangsweise Unterbringung ${g.des} in einem psychiatrischen Fachkrankenhaus.`);
        s.push(`Auf dieser Grundlage ordnete ${O.ref}${um(f.anordT)} die sofortige Unterbringung nach § 14 PsychKG NRW an.`);
      } else s.push(`Auf Grundlage des ärztlichen Zeugnisses ordnete ${O.ref}${um(f.anordT)} die sofortige Unterbringung ${g.des} in einem psychiatrischen Fachkrankenhaus nach § 14 PsychKG NRW an.`);
    } else if (f.erg === 'freiw') {
      s.push(`${cap(g.der)} erklärte sich daraufhin bereit, sich freiwillig in stationäre psychiatrische Behandlung zu begeben. Eine Unterbringung gegen ${g.poss}en Willen war daher nicht erforderlich.`);
    } else {
      s.push(`${cap(A.kurz)} kam nach der Untersuchung zu dem Ergebnis, dass die Voraussetzungen einer Unterbringung nach dem PsychKG NRW nicht vorlagen.`);
      const v = arr(f.verbleib);
      if (v.includes('kh')) s.push(`${cap(g.der)} wurde zur körperlichen Abklärung mit dem Rettungsdienst in ein Krankenhaus gebracht.`);
      if (v.includes('wohn')) s.push(`${cap(g.der)} verblieb in ${g.poss}er Wohnung.`);
      if (v.includes('ueb')) s.push(`${cap(g.der)} wurde an ${appos(f.verbleibAn) || miss(ctx, 'an wen übergeben')} übergeben.`);
      if (v.includes('hilfe')) s.push(`${cap(g.dem)} wurden Hilfsangebote (Sozialpsychiatrischer Dienst, Krisendienst, behandelnde Ärzte) aufgezeigt.`);
      if (v.includes('arzt')) s.push('Eine zeitnahe ambulante ärztliche Vorstellung wurde vereinbart.');
    }
    return tidy(s.join(' '));
  }

  /* ----- Teil 4: Transport, Zwang, Begleitung, Übergabe ----- */
  const zielText = (v, ctx) => {
    const z = clause(v); if (!z) return miss(ctx, 'Klinik');
    if (/^(die|das|den|der|dem|ein|eine|einen)\s/i.test(z)) return z;
    if (/klinikum|krankenhaus|hospital|zentrum/i.test(z.split(/\s/)[0])) return 'das ' + z;
    return 'die ' + z;
  };
  function teilTransport(d, ctx) {
    const f = P(d), g = G(d), s = [];
    if (!transportNoetig(d)) return '';
    const T = TRANS[f.trans], ziel = zielText(S(d).ziel, ctx), dann = f.erg === 'sofort' ? ' daraufhin' : ' anschließend';
    if (!T) s.push(`${cap(g.der)} wurde${dann}${um(f.abT)} mit ${miss(ctx, 'Transportmittel')} in ${ziel} transportiert.`);
    else if (f.trans === 'stw') s.push(`${cap(g.der)} wurde${dann}${um(f.abT)} von den eingesetzten Beamten mit dem Streifenwagen in ${ziel} gebracht.`);
    else if (f.trans === 'priv') s.push(`${cap(g.der)} wurde${dann}${um(f.abT)} von Angehörigen mit einem Privatfahrzeug in ${ziel} gebracht.`);
    else s.push(`${cap(g.der)} wurde${dann}${um(f.abT)} mit ${T[1]} in ${ziel} transportiert.`);
    // Widerstand und Zwang (nur bei Unterbringung gegen den Willen)
    if (f.erg === 'sofort') {
      if (f.zwang === 'ohne') s.push(`${cap(g.er)} leistete keinen Widerstand.`);
      else if (f.zwang === 'zureden') s.push(`${cap(g.er)} folgte nach längerem Zureden ohne Widerstand.`);
      else if (f.zwang === 'zwang') {
        const za = ZWANG.filter(x => arr(f.zwangArt).includes(x[0])).map(x => x[2]);
        const wer = has(f.zwangWer) ? `setzte ${kraft(f.zwangWer)}` : 'setzten die eingesetzten Beamten';
        s.push(`Da ${g.er} sich der Maßnahme widersetzte, ${wer} sie im Wege der Vollzugshilfe für die Ordnungsbehörde (§ 47 PolG NRW) mit unmittelbarem Zwang durch${za.length ? ` (${joinList(za, 'sowie')})` : ''}.`);
        if (arr(f.zwangArt).includes('fessel')) {
          const fg = FESSEL.filter(x => arr(f.fesselGrund).includes(x[0])).map(x => x[2]);
          s.push(`Die Fesselung erfolgte nach § 62 PolG NRW, weil Tatsachen die Annahme rechtfertigten, dass ${g.er} ${fg.length ? joinList(fg, 'oder') : miss(ctx, 'Grund der Fesselung')} werde.`);
        }
      }
    }
    // Begleitung
    const fz = T ? T[2] : 'Fahrzeug';
    if (f.trans !== 'stw' && f.trans !== 'priv') {
      if (f.begl === 'nein') s.push('Eine Begleitung durch die eingesetzten Beamten wurde von den beteiligten Kräften nicht als erforderlich angesehen.');
      else if (f.begl === 'ja') {
        s.push(`Der Transport wurde von den eingesetzten Beamten begleitet${has(f.beglGrund) ? `, weil ${clause(f.beglGrund)}` : ''}.`);
        if (f.beglWie === 'mit') s.push(`${has(f.beglWer) ? kraft(f.beglWer) : 'Ein Beamter'} fuhr im ${fz} mit.`);
        else if (f.beglWie === 'folge') s.push(`Der Streifenwagen folgte dem ${fz}.`);
      } else if (f.begl === 'ob') s.push(`Den Transport begleitete ${obOf(d, { miss: [] }).ref}; eine Begleitung durch die eingesetzten Beamten war nicht erforderlich.`);
      else s.push(`${miss(ctx, 'Begleitung durch die Beamten: ja oder nicht erforderlich')}`);
    }
    if (f.begl === 'ja' || f.trans === 'stw') {
      if (has(f.uebT) || has(f.uebAn)) s.push(`${has(f.uebT) ? `Um ${str(f.uebT)} Uhr` : 'In der Klinik'} wurde ${g.der}${has(f.uebT) ? ' in der Klinik' : ''} ${has(f.uebAn) ? `an ${appos(f.uebAn)} ` : ''}übergeben.`);
    }
    return tidy(s.join(' '));
  }

  /* ----- Teil 5: Abschluss ----- */
  function teilAbschluss(d, ctx) {
    const f = P(d), g = G(d), s = [];
    if (f.sicher === 'gew') {
      const wie = { ob: 'mit der Übernahme durch die Ordnungsbehörde', klinik: 'mit der Übergabe in der Klinik', frei: `mit der Entlassung ${g.des}` }[f.gewEndeArt] || '';
      if (has(f.gewEnde) || wie) s.push(`Der polizeiliche Gewahrsam endete${um(f.gewEnde)}${wie ? ' ' + wie : ''}.`);
    }
    const n = arr(f.nach);
    if (n.includes('wohn')) s.push(`Die Wohnung ${g.des} wurde verschlossen.`);
    if (n.includes('geraete')) s.push('Herd und elektrische Geräte wurden ausgeschaltet.');
    if (n.includes('schl')) s.push(`Der Wohnungsschlüssel wurde an ${appos(f.schlAn) || miss(ctx, 'wen')} übergeben.`);
    if (n.includes('tiere')) s.push(`Die Versorgung der Haustiere übernahm ${clause(f.tiereX) || miss(ctx, 'wer')}.`);
    if (n.includes('info')) s.push(`Informiert ${plural(f.infoX) ? 'wurden' : 'wurde'} ${clause(f.infoX) || miss(ctx, 'wer')}.`);
    if (n.includes('ggst')) s.push(`Sichergestellt ${plural(f.ggstX) ? 'wurden' : 'wurde'} ${clause(f.ggstX) || miss(ctx, 'was')}.`);
    return tidy(s.join(' '));
  }

  /* ======================= Zusammensetzen ======================= */
  const ueberschrift = d => UEB[S(d).ueb] || UEB.pk;
  const nrOf = d => str(S(d).nr).replace(/\.+$/, '');
  function compose(d) {
    const ctx = { miss: [] }, missing = [];
    const take = (label, fn) => { ctx.miss = []; const t = fn(d, ctx); if (ctx.miss.length) missing.push(`${label}: ${[...new Set(ctx.miss)].join(', ')}`); return t; };
    const parts = {
      gefahr: take('Verhalten & Gefahr', teilGefahr),
      behoerde: take('Ordnungsamt & Arzt', teilBehoerde),
      entscheidung: take('Entscheidung', teilEntscheidung),
      transport: take('Transport', teilTransport),
      abschluss: take('Abschluss', teilAbschluss)
    };
    return { parts, missing };
  }
  const body = d => { const p = compose(d).parts; return [p.gefahr, p.behoerde, p.entscheidung, p.transport, p.abschluss].filter(Boolean).join('\n\n'); };
  const heading = d => [nrOf(d), ueberschrift(d)].filter(Boolean).join(' ');
  const text = d => [[nrOf(d), ueberschrift(d), body(d), 'gefahr']];
  const plain = d => `${heading(d)}\n\n${body(d)}`;
  function preview(id, d) {
    const p = compose(d).parts;
    if (id === 'gefahr') return p.gefahr;
    if (id === 'behoerde') return p.behoerde;
    if (id === 'entscheidung') return p.entscheidung;
    if (id === 'transport') return plain(d);
    return '';
  }
  const OUTS = { o_gefahr: d => preview('gefahr', d), o_behoerde: d => preview('behoerde', d), o_entscheidung: d => preview('entscheidung', d), o_alles: d => plain(d) };
  const out = (fn, l, h) => ({ t: 'out', fn, l: l || 'So steht es im Abschnitt', h: h || 'Fertiger Text dieses Schritts. Fehlendes steht in eckigen Klammern.' });

  /* ======================= Offene Punkte, Kurzfassung, Personalien ======================= */
  function offen(d) {
    const f = P(d), o = compose(d).missing.map(x => 'Fehlt – ' + x);
    if (!has(f.verh)) o.push('Verhalten: Der Text bezieht sich auf den Sachverhalt. Dort müssen Handlungen und wörtliche Äußerungen konkret beschrieben sein.');
    if (!arr(f.krank).length) o.push('„Augenscheinlich krankheitsbedingt“ braucht Tatsachen: mindestens einen Anhaltspunkt für eine psychische Erkrankung antippen (Schritt Gefahr).');
    const m = arr(f.mild);
    if (!m.length) o.push('§ 11 Abs. 1 PsychKG NRW: Darlegen, warum die Gefahr nicht anders abwendbar war (Schritt Gefahr).');
    else if (m.length === 1 && m[0] === 'freiw') o.push('Nur „Behandlung abgelehnt“ angegeben: Die fehlende Bereitschaft, sich behandeln zu lassen, rechtfertigt allein keine Unterbringung (§ 11 Abs. 1 Satz 2) – weitere Gründe ergänzen.');
    if (f.erg === 'sofort' && ['haus', 'bd', 'na'].includes(f.arztDienst)) o.push('Das ärztliche Zeugnis soll grundsätzlich von einer in Psychiatrie und Psychotherapie weitergebildeten oder in der Psychiatrie erfahrenen Ärztin oder einem Arzt stammen (§ 14 Abs. 1 PsychKG NRW). Ggf. festhalten, warum niemand mit dieser Erfahrung erreichbar war.');
    if (f.sicher === 'gew') { o.push('Gewahrsam: gesonderten Bericht fertigen (Schreiben → Gewahrsam).'); if (!has(f.gewEnde)) o.push('Ende des polizeilichen Gewahrsams mit Uhrzeit eintragen (letzter Schritt).'); }
    if (f.erg === 'sofort' && f.zwang === 'zwang' && !arr(f.zwangArt).length) o.push('Art des unmittelbaren Zwangs antippen (letzter Schritt).');
    if (arr(f.droh).some(x => ['angriff', 'sach', 'brand'].includes(x))) o.push('Bei Bedrohung, Angriff, Brandstiftung oder Sachbeschädigung: Strafanzeige gesondert prüfen.');
    return o;
  }
  function kurzText(d) {
    const f = P(d), sel = arr(f.droh);
    const gef = { selbst: 'Selbstgefährdung', fremd: 'Fremdgefährdung', beide: 'Selbst- und Fremdgefährdung' }[f.gef];
    const dr = [...DROH_S, ...DROH_F].filter(x => sel.includes(x[0])).map(x => x[1].replace(/ \(.*\)$/, ''));
    const ob = OB[f.ob] ? `${OB[f.ob].l}${has(S(d).obOrt) ? ' ' + str(S(d).obOrt) : ''}` : '';
    const az = ARZT[f.arztDienst] ? ARZT[f.arztDienst].l : '';
    const tr = transportNoetig(d) && TRANS[f.trans] ? `${TRANS[f.trans][0]}${has(S(d).ziel) ? ' → ' + clause(S(d).ziel).replace(/^(die|das)\s/i, '') : ''}` : '';
    const bg = transportNoetig(d) ? ({ nein: 'ohne Begleitung', ja: 'mit Begleitung', ob: 'Begleitung Ordnungsamt' }[f.begl] || '') : '';
    return ['Maßnahmen nach dem PsychKG NRW', gef ? `${gef}${dr.length ? ` (${dr.join(', ')})` : ''}` : '', ob, az, ERG[f.erg] || '', tr, bg].filter(Boolean).join(' · ');
  }
  function personalien(d) {
    const p = get(d, 'pk.p') || {}, f = P(d);
    const anrede = { m: 'Herr', w: 'Frau', d: 'Divers' }[p.geschlecht] || '';
    const rolle = f.bez === 'besch' ? 'Beschuldigte Person' : 'Betroffene Person';
    const lines = [`${rolle}: ${[anrede, str(p.vorname), str(p.nachname)].filter(Boolean).join(' ') || '[Name]'}`, `Geburtsdatum: ${has(p.geb) ? fmtD(p.geb) : '[Geburtsdatum]'}`, `Anschrift: ${has(p.anschrift) ? str(p.anschrift) : '[Anschrift]'}`];
    if (OB[f.ob]) lines.push(`Ordnungsbehörde: ${OB[f.ob].l}${has(S(d).obOrt) ? ' ' + str(S(d).obOrt) : ''}${has(f.obName) ? `, ${f.obG === 'w' ? 'Frau' : f.obG === 'm' ? 'Herr' : ''} ${str(f.obName)}`.replace(/ {2,}/g, ' ') : ''}`);
    if (ARZT[f.arztDienst] || has(f.arztName)) lines.push(`Ärztin/Arzt: ${[str(f.arztName), ARZT[f.arztDienst] ? ARZT[f.arztDienst].l : ''].filter(Boolean).join(', ')}`);
    return lines.join('\n');
  }
  function title(d) {
    const p = get(d, 'pk.p') || {}, f = P(d);
    return ['PsychKG', str(p.nachname), ERG[f.erg] || ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const dat = get(d, 'einsatz.datum');
    return [has(dat) ? fmtD(dat) : '', has(S(d).obOrt) ? str(S(d).obOrt) : ''].filter(Boolean).join(' · ');
  }

  /* ======================= Schritte ======================= */
  const gefNoetig = d => has(P(d).gef);
  const fremdDabei = d => ['fremd', 'beide'].includes(P(d).gef);
  const pron = d => G(d);
  const STEPS = [
    {
      id: 'grund', phase: 'Grundlage', title: 'Person & Kräfte', lead: 'Wer ist betroffen, wie heißt die Person im Text, wer war im Einsatz? Nummer und Überschrift merkt sich die App für den nächsten Fall.',
      fields: [
        { k: 'pkStd.nr', t: 'text', l: 'Abschnittsnummer im Bericht', w: 'half', ph: 'z. B. 4', max: 8, inputmode: 'decimal', sugg: [['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7']] },
        { k: 'pkStd.ueb', t: 'choice', l: 'Überschrift', w: 'half', o: [['pk', 'Maßnahmen nach dem PsychKG'], ['pknrw', '… PsychKG NRW'], ['m', 'Nur „Maßnahmen“']] },
        { k: 'pk.p', t: 'person', l: 'Betroffene Person', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift'] },
        { k: K('bez'), t: 'choice', l: 'Im Text heißt die Person …', o: bezOpts, h: 'Steuert die Satzführung („Aufgrund der beschriebenen Verhaltensweise des Betroffenen …“).' },
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Eingesetzte Kräfte', h: 'Aus der laufenden Schicht oder per Antippen aus dem Team. Später wählst du daraus, wer was getan hat.', max: 8 }
      ]
    },
    {
      id: 'gefahr', phase: 'Gefahr', title: 'Verhalten & Gefahr', lead: 'Was drohte, wem, und woran war die Erkrankung erkennbar? § 11 PsychKG NRW.',
      fields: [
        { t: 'preset', l: 'Schnellwahl', o: () => [
          ['Suizidgefahr', { 'pk.gef': 'selbst', 'pk.droh': ['suizid'] }, 'Selbsttötung droht'],
          ['Selbstverletzung', { 'pk.gef': 'selbst', 'pk.droh': ['verl'] }],
          ['Hilflos, verwirrt', { 'pk.gef': 'selbst', 'pk.droh': ['unterk', 'verkehr'] }, 'Unterkühlung, Straßenverkehr'],
          ['Angriff auf andere', { 'pk.gef': 'fremd', 'pk.droh': ['angriff'] }]
        ] },
        { t: 'head', text: 'Verhalten', h: 'optional, wenn es schon im Sachverhalt steht' },
        { k: K('verh'), t: 'area', l: 'Was hat die Person getan oder gesagt?', pre: d => cap(pron(d).der), ph: d => (gOf(d) === 'w' ? 'kündigte gegenüber ihrer Mutter an, sich vom Balkon zu stürzen, und stieg auf die Brüstung' : 'kündigte gegenüber seiner Mutter an, sich vom Balkon zu stürzen, und stieg auf die Brüstung'), h: 'Leer lassen, wenn das Verhalten schon im Sachverhalt beschrieben ist – dann bezieht sich der Text darauf.', rows: 2, max: 1200, lint: 'tats' },
        { k: K('krank'), t: 'multi', l: 'Woran war eine psychische Erkrankung erkennbar?', o: KRANK },
        { k: K('quelle'), t: 'choice', l: 'Bekannt nach Angaben von …', o: Object.entries(QUELLE).map(([k, v]) => [k, v[0]]), when: inF('krank', 'bekannt') },
        { k: K('diag'), t: 'text', l: 'Welche Erkrankung? (optional)', pre: 'leidet an', ph: 'einer paranoiden Schizophrenie', when: inF('krank', 'bekannt') },
        { k: K('wahnX'), t: 'text', l: 'Wörtliche Äußerung (optional)', pre: d => `${cap(pron(d).er)} äußerte wörtlich:`, ph: 'Die Nachbarn vergiften mein Wasser.', max: 400, when: d => inF('krank', 'wahn')(d) || inF('krank', 'stimmen')(d) },
        { k: K('krankX'), t: 'text', l: 'Eigene Beobachtung', pre: d => `dass ${pron(d).er}`, ph: 'die Wohnungstür mit Möbeln verbarrikadiert hatte', max: 400, when: inF('krank', 'eigen') },
        { t: 'head', text: 'Gefahr', h: '§ 11 Abs. 1 und 2 PsychKG NRW' },
        { k: K('gef'), t: 'choice', l: 'Wen gefährdete das Verhalten?', o: [['selbst', 'Sich selbst'], ['fremd', 'Andere'], ['beide', 'Sich und andere']], req: true },
        { k: K('droh'), t: 'multi', l: 'Welches Ereignis drohte?', o: drohOpts, req: true, when: gefNoetig },
        { k: K('drohX'), t: 'text', l: 'Eigene Formulierung', pre: 'hier:', ph: 'ein Sprung aus dem Fenster im 3. OG', max: 300, when: inF('droh', 'eigen') },
        { k: K('wen'), t: 'text', l: 'Wer war gefährdet? (optional)', pre: 'Gefährdet waren insbesondere', ph: d => (gOf(d) === 'w' ? 'ihre Mutter und die Nachbarn im Haus' : 'seine Mutter und die Nachbarn im Haus'), max: 300, when: fremdDabei },
        { k: K('gegenw'), t: 'choice', l: 'Wie nah war der Schaden?', o: [['unm', 'Unmittelbar bevorstehend'], ['jzt', 'Jederzeit zu erwarten'], ['beides', 'Beides (wie im Muster)']], h: 'Ohne Auswahl steht beides im Text, wie in deinem Muster.', when: gefNoetig },
        { t: 'head', text: 'Nicht anders abwendbar', h: 'Die fehlende Bereitschaft, sich behandeln zu lassen, rechtfertigt allein keine Unterbringung.' },
        { k: K('mild'), t: 'multi', l: 'Warum reichte nichts Milderes?', o: MILD },
        { k: K('mildX'), t: 'text', l: 'Eigener Grund', pre: 'Die Gefahr ließ sich nicht anders abwenden, weil', ph: d => `${pron(d).er} jede Hilfe ablehnte und allein lebt`, max: 400, when: inF('mild', 'eigen') },
        out('o_gefahr')
      ]
    },
    {
      id: 'behoerde', phase: 'Maßnahmen', title: 'Ordnungsamt & Arzt', lead: 'Wer wurde hinzugezogen, wer hat begutachtet? Uhrzeiten sind optional, „Jetzt“ trägt sie sofort ein.',
      fields: [
        { t: 'preset', l: 'Schnellwahl', o: () => [
          ['Wie im Muster', { 'pk.ob': 'oa', 'pk.arztWer': 'ob', 'pk.arztDienst': 'spdi', 'pk.begut': 'beide' }, 'Ordnungsamt bestellt Arzt des SpDi, beide begutachten'],
          ['Notarzt war vor Ort', { 'pk.ob': 'oa', 'pk.arztWer': 'vorort', 'pk.arztDienst': 'na', 'pk.begut': 'arzt' }],
          ['Nachts: Bereitschaftsdienst', { 'pk.ob': 'bd', 'pk.arztWer': 'ob', 'pk.arztDienst': 'spdi', 'pk.begut': 'beide' }]
        ] },
        { t: 'head', text: 'Ordnungsbehörde' },
        { k: K('ob'), t: 'choice', l: 'Wer wurde hinzugezogen?', o: Object.entries(OB).map(([k, v]) => [k, v.l]), req: true },
        { k: 'pkStd.obOrt', t: 'text', l: 'Stadt oder Gemeinde', ph: 'Gütersloh', max: 60, sugg: () => kommunen().map(k => [k, k]), req: true },
        { k: K('obG'), t: 'choice', l: 'Person vor Ort (optional)', w: 'half', o: [['m', 'Herr'], ['w', 'Frau']] },
        { k: K('obName'), t: 'text', l: 'Nachname (optional)', w: 'half', ph: 'Krause', max: 60, when: d => has(P(d).obG) },
        { k: K('obWer'), t: 'crewpick', l: 'Wer hat verständigt? (optional)', kurz: true },
        { k: K('obT'), t: 'time', l: 'Verständigt um', w: 'half', q: 'jetzt' },
        { k: K('obAnk'), t: 'time', l: 'Vor Ort um', w: 'half', q: 'jetzt' },
        { t: 'head', text: 'Bis zur Entscheidung' },
        { k: K('sicher'), t: 'choice', l: d => `Was geschah bis dahin mit ${pron(d).dem}?`, o: [['frei', 'Blieb freiwillig da'], ['aufs', 'Beamte blieben dabei'], ['gew', 'Gewahrsam (PolG NRW)']] },
        { k: K('gewWer'), t: 'crewpick', l: 'Wer nahm in Gewahrsam?', kurz: true, when: isF('sicher', 'gew') },
        { k: K('gewT'), t: 'time', l: 'Gewahrsam um', w: 'half', q: 'jetzt', when: isF('sicher', 'gew') },
        { t: 'info', text: 'Für den Gewahrsam selbst gibt es unter „Schreiben“ den eigenen Abschnitt „Gewahrsam (PolG NRW)“. Hier steht nur der Hinweis darauf.', when: isF('sicher', 'gew') },
        { t: 'head', text: 'Ärztin oder Arzt' },
        { k: K('arztDienst'), t: 'choice', l: 'Von welchem Dienst?', o: Object.entries(ARZT).map(([k, v]) => [k, v.l]), req: true },
        { k: K('arztG'), t: 'choice', l: 'Ärztin oder Arzt?', w: 'half', o: [['w', 'Ärztin'], ['m', 'Arzt']], req: true },
        { k: K('arztName'), t: 'text', l: 'Name (optional)', w: 'half', ph: 'Dr. Meier', max: 80 },
        { k: K('arztWer'), t: 'choice', l: 'Wie kam die Ärztin bzw. der Arzt dazu?', o: [['ob', 'Ordnungsamt bestellte'], ['pol', 'Polizei verständigte'], ['vorort', 'War schon vor Ort'], ['ang', 'Angehörige riefen']], h: 'Ohne Auswahl: „… bestellte“ wie im Muster.' },
        { k: K('arztPolWer'), t: 'crewpick', l: 'Wer verständigte?', kurz: true, when: isF('arztWer', 'pol') },
        { k: K('arztT'), t: 'time', l: 'Eingetroffen um', w: 'half', q: 'jetzt', when: d => P(d).arztWer !== 'vorort' },
        { k: K('begut'), t: 'choice', l: 'Wer hat sich ein Bild gemacht?', o: [['beide', 'Beide gemeinsam'], ['arzt', 'Ärztin/Arzt allein']], req: true },
        { k: K('begutPlus'), t: 'multi', l: 'Außerdem (optional)', o: [['angeh', 'Angehörige befragt'], ['pol', 'Beamte schilderten Feststellungen']] },
        out('o_behoerde')
      ]
    },
    {
      id: 'entscheidung', phase: 'Maßnahmen', title: 'Entscheidung', lead: 'Wie ging es aus? Bei der sofortigen Unterbringung ordnet die Ordnungsbehörde an (§ 14 PsychKG NRW).',
      fields: [
        { k: K('erg'), t: 'choice', l: 'Ergebnis', o: Object.entries(ERG), req: true },
        { t: 'info', text: '§ 14 PsychKG NRW: Die örtliche Ordnungsbehörde nimmt die sofortige Unterbringung vor, wenn ein ärztliches Zeugnis über einen aktuellen Befund vorliegt (nicht älter als vom Vortag). Den Antrag beim Amtsgericht stellt die Ordnungsbehörde.', when: isF('erg', 'sofort') },
        { k: K('zeugT'), t: 'time', l: 'Ärztliches Zeugnis um', w: 'half', q: 'jetzt', when: isF('erg', 'sofort') },
        { k: K('anordT'), t: 'time', l: 'Unterbringung angeordnet um', w: 'half', q: 'jetzt', when: isF('erg', 'sofort') },
        { k: K('anord'), t: 'choice', l: 'So steht es im Text', o: [['ob', 'Ordnungsamt ordnete an'], ['antrag', 'Arzt beantragte, Ordnungsamt ordnete an']], h: 'Ohne Auswahl: „… ordnete die sofortige Unterbringung an“.', when: isF('erg', 'sofort') },
        { k: K('verbleib'), t: 'multi', l: 'Was geschah stattdessen?', o: VERBLEIB, when: isF('erg', 'keine') },
        { k: K('verbleibAn'), t: 'text', l: 'An wen übergeben?', pre: 'übergeben an', ph: d => (gOf(d) === 'w' ? 'ihre Schwester, Frau K.' : 'seine Schwester, Frau K.'), max: 200, when: d => isF('erg', 'keine')(d) && inF('verbleib', 'ueb')(d) },
        out('o_entscheidung')
      ]
    },
    {
      id: 'transport', phase: 'Abschluss', title: d => (transportNoetig(d) ? 'Transport & Abschluss' : 'Abschluss'), lead: d => (transportNoetig(d) ? 'Womit, wohin, mit oder ohne Begleitung? Unten steht der ganze Abschnitt zum Kopieren.' : 'Was ist noch zu vermerken? Unten steht der ganze Abschnitt zum Kopieren.'),
      fields: [
        { t: 'preset', l: 'Schnellwahl', when: transportNoetig, o: () => [
          ['KTW, ohne Begleitung', { 'pk.trans': 'ktw', 'pk.begl': 'nein' }, 'wie im Muster'],
          ['RTW, Streifenwagen folgt', { 'pk.trans': 'rtw', 'pk.begl': 'ja', 'pk.beglWie': 'folge' }],
          ['RTW, Beamter fährt mit', { 'pk.trans': 'rtw', 'pk.begl': 'ja', 'pk.beglWie': 'mit' }]
        ] },
        { t: 'head', text: 'Transport', when: transportNoetig },
        { k: K('trans'), t: 'choice', l: 'Womit?', o: d => Object.entries(TRANS).filter(([k]) => k !== 'priv' || P(d).erg === 'freiw').map(([k, v]) => [k, v[0]]), req: true, when: transportNoetig },
        { k: 'pkStd.ziel', t: 'text', l: 'Wohin?', pre: 'in', ph: 'die psychiatrische Abteilung des LWL-Klinikums Gütersloh', max: 200, sugg: [['LWL-Klinikum Gütersloh', 'das LWL-Klinikum Gütersloh'], ['Wie im Muster', 'die psychiatrische Abteilung des LWL-Klinikums Gütersloh']], req: true, when: transportNoetig },
        { k: K('abT'), t: 'time', l: 'Abfahrt um', w: 'half', q: 'jetzt', when: transportNoetig },
        { t: 'head', text: 'Widerstand', when: isF('erg', 'sofort') },
        { k: K('zwang'), t: 'choice', l: d => `Wie verhielt sich ${pron(d).der}?`, o: [['ohne', 'Kein Widerstand'], ['zureden', 'Folgte nach Zureden'], ['zwang', 'Unmittelbarer Zwang']], when: isF('erg', 'sofort') },
        { k: K('zwangArt'), t: 'multi', l: 'Welcher Zwang?', o: ZWANG.map(x => [x[0], x[1]]), when: d => isF('erg', 'sofort')(d) && isF('zwang', 'zwang')(d) },
        { k: K('zwangWer'), t: 'crewpick', l: 'Wer hauptsächlich? (optional)', kurz: true, when: d => isF('erg', 'sofort')(d) && isF('zwang', 'zwang')(d) },
        { k: K('fesselGrund'), t: 'multi', l: d => `Gefesselt, weil Tatsachen dafür sprachen, dass ${pron(d).er} …`, o: FESSEL.map(x => [x[0], x[1]]), h: '§ 62 PolG NRW', when: d => isF('erg', 'sofort')(d) && isF('zwang', 'zwang')(d) && inF('zwangArt', 'fessel')(d) },
        { t: 'head', text: 'Begleitung', when: d => transportNoetig(d) && !['stw', 'priv'].includes(P(d).trans) },
        { k: K('begl'), t: 'choice', l: 'Begleitung durch die Beamten?', o: [['nein', 'Nicht erforderlich'], ['ja', 'Ja, begleitet'], ['ob', 'Nur Ordnungsamt']], req: true, when: d => transportNoetig(d) && !['stw', 'priv'].includes(P(d).trans) },
        { k: K('beglWie'), t: 'choice', l: 'Wie?', o: [['mit', 'Beamter fuhr mit'], ['folge', 'Streifenwagen folgte']], when: d => transportNoetig(d) && isF('begl', 'ja')(d) && !['stw', 'priv'].includes(P(d).trans) },
        { k: K('beglWer'), t: 'crewpick', l: 'Wer fuhr mit?', kurz: true, when: d => transportNoetig(d) && isF('begl', 'ja')(d) && isF('beglWie', 'mit')(d) && !['stw', 'priv'].includes(P(d).trans) },
        { k: K('beglGrund'), t: 'text', l: 'Warum? (optional)', pre: 'weil', ph: 'weiterhin mit Gegenwehr zu rechnen war', max: 300, when: d => transportNoetig(d) && isF('begl', 'ja')(d) && !['stw', 'priv'].includes(P(d).trans) },
        { k: K('uebT'), t: 'time', l: 'In der Klinik übergeben um', w: 'half', q: 'jetzt', when: d => transportNoetig(d) && (isF('begl', 'ja')(d) || isF('trans', 'stw')(d)) },
        { k: K('uebAn'), t: 'text', l: 'An wen? (optional)', pre: 'an', ph: 'den diensthabenden Arzt, Dr. S.', max: 200, when: d => transportNoetig(d) && (isF('begl', 'ja')(d) || isF('trans', 'stw')(d)) },
        { t: 'head', text: 'Ende des Gewahrsams', when: isF('sicher', 'gew') },
        { k: K('gewEnde'), t: 'time', l: 'Gewahrsam beendet um', w: 'half', q: 'jetzt', when: isF('sicher', 'gew') },
        { k: K('gewEndeArt'), t: 'choice', l: 'Wodurch?', w: 'half', o: [['ob', 'Übernahme Ordnungsamt'], ['klinik', 'Übergabe Klinik'], ['frei', 'Entlassen']], when: isF('sicher', 'gew') },
        { t: 'head', text: 'Abschluss', h: 'optional' },
        { k: K('nach'), t: 'multi', l: 'Was wurde noch erledigt?', o: NACH },
        { k: K('schlAn'), t: 'text', l: 'Schlüssel an wen?', pre: 'Der Wohnungsschlüssel wurde übergeben an', ph: 'die Nachbarin, Frau L.', max: 200, when: inF('nach', 'schl') },
        { k: K('tiereX'), t: 'text', l: 'Wer versorgt die Tiere?', pre: 'Die Versorgung der Haustiere übernahm', ph: 'der Nachbar, Herr P.', max: 200, when: inF('nach', 'tiere') },
        { k: K('infoX'), t: 'text', l: 'Wer wurde informiert?', pre: 'Informiert wurde', ph: 'die Mutter, Frau K.', max: 200, when: inF('nach', 'info') },
        { k: K('ggstX'), t: 'text', l: 'Was wurde sichergestellt?', pre: 'Sichergestellt wurde', ph: 'ein Küchenmesser', max: 300, when: inF('nach', 'ggst') },
        out('o_alles', 'Der ganze Abschnitt', 'Mit Nummer und Überschrift – so kopierst du ihn in deinen Bericht. Fehlendes steht in eckigen Klammern.')
      ]
    }
  ];

  root.WPsychKG = Object.freeze({
    id: 'psychkg', name: 'Maßnahmen nach dem PsychKG', short: 'PsychKG', kurz: 'PSY',
    desc: 'Eigener Abschnitt für psychische Ausnahmesituationen: Gefahr, Ordnungsamt, Ärztin oder Arzt, Entscheidung und Transport antippen – heraus kommt der fertige Abschnitt',
    intro: 'Gefahr, Ordnungsamt, Ärztin oder Arzt, Entscheidung und Transport antippen · fertiger Abschnitt „Maßnahmen nach dem PsychKG“ mit Nummer zum Kopieren',
    labels: {
      bericht: 'Abschnitt', kurz: 'Kurzfassung', kurzHint: 'Eine Zeile für Vorgang, Liste und Übergabe.',
      offen: 'Offene Punkte', offenHint: 'Angehakte Punkte landen als Todos im Planner. Fehlende Angaben stehen im Text in eckigen Klammern.',
      offenEmpty: 'Alle Angaben sind erfasst.', persHint: 'Gesondert vom Abschnittstext.', newBtn: 'PsychKG'
    },
    inherit: ['pkStd'], noPreview: true,
    steps: STEPS, text, plain, preview, kurzText, fahndung: () => '', offen, personalien, title, subtitle, ...OUTS,
    _test: { compose, G, arztOf, obOf, kommuneGen, clause, zielText }
  });
})(typeof window !== 'undefined' ? window : globalThis);
