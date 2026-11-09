/*
 * Workoholic · Schriftliche Arbeiten · Modul „Häusliche Gewalt“ (PolG NRW)
 * ---------------------------------------------------------------------------------------
 * Reine Daten + Textlogik, kein DOM. Wird von js/writer.js gerendert.
 *
 *  - STEPS: der Fragenkatalog in der Reihenfolge des Einsatzes (Lage → Einsatz → Vor Ort → Personen →
 *    Schilderungen → Prognose → Maßnahmen → Abschluss). Fast alles ist Antippen; Freitext nur als
 *    Satzfortsetzung. Jede Frage erscheint nur, wenn sie zum Fall passt (`when`).
 *  - text(d): Sachverhalt für Strafanzeige/Bericht; begruendung(d): Begründung der Wohnungsverweisung
 *    mit Rückkehrverbot (§ 34a PolG NRW) mit Bereich, Zeitraum, Prognose, Ermessen; offen(d): was laut
 *    Gesetz und Handlungsanweisung noch fehlt – jeweils mit Norm.
 *  - Sprache: im Sachverhalt „Geschädigte/r“ und „Beschuldigte/r“, in der Begründung der Verfügung
 *    „gefährdete Person“ und „Betroffene/r“. „Täter“ steht in keinem erzeugten Text.
 *
 * Fachliche Grundlagen: § 34a PolG NRW (14 Tage seit 13.12.2025), §§ 35–38, 41–44, 50–62 PolG NRW,
 * §§ 28, 37, 39, 41, 43 VwVfG NRW, LZG NRW, §§ 52, 81a–81c, 136, 163a, 406i, 406j StPO, Broschüre
 * „Häusliche Gewalt und polizeiliches Handeln“ (IM NRW 2007, über Nr. 34a.0 VV PolG NRW),
 * OVG NRW 5 A 3548/20 und 5 E 1202/14. Der Runderlass vom 01.03.2024 (VS) ist nicht eingearbeitet.
 * Details und Grenzen: docs/HG-MASTERPLAN.md.
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
  const sent = v => endDot(cap(str(v).replace(/[ \t]+/g, ' ')));
  const joinList = (list, word = 'und') => { const a = list.filter(Boolean); if (!a.length) return ''; if (a.length === 1) return a[0]; return a.slice(0, -1).join(', ') + ' ' + word + ' ' + a[a.length - 1]; };
  const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const fmtTime = t => (has(t) ? str(t) + ' Uhr' : '');
  const PH = s => `[${s}]`;
  const um = t => (has(t) ? ' um ' + fmtTime(t) : '');
  const addDays = (iso, n) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); if (!m) return ''; const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)); const p = x => String(x).padStart(2, '0'); return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`; };
  const weekday = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; };
  const hasObj = o => o && typeof o === 'object' && Object.keys(o).some(k => { const v = o[k]; return Array.isArray(v) ? v.length : v && typeof v === 'object' ? hasObj(v) : has(v); });
  const pick = (map, keys) => keys.map(k => map[k]).filter(Boolean);

  /* ======================= Rollen & Grammatik ======================= */
  // [Nominativ, Dativ, Akkusativ, Genitiv] je Geschlecht; zwei Sprachebenen (Strafverfahren / Verfügung)
  const ROLE = {
    gs:  { m: ['der Geschädigte', 'dem Geschädigten', 'den Geschädigten', 'des Geschädigten'], w: ['die Geschädigte', 'der Geschädigten', 'die Geschädigte', 'der Geschädigten'], d: ['die geschädigte Person', 'der geschädigten Person', 'die geschädigte Person', 'der geschädigten Person'] },
    bs:  { m: ['der Beschuldigte', 'dem Beschuldigten', 'den Beschuldigten', 'des Beschuldigten'], w: ['die Beschuldigte', 'der Beschuldigten', 'die Beschuldigte', 'der Beschuldigten'], d: ['die beschuldigte Person', 'der beschuldigten Person', 'die beschuldigte Person', 'der beschuldigten Person'] },
    gp:  { m: ['die gefährdete Person', 'der gefährdeten Person', 'die gefährdete Person', 'der gefährdeten Person'], w: ['die gefährdete Person', 'der gefährdeten Person', 'die gefährdete Person', 'der gefährdeten Person'], d: ['die gefährdete Person', 'der gefährdeten Person', 'die gefährdete Person', 'der gefährdeten Person'] },
    bt:  { m: ['der Betroffene', 'dem Betroffenen', 'den Betroffenen', 'des Betroffenen'], w: ['die Betroffene', 'der Betroffenen', 'die Betroffene', 'der Betroffenen'], d: ['die betroffene Person', 'der betroffenen Person', 'die betroffene Person', 'der betroffenen Person'] },
    zg:  { m: ['der Zeuge', 'dem Zeugen', 'den Zeugen', 'des Zeugen'], w: ['die Zeugin', 'der Zeugin', 'die Zeugin', 'der Zeugin'], d: ['die Zeugenperson', 'der Zeugenperson', 'die Zeugenperson', 'der Zeugenperson'] }
  };
  /** Personenreferenz mit Fällen, Pronomen und Possessiv; grammatisches Geschlecht folgt der Rollenbezeichnung. */
  function person(role, p, kl) {
    p = p || {};
    const g = p.geschlecht === 'w' ? 'w' : p.geschlecht === 'd' ? 'd' : p.geschlecht === 'm' ? 'm' : (role === 'gs' ? 'w' : 'm');
    const f = ROLE[role][g];
    const fem = role === 'gp' || g !== 'm';
    const name = kl && has(p.nachname) ? (g === 'w' ? 'Frau ' : g === 'm' ? 'Herr ' : '') + [str(p.vorname), str(p.nachname)].filter(Boolean).join(' ') : '';
    const tag = name ? `, ${name},` : '';
    return {
      g, fem, name, nom: f[0], dat: f[1], akk: f[2], gen: f[3], Nom: cap(f[0]), Dat: cap(f[1]), Akk: cap(f[2]),
      firstNom: f[0] + tag, FirstNom: cap(f[0]) + tag,
      er: fem ? 'sie' : 'er', Er: fem ? 'Sie' : 'Er', ihm: fem ? 'ihr' : 'ihm', ihn: fem ? 'sie' : 'ihn', sich: 'sich',
      sein: fem ? 'ihr' : 'sein', Sein: fem ? 'Ihr' : 'Sein'
    };
  }
  const gGs = d => get(d, 'gs.geschlecht');
  const gBs = d => get(d, 'bs.geschlecht');
  const ErGs = d => ({ m: 'Er' }[gGs(d)] || 'Sie');
  const ErBs = d => ({ w: 'Sie', d: 'Sie' }[gBs(d)] || 'Er');
  const erBs = d => ErBs(d).toLowerCase(), seinBs = d => (ErBs(d) === 'Er' ? 'sein' : 'ihr');
  const gsNom = d => person('gs', get(d, 'gs')).nom, gsAkk = d => person('gs', get(d, 'gs')).akk, gsDat = d => person('gs', get(d, 'gs')).dat;
  const bsNom = d => person('bs', get(d, 'bs')).nom, bsAkk = d => person('bs', get(d, 'bs')).akk, bsDat = d => person('bs', get(d, 'bs')).dat;

  /* ======================= Weichen ======================= */
  const bsDa = d => get(d, 'lage.bs') === 'ja';
  const bsWeg = d => get(d, 'lage.bs') === 'nein';
  const kinderDa = d => ['anwesend', 'haushalt'].includes(get(d, 'lage.kinder'));
  const verletztGs = d => ['gs', 'beide'].includes(get(d, 'lage.verletzt'));
  const verletztBs = d => ['bs', 'beide'].includes(get(d, 'lage.verletzt'));
  const wohntDort = d => get(d, 'lage.wohnt') !== 'nein';
  const nurVerbal = d => { const g = arr(get(d, 'lage.gewalt')); return g.length > 0 && g.every(x => ['verbal', 'sache'].includes(x)); };
  const zutrittGegen = d => ['verweigert', 'niemand'].includes(get(d, 'zutritt.art'));
  const angehoerig = d => ['ehe', 'familie', 'getrennt'].includes(get(d, 'lage.beziehung')) ? get(d, 'gs.zvr') !== 'nein' : get(d, 'gs.zvr') === 'ja';
  const wvJa = d => get(d, 'wv.angeordnet') === 'ja';
  const wvNein = d => get(d, 'wv.angeordnet') === 'nein';
  const gewahrsam = d => bsDa(d) && get(d, 'wv.verlassen') === 'gewahrsam';
  const zwang = d => bsDa(d) && ['zwang', 'gewahrsam'].includes(get(d, 'wv.verlassen'));
  const bsRedet = d => bsDa(d) && get(d, 'bel.bsReaktion') === 'aeussert';
  const wvTag = d => str(get(d, 'wv.datum')) || str(get(d, 'einsatz.datum'));
  const wvEnde = d => str(get(d, 'wv.ende')) || addDays(wvTag(d), 14);
  const wvMax = d => addDays(wvEnde(d), 14);
  const nacht = d => { const t = str(get(d, 'wv.zeit')); const h = /^(\d{2}):/.exec(t); const tag = weekday(wvTag(d)); return (h && (+h[1] >= 21 || +h[1] < 6)) || tag === 0; };

  /* ======================= Auswahllisten (Wert → Beschriftung → Textbaustein) ======================= */
  const BEZIEHUNG = { ehe: 'Ehe- bzw. Lebenspartner', lg: 'Partner einer nichtehelichen Lebensgemeinschaft', getrennt: 'getrennt lebende bzw. frühere Partner', familie: 'Familienangehörige', wg: 'Mitbewohner' };
  const GEWALT = { koerper: 'körperliche Gewalt', sexuell: 'sexuelle Gewalt', drohung: 'Bedrohung', freiheit: 'Festhalten oder Einsperren', verbal: 'verbaler Streit', sache: 'Sachbeschädigung' };
  const TATSACHEN = { schreie: 'aus der Wohnung waren Schreie zu hören', hilfe: 'aus der Wohnung waren Hilferufe zu hören', poltern: 'aus der Wohnung waren Poltern und Kampfgeräusche zu hören', nachbarn: 'Nachbarn berichteten von einer lautstarken Auseinandersetzung', notruf: 'nach dem Inhalt des Notrufs dauerte der Übergriff an', zweite: 'die zweite gemeldete Person war nicht zu sehen', kind: 'in der Wohnung weinte hörbar ein Kind' };
  const ZUST_GS = { weint: 'weinte', angst: 'wirkte verängstigt', aufgeloest: 'wirkte aufgelöst', zittert: 'zitterte', ruhig: 'wirkte ruhig und gefasst', aggressiv: 'verhielt sich aggressiv' };
  const ZUST_BS = { ruhig: 'verhielt sich ruhig', kooperativ: 'verhielt sich kooperativ', aggressiv: 'verhielt sich aggressiv', uneinsichtig: 'zeigte sich uneinsichtig', laut: 'schrie und war nur schwer zu beruhigen', drohend: 'sprach in Gegenwart der Polizei Drohungen aus' };
  const WOHNUNG = { moebel: 'umgestoßene Möbel', scherben: 'zerbrochene Gegenstände', blut: 'Blutanhaftungen', tuer: 'eine beschädigte Tür', verwuestet: 'eine verwüstete Einrichtung' };
  const VERL = { haematom: 'ein Hämatom', roetung: 'eine Rötung', schwellung: 'eine Schwellung', kratzer: 'Kratzspuren', platzwunde: 'eine Platzwunde', blutung: 'eine blutende Wunde', wuergemale: 'Würgemale am Hals', biss: 'eine Bissverletzung', abwehr: 'Abwehrverletzungen an den Unterarmen' };
  const HANDLUNG = { ohrfeige: 'mit der flachen Hand geschlagen', faust: 'mit der Faust geschlagen', tritt: 'getreten', wuergen: 'gewürgt', stoss: 'gestoßen', haare: 'an den Haaren gezogen', gegenstand: 'mit einem Gegenstand geschlagen', messer: 'mit einem Messer bedroht', festhalten: 'festgehalten bzw. eingesperrt', drohung: 'mit dem Tod bedroht', beleidigt: 'beleidigt' };
  const RAUM = { wohnzimmer: 'im Wohnzimmer', kueche: 'in der Küche', schlafzimmer: 'im Schlafzimmer', flur: 'im Flur', bad: 'im Badezimmer', kinderzimmer: 'im Kinderzimmer', draussen: 'außerhalb der Wohnung' };
  const KIND_ZUST = { unauffaellig: 'wirkte unauffällig', angst: 'wirkte verängstigt', weint: 'weinte', schlief: 'schlief', verletzt: 'war verletzt', miterlebt: 'hat die Auseinandersetzung nach eigener Wahrnehmung der Beamten miterlebt' };
  const VORG = { einsaetze: 'frühere Polizeieinsätze an der Anschrift', anzeigen: 'frühere Strafanzeigen', wv: 'eine frühere Wohnungsverweisung', schutz: 'eine gerichtliche Schutzanordnung', verstoss: 'Verstöße gegen frühere Anordnungen' };
  const STUETZEN = { verletzung: 'das festgestellte Verletzungsbild', wohnung: 'den Zustand der Wohnung', zeugen: 'die Angaben unbeteiligter Zeugen', notruf: 'den Inhalt des Notrufs', verhalten: 'das Verhalten des Beschuldigten in Gegenwart der Polizei', einlassung: 'die eigene Einlassung des Beschuldigten', vorerkenntnisse: 'die polizeilichen Vorerkenntnisse', kinder: 'den Zustand der Kinder' };
  const WARN = { trennung: 'Trennung oder Trennungsabsicht', todesdrohung: 'Todesdrohungen', wuergen: 'Angriff gegen den Hals', waffe: 'Einsatz von oder Zugang zu Waffen', kontrolle: 'ausgeprägtes Kontrollverhalten bzw. Nachstellung', suizid: 'Suiziddrohungen', eskalation: 'Zunahme von Häufigkeit oder Schwere der Übergriffe', angst: 'geäußerte Angst vor einer Eskalation' };
  const ORTE = { wohnung: 'die Wohnung', flur: 'den Hausflur und das Treppenhaus', keller: 'den Keller', speicher: 'den Dachboden', garage: 'die Garage bzw. den Stellplatz', garten: 'den Garten', grundstueck: 'das gesamte Grundstück einschließlich der Zuwegung' };
  const DELIKT = { 223: 'Körperverletzung (§ 223 StGB)', 224: 'gefährlichen Körperverletzung (§ 224 StGB)', 241: 'Bedrohung (§ 241 StGB)', 240: 'Nötigung (§ 240 StGB)', 239: 'Freiheitsberaubung (§ 239 StGB)', 185: 'Beleidigung (§ 185 StGB)', 303: 'Sachbeschädigung (§ 303 StGB)', 177: 'eines sexuellen Übergriffs (§ 177 StGB)', 238: 'Nachstellung (§ 238 StGB)', 4: 'eines Verstoßes gegen eine Schutzanordnung (§ 4 GewSchG)' };
  const DELIKT_KURZ = { 223: '§ 223 Körperverletzung', 224: '§ 224 gef. KV', 241: '§ 241 Bedrohung', 240: '§ 240 Nötigung', 239: '§ 239 Freiheitsberaubung', 185: '§ 185 Beleidigung', 303: '§ 303 Sachbeschädigung', 177: '§ 177 sex. Übergriff', 238: '§ 238 Nachstellung', 4: '§ 4 GewSchG' };
  const O = map => Object.entries(map).map(([k, v]) => [k, typeof v === 'string' ? cap(v) : v]);
  const JN = [['ja', 'Ja'], ['nein', 'Nein']];
  const MODUS = [['jetzt', 'Jetzt eintragen'], ['spaeter', 'Wird nachgetragen'], ['keine', 'Macht keine Angaben']];
  const KONSUM = [['Alkoholgeruch', 'deutlicher Alkoholgeruch in der Atemluft'], ['Aussprache', 'eine verwaschene Aussprache'], ['Gang', 'ein unsicherer Gang'], ['Augen', 'gerötete, glasige Augen'], ['Pupillen', 'auffällig veränderte Pupillen'], ['Reaktion', 'verzögerte Reaktionen'], ['Stimmung', 'starke Stimmungsschwankungen']];
  const PERS = ['geschlecht', 'nachname', 'vorname', 'geb', 'anschrift', 'tel'];

  /* ======================= Fragenkatalog ======================= */
  const STEPS = [
    /* ---------- Phase 1: Lage ---------- */
    {
      id: 'lage', phase: 'Lage', title: 'Worum geht es?', lead: 'Sechs kurze Antworten – danach fragt der Assistent nur noch, was zu diesem Einsatz passt.', gen: ['kurz'],
      fields: [
        { k: 'lage.bs', t: 'yn', l: 'Ist die Person, von der die Gewalt ausgegangen sein soll, am Einsatzort?', req: true, o: [['ja', 'Ja, angetroffen'], ['nein', 'Nein, nicht da']] },
        { k: 'lage.beziehung', t: 'choice', l: 'Beziehung der Beteiligten', req: true, o: [['ehe', 'Verheiratet / Lebenspartnerschaft'], ['lg', 'Lebensgemeinschaft'], ['getrennt', 'Getrennt / Ex-Partner'], ['familie', 'Familie (Eltern, Kinder, Geschwister)'], ['wg', 'Sonstige Wohngemeinschaft']] },
        { k: 'lage.wohnt', t: 'choice', l: 'Lebt diese Person in der Wohnung der geschädigten Person?', req: true, h: 'Maßgeblich sind Lebensmittelpunkt, Schlüssel, persönliche Sachen – nicht Mietvertrag oder Eigentum.', o: [['ja', 'Ja, gemeinsame Wohnung'], ['nein', 'Nein, Besuch / Ex-Partner'], ['unklar', 'Unklar']] },
        { t: 'info', when: d => get(d, 'lage.wohnt') === 'nein', text: 'Lebt die Person nicht in der Wohnung, ist § 34a PolG NRW unsicher. Sicher tragen Platzverweis und Betretungsverbot (§ 34 PolG NRW) sowie der Gewahrsam nach § 35 Abs. 1 Nr. 2.' },
        { k: 'lage.gewalt', t: 'multi', l: 'Was steht im Raum?', req: true, o: O(GEWALT) },
        { t: 'info', when: nurVerbal, text: 'Nur verbaler Streit oder Sachbeschädigung trägt eine Wohnungsverweisung nicht (OVG NRW 5 A 3548/20, Rn. 43). Es bleiben Gefährderansprache, freiwillige Trennung und die Strafanzeige.' },
        { k: 'lage.verletzt', t: 'choice', l: 'Wer ist verletzt?', o: [['niemand', 'Niemand sichtbar'], ['gs', 'Geschädigte Person'], ['bs', 'Beschuldigte Person'], ['beide', 'Beide']] },
        { k: 'lage.kinder', t: 'choice', l: 'Kinder im Haushalt?', o: [['keine', 'Keine'], ['anwesend', 'Ja, anwesend'], ['haushalt', 'Ja, gerade nicht da']] }
      ]
    },

    /* ---------- Phase 2: Einsatz ---------- */
    {
      id: 'einsatz', phase: 'Einsatz', title: 'Einsatzanlass', lead: 'Wann, auf welchem Weg und mit welcher Meldung kam der Einsatz?', gen: ['1.1'],
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute', req: true },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit der Einsatzübernahme', w: 'half', q: 'jetzt', req: true },
        { k: 'einsatz.meldeweg', t: 'choice', l: 'Meldeweg', o: [['leitstelle', 'Leitstelle / Notruf'], ['telefon', 'Telefonisch bei der Wache'], ['wache', 'Persönlich auf der Wache'], ['streife', 'Eigene Feststellung']] },
        { k: 'einsatz.mitteiler', t: 'choice', l: 'Wer hat gemeldet?', o: [['gs', 'Geschädigte Person'], ['kind', 'Kind'], ['nachbar', 'Nachbarn'], ['dritte', 'Sonstige Dritte'], ['bs', 'Beschuldigte Person'], ['unbekannt', 'Unbekannt']], when: d => get(d, 'einsatz.meldeweg') !== 'streife' },
        { k: 'einsatz.meldung', t: 'text', l: 'Was wurde gemeldet?', pre: 'Gemeldet wurde:', ph: 'eine lautstarke Auseinandersetzung mit Hilferufen einer Frau', join: ' und ', sugg: [['Streit', 'eine lautstarke Auseinandersetzung'], ['Hilferufe', 'Hilferufe aus der Wohnung'], ['Schläge', 'dass eine Frau von ihrem Partner geschlagen werde'], ['Bedrohung', 'eine Bedrohung durch den Partner']] },
        { k: 'ort.strasse', t: 'text', l: 'Straße', ph: 'Musterstraße', w: 'half', req: true },
        { k: 'ort.hausnr', t: 'text', l: 'Hausnummer', ph: '5', w: 'half' },
        { k: 'ort.stadt', t: 'text', l: 'Ort', ph: 'z. B. Rheine', w: 'half', recent: true, req: true },
        { k: 'ort.lage', t: 'text', l: 'Lage der Wohnung', ph: '2. OG links', w: 'half' }
      ]
    },
    {
      id: 'kraefte', phase: 'Einsatz', title: 'Eingesetzte Kräfte', lead: 'Wer war vor Ort? Ein Tipp übernimmt die Besatzung vom letzten Vorgang.', gen: ['1.1', '6.1'],
      fields: [
        { k: 'einsatz.rufname', t: 'text', l: 'Rufname / Einsatzmittel', ph: 'z. B. Stf 21/03', w: 'half', recent: true },
        { k: 'einsatz.kraefte', t: 'crew', l: 'Beamtinnen und Beamte', max: 6 },
        { k: 'einsatz.eintreffZeit', t: 'time', l: 'Eintreffzeit', w: 'half', q: 'jetzt' },
        { k: 'einsatz.weitere', t: 'text', l: 'Weitere Kräfte (optional)', pre: 'Zur Unterstützung waren vor Ort:', ph: 'Stf 21/05 (PK Weber, PKin Aydin), RTW der Feuerwehr' }
      ]
    },

    /* ---------- Phase 3: Vor Ort ---------- */
    {
      id: 'zutritt', phase: 'Vor Ort', title: 'Zutritt zur Wohnung', lead: 'Wie seid ihr hineingekommen – und auf welcher Grundlage?', gen: ['1.2'],
      fields: [
        { k: 'zutritt.art', t: 'choice', l: 'Zutritt', req: true, o: [['einw', 'Geöffnet und eingelassen'], ['verweigert', 'Geöffnet, Zutritt verweigert'], ['niemand', 'Niemand öffnete'], ['draussen', 'Außerhalb der Wohnung angetroffen']] },
        { k: 'zutritt.wer', t: 'choice', l: 'Wer öffnete?', o: [['gs', 'Geschädigte Person'], ['bs', 'Beschuldigte Person'], ['kind', 'Ein Kind'], ['andere', 'Andere Person']], when: d => ['einw', 'verweigert'].includes(get(d, 'zutritt.art')) },
        { t: 'info', when: zutrittGegen, text: 'Betreten gegen den Willen: § 41 Abs. 1 Satz 1 Nr. 4 PolG NRW – nur bei Tatsachen für eine gegenwärtige Gefahr für Leib, Leben oder Freiheit. Die Tatsachen jetzt antippen; im Haftungsfall muss die Polizei sie beweisen (OLG Köln 7 U 147/20).' },
        { k: 'zutritt.tatsachen', t: 'multi', l: 'Welche Tatsachen sprachen für eine gegenwärtige Gefahr?', req: true, o: [['schreie', 'Schreie'], ['hilfe', 'Hilferufe'], ['poltern', 'Poltern / Kampfgeräusche'], ['nachbarn', 'Angaben von Nachbarn'], ['notruf', 'Inhalt des Notrufs'], ['zweite', 'Zweite Person nicht zu sehen'], ['kind', 'Weinendes Kind']], when: zutrittGegen },
        { k: 'zutritt.zwang', t: 'choice', l: 'Wie wurde der Zutritt durchgesetzt?', o: d => (get(d, 'zutritt.art') === 'niemand' ? [['gewalt', 'Tür nach Androhung gewaltsam geöffnet'], ['sofort', 'Tür sofort gewaltsam geöffnet (Sofortvollzug)'], ['schluessel', 'Durch Dritte mit Schlüssel geöffnet']] : [['aufforderung', 'Nach Aufforderung geduldet'], ['angedroht', 'Nach Androhung von Zwang geduldet'], ['gewalt', 'Nach Androhung gewaltsam durchgesetzt']]), when: zutrittGegen },
        { k: 'zutritt.gesucht', t: 'yn', l: 'Wurde in der Wohnung gegen den Willen nach einer Person gesucht?', h: 'Raum für Raum nach der zweiten Person sehen ist rechtlich eine Durchsuchung (§§ 41, 42 PolG NRW).', when: zutrittGegen },
        { k: 'zutritt.durchs', t: 'multi', l: 'Dazu erledigt', o: [['gefahr', 'Gefahr im Verzug – Richter nicht abwartbar'], ['grund', 'Grund dem Inhaber genannt'], ['niederschrift', 'Niederschrift gefertigt']], when: d => zutrittGegen(d) && get(d, 'zutritt.gesucht') === 'ja' }
      ]
    },
    {
      id: 'eintreff', phase: 'Vor Ort', title: 'Lage beim Eintreffen', lead: 'Was habt ihr selbst gesehen und gehört? Eigene Wahrnehmungen tragen später am meisten.', gen: ['2.1'],
      fields: [
        { k: 'eintreff.zustGs', t: 'multi', l: d => `Zustand ${person('gs', get(d, 'gs')).gen}`, o: O(ZUST_GS) },
        { k: 'eintreff.zustBs', t: 'multi', l: d => `Verhalten ${person('bs', get(d, 'bs')).gen}`, o: O(ZUST_BS), when: bsDa },
        { k: 'abw.verbleib', t: 'text', l: 'Wo ist die beschuldigte Person?', pre: d => `Nach Angaben ${person('gs', get(d, 'gs')).gen}`, ph: 'habe er die Wohnung kurz vor Eintreffen der Polizei zu Fuß in unbekannte Richtung verlassen', sugg: [['kurz zuvor gegangen', 'habe er die Wohnung kurz vor Eintreffen der Polizei verlassen'], ['unbekannt', 'sei sein Aufenthaltsort unbekannt']], when: bsWeg },
        { k: 'eintreff.wohnung', t: 'choice', l: 'Zustand der Wohnung', o: [['unauffaellig', 'Unauffällig'], ['spuren', 'Spuren einer Auseinandersetzung']] },
        { k: 'eintreff.spuren', t: 'multi', l: 'Welche Spuren?', o: O(WOHNUNG), when: d => get(d, 'eintreff.wohnung') === 'spuren' },
        { k: 'eintreff.spurenText', t: 'text', l: 'Ergänzung (optional)', pre: 'Im Einzelnen:', ph: 'Im Wohnzimmer lag ein umgestoßener Stuhl; auf dem Küchenboden lagen Scherben eines Tellers', when: d => get(d, 'eintreff.wohnung') === 'spuren' },
        { k: 'eintreff.sofort', t: 'multi', l: 'Erste Maßnahmen', o: d => [...(bsDa(d) ? [['getrennt', 'Beteiligte getrennt']] : []), ['idf', 'Identitäten festgestellt'], ['abgleich', 'Datenabgleich'], ...(bsDa(d) ? [['eigen', 'Durchsuchung zur Eigensicherung']] : []), ['waffen', 'Waffen / gefährliche Gegenstände sichergestellt'], ['absuche', 'Nahbereich abgesucht']] },
        { k: 'spontan.gs', t: 'text', l: d => `Spontanäußerung ${person('gs', get(d, 'gs')).gen} (wörtlich, ungefragt)`, h: 'Ungefragte Äußerungen bleiben verwertbar, auch wenn später das Zeugnis verweigert wird (§ 252 StPO). Deshalb wörtlich und mit Uhrzeit.', pre: d => `${ErGs(d)} äußerte ungefragt:`, ph: '„Er hat mich wieder geschlagen.“' },
        { k: 'spontan.gsZeit', t: 'time', l: 'Uhrzeit der Äußerung', w: 'half', q: 'jetzt', when: d => has(get(d, 'spontan.gs')) },
        { k: 'spontan.bs', t: 'text', l: d => `Spontanäußerung ${person('bs', get(d, 'bs')).gen} (wörtlich, ungefragt)`, h: 'Nur zuhören – keine Nachfragen zur Tat vor der Belehrung.', pre: d => `${ErBs(d)} äußerte ungefragt:`, ph: '„Die hat mich provoziert.“', when: bsDa },
        { k: 'spontan.bsZeit', t: 'time', l: 'Uhrzeit der Äußerung', w: 'half', q: 'jetzt', when: d => bsDa(d) && has(get(d, 'spontan.bs')) }
      ]
    },
    {
      id: 'verletzung', phase: 'Vor Ort', title: 'Verletzungen und Versorgung', lead: 'Verletzungen festhalten, Rettungswagen anbieten, Lichtbilder fertigen.', gen: ['2.2'],
      fields: [
        { k: 'verl.gs', t: 'multi', l: d => `Sichtbare Verletzungen ${person('gs', get(d, 'gs')).gen}`, o: [...O(VERL), ['keine', 'Keine sichtbaren']] },
        { k: 'verl.gsWo', t: 'text', l: 'Wo?', pre: 'Die Verletzungen befinden sich', ph: 'am linken Auge und am rechten Unterarm', join: ' und ', sugg: [['Gesicht', 'im Gesicht'], ['Hals', 'am Hals'], ['Arme', 'an den Armen'], ['Oberkörper', 'am Oberkörper'], ['Kopf', 'am Kopf']], when: d => arr(get(d, 'verl.gs')).some(v => v !== 'keine') },
        { k: 'verl.gsSchmerz', t: 'text', l: 'Schmerzen ohne sichtbare Verletzung (optional)', pre: d => `${ErGs(d)} klagte über`, ph: 'Schmerzen im Bereich des Halses und Schluckbeschwerden' },
        { t: 'info', when: d => inc(d, 'verl.gs', 'wuergemale') || inc(d, 'gsa.handlung', 'wuergen'), text: 'Angriff gegen den Hals: auch ohne sichtbare Spuren ärztliche Abklärung dringend empfehlen (Schwellungen können verzögert auftreten). Würgen ist ein Warnsignal für schwere Eskalation und kann § 224 StGB erfüllen.' },
        { k: 'verl.rtw', t: 'choice', l: 'Rettungswagen / ärztliche Versorgung', req: true, h: 'Immer fragen und die Antwort festhalten – auch die Ablehnung.', o: [['vorort', 'RTW vor Ort, ambulant versorgt'], ['kh', 'Mit RTW ins Krankenhaus'], ['selbst', 'RTW angeboten, abgelehnt – kümmert sich selbst um einen Arzt'], ['abgelehnt', 'RTW angeboten, jede Behandlung abgelehnt'], ['unnoetig', 'Nicht erforderlich']] },
        { k: 'verl.kh', t: 'text', l: 'Welches Krankenhaus?', ph: 'z. B. Mathias-Spital Rheine', w: 'half', recent: true, when: d => get(d, 'verl.rtw') === 'kh' },
        { k: 'verl.fotoGs', t: 'choice', l: 'Lichtbilder der Verletzungen', req: true, h: d => (angehoerig(d) ? 'Angehörige vor der Aufnahme am Körper über ihr Weigerungsrecht belehren, dann Einwilligung einholen (§ 81c Abs. 3, § 163 Abs. 6 Satz 2 StPO).' : 'Mit Einwilligung der geschädigten Person.'), o: [['ja', 'Gefertigt, der Anzeige beigefügt'], ['abgelehnt', 'Abgelehnt'], ['spaeter', 'Wird nachgeholt'], ['keine', 'Keine Verletzung sichtbar']] },
        { k: 'verl.attest', t: 'yn', l: 'Auf ärztliche Dokumentation (Attest) hingewiesen?', w: 'half' },
        { k: 'verl.bs', t: 'multi', l: d => `Sichtbare Verletzungen ${person('bs', get(d, 'bs')).gen}`, h: 'Auch Entlastendes sichern: Verletzungen der beschuldigten Person gehören in den Bericht (§ 163a Abs. 2 StPO).', o: [...O(VERL), ['keine', 'Keine sichtbaren']], when: bsDa },
        { k: 'verl.bsWo', t: 'text', l: 'Wo?', pre: 'Die Verletzungen befinden sich', ph: 'an beiden Unterarmen', when: d => bsDa(d) && arr(get(d, 'verl.bs')).some(v => v !== 'keine') },
        { k: 'verl.fotoBs', t: 'choice', l: 'Lichtbilder der beschuldigten Person', o: [['ja', 'Gefertigt (§ 81b Abs. 1 StPO)'], ['nein', 'Nicht gefertigt']], when: d => bsDa(d) && arr(get(d, 'verl.bs')).some(v => v !== 'keine') }
      ]
    },

    /* ---------- Phase 4: Personen ---------- */
    {
      id: 'gs', phase: 'Personen', title: 'Geschädigte Person', lead: 'Personalien und Zustand. Die Anrede steuert die Satzführung im ganzen Text.', gen: ['2.1', '3.1'],
      fields: [
        { k: 'gs', t: 'person', l: 'Geschädigte/r', fields: PERS },
        { k: 'gs.zvr', t: 'choice', l: 'Zeugnisverweigerungsrecht gegenüber der beschuldigten Person?', h: 'Verlobte, Ehegatten (auch geschieden), Lebenspartner, Verwandte, Verschwägerte. Bei Lebensgefährten nach Verlöbnis oder Heiratsabsicht fragen; im Zweifel belehren.', o: [['ja', 'Ja (verheiratet, verlobt, verwandt …)'], ['nein', 'Nein'], ['unklar', 'Unklar – vorsorglich belehrt']] },
        { k: 'gs.alkohol', t: 'yn', l: 'Anzeichen für Alkohol-, Drogen- oder Medikamenteneinfluss?', w: 'half' },
        { k: 'gs.alkoholText', t: 'text', l: 'Welche Anzeichen?', pre: 'Festgestellt wurden', ph: 'deutlicher Alkoholgeruch und eine verwaschene Aussprache', join: ' und ', sugg: KONSUM, when: d => get(d, 'gs.alkohol') === 'ja' }
      ]
    },
    {
      id: 'bs', phase: 'Personen', title: 'Beschuldigte Person', lead: d => (bsDa(d) ? 'Personalien, Zustand und Auffälligkeiten.' : 'Nicht angetroffen – eintragen, was bekannt ist.'), gen: ['2.1', '3.2'],
      fields: [
        { k: 'bs', t: 'person', l: 'Beschuldigte/r', fields: PERS },
        { k: 'bs.alkohol', t: 'yn', l: 'Anzeichen für Alkohol-, Drogen- oder Medikamenteneinfluss?', w: 'half', when: bsDa },
        { k: 'bs.alkoholText', t: 'text', l: 'Welche Anzeichen?', pre: 'Festgestellt wurden', ph: 'deutlicher Alkoholgeruch und ein unsicherer Gang', join: ' und ', sugg: KONSUM, when: d => bsDa(d) && get(d, 'bs.alkohol') === 'ja' },
        { k: 'bs.aat', t: 'choice', l: 'Atemalkoholtest (nur freiwillig)', o: [['ja', 'Durchgeführt'], ['verweigert', 'Abgelehnt'], ['nein', 'Nicht durchgeführt']], when: d => bsDa(d) && get(d, 'bs.alkohol') === 'ja' },
        { k: 'bs.aatWert', t: 'number', l: 'Ergebnis', unit: 'mg/l', step: 0.05, min: 0, max: 3, w: 'half', when: d => bsDa(d) && get(d, 'bs.aat') === 'ja' },
        { k: 'bs.bes', t: 'multi', l: 'Besonderheiten', o: [['rausch', 'Nicht aufnahmefähig'], ['sprache', 'Keine Verständigung ohne Dolmetscher'], ['betreut', 'Unter Betreuung'], ['psych', 'Akute psychische Krise'], ['minder', 'Unter 18 Jahre'], ['waffen', 'Waffenbesitz / Zugang zu Waffen']] },
        { t: 'info', when: d => inc(d, 'bs.bes', 'rausch') || inc(d, 'bs.bes', 'sprache'), text: 'Belehrung, Anhörung und Verfügung, die nicht verstanden werden, sind angreifbar. Zustand als Tatsache festhalten, Verfügung zusätzlich schriftlich mitgeben und Belehrung, Anhörung und Überprüfung der Verfügung nachholen. Als Dolmetscher scheiden die geschädigte Person, ihre Angehörigen und Kinder aus.' },
        { t: 'info', when: d => inc(d, 'bs.bes', 'minder'), text: 'Minderjährige: Jugendamt sofort, Unterbringung sichern, bevor verwiesen wird; Erziehungsberechtigte bzw. eine andere geeignete volljährige Person unterrichten (§ 67a JGG).' }
      ]
    },
    {
      id: 'kinder', phase: 'Personen', title: 'Kinder im Haushalt', lead: 'Zustand und Betreuung festhalten. Keine Fragen zur Tat an Kinder – nur aufschreiben, was sie ungefragt sagen.', gen: ['2.3'], when: kinderDa,
      fields: [
        { t: 'info', text: 'Ist ein Elternteil beschuldigt, kann bei gemeinsamer Sorge kein Elternteil der Vernehmung des Kindes zustimmen (§ 52 Abs. 2 Satz 2 StPO). Die Vernehmung gehört in die Sachbearbeitung.' },
        { k: 'kinder', t: 'list', l: 'Kinder', item: (it, i) => (has(it.vorname) ? str(it.vorname) : `Kind ${i + 1}`) + (has(it.alter) ? `, ${it.alter} J.` : ''), add: 'Weiteres Kind', min1: true, max: 8, sub: [
          { k: 'vorname', t: 'text', l: 'Vorname', ph: 'Vorname', w: 'half' },
          { k: 'alter', t: 'number', l: 'Alter', unit: 'Jahre', min: 0, max: 17, w: 'half' },
          { k: 'da', t: 'yn', l: 'Während des Einsatzes anwesend?', w: 'half' },
          { k: 'zust', t: 'multi', l: 'Zustand', o: O(KIND_ZUST), when: (d, it) => it.da !== 'nein' },
          { k: 'spontan', t: 'text', l: 'Ungefragte Äußerung (wörtlich, optional)', pre: 'Das Kind äußerte ungefragt:', ph: '„Papa hat Mama gehauen.“', when: (d, it) => it.da !== 'nein' }
        ] },
        { k: 'kind.opfer', t: 'yn', l: 'Ist ein Kind selbst Opfer von Gewalt?', w: 'half' },
        { k: 'kind.betreuung', t: 'choice', l: 'Betreuung nach dem Einsatz', req: true, o: [['gs', 'Bleiben bei der geschädigten Person'], ['dritte', 'Bei Verwandten / Nachbarn'], ['jugendamt', 'Durch das Jugendamt untergebracht']] },
        { k: 'kind.jugendamt', t: 'choice', l: 'Jugendamt', req: true, o: [['sofort', 'Bereitschaftsdienst verständigt'], ['bericht', 'Mitteilung wird gefertigt'], ['nein', 'Keine Mitteilung']] },
        { k: 'kind.jugendamtZeit', t: 'time', l: 'Uhrzeit der Verständigung', w: 'half', q: 'jetzt', when: d => get(d, 'kind.jugendamt') === 'sofort' }
      ]
    },

    /* ---------- Phase 5: Schilderungen ---------- */
    {
      id: 'gsangaben', phase: 'Schilderungen', title: 'Angaben der geschädigten Person', lead: 'Erst belehren, dann fragen. Antippen genügt für den Kern; die Schilderung lässt sich auch nachtragen.', gen: ['3.1'],
      fields: [
        { k: 'bel.gs', t: 'choice', l: 'Belehrung als Zeugin / Zeuge', req: true, o: d => (angehoerig(d) ? [['52', 'Nach § 52 Abs. 3 StPO belehrt'], ['offen', 'Noch nicht']] : [['57', 'Zeugenbelehrung erteilt'], ['52', 'Vorsorglich auch nach § 52 Abs. 3 StPO'], ['offen', 'Noch nicht']]) },
        { k: 'bel.gsZeit', t: 'time', l: 'Uhrzeit der Belehrung', w: 'half', q: 'jetzt', when: d => ['52', '57'].includes(get(d, 'bel.gs')) },
        { k: 'gsa.modus', t: 'choice', l: 'Schilderung', req: true, o: MODUS },
        { k: 'gsa.handlung', t: 'multi', l: 'Was soll geschehen sein?', o: O(HANDLUNG), when: d => get(d, 'gsa.modus') !== 'keine' },
        { k: 'gsa.zeit', t: 'time', l: 'Tatzeit laut Angabe', w: 'half', when: d => get(d, 'gsa.modus') !== 'keine' },
        { k: 'gsa.raum', t: 'choice', l: 'Wo?', o: [['wohnzimmer', 'Wohnzimmer'], ['kueche', 'Küche'], ['schlafzimmer', 'Schlafzimmer'], ['flur', 'Flur'], ['bad', 'Bad'], ['kinderzimmer', 'Kinderzimmer'], ['draussen', 'Außerhalb']], when: d => get(d, 'gsa.modus') !== 'keine' },
        { k: 'gsa.anlass', t: 'text', l: 'Anlass des Streits', pre: 'Anlass sei', ph: 'seine Eifersucht gewesen', sugg: [['Trennung', 'ihre Ankündigung gewesen, sich zu trennen'], ['Eifersucht', 'seine Eifersucht gewesen'], ['Alkohol', 'sein Alkoholkonsum gewesen'], ['Geld', 'ein Streit um Geld gewesen'], ['Kinder', 'ein Streit um die Kinder gewesen']], when: d => get(d, 'gsa.modus') === 'jetzt' },
        { k: 'gsa.text', t: 'area', rows: 4, l: 'Schilderung in indirekter Rede', pre: d => `${ErGs(d)} gab an,`, lint: 'konj', ph: d => `${gBs(d) === 'w' ? 'ihre Partnerin' : 'ihr Ehemann'} habe ${ErGs(d).toLowerCase()} nach einem Streit ins Gesicht geschlagen und am Hals gepackt; ${ErGs(d).toLowerCase()} habe sich losreißen und den Notruf wählen können`, when: d => get(d, 'gsa.modus') === 'jetzt' },
        { k: 'gsa.frueher', t: 'choice', l: 'Frühere Übergriffe?', req: true, o: [['erstmals', 'Erstmals'], ['ja', 'Ja, bereits früher'], ['kA', 'Keine Angabe']], when: d => get(d, 'gsa.modus') !== 'keine' },
        { k: 'gsa.frueherText', t: 'text', l: 'Wann, wie oft?', h: 'Mit Datum oder Zeitraum – bei getrennten Paaren: vor oder nach der Trennung?', pre: d => `Zu früheren Vorfällen gab ${ErGs(d).toLowerCase()} an,`, ph: 'er habe sie zuletzt vor etwa drei Wochen geschlagen, insgesamt etwa einmal im Monat seit Anfang 2025', lint: 'konj', when: d => get(d, 'gsa.frueher') === 'ja' },
        { k: 'gsa.angst', t: 'choice', l: 'Angst vor weiteren Übergriffen?', o: [['ja', 'Ja, geäußert'], ['nein', 'Nein'], ['kA', 'Keine Angabe']] },
        { k: 'gsa.wille', t: 'choice', l: 'Haltung zur Wohnungsverweisung', o: [['will', 'Wünscht sie'], ['ablehnt', 'Lehnt sie ab, bleibt bei den Angaben'], ['widerruf', 'Nimmt Angaben zurück'], ['kA', 'Keine Äußerung']] },
        { t: 'info', when: d => get(d, 'gsa.wille') === 'widerruf', text: 'Ein inhaltlicher Widerruf ist konkret zu würdigen. Nimmt die Person ihre Tatsachenangaben zurück, kann die Grundlage der Prognose entfallen (VG Münster 1 K 2338/08). Der bloße Wunsch, er möge bleiben, hindert die Maßnahme nicht.' },
        { k: 'gsa.bleibt', t: 'choice', l: 'Bleibt die Person in der Wohnung?', o: [['ja', 'Ja'], ['auszug', 'Zieht in Kürze aus'], ['weg', 'Hat die Wohnung dauerhaft verlassen']] },
        { k: 'gsa.antrag', t: 'choice', l: 'Strafantrag', o: [['ja', 'Gestellt'], ['nein', 'Nicht gestellt'], ['spaeter', 'Behält sich vor']] }
      ]
    },
    {
      id: 'bsangaben', phase: 'Schilderungen', title: 'Belehrung, Einlassung und Anhörung', lead: 'Zwei getrennte Schritte: die Beschuldigtenbelehrung und die Anhörung zur Wohnungsverweisung.', gen: ['3.2'], when: bsDa,
      fields: [
        { k: 'bel.bs', t: 'choice', l: 'Beschuldigtenbelehrung (§§ 163a Abs. 4, 136 StPO)', req: true, h: 'Vor der ersten Frage zum Geschehen: Tatvorwurf eröffnen, Schweigerecht, Verteidiger, Beweisanträge.', o: [['ja', 'Belehrt'], ['unm', 'Nicht möglich (Zustand / Sprache)'], ['offen', 'Noch nicht']] },
        { k: 'bel.bsZeit', t: 'time', l: 'Uhrzeit der Belehrung', w: 'half', q: 'jetzt', when: d => get(d, 'bel.bs') === 'ja' },
        { k: 'bel.bsReaktion', t: 'choice', l: 'Reaktion', o: [['aeussert', 'Äußert sich'], ['schweigt', 'Schweigt'], ['anwalt', 'Verlangt Verteidiger']], when: d => get(d, 'bel.bs') === 'ja' },
        { t: 'info', when: d => ['schweigt', 'anwalt'].includes(get(d, 'bel.bsReaktion')), text: 'Ab jetzt keine Fragen zur Sache mehr (BGH 3 StR 435/12). Die Anhörung zur Wohnungsverweisung trotzdem durchführen – mit festem Wortlaut: „Ich entscheide jetzt, ob Sie die Wohnung für 14 Tage verlassen müssen. Die Polizei stützt sich auf Folgendes: … Sie können dazu etwas sagen, müssen es aber nicht. Was Sie sagen, kann auch im Strafverfahren verwendet werden.“ Nicht nachfragen.' },
        { k: 'bsa.modus', t: 'choice', l: 'Einlassung zur Sache', o: MODUS, when: bsRedet },
        { k: 'bsa.kern', t: 'choice', l: 'Kern der Einlassung', o: [['bestreitet', 'Bestreitet'], ['teil', 'Räumt teilweise ein'], ['raeumt', 'Räumt ein'], ['gegen', 'Erhebt Gegenvorwürfe']], when: d => bsRedet(d) && get(d, 'bsa.modus') !== 'keine' },
        { k: 'bsa.text', t: 'area', rows: 3, l: 'Einlassung in indirekter Rede', pre: d => `${ErBs(d)} gab an,`, lint: 'konj', ph: 'es habe lediglich einen lauten Streit gegeben; geschlagen habe er sie nicht', when: d => bsRedet(d) && get(d, 'bsa.modus') === 'jetzt' },
        { k: 'anh.vorhalt', t: 'choice', l: 'Anhörung zur Wohnungsverweisung (§ 28 VwVfG NRW)', req: true, h: 'Die Vorwürfe konkret mitteilen – auch die zu früheren Übergriffen – und Gelegenheit zur Äußerung geben. Vor der Entscheidung.', o: [['alle', 'Vorwürfe mitgeteilt, auch frühere'], ['heute', 'Nur heutiger Vorfall mitgeteilt'], ['unm', 'Nicht möglich'], ['offen', 'Noch nicht']] },
        { k: 'anh.zeit', t: 'time', l: 'Uhrzeit der Anhörung', w: 'half', q: 'jetzt', when: d => ['alle', 'heute'].includes(get(d, 'anh.vorhalt')) },
        { k: 'anh.reaktion', t: 'choice', l: 'Äußerung dazu', o: [['text', 'Hat sich geäußert'], ['keine', 'Hat sich nicht geäußert']], when: d => ['alle', 'heute'].includes(get(d, 'anh.vorhalt')) },
        { k: 'anh.text', t: 'text', l: 'Was hat er dazu gesagt?', pre: d => `Hierzu äußerte ${ErBs(d).toLowerCase()},`, lint: 'konj', ph: 'die Vorwürfe seien frei erfunden; er wolle die Wohnung nicht verlassen', when: d => get(d, 'anh.reaktion') === 'text' },
        { k: 'anh.fragen', t: 'multi', l: 'Auch gefragt nach …', h: 'Diese Umstände tragen das Ermessen zu Bereich und Dauer.', o: [['unterkunft', 'Unterkunft'], ['arbeit', 'Arbeit / Versorgung in der Wohnung'], ['einwand', 'Einwänden gegen Dauer oder Bereich']], when: d => ['alle', 'heute'].includes(get(d, 'anh.vorhalt')) },
        { k: 'anh.unterkunft', t: 'text', l: 'Unterkunft', pre: d => `${ErBs(d)} gab an, unterzukommen`, ph: 'bei seinem Bruder in Emsdetten', sugg: [['Familie', 'bei Familienangehörigen'], ['Freunde', 'bei Bekannten'], ['Hotel', 'in einem Hotel'], ['keine', 'derzeit nirgends']], when: d => inc(d, 'anh.fragen', 'unterkunft') }
      ]
    },
    {
      id: 'zeugen', phase: 'Schilderungen', title: 'Zeugen', lead: 'Unbeteiligte Zeugen sind die stärkste Stütze – sie haben kein Zeugnisverweigerungsrecht.', gen: ['3.3'],
      fields: [
        { k: 'zg.vorhanden', t: 'yn', l: 'Gibt es Zeugen?', req: true },
        { k: 'zeugen', t: 'list', l: 'Zeugen', item: (it, i) => `Z ${String(i + 1).padStart(2, '0')}` + (it.p && has(it.p.nachname) ? ' · ' + str(it.p.nachname) : ''), add: 'Weitere Zeugin / weiterer Zeuge', min1: true, max: 6, when: d => get(d, 'zg.vorhanden') === 'ja', sub: [
          { k: 'p', t: 'person', l: 'Person', fields: ['geschlecht', 'nachname', 'vorname', 'anschrift', 'tel'] },
          { k: 'art', t: 'choice', l: 'Wer ist das?', o: [['nachbar', 'Nachbar/in'], ['angehoerig', 'Angehörige/r'], ['besuch', 'Besuch'], ['sonst', 'Sonstige']] },
          { k: 'wahr', t: 'choice', l: 'Wahrnehmung', o: [['gesehen', 'Gesehen'], ['gehoert', 'Nur gehört'], ['danach', 'Erst danach hinzugekommen']] },
          { k: 'modus', t: 'choice', l: 'Schilderung', o: MODUS },
          { k: 'text', t: 'area', rows: 2, l: 'Angaben in indirekter Rede', pre: (d, it) => `${it.p && it.p.geschlecht === 'm' ? 'Er' : 'Sie'} gab an,`, lint: 'konj', ph: 'sie habe aus der Nachbarwohnung laute Schreie und ein Poltern gehört', when: (d, it) => it.modus === 'jetzt' }
        ] }
      ]
    },

    /* ---------- Phase 6: Prognose ---------- */
    {
      id: 'prognose', phase: 'Prognose', title: 'Gefahrenprognose', lead: 'Trägt nur bei einer Gewaltbeziehung mit konkreten Anzeichen wiederholter Misshandlungen oder einer intensiven Ersttat (OVG NRW 5 A 3548/20).', gen: ['4.1'],
      fields: [
        { k: 'prog.vorg', t: 'multi', l: 'Polizeiliche Erkenntnisse (Datenabgleich)', o: [...O(VORG), ['keine', 'Keine Erkenntnisse']] },
        { k: 'prog.muster', t: 'choice', l: 'Einordnung', req: true, o: [['beziehung', 'Gewaltbeziehung – wiederholte Übergriffe'], ['ersttat', 'Ersttat von hoher Intensität'], ['weder', 'Weder noch']] },
        { t: 'info', when: d => get(d, 'prog.muster') === 'weder', text: 'Ohne Gewaltbeziehung und ohne intensive Ersttat trägt die Wohnungsverweisung nach dem OVG NRW nicht. Alkohol, Beschimpfungen und Drohungen stützen nur, tragen aber nicht allein.' },
        { k: 'prog.stuetzen', t: 'multi', l: 'Was stützt die Angaben objektiv?', req: true, o: [...O(STUETZEN), ['keine', 'Keine objektive Stütze']] },
        { t: 'info', when: d => inc(d, 'prog.stuetzen', 'keine'), text: 'Angaben einer Seite ohne objektive Stütze und ohne Vorhalt haben 2023 vor dem OVG NRW nicht getragen. Dann unten begründen, warum den Angaben dennoch gefolgt wird.' },
        { k: 'prog.wuerdigung', t: 'text', l: 'Warum wird diesen Angaben gefolgt?', pre: d => `Den Angaben ${person('gs', get(d, 'gs')).gen} wird gefolgt, weil`, ph: 'sie detailliert und widerspruchsfrei geschildert wurden und zum Verletzungsbild passen', join: ' und ', sugg: d => [['detailliert', 'sie detailliert und widerspruchsfrei geschildert wurden'], ['Verletzungsbild', 'sie zum festgestellten Verletzungsbild passen'], ['Zeugen', 'sie von unbeteiligten Zeugen bestätigt werden'], ['pauschal bestritten', `${bsNom(d)} die Vorwürfe nur pauschal bestritten hat`], ['Zustand', 'der Zustand beim Eintreffen der Schilderung entsprach']] },
        { k: 'prog.warn', t: 'multi', l: 'Warnsignale für schwere Eskalation', h: 'Indikatoren aus der LKA-Evaluation (Greuel 2010) – Erfassungshilfe, kein Prognoseinstrument.', o: O(WARN) },
        { k: 'prog.wechsel', t: 'yn', l: 'Wechselseitige Gewalt (beide beschuldigen sich)?', w: 'half' },
        { t: 'info', when: d => get(d, 'prog.wechsel') === 'ja', text: 'Dann beide als Beschuldigte belehren, beide Verletzungsbilder sichern und die Auswahl mit Tatsachen begründen (Angriffs- oder Abwehrverletzung, Vorgeschichte, Zeugen). Körperkraft allein trägt die Auswahl nicht. Nicht aufklärbar → keine Verfügung nach § 34a.' },
        { k: 'prog.gefahr', t: 'yn', l: 'Ergebnis: Gegenwärtige Gefahr für Leib, Leben oder Freiheit?', req: true, h: 'Die Einwirkung hat begonnen oder steht in allernächster Zeit mit an Sicherheit grenzender Wahrscheinlichkeit bevor.' },
        { k: 'prog.warum', t: 'text', l: 'Warum drohen weitere Übergriffe in allernächster Zeit?', req: true, h: '„Weitere Streitigkeiten nicht ausgeschlossen“ genügt nicht.', pre: 'Mit weiteren Übergriffen ist in allernächster Zeit zu rechnen, weil', ph: 'es bereits wiederholt zu Übergriffen gekommen ist und beide weiter in derselben Wohnung leben würden', join: ' und ', sugg: d => [['wiederholt', 'es bereits wiederholt zu Übergriffen gekommen ist'], ['Zunahme', 'die Übergriffe an Häufigkeit und Schwere zugenommen haben'], ['Intensität', 'der heutige Angriff von erheblicher Intensität war'], ['aggressiv vor Ort', `${bsNom(d)} auch in Gegenwart der Polizei aggressiv auftrat`], ['Drohungen', `${erBs(d)} weitere Gewalt angekündigt hat`], ['gemeinsame Wohnung', 'beide ohne die Maßnahme weiter in derselben Wohnung zusammenträfen'], ['Alkohol', `${erBs(d)} erheblich alkoholisiert und nicht einsichtig war`]], when: d => get(d, 'prog.gefahr') === 'ja' },
        { k: 'prog.warumNicht', t: 'text', l: 'Warum nicht?', pre: 'Eine gegenwärtige Gefahr war nicht festzustellen, weil', ph: 'es bei einem verbalen Streit geblieben ist und keine Anhaltspunkte für frühere Übergriffe vorliegen', sugg: [['nur verbal', 'es bei einem verbalen Streit geblieben ist'], ['keine Vorgeschichte', 'keine Anhaltspunkte für frühere Übergriffe vorliegen'], ['nicht aufklärbar', 'sich nicht aufklären ließ, von wem die Gewalt ausging'], ['ausgezogen', 'die geschädigte Person die Wohnung dauerhaft verlassen hat']], join: ' und ', when: d => get(d, 'prog.gefahr') === 'nein' }
      ]
    },

    /* ---------- Phase 7: Maßnahmen ---------- */
    {
      id: 'wv', phase: 'Maßnahmen', title: 'Wohnungsverweisung und Rückkehrverbot', lead: '§ 34a PolG NRW: Bereich genau bezeichnen, Enddatum nennen, Ermessen festhalten. Die Begründung muss am Einsatztag stehen.', gen: ['5.1'],
      fields: [
        { k: 'wv.angeordnet', t: 'yn', l: d => (bsDa(d) ? 'Wird die Wohnungsverweisung mit Rückkehrverbot angeordnet?' : 'Wird ein Rückkehrverbot angeordnet?'), req: true, o: [['ja', 'Ja'], ['nein', 'Nein, abgesehen']] },
        { t: 'info', when: d => wvJa(d) && (get(d, 'prog.gefahr') === 'nein' || nurVerbal(d)), text: 'Achtung: Die Gefahrenprognose ist verneint oder es steht nur verbaler Streit im Raum. So wird die Verfügung vor Gericht voraussichtlich nicht halten.' },
        { t: 'info', when: d => wvJa(d) && get(d, 'lage.wohnt') === 'nein', text: 'Die Person lebt nach deiner Angabe nicht in der Wohnung. § 34a ist dann unsicher – sicherer sind Platzverweis und Betretungsverbot nach § 34 PolG NRW.' },
        { t: 'info', when: d => wvJa(d) && bsDa(d) && !['alle', 'heute', 'unm'].includes(get(d, 'anh.vorhalt')), text: 'Die Anhörung fehlt noch. Erst die Vorwürfe mitteilen und Gelegenheit zur Äußerung geben, dann anordnen – sonst fehlt der Prognose seine Version (OVG NRW 5 A 3548/20).' },
        { t: 'info', when: d => wvJa(d) && get(d, 'gsa.bleibt') === 'weg', text: 'Die geschädigte Person hat die Wohnung dauerhaft verlassen. Dann fehlt die Erforderlichkeit; § 34a schützt die Person in der Wohnung, in der sie wohnt.' },
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
        { k: 'wv.mittel', t: 'text', l: 'Warum reichte kein milderes Mittel?', req: true, pre: 'Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil', ph: d => `${erBs(d)} ein freiwilliges Verlassen der Wohnung ablehnte`, join: ' und ', sugg: d => [['lehnt ab', `${erBs(d)} ein freiwilliges Verlassen der Wohnung ablehnte`], ['nicht glaubhaft', `${seinBs(d)}e Zusage, freiwillig zu gehen, angesichts ${seinBs(d)}es Verhaltens nicht glaubhaft war`], ['Gefährderansprache', 'eine bloße Gefährderansprache die Gefahr in der gemeinsamen Wohnung nicht beseitigt hätte'], ['GS bleibt', 'der geschädigten Person und den Kindern ein Verlassen der Wohnung nicht zuzumuten ist']], when: wvJa },
        { k: 'wv.grund', t: 'choice', l: 'Warum wird abgesehen?', req: true, o: [['gefahr', 'Keine gegenwärtige Gefahr'], ['verbal', 'Nur verbaler Streit'], ['wohnt', 'Person lebt nicht in der Wohnung'], ['weg', 'Geschädigte Person hat die Wohnung verlassen'], ['unklar', 'Nicht aufklärbar, von wem die Gefahr ausgeht'], ['freiwillig', 'Glaubhaft freiwilliger Auszug']], when: wvNein },
        { k: 'wv.alt', t: 'multi', l: 'Stattdessen getroffen', o: [['platz', 'Platzverweis (§ 34 Abs. 1)'], ['betret', 'Betretungsverbot angeregt (§ 34 Abs. 2)'], ['anspr', 'Gefährderansprache'], ['trennung', 'Freiwillige räumliche Trennung'], ['gewahrsam', 'Gewahrsam (§ 35 Abs. 1 Nr. 2)']], when: wvNein },
        { k: 'wv.altText', t: 'text', l: 'Ergänzung (optional)', pre: 'Im Einzelnen:', ph: 'Er begab sich für die Nacht freiwillig zu seinem Bruder', when: wvNein }
      ]
    },
    {
      id: 'vollzug', phase: 'Maßnahmen', title: 'Vollzug am Einsatzort', lead: 'Die gesetzlichen Einzelpflichten des § 34a – jede ausgelassene ist ein eigener Angriffspunkt. Abhaken, was erledigt ist.', gen: ['5.1'], when: d => wvJa(d) && bsDa(d),
      fields: [
        { k: 'wv.pflichten', t: 'multi', l: 'Erledigt', req: true, o: [['bekannt', 'Mündlich bekanntgegeben – mit Bereich und Enddatum'], ['dauer', 'Über Verlängerung bei Gerichtsantrag unterrichtet'], ['gegenst', 'Mitnahme persönlicher Gegenstände ermöglicht'], ['anschrift', 'Zur Angabe einer Anschrift aufgefordert'], ['rechtsschutz', 'Auf Rechtsschutz beim Verwaltungsgericht hingewiesen'], ['folgen', 'Auf Zwangsgeld und Gewahrsam bei Verstoß hingewiesen']] },
        { k: 'wv.gegenst', t: 'text', l: 'Mitgenommen', pre: d => `${ErBs(d)} nahm mit:`, ph: 'Kleidung, Hygieneartikel, Medikamente und Arbeitsunterlagen', join: ', ', sugg: [['Kleidung', 'Kleidung'], ['Hygiene', 'Hygieneartikel'], ['Medikamente', 'Medikamente'], ['Ausweis', 'Ausweispapiere'], ['Arbeit', 'Arbeitsunterlagen'], ['Ladegerät', 'Mobiltelefon mit Ladegerät']], when: d => inc(d, 'wv.pflichten', 'gegenst') },
        { k: 'wv.anschrift', t: 'text', l: 'Anschrift für Zustellungen', pre: d => `${ErBs(d)} benannte`, ph: 'als Anschrift für Zustellungen Musterweg 3, 48282 Emsdetten (bei seinem Bruder)', sugg: [['keine', 'trotz Aufforderung keine Anschrift und keine zustellungsbevollmächtigte Person']], when: d => inc(d, 'wv.pflichten', 'anschrift') },
        { k: 'wv.schluessel', t: 'choice', l: 'Haus- und Wohnungsschlüssel', req: true, h: 'Sicherstellung nach § 43 Nr. 1 PolG NRW mit Bescheinigung (§ 44 Abs. 2). Rückgabe mit Ende des Verbots.', o: [['sicher', 'Sichergestellt, Bescheinigung ausgehändigt'], ['keine', 'Besitzt keine Schlüssel'], ['schloss', 'Nicht auffindbar – Schlosstausch empfohlen']] },
        { k: 'wv.schluesselAnz', t: 'number', l: 'Anzahl Schlüssel', min: 1, max: 20, w: 'half', q: [1, 2, 3], when: d => get(d, 'wv.schluessel') === 'sicher' },
        { k: 'wv.zg', t: 'yn', l: 'Zwangsgeld angedroht?', req: true, h: 'Bestimmte Höhe, für jeden Fall der Zuwiderhandlung, mit Hinweis auf Ersatzzwangshaft (§§ 53, 54, 56 PolG NRW). Die Androhung muss zugestellt werden.', w: 'half' },
        { k: 'wv.zgHoehe', t: 'euro', l: 'Höhe', w: 'half', q: [250, 500, 1000], min: 5, max: 2500, when: d => get(d, 'wv.zg') === 'ja' },
        { k: 'wv.schrift', t: 'choice', l: 'Schriftliche Bestätigung der Verfügung', req: true, o: [['vorort', 'Vor Ort ausgehändigt (Empfangsbekenntnis)'], ['verweigert', 'Annahme verweigert'], ['wache', 'Liegt auf der Wache zur Abholung'], ['post', 'Wird förmlich zugestellt'], ['offen', 'Noch offen']] },
        { k: 'wv.wache', t: 'text', l: 'Welche Wache?', ph: 'z. B. Polizeiwache Rheine', w: 'half', recent: true, when: d => get(d, 'wv.schrift') === 'wache' },
        { t: 'info', when: d => nacht(d) && ['vorort', 'verweigert'].includes(get(d, 'wv.schrift')), text: 'Zwischen 21 und 6 Uhr sowie an Sonn- und Feiertagen braucht die Zustellung die Erlaubnis der Behördenleitung. Fehlt sie, ist die Zustellung nur wirksam, wenn die Annahme nicht verweigert wird (§ 5 Abs. 3 LZG NRW).' },
        { k: 'wv.erlaubnis', t: 'choice', l: 'Erlaubnis der Behördenleitung für die Zustellung', o: [['ja', 'Liegt vor'], ['nein', 'Liegt nicht vor'], ['unklar', 'Unklar']], when: d => nacht(d) && ['vorort', 'verweigert'].includes(get(d, 'wv.schrift')) },
        { k: 'wv.verlassen', t: 'choice', l: 'Wie hat die Person die Wohnung verlassen?', req: true, o: [['freiwillig', 'Freiwillig'], ['zwang', 'Erst nach unmittelbarem Zwang'], ['gewahrsam', 'In Gewahrsam genommen'], ['festnahme', 'Vorläufig festgenommen']] },
        { k: 'wv.verlassenZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt' }
      ]
    },
    {
      id: 'abwesend', phase: 'Maßnahmen', title: 'Bekanntgabe an die abwesende Person', lead: 'Das Verbot wirkt erst mit der Bekanntgabe. Ist die Person erreichbar: erst belehren und anhören, dann entscheiden.', gen: ['5.1'], when: d => wvJa(d) && bsWeg(d),
      fields: [
        { k: 'abw.erreichbar', t: 'choice', l: 'Ist die Person erreichbar?', req: true, o: [['telefon', 'Telefonisch'], ['ort', 'Aufenthaltsort bekannt'], ['nein', 'Nicht erreichbar']] },
        { k: 'abw.anh', t: 'choice', l: 'Belehrt und angehört – vor der Entscheidung?', req: true, h: 'Vor jedem Wort zur Sache als Beschuldigten belehren (§ 136 StPO), dann die Vorwürfe mitteilen.', o: [['ja', 'Ja'], ['nein', 'Noch nicht']], when: d => ['telefon', 'ort'].includes(get(d, 'abw.erreichbar')) },
        { k: 'abw.anhZeit', t: 'time', l: 'Uhrzeit', w: 'half', q: 'jetzt', when: d => get(d, 'abw.anh') === 'ja' },
        { k: 'abw.anhText', t: 'text', l: 'Äußerung', pre: d => `${ErBs(d)} äußerte,`, lint: 'konj', ph: 'es habe keinen Übergriff gegeben; er komme heute nicht mehr nach Hause', sugg: [['keine Äußerung', 'sich zur Sache nicht äußern zu wollen']], when: d => get(d, 'abw.anh') === 'ja' },
        { k: 'abw.bekannt', t: 'choice', l: 'Ist das Rückkehrverbot bekanntgegeben?', req: true, o: [['pers', 'Ja, persönlich'], ['tel', 'Ja, telefonisch'], ['nein', 'Noch nicht']] },
        { k: 'abw.bekanntZeit', t: 'time', l: 'Uhrzeit der Bekanntgabe', w: 'half', q: 'jetzt', when: d => ['pers', 'tel'].includes(get(d, 'abw.bekannt')) },
        { t: 'info', when: d => get(d, 'abw.bekannt') === 'tel', text: 'Telefonische Bekanntgabe ist zulässig, aber schwer zu beweisen: Rufnummer, Identitätsprüfung, Bereich und Enddatum festhalten. Die Zwangsgeldandrohung ist damit nicht zugestellt.' },
        { t: 'info', when: d => get(d, 'abw.bekannt') === 'nein', text: 'Bis zur Bekanntgabe wirkt das Verbot nicht: kein Zwangsgeld, kein Gewahrsam nach § 35 Abs. 1 Nr. 4. Kehrt die Person zurück, ist es vor Ort zu eröffnen.' },
        { k: 'abw.mitteilung', t: 'yn', l: 'Mitteilung an der Wohnungstür hinterlassen?', h: 'Neutral halten, ohne Angaben zum Sachverhalt – nur die Bitte, sich bei der Wache zu melden. Die Mitteilung ersetzt die Bekanntgabe nicht.', when: d => get(d, 'abw.bekannt') !== 'pers' },
        { k: 'abw.wache', t: 'text', l: 'Bei welcher Wache soll sich die Person melden?', ph: 'z. B. Polizeiwache Rheine', w: 'half', recent: true, when: d => get(d, 'abw.mitteilung') === 'ja' || get(d, 'abw.schrift') === 'wache' },
        { k: 'abw.schrift', t: 'choice', l: 'Schriftliche Verfügung mit Zwangsgeldandrohung', req: true, o: [['pers', 'Persönlich ausgehändigt'], ['wache', 'Liegt auf der Wache zur Abholung'], ['post', 'Wird förmlich zugestellt'], ['offen', 'Noch offen']] },
        { k: 'wv.zgHoehe', t: 'euro', l: 'Angedrohtes Zwangsgeld', w: 'half', q: [250, 500, 1000], min: 5, max: 2500 },
        { k: 'abw.schluessel', t: 'choice', l: 'Schlüssel', o: [['spaeter', 'Werden beim Antreffen sichergestellt'], ['schloss', 'Schlosstausch empfohlen'], ['sicher', 'Bereits sichergestellt']] },
        { k: 'abw.weiter', t: 'multi', l: 'Veranlasst', o: [['folge', 'Folgeschicht beauftragt'], ['streife', 'Wohnung wird bestreift'], ['notruf', 'Geschädigte Person weiß: bei Rückkehr 110'], ['fahndung', 'Nahbereichsfahndung']] }
      ]
    },
    {
      id: 'zwang', phase: 'Maßnahmen', title: 'Zwang und Gewahrsam', lead: 'Zwang nur nach Androhung. Gewahrsam nur, wenn unerlässlich – und unverzüglich zum Richter.', gen: ['5.1'], when: zwang,
      fields: [
        { k: 'zw.androhung', t: 'yn', l: 'Unmittelbarer Zwang vorher angedroht (§ 61 PolG NRW)?', req: true },
        { k: 'zw.art', t: 'multi', l: 'Angewendet', o: [['einfach', 'Einfache körperliche Gewalt'], ['fessel', 'Fesselung']] },
        { k: 'zw.fesselGrund', t: 'text', l: 'Anlass der Fesselung', pre: 'Die Fesselung war erforderlich, weil', ph: 'er nach den Beamten schlug und sich loszureißen versuchte', when: d => inc(d, 'zw.art', 'fessel') },
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
      id: 'straf', phase: 'Maßnahmen', title: 'Strafverfahren und Beweise', lead: 'Anzeige von Amts wegen – auch gegen den Wunsch der geschädigten Person.', gen: ['5.2'],
      fields: [
        { k: 'straf.delikte', t: 'multi', l: 'Strafanzeige wegen', req: true, o: Object.entries(DELIKT_KURZ) },
        { k: 'straf.beweise', t: 'multi', l: 'Beweise gesichert', o: [['notruf', 'Notrufsicherung veranlasst'], ['wohnung', 'Lichtbilder der Wohnung'], ['tatmittel', 'Tatmittel sichergestellt'], ['handy', 'Mobiltelefon sichergestellt'], ['bodycam', 'Bodycam-Aufnahme'], ['kleidung', 'Kleidung gesichert']] },
        { k: 'straf.tatmittel', t: 'text', l: 'Welches Tatmittel?', pre: 'Als Tatmittel wurde sichergestellt:', ph: 'ein Küchenmesser mit ca. 15 cm Klingenlänge', when: d => inc(d, 'straf.beweise', 'tatmittel') },
        { t: 'info', when: d => inc(d, 'straf.beweise', 'bodycam'), text: 'Bodycam in Wohnungen nur bei dringender Gefahr für Leib oder Leben (§ 15c Abs. 2 PolG NRW). Vor jeder Verwendung die richterliche Feststellung der Rechtmäßigkeit beantragen; Einsatz dokumentieren.' },
        { k: 'straf.blut', t: 'choice', l: 'Blutprobe bei der beschuldigten Person', h: 'Richtervorbehalt (§ 81a Abs. 2 StPO) – die Ausnahme gilt nur für Verkehrsdelikte.', o: [['nein', 'Keine'], ['richter', 'Richterlich angeordnet'], ['eil', 'Eilanordnung – Richter nicht erreichbar']], when: d => bsDa(d) && get(d, 'bs.alkohol') === 'ja' },
        { k: 'straf.blutZeit', t: 'time', l: 'Uhrzeit des Versuchs / der Anordnung', w: 'half', q: 'jetzt', when: d => bsDa(d) && ['richter', 'eil'].includes(get(d, 'straf.blut')) },
        { k: 'straf.az', t: 'text', l: 'Vorgangsnummer (optional)', ph: 'z. B. 261109-2145-012345', w: 'half' }
      ]
    },

    /* ---------- Phase 8: Abschluss ---------- */
    {
      id: 'opfer', phase: 'Abschluss', title: 'Opferschutz', lead: 'Hinweise und Unterlagen – nicht in Gegenwart der beschuldigten Person. Abhaken, was erledigt ist.', gen: ['5.3'],
      fields: [
        { k: 'os.hinweise', t: 'multi', l: 'Erledigt', req: true, o: d => [['gewschg', wvJa(d) ? 'Zivilgerichtlicher Schutz erklärt (Antrag verlängert das Verbot)' : 'Zivilgerichtlicher Schutz (GewSchG) erklärt'], ['beratung', 'Beratungsstelle benannt'], ['daten', 'Weitergabe der Kontaktdaten angeboten'], ['doku', 'Kopie der Einsatzdokumentation ausgehändigt'], ['merkblatt', 'Merkblatt / Opferschutzbroschüre übergeben'], ['stpo', 'Rechte nach §§ 406i, 406j StPO erklärt'], ['amtswegen', 'Strafverfolgung von Amts wegen erklärt'], ['notruf', 'Bei Rückkehr sofort 110']] },
        { k: 'os.einwilligung', t: 'yn', l: 'Einwilligung in die Weitergabe von Name, Anschrift, Telefonnummer?', h: 'Nur mit Einwilligung (§ 34a Abs. 4 PolG NRW).', when: d => inc(d, 'os.hinweise', 'daten') },
        { k: 'os.stelle', t: 'text', l: 'Beratungsstelle', ph: 'z. B. Frauenberatungsstelle Rheine', recent: true, when: d => inc(d, 'os.hinweise', 'beratung') || inc(d, 'os.hinweise', 'daten') },
        { k: 'os.verbleib', t: 'choice', l: 'Wo bleibt die geschädigte Person?', o: [['wohnung', 'In der Wohnung'], ['frauenhaus', 'Schutzeinrichtung'], ['dritte', 'Bei Verwandten / Bekannten']] },
        { t: 'info', when: d => ['frauenhaus', 'dritte'].includes(get(d, 'os.verbleib')), text: 'Eine Schutzanschrift gehört nicht in die Ermittlungsakte und nicht in diesen Text – über die Akteneinsicht gelangt sie sonst zur beschuldigten Person.' }
      ]
    },
    {
      id: 'abschluss', phase: 'Abschluss', title: 'Verlassen des Einsatzortes', lead: 'Letzter Blick: Gefahr abgewehrt, alles bekanntgegeben, alles vermerkt.', gen: ['6.1', '6.2'],
      fields: [
        { k: 'ab.erledigt', t: 'multi', l: 'Erledigt', o: d => [['gb', 'Gefährdungsbewertung gefertigt'], ...(wvJa(d) ? [['kontrolle', 'Kontrolle des Rückkehrverbots vorgemerkt'], ['folge', 'Folgeschichten informiert']] : []), ['abgleich', 'Anzeige, Verfügung und Einsatzdokumentation abgeglichen'], ['sb', 'Übergabe an die Sachbearbeitung']] },
        { k: 'einsatz.endeZeit', t: 'time', l: 'Einsatzende', w: 'half', q: 'jetzt' },
        { k: 'meta.klarnamen', t: 'yn', l: 'Klarnamen im Text verwenden?', h: 'Ohne Klarnamen stehen im Text nur die Rollen; die Personalien stehen gesondert.', o: [['nein', 'Nein, nur Rollen'], ['ja', 'Ja']] }
      ]
    }
  ];

  root.WHG_STEPS = STEPS;
  root.WHG_CORE = { get, str, has, arr, inc, cap, endDot, slot, sent, joinList, fmtDate, fmtTime, PH, um, addDays, hasObj, pick, person,
    bsDa, bsWeg, kinderDa, verletztGs, verletztBs, wohntDort, nurVerbal, zutrittGegen, angehoerig, wvJa, wvNein, gewahrsam, zwang, bsRedet, wvTag, wvEnde, wvMax, nacht,
    BEZIEHUNG, GEWALT, TATSACHEN, ZUST_GS, ZUST_BS, WOHNUNG, VERL, HANDLUNG, RAUM, KIND_ZUST, VORG, STUETZEN, WARN, ORTE, DELIKT };
})(typeof window !== 'undefined' ? window : globalThis);

