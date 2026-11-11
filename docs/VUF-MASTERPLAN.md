# Masterplan · Verkehrsunfallflucht ohne Personenschaden

Aufnahmemodus im Bereich **Schriftliche Arbeiten** von Workoholic. Ziel: am Unfallort oder auf der Wache Fragen antippen statt tippen – und am Ende steht ein vollständiger **Verkehrsunfallbefundbericht** in sauberer, zur Eingabe passender Satzführung. Alles Ende-zu-Ende verschlüsselt, jeder Schritt sofort gesichert.

Stand: November 2026 · Dateien: `js/vuf.js` (Fragen + Text), `js/writer.js` (Assistent), `index.html` (Ansicht), `js/app.js` (Tresor-Brücke)

---

## 1 · Fachliche Grundlagen

| Quelle | Was daraus übernommen wurde |
| --- | --- |
| **DA Verkehrsunfallbearbeitung KPB Steinfurt** (Az. 22.61.05, 21.05.2024) | 3.1 VU-Flucht: Einsatzmittel zur Unfallstelle entsenden, auch nach Protokollaufnahme; Sofortmaßnahmen bei Verursacherhinweisen; Online-Anzeige/Verweis auf die Wache ungeeignet. 1.1 Unfallmitteilung vor Ort, sonst nachsenden und vermerken; Telefonnummern nur auf dem Original. 1.2 keine Klarnamen im Befundtext. 1.4/1.5 Lichtbilder und Lichtbildmappe bei VU-Flucht. 1.6 Spurfixfolien nummerieren, Klebestellen beschreiben, fotografieren. 3.6 Manipulationsverdacht → gesonderter Vermerk. |
| **Fragebogen zur Verkehrsunfallflucht** (Anlage 2) | Alle Fragen 1–11 an den Geschädigten und der Block „Fragen zum Unfallflüchtigen“ (Fahrzeug, Kennzeichenfragmente, Insassen, angehalten/ausgestiegen, Anstoßgeräusch, Geschwindigkeit, Wiedererkennen). |
| **Gliederung Unfallbefundbericht** (Anlage 6 des Erlasses, Stand 25.01.23) | Die Berichtsstruktur 1–6 mit allen Unterpunkten, die Formulierungshilfen für Abschnitt 4 („Da die Aussagen … übereinstimmen …“, „… kann der Unfallhergang nicht eindeutig geklärt werden“). |
| **Checkliste Erster Angriff / VUP-Flucht** (PP Münster, KPB Steinfurt) | Kameraüberwachung prüfen, aktive Zeugensuche, Halteranschrift unverzüglich aufsuchen, Nachbarfahrzeuge mit korrespondierenden Schäden, Zeugen nachträglich kontaktieren, Fragenkatalog zur Ermittlung von Unfallflüchtigen (20 Fragen). |
| **Spurenkatalog Spurensicherungsfolie** (PP Dortmund / AK Spurfix) | Spurfix nur zur optischen Vorauswertung; Lackproben für das LKA immer schneiden/ausheben, nicht schaben, nicht auf Folie; Eigenlack gesondert sichern; 2–3 kleine Folien reichen; Hinweise auf Vortäuschung (Spuren an untypischen Stellen, Basalt/Pflaster-Anhaftungen, Stanzformen); Einsendung ans LKA bei hohem Schaden oder unklarer Zuordnung. |
| **§ 142 StGB / Definitionen** (PP Dortmund) | Öffentlicher Verkehrsraum (auch faktisch zugängliche Privatflächen), Varianten Vorstellungs-/Wartepflicht/nachträgliche Feststellung, Zettel am Fahrzeug genügt nicht, bedeutender Schaden ab 1.300 €, geparktes Fahrzeug mit „00“ Benutzern, Verursacher = UB 01. |

---

## 2 · Ablauf am Einsatzort (Kurzfassung für die Praxis)

