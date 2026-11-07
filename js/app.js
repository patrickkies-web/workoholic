(() => {
'use strict';

const V = window.WVault;

/* ======================= Helpers ======================= */
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const LS = { vault: 'workoholic:vault', device: 'workoholic:device', legacy: 'workoholic:v1' };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => { const b = crypto.getRandomValues(new Uint8Array(9)); return [...b].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 14); };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMQ = matchMedia('(max-width: 760px)');
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const sod = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const eod = t => addDays(sod(t), 1);
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const weekStart = t => { const d = new Date(sod(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const isoWeek = t => { const d = new Date(sod(t)); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / DAY - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dur = ms => { const m = Math.floor(Math.max(0, ms) / MIN); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
const durWords = min => {
  if (min >= 480 && min % 480 === 0) return `${min / 480} ${min === 480 ? 'Tag' : 'Tage'}`;
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
};
const dateShort = t => { const d = new Date(t); return `${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`; };
const dueLabel = t => {
  const diffDays = Math.round((sod(t) - sod(Date.now())) / DAY);
  const time = hm(t);
  if (diffDays === 0) return `heute, ${time}`;
  if (diffDays === 1) return `morgen, ${time}`;
  if (diffDays === -1) return `gestern, ${time}`;
  if (diffDays > 1 && diffDays < 7) return `${WD[new Date(t).getDay()]}, ${time}`;
  return `${dateShort(t)}, ${time}`;
};
const rel = ms => {
  const m = Math.round(ms / MIN);
  if (m < 1) return 'jetzt';
  if (m < 60) return `${m} Min`;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 6) return mm ? `${h} Std ${mm} Min` : `${h} Std`;
  if (h < 48) return `${h} Std`;
  const d = Math.floor(h / 24), hh = h % 24;
  if (d < 7) return hh ? `${d} T ${hh} Std` : `${d} T`;
  return `${d} Tage`;
};
const toLocalInput = t => { if (t == null) return ''; const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const parseLocal = v => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || ''); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
const at = (dayOffset, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.getTime(); };
const nextWeekday = (wd, h) => { const d = new Date(); let add = (wd - d.getDay() + 7) % 7; if (add === 0 && d.getHours() >= h) add = 7; d.setDate(d.getDate() + add); d.setHours(h, 0, 0, 0); return d.getTime(); };
const defaultDue = () => new Date().getHours() < 16 ? at(0, 17) : at(1, 12);
const initials = name => { const w = String(name).trim().split(/\s+/).filter(Boolean); if (!w.length) return '?'; if (w.length === 1) return w[0].slice(0, 2).replace(/^./, c => c.toUpperCase()); return (w[0][0] + w[1][0]).toUpperCase(); };
const firstLine = s => String(s).split('\n')[0].slice(0, 80);
const norm = s => String(s || '').toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '');

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/>',
  todo: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
  brief: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
  edit: '<path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M9.5 6l6 6-6 6"/>'
};
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const KINDS = {
  anfrage: { label: 'Anfrage', plural: 'Anfragen', icon: 'user' },
  todo: { label: 'Todo', plural: 'Todos', icon: 'todo' },
  aufgabe: { label: 'Aufgabe', plural: 'Aufgaben', icon: 'brief' }
};
const MODES = { einmalig: 'Einmalig', deadline: 'Ultimatum', dauer: 'Dauer', asap: 'Schnellstmöglich', repeat: 'Wiederkehrend' };
const STATUS = { offen: 'Offen', inarbeit: 'In Arbeit', wartet: 'Wartet' };
const REPEATS = { daily: 'täglich', weekdays: 'werktags', weekly: 'wöchentlich', monthly: 'monatlich' };

/* ======================= State model ======================= */
const blank = () => ({ v: 2, items: [], stamps: [], adj: {}, del: {}, settings: { targetMin: 480, name: '', u: 0 } });
const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;

function normItem(x) {
  const now = Date.now();
  const it = {
    id: String(x.id || uid()),
    title: String(x.title || '').slice(0, 300),
    notes: String(x.notes || '').slice(0, 5000),
    kind: KINDS[x.kind] ? x.kind : 'todo',
    from: String(x.from || '').slice(0, 60),
    mode: MODES[x.mode] ? x.mode : 'einmalig',
    due: num(x.due),
    durMin: num(x.durMin) && x.durMin > 0 ? Math.round(x.durMin) : null,
    spentMs: num(x.spentMs) || 0,
    timerStart: num(x.timerStart),
    repeat: REPEATS[x.repeat] ? x.repeat : null,
    repDay: num(x.repDay),
    status: STATUS[x.status] ? x.status : 'offen',
    done: !!x.done,
    doneAt: num(x.doneAt),
    doneCount: num(x.doneCount) || 0,
    lastDone: num(x.lastDone),
    createdAt: num(x.createdAt) || now,
    updatedAt: num(x.updatedAt) || now
  };
  if (it.mode === 'repeat' && !it.repeat) it.repeat = 'daily';
  if ((it.mode === 'deadline' || it.mode === 'repeat') && it.due == null) it.mode = 'einmalig';
  if (it.mode === 'asap' || it.mode === 'einmalig') it.due = null;
  if (it.mode !== 'repeat') { it.repeat = null; it.repDay = null; }
  return it;
}

/** Bringt Daten in eine kanonische Form (feste Reihenfolge), damit Geräte bitgleich übereinstimmen. */
function normalize(s) {
  const b = blank();
  if (!s || typeof s !== 'object') return b;
  const items = new Map();
  for (const x of (Array.isArray(s.items) ? s.items : [])) {
    if (!x || !x.title) continue;
    const it = normItem(x); const c = items.get(it.id);
    if (!c || it.updatedAt > c.updatedAt) items.set(it.id, it);
  }
  b.items = [...items.values()].sort((a, c) => a.createdAt - c.createdAt || cmp(a.id, c.id));
  const stamps = new Map();
  for (const x of (Array.isArray(s.stamps) ? s.stamps : [])) {
    if (!x || num(x.in) == null) continue;
    const out = num(x.out);
    if (out != null && out <= x.in) continue;
    const st = { id: String(x.id || uid()), in: x.in, out, u: num(x.u) || (out ?? x.in) };
    const c = stamps.get(st.id);
    if (!c || st.u > c.u) stamps.set(st.id, st);
  }
  b.stamps = [...stamps.values()].sort((a, c) => a.in - c.in || cmp(a.id, c.id));
  b.stamps.forEach((st, i) => { if (st.out == null && i < b.stamps.length - 1) st.out = b.stamps[i + 1].in; });
  const cutoff = Date.now() - 120 * DAY;
  const adj = s.adj && typeof s.adj === 'object' ? s.adj : {};
  Object.keys(adj).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().forEach(k => {
    const x = adj[k] || {}, m = clamp(Math.round(Number(x.m) || 0), 0, 16 * 60), u = num(x.u) || 0;
    if (m > 0 || u > cutoff) b.adj[k] = { m, u };
  });
  const del = s.del && typeof s.del === 'object' ? s.del : {};
  Object.keys(del).sort().forEach(k => { const v = num(del[k]); if (v && v > cutoff) b.del[k] = v; });
  const se = s.settings || {};
  const t = Number(se.targetMin);
  b.settings = { targetMin: Number.isFinite(t) ? clamp(Math.round(t), 0, 24 * 60) : 480, name: String(se.name || '').slice(0, 40), u: num(se.u) || 0 };
  return b;
}

/** Zusammenführen zweier Stände: neuester Eintrag gewinnt, Löschungen über Grabsteine. */
function merge(a, b) {
  const del = {};
  for (const src of [a.del, b.del]) for (const k in src) del[k] = Math.max(del[k] || 0, src[k]);
  const pick = (list, key) => {
    const m = new Map();
    for (const x of list) {
      const c = m.get(x.id);
      if (!c || x[key] > c[key] || (x[key] === c[key] && JSON.stringify(x) > JSON.stringify(c))) m.set(x.id, x);
    }
    const out = [];
    for (const x of m.values()) {
      if (del[x.id] && del[x.id] >= x[key]) continue;
      if (del[x.id]) delete del[x.id];
      out.push(x);
    }
    return out;
  };
  const items = pick([...a.items, ...b.items], 'updatedAt');
  const stamps = pick([...a.stamps, ...b.stamps], 'u');
  const settings = (b.settings.u || 0) > (a.settings.u || 0) ? b.settings : a.settings;
  const adj = {};
  for (const k of new Set([...Object.keys(a.adj || {}), ...Object.keys(b.adj || {})])) {
    const x = (a.adj || {})[k], y = (b.adj || {})[k];
    adj[k] = !x ? y : !y ? x : (y.u > x.u || (y.u === x.u && y.m > x.m)) ? y : x;
  }
  return normalize({ items, stamps, adj, del, settings });
}

let state = blank();
let S = null; // entsperrte Sitzung: { env, dek, dev }
let lockedEnv = null;

/* ======================= Persistenz (nur verschlüsselt) ======================= */
let saveChain = Promise.resolve(), saveQueued = false;
function writeEnv() {
  try { localStorage.setItem(LS.vault, V.serialize(S.env)); }
  catch (e) { toast('Speichern nicht möglich – Browser-Speicher voll oder gesperrt.'); }
}
function persist() {
  if (!S || saveQueued) return saveChain;
  saveQueued = true;
  saveChain = saveChain.then(async () => {
    saveQueued = false;
    if (!S) return;
    S.env.data = await V.encryptJson(S.dek, state);
    writeEnv();
  }).catch(e => { console.error(e); toast('Verschlüsseltes Speichern fehlgeschlagen.'); });
  return saveChain;
}
let devChain = Promise.resolve();
const defDev = () => ({ autoLock: 15, sync: null, sha: null, lastSync: 0, lastSquash: 0, pending: false });
function saveDevice() {
  if (!S) return devChain;
  const snap = JSON.parse(JSON.stringify(S.dev)), dek = S.dek;
  devChain = devChain.then(async () => {
    const box = await V.encryptJson(dek, snap, 'device');
    localStorage.setItem(LS.device, JSON.stringify(box));
  }).catch(() => {});
  return devChain;
}
async function loadDevice(dek) {
  try {
    const t = localStorage.getItem(LS.device);
    if (!t) return defDev();
    return { ...defDev(), ...(await V.decryptJson(dek, JSON.parse(t), 'device')) };
  } catch (e) { return defDev(); }
}
function save() {
  persist();
  if (S && Sync.cfg() && !S.dev.pending) { S.dev.pending = true; saveDevice(); }
  Sync.schedule();
}
const commit = () => { save(); renderAll(); };
const snapshot = () => JSON.stringify(state);
const find = id => state.items.find(i => i.id === id);
const touch = it => { it.updatedAt = Date.now(); };

/** Ersetzt den Stand (Rückgängig, Import, Demo, Löschen) so, dass die Sync-Logik es als neueste Änderung erkennt. */
function applyState(raw) {
  const next = normalize(raw), now = Date.now();
  const curI = new Map(state.items.map(x => [x.id, JSON.stringify(x)]));
  const curS = new Map(state.stamps.map(x => [x.id, JSON.stringify(x)]));
  for (const it of next.items) { if (curI.get(it.id) !== JSON.stringify(it)) it.updatedAt = now; delete next.del[it.id]; }
  for (const st of next.stamps) { if (curS.get(st.id) !== JSON.stringify(st)) st.u = now; delete next.del[st.id]; }
  const keep = new Set([...next.items.map(i => i.id), ...next.stamps.map(s => s.id)]);
  for (const x of [...state.items, ...state.stamps]) if (!keep.has(x.id)) next.del[x.id] = now;
  for (const k in state.del) if (!keep.has(k)) next.del[k] = Math.max(next.del[k] || 0, state.del[k]);
  for (const k in next.adj) { const c = state.adj[k]; if (!c || c.m !== next.adj[k].m) next.adj[k].u = now; else next.adj[k].u = c.u; }
  for (const k in state.adj) if (!next.adj[k]) next.adj[k] = { m: 0, u: now };
  const plain = s => JSON.stringify({ ...s, u: 0 });
  if (plain(next.settings) !== plain(state.settings)) next.settings.u = now; else next.settings.u = state.settings.u;
  state = normalize(next);
  commit();
}
const restore = snap => applyState(JSON.parse(snap));

/* ======================= UI state ======================= */
const ui = { kind: 'alle', q: '', day: null, person: null, selDay: null, calMonth: null, openDone: false };

/* ======================= Time tracking ======================= */
const openStamp = () => { const l = state.stamps[state.stamps.length - 1]; return l && l.out == null ? l : null; };
/** Nur gestempelte Zeit (für Tagesverlauf und Pausen). */
function stampsIn(a, b, now = Date.now()) {
  let s = 0;
  for (const st of state.stamps) {
    const x = Math.max(st.in, a), y = Math.min(st.out ?? now, b);
    if (y > x) s += y - x;
  }
  return s;
}
/** Per +15 nachgetragene Minuten für Tage im Bereich. */
function adjIn(a, b) {
  let s = 0;
  for (const k in state.adj) { const t = fromKey(k); if (t >= a && t < b) s += state.adj[k].m * MIN; }
  return s;
}
const workedIn = (a, b, now = Date.now()) => stampsIn(a, b, now) + adjIn(a, b);
function addMinutes(key, delta) {
  if (!S || fromKey(key) > Date.now()) return;
  const cur = (state.adj[key] && state.adj[key].m) || 0;
  const m = clamp(cur + delta, 0, 16 * 60);
  if (m === cur) return;
  state.adj[key] = { m, u: Date.now() };
  commit();
  const v = $('#adjVal');
  if (v && !reduceMotion.matches) { v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); }
}
function dayInfo(t, now = Date.now()) {
  const a = sod(t), b = eod(t);
  const sts = state.stamps.filter(st => (st.out ?? now) > a && st.in < b);
  const stamped = stampsIn(a, b, now), adj = adjIn(a, b);
  let pause = 0;
  if (sts.length) {
    const first = Math.max(sts[0].in, a);
    const lastEnd = Math.min(sts[sts.length - 1].out ?? now, b);
    pause = Math.max(0, (lastEnd - first) - stamped);
  }
  return { a, b, sts, worked: stamped + adj, stamped, adj, pause };
}
const requiredPause = ms => ms > 9 * HOUR ? 45 * MIN : ms > 6 * HOUR ? 30 * MIN : 0;

function stopTimers(now) {
  for (const i of state.items) if (i.timerStart) { i.spentMs += now - i.timerStart; i.timerStart = null; i.updatedAt = now; }
}
const spentOf = (it, now = Date.now()) => it.spentMs + (it.timerStart ? now - it.timerStart : 0);

function toggleClock() {
  if (!S) return;
  const now = Date.now(), snap = snapshot(), open = openStamp();
  if (open) {
    open.out = now; open.u = now;
    const running = state.items.some(i => i.timerStart);
    stopTimers(now);
    commit();
    const long = now - open.in > 14 * HOUR;
    toast(long ? `Ausgedongelt – Session lief ${dur(now - open.in)} h. Bitte prüfen.` : `Ausgedongelt · ${dur(now - open.in)} h${running ? ' · Timer gestoppt' : ''}`,
      long ? { action: { label: 'Korrigieren', fn: () => openStampEditor(open.id) } } : { undo: snap });
  } else {
    state.stamps.push({ id: uid(), in: now, out: null, u: now });
    commit();
    toast(`Eingedongelt um ${hm(now)}`, { undo: snap });
  }
  if (navigator.vibrate) navigator.vibrate(12);
}

/* ======================= Items ======================= */
const dueOf = it => (it.mode === 'deadline' || it.mode === 'repeat' || it.mode === 'dauer') ? it.due : null;

function nextOcc(t, rep, repDay) {
  const d = new Date(t);
  if (rep === 'daily') d.setDate(d.getDate() + 1);
  else if (rep === 'weekdays') { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
  else if (rep === 'weekly') d.setDate(d.getDate() + 7);
  else if (rep === 'monthly') {
    const want = repDay || d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(want, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  } else d.setDate(d.getDate() + 1);
  return d.getTime();
}

function rank(it, now) {
  if (it.mode === 'asap') return [0, it.createdAt];
  if (it.timerStart) return [1, 0];
  const d = dueOf(it);
  if (d != null && d < eod(now)) return [2, d];
  if (it.status === 'inarbeit') return [3, it.createdAt];
  if (d != null) return [4, d];
  if (it.status === 'wartet') return [6, it.createdAt];
  return [5, it.createdAt];
}
const byRank = now => (a, b) => { const x = rank(a, now), y = rank(b, now); return x[0] - y[0] || x[1] - y[1]; };

function groupOf(it, now) {
  if (it.done) return 'done';
  if (it.mode === 'asap') return 'asap';
  const d = dueOf(it);
  if (d != null) { if (d < now) return 'overdue'; if (d < eod(now)) return 'today'; return 'soon'; }
  return 'open';
}
const GROUPS = [['asap', 'Schnellstmöglich'], ['overdue', 'Überfällig'], ['today', 'Heute'], ['soon', 'Demnächst'], ['open', 'Ohne Termin'], ['done', 'Erledigt']];

function completeItem(id) {
  const it = find(id); if (!it) return;
  const snap = snapshot(), now = Date.now();
  if (it.timerStart) { it.spentMs += now - it.timerStart; it.timerStart = null; }
  if (it.mode === 'repeat' && !it.done) {
    let n = nextOcc(it.due, it.repeat, it.repDay);
    while (n <= now) n = nextOcc(n, it.repeat, it.repDay);
    it.due = n; it.doneCount++; it.lastDone = now; it.status = 'offen'; it.spentMs = 0; it.updatedAt = now;
    commit(); toast(`Erledigt · wieder fällig ${dueLabel(n)}`, { undo: snap });
    return;
  }
  it.done = !it.done; it.doneAt = it.done ? now : null; it.updatedAt = now;
  if (it.done) it.status = 'offen';
  commit();
  toast(it.done ? `Erledigt: ${it.title}` : 'Wieder offen', { undo: snap });
}
function completeWithFeedback(id, btn) {
  const row = btn && btn.closest('.item');
  const it = find(id);
  if (!row || !it || it.done || reduceMotion.matches) return completeItem(id);
  btn.classList.add('on'); row.classList.add('completing');
  setTimeout(() => completeItem(id), 260);
}
function toggleTimer(id) {
  const it = find(id); if (!it) return;
  const now = Date.now();
  if (it.timerStart) { it.spentMs += now - it.timerStart; it.timerStart = null; touch(it); commit(); return; }
  stopTimers(now);
  it.timerStart = now; touch(it);
  if (it.status === 'offen') it.status = 'inarbeit';
  commit();
  if (!openStamp()) toast('Timer läuft – du bist aber nicht eingedongelt.', { action: { label: 'Eindongeln', fn: toggleClock } });
}
function removeItem(id) {
  const snap = snapshot();
  state.items = state.items.filter(i => i.id !== id);
  state.del[id] = Date.now();
  commit(); toast('Eintrag gelöscht', { undo: snap });
}

/* ======================= Toasts ======================= */
function toast(msg, opt = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  const span = document.createElement('span'); span.textContent = msg; el.append(span);
  let timer;
  const close = () => { clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 170); };
  if (opt.undo) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Rückgängig'; b.onclick = () => { if (S) restore(opt.undo); close(); }; el.append(b); }
  if (opt.action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = opt.action.label; b.onclick = () => { close(); opt.action.fn(); }; el.append(b); }
  host.append(el);
  const all = $$('.toast:not(.out)', host); if (all.length > 3) all[0].remove();
  const ms = opt.ms || (opt.undo || opt.action ? 5200 : 2800);
  timer = setTimeout(close, ms);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { timer = setTimeout(close, 1800); });
}

/* ======================= Orb (particle sphere) ======================= */
function createOrb(canvas) {
  const ctx = canvas.getContext('2d');
  const N = 900, pts = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963229728653, rr = .8 + rnd() * .2;
    pts.push({ x: Math.cos(th) * r * rr, y: y * rr, z: Math.sin(th) * r * rr, s: rnd(), tw: rnd() * 6.283 });
  }
  let W = 0, H = 0, rot = .6, speed = .05, target = .05, active = false, raf = 0, last = 0, onScreen = true;
  function draw(t) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * .37 * (active ? 1 + Math.sin(t / 900) * .012 : 1);
    const cx = W / 2, cy = H / 2 + 6, cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(.38), st = Math.sin(.38);
    for (const p of pts) {
      const x = p.x * cr + p.z * sr, z = -p.x * sr + p.z * cr;
      const y2 = p.y * ct - z * st, z2 = p.y * st + z * ct;
      const depth = (z2 + 1) / 2;
      const tw = active ? .62 + .38 * Math.sin(t / 650 + p.tw) : .85;
      const a = (.1 + depth * .78) * tw * (active ? 1 : .62);
      const size = (.55 + p.s * 1.15) * (.55 + depth * .65);
      ctx.fillStyle = active && p.s > .94 ? `rgba(198,220,122,${a})` : `rgba(240,238,230,${a})`;
      ctx.fillRect(cx + x * R - size / 2, cy + y2 * R - size / 2, size, size);
    }
  }
  function loop(t) {
    const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    speed += (target - speed) * .035; rot += speed * dt;
    draw(t); raf = requestAnimationFrame(loop);
  }
  const canRun = () => !reduceMotion.matches && !document.hidden && onScreen && W > 0 && !!S;
  function start() { if (raf || !canRun()) { draw(performance.now()); return; } last = 0; raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W) start(); else stop();
    draw(performance.now());
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; onScreen ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reduceMotion.addEventListener?.('change', () => { stop(); start(); });
  return { start, setActive(v) { if (v === active) return; active = v; target = v ? .3 : .05; if (!raf) draw(performance.now()); } };
}
const orb = createOrb($('#orb'));

