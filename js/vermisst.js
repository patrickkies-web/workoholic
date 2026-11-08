/*
 * Workoholic · Schriftliche Arbeiten · Modul „Vermisste Person“
 * ---------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 * Aufbau nach Dringlichkeit (geprüft durch DGL Wachdienst, KK-Leitung Vermisstensachen, Leitstelle,
 * Effizienz- und Qualitätsprüfung):
 *  Phase „Sofort“   – wer, Gefahr, wann/wo zuletzt, Beschreibung, Bei Antreffen → Fahndungstext live zum Durchgeben.
 *  Phase „Lage“     – Gesundheit & Gefährdung, Sorge (Minderjährige), Absuche & Erstmaßnahmen, Ziele/Umfeld,
 *                     Fahrzeuge, Lichtbild & Vorgeschichte.
 *  Phase „Aufnahme“ – Anzeigenerstatter, Meldung, Wohnanschrift, Rufname & Kräfte.
 * Ausgaben: Übersicht (Format des VUF-Assistenten, ohne Telefonnummern), Kurzsachverhalt (indirekte Rede),
 * Fahndungstext (Gefahr zuerst, ohne Diagnosen), offene Punkte (Gefahren → Erstmaßnahmen → Lücken →
 * Plausibilität → Übergabe an die Sachbearbeitung), Personalien gesondert.
 * Alle Ausgaben werten nur sichtbare Antworten aus: wer „Ja“ wieder auf „Nein“ stellt, hinterlässt keine
 * Gefahrenhinweise aus versteckten Folgefragen (prune).
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const str = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  const has = v => str(v) !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const pad = n => String(n).padStart(2, '0');
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const endDot = s => { s = str(s); return !s ? '' : /[.!?:]$/.test(s) ? s : s + '.'; };
  const joinList = (a, w = 'und') => { a = a.filter(Boolean); return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ' + w + ' ' + a[a.length - 1]; };
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const fmtDate = iso => { const m = ISO.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const fmtDM = iso => { const m = ISO.exec(str(iso)); return m ? `${m[3]}.${m[2]}.` : ''; };
  const isoOf = t => { const x = new Date(t); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
  const hmOf = t => { const x = new Date(t); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
  const tsOf = (iso, hm) => { const m = ISO.exec(str(iso)), h = /^(\d{1,2}):(\d{2})/.exec(str(hm)); if (!m) return null; return new Date(+m[1], +m[2] - 1, +m[3], h ? +h[1] : 12, h ? +h[2] : 0).getTime(); };
  /** Freitext für Funk/Übersicht: Zeilenumbrüche → „; “, gekürzt. */
  const clip = (s, n = 160) => { s = String(s == null ? '' : s).replace(/\s*[\r\n]+\s*/g, '; ').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,;]+\S*$/, '') + ' …' : s; };
  const jnu = v => ({ ja: 'ja', nein: 'nein', unbekannt: 'nicht bekannt' }[v] || '');
  const nameOf = p => [str(p && p.vorname), str(p && p.nachname)].filter(Boolean).join(' ');
  const items = (d, k) => arr(get(d, k)).map(x => str(x && typeof x === 'object' ? x.t : x)).filter(Boolean);
  const labelsOf = (opts, vals) => arr(vals).map(v => (opts.find(o => o[0] === v) || [])[1]).filter(Boolean);
  const jahre = n => `${n} ${n === 1 ? 'Jahr' : 'Jahre'}`;

  /* ======================= Auswahllisten ======================= */
  const JN = [['ja', 'Ja'], ['nein', 'Nein']];
  const JNU = [['ja', 'Ja'], ['nein', 'Nein'], ['unbekannt', 'Unbekannt']];
  const opts = a => a.map(x => [x, x]);
  const STATUR = ['zierlich', 'schlank', 'normal', 'athletisch', 'kräftig', 'korpulent'];
  const GLATZE = 'kein Haar / Glatze';
  const HAARFARBE = ['blond', 'dunkelblond', 'braun', 'dunkelbraun', 'schwarz', 'rot', 'grau', 'weiß', 'grau meliert', GLATZE];
  const HAARLAENGE = ['sehr kurz', 'kurz', 'mittellang', 'lang', 'sehr lang'];
  const FORT = [['zu Fuß', 'zu Fuß'], ['mit dem Fahrrad', 'Fahrrad'], ['mit dem Pkw', 'Pkw'], ['mit öffentlichen Verkehrsmitteln', 'Bus / Bahn'], ['unbekannt', 'unbekannt']];
  const ANLASS = [['orient', 'orientierungslos / Demenz'], ['suizid', 'Suizidgefahr'], ['med', 'lebenswichtige Medikamente'], ['hilflos', 'hilflos / körperlich eingeschränkt'], ['witterung', 'nicht witterungsgerecht gekleidet'], ['straftat', 'Hinweis auf Straftat'], ['unfall', 'Hinweis auf Unfall'], ['untypisch', 'völlig untypisches Verhalten'], ['keine', 'keine Gefahr erkennbar']];
  const GEFORTE = [['gewaesser', 'Gewässer'], ['bahn', 'Bahnstrecke'], ['bruecke', 'Brücke / Höhe'], ['autobahn', 'Autobahn / Schnellstraße'], ['wald', 'Wald / Feld']];
  const MERKMALE = [['brille', 'Brille'], ['bart', 'Bart'], ['tattoo', 'Tattoo'], ['narbe', 'Narbe'], ['piercing', 'Piercing'], ['hoergeraet', 'Hörgerät'], ['zahn', 'Zahnprothese / -spange']];
  const HILFE = [['rollator', 'Rollator'], ['rollstuhl', 'Rollstuhl'], ['stock', 'Gehstock'], ['emobil', 'E-Mobil'], ['hund', 'Hund dabei'], ['tasche', 'Rucksack / Tasche']];
  const VERHALTEN = [['orientierungslos', 'orientierungslos'], ['aengstlich', 'ängstlich / flüchtet'], ['aggressiv', 'aggressiv'], ['abwehrend', 'wehrt Hilfe ab'], ['ruhig', 'ruhig / unauffällig']];
  const VORGEHEN = [['betreuen', 'festhalten und betreuen'], ['rtw', 'RTW hinzuziehen'], ['eigensicherung', 'Eigensicherung, nicht allein lassen'], ['melden', 'nicht ansprechen – nur melden'], ['feststellen', 'nur Aufenthalt und Wohlergehen feststellen']];
  const ANRUF = [['klingelt', 'klingelt, nimmt nicht ab'], ['aus', 'aus / Mailbox'], ['nicht', 'noch nicht versucht']];
  const ORTUNG = [['freigabe', 'Standortfreigabe der Familie'], ['app', '„Wo ist?“ / Google'], ['uhr', 'Smartwatch / GPS-Tracker'], ['auto', 'Fahrzeug-App']];
  const ABGESUCHT = [['wohnung', 'Wohnung / Haus'], ['keller', 'Keller / Dachboden'], ['garage', 'Garage / Garten / Nebengebäude'], ['fz', 'Fahrzeuge'], ['nah', 'Nahbereich']];
  const MASSN = [['lst', 'Leitstelle informiert'], ['funk', 'Funkfahndung'], ['kh', 'Krankenhäuser / Gewahrsam abgefragt'], ['ortung', 'Standortermittlung angeregt'], ['hunde', 'Mantrailer / Rettungshunde'], ['luft', 'Hubschrauber / Drohne'], ['jugendamt', 'Jugendamt'], ['bpol', 'Bundespolizei / DB'], ['kk', 'Kriminalwache / KK informiert']];
  const MIT = [['ausweis', 'Ausweis'], ['geld', 'Geldbörse / Bargeld'], ['karte', 'EC-/Kreditkarte'], ['ticket', 'Fahrkarte / Deutschlandticket'], ['gepaeck', 'Gepäck / Rucksack'], ['medis', 'Medikamente']];
  const ZURUECK = [['handy', 'Handy'], ['geld', 'Geldbörse'], ['brille', 'Brille'], ['medis', 'Medikamente'], ['nachricht', 'Abschiedsnachricht / Brief']];
  const HINTERGRUND = [['streit', 'Streit / Konflikt'], ['trennung', 'Trennung'], ['schule', 'Schule / Arbeit'], ['geld', 'Schulden / Geldsorgen'], ['sucht', 'Alkohol / Drogen'], ['gewalt', 'häusliche Gewalt']];
  const SORGE = [['beide', 'beide Eltern'], ['mutter', 'Mutter allein'], ['vater', 'Vater allein'], ['vormund', 'Vormund / Jugendamt'], ['unbekannt', 'unbekannt']];
  const MELDEWEG = [['vorort', 'vor Ort'], ['telefon', 'telefonisch'], ['wache', 'auf der Wache']];
  const GRADE = ['PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'KA', 'KAin', 'PR', 'PRin', 'EPHK', 'EPHKin'];
  const KLEIDUNG = ['Mütze', 'Kapuze', 'Jacke', 'Mantel', 'Kapuzenpulli', 'Pullover', 'T-Shirt', 'Jeans', 'Jogginghose', 'Rock', 'Turnschuhe', 'Stiefel', 'Hausschuhe', 'Schlafanzug'];

  /* ======================= Ableitungen ======================= */
  const vm = d => get(d, 'vm') || {};
  const g = d => vm(d).geschlecht;
  const vmName = d => nameOf(vm(d));
  /** Stichtag ist die Meldung (sonst heute) – nicht die Sichtung. */
  const refIso = d => (ISO.test(str(get(d, 'einsatz.datum'))) ? str(get(d, 'einsatz.datum')) : isoOf(Date.now()));
  function age(geb, at) {
    const m = ISO.exec(str(geb)), r = ISO.exec(str(at)); if (!m || !r) return null;
    let a = +r[1] - +m[1];
    if (+r[2] < +m[2] || (+r[2] === +m[2] && +r[3] < +m[3])) a--;
    return a >= 0 && a < 120 ? a : null;
  }
  const vmAgeGeb = d => age(vm(d).geb, refIso(d));
  const vmAge = d => { const a = vmAgeGeb(d); if (a != null) return a; const n = Number(str(get(d, 'vm.alter')).replace(',', '.')); return has(get(d, 'vm.alter')) && Number.isFinite(n) && n >= 0 && n < 120 ? Math.round(n) : null; };
  const ageEst = d => vmAgeGeb(d) == null && vmAge(d) != null;
  const minor = d => { const a = vmAge(d); return a != null && a < 18; };
  const adult = d => { const a = vmAge(d); return a != null && a >= 18; };
  const anlass = d => arr(get(d, 'gef.anlass'));
  const fort = d => get(d, 'sicht.fort');
  const ER = d => (g(d) === 'm' ? 'Er' : g(d) === 'w' ? 'Sie' : 'Die vermisste Person');
  const er = d => (g(d) === 'm' ? 'er' : g(d) === 'w' ? 'sie' : 'die vermisste Person');
  const meldeTs = d => tsOf(get(d, 'einsatz.datum'), get(d, 'einsatz.zeit'));
  const sichtTs = d => (has(get(d, 'sicht.datum')) && has(get(d, 'sicht.zeit')) ? tsOf(get(d, 'sicht.datum'), get(d, 'sicht.zeit')) : null);
  /** Größe in cm aus Zahl oder Text („1,80“, „ca. 180“, „180 cm“). */
  function groesse(d) {
    const raw = str(get(d, 'aus.groesse')); if (!raw) return null;
    let n = Number(raw.replace(/ca\.?/i, '').replace(/cm/i, '').replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    if (n > 0 && n < 3) n *= 100;
    n = Math.round(n);
    return n >= 40 && n <= 230 ? n : null;
  }
  const hair = d => {
    const f = get(d, 'aus.haarfarbe'), l = get(d, 'aus.haarlaenge');
    if (f === GLATZE) return 'Glatze';
    const a = [has(l) ? l + 'e' : '', has(f) ? f + 'e' : ''].filter(Boolean);
    return a.length ? a.join(', ') + ' Haare' : '';
  };
  /** „heute“ / „gestern“ bezogen auf den Meldetag, sonst Datum. */
  function relDay(iso, d) {
    const r = tsOf(refIso(d), '12:00'), t = tsOf(iso, '12:00'); if (r == null || t == null) return fmtDate(iso);
    const diff = Math.round((r - t) / 864e5);
    return diff === 0 ? 'heute' : diff === 1 ? 'gestern' : 'am ' + fmtDM(iso);
  }
  /** Abgängig seit … (bis zur Meldung, sonst bis jetzt). */
  function seit(d) {
    const s = sichtTs(d); if (s == null) return '';
    const e = meldeTs(d) || Date.now(); const min = Math.round((e - s) / 60000);
    if (min < 0) return '';
    if (min < 60) return `seit ca. ${Math.max(5, Math.round(min / 5) * 5)} Min.`;
    if (min < 48 * 60) return `seit ca. ${Math.round(min / 60)} Std.`;
    return `seit ca. ${Math.round(min / 1440)} Tagen`;
  }
  /** Ort der Sichtung; „an der Wohnanschrift“ wird um die Anschrift ergänzt (für Funk nur die Straße). */
  const sichtOrt = (d, kurzForm) => { const o = str(get(d, 'sicht.ort')); if (!o) return ''; let an = str(get(d, 'vm.anschrift')); if (kurzForm) an = an.split(',')[0].trim(); return /wohnanschrift/i.test(o) && an ? `${o} (${an})` : o; };
  /** Schnellwahl „vor … Std“ – rechnet von der Meldung zurück, auch über Mitternacht. */
  function relPresets(d) {
    const base = meldeTs(d) || Date.now();
    return [30, 60, 120, 180, 360, 720].map(min => {
      const t = base - min * 60000, x = new Date(t), rounded = new Date(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), Math.floor(x.getMinutes() / 5) * 5);
      return [min < 60 ? `vor ${min} Min` : `vor ${min / 60} Std`, { 'sicht.datum': isoOf(rounded), 'sicht.zeit': hmOf(rounded) }, `${relDay(isoOf(rounded), d)} ${hmOf(rounded)}`];
    });
  }

  /* ======================= Fragenkatalog ======================= */
  const STEPS = [
    /* ---------- Phase „Sofort“: alles für die Erstmeldung an die Leitstelle ---------- */
    {
      id: 'kern', phase: 'Sofort', title: 'Wer wird vermisst?', lead: 'Zuerst das, was die Leitstelle sofort braucht. Alles andere lässt sich danach in Ruhe ergänzen.', gen: ['2', '3'],
      fields: [
        { k: 'vm', t: 'person', l: 'Vermisste Person', fields: ['geschlecht', 'nachname', 'vorname', 'geb'] },
        { k: 'vm.alter', t: 'number', l: 'Alter (geschätzt)', h: 'Wenn das Geburtsdatum nicht sofort vorliegt.', q: [6, 10, 14, 16, 25, 40, 60, 75, 80, 85], step: 1, min: 0, max: 110, unit: 'Jahre', when: d => !has(vm(d).geb) },
        { t: 'info', when: d => vmAgeGeb(d) != null, text: d => `Alter am Meldetag: ${jahre(vmAgeGeb(d))}.` },
        { t: 'head', text: 'Gefahr für Leib oder Leben', h: 'begründet die Einstufung als vermisst' },
        { k: 'gef.anlass', t: 'multi', l: 'Was spricht für eine Gefahr? (Mehrfachauswahl)', req: true, o: ANLASS },
        { t: 'info', when: minor, text: 'Minderjährig – eine Gefahr für Leib oder Leben ist grundsätzlich anzunehmen, solange nichts anderes bekannt ist. Leitstelle und DGL sofort informieren.' },
        { t: 'info', when: d => adult(d) && (!anlass(d).length || (anlass(d).length === 1 && anlass(d)[0] === 'keine')), text: 'Volljährige dürfen ihren Aufenthaltsort frei wählen. Als vermisst gilt die Person nur, wenn eine Gefahr für Leib oder Leben anzunehmen ist. Einen festgestellten Aufenthaltsort nur mit ihrer Einwilligung weitergeben.' },
        { k: 'gef.warum', t: 'area', rows: 2, l: 'Warum ist das Verschwinden ungewöhnlich? (optional)', pre: 'Untypisch, weil', ph: 'sie die Wohnung sonst nie allein verlässt' }
      ]
    },
    {
      id: 'sichtung', phase: 'Sofort', title: 'Wann und wo zuletzt?', lead: 'Ausgangspunkt für Suchradius, Nahbereichsfahndung und Mantrailer.', gen: ['4'],
      fields: [
        { t: 'preset', l: 'Zuletzt gesehen …', o: relPresets },
        { k: 'sicht.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', req: true },
        { k: 'sicht.zeit', t: 'time', l: 'Uhrzeit (ca.)', w: 'half', req: true },
        { k: 'sicht.ort', t: 'text', l: 'Wo zuletzt gesehen?', req: true, pre: 'Zuletzt gesehen', ph: 'an der Wohnanschrift', sugg: [['Wohnanschrift', 'an der Wohnanschrift'], ['Einrichtung', 'in der Einrichtung'], ['Schule', 'in der Schule'], ['Arbeitsstelle', 'an der Arbeitsstelle']] },
        { k: 'sicht.durch', t: 'text', l: 'Von wem?', w: 'half', ph: 'z. B. Ehemann, Pflegekraft' },
        { k: 'sicht.art', t: 'choice', l: 'Wie?', o: [['gesehen', 'persönlich gesehen'], ['telefon', 'Telefonat'], ['nachricht', 'Nachricht / online'], ['kamera', 'Kamera']] },
        { t: 'head', text: 'Wohin und wie?' },
        { k: 'sicht.richtung', t: 'text', l: 'Entfernte sich in Richtung', ph: 'z. B. Innenstadt / Bahnhof' },
        { k: 'sicht.fort', t: 'choice', l: 'Fortbewegung', o: FORT },
        { k: 'sicht.fortDetail', t: 'text', l: d => (fort(d) === 'mit dem Fahrrad' ? 'Fahrrad (Art, Farbe)' : 'Linie / Haltestelle / Bahnhof'), when: d => ['mit dem Fahrrad', 'mit öffentlichen Verkehrsmitteln'].includes(fort(d)) },
        { k: 'pkw.beschr', t: 'text', l: 'Pkw (Marke, Modell, Farbe)', ph: 'z. B. VW Golf, schwarz', w: 'half', when: d => fort(d) === 'mit dem Pkw' },
        { k: 'pkw.kz', t: 'text', l: 'Kennzeichen', ph: 'z. B. ST-AB 123', w: 'half', when: d => fort(d) === 'mit dem Pkw' },
        { k: 'sicht.begleitung', t: 'choice', l: 'Allein unterwegs?', o: [['allein', 'allein'], ['begleitet', 'in Begleitung'], ['unbekannt', 'unbekannt']] },
        { k: 'sicht.begleitText', t: 'text', l: 'Mit wem?', when: d => get(d, 'sicht.begleitung') === 'begleitet' },
        { t: 'head', text: 'Handy & Lichtbild', h: 'für Ortung und Fahndung' },
        { k: 'umf.handy', t: 'yn', l: 'Handy dabei?', o: JNU },
        { k: 'umf.handyNr', t: 'text', l: 'Rufnummer (steht nur in den Personalien)', ph: 'z. B. 0151 …', inputmode: 'tel', w: 'half', when: d => get(d, 'umf.handy') === 'ja' },
        { k: 'umf.anruf', t: 'choice', l: 'Anruf / Nachricht', o: ANRUF, when: d => get(d, 'umf.handy') === 'ja' },
        { k: 'umf.ortung', t: 'multi', l: 'Ortung möglich über', o: ORTUNG },
        { k: 'umf.fotos', t: 'yn', l: 'Aktuelles Lichtbild vorhanden?', o: JNU }
      ]
    },
    {
      id: 'aussehen', phase: 'Sofort', title: 'Beschreibung', lead: 'Daraus entsteht die Personenbeschreibung für die Fahndung.', gen: ['5'],
      fields: [
        { t: 'head', text: 'Körper' },
        { k: 'aus.statur', t: 'choice', l: 'Statur', o: opts(STATUR) },
        { k: 'aus.groesse', t: 'number', l: 'Größe', unit: 'cm', step: 5, min: 40, max: 230, q: d => { const a = vmAge(d); return a == null ? [160, 170, 180, 190] : a < 6 ? [90, 100, 110] : a < 12 ? [120, 130, 140, 150] : a < 16 ? [150, 160, 170, 180] : [160, 170, 180, 190]; } },
        { t: 'head', text: 'Haare' },
        { k: 'aus.haarfarbe', t: 'choice', l: 'Haarfarbe', o: opts(HAARFARBE) },
        { k: 'aus.haarlaenge', t: 'choice', l: 'Haarlänge', o: opts(HAARLAENGE), when: d => has(get(d, 'aus.haarfarbe')) && get(d, 'aus.haarfarbe') !== GLATZE },
        { t: 'head', text: 'Bekleidung', h: 'von oben nach unten' },
        { k: 'aus.bekleidung', t: 'area', rows: 2, l: 'Bekleidung', pre: 'Von oben nach unten:', ph: 'graue Mütze, rote Regenjacke, Jeans, weiße Turnschuhe', sugg: KLEIDUNG.map(x => [x, x]), join: ', ' },
        { k: 'aus.witterung', t: 'yn', l: 'Witterungsgerecht gekleidet?', o: JNU },
        { t: 'head', text: 'Besonderheiten' },
        { k: 'aus.merkmale', t: 'multi', l: 'Merkmale', o: MERKMALE },
        { k: 'aus.hilfsmittel', t: 'multi', l: 'Hilfsmittel / dabei', o: HILFE },
        { k: 'aus.auffaellig', t: 'text', l: 'Details (wo, wie)', ph: 'z. B. Tattoo Rose am linken Unterarm, Brille mit Goldrand' }
      ]
    },
    {
      id: 'antreffen', phase: 'Sofort', title: 'Bei Antreffen', lead: 'Was muss die Streife wissen, die die Person findet? Danach steht der Fahndungstext zum Durchgeben bereit.', gen: ['6'],
      fields: [
        { k: 'ansp.rufname', t: 'text', l: 'Reagiert auf (Ruf-/Spitzname, Geburtsname)', ph: 'z. B. „Lotti“', w: 'half' },
        { k: 'ansp.sprache', t: 'text', l: 'Sprache', pre: 'Spricht', ph: 'nur Polnisch', sugg: opts(['Deutsch', 'Englisch', 'Polnisch', 'Russisch', 'Ukrainisch', 'Türkisch', 'Arabisch', 'Rumänisch']), join: ', ' },
        { k: 'ansp.verhalten', t: 'multi', l: 'Verhalten', o: VERHALTEN },
        { k: 'ges.hinweis', t: 'text', l: 'Wichtig für die antreffende Streife', pre: 'Hinweis:', ph: 'Unterzuckerung möglich – wirkt dann betrunken', sugg: [['Unterzuckerung', 'Unterzuckerung möglich – wirkt dann betrunken'], ['Krampfanfälle', 'Krampfanfälle möglich'], ['Medikament fällig', 'braucht dringend Medikamente']] },
        { k: 'gef.waffen', t: 'yn', l: 'Zugang zu Waffen?', o: JNU },
        { k: 'ansp.vorgehen', t: 'multi', l: 'Vorgehen bei Antreffen', o: d => (adult(d) ? VORGEHEN : VORGEHEN.filter(x => x[0] !== 'feststellen')) },
        { t: 'out', fn: 'fahndung', l: 'Fahndungstext für die Leitstelle', h: 'Live aus deinen Antworten – kopieren und durchgeben. Fehlende Angaben stehen in [eckigen Klammern].' }
      ]
    },

    /* ---------- Phase „Lage“: vertiefen, sobald die Fahndung läuft ---------- */
    {
      id: 'gefaehrdung', phase: 'Lage', title: 'Gesundheit & Gefährdung', lead: 'Diagnosen bleiben in Übersicht und Kurzsachverhalt – gefunkt wird nur, was die Streife wissen muss.', gen: ['8'],
      fields: [
        { t: 'head', text: 'Erkrankungen' },
        { k: 'ges.krank', t: 'yn', l: 'Krankheiten bekannt?', o: JNU },
        { k: 'ges.krankWelche', t: 'text', l: 'Welche?', pre: 'Bekannt:', ph: 'Demenz, Diabetes', sugg: opts(['Demenz', 'Diabetes', 'Epilepsie', 'Depression', 'Herzerkrankung', 'Psychose']), join: ', ', when: d => get(d, 'ges.krank') === 'ja' },
        { t: 'head', text: 'Medikamente' },
        { k: 'ges.med', t: 'yn', l: 'Auf Medikamente angewiesen?', o: JNU },
        { k: 'ges.medLeben', t: 'yn', l: 'Lebenswichtig?', o: JNU, when: d => get(d, 'ges.med') === 'ja' },
        { k: 'ges.medWelche', t: 'text', l: 'Welche?', pre: 'Medikamente:', ph: 'Insulin', sugg: opts(['Insulin', 'Blutverdünner', 'Antiepileptika', 'Psychopharmaka', 'Herzmedikamente']), join: ', ', when: d => get(d, 'ges.med') === 'ja' },
        { k: 'ges.medLetzt', t: 'text', l: 'Letzte Einnahme', pre: 'Zuletzt eingenommen:', ph: 'heute ca. 8 Uhr', sugg: [['heute früh', 'heute früh'], ['gestern Abend', 'gestern Abend'], ['nicht eingenommen', 'heute noch nicht']], when: d => get(d, 'ges.med') === 'ja' },
        { k: 'ges.medMit', t: 'yn', l: 'Medikamente dabei?', o: JNU, when: d => get(d, 'ges.med') === 'ja' },
        { t: 'head', text: 'Suizidalität' },
        { k: 'suizid.ja', t: 'yn', l: 'Suizidale Äußerungen oder Ankündigungen?', o: JNU },
        { k: 'suizid.aktuell', t: 'yn', l: 'In den letzten Tagen?', o: JN, w: 'half', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.wann', t: 'text', l: 'Wann zuletzt?', ph: 'z. B. heute Morgen per WhatsApp', w: 'half', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.art', t: 'text', l: 'Was wurde geäußert?', pre: 'Geäußert:', ph: 'will nicht mehr leben', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.ort', t: 'text', l: 'Ort oder Mittel angekündigt?', ph: 'z. B. Brücke über die Aa, Tabletten', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.versuch', t: 'yn', l: 'Frühere Suizidversuche?', o: JNU, when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.abschied', t: 'yn', l: 'Abschiedsnachricht?', o: JNU, when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.behandlung', t: 'yn', l: 'In Behandlung?', o: JNU, when: d => get(d, 'suizid.ja') === 'ja' },
        { t: 'info', when: d => get(d, 'suizid.ja') === 'ja' && get(d, 'suizid.aktuell') === 'ja', text: 'Aktuelle Äußerungen deuten auf eine akute Eigengefährdung hin – Leitstelle unverzüglich informieren, Eigensicherung beachten.' },
        { t: 'head', text: 'Betreuung & Unterbringung', when: d => !minor(d) },
        { k: 'vm.betreuung', t: 'yn', l: 'Rechtliche Betreuung (Aufenthaltsbestimmung)?', o: JNU, when: d => !minor(d) },
        { k: 'vm.unterbringung', t: 'yn', l: 'Aus Klinik oder Unterbringung entwichen?', o: JNU, when: d => !minor(d) },
        { k: 'vm.einrichtung', t: 'text', l: 'Einrichtung / Betreuer (Erreichbarkeit nur in den Personalien)', when: d => !minor(d) && (get(d, 'vm.betreuung') === 'ja' || get(d, 'vm.unterbringung') === 'ja') }
      ]
    },
    {
      id: 'sorge', phase: 'Lage', title: 'Sorge & Verantwortung', lead: 'Wem wird das Kind bzw. die/der Jugendliche bei Antreffen übergeben?', gen: ['10'], when: minor,
      fields: [
        { k: 'mj.sorge', t: 'choice', l: 'Sorgeberechtigt', o: SORGE },
        { k: 'mj.einrichtung', t: 'text', l: 'Einrichtung / Wohngruppe (Erreichbarkeit nur in den Personalien)' },
        { k: 'mj.konflikt', t: 'yn', l: 'Aufenthalt beim anderen Elternteil möglich (Sorgerechtsstreit)?', o: JNU },
        { k: 'mj.entz', t: 'yn', l: 'Hinweise auf Mitnahme durch Dritte?', o: JNU },
        { k: 'umf.social', t: 'text', l: 'Social Media, Freund/in, Schule', ph: 'z. B. Instagram @…, Freundin Lea, 8b Gymnasium' }
      ]
    },
    {
      id: 'suche', phase: 'Lage', title: 'Absuche & Erstmaßnahmen', lead: 'Was ist schon gelaufen? Kinder werden oft im eigenen Haus gefunden, Demenzkranke in Garage oder Keller.', gen: ['12'],
      fields: [
        { k: 'umf.vergleich', t: 'yn', l: 'Geruchsträger für den Mantrailer vorhanden?', o: JNU },
        { t: 'info', when: d => get(d, 'umf.vergleich') === 'ja', text: 'Geruchsträger unberührt lassen und nur verpackt übergeben; den Startpunkt nicht betreten lassen.' },
        { k: 'mn.abgesucht', t: 'multi', l: 'Abgesucht', o: ABGESUCHT },
        { k: 'mn.liste', t: 'multi', l: 'Veranlasst', o: d => (minor(d) ? MASSN : MASSN.filter(x => x[0] !== 'jugendamt')) },
        { k: 'mn.lstZeit', t: 'time', l: 'Leitstelle informiert um', w: 'half', q: 'jetzt', when: d => arr(get(d, 'mn.liste')).includes('lst') },
        { k: 'mn.uebergabe', t: 'text', l: 'Übergabe an die Sachbearbeitung', pre: 'Übergeben an', ph: 'KK 11, KHK Muster, 21:40 Uhr' },
        { k: 'melder.rueck', t: 'yn', l: 'Rückmeldung bei Rückkehr vereinbart?', o: JN }
      ]
    },
    {
      id: 'umfeld', phase: 'Lage', title: 'Ziele, Kontakte, Hintergrund', lead: 'Wo könnte die Person sein – und was hat sie dabei?', gen: ['7', '10'],
      fields: [
        { t: 'head', text: 'Mögliche Ziele' },
        { k: 'umf.orte', t: 'list', l: 'Mögliche Ziele & Aufenthaltsorte', h: 'auch frühere Wohnorte, Arbeitsstelle, Elternhaus, Lieblingsorte', item: 'Ort', add: 'Ort hinzufügen', max: 10, sub: [{ k: 't', t: 'text', l: 'Ort (Stichpunkt)', ph: 'z. B. Grab des Ehemanns, Friedhof Borghorst' }] },
        { k: 'gef.orte', t: 'multi', l: 'Gefahrenorte in der Nähe', o: GEFORTE },
        { k: 'gef.ortWo', t: 'text', l: 'Wo genau?', ph: 'z. B. Aa-Ufer hinter dem Park', when: d => arr(get(d, 'gef.orte')).length > 0 },
        { t: 'head', text: 'Kontakte' },
        { k: 'kontakt.letzt', t: 'text', l: 'Letzter Kontakt', pre: 'Letzter Kontakt:', ph: 'heute 14:10 per WhatsApp an die Tochter' },
        { k: 'umf.freunde', t: 'list', l: 'Anlaufadressen (Freunde, Verwandte)', item: 'Anlaufadresse', add: 'Anlaufadresse hinzufügen', max: 10, sub: [{ k: 't', t: 'text', l: 'Name / Anschrift', ph: 'Name, Straße Nr., Ort (keine Telefonnummern)' }] },
        { t: 'head', text: 'Mitgeführt & zurückgelassen' },
        { k: 'mit.gegenst', t: 'multi', l: 'Dabei', o: MIT },
        { k: 'mit.zurueck', t: 'multi', l: 'Auffällig zurückgelassen', o: ZURUECK },
        { t: 'head', text: 'Hintergrund', h: 'Vertiefung durch die Kripo' },
        { k: 'umf.hintergrund', t: 'multi', l: 'Anlass / Belastungen', o: HINTERGRUND },
        { k: 'umf.hintergrundText', t: 'text', l: 'Kurz zum Hintergrund (optional)', ph: 'z. B. Streit mit dem Partner am Vormittag' }
      ]
    },
    {
      id: 'fahrzeuge', phase: 'Lage', title: 'Fahrzeuge', lead: 'Kann die Person mit einem Fahrzeug unterwegs sein?', gen: ['7'],
      fields: [
        { t: 'head', text: 'Pkw' },
        { k: 'pkw.zugriff', t: 'yn', l: 'Zugriff auf einen Pkw?', o: JNU, when: d => fort(d) !== 'mit dem Pkw' },
        { k: 'pkw.beschr', t: 'text', l: 'Pkw (Marke, Modell, Farbe)', ph: 'z. B. VW Golf, schwarz', w: 'half', when: d => fort(d) !== 'mit dem Pkw' && get(d, 'pkw.zugriff') === 'ja' },
        { k: 'pkw.kz', t: 'text', l: 'Kennzeichen', ph: 'z. B. ST-AB 123', w: 'half', when: d => fort(d) !== 'mit dem Pkw' && get(d, 'pkw.zugriff') === 'ja' },
        { k: 'pkw.vorOrt', t: 'choice', l: 'Wo ist das Fahrzeug?', o: [['ja', 'steht am üblichen Abstellort'], ['nein', 'fehlt'], ['unbekannt', 'unbekannt']], when: d => fort(d) === 'mit dem Pkw' || get(d, 'pkw.zugriff') === 'ja' },
        { t: 'head', text: 'Andere Fahrzeuge', h: 'Motorrad, Fahrrad, Firmenwagen …' },
        { k: 'fz.zugriff', t: 'yn', l: 'Zugriff auf andere Fahrzeuge?', o: JNU },
        { k: 'fz.beschr', t: 'text', l: 'Beschreibung', ph: 'z. B. E-Bike, rot', w: 'half', when: d => get(d, 'fz.zugriff') === 'ja' },
        { k: 'fz.kz', t: 'text', l: 'Kennzeichen', ph: 'falls vorhanden', w: 'half', when: d => get(d, 'fz.zugriff') === 'ja' },
        { k: 'fz.vorOrt', t: 'choice', l: 'Wo ist das Fahrzeug?', o: [['ja', 'steht am üblichen Abstellort'], ['nein', 'fehlt'], ['unbekannt', 'unbekannt']], when: d => get(d, 'fz.zugriff') === 'ja' }
      ]
    },
    {
      id: 'lichtbild', phase: 'Lage', title: 'Lichtbild & Vorgeschichte', lead: 'Lichtbild für die Fahndung, frühere Fälle für die Suche.', gen: ['11'],
      fields: [
        { k: 'umf.fotosTw', t: 'yn', l: 'Lichtbild in Teamwire eingestellt?', o: JN, when: d => get(d, 'umf.fotos') === 'ja' },
        { k: 'umf.fotoAktuell', t: 'choice', l: 'Wie aktuell?', o: [['jung', 'jünger als 1 Jahr'], ['alt', 'älter, Aussehen verändert']], when: d => get(d, 'umf.fotos') === 'ja' },
        { t: 'info', when: d => get(d, 'umf.fotos') !== 'ja', text: 'Kein Lichtbild erfasst – im Schritt „Wann und wo zuletzt?“ angeben oder beschaffen.' },
        { k: 'umf.bereits', t: 'yn', l: 'Schon einmal vermisst?', o: JNU },
        { k: 'umf.bereitsWo', t: 'text', l: 'Wo damals angetroffen?', ph: 'z. B. bei Freunden in …', when: d => get(d, 'umf.bereits') === 'ja' },
        { k: 'umf.bereitsWann', t: 'text', l: 'Wann zuletzt, wie lange?', ph: 'z. B. März 2025, 2 Tage', when: d => get(d, 'umf.bereits') === 'ja' },
        { t: 'info', when: d => get(d, 'umf.bereits') === 'ja', text: 'Frühere Fälle senken die Gefahr nicht – jede Abgängigkeit neu bewerten.' }
      ]
    },

    /* ---------- Phase „Aufnahme“: Anzeigenerstatter und Formales ---------- */
    {
      id: 'meldung', phase: 'Aufnahme', title: 'Anzeigenerstatter & Aufnahme', lead: 'Wer meldet, wann – und wer hat aufgenommen?', gen: ['1'],
      fields: [
        { t: 'head', text: 'Meldung' },
        { k: 'einsatz.datum', t: 'date', l: 'Meldung am', w: 'half', q: 'heute' },
        { k: 'einsatz.zeit', t: 'time', l: 'um', w: 'half', q: 'jetzt' },
        { k: 'einsatz.meldeweg', t: 'choice', l: 'Meldeweg', o: MELDEWEG },
        { k: 'melder', t: 'person', l: 'Anzeigenerstatter/in', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'tel', 'anschrift'] },
        { k: 'melder.rolle', t: 'text', l: 'Verhältnis zur vermissten Person', pre: 'Verhältnis:', ph: 'Tochter', sugg: [['Mutter', 'Mutter'], ['Vater', 'Vater'], ['Ehepartner/in', 'Ehepartner/in'], ['Lebensgefährte/in', 'Lebensgefährte/in'], ['Kind', 'Kind'], ['Betreuer/in', 'Betreuer/in'], ['Einrichtung', 'Einrichtung'], ['Freund/in', 'Freund/in']] },
        { k: 'vm.anschrift', t: 'text', l: 'Wohnanschrift der vermissten Person', ph: 'Straße Nr., PLZ Ort' },
        { t: 'head', text: 'Aufnahme', h: 'Rufname und Kräfte' },
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half', recent: true },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Aufnehmende Beamtinnen und Beamte', grade: GRADE, max: 6 }
      ]
    }
  ];

  /* ======================= Nur sichtbare Antworten auswerten ======================= */
  function del(o, path) { const ks = path.split('.'); let c = o; for (let i = 0; i < ks.length - 1; i++) { if (!c || typeof c !== 'object') return; c = c[ks[i]]; } if (c && typeof c === 'object') delete c[ks[ks.length - 1]]; }
  /** Kopie der Daten ohne Antworten auf ausgeblendete Fragen (zwei Durchgänge für verkettete Bedingungen). */
  function prune(src) {
    const d = JSON.parse(JSON.stringify(src || {}));
    for (let pass = 0; pass < 2; pass++) {
      const keep = new Set(), drop = new Set();
      for (const st of STEPS) {
        const on = !st.when || st.when(d);
        for (const f of st.fields) {
          if (!f.k || f.t === 'out') continue;
          if (f.t === 'person' || f.t === 'list') { if (on) keep.add(f.k); continue; }
          (on && (!f.when || f.when(d)) ? keep : drop).add(f.k);
        }
      }
      for (const k of drop) if (!keep.has(k)) del(d, k);
    }
    return d;
  }

  /* ======================= Gefahren (eine Quelle für alle Ausgaben) ======================= */
  /** Gründe für die Gefahrenannahme – für Kurzsachverhalt und Übersicht (intern, mit Diagnosen). */
  function gruende(d) {
    const o = [], a = vmAge(d), an = anlass(d);
    if (a != null && a < 14) o.push('Kind'); else if (a != null && a < 18) o.push('minderjährig');
    const sz = suizidStufe(d);
    if (sz === 'akut') o.push('akute Suizidgefahr'); else if (sz) o.push('Suizidäußerungen' + (has(get(d, 'suizid.wann')) ? ` (${clip(get(d, 'suizid.wann'), 40)})` : ''));
    if (an.includes('orient') || /demenz|alzheimer/i.test(str(get(d, 'ges.krankWelche')))) o.push('orientierungslos / Demenz');
    if (an.includes('med') || get(d, 'ges.medLeben') === 'ja') o.push('auf lebenswichtige Medikamente angewiesen');
    if (an.includes('hilflos')) o.push('hilflos / körperlich eingeschränkt');
    if (an.includes('witterung') || get(d, 'aus.witterung') === 'nein') o.push('nicht witterungsgerecht gekleidet');
    if (an.includes('straftat') || get(d, 'mj.entz') === 'ja') o.push('Hinweis auf Straftat');
    if (an.includes('unfall')) o.push('Hinweis auf Unfall');
    if (an.includes('untypisch')) o.push('völlig untypisches Verhalten');
    if (get(d, 'vm.unterbringung') === 'ja') o.push('aus Unterbringung entwichen');
    return [...new Set(o)];
  }
  /** Suizid: 'akut' | 'ja' | '' – „früher“ nur bei ausdrücklich nicht aktuell. */
  function suizidStufe(d) {
    const an = anlass(d).includes('suizid'), ja = get(d, 'suizid.ja') === 'ja', akt = get(d, 'suizid.aktuell');
    if ((ja && akt === 'ja') || (an && akt !== 'nein')) return 'akut';
    if (ja || an) return 'ja';
    return '';
  }
  /** Für den Funk: nur einsatzrelevante Stichworte, keine Diagnosen. */
  function eilt(d) {
    const o = [], a = vmAge(d), an = anlass(d), sz = suizidStufe(d);
    if (sz === 'akut') o.push('akute Suizidgefahr'); else if (sz) o.push('Suizidäußerungen');
    if (an.includes('orient') || /demenz|alzheimer/i.test(str(get(d, 'ges.krankWelche')))) o.push('orientierungslos');
    if (an.includes('med') || get(d, 'ges.medLeben') === 'ja') o.push(get(d, 'ges.medMit') === 'nein' ? 'medizinischer Notfall möglich, Medikamente nicht dabei' : 'medizinischer Notfall möglich');
    if (a != null && a < 14) o.push(`Kind, ${jahre(a)}`); else if (a != null && a < 18) o.push('minderjährig');
    if (an.includes('hilflos')) o.push('hilflos');
    if (an.includes('witterung') || get(d, 'aus.witterung') === 'nein') o.push('nicht witterungsgerecht gekleidet');
    if (an.includes('straftat') || get(d, 'mj.entz') === 'ja') o.push('Straftat nicht ausgeschlossen');
    if (an.includes('unfall')) o.push('Unfall möglich');
    if (get(d, 'vm.unterbringung') === 'ja') o.push('aus Unterbringung entwichen');
    return [...new Set(o)];
  }
  const gefahrFragenOffen = d => ['ges.krank', 'ges.med', 'suizid.ja'].filter(k => !has(get(d, k)));
  const alleNein = d => ['ges.krank', 'ges.med', 'suizid.ja'].every(k => get(d, k) === 'nein');

  /* ======================= Übersicht (Format des VUF-Assistenten) ======================= */
  function groups(raw) {
    const d = prune(raw), out = [];
    const group = (n, title, sid, fn) => { const lines = []; fn((label, val) => { if (has(val)) lines.push([label, str(val)]); }); out.push({ n, title, sid, lines }); };
    group('1', 'Meldung / Aufnahme', 'meldung', add => {
      const md = get(d, 'einsatz.datum'), mz = get(d, 'einsatz.zeit'), weg = labelsOf(MELDEWEG, [get(d, 'einsatz.meldeweg')])[0];
      add('Meldung', [md ? fmtDate(md) : '', has(mz) ? mz + ' Uhr' : '', weg || ''].filter(Boolean).join(', '));
      const m = get(d, 'melder') || {};
      const nm = nameOf(m), rolle = str(m.rolle);
      add('Anzeigenerstatter/in', nm ? nm + (rolle ? ` (${rolle})` : '') : rolle ? `[Name] (${rolle})` : '');
      const kr = arr(get(d, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => [c.grad, c.name].filter(Boolean).join(' '));
      add('Aufgenommen durch', [str(get(d, 'einsatz.rufname')), kr.join(', ')].filter(Boolean).join(' · '));
    });
    group('2', 'Vermisste Person', 'kern', add => {
      const p = vm(d), a = vmAge(d);
      add('Name', nameOf(p) || '[Name]');
      add('Geschlecht', { m: 'männlich', w: 'weiblich', d: 'divers' }[p.geschlecht] || '');
      add('Geburtsdatum', p.geb ? fmtDate(p.geb) + (a != null ? ` (${jahre(a)})` : '') : a != null ? `unbekannt (Alter ca. ${jahre(a)})` : '');
      add('Wohnanschrift', p.anschrift);
      add('Reagiert auf', get(d, 'ansp.rufname'));
      add('Spricht', get(d, 'ansp.sprache'));
    });
    group('3', 'Einstufung / Gefahr', 'kern', add => {
      const gr = gruende(d);
      add('Gefahr für Leib oder Leben', gr.length ? 'ja – ' + gr.join(', ') : anlass(d).includes('keine') ? 'nicht erkennbar (Angabe)' : '[Begründung]');
      if (has(get(d, 'gef.warum'))) add('Untypisch, weil', clip(get(d, 'gef.warum'), 300));
      const go = labelsOf(GEFORTE, get(d, 'gef.orte'));
      if (go.length) add('Gefahrenorte', go.join(', ') + (has(get(d, 'gef.ortWo')) ? ' – ' + str(get(d, 'gef.ortWo')) : ''));
      if (get(d, 'gef.waffen')) add('Zugang zu Waffen', jnu(get(d, 'gef.waffen')));
    });
    group('4', 'Letzte Sichtung / Kontakt', 'sichtung', add => {
      const zg = [get(d, 'sicht.datum') ? fmtDate(get(d, 'sicht.datum')) : '', has(get(d, 'sicht.zeit')) ? 'ca. ' + get(d, 'sicht.zeit') + ' Uhr' : ''].filter(Boolean).join(', ');
      add('Zuletzt gesehen', zg || '[Zeitpunkt der letzten Sichtung]');
      add('Ort', sichtOrt(d) || '[Ort der letzten Sichtung]');
      const art = { telefon: 'telefonisch', nachricht: 'per Nachricht / online', kamera: 'auf Kamerabildern' }[get(d, 'sicht.art')] || '';
      add('Gesehen von', [str(get(d, 'sicht.durch')), art].filter(Boolean).join(', '));
      const ri = str(get(d, 'sicht.richtung')), f = fort(d), fd = str(get(d, 'sicht.fortDetail'));
      add('Entfernte sich', [ri ? `Richtung ${ri}` : '', f && f !== 'unbekannt' ? f + (fd ? ` (${fd})` : '') : ''].filter(Boolean).join(', '));
      const b = get(d, 'sicht.begleitung');
      add('Begleitung', b === 'begleitet' ? 'ja' + (has(get(d, 'sicht.begleitText')) ? ' – ' + str(get(d, 'sicht.begleitText')) : '') : b === 'allein' ? 'allein' : b === 'unbekannt' ? 'nicht bekannt' : '');
      add('Letzter Kontakt', get(d, 'kontakt.letzt'));
      add('Abgängig', seit(d).replace(/^seit/, 'seit'));
    });
    group('5', 'Personenbeschreibung', 'aussehen', add => {
      const gr = groesse(d), a = vmAge(d);
      add('Alter', a != null ? (ageEst(d) ? 'ca. ' : '') + jahre(a) : '');
      add('Statur', get(d, 'aus.statur'));
      add('Größe', gr ? `ca. ${gr} cm` : has(get(d, 'aus.groesse')) ? `[${str(get(d, 'aus.groesse'))} – prüfen]` : '');
      add('Haare', hair(d));
      add('Bekleidung', has(get(d, 'aus.bekleidung')) ? clip(get(d, 'aus.bekleidung'), 300) + (get(d, 'aus.witterung') === 'nein' ? ' (nicht witterungsgerecht)' : '') : '');
      add('Merkmale', labelsOf(MERKMALE, get(d, 'aus.merkmale')).join(', '));
      add('Hilfsmittel / dabei', labelsOf(HILFE, get(d, 'aus.hilfsmittel')).join(', '));
      add('Details', clip(get(d, 'aus.auffaellig'), 300));
    });
    group('6', 'Bei Antreffen', 'antreffen', add => {
      add('Verhalten', labelsOf(VERHALTEN, get(d, 'ansp.verhalten')).join(', '));
      add('Hinweis', clip(get(d, 'ges.hinweis'), 200));
      add('Vorgehen', labelsOf(VORGEHEN, get(d, 'ansp.vorgehen')).join(', '));
    });
    group('7', 'Mitgeführt / Fahrzeuge', 'umfeld', add => {
      add('Dabei', labelsOf(MIT, get(d, 'mit.gegenst')).join(', '));
      add('Zurückgelassen', labelsOf(ZURUECK, get(d, 'mit.zurueck')).join(', '));
      for (const [k, lab] of [['pkw', 'Pkw'], ['fz', 'Andere Fahrzeuge']]) {
        const z = k === 'pkw' && fort(d) === 'mit dem Pkw' ? 'ja' : get(d, k + '.zugriff');
        const det = [str(get(d, k + '.beschr')), str(get(d, k + '.kz')).toUpperCase()].filter(Boolean).join(', ');
        const wo = { ja: 'steht am üblichen Abstellort', nein: 'fehlt', unbekannt: 'Verbleib unbekannt' }[get(d, k + '.vorOrt')] || '';
        if (z === 'ja') add(lab, 'ja' + (det ? ' – ' + det : '') + (wo ? ` (${wo})` : '')); else if (z) add(lab, jnu(z));
      }
    });
    group('8', 'Gesundheit', 'gefaehrdung', add => {
      const kr = get(d, 'ges.krank');
      if (kr === 'ja') add('Krankheiten', 'ja' + (has(get(d, 'ges.krankWelche')) ? ' – ' + str(get(d, 'ges.krankWelche')) : '')); else if (kr) add('Krankheiten', jnu(kr));
      const md = get(d, 'ges.med');
      if (md === 'ja') {
        const det = [];
        if (get(d, 'ges.medLeben')) det.push(get(d, 'ges.medLeben') === 'ja' ? 'lebenswichtig' : get(d, 'ges.medLeben') === 'nein' ? 'nicht lebenswichtig' : 'lebenswichtig: nicht bekannt');
        if (has(get(d, 'ges.medWelche'))) det.push(str(get(d, 'ges.medWelche')));
        if (has(get(d, 'ges.medLetzt'))) det.push('zuletzt eingenommen: ' + str(get(d, 'ges.medLetzt')));
        if (get(d, 'ges.medMit')) det.push('dabei: ' + jnu(get(d, 'ges.medMit')));
        add('Medikamente', 'ja' + (det.length ? ' – ' + det.join('; ') : ''));
      } else if (md) add('Medikamente', jnu(md));
      const su = get(d, 'suizid.ja');
      if (su === 'ja') {
        const det = [];
        if (get(d, 'suizid.aktuell')) det.push(get(d, 'suizid.aktuell') === 'ja' ? 'aktuell' : 'nicht aktuell');
        if (has(get(d, 'suizid.wann'))) det.push('zuletzt: ' + str(get(d, 'suizid.wann')));
        if (has(get(d, 'suizid.art'))) det.push('Äußerung: ' + clip(get(d, 'suizid.art'), 120));
        if (has(get(d, 'suizid.ort'))) det.push('angekündigt: ' + str(get(d, 'suizid.ort')));
        if (get(d, 'suizid.versuch')) det.push('frühere Versuche: ' + jnu(get(d, 'suizid.versuch')));
        if (get(d, 'suizid.abschied')) det.push('Abschiedsnachricht: ' + jnu(get(d, 'suizid.abschied')));
        if (get(d, 'suizid.behandlung')) det.push('in Behandlung: ' + jnu(get(d, 'suizid.behandlung')));
        add('Suizidale Äußerungen', 'ja' + (det.length ? ' – ' + det.join('; ') : ''));
      } else if (su) add('Suizidale Äußerungen', jnu(su));
      if (get(d, 'vm.betreuung')) add('Rechtliche Betreuung', jnu(get(d, 'vm.betreuung')));
      if (get(d, 'vm.unterbringung')) add('Aus Unterbringung entwichen', jnu(get(d, 'vm.unterbringung')));
      add('Einrichtung / Betreuer', get(d, 'vm.einrichtung'));
    });
    group('9', 'Handy / Ortung', 'sichtung', add => {
      const h = get(d, 'umf.handy');
      if (h === 'ja') add('Handy', 'ja' + (has(get(d, 'umf.handyNr')) ? ' (Nummer siehe Personalien)' : '') + (get(d, 'umf.anruf') ? ' – ' + labelsOf(ANRUF, [get(d, 'umf.anruf')])[0] : '')); else if (h) add('Handy', jnu(h));
      add('Ortung möglich über', labelsOf(ORTUNG, get(d, 'umf.ortung')).join(', '));
    });
    group('10', 'Umfeld / Ziele', 'umfeld', add => {
      const orte = items(d, 'umf.orte'), fr = items(d, 'umf.freunde');
      if (orte.length) add('Mögliche Ziele', orte.join('; '));
      if (fr.length) add('Anlaufadressen', fr.join('; '));
      const hg = labelsOf(HINTERGRUND, get(d, 'umf.hintergrund'));
      add('Hintergrund', [hg.join(', '), clip(get(d, 'umf.hintergrundText'), 200)].filter(Boolean).join(' – '));
      add('Sorgeberechtigt', labelsOf(SORGE, [get(d, 'mj.sorge')])[0] || '');
      add('Einrichtung', get(d, 'mj.einrichtung'));
      if (get(d, 'mj.konflikt')) add('Aufenthalt beim anderen Elternteil möglich', jnu(get(d, 'mj.konflikt')));
      if (get(d, 'mj.entz')) add('Hinweise auf Mitnahme durch Dritte', jnu(get(d, 'mj.entz')));
      add('Social Media / Schule', get(d, 'umf.social'));
    });
    group('11', 'Lichtbild / Vergleichsmaterial', 'lichtbild', add => {
      const f = get(d, 'umf.fotos');
      if (f === 'ja') add('Lichtbild', 'vorhanden – ' + (get(d, 'umf.fotosTw') === 'ja' ? 'in Teamwire eingestellt' : 'noch nicht in Teamwire') + (get(d, 'umf.fotoAktuell') === 'alt' ? ', älter (Aussehen verändert)' : get(d, 'umf.fotoAktuell') === 'jung' ? ', jünger als 1 Jahr' : ''));
      else if (f) add('Lichtbild', jnu(f));
      const b = get(d, 'umf.bereits');
      if (b === 'ja') add('Bereits vermisst gewesen', 'ja' + [has(get(d, 'umf.bereitsWann')) ? ' – ' + str(get(d, 'umf.bereitsWann')) : '', has(get(d, 'umf.bereitsWo')) ? '; angetroffen: ' + str(get(d, 'umf.bereitsWo')) : ''].join(''));
      else if (b) add('Bereits vermisst gewesen', jnu(b));
      if (get(d, 'umf.vergleich')) add('Geruchsträger (Mantrailer)', jnu(get(d, 'umf.vergleich')));
    });
    group('12', 'Erstmaßnahmen', 'suche', add => {
      add('Abgesucht', labelsOf(ABGESUCHT, get(d, 'mn.abgesucht')).join(', '));
      add('Veranlasst', labelsOf(MASSN, get(d, 'mn.liste')).join(', ') + (has(get(d, 'mn.lstZeit')) ? ` (Leitstelle ${get(d, 'mn.lstZeit')} Uhr)` : ''));
      add('Übergabe', get(d, 'mn.uebergabe'));
      if (get(d, 'melder.rueck')) add('Rückmeldung bei Rückkehr vereinbart', jnu(get(d, 'melder.rueck')));
    });
    return out;
  }
  /** Abschnitte für die Ergebnisansicht: [Nr, Titel, Text, Schritt]. */
  function text(d) {
    return groups(d).map(x => [x.n, x.title, x.lines.length ? x.lines.map(([l, v]) => `– ${l}: ${v}`).join('\n') : '– nichts erfasst –', x.sid]);
  }
  /** Zum Kopieren – im Format des VUF-Assistenten, ohne Telefonnummern. */
  function plain(raw) {
    const body = groups(raw).filter(x => x.lines.length).map(x => x.title.toUpperCase() + '\n' + x.lines.map(([l, v]) => '   -  ' + l + ': ' + v).join('\n')).join('\n\n');
    return 'Vermisste Person' + (vmName(raw) ? ' – ' + vmName(raw) : '') + '\n\n' + body + stand(raw);
  }
  /** Prüfbarkeit: Stand und Aufnehmende am Ende jeder längeren Ausgabe. */
  function stand(d) {
    const kr = arr(get(d, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => [c.grad, c.name].filter(Boolean).join(' '));
    const bits = [has(get(d, 'einsatz.datum')) ? fmtDate(get(d, 'einsatz.datum')) + (has(get(d, 'einsatz.zeit')) ? ' ' + get(d, 'einsatz.zeit') + ' Uhr' : '') : '', str(get(d, 'einsatz.rufname')), kr.join(', ')].filter(Boolean);
    return bits.length ? `\n\nStand: ${bits.join(' · ')}` : '';
  }
  function preview(stepId, d) {
    const st = STEPS.find(s => s.id === stepId); if (!st) return '';
    const ids = arr(st.gen);
    return text(d).filter(s => ids.includes(s[0])).map(s => `${s[0]} ${s[1]}\n${s[2]}`).join('\n\n');
  }

  /* ======================= Kurzsachverhalt (indirekte Rede) ======================= */
  function kurz(raw) {
    const d = prune(raw), m = get(d, 'melder') || {}, p = vm(d), a = vmAge(d);
    const md = get(d, 'einsatz.datum'), mz = get(d, 'einsatz.zeit');
    const rolle = str(m.rolle), weg = { vorort: 'vor Ort', telefon: 'telefonisch', wache: 'auf der Wache' }[get(d, 'einsatz.meldeweg')] || '';
    const wer = (nameOf(m) || '[Name]') + (rolle ? ` (${rolle})` : '');
    const appo = [p.geb ? `geb. ${fmtDate(p.geb)}${a != null ? ` (${jahre(a)})` : ''}` : a != null ? `ca. ${jahre(a)} alt` : '', has(p.anschrift) ? `wohnhaft ${str(p.anschrift)}` : ''].filter(Boolean);
    const s = [];
    s.push(`Am ${md ? fmtDate(md) : '[Datum]'}${has(mz) ? ` um ${mz} Uhr` : ''} meldete ${wer}${weg ? ' ' + weg : ''} ${nameOf(p) || '[vermisste Person]'}${appo.length ? ', ' + appo.join(', ') + ',' : ''} als vermisst.`);
    const nach = m.geschlecht === 'w' ? 'Nach ihren Angaben' : m.geschlecht === 'm' ? 'Nach seinen Angaben' : 'Nach Angaben der anzeigenden Person';
    const sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit'), wann = `am ${sd ? fmtDate(sd) : '[Datum]'}${has(sz) ? ` gegen ${sz} Uhr` : ''}`;
    const ort = sichtOrt(d), durch = str(get(d, 'sicht.durch')), art = get(d, 'sicht.art');
    const f = fort(d), ri = str(get(d, 'sicht.richtung')), fd = str(get(d, 'sicht.fortDetail'));
    const weg2 = [f && f !== 'unbekannt' ? f + (fd ? ` (${fd})` : '') : '', ri && !/^unbekannt$/i.test(ri) ? `in Richtung ${ri}` : ''].filter(Boolean).join(' ');
    let s2;
    if (art === 'telefon' || art === 'nachricht') s2 = `${nach} habe der letzte ${art === 'telefon' ? 'telefonische ' : ''}Kontakt ${wann}${art === 'nachricht' ? ' per Nachricht' : ''} bestanden${durch ? ` (mit: ${durch})` : ''}${ort ? `; ${er(d)} habe sich zu dieser Zeit ${ort} aufgehalten` : ''}`;
    else s2 = `${nach} sei ${er(d)} zuletzt ${wann} ${ort || '[Ort]'} gesehen worden${durch ? ` (von: ${durch})` : ''}${weg2 ? ` und habe sich ${weg2} entfernt` : ''}`;
    s.push(s2 + '.');
    if (get(d, 'sicht.begleitung') === 'begleitet') s.push(`${ER(d)} sei in Begleitung${has(get(d, 'sicht.begleitText')) ? ` (${str(get(d, 'sicht.begleitText'))})` : ''} unterwegs gewesen.`);
    const fz = [];
    if (fort(d) === 'mit dem Pkw' || get(d, 'pkw.zugriff') === 'ja') fz.push([str(get(d, 'pkw.beschr')) || 'ein Pkw', has(get(d, 'pkw.kz')) ? 'amtl. Kennzeichen ' + str(get(d, 'pkw.kz')).toUpperCase() : ''].filter(Boolean).join(', ') + ({ ja: ' (steht am üblichen Abstellort)', nein: ' (fehlt)', unbekannt: ' (Verbleib unbekannt)' }[get(d, 'pkw.vorOrt')] || ''));
    if (get(d, 'fz.zugriff') === 'ja') fz.push([str(get(d, 'fz.beschr')) || 'ein weiteres Fahrzeug', has(get(d, 'fz.kz')) ? 'Kennzeichen ' + str(get(d, 'fz.kz')).toUpperCase() : ''].filter(Boolean).join(', ') + ({ ja: ' (steht am üblichen Abstellort)', nein: ' (fehlt)', unbekannt: ' (Verbleib unbekannt)' }[get(d, 'fz.vorOrt')] || ''));
    if (fz.length) s.push(`${ER(d)} habe Zugriff auf ${fz.join('; ')}.`);
    const gr = gruende(d);
    if (has(get(d, 'ges.krankWelche'))) gr.push('Erkrankung: ' + str(get(d, 'ges.krankWelche')));
    if (gr.length) s.push(`Eine Gefahr für Leib oder Leben wird angenommen (${[...new Set(gr)].join('; ')}).`);
    else if (alleNein(d) || anlass(d).includes('keine')) s.push('Anhaltspunkte für eine Gefahr für Leib oder Leben ergaben sich bislang nicht.');
    else s.push('Gefahrenbewertung: [noch offen].');
    const ab = labelsOf(ABGESUCHT, get(d, 'mn.abgesucht')), ma = labelsOf(MASSN, get(d, 'mn.liste'));
    if (ab.length) s.push(`Abgesucht wurden: ${ab.join(', ')}.`);
    if (ma.length) s.push(`Veranlasst: ${ma.join(', ')}.`);
    if (has(get(d, 'mn.uebergabe'))) s.push(`Übergeben an ${endDot(get(d, 'mn.uebergabe'))}`);
    return s.join(' ');
  }

  /* ======================= Fahndung (Gefahr zuerst, funkfähig, ohne Diagnosen) ======================= */
  function fahndung(raw) {
    const d = prune(raw), p = vm(d), a = vmAge(d);
    const L = [];
    const ei = eilt(d);
    L.push('VERMISSTENFAHNDUNG' + (ei.length ? ' – EILT: ' + ei.slice(0, 4).join(', ') : '') + '.');
    for (const k of ['pkw', 'fz']) {
      const mit = (k === 'pkw' && fort(d) === 'mit dem Pkw') || (get(d, k + '.zugriff') === 'ja' && get(d, k + '.vorOrt') !== 'ja');
      if (!mit) continue;
      const det = [has(get(d, k + '.kz')) && !/unbekannt|\?/.test(str(get(d, k + '.kz'))) ? str(get(d, k + '.kz')).toUpperCase() : '', str(get(d, k + '.beschr'))].filter(Boolean).join(', ');
      const sicher = (k === 'pkw' && fort(d) === 'mit dem Pkw') || get(d, k + '.vorOrt') === 'nein';
      L.push(`${sicher ? 'Unterwegs mit' : 'Möglicherweise unterwegs mit'}: ${k === 'pkw' ? 'Pkw' : 'Fahrzeug'}${det ? ' ' + det : ' [Beschreibung, Kennzeichen]'}.`);
    }
    const gr = groesse(d);
    const sig = [{ m: 'männlich', w: 'weiblich', d: 'divers' }[p.geschlecht] || '', a != null ? `${ageEst(d) ? 'ca. ' : ''}${a} J.` : '[Alter]', gr ? `ca. ${gr} cm` : '', get(d, 'aus.statur') || '', hair(d), labelsOf(MERKMALE, get(d, 'aus.merkmale')).filter(x => !/Zahn/.test(x)).join(', ')].filter(Boolean);
    L.push(`${nameOf(p) || '[Name]'}, ${sig.join(', ')}.`);
    if (has(get(d, 'aus.bekleidung'))) L.push(endDot(`Bekleidung: ${clip(get(d, 'aus.bekleidung'), 160).replace(/[.;,\s]+$/, '')}${get(d, 'aus.witterung') === 'nein' && !ei.includes('nicht witterungsgerecht gekleidet') ? ' (nicht witterungsgerecht)' : ''}`));
    else L.push('Bekleidung: [Beschreibung].');
    const bes = [labelsOf(HILFE, get(d, 'aus.hilfsmittel')).join(', '), clip(get(d, 'aus.auffaellig'), 100)].filter(Boolean);
    if (bes.length) L.push(`Besonderheiten: ${bes.join('; ')}.`);
    const sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit'), f = fort(d), ri = str(get(d, 'sicht.richtung'));
    const zl = [sd ? relDay(sd, d) + (has(sz) ? ' ' + sz : '') : '[Zeit]', sichtOrt(d, true) || '[Ort]', ri && !/^unbekannt$/i.test(ri) ? 'Richtung ' + ri : '', f && f !== 'unbekannt' ? f.replace(/^mit dem /, 'mit ').replace('mit öffentlichen Verkehrsmitteln', 'mit Bus/Bahn') + (has(get(d, 'sicht.fortDetail')) ? ` (${clip(get(d, 'sicht.fortDetail'), 40)})` : '') : '', get(d, 'sicht.begleitung') === 'begleitet' ? 'in Begleitung' : ''].filter(Boolean);
    L.push(endDot(`Zuletzt: ${zl.join(', ')}${seit(d) ? '; ' + seit(d) : ''}`));
    const ziele = [...items(d, 'umf.orte').slice(0, 3), has(get(d, 'suizid.ort')) ? str(get(d, 'suizid.ort')) + ' (angekündigt)' : '', has(get(d, 'umf.bereitsWo')) ? str(get(d, 'umf.bereitsWo')) + ' (früherer Antreffort)' : ''].filter(Boolean).map(x => clip(x, 60));
    const go = labelsOf(GEFORTE, get(d, 'gef.orte'));
    const zg = [ziele.length ? 'Mögliche Ziele: ' + ziele.join('; ') : '', go.length ? 'Gefahrenorte: ' + go.join(', ') + (has(get(d, 'gef.ortWo')) ? ` (${clip(get(d, 'gef.ortWo'), 60)})` : '') : ''].filter(Boolean);
    if (zg.length) L.push(zg.join('. ') + '.');
    const an = [];
    if (has(get(d, 'ansp.rufname'))) an.push(`reagiert auf ${clip(get(d, 'ansp.rufname'), 40)}`);
    if (has(get(d, 'ansp.sprache'))) an.push(`spricht ${clip(get(d, 'ansp.sprache'), 40)}`);
    const vh = labelsOf(VERHALTEN, get(d, 'ansp.verhalten')).filter(x => !/unauffällig/.test(x) && !(x === 'orientierungslos' && ei.includes('orientierungslos'))); if (vh.length) an.push(vh.join(', '));
    if (has(get(d, 'ges.hinweis'))) an.push(clip(get(d, 'ges.hinweis'), 90));
    if (get(d, 'gef.waffen') === 'ja') an.push('Zugang zu Waffen – Eigensicherung');
    const vg = labelsOf(VORGEHEN, get(d, 'ansp.vorgehen')); if (vg.length) an.push(vg.join(', '));
    L.push(`Bei Antreffen: ${an.length ? an.join('; ') + '; ' : ''}Leitstelle verständigen.`);
    if (get(d, 'umf.fotos') === 'ja' && get(d, 'umf.fotosTw') === 'ja') L.push('Lichtbild in Teamwire.');
    return L.join('\n');
  }

  /* ======================= Offene Punkte: Gefahr → Maßnahmen → Lücken → Plausibilität → Übergabe ======================= */
  function offen(raw) {
    const d = prune(raw), o = [], m = get(d, 'melder') || {}, p = vm(d), a = vmAge(d), ml = arr(get(d, 'mn.liste')), ab = arr(get(d, 'mn.abgesucht'));
    // 1. Gefahr und Dringlichkeit (neutral formuliert – landen ggf. als To-do im Planner)
    const sz = suizidStufe(d);
    if (sz === 'akut') o.push('Akute Suizidgefahr: Leitstelle sofort informieren, Eigensicherung beachten.');
    if (get(d, 'suizid.ja') === 'ja' && !get(d, 'suizid.aktuell')) o.push('Suizidäußerungen: Zeitpunkt und Aktualität klären.');
    if (anlass(d).includes('suizid') && !has(get(d, 'suizid.ja'))) o.push('Suizidgefahr angegeben: Einzelheiten (Äußerungen, Ort, Mittel) erheben.');
    if (get(d, 'gef.waffen') === 'ja') o.push('Zugang zu Waffen: Eigensicherung; Verbleib der Waffen klären.');
    if (anlass(d).includes('med') || get(d, 'ges.medLeben') === 'ja') o.push(`Lebenswichtige Medikamente: Dringlichkeit berücksichtigen${has(get(d, 'ges.medLetzt')) ? '' : '; letzte Einnahme klären'}.`);
    if (a != null && a < 18) o.push(`Minderjährig: Gefahr für Leib oder Leben anzunehmen – Leitstelle/DGL sofort informieren; Sorgeberechtigte feststellen${has(get(d, 'mj.einrichtung')) || get(d, 'mj.sorge') === 'vormund' ? '; Jugendamt informieren' : ''}.`);
    if (get(d, 'mj.konflikt') === 'ja' || get(d, 'mj.entz') === 'ja') o.push('Mögliche Entziehung Minderjähriger (§ 235 StGB): Kriminalwache/KK einbinden.');
    if (adult(d) && !gruende(d).length) o.push('Volljährig, keine Gefahr für Leib oder Leben dokumentiert – Vermisstenkriterium prüfen und begründen.');
    const go = arr(get(d, 'gef.orte'));
    if (go.includes('bahn')) o.push('Bahnstrecke in der Nähe: Bundespolizei/DB über die Leitstelle informieren.');
    if (go.includes('gewaesser')) o.push('Gewässer in der Nähe: Absuche (Feuerwehr/DLRG, Drohne) über die Leitstelle prüfen.');
    // 2. Erstmaßnahmen, die noch nicht dokumentiert sind
    if (!ml.includes('lst')) o.push('Leitstelle informieren und Fahndungstext durchgeben.');
    if (!ab.includes('wohnung')) o.push('Wohnung bzw. Haus absuchen, auch Keller, Dachboden, Garage und Fahrzeuge.');
    else if (!ab.includes('keller') || !ab.includes('garage')) o.push('Absuche ergänzen: Keller/Dachboden, Garage, Garten und Nebengebäude.');
    if (!ab.includes('nah')) o.push('Nahbereich absuchen.');
    if (!ml.includes('kh')) o.push('Krankenhäuser und Gewahrsam abfragen.');
    if ((get(d, 'umf.handy') === 'ja' || arr(get(d, 'umf.ortung')).length) && !ml.includes('ortung')) o.push('Standortermittlung über Leitstelle/KK anregen; vorhandene Standortfreigaben der Angehörigen sofort nutzen.');
    if (get(d, 'umf.vergleich') === 'ja') o.push('Geruchsträger für den Mantrailer unberührt sichern; Startpunkt nicht betreten lassen.');
    if (get(d, 'umf.fotos') === 'ja' && get(d, 'umf.fotosTw') !== 'ja') o.push('Lichtbild in Teamwire einstellen.');
    else if (get(d, 'umf.fotos') === 'nein') o.push('Lichtbild beschaffen (Angehörige, Social Media, Ausweis).');
    if (get(d, 'melder.rueck') !== 'ja') o.push('Rückmeldung bei Rückkehr mit der anzeigenden Person vereinbaren.');
    // 3. Lücken
    const fehlt = [];
    if (!has(p.geschlecht)) fehlt.push('Geschlecht');
    if (!has(p.nachname) && !has(p.vorname)) fehlt.push('Name');
    if (a == null) fehlt.push('Geburtsdatum bzw. Alter');
    if (!has(get(d, 'sicht.datum')) || !has(get(d, 'sicht.zeit'))) fehlt.push('Zeitpunkt der letzten Sichtung');
    if (!has(get(d, 'sicht.ort'))) fehlt.push('Ort der letzten Sichtung');
    if (fehlt.length) o.push(`Für die Fahndung fehlt: ${joinList(fehlt)}.`);
    const besch = [['aus.groesse', 'Größe'], ['aus.statur', 'Statur'], ['aus.haarfarbe', 'Haare'], ['aus.bekleidung', 'Bekleidung']].filter(([k]) => !has(get(d, k))).map(x => x[1]);
    if (besch.length) o.push(`Personenbeschreibung vervollständigen: ${joinList(besch)}.`);
    const gf = gefahrFragenOffen(d).map(k => ({ 'ges.krank': 'Krankheiten', 'ges.med': 'Medikamente', 'suizid.ja': 'Suizidalität' }[k]));
    if (gf.length) o.push(`Gefahrenfragen offen (${joinList(gf)}) – Einstufung sonst nicht belastbar.`);
    const unb = [['ges.krank', 'Krankheiten'], ['ges.med', 'Medikamente'], ['suizid.ja', 'Suizidalität'], ['ges.medLeben', 'ob Medikamente lebenswichtig sind']].filter(([k]) => get(d, k) === 'unbekannt').map(x => x[1]);
    if (unb.length) o.push(`Nicht bekannt: ${joinList(unb)} – bei Angehörigen oder Hausarzt nachfragen.`);
    if (get(d, 'ges.med') === 'ja' && !get(d, 'ges.medLeben')) o.push('Klären, ob die Medikamente lebenswichtig sind.');
    if (!has(nameOf(m))) o.push('Name der anzeigenden Person erheben.');
    if (!has(m.tel)) o.push('Erreichbarkeit der anzeigenden Person erheben.');
    if (!has(get(d, 'umf.handy'))) o.push('Klären, ob ein Handy mitgeführt wird.');
    if (get(d, 'umf.handy') === 'ja' && !has(get(d, 'umf.handyNr'))) o.push('Rufnummer des mitgeführten Handys erheben.');
    if (!has(get(d, 'umf.fotos'))) o.push('Klären, ob ein aktuelles Lichtbild vorliegt.');
    for (const [k, lab] of [['pkw', 'Pkw'], ['fz', 'weiteren Fahrzeugs']]) {
      const z = k === 'pkw' && fort(d) === 'mit dem Pkw' ? 'ja' : get(d, k + '.zugriff');
      if (z !== 'ja') continue;
      const kz = str(get(d, k + '.kz'));
      if (!kz || /unbekannt|\?/i.test(kz)) o.push(`Kennzeichen des ${lab} erheben.`);
      if (!get(d, k + '.vorOrt')) o.push(`Klären, ob das Fahrzeug (${k === 'pkw' ? 'Pkw' : 'weiteres Fahrzeug'}) am üblichen Abstellort steht.`);
      else if (get(d, k + '.vorOrt') !== 'ja') o.push(`${k === 'pkw' ? 'Pkw' : 'Fahrzeug'} fehlt bzw. Verbleib unbekannt – in die Fahndung einbeziehen (Sachfahndung).`);
    }
    if (get(d, 'umf.bereits') === 'ja' && !has(get(d, 'umf.bereitsWo'))) o.push('Früheren Antreffort erfragen.');
    if (get(d, 'umf.bereits') === 'ja' && has(get(d, 'umf.bereitsWo'))) o.push(`Früheren Antreffort prüfen: ${clip(get(d, 'umf.bereitsWo'), 80)}.`);
    const orte = items(d, 'umf.orte'), fr = items(d, 'umf.freunde');
    if (orte.length || fr.length) o.push(`Mögliche Ziele und Anlaufadressen abklären (${orte.length + fr.length}).`);
    // 4. Plausibilität
    const ref = refIso(d);
    if (has(p.geb) && (str(p.geb) > ref || (vmAgeGeb(d) != null && vmAgeGeb(d) > 110))) o.push('Prüfen: Geburtsdatum liegt nach dem Meldetag oder ist unplausibel.');
    const st = sichtTs(d), mt = meldeTs(d);
    if (st != null && mt != null && st > mt + 5 * 60000) o.push('Prüfen: letzte Sichtung liegt nach der Meldung.');
    if (fort(d) === 'mit dem Pkw' && get(d, 'pkw.vorOrt') === 'ja') o.push('Prüfen: Fortbewegung „Pkw“, aber der Pkw steht am üblichen Abstellort – mit welchem Fahrzeug unterwegs?');
    if (anlass(d).includes('keine') && (anlass(d).length > 1 || suizidStufe(d) || get(d, 'ges.medLeben') === 'ja')) o.push('Prüfen: „keine Gefahr erkennbar“ widerspricht anderen Angaben.');
    if (has(get(d, 'aus.groesse')) && groesse(d) == null) o.push('Prüfen: Größe in cm angeben (40–230).');
    else if (groesse(d) != null && a != null && a >= 14 && groesse(d) < 120) o.push('Prüfen: Größe passt nicht zum Alter.');
    if (fahndung(raw).length > 800) o.push('Fahndungstext ist lang – Freitexte kürzen, damit er funkfähig bleibt.');
    // 5. Übergabe an die Sachbearbeitung
    o.push('Übergabe an die Sachbearbeitung (KK) vorbereiten: Ausschreibung und Löschung bei Rückkehr, Konto-/Kartenbewegungen, Social Media, Haus-/Zahnarzt, Vergleichsmaterial nach Rücksprache.');
    return o;
  }

  /* ======================= Personalien (gesondert) ======================= */
  function personalien(raw) {
    const d = prune(raw), m = get(d, 'melder') || {}, p = vm(d), rows = [];
    const line = (l, v) => { if (has(v)) rows.push(`${l}: ${str(v)}`); };
    rows.push('Vermisste Person');
    line('Name', nameOf(p)); line('Geburtsdatum', p.geb ? fmtDate(p.geb) : ''); line('Anschrift', p.anschrift);
    if (get(d, 'umf.handy') === 'ja') line('Mobiltelefon', get(d, 'umf.handyNr'));
    rows.push('', 'Anzeigenerstatter/in');
    line('Name', nameOf(m)); line('Verhältnis', m.rolle); line('Geburtsdatum', m.geb ? fmtDate(m.geb) : ''); line('Anschrift', m.anschrift); line('Erreichbarkeit', m.tel);
    const weitere = [['Zuletzt gesehen von', get(d, 'sicht.durch')], ['Einrichtung / Betreuer', get(d, 'vm.einrichtung')], ['Einrichtung / Wohngruppe', get(d, 'mj.einrichtung')]].filter(x => has(x[1]));
    if (weitere.length) { rows.push('', 'Weitere Beteiligte'); for (const [l, v] of weitere) line(l, v); }
    return rows.join('\n');
  }

  /* ======================= Liste ======================= */
  function title(raw) {
    const d = prune(raw), dat = get(d, 'sicht.datum') || get(d, 'einsatz.datum');
    return ['Vermisst', vmName(d), dat ? fmtDate(dat) : ''].filter(Boolean).join(' · ');
  }
  /** Untertitel ohne Diagnosen – nur „Gefahrenhinweis“. */
  function subtitle(raw) {
    const d = prune(raw), sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit'), mz = get(d, 'einsatz.zeit');
    const z = sd || sz ? 'zuletzt gesehen ' + [sd ? fmtDate(sd).slice(0, 6) : '', sz || ''].filter(Boolean).join(' ') : '';
    return [z || (mz ? `gemeldet ${mz} Uhr` : ''), eilt(d).length ? 'Gefahrenhinweis' : ''].filter(Boolean).join(' · ');
  }
  const gefahren = raw => eilt(prune(raw));

  root.WVermisst = Object.freeze({
    id: 'vermisst', name: 'Vermisste Person', short: 'Vermisst', kurz: 'VM',
    desc: 'Sofort: Fahndungstext in vier Schritten · danach Lage, Erstmaßnahmen, Übersicht, Kurzsachverhalt, offene Punkte',
    labels: {
      bericht: 'Übersicht',
      kurzHint: 'Kurzsachverhalt für den Vorgang und die Übergabe – Angaben der anzeigenden Person in indirekter Rede.',
      fahndungHint: 'Für Leitstelle und Funk: Gefahr zuerst, ohne Diagnosen. Fehlende Angaben stehen in [eckigen Klammern].',
      offenEmpty: 'Alle Angaben aus dem Fragenkatalog sind erfasst.',
      persHint: 'Gesondert von der Übersicht – Telefonnummern und Geburtsdaten der Beteiligten stehen nur hier.',
      newBtn: 'Vermisste Person'
    },
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung, offen, personalien, title, subtitle, gefahren, age, prune
  });
})(typeof window !== 'undefined' ? window : globalThis);