1. **Einsatz** – Meldeweg, Mitteiler, gemeldeter Sachverhalt; auf der Anfahrt auf flüchtende Fahrzeuge achten.
2. **Geschädigte Person** – zuerst klären, ob sie erreicht wurde (vor Ort, auf der Wache, telefonisch, gar nicht). Dann Personalien, Stellung zum Fahrzeug, Abstell- und Feststellungszeit, wie aufmerksam geworden, Altschäden (Fragebogen Anlage 2). Nicht erreicht → Halterdaten eintragen, Benachrichtigung festhalten.
3. **Unfallort** – Eintreffsituation fotografieren, bevor etwas verändert wird; Örtlichkeit, Verkehrsregelung, Verhältnisse.
4. **Schaden** – Fahrzeug UB 02 bzw. Sache; jedes beschädigte Teil einzeln: Art, Verlauf, Anstoßhöhe **über der Fahrbahn** mit Maßstab, Fremdlack (Farbe!), Fremdmaterial, frisch/alt. Weitere beschädigte Fahrzeuge oder Sachen desselben Verursachers als UB 03 ff.
5. **Spuren sichern** – Spurfix an den markanten Berührungspunkten (nummerieren, beschreiben, fotografieren), Fremdlack **gesondert** durch Schneiden/Ausheben, Eigenlackprobe, Fremdteile; Fahrbahn und Umfeld absuchen.
6. **Zeugen und Umfeld** – Personalien aller Zeugen, Wahrnehmung (gesehen, nur gehört, nachträglich), Standort/Entfernung/Sicht, Fotos/Videos der Zeugen, Erreichbarkeit; Kameras im Umfeld, aktive Zeugensuche, Angaben Dritter.
7. **Verursacher** – aus Zeugen und Spuren ergeben sich die Hinweise: Fahrzeug, Kennzeichen auch als Fragment, Insassen, Verhalten → **sofort** Fahndung, Halterabfrage, Halteranschrift. Ist die Person ermittelt (auch durch Selbstmeldung): Belehrung, Einlassung, Verkehrstüchtigkeit, Führerschein, ggf. Blutprobe und Sicherheitsleistung.
8. **Maßnahmen** – Unfallmitteilung vor Ort (sonst nachsenden + vermerken), Lichtbilder/-mappe, Skizze, Anzeige, Asservate ins AMS, Benachrichtigungen.
9. **Bewertung** – Spurenbild deuten (Höhe, Verlauf → Rangieren/Vorbeifahrt/Tür/Auffahren), Übereinstimmung mit Aussagen, Widersprüche, Manipulationsverdacht.

Der Assistent folgt genau dieser Reihenfolge in neun Phasen: **Einsatz → Geschädigte → Unfallort → Schaden → Spuren → Zeugen → Verursacher → Maßnahmen → Bewertung**. Vorweg stehen die Weichen-Fragen („Worum geht es?“). Die geschädigte Person kommt bewusst früh, weil ihr Geschlecht alle späteren Satzanfänge bestimmt und weil sich aus dem Kontakt ergibt, welche Fragen überhaupt gestellt werden können. Zeugen stehen vor dem Verursacher, weil die Hinweise meist aus ihren Angaben stammen – im Verursacher-Schritt fragt der Assistent deshalb noch einmal nach („Du hast Zeugen erfasst – haben sich daraus Hinweise ergeben?“).

---

## 3 · Bedienkonzept (stressfrei aufnehmen)

**Satzbausteine statt leerer Textfelder.** Jedes Freitextfeld zeigt den festen Satzanfang, so wie er im Bericht steht, hellgrau im Feld. Dahinter steht kursiv in Dunkelgrau ein Beispiel, wie der Satz grammatisch weitergeht. Man schreibt nur die Fortsetzung, der Rest kommt vom Bericht:

| Feld | Satzanfang (fest) | Beispiel (grau) |
| --- | --- | --- |
| Lage der Unfallstelle | Die Unfallstelle befindet sich | in der zweiten Parkreihe von Norden, Stellplatz 14 |
| Zugehörigkeit Parkplatz | Bei der Unfallörtlichkeit handelt es sich um den Parkplatz | des REWE-Marktes |
| Eintreffsituation | Beim Eintreffen um 10:52 Uhr | stand der Pkw unverändert am Abstellort; die Geschädigte wartete vor Ort |
| Aufenthaltsort Geschädigte/r | Zum Unfallzeitpunkt habe sie sich … befunden. | im Supermarkt |
| Fluchtrichtung | Das Fahrzeug entfernte sich | in Richtung Innenstadt |
| Aufforderung zu bleiben | Die Aufforderung erfolgte durch | die Geschädigte |
| Beschädigte Sache | Bei der beschädigten Sache handelt es sich um | einen Gartenzaun aus Holz |
| Angaben (indirekte Rede) | Sie gab sinngemäß Folgendes an: | Sie habe an der roten Ampel gewartet, als … |