/* ======================= Render: time ======================= */
function renderTime(now = Date.now()) {
  const open = openStamp();
  document.body.classList.toggle('is-in', !!open);
  orb.setActive(!!open);

  const dg = $('#dongle');
  if (!dongle.busy) {
    dg.dataset.state = open ? 'in' : 'out';
    $('#dongleLabel').textContent = open ? 'Ausdongeln' : 'Eindongeln';
    dg.setAttribute('aria-label', open ? `Ausdongeln (eingedongelt seit ${hm(open.in)})` : 'Eindongeln');
  }
  $('#dongleHint').textContent = open ? `seit ${hm(open.in)}` : (mobileMQ.matches ? 'tippen' : 'tippen oder ziehen');
  $('#dockDongleLbl').textContent = open ? 'Ausdongeln' : 'Eindongeln';
  const ts = $('#timeState');
  ts.textContent = open ? 'Eingedongelt' : 'Ausgedongelt';
  ts.className = 'pill ' + (open ? 'pill-accent-soft' : 'pill-quiet');
  $('#ampmIn').classList.toggle('on', !!open);
  $('#ampmOut').classList.toggle('on', !open);

  renderWave(now);
  updateLive(now);
  renderStamps(now);
}

function updateLive(now = Date.now()) {
  const open = openStamp();
  const di = dayInfo(now, now);
  const target = state.settings.targetMin * MIN;
  const pct = target ? Math.round(di.worked / target * 100) : 0;
  $('#workedBig').textContent = dur(di.worked);
  $('#workedSub').textContent = target ? `von ${dur(target)} h Soll` : 'kein Tagessoll';
  $('#orbPct').textContent = `${pct}%`;
  $('#orbBar').style.transform = `scaleY(${target ? clamp(di.worked / target, 0, 1) : 0})`;
  $('#capTime').textContent = open ? dur(now - open.in).padStart(5, '0') : '--:--';
  $('#heroClock').textContent = open ? `Im Dienst · ${dur(now - open.in)}` : 'Ausgedongelt';

  const st = $('#orbStatus');
  st.classList.remove('warn');
  if (open && open.in < sod(now)) { st.textContent = 'Seit gestern eingedongelt? Stempel prüfen.'; st.classList.add('warn'); }
  else if (open) st.textContent = `Eingedongelt seit ${hm(open.in)} …`;
  else if (di.sts.length) st.textContent = `Ausgedongelt um ${hm(di.sts[di.sts.length - 1].out)}`;
  else st.textContent = 'Bereit zum Eindongeln …';

  $('#stPause').textContent = dur(di.pause);
  const remaining = target - di.worked;
  const lbl = $('#stEndLbl'), val = $('#stEnd');
  val.title = '';
  if (!target) { lbl.textContent = 'Soll'; val.textContent = '–'; }
  else if (remaining <= 0) { lbl.textContent = 'Überstunden'; val.textContent = '+' + dur(-remaining); }
  else if (open) {
    const missing = Math.max(0, requiredPause(target) - di.pause);
    lbl.textContent = 'Feierabend ~';
    val.textContent = hm(now + remaining + missing);
    val.title = missing ? `inkl. ${dur(missing)} h noch fälliger Pause (ArbZG)` : '';
  } else if (di.sts.length || di.adj) { lbl.textContent = 'Noch offen'; val.textContent = dur(remaining); }
  else { lbl.textContent = 'Tagessoll'; val.textContent = dur(target); }

  const ws = weekStart(now);
  $('#stWeek').textContent = dur(workedIn(ws, addDays(ws, 7), now));

  const law = $('#lawHint');
  let msg = '';
  if (di.worked > 10 * HOUR) msg = 'Über 10 Std heute – die gesetzliche Höchstarbeitszeit ist erreicht.';
  else if (di.worked > 6 * HOUR && di.pause < requiredPause(di.worked)) msg = `Pause-Hinweis: Nach ${di.worked > 9 * HOUR ? '9 Std stehen 45' : '6 Std stehen 30'} Min Pause an – bisher ${dur(di.pause)} h.`;
  law.hidden = !msg; law.textContent = msg;

  const fb = $('#fBig');
  if (fb && focusId) { const it = find(focusId); if (it) { const b = focusBig(it, now); fb.textContent = b.t; fb.className = 'f-big ' + (b.cls || ''); } }
  for (const it of state.items) {
    if (!it.timerStart) continue;
    const s = spentOf(it, now);
    $$(`[data-spent="${it.id}"]`).forEach(el => el.textContent = dur(s));
    if (it.durMin) $$(`[data-bar="${it.id}"]`).forEach(el => el.style.transform = `scaleX(${clamp(s / (it.durMin * MIN), 0, 1)})`);
  }
}

