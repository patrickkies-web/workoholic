# Masterplan · Häusliche Gewalt

Aufnahmemodus im Bereich **Schriftliche Arbeiten** von Workoholic. Ziel: am Einsatzort unter Zeitdruck antippen statt tippen, dabei an alle Pflichten erinnert werden – und am Ende steht der **Sachverhalt** für die Anzeige, die **Begründung der Wohnungsverweisung** nach § 34a PolG NRW und eine Liste **„Noch zu erledigen“**. Alles Ende-zu-Ende verschlüsselt, jeder Schritt sofort gesichert.

Stand: November 2026 · Dateien: `js/hg.js` (Fragen + Text), `js/writer.js` (Assistent), `index.html` (Ansicht), `js/app.js` (Tresor-Brücke)

---

## 1 · Fachliche Grundlagen

| Quelle | Was daraus übernommen wurde |
| --- | --- |
| **§ 34a PolG NRW** (Fassung seit 13.12.2025) | Gegenwärtige Gefahr für Leib, Leben oder Freiheit; Wohnung und unmittelbare Umgebung; räumlicher Bereich genau bezeichnen; Dauer 14 Tage, Verlängerung bei Antrag auf zivilgerichtlichen Schutz bis zur Entscheidung, längstens weitere 14 Tage; Mitnahme dringend benötigter Gegenstände; Anschrift oder zustellungsbevollmächtigte Person; Hinweis auf Gewaltschutzgesetz und Beratungsstellen; Kontrolle des Rückkehrverbots. |
| **§ 28 VwVfG NRW**, OVG NRW 5 A 3548/20 | Anhörung zur Wohnungsverweisung ist ein eigener Schritt neben der Beschuldigtenbelehrung: Vorwürfe mitteilen, Gelegenheit zur Äußerung, erst dann anordnen. Der Assistent warnt, solange die Anhörung fehlt. |
| **§ 41, § 42 PolG NRW**, OLG Köln 7 U 147/20 | Betreten der Wohnung gegen den Willen nur mit konkreten Tatsachen für eine gegenwärtige Gefahr; Betreten und Durchsuchen werden getrennt erfasst. |
| **§ 52 Abs. 3, § 163a Abs. 4, § 136 Abs. 1 StPO**, BGH 3 StR 435/12 | Belehrungen mit Uhrzeit; Spontanäußerungen vor der ersten Frage wörtlich und mit Uhrzeit, getrennt von der späteren Vernehmung. |
| **§ 81c Abs. 3 StPO** | Lichtbilder der Verletzungen bei Angehörigen nur nach Belehrung über das Weigerungsrecht und mit Einwilligung. |
| **§§ 43, 44 PolG NRW** | Sicherstellung der Haus- und Wohnungsschlüssel mit Bescheinigung. |
| **§§ 53, 54, 56 PolG NRW** | Androhung des Zwangsgeldes mit bestimmtem Betrag, Hinweis auf Ersatzzwangshaft. |
| **§ 5 Abs. 3 LZG NRW** | Zustellung nachts, sonn- und feiertags nur mit schriftlicher Erlaubnis der Behördenleitung – wird abgefragt, sobald die Uhrzeit der Anordnung in diesen Zeitraum fällt. |
| **§ 27 Abs. 2 PolG NRW** | Mitteilung an das Jugendamt, wenn Kinder im Haushalt leben. |
| **§§ 406i, 406j StPO** | Unterrichtung der geschädigten Person über ihre Rechte. |
| **Warnsignale für Eskalation** (Greuel u. a.) | Trennung, Todesdrohungen, Angriff gegen den Hals, Waffen, Kontrollverhalten, Suiziddrohungen, Zunahme der Übergriffe – als Ankreuzliste in der Gefahrenprognose. |

Die ausführliche Herleitung mit Entscheidungspunkten E1–E12 steht in der Ausarbeitung „Polizeiliches Vorgehen bei häuslicher Gewalt in NRW“ und im Einsatzpfad; das Modul bildet dieselbe Reihenfolge ab.

---

## 2 · Ablauf am Einsatzort

