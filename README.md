# Workoholic

Arbeitsseite für Anfragen von Kollegen, eigene Todos und Aufgaben, mit Stempeluhr zum **Eindongeln / Ausdongeln**, Terminen, Routinen, Team, Ablage, WaffG-Prüfstand – und dem Bereich **Schreiben** zum Aufnehmen von Vorgängen per Antippen (derzeit: Verkehrsunfallflucht ohne Personenschaden).
Alle Daten sind **Ende-zu-Ende verschlüsselt**. Synchronisiert wird über ein eigenes privates GitHub-Repo, das nur Chiffretext enthält.

---

## Sicherheit

### So funktioniert die Verschlüsselung

| Baustein | Umsetzung |
| --- | --- |
| Schlüssel aus dem Master-Passwort | **Argon2id**, 64 MiB Speicher, 3 Durchläufe, 16-Byte-Zufallssalz |
| Daten­verschlüsselung | **AES-256-GCM** mit zufälligem 256-Bit-Datenschlüssel und neuem 96-Bit-IV bei jedem Speichern |
| Schlüsselverwaltung | Der Datenschlüssel ist zweifach verpackt: mit dem Master-Passwort und mit einem **Wiederherstellungsschlüssel** (160 Bit). |
| Manipulationsschutz | Parameter und Schlüsselblock sind kryptografisch an die Daten gebunden. Einen Passwortwechsel übernehmen Geräte nur, wenn er von einem deiner entsperrten Geräte signiert wurde. |
| Metadaten | Klartext wird vor der Verschlüsselung auf 4-KB-Blöcke aufgefüllt, damit die Dateigröße kaum etwas über den Inhalt verrät. |

**Klartext verlässt nie dein Gerät.** Weder im Browser-Speicher noch auf GitHub noch im Backup liegt irgendetwas unverschlüsselt.
Auch dein GitHub-Token wird verschlüsselt abgelegt.

### Was andere sehen können

- **GitHub** sieht eine Datei mit zufälligen Bytes, ihre ungefähre Größe (in 4-KB-Stufen) und wann sie sich ändert. Der Verlauf wird täglich auf einen einzigen Commit eingedampft.
- **Fremde Server** sehen gar nichts. Schriften und die Argon2-Bibliothek liegen im Repo. Eine strenge Content-Security-Policy erlaubt Verbindungen ausschließlich zu `api.github.com`. Es gibt kein Tracking und keine Analyse, die Seite verschickt keinen Referrer und ist für Suchmaschinen gesperrt.
- **Dein Gerät:** Im Browser-Speicher liegt nur der verschlüsselte Tresor. Nach Inaktivität (einstellbar: 5–60 Min) sperrt die Seite automatisch. Beim Sperren wird sie neu geladen, damit Klartext und Schlüssel komplett aus dem Arbeitsspeicher verschwinden.

### Ehrliche Grenzen

Keine Software schützt gegen alles. Diese Punkte liegen bei dir:

1. **Master-Passwort:** Nimm ein langes, das du nirgends sonst verwendest, am besten einen Satz aus mehreren Wörtern. Die App lässt nichts unter 12 Zeichen und keine schwachen Muster zu.
2. **GitHub-Account mit Zwei-Faktor-Anmeldung (Passkey oder Authenticator) absichern – Pflicht!** Wer deinen GitHub-Account übernimmt, könnte den App-Code verändern und dein Passwort beim nächsten Entsperren abgreifen.
3. **Gerät:** Gegen Schadsoftware, Keylogger oder jemanden, der an deinem *entsperrten* Gerät sitzt, hilft keine Verschlüsselung. Halte Betriebssystem und Browser aktuell.
4. **CSV-Export** der Arbeitszeiten, **Kalender-Export** und **Textexport** eines Vorgangs sind absichtlich Klartext. Die App warnt vorher.
5. **Passwort und Wiederherstellungsschlüssel verloren = Daten verloren.** Das ist der Preis echter Ende-zu-Ende-Verschlüsselung: Niemand hat einen Generalschlüssel.

---

## Einrichtung (einmalig, ca. 5 Minuten)

1. **Tresor-Repo anlegen:** GitHub → *New repository* → Name z. B. `workoholic-tresor` → **Private** → *ohne* README → *Create*.
2. **Token erstellen:** GitHub → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens* → *Generate new token*
   - *Repository access:* **Only select repositories** → nur `workoholic-tresor`
   - *Permissions → Repository permissions → Contents:* **Read and write**
   - Ablaufdatum nach Wunsch. Danach in der App einfach einen neuen Token eintragen.
