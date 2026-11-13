/*
 * Workoholic · Modul „Häusliche Gewalt“ (nach der Vorlage)
 * ---------------------------------------------------------------
 * Nur das, was für häusliche Gewalt eigen ist – Einsatzanlass („Allgemeines“) und Schilderungen (mit Belehrung,
 * Verletzungen, Rettungswagen, Strafantrag) sind eigene Module im Bereich Schreiben.
 * Jeder Abschnitt hat genau ein Thema:
 *   2 Eintreffsituation – was beim Eintreffen festgestellt wurde (Personen, Tatort, Kinder)
 *   4 Maßnahmen gegenüber der geschädigten Person – Hinweise, Unterlagen, Verbleib
 *   5 Maßnahmen gegenüber der beschuldigten Person – Anhörung, Anordnung nach § 34a PolG NRW, Vollzug, Zustellung, Ansprache
 *   6 Gefahrenprognose – Erkenntnislage, Einordnung, Umstände (festgestellt / nach Angaben / angenommen), Bewertung, Ergebnis
 *   7 Weitere Maßnahmen/Sonstiges – Jugendamt, Kontrolle, Bestreifung, Folgeaufträge
 * Nummern änderbar (ohne Punkt). Auswahllisten sind nie abschließend – überall gibt es ein freies Feld.
 * Im Text stehen nur Rechtsvorschriften, keine Urteile oder Studien. Textlogik ohne DOM, in Node testbar.
 * Fachlich: § 34a PolG NRW (Regeldauer 14 Tage seit 13.12.2025), § 28 VwVfG NRW, §§ 43, 44, 51 ff. PolG NRW.
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
  const satzEnde = s => { s = str(s); return s && !/[.!?“"]$/.test(s) ? s + '.' : s; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ZAHL = ['kein', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
  const RANK_RE = /^(E?P[HO]?K|P[HO]?M|PKA|E?K[HO]?K|KKA|KA|P?OR|PR|PD|LPD|KR|KOR|KD|LKD)(in)?$/;
  const rankT = t => str(t && t.rank) || (arr(t && t.roles).map(str).find(r => RANK_RE.test(r)) || '');
  const nachname = n => { n = str(n); if (n.includes(',')) return n.split(',')[0].trim(); const t = n.split(/\s+/); return t.length < 2 ? n : t[t.length - 1]; };
  const pad = n => String(n).padStart(2, '0');
  const fmtDatum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); return m ? `${m[3]}.${m[2]}.${m[1]}` : str(iso); };
  const addTage = (iso, n) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const fmtEuro = v => { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n.toLocaleString('de-DE') + ' €' : str(v); };
  const pick = (list, sel) => list.filter(x => arr(sel).includes(x[0]));

  /* ======================= Rollen und Formen ======================= */
  const GS = { w: { nom: 'die Geschädigte', dat: 'der Geschädigten', akk: 'die Geschädigte', gen: 'der Geschädigten', verletzt: 'Verletzte' }, m: { nom: 'der Geschädigte', dat: 'dem Geschädigten', akk: 'den Geschädigten', gen: 'des Geschädigten', verletzt: 'Verletzter' } };
  const BS = { m: { nom: 'der Beschuldigte', dat: 'dem Beschuldigten', akk: 'den Beschuldigten', gen: 'des Beschuldigten', mieter: 'Mieter bzw. Eigentümer' }, w: { nom: 'die Beschuldigte', dat: 'der Beschuldigten', akk: 'die Beschuldigte', gen: 'der Beschuldigten', mieter: 'Mieterin bzw. Eigentümerin' } };
  const PRO = { w: { er: 'sie', Er: 'Sie', ihm: 'ihr', ihn: 'sie', sein: 'ihr' }, m: { er: 'er', Er: 'Er', ihm: 'ihm', ihn: 'ihn', sein: 'sein' } };
  /** Formen der geschädigten (gs) bzw. beschuldigten (bs) Person – Standard: Frau / Mann. */
  function P(data, wer) {
    const alt = wer === 'gs' ? 'm' : 'w';
    const g = getPath(data, wer + '.g') === alt ? alt : (wer === 'gs' ? 'w' : 'm');
    const f = (wer === 'gs' ? GS : BS)[g], p = PRO[g];
    return { ...f, Nom: cap(f.nom), Dat: cap(f.dat), Akk: cap(f.akk), ...p, g };
  }
  const BEZ = [['ehe', 'Ehe'], ['partner', 'Partnerschaft'], ['ex', 'Ehemalige Partnerschaft'], ['familie', 'Familie / andere']];
  /** Die geschädigte Person aus Sicht der beschuldigten im Dativ: „seiner Ehefrau“, „ihrem Lebensgefährten“ – sonst „der Geschädigten“. */
  function partnerDat(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), w = G.g === 'w', b = d && d.bez;
    const n = b === 'ehe' ? (w ? 'Ehefrau' : 'Ehemann') : b === 'partner' ? (w ? 'Lebensgefährtin' : 'Lebensgefährten') : b === 'ex' ? (w ? 'ehemaligen Partnerin' : 'ehemaligen Partner') : '';
    return n ? `${B.sein}${w ? 'er' : 'em'} ${n}` : G.dat;
  }
  const bsWohnt = d => getPath(d, 'bs.wohnt') !== 'nein';

  /* ======================= Auswahllisten (nie abschließend) ======================= */
  const ERWARTET = [['ja', 'Ja', ''], ['haus', 'Vor dem Haus', 'vor dem Wohnhaus'], ['treppe', 'Im Treppenhaus', 'im Treppenhaus'], ['nachbar', 'Bei Nachbarn', 'in der Wohnung von Nachbarn'], ['nein', 'Nein', '']];
  const VORHER = [['schreie', 'Laute Schreie', 'laute Schreie'], ['hilfe', 'Hilferufe', 'Hilferufe'], ['streit', 'Lauter Streit', 'ein lauter Streit'], ['poltern', 'Poltern', 'Poltern'], ['klirren', 'Klirren', 'das Klirren von Glas'], ['weinen', 'Weinen', 'Weinen'], ['kinder', 'Kinderweinen', 'Kinderweinen']];
  const VORHER_PL = ['schreie', 'hilfe'];
  const OEFFNET = [['gs', 'Geschädigte Person'], ['bs', 'Beschuldigte Person'], ['kind', 'Ein Kind'], ['dritte', 'Eine dritte Person'], ['offen', 'Tür stand offen'], ['niemand', 'Zunächst niemand']];
  const WIRKT = [['aufgeloest', 'aufgelöst'], ['veraengstigt', 'verängstigt'], ['eingeschuechtert', 'eingeschüchtert'], ['nervoes', 'nervös'], ['verstoert', 'verstört'], ['aufgewuehlt', 'aufgewühlt'], ['panisch', 'panisch'], ['verzweifelt', 'verzweifelt'], ['apathisch', 'apathisch'], ['erschoepft', 'erschöpft'], ['zurueckhaltend', 'zurückhaltend'], ['aufgebracht', 'aufgebracht'], ['gefasst', 'gefasst'], ['ruhig', 'ruhig']];
  const GS_VERB = [['weint', 'weinte'], ['zittert', 'zitterte'], ['stockend', 'sprach leise und stockend'], ['beruhigt', 'konnte sich kaum beruhigen'], ['schock', 'stand sichtlich unter Schock'], ['blick', 'blickte immer wieder ängstlich zur beschuldigten Person']];
  const BS_WIRKT = [['aggressiv', 'aggressiv'], ['aufgebracht', 'aufgebracht'], ['gereizt', 'gereizt'], ['provokant', 'provokant'], ['herablassend', 'herablassend'], ['nervoes', 'nervös'], ['uneinsichtig', 'uneinsichtig'], ['unbeeindruckt', 'unbeeindruckt'], ['gleichgueltig', 'gleichgültig'], ['abweisend', 'abweisend'], ['ruhig', 'ruhig'], ['gefasst', 'gefasst'], ['kooperativ', 'kooperativ']];
  const BS_VERB = [['schrie', 'schrie herum'], ['beleidigte', 'beleidigte die geschädigte Person'], ['vorwuerfe', 'machte der geschädigten Person Vorwürfe'], ['bedrohte', 'bedrohte die geschädigte Person in Gegenwart der Beamten'], ['beruhigt', 'ließ sich kaum beruhigen'], ['verharmloste', 'verharmloste das Geschehen'], ['alk', 'roch deutlich nach Alkohol']];
  const BS_DA = [['da', 'Ja, getrennt befragt'], ['nah', 'Im Nahbereich angetroffen'], ['weg', 'Nein, vorher gegangen']];
  const GEBAEUDE = [['mfh', 'Mehrfamilienhaus', 'ein Mehrfamilienhaus'], ['zfh', 'Zweifamilienhaus', 'ein Zweifamilienhaus'], ['efh', 'Einfamilienhaus', 'ein Einfamilienhaus'], ['dhh', 'Doppelhaushälfte', 'eine Doppelhaushälfte'], ['rh', 'Reihenhaus', 'ein Reihenhaus'], ['whg', 'Wohn- und Geschäftshaus', 'ein Wohn- und Geschäftshaus'], ['hoch', 'Hochhaus', 'ein Hochhaus']];
  const MIT_ETAGE = ['mfh', 'zfh', 'whg', 'hoch'];
  const ETAGE = [['eg', 'EG'], ['1', '1. OG'], ['2', '2. OG'], ['3', '3. OG'], ['4', '4. OG'], ['5', '5. OG'], ['6', '6. OG'], ['dg', 'DG'], ['ug', 'Souterrain']];
  const LAGE = [['links', 'links'], ['rechts', 'rechts'], ['mitte', 'Mitte']];
  const ZUSTAND = [['ordentlich', 'ordentlich'], ['aufgeraeumt', 'aufgeräumt'], ['unaufgeraeumt', 'unaufgeräumt'], ['unordentlich', 'unordentlich'], ['verschmutzt', 'stark verschmutzt'], ['vermuellt', 'vermüllt'], ['verwahrlost', 'verwahrlost']];
  const SPUREN = [['moebel', 'umgestoßene Möbel'], ['stuehle', 'umgekippte Stühle'], ['scherben', 'Scherben auf dem Boden'], ['geschirr', 'zerbrochenes Geschirr'], ['gegenst', 'beschädigte Gegenstände'], ['verstreut', 'auf dem Boden verstreute Gegenstände'], ['wand', 'ein Loch in der Wand'], ['tuer', 'eine beschädigte Tür'], ['scheibe', 'eine zerbrochene Fensterscheibe'], ['kabel', 'herausgerissene Kabel'], ['handy', 'ein beschädigtes Mobiltelefon'], ['kleidung', 'zerrissene Kleidung'], ['haare', 'ausgerissene Haare'], ['blut', 'Blutspuren']];
  const KIND_ART = [['gemeinsam', 'Gemeinsame Kinder'], ['gs', 'Kinder der geschädigten Person'], ['bs', 'Kinder der beschuldigten Person']];
  const KIND_WO = [['zimmer', 'Im Kinderzimmer'], ['beigs', 'Bei der geschädigten Person'], ['schliefen', 'Schliefen'], ['versteckt', 'Hatten sich versteckt'], ['miterlebt', 'Haben es miterlebt (nach Angaben)'], ['nichtda', 'Nicht in der Wohnung']];
  const KIND_WIRK = [['ueberfordert', 'sichtlich überfordert mit der Situation'], ['eingeschuechtert', 'eingeschüchtert'], ['veraengstigt', 'verängstigt'], ['verstoert', 'verstört'], ['nervoes', 'nervös'], ['unruhig', 'unruhig'], ['zurueckgezogen', 'still und zurückgezogen'], ['apathisch', 'apathisch'], ['ruhig', 'ruhig']];
  /** [Schlüssel, Beschriftung, Einzahl, Mehrzahl] – „{G}“ wird die geschädigte Person im Akkusativ. */
  const KIND_VERB = [['weinten', 'Weinten', 'weinte', 'weinten'], ['zitterten', 'Zitterten', 'zitterte', 'zitterten'], ['klammern', 'Klammerten sich an die geschädigte Person', 'klammerte sich an {G}', 'klammerten sich an {G}'], ['fragten', 'Fragten nach dem Geschehen', 'fragte wiederholt nach dem Geschehen', 'fragten wiederholt nach dem Geschehen']];
  /** Hinweise und Unterlagen für die geschädigte Person (Abschnitt 4). */
  const OPFER = [['erl', 'Vorgehen der Polizei erläutert'], ['schutz', 'Schutzanordnung (Amtsgericht) eröffnet'], ['verl', 'Verlängerung bei Antrag erklärt'], ['hilfe', 'Hilfsangebote (Hilfetelefon …)'], ['rueck', 'Handlungsempfehlungen bei Rückkehr'], ['beratung', 'Beratungsstelle benannt'], ['daten', 'Einwilligung: Daten an Beratungsstelle'], ['notruf', 'Bei Rückkehr sofort 110'], ['schloss', 'Schlosswechsel empfohlen'], ['merkblatt', 'Merkblatt ausgehändigt'], ['doku', 'Dokumentation des Einsatzes ausgehändigt'], ['rechte', 'Rechte als Verletzte erklärt']];
  const OPFER_STD = ['erl', 'schutz', 'hilfe', 'rueck'];
  const VERBLEIB = [['wohnung', 'Bleibt in der Wohnung'], ['schutz', 'Schutzeinrichtung'], ['dritte', 'Bei Angehörigen / Bekannten']];
  /** Räumlicher Bereich (§ 34a Abs. 1 PolG NRW: Wohnung und unmittelbare Umgebung, genau zu bezeichnen). */
  const BEREICH = [['wohnung', 'Wohnung', 'die Wohnung'], ['flur', 'Hausflur mit Treppenhaus', 'den Hausflur mit Treppenhaus'], ['keller', 'Keller', 'den Keller'], ['dach', 'Dachboden', 'den Dachboden'], ['garage', 'Garage / Stellplatz', 'die Garage bzw. den Stellplatz'], ['garten', 'Garten', 'den Garten'], ['grund', 'Grundstück mit Zuwegung', 'das Grundstück einschließlich der Zuwegung'], ['umgebung', 'Unmittelbare Umgebung', 'die unmittelbare Umgebung des Wohnhauses']];
  /** Inhalt der mündlichen Anordnung (Abschnitt 5). */
  const INHALT = [['ort', 'Örtlichkeit beschrieben', 'der Beschreibung der Örtlichkeit'], ['zeit', 'Zeitrahmen genannt', 'dem Zeitrahmen'], ['recht', 'Rechtsgrundlage genannt', 'der Rechtsgrundlage'], ['gruende', 'Gründe erläutert', 'den Gründen für die Maßnahme'], ['verl', 'Verlängerung bei Gerichtsantrag', 'dem Hinweis auf die Verlängerung bei einem Antrag auf zivilrechtlichen Schutz'], ['gew', 'Ingewahrsamnahme angekündigt', 'dem Hinweis auf die Möglichkeit einer Durchsetzung durch Ingewahrsamnahme']];
  const INHALT_STD = ['ort', 'zeit', 'recht', 'gew'];
  const BEST = [['eb', 'Gegen Empfangsbekenntnis ausgehändigt'], ['zugestellt', 'Zugestellt'], ['verweigert', 'Annahme verweigert'], ['nieder', 'Nicht angetroffen – Benachrichtigung an der Tür']];

  /* ---------- Gefahrenprognose ---------- */
  /** Erkenntnislage aus dem Datenabgleich. */
  const VORG = [['einsaetze', 'Frühere HG-Einsätze an der Anschrift', 'frühere Einsätze wegen häuslicher Gewalt an der Anschrift'], ['anzeigen', 'Frühere Verfahren (Gewalt gg. die geschädigte Person)', 'frühere Strafverfahren wegen Gewalt gegen die geschädigte Person'], ['andere', 'Gewaltdelikte gg. andere', 'Gewaltdelikte gegen andere Personen'], ['wv', 'Frühere Wohnungsverweisung', 'eine frühere Wohnungsverweisung'], ['gewschg', 'Gerichtliche Schutzanordnung', 'eine gerichtliche Schutzanordnung'], ['verstoss', 'Verstöße gegen Anordnungen', 'Verstöße gegen frühere Anordnungen'], ['wbk', 'Waffenerlaubnis / Waffen registriert', 'eine waffenrechtliche Erlaubnis bzw. registrierte Waffen'], ['btm', 'Betäubungsmitteldelikte', 'Erkenntnisse zu Betäubungsmitteldelikten']];
  const MK = [['fest', 'festgestellt'], ['angabe', 'nach Angaben'], ['annahme', 'angenommen']];
  const FAK_GRUPPEN = [['tat', 'Heutiges Geschehen'], ['vor', 'Vorgeschichte und Beziehung'], ['dro', 'Drohungen und Ankündigungen'], ['lage', 'Lebenslage'], ['bsp', 'Beschuldigte Person'], ['opf', 'Sicht der gefährdeten Person']];
  const FAK_KIND = ['kinder', 'kindergewalt', 'stiefkind'];
  /** Umstände: [Schlüssel, Gruppe, Beschriftung, festgestellt, nach Angaben, angenommen, Bedeutung]. G = geschädigte, B = beschuldigte Person. */
  const FAK = [
    ['wuergen', 'tat', 'Würgen / Angriff gegen den Hals', (G) => `Am Hals ${G.gen} wurden Spuren festgestellt, die auf einen Angriff gegen den Hals hindeuten.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} ${G.ihn} gewürgt bzw. am Hals gepackt.`, (G) => `Es bestehen Anhaltspunkte dafür, dass ${G.nom} am Hals angegriffen wurde.`, 'Angriffe gegen den Hals gelten als Warnsignal für eine lebensgefährliche Eskalation.'],
    ['kopf', 'tat', 'Schläge oder Tritte gegen den Kopf', (G) => `Das Verletzungsbild ${G.gen} spricht für Schläge oder Tritte gegen den Kopf.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} ${G.ihn} gegen den Kopf geschlagen bzw. getreten.`, (G) => `Es bestehen Anhaltspunkte für Schläge oder Tritte gegen den Kopf ${G.gen}.`, 'Schläge und Tritte gegen den Kopf können schwerste Verletzungen verursachen und zeigen eine hohe Gewaltbereitschaft.'],
    ['intensitaet', 'tat', 'Hohe Intensität, erhebliche Verletzungen', (G) => `Das Verletzungsbild ${G.gen} zeugt von einem Angriff hoher Intensität.`, (G, B) => `Nach Angaben ${G.gen} sei ${B.nom} mit erheblicher Gewalt gegen ${G.ihn} vorgegangen.`, () => 'Es ist von einem Angriff hoher Intensität auszugehen.', 'Die Intensität des Angriffs lässt auf eine erhebliche Gewaltbereitschaft schließen.'],
    ['waffe', 'tat', 'Waffe oder gefährlicher Gegenstand', () => 'Am Einsatzort wurde ein gefährlicher Gegenstand vorgefunden, der im Zusammenhang mit dem Geschehen steht.', (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} eine Waffe oder einen gefährlichen Gegenstand eingesetzt bzw. damit gedroht.`, () => 'Es bestehen Anhaltspunkte dafür, dass bei dem Geschehen ein gefährlicher Gegenstand eine Rolle spielte.', 'Der Einsatz von Waffen oder die Drohung damit erhöht die Gefahr schwerer und tödlicher Gewalt erheblich.'],
    ['sexuell', 'tat', 'Sexuelle Gewalt', () => 'Es wurden Umstände festgestellt, die auf sexuelle Gewalt hindeuten.', (G) => `Nach Angaben ${G.gen} sei es auch zu sexueller Gewalt gekommen.`, () => 'Es bestehen Anhaltspunkte für sexuelle Gewalt.', 'Sexuelle Gewalt in der Beziehung ist Ausdruck massiver Grenzüberschreitung und ein Risikofaktor für weitere schwere Gewalt.'],
    ['einsperren', 'tat', 'Festgehalten, eingesperrt', (G) => `Festgestellt wurde, dass ${G.nom} am Verlassen der Wohnung gehindert worden war.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} ${G.ihn} festgehalten bzw. am Verlassen der Wohnung gehindert.`, (G) => `Es bestehen Anhaltspunkte dafür, dass ${G.nom} am Verlassen der Wohnung gehindert wurde.`, 'Das Festhalten und Einsperren zeigt einen ausgeprägten Kontrollanspruch über die gefährdete Person.'],
    ['notruf', 'tat', 'Hilferuf verhindert, Telefon weggenommen', (G) => `Festgestellt wurde, dass das Mobiltelefon ${G.gen} weggenommen bzw. beschädigt worden war.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} ${G.ihn} daran gehindert, Hilfe zu rufen, bzw. ${G.sein} Telefon weggenommen.`, (G) => `Es bestehen Anhaltspunkte dafür, dass ${G.nom} am Herbeirufen von Hilfe gehindert wurde.`, 'Wer das Herbeirufen von Hilfe verhindert, nimmt der gefährdeten Person jeden Schutz und zeigt eine hohe Gefährlichkeit.'],
    ['kinder', 'tat', 'Kinder anwesend bzw. mitbetroffen', () => 'Beim Eintreffen der Einsatzkräfte befanden sich Kinder in der Wohnung.', (G) => `Nach Angaben ${G.gen} hätten die Kinder das Geschehen miterlebt.`, () => 'Es ist davon auszugehen, dass die Kinder das Geschehen mitbekommen haben.', 'Miterlebte Gewalt gefährdet das Wohl der Kinder erheblich.'],
    ['kindergewalt', 'tat', 'Gewalt auch gegen Kinder', () => 'Festgestellt wurden Anzeichen für Gewalt auch gegen ein Kind.', (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} auch gegenüber den Kindern Gewalt ausgeübt.`, () => 'Es bestehen Anhaltspunkte für Gewalt auch gegenüber Kindern.', 'Gewalt gegen Kinder erhöht die Gefahr für alle Personen im Haushalt erheblich.'],
    ['schwanger', 'tat', 'Schwangerschaft', (G) => `${cap(G.nom)} ist erkennbar schwanger.`, (G) => `${cap(G.nom)} gab an, schwanger zu sein.`, (G) => `Es ist von einer Schwangerschaft ${G.gen} auszugehen.`, 'Gewalt in der Schwangerschaft ist ein Risikofaktor für schwere Gewalt und gefährdet zugleich das ungeborene Kind.'],
    ['frueher', 'vor', 'Frühere Übergriffe', (G, B) => `Frühere Übergriffe ${B.gen} gegen ${G.akk} sind polizeilich bekannt.`, (G) => `Nach Angaben ${G.gen} sei es bereits in der Vergangenheit wiederholt zu Übergriffen gekommen.`, () => 'Es ist davon auszugehen, dass es bereits früher zu Übergriffen gekommen ist.', 'Wiederholte Übergriffe sind der zentrale Hinweis auf eine Gewaltbeziehung und eine fortbestehende Gefahr.'],
    ['zunahme', 'vor', 'Gewalt nimmt zu (häufiger, schwerer)', () => 'Die polizeilichen Erkenntnisse zeigen eine Zunahme von Häufigkeit bzw. Schwere der Übergriffe.', (G) => `Nach Angaben ${G.gen} hätten die Übergriffe zuletzt an Häufigkeit bzw. Schwere zugenommen.`, () => 'Es ist von einer Zunahme der Gewalt auszugehen.', 'Eine Zunahme von Häufigkeit oder Intensität der Gewalt gilt als Warnsignal für eine weitere Eskalation.'],
    ['verstoss', 'vor', 'Verstöße gegen frühere Anordnungen', (G, B) => `${cap(B.nom)} hat nach polizeilichen Erkenntnissen bereits gegen frühere Schutzanordnungen bzw. ein Rückkehrverbot verstoßen.`, (G, B) => `Nach Angaben ${G.gen} habe sich ${B.nom} früher nicht an Anordnungen gehalten.`, (G, B) => `Es ist davon auszugehen, dass sich ${B.nom} an Absprachen und Anordnungen nicht hält.`, 'Wer frühere Anordnungen missachtet hat, wird sich ohne Durchsetzung voraussichtlich auch jetzt nicht fernhalten.'],
    ['gewaltandere', 'vor', 'Gewalt auch gegen andere Personen', (G, B) => `${cap(B.nom)} ist polizeilich wegen Gewaltdelikten auch gegenüber anderen Personen bekannt.`, (G, B) => `Nach Angaben ${G.gen} sei ${B.nom} auch gegenüber anderen Personen gewalttätig gewesen.`, (G, B) => `Es ist von einer allgemein erhöhten Gewaltbereitschaft ${B.gen} auszugehen.`, 'Gewalt auch außerhalb der Beziehung zeigt eine grundsätzlich erhöhte Gewaltbereitschaft.'],
    ['kontrolle', 'vor', 'Kontrolle, Eifersucht, Nachstellung', (G, B) => `Festgestellt wurde ein ausgeprägtes Kontrollverhalten ${B.gen} gegenüber ${G.dat}.`, (G, B) => `Nach Angaben ${G.gen} kontrolliere ${B.nom} ${G.ihn} stark, sei ausgeprägt eifersüchtig bzw. stelle ${G.ihm} nach.`, (G, B) => `Es bestehen Anhaltspunkte für ein ausgeprägtes Kontrollverhalten ${B.gen}.`, 'Kontrolle, Eifersucht und Nachstellung gelten als Warnsignale für schwere Gewalt in Paarbeziehungen.'],
    ['trennung', 'vor', 'Trennung oder Trennungsabsicht', () => 'Die Beteiligten leben getrennt bzw. befinden sich in Trennung.', (G) => `Nach Angaben ${G.gen} befinde sich die Beziehung in einer Trennungssituation.`, () => 'Es ist von einer Trennungssituation auszugehen.', 'Trennungsphasen gelten als Zeit besonders hohen Risikos für schwere Gewalt in Paarbeziehungen.'],
    ['kinderstreit', 'vor', 'Streit um Kinder, Umgang, Sorgerecht', () => 'Zwischen den Beteiligten besteht ein Streit um die Kinder, den Umgang bzw. das Sorgerecht.', (G) => `Nach Angaben ${G.gen} bestehe zwischen den Beteiligten Streit um die Kinder, den Umgang bzw. das Sorgerecht.`, () => 'Es ist von einem Konflikt um die Kinder auszugehen.', 'Konflikte um Kinder und Umgang schaffen wiederkehrende Kontaktanlässe und damit Gelegenheiten für weitere Übergriffe.'],
    ['tod', 'dro', 'Todesdrohung', (G, B) => `In Gegenwart der Einsatzkräfte drohte ${B.nom}, ${G.akk} zu töten.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} gedroht, ${G.ihn} umzubringen.`, (G, B) => `Es ist davon auszugehen, dass ${B.nom} mit dem Tod gedroht hat.`, 'Todesdrohungen gelten als Warnsignal für eine Eskalation bis hin zu Tötungsdelikten.'],
    ['suizid', 'dro', 'Suiziddrohung der beschuldigten Person', (G, B) => `${cap(B.nom)} kündigte in Gegenwart der Einsatzkräfte an, sich das Leben zu nehmen.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} gedroht, sich das Leben zu nehmen.`, (G, B) => `Es bestehen Anhaltspunkte für eine Suizidgefährdung ${B.gen}.`, 'Suiziddrohungen der gewaltausübenden Person gelten als Warnsignal für eine Eskalation, die auch andere gefährden kann.'],
    ['kinderdrohung', 'dro', 'Drohung gegen Kinder', (G, B) => `In Gegenwart der Einsatzkräfte richtete ${B.nom} Drohungen auch gegen die Kinder.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} auch den Kindern gedroht.`, () => 'Es ist davon auszugehen, dass sich Drohungen auch gegen die Kinder richten.', 'Drohungen gegen Kinder gelten als Warnsignal für eine schwere Eskalation.'],
    ['rueckkehr', 'dro', 'Kündigt an, zurückzukommen', (G, B) => `${cap(B.nom)} kündigte in Gegenwart der Einsatzkräfte an, zurückzukommen bzw. die Auseinandersetzung fortzusetzen.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} angekündigt, zurückzukommen.`, (G, B) => `Es ist davon auszugehen, dass ${B.nom} ohne die Maßnahme kurzfristig zurückkehren würde.`, 'Die Ankündigung zeigt, dass die Auseinandersetzung aus Sicht der beschuldigten Person nicht beendet ist.'],
    ['drohung', 'dro', 'Weitere Drohungen', (G, B) => `${cap(B.nom)} drohte ${G.dat} in Gegenwart der Einsatzkräfte.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} ${G.ihm} weitere Gewalt angedroht.`, (G, B) => `Es ist davon auszugehen, dass ${B.nom} ${G.dat} weitere Gewalt angedroht hat.`, 'Angedrohte Gewalt kündigt die nächste Tat an und hält die gefährdete Person in Angst.'],
    ['abhaengig', 'lage', 'Abhängigkeit oder Isolation', (G, B) => `Festgestellt wurde, dass ${G.nom} von ${B.dat} wirtschaftlich bzw. sozial abhängig ist.`, (G, B) => `Nach Angaben ${G.gen} sei ${G.er} von ${B.dat} abhängig bzw. sozial isoliert.`, (G, B) => `Es ist von einer Abhängigkeit ${G.gen} von ${B.dat} auszugehen.`, 'Abhängigkeit und Isolation erschweren es der gefährdeten Person, sich aus eigener Kraft zu schützen.'],
    ['neuerpartner', 'lage', 'Neue Beziehung der gefährdeten Person', (G) => `${cap(G.nom)} hat eine neue Beziehung.`, (G, B) => `Nach Angaben ${G.gen} habe ${G.er} eine neue Beziehung, was ${B.nom} nicht akzeptiere.`, (G) => `Es ist davon auszugehen, dass eine neue Beziehung ${G.gen} Anlass der Auseinandersetzung war.`, 'Eine neue Beziehung der gefährdeten Person kann eine akute Kränkung auslösen und die Gefahr erhöhen.'],
    ['stiefkind', 'lage', 'Kind aus anderer Beziehung im Haushalt', (G, B) => `Im Haushalt lebt ein Kind, das nicht von ${B.dat} abstammt.`, (G) => `Nach Angaben ${G.gen} lebe im Haushalt ein Kind aus einer anderen Beziehung.`, () => 'Es ist davon auszugehen, dass im Haushalt ein Kind aus einer anderen Beziehung lebt.', 'Ein Kind aus einer anderen Beziehung im Haushalt gilt als zusätzlicher Risikofaktor.'],
    ['krise', 'lage', 'Akute Lebenskrise (Arbeit, Schulden, Kränkung)', (G, B) => `${cap(B.nom)} befindet sich erkennbar in einer akuten Lebenskrise.`, (G, B) => `Nach Angaben ${G.gen} befinde sich ${B.nom} in einer akuten Lebenskrise, etwa durch Arbeitsplatzverlust, Schulden oder eine Kränkung.`, (G, B) => `Es ist von einer akuten Belastungssituation ${B.gen} auszugehen.`, 'Akute Belastungen senken die Hemmschwelle und machen weitere Übergriffe wahrscheinlicher.'],
    ['wohnung', 'lage', 'Gemeinsame Wohnung, kein Ausweichen', () => 'Die Beteiligten leben in derselben Wohnung.', (G, B) => `Nach Angaben ${G.gen} lebe ${G.er} mit ${B.dat} in derselben Wohnung.`, () => 'Es ist davon auszugehen, dass die Beteiligten in derselben Wohnung leben.', 'Ohne räumliche Trennung träfen die Beteiligten unmittelbar wieder aufeinander.'],
    ['rausch', 'bsp', 'Alkohol- oder Drogeneinfluss', (G, B) => `Bei ${B.dat} ergaben sich Anzeichen für eine Beeinflussung durch Alkohol bzw. andere berauschende Mittel.`, (G, B) => `Nach Angaben ${G.gen} komme es unter Alkohol- bzw. Drogeneinfluss ${B.gen} regelmäßig zu Übergriffen.`, (G, B) => `Es ist von einer Beeinflussung ${B.gen} durch Alkohol bzw. andere berauschende Mittel auszugehen.`, 'Alkohol und Drogen senken die Hemmschwelle und begünstigen weitere Übergriffe.'],
    ['waffenzugang', 'bsp', 'Waffenbesitz oder Zugang zu Waffen', (G, B) => `${cap(B.nom)} verfügt nach polizeilichen Erkenntnissen über Waffen bzw. eine waffenrechtliche Erlaubnis.`, (G, B) => `Nach Angaben ${G.gen} habe ${B.nom} Zugang zu Waffen.`, (G, B) => `Es ist davon auszugehen, dass ${B.nom} Zugang zu Waffen hat.`, 'Der Zugang zu Waffen erhöht die Gefahr schwerer und tödlicher Gewalt erheblich.'],
    ['aggressiv', 'bsp', 'Aggressiv auch vor der Polizei', (G, B) => `${cap(B.nom)} verhielt sich auch in Gegenwart der Einsatzkräfte aggressiv und ließ sich kaum beruhigen.`, (G, B) => `Nach Angaben ${G.gen} reagiere ${B.nom} schnell aggressiv.`, (G, B) => `Es ist von einer erheblichen Aggressivität ${B.gen} auszugehen.`, 'Wer sich selbst in Gegenwart der Polizei nicht zurücknimmt, wird sich ohne sie erst recht nicht zurücknehmen.'],
    ['uneinsichtig', 'bsp', 'Uneinsichtig, gibt der geschädigten Person die Schuld', (G, B) => `${cap(B.nom)} zeigte sich gegenüber den Einsatzkräften uneinsichtig und gab ${G.dat} die Schuld an dem Geschehen.`, (G, B) => `Nach Angaben ${G.gen} gebe ${B.nom} ${G.dat} regelmäßig die Schuld an den Auseinandersetzungen.`, (G, B) => `Es ist davon auszugehen, dass ${B.nom} kein Unrechtsbewusstsein hat.`, 'Fehlende Einsicht lässt nicht erwarten, dass sich das Verhalten von selbst ändert.'],
    ['psych', 'bsp', 'Psychische Ausnahmesituation', (G, B) => `${cap(B.nom)} befand sich erkennbar in einer psychischen Ausnahmesituation.`, (G, B) => `Nach Angaben ${G.gen} befinde sich ${B.nom} in einer psychischen Krise.`, (G, B) => `Es ist von einer psychischen Ausnahmesituation ${B.gen} auszugehen.`, 'Eine akute psychische Krise macht das Verhalten schwer vorhersehbar und kann die Gefahr erhöhen.'],
    ['widerstand', 'bsp', 'Widerstand gegen die Einsatzkräfte', (G, B) => `${cap(B.nom)} leistete Widerstand gegen die Einsatzkräfte.`, (G, B) => `Nach Angaben ${G.gen} habe sich ${B.nom} schon früher gegen polizeiliche Maßnahmen gewehrt.`, (G, B) => `Es ist davon auszugehen, dass sich ${B.nom} polizeilichen Anordnungen widersetzt.`, 'Gewalt selbst gegenüber Einsatzkräften zeigt eine sehr niedrige Hemmschwelle.'],
    ['angst', 'opf', 'Angst vor weiterer Gewalt', (G) => `${cap(G.nom)} wirkte auf die Einsatzkräfte erkennbar verängstigt.`, (G) => `${cap(G.nom)} äußerte Angst vor weiteren Übergriffen.`, (G) => `Es ist davon auszugehen, dass ${G.nom} weitere Übergriffe befürchtet.`, 'Die Einschätzung der gefährdeten Person ist ein wichtiger Hinweis auf die tatsächliche Gefahr.'],
    ['toetung', 'opf', 'Hält eine Tötung für möglich', (G, B) => `${cap(G.nom)} äußerte gegenüber den Einsatzkräften, ${G.er} halte ${B.akk} für fähig, ${G.ihn} zu töten.`, (G, B) => `${cap(G.nom)} äußerte, ${G.er} halte ${B.akk} für fähig, ${G.ihn} zu töten.`, (G, B) => `Es ist davon auszugehen, dass ${G.nom} ${B.akk} für fähig hält, ${G.ihn} zu töten.`, 'Hält die gefährdete Person eine Tötung für möglich, ist das ein ernstzunehmendes Warnsignal.'],
    ['ausweg', 'opf', 'Kann nicht ausweichen (Kinder, Gesundheit, Unterkunft)', (G) => `${cap(G.nom)} hat keine Möglichkeit, kurzfristig anderweitig unterzukommen.`, (G) => `Nach Angaben ${G.gen} habe ${G.er} keine Möglichkeit, kurzfristig anderweitig unterzukommen.`, (G) => `Es ist davon auszugehen, dass ${G.nom} nicht anderweitig unterkommen kann.`, 'Der gefährdeten Person ist ein Ausweichen nicht zuzumuten bzw. nicht möglich; Schutz bietet nur die räumliche Trennung.']
  ];
  /**
   * Bewertende Sätze wie in der Vorlage – erscheinen in der Reihenfolge des Antippens.
   * [Schlüssel, Gruppe, Beschriftung, Satz(G, B, X), nur mit Kindern]. X: gd = „seiner Ehefrau“ / „der Geschädigten“,
   * K = „ und der gemeinsamen Kinder“, KN = „ und den Kindern“, DK = „der Kinder“ / „des Kindes“, DIE = „die Kinder“ / „das Kind“, wohnt.
   */
  const BEW_GRUPPEN = [['haltung', 'Haltung und Verhalten'], ['wdh', 'Wiederholung und Eskalation'], ['ohne', 'Was ohne Maßnahme droht']];
  const BEW = [
    ['naehe', 'ohne', 'Wird die Nähe suchen (Familie, Kinder)', (G, B, X) => `Aufgrund der familiären Strukturen${X.K} ist davon auszugehen, dass ${B.er} die Nähe zu ${X.gd}${X.KN} suchen wird.`],
    ['legitim', 'haltung', 'Sieht Gewalt als legitimes Mittel', (G, B, X) => `${cap(B.sein)} Verhalten sowie ${B.sein}e Äußerungen deuten darauf hin, dass ${B.er} Gewalt als legitimes Mittel betrachtet, ${X.gd} aufzuzeigen, wie ${G.er} zu leben hat.`],
    ['skrupel', 'haltung', 'Kinder hielten nicht ab (Skrupellosigkeit)', (G, B, X) => `Die Anwesenheit ${X.DK} hielt ${B.ihn} nicht von der Tatausführung ab, was ${B.sein}e Skrupellosigkeit unterstreicht.`, true],
    ['besitz', 'haltung', 'Besitzanspruch, duldet keine eigenen Entscheidungen', (G, B, X) => `${cap(B.sein)} Verhalten ist von einem ausgeprägten Besitzanspruch gegenüber ${X.gd} geprägt; ${B.er} akzeptiert nicht, dass ${G.er} eigene Entscheidungen trifft.`],
    ['anlass', 'haltung', 'Nichtiger Anlass, niedrige Hemmschwelle', (G, B) => `Die Tat erfolgte aus nichtigem Anlass, was auf eine niedrige Hemmschwelle ${B.gen} schließen lässt.`],
    ['verantwortung', 'haltung', 'Sieht die Schuld bei der geschädigten Person', (G, B) => `${cap(B.er)} sah die Verantwortung für das Geschehen allein bei ${G.dat} und zeigte keinerlei Einsicht.`],
    ['opferrolle', 'haltung', 'Verharmlost, stellt sich als Opfer dar', (G, B) => `${cap(B.er)} verharmloste das Geschehen und stellte sich selbst als Opfer dar.`],
    ['unbeeindruckt', 'haltung', 'Von der Polizei unbeeindruckt', (G, B) => `Die Anwesenheit der Einsatzkräfte beeindruckte ${B.ihn} erkennbar nicht.`],
    ['beruhigen', 'haltung', 'Auch vor der Polizei kaum zu beruhigen', (G, B) => `${cap(B.er)} war auch in Gegenwart der Einsatzkräfte kaum zu beruhigen, sodass mit einer unmittelbaren Fortsetzung der Auseinandersetzung zu rechnen war.`],
    ['phaenomen', 'wdh', 'Häusliche Gewalt als Wiederholungstat', () => 'Häusliche Gewalt ist erfahrungsgemäß kein einmaliges Ereignis; sie wiederholt sich regelmäßig und nimmt dabei häufig an Intensität zu.'],
    ['eskalation', 'wdh', 'Deutliche Eskalation gegenüber früher', () => 'Das heutige Geschehen zeigt eine deutliche Eskalation gegenüber früheren Auseinandersetzungen.'],
    ['wirkungslos', 'wdh', 'Frühere Maßnahmen wirkungslos', (G, B) => `Bereits frühere polizeiliche Maßnahmen haben ${B.ihn} nicht von weiteren Übergriffen abgehalten.`],
    ['alkmuster', 'wdh', 'Übergriffe regelmäßig unter Alkohol', () => 'Die Übergriffe ereignen sich nach den vorliegenden Erkenntnissen regelmäßig unter Alkoholeinfluss; eine Änderung des Konsumverhaltens ist nicht absehbar.'],
    ['konflikt', 'wdh', 'Konflikt besteht fort', () => 'Der Konflikt, der der Tat zugrunde liegt, ist nicht ausgeräumt und besteht fort.'],
    ['sachschaden', 'wdh', 'Sachschäden zeugen von Aggression', () => 'Die Sachschäden in der Wohnung zeugen von einer erheblichen Aggression.'],
    ['aufsuchen', 'ohne', 'Würde nach Abrücken erneut aufsuchen', (G, B) => `Es ist davon auszugehen, dass ${B.er} ${G.akk} nach dem Abrücken der Einsatzkräfte erneut aufsuchen würde.`],
    ['nacht', 'ohne', 'Noch in derselben Nacht gefährdet', (G) => `Ohne die Maßnahme wäre ${G.nom} noch in derselben Nacht weiteren Übergriffen ausgesetzt gewesen.`],
    ['rache', 'ohne', 'Vergeltung für den Polizeieinsatz zu befürchten', (G, B) => `Es ist zu befürchten, dass ${B.er} ${G.dat} das Hinzuziehen der Polizei anlastet und sich hierfür an ${G.ihm} rächen wird.`],
    ['einwirken', 'ohne', 'Wird auf Aussage oder Antrag einwirken', (G, B) => `Es ist zu befürchten, dass ${B.er} auf ${G.akk} einwirken wird, um ${G.ihn} von einer Aussage oder einem Antrag nach dem Gewaltschutzgesetz abzuhalten.`],
    ['trennungnicht', 'ohne', 'Akzeptiert die Trennung nicht', (G, B) => `${cap(B.er)} akzeptiert die Trennung bzw. die Trennungsabsicht ${G.gen} nicht, sodass gerade in dieser Phase mit einer Zuspitzung zu rechnen ist.`],
    ['druckmittel', 'ohne', 'Kinder als Druckmittel zu befürchten', (G, B, X) => `Es ist zu befürchten, dass ${B.er} ${X.DIE} als Druckmittel einsetzt, um den Kontakt zu ${G.dat} zu erzwingen.`, true],
    ['unterlegen', 'ohne', 'Körperlich deutlich unterlegen', (G, B) => `${cap(G.nom)} ist ${B.dat} körperlich deutlich unterlegen und kann sich gegen weitere Angriffe nicht wirksam zur Wehr setzen.`],
    ['schutzlos', 'ohne', 'Ohne Maßnahme schutzlos', (G, B, X) => `Ohne die Maßnahme wäre ${G.nom} schutzlos, da ${X.wohnt ? `${G.er} mit ${B.dat} in derselben Wohnung lebt` : `${B.nom} jederzeit Zugang zur Wohnung hat`}.`]
  ];
  const EINORD = [['beziehung', 'Gewaltbeziehung – wiederholte Übergriffe'], ['ersttat', 'Ersttat von hoher Intensität'], ['weder', 'Weder noch']];
  const ABSCHNITTE = [['ein', 'Eintreffsituation', '2'], ['gs', 'Maßnahmen gegenüber der geschädigten Person', '4'], ['bs', 'Maßnahmen gegenüber der beschuldigten Person', '5'], ['prog', 'Gefahrenprognose', '6'], ['sonst', 'Weitere Maßnahmen/Sonstiges', '7']];

  /* ======================= Übernahme älterer Eingaben ======================= */
  /** Erste Fassung dieses Moduls (sonst.*, prog.f, ein.weint, kinder.bsLebt) in die neue Ordnung übernehmen – null, wenn nichts zu tun ist. */
  function upgrade(d) {
    if (!d || typeof d !== 'object' || (!d.sonst && !getPath(d, 'prog.f') && !getPath(d, 'ein.weint') && !getPath(d, 'kinder.bsLebt') && getPath(d, 'ein.erw') !== 'tuer')) return null;
    const o = JSON.parse(JSON.stringify(d)), s = o.sonst || {};
    const add = (path, v) => { const a = arr(getPath(o, path)); if (!a.includes(v)) setPath(o, path, [...a, v]); };
    if (getPath(o, 'ein.weint')) { add('ein.verb', 'weint'); delete o.ein.weint; }
    if (getPath(o, 'ein.erw') === 'tuer') o.ein.erw = 'ja';
    if (getPath(o, 'kinder.bsLebt')) { if (o.kinder.bsLebt === 'nein') setPath(o, 'bs.wohnt', 'nein'); delete o.kinder.bsLebt; }
    if (o.sonst) {
      if (arr(s.kind).length && !arr(getPath(o, 'kinder.wirk')).length) setPath(o, 'kinder.wirk', arr(s.kind));
      if (s.schlafen) add('kinder.wo', 'schliefen');
      if (s.weiter === 'anregen') setPath(o, 'weiter.ja', 'anregen'); else if (s.weiter === 'ja') setPath(o, 'weiter.ja', 'jugendamt');
      if (s.doku) { if (s.dokuAn === 'gs') add('gsm.h', 'doku'); else setPath(o, 'bsm.doku', true); }
      if (s.best && !getPath(o, 'bsm.best')) setPath(o, 'bsm.best', s.best === 'hinterlegt' ? undefined : s.best);
      if (s.ga === 'durch') setPath(o, 'bsm.ga', true); else if (s.ga === 'veranl') setPath(o, 'weiter.ga', true);
      if (has(s.text)) setPath(o, 'weiter.text', s.text);
      delete o.sonst;
    }
    const f = arr(getPath(o, 'prog.f'));
    if (f.length) {
      const zuBew = { naehe: 'naehe', legitim: 'legitim', kinderAnw: 'skrupel', wohnung: 'schutzlos' };
      const zuMk = { wiederholt: ['frueher', 'angabe'], verstoss: ['verstoss', 'angabe'], intensitaet: ['intensitaet', 'fest'], hals: ['wuergen', 'angabe'], waffe: ['waffe', 'angabe'], drohung: ['drohung', 'angabe'], uneinsichtig: ['uneinsichtig', 'fest'], rausch: ['rausch', 'fest'], kontrolle: ['kontrolle', 'angabe'], trennung: ['trennung', 'angabe'] };
      for (const k of f) {
        if (zuBew[k]) add('prog.bew', zuBew[k]);
        else if (zuMk[k]) setPath(o, 'prog.m.' + zuMk[k][0], zuMk[k][1]);
        else if (k === 'vorerk') add('prog.vorg', 'einsaetze');
        else if (k === 'schutzanordnung') add('prog.vorg', 'gewschg');
      }
    }
    if (o.prog) delete o.prog.f;
    return o;
  }

  /* ======================= Text ======================= */
  const kinderN = d => { const n = Number(getPath(d, 'kinder.n')); return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 0; };
  const kinderDa = d => kinderN(d) > 0 && !arr(getPath(d, 'kinder.wo')).includes('nichtda');
  const wvArt = d => getPath(d, 'bsm.wv') || '';
  const wvJa = d => ['wvrv', 'rv'].includes(wvArt(d));
  const dauer = d => (getPath(d, 'bsm.dauer') === 'kuerzer' ? 'kuerzer' : '14');
  const anordTag = d => str(getPath(d, 'bsm.datum')) || str(getPath(d, 'einsatz.datum'));
  /** Ende mit Ablauf des 14. Tages nach der Anordnung (§ 34a Abs. 5 PolG NRW) bzw. dem kürzer festgelegten Tag. */
  const wvEnde = d => (dauer(d) === 'kuerzer' ? str(getPath(d, 'bsm.ende')) : addTage(anordTag(d), 14));
  /** „mit A, B sowie mit C“ */
  const sowieMit = l => (l.length === 1 ? l[0] : l.slice(0, -1).join(', ') + ' sowie mit ' + l[l.length - 1]);
  const gemWohnung = d => (bsWohnt(d) ? 'die gemeinsame Wohnung' : 'die Wohnung');

  /** 2 Eintreffsituation – was beim Eintreffen festgestellt wurde: Personen, Tatort, Kinder. */
  function eintreffen(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), e = d.ein || {}, o = d.ort || {}, k = d.kinder || {};
    const p1 = [], p2 = [], p3 = [], p4 = [];
    // Ankunft
    const vor = pick(VORHER, e.vorher);
    if (vor.length) p1.push(`Bereits vor der Wohnungstür ${vor.length === 1 && !VORHER_PL.includes(vor[0][0]) ? 'war' : 'waren'} ${joinUnd(vor.map(x => x[2]))} zu hören.`);
    else if (arr(e.vorher).includes('ruhe')) p1.push('Vor der Wohnungstür war es ruhig.');
    const erw = ERWARTET.find(x => x[0] === (e.erw === 'tuer' ? 'ja' : e.erw));
    if (erw && erw[0] !== 'nein') p1.push(`Bei unserem Eintreffen wurden wir von ${G.dat}${erw[2] ? ' ' + erw[2] : ''} erwartet.`);
    let gsSubjekt = false;
    const hinein = e.hinein ? ' und bat uns hinein' : '';
    if (e.oeff === 'gs') { p1.push(`${G.Nom} öffnete die Tür der Wohnung${hinein}.`); gsSubjekt = true; }
    else if (e.oeff === 'bs') p1.push(`${B.Nom} öffnete die Tür der Wohnung${hinein}.`);
    else if (e.oeff === 'kind') p1.push(`Ein Kind öffnete die Tür der Wohnung${hinein}.`);
    else if (e.oeff === 'dritte') p1.push(`${has(e.oeffWer) ? cap(ohnePunkt(e.oeffWer)) : 'Eine dritte Person'} öffnete die Tür der Wohnung${hinein}.`);
    else if (e.oeff === 'offen') p1.push('Die Wohnungstür stand offen.');
    else if (e.oeff === 'niemand') p1.push('Auf Klingeln und Klopfen öffnete zunächst niemand.');
    // Geschädigte Person
    const wirk = pick(WIRKT, e.wirk).map(x => x[1]);
    const verb = pick(GS_VERB, e.verb).map(x => x[1].replace('zur beschuldigten Person', `zu ${B.dat}`));
    const teile = [...(wirk.length ? [`wirkte ${joinUnd(wirk)}`] : []), ...verb, ...(has(e.wirkText) ? [ohnePunkt(e.wirkText)] : [])];
    if (teile.length) { p1.push(`${gsSubjekt ? G.Er : G.Nom} ${joinUnd(teile)}.`); gsSubjekt = true; }
    if (has(e.sicht)) p1.push(`Bereits beim Eintreffen war bei ${gsSubjekt ? G.ihm : G.dat} erkennbar: ${ohnePunkt(e.sicht)}.`);
    // Beschuldigte Person
    const wo = bsWohnt(d) ? 'in der gemeinsamen Wohnung' : 'in der Wohnung';
    if (e.bsDa === 'weg') p2.push(`${B.Nom} war zum Zeitpunkt der Sachverhaltsaufnahme nicht mehr vor Ort. Auf Nachfrage gab ${G.nom} an, dass ${B.nom} die Wohnung vor dem Eintreffen der Beamten verlassen habe.`);
    else if (e.bsDa === 'da') p2.push(`${B.Nom} war zum Zeitpunkt der Sachverhaltsaufnahme ebenfalls ${wo} und wurde dort getrennt von ${G.dat} zum Sachverhalt befragt.`);
    else if (e.bsDa === 'nah') p2.push(`${B.Nom} hatte die Wohnung vor dem Eintreffen der Beamten verlassen und wurde ${has(e.bsNahWo) ? ohnePunkt(e.bsNahWo) : 'im Nahbereich'} angetroffen.`);
    if (e.bsDa === 'da' || e.bsDa === 'nah') {
      const bw = pick(BS_WIRKT, e.bsWirk).map(x => x[1]);
      const bv = pick(BS_VERB, e.bsVerb).map(x => x[1].replace('die geschädigte Person', G.akk).replace('der geschädigten Person', G.dat));
      const bt = [...(bw.length ? [`wirkte ${joinUnd(bw)}`] : []), ...bv, ...(has(e.bsText) ? [ohnePunkt(e.bsText)] : [])];
      if (bt.length) p2.push(`${B.Er} ${joinUnd(bt)}.`);
    }
    // Tatort
    const etagenhaus = !o.art || MIT_ETAGE.includes(o.art);
    if (has(d.fam) || has(o.str) || o.art) {
      p3.push(`Bei dem Tatort handelt es sich um ${etagenhaus ? 'die Wohnung' : 'das Wohnhaus'} der Familie ${str(d.fam) || '[Name]'}.`);
      const geb = GEBAEUDE.find(([x]) => x === o.art);
      p3.push(`Bei dem Wohnhaus handelt es sich um ${geb ? geb[2] : '[Gebäudeart]'} an der Anschrift ${str(o.str) || '[Straße Hausnummer]'}, in ${str(o.plz) || '[PLZ Ort]'}.`);
      if (o.art && MIT_ETAGE.includes(o.art)) {
        const et = o.etage === 'eg' ? 'im Erdgeschoss' : o.etage === 'dg' ? 'im Dachgeschoss' : o.etage === 'ug' ? 'im Souterrain' : has(o.etage) ? `im ${o.etage}. Obergeschoss` : 'im [Geschoss]';
        const lage = LAGE.find(([x]) => x === o.lage);
        p3.push(`Die Wohnung der Familie befindet sich ${et}${lage ? (lage[0] === 'mitte' ? ' in der Mitte' : ' ' + lage[1]) : ''}.`);
      }
    }
    const zust = ZUSTAND.find(([x]) => x === o.zustand);
    if (zust) p3.push(`Die Wohnung wirkte ${zust[1]}.`);
    const sp = [...pick(SPUREN, o.spuren).map(x => x[1]), ...arr(o.spurenFrei).map(ohnePunkt).filter(Boolean)];
    if (sp.length) p3.push(`Es waren Spuren einer Auseinandersetzung erkennbar: ${joinUnd(sp)}.`);
    if (has(o.text)) p3.push(satzEnde(o.text));
    // Kinder
    const n = kinderN(d);
    if (has(k.n) && Number(k.n) === 0) p4.push('Im Haushalt leben keine Kinder.');
    else if (n) {
      const eins = n === 1, mitBs = bsWohnt(d) ? ` und ${B.dat}` : '';
      const art = k.art === 'gs' ? (eins ? `Kind ${G.gen}` : `Kinder ${G.gen}`) : k.art === 'bs' ? (eins ? `Kind ${B.gen}` : `Kinder ${B.gen}`) : (eins ? 'gemeinsames Kind' : 'gemeinsame Kinder');
      p4.push(`${etagenhaus ? 'In der Wohnung' : 'Im Haushalt'} ${eins ? 'lebt' : 'leben'} neben ${G.dat}${mitBs} ${eins ? 'ein Kind' : ZAHL[n] + ' Kinder'}${has(k.alter) ? ` (${art}: ${ohnePunkt(k.alter)} J.)` : k.art ? ` (${art})` : ''}.`);
      const Pron = eins ? 'Es' : 'Sie', w = arr(k.wo);
      let genannt = false;
      const Die = () => { const r = genannt ? Pron : (eins ? 'Das Kind' : 'Die Kinder'); genannt = true; return r; };
      const v = (sg, pl) => (eins ? sg : pl);
      if (w.includes('nichtda')) p4.push(`${Die()} ${v('befand', 'befanden')} sich zum Zeitpunkt des Einsatzes nicht in der Wohnung${has(k.woText) ? ' (' + ohnePunkt(k.woText) + ')' : ''}.`);
      else {
        if (w.includes('schliefen')) p4.push(`${Die()} ${v('schlief', 'schliefen')} während des Einsatzes.`);
        if (w.includes('zimmer')) p4.push(`${Die()} ${v('hielt', 'hielten')} sich im Kinderzimmer auf.`);
        if (w.includes('beigs')) p4.push(`${Die()} ${v('befand', 'befanden')} sich bei ${G.dat}.`);
        if (w.includes('versteckt')) p4.push(`${Die()} ${v('hatte', 'hatten')} sich versteckt.`);
        if (w.includes('miterlebt')) p4.push(`Nach Angaben ${G.gen} ${v('hat', 'haben')} ${eins ? 'das Kind' : 'die Kinder'} das Geschehen miterlebt.`);
        const kw = pick(KIND_WIRK, k.wirk).map(x => x[1]);
        const kv = pick(KIND_VERB, k.verb).map(x => (eins ? x[2] : x[3]).replace('{G}', G.akk));
        if (kw.length) {
          const ueber = kw.includes(KIND_WIRK[0][1]), rest = kw.filter(x => x !== KIND_WIRK[0][1]);
          p4.push(`${Die()} ${v('wirkte', 'wirkten')} ${ueber && rest.length ? `sichtlich überfordert mit der Situation, ${v('es war', 'sie waren')} ${joinUnd(rest)}` : joinUnd(kw)}.`);
        }
        if (kv.length) p4.push(`${Die()} ${joinUnd(kv)}.`);
      }
      if (has(k.text)) p4.push(satzEnde(k.text));
    }
    return [p1.join(' '), p2.join(' '), p3.join(' '), p4.join(' ')].filter(Boolean).join('\n');
  }

  /** 4 Maßnahmen gegenüber der geschädigten Person – Hinweise, Unterlagen, Verbleib. */
  function opferText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), h = arr(getPath(d, 'gsm.h')), t = [], wv = wvJa(d);
    const Wem = () => (t.length ? G.ihm : G.dat), Wer = () => (t.length ? G.Er : G.Nom), WemG = () => (t.length ? cap(G.ihm) : G.Dat);
    if (h.includes('erl')) t.push(`${G.Dat} wurde das Vorgehen der Polizei bei der Annahme einer häuslichen Gewalt erläutert.`);
    if (h.includes('schutz')) t.push(`Die Möglichkeit der Beantragung einer Schutzanordnung nach dem Gewaltschutzgesetz bei dem zuständigen Amtsgericht wurde ${Wem()} eröffnet.`);
    if (h.includes('verl') && wv) t.push(`${Wer()} wurde darauf hingewiesen, dass sich das Rückkehrverbot bei einem solchen Antrag während seiner Dauer bis zur gerichtlichen Entscheidung, längstens um weitere 14 Tage, verlängert.`);
    const hilfe = h.includes('hilfe'), rueck = h.includes('rueck') && wv;
    const zudem = t.length ? `Zudem wurden ${G.ihm}` : `${G.Dat} wurden`;
    if (hilfe && rueck) t.push(`${zudem} Hilfsangebote von Opferschutzstellen wie z. B. dem Hilfetelefon aufgezeigt sowie Handlungsempfehlungen gegeben, sollte ${B.nom} trotz Rückkehrverbot ${gemWohnung(d)} aufsuchen.`);
    else if (hilfe) t.push(`${zudem} Hilfsangebote von Opferschutzstellen wie z. B. dem Hilfetelefon aufgezeigt.`);
    else if (rueck) t.push(`${Wer()} erhielt Handlungsempfehlungen für den Fall, dass ${B.nom} trotz Rückkehrverbot ${gemWohnung(d)} aufsucht.`);
    if (h.includes('beratung')) t.push(`${WemG()} wurde ${has(getPath(d, 'gsm.stelle')) ? str(getPath(d, 'gsm.stelle')) : 'eine Beratungsstelle'} als Ansprechpartner benannt.`);
    if (h.includes('daten')) t.push(`${Wer()} willigte ein, dass ${G.sein}e Kontaktdaten an eine Beratungsstelle übermittelt werden.`);
    if (h.includes('notruf')) t.push(`${Wer()} wurde darauf hingewiesen, bei einer Rückkehr ${B.gen} sofort den Notruf 110 zu wählen.`);
    if (h.includes('schloss')) t.push(`Ein Austausch des Wohnungsschlosses wurde ${Wem()} empfohlen.`);
    const unterlagen = [h.includes('merkblatt') ? 'ein Merkblatt mit Informationen für Opfer häuslicher Gewalt' : '', h.includes('doku') ? 'das Dokument „Häusliche Gewalt – Dokumentation über den Polizeieinsatz bei häuslicher Gewalt“' : ''].filter(Boolean);
    if (unterlagen.length) t.push(`${Wer()} erhielt ${joinUnd(unterlagen)}.`);
    if (h.includes('rechte')) t.push(`${Wer()} wurde über ${G.sein}e Rechte als ${G.verletzt} im Strafverfahren informiert.`);
    const vb = getPath(d, 'gsm.verbleib'), mitK = kinderDa(d) ? (kinderN(d) === 1 ? ' mit dem Kind' : ' mit den Kindern') : '';
    if (vb === 'wohnung') t.push(`${Wer()} verbleibt${mitK} in der Wohnung.`);
    else if (vb === 'schutz') t.push(`${Wer()} wurde${mitK} in einer Schutzeinrichtung untergebracht.`);
    else if (vb === 'dritte') t.push(`${Wer()} kommt${mitK} vorübergehend bei Angehörigen bzw. Bekannten unter.`);
    if (has(getPath(d, 'gsm.text'))) t.push(satzEnde(getPath(d, 'gsm.text')));
    return t.join(' ');
  }

  /** 5 Maßnahmen gegenüber der beschuldigten Person – Anhörung, Anordnung, Vollzug, Zustellung, Ansprache. */
  function taeterText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), m = d.bsm || {}, t = [], art = wvArt(d), wv = wvJa(d);
    if (m.erkl) t.push(`Das polizeiliche Handeln bei dem Vorliegen einer häuslichen Gewalt wurde ${B.dat} zuvor erklärt.`);
    if (m.anh && wv) t.push(`Vor der Anordnung wurde ${B.dat} Gelegenheit gegeben, sich zu den Vorwürfen und zu der beabsichtigten Maßnahme zu äußern${has(m.anhText) ? `; ${B.er} äußerte, ${ohnePunkt(m.anhText)}` : ''}.`);
    // Wann, durch wen, bis wann – bei der Wohnungsverweisung als eigener Satz, beim Rückkehrverbot im Anordnungssatz
    const tag = anordTag(d), ende = wvEnde(d);
    const wann = [has(m.zeit) ? (has(tag) ? `am ${fmtDatum(tag)} um ${str(m.zeit)} Uhr` : `um ${str(m.zeit)} Uhr`) : '', has(m.von) ? `durch ${str(m.von)}` : ''].filter(Boolean).join(' ');
    const rvTxt = dauer(d) === 'kuerzer' ? 'ein Rückkehrverbot' : 'ein 14-tägiges Rückkehrverbot';
    if (art === 'wvrv') {
      const reakt = m.reakt === 'halten' ? ' und gab an, die Maßnahmen verstanden zu haben und sich an das Rückkehrverbot halten zu wollen' : m.reakt === 'verstanden' ? ' und gab an, die Maßnahmen verstanden zu haben' : m.reakt === 'uneinsichtig' ? `; ${B.er} zeigte sich uneinsichtig` : m.reakt === 'widerspruch' ? ' und widersprach den Maßnahmen' : '';
      t.push(`${B.Nom} erhielt eine Wohnungsverweisung und ${rvTxt} (§ 34a PolG NRW)${reakt}.`);
      if (wann || has(ende)) t.push(`Die Maßnahmen wurden${wann ? ' ' + wann : ''} angeordnet${has(ende) ? ` und enden mit Ablauf des ${fmtDatum(ende)}` : ''}.`);
    } else if (art === 'rv') {
      t.push(`Gegen ${B.akk} wurde${wann ? ' ' + wann : ''} ${rvTxt} angeordnet (§ 34a PolG NRW)${has(ende) ? `, das mit Ablauf des ${fmtDatum(ende)} endet` : ''}.`);
      if (m.bekannt === 'tel') t.push(`Es wurde ${B.ihm} telefonisch bekanntgegeben.`);
      else if (m.bekannt === 'pers') t.push(`Es wurde ${B.ihm} persönlich bekanntgegeben.`);
      else if (m.bekannt === 'nein') t.push(`Es konnte ${B.ihm} noch nicht bekanntgegeben werden; dies erfolgt, sobald ${B.er} angetroffen wird.`);
    } else if (art === 'keine') {
      t.push(`Von einer Wohnungsverweisung mit Rückkehrverbot wurde abgesehen${has(m.keinGrund) ? ', weil ' + ohnePunkt(m.keinGrund) : ''}.`);
    }
    if (wv) {
      // Räumlicher Bereich
      const ber = [...pick(BEREICH, m.bereich).map(x => x[2]), ...(has(m.bereichFrei) ? [ohnePunkt(m.bereichFrei)] : [])];
      if (ber.length) {
        const adr = has(getPath(d, 'ort.str')) ? ` an der Anschrift ${str(getPath(d, 'ort.str'))}` : '';
        const erst = ber[0] === 'die Wohnung' ? ber[0] + adr : '';
        const rest = erst ? ber.slice(1) : ber;
        t.push(`Räumlich ${art === 'rv' ? 'umfasst es' : 'umfassen sie'} ${erst}${erst && rest.length ? ' sowie ' : ''}${joinUnd(rest)}${erst ? '' : adr}.`);
      }
      if (has(m.reaktText)) t.push(`${B.Er} äußerte, ${ohnePunkt(m.reaktText)}.`);
      const inh = pick(INHALT, m.inh).map(x => x[2]);
      if (inh.length) t.push(`Die benannten Anordnungen erfolgten ${art === 'rv' && m.bekannt === 'tel' ? 'telefonisch' : 'mündlich'}, mit ${sowieMit(inh)}.`);
      if (has(m.zg)) t.push(`Die Androhung eines Zwangsgeldes i. H. v. ${fmtEuro(m.zg)}${m.zgFall !== false ? ' für jeden Fall der Zuwiderhandlung' : ''} ist erfolgt.${m.ersatz ? ' Auf die Möglichkeit der Ersatzzwangshaft wurde hingewiesen.' : ''}`);
      if (m.gegenst) t.push(`${B.Dat} wurde die Gelegenheit gegeben, dringend benötigte Gegenstände des persönlichen Bedarfs mitzunehmen${has(m.gegenstText) ? ` (${ohnePunkt(m.gegenstText)})` : ''}.`);
      // Schlüssel
      if (m.schl) {
        t.push(`Zudem wurde ${B.nom} dazu aufgefordert, ${B.sein}en Wohnungsschlüssel auszuhändigen.`);
        const anz = Math.max(1, Math.min(10, Number(m.schlAnz) || 1)), mehr = anz > 1;
        if (m.schl === 'mit') t.push(`${B.Er} führte einen Schlüssel für ${gemWohnung(d)} mit sich. Der Schlüssel wurde an ${G.akk} übergeben.`);
        else if (m.schl === 'sicher') t.push(`${B.Er} händigte ${mehr ? ZAHL[anz] + ' Schlüssel' : 'einen Schlüssel'} aus, ${mehr ? 'die' : 'der'} nach § 43 Nr. 1 PolG NRW sichergestellt ${mehr ? 'wurden' : 'wurde'}${m.schlBesch ? `. Über die Sicherstellung wurde ${B.ihm} eine Bescheinigung ausgehändigt` : ''}.`);
        else if (m.schl === 'ohne') {
          if (m.durchs) t.push(`${B.Er} gab an, keinen mitzuführen, und wurde ${has(m.durchsVon) ? 'von ' + str(m.durchsVon) + ' ' : ''}mit ${B.sein}er Zustimmung nach dem Schlüssel durchsucht. ${m.gefunden === 'ja' ? `Dabei wurde ein Schlüssel aufgefunden und an ${G.akk} übergeben` : 'Ein Schlüssel wurde dabei nicht aufgefunden'}.`);
          else t.push(`${B.Er} gab an, keinen Schlüssel mit sich zu führen.`);
        }
      }
      // Aufenthalt / Zustellung (§ 34a Abs. 3)
      if (m.auf === 'anschrift') t.push(`${B.Er} gab gegenüber den Beamten an, dass ${B.er} sich für den Zeitraum des Rückkehrverbots an folgender Anschrift aufhalten werde: ${str(m.aufStr) || '[Straße Hausnummer]'}, in ${str(m.aufPlz) || '[PLZ Ort]'}.`);
      else if (m.auf === 'zbv') t.push(`${B.Er} benannte als zustellungsbevollmächtigte Person ${str(m.zbv) || '[Name, Anschrift]'}.`);
      else if (m.auf === 'keine') t.push(`${B.Er} gab gegenüber den Beamten nicht an, wo ${B.er} sich für die Zeit der Wohnungsverweisung aufhalten werde. Eine zustellungsbevollmächtigte Person wurde nicht benannt, sodass ${B.dat} mitgeteilt wurde, dass ein ausgefertigtes Exemplar der schriftlichen Bestätigung der mündlichen Polizeiverfügung ${has(m.wache) ? 'in ' + str(m.wache) : 'in [Dienststelle]'} hinterlegt wird.`);
      // Verlassen der Wohnung (nur bei Wohnungsverweisung vor Ort)
      if (art === 'wvrv') {
        const um = has(m.verlZeit) ? ` um ${str(m.verlZeit)} Uhr` : '';
        if (m.verl === 'freiwillig') t.push(`${B.Er} verließ die Wohnung${um} ohne Zwang${has(m.verlWohin) ? ' und begab sich nach eigenen Angaben ' + ohnePunkt(m.verlWohin) : ''}.`);
        else if (m.verl === 'zwang') t.push(`${B.Er} verließ die Wohnung${um} erst nach Anwendung unmittelbaren Zwangs.`);
        else if (m.verl === 'gewahrsam') t.push(`${B.Er} wurde${um} zur Durchsetzung der Wohnungsverweisung in Gewahrsam genommen (§ 35 Abs. 1 Nr. 4 PolG NRW).`);
      }
      // Schriftliche Bestätigung
      if (m.best === 'eb') t.push(`Die schriftliche Bestätigung der mündlichen Polizeiverfügung wurde ${B.dat} gegen Empfangsbekenntnis ausgehändigt.`);
      else if (m.best === 'zugestellt') t.push(`Die schriftliche Bestätigung der mündlichen Polizeiverfügung wurde ${B.dat} zugestellt.`);
      else if (m.best === 'verweigert') t.push(`Die Annahme der schriftlichen Bestätigung der mündlichen Polizeiverfügung verweigerte ${B.nom}.`);
      else if (m.best === 'nieder') t.push(`Der Vordruck „Benachrichtigung über die Niederlegung eines Schriftstückes“ ist für ${B.akk} gut sichtbar an der Wohnungstür hinterlassen worden.`);
    }
    if (m.doku) t.push(`Das Dokument „Häusliche Gewalt – Dokumentation über den Polizeieinsatz bei häuslicher Gewalt“ wurde ${B.dat} zugestellt.`);
    if (m.ga) t.push(`Eine Gefährderansprache wurde bei ${B.dat} durchgeführt. Hierzu wurde das Formular „Gefährderansprache“ gefertigt, welches dem Vorgang beiliegt.`);
    if (has(m.text)) t.push(satzEnde(m.text));
    return t.join(' ');
  }

  /** 6 Gefahrenprognose – Erkenntnislage, Einordnung, Umstände, Bewertung, Ergebnis. */
  function prognoseText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), pr = d.prog || {}, t = [], wv = wvJa(d);
    const n = kinderN(d), kn = kinderDa(d), eins = n === 1, gemeinsam = (getPath(d, 'kinder.art') || 'gemeinsam') === 'gemeinsam';
    const X = {
      gd: partnerDat(d), wohnt: bsWohnt(d),
      K: kn ? (gemeinsam ? (eins ? ' und des gemeinsamen Kindes' : ' und der gemeinsamen Kinder') : (eins ? ' und des Kindes im Haushalt' : ' und der Kinder im Haushalt')) : '',
      KN: kn ? (eins ? ' und dem Kind' : ' und den Kindern') : '',
      DK: eins ? 'des Kindes' : 'der Kinder', DIE: eins ? 'das Kind' : 'die Kinder'
    };
    // Erkenntnislage
    const v = arr(pr.vorg);
    if (v.includes('nicht')) t.push('Ein Datenabgleich war vor Ort nicht möglich.');
    else if (v.includes('keine')) t.push('Ein Datenabgleich (Kriminalakten, ViVA, IT-Anwendung „HG“) ergab keine Erkenntnisse.');
    else { const e = pick(VORG, v).map(x => x[2]); if (e.length) t.push(`Ein Datenabgleich (Kriminalakten, ViVA, IT-Anwendung „HG“) ergab ${joinUnd(e)}.`); }
    // Einordnung
    if (pr.einord === 'beziehung') t.push('Es handelt sich um eine Gewaltbeziehung, in der es bereits wiederholt zu Übergriffen gekommen ist.');
    else if (pr.einord === 'ersttat') t.push(`Auch wenn bislang keine früheren Übergriffe bekannt sind, ist aufgrund der Intensität des Angriffs, der Schwere der Verletzungen und des Verhaltens ${B.gen} mit einer jederzeitigen Wiederholung der Gewaltanwendung zu rechnen.`);
    // Umstände (Katalogreihenfolge), je mit Bedeutung
    const mk = (pr.m && typeof pr.m === 'object') ? pr.m : {}, mitBed = pr.bedAus !== true;
    for (const [k, , , fest, angabe, annahme, bed] of FAK) {
      const s = mk[k]; if (!s) continue;
      let satz = (s === 'fest' ? fest : s === 'angabe' ? angabe : annahme)(G, B);
      if (k === 'kinder' && eins) satz = satz.replace('befanden sich Kinder', 'befand sich ein Kind').replace('hätten die Kinder', 'habe das Kind').replace('die Kinder das Geschehen mitbekommen haben', 'das Kind das Geschehen mitbekommen hat');
      t.push(satz + (mitBed ? ' ' + bed : ''));
    }
    // Bewertende Sätze (Reihenfolge des Antippens)
    for (const k of arr(pr.bew)) {
      const it = BEW.find(x => x[0] === k); if (!it) continue;
      if (it[4] && !kn) continue;
      t.push(it[3](G, B, X));
    }
    if (has(pr.text)) t.push(satzEnde(pr.text));
    // Ergebnis und Abwägung
    const inhalt = t.length > 0;
    if (wv && inhalt && pr.gefahr !== false) t.push(`Nach alledem bestand eine gegenwärtige Gefahr für Leib, Leben bzw. Freiheit ${G.gen}.`);
    if (wv && pr.mild) t.push('Mildere, gleich wirksame Mittel – etwa eine Gefährderansprache oder ein Platzverweis – hätten eine Rückkehr in die Wohnung nicht verhindert.');
    if (wv && pr.zumutbar) t.push(`Es ist ${B.dat} zuzumuten, für die Dauer des Rückkehrverbots anderweitig unterzukommen.`);
    if (wv && pr.eigentum) t.push(`Dass ${B.nom} ${B.mieter} der Wohnung ist, steht der Maßnahme nicht entgegen.`);
    if (wv && pr.wille) t.push(`Dass ${G.nom} ${wvArt(d) === 'rv' ? 'ein Rückkehrverbot' : 'eine Wohnungsverweisung'} nicht wünschte, steht der Maßnahme nicht entgegen, da diese dem Schutz von Leib, Leben und Freiheit dient.`);
    if (inhalt && pr.schluss !== false) t.push(`Es ist davon auszugehen, dass es zu weiteren gleichgelagerten Delikten, ausgehend von ${B.dat}, kommen wird, sollten keine gerichtlichen Verfügungen von ${G.dat} erwirkt werden.`);
    return t.join(' ');
  }

  /** 7 Weitere Maßnahmen/Sonstiges – Folgemaßnahmen und Mitteilungen. */
  function sonstText(d) {
    const G = P(d, 'gs'), B = P(d, 'bs'), w = d.weiter || {}, t = [];
    const n = kinderN(d), eins = n === 1;
    if (n) {
      if (w.ja === 'anregen') t.push(`Der Sachverhalt sollte an die entsprechenden Stellen weitergeleitet werden, um ihn mit ${G.dat} und besonders mit ${eins ? 'dem Kind' : 'den Kindern'} aufzuarbeiten.`);
      else if (w.ja === 'jugendamt') t.push('Das Jugendamt wird über den Sachverhalt informiert.');
      else if (w.ja === 'bereitschaft') t.push(`Der Bereitschaftsdienst des Jugendamtes wurde${has(w.jaZeit) ? ` um ${str(w.jaZeit)} Uhr` : ''} verständigt.`);
    }
    if (w.kontrolle && wvJa(d)) t.push('Eine Überprüfung der Einhaltung des Rückkehrverbots wurde veranlasst.');
    if (w.streife) t.push('Eine verstärkte Bestreifung der Anschrift wurde veranlasst.');
    if (w.ga) t.push(`Die Durchführung einer Gefährderansprache bei ${B.dat} wurde veranlasst.`);
    if (w.lichtbild) t.push('Der Zustand der Wohnung wurde fotografisch dokumentiert; die Lichtbilder werden dem Vorgang beigefügt.');
    if (w.folge) t.push('Die nachfolgende Schicht wurde über den Sachverhalt und die getroffenen Maßnahmen informiert.');
    if (has(w.text)) t.push(satzEnde(w.text));
    return t.join(' ');
  }

  const TEXTE = { ein: eintreffen, gs: opferText, bs: taeterText, prog: prognoseText, sonst: sonstText };
  const nrOf = (d, k) => { const v = getPath(d, 'nr.' + k); return v === undefined ? ABSCHNITTE.find(a => a[0] === k)[2] : str(v).replace(/[^\d.]/g, '').replace(/\.+$/, ''); };
  /** Überschrift mit Rolle in der passenden Form: „Maßnahmen gegenüber der Geschädigten“. */
  function titel(d, k) {
    if (k === 'gs') return `Maßnahmen gegenüber ${P(d, 'gs').dat}`;
    if (k === 'bs') return `Maßnahmen gegenüber ${P(d, 'bs').dat}`;
    return ABSCHNITTE.find(a => a[0] === k)[1];
  }
  function abschnitt(d, k) { const nr = nrOf(d, k), body = TEXTE[k](d); return `${nr ? nr + ' ' : ''}${titel(d, k)}\n${body || '[noch nichts erfasst]'}`; }
  const paket = d => ABSCHNITTE.map(([k]) => abschnitt(d, k)).join('\n\n');

  /* ======================= Noch offen (Form und Inhalt) ======================= */
  function offen(d) {
    const m = [], b = d.bsm || {}, art = wvArt(d), pr = d.prog || {};
    if (!getPath(d, 'ein.bsDa')) m.push('Beschuldigte Person vor Ort?');
    if (!has(d.fam)) m.push('Familienname (Tatort)');
    if (!has(getPath(d, 'ort.str'))) m.push('Anschrift des Tatorts');
    if (!art) m.push('Wohnungsverweisung / Rückkehrverbot');
    if (art === 'wvrv' || art === 'rv') {
      if (!b.anh) m.push('Anhörung vor der Anordnung');
      if (!has(b.zeit)) m.push('Uhrzeit der Anordnung');
      if (!has(anordTag(d))) m.push('Datum der Anordnung');
      if (!has(b.von)) m.push('Angeordnet durch');
      if (dauer(d) === 'kuerzer' && !has(b.ende)) m.push('Ende des Rückkehrverbots');
      if (!arr(b.bereich).length && !has(b.bereichFrei)) m.push('Räumlicher Bereich');
      if (!has(b.zg)) m.push('Zwangsgeld');
      if (!b.auf) m.push('Aufenthalt / Zustellung');
      if (b.auf === 'keine' && !has(b.wache)) m.push('Dienststelle für die Hinterlegung');
      if (!b.best) m.push('Schriftliche Bestätigung');
      if (art === 'rv' && !b.bekannt) m.push('Bekanntgabe des Rückkehrverbots');
      if (!pr.einord) m.push('Einordnung (Gewaltbeziehung / Ersttat)');
      if (!Object.keys(pr.m || {}).length && !arr(pr.bew).length && !has(pr.text)) m.push('Gefahrenprognose');
    }
    if (arr(pr.bew).some(k => { const it = BEW.find(x => x[0] === k); return it && it[4]; }) && !kinderDa(d)) m.push('Prognosesatz zu Kindern ohne anwesende Kinder');
    if (kinderN(d) && !arr(getPath(d, 'kinder.wo')).length && !arr(getPath(d, 'kinder.wirk')).length) m.push('Wo waren die Kinder, wie wirkten sie?');
    return m;
  }

  function title(d) { const f = str(d && d.fam); return f ? `Häusliche Gewalt – Familie ${f}` : 'Häusliche Gewalt'; }
  function subtitle(d) { const s = str(getPath(d, 'ort.str')); const a = wvArt(d); return [s || 'Tatort offen', a === 'wvrv' ? 'Wohnungsverweisung' : a === 'rv' ? 'Rückkehrverbot' : a === 'keine' ? 'ohne § 34a' : '§ 34a offen'].join(' · '); }
  function pill(d) { const n = offen(d).length; return n ? `${n} offen` : 'bereit'; }

  /* ======================= Maske ======================= */
  const V = { id: null, s: 'mask', guide: '', q: {} };
  const $ = s => document.querySelector(s);
  const top0 = () => { try { window.scrollTo({ top: 0 }); } catch (e) { /* egal */ } };
  const ICON_BACK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const seg = (path, cur, list, cls = 'w-seg') => `<div class="${cls}" role="group">${list.map(([v, l]) => `<button type="button" class="${cls === 'w-seg' ? 'w-opt' : 'chip'}" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  const flips = (path, cur, list) => `<div class="w-chips">${list.map(([v, l]) => `<button type="button" class="chip" data-sd="flip" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(arr(cur).includes(v))}">${esc(l)}</button>`).join('')}</div>`;
  const tog = (path, on, label) => `<button type="button" class="chip" data-sd="tog" data-p="${esc(path)}" aria-pressed="${String(!!on)}">${esc(label)}</button>`;
  /** Schalter, der von Haus aus an ist (gespeichert wird nur das Abschalten). */
  const togAn = (path, on, label) => `<button type="button" class="chip" data-sd="neg" data-p="${esc(path)}" aria-pressed="${String(!!on)}">${esc(label)}</button>`;
  const textIn = (id, path, val, ph, max = 240, mode = '') => `<input class="input" id="${id}" data-sk="${esc(path)}" value="${esc(val || '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="${max > 120 ? 'true' : 'false'}" maxlength="${max}"${mode ? ` inputmode="${mode}"` : ''}>`;
  const zeitIn = (id, path, val) => `<div class="sd-time"><input class="input mono" type="time" id="${id}" data-sk="${esc(path)}" value="${esc(val || '')}"><button type="button" class="chip sm" data-sd="now" data-p="${esc(path)}">Jetzt</button></div>`;
  const satz = (pre, inner) => `<div class="sd-inl"><span class="w-hint">${pre}</span>${inner}</div>`;
  const lbl = (t, pflicht = false) => `<span class="w-lbl">${esc(t)}${pflicht ? ' <i class="w-req" title="Pflicht">•</i>' : ''}</span>`;
  const head = (id, t, h = '') => `<div class="w-q full w-head" id="hgSec-${id}"><span class="w-head-t">${esc(t)}</span>${h ? `<span class="w-head-h">${esc(h)}</span>` : ''}</div>`;
  const sub = t => `<div class="w-q full"><span class="w-mk-gt">${esc(t)}</span></div>`;
  const out = (k, txt) => `<div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">So steht es da</span><button type="button" class="btn btn-light btn-sm" data-sd="copy" data-k="${k}">Kopieren</button></div><pre class="w-out-t" data-live="${k}">${esc(txt || '– noch nichts erfasst –')}</pre></div></div>`;
  /** Eigene Einträge zu einer Liste (z. B. weitere Spuren): Feld + Hinzufügen, Einträge als entfernbare Marken. */
  const eigene = (path, list, ph) => `<div class="sd-wg"><span class="w-mk-gt">Eigene ergänzen</span>${arr(list).length ? `<div class="sd-toks">${arr(list).map((x, j) => `<span class="sd-tok"><b>${esc(x)}</b><button type="button" data-sd="untok" data-p="${esc(path)}" data-j="${j}" aria-label="${esc(x)} entfernen">${ICON_X}</button></span>`).join('')}</div>` : ''}<div class="sd-add-in"><input class="input" id="hgTok_${esc(path.replace(/\W/g, '_'))}" data-tok="${esc(path)}" value="${esc(V.q[path] || '')}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="true" enterkeyhint="done" maxlength="160"><button type="button" class="btn btn-ghost btn-sm" data-sd="tokadd" data-p="${esc(path)}">Hinzufügen</button></div></div>`;
  /** Zuletzt benutzte Werte eines Feldes aus anderen Vorgängen dieses Moduls. */
  const zuletzt = (api, path, extra = []) => [...new Set([...api.docs().filter(x => x && x.type === 'hgv' && x.id !== api.d.id).sort((a, b) => (b.u || 0) - (a.u || 0)).map(x => str(getPath(x.data, path))).filter(Boolean), ...extra])].slice(0, 4);
  const vorschlag = (path, vals, cur) => (vals.length ? `<div class="w-chips sd-sugg">${vals.map(v => `<button type="button" class="chip sm" data-sd="set" data-p="${esc(path)}" data-v="${esc(v)}" aria-pressed="${String(str(cur) === v)}">${esc(v)}</button>`).join('')}</div>` : '');
  function crew(api, data) {
    const ranks = new Map(api.team().map(t => [str(t.name).toLowerCase(), rankT(t)]));
    return arr(getPath(data, 'einsatz.kraefte')).filter(c => c && has(c.name)).map(c => `${str(c.grad) || ranks.get(str(c.name).toLowerCase()) || ''} ${nachname(c.name)}`.trim());
  }
  const NAV = [['bet', 'Beteiligte'], ['ein', 'Eintreffen'], ['gs', 'Geschädigte'], ['bs', 'Beschuldigte'], ['prog', 'Prognose'], ['sonst', 'Weiteres']];

  function maskHtml(d, api) {
    const data = d.data, G = P(data, 'gs'), B = P(data, 'bs'), e = data.ein || {}, o = data.ort || {}, k = data.kinder || {}, m = data.bsm || {}, pr = data.prog || {}, w = data.weiter || {};
    const art = wvArt(data), wv = wvJa(data), kr = crew(api, data), n = kinderN(data);
    const nav = `<div class="hg-nav" role="navigation" aria-label="Abschnitte">${NAV.map(([id, l]) => `<button type="button" class="chip sm" data-sd="jump" data-t="${id}">${esc(l)}</button>`).join('')}</div>`;

    /* Beteiligte – nur für die richtigen Formen im Text */
    const beteiligte = `${head('bet', 'Beteiligte', 'Nur für die richtige Form im Text – Namen stehen in den Schilderungen.')}
      <div class="w-q half" data-q="gsg">${lbl('Geschädigte Person')}${seg('gs.g', G.g, [['w', 'Frau'], ['m', 'Mann']])}</div>
      <div class="w-q half" data-q="bsg">${lbl('Beschuldigte Person')}${seg('bs.g', B.g, [['m', 'Mann'], ['w', 'Frau']])}</div>
      <div class="w-q" data-q="bez">${lbl('Beziehung')}${seg('bez', data.bez, BEZ, 'w-chips')}<div class="w-chips sd-gap">${togAn('bs.wohnt', bsWohnt(data), `${cap(B.nom)} wohnt mit in der Wohnung`)}</div>${partnerDat(data) !== G.dat ? `<p class="w-hint sd-hint">In der Prognose heißt es dann „${esc(partnerDat(data))}“ statt „${esc(G.dat)}“ – wie in deiner Vorlage.</p>` : ''}</div>`;

    /* 2 Eintreffsituation – Beobachtungen */
    const ein = `${head('ein', `${nrOf(data, 'ein')} Eintreffsituation`, 'Alles, was ihr beim Eintreffen festgestellt habt.')}
      ${sub('Ankunft')}
      <div class="w-q" data-q="vorher">${lbl('Vor der Wohnungstür zu hören')}${flips('ein.vorher', e.vorher, [...VORHER.map(x => [x[0], x[1]]), ['ruhe', 'Es war ruhig']])}</div>
      <div class="w-q" data-q="erw">${lbl(`Von ${G.dat} erwartet?`)}${seg('ein.erw', e.erw === 'tuer' ? 'ja' : e.erw, ERWARTET.map(x => [x[0], x[1]]), 'w-chips')}</div>
      <div class="w-q" data-q="oeff">${lbl('Wer öffnete die Tür?')}${seg('ein.oeff', e.oeff, OEFFNET.map(([v, l]) => [v, v === 'gs' ? cap(G.nom) : v === 'bs' ? cap(B.nom) : l]), 'w-chips')}
        ${['gs', 'bs', 'kind', 'dritte'].includes(e.oeff) ? `<div class="w-chips sd-gap">${tog('ein.hinein', e.hinein, '… und bat uns hinein')}</div>` : ''}
        ${e.oeff === 'dritte' ? satz('Wer? (mit Artikel)', textIn('hgOeffW', 'ein.oeffWer', e.oeffWer, 'eine Nachbarin', 80)) : ''}</div>
      ${sub(cap(G.nom))}
      <div class="w-q" data-q="wirk">${lbl(`Wie wirkte ${G.nom}?`)}${flips('ein.wirk', e.wirk, WIRKT)}<div class="sd-gap">${flips('ein.verb', e.verb, GS_VERB.map(([v, l]) => [v, l.replace('zur beschuldigten Person', `zu ${B.dat}`)]))}</div>${satz('Weiteres (optional) – setzt den Satz fort', textIn('hgWirk', 'ein.wirkText', e.wirkText, 'hielt sich die linke Wange', 200))}</div>
      <div class="w-q" data-q="sicht">${satz('Beim Eintreffen erkennbar (optional) – Einzelheiten stehen in der Schilderung', textIn('hgSicht', 'ein.sicht', e.sicht, 'eine Rötung an der linken Wange', 300))}</div>
      ${sub(cap(B.nom))}
      <div class="w-q" data-q="bsda">${lbl(`${cap(B.nom)} vor Ort?`, true)}${seg('ein.bsDa', e.bsDa, BS_DA, 'w-chips')}${e.bsDa === 'nah' ? satz('Wo angetroffen?', textIn('hgBsNah', 'ein.bsNahWo', e.bsNahWo, 'vor dem Wohnhaus', 120)) : ''}</div>
      ${e.bsDa === 'da' || e.bsDa === 'nah' ? `<div class="w-q" data-q="bswirk">${lbl(`Wie wirkte ${B.nom}?`)}${flips('ein.bsWirk', e.bsWirk, BS_WIRKT)}<div class="sd-gap">${flips('ein.bsVerb', e.bsVerb, BS_VERB.map(([v, l]) => [v, l.replace('die geschädigte Person', G.akk).replace('der geschädigten Person', G.dat)]))}</div>${satz('Weiteres (optional) – setzt den Satz fort', textIn('hgBsT', 'ein.bsText', e.bsText, 'trat gegen die Wohnungstür', 200))}</div>` : ''}
      ${sub('Tatort')}
      <div class="w-q half" data-q="fam"><label class="w-lbl" for="hgFam">Familienname <i class="w-req" title="Pflicht">•</i></label>${textIn('hgFam', 'fam', data.fam, 'z. B. Müller', 80)}<p class="w-hint sd-hint">„… die Wohnung der Familie Müller“</p></div>
      <div class="w-q half" data-q="geb">${lbl('Gebäude')}${seg('ort.art', o.art, GEBAEUDE.map(x => [x[0], x[1]]), 'w-chips')}</div>
      <div class="w-q half" data-q="str"><label class="w-lbl" for="hgStr">Straße, Hausnummer <i class="w-req" title="Pflicht">•</i></label>${textIn('hgStr', 'ort.str', o.str, 'Musterstraße 5', 120)}</div>
      <div class="w-q half" data-q="plz"><label class="w-lbl" for="hgPlz">PLZ und Ort</label>${textIn('hgPlz', 'ort.plz', o.plz, '32545 Bad Oeynhausen', 80)}${vorschlag('ort.plz', zuletzt(api, 'ort.plz'), o.plz)}</div>
      ${o.art && MIT_ETAGE.includes(o.art) ? `<div class="w-q" data-q="etage">${lbl('Lage der Wohnung')}${seg('ort.etage', o.etage, ETAGE, 'w-chips')}<div class="sd-gap">${seg('ort.lage', o.lage, LAGE, 'w-chips')}</div></div>` : ''}
      <div class="w-q" data-q="zust">${lbl('Die Wohnung wirkte …')}${seg('ort.zustand', o.zustand, ZUSTAND, 'w-chips')}</div>
      <div class="w-q" data-q="spuren">${lbl('Spuren einer Auseinandersetzung')}${flips('ort.spuren', o.spuren, SPUREN)}${eigene('ort.spurenFrei', o.spurenFrei, 'z. B. ein umgestoßener Wäscheständer')}${satz('Weitere Feststellung zum Tatort (ganzer Satz, optional)', textIn('hgOrtT', 'ort.text', o.text, 'Im Flur lag ein abgebrochenes Stuhlbein', 300))}</div>
      ${sub('Kinder')}
      <div class="w-q" data-q="kinder">${lbl('Kinder im Haushalt')}${seg('kinder.n', has(k.n) ? String(k.n) : '', [['0', 'Keine'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], 'w-chips')}
        ${n ? `<div class="sd-gap">${seg('kinder.art', k.art || 'gemeinsam', KIND_ART.map(([v, l]) => [v, l.replace('der geschädigten Person', G.gen).replace('der beschuldigten Person', B.gen)]), 'w-chips')}</div>${satz('Alter (z. B. „3 und 5“) – im Text „(gemeinsame Kinder: 3 und 5 J.)“', textIn('hgAlter', 'kinder.alter', k.alter, '3 und 5', 40))}` : ''}</div>
      ${n ? `<div class="w-q" data-q="kwo">${lbl(n === 1 ? 'Wo war das Kind?' : 'Wo waren die Kinder?')}${flips('kinder.wo', k.wo, KIND_WO.map(([v, l]) => [v, l.replace('der geschädigten Person', G.dat)]))}${arr(k.wo).includes('nichtda') ? satz('Wo? (optional)', textIn('hgKWo', 'kinder.woText', k.woText, 'bei der Großmutter', 120)) : ''}</div>
      ${arr(k.wo).includes('nichtda') ? '' : `<div class="w-q" data-q="kwirk">${lbl(n === 1 ? 'Wie wirkte das Kind?' : 'Wie wirkten die Kinder?')}${flips('kinder.wirk', k.wirk, KIND_WIRK)}<div class="sd-gap">${flips('kinder.verb', k.verb, KIND_VERB.map(x => [x[0], x[1].replace('die geschädigte Person', G.akk)]))}</div>${satz('Weiteres (ganzer Satz, optional)', textIn('hgKT', 'kinder.text', k.text, 'Der Sohn fragte, ob der Papa jetzt ins Gefängnis muss', 300))}</div>`}` : ''}
      ${out('ein', eintreffen(data))}`;

    /* 4 Maßnahmen gegenüber der geschädigten Person */
    const hs = arr(getPath(data, 'gsm.h'));
    const opfer = `${head('gs', `${nrOf(data, 'gs')} ${titel(data, 'gs')}`, 'Hinweise, Unterlagen, Verbleib. Strafantrag, Verletzungen und Rettungswagen stehen in der Schilderung.')}
      <div class="w-q" data-q="opfer">${lbl('Hinweise und Unterlagen')}<div class="w-chips"><button type="button" class="chip" data-sd="opferstd">Wie Vorlage</button></div><div class="sd-gap">${flips('gsm.h', hs, OPFER.filter(([v]) => wv || !['verl', 'rueck'].includes(v)).map(([v, l]) => [v, v === 'rechte' ? `Rechte als ${G.verletzt} erklärt` : l]))}</div>
        ${hs.includes('beratung') ? `${satz('Welche Beratungsstelle? (optional, mit Artikel)', textIn('hgStelle', 'gsm.stelle', getPath(data, 'gsm.stelle'), 'die Frauenberatungsstelle Bad Oeynhausen', 120))}${vorschlag('gsm.stelle', zuletzt(api, 'gsm.stelle'), getPath(data, 'gsm.stelle'))}` : ''}</div>
      <div class="w-q" data-q="verbleib">${lbl(`Wo bleibt ${G.nom}?`)}${seg('gsm.verbleib', getPath(data, 'gsm.verbleib'), VERBLEIB, 'w-chips')}${['schutz', 'dritte'].includes(getPath(data, 'gsm.verbleib')) ? '<p class="w-hint sd-hint">Keine Schutzanschrift in den Text – über die Akteneinsicht gelangt sie sonst zur beschuldigten Person.</p>' : ''}</div>
      <div class="w-q" data-q="gsT">${satz('Weiterer Hinweis (ganzer Satz, optional)', textIn('hgGsT', 'gsm.text', getPath(data, 'gsm.text'), 'Ein Platz im Frauenhaus wurde vermittelt', 300))}</div>
      ${out('gs', opferText(data))}`;

    /* 5 Maßnahmen gegenüber der beschuldigten Person */
    let bs = `${sub('Vor der Anordnung')}
      <div class="w-q" data-q="erkl"><div class="w-chips">${tog('bsm.erkl', m.erkl, 'Polizeiliches Handeln bei HG erklärt')}${wv ? tog('bsm.anh', m.anh, 'Angehört – Gelegenheit zur Äußerung') : ''}</div>${wv && m.anh ? satz(`„… ${B.er} äußerte, …“ (optional)`, textIn('hgAnh', 'bsm.anhText', m.anhText, 'es habe keinen Übergriff gegeben', 300)) : ''}${wv && !m.anh ? '<p class="w-hint sd-hint">Anhörung vor dem Eingriff (§ 28 VwVfG NRW) – nur bei Gefahr im Verzug entbehrlich.</p>' : ''}</div>
      ${sub('Anordnung nach § 34a PolG NRW')}
      <div class="w-q" data-q="wv">${lbl('Maßnahme', true)}${seg('bsm.wv', art, [['wvrv', 'Wohnungsverweisung + Rückkehrverbot'], ['rv', 'Nur Rückkehrverbot (nicht vor Ort)'], ['keine', 'Keine Maßnahme']], 'w-chips')}
        ${wv ? `<div class="sd-gap">${seg('bsm.dauer', dauer(data), [['14', '14 Tage (Regel)'], ['kuerzer', 'Ausnahmsweise kürzer']], 'w-chips')}</div>${dauer(data) === 'kuerzer' ? `<div class="sd-inl"><label class="w-hint" for="hgEnde">Bis einschließlich</label><input class="input mono" type="date" id="hgEnde" data-sk="bsm.ende" value="${esc(m.ende || '')}"></div>` : ''}<p class="w-hint sd-hint">Seit 13.12.2025 gilt in NRW eine Regeldauer von 14 Tagen (vorher 10).${has(wvEnde(data)) ? ` Ende: mit Ablauf des ${fmtDatum(wvEnde(data))}.` : ''}</p>` : ''}
        ${art === 'keine' ? satz('„Von einer Wohnungsverweisung mit Rückkehrverbot wurde abgesehen, weil …“', textIn('hgKein', 'bsm.keinGrund', m.keinGrund, 'es bei einem verbalen Streit geblieben ist', 300)) : ''}</div>`;
    if (wv) {
      bs += `<div class="w-q" data-q="wann"><div class="sd-two"><div>${lbl('Angeordnet um', true)}${zeitIn('hgAnZ', 'bsm.zeit', m.zeit)}</div><div><label class="w-lbl" for="hgAnD">Am (Datum)</label><input class="input mono" type="date" id="hgAnD" data-sk="bsm.datum" value="${esc(anordTag(data))}"></div></div>${satz('Angeordnet durch', textIn('hgVon', 'bsm.von', m.von, 'PHK Becker', 60))}${vorschlag('bsm.von', kr, m.von)}</div>
        <div class="w-q" data-q="bereich">${lbl('Räumlicher Bereich – genau bezeichnen', true)}${flips('bsm.bereich', m.bereich, BEREICH.map(x => [x[0], x[1]]))}${satz('Weitere Örtlichkeit (optional, mit Artikel)', textIn('hgBerF', 'bsm.bereichFrei', m.bereichFrei, 'den Tiefgaragenstellplatz Nr. 12', 160))}</div>`;
      if (art === 'wvrv') bs += `<div class="w-q" data-q="reakt">${lbl('Reaktion')}${seg('bsm.reakt', m.reakt, [['halten', 'Verstanden, will sich daran halten'], ['verstanden', 'Verstanden'], ['uneinsichtig', 'Uneinsichtig'], ['widerspruch', 'Widersprochen']], 'w-chips')}${satz(`„${B.Er} äußerte, …“ (optional)`, textIn('hgReakt', 'bsm.reaktText', m.reaktText, B.g === 'w' ? 'das sei ihre Wohnung' : 'das sei seine Wohnung', 300))}</div>`;
      if (art === 'rv') bs += `<div class="w-q" data-q="bekannt">${lbl('Bekanntgabe', true)}${seg('bsm.bekannt', m.bekannt, [['tel', 'Telefonisch'], ['pers', 'Persönlich'], ['nein', 'Noch nicht']], 'w-chips')}</div>`;
      bs += `<div class="w-q" data-q="inh">${lbl('Anordnung erfolgte mit …')}<div class="w-chips"><button type="button" class="chip" data-sd="inhstd">Wie Vorlage</button></div><div class="sd-gap">${flips('bsm.inh', m.inh, INHALT.map(x => [x[0], x[1]]))}</div></div>
        <div class="w-q" data-q="zg">${lbl('Zwangsgeld angedroht', true)}${seg('bsm.zg', str(m.zg), [['300', '300 €'], ['500', '500 €'], ['1000', '1.000 €']], 'w-chips')}${satz('Anderer Betrag in €', textIn('hgZg', 'bsm.zg', ['300', '500', '1000'].includes(str(m.zg)) ? '' : m.zg, 'z. B. 750', 6, 'numeric'))}<div class="w-chips sd-gap">${togAn('bsm.zgFall', m.zgFall !== false, '„für jeden Fall der Zuwiderhandlung“')}${tog('bsm.ersatz', m.ersatz, 'Auf Ersatzzwangshaft hingewiesen')}</div><p class="w-hint sd-hint">Die Androhung ist zuzustellen – sie steht in der schriftlichen Bestätigung.</p></div>
        ${sub('Vollzug')}
        <div class="w-q" data-q="gegenst"><div class="w-chips">${tog('bsm.gegenst', m.gegenst, 'Gelegenheit, persönliche Gegenstände mitzunehmen')}</div>${m.gegenst ? satz('Was? (optional)', textIn('hgGeg', 'bsm.gegenstText', m.gegenstText, 'Kleidung, Hygieneartikel und Medikamente', 200)) : ''}</div>
        <div class="w-q" data-q="schl">${lbl('Wohnungsschlüssel (zur Herausgabe aufgefordert)')}${seg('bsm.schl', m.schl, [['mit', `Mitgeführt, an ${G.akk} übergeben`], ['sicher', 'Ausgehändigt, sichergestellt'], ['ohne', 'Keinen mitgeführt']], 'w-chips')}
          ${m.schl === 'sicher' ? `<div class="sd-two"><div>${satz('Anzahl', textIn('hgSchlA', 'bsm.schlAnz', m.schlAnz, '1', 2, 'numeric'))}</div><div class="w-chips">${tog('bsm.schlBesch', m.schlBesch, 'Bescheinigung ausgehändigt (§ 44 PolG NRW)')}</div></div>` : ''}
          ${m.schl === 'ohne' ? `<div class="w-chips sd-gap">${tog('bsm.durchs', m.durchs, 'Mit Zustimmung nach Schlüssel durchsucht')}</div>${m.durchs ? `${satz('Durchsucht von', textIn('hgDurchs', 'bsm.durchsVon', m.durchsVon, 'PK Wagner', 60))}${vorschlag('bsm.durchsVon', kr, m.durchsVon)}<div class="sd-gap">${seg('bsm.gefunden', m.gefunden || 'nein', [['nein', 'Nichts gefunden'], ['ja', 'Schlüssel gefunden']], 'w-chips')}</div>` : ''}` : ''}</div>
        <div class="w-q" data-q="auf">${lbl('Aufenthalt / Zustellung', true)}${seg('bsm.auf', m.auf, [['anschrift', 'Anschrift genannt'], ['zbv', 'Zustellungsbevollmächtigte Person'], ['keine', 'Nichts genannt – Hinterlegung']], 'w-chips')}
          ${m.auf === 'anschrift' ? `<div class="sd-two"><div>${satz('Straße, Hausnummer', textIn('hgAStr', 'bsm.aufStr', m.aufStr, 'Bahnhofstraße 12', 120))}</div><div>${satz('PLZ und Ort', textIn('hgAPlz', 'bsm.aufPlz', m.aufPlz, '32547 Bad Oeynhausen', 80))}${vorschlag('bsm.aufPlz', zuletzt(api, 'ort.plz', has(o.plz) ? [str(o.plz)] : []), m.aufPlz)}</div></div>` : ''}
          ${m.auf === 'zbv' ? satz('Name und Anschrift', textIn('hgZbv', 'bsm.zbv', m.zbv, 'Herrn Peter Müller, Lindenweg 3, 32545 Bad Oeynhausen', 200)) : ''}
          ${m.auf === 'keine' ? `${satz('„… wird in … hinterlegt“ – Dienststelle mit Artikel', textIn('hgWache', 'bsm.wache', m.wache, 'der PW Minden', 80))}${vorschlag('bsm.wache', zuletzt(api, 'bsm.wache', ['der PW Minden']), m.wache)}` : ''}</div>
        ${art === 'wvrv' ? `<div class="w-q" data-q="verl">${lbl('Verlassen der Wohnung')}${seg('bsm.verl', m.verl, [['freiwillig', 'Ohne Zwang'], ['zwang', 'Nach unmittelbarem Zwang'], ['gewahrsam', 'In Gewahrsam genommen']], 'w-chips')}${m.verl ? `<div class="sd-two"><div>${satz('Uhrzeit', zeitIn('hgVerlZ', 'bsm.verlZeit', m.verlZeit))}</div>${m.verl === 'freiwillig' ? `<div>${satz('Wohin? (optional) – „begab sich nach eigenen Angaben …“', textIn('hgVerlW', 'bsm.verlWohin', m.verlWohin, B.g === 'w' ? 'zu ihrer Schwester' : 'zu seinem Bruder', 120))}</div>` : ''}</div>` : ''}${m.verl === 'gewahrsam' ? '<p class="w-hint sd-hint">Für den Gewahrsam gibt es unter Schreiben einen eigenen Vorgang.</p>' : ''}</div>` : ''}
        ${sub('Unterlagen und Ansprache')}
        <div class="w-q" data-q="best">${lbl('Schriftliche Bestätigung der mündlichen Polizeiverfügung', true)}${seg('bsm.best', m.best, BEST, 'w-chips')}</div>`;
    }
    bs += `<div class="w-q" data-q="bsdoku"><div class="w-chips">${tog('bsm.doku', m.doku, 'Dokumentation über den Polizeieinsatz zugestellt')}${tog('bsm.ga', m.ga, 'Gefährderansprache durchgeführt (Formular liegt bei)')}</div></div>
      <div class="w-q" data-q="bsT2">${satz('Weitere Maßnahme (ganzer Satz, optional)', textIn('hgBsT2', 'bsm.text', m.text, 'Er wurde zu seinem Fahrzeug begleitet', 300))}</div>`;
    const taeter = `${head('bs', `${nrOf(data, 'bs')} ${titel(data, 'bs')}`, 'Alles mit und gegenüber der beschuldigten Person – in der Reihenfolge des Einsatzes.')}${bs}${out('bs', taeterText(data))}`;

    /* 6 Gefahrenprognose */
    const mk = (pr.m && typeof pr.m === 'object') ? pr.m : {};
    const legende = `<div class="w-mk-legend">${MK.map(([s, l]) => `<span><i class="w-mk-dot" data-s="${s}"></i>${esc(l)}</span>`).join('')}</div>`;
    const fakt = FAK_GRUPPEN.map(([g, gl]) => `<div class="sd-wg"><span class="w-mk-gt">${esc(gl)}</span><div class="w-chips">${FAK.filter(f => f[1] === g && (!FAK_KIND.includes(f[0]) || n || mk[f[0]])).map(([key, , l]) => { const s = mk[key] || ''; return `<button type="button" class="chip w-mk" data-sd="mark" data-v="${key}" data-s="${s}" aria-pressed="${String(!!s)}"><span>${esc(l)}</span>${s ? `<small>${esc(MK.find(x => x[0] === s)[1])}</small>` : ''}</button>`; }).join('')}</div></div>`).join('');
    const bew = BEW_GRUPPEN.map(([g, gl]) => `<div class="sd-wg"><span class="w-mk-gt">${esc(gl)}</span><div class="w-chips">${BEW.filter(b => b[1] === g && (!b[4] || n || arr(pr.bew).includes(b[0]))).map(([key, , l]) => { const i = arr(pr.bew).indexOf(key); return `<button type="button" class="chip" data-sd="flip" data-p="prog.bew" data-v="${key}" aria-pressed="${String(i >= 0)}">${i >= 0 ? `<i class="hg-ord">${i + 1}</i> ` : ''}${esc(l)}</button>`; }).join('')}</div></div>`).join('');
    const prog = `${head('prog', `${nrOf(data, 'prog')} Gefahrenprognose`, 'Trägt bei wiederholter Gewalt oder bei einer Ersttat von hoher Intensität.')}
      <div class="w-q" data-q="vorg">${lbl('Erkenntnislage (Datenabgleich)')}${flips('prog.vorg', pr.vorg, [...VORG.map(x => [x[0], x[1]]), ['keine', 'Keine Erkenntnisse'], ['nicht', 'Abgleich nicht möglich']])}</div>
      <div class="w-q" data-q="einord">${lbl('Einordnung', wv)}${seg('prog.einord', pr.einord, EINORD, 'w-chips')}${pr.einord === 'weder' ? '<p class="w-hint sd-hint">Ohne Gewaltbeziehung und ohne Ersttat von hoher Intensität trägt eine Wohnungsverweisung vor Gericht oft nicht. Alkohol, Beschimpfungen und Drohungen stützen nur, tragen aber nicht allein.</p>' : ''}</div>
      <div class="w-q" data-q="fak">${lbl('Umstände')}<p class="w-hint">Antippen wechselt: festgestellt → nach Angaben → angenommen → aus. Jeder markierte Umstand wird ein Satz mit seiner Bedeutung.</p>${legende}${fakt}<div class="w-chips sd-gap">${tog('prog.bedAus', pr.bedAus === true, 'Ohne Bedeutungssätze')}</div></div>
      <div class="w-q" data-q="bew">${lbl('Bewertende Sätze (wie Vorlage)')}<p class="w-hint">Erscheinen in der Reihenfolge, in der du sie antippst (Zahl am Chip).</p>${bew}${satz('Eigene Bewertung (ganze Sätze, optional)', textIn('hgProgT', 'prog.text', pr.text, B.g === 'w' ? 'Sie kündigte an, „das nächste Mal richtig zuzuschlagen“' : 'Er kündigte an, „das nächste Mal richtig zuzuschlagen“', 600))}</div>
      <div class="w-q" data-q="erg">${lbl('Ergebnis und Abwägung')}<div class="w-chips">${wv ? togAn('prog.gefahr', pr.gefahr !== false, 'Gegenwärtige Gefahr für Leib, Leben, Freiheit') + tog('prog.mild', pr.mild, 'Mildere Mittel reichten nicht') + tog('prog.zumutbar', pr.zumutbar, 'Anderweitige Unterkunft zumutbar') + tog('prog.eigentum', pr.eigentum, 'Mietvertrag / Eigentum steht nicht entgegen') + tog('prog.wille', pr.wille, 'Gegen den Wunsch der geschädigten Person') : ''}${togAn('prog.schluss', pr.schluss !== false, 'Schlusssatz der Vorlage')}</div></div>
      ${out('prog', prognoseText(data))}`;

    /* 7 Weitere Maßnahmen/Sonstiges */
    const sonst = `${head('sonst', `${nrOf(data, 'sonst')} Weitere Maßnahmen/Sonstiges`, 'Folgemaßnahmen und Mitteilungen.')}
      ${n ? `<div class="w-q" data-q="weiter">${lbl('Kinder: Weiterleitung')}${seg('weiter.ja', w.ja, [['anregen', 'An entsprechende Stellen weiterleiten'], ['jugendamt', 'Jugendamt wird informiert'], ['bereitschaft', 'Bereitschaftsdienst Jugendamt verständigt']], 'w-chips')}${w.ja === 'bereitschaft' ? `<div class="sd-inl">${lbl('Uhrzeit')}${zeitIn('hgJaZ', 'weiter.jaZeit', w.jaZeit)}</div>` : ''}</div>` : ''}
      <div class="w-q" data-q="folgen">${lbl('Veranlasst')}<div class="w-chips">${wv ? tog('weiter.kontrolle', w.kontrolle, 'Kontrolle des Rückkehrverbots (§ 34a Abs. 7)') : ''}${tog('weiter.streife', w.streife, 'Verstärkte Bestreifung')}${tog('weiter.ga', w.ga, 'Gefährderansprache veranlasst')}${tog('weiter.lichtbild', w.lichtbild, 'Lichtbilder der Wohnung')}${tog('weiter.folge', w.folge, 'Nachfolgende Schicht informiert')}</div></div>
      <div class="w-q" data-q="sT">${satz('Weiteres (ganzer Satz, optional)', textIn('hgSoT', 'weiter.text', w.text, 'Die Mitteilung an das Jugendamt wird gefertigt', 300))}</div>
      ${out('sonst', sonstText(data))}`;

    const miss = offen(data);
    return `<div class="w-top"><button type="button" class="icon-btn sm w-back" data-w="list" aria-label="Zur Liste">${ICON_BACK}</button><div class="w-top-t"><span class="spaced">Häusliche Gewalt · nach Vorlage</span><div class="w-title">${esc(title(data))}</div></div></div>
      <p class="w-hint">Einsatzanlass und Schilderungen (mit Belehrung, Verletzungen und Strafantrag) legst du unter Schreiben als eigene Vorgänge an.</p>
      ${nav}
      <div class="w-grid sd-grid hg-grid">${beteiligte}${ein}${opfer}${taeter}${prog}${sonst}</div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm btn-danger" data-w="delete">Löschen</button><span class="grow"></span>${miss.length ? `<span class="w-nav-i">${miss.length} offen</span>` : ''}<button type="button" class="btn btn-accent" data-sd="text">Text ansehen</button></div>`;
  }

  function textHtml(d) {
    const data = d.data, miss = offen(data);
    const kurz = { ein: 'Eintreffsituation', gs: 'Maßnahmen (geschädigt)', bs: 'Maßnahmen (beschuldigt)', prog: 'Gefahrenprognose', sonst: 'Weitere Maßnahmen' };
    const nums = ABSCHNITTE.map(([k]) => `<div class="hg-nr"><label class="w-hint" for="hgNr_${k}">${esc(kurz[k])}</label><input class="input mono" id="hgNr_${k}" data-sk="nr.${k}" value="${esc(nrOf(data, k))}" inputmode="decimal" maxlength="6"></div>`).join('');
    const blocks = ABSCHNITTE.map(([k]) => `<div class="w-q"><div class="w-out"><div class="w-out-h"><span class="w-lbl">${esc(`${nrOf(data, k)} ${titel(data, k)}`.trim())}</span><button type="button" class="btn btn-light btn-sm" data-sd="copy" data-k="${k}">Kopieren</button></div><pre class="w-out-t" data-live="${k}">${esc(TEXTE[k](data) || '– noch nichts erfasst –')}</pre></div></div>`).join('');
    return `<div class="w-top"><button type="button" class="icon-btn sm" data-sd="mask" aria-label="Zurück zur Eingabe">${ICON_BACK}</button><div class="w-top-t"><span class="spaced">Häusliche Gewalt · Text</span><div class="w-title">${esc(title(data))}</div></div></div>
      <div class="w-grid sd-grid">
        <div class="w-q"><span class="w-lbl">Nummern der Abschnitte (1 Einsatzanlass und 3 Schilderungen kommen aus den eigenen Vorgängen)</span><div class="hg-nrs">${nums}</div></div>
        ${miss.length ? `<div class="w-q"><div class="w-warn">Noch offen: ${esc(miss.join(', '))}.</div></div>` : ''}
        ${blocks}
      </div>
      <div class="w-nav"><button type="button" class="btn btn-ghost btn-sm" data-sd="mask">Zur Eingabe</button><span class="grow"></span><button type="button" class="btn btn-accent" data-sd="copyall">Alles kopieren</button></div>`;
  }

  function open(d) { V.id = d.id; V.s = 'mask'; V.guide = ''; V.q = {}; }
  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    return V.s === 'text' ? textHtml(d) : maskHtml(d, api);
  }
  function mounted() { if (V.guide) { const k = V.guide; V.guide = ''; guide(k); } }
  /** Nach einer Einfachauswahl: nur scrollen, wenn der Anfang der nächsten Frage verdeckt ist – und nur so weit wie nötig. */
  function guide(key) {
    const all = [...document.querySelectorAll('#wMain [data-q]')];
    const i = all.findIndex(x => x.dataset.q === key);
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
    for (const k of Object.keys(TEXTE)) host.querySelectorAll(`[data-live="${k}"]`).forEach(x => { x.textContent = TEXTE[k](data) || '– noch nichts erfasst –'; });
  }
  function addTok(api, path) {
    const t = str(V.q[path]).replace(/[.;,]+$/, '');
    const el0 = document.querySelector(`[data-tok="${path}"]`);
    if (!t) { if (el0) el0.focus(); return; }
    setPath(api.d.data, path, [...arr(getPath(api.d.data, path)), t]); V.q[path] = '';
    api.persist(false); api.render();
    const el = document.querySelector(`[data-tok="${path}"]`); if (el) el.focus({ preventScroll: true });
  }
  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    const data = api.d.data, a = b.dataset.sd;
    const save = () => { api.persist(false); api.render(); };
    switch (a) {
      case 'set': {
        const path = b.dataset.p, v = b.dataset.v;
        setPath(data, path, path === 'kinder.n' ? Number(v) : v);
        const q = b.closest('[data-q]'); if (q) V.guide = q.dataset.q;
        save(); return true;
      }
      case 'flip': { const path = b.dataset.p, v = b.dataset.v, l = arr(getPath(data, path)).slice(), i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); setPath(data, path, l.length ? l : undefined); save(); return true; }
      case 'tog': setPath(data, b.dataset.p, getPath(data, b.dataset.p) ? undefined : true); save(); return true;
      case 'neg': {
        const path = b.dataset.p, cur = getPath(data, path);
        // bs.wohnt speichert „nein“, alle anderen false
        if (path === 'bs.wohnt') setPath(data, path, cur === 'nein' ? undefined : 'nein');
        else setPath(data, path, cur === false ? undefined : false);
        save(); return true;
      }
      case 'mark': {
        const order = ['fest', 'angabe', 'annahme'], cur = getPath(data, 'prog.m.' + b.dataset.v), i = order.indexOf(cur);
        setPath(data, 'prog.m.' + b.dataset.v, i < 0 ? 'fest' : order[i + 1]);
        if (data.prog && data.prog.m && !Object.keys(data.prog.m).length) delete data.prog.m;
        save(); return true;
      }
      case 'opferstd': setPath(data, 'gsm.h', [...new Set([...arr(getPath(data, 'gsm.h')), ...OPFER_STD])]); save(); return true;
      case 'inhstd': setPath(data, 'bsm.inh', [...new Set([...arr(getPath(data, 'bsm.inh')), ...INHALT_STD])]); save(); return true;
      case 'now': { const t = new Date(); setPath(data, b.dataset.p, `${pad(t.getHours())}:${pad(t.getMinutes())}`); save(); return true; }
      case 'tokadd': addTok(api, b.dataset.p); return true;
      case 'untok': { const l = arr(getPath(data, b.dataset.p)).slice(); l.splice(Number(b.dataset.j), 1); setPath(data, b.dataset.p, l.length ? l : undefined); save(); return true; }
      case 'jump': { const el = document.getElementById('hgSec-' + b.dataset.t); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); return true; }
      case 'copy': api.copy(abschnitt(data, b.dataset.k)); return true;
      case 'copyall': api.copy(paket(data)); return true;
      case 'text': V.s = 'text'; api.render(); top0(); return true;
      case 'mask': V.s = 'mask'; api.render(); top0(); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.tok) { V.q[el.dataset.tok] = el.value; return true; }
    if (!el.dataset.sk) return false;
    setPath(api.d.data, el.dataset.sk, el.value);
    api.persist(false); live(api);
    return true;
  }
  function change(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.type === 'date') { setPath(api.d.data, el.dataset.sk, el.value); api.persist(false); api.render(); }
    return true;
  }
  function keydown(e, api) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !el.closest || !el.closest('#wMain') || !el.dataset) return false;
    if (el.dataset.tok) { e.preventDefault(); addTok(api, el.dataset.tok); return true; }
    if (!el.dataset.sk) return false;
    e.preventDefault(); el.blur(); return true;
  }
  function submit(api) { if (V.s === 'mask') { V.s = 'text'; api.render(); top0(); } else api.copy(paket(api.d.data)); }

  root.WHGV = Object.freeze({
    id: 'hgv', name: 'Häusliche Gewalt', short: 'Häusliche Gewalt', kurz: 'HG',
    desc: 'Nach der Vorlage: Eintreffsituation, Maßnahmen gegenüber Geschädigter und Beschuldigtem (§ 34a PolG NRW), Gefahrenprognose, weitere Maßnahmen',
    intro: 'Nach deiner Vorlage: Eintreffsituation, Maßnahmen gegenüber beiden Seiten, Gefahrenprognose, weitere Maßnahmen – Einsatzanlass und Schilderungen als eigene Vorgänge',
    labels: { newBtn: 'Häusliche Gewalt' },
    steps: [],
    title, subtitle, pill, upgrade,
    plain: paket,
    text: d => ABSCHNITTE.map(([k]) => [nrOf(d, k), titel(d, k), TEXTE[k](d), k]),
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, change, keydown, submit },
    core: { eintreffen, opferText, taeterText, prognoseText, sonstText, abschnitt, paket, offen, upgrade, P, FAK, BEW, wvEnde, partnerDat }
  });
})(typeof window !== 'undefined' ? window : globalThis);
