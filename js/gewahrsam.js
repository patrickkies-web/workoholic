/*
 * Workoholic · Schriftliche Arbeiten · Modul „Gewahrsam (PolG NRW)“
 * ---------------------------------------------------------------
 * Aufbau wie die übrigen schriftlichen Arbeiten: Schritt für Schritt einzelne Fragen (Chips, Ja/Nein, Uhrzeit mit „Jetzt“,
 * Satzfelder mit festem Satzanfang, Auswahl der Kolleginnen und Kollegen aus der Besatzung). Unter jedem Schritt steht
 * der fertige Text dieses Abschnitts.
 *   • Gerüst je Gewahrsamsart nach § 35 PolG NRW (Abs. 1 Nr. 1–4, Abs. 2, Abs. 3): Feststellungen frei,
 *     Folgerungen als fertige Sätze, die sich auf die Feststellungen beziehen (erst mit Feststellungen im Text),
 *   • wer was wann angeordnet, ausgesprochen oder getan hat – im Text Amtsbezeichnung und Nachname,
 *   • Pflichtbausteine (§§ 36, 37, 39, 43, 61, 62 PolG NRW, Gewahrsamsvollzugsverordnung), richterliche Entscheidung
 *     inkl. „nachts nicht erreichbar“ (Art. 104 Abs. 2 GG, § 36 PolG NRW, §§ 415 ff. FamFG, Nachtzeit § 104 Abs. 3 StPO),
 *   • am Ende ein fertiger Text, der sich von Hand anpassen lässt.
 * Ausgaben: Bericht, Antrag auf richterliche Entscheidung (§ 417 Abs. 2 FamFG), Zeitleiste mit Frist, offene Punkte.
 * Reine Daten + Textlogik; writer.js zeichnet die Felder. Nur der letzte Schritt (bearbeitbarer Text) hängt sich über m.mount ein.
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
  const joinList = (a, j) => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ` ${j} ` + a[a.length - 1]);
  const clean = v => str(v).replace(/\s+$/, '');
  /* Satzzeichen glätten: „, .“ → „.“, doppelter Punkt nach Abkürzung („Dr. K..“) → ein Punkt */
  const tidy = s => s.replace(/,\s*(?=[.,])/g, '').replace(/\s+([.,:;])/g, '$1').replace(/([.!?])\.(?=\s|$)/g, '$1').replace(/\s{2,}/g, ' ').trim();
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); };
  const TOK = /\{([A-Za-z]+)\}|\[\[([^\]]+)\]\]|\(\(([a-z0-9_]+)\)\)/g;

  /* Amtsbezeichnung und Nachname (wie in den übrigen Modulen) */
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => arr(roles).map(str).find(r => RANK_RE.test(r)) || '';
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  const teamRank = n => { const B = root.WBridge; const t = (B && B.team && B.team()) || []; const k = str(n).toLowerCase(); const p = t.find(x => x && (str(x.name).toLowerCase() === k || nachname(x.name).toLowerCase() === k)); return p ? (str(p.rank) || rankOf(p.roles)) : ''; };
  function canonRank(t) {
    t = str(t); if (!t || t.length > 7) return '';
    const up = t.toUpperCase(); if (RANK_RE.test(up)) return up;
    if (/in$/i.test(t)) { const f = t.slice(0, -2).toUpperCase() + 'in'; if (RANK_RE.test(f)) return f; }
    return '';
  }
  /** Auswahl aus der Besatzung („PHK Muster“) oder getippt („pok müller“) → „POK Müller“; ohne Amtsbezeichnung wird nachgefragt. */
  function kraftText(v, ctx) {
    const t = str(v).split(/\s+/), g = canonRank(t[0]);
    const name = (g && t.length > 1 ? t.slice(1) : t).join(' ');
    const nn = name === name.toLowerCase() ? name.replace(/(^|[\s-])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) : name;
    const r = g || teamRank(nn);
    return `${r || miss(ctx, 'Amtsbezeichnung ' + nn)} ${r && !g ? nachname(nn) : nn}`;
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
  const G = d => GEN[gOf(d)];

  /* Nachtzeit nach § 104 Abs. 3 StPO: 1.4.–30.9. 21–4 Uhr, 1.10.–31.3. 21–6 Uhr */
  function nachtzeit(date, time) {
    const m = mins(time); if (m == null) return null;
    const dm = /^\d{4}-(\d{2})-\d{2}$/.exec(date || ''), mon = dm ? +dm[1] : new Date().getMonth() + 1;
    const end = mon >= 4 && mon <= 9 ? 4 : 6;
    return m >= 21 * 60 || m < end * 60;
  }
  const nzText = (date, time) => (nachtzeit(date, time) ? 'Die Ingewahrsamnahme erfolgte zur Nachtzeit im Sinne des § 104 Abs. 3 StPO.' : '');

  /* ======================= Weichen im Text (Wert → Satz) ======================= */
  const SW = {
    c_gef: { l: 'Gefahr für', o: [['leib', 'Leib'], ['leben', 'Leben'], ['beide', 'Leib und Leben']] },
    c_art: { l: 'Begehung oder Fortsetzung', o: [['beg', 'Begehung'], ['fort', 'Fortsetzung']] },
    c_typ: { l: 'Straftat oder OWi', o: [['st', 'Straftat'], ['owi', 'OWi', 'Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit']] },
    b_wv_bek: { l: 'Art der Bekanntgabe', o: [['pers', '', 'persönlich eröffnet und ausgehändigt'], ['and', '', 'auf andere Weise bekannt gegeben ([[b_wv_and|wie|l]])']] },
    c_zu: { l: 'Zuführung an', o: [['sorge', '', 'die Sorgeberechtigten bzw. die von ihnen bestimmte Einrichtung'], ['ja', '', 'das Jugendamt']] },
    c_stat: { l: 'Status', o: [['ent', '', 'ist {er} aus dem Vollzug entwichen'], ['auss', '', 'hält {er} sich ohne Erlaubnis außerhalb der Anstalt auf']] },
    e1_bek: { l: 'Bekanntgabe des Grundes', o: [['sof', '', 'dabei'], ['spaet', '', 'um [[e1_bek_t|Uhrzeit|t|Grund bekannt gegeben]] Uhr, sobald {er} aufnahmefähig war,']] },
    e1_spr: { l: 'Verständigung', o: [['de', '', 'in deutscher Sprache'], ['dol', '', 'über eine Dolmetscherin oder einen Dolmetscher ([[e1_dol|Sprache, Name|l]])']] },
    e2_zw: { l: 'Zwang', o: [['ohne', '', 'ohne Anwendung von Zwang'], ['mit', '', 'unter Anwendung unmittelbaren Zwangs durch [[e2_zw_wer|Wer wendete Zwang an|k]]: [[e2_zw_x|Art und Folgen|l]]']] },
    e2_fes_g: { l: 'Fesselungsgrund', o: [['ang', '', 'Polizeivollzugsbeamte oder Dritte angreifen oder Widerstand leisten'], ['fl', '', 'fliehen'], ['selbst', '', 'sich töten oder verletzen']] },
    e3_art: { l: 'Gegenstände', o: [['keine', '', 'wurden keine Gegenstände in Verwahrung genommen'], ['verw', '', 'wurden folgende Gegenstände in Verwahrung genommen: [[e3_ggs_x|Gegenstände|l]]'], ['sich', '', 'wurden nach § 43 Nr. 3 PolG NRW folgende Gegenstände sichergestellt: [[e3_ggs_x|Gegenstände|l]]']] },
    e4: { l: 'Gewahrsamsfähigkeit', o: [
      ['arzt', '', 'Die Gewahrsamsfähigkeit wurde um [[e4_t|Uhrzeit|t|Gewahrsamsfähigkeit festgestellt]] Uhr durch [[e4_arzt|Ärztin oder Arzt|l]] festgestellt.'],
      ['nein', '', 'Die Gewahrsamsfähigkeit wurde um [[e4_t|Uhrzeit|t|Gewahrsamsfähigkeit verneint]] Uhr durch [[e4_arzt|Ärztin oder Arzt|l]] verneint. {Der} wurde in [[e4_kh|Krankenhaus|l]] gebracht.'],
      ['kz', '', 'Zweifel an der Gewahrsamsfähigkeit bestanden nicht, weil [[e4_kz|Grund|l]].']] },
    e5: { l: 'Benachrichtigung', o: [
      ['selbst', '', 'Um [[e5_t|Uhrzeit|t|Benachrichtigung]] Uhr gab [[e5_gel|Wer gab Gelegenheit|k]] {dem} Gelegenheit, einen Angehörigen oder eine Person {seines} Vertrauens zu benachrichtigen. {Er} benachrichtigte [[e5_wen|wen|l]].'],
      ['pol', '', '{Er} war nicht in der Lage, selbst zu benachrichtigen. [[e5_wer|Wer benachrichtigte|k]] benachrichtigte um [[e5_t|Uhrzeit|t|Benachrichtigung]] Uhr [[e5_wen|wen|l]], da dies {seinem} mutmaßlichen Willen nicht widersprach.'],
      ['verz', '', 'Nach Hinweis durch [[e5_hin|Wer wies hin|k]] um [[e5_hin_t|Uhrzeit|t|Hinweis auf Benachrichtigung]] Uhr verzichtete {er} ausdrücklich auf eine Benachrichtigung.'],
      ['unt', '', 'Eine Benachrichtigung unterblieb, weil [[e5_unt|Grund|l]].']] },
    e6: { l: 'Richterliche Entscheidung', o: [
      ['herb', '', 'Um [[e6_t|Uhrzeit|t|Richter angerufen]] Uhr beantragte [[e6_wer|Wer beantragte|k]] beim Amtsgericht [[e6_ag|Ort]] die Entscheidung über Zulässigkeit und Fortdauer der Freiheitsentziehung (§ 36 Abs. 1 PolG NRW, Art. 104 Abs. 2 GG). [[e6_ri|Richterin oder Richter|l]] entschied um [[e6_et|Uhrzeit|t|Richterliche Entscheidung]] Uhr: [[e6_erg|Ergebnis|l]].'],
      ['nacht', '', 'Um [[e6_v_t|Uhrzeit|t|Versuch, Richter zu erreichen]] Uhr versuchte [[e6_v_wer|Wer versuchte es|k]], eine richterliche Entscheidung über Zulässigkeit und Fortdauer der Freiheitsentziehung herbeizuführen (§ 36 Abs. 1 PolG NRW, Art. 104 Abs. 2 GG). Ein Richter war nicht zu erreichen: [[e6_v_x|Ergebnis des Versuchs|l]]. ((e6_n))'],
      ['entb', '', 'Eine richterliche Entscheidung wurde nach § 36 Abs. 1 Satz 2 PolG NRW nicht herbeigeführt, weil anzunehmen war, dass sie erst nach Wegfall des Grundes der Maßnahme ergehen würde. Dies entschied [[e6_ent_wer|Wer entschied|k]] um [[e6_ent_t|Uhrzeit|t|Entscheidung ohne Richter]] Uhr.']] },
    e6_n: { l: 'Wie ging es weiter', o: [
      ['morgen', '', 'Mit Beginn des richterlichen Bereitschaftsdienstes beantragte [[e6_wer|Wer beantragte|k]] um [[e6_t|Uhrzeit|t|Richter angerufen]] Uhr beim Amtsgericht [[e6_ag|Ort]] die Entscheidung. [[e6_ri|Richterin oder Richter|l]] entschied um [[e6_et|Uhrzeit|t|Richterliche Entscheidung]] Uhr: [[e6_erg|Ergebnis|l]].'],
      ['frei', '', 'Der Grund der Maßnahme entfiel, bevor eine richterliche Entscheidung zu erlangen war. {Der} wurde um [[e6_frei_t|Uhrzeit|t|Entlassung]] Uhr entlassen (§ 38 Abs. 1 Nr. 1 PolG NRW).']] }
  };

  /* ======================= Felder (Darstellung durch writer.js) ======================= */
  const K = id => 'gw.' + id;
  const inF = (k, v) => d => arr(F(d)[k]).includes(v);
  const isF = (k, v) => d => (Array.isArray(v) ? v.includes(F(d)[k]) : F(d)[k] === v);
  const fT = (id, l, o = {}) => ({ k: K(id), t: 'time', l, w: 'half', q: 'jetzt', ...o });
  const fD = (id, l, o = {}) => ({ k: K(id), t: 'date', l, w: 'half', q: 'heute', ...o });
  const fW = (id, l, o = {}) => ({ k: K(id), t: 'crewpick', l, kurz: true, ...o });
  const fS = (id, l, pre, ph, o = {}) => ({ k: K(id), t: 'text', l, pre, ph, max: 400, ...o });
  const fA = (id, l, ph, h, o = {}) => ({ k: K(id), t: 'area', l, ph, h, rows: 4, max: 6000, lint: 'tats', ...o });
  const fC = (id, l, opts, o = {}) => ({ k: K(id), t: 'choice', l, o: opts, ...o });
  const fM = (id, l, opts, o = {}) => ({ k: K(id), t: 'multi', l, o: opts, ...o });
  const fY = (id, l, o = {}) => ({ k: K(id), t: 'yn', l, ...o });
  const fH = (text, h, o = {}) => ({ t: 'head', text, h, ...o });
  const fI = (text, o = {}) => ({ t: 'info', text, ...o });
  const noFest = { t: 'info', when: d => { const v = V[F(d).art]; return !!v && !has(F(d)[v.main]); }, text: 'Die Feststellungen fehlen noch (Schritt davor). Die Folgerungen erscheinen erst im Text, wenn die Tatsachen beschrieben sind.' };
  const LEIT_N1 = 'Leitfragen: Wo und in welcher Haltung angetroffen? Reaktion auf Ansprache, Berührung, Schmerzreiz? Orientiert zu Ort, Zeit, Person? Sprache? Steh- und Gehfähigkeit? Geruch, Pupillen, Gesichtsfarbe? Verletzungen, Erbrochenes? Kleidung, Witterung, Temperatur? Äußerungen wörtlich. Verhalten gegenüber den Einsatzkräften. Atemalkoholtest (freiwillig) mit Wert und Uhrzeit. Angaben Dritter.';

  /* ======================= Gerüste je Gewahrsamsart =======================
     Je Abschnitt: fields (Fragen) und b (Text). Textbausteine: p = Satz, ak = Satz nur wenn on(f), grp = Satzteile,
     ff = Freitext, need = Pflichtangabe, fn = berechneter Satz. Lücken [[id|Platzhalter|t/d/k/l|Zeitleiste]], Weichen ((id)), Satzführung {der}.
     dep: Folgerungen erst, wenn die Feststellungen (main) ausgefüllt sind. */
  const V = {
    n1: { short: 'Abs. 1 Nr. 1', sub: 'Schutzgewahrsam', name: 'Schutzgewahrsam', norm: '§ 35 Abs. 1 Nr. 1 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: erforderlich. Die Gefahr droht der Person selbst, z. B. bei Rausch, Desorientierung, Unterkühlung, Verletzung oder Suizidgefahr.',
      secs: [
        { k: 'B', t: 'Feststellungen', sec: 's', lead: 'Nur Tatsachen: was gesehen, gehört, gerochen oder gemessen wurde. Jede Person zeigt sich anders – hier beschreibst du genau diese.',
          fields: [fT('b_t', 'Eintreffen um'), fA('b_fest', 'Was haben die Einsatzkräfte festgestellt?', 'Der Mann stand vor dem Eingang und musste sich an der Hauswand abstützen, um nicht zu fallen …', LEIT_N1, { req: true })],
          b: [{ t: 'p', x: 'Bei Eintreffen um [[b_t|Uhrzeit|t|Eintreffen]] Uhr stellte sich die Lage wie folgt dar:' }, { t: 'ff', id: 'b_fest', l: 'Feststellungen' }] },
        { k: 'C', t: 'Würdigung', sec: 'r', dep: true, lead: 'Was folgt aus den Feststellungen? Antippen – die fertigen Sätze stehen unten im Text.',
          fields: [
            noFest,
            fM('c_zust', 'In welchem Zustand war die Person?', [['will', 'Freie Willensbestimmung ausgeschlossen'], ['hilf', 'Hilflose Lage']], { req: true }),
            fS('c_urs_x', 'Ursache, soweit erkennbar (optional)', 'Als Ursache des Zustandes kam in Betracht', 'eine erhebliche Alkoholisierung'),
            fC('c_gef', 'Konkrete Gefahr für', [['leib', 'Leib'], ['leben', 'Leben'], ['beide', 'Leib und Leben']], { req: true }),
            fM('c_folge', 'Was drohte ohne Einschreiten?', [['sturz', 'Sturz, Verletzung'], ['verk', 'Straßenverkehr'], ['kalt', 'Auskühlung'], ['asp', 'Erbrochenes einatmen'], ['selbst', 'Selbstverletzung, Suizid'], ['eig', 'Eigene Formulierung']], { req: true }),
            { k: K('g_temp'), t: 'number', l: 'Außentemperatur', unit: '°C', w: 'half', step: 1, when: inF('c_folge', 'kalt') },
            fS('g_eig_x', 'Eigene Formulierung', d => `Ohne Einschreiten war damit zu rechnen, dass ${G(d).er}`, 'in das Hafenbecken stürzt', { when: inF('c_folge', 'eig') }),
            fY('c_frei', 'Gab es Anhaltspunkte, dass die Person die Gefahr frei und eigenverantwortlich in Kauf nahm?', { req: true, h: 'Eine freiverantwortliche Selbstgefährdung eines einsichtsfähigen Erwachsenen trägt keinen Schutzgewahrsam.' }),
            fH('Selbsttötung', 'nur wenn „Selbstverletzung, Suizid“ gewählt ist', { when: inF('c_folge', 'selbst') }),
            fA('c_suiz', 'Äußerungen und Anzeichen zur Selbsttötung', 'Er sagte: „Ich spring gleich da runter.“', 'Wörtliche Äußerungen, Plan, Mittel, Zeitpunkt, frühere Versuche.', { when: inF('c_folge', 'selbst') }),
            fY('c_suiz1', 'Beruhte die Absicht erkennbar auf einer akuten Ausnahmesituation?', { when: inF('c_folge', 'selbst') }),
            fW('c_ob_wer', 'Wer verständigte die Ordnungsbehörde (PsychKG NRW)?', { when: inF('c_folge', 'selbst') }),
            fT('c_ob_t', 'Ordnungsbehörde verständigt um', { when: inF('c_folge', 'selbst') }),
            fS('c_ob', 'Welche Behörde, wer?', 'Verständigt wurde', 'das Ordnungsamt Musterstadt, Herr K.', { w: 'half', when: inF('c_folge', 'selbst') }),
            fS('c_nr2_x', 'Zusätzlich auf Abs. 1 Nr. 2 stützen? (optional)', 'Darüber hinaus war der Gewahrsam auf § 35 Abs. 1 Nr. 2 PolG NRW zu stützen, weil', 'er ankündigte, den Türsteher „fertigzumachen“')
          ],
          b: [
            { t: 'p', x: 'Aufgrund der vorstehend beschriebenen Feststellungen war von Folgendem auszugehen:' },
            { t: 'ak', on: f => arr(f.c_zust).includes('will'), x: '{Der} befand sich erkennbar in einem Zustand, der die freie Willensbestimmung ausschloss. {Er} war nicht in der Lage, die Gefahren {seiner} Lage zu erkennen und sich danach zu verhalten.' },
            { t: 'ak', on: f => arr(f.c_zust).includes('hilf'), x: '{Der} befand sich in einer hilflosen Lage, aus der {er} sich aus eigener Kraft nicht befreien konnte.' },
            { t: 'need', when: f => !arr(f.c_zust).length, l: 'Zustand' },
            { t: 'ak', on: f => has(f.c_urs_x), x: 'Als Ursache des Zustandes kam nach den Feststellungen [[c_urs_x|Ursache|l]] in Betracht.' },
            { t: 'p', x: 'Für {den} bestand eine konkrete Gefahr für ((c_gef)).' },
            { t: 'grp', lead: 'Ohne polizeiliches Einschreiten war damit zu rechnen, dass {er}', join: 'oder', tail: '.', miss: 'drohende Folge', items: [
              [f => arr(f.c_folge).includes('sturz'), 'infolge der eingeschränkten Steh- und Gehfähigkeit stürzt und sich erheblich verletzt'],
              [f => arr(f.c_folge).includes('verk'), 'in den fließenden Verkehr gerät und von einem Fahrzeug erfasst wird'],
              [f => arr(f.c_folge).includes('kalt'), 'bei einer Außentemperatur von [[g_temp|Temperatur]] °C auskühlt'],
              [f => arr(f.c_folge).includes('asp'), 'bei herabgesetzten Schutzreflexen Erbrochenes einatmet'],
              [f => arr(f.c_folge).includes('selbst'), 'sich selbst verletzt oder tötet'],
              [f => arr(f.c_folge).includes('eig'), '[[g_eig_x|eigene Formulierung|l]]']] },
            { t: 'ak', on: f => f.c_frei === 'nein', x: 'Anhaltspunkte dafür, dass {der} die Gefahr frei und eigenverantwortlich in Kauf nahm, lagen nicht vor.' },
            { t: 'ff', id: 'c_suiz', when: f => arr(f.c_folge).includes('selbst'), np: true, lead: 'Zu einer möglichen Selbsttötung stellten die Einsatzkräfte fest:', l: 'Äußerungen zur Selbsttötung' },
            { t: 'ak', on: f => arr(f.c_folge).includes('selbst') && f.c_suiz1 === 'ja', x: 'Es war davon auszugehen, dass die geäußerte Absicht nicht auf einer freien, unbeeinflussten Willensbildung beruhte, sondern auf einer akuten Ausnahmesituation.' },
            { t: 'ak', on: f => arr(f.c_folge).includes('selbst') && (has(f.c_ob_t) || has(f.c_ob_wer) || has(f.c_ob)), x: 'Wegen Anzeichen einer psychischen Erkrankung verständigte [[c_ob_wer|Wer verständigte|k]] um [[c_ob_t|Uhrzeit|t|Ordnungsbehörde verständigt]] Uhr die örtliche Ordnungsbehörde ([[c_ob|Behörde, Ansprechperson|l]]) zur Prüfung einer sofortigen Unterbringung nach § 14 PsychKG NRW. Der Gewahrsam sollte bis zu deren Entscheidung andauern.' },
            { t: 'ak', on: f => has(f.c_nr2_x), np: true, x: 'Darüber hinaus war der Gewahrsam auf § 35 Abs. 1 Nr. 2 PolG NRW zu stützen, weil [[c_nr2_x|Begründung|l]].' }
          ],
          rules: f => [
            ...(f.c_frei === 'ja' ? ['Freiverantwortliche Selbstgefährdung angegeben: Sie trägt keinen Schutzgewahrsam (C).'] : []),
            ...(!f.c_frei ? ['Frage zur freiverantwortlichen Selbstgefährdung beantworten (C).'] : []),
            ...(arr(f.c_folge).includes('selbst') && !has(f.c_ob_t) ? ['Suizidgefahr: Ordnungsbehörde zur Prüfung nach dem PsychKG NRW verständigen (C).'] : []),
            ...(has(f.c_nr2_x) ? ['Zweitstütze Abs. 1 Nr. 2: Prognose und Unerlässlichkeit zusätzlich begründen.'] : [])
          ] },
        { k: 'D', t: 'Erforderlichkeit, Zweck, Dauer', sec: 'r', dep: true, lead: 'Welche milderen Mittel schieden aus, und bis wann soll der Gewahrsam dauern? Nur ausfüllen, was zutrifft.',
          fields: [
            noFest,
            fS('d_ang_x', 'Warum keine Übergabe an Angehörige oder andere Betreuung?', 'Eine Übergabe an Angehörige oder eine andere zur Betreuung bereite Person schied aus, weil', 'die Begleiterin erklärte, ihn in diesem Zustand nicht betreuen zu können'),
            fS('d_wohn_x', 'Warum nicht in die eigene Wohnung?', 'Ein Verbringen in die eigene Wohnung schied aus, weil', 'er allein lebt und eine Betreuung dort nicht sichergestellt war'),
            fS('d_med_x', 'Ergebnis der medizinischen Abklärung', 'Eine stationäre medizinische Versorgung kam nicht in Betracht:', 'Der Rettungsdienst stellte um 02:30 Uhr keine Behandlungsbedürftigkeit fest'),
            fI('Medizinischer Bedarf geht vor. Wer behandlungsbedürftig ist, gehört ins Krankenhaus und nicht in die Zelle.'),
            fS('d_zweck', 'Bis wann sollte der Gewahrsam dauern?', 'Er sollte nur so lange andauern, bis', 'er wieder sicher steh- und gehfähig und orientiert ist', { req: true })
          ],
          b: [
            { t: 'p', np: true, ow: f => has(f.d_ang_x) || has(f.d_wohn_x) || has(f.d_med_x), x: 'Mildere, gleich geeignete Mittel standen nicht zur Verfügung.' },
            { t: 'ak', on: f => has(f.d_ang_x), x: 'Eine Übergabe an Angehörige oder eine andere zur Betreuung bereite Person schied aus, weil [[d_ang_x|Grund|l]].' },
            { t: 'ak', on: f => has(f.d_wohn_x), x: 'Ein Verbringen in die eigene Wohnung schied aus, weil [[d_wohn_x|Grund|l]].' },
            { t: 'ak', on: f => has(f.d_med_x), x: 'Eine stationäre medizinische Versorgung kam nicht in Betracht: [[d_med_x|Ergebnis|l]].' },
            { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 1 PolG NRW war daher zum Schutz {des} erforderlich. Er war auch angemessen, weil der vorübergehende Entzug der Freiheit hinter dem Schutz der bedrohten Rechtsgüter zurücktritt. Er sollte nur so lange andauern, bis [[d_zweck|Zweck|l]].' }
          ],
          rules: f => (!has(f.d_ang_x) && !has(f.d_wohn_x) && !has(f.d_med_x) ? ['Erforderlichkeit: kein milderes Mittel geprüft (Angehörige, Wohnung, Rettungsdienst) (D).'] : []) }
      ] },

    n2: { short: 'Abs. 1 Nr. 2', sub: 'Verhinderung', name: 'Verhinderungsgewahrsam', norm: '§ 35 Abs. 1 Nr. 2 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Eine Straftat oder eine Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit steht unmittelbar bevor oder wird fortgesetzt.',
      secs: [
        { k: 'B', t: 'Tatsachen für die Prognose', sec: 's', lead: 'Nur aktuelle Tatsachen aus dieser Situation. Frühere Taten oder Erkenntnisse allein tragen keine Prognose.',
          fields: [fT('b_t', 'Eintreffen um'), fA('b_fest', 'Welche Tatsachen sprechen für die drohende Tat?', 'Sie rief in Richtung des Fensters: „Komm runter, ich stech dich ab!“ …', 'Leitfragen: Was hat die Person wörtlich gesagt? Gegen wen richtet es sich, und wo ist diese Person? Mitgeführte Gegenstände? Was ist unmittelbar vorher passiert? Hat sie nach Ansprache weitergemacht? Erkenntnisse aus Abfragen nur ergänzend.', { req: true })],
          b: [{ t: 'p', x: 'Bei Eintreffen um [[b_t|Uhrzeit|t|Eintreffen]] Uhr stellten die Einsatzkräfte Folgendes fest:' }, { t: 'ff', id: 'b_fest', l: 'Tatsachen' }] },
        { k: 'C', t: 'Würdigung', sec: 'r', dep: true, lead: 'Welche Tat drohte, und woraus folgt, dass sie unmittelbar bevorstand?',
          fields: [
            noFest,
            fC('c_art', 'Was stand unmittelbar bevor?', [['beg', 'Begehung'], ['fort', 'Fortsetzung']], { req: true, w: 'half' }),
            fC('c_typ', 'Einer …', [['st', 'Straftat'], ['owi', 'OWi von erheblicher Bedeutung']], { req: true, w: 'half' }),
            fS('c_delikt', 'Welche Tat?', 'nämlich', 'einer gefährlichen Körperverletzung (§ 224 StGB)', { req: true }),
            fS('c_opfer', 'Gegen wen?', 'zum Nachteil', 'ihres früheren Lebensgefährten, Herrn L.'),
            fS('c_owi_x', 'Warum von erheblicher Bedeutung für die Allgemeinheit?', 'Die erhebliche Bedeutung für die Allgemeinheit ergab sich daraus, dass', 'eine Vielzahl von Anwohnern zur Nachtzeit betroffen war', { when: isF('c_typ', 'owi') }),
            fM('c_prog', 'Woraus folgt, dass die Tat unmittelbar bevorstand?', [['ank', 'Tat angekündigt'], ['ggst', 'Tatmittel dabei'], ['vor', 'Gleiches unmittelbar zuvor getan'], ['fort', 'Trotz Ansprache weitergemacht'], ['err', 'Gefährdete Person erreichbar']], { req: true }),
            fS('p_ggst_x', 'Welche Tatmittel?', 'zur Tatausführung geeignet, nämlich', 'ein Küchenmesser', { when: inF('c_prog', 'ggst') })
          ],
          b: [
            { t: 'p', x: 'Aufgrund dieser Tatsachen stand die ((c_art)) einer ((c_typ)) unmittelbar bevor, nämlich [[c_delikt|Tat|l]] zum Nachteil [[c_opfer|wessen|l]].' },
            { t: 'p', when: f => f.c_typ === 'owi', x: 'Die erhebliche Bedeutung für die Allgemeinheit ergab sich daraus, dass [[c_owi_x|Begründung|l]].' },
            { t: 'grp', lead: 'Die Tat stand unmittelbar bevor. Nach den Umständen war mit an Sicherheit grenzender Wahrscheinlichkeit damit zu rechnen, dass der Schaden sofort oder in allernächster Zeit eintritt, weil', join: 'und', tail: '.', miss: 'Tatsachen für die Unmittelbarkeit', items: [
              [f => arr(f.c_prog).includes('ank'), '{der} die Tat ausdrücklich angekündigt hatte'],
              [f => arr(f.c_prog).includes('ggst'), '{er} zur Tatausführung geeignete Gegenstände bei sich führte, nämlich [[p_ggst_x|Gegenstände|l]]'],
              [f => arr(f.c_prog).includes('vor'), '{er} unmittelbar zuvor gleichartige Handlungen begangen hatte und nichts auf ein Abstandnehmen hindeutete'],
              [f => arr(f.c_prog).includes('fort'), '{er} {sein} Verhalten trotz Ansprache und Aufforderung fortsetzte'],
              [f => arr(f.c_prog).includes('err'), 'die gefährdete Person für {ihn} ohne Weiteres erreichbar war']] }
          ],
          rules: f => (f.c_typ === 'owi' ? ['Ordnungswidrigkeit: Nicht jede reicht – die erhebliche Bedeutung für die Allgemeinheit im Einzelfall begründen (C).'] : []) },
        { k: 'D', t: 'Unerlässlichkeit, Zweck, Dauer', sec: 'r', dep: true, lead: 'Welche milderen Mittel reichten nicht – wer hat was wann getan? Bis wann soll der Gewahrsam dauern?',
          fields: [
            noFest,
            fM('d_mild', 'Welche milderen Mittel reichten nicht?', [['ga', 'Gefährderansprache'], ['pv', 'Platzverweis, erfolglos'], ['pv0', 'Platzverweis kam nicht in Betracht'], ['si', 'Sicherstellung'], ['beg', 'Übergabe an Begleitpersonen']], { req: true }),
            fH('Gefährderansprache', '', { when: inF('d_mild', 'ga') }),
            fW('d_ga_wer', 'Wer sprach die Person an?', { when: inF('d_mild', 'ga') }),
            fT('d_ga_t', 'Gefährderansprache um', { when: inF('d_mild', 'ga') }),
            fS('d_ga_x', 'Reaktion', 'Die Gefährderansprache blieb ohne Wirkung:', 'sie erklärte „Das zieht ihr nicht durch“', { when: inF('d_mild', 'ga') }),
            fH('Platzverweis', '', { when: inF('d_mild', 'pv') }),
            fW('d_pv_wer', 'Wer sprach den Platzverweis aus?', { when: inF('d_mild', 'pv') }),
            fT('d_pv_t', 'Platzverweis um', { when: inF('d_mild', 'pv') }),
            fS('d_pv_x', 'Warum blieb er erfolglos?', 'Der Platzverweis blieb erfolglos, weil', 'sie nach neun Minuten zurückkehrte', { when: inF('d_mild', 'pv') }),
            fS('d_pv0_x', 'Warum kam kein Platzverweis in Betracht?', 'Ein Platzverweis kam nicht in Betracht, weil', 'ihr die Wohnung des Opfers bekannt ist', { when: inF('d_mild', 'pv0') }),
            fH('Sicherstellung', '', { when: inF('d_mild', 'si') }),
            fS('d_si_g', 'Was wurde sichergestellt?', 'Die Sicherstellung', 'des Küchenmessers', { when: inF('d_mild', 'si') }),
            fW('d_si_wer', 'Wer stellte sicher?', { when: inF('d_mild', 'si') }),
            fS('d_si_x', 'Warum reichte das nicht?', 'beseitigte die Gefahr allein nicht, weil', 'sie ankündigte, sich ein anderes Messer zu holen', { when: inF('d_mild', 'si') }),
            fS('d_beg_x', 'Warum keine Übergabe an Begleitpersonen?', 'Eine Übergabe an Begleitpersonen schied aus, weil', 'keine Begleitperson vor Ort war', { when: inF('d_mild', 'beg') }),
            fH('Dauer'),
            fS('d_zweck', 'Bis wann?', 'Der Gewahrsam sollte andauern, bis', 'die akute Erregung abgeklungen ist', { req: true }),
            fS('d_bis', 'Längstens bis', 'längstens bis', '13.11.2026, 08:00 Uhr', { req: true }),
            fI('Wurde bereits eine Straftat begangen, laufen Festnahme nach StPO und Gewahrsam nebeneinander: beides getrennt begründen, Strafanzeige fertigen. Über das Ende des Folgetages hinaus nur mit richterlicher Anordnung (§ 38 PolG NRW).')
          ],
          b: [
            { t: 'p', np: true, ow: f => arr(f.d_mild).length > 0, x: 'Der Gewahrsam war unerlässlich. Mildere Mittel reichten nicht aus:' },
            { t: 'ak', on: f => arr(f.d_mild).includes('ga'), x: 'Eine Gefährderansprache durch [[d_ga_wer|Wer sprach an|k]] um [[d_ga_t|Uhrzeit|t|Gefährderansprache]] Uhr blieb ohne Wirkung: [[d_ga_x|Reaktion|l]].' },
            { t: 'ak', on: f => arr(f.d_mild).includes('pv'), x: 'Ein Platzverweis, den [[d_pv_wer|Wer sprach ihn aus|k]] um [[d_pv_t|Uhrzeit|t|Platzverweis ausgesprochen]] Uhr aussprach, blieb erfolglos, weil [[d_pv_x|Grund|l]].' },
            { t: 'ak', on: f => arr(f.d_mild).includes('pv0'), x: 'Ein Platzverweis kam nicht in Betracht, weil [[d_pv0_x|Grund|l]].' },
            { t: 'ak', on: f => arr(f.d_mild).includes('si'), x: 'Die Sicherstellung [[d_si_g|Gegenstand|l]] durch [[d_si_wer|Wer stellte sicher|k]] beseitigte die Gefahr allein nicht, weil [[d_si_x|Grund|l]].' },
            { t: 'ak', on: f => arr(f.d_mild).includes('beg'), x: 'Eine Übergabe an Begleitpersonen schied aus, weil [[d_beg_x|Grund|l]].' },
            { t: 'need', when: f => !arr(f.d_mild).length, l: 'mildere Mittel' },
            { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 2 PolG NRW sollte andauern, bis [[d_zweck|Zweck|l]], längstens bis [[d_bis|Datum, Uhrzeit]].' }
          ] }
      ] },

    n3: { short: 'Abs. 1 Nr. 3', sub: 'Platzverweis', name: 'Durchsetzung eines Platzverweises', norm: '§ 35 Abs. 1 Nr. 3 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Zuerst den Platzverweis selbst dokumentieren, dann die Missachtung.',
      secs: [
        { k: 'B1', t: 'Der Platzverweis', sec: 's', lead: 'Wer hat wann was angeordnet, und welche Gefahr sollte abgewehrt werden?',
          fields: [
            fT('b_pv_t', 'Platzverweis erteilt um'),
            fW('b_pv_wer', 'Wer erteilte den Platzverweis?', { req: true }),
            fS('b_pv_ber', 'Welcher Bereich?', d => `${cap(G(d).dem)} wurde aufgegeben,`, 'den Bereich des Altstadtfestes zwischen Marktplatz und Kirchstraße', { post: 'zu verlassen', req: true }),
            fS('b_pv_bis', 'Bis wann?', 'und bis', '13.11.2026, 06:00 Uhr', { post: 'nicht wieder zu betreten', req: true }),
            fA('b_pv_gef', 'Welche Gefahr sollte der Platzverweis abwehren?', 'Sie hatte am Bierstand eine andere Besucherin zweimal gegen die Schulter gestoßen …', 'Was war passiert? Welche Gefahr drohte am Ort? Wer war betroffen?', { req: true }),
            fY('b_pv_bek', 'Wurde der Platzverweis klar und verständlich bekannt gegeben und verstanden?', { req: true }),
            fS('b_pv_reak', 'Woran war erkennbar, dass er verstanden wurde?', d => `${cap(G(d).er)} ließ erkennen, dass ${G(d).er} die Anordnung verstanden hatte:`, 'sie antwortete „Ja, ja, ich geh ja schon“', { when: isF('b_pv_bek', 'ja') }),
            fY('b_pv_ank', 'Wurde die Ingewahrsamnahme für den Fall der Nichtbefolgung angekündigt?', { h: 'Nicht ausdrücklich vorgeschrieben, belegt aber, dass der Gewahrsam das letzte Mittel war.' }),
            fW('b_pv_ank_wer', 'Wer kündigte sie an?', { when: isF('b_pv_ank', 'ja') })
          ],
          b: [
            { t: 'p', x: 'Um [[b_pv_t|Uhrzeit|t|Platzverweis erteilt]] Uhr erteilte [[b_pv_wer|Wer erteilte ihn|k]] {dem} einen Platzverweis nach § 34 Abs. 1 PolG NRW. {Ihm} wurde aufgegeben, [[b_pv_ber|Bereich|l]] zu verlassen und bis [[b_pv_bis|Datum, Uhrzeit]] nicht wieder zu betreten. Der Platzverweis diente der Abwehr folgender Gefahr:' },
            { t: 'ff', id: 'b_pv_gef', l: 'Gefahr' },
            { t: 'ak', on: f => f.b_pv_bek === 'ja', np: true, x: 'Die Anordnung wurde {ihm} mündlich, klar und in verständlicher Sprache bekannt gegeben. {Er} ließ erkennen, dass {er} sie verstanden hatte: [[b_pv_reak|Reaktion|l]].' },
            { t: 'ak', on: f => f.b_pv_ank === 'ja', x: 'Für den Fall der Nichtbefolgung kündigte [[b_pv_ank_wer|Wer kündigte an|k]] {ihm} die Ingewahrsamnahme an.' }
          ],
          rules: f => (f.b_pv_bek !== 'ja' ? ['Bekanntgabe des Platzverweises nicht dokumentiert. Ohne wirksame Anordnung kein Durchsetzungsgewahrsam (B1).'] : []) },
        { k: 'B2', t: 'Die Missachtung', sec: 's', lead: 'Was genau tat die Person entgegen der Anordnung, und wer hat es festgestellt?',
          fields: [fT('b_mis_t', 'Missachtung festgestellt um'), fW('b_mis_wer', 'Wer stellte das fest?'), fA('b_fest', 'Was genau, wo, wie oft?', 'Sie stand erneut am Bierstand und rief der Besucherin zu: „Wir sind noch nicht fertig!“ …', 'Wo wurde die Person angetroffen? Was tat sie? Wurde sie bereits aus dem Bereich gebracht? Was sagte sie wörtlich?', { req: true })],
          b: [{ t: 'p', x: 'Um [[b_mis_t|Uhrzeit|t|Missachtung festgestellt]] Uhr stellte [[b_mis_wer|Wer stellte es fest|k]] fest, dass {der} dem Platzverweis nicht nachkam:' }, { t: 'ff', id: 'b_fest', l: 'Missachtung' }] },
        { k: 'D', t: 'Unerlässlichkeit, Dauer', sec: 'r', dep: true, lead: 'Warum reichte es nicht, die Person aus dem Bereich zu bringen?',
          fields: [
            noFest,
            fS('d_uz_x', 'Warum reichte das Verbringen aus dem Bereich nicht?', 'Eine Durchsetzung durch unmittelbaren Zwang, etwa durch Verbringen aus dem Bereich, reichte nicht aus, weil', 'sie bereits um 21:55 Uhr verbracht worden war und zurückkehrte'),
            fS('d_rueck_x', 'Kündigte die Person an zurückzukehren? (wörtlich, optional)', d => `${cap(G(d).er)} kündigte an, zurückzukehren:`, '„Ich bin gleich wieder da“'),
            fS('d_zweck', 'Bis wann?', 'Der Gewahrsam sollte andauern, bis', 'das Altstadtfest um 01:00 Uhr beendet ist', { req: true })
          ],
          b: [
            { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 3 PolG NRW war unerlässlich, um den Platzverweis durchzusetzen.' },
            { t: 'ak', on: f => has(f.d_uz_x), x: 'Eine Durchsetzung durch unmittelbaren Zwang, etwa durch Verbringen aus dem Bereich, reichte nicht aus, weil [[d_uz_x|Grund|l]].' },
            { t: 'ak', on: f => has(f.d_rueck_x), x: '{Er} kündigte an, zurückzukehren: [[d_rueck_x|Äußerung|l]].' },
            { t: 'p', x: 'Der Gewahrsam sollte andauern, bis [[d_zweck|Zweck|l]], längstens bis zum Ablauf des Platzverweises.' }
          ],
          rules: f => (!has(f.d_uz_x) && !has(f.d_rueck_x) ? ['Unerlässlichkeit: Warum reichte das Verbringen aus dem Bereich nicht? (D)'] : []) }
      ] },

    n4: { short: 'Abs. 1 Nr. 4', sub: 'Wohnungsverweisung', name: 'Durchsetzung von Wohnungsverweisung oder Rückkehrverbot', norm: '§ 35 Abs. 1 Nr. 4 PolG NRW', main: 'b_fest',
      lead: 'Maßstab: unerlässlich. Erst die Verfügung nach § 34a, dann die Missachtung.',
      secs: [
        { k: 'B1', t: 'Die Verfügung', sec: 's', lead: 'Wer hat wann was verfügt, und wie wurde es bekannt gegeben?',
          fields: [
            fD('b_wv_d', 'Verfügung vom'), fT('b_wv_t', 'um', { q: '' }),
            fW('b_wv_wer', 'Wer verfügte die Wohnungsverweisung?', { req: true }),
            fS('b_wv_adr', 'Aus welcher Wohnung?', 'aus der Wohnung', 'Birkenweg 5, 2. OG links, Musterstadt,', { req: true }),
            fS('b_wv_umg', 'Und aus welcher Umgebung?', 'und', 'dem Hausflur, dem Treppenhaus und einem Umkreis von 50 m um das Haus'),
            fS('b_wv_bis', 'Rückkehrverbot bis', 'Ein Rückkehrverbot besteht bis', '20.11.2026, 18:00 Uhr', { req: true }),
            fD('b_wv_bekd', 'Bekannt gegeben am'),
            fC('b_wv_bek', 'Wie bekannt gegeben?', [['pers', 'Persönlich eröffnet und ausgehändigt'], ['and', 'Auf andere Weise']], { w: 'half' }),
            fS('b_wv_and', 'Wie?', 'bekannt gegeben durch', 'Einwurf in den Briefkasten der Anschrift seines Bruders', { when: isF('b_wv_bek', 'and') })
          ],
          b: [{ t: 'p', x: 'Mit Verfügung vom [[b_wv_d|Datum|d]], [[b_wv_t|Uhrzeit|t|Wohnungsverweisung verfügt]] Uhr, verwies [[b_wv_wer|Wer verfügte|k]] {den} nach § 34a PolG NRW aus der Wohnung [[b_wv_adr|Anschrift|l]] und [[b_wv_umg|Umgebung|l]]. Ein Rückkehrverbot besteht bis [[b_wv_bis|Datum, Uhrzeit]]. Die Verfügung wurde {ihm} am [[b_wv_bekd|Datum|d]] ((b_wv_bek)).' }] },
        { k: 'B2', t: 'Die Missachtung', sec: 's', lead: 'Was genau stellten die Einsatzkräfte fest, und wer?',
          fields: [fD('b_mis_d', 'Am'), fT('b_mis_t', 'um'), fW('b_mis_wer', 'Wer stellte das fest?'), fA('b_fest', 'Was wurde festgestellt?', 'Er stand im Treppenhaus vor der Wohnungstür und klingelte wiederholt …', 'Wo wurde die Person angetroffen? Wie ist sie in den Bereich gelangt? Was sagte sie wörtlich? Was berichtet die gefährdete Person? Frühere Rückkehr?', { req: true })],
          b: [{ t: 'p', x: 'Am [[b_mis_d|Datum|d]] um [[b_mis_t|Uhrzeit|t|Missachtung festgestellt]] Uhr stellte [[b_mis_wer|Wer stellte es fest|k]] Folgendes fest:' }, { t: 'ff', id: 'b_fest', l: 'Missachtung' }] },
        { k: 'D', t: 'Unerlässlichkeit, Dauer', sec: 'r', dep: true, lead: 'Warum reichte es nicht, die Person aus dem Bereich zu bringen?',
          fields: [
            noFest,
            fS('d_verbr_x', 'Warum reichte das Verbringen aus dem Bereich nicht?', 'Ein Verbringen aus dem Bereich reichte nicht aus, weil', 'er bereits am Vortag verbracht worden war und zurückkehrte'),
            fS('d_rueck4_x', 'Warum war eine sofortige Rückkehr zu erwarten?', d => `Es war damit zu rechnen, dass ${G(d).er} unmittelbar zurückkehrt, weil`, 'er ankündigte, „so lange wiederzukommen, bis sie mit mir redet“'),
            fS('d_zweck', 'Bis wann?', 'Der Gewahrsam sollte andauern, bis', 'er sich beruhigt hat und eine Rückkehr nicht mehr unmittelbar zu erwarten ist', { req: true }),
            fI('Droht erneut Gewalt, zusätzlich Abs. 1 Nr. 2 prüfen. Straftaten (z. B. Hausfriedensbruch, Bedrohung, Verstoß gegen eine gerichtliche Anordnung nach § 4 GewSchG) gesondert anzeigen.')
          ],
          b: [
            { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 1 Nr. 4 PolG NRW war unerlässlich, um die Wohnungsverweisung und das Rückkehrverbot durchzusetzen.' },
            { t: 'ak', on: f => has(f.d_verbr_x), x: 'Ein Verbringen aus dem Bereich reichte nicht aus, weil [[d_verbr_x|Grund|l]].' },
            { t: 'ak', on: f => has(f.d_rueck4_x), x: 'Es war damit zu rechnen, dass {er} unmittelbar zurückkehrt, weil [[d_rueck4_x|Tatsachen|l]].' },
            { t: 'p', x: 'Der Gewahrsam sollte andauern, bis [[d_zweck|Zweck|l]], längstens bis zum Ablauf des Rückkehrverbots.' }
          ],
          rules: f => (!has(f.d_verbr_x) && !has(f.d_rueck4_x) ? ['Unerlässlichkeit: Warum reichte das Verbringen aus dem Bereich nicht? (D)'] : []) }
      ] },

    a2: { short: 'Abs. 2', sub: 'Minderjährige', name: 'Minderjährige, die sich der Obhut entzogen haben', norm: '§ 35 Abs. 2 PolG NRW', main: 'b_fest',
      lead: 'Zweck ist allein die Zuführung. Der Gewahrsam endet mit der Übergabe.',
      secs: [
        { k: 'B', t: 'Feststellungen', sec: 's', lead: 'Alter, Obhut, Vermisstenmeldung.',
          fields: [
            { k: K('b_alter'), t: 'number', l: 'Alter', unit: 'Jahre', w: 'half', min: 0, max: 17, step: 1, req: true },
            fS('b_idf', 'Wie wurde das Alter festgestellt?', 'festgestellt durch', 'Schülerausweis und Abgleich mit der Vermisstenmeldung'),
            fA('b_fest', 'Wie hat sich die Person der Obhut entzogen?', 'Die Wohngruppe hatte sie um 19:30 Uhr als vermisst gemeldet …', 'Vermisstenmeldung von wem und wann? Wo soll sich die Person aufhalten (Elternhaus, Wohngruppe)? Was sagen die Sorgeberechtigten? Eigene Angaben.', { req: true })
          ],
          b: [{ t: 'p', x: '{Der} ist [[b_alter|Alter]] Jahre alt und damit minderjährig (festgestellt durch [[b_idf|Ausweis oder Abfrage|l]]). {Er} hatte sich der Obhut der Sorgeberechtigten entzogen:' }, { t: 'ff', id: 'b_fest', l: 'Obhut entzogen' }],
          rules: f => (has(f.b_alter) && +f.b_alter >= 18 ? ['§ 35 Abs. 2 gilt nur für Minderjährige (B).'] : []) },
        { k: 'C', t: 'Zuführung und Übergabe', sec: 'r', dep: true, lead: 'An wen wird übergeben, warum ging es nicht ohne Gewahrsam, und wer hat wann übergeben?',
          fields: [
            noFest,
            fC('c_zu', 'Zuführung an', [['sorge', 'Sorgeberechtigte bzw. Einrichtung'], ['ja', 'Jugendamt']], { req: true }),
            fS('c_zu_n', 'Wer genau?', 'Zuführung an', 'Wohngruppe Sonnenhof, Frau R.', { req: true }),
            fS('d_ohne_x', 'Warum ging es nicht ohne Gewahrsam?', 'Eine Rückkehr oder Begleitung ohne Gewahrsam war nicht möglich, weil', 'sie ankündigte, mit dem nächsten Bus wieder wegzufahren', { req: true }),
            fY('d_kwg', 'Anhaltspunkte für eine Gefährdung des Kindeswohls?'),
            fS('d_kwg_x', 'Welche?', 'Anhaltspunkte:', 'sie gab an, zu Hause geschlagen zu werden', { when: isF('d_kwg', 'ja') }),
            fW('d_kwg_wer', 'Wer verständigte das Jugendamt?', { when: isF('d_kwg', 'ja') }),
            fT('d_kwg_t', 'Jugendamt verständigt um', { when: isF('d_kwg', 'ja') }),
            fH('Übergabe'),
            fT('d_ueb_t', 'Übergeben um'), fW('d_ueb_wer', 'Wer übergab?'),
            fS('d_ueb', 'An wen?', 'übergeben an', 'Frau R., Gruppenleiterin der Wohngruppe Sonnenhof', { req: true }),
            fI('Nur bis zur Übergabe. Sorgeberechtigte sind in jedem Fall zu benachrichtigen (Schritt „Benachrichtigung“). Unterbringung möglichst nicht in der Gewahrsamszelle und getrennt von Erwachsenen.')
          ],
          b: [
            { t: 'p', x: 'Der Gewahrsam nach § 35 Abs. 2 PolG NRW diente der Zuführung an ((c_zu)) ([[c_zu_n|Name, Stelle|l]]).' },
            { t: 'ak', on: f => has(f.d_ohne_x), x: 'Eine Rückkehr oder Begleitung ohne Gewahrsam war nicht möglich, weil [[d_ohne_x|Grund|l]].' },
            { t: 'ak', on: f => f.d_kwg === 'ja', x: 'Es lagen Anhaltspunkte für eine Gefährdung des Kindeswohls vor: [[d_kwg_x|Tatsachen|l]]. [[d_kwg_wer|Wer verständigte|k]] verständigte um [[d_kwg_t|Uhrzeit|t|Jugendamt verständigt]] Uhr das Jugendamt zur Prüfung einer Inobhutnahme nach § 42 SGB VIII.' },
            { t: 'p', x: '{Der} wurde um [[d_ueb_t|Uhrzeit|t|Übergabe]] Uhr durch [[d_ueb_wer|Wer übergab|k]] an [[d_ueb|wen|l]] übergeben.' }
          ],
          rules: f => (!has(f.d_ohne_x) ? ['Verhältnismäßigkeit: Warum ging es nicht ohne Gewahrsam? (C)'] : []) }
      ] },

    a3: { short: 'Abs. 3', sub: 'Entwichene', name: 'Aus dem Vollzug Entwichene', norm: '§ 35 Abs. 3 PolG NRW', main: 'b_fest',
      lead: 'Zweck ist das Zurückbringen in die Anstalt. Entscheidend sind die sichere Identität und die Bestätigung durch die Anstalt.',
      secs: [
        { k: 'B', t: 'Antreffen und Identität', sec: 's', lead: 'Woran war die Identität zweifelsfrei zu erkennen?',
          fields: [fT('b_t', 'Angetroffen um'), fS('b_ort', 'Wo?', 'angetroffen', 'im Eingangsbereich des Geschäfts Bahnhofstraße 20', { w: 'half' }), fA('b_fest', 'Woran war die Identität zweifelsfrei zu erkennen?', 'Er wies sich mit seinem Personalausweis aus; das Lichtbild stimmte überein …', 'Ausweis, Lichtbildabgleich, Fingerabdruck, besondere Merkmale, Ergebnis der Fahndungsabfrage.', { req: true })],
          b: [{ t: 'p', x: '{Der} wurde um [[b_t|Uhrzeit|t|Antreffen]] Uhr [[b_ort|Ort|l]] angetroffen. {Seine} Identität stand aufgrund folgender Feststellungen zweifelsfrei fest:' }, { t: 'ff', id: 'b_fest', l: 'Identität' }] },
        { k: 'C', t: 'Entweichen und Rückführung', sec: 'r', dep: true, lead: 'Quelle, Status, Bestätigung durch die Anstalt und Rückführung.',
          fields: [
            noFest,
            fS('c_quelle', 'Woher ist das bekannt?', 'Nach', 'der Fahndungsnotierung vom 10.11.2026', { req: true }),
            fC('c_stat', 'Status', [['ent', 'Aus dem Vollzug entwichen'], ['auss', 'Ohne Erlaubnis außerhalb der Anstalt']], { req: true }),
            fS('c_haft', 'Haftart, Anstalt, Umstände', 'Vollzug:', 'Strafhaft im offenen Vollzug der JVA Musterstadt; Rückkehr aus dem Ausgang nicht erfolgt'),
            fH('Bestätigung'),
            fS('c_best', 'Wer hat das bestätigt?', 'Dies bestätigte', 'Herr V., Vollzugsdienstleiter der JVA Musterstadt,', { req: true }),
            fT('c_best_t', 'Bestätigt um'), fW('c_best_ggu', 'Wem gegenüber?'),
            fH('Rückführung'),
            fT('c_rueck_t', 'Zurückgebracht um'), fW('c_rueck_wer', 'Wer brachte die Person zurück?'),
            fS('c_anst', 'In welche Anstalt?', 'zurückgebracht in die', 'JVA Musterstadt', { req: true }),
            fI('Liegt ein Vollstreckungs- oder Sicherungshaftbefehl vor, wird er vollzogen (eigene Formvorschriften in der FE-Prüfung). Bei Unterbringung nach PsychKG oder Betreuungsrecht: Vollzugshilfe für die zuständige Behörde.')
          ],
          b: [
            { t: 'p', x: 'Nach [[c_quelle|Quelle|l]] ((c_stat)) ([[c_haft|Haftart, Anstalt|l]]). Dies bestätigte [[c_best|Name, Anstalt|l]] um [[c_best_t|Uhrzeit|t|Bestätigung der Anstalt]] Uhr gegenüber [[c_best_ggu|Wem gegenüber|k]].' },
            { t: 'p', x: '{Der} wurde daher nach § 35 Abs. 3 PolG NRW in Gewahrsam genommen und um [[c_rueck_t|Uhrzeit|t|Rückführung]] Uhr durch [[c_rueck_wer|Wer brachte zurück|k]] in die [[c_anst|Anstalt]] zurückgebracht.' }
          ] }
      ] }
  };
  const ORDER = ['n1', 'n2', 'n3', 'n4', 'a2', 'a3'];

  /* ======================= Durchführung: für jeden Gewahrsam gleich ======================= */
  const ageAt = (geb, at) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(geb || ''); if (!m) return null;
    const n = /^\d{4}-\d{2}-\d{2}$/.test(at || '') ? new Date(at + 'T12:00:00') : new Date();
    let a = n.getFullYear() - (+m[1]); if ((n.getMonth() + 1) * 100 + n.getDate() < (+m[2]) * 100 + (+m[3])) a--; return a;
  };
  const minderjaehrig = d => { const a = ageAt(get(d, 'gw.p.geb'), F(d).e1_d); return a != null && a < 18; };
  const herbOderMorgen = d => F(d).e6 === 'herb' || (F(d).e6 === 'nacht' && F(d).e6_n === 'morgen');
  const E = {
    E1: { k: 'E1', t: 'Ingewahrsamnahme und Grund', n: '§ 37 PolG NRW',
      fields: [
        fH('Ingewahrsamnahme', '§ 37 PolG NRW'),
        fD('e1_d', 'Datum', { req: true }), fT('e1_t', 'Ingewahrsamnahme um', { req: true }),
        fW('e1_ano', 'Wer ordnete die Ingewahrsamnahme an?', { req: true }),
        fW('e1_wer', 'Wer sprach sie aus und erklärte sie der Person?', { req: true }),
        fC('e1_bek', 'Grund bekannt gegeben', [['sof', 'Sofort dabei'], ['spaet', 'Später, sobald aufnahmefähig']], { w: 'half', req: true }),
        fT('e1_bek_t', 'Grund bekannt gegeben um', { when: isF('e1_bek', 'spaet') }),
        fY('e1_wdh', 'War zweifelhaft, ob die Person die Erklärung verstand, und wurde sie wiederholt?'),
        fW('e1_wdh_wer', 'Wer wiederholte sie?', { when: isF('e1_wdh', 'ja') }),
        fT('e1_wdh_t', 'Wiederholt um', { when: isF('e1_wdh', 'ja') }),
        fC('e1_spr', 'Verständigung', [['de', 'Auf Deutsch'], ['dol', 'Über Dolmetscher']], { w: 'half', req: true }),
        fS('e1_dol', 'Sprache, Dolmetscherin oder Dolmetscher', 'Dolmetscher:', 'Rumänisch, Frau P., telefonisch', { when: isF('e1_spr', 'dol') })
      ],
      b: [
        { t: 'p', x: 'Am [[e1_d|Datum|d]] um [[e1_t|Uhrzeit|t|Ingewahrsamnahme]] Uhr wurde {der} auf Anordnung von [[e1_ano|Anordnende Person|k]] in Gewahrsam genommen. [[e1_wer|Wer sprach sie aus|k]] erklärte {dem} die Ingewahrsamnahme; der Grund wurde {ihm} ((e1_bek)) bekannt gegeben.' },
        { t: 'ak', on: f => f.e1_wdh === 'ja', x: 'Wegen {seines} Zustandes war zweifelhaft, ob {er} die Erklärung verstand. [[e1_wdh_wer|Wer wiederholte|k]] wiederholte sie um [[e1_wdh_t|Uhrzeit|t|Bekanntgabe wiederholt]] Uhr.' },
        { t: 'p', x: 'Die Verständigung erfolgte ((e1_spr)).' }
      ] },
    E2: { k: 'E2', t: 'Zwang und Fesselung', n: '§§ 61, 62 PolG NRW',
      fields: [
        fH('Zwang und Fesselung', '§§ 61, 62 PolG NRW'),
        fC('e2_zw', 'Wurde Zwang angewendet?', [['ohne', 'Ohne Zwang'], ['mit', 'Mit unmittelbarem Zwang']], { req: true }),
        fW('e2_zw_wer', 'Wer wendete Zwang an?', { when: isF('e2_zw', 'mit') }),
        fS('e2_zw_x', 'Art und Folgen', 'Art des Zwangs und Folgen:', 'an beiden Armen ergriffen und zum Streifenwagen geführt; keine Verletzungen', { when: isF('e2_zw', 'mit') }),
        fC('e2_andr', 'Wurde der Zwang vorher angedroht?', [['ja', 'Angedroht'], ['nein', 'Androhung unterblieb']], { when: isF('e2_zw', 'mit'), req: true }),
        fW('e2_andr_wer', 'Wer drohte ihn an?', { when: d => F(d).e2_zw === 'mit' && F(d).e2_andr === 'ja' }),
        fT('e2_andr_t', 'Angedroht um', { when: d => F(d).e2_zw === 'mit' && F(d).e2_andr === 'ja' }),
        fS('e2_andr_x', 'Warum unterblieb die Androhung?', 'Eine Androhung unterblieb, weil', 'er unvermittelt nach PK Muster schlug', { when: d => F(d).e2_zw === 'mit' && F(d).e2_andr === 'nein' }),
        fY('e2_fes', 'Wurde die Person gefesselt?'),
        fW('e2_fes_wer', 'Wer fesselte?', { when: isF('e2_fes', 'ja') }),
        fT('e2_fes_t', 'Gefesselt um', { when: isF('e2_fes', 'ja') }),
        fC('e2_fes_g', 'Tatsachen rechtfertigten die Annahme, dass die Person …', [['ang', 'angreift oder Widerstand leistet'], ['fl', 'flieht'], ['selbst', 'sich tötet oder verletzt']], { when: isF('e2_fes', 'ja') }),
        fS('e2_fes_x', 'Welche Tatsachen?', 'Tatsachen:', 'er hatte unmittelbar zuvor nach PK Muster geschlagen', { when: isF('e2_fes', 'ja') }),
        fI('Unmittelbarer Zwang ist vorher anzudrohen, soweit die Umstände es zulassen. Verletzten ist Beistand zu leisten und ärztliche Hilfe zu verschaffen.')
      ],
      b: [
        { t: 'p', x: 'Die Ingewahrsamnahme erfolgte ((e2_zw)).' },
        { t: 'ak', on: f => f.e2_zw === 'mit' && f.e2_andr === 'ja', x: 'Der unmittelbare Zwang wurde zuvor um [[e2_andr_t|Uhrzeit|t|Zwang angedroht]] Uhr durch [[e2_andr_wer|Wer drohte an|k]] angedroht.' },
        { t: 'ak', on: f => f.e2_zw === 'mit' && f.e2_andr === 'nein', x: 'Eine Androhung unterblieb, weil [[e2_andr_x|Grund|l]].' },
        { t: 'need', when: f => f.e2_zw === 'mit' && !f.e2_andr, l: 'Androhung?' },
        { t: 'ak', on: f => f.e2_fes === 'ja', x: 'Um [[e2_fes_t|Uhrzeit|t|Fesselung]] Uhr fesselte [[e2_fes_wer|Wer fesselte|k]] {den}, weil Tatsachen die Annahme rechtfertigten, dass {er} ((e2_fes_g)) würde: [[e2_fes_x|Tatsachen|l]].' }
      ] },
    E3: { k: 'E3', t: 'Durchsuchung und Verwahrung', n: '§§ 39, 43 PolG NRW',
      fields: [
        fH('Durchsuchung und Verwahrung', '§§ 39, 43 PolG NRW'),
        fT('e3_t', 'Durchsucht um'), fW('e3_wer', 'Wer durchsuchte?'),
        fY('e3_ag', 'Durchsuchung durch eine Person anderen Geschlechts?'),
        fS('e3_ag_x', 'Warum war das sofort erforderlich?', 'Zum Schutz vor einer Gefahr für Leib oder Leben sofort erforderlich:', 'er griff in die Hosentasche, in der ein Messer zu sehen war', { when: isF('e3_ag', 'ja') }),
        fC('e3_art', 'Gegenstände', [['keine', 'Keine'], ['verw', 'In Verwahrung genommen'], ['sich', 'Sichergestellt (§ 43 Nr. 3)']], { req: true }),
        fS('e3_ggs_x', 'Welche Gegenstände?', 'Gegenstände:', 'Geldbörse, Mobiltelefon, Gürtel und Schnürsenkel', { when: isF('e3_art', ['verw', 'sich']) })
      ],
      b: [
        { t: 'p', x: '{Der} wurde um [[e3_t|Uhrzeit|t|Durchsuchung]] Uhr durch [[e3_wer|Wer durchsuchte|k]] nach § 39 Abs. 1 Nr. 1 PolG NRW durchsucht, da {er} festgehalten werden konnte. Dabei ((e3_art)).' },
        { t: 'ak', on: f => f.e3_ag === 'ja', x: 'Die Durchsuchung erfolgte durch eine Person anderen Geschlechts, weil dies zum Schutz vor einer Gefahr für Leib oder Leben sofort erforderlich war: [[e3_ag_x|Grund|l]].' }
      ] },
    E4: { k: 'E4', t: 'Gewahrsamsfähigkeit', n: 'Gewahrsamsvollzugsverordnung NRW',
      fields: [
        fH('Gewahrsamsfähigkeit', 'Gewahrsamsvollzugsverordnung NRW'),
        fC('e4', 'Gewahrsamsfähigkeit', [['arzt', 'Ärztlich festgestellt'], ['nein', 'Ärztlich verneint'], ['kz', 'Keine Zweifel']], { req: true }),
        fT('e4_t', 'Ärztliche Feststellung um', { when: isF('e4', ['arzt', 'nein']) }),
        fS('e4_arzt', 'Ärztin oder Arzt', 'durch', 'Dr. Beispiel (Polizeiärztlicher Dienst)', { w: 'half', when: isF('e4', ['arzt', 'nein']) }),
        fS('e4_kh', 'Wohin gebracht?', 'gebracht in', 'das Klinikum Musterstadt', { when: isF('e4', 'nein') }),
        fS('e4_kz', 'Warum keine Zweifel?', 'Zweifel bestanden nicht, weil', 'sie wach, orientiert und unverletzt war; Hinweise auf Alkohol- oder Drogeneinfluss bestanden nicht', { when: isF('e4', 'kz') }),
        fI('Bei Alkohol, Drogen, Verletzungen, Medikamenten oder Bewusstseinsstörung ärztlich klären lassen. Nicht gewahrsamsfähig ist, wer bewusstlos, nicht ansprechbar oder sofort behandlungsbedürftig ist oder Entzugszeichen zeigt.')
      ],
      b: [{ t: 'p', x: '((e4))' }] },
    E5: { k: 'E5', t: 'Benachrichtigung', n: '§ 37 PolG NRW',
      fields: [
        fH('Benachrichtigung', '§ 37 PolG NRW'),
        fC('e5', 'Benachrichtigung eines Angehörigen oder einer Vertrauensperson', [['selbst', 'Selbst benachrichtigt'], ['pol', 'Durch die Polizei'], ['verz', 'Verzichtet'], ['unt', 'Unterblieben']], { req: true }),
        fW('e5_gel', 'Wer gab Gelegenheit dazu?', { when: isF('e5', 'selbst') }),
        fW('e5_wer', 'Wer benachrichtigte?', { when: isF('e5', 'pol') }),
        fT('e5_t', 'Benachrichtigung um', { when: isF('e5', ['selbst', 'pol']) }),
        fS('e5_wen', 'Wer wurde benachrichtigt?', d => (F(d).e5 === 'pol' ? 'Benachrichtigt wurde' : `${cap(G(d).er)} benachrichtigte`), 'die Schwester, Frau M., telefonisch', { when: isF('e5', ['selbst', 'pol']) }),
        fW('e5_hin', 'Wer wies auf das Recht hin?', { when: isF('e5', 'verz') }),
        fT('e5_hin_t', 'Hinweis um', { when: isF('e5', 'verz') }),
        fS('e5_unt', 'Warum unterblieb sie?', 'Eine Benachrichtigung unterblieb, weil', 'der Zweck der Freiheitsentziehung sonst gefährdet worden wäre', { when: isF('e5', 'unt') }),
        fY('e5_sorge', 'Minderjährig oder betreut: Sorgeberechtigte bzw. Betreuer benachrichtigt?', { h: d => (minderjaehrig(d) ? 'Nach dem Geburtsdatum minderjährig – die Benachrichtigung ist Pflicht.' : 'Bei Minderjährigen und Betreuten in jedem Fall unverzüglich.') }),
        fW('e5_sorge_wer', 'Wer benachrichtigte?', { when: isF('e5_sorge', 'ja') }),
        fT('e5_sorge_t', 'Benachrichtigt um', { when: isF('e5_sorge', 'ja') }),
        fS('e5_sorge_n', 'Wer wurde benachrichtigt?', 'Benachrichtigt wurde', 'die Mutter, Frau B., telefonisch', { when: isF('e5_sorge', 'ja') })
      ],
      b: [
        { t: 'p', x: '((e5))' },
        { t: 'ak', on: f => f.e5_sorge === 'ja', x: '[[e5_sorge_wer|Wer benachrichtigte|k]] benachrichtigte um [[e5_sorge_t|Uhrzeit|t|Sorgeberechtigte benachrichtigt]] Uhr als sorgeberechtigte bzw. betreuende Person [[e5_sorge_n|Name, Stelle|l]].' }
      ] },
    E6: { k: 'E6', t: 'Richterliche Entscheidung', n: '§ 36 PolG NRW, Art. 104 Abs. 2 GG',
      fields: [
        fH('Richterliche Entscheidung', 'Art. 104 Abs. 2 GG · § 36 PolG NRW · §§ 415 ff. FamFG'),
        fC('e6', 'Richterliche Entscheidung über Zulässigkeit und Fortdauer', [['herb', 'Herbeigeführt'], ['nacht', 'Nachts nicht erreichbar'], ['entb', 'Entbehrlich – Grund entfällt vorher']], { req: true }),
        { t: 'info', when: isF('e6', 'nacht'), text: d => { const f = F(d), n = nachtzeit(f.e1_d, f.e1_t); return `Nachtzeit (§ 104 Abs. 3 StPO): 1. April bis 30. September 21 bis 4 Uhr, 1. Oktober bis 31. März 21 bis 6 Uhr. ${n == null ? 'Datum und Uhrzeit der Ingewahrsamnahme eintragen (Schritt davor), dann zeigt sich hier, ob sie zur Nachtzeit lag.' : n ? `Die Ingewahrsamnahme um ${f.e1_t} Uhr lag zur Nachtzeit.` : `Die Ingewahrsamnahme um ${f.e1_t} Uhr lag nicht zur Nachtzeit – zur Tageszeit muss ein Richter erreichbar sein (BVerfGE 105, 239).`}`; } },
        fW('e6_v_wer', 'Wer versuchte, den Richter zu erreichen?', { when: isF('e6', 'nacht') }),
        fT('e6_v_t', 'Versuch um', { when: isF('e6', 'nacht') }),
        fS('e6_v_x', 'Ergebnis des Versuchs', 'Ein Richter war nicht zu erreichen:', 'beim Amtsgericht Musterstadt ist zur Nachtzeit kein Bereitschaftsdienst eingerichtet; die Ansage verwies auf 06:00 Uhr', { when: isF('e6', 'nacht') }),
        fC('e6_n', 'Wie ging es weiter?', [['morgen', 'Mit Beginn des Bereitschaftsdienstes beantragt'], ['frei', 'Grund entfiel vorher – entlassen']], { when: isF('e6', 'nacht'), req: true }),
        fT('e6_frei_t', 'Entlassen um', { when: d => F(d).e6 === 'nacht' && F(d).e6_n === 'frei' }),
        fW('e6_wer', 'Wer beantragte die richterliche Entscheidung?', { when: herbOderMorgen }),
        fT('e6_t', 'Beantragt um', { when: herbOderMorgen }),
        fS('e6_ag', 'Amtsgericht', 'beim Amtsgericht', 'Musterstadt', { w: 'half', when: herbOderMorgen }),
        fS('e6_ri', 'Richterin oder Richter', 'Entschieden hat', 'Richterin am Amtsgericht Dr. K.', { when: herbOderMorgen }),
        fT('e6_et', 'Entscheidung um', { when: herbOderMorgen }),
        fS('e6_erg', 'Ergebnis', 'Entscheidung:', 'Fortdauer bis 13.11.2026, 08:00 Uhr angeordnet', { when: herbOderMorgen }),
        fS('f_bis', 'Für den Antrag ans Amtsgericht: Fortdauer bis', 'Beantragt wird die Fortdauer bis', '13.11.2026, 08:00 Uhr', { when: herbOderMorgen }),
        fW('e6_ent_wer', 'Wer entschied, keinen Richter einzuschalten?', { when: isF('e6', 'entb') }),
        fT('e6_ent_t', 'Entschieden um', { when: isF('e6', 'entb') }),
        fA('e6_prog', 'Prognose', 'Nach Einschätzung der Ärztin war mit einer Ausnüchterung bis etwa 07:00 Uhr zu rechnen …', 'Wann sollte der Grund entfallen? Wann wäre eine Entscheidung einschließlich Anhörung zu erwarten gewesen (Erreichbarkeit des Bereitschaftsdienstes)?', { when: isF('e6', 'entb'), lint: '', req: true }),
        fY('e6_nach', 'Dauerte der Gewahrsam länger als angenommen, und wurde der Richter nachträglich angerufen?', { when: isF('e6', 'entb') }),
        fW('e6_nach_wer', 'Wer beantragte nachträglich?', { when: d => F(d).e6 === 'entb' && F(d).e6_nach === 'ja' }),
        fT('e6_nach_t', 'Nachträglich beantragt um', { when: d => F(d).e6 === 'entb' && F(d).e6_nach === 'ja' }),
        fI('Kette: Art. 104 Abs. 2 GG → § 36 Abs. 1 PolG NRW → §§ 415 ff. FamFG. „Unverzüglich“ heißt ohne vermeidbare Verzögerung. Zur Tageszeit muss ein Richter erreichbar sein (BVerfGE 105, 239); zur Nachtzeit (§ 104 Abs. 3 StPO) nur, soweit ein Bereitschaftsdienst eingerichtet ist. Ist keiner erreichbar: Versuch mit Uhrzeit und Ergebnis festhalten und die Entscheidung mit Beginn des Bereitschaftsdienstes beantragen. Ohne richterliche Anordnung spätestens am Ende des Tages nach dem Ergreifen entlassen (§ 38 Abs. 1 Nr. 3 PolG NRW).')
      ],
      b: [
        { t: 'fn', when: f => f.e6 === 'nacht', fn: f => nzText(f.e1_d, f.e1_t) },
        { t: 'p', x: '((e6))' },
        { t: 'ff', id: 'e6_prog', when: f => f.e6 === 'entb', lead: 'Dem lag folgende Prognose zugrunde:', l: 'Prognose' },
        { t: 'ak', on: f => f.e6 === 'entb' && f.e6_nach === 'ja', x: 'Als absehbar wurde, dass der Gewahrsam länger andauert als angenommen, beantragte [[e6_nach_wer|Wer beantragte|k]] die richterliche Entscheidung um [[e6_nach_t|Uhrzeit|t|Richter nachträglich angerufen]] Uhr nachträglich.' }
      ] }
  };
  const EGROUPS = { dfa: ['E1', 'E2', 'E3'], dfb: ['E4', 'E5', 'E6'] };

  /* ======================= Text erzeugen ======================= */
  const miss = (ctx, l) => { ctx.miss.push(l); return `[${l}]`; };
  function rt(s, f, g, ctx) {
    return s.replace(new RegExp(TOK.source, 'g'), (all, gk, bl, sw) => {
      if (gk) { const w = g[gk.toLowerCase()]; return w == null ? all : (gk[0] === gk[0].toUpperCase() ? cap(w) : w); }
      if (bl) {
        const [id, ph, ty, tl] = bl.split('|'); const v = f[id];
        if (ty === 'k') return has(v) && typeof v !== 'object' ? kraftText(v, ctx) : miss(ctx, ph);
        if (!has(v)) return miss(ctx, ph);
        if (ty === 't' && tl) ctx.times.push([str(v), tl]);
        return ty === 'd' ? fmtD(v) : clean(v);
      }
      const def = SW[sw], o = def && def.o.find(x => x[0] === f[sw]);
      if (!o) return miss(ctx, (def ? def.l : sw) + '?');
      return rt(o.length > 2 ? o[2] : o[1], f, g, ctx);
    });
  }
  /** Ein Abschnitt → Absätze (nur Zutreffendes). */
  function secOut(sec, d, ctx) {
    const f = F(d), g = G(d), v = V[f.art];
    const locked = sec.dep && v && !has(f[v.main]);
    const paras = []; let c = [];
    const push = (t, np) => { if (!t || !t.trim()) return; if (np && c.length) { paras.push(c.join(' ')); c = []; } c.push(t); };
    for (const b of sec.b) {
      if (b.when && !b.when(f)) continue;
      if (b.t === 'p') { if (b.ow && !b.ow(f)) continue; push(rt(b.x, f, g, ctx), b.np); }
      else if (b.t === 'ak') { if (locked || !b.on(f)) continue; push(rt(b.x, f, g, ctx), b.np); }
      else if (b.t === 'need') { if (!locked) push(miss(ctx, b.l), b.np); }
      else if (b.t === 'fn') push(b.fn(f, d), b.np);
      else if (b.t === 'grp') {
        if (locked) continue;
        const fr = b.items.filter(([on]) => on(f)).map(([, x]) => rt(x, f, g, ctx));
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
  function rules(d, ctx) {
    const f = F(d), v = V[f.art]; if (!v) return [];
    const out = v.secs.flatMap(s => (s.rules ? s.rules(f) : []));
    if (!has(f[v.main])) out.push('Feststellungen fehlen. Folgerungen werden erst übernommen, wenn die Tatsachen beschrieben sind.');
    const all = ctx.ff.join(' ');
    [...new Set([...all.matchAll(WERT)].map(m => m[2].toLowerCase()))].forEach(w => out.push(`„${w}“ ist eine Wertung: im Text beschreiben, woran das erkennbar war.`));
    if (ALK.test(all + ' ' + str(f.c_urs_x)) && f.e4 !== 'arzt' && f.e4 !== 'nein') out.push('Alkoholeinfluss beschrieben, Gewahrsamsfähigkeit aber nicht ärztlich festgestellt (E4).');
    if (TAT.test(all)) out.push('Mögliche Straftat beschrieben (z. B. Beleidigung, Bedrohung, tätlicher Angriff): Strafanzeige gesondert. Der Gewahrsam bleibt präventiv begründet.');
    const age = ageAt(get(d, 'gw.p.geb'), f.e1_d);
    if (age != null && age < 18 && f.e5_sorge !== 'ja') out.push(`Nach dem Geburtsdatum ${age} Jahre alt: Sorgeberechtigte unverzüglich benachrichtigen (E5).`);
    if (f.art === 'a2' && age != null && age >= 18) out.push('§ 35 Abs. 2 gilt nur für Minderjährige; das Geburtsdatum ergibt Volljährigkeit.');
    if (f.e3_art === 'sich') out.push('Sichergestellte Gegenstände: Herausgabe oder weiteren Verbleib gesondert regeln (E3).');
    if (f.e6 === 'nacht' && nachtzeit(f.e1_d, f.e1_t) === false) out.push('Die Ingewahrsamnahme lag nicht zur Nachtzeit (§ 104 Abs. 3 StPO). Zur Tageszeit muss ein Richter erreichbar sein – Versuch und Ergebnis besonders genau festhalten (E6).');
    if (herbOderMorgen(d) && !has(f.f_bis)) out.push('Antrag an das Amtsgericht: beantragte Dauer eintragen (E6).');
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
    const end = f.d_ueb_t || f.c_rueck_t || f.e6_frei_t;
    if (has(f.e1_t) && has(end)) { let x = mins(end) - mins(f.e1_t); if (x < 0) x += 1440; lines.push('', `Dauer ab Ingewahrsamnahme: ${Math.floor(x / 60)} Std. ${x % 60} Min.`); }
    const nz = nachtzeit(f.e1_d, f.e1_t);
    if (nz != null) lines.push('', nz ? 'Ingewahrsamnahme zur Nachtzeit (§ 104 Abs. 3 StPO)' : 'Ingewahrsamnahme zur Tageszeit – ein Richter muss erreichbar sein');
    if (/^\d{4}-\d{2}-\d{2}$/.test(f.e1_d || '') && has(f.e1_t)) {
      const dt = new Date(f.e1_d + 'T12:00:00'); dt.setDate(dt.getDate() + 1);
      lines.push(`Frist ohne richterliche Anordnung: spätestens ${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}, 24:00 Uhr (§ 38 Abs. 1 Nr. 3 PolG NRW, Art. 104 Abs. 2 Satz 3 GG)`);
    } else lines.push('Frist: Datum und Uhrzeit der Ingewahrsamnahme eintragen (Durchführung).');
    return lines.join('\n') || 'Noch keine Uhrzeiten eingetragen.';
  }
  function antrag(d) {
    const f = F(d), v = V[f.art]; if (!v) return 'Zuerst die Gewahrsamsart wählen.';
    const C = compose(d);
    const ag = has(f.e6_ag) ? clean(f.e6_ag) : '[Ort des Amtsgerichts]';
    const seit = `${has(f.e1_d) ? fmtD(f.e1_d) : '[Datum]'}, ${has(f.e1_t) ? f.e1_t : '[Uhrzeit]'} Uhr`;
    const bis = has(f.f_bis) ? clean(f.f_bis) : '[Datum, Uhrzeit]';
    return `Antrag auf richterliche Entscheidung über die Zulässigkeit und Fortdauer der Freiheitsentziehung\n(§ 36 Abs. 1 PolG NRW i. V. m. §§ 415 ff. FamFG, Art. 104 Abs. 2 GG)\n\nAn das Amtsgericht ${ag}\n\n${LABEL[gOf(d)]}: ${personLine(d)}\nFreiheitsentziehung seit: ${seit}, nach ${v.norm}\n\nBegründung (§ 417 Abs. 2 FamFG)\n\nSachverhalt\n${C.s.join('\n\n')}\n\nErforderlichkeit der Freiheitsentziehung\n${C.r.join('\n\n')}\n\nErforderliche Dauer\nDie Freiheitsentziehung ist voraussichtlich bis ${bis} erforderlich.\n\nEs wird beantragt, die Zulässigkeit der Freiheitsentziehung festzustellen und ihre Fortdauer bis ${bis} anzuordnen.`;
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
    if (EGROUPS[id]) return EGROUPS[id].flatMap(k => secOut(E[k], d, ctx)).join('\n\n');
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
    const bis = f.d_ueb_t || f.c_rueck_t || f.e6_frei_t;
    const ri = f.e6 === 'herb' ? 'richterliche Entscheidung herbeigeführt' : f.e6 === 'nacht' ? (f.e6_n === 'frei' ? 'Richter nachts nicht erreichbar, vorher entlassen' : 'Richter nachts nicht erreichbar, Entscheidung am Morgen beantragt') : f.e6 === 'entb' ? 'richterliche Entscheidung nicht herbeigeführt (Grund entfiel vorher)' : '';
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
  const OUTS = {};
  const out = id => { OUTS['o_' + id] = d => preview(id, d); return { t: 'out', fn: 'o_' + id, l: 'So steht es im Bericht', h: 'Fertiger Text dieses Abschnitts. Fehlendes steht in eckigen Klammern.' }; };
  const STEPS = [
    { id: 'art', phase: 'Grundlage', title: 'Gewahrsamsart, Person, Kräfte', lead: 'Rechtsgrundlage wählen, Person und eingesetzte Kräfte eintragen. Die Anrede steuert die Satzführung; aus den Kräften wählst du später, wer was angeordnet oder getan hat.', fields: [
      fC('art', 'Rechtsgrundlage', ORDER.map(k => [k, `${V[k].short} · ${V[k].sub}`]), { req: true }),
      { t: 'info', when: hasArt, text: d => `${V[F(d).art].norm} · ${V[F(d).art].name}. ${V[F(d).art].lead}` },
      { k: 'gw.p', t: 'person', l: 'Betroffene Person', fields: ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift'] },
      { k: 'einsatz.kraefte', t: 'crew', l: 'Eingesetzte Kräfte', h: 'Aus der laufenden Schicht oder per Antippen aus dem Team. Im Text stehen Amtsbezeichnung und Nachname.', max: 8 }
    ] },
    ...ORDER.flatMap(v => V[v].secs.map(s => ({ id: `${v}_${s.k}`, phase: 'Gerüst', title: s.t, lead: `${V[v].norm} · ${s.lead || ''}`, when: d => F(d).art === v, fields: [...s.fields, out(`${v}_${s.k}`)] }))),
    { id: 'dfa', phase: 'Durchführung', title: 'Ingewahrsamnahme', lead: 'Wer hat angeordnet, wer hat es ausgesprochen, wann? Zwang, Fesselung, Durchsuchung. Gilt für jeden Gewahrsam.', when: hasArt, fields: [...EGROUPS.dfa.flatMap(k => E[k].fields), out('dfa')] },
    { id: 'dfb', phase: 'Durchführung', title: 'Gewahrsamsfähigkeit, Benachrichtigung, Richter', lead: 'Hier setzen Verteidigung und Gericht am häufigsten an.', when: hasArt, fields: [...EGROUPS.dfb.flatMap(k => E[k].fields), out('dfb')] },
    { id: 'text', phase: 'Text', title: 'Fertiger Text', lead: 'Der Text entsteht aus allen Schritten. Fehlt noch etwas, am besten dort nachtragen. Für den letzten Schliff lässt er sich hier von Hand anpassen.', when: hasArt, fields: [{ k: 'gw:text', t: 'custom' }] }
  ];

  /* ======================= Ältere Entwürfe (Lückentext-Fassung) übernehmen ======================= */
  function upgrade(data) {
    const f = data && data.gw; if (!f || typeof f !== 'object' || f._v === 3) return null;
    const g = { ...f, _v: 3 };
    for (const [k, v] of Object.entries(g)) if (v && typeof v === 'object' && !Array.isArray(v) && has(v.name) && k !== 'p') g[k] = [str(v.grad), str(v.name)].filter(Boolean).join(' ');
    const toArr = (key, map) => { const a = Object.entries(map).filter(([old]) => g[old] === true).map(([, nv]) => nv); Object.keys(map).forEach(o => { if (g[o] === true) delete g[o]; }); if (a.length && !arr(g[key]).length) g[key] = a; };
    toArr('c_zust', { c_will: 'will', c_hilf: 'hilf' });
    toArr('c_folge', { g_sturz: 'sturz', g_verk: 'verk', g_kalt: 'kalt', g_asp: 'asp', g_selbst: 'selbst', g_eig: 'eig' });
    toArr('c_prog', { p_ank: 'ank', p_ggst: 'ggst', p_vor: 'vor', p_fort: 'fort', p_err: 'err' });
    toArr('d_mild', { d_ga: 'ga', d_pv: 'pv', d_pv0: 'pv0', d_si: 'si', d_beg: 'beg' });
    if (g.c_frei === true) g.c_frei = 'nein';
    if (g.e2_andr === true) g.e2_andr = 'ja'; if (g.e2_andr_no === true) { g.e2_andr = 'nein'; delete g.e2_andr_no; }
    ['e1_wdh', 'e2_fes', 'e3_ag', 'e5_sorge', 'd_kwg', 'b_pv_bek', 'b_pv_ank', 'c_suiz1', 'e6_nach'].forEach(k => { if (g[k] === true) g[k] = 'ja'; });
    if (g.e3_ggs === false || (g.e3_ggs == null && !g.e3_art)) delete g.e3_ggs; else if (g.e3_ggs === true) delete g.e3_ggs;
    ['c_urs', 'd_ang', 'd_wohn', 'd_med', 'd_uz', 'd_rueck', 'd_verbr', 'd_rueck4', 'd_ohne', 'c_nr2', 'c_suiz2', 'e9_ggs'].forEach(k => { if (typeof g[k] === 'boolean') delete g[k]; });
    return { ...data, gw: g };
  }

  /* ======================= Letzter Schritt: fertiger Text, erzeugt oder von Hand angepasst ======================= */
  function mount(el, k, data, api) {
    if (k !== 'gw:text') return;
    const draw = focus => {
      const f = F(data), gen = genPlain(data), eig = has(f.eigen);
      const ph = (gen.match(/\[[^\]]+\]/g) || []).length;
      const stale = eig && f.eigenBasis && f.eigenBasis !== hash(gen);
      el.innerHTML = eig
        ? `<div class="gw"><div class="w-info">Von Hand angepasst. Änderungen in den Schritten fließen nicht mehr automatisch in den Text ein.${stale ? ' In den Schritten wurde seitdem etwas geändert.' : ''}</div>
          <div class="gw-tools"><button type="button" class="btn btn-ghost btn-sm" data-gw-act="reset">Verwerfen und neu erzeugen</button><button type="button" class="btn btn-light btn-sm" data-copy-out="plain">Kopieren</button></div>
          <div class="w-q"><label class="w-lbl" for="wf-gw_eigen">Bericht</label><div class="w-sent nopre"><textarea class="w-sent-in multi" id="wf-gw_eigen" data-k="gw.eigen" rows="1" style="--rows:14" spellcheck="true" maxlength="40000">${esc(f.eigen)}</textarea></div></div></div>`
        : `<div class="gw"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So lautet der Bericht</span><span class="gw-tools"><button type="button" class="btn btn-ghost btn-sm" data-gw-act="edit">Text bearbeiten</button><button type="button" class="btn btn-light btn-sm" data-copy-out="plain">Kopieren</button></span></div>${ph ? `<p class="w-hint">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} noch (in eckigen Klammern). Am besten im jeweiligen Schritt nachtragen, dann bleibt der Text automatisch aktuell.</p>` : ''}<pre class="w-out-t" data-fn="plain">${esc(gen)}</pre></div></div>`;
      if (api.layout) api.layout();
      if (focus) { const t = document.getElementById('wf-gw_eigen'); if (t) t.focus({ preventScroll: true }); }
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-gw-act]'); if (!b) return;
      if (b.dataset.gwAct === 'edit') { const gen = genPlain(data); api.set('gw.eigenBasis', hash(gen)); api.set('gw.eigen', gen.replace(/^Ingewahrsamnahme nach [^\n]+\n\n/, '')); draw(true); }
      else if (b.dataset.gwAct === 'reset') { api.set('gw.eigen', undefined); api.set('gw.eigenBasis', undefined); draw(false); }
      if (api.refresh) api.refresh();
    });
    draw(false);
  }

  root.WGEW = Object.freeze({
    id: 'gewahrsam', name: 'Gewahrsam (PolG NRW)', short: 'Gewahrsam', kurz: 'GW',
    desc: 'Gewahrsam nach § 35 PolG NRW: Feststellungen frei, Folgerungen antippen, wer was wann angeordnet hat, richterliche Entscheidung (auch nachts nicht erreichbar), Antrag ans Amtsgericht, Frist',
    intro: 'Gewahrsamsart wählen, Feststellungen beschreiben, Folgerungen antippen · wer was wann angeordnet und ausgesprochen hat · richterliche Entscheidung inkl. Nachtzeit (§ 104 Abs. 3 StPO) · fertiger Text zum Bearbeiten, Antrag ans Amtsgericht, Frist',
    labels: {
      bericht: 'Bericht', kurz: 'Kurzfassung', kurzHint: 'Eine Zeile für Vorgang, Liste und Übergabe.',
      offen: 'Offene Punkte', offenHint: 'Angehakte Punkte landen als Todos im Planner. Fehlende Angaben stehen im Text in eckigen Klammern.',
      offenEmpty: 'Alle Angaben sind ausgefüllt und die Prüfhinweise erledigt.',
      persHint: 'Gesondert vom Berichtstext.', newBtn: 'Gewahrsam'
    },
    extraTabs: [
      { k: 'antrag', l: 'Antrag AG', hint: 'Aus denselben Angaben. Die beantragte Dauer steht unter „Richterliche Entscheidung“.', text: antrag },
      { k: 'zeit', l: 'Zeitleiste', hint: 'Alle eingetragenen Uhrzeiten, Nachtzeit und Frist.', text: timeline }
    ],
    upgrade, noPreview: true, // der fertige Abschnittstext steht in jedem Schritt sichtbar unten (Feld „So steht es im Bericht“)
    steps: STEPS, text, plain, preview, kurzText, fahndung: () => '', offen, personalien, title, subtitle, mount, ...OUTS,
    _test: { V, E, SW, compose, genPlain, antrag, timeline, rules, offen, nachtzeit }
  });
})(typeof window !== 'undefined' ? window : globalThis);