- Satzanfang und Beispiele passen sich an: an das **Geschlecht** („Er habe …“ / „Sie habe …“, „seiner/ihrer Wohnung“), die **Rolle** („den Geschädigten“ / „die Geschädigte“) und die **Örtlichkeit** (Parkplatz, Parkhaus, sonstige Fläche). Deshalb wird die geschädigte Person gleich zu Beginn erfasst.
- **Antipp-Vorschläge** unter den Feldern („Keine Feststellungen“, „rechter Fahrbahnrand“, „unsicherer Gang“ + „Alkoholgeruch“ werden mit „und“ verbunden). Endet ein Vorschlag offen („in Richtung “), springt der Cursor direkt dahinter.
- **Grammatik-Hilfe** beim Tippen: Bei Ich-Form („Ich habe …“) erinnert die App an die 3. Person, bei Indikativ („ist“, „hat“, „fuhr“) an die indirekte Rede. Wer den Satzanfang noch einmal tippt, bekommt den Hinweis „Der Satzanfang steht schon da“.
- Der Bericht setzt die Eingabe sauber ein: Er schreibt das erste Wort klein, wenn es kein Substantiv ist („In der …“ → „in der …“), entfernt doppelte Schlusspunkte und schließt eigenständige Sätze mit einem Punkt ab.
- Beim **vermutlichen Hergang** steht der automatisch gebildete Satz als grauer Vorschlag im Feld. Leer lassen übernimmt ihn, „Vorschlag übernehmen und anpassen“ setzt ihn zum Bearbeiten ein.

**Geführter Ablauf.**
- **„Worum geht es?“** als erster Schritt mit vier Antworten (Ort, was beschädigt, Hinweise auf den Verursacher ja/nein, Aufnahme vor Ort oder auf der Wache). Danach kennt der Assistent den Weg, und die Schrittzahl stimmt von Anfang an.
- Jede Frage hat einen Punkt: grau = offen, grün = beantwortet. Nach einer Antwort springt die Ansicht zur nächsten offenen Frage und hebt sie kurz hervor. Sind alle beantwortet, leuchtet „Weiter“ auf.
- **Wiederverwendung:** „↺ Wie zuletzt: POK Müller · PKin Schmidt (Stf 21/03)“ übernimmt Kräfte und Rufname des letzten Vorgangs, „↺ 48565 Steinfurt“ PLZ und Ort. Die Belehrenden werden aus den eingetragenen Kräften angetippt.
- `Enter` springt ins nächste Feld, Tippen auf den Satzbaustein setzt den Cursor ans Ende. Auf dem Handy blendet sich während der Aufnahme das Dock aus, und unten liegen nur noch Zurück und Weiter.
- **Phasenleiste zum Antippen**: Jede Phase oben springt zu ihrem ersten Schritt; die aktuelle Phase bekommt mehr Platz.
- **Listen ohne Umweg**: Bei „Gibt es Zeugen? Ja“ steht die erste Zeugenkarte sofort da – Tippen legt den Eintrag an. Die Karte heißt „Zeugin Z 01 · Roth“ und zeigt nur die Felder, die zur Wahrnehmung passen (bei „nur nachträgliche Feststellung“ entfallen Standort, Entfernung, Sicht und Wiedererkennen).
- **Pflichtangaben** (Straße, Ort, Unfallzeit, Kontakt zur geschädigten Person …) blockieren nie: Bei „Weiter“ erscheint nur kurz „Noch offen: Straße, Ort – im Bericht als [Platzhalter] markiert“.

**Weiterhin:**

- **Ein Thema pro Schritt**, Überschrift als Frage. 31 Schritte in neun Phasen, davon viele bedingt – typisch bleiben 20–27 übrig (ohne Hinweise auf den Verursacher deutlich weniger).
- **Antippen statt Tippen**: Ja/Nein als große Segmente, Auswahl als Chips, Zahlen mit ±-Stepper und Schnellwerten (z. B. 30/50/70/100 km/h, 500/1.000/1.500 €), Datum/Uhrzeit mit „Heute/Gestern/Jetzt“.
- **Bedingte Fragen** erscheinen erst, wenn sie Sinn ergeben (Straße ↔ Parkplatz, geparkt ↔ fahrend, Hinweise ja/nein, Fahrer ermittelt …).
- **Karosserie-Picker**: Front/Seite/Heck als Raster, pro gewähltem Teil ein Detail-Block, „wie vorheriges Teil“ zum Kopieren.
- **Live-Vorschau** „So steht es im Bericht“ unter jedem Schritt – man sieht sofort, was aus den Antworten wird.
- **Überspringen** ist immer erlaubt; fehlende Pflichtangaben erscheinen im Text als `[Platzhalter]` und werden im Ergebnis gezählt und markiert.
- **Übersicht** zeigt alle Schritte nach Phasen gegliedert mit Füllstand zum direkten Springen; „Bearbeiten“ an jedem Berichtsabschnitt springt zum passenden Schritt.
- **Autosave**: jede Antwort wird sofort verschlüsselt gespeichert; nach Auto-Sperre geht es an derselben Stelle weiter.
- **Keine Netzverbindungen**: keine Adress-Vorschläge aus dem Internet, keine Karten, kein Tracking – die Content-Security-Policy der App erlaubt nur `api.github.com` für den eigenen Tresor-Sync.
- Tastatur: `N` neuer Vorgang, `S` Bereich wechseln, `⌘/Strg + ⏎` weiter.

