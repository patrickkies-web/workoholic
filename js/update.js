/* Workoholic – Aktualisierung
   Die App hat keinen Build-Schritt und keinen Service Worker. Als Home-Bildschirm-App hält das iPhone
   Seite und Skripte aber im Speicher, sodass ein neuer Stand nicht zuverlässig von selbst ankommt.
   Dieses Skript vergleicht den geladenen Stand (data-stand am <html>) mit js/version.js auf dem Server
   und holt den neuen Stand:
   – gesperrt und nichts getippt: sofort, ohne Rückfrage;
   – entsperrt: Hinweis mit Knopf – spätestens beim nächsten Sperren wird der neue Stand geladen.
   Kein fetch (CSP: connect-src nur api.github.com) – die Versionsdatei wird als Skript nachgeladen.
   Der Stand wird mit tools/stand.sh gesetzt (index.html und js/version.js gemeinsam). */
(function () {
  'use strict';
  const STAND = document.documentElement.dataset.stand || '';
  const ABSTAND = 5 * 60 * 1000;      // so oft höchstens von selbst nachsehen
  let neu = '';                       // Stand auf dem Server, wenn er vom geladenen abweicht
  let zuletzt = 0, laeuft = null, spaeter = '', balken = null;

  const $ = s => document.querySelector(s);
  const fmt = s => {
    const m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)$/.exec(s || '');
    return m ? `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]} Uhr` : (s || 'unbekannt');
  };
  const entsperrt = () => !!(window.WBridge && window.WBridge.unlocked());

  /** Stand vom Server lesen – am Zwischenspeicher vorbei. null = nicht erreichbar. */
  function holen() {
    return new Promise(res => {
      const s = document.createElement('script');
      let fertig = false;
      const ende = wert => { if (fertig) return; fertig = true; clearTimeout(t); s.remove(); res(wert); };
      const t = setTimeout(() => ende(null), 12000);
      try { delete window.WK_STAND; } catch (e) { window.WK_STAND = undefined; }
      s.onload = () => ende(typeof window.WK_STAND === 'string' && window.WK_STAND ? window.WK_STAND : null);
      s.onerror = () => ende(null);
      s.src = 'js/version.js?t=' + Date.now().toString(36);
      document.head.appendChild(s);
    });
  }

  /** Wurde genau dieser Stand schon angefordert und trotzdem ein anderer geliefert? Dann nicht im Kreis laden. */
  const versucht = s => { try { return new URLSearchParams(location.search).get('v') === s; } catch (e) { return false; } };

  /** Sperrbildschirm mit leerem Passwortfeld – hier stört ein Neuladen niemanden. */
  function ruhig() {
    const f = $('#gLock');
    if (entsperrt() || !document.body.classList.contains('locked') || !f || f.hidden) return false;
    return ![...f.querySelectorAll('input[type=password]')].some(i => i.value);
  }

  /** Neuen Stand laden: eigene Adresse je Stand, damit kein Zwischenspeicher die alte Seite liefert. */
  function laden() {
    const ziel = neu || STAND;
    let q = '?v=' + encodeURIComponent(ziel);
    if (versucht(ziel)) q += '&t=' + Date.now().toString(36);
    location.replace(location.pathname + q);
  }

  /** Aktualisieren aus der App heraus: entsperrt erst sauber speichern und sperren (app.js lädt dann den neuen Stand). */
  function anwenden() {
    if (!neu) return;
    if (entsperrt() && window.WBridge.lock) { window.WBridge.lock(); return; }
    try { sessionStorage.setItem('workoholic:lockmsg', 'update'); } catch (e) {}
    laden();
  }

  function zeigen() {
    anzeige();
    if (!neu || spaeter === neu || balken) return;
    const host = $('#toasts'); if (!host) return;
    balken = document.createElement('div');
    balken.className = 'upd'; balken.setAttribute('role', 'status');
    const t = document.createElement('span'); t.textContent = 'Neue Version verfügbar';
    const ja = document.createElement('button'); ja.type = 'button'; ja.textContent = 'Aktualisieren'; ja.dataset.upd = 'laden';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'upd-x'; x.textContent = '✕'; x.dataset.upd = 'spaeter';
    x.setAttribute('aria-label', 'Später aktualisieren');
    balken.append(t, ja, x);
    balken.addEventListener('click', e => {
      const b = e.target.closest('[data-upd]'); if (!b) return;
      if (b.dataset.upd === 'laden') anwenden();
      else { spaeter = neu; balken.remove(); balken = null; }
    });
    host.prepend(balken);
  }

  /** Stand sichtbar machen: Sperrbildschirm und Einstellungen. */
  function anzeige(hinweis) {
    const g = $('#wkStand'); if (g) g.textContent = 'Stand ' + fmt(STAND);
    const i = $('#updInfo');
    if (i) i.textContent = hinweis || (neu ? `Geladen: Stand ${fmt(STAND)}. Neu verfügbar: Stand ${fmt(neu)}.` : `Geladen: Stand ${fmt(STAND)}.`);
    const b = $('#updCheck'); if (b) b.textContent = neu ? 'Jetzt aktualisieren' : 'Nach neuer Version suchen';
  }

  /** Nachsehen. Liefert 'neu' | 'aktuell' | 'offline'. */
  function pruefen(sofort) {
    if (laeuft) return laeuft;
    if (!sofort && Date.now() - zuletzt < ABSTAND) return Promise.resolve(neu ? 'neu' : 'aktuell');
    zuletzt = Date.now();
    laeuft = holen().then(s => {
      laeuft = null;
      if (!s) { zuletzt = 0; return 'offline'; }
      if (s === STAND) { neu = ''; anzeige(); return 'aktuell'; }
      neu = s;
      if (ruhig() && !versucht(neu)) { try { sessionStorage.setItem('workoholic:lockmsg', 'update'); } catch (e) {} laden(); }
      else zeigen();
      return 'neu';
    });
    return laeuft;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('#updCheck'); if (!b) return;
    if (neu) { anwenden(); return; }
    b.disabled = true; anzeige('Suche …');
    pruefen(true).then(r => {
      b.disabled = false;
      anzeige(r === 'offline' ? `Keine Verbindung – bitte später noch einmal versuchen. Geladen: Stand ${fmt(STAND)}.`
        : r === 'aktuell' ? `Du hast den neuesten Stand (${fmt(STAND)}).` : '');
    });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefen(false); });
  addEventListener('pageshow', e => { if (e.persisted) pruefen(true); });
  addEventListener('online', () => pruefen(false));

  window.WUpdate = Object.freeze({ stand: STAND, neu: () => neu, laden, pruefen, fmt });
  anzeige();
  pruefen(true);
})();
