/*
 * Workoholic · Abschnitt „Maßnahmen“ (Zusatzbausteine am Ende des Berichts)
 * ---------------------------------------------------------------
 * Der letzte Abschnitt eines Vorgangs. Er fragt nur, was im Untermenü „Zusatzbausteine“ gewählt wurde – oder was hier über
 * „+“ noch dazukommt: Nahbereichsfahndung, qualifizierte Spurensicherung, Videoaufzeichnungen, Lichtbildmappe. Jede Antwort
 * wird ein fertiger Satz, in dieser Reihenfolge.
 *
 * Vorwahl nur, wo die Auswahl die Antwort schon nahelegt (Lichtbildmappe: Ja). Bei der Spurensicherung kommt es auf die
 * Antwort an – erfolgt mit gesondertem Bericht oder mangels Spurenlage verzichtet –, deshalb dort keine Vorwahl.
 * Videoaufzeichnungen: Eine Absuche, die nicht stattfand, steht nicht im Text. Wer angegeben hat, dass Aufzeichnungen
 * bestehen, kommt aus den Personen des Vorgangs (Eintreffsituation, Schilderungen) und heißt hier wie dort.
 *
 * Die Textlogik (unten „Text“) ist rein und ohne DOM testbar. Die Maske zeichnet writer.js über m.screen.
 * Gespeichert wird ausschließlich über writer.js / WBridge im verschlüsselten Tresor.
 */