3. **App öffnen**, Master-Passwort festlegen und den **Wiederherstellungsschlüssel** sicher notieren (Papier oder Passwort-Manager).
4. **⋯ → Sicherheit & Sync**: Repo (`deinname/workoholic-tresor`) und Token eintragen → *Verbinden*.
5. **Weitere Geräte:** App öffnen → *„Ich habe schon einen Tresor auf einem anderen Gerät“* → Repo, Token und Master-Passwort eingeben.

Änderungen auf mehreren Geräten gleichzeitig werden automatisch zusammengeführt: Pro Eintrag gewinnt der neueste Stand, und Löschungen kommen überall an.

## Von überall erreichbar: Hosting

Die Seite ist rein statisch (HTML/JS), ein eigener Server ist nicht nötig. Ihr Code enthält keine Geheimnisse; die Sicherheit beruht allein auf der Verschlüsselung.

- **GitHub Pages:** Im Code-Repo *Settings → Pages* → Branch wählen, Ordner `/ (root)`. Bei einem **privaten** Repo braucht das GitHub Pro. Alternativ stellst du dieses Code-Repo öffentlich; die Daten liegen ohnehin getrennt im privaten Tresor-Repo. Danach läuft die Seite unter `https://<user>.github.io/workoholic/` und lässt sich am Handy über *„Zum Home-Bildschirm“* wie eine App nutzen.
- **Lokal:** `index.html` per Doppelklick öffnen. Funktioniert inklusive Sync.

## Funktionen

**Erfassen**
- **Anfrage** (von wem?), **Todo**, **Aufgabe** oder **Stundenbuchung** (siehe unten).
- Dringlichkeit:
  - *Einmalig*
  - *Ultimatum* (Frist mit Countdown)
  - *Dauer* (Aufwand plus ▶-Timer)
  - *Schnellstmöglich*
  - *Wiederkehrend* (täglich, werktags, wöchentlich, monatlich)
- Status: offen, in Arbeit, wartet auf Rückmeldung.
- **Wichtig:** Haken im Eintrag oder `*` in der Schnellerfassung. Wichtige Einträge stehen im Planner ganz oben (Gruppe „Wichtig“, älteste zuerst) und tragen einen ★.
- Schnellerfassung: `@Sabine Zahlen schicken !` legt eine dringende Anfrage von Sabine an. `#aufgabe` / `#todo` / `#buchung` wählt die Art, `*` markiert als wichtig, `⇧ Enter` öffnet die Details.

**Überblick**
- Planner nach Dringlichkeit gruppiert.
- Fokus-Karte mit Live-Countdown.
- Filter, Suche, Kollegen-Avatare und Kalender mit Fristen.

**Dienste & Überstunden**
- **Eindongeln** (Tippen, Ziehen oder Taste `D`) öffnet *Dienst beginnen* mit den Abschnitten Schicht, Besatzung und Einsatzmittel: Schicht aus dem Katalog wählen (ein vorab eingetragener Dienst ist schon vorgewählt), dazu, **mit wem** du unterwegs bist – Kolleginnen und Kollegen aus dem Team antippen oder neu eintragen (landen automatisch im Team), „Wie zuletzt“ übernimmt die letzte Besatzung – und optional das **Einsatzmittel** (Funkrufname). Die Vorschau zeigt die Routinen dieser Schicht und die Zahl offener To-dos. Beginn ist jetzt, das geplante Ende kommt aus der Vorlage; *Andere Zeiten …* erlaubt freie Zeiten und behält die Besatzung.
- **Schichtbriefing:** Nach dem Bestätigen fliegen alle offenen To-dos ein – wichtige ganz oben, dann die ältesten zuerst –, dazu die Termine in der Schichtzeit, Einsätze früherer Schichten ohne Abschluss und die Routinen der Schicht. Antippen öffnet den Eintrag.
- Beginn und geplantes Ende lassen sich jederzeit über den Stift ändern, auch während des Dienstes.
- **Länger gemacht:** zwischendurch oder danach per `+15 Min` / `−15` eintragen. Wer nach dem geplanten Ende **ausdongelt**, wird gefragt, ob die Mehrzeit als Überstunden zählt (auf 15 Minuten gerundet).
- Ausdongeln vergessen? Die App fragt, ob das geplante Ende oder „jetzt“ gilt.
- Beim Ausdongeln nennt die App, was in der Schicht noch offen ist: laufende Einsätze (werden mit dem Dienstende beendet), Einsätze ohne Abschluss und nicht abgeschlossene Routinen.
- **Überstunden-Konto:** Woche, Monat, Jahr und Gesamt, dazu die letzten Dienste mit Überstunden.
- **Dienste eintragen** für jeden Tag, auch im Voraus (Nachtdienste enden automatisch am Folgetag). Überschneidungen werden abgefangen; Pausen werden nach Arbeitszeitgesetz geprüft.
- **Dienste-Katalog:** Schichtbezeichnung, Beginn, Ende, Pause und Farbe frei änderbar. Vorlagen lassen sich anlegen und löschen, und der Katalog wird zwischen deinen Geräten synchronisiert.
- Wochenchart mit Diensten, Überstunden (gestapelt) und geplanten Diensten; im Kalender sind geplante Dienste markiert.
- CSV-Export aller Dienste mit Pause, Arbeitszeit und Überstunden.