Acht Phasen, vorweg die Weichen-Fragen („Worum geht es?“). Es erscheinen nur Schritte, die zum Fall passen.

| Phase | Schritte | Worum es geht |
| --- | --- | --- |
| **Lage** | Worum geht es? | Beschuldigte Person angetroffen oder nicht, Beziehung, gemeinsame Wohnung, Art der Gewalt, Verletzte, Kinder. Diese Antworten schalten spätere Schritte ein oder aus. |
| **Einsatz** | Einsatzanlass · Eingesetzte Kräfte | Datum, Uhrzeit, Meldeweg, Meldung, Anschrift; Rufname und Besatzung wie in den anderen Modulen. |
| **Vor Ort** | Zutritt · Lage beim Eintreffen · Verletzungen und Versorgung | Wer öffnet, Zutritt freiwillig oder gegen den Willen (mit Tatsachen); Zustand der Beteiligten und der Wohnung; Spontanäußerungen; Verletzungen, Frage nach Rettungswagen mit Antwort (auch Ablehnung und selbstständige ärztliche Versorgung), Lichtbilder zur Anzeige. |
| **Personen** | Geschädigte Person · Beschuldigte Person · Kinder im Haushalt | Personalien; Alkohol, Drogen, Medikamente mit Auffälligkeiten und Atemalkoholtest; je Kind Alter, Anwesenheit, Zustand, Äußerungen; Betreuung und Jugendamt. |
| **Schilderungen** | Angaben der geschädigten Person · Belehrung, Einlassung und Anhörung · Zeugen | Belehrung mit Uhrzeit; Schilderung **jetzt**, **später nachtragen** oder **keine Angaben**; frühere Vorfälle; Wille der geschädigten Person; Anhörung zur Wohnungsverweisung mit Reaktion und Unterkunft. |
| **Prognose** | Gefahrenprognose | Vorerkenntnisse, Muster, Stützen der Aussage, Warnsignale, Ergebnis – jeweils als Ankreuzliste, dazu ein Satz zur Begründung. |
| **Maßnahmen** | Wohnungsverweisung und Rückkehrverbot · Vollzug · Beschuldigte Person nicht angetroffen · Zwang und Gewahrsam · Strafverfahren und Beweise | Bereich als Ankreuzliste plus weitere Örtlichkeiten mit Grund; Dauer mit Fristrechner; milderes Mittel; Gegenstände, Zustellanschrift, Schlüssel, Zwangsgeld, schriftliche Bestätigung (vor Ort ausgehändigt, verweigert, Abholung auf der Wache, Zustellung per Post); bei Abwesenheit Mitteilung an der Wohnungstür und Abholung auf der Wache. |
| **Abschluss** | Opferschutz · Verlassen des Einsatzortes | Hinweise, Beratungsstelle mit Einwilligung, Verbleib, Übergabe, Einsatzende. |

---

## 3 · Bedienkonzept

**Ankreuzen, aber nie abschließend.** Fast alles läuft über Ja/Nein, Auswahl und Mehrfachauswahl. Die Listen sind Schnellwahl, keine abschließende Aufzählung: Unter den Listen zu Zustand, Verhalten, Verletzungen, Tatsachen für den Zutritt, Kindern, Vorerkenntnissen, Stützen, Warnsignalen und Delikten steht ein Feld „Weiteres in eigenen Worten“, das den Satz der Liste fortsetzt – mit festem Satzanfang und einem grauen Beispiel. Wo eine Auswahl „Sonstige“ kennt, fragt ein Feld „Wer genau?“. Für alles Übrige gibt es je Abschnitt ein optionales Feld für einen ganzen Satz (Zutritt, Maßnahmen, Versorgung, Vollzug, Zwang, Beweise, Opferschutz) und am Ende „Bemerkungen“ (Abschnitt 6.3).

**Schilderung statt Chips.** Was geschehen sein soll, steht in der Schilderung in eigenen Worten, nicht in einer Auswahlliste. Nur wenn die Schilderung nachgetragen wird, fragt der Assistent nach dem Kern des Vorwurfs in einem Satz – damit Sachverhalt und Begründung am Einsatztag tragen.

