/*
 * Workoholic · Schriftliche Arbeiten · Modul „Vermisste Person“
 * ---------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 * Fragenkatalog und Übersicht folgen dem Bereich „Vermisste Person“ aus dem VUF-Assistenten
 * (Anzeigenerstatter, Sichtung, Fahrzeuge, Gesundheit/Medikamente/Suizidalität, Erscheinungsbild,
 * Umfeld & Kontakt, Fotos in Teamwire, früheres Vermisstsein, Vergleichsmaterial für Mantrailer).
 * Ergänzt um die Personalien der vermissten Person, einen Kurzsachverhalt, einen sendefähigen
 * Fahndungstext (Personenbeschreibung) und offene Punkte, die nur Lücken und Gefahrenhinweise nennen.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const str = v => (v == null ? '' : String(v)).trim();
  const has = v => str(v) !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const pad = n => String(n).padStart(2, '0');
  const endDot = s => { s = str(s); return !s ? '' : /[.!?:]$/.test(s) ? s : s + '.'; };
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const joinList = (a, w = 'und') => { a = a.filter(Boolean); return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ' + w + ' ' + a[a.length - 1]; };
  const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const jnu = v => ({ ja: 'ja', nein: 'nein', unbekannt: 'unbekannt' }[v] || '');
  const vorOrtTxt = v => ({ ja: 'noch vor Ort', nein: 'nicht mehr vor Ort', unbekannt: 'Verbleib unbekannt' }[v] || '');
  const items = (d, k) => arr(get(d, k)).map(x => str(x && typeof x === 'object' ? x.t : x)).filter(Boolean);
  function age(geb, at) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(geb)); if (!m) return null;
    const ref = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(at)) || null;
    const now = ref ? new Date(+ref[1], +ref[2] - 1, +ref[3]) : new Date();
    let a = now.getFullYear() - +m[1];
    if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) a--;
    return a >= 0 && a < 130 ? a : null;
  }
  const nameOf = p => [str(p && p.vorname), str(p && p.nachname)].filter(Boolean).join(' ');
  const vm = d => get(d, 'vm') || {};
  const g = d => vm(d).geschlecht;
  const ER = d => (g(d) === 'm' ? 'Er' : g(d) === 'w' ? 'Sie' : 'Die vermisste Person');
  const vmName = d => nameOf(vm(d));
  const vmAge = d => age(vm(d).geb, get(d, 'sicht.datum') || get(d, 'einsatz.datum'));

  /* Auswahllisten aus dem VUF-Assistenten */
  const STATUR = ['zierlich', 'schlank', 'normal', 'athletisch', 'kräftig', 'korpulent'];
  const HAARFARBE = ['blond', 'dunkelblond', 'braun', 'dunkelbraun', 'schwarz', 'rot', 'grau', 'weiß', 'grau meliert', 'kein Haar / Glatze'];
  const HAARLAENGE = ['kein Haar / Glatze', 'sehr kurz', 'kurz', 'mittellang', 'lang', 'sehr lang'];
  const FORT = [['zu Fuß', 'zu Fuß'], ['mit dem Fahrrad', 'Fahrrad'], ['mit dem Pkw', 'Pkw'], ['mit öffentlichen Verkehrsmitteln', 'ÖPNV'], ['unbekannt', 'unbekannt']];
  const JN = [['ja', 'Ja'], ['nein', 'Nein']];
  const JNU = [['ja', 'Ja'], ['nein', 'Nein'], ['unbekannt', 'Unbekannt']];
  const GRADE = ['PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'KA', 'KAin', 'PR', 'PRin', 'EPHK', 'EPHKin'];
  const opts = a => a.map(x => [x, x]);

  /* ======================= Fragenkatalog ======================= */
  const STEPS = [
    {
      id: 'meldung', phase: 'Meldung', title: 'Anzeigenerstatter', lead: 'Wer meldet die Person als vermisst – und wie ist sie oder er erreichbar?', gen: ['1'],
      fields: [
        { t: 'head', text: 'Meldung' },
        { k: 'einsatz.datum', t: 'date', l: 'Meldung am', w: 'half', q: 'heute' },
        { k: 'einsatz.zeit', t: 'time', l: 'um', w: 'half', q: 'jetzt' },
        { k: 'melder', t: 'person', l: 'Anzeigenerstatter/in', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'tel'] },
        { k: 'melder.rolle', t: 'text', l: 'Rolle zur vermissten Person', pre: 'Verhältnis:', ph: 'z. B. Mutter, Ehemann, Freund', sugg: [['Mutter', 'Mutter'], ['Vater', 'Vater'], ['Ehepartner/in', 'Ehepartner/in'], ['Lebensgefährte/in', 'Lebensgefährte/in'], ['Kind', 'Kind'], ['Betreuer/in', 'Betreuer/in'], ['Einrichtung', 'Einrichtung'], ['Freund/in', 'Freund/in']] },
        { t: 'head', text: 'Aufnahme', h: 'Rufname und Kräfte' },
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half', recent: true },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Aufnehmende Beamtinnen und Beamte', grade: GRADE, max: 6 }
      ]
    },
    {
      id: 'person', phase: 'Meldung', title: 'Vermisste Person', lead: 'Personalien der vermissten Person – Geschlecht zuerst, dann passen Satzbau und Fahndungstext.', gen: ['2'],
      fields: [
        { k: 'vm', t: 'person', l: 'Vermisste Person', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift'] },
        { t: 'info', when: d => vmAge(d) != null && vmAge(d) < 18, text: 'Minderjährig – bei der Einstufung gilt eine Gefahr für Leib oder Leben grundsätzlich als gegeben, solange nichts anderes bekannt ist.' }
      ]
    },
    {
      id: 'sichtung', phase: 'Sichtung', title: 'Letzte Sichtung', lead: 'Wann und wo wurde die Person zuletzt gesehen, und wie ist sie unterwegs?', gen: ['3'],
      fields: [
        { t: 'head', text: 'Wann?' },
        { k: 'sicht.datum', t: 'date', l: 'Zuletzt gesehen – Datum', w: 'half', q: 'heute', req: true },
        { k: 'sicht.zeit', t: 'time', l: 'Uhrzeit', w: 'half', req: true },
        { t: 'head', text: 'Wohin und wie?' },
        { k: 'sicht.richtung', t: 'text', l: 'Entfernte sich in Richtung', ph: 'z. B. Innenstadt / Bahnhof' },
        { k: 'sicht.fort', t: 'choice', l: 'Fortbewegung (womit?)', o: FORT },
        { k: 'sicht.zuFuss', t: 'choice', l: 'Zu Fuß – Mobilität?', o: opts(['gut zu Fuß', 'normal', 'nicht gut zu Fuß']), when: d => get(d, 'sicht.fort') === 'zu Fuß' }
      ]
    },
    {
      id: 'fahrzeuge', phase: 'Sichtung', title: 'Zugriff auf Fahrzeuge', lead: 'Kann die Person mit einem Fahrzeug unterwegs sein?', gen: ['3'],
      fields: [
        { t: 'head', text: 'Pkw' },
        { k: 'pkw.zugriff', t: 'yn', l: 'Zugriff auf einen Pkw?', o: JN },
        { k: 'pkw.beschr', t: 'text', l: 'Pkw-Beschreibung', ph: 'z. B. VW Golf, schwarz', w: 'half', when: d => get(d, 'pkw.zugriff') === 'ja' },
        { k: 'pkw.kz', t: 'text', l: 'Kennzeichen', ph: 'z. B. ST-AB 123', w: 'half', when: d => get(d, 'pkw.zugriff') === 'ja' },
        { k: 'pkw.vorOrt', t: 'yn', l: 'Fahrzeug noch vor Ort?', o: JNU, when: d => get(d, 'pkw.zugriff') === 'ja' },
        { t: 'head', text: 'Andere Fahrzeuge', h: 'Motorrad, Fahrrad, Firmenwagen …' },
        { k: 'fz.zugriff', t: 'yn', l: 'Zugriff auf andere Fahrzeuge?', o: JN },
        { k: 'fz.beschr', t: 'text', l: 'Beschreibung', ph: 'z. B. Motorrad, rot', w: 'half', when: d => get(d, 'fz.zugriff') === 'ja' },
        { k: 'fz.kz', t: 'text', l: 'Kennzeichen', ph: 'z. B. ST-CD 456', w: 'half', when: d => get(d, 'fz.zugriff') === 'ja' },
        { k: 'fz.vorOrt', t: 'yn', l: 'Fahrzeug noch vor Ort?', o: JNU, when: d => get(d, 'fz.zugriff') === 'ja' }
      ]
    },
    {
      id: 'gesundheit', phase: 'Gesundheit', title: 'Krankheiten & Medikamente', lead: 'Ist die Person auf Hilfe oder Medikamente angewiesen?', gen: ['4'],
      fields: [
        { t: 'head', text: 'Krankheiten' },
        { k: 'ges.krank', t: 'yn', l: 'Krankheiten bekannt?', o: JNU },
        { k: 'ges.krankWelche', t: 'text', l: 'Welche Krankheiten?', ph: 'z. B. Diabetes, Epilepsie, Demenz', when: d => get(d, 'ges.krank') === 'ja' },
        { t: 'head', text: 'Medikamente' },
        { k: 'ges.med', t: 'yn', l: 'Auf Medikamente angewiesen?', o: JNU },
        { k: 'ges.medLeben', t: 'yn', l: 'Sind diese lebenswichtig?', o: JN, when: d => get(d, 'ges.med') === 'ja' },
        { k: 'ges.medWelche', t: 'text', l: 'Welche Medikamente?', ph: 'z. B. Insulin, Marcumar', when: d => get(d, 'ges.med') === 'ja' },
        { k: 'ges.medHeute', t: 'choice', l: 'Hinweise auf Einnahme am heutigen Tag?', o: opts(['eingenommen', 'nicht eingenommen', 'keine Hinweise']), when: d => get(d, 'ges.med') === 'ja' }
      ]
    },
    {
      id: 'suizid', phase: 'Gesundheit', title: 'Suizidalität', lead: 'Gab es Äußerungen, die auf eine Eigengefährdung hindeuten?', gen: ['4'],
      fields: [
        { t: 'head', text: 'Äußerungen' },
        { k: 'suizid.ja', t: 'yn', l: 'Suizidale Gedanken geäußert?', o: JN },
        { k: 'suizid.wann', t: 'text', l: 'Wann geäußert?', ph: 'z. B. vor 2 Wochen', w: 'half', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.art', t: 'text', l: 'Welche Äußerungen / Art?', ph: 'kurze Beschreibung', w: 'half', when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.behandlung', t: 'yn', l: 'In Behandlung?', o: JN, when: d => get(d, 'suizid.ja') === 'ja' },
        { k: 'suizid.aktuell', t: 'yn', l: 'Aktuell geäußert?', o: JN, when: d => get(d, 'suizid.ja') === 'ja' },
        { t: 'info', when: d => get(d, 'suizid.aktuell') === 'ja', text: 'Aktuelle Äußerungen deuten auf eine akute Eigengefährdung hin – Leitstelle unverzüglich informieren.' }
      ]
    },
    {
      id: 'aussehen', phase: 'Erscheinungsbild', title: 'Erscheinungsbild', lead: 'Daraus entsteht die Personenbeschreibung für die Fahndung.', gen: ['5'],
      fields: [
        { t: 'head', text: 'Körper' },
        { k: 'aus.statur', t: 'choice', l: 'Statur', o: opts(STATUR) },
        { k: 'aus.groesse', t: 'number', l: 'Größe', unit: 'cm', step: 1, min: 40, max: 230, q: [160, 170, 180, 190] },
        { t: 'head', text: 'Haare' },
        { k: 'aus.haarfarbe', t: 'choice', l: 'Haarfarbe', o: opts(HAARFARBE) },
        { k: 'aus.haarlaenge', t: 'choice', l: 'Haarlänge', o: opts(HAARLAENGE), when: d => get(d, 'aus.haarfarbe') !== 'kein Haar / Glatze' },
        { t: 'head', text: 'Kleidung & Merkmale' },
        { k: 'aus.bekleidung', t: 'area', rows: 2, l: 'Bekleidung', ph: 'z. B. dunkelblaue Jeans, rote Regenjacke, weiße Turnschuhe' },
        { k: 'aus.auffaellig', t: 'area', rows: 2, l: 'Auffälligkeiten (Narben, Gesichtsbehaarung, Brille …)', ph: 'freie Beschreibung' }
      ]
    },
    {
      id: 'umfeld', phase: 'Umfeld', title: 'Umfeld & Kontakt', lead: 'Wo könnte die Person sein, und wie ist sie erreichbar?', gen: ['6'],
      fields: [
        { t: 'head', text: 'Erreichbarkeit' },
        { k: 'umf.handy', t: 'yn', l: 'Handy mitgeführt?', o: JN },
        { k: 'umf.handyNr', t: 'text', l: 'Telefonnummer', ph: 'z. B. 0151 …', inputmode: 'tel', when: d => get(d, 'umf.handy') === 'ja' },
        { t: 'head', text: 'Orte & Kontakte', h: 'wo die Person sein könnte' },
        { k: 'umf.orte', t: 'list', l: 'Bekannte Aufenthaltsorte', item: 'Aufenthaltsort', add: 'Aufenthaltsort hinzufügen', max: 10, sub: [{ k: 't', t: 'text', l: 'Ort (Stichpunkt)', ph: 'z. B. Stammkneipe „…“' }] },
        { k: 'umf.freunde', t: 'list', l: 'Freunde als Anlaufadressen', item: 'Anlaufadresse', add: 'Anlaufadresse hinzufügen', max: 10, sub: [{ k: 't', t: 'text', l: 'Name / Anschrift', ph: 'Name, Straße Nr., Ort' }] }
      ]
    },
    {
      id: 'sonstiges', phase: 'Umfeld', title: 'Sonstiges', lead: 'Lichtbild, Vorgeschichte und Material für Suchmaßnahmen.', gen: ['6'],
      fields: [
        { t: 'head', text: 'Lichtbild' },
        { k: 'umf.fotos', t: 'yn', l: 'Fotos verfügbar?', o: JN },
        { t: 'info', when: d => get(d, 'umf.fotos') === 'ja', text: 'Fotos bitte in Teamwire einstellen (wird im Text vermerkt).' },
        { t: 'head', text: 'Vorgeschichte' },
        { k: 'umf.bereits', t: 'yn', l: 'Schon einmal vermisst gewesen?', o: JN },
        { k: 'umf.bereitsWo', t: 'text', l: 'Wo damals angetroffen?', ph: 'z. B. bei Freunden in …', when: d => get(d, 'umf.bereits') === 'ja' },
        { t: 'head', text: 'Suche' },
        { k: 'umf.vergleich', t: 'yn', l: 'Vergleichsmaterial für Suchmaßnahmen (Mantrailer) verfügbar?', o: JN }
      ]
    }
  ];

  /* ======================= Übersicht (Gruppen wie im VUF-Assistenten) ======================= */
  function groups(d) {
    const out = [];
    const group = (n, title, sid, fn) => { const lines = []; fn((label, val) => { if (has(val)) lines.push([label, str(val)]); }); out.push({ n, title, sid, lines }); };
    group('1', 'Anzeigenerstatter', 'meldung', add => {
      const m = get(d, 'melder') || {};
      let nm = nameOf(m); if (has(m.rolle)) nm += (nm ? ' ' : '') + '(' + str(m.rolle) + ')';
      add('Name', nm);
      add('Geburtsdatum', m.geb ? fmtDate(m.geb) : '');
      add('Erreichbarkeit', m.tel);
      const z = [get(d, 'einsatz.datum') ? fmtDate(get(d, 'einsatz.datum')) : '', has(get(d, 'einsatz.zeit')) ? get(d, 'einsatz.zeit') + ' Uhr' : ''].filter(Boolean).join(', ');
      add('Meldung', z);
    });
    group('2', 'Vermisste Person', 'person', add => {
      const p = vm(d), a = vmAge(d);
      add('Name', nameOf(p));
      add('Geburtsdatum', p.geb ? fmtDate(p.geb) + (a != null ? ` (${a} Jahre)` : '') : '');
      add('Wohnanschrift', p.anschrift);
    });
    group('3', 'Sichtung', 'sichtung', add => {
      const zg = [get(d, 'sicht.datum') ? fmtDate(get(d, 'sicht.datum')) : '', has(get(d, 'sicht.zeit')) ? get(d, 'sicht.zeit') + ' Uhr' : ''].filter(Boolean);
      add('Zuletzt gesehen', zg.length ? zg.join(', ') : '[Zeitpunkt der letzten Sichtung]');
      let ri = str(get(d, 'sicht.richtung'));
      const fort = get(d, 'sicht.fort');
      if (has(fort)) { let fb = fort; if (fort === 'zu Fuß' && has(get(d, 'sicht.zuFuss'))) fb += ', ' + get(d, 'sicht.zuFuss'); ri += (ri ? ' ' : '') + '(' + fb + ')'; }
      add('Entfernte sich in Richtung', ri);
      for (const [k, lab] of [['pkw', 'Zugriff auf Pkw'], ['fz', 'Zugriff auf andere Fahrzeuge']]) {
        const z = get(d, k + '.zugriff');
        if (z === 'ja') { const det = [str(get(d, k + '.beschr')), str(get(d, k + '.kz')).toUpperCase()].filter(Boolean).join(', '), vo = vorOrtTxt(get(d, k + '.vorOrt')); add(lab, 'ja' + (det ? ' – ' + det : '') + (vo ? ' (' + vo + ')' : '')); }
        else if (z) add(lab, jnu(z));
      }
    });
    group('4', 'Gesundheit', 'gesundheit', add => {
      const kr = get(d, 'ges.krank');
      if (kr === 'ja') add('Krankheiten bekannt', 'ja' + (has(get(d, 'ges.krankWelche')) ? ' – ' + str(get(d, 'ges.krankWelche')) : '')); else if (kr) add('Krankheiten bekannt', jnu(kr));
      const md = get(d, 'ges.med');
      if (md === 'ja') {
        const det = [];
        if (get(d, 'ges.medLeben')) det.push(get(d, 'ges.medLeben') === 'ja' ? 'lebenswichtig' : 'nicht lebenswichtig');
        if (has(get(d, 'ges.medWelche'))) det.push('Art: ' + str(get(d, 'ges.medWelche')));
        if (has(get(d, 'ges.medHeute'))) det.push('heute: ' + get(d, 'ges.medHeute'));
        add('Auf Medikamente angewiesen', 'ja' + (det.length ? ' – ' + det.join('; ') : ''));
      } else if (md) add('Auf Medikamente angewiesen', jnu(md));
      const su = get(d, 'suizid.ja');
      if (su === 'ja') {
        const det = [];
        if (has(get(d, 'suizid.wann'))) det.push('wann: ' + str(get(d, 'suizid.wann')));
        if (has(get(d, 'suizid.art'))) det.push('Art: ' + str(get(d, 'suizid.art')));
        if (get(d, 'suizid.behandlung')) det.push('in Behandlung: ' + jnu(get(d, 'suizid.behandlung')));
        if (get(d, 'suizid.aktuell')) det.push('aktuell geäußert: ' + jnu(get(d, 'suizid.aktuell')));
        add('Suizidale Äußerungen', 'ja' + (det.length ? ' – ' + det.join('; ') : ''));
      } else if (su) add('Suizidale Äußerungen', jnu(su));
    });
    group('5', 'Erscheinungsbild', 'aussehen', add => {
      const gr = str(get(d, 'aus.groesse'));
      add('Statur', get(d, 'aus.statur'));
      add('Größe', gr ? (/^\d+$/.test(gr) ? gr + ' cm' : gr) : '');
      add('Haarfarbe', get(d, 'aus.haarfarbe'));
      if (get(d, 'aus.haarfarbe') !== 'kein Haar / Glatze') add('Haarlänge', get(d, 'aus.haarlaenge'));
      add('Auffälligkeiten', get(d, 'aus.auffaellig'));
      add('Bekleidung', get(d, 'aus.bekleidung'));
    });
    group('6', 'Umfeld & Kontakt', 'umfeld', add => {
      const h = get(d, 'umf.handy');
      if (h === 'ja') add('Handy', 'ja' + (has(get(d, 'umf.handyNr')) ? ' – ' + str(get(d, 'umf.handyNr')) : '')); else if (h) add('Handy', jnu(h));
      const orte = items(d, 'umf.orte'), fr = items(d, 'umf.freunde');
      if (orte.length) add('Bekannte Aufenthaltsorte', orte.join('; '));
      if (fr.length) add('Freunde / Anlaufadressen', fr.join('; '));
      const f = get(d, 'umf.fotos');
      if (f === 'ja') add('Fotos verfügbar', 'ja – in Teamwire eingestellt'); else if (f) add('Fotos verfügbar', jnu(f));
      const b = get(d, 'umf.bereits');
      if (b === 'ja') add('Bereits vermisst gewesen', 'ja' + (has(get(d, 'umf.bereitsWo')) ? ' – angetroffen: ' + str(get(d, 'umf.bereitsWo')) : '')); else if (b) add('Bereits vermisst gewesen', jnu(b));
      if (get(d, 'umf.vergleich')) add('Vergleichsmaterial (Mantrailer)', jnu(get(d, 'umf.vergleich')));
    });
    return out;
  }
  /** Abschnitte für die Ergebnisansicht: [Nr, Titel, Text, Schritt]. */
  function text(d) {
    return groups(d).map(x => [x.n, x.title, x.lines.length ? x.lines.map(([l, v]) => `– ${l}: ${v}`).join('\n') : '– nichts erfasst –', x.sid]);
  }
  /** Zum Kopieren – exakt im Format des VUF-Assistenten (Gruppen in Großbuchstaben, eingerückte Spiegelstriche). */
  function plain(d) {
    const body = groups(d).filter(x => x.lines.length).map(x => x.title.toUpperCase() + '\n' + x.lines.map(([l, v]) => '   -  ' + l + ': ' + v).join('\n')).join('\n\n');
    return 'Vermisste Person' + (vmName(d) ? ' – ' + vmName(d) : '') + '\n\n' + body;
  }
  function preview(stepId, d) {
    const st = STEPS.find(s => s.id === stepId); if (!st) return '';
    const ids = arr(st.gen);
    return text(d).filter(s => ids.includes(s[0])).map(s => `${s[0]} ${s[1]}\n${s[2]}`).join('\n\n');
  }

  /* ======================= Kurzsachverhalt ======================= */
  function kurz(d) {
    const m = get(d, 'melder') || {}, p = vm(d), a = vmAge(d);
    const md = get(d, 'einsatz.datum'), mz = get(d, 'einsatz.zeit');
    const wer = nameOf(m) ? nameOf(m) + (has(m.rolle) ? ` (${str(m.rolle)})` : '') : '[Anzeigenerstatter/in]';
    const name = nameOf(p) || '[vermisste Person]';
    const appo = [p.geb ? `geb. ${fmtDate(p.geb)}${a != null ? ` (${a} Jahre)` : ''}` : '', has(p.anschrift) ? `wohnhaft ${str(p.anschrift)}` : ''].filter(Boolean);
    const s = [];
    s.push(`${md ? 'Am ' + fmtDate(md) : 'Am [Datum]'}${has(mz) ? ` um ${mz} Uhr` : ''} meldete ${wer} ${name}${appo.length ? ', ' + appo.join(', ') + ',' : ''} als vermisst.`);
    const sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit');
    const fort = get(d, 'sicht.fort'), ri = str(get(d, 'sicht.richtung'));
    const weg = [fort && fort !== 'unbekannt' ? fort : '', ri ? `in Richtung ${ri}` : ''].filter(Boolean).join(' ');
    s.push(`${ER(d)} wurde zuletzt am ${sd ? fmtDate(sd) : '[Datum]'}${has(sz) ? ` gegen ${sz} Uhr` : ''} gesehen${weg ? ` und entfernte sich ${weg}` : ''}.`);
    const fz = [];
    for (const k of ['pkw', 'fz']) if (get(d, k + '.zugriff') === 'ja') { const det = [str(get(d, k + '.beschr')), str(get(d, k + '.kz')).toUpperCase()].filter(Boolean).join(', '); fz.push((det || (k === 'pkw' ? 'ein Pkw' : 'ein weiteres Fahrzeug')) + (get(d, k + '.vorOrt') === 'ja' ? ' (noch vor Ort)' : get(d, k + '.vorOrt') === 'nein' ? ' (nicht mehr vor Ort)' : '')); }
    if (fz.length) s.push(`${ER(d)} hat Zugriff auf ${fz.length === 1 ? 'ein Fahrzeug' : 'folgende Fahrzeuge'}: ${fz.join('; ')}.`);
    const gef = gefahren(d);
    if (gef.length) s.push(`${gef.length === 1 ? 'Hinweis' : 'Hinweise'}: ${gef.join('; ')}.`);
    return s.join(' ');
  }
  /** Gefahrenhinweise in Stichworten (Kurzsachverhalt, Fahndung, Untertitel). */
  function gefahren(d) {
    const o = [], a = vmAge(d);
    if (a != null && a < 18) o.push('minderjährig');
    if (get(d, 'suizid.aktuell') === 'ja') o.push('aktuell suizidale Äußerungen');
    else if (get(d, 'suizid.ja') === 'ja') o.push('früher suizidale Äußerungen');
    if (get(d, 'ges.medLeben') === 'ja') o.push('auf lebenswichtige Medikamente angewiesen' + (has(get(d, 'ges.medWelche')) ? ` (${str(get(d, 'ges.medWelche'))})` : ''));
    if (get(d, 'ges.krank') === 'ja' && has(get(d, 'ges.krankWelche'))) o.push('Erkrankung: ' + str(get(d, 'ges.krankWelche')));
    if (get(d, 'sicht.zuFuss') === 'nicht gut zu Fuß') o.push('nicht gut zu Fuß');
    return o;
  }

  /* ======================= Fahndung (Personenbeschreibung, sendefähig) ======================= */
  /** „kurze, braune Haare“ – alle Werte der Auswahllisten werden mit -e dekliniert. */
  function hair(hf, hl) {
    if (hf === 'kein Haar / Glatze' || hl === 'kein Haar / Glatze') return 'Glatze';
    const a = [has(hl) ? hl + 'e' : '', has(hf) ? hf + 'e' : ''].filter(Boolean);
    return a.length ? a.join(', ') + ' Haare' : '';
  }
  function fahndung(d) {
    const p = vm(d), a = vmAge(d);
    const gr = str(get(d, 'aus.groesse')), hf = get(d, 'aus.haarfarbe'), hl = get(d, 'aus.haarlaenge');
    const desc = [
      g(d) === 'm' ? 'männlich' : g(d) === 'w' ? 'weiblich' : g(d) === 'd' ? 'divers' : '',
      a != null ? `${a} Jahre` : '',
      gr ? `ca. ${gr}${/^\d+$/.test(gr) ? ' cm' : ''}` : '',
      get(d, 'aus.statur') || '',
      hair(hf, hl)
    ].filter(Boolean);
    if (!nameOf(p) && !desc.length && !has(get(d, 'aus.bekleidung'))) return '';
    const L = [];
    L.push(`Vermisst: ${nameOf(p) || '[Name]'}${desc.length ? ', ' + desc.join(', ') : ''}.`);
    if (has(get(d, 'aus.bekleidung'))) L.push('Bekleidung: ' + endDot(get(d, 'aus.bekleidung')));
    if (has(get(d, 'aus.auffaellig'))) L.push('Auffällig: ' + endDot(get(d, 'aus.auffaellig')));
    const sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit'), ri = str(get(d, 'sicht.richtung')), fort = get(d, 'sicht.fort');
    if (sd || sz || ri) {
      const wann = [sd ? fmtDate(sd) : '', sz ? sz + ' Uhr' : ''].filter(Boolean).join(' ');
      L.push(`Zuletzt gesehen${wann ? ' ' + wann : ''}${ri ? (wann ? ', ' : ' ') + 'Richtung ' + ri : ''}${fort && fort !== 'unbekannt' ? ' (' + fort + ')' : ''}.`);
    }
    for (const k of ['pkw', 'fz']) if (get(d, k + '.zugriff') === 'ja' && get(d, k + '.vorOrt') !== 'ja') {
      const det = [str(get(d, k + '.beschr')), has(get(d, k + '.kz')) ? 'Kz. ' + str(get(d, k + '.kz')).toUpperCase() : ''].filter(Boolean).join(', ');
      if (det) L.push(`Möglicherweise unterwegs mit: ${det}.`);
    }
    const gef = gefahren(d);
    if (gef.length) L.push(`Hinweis: ${cap(gef.join('; '))}.`);
    if (get(d, 'umf.handy') === 'ja') L.push('Führt ein Mobiltelefon mit.');
    return L.join('\n');
  }

  /* ======================= Offene Punkte – nur Lücken und Gefahrenhinweise ======================= */
  function offen(d) {
    const o = [], m = get(d, 'melder') || {}, p = vm(d);
    if (get(d, 'suizid.aktuell') === 'ja') o.push('Aktuelle suizidale Äußerungen: akute Eigengefährdung – Leitstelle informieren und bei der Einstufung berücksichtigen.');
    if (get(d, 'ges.medLeben') === 'ja') o.push('Lebenswichtige Medikamente' + (has(get(d, 'ges.medWelche')) ? ` (${str(get(d, 'ges.medWelche'))})` : '') + ': Dringlichkeit bei der Einstufung berücksichtigen.');
    if (vmAge(d) != null && vmAge(d) < 18) o.push('Minderjährige Person: Einstufung entsprechend vornehmen, Erziehungsberechtigte einbinden.');
    if (!has(p.nachname) && !has(p.vorname)) o.push('Personalien der vermissten Person erheben.');
    else if (!has(p.geb)) o.push('Geburtsdatum der vermissten Person erheben.');
    if (!has(get(d, 'sicht.datum')) || !has(get(d, 'sicht.zeit'))) o.push('Zeitpunkt der letzten Sichtung klären.');
    if (!has(m.tel)) o.push('Erreichbarkeit des Anzeigenerstatters / der Anzeigenerstatterin erheben.');
    const fehlt = [['aus.groesse', 'Größe'], ['aus.statur', 'Statur'], ['aus.haarfarbe', 'Haarfarbe'], ['aus.bekleidung', 'Bekleidung']].filter(([k]) => !has(get(d, k))).map(x => x[1]);
    if (fehlt.length) o.push(`Personenbeschreibung vervollständigen: ${joinList(fehlt)}.`);
    for (const [k, lab] of [['pkw', 'Pkw'], ['fz', 'weiteren Fahrzeugs']]) if (get(d, k + '.zugriff') === 'ja') {
      if (!has(get(d, k + '.kz'))) o.push(`Kennzeichen des ${lab === 'Pkw' ? 'Pkw' : lab} erheben.`);
      if (get(d, k + '.vorOrt') === 'nein' || get(d, k + '.vorOrt') === 'unbekannt') o.push(`${lab === 'Pkw' ? 'Pkw' : 'Fahrzeug'} ist nicht sicher vor Ort – in die Fahndung einbeziehen.`);
    }
    if (get(d, 'umf.handy') === 'ja' && !has(get(d, 'umf.handyNr'))) o.push('Rufnummer des mitgeführten Handys erheben.');
    if (!has(get(d, 'umf.handy'))) o.push('Klären, ob ein Handy mitgeführt wird.');
    if (get(d, 'umf.fotos') === 'ja') o.push('Lichtbild in Teamwire einstellen.');
    else if (!has(get(d, 'umf.fotos'))) o.push('Klären, ob ein aktuelles Lichtbild vorliegt.');
    const orte = items(d, 'umf.orte'), fr = items(d, 'umf.freunde');
    if (orte.length || fr.length) o.push(`Bekannte Aufenthaltsorte und Anlaufadressen abklären (${orte.length + fr.length}).`);
    if (get(d, 'umf.bereits') === 'ja' && has(get(d, 'umf.bereitsWo'))) o.push(`Früheren Antreffort prüfen: ${str(get(d, 'umf.bereitsWo'))}.`);
    if (get(d, 'umf.vergleich') === 'ja') o.push('Vergleichsmaterial für den Mantrailer unberührt sichern bzw. bereithalten.');
    return o;
  }

  /* ======================= Personalien (gesondert) ======================= */
  function personalien(d) {
    const m = get(d, 'melder') || {}, p = vm(d), rows = [];
    const line = (l, v) => { if (has(v)) rows.push(`${l}: ${str(v)}`); };
    rows.push('Vermisste Person');
    line('Name', nameOf(p)); line('Geburtsdatum', p.geb ? fmtDate(p.geb) : ''); line('Anschrift', p.anschrift);
    if (get(d, 'umf.handy') === 'ja') line('Mobiltelefon', get(d, 'umf.handyNr'));
    rows.push('', 'Anzeigenerstatter/in');
    line('Name', nameOf(m)); line('Rolle', m.rolle); line('Geburtsdatum', m.geb ? fmtDate(m.geb) : ''); line('Erreichbarkeit', m.tel);
    return rows.join('\n');
  }

  /* ======================= Liste ======================= */
  function title(d) {
    const dat = get(d, 'sicht.datum') || get(d, 'einsatz.datum');
    return ['Vermisst', vmName(d), dat ? fmtDate(dat) : ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const sd = get(d, 'sicht.datum'), sz = get(d, 'sicht.zeit');
    const z = sd || sz ? 'zuletzt gesehen ' + [sd ? fmtDate(sd).slice(0, 6) : '', sz || ''].filter(Boolean).join(' ') : '';
    const gef = gefahren(d), mz = get(d, 'einsatz.zeit');
    return [z || (mz ? `gemeldet ${mz} Uhr` : ''), gef[0] || ''].filter(Boolean).join(' · ');
  }

  root.WVermisst = Object.freeze({
    id: 'vermisst', name: 'Vermisste Person', short: 'Vermisst', kurz: 'VM',
    desc: 'Fragenkatalog zur vermissten Person · Übersicht, Kurzsachverhalt, Personenbeschreibung für die Fahndung, offene Punkte',
    labels: {
      bericht: 'Übersicht',
      kurzHint: 'Kurzsachverhalt für den Vorgang und die Übergabe an die Leitstelle.',
      fahndungHint: 'Personenbeschreibung für Leitstelle und Funkfahndung – kurz und sendefähig.',
      offenEmpty: 'Alle Angaben aus dem Fragenkatalog sind erfasst.',
      persHint: 'Gesondert von der Übersicht – Telefonnummern nur hier.',
      newBtn: 'Vermisste Person'
    },
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung, offen, personalien, title, subtitle, gefahren, age
  });
})(typeof window !== 'undefined' ? window : globalThis);