**Schicht & Einsätze (Bereich *Heute*)**
- Die **Schichtkarte** oben zeigt die laufende Schicht mit Besatzung und Einsatzmittel, ihre Einsätze und Routinen. Ein Tag in der Woche antippen zeigt die Schicht dieses Tages.
- **+ Einsatz** (oder Taste `E`) legt den nächsten Einsatz an (E1, E2 …, Beginn jetzt). Das Blatt hat drei nummerierte Abschnitte, deren Nummer gelb wird, sobald sie erledigt sind: **1 Lage** (Stichwort, Ort), **2 Verlauf** (Beginn/Ende, auch über Mitternacht, Notizen), **3 Abschluss**.
- **Vorschläge** erscheinen nur, solange das Stichwort leer ist: die sechs meistgenutzten, der Rest hinter *Mehr*; beim Tippen werden sie gefiltert. Bei Maßnahmen stehen vier Vorschläge da, bereits angelegte verschwinden.
- **Abschluss:** erst das Ergebnis als Freitext („Lage beruhigt, Platzverweis“), dann die Folgearbeiten: *Keine Maßnahmen* (und keine schriftlichen Arbeiten) oder *Maßnahmen*. Nur bei *Maßnahmen* erscheinen **To-dos** – sie hängen am Einsatz, erscheinen gleichzeitig im Planner (mit Einsatz-Pille) und lassen sich als wichtig markieren. Erledigt man sie im Planner, gilt der Einsatz als abgeschlossen.
- **Schriftliche Arbeit** direkt aus dem Einsatz starten (Verkehrsunfallflucht, Vermisste Person): Datum, Uhrzeit, Rufname und Besatzung sind vorbelegt; ein verknüpftes To-do erledigt sich, sobald der Vorgang als fertig markiert ist.
- **Routinen je Schicht:** Im Routinen-Editor an Schicht-Vorlagen und/oder Einsatzmittel binden („Fahrzeugcheck“ nur für `Stf 21/03`, „Schichtübergabe“ nur für Früh- und Spätdienst). Gebundene Routinen erscheinen in Vorschau, Briefing und Schichtkarte mit Fortschritt je Schicht.

**Stunden für Kollegen buchen**
- Eintragsart *Stunden buchen*: Kollegin/Kollege, Datum des Dienstes, Dienst (aus dem Katalog) und Stunden in 15-Minuten-Schritten.
- Landet als Todo im Planner (Filter „Buchungen“) und wird abgehakt, sobald du die Stunden im System eingetragen hast.
- Schnellzugriff: Knopf *Stunden für Kollegen merken* im Überstunden-Konto.

**Termine (Bereich *Heute*, Kalender)**
- Tag im Kalender antippen → *+ Termin*: Titel, Datum, ganztägig oder mit Uhrzeit, Ort, Erinnerung, Notizen.
- **In meinen Kalender:**
  - *Apple / Outlook (.ics)* erzeugt eine Standard-Kalenderdatei (RFC 5545) inklusive Erinnerung. Öffnen genügt, dein Kalender übernimmt den Termin.
  - *Google* und *Outlook.com* öffnen den Termin direkt beim jeweiligen Anbieter. Erst dabei verlässt der Termin dein Gerät.
- *.ics*-Knopf im Kalender: alle Termine (wahlweise plus geplante Dienste) in einer Datei exportieren.