function renderWave(now) {
  const di = dayInfo(now, now);
  const today = sod(now);
  let start = today + 7 * HOUR, end = today + 19 * HOUR;
  if (di.sts.length) {
    start = Math.min(start, Math.max(today, di.sts[0].in));
    end = Math.max(end, Math.min(eod(now), di.sts[di.sts.length - 1].out ?? now));
  }
  start = start - (start - today) % HOUR;
  end = Math.min(eod(now), end + (HOUR - (end - today) % HOUR) % HOUR);
  const slot = 10 * MIN, n = Math.round((end - start) / slot);
  let html = '';
  for (let i = 0; i < n; i++) {
    const a = start + i * slot, b = a + slot;
    const frac = stampsIn(a, Math.min(b, now), now) / slot;
    const isNow = now >= a && now < b;
    if (frac > 0.02) {
      const r = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1;
      const h = Math.round((24 + r * 76) * Math.min(1, .35 + frac));
      html += `<i class="on${isNow ? ' now' : ''}" style="height:${h}%"></i>`;
    } else html += `<i${isNow ? ' class="now"' : ''}></i>`;
  }
  $('#waveBars').innerHTML = html;
  const open = openStamp();
  $('#waveStatus').textContent = open ? `Eingedongelt · ${hm(open.in)}` : (di.sts.length || di.adj) ? `Heute ${dur(di.worked)} h` : 'Noch nicht eingedongelt';
  $('#waveRange').textContent = `${pad(new Date(start).getHours())}–${pad(new Date(end).getHours() || 24)} Uhr`;
}

function renderStamps(now) {
  const key = ui.selDay || dayKey(now);
  const t = fromKey(key);
  const isToday = key === dayKey(now);
  const di = dayInfo(t, now);
  $('#stampsTitle').textContent = `${isToday ? 'Heute' : dateShort(t)}${di.sts.length || di.adj ? ` · ${dur(di.worked)} h` : ''}`;
  $('#stampsToday').hidden = isToday;
  const add = $('#add15'), future = t > now;
  add.disabled = future;
  add.setAttribute('aria-label', `15 Minuten für ${isToday ? 'heute' : dateShort(t)} hinzufügen`);
  add.title = future ? 'Nur für heute oder vergangene Tage' : `15 Minuten zu ${isToday ? 'heute' : dateShort(t)} hinzufügen`;
  const list = $('#stampList');
  const adjRow = di.adj ? `<li class="stamp adj"><span class="adj-lbl">Nachgetragen</span><span class="grow"></span><span class="adj-val" id="adjVal" aria-live="polite">+${dur(di.adj)}</span><button class="adj-minus" type="button" data-adj="-15" aria-label="15 Minuten wieder abziehen">−15</button></li>` : '';
  if (!di.sts.length) { list.innerHTML = adjRow || `<li class="stamp-empty">${isToday ? 'Noch nicht eingedongelt.' : 'Keine Stempel an diesem Tag.'}</li>`; return; }
  list.innerHTML = adjRow + di.sts.map(st => {
    const prev = st.in < di.a ? ' <span class="dim">(Vortag)</span>' : '';
    const out = st.out == null ? `<span class="run"><i class="pulse"></i>läuft</span>` : `<span class="mono">${hm(st.out)}</span>`;
    return `<li class="stamp"><span class="mono">${hm(st.in)}</span>${prev}<span class="arrow">→</span>${out}<span class="grow"></span><span class="mono dim">${dur((st.out ?? now) - st.in)}</span><button class="icon-btn sm" type="button" data-stamp="${st.id}" aria-label="Stempel ${hm(st.in)} bearbeiten">${ico('edit')}</button></li>`;
  }).join('');
}

/* ======================= Render: clock ======================= */
let lastMinute = -1;
function renderClock(now) {
  const d = new Date(now);
  $('#digits').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ======================= Render: week ======================= */
function renderWeek(now = Date.now()) {
  const ws = weekStart(now), target = state.settings.targetMin * MIN;
  const days = [];
  for (let i = 0; i < 7; i++) { const a = addDays(ws, i); days.push({ a, key: dayKey(a), worked: workedIn(a, addDays(a, 1), now), future: a > now }); }
  const total = days.reduce((s, d) => s + d.worked, 0);
  const workedDays = days.filter(d => d.worked > 5 * MIN);
  const avg = workedDays.length ? total / workedDays.length : 0;
  const pws = addDays(ws, -7);
  let ptot = 0, pdays = 0;
  for (let i = 0; i < 7; i++) { const a = addDays(pws, i); const w = workedIn(a, addDays(a, 1), now); if (w > 5 * MIN) { ptot += w; pdays++; } }
  const pavg = pdays ? ptot / pdays : 0;

  $('#wkKw').textContent = `KW ${isoWeek(now)}`;
  $('#wkTotal').textContent = dur(total);
  $('#wkAvg').textContent = `Ø ${dur(avg)} h / Arbeitstag`;
  $('#wkTarget').textContent = dur(target * 5);
  const delta = $('#wkDelta');
  if (pavg && avg) { const p = Math.round((avg / pavg - 1) * 100); delta.hidden = false; delta.className = `pill mono ${p >= 0 ? 'pill-lime' : 'pill-quiet'}`; delta.textContent = `${p >= 0 ? '+' : '−'}${Math.abs(p)}% Ø`; delta.title = `Durchschnitt pro Arbeitstag ggü. Vorwoche (${dur(pavg)} h)`; }
  else delta.hidden = true;

  const maxV = Math.max(target * 1.25, ...days.map(d => d.worked * 1.08), 4 * HOUR);
  const sel = ui.selDay || dayKey(now), todayKey = dayKey(now);
  const cols = days.map(d => {
    const dt = new Date(d.a);
    const h = d.worked / maxV * 100;
    const tip = `${WD[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}. · ${d.future ? 'kommt noch' : dur(d.worked) + ' h'}`;
    return `<button type="button" class="wk-col${d.future ? ' future' : ''}${d.key === todayKey ? ' today' : ''}${d.key === sel ? ' sel' : ''}" data-day="${d.key}" data-tip="${esc(tip)}" aria-label="${esc(tip)}">
      <span class="bar${d.worked < MIN ? ' zero' : ''}" style="height:${h.toFixed(2)}%"></span><span class="lbl">${WD[dt.getDay()]}</span></button>`;
  }).join('');
  $('#wkChart').innerHTML = `<div class="wk-plot">${target ? `<div class="wk-target" style="bottom:${(target / maxV * 100).toFixed(2)}%"><span>Soll ${dur(target)}</span></div>` : ''}<div class="wk-cols">${cols}</div></div><div class="wk-tip" id="wkTip"></div>`;
}

/* ======================= Render: calendar ======================= */
function renderCal(now = Date.now()) {
  if (ui.calMonth == null) { const d = new Date(now); ui.calMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  const m0 = new Date(ui.calMonth), y = m0.getFullYear(), mo = m0.getMonth();
  const today = new Date(now);
  const isCur = y === today.getFullYear() && mo === today.getMonth();
  $('#calDay').textContent = pad(today.getDate());
  $('#calMon').textContent = isCur ? MON[mo].toUpperCase() : `${MON[mo].toUpperCase()} ${String(y).slice(2)}`;
  const nDays = new Date(y, mo + 1, 0).getDate(), offset = (m0.getDay() + 6) % 7;
  const dues = {};
  for (const it of state.items) { if (it.done) continue; const d = dueOf(it); if (d != null) { const k = dayKey(d); (dues[k] = dues[k] || []).push(it.title); } }
  const todayStart = sod(now);
  let html = '';
  for (let i = 0; i < offset; i++) html += '<span></span>';
  for (let d = 1; d <= nDays; d++) {
    const t = new Date(y, mo, d).getTime(), k = dayKey(t);
    const worked = t <= now ? workedIn(t, addDays(t, 1), now) : 0;
    const cls = ['cd'];
    if (t < todayStart) cls.push('past'); else if (t > todayStart) cls.push('future');
    if (worked > 5 * MIN) cls.push('worked');
    if (dues[k]) cls.push('due');
    if (t === todayStart) cls.push('today');
    if (ui.day === k) cls.push('sel');
    const parts = [`${WDL[new Date(t).getDay()]}, ${d}. ${MONL[mo]}`];
    if (dues[k]) parts.push(`${dues[k].length} ${dues[k].length === 1 ? 'Frist' : 'Fristen'}: ${dues[k].slice(0, 3).join(', ')}${dues[k].length > 3 ? ' …' : ''}`);
    if (worked > MIN) parts.push(`${dur(worked)} h gearbeitet`);
    const label = esc(parts.join(' · '));
    html += `<button type="button" class="${cls.join(' ')}" data-cal="${k}" title="${label}" aria-label="${label}" aria-pressed="${ui.day === k}"></button>`;
  }
  $('#calGrid').innerHTML = html;
}

/* ======================= Render: hero ======================= */
function renderHero(now = Date.now()) {
  const d = new Date(now), h = d.getHours();
  const greet = h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 14 ? 'Mahlzeit' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  const name = state.settings.name.trim();
  $('#heroGreet').textContent = name ? `${greet}, ${name}` : greet;
  $('#heroDate').textContent = `${WD[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`;
  const open = state.items.filter(i => !i.done);
  const n = open.length;
  $('#heroSub').textContent = n === 0 ? 'Alles erledigt.' : `${n} ${n === 1 ? 'Punkt' : 'Punkte'} offen`;
  const today = sod(now);
  const doneToday = state.items.filter(i => i.done && i.doneAt >= today).length + state.items.filter(i => i.mode === 'repeat' && i.lastDone >= today).length;
  const newToday = state.items.filter(i => i.createdAt >= today).length;
  const req = open.filter(i => i.kind === 'anfrage').length;
  const overdue = open.filter(i => { const x = dueOf(i); return x != null && x < now; }).length;
  const parts = [`<span><b>${doneToday}</b> heute erledigt</span>`, `<span><b>${newToday}</b> neu</span>`, `<span><b>${req}</b> ${req === 1 ? 'Anfrage' : 'Anfragen'} offen</span>`];
  if (overdue) parts.push(`<span class="warn"><b>${overdue}</b> überfällig</span>`);
  $('#heroMeta').innerHTML = parts.join('<span class="sep">•</span>');

  const people = {};
  for (const it of open) if (it.from) people[it.from] = (people[it.from] || 0) + 1;
  const top = Object.entries(people).sort((a, b) => b[1] - a[1]).slice(0, mobileMQ.matches ? 3 : 4);
  $('#heroSide').innerHTML = `<button type="button" class="hs-btn" data-hs="new" aria-label="Neue Anfrage">${ico('plus')}</button>` +
    (top.length ? `<span class="hs-lbl">VON</span>` : '') +
    top.map(([p, c]) => `<button type="button" class="hs-btn hs-av" data-hs-name="${esc(p)}" aria-pressed="${ui.person === p}" title="${esc(p)} · ${c} offen" aria-label="Nur Einträge von ${esc(p)} zeigen (${c} offen)">${esc(initials(p))}</button>`).join('');

  const urgent = open.filter(i => i.mode === 'asap').length + overdue;
  document.title = urgent ? `(${urgent}) Workoholic` : 'Workoholic';
}

/* ======================= Render: planner ======================= */
function matches(it) {
  if (ui.kind !== 'alle' && it.kind !== ui.kind) return false;
  if (ui.person && it.from !== ui.person) return false;
  if (ui.day) { const d = dueOf(it); if (d == null || dayKey(d) !== ui.day) return false; }
  if (ui.q) { const q = norm(ui.q); if (!norm(`${it.title} ${it.notes} ${it.from}`).includes(q)) return false; }
  return true;
}

function urgencyPill(it, now) {
  if (it.done) return it.doneAt ? `<span class="pill pill-quiet">${ico('check')}${sod(it.doneAt) === sod(now) ? 'heute ' + hm(it.doneAt) : dateShort(it.doneAt)}</span>` : '';
  if (it.mode === 'asap') return `<span class="pill pill-accent"><i class="pulse"></i>Sofort</span>`;
  if (it.mode === 'dauer') {
    const s = spentOf(it, now), tot = (it.durMin || 0) * MIN, over = tot && s > tot;
    return `<span class="pill pill-dur${over ? ' over' : ''}"><span class="mono" data-spent="${it.id}">${dur(s)}</span>${tot ? `<span class="mono">/ ${dur(tot)}</span><span class="mini"><i data-bar="${it.id}" style="transform:scaleX(${clamp(tot ? s / tot : 0, 0, 1)})"></i></span>` : ''}</span>`;
  }
  const d = dueOf(it);
  if (d == null) return '';
  const diff = d - now;
  const icon = it.mode === 'repeat' ? ico('repeat') : '';
  if (diff < 0) return `<span class="pill pill-coral">${icon || ico('flag')}${-diff < MIN ? 'jetzt fällig' : 'überfällig · ' + rel(-diff)}</span>`;
  const cls = diff < 4 * HOUR ? 'pill-accent' : diff < DAY ? 'pill-accent-soft' : 'pill-quiet';
  return `<span class="pill ${cls}">${icon}noch ${rel(diff)}</span>`;
}

function itemRow(it, now) {
  const k = KINDS[it.kind];
  const tile = it.from ? `<span class="tile t-${it.kind}" aria-hidden="true">${esc(initials(it.from))}</span>` : `<span class="tile t-${it.kind}" aria-hidden="true">${ico(k.icon)}</span>`;
  const sub = [];
  if (it.kind === 'anfrage') sub.push(it.from ? `Anfrage von ${esc(it.from)}` : 'Anfrage');
  else if (it.kind === 'aufgabe') sub.push(it.from ? `Aufgabe · ${esc(it.from)}` : 'Aufgabe');
  else sub.push(it.from ? `Todo · ${esc(it.from)}` : 'Todo');
  const d = dueOf(it);
  if (it.mode === 'repeat') sub.push(`${REPEATS[it.repeat]}${it.done ? '' : ' · ' + dueLabel(d)}`);
  else if (d != null && !it.done) sub.push(dueLabel(d));
  if (it.mode === 'dauer' && it.durMin && !it.done) sub.push(`${durWords(it.durMin)} Aufwand`);
  if (it.notes) sub.push(esc(firstLine(it.notes)));

  const pills = [];
  if (!it.done && it.status === 'inarbeit') pills.push('<span class="pill pill-glass">in Arbeit</span>');
  if (!it.done && it.status === 'wartet') pills.push('<span class="pill pill-outline">wartet</span>');
  pills.push(urgencyPill(it, now));
  if (it.mode === 'dauer' && !it.done) pills.push(`<button type="button" class="tbtn${it.timerStart ? ' on' : ''}" data-act="timer" aria-label="${it.timerStart ? 'Timer pausieren' : 'Timer starten'}">${ico(it.timerStart ? 'pause' : 'play')}</button>`);

  const diff = d != null ? d - now : null;
  const cls = ['item'];
  if (it.done) cls.push('done');
  else if (it.mode === 'asap' || it.timerStart) cls.push('hot');
  else if (diff != null && diff < 0) cls.push('late');
  return `<li class="${cls.join(' ')}" data-id="${it.id}" tabindex="0" aria-label="${esc(it.title)} – ${esc(k.label)}${it.done ? ', erledigt' : ''}">
    ${tile}
    <div class="main"><div class="title">${esc(it.title)}</div><div class="sub">${sub.join(' · ')}</div></div>
    <div class="pills">${pills.join('')}</div>
    <button type="button" class="check${it.done ? ' on' : ''}" data-act="done" aria-label="${it.done ? 'Wieder öffnen' : 'Als erledigt markieren'}">${ico('check')}</button>
  </li>`;
}

function renderFilters() {
  const open = state.items.filter(i => !i.done);
  const count = k => k === 'alle' ? open.length : open.filter(i => i.kind === k).length;
  $('#filters').innerHTML = [['alle', 'Alle'], ['anfrage', 'Anfragen'], ['todo', 'Todos'], ['aufgabe', 'Aufgaben']]
    .map(([k, l]) => `<button type="button" role="tab" class="fchip" data-kind="${k}" aria-selected="${ui.kind === k}">${l}<span class="n">${count(k)}</span></button>`).join('');
  $('#openCount').textContent = open.length;
  const af = [];
  if (ui.day) { const t = fromKey(ui.day); af.push(`<button type="button" class="af" data-clear="day">Fällig ${dateShort(t)} ${ico('x')}</button>`); }
  if (ui.person) af.push(`<button type="button" class="af" data-clear="person">Von ${esc(ui.person)} ${ico('x')}</button>`);
  if (ui.q) af.push(`<button type="button" class="af" data-clear="q">„${esc(ui.q)}“ ${ico('x')}</button>`);
  $('#activeFilter').innerHTML = af.join('');
}

function renderPlanner(now = Date.now()) {
  renderFilters();
  const list = $('#list');
  if (!state.items.length) {
    list.innerHTML = `<div class="empty"><h3>Noch nichts erfasst.</h3><p>Leg die erste Anfrage, dein erstes Todo oder eine Aufgabe an – oder schau dir an, wie es mit Beispielen aussieht.</p><div class="row"><button type="button" class="btn btn-accent" data-empty="new">${ico('plus')}Erster Eintrag</button><button type="button" class="btn btn-ghost" data-empty="demo">Beispieldaten ansehen</button></div></div>`;
    return;
  }
  const items = state.items.filter(matches);
  const groups = {};
  for (const it of items) (groups[groupOf(it, now)] = groups[groupOf(it, now)] || []).push(it);
  let html = '';
  for (const [g, label] of GROUPS) {
    const arr = groups[g]; if (!arr || !arr.length) continue;
    if (g === 'done') {
      arr.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      const shown = arr.slice(0, 40);
      html += `<section class="group" data-g="done"><button type="button" class="group-h" data-act="toggle-done" aria-expanded="${ui.openDone}">${ico('chev')}${label}<sup>${arr.length}</sup></button>${ui.openDone ? `<ul class="items">${shown.map(i => itemRow(i, now)).join('')}</ul>` : ''}</section>`;
      continue;
    }
    arr.sort(byRank(now));
    html += `<section class="group" data-g="${g}"><h3 class="group-h">${label}<sup>${arr.length}</sup></h3><ul class="items">${arr.map(i => itemRow(i, now)).join('')}</ul></section>`;
  }
  if (!html) html = `<div class="empty"><h3>Nichts gefunden.</h3><p>Kein Eintrag passt zu den aktuellen Filtern.</p><div class="row"><button type="button" class="btn btn-ghost" data-empty="reset">Filter zurücksetzen</button></div></div>`;
  list.innerHTML = html;
}

/* ======================= Render: focus ======================= */
let focusId = null;
function focusBig(it, now) {
  if (it.mode === 'asap') return { t: 'JETZT', l: 'schnellstmöglich erledigen', cls: 'accent' };
  if (it.mode === 'dauer' && (it.timerStart || it.spentMs || dueOf(it) == null)) {
    const s = spentOf(it, now), tot = (it.durMin || 0) * MIN;
    return { t: dur(s), l: tot ? `von ${dur(tot)} h investiert` : 'investiert', cls: tot && s > tot ? 'coral' : '' };
  }
  const d = dueOf(it);
  if (d != null) {
    const diff = d - now, a = Math.abs(diff);
    if (a < 100 * HOUR) {
      const h = Math.floor(a / HOUR), m = Math.floor(a % HOUR / MIN), s = Math.floor(a % MIN / 1000);
      return { t: `${diff < 0 ? '−' : ''}${pad(h)}:${pad(m)}:${pad(s)}`, l: diff < 0 ? `überfällig seit ${dueLabel(d)}` : `bis ${dueLabel(d)}`, cls: diff < 0 ? 'coral' : diff < 4 * HOUR ? 'accent' : '' };
    }
    return { t: `${Math.floor(a / DAY)} Tage`, l: `bis ${dueLabel(d)}`, cls: '' };
  }
  const age = now - it.createdAt;
  return { t: age < DAY ? dur(age) : `${Math.floor(age / DAY)} T`, l: 'offen seit Erfassung', cls: '' };
}
function renderFocus(now = Date.now()) {
  const open = state.items.filter(i => !i.done).sort(byRank(now));
  const it = open[0];
  focusId = it ? it.id : null;
  const body = $('#focusBody');
  if (!it) {
    $('#fKind').innerHTML = '';
    body.innerHTML = `<div class="f-title">Nichts Dringendes.</div><div class="f-sub">Alles abgearbeitet – Zeit für einen Kaffee.</div><div class="f-big">00:00:00</div><div class="f-lbl">keine offene Frist</div>`;
    return;
  }
  const b = focusBig(it, now);
  $('#fKind').innerHTML = `<span class="pill ${it.mode === 'asap' ? 'pill-accent' : 'pill-quiet'}">${ico(KINDS[it.kind].icon)}${KINDS[it.kind].label}</span>`;
  const sub = [it.from ? `von ${esc(it.from)}` : '', MODES[it.mode], it.status !== 'offen' ? STATUS[it.status] : ''].filter(Boolean).join(' · ');
  const timerBtn = it.mode === 'dauer' ? `<button type="button" class="btn btn-ghost" data-focus="timer">${ico(it.timerStart ? 'pause' : 'play')}${it.timerStart ? 'Pause' : 'Start'}</button>` : `<button type="button" class="btn btn-ghost" data-focus="edit">${ico('edit')}Öffnen</button>`;
  body.innerHTML = `<div class="f-title">${esc(it.title)}</div><div class="f-sub">${sub}</div>
    <div class="f-big ${b.cls}" id="fBig">${b.t}</div><div class="f-lbl">${b.l}</div>
    <div class="f-actions">${timerBtn}<button type="button" class="btn btn-accent" data-focus="done">${ico('check')}Erledigt</button></div>`;
}

function renderAll() {
  if (!S) return;
  const now = Date.now();
  renderClock(now);
  renderTime(now);
  renderWeek(now);
  renderCal(now);
  renderHero(now);
  renderPlanner(now);
  renderFocus(now);
  renderSyncUi();
}

/* ======================= Dialog helpers ======================= */
function openDlg(d) {
  if (d.open) return;
  d.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('open')));
}
function closeDlg(d) {
  if (!d.open || d.dataset.closing) return;
  d.classList.remove('open');
  if (reduceMotion.matches) { d.close(); return; }
  d.dataset.closing = '1';
  setTimeout(() => { delete d.dataset.closing; d.close(); }, mobileMQ.matches ? 300 : 190);
}
$$('dialog.dlg').forEach(d => {
  d.addEventListener('cancel', e => { e.preventDefault(); closeDlg(d); });
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDlg(d); });
});