---

## 4 · Fragenkatalog (Schritte und Datenfelder)

| Phase | Schritt | Erfasst (Auszug) |
| --- | --- | --- |
| Einsatz | Worum geht es? | Straße/Parkplatz/Parkhaus/sonstige Fläche, Fahrzeug oder Sache, geparkt/fahrend, Hinweise ja/nein, Aufnahme vor Ort oder auf der Wache |
| | Einsatzübernahme & Erkenntnislage | Datum, Uhrzeit, Meldeweg, Mitteiler, gemeldeter Sachverhalt, Feststellungen auf der Anfahrt, Unfallstelle nachträglich aufgesucht |
| | Eingesetzte Kräfte | Rufname, Dienstgrad + Name (bis 6), Eintreffzeit |
| Geschädigte | Geschädigte Person (UB 02) | **Kontakt** (vor Ort / Wache / telefonisch / nicht erreicht), Personalien bzw. Halterdaten, Stellung zum Fahrzeug oder zur Sache, Halter/Eigentümer, Benachrichtigung bei Nichterreichen |
| | Unfallzeit | Zeitraum mit „Abgestellt am / Schaden bemerkt am“ (geparkt), Zeitpunkt oder unbekannt |
| | Angaben der geschädigten Person | nur wenn erreicht: Belehrung, wie aufmerksam geworden, Aufenthaltsort, Sichtkontakt, Textbaustein oder eigene Schilderung, Zwischenkontrolle, Ergänzung, Schadensschätzung, Altschäden, Fragebogen (ausgefüllt / ausgehändigt / nicht verwendet) |
| Unfallort | Eintreffsituation | Standorte/Personen, Veränderungen, Übersichtsfotos |
| | Unfallörtlichkeit | Adresse, Lage, Straßenart, Zugehörigkeit, öffentlich zugänglich?, genaue Lage, Sicherheit der Ortsangabe |
| | Straße & Verkehrsregelung | Tempo + Grundlage, Fahrstreifen, Trennung, Parkordnung, Verlauf, Höhenprofil, Besonderheiten |
| | Verhältnisse vor Ort | eigener Baustein, feste Auswahl zum Ankreuzen (siehe unten): Licht, Beleuchtung, Straßenzustand, Belag, Fahrbahndecke, Witterung, Sicht, Verkehrslage |
| Schaden | Beschädigtes Fahrzeug / Sache | Art, Marke, Modell, Farbe, Kennzeichen · oder Beschreibung der Sache |
| | Abgestellt / Fahrvorgang | Parkposition, Einparkrichtung, Fahrbahnseite, abgestellt von (auch „unbekannt“), beladen · oder Vorgang, Richtung, Tempo |
| | Schadensbild | Teile-Picker; je Teil: Art (10 Typen + frei), Verlauf, Höhe von–bis, Fremdlack + Farbe, Fremdmaterial, Altschaden, Ergänzung |
| | Schadenshöhe & Verbleib | Schätzung (Hinweis: ab ca. 1.300 € bedeutend), verdeckte Schäden, fahrbereit, Verbleib, Altschäden, **weitere Schäden?** |
| | Weitere Schäden | je Eintrag (UB 03 ff.): Fahrzeug oder Sache, Halter/Eigentümer, Beschädigungen, Schadenshöhe, Benachrichtigung |
| Spuren | Spurensicherung am Fahrzeug | Spurfix (Anzahl, Dokumentation), Lackprobe, Eigenlack, Fremdteile (+ Sicherstellung), Fotos mit Maßstab, Mikroskop |
| | Spuren am Unfallort | Fahrbahnspuren (Arten, Lage, Sicherung), sonstige Gegenstände |
| Zeugen | Zeugen | Gibt es Zeugen?; je Zeuge: Personalien, Mitteiler/in?, Wahrnehmung, Standort, Entfernung, Sicht, Belehrung, Angaben, Wiedererkennen, **Fotos/Videos** (gesichert?), Erreichbarkeit |
| | Umfeld | Kameraüberwachung (Ergebnis, Ansprechpartner), aktive Zeugensuche (Art, Ergebnis), Angaben Dritter |
| Verursacher | Hinweise auf den Verursacher | ja/nein (Nachfrage nach den Zeugen), Quellen inkl. **Selbstmeldung** |
| | Verursacherfahrzeug | Art, Marke, Farbe, Kennzeichen (Fragment, Ausland), Besonderheiten, Fluchtrichtung |
| | Personen & Verhalten | Anzahl, am Steuer, Beschreibung, Wiedererkennen, angehalten, ausgestiegen, Wartezeit, aufgefordert, Zettel, Geräusch, Tempo, Alkohol |
| | Sofortmaßnahmen & Ermittlungen | Fahndung, Halterabfrage, Halteranschrift, **Person ermittelt – wie?** (Halteranschrift, Selbstmeldung mit Zeitpunkt und Ort, Zeuge, Video), Fahrzeug angetroffen, Schadensbild passt |
| | Beschuldigte Person (UB 01) | Personalien, Halter, Dolmetscher, Belehrung, Einlassung |
| | Verkehrstüchtigkeit & Führerschein | Führerschein (vorgelegt / nicht mitgeführt / keine Fahrerlaubnis), Alkohol-/Drogenanzeichen, Atemalkoholtest (Wert in ‰, Uhrzeit, verweigert), Blutprobe (angeordnet durch, Uhrzeit), Weiterfahrt untersagt, Führerschein sichergestellt/beschlagnahmt, Wohnsitz im Ausland → Sicherheitsleistung |
| | Schadensbild UB 01 | Teile-Picker, Spurfix, Lackprobe, Lichtbilder |
| Maßnahmen | Unfallmitteilung & Dokumentation | Unfallmitteilung (bei Nichterreichen nur nachsenden/digital), Lichtbilder + Mappe, Skizze, Anzeige, Aktenzeichen |
| | Asservate & weitere Veranlassungen | Asservate (Vorschlag aus den Spuren), Absicherung, Eigentumssicherung, VK, StA, Straßenbaulastträger, Straßenverkehrsbehörde, Anschlussermittlungen, Sonstiges, Einsatzende |
| Bewertung | Deutung & Hergang | Spurenbild spricht für …, Übereinstimmung, eigener Hergang (Vorschlag als Platzhalter), Widersprüche, Manipulationsverdacht, Klarnamen an/aus |

