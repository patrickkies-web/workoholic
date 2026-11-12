/*
 * Workoholic · Schriftliche Arbeiten · Abschnitt „Blutprobe“
 * ---------------------------------------------------------------
 * Nur der Abschnitt Blutprobe – ohne Einsatzanlass, ohne Begründung. Zwei kurze Schritte:
 *   1. Anordnung: über Staatsanwaltschaft und Richter (Vorlage) oder ohne Richter nach § 81a Abs. 2 S. 2 StPO
 *      bzw. § 46 Abs. 4 S. 2 OWiG – Uhrzeiten mit „Jetzt“, Kolleginnen und Kollegen aus der Schicht, Namen per ↺ aus früheren Vorgängen.
 *   2. Blutentnahme: Ärztin/Arzt, Ort, je Entnahme Uhrzeit und Venülennummern.
 * Heraus kommen die beiden Abschnitte „Entscheidungsweg zur Anordnung der Blutentnahme“ und „Blutprobe“ mit Abschnittsnummer.
 * Datum nur einmal: Uhrzeiten nach Mitternacht bekommen automatisch den Folgetag.
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gezeichnet.
 */
(function (root) {
  'use strict';
  const has = v => v != null && String(v).trim() !== '';
  const str = v => (v == null ? '' : String(v)).trim();
  const arr = v => (Array.isArray(v) ? v : []);
  const get = (o, p) => p.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const pad = n => String(n).padStart(2, '0');
  const mins = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const B = d => (d && d.bp && typeof d.bp === 'object' ? d.bp : {});
  const ph = l => `[${l}]`;
  const val = (v, l) => (has(v) ? str(v) : ph(l));

  /* Amtsbezeichnung und Nachname (wie in den übrigen Modulen) */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => arr(roles).map(str).find(r => RANK_RE.test(r)) || '';
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  const teamRank = n => { const W = root.WBridge; const t = (W && W.team && W.team()) || []; const k = str(n).toLowerCase(); const p = t.find(x => x && (str(x.name).toLowerCase() === k || nachname(x.name).toLowerCase() === k)); return p ? (str(p.rank) || rankOf(p.roles)) : ''; };
  function canonRank(t) {
    t = str(t); if (!t || t.length > 7) return '';
    const up = t.toUpperCase(); if (RANK_RE.test(up)) return up;
    if (/in$/i.test(t)) { const f = t.slice(0, -2).toUpperCase() + 'in'; if (RANK_RE.test(f)) return f; }
    return '';
  }
  /** „PHK Muster“ aus der Besatzung oder getippt („pok müller“ → „POK Müller“); fehlt die Amtsbezeichnung, steht ein Platzhalter. */
  function kraft(v, l) {
    if (!has(v)) return ph(l);
    const t = str(v).split(/\s+/), g = canonRank(t[0]);
    const name = (g && t.length > 1 ? t.slice(1) : t).join(' ');
    const nn = name === name.toLowerCase() ? name.replace(/(^|[\s-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) : name;
    const r = g || teamRank(nn);
    return `${r || ph('Amtsbezeichnung')} ${r && !g ? nachname(nn) : nn}`;
  }

  /* ======================= Auswahl ======================= */
  const ROLLE = [['bs_m', 'Beschuldigter', 'dem Beschuldigten'], ['bs_w', 'Beschuldigte', 'der Beschuldigten'], ['bt_m', 'Betroffener', 'dem Betroffenen'], ['bt_w', 'Betroffene', 'der Betroffenen']];
  const WEG = [['richter', 'Richter (über StA)'], ['stpo', 'Ohne Richter: Verkehrsstraftat'], ['owi', 'Ohne Richter: OWi § 24a/24c StVG']];
  const DELIKT = [['316', '§ 316 StGB'], ['315c', '§ 315c Abs. 1 Nr. 1a StGB'], ['315a', '§ 315a Abs. 1 Nr. 1 StGB']];
  const DELIKT_OWI = [['24a', '§ 24a StVG'], ['24c', '§ 24c StVG']];
  const lab = (list, k) => { const x = list.find(e => e[0] === k); return x ? x[1] : ''; };
  const weg = d => B(d).weg || 'richter';
  const ort = d => str(get(d, 'bpOrt')) || 'Bielefeld';
  const rolleDat = d => { const x = ROLLE.find(e => e[0] === B(d).rolle); return x ? x[2] : ph('bei wem'); };

  /* ======================= Datum: einmal eintragen, nach Mitternacht Folgetag ======================= */
  function datumsReihe(d) {
    const b = B(d), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(b.datum));
    const times = weg(d) === 'richter' ? [b.sta_t, b.ri_t] : [b.ano_t];
    arr(b.ent).forEach(e => times.push(e && e.zeit));
    const out = []; let day = 0, prev = null;
    for (const t of times) {
      const x = mins(t);
      if (x != null && prev != null && x < prev) day++;
      if (x != null) prev = x;
      if (!m) { out.push(ph('Datum')); continue; }
      const dt = new Date(+m[1], +m[2] - 1, +m[3] + day, 12);
      out.push(`${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`);
    }
    return out;
  }
  /** Abschnittsnummer: „4“ → 4 und 5, „4.1“ → 4.1 und 4.2, leer → ohne Nummer. */
  const cleanNr = s => str(s).replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
  const nextNr = n => (n ? n.replace(/(\d+)$/, x => String(+x + 1)) : '');

  /* ======================= Text ======================= */
  function anordnung(d) {
    const b = B(d), dates = datumsReihe(d), w = weg(d);
    if (w === 'stpo' || w === 'owi') {
      const grund = w === 'stpo'
        ? `Einer richterlichen Anordnung bedurfte es nach § 81a Abs. 2 Satz 2 StPO nicht, da bestimmte Tatsachen den Verdacht einer Straftat nach ${lab(DELIKT, b.delikt) || ph('Straftat')} begründeten.`
        : `Einer richterlichen Anordnung bedurfte es nach § 46 Abs. 4 Satz 2 OWiG nicht, da bestimmte Tatsachen den Verdacht einer Ordnungswidrigkeit nach ${lab(DELIKT_OWI, b.delikt_owi) || ph('§ 24a oder § 24c StVG')} begründeten.`;
      return `Am ${dates[0]}, um ${val(b.ano_t, 'Uhrzeit')} Uhr ordnete ${kraft(b.ano_wer, 'wer')} die Blutentnahme bei ${rolleDat(d)} an. ${grund}`;
    }
    const sta = b.sta_g === 'w' ? ['Staatsanwältin', 'welche'] : b.sta_g === 'm' ? ['Staatsanwalt', 'welcher'] : [ph('Staatsanwältin/Staatsanwalt'), ph('welche/welcher')];
    const ri = b.ri_g === 'w' ? ['Richterin', 'welche'] : b.ri_g === 'm' ? ['Richter', 'welcher'] : [ph('Richterin/Richter'), ph('welche/welcher')];
    return [
      `Am ${dates[0]}, um ${val(b.sta_t, 'Uhrzeit')} Uhr wurde von ${kraft(b.sta_wer, 'wer rief an')} ${val(b.sta_name, 'Name')} (${sta[0]} beim Bereitschaftsdienst der StA ${ort(d)}) erreicht, ${sta[1]} beim AG ${ort(d)} (Konzentrationsgericht) einen Antrag auf Anordnung einer Blutprobe bei ${rolleDat(d)} stellte.`,
      `Am ${dates[1]}, um ${val(b.ri_t, 'Uhrzeit')} Uhr wurde sodann ${val(b.ri_name, 'Name')}, ${ri[0]} des AG ${ort(d)}, erreicht, ${ri[1]} die Blutprobe bei ${rolleDat(d)} anordnete.`
    ].join('\n');
  }
  function entnahme(d) {
    const b = B(d), ent = arr(b.ent).length ? arr(b.ent) : [{}];
    const dates = datumsReihe(d), off = weg(d) === 'richter' ? 2 : 1;
    const datEnt = dates[off] || ph('Datum');
    const lines = [`Die ärztliche Blutentnahme, durchgeführt von ${val(b.arzt, 'Ärztin oder Arzt')}, erfolgte am ${datEnt}, zu den unten benannten Uhrzeiten, in ${val(b.wache, 'Ort der Entnahme')}.`, `Anzahl der Blutentnahmen: ${ent.length}`];
    ent.forEach((e, i) => {
      const ven = str(e && e.ven).split(/[,;\n]+/).map(str).filter(Boolean);
      const anderesDatum = dates[off + i] && dates[off + i] !== datEnt ? `, ${dates[off + i]}` : '';
      lines.push('', `Blutentnahme ${i + 1} (${val(e && e.zeit, 'Uhrzeit')} Uhr${anderesDatum}):`);
      lines.push(ven.length === 1 ? 'Bei der Blutentnahme wurde folgende Venüle befüllt:' : 'Bei der Blutentnahme wurden folgende Venülen befüllt:');
      (ven.length ? ven : [ph('Nummer')]).forEach(v => lines.push(`• Venülennummer: ${v}`));
    });
    return lines.join('\n');
  }
  const nrs = d => { const n = cleanNr(B(d).nr); return [n, nextNr(n)]; };
  const H1 = 'Entscheidungsweg zur Anordnung der Blutentnahme', H2 = 'Blutprobe';
  const text = d => { const [n1, n2] = nrs(d); return [[n1, H1, anordnung(d), 'anord'], [n2, H2, entnahme(d), 'entnahme']]; };
  const plain = d => text(d).map(([n, t, x]) => `${[n, t].filter(Boolean).join(' ')}\n${x}`).join('\n\n');
  const preview = (id, d) => (id === 'anord' ? anordnung(d) : id === 'entnahme' ? entnahme(d) : '');
  const outAnord = d => { const [n1] = nrs(d); return `${[n1, H1].filter(Boolean).join(' ')}\n${anordnung(d)}`; };
  const outEnt = d => { const [, n2] = nrs(d); return `${[n2, H2].filter(Boolean).join(' ')}\n${entnahme(d)}`; };

  /* ======================= Offene Punkte, Kurzfassung, Titel ======================= */
  function offen(d) {
    const b = B(d), w = weg(d), o = [];
    if (!has(b.datum)) o.push('Datum eintragen.');
    if (!has(b.rolle)) o.push('Angeben, bei wem die Blutprobe entnommen wurde (Beschuldigte/r oder Betroffene/r).');
    if (w === 'richter') {
      if (!has(b.sta_t) || !has(b.sta_wer) || !has(b.sta_name) || !has(b.sta_g)) o.push('Staatsanwaltschaft: Uhrzeit, wer angerufen hat, Name und Staatsanwältin/Staatsanwalt eintragen.');
      if (!has(b.ri_t) || !has(b.ri_name) || !has(b.ri_g)) o.push('Gericht: Uhrzeit, Name und Richterin/Richter eintragen.');
    } else {
      if (!has(w === 'stpo' ? b.delikt : b.delikt_owi)) o.push(w === 'stpo' ? 'Verkehrsstraftat angeben (§ 316, § 315c Abs. 1 Nr. 1a oder § 315a Abs. 1 Nr. 1 StGB).' : 'Ordnungswidrigkeit angeben (§ 24a oder § 24c StVG).');
      if (!has(b.ano_t) || !has(b.ano_wer)) o.push('Anordnung: Uhrzeit und anordnende Person eintragen.');
    }
    if (w === 'stpo' && /^bt_/.test(b.rolle || '')) o.push('Bei einer Straftat heißt es „Beschuldigte/r“, nicht „Betroffene/r“.');
    if (w === 'owi' && /^bs_/.test(b.rolle || '')) o.push('Bei einer Ordnungswidrigkeit heißt es „Betroffene/r“, nicht „Beschuldigte/r“.');
    if (!has(b.arzt)) o.push('Ärztin oder Arzt der Blutentnahme eintragen.');
    if (!has(b.wache)) o.push('Ort der Blutentnahme eintragen.');
    const ent = arr(b.ent).length ? arr(b.ent) : [{}];
    ent.forEach((e, i) => {
      if (!has(e && e.zeit)) o.push(`Blutentnahme ${i + 1}: Uhrzeit eintragen.`);
      if (!has(e && e.ven)) o.push(`Blutentnahme ${i + 1}: Venülennummer(n) eintragen.`);
    });
    const aT = mins(w === 'richter' ? b.ri_t : b.ano_t), eT = mins(ent[0] && ent[0].zeit);
    if (aT != null && eT != null && eT < aT && aT - eT < 360) o.push('Die erste Blutentnahme liegt vor der Anordnung – Uhrzeiten prüfen.');
    if ([...anordnung(d).matchAll(/\[Amtsbezeichnung\]/g)].length) o.push('Bei der anordnenden bzw. anrufenden Person fehlt die Amtsbezeichnung (z. B. „PK Müller“).');
    return o;
  }
  function kurz(d) {
    const b = B(d), w = weg(d), ent = arr(b.ent);
    const an = w === 'richter' ? `richterlich angeordnet${has(b.ri_t) ? ' um ' + b.ri_t + ' Uhr' : ''}` : `angeordnet ohne Richter (${w === 'stpo' ? '§ 81a Abs. 2 S. 2 StPO' : '§ 46 Abs. 4 S. 2 OWiG'})${has(b.ano_t) ? ' um ' + b.ano_t + ' Uhr' : ''}`;
    const zeiten = ent.map(e => e && e.zeit).filter(has);
    return ['Blutprobe', an, ent.length ? `${ent.length} Entnahme${ent.length === 1 ? '' : 'n'}${zeiten.length ? ' (' + zeiten.join(', ') + ' Uhr)' : ''}` : ''].filter(Boolean).join(' · ');
  }
  function title(d) {
    const b = B(d), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(b.datum));
    return ['Blutprobe', lab(ROLLE, b.rolle), m ? `${m[3]}.${m[2]}.` : ''].filter(Boolean).join(' · ');
  }
  const subtitle = d => { const w = weg(d); return w === 'richter' ? 'Richter über StA' : w === 'stpo' ? '§ 81a Abs. 2 S. 2 StPO' : '§ 46 Abs. 4 S. 2 OWiG'; };

  /* ======================= Schritte ======================= */
  const isRichter = d => weg(d) === 'richter', isPol = d => weg(d) !== 'richter';
  const STEPS = [
    { id: 'anord', phase: 'Anordnung', title: 'Anordnung der Blutentnahme', lead: 'Wer hat wann angeordnet? Antippen und Uhrzeiten eintragen – der fertige Abschnitt steht unten.', fields: [
      { k: 'bp.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', h: 'Nur einmal eintragen – Uhrzeiten nach Mitternacht bekommen automatisch den Folgetag.' },
      { k: 'bp.nr', t: 'text', l: 'Abschnittsnummer (optional)', ph: 'z. B. 4', w: 'half', inputmode: 'decimal', max: 10, h: 'Der zweite Abschnitt bekommt die nächste Nummer.' },
      { k: 'bp.rolle', t: 'choice', l: 'Blutprobe bei', o: ROLLE.map(([k, l]) => [k, l]), req: true },
      { k: 'bp.weg', t: 'choice', l: 'Wer hat angeordnet?', o: WEG, h: 'Ohne Auswahl gilt der Weg über Staatsanwaltschaft und Richter.' },
      { t: 'head', text: 'Staatsanwaltschaft', h: d => `Bereitschaftsdienst der StA ${ort(d)}`, when: isRichter },
      { k: 'bp.sta_t', t: 'time', l: 'Erreicht um', w: 'half', q: 'jetzt', when: isRichter },
      { k: 'bp.sta_g', t: 'choice', l: 'Staatsanwältin oder Staatsanwalt', w: 'half', o: [['w', 'Staatsanwältin'], ['m', 'Staatsanwalt']], when: isRichter },
      { k: 'bp.sta_name', t: 'text', l: 'Name', ph: 'z. B. Dr. Schmidt', recent: true, max: 80, when: isRichter },
      { k: 'bp.sta_wer', t: 'crewpick', l: 'Wer hat angerufen?', kurz: true, when: isRichter },
      { t: 'head', text: 'Gericht', h: d => `AG ${ort(d)} (Konzentrationsgericht)`, when: isRichter },
      { k: 'bp.ri_t', t: 'time', l: 'Erreicht um', w: 'half', q: 'jetzt', when: isRichter },
      { k: 'bp.ri_g', t: 'choice', l: 'Richterin oder Richter', w: 'half', o: [['w', 'Richterin'], ['m', 'Richter']], when: isRichter },
      { k: 'bp.ri_name', t: 'text', l: 'Name', ph: 'z. B. Weber', recent: true, max: 80, when: isRichter },
      { k: 'bpOrt', t: 'text', l: 'Ort von StA und Amtsgericht', ph: 'Bielefeld', w: 'half', max: 60, h: 'Bleibt für die nächsten Blutproben gespeichert. Leer = Bielefeld.', when: isRichter },
      { k: 'bp.delikt', t: 'choice', l: 'Verdacht einer Straftat nach', o: DELIKT, when: d => weg(d) === 'stpo' },
      { k: 'bp.delikt_owi', t: 'choice', l: 'Verdacht einer Ordnungswidrigkeit nach', o: DELIKT_OWI, when: d => weg(d) === 'owi' },
      { k: 'bp.ano_t', t: 'time', l: 'Angeordnet um', w: 'half', q: 'jetzt', when: isPol },
      { k: 'bp.ano_wer', t: 'crewpick', l: 'Wer ordnete an?', kurz: true, when: isPol },
      { t: 'out', fn: 'outAnord', l: 'So steht es im Bericht' }
    ] },
    { id: 'entnahme', phase: 'Blutentnahme', title: 'Blutentnahme', lead: 'Wer hat entnommen, wo, wann – und welche Venülen. Der fertige Abschnitt steht unten.', fields: [
      { k: 'bp.arzt', t: 'text', l: 'Ärztin oder Arzt', ph: 'z. B. Dr. med. Beispiel', recent: true, max: 100 },
      { k: 'bp.wache', t: 'text', l: 'Wo?', pre: 'in', ph: 'der Polizeiwache Gütersloh', recent: true, max: 120 },
      { k: 'bp.ent', t: 'list', l: 'Blutentnahmen', h: 'Mehrere Venülennummern mit Komma trennen. Eine weitere Entnahme z. B. bei behauptetem Nachtrunk.', item: (it, i) => `Blutentnahme ${i + 1}`, add: 'Weitere Blutentnahme', min1: true, max: 4, sub: [
        { k: 'zeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt' },
        { k: 'ven', t: 'text', l: 'Venülennummer(n)', ph: 'z. B. 1234567, 1234568', w: 'half', max: 200 }
      ] },
      { t: 'out', fn: 'outEnt', l: 'So steht es im Bericht' }
    ] }
  ];

  root.WBP = Object.freeze({
    id: 'blutprobe', name: 'Blutprobe', short: 'Blutprobe', kurz: 'BP',
    desc: 'Nur der Abschnitt Blutprobe: Entscheidungsweg (StA und Richter oder § 81a Abs. 2 S. 2 StPO / § 46 Abs. 4 OWiG) und Blutentnahme mit Uhrzeiten und Venülennummern',
    intro: 'Nur der Abschnitt Blutprobe · Anordnung antippen, Uhrzeiten mit „Jetzt“ · Arzt, Ort, Venülen · zwei fertige Abschnitte zum Kopieren',
    labels: {
      bericht: 'Blutprobe', kurz: 'Kurzfassung', kurzHint: 'Eine Zeile für Vorgang, Liste und Übergabe.',
      offen: 'Fehlt noch', offenEmpty: 'Alles für diesen Abschnitt ist erfasst.',
      persHint: 'Dieser Abschnitt enthält keine Personalien.', newBtn: 'Blutprobe'
    },
    inherit: ['bpOrt'],
    noPreview: true,
    steps: STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien: () => 'In diesem Abschnitt werden keine Personalien erfasst.', title, subtitle,
    outAnord, outEnt,
    _test: { anordnung, entnahme, datumsReihe, nextNr }
  });
})(typeof window !== 'undefined' ? window : globalThis);