/** Gestaltete Rückfrage (ersetzt confirm/prompt; Passwörter nie im Klartext-Prompt). */
function ask({ title, text, password = false, placeholder = '', buttons }) {
  return new Promise(resolve => {
    const d = $('#askDlg');
    $('#askH').textContent = title;
    $('#askP').textContent = text || '';
    const pw = $('#askPw');
    pw.hidden = !password; pw.value = ''; pw.placeholder = placeholder;
    const box = $('#askBtns'); box.innerHTML = '<span class="grow"></span>';
    let result = null;
    for (const b of buttons) {
      const el = document.createElement('button');
      el.type = b.submit ? 'submit' : 'button';
      el.className = 'btn ' + (b.cls || 'btn-ghost');
      el.textContent = b.label;
      if (!b.submit) el.addEventListener('click', () => { result = b.value; closeDlg(d); });
      box.append(el);
    }
    $('#askForm').onsubmit = ev => {
      ev.preventDefault();
      if (password && !pw.value) { pw.focus(); return; }
      result = (buttons.find(b => b.submit) || {}).value; closeDlg(d);
    };
    d.addEventListener('close', () => { const p = pw.value; pw.value = ''; resolve(result == null ? null : { value: result, password: p }); }, { once: true });
    openDlg(d);
    setTimeout(() => (password ? pw : box.lastElementChild).focus(), 40);
  });
}

/* ======================= Composer ======================= */
const C = { id: null, kind: 'todo', mode: 'einmalig', status: 'offen', repeat: 'daily' };
const DUE_CHIPS = [
  ['In 1 Std', () => { const t = Date.now() + HOUR; return t - t % (5 * MIN); }],
  ['Heute 17:00', () => at(0, 17)],
  ['Morgen 10:00', () => at(1, 10)],
  ['Freitag 16:00', () => nextWeekday(5, 16)],
  ['In 1 Woche', () => at(7, 12)]
];
const DUR_CHIPS = [15, 30, 60, 120, 240, 480];
$('#dueChips').innerHTML = DUE_CHIPS.map((c, i) => `<button type="button" class="chip" data-due="${i}">${c[0]}</button>`).join('');
$('#durChips').innerHTML = DUR_CHIPS.map(m => `<button type="button" class="chip" data-dur="${m}">${durWords(m)}</button>`).join('');

