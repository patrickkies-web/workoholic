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

1. **Anfahrt** – auf flüchtende Fahrzeuge achten; Eintreffsituation fotografieren, bevor etwas verändert wird.
2. **Geschädigten sprechen** – Zeitraum, Abstellort, wer abgestellt hat, beladen/besetzt, wie aufmerksam geworden, Altschäden? (Fragebogen Anlage 2; Zettel suchen).
3. **Fahrzeug UB 02** – jedes beschädigte Teil einzeln: Art, Verlauf, Anstoßhöhe **über der Fahrbahn** mit Maßstab, Fremdlack (Farbe!), Fremdmaterial, frisch/alt.
4. **Spuren sichern** – Spurfix an den markanten Berührungspunkten (nummerieren, beschreiben, fotografieren), Fremdlack **gesondert** durch Schneiden/Ausheben, Eigenlackprobe, Fremdteile einsammeln.
5. **Unfallort** – Fahrbahn/Umfeld absuchen (Splitter, Teile, Rangierspuren), sonstige Gegenstände (Poller, Zaun) prüfen, Kameras im Umfeld, Nachbarfahrzeuge mit passenden Schäden.
6. **Hinweise auf den Verursacher** – Fahrzeug, Kennzeichen auch als Fragment, Insassen, Verhalten (angehalten? ausgestiegen? aufgefordert? Zettel?), Fluchtrichtung → **sofort** Fahndung, Halterabfrage, Halteranschrift.
7. **Zeugen** – Personalien aller Zeugen, Standort/Entfernung/Sicht, Knallzeugen kennzeichnen, Belehrung dokumentieren, Erreichbarkeit.
8. **Maßnahmen** – Unfallmitteilung vor Ort (sonst nachsenden + vermerken), Lichtbilder/-mappe, Skizze, Asservate ins AMS, Anschlussermittlungen vermerken.
9. **Bewertung** – Spurenbild deuten (Höhe, Verlauf → Rangieren/Vorbeifahrt/Tür/Auffahren), Übereinstimmung mit Aussagen, Widersprüche, Manipulationsverdacht.

Der Assistent folgt genau dieser Reihenfolge in acht Phasen: **Einsatz → Unfallort → Geschädigtes Fahrzeug → Spuren → Verursacher → Personen → Maßnahmen → Bewertung**.

---

## 3 · Bedienkonzept (stressfrei aufnehmen)

- **Ein Thema pro Schritt**, Überschrift als Frage. 29 Schritte, davon viele bedingt – typisch bleiben 20–24 übrig (ohne Hinweise auf den Verursacher weniger).
- **Antippen statt Tippen**: Ja/Nein als große Segmente, Auswahl als Chips, Zahlen mit ±-Stepper und Schnellwerten (z. B. 30/50/70/100 km/h, 500/1.000/1.500 €), Datum/Uhrzeit mit „Heute/Gestern/Jetzt“.
- **Bedingte Fragen** erscheinen erst, wenn sie Sinn ergeben (Straße ↔ Parkplatz, geparkt ↔ fahrend, Hinweise ja/nein, Fahrer ermittelt …).
- **Karosserie-Picker**: Front/Seite/Heck als Raster, pro gewähltem Teil ein Detail-Block, „wie vorheriges Teil“ zum Kopieren.
- **Live-Vorschau** „So steht es im Bericht“ unter jedem Schritt – man sieht sofort, was aus den Antworten wird.
- **Überspringen** ist immer erlaubt; fehlende Pflichtangaben erscheinen im Text als `[Platzhalter]` und werden im Ergebnis gezählt und markiert.
- **Übersicht** zeigt alle Schritte mit Füllstand zum direkten Springen; „Bearbeiten“ an jedem Berichtsabschnitt springt zum passenden Schritt.
- **Autosave**: jede Antwort wird sofort verschlüsselt gespeichert; nach Auto-Sperre geht es an derselben Stelle weiter.
- **Keine Netzverbindungen**: keine Adress-Vorschläge aus dem Internet, keine Karten, kein Tracking – die Content-Security-Policy der App erlaubt nur `api.github.com` für den eigenen Tresor-Sync.
- Tastatur: `N` neuer Vorgang, `S` Bereich wechseln, `⌘/Strg + ⏎` weiter.