**Schilderungen nachtragen.** Bei der geschädigten Person, der beschuldigten Person und jedem Zeugen lässt sich wählen: jetzt aufnehmen, später nachtragen, keine Angaben. „Später“ setzt im Text einen Platzhalter in eckigen Klammern und einen Eintrag in „Noch zu erledigen“.

**Alkohol und Auffälligkeiten.** Wie die Personenbeschreibung im Modul Verkehrsunfallflucht: Ja/Nein, dann Auffälligkeiten als Tippvorschläge (Alkoholgeruch, verwaschene Aussprache, schwankender Gang, gerötete Augen …), auf Wunsch Atemalkoholwert. Im Text steht das bei den Feststellungen zur Person.

**Vorschau.** Unter jedem Schritt steht „So steht es im Bericht“ mit dem Wortlaut, den die Antworten gerade erzeugen. Geschlecht, Ein- und Mehrzahl und indirekte Rede passen sich an.

**Hinweise statt Sperren.** Fehlt etwas Wesentliches (Anhörung vor der Anordnung, Erlaubnis für die Zustellung zur Nachtzeit), erscheint ein Hinweis im Schritt. Weitergehen ist immer möglich.

**Fristrechner.** Aus dem Tag der Anordnung errechnet der Schritt das Ende des Rückkehrverbots (Ablauf des 14. Tages) und das späteste Ende bei Verlängerung.

---

## 4 · Ausgaben

| Reiter | Inhalt |
| --- | --- |
| **Sachverhalt** | 1 Einsatz · 2 Feststellungen vor Ort · 3 Schilderungen · 4 Bewertung · 5 Maßnahmen · 6 Sonstiges (mit Bemerkungen). Rollen statt Namen („die Geschädigte“, „der Beschuldigte“); Klarnamen nur auf ausdrücklichen Wunsch. |
| **Begründung § 34a** | Erscheint, wenn die Wohnungsverweisung angeordnet wurde: Anordnung mit Bereich und Enddatum · Sachverhalt · Anhörung · Gefahrenprognose · Ermessen und Verhältnismäßigkeit · Zwangsmittel und Hinweise. In der Sprache des Gefahrenabwehrrechts („Betroffener“, „gefährdete Person“). |
| **Kurzfassung** | Wenige Sätze für Übergabe und Lagemeldung. |
| **Noch zu erledigen** | Fehlende Pflichten mit Norm, abhakbar und als Todos in den Planner übernehmbar. |
| **Personalien** | Gesondert, damit der Sachverhalt ohne Klarnamen kopiert werden kann. |

„Kopieren“ kopiert immer den Reiter, der gerade offen ist.

---

## 5 · Grenzen

- **Keine Rechtsberatung, kein Vordruck.** Das Modul ersetzt weder die Vordrucke der Behörde noch die Rechtsbehelfsbelehrung; dafür steht im Text ein Platzhalter.
- **Begründung gegenlesen.** Die Begründung entsteht aus den Antworten. Sie trägt nur, wenn die Antworten den Einzelfall treffen – besonders die Sätze zur Prognose und zum milderen Mittel.
- **Erlasslage.** Der als Verschlusssache eingestufte Runderlass zur häuslichen Gewalt vom 01.03.2024 und örtliche Dienstanweisungen sind nicht eingearbeitet. Wo sie abweichen, gehen sie vor.
- **Mitteilung an der Tür.** Sie wird erfasst, ersetzt aber nicht die Bekanntgabe der Verfügung; „Noch zu erledigen“ weist darauf hin.
- **Schutzanschrift.** Eine neue Anschrift der geschädigten Person wird bewusst nicht abgefragt und erscheint in keinem Text.
- **Daten.** Personenbezogene Daten nur eintragen, soweit das dienstlich zulässig ist. Der Tresor ist verschlüsselt; kopierter oder als Datei gespeicherter Text ist Klartext.

---

## 6 · Ausbaustufen

- Gefährdungsbewertung als eigener Reiter.
- Text für die Mitteilung an das Jugendamt.
- Verstoß gegen das Rückkehrverbot als Folgevorgang (Zwangsgeldfestsetzung, Gewahrsam).