function setSeg(name, v) {
  C[name] = v;
  $$(`[data-seg="${name}"] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
}
function syncComposer() {
  $('#fromRow').hidden = C.kind === 'todo';
  $('#lblFrom').textContent = C.kind === 'anfrage' ? 'Von wem?' : 'Von / für wen (optional)';
  $$('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== C.mode);
  if (C.mode === 'deadline' && !$('#cDue').value) $('#cDue').value = toLocalInput(defaultDue());
  if (C.mode === 'repeat' && !$('#cRep').value) $('#cRep').value = toLocalInput(defaultDue());
  const dv = Number($('#cDur').value);
  $$('#durChips .chip').forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.dur) === dv)));
  const due = parseLocal($('#cDue').value);
  $$('#dueChips .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(due != null && DUE_CHIPS[i][1]() === due)));
}
function openComposer(item, preset = {}) {
  if (!S) return;
  closeMenu();
  const it = item || {};
  C.id = item ? item.id : null;
  $('#cHeading').textContent = item ? 'Bearbeiten' : 'Neuer Eintrag';
  $('#cTitle').value = preset.title ?? it.title ?? '';
  $('#cTitle').classList.remove('err');
  $('#cFrom').value = preset.from ?? it.from ?? '';
  $('#cNotes').value = it.notes || '';
  setSeg('kind', preset.kind || it.kind || (ui.kind !== 'alle' ? ui.kind : 'todo'));
  setSeg('mode', preset.mode || it.mode || 'einmalig');
  setSeg('status', it.status || 'offen');
  setSeg('repeat', it.repeat || 'daily');
  $('#cDue').value = it.mode === 'deadline' ? toLocalInput(it.due) : '';
  $('#cDue2').value = it.mode === 'dauer' ? toLocalInput(it.due) : '';
  $('#cRep').value = it.mode === 'repeat' ? toLocalInput(it.due) : '';
  $('#cDur').value = it.durMin || '';
  $('#cDelete').hidden = !item;
  const stats = $('#cStats');
  if (item) {
    const bits = [`Erfasst ${dateShort(it.createdAt)} ${hm(it.createdAt)}`];
    if (it.spentMs || it.timerStart) bits.push(`${dur(spentOf(it))} h investiert`);
    if (it.doneCount) bits.push(`${it.doneCount}× erledigt`);
    if (it.done && it.doneAt) bits.push(`erledigt ${dateShort(it.doneAt)} ${hm(it.doneAt)}`);
    stats.textContent = bits.join(' · '); stats.hidden = false;
  } else stats.hidden = true;
  const people = [...new Set(state.items.map(i => i.from).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  $('#people').innerHTML = people.map(p => `<option value="${esc(p)}"></option>`).join('');
  syncComposer();
  openDlg($('#composer'));
  if (!mobileMQ.matches || !item) setTimeout(() => { const t = $('#cTitle'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); }, 40);
}
$$('#composer [data-seg] button').forEach(b => b.addEventListener('click', () => { setSeg(b.parentElement.dataset.seg, b.dataset.v); syncComposer(); }));
$('#dueChips').addEventListener('click', e => { const c = e.target.closest('[data-due]'); if (!c) return; $('#cDue').value = toLocalInput(DUE_CHIPS[+c.dataset.due][1]()); syncComposer(); });
$('#durChips').addEventListener('click', e => { const c = e.target.closest('[data-dur]'); if (!c) return; $('#cDur').value = c.dataset.dur; syncComposer(); });
$('#cDur').addEventListener('input', syncComposer);
$('#cDue').addEventListener('input', syncComposer);
$('#cForm').addEventListener('submit', e => { e.preventDefault(); saveComposer(); });
$('#cForm').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveComposer(); } });
$('#cDelete').addEventListener('click', () => { const id = C.id; closeDlg($('#composer')); if (id) removeItem(id); });

function saveComposer() {
  if (!S) return;
  const title = $('#cTitle').value.trim();
  const fail = el => { el.classList.add('err'); el.focus(); setTimeout(() => el.classList.remove('err'), 1400); };
  if (!title) return fail($('#cTitle'));
  const now = Date.now();
  const data = { title, notes: $('#cNotes').value.trim(), kind: C.kind, from: C.kind === 'todo' ? '' : $('#cFrom').value.trim(), mode: C.mode, status: C.status, due: null, durMin: null, repeat: null, repDay: null };
  if (C.mode === 'deadline') { const t = parseLocal($('#cDue').value); if (t == null) return fail($('#cDue')); data.due = t; }
  if (C.mode === 'dauer') {
    const m = Math.round(Number($('#cDur').value));
    data.durMin = m > 0 ? m : null;
    data.due = parseLocal($('#cDue2').value);
  }
  if (C.mode === 'repeat') { const t = parseLocal($('#cRep').value); if (t == null) return fail($('#cRep')); data.repeat = C.repeat; data.due = t; data.repDay = new Date(t).getDate(); }
  if (C.id) {
    const it = find(C.id);
    if (it) {
      if (data.mode !== 'dauer' && it.timerStart) { it.spentMs += now - it.timerStart; it.timerStart = null; }
      Object.assign(it, normItem({ ...it, ...data, updatedAt: now }));
      toast('Gespeichert');
    } else toast('Eintrag wurde inzwischen auf einem anderen Gerät gelöscht.');
  } else {
    state.items.push(normItem({ id: uid(), ...data, createdAt: now, updatedAt: now }));
    toast(`${KINDS[data.kind].label} angelegt${data.from && data.kind === 'anfrage' ? ' · von ' + data.from : ''}`);
  }
  closeDlg($('#composer'));
  commit();
}

/* ======================= Stamp editor ======================= */
let editStampId = null;
function openStampEditor(id) {
  if (!S) return;
  editStampId = id || null;
  const st = id ? state.stamps.find(s => s.id === id) : null;
  const base = st ? st.in : (ui.selDay ? fromKey(ui.selDay) + 8 * HOUR : Date.now());
  $('#sHeading').textContent = st ? 'Stempel bearbeiten' : 'Stempel nachtragen';
  $('#sDate').value = dayKey(base);
  $('#sIn').value = st ? hm(st.in) : (ui.selDay ? '08:00' : hm(Date.now() - HOUR));
  $('#sOut').value = st ? (st.out != null ? hm(st.out) : '') : (ui.selDay ? '16:30' : hm(Date.now()));
  $('#sDelete').hidden = !st;
  openDlg($('#stampDlg'));
}
$('#sForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = $('#sDate').value, tin = $('#sIn').value, tout = $('#sOut').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}/.test(tin)) { toast('Bitte Datum und Beginn angeben.'); return; }
  const inT = parseLocal(`${date}T${tin}`);
  let outT = tout ? parseLocal(`${date}T${tout}`) : null;
  if (outT != null && outT <= inT) outT = addDays(outT, 1);
  const now = Date.now();
  if (inT > now) { toast('Beginn liegt in der Zukunft.'); return; }
  if (outT != null && outT > now + MIN) { toast('Ende liegt in der Zukunft.'); return; }
  const others = state.stamps.filter(s => s.id !== editStampId);
  if (outT == null && others.some(s => s.out == null)) { toast('Es läuft schon eine Session – bitte ein Ende angeben.'); return; }
  if (outT == null && others.some(s => s.in > inT)) { toast('Eine offene Session muss die letzte sein – bitte Ende angeben.'); return; }
  const clash = others.find(s => inT < (s.out ?? now) && (outT ?? now) > s.in);
  if (clash) { toast(`Überschneidet sich mit ${hm(clash.in)}–${clash.out ? hm(clash.out) : 'läuft'}.`); return; }
  const snap = snapshot();
  if (editStampId) { const st = state.stamps.find(s => s.id === editStampId); if (st) { st.in = inT; st.out = outT; st.u = now; } }
  else state.stamps.push({ id: uid(), in: inT, out: outT, u: now });
  state.stamps.sort((a, b) => a.in - b.in);
  closeDlg($('#stampDlg'));
  commit();
  toast(editStampId ? 'Stempel geändert' : 'Stempel nachgetragen', { undo: snap });
});
$('#sDelete').addEventListener('click', () => {
  if (!editStampId) return;
  const snap = snapshot();
  state.stamps = state.stamps.filter(s => s.id !== editStampId);
  state.del[editStampId] = Date.now();
  closeDlg($('#stampDlg')); commit(); toast('Stempel gelöscht', { undo: snap });
});
$('#stampList').addEventListener('click', e => {
  const m = e.target.closest('[data-adj]'); if (m) { addMinutes(ui.selDay || dayKey(Date.now()), Number(m.dataset.adj)); return; }
  const b = e.target.closest('[data-stamp]'); if (b) openStampEditor(b.dataset.stamp);
});
$('#add15').addEventListener('click', () => addMinutes(ui.selDay || dayKey(Date.now()), 15));
$('#stampsToday').addEventListener('click', () => { ui.selDay = null; renderTime(); renderWeek(); });

/* ======================= Dongle slider ======================= */
const dongle = { busy: false, drag: null, suppress: false };
(() => {
  const el = $('#dongle'), knob = $('#dongleKnob');
  const max = () => el.clientWidth - knob.offsetWidth - 10;
  const reset = (animate = true) => { knob.style.transition = animate ? '' : 'none'; knob.style.transform = ''; };
  function finish(fromX) {
    if (dongle.busy) return;
    if (reduceMotion.matches) { reset(false); toggleClock(); return; }
    dongle.busy = true;
    const m = max();
    knob.style.transition = 'none';
    const a = knob.animate([{ transform: `translateX(${fromX}px)` }, { transform: `translateX(${m}px)` }], { duration: Math.max(110, 260 * (1 - fromX / m)), easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
    a.onfinish = () => {
      toggleClock();
      a.cancel(); knob.style.transform = '';
      dongle.busy = false;
      if (S) renderTime();
      knob.animate([{ opacity: 0, filter: 'blur(4px)', transform: 'translateX(-8px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.23,1,.32,1)' });
      requestAnimationFrame(() => { knob.style.transition = ''; });
    };
  }
  knob.addEventListener('pointerdown', e => {
    if (dongle.busy || dongle.drag || e.button !== 0) return;
    dongle.drag = { x0: e.clientX, t0: performance.now(), dx: 0, moved: false, id: e.pointerId };
    knob.setPointerCapture(e.pointerId);
    knob.style.transition = 'none';
  });
  knob.addEventListener('pointermove', e => {
    const d = dongle.drag; if (!d || e.pointerId !== d.id) return;
    let dx = e.clientX - d.x0;
    if (Math.abs(dx) > 6) d.moved = true;
    const m = max();
    if (dx < 0) dx *= .2; else if (dx > m) dx = m + (dx - m) * .2;
    d.dx = dx;
    knob.style.transform = `translateX(${dx}px)`;
  });
  const end = cancel => e => {
    const d = dongle.drag; if (!d || e.pointerId !== d.id) return;
    dongle.drag = null;
    if (!d.moved) { reset(false); return; }
    dongle.suppress = true; setTimeout(() => { dongle.suppress = false; }, 50);
    const m = max(), v = d.dx / Math.max(1, performance.now() - d.t0);
    if (!cancel && (d.dx > m * .55 || v > .6)) finish(clamp(d.dx, 0, m));
    else { knob.style.transition = ''; knob.style.transform = ''; }
  };
  knob.addEventListener('pointerup', end(false));
  knob.addEventListener('pointercancel', end(true));
  el.addEventListener('click', e => {
    if (dongle.suppress || dongle.busy) return;
    if (e.detail === 0) { toggleClock(); return; }
    finish(0);
  });
})();
$('#dockDongle').addEventListener('click', toggleClock);

/* ======================= Planner events ======================= */
$('#list').addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'toggle-done') { ui.openDone = !ui.openDone; renderPlanner(); return; }
    const id = act.closest('[data-id]')?.dataset.id; if (!id) return;
    if (act.dataset.act === 'done') completeWithFeedback(id, act);
    else if (act.dataset.act === 'timer') toggleTimer(id);
    return;
  }
  const emptyBtn = e.target.closest('[data-empty]');
  if (emptyBtn) {
    const a = emptyBtn.dataset.empty;
    if (a === 'new') openComposer();
    else if (a === 'demo') loadDemo();
    else if (a === 'reset') { ui.kind = 'alle'; ui.q = ''; ui.day = null; ui.person = null; $('#search').value = ''; renderAll(); }
    return;
  }
  const row = e.target.closest('.item');
  if (row) openComposer(find(row.dataset.id));
});
$('#list').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.closest('button')) return;
  const row = e.target.closest('.item'); if (row) { e.preventDefault(); openComposer(find(row.dataset.id)); }
});
$('#filters').addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (!b) return; ui.kind = b.dataset.kind; renderPlanner(); });
$('#activeFilter').addEventListener('click', e => {
  const b = e.target.closest('[data-clear]'); if (!b) return;
  const k = b.dataset.clear;
  if (k === 'q') { ui.q = ''; $('#search').value = ''; } else ui[k] = null;
  renderAll();
});
$('#heroSide').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.hs === 'new') { openComposer(null, { kind: 'anfrage' }); return; }
  const p = b.dataset.hsName; ui.person = ui.person === p ? null : p; renderAll();
});
$('#focusBody').addEventListener('click', e => {
  const b = e.target.closest('[data-focus]'); if (!b || !focusId) return;
  const a = b.dataset.focus;
  if (a === 'done') completeItem(focusId);
  else if (a === 'timer') toggleTimer(focusId);
  else if (a === 'edit') openComposer(find(focusId));
});

function parseQuick(raw) {
  let s = ` ${raw} `, kind = null, from = '', asap = false;
  s = s.replace(/\s#(anfrage|todo|aufgabe)(?=\s)/i, (_, k) => { kind = k.toLowerCase(); return ' '; });
  s = s.replace(/\s@([\p{L}][\p{L}\p{N}._-]*)/u, (_, n) => { from = n.replace(/[._]+/g, ' ').trim(); return ' '; });
  if (/\s!+(?=\s)/.test(s) || /!\s*$/.test(s)) { asap = true; s = s.replace(/\s!+(?=\s)/g, ' ').replace(/!+\s*$/, ' '); }
  const title = s.replace(/\s+/g, ' ').trim();
  if (!kind) kind = from ? 'anfrage' : (ui.kind !== 'alle' ? ui.kind : 'todo');
  return { title, kind, from, mode: asap ? 'asap' : 'einmalig' };
}
$('#quickInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault();
    const p = parseQuick(e.target.value);
    e.target.value = '';
    openComposer(null, p);
  }
});
$('#quick').addEventListener('submit', e => {
  e.preventDefault();
  if (!S) return;
  const inp = $('#quickInput'), raw = inp.value.trim();
  if (!raw) { inp.focus(); return; }
  const p = parseQuick(raw);
  if (!p.title) { inp.focus(); return; }
  const now = Date.now();
  state.items.push(normItem({ id: uid(), ...p, createdAt: now, updatedAt: now }));
  inp.value = '';
  commit();
  toast(`${KINDS[p.kind].label} angelegt${p.from ? ' · von ' + p.from : ''}${p.mode === 'asap' ? ' · sofort' : ''}`);
});

const searchBox = $('#searchBox'), searchInput = $('#search');
let qTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { ui.q = searchInput.value.trim(); if (ui.q && mobileMQ.matches) setTab('aufgaben'); renderPlanner(); }, 90);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') { searchInput.value = ''; ui.q = ''; renderPlanner(); searchInput.blur(); } });
searchBox.addEventListener('click', () => { if (mobileMQ.matches) { searchBox.classList.add('expanded'); searchInput.focus(); } });
searchInput.addEventListener('blur', () => { if (!searchInput.value) searchBox.classList.remove('expanded'); });

$('#calGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-cal]'); if (!b) return;
  ui.day = ui.day === b.dataset.cal ? null : b.dataset.cal;
  renderCal(); renderPlanner();
  if (ui.day) { const n = state.items.filter(matches).length; if (!n) toast(`Keine Fristen am ${dateShort(fromKey(ui.day))}.`); }
});
$('#calPrev').addEventListener('click', () => { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() - 1); ui.calMonth = d.getTime(); renderCal(); });
$('#calNext').addEventListener('click', () => { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() + 1); ui.calMonth = d.getTime(); renderCal(); });
$('#wkChart').addEventListener('click', e => {
  const b = e.target.closest('[data-day]'); if (!b) return;
  ui.selDay = b.dataset.day === dayKey(Date.now()) ? null : b.dataset.day;
  renderWeek(); renderStamps(Date.now());
  showTip($(`.wk-col[data-day="${b.dataset.day}"]`));
});
function showTip(col) {
  const tip = $('#wkTip'); if (!tip || !col) return;
  const r = col.getBoundingClientRect(), pr = $('#wkChart').getBoundingClientRect();
  const bar = col.querySelector('.bar').getBoundingClientRect();
  tip.textContent = col.dataset.tip;
  tip.style.left = `${clamp(r.left + r.width / 2 - pr.left, 50, pr.width - 50)}px`;
  tip.style.top = `${bar.top - pr.top - 6}px`;
  tip.classList.add('show');
}
$('#wkChart').addEventListener('pointerover', e => { const c = e.target.closest('.wk-col'); if (c && e.pointerType === 'mouse') showTip(c); });
$('#wkChart').addEventListener('pointerleave', () => $('#wkTip')?.classList.remove('show'));
$('#wkChart').addEventListener('focusin', e => { const c = e.target.closest('.wk-col'); if (c) showTip(c); });
$('#wkChart').addEventListener('focusout', () => $('#wkTip')?.classList.remove('show'));

$('#newBtn').addEventListener('click', () => openComposer());
$('#newBtn2').addEventListener('click', () => openComposer());
$('#dockAdd').addEventListener('click', () => openComposer());

/* ======================= Tabs (mobile) ======================= */
function setTab(t) {
  document.body.dataset.tab = t;
  $$('.dock-btn[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
  try { sessionStorage.setItem('workoholic:tab', t); } catch (e) {}
}
$$('.dock-btn[data-tab]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); scrollTo({ top: 0 }); }));
try { const t = sessionStorage.getItem('workoholic:tab'); if (t === 'zeit' || t === 'aufgaben') setTab(t); } catch (e) {}

/* ======================= Menu ======================= */
const menu = $('#menu'), menuBtn = $('#menuBtn');
function openMenu() {
  $('#setName').value = state.settings.name;
  $('#setTarget').value = +(state.settings.targetMin / 60).toFixed(2);
  menu.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true');
}
function closeMenu() { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.contains('open') ? closeMenu() : openMenu(); });
document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
$('#setName').addEventListener('input', e => { state.settings.name = e.target.value.slice(0, 40); state.settings.u = Date.now(); save(); renderHero(); });
$('#setTarget').addEventListener('change', e => {
  const h = Number(String(e.target.value).replace(',', '.'));
  if (!Number.isFinite(h) || h < 0 || h > 24) { e.target.value = +(state.settings.targetMin / 60).toFixed(2); return; }
  state.settings.targetMin = Math.round(h * 60); state.settings.u = Date.now(); commit();
});
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
menu.addEventListener('click', async e => {
  const b = e.target.closest('[data-menu]'); if (!b || !S) return;
  const a = b.dataset.menu, stamp = dayKey(Date.now());
  closeMenu();
  if (a === 'security') openSecurity();
  else if (a === 'lock') lock('manual');
  else if (a === 'export') {
    await saveChain;
    download(`workoholic-tresor-${stamp}.vault`, V.serialize(S.env), 'application/octet-stream');
    toast('Verschlüsseltes Backup gespeichert');
  }
  else if (a === 'import') $('#importFile').click();
  else if (a === 'csv') {
    const r = await ask({ title: 'Unverschlüsselter Export', text: 'Die CSV-Datei enthält deine Arbeitszeiten im Klartext. Speichere sie nur an einem sicheren Ort.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'CSV erstellen', value: 'ok', cls: 'btn-accent', submit: true }] });
    if (!r) return;
    const rows = [['Datum', 'Wochentag', 'Eingedongelt', 'Ausgedongelt', 'Dauer (h:mm)', 'Dauer (Std dezimal)']];
    for (const st of state.stamps) {
      const end = st.out ?? Date.now();
      rows.push([new Date(st.in).toLocaleDateString('de-DE'), WDL[new Date(st.in).getDay()], hm(st.in), st.out ? hm(st.out) : 'läuft', dur(end - st.in), ((end - st.in) / HOUR).toFixed(2).replace('.', ',')]);
    }
    for (const k of Object.keys(state.adj).sort()) {
      const m = state.adj[k].m; if (!m) continue;
      const t = fromKey(k);
      rows.push([new Date(t).toLocaleDateString('de-DE'), WDL[new Date(t).getDay()], 'Nachtrag', '', dur(m * MIN), (m / 60).toFixed(2).replace('.', ',')]);
    }
    download(`workoholic-arbeitszeiten-${stamp}.csv`, '﻿' + rows.map(r => r.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    toast(`${rows.length - 1} Zeilen exportiert`);
  }
  else if (a === 'cleardone') {
    const done = state.items.filter(i => i.done);
    if (!done.length) { toast('Keine erledigten Einträge.'); return; }
    const snap = snapshot(), now = Date.now();
    state.items = state.items.filter(i => !i.done);
    done.forEach(i => { state.del[i.id] = now; });
    commit(); toast(`${done.length} erledigte entfernt`, { undo: snap });
  }
  else if (a === 'demo') loadDemo();
  else if (a === 'wipe') {
    const r = await ask({ title: 'Alles löschen?', text: 'Entfernt alle Einträge und Stempel – auch auf allen synchronisierten Geräten. Der Tresor selbst und dein Passwort bleiben bestehen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Alles löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
    if (!r) return;
    const snap = snapshot(); applyState(blank()); toast('Alles gelöscht', { undo: snap });
  }
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f || !S) return;
  let data = null;
  try {
    const text = await f.text();
    const raw = JSON.parse(text);
    if (raw && raw.format === 'workoholic-vault') {
      const env = V.parse(raw);
      const r = await ask({ title: 'Backup entschlüsseln', text: 'Gib das Master-Passwort ein, mit dem dieses Backup erstellt wurde.', password: true, placeholder: 'Passwort des Backups', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entschlüsseln', value: 'ok', cls: 'btn-accent', submit: true }] });
      if (!r) return;
      toast('Entschlüssle Backup …');
      await nextFrame();
      data = (await V.unlock(env, r.password)).data;
    } else if (raw && Array.isArray(raw.items) && Array.isArray(raw.stamps)) data = raw;
    else throw new Error('format');
  } catch (er) { toast(er.code === 'wrong-password' ? 'Falsches Passwort für dieses Backup.' : 'Datei ist kein gültiges Workoholic-Backup.'); return; }
  const next = normalize(data);
  const r = await ask({ title: 'Backup einspielen', text: `Das Backup enthält ${next.items.length} Einträge und ${next.stamps.length} Stempel. Zusammenführen behält alles Neuere; Ersetzen setzt den Stand exakt auf das Backup.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'replace', cls: 'btn-ghost btn-danger' }, { label: 'Zusammenführen', value: 'merge', cls: 'btn-accent', submit: true }] });
  if (!r) return;
  const snap = snapshot();
  if (r.value === 'replace') applyState(next);
  else { state = merge(state, next); commit(); }
  toast('Backup eingespielt', { undo: snap });
});

