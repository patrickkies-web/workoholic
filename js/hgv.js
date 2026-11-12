/*
 * Workoholic · Modul „Häusliche Gewalt“ (nach der Vorlage)
 * ---------------------------------------------------------------
 * Nur das, was für häusliche Gewalt eigen ist – Einsatzanlass („Allgemeines“) und Schilderungen (mit Belehrung,
 * Verletzungen, Rettungswagen, Strafantrag) sind eigene Module im Bereich Schreiben.
 * Abschnitte wie in der Vorlage: 2 Eintreffsituation · 4 Maßnahmen gegenüber der geschädigten Person ·
 * 5 Maßnahmen gegenüber der beschuldigten Person · 6 Gefahrenprognose · 7 Maßnahmen/Sonstiges (Nummern änderbar).
 * Eingabe über Chips, wenige Textfelder; der Text entsteht live. Textlogik ohne DOM, in Node testbar.
 * Fachlich: § 34a PolG NRW (Wohnungsverweisung und Rückkehrverbot – 14 Tage seit 13.12.2025).
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const str = v => (v == null ? '' : String(v)).trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  const joinUnd = a => (a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const ohnePunkt = s => str(s).replace(/[.]+$/, '');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ZAHL = ['kein', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankT = t => str(t && t.rank) || (arr(t && t.roles).map(str).find(r => RANK_RE.test(r)) || '');
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); return t.length < 2 ? n : t[t.length - 1]; };

  /* ======================= Rollen und Formen ======================= */
  const GS = { w: { nom: 'die Geschädigte', dat: 'der Geschädigten', akk: 'die Geschädigte', gen: 'der Geschädigten' }, m: { nom: 'der Geschädigte', dat: 'dem Geschädigten', akk: 'den Geschädigten', gen: 'des Geschädigten' } };
  const BS = { m: { nom: 'der Beschuldigte', dat: 'dem Beschuldigten', akk: 'den Beschuldigten', gen: 'des Beschuldigten' }, w: { nom: 'die Beschuldigte', dat: 'der Beschuldigten', akk: 'die Beschuldigte', gen: 'der Beschuldigten' } };
  const PRO = { w: { er: 'sie', Er: 'Sie', ihm: 'ihr', ihn: 'sie', sein: 'ihr' }, m: { er: 'er', Er: 'Er', ihm: 'ihm', ihn: 'ihn', sein: 'sein' } };
  /** Formen der geschädigten (gs) bzw. beschuldigten (bs) Person – Standard: Frau / Mann. */
  function P(data, wer) {
    const g = getPath(data, wer + '.g') === (wer === 'gs' ? 'm' : 'w') ? (wer === 'gs' ? 'm' : 'w') : (wer === 'gs' ? 'w' : 'm');
    const f = (wer === 'gs' ? GS : BS)[g], p = PRO[g];
    return { ...f, Nom: cap(f.nom), Dat: cap(f.dat), ...p, g };
  }
  const poss = (x, endung) => x.sein + endung; // „seine“ / „ihre“, „seinen“ / „ihren“ …

  /* ======================= Auswahllisten ======================= */
  const ERWARTET = [['tuer', 'An der Wohnungstür'], ['haus', 'Vor dem Haus'], ['nein', 'Nicht erwartet']];
  const OEFFNET = [['gs', 'Geschädigte Person'], ['bs', 'Beschuldigte Person'], ['kind', 'Ein Kind'], ['offen', 'Tür stand offen']];
  const WIRKT = [['aufgeloest', 'aufgelöst'], ['veraengstigt', 'verängstigt'], ['eingeschuechtert', 'eingeschüchtert'], ['nervoes', 'nervös'], ['verstoert', 'verstört'], ['aufgebracht', 'aufgebracht'], ['erschoepft', 'erschöpft'], ['gefasst', 'gefasst'], ['ruhig', 'ruhig']];
  const GEBAEUDE = [['mfh', 'Mehrfamilienhaus', 'ein Mehrfamilienhaus'], ['efh', 'Einfamilienhaus', 'ein Einfamilienhaus'], ['dhh', 'Doppelhaushälfte', 'eine Doppelhaushälfte'], ['rh', 'Reihenhaus', 'ein Reihenhaus']];
  const ETAGE = [['eg', 'EG'], ['1', '1. OG'], ['2', '2. OG'], ['3', '3. OG'], ['4', '4. OG'], ['5', '5. OG'], ['dg', 'DG'], ['ug', 'Souterrain']];
  const LAGE = [['links', 'links'], ['rechts', 'rechts'], ['mitte', 'Mitte']];
  const ZUSTAND = [['aufgeraeumt', 'aufgeräumt'], ['unaufgeraeumt', 'unaufgeräumt'], ['verschmutzt', 'stark verschmutzt'], ['verwahrlost', 'verwahrlost']];
  const SPUREN = [['moebel', 'umgestoßene Möbel'], ['scherben', 'Scherben auf dem Boden'], ['gegenst', 'beschädigte Gegenstände'], ['tuer', 'eine beschädigte Tür'], ['blut', 'Blutspuren']];
  const KIND_ART = [['gemeinsam', 'Gemeinsame Kinder'], ['gs', 'Kinder der geschädigten Person'], ['bs', 'Kinder der beschuldigten Person']];
  /** Hinweise an die geschädigte Person (Vorlage Abschnitt 4). */
  const OPFER = [['erl', 'Vorgehen der Polizei erläutert'], ['schutz', 'Schutzanordnung (Amtsgericht) eröffnet'], ['verl', 'Verlängerung bei Antrag erklärt'], ['hilfe', 'Hilfsangebote (Hilfetelefon …)'], ['rueck', 'Handlungsempfehlungen bei Rückkehr'], ['daten', 'Einwilligung: Daten an Beratungsstelle']];
  const OPFER_STD = ['erl', 'schutz', 'hilfe', 'rueck'];
  /** Inhalt der mündlichen Anordnung (Vorlage Abschnitt 5). */
  const INHALT = [['ort', 'Örtlichkeit beschrieben', 'der Beschreibung der Örtlichkeit'], ['zeit', 'Zeitrahmen genannt', 'dem Zeitrahmen'], ['recht', 'Rechtsgrundlage genannt', 'der Rechtsgrundlage'], ['gew', 'Ingewahrsamnahme angekündigt', 'dem Hinweis auf die Möglichkeit einer Durchsetzung durch Ingewahrsamnahme']];
  /** Gefahrenprognose: Umstände → Sätze (Vorlage Abschnitt 6 und Hinweise im Kommentar). */
  const PROG = [
    ['Vorgeschichte', [
      ['wiederholt', 'Wiederholte Gewalt (nach Angaben)', (G, B) => `Nach Angaben ${G.gen} ist es bereits in der Vergangenheit wiederholt zu Gewalt durch ${B.akk} gekommen.`],
      ['vorerk', 'Polizeiliche Vorerkenntnisse HG', (G, B) => `Zu ${B.dat} liegen polizeiliche Vorerkenntnisse wegen häuslicher Gewalt vor.`],
      ['verstoss', 'Frühere Verstöße (Rückkehrverbot, Schutzanordnung)', (G, B) => `${cap(B.er)} hat bereits früher gegen ein Rückkehrverbot bzw. eine gerichtliche Schutzanordnung verstoßen.`],
      ['schutzanordnung', 'Gerichtliche Schutzanordnung besteht', () => 'Eine gerichtliche Schutzanordnung besteht bereits.']
    ]],
    ['Tat', [
      ['intensitaet', 'Hohe Intensität, erhebliche Verletzungen', () => 'Die Intensität des Angriffs und das Verletzungsbild lassen auf eine erhebliche Gewaltbereitschaft schließen.'],
      ['hals', 'Angriff gegen den Hals', (G) => `Der Angriff richtete sich gegen den Hals ${G.gen}; ein solcher Angriff kann lebensbedrohlich sein und kennzeichnet eine besondere Gefährlichkeit.`],
      ['waffe', 'Waffe / gefährlicher Gegenstand', () => 'Bei der Tat wurde ein gefährlicher Gegenstand eingesetzt bzw. damit gedroht.'],
      ['drohung', 'Drohung mit weiterer Gewalt', (G, B) => `${cap(B.er)} drohte ${G.dat} weitere Gewalt an.`],
      ['kinderAnw', 'Kinder waren bei der Tat anwesend', (G, B) => `Die Anwesenheit der Kinder hielt ${B.ihn} nicht von der Tatausführung ab, was ${poss(B, 'e')} Skrupellosigkeit unterstreicht.`]
    ]],
    ['Person', [
      ['legitim', 'Sieht Gewalt als legitimes Mittel', (G, B) => `${cap(poss(B, ''))} Verhalten sowie ${poss(B, 'e')} Äußerungen deuten darauf hin, dass ${B.er} Gewalt als legitimes Mittel betrachtet, ${G.dat} aufzuzeigen, wie ${G.er} zu leben hat.`],
      ['uneinsichtig', 'Uneinsichtig, aggressiv', (G, B) => `${cap(B.er)} zeigte sich gegenüber den eingesetzten Beamten uneinsichtig und aggressiv.`],
      ['rausch', 'Alkohol / Drogen begünstigen', () => 'Der Konsum von Alkohol bzw. anderen berauschenden Mitteln begünstigte das Tatgeschehen und erhöht die Gefahr weiterer Übergriffe.'],
      ['kontrolle', 'Eifersucht, Kontrollverhalten', (G, B) => `Nach Angaben ${G.gen} zeigt ${B.er} ein ausgeprägtes Eifersuchts- und Kontrollverhalten.`]
    ]],
    ['Lage', [
      ['naehe', 'Familie / Kinder: wird die Nähe suchen', (G, B) => `Aufgrund der familiären Strukturen${'{K}'} ist davon auszugehen, dass ${B.er} die Nähe zu ${G.dat}${'{KN}'} suchen wird.`],
      ['trennung', 'Trennungssituation', (G) => `${cap(G.nom)} beabsichtigt, sich zu trennen; Trennungssituationen gehen erfahrungsgemäß mit einem erhöhten Risiko weiterer Gewalt einher.`],
      ['wohnung', 'Sachschäden in der Wohnung', () => 'Die Sachschäden in der Wohnung zeugen von einer erheblichen Aggression.']
    ]]
  ];
  const PROG_ALL = PROG.flatMap(([, items]) => items);
  const SONST_KIND = [['ueberfordert', 'sichtlich überfordert mit der Situation'], ['eingeschuechtert', 'eingeschüchtert'], ['veraengstigt', 'verängstigt'], ['nervoes', 'nervös'], ['ruhig', 'ruhig']];
  const ABSCHNITTE = [['ein', 'Eintreffsituation', '2'], ['gs', 'Maßnahmen gegenüber der geschädigten Person', '4'], ['bs', 'Maßnahmen gegenüber der beschuldigten Person', '5'], ['prog', 'Gefahrenprognose', '6'], ['sonst', 'Maßnahmen/Sonstiges', '7']];

  /* ======================= Text ======================= */
  const kinderN = d => { const n = Number(getPath(d, 'kinder.n')); return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 0; };
  const wvArt = d => getPath(d, 'bsm.wv') || '';
  const dauer = d => (getPath(d, 'bsm.dauer') === 'kuerzer' ? 'kuerzer' : '14');

  /** 2 Eintreffsituation */
  function eintreffen(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), e = d.ein || {}, o = d.ort || {}, t = [];
    let gsGenannt = false;
    if (e.erw === 'tuer' || e.erw === 'haus') { t.push(`Bei unserem Eintreffen wurden wir von ${G.dat} ${e.erw === 'tuer' ? 'an der Wohnungstür' : 'vor dem Wohnhaus'} erwartet.`); gsGenannt = true; }
    const hinein = e.hinein ? ' und bat uns hinein' : '';
    if (e.oeff === 'gs') { t.push(`${gsGenannt ? G.Er : G.Nom} öffnete die Tür der Wohnung${hinein}.`); gsGenannt = true; }
    else if (e.oeff === 'bs') t.push(`${B.Nom} öffnete die Tür der Wohnung${hinein}.`);
    else if (e.oeff === 'kind') t.push(`Ein Kind öffnete die Tür der Wohnung${hinein}.`);
    else if (e.oeff === 'offen') t.push('Die Wohnungstür stand offen.');
    const wirk = WIRKT.filter(([k]) => arr(e.wirk).includes(k)).map(x => x[1]);
    const wirkFrei = ohnePunkt(e.wirkText);
    if (wirk.length || e.weint || wirkFrei) {
      const wer = gsGenannt ? G.Er : G.Nom;
      const teile = [];
      if (wirk.length) teile.push(`wirkte ${joinUnd(wirk)}`);
      if (e.weint) teile.push('weinte');
      if (wirkFrei) teile.push(wirkFrei);
      t.push(`${wer} ${joinUnd(teile)}.`); gsGenannt = true;
    }
    if (has(e.sicht)) t.push(`Bereits beim Eintreffen war bei ${gsGenannt ? G.ihm : G.dat} erkennbar: ${ohnePunkt(e.sicht)}.`);
    if (e.bsDa === 'weg') t.push(`${B.Nom} war zum Zeitpunkt der Sachverhaltsaufnahme nicht mehr vor Ort. Auf Nachfrage gab ${G.nom} an, dass ${B.nom} die Wohnung vor dem Eintreffen der Beamten verlassen habe.`);
    else if (e.bsDa === 'da') t.push(`${B.Nom} war zum Zeitpunkt der Sachverhaltsaufnahme ebenfalls in der gemeinsamen Wohnung und wurde dort getrennt von ${G.dat} zum Sachverhalt befragt.`);
    // Tatort
    const ort = [];
    if (has(d.fam) || has(o.str) || o.art) {
      ort.push(`Bei dem Tatort handelt es sich um ${o.art && o.art !== 'mfh' ? 'das Wohnhaus' : 'die Wohnung'} der Familie ${str(d.fam) || '[Name]'}.`);
      const geb = GEBAEUDE.find(([k]) => k === o.art);
      ort.push(`Bei dem Wohnhaus handelt es sich um ${geb ? geb[2] : '[Gebäudeart]'} an der Anschrift ${str(o.str) || '[Straße Hausnummer]'}, in ${str(o.plz) || '[PLZ Ort]'}.`);
      if (o.art === 'mfh') {
        const et = o.etage === 'eg' ? 'im Erdgeschoss' : o.etage === 'dg' ? 'im Dachgeschoss' : o.etage === 'ug' ? 'im Souterrain' : has(o.etage) ? `im ${o.etage}. Obergeschoss` : 'im [Geschoss]';
        const lage = LAGE.find(([k]) => k === o.lage);
        ort.push(`Die Wohnung der Familie befindet sich ${et}${lage ? (lage[0] === 'mitte' ? ' in der Mitte' : ' ' + lage[1]) : ''}.`);
      }
    }
    const zust = ZUSTAND.find(([k]) => k === o.zustand);
    if (zust) ort.push(`Die Wohnung wirkte ${zust[1]}.`);
    const sp = SPUREN.filter(([k]) => arr(o.spuren).includes(k)).map(x => x[1]);
    if (sp.length) ort.push(`Es waren Spuren einer Auseinandersetzung erkennbar: ${joinUnd(sp)}.`);
    if (has(o.text)) ort.push(ohnePunkt(o.text) + '.');
    // Kinder
    const k = d.kinder || {};
    if (k.n === 0 || k.n === '0') ort.push('Kinder leben nicht im Haushalt.');
    else if (kinderN(d)) {
      const n = kinderN(d), lebt = k.bsLebt === 'nein' ? '' : ` und ${B.dat}`;
      const art = k.art === 'gs' ? (n === 1 ? `Kind ${G.gen}` : `Kinder ${G.gen}`) : k.art === 'bs' ? (n === 1 ? `Kind ${B.gen}` : `Kinder ${B.gen}`) : (n === 1 ? 'gemeinsames Kind' : 'gemeinsame Kinder');
      ort.push(`${o.art && o.art !== 'mfh' ? 'Im Haushalt' : 'In der Wohnung'} leben neben ${G.dat}${lebt} ${n === 1 ? 'ein Kind' : ZAHL[n] + ' Kinder'}${has(k.alter) ? ` (${art}: ${ohnePunkt(k.alter)} J.)` : k.art ? ` (${art})` : ''}.`);
    }
    return [t.join(' '), ort.join(' ')].filter(Boolean).join('\n');
  }

  /** 4 Maßnahmen gegenüber der geschädigten Person */
  function opferText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), h = arr(getPath(d, 'gsm.h')), t = [], wv = ['wvrv', 'rv'].includes(wvArt(d));
    if (h.includes('erl')) t.push(`${G.Dat} wurde das Vorgehen der Polizei bei der Annahme einer häuslichen Gewalt erläutert.`);
    if (h.includes('schutz')) t.push(`Die Möglichkeit der Beantragung einer Schutzanordnung nach dem Gewaltschutzgesetz bei dem zuständigen Amtsgericht wurde ${t.length ? G.ihm : G.dat} eröffnet.`);
    if (h.includes('verl') && wv) t.push(`${G.Er} wurde darauf hingewiesen, dass ein solcher Antrag während der Dauer des Rückkehrverbots dieses bis zur gerichtlichen Entscheidung verlängern kann.`);
    const hilfe = h.includes('hilfe'), rueck = h.includes('rueck') && wv;
    const zudem = t.length ? `Zudem wurden ${G.ihm}` : `${G.Dat} wurden`;
    if (hilfe && rueck) t.push(`${zudem} Hilfsangebote von Opferschutzstellen wie z. B. dem Hilfetelefon aufgezeigt sowie Handlungsempfehlungen gegeben, sollte ${B.nom} trotz Rückkehrverbot die gemeinsame Wohnung aufsuchen.`);
    else if (hilfe) t.push(`${zudem} Hilfsangebote von Opferschutzstellen wie z. B. dem Hilfetelefon aufgezeigt.`);
    else if (rueck) t.push(`${t.length ? G.Er : G.Nom} erhielt Handlungsempfehlungen für den Fall, dass ${B.nom} trotz Rückkehrverbot die gemeinsame Wohnung aufsucht.`);
    if (h.includes('daten')) t.push(`${t.length ? G.Er : G.Nom} willigte ein, dass ${poss(G, 'e')} Kontaktdaten an eine Beratungsstelle weitergegeben werden.`);
    if (has(getPath(d, 'gsm.text'))) t.push(ohnePunkt(getPath(d, 'gsm.text')) + '.');
    return t.join(' ');
  }

  /** 5 Maßnahmen gegenüber der beschuldigten Person */
  function taeterText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), m = d.bsm || {}, t = [], art = wvArt(d);
    const dauerTxt = dauer(d) === 'kuerzer' ? `ein Rückkehrverbot bis einschließlich ${has(m.ende) ? fmtDatum(m.ende) : '[Datum]'}` : 'ein 14-tägiges Rückkehrverbot';
    if (m.erkl) t.push(`Das polizeiliche Handeln bei dem Vorliegen einer häuslichen Gewalt wurde ${B.dat} zuvor erklärt.`);
    let erGenannt = !!m.erkl;
    if (art === 'wvrv') {
      const reakt = m.reakt === 'halten' ? ' und gab an, die Maßnahmen verstanden zu haben und sich an das Rückkehrverbot halten zu wollen' : m.reakt === 'verstanden' ? ' und gab an, die Maßnahmen verstanden zu haben' : m.reakt === 'widerspruch' ? ' und widersprach den Maßnahmen' : '';
      t.push(`${erGenannt ? B.Er : B.Nom} erhielt eine Wohnungsverweisung und ${dauerTxt} (§ 34a PolG NRW)${reakt}.`); erGenannt = true;
    } else if (art === 'rv') {
      t.push(`Gegen ${B.akk} wurde ${dauerTxt} angeordnet (§ 34a PolG NRW).`); erGenannt = true;
      if (m.bekannt === 'tel') t.push(`Das Rückkehrverbot wurde ${B.ihm} telefonisch bekanntgegeben.`);
      else if (m.bekannt === 'pers') t.push(`Das Rückkehrverbot wurde ${B.ihm} persönlich bekanntgegeben.`);
      else if (m.bekannt === 'nein') t.push(`Das Rückkehrverbot konnte ${B.ihm} noch nicht bekanntgegeben werden.`);
    } else if (art === 'keine') {
      t.push(`Von einer Wohnungsverweisung mit Rückkehrverbot wurde abgesehen${has(m.keinGrund) ? ', weil ' + ohnePunkt(m.keinGrund) : ''}.`);
    }
    if (art === 'wvrv' || art === 'rv') {
      if (has(m.reaktText)) t.push(`${B.Er} äußerte, ${ohnePunkt(m.reaktText)}.`);
      const inh = INHALT.filter(([k]) => arr(m.inh).includes(k)).map(x => x[2]);
      if (inh.length) {
        const wie = art === 'rv' && m.bekannt === 'tel' ? 'telefonisch' : 'mündlich';
        const liste = inh.length === 1 ? inh[0] : inh.slice(0, -1).join(', ') + ' sowie mit ' + inh[inh.length - 1];
        t.push(`Die benannten Anordnungen erfolgten ${wie}, mit ${liste}.`);
      }
      if (has(m.zg)) t.push(`Die Androhung eines Zwangsgeldes i. H. v. ${fmtEuro(m.zg)} ist erfolgt.`);
      if (m.gegenst) t.push(`${B.Dat} wurde die Gelegenheit gegeben, dringend benötigte Gegenstände des persönlichen Bedarfs mitzunehmen.`);
      // Schlüssel
      if (m.schl) {
        t.push(`Zudem wurde ${B.nom} dazu aufgefordert, ${poss(B, 'en')} Wohnungsschlüssel auszuhändigen.`);
        if (m.schl === 'mit') t.push(`${B.Er} führte einen Schlüssel für die gemeinsame Wohnung mit sich. Der Schlüssel wurde an ${G.akk} übergeben.`);
        else if (m.schl === 'ohne') {
          if (m.durchs) t.push(`${B.Er} gab an, keinen mitzuführen, und wurde ${has(m.durchsVon) ? 'von ' + str(m.durchsVon) + ' ' : ''}mit ${poss(B, 'er')} Zustimmung nach dem Schlüssel durchsucht${m.gefunden === 'ja' ? '. Dabei wurde ein Schlüssel aufgefunden und an ' + G.akk + ' übergeben' : '. Ein Schlüssel wurde dabei nicht aufgefunden'}.`);
          else t.push(`${B.Er} gab an, keinen Schlüssel mit sich zu führen.`);
        }
      }
      // Aufenthalt / Zustellung
      if (m.auf === 'anschrift') t.push(`${B.Er} gab gegenüber den Beamten an, sich für den Zeitraum des Rückkehrverbots an folgender Anschrift aufzuhalten: ${str(m.aufStr) || '[Straße Hausnummer]'}, in ${str(m.aufPlz) || '[PLZ Ort]'}.`);
      else if (m.auf === 'zbv') t.push(`${B.Er} benannte als zustellungsbevollmächtigte Person ${str(m.zbv) || '[Name, Anschrift]'}.`);
      else if (m.auf === 'keine') t.push(`${B.Er} gab gegenüber den Beamten nicht an, wo ${B.er} sich für die Zeit der Wohnungsverweisung aufhalten werde. Eine zustellungsbevollmächtigte Person wurde nicht benannt, sodass ${B.dat} mitgeteilt wurde, dass ein ausgefertigtes Exemplar der schriftlichen Bestätigung der mündlichen Polizeiverfügung ${has(m.wache) ? 'in ' + str(m.wache) : 'in [Dienststelle]'} hinterlegt wird.`);
    }
    if (has(m.text)) t.push(ohnePunkt(m.text) + '.');
    return t.join(' ');
  }

  /** 6 Gefahrenprognose */
  function prognoseText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), pr = d.prog || {}, sel = arr(pr.f), t = [];
    const kn = kinderN(d) > 0, gemeinsam = (getPath(d, 'kinder.art') || 'gemeinsam') === 'gemeinsam';
    for (const k of sel) {
      const item = PROG_ALL.find(x => x[0] === k); if (!item) continue;
      if (k === 'kinderAnw' && !kn) continue;
      let s = item[2](G, B);
      s = s.replace('{K}', kn ? (gemeinsam ? ' und der gemeinsamen Kinder' : ' und der Kinder im Haushalt') : '').replace('{KN}', kn ? ' und den Kindern' : '');
      t.push(s);
    }
    if (has(pr.text)) t.push(ohnePunkt(pr.text) + '.');
    if (pr.schluss !== false && (t.length || sel.length)) t.push(`Es ist davon auszugehen, dass es zu weiteren gleichgelagerten Delikten, ausgehend von ${B.dat}, kommen wird, sollten keine gerichtlichen Verfügungen von ${G.dat} erwirkt werden.`);
    return t.join(' ');
  }

  /** 7 Maßnahmen/Sonstiges */
  function sonstText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), s = d.sonst || {}, t = [];
    if (kinderN(d)) {
      const z = SONST_KIND.filter(([k]) => arr(s.kind).includes(k)).map(x => x[1]);
      const wer = (getPath(d, 'kinder.art') || 'gemeinsam') === 'gemeinsam' ? 'Die gemeinsamen Kinder' : getPath(d, 'kinder.art') === 'bs' ? `Die Kinder ${B.gen}` : `Die Kinder ${G.gen}`;
      const einKind = kinderN(d) === 1;
      const werE = einKind ? (wer === 'Die gemeinsamen Kinder' ? 'Das gemeinsame Kind' : wer.replace('Die Kinder', 'Das Kind')) : wer;
      if (z.length) {
        const ueber = z.filter(x => x.startsWith('sichtlich')), rest = z.filter(x => !x.startsWith('sichtlich'));
        if (ueber.length && rest.length) t.push(`${werE} ${einKind ? 'wirkte' : 'wirkten'} sichtlich überfordert mit der Situation, ${einKind ? 'es war' : 'sie waren'} ${joinUnd(rest)}.`);
        else t.push(`${werE} ${einKind ? 'wirkte' : 'wirkten'} ${joinUnd(z)}.`);
      }
      if (s.schlafen) t.push(`${werE} ${einKind ? 'schlief' : 'schliefen'} während des Einsatzes.`);
      if (s.weiter === 'anregen') t.push(`Der Sachverhalt sollte an die entsprechenden Stellen weitergeleitet werden, um ihn mit ${G.dat} und besonders mit ${einKind ? 'dem Kind' : 'den Kindern'} aufzuarbeiten.`);
      else if (s.weiter === 'ja') t.push(`Das Jugendamt wurde ${has(s.weiterWie) ? ohnePunkt(s.weiterWie) : 'über den Sachverhalt informiert'}.`);
    }
    if (s.doku) t.push(`Das Dokument „Häusliche Gewalt – Dokumentation über den Polizeieinsatz bei häuslicher Gewalt“ wurde ${s.dokuAn === 'gs' ? G.dat : B.dat} ${s.dokuAn === 'gs' ? 'ausgehändigt' : 'zugestellt'}.`);
    if (s.best === 'zugestellt') t.push(`Die schriftliche Bestätigung der mündlichen Polizeiverfügung wurde ${B.dat} zugestellt.`);
    else if (s.best === 'nieder') t.push(`Der Vordruck „Benachrichtigung über die Niederlegung eines Schriftstückes“ ist für ${B.akk} gut sichtbar an der Wohnungstür hinterlassen worden.`);
    if (s.ga === 'durch') t.push(`Eine Gefährderansprache wurde bei ${B.dat} durchgeführt. Hierzu wurde das Formular „Gefährderansprache“ gefertigt, welches dem Vorgang beiliegt.`);
    else if (s.ga === 'veranl') t.push(`Die Durchführung einer Gefährderansprache bei ${B.dat} wurde veranlasst.`);
    if (has(s.text)) t.push(ohnePunkt(s.text) + '.');
    return t.join(' ');
  }

  const fmtDatum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const fmtEuro = v => { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n.toLocaleString('de-DE') + ' €' : str(v); };
  const TEXTE = { ein: eintreffen, gs: opferText, bs: taeterText, prog: prognoseText, sonst: sonstText };
  const nrOf = (d, k) => { const v = getPath(d, 'nr.' + k); return v === undefined ? ABSCHNITTE.find(a => a[0] === k)[2] : str(v).replace(/[^\d.]/g, '').replace(/\.+$/, ''); };
  /** Überschrift mit Rolle in der passenden Form: „Maßnahmen gegenüber der Geschädigten“. */
  function titel(d, k) {
    if (k === 'gs') return `Maßnahmen gegenüber ${P(d, 'gs').dat}`;
    if (k === 'bs') return `Maßnahmen gegenüber ${P(d, 'bs').dat}`;
    return ABSCHNITTE.find(a => a[0] === k)[1];
  }
  function abschnitt(d, k) {
    const nr = nrOf(d, k), body = TEXTE[k](d);
    return `${nr ? nr + ' ' : ''}${titel(d, k)}\n${body || '[noch nichts erfasst]'}`;
  }
  const paket = d => ABSCHNITTE.map(([k]) => abschnitt(d, k)).join('\n\n');

  /* ======================= Pflichtangaben ======================= */
  function offen(d) {
    const m = [], b = d.bsm || {}, art = wvArt(d);
    if (!getPath(d, 'ein.bsDa')) m.push('Beschuldigte Person vor Ort?');
    if (!has(d.fam)) m.push('Familienname (Tatort)');
    if (!has(getPath(d, 'ort.str'))) m.push('Anschrift des Tatorts');
    if (!art) m.push('Wohnungsverweisung / Rückkehrverbot');
    if (art === 'wvrv' || art === 'rv') {
      if (!has(b.zg)) m.push('Zwangsgeld angedroht?');
      if (!b.auf) m.push('Aufenthalt / Zustellung');
      if (b.auf === 'keine' && !has(b.wache)) m.push('Dienststelle für die Hinterlegung');
      if (!arr(getPath(d, 'prog.f')).length && !has(getPath(d, 'prog.text'))) m.push('Gefahrenprognose');
    }
    if (kinderN(d) && !arr(getPath(d, 'sonst.kind')).length && !getPath(d, 'sonst.schlafen')) m.push('Zustand der Kinder');
    return m;
  }

  function title(d) { const f = str(d && d.fam); return f ? `Häusliche Gewalt – Familie ${f}` : 'Häusliche Gewalt'; }
  function subtitle(d) { const s = str(getPath(d, 'ort.str')); const a = wvArt(d); return [s || 'Tatort offen', a === 'wvrv' ? 'Wohnungsverweisung' : a === 'rv' ? 'Rückkehrverbot' : a === 'keine' ? 'ohne § 34a' : '§ 34a offen'].join(' · '); }
  function pill(d) { const n = offen(d).length; return n ? `${n} offen` : 'bereit'; }

  /* ======================= Maske ======================= */
  const V = { id: null, s: 'mask', focus: '', guide: '' };
  const $ = s => document.querySelector(s);
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  const seg = (path, cur, opts, cls = 'w-seg') => `<div class="${cls}" role="group">${opts.map(([v, l]) => `<button type="button" class="${cls === 'w-seg' ? 'w-opt' : 'chip'}" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  const flips = (path, cur, opts) => `<div class="w-chips">${opts.map(([v, l]) => `<button type="button" class="chip" data-sd="flip" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(arr(cur).includes(v))}">${esc(l)}</button>`).join('')}</div>`;
  const tog = (path, on, label) => `<button type="button" class="chip" data-sd="tog" data-p="${esc(path)}" aria-pressed="${String(!!on)}">${esc(label)}</button>`;
  const textIn = (id, path, val, ph, max = 240, mode = '') => `<input class="input" id="${id}" data-sk="${esc(path)}" value="${esc(val || '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="${max > 120 ? 'true' : 'false'}" maxlength="${max}"${mode ? ` inputmode="${mode}"` : ''}>`;
  const satz = (pre, inner) => `<div class="sd-inl"><span class="w-hint">${pre}</span>${inner}</div>`;
  const head = (t, h = '') => `<div class="w-q full w-head"><span class="w-head-t">${esc(t)}</span>${h ? `<span class="w-head-h">${esc(h)}</span>` : ''}</div>`;
  const out = (k, txt) => `<div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So steht es da</span><button type="button" class="btn btn-light btn-sm" data-sd="copy" data-k="${k}">Kopieren</button></div><pre class="w-out-t" data-live="${k}">${esc(txt || '– noch nichts erfasst –')}</pre></div></div>`;
  /** Zuletzt benutzte Werte eines Feldes aus anderen Vorgängen dieses Moduls. */
  const zuletzt = (api, path, extra = []) => [...new Set([...api.docs().filter(x => x && x.type === 'hgv' && x.id !== api.d.id).sort((a, b) => (b.u || 0) - (a.u || 0)).map(x => str(getPath(x.data, path))).filter(Boolean), ...extra])].slice(0, 4);
  const vorschlag = (path, vals, cur) => (vals.length ? `<div class="w-chips sd-sugg">${vals.map(v => `<button type="button" class="chip sm" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(str(cur) === v)}">${esc(v)}</button>`).join('')}</div>` : '');
  function crew(api, data) {
    const ranks = new Map(api.team().map(t => [str(t.name).toLowerCase(), rankT(t)]));
    return arr(getPath(data, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => `${str(c.grad) || ranks.get(str(c.name).toLowerCase()) || ''} ${nachname(c.name)}`.trim());
  }

  function maskHtml(d, api) {
    const data = d.data, G = P(data, 'gs'), B = P(data, 'bs'), e = data.ein || {}, o = data.ort || {}, k = data.kinder || {}, m = data.bsm || {}, pr = data.prog || {}, s = data.sonst || {};
    const art = wvArt(data), wv = art === 'wvrv' || art === 'rv';
    const personen = `${head('Beteiligte', 'Nur für die richtige Form im Text – Namen stehen in den Schilderungen.')}
      <div class="w-q half" data-q="gsg"><span class="w-lbl">Geschädigte Person</span>${seg('gs.g', G.g, [['w', 'Frau'], ['m', 'Mann']])}</div>
      <div class="w-q half" data-q="bsg"><span class="w-lbl">Beschuldigte Person</span>${seg('bs.g', B.g, [['m', 'Mann'], ['w', 'Frau']])}</div>`;
    // 2 Eintreffsituation
    const wirkAuswahl = `${flips('ein.wirk', e.wirk, WIRKT)}<div class="w-chips">${tog('ein.weint', e.weint, 'weinte')}</div>`;
    const ein = `${head(`${nrOf(data, 'ein')} Eintreffsituation`)}
      <div class="w-q" data-q="erw"><span class="w-lbl">Von ${G.dat} erwartet?</span>${seg('ein.erw', e.erw, ERWARTET, 'w-chips')}</div>
      <div class="w-q" data-q="oeff"><span class="w-lbl">Wer öffnete die Tür?</span>${seg('ein.oeff', e.oeff, OEFFNET.map(([v, l]) => [v, v === 'gs' ? cap(G.nom) : v === 'bs' ? cap(B.nom) : l]), 'w-chips')}${['gs', 'bs', 'kind'].includes(e.oeff) ? `<div class="w-chips sd-gap">${tog('ein.hinein', e.hinein, '… und bat uns hinein')}</div>` : ''}</div>
      <div class="w-q" data-q="wirk"><span class="w-lbl">Wie wirkte ${G.nom}?</span>${wirkAuswahl}${satz('Weiteres (optional), z. B. „zitterte am ganzen Körper“', textIn('hgWirk', 'ein.wirkText', e.wirkText, 'zitterte am ganzen Körper', 200))}</div>
      <div class="w-q" data-q="sicht">${satz(`Beim Eintreffen erkennbar (optional) – Details stehen in der Schilderung:`, textIn('hgSicht', 'ein.sicht', e.sicht, 'eine Rötung an der linken Wange', 300))}</div>
      <div class="w-q" data-q="bsda"><span class="w-lbl">${cap(B.nom)} vor Ort? <i class="w-req" title="Pflicht">•</i></span>${seg('ein.bsDa', e.bsDa, [['da', 'Ja, getrennt befragt'], ['weg', 'Nein, vorher gegangen']])}</div>
      <div class="w-q half" data-q="fam"><label class="w-lbl" for="hgFam">Familienname <i class="w-req" title="Pflicht">•</i></label>${textIn('hgFam', 'fam', data.fam, 'z. B. Müller', 80)}<p class="w-hint sd-hint">„… die Wohnung der Familie Müller“</p></div>
      <div class="w-q half" data-q="geb"><span class="w-lbl">Gebäude</span>${seg('ort.art', o.art, GEBAEUDE.map(x => [x[0], x[1]]), 'w-chips')}</div>
      <div class="w-q half" data-q="str"><label class="w-lbl" for="hgStr">Straße, Hausnummer <i class="w-req" title="Pflicht">•</i></label>${textIn('hgStr', 'ort.str', o.str, 'Musterstraße 5', 120)}</div>
      <div class="w-q half" data-q="plz"><label class="w-lbl" for="hgPlz">PLZ und Ort</label>${textIn('hgPlz', 'ort.plz', o.plz, '32545 Bad Oeynhausen', 80)}${vorschlag('ort.plz', zuletzt(api, 'ort.plz'), o.plz)}</div>
      ${o.art === 'mfh' ? `<div class="w-q" data-q="etage"><span class="w-lbl">Lage der Wohnung</span>${seg('ort.etage', o.etage, ETAGE, 'w-chips')}<div class="sd-gap">${seg('ort.lage', o.lage, LAGE, 'w-chips')}</div></div>` : ''}
      <div class="w-q" data-q="zust"><span class="w-lbl">Die Wohnung wirkte …</span>${seg('ort.zustand', o.zustand, ZUSTAND, 'w-chips')}<span class="w-lbl sd-gap">Spuren einer Auseinandersetzung</span>${flips('ort.spuren', o.spuren, SPUREN)}${satz('Weitere Feststellung (ganzer Satz, optional)', textIn('hgOrtT', 'ort.text', o.text, 'Im Flur lag eine zerbrochene Vase', 300))}</div>
      <div class="w-q" data-q="kinder"><span class="w-lbl">Kinder im Haushalt</span>${seg('kinder.n', has(k.n) ? String(k.n) : '', [['0', 'Keine'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], 'w-chips')}
        ${kinderN(data) ? `<div class="sd-gap">${seg('kinder.art', k.art || 'gemeinsam', KIND_ART, 'w-chips')}</div>${satz('Alter (z. B. „3 und 5“) – im Text „(gemeinsame Kinder: 3 und 5 J.)“', textIn('hgAlter', 'kinder.alter', k.alter, '3 und 5', 40))}<div class="w-chips sd-gap">${tog('kinder.bsNicht', k.bsLebt === 'nein', `${cap(B.nom)} wohnt nicht dort`).replace('data-sd="tog" data-p="kinder.bsNicht"', 'data-sd="bslebt"')}</div>` : ''}</div>
      ${out('ein', eintreffen(data))}`;
    // 4 Maßnahmen gegenüber der geschädigten Person
    const opfer = `${head(`${nrOf(data, 'gs')} ${titel(data, 'gs')}`, 'Strafantrag, Verletzungen und Rettungswagen stehen in der Schilderung.')}
      <div class="w-q" data-q="opfer"><div class="w-chips"><button type="button" class="chip" data-sd="opferstd">Wie Vorlage: alle Standardhinweise</button></div><div class="sd-gap">${flips('gsm.h', getPath(data, 'gsm.h'), OPFER.filter(([v]) => wv || !['verl', 'rueck'].includes(v)))}</div>${satz('Weiterer Hinweis (ganzer Satz, optional)', textIn('hgGsT', 'gsm.text', getPath(data, 'gsm.text'), 'Ein Platz in einer Schutzeinrichtung wurde vermittelt', 300))}</div>
      ${out('gs', opferText(data))}`;
    // 5 Maßnahmen gegenüber der beschuldigten Person
    const kr = crew(api, data);
    let bsm = `<div class="w-q" data-q="erkl"><div class="w-chips">${tog('bsm.erkl', m.erkl, 'Polizeiliches Handeln bei HG erklärt')}</div></div>
      <div class="w-q" data-q="wv"><span class="w-lbl">§ 34a PolG NRW <i class="w-req" title="Pflicht">•</i></span>${seg('bsm.wv', art, [['wvrv', 'Wohnungsverweisung + Rückkehrverbot'], ['rv', 'Nur Rückkehrverbot (nicht vor Ort)'], ['keine', 'Keine Maßnahme']], 'w-chips')}
        ${wv ? `<div class="sd-gap">${seg('bsm.dauer', dauer(data), [['14', '14 Tage (Regel)'], ['kuerzer', 'Kürzer']], 'w-chips')}</div>${dauer(data) === 'kuerzer' ? `<div class="sd-inl"><label class="w-hint" for="hgEnde">Bis einschließlich</label><input class="input mono" type="date" id="hgEnde" data-sk="bsm.ende" value="${esc(m.ende || '')}"></div>` : ''}<p class="w-hint sd-hint">Seit 13.12.2025 gilt in NRW eine Regeldauer von 14 Tagen (vorher 10).</p>` : ''}
        ${art === 'keine' ? satz('„Von einer Wohnungsverweisung mit Rückkehrverbot wurde abgesehen, weil …“', textIn('hgKein', 'bsm.keinGrund', m.keinGrund, 'es bei einem verbalen Streit geblieben ist', 300)) : ''}</div>`;
    if (art === 'wvrv') bsm += `<div class="w-q" data-q="reakt"><span class="w-lbl">Reaktion</span>${seg('bsm.reakt', m.reakt, [['halten', 'Verstanden, will sich daran halten'], ['verstanden', 'Verstanden'], ['widerspruch', 'Widersprochen']], 'w-chips')}${satz(`„${B.Er} äußerte, …“ (optional)`, textIn('hgReakt', 'bsm.reaktText', m.reaktText, 'das sei seine Wohnung', 300))}</div>`;
    if (art === 'rv') bsm += `<div class="w-q" data-q="bekannt"><span class="w-lbl">Bekanntgabe</span>${seg('bsm.bekannt', m.bekannt, [['tel', 'Telefonisch'], ['pers', 'Persönlich'], ['nein', 'Noch nicht']], 'w-chips')}</div>`;
    if (wv) {
      bsm += `<div class="w-q" data-q="inh"><span class="w-lbl">Anordnung erfolgte mit …</span>${flips('bsm.inh', m.inh, INHALT.map(x => [x[0], x[1]]))}</div>
        <div class="w-q" data-q="zg"><span class="w-lbl">Zwangsgeld angedroht <i class="w-req" title="Pflicht">•</i></span>${seg('bsm.zg', str(m.zg), [['300', '300 €'], ['500', '500 €'], ['1000', '1.000 €']], 'w-chips')}${satz('Anderer Betrag in €', textIn('hgZg', 'bsm.zg', ['300', '500', '1000'].includes(str(m.zg)) ? '' : m.zg, 'z. B. 750', 6, 'numeric'))}</div>
        <div class="w-q" data-q="gegenst"><div class="w-chips">${tog('bsm.gegenst', m.gegenst, 'Gelegenheit, persönliche Gegenstände mitzunehmen')}</div></div>
        <div class="w-q" data-q="schl"><span class="w-lbl">Wohnungsschlüssel (zur Herausgabe aufgefordert)</span>${seg('bsm.schl', m.schl, [['mit', 'Mitgeführt, an geschädigte Person übergeben'], ['ohne', 'Keinen mitgeführt']], 'w-chips')}
          ${m.schl === 'ohne' ? `<div class="w-chips sd-gap">${tog('bsm.durchs', m.durchs, 'Mit Zustimmung nach Schlüssel durchsucht')}</div>${m.durchs ? `${satz('Durchsucht von', textIn('hgDurchs', 'bsm.durchsVon', m.durchsVon, 'PK Wagner', 60))}${vorschlag('bsm.durchsVon', kr, m.durchsVon)}<div class="sd-gap">${seg('bsm.gefunden', m.gefunden || 'nein', [['nein', 'Nichts gefunden'], ['ja', 'Schlüssel gefunden']], 'w-chips')}</div>` : ''}` : ''}</div>
        <div class="w-q" data-q="auf"><span class="w-lbl">Aufenthalt / Zustellung <i class="w-req" title="Pflicht">•</i></span>${seg('bsm.auf', m.auf, [['anschrift', 'Anschrift genannt'], ['zbv', 'Zustellungsbevollmächtigte Person'], ['keine', 'Nichts genannt – Hinterlegung']], 'w-chips')}
          ${m.auf === 'anschrift' ? `<div class="sd-two"><div>${satz('Straße, Hausnummer', textIn('hgAStr', 'bsm.aufStr', m.aufStr, 'Bahnhofstraße 12', 120))}</div><div>${satz('PLZ und Ort', textIn('hgAPlz', 'bsm.aufPlz', m.aufPlz, '32547 Bad Oeynhausen', 80))}${vorschlag('bsm.aufPlz', zuletzt(api, 'ort.plz', has(o.plz) ? [str(o.plz)] : []), m.aufPlz)}</div></div>` : ''}
          ${m.auf === 'zbv' ? satz('Name und Anschrift', textIn('hgZbv', 'bsm.zbv', m.zbv, 'Herr Peter Müller, Lindenweg 3, 32545 Bad Oeynhausen', 200)) : ''}
          ${m.auf === 'keine' ? `${satz('„… wird in … hinterlegt“ – Dienststelle mit Artikel', textIn('hgWache', 'bsm.wache', m.wache, 'der PW Minden', 80))}${vorschlag('bsm.wache', zuletzt(api, 'bsm.wache', ['der PW Minden']), m.wache)}<p class="w-hint sd-hint">Die Bestätigung bleibt dort für die Dauer des Rückkehrverbots hinterlegt.</p>` : ''}</div>`;
    }
    bsm += `<div class="w-q" data-q="bsT">${satz('Weitere Maßnahme (ganzer Satz, optional)', textIn('hgBsT', 'bsm.text', m.text, 'Er begab sich anschließend zu seinem Bruder', 300))}</div>`;
    const taeter = `${head(`${nrOf(data, 'bs')} ${titel(data, 'bs')}`)}${bsm}${out('bs', taeterText(data))}`;
    // 6 Gefahrenprognose
    const groups = PROG.map(([g, items]) => `<div class="sd-wg"><span class="w-mk-gt">${esc(g)}</span>${flips('prog.f', pr.f, items.filter(([k]) => !['kinderAnw'].includes(k) || kinderN(data)).map(x => [x[0], x[1]]))}</div>`).join('');
    const prog = `${head(`${nrOf(data, 'prog')} Gefahrenprognose`, 'Trägt bei wiederholter Gewalt oder einer Ersttat von hoher Intensität.')}
      <div class="w-q" data-q="prog"><span class="w-lbl">Was spricht für weitere Übergriffe?</span><p class="w-hint">Jeder Punkt wird ein Satz – in der Reihenfolge, in der du sie antippst. Grundlage: Angaben der Beteiligten, Erkenntnisse aus Kriminalakten, ViVA und früheren Einsätzen, Zustand von Opfer, Kindern und Wohnung.</p>${groups}
        ${satz('Eigene Ergänzung (ganze Sätze, optional)', textIn('hgProgT', 'prog.text', pr.text, 'Er kündigte an, „das nächste Mal richtig zuzuschlagen“', 600))}
        <div class="w-chips sd-gap">${tog('prog.schlussAus', pr.schluss === false, 'Ohne Schlusssatz „weitere gleichgelagerte Delikte …“').replace('data-sd="tog" data-p="prog.schlussAus"', 'data-sd="schluss"')}</div></div>
      ${out('prog', prognoseText(data))}`;
    // 7 Maßnahmen/Sonstiges
    const sonst = `${head(`${nrOf(data, 'sonst')} Maßnahmen/Sonstiges`)}
      ${kinderN(data) ? `<div class="w-q" data-q="skind"><span class="w-lbl">Wie wirkten die Kinder?</span>${flips('sonst.kind', s.kind, SONST_KIND)}<div class="w-chips sd-gap">${tog('sonst.schlafen', s.schlafen, 'Schliefen während des Einsatzes')}</div><span class="w-lbl sd-gap">Weiterleitung</span>${seg('sonst.weiter', s.weiter, [['anregen', 'An entsprechende Stellen weiterleiten (anregen)'], ['ja', 'Jugendamt informiert']], 'w-chips')}</div>` : ''}
      <div class="w-q" data-q="doku"><div class="w-chips">${tog('sonst.doku', s.doku, 'Dokument „Dokumentation über den Polizeieinsatz bei häuslicher Gewalt“')}</div>${s.doku ? `<div class="sd-gap">${seg('sonst.dokuAn', s.dokuAn || 'bs', [['bs', `an ${B.akk} zugestellt`], ['gs', `an ${G.akk} ausgehändigt`]], 'w-chips')}</div>` : ''}</div>
      ${wv ? `<div class="w-q" data-q="best"><span class="w-lbl">Schriftliche Bestätigung der mündlichen Polizeiverfügung</span>${seg('sonst.best', s.best, [['zugestellt', 'Zugestellt'], ['nieder', 'Nicht zugestellt – Benachrichtigung an der Tür'], ['hinterlegt', 'Hinterlegt (siehe Aufenthalt)']], 'w-chips')}</div>` : ''}
      <div class="w-q" data-q="ga"><span class="w-lbl">Gefährderansprache</span>${seg('sonst.ga', s.ga, [['durch', 'Durchgeführt (Formular liegt bei)'], ['veranl', 'Veranlasst'], ['keine', 'Keine']], 'w-chips')}</div>
      <div class="w-q" data-q="sT">${satz('Weiteres (ganzer Satz, optional)', textIn('hgSoT', 'sonst.text', s.text, 'Die Wohnung wird in der Nacht bestreift', 300))}</div>
      ${out('sonst', sonstText(data))}`;
    const miss = offen(data);
    return `<div class="w-top"><button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste">${ICON_BACK}</button><div class="w-top-t"><span class="spaced">Häusliche Gewalt · nach Vorlage</span><div class="w-title">${esc(title(data))}</div></div></div>
      <p class="w-hint">Einsatzanlass und Schilderungen (mit Belehrung, Verletzungen und Strafantrag) legst du unter Schreiben als eigene Vorgänge an.</p>
      <div class="w-grid sd-grid">${personen}${ein}${opfer}${taeter}${prog}${sonst}</div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${miss.length ? `<span class="w-nav-i">${miss.length} offen</span>` : ''}<button type="button" class="btn btn-accent" data-sd="text">Text ansehen</button></div>`;
  }

  function textHtml(d) {
    const data = d.data, miss = offen(data);
    const nums = ABSCHNITTE.map(([k, l]) => `<div class="hg-nr"><label class="w-hint" for="hgNr_${k}">${esc(l.replace(' gegenüber der geschädigten Person', ' (geschädigt)').replace(' gegenüber der beschuldigten Person', ' (beschuldigt)'))}</label><input class="input mono" id="hgNr_${k}" data-sk="nr.${k}" value="${esc(nrOf(data, k))}" inputmode="decimal" maxlength="6"></div>`).join('');
    const blocks = ABSCHNITTE.map(([k]) => `<div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">${esc(`${nrOf(data, k)} ${titel(data, k)}`.trim())}</span><button type="button" class="btn btn-light btn-sm" data-sd="copy" data-k="${k}">Kopieren</button></div><pre class="w-out-t" data-live="${k}">${esc(TEXTE[k](data) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `<div class="w-top"><button type="button" class="icon-btn sm" data-sd="mask" aria-label="Zurück zur Eingabe">${ICON_BACK}</button><div class="w-top-t"><span class="spaced">Häusliche Gewalt · Text</span><div class="w-title">${esc(title(data))}</div></div></div>
      <div class="w-grid sd-grid">
        <div class="w-q"><span class="w-lbl">Nummern der Abschnitte (wie in der Vorlage: 1 Einsatzanlass und 3 Schilderungen kommen aus den eigenen Vorgängen)</span><div class="hg-nrs">${nums}</div></div>
        ${miss.length ? `<div class="w-q"><div class="w-warn">Noch offen: ${esc(miss.join(', '))}.</div></div>` : ''}
        ${blocks}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="mask">Zur Eingabe</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copyall">Alles kopieren</button></div>`;
  }

  function open(d) { V.id = d.id; V.s = 'mask'; V.focus = ''; V.guide = ''; }
  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    return V.s === 'text' ? textHtml(d) : maskHtml(d, api);
  }
  function mounted() {
    if (V.guide) { const k = V.guide; V.guide = ''; guide(k); }
  }
  /** Nach einer Einfachauswahl: nur scrollen, wenn der Anfang der nächsten Frage verdeckt ist – und nur so weit wie nötig. */
  function guide(key) {
    const all = [...document.querySelectorAll('#wMain [data-q]')];
    const i = all.findIndex(n => n.dataset.q === key);
    const nx = i >= 0 ? all[i + 1] : null; if (!nx) return;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const nav = document.querySelector('#wMain .w-nav'); const navH = nav ? nav.getBoundingClientRect().height : 0;
    const r = nx.getBoundingClientRect(), free = vh - navH - 12, need = r.top + Math.min(r.height, 150);
    if (r.top < 0 || need <= free) return;
    const delta = Math.min(r.top - vh * 0.22, need - free); if (delta < 32) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
  }
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    for (const k of Object.keys(TEXTE)) host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = TEXTE[k](data) || '– noch nichts erfasst –'; });
  }
  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    const data = api.d.data, a = b.dataset.sd;
    const save = () => { api.persist(false); api.render(); };
    switch (a) {
      case 'set': {
        const path = b.dataset.p, v = b.dataset.v;
        // Zahlen-Chips (Kinder) als Zahl, sonst Text
        setPath(data, path, path === 'kinder.n' ? Number(v) : v);
        const q = b.closest('[data-q]'); if (q) V.guide = q.dataset.q;
        save(); return true;
      }
      case 'flip': { const path = b.dataset.p, v = b.dataset.v, a2 = arr(getPath(data, path)).slice(), k = a2.indexOf(v); if (k >= 0) a2.splice(k, 1); else a2.push(v); setPath(data, path, a2.length ? a2 : undefined); save(); return true; }
      case 'tog': setPath(data, b.dataset.p, getPath(data, b.dataset.p) ? undefined : true); save(); return true;
      case 'bslebt': setPath(data, 'kinder.bsLebt', getPath(data, 'kinder.bsLebt') === 'nein' ? undefined : 'nein'); save(); return true;
      case 'schluss': setPath(data, 'prog.schluss', getPath(data, 'prog.schluss') === false ? undefined : false); save(); return true;
      case 'opferstd': { const cur = arr(getPath(data, 'gsm.h')); setPath(data, 'gsm.h', [...new Set([...cur, ...OPFER_STD])]); save(); return true; }
      case 'copy': api.copy(abschnitt(data, b.dataset.k)); return true;
      case 'copyall': api.copy(paket(data)); return true;
      case 'text': V.s = 'text'; api.render(); top0(); return true;
      case 'mask': V.s = 'mask'; api.render(); top0(); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    setPath(api.d.data, el.dataset.sk, el.value);
    api.persist(false); live(api);
    return true;
  }
  function change(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.type === 'date') { setPath(api.d.data, el.dataset.sk, el.value); api.persist(false); live(api); }
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    e.preventDefault(); el.blur(); return true;
  }
  function submit(api) { if (V.s === 'mask') { V.s = 'text'; api.render(); top0(); } else api.copy(paket(api.d.data)); }

  root.WHGV = Object.freeze({
    id: 'hgv', name: 'Häusliche Gewalt', short: 'Häusliche Gewalt', kurz: 'HG',
    desc: 'Nach der Vorlage: Eintreffsituation, Maßnahmen gegenüber Geschädigter und Beschuldigtem (§ 34a PolG NRW), Gefahrenprognose, Sonstiges',
    intro: 'Nach deiner Vorlage: Eintreffsituation, Maßnahmen gegenüber beiden Seiten, Gefahrenprognose, Sonstiges – Einsatzanlass und Schilderungen als eigene Vorgänge',
    labels: { newBtn: 'Häusliche Gewalt' },
    steps: [],
    title, subtitle, pill,
    plain: paket,
    text: d => ABSCHNITTE.map(([k]) => [nrOf(d, k), titel(d, k), TEXTE[k](d), k]),
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, change, keydown, submit },
    core: { eintreffen, opferText, taeterText, prognoseText, sonstText, abschnitt, paket, offen, P, PROG }
  });
})(typeof window !== 'undefined' ? window : globalThis);
