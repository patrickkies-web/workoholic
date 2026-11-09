# Masterplan · Häusliche Gewalt (Version 2)

Aufnahmemodus im Bereich **Schriftliche Arbeiten** von Workoholic. Ziel: am Einsatzort unter Zeitdruck antippen statt tippen, dabei an alle Pflichten erinnert werden – und am Ende steht der **Sachverhalt** für die Anzeige, die **Begründung der Wohnungsverweisung** nach § 34a PolG NRW, eine **Kurzfassung** und die Liste **„Noch zu erledigen“**. Alles Ende-zu-Ende verschlüsselt, jeder Schritt sofort gesichert.

Stand: November 2026 · Dateien: `js/hg.js` (Fragen + Text), `js/writer.js` (Assistent), `index.html` (Ansicht), `js/app.js` (Tresor-Brücke)

---

## 0 · Grundsatz

**Im Text steht nur, was angetippt oder eingetragen wurde.** Fehlt etwas, steht dort ein `[Platzhalter]` und ein Eintrag in „Noch zu erledigen“. Kein Satz unterstellt einen Ablauf, der nicht bestätigt ist („wird in einer gesonderten Vernehmung nachgeholt“, „nicht in Gegenwart …“, „auf Befragen keine Einwände“). „Text folgt“ bei einer Schilderung heißt nur: Hier fehlt noch Text.

---

## 1 · Fachliche Grundlagen

| Quelle | Was daraus übernommen wurde |
| --- | --- |
| **§ 34a PolG NRW** (Fassung seit 13.12.2025) | Gegenwärtige Gefahr für Leib, Leben oder Freiheit; Wohnung und unmittelbare Umgebung; Bereich genau bezeichnen (Abs. 1 Satz 2); Mitnahme dringend benötigter Gegenstände (Abs. 2); Anschrift oder Zustellungsbevollmächtigte (Abs. 3); Hinweise und Datenweitergabe an Beratungsstellen (Abs. 4); 14 Tage, Verlängerung bei Gerichtsantrag längstens um weitere 14 Tage (Abs. 5); Unterrichtung über die Dauer (Abs. 6 Satz 2); Kontrolle (Abs. 7). |
| **§ 28 VwVfG NRW**, OVG NRW 5 A 3548/20 | Anhörung zur Wohnungsverweisung als eigener Schritt neben der Beschuldigtenbelehrung, mit Inhalten (Vorwürfe, frühere Vorfälle, beabsichtigte Maßnahme, Hinweise, Fragen nach Unterkunft, Bindung, Einwänden). |
| **§ 163a Abs. 4, 5, § 136 Abs. 1 Satz 2–6, § 168b Abs. 3 StPO** | Beschuldigtenbelehrung mit belehrender Person, Uhrzeit und den genannten Inhalten (Tatvorwurf, Aussagefreiheit, Verteidiger, Kontaktdaten und Notdienst, Beweisanträge, Pflichtverteidiger mit Kostenfolge, ggf. schriftliche Äußerung, Täter-Opfer-Ausgleich, Dolmetscher); Entscheidung über die Verteidigerkonsultation. |
| **§§ 52, 55, 57, 68 Abs. 2, 68b, 163 Abs. 3 StPO; §§ 145d, 164, 258 StGB** | Zeugenbelehrung je Person: Zeugnisverweigerungsrecht mit Nummer nach der angegebenen Beziehung, Widerruf des Verzichts, Auskunftsverweigerungsrecht, Wahrheitspflicht (Strafvereitelung nur bei Nicht-Angehörigen), Zeugenbeistand, andere ladungsfähige Anschrift; Erklärung nach der Belehrung; Hinweis bei Minderjährigen (§ 52 Abs. 2). |
| **§ 81b, § 81c Abs. 3, § 52 Abs. 2 Satz 2 StPO** | Lichtbilder der Verletzungen; bei Angehörigen nach Belehrung über das Weigerungsrecht; bei Kindern Grundlage wählbar (Kind verstandesreif, allein sorgeberechtigte Person, richterliche Anordnung, noch zu klären). |
| **§ 224 Abs. 1 Nr. 5, § 230 Abs. 1, § 241 Abs. 2 StGB** | Hinweis bei Angriffen gegen den Hals, Beschwerden nach dem Würgen, Empfehlung ärztlicher Untersuchung; besonderes öffentliches Interesse ohne Strafantrag; Wortlaut der Drohung. |
| **§ 41, § 42 PolG NRW**, OLG Köln 7 U 147/20 | Betreten gegen den Willen nur mit Tatsachen für eine gegenwärtige Gefahr; Durchsuchung getrennt erfasst. |
| **§§ 43, 44 Abs. 2 PolG NRW** | Sicherstellung der Schlüssel, Bescheinigung. |
| **§§ 51, 53, 54 Abs. 1, 56 PolG NRW** | Zwangsgeld in bestimmter Höhe für jeden Fall der Zuwiderhandlung; Hinweis auf Ersatzzwangshaft (sonst später nicht anordenbar); Androhung ist zuzustellen. |
| **§ 35 Abs. 1 Nr. 4 PolG NRW** | Hinweis auf Gewahrsam zur Durchsetzung. |
| **§§ 3, 5 LZG NRW i. V. m. §§ 178–181 ZPO** | Aushändigung gegen Empfangsbekenntnis, Annahmeverweigerung; Ersatzzustellung nur vorsorglich (gefährdete Person scheidet als Ersatzempfängerin aus, § 178 Abs. 2 entsprechend): Briefkasten, sonst Niederlegung bei der Behörde mit Sitz am Zustellort bzw. Ort des Amtsgerichts oder bei der Geschäftsstelle des Amtsgerichts, Mitteilung auf dem Vordruck in den Briefkasten oder – nur wenn das nicht geht – an die Tür, Datum auf dem Umschlag, Gründe in der Akte, drei Monate Abholfrist; Erlaubnis des Behördenleiters zur Nachtzeit und an Sonn- und Feiertagen. |
| **Gefahrenprognose** | Kriterien der IM-Broschüre (2007), Warnsignale der LKA-NRW-Studie (Greuel u. a. 2010: Trennung, Todesdrohung, Würgen, Waffen, Kontrolle/Stalking, Suiziddrohung, Zunahme, Angst der Frau), ergänzt um gängige Items standardisierter Instrumente (Schwangerschaft, Kind aus anderer Beziehung, Hilferuf verhindert, Einschätzung der gefährdeten Person). Bedeutungssätze nennen die Quelle; wird ein passender Textbaustein gewählt, entfällt der doppelte Bedeutungssatz. |