/* ======================= Demo data ======================= */
async function loadDemo() {
  if (state.items.length || state.stamps.length) {
    const r = await ask({ title: 'Beispieldaten laden?', text: 'Ersetzt deine aktuellen Einträge und Stempel (auch auf synchronisierten Geräten). Du kannst es direkt danach rückgängig machen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'ok', cls: 'btn-accent', submit: true }] });
    if (!r) return;
  }
  const snap = snapshot(), now = Date.now(), today = sod(now);
  const T = (dOff, h, m = 0) => { const d = new Date(today); d.setDate(d.getDate() + dOff); d.setHours(h, m, 0, 0); return d.getTime(); };
  const mk = o => normItem({ id: uid(), createdAt: now - (o.age || 0) * HOUR, updatedAt: now, ...o });
  const fri = (() => { let off = (5 - new Date(now).getDay() + 7) % 7; if (off === 0) off = 7; return off; })();
  const items = [
    mk({ title: 'Kurzer Blick auf den Vertragsentwurf', kind: 'anfrage', from: 'Jonas Weber', mode: 'asap', age: 1, notes: 'Klausel 4.2 – Haftung' }),
    mk({ title: 'Zahlen für die Q4-Präsentation', kind: 'anfrage', from: 'Sabine Krüger', mode: 'deadline', due: Math.max(now + 2.4 * HOUR, T(0, 16)), status: 'inarbeit', age: 20 }),
    mk({ title: 'Zugang zum Projektlaufwerk', kind: 'anfrage', from: 'Mehmet Yilmaz', mode: 'einmalig', status: 'wartet', age: 50, notes: 'Ticket bei der IT ist offen' }),
    mk({ title: 'Feedback zum Onboarding-Konzept', kind: 'anfrage', from: 'Sabine Krüger', mode: 'deadline', due: T(fri, 12), age: 30 }),
    mk({ title: 'Quartalsbericht · Kapitel 3', kind: 'aufgabe', from: 'Lena Hoffmann', mode: 'dauer', durMin: 240, spentMs: 95 * MIN, due: T(fri, 15), age: 70 }),
    mk({ title: 'Kundentermin Müller GmbH vorbereiten', kind: 'aufgabe', mode: 'deadline', due: T(1, 10), age: 26 }),
    mk({ title: 'Reisekostenabrechnung einreichen', kind: 'todo', mode: 'deadline', due: T(-1, 17), age: 96 }),
    mk({ title: 'Postfach auf Inbox Zero', kind: 'todo', mode: 'repeat', repeat: 'weekdays', due: T(0, 17, 30), age: 300 }),
    mk({ title: 'Wochenplanung', kind: 'todo', mode: 'repeat', repeat: 'weekly', due: T(fri, 14), age: 400 }),
    mk({ title: 'Ideen fürs Team-Event sammeln', kind: 'todo', mode: 'einmalig', age: 120 }),
    mk({ title: 'Urlaubsantrag stellen', kind: 'todo', mode: 'einmalig', done: true, doneAt: now - 1.5 * HOUR, age: 48 }),
    mk({ title: 'Rückruf Herr Schneider', kind: 'anfrage', from: 'Empfang', mode: 'asap', done: true, doneAt: now - 3 * HOUR, age: 5 })
  ];
  const stamps = [];
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 13; i >= 1; i--) {
    const d = new Date(T(-i, 0)); if (d.getDay() === 0 || d.getDay() === 6) continue;
    const a = T(-i, 7, 35 + Math.round(r() * 30)), b = T(-i, 12, Math.round(r() * 20)), c = b + (30 + Math.round(r() * 20)) * MIN, e = T(-i, 16, 10 + Math.round(r() * 70));
    stamps.push({ id: uid(), in: a, out: b }, { id: uid(), in: c, out: e });
  }
  const s1 = T(0, 7, 42), s1e = T(0, 12, 4), s2 = T(0, 12, 38);
  if (now > s2 + 5 * MIN) stamps.push({ id: uid(), in: s1, out: s1e }, { id: uid(), in: s2, out: null });
  else if (now > s1 + 5 * MIN) stamps.push({ id: uid(), in: s1, out: null });
  applyState({ items, stamps, del: {}, settings: { ...state.settings } });
  toast('Beispieldaten geladen', { undo: snap });
}

/* ======================= Synchronisierung ======================= */
const Sync = {
  st: 'off', msg: '', busy: false, dirty: false, again: false, halted: false, pushing: false, timer: 0, retry: 0, fails: 0, poll: 0,
  cfg() { const c = S && S.dev.sync; return c && c.token && c.owner && c.repo ? c : null; },
  gh() { return V.GitHub(this.cfg()); },
  set(st, msg = '') { this.st = st; this.msg = msg; renderSyncUi(); },
  start() {
    this.halted = false; this.fails = 0;
    this.dirty = !!(S && S.dev.pending);
    if (!this.poll) this.poll = setInterval(() => { if (S && !document.hidden && this.cfg() && !this.busy) this.run(); }, 60000);
    if (this.cfg()) this.run(); else this.set('off');
  },
  schedule(delay = 1200) {
    if (!this.cfg() || this.halted) return;
    this.dirty = true; clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), delay);
  },
  async run() {
    if (!S || !this.cfg() || this.halted) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; clearTimeout(this.retry); this.set('busy');
    try {
      await saveChain;
      if (this.dirty) await this.push();
      else if (await this.pull()) await this.push();
      this.fails = 0;
      if (S) { S.dev.lastSync = Date.now(); saveDevice(); }
      this.set('ok');
    } catch (e) { this.fail(e); }
    finally {
      this.busy = false; this.pushing = false;
      if (this.again && !this.halted) { this.again = false; this.run(); }
    }
  },
  /** Holt den entfernten Stand und führt ihn zusammen. true = Remote braucht unseren Stand. */
  async pull() {
    const r = await this.gh().get();
    if (!S) return false;
    if (!r) { S.dev.sha = null; return true; }
    if (r.sha === S.dev.sha) return false;
    const env = V.parse(r.text);
    let data;
    try { data = await V.decryptJson(S.dek, env.data); }
    catch (e) { const er = new Error('Im Repo liegt ein Tresor mit anderem Schlüssel.'); er.code = 'foreign'; er.sha = r.sha; throw er; }
    let keysChanged = false, keysRejected = false;
    if ((env.kts || 0) > (S.env.kts || 0)) {
      if (await V.verifyKeys(S.dek, env)) { S.env.kdf = env.kdf; S.env.keys = env.keys; S.env.kts = env.kts; keysChanged = true; }
      else keysRejected = true; // nicht von einem deiner Geräte signiert → ignorieren und mit eigenem Stand überschreiben
    }
    const remote = normalize(data);
    const before = JSON.stringify(state);
    state = merge(state, remote);
    const after = JSON.stringify(state);
    S.dev.sha = r.sha; saveDevice();
    if (after !== before || keysChanged) persist();
    if (after !== before) renderAll();
    return keysRejected || after !== JSON.stringify(remote) || (S.env.kts || 0) > (env.kts || 0);
  },
  async push() {
    this.pushing = true;
    for (let i = 0; i < 4; i++) {
      this.dirty = false;
      await saveChain;
      if (!S) return;
      const text = V.serialize(S.env);
      try {
        let sha = null;
        if (S.dev.sha && Date.now() - (S.dev.lastSquash || 0) > DAY) {
          S.dev.lastSquash = Date.now();
          try { sha = await this.gh().squash(text, S.dev.sha); }
          catch (e) { if (['auth', 'offline', 'ratelimit'].includes(e.code)) throw e; sha = null; }
        }
        if (!sha) sha = await this.gh().put(text, S.dev.sha);
        S.dev.sha = sha;
        if (!this.dirty) { S.dev.pending = false; saveDevice(); this.pushing = false; return; }
        saveDevice();
      } catch (e) {
        if (e.code === 'conflict') { await this.pull(); this.dirty = true; continue; }
        if (e.code === 'notfound' && S.dev.sha) { S.dev.sha = null; this.dirty = true; continue; }
        throw e;
      }
    }
    const er = new Error('Zu viele gleichzeitige Änderungen – versuche es gleich erneut.'); er.code = 'busy'; throw er;
  },
  fail(e) {
    if (this.pushing) this.dirty = true;
    const hard = { auth: 'Token ungültig oder abgelaufen', forbidden: 'Token ohne Schreibrecht für das Repo', norepo: 'Repo nicht erreichbar', notfound: 'Repo oder Branch nicht erreichbar', foreign: 'Im Repo liegt ein fremder Tresor', 'bad-vault': 'Datei im Repo ist kein Tresor', 'weak-kdf': 'Tresor im Repo hat unsichere Parameter' };
    if (hard[e.code]) { this.halted = true; this.foreignSha = e.sha || null; this.set('error', hard[e.code]); return; }
    this.fails++;
    const wait = e.code === 'ratelimit' ? 10 * MIN : Math.min(5 * MIN, 15000 * 2 ** (this.fails - 1));
    this.set(e.code === 'offline' ? 'offline' : 'error', e.code === 'offline' ? 'Offline – wird automatisch nachgeholt' : (e.message || 'Unbekannter Fehler'));
    this.retry = setTimeout(() => this.run(), wait);
  }
};
addEventListener('online', () => { if (S && Sync.cfg()) Sync.run(); });

