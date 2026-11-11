/*
 * Workoholic · Schriftliche Arbeiten · Abschnitt „Unfallörtlichkeit“
 * ---------------------------------------------------------------
 * Eigener Abschnitt (wie „Allgemeines/Einsatzanlass“): die Umstände, die bei JEDER Unfallaufnahme anzugeben
 * sind – unabhängig davon, wie die Örtlichkeit gestaltet ist (Ampel, Beschilderung, Kreuzung gehören nicht hierher).
 * Ankreuzen statt Tippen; heraus kommt EIN zusammenhängender Absatz zum Kopieren.
 * Auswahl und Textbausteine liegen im Kern (WVUF_CORE.VERH / verhFelder / verhText) – dieselben wie in der VU-Flucht.
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 */
(function (root) {
  'use strict';
  const C = root.WVUF_CORE;
  if (!C) return;
  const { get, str, has, fmtDate } = C;
  const UEBERSCHRIFT = 'Unfallörtlichkeit';
  const abschnitt = d => C.verhText(get(d, 'ort'), get(d, 'ort.art'));

  const STEPS = [
    {
      id: 'wetter', phase: 'Unfallörtlichkeit', title: 'Licht & Wetter', lead: 'Ankreuzen, was du vor Ort feststellst. Heraus kommt ein zusammenhängender Absatz.', gen: ['abschnitt'],
      fields: [
        { k: 'aufnahme.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' },
        { k: 'aufnahme.zeit', t: 'time', l: 'Uhrzeit der Feststellung', w: 'half', q: 'jetzt' },
        { k: 'ort.art', t: 'choice', l: 'Wo?', o: [['strasse', 'Straße'], ['parkplatz', 'Parkplatz'], ['parkhaus', 'Parkhaus / Tiefgarage'], ['sonst', 'Sonstige Fläche']] },
        { k: 'ort.verhBezug', t: 'choice', l: 'Die Angaben gelten …', o: [['aufnahme', 'bei der Unfallaufnahme'], ['beide', 'zur Unfallzeit und bei der Aufnahme']], h: 'Nur „zur Unfallzeit“ wählen, wenn sicher ist, dass die Verhältnisse damals dieselben waren.' },
        { t: 'preset', l: d => `Schnellwahl – Licht passend zu ${has(get(d, 'aufnahme.zeit')) ? get(d, 'aufnahme.zeit') + ' Uhr' : 'jetzt'}`, o: d => C.verhSchnellwahl(C.lichtVorschlag(get(d, 'aufnahme.datum'), get(d, 'aufnahme.zeit'))) },
        ...C.verhFelder('wetter')
      ]
    },
    {
      id: 'fahrbahn', phase: 'Unfallörtlichkeit', title: d => (!has(get(d, 'ort.art')) || get(d, 'ort.art') === 'strasse' ? 'Zustand der Fahrbahn' : 'Zustand der Verkehrsfläche'), lead: 'Belag, Nässe, Glätte, Verschmutzung, Schäden und Markierungen', gen: ['abschnitt'],
      fields: C.verhFelder('fahrbahn')
    },
    {
      id: 'sicht', phase: 'Unfallörtlichkeit', title: 'Sicht & Verkehr', lead: 'Sichtverhältnisse und Verkehrslage. Der fertige Absatz steht unten zum Kopieren.', gen: ['abschnitt'],
      fields: [...C.verhFelder('sicht'), { t: 'out', fn: 'abschnitt', l: UEBERSCHRIFT }]
    }
  ];

  /* ======================= Ausgaben ======================= */
  const text = d => [['', UEBERSCHRIFT, abschnitt(d), 'wetter']];
  const plain = d => UEBERSCHRIFT + '\n' + abschnitt(d);
  const preview = (id, d) => abschnitt(d);
  const lab = (name, k) => { const x = (C.VERH[name] || []).find(e => e[0] === k); return x ? x[1] : ''; };
  /** Eine Zeile für Liste und Übergabe. */
  function kurz(d) {
    const o = C.verhNorm(get(d, 'ort'));
    const nsE = (C.VERH.ns || []).find(e => e[0] === o.nsArt), stE = (C.VERH.nsStaerke || []).find(e => e[0] === o.nsStaerke);
    const ns = o.nsArt === 'kein' ? 'kein Niederschlag' : nsE ? [stE ? stE[nsE[5] ? 3 : 2] : '', nsE[1]].filter(Boolean).join(' ') : '';
    const teile = [lab('licht', o.licht), lab('himmel', o.himmel), ns, has(o.temp) ? `${o.temp} °C` : '', has(o.naesse) ? 'Fahrbahn ' + lab('naesse', o.naesse) : '', (o.winter || []).map(k => lab('winter', k)).join(', '), o.sicht ? 'Sicht ' + lab('sicht', o.sicht) : '', o.verkehr ? 'Verkehr ' + lab('verkehr', o.verkehr) : ''].filter(Boolean);
    return teile.join(' · ') || '– noch nichts angekreuzt –';
  }
  function offen(d) {
    const o = C.verhNorm(get(d, 'ort')), out = [];
    if (!has(o.licht)) out.push('Licht angeben (Tageslicht, Dämmerung, Dunkelheit).');
    else if (o.licht !== 'tag' && !has(o.beleuchtung)) out.push('Bei Dämmerung oder Dunkelheit angeben, ob eine Beleuchtung vorhanden und eingeschaltet war.');
    if (!has(o.nsArt)) out.push('Niederschlag angeben – oder „kein Niederschlag“.');
    else if (o.nsArt !== 'kein' && !has(o.nsStaerke)) out.push('Stärke des Niederschlags angeben (leicht, mäßig, stark).');
    if (!has(o.naesse)) out.push('Zustand der Fahrbahn angeben (trocken, feucht, nass …).');
    if (!has(o.himmel)) out.push('Bewölkung angeben (optional).');
    if (!has(o.temp)) out.push('Lufttemperatur angeben (optional, bei Glätte wichtig).');
    if (!has(o.sicht)) out.push('Sichtverhältnisse angeben (optional).');
    if (!has(o.verkehr)) out.push('Verkehrsaufkommen angeben (optional).');
    return out;
  }
  const personalien = () => 'In diesem Abschnitt werden keine Personalien erfasst.';
  function title(d) {
    const a = get(d, 'aufnahme') || {}, o = C.verhNorm(get(d, 'ort'));
    const k = [lab('licht', o.licht), o.nsArt === 'kein' ? 'trocken' : lab('ns', o.nsArt)].filter(Boolean).join(', ');
    return [UEBERSCHRIFT, k, has(a.datum) ? fmtDate(a.datum) : ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const art = { strasse: 'Straße', parkplatz: 'Parkplatz', parkhaus: 'Parkhaus', sonst: 'Sonstige Fläche' }[get(d, 'ort.art')] || '';
    const z = get(d, 'aufnahme.zeit');
    return [art, has(z) ? str(z) + ' Uhr' : ''].filter(Boolean).join(' · ');
  }
  /** Frühere Fassung dieses Abschnitts (Formularlisten) beim Öffnen auf die aktuelle Struktur heben. */
  function upgrade(data) {
    const o = get(data, 'ort');
    if (!o) return null;
    const n = C.verhNorm(o);
    if (JSON.stringify(n) === JSON.stringify(o)) return null;
    return Object.assign({}, data, { ort: n });
  }

  root.WUnfallort = Object.freeze({
    id: 'unfallort', name: 'Unfallörtlichkeit', short: 'Unfallörtlichkeit', kurz: 'UÖ',
    desc: 'Verhältnisse vor Ort zum Ankreuzen – Licht, Bewölkung, Niederschlag, Temperatur, Nebel, Wind, Fahrbahn, Glätte, Sicht und Verkehr – als ein zusammenhängender Absatz',
    labels: {
      bericht: 'Unfallörtlichkeit',
      kurz: 'Kurzfassung',
      kurzHint: 'Eine Zeile für Liste und Übergabe.',
      offen: 'Fehlt noch',
      offenEmpty: 'Alles für diesen Abschnitt ist erfasst.',
      persHint: 'Dieser Abschnitt enthält keine Personalien.',
      newBtn: 'Unfallörtlichkeit'
    },
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien, title, subtitle, upgrade, abschnitt
  });
})(typeof window !== 'undefined' ? window : globalThis);
