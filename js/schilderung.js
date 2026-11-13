/*
 * Workoholic · Modul „Schilderungen“
 * ---------------------------------------------------------------
 * Schilderungen von Zeugen, Geschädigten, Beschuldigten und Betroffenen für eine Strafanzeige oder eine
 * Verkehrsangelegenheit. Ablauf: Liste mit „+“ → je Person eine Maske (Rolle, Anrede, Name, belehrt durch,
 * gegenüber, Hinweis auf das Zeugnisverweigerungsrecht, Schilderung) → „Abschließen“ zeigt den Text und führt
 * zurück zur Liste → „Alle Schilderungen hinzugefügt“ liefert das Gesamtpaket mit Abschnittsnummer zum Kopieren.
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
  const lc = s => str(s).toLocaleLowerCase('de');
  const norm = s => lc(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nameKey = n => norm(n).replace(/\s+/g, ' ');
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);

  /* Amtsbezeichnungen: „POK“, „POKin“ … – die weibliche Form endet auf „in“. */
  const DGRADE = ['', 'PKA', 'PKAin', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'EPHK', 'EPHKin', 'KA', 'KAin', 'KK', 'KKin', 'KOK', 'KOKin', 'KHK', 'KHKin', 'EKHK', 'EKHKin', 'PR', 'PRin', 'POR', 'PORin', 'KR', 'KRin'];
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankOf = roles => arr(roles).map(str).find(r => RANK_RE.test(r)) || '';
  /** Amtsbezeichnung eines Teammitglieds: eigenes Feld (rank), sonst aus den Rollen. */
  const rankT = t => str(t && t.rank) || rankOf(t && t.roles);
  /** „pok“ → „POK“, „pokin“ → „POKin“; keine Amtsbezeichnung → ''. */
  function canonRank(t) {
    t = str(t); if (!t || t.length > 7) return '';
    const up = t.toUpperCase(); if (RANK_RE.test(up)) return up;
    if (/in$/i.test(t)) { const f = t.slice(0, -2).toUpperCase() + 'in'; if (RANK_RE.test(f)) return f; }
    return '';
  }
  /** Nachname aus „Max Müller“, „Müller, Max“ oder „Max von der Heide“. */
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); if (t.length < 2) return n; let i = t.length - 1; while (i > 1 && /^(von|van|de|der|den|zu|zur|vom|ten|ter|di|da|del|le|la)$/i.test(t[i - 1])) i--; return t.slice(i).join(' '); };
  /** Geschlecht einer Beamtin / eines Beamten aus der Amtsbezeichnung ('' = unbekannt). */
  const offG = o => (o && has(o.grad) ? (/in$/.test(str(o.grad)) ? 'w' : 'm') : '');
  /** Im Text: Amtsbezeichnung + Nachname, z. B. „POKin Schulz“. */
  const offName = o => (o && has(o.name) ? `${has(o.grad) ? str(o.grad) : '[Amtsbez.]'} ${nachname(o.name)}` : '');

  /** Amtsbezeichnungen, die die App schon kennt (Team, frühere Vorgänge) – die Maske füllt das aus WBridge. */
  let RANKS = new Map();
  const rankFor = name => RANKS.get(nameKey(name)) || '';

  /* ======================= Rollen ======================= */
  const ROLLEN = [
    // Unfallbeteiligte (nur Verkehr): im Text „der Unfallbeteiligte 01 (M.)“. 01 ist der Verursacher und wird als Beschuldigte/r
    // oder Betroffene/r belehrt (p.belAls), 02 ff. als Zeugen – siehe eff().
    ['ub', { m: 'Unfallbeteiligter', w: 'Unfallbeteiligte', x: 'Unfallbeteiligte/r', art: { m: 'der Unfallbeteiligte', w: 'die Unfallbeteiligte' }, dat: { m: 'dem Unfallbeteiligten', w: 'der Unfallbeteiligten' }, gen: { m: 'des Unfallbeteiligten', w: 'der Unfallbeteiligten' }, vk: true }],
    ['zeuge', { m: 'Zeuge', w: 'Zeugin', x: 'Zeuge/Zeugin', art: { m: 'der Zeuge', w: 'die Zeugin' }, dat: { m: 'dem Zeugen', w: 'der Zeugin' }, zeug: true, bel: 'Zeugenschaftliche Belehrung' }],
    ['gs', { m: 'Geschädigter', w: 'Geschädigte', x: 'Geschädigte/r', art: { m: 'der Geschädigte', w: 'die Geschädigte' }, dat: { m: 'dem Geschädigten', w: 'der Geschädigten' }, zeug: true, bel: 'Zeugenschaftliche Belehrung – wie bei Zeugen' }],
    ['bs', { m: 'Beschuldigter', w: 'Beschuldigte', x: 'Beschuldigte/r', art: { m: 'der Beschuldigte', w: 'die Beschuldigte' }, dat: { m: 'dem Beschuldigten', w: 'der Beschuldigten' }, tat: true, bel: 'Beschuldigtenbelehrung (§ 163a Abs. 4, § 136 StPO)' }],
    ['betr', { m: 'Betroffener', w: 'Betroffene', x: 'Betroffene/r', art: { m: 'der Betroffene', w: 'die Betroffene' }, dat: { m: 'dem Betroffenen', w: 'der Betroffenen' }, tat: true, owi: true, bel: 'Betroffenenbelehrung zur Anhörung (§ 55 OWiG)' }]
  ];
  const ROLLE = Object.fromEntries(ROLLEN);
  /** Betroffene/r und Unfallbeteiligte gibt es nur in Verkehrsangelegenheiten – außer die Person hat die Rolle schon. */
  const rollenFor = (art, cur) => ROLLEN.filter(([k, r]) => (!r.owi && !r.vk) || art === 'verkehr' || cur === k);
  const ARTEN = [['straf', 'Strafanzeige'], ['verkehr', 'Verkehrsangelegenheit']];
  const ARTL = Object.fromEntries(ARTEN);
  /** Nummer der/des Unfallbeteiligten (1 = Verursacher), 0 = keine. */
  const ubNr = p => { const n = Math.round(Number(p && p.ub)); return p && p.rolle === 'ub' && Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 0; };
  const ub2 = p => (ubNr(p) ? String(ubNr(p)).padStart(2, '0') : '[Nr.]');
  /**
   * Rolle für die Belehrung: Unfallbeteiligte/r 01 wird als Beschuldigte/r oder Betroffene/r belehrt (Auswahl p.belAls),
   * 02, 03 … als Zeugin oder Zeuge. Alle anderen Rollen belehren so, wie sie heißen.
   */
  const eff = p => { if (!p) return ''; if (p.rolle !== 'ub') return p.rolle || ''; const n = ubNr(p); return n === 1 ? (p.belAls === 'bs' || p.belAls === 'betr' ? p.belAls : '') : n ? 'zeuge' : ''; };
  const RO = p => ROLLE[eff(p)];
  /** Nächste freie Nummer für eine/n weitere/n Unfallbeteiligte/n. */
  const nextUb = P => { const used = new Set(arr(P).map(ubNr)); let n = 1; while (used.has(n)) n++; return n; };
  const rolleLabel = p => { const r = ROLLE[p && p.rolle]; if (!r) return 'Rolle offen'; const l = p.g === 'm' || p.g === 'w' ? r[p.g] : r.x; return p.rolle === 'ub' ? `${l} ${ub2(p)}` : l; };

  /* ======================= Text ======================= */
  const crewOf = data => [...arr(getPath(data, 'einsatz.kraefte')), ...arr(getPath(data, 'einsatz.wagen')).flatMap(w => arr(w && w.crew))].filter(c => c && has(c.name));
  const ini = s => (s ? s.charAt(0).toLocaleUpperCase('de') : '');
  const prefix = (s, n) => s.slice(0, 1).toLocaleUpperCase('de') + s.slice(1, n).toLocaleLowerCase('de');

  /**
   * Verkehrsangelegenheit: nur Anfangsbuchstabe des Nachnamens („M.“). Teilen sich mehrere Personen diesen
   * Buchstaben, kommt der des Vornamens davor („A. M.“), reicht das nicht, der zweite Buchstabe („An. M.“) usw.
   */
  function kuerzel(P, i, mit = []) {
    const all = [...P, ...arr(mit)].map(q => ({ vn: str(q && q.vorname), nn: str(q && q.nachname) }));
    const me = all[i]; if (!me || !me.nn) return '[Nachname]';
    const N = ini(me.nn) + '.';
    const grp = all.filter((q, j) => j !== i && q.nn && lc(ini(q.nn)) === lc(ini(me.nn)));
    if (!grp.length) return N;
    if (!me.vn) return `[V.] ${N}`;
    const v = lc(me.vn);
    for (let n = 1; n <= me.vn.length; n++) if (!grp.some(q => lc(q.vn).slice(0, n) === v.slice(0, n))) return `${prefix(me.vn, n)}. ${N}`;
    // Gleicher Vorname bei gleichem Anfangsbuchstaben: Nachname um einen Buchstaben verlängern
    return `${prefix(me.vn, 1)}. ${prefix(me.nn, 2)}.`;
  }
  /**
   * Name der Person im Text: Strafanzeige ausgeschrieben (bei gleichem Nachnamen mit Vorname), Verkehr als Kürzel.
   * data.mit = weitere Personen desselben Vorgangs, die in diesem Abschnitt nicht vorkommen – sie zählen beim Unterscheiden
   * mit, damit dieselbe Person in allen Abschnitten gleich heißt.
   */
  function nameOf(data, i) {
    const P = arr(data && data.personen), p = P[i] || {}, mit = arr(data && data.mit);
    if (data && data.art === 'verkehr') return kuerzel(P, i, mit);
    const nn = str(p.nachname); if (!nn) return '[Nachname]';
    const twin = P.some((q, j) => j !== i && q && norm(q.nachname) === norm(nn)) || mit.some(q => q && norm(q.nachname) === norm(nn));
    return twin ? `${str(p.vorname) || '[Vorname]'} ${nn}` : nn;
  }
  const anrede = p => (p.g === 'w' ? 'der Frau' : p.g === 'm' ? 'des Herrn' : '[des Herrn/der Frau]');
  /** „der Zeuge“ / „die Geschädigte“ / „der Unfallbeteiligte 01“ … */
  const rolleArt = p => { const r = ROLLE[p.rolle]; if (!r) return '[Rolle]'; const a = p.g === 'm' || p.g === 'w' ? r.art[p.g] : `[${r.art.m}/${r.art.w}]`; return p.rolle === 'ub' ? `${a} ${ub2(p)}` : a; };
  /** Person im Satz: „der Zeuge Müller“ – Unfallbeteiligte mit Nummer und Name in Klammern: „der Unfallbeteiligte 01 (M.)“. */
  const werVon = (data, i) => { const p = arr(data && data.personen)[i] || {}; return p.rolle === 'ub' ? `${rolleArt(p)} (${nameOf(data, i)})` : `${rolleArt(p)} ${nameOf(data, i)}`; };
  /** Unterüberschrift: „Schilderung der Frau Müller“ / „Schilderung des Herrn M. M.“ / „Schilderung des Unfallbeteiligten 01 (M.)“ */
  const heading = (data, i) => {
    const p = arr(data.personen)[i] || {};
    if (p.rolle === 'ub') { const g = ROLLE.ub.gen; return `Schilderung ${p.g === 'm' || p.g === 'w' ? g[p.g] : '[des/der] Unfallbeteiligten'} ${ub2(p)} (${nameOf(data, i)})`; }
    return `Schilderung ${anrede(p)} ${nameOf(data, i)}`;
  };

  /** Besatzung mit Amtsbezeichnung (aus dem Vorgang, sonst aus Team und früheren Vorgängen), ohne Doppelte. */
  function crewNamen(data) {
    const out = [], seen = new Set();
    for (const c of crewOf(data)) { const k = nameKey(c.name); if (seen.has(k)) continue; seen.add(k); out.push({ grad: has(c.grad) ? str(c.grad) : rankFor(c.name), name: str(c.name) }); }
    return out;
  }
  /** „den eingesetzten Beamten“ – nur wenn ausschließlich Beamtinnen eingesetzt sind: „Beamtinnen“. */
  function beamte(data) {
    const gs = crewOf(data).map(c => offG({ grad: has(c.grad) ? c.grad : rankFor(c.name) }));
    return gs.length && gs.every(g => g === 'w') ? 'Beamtinnen' : 'Beamten';
  }
  /** Wem gegenüber: nur die belehrende Person → „diesem/dieser gegenüber“, sonst Namen oder „den eingesetzten Beamten“. */
  function gegenText(data, p, noDem = false) {
    p = p || {};
    const g = arr(p.gegen);
    if (g.some(x => x && x.ref === 'alle')) { const c = crewNamen(data); return c.length ? 'gegenüber ' + joinUnd(c.map(offName)) : `gegenüber den eingesetzten ${beamte(data)}`; }
    const list = [], seen = new Set();
    for (const x of g) {
      const o = x && x.ref === 'bel' ? p.bel : x;
      if (!o || !has(o.name)) continue;
      const k = nameKey(o.name); if (seen.has(k)) continue;
      seen.add(k); list.push(o);
    }
    if (!list.length) return 'gegenüber [Beamtin/Beamter]';
    if (!noDem && list.length === 1 && p.bel && has(p.bel.name) && nameKey(list[0].name) === nameKey(p.bel.name)) {
      const gg = offG(p.bel); if (gg) return gg === 'w' ? 'dieser gegenüber' : 'diesem gegenüber';
    }
    return 'gegenüber ' + joinUnd(list.map(offName));
  }
  /** Einleitungssatz vor der Schilderung. */
  function einleitung(data, i, pron = false) {
    const p = arr(data.personen)[i] || {};
    const r = RO(p);
    const wer = pron ? PR(p).er : werVon(data, i);
    const durch = p.bel && has(p.bel.name) ? offName(p.bel) : '[belehrende Person]';
    const um = has(p.belZeit) ? ` um ${str(p.belZeit)} Uhr` : '';
    const vw = r && r.tat && has(p.vorwurf) ? str(p.vorwurf) : '';
    let bel;
    if (!r) bel = 'Nach erfolgter [Belehrung]';
    else if (r.zeug) bel = 'Nach erfolgter zeugenschaftlicher Belehrung' + (p.zvr ? ' mit besonderem Hinweis auf das Zeugnisverweigerungsrecht gemäß § 52 StPO' : '');
    else if (eff(p) === 'bs') bel = vw ? `Nach Eröffnung des Tatvorwurfs (${vw}) und erfolgter Beschuldigtenbelehrung` : 'Nach erfolgter Beschuldigtenbelehrung';
    else bel = vw ? `Nach Eröffnung des Vorwurfs (${vw}) und erfolgter Betroffenenbelehrung gemäß § 55 OWiG` : 'Nach erfolgter Betroffenenbelehrung gemäß § 55 OWiG';
    const start = `${bel} durch ${durch}${um}`;
    if (p.keine && r) return `${start} erklärte ${wer}, ${p.verst ? 'die Belehrung verstanden zu haben und ' : ''}${keineWas(p)}.`;
    const gg = gegenText(data, p);
    const bereit = r && r.zeug && p.zvr && p.bereit !== false;
    let mitte;
    if (p.verst) mitte = `erklärte ${wer}, die Belehrung verstanden zu haben${bereit ? ' und aussagen zu wollen' : ''}, und machte ${gg}`;
    else if (bereit) mitte = pron ? `erklärte ${wer} sich zur Aussage bereit und machte ${gg}` : `erklärte sich ${wer} zur Aussage bereit und machte ${gg}`;
    else mitte = `machte ${wer} ${gg}`;
    return `${start} ${mitte} sinngemäß folgende Angaben:`;
  }
  const schilderung = p => str(p && p.text).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  /* ---------- Personenbezogene Angaben: Deutschkenntnisse, Alkohol/Drogen, Folgefähigkeit, Tests ---------- */
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  /** Pronomen nach Anrede; ohne Anrede als Platzhalter. */
  const PR = p => (p.g === 'w' ? { er: 'sie', Er: 'Sie', ihm: 'ihr', ihn: 'sie', sein: 'ihr' } : p.g === 'm' ? { er: 'er', Er: 'Er', ihm: 'ihm', ihn: 'ihn', sein: 'sein' } : { er: '[er/sie]', Er: '[Er/Sie]', ihm: '[ihm/ihr]', ihn: '[ihn/sie]', sein: '[sein/ihr]' });
  const herrFrau = p => (p.g === 'w' ? 'Frau' : p.g === 'm' ? 'Herr' : '[Herr/Frau]');
  /** „dem Beschuldigten“ / „der Zeugin“ … */
  const rolleDat = p => { const r = ROLLE[p.rolle]; if (!r) return '[der Person]'; const a = p.g === 'm' || p.g === 'w' ? r.dat[p.g] : `[${r.dat.m}/${r.dat.w}]`; return p.rolle === 'ub' ? `${a} ${ub2(p)}` : a; };
  /** „dem Zeugen Müller“ / „der Unfallbeteiligten 02 (S.)“ */
  const werDat = (data, i) => { const p = arr(data && data.personen)[i] || {}; return p.rolle === 'ub' ? `${rolleDat(p)} (${nameOf(data, i)})` : `${rolleDat(p)} ${nameOf(data, i)}`; };
  const satz = s => { s = str(s); return s && !/[.!?]$/.test(s) ? s + '.' : s; };

  const SPRACHE = [['ok', 'Deutsch problemlos'], ['eingeschr', 'Eingeschränkt'], ['kein', 'Kein Deutsch']];
  const MITTEL = [['app', 'Übersetzungs-App', 'einer Übersetzungs-App'], ['dolm', 'Dolmetscher/in', 'einer Dolmetscherin bzw. eines Dolmetschers'], ['dritte', 'Person vor Ort übersetzte', 'einer anwesenden Person, die übersetzte']];
  /** Deutschkenntnisse – steht vor dem Einleitungssatz, weil es die Belehrung betrifft. Bei „problemlos“ kein Text. */
  function spracheText(data, i, pron = false) {
    const p = arr(data.personen)[i] || {};
    if (p.spr !== 'eingeschr' && p.spr !== 'kein') return '';
    const pr = PR(p), wer = pron ? pr.Er : cap(werVon(data, i));
    const kenntnis = p.spr === 'kein' ? `${wer} verfügte über keine Deutschkenntnisse` : `${wer} verfügte nur über eingeschränkte Deutschkenntnisse`;
    const mit = MITTEL.filter(([k]) => arr(p.sprMittel).includes(k)).map(m => m[2]);
    const parts = [];
    if (has(p.sprAndere)) parts.push(`auf ${str(p.sprAndere)}`);
    if (mit.length) parts.push(`mithilfe ${joinUnd(mit)}`);
    const t = [];
    if (parts.length) t.push(`${kenntnis}, weshalb die Verständigung ${p.spr === 'eingeschr' ? 'zeitweise ' : ''}${parts.join(' sowie ')} erfolgte.`);
    else if (p.spr === 'kein') t.push(`${kenntnis}, weshalb die Verständigung [auf welche Weise] erfolgte.`);
    else t.push(kenntnis + '.');
    if (p.sprVer === 'ja') t.push(`Nach dem Eindruck der eingesetzten ${beamte(data)} verstand ${pr.er} die Ausführungen und Fragen ${p.spr === 'eingeschr' ? 'dennoch ' : ''}vollständig.`);
    else if (p.sprVer === 'nein') t.push(`Nach dem Eindruck der eingesetzten ${beamte(data)} verstand ${pr.er} die Ausführungen und Fragen jedoch nicht vollständig.`);
    return t.join(' ');
  }

  /**
   * Wahrnehmungen bei Hinweisen auf Alkohol (a) und/oder Drogen (d). [Schlüssel, Chip, Aufzählungspunkt, passt zu].
   * Die Punkte sind geschlechtsneutral formuliert; der Satz davor passt sich an („bei ihm“ / „bei ihr“).
   */
  const WAHR = [
    ['Geruch', [
      ['g_alk', 'Alkoholgeruch deutlich', 'deutlicher Alkoholgeruch in der Atemluft', 'a'],
      ['g_alk_l', 'Alkoholgeruch leicht', 'leichter Alkoholgeruch in der Atemluft', 'a'],
      ['g_alk_fz', 'Alkoholgeruch im Fahrzeug', 'Alkoholgeruch im Fahrzeuginnenraum', 'a'],
      ['g_thc', 'Cannabisgeruch an Person/Kleidung', 'Cannabisgeruch an der Person bzw. an der Kleidung', 'd'],
      ['g_thc_fz', 'Cannabisgeruch im Fahrzeug', 'Cannabisgeruch im Fahrzeuginnenraum', 'd'],
      ['g_chem', 'chemischer oder süßlicher Geruch', 'auffälliger chemischer bzw. süßlicher Geruch', 'd']
    ]],
    ['Augen', [
      ['a_rot', 'Bindehäute gerötet', 'gerötete Bindehäute', 'ad'],
      ['a_glasig', 'glasig, wässrig', 'glasige, wässrige Augen', 'ad'],
      ['a_weit', 'Pupillen stark erweitert', 'stark erweiterte Pupillen', 'd'],
      ['a_eng', 'Pupillen stark verengt', 'stark verengte, stecknadelkopfgroße Pupillen', 'd'],
      ['a_licht', 'Pupillenreaktion verzögert/fehlt', 'verzögerte bzw. fehlende Reaktion der Pupillen auf Licht', 'd'],
      ['a_empf', 'lichtempfindlich', 'auffällige Lichtempfindlichkeit der Augen', 'd'],
      ['a_nyst', 'Augenzittern (Nystagmus)', 'Augenzittern (Nystagmus)', 'ad'],
      ['a_lid', 'Lidflattern', 'Lidflattern', 'd'],
      ['a_schwer', 'Lider schwer, halb geschlossen', 'schwere, halb geschlossene Augenlider', 'ad'],
      ['a_starr', 'starrer, leerer Blick', 'starrer, leerer Blick', 'ad'],
      ['a_fix', 'Blick kaum fixierbar', 'Schwierigkeiten, den Blick zu fixieren', 'ad']
    ]],
    ['Gesicht und Haut', [
      ['h_rot', 'Gesicht gerötet', 'gerötete Gesichtshaut', 'a'],
      ['h_blass', 'Gesicht auffallend blass', 'auffallend blasse Gesichtshaut', 'd'],
      ['h_schweiss', 'starkes Schwitzen', 'starkes Schwitzen', 'd'],
      ['h_frier', 'Frieren, Gänsehaut', 'Frieren bzw. Gänsehaut trotz angemessener Temperatur', 'd'],
      ['h_mund', 'Mund und Lippen trocken', 'trockener Mund und trockene Lippen', 'd'],
      ['h_zunge', 'Zunge belegt', 'belegte Zunge', 'd'],
      ['h_nase', 'Nase gerötet, Nasenbluten', 'gerötete Nasenschleimhaut bzw. Nasenbluten', 'd'],
      ['h_pulver', 'Pulverreste an der Nase', 'pulverartige Anhaftungen an bzw. in der Nase', 'd'],
      ['h_stich', 'Einstichstellen', 'Einstichstellen an Armen, Händen oder Beinen', 'd'],
      ['h_zitter', 'Zittern der Hände', 'Zittern der Hände', 'ad']
    ]],
    ['Sprache', [
      ['s_verw', 'verwaschen', 'verwaschene Aussprache', 'ad'],
      ['s_lall', 'lallend', 'lallende Aussprache', 'a'],
      ['s_langsam', 'verlangsamt, schleppend', 'verlangsamte, schleppende Sprache', 'ad'],
      ['s_schnell', 'sehr schnell, Rededrang', 'auffallend schnelles Sprechen mit Rededrang', 'd'],
      ['s_wort', 'Wortfindungsstörungen', 'Wortfindungsstörungen', 'ad'],
      ['s_wdh', 'wiederholt dieselben Aussagen', 'wiederholte, gleichlautende Aussagen', 'a'],
      ['s_laut', 'unangemessen laut', 'unangemessen laute Sprechweise', 'a']
    ]],
    ['Gang und Motorik', [
      ['m_schwank', 'schwankender Gang', 'schwankender Gang', 'ad'],
      ['m_tork', 'torkelnder Gang', 'torkelnder Gang', 'a'],
      ['m_stand', 'unsicherer Stand, stützt sich ab', 'unsicherer Stand mit Abstützen an Gegenständen', 'ad'],
      ['m_stolper', 'Stolpern, Stürzen', 'Stolpern bzw. Stürzen ohne äußeren Anlass', 'ad'],
      ['m_langsam', 'Bewegungen verlangsamt', 'verlangsamte Bewegungen und Reaktionen', 'ad'],
      ['m_fein', 'Feinmotorik gestört (z. B. Papiere)', 'Schwierigkeiten bei der Feinmotorik, z. B. beim Heraussuchen der Dokumente', 'ad'],
      ['m_fahrig', 'fahrig, hektisch', 'fahrige, hektische Bewegungen', 'd', 1],
      ['m_unruhe', 'motorische Unruhe', 'ausgeprägte motorische Unruhe', 'd', 1],
      ['m_kiefer', 'Kiefermahlen, Zähneknirschen', 'Kiefermahlen bzw. Zähneknirschen', 'd'],
      ['m_zuck', 'Muskelzucken', 'unwillkürliches Muskelzucken', 'd']
    ]],
    ['Verhalten und Stimmung', [
      ['v_distanz', 'distanzlos', 'distanzloses Verhalten', 'ad', 1],
      ['v_aggr', 'aggressiv, gereizt', 'aggressives, gereiztes Verhalten', 'ad', 1],
      ['v_enthemmt', 'enthemmt', 'enthemmtes Verhalten', 'a', 1],
      ['v_redselig', 'auffallend redselig', 'auffallende Redseligkeit', 'a', 1],
      ['v_weiner', 'weinerlich', 'weinerliches Verhalten', 'a', 1],
      ['v_euphor', 'euphorisch, aufgekratzt', 'euphorische, aufgekratzte Stimmung', 'd', 1],
      ['v_albern', 'albern, grundloses Lachen', 'albernes Verhalten mit grundlosem Lachen', 'd', 1],
      ['v_nervoes', 'nervös, unruhig', 'auffallende Nervosität und Unruhe', 'd', 1],
      ['v_angst', 'misstrauisch, ängstlich', 'misstrauisches, ängstliches Verhalten', 'd', 1],
      ['v_apath', 'teilnahmslos, apathisch', 'teilnahmsloses, apathisches Verhalten', 'ad', 1],
      ['v_stimmung', 'Stimmung schwankt stark', 'stark wechselnde Stimmung', 'ad', 1]
    ]],
    ['Bewusstsein und Orientierung', [
      ['b_benommen', 'benommen, schläfrig', 'Benommenheit und Schläfrigkeit', 'ad', 1],
      ['b_nicken', 'nickt wiederholt ein', 'wiederholtes Einnicken', 'd'],
      ['b_orient', 'nicht orientiert', 'eingeschränkte Orientierung zu Zeit, Ort oder Situation', 'ad', 1],
      ['b_antwort', 'antwortet verzögert', 'verzögerte Antworten auf Fragen', 'ad'],
      ['b_konz', 'kaum konzentriert', 'deutliche Konzentrationsschwäche', 'ad', 1],
      ['b_denken', 'Gedanken sprunghaft', 'sprunghafter, ungeordneter Gedankengang', 'd', 1],
      ['b_erinn', 'Erinnerungslücken', 'Erinnerungslücken', 'ad', 1]
    ]],
    ['Körper', [
      ['k_erbr', 'Übelkeit, Erbrechen', 'Übelkeit bzw. Erbrechen', 'ad'],
      ['k_naess', 'Einnässen', 'Einnässen', 'a'],
      ['k_puls', 'Puls erkennbar beschleunigt', 'erkennbar beschleunigter Puls', 'd'],
      ['k_atem', 'Atmung auffällig', 'auffällig flache bzw. beschleunigte Atmung', 'd']
    ]],
    ['Umfeld und Gegenstände', [
      ['u_beh', 'Alkoholbehältnisse in Reichweite', 'geöffnete bzw. leere Alkoholbehältnisse in Reichweite', 'a'],
      ['u_utensil', 'Konsumutensilien', 'Konsumutensilien in Reichweite, z. B. Grinder, Blättchen, Röhrchen', 'd'],
      ['u_btm', 'BtM-verdächtige Substanzen', 'betäubungsmittelverdächtige Substanzen aufgefunden', 'd'],
      ['u_tabl', 'Tabletten unklarer Herkunft', 'Tabletten bzw. Medikamente unklarer Herkunft aufgefunden', 'd']
    ]]
  ];
  const WAHR_ALL = WAHR.flatMap(([, items]) => items);
  /** Tests vor Ort – aktive Mitwirkung, deshalb eigener Satz mit Hinweis auf die Freiwilligkeit. */
  const TV = [['fnt', 'Finger-Nase-Test', 'verfehlte zweimal die Nasenspitze'], ['romb', 'Romberg-Test', 'deutliches Schwanken'], ['bein', 'Einbeinstand', 'musste nach 5 Sekunden absetzen'], ['linie', 'Gehen auf einer gedachten Linie', 'wich mehrfach seitlich ab'], ['dreh', 'Drehbewegung', 'geriet ins Taumeln']];
  /** Woran die Folgefähigkeit erkennbar war (+ = konnte folgen, − = nicht/eingeschränkt). */
  const FAKT = [
    ['fragen', '+', 'Fragen sinnvoll beantwortet', 'beantwortete Fragen sinnvoll und zusammenhängend'],
    ['pers', '+', 'Personalien fehlerfrei', p => `gab ${PR(p).sein === 'ihr' ? 'ihre' : PR(p).sein === 'sein' ? 'seine' : '[seine/ihre]'} Personalien fehlerfrei an`],
    ['anw', '+', 'Anweisungen umgesetzt', 'setzte Anweisungen ohne Wiederholung um'],
    ['wied', '+', 'Belehrung wiedergegeben', 'gab den Inhalt der Belehrung mit eigenen Worten wieder'],
    ['wdh', '-', 'Fragen mehrfach wiederholt', null],
    ['bezug', '-', 'Antworten ohne Bezug zur Frage', 'antwortete wiederholt ohne Bezug zur Frage'],
    ['anwn', '-', 'Anweisungen nicht umgesetzt', 'setzte Anweisungen nicht oder nur verzögert um']
  ];
  /** Wer die Auffälligkeiten festgestellt hat – ohne eigene Auswahl die belehrende Person. */
  const beobachter = p => (Array.isArray(p.wahrVon) ? p.wahrVon : p.bel && has(p.bel.name) ? [p.bel] : []).filter(o => o && has(o.name));
  const einOf = p => arr(p && p.ein).filter(k => k === 'alk' || k === 'drog');
  /** Passt der Punkt zu dem, worauf es Hinweise gibt? */
  const passt = (tags, e) => (e.includes('alk') && tags.includes('a')) || (e.includes('drog') && tags.includes('d'));
  const STOFFE = [['thc', 'THC (Cannabis)'], ['coc', 'Kokain'], ['amp', 'Amphetamin'], ['met', 'Methamphetamin'], ['mdma', 'MDMA (Ecstasy)'], ['opi', 'Opiate'], ['bzo', 'Benzodiazepine'], ['mtd', 'Methadon'], ['bup', 'Buprenorphin'], ['ket', 'Ketamin']];
  const FOLGE = [['ja', 'Ja, jederzeit', 'jederzeit folgen'], ['eingeschr', 'Eingeschränkt', 'nur eingeschränkt folgen'], ['nein', 'Nein', 'nicht folgen']];
  const TEST_ST = [['ok', 'Durchgeführt'], ['abgelehnt', 'Abgelehnt'], ['unmoeglich', 'Nicht möglich'], ['entfaellt', 'Nicht angeboten']];
  /** „0.42“ → „0,42“ */
  const mgl = v => { const s = str(v); if (!s) return ''; const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : s; };
  const grund = g => str(g).replace(/^(da|weil)\s+/i, '').replace(/[.!?]+$/, '');

  /** Gewählte Wahrnehmungen, die zum Konsum passen, in Katalogreihenfolge – wertende mit Beispiel – dazu eigene Formulierungen. */
  function wahrItems(p) {
    const e = einOf(p), sel = arr(p.wahr), bsp = (p.wahrBsp && typeof p.wahrBsp === 'object') ? p.wahrBsp : {};
    const item = ([k, , t, , b]) => (b ? `${t} (${str(bsp[k]) || '[woran erkennbar?]'})` : t);
    return [...WAHR_ALL.filter(([k, , , tags]) => sel.includes(k) && passt(tags, e)).map(item), ...arr(p.wahrFrei).map(str).filter(Boolean)];
  }
  /** Tests vor Ort als Aufzählung (oder Ablehnung). */
  function tvText(p) {
    const tv = p.tv || {}, pr = PR(p);
    if (tv.st === 'abgelehnt') return { text: `Die Teilnahme an Tests zur Überprüfung der Koordination lehnte ${pr.er} nach dem Hinweis auf die Freiwilligkeit ab.`, frei: 'abgelehnt' };
    if (tv.st !== 'ok') return { text: '', frei: '' };
    const rows = TV.filter(([k]) => tv[k] === 'sicher' || tv[k] === 'unsicher').map(([k, l]) => {
      let t = `– ${l}: ${tv[k]}`;
      if (tv[k] === 'unsicher' && has(tv[k + 'D'])) t += `, ${str(tv[k + 'D']).replace(/[.]+$/, '')}`;
      if (k === 'romb' && has(tv.rombZ)) t += `; die 30 Sekunden schätzte ${pr.er} nach ${str(tv.rombZ)} Sekunden ab`;
      return t;
    });
    return { text: [`Nach dem Hinweis, dass die Teilnahme freiwillig ist, führte ${pr.er} folgende Tests durch:`, ...(rows.length ? rows : ['– [Ergebnisse antippen]'])].join('\n'), frei: 'ok' };
  }
  /**
   * Atemalkoholtest und Drogenvortest – stehen nach der Belehrung, jeweils mit dem Hinweis auf die Freiwilligkeit.
   * Der zweite Test knüpft an den ersten an („Zudem …“, „… hingegen …“).
   */
  function testSaetze(p, prevStart = '') {
    const pr = PR(p), r = RO(p) || {}, e = einOf(p), out = [];
    let prev = prevStart;
    for (const kind of ['aat', 'dt']) {
      if (!e.includes(kind === 'aat' ? 'alk' : 'drog')) continue;
      const t = p[kind] || {}, name = kind === 'aat' ? 'Atemalkoholtest' : 'Drogenvortest';
      const von = t.von && has(t.von.name) ? offName(t.von) : '', um = has(t.zeit) ? `um ${str(t.zeit)} Uhr` : '';
      if (!t.st) { if (r.tat) out.push(`[${name}: durchgeführt, abgelehnt oder nicht möglich?]`); continue; }
      if (t.st === 'entfaellt') continue;
      if (t.st === 'unmoeglich') { out.push(`Ein ${name} konnte nicht durchgeführt werden${has(t.grund) ? ', da ' + grund(t.grund) : ''}.`); continue; }
      if (t.st === 'abgelehnt') {
        const nach = prev === 'ok' ? ' hingegen' : '';
        if (von) out.push(`Einen ${name}, den ${von} ${pr.ihm}${um ? ' ' + um : ''} auf freiwilliger Basis anbot, lehnte ${pr.er}${nach} ab.`);
        else if (um) out.push(`Einen ${name}, der ${pr.ihm} ${um} auf freiwilliger Basis angeboten wurde, lehnte ${pr.er}${nach} ab.`);
        else out.push(`Einen ${pr.ihm} auf freiwilliger Basis angebotenen ${name} lehnte ${pr.er}${nach} ab.`);
        prev = 'abgelehnt'; continue;
      }
      const wer = von || '[Beamtin/Beamter]', wann = um || 'um [Uhrzeit]';
      // [Akk.-Artikel, Dat.-Artikel, Adj. Akk., Adj. Akk. „ebenfalls“, Adj. Dat., Nomen Akk., Nomen Dat., Relativpronomen, Zusatz]
      let w;
      if (kind === 'aat') {
        const ger = ` mit dem Gerät ${has(t.geraet) ? str(t.geraet) : '[Gerät]'}`;
        w = t.art === 'beweis' ? ['eine', 'einer', '', 'ebenfalls freiwillige ', 'freiwilligen ', 'beweissichere Atemalkoholmessung', 'beweissicheren Atemalkoholmessung', 'die', ger] : ['einen', 'einem', '', 'ebenfalls freiwilligen ', 'freiwilligen ', 'Atemalkoholvortest', 'Atemalkoholvortest', 'den', ger];
      } else {
        const mittels = t.art === 'urin' ? ' mittels Urinschnelltest (nal von minden)' : t.art === 'speichel' ? ' mittels Speichelwischtest (Drugwipe)' : ' mittels [Urin/Speichel]';
        w = ['einen', 'einem', '', 'ebenfalls freiwilligen ', 'freiwilligen ', 'Drogenvortest', 'Drogenvortest', 'den', mittels];
      }
      const [akk, dat, , ebf, adjD, nA, nD, rel, zus] = w;
      if (prev === 'ok') out.push(`Zudem willigte ${pr.er} in ${akk} ${ebf}${nA}${zus} ein, ${rel} ${wer} ${wann} durchführte.`);
      else if (prev === 'abgelehnt') out.push(`Mit ${dat} ${adjD}${nD}${zus}, ${rel} ${wer} ${wann} durchführte, war ${pr.er} hingegen einverstanden.`);
      else out.push(`Nach dem Hinweis, dass die Teilnahme freiwillig ist, willigte ${pr.er} in ${akk} ${nA}${zus} ein, ${rel} ${wer} ${wann} durchführte.`);
      if (kind === 'aat') {
        out.push(`${t.art === 'beweis' ? 'Die Messung' : 'Der Vortest'} ergab einen Wert von ${mgl(t.wert) || '[Wert]'} mg/l.`);
        if (has(t.trink)) out.push(`Nach eigenen Angaben trank ${pr.er} zuletzt gegen ${str(t.trink)} Uhr.`);
        if (has(t.beob)) out.push(`Ab ${str(t.beob)} Uhr stand ${pr.er} bis zur Messung unter ständiger Beobachtung, sodass ein Nachtrunk ausgeschlossen ist.`);
      } else {
        const stoffe = STOFFE.filter(([k]) => arr(t.stoffe).includes(k)).map(x => x[1]);
        out.push(t.erg === 'neg' ? 'Der Vortest verlief negativ.' : t.erg === 'pos' ? `Der Vortest verlief positiv auf ${stoffe.length ? joinUnd(stoffe) : '[Stoffgruppe]'}.` : 'Der Vortest verlief [Ergebnis].');
      }
      prev = 'ok';
    }
    return out;
  }
  /** Hinweise auf Alkohol/Drogen mit Aufzählung, Angaben zum Konsum, Folgefähigkeit und Tests – steht nach der Schilderung. */
  function einflussText(data, i) {
    const p = arr(data.personen)[i] || {}, e = einOf(p);
    if (!e.length) return '';
    const pr = PR(p), A = e.includes('alk'), D = e.includes('drog');
    const was = A && D ? 'einen vorangegangenen Konsum von Alkohol und anderen berauschenden Mitteln' : A ? 'einen vorangegangenen Alkoholkonsum' : 'einen vorangegangenen Konsum berauschender Mittel';
    const beo = beobachter(p), wer = beo.length ? joinUnd(beo.map(offName)) : '[Beamtin/Beamter]';
    const items = wahrItems(p);
    const head = `${wer} ${beo.length > 1 ? 'stellten' : 'stellte'} bei ${pr.ihm} vor Ort folgende Auffälligkeiten fest, die auf ${was} hinwiesen:`;
    const list = (items.length ? items : ['[Wahrnehmungen antippen]']).map(t => '– ' + t);
    const tv = tvText(p);
    const t = [];
    if (p.konsum === 'ja') t.push(satz(`Auf Nachfrage räumte ${pr.er} ein, ${str(p.konsumText) || '[was, wann und wie viel konsumiert wurde]'}`));
    else if (p.konsum === 'nein') t.push(`Auf Nachfrage bestritt ${pr.er}, ${A && D ? 'Alkohol oder andere berauschende Mittel' : A ? 'Alkohol' : 'berauschende Mittel'} konsumiert zu haben.`);
    else if (p.konsum === 'keine') t.push(`Zum Konsum machte ${pr.er} keine Angaben.`);
    const f = FOLGE.find(x => x[0] === p.folge);
    const durch = beo.length ? joinUnd(beo.map(offName)) : `die eingesetzten ${beamte(data)}`;
    if (!f) t.push('[Konnte den Ausführungen, Fragen und Anweisungen folgen?]');
    else if (p.folgeArt === 'eindruck') t.push(`Auf ${durch} wirkte ${pr.er} so, als könne ${pr.er} den Ausführungen, Fragen und Anweisungen ${f[2]}.`);
    else t.push(`Nach den Wahrnehmungen ${beo.length ? 'von ' + durch : `der eingesetzten ${beamte(data)}`} konnte ${pr.er} den Ausführungen, Fragen und Anweisungen ${f[2]}.`);
    if (f) {
      const sel = arr(p.folgeFakt), vis = FAKT.filter(([k, s]) => sel.includes(k) && (f[0] === 'eingeschr' || (f[0] === 'ja' ? s === '+' : s === '-')));
      const vp = vis.filter(x => x[3]).map(x => (typeof x[3] === 'function' ? x[3](p) : x[3]));
      if (vp.length) t.push(`${pr.Er} ${joinUnd(vp)}.`);
      if (vis.some(x => x[0] === 'wdh')) t.push('Fragen mussten mehrfach wiederholt werden.');
    }
    t.push(...testSaetze(p, tv.frei));
    return [head, ...list, tv.text, t.filter(Boolean).join(' ')].filter(Boolean).join('\n');
  }

  /** Keine Angaben: Beschuldigte/Betroffene zur Sache, Zeugen mit § 52 verweigern das Zeugnis, sonst keine Angaben zum Sachverhalt. */
  function keineWas(p) {
    const r = RO(p) || {}, pr = PR(p);
    if (r.tat) return 'keine Angaben zur Sache machen zu wollen';
    if (r.zeug && p.zvr) return `von ${pr.sein === 'ihr' ? 'ihrem' : pr.sein === 'sein' ? 'seinem' : '[seinem/ihrem]'} Zeugnisverweigerungsrecht Gebrauch zu machen`;
    return 'keine Angaben zum Sachverhalt machen zu wollen';
  }
  const keineLabel = p => { const r = RO(p) || {}; return r.tat ? 'Macht keine Angaben zur Sache' : r.zeug && p.zvr ? 'Verweigert das Zeugnis (§ 52 StPO)' : 'Macht keine Angaben'; };
  /** „Herr Schneider wurde durch PHK Becker als Beschuldigter belehrt.“ – nach den Deutschkenntnissen mit „Er …“. */
  function belehrungSatz(data, i, pron = false) {
    const p = arr(data.personen)[i] || {}, r = RO(p), pr = PR(p);
    const wer = pron ? pr.Er : p.rolle === 'ub' ? cap(werVon(data, i)) : `${herrFrau(p)} ${nameOf(data, i)}`;
    const durch = p.bel && has(p.bel.name) ? offName(p.bel) : '[belehrende Person]';
    const um = has(p.belZeit) ? ` um ${str(p.belZeit)} Uhr` : '';
    if (!r) return `${wer} wurde${um} durch ${durch} [als Zeuge/Beschuldigter] belehrt.`;
    const als = r.zeug ? (p.g === 'w' ? 'Zeugin' : p.g === 'm' ? 'Zeuge' : '[Zeuge/Zeugin]') : (p.g === 'm' || p.g === 'w' ? r[p.g] : r.x);
    let base = `${wer} wurde${um} durch ${durch} als ${als}${r.owi ? ' gemäß § 55 OWiG' : ''} belehrt`;
    if (r.tat && has(p.vorwurf)) base += `, nachdem ${pr.ihm} der ${r.owi ? 'Vorwurf' : 'Tatvorwurf'} (${str(p.vorwurf)}) eröffnet worden war`;
    if (!(r.zeug && p.zvr)) return base + '.' + (p.verst ? ` ${pr.Er} erklärte, die Belehrung verstanden zu haben.` : '');
    const verst = p.verst ? 'die Belehrung verstanden zu haben' : '';
    let folge = '';
    if (p.keine) folge = `, woraufhin ${pr.er} erklärte, ${verst ? verst + ' und ' : ''}${keineWas(p)}`;
    else if (p.bereit !== false) folge = verst ? `, woraufhin ${pr.er} erklärte, ${verst} und aussagen zu wollen` : `, woraufhin ${pr.er} sich zur Aussage bereit erklärte`;
    else if (verst) folge = `, woraufhin ${pr.er} erklärte, ${verst}`;
    return `${base} und dabei besonders auf ${pr.sein} Zeugnisverweigerungsrecht gemäß § 52 StPO hingewiesen${folge}.`;
  }
  /** Der Satz direkt vor der Schilderung. Mit Alkohol/Drogen dazwischen: „Zum Sachverhalt machte er gegenüber … folgende Angaben:“ */
  function vorText(data, i) {
    const p = arr(data.personen)[i] || {};
    if (einOf(p).length) {
      const r = RO(p) || {};
      if (p.keine) return r.zeug && p.zvr ? '' : `${PR(p).Er} erklärte, ${keineWas(p)}.`;
      return `Zum Sachverhalt machte ${PR(p).er} ${gegenText(data, p, true)} sinngemäß folgende Angaben:`;
    }
    return einleitung(data, i, !!(verletzungText(data, i) || spracheText(data, i)));
  }
  /**
   * Strafantrag (nur Geschädigte). Seit 17.07.2024 verlangt § 158 Abs. 2 StPO keine Schriftform mehr, wohl aber, dass Identität
   * und Verfolgungswille feststehen – deshalb steht der Verfolgungswille ausdrücklich im Text; Unterschrift oder Vordruck,
   * wenn angetippt; der Hinweis auf die Frist von drei Monaten (§ 77b StGB) ist vorgewählt und abwählbar.
   */
  /**
   * Verletzungen (alle Rollen): nicht verletzt / gibt Schmerzen an / Verletzungen festgestellt – Ort und Art schreibt man
   * selbst. Danach Lichtbilder (nur bei festgestellten Verletzungen), Rettungswagen (abgelehnt mit Hinweis auf ein Attest
   * oder hinzugezogen mit Transport ins Krankenhaus bzw. ambulanter Behandlung vor Ort).
   */
  function verletzungText(data, i, pron = false) {
    const p = arr(data.personen)[i] || {};
    if (p.ref) return ''; // aus der Eintreffsituation übernommen: Verletzungen stehen dort, nicht doppelt
    if (!['nein', 'schmerz', 'ja'].includes(p.verl)) return '';
    const pr = PR(p), wer = pron ? pr.Er : cap(werVon(data, i)), vt = str(p.verlText).replace(/[.]+$/, '');
    const t = [];
    if (p.verl === 'nein') return `${wer} gab an, nicht verletzt zu sein; Verletzungen waren nicht erkennbar.`;
    if (p.verl === 'schmerz') t.push(`${wer} gab an, Schmerzen ${str(p.schmerzText).replace(/[.]+$/, '') || '[wo?]'} zu haben.`);
    else {
      t.push(`Bei ${pron ? pr.ihm : werDat(data, i)} wurden folgende Verletzungen festgestellt: ${vt || '[welche und wo?]'}.`);
      if (p.foto === 'ja') t.push('Die Verletzungen wurden fotografisch gesichert; die Lichtbilder werden dem Vorgang beigefügt.');
      else if (p.foto === 'nein') t.push('Eine fotografische Sicherung der Verletzungen erfolgte nicht.');
    }
    if (p.rtw === 'kein') {
      t.push(`Auf Nachfrage erklärte ${pr.er}, keinen Rettungswagen zu benötigen.`);
      if (p.attest) {
        t.push(`${pr.Er} wurde auf die Möglichkeit hingewiesen, ein ärztliches Attest einzuholen und dieses nachzureichen, damit es zur Akte genommen werden kann.`);
        if (p.attestReak === 'nach') t.push(`${pr.Er} versicherte den eingesetzten ${beamte(data)}, ein Attest nachzureichen.`);
        else if (p.attestReak === 'kein') t.push(`${pr.Er} erklärte, kein Attest einholen zu wollen.`);
        else if (p.attestReak === 'offen') t.push(`${pr.Er} ließ offen, ob ${pr.er} ein Attest einholen wird.`);
      }
    } else if (p.rtw === 'ja') {
      if (p.rtwWie === 'kh') t.push(`Ein Rettungswagen wurde hinzugezogen, dessen Besatzung ${pr.ihn} nach der Erstversorgung in ${str(p.kh) || '[Krankenhaus]'} transportierte.`);
      else if (p.rtwWie === 'amb') t.push(`Ein Rettungswagen wurde hinzugezogen; nach Inaugenscheinnahme und ambulanter Behandlung durch dessen Besatzung wurde ${pr.er} vor Ort aus der Behandlung entlassen.`);
      else t.push('Ein Rettungswagen wurde hinzugezogen. [Transport ins Krankenhaus oder vor Ort entlassen?]');
    } else t.push('[Rettungswagen benötigt?]');
    return t.join(' ');
  }
  function strafantragText(data, i, pron = false) {
    const p = arr(data.personen)[i] || {};
    if (p.rolle !== 'gs' || !p.sa) return '';
    const pr = PR(p), wer = pron ? pr.Er : cap(werVon(data, i)), frist = p.saFrist !== false;
    const t = [];
    if (p.sa === 'ja') {
      t.push(`${wer} stellte vor Ort mündlich Strafantrag aus allen rechtlichen Gründen und erklärte ausdrücklich, die Strafverfolgung zu wünschen.`);
      if (p.saForm === 'unterschrieben') t.push(`Den Strafantrag bestätigte ${pr.er} anschließend mit ${pr.sein === 'ihr' ? 'ihrer' : pr.sein === 'sein' ? 'seiner' : '[seiner/ihrer]'} Unterschrift auf dem Vordruck.`);
      else if (p.saForm === 'vordruck') t.push(`Zusätzlich wurde ${pr.ihm} ein Vordruck für einen schriftlichen Strafantrag ausgehändigt${frist ? ', verbunden mit dem Hinweis, diesen innerhalb der Antragsfrist von drei Monaten (§ 77b StGB) einzureichen' : ''}.`);
    } else if (p.sa === 'vorbehalt') {
      t.push(`${wer} behielt sich die Stellung eines Strafantrags vor.`);
      if (frist) t.push(`${pr.Er} wurde darauf hingewiesen, dass ein Strafantrag innerhalb von drei Monaten ab Kenntnis von Tat und Täter gestellt werden muss (§ 77b StGB).`);
      if (p.saForm === 'vordruck') t.push(`Ein Vordruck für den Strafantrag wurde ${pr.ihm} ausgehändigt.`);
    } else if (p.sa === 'nein') {
      t.push(`${wer} erklärte, keinen Strafantrag stellen zu wollen.`);
      if (frist) t.push(`${pr.Er} wurde darauf hingewiesen, dass ${pr.er} dies innerhalb von drei Monaten ab Kenntnis von Tat und Täter noch nachholen kann (§ 77b StGB).`);
    }
    return t.join(' ');
  }
  /**
   * Eine Schilderung: Unterüberschrift, Verletzungen, Deutschkenntnisse, Belehrung, Alkohol/Drogen (Fragen und Tests erst
   * nach der Belehrung), die Schilderung, zuletzt der Strafantrag. num = „3.1“ oder ''.
   */
  function block(data, i, num = '') {
    const p = arr(data.personen)[i] || {}, t = schilderung(p), ein = einOf(p).length;
    const verl = verletzungText(data, i), sp = spracheText(data, i, !!verl), genannt = !!(verl || sp);
    return [`${num ? num + ' ' : ''}${heading(data, i)}`, verl, sp, ein ? belehrungSatz(data, i, genannt) : '', ein ? einflussText(data, i) : '', vorText(data, i), p.keine ? '' : t || '[Schilderung]', strafantragText(data, i)].filter(Boolean).join('\n');
  }
  /** Abschnittsnummer ohne Punkt dahinter: „3.“ → „3“, „3.2.“ → „3.2“. */
  const cleanNr = s => str(s).replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
  /** Gesamtpaket: „3 Schilderungen“, darunter „3.1 Schilderung …“, „3.2 …“. */
  function paket(data) {
    const P = arr(data && data.personen), nr = cleanNr(data && data.nr);
    const head = `${nr ? nr + ' ' : ''}Schilderungen`;
    if (!P.length) return head + '\n\n[Noch keine Person erfasst]';
    return [head, ...P.map((p, i) => block(data, i, nr ? `${nr}.${i + 1}` : ''))].join('\n\n');
  }

  function title(data) {
    const P = arr(data && data.personen);
    const names = P.map((p, i) => (has(p && p.nachname) ? nameOf(data, i) : '')).filter(Boolean);
    return names.length ? `Schilderungen – ${names.join(', ')}` : 'Schilderungen';
  }
  function subtitle(data) {
    const n = arr(data && data.personen).length, nr = cleanNr(data && data.nr);
    return `${ARTL[data && data.art] || 'Art offen'} · ${n} ${n === 1 ? 'Person' : 'Personen'}${nr ? ' · Abschnitt ' + nr : ''}`;
  }
  function pill(data) {
    const P = arr(data && data.personen);
    return P.length ? `${P.filter(p => p && p.fertig).length}/${P.length}` : 'neu';
  }
  /** Was bei den Verletzungen noch fehlt (auch für die Eintreffsituation). */
  const verlFehlt = p => {
    const m = [];
    if (p.verl === 'ja' && !has(p.verlText)) m.push('Verletzungen: welche und wo');
    if (p.verl === 'schmerz' && !has(p.schmerzText)) m.push('Schmerzen: wo');
    if (p.verl === 'ja' && !p.foto) m.push('Lichtbilder der Verletzungen');
    if ((p.verl === 'schmerz' || p.verl === 'ja') && !p.rtw) m.push('Rettungswagen');
    if (p.rtw === 'ja' && (p.verl === 'schmerz' || p.verl === 'ja') && !p.rtwWie) m.push('Rettungswagen: Transport oder vor Ort entlassen');
    if (p.rtw === 'ja' && p.rtwWie === 'kh' && !has(p.kh)) m.push('Krankenhaus');
    return m;
  };
  const fehlt = p => {
    const m = [];
    if (!p.rolle) m.push('Rolle');
    if (p.rolle === 'ub' && !ubNr(p)) m.push('Nummer (01, 02 …)');
    if (ubNr(p) === 1 && !eff(p)) m.push('Belehrt als Beschuldigte/r oder Betroffene/r');
    if (p.g !== 'm' && p.g !== 'w') m.push('Anrede');
    if (!has(p.nachname)) m.push('Nachname');
    if (!(p.bel && has(p.bel.name))) m.push('belehrt durch');
    if (!p.keine && !arr(p.gegen).length) m.push('gegenüber');
    if (!p.keine && !has(p.text)) m.push('Schilderung');
    if (!p.ref) m.push(...verlFehlt(p));
    if (p.spr === 'kein' && !arr(p.sprMittel).length && !has(p.sprAndere)) m.push('Verständigung');
    const e = einOf(p);
    if (e.length) {
      if (!wahrItems(p).length) m.push('Wahrnehmungen');
      const bsp = (p.wahrBsp && typeof p.wahrBsp === 'object') ? p.wahrBsp : {};
      for (const [k, l, , tags, b] of WAHR_ALL) if (b && arr(p.wahr).includes(k) && passt(tags, e) && !has(bsp[k])) m.push(`Beispiel zu „${l}“`);
      if (p.tv && p.tv.st === 'ok' && !TV.some(([k]) => p.tv[k])) m.push('Ergebnisse der Tests vor Ort');
      if (p.aat && p.aat.st === 'ok' && e.includes('alk') && !has(p.aat.geraet)) m.push('Atemalkoholtest: Gerät');
      if (!p.folge) m.push('Folgefähigkeit');
      const r = RO(p) || {};
      for (const [k, on, l] of [['aat', e.includes('alk'), 'Atemalkoholtest'], ['dt', e.includes('drog'), 'Drogenvortest']]) {
        const t = p[k] || {}; if (!on) continue;
        if (!t.st && r.tat) m.push(l);
        if (t.st === 'ok') { if (!has(t.zeit)) m.push(`${l}: Uhrzeit`); if (!(t.von && has(t.von.name))) m.push(`${l}: durch wen`); if (k === 'aat' && !has(t.wert)) m.push('Atemalkoholwert'); if (k === 'dt' && !t.erg) m.push('Ergebnis Drogenvortest'); }
      }
    }
    return m;
  };

  /* ======================= Kontext aus dem Vorgang ======================= */
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  /**
   * Übernimmt, was frühere Abschnitte desselben Vorgangs liefern (rein, ohne DOM; liefert true, wenn sich etwas geändert hat):
   * – Art (Strafanzeige/Verkehr) aus dem Abschnitt, der die Personen führt,
   * – Name, Anrede und Rolle der übernommenen Personen (p.ref = Kennung der Person dort) – Änderungen dort wirken hier,
   * – data.mit: die übrigen Personen des Vorgangs, damit Namenskürzel in allen Abschnitten gleich ausfallen.
   * Ohne Vorgang (ctx ohne Personen) werden die Verknüpfungen gelöst; die Personen bleiben als eigene erhalten.
   */
  function nimmt(data, ctx) {
    if (!data || typeof data !== 'object') return false;
    let ch = false;
    const set = (o, k, v) => { if (same(o[k], v)) return; if (v === undefined || v === null || v === '') delete o[k]; else o[k] = v; ch = true; };
    const src = ctx && Array.isArray(ctx.personen) ? ctx.personen.filter(q => q && q.pid) : null;
    if (!src) {
      for (const p of arr(data.personen)) if (p && p.ref) { delete p.ref; ch = true; }
      if (data.mit) { delete data.mit; ch = true; }
      return ch;
    }
    if (ctx.art) set(data, 'art', ctx.art);
    const by = new Map(src.map(q => [q.pid, q]));
    for (const p of arr(data.personen)) {
      if (!p || !p.ref) continue;
      const q = by.get(p.ref);
      if (!q) { delete p.ref; ch = true; continue; }
      for (const k of ['rolle', 'ub', 'g', 'nachname', 'vorname']) set(p, k, q[k]);
    }
    const linked = new Set(arr(data.personen).map(p => p && p.ref).filter(Boolean));
    const mit = src.filter(q => !linked.has(q.pid) && has(q.nachname)).map(q => ({ vorname: str(q.vorname), nachname: str(q.nachname) }));
    set(data, 'mit', mit.length ? mit : undefined);
    return ch;
  }
  /** Kontext nur, wenn ein anderer Abschnitt des Vorgangs Personen führt. */
  const ctxOf = api => { const c = api && typeof api.ctx === 'function' ? api.ctx() : null; return c && Array.isArray(c.personen) ? c : null; };
  const ctxName = q => [herrFrau(q), str(q.vorname), str(q.nachname)].filter(Boolean).join(' ') || '[Name offen]';
  const verlKurz = q => (!q ? 'Verletzungen offen' : q.verl === 'nein' ? 'nicht verletzt' : q.verl === 'schmerz' ? 'gibt Schmerzen an' : q.verl === 'ja' ? 'Verletzungen festgestellt' : 'Verletzungen dort noch offen');

  /* ======================= Maske ======================= */
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_UP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  /** Ansicht je Vorgang: 'menu' (Liste mit +), 'person' (Maske), 'done' (Gesamtpaket). q = Suchtext der Namensfelder. */
  const V = { id: null, s: 'menu', i: -1, last: -1, q: { bel: '', gegen: '' }, focus: '', guide: '' };
  const $ = s => document.querySelector(s);
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };

  function open(d) { V.id = d.id; V.s = d.status === 'fertig' && arr(d.data.personen).length ? 'done' : 'menu'; V.i = -1; V.last = -1; V.q = { bel: '', gegen: '', aat: '', dt: '', wf: '' }; V.focus = ''; }

  function loadRanks(api) {
    const m = new Map();
    const put = (name, grad, frei = false) => { const k = nameKey(name), g = str(grad); if (k && g && (frei || RANK_RE.test(g)) && !m.has(k)) m.set(k, g); };
    for (const t of api.team()) if (t) put(t.name, rankT(t), !!str(t.rank));
    for (const x of api.docs().slice().sort((a, b) => (b.u || 0) - (a.u || 0))) {
      const dt = (x && x.data) || {};
      for (const c of crewOf(dt)) put(c.name, c.grad);
      if (x.type !== 'sch') continue;
      for (const p of arr(dt.personen)) {
        if (p && p.bel && typeof p.bel === 'object') put(p.bel.name, p.bel.grad);
        for (const g of arr(p && p.gegen)) if (g && !g.ref) put(g.name, g.grad);
      }
    }
    RANKS = m;
  }
  /** Wer kommt als belehrende Person oder Gesprächspartner in Frage: zuerst in diesem Vorgang schon genannt, dann Besatzung, dann Team. */
  function pool(api, data) {
    const out = [], idx = new Map();
    const add = (grad, name, src) => {
      name = str(name); if (!name) return;
      const k = nameKey(name), g = str(grad) || rankFor(name);
      if (idx.has(k)) { const o = idx.get(k); if (!o.grad && g) o.grad = g; return; }
      const o = { grad: g, name, src }; idx.set(k, o); out.push(o);
    };
    for (const p of arr(data.personen).slice().reverse()) {
      if (p && p.bel && typeof p.bel === 'object') add(p.bel.grad, p.bel.name, 'doc');
      for (const x of arr(p && p.gegen)) if (x && !x.ref) add(x.grad, x.name, 'doc');
    }
    for (const c of crewOf(data)) add(c.grad, c.name, 'crew');
    for (const t of api.team()) if (t) add(rankT(t), t.name, 'team');
    return out;
  }
  function matches(o, q) {
    const qq = norm(q).replace(/\s+/g, ' '); if (!qq) return true;
    const n = nameKey(o.name), g = norm(o.grad);
    const hay = [n, ...n.split(/[\s-]+/), `${g} ${norm(nachname(o.name))}`, `${g} ${n}`];
    return hay.some(h => h.startsWith(qq)) || (qq.length >= 3 && n.includes(qq));
  }
  function suggest(api, data, key) {
    const p = arr(data.personen)[V.i] || {};
    const q = str(V.q[key]);
    const excl = new Set();
    if (key === 'gegen') {
      if (p.bel && has(p.bel.name)) excl.add(nameKey(p.bel.name));
      for (const x of arr(p.gegen)) if (x && !x.ref && has(x.name)) excl.add(nameKey(x.name));
    }
    const list = pool(api, data).filter(o => !excl.has(nameKey(o.name)));
    if (!q) { const near = list.filter(o => o.src !== 'team'); return (near.length ? near : list).slice(0, 8); }
    return list.filter(o => matches(o, q)).slice(0, 8);
  }
  function suggHtml(api, data, key) {
    const q = str(V.q[key]);
    const list = suggest(api, data, key);
    const exact = q && list.some(o => nameKey(o.name) === nameKey(q) || nameKey(`${o.grad} ${nachname(o.name)}`) === nameKey(q));
    const chips = list.map(o => `<button type="button" class="chip" data-sd="pick" data-ta="${key}" data-v="${esc(JSON.stringify({ grad: o.grad || '', name: o.name }))}">${o.grad ? `<b>${esc(o.grad)}</b> ` : ''}${esc(o.name)}</button>`);
    if (q && !exact) chips.push(`<button type="button" class="chip sd-free" data-sd="pick" data-ta="${key}" data-free="1">+ „${esc(q)}“ übernehmen</button>`);
    if (!chips.length) return `<p class="w-hint sd-hint">Noch niemand im Team – Namen mit Amtsbezeichnung tippen, z. B. „POK Müller“.</p>`;
    return chips.join('');
  }
  /** Eingabefeld mit Vorschlägen (Tippen filtert Team und Besatzung). */
  function ta(api, data, key, id, ph) {
    return `<div class="sd-ta"><input class="input" id="${id}" data-ta="${key}" value="${esc(V.q[key] || '')}" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" maxlength="60" aria-label="${{ bel: 'Belehrt durch', gegen: 'Gegenüber', aat: 'Atemalkoholtest durch', dt: 'Drogenvortest durch' }[key] || 'Name'} – Namen tippen"><div class="w-chips sd-sugg" data-ta-list="${key}">${suggHtml(api, data, key)}</div></div>`;
  }
  /** Gewählte Beamtin / gewählter Beamter. Fehlt die Amtsbezeichnung, steht eine Auswahl davor. */
  function tok(o, path, act, j, extra = '') {
    const nn = nachname(o.name);
    const lbl = has(o.grad) ? `${o.grad} ${nn}` : nn;
    const sel = has(o.grad) ? '' : `<select class="sd-grad" data-sk="${esc(path)}.grad" aria-label="Amtsbezeichnung für ${esc(o.name)}">${DGRADE.map(x => `<option value="${esc(x)}">${esc(x || 'Amtsbez.?')}</option>`).join('')}</select>`;
    return `<span class="sd-tok${has(o.grad) ? '' : ' warn'}">${sel}<b>${esc(lbl)}</b>${nn !== str(o.name) ? `<small>${esc(o.name)}</small>` : ''}<button type="button" data-sd="${act}"${j != null ? ` data-j="${j}"` : ''}${extra} aria-label="${esc(lbl)} entfernen">${ICON_X}</button></span>`;
  }
  const topBar = (back, kicker, ttl) => `<div class="w-top"><button type="button" class="icon-btn sm${back === 'list' ? ' w-back' : ''}" ${back === 'list' ? 'data-w="list" aria-label="Zur Liste"' : `data-sd="${back}" aria-label="Zurück zur Übersicht"`}>${ICON_BACK}</button><div class="w-top-t"><span class="spaced">${esc(kicker)}</span><div class="w-title"${back === 'menu' ? ' data-live="head"' : ''}>${esc(ttl)}</div></div></div>`;

  function menuHtml(d, api) {
    const data = d.data, P = arr(data.personen), art = data.art;
    const ctx = ctxOf(api), fest = !!(ctx && ctx.art);
    const artHint = art === 'verkehr' ? 'Namen nur mit Anfangsbuchstaben: „Frau M.“ – teilen sich Personen den Buchstaben, „A. M.“, dann „An. M.“.' : art === 'straf' ? 'Nachname ausgeschrieben – bei gleichem Nachnamen mit Vorname.' : 'Davon hängt ab, wie die Namen im Text stehen.';
    const artQ = `<div class="w-q"><span class="w-lbl">Worum geht es?${art ? '' : ' <i class="w-req" title="Pflicht">•</i>'}</span><div class="w-seg" role="group" aria-label="Art">${ARTEN.map(([v, l]) => `<button type="button" class="w-opt" data-sd="art" data-v="${v}" aria-pressed="${String(art === v)}"${fest ? ' disabled' : ''}>${l}</button>`).join('')}</div><p class="w-hint sd-hint">${fest ? `Übernommen aus „${esc(ctx.personenAus)}“ – dort änderbar. ` : ''}${artHint}</p></div>`;
    // Im Vorgang: Personen, die in einem früheren Abschnitt (Eintreffsituation) erfasst wurden, hier nur noch antippen
    const offen = ctx ? arr(ctx.personen).filter(q => q && q.pid && !P.some(x => x && x.ref === q.pid)) : [];
    const ctxAdd = ctx && arr(ctx.personen).length
      ? `<div class="w-q"><div class="sd-add vg-take"><span class="w-lbl">Aus „${esc(ctx.personenAus)}“ übernehmen</span>${offen.length ? `<div class="sd-add-row">${offen.map(q => `<button type="button" class="sd-add-b" data-sd="take" data-v="${esc(q.pid)}"><i aria-hidden="true">+</i><span>${esc(ctxName(q))}<small>${esc(rolleLabel(q))}</small></span></button>`).join('')}</div>` : '<p class="w-hint sd-hint">Alle dort erfassten Personen sind übernommen.</p>'}<p class="w-hint sd-hint">Name, Rolle und Verletzungen kommen von dort – hier trägst du nur Belehrung und Schilderung ein.</p></div></div>`
      : '';
    const items = P.map((p, i) => {
      p = p || {};
      const e = einOf(p);
      const meta = [rolleLabel(p) + (ubNr(p) === 1 && RO(p) ? ` (als ${p.g === 'm' || p.g === 'w' ? RO(p)[p.g] : RO(p).x})` : ''), p.bel && has(p.bel.name) ? 'belehrt durch ' + offName(p.bel) : 'Belehrung offen', ...(p.spr === 'eingeschr' ? ['Deutsch eingeschränkt'] : p.spr === 'kein' ? ['kein Deutsch'] : []), ...(e.length ? [e.length === 2 ? 'Alkohol und Drogen' : e[0] === 'alk' ? 'Alkohol' : 'Drogen'] : [])];
      const snip = p.keine ? '' : str(p.text).replace(/\s+/g, ' ');
      if (!p.ref && (p.verl === 'ja' || p.verl === 'schmerz')) meta.push(p.verl === 'ja' ? 'verletzt' : 'Schmerzen');
      if (p.rolle === 'gs' && p.sa) meta.push({ ja: 'Strafantrag gestellt', vorbehalt: 'Strafantrag vorbehalten', nein: 'kein Strafantrag' }[p.sa]);
      if (p.keine) meta.push(keineLabel(p).replace(/^Macht /, '').replace(/^Verweigert das Zeugnis.*/, 'verweigert das Zeugnis'));
      const opened = i === V.last;
      return `<li class="sd-item${opened ? ' open' : ''}"><div class="sd-row"><button type="button" class="sd-card" data-sd="edit" data-i="${i}"><span class="sd-n mono">${i + 1}</span><span class="sd-main"><b>${esc(heading(data, i))}</b><small>${esc(meta.join(' · '))}${snip ? ` · „${esc(snip.slice(0, 80))}${snip.length > 80 ? '…' : ''}“` : ''}</small></span><span class="pill ${p.fertig ? 'pill-lime' : 'pill-quiet'}">${p.fertig ? 'Fertig' : 'Entwurf'}</span></button>${P.length > 1 ? `<button type="button" class="sd-up" data-sd="up" data-i="${i}" aria-label="Nach oben"${i ? '' : ' disabled'}>${ICON_UP}</button>` : ''}</div>${opened ? `<div class="w-out sd-last"><div class="w-out-h"><span class="w-lbl">Abgeschlossen – so steht es in der Anzeige</span><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></div><pre class="w-out-t">${esc(block(data, i))}</pre></div>` : ''}</li>`;
    }).join('');
    const add = art
      ? `<div class="sd-add"><span class="w-lbl">${ctxAdd ? 'Andere Person hinzufügen (nicht in der Eintreffsituation)' : P.length ? 'Weitere Person hinzufügen' : 'Person hinzufügen'}</span><div class="sd-add-row">${rollenFor(art).map(([v, r]) => `<button type="button" class="sd-add-b" data-sd="add" data-v="${v}"><i aria-hidden="true">+</i>${esc(v === 'ub' ? `${r.x} ${String(nextUb(P)).padStart(2, '0')}` : r.x)}</button>`).join('')}</div>${art === 'verkehr' ? '<p class="w-hint sd-hint">01 ist die Unfallverursacherin oder der Unfallverursacher (Belehrung als Beschuldigte/r oder Betroffene/r), 02 und weitere werden als Zeugen belehrt.</p>' : ''}</div>`
      : `<div class="sd-add off"><span class="w-lbl">Person hinzufügen</span><p class="w-hint sd-hint">Erst oben wählen: Strafanzeige oder Verkehrsangelegenheit.</p></div>`;
    const done = d.status === 'fertig';
    return `${topBar('list', `Schilderungen · ${ARTL[art] || 'Art offen'}`, title(data))}
      <div class="w-grid sd-grid">${artQ}
        ${P.length ? `<div class="w-q"><span class="w-lbl">Erfasst <span class="sd-cnt mono">${P.length}</span></span><ol class="sd-list">${items}</ol></div>` : ''}
        ${ctxAdd}
        <div class="w-q">${add}</div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${P.length ? `<button type="button" class="btn btn-accent" data-sd="alle">${done ? 'Zum Gesamtpaket' : 'Alle Schilderungen hinzugefügt'}</button>` : ''}</div>`;
  }

  function personHtml(d, api) {
    const data = d.data, P = arr(data.personen), i = V.i, p = P[i] || {}, base = `personen.${i}`;
    const r = RO(p), ctx = ctxOf(api), link = !!(p.ref && ctx);
    const hasBel = p.bel && has(p.bel.name);
    const anr = [['m', 'Herr'], ['w', 'Frau']].map(([v, l]) => `<button type="button" class="w-opt" data-sd="set" data-p="${base}.g" data-v="${v}" aria-pressed="${String(p.g === v)}">${l}</button>`).join('');
    const roles = rollenFor(data.art, p.rolle).map(([v, x]) => `<button type="button" class="chip" data-sd="set" data-p="${base}.rolle" data-v="${v}" aria-pressed="${String(p.rolle === v)}">${esc(p.g === 'm' || p.g === 'w' ? x[p.g] : x.x)}</button>`).join('');
    // Unfallbeteiligte: Nummer wählen (01 = Verursacher); wer als 01 gewählt wird, tauscht mit der bisherigen 01
    const ubMax = Math.max(4, ...P.map(ubNr)) + (P.filter(x => ubNr(x)).length >= 4 ? 1 : 0);
    const ubQ = p.rolle === 'ub' && !link ? `<div class="w-q" data-q="ub"><span class="w-lbl">Nummer <i class="w-req" title="Pflicht">•</i></span><div class="w-chips" role="group" aria-label="Nummer">${Array.from({ length: ubMax }, (x, k) => k + 1).map(n => `<button type="button" class="chip mono" data-sd="ub" data-v="${n}" aria-pressed="${String(ubNr(p) === n)}">${String(n).padStart(2, '0')}</button>`).join('')}</div><p class="w-hint sd-hint">01 ist die Unfallverursacherin oder der Unfallverursacher. Ist die Nummer schon vergeben, tauschen die beiden.</p></div>` : '';
    const belAls = ubNr(p) === 1
      ? `<div class="w-q" data-q="belals"><span class="w-lbl">Belehrt als <i class="w-req" title="Pflicht">•</i></span><div class="w-seg" role="group" aria-label="Belehrt als">${[['bs', ROLLE.bs], ['betr', ROLLE.betr]].map(([v, x]) => `<button type="button" class="w-opt" data-sd="set" data-p="${base}.belAls" data-v="${v}" aria-pressed="${String(p.belAls === v)}">${esc(p.g === 'm' || p.g === 'w' ? x[p.g] : x.x)}</button>`).join('')}</div><p class="w-hint sd-hint">01 hat den Unfall verursacht: bei einer Straftat (z. B. § 229, § 315c, § 142 StGB) Belehrung als Beschuldigte/r, bei einer Ordnungswidrigkeit als Betroffene/r (§ 55 OWiG).</p></div>`
      : ubNr(p) > 1 ? `<div class="w-q" data-q="belals"><p class="w-hint sd-hint">Unfallbeteiligte ab 02 werden als Zeugin oder Zeuge belehrt.</p></div>` : '';
    const person = link
      ? `<div class="w-q"><div class="w-info">Aus „${esc(ctx.personenAus)}“: <b>${esc([herrFrau(p), str(p.vorname), str(p.nachname)].filter(Boolean).join(' '))}</b> · ${esc(rolleLabel(p))} · ${esc(verlKurz(arr(ctx.personen).find(q => q.pid === p.ref)))}. Name, Rolle und Verletzungen änderst du dort – hier stehen sie nicht noch einmal.</div></div>
        <p class="sd-im">Im Text: <b data-live="head">${esc(heading(data, i))}</b></p>`
      : `<div class="w-q" data-q="rolle"><span class="w-lbl">Rolle <i class="w-req" title="Pflicht">•</i></span><div class="w-chips" role="group" aria-label="Rolle">${roles}</div></div>
        ${ubQ}
        <div class="w-q" data-q="g"><span class="w-lbl">Anrede <i class="w-req" title="Pflicht">•</i></span><div class="w-seg" role="group" aria-label="Anrede">${anr}</div></div>
        <div class="w-q half" data-q="nn"><label class="w-lbl" for="sdNn">Nachname <i class="w-req" title="Pflicht">•</i></label><input class="input" id="sdNn" data-sk="${base}.nachname" data-next="sdVn" value="${esc(p.nachname || '')}" placeholder="z. B. Müller" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" maxlength="80"></div>
        <div class="w-q half" data-q="vn"><label class="w-lbl" for="sdVn">Vorname</label><input class="input" id="sdVn" data-sk="${base}.vorname" data-next="${hasBel ? '' : 'sdBel'}" value="${esc(p.vorname || '')}" placeholder="z. B. Anna" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" maxlength="80"></div>
        <p class="sd-im">Im Text: <b data-live="head">${esc(heading(data, i))}</b></p>
        ${verletzungHtml(api, p, base)}`;
    const g = arr(p.gegen);
    const belOn = g.some(x => x && x.ref === 'bel'), alleOn = g.some(x => x && x.ref === 'alle');
    const others = g.map((x, j) => [x, j]).filter(([x]) => x && !x.ref && has(x.name));
    const gegenChips = `<div class="w-chips">${hasBel ? `<button type="button" class="chip" data-sd="gbel" aria-pressed="${String(belOn)}">${esc(offName(p.bel))}<small class="sd-sm">hat belehrt</small></button>` : ''}<button type="button" class="chip" data-sd="galle" aria-pressed="${String(alleOn)}">${crewNamen(data).length ? 'Alle: ' + esc(crewNamen(data).map(offName).join(', ')) : `den eingesetzten ${beamte(data)}`}</button></div>`;
    return `${topBar('menu', `Schilderungen · Person ${i + 1} von ${P.length}`, heading(data, i))}
      <div class="w-grid sd-grid">
        <div class="w-q full w-head"><span class="w-head-t">Person</span></div>
        ${person}
        <div class="w-q full w-head"><span class="w-head-t">Verständigung und Belehrung</span><span class="w-head-h">Kommt zuerst – Fragen zum Konsum und Tests stehen im Text erst danach.</span></div>
        ${spracheHtml(p, base)}
        ${belAls}
        <div class="w-q" data-q="bel"><span class="w-lbl">Belehrt durch <i class="w-req" title="Pflicht">•</i></span>${r ? `<p class="w-hint">${esc(r.bel)}</p>` : ''}${hasBel ? `<div class="sd-toks">${tok(p.bel, `${base}.bel`, 'unbel')}</div>` : ta(api, data, 'bel', 'sdBel', 'Namen tippen, z. B. Schulz')}</div>
        ${belZusatzHtml(p, base)}
        ${r && r.zeug ? `<div class="w-q" data-q="zvr"><span class="w-lbl">Belehrung</span><div class="w-chips"><button type="button" class="chip" data-sd="zvr" aria-pressed="${String(!!p.zvr)}">Besonderer Hinweis auf das Zeugnisverweigerungsrecht</button>${p.zvr && !p.keine ? `<button type="button" class="chip" data-sd="bereit" aria-pressed="${String(p.bereit !== false)}">Zur Aussage bereit erklärt</button>` : ''}</div><p class="w-hint sd-hint">Steht mit „gemäß § 52 StPO“ im Text. Gilt für Verlobte, Ehegatten, eingetragene Lebenspartner, Verwandte und Verschwägerte der beschuldigten Person.</p></div>` : ''}
        <div class="w-q full w-head"><span class="w-head-t">Alkohol und Drogen</span></div>
        ${einflussHtml(api, data, p, base)}
        <div class="w-q full w-head"><span class="w-head-t">Schilderung</span><span class="w-head-h">Wem gegenüber und was die Person geschildert hat – steht im Text ganz unten.</span></div>
        ${r ? `<div class="w-q" data-q="keine"><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.keine" aria-pressed="${String(!!p.keine)}">${esc(keineLabel(p))}</button></div>${r.tat ? '<p class="w-hint sd-hint">Beschuldigte und Betroffene müssen sich nicht zur Sache äußern. Im Text steht dann „… erklärte, keine Angaben zur Sache machen zu wollen.“</p>' : ''}</div>` : ''}
        ${p.keine ? '' : `<div class="w-q" data-q="gegen"><span class="w-lbl">Gegenüber <i class="w-req" title="Pflicht">•</i></span>${gegenChips}${others.length ? `<div class="sd-toks">${others.map(([x, j]) => tok(x, `${base}.gegen.${j}`, 'ungegen', j)).join('')}</div>` : ''}${ta(api, data, 'gegen', 'sdGegen', 'Weitere Person tippen …')}<p class="sd-im">Im Text: <b data-live="gegen">${esc(gegenText(data, p))}</b></p></div>`}
        ${p.keine ? '' : `<div class="w-q" data-q="text"><label class="w-lbl" for="sdText">Schilderung <i class="w-req" title="Pflicht">•</i></label><div class="sd-sent" data-sd="focus"><span class="sd-intro" data-live="intro">${esc(vorText(data, i))}</span><textarea class="sd-text" id="sdText" data-sk="${base}.text" placeholder="Was hat die Person sinngemäß geschildert? Ich-Form oder indirekte Rede." autocomplete="off" autocapitalize="sentences" spellcheck="true" maxlength="12000">${esc(p.text || '')}</textarea></div></div>`}
        ${strafantragHtml(p, base)}
        <div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So steht es in der Anzeige</span><button type="button" class="btn btn-light btn-sm" data-sd="copy1" data-i="${i}">Kopieren</button></div><pre class="w-out-t" data-live="block">${esc(block(data, i))}</pre></div></div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-sd="del">Entfernen</button><span class="grow"></span><span class="w-nav-i mono">${i + 1} / ${P.length}</span><button type="button" class="btn btn-accent" data-sd="done1">Abschließen</button></div>`;
  }

  /* ---------- Maske: Deutschkenntnisse, Alkohol/Drogen ---------- */
  const VORWURF = {
    bs: ['Körperverletzung', 'gefährliche Körperverletzung', 'Bedrohung', 'Beleidigung', 'Sachbeschädigung', 'Diebstahl', 'Hausfriedensbruch', 'Widerstand gegen Vollstreckungsbeamte', 'Trunkenheit im Verkehr', 'unerlaubtes Entfernen vom Unfallort', 'fahrlässige Körperverletzung', 'Fahren ohne Fahrerlaubnis'],
    betr: ['Fahren unter Alkoholeinfluss (§ 24a Abs. 1 StVG)', 'Fahren unter der Wirkung berauschender Mittel (§ 24a Abs. 2 StVG)', 'Rotlichtverstoß', 'Geschwindigkeitsüberschreitung', 'Benutzung eines Mobiltelefons', 'Vorfahrtsverstoß', 'ungenügender Sicherheitsabstand', 'Fehler beim Abbiegen, Wenden oder Rückwärtsfahren']
  };
  const zeitIn = (id, path, val) => `<div class="sd-time"><input class="input mono" type="time" id="${id}" data-sk="${esc(path)}" value="${esc(val || '')}"><button type="button" class="chip sm" data-sd="now" data-p="${esc(path)}">Jetzt</button></div>`;
  /** Uhrzeit der Belehrung, Tatvorwurf (Beschuldigte/Betroffene) und „Belehrung verstanden“. */
  function belZusatzHtml(p, base) {
    const r = RO(p); if (!r) return '';
    const vw = r.tat ? `<div><label class="w-lbl" for="sdVw">${r.owi ? 'Vorwurf' : 'Tatvorwurf'} (eröffnet)</label>${textIn('sdVw', `${base}.vorwurf`, p.vorwurf, r.owi ? 'z. B. Rotlichtverstoß' : 'z. B. Körperverletzung')}<div class="w-chips sd-sugg">${VORWURF[eff(p)].map(v => `<button type="button" class="chip sm" data-sd="set" data-p="${base}.vorwurf" data-v="${esc(v)}" aria-pressed="${String(str(p.vorwurf) === v)}">${esc(v)}</button>`).join('')}</div></div>` : '';
    return `<div class="w-q" data-q="belz"><div class="sd-two"><div><label class="w-lbl" for="sdBelZ">Uhrzeit der Belehrung</label>${zeitIn('sdBelZ', `${base}.belZeit`, p.belZeit)}</div>${vw}</div></div>
        <div class="w-q" data-q="verst"><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.verst" aria-pressed="${String(!!p.verst)}">Hat erklärt, die Belehrung verstanden zu haben</button></div><p class="w-hint sd-hint">Steht dann im Text. Gerade bei Alkohol, Drogen oder wenig Deutsch wichtig.</p></div>`;
  }
  const seg = (path, cur, opts, cls = 'w-seg') => `<div class="${cls}" role="group">${opts.map(([v, l]) => `<button type="button" class="${cls === 'w-seg' ? 'w-opt' : 'chip'}" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  const flips = (path, cur, opts, extra = () => '') => `<div class="w-chips">${opts.map(([v, l]) => `<button type="button" class="chip" data-sd="flip" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(arr(cur).includes(v))}">${esc(l)}${extra(v)}</button>`).join('')}</div>`;
  const textIn = (id, path, val, ph, extra = '', max = 240) => `<input class="input" id="${id}" data-sk="${esc(path)}" value="${esc(val || '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="${max > 240 ? 'true' : 'false'}" maxlength="${max}"${extra}>`;

  function spracheHtml(p, base) {
    const cur = p.spr === 'eingeschr' || p.spr === 'kein' ? p.spr : 'ok';
    const pr = PR(p);
    let more = '';
    if (cur !== 'ok') {
      more = `<div class="sd-sub" data-q="sprm">
        <span class="w-lbl">Wie lief die Verständigung?${cur === 'kein' ? ' <i class="w-req" title="Pflicht">•</i>' : ''}</span>${flips(`${base}.sprMittel`, p.sprMittel, MITTEL)}
        <div class="sd-inl"><label class="w-hint" for="sdSprA">Andere Sprache, z. B. Englisch</label>${textIn('sdSprA', `${base}.sprAndere`, p.sprAndere, 'Englisch')}</div>
        <div class="sd-inl" data-q="sprver"><span class="w-lbl">Hat ${pr.er === 'sie' ? 'sie' : pr.er === 'er' ? 'er' : 'die Person'} nach eurem Eindruck alles verstanden?</span>${seg(`${base}.sprVer`, p.sprVer, [['ja', 'Ja, vollständig'], ['nein', 'Nicht vollständig']])}</div>
        ${RO(p) && RO(p).tat ? '<p class="w-hint sd-hint">Beschuldigte und Betroffene haben Anspruch auf eine unentgeltliche Dolmetscherin oder einen Dolmetscher (§ 187 GVG, Art. 6 Abs. 3 EMRK). Eine Belehrung nur per Übersetzungs-App ist angreifbar.</p>' : ''}
      </div>`;
    }
    return `<div class="w-q" data-q="spr"><span class="w-lbl">Deutschkenntnisse</span>${seg(`${base}.spr`, cur, SPRACHE)}<p class="w-hint sd-hint">${cur === 'ok' ? 'Bei problemlosem Deutsch steht dazu nichts im Text.' : 'Steht vor dem Einleitungssatz, weil es die Belehrung betrifft.'}</p>${more}</div>`;
  }

  function testHtml(api, data, p, base, kind) {
    const t = p[kind] || {}, path = `${base}.${kind}`, A = kind === 'aat';
    const ttl = A ? 'Atemalkoholtest' : 'Drogenvortest';
    let more = '';
    if (t.st === 'ok' || t.st === 'abgelehnt') {
      const von = t.von && has(t.von.name) ? `<div class="sd-toks">${tok(t.von, `${path}.von`, 'unoff', null, ` data-p="${esc(path)}.von"`)}</div>` : ta(api, data, kind, A ? 'sdAat' : 'sdDt', 'Namen tippen');
      more += `<div class="sd-two" data-q="${kind}d"><div><span class="w-lbl">${t.st === 'ok' ? 'Durchgeführt durch' : 'Angeboten durch'}${t.st === 'ok' ? ' <i class="w-req" title="Pflicht">•</i>' : ''}</span>${von}</div>
        <div><label class="w-lbl" for="${A ? 'sdAatZ' : 'sdDtZ'}">Uhrzeit${t.st === 'ok' ? ' <i class="w-req" title="Pflicht">•</i>' : ''}</label>${zeitIn(A ? 'sdAatZ' : 'sdDtZ', `${path}.zeit`, t.zeit)}</div></div>`;
    }
    if (t.st === 'ok' && A) {
      const geraete = [...new Set([...api.docs().filter(x => x && x.type === 'sch').flatMap(x => arr(x.data && x.data.personen)).map(q => q && q.aat && str(q.aat.geraet)).filter(Boolean), 'Dräger Alcotest 5820', 'Dräger Alcotest 6820', 'Dräger Alcotest 9510 (Evidential)'])].slice(0, 5);
      more += `<div class="sd-inl" data-q="aatg"><label class="w-lbl" for="sdAatGer">Gerät <i class="w-req" title="Pflicht">•</i></label>${textIn('sdAatGer', `${path}.geraet`, t.geraet, 'z. B. Dräger Alcotest 5820')}<div class="w-chips sd-sugg">${geraete.map(g => `<button type="button" class="chip sm" data-sd="set" data-p="${path}.geraet" data-v="${esc(g)}" aria-pressed="${String(str(t.geraet) === g)}">${esc(g)}</button>`).join('')}</div></div>
        <div class="sd-two" data-q="aatt"><div><label class="w-lbl" for="sdAatTr">Zuletzt getrunken (eigene Angabe)</label>${zeitIn('sdAatTr', `${path}.trink`, t.trink)}</div><div><label class="w-lbl" for="sdAatBe">Unter Beobachtung seit</label>${zeitIn('sdAatBe', `${path}.beob`, t.beob)}</div></div>
        <div class="sd-two" data-q="aatw"><div><span class="w-lbl">Art</span>${seg(`${path}.art`, t.art || 'vortest', [['vortest', 'Vortest (Handgerät)'], ['beweis', 'Beweissicher']], 'w-chips')}</div>
        <div><label class="w-lbl" for="sdAatW">Ergebnis <i class="w-req" title="Pflicht">•</i></label><div class="sd-unit"><input class="input mono" id="sdAatW" data-sk="${esc(path)}.wert" value="${esc(t.wert || '')}" placeholder="0,42" inputmode="decimal" autocomplete="off" maxlength="6"><span class="w-unit">mg/l</span></div></div></div>
        <p class="w-hint sd-hint">Für Straftaten nach §§ 315c, 316 StGB ist die Blutprobe maßgeblich – der Atemalkoholwert ersetzt sie nicht.</p>`;
    }
    if (t.st === 'ok' && !A) {
      more += `<div class="sd-inl" data-q="dtart"><span class="w-lbl">Art <i class="w-req" title="Pflicht">•</i></span>${seg(`${path}.art`, t.art, [['speichel', 'Speichel – Drugwipe'], ['urin', 'Urin – nal von minden']], 'w-chips')}</div>
        <div class="sd-inl" data-q="dterg"><span class="w-lbl">Ergebnis <i class="w-req" title="Pflicht">•</i></span>${seg(`${path}.erg`, t.erg, [['neg', 'Negativ'], ['pos', 'Positiv']])}</div>
        ${t.erg === 'pos' ? `<div class="sd-inl" data-q="dtst"><span class="w-lbl">Positiv auf</span>${flips(`${path}.stoffe`, t.stoffe, STOFFE)}</div>` : ''}
        <p class="w-hint sd-hint">Ein positiver Vortest begründet den Verdacht – Blutprobe prüfen (§ 81a StPO, bei Ordnungswidrigkeiten § 46 Abs. 4 OWiG).</p>`;
    }
    if (t.st === 'unmoeglich') more += `<div class="sd-inl" data-q="${kind}g"><label class="w-hint" for="${A ? 'sdAatG' : 'sdDtG'}">„… konnte nicht durchgeführt werden, da …“</label>${textIn(A ? 'sdAatG' : 'sdDtG', `${path}.grund`, t.grund, A ? 'er nicht ausreichend pusten konnte' : 'sie keinen Urin abgeben konnte')}</div>`;
    return `<div class="sd-sub" data-q="${kind}"><span class="w-lbl">${ttl}${RO(p) && RO(p).tat ? ' <i class="w-req" title="Pflicht">•</i>' : ''}</span><p class="w-hint">Erst nach der Belehrung anbieten und auf die Freiwilligkeit hinweisen – so steht es auch im Text.</p>${seg(`${path}.st`, t.st, TEST_ST, 'w-chips')}${more}</div>`;
  }

  /** Auswahl „Verletzungen“ – auch von der Eintreffsituation benutzt (hint = eigener Hinweis unter der Überschrift). */
  function verletzungHtml(api, p, base, hint) {
    const pr = PR(p), v = p.verl, wer = pr.er === 'sie' ? 'sie' : pr.er === 'er' ? 'er' : 'die Person';
    let more = '';
    if (v === 'schmerz') more += `<div class="sd-inl" data-q="verlt"><label class="w-hint" for="sdSchm">„…gab an, Schmerzen <b>…</b> zu haben.“</label>${textIn('sdSchm', `${base}.schmerzText`, p.schmerzText, 'im linken Oberarm und an der linken Wange', '', 400)}</div>`;
    if (v === 'ja') more += `<div class="sd-inl" data-q="verlt"><label class="w-hint" for="sdVerl">„…wurden folgende Verletzungen festgestellt: <b>…</b>“</label>${textIn('sdVerl', `${base}.verlText`, p.verlText, 'eine etwa 3 cm große Rötung an der linken Wange', '', 400)}</div>
      <div class="sd-inl" data-q="foto"><span class="w-lbl">Lichtbilder</span>${seg(`${base}.foto`, p.foto, [['ja', 'Fotografisch gesichert'], ['nein', 'Nicht fotografiert']], 'w-chips')}</div>`;
    if (v === 'schmerz' || v === 'ja') {
      let rtw = '';
      if (p.rtw === 'kein') {
        rtw += `<div class="sd-inl" data-q="attest"><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${base}.attest" aria-pressed="${String(!!p.attest)}">Auf die Möglichkeit eines Attests hingewiesen</button></div></div>`;
        if (p.attest) rtw += `<div class="sd-inl" data-q="attestr"><span class="w-lbl">Wie hat ${wer} darauf reagiert?</span>${seg(`${base}.attestReak`, p.attestReak, [['nach', 'Reicht ein Attest nach'], ['kein', 'Will kein Attest'], ['offen', 'Lässt es offen']], 'w-chips')}</div>`;
      }
      if (p.rtw === 'ja') {
        rtw += `<div class="sd-inl" data-q="rtwwie"><span class="w-lbl">Und dann?</span>${seg(`${base}.rtwWie`, p.rtwWie, [['kh', 'Transport ins Krankenhaus'], ['amb', 'Ambulant behandelt, vor Ort entlassen']], 'w-chips')}</div>`;
        if (p.rtwWie === 'kh') {
          const kh = [...new Set(api.docs().filter(x => x && (x.type === 'sch' || x.type === 'eintreffen')).flatMap(x => arr(x.data && x.data.personen)).map(q => q && str(q.kh)).filter(Boolean))].slice(0, 5);
          rtw += `<div class="sd-inl" data-q="kh"><label class="w-hint" for="sdKh">„…transportierte ${pr.ihn === 'sie' ? 'sie' : pr.ihn === 'ihn' ? 'ihn' : '[ihn/sie]'} nach der Erstversorgung in <b>…</b>“</label>${textIn('sdKh', `${base}.kh`, p.kh, 'das Klinikum Gütersloh')}${kh.length ? `<div class="w-chips sd-sugg">${kh.map(k => `<button type="button" class="chip sm" data-sd="set" data-p="${base}.kh" data-v="${esc(k)}" aria-pressed="${String(str(p.kh) === k)}">${esc(k)}</button>`).join('')}</div>` : ''}</div>`;
        }
      }
      more += `<div class="sd-inl" data-q="rtw"><span class="w-lbl">Rettungswagen <i class="w-req" title="Pflicht">•</i></span>${seg(`${base}.rtw`, p.rtw, [['kein', 'Braucht keinen (auf Nachfrage)'], ['ja', 'Rettungswagen hinzugezogen']], 'w-chips')}</div>${rtw}`;
    }
    return `<div class="w-q full w-head"><span class="w-head-t">Verletzungen</span><span class="w-head-h">${esc(hint || 'Ort und Art selbst eintragen – steht im Text ganz vorn, vor der Belehrung.')}</span></div>
      <div class="w-q" data-q="verl"><span class="w-lbl">War ${wer} verletzt?</span>${seg(`${base}.verl`, v, [['nein', 'Nicht verletzt'], ['schmerz', 'Gibt Schmerzen an'], ['ja', 'Verletzungen festgestellt']])}${more ? `<div class="sd-sub">${more}</div>` : ''}</div>`;
  }

  function strafantragHtml(p, base) {
    if (p.rolle !== 'gs') return '';
    const pr = PR(p), sa = p.sa;
    let more = '';
    if (sa === 'ja') more += `<div class="sd-inl" data-q="saform"><span class="w-lbl">Zusätzlich schriftlich?</span>${seg(`${base}.saForm`, p.saForm || 'muendlich', [['muendlich', 'Nur mündlich'], ['unterschrieben', 'Vor Ort unterschrieben'], ['vordruck', 'Vordruck ausgehändigt']], 'w-chips')}<p class="w-hint sd-hint">Nach § 158 Abs. 2 StPO (seit Juli 2024) müssen Identität und Verfolgungswille eindeutig feststehen. Am sichersten ist die Unterschrift auf dem Vordruck.</p></div>`;
    if (sa === 'vorbehalt') more += `<div class="sd-inl" data-q="saform"><span class="w-lbl">Vordruck</span>${seg(`${base}.saForm`, p.saForm === 'vordruck' ? 'vordruck' : 'kein', [['kein', 'Nicht ausgehändigt'], ['vordruck', 'Vordruck ausgehändigt']], 'w-chips')}</div>`;
    const fristZeigen = sa === 'vorbehalt' || sa === 'nein' || (sa === 'ja' && p.saForm === 'vordruck');
    if (fristZeigen) more += `<div class="sd-inl" data-q="safrist"><div class="w-chips"><button type="button" class="chip" data-sd="frist" aria-pressed="${String(p.saFrist !== false)}">Auf die Frist von drei Monaten hingewiesen</button></div><p class="w-hint sd-hint">Vorgewählt – abwählen, falls der Hinweis nicht gegeben wurde (§ 77b StGB).</p></div>`;
    return `<div class="w-q full w-head"><span class="w-head-t">Strafantrag</span><span class="w-head-h">Nur bei Antragsdelikten nötig, z. B. Körperverletzung (§ 230 StGB), Beleidigung (§ 194 StGB), Sachbeschädigung (§ 303c StGB), Hausfriedensbruch (§ 123 Abs. 2 StGB).</span></div>
      <div class="w-q" data-q="sa"><span class="w-lbl">Hat ${pr.er === 'sie' ? 'sie' : pr.er === 'er' ? 'er' : 'die Person'} mündlich Strafantrag gestellt?</span>${seg(`${base}.sa`, sa, [['ja', 'Ja'], ['vorbehalt', 'Behält sich vor'], ['nein', 'Nein']])}${more ? `<div class="sd-sub">${more}</div>` : ''}</div>`;
  }

  function einflussHtml(api, data, p, base) {
    const e = einOf(p), pr = PR(p);
    const head = `<div class="w-q" data-q="ein"><span class="w-lbl">Hinweise auf Alkohol oder Drogen?</span>${flips(`${base}.ein`, e, [['alk', 'Alkohol'], ['drog', 'Drogen']])}<p class="w-hint sd-hint">${e.length ? 'Beides antippen, wenn es Hinweise auf beides gibt.' : 'Nur antippen, wenn es Hinweise gab – dann erscheinen die passenden Wahrnehmungen, die Folgefähigkeit und die Tests.'}</p></div>`;
    if (!e.length) return head;
    const both = e.length === 2, sel = arr(p.wahr);
    const groups = WAHR.map(([g, items]) => {
      const vis = items.filter(([, , , tags]) => passt(tags, e));
      if (!vis.length) return '';
      const n = vis.filter(([k]) => sel.includes(k)).length;
      return `<div class="sd-wg"><span class="w-mk-gt">${esc(g)}${n ? ` · ${n}` : ''}</span><div class="w-chips">${vis.map(([k, l, , tags]) => `<button type="button" class="chip" data-sd="flip" data-p="${base}.wahr" data-v="${k}" aria-pressed="${String(sel.includes(k))}">${esc(l)}${both && tags !== 'ad' ? `<small class="sd-sm">${tags === 'a' ? 'Alk.' : 'Drog.'}</small>` : ''}</button>`).join('')}</div></div>`;
    }).join('');
    const nSel = wahrItems(p).length;
    // Wer hat es festgestellt? (Besatzung und schon genannte Beamte; ohne Auswahl die belehrende Person)
    const beo = beobachter(p).map(o => nameKey(o.name));
    const kand = pool(api, data).filter(o => o.src !== 'team').slice(0, 8);
    const vonHtml = `<div class="sd-inl" data-q="wvon"><span class="w-lbl">Festgestellt durch</span><div class="w-chips">${kand.map(o => `<button type="button" class="chip" data-sd="wvon" data-v="${esc(JSON.stringify({ grad: o.grad || '', name: o.name }))}" aria-pressed="${String(beo.includes(nameKey(o.name)))}">${esc(offName({ grad: o.grad || rankFor(o.name), name: o.name }))}</button>`).join('')}</div><p class="w-hint sd-hint">Im Text: „${esc(beo.length ? joinUnd(beobachter(p).map(offName)) : '[Beamtin/Beamter]')} ${beo.length > 1 ? 'stellten' : 'stellte'} … fest“.</p></div>`;
    // Wertende Punkte: woran war es erkennbar?
    const bspSel = WAHR_ALL.filter(([k, , , tags, b]) => b && sel.includes(k) && passt(tags, e));
    const bsp = (p.wahrBsp && typeof p.wahrBsp === 'object') ? p.wahrBsp : {};
    const bspHtml = bspSel.length ? `<div class="sd-wg" data-q="wbsp"><span class="w-mk-gt">Woran erkennbar?</span><p class="w-hint">Statt einer Wertung ein konkretes Beispiel – steht in Klammern dahinter.</p>${bspSel.map(([k, l]) => `<div class="sd-inl"><label class="w-hint" for="sdB_${k}">${esc(l)}</label>${textIn('sdB_' + k, `${base}.wahrBsp.${k}`, bsp[k], 'z. B. schrie die Beamten wiederholt an')}</div>`).join('')}</div>` : '';
    // Tests vor Ort
    const tv = p.tv || {};
    const tvRows = tv.st === 'ok' ? TV.map(([k, l, ph]) => `<div class="sd-tv"><span class="sd-tv-l">${esc(l)}</span>${seg(`${base}.tv.${k}`, tv[k] || '', [['', '—'], ['sicher', 'sicher'], ['unsicher', 'unsicher']], 'w-chips')}${tv[k] === 'unsicher' ? textIn(`sdTv_${k}`, `${base}.tv.${k}D`, tv[k + 'D'], 'z. B. ' + ph) : ''}${k === 'romb' && tv[k] ? `<div class="sd-unit"><label class="w-hint" for="sdTvZ">30 Sekunden geschätzt nach</label><input class="input mono" id="sdTvZ" data-sk="${base}.tv.rombZ" value="${esc(tv.rombZ || '')}" inputmode="numeric" placeholder="–" maxlength="3"><span class="w-unit">s</span></div>` : ''}</div>`).join('') : '';
    const tvHtml = `<div class="sd-sub" data-q="tv"><span class="w-lbl">Tests vor Ort</span><p class="w-hint">Freiwillig – im Text mit Hinweis auf die Freiwilligkeit.</p>${seg(`${base}.tv.st`, tv.st || 'nein', [['ok', 'Durchgeführt'], ['abgelehnt', 'Abgelehnt'], ['nein', 'Nicht durchgeführt']], 'w-chips')}${tvRows}</div>`;
    // Woran war die Folgefähigkeit erkennbar?
    const fv = p.folge ? FAKT.filter(([, sg]) => p.folge === 'eingeschr' || (p.folge === 'ja' ? sg === '+' : sg === '-')) : [];
    const faktHtml = fv.length ? `<div class="sd-inl" data-q="fakt"><span class="w-lbl">Woran erkennbar?</span>${flips(`${base}.folgeFakt`, p.folgeFakt, fv.map(([k, , l]) => [k, l]))}</div>` : '';
    const warn = RO(p) && RO(p).tat && (p.folge === 'eingeschr' || p.folge === 'nein') && !p.verst ? '<div class="w-info">Konnte er nur eingeschränkt folgen, ist entscheidend, ob die Belehrung verstanden wurde. Wenn ja: oben „Hat erklärt, die Belehrung verstanden zu haben“ antippen und hier belegen, woran es erkennbar war. Wenn nein: Befragung zur Sache zurückstellen.</div>' : '';
    const frei = arr(p.wahrFrei).map((t, j) => `<span class="sd-tok"><b>${esc(t)}</b><button type="button" data-sd="unwf" data-j="${j}" aria-label="${esc(t)} entfernen">${ICON_X}</button></span>`).join('');
    const konsum = `<span class="w-lbl">Angaben zum Konsum</span>${seg(`${base}.konsum`, p.konsum, [['ja', 'Räumte Konsum ein'], ['nein', 'Bestritt Konsum'], ['keine', 'Keine Angaben']], 'w-chips')}${p.konsum === 'ja' ? `<div class="sd-inl" data-q="konstext"><label class="w-hint" for="sdKons">„Auf Nachfrage räumte ${pr.er} ein, …“</label>${textIn('sdKons', `${base}.konsumText`, p.konsumText, 'gegen 20:00 Uhr zwei Bier getrunken zu haben')}</div>` : ''}`;
    const folge = `<span class="w-lbl">Konnte ${pr.er === 'sie' ? 'sie' : pr.er === 'er' ? 'er' : 'die Person'} den Ausführungen, Fragen und Anweisungen folgen? <i class="w-req" title="Pflicht">•</i></span>${seg(`${base}.folge`, p.folge, FOLGE)}${faktHtml}${warn}<div class="sd-inl sd-gap" data-q="folgeart"><span class="w-lbl">Formulierung</span>${seg(`${base}.folgeArt`, p.folgeArt === 'eindruck' ? 'eindruck' : 'wahr', [['wahr', 'Nach den Wahrnehmungen'], ['eindruck', 'Wirkte so (Eindruck)']], 'w-chips')}</div>`;
    return `${head}<div class="w-q"><div class="w-sub sd-box">
      ${vonHtml}
      <div data-q="wahr" class="sd-gap"><span class="w-lbl">Wahrnehmungen und Feststellungen <i class="w-req" title="Pflicht">•</i>${nSel ? `<span class="sd-cnt mono">${nSel}</span>` : ''}</span><p class="w-hint">Alles antippen, was vor Ort auffiel – erscheint im Text als Aufzählung. Wertende Punkte fragen gleich nach einem Beispiel.</p>
      ${groups}</div>
      ${bspHtml}
      <div class="sd-wg" data-q="wf"><span class="w-mk-gt">Eigene Wahrnehmung</span>${frei ? `<div class="sd-toks">${frei}</div>` : ''}<div class="sd-add-in"><input class="input" id="sdWf" data-wf="1" value="${esc(V.q.wf || '')}" placeholder="z. B. Hose im Schritt durchnässt" autocomplete="off" spellcheck="true" enterkeyhint="done" maxlength="200"><button type="button" class="btn btn-ghost btn-sm" data-sd="wfadd">Hinzufügen</button></div></div>
      ${tvHtml}
      <div class="sd-sub" data-q="konsum">${konsum}</div>
      <div class="sd-sub" data-q="folge">${folge}</div>
      ${e.includes('alk') ? testHtml(api, data, p, base, 'aat') : ''}
      ${e.includes('drog') ? testHtml(api, data, p, base, 'dt') : ''}
    </div></div>`;
  }

  const nrHint = nr => (nr ? `Überschrift „${nr} Schilderungen“, darunter ${nr}.1, ${nr}.2 … – ohne Punkt hinter der Zahl.` : 'Ohne Nummer stehen die Überschriften ohne Gliederungsziffer da.');
  function doneHtml(d, api) {
    const data = d.data, nr = cleanNr(data.nr), txt = paket(data);
    const ph = (txt.match(/\[[^\]]+\]/g) || []).length;
    const vg = api && typeof api.ctx === 'function' ? api.ctx() : null;
    return `${topBar('menu', 'Schilderungen · Gesamtpaket', title(data))}
      <div class="w-grid sd-grid">
        ${vg && vg.nrAuto ? `<div class="w-q"><div class="w-info">Abschnitt ${esc(nr || '–')} – die Nummer ergibt sich aus der Reihenfolge im Vorgang.</div></div>` : `<div class="w-q"><label class="w-lbl" for="sdNr">Welche Nummer haben die Schilderungen in deiner Anzeige?</label><div class="sd-nr"><input class="input mono" id="sdNr" data-sk="nr" value="${esc(data.nr || '')}" placeholder="z. B. 3" inputmode="decimal" autocomplete="off" maxlength="8"><div class="w-chips">${['2', '3', '4', '5', '6'].map(n => `<button type="button" class="chip" data-sd="set" data-p="nr" data-v="${n}" aria-pressed="${String(nr === n)}">${n}</button>`).join('')}</div></div><p class="w-hint sd-hint" data-live="nrhint">${esc(nrHint(nr))}</p></div>`}
        ${ph ? `<div class="w-q"><div class="w-warn">${ph} ${ph === 1 ? 'Angabe fehlt' : 'Angaben fehlen'} (in eckigen Klammern) – über „Weitere Person“ in der Übersicht die Person antippen und nachtragen.</div></div>` : ''}
        <div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">Gesamtpaket</span><button type="button" class="btn btn-light btn-sm" data-sd="copyall">Kopieren</button></div><pre class="w-out-t" data-live="paket">${esc(txt)}</pre></div></div>
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="menu">+ Weitere Person</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copyall">Gesamtpaket kopieren</button></div>`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    loadRanks(api);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (typeof api.ctx === 'function' && nimmt(d.data, api.ctx())) api.persist(false);
    if (V.s === 'person' && !arr(d.data.personen)[V.i]) V.s = 'menu';
    if (V.s === 'done' && !arr(d.data.personen).length) V.s = 'menu';
    return V.s === 'person' ? personHtml(d, api) : V.s === 'done' ? doneHtml(d, api) : menuHtml(d, api);
  }
  function grow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function mounted() {
    grow($('#sdText'));
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus({ preventScroll: true }); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
    if (V.guide) { const k = V.guide; V.guide = ''; guide(k); }
  }
  /**
   * Nach einer Auswahl sanft weiterführen: nur wenn der Anfang der direkt folgenden Auswahl nicht zu sehen ist, und nur so
   * weit, dass er sichtbar wird (höchstens bis knapp unter den oberen Rand). Nie nach oben, nie über etwas hinweg.
   */
  function guide(key) {
    const all = [...document.querySelectorAll('#wMain [data-q]')];
    const i = all.findIndex(n => n.dataset.q === key);
    const nx = i >= 0 ? all[i + 1] : null; if (!nx) return;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const nav = document.querySelector('#wMain .w-nav'); const navH = nav ? nav.getBoundingClientRect().height : 0;
    const r = nx.getBoundingClientRect(), free = vh - navH - 12;
    const need = r.top + Math.min(r.height, 150); // Überschrift und erste Reihe der nächsten Auswahl
    if (r.top < 0 || need <= free) return;
    const delta = Math.min(r.top - vh * 0.22, need - free);
    if (delta < 32) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (Fokus bleibt im Feld). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    const p = arr(data.personen)[V.i];
    if (V.s === 'person' && p) { put('head', heading(data, V.i)); put('intro', vorText(data, V.i)); put('block', block(data, V.i)); put('gegen', gegenText(data, p)); }
    if (V.s === 'done') { const nr = cleanNr(data.nr); put('paket', paket(data)); put('nrhint', nrHint(nr)); host.querySelectorAll('[data-sd="set"][data-p="nr"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === nr))); }
  }
  const isEmpty = p => !p || (!p.ref && !has(p.nachname) && !has(p.vorname) && !has(p.text) && !(p.bel && has(p.bel.name)) && !arr(p.gegen).some(x => x && !x.ref));
  /** Zurück zur Übersicht: eine versehentlich angelegte, leere Person verschwindet wieder. */
  function leavePerson(data) {
    const P = arr(data.personen);
    if (V.s === 'person' && isEmpty(P[V.i])) { P.splice(V.i, 1); if (!P.length) delete data.personen; }
    V.s = 'menu'; V.i = -1; V.last = -1;
  }
  function parseFree(api, data, q) {
    q = str(q).replace(/\s+/g, ' '); if (!q) return null;
    const t = q.split(' '), g0 = canonRank(t[0]);
    if (g0 && t.length > 1) return { grad: g0, name: t.slice(1).join(' ') };
    const hits = pool(api, data).filter(o => norm(nachname(o.name)) === norm(q) || nameKey(o.name) === nameKey(q));
    if (hits.length === 1) return { grad: hits[0].grad, name: hits[0].name };
    return { grad: '', name: q };
  }
  function pick(b, api) {
    const data = api.d.data, key = b.dataset.ta, p = arr(data.personen)[V.i]; if (!p) return;
    let o = null;
    if (b.dataset.free) o = parseFree(api, data, V.q[key]);
    else { try { o = JSON.parse(b.dataset.v); } catch (e) { o = null; } }
    if (!o || !has(o.name)) return;
    o = { grad: str(o.grad) || rankFor(o.name), name: str(o.name) };
    if (!o.grad) delete o.grad;
    if (key === 'bel') {
      p.bel = o;
      if (!arr(p.gegen).length) p.gegen = [{ ref: 'bel' }];
      V.focus = '';
    } else if (key === 'aat' || key === 'dt') {
      p[key] = { ...(p[key] && typeof p[key] === 'object' ? p[key] : {}), von: o };
      V.focus = '';
    } else {
      const g = arr(p.gegen).filter(x => x && x.ref !== 'alle');
      const k = nameKey(o.name);
      if (p.bel && nameKey(p.bel.name) === k) { if (!g.some(x => x.ref === 'bel')) g.push({ ref: 'bel' }); }
      else if (!g.some(x => !x.ref && nameKey(x.name) === k)) g.push(o);
      p.gegen = g;
      V.focus = api.mobile() ? '' : 'sdGegen';
    }
    V.q[key] = '';
    api.persist(false); api.render();
  }
  async function delPerson(api) {
    const data = api.d.data, P = arr(data.personen), p = P[V.i]; if (!p) return;
    if (!isEmpty(p)) {
      const ok = await api.ask({ title: 'Person entfernen?', text: `„${heading(data, V.i)}“ wird mit der Schilderung aus diesem Vorgang gelöscht.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
      if (!ok) return;
    }
    P.splice(V.i, 1); if (!P.length) delete data.personen;
    V.s = 'menu'; V.i = -1; V.last = -1;
    api.persist(false); api.render(); top0();
  }
  function finishPerson(api) {
    const data = api.d.data, p = arr(data.personen)[V.i]; if (!p) return;
    const miss = fehlt(p);
    p.fertig = true; V.last = V.i; V.s = 'menu'; V.i = -1;
    api.persist(false); api.render(); top0();
    api.toast(miss.length ? `Abgeschlossen – noch offen: ${miss.join(', ')} (im Text als [Platzhalter]).` : 'Schilderung abgeschlossen');
  }
  function toDone(api) {
    const d = api.d, data = d.data;
    if (!has(data.nr)) {
      const prev = api.docs().filter(x => x && x.type === 'sch' && x.id !== d.id && has(x.data && x.data.nr)).sort((a, b) => (b.u || 0) - (a.u || 0))[0];
      if (prev) data.nr = cleanNr(prev.data.nr);
    }
    d.status = 'fertig'; V.s = 'done'; V.last = -1;
    api.persist(true); api.render(); top0();
  }

  function addFrei(api) {
    const p = arr(api.d.data.personen)[V.i]; const t = str(V.q.wf).replace(/[.;,]+$/, '');
    if (!p || !t) { const el = $('#sdWf'); if (el) el.focus(); return; }
    p.wahrFrei = [...arr(p.wahrFrei), t]; V.q.wf = ''; V.focus = 'sdWf';
    api.persist(false); api.render();
  }
  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    if (b.disabled) return true;
    const d = api.d, data = d.data, a = b.dataset.sd;
    const P = () => { if (!Array.isArray(data.personen)) data.personen = []; return data.personen; };
    const cur = () => P()[V.i];
    const save = () => { api.persist(false); api.render(); };
    switch (a) {
      case 'focus': { if (e.target.tagName !== 'TEXTAREA') { const t = $('#sdText'); if (t) { t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch (er) { /* egal */ } } } return true; }
      case 'art': data.art = b.dataset.v; save(); return true;
      case 'take': {
        const ctx = ctxOf(api), q = ctx && arr(ctx.personen).find(x => x && x.pid === b.dataset.v); if (!q) return true;
        if (d.status === 'fertig') d.status = 'entwurf';
        P().push({ ref: q.pid, rolle: q.rolle, ...(q.ub ? { ub: q.ub } : {}), ...(q.g ? { g: q.g } : {}), ...(has(q.nachname) ? { nachname: q.nachname } : {}), ...(has(q.vorname) ? { vorname: q.vorname } : {}) });
        V.i = P().length - 1; V.s = 'person'; V.last = -1; V.q = { bel: '', gegen: '', aat: '', dt: '', wf: '' };
        save(); top0(); return true;
      }
      case 'ub': {
        const p = cur(); if (!p) return true; const n = Number(b.dataset.v), old = ubNr(p);
        const other = P().find(x => x !== p && ubNr(x) === n);
        if (other) { if (old) other.ub = old; else other.ub = nextUb(P().filter(x => x !== other).concat([{ rolle: 'ub', ub: n }])); }
        p.ub = n; V.guide = 'ub'; save(); return true;
      }
      case 'add': {
        if (d.status === 'fertig') d.status = 'entwurf';
        P().push(b.dataset.v === 'ub' ? { rolle: 'ub', ub: nextUb(P()) } : { rolle: b.dataset.v });
        V.i = P().length - 1; V.s = 'person'; V.last = -1; V.q = { bel: '', gegen: '', aat: '', dt: '', wf: '' };
        save(); top0(); return true;
      }
      case 'edit': V.i = Number(b.dataset.i); V.s = 'person'; V.last = -1; V.q = { bel: '', gegen: '', aat: '', dt: '', wf: '' }; api.render(); top0(); return true;
      case 'up': { const i = Number(b.dataset.i), a2 = P(); if (i > 0 && a2[i]) { [a2[i - 1], a2[i]] = [a2[i], a2[i - 1]]; V.last = V.last === i ? i - 1 : V.last === i - 1 ? i : V.last; save(); } return true; }
      case 'menu': leavePerson(data); save(); top0(); return true;
      case 'set': {
        const path = b.dataset.p;
        setPath(data, path, b.dataset.v);
        if (/\.rolle$/.test(path) && cur()) { const p = cur(); if (p.rolle === 'ub') { if (!ubNr(p)) p.ub = nextUb(P().filter(x => x !== p)); } else { delete p.ub; delete p.belAls; } }
        if (/\.g$/.test(path) && cur() && !has(cur().nachname) && !api.mobile()) V.focus = 'sdNn';
        const q = b.closest('[data-q]'); if (q) V.guide = q.dataset.q;
        if (path === 'nr') { api.persist(false); live(api); const inp = $('#sdNr'); if (inp) inp.value = b.dataset.v; return true; }
        save(); return true;
      }
      case 'zvr': { const p = cur(); if (!p) return true; if (p.zvr) { delete p.zvr; delete p.bereit; } else p.zvr = true; save(); return true; }
      case 'bereit': { const p = cur(); if (!p) return true; if (p.bereit === false) delete p.bereit; else p.bereit = false; save(); return true; }
      case 'pick': { const q = b.closest('[data-q]'); if (q && b.dataset.ta !== 'gegen') V.guide = q.dataset.q; pick(b, api); return true; }
      case 'unbel': { const p = cur(); if (!p) return true; delete p.bel; V.focus = api.mobile() ? '' : 'sdBel'; save(); return true; }
      case 'ungegen': { const p = cur(); if (!p) return true; const g = arr(p.gegen).slice(); g.splice(Number(b.dataset.j), 1); if (g.length) p.gegen = g; else delete p.gegen; save(); return true; }
      case 'gbel': { const p = cur(); if (!p) return true; const g = arr(p.gegen).filter(x => x && x.ref !== 'alle'); const on = g.some(x => x.ref === 'bel'); const n = on ? g.filter(x => x.ref !== 'bel') : [{ ref: 'bel' }, ...g]; if (n.length) p.gegen = n; else delete p.gegen; save(); return true; }
      case 'galle': { const p = cur(); if (!p) return true; if (arr(p.gegen).some(x => x && x.ref === 'alle')) delete p.gegen; else p.gegen = [{ ref: 'alle' }]; save(); return true; }
      case 'flip': {
        const path = b.dataset.p, v = b.dataset.v, a2 = arr(getPath(data, path)).slice(), k = a2.indexOf(v);
        if (k >= 0) a2.splice(k, 1); else a2.push(v);
        setPath(data, path, a2.length ? a2 : undefined); save(); return true;
      }
      case 'frist': { const p = cur(); if (!p) return true; if (p.saFrist === false) delete p.saFrist; else p.saFrist = false; save(); return true; }
      case 'wvon': {
        const p = cur(); if (!p) return true; let o = null; try { o = JSON.parse(b.dataset.v); } catch (er) { return true; }
        o = { grad: str(o.grad) || rankFor(o.name), name: str(o.name) }; if (!o.grad) delete o.grad;
        const list = beobachter(p).slice(), k = list.findIndex(x => nameKey(x.name) === nameKey(o.name));
        if (k >= 0) list.splice(k, 1); else list.push(o);
        p.wahrVon = list; save(); return true;
      }
      case 'tog': setPath(data, b.dataset.p, getPath(data, b.dataset.p) ? undefined : true); save(); return true;
      case 'now': { const d0 = new Date(); setPath(data, b.dataset.p, `${String(d0.getHours()).padStart(2, '0')}:${String(d0.getMinutes()).padStart(2, '0')}`); save(); return true; }
      case 'unoff': setPath(data, b.dataset.p, undefined); save(); return true;
      case 'wfadd': addFrei(api); return true;
      case 'unwf': { const p = cur(); if (!p) return true; const a2 = arr(p.wahrFrei).slice(); a2.splice(Number(b.dataset.j), 1); if (a2.length) p.wahrFrei = a2; else delete p.wahrFrei; save(); return true; }
      case 'copy1': api.copy(block(data, Number(b.dataset.i))); return true;
      case 'copyall': api.copy(paket(data)); return true;
      case 'done1': finishPerson(api); return true;
      case 'del': delPerson(api); return true;
      case 'alle': toDone(api); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.ta) {
      V.q[el.dataset.ta] = el.value;
      const box = $(`[data-ta-list="${el.dataset.ta}"]`); if (box) box.innerHTML = suggHtml(api, api.d.data, el.dataset.ta);
      return true;
    }
    if (el.dataset.wf) { V.q.wf = el.value; return true; }
    if (el.dataset.sk && el.tagName !== 'SELECT') {
      setPath(api.d.data, el.dataset.sk, el.value);
      api.persist(false);
      if (el.id === 'sdText') grow(el);
      live(api);
      return true;
    }
    return false;
  }
  function change(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.tagName === 'SELECT') { setPath(api.d.data, el.dataset.sk, el.value || undefined); api.persist(false); api.render(); }
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.ta) {
      e.preventDefault();
      const first = $(`[data-ta-list="${el.dataset.ta}"] [data-sd="pick"]`);
      if (first) first.click();
      return true;
    }
    if (el.dataset.wf) { e.preventDefault(); const b = $('[data-sd="wfadd"]'); if (b) b.click(); return true; }
    if (el.dataset.next) {
      e.preventDefault();
      const n = el.dataset.next ? document.getElementById(el.dataset.next) : null;
      if (n) n.focus(); else el.blur();
      return true;
    }
    return false;
  }
  /** ⌘/Strg + Enter: Person abschließen, in der Übersicht zum Gesamtpaket, dort kopieren. */
  function submit(api) {
    const data = api.d.data;
    if (V.s === 'person') finishPerson(api);
    else if (V.s === 'menu' && arr(data.personen).length) toDone(api);
    else if (V.s === 'done') api.copy(paket(data));
  }

  root.WSchild = Object.freeze({
    id: 'sch', name: 'Schilderungen', short: 'Schilderungen', kurz: 'SCH',
    desc: 'Zeugen, Geschädigte, Beschuldigte und Betroffene · Belehrung, gegenüber, Schilderung · Gesamtpaket mit Abschnittsnummer',
    intro: 'Personen mit + anlegen, je Person Belehrung und Schilderung · Strafanzeige oder Verkehr · Gesamtpaket mit Abschnittsnummer kopieren',
    labels: { newBtn: 'Schilderungen', bericht: 'Schilderungen' },
    steps: [],
    title, subtitle, pill,
    plain: paket,
    text: data => [['', 'Schilderungen', paket(data), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen: () => [], personalien: () => '',
    screen: { open, render, mounted, click, input, change, keydown, submit },
    kontext: { nimmt },
    ui: { verletzungHtml },
    core: { ROLLEN, ROLLE, ARTEN, rollenFor, rolleLabel, rolleArt, werVon, werDat, ubNr, nextUb, eff, PR, herrFrau, verlFehlt, nachname, offName, DGRADE, nameOf, kuerzel, heading, einleitung, gegenText, block, paket, spracheText, einflussText, belehrungSatz, vorText, strafantragText, verletzungText, WAHR, TV, FAKT, fehlt, cleanNr, canonRank, parseFree: (data, q, team = []) => parseFree({ team: () => team, docs: () => [] }, data, q), setRanks: m => { RANKS = new Map(Object.entries(m || {}).map(([k, v]) => [nameKey(k), v])); } }
  });
})(typeof window !== 'undefined' ? window : globalThis);