**Routinen (Schablonen)**
- Eigene Abläufe mit Schritten (eine Zeile pro Schritt), Farbe und Rhythmus: bei Bedarf, täglich, werktags, wöchentlich oder monatlich.
- *Starten* öffnet einen Durchlauf zum Abhaken (mit Uhrzeit pro Schritt). Er lässt sich unterbrechen und später fortsetzen; *Abschließen* speichert ihn im Verlauf.
- Fällige Routinen werden markiert und in der Navigation gezählt.

**Team**
- Personenbaum: Wer berichtet an wen, beliebig viele Rollen pro Person, optional Kontakt.
- Notizen je Person mit automatischem Zeitstempel, chronologisch nach Tagen gruppiert (neueste oben). Nachträgliche Änderungen werden als „bearbeitet“ markiert.
- Offene Anfragen und Stundenbuchungen der Person aus dem Planner erscheinen direkt in ihrem Bereich.

**Ablage (Dateien & Dokumente)**
- Dateien bis 20 MB werden **auf dem Gerät verschlüsselt** (AES-256-GCM, an die Datei gebunden, auf 16-KB-Blöcke aufgefüllt) und im Browser-Speicher (IndexedDB) abgelegt.
- Mit Sync landen sie verschlüsselt als `files/<zufällige-ID>` im Tresor-Repo; Dateinamen stehen nur im verschlüsselten Tresor. Andere Geräte laden sie erst beim Öffnen.
- Vorschau für Bilder, Texte, Audio/Video, dazu Herunterladen, Teilen, Ordner, Notizen und „Nur in der Cloud behalten“ (lokale Kopie löschen).

**WaffG-Prüfstand**
- Geprüft wird nach dem amtlichen Wortlaut: WaffG zuletzt geändert durch Art. 12 Abs. 20 G v. 22.10.2026 (BGBl. I Nr. 318), dazu § 22a KrWaffKontrG sowie StGB/OWiG für Vorsatz, Irrtum, Versuch und Konkurrenzen. Die Texte stammen aus dem täglichen Archiv von gesetze-im-internet.de und sind in der App enthalten – es wird nichts nachgeladen.
- **Gegenstände:** Messer (Einhand, feststehend mit Klingenlänge, Spring- mit Ausnahme nach Nr. 1.4.1 Satz 2, Fall-, Faust-, Butterfly-, getarnte Messer), scharfe Schusswaffen (Pistole, Revolver, Langwaffe, Vollautomat, Pumpgun, getarnte, wesentliche Teile), SRS-Waffen, Druckluft/Softair, Antik-, Deko- und Salutwaffen, Munition, Hieb-, Stoß- und Schlagwaffen, Reizstoff- und Elektroimpulsgeräte, Armbrust, Präzisionsschleuder, Brand-/Sprengvorrichtungen, Anscheinswaffen, Kriegswaffen.
- **Umgangsarten (§ 1 Abs. 3):** Besitz, Erwerb, Führen, Überlassen, Schießen, Verbringen/Mitnehmen, Herstellen/Bearbeiten, Handel – dazu die Aufbewahrung (§ 36, § 52 Abs. 3 Nr. 7a).
- **Umstände:** Ort (öffentlich, Veranstaltung § 42, Personenfernverkehr § 42b, Verbotszone § 42 Abs. 5, fremder oder eigener Hausrechtsbereich), Zugriff (zugriffsbereit, mehr als drei Handgriffe, verschlossenes Behältnis), geladen, Zweck (Beruf, Sport, anerkannter Zweck, Gastronomie, Film …), Erlaubnisse (WBK, Waffenschein, kleiner Waffenschein, Jagdschein, Schießerlaubnis, behördliche Ausnahmen), Fund/Erbe, Waffenverbot nach § 41, Alter, Vorsatz oder Fahrlässigkeit.
- **Ergebnis:** alle einschlägigen Prüfpunkte mit Norm und Strafrahmen (z. B. § 51, § 52 Abs. 1 Nr. 2 Buchst. b, § 52 Abs. 3 Nr. 9, § 53 Abs. 1 Nr. 21a bis 21c), Fahrlässigkeit, Versuch, minder und besonders schwere Fälle, Einziehung, Konkurrenzen (§ 52 StGB, §§ 19, 21 OWiG).
- **Subsumtion:** Jede Prüfung ist im Gutachtenstil aufgebaut (Obersatz, objektiver Tatbestand Merkmal für Merkmal mit +/−/?, subjektiver Tatbestand, Rechtswidrigkeit und Schuld, Ergebnis).
- **i-Knöpfe:** Hinter jeder Auswahl, jedem Abschnitt und jeder Fundstelle stehen Wortlaut, Tatbestandsmerkmale, Prüfhinweise und Abgrenzungen sowie geprüfte Rechtsprechung (BGH 3 StR 81/22, 4 StR 431/06).
- Text für Anzeige oder Vermerk mit Tatbestand je Prüfpunkt: frei bearbeitbar, kopierbar, als Aufgabe in den Planner. „Speichern“ legt die Prüfung verschlüsselt mit Zeitstempel ab; ältere Prüfungen werden übernommen.
- **Keine Rechtsberatung.** Nicht abgebildet sind u. a. Altbesitz (§ 58), Melde- und Anzeigepflichten im Detail, Sportschützen- und Sammlerregeln sowie der Inhalt einzelner Landesverordnungen und Allgemeinverfügungen.

