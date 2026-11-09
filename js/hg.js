/*
 * Workoholic · Schriftliche Arbeiten · Modul „Häusliche Gewalt“ (PolG NRW) · Version 2
 * ---------------------------------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 *  - Ablauf: Einsatz → Personen → Eintreffen → Umstände → Schilderungen → Prognose → Maßnahmen → Abschluss.
 *    Alle beteiligten Personen werden am Anfang einmal erfasst (Liste `pers`: Rolle, Geschlecht, Beziehung,
 *    anwesend, verletzt). Spätere Schritte fragen je Person nur, was zu ihr passt (Zustand, Verletzungen,
 *    Rettungswagen, Belehrung, Schilderung).
 *  - Sachverhalt: 1 Einsatzanlass · 2 Eintreffsituation · 3 Tatörtlichkeit und Umstände vor Ort ·
 *    4 Schilderungen · 5 Gefahrenprognose · 6 Maßnahmen · 7 Abschluss.
 *    Dazu: Begründung der Verfügung (§ 34a PolG NRW), Kurzfassung, „Noch zu erledigen“, Personalien.
 *  - Grundsatz: Im Text steht nur, was angetippt oder eingetragen wurde. Fehlt etwas, steht dort ein
 *    [Platzhalter]. Kein Satz unterstellt etwas, das nicht bestätigt ist.
 *  - Sprache: im Sachverhalt „Geschädigte/r“ und „Beschuldigte/r“, in der Begründung der Verfügung
 *    „gefährdete Person“ und „Betroffene/r“. „Täter“ steht in keinem erzeugten Text.
 *
 * Fachliche Grundlagen: § 34a PolG NRW (14 Tage seit 13.12.2025), §§ 35, 41–44, 51–56, 61 PolG NRW,
 * §§ 28, 37, 41, 43 VwVfG NRW, §§ 3, 5, 8 LZG NRW i. V. m. §§ 177–181 ZPO, §§ 52, 55, 57, 68, 68b, 81b,
 * 81c, 136, 163, 163a, 168b, 406i StPO, Broschüre „Häusliche Gewalt und polizeiliches Handeln“
 * (IM NRW 2007, über Nr. 34a.0 VV PolG NRW), OVG NRW 5 A 3548/20, Greuel u. a. (LKA NRW 2010).
 * Der Runderlass vom 01.03.2024 (VS) ist nicht eingearbeitet. Details und Grenzen: docs/HG-MASTERPLAN.md.
 */