### Baustein „Verhältnisse vor Ort“

Umstände, die bei **jeder** Unfallaufnahme anzugeben sind – unabhängig davon, wie die Örtlichkeit gestaltet ist (Ampel, Beschilderung, Kreuzung usw. gehören nicht hierher, sondern zu „Straße & Verkehrsregelung“). Die Auswahl ist abschließend und folgt der **Unfallmitteilung NRW, Blatt 2 „Zusätzliche Angaben“** (Formular NRW 3126, Anlage 4 zum RdErl. „Aufgaben der Polizei bei Verkehrsunfällen“ v. 25.08.2008, geändert 2011/2012); die Ziffer des Formulars steht im Chip in Klammern. Lichtverhältnisse und Straßenzustand stimmen mit der bundeseinheitlichen Verkehrsunfallanzeige überein („Inhalte der Verkehrsunfallanzeige“, Stand 1.1.2016; dort höchstens zwei Angaben zum Straßenzustand). Belag, Fahrbahndecke, Sicht und Verkehrslage ergänzen nach der Ausfüllhilfe zu Anlage 6 (2.1.4–2.1.6, Stand 25.01.23). Der Baustein liegt im Kern (`WVUF_CORE.VERH`, `verhBloecke`) und kann von späteren Modulen übernommen werden.