---

## 4 · Fragenkatalog (Schritte und Datenfelder)

| Phase | Schritt | Erfasst (Auszug) |
| --- | --- | --- |
| Einsatz | Einsatzübernahme | Datum, Uhrzeit, Meldeweg (Leitstelle/Telefon/Wache/Streife/Online), Mitteiler, Aufnahmeort, Unfallstelle nachträglich aufgesucht |
| | Eingesetzte Kräfte | Rufname, Dienstgrad + Name (bis 6), Eintreffzeit |
| | Erkenntnislage | Gemeldeter Sachverhalt, Feststellungen auf der Anfahrt |
| Unfallort | Unfallzeit | Zeitpunkt / Zeitraum (von–bis) / unbekannt |
| | Unfallörtlichkeit | Art (Straße, Parkplatz, Parkhaus, sonstige), Adresse, Lage, Straßenart, Zugehörigkeit, öffentlich zugänglich?, genaue Lage, Sicherheit der Ortsangabe |
| | Straße & Verkehrsregelung | Tempo + Grundlage, Fahrstreifen, Trennung, Parkordnung, Verlauf, Höhenprofil, Besonderheiten, Verkehrsaufkommen |
| | Fahrbahn, Licht & Wetter | Belag, Zustand, Licht, Beleuchtung, Witterung, Sicht, Sichtbehinderung |
| | Eintreffsituation | Standorte/Personen, Veränderungen, Übersichtsfotos |
| Geschädigtes Fahrzeug | Was wurde beschädigt? | Fahrzeug (Art, Marke, Modell, Farbe, Kennzeichen) oder Sache; geparkt/fahrend |
| | Abgestellt / Fahrvorgang | Einparkrichtung, Parkposition, Fahrbahnseite, abgestellt von, beladen · oder Vorgang, Richtung, Tempo |
| | Schadensbild | Teile-Picker; je Teil: Art (10 Typen + frei), Verlauf, Höhe von–bis, Fremdlack + Farbe, Fremdmaterial, Altschaden, Ergänzung |
| | Schadenshöhe & Verbleib | Schätzung, verdeckte Schäden, fahrbereit, Verbleib, Altschäden |
| Spuren | Spurensicherung am Fahrzeug | Spurfix (Anzahl, Dokumentation), Lackprobe (Schneiden/Abnehmen), Eigenlack, Fremdteile (+ Sicherstellung), Fotos mit Maßstab, Mikroskop |
| | Spuren am Unfallort | Fahrbahnspuren (Arten, Lage, Sicherung), sonstige Gegenstände |
| Verursacher | Hinweise | ja/nein, Quellen |
| | Verursacherfahrzeug | Art, Marke, Farbe, Kennzeichen (Fragment, Ausland), Besonderheiten, Fluchtrichtung |
| | Personen & Verhalten | Anzahl, Fahrer/in, Beschreibung, Wiedererkennen, angehalten, ausgestiegen, Wartezeit, aufgefordert, Zettel, Geräusch, Tempo, Alkohol |
| | Sofortmaßnahmen | Fahndung (Art), Halterabfrage (Ergebnis), Halteranschrift, Fahrzeug angetroffen, Schadensbild korrespondiert, Fahrer ermittelt |
| | Beschuldigte Person | Personalien, Halter, Fahrerlaubnis, Belehrung, Einlassung |
| | Schadensbild UB 01 | Teile-Picker, Spurfix, Lackprobe, Lichtbilder |
| Personen | Geschädigte Person | Personalien, Stellung zum Fahrzeug, Firma/Halter, anwesend |
| | Angaben | Belehrung, wie aufmerksam geworden, Standort, Sichtkontakt, Vorlage (abgestellt / beobachtet / frei), Zwischenzeit, Schadenssumme, Altschäden, Fragebogen |
| | Zeugen | je Zeuge: Personalien, Wahrnehmung (Sicht/Knall/nachträglich), Standort, Entfernung, Sicht, Belehrung, Angaben, Wiedererkennen, Erreichbarkeit |
| | Dritte | Angaben Dritter |
| Maßnahmen | Dokumente & Dokumentation | Unfallmitteilung (vor Ort/nachgesandt/digital/keine), Lichtbilder + Mappe, Skizze, Anzeige, Aktenzeichen |
| | Ermittlungsansätze | Kamera (Ergebnis), Zeugensuche (Art, Ergebnis), Asservate, weitere Maßnahmen, Sonstiges, Einsatzende |
| Bewertung | Deutung & Hergang | Spurenbild spricht für …, Übereinstimmung, eigener Hergang, Widersprüche, Manipulationsverdacht, Klarnamen an/aus |

