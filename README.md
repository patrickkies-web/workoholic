# Workoholic

Eine Arbeitsseite für Anfragen von Kollegen, eigene Todos und Aufgaben, mit Stempeluhr zum **Eindongeln / Ausdongeln**.
Dunkles, cleanes Design, eine einzige Datei, keine Installation.

## Starten

- **Lokal:** `index.html` per Doppelklick im Browser öffnen. Läuft auch offline.
- **Als Webseite:** Im Repo unter *Settings → Pages* den Branch auswählen und den Ordner `/ (root)` angeben. Danach läuft die Seite unter `https://<user>.github.io/workoholic/` und lässt sich am Handy über „Zum Home-Bildschirm“ wie eine App nutzen.

## Funktionen

**Erfassen**
- Drei Arten: **Anfrage** (von wem?), **Todo** (eigenes), **Aufgabe** (optional von/für wen).
- Fünf Dringlichkeiten:
  - **Einmalig**: ohne festen Termin, älteste zuerst
  - **Ultimatum**: Frist mit Countdown, Schnellwahl (in 1 Std, heute 17:00, morgen, Freitag, in 1 Woche)
  - **Dauer**: geschätzter Aufwand plus ▶-Timer, der die investierte Zeit misst
  - **Schnellstmöglich**: immer ganz oben und im Fokus
  - **Wiederkehrend**: täglich, werktags, wöchentlich oder monatlich; nach dem Abhaken rutscht der Termin automatisch weiter
- Status: Offen, In Arbeit, Wartet auf Rückmeldung.
- **Schnellerfassung:** `@Sabine Zahlen schicken !` legt eine Anfrage von Sabine an, die schnellstmöglich erledigt werden soll. Mit `#aufgabe` / `#todo` wählst du die Art, mit `⇧ Enter` öffnet sich die Detailansicht. Mehrteilige Namen schreibst du als `@Sabine_Krüger`.

**Überblick**
- Planner gruppiert nach *Schnellstmöglich, Überfällig, Heute, Demnächst, Ohne Termin, Erledigt*.
- **Fokus-Karte** zeigt das Dringendste mit Live-Countdown.
- Filter nach Art, Suche, Kollegen-Avatare (offene Anfragen pro Person) und Kalender: ein Klick auf einen Tag zeigt dessen Fristen.

**Stempeluhr**
- Großer Dongle-Schalter: tippen oder nach rechts ziehen. Im Handy-Dock gibt es denselben Schalter, am Rechner die Taste `D`.
- Arbeitszeit heute, Pausen, voraussichtlicher Feierabend (inkl. noch fälliger Pause), Wochenstunden, Tagesverlauf.
- Hinweise nach Arbeitszeitgesetz (30 Min Pause nach 6 Std, 45 Min nach 9 Std, Höchstgrenze 10 Std).
- Stempel nachtragen oder korrigieren; Überschneidungen werden abgefangen.
- Wochenchart mit Tagessoll; ein Klick auf einen Tag zeigt dessen Stempel.
- **Export der Arbeitszeiten als CSV** (Excel-tauglich, deutsches Format).

**Sonstiges**
- Fast jede Aktion lässt sich über „Rückgängig“ im Hinweis unten zurücknehmen.
- Tastatur: `N` neuer Eintrag, `/` Suche, `D` dongeln, `Strg/⌘ + Enter` speichern.
- Einstellungen (Menü `···`): Name für die Begrüßung, Tagessoll, Backup exportieren/importieren, Beispieldaten.

## Daten

Alles wird **nur lokal im Browser** gespeichert (`localStorage`); es geht nichts an einen Server.
Daten sind deshalb an Browser und Gerät gebunden. Über *Menü → Backup exportieren* sicherst du sie
und kannst sie auf einem anderen Gerät wieder importieren. Wer den Browserverlauf samt Website-Daten löscht,
löscht auch die Einträge.