(function (root) {
  'use strict';

  /* ======================= Helfer ======================= */
  const has = v => v != null && String(v).trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const str = v => (v == null ? '' : String(v)).trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  /** Vergleich unabhängig von der Reihenfolge der Schlüssel – der Tresor legt Objekte sortiert ab. */
  const stabil = v => (Array.isArray(v) ? '[' + v.map(stabil).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stabil(v[k])).join(',') + '}' : JSON.stringify(v ?? null));
  const same = (a, b) => stabil(a) === stabil(b);
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  function setPath(o, path, v) {
    const ks = path.split('.'); let cur = o;
    for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
    const last = ks[ks.length - 1];
    if (v === undefined || v === null || v === '') delete cur[last]; else cur[last] = v;
  }
  const ohneEnde = s => str(s).replace(/[\s.,;]+$/, '');
  const satz = s => { s = str(s); return s && !/[.!?]$/.test(s) ? s + '.' : s; };
  /** Abschnittsnummer ohne Punkt dahinter: „4.“ → „4“. */
  const cleanNr = s => str(s).replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');

  /* ======================= Punkte ======================= */
  /**
   * Was sich abfragen lässt – in der Reihenfolge, in der es im Text steht: [k, Name, Hinweis im Untermenü, Vorwahl].
   * felder = was zum Punkt gehört und mit ihm wieder verschwindet.
   */
  const PUNKTE = [
    { k: 'nbf', l: 'Nahbereichsfahndung', h: 'Durchgeführt? Ja oder Nein, ohne Vorwahl', felder: ['nbf', 'nbfErg'] },
    { k: 'spusi', l: 'Qualifizierte Spurensicherung', h: 'Erfolgt mit gesondertem Bericht oder verzichtet – ohne Vorwahl', felder: ['spusi', 'spusiDurch'] },
    { k: 'video', l: 'Videoaufzeichnungen', h: 'Absuche nach Kameras, Angaben einer Person, Sichtung vor Ort', felder: ['video'] },
    { k: 'lbm', l: 'Lichtbildmappe', h: 'Erstellt? Ja ist vorgewählt', felder: ['lbm'], vor: 'ja' }
  ];
  const P_ = k => PUNKTE.find(p => p.k === k) || null;
  /** Die gewählten Punkte in der Reihenfolge des Textes. */
  const gewaehlt = data => PUNKTE.filter(p => arr(data && data.fragen).includes(p.k));
  /** Punkt wählen oder abwählen (liefert true, wenn sich etwas geändert hat). Abwählen nimmt die Antworten mit. */
  function setzen(data, k, on) {
    const p = P_(k); if (!p || !data || typeof data !== 'object') return false;
    const war = arr(data.fragen).includes(k); if (war === !!on) return false;
    const F = arr(data.fragen).filter(x => x !== k && P_(x));
    if (on) { F.push(k); if (p.vor && !has(data[k])) data[k] = p.vor; }
    else for (const f of p.felder) delete data[f];
    if (F.length) data.fragen = PUNKTE.map(q => q.k).filter(x => F.includes(x)); else delete data.fragen;
    return true;
  }

  /* ======================= Text ======================= */
  const V_ = data => (data && data.video && typeof data.video === 'object' ? data.video : {});
  /** Wer angegeben hat, dass Aufzeichnungen bestehen: Person aus dem Vorgang („der Zeuge Müller“) oder frei eingetragen. */
  function videoWer(v) {
    const p = v.pers && typeof v.pers === 'object' ? v.pers : null;
    if (p && has(p.nom)) return { nom: str(p.nom), er: p.g === 'w' ? 'sie' : p.g === 'm' ? 'er' : '' };
    return { nom: str(v.persFrei), er: '' };
  }
  /** Videoaufzeichnungen: Absuche vor Ort (nur, wenn sie stattfand), danach die Angaben einer Person. */
  function videoText(data) {
    const v = V_(data), S = [];
    if (v.ab === 'ja') {
      S.push('Die Örtlichkeit wurde nach Geräten abgesucht, die das Geschehen videografisch aufgezeichnet haben könnten.');
      if (v.ger === 'ja') { S.push(`Ein solches Gerät wurde ${ohneEnde(v.wo) || '[wo?]'} festgestellt.`); if (has(v.dann)) S.push(satz(v.dann)); }
      else if (v.ger === 'nein') S.push('Solche Geräte konnten nicht festgestellt werden.');
      else S.push('[Wurde ein Gerät festgestellt?]');
    }
    if (v.ang) {
      // Mit Anrede aus dem Vorgang geht es mit „Er/Sie“ weiter; bei frei eingetragenen Personen ohne Pronomen im Passiv
      const w = videoWer(v), wer = w.nom || '[Wer?]', Er = w.er ? cap(w.er) : '';
      S.push(`${cap(wer)} gab an, dass Videoaufzeichnungen vorhanden seien.`);
      const wie = v.wie === 'nachfrage' ? 'auf Nachfrage bereitzuhalten' : v.wie === 'selbst' ? 'selbstständig einzureichen' : '';
      if (v.sichern) S.push(`${Er ? `${Er} sicherte zu` : 'Es wurde zugesichert'}, die Aufzeichnungen zu sichern${wie ? ` und ${wie}` : ''}.`);
      else if (wie) S.push(`${Er ? `${Er} erklärte` : 'Es wurde erklärt'}, die Aufzeichnungen ${wie}.`);
      if (v.sicht) {
        S.push(Er ? `${Er} konnte die Aufzeichnungen vor Ort aufrufen, sodass die eingesetzten Beamten sie sichten konnten.` : 'Die Aufzeichnungen konnten vor Ort aufgerufen und von den eingesetzten Beamten gesichtet werden.');
        if (v.rel === 'ja') {
          S.push('Hierbei konnten tatrelevante Feststellungen getroffen werden.');
          if (v.fotos === 'ja') S.push(v.mappe === 'ja' ? 'Von den Aufzeichnungen wurden Lichtbilder gefertigt, die der Lichtbildmappe beigefügt werden.' : v.mappe === 'nein' ? 'Von den Aufzeichnungen wurden Lichtbilder gefertigt; diese werden der Lichtbildmappe nicht beigefügt.' : 'Von den Aufzeichnungen wurden Lichtbilder gefertigt.');
          else if (v.fotos === 'nein') S.push('Lichtbilder von den Aufzeichnungen wurden nicht gefertigt.');
        } else if (v.rel === 'nein') S.push('Tatrelevante Feststellungen konnten hierbei nicht getroffen werden.');
        else S.push('[Tatrelevante Feststellungen auf den Aufzeichnungen?]');
      }
    }
    return S.join(' ');
  }
  /** Der Satz (oder Absatz) zu einem Punkt; '' = steht nicht im Text. */
  function punktText(data, k) {
    data = data || {};
    const v = data[k];
    if (k === 'nbf') return v === 'ja' ? `Eine Nahbereichsfahndung wurde durchgeführt${data.nbfErg === 'ohne' ? ' und verlief ohne Erfolg' : data.nbfErg === 'mit' ? ' und verlief erfolgreich' : ''}.` : v === 'nein' ? 'Eine Nahbereichsfahndung wurde nicht durchgeführt.' : '[Nahbereichsfahndung durchgeführt?]';
    if (k === 'spusi') {
      const durch = data.spusiDurch === 'k' ? 'das zuständige Kommissariat' : data.spusiDurch === 'fd' ? 'die zuständige Fachdienststelle' : 'das zuständige Kommissariat bzw. die zuständige Fachdienststelle';
      return v === 'ja' ? `Eine qualifizierte Spurensicherung erfolgte durch ${durch}. Hierzu wird ein gesonderter Bericht gefertigt.` : v === 'nein' ? 'Mangels verwertbarer Spurenlage oder zu erwartender Spuren wurde auf eine qualifizierte Spurensicherung verzichtet.' : '[Qualifizierte Spurensicherung erfolgt oder darauf verzichtet?]';
    }
    if (k === 'video') return videoText(data);
    if (k === 'lbm') return v === 'ja' ? 'Eine Lichtbildmappe wurde erstellt.' : v === 'nein' ? 'Eine Lichtbildmappe wurde nicht erstellt.' : '[Lichtbildmappe erstellt?]';
    return '';
  }
  /** Je Punkt eine Zeile, in der Reihenfolge des Katalogs. */
  const text = data => gewaehlt(data).map(p => punktText(data, p.k)).filter(Boolean).join('\n');
  /** Nummer des Abschnitts ('' = ohne). */
  const nrOf = data => (data && has(data.nr) && data.nr !== '-' ? cleanNr(data.nr) : '');
  const abschnitt = data => `${nrOf(data) ? nrOf(data) + ' ' : ''}Maßnahmen\n${text(data) || '[Noch nichts erfasst]'}`;

  /* ---------- Was noch fehlt ---------- */
  function offen(data) {
    data = data || {};
    const m = [], F = gewaehlt(data), v = V_(data);
    if (!F.length) m.push('Maßnahmen auswählen');
    for (const p of F) {
      if (p.k === 'video') {
        if (!v.ab && !v.ang) m.push('Videoaufzeichnungen: Absuche ja oder nein');
        if (v.ab === 'ja' && !v.ger) m.push('Videoaufzeichnungen: Gerät festgestellt?');
        if (v.ab === 'ja' && v.ger === 'ja' && !has(v.wo)) m.push('Videoaufzeichnungen: wo das Gerät festgestellt wurde');
        if (v.ang && !videoWer(v).nom) m.push('Videoaufzeichnungen: wer die Angaben gemacht hat');
        if (v.ang && v.sicht && !v.rel) m.push('Videoaufzeichnungen: tatrelevante Feststellungen?');
      } else if (!has(data[p.k])) m.push(p.l);
    }
    if (v.mappe === 'ja' && arr(data.fragen).includes('video') && data.lbm === 'nein') m.push('Lichtbildmappe: Lichtbilder der Videoaufzeichnungen sollen beigefügt werden');
    return m;
  }

  /* ---------- Listen-Texte ---------- */
  const title = () => 'Maßnahmen';
  function subtitle(data) { const F = gewaehlt(data); return F.length ? F.map(p => p.l).join(' · ') : 'noch nichts gewählt'; }
  function pill(data) { const F = gewaehlt(data), n = offen(data).length; return !F.length ? 'neu' : n ? `${n} offen` : 'bereit'; }

  /* ======================= Kontext aus dem Vorgang ======================= */
  /** „der Zeuge Müller“ – mit denselben Namensregeln wie in den Schilderungen (Verkehr: Kürzel, gleiche Nachnamen mit Vorname). */
  function werText(L, i, art) {
    const q = L[i] || {}, C = root.WSchild && root.WSchild.core;
    const name = C ? C.nameOf({ art, personen: L }, i) : str(q.nachname);
    if (C && C.ROLLE[q.rolle]) { const a = C.rolleArt({ rolle: q.rolle, g: q.g, ub: q.ub }); return q.rolle === 'ub' ? `${a} (${name})` : `${a} ${name}`; }
    return [q.g === 'w' ? 'Frau' : q.g === 'm' ? 'Herr' : '', name].filter(Boolean).join(' ');
  }
  /** Name als Schlüssel zum Wiederfinden – wie der Vorgang ihn bildet. */
  const nKey = q => `${str(q && q.vorname)}|${str(q && q.nachname)}`.toLocaleLowerCase('de').replace(/\s+/g, ' ');
  /** Verweis auf eine Person des Vorgangs: Kennung, Wortlaut im Satz, Name zum Wiederfinden, Anrede. */
  const persVon = (L, i, art) => ({ key: L[i].key, nom: werText(L, i, art), n: nKey(L[i]), ...(L[i].g ? { g: L[i].g } : {}) });
  /**
   * Die Person, die Angaben zu Videoaufzeichnungen gemacht hat, folgt ihrer Quelle im Vorgang: Wird dort der Name oder die
   * Rolle berichtigt, stimmt es auch hier. Steht die Person inzwischen in einem anderen Abschnitt (etwa nur noch in den
   * Schilderungen), wird sie über ihren Namen wiedergefunden. Fehlt sie ganz, bleibt der zuletzt übernommene Wortlaut stehen.
   * Liefert true, wenn sich etwas geändert hat.
   */
  function nimmt(data, ctx) {
    if (!data || typeof data !== 'object' || !ctx) return false;
    let ch = false;
    if (!same(data.art, ctx.art || undefined)) { if (ctx.art) data.art = ctx.art; else delete data.art; ch = true; }
    const v = V_(data), p = v.pers && typeof v.pers === 'object' ? v.pers : null;
    if (p && has(p.key)) {
      const L = arr(ctx.leute);
      let i = L.findIndex(q => q && q.key === p.key);
      if (i < 0) i = L.findIndex(q => q && q.alt && q.alt === p.key); // früher über den Namen verknüpft: auf die feste Kennung umstellen
      if (i < 0 && has(p.n)) i = L.findIndex(q => q && nKey(q) === p.n); // dieselbe Person, inzwischen aus einem anderen Abschnitt
      if (i >= 0) { const neu = persVon(L, i, ctx.art); if (!same(neu, p)) { v.pers = neu; ch = true; } }
    }
    return ch;
  }

  /* ======================= Maske ======================= */
  /*
   * Folien – je Seite ein Thema, gewechselt wird nur über „Zurück / Weiter“:
   *   'a'      Nahbereichsfahndung und Spurensicherung   (nur, wenn eines davon gewählt ist)
   *   'video'  Videoaufzeichnungen                        (nur, wenn gewählt)
   *   'ende'   Lichtbildmappe (wenn gewählt) und „Fällt dir noch etwas ein?“ – hier lässt sich jeder Punkt nachträglich dazunehmen
   *   'done'   fertiger Text
   */
  const V = { id: null, s: 'ende', focus: '' };
  const $ = s => document.querySelector(s);
  const ICON_X = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ctxOf = api => (api && typeof api.ctx === 'function' ? api.ctx() : null);
  function folien(data) {
    const k = arr(data && data.fragen);
    return [...(k.includes('nbf') || k.includes('spusi') ? ['a'] : []), ...(k.includes('video') ? ['video'] : []), 'ende'];
  }
  function open(d) {
    const dt = (d && d.data) || {};
    V.id = d.id; V.focus = '';
    V.s = d.status === 'fertig' && gewaehlt(dt).length ? 'done' : folien(dt)[0];
  }
  const key = () => V.s;

  const seg = (pfad, cur, opts, jn = false) => `<div class="w-seg" role="group">${opts.map(([v, l]) => `<button type="button" class="w-opt${jn ? (v === 'ja' ? ' yes' : v === 'nein' ? ' no' : '') : ''}" data-sd="antw" data-p="${esc(pfad)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  const chips = (pfad, cur, opts) => `<div class="w-chips" role="group">${opts.map(([v, l]) => `<button type="button" class="chip" data-sd="antw" data-p="${esc(pfad)}" data-v="${esc(v)}" aria-pressed="${String(cur === v)}">${esc(l)}</button>`).join('')}</div>`;
  const tog = (pfad, on, l) => `<div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="${esc(pfad)}" aria-pressed="${String(!!on)}">${esc(l)}</button></div>`;
  const JN = [['ja', 'Ja'], ['nein', 'Nein']];
  /** Einzeiliges Feld, das mit dem Text mitwächst. */
  const textIn = (id, pfad, val, ph, max = 400) => `<textarea class="input es-ta" id="${id}" data-sk="${esc(pfad)}" data-single="1" rows="1" placeholder="${esc(ph)}" autocomplete="off" autocapitalize="off" spellcheck="true" enterkeyhint="done" maxlength="${max}">${esc(val || '')}</textarea>`;
  const grow = ta => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  /** Kopf einer Frage: die Frage und rechts ein kleines ✕, das den Punkt wieder herausnimmt. */
  const frageKopf = (p, frage) => `<div class="mn-kopf"><span class="w-lbl">${esc(frage)}</span><button type="button" class="icon-btn sm" data-sd="weg" data-v="${p.k}" aria-label="${esc(p.l)} nicht abfragen" title="Nicht abfragen">${ICON_X}</button></div>`;
  const imText = k => `<p class="sd-im mn-im">Im Text: <b data-live="s-${k}"></b></p>`;

  function nbfHtml(data) {
    const p = P_('nbf');
    return `<div class="w-q mn-frage" data-q="nbf">${frageKopf(p, 'Wurde eine Nahbereichsfahndung durchgeführt?')}${seg('nbf', data.nbf, JN, true)}${data.nbf === 'ja' ? `<div class="sd-sub"><span class="w-lbl">Ergebnis <i class="w-hint-i">(optional)</i></span>${chips('nbfErg', data.nbfErg, [['ohne', 'Ohne Erfolg'], ['mit', 'Mit Erfolg']])}</div>` : ''}${imText('nbf')}</div>`;
  }
  function spusiHtml(data) {
    const p = P_('spusi');
    return `<div class="w-q mn-frage" data-q="spusi">${frageKopf(p, 'Qualifizierte Spurensicherung?')}${seg('spusi', data.spusi, [['ja', 'Erfolgt'], ['nein', 'Verzichtet']])}${data.spusi === 'ja' ? `<div class="sd-sub"><span class="w-lbl">Durch wen? <i class="w-hint-i">(optional – sonst stehen beide im Text)</i></span>${chips('spusiDurch', data.spusiDurch, [['k', 'Zuständiges Kommissariat'], ['fd', 'Zuständige Fachdienststelle']])}</div>` : ''}${imText('spusi')}</div>`;
  }
  function lbmHtml(data) {
    const p = P_('lbm');
    return `<div class="w-q mn-frage" data-q="lbm">${frageKopf(p, 'Wurde eine Lichtbildmappe erstellt?')}${seg('lbm', data.lbm, JN, true)}${imText('lbm')}</div>`;
  }
  /** Personen des Vorgangs zum Antippen: „Frau Müller“ mit Rolle. */
  const personName = q => [q.g === 'w' ? 'Frau' : q.g === 'm' ? 'Herr' : '', str(q.vorname), str(q.nachname)].filter(Boolean).join(' ');
  const rolleL = q => { const C = root.WSchild && root.WSchild.core; const l = C && q ? C.rolleLabel(q) : ''; return l === 'Rolle offen' ? '' : l; };
  function videoHtml(data, api) {
    const v = V_(data), p = P_('video'), ctx = ctxOf(api), L = arr(ctx && ctx.leute).filter(q => q && has(q.nachname));
    const key0 = v.pers && v.pers.key;
    // Die gewählte Person steht nicht mehr im Vorgang: Ihr Wortlaut bleibt im Text – hier lässt er sich wieder herausnehmen
    const fort = key0 && !L.some(q => q.key === key0) ? `<button type="button" class="chip vg-pchip" data-sd="vpers" data-v="${esc(key0)}" aria-pressed="true">${esc(cap(str(v.pers.nom) || 'Person'))}<small>nicht mehr im Vorgang</small></button>` : '';
    let ab = '';
    if (v.ab === 'ja') {
      ab = `<div class="sd-sub"><span class="w-lbl">Wurde ein Gerät festgestellt? <i class="w-req" title="Pflicht">•</i></span>${seg('video.ger', v.ger, JN)}
        ${v.ger === 'ja' ? `<div class="sd-inl" data-q="vwo"><label class="w-hint" for="mnWo">„Ein solches Gerät wurde <b>…</b> festgestellt.“ <i class="w-req" title="Pflicht">•</i></label>${textIn('mnWo', 'video.wo', v.wo, 'an der Fassade des gegenüberliegenden Wohn- und Geschäftshauses')}</div>
        <div class="sd-inl" data-q="vdann"><label class="w-lbl" for="mnDann">Was geschah daraufhin? <i class="w-hint-i">(ganze Sätze, optional)</i></label><textarea class="input" id="mnDann" data-sk="video.dann" rows="3" placeholder="Der Inhaber des Geschäfts wurde angetroffen und zu den Aufzeichnungen befragt." autocomplete="off" autocapitalize="sentences" spellcheck="true" maxlength="1500">${esc(v.dann || '')}</textarea></div>` : ''}</div>`;
    }
    let ang = '';
    if (v.ang) {
      const wer = L.length || fort ? `<div class="w-chips">${L.map(q => `<button type="button" class="chip vg-pchip" data-sd="vpers" data-v="${esc(q.key)}" aria-pressed="${String(key0 === q.key)}">${esc(personName(q))}${rolleL(q) ? `<small>${esc(rolleL(q))}</small>` : ''}</button>`).join('')}${fort}</div>` : '';
      const frei = key0 ? '' : `<div class="sd-inl"><label class="w-hint" for="mnPers">${L.length ? 'Oder jemand anderes – so, wie es im Satz stehen soll:' : 'So, wie es im Satz stehen soll:'}</label>${textIn('mnPers', 'video.persFrei', v.persFrei, 'der Inhaber des Kiosks', 160)}</div>`;
      ang = `<div class="sd-sub"><span class="w-lbl">Wer? <i class="w-req" title="Pflicht">•</i></span>${wer}${frei}
        <div class="sd-inl" data-q="vsich"><span class="w-lbl">Was wurde zugesagt?</span><div class="w-chips"><button type="button" class="chip" data-sd="tog" data-p="video.sichern" aria-pressed="${String(!!v.sichern)}">Sichert die Aufzeichnungen</button><button type="button" class="chip" data-sd="antw" data-p="video.wie" data-v="nachfrage" aria-pressed="${String(v.wie === 'nachfrage')}">Hält sie auf Nachfrage bereit</button><button type="button" class="chip" data-sd="antw" data-p="video.wie" data-v="selbst" aria-pressed="${String(v.wie === 'selbst')}">Reicht sie selbstständig ein</button></div></div>
        <div class="sd-inl" data-q="vsicht"><span class="w-lbl">Vor Ort</span>${tog('video.sicht', v.sicht, 'Aufzeichnungen aufgerufen und von uns gesichtet')}</div>
        ${v.sicht ? `<div class="sd-inl" data-q="vrel"><span class="w-lbl">Tatrelevante Feststellungen darauf? <i class="w-req" title="Pflicht">•</i></span>${seg('video.rel', v.rel, JN)}</div>` : ''}
        ${v.sicht && v.rel === 'ja' ? `<div class="sd-inl" data-q="vfotos"><span class="w-lbl">Lichtbilder von den Aufzeichnungen gefertigt?</span>${seg('video.fotos', v.fotos, JN)}</div>` : ''}
        ${v.sicht && v.rel === 'ja' && v.fotos === 'ja' ? `<div class="sd-inl" data-q="vmappe"><span class="w-lbl">Der Lichtbildmappe beigefügt?</span>${seg('video.mappe', v.mappe, JN)}${v.mappe === 'ja' ? '<p class="w-hint sd-hint">Die Lichtbildmappe steht damit als erstellt im Bericht.</p>' : ''}</div>` : ''}</div>`;
    }
    return `<div class="w-q mn-frage" data-q="vab">${frageKopf(p, 'Wurde vor Ort nach Geräten gesucht, die das Geschehen aufgezeichnet haben könnten?')}${seg('video.ab', v.ab, JN)}${v.ab === 'nein' ? '<p class="w-hint sd-hint">Bei „Nein“ steht dazu nichts im Text.</p>' : ''}${ab}</div>
      <div class="w-q mn-frage" data-q="vang"><span class="w-lbl">Angaben einer Person</span>${tog('video.ang', v.ang, 'Jemand gab an, dass Videoaufzeichnungen bestehen')}${ang}</div>
      <div class="w-q pb-im" data-q="vim"><span class="w-mk-gt">So steht es im Text</span><p class="pb-satz" data-live="s-video"></p></div>`;
  }
  /** „Fällt dir noch etwas ein?“ – alles, was noch nicht abgefragt wird, mit „+“. */
  function mehrHtml(data) {
    const rest = PUNKTE.filter(p => !arr(data.fragen).includes(p.k)); if (!rest.length) return '';
    const leer = !gewaehlt(data).length;
    return `<div class="w-q" data-q="mehr"><div class="sd-add"><span class="w-lbl">${leer ? 'Was soll abgefragt werden?' : 'Fällt dir noch etwas ein?'}</span><div class="zs-list">${rest.map(p => `<button type="button" class="sd-add-b" data-sd="dazu" data-v="${p.k}"><i aria-hidden="true">+</i><span>${esc(p.l)}<small>${esc(p.h)}</small></span></button>`).join('')}</div></div></div>`;
  }
  function folieHtml(d, api) {
    const data = d.data, F = folien(data); if (!F.includes(V.s)) V.s = F[F.length - 1];
    const k = F.indexOf(V.s), last = k === F.length - 1, n = gewaehlt(data).length;
    const fuss = api.fuss({ back: k ? { attr: 'data-sd="pf" data-v="-1"' } : null, next: last ? (n ? { label: 'Fertig', attr: 'data-sd="alle"', ok: true } : null) : { attr: 'data-sd="pf" data-v="1"' } });
    const kopf = (titel, lead) => api.kopf({ pos: [k + 1, F.length], titel, lead });
    if (V.s === 'a') return `${kopf('Maßnahmen', 'Was du bei den Zusatzbausteinen gewählt hast – jede Antwort wird ein Satz.')}<div class="w-grid sd-grid">${arr(data.fragen).includes('nbf') ? nbfHtml(data) : ''}${arr(data.fragen).includes('spusi') ? spusiHtml(data) : ''}</div>${fuss}`;
    if (V.s === 'video') return `${kopf('Videoaufzeichnungen', 'Nur was zutrifft – der Rest bleibt aus dem Text.')}<div class="w-grid sd-grid">${videoHtml(data, api)}</div>${fuss}`;
    const lbm = arr(data.fragen).includes('lbm');
    return `${kopf(lbm ? 'Lichtbildmappe' : n ? 'Noch etwas?' : 'Maßnahmen', lbm ? 'Der letzte Punkt im Bericht.' : n ? '' : 'Antippen, was im Bericht stehen soll – gefragt wird nur das.')}<div class="w-grid sd-grid">${lbm ? lbmHtml(data) : ''}${mehrHtml(data)}</div>${fuss}`;
  }

  const nrHint = nr => (nr ? `Überschrift „${nr} Maßnahmen“ – ohne Punkt hinter der Zahl.` : 'Ohne Nummer steht die Überschrift ohne Gliederungsziffer da.');
  /** Abschluss: der fertige Text, groß „Kopieren“, unten der Weg weiter. */
  function doneHtml(d, api) {
    const data = d.data, nr = nrOf(data), txt = abschnitt(data), miss = offen(data), ctx = ctxOf(api);
    const nrQ = ctx && ctx.nrAuto ? ''
      : `<div class="w-q" data-q="nr"><label class="w-lbl" for="mnNr">Welche Nummer haben die Maßnahmen in deiner Anzeige?</label><div class="sd-nr"><input class="input mono" id="mnNr" data-sk="nr" value="${esc(nr)}" placeholder="z. B. 5" inputmode="decimal" autocomplete="off" maxlength="8"><div class="w-chips">${['4', '5', '6', '7'].map(n => `<button type="button" class="chip" data-sd="nr" data-v="${n}" aria-pressed="${String(nr === n)}">${n}</button>`).join('')}<button type="button" class="chip w-recent" data-sd="nr" data-v="-" aria-pressed="${String(!nr)}">ohne</button></div></div><p class="w-hint sd-hint" data-live="nrhint">${esc(nrHint(nr))}</p></div>`;
    return `${api.kopf({ fertig: miss.length ? `Fertig · ${miss.length} offen` : 'Fertig', offen: miss.length > 0, titel: 'So steht es im Text' })}
      <div class="w-grid sd-grid">
        ${miss.length ? `<div class="w-q"><div class="w-warn fo-warn"><span>Noch offen: ${esc(miss.join(' · '))}</span><button type="button" class="btn btn-ghost btn-sm" data-sd="go">Nachtragen</button></div></div>` : ''}
        <div class="w-q"><div class="w-out"><pre class="w-out-t" data-live="text">${esc(txt)}</pre></div></div>
        ${nrQ}
      </div>
      <button type="button" class="btn btn-light fo-wide" data-sd="copy">Text kopieren</button>
      ${api.fein()}
      ${api.fuss({ back: { label: 'Bearbeiten', attr: 'data-sd="go"' }, next: api.danach() })}`;
  }

  function render(d, api) {
    if (V.id !== d.id) open(d);
    if (!d.data || typeof d.data !== 'object') d.data = {};
    if (nimmt(d.data, ctxOf(api))) api.persist(false);
    if (V.s === 'done' && !gewaehlt(d.data).length) V.s = 'ende';
    return V.s === 'done' ? doneHtml(d, api) : folieHtml(d, api);
  }
  /** Teile der Maske aktualisieren, ohne neu zu zeichnen (der Fokus bleibt im Feld). */
  function live(api) {
    const data = api.d.data, host = $('#wMain'); if (!host) return;
    const put = (k, t) => host.querySelectorAll(`[data-live="${k}"]`).forEach(n => { n.textContent = t; });
    for (const p of PUNKTE) put('s-' + p.k, punktText(data, p.k) || (p.k === 'video' ? 'Noch nichts, das in den Text gehört.' : ''));
    put('text', abschnitt(data));
    if (V.s === 'done') { const nr = nrOf(data); put('nrhint', nrHint(nr)); host.querySelectorAll('[data-sd="nr"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === '-' ? !nr : c.dataset.v === nr))); }
  }
  function mounted(host, api) {
    document.querySelectorAll('#wMain textarea.es-ta').forEach(grow);
    live(api);
    if (V.focus) { const el = document.getElementById(V.focus); V.focus = ''; if (el) { el.focus({ preventScroll: true }); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (e) { /* egal */ } } }
  }

  /* ======================= Ereignisse ======================= */
  /** Antworten, die an einer anderen hängen, verschwinden mit ihr – im Text steht nur, was auch sichtbar gefragt wurde. */
  function aufraeumen(data) {
    if (data.nbf !== 'ja') delete data.nbfErg;
    if (data.spusi !== 'ja') delete data.spusiDurch;
    const v = data.video; if (!v || typeof v !== 'object') return;
    if (v.ab !== 'ja') { delete v.ger; delete v.wo; delete v.dann; }
    if (v.ger !== 'ja') { delete v.wo; delete v.dann; }
    if (!v.ang) for (const k of ['pers', 'persFrei', 'sichern', 'wie', 'sicht', 'rel', 'fotos', 'mappe']) delete v[k];
    if (!v.sicht) for (const k of ['rel', 'fotos', 'mappe']) delete v[k];
    if (v.rel !== 'ja') { delete v.fotos; delete v.mappe; }
    if (v.fotos !== 'ja') delete v.mappe;
    if (!Object.keys(v).length) delete data.video;
  }
  function fertig(api) {
    const d = api.d;
    if (!gewaehlt(d.data).length) { api.toast('Noch nichts gewählt – erst antippen, was abgefragt werden soll.'); return; }
    const miss = offen(d.data);
    d.status = 'fertig'; V.s = 'done';
    api.persist(true); api.render();
    if (miss.length) api.toast(`Fertig – noch offen: ${miss.length} ${miss.length === 1 ? 'Punkt' : 'Punkte'} (im Text als [Platzhalter]).`);
  }
  function click(e, api) {
    const b = e.target.closest && e.target.closest('[data-sd]'); if (!b || !b.closest('#wMain')) return false;
    if (b.disabled) return true;
    const d = api.d, data = d.data, a = b.dataset.sd, v = b.dataset.v, pfad = b.dataset.p;
    const save = () => { aufraeumen(data); api.persist(false); api.render(); };
    switch (a) {
      case 'pf': { const F = folien(data), k = Math.max(0, Math.min(F.length - 1, F.indexOf(V.s) + Number(v))); V.s = F[k]; api.render(); return true; }
      case 'go': V.s = folien(data)[0]; api.render(); return true;
      /* eine Antwort – ein zweiter Tipp nimmt sie zurück */
      case 'antw': {
        setPath(data, pfad, getPath(data, pfad) === v ? undefined : v);
        // Lichtbilder kommen in die Lichtbildmappe: dann gibt es sie auch – der Punkt wird mit „Ja“ dazugenommen
        if (pfad === 'video.mappe' && getPath(data, pfad) === 'ja') { setzen(data, 'lbm', true); data.lbm = 'ja'; }
        save(); return true;
      }
      case 'tog': setPath(data, pfad, getPath(data, pfad) ? undefined : true); save(); return true;
      case 'vpers': {
        const L = arr((ctxOf(api) || {}).leute), i = L.findIndex(q => q && q.key === v), vd = data.video && typeof data.video === 'object' ? data.video : (data.video = {});
        if (vd.pers && vd.pers.key === v) delete vd.pers; // auch, wenn die Person nicht mehr im Vorgang steht
        else if (i < 0) return true;
        else { vd.pers = persVon(L, i, data.art); delete vd.persFrei; }
        save(); return true;
      }
      case 'dazu': { if (d.status === 'fertig') d.status = 'entwurf'; setzen(data, v, true); V.s = v === 'video' ? 'video' : v === 'lbm' ? 'ende' : 'a'; save(); return true; }
      case 'weg': { setzen(data, v, false); save(); return true; }
      case 'nr': { data.nr = v; api.persist(false); live(api); const inp = $('#mnNr'); if (inp) inp.value = nrOf(data); return true; }
      case 'copy': api.copy(abschnitt(data), b); return true;
      case 'alle': fertig(api); return true;
      default: return false;
    }
  }
  function input(e, api) {
    const el = e.target; if (!el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk) return false;
    if (el.dataset.single && /\n/.test(el.value)) { const at = el.selectionStart; el.value = el.value.replace(/\s*\n\s*/g, ' '); try { el.setSelectionRange(at, at); } catch (er) { /* egal */ } }
    if (el.classList.contains('es-ta')) grow(el);
    if (el.dataset.sk === 'nr') api.d.data.nr = cleanNr(el.value) || '-';
    else setPath(api.d.data, el.dataset.sk, el.value);
    api.persist(false); live(api);
    return true;
  }
  function keydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.metaKey || e.ctrlKey || !el.closest || !el.closest('#wMain') || !el.dataset || !el.dataset.sk || (el.tagName === 'TEXTAREA' && !el.dataset.single)) return false;
    e.preventDefault(); el.blur();
    return true;
  }
  /** ⌘/Strg + Enter: der eine nächste Schritt der Folie – wie der Knopf unten rechts. */
  function submit() { const b = $('#wMain .fo-nav .fo-next'); if (b) b.click(); }

  root.WMass = Object.freeze({
    id: 'massnahmen', name: 'Maßnahmen', short: 'Maßnahmen', kurz: 'MN', noNew: true,
    desc: 'Letzter Abschnitt: Nahbereichsfahndung, qualifizierte Spurensicherung, Videoaufzeichnungen, Lichtbildmappe',
    intro: 'Fragt am Ende nur, was bei den Zusatzbausteinen gewählt wurde · jede Antwort wird ein Satz',
    labels: { newBtn: 'Maßnahmen', bericht: 'Maßnahmen' },
    steps: [],
    title, subtitle, pill,
    plain: abschnitt,
    text: data => [[nrOf(data), 'Maßnahmen', text(data), '']],
    preview: () => '', kurzText: () => '', fahndung: () => '', offen, personalien: () => '',
    screen: { open, render, mounted, click, input, keydown, submit, key },
    kontext: { nimmt },
    /* Zusatzbausteine (Untermenü im Vorgang): werden am Ende abgefragt */
    zusatz: {
      wann: 'ende',
      punkte: PUNKTE.map(p => ({ k: p.k, l: p.l, h: p.h })),
      hat: (data, k) => arr(data && data.fragen).includes(k),
      setzen, leer: data => !gewaehlt(data).length
    },
    core: { PUNKTE, gewaehlt, setzen, punktText, videoText, text, abschnitt, nrOf, offen, folien, nimmt, werText, aufraeumen }
  });
})(typeof window !== 'undefined' ? window : globalThis);