function renderSyncUi() {
  const pill = $('#syncPill'); if (!pill) return;
  const st = Sync.cfg() ? Sync.st : 'off';
  const last = S && S.dev.lastSync ? hm(S.dev.lastSync) : '';
  const labels = { off: 'Nur lokal', busy: 'Sync …', ok: last ? `Synchron · ${last}` : 'Synchron', offline: 'Offline', error: 'Sync-Fehler' };
  pill.dataset.s = st;
  $('#syncLbl').textContent = labels[st];
  pill.title = st === 'off' ? 'Verschlüsselt, nur auf diesem Gerät – Sync in „Sicherheit & Sync“ einrichten' : `Ende-zu-Ende verschlüsselt · ${labels[st]}${Sync.msg ? ' – ' + Sync.msg : ''}`;
  const box = $('#secSync');
  if (box && S) {
    const c = Sync.cfg();
    let t;
    if (!c) t = 'Nicht verbunden – deine Daten liegen verschlüsselt nur auf diesem Gerät.';
    else if (st === 'error') t = `Fehler: ${Sync.msg}.`;
    else if (st === 'offline') t = 'Offline – Änderungen werden nachgeholt, sobald du wieder online bist.';
    else if (st === 'busy') t = `Synchronisiere mit ${c.owner}/${c.repo} …`;
    else t = `Verbunden mit ${c.owner}/${c.repo}${last ? ` · zuletzt ${last}` : ''}.`;
    box.textContent = t;
    box.dataset.s = c ? st : 'off';
    $('#ghNow').hidden = !c; $('#ghOff').hidden = !c;
    $('#ghOverwrite').hidden = !(c && Sync.halted && Sync.foreignSha);
    $('#ghSave').textContent = c ? 'Speichern' : 'Verbinden';
  }
}

/* ======================= Sicherheit & Sync (Dialog) ======================= */
function parseRepo(s) {
  const m = /^(?:https?:\/\/github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/.exec(String(s).trim());
  return m ? { owner: m[1], repo: m[2] } : null;
}
function meter(input, bar, label) {
  const upd = () => { const s = V.strength(input.value); bar.style.transform = `scaleX(${input.value ? Math.max(.08, s.level / 4) : 0})`; bar.dataset.level = s.level; label.textContent = s.label; };
  input.addEventListener('input', upd); upd();
  return upd;
}
async function busyBtn(btn, label, fn) {
  const old = btn.innerHTML; btn.disabled = true; btn.textContent = label;
  await nextFrame();
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}
function openSecurity() {
  if (!S) return;
  closeMenu();
  const c = S.dev.sync || {};
  $('#ghRepo').value = c.owner ? `${c.owner}/${c.repo}` : '';
  $('#ghBranch').value = c.branch || '';
  $('#ghPath').value = c.path && c.path !== 'workoholic.vault' ? c.path : '';
  $('#ghToken').value = '';
  $('#ghToken').placeholder = c.token ? '•••••••• gespeichert – leer lassen = unverändert' : 'github_pat_…';
  $('#secErr').textContent = '';
  $$('#autoLock button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === S.dev.autoLock)));
  ['pwCur', 'pwNew', 'pwNew2', 'rkCur'].forEach(id => { $('#' + id).value = ''; });
  $('#rkOut').hidden = true; $('#rkOutKey').textContent = '';
  pwMeter();
  renderSyncUi();
  openDlg($('#secDlg'));
}
const pwMeter = meter($('#pwNew'), $('#pwMeter'), $('#pwMeterLbl'));
$('#syncPill').addEventListener('click', openSecurity);
$('#lockBtn').addEventListener('click', () => lock('manual'));
$('#secLock').addEventListener('click', () => lock('manual'));
$('#autoLock').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S) return;
  S.dev.autoLock = Number(b.dataset.v); saveDevice();
  $$('#autoLock button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});
$('#ghForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!S) return;
  const errEl = $('#secErr'); errEl.textContent = '';
  const repo = parseRepo($('#ghRepo').value);
  if (!repo) { errEl.textContent = 'Repo bitte als „besitzer/name“ angeben.'; return; }
  const old = S.dev.sync || {};
  const token = $('#ghToken').value.trim() || (old.owner === repo.owner && old.repo === repo.repo ? old.token : '');
  if (!token) { errEl.textContent = 'Bitte einen GitHub-Token eintragen.'; return; }
  const cfg = { ...repo, token, branch: $('#ghBranch').value.trim(), path: $('#ghPath').value.trim().replace(/^\/+/, '') || 'workoholic.vault' };
  await busyBtn($('#ghSave'), 'Prüfe …', async () => {
    try {
      const gh = V.GitHub(cfg);
      const info = await gh.repoInfo();
      if (!info.private) { errEl.textContent = 'Das Repo ist öffentlich. Nimm ein privates Repo – Verschlüsselung plus Zugriffsschutz.'; return; }
      const r = await gh.get();
      if (r) {
        let ok = true;
        try { await V.decryptJson(S.dek, V.parse(r.text).data); } catch (er) { ok = false; }
        if (!ok) {
          const a = await ask({ title: 'Fremder Tresor im Repo', text: 'In diesem Repo liegt schon ein Tresor, der nicht zu diesem passt. Überschreiben löscht ihn endgültig (bis auf den Git-Verlauf).', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Überschreiben', value: 'ok', cls: 'btn-ghost btn-danger' }] });
          if (!a) return;
          S.dev.sync = cfg; S.dev.sha = r.sha; S.dev.pending = true; S.dev.lastSquash = 0; saveDevice();
          Sync.halted = false; Sync.dirty = true; $('#ghToken').value = ''; Sync.run(); return;
        }
      }
      const changedTarget = !old.owner || old.owner !== cfg.owner || old.repo !== cfg.repo || (old.branch || '') !== cfg.branch || (old.path || 'workoholic.vault') !== cfg.path;
      S.dev.sync = cfg;
      if (changedTarget) { S.dev.sha = null; S.dev.lastSquash = Date.now(); }
      saveDevice();
      $('#ghToken').value = ''; $('#ghToken').placeholder = '•••••••• gespeichert – leer lassen = unverändert';
      Sync.halted = false; Sync.fails = 0; Sync.dirty = !!S.dev.pending;
      Sync.run();
      toast('Sync eingerichtet – nur Chiffretext verlässt dein Gerät.');
    } catch (er) {
      errEl.textContent = er.code === 'auth' ? 'Token ungültig oder abgelaufen.' : er.code === 'offline' ? 'Keine Verbindung zu GitHub.' : (er.message || 'Fehler beim Verbinden.');
    }
  });
});
$('#ghNow').addEventListener('click', () => { Sync.halted = false; Sync.fails = 0; Sync.run(); });
$('#ghOverwrite').addEventListener('click', async () => {
  const a = await ask({ title: 'Entfernten Tresor überschreiben?', text: 'Der Tresor im Repo passt nicht zu diesem Gerät. Überschreiben ersetzt ihn durch deinen Stand.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Überschreiben', value: 'ok', cls: 'btn-ghost btn-danger' }] });
  if (!a || !S) return;
  S.dev.sha = Sync.foreignSha; S.dev.pending = true; S.dev.lastSquash = 0; saveDevice();
  Sync.foreignSha = null; Sync.halted = false; Sync.dirty = true; Sync.run();
});
$('#ghOff').addEventListener('click', async () => {
  const a = await ask({ title: 'Sync trennen?', text: 'Dieses Gerät synchronisiert dann nicht mehr. Der verschlüsselte Tresor im Repo bleibt erhalten; der Token wird von diesem Gerät entfernt.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Trennen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!a || !S) return;
  S.dev.sync = null; S.dev.sha = null; S.dev.pending = false; saveDevice();
  clearTimeout(Sync.timer); clearTimeout(Sync.retry); Sync.set('off');
  openSecurity();
});
$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!S) return;
  const errEl = $('#pwErr'); errEl.textContent = '';
  const cur = $('#pwCur').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
  if (V.strength(n1).level < 2) { errEl.textContent = 'Neues Passwort zu schwach – mindestens 12 Zeichen, besser ein Satz aus mehreren Wörtern.'; return; }
  if (n1 !== n2) { errEl.textContent = 'Die neuen Passwörter stimmen nicht überein.'; return; }
  await busyBtn($('#pwSave'), 'Verschlüssle …', async () => {
    try {
      await saveChain;
      const { env } = await V.rekey(S.env, cur, n1);
      await saveChain;
      S.env = { ...env, data: S.env.data }; writeEnv(); // neueste Daten behalten, falls während der Ableitung gespeichert wurde
      ['pwCur', 'pwNew', 'pwNew2'].forEach(id => { $('#' + id).value = ''; }); pwMeter();
      if (Sync.cfg()) { S.dev.pending = true; saveDevice(); Sync.schedule(200); }
      toast('Master-Passwort geändert');
    } catch (er) { errEl.textContent = er.code === 'wrong-password' ? 'Aktuelles Passwort ist falsch.' : (er.message || 'Fehler'); }
  });
});
$('#rkForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!S) return;
  const errEl = $('#rkErr'); errEl.textContent = '';
  const cur = $('#rkCur').value;
  if (!cur) { $('#rkCur').focus(); return; }
  await busyBtn($('#rkSave'), 'Erzeuge …', async () => {
    try {
      await saveChain;
      const { env, recoveryKey } = await V.rekey(S.env, cur, cur, true);
      await saveChain;
      S.env = { ...env, data: S.env.data }; writeEnv();
      $('#rkCur').value = '';
      $('#rkOutKey').textContent = recoveryKey; $('#rkOut').hidden = false;
      if (Sync.cfg()) { S.dev.pending = true; saveDevice(); Sync.schedule(200); }
      toast('Neuer Wiederherstellungsschlüssel – der alte ist ungültig.');
    } catch (er) { errEl.textContent = er.code === 'wrong-password' ? 'Passwort ist falsch.' : (er.message || 'Fehler'); }
  });
});
function copySecret(text) {
  if (!navigator.clipboard) { toast('Kopieren nicht möglich – bitte abschreiben.'); return; }
  navigator.clipboard.writeText(text).then(() => {
    toast('Kopiert – Zwischenablage wird in 60 s geleert.');
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 60000);
  }).catch(() => toast('Kopieren nicht möglich – bitte abschreiben.'));
}
$('#rkOutCopy').addEventListener('click', () => copySecret($('#rkOutKey').textContent));