---

## 2 · Ablauf am Einsatzort

| Phase | Schritte | Worum es geht |
| --- | --- | --- |
| **Einsatz** | Einsatzanlass · Eingesetzte Kräfte | Datum, Uhrzeit, Meldeweg, Meldung, Anschrift; Rufname und Besatzung wie in den anderen Modulen (auch aus der laufenden Schicht). |
| **Personen** | Beteiligte Personen | Jede Person einmal: Rolle (geschädigt, beschuldigt, Kind, Zeugin/Zeuge), Geschlecht, Beziehung zur beschuldigten Person (Tippvorschläge, freie Eingabe), Alter, vor Ort, verletzt. Daraus: Hinweis auf das Zeugnisverweigerungsrecht, welche Karten später erscheinen. |
| **Eintreffen** | Eintreffen und Zutritt · Angetroffene Personen · Verletzungen und Versorgung | Was zu hören war, wer öffnete, Zutritt mit Tatsachen; je anwesender Person: wo angetroffen, Zustand, Besonderheiten, Alkohol/Drogen (wie Verkehrsunfallflucht), ungefragte Äußerung; je verletzter Person: Verletzungen, Frage nach Rettungswagen mit Antwort, Befund der RTW-Besatzung, Krankenhaus, Lichtbilder, Attest. |
| **Umstände** | Örtlichkeit und Beziehung · Kinder im Haushalt | Gebäude, Lage, Spuren mit Ort; Wohnverhältnisse, Trennung, Beziehung; je Kind: wo, Zustand, mitbekommen, Äußerung; Befragung. |
| **Schilderungen** | Geschädigte und Zeugen · Beschuldigte Person | Je Person: Belehrungsart, belehrt durch, Uhrzeit, Inhalte (Schnellwahl „Vollständig nach Vordruck“), Erklärung, Schilderung jetzt / Text folgt / keine Angaben, Vorgeschichte und Haltung. Beschuldigte Person: Belehrung, Verteidigerentscheidung, Einlassung; danach Anhörung mit Inhalten. |
| **Prognose** | Gefahrenprognose | Datenabgleich, Einordnung, Stützen, Würdigung; 35 Umstände in sechs Gruppen, je **festgestellt / geschildert / angenommen**; aus früheren Antworten übernommene Umstände sind vormarkiert; Textbausteine für besondere Lagen; Ergebnis mit Begründungsvorschlägen aus den markierten Umständen. |
| **Maßnahmen** | Wohnungsverweisung · Eröffnung und Vollzug · Bekanntgabe und Zustellung · Zwang und Gewahrsam · Strafverfahren | Anordnung mit Bereich, weiteren Örtlichkeiten, Dauer, Fristrechner, milderem Mittel; Eröffnung als Checkliste (Schnellwahl „Vollständig nach Vordruck“) mit Zwangsgeld, Schlüsseln, schriftlicher Bestätigung, Reaktion, Verlassen; bei Abwesenheit Erreichbarkeit, Anhörung (Uhrzeit wird mit der Anordnung abgeglichen), Bekanntgabe mit Checkliste (Bereich, Ende, Verlängerung, Zwangsgeld, Anschrift, Gegenstände), Zwangsgeld mit Hinweis auf Ersatzzwangshaft, Zustellung (persönlich, Briefkasten, Niederlegung mit Mitteilung, nur Hinweis, Post) mit Förmlichkeiten. |
| **Abschluss** | Opferschutz und Kinder · Personalien und Abschluss | Hinweise (Schnellwahl), Beratungsstelle, Einwilligung, Verbleib, Kinderbetreuung, Jugendamt; Personalien je Person, Erledigtes, Einsatzende, Bemerkungen, Klarnamen. |