| Feld | Auswahl (Ziffer im Formular) | Textbaustein im Bericht |
| --- | --- | --- |
| Bezug (nur bei bekannter Unfallzeit) | bei der Unfallaufnahme · zur Unfallzeit und bei der Aufnahme | „Zum Zeitpunkt der Unfallaufnahme …“ / „Zur Unfallzeit und bei der Unfallaufnahme …“ – nur im ersten Satz, danach „Es herrschte …“ |
| Lichtverhältnisse | Tageslicht (0) · Dämmerung (1) · Dunkelheit (2) | „… herrschte Tageslicht.“ |
| Beleuchtung (bei Dämmerung/Dunkelheit) | in Betrieb (3) · vorhanden, aus · nicht vorhanden | „…; die Straßenbeleuchtung war in Betrieb.“ / „…; die Parkplatzbeleuchtung war vorhanden, aber nicht in Betrieb.“ / „…; eine Straßenbeleuchtung ist nicht vorhanden.“ |
| Straßenzustand (max. 2) | trocken (0) · nass/feucht (1) · winterglatt (2) · schlüpfrig – Öl, Dung, Laub usw. (3) | „… war die Fahrbahn nass bzw. feucht und durch Laub schlüpfrig.“ |
| winterglatt durch | Schnee · Eis · Glatteis · Reif | „… durch Schnee und Eis winterglatt.“ |
| schlüpfrig durch | Öl · Kraftstoff · Dung · Laub · Schmutz/Lehm | „… durch Öl schlüpfrig.“ |
| Belag | Asphalt · Beton · Pflaster · Kopfsteinpflaster · unbefestigt | „Die Fahrbahn besteht aus Asphalt …“ (Parkplatz: „Die Verkehrsfläche …“) |
| Fahrbahndecke | unbeschädigt · Schlaglöcher · Spurrillen · Risse/Aufbrüche · Flickstellen | „… und ist unbeschädigt.“ / „… und weist Schlaglöcher und Spurrillen auf.“ |
| Witterungsverhältnisse | keine besonderen · Regen (1) · Schnee/-fall (2) · Hagel (3) · Nebel/Dunst (4) · Sichtweite unter 50 m (5) · Sichtweite unter 100 m (6) · Sturm/Böen (7) · Blendende Sonne (8) | „Besondere Witterungseinflüsse lagen nicht vor.“ · „Es regnete und hagelte.“ · „Es herrschte Nebel bzw. Dunst.“ · „Die Sichtweite betrug weniger als 50 m.“ · „Es herrschte Sturm bzw. böiger Wind.“ · „Die Sonne blendete aus westlicher Richtung.“ |
| Sichtverhältnisse | gut · eingeschränkt · schlecht | „Die Sichtverhältnisse waren gut.“ / „Die Sicht war (stark) eingeschränkt durch …“ |
| eingeschränkt durch | geparkte Fahrzeuge · Bewuchs/Hecken · Bebauung · Sonstiges (Satzbaustein) | „… durch geparkte Fahrzeuge und Bewuchs bzw. Hecken.“ |
| Verkehrsaufkommen | gering · mäßig · dicht · zähfließend · Stau | „Es herrschte geringes Verkehrsaufkommen …“ |
| besonderer Anlass | Berufsverkehr · Schülerverkehr · Einkaufsverkehr · Veranstaltung | „… (Schülerverkehr).“ |

Ankreuz-Regeln: „trocken“ und „nass/feucht“ schließen sich aus; beim dritten Straßenzustand weicht die älteste Auswahl; „keine besonderen“ (Witterung) und „unbeschädigt“ (Fahrbahndecke) räumen die übrigen Kreuze ab; „unter 50 m“ und „unter 100 m“ schließen sich aus. Licht, Straßenzustand und Witterung sind Pflichtangaben – fehlen sie, steht im Bericht ein `[Platzhalter]`. Ältere Vorgänge mit den früheren Einzelfeldern („Zustand“, „Witterung“) werden beim Öffnen automatisch übernommen.

Im Bericht ist 2.1 nach der Ausfüllhilfe in Zwischenzeilen gegliedert: **Unfallörtlichkeit** · **Straße und Verkehrsregelung** · **Fahrbahnverhältnisse** · **Witterungs- und Sichtverhältnisse** · **Verkehrslage**.

**Vorbereitet auf Sonderfälle:** geschädigte Person nicht erreicht · nur telefonisch erreicht · Sache statt Fahrzeug (Eigentümer/zuständige Stelle) · Fahrzeug von anderer Person abgestellt · Unfall im fließenden Verkehr · mehrere Geschädigte · Knallzeugen und nachträgliche Feststellungen · Zeugenfotos · Kennzeichenfragment und ausländisches Kennzeichen · Halterabfrage passt nicht zur Beschreibung · Selbstmeldung (tätige Reue nach § 142 Abs. 4 StGB – mit Hinweis, wann sie ausscheidet) · Alkohol/Drogen mit Atemalkoholtest und Blutprobe · keine Fahrerlaubnis (§ 21 StVG) · Führerschein sichergestellt oder beschlagnahmt (DA 2.2) · bedeutender Schaden (§ 69 Abs. 2 Nr. 3 StGB) · Wohnsitz im Ausland (Sicherheitsleistung § 132 StPO, Dolmetscher) · Fläche nicht öffentlich zugänglich · Manipulationsverdacht.

---

## 5 · Textausgabe