/* ======================= Sperre & Zugang ======================= */
let lastAct = Date.now();
const bump = () => { lastAct = Date.now(); };
['pointerdown', 'keydown', 'wheel', 'touchstart', 'input'].forEach(ev => addEventListener(ev, bump, { passive: true, capture: true }));

async function lock(reason) {
  if (!S) return;
  try { await saveChain; await devChain; } catch (e) { /* weiter */ }
  try { sessionStorage.setItem('workoholic:lockmsg', reason || ''); } catch (e) {}
  S = null; state = blank();
  location.reload(); // räumt Klartext und Schlüssel vollständig aus dem Speicher
}

function showGate(mode, msg = '') {
  document.body.classList.add('locked');
  document.title = 'Workoholic';
  $$('[data-gate]').forEach(p => { p.hidden = p.dataset.gate !== mode; });
  $$('.gate-err').forEach(el => { el.textContent = ''; });
  const pane = $(`[data-gate="${mode}"]`);
  const m = pane.querySelector('.gate-msg');
  if (m && msg) m.textContent = msg;
  setTimeout(() => { const f = pane.querySelector('input:not([type=checkbox])'); if (f) f.focus(); }, 60);
}
function gateErr(form, text) {
  const el = form.querySelector('.gate-err'); el.textContent = text;
  if (!reduceMotion.matches) form.closest('.gate-card').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' });
}
$$('[data-goto]').forEach(b => b.addEventListener('click', () => showGate(b.dataset.goto)));

const gsMeter = meter($('#gsPw1'), $('#gsMeter'), $('#gsMeterLbl'));
const grMeter = meter($('#grPw1'), $('#grMeter'), $('#grMeterLbl'));

function enterApp(notice) {
  document.body.classList.remove('locked');
  lastAct = Date.now();
  setPlaceholders();
  lastMinute = -1;
  renderAll();
  orb.start();
  Sync.start();
  if (notice) toast(notice, { ms: 6500 });
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* optional */ }
}

let unlockFails = 0, waitUntil = 0;
$('#gLock').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget, input = $('#gLockPw');
  if (!lockedEnv) { gateErr(form, 'Kein lesbarer Tresor auf diesem Gerät.'); return; }
  if (Date.now() < waitUntil) { gateErr(form, `Zu viele Versuche – bitte ${Math.ceil((waitUntil - Date.now()) / 1000)} s warten.`); return; }
  if (!input.value) { input.focus(); return; }
  await busyBtn(form.querySelector('[type=submit]'), 'Entschlüssle …', async () => {
    try {
      const { dek, data } = await V.unlock(lockedEnv, input.value);
      input.value = '';
      S = { env: lockedEnv, dek, dev: await loadDevice(dek) };
      state = normalize(data);
      unlockFails = 0;
      enterApp('');
    } catch (er) {
      if (er.code === 'wrong-password') {
        unlockFails++;
        if (unlockFails >= 3) waitUntil = Date.now() + Math.min(60000, 1000 * 2 ** (unlockFails - 2));
        gateErr(form, 'Falsches Passwort.');
        input.select();
      } else gateErr(form, er.message || 'Entsperren fehlgeschlagen.');
    }
  });
});

$('#gSetup').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget, p1 = $('#gsPw1').value, p2 = $('#gsPw2').value;
  const s = V.strength(p1);
  if (s.level < 1) return gateErr(form, 'Mindestens 12 Zeichen.');
  if (s.level < 2) return gateErr(form, 'Zu schwach. Tipp: ein Satz aus 4–5 Wörtern, z. B. mit Zahl oder Zeichen.');
  if (p1 !== p2) return gateErr(form, 'Die Passwörter stimmen nicht überein.');
  await busyBtn(form.querySelector('[type=submit]'), 'Verschlüssle …', async () => {
    try {
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem(LS.legacy) || 'null'); } catch (er) {}
      const data = normalize(legacy || blank());
      const { env, dek, recoveryKey } = await V.create(p1, data);
      S = { env, dek, dev: defDev() };
      state = data;
      writeEnv(); await saveDevice();
      if (legacy) {
        const n = (localStorage.getItem(LS.legacy) || '').length;
        try { localStorage.setItem(LS.legacy, '0'.repeat(n)); } catch (er) {}
        localStorage.removeItem(LS.legacy);
      }
      $('#gsPw1').value = ''; $('#gsPw2').value = ''; gsMeter();
      $('#gRk').textContent = recoveryKey;
      $('#gRkOk').checked = false; $('#gRkGo').disabled = true;
      showGate('rkshow');
    } catch (er) { gateErr(form, er.message || 'Einrichtung fehlgeschlagen.'); }
  });
});
$('#gRkCopy').addEventListener('click', () => copySecret($('#gRk').textContent));
$('#gRkOk').addEventListener('change', e => { $('#gRkGo').disabled = !e.target.checked; });
$('#gRkGo').addEventListener('click', () => {
  $('#gRk').textContent = '';
  enterApp('Tresor angelegt – ab jetzt wird alles verschlüsselt gespeichert.');
});

$('#gConnect').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const repo = parseRepo($('#gcRepo').value);
  if (!repo) return gateErr(form, 'Repo bitte als „besitzer/name“ angeben.');
  const token = $('#gcToken').value.trim();
  if (!token) return gateErr(form, 'Bitte den GitHub-Token eintragen.');
  const pw = $('#gcPw').value;
  if (!pw) return gateErr(form, 'Bitte das Master-Passwort eingeben.');
  const cfg = { ...repo, token, branch: $('#gcBranch').value.trim(), path: $('#gcPath').value.trim().replace(/^\/+/, '') || 'workoholic.vault' };
  await busyBtn(form.querySelector('[type=submit]'), 'Lade Tresor …', async () => {
    try {
      const gh = V.GitHub(cfg);
      const info = await gh.repoInfo();
      if (!info.private) return gateErr(form, 'Das Repo ist öffentlich. Bitte ein privates Repo verwenden.');
      const r = await gh.get();
      if (!r) return gateErr(form, 'Im Repo liegt noch kein Tresor. Richte ihn zuerst auf einem Gerät ein und verbinde dort GitHub.');
      const env = V.parse(r.text);
      const btn = form.querySelector('[type=submit]'); btn.textContent = 'Entschlüssle …'; await nextFrame();
      const { dek, data } = await V.unlock(env, pw);
      $('#gcPw').value = ''; $('#gcToken').value = '';
      S = { env, dek, dev: { ...defDev(), sync: cfg, sha: r.sha, lastSquash: Date.now() } };
      state = normalize(data);
      writeEnv(); saveDevice();
      enterApp('Gerät verbunden – Tresor hier entschlüsselt.');
    } catch (er) {
      gateErr(form, er.code === 'wrong-password' ? 'Falsches Master-Passwort.' : er.code === 'auth' ? 'Token ungültig oder abgelaufen.' : er.code === 'offline' ? 'Keine Verbindung zu GitHub.' : (er.message || 'Verbinden fehlgeschlagen.'));
    }
  });
});

$('#gRecover').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!lockedEnv) return gateErr(form, 'Kein lesbarer Tresor auf diesem Gerät.');
  const key = $('#grKey').value, p1 = $('#grPw1').value, p2 = $('#grPw2').value;
  if (!key.trim()) return gateErr(form, 'Bitte den Wiederherstellungsschlüssel eingeben.');
  if (V.strength(p1).level < 2) return gateErr(form, 'Neues Passwort zu schwach – mindestens 12 Zeichen.');
  if (p1 !== p2) return gateErr(form, 'Die Passwörter stimmen nicht überein.');
  await busyBtn(form.querySelector('[type=submit]'), 'Stelle wieder her …', async () => {
    try {
      const { dek, data, env } = await V.recover(lockedEnv, key, p1);
      ['grKey', 'grPw1', 'grPw2'].forEach(id => { $('#' + id).value = ''; }); grMeter();
      S = { env, dek, dev: await loadDevice(dek) };
      state = normalize(data);
      writeEnv();
      if (S.dev.sync) { S.dev.pending = true; saveDevice(); }
      enterApp('Neues Master-Passwort gesetzt.');
    } catch (er) { gateErr(form, er.message || 'Wiederherstellung fehlgeschlagen.'); }
  });
});

$('#gForgetGo').addEventListener('click', () => {
  localStorage.removeItem(LS.vault);
  localStorage.removeItem(LS.device);
  lockedEnv = null;
  $('#gLegacy').hidden = !localStorage.getItem(LS.legacy);
  showGate('setup');
});

addEventListener('storage', async e => {
  if (e.key !== LS.vault) return;
  if (!e.newValue) { if (S) { S = null; location.reload(); } return; }
  if (!S) { try { lockedEnv = V.parse(e.newValue); } catch (er) {} return; }
  try {
    const env = V.parse(e.newValue);
    const other = normalize(await V.decryptJson(S.dek, env.data));
    if ((env.kts || 0) > (S.env.kts || 0) && await V.verifyKeys(S.dek, env)) { S.env.kdf = env.kdf; S.env.keys = env.keys; S.env.kts = env.kts; }
    const before = JSON.stringify(state);
    state = merge(state, other);
    const after = JSON.stringify(state);
    if (after !== before) renderAll();
    if (after !== JSON.stringify(other)) persist();
  } catch (er) { /* anderer Tab mit anderem Tresor */ }
});

/* ======================= Keyboard ======================= */
document.addEventListener('keydown', e => {
  if (!S) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if ($('dialog[open]')) return;
  if (e.key === 'Escape') { closeMenu(); return; }
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); openComposer(); }
  else if (e.key === '/') { e.preventDefault(); if (mobileMQ.matches) searchBox.classList.add('expanded'); searchInput.focus(); }
  else if (k === 'd' && !e.repeat) { e.preventDefault(); toggleClock(); }
  else if (k === 'l') { e.preventDefault(); lock('manual'); }
});

/* ======================= Tick ======================= */
function tick() {
  const now = Date.now();
  if (!S) { const d = new Date(now); $('#gateClock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; return; }
  if (now - lastAct > (S.dev.autoLock || 15) * MIN) { lock('idle'); return; }
  const minute = Math.floor(now / MIN);
  if (minute !== lastMinute) { lastMinute = minute; renderAll(); }
  else updateLive(now);
}
const setPlaceholders = () => { $('#quickInput').placeholder = mobileMQ.matches ? 'Schnell erfassen … @Name, !' : 'Schnell erfassen … z. B. @Sabine Zahlen schicken !'; };
mobileMQ.addEventListener?.('change', () => { setPlaceholders(); if (S) { renderHero(); renderTime(); } });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (S && Date.now() - lastAct > (S.dev.autoLock || 15) * MIN) { lock('idle'); return; }
  lastMinute = -1; tick();
  if (S && Sync.cfg()) Sync.run();
});

/* ======================= Tastatur & sichtbarer Bereich (iOS) ======================= */
(() => {
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement;
  const upd = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--kb', kb + 'px');
    root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    root.classList.toggle('kb-open', kb > 80);
  };
  vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd); upd();
  document.addEventListener('focusin', e => {
    const f = e.target.closest('.sheet input, .sheet textarea, .gate input');
    if (f && mobileMQ.matches) setTimeout(() => { upd(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 320);
  });
})();

/* ======================= Start ======================= */
function boot() {
  let reason = '';
  try { reason = sessionStorage.getItem('workoholic:lockmsg') || ''; sessionStorage.removeItem('workoholic:lockmsg'); } catch (e) {}
  if (!window.hashwasm || !window.crypto || !crypto.subtle) {
    showGate('lock');
    $('#gLockMsg').textContent = 'Dieser Browser unterstützt die nötige Verschlüsselung nicht (Seite bitte über https öffnen).';
    return;
  }
  const raw = localStorage.getItem(LS.vault);
  if (raw) {
    try { lockedEnv = V.parse(raw); } catch (e) { lockedEnv = null; }
    showGate('lock', reason === 'idle' ? 'Automatisch gesperrt wegen Inaktivität. Gib dein Master-Passwort ein.' : reason === 'manual' ? 'Gesperrt. Gib dein Master-Passwort ein, um weiterzumachen.' : '');
    if (!lockedEnv) $('#gLockMsg').textContent = 'Der Tresor auf diesem Gerät ist beschädigt. Entferne ihn und verbinde dich neu mit GitHub oder spiele ein Backup ein.';
  } else {
    $('#gLegacy').hidden = !localStorage.getItem(LS.legacy);
    showGate('setup');
  }
  tick();
}
setInterval(tick, 1000);
boot();
})();