---

## 5 · Textausgabe

**Verkehrsunfallbefundbericht** nach Anlage 6:
1 Allgemeines (1.1 Einsatzübernahme · 1.2 Erkenntnislage · 1.3 Eintreffsituation) · 2 Objektiver Befund (2.1 Unfallort · 2.2 Spuren Fahrbahn/sonstige Gegenstände · 2.3 Fahrzeug UB 02 · 2.4 Fahrzeug UB 01, falls angetroffen · 2.5 Hinweise auf den Verursacher) · 3 Subjektiver Befund (3.1 Beteiligte · 3.2 Zeugen · 3.3 Dritte) · 4 Zusammenfassung und eigene Schlussfolgerungen · 5 Maßnahmen (5.1 · 5.2) · 6 Sonstiges.

Zusätzlich: **Kurzsachverhalt** (Kurzbeschreibung/Unfallmitteilung), **Fahndungstext** (nur bei Hinweisen), **Offene Punkte** (Checkliste aus Erlass/DA, direkt als Todos in den Planner übernehmbar), **Personalien** gesondert (Telefon nur auf dem Original).

### Regeln der Satzführung

- **Rolle + Geschlecht** steuern alle Formen: „der Geschädigte / dem Geschädigten / er / sein“, „die Zeugin / der Zeugin / sie / ihr“, divers über „die geschädigte Person“. Täterverhalten passt sich an („Die Fahrerin hielt … bevor sie …“).
- **Klarnamen aus** (Standard, DA 1.2): Rollen mit Ordnungsnummer („Der Geschädigte (UB 02)“, „Die Zeugin (Z 01)“). **Klarnamen an**: „Die Geschädigte (Frau Anna Beispiel, UB 02)“ bei der ersten Nennung.
- **Zeit**: Zeitpunkt „am 07.11.2026 gegen 13:30 Uhr“; Zeitraum gleicher Tag „am … in der Zeit zwischen … und …“, über Nacht „im Zeitraum vom …, … Uhr, bis zum …, … Uhr“; unbekannt „zu einem nicht näher bekannten Zeitpunkt“.
- **Fahrzeuge** mit Genus und Kasus: „der Pkw / das Kraftrad / der Anhänger“, „den auf dem Kundenparkplatz … abgestellten Pkw der Geschädigten“, Kennzeichen mit Fragment-Hinweis.
- **Fahrzeugteile** mit richtigem Artikel: „Am Kotflügel vorne links …“, „An der Vordertür links …“; Singular/Plural je Schadensart („befand sich eine Delle“, „befanden sich Kratzspuren mit Lackabrieb sowie eine Delle“).
- **Zählwörter**: „eine Spurensicherungsfolie … liegt“ / „zwei Spurensicherungsfolien … liegen“, „einen Fahrstreifen“ / „zwei Fahrstreifen“.
- **Nur was beantwortet ist, wird geschrieben**; Verneinungen werden ausformuliert („Fremdteile wurden nicht aufgefunden“), Nicht-Beantwortetes entfällt oder wird als `[Platzhalter]` markiert.
- **Bewertung** leitet sich aus dem Spurenbild ab (Anstoßhöhe von–bis, Verlauf, Fremdlackfarbe → Verursacherfahrzeug) und nutzt die Formulierungshilfen des Erlasses.
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