**Verkehrsunfallbefundbericht** exakt nach Anlage 6:

| Abschnitt | Inhalt |
| --- | --- |
| 1.1 / 1.2 / 1.3 | Einsatzübernahme (bei eigener Feststellung: „… wurden während des Streifendienstes … aufmerksam“), Erkenntnislage im Telegrammstil mit Mitteiler (auch „Zeugin (Z 01)“), Eintreffsituation |
| 2.1 | Zwischenzeilen Unfallörtlichkeit · Straße und Verkehrsregelung · Fahrbahnverhältnisse · Witterungs- und Sichtverhältnisse · Verkehrslage |
| 2.2 | Spuren auf der Fahrbahn bzw. Verkehrsfläche |
| 2.3 | **Fahrzeug UB 01** (angetroffen mit Schadensbild oder „entfernte sich … nicht in Augenschein genommen“), **Fahrzeug UB 02**, **Fahrzeug UB 03** ff. |
| 2.4 | Spuren an Personen: niemand verletzt; bei ermittelter Person Verkehrstüchtigkeit (Anzeichen, Atemalkoholtest), Führerschein |
| 2.5 | Beschädigte Sache, weitere beschädigte Sachen, Spuren an sonstigen Gegenständen |
| 3.1 | **UB 01** (Selbstmeldung oder Ermittlung, Belehrung, Einlassung bzw. „unbekannt“), dann **UB 02** (Kontakt, Stellung, Belehrung, Schilderung) |
| 3.2 / 3.3 | Zeugen einzeln mit Z-Nummer (Knallzeuge/-zeugin kenntlich), Angaben Dritter |
| 4.1 | Hinweise auf den Verursacher (Quellen, Fahrzeug, Insassen, Verhalten), Deutung des Spurenbilds, Korrespondenz mit UB 01, Manipulation |
| 4.2 / 4.3 | Vermutlicher Hergang mit Formulierungshilfe des Erlasses, Widersprüche |
| 5.1 / 5.2 / 5.3 | Gefahrenabwehrende/strafprozessuale Maßnahmen (Absicherung, Fahndung, Halteranschrift, Kamera, Zeugensuche, Asservate, Blutprobe, Führerschein, Weiterfahrt, Sicherheitsleistung, Anzeige) · Benachrichtigungen (Geschädigte, UB 03 ff., VK, StA) · weitere Veranlassungen (Straßenbaulastträger, Straßenverkehrsbehörde, Anschlussermittlungen) |
| 6.1 / 6.2 / 6.3 | Verweise (Unfallmitteilung, Lichtbilder/-mappe, Skizze, Fragebogen, Videos, Zeugenaufnahmen, Ermittlungsbericht, Vermerk) · eingesetzte Kräfte mit Rufname · Ende der Maßnahmen am Unfallort |

Zusätzlich: **Kurzsachverhalt** (Kurzbeschreibung/Unfallmitteilung), **Fahndungstext** (nur bei Hinweisen, mit unbestimmtem Artikel: „Gesucht wird ein Pkw …“), **Offene Punkte** (Checkliste aus Erlass/DA, direkt als Todos in den Planner übernehmbar), **Personalien** gesondert (Telefon nur auf dem Original). In der Ansicht sind die Zwischenzeilen (Fahrzeug UB 01, UB 02, Z 01) fett, fehlende Angaben gelb markiert.

### Regeln der Satzführung

