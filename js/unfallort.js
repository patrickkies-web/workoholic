/*
 * Workoholic · Schriftliche Arbeiten · Baustein „Unfallörtlichkeit“
 * ---------------------------------------------------------------
 * Eigener Abschnitt (wie „Allgemeines/Einsatzanlass“): die Umstände, die bei JEDER Unfallaufnahme
 * anzugeben sind – unabhängig davon, wie die Örtlichkeit gestaltet ist (Ampel, Beschilderung, Kreuzung
 * gehören nicht hierher). Ankreuzen statt Tippen, Text zum Kopieren direkt im Schritt.
 *
 * Feste Auswahl nach der Unfallmitteilung NRW, Blatt 2 „Zusätzliche Angaben“ (Formular NRW 3126,
 * Anlage 4 RdErl. „Aufgaben der Polizei bei Verkehrsunfällen“ v. 25.08.2008), Ziffer im Chip;
 * ergänzt um Belag, Fahrbahndecke, Sicht und Verkehrslage nach der Ausfüllhilfe zu Anlage 6 (2.1.4–2.1.6).
 * Listen und Textbausteine liegen im Kern (WVUF_CORE.VERH / verhBloecke) – dieselben wie in der VU-Flucht.
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  if (!C) return;
  const { get, str, has, arr, PH, fmtDate } = C;
  const istStrasse = d => !has(get(d, 'ort.art')) || get(d, 'ort.art') === 'strasse';
  const UEBERSCHRIFT = 'Unfallörtlichkeit';

  /* ======================= Text ======================= */
  /** Der Abschnitt mit Zwischenzeilen (Fahrbahnverhältnisse · Witterungs- und Sichtverhältnisse · Verkehrslage). */
  const bloecke = d => C.verhBloecke(get(d, 'ort'), get(d, 'ort.art'));
  const abschnitt = d => bloecke(d).map(([l, t]) => l + '\n' + t).join('\n\n');

  /* ======================= Fragen ======================= */
  const STEPS = [
    {
      id: 'verhaeltnisse', phase: 'Unfallörtlichkeit', title: 'Verhältnisse vor Ort', lead: 'Ankreuzen, was du feststellst. Auswahl wie in der Unfallmitteilung NRW (Bl. 2), die Ziffer steht in Klammern. Der Text steht unten fertig zum Kopieren.', gen: ['abschnitt'],
      fields: [
        { k: 'aufnahme.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' },
        { k: 'aufnahme.zeit', t: 'time', l: 'Uhrzeit der Feststellung', w: 'half', q: 'jetzt' },
        { k: 'ort.art', t: 'choice', l: 'Wo?', o: [['strasse', 'Straße'], ['parkplatz', 'Parkplatz'], ['parkhaus', 'Parkhaus / Tiefgarage'], ['sonst', 'Sonstige Fläche']] },
        { k: 'ort.verhBezug', t: 'choice', l: 'Die Angaben gelten …', o: [['aufnahme', 'bei der Unfallaufnahme'], ['beide', 'zur Unfallzeit und bei der Aufnahme']], h: 'Nur „zur Unfallzeit“ wählen, wenn sicher ist, dass die Verhältnisse damals dieselben waren.' },
        { t: 'preset', l: d => `Schnellwahl – Licht passend zu ${has(get(d, 'aufnahme.zeit')) ? get(d, 'aufnahme.zeit') + ' Uhr' : 'jetzt'}`, o: d => {
          const l = C.lichtVorschlag(get(d, 'aufnahme.datum'), get(d, 'aufnahme.zeit')), L = { tag: 'Tag', daemmerung: 'Dämmerung', dunkel: 'Dunkel' }[l];
          return [
            [`${L} · trocken`, { 'ort.licht': l, 'ort.zustand': ['trocken'], 'ort.witterung': ['keine'], 'ort.sicht': 'gut' }, 'keine Witterungseinflüsse · gute Sicht'],
            [`${L} · Regen`, { 'ort.licht': l, 'ort.zustand': ['nass'], 'ort.witterung': ['regen'], 'ort.sicht': 'eingeschraenkt' }, 'nasse Fahrbahn'],
            [`${L} · Nebel`, { 'ort.licht': l, 'ort.zustand': ['nass'], 'ort.witterung': ['nebel'], 'ort.sicht': 'eingeschraenkt' }, 'feuchte Fahrbahn'],
            [`${L} · Glätte`, { 'ort.licht': l, 'ort.zustand': ['winterglatt'], 'ort.witterung': ['keine'], 'ort.sicht': 'gut' }, 'winterglatt'],
            ...(l === 'tag' ? [['Tag · blendende Sonne', { 'ort.licht': 'tag', 'ort.zustand': ['trocken'], 'ort.witterung': ['sonne'], 'ort.sicht': 'eingeschraenkt' }, 'Blendung']] : [])
          ];
        } },
        { t: 'head', text: 'Licht' },
        { k: 'ort.licht', t: 'choice', l: 'Lichtverhältnisse', req: true, o: C.verhOpt('licht') },
        { k: 'ort.beleuchtung', t: 'choice', l: d => ({ parkplatz: 'Parkplatzbeleuchtung', parkhaus: 'Beleuchtung im Parkhaus', sonst: 'Beleuchtung der Fläche' }[get(d, 'ort.art')] || 'Straßenbeleuchtung'), o: C.verhOpt('beleuchtung'), when: d => ['daemmerung', 'dunkel'].includes(get(d, 'ort.licht')) },
        { t: 'head', text: d => (istStrasse(d) ? 'Fahrbahn' : 'Verkehrsfläche') },
        { k: 'ort.zustand', t: 'multi', l: 'Straßenzustand', h: 'Höchstens zwei Angaben, z. B. „nass/feucht“ und „schlüpfrig“.', req: true, max: 2, excl: [['trocken', 'nass']], o: C.verhOpt('zustand') },
        { k: 'ort.winterDurch', t: 'multi', l: 'Winterglatt durch', o: C.verhOpt('winterDurch'), when: d => arr(get(d, 'ort.zustand')).includes('winterglatt') },
        { k: 'ort.schluepfrigDurch', t: 'multi', l: 'Schlüpfrig durch', o: C.verhOpt('schluepfrigDurch'), when: d => arr(get(d, 'ort.zustand')).includes('schluepfrig') },
        { k: 'ort.belag', t: 'choice', l: 'Belag', o: C.verhOpt('belag') },
        { k: 'ort.decke', t: 'multi', l: 'Zustand der Fahrbahndecke', excl: [['intakt', '*']], o: C.verhOpt('decke') },
        { t: 'head', text: 'Witterung & Sicht' },
        { k: 'ort.witterung', t: 'multi', l: 'Witterungsverhältnisse', h: '„keine besonderen“ heißt: kein Niederschlag, kein Nebel, kein Sturm, keine blendende Sonne.', req: true, excl: [['keine', '*'], ['sicht50', 'sicht100']], o: C.verhOpt('witterung') },
        { k: 'ort.sonneRichtung', t: 'text', l: 'Aus welcher Richtung?', pre: 'Die Sonne blendete', ph: 'aus westlicher Richtung', sugg: [['aus Richtung …', 'aus Richtung '], ['entgegen der Fahrtrichtung', 'entgegen der Fahrtrichtung ']], when: d => arr(get(d, 'ort.witterung')).includes('sonne') },
        { k: 'ort.sicht', t: 'choice', l: 'Sichtverhältnisse', o: C.verhOpt('sicht') },
        { k: 'ort.sichtHindernis', t: 'multi', l: 'Eingeschränkt durch', o: C.verhOpt('sichtHindernis'), when: d => ['eingeschraenkt', 'schlecht'].includes(get(d, 'ort.sicht')) },
        { k: 'ort.sichtText', t: 'text', l: 'Wodurch sonst?', pre: 'Die Sicht war zudem eingeschränkt durch', ph: 'einen am Fahrbahnrand abgestellten Lkw', when: d => arr(get(d, 'ort.sichtHindernis')).includes('sonst') },
        { t: 'head', text: 'Verkehrslage' },
        { k: 'ort.verkehr', t: 'choice', l: 'Verkehrsaufkommen', o: C.verhOpt('verkehr') },
        { k: 'ort.verkehrAnlass', t: 'multi', l: 'Besonderer Anlass', o: C.verhOpt('verkehrAnlass'), when: d => has(get(d, 'ort.verkehr')) },
        { t: 'out', fn: 'abschnitt', l: UEBERSCHRIFT }
      ]
    }
  ];

  /* ======================= Ausgaben ======================= */
  const text = d => [['', UEBERSCHRIFT, abschnitt(d), 'verhaeltnisse']];
  const plain = d => UEBERSCHRIFT + '\n' + abschnitt(d);
  const preview = (id, d) => abschnitt(d);
  /** Eine Zeile für Liste und Übergabe. */
  function kurz(d) {
    const o = C.verhNorm(get(d, 'ort'));
    const opt = (name, k) => { const x = C.VERH[name].find(e => e[0] === k); return x ? x[1] : ''; };
    const teile = [
      opt('licht', o.licht) + (o.licht && o.licht !== 'tag' && o.beleuchtung ? ' (Beleuchtung ' + opt('beleuchtung', o.beleuchtung) + ')' : ''),
      arr(o.zustand).map(k => opt('zustand', k).replace(/ \(.*\)$/, '')).join(', '),
      arr(o.witterung).includes('keine') ? 'keine besonderen Witterungseinflüsse' : arr(o.witterung).map(k => opt('witterung', k)).join(', '),
      o.sicht ? 'Sicht ' + opt('sicht', o.sicht) : '',
      o.verkehr ? 'Verkehr ' + opt('verkehr', o.verkehr) : ''
    ].filter(Boolean);
    return teile.join(' · ') || '– noch nichts angekreuzt –';
  }
  function offen(d) {
    const o = C.verhNorm(get(d, 'ort')), out = [];
    if (!has(o.licht)) out.push('Lichtverhältnisse ankreuzen (Tageslicht, Dämmerung, Dunkelheit).');
    else if (o.licht !== 'tag' && !has(o.beleuchtung)) out.push('Bei Dämmerung/Dunkelheit angeben, ob eine Beleuchtung vorhanden und in Betrieb war.');
    if (!arr(o.zustand).length) out.push('Straßenzustand ankreuzen (trocken, nass/feucht, winterglatt, schlüpfrig).');
    if (!arr(o.witterung).length) out.push('Witterungsverhältnisse ankreuzen – oder „keine besonderen“.');
    if (['eingeschraenkt', 'schlecht'].includes(o.sicht) && !arr(o.sichtHindernis).length && !arr(o.witterung).some(k => ['nebel', 'sicht50', 'sicht100', 'regen', 'schnee', 'hagel', 'sonne'].includes(k))) out.push('Angeben, wodurch die Sicht eingeschränkt war.');
    if (!has(o.belag)) out.push('Belag der Fahrbahn bzw. Verkehrsfläche angeben (optional).');
    if (!has(o.verkehr)) out.push('Verkehrsaufkommen angeben (optional).');
    return out;
  }
  const personalien = () => 'In diesem Abschnitt werden keine Personalien erfasst.';
  function title(d) {
    const a = get(d, 'aufnahme') || {}, o = C.verhNorm(get(d, 'ort'));
    const opt = (name, k) => { const x = C.VERH[name].find(e => e[0] === k); return x ? x[1] : ''; };
    const k = [opt('licht', o.licht), arr(o.zustand).map(z => opt('zustand', z).replace(/ \(.*\)$/, '')).join('/')].filter(Boolean).join(', ');
    return [UEBERSCHRIFT, k, has(a.datum) ? fmtDate(a.datum) : ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const art = { strasse: 'Straße', parkplatz: 'Parkplatz', parkhaus: 'Parkhaus', sonst: 'Sonstige Fläche' }[get(d, 'ort.art')] || '';
    const z = get(d, 'aufnahme.zeit');
    return [art, has(z) ? str(z) + ' Uhr' : ''].filter(Boolean).join(' · ');
  }

  root.WUnfallort = Object.freeze({
    id: 'unfallort', name: 'Unfallörtlichkeit', short: 'Unfallörtlichkeit', kurz: 'UÖ',
    desc: 'Verhältnisse vor Ort zum Ankreuzen: Licht, Straßenzustand, Witterung, Sicht, Verkehrslage – Auswahl und Ziffern wie in der Unfallmitteilung NRW, Text fertig zum Kopieren',
    labels: {
      bericht: 'Unfallörtlichkeit',
      kurz: 'Kurzfassung',
      kurzHint: 'Eine Zeile für Liste und Übergabe.',
      offen: 'Fehlt noch',
      offenEmpty: 'Alles für diesen Abschnitt ist erfasst.',
      persHint: 'Dieser Abschnitt enthält keine Personalien.',
      newBtn: 'Unfallörtlichkeit'
    },
    zwischenzeilen: ['Fahrbahnverhältnisse', 'Witterungs- und Sichtverhältnisse', 'Verkehrslage'],
    extraTabs: [{ k: 'ziffern', l: 'Ziffern Bl. 2', hint: 'Zum Übertragen in die Unfallmitteilung NRW, Blatt 2 „Zusätzliche Angaben“ (bzw. die Erfassung in ViVA).', text: d => C.verhZiffern(get(d, 'ort')) }],
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien, title, subtitle, abschnitt
  });
})(typeof window !== 'undefined' ? window : globalThis);
