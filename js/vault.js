/*
 * Workoholic · Tresor
 * ---------------------------------------------------------------
 * Ende-zu-Ende-Verschlüsselung im Browser. Klartext verlässt nie das Gerät.
 *
 *  Master-Passwort ──Argon2id (64 MiB, 3 Durchläufe)──▶ KEK
 *  Zufälliger 256-Bit-Datenschlüssel (DEK), verpackt mit KEK (AES-256-GCM)
 *  Wiederherstellungsschlüssel (160 Bit) ──HKDF-SHA-256──▶ zweite Verpackung des DEK
 *  Daten ──AES-256-GCM mit DEK, 96-Bit-Zufalls-IV pro Speichern, auf 4-KB-Blöcke aufgefüllt──▶ Chiffretext
 *
 * Alle Parameter sind über "additional authenticated data" an den Chiffretext gebunden;
 * Manipulationen fallen beim Entschlüsseln auf.
 */
(function () {
  'use strict';

  const subtle = crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const FORMAT = 'workoholic-vault';
  const KDF = Object.freeze({ name: 'argon2id', m: 65536, t: 3, p: 1, len: 32 });
  const PAD = 4096;
  const AAD = { data: `${FORMAT}/v1/data`, device: `${FORMAT}/v1/device`, keys: `${FORMAT}/v1/keys` };

  /* ---------- Bytes & Base64 ---------- */
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(s) {
    const bin = atob(String(s).replace(/\s/g, ''));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  /* ---------- Schlüsselableitung ---------- */
  function err(code, message) { const e = new Error(message || code); e.code = code; return e; }

  async function kekFromPassword(password, kdf) {
    if (!window.hashwasm || typeof hashwasm.argon2id !== 'function') throw err('argon2-missing', 'Argon2 konnte nicht geladen werden.');
    if (kdf.name !== 'argon2id' || kdf.m < 19456 || kdf.t < 2 || kdf.len !== 32) throw err('weak-kdf', 'Unsichere Tresor-Parameter.');
    const raw = await hashwasm.argon2id({
      password: String(password).normalize('NFC'),
      salt: unb64(kdf.salt),
      parallelism: kdf.p, iterations: kdf.t, memorySize: kdf.m, hashLength: kdf.len,
      outputType: 'binary'
    });
    try { return await subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
    finally { raw.fill(0); }
  }
  async function kekFromRecovery(bytes, saltB64) {
    const ikm = await subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: unb64(saltB64), info: enc.encode(`${FORMAT}/v1/recovery`) },
      ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const importDek = raw => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

  /* ---------- AES-256-GCM ---------- */
  async function seal(key, bytes, aad) {
    const iv = rand(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad), tagLength: 128 }, key, bytes));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function unseal(key, box, aad) {
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv), additionalData: enc.encode(aad), tagLength: 128 }, key, unb64(box.ct)));
  }
  const aadPw = k => `${FORMAT}/v1/pw|${k.name}|${k.salt}|${k.m}|${k.t}|${k.p}|${k.len}`;
  const aadRk = salt => `${FORMAT}/v1/rk|${salt}`;

  function padded(obj) {
    const bytes = enc.encode(JSON.stringify(obj));
    const out = new Uint8Array(Math.ceil((bytes.length + 1) / PAD) * PAD).fill(0x20); // JSON ignoriert Leerzeichen am Ende
    out.set(bytes);
    bytes.fill(0);
    return out;
  }
  async function encryptJson(dek, obj, purpose = 'data') { return seal(dek, padded(obj), AAD[purpose]); }
  async function decryptJson(dek, box, purpose = 'data') {
    const bytes = await unseal(dek, box, AAD[purpose]);
    try { return JSON.parse(dec.decode(bytes)); } finally { bytes.fill(0); }
  }

  /* ---------- Dateien (binär, auf 16-KB-Blöcke aufgefüllt, an die Datei-ID gebunden) ---------- */
  const FILE_PAD = 16384;
  const aadFile = id => `${FORMAT}/v1/file|${id}`;
  async function encryptFile(dek, id, bytes) {
    const total = Math.ceil((bytes.length + 4) / FILE_PAD) * FILE_PAD;
    const buf = new Uint8Array(total);
    new DataView(buf.buffer).setUint32(0, bytes.length);
    buf.set(bytes, 4);
    const iv = rand(12);
    try {
      const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aadFile(id)), tagLength: 128 }, dek, buf));
      return { iv, ct };
    } finally { buf.fill(0); }
  }
  async function decryptFile(dek, id, iv, ct) {
    const buf = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aadFile(id)), tagLength: 128 }, dek, ct));
    const len = new DataView(buf.buffer).getUint32(0);
    if (len > buf.length - 4) throw err('bad-file', 'Datei beschädigt.');
    return buf.slice(4, 4 + len);
  }
  /** Für den Versand: IV (12 Byte) + Chiffretext als Base64. */
  const packFile = (iv, ct) => { const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return b64(out); };
  const unpackFile = text => { const u = unb64(text); return { iv: u.slice(0, 12), ct: u.slice(12) }; };

  /* ---------- Wiederherstellungsschlüssel (Crockford Base32) ---------- */
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function toB32(u8) {
    let bits = 0, val = 0, out = '';
    for (const b of u8) { val = ((val << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
    if (bits > 0) out += B32[(val << (5 - bits)) & 31];
    return out;
  }
  function fromB32(s) {
    const clean = String(s).toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    let bits = 0, val = 0; const out = [];
    for (const c of clean) {
      const i = B32.indexOf(c); if (i < 0) throw err('bad-recovery', 'Ungültiges Zeichen im Wiederherstellungsschlüssel.');
      val = ((val << 5) | i) & 0xffff; bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(out);
  }
  const fmtRecovery = s => s.match(/.{1,4}/g).join('-');

  /* ---------- Echtheit des Schlüsselblocks ----------
   * Der Schlüsselblock (KDF-Parameter, verpackte Schlüssel, Zeitstempel) wird mit dem Datenschlüssel
   * authentisiert. Ein Gerät übernimmt einen geänderten Block nur, wenn er von jemandem stammt,
   * der den Datenschlüssel besitzt – also von einem deiner entsperrten Geräte.
   */
  async function keysDigest(e) {
    return new Uint8Array(await subtle.digest('SHA-256', enc.encode(JSON.stringify([e.kts, e.kdf, e.keys.pw, e.keys.rk || null]))));
  }
  async function tagKeys(dek, e) {
    e.keys = { pw: e.keys.pw, rk: e.keys.rk, tag: await seal(dek, await keysDigest(e), AAD.keys) };
    return e;
  }
  async function verifyKeys(dek, e) {
    if (!e || !e.keys || !e.keys.tag) return false;
    try {
      const got = await unseal(dek, e.keys.tag, AAD.keys), want = await keysDigest(e);
      return got.length === want.length && got.every((b, i) => b === want[i]);
    } catch (x) { return false; }
  }

  /* ---------- Tresor ---------- */
  async function wrapKeys(raw, password, recovery) {
    const kdf = { ...KDF, salt: b64(rand(16)) };
    const keys = { pw: await seal(await kekFromPassword(password, kdf), raw, aadPw(kdf)) };
    let recoveryKey = null;
    if (recovery === true) {
      const rkBytes = rand(20), salt = b64(rand(16));
      keys.rk = { salt, ...(await seal(await kekFromRecovery(rkBytes, salt), raw, aadRk(salt))) };
      recoveryKey = fmtRecovery(toB32(rkBytes));
      rkBytes.fill(0);
    } else if (recovery) keys.rk = recovery; // bestehende Verpackung übernehmen
    return { kdf, keys, recoveryKey };
  }

  /** Neuer Tresor: liefert Umschlag, Datenschlüssel und den einmalig anzuzeigenden Wiederherstellungsschlüssel. */
  async function create(password, data) {
    const raw = rand(32);
    try {
      const { kdf, keys, recoveryKey } = await wrapKeys(raw, password, true);
      const dek = await importDek(raw);
      const env = await tagKeys(dek, { format: FORMAT, v: 1, kts: Date.now(), kdf, keys, data: await encryptJson(dek, data) });
      return { env, dek, recoveryKey };
    } finally { raw.fill(0); }
  }

  async function rawFromPassword(kdf, keys, password) {
    const kek = await kekFromPassword(password, kdf);
    try { return await unseal(kek, keys.pw, aadPw(kdf)); }
    catch (e) { throw err('wrong-password', 'Falsches Passwort.'); }
  }

  /** Entsperren mit Master-Passwort. */
  async function unlock(env, password) {
    const raw = await rawFromPassword(env.kdf, env.keys, password);
    try {
      const dek = await importDek(raw);
      return { dek, data: await decryptJson(dek, env.data) };
    } finally { raw.fill(0); }
  }

  /** Entsperren mit Wiederherstellungsschlüssel und sofort neues Master-Passwort setzen. */
  async function recover(env, recoveryKey, newPassword) {
    if (!env.keys.rk) throw err('no-recovery', 'Für diesen Tresor gibt es keinen Wiederherstellungsschlüssel.');
    const bytes = fromB32(recoveryKey);
    if (bytes.length !== 20) throw err('bad-recovery', 'Der Wiederherstellungsschlüssel ist unvollständig.');
    let raw;
    try { raw = await unseal(await kekFromRecovery(bytes, env.keys.rk.salt), env.keys.rk, aadRk(env.keys.rk.salt)); }
    catch (e) { throw err('bad-recovery', 'Wiederherstellungsschlüssel passt nicht.'); }
    finally { bytes.fill(0); }
    try {
      const dek = await importDek(raw);
      const data = await decryptJson(dek, env.data);
      const w = await wrapKeys(raw, newPassword, env.keys.rk);
      const next = await tagKeys(dek, { ...env, kdf: w.kdf, keys: w.keys, kts: Date.now() });
      return { dek, data, env: next };
    } finally { raw.fill(0); }
  }

  /** Master-Passwort ändern (und optional neuen Wiederherstellungsschlüssel erzeugen). */
  async function rekey(env, currentPassword, newPassword, newRecovery = false) {
    const raw = await rawFromPassword(env.kdf, env.keys, currentPassword);
    try {
      const w = await wrapKeys(raw, newPassword, newRecovery ? true : env.keys.rk);
      const next = await tagKeys(await importDek(raw), { ...env, kdf: w.kdf, keys: w.keys, kts: Date.now() });
      return { env: next, recoveryKey: w.recoveryKey };
    } finally { raw.fill(0); }
  }

  /** Text, wie er gespeichert, synchronisiert und exportiert wird. */
  function serialize(e) { return JSON.stringify({ format: e.format, v: e.v, kts: e.kts, kdf: e.kdf, keys: e.keys, data: e.data }); }
  function parse(text) {
    const e = typeof text === 'string' ? JSON.parse(text) : text;
    const ok = e && e.format === FORMAT && e.v === 1 && e.kdf && e.keys && e.keys.pw && e.data && e.data.iv && e.data.ct;
    if (!ok) throw err('bad-vault', 'Keine gültige Tresor-Datei.');
    return e;
  }

  /* ---------- Passwortstärke (grobe Schätzung, kein Ersatz für Zufall) ---------- */
  function strength(pw) {
    const s = String(pw || '');
    if (!s) return { bits: 0, level: 0, label: '' };
    let pool = 0;
    if (/[a-zäöüß]/.test(s)) pool += 30;
    if (/[A-ZÄÖÜ]/.test(s)) pool += 29;
    if (/\d/.test(s)) pool += 10;
    if (/[^A-Za-zÄÖÜäöüß\d]/.test(s)) pool += 33;
    const uniq = new Set(s).size;
    let bits = Math.log2(Math.max(pool, 2)) * s.length * Math.min(1, uniq / Math.max(4, s.length * 0.6));
    if (/^(.)\1+$/.test(s) || /(0123|1234|2345|3456|4567|5678|6789|abcd|qwert|asdf|passw|passwort|password)/i.test(s)) bits *= 0.5;
    const level = s.length < 12 ? 0 : bits < 55 ? 1 : bits < 75 ? 2 : bits < 100 ? 3 : 4;
    const label = ['Zu kurz – mindestens 12 Zeichen', 'Schwach', 'Okay', 'Stark', 'Sehr stark'][level];
    return { bits: Math.round(bits), level, label };
  }

  /* ---------- GitHub als Speicher für den Chiffretext ---------- */
  function GitHub(cfg) {
    const base = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
    const path = String(cfg.path || 'workoholic.vault').split('/').map(encodeURIComponent).join('/');
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${cfg.token}`, 'X-GitHub-Api-Version': '2022-11-28' };

    async function req(method, url, body) {
      let r;
      try {
        r = await fetch(url, {
          method, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
          headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) { throw err('offline', 'Keine Verbindung zu GitHub.'); }
      let json = null;
      try { json = await r.json(); } catch (e) { /* leer */ }
      if (r.ok) return json;
      const msg = (json && json.message) || `HTTP ${r.status}`;
      if (r.status === 401) throw err('auth', 'Token ungültig oder abgelaufen.');
      if (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0') throw err('ratelimit', 'GitHub-Limit erreicht – später erneut.');
      if (r.status === 403) throw err('forbidden', 'Token hat keine Schreibrechte für dieses Repo.');
      if (r.status === 404) throw err('notfound', msg);
      if (r.status === 409 || (r.status === 422 && /sha/i.test(msg))) throw err('conflict', msg);
      throw err('http', msg);
    }
    const refQ = cfg.branch ? `?ref=${encodeURIComponent(cfg.branch)}` : '';
    const encPath = p => String(p).split('/').map(encodeURIComponent).join('/');

    return {
      async repoInfo() {
        try { return await req('GET', base); }
        catch (e) { if (e.code === 'notfound') throw err('norepo', 'Repo nicht gefunden – oder der Token hat keinen Zugriff darauf.'); throw e; }
      },
      /** Liefert {sha, text} oder null, wenn die Datei (noch) nicht existiert. */
      async get() {
        let j;
        try { j = await req('GET', `${base}/contents/${path}${refQ}`); }
        catch (e) { if (e.code === 'notfound') return null; throw e; }
        if (!j || Array.isArray(j) || j.type !== 'file') throw err('http', 'Pfad ist keine Datei.');
        let content = j.content;
        if (!content && j.size) content = (await req('GET', `${base}/git/blobs/${j.sha}`)).content;
        return { sha: j.sha, text: atob(String(content || '').replace(/\s/g, '')) };
      },
      /** Schreibt nur, wenn die entfernte Datei noch `sha` hat – sonst Konflikt. */
      async put(text, sha) {
        const body = { message: 'tresor', content: btoa(text) };
        if (sha) body.sha = sha;
        if (cfg.branch) body.branch = cfg.branch;
        const j = await req('PUT', `${base}/contents/${path}`, body);
        return j.content.sha;
      },
      /** Beliebige Datei im Repo (für die Ablage): {sha, text} oder null. */
      async getPath(p) {
        let j;
        try { j = await req('GET', `${base}/contents/${encPath(p)}${refQ}`); }
        catch (e) { if (e.code === 'notfound') return null; throw e; }
        if (!j || Array.isArray(j) || j.type !== 'file') return null;
        let content = j.content;
        if (!content && j.size) content = (await req('GET', `${base}/git/blobs/${j.sha}`)).content;
        return { sha: j.sha, text: String(content || '').replace(/\s/g, '') };
      },
      async putPath(p, b64text, sha) {
        const body = { message: 'tresor', content: b64text };
        if (sha) body.sha = sha;
        if (cfg.branch) body.branch = cfg.branch;
        return (await req('PUT', `${base}/contents/${encPath(p)}`, body)).content.sha;
      },
      async deletePath(p, sha) {
        const body = { message: 'tresor', sha };
        if (cfg.branch) body.branch = cfg.branch;
        await req('DELETE', `${base}/contents/${encPath(p)}`, body);
      },
      /** Inhalt eines Ordners: [{name, sha, size}] (leer, wenn es ihn nicht gibt). */
      async listDir(p) {
        try { const j = await req('GET', `${base}/contents/${encPath(p)}${refQ}`); return Array.isArray(j) ? j.map(x => ({ name: x.name, sha: x.sha, size: x.size })) : []; }
        catch (e) { if (e.code === 'notfound') return []; throw e; }
      },
      /**
       * Ersetzt den Verlauf des Tresor-Repos durch einen einzigen Commit, damit sich keine
       * alten Chiffretexte ansammeln. Läuft nur, wenn das Repo ausschließlich den Tresor
       * (plus README/.gitignore/LICENSE) enthält und niemand seit `expectedSha` geschrieben hat.
       */
      async squash(text, expectedSha) {
        let branch = cfg.branch;
        if (!branch) branch = (await req('GET', base)).default_branch;
        const refUrl = `${base}/git/ref/heads/${encodeURIComponent(branch)}`;
        const ref = await req('GET', refUrl);
        const head = await req('GET', `${base}/git/commits/${ref.object.sha}`);
        const tree = await req('GET', `${base}/git/trees/${head.tree.sha}`);
        const SAFE = new Set([cfg.path || 'workoholic.vault', 'README.md', '.gitignore', 'LICENSE', '.gitattributes']);
        const mine = tree.tree.find(t => t.path === (cfg.path || 'workoholic.vault'));
        const okEntry = t => (t.type === 'blob' && SAFE.has(t.path)) || (t.type === 'tree' && t.path === 'files');
        if (tree.truncated || !mine || mine.sha !== expectedSha || !tree.tree.every(okEntry)) return null;
        const blob = await req('POST', `${base}/git/blobs`, { content: btoa(text), encoding: 'base64' });
        const nt = await req('POST', `${base}/git/trees`, { base_tree: head.tree.sha, tree: [{ path: cfg.path || 'workoholic.vault', mode: '100644', type: 'blob', sha: blob.sha }] });
        const commit = await req('POST', `${base}/git/commits`, { message: 'tresor', tree: nt.sha, parents: [] });
        const again = await req('GET', refUrl);
        if (again.object.sha !== ref.object.sha) return null;
        await req('PATCH', `${base}/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha, force: true });
        return blob.sha;
      }
    };
  }

  window.WVault = Object.freeze({ KDF, create, unlock, recover, rekey, verifyKeys, serialize, parse, encryptJson, decryptJson, encryptFile, decryptFile, packFile, unpackFile, strength, GitHub, MAX_FILE: 20 * 1024 * 1024 });
})();