- **Rolle + Geschlecht** steuern alle Formen: „der Geschädigte / dem Geschädigten / er / sein“, „die Zeugin / der Zeugin / sie / ihr“, divers über „die geschädigte Person“. Täterverhalten passt sich an („Die Fahrzeugführerin hielt … an und entfernte sich dann“); ist das Geschlecht unklar, heißt es „die fahrzeugführende Person“.
- **Klarnamen aus** (Standard, DA 1.2): Rollen mit Ordnungsnummer („Der Geschädigte (UB 02)“, „Die Zeugin (Z 01)“). **Klarnamen an**: „Die Geschädigte (Frau Anna Beispiel, UB 02)“ bei der ersten Nennung.
- **Zeit**: Zeitpunkt „am 07.11.2026 gegen 13:30 Uhr“; Zeitraum gleicher Tag „am … in der Zeit zwischen … und …“, über Nacht „im Zeitraum vom …, … Uhr, bis zum …, … Uhr“; unbekannt „zu einem nicht näher bekannten Zeitpunkt“. Bei der Rückkehr am selben Tag steht nur die Uhrzeit („Bei ihrer Rückkehr gegen 10:20 Uhr …“).
- **Ort**: „am rechten Fahrbahnrand der Bahnhofstraße in Höhe der Hausnummer 12 in Steinfurt“; Parkplätze als Apposition mit schließendem Komma („auf dem Parkplatz des REWE-Marktes, Bahnhofstraße 12 in Steinfurt, abgestellten Pkw“).
- **Fahrzeuge** mit Genus, Kasus und Artikel: „der Pkw / das Kraftrad“, „den … abgestellten Pkw“ / „das … abgestellte Kraftrad“; bekannte Fahrzeuge bestimmt, gesuchte unbestimmt („um einen Pkw Skoda …“); Kennzeichenfragment als „…, unvollständig“.
- **Fahrzeugteile** mit richtigem Artikel und eigenem Satzteil für den Verlauf: „An der Vordertür links befanden sich Kratzspuren mit Lackabrieb in einer Höhe von 45 bis 60 cm über der Fahrbahnoberfläche; die Spuren verliefen horizontal.“
- **Indirekte Rede** in allen Schilderungen; wer abgestellt hat, bestimmt den Satz („Sein Kraftrad sei von einer anderen Person … abgestellt worden“).
- **Zählwörter**: „eine Spurensicherungsfolie … liegt“ / „zwei Spurensicherungsfolien … liegen“, „wurde eine Funkfahndung“ / „wurden eine Nahbereichsfahndung und eine Funkfahndung … eingeleitet“.
- **Nur was beantwortet ist, wird geschrieben**; Verneinungen werden ausformuliert („Fremdteile wurden nicht aufgefunden“), Nicht-Beantwortetes entfällt oder wird als `[Platzhalter]` markiert.
- **Bewertung** leitet sich aus dem Spurenbild ab („Die Anstoßhöhe der Beschädigung (Heckklappe) von 70 bis 85 cm und ihr diagonaler Verlauf sprechen für …“) und nutzt die Formulierungshilfen des Erlasses.
- **Verhältnisse** werden immer „zum Zeitpunkt der Unfallaufnahme“ beschrieben – bei Zeiträumen ist die Lage zur Unfallzeit nicht bekannt.

---

## 6 · Sicherheit

- Alle Vorgänge liegen im selben Tresor wie Planner und Dienste: **AES-256-GCM**, Schlüssel per **Argon2id** (64 MiB) aus dem Master-Passwort, Padding auf 4-KB-Blöcke, Sync nur als Chiffretext ins private GitHub-Repo. Nichts davon verlässt das Gerät im Klartext.
- Das Modul speichert **nichts** in localStorage/sessionStorage außer der Kennung des zuletzt offenen Vorgangs (zufällige ID, kein Inhalt), damit nach einer Auto-Sperre dieselbe Stelle wieder aufgeht.
- **Keine externen Dienste**: keine Geokodierung, keine Straßensuche, keine Schriften von Dritten. CSP: `connect-src https://api.github.com`.
- **Klartext nur auf Wunsch**: „Kopieren“ legt den Text in die Zwischenablage, „Als Datei“ warnt vorher ausdrücklich – beides bewusst ausgelöst.
- **Auto-Sperre** (5–60 Min) lädt die Seite neu und entfernt Klartext und Schlüssel aus dem Speicher; der Vorgang bleibt gesichert.
- Telefonnummern erscheinen nur im gesonderten Personalienblock, nicht im Berichtstext (DA 1.1). Klarnamen im Text sind standardmäßig aus (DA 1.2).
- Löschen wirkt auf allen synchronisierten Geräten, mit sofortigem Rückgängig.

---

## 7 · Ausbaustufen

1. **Weitere Module** auf derselben Engine: VU-Flucht mit Personenschaden (Prozessmodell Anlage V, Blutprobe, Sicherstellung Mobiltelefon), Anzeigenaufnahme auf der Wache, Alleinunfall/Wildunfall, Sachbeschädigung.
2. **Dienststellen-Profil**: Standard-Kräfte, Rufname, PLZ/Ort als Vorbelegung (verschlüsselt in den Einstellungen).
3. **Skizze**: einfache Lageskizze als SVG im Vorgang (ohne Kartendienste).
4. **Fahndungs-Kurzform** für Funk mit fester Reihenfolge (Fahrzeug, Kennzeichen, Richtung, Schäden).
5. **Export als .docx** über eine lokale Vorlage, wenn der Vorgang zur Übergabe ins Vorgangssystem gedruckt werden muss.
6. **Zeitleiste** je Vorgang (Meldung → Eintreffen → Maßnahmen → Einsatzende) aus den erfassten Uhrzeiten.
