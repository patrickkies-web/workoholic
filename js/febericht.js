/*
 * Workoholic · Schreiben · Modul „Freiheitsentziehung – Bericht“
 * ---------------------------------------------------------------
 * Wird aus der FE-Prüfung angelegt („Diesen Weg wählen“): Der gewählte Prüfweg (Rechtsgrundlage,
 * erfüllte Voraussetzungen, Formvorschriften) kommt als Vorbelegung mit. Hier werden nur noch
 * Person (Geschlecht für die Satzführung), Lage, die Begründung je Voraussetzung (fester Satzanfang +
 * graue Fortsetzung) und die Verfahrensschritte abgefragt, an denen Verteidiger typischerweise ansetzen.
 * Ergebnis: Vermerk zur Freiheitsentziehung, Kurzsachverhalt, offene Punkte (Angriffspunkte), Personalien.
 * Speichern übernimmt writer.js über WBridge (verschlüsselt). Keine Netzwerkzugriffe.
 * Orientierungshilfe, keine Rechtsberatung.
 */
((root) => {
  'use strict';
  const has = v => v != null && String(v).trim() !== '';
  const get = (o, p) => p.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  const arr = v => (Array.isArray(v) ? v : []);
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? `${m[3]}.${m[2]}.${m[1]}` : String(s || ''); };
  const endDot = s => { s = String(s || '').trim(); return !s ? '' : /[.!?…:]$/.test(s) ? s : s + '.'; };
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const lc = s => (s ? s[0].toLowerCase() + s.slice(1) : s);
  const ph = l => `[${l}]`;

  /* ======================= Weg aus der FE-Prüfung ======================= */
  const fe = d => (d && d.fe) || {};
  const kind = d => fe(d).kind || 'stpo';
  const steps = d => arr(fe(d).steps);
  const conds = d => steps(d).filter(s => has(s.c));
  const KIND_L = { stpo: 'Strafverfolgung (StPO)', jedermann: 'Festnahme durch Privatperson', idf: 'Identitätsfeststellung', s164: 'Störer (§ 164 StPO)', bp: 'Blutprobe', polg: 'Gefahrenabwehr (PolG NRW)', jusch: 'Kinder und Jugendliche', sonder: 'Sonderrecht', vollzug: 'Vollzug eines Befehls', vollstr: 'Vollstreckung' };

  /* ======================= Satzführung nach Geschlecht und Rolle ======================= */
  const ROLE = { stpo: 'b', jedermann: 'b', idf: 'b', s164: 'b', bp: 'b', vollzug: 'b', vollstr: 'b', polg: 't', jusch: 't', sonder: 't' };
  function G(d) {
    const g = get(d, 'p.geschlecht'), z = fe(d).zeuge, r = z ? 'z' : (ROLE[kind(d)] || 't');
    const N = { b: ['Beschuldigte', 'Beschuldigten'], t: ['Betroffene', 'Betroffenen'], z: g === 'w' ? ['Zeugin', 'Zeugin'] : ['Zeuge', 'Zeugen'] }[r];
    if (g === 'm') return { der: 'der ' + N[0], des: 'des ' + N[1], den: 'den ' + N[1], dem: 'dem ' + N[1], er: 'er', ihn: 'ihn', ihm: 'ihm', sein: 'sein', seine: 'seine', seiner: 'seiner', seinem: 'seinem' };
    if (g === 'w') return { der: 'die ' + (r === 'z' ? N[0] : N[0]), des: 'der ' + N[1], den: 'die ' + N[0], dem: 'der ' + N[1], er: 'sie', ihn: 'sie', ihm: 'ihr', sein: 'ihr', seine: 'ihre', seiner: 'ihrer', seinem: 'ihrem' };
    return { der: 'die Person', des: 'der Person', den: 'die Person', dem: 'der Person', er: 'sie', ihn: 'sie', ihm: 'ihr', sein: 'ihr', seine: 'ihre', seiner: 'ihrer', seinem: 'ihrem' };
  }

  /* ======================= Begründung je Voraussetzung: fester Satzanfang + graues Beispiel ======================= */
  /* Schlüssel: exakter Bedingungstext aus dem Prüfweg; sonst Lexikon-Begriff; sonst allgemein. */
  const TPL = {
    'Auf frischer Tat betroffen oder verfolgt': g => [`${cap(g.der)} wurde auf frischer Tat betroffen bzw. verfolgt, da`, `${g.er} unmittelbar nach dem Diebstahl im Kassenbereich angetroffen wurde.`],
    'Fluchtverdacht': g => [`Es bestand Fluchtverdacht, weil ${g.er}`, 'versuchte, sich loszureißen und in Richtung Ausgang zu laufen.'],
    'Identität nicht sofort feststellbar': g => [`Die Identität ${g.des} ließ sich nicht sofort feststellen, da ${g.er}`, 'keine Ausweisdokumente mitführte und Angaben zur Person verweigerte.'],
    'Dringender Tatverdacht': g => ['Es bestand dringender Tatverdacht, weil', `die Zeugin ${g.ihn} sicher wiedererkannte und das Diebesgut bei ${g.ihm} aufgefunden wurde.`],
    'Haftgrund Flucht (§ 112 Abs. 2 Nr. 1 StPO)': g => [`${cap(g.er)} war flüchtig bzw. hielt sich verborgen, da ${g.er}`, `${g.seine} Wohnung aufgegeben hatte und zur Aufenthaltsermittlung ausgeschrieben war.`],
    'Haftgrund Fluchtgefahr (§ 112 Abs. 2 Nr. 2 StPO)': g => ['Es bestand Fluchtgefahr, da', `${g.er} über keinen festen Wohnsitz in Deutschland verfügt, keine sozialen Bindungen hat und eine Freiheitsstrafe zu erwarten ist.`],
    'Haftgrund Verdunkelungsgefahr (§ 112 Abs. 2 Nr. 3 StPO)': g => ['Es bestand Verdunkelungsgefahr, da', `${g.er} ankündigte, die Geschädigte von einer Aussage abzubringen, und versuchte, Chatverläufe auf ${g.seinem} Mobiltelefon zu löschen.`],
    'Haftgrund Wiederholungsgefahr (§ 112a StPO)': g => ['Es bestand Wiederholungsgefahr nach § 112a StPO, da', `${g.er} in den letzten vier Wochen drei gleichgelagerte Einbrüche beging und keine Änderung der Lebensumstände erkennbar ist.`],
    'Voraussetzungen eines Unterbringungsbefehls (§ 126a StPO)': g => ['Dringende Gründe sprachen für eine Unterbringung nach § 126a StPO, weil', `${g.er} die Tat erkennbar in einem akuten psychotischen Zustand beging und weitere erhebliche Taten zu befürchten sind.`],
    'Dringender Verdacht einer Katalogtat (§ 112 Abs. 3 StPO)': () => ['Es bestand dringender Verdacht einer Katalogtat nach § 112 Abs. 3 StPO, nämlich', 'eines versuchten Totschlags (§§ 212, 22 StGB); eine Flucht ist nicht auszuschließen.'],
    'Fester Wohnsitz in Deutschland': g => [`${cap(g.er)} verfügt über einen festen Wohnsitz in`, 'Musterstadt, Musterstraße 1 (Abgleich Melderegister).'],
    'Kein fester Wohnsitz oder Aufenthalt in Deutschland': g => [`${cap(g.er)} hat keinen festen Wohnsitz oder Aufenthalt in Deutschland, da`, `${g.er} in Polen gemeldet ist und sich nur auf der Durchreise befindet.`],
    'Bagatelltat: Fall des § 113 Abs. 2 StPO': g => ['Ein Fall des § 113 Abs. 2 StPO lag vor, da', `${g.er} sich nicht ausweisen konnte.`],
    'Haft verhältnismäßig (§ 112 Abs. 1 S. 2 StPO)': () => ['Die Haft stand nicht außer Verhältnis zur Bedeutung der Sache, weil', 'aufgrund einschlägiger Vorstrafen eine Freiheitsstrafe zu erwarten ist.'],
    'Gefahr im Verzug': g => ['Gefahr im Verzug lag vor, weil', `ein richterlicher Haftbefehl um 02:30 Uhr nicht rechtzeitig zu erlangen war und ${g.er} sich sonst entfernt hätte.`],
    'Beschleunigtes Verfahren wahrscheinlich': () => ['Eine Entscheidung im beschleunigten Verfahren war wahrscheinlich, weil', 'der Sachverhalt einfach und die Beweislage durch Video und Zeugen klar ist (Rücksprache StA Muster, 10:15 Uhr).'],
    'Fernbleiben zu befürchten': g => [`Es war zu befürchten, dass ${g.er} der Hauptverhandlung fernbleibt, da`, `${g.er} keinen Wohnsitz im Inland hat und angab, morgen abzureisen.`],
    'Amtshandlung an Ort und Stelle': () => ['Die Amtshandlung an Ort und Stelle war', 'die Durchsuchung der Wohnung Musterstraße 1 unter Leitung von PHK Muster.'],
    'Vorsätzliche Störung bzw. Widersetzen gegen Anordnungen': g => [`${cap(g.der)} störte die Amtshandlung vorsätzlich, indem ${g.er}`, 'trotz zweimaliger Aufforderung wiederholt den abgesperrten Bereich betrat.'],
    'Verdacht einer Verkehrsstraftat nach § 81a Abs. 2 S. 2 StPO': g => ['Bestimmte Tatsachen begründeten den Verdacht einer Trunkenheitsfahrt, da', `deutlicher Alkoholgeruch wahrnehmbar war, ${g.er} in Schlangenlinien fuhr und der Atemalkoholvortest 0,62 mg/l ergab.`],
    'Verdacht einer Ordnungswidrigkeit nach §§ 24a, 24c StVG': () => ['Bestimmte Tatsachen begründeten den Verdacht einer Ordnungswidrigkeit nach § 24a StVG, da', 'der Drogenvortest positiv auf THC reagierte und die Pupillen nicht auf Licht reagierten.'],
    'Verdacht einer Straftat': () => ['Es bestand der Verdacht einer Straftat, nämlich', 'einer Körperverletzung (§ 223 StGB) unter Alkoholeinfluss.'],
    'Verdacht einer Ordnungswidrigkeit': () => ['Es bestand der Verdacht einer Ordnungswidrigkeit, nämlich', 'eines Verstoßes gegen …'],
    'Gefahr im Verzug (Untersuchungserfolg gefährdet)': () => ['Der Untersuchungserfolg war durch Verzögerung gefährdet, weil', 'der Bereitschaftsrichter um 03:10 Uhr nicht erreichbar war und der Wirkstoffabbau das Ergebnis verfälscht hätte.'],
    'Richterliche Anordnung': () => ['Die richterliche Anordnung erteilte', 'Richterin am Amtsgericht Muster telefonisch um 21:40 Uhr.'],
    'Straftat droht': () => ['Es drohte die Begehung einer Straftat, nämlich', 'einer gefährlichen Körperverletzung (§ 224 StGB) zum Nachteil des Kontrahenten.'],
    'Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit': () => ['Es drohte eine Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit, nämlich', '…'],
    'Begehung oder Fortsetzung steht unmittelbar bevor': g => ['Die Begehung bzw. Fortsetzung stand unmittelbar bevor, da', `${g.er} ankündigte, „gleich“ zurückzukommen und den Kontrahenten „abzustechen“, und ein Messer mitführte.`],
    'Gewahrsam unerlässlich': () => ['Der Gewahrsam war unerlässlich, weil', 'Gefährderansprache und Platzverweis um 23:10 Uhr erfolglos blieben und kein milderes Mittel zur Verfügung stand.'],
    'Gefahr für Leib oder Leben der Person': g => [`Es bestand eine Gefahr für Leib oder Leben ${g.des}, da ${g.er}`, 'bei −5 °C nicht ansprechbar auf dem Gehweg lag.'],
    'Zustand, der die freie Willensbestimmung ausschließt': g => [`${cap(g.er)} befand sich in einem Zustand, der die freie Willensbestimmung ausschloss:`, 'lallende Sprache, nicht steh- und gehfähig, zeitlich und örtlich nicht orientiert.'],
    'Hilflose Lage': g => [`${cap(g.er)} befand sich in hilfloser Lage, da ${g.er}`, 'verletzt und orientierungslos an der Landstraße umherirrte.'],
    'Keine mildere Hilfe': () => ['Mildere Hilfe kam nicht in Betracht, weil', 'keine Angehörigen erreichbar waren und der Rettungsdienst keinen Behandlungsbedarf sah.'],
    'Anzeichen einer psychischen Krankheit': g => ['Es lagen Anzeichen einer psychischen Krankheit vor:', `${g.er} äußerte, Stimmen befählen ${g.ihm}, sich vor den Zug zu werfen.`],
    'Erhebliche Selbstgefährdung': g => ['Es bestand eine erhebliche Selbstgefährdung, da', `${g.er} einen konkreten Suizidplan nannte.`],
    'Erhebliche Gefährdung bedeutender Rechtsgüter anderer': g => ['Es bestand eine erhebliche Gefährdung bedeutender Rechtsgüter anderer, da', `${g.er} Nachbarn mit einem Messer bedrohte.`],
    'Gegenwärtig und nicht anders abwendbar': () => ['Die Gefahr war gegenwärtig und nicht anders abwendbar, weil', 'eine freiwillige Behandlung abgelehnt wurde und keine Bezugsperson erreichbar war.'],
    'Rechtmäßiger Platzverweis wird missachtet': g => ['Der Platzverweis wurde rechtmäßig erteilt und missachtet:', `Verweisung vom Bahnhofsvorplatz bis 06:00 Uhr um 22:40 Uhr; ${g.er} kehrte um 22:55 Uhr zurück.`],
    'Rechtmäßige Wohnungsverweisung bzw. Rückkehrverbot wird missachtet': g => ['Die Wohnungsverweisung bzw. das Rückkehrverbot wurde missachtet:', `verfügt am 03.11. für zehn Tage; ${g.er} stand am 05.11. um 19:20 Uhr erneut vor der Wohnungstür.`],
    'Wirksame Anordnung nach § 34b wird missachtet': () => ['Die Anordnung nach § 34b PolG NRW wurde missachtet:', 'Aktenzeichen …, Kontaktverbot zu …; Treffen am … um … Uhr.'],
    'Angaben zur Abwehr einer Gefahr für Leib, Leben oder Freiheit erforderlich': () => ['Die Angaben waren zur Abwehr einer Gefahr für Leib, Leben oder Freiheit erforderlich, weil', 'nur der Zeuge den Aufenthaltsort des vermissten Kindes kennt.'],
    'Erkennungsdienstliche Behandlung erforderlich': () => ['Die erkennungsdienstliche Behandlung war erforderlich, weil', '…'],
    'Rechtmäßige Vorladung ohne hinreichenden Grund nicht befolgt': g => ['Die Vorladung wurde ohne hinreichenden Grund nicht befolgt:', `zugestellt am …, Termin am … um … Uhr; ${g.er} erschien nicht und nannte keinen Grund.`],
    'Identität vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar': g => ['Die Identität war vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar, weil', `${g.er} keine Papiere mitführte, Angaben verweigerte und die Abfrage zu den genannten Personalien ohne Treffer blieb.`],
    'Festhalten nicht außer Verhältnis zur Bedeutung der Sache': () => ['Das Festhalten stand nicht außer Verhältnis zur Bedeutung der Sache, weil', 'die Angaben zur Aufklärung eines Raubes benötigt werden und die Feststellung voraussichtlich nur 30 Minuten dauert.'],
    'Identitätsfeststellung nach § 12 Abs. 1 PolG NRW zulässig': g => ['Die Identitätsfeststellung war nach § 12 Abs. 1 PolG NRW zulässig, weil', `${g.er} sich an einem gefährlichen Ort (Drogenumschlagplatz am Bahnhofsvorplatz) aufhielt.`],
    'Minderjährig, der Obhut entzogen, Zuführung möglich': g => [`${cap(g.der)} ist minderjährig und hat sich der Obhut entzogen:`, `15 Jahre, seit gestern als vermisst gemeldet; Zuführung an die Wohngruppe Musterweg möglich.`],
    'Unmittelbare Gefahr am Ort; Erziehungsberechtigte erreichbar': () => ['Am Ort drohte eine unmittelbare Gefahr für das Wohl, weil', 'dort offen mit Drogen gehandelt wurde; die Mutter war telefonisch erreichbar.'],
    'Unmittelbare Gefahr am Ort; keine erziehungsberechtigte Person erreichbar': () => ['Am Ort drohte eine unmittelbare Gefahr für das Wohl, weil', 'dort offen mit Drogen gehandelt wurde; Erziehungsberechtigte waren nicht erreichbar.'],
    'Aus Haft oder Maßregelvollzug entwichen, sicher identifiziert': g => [`${cap(g.der)} ist entwichen und wurde sicher identifiziert:`, 'Ausschreibung JVA Muster vom …, Lichtbild- und Fingerabdruckabgleich positiv.'],
    'Dringender Verdacht: Voraussetzungen der Sicherungshaft': () => ['Es bestand dringender Verdacht, dass die Voraussetzungen der Sicherungshaft vorliegen, weil', 'die Person vollziehbar ausreisepflichtig ist und sich der Abschiebung bereits einmal entzogen hat.'],
    'Richterliche Entscheidung nicht vorher einholbar': () => ['Die richterliche Entscheidung konnte nicht vorher eingeholt werden, weil', 'die Person zufällig bei einer Verkehrskontrolle um 01:20 Uhr angetroffen wurde.'],
    'Begründeter Verdacht des Entziehens': () => ['Es bestand der begründete Verdacht, dass sich die Person der Haftanordnung entziehen will, weil', '…'],
    'Angeordnete Absonderung wird nicht befolgt': () => ['Die angeordnete Absonderung wurde nicht befolgt:', 'Verfügung Gesundheitsamt vom …; die Person wurde am … außerhalb der Wohnung angetroffen.'],
    'Gültiger Befehl, Person identisch': () => ['Der Befehl war gültig und die Person identisch:', 'Fahndungsabfrage um 14:05 Uhr, Aktenzeichen …, Lichtbild und Geburtsdatum übereinstimmend.']
  };
  function tplFor(d, c) {
    const g = G(d), t = TPL[c];
    if (t) return t(g);
    return [`${endDot(c).replace(/\.$/, '')}, weil`, 'konkrete Tatsachen: was gesehen, gesagt, festgestellt wurde.'];
  }

  /* ======================= Verfahren: Punkte, an denen Verteidiger ansetzen ======================= */
  const DONE = [['ja', 'Erledigt'], ['nein', 'Nicht erfolgt'], ['entf', 'Entfällt']];
  const minor = d => { const g = get(d, 'p.geb'); if (!has(g)) return get(d, 'p.minderj') === 'ja'; const b = new Date(g), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a < 18; };
  const foreign = d => has(get(d, 'p.staat')) && !/^deutsch/i.test(get(d, 'p.staat'));
  const BEL_STPO = [['vorf', 'Vorführung spätestens am Folgetag'], ['schweig', 'Schweigerecht'], ['beweis', 'Beweisanträge'], ['vert', 'Verteidiger (mit Hinweis auf Notdienst)'], ['pflicht', 'Pflichtverteidiger'], ['arzt', 'Ärztliche Untersuchung'], ['benach', 'Benachrichtigung Angehöriger'], ['dolm', 'Dolmetscher'], ['akten', 'Akteneinsicht'], ['konsul', 'Konsulat (bei Ausländern)']];
  /* Je Punkt: k, l (Frage), law, t: 'done' | 'choice', o (bei choice), time, extra [Label, Beispiel], when, ok (Satz bei erledigt), no (Satz bei nicht erfolgt), risk (Hinweis für offene Punkte) */
  const P = {
    grund: { l: 'Grund der Maßnahme mitgeteilt', law: d => (['polg', 'jusch'].includes(kind(d)) ? '§ 37 Abs. 1 PolG NRW' : kind(d) === 'idf' ? '§ 163b Abs. 1 S. 1 i. V. m. § 163a Abs. 4 StPO' : '§ 127 Abs. 4 i. V. m. § 114a StPO'), t: 'done', time: true,
      ok: (d, g, t) => `Der Grund der Maßnahme wurde ${g.dem}${t ? ` um ${t} Uhr` : ''} mitgeteilt.`, no: 'Der Grund der Maßnahme wurde nicht mitgeteilt', risk: 'Grund nicht mitgeteilt – Verstoß gegen Art. 104 GG; unverzüglich nachholen und begründen' },
    belehr: { l: 'Schriftlich belehrt (§ 114b StPO)', law: '§ 114b StPO', t: 'done', time: true, extra: ['Sprache des Formblatts', 'deutsch'],
      ok: (d, g, t, x) => `${cap(g.der)} wurde${t ? ` um ${t} Uhr` : ''} schriftlich${has(x) ? ` in ${/sprache$/i.test(x) ? x : lc(String(x).trim()) + 'er Sprache'}` : ''} über ${g.seine} Rechte belehrt.`, no: 'Eine schriftliche Belehrung ist nicht erfolgt', risk: 'Belehrung nach § 114b fehlt – häufigster Angriffspunkt; Verwertbarkeit späterer Angaben gefährdet' },
    belForm: { l: 'Belehrt mit dem amtlichen Formblatt (alle Rechte)?', law: '§ 114b Abs. 2 StPO', t: 'choice', o: [['ja', 'Ja – Formblatt'], ['nein', 'Nein – einzeln belehrt']], when: d => get(d, 'vf.belehr') === 'ja', xv: [],
      ok: (d, g, t, x, v) => (v === 'ja' ? 'Die Belehrung erfolgte mit dem amtlichen Formblatt über alle Rechte nach § 114b Abs. 2 StPO.' : (arr(get(d, 'vf.belInhalt')).length ? `Belehrt wurde über: ${BEL_STPO.filter(([k]) => arr(get(d, 'vf.belInhalt')).includes(k)).map(([, l]) => l).join(', ')}.` : '')) },
    belInhalt: { l: 'Worüber wurde belehrt?', law: '§ 114b Abs. 2 StPO', t: 'multi', o: BEL_STPO, when: d => get(d, 'vf.belehr') === 'ja' && get(d, 'vf.belForm') === 'nein', h: 'Antippen, was gesagt wurde – Fehlendes erscheint unter „Offene Punkte“.' },
    quitt: { l: 'Empfang quittiert oder Weigerung dokumentiert', law: '§ 114b Abs. 1 S. 4 StPO', t: 'done', when: d => get(d, 'vf.belehr') === 'ja',
      ok: (d, g) => `${cap(g.der)} bestätigte den Erhalt der Belehrung bzw. die Weigerung wurde dokumentiert.`, no: 'Der Erhalt der Belehrung wurde nicht dokumentiert', risk: 'Erhalt der Belehrung nicht dokumentiert (§ 114b Abs. 1 S. 4)' },
    dolm: { l: 'Verständigung', xv: ['dolm', 'nein'], law: '§ 114b Abs. 2 Nr. 7 StPO, § 187 GVG', t: 'choice', o: [['de', 'Versteht Deutsch'], ['dolm', 'Dolmetscher hinzugezogen'], ['nein', 'Kein Dolmetscher verfügbar']], extra: ['Sprache / Dolmetscher', 'Rumänisch, Dolmetscherin Muster (telefonisch)'],
      ok: (d, g, t, x, v) => (v === 'de' ? `${cap(g.der)} verstand die deutsche Sprache.` : v === 'dolm' ? `Die Verständigung erfolgte über eine Dolmetscherin bzw. einen Dolmetscher${has(x) ? ` (${x})` : ''}.` : `Ein Dolmetscher stand nicht zur Verfügung${has(x) ? ` (${x})` : ''}.`), riskV: { nein: 'Kein Dolmetscher – Belehrung und Verständnis besonders sorgfältig dokumentieren, nachholen' } },
    vert: { l: 'Verteidiger', xv: [], law: '§ 114b Abs. 2 Nr. 4 StPO, § 136 StPO', t: 'choice', o: [['nicht', 'Nicht gewünscht'], ['erm', 'Gewünscht – Kontakt ermöglicht'], ['nicht_erm', 'Gewünscht – nicht ermöglicht']],
      ok: (d, g, t, x, v) => (v === 'nicht' ? `${cap(g.der)} wünschte keinen Verteidiger.` : v === 'erm' ? `Auf Wunsch wurde der Kontakt zu einem Verteidiger ermöglicht.` : `${cap(g.der)} wünschte einen Verteidiger; der Kontakt konnte nicht hergestellt werden.`), riskV: { nicht_erm: 'Verteidiger gewünscht, aber nicht erreicht – keine Vernehmung zur Sache ohne Verteidiger, Bemühungen dokumentieren' } },
    benach: { l: 'Benachrichtigung eines Angehörigen oder einer Vertrauensperson', law: d => (['polg', 'jusch'].includes(kind(d)) ? '§ 37 Abs. 2 PolG NRW' : '§ 114c StPO, Art. 104 Abs. 4 GG'), t: 'done', time: true, extra: ['Wer wurde benachrichtigt?', 'Ehefrau telefonisch'],
      ok: (d, g, t, x) => `${has(x) ? cap(x) : ph('Wer')} wurde${t ? ` um ${t} Uhr` : ''} benachrichtigt.`, no: 'Eine Benachrichtigung ist nicht erfolgt', risk: 'Keine Benachrichtigung Angehöriger – nur zulässig, wenn der Untersuchungszweck erheblich gefährdet ist; Grund dokumentieren' },
    sorge: { l: 'Sorgeberechtigte bzw. Erziehungsberechtigte benachrichtigt', law: d => (['polg', 'jusch'].includes(kind(d)) ? '§ 37 Abs. 2 PolG NRW' : '§ 67a JGG'), t: 'done', time: true, when: minor, extra: ['Wer?', 'Mutter, telefonisch'],
      ok: (d, g, t, x) => `Die Erziehungsberechtigten${has(x) ? ` (${x})` : ''} wurden${t ? ` um ${t} Uhr` : ''} benachrichtigt.`, no: 'Die Erziehungsberechtigten wurden nicht benachrichtigt', risk: 'Minderjährig: Erziehungsberechtigte nicht benachrichtigt (§ 67a JGG bzw. § 37 PolG NRW)' },
    konsul: { l: 'Hinweis auf Benachrichtigung des Konsulats', law: 'Art. 36 WÜK, § 114b Abs. 2 S. 4 StPO', t: 'done', when: foreign,
      ok: (d, g) => `${cap(g.der)} wurde auf das Recht zur Benachrichtigung der konsularischen Vertretung hingewiesen.`, no: 'Ein Hinweis auf die Konsularbenachrichtigung ist nicht erfolgt', risk: 'Ausländische Staatsangehörigkeit: Konsularbelehrung (Art. 36 WÜK) fehlt' },
    sta: { l: 'Staatsanwaltschaft unterrichtet', law: '§ 127 Abs. 2, § 128 StPO', t: 'done', time: true, extra: ['StA und Entscheidung', 'StA Muster: Vorführung zur Prüfung eines Haftbefehls'],
      ok: (d, g, t, x) => `Die Staatsanwaltschaft wurde${t ? ` um ${t} Uhr` : ''} unterrichtet${has(x) ? ` (${x})` : ''}.`, no: 'Die Staatsanwaltschaft wurde nicht unterrichtet', risk: 'Staatsanwaltschaft nicht unterrichtet – unverzüglich nachholen' },
    vorf: { l: 'Vorführung oder Freilassung', law: '§ 128 Abs. 1 StPO, Art. 104 Abs. 3 GG', t: 'choice', time: true, o: [['vorf', 'Vorführung beim Amtsgericht'], ['frei', 'Freilassung']], extra: ['Gericht / Anordnung', 'AG Muster, Bereitschaftsrichter'],
      ok: (d, g, t, x, v) => (v === 'vorf' ? `${cap(g.der)} wurde${t ? ` um ${t} Uhr` : ''} dem Amtsgericht vorgeführt${has(x) ? ` (${x})` : ''}.` : `${cap(g.der)} wurde${t ? ` um ${t} Uhr` : ''} freigelassen${has(x) ? ` (${x})` : ''}.`) },
    richterPol: { l: 'Richterliche Entscheidung', tv: ['herb'], law: '§ 36 PolG NRW, Buch 7 FamFG', t: 'choice', time: true, o: [['herb', 'Herbeigeführt'], ['entb', 'Entbehrlich – Grund vorher entfallen'], ['nein', 'Nicht herbeigeführt']], extra: ['Richter / Ergebnis bzw. Grund', 'AG Muster, Fortdauer bis 06:00 Uhr angeordnet'],
      ok: (d, g, t, x, v) => (v === 'herb' ? `Die richterliche Entscheidung wurde${t ? ` um ${t} Uhr` : ''} herbeigeführt${has(x) ? ` (${x})` : ''}.` : v === 'entb' ? `Eine richterliche Entscheidung war entbehrlich, da der Grund der Maßnahme vor ihr entfallen wäre${has(x) ? ` (${x})` : ''}.` : `Eine richterliche Entscheidung wurde nicht herbeigeführt${has(x) ? `, weil ${x}` : ''}.`), riskV: { nein: 'Keine richterliche Entscheidung – nur bei Wegfall des Grundes vor der Entscheidung zulässig (§ 36 PolG NRW, BVerfGE 105, 239)' } },
    richterIdf: { l: 'Richterliche Entscheidung', tv: ['herb'], xv: [], law: '§ 163c Abs. 1 S. 2 StPO', t: 'choice', time: true, o: [['entb', 'Entbehrlich – Identität schneller festgestellt'], ['herb', 'Richter eingeschaltet'], ['nein', 'Nicht herbeigeführt']],
      ok: (d, g, t, x, v) => (v === 'entb' ? 'Eine richterliche Entscheidung war entbehrlich, da die Identität schneller festgestellt werden konnte, als die Entscheidung herbeizuführen gewesen wäre.' : v === 'herb' ? `Der Richter wurde${t ? ` um ${t} Uhr` : ''} eingeschaltet.` : 'Eine richterliche Entscheidung wurde nicht herbeigeführt.'), riskV: { nein: 'Keine richterliche Entscheidung trotz längerer Dauer (§ 163c Abs. 1 S. 2 StPO)' } },
    ende12: { l: 'Ende des Festhaltens', law: '§ 163c Abs. 1, 2 StPO (höchstens zwölf Stunden)', t: 'time', ok: (d, g, t) => `${cap(g.der)} wurde nach Feststellung der Identität um ${t} Uhr entlassen.` },
    vernicht: { l: 'Unterlagen nach Feststellung vernichtet', law: '§ 163c Abs. 3 StPO', t: 'done', when: d => fe(d).zeuge, ok: () => 'Die im Zusammenhang mit der Feststellung angefallenen Unterlagen wurden vernichtet.', no: 'Die Unterlagen wurden nicht vernichtet', risk: 'Unverdächtige: Unterlagen nach § 163c Abs. 3 vernichten' },
    gewf: { l: 'Gewahrsamsfähigkeit geprüft', law: 'Fürsorgepflicht im Gewahrsam', t: 'done', time: true, extra: ['Durch wen / Ergebnis', 'Polizeiarzt Dr. Muster: gewahrsamsfähig'],
      ok: (d, g, t, x) => `Die Gewahrsamsfähigkeit wurde${t ? ` um ${t} Uhr` : ''} geprüft${has(x) ? ` (${x})` : ''}.`, no: 'Die Gewahrsamsfähigkeit wurde nicht geprüft', risk: 'Gewahrsamsfähigkeit nicht geprüft (Alkohol, Drogen, Verletzungen) – Haftungsrisiko' },
    durchs: { l: 'Durchsuchung der Person oder mitgeführter Sachen', xv: ['ja'], law: '§ 102 StPO bzw. § 39 PolG NRW', t: 'choice', o: [['nein', 'Keine'], ['ja', 'Durchgeführt']], extra: ['Grundlage / Ergebnis', 'Eigensicherung, § 39 Abs. 1 Nr. 1 PolG NRW; Taschenmesser sichergestellt'],
      ok: (d, g, t, x, v) => (v === 'ja' ? `${cap(g.der)} wurde durchsucht${has(x) ? ` (${x})` : ''}.` : '') },
    fix: { l: 'Fixierung', xv: ['lang'], law: 'BVerfG 2 BvR 309/15', t: 'choice', o: [['nein', 'Keine'], ['kurz', 'Nur kurzfristig'], ['lang', 'Über etwa 30 Minuten (5-/7-Punkt)']], extra: ['Richterliche Entscheidung zur Fixierung', 'AG Muster, 02:15 Uhr'],
      ok: (d, g, t, x, v) => (v === 'lang' ? `${cap(g.der)} wurde fixiert; die richterliche Entscheidung ${has(x) ? `erging (${x})` : ph('Richter zur Fixierung')}.` : v === 'kurz' ? `${cap(g.der)} wurde kurzfristig fixiert.` : ''), riskV: { lang: 'Fixierung über ca. 30 Minuten: eigene richterliche Entscheidung nötig (BVerfG 2018)' } },
    uebergabe: { l: 'Übergabe an die Polizei', law: '§ 127 Abs. 1 StPO', t: 'done', time: true, extra: ['Festnehmende Person', 'Ladendetektiv Muster, Firma …'],
      ok: (d, g, t, x) => `${cap(g.der)} wurde${has(x) ? ` von ${x}` : ''} vorläufig festgenommen und${t ? ` um ${t} Uhr` : ''} an die Polizei übergeben.`, no: 'Die Übergabe an die Polizei ist nicht dokumentiert', risk: 'Jedermann-Festnahme: Übergabezeit fehlt' },
    gewalt: { l: 'Gewalt bei der Festnahme', xv: ['ja'], law: '§ 127 Abs. 1 StPO', t: 'choice', o: [['keine', 'Ohne Gewalt'], ['ja', 'Mit körperlicher Gewalt']], extra: ['Art und Folgen', 'am Arm festgehalten, keine Verletzungen'],
      ok: (d, g, t, x, v) => (v === 'ja' ? `Bei der Festnahme wurde körperliche Gewalt angewendet${has(x) ? ` (${x})` : ''}.` : 'Die Festnahme erfolgte ohne Gewalt.') },
    leitung: { l: 'Leitender Beamter der Amtshandlung', law: '§ 164 StPO', t: 'text', extra: ['Wer leitete, wer ordnete an?', 'PHK Muster'], ok: (d, g, t, x) => `Die Festnahme ordnete ${x} als Leiter der Amtshandlung an.` },
    ende164: { l: 'Ende der Amtshandlung und Entlassung', law: '§ 164 StPO (höchstens bis Ende des nächsten Tages)', t: 'time', ok: (d, g, t) => `Nach Beendigung der Amtshandlung wurde ${g.der} um ${t} Uhr entlassen.` },
    anord: { l: 'Anordnung der Blutprobe', tv: ['richter', 'sta', 'ep'], xv: ['richter', 'sta', 'ep'], law: '§ 81a Abs. 2 StPO, § 46 Abs. 4 OWiG', t: 'choice', time: true, o: [['kein', 'Ohne Anordnung (§ 81a Abs. 2 S. 2)'], ['richter', 'Richter'], ['sta', 'Staatsanwaltschaft'], ['ep', 'Ermittlungsperson']], extra: ['Anordnende Person', 'POK Muster'],
      ok: (d, g, t, x, v) => (v === 'kein' ? `Die Blutprobe bedurfte keiner richterlichen Anordnung (§ 81a Abs. 2 S. 2 StPO bzw. § 46 Abs. 4 S. 2 OWiG).` : `Die Blutprobe wurde${t ? ` um ${t} Uhr` : ''} ${v === 'richter' ? 'richterlich' : v === 'sta' ? 'durch die Staatsanwaltschaft' : 'durch eine Ermittlungsperson der Staatsanwaltschaft'} angeordnet${has(x) ? ` (${x})` : ''}.`) },
    richterVers: { l: 'Versuch, den Richter zu erreichen', law: 'BVerfG 2 BvR 273/06', t: 'done', time: true, when: d => ['sta', 'ep'].includes(get(d, 'vf.anord')),
      ok: (d, g, t) => `Vor der Anordnung wurde${t ? ` um ${t} Uhr` : ''} versucht, eine richterliche Entscheidung zu erlangen.`, no: 'Ein Versuch, den Richter zu erreichen, ist nicht dokumentiert', risk: 'Eilanordnung der Blutprobe ohne dokumentierten Versuch, den Richter zu erreichen' },
    bel136: { l: 'Beschuldigtenbelehrung (Tatvorwurf, Schweigerecht)', law: '§ 136, § 163a Abs. 4 StPO', t: 'done', time: true,
      ok: (d, g, t) => `${cap(g.der)} wurde${t ? ` um ${t} Uhr` : ''} über den Tatvorwurf und ${g.seine} Rechte als Beschuldigte${g.er === 'er' ? 'r' : ''} belehrt.`, no: 'Eine Beschuldigtenbelehrung ist nicht erfolgt', risk: 'Beschuldigtenbelehrung fehlt – Angaben zum Trinkverhalten möglicherweise unverwertbar' },
    freiw: { l: 'Hinweis: Atemalkohol- und Urintest freiwillig', law: '§ 81a StPO', t: 'done', ok: (d, g) => `${cap(g.der)} wurde darauf hingewiesen, dass Atemalkohol- und Urintest freiwillig sind.`, no: 'Ein Hinweis auf die Freiwilligkeit der Vortests ist nicht erfolgt', risk: 'Freiwilligkeit der Vortests nicht belehrt' },
    arzt: { l: 'Entnahme durch Arzt', law: '§ 81a Abs. 1 S. 2 StPO', t: 'time', extra: ['Arzt / Ort', 'Dr. Muster, Klinikum Muster'], ok: (d, g, t, x) => `Die Blutentnahme erfolgte um ${t} Uhr${has(x) ? ` durch ${x}` : ''}.` },
    abschrift: { l: 'Abschrift des Befehls ausgehändigt bzw. Gründe mitgeteilt', law: '§ 114a StPO', t: 'done', time: true,
      ok: (d, g, t) => `${cap(g.dem)} wurde${t ? ` um ${t} Uhr` : ''} eine Abschrift des Befehls ausgehändigt bzw. wurden die Gründe mitgeteilt.`, no: 'Weder Abschrift noch Mitteilung der Gründe', risk: 'Abschrift des Haftbefehls fehlt – unverzüglich nachholen (§ 114a)' },
    vorfGer: { l: 'Vorführung beim Gericht', xv: [], law: '§§ 115, 115a StPO', t: 'choice', time: true, o: [['zust', 'Zuständiges Gericht'], ['naechst', 'Nächstes Amtsgericht (§ 115a)']],
      ok: (d, g, t, x, v) => `${cap(g.der)} wurde${t ? ` um ${t} Uhr` : ''} ${v === 'zust' ? 'dem zuständigen Gericht' : 'dem nächsten Amtsgericht (§ 115a StPO)'} vorgeführt.` },
    jva: { l: 'Einlieferung in die Justizvollzugsanstalt', law: '§ 457 StPO, § 96 OWiG', t: 'time', extra: ['JVA', 'JVA Muster'], ok: (d, g, t, x) => `${cap(g.der)} wurde um ${t} Uhr in die ${has(x) ? x : 'Justizvollzugsanstalt'} eingeliefert.` },
    zahlung: { l: 'Abwendung durch Zahlung angeboten', law: 'Ersatzfreiheitsstrafe / § 96 OWiG', t: 'done', ok: (d, g) => `${cap(g.der)} wurde auf die Möglichkeit hingewiesen, die Vollstreckung durch Zahlung abzuwenden.`, no: 'Ein Hinweis auf die Abwendung durch Zahlung ist nicht erfolgt', risk: 'Abwendung durch Zahlung nicht angeboten' },
    behoerde: { l: 'Zuständige Behörde verständigt', law: 'PsychKG NRW, SGB VIII, AufenthG, IfSG', t: 'done', time: true, extra: ['Behörde / Person', 'Ordnungsamt Muster, Herr …'],
      ok: (d, g, t, x) => `${has(x) ? cap(x) : 'Die zuständige Behörde'} wurde${t ? ` um ${t} Uhr` : ''} verständigt.`, no: 'Die zuständige Behörde wurde nicht verständigt', risk: 'Zuständige Behörde nicht eingebunden – Polizei handelt nur in Vollzugs- bzw. Amtshilfe' },
    zeugnis: { l: 'Ärztliches Zeugnis', law: '§ 14 PsychKG NRW', t: 'done', time: true, when: d => /psych/i.test(fe(d).norm || ''), extra: ['Arzt', 'Notärztin Dr. Muster'],
      ok: (d, g, t, x) => `Ein ärztliches Zeugnis über einen aktuellen Befund lag${t ? ` um ${t} Uhr` : ''} vor${has(x) ? ` (${x})` : ''}.`, no: 'Ein ärztliches Zeugnis lag nicht vor', risk: 'Sofortige Unterbringung ohne aktuelles ärztliches Zeugnis' },
    richterSonder: { l: 'Gerichtliche Entscheidung', tv: ['herb'], xv: [], law: 'Buch 7 FamFG, § 428 FamFG', t: 'choice', time: true, o: [['herb', 'Herbeigeführt'], ['beh', 'Durch die Behörde veranlasst'], ['nein', 'Nicht herbeigeführt']],
      ok: (d, g, t, x, v) => (v === 'herb' ? `Die gerichtliche Entscheidung wurde${t ? ` um ${t} Uhr` : ''} herbeigeführt.` : v === 'beh' ? 'Die gerichtliche Entscheidung veranlasste die zuständige Behörde.' : 'Eine gerichtliche Entscheidung wurde nicht herbeigeführt.'), riskV: { nein: 'Ohne gerichtliche Entscheidung spätestens mit Ablauf des Folgetages freilassen (§ 428 FamFG)' } },
    zuf: { l: 'Übergabe', law: '§ 35 Abs. 2 PolG NRW, § 8 JuSchG, § 42 SGB VIII', t: 'time', extra: ['An wen?', 'Mutter / Jugendamt Muster'], ok: (d, g, t, x) => `${cap(g.der)} wurde um ${t} Uhr ${has(x) ? `an ${x}` : ph('an wen')} übergeben.` },
    entl: { l: 'Entlassung', law: '§ 38 PolG NRW, Art. 104 Abs. 2 S. 3 GG', t: 'time', extra: ['Grund der Entlassung', 'ausgenüchtert, Zweck erreicht'], ok: (d, g, t, x) => `${cap(g.der)} wurde um ${t} Uhr entlassen${has(x) ? ` (${x})` : ''}.` }
  };
  const ORDER = {
    stpo: ['grund', 'belehr', 'belForm', 'belInhalt', 'quitt', 'dolm', 'vert', 'benach', 'sorge', 'konsul', 'sta', 'gewf', 'durchs', 'fix', 'vorf'],
    jedermann: ['uebergabe', 'gewalt', 'grund', 'belehr', 'belForm', 'belInhalt', 'dolm', 'benach', 'sorge', 'konsul', 'sta', 'vorf'],
    idf: ['grund', 'belehr', 'belForm', 'belInhalt', 'dolm', 'benach', 'sorge', 'konsul', 'durchs', 'richterIdf', 'ende12', 'vernicht'],
    s164: ['leitung', 'grund', 'dolm', 'benach', 'sorge', 'ende164'],
    bp: ['anord', 'richterVers', 'bel136', 'freiw', 'dolm', 'sorge', 'arzt', 'entl'],
    polg: ['grund', 'dolm', 'benach', 'sorge', 'konsul', 'gewf', 'durchs', 'fix', 'richterPol', 'entl'],
    jusch: ['grund', 'sorge', 'behoerde', 'zuf'],
    sonder: ['behoerde', 'zeugnis', 'grund', 'dolm', 'benach', 'sorge', 'fix', 'richterSonder', 'zuf'],
    vollzug: ['abschrift', 'belehr', 'belForm', 'belInhalt', 'quitt', 'dolm', 'benach', 'sorge', 'konsul', 'gewf', 'vorfGer'],
    vollstr: ['abschrift', 'zahlung', 'dolm', 'benach', 'sorge', 'konsul', 'gewf', 'jva']
  };
  const items = d => (ORDER[kind(d)] || ORDER.stpo).map(k => ({ k, ...P[k] })).filter(it => !it.when || it.when(d));
  const lawOf = (it, d) => (typeof it.law === 'function' ? it.law(d) : it.law);

  /* Felder: alle denkbaren Punkte statisch, sichtbar je nach Art (writer.js filtert über when) */
  const allKeys = [...new Set(Object.values(ORDER).flat())];
  const inKind = k => d => (ORDER[kind(d)] || ORDER.stpo).includes(k) && (!P[k].when || P[k].when(d));
  function itemFields(k) {
    const it = P[k], vis = inKind(k), F = [];
    const lab = d => `${it.l} · ${lawOf(it, d)}`;
    if (it.t === 'done') F.push({ k: 'vf.' + k, t: 'yn', l: lab, o: DONE, when: vis });
    else if (it.t === 'choice') F.push({ k: 'vf.' + k, t: 'choice', l: lab, o: it.o, when: vis });
    else if (it.t === 'multi') F.push({ k: 'vf.' + k, t: 'multi', l: lab, h: it.h, o: it.o, when: vis });
    else if (it.t === 'time') F.push({ k: 'vf.' + k + 'T', t: 'time', l: lab, q: true, w: 'half', when: vis });
    else if (it.t === 'text') F.push({ k: 'vf.' + k + 'X', t: 'text', l: d => `${it.extra[0]} · ${lawOf(it, d)}`, ph: it.extra[1], when: vis });
    const val = d => get(d, 'vf.' + k);
    const on = (d, list) => vis(d) && (it.t === 'done' ? val(d) === 'ja' : it.t === 'choice' ? has(val(d)) && (!list || list.includes(val(d))) : false);
    if (it.time && (it.t === 'done' || it.t === 'choice')) F.push({ k: 'vf.' + k + 'T', t: 'time', l: 'Uhrzeit', q: true, w: 'half', when: d => on(d, it.tv) });
    if (it.extra && it.t !== 'text') F.push({ k: 'vf.' + k + 'X', t: 'text', l: it.extra[0], ph: it.extra[1], w: it.time || it.t === 'time' ? 'half' : undefined, when: d => (it.t === 'time' ? vis(d) : on(d, it.xv)) });
    if (it.t === 'done' && it.no) F.push({ k: 'vf.' + k + 'W', t: 'area', rows: 2, l: 'Warum nicht?', pre: 'Nicht erfolgt, weil', ph: 'der Untersuchungszweck sonst erheblich gefährdet gewesen wäre (Mittäter flüchtig).', when: d => vis(d) && val(d) === 'nein' });
    return F;
  }

  /* ======================= Schritte ======================= */
  const wegInfo = d => {
    const f = fe(d);
    if (!f.norm) return 'Dieser Bericht entsteht aus der FE-Prüfung: Dort den Weg bis zum Ergebnis gehen und „Diesen Weg wählen“ antippen.';
    return `Rechtsgrundlage: ${f.norm}\n` + steps(d).map((s, i) => `${i + 1}. ${s.q} → ${s.a}${s.c ? `  ✓ ${s.c}` : ''}`).join('\n');
  };
  const SLOTS = 14;
  const slotFields = Array.from({ length: SLOTS }, (_, i) => ({
    k: 'bg.' + i, t: 'area', rows: 2,
    l: d => { const c = conds(d)[i]; return c ? `${i + 1}. ${c.c}` : ''; },
    pre: d => { const c = conds(d)[i]; return c ? tplFor(d, c.c)[0] : ''; },
    ph: d => { const c = conds(d)[i]; return c ? tplFor(d, c.c)[1] : ''; },
    when: d => conds(d).length > i
  }));
  const STEPS = [
    { id: 'person', phase: 'Person', title: 'Wer ist betroffen?', lead: 'Das Geschlecht steuert die Satzführung im Bericht („der Beschuldigte“ / „die Beschuldigte“).', gen: ['1'],
      fields: [
        { t: 'info', text: d => wegInfo(d) },
        { k: 'p.geschlecht', t: 'choice', l: 'Ist die Person männlich oder weiblich?', req: true, o: [['m', 'Männlich'], ['w', 'Weiblich']] },
        { k: 'p', t: 'person', l: d => (fe(d).zeuge ? 'Zeugin / Zeuge' : ROLE[kind(d)] === 'b' ? 'Beschuldigte Person' : 'Betroffene Person'), fields: ['nachname', 'vorname', 'geb'] },
        { k: 'p.staat', t: 'text', l: 'Staatsangehörigkeit', ph: 'deutsch', w: 'half', h: 'Bei ausländischer Staatsangehörigkeit wird die Konsularbelehrung abgefragt.' },
        { k: 'p.minderj', t: 'yn', l: 'Minderjährig?', w: 'half', when: d => !has(get(d, 'p.geb')) }
      ] },
    { id: 'lage', phase: 'Lage', title: 'Was ist passiert?', lead: 'Kurz und sachlich – Zeitpunkt des Ergreifens ist der Beginn aller Fristen.', gen: ['2'],
      fields: [
        { k: 'einsatz.datum', t: 'date', l: 'Datum', w: 'half', q: 'heute' },
        { k: 'einsatz.zeit', t: 'time', l: 'Uhrzeit des Ergreifens', w: 'half', q: true, req: true },
        { k: 'einsatz.ort', t: 'text', l: 'Ort', ph: 'Musterstraße 1, 12345 Musterstadt (Filiale Supermarkt)', recent: ['einsatz.ort'] },
        { k: 'lage.anlass', t: 'area', rows: 2, l: 'Anlass des Einschreitens', pre: 'Anlass des Einschreitens war', ph: 'eine Mitteilung der Leitstelle über einen festgehaltenen Ladendieb.' },
        { k: 'lage.sv', t: 'area', rows: 4, l: 'Sachverhalt vor Ort', pre: 'Vor Ort stellte sich folgender Sachverhalt dar:', ph: d => `Der Ladendetektiv gab an, ${G(d).den} beobachtet zu haben, wie ${G(d).er} zwei Flaschen Whisky in ${G(d).seine} Jacke steckte und den Kassenbereich ohne zu bezahlen passierte.` }
      ] },
    { id: 'gruende', phase: 'Begründung', title: 'Warum lagen die Voraussetzungen vor?', lead: 'Je Voraussetzung ein Satz: Der Anfang steht fest, das Graue zeigt, wie es weitergeht. Konkrete Tatsachen – was gesehen, gesagt, festgestellt wurde.', gen: ['3'],
      fields: [
        { t: 'info', when: d => !conds(d).length, text: 'Für diesen Weg wurden keine einzelnen Voraussetzungen erfasst – die Begründung unten frei ergänzen.' },
        ...slotFields,
        { t: 'head', text: 'Verhältnismäßigkeit' },
        { k: 'bg.milder', t: 'area', rows: 2, l: 'Mildere Mittel', pre: 'Ein milderes Mittel kam nicht in Betracht, weil', ph: d => `${G(d).er} sich trotz Ansprache weiter entfernen wollte und ${G(d).seine} Identität anders nicht zu klären war.` },
        { t: 'head', text: 'Maßnahme' },
        { k: 'bg.mass', t: 'area', rows: 2, l: 'Was wurde getan?', pre: d => `${cap(G(d).der)} wurde`, ph: d => (kind(d) === 'polg' ? 'um 23:15 Uhr in Gewahrsam genommen und zur Polizeiwache Muster verbracht.' : kind(d) === 'idf' ? 'zur Feststellung der Identität festgehalten und zur Polizeiwache Muster verbracht.' : kind(d) === 'bp' ? 'zur Blutentnahme in das Klinikum Muster verbracht.' : 'um 14:10 Uhr vorläufig festgenommen, gefesselt und zur Polizeiwache Muster verbracht.') }
      ] },
    { id: 'verfahren', phase: 'Verfahren', title: 'Formvorschriften – an alles gedacht?', lead: 'Hier setzen Verteidiger an. Erledigt, nicht erfolgt (mit Grund) oder entfällt – fehlende Punkte erscheinen unter „Offene Punkte“.', gen: ['4'],
      fields: allKeys.flatMap(itemFields) },
    { id: 'abschluss', phase: 'Abschluss', title: 'Abschluss', lead: 'Was folgte – und wer hat gehandelt?', gen: ['5'],
      fields: [
        { k: 'abs.weiter', t: 'area', rows: 2, l: 'Weitere Maßnahmen', pre: 'Weiter wurde veranlasst:', ph: 'Sicherstellung des Diebesguts, Strafanzeige wegen Diebstahls, Lichtbilder der Örtlichkeit.' },
        { k: 'abs.beamte', t: 'text', l: 'Beteiligte Beamtinnen und Beamte', ph: 'POK Muster, PK’in Beispiel' }
      ] }
  ];

  /* ======================= Text ======================= */
  /** Satzanfang + Eingabe; tippt jemand das letzte Wort des Satzanfangs noch einmal („da er er …“), fällt es weg. */
  function sentence(pre, txt, fallback) {
    if (!has(txt)) return fallback;
    let t = String(txt).trim();
    const last = (String(pre).trim().split(/\s+/).pop() || '').replace(/[,:]$/, '').toLowerCase();
    const first = (t.split(/\s+/)[0] || '').toLowerCase();
    if (last && first === last && !/[,:]$/.test(String(pre).trim())) t = t.slice(t.split(/\s+/)[0].length).trim();
    return endDot(`${pre} ${t}`);
  }
  function secGruende(d) {
    const f = fe(d), out = [];
    out.push(`Die Maßnahme stützt sich auf ${f.norm || ph('Rechtsgrundlage')}.`);
    conds(d).forEach((c, i) => { const [pre] = tplFor(d, c.c); out.push(sentence(pre, get(d, 'bg.' + i), `${c.c}: ${ph('Begründung')}`)); });
    if (has(get(d, 'bg.milder'))) out.push(sentence('Ein milderes Mittel kam nicht in Betracht, weil', get(d, 'bg.milder')));
    return out.join(' ');
  }
  function verfSentences(d) {
    const g = G(d), out = [];
    for (const it of items(d)) {
      const v = get(d, 'vf.' + it.k), t = get(d, 'vf.' + it.k + 'T'), x = get(d, 'vf.' + it.k + 'X'), w = get(d, 'vf.' + it.k + 'W');
      if (it.t === 'multi') continue;
      if (it.t === 'time') { if (has(t)) out.push(it.ok(d, g, t, x)); else out.push(ph(it.l)); continue; }
      if (it.t === 'text') { if (has(x)) out.push(it.ok(d, g, t, x)); else out.push(ph(it.extra[0])); continue; }
      if (!has(v)) { out.push(ph(it.l)); continue; }
      if (v === 'entf') continue;
      if (it.t === 'done') { out.push(v === 'ja' ? it.ok(d, g, t, x) : endDot(`${it.no}${has(w) ? `, weil ${String(w).trim().replace(/[.]$/, '')}` : ''}`)); continue; }
      const s = it.ok(d, g, t, x, v); if (s) out.push(s);
    }
    return out.filter(Boolean).join(' ');
  }
  function belFehlt(d) {
    if (get(d, 'vf.belehr') !== 'ja' || get(d, 'vf.belForm') !== 'nein') return [];
    const got = arr(get(d, 'vf.belInhalt'));
    return BEL_STPO.filter(([k]) => !got.includes(k) && !(k === 'konsul' && !foreign(d)) && !(k === 'pflicht')).map(([, l]) => l);
  }
  function text(d) {
    d = d || {};
    const f = fe(d), g = G(d);
    const einsatz = `Einsatz am ${fmtDate(get(d, 'einsatz.datum')) || ph('Datum')}, ${get(d, 'einsatz.zeit') || ph('Uhrzeit')} Uhr, Einsatzort: ${get(d, 'einsatz.ort') || ph('Ort')}.`;
    const rolle = f.zeuge ? 'Zeugin bzw. Zeuge' : ROLE[kind(d)] === 'b' ? 'Beschuldigte Person' : 'Betroffene Person';
    const sv = [sentence('Anlass des Einschreitens war', get(d, 'lage.anlass'), ''), sentence('Vor Ort stellte sich folgender Sachverhalt dar:', get(d, 'lage.sv'), ph('Sachverhalt'))].filter(Boolean).join(' ');
    const name = [get(d, 'p.vorname'), get(d, 'p.nachname')].filter(has).join(' ');
    const person = `${rolle}: ${has(name) ? name : ph('Name')}${has(get(d, 'p.geb')) ? `, geb. ${fmtDate(get(d, 'p.geb'))}` : ''}${has(get(d, 'p.staat')) ? `, ${get(d, 'p.staat')}` : ''}.`;
    const mass = sentence(`${cap(g.der)} wurde`, get(d, 'bg.mass'), ph('Maßnahme'));
    const fehlt = belFehlt(d);
    const abs = [sentence('Weiter wurde veranlasst:', get(d, 'abs.weiter'), ''), has(get(d, 'abs.beamte')) ? `Beteiligt: ${get(d, 'abs.beamte')}.` : ''].filter(Boolean).join(' ');
    return [
      ['1', 'Sachverhalt', `${einsatz} ${person} ${sv}`, 'lage'],
      ['2', `Rechtliche Würdigung – ${f.norm || 'Rechtsgrundlage'}`, secGruende(d), 'gruende'],
      ['3', 'Maßnahme', mass, 'gruende'],
      ['4', 'Verfahren', verfSentences(d) + (fehlt.length ? ` Nicht ausdrücklich belehrt wurde über: ${fehlt.join(', ')}.` : ''), 'verfahren'],
      ...(abs ? [['5', 'Weitere Maßnahmen', abs, 'abschluss']] : [])
    ];
  }
  const plain = d => ['Vermerk zur Freiheitsentziehung', ...text(d).map(([n, t, x]) => `${n} ${t}\n${x}`)].join('\n\n');
  function preview(stepId, d) {
    const s = text(d || {}).filter(x => x[3] === stepId);
    if (stepId === 'person') return `${cap(G(d || {}).der)} · ${KIND_L[kind(d || {})] || ''}\n${wegInfo(d || {})}`;
    return s.map(([n, t, x]) => `${n} ${t}\n${x}`).join('\n\n');
  }
  function kurzText(d) {
    d = d || {}; const f = fe(d), g = G(d);
    return endDot(`${fmtDate(get(d, 'einsatz.datum'))} ${get(d, 'einsatz.zeit') || ''} Uhr${has(get(d, 'einsatz.ort')) ? `, ${get(d, 'einsatz.ort')}` : ''}: ${KIND_L[kind(d)] || 'Freiheitsentziehung'} – ${f.norm || ph('Rechtsgrundlage')}. ${cap(g.der)} ${has(get(d, 'bg.mass')) ? 'wurde ' + String(get(d, 'bg.mass')).trim() : ph('Maßnahme')}`);
  }
  function offen(d) {
    d = d || {}; const out = [];
    if (!has(get(d, 'p.geschlecht'))) out.push('Geschlecht für die Satzführung angeben');
    if (!has(get(d, 'einsatz.zeit'))) out.push('Uhrzeit des Ergreifens fehlt – Beginn aller Fristen');
    conds(d).forEach((c, i) => { if (!has(get(d, 'bg.' + i))) out.push(`Begründung fehlt: ${c.c}`); });
    for (const it of items(d)) {
      if (it.t === 'multi') continue;
      const v = get(d, 'vf.' + it.k), lawt = lawOf(it, d);
      if (it.t === 'time') { if (!has(get(d, 'vf.' + it.k + 'T'))) out.push(`${it.l} (${lawt}): Uhrzeit fehlt`); continue; }
      if (it.t === 'text') { if (!has(get(d, 'vf.' + it.k + 'X'))) out.push(`${it.extra[0]} (${lawt}) fehlt`); continue; }
      if (!has(v)) { out.push(`${it.l} (${lawt}) – noch nicht beantwortet`); continue; }
      if (it.t === 'done' && v === 'nein') out.push(`Angriffspunkt: ${it.risk || it.l}${has(get(d, 'vf.' + it.k + 'W')) || /dokumentieren/.test(it.risk || '') ? '' : ' – Grund dokumentieren'}`);
      if (it.riskV && it.riskV[v]) out.push(`Angriffspunkt: ${it.riskV[v]}`);
    }
    belFehlt(d).forEach(l => out.push(`Belehrung unvollständig (§ 114b Abs. 2 StPO): ${l}`));
    return out;
  }
  function personalien(d) {
    d = d || {}; const rows = [];
    const line = (l, v) => { if (has(v)) rows.push(`${l}: ${v}`); };
    rows.push(fe(d).zeuge ? 'Zeugin / Zeuge' : ROLE[kind(d)] === 'b' ? 'Beschuldigte Person' : 'Betroffene Person');
    line('Name', [get(d, 'p.nachname'), get(d, 'p.vorname')].filter(has).join(', '));
    line('Geschlecht', { m: 'männlich', w: 'weiblich' }[get(d, 'p.geschlecht')]);
    line('Geburtsdatum', get(d, 'p.geb') ? fmtDate(get(d, 'p.geb')) : '');
    line('Staatsangehörigkeit', get(d, 'p.staat'));
    return rows.join('\n');
  }
  function title(d) {
    d = d || {}; const n = [get(d, 'p.nachname'), get(d, 'p.vorname')].filter(has).join(', ');
    return ['FE', n || null, fe(d).norm || null, get(d, 'einsatz.datum') ? fmtDate(get(d, 'einsatz.datum')) : null].filter(Boolean).join(' · ');
  }
  const subtitle = d => [KIND_L[kind(d || {})], get(d || {}, 'einsatz.zeit') ? `${get(d, 'einsatz.zeit')} Uhr` : ''].filter(Boolean).join(' · ');

  root.WFEB = Object.freeze({
    id: 'fe', name: 'Freiheitsentziehung – Bericht', short: 'FE-Bericht', kurz: 'FE', noNew: true,
    desc: 'Aus der FE-Prüfung: gewählter Weg, Begründung je Voraussetzung, Formvorschriften, Vermerk',
    labels: {
      bericht: 'Vermerk', offen: 'Offene Punkte',
      kurzHint: 'Kurzfassung für den Vorgang.',
      offenHint: 'Angehakte Punkte landen als Todos im Planner. „Angriffspunkt“ heißt: Hier würde eine Verteidigung ansetzen – nachholen oder den Grund dokumentieren.',
      offenEmpty: 'Alle Formvorschriften sind beantwortet und begründet.',
      persHint: 'Gesondert vom Vermerk.'
    },
    steps: STEPS, text, plain, preview, kurzText, fahndung: () => '', offen, personalien, title, subtitle,
    _test: { items, G, tplFor, conds }
  });
})(typeof window !== 'undefined' ? window : globalThis);
