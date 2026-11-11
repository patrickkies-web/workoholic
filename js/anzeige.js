/*
 * Workoholic · Schriftliche Arbeiten · Modul „Strafanzeige“
 * ---------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 * Vorlage für alle Strafanzeigen, Abschnitt für Abschnitt. Teil 1: „Allgemeines/Einsatzanlass“
 *   Am 24.10.2026 um 19:10 Uhr erhielten die Streifenwagenbesatzungen POK Name/PKin Meier - PKin Selieb/PK Kdvfo
 *   folgenden Einsatz: Streitigkeiten vermutlich zwischen einer Frau und einem Mann.
 *   Einsatzörtlichkeit: Am Fichtenbusch 32, in 33378 Rheda-Wiedenbrück (Ortsteil: Rheda).
 * Der feste Wortlaut ist eine Vorlage mit Feldern in {geschweiften Klammern} und lässt sich im Schritt „Vorlage“
 * ändern; neue Vorgänge übernehmen die zuletzt benutzte Vorlage (inherit). Besatzungen: Amtsbezeichnung + Nachname,
 * Personen eines Fahrzeugs mit „/“, Fahrzeuge mit „ - “ getrennt (beides einstellbar). Ein Fahrzeug → Einzahl.
 * Straßen und Ortsteile kommen aus js/strassen-gt.js (window.WGT).
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const str = v => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
  const has = v => str(v) !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const fmtDate = iso => { const m = ISO.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const endDot = s => { s = str(s); return !s ? '' : /[.!?…]$/.test(s) ? s : s + '.'; };
  const PH = t => `[${t}]`;
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(' '); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  const kName = c => [str(c && c.grad), nachname(c && c.name)].filter(Boolean).join(' ');
  const GT = () => root.WGT || { ortsteile: () => [] };

  /* ======================= Vorlage ======================= */
  const DEFAULT_TPL = 'Am {Datum} um {Uhrzeit} Uhr {erhielt} die {Streifenwagenbesatzung} {Besatzungen} folgenden Einsatz: {Einsatz}\nEinsatzörtlichkeit: {Anschrift}.';
  const TOKENS = ['Datum', 'Uhrzeit', 'erhielt', 'Streifenwagenbesatzung', 'Besatzungen', 'Einsatz', 'Anschrift', 'Straße', 'Hausnummer', 'PLZ', 'Ort', 'Ortsteil'];
  const SEP_CREW = [['/', 'POK A/PKin B'], [' / ', 'POK A / PKin B'], [' und ', 'POK A und PKin B'], [', ', 'POK A, PKin B']];
  const SEP_CAR = [[' - ', '… - …'], [' – ', '… – …'], ['; ', '…; …'], [' sowie ', '… sowie …']];
  const sepOf = (v, def) => (typeof v === 'string' && v !== '' ? v : def);

  /** Streifenwagen mit Besatzung (nur Personen mit Namen); leere Fahrzeuge zählen nicht. */
  const wagenL = d => arr(get(d, 'einsatz.wagen')).map(w => arr(w && w.crew).filter(c => c && has(c.name))).filter(c => c.length);
  const ortsteilNoetig = o => GT().ortsteile(str(o.ort)).length > 0;

  function anschrift(o) {
    const strasse = (has(o.strasse) ? str(o.strasse) : PH('Straße')) + (has(o.hausnr) ? ' ' + str(o.hausnr) : '');
    const ort = [str(o.plz), str(o.ort)].filter(Boolean).join(' ') || PH('PLZ Ort');
    const ot = o.ortsteil === '-' ? '' : has(o.ortsteil) ? ` (Ortsteil: ${str(o.ortsteil)})` : ortsteilNoetig(o) ? ` (Ortsteil: ${PH('Ortsteil')})` : '';
    return `${strasse}, in ${ort}${ot}`;
  }
  function werte(d) {
    const e = get(d, 'einsatz') || {}, o = get(d, 'ort') || {}, v = get(d, 'vorlage') || {};
    const W = wagenL(d), mehr = W.length > 1;
    return {
      Datum: has(e.datum) ? fmtDate(e.datum) : PH('Datum'),
      Uhrzeit: has(e.zeit) ? str(e.zeit) : PH('Uhrzeit'),
      erhielt: mehr ? 'erhielten' : 'erhielt',
      Streifenwagenbesatzung: mehr ? 'Streifenwagenbesatzungen' : 'Streifenwagenbesatzung',
      Besatzungen: W.map(c => c.map(kName).join(sepOf(v.sepCrew, '/'))).join(sepOf(v.sepCar, ' - ')) || PH('Besatzung'),
      Einsatz: endDot(e.anlass) || PH('Einsatzanlass') + '.',
      Anschrift: anschrift(o),
      'Straße': has(o.strasse) ? str(o.strasse) : PH('Straße'),
      Hausnummer: str(o.hausnr),
      PLZ: has(o.plz) ? str(o.plz) : PH('PLZ'),
      Ort: has(o.ort) ? str(o.ort) : PH('Ort'),
      Ortsteil: o.ortsteil === '-' ? '' : str(o.ortsteil)
    };
  }
  /** Teil 1 „Allgemeines/Einsatzanlass“ nach der (ggf. angepassten) Vorlage. */
  function allgemein(d) {
    const V = werte(d), tpl = has(get(d, 'vorlage.text')) ? String(get(d, 'vorlage.text')) : DEFAULT_TPL;
    return tpl.replace(/\{([^{}\n]+)\}/g, (m, k) => (k in V ? V[k] : m))
      .replace(/([.!?])\./g, '$1').replace(/[ \t]+/g, ' ').replace(/ ([,.])/g, '$1').split('\n').map(l => l.trim()).join('\n').trim();
  }

  /* ======================= Fragenkatalog ======================= */
  const STEPS = [
    {
      id: 'allgemein', phase: 'Allgemeines', title: 'Allgemeines / Einsatzanlass', lead: 'Wann, welche Besatzungen, welcher Einsatz, wohin. Der Satz steht unten fertig zum Kopieren.', gen: ['allgemein'],
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', req: true },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', req: true },
        { k: 'einsatz.wagen', t: 'streifen', l: 'Streifenwagenbesatzungen', req: true },
        { k: 'einsatz.anlass', t: 'area', l: 'Einsatz', pre: '… folgenden Einsatz:', ph: 'Streitigkeiten vermutlich zwischen einer Frau und einem Mann', rows: 2, max: 600, req: true },
        { k: 'ort', t: 'adresse', l: 'Einsatzörtlichkeit', req: true },
        { t: 'out', fn: 'allgemein', l: 'So steht es in der Anzeige' }
      ]
    },
    {
      id: 'vorlage', phase: 'Vorlage', title: 'Vorlage anpassen', lead: 'Den festen Wortlaut nach Wunsch ändern. Neue Strafanzeigen übernehmen die zuletzt benutzte Vorlage.',
      fields: [
        { k: 'vorlage.text', t: 'area', l: 'Wortlaut (leer = Standard)', h: `Felder: ${TOKENS.map(t => '{' + t + '}').join(' ')}. {erhielt} und {Streifenwagenbesatzung} stehen automatisch in Einzahl oder Mehrzahl.`, ph: DEFAULT_TPL, rows: 5, max: 2000, sugg: [['Standard einsetzen', DEFAULT_TPL]] },
        { k: 'vorlage.sepCrew', t: 'choice', l: 'Zwischen Personen eines Fahrzeugs', o: SEP_CREW },
        { k: 'vorlage.sepCar', t: 'choice', l: 'Zwischen Fahrzeugen', o: SEP_CAR },
        { t: 'out', fn: 'allgemein', l: 'So steht es in der Anzeige' }
      ]
    }
  ];

  /* ======================= Ausgaben ======================= */
  const text = d => [['1', 'Allgemeines/Einsatzanlass', allgemein(d), 'allgemein']];
  const plain = d => 'Allgemeines/Einsatzanlass\n' + allgemein(d);
  const preview = (id, d) => allgemein(d);
  function kurz(d) {
    const e = get(d, 'einsatz') || {}, o = get(d, 'ort') || {};
    const wann = [has(e.datum) ? fmtDate(e.datum) : '', has(e.zeit) ? e.zeit + ' Uhr' : ''].filter(Boolean).join(' ');
    const wo = has(o.strasse) ? `${str(o.strasse)}${has(o.hausnr) ? ' ' + str(o.hausnr) : ''}, ${[str(o.plz), str(o.ort)].filter(Boolean).join(' ')}${has(o.ortsteil) && o.ortsteil !== '-' ? ' (' + str(o.ortsteil) + ')' : ''}` : '';
    return [wann, has(e.anlass) ? str(e.anlass) : '', wo].filter(Boolean).join(' · ') || '– noch nichts erfasst –';
  }
  function offen(d) {
    const e = get(d, 'einsatz') || {}, o = get(d, 'ort') || {}, out = [];
    if (!has(e.datum) || !has(e.zeit)) out.push('Datum und Uhrzeit der Einsatzvergabe eintragen.');
    if (!wagenL(d).length) out.push('Streifenwagenbesatzung eintragen.');
    if (wagenL(d).some(c => c.some(p => !has(p.grad)))) out.push('Amtsbezeichnung bei allen Personen der Besatzung ergänzen.');
    if (!has(e.anlass)) out.push('Einsatzanlass (Text nach „folgenden Einsatz:“) eintragen.');
    if (!has(o.strasse) || !has(o.ort)) out.push('Einsatzörtlichkeit vollständig eintragen (Straße, PLZ, Ort).');
    else if (!has(o.ortsteil) && ortsteilNoetig(o)) out.push('Ortsteil auswählen (oder „ohne Ortsteil“).');
    return out;
  }
  const personalien = () => 'Personalien folgen mit den nächsten Abschnitten der Vorlage.';
  function title(d) {
    const e = get(d, 'einsatz') || {}, a = str(e.anlass);
    return ['Anzeige', a ? (a.length > 48 ? a.slice(0, 47).replace(/\s+\S*$/, '') + ' …' : a) : '', has(e.datum) ? fmtDate(e.datum) : ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const o = get(d, 'ort') || {};
    return [has(o.strasse) ? `${str(o.strasse)}${has(o.hausnr) ? ' ' + str(o.hausnr) : ''}` : '', str(o.ort), has(o.ortsteil) && o.ortsteil !== '-' ? str(o.ortsteil) : ''].filter(Boolean).join(', ');
  }

  /* ======================= Übernahme ======================= */
  /** Besatzung aus der laufenden Schicht (einsatz.kraefte) wird zum ersten Streifenwagen, Amtsbezeichnung aus dem Team. */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  function upgrade(data) {
    if (!data || typeof data !== 'object') return null;
    const k = arr(get(data, 'einsatz.kraefte')).filter(c => c && has(c.name));
    if (!k.length || arr(get(data, 'einsatz.wagen')).length) return null;
    const team = (root.WBridge && typeof root.WBridge.team === 'function' && root.WBridge.team()) || [];
    const rank = n => { const t = team.find(m => str(m.name).toLowerCase() === str(n).toLowerCase()); return t ? (arr(t.roles).find(r => RANK_RE.test(str(r))) || '') : ''; };
    const o = JSON.parse(JSON.stringify(data));
    o.einsatz.wagen = [{ crew: k.map(c => ({ grad: str(c.grad) || rank(c.name), name: str(c.name) })) }];
    delete o.einsatz.kraefte;
    return o;
  }

  root.WAnzeige = Object.freeze({
    id: 'anzeige', name: 'Strafanzeige', short: 'Anzeige', kurz: 'SA',
    desc: 'Vorlage für alle Strafanzeigen · Teil 1: Allgemeines/Einsatzanlass mit Besatzungen aus dem Team und allen Straßen im Kreis Gütersloh',
    labels: {
      bericht: 'Anzeige',
      kurz: 'Kurzfassung',
      kurzHint: 'Eine Zeile für Liste und Übergabe: wann, was, wo.',
      offen: 'Fehlt noch',
      offenEmpty: 'Alles für diesen Abschnitt ist erfasst.',
      persHint: 'Personalien kommen mit den nächsten Abschnitten.',
      newBtn: 'Strafanzeige'
    },
    inherit: ['vorlage'],
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien, title, subtitle, upgrade, allgemein,
    DEFAULT_TPL, TOKENS
  });
})(typeof window !== 'undefined' ? window : globalThis);
