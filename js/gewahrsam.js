/*
 * Workoholic · Schriftliche Arbeiten · Modul „Gewahrsam (PolG NRW)“
 * ---------------------------------------------------------------
 * Gerüst für jede Gewahrsamsart nach § 35 PolG NRW (Abs. 1 Nr. 1–4, Abs. 2, Abs. 3):
 *   • Feststellungen frei (Satzfelder der App, mit Hinweis auf Wertungswörter),
 *   • Folgerungen als fertige Sätze zum Ankreuzen, die sich auf die Feststellungen beziehen,
 *   • Lücken direkt im Satz, Weichen nur dort, wo sich Möglichkeiten rechtlich ausschließen,
 *   • wer etwas angeordnet, ausgesprochen oder ausgeführt hat: Auswahl aus Team, Schicht und diesem Vorgang –
 *     im Text Amtsbezeichnung und Nachname, jeweils mit Uhrzeit,
 *   • Pflichtbausteine für jeden Gewahrsam (§§ 36, 37, 39, 43, 61, 62 PolG NRW, Gewahrsamsvollzugsverordnung),
 *   • am Ende ein fertiger Text, der sich von Hand anpassen lässt.
 * Ausgaben: Bericht, Antrag auf richterliche Entscheidung (§ 417 Abs. 2 FamFG), Zeitleiste mit Frist, offene Punkte.
 * Die Lückentext-Gerüste hängt writer.js über m.mount ein; gespeichert wird ausschließlich über writer.js / WBridge.
 * Orientierungshilfe, keine Rechtsberatung. Nummern und Höchstdauern vor Verwendung am amtlichen Wortlaut prüfen.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const str = v => (v == null ? '' : String(v)).trim();
  const arr = v => (Array.isArray(v) ? v : []);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (o, p) => p.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const pad = n => String(n).padStart(2, '0');
  const fmtD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? `${m[3]}.${m[2]}.${m[1]}` : String(s || ''); };
  const mins = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const joinList = (a, j) => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ` ${j} ` + a[a.length - 1]);
  const clean = v => str(v).replace(/[\s.]+$/, '');
  const tidy = s => s.replace(/,\s*(?=[.,])/g, '').replace(/\s+([.,:;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); };
  const TOK = /\{([A-Za-z]+)\}|\[\[([^\]]+)\]\]|\(\(([a-z0-9_]+)\)\)/g;

  /* Amtsbezeichnung und Nachname für die eingesetzten Kräfte (wie in den übrigen Modulen) */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => arr(roles).map(str).find(r => RANK_RE.test(r)) || '';
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  const teamRank = n => { const B = root.WBridge; const t = (B && B.team && B.team()) || []; const p = t.find(x => x && str(x.name).toLowerCase() === str(n).toLowerCase()); return p ? (str(p.rank) || rankOf(p.roles)) : ''; };
  const DGRADE = ['', 'PKA', 'PKAin', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'EPHK', 'EPHKin', 'KA', 'KAin', 'KK', 'KKin', 'KOK', 'KOKin', 'KHK', 'KHKin', 'EKHK', 'EKHKin', 'PR', 'PRin', 'POR', 'PORin', 'KR', 'KRin'];
  /** „pok“ → „POK“, „pokin“ → „POKin“; keine Amtsbezeichnung → ''. */
  function canonRank(t) {
    t = str(t); if (!t || t.length > 7) return '';
    const up = t.toUpperCase(); if (RANK_RE.test(up)) return up;
    if (/in$/i.test(t)) { const f = t.slice(0, -2).toUpperCase() + 'in'; if (RANK_RE.test(f)) return f; }
    return '';
  }
  /** Getippter Name: „POK Müller“ → { grad: 'POK', name: 'Müller' }. */
  const nameCase = n => (n === n.toLowerCase() ? n.replace(/(^|[\s-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) : n);
  const parseFree = q => { const t = str(q).split(/\s+/); const g = canonRank(t[0]); return g && t.length > 1 ? { grad: g, name: nameCase(t.slice(1).join(' ')) } : { grad: teamRank(q), name: nameCase(str(q)) }; };
  const isKraft = v => v && typeof v === 'object' && !Array.isArray(v) && has(v.name);
  /** Gewählte Person; ältere Entwürfe mit getipptem Namen werden mitgenommen. */
  const kv = v => (isKraft(v) ? v : typeof v === 'string' && has(v) ? parseFree(v) : null);
  /** Im Text: Amtsbezeichnung und Nachname, z. B. „POKin Schulz“. */
  const kraftText = (o, ctx) => `${str(o.grad) || teamRank(o.name) || miss(ctx, 'Amtsbezeichnung ' + nachname(o.name))} ${nachname(o.name)}`;
  /** Wer kommt in Frage: zuerst in diesem Vorgang schon genannt, dann Schicht/Besatzung, dann Team. */
  function pool(data) {
    const out = [], idx = new Map();
    const add = (grad, name, src) => {
      name = str(name); if (!name) return;
      const k = name.toLowerCase(), g = str(grad) || teamRank(name);
      if (idx.has(k)) { const o = idx.get(k); if (!o.grad && g) o.grad = g; return; }
      const o = { grad: g, name, src }; idx.set(k, o); out.push(o);
    };
    Object.values(F(data)).forEach(v => { if (isKraft(v)) add(v.grad, v.name, 'doc'); });
    arr(get(data, 'einsatz.kraefte')).forEach(c => c && add(c.grad, c.name, 'crew'));
    arr(get(data, 'einsatz.wagen')).flatMap(w => arr(w && w.crew)).forEach(c => c && add(c.grad, c.name, 'crew'));
    const B = root.WBridge; ((B && B.team && B.team()) || []).forEach(t => t && add(str(t.rank) || rankOf(t.roles), t.name, 'team'));
    return out;
  }
  function matches(o, q) {
    const qq = str(q).toLowerCase().replace(/\s+/g, ' '); if (!qq) return true;
    const n = str(o.name).toLowerCase(), g = str(o.grad).toLowerCase();
    const hay = [n, ...n.split(/[\s-]+/), `${g} ${nachname(o.name).toLowerCase()}`, `${g} ${n}`];
    return hay.some(h => h.startsWith(qq)) || (qq.length >= 3 && n.includes(qq));
  }

  /* ======================= Satzführung ======================= */
  const GEN = {
    m: { der: 'der Betroffene', den: 'den Betroffenen', des: 'des Betroffenen', dem: 'dem Betroffenen', er: 'er', ihn: 'ihn', ihm: 'ihm', sein: 'sein', seine: 'seine', seiner: 'seiner', seinem: 'seinem', seinen: 'seinen', seines: 'seines' },
    w: { der: 'die Betroffene', den: 'die Betroffene', des: 'der Betroffenen', dem: 'der Betroffenen', er: 'sie', ihn: 'sie', ihm: 'ihr', sein: 'ihr', seine: 'ihre', seiner: 'ihrer', seinem: 'ihrem', seinen: 'ihren', seines: 'ihres' },
    n: { der: 'die betroffene Person', den: 'die betroffene Person', des: 'der betroffenen Person', dem: 'der betroffenen Person', er: 'sie', ihn: 'sie', ihm: 'ihr', sein: 'ihr', seine: 'ihre', seiner: 'ihrer', seinem: 'ihrem', seinen: 'ihren', seines: 'ihres' }
  };
  const LABEL = { m: 'Betroffener', w: 'Betroffene', n: 'Betroffene Person' };
  const F = d => (d && d.gw && typeof d.gw === 'object' ? d.gw : {});
  const gOf = d => { const x = get(d, 'gw.p.geschlecht'); return x === 'm' || x === 'w' ? x : 'n'; };

  /* ======================= Weichen (genau eine Möglichkeit) ======================= */
  /* [Wert, Beschriftung der Schaltfläche, Text im Bericht (Standard: Beschriftung)] */
  const SW = {
    c_gef: { l: 'Gefahr für', o: [['leib', 'Leib'], ['leben', 'Leben'], ['beide', 'Leib und Leben']] },
    c_art: { l: 'Begehung oder Fortsetzung', o: [['beg', 'Begehung'], ['fort', 'Fortsetzung']] },
    c_typ: { l: 'Straftat oder OWi', o: [['st', 'Straftat'], ['owi', 'OWi von erheblicher Bedeutung', 'Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit']] },
    b_wv_bek: { l: 'Art der Bekanntgabe', o: [['pers', 'persönlich', 'persönlich eröffnet und ausgehändigt'], ['and', 'auf andere Weise', 'auf andere Weise bekannt gegeben ([[b_wv_and|wie|l]])']] },
    c_zu: { l: 'Zuführung an', o: [['sorge', 'Sorgeberechtigte', 'die Sorgeberechtigten bzw. die von ihnen bestimmte Einrichtung'], ['ja', 'Jugendamt', 'das Jugendamt']] },
    c_stat: { l: 'Status', o: [['ent', 'entwichen', 'ist {er} aus dem Vollzug entwichen'], ['auss', 'ohne Erlaubnis draußen', 'hält {er} sich ohne Erlaubnis außerhalb der Anstalt auf']] },
    e1_bek: { l: 'Bekanntgabe des Grundes', o: [['sof', 'sofort', 'dabei'], ['spaet', 'später', 'um [[e1_bek_t|Uhrzeit|t|Grund bekannt gegeben]] Uhr, sobald {er} aufnahmefähig war,']] },
    e1_spr: { l: 'Verständigung', o: [['de', 'auf Deutsch', 'in deutscher Sprache'], ['dol', 'Dolmetscher', 'über eine Dolmetscherin oder einen Dolmetscher ([[e1_dol|Sprache, Name]])']] },
    e2_zw: { l: 'Zwang', o: [['ohne', 'ohne Zwang', 'ohne Anwendung von Zwang'], ['mit', 'mit Zwang', 'unter Anwendung unmittelbaren Zwangs durch [[e2_zw_wer|Wer wendete Zwang an?|k]]: [[e2_zw_x|Art, Anlass, Verletzungen, Versorgung|l]]']] },
    e2_fes_g: { l: 'Fesselungsgrund', o: [['ang', 'angreifen', 'Polizeivollzugsbeamte oder Dritte angreifen oder Widerstand leisten'], ['fl', 'fliehen', 'fliehen'], ['selbst', 'sich verletzen', 'sich töten oder verletzen']] },
    e3_art: { l: 'Verwahrung oder Sicherstellung', o: [['verw', 'in Verwahrung', 'in Verwahrung genommen'], ['sich', 'sichergestellt', 'nach § 43 Nr. 3 PolG NRW sichergestellt']] },
    e4: { l: 'Gewahrsamsfähigkeit', o: [
      ['arzt', 'ärztlich festgestellt', 'Die Gewahrsamsfähigkeit wurde um [[e4_t|Uhrzeit|t|Gewahrsamsfähigkeit festgestellt]] Uhr durch [[e4_arzt|Ärztin oder Arzt|l]] festgestellt.'],
      ['nein', 'ärztlich verneint', 'Die Gewahrsamsfähigkeit wurde um [[e4_t|Uhrzeit|t|Gewahrsamsfähigkeit verneint]] Uhr durch [[e4_arzt|Ärztin oder Arzt|l]] verneint. {Der} wurde in [[e4_kh|Krankenhaus|l]] gebracht.'],
      ['kz', 'keine Zweifel', 'Zweifel an der Gewahrsamsfähigkeit bestanden nicht, weil [[e4_kz|Grund|l]].']] },
    e5: { l: 'Benachrichtigung', o: [
      ['selbst', 'selbst benachrichtigt', 'Um [[e5_t|Uhrzeit|t|Benachrichtigung]] Uhr gab [[e5_gel|Wer gab Gelegenheit?|k]] {dem} Gelegenheit, einen Angehörigen oder eine Person {seines} Vertrauens zu benachrichtigen. {Er} benachrichtigte [[e5_wen|wen|l]].'],
      ['pol', 'durch die Polizei', '{Er} war nicht in der Lage, selbst zu benachrichtigen. [[e5_wer|Wer benachrichtigte?|k]] benachrichtigte um [[e5_t|Uhrzeit|t|Benachrichtigung]] Uhr [[e5_wen|wen|l]], da dies {seinem} mutmaßlichen Willen nicht widersprach.'],
      ['verz', 'verzichtet', 'Nach Hinweis durch [[e5_hin|Wer wies hin?|k]] um [[e5_hin_t|Uhrzeit|t|Hinweis auf Benachrichtigung]] Uhr verzichtete {er} ausdrücklich auf eine Benachrichtigung.'],
      ['unt', 'unterblieben', 'Eine Benachrichtigung unterblieb, weil [[e5_unt|Grund|l]].']] },
    e6: { l: 'Richterliche Entscheidung', o: [
      ['herb', 'herbeigeführt', 'Um [[e6_t|Uhrzeit|t|Richter angerufen]] Uhr beantragte [[e6_wer|Wer beantragte?|k]] beim Amtsgericht [[e6_ag|Ort]] die Entscheidung über Zulässigkeit und Fortdauer der Freiheitsentziehung. [[e6_ri|Richterin oder Richter, Name|l]] entschied um [[e6_et|Uhrzeit|t|Richterliche Entscheidung]] Uhr: [[e6_erg|Ergebnis, z. B. Fortdauer bis 08:00 Uhr angeordnet|l]].'],
      ['entb', 'nicht herbeigeführt', 'Eine richterliche Entscheidung wurde nach § 36 Abs. 1 Satz 2 PolG NRW nicht herbeigeführt, weil anzunehmen war, dass sie erst nach Wegfall des Grundes der Maßnahme ergehen würde. Dies entschied [[e6_ent_wer|Wer entschied?|k]] um [[e6_ent_t|Uhrzeit|t|Entscheidung ohne Richter]] Uhr.']] },
  };

  /* ======================= Gerüste je Gewahrsamsart =======================
     Bausteine: p = fester Satz (mit Lücken [[id|Platzhalter|t/d/l|Zeitleiste]], Weichen ((id)), Satzführung {der}),
     ak = Folgerung zum Ankreuzen, grp = mehrere Satzteile zum Ankreuzen in einem Satz, ff = Freifeld, ph = Prüfhinweis.
     dep: Folgerungen erst, wenn die Feststellungen (main) ausgefüllt sind. */
  const V = {
    n1: { short: 'Abs. 1 Nr. 1', sub: 'Schutzgewahrsam', name: 'Schutzgewahrsam', norm: '§ 35 Abs. 1 Nr. 1 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: erforderlich. Die Gefahr droht der Person selbst, z. B. bei Rausch, Desorientierung, Unterkühlung, Verletzung oder Suizidgefahr.',
      secs: [
        { k: 'B', t: 'Feststellungen', sec: 's', lead: 'Nur Tatsachen: was gesehen, gehört, gerochen oder gemessen wurde. Jede Person zeigt sich anders – hier beschreibst du genau diese.', b: [
          { t: 'p', x: 'Bei Eintreffen um [[b_t|Uhrzeit|t|Eintreffen]] Uhr stellte sich die Lage wie folgt dar:' },
          { t: 'ff', id: 'b_fest', l: 'Feststellungen zur Person und zur Umgebung', ph: 'z. B. Der Mann stand vor dem Eingang und musste sich an der Hauswand abstützen …', q: 'Wo und in welcher Haltung angetroffen? Reaktion auf Ansprache, Berührung, Schmerzreiz? Orientiert zu Ort, Zeit, Person? Sprache? Steh- und Gehfähigkeit? Geruch, Pupillen, Gesichtsfarbe? Verletzungen, Erbrochenes? Kleidung, Witterung, Temperatur? Äußerungen wörtlich. Verhalten gegenüber den Einsatzkräften. Atemalkoholtest (freiwillig) mit Wert und Uhrzeit. Angaben Dritter.' }
        ] },
        { k: 'C', t: 'Würdigung', sec: 'r', dep: true, lead: 'Folgerungen ankreuzen. Sie beziehen sich ausdrücklich auf deine Feststellungen.', b: [
          { t: 'p', x: 'Aufgrund der vorstehend beschriebenen Feststellungen war von Folgendem auszugehen:' },
          { t: 'ak', id: 'c_will', x: '{Der} befand sich erkennbar in einem Zustand, der die freie Willensbestimmung ausschloss. {Er} war nicht in der Lage, die Gefahren {seiner} Lage zu erkennen und sich danach zu verhalten.' },
          { t: 'ak', id: 'c_hilf', x: '{Der} befand sich in einer hilflosen Lage, aus der {er} sich aus eigener Kraft nicht befreien konnte.' },
          { t: 'ak', id: 'c_urs', x: 'Als Ursache des Zustandes kam nach den Feststellungen [[c_urs_x|Ursache, z. B. eine erhebliche Alkoholisierung|l]] in Betracht.' },
          { t: 'p', x: 'Für {den} bestand eine konkrete Gefahr für ((c_gef)).' },
          { t: 'grp', lead: 'Ohne polizeiliches Einschreiten war damit zu rechnen, dass {er}', join: 'oder', tail: '.', miss: 'drohende Folge', items: [
            ['g_sturz', 'infolge der eingeschränkten Steh- und Gehfähigkeit stürzt und sich erheblich verletzt'],
            ['g_verk', 'in den fließenden Verkehr gerät und von einem Fahrzeug erfasst wird'],
            ['g_kalt', 'bei einer Außentemperatur von [[g_temp|Temperatur]] °C auskühlt'],
            ['g_asp', 'bei herabgesetzten Schutzreflexen Erbrochenes einatmet'],
            ['g_selbst', 'sich selbst verletzt oder tötet'],
            ['g_eig', '[[g_eig_x|eigene Formulierung|l]]']] },
          { t: 'ak', id: 'c_frei', x: 'Anhaltspunkte dafür, dass {der} die Gefahr frei und eigenverantwortlich in Kauf nahm, lagen nicht vor.' },
          { t: 'ph', x: 'Eine freiverantwortliche Selbstgefährdung eines einsichtsfähigen Erwachsenen trägt keinen Schutzgewahrsam.' },
          { t: 'ff', id: 'c_suiz', when: f => f.g_selbst, np: true, lead: 'Zu einer möglichen Selbsttötung stellten die Einsatzkräfte fest:', l: 'Äußerungen und Anzeichen zur Selbsttötung', ph: 'z. B. Er sagte: „Ich spring gleich da runter.“', q: 'Wörtliche Äußerungen, Plan, Mittel, Zeitpunkt, frühere Versuche.' },
          { t: 'ak', id: 'c_suiz1', when: f => f.g_selbst, x: 'Es war davon auszugehen, dass die geäußerte Absicht nicht auf einer freien, unbeeinflussten Willensbildung beruhte, sondern auf einer akuten Ausnahmesituation.' },
          { t: 'ak', id: 'c_suiz2', when: f => f.g_selbst, x: 'Wegen Anzeichen einer psychischen Erkrankung verständigte [[c_ob_wer|Wer verständigte?|k]] um [[c_ob_t|Uhrzeit|t|Ordnungsbehörde verständigt]] Uhr die örtliche Ordnungsbehörde ([[c_ob|Behörde, Ansprechperson|l]]) zur Prüfung einer sofortigen Unterbringung nach § 14 PsychKG NRW. Der Gewahrsam sollte bis zu deren Entscheidung andauern.' },
          { t: 'ak', id: 'c_nr2', np: true, x: 'Darüber hinaus war der Gewahrsam auf § 35 Abs. 1 Nr. 2 PolG NRW zu stützen, weil [[c_nr2_x|drohende Straftat und Tatsachen|l]].' }
        ] },
        { k: 'D', t: 'Erforderlichkeit, Zweck, Dauer', sec: 'r', dep: true, lead: 'Welche milderen Mittel schieden aus, und bis wann soll der Gewahrsam dauern?', b: [
          { t: 'p', np: true, ow: f => f.d_ang || f.d_wohn || f.d_med, x: 'Mildere, gleich geeignete Mittel standen nicht zur Verfügung.' },
          { t: 'ak', id: 'd_ang', x: 'Eine Übergabe an Angehörige oder eine andere zur Betreuung bereite Person schied aus, weil [[d_ang_x|Grund|l]].' },
          { t: 'ak', id: 'd_wohn', x: 'Ein Verbringen in die eigene Wohnung schied aus, weil [[d_wohn_x|Grund|l]].' },
          { t: 'ak', id: 'd_med', x: 'Eine stationäre medizinische Versorgung kam nicht in Betracht: [[d_med_x|Ergebnis Rettungsdienst oder Notarzt, wer, wann|l]].' },
          { t: 'ph', x: 'Medizinischer Bedarf geht vor. Wer behandlungsbedürftig ist, gehört ins Krankenhaus und nicht in die Zelle.' },
          { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 1 PolG NRW war daher zum Schutz {des} erforderlich. Er war auch angemessen, weil der vorübergehende Entzug der Freiheit hinter dem Schutz der bedrohten Rechtsgüter zurücktritt. Er sollte nur so lange andauern, bis [[d_zweck|Zweck, z. B. wieder steh- und gehfähig und orientiert|l]].' }
        ] }
      ],
      rules: f => {
        const r = [];
        if (!f.c_will && !f.c_hilf) r.push('Würdigung: kein Zustand angekreuzt. Eine freiverantwortliche Selbstgefährdung trägt keinen Schutzgewahrsam.');
        if (!f.d_ang && !f.d_wohn && !f.d_med) r.push('Erforderlichkeit: kein milderes Mittel geprüft (Angehörige, Wohnung, Rettungsdienst).');
        if (f.g_selbst && !f.c_suiz2) r.push('Suizidgefahr angekreuzt: Ordnungsbehörde zur Prüfung nach dem PsychKG NRW verständigen.');
        if (f.c_nr2) r.push('Zweitstütze Nr. 2: Prognose und Unerlässlichkeit zusätzlich begründen (Gerüst Abs. 1 Nr. 2).');
        return r;
      } },

    n2: { short: 'Abs. 1 Nr. 2', sub: 'Verhinderung', name: 'Verhinderungsgewahrsam', norm: '§ 35 Abs. 1 Nr. 2 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Eine Straftat oder eine Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit steht unmittelbar bevor oder wird fortgesetzt.',
      secs: [
        { k: 'B', t: 'Tatsachen für die Prognose', sec: 's', lead: 'Nur aktuelle Tatsachen aus dieser Situation. Frühere Taten oder Erkenntnisse allein tragen keine Prognose.', b: [
          { t: 'p', x: 'Bei Eintreffen um [[b_t|Uhrzeit|t|Eintreffen]] Uhr stellten die Einsatzkräfte Folgendes fest:' },
          { t: 'ff', id: 'b_fest', l: 'Tatsachen zur drohenden Tat', ph: 'z. B. Sie rief in Richtung des Fensters: „Komm runter, ich stech dich ab!“ …', q: 'Was hat die Person wörtlich gesagt? Gegen wen richtet es sich, und wo ist diese Person? Mitgeführte Gegenstände? Was ist unmittelbar vorher passiert? Hat sie nach Ansprache weitergemacht? Erkenntnisse aus Abfragen nur ergänzend.' }
        ] },
        { k: 'C', t: 'Würdigung', sec: 'r', dep: true, lead: 'Welche Tat drohte, und woraus folgt, dass sie unmittelbar bevorstand?', b: [
          { t: 'p', x: 'Aufgrund dieser Tatsachen stand die ((c_art)) einer ((c_typ)) unmittelbar bevor, nämlich [[c_delikt|Delikt im Genitiv mit Norm, z. B. einer gefährlichen Körperverletzung (§ 224 StGB)|l]] zum Nachteil [[c_opfer|wessen|l]].' },
          { t: 'p', when: f => f.c_typ === 'owi', x: 'Die erhebliche Bedeutung für die Allgemeinheit ergab sich daraus, dass [[c_owi_x|Begründung|l]].' },
          { t: 'grp', lead: 'Die Tat stand unmittelbar bevor. Nach den Umständen war mit an Sicherheit grenzender Wahrscheinlichkeit damit zu rechnen, dass der Schaden sofort oder in allernächster Zeit eintritt, weil', join: 'und', tail: '.', miss: 'Tatsachen für die Unmittelbarkeit', items: [
            ['p_ank', '{der} die Tat ausdrücklich angekündigt hatte'],
            ['p_ggst', '{er} zur Tatausführung geeignete Gegenstände bei sich führte, nämlich [[p_ggst_x|Gegenstände|l]]'],
            ['p_vor', '{er} unmittelbar zuvor gleichartige Handlungen begangen hatte und nichts auf ein Abstandnehmen hindeutete'],
            ['p_fort', '{er} {sein} Verhalten trotz Ansprache und Aufforderung fortsetzte'],
            ['p_err', 'die gefährdete Person für {ihn} ohne Weiteres erreichbar war']] },
          { t: 'ph', x: 'Bei einer Ordnungswidrigkeit reicht nicht jede: Die erhebliche Bedeutung für die Allgemeinheit ist im Einzelfall zu begründen.' }
        ] },
        { k: 'D', t: 'Unerlässlichkeit, Zweck, Dauer', sec: 'r', dep: true, lead: 'Warum reichten mildere Mittel nicht, und bis wann soll der Gewahrsam dauern?', b: [
          { t: 'p', np: true, ow: f => f.d_ga || f.d_pv || f.d_pv0 || f.d_si || f.d_beg, x: 'Der Gewahrsam war unerlässlich. Mildere Mittel reichten nicht aus:' },
          { t: 'ak', id: 'd_ga', x: 'Eine Gefährderansprache durch [[d_ga_wer|Wer sprach an?|k]] um [[d_ga_t|Uhrzeit|t|Gefährderansprache]] Uhr blieb ohne Wirkung: [[d_ga_x|Reaktion|l]].' },
          { t: 'ak', id: 'd_pv', x: 'Ein Platzverweis, den [[d_pv_wer|Wer sprach ihn aus?|k]] um [[d_pv_t|Uhrzeit|t|Platzverweis ausgesprochen]] Uhr aussprach, blieb erfolglos, weil [[d_pv_x|Grund|l]].' },
          { t: 'ak', id: 'd_pv0', x: 'Ein Platzverweis kam nicht in Betracht, weil [[d_pv0_x|Grund|l]].' },
          { t: 'ak', id: 'd_si', x: 'Die Sicherstellung [[d_si_g|Gegenstand im Genitiv, z. B. des Messers]] durch [[d_si_wer|Wer stellte sicher?|k]] allein beseitigte die Gefahr nicht, weil [[d_si_x|Grund|l]].' },
          { t: 'ak', id: 'd_beg', x: 'Eine Übergabe an Begleitpersonen schied aus, weil [[d_beg_x|Grund|l]].' },
          { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 2 PolG NRW sollte andauern, bis [[d_zweck|Zweck, z. B. Ende der Veranstaltung|l]], längstens bis [[d_bis|Datum, Uhrzeit]].' },
          { t: 'ph', x: 'Wurde bereits eine Straftat begangen, laufen Festnahme nach StPO und Gewahrsam nebeneinander: beides getrennt begründen, Strafanzeige fertigen. Über das Ende des Folgetages hinaus nur mit richterlicher Anordnung (§ 38 PolG NRW).' }
        ] }
      ],
      rules: f => {
        const r = [];
        if (!f.d_ga && !f.d_pv && !f.d_pv0 && !f.d_si && !f.d_beg) r.push('Unerlässlichkeit: kein milderes Mittel geprüft.');
        if (f.c_typ === 'owi') r.push('Ordnungswidrigkeit: die erhebliche Bedeutung für die Allgemeinheit im Einzelfall begründen.');
        return r;
      } },

    n3: { short: 'Abs. 1 Nr. 3', sub: 'Platzverweis', name: 'Durchsetzung eines Platzverweises', norm: '§ 35 Abs. 1 Nr. 3 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Zuerst den Platzverweis selbst dokumentieren, dann die Missachtung.',
      secs: [
        { k: 'B1', t: 'Der Platzverweis', sec: 's', lead: 'Wer hat wann was angeordnet, und welche Gefahr sollte abgewehrt werden?', b: [
          { t: 'p', x: 'Um [[b_pv_t|Uhrzeit|t|Platzverweis erteilt]] Uhr erteilte [[b_pv_wer|Wer erteilte ihn?|k]] {dem} einen Platzverweis nach § 34 Abs. 1 PolG NRW. {Ihm} wurde aufgegeben, [[b_pv_ber|Bereich, genau bezeichnet|l]] zu verlassen und bis [[b_pv_bis|Datum, Uhrzeit]] nicht wieder zu betreten. Der Platzverweis diente der Abwehr folgender Gefahr:' },
          { t: 'ff', id: 'b_pv_gef', l: 'Gefahr, die der Platzverweis abwehren sollte', ph: 'z. B. Sie hatte am Bierstand eine andere Besucherin zweimal gegen die Schulter gestoßen …', q: 'Was war passiert? Welche Gefahr drohte am Ort? Wer war betroffen?' },
          { t: 'ak', id: 'b_pv_bek', np: true, x: 'Die Anordnung wurde {ihm} mündlich, klar und in verständlicher Sprache bekannt gegeben. {Er} ließ erkennen, dass {er} sie verstanden hatte: [[b_pv_reak|Reaktion|l]].' },
          { t: 'ak', id: 'b_pv_ank', x: 'Für den Fall der Nichtbefolgung kündigte [[b_pv_ank_wer|Wer kündigte an?|k]] {ihm} die Ingewahrsamnahme an.' },
          { t: 'ph', x: 'Die Ankündigung ist nicht ausdrücklich vorgeschrieben, belegt aber, dass der Gewahrsam das letzte Mittel war. Der Platzverweis muss selbst rechtmäßig sein: Bereich und Dauer konkret, nur vorübergehend.' }
        ] },
        { k: 'B2', t: 'Die Missachtung', sec: 's', lead: 'Was genau tat die Person entgegen der Anordnung?', b: [
          { t: 'p', x: 'Um [[b_mis_t|Uhrzeit|t|Missachtung festgestellt]] Uhr stellte [[b_mis_wer|Wer stellte es fest?|k]] fest, dass {der} dem Platzverweis nicht nachkam:' },
          { t: 'ff', id: 'b_fest', l: 'Was genau, wo, wie oft', ph: 'z. B. Sie stand erneut am Bierstand und rief der Besucherin zu: „Wir sind noch nicht fertig!“ …', q: 'Wo wurde die Person angetroffen? Was tat sie? Wurde sie bereits aus dem Bereich gebracht? Was sagte sie wörtlich?' }
        ] },
        { k: 'D', t: 'Unerlässlichkeit, Dauer', sec: 'r', dep: true, lead: 'Warum reichte es nicht, die Person aus dem Bereich zu bringen?', b: [
          { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 3 PolG NRW war unerlässlich, um den Platzverweis durchzusetzen.' },
          { t: 'ak', id: 'd_uz', x: 'Eine Durchsetzung durch unmittelbaren Zwang, etwa durch Verbringen aus dem Bereich, reichte nicht aus, weil [[d_uz_x|Grund, z. B. bereits einmal verbracht und zurückgekehrt|l]].' },
          { t: 'ak', id: 'd_rueck', x: '{Er} kündigte an, zurückzukehren: [[d_rueck_x|wörtliche Äußerung|l]].' },
          { t: 'p', x: 'Der Gewahrsam sollte andauern, bis [[d_zweck|Zweck, z. B. Ende der Veranstaltung|l]], längstens bis zum Ablauf des Platzverweises.' }
        ] }
      ],
      rules: f => {
        const r = [];
        if (!f.b_pv_bek) r.push('Bekanntgabe des Platzverweises nicht dokumentiert. Ohne wirksame Anordnung kein Durchsetzungsgewahrsam.');
        if (!f.d_uz && !f.d_rueck) r.push('Unerlässlichkeit: Warum reichte das Verbringen aus dem Bereich nicht?');
        return r;
      } },

    n4: { short: 'Abs. 1 Nr. 4', sub: 'Wohnungsverweisung', name: 'Durchsetzung von Wohnungsverweisung oder Rückkehrverbot', norm: '§ 35 Abs. 1 Nr. 4 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Erst die Verfügung nach § 34a, dann die Missachtung.',
      secs: [
        { k: 'B1', t: 'Die Verfügung', sec: 's', lead: 'Daten der Wohnungsverweisung und des Rückkehrverbots.', b: [
          { t: 'p', x: 'Mit Verfügung vom [[b_wv_d|Datum|d]], [[b_wv_t|Uhrzeit|t|Wohnungsverweisung verfügt]] Uhr, verwies [[b_wv_wer|Wer verfügte?|k]] {den} nach § 34a PolG NRW aus der Wohnung [[b_wv_adr|Anschrift|l]] und [[b_wv_umg|unmittelbare Umgebung, genau bezeichnet|l]]. Ein Rückkehrverbot besteht bis [[b_wv_bis|Datum, Uhrzeit]]. Die Verfügung wurde {ihm} am [[b_wv_bekd|Datum|d]] ((b_wv_bek)).' }
        ] },
        { k: 'B2', t: 'Die Missachtung', sec: 's', lead: 'Was genau stellten die Einsatzkräfte fest?', b: [
          { t: 'p', x: 'Am [[b_mis_d|Datum|d]] um [[b_mis_t|Uhrzeit|t|Missachtung festgestellt]] Uhr stellte [[b_mis_wer|Wer stellte es fest?|k]] Folgendes fest:' },
          { t: 'ff', id: 'b_fest', l: 'Rückkehr oder Verbleib, Verhalten, Angaben der gefährdeten Person', ph: 'z. B. Er stand im Treppenhaus vor der Wohnungstür und klingelte wiederholt …', q: 'Wo wurde die Person angetroffen? Wie ist sie in den Bereich gelangt? Was sagte sie wörtlich? Was berichtet die gefährdete Person? Frühere Rückkehr?' }
        ] },
        { k: 'D', t: 'Unerlässlichkeit, Dauer', sec: 'r', dep: true, lead: 'Warum reichte es nicht, die Person aus dem Bereich zu bringen?', b: [
          { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 4 PolG NRW war unerlässlich, um die Wohnungsverweisung und das Rückkehrverbot durchzusetzen.' },
          { t: 'ak', id: 'd_verbr', x: 'Ein Verbringen aus dem Bereich reichte nicht aus, weil [[d_verbr_x|Grund|l]].' },
          { t: 'ak', id: 'd_rueck4', x: 'Es war damit zu rechnen, dass {er} unmittelbar zurückkehrt, weil [[d_rueck4_x|Tatsachen|l]].' },
          { t: 'p', x: 'Der Gewahrsam sollte andauern, bis [[d_zweck|Zweck|l]], längstens bis zum Ablauf des Rückkehrverbots.' },
          { t: 'ph', x: 'Droht erneut Gewalt, zusätzlich Abs. 1 Nr. 2 prüfen. Straftaten (z. B. Hausfriedensbruch, Bedrohung, Verstoß gegen eine gerichtliche Anordnung nach § 4 GewSchG) gesondert anzeigen.' }
        ] }
      ],
      rules: f => (!f.d_verbr && !f.d_rueck4 ? ['Unerlässlichkeit: Warum reichte das Verbringen aus dem Bereich nicht?'] : []) },

    a2: { short: 'Abs. 2', sub: 'Minderjährige', name: 'Minderjährige, die sich der Obhut entzogen haben', norm: '§ 35 Abs. 2 PolG NRW', main: 'b_fest',
      lead: 'Zweck ist allein die Zuführung. Der Gewahrsam endet mit der Übergabe.',
      secs: [
        { k: 'B', t: 'Feststellungen', sec: 's', lead: 'Alter, Obhut, Vermisstenmeldung.', b: [
          { t: 'p', x: '{Der} ist [[b_alter|Alter]] Jahre alt und damit minderjährig (festgestellt durch [[b_idf|Ausweis oder Abfrage|l]]). {Er} hatte sich der Obhut der Sorgeberechtigten entzogen:' },
          { t: 'ff', id: 'b_fest', l: 'Obhut entzogen', ph: 'z. B. Die Wohngruppe hatte sie um 19:30 Uhr als vermisst gemeldet …', q: 'Vermisstenmeldung von wem und wann? Wo soll sich die Person aufhalten (Elternhaus, Wohngruppe)? Was sagen die Sorgeberechtigten? Eigene Angaben.' }
        ] },
        { k: 'C', t: 'Zweck und Verhältnismäßigkeit', sec: 'r', dep: true, lead: 'An wen wird übergeben, und warum ging es nicht ohne Gewahrsam?', b: [
          { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 2 PolG NRW diente der Zuführung an ((c_zu)) ([[c_zu_n|Name, Stelle|l]]).' },
          { t: 'ak', id: 'd_ohne', x: 'Eine Rückkehr oder Begleitung ohne Gewahrsam war nicht möglich, weil [[d_ohne_x|Grund|l]].' },
          { t: 'ak', id: 'd_kwg', x: 'Es lagen Anhaltspunkte für eine Gefährdung des Kindeswohls vor: [[d_kwg_x|Tatsachen|l]]. [[d_kwg_wer|Wer verständigte?|k]] verständigte um [[d_kwg_t|Uhrzeit|t|Jugendamt verständigt]] Uhr das Jugendamt zur Prüfung einer Inobhutnahme nach § 42 SGB VIII.' },
          { t: 'p', x: '{Der} wurde um [[d_ueb_t|Uhrzeit|t|Übergabe]] Uhr durch [[d_ueb_wer|Wer übergab?|k]] an [[d_ueb|wen|l]] übergeben.' },
          { t: 'ph', x: 'Nur bis zur Übergabe. Sorgeberechtigte sind in jedem Fall zu benachrichtigen (E5). Unterbringung möglichst nicht in der Gewahrsamszelle und getrennt von Erwachsenen.' }
        ] }
      ],
      rules: f => {
        const r = [];
        if (!f.d_ohne) r.push('Verhältnismäßigkeit: Warum ging es nicht ohne Gewahrsam?');
        if (has(f.b_alter) && +f.b_alter >= 18) r.push('§ 35 Abs. 2 gilt nur für Minderjährige.');
        return r;
      } },

    a3: { short: 'Abs. 3', sub: 'Entwichene', name: 'Aus dem Vollzug Entwichene', norm: '§ 35 Abs. 3 PolG NRW', main: 'b_fest',
      lead: 'Zweck ist das Zurückbringen in die Anstalt. Entscheidend sind die sichere Identität und die Bestätigung durch die Anstalt.',
      secs: [
        { k: 'B', t: 'Antreffen und Identität', sec: 's', lead: 'Woran war die Identität zweifelsfrei zu erkennen?', b: [
          { t: 'p', x: '{Der} wurde um [[b_t|Uhrzeit|t|Antreffen]] Uhr [[b_ort|Ort, z. B. im Eingangsbereich des Geschäfts|l]] angetroffen. {Seine} Identität stand aufgrund folgender Feststellungen zweifelsfrei fest:' },
          { t: 'ff', id: 'b_fest', l: 'Identität', ph: 'z. B. Er wies sich mit seinem Personalausweis aus; das Lichtbild stimmte überein …', q: 'Ausweis, Lichtbildabgleich, Fingerabdruck, besondere Merkmale, Ergebnis der Fahndungsabfrage.' }
        ] },
        { k: 'C', t: 'Entweichen und Rückführung', sec: 'r', dep: true, lead: 'Quelle, Status und Bestätigung durch die Anstalt.', b: [
          { t: 'p', x: 'Nach [[c_quelle|Fahndungsnotierung oder Mitteilung der Anstalt|l]] ((c_stat)) ([[c_haft|Haftart, Anstalt, Umstände|l]]). Dies bestätigte [[c_best|Name, Anstalt|l]] um [[c_best_t|Uhrzeit|t|Bestätigung der Anstalt]] Uhr gegenüber [[c_best_ggu|Wem gegenüber?|k]].' },
          { t: 'p', x: '{Der} wurde daher nach § 35 Abs. 3 PolG NRW in Gewahrsam genommen und um [[c_rueck_t|Uhrzeit|t|Rückführung]] Uhr durch [[c_rueck_wer|Wer brachte zurück?|k]] in die [[c_anst|Anstalt]] zurückgebracht.' },
          { t: 'ph', x: 'Liegt ein Vollstreckungs- oder Sicherungshaftbefehl vor, wird er vollzogen (eigene Formvorschriften in der FE-Prüfung). Bei Unterbringung nach PsychKG oder Betreuungsrecht: Vollzugshilfe für die zuständige Behörde.' }
        ] }
      ],
      rules: () => [] }
  };
  const ORDER = ['n1', 'n2', 'n3', 'n4', 'a2', 'a3'];

  /* ======================= Pflichtbausteine für jeden Gewahrsam ======================= */
  const E = {
    E1: { k: 'E1', t: 'Ingewahrsamnahme und Grund', n: '§ 37 PolG NRW', b: [
      { t: 'p', x: 'Am [[e1_d|Datum|d]] um [[e1_t|Uhrzeit|t|Ingewahrsamnahme]] Uhr wurde {der} auf Anordnung von [[e1_ano|Wer ordnete an?|k]] in Gewahrsam genommen. [[e1_wer|Wer sprach sie aus?|k]] erklärte {dem} die Ingewahrsamnahme; der Grund wurde {ihm} ((e1_bek)) bekannt gegeben.' },
      { t: 'ak', id: 'e1_wdh', x: 'Wegen {seines} Zustandes war zweifelhaft, ob {er} die Erklärung verstand. [[e1_wdh_wer|Wer wiederholte?|k]] wiederholte sie um [[e1_wdh_t|Uhrzeit|t|Bekanntgabe wiederholt]] Uhr.' },
      { t: 'p', x: 'Die Verständigung erfolgte ((e1_spr)).' }
    ] },
    E2: { k: 'E2', t: 'Zwang und Fesselung', n: '§§ 61, 62 PolG NRW', b: [
      { t: 'p', x: 'Die Ingewahrsamnahme erfolgte ((e2_zw)).' },
      { t: 'ak', id: 'e2_andr', when: f => f.e2_zw === 'mit', x: 'Der unmittelbare Zwang wurde zuvor um [[e2_andr_t|Uhrzeit|t|Zwang angedroht]] Uhr durch [[e2_andr_wer|Wer drohte an?|k]] angedroht.' },
      { t: 'ak', id: 'e2_andr_no', when: f => f.e2_zw === 'mit', x: 'Eine Androhung unterblieb, weil [[e2_andr_x|Grund, z. B. sofortiger Angriff|l]].' },
      { t: 'ak', id: 'e2_fes', x: 'Um [[e2_fes_t|Uhrzeit|t|Fesselung]] Uhr fesselte [[e2_fes_wer|Wer fesselte?|k]] {den}, weil Tatsachen die Annahme rechtfertigten, dass {er} ((e2_fes_g)) würde: [[e2_fes_x|Tatsachen|l]].' },
      { t: 'ph', x: 'Unmittelbarer Zwang ist vorher anzudrohen, soweit die Umstände es zulassen. Verletzten ist Beistand zu leisten und ärztliche Hilfe zu verschaffen.' }
    ] },
    E3: { k: 'E3', t: 'Durchsuchung und Verwahrung', n: '§§ 39, 43 PolG NRW', b: [
      { t: 'p', x: '{Der} wurde um [[e3_t|Uhrzeit|t|Durchsuchung]] Uhr durch [[e3_wer|Wer durchsuchte?|k]] nach § 39 Abs. 1 Nr. 1 PolG NRW durchsucht, da {er} festgehalten werden konnte.' },
      { t: 'ak', id: 'e3_ggs', x: 'Dabei wurden ((e3_art)): [[e3_ggs_x|Gegenstände|l]].' },
      { t: 'ak', id: 'e3_ag', x: 'Die Durchsuchung erfolgte durch eine Person anderen Geschlechts, weil dies zum Schutz vor einer Gefahr für Leib oder Leben sofort erforderlich war: [[e3_ag_x|Grund|l]].' }
    ] },
    E4: { k: 'E4', t: 'Gewahrsamsfähigkeit', n: 'Gewahrsamsvollzugsverordnung NRW', b: [
      { t: 'p', x: '((e4))' },
      { t: 'ph', x: 'Bei Alkohol, Drogen, Verletzungen, Medikamenten oder Bewusstseinsstörung ärztlich klären lassen. Nicht gewahrsamsfähig ist, wer bewusstlos, nicht ansprechbar oder sofort behandlungsbedürftig ist oder Entzugszeichen zeigt.' }
    ] },
    E5: { k: 'E5', t: 'Benachrichtigung', n: '§ 37 PolG NRW', b: [
      { t: 'p', x: '((e5))' },
      { t: 'ak', id: 'e5_sorge', x: '[[e5_sorge_wer|Wer benachrichtigte?|k]] benachrichtigte um [[e5_sorge_t|Uhrzeit|t|Sorgeberechtigte benachrichtigt]] Uhr die Sorgeberechtigten bzw. die Betreuerin oder den Betreuer ([[e5_sorge_n|Name, Stelle|l]]).' },
      { t: 'ph', x: 'Bei Minderjährigen und Betreuten sind Sorgeberechtigte bzw. Betreuer in jedem Fall unverzüglich zu benachrichtigen. Minderjährige erkennt das Gerüst am Geburtsdatum.' }
    ] },
    E6: { k: 'E6', t: 'Richterliche Entscheidung', n: '§ 36 PolG NRW, Art. 104 Abs. 2 GG', b: [
      { t: 'p', x: '((e6))' },
      { t: 'ff', id: 'e6_prog', when: f => f.e6 === 'entb', lead: 'Dem lag folgende Prognose zugrunde:', l: 'Prognose', ph: 'z. B. Nach Einschätzung der Ärztin war mit einer Ausnüchterung bis etwa 07:00 Uhr zu rechnen …', q: 'Wann sollte der Grund entfallen? Wann wäre eine Entscheidung einschließlich Anhörung zu erwarten gewesen (Erreichbarkeit des Bereitschaftsdienstes)?' },
      { t: 'ak', id: 'e6_nach', when: f => f.e6 === 'entb', x: 'Als absehbar wurde, dass der Gewahrsam länger andauert als angenommen, beantragte [[e6_nach_wer|Wer beantragte?|k]] die richterliche Entscheidung um [[e6_nach_t|Uhrzeit|t|Richter nachträglich angerufen]] Uhr nachträglich.' },
      { t: 'p', when: f => f.e6 === 'herb', out: false, l: 'Für den Antrag an das Amtsgericht', x: 'Beantragt wird die Fortdauer bis [[f_bis|Datum, Uhrzeit]].' },
      { t: 'ph', x: 'Die Ausnahme ist eng. „Unverzüglich“ heißt ohne vermeidbare Verzögerung, auch nachts, soweit ein Bereitschaftsdienst erreichbar ist. Ohne schriftliche Prognose ist die Freiheitsentziehung angreifbar.' }
    ] }
  };
  const EGROUPS = { dfa: ['E1', 'E2', 'E3'], dfb: ['E4', 'E5', 'E6'] };
  const eSecs = (d, keys) => keys.map(k => E[k]).filter(Boolean);

  /* ======================= Text erzeugen ======================= */
  const miss = (ctx, l) => { ctx.miss.push(l); return `[${l}]`; };
  function rt(s, f, g, ctx) {
    return s.replace(new RegExp(TOK.source, 'g'), (all, gk, bl, sw) => {
      if (gk) { const w = g[gk.toLowerCase()]; return w == null ? all : (gk[0] === gk[0].toUpperCase() ? cap(w) : w); }
      if (bl) {
        const [id, ph, ty, tl] = bl.split('|'); const v = f[id];
        if (ty === 'k') return kv(v) ? kraftText(kv(v), ctx) : miss(ctx, ph.replace(/\?$/, ''));
        if (!has(v)) return miss(ctx, ph);
        if (ty === 't' && tl) ctx.times.push([str(v), tl]);
        return ty === 'd' ? fmtD(v) : clean(v);
      }
      const def = SW[sw], o = def && def.o.find(x => x[0] === f[sw]);
      if (!o) return miss(ctx, (def ? def.l : sw) + '?');
      return rt(o.length > 2 ? o[2] : o[1], f, g, ctx);
    });
  }
  /** Ein Abschnitt des Gerüsts → Absätze (nur Angekreuztes, nur Sichtbares). */
  function secOut(sec, d, ctx) {
    const f = F(d), g = GEN[gOf(d)], v = V[f.art];
    const locked = sec.dep && v && !has(f[v.main]);
    const paras = []; let c = [];
    const push = (t, np) => { if (!t || !t.trim()) return; if (np && c.length) { paras.push(c.join(' ')); c = []; } c.push(t); };
    for (const b of sec.b) {
      if (b.when && !b.when(f)) continue;
      if (b.out === false || b.t === 'ph') continue;
      if (b.t === 'p') { if (b.ow && !b.ow(f)) continue; push(rt(b.x, f, g, ctx), b.np); }
      else if (b.t === 'ak') { if (locked || !f[b.id]) continue; push(rt(b.x, f, g, ctx), b.np); }
      else if (b.t === 'grp') {
        if (locked) continue;
        const fr = b.items.filter(([id]) => f[id]).map(([, x]) => rt(x, f, g, ctx));
        push(`${rt(b.lead, f, g, ctx)} ${fr.length ? joinList(fr, b.join) : miss(ctx, b.miss)}${b.tail}`, b.np);
      } else if (b.t === 'ff') {
        const val = str(f[b.id]).replace(/\s*\n+\s*/g, ' ');
        let first = true;
        if (b.lead) { push(rt(b.lead, f, g, ctx), b.np); first = false; }
        if (val) { ctx.ff.push(val); push(val, first && b.np); } else push(miss(ctx, b.l), first && b.np);
      }
    }
    if (c.length) paras.push(c.join(' '));
    return paras.map(tidy);
  }
  function personLine(d) {
    const p = get(d, 'gw.p') || {};
    const name = [str(p.nachname), str(p.vorname)].filter(Boolean).join(', ');
    return [name || '[Name, Vorname]', has(p.geb) ? `geboren am ${fmtD(p.geb)}` : 'geboren am [Geburtsdatum]', has(p.anschrift) ? `gewöhnlicher Aufenthalt ${str(p.anschrift)}` : 'gewöhnlicher Aufenthalt [Anschrift]'].join(', ');
  }
  /** Alles auf einmal: Absätze je Teil, fehlende Angaben je Abschnitt, Uhrzeiten, Freitexte. */
  function compose(d) {
    const f = F(d), v = V[f.art];
    const ctx = { times: [], ff: [], miss: [] }, missing = [], s = [], r = [], e = [];
    const take = (label, fn) => { ctx.miss = []; const out = fn(); if (ctx.miss.length) missing.push(`${label}: ${[...new Set(ctx.miss)].join(', ')}`); return out; };
    if (v) {
      v.secs.forEach(sec => { const p = take(`${sec.k} ${sec.t}`, () => secOut(sec, d, ctx)); (sec.sec === 'r' ? r : s).push(...p); });
      Object.values(EGROUPS).flat().forEach(k => { e.push(...take(`${k} ${E[k].t}`, () => secOut(E[k], d, ctx))); });
    }
    return { s, r, e, ctx, missing };
  }
  function genPlain(d) {
    const v = V[F(d).art]; if (!v) return 'Zuerst die Gewahrsamsart wählen.';
    const C = compose(d);
    return `Ingewahrsamnahme nach ${v.norm}\n\nSachverhalt\n${C.s.join('\n\n')}\n\nRechtliche Bewertung\n${C.r.join('\n\n')}\n\nDurchführung der Maßnahme\n${C.e.join('\n\n')}`;
  }

  /* ======================= Prüfregeln für „Offene Punkte“ ======================= */
  const WERT = /(^|[^a-zäöüß])(betrunken|besoffen|alkoholisiert|aggressiv|verwirrt|hilflos|uneinsichtig|renitent|auffällig|unkooperativ)(?![a-zäöüß])/gi;
  const ALK = /alkoholgeruch|atemalkohol|mg\/l|promille|alkoholisiert|betrunken|lallend/i;
  const TAT = /(^|[^a-zäöüß])(schlug|schlägt|trat|tritt|stach|stech|bedroh|beleidig|beschädig)/i;
  function ageAt(geb, at) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(geb || ''); if (!m) return null;
    const n = /^\d{4}-\d{2}-\d{2}$/.test(at || '') ? new Date(at + 'T12:00:00') : new Date();
    let a = n.getFullYear() - (+m[1]); if ((n.getMonth() + 1) * 100 + n.getDate() < (+m[2]) * 100 + (+m[3])) a--; return a;
  }
  function rules(d, ctx) {
    const f = F(d), v = V[f.art]; if (!v) return [];
    const out = [...v.rules(f)];
    if (!has(f[v.main])) out.push('Feststellungen fehlen. Folgerungen werden erst übernommen, wenn die Tatsachen beschrieben sind.');
    const all = ctx.ff.join(' ');
    [...new Set([...all.matchAll(WERT)].map(m => m[2].toLowerCase()))].forEach(w => out.push(`„${w}“ ist eine Wertung: im Text beschreiben, woran das erkennbar war.`));
    if (ALK.test(all + ' ' + (f.c_urs ? str(f.c_urs_x) : '')) && f.e4 !== 'arzt' && f.e4 !== 'nein') out.push('Alkoholeinfluss beschrieben, Gewahrsamsfähigkeit aber nicht ärztlich festgestellt (E4).');
    if (TAT.test(all)) out.push('Mögliche Straftat beschrieben (z. B. Beleidigung, Bedrohung, tätlicher Angriff): Strafanzeige gesondert. Der Gewahrsam bleibt präventiv begründet.');
    const age = ageAt(get(d, 'gw.p.geb'), f.e1_d || get(d, 'einsatz.datum'));
    if (age != null && age < 18 && !f.e5_sorge) out.push(`Nach dem Geburtsdatum ${age} Jahre alt: Sorgeberechtigte unverzüglich benachrichtigen (E5).`);
    if (f.art === 'a2' && age != null && age >= 18) out.push('§ 35 Abs. 2 gilt nur für Minderjährige; das Geburtsdatum ergibt Volljährigkeit.');
    if (f.e2_zw === 'mit' && !f.e2_andr && !f.e2_andr_no) out.push('Zwang: Androhung mit Uhrzeit und Person eintragen oder begründen, warum sie unterblieb (E2, § 61 PolG NRW).');
    if (f.e3_ggs && f.e3_art === 'sich') out.push('Sichergestellte Gegenstände: Herausgabe oder weiteren Verbleib gesondert regeln (E3).');
    if (f.e6 === 'herb' && !has(f.f_bis)) out.push('Antrag an das Amtsgericht: beantragte Dauer eintragen (E6).');
    return out;
  }

  /* ======================= Zeitleiste und Antrag ======================= */
  function timeline(d) {
    const f = F(d), C = compose(d);
    const first = C.ctx.times.find(([t]) => mins(t) != null), ref = first ? mins(first[0]) : null;
    const seen = new Set();
    const rows = C.ctx.times.filter(([t, l]) => { const k = t + l; if (seen.has(k) || mins(t) == null) return false; seen.add(k); return true; })
      .map(([t, l]) => { let m = mins(t); if (ref != null && m < ref) m += 1440; return [m, t, l]; }).sort((a, b) => a[0] - b[0]);
    const lines = rows.map(([, t, l]) => `${t} Uhr  ${l}`);
    const end = f.d_ueb_t || f.c_rueck_t;
    if (has(f.e1_t) && has(end)) { let x = mins(end) - mins(f.e1_t); if (x < 0) x += 1440; lines.push('', `Dauer ab Ingewahrsamnahme: ${Math.floor(x / 60)} Std. ${x % 60} Min.`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(f.e1_d || '') && has(f.e1_t)) {
      const dt = new Date(f.e1_d + 'T12:00:00'); dt.setDate(dt.getDate() + 1);
      lines.push(`Frist ohne richterliche Anordnung: spätestens ${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}, 24:00 Uhr (§ 38 Abs. 1 PolG NRW, Art. 104 Abs. 2 Satz 3 GG)`);
    } else lines.push('Frist: Datum und Uhrzeit der Ingewahrsamnahme in E1 eintragen.');
    return lines.join('\n') || 'Noch keine Uhrzeiten eingetragen.';
  }
  function antrag(d) {
    const f = F(d), v = V[f.art]; if (!v) return 'Zuerst die Gewahrsamsart wählen.';
    const C = compose(d);
    const ag = has(f.e6_ag) ? clean(f.e6_ag) : '[Ort des Amtsgerichts]';
    const seit = `${has(f.e1_d) ? fmtD(f.e1_d) : '[Datum]'}, ${has(f.e1_t) ? f.e1_t : '[Uhrzeit]'} Uhr`;
    const bis = has(f.f_bis) ? clean(f.f_bis) : '[Datum, Uhrzeit]';
    return `Antrag auf richterliche Entscheidung über die Zulässigkeit und Fortdauer der Freiheitsentziehung\n(§ 36 Abs. 1 PolG NRW i. V. m. §§ 415 ff. FamFG)\n\nAn das Amtsgericht ${ag}\n\n${LABEL[gOf(d)]}: ${personLine(d)}\nFreiheitsentziehung seit: ${seit}, nach ${v.norm}\n\nBegründung (§ 417 Abs. 2 FamFG)\n\nSachverhalt\n${C.s.join('\n\n')}\n\nErforderlichkeit der Freiheitsentziehung\n${C.r.join('\n\n')}\n\nErforderliche Dauer\nDie Freiheitsentziehung ist voraussichtlich bis ${bis} erforderlich.\n\nEs wird beantragt, die Zulässigkeit der Freiheitsentziehung festzustellen und ihre Fortdauer bis ${bis} anzuordnen.`;
  }

  /* ======================= Schnittstelle für writer.js ======================= */
  const hasArt = d => !!V[F(d).art];
  const firstOf = (d, sec) => { const v = V[F(d).art]; const s = v && v.secs.find(x => x.sec === sec); return s ? `${F(d).art}_${s.k}` : 'art'; };
  function text(d) {
    const f = F(d), v = V[f.art];
    if (!v) return [['', 'Gewahrsam nach PolG NRW', null], ['1', 'Gewahrsamsart', '[Gewahrsamsart wählen]', 'art']];
    if (has(f.eigen)) return [['', `Ingewahrsamnahme nach ${v.norm}`, null], ['', 'Bericht (von Hand angepasst)', str(f.eigen), 'text']];
    const C = compose(d);
    return [['', `Ingewahrsamnahme nach ${v.norm}`, null], ['1', 'Sachverhalt', C.s.join('\n\n'), firstOf(d, 's')], ['2', 'Rechtliche Bewertung', C.r.join('\n\n'), firstOf(d, 'r')], ['3', 'Durchführung der Maßnahme', C.e.join('\n\n'), 'dfa']];
  }
  const plain = d => { const f = F(d), v = V[f.art]; return v && has(f.eigen) ? `Ingewahrsamnahme nach ${v.norm}\n\n${str(f.eigen)}` : genPlain(d); };
  function preview(id, d) {
    const f = F(d), v = V[f.art];
    if (id === 'art') return v ? `${v.norm} · ${v.name}\n${LABEL[gOf(d)]}: ${personLine(d)}` : '';
    if (id === 'text') return plain(d);
    const ctx = { times: [], ff: [], miss: [] };
    if (EGROUPS[id]) return eSecs(d, EGROUPS[id]).flatMap(s => secOut(s, d, ctx)).join('\n\n');
    if (v && id.startsWith(f.art + '_')) { const sec = v.secs.find(s => `${f.art}_${s.k}` === id); return sec ? secOut(sec, d, ctx).join('\n\n') : ''; }
    return '';
  }
  function offen(d) {
    const f = F(d);
    if (!V[f.art]) return ['Gewahrsamsart wählen.'];
    const C = compose(d);
    if (has(f.eigen)) {
      const n = (str(f.eigen).match(/\[[^\]]+\]/g) || []).length;
      return [...(n ? [`Im angepassten Text stehen noch ${n} Platzhalter in eckigen Klammern.`] : []), ...rules(d, C.ctx)];
    }
    return [...C.missing.map(x => 'Fehlt – ' + x), ...rules(d, C.ctx)];
  }
  function kurzText(d) {
    const f = F(d), v = V[f.art]; if (!v) return '– noch keine Gewahrsamsart gewählt –';
    const p = get(d, 'gw.p') || {};
    const von = has(f.e1_t) ? `${has(f.e1_d) ? fmtD(f.e1_d) + ', ' : ''}${f.e1_t} Uhr` : '';
    const bis = f.d_ueb_t || f.c_rueck_t;
    const ri = f.e6 === 'herb' ? 'richterliche Entscheidung herbeigeführt' : f.e6 === 'entb' ? 'richterliche Entscheidung nicht herbeigeführt (Grund entfiel vorher)' : '';
    return [`Gewahrsam nach ${v.norm} (${v.name})`, [str(p.nachname), str(p.vorname)].filter(Boolean).join(', '), von ? `ab ${von}${bis ? ` bis ${bis} Uhr` : ''}` : '', ri].filter(Boolean).join(' · ');
  }
  function personalien(d) {
    const p = get(d, 'gw.p') || {};
    const anrede = { m: 'Herr', w: 'Frau', d: 'Divers' }[p.geschlecht] || '';
    return [`${LABEL[gOf(d)]}: ${[anrede, str(p.vorname), str(p.nachname)].filter(Boolean).join(' ') || '[Name]'}`, `Geburtsdatum: ${has(p.geb) ? fmtD(p.geb) : '[Geburtsdatum]'}`, `Anschrift: ${has(p.anschrift) ? str(p.anschrift) : '[Anschrift]'}`].join('\n');
  }
  function title(d) {
    const f = F(d), v = V[f.art], p = get(d, 'gw.p') || {};
    return ['Gewahrsam', v ? v.sub : '', str(p.nachname)].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const f = F(d), v = V[f.art];
    const dat = f.e1_d || get(d, 'einsatz.datum');
    return [v ? v.norm : '', has(dat) ? fmtD(dat) : '', has(f.e1_t) ? f.e1_t + ' Uhr' : ''].filter(Boolean).join(' · ');
  }

  /* ======================= Schritte des Assistenten ======================= */
  const STEPS = [
    { id: 'art', phase: 'Grundlage', title: 'Gewahrsamsart und Person', lead: 'Rechtsgrundlage wählen. Die Anrede steuert die Satzführung: der Betroffene, die Betroffene oder die betroffene Person. Wer etwas angeordnet, ausgesprochen oder getan hat, wählst du später direkt im Satz aus – aus deinem Team und der laufenden Schicht; im Text stehen Amtsbezeichnung und Nachname.', fields: [
      { k: 'gw.art', t: 'choice', l: 'Rechtsgrundlage', req: true, o: ORDER.map(k => [k, `${V[k].short} · ${V[k].sub}`]) },
      { t: 'info', when: hasArt, text: d => `${V[F(d).art].norm} · ${V[F(d).art].name}. ${V[F(d).art].lead}` },
      { k: 'gw.p', t: 'person', l: 'Betroffene Person', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift'] }
    ] },
    ...ORDER.flatMap(v => V[v].secs.map(s => ({ id: `${v}_${s.k}`, phase: 'Gerüst', title: s.t, lead: `${V[v].norm} · ${s.lead || ''}`, when: d => F(d).art === v, fields: [{ k: `gw:${v}:${s.k}`, t: 'custom' }] }))),
    { id: 'dfa', phase: 'Durchführung', title: 'Ingewahrsamnahme', lead: 'Wer hat angeordnet, wer hat es ausgesprochen, wann? Zwang, Fesselung, Durchsuchung. Gilt für jeden Gewahrsam.', when: hasArt, fields: [{ k: 'gw:E:dfa', t: 'custom' }] },
    { id: 'dfb', phase: 'Durchführung', title: 'Gewahrsamsfähigkeit, Benachrichtigung, Richter', lead: 'Hier setzen Verteidigung und Gericht am häufigsten an.', when: hasArt, fields: [{ k: 'gw:E:dfb', t: 'custom' }] },
    { id: 'text', phase: 'Text', title: 'Fertiger Text', lead: 'Der Text entsteht aus dem Gerüst. Fehlt noch etwas, am besten im Gerüst nachtragen. Für den letzten Schliff lässt er sich hier von Hand anpassen.', when: hasArt, fields: [{ k: 'gw:text', t: 'custom' }] }
  ];

  /* ======================= Lückentext zeichnen ======================= */
  function ed(s, f, g) {
    let h = '', last = 0, m;
    const re = new RegExp(TOK.source, 'g');
    while ((m = re.exec(s))) {
      h += esc(s.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) { const w = g[m[1].toLowerCase()] || m[1]; h += `<span class="gw-au">${esc(m[1][0] === m[1][0].toUpperCase() ? cap(w) : w)}</span>`; }
      else if (m[2]) {
        const [id, ph, ty] = m[2].split('|'), v = f[id] ?? '';
        if (ty === 'k') {
          const o = kv(v), r = o ? (str(o.grad) || teamRank(o.name)) : '';
          h += o ? `<button type="button" class="gw-tok${r ? '' : ' warn'}" id="gwb-${id}" data-gw-pick="${id}" data-ph="${esc(ph)}" aria-label="${esc(`${ph} ${r} ${nachname(o.name)} – ändern`)}"><b>${esc(r || 'Amtsbez.?')}</b> ${esc(nachname(o.name))}</button>`
            : `<button type="button" class="gw-tok empty" id="gwb-${id}" data-gw-pick="${id}" data-ph="${esc(ph)}">${esc(ph)}</button>`;
        } else if (ty === 't' || ty === 'd') h += `<input type="${ty === 't' ? 'time' : 'date'}" class="gw-in" id="gwb-${id}" data-gw-bl="${id}" value="${esc(v)}" aria-label="${esc(ph)}">`;
        else h += `<span class="gw-bl${ty === 'l' ? ' long' : ''}" id="gwb-${id}" contenteditable="true" role="textbox" spellcheck="true" aria-label="${esc(ph)}" data-gw-bl="${id}" data-ph="${esc(ph)}">${esc(v)}</span>`;
      } else {
        const id = m[3], def = SW[id], v = f[id];
        h += `<span class="gw-sw" role="radiogroup" aria-label="${esc(def.l)}">${def.o.map(o => `<button type="button" class="gw-pill" role="radio" id="gws-${id}-${o[0]}" data-gw-sw="${id}" data-gw-opt="${o[0]}" aria-checked="${String(v === o[0])}">${esc(o[1])}</button>`).join('')}</span>`;
        const o = def.o.find(x => x[0] === v);
        if (o && o.length > 2 && o[2] && o[2] !== o[1]) h += ' ' + ed(o[2], f, g);
      }
    }
    return h + esc(s.slice(last));
  }
  const akRow = (id, x, pre, f, g) => `<div class="gw-ak${f[id] ? ' on' : ''}" data-gw-ak="${id}"><input type="checkbox" id="gwc-${id}" data-gw-cb="${id}"${f[id] ? ' checked' : ''} aria-labelledby="gwt-${id}"><p class="gw-p" id="gwt-${id}">${pre}${ed(x, f, g)}</p></div>`;
  /** Auswahl der Person direkt unter dem Satz, in dem sie gerade gewählt wird. */
  const withPanel = (html, ui) => (ui && ui.pick && html.includes(`data-gw-pick="${ui.pick.id}"`) ? html + ui.panel() : html);
  function blockHtml(b, f, g, ui) {
    if (b.when && !b.when(f)) return '';
    if (b.t === 'p') return withPanel(`${b.l ? `<span class="w-lbl gw-l">${esc(b.l)}</span>` : ''}<p class="gw-p">${ed(b.x, f, g)}</p>`, ui);
    if (b.t === 'ak') return withPanel(akRow(b.id, b.x, '', f, g), ui);
    if (b.t === 'grp') return `<p class="gw-p">${ed(b.lead, f, g)} …</p><div class="gw-grp">${b.items.map(([id, x]) => withPanel(akRow(id, x, '… ', f, g), ui)).join('')}</div>`;
    if (b.t === 'ff') return `${b.lead ? `<p class="gw-p">${ed(b.lead, f, g)}</p>` : ''}<div class="w-q gw-ff"><label class="w-lbl" for="wf-gw_${b.id}"><span class="gw-tag">Freifeld</span>${esc(b.l)}</label><div class="w-sent nopre"><textarea class="w-sent-in multi" id="wf-gw_${b.id}" data-k="gw.${b.id}" data-lint="tats" rows="1" style="--rows:4" placeholder="${esc(b.ph || 'Nur Tatsachen: was gesehen, gehört, gerochen, gemessen wurde. Äußerungen wörtlich.')}" spellcheck="true" autocapitalize="sentences" maxlength="6000">${esc(f[b.id] || '')}</textarea></div><p class="w-lint" hidden></p>${b.q ? `<p class="w-hint gw-q"><b>Leitfragen:</b> ${esc(b.q)}</p>` : ''}</div>`;
    if (b.t === 'ph') return `<div class="w-info gw-ph"><b>Prüfhinweis:</b> ${esc(b.x)}</div>`;
    return '';
  }
  function secHtml(sec, d, withHead, ui) {
    const f = F(d), g = GEN[gOf(d)], v = V[f.art];
    const locked = sec.dep && v && !has(f[v.main]);
    return `<section class="gw-sec${locked ? ' gw-lock' : ''}">${withHead ? `<div class="gw-sec-h"><span class="gw-sec-k">${esc(sec.k)}</span><span class="gw-sec-t">${esc(sec.t)}</span>${sec.n ? `<span class="gw-sec-n">${esc(sec.n)}</span>` : ''}</div>` : ''}${locked ? '<div class="gw-note">Erst die Feststellungen eintragen (Schritt davor). Ohne Tatsachen lassen sich keine Folgerungen ankreuzen.</div>' : ''}${sec.b.map(b => blockHtml(b, f, g, ui)).join('')}</section>`;
  }

  /** Eingehängtes Gerüst eines Schritts: Lücken, Weichen und Folgerungen speichern über api.set. */
  function mount(el, k, data, api) {
    if (k === 'gw:text') { mountText(el, data, api); return; }
    const [, v, part] = k.split(':');
    const secs = () => (v === 'E' ? eSecs(data, EGROUPS[part] || []) : [(V[v] && V[v].secs.find(s => s.k === part))].filter(Boolean));
    const save = (id, val) => { api.set('gw.' + id, val === false || val === '' ? undefined : val); if (api.refresh) api.refresh(); };
    let pending = false, pick = null;
    /* Personenauswahl: zuerst in diesem Vorgang schon genannt, dann Schicht, dann Team; Tippen filtert, neue Namen gehen auch */
    const chips = () => {
      const q = str(pick.q), all = pool(data);
      const list = q ? all.filter(o => matches(o, q)).slice(0, 10) : [...all.filter(o => o.src !== 'team'), ...all.filter(o => o.src === 'team')].slice(0, 12);
      const exact = q && list.some(o => o.name.toLowerCase() === q.toLowerCase() || `${o.grad} ${nachname(o.name)}`.toLowerCase() === q.toLowerCase());
      const out = list.map(o => `<button type="button" class="chip" data-gw-take="${esc(JSON.stringify({ grad: o.grad || '', name: o.name }))}">${o.grad ? `<b>${esc(o.grad)}</b> ` : ''}${esc(o.name)}</button>`);
      if (q && !exact) out.push(`<button type="button" class="chip gw-free" data-gw-free="1">+ „${esc(q)}“ übernehmen</button>`);
      return out.length ? out.join('') : '<p class="w-hint">Noch niemand im Team – Namen mit Amtsbezeichnung tippen, z. B. „POK Müller“.</p>';
    };
    const panel = () => {
      const id = pick.id, o = kv(F(data)[id]), r = o ? (str(o.grad) || teamRank(o.name)) : '';
      return `<div class="gw-pick" data-gw-panel="${id}"><div class="gw-pick-h"><span class="w-lbl">${esc(pick.ph)}</span><button type="button" class="link" data-gw-close="1">Fertig</button></div>${o && !r ? `<label class="gw-pick-g">Amtsbezeichnung für ${esc(o.name)}<select class="input" data-gw-grad="${id}">${DGRADE.map(x => `<option value="${esc(x)}">${esc(x || 'bitte wählen')}</option>`).join('')}</select></label>` : ''}<input class="input" id="gwq-${id}" data-gw-q="${id}" value="${esc(pick.q)}" placeholder="Namen tippen, z. B. POK Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="60" aria-label="${esc(pick.ph)} – Namen tippen"><div class="w-chips gw-pick-c" id="gwpc-${id}">${chips()}</div>${o ? `<button type="button" class="link danger gw-pick-x" data-gw-clear="${id}">Auswahl entfernen</button>` : ''}</div>`;
    };
    const take = o => {
      const id = pick.id, ak = pick.ak;
      save(id, { grad: str(o.grad), name: str(o.name) });
      if (ak && !F(data)[ak]) save(ak, true);
      pick = null; draw('gwb-' + id);
    };
    const draw = (focusId, caretEnd) => {
      const list = secs();
      el.innerHTML = `<div class="gw">${list.map(s => secHtml(s, data, v === 'E', { pick, panel })).join('')}</div>`;
      if (api.layout) api.layout();
      if (focusId) {
        const x = document.getElementById(focusId); if (!x) return;
        x.focus({ preventScroll: true });
        if (caretEnd && x.isContentEditable) { const r = document.createRange(); r.selectNodeContents(x); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      }
    };
    const autoCheck = t => {
      const row = t.closest('[data-gw-ak]'); if (!row) return;
      const id = row.dataset.gwAk; if (F(data)[id]) return;
      save(id, true); row.classList.add('on'); const cb = row.querySelector('[data-gw-cb]'); if (cb) cb.checked = true; pending = true;
    };
    el.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset && t.dataset.gwQ && pick) { pick.q = t.value; const c = document.getElementById('gwpc-' + pick.id); if (c) c.innerHTML = chips(); return; }
      if (!t.dataset || !t.dataset.gwBl) return;
      let val = t.isContentEditable ? t.textContent : t.value;
      if (t.isContentEditable && !val.trim()) { if (val === '') t.innerHTML = ''; }
      save(t.dataset.gwBl, val); autoCheck(t);
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset && t.dataset.gwCb) { save(t.dataset.gwCb, t.checked); draw('gwc-' + t.dataset.gwCb); }
      else if (t.dataset && t.dataset.gwGrad && t.value) { const id = t.dataset.gwGrad, o = kv(F(data)[id]); if (o) save(id, { ...o, grad: t.value }); pick = null; draw('gwb-' + id); }
    });
    el.addEventListener('click', e => {
      const tok = e.target.closest('[data-gw-pick]');
      if (tok) {
        const id = tok.dataset.gwPick;
        if (pick && pick.id === id) { pick = null; draw(tok.id); return; }
        const row = tok.closest('[data-gw-ak]');
        pick = { id, ph: tok.dataset.ph || 'Wer?', ak: row ? row.dataset.gwAk : '', q: '' };
        draw('gwq-' + id); return;
      }
      const tk = e.target.closest('[data-gw-take]');
      if (tk && pick) { let o = null; try { o = JSON.parse(tk.dataset.gwTake); } catch (er) { o = null; } if (o) take(o); return; }
      if (e.target.closest('[data-gw-free]') && pick && has(pick.q)) { take(parseFree(pick.q)); return; }
      if (e.target.closest('[data-gw-close]') && pick) { const id = pick.id; pick = null; draw('gwb-' + id); return; }
      const cl = e.target.closest('[data-gw-clear]');
      if (cl) { save(cl.dataset.gwClear, undefined); pick = null; draw('gwb-' + cl.dataset.gwClear); return; }
      const pill = e.target.closest('[data-gw-sw]');
      if (pill) { save(pill.dataset.gwSw, pill.dataset.gwOpt); draw(pill.id); return; }
      const p = e.target.closest('.gw-ak .gw-p');
      if (p && !e.target.closest('[data-gw-bl], [data-gw-pick], .gw-sw, input')) {
        const row = p.closest('[data-gw-ak]'), id = row.dataset.gwAk;
        save(id, !F(data)[id]); draw('gwc-' + id);
      }
    });
    el.addEventListener('keydown', e => {
      const t = e.target;
      if (t.dataset && t.dataset.gwQ && pick) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const id = pick.id; pick = null; draw('gwb-' + id); return; }
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault(); e.stopPropagation();
          const first = el.querySelector('#gwpc-' + pick.id + ' [data-gw-take]');
          if (has(pick.q) && !first) take(parseFree(pick.q)); else if (first) take(JSON.parse(first.dataset.gwTake));
          return;
        }
      }
      if (e.key === 'Enter' && t.isContentEditable) { e.preventDefault(); t.blur(); }
    });
    el.addEventListener('paste', e => {
      if (!e.target.isContentEditable) return;
      e.preventDefault();
      const t = ((e.clipboardData || root.clipboardData).getData('text') || '').replace(/\s*\n+\s*/g, ' ');
      document.execCommand('insertText', false, t);
    });
    el.addEventListener('focusout', () => {
      if (!pending) return;
      setTimeout(() => {
        pending = false;
        const a = document.activeElement, id = a && a.id && el.contains(a) ? a.id : null;
        draw(id, true);
      }, 0);
    });
    draw();
  }
  /** Letzter Schritt: fertiger Text – erzeugt oder von Hand angepasst. */
  function mountText(el, data, api) {
    const draw = focus => {
      const f = F(data), gen = genPlain(data), eig = has(f.eigen);
      const ph = (gen.match(/\[[^\]]+\]/g) || []).length;
      const stale = eig && f.eigenBasis && f.eigenBasis !== hash(gen);
      el.innerHTML = eig
        ? `<div class="gw"><div class="w-info">Von Hand angepasst. Änderungen im Gerüst fließen nicht mehr automatisch in den Text ein.${stale ? ' Im Gerüst wurde seitdem etwas geändert.' : ''}</div>
          <div class="gw-tools"><button type="button" class="btn btn-ghost btn-sm" data-gw-act="reset">Verwerfen und neu erzeugen</button><button type="button" class="btn btn-light btn-sm" data-copy-out="plain">Kopieren</button></div>
          <div class="w-q"><label class="w-lbl" for="wf-gw_eigen">Bericht</label><div class="w-sent nopre"><textarea class="w-sent-in multi" id="wf-gw_eigen" data-k="gw.eigen" rows="1" style="--rows:14" spellcheck="true" maxlength="40000">${esc(f.eigen)}</textarea></div></div></div>`
        : `<div class="gw"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So lautet der Bericht</span><span class="gw-tools"><button type="button" class="btn btn-ghost btn-sm" data-gw-act="edit">Text bearbeiten</button><button type="button" class="btn btn-light btn-sm" data-copy-out="plain">Kopieren</button></span></div>${ph ? `<p class="w-hint">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} noch (in eckigen Klammern). Am besten im Gerüst nachtragen, dann bleibt der Text automatisch aktuell.</p>` : ''}<pre class="w-out-t" data-fn="plain">${esc(gen)}</pre></div></div>`;
      if (api.layout) api.layout();
      if (focus) { const t = document.getElementById('wf-gw_eigen'); if (t) t.focus({ preventScroll: true }); }
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-gw-act]'); if (!b) return;
      if (b.dataset.gwAct === 'edit') { const gen = genPlain(data).replace(/^Ingewahrsamnahme nach [^\n]+\n\n/, ''); api.set('gw.eigenBasis', hash(genPlain(data))); api.set('gw.eigen', gen); draw(true); }
      else if (b.dataset.gwAct === 'reset') { api.set('gw.eigen', undefined); api.set('gw.eigenBasis', undefined); draw(false); }
      if (api.refresh) api.refresh();
    });
    draw(false);
  }

  root.WGEW = Object.freeze({
    id: 'gewahrsam', name: 'Gewahrsam (PolG NRW)', short: 'Gewahrsam', kurz: 'GW',
    desc: 'Lückentext für jede Gewahrsamsart nach § 35 PolG NRW: Feststellungen frei, Folgerungen ankreuzen, wer was wann angeordnet hat, Antrag ans Amtsgericht, Frist',
    intro: 'Gewahrsamsart wählen, Feststellungen frei beschreiben, Folgerungen ankreuzen · wer was wann angeordnet und ausgesprochen hat (Amtsbezeichnung, Nachname) · Pflichtbausteine §§ 36, 37 PolG NRW · fertiger Text zum Bearbeiten, Antrag ans Amtsgericht, Frist',
    labels: {
      bericht: 'Bericht', kurz: 'Kurzfassung', kurzHint: 'Eine Zeile für Vorgang, Liste und Übergabe.',
      offen: 'Offene Punkte', offenHint: 'Angehakte Punkte landen als Todos im Planner. Rot markierte Lücken stehen im Text in eckigen Klammern.',
      offenEmpty: 'Alle Lücken des Gerüsts sind ausgefüllt und die Prüfhinweise erledigt.',
      persHint: 'Gesondert vom Berichtstext.', newBtn: 'Gewahrsam'
    },
    extraTabs: [
      { k: 'antrag', l: 'Antrag AG', hint: 'Aus denselben Angaben. Die beantragte Dauer steht in E6 unter „Für den Antrag an das Amtsgericht“.', text: antrag },
      { k: 'zeit', l: 'Zeitleiste', hint: 'Alle eingetragenen Uhrzeiten, Dauer und Frist.', text: timeline }
    ],
    steps: STEPS, text, plain, preview, kurzText, fahndung: () => '', offen, personalien, title, subtitle, mount,
    _test: { V, E, SW, compose, genPlain, antrag, timeline, rules, offen }
  });
})(typeof window !== 'undefined' ? window : globalThis);