**Schreiben (Schriftliche Arbeiten)**
- **Vorgang anlegen** → Modul wählen: **Verkehrsunfallflucht ohne Personenschaden** oder **Vermisste Person** (siehe unten). Der Assistent beginnt mit „Worum geht es?“ (Weichen-Fragen) und führt dann in neun Phasen durch die Aufnahme: Einsatz → Geschädigte → Unfallort → Schaden → Spuren → Zeugen → Verursacher → Maßnahmen → Bewertung. Es erscheinen nur Fragen, die zum Fall passen – auch für Sonderfälle wie „geschädigte Person nicht erreicht“, weitere Geschädigte, Selbstmeldung, Alkohol, Führerscheinmaßnahmen oder Wohnsitz im Ausland.
- **Satzbausteine:** Jedes Textfeld zeigt den festen Satzanfang aus dem Bericht und ein graues Beispiel, wie es grammatisch weitergeht („Die Unfallstelle befindet sich *in der zweiten Parkreihe …*“). Satzanfänge und Beispiele passen sich an Geschlecht und Rolle an; bei Ich-Form oder fehlender indirekter Rede gibt es einen Hinweis.
- Nach jeder Antwort springt die Ansicht zur nächsten offenen Frage; Rufname und Besatzung kommen aus der laufenden Schicht (sonst „Wie zuletzt“), der Ort aus dem letzten Vorgang. Wer bei „Hinweise auf den Verursacher“ gleich am Anfang *Nein* sagt, bekommt die Frage später nicht noch einmal (außer Zeugen oder Zeugensuche bringen neue Hinweise). Die Phasenleiste oben ist antippbar, Listen (Zeugen, weitere Schäden) zeigen die erste Karte sofort, und fehlende Pflichtangaben werden bei „Weiter“ nur kurz genannt, nie blockiert.
- Fragen per Ja/Nein, Chips, Zahlen mit ±, Schnellwerten („Jetzt“, „Heute“, 50 km/h, 1.500 €); **Fahrzeugskizze** für das Schadensbild (Draufsicht, Front oben: beschädigte Stelle antippen, erneut tippen hebt auf; Säulen, Seitenscheiben, Schweller, Radläufe, Reifen u. a. unter *Weitere Teile*), Anstoßhöhe mit Schnellwerten; **Schnellwahl** füllt mit einem Tipp typische Angaben – Straße (Wohnstraße innerorts, Tempo-30-Zone, Hauptstraße, Landstraße), Verhältnisse mit Lichtvorschlag nach Uhrzeit (Sonnenauf- und -untergang, Dämmerung), Unfallzeit „bemerkt kurz vor der Meldung“ und den üblichen Abschluss (Unfallmitteilung, Lichtbilder, Anzeige) – Abweichungen danach einfach ändern; Personen- und Zeugenblöcke.
- Unter jedem Schritt die Live-Vorschau „So steht es im Bericht“; jede Antwort wird sofort verschlüsselt gespeichert – unterbrechen und später weitermachen ist jederzeit möglich (auch nach Auto-Sperre).
- Ergebnis: **Verkehrsunfallbefundbericht** exakt nach Anlage 6 des Erlasses (1.1 Einsatzübernahme … 6.3 Einsatzende, mit Fahrzeug UB 01/UB 02/UB 03 ff. in 2.3 und UB 01 vor UB 02 in 3.1) mit passender Satzführung (Rolle, Geschlecht, Ein-/Mehrzahl, Zeitpunkt/Zeitraum, indirekte Rede), dazu **Kurzsachverhalt**, **Fahndungstext**, **Offene Punkte** (als Todos in den Planner übernehmbar) und ein gesonderter **Personalienblock**.
- Kopieren in die Zwischenablage oder als `.txt` speichern (mit Warnung – Klartext). Platzhalter in `[eckigen Klammern]` zeigen, was noch fehlt.
- Konzept, Rechtsgrundlagen und Fragenkatalog: [`docs/VUF-MASTERPLAN.md`](docs/VUF-MASTERPLAN.md).
- **Vermisste Person** (aus dem VUF-Assistenten übernommen): Anzeigenerstatter und Meldung, Personalien der vermissten Person, letzte Sichtung mit Richtung und Fortbewegung (zu Fuß inkl. Mobilität), Zugriff auf Pkw und andere Fahrzeuge (Beschreibung, Kennzeichen, noch vor Ort?), Krankheiten, Medikamente (lebenswichtig, heute eingenommen?), Suizidalität, Erscheinungsbild (Statur, Größe, Haarfarbe/-länge, Auffälligkeiten, Bekleidung), Handy, bekannte Aufenthaltsorte, Anlaufadressen, Fotos (Teamwire), früheres Vermisstsein, Vergleichsmaterial für den Mantrailer. Ergebnis: **Übersicht** im Format des VUF-Assistenten, **Kurzsachverhalt**, **Personenbeschreibung für die Fahndung**, **offene Punkte** (nur Lücken und Gefahrenhinweise wie Minderjährigkeit, lebenswichtige Medikamente, aktuelle Suizidäußerungen) und **Personalien**.