/* ======================= Textgenerator ======================= */
(function (root) {
  'use strict';
  const C = root.WHG_CORE;
  const { get, str, has, arr, inc, cap, endDot, slot, joinList, fmtDate, fmtTime, PH, um, hasObj, pick, person } = C;
  const P = (...xs) => xs.filter(has).join(' ');
  const B = (...xs) => xs.filter(has).join('\n\n');
  const N2 = n => String(n).padStart(2, '0');
  const ZAHL = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht'];
  const euro = v => { const n = Number(v); return Number.isFinite(n) && has(v) ? n.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €' : ''; };
  const quote = s => { s = str(s).replace(/\s+/g, ' ').replace(/^[„"“»«]+|[“"”»«]+$/g, '').trim(); return `„${/[.!?…]$/.test(s) ? s : s + '.'}“`; };
  const crewText = k => joinList(arr(k).filter(x => x && has(x.name)).map(x => [str(x.grad), str(x.name)].filter(Boolean).join(' ')));
  const first = (p, kasus) => p[kasus] + (p.name ? `, ${p.name},` : '');

  function ctx(d) {
    const kl = get(d, 'meta.klarnamen') === 'ja';
    const G = person('gs', get(d, 'gs'), kl), T = person('bs', get(d, 'bs'), kl);
    const o = get(d, 'ort') || {};
    const adr = [P(str(o.strasse), str(o.hausnr)), str(o.stadt)].filter(has).join(', ');
    const kinder = C.kinderDa(d) ? arr(get(d, 'kinder')).filter(hasObj) : [];
    const zeugen = get(d, 'zg.vorhanden') === 'ja' ? arr(get(d, 'zeugen')).filter(hasObj).map((z, i) => ({ z, nr: 'Z ' + N2(i + 1), p: person('zg', z.p, kl) })) : [];
    return { d, kl, G, T, adr, kinder, zeugen, da: C.bsDa(d), weg: C.bsWeg(d), wv: C.wvJa(d), ende: C.wvEnde(d), max: C.wvMax(d) };
  }
  /** Beeinflussung durch Alkohol/Drogen – gleiche Satzführung wie im Modul Verkehrsunfallflucht. */
  function konsum(p, ref, mitTest) {
    p = p || {}; const t = [];
    if (p.alkohol === 'ja') {
      t.push(`Bei ${ref.dat} ergaben sich Anzeichen für eine Beeinflussung durch Alkohol, Drogen oder Medikamente.` + (has(p.alkoholText) ? ` Festgestellt wurden ${slot(p.alkoholText)}.` : ''));
      if (mitTest && p.aat === 'ja') t.push(`Ein freiwilliger Atemalkoholtest ergab einen Wert von ${has(p.aatWert) ? String(p.aatWert).replace('.', ',') + ' mg/l' : PH('Wert')}.`);
      else if (mitTest && p.aat === 'verweigert') t.push(`Einen Atemalkoholtest lehnte ${ref.er} ab.`);
    } else if (p.alkohol === 'nein') t.push(`Anhaltspunkte für eine Beeinflussung ${ref.gen} durch Alkohol, Drogen oder Medikamente ergaben sich nicht.`);
    return t.join(' ');
  }
  function verletzung(list, wo, ref) {
    const v = arr(list); if (!v.length) return '';
    const real = pick(C.VERL, v);
    if (!real.length) return `Sichtbare Verletzungen waren bei ${ref.dat} nicht festzustellen.`;
    return `${ref.Nom} wies folgende sichtbare Verletzungen auf: ${joinList(real)}.` + (has(wo) ? ` Die Verletzungen befinden sich ${slot(wo)}.` : '');
  }

  /* ---------- 1 Einsatz ---------- */
  function s11(d, x) {
    const e = get(d, 'einsatz') || {}, o = get(d, 'ort') || {};
    const crew = crewText(e.kraefte);
    const wer = has(e.rufname) ? `die Besatzung des ${str(e.rufname)}${crew ? ' (' + crew + ')' : ''}` : (crew || 'die eingesetzte Streifenwagenbesatzung');
    const wann = `Am ${has(e.datum) ? fmtDate(e.datum) : PH('Datum')} gegen ${has(e.zeit) ? fmtTime(e.zeit) : PH('Uhrzeit')}`;
    const adr = (x.adr || PH('Anschrift')) + (has(o.lage) ? ` (${str(o.lage)})` : '');
    const weg = { leitstelle: 'über die Leitstelle', telefon: 'nach telefonischer Mitteilung bei der Wache', wache: 'nach persönlicher Mitteilung auf der Wache' }[e.meldeweg] || '';
    const a = e.meldeweg === 'streife'
      ? `${wann} wurde ${wer} im Streifendienst auf eine Auseinandersetzung an der Anschrift ${adr} aufmerksam.`
      : `${wann} erhielt ${wer}${weg ? ' ' + weg : ''} den Einsatz „Häusliche Gewalt“ an der Anschrift ${adr}.`;
    const mit = { gs: `Die Meldung kam von ${x.G.dat} selbst.`, kind: 'Die Meldung kam von einem Kind aus dem Haushalt.', nachbar: 'Die Meldung kam aus der Nachbarschaft.', dritte: 'Die Meldung kam von Dritten.', bs: `Die Meldung kam von ${x.T.dat} selbst.`, unbekannt: 'Wer die Meldung abgesetzt hat, ist nicht bekannt.' }[e.mitteiler] || '';
    return P(a, has(e.meldung) ? `Gemeldet wurde: ${slot(e.meldung)}.` : '', e.meldeweg === 'streife' ? '' : mit);
  }
  function s12(d, x) {
    const e = get(d, 'einsatz') || {}, z = get(d, 'zutritt') || {};
    const t = [has(e.eintreffZeit) ? `Die Einsatzkräfte trafen um ${fmtTime(e.eintreffZeit)} an der Einsatzörtlichkeit ein.` : ''];
    const wer = { gs: x.G.dat, bs: x.T.dat, kind: 'einem Kind', andere: 'einer weiteren Person' }[z.wer];
    const tats = pick(C.TATSACHEN, arr(z.tatsachen));
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
    return P(...t);
  }

  /* ---------- 2 Feststellungen ---------- */
  function s21(d, x) {
    const { G, T } = x; const t = [];
    const nK = x.kinder.filter(k => k.da !== 'nein').length;
    const wer = [first(G, 'nom'), x.da ? first(T, 'nom') : '', nK ? (nK === 1 ? 'ein Kind' : `${ZAHL[nK] || nK} Kinder`) : ''].filter(Boolean);
    t.push(`Vor Ort ${wer.length > 1 || nK > 1 ? 'wurden' : 'wurde'} ${joinList(wer)} angetroffen.`);
    if (x.weg) t.push(`${T.Nom} wurde nicht angetroffen.` + (has(get(d, 'abw.verbleib')) ? ` Nach Angaben ${G.gen} ${slot(get(d, 'abw.verbleib'))}.` : ''));
    const bez = C.BEZIEHUNG[get(d, 'lage.beziehung')];
    if (bez) t.push(`Bei den Beteiligten handelt es sich um ${bez}.`);
    t.push({ ja: 'Beide leben gemeinsam in der Wohnung.', nein: `${T.Nom} lebt nicht in der Wohnung.`, unklar: 'Die Wohnverhältnisse ließen sich vor Ort nicht abschließend klären.' }[get(d, 'lage.wohnt')] || '');
    const zg = pick(C.ZUST_GS, arr(get(d, 'eintreff.zustGs')));
    if (zg.length) t.push(`${G.Nom} ${joinList(zg)}.`);
    t.push(konsum(get(d, 'gs'), G, false));
    if (x.da) {
      const zb = pick(C.ZUST_BS, arr(get(d, 'eintreff.zustBs')));
      if (zb.length) t.push(`${T.Nom} ${joinList(zb)}.`);
      t.push(konsum(get(d, 'bs'), T, true));
    }
    const bes = arr(get(d, 'bs.bes'));
    if (x.da && bes.includes('rausch')) t.push(`${T.Nom} war aufgrund ${T.sein}es Zustands nicht in der Lage, Belehrungen und Erklärungen zu folgen.`);
    if (x.da && bes.includes('sprache')) t.push(`Eine Verständigung mit ${T.dat} in deutscher Sprache war nicht möglich.`);
    if (bes.includes('betreut')) t.push(`${T.Nom} steht unter rechtlicher Betreuung.`);
    if (x.da && bes.includes('psych')) t.push(`${T.Nom} befand sich erkennbar in einer akuten psychischen Krise.`);
    if (bes.includes('minder')) t.push(`${T.Nom} ist minderjährig.`);
    if (bes.includes('waffen')) t.push(`${T.Nom} hat nach den vorliegenden Erkenntnissen Zugang zu Waffen.`);
    const w = get(d, 'eintreff.wohnung');
    if (w === 'unauffaellig') t.push('Die Wohnung war unauffällig; Spuren einer Auseinandersetzung waren nicht erkennbar.');
    else if (w === 'spuren') { const sp = pick(C.WOHNUNG, arr(get(d, 'eintreff.spuren'))); t.push((sp.length ? `In der Wohnung waren ${joinList(sp)} festzustellen.` : 'In der Wohnung waren Spuren einer Auseinandersetzung festzustellen.') + (has(get(d, 'eintreff.spurenText')) ? ' ' + endDot(cap(str(get(d, 'eintreff.spurenText')))) : '')); }
    const so = arr(get(d, 'eintreff.sofort')).filter(k => x.da || !['getrennt', 'eigen'].includes(k));
    t.push(...pick({ getrennt: 'Die Beteiligten wurden räumlich getrennt und einzeln befragt.', idf: 'Die Identitäten wurden festgestellt.', abgleich: 'Ein Datenabgleich wurde durchgeführt.', eigen: `${T.Nom} wurde zur Eigensicherung nach Waffen und gefährlichen Gegenständen durchsucht (§ 39 Abs. 2 PolG NRW).`, waffen: 'Waffen bzw. gefährliche Gegenstände wurden sichergestellt (§ 43 Nr. 1 PolG NRW); eine Bescheinigung wurde ausgestellt.', absuche: 'Der Nahbereich wurde abgesucht.' }, so));
    const sp = [];
    if (has(get(d, 'spontan.gs'))) sp.push(`Noch bevor Fragen gestellt wurden, äußerte ${G.nom}${um(get(d, 'spontan.gsZeit'))} ungefragt: ${quote(get(d, 'spontan.gs'))}`);
    if (x.da && has(get(d, 'spontan.bs'))) sp.push(`${T.Nom} äußerte${um(get(d, 'spontan.bsZeit'))} ungefragt und vor jeder Befragung: ${quote(get(d, 'spontan.bs'))}`);
    return B(P(...t), P(...sp));
  }
  function s22(d, x) {
    const { G, T } = x; const v = get(d, 'verl') || {}; const t = [];
    t.push(verletzung(v.gs, v.gsWo, G));
    if (has(v.gsSchmerz)) t.push(`${G.Er} klagte über ${slot(v.gsSchmerz)}.`);
    const frage = `${G.Nom} wurde gefragt, ob ${G.er} einen Rettungswagen oder ärztliche Hilfe benötigt.`;
    t.push({ vorort: `Ein Rettungswagen wurde angefordert; ${G.nom} wurde vor Ort ambulant versorgt.`, kh: `${G.Nom} wurde mit dem Rettungswagen in ${has(v.kh) ? 'das ' + str(v.kh) : 'ein Krankenhaus'} gebracht.`, selbst: `${frage} ${G.Er} lehnte einen Rettungswagen ab und erklärte, sich selbstständig in ärztliche Behandlung zu begeben.`, abgelehnt: `${frage} ${G.Er} lehnte einen Rettungswagen und jede ärztliche Behandlung ab.`, unnoetig: `${frage} Nach ${G.sein}en Angaben war dies nicht erforderlich.` }[v.rtw] || '');
    const bel = C.angehoerig(d);
    t.push({ ja: `Die Verletzungen wurden ${bel ? 'nach Belehrung über das Weigerungsrecht (§ 81c Abs. 3 StPO) und ' : ''}mit Einwilligung ${G.gen} fotografisch gesichert; die Lichtbilder sind der Anzeige beigefügt.`, abgelehnt: `Die Fertigung von Lichtbildern lehnte ${G.er} ab.`, spaeter: 'Lichtbilder der Verletzungen werden nachgeholt.' }[v.fotoGs] || '');
    if (v.attest === 'ja') t.push(`${G.Nom} wurde auf die Möglichkeit hingewiesen, die Verletzungen ärztlich dokumentieren zu lassen.`);
    const b = [];
    if (x.da) { b.push(verletzung(v.bs, v.bsWo, T)); if (v.fotoBs === 'ja') b.push('Diese Verletzungen wurden fotografisch gesichert (§ 81b Abs. 1 StPO).'); }
    return B(P(...t), P(...b));
  }
  function s23(d, x) {
    if (!C.kinderDa(d)) return 'Im Haushalt leben keine Kinder.';
    const k = get(d, 'kind') || {}; const n = x.kinder.length; const eins = n === 1; const t = [];
    if (n) t.push(`Im Haushalt ${eins ? 'lebt ein Kind' : `leben ${ZAHL[n] || n} Kinder`}.`); else t.push('Im Haushalt leben Kinder.');
    x.kinder.forEach((c, i) => {
      const name = (x.kl && has(c.vorname) ? str(c.vorname) : (eins ? 'Das Kind' : `Kind ${i + 1}`)) + (has(c.alter) ? ` (${c.alter} ${Number(c.alter) === 1 ? 'Jahr' : 'Jahre'})` : '');
      if (c.da === 'nein') { t.push(`${name} war während des Einsatzes nicht anwesend.`); return; }
      const z = pick(C.KIND_ZUST, arr(c.zust));
      t.push(`${name} ${joinList(['war während des Einsatzes anwesend', ...z])}.`);
      if (has(c.spontan)) t.push(`Ungefragt äußerte das Kind: ${quote(c.spontan)}`);
    });
    t.push(`Zur Tat ${eins ? 'wurde das Kind' : 'wurden die Kinder'} nicht befragt.`);
    if (k.opfer === 'ja') t.push('Nach den vorliegenden Erkenntnissen ist ein Kind selbst Opfer von Gewalt geworden.');
    t.push({ gs: `${eins ? 'Das Kind verblieb' : 'Die Kinder verblieben'} bei ${x.G.dat}.`, dritte: `${eins ? 'Das Kind wurde' : 'Die Kinder wurden'} von Verwandten bzw. Nachbarn betreut.`, jugendamt: `${eins ? 'Das Kind wurde' : 'Die Kinder wurden'} durch das Jugendamt untergebracht.` }[k.betreuung] || '');
    t.push({ sofort: `Der Bereitschaftsdienst des Jugendamts wurde${um(k.jugendamtZeit)} verständigt.`, bericht: 'Eine Mitteilung an das Jugendamt wird gefertigt (§ 27 Abs. 2 PolG NRW).', nein: 'Von einer Mitteilung an das Jugendamt wurde abgesehen.' }[k.jugendamt] || '');
    return P(...t);
  }

  /* ---------- 3 Angaben ---------- */
  function s31(d, x) {
    const { G, T } = x; const a = get(d, 'gsa') || {}, bel = get(d, 'bel') || {}; const t = [];
    const zeuge = G.g === 'm' ? 'Zeuge' : 'Zeugin';
    t.push({ 52: `${G.Nom} wurde${um(bel.gsZeit)} gemäß § 52 Abs. 3 StPO über ${G.sein} Zeugnisverweigerungsrecht belehrt.`, 57: `${G.Nom} wurde${um(bel.gsZeit)} als ${zeuge} belehrt.`, offen: PH('Zeugenbelehrung') }[bel.gs] || '');
    if (a.modus === 'keine') t.push(`${G.Er} machte keine Angaben zur Sache.`);
    else {
      const h = pick(C.HANDLUNG, arr(a.handlung));
      if (h.length) t.push(`Nach ${G.sein}en Angaben habe ${T.nom} ${G.ihn} ${joinList(h)}.`);
      if (has(a.zeit) || a.raum) t.push(`Der Übergriff habe sich${has(a.zeit) ? ' gegen ' + fmtTime(a.zeit) : ''}${C.RAUM[a.raum] ? ' ' + C.RAUM[a.raum] : ''} ereignet.`);
      if (a.modus === 'jetzt') {
        if (has(a.anlass)) t.push(`Anlass sei ${slot(a.anlass)}.`);
        if (has(a.text)) t.push(`${G.Er} gab an, ${endDot(slot(a.text))}`);
      } else if (a.modus === 'spaeter') t.push(`Die ausführliche Schilderung ${G.gen} wird in einer gesonderten Vernehmung nachgetragen.`);
      if (a.frueher === 'erstmals') t.push(`Nach ${G.sein}en Angaben habe es sich um den ersten Übergriff gehandelt.`);
      else if (a.frueher === 'ja') t.push('Es sei bereits früher zu Übergriffen gekommen.' + (has(a.frueherText) ? ` Zu früheren Vorfällen gab ${G.er} an, ${endDot(slot(a.frueherText))}` : ''));
    }
    t.push({ ja: `${G.Er} äußerte Angst vor weiteren Übergriffen.`, nein: `Angst vor weiteren Übergriffen äußerte ${G.er} nicht.` }[a.angst] || '');
    t.push({ will: `${G.Er} wünschte, dass ${T.nom} die Wohnung verlässt.`, ablehnt: `Eine Wohnungsverweisung lehnte ${G.er} ab, blieb aber bei ${G.sein}en Angaben.`, widerruf: `Im weiteren Verlauf nahm ${G.er} ${G.sein}e Angaben zurück.` }[a.wille] || '');
    t.push({ ja: `${G.Er} verbleibt in der Wohnung.`, auszug: `${G.Er} beabsichtigt, in Kürze aus der Wohnung auszuziehen.`, weg: `${G.Er} hat die Wohnung dauerhaft verlassen.` }[a.bleibt] || '');
    t.push({ ja: 'Strafantrag wurde gestellt.', nein: 'Strafantrag wurde nicht gestellt.', spaeter: `${G.Er} behält sich die Stellung eines Strafantrags vor.` }[a.antrag] || '');
    return P(...t);
  }
  function anhoerung(d, x) {
    const { G, T } = x; const h = get(d, 'anh') || {};
    if (['alle', 'heute'].includes(h.vorhalt)) {
      const t = [`Unabhängig von der Beschuldigtenbelehrung wurde ${T.nom}${um(h.zeit)} zur beabsichtigten Wohnungsverweisung angehört (§ 28 Abs. 1 VwVfG NRW). ${T.Dat} wurden die Vorwürfe ${G.gen}${h.vorhalt === 'alle' ? ' einschließlich der geschilderten früheren Vorfälle' : ''} mitgeteilt; ${T.er} erhielt Gelegenheit zur Äußerung und wurde darauf hingewiesen, dass ${T.er} sich nicht äußern muss.`];
      if (h.reaktion === 'text') t.push(has(h.text) ? `Hierzu äußerte ${T.er}, ${endDot(slot(h.text))}` : PH('Äußerung in der Anhörung'));
      else if (h.reaktion === 'keine') t.push(`Hierzu äußerte ${T.er} sich nicht.`);
      const f = pick({ unterkunft: 'einer Unterkunft', arbeit: 'einer beruflichen oder versorgenden Bindung an die Wohnung', einwand: 'Einwänden gegen Dauer und Bereich der Maßnahme' }, arr(h.fragen));
      if (f.length) t.push(`${T.Er} wurde außerdem nach ${joinList(f)} gefragt.`);
      if (has(h.unterkunft)) t.push(`${T.Er} gab an, ${slot(h.unterkunft)} unterzukommen.` + (/nirgends/.test(h.unterkunft) ? ` ${T.Er} wurde auf die Hilfe der Ordnungs- und Sozialbehörde hingewiesen.` : ''));
      return P(...t);
    }
    if (h.vorhalt === 'unm') return `Eine Anhörung ${T.gen} war wegen ${T.sein}es Zustands bzw. fehlender Verständigung nicht möglich (§ 28 Abs. 2 Nr. 1 VwVfG NRW). Sie wird nachgeholt; die Verfügung wird danach überprüft.`;
    return '';
  }
  function s32(d, x) {
    const { G, T } = x; if (!x.da) return `${T.Nom} wurde nicht angetroffen; Angaben liegen nicht vor.` + (get(d, 'abw.anh') === 'ja' ? ' Zur telefonischen bzw. späteren Anhörung siehe 5.1.' : '');
    const bel = get(d, 'bel') || {}, a = get(d, 'bsa') || {}; const t = [];
    t.push({ ja: `${T.Dat} wurde${um(bel.bsZeit)} eröffnet, welche Tat ${T.ihm} zur Last gelegt wird; ${T.er} wurde gemäß § 163a Abs. 4, § 136 Abs. 1 StPO belehrt.`, unm: `Eine Belehrung ${T.gen} war wegen ${T.sein}es Zustands bzw. fehlender Verständigung nicht möglich und wird nachgeholt; Fragen zur Sache wurden nicht gestellt.`, offen: PH('Beschuldigtenbelehrung') }[bel.bs] || '');
    if (bel.bs === 'ja') {
      if (bel.bsReaktion === 'schweigt') t.push(`${T.Er} machte von ${T.sein}em Schweigerecht Gebrauch.`);
      else if (bel.bsReaktion === 'anwalt') t.push(`${T.Er} erklärte, sich erst nach Rücksprache mit einem Verteidiger äußern zu wollen; Fragen zur Sache wurden nicht mehr gestellt.`);
      else if (bel.bsReaktion === 'aeussert') {
        if (a.modus === 'keine') t.push(`${T.Er} machte keine Angaben zur Sache.`);
        else {
          t.push({ bestreitet: `${T.Er} bestritt die Vorwürfe.`, teil: `${T.Er} räumte die Vorwürfe teilweise ein.`, raeumt: `${T.Er} räumte die Vorwürfe ein.`, gegen: `${T.Er} bestritt die Vorwürfe und erhob ${T.sein}erseits Vorwürfe gegen ${G.akk}.` }[a.kern] || '');
          if (a.modus === 'jetzt' && has(a.text)) t.push(`${T.Er} gab an, ${endDot(slot(a.text))}`);
          else if (a.modus === 'spaeter') t.push(`Die ausführliche Einlassung ${T.gen} wird in einer gesonderten Vernehmung nachgetragen.`);
        }
      }
    }
    return B(P(...t), anhoerung(d, x));
  }
  function s33(d, x) {
    if (get(d, 'zg.vorhanden') === 'nein') return 'Unbeteiligte Zeugen konnten nicht festgestellt werden.';
    if (!x.zeugen.length) return '';
    return x.zeugen.map(({ z, nr, p }) => {
      const art = { nachbar: p.g === 'm' ? 'Nachbar' : 'Nachbarin', angehoerig: p.g === 'm' ? 'Angehöriger' : 'Angehörige', besuch: 'Besuch' }[z.art];
      const wahr = { gesehen: 'hat das Geschehen selbst gesehen', gehoert: 'hat das Geschehen gehört, aber nicht gesehen', danach: 'ist erst nach dem Geschehen hinzugekommen' }[z.wahr];
      const t = [`${cap(first(p, 'nom'))}${art ? ' (' + art + ')' : ''}${wahr ? ' ' + wahr : ' wurde als Zeugenperson festgestellt'}.`];
      if (z.modus === 'jetzt' && has(z.text)) t.push(`${p.Er} gab an, ${endDot(slot(z.text))}`);
      else if (z.modus === 'spaeter') t.push('Die Vernehmung wird nachgeholt.');
      else if (z.modus === 'keine') t.push(`${p.Er} machte keine Angaben.`);
      return nr + '\n' + P(...t);
    }).join('\n\n');
  }

  /* ---------- 4 Prognose ---------- */
  function s41(d, x) {
    const { G } = x; const p = get(d, 'prog') || {}; const t = [];
    const vg = arr(p.vorg);
    if (vg.includes('keine') && vg.length === 1) t.push('Polizeiliche Erkenntnisse zu früheren Vorfällen liegen nicht vor.');
    else if (pick(C.VORG, vg).length) t.push(`Polizeilich bekannt sind ${joinList(pick(C.VORG, vg))}.`);
    t.push({ beziehung: 'Es liegen konkrete Anzeichen für wiederholte Übergriffe und damit für eine Gewaltbeziehung vor.', ersttat: 'Es handelt sich nach den vorliegenden Erkenntnissen um eine erstmalige Tat, die nach der Intensität des Angriffs und der Schwere der Verletzung eine jederzeitige Wiederholung befürchten lässt.' }[p.muster] || '');
    const st = arr(p.stuetzen);
    if (pick(C.STUETZEN, st).length) t.push(`Die Angaben ${G.gen} werden gestützt durch ${joinList(pick(C.STUETZEN, st))}.`);
    else if (st.includes('keine')) t.push('Objektive Anhaltspunkte, die die Angaben stützen, lagen am Einsatzort nicht vor.');
    if (has(p.wuerdigung)) t.push(`Den Angaben ${G.gen} wird gefolgt, weil ${slot(p.wuerdigung)}.`);
    if (p.wechsel === 'ja') t.push('Beide Beteiligten erheben wechselseitig Vorwürfe.');
    const w = pick(C.WARN, arr(p.warn));
    if (w.length) t.push(`Als Warnsignale für eine weitere Eskalation liegen vor: ${joinList(w)}.`);
    if (p.gefahr === 'ja') t.push(`Nach Würdigung aller am Einsatzort verfügbaren Erkenntnisse bestand eine gegenwärtige Gefahr für Leib, Leben oder Freiheit ${G.gen}. Mit weiteren Übergriffen ist in allernächster Zeit zu rechnen, weil ${has(p.warum) ? slot(p.warum) : PH('Begründung')}.`);
    else if (p.gefahr === 'nein') t.push(`Eine gegenwärtige Gefahr für Leib, Leben oder Freiheit ${G.gen} war nicht festzustellen${has(p.warumNicht) ? ', weil ' + slot(p.warumNicht) : ''}.`);
    return P(...t);
  }

  /* ---------- 5 Maßnahmen ---------- */
  function bereich(d, x) {
    const w = get(d, 'wv') || {};
    const orte = [...pick(C.ORTE, arr(w.orte)), ...arr(w.weitere).filter(o => o && has(o.ort)).map(o => slot(o.ort))];
    return `Der räumliche Bereich umfasst ${orte.length ? joinList(orte) : PH('räumlicher Bereich')}${x.adr ? ` des Anwesens ${x.adr}` : ''}.`
      + arr(w.weitere).filter(o => o && has(o.ort) && has(o.grund)).map(o => ` Die Verfügung bezieht ${slot(o.ort)} ein, weil ${slot(o.grund)}.`).join('');
  }
  function dauer(d, x) {
    const w = get(d, 'wv') || {};
    return `Die Maßnahme endet mit Ablauf des ${x.ende ? fmtDate(x.ende) : PH('Enddatum')}.` + (w.dauer === 'kuerzer' && has(w.dauerGrund) ? ` Die Dauer wurde verkürzt, weil ${slot(w.dauerGrund)}.` : '');
  }
  function schluessel(v, n, x) {
    const k = Number(n);
    return { sicher: `${has(n) ? cap(ZAHL[k] || String(k)) : PH('Anzahl')} Haus- bzw. Wohnungsschlüssel ${k === 1 ? 'wurde' : 'wurden'} gemäß § 43 Nr. 1 PolG NRW sichergestellt; eine Bescheinigung wurde ausgehändigt (§ 44 Abs. 2 PolG NRW).`, keine: `Nach eigenen Angaben besitzt ${x.T.nom} keine Schlüssel zur Wohnung.`, schloss: `Schlüssel konnten nicht sichergestellt werden; ${x.G.dat} wurde der Austausch des Schlosses empfohlen.`, spaeter: 'Die Schlüssel werden beim Antreffen sichergestellt.' }[v] || '';
  }
  function s51(d, x) {
    const { G, T } = x; const w = get(d, 'wv') || {}; const t = [];
    if (C.wvNein(d)) {
      const g = { gefahr: 'eine gegenwärtige Gefahr für Leib, Leben oder Freiheit nicht festzustellen war', verbal: 'es bei einem verbalen Streit geblieben ist', wohnt: `${T.nom} nicht in der Wohnung lebt`, weg: `${G.nom} die Wohnung dauerhaft verlassen hat`, unklar: 'sich nicht aufklären ließ, von wem die Gefahr ausgeht', freiwillig: `${T.nom} glaubhaft von sich aus dauerhaft Abstand sucht` }[w.grund];
      t.push(`Von einer Wohnungsverweisung nach § 34a PolG NRW wurde abgesehen${g ? ', weil ' + g : ''}.`);
      t.push(...pick({ platz: `Gegen ${T.akk} wurde ein Platzverweis ausgesprochen (§ 34 Abs. 1 PolG NRW).`, betret: 'Ein Betretungs- und Aufenthaltsverbot nach § 34 Abs. 2 PolG NRW wurde angeregt.', anspr: `Mit ${T.dat} wurde eine Gefährderansprache geführt.`, trennung: 'Die Beteiligten trennten sich freiwillig räumlich.', gewahrsam: `${T.Nom} wurde zur Verhinderung einer unmittelbar bevorstehenden Straftat in Gewahrsam genommen (§ 35 Abs. 1 Nr. 2 PolG NRW).` }, arr(w.alt)));
      if (has(w.altText)) t.push(endDot(cap(str(w.altText))));
      return P(...t);
    }
    if (!x.wv) return '';
    const zgSatz = has(w.zgHoehe) || w.zg === 'ja' ? `Für jeden Fall der Zuwiderhandlung wurde ein Zwangsgeld in Höhe von ${euro(w.zgHoehe) || PH('Betrag')} angedroht; auf die Möglichkeit der Ersatzzwangshaft wurde hingewiesen (§§ 53, 54, 56 PolG NRW).` : '';
    if (x.weg) {
      const a = get(d, 'abw') || {};
      t.push(`Gegen ${T.akk} wurde${um(w.zeit)} gemäß § 34a Abs. 1 PolG NRW ein Rückkehrverbot angeordnet.`, bereich(d, x), dauer(d, x));
      const wie = { telefon: 'telefonisch erreicht', ort: `an ${T.sein}em Aufenthaltsort aufgesucht` }[a.erreichbar];
      const b = [];
      if (wie && a.anh === 'ja') b.push(`${T.Nom} wurde${um(a.anhZeit)} ${wie}, gemäß § 136 Abs. 1 StPO belehrt und zu den Vorwürfen angehört, bevor über das Rückkehrverbot entschieden wurde.` + (has(a.anhText) ? ` ${T.Er} äußerte, ${endDot(slot(a.anhText))}` : ''));
      else if (a.erreichbar === 'nein') b.push(`${T.Nom} war nicht erreichbar; von einer vorherigen Anhörung wurde deshalb abgesehen (§ 28 Abs. 2 Nr. 1 VwVfG NRW). Sie wird beim Antreffen nachgeholt.`);
      b.push({ pers: `Das Rückkehrverbot wurde ${T.dat}${um(a.bekanntZeit)} persönlich bekanntgegeben.`, tel: `Das Rückkehrverbot wurde ${T.dat}${um(a.bekanntZeit)} telefonisch bekanntgegeben; Bereich und Enddatum wurden genannt.`, nein: `Eine Bekanntgabe war bislang nicht möglich; das Rückkehrverbot ist ${T.dat} gegenüber noch nicht wirksam.` }[a.bekannt] || '');
      const wache = has(a.wache) ? str(a.wache) : 'Polizeiwache';
      if (a.mitteilung === 'ja') b.push(`An der Wohnungstür wurde eine Mitteilung hinterlassen, dass ${T.er} sich bei der ${wache} melden und dort die für ${T.ihn} bestimmten Schriftstücke abholen kann.`);
      b.push({ pers: `Die schriftliche Verfügung wurde ${T.dat} gegen Empfangsbekenntnis ausgehändigt.`, wache: `Die schriftliche Verfügung liegt bei der ${wache} zur Abholung bereit.`, post: 'Die schriftliche Verfügung wird förmlich zugestellt.' }[a.schrift] || '');
      b.push(has(w.zgHoehe) ? `Die schriftliche Verfügung enthält die Androhung eines Zwangsgeldes in Höhe von ${euro(w.zgHoehe)} für jeden Fall der Zuwiderhandlung (§§ 53, 56 PolG NRW).` : '', schluessel(a.schluessel, '1', x).replace(/^Ein Haus-.*$/, 'Die Schlüssel wurden gemäß § 43 Nr. 1 PolG NRW sichergestellt; eine Bescheinigung wurde ausgestellt (§ 44 Abs. 2 PolG NRW).'));
      b.push(...pick({ folge: 'Die Folgeschicht wurde beauftragt, die Verfügung auszuhändigen.', streife: 'Die Wohnung wird im Rahmen der Streife aufgesucht.', notruf: `${G.Nom} wurde angewiesen, bei einer Rückkehr sofort den Notruf 110 zu wählen.`, fahndung: 'Eine Nahbereichsfahndung verlief ohne Erfolg.' }, arr(a.weiter)));
      return B(P(...t), P(...b), has(w.mittel) ? `Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil ${slot(w.mittel)}.` : '');
    }
    const pf = arr(w.pflichten);
    t.push(`Gegen ${T.akk} wurde${um(w.zeit)} gemäß § 34a Abs. 1 PolG NRW eine Wohnungsverweisung mit Rückkehrverbot angeordnet${pf.includes('bekannt') ? ' und mündlich bekanntgegeben' : ''}.`, bereich(d, x), dauer(d, x));
    if (pf.includes('dauer')) t.push(`${T.Er} wurde darüber unterrichtet, dass sich das Rückkehrverbot bei einem Antrag auf zivilgerichtlichen Schutz bis zur gerichtlichen Entscheidung verlängert, längstens bis zum ${fmtDate(x.max)}.`);
    const v = [];
    if (pf.includes('gegenst')) v.push(`${T.Dat} wurde Gelegenheit gegeben, dringend benötigte Gegenstände des persönlichen Bedarfs mitzunehmen (§ 34a Abs. 2 PolG NRW).` + (has(w.gegenst) ? ` ${T.Er} nahm mit: ${slot(w.gegenst)}.` : ''));
    if (pf.includes('anschrift')) v.push(`${T.Er} wurde aufgefordert, eine Anschrift oder eine zustellungsbevollmächtigte Person zu benennen (§ 34a Abs. 3 PolG NRW).` + (has(w.anschrift) ? ` ${T.Er} benannte ${slot(w.anschrift)}.` : ''));
    v.push(schluessel(w.schluessel, w.schluesselAnz, x), w.zg === 'ja' ? zgSatz : '');
    const mitZg = w.zg === 'ja' ? ' mit Zwangsgeldandrohung' : '';
    v.push({ vorort: `Die schriftliche Bestätigung der Verfügung${mitZg} wurde ${T.dat} vor Ort gegen Empfangsbekenntnis ausgehändigt.`, verweigert: `Die Annahme der schriftlichen Bestätigung${mitZg} verweigerte ${T.er}.`, wache: `Die schriftliche Bestätigung${mitZg} liegt bei der ${has(w.wache) ? str(w.wache) : 'Polizeiwache'} zur Abholung bereit; ${T.nom} wurde darauf hingewiesen.`, post: `Die schriftliche Bestätigung${mitZg} wird förmlich zugestellt.` }[w.schrift] || '');
    if (C.nacht(d) && w.erlaubnis === 'ja') v.push('Die Erlaubnis der Behördenleitung für die Zustellung zur Nachtzeit bzw. an Sonn- und Feiertagen lag vor (§ 5 Abs. 3 LZG NRW).');
    if (pf.includes('rechtsschutz')) v.push(`${T.Er} wurde auf die Möglichkeit hingewiesen, beim Verwaltungsgericht vorläufigen Rechtsschutz zu beantragen.`);
    if (pf.includes('folgen')) v.push(`${T.Er} wurde darauf hingewiesen, dass ein Verstoß die Festsetzung des Zwangsgeldes und die Ingewahrsamnahme zur Folge haben kann.`);
    const e = [], z = get(d, 'zw') || {}, g = get(d, 'gew') || {};
    const andr = z.androhung === 'ja' ? 'nach Androhung unmittelbaren Zwangs (§ 61 Abs. 1 PolG NRW) ' : '';
    if (w.verlassen === 'freiwillig') e.push(`${T.Er} verließ die Wohnung${um(w.verlassenZeit)} freiwillig.`);
    else if (w.verlassen === 'festnahme') e.push(`${T.Er} wurde${um(w.verlassenZeit)} vorläufig festgenommen (§ 127 Abs. 2 StPO).`);
    else if (C.zwang(d)) {
      e.push(`Da ${T.er} der Aufforderung, die Wohnung zu verlassen, nicht nachkam, wurde ${T.er} ${andr}${has(w.verlassenZeit) ? 'um ' + fmtTime(w.verlassenZeit) + ' ' : ''}mit einfacher körperlicher Gewalt aus der Wohnung geführt.`);
      if (arr(z.art).includes('fessel')) e.push(`${T.Er} wurde gefesselt (§ 62 PolG NRW)${has(z.fesselGrund) ? '; die Fesselung war erforderlich, weil ' + slot(z.fesselGrund) : ''}.`);
      e.push({ nein: 'Verletzt wurde dabei niemand.', bs: `${T.Nom} wurde dabei verletzt.`, beamte: 'Dabei wurden Einsatzkräfte verletzt.' }[z.verletzt] || '');
      if (C.gewahrsam(d)) {
        e.push(`${T.Er} wurde${um(g.zeit)} gemäß § 35 Abs. 1 Nr. 4 PolG NRW in Gewahrsam genommen. Der Gewahrsam war unerlässlich, weil ${has(g.grund) ? slot(g.grund) : PH('Tatsachen für die Unerlässlichkeit')}.`);
        const er = arr(g.erledigt);
        if (er.includes('grund')) e.push(`Der Grund der Freiheitsentziehung wurde ${T.dat} bekanntgegeben.`);
        if (er.includes('benachr')) e.push(`${T.Dat} wurde Gelegenheit gegeben, eine Person ${T.sein}es Vertrauens zu benachrichtigen (§ 37 Abs. 2 PolG NRW).`);
        if (er.includes('merkblatt')) e.push('Das Merkblatt über Rechte und Pflichten im Gewahrsam wurde ausgehändigt.');
        if (er.includes('faehig')) e.push('Bedenken gegen die Gewahrsamsfähigkeit bestanden nicht.');
        const ag = has(g.ag) ? str(g.ag) : 'zuständigen Amtsgericht';
        e.push({ beantragt: `Die richterliche Entscheidung wurde${um(g.richterZeit)} beim ${ag} beantragt (§ 36 Abs. 1 PolG NRW).`, fortdauer: `Das ${has(g.ag) ? str(g.ag) : 'zuständige Amtsgericht'} ordnete${um(g.richterZeit)} die Fortdauer des Gewahrsams an.`, abgelehnt: `Das ${has(g.ag) ? str(g.ag) : 'zuständige Amtsgericht'} lehnte${um(g.richterZeit)} die Fortdauer des Gewahrsams ab; ${T.nom} wurde entlassen.` }[g.richter] || '');
      }
    }
    return B(P(...t), P(...v), P(...e), has(w.mittel) ? `Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil ${slot(w.mittel)}.` : '');
  }
  function s52(d, x) {
    const { T } = x; const s = get(d, 'straf') || {}; const t = [];
    const del = arr(s.delikte).map(k => C.DELIKT[k]).filter(Boolean).map(v => (/^eines /.test(v) ? v : 'der ' + v));
    t.push(del.length ? `Von Amts wegen wurde Strafanzeige wegen des Verdachts ${joinList(del)} gefertigt.` : 'Von Amts wegen wurde Strafanzeige gefertigt.');
    if (inc(d, 'os.hinweise', 'amtswegen')) t.push('Die Beteiligten wurden darüber informiert, dass die Tat unabhängig von einem Strafantrag von Amts wegen verfolgt wird.');
    t.push(...pick({ notruf: 'Die Sicherung der Notrufaufzeichnung wurde veranlasst.', wohnung: 'Vom Zustand der Wohnung wurden Lichtbilder gefertigt.', tatmittel: has(s.tatmittel) ? `Als Tatmittel wurde sichergestellt: ${slot(s.tatmittel)}.` : 'Das Tatmittel wurde sichergestellt.', handy: 'Ein Mobiltelefon wurde als Beweismittel sichergestellt.', bodycam: 'Der Einsatz wurde mit der Bodycam aufgezeichnet (§ 15c PolG NRW).', kleidung: 'Kleidung wurde als Spurenträger gesichert.' }, arr(s.beweise)));
    t.push({ richter: `Bei ${T.dat} wurde${um(s.blutZeit)} auf richterliche Anordnung eine Blutprobe entnommen (§ 81a StPO).`, eil: `Der Versuch, eine richterliche Anordnung zu erlangen, blieb${um(s.blutZeit)} ohne Erfolg; wegen Gefährdung des Untersuchungserfolgs wurde die Entnahme einer Blutprobe angeordnet (§ 81a Abs. 2 StPO).` }[x.da ? s.blut : ''] || '');
    return P(...t);
  }
  function s53(d, x) {
    const { G, T } = x; const o = get(d, 'os') || {}; const h = arr(o.hinweise); const t = [];
    if (h.includes('gewschg')) t.push(`${G.Nom} wurde auf die Möglichkeit hingewiesen, zivilgerichtlichen Schutz nach dem Gewaltschutzgesetz zu beantragen` + (x.wv ? `. ${G.Er} wurde außerdem darüber unterrichtet, dass sich das Rückkehrverbot verlängert, wenn der Antrag bis zum ${fmtDate(x.ende)} gestellt wird – bis zur gerichtlichen Entscheidung, längstens bis zum ${fmtDate(x.max)} (§ 34a Abs. 4, 5 PolG NRW).` : '.'));
    if (h.includes('beratung')) t.push(has(o.stelle) ? `Als Beratungsstelle wurde ${G.dat} benannt: ${str(o.stelle)}.` : `${G.Dat} wurde eine geeignete Beratungsstelle benannt.`);
    if (h.includes('daten')) t.push({ ja: `In die Weitergabe ${G.sein}es Namens, ${G.sein}er Anschrift und Telefonnummer an die Beratungsstelle willigte ${G.er} ein.`, nein: `In die Weitergabe ${G.sein}er Kontaktdaten an die Beratungsstelle willigte ${G.er} nicht ein; die Weitergabe unterbleibt.` }[o.einwilligung] || `Die Weitergabe ${G.sein}er Kontaktdaten an die Beratungsstelle wurde ${G.dat} angeboten.`);
    const unt = [h.includes('doku') ? 'eine Kopie der Einsatzdokumentation' : '', h.includes('merkblatt') ? 'das Merkblatt mit Hilfsangeboten' : ''].filter(Boolean);
    if (unt.length) t.push(`${G.Dat} ${unt.length > 1 ? 'wurden' : 'wurde'} ${joinList(unt)} ausgehändigt${x.da ? ' – nicht in Gegenwart ' + T.gen : ''}.`);
    if (h.includes('stpo')) t.push(`${G.Nom} wurde über ${G.sein}e Rechte nach §§ 406i, 406j StPO unterrichtet.`);
    if (h.includes('notruf')) t.push(`${G.Nom} wurde angewiesen, bei einer Rückkehr ${T.gen} sofort den Notruf 110 zu wählen.`);
    t.push({ wohnung: `${G.Nom} verbleibt in der Wohnung.`, frauenhaus: `${G.Nom} wurde in einer Schutzeinrichtung untergebracht.`, dritte: `${G.Nom} begab sich zu Verwandten bzw. Bekannten.` }[o.verbleib] || '');
    t.push(...pick({ gb: 'Eine Gefährdungsbewertung wurde gefertigt.', kontrolle: 'Die Kontrolle des Rückkehrverbots ist vorgemerkt (§ 34a Abs. 7 PolG NRW).', folge: 'Die Folgeschichten wurden über das Rückkehrverbot informiert.', sb: 'Der Vorgang wurde an die Sachbearbeitung übergeben.' }, arr(get(d, 'ab.erledigt'))));
    return P(...t);
  }
  function s61(d) {
    const e = get(d, 'einsatz') || {}; const crew = crewText(e.kraefte);
    return P(crew ? `Eingesetzt ${arr(e.kraefte).filter(k => k && has(k.name)).length > 1 ? 'waren' : 'war'} ${crew}${has(e.rufname) ? ' (' + str(e.rufname) + ')' : ''}.` : PH('Eingesetzte Kräfte'), has(e.weitere) ? `Zur Unterstützung waren vor Ort: ${slot(e.weitere)}.` : '');
  }
  const s62 = d => (has(get(d, 'einsatz.endeZeit')) ? `Der Einsatz wurde um ${fmtTime(get(d, 'einsatz.endeZeit'))} beendet.` : '');

  /* ---------- Bericht ---------- */
  function text(d) {
    const x = ctx(d);
    return [
      ['1', 'Einsatz'],
      ['1.1', 'Einsatzanlass', s11(d, x), 'einsatz'],
      ['1.2', 'Eintreffen und Zutritt', s12(d, x), 'zutritt'],
      ['2', 'Feststellungen vor Ort'],
      ['2.1', 'Angetroffene Personen und Lage', s21(d, x), 'eintreff'],
      ['2.2', 'Verletzungen und Versorgung', s22(d, x), 'verletzung'],
      ['2.3', 'Kinder', s23(d, x), 'kinder'],
      ['3', 'Schilderungen'],
      ['3.1', 'Angaben der geschädigten Person', s31(d, x), 'gsangaben'],
      ['3.2', 'Angaben der beschuldigten Person', s32(d, x), 'bsangaben'],
      ['3.3', 'Zeugen', s33(d, x), 'zeugen'],
      ['4', 'Bewertung'],
      ['4.1', 'Gefahrenprognose', s41(d, x), 'prognose'],
      ['5', 'Maßnahmen'],
      ['5.1', 'Gefahrenabwehr', s51(d, x), 'wv'],
      ['5.2', 'Strafverfolgung', s52(d, x), 'straf'],
      ['5.3', 'Opferschutz und Übergabe', s53(d, x), 'opfer'],
      ['6', 'Sonstiges'],
      ['6.1', 'Eingesetzte Kräfte', s61(d), 'kraefte'],
      ['6.2', 'Einsatzende', s62(d), 'abschluss']
    ].filter(s => s[2] == null || has(s[2]));
  }
  function plain(d) {
    const az = get(d, 'straf.az');
    return `Sachverhalt – Häusliche Gewalt${has(az) ? '\nVorgang: ' + str(az) : ''}\n\n` + text(d).map(([n, t, body]) => (body == null ? `${n} ${t}` : `${n} ${t}\n${body}`)).join('\n\n');
  }
  function preview(stepId, d) {
    const st = root.WHG_STEPS.find(s => s.id === stepId); if (!st) return '';
    const ids = Array.isArray(st.gen) ? st.gen : [st.gen];
    if (ids.includes('kurz')) return kurz(d);
    return text(d).filter(s => s[2] != null && ids.includes(s[0])).map(s => `${s[0]} ${s[1]}\n${s[2]}`).join('\n\n');
  }
  function kurz(d) {
    const x = ctx(d), { G, T } = x; const e = get(d, 'einsatz') || {}; const t = [];
    const gw = pick(C.GEWALT, arr(get(d, 'lage.gewalt')));
    t.push(`Am ${has(e.datum) ? fmtDate(e.datum) : PH('Datum')}${has(e.zeit) ? ' gegen ' + fmtTime(e.zeit) : ''} kam es an der Anschrift ${x.adr || PH('Anschrift')} zu einem Einsatz wegen häuslicher Gewalt${gw.length ? ' (' + joinList(gw) + ')' : ''}.`);
    const h = pick(C.HANDLUNG, arr(get(d, 'gsa.handlung')));
    if (h.length) t.push(`Nach Angaben ${G.gen} habe ${T.nom} ${G.ihn} ${joinList(h)}.`);
    const v = pick(C.VERL, arr(get(d, 'verl.gs')));
    if (v.length) t.push(`${G.Nom} wies ${joinList(v)} auf.`);
    if (x.weg) t.push(`${T.Nom} wurde nicht angetroffen.`);
    if (x.wv) t.push(`Gegen ${T.akk} wurde ${x.da ? 'eine Wohnungsverweisung mit Rückkehrverbot' : 'ein Rückkehrverbot'} bis zum Ablauf des ${fmtDate(x.ende)} angeordnet (§ 34a PolG NRW).`);
    else if (C.wvNein(d)) t.push('Von einer Wohnungsverweisung wurde abgesehen.');
    if (C.gewahrsam(d)) t.push(`${T.Nom} wurde zur Durchsetzung in Gewahrsam genommen.`);
    const del = arr(get(d, 'straf.delikte')).map(k => C.DELIKT[k]).filter(Boolean).map(s => (/^eines /.test(s) ? s : 'der ' + s));
    if (del.length) t.push(`Strafanzeige wegen des Verdachts ${joinList(del)} wurde gefertigt.`);
    if (C.kinderDa(d)) t.push('Im Haushalt leben Kinder; das Jugendamt ' + ({ sofort: 'wurde verständigt', bericht: 'erhält eine Mitteilung' }[get(d, 'kind.jugendamt')] || 'ist zu beteiligen') + '.');
    return P(...t);
  }

  /* ---------- Begründung der Verfügung (§ 34a PolG NRW) ---------- */
  /** Sprachebene wechseln: Geschädigte → gefährdete Person, Beschuldigte → Betroffene (nur in erzeugten Sätzen sicher). */
  function toVfg(s, d) {
    const G = person('gs', get(d, 'gs')), T = person('bs', get(d, 'bs'));
    const P2 = person('gp', get(d, 'gs')), B2 = person('bt', get(d, 'bs'));
    const pairs = [];
    ['nom', 'dat', 'akk', 'gen'].forEach(k => { pairs.push([G[k], P2[k]], [T[k], B2[k]]); });
    pairs.sort((a, b) => b[0].length - a[0].length);
    const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const [a, b] of pairs) { if (a === b) continue; s = s.replace(new RegExp(esc(cap(a)) + '(?![a-zäöüß])', 'g'), cap(b)).replace(new RegExp(esc(a) + '(?![a-zäöüß])', 'g'), b); }
    return s.replace(/geschädigten? Person/g, m => m.replace('geschädigte', 'gefährdete')).replace(/beschuldigten? Person/g, m => m.replace('beschuldigte', 'betroffene')).replace(/als Beschuldigte[rn]? belehrt/g, 'belehrt');
  }
  function begruendung(d) {
    if (!C.wvJa(d)) return '';
    const x = ctx({ ...d, meta: { klarnamen: 'nein' } }), { G, T } = x; const w = get(d, 'wv') || {}, p = get(d, 'prog') || {};
    const was = x.da ? 'eine Wohnungsverweisung mit Rückkehrverbot' : 'ein Rückkehrverbot';
    const a1 = P(`Gegen ${T.akk} wurde am ${fmtDate(C.wvTag(d)) || PH('Datum')}${um(w.zeit)} gemäß § 34a Abs. 1 PolG NRW ${was} angeordnet.`, bereich(d, x), dauer(d, x), `Wird innerhalb dieser Frist zivilgerichtlicher Schutz beantragt, endet die Maßnahme mit dem Tag der gerichtlichen Entscheidung, spätestens mit Ablauf des ${fmtDate(x.max)} (§ 34a Abs. 5 Satz 2 PolG NRW).`);
    const a2 = B(P(s11(d, x)), s21(d, x), s22(d, x), s31(d, x), s33(d, x));
    const bel = get(d, 'bsa') || {};
    const a3 = x.da ? P(anhoerung(d, x) || PH('Anhörung nach § 28 VwVfG NRW'), get(d, 'bel.bsReaktion') === 'aeussert' && has(bel.text) ? `Zur Sache gab ${T.er} an, ${endDot(slot(bel.text))}` : '')
      : P(get(d, 'abw.anh') === 'ja' ? `${T.Nom} wurde vor der Entscheidung erreicht und zu den Vorwürfen angehört.${has(get(d, 'abw.anhText')) ? ` ${T.Er} äußerte, ${endDot(slot(get(d, 'abw.anhText')))}` : ''}` : `Von einer vorherigen Anhörung wurde abgesehen, weil ${T.nom} nicht erreichbar war (§ 28 Abs. 2 Nr. 1 VwVfG NRW); sie wird nachgeholt.`);
    const a4 = s41(d, x);
    const e = [`Die Maßnahme richtet sich gegen ${T.akk}, weil von ${T.ihm} die Gefahr ausgeht.`];
    if (p.wechsel === 'ja') e.push(PH('Begründung der Auswahl bei wechselseitiger Gewalt: Verletzungsbild beider, Vorgeschichte, Zeugen'));
    e.push(has(w.mittel) ? `Mildere, gleich wirksame Mittel standen nicht zur Verfügung, weil ${slot(w.mittel)}.` : PH('mildere Mittel'));
    e.push('Der räumliche Bereich ist auf die Wohnung und ihre unmittelbare Umgebung beschränkt, soweit dies zum wirkungsvollen Schutz erforderlich ist.');
    const fr = arr(get(d, 'anh.fragen'));
    if (w.dauer === 'kuerzer') e.push(has(w.dauerGrund) ? `Die Dauer wurde verkürzt, weil ${slot(w.dauerGrund)}.` : PH('Grund der kürzeren Dauer'));
    else e.push(`Besondere Umstände, die eine kürzere als die gesetzliche Dauer von 14 Tagen rechtfertigen, lagen nicht vor${fr.includes('einwand') ? '; auf Befragen wurden keine benannt' : ''}.`);
    if (fr.includes('arbeit')) e.push(`Eine berufliche oder versorgende Bindung ${T.gen} an die Wohnung, die eine Beschränkung auf Wohn- und Nebenräume erfordert (§ 34a Abs. 1 Satz 3 PolG NRW), wurde erfragt und liegt nicht vor.`);
    if (get(d, 'gsa.wille') === 'ablehnt') e.push(`Dass ${G.nom} die Maßnahme ablehnt, steht ihr nicht entgegen; der Schutz von Leib und Leben steht nicht zur Disposition.`);
    const a6 = P(has(w.zgHoehe) ? `Für jeden Fall der Zuwiderhandlung wird ein Zwangsgeld in Höhe von ${euro(w.zgHoehe)} angedroht (§§ 53, 56 PolG NRW). Ist das Zwangsgeld uneinbringlich, kann das Verwaltungsgericht Ersatzzwangshaft anordnen (§ 54 PolG NRW).` : '', 'Die Verfügung ist sofort vollziehbar (§ 80 Abs. 2 Satz 1 Nr. 2 VwGO).', PH('Rechtsbehelfsbelehrung nach Vordruck der Behörde'));
    return toVfg([`Begründung – ${x.da ? 'Wohnungsverweisung mit Rückkehrverbot' : 'Rückkehrverbot'} (§ 34a PolG NRW)`, '1. Anordnung\n' + a1, '2. Sachverhalt\n' + a2, '3. Anhörung\n' + a3, '4. Gefahrenprognose\n' + a4, '5. Ermessen und Verhältnismäßigkeit\n' + P(...e), '6. Zwangsmittel und Hinweise\n' + a6].join('\n\n'), d);
  }

  /* ---------- Noch zu erledigen: was nach Gesetz und Handlungsanweisung fehlt ---------- */
  function offen(d) {
    const o = [], x = ctx(d), add = (c, s) => { if (c) o.push(s); };
    const w = get(d, 'wv') || {}, bel = get(d, 'bel') || {}, pr = get(d, 'prog') || {}, v = get(d, 'verl') || {}, a = get(d, 'abw') || {}, z = get(d, 'zutritt') || {}, k = get(d, 'kind') || {}, h = get(d, 'anh') || {}, s = get(d, 'straf') || {};
    const pf = arr(w.pflichten), os = arr(get(d, 'os.hinweise')), ab = arr(get(d, 'ab.erledigt')), bes = arr(get(d, 'bs.bes')), bw = arr(s.beweise);
    const ende = x.ende ? fmtDate(x.ende) : PH('Enddatum');
    // Zutritt
    add(C.zutrittGegen(d) && !arr(z.tatsachen).length, 'Tatsachen für die gegenwärtige Gefahr beim Betreten festhalten (§ 41 Abs. 1 Satz 1 Nr. 4 PolG NRW).');
    if (C.zutrittGegen(d) && z.gesucht === 'ja') {
      add(!arr(z.durchs).includes('gefahr'), 'Durchsuchung: Tatsachen für die Gefahr im Verzug vermerken (§ 42 Abs. 1 PolG NRW).');
      add(!arr(z.durchs).includes('niederschrift'), 'Niederschrift über die Durchsuchung fertigen (§ 42 Abs. 4 PolG NRW).');
    }
    // Verletzungen
    const verl = pick(C.VERL, arr(v.gs)).length > 0;
    add(!v.rtw, 'Geschädigte Person fragen, ob sie einen Rettungswagen oder ärztliche Hilfe benötigt, und die Antwort festhalten.');
    add(verl && !['ja', 'abgelehnt'].includes(v.fotoGs), 'Lichtbilder der Verletzungen fertigen und der Anzeige beifügen – bei Angehörigen nach Belehrung (§ 81c Abs. 3 StPO).');
    add(verl && v.attest !== 'ja', 'Auf ärztliche Dokumentation der Verletzungen (Attest) hinweisen.');
    // Belehrungen und Vernehmungen
    add(!bel.gs || bel.gs === 'offen', 'Geschädigte Person vor der Vernehmung belehren – Angehörige nach § 52 Abs. 3 StPO.');
    add(['52', '57'].includes(bel.gs) && !has(bel.gsZeit), 'Uhrzeit der Zeugenbelehrung nachtragen.');
    add(get(d, 'gsa.modus') === 'spaeter', 'Vernehmung der geschädigten Person nachholen.');
    if (x.da) {
      add(!['ja', 'unm'].includes(bel.bs), 'Beschuldigtenbelehrung vor der ersten Frage zur Tat (§ 163a Abs. 4, § 136 Abs. 1 StPO).');
      add(bel.bs === 'ja' && !has(bel.bsZeit), 'Uhrzeit der Beschuldigtenbelehrung vermerken (§ 168b Abs. 3 StPO).');
      add(bel.bs === 'unm', 'Belehrung und Vernehmung der beschuldigten Person nachholen, sobald sie aufnahmefähig ist bzw. ein Dolmetscher da ist.');
      add(get(d, 'bsa.modus') === 'spaeter', 'Vernehmung der beschuldigten Person nachholen.');
      add(pick(C.VERL, arr(v.bs)).length > 0 && v.fotoBs !== 'ja', 'Verletzungen der beschuldigten Person fotografieren (§ 81b Abs. 1 StPO) – auch Entlastendes sichern.');
    }
    add(x.zeugen.some(q => q.z.modus === 'spaeter'), 'Zeugenvernehmungen nachholen.');
    add(!get(d, 'zg.vorhanden'), 'Nach unbeteiligten Zeugen fragen (Nachbarn, Besucher).');
    // Kinder
    if (C.kinderDa(d)) {
      add(!k.betreuung, 'Betreuung der Kinder klären und festhalten.');
      add(!k.jugendamt, 'Verständigung des Jugendamts prüfen und Ergebnis vermerken (§ 27 Abs. 2 PolG NRW).');
      add(k.jugendamt === 'bericht', 'Mitteilung an das Jugendamt fertigen (§ 27 Abs. 2 PolG NRW).');
      add(k.opfer === 'ja' && k.jugendamt !== 'sofort', 'Kind ist selbst Opfer: Jugendamt sofort einschalten – das Gewaltschutzgesetz gilt gegenüber den Eltern nicht (§ 3 Abs. 1 GewSchG).');
    }
    // Prognose
    add(!pr.gefahr, 'Gefahrenprognose abschließen: gegenwärtige Gefahr ja oder nein.');
    if (x.wv) {
      add(pr.gefahr === 'nein', 'Widerspruch: Wohnungsverweisung angeordnet, aber gegenwärtige Gefahr verneint.');
      add(pr.muster === 'weder' || C.nurVerbal(d), 'Prognose trägt so nicht: weder Gewaltbeziehung noch intensive Ersttat bzw. nur verbaler Streit (OVG NRW 5 A 3548/20).');
      add(!has(pr.warum), 'Begründen, warum in allernächster Zeit weitere Übergriffe drohen (OVG NRW 5 E 1202/14).');
      add(!has(pr.wuerdigung), 'Begründen, warum welcher Schilderung gefolgt wird – besonders ohne objektive Stütze.');
      add(pr.wechsel === 'ja', 'Wechselseitige Gewalt: Auswahl mit Tatsachen begründen, beide belehren, beide Verletzungsbilder sichern.');
      add(get(d, 'lage.wohnt') === 'nein', 'Die Person lebt nicht in der Wohnung – Anwendbarkeit des § 34a begründen oder auf § 34 PolG NRW ausweichen.');
      add(get(d, 'gsa.bleibt') === 'weg', 'Geschädigte Person hat die Wohnung verlassen – Erforderlichkeit prüfen, sonst aufheben.');
      add(get(d, 'gsa.wille') === 'widerruf', 'Widerruf der Angaben konkret würdigen; trägt die Prognose nicht mehr, Verfügung aufheben (VG Münster 1 K 2338/08).');
      add(!arr(w.orte).length && !arr(w.weitere).some(q => q && has(q.ort)), 'Räumlichen Bereich genau bezeichnen (§ 34a Abs. 1 Satz 2 PolG NRW).');
      add(arr(w.weitere).some(q => q && has(q.ort) && !has(q.grund)), 'Für jede zusätzliche Örtlichkeit einen Satz Begründung – äußere Grenze ist die unmittelbare Umgebung der Wohnung.');
      add(!has(w.zeit), 'Uhrzeit der Anordnung vermerken.');
      add(!has(w.mittel), 'Festhalten, warum kein milderes Mittel reichte (§ 2 PolG NRW).');
      add(w.dauer === 'kuerzer' && !has(w.dauerGrund), 'Kürzere Dauer begründen (§ 34a Abs. 5 Satz 1 PolG NRW).');
    }
    add(arr(pr.warn).length > 0 && !ab.includes('gb'), 'Warnsignale in die Gefährdungsbewertung aufnehmen und an die Sachbearbeitung übergeben.');
    // Vollzug, Betroffener anwesend
    if (x.wv && x.da) {
      add(!['alle', 'heute', 'unm'].includes(h.vorhalt), 'Anhörung zur Wohnungsverweisung mit Vorhalt der Vorwürfe nachholen – solange die Verfügung gilt (§ 28 Abs. 1 VwVfG NRW; OVG NRW 5 A 3548/20).');
      add(h.vorhalt === 'heute' && get(d, 'gsa.frueher') === 'ja', 'Auch die früheren Vorwürfe vorhalten – daran scheiterte die Prognose 2023 vor dem OVG NRW.');
      add(h.vorhalt === 'unm', 'Anhörung nachholen und die Verfügung danach überprüfen; Ergebnis mit Uhrzeit vermerken.');
      add(['alle', 'heute'].includes(h.vorhalt) && !arr(h.fragen).length, 'In der Anhörung auch nach Unterkunft, Arbeit in der Wohnung und Einwänden gegen Dauer und Bereich fragen.');
      add(!pf.includes('bekannt'), 'Verfügung mündlich mit Bereich und Enddatum bekanntgeben (§§ 41, 43 VwVfG NRW).');
      add(!pf.includes('dauer'), 'Über die Verlängerung bei einem Gerichtsantrag unterrichten (§ 34a Abs. 5, 6 PolG NRW).');
      add(!pf.includes('gegenst'), 'Mitnahme dringend benötigter persönlicher Gegenstände ermöglichen (§ 34a Abs. 2 PolG NRW).');
      add(!pf.includes('anschrift'), 'Zur Angabe einer Anschrift oder zustellungsbevollmächtigten Person auffordern (§ 34a Abs. 3 PolG NRW).');
      add(!pf.includes('rechtsschutz'), 'Auf vorläufigen Rechtsschutz beim Verwaltungsgericht hinweisen (§ 80 Abs. 5 VwGO).');
      add(!w.schluessel, 'Schlüssel sicherstellen und bescheinigen oder Schlosstausch besprechen (§ 43 Nr. 1, § 44 Abs. 2 PolG NRW).');
      add(w.schluessel === 'sicher', `Rückgabe der Schlüssel zum Ende des Rückkehrverbots am ${ende} vormerken (§ 46 Abs. 1 PolG NRW).`);
      add(w.zg !== 'ja', 'Zwangsgeld in bestimmter Höhe schriftlich androhen, mit Hinweis auf Ersatzzwangshaft (§§ 53, 54, 56 PolG NRW).');
      add(w.zg === 'ja' && !has(w.zgHoehe), 'Höhe des Zwangsgeldes bestimmt angeben, nicht „bis zu“ (§ 53 PolG NRW).');
      add(w.schrift === 'verweigert', 'Annahme verweigert: Verfügung mit Zwangsgeldandrohung am nächsten Werktag tagsüber erneut zustellen; bis dahin kein Zwangsgeld (§ 5 Abs. 3 LZG NRW).');
      add(!w.schrift || ['wache', 'post', 'offen'].includes(w.schrift), 'Schriftliche Verfügung mit Zwangsgeldandrohung zustellen und Zustellung nachhalten – ohne Zustellung kein Zwangsgeld (§ 56 Abs. 6 PolG NRW).');
      add(w.schrift === 'vorort' && C.nacht(d) && w.erlaubnis !== 'ja', 'Zustellung zur Nachtzeit oder am Sonn-/Feiertag: Erlaubnis der Behördenleitung klären, sonst tagsüber wiederholen (§ 5 Abs. 3 LZG NRW).');
      add(!w.verlassen, 'Festhalten, wie und wann die Person die Wohnung verlassen hat.');
      if (C.zwang(d)) add(get(d, 'zw.androhung') !== 'ja', 'Androhung des unmittelbaren Zwangs vermerken oder Grund, warum sie unterblieb (§ 61 Abs. 1 PolG NRW).');
      if (C.gewahrsam(d)) {
        const g = get(d, 'gew') || {}, er = arr(g.erledigt);
        add(!has(g.grund), 'Tatsachen für die Unerlässlichkeit des Gewahrsams festhalten (§ 35 Abs. 1 Nr. 4 PolG NRW).');
        add(!er.includes('grund'), 'Grund der Freiheitsentziehung bekanntgeben (§ 37 Abs. 1 PolG NRW).');
        add(!er.includes('benachr'), 'Benachrichtigung einer Vertrauensperson ermöglichen (§ 37 Abs. 2 PolG NRW).');
        add(!er.includes('merkblatt'), 'Merkblatt über Rechte und Pflichten aushändigen (§ 5 GewvollzVO NRW).');
        add(!g.richter || g.richter === 'offen', 'Unverzüglich die richterliche Entscheidung herbeiführen; jede Bemühung mit Uhrzeit vermerken (§ 36 Abs. 1 PolG NRW; BVerfG 2 BvR 2292/00).');
        add(bes.includes('betreut'), 'Betreuer vom Gewahrsam benachrichtigen (§ 37 Abs. 2 Satz 4 PolG NRW).');
        add(bes.includes('minder'), 'Minderjährige Person im Gewahrsam: Jugendamt unterrichten (§ 1 Abs. 2 GewvollzVO NRW).');
      }
    }
    // Betroffener abwesend
    if (x.wv && x.weg) {
      add(!a.erreichbar, 'Erreichbarkeit der abwesenden Person klären.');
      add(['telefon', 'ort'].includes(a.erreichbar) && a.anh !== 'ja', 'Erreichbare Person vor der Entscheidung belehren und anhören – sonst fehlt die Anhörung (§ 28 Abs. 1 VwVfG NRW; § 136 StPO).');
      add(a.erreichbar === 'nein', 'Beim Antreffen: belehren, anhören, Verfügung überprüfen und das Ergebnis vermerken.');
      add(a.bekannt !== 'pers' && a.bekannt !== 'tel', 'Rückkehrverbot bekanntgeben – bis dahin wirkt es nicht (§ 43 Abs. 1 VwVfG NRW). Die Mitteilung an der Tür ersetzt die Bekanntgabe nicht.');
      add(a.schrift !== 'pers', 'Schriftliche Verfügung mit Zwangsgeldandrohung aushändigen oder zustellen; Abholung auf der Wache nachhalten (§ 56 Abs. 6 PolG NRW).');
      add(a.schluessel !== 'sicher', 'Schlüssel beim Antreffen sicherstellen und bescheinigen; bis dahin Schlosstausch empfehlen.');
      add(!arr(a.weiter).includes('folge'), 'Folgeschicht beauftragen: Verfügung aushändigen, Wohnung kontrollieren.');
    }
    if (x.wv) {
      add(!ab.includes('kontrolle'), `Kontrolle des Rückkehrverbots vormerken: mindestens einmal bis ${ende}, möglichst in den ersten drei Tagen (§ 34a Abs. 7 PolG NRW).`);
      add(!ab.includes('folge'), 'Folgeschichten über das laufende Rückkehrverbot informieren.');
      o.push(`Fristende ${ende} und mögliche Verlängerung bis ${fmtDate(x.max)} vormerken; nach der Mitteilung des Gerichts beide Personen über die Dauer unterrichten (§ 34a Abs. 6 PolG NRW).`);
      o.push('Bei jeder neuen Erkenntnis neu bewerten; fällt die Gefahr weg, Verfügung aufheben (§ 34a Abs. 5 Satz 3 PolG NRW).');
    }
    add(C.wvNein(d) && !w.grund, 'Gründe für das Absehen von der Wohnungsverweisung festhalten.');
    add(!w.angeordnet, 'Über die Wohnungsverweisung entscheiden und die Entscheidung begründen.');
    // Strafverfahren
    add(!arr(s.delikte).length, 'Strafanzeige von Amts wegen fertigen und Delikte benennen (§ 163 StPO).');
    add(get(d, 'einsatz.meldeweg') === 'leitstelle' && !bw.includes('notruf'), 'Sicherung der Notrufaufzeichnung veranlassen.');
    add(bw.includes('bodycam'), 'Bodycam: vor jeder Verwendung die richterliche Feststellung der Rechtmäßigkeit beantragen; über die Sicherung binnen zwei Wochen entscheiden (§ 15c Abs. 4, 6 PolG NRW).');
    add(bw.includes('handy') || bw.includes('tatmittel'), 'Bei Widerspruch gegen die Sicherstellung: gerichtliche Bestätigung binnen drei Tagen beantragen (§ 98 Abs. 2 StPO).');
    add(!get(d, 'gsa.antrag'), 'Strafantrag: gestellt oder nicht – mit Gründen festhalten.');
    add(bes.includes('waffen'), 'Waffenbesitz prüfen; Mitteilung an die Waffenbehörde (§ 6a Abs. 2 WaffG).');
    add(bes.includes('betreut'), 'Betreuer ermitteln und beteiligen; Verfügung auch ihm bekanntgeben (§ 12 Abs. 2 VwVfG NRW).');
    add(bes.includes('psych'), 'Ordnungsbehörde für die Prüfung einer Unterbringung einschalten (§ 14 PsychKG NRW).');
    add(bes.includes('minder'), 'Minderjährige beschuldigte Person: Erziehungsberechtigte bzw. geeignete volljährige Person unterrichten (§ 67a JGG); Jugendamt.');
    // Opferschutz
    add(!os.includes('gewschg'), 'Auf zivilgerichtlichen Schutz nach dem Gewaltschutzgesetz hinweisen (§ 34a Abs. 4 PolG NRW; § 406j StPO).');
    add(!os.includes('beratung'), 'Beratungsstelle benennen und Beratung nahelegen (§ 34a Abs. 4 PolG NRW).');
    add(!os.includes('daten'), 'Weitergabe der Kontaktdaten an die Beratungsstelle anbieten (§ 34a Abs. 4 PolG NRW).');
    add(os.includes('daten') && !get(d, 'os.einwilligung'), 'Einwilligung oder Ablehnung der Datenweitergabe vermerken.');
    add(get(d, 'os.einwilligung') === 'ja', 'Kontaktdaten an die Beratungsstelle übermitteln.');
    add(!os.includes('doku'), 'Kopie der Einsatzdokumentation aushändigen – auch ohne Wohnungsverweisung.');
    add(!os.includes('stpo'), 'Über die Rechte nach §§ 406i, 406j StPO unterrichten.');
    // Abschluss
    add(!ab.includes('gb'), 'Gefährdungsbewertung nach der geltenden Erlasslage fertigen.');
    add(!ab.includes('abgleich'), 'Anzeige, Verfügung und Einsatzdokumentation auf Widersprüche abgleichen (OVG NRW 5 E 1202/14).');
    return [...new Set(o)];
  }

  /* ---------- Personalien (gesondert) ---------- */
  function personalien(d) {
    const rows = [];
    const fmtP = (label, p, extra = []) => { p = p || {}; rows.push(`${label}: ${[[str(p.nachname).toUpperCase(), str(p.vorname)].filter(Boolean).join(', ') || PH('Name'), has(p.geb) ? 'geb. ' + fmtDate(p.geb) : '', { m: 'männlich', w: 'weiblich', d: 'divers' }[p.geschlecht] || '', str(p.anschrift), has(p.tel) ? 'Tel. ' + str(p.tel) : '', ...extra].filter(Boolean).join(' · ')}`); };
    fmtP('Geschädigte/r', get(d, 'gs'));
    fmtP('Beschuldigte/r', get(d, 'bs'), [C.bsWeg(d) ? 'nicht angetroffen' : '', has(get(d, 'wv.anschrift')) && C.bsDa(d) ? 'Zustellung: ' + slot(get(d, 'wv.anschrift')) : '']);
    if (C.kinderDa(d)) arr(get(d, 'kinder')).filter(hasObj).forEach((c, i) => rows.push(`Kind ${i + 1}: ${[str(c.vorname) || PH('Vorname'), has(c.alter) ? c.alter + ' J.' : ''].filter(Boolean).join(' · ')}`));
    if (get(d, 'zg.vorhanden') === 'ja') arr(get(d, 'zeugen')).filter(hasObj).forEach((z, i) => fmtP('Z ' + N2(i + 1), z.p));
    return rows.join('\n');
  }
  function title(d) {
    const o = get(d, 'ort') || {};
    return ['HG', P(str(o.strasse), str(o.hausnr)), str(o.stadt), fmtDate(get(d, 'einsatz.datum'))].filter(has).join(' · ') || 'Häusliche Gewalt';
  }
  function subtitle(d) {
    const a = C.wvJa(d) ? (C.bsDa(d) ? 'Wohnungsverweisung' : 'Rückkehrverbot') + ' bis ' + fmtDate(C.wvEnde(d)) : C.wvNein(d) ? 'ohne § 34a' : '';
    const n = offen(d).length;
    return [a, C.bsWeg(d) ? 'nicht angetroffen' : '', n ? `${n} offen` : ''].filter(Boolean).join(' · ');
  }

  root.WHG = Object.freeze({
    id: 'hg', name: 'Häusliche Gewalt', short: 'Häusliche Gewalt', kurz: 'HG',
    desc: 'Sachverhalt, Begründung § 34a, Kurzfassung, Liste „Noch zu erledigen“',
    labels: {
      bericht: 'Sachverhalt', kurz: 'Kurzfassung', offen: 'Noch zu erledigen', newBtn: 'Häusliche Gewalt',
      kurzHint: 'Für die Kurzbeschreibung im Vorgang.',
      offenHint: 'Was nach Gesetz und Handlungsanweisung noch fehlt – jeweils mit Norm. Angehakte Punkte landen als Todos im Planner.',
      offenEmpty: 'Alle abgefragten Pflichtpunkte sind erledigt. Der Erlass vom 01.03.2024 und Dienstanweisungen deiner Behörde gehen vor.',
      persHint: 'Gesondert vom Sachverhalt. Eine Schutzanschrift der geschädigten Person gehört weder hierher noch in die Akte.'
    },
    steps: root.WHG_STEPS, text, plain, preview, kurzText: kurz, fahndung: () => '', offen, personalien, title, subtitle, begruendung, ctx,
    extraTabs: [{ k: 'begr', l: 'Begründung § 34a', when: C.wvJa, hint: 'Für die schriftliche Bestätigung der Verfügung: Anordnung, Sachverhalt, Anhörung, Prognose, Ermessen. Spricht von „gefährdeter Person“ und „Betroffenem“. Vor der Übernahme gegenlesen.', text: begruendung }]
  });
})(typeof window !== 'undefined' ? window : globalThis);