---

## 3 · Bedienkonzept

- **Personen zuerst.** Eine Liste am Anfang; alle späteren Schritte zeigen nur die passenden Karten (z. B. Verletzungen nur für verletzte Personen). Mehrere Verletzte und mehrere Geschädigte sind möglich („die Geschädigte zu 1“, „der Geschädigte zu 2“).
- **Ankreuzen, nie abschließend.** Auswahllisten sind Schnellwahl; darunter steht immer ein Freifeld, das den Satz fortsetzt, oder ein Feld für einen ganzen Satz.
- **Schnellwahl.** Belehrung, Anhörung, Eröffnung und Opferschutz lassen sich mit einem Tipp „vollständig nach Vordruck“ setzen und dann einzeln abwählen.
- **Markieren statt Ankreuzen** in der Gefahrenprognose: Antippen wechselt festgestellt → geschildert → angenommen → aus. Vormarkierungen aus früheren Antworten sind gestrichelt.
- **Vorschau** unter jedem Schritt, Satzführung nach Geschlecht, Rolle, Ein- und Mehrzahl, indirekter Rede.
- **Hinweise statt Sperren** (fehlende Anhörung, Zeugnisverweigerungsrecht, Minderjährige, Nachtzustellung, Ersatzzustellung, Wochenende als Fristende).
- **Nur Bestätigtes im Text.** Was nicht angetippt oder eingetragen ist, erscheint als Platzhalter in eckigen Klammern oder als Punkt unter „Noch zu erledigen“ – nie als angenommene Tatsache.

---

## 4 · Ausgaben

| Reiter | Inhalt |
| --- | --- |
| **Sachverhalt** | 1 Einsatzanlass · 2 Eintreffsituation (Eintreffen und Zutritt, angetroffene Personen, Verletzungen und Versorgung) · 3 Tatörtlichkeit und Umstände vor Ort (Örtlichkeit und Spuren, Beziehung, Kinder) · 4 Schilderungen (je Person, Anhörung) · 5 Gefahrenprognose · 6 Maßnahmen (Wohnungsverweisung bzw. Rückkehrverbot, Zwang, Strafverfolgung, Opferschutz) · 7 Abschluss. Leere Abschnitte entfallen, die Nummern rücken nach. |
| **Begründung § 34a** | Anordnung · Sachverhalt (ohne Belehrungsabsätze) · Anhörung · Gefahrenprognose · Ermessen und Verhältnismäßigkeit · Zwangsmittel und Hinweise. Sprache der Gefahrenabwehr („gefährdete Person“, „Betroffener“). |
| **Kurzfassung** | Nur bestätigte Angaben. |
| **Noch zu erledigen** | Fehlende Pflichten mit Norm, je Person; als Todos übernehmbar. |
| **Personalien** | Gesondert vom Sachverhalt. |

Ältere Vorgänge (Version 1) werden beim Öffnen automatisch in das neue Format überführt; Belehrungsinhalte, die früher nicht erfasst wurden, erscheinen als Platzhalter.

---

## 5 · Grenzen

- **Keine Rechtsberatung, kein Vordruck.** Rechtsbehelfsbelehrung und Vordrucke der Behörde gehen vor; im Text steht ein Platzhalter.
- **Gegenlesen.** Begründung und Prognose tragen nur, wenn die Antworten den Einzelfall treffen. Die Textbausteine sind Vorschläge.
- **Ersatzzustellung** in der Wohnung, aus der die Person verwiesen ist, ist gerichtlich nicht geklärt; der Assistent behandelt sie als vorsorglich und empfiehlt die persönliche Aushändigung beim Antreffen. Ob eine Wache außerhalb des Behördensitzes als Ort der Niederlegung genügt, ist nicht gesichert.
- **Feiertage** erkennt der Assistent nicht; er erkennt Nachtzeit und Sonntage.
- **Erlasslage.** Der als Verschlusssache eingestufte Runderlass vom 01.03.2024 und örtliche Dienstanweisungen sind nicht eingearbeitet.
- **Eine beschuldigte Person je Vorgang.** Wechselseitige Vorwürfe lassen sich abbilden (geschädigte Person zusätzlich als Beschuldigte belehrt); eine zweite Verfügung gegen eine weitere Person ist als eigener Vorgang anzulegen.
- **Schutzanschrift** wird nicht abgefragt und erscheint in keinem Text.
- **Daten** nur, soweit dienstlich zulässig; kopierter Text ist Klartext.

---

## 6 · Ausbaustufen

- Gefährdungsbewertung als eigener Reiter.
- Text für die Mitteilung an das Jugendamt.
- Verstoß gegen das Rückkehrverbot als Folgevorgang (Zwangsgeldfestsetzung, Gewahrsam).