(function (root) {
  'use strict';

  /* ======================= Kleine Helfer ======================= */
  const CORE = root.WVUF_CORE || {};
  const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const str = v => (v == null ? '' : String(v)).trim();
  const has = v => str(v) !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const inc = (d, k, v) => arr(get(d, k)).includes(v);
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const endDot = s => { s = str(s); if (!s) return ''; return /[.!?:“"]$/.test(s) ? s : s + '.'; };
  const slot = CORE.slot || (v => str(v).replace(/\s+/g, ' ').replace(/[\s.;,:]+$/, ''));
  /** Aufzählung „a, b und c“. Ist das letzte Glied ein Freitext, der selbst „und“ enthält, wird nur mit Komma gereiht. */
  const joinList = (list, word = 'und') => { const a = list.filter(x => has(x)); if (!a.length) return ''; if (a.length === 1) return String(a[0]); const last = a[a.length - 1]; if (last && last.frei && /\sund\s/.test(last)) return a.join(', '); return a.slice(0, -1).join(', ') + ' ' + word + ' ' + last; };
  const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const fmtTime = t => (has(t) ? str(t) + ' Uhr' : '');
  const PH = s => `[${s}]`;
  const um = t => (has(t) ? ' um ' + fmtTime(t) : '');
  const addDays = (iso, n) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); if (!m) return ''; const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)); const p = x => String(x).padStart(2, '0'); return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`; };
  const weekday = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; };
  const hasObj = o => o && typeof o === 'object' && Object.keys(o).some(k => { const v = o[k]; return Array.isArray(v) ? v.length : v && typeof v === 'object' ? hasObj(v) : has(v); });
  const val = (v, x) => (typeof v === 'function' ? v(x) : v);
  const pick = (map, keys, x) => keys.map(k => val(map[k], x)).filter(Boolean);
  const mit = (list, frei) => { if (!has(frei)) return list; const f = new String(slot(frei)); f.frei = true; return [...list, f]; };
  const satz = v => (has(v) ? endDot(cap(str(v).replace(/\s+/g, ' '))) : '');
  const O = map => Object.entries(map).map(([k, v]) => [k, typeof v === 'string' ? cap(v) : v]);

  /* ======================= Personen & Grammatik ======================= */
  // [Nominativ, Dativ, Akkusativ, Genitiv]; zwei Sprachebenen: Strafverfahren (gs/bs) und Verfügung (gp/bt)
  const NOUN = {
    gs: { m: ['der Geschädigte', 'dem Geschädigten', 'den Geschädigten', 'des Geschädigten'], w: ['die Geschädigte', 'der Geschädigten', 'die Geschädigte', 'der Geschädigten'], d: ['die geschädigte Person', 'der geschädigten Person', 'die geschädigte Person', 'der geschädigten Person'] },
    bs: { m: ['der Beschuldigte', 'dem Beschuldigten', 'den Beschuldigten', 'des Beschuldigten'], w: ['die Beschuldigte', 'der Beschuldigten', 'die Beschuldigte', 'der Beschuldigten'], d: ['die beschuldigte Person', 'der beschuldigten Person', 'die beschuldigte Person', 'der beschuldigten Person'] },
    zeuge: { m: ['der Zeuge', 'dem Zeugen', 'den Zeugen', 'des Zeugen'], w: ['die Zeugin', 'der Zeugin', 'die Zeugin', 'der Zeugin'], d: ['die Zeugenperson', 'der Zeugenperson', 'die Zeugenperson', 'der Zeugenperson'] },
    gp: { all: ['die gefährdete Person', 'der gefährdeten Person', 'die gefährdete Person', 'der gefährdeten Person'] },
    bt: { m: ['der Betroffene', 'dem Betroffenen', 'den Betroffenen', 'des Betroffenen'], w: ['die Betroffene', 'der Betroffenen', 'die Betroffene', 'der Betroffenen'], d: ['die betroffene Person', 'der betroffenen Person', 'die betroffene Person', 'der betroffenen Person'] }
  };
  const PRON = { m: ['er', 'ihm', 'ihn', 'sein'], w: ['sie', 'ihr', 'sie', 'ihr'], d: ['sie', 'ihr', 'sie', 'ihr'], n: ['es', 'ihm', 'es', 'sein'] };
  const plist = d => arr(get(d, 'pers'));
  const isP = p => !!p && typeof p === 'object' && has(p.rolle);
  const ofRole = (d, r) => plist(d).map((p, i) => ({ p, i })).filter(y => isP(y.p) && y.p.rolle === r);
  const gOf = p => (p && (p.geschlecht === 'w' || p.geschlecht === 'm') ? p.geschlecht : 'd');

  /** Personenreferenz mit Fällen und Pronomen. Mehrere gleicher Rolle: „die Geschädigte zu 1“, „die Zeugin Z 02“, „Kind 2“. */
  function ref(d, i, o = {}) {
    const p = i >= 0 ? (plist(d)[i] || {}) : { rolle: o.role || 'gs' };
    const r = p.rolle;
    const same = i >= 0 ? ofRole(d, r) : [];
    const n = same.findIndex(y => y.i === i) + 1, many = same.length > 1;
    const kl = get(d, 'meta.klarnamen') === 'ja' && !o.vfg;
    const g = gOf(p);
    let f, pr;
    if (r === 'kind') {
      const vn = kl && has(get(p, 'p.vorname')) ? str(get(p, 'p.vorname')) : '';
      if (vn) { f = [vn, vn, vn, vn]; pr = PRON[g === 'd' ? 'n' : g]; }
      else if (many) { const t = `Kind ${n}`; f = [t, t, t, t]; pr = PRON.n; }
      else { f = ['das Kind', 'dem Kind', 'das Kind', 'des Kindes']; pr = PRON.n; }
    } else {
      const role = o.vfg ? ({ gs: 'gp', bs: 'bt' }[r] || r) : r;
      const base = (NOUN[role] || NOUN.gs).all || (NOUN[role] || NOUN.gs)[g];
      const suf = many ? (r === 'zeuge' ? ` Z ${String(n).padStart(2, '0')}` : ` zu ${n}`) : '';
      f = base.map(s => s + suf);
      pr = role === 'gp' ? PRON.w : PRON[g];
    }
    const name = kl && r !== 'kind' && has(get(p, 'p.nachname')) ? [g === 'w' ? 'Frau' : g === 'm' ? 'Herr' : '', str(get(p, 'p.vorname')), str(get(p, 'p.nachname'))].filter(Boolean).join(' ') : '';
    return {
      i, p, r, g, n, many, name, d,
      nom: f[0], dat: f[1], akk: f[2], gen: f[3], Nom: cap(f[0]), Dat: cap(f[1]), Akk: cap(f[2]),
      er: pr[0], ihm: pr[1], ihn: pr[2], sein: pr[3], Er: cap(pr[0]), Ihm: cap(pr[1]), Sein: cap(pr[3]),
      First: cap(f[0]) + (name ? `, ${name},` : '')
    };
  }
  const main = (d, r, o = {}) => { const y = ofRole(d, r)[0]; return ref(d, y ? y.i : -1, { ...o, role: r }); };
  const ErP = it => (it && it.rolle === 'kind' ? 'Es' : cap(PRON[gOf(it)][0]));
  const erP = it => ErP(it).toLowerCase();
  const seinP = it => (it && it.rolle === 'kind' ? 'sein' : PRON[gOf(it)][3]);
  const ihnP = it => (it && it.rolle === 'kind' ? 'es' : PRON[gOf(it)][2]);
  const bsNom = d => main(d, 'bs').nom;
  const ErBs = d => main(d, 'bs').Er, erBs = d => main(d, 'bs').er, seinBs = d => main(d, 'bs').sein;
  const gsGen = d => main(d, 'gs').gen;

  /* Beziehung zur beschuldigten Person und Zeugnisverweigerungsrecht (§ 52 Abs. 1 StPO) */
  const ZVR_JA = /(ehe(frau|mann|gatt|partner)|verlob|lebenspartner|mutter|vater|eltern|tochter|sohn|schwester|bruder|enkel|onkel|tante|neffe|nichte|schwieger|schwager|schwägerin|stief|adoptiv)/i;
  const ZVR_NEIN = /(lebensgef|partner|freund|mitbewohn|nachbar|bekannt|besuch|kolleg|vermiet|passant)/i;
  const zvrOf = bez => { const b = str(bez); if (!b) return null; if (ZVR_JA.test(b)) return true; if (ZVR_NEIN.test(b)) return false; return null; };
  const zvrNr = bez => { const b = str(bez).toLowerCase(); if (/verlob/.test(b)) return '1'; if (/lebenspartner/.test(b)) return '2a'; if (/ehe/.test(b)) return '2'; return ZVR_JA.test(b) ? '3' : ''; };
  const BEZ = {
    w: [['Ehefrau', 'Ehefrau'], ['Lebensgefährtin', 'Lebensgefährtin'], ['Verlobte', 'Verlobte'], ['frühere Ehefrau', 'frühere Ehefrau'], ['frühere Partnerin', 'frühere Partnerin'], ['Mutter', 'Mutter'], ['Tochter', 'Tochter'], ['Schwester', 'Schwester'], ['Großmutter', 'Großmutter'], ['Mitbewohnerin', 'Mitbewohnerin']],
    m: [['Ehemann', 'Ehemann'], ['Lebensgefährte', 'Lebensgefährte'], ['Verlobter', 'Verlobter'], ['früherer Ehemann', 'früherer Ehemann'], ['früherer Partner', 'früherer Partner'], ['Vater', 'Vater'], ['Sohn', 'Sohn'], ['Bruder', 'Bruder'], ['Großvater', 'Großvater'], ['Mitbewohner', 'Mitbewohner']],
    d: [['Ehepartner', 'Ehepartner'], ['Lebensgefährte', 'Lebensgefährte'], ['Elternteil', 'Elternteil'], ['Kind', 'Kind'], ['Geschwister', 'Geschwister']]
  };
  const BEZ_Z = {
    w: [['Nachbarin', 'Nachbarin'], ['Mutter', 'Mutter'], ['Schwester', 'Schwester'], ['Tochter', 'Tochter'], ['Bekannte', 'Bekannte'], ['Passantin', 'Passantin']],
    m: [['Nachbar', 'Nachbar'], ['Vater', 'Vater'], ['Bruder', 'Bruder'], ['Sohn', 'Sohn'], ['Bekannter', 'Bekannter'], ['Passant', 'Passant']],
    d: [['Nachbar/in', 'Nachbar/in'], ['Angehörige/r', 'Angehörige/r'], ['Bekannte/r', 'Bekannte/r']]
  };
  const KBEZ = { gemeinsam: { w: 'gemeinsame Tochter', m: 'gemeinsamer Sohn', d: 'gemeinsames Kind' }, gs: { w: 'Tochter', m: 'Sohn', d: 'Kind' }, bs: { w: 'Tochter', m: 'Sohn', d: 'Kind' } };
  const KBEZ_UI = { gemeinsam: 'gemeinsames Kind', gs: 'Kind der geschädigten Person', bs: 'Kind der beschuldigten Person', anders: 'anderes' };
  /** Beschreibung eines Kindes für den Text: „gemeinsame Tochter, 6 Jahre“. */
  function kdesc(d, p, x) {
    const g = gOf(p), t = [];
    if (p.kbez === 'gemeinsam') t.push(KBEZ.gemeinsam[g]);
    else if (p.kbez === 'gs') t.push(`${KBEZ.gs[g]} ${x ? x.G.gen : gsGen(d)}`);
    else if (p.kbez === 'bs') t.push(`${KBEZ.bs[g]} ${x ? x.T.gen : main(d, 'bs').gen}`);
    else if (p.kbez === 'anders' && has(p.kbezText)) t.push(slot(p.kbezText));
    if (has(p.alter)) t.push(`${p.alter} ${Number(p.alter) === 1 ? 'Jahr' : 'Jahre'}`);
    return t.join(', ');
  }
  const ROLLE_UI = { gs: { w: 'Geschädigte', m: 'Geschädigter', d: 'Geschädigte Person' }, bs: { w: 'Beschuldigte', m: 'Beschuldigter', d: 'Beschuldigte Person' }, zeuge: { w: 'Zeugin', m: 'Zeuge', d: 'Zeugenperson' }, kind: { w: 'Kind (Mädchen)', m: 'Kind (Junge)', d: 'Kind' } };
  /** Kopfzeile einer Personenkarte: „Geschädigte · Ehefrau“, „Kind (Mädchen) · gemeinsames Kind, 6 J.“ */
  function pl(it, i) {
    if (!isP(it)) return `Person ${i + 1}`;
    const r = (ROLLE_UI[it.rolle] || {})[gOf(it)] || 'Person';
    const z = [it.rolle === 'kind' ? (KBEZ_UI[it.kbez] || '') : str(it.bez), has(it.alter) ? `${it.alter} J.` : '', str(get(it, 'p.nachname'))].filter(Boolean);
    return r + (z.length ? ' · ' + z.join(', ') : '');
  }

  /* ======================= Weichen ======================= */
  const bsY = d => ofRole(d, 'bs')[0] || null;
  const bsDa = d => { const y = bsY(d); return !!y && y.p.da === 'ja'; };
  const bsWeg = d => { const y = bsY(d); return !!y && y.p.da === 'nein'; };
  const kinderL = d => ofRole(d, 'kind');
  const kinderDa = d => kinderL(d).length > 0;
  const verletzte = d => plist(d).map((p, i) => ({ p, i })).filter(y => isP(y.p) && y.p.verletzt === 'ja');
  const nurVerbal = d => { const g = arr(get(d, 'lage.gewalt')); return g.length > 0 && !has(get(d, 'lage.gewaltFrei')) && g.every(x => ['verbal', 'sache'].includes(x)); };
  const zutrittGegen = d => ['verweigert', 'niemand'].includes(get(d, 'zutritt.art'));
  const wvJa = d => get(d, 'wv.angeordnet') === 'ja';
  const wvNein = d => get(d, 'wv.angeordnet') === 'nein';
  const gewahrsam = d => bsDa(d) && get(d, 'er.verlassen') === 'gewahrsam';
  const zwang = d => bsDa(d) && ['zwang', 'gewahrsam'].includes(get(d, 'er.verlassen'));
  const wvTag = d => str(get(d, 'wv.datum')) || str(get(d, 'einsatz.datum'));
  const wvEnde = d => str(get(d, 'wv.ende')) || addDays(wvTag(d), 14);
  const wvMax = d => addDays(wvEnde(d), 14);
  const istNacht = (iso, t) => { const h = /^(\d{2}):/.exec(str(t)); return (h && (+h[1] >= 21 || +h[1] < 6)) || weekday(iso) === 0; };
  const nachtEr = d => istNacht(wvTag(d), str(get(d, 'er.schriftZeit')) || str(get(d, 'er.zeit')) || str(get(d, 'wv.zeit')));
  const nachtAbw = d => istNacht(wvTag(d), str(get(d, 'abw.zustZeit')) || str(get(d, 'wv.zeit')));
  const angehoerig = it => it && (it.bel === '52' || zvrOf(it.bez) === true);

  /* ======================= Auswahllisten (Wert → Textbaustein) ======================= */
  const GEWALT = { koerper: 'körperliche Gewalt', sexuell: 'sexuelle Gewalt', drohung: 'Bedrohung', freiheit: 'Festhalten oder Einsperren', verbal: 'verbaler Streit', sache: 'Sachbeschädigung' };
  const WAHRN = { laut: 'eine lautstarke Auseinandersetzung', schreie: 'Schreie', hilfe: 'Hilferufe', poltern: 'Poltern bzw. Kampfgeräusche', weinen: 'Weinen', kinder: 'weinende Kinder' };
  const WAHRN_PL = { schreie: 1, hilfe: 1, poltern: 1, kinder: 1 };
  const TATSACHEN = { schreie: 'aus der Wohnung waren Schreie zu hören', hilfe: 'aus der Wohnung waren Hilferufe zu hören', poltern: 'aus der Wohnung waren Poltern und Kampfgeräusche zu hören', nachbarn: 'Nachbarn berichteten von einer andauernden Auseinandersetzung', notruf: 'nach dem Inhalt des Notrufs dauerte der Übergriff an', zweite: 'die zweite gemeldete Person war nicht zu sehen', kind: 'in der Wohnung weinte hörbar ein Kind', blut: 'an der Tür bzw. im Eingangsbereich war Blut zu sehen' };
  const WO = { tuer: 'an der Wohnungstür', wohnung: 'in der Wohnung', treppenhaus: 'im Treppenhaus', draussen: 'vor dem Haus', nachbarn: 'in einer Nachbarwohnung', fahrzeug: 'in einem Fahrzeug' };
  const ZUST = {
    gs: { weint: 'weinte', angst: 'wirkte verängstigt', aufgeloest: 'wirkte aufgelöst', zittert: 'zitterte', apathisch: 'wirkte apathisch und abwesend', atem: 'war außer Atem', blutet: 'blutete', kleidung: 'trug zerrissene bzw. in Unordnung geratene Kleidung', ruhig: 'wirkte ruhig und gefasst', aufgebracht: 'war aufgebracht', aggressiv: 'verhielt sich aggressiv' },
    bs: { ruhig: 'verhielt sich ruhig', kooperativ: 'verhielt sich kooperativ', aufgebracht: 'war aufgebracht', aggressiv: 'verhielt sich aggressiv', laut: 'schrie und war nur schwer zu beruhigen', uneinsichtig: 'zeigte sich uneinsichtig', drohend: 'sprach in Gegenwart der Einsatzkräfte Drohungen aus', angriff: x => `versuchte, zu ${x.G.dat} zu gelangen`, provokant: 'verhielt sich provozierend', atem: 'war außer Atem und verschwitzt', kleidung: 'trug in Unordnung geratene Kleidung' },
    zeuge: { ruhig: 'wirkte ruhig', aufgeregt: 'wirkte aufgeregt', angst: 'wirkte verängstigt', weint: 'weinte' },
    kind: { unauffaellig: 'wirkte unauffällig', angst: 'wirkte verängstigt', weint: 'weinte', verstoert: 'wirkte verstört', schlief: 'schlief', versteckt: 'hatte sich versteckt', schutz: x => `suchte Schutz bei ${x.G.dat}`, verletzt: 'war verletzt' }
  };
  const ZUST_UI = {
    gs: [['weint', 'Weinte'], ['angst', 'Verängstigt'], ['aufgeloest', 'Aufgelöst'], ['zittert', 'Zitterte'], ['apathisch', 'Apathisch'], ['atem', 'Außer Atem'], ['blutet', 'Blutete'], ['kleidung', 'Kleidung zerrissen / in Unordnung'], ['ruhig', 'Ruhig, gefasst'], ['aufgebracht', 'Aufgebracht'], ['aggressiv', 'Aggressiv']],
    bs: [['ruhig', 'Ruhig'], ['kooperativ', 'Kooperativ'], ['aufgebracht', 'Aufgebracht'], ['aggressiv', 'Aggressiv'], ['laut', 'Schrie, kaum zu beruhigen'], ['uneinsichtig', 'Uneinsichtig'], ['drohend', 'Drohte vor der Polizei'], ['angriff', 'Wollte zur geschädigten Person'], ['provokant', 'Provozierend'], ['atem', 'Außer Atem, verschwitzt'], ['kleidung', 'Kleidung in Unordnung']],
    zeuge: [['ruhig', 'Ruhig'], ['aufgeregt', 'Aufgeregt'], ['angst', 'Verängstigt'], ['weint', 'Weinte']],
    kind: [['unauffaellig', 'Unauffällig'], ['angst', 'Verängstigt'], ['weint', 'Weinte'], ['verstoert', 'Verstört'], ['schlief', 'Schlief'], ['versteckt', 'Hatte sich versteckt'], ['schutz', 'Suchte Schutz bei der geschädigten Person'], ['verletzt', 'Verletzt']]
  };
  const BES = { rausch: x => `${x.Er} war aufgrund ${x.sein}es Zustands nicht in der Lage, Belehrungen und Erklärungen zu folgen.`, sprache: x => `Eine Verständigung mit ${x.dat} in deutscher Sprache war nicht möglich.`, psych: x => `${x.Er} befand sich erkennbar in einer akuten psychischen Krise.`, minder: x => `${x.Er} ist minderjährig.`, betreut: x => `${x.Er} steht nach eigenen Angaben unter rechtlicher Betreuung.` };
  const KONSUM = [['Alkoholgeruch', 'deutlicher Alkoholgeruch in der Atemluft'], ['Aussprache', 'eine verwaschene Aussprache'], ['Gang', 'ein unsicherer Gang'], ['Augen', 'gerötete, glasige Augen'], ['Pupillen', 'auffällig veränderte Pupillen'], ['Reaktion', 'verzögerte Reaktionen'], ['Stimmung', 'starke Stimmungsschwankungen']];
  const VERL = { haematom: 'ein Hämatom', roetung: 'eine Rötung', schwellung: 'eine Schwellung', kratzer: 'Kratzspuren', platzwunde: 'eine Platzwunde', blutung: 'eine blutende Wunde', wuergemale: 'Würgemale am Hals', biss: 'eine Bissverletzung', abwehr: 'Abwehrverletzungen an den Unterarmen', nase: 'Nasenbluten' };
  const RTW_UI = [['vorort', 'Gefragt → RTW angefordert, vor Ort versorgt'], ['kh', 'Gefragt → RTW, ins Krankenhaus'], ['selbst', 'Gefragt → abgelehnt, geht selbst zum Arzt'], ['abgelehnt', 'Gefragt → jede Behandlung abgelehnt'], ['unnoetig', 'Gefragt → nach eigener Angabe nicht nötig'], ['sofort', 'RTW sofort angefordert (Zustand)']];
  const RAUM = { wohnzimmer: 'im Wohnzimmer', kueche: 'in der Küche', schlafzimmer: 'im Schlafzimmer', flur: 'im Flur', bad: 'im Badezimmer', kinderzimmer: 'im Kinderzimmer', draussen: 'außerhalb der Wohnung' };
  const KIND_WO = { wohnung: 'befand sich in der Wohnung', kinderzimmer: 'befand sich im Kinderzimmer', beiGs: x => `befand sich bei ${x.G.dat}`, schlafzimmer: 'befand sich im Schlafzimmer' };
  const SPUREN = { moebel: ['umgestoßene Möbel', 1], scherben: ['zerbrochene Gegenstände', 1], blut: ['Blutanhaftungen', 1], tuer: ['eine beschädigte Tür', 0], wand: ['Beschädigungen an den Wänden', 1], haare: ['ausgerissene Haare', 1], telefon: ['ein beschädigtes Mobiltelefon', 0], waffe: ['ein offen liegendes Messer bzw. ein gefährlicher Gegenstand', 0], flaschen: ['zahlreiche leere Alkoholflaschen', 1] };
  const ORTE = { wohnung: 'die Wohnung', flur: 'den Hausflur und das Treppenhaus', keller: 'den Keller', speicher: 'den Dachboden', garage: 'die Garage bzw. den Stellplatz', garten: 'den Garten', grundstueck: 'das gesamte Grundstück einschließlich der Zuwegung' };
  const VORG_PL = { einsaetze: 1, anzeigen: 1, andere: 1, verstoss: 1 };
  const VORG = { einsaetze: 'frühere Einsätze wegen häuslicher Gewalt an der Anschrift', anzeigen: 'frühere Strafverfahren wegen Gewalt gegen die geschädigte Person', andere: 'Gewaltdelikte gegen andere Personen', wv: 'eine frühere Wohnungsverweisung', gewschg: 'eine gerichtliche Schutzanordnung', verstoss: 'Verstöße gegen frühere Anordnungen', wbk: 'eine waffenrechtliche Erlaubnis bzw. registrierte Waffen' };
  const STUETZEN = { verletzung: 'das festgestellte Verletzungsbild', wohnung: 'den Zustand der Wohnung', zeugen: 'die Angaben unbeteiligter Zeugen', notruf: 'den Inhalt des Notrufs', verhalten: x => `das Verhalten ${x.T.gen} in Gegenwart der Polizei`, spontan: 'die ungefragten Äußerungen beim Eintreffen', einlassung: x => `die eigene Einlassung ${x.T.gen}`, vorerkenntnisse: 'die polizeilichen Vorerkenntnisse', kinder: 'den Zustand der Kinder' };
  const DELIKT = { 223: 'Körperverletzung (§ 223 StGB)', 224: 'gefährlichen Körperverletzung (§ 224 StGB)', 241: 'Bedrohung (§ 241 StGB)', 240: 'Nötigung (§ 240 StGB)', 239: 'Freiheitsberaubung (§ 239 StGB)', 185: 'Beleidigung (§ 185 StGB)', 303: 'Sachbeschädigung (§ 303 StGB)', 177: 'eines sexuellen Übergriffs (§ 177 StGB)', 238: 'Nachstellung (§ 238 StGB)', 4: 'eines Verstoßes gegen eine Schutzanordnung (§ 4 GewSchG)' };
  const DELIKT_TAT = { 223: 'eine Körperverletzung', 224: 'eine gefährliche Körperverletzung', 241: 'eine Bedrohung', 240: 'eine Nötigung', 239: 'eine Freiheitsberaubung', 185: 'eine Beleidigung', 303: 'eine Sachbeschädigung', 177: 'ein sexueller Übergriff', 238: 'eine Nachstellung', 4: 'ein Verstoß gegen eine Schutzanordnung nach dem Gewaltschutzgesetz' };
  const DELIKT_KURZ = { 223: '§ 223 Körperverletzung', 224: '§ 224 gef. KV', 241: '§ 241 Bedrohung', 240: '§ 240 Nötigung', 239: '§ 239 Freiheitsberaubung', 185: '§ 185 Beleidigung', 303: '§ 303 Sachbeschädigung', 177: '§ 177 sex. Übergriff', 238: '§ 238 Nachstellung', 4: '§ 4 GewSchG' };
  const MODUS = [['jetzt', 'Jetzt eintragen'], ['folgt', 'Text folgt (Platzhalter)'], ['keine', 'Keine Angaben']];

  /* Belehrungsinhalte – Zeugen (§§ 52, 55, 57, 68, 68b, 81c StPO) und Beschuldigte (§ 163a Abs. 4, § 136 Abs. 1 StPO) */
  const BEL_Z = { zvr: 'Zeugnisverweigerungsrecht (§ 52)', widerruf: 'Verzicht jederzeit widerrufbar', auskunft: 'Auskunftsverweigerungsrecht (§ 55)', wahrheit: 'Wahrheitspflicht, falsche Verdächtigung', beistand: 'Zeugenbeistand (§ 68b)', anschrift: 'Andere ladungsfähige Anschrift (§ 68 Abs. 2)', untersuchung: 'Weigerung Untersuchung / Lichtbilder (§ 81c Abs. 3)' };
  const BEL_B = { tat: 'Tatvorwurf eröffnet', schweigen: 'Aussagefreiheit', verteidiger: 'Verteidiger – jederzeit, auch vorher', notdienst: 'Kontaktdaten, anwaltlicher Notdienst', beweis: 'Beweisanträge', pflicht: 'Pflichtverteidiger (§ 140), Kostenfolge', schriftlich: 'Schriftliche Äußerung möglich', toa: 'Täter-Opfer-Ausgleich', dolmetscher: 'Unentgeltlicher Dolmetscher' };
  const BEL_B_STD = ['tat', 'schweigen', 'verteidiger', 'notdienst', 'beweis', 'pflicht'];
  const belZStd = it => (it.bel === '52' ? ['zvr', 'widerruf', 'auskunft', 'wahrheit', 'beistand'] : ['auskunft', 'wahrheit', 'beistand']).concat(it.verletzt === 'ja' && it.bel === '52' ? ['untersuchung'] : []);
  const belOpts = it => (it.bel === 'bs' ? O(BEL_B) : it.bel === '52' ? O(BEL_Z) : O(BEL_Z).filter(([k]) => !['zvr', 'widerruf', 'untersuchung'].includes(k)));
  const ANH = { vorwurf: 'Vorwürfe zum heutigen Geschehen', frueher: 'Auch frühere Vorfälle', massnahme: 'Beabsichtigte Maßnahme mit Bereich und Dauer', freiwillig: 'Hinweis: Äußerung freiwillig', verwertung: 'Hinweis: auch im Strafverfahren verwendbar', unterkunft: 'Gefragt: Unterkunft', bindung: 'Gefragt: Bindung an die Wohnung (Beruf, Pflege)', einwand: 'Gefragt: Einwände gegen Bereich und Dauer' };
  const ANH_STD = Object.keys(ANH);
  const ER = { anordnung: 'Maßnahme und Rechtsgrundlage eröffnet', bereich: 'Bereich genau bezeichnet', dauer: 'Ende (Datum) genannt', verlaengerung: 'Verlängerung bei Gerichtsantrag erklärt', gruende: 'Gründe (Gefahrenprognose) erläutert', polizei: 'Erklärt: Schutz unabhängig von Wille und Mietvertrag', einverstaendnis: 'Gilt auch bei Einverständnis der gefährdeten Person', verlassen: 'Aufgefordert, sofort zu gehen', gegenst: 'Gegenstände des persönlichen Bedarfs mitnehmen lassen', anschrift: 'Zustellanschrift erfragt (§ 34a Abs. 3)', schluessel: 'Herausgabe aller Schlüssel verlangt', zg: 'Zwangsgeld angedroht', ersatzhaft: 'Auf Ersatzzwangshaft hingewiesen', gewahrsam: 'Auf Gewahrsam bei Verstoß hingewiesen', rechtsbehelf: 'Klage / sofortige Vollziehbarkeit erklärt', obdach: 'Auf Hilfe bei der Unterkunft hingewiesen', beratung: 'Auf Beratung für gewaltausübende Personen hingewiesen', verstanden: 'Hat erklärt, alles verstanden zu haben' };
  const ER_STD = ['anordnung', 'bereich', 'dauer', 'verlaengerung', 'gruende', 'polizei', 'einverstaendnis', 'verlassen', 'gegenst', 'anschrift', 'schluessel', 'zg', 'ersatzhaft', 'gewahrsam', 'rechtsbehelf'];
  const OS = { gewschg: 'Zivilgerichtlicher Schutz (GewSchG) erklärt', beratung: 'Beratungsstelle benannt', daten: 'Weitergabe der Kontaktdaten angeboten (§ 34a Abs. 4)', doku: 'Kopie der Einsatzdokumentation ausgehändigt', merkblatt: 'Merkblatt / Opferschutzbroschüre übergeben', stpo: 'Verletztenrechte (§§ 406i ff. StPO) erklärt', amtswegen: 'Verfolgung von Amts wegen erklärt', notruf: 'Bei Rückkehr sofort 110', schloss: 'Schlosswechsel empfohlen', getrennt: 'Hinweise ohne Beisein der beschuldigten Person' };
  const OS_STD = ['gewschg', 'beratung', 'daten', 'doku', 'merkblatt', 'stpo', 'notruf'];

  /* ======================= Gefahrenprognose: Umstände (festgestellt / geschildert / angenommen) ======================= */
  const FAK_GRUPPEN = [['tat', 'Heutiges Geschehen'], ['vor', 'Vorgeschichte und Beziehung'], ['dro', 'Drohungen und Ankündigungen'], ['lage', 'Lebenslage'], ['bsp', 'Beschuldigte Person'], ['opf', 'Sicht der gefährdeten Person']];
  const FAK = [
    { k: 'wuergen', g: 'tat', l: 'Würgen / Angriff gegen den Hals', fest: x => `Am Hals ${x.G.gen} wurden Spuren festgestellt, die auf einen Angriff gegen den Hals hindeuten.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} ${x.G.ihn} gewürgt bzw. am Hals gepackt.`, annahme: x => `Es bestehen Anhaltspunkte dafür, dass ${x.G.nom} am Hals angegriffen wurde.`, bed: 'Angriffe gegen den Hals gelten als deutlicher Hinweis auf ein erhöhtes Risiko schwerer und lebensbedrohlicher Gewalt; ihre Folgen können zudem verzögert auftreten.', weil: () => 'es zu einem Angriff gegen den Hals gekommen ist' },
    { k: 'kopf', g: 'tat', l: 'Schläge oder Tritte gegen den Kopf', fest: x => `Das Verletzungsbild ${x.G.gen} spricht für Schläge oder Tritte gegen den Kopf.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} ${x.G.ihn} gegen den Kopf geschlagen oder getreten.`, annahme: x => `Es bestehen Anhaltspunkte für Schläge oder Tritte gegen den Kopf ${x.G.gen}.`, bed: 'Schläge und Tritte gegen den Kopf können schwere, auch lebensgefährliche Verletzungen verursachen.', weil: () => 'der Angriff gegen den Kopf gerichtet war' },
    { k: 'waffe', g: 'tat', l: 'Waffe oder gefährlicher Gegenstand', fest: () => 'Am Einsatzort wurde ein gefährlicher Gegenstand vorgefunden, der im Zusammenhang mit dem Geschehen steht.', angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} eine Waffe oder einen gefährlichen Gegenstand eingesetzt oder damit gedroht.`, annahme: () => 'Es bestehen Anhaltspunkte dafür, dass bei dem Geschehen ein gefährlicher Gegenstand eingesetzt oder damit gedroht wurde.', bed: 'Der Einsatz von oder die Drohung mit Waffen und gefährlichen Gegenständen zeigt eine erhebliche Gewaltbereitschaft und erhöht das Risiko schwerer Verletzungen.', weil: () => 'eine Waffe bzw. ein gefährlicher Gegenstand im Spiel war' },
    { k: 'behandlung', g: 'tat', l: 'Verletzungen mit Behandlungsbedarf', fest: x => `${x.G.Nom} erlitt Verletzungen, die medizinisch versorgt werden mussten.`, angabe: x => `Nach Angaben ${x.G.gen} seien die Verletzungen ärztlich behandlungsbedürftig.`, annahme: x => `Es ist davon auszugehen, dass die Verletzungen ${x.G.gen} ärztlicher Behandlung bedürfen.`, bed: 'Die Schwere der Verletzungen belegt die Intensität des Angriffs.', weil: () => 'der Angriff zu behandlungsbedürftigen Verletzungen geführt hat' },
    { k: 'sexuell', g: 'tat', l: 'Sexuelle Gewalt', fest: () => 'Es wurden Umstände festgestellt, die auf sexuelle Gewalt hindeuten.', angabe: x => `Nach Angaben ${x.G.gen} sei es auch zu sexueller Gewalt gekommen.`, annahme: () => 'Es bestehen Anhaltspunkte für sexuelle Gewalt.', bed: 'Sexuelle Gewalt in der Beziehung ist Ausdruck massiver Grenzüberschreitung und gilt als Risikofaktor für weitere schwere Gewalt.', weil: () => 'auch sexuelle Gewalt im Raum steht' },
    { k: 'einsperren', g: 'tat', l: 'Festgehalten, eingesperrt', fest: x => `Festgestellt wurde, dass ${x.G.nom} am Verlassen der Wohnung gehindert worden war.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} ${x.G.ihn} festgehalten bzw. am Verlassen der Wohnung gehindert.`, annahme: x => `Es bestehen Anhaltspunkte dafür, dass ${x.G.nom} am Verlassen der Wohnung gehindert wurde.`, bed: 'Das Festhalten und Einsperren zeigt den Versuch, die gefährdete Person vollständig zu kontrollieren, und nimmt ihr die Möglichkeit, sich zu entziehen.', weil: x => `${x.G.nom} am Verlassen der Wohnung gehindert wurde` },
    { k: 'notruf', g: 'tat', l: 'Hilferuf verhindert, Telefon weggenommen', fest: x => `Festgestellt wurde, dass das Mobiltelefon ${x.G.gen} weggenommen oder beschädigt worden war.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} ${x.G.ihn} daran gehindert, Hilfe zu rufen, bzw. ${x.G.sein} Telefon weggenommen.`, annahme: x => `Es bestehen Anhaltspunkte dafür, dass ${x.G.nom} am Herbeirufen von Hilfe gehindert wurde.`, bed: 'Wer das Herbeirufen von Hilfe verhindert, nimmt der gefährdeten Person die Möglichkeit, sich selbst zu schützen.', weil: x => `${x.G.nom} daran gehindert wurde, Hilfe zu holen` },
    { k: 'kinder', g: 'tat', l: 'Kinder anwesend bzw. mitbetroffen', fest: () => 'Beim Eintreffen der Einsatzkräfte befanden sich Kinder in der Wohnung.', angabe: x => `Nach Angaben ${x.G.gen} hätten Kinder das Geschehen miterlebt.`, annahme: () => 'Es ist davon auszugehen, dass die Kinder das Geschehen miterlebt haben.', bed: 'Kinder, die Gewalt zwischen Erwachsenen miterleben, sind in ihrem Wohl gefährdet; ohne räumliche Trennung wären sie weiterer Gewalt ausgesetzt.', weil: () => 'auch die im Haushalt lebenden Kinder betroffen sind' },
    { k: 'kindergewalt', g: 'tat', l: 'Gewalt auch gegen Kinder', fest: () => 'Bei einem Kind wurden Verletzungen festgestellt.', angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} auch gegenüber Kindern Gewalt ausgeübt.`, annahme: () => 'Es bestehen Anhaltspunkte für Gewalt auch gegenüber Kindern.', bed: 'Gewalt gegen Kinder erhöht das Risiko für alle Personen im Haushalt erheblich.', weil: () => 'sich die Gewalt auch gegen Kinder richtet' },
    { k: 'schwanger', g: 'tat', l: 'Schwangerschaft der gefährdeten Person', fest: x => `${x.G.Nom} ist erkennbar schwanger.`, angabe: x => `${x.G.Nom} gab an, schwanger zu sein.`, annahme: x => `Es ist von einer Schwangerschaft ${x.G.gen} auszugehen.`, bed: 'Gewalt in der Schwangerschaft gilt als Risikofaktor für schwere Gewalt und gefährdet zugleich das ungeborene Kind.', weil: x => `${x.G.nom} schwanger ist` },
    { k: 'frueher', g: 'vor', l: 'Frühere Übergriffe', fest: x => `Frühere Übergriffe ${x.T.gen} gegen ${x.G.akk} sind polizeilich belegt.`, angabe: x => `Nach Angaben ${x.G.gen} sei es bereits früher zu Übergriffen gekommen.`, annahme: () => 'Es ist davon auszugehen, dass es bereits früher zu Übergriffen gekommen ist.', bed: 'Wiederholte Übergriffe sind der zentrale Hinweis auf eine Gewaltbeziehung, in der jederzeit mit weiteren Taten zu rechnen ist.', weil: () => 'es bereits wiederholt zu Übergriffen gekommen ist' },
    { k: 'zunahme', g: 'vor', l: 'Gewalt nimmt zu (häufiger, schwerer)', fest: () => 'Die polizeilichen Erkenntnisse zeigen eine Zunahme von Häufigkeit oder Schwere der Übergriffe.', angabe: x => `Nach Angaben ${x.G.gen} hätten die Übergriffe zuletzt an Häufigkeit oder Schwere zugenommen.`, annahme: () => 'Es ist von einer Zunahme der Gewalt auszugehen.', bed: 'Eine Zunahme der Gewalt in Häufigkeit oder Schwere gilt als einer der deutlichsten Hinweise auf eine weitere Eskalation.', weil: () => 'die Gewalt zuletzt zugenommen hat' },
    { k: 'verstoss', g: 'vor', l: 'Verstöße gegen frühere Anordnungen', fest: x => `${x.T.Nom} hat nach polizeilichen Erkenntnissen bereits gegen frühere Schutzanordnungen oder ein Rückkehrverbot verstoßen.`, angabe: x => `Nach Angaben ${x.G.gen} habe sich ${x.T.nom} früher nicht an Anordnungen gehalten.`, annahme: x => `Es ist davon auszugehen, dass sich ${x.T.nom} an Absprachen und Anordnungen nicht hält.`, bed: 'Frühere Verstöße lassen erwarten, dass mildere Mittel und bloße Absprachen nicht eingehalten werden.', weil: x => `${x.T.nom} sich schon früher nicht an Anordnungen gehalten hat` },
    { k: 'gewaltandere', g: 'vor', l: 'Gewalt auch gegen andere Personen', fest: x => `${x.T.Nom} ist polizeilich wegen Gewaltdelikten auch gegenüber anderen Personen bekannt.`, angabe: x => `Nach Angaben ${x.G.gen} sei ${x.T.nom} auch gegenüber anderen Personen gewalttätig gewesen.`, annahme: x => `Es ist von einer allgemein erhöhten Gewaltbereitschaft ${x.T.gen} auszugehen.`, bed: 'Gewalt auch außerhalb der Beziehung zeigt eine generell niedrige Hemmschwelle.', weil: x => `${x.T.nom} auch sonst gewaltbereit ist` },
    { k: 'kontrolle', g: 'vor', l: 'Kontrolle, Eifersucht, Nachstellung', fest: x => `Festgestellt wurde ein ausgeprägtes Kontrollverhalten ${x.T.gen} gegenüber ${x.G.dat}.`, angabe: x => `Nach Angaben ${x.G.gen} kontrolliere ${x.T.nom} ${x.G.ihn} stark, sei ausgeprägt eifersüchtig oder stelle ${x.G.ihm} nach.`, annahme: x => `Es bestehen Anhaltspunkte für ein ausgeprägtes Kontrollverhalten ${x.T.gen}.`, bed: 'Exzessives Kontrollverhalten, Eifersucht und Nachstellung gelten als Risikofaktoren für eine schwere Eskalation, besonders im Zusammenhang mit einer Trennung.', weil: x => `${x.T.nom} ${x.G.akk} stark kontrolliert` },
    { k: 'trennung', g: 'vor', l: 'Trennung oder Trennungsabsicht', fest: () => 'Die Beteiligten leben getrennt bzw. befinden sich in Trennung.', angabe: x => `Nach Angaben ${x.G.gen} befinde sich die Beziehung in einer Trennungssituation.`, annahme: () => 'Es ist von einer Trennungssituation auszugehen.', bed: 'Trennungsphasen gelten als besonders gefährlich; ein großer Teil schwerer Gewalt und der Tötungsdelikte in Paarbeziehungen steht im Zusammenhang mit einer Trennung.', weil: () => 'sich die Beziehung in einer Trennungssituation befindet' },
    { k: 'kinderstreit', g: 'vor', l: 'Streit um Kinder, Umgang, Sorgerecht', fest: () => 'Zwischen den Beteiligten besteht ein Streit um die Kinder, den Umgang oder das Sorgerecht.', angabe: x => `Nach Angaben ${x.G.gen} bestehe zwischen den Beteiligten Streit um die Kinder, den Umgang oder das Sorgerecht.`, annahme: () => 'Es ist von einem Konflikt um die Kinder auszugehen.', bed: 'Konflikte um Kinder und Umgang schaffen fortlaufend neue Anlässe für Kontakt und Streit.', weil: () => 'zwischen den Beteiligten Streit um die Kinder besteht' },
    { k: 'tod', g: 'dro', l: 'Todesdrohung', fest: x => `In Gegenwart der Einsatzkräfte drohte ${x.T.nom}, ${x.G.akk} zu töten.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} gedroht, ${x.G.ihn} umzubringen.`, annahme: x => `Es ist davon auszugehen, dass ${x.T.nom} mit dem Tod gedroht hat.`, bed: 'Todesdrohungen gelten als Warnsignal für eine Eskalation bis hin zu Tötungsdelikten und sind ernst zu nehmen.', weil: x => `${x.T.nom} mit dem Tod gedroht hat` },
    { k: 'suizid', g: 'dro', l: 'Suiziddrohung der beschuldigten Person', fest: x => `${x.T.Nom} kündigte in Gegenwart der Einsatzkräfte an, sich das Leben zu nehmen.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} gedroht, sich das Leben zu nehmen.`, annahme: x => `Es bestehen Anhaltspunkte für eine Suizidgefährdung ${x.T.gen}.`, bed: 'Suiziddrohungen der gewaltausübenden Person gelten als Warnsignal für einen erweiterten Suizid, der die gefährdete Person und die Kinder einschließen kann.', weil: x => `${x.T.nom} mit Suizid gedroht hat` },
    { k: 'kinderdrohung', g: 'dro', l: 'Drohung gegen Kinder', fest: x => `In Gegenwart der Einsatzkräfte richtete ${x.T.nom} Drohungen auch gegen die Kinder.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} auch den Kindern gedroht.`, annahme: () => 'Es ist davon auszugehen, dass sich Drohungen auch gegen die Kinder richten.', bed: 'Drohungen gegen Kinder gelten als Warnsignal für eine schwere Eskalation.', weil: () => 'sich die Drohungen auch gegen die Kinder richten' },
    { k: 'rueckkehr', g: 'dro', l: 'Kündigt an, zurückzukommen', fest: x => `${x.T.Nom} kündigte in Gegenwart der Einsatzkräfte an, zurückzukommen bzw. die Auseinandersetzung fortzusetzen.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} angekündigt, zurückzukommen.`, annahme: x => `Es ist davon auszugehen, dass ${x.T.nom} ohne die Maßnahme kurzfristig zurückkehren würde.`, bed: 'Die Ankündigung zeigt, dass ohne die Maßnahme mit einer kurzfristigen Rückkehr und weiteren Übergriffen zu rechnen ist.', weil: x => `${x.T.nom} angekündigt hat, zurückzukommen` },
    { k: 'drohung', g: 'dro', l: 'Weitere Drohungen', fest: x => `${x.T.Nom} sprach in Gegenwart der Einsatzkräfte Drohungen gegen ${x.G.akk} aus.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} ${x.G.ihm} weitere Gewalt angedroht.`, annahme: x => `Es ist davon auszugehen, dass ${x.T.nom} weitere Gewalt angedroht hat.`, bed: 'Angekündigte Gewalt macht weitere Übergriffe in allernächster Zeit wahrscheinlich.', weil: x => `${x.T.nom} weitere Gewalt angedroht hat` },
    { k: 'abhaengig', g: 'lage', l: 'Abhängigkeit oder Isolation der gefährdeten Person', fest: x => `Festgestellt wurde, dass ${x.G.nom} von ${x.T.dat} wirtschaftlich oder sozial abhängig ist.`, angabe: x => `Nach Angaben ${x.G.gen} sei ${x.G.er} von ${x.T.dat} abhängig bzw. sozial isoliert.`, annahme: x => `Es ist von einer Abhängigkeit ${x.G.gen} von ${x.T.dat} auszugehen.`, bed: 'Abhängigkeit und Isolation erschweren es der gefährdeten Person, sich selbst zu schützen oder Hilfe zu holen.', weil: x => `${x.G.nom} sich aus eigener Kraft kaum schützen kann` },
    { k: 'neuerpartner', g: 'lage', l: 'Neue Beziehung der gefährdeten Person', fest: x => `${x.G.Nom} hat eine neue Beziehung.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.G.er} eine neue Beziehung, was ${x.T.nom} nicht akzeptiere.`, annahme: x => `Es ist davon auszugehen, dass eine neue Beziehung ${x.G.gen} Anlass der Auseinandersetzung war.`, bed: 'Eine neue Beziehung der gefährdeten Person kann eine akute Kränkung auslösen, die eine Eskalation begünstigt.', weil: x => `${x.T.nom} eine neue Beziehung ${x.G.gen} nicht akzeptiert` },
    { k: 'stiefkind', g: 'lage', l: 'Kind aus anderer Beziehung im Haushalt', fest: x => `Im Haushalt lebt ein Kind, das nicht von ${x.T.dat} abstammt.`, angabe: x => `Nach Angaben ${x.G.gen} lebe im Haushalt ein Kind aus einer anderen Beziehung.`, annahme: () => 'Es ist davon auszugehen, dass im Haushalt ein Kind aus einer anderen Beziehung lebt.', bed: 'Ein Kind aus einer anderen Beziehung im Haushalt gilt in der Forschung als zusätzlicher Belastungsfaktor.', weil: () => 'im Haushalt ein Kind aus einer anderen Beziehung lebt' },
    { k: 'krise', g: 'lage', l: 'Akute Lebenskrise (Job, Schulden, Kränkung)', fest: x => `${x.T.Nom} befindet sich erkennbar in einer akuten Lebenskrise.`, angabe: x => `Nach Angaben ${x.G.gen} befinde sich ${x.T.nom} in einer akuten Lebenskrise, etwa durch Arbeitsplatzverlust, Schulden oder eine Kränkung.`, annahme: x => `Es ist von einer akuten Belastungssituation ${x.T.gen} auszugehen.`, bed: 'Akute Belastungen und Kränkungserleben begünstigen eine Eskalation.', weil: x => `${x.T.nom} sich in einer akuten Lebenskrise befindet` },
    { k: 'alkohol', g: 'bsp', l: 'Alkohol- oder Drogeneinfluss', fest: x => `${x.T.Nom} stand erkennbar unter dem Einfluss von Alkohol oder anderen berauschenden Mitteln.`, angabe: x => `Nach Angaben ${x.G.gen} trinke ${x.T.nom} regelmäßig bzw. werde unter Alkoholeinfluss gewalttätig.`, annahme: x => `Es ist davon auszugehen, dass ${x.T.nom} den Konsum in der Wohnung fortsetzen würde.`, bed: 'Alkohol und Drogen senken die Hemmschwelle; eine Beruhigung der Lage war nicht zu erwarten, solange der Konsum in der Wohnung fortgesetzt werden kann.', weil: x => `${x.T.nom} erheblich unter Alkohol- bzw. Drogeneinfluss stand` },
    { k: 'waffenzugang', g: 'bsp', l: 'Waffenbesitz oder Zugang zu Waffen', fest: x => `${x.T.Nom} verfügt nach polizeilichen Erkenntnissen über Waffen bzw. eine waffenrechtliche Erlaubnis.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.T.nom} Zugang zu Waffen.`, annahme: x => `Es ist davon auszugehen, dass ${x.T.nom} Zugang zu Waffen hat.`, bed: 'Der Zugang zu Schusswaffen erhöht das Risiko tödlicher Gewalt erheblich.', weil: x => `${x.T.nom} Zugang zu Waffen hat` },
    { k: 'aggressiv', g: 'bsp', l: 'Aggressiv auch vor der Polizei', fest: x => `${x.T.Nom} verhielt sich auch in Gegenwart der Einsatzkräfte aggressiv und ließ sich kaum beruhigen.`, angabe: x => `Nach Angaben ${x.G.gen} sei ${x.T.nom} unbeherrscht und leicht reizbar.`, annahme: x => `Es ist nicht zu erwarten, dass sich ${x.T.nom} ohne die Maßnahme beruhigt.`, bed: 'Wer sich selbst in Anwesenheit der Polizei nicht beherrscht, lässt nach deren Abzug weitere Gewalt erwarten.', weil: x => `${x.T.nom} sich selbst in Gegenwart der Polizei nicht beruhigen ließ` },
    { k: 'uneinsichtig', g: 'bsp', l: 'Uneinsichtig, gibt der gefährdeten Person die Schuld', fest: x => `${x.T.Nom} zeigte sich uneinsichtig, spielte das Geschehen herunter und gab ${x.G.dat} die Schuld.`, angabe: x => `Nach Angaben ${x.G.gen} gebe ${x.T.nom} ${x.G.dat} regelmäßig die Schuld an den Auseinandersetzungen.`, annahme: x => `Es ist nicht zu erwarten, dass ${x.T.nom} ${x.T.sein} Verhalten aus eigenem Antrieb ändert.`, bed: 'Fehlende Einsicht spricht gegen eine Verhaltensänderung aus eigenem Antrieb.', weil: x => `${x.T.nom} keinerlei Einsicht zeigte` },
    { k: 'psych', g: 'bsp', l: 'Psychische Ausnahmesituation', fest: x => `${x.T.Nom} befand sich erkennbar in einer psychischen Ausnahmesituation.`, angabe: x => `Nach Angaben ${x.G.gen} befinde sich ${x.T.nom} in einer psychischen Krise.`, annahme: x => `Es ist von einer psychischen Ausnahmesituation ${x.T.gen} auszugehen.`, bed: 'Eine akute psychische Krise macht das Verhalten schwer vorhersehbar und kann die Gefahr erhöhen.', weil: x => `${x.T.nom} sich in einer psychischen Ausnahmesituation befand` },
    { k: 'widerstand', g: 'bsp', l: 'Widerstand gegen die Einsatzkräfte', fest: x => `${x.T.Nom} leistete Widerstand gegen die Einsatzkräfte.`, angabe: x => `Nach Angaben ${x.G.gen} habe sich ${x.T.nom} schon früher gegen polizeiliche Maßnahmen gewehrt.`, annahme: x => `Es ist davon auszugehen, dass sich ${x.T.nom} polizeilichen Anordnungen widersetzt.`, bed: 'Gewalt sogar gegenüber Einsatzkräften zeigt eine sehr niedrige Hemmschwelle.', weil: x => `${x.T.nom} sich sogar gegen die Einsatzkräfte zur Wehr setzte` },
    { k: 'angst', g: 'opf', l: 'Angst vor weiterer Gewalt', fest: x => `${x.G.Nom} wirkte erkennbar verängstigt.`, angabe: x => `${x.G.Nom} äußerte Angst vor weiteren Übergriffen.`, annahme: x => `Es ist davon auszugehen, dass ${x.G.nom} weitere Übergriffe fürchtet.`, bed: 'Die eigene Einschätzung der gefährdeten Person ist ein gewichtiger Hinweis auf das tatsächliche Risiko.', weil: x => `${x.G.nom} Angst vor weiteren Übergriffen hat` },
    { k: 'toetung', g: 'opf', l: 'Hält eine Tötung für möglich', fest: x => `${x.G.Nom} äußerte gegenüber den Einsatzkräften, ${x.G.er} halte ${x.T.akk} für fähig, ${x.G.ihn} zu töten.`, angabe: x => `${x.G.Nom} äußerte, ${x.G.er} halte ${x.T.akk} für fähig, ${x.G.ihn} zu töten.`, annahme: x => `Es ist davon auszugehen, dass ${x.G.nom} ${x.T.akk} für fähig hält, ${x.G.ihn} zu töten.`, bed: 'Hält die gefährdete Person eine Tötung für möglich, ist das ein gewichtiger Warnhinweis.', weil: x => `${x.G.nom} ${x.T.akk} für fähig hält, ${x.G.ihn} zu töten` },
    { k: 'ausweg', g: 'opf', l: 'Kann nicht ausweichen (Kinder, Gesundheit, Unterkunft)', fest: x => `${x.G.Nom} hat keine Möglichkeit, kurzfristig anderweitig unterzukommen.`, angabe: x => `Nach Angaben ${x.G.gen} habe ${x.G.er} keine Möglichkeit, kurzfristig anderweitig unterzukommen.`, annahme: x => `Es ist davon auszugehen, dass ${x.G.nom} nicht anderweitig unterkommen kann.`, bed: 'Der gefährdeten Person ist nicht zuzumuten, die eigene Wohnung zu verlassen, um sich zu schützen.', weil: x => `${x.G.nom} nicht ausweichen kann` }
  ];
  const FAK_BY = Object.fromEntries(FAK.map(f => [f.k, f]));
  // Frühere Version: Warnsignale ohne Grundlage → Zuordnung
  const WARN_ALT = { trennung: 'trennung', todesdrohung: 'tod', wuergen: 'wuergen', waffe: 'waffe', kontrolle: 'kontrolle', suizid: 'suizid', eskalation: 'zunahme', angst: 'angst' };

  /** Vorbelegung der Umstände aus früheren Antworten – sichtbar als „übernommen“, jederzeit änderbar. */
  function autoMarks(d) {
    const a = {}, G = ofRole(d, 'gs').map(y => y.p), B = (bsY(d) || {}).p || {}, K = kinderL(d).map(y => y.p);
    if (G.some(p => arr(p.verl).includes('wuergemale'))) a.wuergen = 'fest';
    if (G.some(p => ['vorort', 'kh', 'sofort'].includes(p.rtw))) a.behandlung = 'fest';
    if (K.some(p => p.da === 'ja')) a.kinder = 'fest';
    if (K.some(p => p.verletzt === 'ja')) a.kindergewalt = 'fest';
    if (B.konsum === 'ja') a.alkohol = 'fest';
    if (arr(B.zust).some(z => ['aggressiv', 'laut', 'angriff'].includes(z))) a.aggressiv = 'fest';
    if (arr(B.zust).includes('drohend')) a.drohung = 'fest';
    if (arr(B.zust).includes('uneinsichtig')) a.uneinsichtig = 'fest';
    if (arr(B.bes).includes('psych')) a.psych = 'fest';
    const v = arr(get(d, 'prog.vorg'));
    if (v.includes('verstoss')) a.verstoss = 'fest';
    if (v.includes('wbk')) a.waffenzugang = 'fest';
    if (v.includes('andere')) a.gewaltandere = 'fest';
    if (v.includes('anzeigen') || v.includes('wv')) a.frueher = 'fest';
    const g0 = G[0] || {};
    if (!a.frueher && g0.frueher === 'ja') a.frueher = 'angabe';
    if (g0.angst === 'ja') a.angst = 'angabe';
    if (['gsWill', 'bsWill', 'vollzogen'].includes(get(d, 'lage.trennung'))) a.trennung = 'angabe';
    return a;
  }
  const markOf = (d, k) => { const u = get(d, 'prog.f.' + k); if (u === 'nein') return ''; return u || autoMarks(d)[k] || ''; };
  const marked = d => FAK.map(f => [f, markOf(d, f.k)]).filter(([, s]) => s);
  const anyMark = (d, s) => marked(d).some(([, x]) => x === s);

  /* Textbausteine für die Gefahrenprognose (ganze Absätze) */
  const BST = [
    { k: 'gewaltbeziehung', l: 'Gewaltbeziehung: wiederholte Übergriffe', text: x => `Die Angaben ${x.G.gen} zu früheren Übergriffen und das heutige Geschehen ergeben das Bild einer Gewaltbeziehung, in der es wiederholt zu körperlichen Übergriffen gekommen ist. In einer solchen Beziehung ist jederzeit mit weiteren Taten zu rechnen (vgl. OVG NRW, Urt. v. 17.10.2023 – 5 A 3548/20); eine Beruhigung der Lage durch bloßen Zeitablauf ist nicht zu erwarten.` },
    { k: 'ersttat', l: 'Ersttat von hoher Intensität', text: () => 'Gesicherte Erkenntnisse über frühere Übergriffe liegen nicht vor. Der heutige Angriff war nach Art und Intensität jedoch so erheblich, dass er für sich genommen eine jederzeitige Wiederholung befürchten lässt. Auch eine erstmalige Tat kann eine gegenwärtige Gefahr begründen, wenn sie – wie hier – von erheblicher Intensität ist (vgl. OVG NRW, Urt. v. 17.10.2023 – 5 A 3548/20).' },
    { k: 'trennung', l: 'Trennungssituation', text: x => `Die Beziehung befindet sich in einer Trennungssituation. Trennungsphasen gelten als Zeit besonders hohen Risikos; Kränkung und drohender Kontrollverlust auf Seiten ${x.T.gen} lassen eine weitere Eskalation befürchten, zumal beide ohne die Maßnahme weiter in derselben Wohnung zusammenträfen.` },
    { k: 'wille', l: 'Gefährdete Person lehnt die Maßnahme ab', text: x => `Dass ${x.G.nom} die Maßnahme ablehnt, steht ihr nicht entgegen. Der Schutz von Leib, Leben und Freiheit steht nicht zur Disposition der gefährdeten Person; ihre Haltung kann zudem Ausdruck der Belastung und Abhängigkeit in der Beziehung sein. Die Tatsachen, auf die sich die Prognose stützt, bleiben davon unberührt.` },
    { k: 'abschwaechung', l: 'Angaben später abgeschwächt', text: x => `Soweit ${x.G.nom} ${x.G.sein}e Angaben im weiteren Verlauf abschwächte, wurde dies gewürdigt. Die ersten Angaben stimmen mit den objektiven Feststellungen am Einsatzort überein; diese Feststellungen werden durch die spätere Abschwächung nicht in Frage gestellt.` },
    { k: 'kinder', l: 'Kinder im Haushalt', text: () => 'Im Haushalt leben Kinder, die das Geschehen miterlebt haben bzw. ihm ausgesetzt sind. Das Miterleben von Gewalt zwischen Bezugspersonen gefährdet das Kindeswohl; ohne räumliche Trennung wären auch die Kinder weiterer Gewalt ausgesetzt.' },
    { k: 'alkohol', l: 'Alkohol als Verstärker', text: x => `${x.T.Nom} war erheblich alkoholisiert. Der Alkoholeinfluss senkt die Hemmschwelle zusätzlich; da der Konsum in der Wohnung jederzeit fortgesetzt werden kann, war eine Beruhigung der Lage durch bloßes Abwarten nicht zu erwarten.` },
    { k: 'einlassung', l: 'Einlassung erklärt die Befunde nicht', text: x => `Die Einlassung ${x.T.gen} ist mit den objektiven Feststellungen nicht in Einklang zu bringen; insbesondere erklärt sie das festgestellte Verletzungsbild nicht. Sie ist deshalb nicht geeignet, die Angaben ${x.G.gen} zu erschüttern.` },
    { k: 'schweigen', l: 'Beschuldigte Person schweigt', text: x => `${x.T.Nom} hat von ${x.T.sein}em Recht Gebrauch gemacht, sich nicht zur Sache zu äußern. Daraus werden keine nachteiligen Schlüsse gezogen; der Prognose liegen allein die festgestellten Tatsachen und die Angaben ${x.G.gen} zugrunde.` },
    { k: 'wechselseitig', l: 'Wechselseitige Vorwürfe', text: x => `Beide Beteiligte erheben wechselseitig Vorwürfe. Nach den Feststellungen geht die Gefahr jedoch von ${x.T.dat} aus, weil ${has(get(x.d, 'prog.wechselGrund')) ? slot(get(x.d, 'prog.wechselGrund')) : PH('Tatsachen, aus denen sich ergibt, von wem die Gefahr ausgeht')}.` },
    { k: 'unzumutbar', l: 'Gefährdete Person kann nicht ausweichen', text: x => `${x.G.Nom} kann sich der Gefahr nicht dadurch entziehen, dass ${x.G.er} die Wohnung verlässt; dies ist ${x.G.ihm} auch nicht zuzumuten. Die Wohnung ist ${x.G.sein} Lebensmittelpunkt${kinderDa(x.d) ? ' und der Lebensmittelpunkt der Kinder' : ''}.` },
    { k: 'nacht', l: 'Nachtzeit, keine andere Trennung möglich', text: () => 'Das Geschehen ereignete sich zur Nachtzeit. Ohne die Maßnahme hätten sich beide Beteiligte die Nacht über in derselben Wohnung aufgehalten; eine andere Möglichkeit, die Beteiligten kurzfristig zu trennen, bestand nicht.' }
  ];
  const BST_BY = Object.fromEntries(BST.map(b => [b.k, b]));

  /* ======================= Fragenkatalog ======================= */
  const frei = (k, pre, ph, extra) => ({ k, t: 'text', l: 'Weiteres in eigenen Worten (optional)', pre, ph, max: 240, ...extra });
  const satzFeld = (k, l, ph, extra) => ({ k, t: 'text', l: l + ' (optional, ganzer Satz)', ph, max: 240, ...extra });
  const zw = it => ({ w: 'Zeugin', m: 'Zeuge', d: 'Zeugin / Zeuge' }[gOf(it)]);
  const present = it => it.da !== 'nein';
  const statementOf = it => ['gs', 'zeuge'].includes(it.rolle) && present(it);
  const belAktiv = it => ['52', '57', 'bs'].includes(it.bel);
  const sprichtNicht = it => it.bel === 'nein' || (it.bel === '52' && it.belErkl === 'verweigert');
  const zvrHint = (d, it) => {
    const z = zvrOf(it.bez);
    if (z === true) return `Nach der Angabe „${str(it.bez)}“ steht ${it.rolle === 'gs' ? 'der geschädigten Person' : 'dieser Person'} vermutlich ein Zeugnisverweigerungsrecht gegenüber ${main(d, 'bs').dat} zu (§ 52 Abs. 1 StPO) – vor jeder Befragung belehren.`;
    if (z === false && /lebensgef|partner/i.test(str(it.bez))) return 'Lebensgefährten haben kein Zeugnisverweigerungsrecht – außer bei einem Verlöbnis (Heiratsabsicht erfragen). Im Zweifel nach § 52 belehren.';
    if (z === null && has(it.bez)) return 'Zeugnisverweigerungsrecht prüfen: Angehörige der beschuldigten Person (§ 52 Abs. 1 StPO)?';
    return '';
  };

  const STEPS = [
    /* ---------- Einsatz ---------- */
    {
      id: 'einsatz', phase: 'Einsatz', title: 'Einsatzanlass', lead: 'Wann, auf welchem Weg und mit welcher Meldung kam der Einsatz – und wohin?', gen: ['einsatz'],
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', req: true },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit der Einsatzübernahme', w: 'half', q: 'jetzt', req: true },
        { k: 'einsatz.meldeweg', t: 'choice', l: 'Meldeweg', o: [['leitstelle', 'Leitstelle (Notruf 110)'], ['telefon', 'Telefonisch bei der Wache'], ['wache', 'Persönlich auf der Wache'], ['streife', 'Eigene Wahrnehmung im Streifendienst']] },
        { k: 'einsatz.mitteiler', t: 'choice', l: 'Wer hat gemeldet?', o: [['gs', 'Geschädigte Person selbst'], ['kind', 'Kind aus dem Haushalt'], ['nachbar', 'Nachbarschaft'], ['angehoerig', 'Angehörige'], ['dritte', 'Andere Person'], ['bs', 'Beschuldigte Person selbst'], ['unbekannt', 'Unbekannt']], when: d => get(d, 'einsatz.meldeweg') !== 'streife' },
        { k: 'einsatz.mitteilerText', t: 'text', l: 'Wer genau? (optional)', pre: 'Die Meldung kam von', ph: 'der Schwester der geschädigten Person', max: 120, when: d => ['dritte', 'angehoerig'].includes(get(d, 'einsatz.mitteiler')) },
        { k: 'einsatz.meldung', t: 'text', l: 'Was wurde gemeldet?', pre: 'Gemeldet wurde, dass', ph: 'es in der Wohnung zu einer lautstarken Auseinandersetzung komme und eine Frau um Hilfe rufe', lint: 'konj', join: ' und ', sugg: [['Streit', 'es in der Wohnung zu einer lautstarken Auseinandersetzung komme'], ['Hilferufe', 'aus der Wohnung Hilferufe zu hören seien'], ['Schläge', 'eine Person in der Wohnung geschlagen werde'], ['Bedrohung', 'eine Person in der Wohnung bedroht werde'], ['Kind ruft an', 'ein Kind angerufen habe, weil sich die Erwachsenen stritten']] },
        { k: 'ort.strasse', t: 'text', l: 'Straße', ph: 'Musterstraße', w: 'half', req: true },
        { k: 'ort.hausnr', t: 'text', l: 'Hausnummer', ph: '5', w: 'half' },
        { k: 'ort.stadt', t: 'text', l: 'PLZ und Ort', ph: 'z. B. 48431 Rheine', recent: true, req: true }
      ]
    },
    {
      id: 'kraefte', phase: 'Einsatz', title: 'Eingesetzte Kräfte', lead: 'Rufname und Besatzung – wie bei den anderen schriftlichen Arbeiten. Ein Tipp übernimmt die Besatzung vom letzten Vorgang.', gen: ['einsatz'],
      fields: [
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half', recent: true },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Besatzung', max: 6 },
        { k: 'einsatz.weitere', t: 'text', l: 'Weitere Kräfte (optional)', pre: 'Zur Unterstützung waren außerdem eingesetzt:', ph: 'Stf 21/05 (PK Weber, PKin Aydin) und ein Rettungswagen' }
      ]
    },

    /* ---------- Personen ---------- */
    {
      id: 'personen', phase: 'Personen', title: 'Beteiligte Personen', lead: 'Jede Person einmal anlegen: Rolle, Geschlecht, Beziehung, vor Ort, verletzt. Danach fragt der Assistent pro Person nur, was passt. Namen kommen am Ende.', gen: ['kurz'],
      fields: [
        { k: 'lage.gewalt', t: 'multi', l: 'Was steht im Raum?', req: true, o: O(GEWALT) },
        { k: 'lage.gewaltFrei', t: 'text', l: 'Anderes (optional)', ph: 'z. B. Nachstellung', w: 'half', max: 80 },
        { t: 'info', when: nurVerbal, text: 'Nur verbaler Streit oder Sachbeschädigung trägt eine Wohnungsverweisung nicht (OVG NRW 5 A 3548/20). Es bleiben Gefährderansprache, freiwillige Trennung und die Strafanzeige.' },
        { k: 'pers', t: 'list', l: 'Personen', item: (it, i) => pl(it, i), add: 'Weitere Person', min1: true, max: 12, sub: [
          { k: 'rolle', t: 'choice', l: 'Rolle', o: (d, it) => [['gs', 'Geschädigt'], ...(ofRole(d, 'bs').some(y => y.p !== it) ? [] : [['bs', 'Beschuldigt']]), ['kind', 'Kind im Haushalt'], ['zeuge', 'Zeugin / Zeuge']] },
          { k: 'geschlecht', t: 'choice', l: 'Geschlecht', o: (d, it) => (it.rolle === 'kind' ? [['w', 'Mädchen'], ['m', 'Junge']] : [['w', 'weiblich'], ['m', 'männlich'], ['d', 'divers']]), when: (d, it) => has(it.rolle) },
          { k: 'bez', t: 'text', l: (d, it) => (it.rolle === 'gs' ? 'Beziehung zur beschuldigten Person' : 'Wer ist das? (z. B. Nachbarin, Mutter des Beschuldigten)'), ph: (d, it) => (it.rolle === 'gs' ? 'z. B. Ehefrau' : 'z. B. Nachbarin'), max: 60, sugg: (d, it) => (it.rolle === 'gs' ? BEZ : BEZ_Z)[gOf(it)], when: (d, it) => ['gs', 'zeuge'].includes(it.rolle) },
          { t: 'info', text: (d, it) => zvrHint(d, it), when: (d, it) => !!zvrHint(d, it) },
          { k: 'kbez', t: 'choice', l: 'Wessen Kind?', o: O(KBEZ_UI), when: (d, it) => it.rolle === 'kind' },
          { k: 'kbezText', t: 'text', l: 'Genauer', ph: 'z. B. Enkelin der geschädigten Person', max: 80, when: (d, it) => it.rolle === 'kind' && it.kbez === 'anders' },
          { k: 'alter', t: 'number', l: (d, it) => (it.rolle === 'kind' ? 'Alter' : 'Alter (nur bei Minderjährigen)'), unit: 'Jahre', min: 0, max: 120, w: 'half', when: (d, it) => ['kind', 'gs'].includes(it.rolle) },
          { k: 'da', t: 'yn', l: 'Beim Eintreffen vor Ort?', o: [['ja', 'Vor Ort'], ['nein', 'Nicht vor Ort']], w: 'half', when: (d, it) => has(it.rolle) },
          { k: 'verletzt', t: 'yn', l: 'Verletzt?', w: 'half', when: (d, it) => has(it.rolle) }
        ] },
        { t: 'info', when: d => plist(d).length > 0 && !ofRole(d, 'bs').length, text: 'Noch keine beschuldigte Person erfasst. Auch wer nicht mehr vor Ort ist, wird hier angelegt (Rolle „Beschuldigt“, „Nicht vor Ort“).' }
      ]
    },

    /* ---------- Eintreffen ---------- */
    {
      id: 'eintreffen', phase: 'Eintreffen', title: 'Eintreffen und Zutritt', lead: 'Was war beim Eintreffen zu hören, wer öffnete – und auf welcher Grundlage habt ihr die Wohnung betreten?', gen: ['eintreffen'],
      fields: [
        { k: 'einsatz.eintreffZeit', t: 'time', l: 'Eintreffzeit', w: 'half', q: 'jetzt' },
        { k: 'eintreff.wahrn', t: 'multi', l: 'Vor der Wohnung zu hören', o: [...O(WAHRN), ['ruhig', 'Nichts – ruhige Lage']] },
        { k: 'zutritt.art', t: 'choice', l: 'Zutritt', req: true, o: [['einw', 'Geöffnet und eingelassen'], ['verweigert', 'Geöffnet, Zutritt verweigert'], ['niemand', 'Niemand öffnete'], ['draussen', 'Außerhalb der Wohnung angetroffen']] },
        { k: 'zutritt.wer', t: 'choice', l: 'Wer öffnete?', o: d => [...plist(d).map((p, i) => [p, i]).filter(([p]) => isP(p) && present(p)).map(([p, i]) => [String(i), pl(p, i)]), ['andere', 'Andere Person']], when: d => ['einw', 'verweigert'].includes(get(d, 'zutritt.art')) },
        { k: 'zutritt.werText', t: 'text', l: 'Wer genau?', pre: 'Die Tür wurde geöffnet von', ph: 'dem Bruder des Beschuldigten', max: 120, when: d => get(d, 'zutritt.wer') === 'andere' },
        { t: 'info', when: zutrittGegen, text: 'Betreten gegen den Willen: § 41 Abs. 1 Satz 1 Nr. 4 PolG NRW – nur bei Tatsachen für eine gegenwärtige Gefahr für Leib, Leben oder Freiheit. Die Tatsachen jetzt festhalten; im Streitfall muss die Polizei sie beweisen (OLG Köln 7 U 147/20).' },
        { k: 'zutritt.tatsachen', t: 'multi', l: 'Welche Tatsachen sprachen für eine gegenwärtige Gefahr?', req: true, o: [['schreie', 'Schreie'], ['hilfe', 'Hilferufe'], ['poltern', 'Poltern / Kampfgeräusche'], ['nachbarn', 'Angaben von Nachbarn'], ['notruf', 'Inhalt des Notrufs'], ['zweite', 'Zweite Person nicht zu sehen'], ['kind', 'Weinendes Kind'], ['blut', 'Blut sichtbar']], when: zutrittGegen },
        frei('zutritt.tatsachenFrei', 'außerdem', 'durch das Küchenfenster war zu sehen, wie ein Mann eine Frau an den Haaren zog', { l: 'Weitere Tatsachen in eigenen Worten (optional)', when: zutrittGegen }),
        { k: 'zutritt.zwang', t: 'choice', l: 'Wie wurde der Zutritt durchgesetzt?', o: d => (get(d, 'zutritt.art') === 'niemand' ? [['gewalt', 'Tür nach Androhung gewaltsam geöffnet'], ['sofort', 'Tür sofort gewaltsam geöffnet (Sofortvollzug)'], ['schluessel', 'Durch Dritte mit Schlüssel geöffnet']] : [['aufforderung', 'Nach Aufforderung geduldet'], ['angedroht', 'Nach Androhung von Zwang geduldet'], ['gewalt', 'Nach Androhung durchgesetzt']]), when: zutrittGegen },
        { k: 'zutritt.gesucht', t: 'yn', l: 'Wurde in der Wohnung gegen den Willen nach einer Person gesucht?', h: 'Raum für Raum nach der zweiten Person sehen ist rechtlich eine Durchsuchung (§§ 41, 42 PolG NRW).', when: zutrittGegen },
        { k: 'zutritt.durchs', t: 'multi', l: 'Dazu erledigt', o: [['gefahr', 'Gefahr im Verzug – Richter nicht abwartbar'], ['grund', 'Grund dem Inhaber genannt'], ['niederschrift', 'Niederschrift gefertigt']], when: d => zutrittGegen(d) && get(d, 'zutritt.gesucht') === 'ja' },
        satzFeld('zutritt.text', 'Ergänzung zum Zutritt', 'Die Feuerwehr stand zur Türöffnung bereit.')
      ]
    },
    {
      id: 'angetroffen', phase: 'Eintreffen', title: 'Angetroffene Personen', lead: 'Für jede anwesende Person: wo angetroffen, Zustand, Auffälligkeiten, ungefragte Äußerungen. Kinder folgen im Schritt „Kinder“.', gen: ['angetroffen'],
      fields: [
        { k: 'pers', t: 'list', fixed: true, l: '', item: (it, i) => pl(it, i), only: (d, it) => it.rolle !== 'kind' && present(it), empty: 'Noch keine anwesende Person erfasst – erst im Schritt „Beteiligte Personen“ anlegen.', sub: [
          { k: 'wo', t: 'choice', l: 'Wo angetroffen?', o: O(WO) },
          { k: 'woText', t: 'text', l: 'Genauer (optional)', ph: 'im Schlafzimmer, auf dem Boden sitzend', max: 120 },
          { k: 'zust', t: 'multi', l: (d, it) => (it.rolle === 'bs' ? 'Verhalten und Zustand' : 'Zustand'), o: (d, it) => ZUST_UI[it.rolle] || ZUST_UI.zeuge },
          { k: 'zustFrei', t: 'text', l: 'Weiteres in eigenen Worten (optional)', pre: (d, it) => ErP(it), ph: 'hielt sich die linke Wange und sprach nur stockend', max: 240 },
          { k: 'bes', t: 'multi', l: 'Besonderheiten', o: [['rausch', 'Nicht aufnahmefähig'], ['sprache', 'Keine Verständigung ohne Dolmetscher'], ['psych', 'Akute psychische Krise'], ['minder', 'Unter 18 Jahre'], ['betreut', 'Unter rechtlicher Betreuung']], when: (d, it) => it.rolle === 'bs' },
          { t: 'info', when: (d, it) => it.rolle === 'bs' && arr(it.bes).some(b => ['rausch', 'sprache'].includes(b)), text: 'Belehrung, Anhörung und Verfügung, die nicht verstanden werden, sind angreifbar. Zustand als Tatsache festhalten, Verfügung schriftlich mitgeben, Belehrung und Anhörung nachholen. Als Dolmetscher scheiden die geschädigte Person, ihre Angehörigen und Kinder aus.' },
          { k: 'konsum', t: 'yn', l: 'Anzeichen für Alkohol-, Drogen- oder Medikamenteneinfluss?' },
          { k: 'konsumText', t: 'text', l: 'Welche Anzeichen?', pre: 'Festgestellt wurden', ph: 'deutlicher Alkoholgeruch in der Atemluft und eine verwaschene Aussprache', join: ' und ', sugg: KONSUM, when: (d, it) => it.konsum === 'ja' },
          { k: 'aat', t: 'choice', l: 'Atemalkoholtest (freiwillig)', o: [['ja', 'Durchgeführt'], ['verweigert', 'Abgelehnt'], ['nein', 'Nicht durchgeführt']], when: (d, it) => it.konsum === 'ja' },
          { k: 'aatWert', t: 'number', l: 'Ergebnis', step: 0.01, min: 0, max: 6, w: 'half', when: (d, it) => it.aat === 'ja' },
          { k: 'aatEinheit', t: 'choice', l: 'Einheit', o: [['promille', '‰'], ['mgl', 'mg/l']], w: 'half', when: (d, it) => it.aat === 'ja' },
          { k: 'aatZeit', t: 'time', l: 'Uhrzeit des Tests', q: 'jetzt', w: 'half', when: (d, it) => it.aat === 'ja' },
          { k: 'spontan', t: 'text', l: 'Ungefragte Äußerung (wörtlich, optional)', h: 'Ungefragte Äußerungen bleiben verwertbar, auch wenn später das Zeugnis verweigert wird – deshalb wörtlich und mit Uhrzeit.', pre: (d, it) => `${ErP(it)} äußerte ungefragt:`, ph: (d, it) => (it.rolle === 'bs' ? '„Die hat mich provoziert.“' : '„Er hat mich wieder geschlagen.“'), max: 300 },
          { k: 'spontanZeit', t: 'time', l: 'Uhrzeit der Äußerung', w: 'half', q: 'jetzt', when: (d, it) => has(it.spontan) }
        ] },
        { k: 'abw.verbleib', t: 'text', l: 'Wo ist die beschuldigte Person? (nicht vor Ort)', pre: d => `Nach Angaben ${gsGen(d)}`, ph: 'habe er die Wohnung kurz vor Eintreffen der Polizei zu Fuß in unbekannte Richtung verlassen', lint: 'konj', sugg: d => [['kurz zuvor gegangen', `habe ${erBs(d)} die Wohnung kurz vor Eintreffen der Polizei verlassen`], ['unbekannt', `sei ${seinBs(d)} Aufenthaltsort unbekannt`]], when: bsWeg },
        { k: 'eintreff.sofort', t: 'multi', l: 'Erste Maßnahmen', o: d => [...(bsDa(d) ? [['getrennt', 'Beteiligte räumlich getrennt']] : []), ['idf', 'Identitäten festgestellt'], ['abgleich', 'Datenabgleich'], ...(bsDa(d) ? [['eigen', 'Durchsuchung zur Eigensicherung']] : []), ['waffen', 'Waffen / gefährliche Gegenstände sichergestellt'], ['absuche', 'Nahbereich abgesucht']] },
        satzFeld('eintreff.sofortText', 'Weitere Maßnahmen', 'Ein zweites Einsatzmittel wurde zur Unterstützung angefordert.')
      ]
    },
    {
      id: 'verletzungen', phase: 'Eintreffen', title: 'Verletzungen und Versorgung', lead: 'Für jede verletzte Person: Verletzungen, Frage nach dem Rettungswagen mit Antwort, Lichtbilder.', gen: ['verletzungen'], when: d => verletzte(d).length > 0,
      fields: [
        { k: 'pers', t: 'list', fixed: true, l: '', item: (it, i) => pl(it, i), only: (d, it) => it.verletzt === 'ja', empty: 'Keine verletzte Person erfasst.', sub: [
          { k: 'verl', t: 'multi', l: 'Sichtbare Verletzungen', o: [...O(VERL), ['keine', 'Keine sichtbaren']] },
          { k: 'verlFrei', t: 'text', l: 'Weitere Verletzungen in eigenen Worten (optional)', pre: 'außerdem', ph: 'eine aufgeplatzte Lippe und einen abgebrochenen Schneidezahn', max: 240 },
          { k: 'verlWo', t: 'text', l: 'Wo?', pre: 'Die Verletzungen befinden sich', ph: 'am linken Auge und am rechten Unterarm', join: ' und ', sugg: [['Gesicht', 'im Gesicht'], ['Hals', 'am Hals'], ['Arme', 'an den Armen'], ['Oberkörper', 'am Oberkörper'], ['Kopf', 'am Kopf'], ['Beine', 'an den Beinen']], when: (d, it) => arr(it.verl).some(v => v !== 'keine') || has(it.verlFrei) },
          { k: 'schmerz', t: 'text', l: 'Schmerzen (optional)', pre: (d, it) => `${ErP(it)} klagte über`, ph: 'Schmerzen im Bereich des Halses und Schluckbeschwerden', max: 200 },
          { t: 'info', when: (d, it) => arr(it.verl).includes('wuergemale'), text: 'Angriff gegen den Hals: auch ohne sichtbare Spuren ärztliche Abklärung dringend empfehlen – Schwellungen können verzögert auftreten.' },
          { k: 'rtw', t: 'choice', l: 'Rettungswagen / ärztliche Hilfe – gefragt und Antwort', req: true, h: 'Immer fragen und die Antwort festhalten – auch die Ablehnung.', o: RTW_UI },
          { k: 'rtwBes', t: 'text', l: 'Rettungsmittel (optional)', ph: 'z. B. RTW 1-83-1', w: 'half', max: 40, when: (d, it) => ['vorort', 'kh', 'sofort'].includes(it.rtw) },
          { k: 'kh', t: 'text', l: 'Krankenhaus', ph: 'z. B. Mathias-Spital Rheine', w: 'half', recent: true, max: 80, when: (d, it) => it.rtw === 'kh' },
          { k: 'rtwText', t: 'text', l: 'Befund der Rettungswagenbesatzung (optional)', pre: 'Die Besatzung des Rettungswagens', ph: 'stellte eine Platzwunde an der Stirn fest und versorgte sie vor Ort', max: 240, when: (d, it) => ['vorort', 'kh', 'sofort'].includes(it.rtw) },
          { k: 'foto', t: 'choice', l: (d, it) => (it.rolle === 'bs' ? 'Lichtbilder (§ 81b StPO)' : 'Lichtbilder der Verletzungen'), o: [['ja', 'Gefertigt – zur Anzeige'], ['abgelehnt', 'Abgelehnt'], ['spaeter', 'Werden nachgefertigt'], ['nein', 'Nicht gefertigt']] },
          { k: 'fotoBel', t: 'yn', l: 'Vorher über das Weigerungsrecht belehrt (§ 81c Abs. 3 StPO)?', h: 'Angehörige dürfen Untersuchungen und Lichtbilder aus denselben Gründen verweigern wie das Zeugnis.', when: (d, it) => it.rolle !== 'bs' && it.foto === 'ja' && angehoerig(it) },
          { k: 'attest', t: 'yn', l: 'Auf ärztliche Dokumentation (Attest) hingewiesen?', w: 'half', when: (d, it) => it.rolle !== 'bs' }
        ] }
      ]
    },

    /* ---------- Umstände ---------- */
    {
      id: 'umstaende', phase: 'Umstände', title: 'Örtlichkeit und Beziehung', lead: 'Wohnung, Spuren einer Auseinandersetzung, Wohnverhältnisse und Beziehung der Beteiligten.', gen: ['umstaende'],
      fields: [
        { t: 'head', text: 'Örtlichkeit' },
        { k: 'ort.art', t: 'choice', l: 'Gebäude', o: [['mfh', 'Mehrfamilienhaus'], ['efh', 'Einfamilienhaus'], ['rh', 'Reihen- / Doppelhaus'], ['wgh', 'Wohn- und Geschäftshaus']] },
        { k: 'ort.lage', t: 'text', l: 'Lage der Wohnung', ph: 'z. B. 2. OG links', w: 'half', max: 60 },
        { k: 'eintreff.wohnung', t: 'choice', l: 'Anhaltspunkte für eine Auseinandersetzung in der Wohnung?', o: [['unauffaellig', 'Keine – Wohnung unauffällig'], ['spuren', 'Ja, Spuren festgestellt']] },
        { k: 'eintreff.spuren', t: 'multi', l: 'Welche Spuren?', o: Object.entries(SPUREN).map(([k, v]) => [k, cap(v[0])]), when: d => get(d, 'eintreff.wohnung') === 'spuren' },
        { k: 'eintreff.spurenFrei', t: 'text', l: 'Weitere Spuren (optional)', pre: 'außerdem', ph: 'eine eingetretene Badezimmertür', max: 200, when: d => get(d, 'eintreff.wohnung') === 'spuren' },
        { k: 'eintreff.raum', t: 'text', l: 'Wo? (optional)', ph: 'im Wohnzimmer und im Flur', max: 120, sugg: Object.entries(RAUM).filter(([k]) => k !== 'draussen').map(([k, v]) => [cap(v.replace(/^(im|in der) /, '')), v]), join: ' und ', when: d => get(d, 'eintreff.wohnung') === 'spuren' },
        { t: 'head', text: 'Wohnverhältnisse und Beziehung' },
        { k: 'lage.wohnt', t: 'choice', l: 'Wohnverhältnisse', req: true, h: 'Maßgeblich ist der Lebensmittelpunkt (Schlüssel, persönliche Sachen) – nicht Mietvertrag oder Eigentum.', o: [['gemeinsam', 'Leben gemeinsam in der Wohnung'], ['getrenntInnen', 'Getrennt innerhalb der Wohnung'], ['bsAuszug', 'Beschuldigte Person ist ausgezogen'], ['besuch', 'Beschuldigte Person wohnt nicht hier']] },
        { t: 'info', when: d => ['besuch', 'bsAuszug'].includes(get(d, 'lage.wohnt')), text: 'Wohnt die Person nicht (mehr) in der Wohnung, ist § 34a PolG NRW unsicher. Sicher tragen Platzverweis und Betretungsverbot (§ 34 PolG NRW) sowie der Gewahrsam nach § 35 Abs. 1 Nr. 2.' },
        { k: 'lage.trennung', t: 'choice', l: 'Trennung', o: [['nein', 'Keine Trennung bekannt'], ['gsWill', 'Geschädigte Person will sich trennen'], ['bsWill', 'Beschuldigte Person will sich trennen'], ['vollzogen', 'Bereits getrennt']] },
        satzFeld('lage.bezText', 'Zur Beziehung', 'Die Beteiligten sind seit 2015 verheiratet und leben seit 2019 in der Wohnung.'),
        satzFeld('lage.text', 'Weitere Umstände vor Ort', 'Im Flur stand ein gepackter Koffer der Geschädigten.')
      ]
    },
    {
      id: 'kinder', phase: 'Umstände', title: 'Kinder im Haushalt', lead: 'Wo waren die Kinder, wie wirkten sie? Keine Fragen zur Tat an Kinder – nur festhalten, was sie ungefragt sagen.', gen: ['kinder'], when: kinderDa,
      fields: [
        { t: 'info', text: 'Ist ein Elternteil beschuldigt, kann bei gemeinsamer Sorge kein Elternteil der Vernehmung des Kindes zustimmen (§ 52 Abs. 2 Satz 2 StPO). Die Vernehmung gehört in die Sachbearbeitung.' },
        { k: 'pers', t: 'list', fixed: true, l: '', item: (it, i) => pl(it, i), only: (d, it) => it.rolle === 'kind', sub: [
          { k: 'kwo', t: 'choice', l: 'Wo befand sich das Kind?', o: [['wohnung', 'In der Wohnung'], ['kinderzimmer', 'Im Kinderzimmer'], ['beiGs', 'Bei der geschädigten Person'], ['schlafzimmer', 'Im Schlafzimmer']], when: (d, it) => present(it) },
          { k: 'woAbw', t: 'text', l: 'Wo hielt sich das Kind auf? (optional)', ph: 'bei den Großeltern', max: 80, when: (d, it) => it.da === 'nein' },
          { k: 'zust', t: 'multi', l: 'Zustand', o: ZUST_UI.kind, when: (d, it) => present(it) },
          { k: 'zustFrei', t: 'text', l: 'Weiteres in eigenen Worten (optional)', pre: 'Es', ph: 'klammerte sich an die Mutter und sprach nicht', max: 200, when: (d, it) => present(it) },
          { k: 'miterlebt', t: 'choice', l: 'Vom Geschehen mitbekommen?', o: [['gesehen', 'Nach eigener Äußerung gesehen'], ['wohnung', 'War dabei in der Wohnung'], ['nein', 'Hat nichts mitbekommen'], ['unklar', 'Unklar']], when: (d, it) => present(it) },
          { k: 'spontan', t: 'text', l: 'Ungefragte Äußerung (wörtlich, optional)', pre: 'Das Kind äußerte ungefragt:', ph: '„Papa hat Mama gehauen.“', max: 300, when: (d, it) => present(it) },
          { k: 'spontanZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', when: (d, it) => has(it.spontan) }
        ] },
        { k: 'kind.befragt', t: 'choice', l: 'Befragung der Kinder', o: [['nein', 'Nicht zur Tat befragt'], ['spontan', 'Nur ungefragte Äußerungen festgehalten']] }
      ]
    },

    /* ---------- Schilderungen ---------- */
    {
      id: 'aussagen', phase: 'Schilderungen', title: 'Geschädigte und Zeugen', lead: 'Für jede Person: wer hat wann belehrt, welche Inhalte, Erklärung – dann die Schilderung. Sie lässt sich auch später eintragen.', gen: ['aussagen'],
      fields: [
        { k: 'pers', t: 'list', fixed: true, l: '', item: (it, i) => pl(it, i), only: (d, it) => statementOf(it), empty: 'Keine anwesende geschädigte Person und keine Zeugen erfasst – im Schritt „Beteiligte Personen“ ergänzen.', sub: [
          { t: 'info', text: (d, it) => zvrHint(d, it), when: (d, it) => !!zvrHint(d, it) && !has(it.bel) },
          { k: 'bel', t: 'choice', l: 'Belehrt als', o: (d, it) => [['52', `${zw(it)} mit § 52 (Angehörige)`], ['57', `${zw(it)} ohne § 52`], ['bs', 'Beschuldigte/r (wechselseitige Vorwürfe)'], ['nein', 'Nicht zur Sache befragt']] },
          { k: 'belVon', t: 'crewpick', l: 'Belehrt durch', when: (d, it) => belAktiv(it) },
          { k: 'belZeit', t: 'time', l: 'Uhrzeit der Belehrung', q: 'jetzt', w: 'half', when: (d, it) => belAktiv(it) },
          { t: 'preset', l: 'Schnellwahl', o: (d, it, base) => [['Vollständig nach Vordruck', { [`${base}.belInh`]: it.bel === 'bs' ? BEL_B_STD.slice() : belZStd(it) }, it.bel === 'bs' ? '§ 136 Abs. 1 StPO' : 'alle Pflichtinhalte']], when: (d, it) => belAktiv(it) },
          { k: 'belInh', t: 'multi', l: 'Was wurde belehrt?', o: (d, it) => belOpts(it), when: (d, it) => belAktiv(it) },
          { k: 'belErkl', t: 'choice', l: 'Erklärung nach der Belehrung', o: [['aussage', 'Will aussagen'], ['verweigert', 'Verweigert das Zeugnis'], ['gefahr', 'Verweigert, äußert sich nur zum Schutz']], when: (d, it) => it.bel === '52' },
          { k: 'bsVert', t: 'choice', l: 'Verteidiger vor der Äußerung befragen?', o: [['nein', 'Möchte keinen Verteidiger befragen'], ['ja', 'Möchte zuerst einen Verteidiger befragen']], when: (d, it) => it.bel === 'bs' },
          { k: 'wahr', t: 'choice', l: 'Wahrnehmung', o: [['gesehen', 'Selbst gesehen'], ['gehoert', 'Nur gehört'], ['danach', 'Erst danach hinzugekommen']], when: (d, it) => it.rolle === 'zeuge' && !sprichtNicht(it) },
          { k: 'modus', t: 'choice', l: 'Schilderung', o: MODUS, when: (d, it) => has(it.bel) && !sprichtNicht(it) },
          { k: 'tatzeit', t: 'time', l: 'Tatzeit laut Angabe', w: 'half', when: (d, it) => it.rolle === 'gs' && ['jetzt', 'folgt'].includes(it.modus) },
          { k: 'raum', t: 'choice', l: 'Wo geschah es?', o: Object.entries(RAUM).map(([k, v]) => [k, cap(v.replace(/^(im|in der) /, ''))]), when: (d, it) => it.rolle === 'gs' && ['jetzt', 'folgt'].includes(it.modus) },
          { k: 'raumText', t: 'text', l: 'Anderer oder genauerer Ort (optional)', pre: 'Das Geschehen habe sich ereignet', ph: 'im Treppenhaus vor der Wohnungstür', max: 160, when: (d, it) => it.rolle === 'gs' && ['jetzt', 'folgt'].includes(it.modus) },
          { k: 'anlass', t: 'text', l: 'Anlass (optional)', pre: 'Anlass sei', ph: 'ein Streit um Geld gewesen', lint: 'konj', max: 200, sugg: (d, it) => [['Trennung', `${seinP(it)}e Ankündigung gewesen, sich zu trennen`], ['Eifersucht', `die Eifersucht ${main(d, 'bs').gen} gewesen`], ['Alkohol', `der Alkoholkonsum ${main(d, 'bs').gen} gewesen`], ['Geld', 'ein Streit um Geld gewesen'], ['Kinder', 'ein Streit um die Kinder gewesen']], when: (d, it) => it.rolle === 'gs' && it.modus === 'jetzt' },
          { k: 'text', t: 'area', rows: 4, l: 'Schilderung in indirekter Rede', pre: (d, it) => `${ErP(it)} gab an,`, lint: 'konj', ph: (d, it) => (it.rolle === 'zeuge' ? `${erP(it)} habe aus der Nachbarwohnung laute Schreie und ein Poltern gehört` : `${bsNom(d)} habe ${ihnP(it)} nach einem Streit ins Gesicht geschlagen und am Hals gepackt; ${erP(it)} habe sich losreißen und den Notruf wählen können`), when: (d, it) => it.modus === 'jetzt' },
          { k: 'kern', t: 'text', l: 'Kern des Vorwurfs in einem Satz (optional)', h: 'Damit Sachverhalt und Begründung schon heute tragen; die Schilderung selbst folgt.', pre: (d, it) => `Nach ${seinP(it)}en Angaben habe ${bsNom(d)} ${ihnP(it)}`, ph: 'mehrfach ins Gesicht geschlagen und am Hals gepackt', lint: 'konj', max: 240, when: (d, it) => it.rolle === 'gs' && it.modus === 'folgt' },
          { k: 'frueher', t: 'choice', l: 'Frühere Übergriffe?', o: [['erstmals', 'Erstmals'], ['ja', 'Ja, bereits früher'], ['kA', 'Keine Angabe']], when: (d, it) => it.rolle === 'gs' && has(it.modus) && it.modus !== 'keine' },
          { k: 'frueherText', t: 'text', l: 'Wann, wie oft?', h: 'Mit Datum oder Zeitraum – bei getrennten Paaren: vor oder nach der Trennung?', pre: (d, it) => `Zu früheren Vorfällen gab ${erP(it)} an,`, ph: 'er habe sie zuletzt vor etwa drei Wochen geschlagen, insgesamt etwa einmal im Monat seit Anfang 2025', lint: 'konj', max: 400, when: (d, it) => it.frueher === 'ja' },
          { k: 'angst', t: 'choice', l: 'Angst vor weiteren Übergriffen?', o: [['ja', 'Ja, geäußert'], ['nein', 'Nein'], ['kA', 'Keine Angabe']], when: (d, it) => it.rolle === 'gs' },
          { k: 'wille', t: 'choice', l: 'Haltung zur Wohnungsverweisung', o: [['will', 'Wünscht sie'], ['ablehnt', 'Lehnt sie ab'], ['widerruf', 'Nimmt Angaben zurück'], ['kA', 'Keine Äußerung']], when: (d, it) => it.rolle === 'gs' },
          { t: 'info', when: (d, it) => it.wille === 'widerruf', text: 'Ein inhaltlicher Widerruf ist konkret zu würdigen. Nimmt die Person ihre Tatsachenangaben zurück, kann die Grundlage der Prognose entfallen (VG Münster 1 K 2338/08). Der bloße Wunsch, die Person möge bleiben, hindert die Maßnahme nicht.' },
          { k: 'bleibt', t: 'choice', l: 'Bleibt die Person in der Wohnung?', o: [['ja', 'Ja'], ['auszug', 'Zieht in Kürze aus'], ['weg', 'Hat die Wohnung dauerhaft verlassen']], when: (d, it) => it.rolle === 'gs' },
          { k: 'antrag', t: 'choice', l: 'Strafantrag', o: [['ja', 'Gestellt'], ['nein', 'Nicht gestellt'], ['spaeter', 'Behält sich vor']], when: (d, it) => it.rolle === 'gs' }
        ] }
      ]
    },
    {
      id: 'beschuldigt', phase: 'Schilderungen', title: 'Beschuldigte Person', lead: 'Zwei getrennte Schritte: Beschuldigtenbelehrung mit Einlassung – dann die Anhörung zur Wohnungsverweisung.', gen: ['beschuldigt'], when: bsDa,
      fields: [
        { t: 'head', text: 'Beschuldigtenbelehrung', h: 'Vor der ersten Frage zum Geschehen (§ 163a Abs. 4, § 136 Abs. 1 StPO).' },
        { k: 'bsb.von', t: 'crewpick', l: 'Belehrt durch' },
        { k: 'bsb.zeit', t: 'time', l: 'Uhrzeit', q: 'jetzt', w: 'half' },
        { t: 'preset', l: 'Schnellwahl', o: () => [['Vollständig nach Vordruck', { 'bsb.inh': BEL_B_STD.slice() }, 'Tatvorwurf, Schweigen, Verteidiger, Notdienst, Beweisanträge, Pflichtverteidiger']] },
        { k: 'bsb.inh', t: 'multi', l: 'Was wurde belehrt?', o: O(BEL_B) },
        { k: 'bsb.vert', t: 'choice', l: 'Verteidiger vor der Äußerung befragen?', h: 'Die Entscheidung ist zu dokumentieren (§ 168b Abs. 3 Satz 2 StPO).', o: [['nein', 'Möchte keinen Verteidiger befragen'], ['ja', 'Möchte zuerst einen Verteidiger befragen']] },
        { k: 'bsb.reaktion', t: 'choice', l: 'Äußert sich zur Sache?', o: [['aeussert', 'Äußert sich'], ['schweigt', 'Schweigt zur Sache']], when: d => get(d, 'bsb.vert') !== 'ja' },
        { t: 'info', when: d => get(d, 'bsb.reaktion') === 'schweigt' || get(d, 'bsb.vert') === 'ja', text: 'Ab jetzt keine Fragen zur Sache mehr (BGH 3 StR 435/12). Die Anhörung zur Wohnungsverweisung trotzdem durchführen – Vorwürfe mitteilen, Gelegenheit zur Äußerung geben, nicht nachfragen.' },
        { k: 'bsb.kern', t: 'choice', l: 'Kern der Einlassung', o: [['bestreitet', 'Bestreitet'], ['teil', 'Räumt teilweise ein'], ['raeumt', 'Räumt ein'], ['gegen', 'Erhebt Gegenvorwürfe']], when: d => get(d, 'bsb.reaktion') === 'aeussert' && get(d, 'bsb.vert') !== 'ja' },
        { k: 'bsb.modus', t: 'choice', l: 'Einlassung', o: MODUS, when: d => get(d, 'bsb.reaktion') === 'aeussert' && get(d, 'bsb.vert') !== 'ja' },
        { k: 'bsb.text', t: 'area', rows: 3, l: 'Einlassung in indirekter Rede', pre: d => `${ErBs(d)} gab an,`, lint: 'konj', ph: d => `es habe lediglich einen lauten Streit gegeben; geschlagen habe ${erBs(d)} niemanden`, when: d => get(d, 'bsb.reaktion') === 'aeussert' && get(d, 'bsb.modus') === 'jetzt' && get(d, 'bsb.vert') !== 'ja' },
        { t: 'head', text: 'Anhörung zur Wohnungsverweisung', h: '§ 28 Abs. 1 VwVfG NRW – eigener Schritt neben der Belehrung, vor der Entscheidung (OVG NRW 5 A 3548/20).' },
        { k: 'anh.von', t: 'crewpick', l: 'Angehört durch' },
        { k: 'anh.zeit', t: 'time', l: 'Uhrzeit', q: 'jetzt', w: 'half' },
        { t: 'preset', l: 'Schnellwahl', o: () => [['Vollständig', { 'anh.inh': ANH_STD.slice() }, 'Vorwürfe, Maßnahme, Hinweise, Fragen']] },
        { k: 'anh.inh', t: 'multi', l: 'Inhalt der Anhörung', o: O(ANH) },
        { k: 'anh.reaktion', t: 'choice', l: 'Äußerung dazu', o: [['text', 'Hat sich geäußert'], ['keine', 'Hat sich nicht geäußert']] },
        { k: 'anh.text', t: 'text', l: 'Was wurde geäußert?', pre: d => `Hierzu äußerte ${erBs(d)},`, lint: 'konj', ph: d => `die Vorwürfe seien frei erfunden; ${erBs(d)} wolle die Wohnung nicht verlassen`, max: 400, when: d => get(d, 'anh.reaktion') === 'text' },
        { k: 'anh.unterkunft', t: 'text', l: 'Unterkunft', pre: d => `${ErBs(d)} gab an, unterzukommen`, ph: d => `bei ${seinBs(d)}em Bruder in Emsdetten`, max: 160, sugg: d => [['Familie', 'bei Familienangehörigen'], ['Freunde', 'bei Bekannten'], ['Hotel', 'in einem Hotel'], ['nirgends', 'derzeit nirgends']], when: d => inc(d, 'anh.inh', 'unterkunft') },
        { k: 'anh.bindung', t: 'choice', l: 'Bindung an die Wohnung', o: [['nein', 'Keine'], ['arbeit', 'Arbeitet in der Wohnung'], ['pflege', 'Versorgt Angehörige in der Wohnung']], when: d => inc(d, 'anh.inh', 'bindung') },
        { k: 'anh.bindungText', t: 'text', l: 'Genauer (optional)', ph: 'betreibt im Arbeitszimmer ein Gewerbe', max: 160, when: d => ['arbeit', 'pflege'].includes(get(d, 'anh.bindung')) },
        { k: 'anh.einwand', t: 'choice', l: 'Einwände gegen Bereich und Dauer', o: [['keine', 'Keine'], ['ja', 'Ja']], when: d => inc(d, 'anh.inh', 'einwand') },
        { k: 'anh.einwandText', t: 'text', l: 'Welche?', pre: d => `${ErBs(d)} wandte ein,`, lint: 'konj', ph: 'er müsse morgen früh Arbeitskleidung aus dem Keller holen', max: 240, when: d => get(d, 'anh.einwand') === 'ja' }
      ]
    },

    /* ---------- Prognose ---------- */
    {
      id: 'prognose', phase: 'Prognose', title: 'Gefahrenprognose', lead: 'Trägt bei einer Gewaltbeziehung mit konkreten Anzeichen wiederholter Übergriffe oder bei einer Ersttat von hoher Intensität (OVG NRW 5 A 3548/20). Umstände markieren: festgestellt, geschildert oder angenommen.', gen: ['prognose'],
      fields: [
        { t: 'head', text: 'Erkenntnislage' },
        { k: 'prog.vorg', t: 'multi', l: 'Ergebnis des Datenabgleichs', o: [...O(VORG), ['keine', 'Keine Erkenntnisse'], ['nicht', 'Abgleich nicht möglich']] },
        frei('prog.vorgFrei', 'sowie', 'ein laufendes Ermittlungsverfahren wegen Körperverletzung aus dem Juni 2026'),
        { k: 'prog.muster', t: 'choice', l: 'Einordnung', req: true, o: [['beziehung', 'Gewaltbeziehung – wiederholte Übergriffe'], ['ersttat', 'Ersttat von hoher Intensität'], ['weder', 'Weder noch']] },
        { t: 'info', when: d => get(d, 'prog.muster') === 'weder', text: 'Ohne Gewaltbeziehung und ohne intensive Ersttat trägt die Wohnungsverweisung nach dem OVG NRW nicht. Alkohol, Beschimpfungen und Drohungen stützen nur, tragen aber nicht allein.' },
        { t: 'head', text: 'Glaubhaftigkeit der Angaben' },
        { k: 'prog.stuetzen', t: 'multi', l: 'Was stützt die Angaben objektiv?', req: true, o: d => [...Object.keys(STUETZEN).map(k => [k, cap(val(STUETZEN[k], { T: main(d, 'bs'), G: main(d, 'gs') }))]), ['keine', 'Keine objektive Stütze']] },
        frei('prog.stuetzenFrei', 'sowie durch', 'Lichtbilder früherer Verletzungen auf dem Mobiltelefon der Geschädigten', { l: 'Weitere Stütze (optional)' }),
        { t: 'info', when: d => inc(d, 'prog.stuetzen', 'keine'), text: 'Angaben einer Seite ohne objektive Stütze und ohne Vorhalt haben 2023 vor dem OVG NRW nicht getragen. Unten begründen, warum den Angaben dennoch gefolgt wird.' },
        { k: 'prog.wuerdigung', t: 'text', l: 'Warum wird diesen Angaben gefolgt?', pre: d => `Den Angaben ${gsGen(d)} wird gefolgt, weil`, ph: 'sie detailliert und widerspruchsfrei geschildert wurden und zum Verletzungsbild passen', join: ' und ', max: 400, sugg: d => [['detailliert', 'sie detailliert und widerspruchsfrei geschildert wurden'], ['Verletzungsbild', 'sie zum festgestellten Verletzungsbild passen'], ['Zeugen', 'sie von unbeteiligten Zeugen bestätigt werden'], ['Spontanäußerung', 'sie mit den ungefragten Äußerungen beim Eintreffen übereinstimmen'], ['pauschal bestritten', `${bsNom(d)} die Vorwürfe nur pauschal bestritten hat`], ['Zustand', 'der Zustand beim Eintreffen der Schilderung entsprach']] },
        { t: 'head', text: 'Umstände und Warnsignale', h: 'Antippen wechselt: festgestellt → geschildert → angenommen → aus. Aus deinen Angaben übernommene Umstände sind gestrichelt markiert.' },
        { k: 'prog.f', t: 'marks', l: '', groups: () => FAK_GRUPPEN.map(([g, t]) => [t, FAK.filter(f => f.g === g).map(f => [f.k, f.l])]), auto: autoMarks },
        { k: 'prog.fGrund', t: 'text', l: 'Worauf stützen sich die Annahmen?', pre: 'Diese Annahmen stützen sich auf', ph: 'das Verhalten beim Eintreffen und die Angaben der Nachbarin', max: 300, when: d => anyMark(d, 'annahme') },
        satzFeld('prog.fFrei', 'Weiterer Umstand', 'Der Beschuldigte hatte bereits seine Sachen gepackt, kehrte aber zweimal zurück.'),
        { t: 'head', text: 'Textbausteine für die besondere Lage', h: 'Fertige Absätze – antippen fügt sie der Prognose hinzu. In der Vorschau prüfen, ob sie passen.' },
        { k: 'prog.bst', t: 'multi', l: '', o: BST.map(b => [b.k, b.l]) },
        { k: 'prog.wechselGrund', t: 'text', l: 'Warum geht die Gefahr von dieser Person aus?', pre: d => `Die Gefahr geht von ${main(d, 'bs').dat} aus, weil`, ph: 'das Verletzungsbild auf ein Angriffs- und nicht auf ein Abwehrgeschehen hindeutet', join: ' und ', max: 300, sugg: [['Verletzungsbild', 'das Verletzungsbild auf ein Angriffs- und nicht auf ein Abwehrgeschehen hindeutet'], ['Zeugen', 'unbeteiligte Zeugen den Ablauf bestätigen'], ['Vorgeschichte', 'die Vorgeschichte frühere Übergriffe allein von dieser Seite belegt']], when: d => inc(d, 'prog.bst', 'wechselseitig') },
        { k: 'prog.eigen', t: 'area', rows: 3, l: 'Eigene Bewertung (optional)', ph: 'Was die Lage heute besonders macht – in ganzen Sätzen.', max: 2000 },
        { t: 'head', text: 'Ergebnis' },
        { k: 'prog.gefahr', t: 'yn', l: 'Gegenwärtige Gefahr für Leib, Leben oder Freiheit?', req: true, h: 'Die Einwirkung hat begonnen oder steht in allernächster Zeit mit an Sicherheit grenzender Wahrscheinlichkeit bevor.' },
        { k: 'prog.warum', t: 'text', l: 'Warum drohen weitere Übergriffe in allernächster Zeit?', req: true, h: '„Weitere Streitigkeiten nicht ausgeschlossen“ genügt nicht. Die Vorschläge kommen aus den markierten Umständen.', pre: 'Mit weiteren Übergriffen ist in allernächster Zeit zu rechnen, weil', ph: 'es bereits wiederholt zu Übergriffen gekommen ist und beide ohne die Maßnahme weiter in derselben Wohnung zusammenträfen', join: ' und ', max: 600, sugg: d => { const x = { G: main(d, 'gs'), T: main(d, 'bs'), d }; return [...marked(d).map(([f]) => [f.l, f.weil(x)]), ['gemeinsame Wohnung', 'beide ohne die Maßnahme weiter in derselben Wohnung zusammenträfen'], ['Intensität', 'der heutige Angriff von erheblicher Intensität war']]; }, when: d => get(d, 'prog.gefahr') === 'ja' },
        { k: 'prog.warumNicht', t: 'text', l: 'Warum nicht?', pre: 'Eine gegenwärtige Gefahr war nicht festzustellen, weil', ph: 'es bei einem verbalen Streit geblieben ist und keine Anhaltspunkte für frühere Übergriffe vorliegen', join: ' und ', max: 400, sugg: [['nur verbal', 'es bei einem verbalen Streit geblieben ist'], ['keine Vorgeschichte', 'keine Anhaltspunkte für frühere Übergriffe vorliegen'], ['nicht aufklärbar', 'sich nicht aufklären ließ, von wem die Gewalt ausging'], ['ausgezogen', 'die geschädigte Person die Wohnung dauerhaft verlassen hat']], when: d => get(d, 'prog.gefahr') === 'nein' }
      ]
    },

    /* ---------- Maßnahmen ---------- */
    {
      id: 'wv', phase: 'Maßnahmen', title: 'Wohnungsverweisung und Rückkehrverbot', lead: '§ 34a PolG NRW: Bereich genau bezeichnen, Enddatum nennen, milderes Mittel begründen.', gen: ['wv', 'eroeffnung', 'abwesend'],
      fields: [
        { k: 'wv.angeordnet', t: 'yn', l: d => (bsWeg(d) ? 'Wird ein Rückkehrverbot angeordnet?' : 'Wird die Wohnungsverweisung mit Rückkehrverbot angeordnet?'), req: true, o: [['ja', 'Ja'], ['nein', 'Nein, abgesehen']] },
        { t: 'info', when: d => wvJa(d) && (get(d, 'prog.gefahr') === 'nein' || nurVerbal(d)), text: 'Achtung: Die Gefahrenprognose ist verneint oder es steht nur verbaler Streit im Raum. So wird die Verfügung vor Gericht voraussichtlich nicht halten.' },
        { t: 'info', when: d => wvJa(d) && ['besuch', 'bsAuszug'].includes(get(d, 'lage.wohnt')), text: 'Die Person wohnt nach deiner Angabe nicht in der Wohnung. § 34a ist dann unsicher – sicherer sind Platzverweis und Betretungsverbot nach § 34 PolG NRW.' },
        { t: 'info', when: d => wvJa(d) && bsDa(d) && !inc(d, 'anh.inh', 'vorwurf'), text: 'Die Anhörung ist noch nicht vermerkt. Erst die Vorwürfe mitteilen und Gelegenheit zur Äußerung geben, dann anordnen (OVG NRW 5 A 3548/20).' },
        { t: 'info', when: d => wvJa(d) && ofRole(d, 'gs').some(y => y.p.bleibt === 'weg'), text: 'Die geschädigte Person hat die Wohnung dauerhaft verlassen. Dann fehlt die Erforderlichkeit; § 34a schützt die Person in der Wohnung, in der sie wohnt.' },
        { k: 'wv.von', t: 'crewpick', l: 'Angeordnet durch', when: wvJa },
        { k: 'wv.datum', t: 'date', l: 'Tag der Anordnung', w: 'half', q: 'heute', when: wvJa },
        { k: 'wv.zeit', t: 'time', l: 'Uhrzeit der Anordnung', w: 'half', q: 'jetzt', req: true, when: wvJa },
        { k: 'wv.orte', t: 'multi', l: 'Räumlicher Bereich', req: true, h: 'Äußere Grenze ist die Wohnung mit ihrer unmittelbaren Umgebung. Straße, Kita oder Arbeitsplatz der geschädigten Person deckt § 34a nicht.', o: [['wohnung', 'Wohnung'], ['flur', 'Hausflur / Treppenhaus'], ['keller', 'Keller'], ['speicher', 'Dachboden'], ['garage', 'Garage / Stellplatz'], ['garten', 'Garten'], ['grundstueck', 'Gesamtes Grundstück mit Zuwegung']], when: wvJa },
        { k: 'wv.weitere', t: 'list', l: 'Weitere Örtlichkeiten', item: 'Örtlichkeit', add: 'Weitere Örtlichkeit hinzufügen', max: 5, when: wvJa, sub: [
          { k: 'ort', t: 'text', l: 'Bezeichnung', pre: 'sowie', ph: 'den Tiefgaragenstellplatz Nr. 12' },
          { k: 'grund', t: 'text', l: 'Warum gehört das dazu? (ein Satz)', pre: 'Dieser Bereich ist einbezogen, weil', ph: 'die geschädigte Person ihn täglich auf dem Weg zur Wohnung nutzt' }
        ] },
        { k: 'wv.dauer', t: 'choice', l: 'Dauer', req: true, o: [['14', '14 Tage (Regel)'], ['kuerzer', 'Ausnahmsweise kürzer']], when: wvJa },
        { k: 'wv.ende', t: 'date', l: 'Letzter Tag der Geltung', w: 'half', when: d => wvJa(d) && get(d, 'wv.dauer') === 'kuerzer' },
        { k: 'wv.dauerGrund', t: 'text', l: 'Grund der kürzeren Dauer', pre: 'Die Dauer wurde verkürzt, weil', ph: 'die geschädigte Person zum Monatsende in ihre eigene Wohnung umzieht', when: d => wvJa(d) && get(d, 'wv.dauer') === 'kuerzer' },
        { t: 'info', when: d => wvJa(d) && has(wvTag(d)), text: d => `Fristrechner: Das Verbot endet mit Ablauf des ${fmtDate(wvEnde(d))} (24 Uhr). Wird bis dahin zivilgerichtlicher Schutz beantragt, verlängert es sich bis zur Entscheidung, längstens bis ${fmtDate(wvMax(d))}.` },
        { k: 'wv.mittel', t: 'text', l: 'Warum reichte kein milderes Mittel?', req: true, pre: 'Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil', ph: d => `${erBs(d)} ein freiwilliges Verlassen der Wohnung ablehnte`, join: ' und ', max: 400, sugg: d => [['lehnt ab', `${erBs(d)} ein freiwilliges Verlassen der Wohnung ablehnte`], ['nicht glaubhaft', `${seinBs(d)}e Zusage, freiwillig zu gehen, angesichts ${seinBs(d)}es Verhaltens nicht glaubhaft war`], ['Gefährderansprache', 'eine bloße Gefährderansprache die Gefahr in der gemeinsamen Wohnung nicht beseitigt hätte'], ['GS bleibt', `${main(d, 'gs').dat}${kinderDa(d) ? ' und den Kindern' : ''} ein Verlassen der Wohnung nicht zuzumuten ist`]], when: wvJa },
        { k: 'wv.grund', t: 'choice', l: 'Warum wird abgesehen?', req: true, o: [['gefahr', 'Keine gegenwärtige Gefahr'], ['verbal', 'Nur verbaler Streit'], ['wohnt', 'Person lebt nicht in der Wohnung'], ['weg', 'Geschädigte Person hat die Wohnung verlassen'], ['unklar', 'Nicht aufklärbar, von wem die Gefahr ausgeht'], ['freiwillig', 'Glaubhaft freiwilliger Auszug']], when: wvNein },
        { k: 'wv.grundText', t: 'text', l: 'Anderer Grund oder Ergänzung (optional)', pre: 'Abgesehen wurde, weil', ph: 'beide übereinstimmend schilderten, dass es bei einem lauten Wortwechsel geblieben ist', max: 240, when: wvNein },
        { k: 'wv.alt', t: 'multi', l: 'Stattdessen getroffen', o: [['platz', 'Platzverweis (§ 34 Abs. 1)'], ['betret', 'Betretungsverbot angeregt (§ 34 Abs. 2)'], ['anspr', 'Gefährderansprache'], ['trennung', 'Freiwillige räumliche Trennung'], ['gewahrsam', 'Gewahrsam (§ 35 Abs. 1 Nr. 2)']], when: wvNein },
        { k: 'wv.altText', t: 'text', l: 'Ergänzung (optional)', pre: 'Im Einzelnen:', ph: 'Er begab sich für die Nacht freiwillig zu seinem Bruder', when: wvNein }
      ]
    },
    {
      id: 'eroeffnung', phase: 'Maßnahmen', title: 'Eröffnung und Vollzug', lead: 'Was der beschuldigten Person eröffnet und erklärt wurde – daraus entsteht der große Textbaustein. „Vollständig nach Vordruck“ setzt alle Standardinhalte; einzelne lassen sich abwählen.', gen: ['eroeffnung'], when: d => wvJa(d) && bsDa(d),
      fields: [
        { k: 'er.zeit', t: 'time', l: 'Uhrzeit der Eröffnung', q: 'jetzt', w: 'half' },
        { t: 'preset', l: 'Schnellwahl', o: () => [['Vollständig nach Vordruck', { 'er.inh': ER_STD.slice() }, 'Anordnung, Bereich, Ende, Gründe, Gegenstände, Anschrift, Schlüssel, Zwangsgeld, Hinweise']] },
        { k: 'er.inh', t: 'multi', l: 'Eröffnet und erklärt', o: O(ER) },
        { k: 'er.zgHoehe', t: 'euro', l: 'Höhe des Zwangsgeldes', w: 'half', q: [250, 500, 1000], min: 5, max: 2500, when: d => inc(d, 'er.inh', 'zg') },
        { k: 'er.gegenst', t: 'text', l: 'Mitgenommen (optional)', pre: d => `${ErBs(d)} nahm mit:`, ph: 'Kleidung, Hygieneartikel, Medikamente und Arbeitsunterlagen', join: ', ', max: 240, sugg: [['Kleidung', 'Kleidung'], ['Hygiene', 'Hygieneartikel'], ['Medikamente', 'Medikamente'], ['Ausweis', 'Ausweispapiere'], ['Arbeit', 'Arbeitsunterlagen'], ['Handy-Ladegerät', 'ein Ladegerät für das Mobiltelefon']], when: d => inc(d, 'er.inh', 'gegenst') },
        { k: 'er.anschrift', t: 'text', l: 'Benannte Anschrift (optional)', pre: d => `${ErBs(d)} benannte`, ph: 'als Anschrift für Zustellungen Musterweg 3, 48282 Emsdetten', max: 200, sugg: [['keine', 'trotz Aufforderung weder eine Anschrift noch eine zustellungsbevollmächtigte Person']], when: d => inc(d, 'er.inh', 'anschrift') },
        { t: 'head', text: 'Schlüssel' },
        { k: 'er.schluessel', t: 'choice', l: 'Haus- und Wohnungsschlüssel', o: [['sicher', 'Herausgegeben, sichergestellt'], ['weg', 'Nach Weigerung weggenommen, sichergestellt'], ['keine', 'Besitzt keine Schlüssel'], ['nicht', 'Nicht auffindbar']] },
        { k: 'er.schluesselAnz', t: 'number', l: 'Anzahl', min: 1, max: 20, w: 'half', q: [1, 2, 3], when: d => ['sicher', 'weg'].includes(get(d, 'er.schluessel')) },
        { k: 'er.schluesselBesch', t: 'yn', l: 'Bescheinigung ausgehändigt (§ 44 Abs. 2 PolG NRW)?', w: 'half', when: d => ['sicher', 'weg'].includes(get(d, 'er.schluessel')) },
        { t: 'head', text: 'Schriftliche Bestätigung der Verfügung' },
        { k: 'er.schrift', t: 'choice', l: 'Schriftstück mit Zwangsgeldandrohung', req: true, h: 'Die Androhung des Zwangsgeldes muss zugestellt werden (§ 56 Abs. 6 PolG NRW).', o: [['vorort', 'Vor Ort gegen Empfangsbekenntnis ausgehändigt'], ['verweigert', 'Annahme verweigert'], ['wache', 'Liegt auf der Wache zur Abholung'], ['post', 'Wird förmlich zugestellt'], ['offen', 'Noch offen']] },
        { k: 'er.schriftZeit', t: 'time', l: 'Uhrzeit', q: 'jetzt', w: 'half', when: d => ['vorort', 'verweigert'].includes(get(d, 'er.schrift')) },
        { k: 'er.wache', t: 'text', l: 'Welche Wache?', ph: 'z. B. Polizeiwache Rheine', w: 'half', recent: true, max: 80, when: d => get(d, 'er.schrift') === 'wache' },
        { t: 'info', when: d => nachtEr(d) && ['vorort', 'verweigert'].includes(get(d, 'er.schrift')), text: 'Zwischen 21 und 6 Uhr sowie an Sonn- und Feiertagen braucht die Zustellung die Erlaubnis der Behördenleitung. Fehlt sie, ist die Zustellung nur wirksam, wenn die Annahme nicht verweigert wird (§ 5 Abs. 3 LZG NRW).' },
        { k: 'er.erlaubnis', t: 'choice', l: 'Erlaubnis der Behördenleitung (Nacht / Sonn- und Feiertag)', o: [['ja', 'Liegt vor'], ['nein', 'Liegt nicht vor'], ['unklar', 'Unklar']], when: d => nachtEr(d) && ['vorort', 'verweigert'].includes(get(d, 'er.schrift')) },
        { t: 'head', text: 'Reaktion und Verlassen der Wohnung' },
        { k: 'er.reaktion', t: 'choice', l: 'Reaktion auf die Maßnahme', o: [['ok', 'Ohne Widerspruch hingenommen'], ['widerspruch', 'Widersprochen'], ['text', 'Hat sich geäußert']] },
        { k: 'er.reaktionText', t: 'text', l: 'Äußerung (optional)', pre: d => `${ErBs(d)} äußerte,`, lint: 'konj', ph: 'das sei seine Wohnung, er werde morgen einen Anwalt einschalten', max: 300, when: d => ['widerspruch', 'text'].includes(get(d, 'er.reaktion')) },
        { k: 'er.verlassen', t: 'choice', l: 'Wie hat die Person die Wohnung verlassen?', req: true, o: [['freiwillig', 'Freiwillig'], ['zwang', 'Erst nach unmittelbarem Zwang'], ['gewahrsam', 'In Gewahrsam genommen'], ['festnahme', 'Vorläufig festgenommen']] },
        { k: 'er.verlassenZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt' },
        { k: 'er.wohin', t: 'text', l: 'Wohin? (optional)', pre: d => `${ErBs(d)} begab sich nach eigenen Angaben`, ph: d => `zu ${seinBs(d)}em Bruder nach Emsdetten`, max: 160, when: d => get(d, 'er.verlassen') === 'freiwillig' },
        satzFeld('er.text', 'Ergänzung zum Vollzug', d => `${ErBs(d)} übergab außerdem den Handsender für die Tiefgarage.`)
      ]
    },
    {
      id: 'abwesend', phase: 'Maßnahmen', title: 'Bekanntgabe und Zustellung', lead: 'Das Rückkehrverbot wirkt erst mit der Bekanntgabe. Die Zwangsgeldandrohung muss zugestellt werden. Ist die Person erreichbar: erst belehren und anhören, dann entscheiden.', gen: ['abwesend'], when: d => wvJa(d) && bsWeg(d),
      fields: [
        { t: 'head', text: 'Erreichbarkeit und Anhörung' },
        { k: 'abw.erreichbar', t: 'choice', l: 'Ist die Person erreichbar?', req: true, o: [['telefon', 'Telefonisch'], ['ort', 'Aufenthaltsort bekannt, aufgesucht'], ['nein', 'Nicht erreichbar']] },
        { k: 'abw.anh', t: 'choice', l: 'Belehrt und angehört – vor der Entscheidung?', req: true, h: 'Vor jedem Wort zur Sache als Beschuldigte/n belehren (§ 136 StPO), dann die Vorwürfe mitteilen.', o: [['ja', 'Ja'], ['nein', 'Noch nicht']], when: d => ['telefon', 'ort'].includes(get(d, 'abw.erreichbar')) },
        { k: 'abw.anhZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', when: d => get(d, 'abw.anh') === 'ja' },
        { k: 'abw.telInh', t: 'multi', l: 'Am Telefon gesichert', o: [['nummer', 'Rufnummer aus eigenen Angaben / Abgleich'], ['identitaet', 'Identität durch Kontrollfragen geprüft'], ['bereich', 'Bereich und Ende genannt'], ['zg', 'Auf Zwangsgeld hingewiesen']], when: d => get(d, 'abw.erreichbar') === 'telefon' },
        { k: 'abw.anhText', t: 'text', l: 'Äußerung (optional)', pre: d => `${ErBs(d)} äußerte,`, lint: 'konj', ph: 'es habe keinen Übergriff gegeben; er komme heute nicht mehr nach Hause', max: 300, sugg: [['keine Äußerung', 'sich zur Sache nicht äußern zu wollen']], when: d => get(d, 'abw.anh') === 'ja' },
        { k: 'abw.bekannt', t: 'choice', l: 'Ist das Rückkehrverbot bekanntgegeben?', req: true, o: [['pers', 'Ja, persönlich'], ['tel', 'Ja, telefonisch'], ['nein', 'Noch nicht']] },
        { k: 'abw.bekanntZeit', t: 'time', l: 'Uhrzeit der Bekanntgabe', w: 'half', q: 'jetzt', when: d => ['pers', 'tel'].includes(get(d, 'abw.bekannt')) },
        { t: 'info', when: d => get(d, 'abw.bekannt') === 'nein', text: 'Bis zur Bekanntgabe wirkt das Verbot nicht: kein Zwangsgeld, kein Gewahrsam nach § 35 Abs. 1 Nr. 4. Kehrt die Person zurück, ist es vor Ort zu eröffnen.' },
        { t: 'head', text: 'Schriftliche Verfügung mit Zwangsgeldandrohung' },
        { k: 'abw.zgHoehe', t: 'euro', l: 'Angedrohtes Zwangsgeld', w: 'half', q: [250, 500, 1000], min: 5, max: 2500 },
        { k: 'abw.zust', t: 'choice', l: 'Wie wurde zugestellt?', req: true, o: [['pers', 'Persönlich gegen Empfangsbekenntnis'], ['briefkasten', 'Ersatzzustellung: in den Briefkasten der Wohnung'], ['niederlegung', 'Niederlegung auf der Wache, Mitteilung an der Tür'], ['hinweis', 'Nur Hinweis an der Tür: auf der Wache melden'], ['post', 'Per Post mit Zustellungsurkunde'], ['offen', 'Noch offen']] },
        { t: 'info', when: d => ['briefkasten', 'niederlegung'].includes(get(d, 'abw.zust')), text: 'Ersatzzustellung (§ 5 Abs. 2 LZG NRW i. V. m. §§ 180, 181 ZPO) setzt voraus, dass es noch die Wohnung der Person ist. Für die Wohnung, aus der sie gerade verwiesen wird, ist das gerichtlich nicht geklärt. Reihenfolge: Niederlegung nur, wenn das Einlegen in den Briefkasten nicht möglich ist. Beim Antreffen zusätzlich persönlich gegen Empfangsbekenntnis aushändigen.' },
        { k: 'abw.zustGrund', t: 'choice', l: 'Warum nicht in den Briefkasten?', o: [['keinbk', 'Kein Briefkasten vorhanden'], ['zuordnung', 'Briefkasten nicht eindeutig zuzuordnen'], ['unzug', 'Briefkasten nicht zugänglich']], when: d => get(d, 'abw.zust') === 'niederlegung' },
        { k: 'abw.zustGrundText', t: 'text', l: 'Anderer Grund (optional)', pre: 'Das Einlegen in den Briefkasten war nicht möglich, weil', ph: 'der Briefkasten beschädigt war', max: 200, when: d => get(d, 'abw.zust') === 'niederlegung' },
        { k: 'abw.mitteilung', t: 'choice', l: 'Mitteilung über die Niederlegung', o: [['tuer', 'An der Wohnungstür angeheftet'], ['bk', 'In den Briefkasten eingelegt']], when: d => get(d, 'abw.zust') === 'niederlegung' },
        { k: 'abw.wache', t: 'text', l: 'Welche Wache?', ph: 'z. B. Polizeiwache Rheine', w: 'half', recent: true, max: 80, when: d => ['niederlegung', 'hinweis'].includes(get(d, 'abw.zust')) },
        { k: 'abw.zustZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', when: d => ['pers', 'briefkasten', 'niederlegung', 'hinweis'].includes(get(d, 'abw.zust')) },
        { t: 'info', when: d => nachtAbw(d) && ['pers', 'briefkasten', 'niederlegung'].includes(get(d, 'abw.zust')), text: 'Zustellung zur Nachtzeit (21–6 Uhr) oder an Sonn- und Feiertagen nur mit Erlaubnis der Behördenleitung (§ 5 Abs. 3 LZG NRW).' },
        { k: 'abw.erlaubnis', t: 'choice', l: 'Erlaubnis der Behördenleitung', o: [['ja', 'Liegt vor'], ['nein', 'Liegt nicht vor'], ['unklar', 'Unklar']], when: d => nachtAbw(d) && ['pers', 'briefkasten', 'niederlegung'].includes(get(d, 'abw.zust')) },
        { t: 'head', text: 'Schlüssel und weitere Maßnahmen' },
        { k: 'abw.schluessel', t: 'choice', l: 'Schlüssel', o: [['spaeter', 'Werden beim Antreffen sichergestellt'], ['schloss', 'Schlosswechsel empfohlen'], ['sicher', 'Bereits sichergestellt']] },
        { k: 'abw.weiter', t: 'multi', l: 'Veranlasst', o: [['folge', 'Folgeschicht beauftragt'], ['streife', 'Wohnung wird bestreift'], ['fahndung', 'Nahbereichsfahndung']] },
        satzFeld('abw.weiterText', 'Weitere Maßnahmen', 'Die Anschrift der Eltern wurde aufgesucht; dort wurde die Person nicht angetroffen.')
      ]
    },
    {
      id: 'zwang', phase: 'Maßnahmen', title: 'Zwang und Gewahrsam', lead: 'Zwang nur nach Androhung. Gewahrsam nur, wenn unerlässlich – und unverzüglich zum Richter.', gen: ['zwang'], when: zwang,
      fields: [
        { k: 'zw.androhung', t: 'yn', l: 'Unmittelbarer Zwang vorher angedroht (§ 61 PolG NRW)?', req: true },
        { k: 'zw.art', t: 'multi', l: 'Angewendet', o: [['einfach', 'Einfache körperliche Gewalt'], ['fessel', 'Fesselung']] },
        { k: 'zw.fesselGrund', t: 'text', l: 'Anlass der Fesselung', pre: 'Die Fesselung war erforderlich, weil', ph: d => `${erBs(d)} nach den Beamten schlug und sich loszureißen versuchte`, when: d => inc(d, 'zw.art', 'fessel') },
        satzFeld('zw.text', 'Ergänzung zum Zwang', d => `${ErBs(d)} wurde mit einem Armhebel zu Boden gebracht und dort fixiert.`),
        { k: 'zw.verletzt', t: 'choice', l: 'Verletzungen durch den Zwang?', o: [['nein', 'Keine'], ['bs', 'Beschuldigte Person'], ['beamte', 'Einsatzkräfte']] },
        { k: 'gew.zeit', t: 'time', l: 'Zeitpunkt der Ingewahrsamnahme', w: 'half', q: 'jetzt', req: true, when: gewahrsam },
        { k: 'gew.grund', t: 'text', l: 'Warum unerlässlich?', req: true, pre: 'Der Gewahrsam war unerlässlich, weil', ph: d => `${erBs(d)} ankündigte, sofort in die Wohnung zurückzukehren`, join: ' und ', sugg: d => [['Ankündigung', `${erBs(d)} ankündigte, sofort in die Wohnung zurückzukehren`], ['zurückgekehrt', `${erBs(d)} nach dem Verlassen umgehend zurückkehrte`], ['aggressiv', `${erBs(d)} hochaggressiv war und sich nicht beruhigen ließ`], ['früher verstoßen', `${erBs(d)} bereits früher gegen ein Rückkehrverbot verstoßen hat`]], when: gewahrsam },
        { k: 'gew.erledigt', t: 'multi', l: 'Erledigt', req: true, o: [['grund', 'Grund bekanntgegeben'], ['benachr', 'Benachrichtigung einer Vertrauensperson ermöglicht'], ['merkblatt', 'Merkblatt ausgehändigt'], ['faehig', 'Gewahrsamsfähigkeit geprüft']], when: gewahrsam },
        { k: 'gew.richter', t: 'choice', l: 'Richterliche Entscheidung', req: true, h: 'Unverzüglich – der Hinweis auf Dienstschluss genügt nicht (BVerfG 2 BvR 2292/00). Jede Bemühung mit Uhrzeit.', o: [['beantragt', 'Beantragt'], ['fortdauer', 'Fortdauer angeordnet'], ['abgelehnt', 'Abgelehnt – entlassen'], ['offen', 'Noch nicht']], when: gewahrsam },
        { k: 'gew.richterZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', when: d => gewahrsam(d) && ['beantragt', 'fortdauer', 'abgelehnt'].includes(get(d, 'gew.richter')) },
        { k: 'gew.ag', t: 'text', l: 'Amtsgericht', ph: 'z. B. AG Rheine', w: 'half', recent: true, when: d => gewahrsam(d) && ['beantragt', 'fortdauer', 'abgelehnt'].includes(get(d, 'gew.richter')) }
      ]
    },
    {
      id: 'straf', phase: 'Maßnahmen', title: 'Strafverfahren und Beweise', lead: 'Anzeige von Amts wegen – auch gegen den Wunsch der geschädigten Person.', gen: ['straf'],
      fields: [
        { k: 'straf.delikte', t: 'multi', l: 'Strafanzeige wegen', req: true, o: Object.entries(DELIKT_KURZ) },
        frei('straf.delikteFrei', 'sowie wegen des Verdachts', 'des Hausfriedensbruchs (§ 123 StGB)', { l: 'Weitere Delikte (optional)' }),
        { k: 'straf.beweise', t: 'multi', l: 'Beweise gesichert', o: [['notruf', 'Notrufsicherung veranlasst'], ['wohnung', 'Lichtbilder der Wohnung'], ['tatmittel', 'Tatmittel sichergestellt'], ['handy', 'Mobiltelefon sichergestellt'], ['bodycam', 'Bodycam-Aufnahme'], ['kleidung', 'Kleidung gesichert']] },
        { k: 'straf.tatmittel', t: 'text', l: 'Welches Tatmittel?', pre: 'Als Tatmittel wurde sichergestellt:', ph: 'ein Küchenmesser mit ca. 15 cm Klingenlänge', when: d => inc(d, 'straf.beweise', 'tatmittel') },
        satzFeld('straf.beweiseText', 'Weitere Beweise', 'Chatverläufe auf dem Mobiltelefon der Geschädigten wurden mit ihrer Einwilligung fotografiert.'),
        { t: 'info', when: d => inc(d, 'straf.beweise', 'bodycam'), text: 'Bodycam in Wohnungen nur bei dringender Gefahr für Leib oder Leben (§ 15c Abs. 2 PolG NRW). Vor jeder Verwendung die richterliche Feststellung der Rechtmäßigkeit beantragen; Einsatz dokumentieren.' },
        { k: 'straf.blut', t: 'choice', l: 'Blutprobe bei der beschuldigten Person', h: 'Richtervorbehalt (§ 81a Abs. 2 StPO) – die Ausnahme gilt nur für Verkehrsdelikte.', o: [['nein', 'Keine'], ['richter', 'Richterlich angeordnet'], ['eil', 'Eilanordnung – Richter nicht erreichbar']], when: d => bsDa(d) && ((bsY(d) || {}).p || {}).konsum === 'ja' },
        { k: 'straf.blutZeit', t: 'time', l: 'Uhrzeit des Versuchs / der Anordnung', w: 'half', q: 'jetzt', when: d => bsDa(d) && ['richter', 'eil'].includes(get(d, 'straf.blut')) },
        { k: 'straf.az', t: 'text', l: 'Vorgangsnummer (optional)', ph: 'z. B. 261109-2145-012345', w: 'half' }
      ]
    },

    /* ---------- Abschluss ---------- */
    {
      id: 'opfer', phase: 'Abschluss', title: 'Opferschutz und Kinder', lead: 'Hinweise und Unterlagen für die geschädigte Person – abhaken, was erledigt ist.', gen: ['opfer'],
      fields: [
        { t: 'preset', l: 'Schnellwahl', o: () => [['Standardhinweise', { 'os.hinweise': OS_STD.slice() }, 'GewSchG, Beratung, Datenweitergabe, Dokumentation, Merkblatt, Verletztenrechte, 110']] },
        { k: 'os.hinweise', t: 'multi', l: 'Erledigt', req: true, o: d => O(OS).map(([k, l]) => [k, k === 'gewschg' && wvJa(d) ? 'Zivilgerichtlicher Schutz erklärt (Antrag verlängert das Verbot)' : l]) },
        { k: 'os.einwilligung', t: 'yn', l: 'Einwilligung in die Weitergabe von Name, Anschrift, Telefonnummer?', h: 'Nur mit Einwilligung (§ 34a Abs. 4 PolG NRW).', when: d => inc(d, 'os.hinweise', 'daten') },
        { k: 'os.stelle', t: 'text', l: 'Beratungsstelle', ph: 'z. B. Frauenberatungsstelle Rheine', recent: true, when: d => inc(d, 'os.hinweise', 'beratung') || inc(d, 'os.hinweise', 'daten') },
        { k: 'os.verbleib', t: 'choice', l: 'Wo bleibt die geschädigte Person?', o: [['wohnung', 'In der Wohnung'], ['frauenhaus', 'Schutzeinrichtung'], ['dritte', 'Bei Verwandten / Bekannten']] },
        { t: 'info', when: d => ['frauenhaus', 'dritte'].includes(get(d, 'os.verbleib')), text: 'Eine Schutzanschrift gehört nicht in die Ermittlungsakte und nicht in diesen Text – über die Akteneinsicht gelangt sie sonst zur beschuldigten Person.' },
        satzFeld('os.text', 'Weitere Hinweise oder Maßnahmen', 'Ein Platz in einer Schutzeinrichtung wurde vermittelt.'),
        { t: 'head', text: 'Kinder', when: kinderDa },
        { k: 'kind.betreuung', t: 'choice', l: 'Betreuung nach dem Einsatz', req: true, o: d => [['gs', `Bei ${main(d, 'gs').dat}`], ['dritte', 'Bei Verwandten / Nachbarn'], ['jugendamt', 'Durch das Jugendamt untergebracht']], when: kinderDa },
        { k: 'kind.jugendamt', t: 'choice', l: 'Jugendamt', req: true, o: [['sofort', 'Bereitschaftsdienst verständigt'], ['bericht', 'Mitteilung wird gefertigt'], ['nein', 'Keine Mitteilung']], when: kinderDa },
        { k: 'kind.jugendamtZeit', t: 'time', l: 'Uhrzeit der Verständigung', w: 'half', q: 'jetzt', when: d => kinderDa(d) && get(d, 'kind.jugendamt') === 'sofort' },
        satzFeld('kind.text', 'Ergänzung zu den Kindern', 'Die Großmutter holte die Kinder ab.', { when: kinderDa })
      ]
    },
    {
      id: 'abschluss', phase: 'Abschluss', title: 'Personalien und Abschluss', lead: 'Personalien stehen nur im eigenen Reiter – im Sachverhalt stehen die Rollen. Letzter Blick: alles bekanntgegeben, alles vermerkt.', gen: ['abschluss'],
      fields: [
        { k: 'pers', t: 'list', fixed: true, l: 'Personalien', item: (it, i) => pl(it, i), only: () => true, empty: 'Keine Personen erfasst.', sub: [
          { k: 'p', t: 'person', l: 'Personalien', fields: ['nachname', 'vorname', 'geb', 'anschrift', 'tel'] }
        ] },
        { k: 'ab.erledigt', t: 'multi', l: 'Erledigt', o: d => [['gb', 'Gefährdungsbewertung gefertigt'], ...(wvJa(d) ? [['kontrolle', 'Kontrolle des Rückkehrverbots vorgemerkt'], ['folge', 'Folgeschichten informiert']] : []), ...(markOf(d, 'waffenzugang') ? [['waffen', 'Waffenbehörde unterrichtet']] : []), ['abgleich', 'Anzeige, Verfügung und Dokumentation abgeglichen'], ['sb', 'An die Sachbearbeitung übergeben']] },
        { k: 'einsatz.endeZeit', t: 'time', l: 'Einsatzende', w: 'half', q: 'jetzt' },
        { k: 'ab.text', t: 'area', rows: 3, l: 'Bemerkungen (optional)', ph: 'Was sonst noch in den Sachverhalt gehört – in ganzen Sätzen.', max: 2000 },
        { k: 'meta.klarnamen', t: 'yn', l: 'Klarnamen im Text verwenden?', h: 'Ohne Klarnamen stehen im Text nur die Rollen; die Personalien stehen gesondert.', o: [['nein', 'Nein, nur Rollen'], ['ja', 'Ja']] }
      ]
    }
  ];

  root.WHG_STEPS = STEPS;
  root.WHG_CORE = {
    get, str, has, arr, inc, cap, endDot, slot, satz, mit, joinList, fmtDate, fmtTime, PH, um, addDays, hasObj, pick, val,
    NOUN, PRON, plist, isP, ofRole, gOf, ref, main, pl, kdesc, zvrOf, zvrNr, bsY, bsDa, bsWeg, kinderL, kinderDa, verletzte, nurVerbal, zutrittGegen,
    wvJa, wvNein, gewahrsam, zwang, wvTag, wvEnde, wvMax, nachtEr, nachtAbw, angehoerig, autoMarks, markOf, marked, anyMark,
    GEWALT, WAHRN, WAHRN_PL, VORG_PL, TATSACHEN, WO, ZUST, BES, VERL, RAUM, KIND_WO, SPUREN, ORTE, VORG, STUETZEN, DELIKT, DELIKT_TAT, BEL_Z, BEL_B, ANH, ER, OS, FAK, FAK_BY, BST_BY, WARN_ALT
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Textgenerator ======================= */
(function (root) {
  'use strict';
  const C = root.WHG_CORE;
  const { get, str, has, arr, inc, cap, endDot, slot, satz, mit, joinList, fmtDate, fmtTime, PH, um, hasObj, pick, ref, main, plist, isP, ofRole } = C;
  const P = (...xs) => xs.filter(has).join(' ');
  const B = (...xs) => xs.filter(has).join('\n\n');
  const ZAHL = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
  const euro = v => { const n = Number(v); return Number.isFinite(n) && has(v) ? n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €' : ''; };
  const quote = s => { s = str(s).replace(/\s+/g, ' ').replace(/^[„"“»«]+|[“"”»«]+$/g, '').trim(); return `„${/[.!?…]$/.test(s) ? s : s + '.'}“`; };
  const crewText = k => joinList(arr(k).filter(x => x && has(x.name)).map(x => [str(x.grad), str(x.name)].filter(Boolean).join(' ')));
  const durch = v => (has(v) ? ` durch ${str(v)}` : '');
  const dass = list => { const a = list.filter(Boolean).map(s => 'dass ' + s); if (a.length < 2) return a.join(''); return a.slice(0, -1).join(', ') + (/, /.test(a[a.length - 2]) ? ', und ' : ' und ') + a[a.length - 1]; };

  function ctx(d, o = {}) {
    const vfg = !!o.vfg;
    const G = main(d, 'gs', { vfg }), T = main(d, 'bs', { vfg });
    const or = get(d, 'ort') || {};
    const adr = [[str(or.strasse), str(or.hausnr)].filter(has).join(' '), str(or.stadt)].filter(has).join(', ');
    return { d, vfg, G, T, adr, da: C.bsDa(d), weg: C.bsWeg(d), wv: C.wvJa(d), ende: C.wvEnde(d), max: C.wvMax(d), R: i => ref(d, i, { vfg }) };
  }
  const people = (d, fn) => plist(d).map((p, i) => ({ p, i })).filter(y => isP(y.p) && fn(y.p));

  /* ---------- 1 Einsatzanlass ---------- */
  function s1(d, x) {
    const e = get(d, 'einsatz') || {};
    const crew = crewText(e.kraefte);
    const wer = has(e.rufname) ? `die Besatzung des Funkstreifenwagens ${str(e.rufname)}${crew ? ', besetzt mit ' + crew + ',' : ''}` : (crew ? `die Streifenwagenbesatzung ${crew}` : `die Streifenwagenbesatzung ${PH('Rufname, Besatzung')}`);
    const wann = `Am ${has(e.datum) ? fmtDate(e.datum) : PH('Datum')} gegen ${has(e.zeit) ? fmtTime(e.zeit) : PH('Uhrzeit')}`;
    const adr = x.adr || PH('Anschrift');
    const weg = { leitstelle: 'über die Leitstelle', telefon: 'nach telefonischer Mitteilung bei der Wache', wache: 'nach persönlicher Mitteilung auf der Wache' }[e.meldeweg] || '';
    const t = [];
    if (e.meldeweg === 'streife') t.push(`${wann} wurde ${wer} im Streifendienst auf eine Auseinandersetzung an der Anschrift ${adr} aufmerksam.`);
    else t.push(`${wann} erhielt ${wer}${weg ? ' ' + weg : ''} den Einsatz „Häusliche Gewalt“ zur Anschrift ${adr}.`);
    if (has(e.meldung)) t.push(`Gemeldet wurde, dass ${endDot(slot(e.meldung))}`);
    else if (has(e.meldungAlt)) t.push(`Gemeldet wurde: ${endDot(slot(e.meldungAlt))}`);
    if (e.meldeweg !== 'streife') t.push({ gs: `Die Meldung kam von ${x.G.dat} selbst.`, kind: 'Die Meldung kam von einem Kind aus dem Haushalt.', nachbar: 'Die Meldung kam aus der Nachbarschaft.', angehoerig: has(e.mitteilerText) ? `Die Meldung kam von ${slot(e.mitteilerText)}.` : 'Die Meldung kam von Angehörigen.', dritte: has(e.mitteilerText) ? `Die Meldung kam von ${slot(e.mitteilerText)}.` : 'Die Meldung kam von einer unbeteiligten Person.', bs: `Die Meldung kam von ${x.T.dat} selbst.`, unbekannt: 'Wer die Meldung abgesetzt hat, ist nicht bekannt.' }[e.mitteiler] || '');
    if (has(e.weitere)) t.push(`Zur Unterstützung waren außerdem eingesetzt: ${endDot(slot(e.weitere))}`);
    return P(...t);
  }

  /* ---------- 2 Eintreffsituation ---------- */
  function s21(d, x) {
    const e = get(d, 'einsatz') || {}, z = get(d, 'zutritt') || {}, t = [];
    if (has(e.eintreffZeit)) t.push(`Die Einsatzkräfte trafen um ${fmtTime(e.eintreffZeit)} an der Einsatzörtlichkeit ein.`);
    const w = arr(get(d, 'eintreff.wahrn'));
    const wk = w.filter(k => k !== 'ruhig' && C.WAHRN[k]), wl = pick(C.WAHRN, wk);
    if (wl.length) t.push(`Bereits vor der Wohnung ${wl.length > 1 || C.WAHRN_PL[wk[0]] ? 'waren' : 'war'} ${joinList(wl)} zu hören.`);
    else if (w.includes('ruhig')) t.push('Beim Eintreffen war aus der Wohnung nichts Auffälliges zu hören.');
    const werI = /^\d+$/.test(str(z.wer)) ? Number(z.wer) : -1;
    const wer = werI >= 0 && isP(plist(d)[werI]) ? x.R(werI).dat : z.wer === 'andere' ? (has(z.werText) ? slot(z.werText) : 'einer weiteren Person') : '';
    const tats = mit(pick(C.TATSACHEN, arr(z.tatsachen)), z.tatsachenFrei);
    const grund = `${tats.length ? `Für eine gegenwärtige Gefahr sprachen folgende Tatsachen: ${tats.join('; ')}. ` : PH('Tatsachen für die gegenwärtige Gefahr') + ' '}Die Wohnung wurde deshalb zur Abwehr einer gegenwärtigen Gefahr für Leib, Leben oder Freiheit einer Person gemäß § 41 Abs. 1 Satz 1 Nr. 4 PolG NRW betreten.`;
    if (z.art === 'einw') t.push(`Die Wohnungstür wurde ${wer ? 'von ' + wer + ' ' : ''}geöffnet; den Einsatzkräften wurde der Zutritt zur Wohnung gestattet.`);
    else if (z.art === 'draussen') t.push('Die Beteiligten wurden außerhalb der Wohnung angetroffen; ein Betreten der Wohnung war nicht erforderlich.');
    else if (z.art === 'verweigert') {
      t.push(`Die Wohnungstür wurde ${wer ? 'von ' + wer + ' ' : ''}geöffnet; der Zutritt wurde verweigert.`, grund);
      t.push({ aufforderung: 'Nach Aufforderung wurde das Betreten geduldet.', angedroht: 'Nach Androhung unmittelbaren Zwangs (§ 61 Abs. 1 PolG NRW) wurde das Betreten geduldet.', gewalt: 'Nach Androhung unmittelbaren Zwangs (§ 61 Abs. 1 PolG NRW) wurde der Zutritt gegen den Widerstand durchgesetzt.' }[z.zwang] || '');
    } else if (z.art === 'niemand') {
      t.push('Auf Klingeln und Klopfen wurde nicht geöffnet.', grund);
      t.push({ gewalt: 'Die Tür wurde nach Androhung unmittelbaren Zwangs (§ 61 Abs. 1 PolG NRW) gewaltsam geöffnet.', sofort: 'Die Tür wurde im Wege des Sofortvollzugs gewaltsam geöffnet (§ 50 Abs. 2 PolG NRW); eine Androhung unterblieb, weil die sofortige Anwendung des Zwangs zur Abwehr der gegenwärtigen Gefahr notwendig war (§ 61 Abs. 1 Satz 2 PolG NRW).', schluessel: 'Die Tür wurde durch eine dritte Person mit einem Schlüssel geöffnet.' }[z.zwang] || '');
    }
    if (C.zutrittGegen(d) && z.gesucht === 'ja') {
      const du = arr(z.durchs);
      t.push('In der Wohnung wurde gegen den Willen des Inhabers nach der gemeldeten Person gesucht (Durchsuchung, §§ 41, 42 PolG NRW).' + (du.includes('gefahr') ? ' Eine richterliche Anordnung konnte wegen Gefahr im Verzug nicht abgewartet werden.' : '') + (du.includes('grund') ? ' Der Grund der Durchsuchung wurde dem Inhaber bekanntgegeben.' : '') + (du.includes('niederschrift') ? ' Über die Durchsuchung wurde eine Niederschrift gefertigt.' : ''));
    }
    t.push(satz(z.text));
    return P(...t);
  }
  function konsum(p, r, mitTest) {
    const t = [];
    if (p.konsum === 'ja') {
      t.push(`Bei ${r.dat} ergaben sich Anzeichen für eine Beeinflussung durch Alkohol, Drogen oder Medikamente.` + (has(p.konsumText) ? ` Festgestellt wurden ${slot(p.konsumText)}.` : ''));
      if (mitTest && p.aat === 'ja') t.push(`Ein freiwilliger Atemalkoholtest${um(p.aatZeit)} ergab einen Wert von ${has(p.aatWert) ? String(p.aatWert).replace('.', ',') + (p.aatEinheit === 'mgl' ? ' mg/l' : p.aatEinheit === 'promille' ? ' ‰' : ' ' + PH('Einheit')) : PH('Wert')}.`);
      else if (mitTest && p.aat === 'verweigert') t.push(`Einen Atemalkoholtest lehnte ${r.er} ab.`);
      else if (mitTest && p.aat === 'nein') t.push('Ein Atemalkoholtest wurde nicht durchgeführt.');
    } else if (p.konsum === 'nein') t.push(`Anhaltspunkte für eine Beeinflussung ${r.gen} durch Alkohol, Drogen oder Medikamente ergaben sich nicht.`);
    return t.join(' ');
  }
  function s22(d, x) {
    const out = [];
    const order = [...people(d, p => p.rolle === 'gs'), ...people(d, p => p.rolle === 'bs'), ...people(d, p => p.rolle === 'zeuge')];
    for (const { p, i } of order) {
      const r = x.R(i);
      if (p.da === 'nein') {
        if (p.rolle === 'bs') out.push(P(`${r.Nom} wurde vor Ort nicht angetroffen.`, has(get(d, 'abw.verbleib')) ? `Nach Angaben ${x.G.gen} ${endDot(slot(get(d, 'abw.verbleib')))}` : ''));
        continue;
      }
      const t = [];
      const wo = C.WO[p.wo];
      const first = r.r === 'zeuge' && has(p.bez) ? `${r.Nom} (${str(p.bez)})${r.name ? `, ${r.name},` : ''}` : r.First;
      if (wo) t.push(`${first} wurde ${wo}${has(p.woText) ? ', ' + slot(p.woText) + ',' : ''} angetroffen.`);
      const zl = mit(pick(C.ZUST[p.rolle] || C.ZUST.zeuge, arr(p.zust), x), p.zustFrei);
      if (zl.length) t.push(`${t.length ? r.Er : first} ${joinList(zl)}.`);
      if (p.rolle === 'bs') t.push(...pick(C.BES, arr(p.bes), r), satz(p.besText));
      const k = konsum(p, r, true);
      if (k) t.push(k);
      if (has(p.spontan)) t.push(`${t.length ? r.Er : first} äußerte${um(p.spontanZeit)} ungefragt: ${quote(p.spontan)}`);
      if (t.length) out.push(P(...t));
    }
    const kids = people(d, p => p.rolle === 'kind' && p.da === 'ja').length;
    if (kids) out.push(`In der Wohnung ${kids === 1 ? 'befand sich außerdem ein Kind' : `befanden sich außerdem ${ZAHL[kids] || kids} Kinder`} (siehe Abschnitt Kinder im Haushalt).`);
    const so = arr(get(d, 'eintreff.sofort')).filter(k => x.da || !['getrennt', 'eigen'].includes(k));
    const sm = pick({ getrennt: 'Die Beteiligten wurden räumlich getrennt und einzeln befragt.', idf: 'Die Identitäten der Beteiligten wurden festgestellt.', abgleich: 'Ein Datenabgleich wurde durchgeführt.', eigen: `${x.T.Nom} wurde zur Eigensicherung nach Waffen und gefährlichen Gegenständen durchsucht (§ 39 Abs. 2 PolG NRW).`, waffen: 'Waffen bzw. gefährliche Gegenstände wurden sichergestellt (§ 43 Nr. 1 PolG NRW); eine Bescheinigung wurde ausgestellt.', absuche: 'Der Nahbereich wurde abgesucht.' }, so);
    out.push(P(...sm, satz(get(d, 'eintreff.sofortText'))));
    return B(...out);
  }
  function verletzungSatz(p, r) {
    const real = mit(pick(C.VERL, arr(p.verl).filter(v => v !== 'keine')), p.verlFrei);
    if (!real.length) return arr(p.verl).includes('keine') ? `Sichtbare Verletzungen waren bei ${r.dat} nicht festzustellen.` : PH(`Verletzungen ${r.gen}`);
    return `${r.Nom} wies folgende sichtbare Verletzungen auf: ${joinList(real)}.` + (has(p.verlWo) ? ` Die Verletzungen befinden sich ${slot(p.verlWo)}.` : '');
  }
  function s23(d, x) {
    return B(...C.verletzte(d).map(({ p, i }) => {
      const r = x.R(i), t = [verletzungSatz(p, r)];
      if (has(p.schmerz)) t.push(`${r.Er} klagte über ${slot(p.schmerz)}.`);
      const bes = has(p.rtwBes) ? ` (${str(p.rtwBes)})` : '';
      const frage = `${r.Nom} wurde gefragt, ob ${r.er} einen Rettungswagen oder ärztliche Hilfe benötigt.`;
      t.push({
        vorort: `${frage} Daraufhin wurde ein Rettungswagen${bes} angefordert; ${r.er} wurde vor Ort ambulant versorgt.`,
        kh: `${frage} Daraufhin wurde ein Rettungswagen${bes} angefordert, der ${r.akk} in ${has(p.kh) ? 'das ' + str(p.kh) : 'ein Krankenhaus'} brachte.`,
        selbst: `${frage} ${r.Er} lehnte einen Rettungswagen ab und erklärte, sich im Nachgang selbstständig um eine ärztliche Versorgung zu kümmern.`,
        abgelehnt: `${frage} ${r.Er} lehnte einen Rettungswagen und jede ärztliche Behandlung ab.`,
        unnoetig: `${frage} Nach ${r.sein}en Angaben war dies nicht erforderlich.`,
        sofort: `Wegen ${r.sein}es Zustands wurde sofort ein Rettungswagen${bes} angefordert.`
      }[p.rtw] || (p.rolle === 'bs' ? '' : PH(`Frage nach Rettungswagen / ärztlicher Hilfe und Antwort ${r.gen}`)));
      if (has(p.rtwText)) t.push(`Die Besatzung des Rettungswagens ${endDot(slot(p.rtwText))}`);
      if (p.rolle === 'bs') t.push({ ja: `Die Verletzungen ${r.gen} wurden fotografisch dokumentiert (§ 81b Abs. 1 StPO); die Lichtbilder werden der Strafanzeige beigefügt.`, abgelehnt: `Die Fertigung von Lichtbildern lehnte ${r.er} ab.`, spaeter: 'Lichtbilder der Verletzungen werden nachgefertigt.', nein: 'Lichtbilder wurden nicht gefertigt.' }[p.foto] || '');
      else t.push({ ja: `Die Verletzungen wurden ${p.fotoBel === 'ja' ? 'nach Belehrung über das Weigerungsrecht (§ 81c Abs. 3 StPO) und ' : ''}${p.rolle === 'kind' ? '' : `mit Einwilligung ${r.gen} `}fotografisch dokumentiert; die Lichtbilder werden der Strafanzeige beigefügt.`.replace('und fotografisch', 'fotografisch'), abgelehnt: `Die Fertigung von Lichtbildern lehnte ${r.er} ab.`, spaeter: 'Lichtbilder der Verletzungen werden nachgefertigt.', nein: 'Lichtbilder wurden nicht gefertigt.' }[p.foto] || '');
      if (p.attest === 'ja') t.push(`${r.Nom} wurde auf die Möglichkeit hingewiesen, die Verletzungen ärztlich dokumentieren zu lassen.`);
      return P(...t);
    }));
  }

  /* ---------- 3 Tatörtlichkeit und Umstände ---------- */
  function s31(d) {
    const o = get(d, 'ort') || {}, t = [];
    const lage = has(o.lage) ? ` (${str(o.lage)})` : '';
    const art = { mfh: `Bei der Einsatzörtlichkeit handelt es sich um eine Wohnung${lage} in einem Mehrfamilienhaus.`, wgh: `Bei der Einsatzörtlichkeit handelt es sich um eine Wohnung${lage} in einem Wohn- und Geschäftshaus.`, efh: 'Bei der Einsatzörtlichkeit handelt es sich um ein Einfamilienhaus.', rh: 'Bei der Einsatzörtlichkeit handelt es sich um ein Reihen- bzw. Doppelhaus.' }[o.art];
    if (art) t.push(art); else if (lage) t.push(`Die Wohnung liegt im ${str(o.lage)}.`);
    const w = get(d, 'eintreff.wohnung');
    if (w === 'unauffaellig') t.push('Spuren einer Auseinandersetzung waren in der Wohnung nicht erkennbar.');
    else if (w === 'spuren') {
      const ks = arr(get(d, 'eintreff.spuren')), sp = ks.map(k => C.SPUREN[k]).filter(Boolean);
      const items = mit(sp.map(s => s[0]), get(d, 'eintreff.spurenFrei'));
      const plural = items.length > 1 || (sp.length === 1 && sp[0][1]) || (!sp.length && items.length === 1);
      const wo = has(get(d, 'eintreff.raum')) ? cap(slot(get(d, 'eintreff.raum'))) : 'In der Wohnung';
      t.push(items.length ? `${wo} ${plural ? 'waren' : 'war'} ${joinList(items)} festzustellen.` : 'In der Wohnung waren Spuren einer Auseinandersetzung festzustellen.');
    }
    return P(...t);
  }
  const relPhrase = (bez, T) => (/(geschädigt|beschuldigt|\sder\s|\sdes\s)/i.test(str(bez)) ? str(bez) : `${str(bez)} ${T.gen}`);
  function s32(d, x) {
    const t = [];
    for (const { p, i } of people(d, q => q.rolle === 'gs')) {
      if (!has(p.bez)) continue;
      const r = x.R(i), art = p.geschlecht === 'm' ? 'der' : p.geschlecht === 'w' ? 'die' : '';
      t.push(art ? `${r.Nom} ist ${art} ${relPhrase(p.bez, x.T)}.` : `${r.Nom} steht zu ${x.T.dat} in folgender Beziehung: ${str(p.bez)}.`);
    }
    t.push({ gemeinsam: `${x.G.Nom} und ${x.T.nom} leben gemeinsam in der Wohnung.`, getrenntInnen: `${x.G.Nom} und ${x.T.nom} leben innerhalb der Wohnung getrennt.`, bsAuszug: `${x.T.Nom} ist aus der Wohnung ausgezogen.`, besuch: `${x.T.Nom} wohnt nicht in der Wohnung.` }[get(d, 'lage.wohnt')] || '');
    t.push({ gsWill: `Nach Angaben ${x.G.gen} beabsichtige ${x.G.er}, sich von ${x.T.dat} zu trennen.`, bsWill: `Nach den Angaben der Beteiligten beabsichtige ${x.T.nom}, sich zu trennen.`, vollzogen: 'Nach den Angaben der Beteiligten haben sie sich bereits getrennt.', nein: 'Eine Trennung steht nach den Angaben der Beteiligten nicht im Raum.' }[get(d, 'lage.trennung')] || '');
    t.push(satz(get(d, 'lage.bezText')), satz(get(d, 'lage.text')));
    return P(...t);
  }
  function s33(d, x) {
    const kids = people(d, p => p.rolle === 'kind'); if (!kids.length) return '';
    const n = kids.length, t = [`Im Haushalt ${n === 1 ? 'lebt ein Kind' : `leben ${ZAHL[n] || n} Kinder`}.`];
    for (const { p, i } of kids) {
      const r = x.R(i), desc = C.kdesc(d, p, x), name = `${r.Nom}${desc ? ` (${desc})` : ''}`;
      if (p.da === 'nein') { t.push(`${name} hielt sich zum Zeitpunkt des Einsatzes nicht in der Wohnung auf${has(p.woAbw) ? ' – ' + slot(p.woAbw) : ''}.`); continue; }
      const parts = [];
      const wo = C.KIND_WO[p.kwo]; if (wo) parts.push(C.val(wo, x));
      parts.push(...mit(pick(C.ZUST.kind, arr(p.zust), x), p.zustFrei));
      t.push(parts.length ? `${name} ${joinList(parts)}.` : `${name} war während des Einsatzes in der Wohnung.`);
      t.push({ gesehen: `Nach eigener Äußerung hat ${r.er} das Geschehen gesehen.`, wohnung: `${r.Er} hielt sich während des Geschehens in der Wohnung auf.`, nein: `Nach den Feststellungen hat ${r.er} von dem Geschehen nichts mitbekommen.` }[p.miterlebt] || '');
      if (has(p.spontan)) t.push(`Ungefragt äußerte ${r.er}${um(p.spontanZeit)}: ${quote(p.spontan)}`);
    }
    t.push({ nein: `Zur Tat ${n === 1 ? 'wurde das Kind' : 'wurden die Kinder'} nicht befragt.`, spontan: 'Festgehalten wurden nur ungefragte Äußerungen; zur Tat wurden die Kinder nicht befragt.' }[get(d, 'kind.befragt')] || '');
    return P(...t);
  }

  /* ---------- 4 Schilderungen ---------- */
  /** Beschuldigtenbelehrung (§ 163a Abs. 4, § 136 Abs. 1 StPO) – für die beschuldigte Person und bei wechselseitigen Vorwürfen. */
  function belB(d, x, r, inh, von, zeit, vert) {
    const t = [], i = arr(inh);
    if (!i.length) return P(`${r.Nom} wurde${um(zeit)}${durch(von)} als Beschuldigte${r.g === 'm' ? 'r' : ''} belehrt.`, PH('Inhalte der Belehrung'));
    const del = arr(get(d, 'straf.delikte')).map(k => C.DELIKT_TAT[k]).filter(Boolean);
    const tat = r.r === 'bs' && del.length ? `dass ${r.ihm} ${joinList(del)} zum Nachteil ${x.G.gen} zur Last gelegt ${del.length > 1 ? 'werden' : 'wird'}` : `welche Tat ${r.ihm} zur Last gelegt wird`;
    if (i.includes('tat')) t.push(`${r.Dat} wurde${um(zeit)}${durch(von)} eröffnet, ${tat} (§ 163a Abs. 4 Satz 1 StPO).`);
    else t.push(`${r.Nom} wurde${um(zeit)}${durch(von)} als Beschuldigte${r.g === 'm' ? 'r' : ''} belehrt.`);
    const s2 = [];
    if (i.includes('schweigen')) s2.push(`es ${r.ihm} freisteht, sich zu der Beschuldigung zu äußern oder nicht zur Sache auszusagen`);
    if (i.includes('verteidiger')) s2.push(`${r.er} jederzeit, auch schon vor ${r.sein}er Vernehmung, einen von ${r.ihm} zu wählenden Verteidiger befragen kann`);
    if (s2.length) t.push(`${r.Er} wurde darauf hingewiesen, ${dass(s2)} (§ 136 Abs. 1 Satz 2 StPO).`);
    if (i.includes('notdienst')) t.push(`Für eine Kontaktaufnahme mit einem Verteidiger wurden ${r.ihm} Informationen zur Verfügung gestellt; auf den anwaltlichen Notdienst wurde hingewiesen (§ 136 Abs. 1 Satz 3 und 4 StPO).`);
    const s5 = [];
    if (i.includes('beweis')) s5.push(`${r.er} zu ${r.sein}er Entlastung einzelne Beweiserhebungen beantragen kann`);
    if (i.includes('pflicht')) s5.push(`${r.er} unter den Voraussetzungen des § 140 StPO die Bestellung eines Pflichtverteidigers beanspruchen kann; auf die Kostenfolge des § 465 StPO wurde ${r.er} hingewiesen`);
    if (s5.length) t.push(`Ferner wurde ${r.er} darüber belehrt, ${dass(s5)} (§ 136 Abs. 1 Satz 5 StPO).`);
    const s6 = [];
    if (i.includes('schriftlich')) s6.push('sich schriftlich zu äußern');
    if (i.includes('toa')) s6.push('eines Täter-Opfer-Ausgleichs');
    if (s6.length) t.push(`${r.Er} wurde außerdem auf die Möglichkeit ${i.includes('schriftlich') && i.includes('toa') ? 'hingewiesen, sich schriftlich zu äußern, sowie auf die Möglichkeit eines Täter-Opfer-Ausgleichs' : i.includes('toa') ? 'eines Täter-Opfer-Ausgleichs hingewiesen' : 'hingewiesen, sich schriftlich zu äußern'} (§ 136 Abs. 1 Satz 6 StPO).`);
    if (i.includes('dolmetscher')) t.push(`${r.Er} wurde darauf hingewiesen, dass ${r.er} für das Strafverfahren unentgeltlich einen Dolmetscher bzw. Übersetzer beanspruchen kann (§ 163a Abs. 5 StPO i. V. m. § 187 Abs. 1 GVG).`);
    t.push({ nein: `${r.Er} erklärte, vor einer Äußerung keinen Verteidiger befragen zu wollen.`, ja: `${r.Er} erklärte, vor einer Äußerung einen Verteidiger befragen zu wollen; Fragen zur Sache wurden daraufhin nicht gestellt.` }[vert] || '');
    return P(...t);
  }
  /** Zeugenbelehrung (§§ 52, 55, 57, 68, 68b, 81c StPO). */
  function belZ(d, x, r, p) {
    const i = arr(p.belInh), t = [];
    const als = { w: 'Zeugin', m: 'Zeuge', d: 'Zeugin bzw. Zeuge' }[r.g];
    t.push(r.r === 'zeuge' ? `${r.Nom} wurde${um(p.belZeit)}${durch(p.belVon)} belehrt.` : `${r.Nom} wurde${um(p.belZeit)}${durch(p.belVon)} als ${als} belehrt.`);
    if (!i.length) { t.push(PH('Inhalte der Belehrung')); return P(...t); }
    if (i.includes('zvr')) {
      const nr = C.zvrNr(p.bez);
      const rel = has(p.bez) ? `als ${C.val(relPhrase(p.bez, x.T))}` : `als Angehörige${r.g === 'm' ? 'r' : ''} ${x.T.gen}`;
      t.push(`${r.Dat} wurde eröffnet, dass ${r.er} ${rel} berechtigt ist, das Zeugnis zu verweigern (§ 52 Abs. 1${nr ? ' Nr. ' + nr : ''}, Abs. 3 Satz 1 StPO)` + (i.includes('widerruf') ? `, und dass ${r.er} einen Verzicht auf dieses Recht auch während der Vernehmung widerrufen kann (§ 52 Abs. 3 Satz 2 StPO).` : '.'));
    }
    const h = [];
    if (i.includes('auskunft')) h.push(`${r.er} die Auskunft auf solche Fragen verweigern darf, deren Beantwortung ${r.ihm} selbst oder einem Angehörigen die Gefahr zuziehen würde, wegen einer Straftat oder Ordnungswidrigkeit verfolgt zu werden (§ 55 StPO)`);
    if (i.includes('beistand')) h.push(`${r.er} sich eines anwaltlichen Zeugenbeistands bedienen kann (§ 68b Abs. 1 StPO)`);
    if (i.includes('anschrift')) h.push(`${r.er} statt ${r.sein}er Wohnanschrift eine andere ladungsfähige Anschrift angeben kann, wenn durch die Angabe des Wohnortes eine Gefährdung zu besorgen ist (§ 68 Abs. 2 StPO)`);
    if (i.includes('untersuchung')) h.push(`${r.er} Untersuchungen und die Aufnahme von Lichtbildern ${r.sein}er Verletzungen aus denselben Gründen verweigern darf wie das Zeugnis (§ 81c Abs. 3 StPO)`);
    if (h.length) t.push(`${i.includes('zvr') ? 'Ferner wurde' : 'Dabei wurde'} ${r.er} darauf hingewiesen, ${dass(h)}.`);
    if (i.includes('wahrheit')) t.push(`${r.Er} wurde zur Wahrheit ermahnt und auf die Strafbarkeit einer falschen Verdächtigung und des Vortäuschens einer Straftat hingewiesen (§ 57 Satz 1, § 163 Abs. 3 Satz 2 StPO; §§ 145d, 164 StGB).`);
    return P(...t);
  }
  function schilderung(d, x, r, p, gsMode) {
    const t = [];
    if (p.modus === 'keine') { t.push(`${r.Er} machte keine Angaben zum Geschehen.`); return P(...t); }
    if (gsMode) {
      const wo = has(p.raumText) ? slot(p.raumText) : C.RAUM[p.raum];
      if (has(p.tatzeit) || wo) t.push(`Das Geschehen habe sich${has(p.tatzeit) ? ' gegen ' + fmtTime(p.tatzeit) : ''}${wo ? ' ' + wo : ''} ereignet.`);
    }
    if (p.modus === 'jetzt') {
      if (gsMode && has(p.anlass)) t.push(`Anlass sei ${endDot(slot(p.anlass))}`);
      t.push(has(p.text) ? `${r.Er} gab an, ${endDot(slot(p.text))}` : PH(`Schilderung ${r.gen}`));
    } else if (p.modus === 'folgt') {
      if (gsMode && has(p.kern)) t.push(`Nach ${r.sein}en Angaben habe ${x.T.nom} ${r.ihn} ${endDot(slot(p.kern))}`);
      t.push(PH(`Schilderung ${r.gen}`));
    }
    return P(...t);
  }
  function aussageGs(d, x, i, o = {}) {
    const r = x.R(i), p = r.p, t = [];
    if (p.bel === 'nein') t.push(`${r.Nom} wurde nicht zur Sache befragt.`);
    else if (p.bel === 'bs') {
      t.push(`Da wechselseitige Vorwürfe erhoben werden und auch gegen ${r.akk} der Verdacht eines Übergriffs besteht, wurde ${r.er} als Beschuldigte${r.g === 'm' ? 'r' : ''} belehrt.`);
      t.push(belB(d, x, r, p.belInh, p.belVon, p.belZeit, p.bsVert));
    } else if (p.bel === '52' || p.bel === '57') {
      t.push(belZ(d, x, r, p));
      t.push({ aussage: `${r.Er} erklärte, aussagen zu wollen.`, verweigert: `${r.Er} erklärte, von ${r.sein}em Zeugnisverweigerungsrecht Gebrauch zu machen.`, gefahr: `${r.Er} erklärte, von ${r.sein}em Zeugnisverweigerungsrecht Gebrauch zu machen; zum Geschehen äußerte ${r.er} sich ausschließlich im Hinblick auf die polizeilichen Schutzmaßnahmen.` }[p.belErkl] || (p.bel === '52' ? PH('Erklärung nach der Belehrung') : ''));
    } else if (has(p.modus)) t.push(PH(`Belehrung ${r.gen}: wer, wann, welche Inhalte`));
    const sprichtNicht = p.bel === 'nein' || (p.bel === '52' && p.belErkl === 'verweigert');
    const b1 = P(...t);
    if (sprichtNicht) return b1;
    const s = [];
    if (r.r === 'zeuge') s.push({ gesehen: `Nach eigenen Angaben hat ${r.er} das Geschehen selbst beobachtet.`, gehoert: `Nach eigenen Angaben hat ${r.er} das Geschehen nur gehört, nicht gesehen.`, danach: `${r.Er} kam nach eigenen Angaben erst nach dem Geschehen hinzu.` }[p.wahr] || '');
    s.push(schilderung(d, x, r, p, r.r === 'gs'));
    if (r.r === 'gs') {
      if (p.frueher === 'erstmals') s.push(`Nach ${r.sein}en Angaben sei es der erste Übergriff gewesen.`);
      else if (p.frueher === 'ja') s.push('Es sei bereits früher zu Übergriffen gekommen.' + (has(p.frueherText) ? ` Zu früheren Vorfällen gab ${r.er} an, ${endDot(slot(p.frueherText))}` : ''));
      s.push({ ja: `${r.Er} äußerte Angst vor weiteren Übergriffen.`, nein: `Angst vor weiteren Übergriffen äußerte ${r.er} nicht.` }[p.angst] || '');
      s.push({ will: `${r.Er} wünschte, dass ${x.T.nom} die Wohnung verlässt.`, ablehnt: `Eine Wohnungsverweisung lehnte ${r.er} ab.`, widerruf: `Im weiteren Verlauf nahm ${r.er} ${r.sein}e Angaben zurück.` }[p.wille] || '');
      s.push({ ja: `${r.Er} verbleibt in der Wohnung.`, auszug: `${r.Er} beabsichtigt, in Kürze aus der Wohnung auszuziehen.`, weg: `${r.Er} hat die Wohnung dauerhaft verlassen.` }[p.bleibt] || '');
      s.push({ ja: `${r.Er} stellte Strafantrag.`, nein: 'Strafantrag wurde nicht gestellt.', spaeter: `${r.Er} behält sich die Stellung eines Strafantrags vor.` }[p.antrag] || '');
    }
    return o.ohneBel ? P(...s) : B(b1, P(...s));
  }
  function aussageBs(d, x, o = {}) {
    const y = C.bsY(d); if (!y || y.p.da !== 'ja') return '';
    const r = x.R(y.i), b = get(d, 'bsb') || {}, t = [];
    if (!has(b.zeit) && !has(b.von) && !arr(b.inh).length && !has(b.reaktion)) return PH(`Belehrung ${r.gen}: wer, wann, welche Inhalte`);
    t.push(belB(d, x, r, b.inh, b.von, b.zeit, b.vert));
    const s = [];
    if (b.vert !== 'ja') {
      if (b.reaktion === 'schweigt') s.push(`${r.Er} machte von ${r.sein}em Schweigerecht Gebrauch.`);
      else if (b.reaktion === 'aeussert') {
        s.push({ bestreitet: `${r.Er} bestritt die Vorwürfe.`, teil: `${r.Er} räumte die Vorwürfe teilweise ein.`, raeumt: `${r.Er} räumte die Vorwürfe ein.`, gegen: `${r.Er} bestritt die Vorwürfe und erhob ${r.sein}erseits Vorwürfe gegen ${x.G.akk}.` }[b.kern] || '');
        if (b.modus === 'jetzt') s.push(has(b.text) ? `${r.Er} gab an, ${endDot(slot(b.text))}` : PH(`Einlassung ${r.gen}`));
        else if (b.modus === 'folgt') s.push(PH(`Einlassung ${r.gen}`));
        else if (b.modus === 'keine') s.push(`Weitere Angaben zur Sache machte ${r.er} nicht.`);
      }
    }
    return o.ohneBel ? P(...s) : B(P(...t), P(...s));
  }
  function anhoerung(d, x) {
    const h = get(d, 'anh') || {}, i = arr(h.inh), T = x.T;
    if (!x.da) return '';
    if (!i.length && !has(h.zeit) && !has(h.reaktion)) return '';
    const t = [];
    const hatBel = arr(get(d, 'bsb.inh')).length || has(get(d, 'bsb.zeit'));
    t.push(hatBel ? `Unabhängig von der Beschuldigtenbelehrung wurde ${T.nom}${um(h.zeit)}${durch(h.von)} zu der beabsichtigten Wohnungsverweisung angehört (§ 28 Abs. 1 VwVfG NRW).` : `${T.Nom} wurde${um(h.zeit)}${durch(h.von)} zu der beabsichtigten Wohnungsverweisung angehört (§ 28 Abs. 1 VwVfG NRW).`);
    const a = i.includes('vorwurf') && i.includes('frueher') ? `die Angaben ${x.G.gen} zum heutigen Geschehen und zu früheren Vorfällen` : i.includes('vorwurf') ? `die Angaben ${x.G.gen} zum heutigen Geschehen` : i.includes('frueher') ? `die Angaben ${x.G.gen} zu früheren Vorfällen` : '';
    const b = i.includes('massnahme') ? 'die beabsichtigte Maßnahme mit räumlichem Bereich und Dauer' : '';
    if (a || b) t.push(`${T.Dat} wurden ${[a, b].filter(Boolean).join(' sowie ')} mitgeteilt.`);
    const hw = [];
    if (i.includes('freiwillig')) hw.push(`es ${T.ihm} freisteht, sich hierzu zu äußern`);
    if (i.includes('verwertung')) hw.push(`${T.sein}e Äußerungen auch im Strafverfahren verwendet werden können`);
    if (hw.length) t.push(`${T.Er} wurde darauf hingewiesen, ${dass(hw)}.`);
    const fr = [];
    if (i.includes('unterkunft')) fr.push(`wo ${T.er} unterkommen kann`);
    if (i.includes('bindung')) fr.push(`ob ${T.er} aus beruflichen Gründen oder zur Versorgung von Angehörigen auf die Wohnung angewiesen ist`);
    if (i.includes('einwand')) fr.push(`ob ${T.er} Einwände gegen Bereich und Dauer der Maßnahme hat`);
    if (fr.length) t.push(`${T.Er} wurde außerdem gefragt, ${joinList(fr)}.`);
    if (h.reaktion === 'text') t.push(has(h.text) ? `Hierzu äußerte ${T.er}, ${endDot(slot(h.text))}` : PH('Äußerung in der Anhörung'));
    else if (h.reaktion === 'keine') t.push(`Hierzu äußerte ${T.er} sich nicht.`);
    if (has(h.unterkunft)) t.push(`${T.Er} gab an, ${slot(h.unterkunft)} unterzukommen.`);
    t.push({ nein: `Eine berufliche oder versorgende Bindung an die Wohnung besteht nach ${T.sein}en Angaben nicht.`, arbeit: `${T.Er} gab an, beruflich auf die Wohnung angewiesen zu sein${has(h.bindungText) ? ': ' + slot(h.bindungText) : ''}.`, pflege: `${T.Er} gab an, in der Wohnung Angehörige zu versorgen${has(h.bindungText) ? ': ' + slot(h.bindungText) : ''}.` }[h.bindung] || '');
    t.push({ keine: `Einwände gegen Bereich und Dauer der Maßnahme erhob ${T.er} nicht.`, ja: has(h.einwandText) ? `${T.Er} wandte ein, ${endDot(slot(h.einwandText))}` : `${T.Er} erhob Einwände gegen Bereich bzw. Dauer der Maßnahme.` }[h.einwand] || '');
    return P(...t);
  }
  /** Abschnitt 4 als Liste [Titel, Text, Schritt]. */
  function aussagen(d, x) {
    const out = [];
    const titel = r => `Angaben ${r.gen}${r.p && has(r.p.bez) && r.r === 'zeuge' ? ` (${str(r.p.bez)})` : ''}`;
    for (const { i } of people(d, p => p.rolle === 'gs' && p.da !== 'nein')) { const r = x.R(i); out.push([titel(r), aussageGs(d, x, i), 'aussagen']); }
    const y = C.bsY(d);
    if (y && y.p.da === 'ja') { out.push([`Angaben ${x.R(y.i).gen}`, aussageBs(d, x), 'beschuldigt']); out.push(['Anhörung zur Wohnungsverweisung', anhoerung(d, x), 'beschuldigt']); }
    for (const { i } of people(d, p => p.rolle === 'zeuge' && p.da !== 'nein')) { const r = x.R(i); out.push([titel(r), aussageGs(d, x, i), 'aussagen']); }
    return out;
  }

  /* ---------- 5 Gefahrenprognose ---------- */
  function s5(d, x) {
    const p = get(d, 'prog') || {}, t1 = [], t2 = [], t3 = [], t4 = [];
    const vg = arr(p.vorg), vk = vg.filter(k => C.VORG[k]), vgL = mit(pick(C.VORG, vk).map(s => s.replace('die geschädigte Person', x.G.akk)), p.vorgFrei);
    if (vgL.length) t1.push(`Nach den polizeilichen Erkenntnissen ${vgL.length > 1 || (vk.length === 1 && C.VORG_PL[vk[0]]) ? 'liegen' : 'liegt'} ${joinList(vgL)} vor.`);
    else if (vg.includes('keine')) t1.push('Polizeiliche Vorerkenntnisse zu den Beteiligten liegen nicht vor.');
    else if (vg.includes('nicht')) t1.push('Ein Datenabgleich war am Einsatzort nicht möglich.');
    t1.push({ beziehung: 'Es liegen konkrete Anzeichen für wiederholte Übergriffe und damit für eine Gewaltbeziehung vor.', ersttat: 'Es handelt sich nach den vorliegenden Erkenntnissen um eine erstmalige Tat, die nach der Intensität des Angriffs eine jederzeitige Wiederholung befürchten lässt.' }[p.muster] || '');
    const st = arr(p.stuetzen), stL = mit(pick(C.STUETZEN, st.filter(k => k !== 'keine'), x), p.stuetzenFrei);
    if (stL.length) t2.push(`Die Angaben ${x.G.gen} werden gestützt durch ${joinList(stL)}.`);
    else if (st.includes('keine')) t2.push('Objektive Anhaltspunkte, die die Angaben stützen, lagen am Einsatzort nicht vor.');
    if (has(p.wuerdigung)) t2.push(`Den Angaben ${x.G.gen} wird gefolgt, weil ${endDot(slot(p.wuerdigung))}`);
    const mk = C.marked(d);
    const by = s => mk.filter(([, z]) => z === s).map(([f]) => f);
    t3.push(...by('fest').map(f => f.fest(x)), ...by('angabe').map(f => f.angabe(x)));
    const alt = by('ja').map(f => f.l);
    if (alt.length) t3.push(`Darüber hinaus liegen folgende Warnsignale vor: ${joinList(alt)}.`);
    t3.push(...by('annahme').map(f => f.annahme(x)));
    if (by('annahme').length && has(p.fGrund)) t3.push(`Diese Annahmen stützen sich auf ${endDot(slot(p.fGrund))}`);
    t3.push(satz(p.fFrei));
    t4.push(...[...new Set(mk.map(([f]) => f.bed))]);
    const bst = arr(p.bst).map(k => C.BST_BY[k]).filter(Boolean).map(b => b.text(x));
    const erg = [];
    if (p.gefahr === 'ja') erg.push(`Nach Würdigung aller am Einsatzort verfügbaren Erkenntnisse bestand eine gegenwärtige Gefahr für Leib, Leben oder Freiheit ${x.G.gen}, die von ${x.T.dat} ausging. Mit weiteren Übergriffen war in allernächster Zeit zu rechnen, weil ${has(p.warum) ? endDot(slot(p.warum)) : PH('Begründung') + '.'}`);
    else if (p.gefahr === 'nein') erg.push(`Eine gegenwärtige Gefahr für Leib, Leben oder Freiheit ${x.G.gen} war nicht festzustellen${has(p.warumNicht) ? ', weil ' + slot(p.warumNicht) : ''}.`);
    return B(P(...t1), P(...t2), P(...t3), P(...t4), ...bst, str(p.eigen), P(...erg));
  }

  /* ---------- 6 Maßnahmen ---------- */
  function bereich(d, x) {
    const w = get(d, 'wv') || {};
    const orte = [...pick(C.ORTE, arr(w.orte)), ...arr(w.weitere).filter(o => o && has(o.ort)).map(o => slot(o.ort))];
    return `Die Maßnahme umfasst ${orte.length ? joinList(orte) : PH('räumlicher Bereich')}${x.adr ? ` des Anwesens ${x.adr}` : ''}.`
      + arr(w.weitere).filter(o => o && has(o.ort) && has(o.grund)).map(o => ` Die Maßnahme erstreckt sich auf ${slot(o.ort)}, weil ${slot(o.grund)}.`).join('');
  }
  function dauer(d, x) {
    const w = get(d, 'wv') || {};
    return `Sie endet mit Ablauf des ${x.ende ? fmtDate(x.ende) : PH('Enddatum')}.` + (w.dauer === 'kuerzer' && has(w.dauerGrund) ? ` Die Dauer wurde verkürzt, weil ${slot(w.dauerGrund)}.` : '');
  }
  function anordnung(d, x, was) {
    const w = get(d, 'wv') || {};
    return P(`Gegen ${x.T.akk} wurde am ${fmtDate(C.wvTag(d)) || PH('Datum')}${um(w.zeit)}${durch(w.von)} gemäß § 34a Abs. 1 PolG NRW ${was} angeordnet.`, bereich(d, x), dauer(d, x));
  }
  const mittelSatz = d => (has(get(d, 'wv.mittel')) ? `Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil ${endDot(slot(get(d, 'wv.mittel')))}` : '');
  function s61da(d, x) {
    const e = get(d, 'er') || {}, i = arr(e.inh), T = x.T, G = x.G;
    const p1 = anordnung(d, x, 'eine Wohnungsverweisung mit Rückkehrverbot');
    const p2 = [];
    if (!i.length) p2.push(PH('Eröffnung der Maßnahme: was wurde eröffnet und erklärt?'));
    if (i.includes('anordnung')) p2.push(`Die Maßnahme wurde ${T.dat}${um(e.zeit)} mündlich eröffnet.`);
    const bd = [i.includes('bereich') ? 'der räumliche Bereich genau bezeichnet' : '', i.includes('dauer') ? `das Ende der Maßnahme mit Ablauf des ${fmtDate(x.ende)} benannt` : ''].filter(Boolean);
    if (bd.length) p2.push(`Dabei wurde${bd.length > 1 ? 'n' : ''} ${T.dat} ${bd.join(' und ')} (§ 34a ${[i.includes('bereich') ? 'Abs. 1 Satz 2' : '', i.includes('dauer') ? 'Abs. 6 Satz 2' : ''].filter(Boolean).join(', ')} PolG NRW).`);
    if (i.includes('gruende')) p2.push(`${T.Er} wurde darüber unterrichtet, dass nach den getroffenen Feststellungen von ${T.ihm} eine gegenwärtige Gefahr für Leib, Leben oder Freiheit ${G.gen} ausgeht.`);
    if (i.includes('polizei')) p2.push(`${T.Ihm} wurde erläutert, dass die Polizei in Fällen häuslicher Gewalt zum Schutz der gefährdeten Person einschreitet und dass es dabei weder auf deren Einverständnis noch auf die Eigentums- oder Mietverhältnisse an der Wohnung ankommt.`);
    if (i.includes('einverstaendnis')) p2.push(`${T.Er} wurde darauf hingewiesen, dass das Rückkehrverbot auch dann gilt, wenn ${G.nom} mit ${T.sein}er Rückkehr einverstanden ist.`);
    if (i.includes('verlaengerung')) p2.push(`Ferner wurde ${T.er} darüber unterrichtet, dass sich das Rückkehrverbot bis zur gerichtlichen Entscheidung, längstens bis zum Ablauf des ${fmtDate(x.max)}, verlängert, wenn ${G.nom} während der Dauer der Maßnahme zivilrechtlichen Schutz nach dem Gewaltschutzgesetz beantragt (§ 34a Abs. 5 Satz 2 PolG NRW).`);
    const p3 = [];
    if (i.includes('verlassen')) p3.push(`${T.Er} wurde aufgefordert, die Wohnung sofort zu verlassen.`);
    if (i.includes('gegenst')) p3.push(`${T.Dat} wurde Gelegenheit gegeben, dringend benötigte Gegenstände des persönlichen Bedarfs mitzunehmen (§ 34a Abs. 2 PolG NRW)` + (has(e.gegenst) ? `; ${T.er} nahm ${slot(e.gegenst)} mit.` : '.'));
    if (i.includes('anschrift')) p3.push(`${T.Er} wurde aufgefordert, eine Anschrift oder eine zustellungsbevollmächtigte Person zum Zweck von Zustellungen zu benennen (§ 34a Abs. 3 PolG NRW).` + (has(e.anschrift) ? ` ${T.Er} benannte ${endDot(slot(e.anschrift))}` : ''));
    if (i.includes('schluessel')) p3.push(`${T.Er} wurde aufgefordert, sämtliche Haus- und Wohnungsschlüssel herauszugeben.`);
    const n = has(e.schluesselAnz) ? Number(e.schluesselAnz) : 0, zahl = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht'];
    const anzAkk = n === 1 ? 'einen Schlüssel' : n > 1 ? `${zahl[n] || n} Schlüssel` : 'die Schlüssel', anzNom = n === 1 ? 'ein Schlüssel' : anzAkk;
    p3.push({ sicher: `${T.Er} übergab ${anzAkk}; ${n === 1 ? 'dieser wurde' : 'diese wurden'} gemäß § 43 Nr. 1 PolG NRW sichergestellt.`, weg: `Da ${T.er} die Herausgabe verweigerte, ${n === 1 ? 'wurde' : 'wurden'} ${anzNom} weggenommen und gemäß § 43 Nr. 1 PolG NRW sichergestellt.`, keine: `Nach eigenen Angaben besitzt ${T.er} keine Schlüssel zur Wohnung.`, nicht: 'Schlüssel konnten nicht aufgefunden werden.' }[e.schluessel] || '');
    if (['sicher', 'weg'].includes(e.schluessel) && e.schluesselBesch === 'ja') p3.push(`Über die Sicherstellung wurde ${T.dat} eine Bescheinigung ausgehändigt (§ 44 Abs. 2 PolG NRW).`);
    if (i.includes('obdach')) p3.push(`${T.Er} wurde auf die Möglichkeit hingewiesen, sich zur Unterbringung an die örtliche Ordnungsbehörde zu wenden.`);
    const p4 = [];
    if (i.includes('zg')) p4.push(`Für jeden Fall der Zuwiderhandlung gegen das Rückkehrverbot wurde ${T.dat} ein Zwangsgeld in Höhe von ${euro(e.zgHoehe) || PH('Betrag')} angedroht (§§ 51, 53, 56 PolG NRW).` + (i.includes('ersatzhaft') ? ` Zugleich wurde ${T.er} darauf hingewiesen, dass bei Uneinbringlichkeit des Zwangsgeldes Ersatzzwangshaft angeordnet werden kann (§ 54 Abs. 1 PolG NRW).` : ''));
    else if (i.includes('ersatzhaft')) p4.push(`${T.Er} wurde auf die Möglichkeit der Ersatzzwangshaft hingewiesen (§ 54 Abs. 1 PolG NRW).`);
    if (i.includes('gewahrsam')) p4.push(`${T.Er} wurde darauf hingewiesen, dass ${T.er} bei einem Verstoß gegen das Rückkehrverbot zu dessen Durchsetzung in Gewahrsam genommen werden kann (§ 35 Abs. 1 Nr. 4 PolG NRW).`);
    if (i.includes('rechtsbehelf')) p4.push(`Über die Möglichkeit, gegen die Verfügung Klage beim Verwaltungsgericht zu erheben und vorläufigen Rechtsschutz zu beantragen, wurde ${T.er} unterrichtet; ${T.er} wurde darauf hingewiesen, dass die Verfügung als unaufschiebbare Anordnung eines Polizeivollzugsbeamten sofort vollziehbar ist (§ 80 Abs. 2 Satz 1 Nr. 2 VwGO).`);
    if (i.includes('beratung')) p4.push(`${T.Er} wurde auf Beratungsangebote für Menschen hingewiesen, die in Beziehungen Gewalt ausüben.`);
    if (i.includes('verstanden')) p4.push(`${T.Er} erklärte, die Erläuterungen verstanden zu haben.`);
    const p5 = [];
    const mitZg = i.includes('zg') ? ' einschließlich der Zwangsgeldandrohung' : '';
    p5.push({ vorort: `Die schriftliche Bestätigung der Verfügung${mitZg} wurde ${T.dat}${um(e.schriftZeit)} vor Ort gegen Empfangsbekenntnis ausgehändigt (§ 5 Abs. 1 LZG NRW).`, verweigert: `Die Annahme der schriftlichen Bestätigung der Verfügung${mitZg} verweigerte ${T.er}${um(e.schriftZeit)}; das Schriftstück wurde am Ort der Zustellung zurückgelassen (§ 5 Abs. 2 LZG NRW i. V. m. § 179 ZPO).`, wache: `Die schriftliche Bestätigung der Verfügung${mitZg} liegt bei der ${has(e.wache) ? str(e.wache) : 'Polizeiwache'} zur Abholung bereit; ${T.nom} wurde darauf hingewiesen.`, post: `Die schriftliche Bestätigung der Verfügung${mitZg} wird ${T.dat} förmlich zugestellt.` }[e.schrift] || '');
    if (C.nachtEr(d) && ['vorort', 'verweigert'].includes(e.schrift) && e.erlaubnis === 'ja') p5.push('Die Erlaubnis der Behördenleitung für die Zustellung zur Nachtzeit bzw. an einem Sonn- oder Feiertag lag vor (§ 5 Abs. 3 LZG NRW).');
    const p6 = [];
    p6.push({ ok: `${T.Er} nahm die Maßnahme ohne Widerspruch zur Kenntnis.`, widerspruch: `${T.Er} widersprach der Maßnahme` + (has(e.reaktionText) ? ` und äußerte, ${endDot(slot(e.reaktionText))}` : '.'), text: has(e.reaktionText) ? `${T.Er} äußerte, ${endDot(slot(e.reaktionText))}` : '' }[e.reaktion] || '');
    if (e.verlassen === 'freiwillig') p6.push(`${T.Er} verließ die Wohnung${um(e.verlassenZeit)} freiwillig.` + (has(e.wohin) ? ` ${T.Er} begab sich nach eigenen Angaben ${endDot(slot(e.wohin))}` : ''));
    else if (e.verlassen === 'festnahme') p6.push(`${T.Er} wurde${um(e.verlassenZeit)} vorläufig festgenommen (§ 127 Abs. 2 StPO).`);
    else if (['zwang', 'gewahrsam'].includes(e.verlassen)) p6.push(`Die Wohnung verließ ${T.er} erst nach Anwendung unmittelbaren Zwangs (siehe Zwang und Gewahrsam).`);
    p6.push(satz(e.text));
    return B(p1, P(...p2), P(...p3), P(...p4), P(...p5), P(...p6), mittelSatz(d));
  }
  function s61weg(d, x) {
    const a = get(d, 'abw') || {}, T = x.T, G = x.G;
    const p1 = anordnung(d, x, 'ein Rückkehrverbot');
    const p2 = [];
    const wie = { telefon: 'telefonisch erreicht', ort: `an ${T.sein}em Aufenthaltsort aufgesucht` }[a.erreichbar];
    if (wie && a.anh === 'ja') p2.push(`${T.Nom} wurde${um(a.anhZeit)} ${wie}. ${T.Er} wurde als Beschuldigte${T.g === 'm' ? 'r' : ''} belehrt und zu den Vorwürfen und der beabsichtigten Maßnahme angehört, bevor über das Rückkehrverbot entschieden wurde.` + (has(a.anhText) ? ` ${T.Er} äußerte, ${endDot(slot(a.anhText))}` : ''));
    else if (wie) p2.push(`${T.Nom} wurde${um(a.anhZeit)} ${wie}.`);
    else if (a.erreichbar === 'nein') p2.push(`${T.Nom} war nicht erreichbar; von einer vorherigen Anhörung wurde deshalb abgesehen (§ 28 Abs. 2 Nr. 1 VwVfG NRW). Sie wird beim Antreffen nachgeholt.`);
    const ti = arr(a.telInh);
    if (a.erreichbar === 'telefon') {
      if (ti.includes('nummer')) p2.push('Die Rufnummer war aus den Angaben der Beteiligten bzw. dem Datenbestand bekannt.');
      if (ti.includes('identitaet')) p2.push('Die Identität des Gesprächspartners wurde durch Kontrollfragen überprüft.');
    }
    p2.push({ pers: `Das Rückkehrverbot wurde ${T.dat}${um(a.bekanntZeit)} persönlich bekanntgegeben.`, tel: `Das Rückkehrverbot wurde ${T.dat}${um(a.bekanntZeit)} telefonisch bekanntgegeben${ti.includes('bereich') ? '; dabei wurden der räumliche Bereich und das Ende der Maßnahme genannt' : ''}${ti.includes('zg') ? (ti.includes('bereich') ? ' und' : '; dabei wurde') + ' auf das angedrohte Zwangsgeld hingewiesen' : ''}.`, nein: `Eine Bekanntgabe war bislang nicht möglich; das Rückkehrverbot ist ${T.dat} gegenüber noch nicht wirksam.` }[a.bekannt] || '');
    const p3 = [];
    const zgS = '';
    if (has(a.zgHoehe)) p3.push(`Die schriftliche Verfügung enthält die Androhung eines Zwangsgeldes in Höhe von ${euro(a.zgHoehe)} für jeden Fall der Zuwiderhandlung (§§ 51, 53, 56 PolG NRW).`);
    const wache = has(a.wache) ? str(a.wache) : 'Polizeiwache';
    const grund = a.zustGrund ? { keinbk: 'ein zur Wohnung gehörender Briefkasten nicht vorhanden ist', zuordnung: 'ein Briefkasten nicht eindeutig zuzuordnen war', unzug: 'der Briefkasten nicht zugänglich war' }[a.zustGrund] : '';
    const grundT = has(a.zustGrundText) ? slot(a.zustGrundText) : grund;
    p3.push({
      pers: `Die schriftliche Verfügung${zgS} wurde ${T.dat}${um(a.zustZeit)} persönlich gegen Empfangsbekenntnis ausgehändigt (§ 5 Abs. 1 LZG NRW).`,
      briefkasten: `Da ${T.nom} nicht angetroffen wurde, wurde die schriftliche Verfügung${zgS}${um(a.zustZeit)} im Wege der Ersatzzustellung in den zur Wohnung gehörenden Briefkasten eingelegt (§ 5 Abs. 2 LZG NRW i. V. m. § 180 ZPO).`,
      niederlegung: `Da ${T.nom} nicht angetroffen wurde und ${grundT || PH('Grund, warum das Einlegen in den Briefkasten nicht möglich war')}, wurde die schriftliche Verfügung${zgS}${um(a.zustZeit)} bei der ${wache} niedergelegt (§ 5 Abs. 2 LZG NRW i. V. m. § 181 Abs. 1 ZPO). Über die Niederlegung wurde eine schriftliche Mitteilung ${a.mitteilung === 'bk' ? 'in den Briefkasten eingelegt' : a.mitteilung === 'tuer' ? 'an der Wohnungstür angeheftet' : PH('wo hinterlassen')}; darin wurde ${T.nom} darauf hingewiesen, dass ${T.er} die für ${T.ihn} bestimmten Schriftstücke bei der ${wache} abholen kann. Das Schriftstück wird drei Monate zur Abholung bereitgehalten (§ 181 Abs. 2 ZPO).`,
      hinweis: `An der Wohnungstür wurde${um(a.zustZeit)} eine Mitteilung hinterlassen, dass sich ${T.nom} bei der ${wache} melden und dort die für ${T.ihn} bestimmten Schriftstücke abholen kann. Eine förmliche Zustellung ist damit nicht erfolgt.`,
      post: `Die schriftliche Verfügung${zgS} wird ${T.dat} mit Postzustellungsurkunde zugestellt (§ 3 LZG NRW).`
    }[a.zust] || '');
    if (C.nachtAbw(d) && ['pers', 'briefkasten', 'niederlegung'].includes(a.zust) && a.erlaubnis === 'ja') p3.push('Die Erlaubnis der Behördenleitung für die Zustellung zur Nachtzeit bzw. an einem Sonn- oder Feiertag lag vor (§ 5 Abs. 3 LZG NRW).');
    const p4 = [];
    p4.push({ spaeter: `Die Schlüssel ${T.gen} sollen beim Antreffen sichergestellt werden.`, schloss: `${G.Dat} wurde der Austausch des Schlosses empfohlen.`, sicher: 'Die Schlüssel wurden sichergestellt (§ 43 Nr. 1 PolG NRW).' }[a.schluessel] || '');
    p4.push(...pick({ folge: 'Die Folgeschicht wurde beauftragt, die Verfügung bei Antreffen auszuhändigen.', streife: 'Die Wohnung wird im Rahmen der Streife aufgesucht.', fahndung: 'Eine Nahbereichsfahndung wurde durchgeführt.' }, arr(a.weiter)));
    p4.push(satz(a.weiterText));
    return B(p1, P(...p2), P(...p3), P(...p4), mittelSatz(d));
  }
  function s61nein(d, x) {
    const w = get(d, 'wv') || {}, T = x.T, G = x.G, t = [];
    const g = { gefahr: 'eine gegenwärtige Gefahr für Leib, Leben oder Freiheit nicht festzustellen war', verbal: 'es bei einem verbalen Streit geblieben ist', wohnt: `${T.nom} nicht in der Wohnung lebt`, weg: `${G.nom} die Wohnung dauerhaft verlassen hat`, unklar: 'sich nicht aufklären ließ, von wem die Gefahr ausgeht', freiwillig: `${T.nom} glaubhaft von sich aus dauerhaft Abstand sucht` }[w.grund];
    const gr = mit(g ? [g] : [], w.grundText);
    t.push(`Von einer Wohnungsverweisung nach § 34a PolG NRW wurde abgesehen${gr.length ? ', weil ' + gr.join(' und ') : ''}.`);
    t.push(...pick({ platz: `Gegen ${T.akk} wurde ein Platzverweis ausgesprochen (§ 34 Abs. 1 PolG NRW).`, betret: 'Ein Betretungs- und Aufenthaltsverbot nach § 34 Abs. 2 PolG NRW wurde angeregt.', anspr: `Mit ${T.dat} wurde eine Gefährderansprache geführt.`, trennung: 'Die Beteiligten trennten sich freiwillig räumlich.', gewahrsam: `${T.Nom} wurde zur Verhinderung einer unmittelbar bevorstehenden Straftat in Gewahrsam genommen (§ 35 Abs. 1 Nr. 2 PolG NRW).` }, arr(w.alt)));
    t.push(satz(w.altText));
    return P(...t);
  }
  function s61(d, x) { if (C.wvNein(d)) return s61nein(d, x); if (!x.wv) return ''; return x.weg ? s61weg(d, x) : s61da(d, x); }
  const wvStep = d => (C.wvJa(d) && C.bsDa(d) ? 'eroeffnung' : C.wvJa(d) && C.bsWeg(d) ? 'abwesend' : 'wv');
  function s62(d, x) {
    if (!C.zwang(d)) return '';
    const T = x.T, e = get(d, 'er') || {}, z = get(d, 'zw') || {}, g = get(d, 'gew') || {}, t = [];
    const andr = z.androhung === 'ja' ? 'nach Androhung unmittelbaren Zwangs (§ 61 Abs. 1 PolG NRW) ' : '';
    t.push(`Da ${T.er} der Aufforderung, die Wohnung zu verlassen, nicht nachkam, wurde ${T.er} ${andr}${has(e.verlassenZeit) ? 'um ' + fmtTime(e.verlassenZeit) + ' ' : ''}mit ${arr(z.art).includes('einfach') || !arr(z.art).length ? 'einfacher körperlicher Gewalt' : 'unmittelbarem Zwang'} aus der Wohnung geführt.`);
    if (arr(z.art).includes('fessel')) t.push(`${T.Er} wurde gefesselt (§ 62 PolG NRW)${has(z.fesselGrund) ? '; die Fesselung war erforderlich, weil ' + slot(z.fesselGrund) : ''}.`);
    t.push(satz(z.text));
    t.push({ nein: 'Verletzt wurde dabei niemand.', bs: `${T.Nom} wurde dabei verletzt.`, beamte: 'Dabei wurden Einsatzkräfte verletzt.' }[z.verletzt] || '');
    if (C.gewahrsam(d)) {
      t.push(`${T.Er} wurde${um(g.zeit)} gemäß § 35 Abs. 1 Nr. 4 PolG NRW in Gewahrsam genommen. Der Gewahrsam war unerlässlich, weil ${has(g.grund) ? slot(g.grund) : PH('Tatsachen für die Unerlässlichkeit')}.`);
      const er = arr(g.erledigt);
      if (er.includes('grund')) t.push(`Der Grund der Freiheitsentziehung wurde ${T.dat} bekanntgegeben.`);
      if (er.includes('benachr')) t.push(`${T.Dat} wurde Gelegenheit gegeben, eine Person ${T.sein}es Vertrauens zu benachrichtigen (§ 37 Abs. 2 PolG NRW).`);
      if (er.includes('merkblatt')) t.push('Das Merkblatt über Rechte und Pflichten im Gewahrsam wurde ausgehändigt.');
      if (er.includes('faehig')) t.push('Bedenken gegen die Gewahrsamsfähigkeit bestanden nicht.');
      const ag = has(g.ag) ? str(g.ag) : 'zuständigen Amtsgericht';
      t.push({ beantragt: `Die richterliche Entscheidung wurde${um(g.richterZeit)} beim ${ag} beantragt (§ 36 Abs. 1 PolG NRW).`, fortdauer: `Das ${has(g.ag) ? str(g.ag) : 'zuständige Amtsgericht'} ordnete${um(g.richterZeit)} die Fortdauer des Gewahrsams an.`, abgelehnt: `Das ${has(g.ag) ? str(g.ag) : 'zuständige Amtsgericht'} lehnte${um(g.richterZeit)} die Fortdauer des Gewahrsams ab; ${T.nom} wurde entlassen.` }[g.richter] || '');
    }
    return P(...t);
  }
  function s63(d, x) {
    const s = get(d, 'straf') || {}, t = [];
    const del = mit(arr(s.delikte).map(k => C.DELIKT[k]).filter(Boolean).map(v => (/^eines /.test(v) ? v : 'der ' + v)), s.delikteFrei);
    if (del.length) t.push(`Von Amts wegen wurde Strafanzeige wegen des Verdachts ${joinList(del)} gefertigt.`);
    if (inc(d, 'os.hinweise', 'amtswegen')) t.push('Die Beteiligten wurden darüber informiert, dass die Tat unabhängig von einem Strafantrag von Amts wegen verfolgt wird.');
    t.push(...pick({ notruf: 'Die Sicherung der Notrufaufzeichnung wurde veranlasst.', wohnung: 'Vom Zustand der Wohnung wurden Lichtbilder gefertigt.', tatmittel: has(s.tatmittel) ? `Als Tatmittel wurde sichergestellt: ${endDot(slot(s.tatmittel))}` : 'Das Tatmittel wurde sichergestellt.', handy: 'Ein Mobiltelefon wurde als Beweismittel sichergestellt.', bodycam: 'Der Einsatz wurde mit der Bodycam aufgezeichnet (§ 15c PolG NRW).', kleidung: 'Kleidung wurde als Spurenträger gesichert.' }, arr(s.beweise)));
    t.push(satz(s.beweiseText));
    t.push({ richter: `Bei ${x.T.dat} wurde${um(s.blutZeit)} auf richterliche Anordnung eine Blutprobe entnommen (§ 81a StPO).`, eil: `Der Versuch, eine richterliche Anordnung zu erlangen, blieb${um(s.blutZeit)} ohne Erfolg; wegen Gefährdung des Untersuchungserfolgs wurde die Entnahme einer Blutprobe angeordnet (§ 81a Abs. 2 StPO).` }[x.da ? s.blut : ''] || '');
    return P(...t);
  }
  function s64(d, x) {
    const { G, T } = x, o = get(d, 'os') || {}, h = arr(o.hinweise), t = [];
    if (h.includes('gewschg')) t.push(`${G.Nom} wurde auf die Möglichkeit hingewiesen, zivilrechtlichen Schutz nach dem Gewaltschutzgesetz zu beantragen` + (x.wv ? `. ${G.Er} wurde außerdem darüber unterrichtet, dass sich das Rückkehrverbot verlängert, wenn der Antrag bis zum Ablauf des ${fmtDate(x.ende)} gestellt wird – bis zur gerichtlichen Entscheidung, längstens bis zum Ablauf des ${fmtDate(x.max)} (§ 34a Abs. 4, 5 PolG NRW).` : '.'));
    if (h.includes('beratung')) t.push(has(o.stelle) ? `Als Beratungsstelle wurde ${G.dat} benannt: ${endDot(str(o.stelle))}` : `${G.Dat} wurde eine geeignete Beratungsstelle benannt.`);
    if (h.includes('daten')) t.push({ ja: `In die Weitergabe ${G.sein}es Namens, ${G.sein}er Anschrift und Telefonnummer an die Beratungsstelle willigte ${G.er} ein (§ 34a Abs. 4 PolG NRW).`, nein: `In die Weitergabe ${G.sein}er Kontaktdaten an die Beratungsstelle willigte ${G.er} nicht ein; die Weitergabe unterbleibt.` }[o.einwilligung] || `Die Weitergabe ${G.sein}er Kontaktdaten an eine Beratungsstelle wurde ${G.dat} angeboten.`);
    const unt = [h.includes('doku') ? 'eine Kopie der Einsatzdokumentation' : '', h.includes('merkblatt') ? 'das Merkblatt mit Hilfsangeboten' : ''].filter(Boolean);
    if (unt.length) t.push(`${G.Dat} ${unt.length > 1 ? 'wurden' : 'wurde'} ${joinList(unt)} ausgehändigt.`);
    if (h.includes('stpo')) t.push(`${G.Nom} wurde über ${G.sein}e Rechte als Verletzte${G.g === 'm' ? 'r' : ''} im Strafverfahren unterrichtet (§§ 406i ff. StPO).`);
    if (h.includes('notruf')) t.push(`${G.Nom} wurde angewiesen, bei einer Rückkehr ${T.gen} sofort den Notruf 110 zu wählen.`);
    if (h.includes('schloss')) t.push(`${G.Dat} wurde empfohlen, das Schloss der Wohnungstür auszutauschen.`);
    if (h.includes('getrennt') && x.da) t.push(`Die Hinweise wurden ${G.dat} ohne Beisein ${T.gen} erteilt.`);
    t.push(satz(o.text));
    t.push({ wohnung: `${G.Nom} verbleibt in der Wohnung.`, frauenhaus: `${G.Nom} wurde in einer Schutzeinrichtung untergebracht.`, dritte: `${G.Nom} begab sich zu Verwandten bzw. Bekannten.` }[o.verbleib] || '');
    const k = get(d, 'kind') || {}, n = C.kinderL(d).length;
    if (n) {
      t.push({ gs: `${n === 1 ? 'Das Kind verblieb' : 'Die Kinder verblieben'} bei ${G.dat}.`, dritte: `${n === 1 ? 'Das Kind wurde' : 'Die Kinder wurden'} von Verwandten bzw. Nachbarn betreut.`, jugendamt: `${n === 1 ? 'Das Kind wurde' : 'Die Kinder wurden'} durch das Jugendamt untergebracht.` }[k.betreuung] || '');
      t.push({ sofort: `Der Bereitschaftsdienst des Jugendamts wurde${um(k.jugendamtZeit)} verständigt.`, bericht: 'Eine Mitteilung an das Jugendamt wird gefertigt (§ 27 Abs. 2 PolG NRW).', nein: 'Von einer Mitteilung an das Jugendamt wurde abgesehen.' }[k.jugendamt] || '');
      t.push(satz(k.text));
    }
    t.push(...pick({ gb: 'Eine Gefährdungsbewertung wurde gefertigt.', kontrolle: 'Die Kontrolle des Rückkehrverbots ist vorgemerkt (§ 34a Abs. 7 PolG NRW).', folge: 'Die Folgeschichten wurden über das Rückkehrverbot informiert.', waffen: 'Die Waffenbehörde wurde unterrichtet.', sb: 'Der Vorgang wurde an die Sachbearbeitung übergeben.' }, arr(get(d, 'ab.erledigt'))));
    return P(...t);
  }
  const s71 = d => (has(get(d, 'einsatz.endeZeit')) ? `Der Einsatz wurde um ${fmtTime(get(d, 'einsatz.endeZeit'))} beendet.` : '');
  const s72 = d => str(get(d, 'ab.text')).split(/\n+/).map(z => satz(z)).filter(Boolean).join(' ');

  /* ---------- Bericht ---------- */
  function text(d) {
    const x = ctx(d);
    const ch = [
      ['Einsatzanlass', [[null, s1(d, x), 'einsatz']]],
      ['Eintreffsituation', [['Eintreffen und Zutritt', s21(d, x), 'eintreffen'], ['Angetroffene Personen', s22(d, x), 'angetroffen'], ['Verletzungen und medizinische Versorgung', s23(d, x), 'verletzungen']]],
      ['Tatörtlichkeit und Umstände vor Ort', [['Örtlichkeit und Spuren', s31(d, x), 'umstaende'], ['Beziehung und Wohnverhältnisse', s32(d, x), 'umstaende'], ['Kinder im Haushalt', s33(d, x), 'kinder']]],
      ['Schilderungen', aussagen(d, x)],
      ['Gefahrenprognose', [[null, s5(d, x), 'prognose']]],
      ['Maßnahmen', [[C.wvNein(d) ? 'Gefahrenabwehr' : C.bsWeg(d) ? 'Rückkehrverbot' : 'Wohnungsverweisung und Rückkehrverbot', s61(d, x), wvStep(d)], ['Zwang und Gewahrsam', s62(d, x), 'zwang'], ['Strafverfolgung und Beweissicherung', s63(d, x), 'straf'], ['Opferschutz, Kinder und weitere Maßnahmen', s64(d, x), 'opfer']]],
      ['Abschluss', [['Einsatzende', s71(d), 'abschluss'], ['Bemerkungen', s72(d), 'abschluss']]]
    ];
    const out = []; let c = 0;
    for (const [title, subs] of ch) {
      const ok = subs.filter(s => has(s[1]));
      if (!ok.length) continue; c++;
      if (ok.length === 1 && ok[0][0] == null) { out.push([String(c), title, ok[0][1], ok[0][2]]); continue; }
      out.push([String(c), title]);
      ok.forEach((s, j) => out.push([`${c}.${j + 1}`, s[0] || title, s[1], s[2]]));
    }
    return out;
  }
  function plain(d) {
    const az = get(d, 'straf.az');
    return `Sachverhalt – Häusliche Gewalt${has(az) ? '\nVorgang: ' + str(az) : ''}\n\n` + text(d).map(([n, t, body]) => (body == null ? `${n} ${t}` : `${n} ${t}\n${body}`)).join('\n\n');
  }
  function preview(stepId, d) {
    const st = root.WHG_STEPS.find(s => s.id === stepId); if (!st) return '';
    const ids = Array.isArray(st.gen) ? st.gen : [st.gen];
    if (ids.includes('kurz')) return kurz(d);
    return text(d).filter(s => s[2] != null && ids.includes(s[3])).map(s => `${s[0]} ${s[1]}\n${s[2]}`).join('\n\n');
  }
  function kurz(d) {
    const x = ctx(d), { G, T } = x, e = get(d, 'einsatz') || {}, t = [];
    const gw = mit(pick(C.GEWALT, arr(get(d, 'lage.gewalt'))), get(d, 'lage.gewaltFrei'));
    t.push(`Am ${has(e.datum) ? fmtDate(e.datum) : PH('Datum')}${has(e.zeit) ? ' gegen ' + fmtTime(e.zeit) : ''} kam es an der Anschrift ${x.adr || PH('Anschrift')} zu einem Einsatz wegen häuslicher Gewalt${gw.length ? ' (' + joinList(gw) + ')' : ''}.`);
    const g0 = (ofRole(d, 'gs')[0] || {}).p || {};
    if (has(g0.bez) && T.i >= 0) t.push(`Beteiligt waren ${G.nom} (${str(g0.bez)}) und ${T.nom}.`);
    if (has(g0.kern)) t.push(`Nach Angaben ${G.gen} habe ${T.nom} ${G.ihn} ${endDot(slot(g0.kern))}`);
    for (const { p, i } of C.verletzte(d)) { const r = x.R(i), v = mit(pick(C.VERL, arr(p.verl).filter(k => k !== 'keine')), p.verlFrei); if (v.length) t.push(`${r.Nom} wies ${joinList(v)} auf.`); }
    if (x.weg) t.push(`${T.Nom} wurde nicht angetroffen.`);
    if (x.wv) t.push(`Gegen ${T.akk} wurde ${x.da ? 'eine Wohnungsverweisung mit Rückkehrverbot' : 'ein Rückkehrverbot'} bis zum Ablauf des ${fmtDate(x.ende)} angeordnet (§ 34a PolG NRW).`);
    else if (C.wvNein(d)) t.push('Von einer Wohnungsverweisung wurde abgesehen.');
    if (C.gewahrsam(d)) t.push(`${T.Nom} wurde zur Durchsetzung in Gewahrsam genommen.`);
    const del = mit(arr(get(d, 'straf.delikte')).map(k => C.DELIKT[k]).filter(Boolean).map(s => (/^eines /.test(s) ? s : 'der ' + s)), get(d, 'straf.delikteFrei'));
    if (del.length) t.push(`Strafanzeige wegen des Verdachts ${joinList(del)} wurde gefertigt.`);
    const n = C.kinderL(d).length, ja = get(d, 'kind.jugendamt');
    if (n) t.push(`Im Haushalt ${n === 1 ? 'lebt ein Kind' : `leben ${ZAHL[n] || n} Kinder`}${ja === 'sofort' ? '; das Jugendamt wurde verständigt' : ja === 'bericht' ? '; das Jugendamt erhält eine Mitteilung' : ''}.`);
    return P(...t);
  }

  /* ---------- Begründung der Verfügung (§ 34a PolG NRW) ---------- */
  function begruendung(d) {
    if (!C.wvJa(d)) return '';
    const x = ctx(d, { vfg: true }), { G, T } = x, w = get(d, 'wv') || {}, p = get(d, 'prog') || {};
    const was = x.da ? 'eine Wohnungsverweisung mit Rückkehrverbot' : 'ein Rückkehrverbot';
    const a1 = P(anordnung(d, x, was), `Wird innerhalb dieser Frist zivilrechtlicher Schutz beantragt, endet die Maßnahme mit dem Tag der gerichtlichen Entscheidung, spätestens mit Ablauf des ${fmtDate(x.max)} (§ 34a Abs. 5 Satz 2 PolG NRW).`);
    const gsZ = people(d, q => ['gs', 'zeuge'].includes(q.rolle) && q.da !== 'nein').map(({ i }) => aussageGs(d, x, i, { ohneBel: true }));
    const a2 = B(s1(d, x), s22(d, x), s23(d, x), s31(d, x), s32(d, x), s33(d, x), ...gsZ);
    const a3 = x.da ? B(anhoerung(d, x) || PH('Anhörung'), aussageBs(d, x, { ohneBel: true })) : s61weg(d, x).split('\n\n')[1] || '';
    const a4 = s5(d, x);
    const e = [];
    e.push(`Die Maßnahme richtet sich gegen ${T.akk}, weil von ${T.ihm} die Gefahr ausgeht.`);
    e.push(mittelSatz(d));
    if (arr(w.orte).length || arr(w.weitere).length) e.push('Der räumliche Bereich ist auf die Wohnung und ihre unmittelbare Umgebung beschränkt, soweit dies zum wirkungsvollen Schutz der gefährdeten Person erforderlich ist (§ 34a Abs. 1 Satz 2 PolG NRW).');
    if (w.dauer === '14') e.push('Die Maßnahme wurde für die gesetzliche Regeldauer von 14 Tagen angeordnet (§ 34a Abs. 5 Satz 1 PolG NRW).');
    else if (w.dauer === 'kuerzer') e.push(`Die Dauer wurde abweichend von der Regel verkürzt${has(w.dauerGrund) ? ', weil ' + slot(w.dauerGrund) : ''}.`);
    const h = get(d, 'anh') || {};
    if (h.bindung === 'nein') e.push(`Eine berufliche oder versorgende Bindung ${T.gen} an die Wohnung, die eine Beschränkung auf Wohn- und Nebenräume erfordern würde (§ 34a Abs. 1 Satz 3 PolG NRW), wurde erfragt und besteht nach ${T.sein}en Angaben nicht.`);
    else if (['arbeit', 'pflege'].includes(h.bindung)) e.push(`Die von ${T.dat} angegebene Bindung an die Wohnung wurde berücksichtigt; ${PH('Abwägung, ob eine Beschränkung auf Wohn- und Nebenräume in Betracht kommt (§ 34a Abs. 1 Satz 3 PolG NRW)')}.`);
    if (has(h.unterkunft)) e.push(`${T.Er} kann nach eigenen Angaben ${slot(h.unterkunft)} unterkommen.`);
    if (ofRole(d, 'gs').some(y => y.p.wille === 'ablehnt') && !arr(p.bst).includes('wille')) e.push(`Dass ${G.nom} die Maßnahme ablehnt, steht ihr nicht entgegen; der Schutz von Leib, Leben und Freiheit steht nicht zu ihrer Disposition.`);
    const zg = x.da ? (inc(d, 'er.inh', 'zg') ? get(d, 'er.zgHoehe') : '') : get(d, 'abw.zgHoehe');
    const z = [];
    if (has(zg) || (x.da && inc(d, 'er.inh', 'zg'))) z.push(`Für jeden Fall der Zuwiderhandlung wird ein Zwangsgeld in Höhe von ${euro(zg) || PH('Betrag')} angedroht (§§ 51, 53, 56 PolG NRW).`);
    if (x.da ? inc(d, 'er.inh', 'ersatzhaft') : has(zg)) z.push('Ist das Zwangsgeld uneinbringlich, kann das Verwaltungsgericht Ersatzzwangshaft anordnen (§ 54 Abs. 1 PolG NRW).');
    z.push('Die Verfügung ist als unaufschiebbare Anordnung eines Polizeivollzugsbeamten sofort vollziehbar (§ 80 Abs. 2 Satz 1 Nr. 2 VwGO).', '[Rechtsbehelfsbelehrung nach Vordruck der Behörde]');
    return [
      `Begründung – ${x.da ? 'Wohnungsverweisung mit Rückkehrverbot' : 'Rückkehrverbot'} (§ 34a PolG NRW)`,
      '1. Anordnung\n' + a1,
      '2. Sachverhalt\n' + a2,
      '3. Anhörung\n' + (a3 || PH('Anhörung')),
      '4. Gefahrenprognose\n' + (a4 || PH('Gefahrenprognose')),
      '5. Ermessen und Verhältnismäßigkeit\n' + P(...e),
      '6. Zwangsmittel und Hinweise\n' + P(...z)
    ].join('\n\n');
  }

  /* ---------- Noch zu erledigen ---------- */
  function offen(d) {
    const o = [], x = ctx(d), add = (c, s) => { if (c && !o.includes(s)) o.push(s); };
    const z = get(d, 'zutritt') || {}, w = get(d, 'wv') || {}, e = get(d, 'er') || {}, a = get(d, 'abw') || {}, pr = get(d, 'prog') || {}, h = get(d, 'anh') || {}, b = get(d, 'bsb') || {}, k = get(d, 'kind') || {};
    const os = arr(get(d, 'os.hinweise')), ab = arr(get(d, 'ab.erledigt'));
    // Personen
    add(!ofRole(d, 'gs').length, 'Geschädigte Person im Schritt „Beteiligte Personen“ anlegen.');
    add(!ofRole(d, 'bs').length, 'Beschuldigte Person anlegen – auch wenn sie nicht mehr vor Ort ist.');
    for (const { p, i } of plist(d).map((p, i) => ({ p, i })).filter(y => isP(y.p))) {
      const r = x.R(i);
      add(!has(p.da), `${r.Nom}: vermerken, ob ${r.er} beim Eintreffen vor Ort war.`);
      if (p.verletzt === 'ja') {
        add(!has(p.rtw) && p.rolle !== 'bs', `${r.Nom}: fragen, ob ${r.er} einen Rettungswagen oder ärztliche Hilfe benötigt, und die Antwort festhalten.`);
        add(!['ja', 'abgelehnt'].includes(p.foto), `${r.Nom}: Lichtbilder der Verletzungen fertigen und der Strafanzeige beifügen${p.rolle === 'bs' ? ' (§ 81b Abs. 1 StPO)' : ''}.`);
        add(p.rolle !== 'bs' && p.foto === 'ja' && C.angehoerig(p) && p.fotoBel !== 'ja', `${r.Nom}: Belehrung über das Weigerungsrecht vor den Lichtbildern vermerken (§ 81c Abs. 3 StPO).`);
        add(p.rolle !== 'bs' && p.attest !== 'ja', `${r.Nom}: auf ärztliche Dokumentation der Verletzungen (Attest) hinweisen.`);
      }
      if (['gs', 'zeuge'].includes(p.rolle) && p.da !== 'nein') {
        add(!has(p.bel), `${r.Nom}: Belehrung vermerken – wer, wann, welche Inhalte.`);
        add(['52', '57', 'bs'].includes(p.bel) && (!has(p.belZeit) || !has(p.belVon)), `${r.Nom}: Uhrzeit und belehrende Person der Belehrung nachtragen.`);
        add(['52', '57', 'bs'].includes(p.bel) && !arr(p.belInh).length, `${r.Nom}: Inhalte der Belehrung antippen.`);
        add(p.bel === '52' && !arr(p.belInh).includes('zvr'), `${r.Nom}: Belehrung über das Zeugnisverweigerungsrecht vermerken (§ 52 Abs. 3 StPO).`);
        add(p.bel === '52' && !has(p.belErkl), `${r.Nom}: Erklärung nach der Belehrung vermerken (aussagebereit oder Zeugnisverweigerung).`);
        add(p.bel === 'bs' && !has(p.bsVert), `${r.Nom}: Entscheidung über die Verteidigerkonsultation vermerken (§ 168b Abs. 3 Satz 2 StPO).`);
        add(p.bel === '57' && C.zvrOf(p.bez) !== false && p.rolle === 'gs', `${r.Nom}: prüfen, ob ein Zeugnisverweigerungsrecht besteht (§ 52 Abs. 1 StPO, z. B. Verlöbnis) – dann nach § 52 belehren.`);
        add(p.modus === 'folgt' || (p.modus === 'jetzt' && !has(p.text)), `${r.Nom}: Schilderung nachtragen.`);
      }
      if (p.rolle === 'gs') add(!has(get(p, 'p.nachname')), 'Personalien der geschädigten Person erfassen (Reiter Personalien).');
      if (p.rolle === 'bs') add(!has(get(p, 'p.nachname')), 'Personalien der beschuldigten Person erfassen.');
    }
    // Zutritt
    add(C.zutrittGegen(d) && !arr(z.tatsachen).length && !has(z.tatsachenFrei), 'Tatsachen für die gegenwärtige Gefahr beim Betreten festhalten (§ 41 Abs. 1 Satz 1 Nr. 4 PolG NRW).');
    if (C.zutrittGegen(d) && z.gesucht === 'ja') {
      add(!arr(z.durchs).includes('gefahr'), 'Durchsuchung: Tatsachen für die Gefahr im Verzug vermerken (§ 42 Abs. 1 PolG NRW).');
      add(!arr(z.durchs).includes('niederschrift'), 'Niederschrift über die Durchsuchung fertigen (§ 42 Abs. 4 PolG NRW).');
    }
    // Beschuldigte Person
    if (x.da) {
      const bi = arr(b.inh);
      add(!bi.length, 'Beschuldigtenbelehrung vor der ersten Frage zur Tat vermerken – wer, wann, welche Inhalte (§ 163a Abs. 4, § 136 Abs. 1 StPO).');
      add(bi.length && !(has(b.zeit) && has(b.von)), 'Uhrzeit und belehrende Person der Beschuldigtenbelehrung nachtragen (§ 168b Abs. 3 StPO).');
      const fehlt = ['tat', 'schweigen', 'verteidiger'].filter(q => !bi.includes(q)).map(q => C.BEL_B[q]);
      add(bi.length && fehlt.length, `Beschuldigtenbelehrung unvollständig: ${fehlt.join(', ')}.`);
      add(bi.length && !has(b.vert), 'Entscheidung über die Verteidigerkonsultation vermerken (§ 168b Abs. 3 Satz 2 StPO).');
      add(b.modus === 'folgt', 'Einlassung der beschuldigten Person nachtragen.');
      const hi = arr(h.inh);
      add(x.wv && !hi.includes('vorwurf'), 'Anhörung zur Wohnungsverweisung vermerken: Vorwürfe mitgeteilt, Gelegenheit zur Äußerung (§ 28 VwVfG NRW, OVG NRW 5 A 3548/20).');
      add(x.wv && hi.length && !(has(h.zeit) && has(h.von)), 'Uhrzeit und Person der Anhörung nachtragen.');
    }
    // Kinder
    if (C.kinderDa(d)) {
      add(!k.betreuung, 'Betreuung der Kinder klären und festhalten.');
      add(!k.jugendamt, 'Verständigung des Jugendamts prüfen und Ergebnis vermerken (§ 27 Abs. 2 PolG NRW).');
      add(k.jugendamt === 'bericht', 'Mitteilung an das Jugendamt fertigen (§ 27 Abs. 2 PolG NRW).');
      add(markOfSafe(d, 'kindergewalt') && k.jugendamt !== 'sofort', 'Gewalt gegen ein Kind: Jugendamt sofort einschalten.');
    }
    // Prognose
    add(!pr.gefahr, 'Gefahrenprognose abschließen: gegenwärtige Gefahr ja oder nein.');
    add(C.anyMark(d, 'annahme') && !has(pr.fGrund), 'Angenommene Umstände: benennen, worauf sich die Annahmen stützen.');
    if (x.wv) {
      add(pr.gefahr === 'nein', 'Widerspruch: Wohnungsverweisung angeordnet, aber gegenwärtige Gefahr verneint.');
      add(pr.muster === 'weder' || C.nurVerbal(d), 'Prognose trägt so nicht: weder Gewaltbeziehung noch intensive Ersttat bzw. nur verbaler Streit (OVG NRW 5 A 3548/20).');
      add(!has(pr.warum), 'Begründen, warum in allernächster Zeit weitere Übergriffe drohen.');
      add(!has(pr.wuerdigung), 'Begründen, warum den Angaben gefolgt wird – besonders ohne objektive Stütze.');
      add(arr(pr.bst).includes('wechselseitig') && !has(pr.wechselGrund), 'Wechselseitige Vorwürfe: Tatsachen benennen, aus denen sich ergibt, von wem die Gefahr ausgeht.');
      // Maßnahme
      add(!has(w.zeit), 'Uhrzeit der Anordnung vermerken.');
      add(!arr(w.orte).length && !arr(w.weitere).length, 'Räumlichen Bereich genau bezeichnen (§ 34a Abs. 1 Satz 2 PolG NRW).');
      add(!has(w.mittel), 'Begründen, warum kein milderes Mittel genügte.');
      add(w.dauer === 'kuerzer' && !has(w.dauerGrund), 'Grund der kürzeren Dauer angeben.');
      if (x.da) {
        const ei = arr(e.inh);
        const fehlt = ['anordnung', 'bereich', 'dauer', 'verlaengerung', 'gegenst', 'anschrift'].filter(q => !ei.includes(q)).map(q => C.ER[q]);
        add(fehlt.length, `Eröffnung: noch nicht vermerkt – ${fehlt.join(', ')} (§ 34a Abs. 1–3, 5, 6 PolG NRW).`);
        add(!ei.includes('zg'), 'Zwangsgeld in bestimmter Höhe androhen (§§ 53, 56 Abs. 5 PolG NRW).');
        add(ei.includes('zg') && !has(e.zgHoehe), 'Höhe des Zwangsgeldes vermerken.');
        add(ei.includes('zg') && !ei.includes('ersatzhaft'), 'Auf Ersatzzwangshaft hinweisen – sonst kann sie später nicht angeordnet werden (§ 54 Abs. 1 PolG NRW).');
        add(!has(e.schluessel), 'Haus- und Wohnungsschlüssel: Herausgabe verlangen und Ergebnis vermerken.');
        add(['sicher', 'weg'].includes(e.schluessel) && e.schluesselBesch !== 'ja', 'Bescheinigung über die sichergestellten Schlüssel aushändigen (§ 44 Abs. 2 PolG NRW).');
        add(!e.schrift || e.schrift === 'offen', 'Schriftliche Bestätigung mit Zwangsgeldandrohung zustellen (§ 56 Abs. 6 PolG NRW).');
        add(C.nachtEr(d) && ['vorort', 'verweigert'].includes(e.schrift) && e.erlaubnis !== 'ja', 'Zustellung zur Nachtzeit / am Sonn- oder Feiertag: Erlaubnis der Behördenleitung klären (§ 5 Abs. 3 LZG NRW) – bei verweigerter Annahme sonst unwirksam.');
        add(e.schrift === 'verweigert', 'Annahme verweigert: Zustellung prüfen; das Schriftstück darf nicht in der Wohnung zurückbleiben, wenn es die Person dort nicht erreicht – beim nächsten Antreffen erneut aushändigen.');
        add(!e.verlassen, 'Vermerken, wie die Person die Wohnung verlassen hat.');
      }
      if (x.weg) {
        add(a.bekannt === 'nein' || !a.bekannt, 'Rückkehrverbot bekanntgeben – bis dahin wirkt es nicht (§ 43 Abs. 1 VwVfG NRW); Folgeschicht informieren.');
        add(!a.zust || a.zust === 'offen', 'Schriftliche Verfügung mit Zwangsgeldandrohung zustellen (§ 56 Abs. 6 PolG NRW).');
        add(['briefkasten', 'niederlegung'].includes(a.zust), 'Ersatzzustellung in der Wohnung, aus der die Person verwiesen ist, ist rechtlich nicht geklärt – beim Antreffen zusätzlich persönlich gegen Empfangsbekenntnis aushändigen.');
        add(a.zust === 'niederlegung' && !a.zustGrund && !has(a.zustGrundText), 'Niederlegung: Grund vermerken, warum das Einlegen in den Briefkasten nicht möglich war (§ 181 Abs. 1 ZPO).');
        add(a.zust === 'hinweis', 'Nur Hinweis an der Tür – keine Zustellung: Verfügung mit Zwangsgeldandrohung förmlich zustellen bzw. beim Abholen gegen Empfangsbekenntnis aushändigen.');
        add(!has(a.zgHoehe), 'Zwangsgeld in bestimmter Höhe in der schriftlichen Verfügung androhen (§ 56 Abs. 5 PolG NRW).');
        add(C.nachtAbw(d) && ['pers', 'briefkasten', 'niederlegung'].includes(a.zust) && a.erlaubnis !== 'ja', 'Zustellung zur Nachtzeit / am Sonn- oder Feiertag: Erlaubnis der Behördenleitung klären (§ 5 Abs. 3 LZG NRW).');
        add(a.erreichbar === 'nein', 'Anhörung beim Antreffen nachholen und die Verfügung überprüfen (§ 28 Abs. 2 VwVfG NRW).');
      }
    }
    if (C.gewahrsam(d)) {
      const g = get(d, 'gew') || {};
      add(!g.richter || g.richter === 'offen', 'Richterliche Entscheidung über den Gewahrsam unverzüglich herbeiführen (§ 36 PolG NRW).');
      add(!arr(g.erledigt).includes('grund'), 'Grund der Freiheitsentziehung bekanntgeben (§ 37 Abs. 1 PolG NRW).');
      add(!arr(g.erledigt).includes('benachr'), 'Benachrichtigung einer Vertrauensperson ermöglichen (§ 37 Abs. 2 PolG NRW).');
    }
    // Strafverfahren
    add(!arr(get(d, 'straf.delikte')).length && !has(get(d, 'straf.delikteFrei')), 'Strafanzeige von Amts wegen fertigen und Delikte benennen.');
    add(markOfSafe(d, 'waffenzugang') && !ab.includes('waffen'), 'Waffenbehörde unterrichten (§ 6a Abs. 2 WaffG) und Sicherstellung von Waffen prüfen.');
    // Opferschutz
    add(!os.includes('gewschg'), 'Auf zivilrechtlichen Schutz nach dem Gewaltschutzgesetz hinweisen (§ 34a Abs. 4 PolG NRW).');
    add(!os.includes('beratung'), 'Beratungsstelle benennen (§ 34a Abs. 4 PolG NRW).');
    add(!os.includes('daten'), 'Weitergabe der Kontaktdaten an eine Beratungsstelle anbieten (§ 34a Abs. 4 PolG NRW).');
    add(os.includes('daten') && !get(d, 'os.einwilligung'), 'Einwilligung in die Datenweitergabe vermerken.');
    add(!os.includes('stpo'), 'Über die Rechte als Verletzte/r unterrichten (§§ 406i ff. StPO).');
    add(x.wv && !os.includes('notruf'), 'Geschädigte Person anweisen, bei einer Rückkehr sofort 110 zu wählen.');
    // Abschluss
    add(x.wv && !ab.includes('kontrolle'), 'Kontrolle des Rückkehrverbots vormerken – mindestens einmal (§ 34a Abs. 7 PolG NRW).');
    add(x.wv && !ab.includes('folge'), 'Folgeschichten über das Rückkehrverbot informieren.');
    add(!ab.includes('gb'), 'Gefährdungsbewertung fertigen.');
    add(!ab.includes('sb'), 'Vorgang an die Sachbearbeitung übergeben.');
    return o;
  }
  const markOfSafe = (d, k) => !!C.markOf(d, k);

  function personalien(d) {
    const rows = plist(d).map((p, i) => [p, i]).filter(([p]) => isP(p)).map(([p, i]) => {
      const q = p.p || {};
      const rolle = C.pl(p, i).split(' · ')[0];
      const name = [str(q.nachname), str(q.vorname)].filter(Boolean).join(', ');
      return [`${rolle}${has(p.bez) ? ' (' + str(p.bez) + ')' : ''}: ${name || '[Name]'}`, has(q.geb) ? 'geb. ' + fmtDate(q.geb) : (has(p.alter) ? `${p.alter} Jahre` : ''), str(q.anschrift), has(q.tel) ? 'Tel. ' + str(q.tel) : ''].filter(Boolean).join(' · ');
    });
    return rows.length ? rows.join('\n') : 'Noch keine Personen erfasst.';
  }
  function title(d) {
    const o = get(d, 'ort') || {};
    const ort = [[str(o.strasse), str(o.hausnr)].filter(has).join(' '), str(o.stadt).replace(/^\d{5}\s*/, '')].filter(has).join(' · ');
    return ['HG', ort, has(get(d, 'einsatz.datum')) ? fmtDate(get(d, 'einsatz.datum')) : ''].filter(Boolean).join(' · ');
  }
  function subtitle(d) {
    const g0 = (ofRole(d, 'gs')[0] || {}).p || {};
    return [has(g0.bez) ? 'Geschädigte Person: ' + str(g0.bez) : '', C.bsDa(d) ? 'Beschuldigte Person vor Ort' : C.bsWeg(d) ? 'Beschuldigte Person nicht angetroffen' : '', C.wvJa(d) ? `§ 34a bis ${fmtDate(C.wvEnde(d))}` : C.wvNein(d) ? 'ohne § 34a' : ''].filter(Boolean).join(' · ');
  }

  /* ---------- Ältere Vorgänge (Version 1) in das neue Format überführen ---------- */
  function upgrade(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data.pers) || get(data, 'meta.v') === 2) return null;
    const v1 = data.gs || data.bs || data.kinder || data.zeugen || data.gsa || data.bel || get(data, 'lage.bs') || data.verl;
    if (!v1) { const n = JSON.parse(JSON.stringify(data)); n.meta = { ...(n.meta || {}), v: 2 }; return n; }
    const o = JSON.parse(JSON.stringify(data));
    if (o.einsatz && has(o.einsatz.meldung)) { o.einsatz.meldungAlt = o.einsatz.meldung; delete o.einsatz.meldung; }
    const L = o.lage || {}, verl = o.verl || {}, gsa = o.gsa || {}, bel = o.bel || {}, sp = o.spontan || {}, ein = o.eintreff || {};
    const pp = q => { const r = {}; for (const k of ['nachname', 'vorname', 'geb', 'anschrift', 'tel']) if (q && has(q[k])) r[k] = q[k]; return Object.keys(r).length ? r : undefined; };
    const bezMap = { ehe: { w: 'Ehefrau', m: 'Ehemann' }, lg: { w: 'Lebensgefährtin', m: 'Lebensgefährte' }, getrennt: { w: 'frühere Partnerin', m: 'früherer Partner' }, wg: { w: 'Mitbewohnerin', m: 'Mitbewohner' } };
    const pers = [];
    const gs0 = o.gs || {};
    const gsG = gs0.geschlecht === 'm' ? 'm' : gs0.geschlecht === 'd' ? 'd' : 'w';
    pers.push({
      rolle: 'gs', geschlecht: gs0.geschlecht, bez: (bezMap[L.beziehung] || {})[gsG] || undefined, da: 'ja', verletzt: ['gs', 'beide'].includes(L.verletzt) ? 'ja' : (L.verletzt ? 'nein' : undefined),
      p: pp(gs0), zust: ein.zustGs, zustFrei: ein.zustGsFrei, konsum: gs0.alkohol, konsumText: gs0.alkoholText, spontan: sp.gs, spontanZeit: sp.gsZeit,
      verl: verl.gs, verlFrei: verl.gsFrei, verlWo: verl.gsWo, schmerz: verl.gsSchmerz, rtw: verl.rtw, kh: verl.kh, rtwText: verl.text, foto: { ja: 'ja', abgelehnt: 'abgelehnt', spaeter: 'spaeter', keine: undefined }[verl.fotoGs], attest: verl.attest,
      bel: { 52: '52', 57: '57' }[bel.gs], belZeit: bel.gsZeit, modus: { jetzt: 'jetzt', spaeter: 'folgt', keine: 'keine' }[gsa.modus], text: gsa.text, anlass: gsa.anlass, tatzeit: gsa.zeit, raum: gsa.raum, raumText: gsa.raumText, kern: gsa.handlungFrei,
      frueher: gsa.frueher, frueherText: gsa.frueherText, angst: gsa.angst, wille: gsa.wille, bleibt: gsa.bleibt, antrag: gsa.antrag
    });
    const bs0 = o.bs || {};
    pers.push({
      rolle: 'bs', geschlecht: bs0.geschlecht, da: L.bs === 'nein' ? 'nein' : L.bs === 'ja' ? 'ja' : undefined, verletzt: ['bs', 'beide'].includes(L.verletzt) ? 'ja' : (L.verletzt ? 'nein' : undefined),
      p: pp(bs0), zust: ein.zustBs, zustFrei: ein.zustBsFrei, konsum: bs0.alkohol, konsumText: bs0.alkoholText, aat: bs0.aat, aatWert: bs0.aatWert, aatEinheit: has(bs0.aatWert) ? 'mgl' : undefined,
      bes: bs0.bes, besText: bs0.besText, spontan: sp.bs, spontanZeit: sp.bsZeit, verl: verl.bs, verlFrei: verl.bsFrei, verlWo: verl.bsWo, foto: verl.fotoBs
    });
    for (const k of arr(o.kinder)) if (hasObj(k)) pers.push({ rolle: 'kind', alter: k.alter, da: k.da === 'nein' ? 'nein' : 'ja', zust: k.zust, zustFrei: k.zustFrei, spontan: k.spontan, p: has(k.vorname) ? { vorname: k.vorname } : undefined });
    const artMap = { nachbar: 'Nachbar/in', angehoerig: 'Angehörige/r', besuch: 'Besuch' };
    for (const z of arr(o.zeugen)) if (hasObj(z)) pers.push({ rolle: 'zeuge', geschlecht: get(z, 'p.geschlecht'), bez: z.art === 'sonst' ? z.artText : artMap[z.art], da: 'ja', p: pp(z.p), wahr: z.wahr, modus: { jetzt: 'jetzt', spaeter: 'folgt', keine: 'keine' }[z.modus], text: z.text });
    o.pers = pers.map(p => { for (const k of Object.keys(p)) if (p[k] === undefined || p[k] === null || p[k] === '' || (Array.isArray(p[k]) && !p[k].length)) delete p[k]; return p; });
    if (has(o.zutritt && o.zutritt.wer)) o.zutritt.wer = { gs: '0', bs: '1' }[o.zutritt.wer] || 'andere';
    o.lage = { gewalt: L.gewalt, gewaltFrei: L.gewaltFrei, wohnt: { ja: 'gemeinsam', nein: 'besuch' }[L.wohnt], bezText: L.beziehungText };
    if (bel.bs === 'ja' || bel.bsReaktion || o.bsa) o.bsb = { zeit: bel.bsZeit, reaktion: bel.bsReaktion === 'anwalt' ? 'schweigt' : bel.bsReaktion, vert: bel.bsReaktion === 'anwalt' ? 'ja' : undefined, kern: get(o, 'bsa.kern'), modus: { jetzt: 'jetzt', spaeter: 'folgt', keine: 'keine' }[get(o, 'bsa.modus')], text: get(o, 'bsa.text') };
    const ah = o.anh || {};
    if (ah.vorhalt || ah.reaktion) o.anh = { zeit: ah.zeit, reaktion: ah.reaktion, text: ah.text, unterkunft: ah.unterkunft, inh: [...({ alle: ['vorwurf', 'frueher'], heute: ['vorwurf'] }[ah.vorhalt] || []), ...arr(ah.fragen)] };
    const W = o.wv || {}, pf = arr(W.pflichten);
    if (pf.length || W.schluessel || W.schrift || W.verlassen) {
      o.er = { inh: [...(pf.includes('bekannt') ? ['anordnung', 'bereich', 'dauer'] : []), ...(pf.includes('dauer') ? ['verlaengerung'] : []), ...(pf.includes('gegenst') ? ['gegenst'] : []), ...(pf.includes('anschrift') ? ['anschrift'] : []), ...(pf.includes('rechtsschutz') ? ['rechtsbehelf'] : []), ...(pf.includes('folgen') ? ['gewahrsam'] : []), ...(W.zg === 'ja' ? ['zg', 'ersatzhaft'] : [])],
        zgHoehe: W.zgHoehe, gegenst: W.gegenst, anschrift: W.anschrift, schluessel: { sicher: 'sicher', keine: 'keine', schloss: 'nicht' }[W.schluessel], schluesselAnz: W.schluesselAnz, schluesselBesch: W.schluessel === 'sicher' ? 'ja' : undefined,
        schrift: W.schrift, wache: W.wache, erlaubnis: W.erlaubnis, verlassen: W.verlassen, verlassenZeit: W.verlassenZeit };
    }
    const A = o.abw || {};
    if (Object.keys(A).length) {
      A.zust = { pers: 'pers', post: 'post', offen: 'offen', wache: 'hinweis' }[A.schrift] || (A.mitteilung === 'ja' ? 'hinweis' : undefined);
      if (has(W.zgHoehe) && L.bs === 'nein') A.zgHoehe = W.zgHoehe;
      delete A.schrift; delete A.mitteilung; o.abw = A;
    }
    o.wv = { angeordnet: W.angeordnet, datum: W.datum, zeit: W.zeit, orte: W.orte, weitere: W.weitere, dauer: W.dauer, ende: W.ende, dauerGrund: W.dauerGrund, mittel: W.mittel, grund: W.grund, grundText: W.grundText, alt: W.alt, altText: W.altText };
    const pr = o.prog || {};
    if (arr(pr.warn).length) { pr.f = pr.f || {}; for (const k of arr(pr.warn)) if (WARN_ALT_[k]) pr.f[WARN_ALT_[k]] = 'ja'; }
    if (has(pr.warnFrei)) pr.fFrei = `Als weiteres Warnsignal liegt vor: ${slot(pr.warnFrei)}`;
    delete pr.warn; delete pr.warnFrei; o.prog = pr;
    if (o.eintreff) { delete o.eintreff.zustGs; delete o.eintreff.zustBs; delete o.eintreff.zustGsFrei; delete o.eintreff.zustBsFrei; }
    for (const k of ['gs', 'bs', 'kinder', 'zeugen', 'gsa', 'bel', 'bsa', 'spontan', 'verl', 'zg']) delete o[k];
    if (o.kind) delete o.kind.opfer;
    o.meta = { ...(o.meta || {}), v: 2 };
    const clean = v => { if (Array.isArray(v)) return v.map(clean); if (v && typeof v === 'object') { const r = {}; for (const [k, x] of Object.entries(v)) { const c = clean(x); if (c === undefined || c === null || c === '' || (Array.isArray(c) && !c.length) || (c && typeof c === 'object' && !Array.isArray(c) && !Object.keys(c).length)) continue; r[k] = c; } return r; } return v; };
    return clean(o);
  }
  const WARN_ALT_ = C.WARN_ALT;

  root.WHG = Object.freeze({
    id: 'hg', name: 'Häusliche Gewalt', short: 'Häusliche Gewalt', kurz: 'HG',
    desc: 'Personen zuerst, dann je Person nur das Passende · Sachverhalt in sieben Abschnitten, Begründung § 34a, Kurzfassung, „Noch zu erledigen“',
    labels: {
      bericht: 'Sachverhalt', kurz: 'Kurzfassung', offen: 'Noch zu erledigen', newBtn: 'Häusliche Gewalt',
      kurzHint: 'Für die Kurzbeschreibung im Vorgang – nur bestätigte Angaben.',
      offenHint: 'Was nach Gesetz und Handlungsanweisung noch fehlt – jeweils mit Norm. Angehakte Punkte landen als Todos im Planner.',
      offenEmpty: 'Alle abgefragten Pflichtpunkte sind erledigt. Der Erlass vom 01.03.2024 und Dienstanweisungen deiner Behörde gehen vor.',
      persHint: 'Gesondert vom Sachverhalt. Eine Schutzanschrift der geschädigten Person gehört weder hierher noch in die Akte.'
    },
    steps: root.WHG_STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien, title, subtitle, begruendung, ctx, upgrade,
    extraTabs: [{ k: 'begr', l: 'Begründung § 34a', when: C.wvJa, hint: 'Für die schriftliche Bestätigung der Verfügung: Anordnung, Sachverhalt, Anhörung, Prognose, Ermessen, Zwangsmittel. Spricht von „gefährdeter Person“ und „Betroffenem“. Vor der Übernahme gegenlesen.', text: begruendung }]
  });
})(typeof window !== 'undefined' ? window : globalThis);
