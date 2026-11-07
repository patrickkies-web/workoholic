# Workoholic

Arbeitsseite für Anfragen von Kollegen, eigene Todos und Aufgaben, mit Stempeluhr zum **Eindongeln / Ausdongeln**.
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
4. **CSV-Export** der Arbeitszeiten ist absichtlich Klartext (für Excel). Die App warnt vorher.
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
- Schnellerfassung: `@Sabine Zahlen schicken !` legt eine dringende Anfrage von Sabine an. `#aufgabe` / `#todo` / `#buchung` wählt die Art, `⇧ Enter` öffnet die Details.

**Überblick**
- Planner nach Dringlichkeit gruppiert.
- Fokus-Karte mit Live-Countdown.
- Filter, Suche, Kollegen-Avatare und Kalender mit Fristen.

**Dienste & Überstunden**
- **Eindongeln** (Tippen, Ziehen oder Taste `D`) beginnt einen Dienst: Vorlage aus dem Katalog antippen, Beginn ist jetzt, das geplante Ende kommt aus der Vorlage. Ein vorab eingetragener Dienst startet direkt.
- Beginn und geplantes Ende lassen sich jederzeit über den Stift ändern, auch während des Dienstes.
- **Länger gemacht:** zwischendurch oder danach per `+15 Min` / `−15` eintragen. Wer nach dem geplanten Ende **ausdongelt**, wird gefragt, ob die Mehrzeit als Überstunden zählt (auf 15 Minuten gerundet).
- Ausdongeln vergessen? Die App fragt, ob das geplante Ende oder „jetzt“ gilt.
- **Überstunden-Konto:** Woche, Monat, Jahr und Gesamt, dazu die letzten Dienste mit Überstunden.
- **Dienste eintragen** für jeden Tag, auch im Voraus (Nachtdienste enden automatisch am Folgetag). Überschneidungen werden abgefangen; Pausen werden nach Arbeitszeitgesetz geprüft.
- **Dienste-Katalog:** Schichtbezeichnung, Beginn, Ende, Pause und Farbe frei änderbar. Vorlagen lassen sich anlegen und löschen, und der Katalog wird zwischen deinen Geräten synchronisiert.
- Wochenchart mit Diensten, Überstunden (gestapelt) und geplanten Diensten; im Kalender sind geplante Dienste markiert.
- CSV-Export aller Dienste mit Pause, Arbeitszeit und Überstunden.

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

**Tastatur:** `N` neu (je nach Bereich) · `/` suchen · `1`–`4` Bereiche · `D` dongeln · `L` sperren · `Strg/⌘ + Enter` speichern

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
| `js/app.js` | App-Logik (Planner, Dienste, Termine, Routinen, Team, Ablage), Sync und Zusammenführen, Sperre |
| `vendor/hash-wasm/` | Argon2id (hash-wasm 4.12.0, MIT), unverändert aus npm |
| `fonts/` | Inter Tight & Geist Mono (SIL Open Font License) |
| `assets/`, `icons/`, `manifest.webmanifest` | Bild, App-Icons, Home-Bildschirm |