**Tastatur:** `N` neu (je nach Bereich) · `/` suchen · `1`–`6` Bereiche · `S` schreiben · `D` dongeln · `E` Einsatz · `L` sperren · `Strg/⌘ + Enter` speichern bzw. weiter

**Backups:** *⋯ → Verschlüsseltes Backup* speichert eine `.vault`-Datei. Einspielen geht per Zusammenführen oder Ersetzen.

## Speicherkapazität

| Wo | Wie viel | So beeinflusst du es |
| --- | --- | --- |
| **Dateien auf dem Gerät** (IndexedDB) | Vom Browser zugeteilt, abhängig vom freien Speicher: Chrome, Edge und Safari (ab iOS 17) bis rund **60 % des Gerätespeichers**. Der genaue Wert steht live in der Ablage. | Freien Gerätespeicher schaffen; große Dateien „nur in der Cloud behalten“; als App zum Home-Bildschirm hinzufügen und **„Dauerhaft sichern“**, damit der Browser nichts räumt. Safari löscht Daten von Websites sonst nach 7 Tagen ohne Besuch. |
| **Tresor-Text** (Aufgaben, Dienste, Termine, Notizen) | ca. **5 MB** (Browser-Limit für localStorage), reicht für zehntausende Einträge | Erledigte entfernen; alte Notizen löschen |
| **Tresor-Repo auf GitHub** (Sync) | GitHub empfiehlt **unter 1 GB** pro Repo, ab 5 GB kommen Hinweise; einzelne Dateien bis 100 MB (die App begrenzt auf **20 MB**) | Dateien löschen: Sie verschwinden über die tägliche Verlaufsbereinigung auch aus dem Repo. Für mehr Platz ein zweites Tresor-Repo nutzen, z. B. pro Jahr. |

## Dateien

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Oberfläche, Styles, Content-Security-Policy |
| `js/vault.js` | Verschlüsselung, Schlüsselverwaltung, GitHub-Speicher |
| `js/app.js` | App-Logik (Planner, Dienste, Schicht & Einsätze, Termine, Routinen, Team, Ablage, WaffG-Prüfstand), Sync und Zusammenführen, Sperre |
| `js/writer.js` | Bereich „Schreiben“: Vorgangsliste, Aufnahme-Assistent, Berichtsansicht |
| `js/vuf.js` | Modul Verkehrsunfallflucht: Fragenkatalog und Textgenerator |
| `js/vermisst.js` | Modul Vermisste Person: Fragenkatalog, Übersicht, Kurzsachverhalt, Fahndung, offene Punkte |
| `docs/VUF-MASTERPLAN.md` | Masterplan: Grundlagen, Ablauf, Fragen, Satzführung, Sicherheit, Ausbau |
| `vendor/hash-wasm/` | Argon2id (hash-wasm 4.12.0, MIT), unverändert aus npm |
| `fonts/` | Inter Tight & Geist Mono (SIL Open Font License) |
| `assets/`, `icons/`, `manifest.webmanifest` | Bild, App-Icons, Home-Bildschirm |
