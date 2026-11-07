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
  chev: '<path d="M9.5 6l6 6-6 6"/>',
  clockplus: '<circle cx="11" cy="12.5" r="7.5"/><path d="M11 8.5v4l2.6 1.6"/><path d="M19.5 2.5v5M17 5h5"/>',
  file: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5V8h4"/>',
  doc: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 19.5h14"/>'
};
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const KINDS = {
  anfrage: { label: 'Anfrage', plural: 'Anfragen', icon: 'user' },
  todo: { label: 'Todo', plural: 'Todos', icon: 'todo' },
  aufgabe: { label: 'Aufgabe', plural: 'Aufgaben', icon: 'brief' },
  buchung: { label: 'Stundenbuchung', plural: 'Buchungen', icon: 'clockplus' }
};
const MODES = { einmalig: 'Einmalig', deadline: 'Ultimatum', dauer: 'Dauer', asap: 'Schnellstmöglich', repeat: 'Wiederkehrend' };
const STATUS = { offen: 'Offen', inarbeit: 'In Arbeit', wartet: 'Wartet' };
const REPEATS = { daily: 'täglich', weekdays: 'werktags', weekly: 'wöchentlich', monthly: 'monatlich' };

/* ======================= State model ======================= */
const COLORS = { lime: '#c6dc7a', gelb: '#ecd96f', koralle: '#f0876a', blau: '#8fb3e8', mauve: '#c9a9a0' };
const COLOR_NAMES = { lime: 'Limette', gelb: 'Gelb', koralle: 'Koralle', blau: 'Blau', mauve: 'Mauve' };
const defaultTpls = () => [
  { id: 'tpl-frueh', name: 'Frühdienst', start: '06:00', end: '14:00', breakMin: 30, color: 'gelb', u: 1 },
  { id: 'tpl-spaet', name: 'Spätdienst', start: '14:00', end: '22:00', breakMin: 30, color: 'koralle', u: 1 },
  { id: 'tpl-nacht', name: 'Nachtdienst', start: '22:00', end: '06:00', breakMin: 45, color: 'blau', u: 1 },
  { id: 'tpl-tag', name: 'Tagdienst', start: '08:00', end: '16:30', breakMin: 30, color: 'lime', u: 1 }
];
const blank = () => ({ v: 3, items: [], shifts: [], tpls: defaultTpls(), appts: [], routines: [], runs: [], people: [], notes: [], files: [], del: {}, settings: { targetMin: 480, name: '', u: 0 } });
const RHYTHMS = { manual: 'Bei Bedarf', daily: 'Täglich', weekdays: 'Werktags', weekly: 'Wöchentlich', monthly: 'Monatlich' };
const COLLECTIONS = ['items', 'shifts', 'tpls', 'appts', 'routines', 'runs', 'people', 'notes', 'files'];
const keyOf = g => g === 'items' ? 'updatedAt' : 'u';
const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : null;
const isKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
const isHM = t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

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
    bDate: isKey(x.bDate) ? x.bDate : null,
    bShift: String(x.bShift || '').slice(0, 40),
    bMin: clamp(Math.round(Number(x.bMin) || 0), 0, 24 * 60),
    createdAt: num(x.createdAt) || now,
    updatedAt: num(x.updatedAt) || now
  };
  if (it.mode === 'repeat' && !it.repeat) it.repeat = 'daily';
  if ((it.mode === 'deadline' || it.mode === 'repeat') && it.due == null) it.mode = 'einmalig';
  if (it.mode === 'asap' || it.mode === 'einmalig') it.due = null;
  if (it.mode !== 'repeat') { it.repeat = null; it.repDay = null; }
  if (it.kind !== 'buchung') { it.bDate = null; it.bShift = ''; it.bMin = 0; }
  return it;
}
function normShift(x) {
  const start = num(x && x.start);
  if (start == null) return null;
  let pe = num(x.plannedEnd); if (pe == null || pe < start) pe = start;
  const end = num(x.end);
  return {
    id: String(x.id || uid()),
    date: isKey(x.date) ? x.date : dayKey(start),
    name: String(x.name || '').slice(0, 40).trim() || 'Dienst',
    color: COLORS[x.color] ? x.color : 'lime',
    start, plannedEnd: pe,
    end: end != null && end >= start ? end : null,
    live: !!x.live,
    breakMin: clamp(Math.round(Number(x.breakMin) || 0), 0, 240),
    extraMin: clamp(Math.round(Number(x.extraMin) || 0), 0, 24 * 60),
    u: num(x.u) || 1
  };
}
function normTpl(x) {
  if (!x || !isHM(x.start) || !isHM(x.end)) return null;
  return { id: String(x.id || uid()), name: String(x.name || '').slice(0, 40).trim() || 'Dienst', start: x.start, end: x.end, breakMin: clamp(Math.round(Number(x.breakMin) || 0), 0, 240), color: COLORS[x.color] ? x.color : 'lime', u: num(x.u) || 1 };
}
const str = (v, n) => String(v ?? '').slice(0, n);
function normAppt(x) {
  const start = num(x && x.start);
  if (start == null || !x.title) return null;
  let end = num(x.end); if (end == null || end < start) end = start;
  const al = Number(x.alarm);
  return { id: String(x.id || uid()), title: str(x.title, 200).trim() || 'Termin', start, end, allDay: !!x.allDay, location: str(x.location, 200), notes: str(x.notes, 4000),
    alarm: Number.isFinite(al) && al >= 0 ? Math.min(Math.round(al), 7 * 24 * 60) : -1, u: num(x.u) || 1 };
}
function normRoutine(x) {
  if (!x || !x.name) return null;
  const seen = new Set();
  const steps = (Array.isArray(x.steps) ? x.steps : []).filter(st => st && st.text).slice(0, 100).map(st => {
    let id = String(st.id || uid()); if (seen.has(id)) id = uid(); seen.add(id);
    return { id, text: str(st.text, 300) };
  });
  return { id: String(x.id || uid()), name: str(x.name, 60).trim() || 'Routine', color: COLORS[x.color] ? x.color : 'lime', rhythm: RHYTHMS[x.rhythm] ? x.rhythm : 'manual', steps, note: str(x.note, 1000), u: num(x.u) || 1 };
}
function normRun(x) {
  const started = num(x && x.started);
  if (started == null || !x.rid) return null;
  const done = {};
  for (const k of Object.keys(x.done || {}).sort()) { const v = num(x.done[k]); if (v) done[k] = v; }
  return { id: String(x.id || uid()), rid: String(x.rid), started, done, finished: num(x.finished), u: num(x.u) || 1 };
}
function normPerson(x) {
  if (!x || !x.name) return null;
  const roles = [];
  for (const r of (Array.isArray(x.roles) ? x.roles : [])) { const t = str(r, 40).trim(); if (t && !roles.includes(t) && roles.length < 12) roles.push(t); }
  return { id: String(x.id || uid()), name: str(x.name, 80).trim() || 'Person', roles, parent: x.parent ? String(x.parent) : null, contact: str(x.contact, 200), u: num(x.u) || 1 };
}
function normNote(x) {
  const at = num(x && x.at);
  if (at == null || !x.pid || !x.text) return null;
  return { id: String(x.id || uid()), pid: String(x.pid), text: str(x.text, 5000), at, edited: num(x.edited), u: num(x.u) || 1 };
}
function normFile(x) {
  if (!x || !x.name) return null;
  return { id: String(x.id || uid()), name: str(x.name, 200).trim() || 'Datei', type: str(x.type, 100), size: Math.max(0, Math.round(Number(x.size) || 0)), folder: str(x.folder, 60).trim(), note: str(x.note, 1000), added: num(x.added) || 1, remote: !!x.remote, u: num(x.u) || 1 };
}
function normList(arr, fn) {
  const m = new Map();
  for (const x of (Array.isArray(arr) ? arr : [])) {
    const o = x && fn(x); if (!o) continue;
    const c = m.get(o.id);
    if (!c || o.u > c.u || (o.u === c.u && JSON.stringify(o) > JSON.stringify(c))) m.set(o.id, o);
  }
  return [...m.values()];
}
const byName = (a, c) => cmp(a.name.toLowerCase(), c.name.toLowerCase()) || cmp(a.id, c.id);

/** Alte Stempel (+15-Nachträge) werden zu Diensten – deterministisch, damit alle Geräte dasselbe erzeugen. */
function migrateStamps(s) {
  const out = [], byDay = {};
  for (const st of (Array.isArray(s.stamps) ? s.stamps : [])) {
    if (!st || num(st.in) == null) continue;
    (byDay[dayKey(st.in)] = byDay[dayKey(st.in)] || []).push(st);
  }
  const adj = s.adj && typeof s.adj === 'object' ? s.adj : {};
  for (const k of new Set([...Object.keys(byDay), ...Object.keys(adj).filter(isKey)])) {
    const arr = (byDay[k] || []).sort((a, b) => a.in - b.in);
    const extra = Math.round(Number(adj[k] && adj[k].m) || 0);
    if (!arr.length) {
      if (extra > 0) { const t = fromKey(k) + 8 * HOUR; out.push({ id: 'mig-' + k, date: k, name: 'Nachtrag', start: t, plannedEnd: t, end: null, breakMin: 0, extraMin: extra, u: 1 }); }
      continue;
    }
    const first = arr[0].in, last = arr[arr.length - 1], running = num(last.out) == null;
    let worked = 0; for (const st of arr) if (num(st.out) != null) worked += st.out - st.in;
    const lastOut = running ? null : last.out;
    out.push({ id: 'mig-' + k, date: k, name: 'Dienst', start: first, plannedEnd: running ? first + 8.5 * HOUR : lastOut, end: null, live: running,
      breakMin: running ? 30 : Math.max(0, Math.round(((lastOut - first) - worked) / MIN)), extraMin: extra, u: 1 });
  }
  return out;
}

/** Bringt Daten in eine kanonische Form (feste Reihenfolge), damit Geräte bitgleich übereinstimmen. */
function normalize(s) {
  const b = blank();
  if (!s || typeof s !== 'object') return b;
  const ver = Number(s.v) || 1;
  const items = new Map();
  for (const x of (Array.isArray(s.items) ? s.items : [])) {
    if (!x || !x.title) continue;
    const it = normItem(x); const c = items.get(it.id);
    if (!c || it.updatedAt > c.updatedAt) items.set(it.id, it);
  }
  b.items = [...items.values()].sort((a, c) => a.createdAt - c.createdAt || cmp(a.id, c.id));
  const shifts = new Map();
  for (const x of [...(Array.isArray(s.shifts) ? s.shifts : []), ...(ver < 3 ? migrateStamps(s) : [])]) {
    const sh = normShift(x); if (!sh) continue;
    const c = shifts.get(sh.id);
    if (!c || sh.u > c.u || (sh.u === c.u && JSON.stringify(sh) > JSON.stringify(c))) shifts.set(sh.id, sh);
  }
  b.shifts = [...shifts.values()].sort((a, c) => a.start - c.start || cmp(a.id, c.id));
  let liveSeen = false; // nur der jüngste Dienst darf laufen
  for (let i = b.shifts.length - 1; i >= 0; i--) {
    const sh = b.shifts[i]; if (!sh.live) continue;
    if (liveSeen) sh.live = false;
    liveSeen = true;
  }
  if (Array.isArray(s.tpls)) {
    const t = new Map();
    for (const x of s.tpls) { const tp = normTpl(x); if (!tp) continue; const c = t.get(tp.id); if (!c || tp.u > c.u) t.set(tp.id, tp); }
    b.tpls = [...t.values()];
  } else if (ver >= 3) b.tpls = [];
  const cutoff = Date.now() - 120 * DAY;
  const del = s.del && typeof s.del === 'object' ? s.del : {};
  Object.keys(del).sort().forEach(k => { const v = num(del[k]); if (v && v > cutoff) b.del[k] = v; });
  b.shifts = b.shifts.filter(x => !(b.del[x.id] >= x.u));
  const live = x => !(b.del[x.id] >= x.u);
  b.appts = normList(s.appts, normAppt).filter(live).sort((a, c) => a.start - c.start || cmp(a.id, c.id));
  b.routines = normList(s.routines, normRoutine).filter(live).sort(byName);
  const rids = new Set(b.routines.map(r => r.id));
  b.runs = normList(s.runs, normRun).filter(live).filter(r => rids.has(r.rid)).sort((a, c) => a.started - c.started || cmp(a.id, c.id));
  b.people = normList(s.people, normPerson).filter(live).sort(byName);
  const pmap = new Map(b.people.map(x => [x.id, x]));
  for (const x of b.people) if (x.parent && !pmap.has(x.parent)) x.parent = null;
  for (const x of b.people) { // Zyklen im Baum auflösen (deterministisch)
    const seen = new Set([x.id]); let q = x.parent;
    while (q) { if (seen.has(q)) { x.parent = null; break; } seen.add(q); q = (pmap.get(q) || {}).parent || null; }
  }
  b.notes = normList(s.notes, normNote).filter(live).filter(n => pmap.has(n.pid)).sort((a, c) => a.at - c.at || cmp(a.id, c.id));
  b.files = normList(s.files, normFile).filter(live).sort((a, c) => a.added - c.added || cmp(a.id, c.id));
  b.tpls = b.tpls.filter(x => !(b.del[x.id] >= x.u)).sort((a, c) => cmp(a.start, c.start) || cmp(a.name, c.name) || cmp(a.id, c.id));
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
  const out = { v: 3, del };
  for (const g of COLLECTIONS) out[g] = pick([...(a[g] || []), ...(b[g] || [])], keyOf(g));
  out.settings = (b.settings.u || 0) > (a.settings.u || 0) ? b.settings : a.settings;
  return normalize(out);
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
/** Löschmarke, die garantiert jünger ist als die Version, die dieses Gerät gesehen hat (robust gegen abweichende Uhren). */
const tombTs = rec => Math.max(Date.now(), ((rec && (rec.updatedAt || rec.u)) || 0) + 1);

/** Ersetzt den Stand (Rückgängig, Import, Demo, Löschen) so, dass die Sync-Logik es als neueste Änderung erkennt. */
function applyState(raw) {
  const next = normalize(raw), now = Date.now();
  const keep = new Set();
  for (const g of COLLECTIONS) {
    const key = keyOf(g);
    const cur = new Map(state[g].map(x => [x.id, JSON.stringify(x)]));
    for (const x of next[g]) { if (cur.get(x.id) !== JSON.stringify(x)) x[key] = now; delete next.del[x.id]; keep.add(x.id); }
  }
  for (const g of COLLECTIONS) for (const x of state[g]) if (!keep.has(x.id)) next.del[x.id] = Math.max(now, (x[keyOf(g)] || 0) + 1);
  for (const k in state.del) if (!keep.has(k)) next.del[k] = Math.max(next.del[k] || 0, state.del[k]);
  const plain = s => JSON.stringify({ ...s, u: 0 });
  if (plain(next.settings) !== plain(state.settings)) next.settings.u = now; else next.settings.u = state.settings.u;
  state = normalize(next);
  commit();
}
const restore = snap => applyState(JSON.parse(snap));

/* ======================= UI state ======================= */
const ui = { kind: 'alle', q: '', day: null, person: null, selDay: null, calMonth: null, openDone: false };

/* ======================= Dienste & Zeit ======================= */
const liveShift = () => state.shifts.find(s => s.live) || null;
const hmToMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const tplLen = tp => { let d = hmToMin(tp.end) - hmToMin(tp.start); if (d <= 0) d += 24 * 60; return d; };
const tplNet = tp => Math.max(0, tplLen(tp) - tp.breakMin);
const atHM = (dayTs, hhmm) => { const d = new Date(dayTs); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };
/** Erstes Vorkommen der Endzeit nach dem Beginn (Nachtdienste enden am Folgetag). */
function endAfter(startTs, hhmm, lenMin) {
  let e = atHM(startTs, hhmm);
  if (e <= startTs) e = addDays(e, 1);
  if (lenMin && e - startTs > (lenMin + 240) * MIN) e = startTs + lenMin * MIN;
  return e;
}
const isPlanned = (sh, now = Date.now()) => !sh.live && sh.start > now;
const plannedNet = sh => Math.max(0, sh.plannedEnd - sh.start - sh.breakMin * MIN);
/** Gearbeitete Zeit eines Dienstes: laufend = seit Beginn, sonst Plan (bzw. früheres Ende) minus Pause plus Überstunden. */
function shiftWorked(sh, now = Date.now()) {
  if (isPlanned(sh, now)) return 0;
  if (sh.live) return Math.max(0, now - sh.start);
  const end = Math.min(sh.end ?? sh.plannedEnd, sh.plannedEnd);
  return Math.max(0, end - sh.start - sh.breakMin * MIN) + sh.extraMin * MIN;
}
const shiftOt = (sh, now = Date.now()) => isPlanned(sh, now) ? 0 : sh.extraMin * MIN;
const shiftsOn = key => state.shifts.filter(s => s.date === key);
function workedIn(a, b, now = Date.now()) {
  let s = 0;
  for (const sh of state.shifts) { const t = fromKey(sh.date); if (t >= a && t < b) s += shiftWorked(sh, now); }
  return s;
}
function overtimeIn(a, b, now = Date.now()) {
  let s = 0;
  for (const sh of state.shifts) { const t = fromKey(sh.date); if (t >= a && t < b) s += shiftOt(sh, now); }
  return s;
}
/** Der Dienst, um den es gerade geht: laufend, sonst der zeitlich nächste von heute. */
function currentShift(now = Date.now()) {
  const live = liveShift(); if (live) return live;
  const today = shiftsOn(dayKey(now));
  const upcoming = today.filter(s => s.start > now).sort((a, b) => a.start - b.start)[0];
  const past = today.filter(s => s.start <= now).sort((a, b) => b.start - a.start)[0];
  if (past && upcoming) return (upcoming.start - now <= HOUR || now - Math.min(past.end ?? past.plannedEnd, Math.max(past.end ?? 0, past.plannedEnd)) >= 30 * MIN) ? upcoming : past;
  return past || upcoming || null;
}
/** Dienst, auf den „länger gemacht“ wirkt: heute der aktuelle, sonst der letzte des gewählten Tages. */
function extraTarget(now = Date.now()) {
  const key = ui.selDay || dayKey(now);
  const live = liveShift();
  if (key === dayKey(now)) return live || shiftsOn(key).filter(s => !isPlanned(s, now)).sort((a, b) => b.start - a.start)[0] || null;
  if (fromKey(key) > now) return null;
  return shiftsOn(key).sort((a, b) => b.start - a.start)[0] || null;
}
function addExtra(delta) {
  const sh = extraTarget(); if (!sh || !S) return;
  const m = clamp(sh.extraMin + delta, 0, 24 * 60);
  if (m === sh.extraMin) return;
  sh.extraMin = m; sh.u = Date.now();
  commit();
  const v = $('#extraVal');
  if (v && !reduceMotion.matches) { v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); }
}
const requiredPause = ms => ms > 9 * HOUR ? 45 * MIN : ms > 6 * HOUR ? 30 * MIN : 0;
function lawNote(sh) {
  if (!sh) return '';
  const net = plannedNet(sh) + sh.extraMin * MIN;
  if (net > 10 * HOUR) return `${dur(net)} h Arbeitszeit – über der gesetzlichen Höchstgrenze von 10 Std (ArbZG).`;
  const need = requiredPause(net);
  if (need && sh.breakMin * MIN < need) return `Bei ${dur(net)} h stehen dir ${need / MIN} Min Pause zu – eingetragen sind ${sh.breakMin} Min.`;
  return '';
}

function stopTimers(now) {
  for (const i of state.items) if (i.timerStart) { i.spentMs += now - i.timerStart; i.timerStart = null; i.updatedAt = now; }
}
const spentOf = (it, now = Date.now()) => it.spentMs + (it.timerStart ? now - it.timerStart : 0);

/* ---------- Eindongeln / Ausdongeln ---------- */
function dongleAction() {
  if (!S) return;
  const live = liveShift();
  if (live) { endShift(live.id); return; }
  const now = Date.now();
  const planned = state.shifts
    .filter(s => !s.live && s.end == null && s.start > now - HOUR && s.start < now + 4 * HOUR && s.plannedEnd > now)
    .sort((a, b) => Math.abs(a.start - now) - Math.abs(b.start - now))[0];
  if (planned) {
    const snap = snapshot();
    planned.live = true; planned.start = now; planned.date = dayKey(now); planned.end = null; planned.u = now;
    commit();
    toast(`Eingedongelt · ${planned.name} bis ${hm(planned.plannedEnd)}`, { undo: snap });
    if (navigator.vibrate) navigator.vibrate(12);
    return;
  }
  openStartSheet();
}
function startShift(tpl) {
  if (!S || liveShift()) return;
  const now = Date.now(), snap = snapshot();
  const len = tpl ? tplLen(tpl) : state.settings.targetMin + 30;
  const sh = normShift({ id: uid(), date: dayKey(now), name: tpl ? tpl.name : 'Dienst', color: tpl ? tpl.color : 'lime', start: now,
    plannedEnd: tpl ? endAfter(now, tpl.end, len) : now + len * MIN, breakMin: tpl ? tpl.breakMin : 30, extraMin: 0, live: true, u: now });
  state.shifts.push(sh);
  commit();
  toast(`Eingedongelt · ${sh.name} bis ${hm(sh.plannedEnd)}`, { undo: snap });
  if (navigator.vibrate) navigator.vibrate(12);
}
async function endShift(id) {
  const sh = state.shifts.find(s => s.id === id); if (!sh || !sh.live) return;
  const snap = snapshot();
  let endAt = Date.now();
  if (endAt - sh.plannedEnd > 4 * HOUR) {
    const r = await ask({ title: 'Ausdongeln vergessen?', text: `${sh.name} war bis ${hm(sh.plannedEnd)} geplant – das ist ${rel(Date.now() - sh.plannedEnd)} her. Wann hast du wirklich aufgehört?`,
      buttons: [{ label: 'Abbrechen', value: null }, { label: 'Jetzt', value: 'now' }, { label: `Um ${hm(sh.plannedEnd)}`, value: 'plan', cls: 'btn-accent', submit: true }] });
    if (!r) return;
    endAt = r.value === 'plan' ? sh.plannedEnd : Date.now();
  }
  const cur = state.shifts.find(s => s.id === id); if (!cur || !cur.live) return;
  const running = state.items.some(i => i.timerStart);
  stopTimers(Date.now());
  cur.live = false; cur.end = endAt; cur.u = Date.now();
  commit();
  if (navigator.vibrate) navigator.vibrate(12);
  const over = Math.floor((cur.end - cur.plannedEnd) / MIN) - cur.extraMin;
  if (over >= 8) {
    const lo = Math.max(15, Math.floor(over / 15) * 15), hi = Math.max(15, Math.ceil(over / 15) * 15);
    const buttons = [{ label: 'Nicht eintragen', value: 0 }];
    if (lo !== hi) buttons.push({ label: `+${dur(lo * MIN)}`, value: lo });
    buttons.push({ label: `+${dur(hi * MIN)}`, value: hi, cls: 'btn-accent', submit: true });
    const r = await ask({ title: 'Länger geblieben?', text: `${cur.name} war bis ${hm(cur.plannedEnd)} geplant, ausgedongelt hast du um ${hm(cur.end)} – ${dur(over * MIN)} h länger. Als Überstunden eintragen?`, buttons });
    const c2 = state.shifts.find(s => s.id === id);
    if (r && r.value && c2) {
      c2.extraMin = clamp(c2.extraMin + r.value, 0, 24 * 60); c2.u = Date.now();
      commit();
      toast(`Ausgedongelt · +${dur(r.value * MIN)} Überstunden eingetragen`, { undo: snap });
      return;
    }
  }
  toast(`Ausgedongelt · ${cur.name} · ${dur(shiftWorked(cur))} h${running ? ' · Timer gestoppt' : ''}`, { undo: snap });
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
  if (!liveShift()) toast('Timer läuft – du bist aber nicht eingedongelt.', { action: { label: 'Eindongeln', fn: dongleAction } });
}
function removeItem(id) {
  const snap = snapshot(), rec = find(id);
  state.items = state.items.filter(i => i.id !== id);
  state.del[id] = tombTs(rec);
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
  const live = liveShift(), cur = currentShift(now);
  document.body.classList.toggle('is-in', !!live);
  orb.setActive(!!live);
  const dg = $('#dongle');
  if (!dongle.busy) {
    dg.dataset.state = live ? 'in' : 'out';
    $('#dongleLabel').textContent = live ? 'Ausdongeln' : 'Eindongeln';
    dg.setAttribute('aria-label', live ? `Ausdongeln – ${live.name} seit ${hm(live.start)}` : 'Eindongeln – Dienst beginnen');
  }
  const next = !live && cur && isPlanned(cur, now) ? cur : null;
  $('#dongleHint').textContent = live ? `bis ${hm(live.plannedEnd)}` : next ? `${next.name} ${hm(next.start)}` : (mobileMQ.matches ? 'tippen' : 'tippen oder ziehen');
  $('#dockDongleLbl').textContent = live ? 'Ausdongeln' : 'Eindongeln';
  const ts = $('#timeState');
  const st = live ? ['Im Dienst', 'pill-accent-soft'] : !cur ? ['Frei', 'pill-quiet'] : isPlanned(cur, now) ? ['Geplant', 'pill-quiet'] : ['Beendet', 'pill-quiet'];
  ts.textContent = st[0]; ts.className = 'pill ' + st[1];
  $('#timeTitle').textContent = cur ? cur.name : 'Kein Dienst';
  const dot = $('#shiftDot'); dot.hidden = !cur; if (cur) dot.style.background = COLORS[cur.color];
  $('#ampmIn').classList.toggle('on', !!live);
  $('#ampmOut').classList.toggle('on', !live);
  renderWave(now);
  updateLive(now);
  renderShiftList(now);
}

function updateLive(now = Date.now()) {
  const live = liveShift(), cur = currentShift(now);
  if (cur) {
    const gross = Math.max(MIN, cur.plannedEnd - cur.start);
    const planned = isPlanned(cur, now);
    $('#workedBig').textContent = dur(live ? now - live.start : planned ? 0 : shiftWorked(cur, now));
    $('#workedSub').textContent = `${hm(cur.start)}–${hm(cur.plannedEnd)} · ${dur(plannedNet(cur))} h netto`;
    const frac = live ? (now - live.start) / gross : planned ? 0 : 1;
    $('#orbPct').textContent = `${Math.round(frac * 100)}%`;
    $('#orbBar').style.transform = `scaleY(${clamp(frac, 0, 1)})`;
  } else {
    $('#workedBig').textContent = '0:00';
    $('#workedSub').textContent = 'Heute kein Dienst eingetragen';
    $('#orbPct').textContent = '0%';
    $('#orbBar').style.transform = 'scaleY(0)';
  }
  $('#capTime').textContent = live ? dur(now - live.start).padStart(5, '0') : '--:--';
  $('#heroClock').textContent = live ? `Im Dienst · ${dur(now - live.start)}` : 'Ausgedongelt';

  const os = $('#orbStatus');
  os.classList.remove('warn', 'over');
  if (live && now - live.plannedEnd > 4 * HOUR) { os.textContent = 'Ausdongeln vergessen? Bitte prüfen.'; os.classList.add('warn'); }
  else if (live && now > live.plannedEnd) { os.textContent = `${dur(now - live.plannedEnd)} h länger als geplant …`; os.classList.add('over'); }
  else if (live) os.textContent = `Eingedongelt seit ${hm(live.start)} …`;
  else if (cur && isPlanned(cur, now)) os.textContent = `Geplant ab ${hm(cur.start)} · in ${rel(cur.start - now)}`;
  else if (cur) os.textContent = `Beendet um ${hm(Math.min(cur.end ?? cur.plannedEnd, Math.max(cur.end ?? 0, cur.plannedEnd)))}`;
  else os.textContent = 'Bereit zum Eindongeln …';

  const s1L = $('#st1L'), s1 = $('#st1'), s2L = $('#st2L'), s2 = $('#st2');
  if (live) {
    const d = live.plannedEnd - now;
    s1L.textContent = 'Dienstende'; s1.textContent = hm(live.plannedEnd);
    s2L.textContent = d >= 0 ? 'Noch' : 'Länger'; s2.textContent = (d < 0 ? '+' : '') + dur(Math.abs(d));
  } else if (cur && isPlanned(cur, now)) { s1L.textContent = 'Beginn'; s1.textContent = hm(cur.start); s2L.textContent = 'Dienstende'; s2.textContent = hm(cur.plannedEnd); }
  else if (cur) { s1L.textContent = 'Ende'; s1.textContent = hm(cur.end != null ? cur.end : cur.plannedEnd); s2L.textContent = 'Arbeitszeit'; s2.textContent = dur(shiftWorked(cur, now)); }
  else { s1L.textContent = 'Dienstende'; s1.textContent = '–'; s2L.textContent = 'Heute'; s2.textContent = dur(workedIn(sod(now), eod(now), now)); }
  const ws = weekStart(now);
  $('#st3').textContent = '+' + dur(overtimeIn(ws, addDays(ws, 7), now));

  const law = $('#lawHint');
  const msg = lawNote(live || (cur && !isPlanned(cur, now) ? cur : null));
  law.hidden = !msg; law.textContent = msg;

  const tgt = extraTarget(now);
  $('#extraVal').textContent = '+' + dur((tgt ? tgt.extraMin : 0) * MIN);
  $('#extraLbl').textContent = tgt ? `Länger gemacht · ${tgt.name}${(ui.selDay && ui.selDay !== dayKey(now)) ? ' ' + dateShort(tgt.start) : ''}` : 'Länger gemacht';
  $('#extraPlus').disabled = !tgt;
  $('#extraMinus').disabled = !tgt || !tgt.extraMin;
  $('#extraBox').classList.toggle('off', !tgt);

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
  const today = sod(now), tEnd = eod(now);
  const endOf = sh => sh.live ? Math.max(now, sh.plannedEnd) : Math.max(sh.end ?? 0, sh.plannedEnd);
  const shs = state.shifts.filter(sh => sh.start < tEnd && endOf(sh) > today);
  let start = today + 7 * HOUR, end = today + 19 * HOUR;
  for (const sh of shs) { start = Math.min(start, Math.max(today, sh.start)); end = Math.max(end, Math.min(tEnd, endOf(sh))); }
  start -= (start - today) % HOUR;
  end = Math.min(tEnd, end + (HOUR - (end - today) % HOUR) % HOUR);
  const slot = 10 * MIN, n = Math.round((end - start) / slot);
  let html = '';
  for (let i = 0; i < n; i++) {
    const a = start + i * slot, mid = a + slot / 2, isNow = now >= a && now < a + slot;
    let kind = '';
    for (const sh of shs) {
      if (isPlanned(sh, now)) { if (mid >= sh.start && mid < sh.plannedEnd) { kind = 'plan'; break; } continue; }
      const e = sh.live ? now : Math.min(sh.end ?? sh.plannedEnd, sh.plannedEnd);
      if (mid >= sh.start && mid < e) { kind = mid >= sh.plannedEnd ? 'over' : 'on'; break; }
      if (sh.live && mid >= now && mid < sh.plannedEnd) { kind = 'plan'; break; }
    }
    if (kind === 'on' || kind === 'over') {
      const r = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1;
      html += `<i class="${kind}${isNow ? ' now' : ''}" style="height:${Math.round(30 + r * 70)}%"></i>`;
    } else html += `<i class="${kind}${isNow ? ' now' : ''}"></i>`;
  }
  $('#waveBars').innerHTML = html;
  const live = liveShift(), cur = currentShift(now);
  $('#waveStatus').textContent = live ? `${live.name} · seit ${hm(live.start)}` : cur ? `${cur.name} · ${hm(cur.start)}–${hm(cur.plannedEnd)}` : 'Heute kein Dienst';
  $('#waveRange').textContent = `${pad(new Date(start).getHours())}–${pad(new Date(end).getHours() || 24)} Uhr`;
}

function renderShiftList(now) {
  const key = ui.selDay || dayKey(now), t = fromKey(key), isToday = key === dayKey(now);
  const list = shiftsOn(key).sort((a, b) => a.start - b.start);
  const total = list.reduce((s, x) => s + shiftWorked(x, now), 0);
  $('#stampsTitle').textContent = `${isToday ? 'Heute' : dateShort(t)}${list.length && total ? ` · ${dur(total)} h` : ''}`;
  $('#stampsToday').hidden = isToday;
  $('#stampList').innerHTML = list.length ? list.map(sh => {
    const planned = isPlanned(sh, now);
    const endTxt = sh.live ? `<span class="run"><i class="pulse"></i>läuft</span>` : `<span class="mono">${hm(sh.end != null && sh.end < sh.plannedEnd ? sh.end : sh.plannedEnd)}</span>`;
    return `<li class="stamp shift" data-shift="${sh.id}"><i class="cdot" style="background:${COLORS[sh.color]}"></i><span class="sh-name">${esc(sh.name)}</span><span class="mono dim">${hm(sh.start)}–</span>${endTxt}${planned ? '<span class="pill pill-quiet">geplant</span>' : ''}<span class="grow"></span>${sh.extraMin ? `<span class="mono extra-tag">+${dur(sh.extraMin * MIN)}</span>` : ''}<button class="icon-btn sm" type="button" data-shift-edit="${sh.id}" aria-label="${esc(sh.name)} ${hm(sh.start)} bearbeiten">${ico('edit')}</button></li>`;
  }).join('') : `<li class="stamp-empty">${t > now ? 'Noch kein Dienst geplant.' : isToday ? 'Noch kein Dienst – eindongeln oder „+ Dienst“.' : 'Kein Dienst an diesem Tag.'}</li>`;
}

function renderOvertime(now = Date.now()) {
  const d = new Date(now), ws = weekStart(now);
  const ms = new Date(d.getFullYear(), d.getMonth(), 1).getTime(), me = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const ys = new Date(d.getFullYear(), 0, 1).getTime(), ye = new Date(d.getFullYear() + 1, 0, 1).getTime();
  const all = state.shifts.reduce((s, x) => s + shiftOt(x, now), 0);
  $('#otTotal').textContent = '+' + dur(all);
  $('#otWeek').textContent = '+' + dur(overtimeIn(ws, addDays(ws, 7), now));
  $('#otMonth').textContent = '+' + dur(overtimeIn(ms, me, now));
  $('#otYear').textContent = '+' + dur(overtimeIn(ys, ye, now));
  const recent = state.shifts.filter(x => x.extraMin && !isPlanned(x, now)).sort((a, b) => b.start - a.start).slice(0, 4);
  $('#otList').innerHTML = recent.length ? recent.map(x => `<li><i class="cdot" style="background:${COLORS[x.color]}"></i><span class="ot-name">${esc(x.name)}</span><span class="dim">${dateShort(x.start)}</span><span class="grow"></span><b class="mono">+${dur(x.extraMin * MIN)}</b></li>`).join('') : '<li class="stamp-empty">Noch keine Überstunden erfasst.</li>';
  const openB = state.items.filter(i => i.kind === 'buchung' && !i.done).length;
  $('#otBookOpen').textContent = openB ? `${openB} offen` : '';
  $('#otBookOpen').hidden = !openB;
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
  for (let i = 0; i < 7; i++) {
    const a = addDays(ws, i), key = dayKey(a), shs = shiftsOn(key);
    days.push({ a, key, future: a > now, names: shs.map(x => x.name),
      worked: shs.reduce((s, x) => s + shiftWorked(x, now), 0),
      ot: shs.reduce((s, x) => s + shiftOt(x, now), 0),
      plan: shs.filter(x => isPlanned(x, now)).reduce((s, x) => s + plannedNet(x), 0) });
  }
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
  $('#wkTarget').textContent = '+' + dur(days.reduce((s, d) => s + d.ot, 0));
  const delta = $('#wkDelta');
  if (pavg && avg) { const p = Math.round((avg / pavg - 1) * 100); delta.hidden = false; delta.className = `pill mono ${p >= 0 ? 'pill-lime' : 'pill-quiet'}`; delta.textContent = `${p >= 0 ? '+' : '−'}${Math.abs(p)}% Ø`; delta.title = `Durchschnitt pro Arbeitstag ggü. Vorwoche (${dur(pavg)} h)`; }
  else delta.hidden = true;

  const maxV = Math.max(target * 1.25, ...days.map(d => Math.max(d.worked, d.plan) * 1.08), 4 * HOUR);
  const sel = ui.selDay || dayKey(now), todayKey = dayKey(now);
  const cols = days.map(d => {
    const dt = new Date(d.a);
    const val = d.worked >= MIN ? `${dur(d.worked)} h${d.ot ? ` (davon +${dur(d.ot)} Überstd.)` : ''}` : d.plan ? `geplant ${dur(d.plan)} h` : (d.future ? 'kein Dienst geplant' : 'frei');
    const tip = `${WD[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}.${d.names.length ? ' · ' + d.names.join(', ') : ''} · ${val}`;
    let bar;
    if (d.worked >= MIN) bar = `<span class="bar" style="height:${(d.worked / maxV * 100).toFixed(2)}%">${d.ot ? `<span class="ot" style="height:${(d.ot / d.worked * 100).toFixed(2)}%"></span>` : ''}</span>`;
    else if (d.plan) bar = `<span class="bar plan" style="height:${(d.plan / maxV * 100).toFixed(2)}%"></span>`;
    else bar = `<span class="bar zero"></span>`;
    return `<button type="button" class="wk-col${d.future ? ' future' : ''}${d.key === todayKey ? ' today' : ''}${d.key === sel ? ' sel' : ''}" data-day="${d.key}" data-tip="${esc(tip)}" aria-label="${esc(tip)}">${bar}<span class="lbl">${WD[dt.getDay()]}</span></button>`;
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
    const t = new Date(y, mo, d).getTime(), k = dayKey(t), shs = shiftsOn(k);
    const worked = t <= now ? workedIn(t, addDays(t, 1), now) : 0;
    const cls = ['cd'];
    if (t < todayStart) cls.push('past'); else if (t > todayStart) cls.push('future');
    if (worked > 5 * MIN) cls.push('worked');
    if (shs.some(x => isPlanned(x, now))) cls.push('plan');
    if (dues[k]) cls.push('due');
    const aps = apptsOn(k);
    if (aps.length) cls.push('appt');
    if (t === todayStart) cls.push('today');
    if (ui.day === k) cls.push('sel');
    const parts = [`${WDL[new Date(t).getDay()]}, ${d}. ${MONL[mo]}`];
    if (aps.length) parts.push(aps.map(x => `${x.allDay ? '' : hm(x.start) + ' '}${x.title}`).join(', '));
    if (shs.length) parts.push(shs.map(x => `${x.name} ${hm(x.start)}–${hm(x.plannedEnd)}${x.extraMin ? ` (+${dur(x.extraMin * MIN)})` : ''}`).join(', '));
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
  const books = open.filter(i => i.kind === 'buchung').length;
  if (books) parts.push(`<span><b>${books}</b> ${books === 1 ? 'Buchung' : 'Buchungen'} offen</span>`);
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
  else if (it.kind === 'buchung') { sub.push(it.from ? `für ${esc(it.from)}` : 'Stundenbuchung'); const bd = [it.bShift, it.bDate ? dateShort(fromKey(it.bDate)) : ''].filter(Boolean).join(' '); if (bd) sub.push(esc(bd)); }
  else sub.push(it.from ? `Todo · ${esc(it.from)}` : 'Todo');
  const d = dueOf(it);
  if (it.mode === 'repeat') sub.push(`${REPEATS[it.repeat]}${it.done ? '' : ' · ' + dueLabel(d)}`);
  else if (d != null && !it.done) sub.push(dueLabel(d));
  if (it.mode === 'dauer' && it.durMin && !it.done) sub.push(`${durWords(it.durMin)} Aufwand`);
  if (it.notes) sub.push(esc(firstLine(it.notes)));

  const pills = [];
  if (!it.done && it.status === 'inarbeit') pills.push('<span class="pill pill-glass">in Arbeit</span>');
  if (!it.done && it.status === 'wartet') pills.push('<span class="pill pill-outline">wartet</span>');
  if (!it.done && it.kind === 'buchung' && it.bMin) pills.push(`<span class="pill pill-blue">${ico('clockplus')}+${dur(it.bMin * MIN)}</span>`);
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
  $('#filters').innerHTML = [['alle', 'Alle'], ['anfrage', 'Anfragen'], ['todo', 'Todos'], ['aufgabe', 'Aufgaben'], ['buchung', 'Buchungen']]
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
  renderCalAppts(now);
  renderHero(now);
  renderPlanner(now);
  renderFocus(now);
  renderOvertime(now);
  renderSyncUi();
  renderArea();
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
const C = { id: null, kind: 'todo', mode: 'einmalig', status: 'offen', repeat: 'daily', bMin: 0 };
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
  $('#lblFrom').textContent = C.kind === 'anfrage' ? 'Von wem?' : C.kind === 'buchung' ? 'Für wen? (Kollegin / Kollege)' : 'Von / für wen (optional)';
  $('#bookRow').hidden = C.kind !== 'buchung';
  $('#cTitle').placeholder = C.kind === 'buchung' ? 'Überstunden eintragen' : 'Was steht an?';
  $('#cbMin').textContent = '+' + dur(C.bMin * MIN);
  const bs = $('#cbShift').value.trim();
  $$('#cbShiftChips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.name === bs)));
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
  $('#cbDate').value = it.bDate || dayKey(Date.now());
  $('#cbShift').value = it.bShift || '';
  C.bMin = it.bMin || 0;
  $('#tplNames').innerHTML = state.tpls.map(t => `<option value="${esc(t.name)}"></option>`).join('');
  $('#cbShiftChips').innerHTML = state.tpls.map(t => `<button type="button" class="chip tpl-chip" data-name="${esc(t.name)}" style="--c:${COLORS[t.color]}"><i></i>${esc(t.name)}</button>`).join('');
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
$('#cbShift').addEventListener('input', syncComposer);
$('#cbShiftChips').addEventListener('click', e => { const c = e.target.closest('[data-name]'); if (!c) return; $('#cbShift').value = c.dataset.name; syncComposer(); });
$('#bookRow').addEventListener('click', e => { const b = e.target.closest('[data-bstep]'); if (!b) return; C.bMin = clamp(C.bMin + Number(b.dataset.bstep), 0, 24 * 60); syncComposer(); });
$('#cDue').addEventListener('input', syncComposer);
$('#cForm').addEventListener('submit', e => { e.preventDefault(); saveComposer(); });
$('#cForm').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveComposer(); } });
$('#cDelete').addEventListener('click', () => { const id = C.id; closeDlg($('#composer')); if (id) removeItem(id); });

function saveComposer() {
  if (!S) return;
  const title = $('#cTitle').value.trim() || (C.kind === 'buchung' ? 'Überstunden eintragen' : '');
  const fail = el => { el.classList.add('err'); el.focus(); setTimeout(() => el.classList.remove('err'), 1400); };
  if (!title) return fail($('#cTitle'));
  if (C.kind === 'buchung' && !$('#cFrom').value.trim()) return fail($('#cFrom'));
  const now = Date.now();
  const data = { title, notes: $('#cNotes').value.trim(), kind: C.kind, from: C.kind === 'todo' ? '' : $('#cFrom').value.trim(), mode: C.mode, status: C.status, due: null, durMin: null, repeat: null, repDay: null,
    bDate: C.kind === 'buchung' && isKey($('#cbDate').value) ? $('#cbDate').value : null, bShift: C.kind === 'buchung' ? $('#cbShift').value.trim() : '', bMin: C.kind === 'buchung' ? C.bMin : 0 };
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
    toast(data.kind === 'buchung' ? `Buchung für ${data.from} gemerkt${data.bMin ? ' · +' + dur(data.bMin * MIN) : ''}` : `${KINDS[data.kind].label} angelegt${data.from && data.kind === 'anfrage' ? ' · von ' + data.from : ''}`);
  }
  closeDlg($('#composer'));
  commit();
}

/* ======================= Dienste: Dialoge & Katalog ======================= */
const BREAKS = [0, 15, 30, 45, 60];
function renderColors(el, sel) {
  el.innerHTML = Object.keys(COLORS).map(c => `<button type="button" role="radio" class="color" data-color="${c}" aria-checked="${c === sel}" aria-label="${COLOR_NAMES[c]}" style="--c:${COLORS[c]}"></button>`).join('');
}
function renderBreaks(el, sel) {
  el.innerHTML = BREAKS.map(b => `<button type="button" data-v="${b}" aria-pressed="${b === sel}">${b ? b + ' Min' : 'Keine'}</button>`).join('');
}
function pressColors(el, sel) { $$('.color', el).forEach(b => b.setAttribute('aria-checked', String(b.dataset.color === sel))); }
function pressBreaks(el, sel) { $$('button', el).forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === sel))); }

/* ---------- Dienst eintragen / bearbeiten ---------- */
const SH = { id: null, color: 'lime', breakMin: 30, extraMin: 0, canLive: false };
function openShiftDialog(sh, opts = {}) {
  if (!S) return;
  closeMenu();
  const now = Date.now();
  SH.id = sh ? sh.id : null;
  const base = sh || { name: '', date: opts.date || ui.selDay || dayKey(now), start: null, plannedEnd: null, breakMin: 30, extraMin: 0, color: 'lime', live: false };
  const past = sh && !sh.live && sh.start <= now;
  $('#shH').textContent = sh ? 'Dienst bearbeiten' : (opts.live ? 'Dienst beginnen' : 'Dienst eintragen');
  $('#shName').value = base.name;
  $('#shDate').value = base.date;
  $('#shStart').value = base.start != null ? hm(base.start) : (opts.live ? hm(now) : '');
  const effEnd = sh ? (past && sh.end != null && sh.end < sh.plannedEnd ? sh.end : sh.plannedEnd) : null;
  $('#shEnd').value = effEnd != null ? hm(effEnd) : '';
  $('#shEndLbl').textContent = past ? 'Ende' : 'Geplantes Ende';
  SH.color = base.color; SH.breakMin = base.breakMin; SH.extraMin = base.extraMin;
  renderColors($('#shColors'), SH.color);
  renderBreaks($('#shBreak'), SH.breakMin);
  $('#shTpls').innerHTML = state.tpls.length
    ? state.tpls.map(tp => `<button type="button" class="chip tpl-chip" data-tpl="${tp.id}" style="--c:${COLORS[tp.color]}"><i></i>${esc(tp.name)} <span class="mono">${tp.start}–${tp.end}</span></button>`).join('')
    : '<span class="hint">Der Katalog ist leer – Vorlagen legst du unter „Katalog“ an.</span>';
  SH.canLive = sh ? sh.live : !liveShift();
  $('#shLiveRow').hidden = !SH.canLive;
  $('#shLive').checked = sh ? sh.live : !!opts.live;
  $('#shDelete').hidden = !sh;
  syncShiftDialog();
  openDlg($('#shiftDlg'));
  if (!sh && !mobileMQ.matches) setTimeout(() => $('#shName').focus(), 40);
}
function readShiftForm() {
  const date = $('#shDate').value, s = $('#shStart').value, e = $('#shEnd').value;
  if (!isKey(date) || !/^\d{2}:\d{2}/.test(s) || !/^\d{2}:\d{2}/.test(e)) return null;
  const start = parseLocal(`${date}T${s.slice(0, 5)}`);
  let end = parseLocal(`${date}T${e.slice(0, 5)}`);
  if (end <= start) end = addDays(end, 1);
  return { date, start, plannedEnd: end };
}
function syncShiftDialog() {
  $('#shExtra').textContent = '+' + dur(SH.extraMin * MIN);
  pressColors($('#shColors'), SH.color);
  pressBreaks($('#shBreak'), SH.breakMin);
  const f = readShiftForm(), name = $('#shName').value.trim();
  $$('#shTpls .tpl-chip').forEach(c => { const tp = state.tpls.find(t => t.id === c.dataset.tpl); c.setAttribute('aria-pressed', String(!!tp && tp.name === name && !!f && hm(f.plannedEnd) === tp.end)); });
  const sum = $('#shSummary'), law = $('#shLaw');
  if (!f) { sum.textContent = 'Beginn und Ende eintragen – oder oben eine Vorlage wählen.'; law.hidden = true; return; }
  const tmp = { start: f.start, plannedEnd: f.plannedEnd, breakMin: SH.breakMin, extraMin: SH.extraMin };
  sum.textContent = `${dur(f.plannedEnd - f.start)} h Dienst · ${dur(plannedNet(tmp))} h netto${SH.extraMin ? ` · +${dur(SH.extraMin * MIN)} Überstunden` : ''}${sod(f.plannedEnd) > sod(f.start) ? ' · endet am Folgetag' : ''}`;
  const msg = lawNote(tmp); law.hidden = !msg; law.textContent = msg;
}
$('#shTpls').addEventListener('click', e => {
  const c = e.target.closest('[data-tpl]'); if (!c) return;
  const tp = state.tpls.find(t => t.id === c.dataset.tpl); if (!tp) return;
  $('#shName').value = tp.name; SH.color = tp.color; SH.breakMin = tp.breakMin;
  const keepStart = $('#shLive').checked && !$('#shLiveRow').hidden && $('#shStart').value;
  if (keepStart) {
    const st = parseLocal(`${$('#shDate').value}T${$('#shStart').value.slice(0, 5)}`);
    $('#shEnd').value = st != null ? hm(endAfter(st, tp.end, tplLen(tp))) : tp.end;
  } else { $('#shStart').value = tp.start; $('#shEnd').value = tp.end; }
  syncShiftDialog();
});
$('#shColors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { SH.color = b.dataset.color; syncShiftDialog(); } });
$('#shBreak').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { SH.breakMin = Number(b.dataset.v); syncShiftDialog(); } });
$('#shiftDlg').addEventListener('click', e => { const b = e.target.closest('[data-shstep]'); if (b) { SH.extraMin = clamp(SH.extraMin + Number(b.dataset.shstep), 0, 24 * 60); syncShiftDialog(); } });
['#shName', '#shDate', '#shStart', '#shEnd'].forEach(id => $(id).addEventListener('input', syncShiftDialog));
$('#shForm').addEventListener('submit', e => { e.preventDefault(); saveShift(); });
$('#shForm').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveShift(); } });
function saveShift() {
  if (!S) return;
  const f = readShiftForm();
  if (!f) { toast('Bitte Datum, Beginn und Ende angeben.'); return; }
  const now = Date.now();
  const name = $('#shName').value.trim() || 'Dienst';
  const live = SH.canLive && $('#shLive').checked;
  if (live && f.start > now + MIN) { toast('Ein laufender Dienst kann nicht in der Zukunft beginnen.'); return; }
  if (live && f.plannedEnd <= now && !SH.id) { toast('Das Ende liegt schon in der Vergangenheit – Häkchen „im Dienst“ entfernen.'); return; }
  const others = state.shifts.filter(x => x.id !== SH.id);
  const clash = others.find(x => f.start < (x.live ? Math.max(now, x.plannedEnd) : Math.min(x.end ?? x.plannedEnd, x.plannedEnd)) && f.plannedEnd > x.start);
  if (clash) { toast(`Überschneidet sich mit ${clash.name} ${dateShort(clash.start)} ${hm(clash.start)}–${hm(clash.plannedEnd)}.`); return; }
  if (live && others.some(x => x.live)) { toast('Es läuft schon ein Dienst – erst ausdongeln.'); return; }
  const snap = snapshot();
  const data = { date: f.date, name, color: SH.color, start: f.start, plannedEnd: f.plannedEnd, end: null, live, breakMin: SH.breakMin, extraMin: SH.extraMin, u: now };
  if (SH.id) {
    const sh = state.shifts.find(x => x.id === SH.id);
    if (!sh) { toast('Dieser Dienst wurde inzwischen auf einem anderen Gerät gelöscht.'); closeDlg($('#shiftDlg')); return; }
    Object.assign(sh, normShift({ ...sh, ...data }));
  } else state.shifts.push(normShift({ id: uid(), ...data }));
  closeDlg($('#shiftDlg'));
  commit();
  toast(SH.id ? 'Dienst gespeichert' : live ? `Eingedongelt · ${name} bis ${hm(f.plannedEnd)}` : f.start > now ? `${name} geplant · ${dateShort(f.start)}` : 'Dienst eingetragen', { undo: snap });
}
$('#shDelete').addEventListener('click', () => {
  if (!SH.id) return;
  const snap = snapshot(), id = SH.id, rec = state.shifts.find(x => x.id === id);
  state.shifts = state.shifts.filter(x => x.id !== id);
  state.del[id] = tombTs(rec);
  closeDlg($('#shiftDlg')); commit();
  toast('Dienst gelöscht', { undo: snap });
});

/* ---------- Dienst beginnen (Vorlage wählen) ---------- */
function openStartSheet() {
  if (!S) return;
  const now = Date.now();
  $('#stNow').textContent = hm(now);
  $('#startTpls').innerHTML = state.tpls.map(tp => `<button type="button" class="tpl-btn" data-tpl="${tp.id}" style="--c:${COLORS[tp.color]}"><span class="tpl-name">${esc(tp.name)}</span><span class="tpl-time mono">${tp.start}–${tp.end}</span><span class="tpl-end">bis ${hm(endAfter(now, tp.end, tplLen(tp)))} · ${dur(tplNet(tp) * MIN)} h netto</span></button>`).join('')
    + `<button type="button" class="tpl-btn free" data-tpl=""><span class="tpl-name">Ohne Vorlage</span><span class="tpl-time mono">${dur(state.settings.targetMin * MIN)} h + 30 Min</span><span class="tpl-end">Ende danach anpassen</span></button>`;
  openDlg($('#startDlg'));
}
$('#startTpls').addEventListener('click', e => {
  const b = e.target.closest('[data-tpl]'); if (!b) return;
  const tp = state.tpls.find(t => t.id === b.dataset.tpl) || null;
  closeDlg($('#startDlg'));
  startShift(tp);
});
$('#startCustom').addEventListener('click', () => { closeDlg($('#startDlg')); setTimeout(() => openShiftDialog(null, { live: true, date: dayKey(Date.now()) }), mobileMQ.matches ? 320 : 200); });
$('#startCatalog').addEventListener('click', () => { closeDlg($('#startDlg')); setTimeout(openCatalog, mobileMQ.matches ? 320 : 200); });

/* ---------- Katalog ---------- */
const TP = { id: null, color: 'lime', breakMin: 30 };
function openCatalog() { if (!S) return; closeMenu(); showTplList(); openDlg($('#tplDlg')); }
function showTplList() {
  $('#tplForm').hidden = true; $('#tplListView').hidden = false;
  $('#tplList').innerHTML = state.tpls.length ? state.tpls.map(tp => `<li><button type="button" class="tpl-row" data-tpl="${tp.id}"><i class="cdot" style="background:${COLORS[tp.color]}"></i><span class="tpl-row-name">${esc(tp.name)}</span><span class="mono dim">${tp.start}–${tp.end}</span><span class="mono dim tpl-row-net">${dur(tplNet(tp) * MIN)} h</span>${ico('edit')}</button></li>`).join('')
    : '<li class="stamp-empty">Noch keine Vorlagen – leg deine erste Schicht an.</li>';
}
function editTpl(tp) {
  TP.id = tp ? tp.id : null;
  $('#tpName').value = tp ? tp.name : '';
  $('#tpStart').value = tp ? tp.start : '08:00';
  $('#tpEnd').value = tp ? tp.end : '16:30';
  TP.color = tp ? tp.color : 'lime'; TP.breakMin = tp ? tp.breakMin : 30;
  renderColors($('#tpColors'), TP.color); renderBreaks($('#tpBreak'), TP.breakMin);
  $('#tpDelete').hidden = !tp;
  $('#tplListView').hidden = true; $('#tplForm').hidden = false;
  syncTplForm();
  if (!mobileMQ.matches) setTimeout(() => $('#tpName').focus(), 40);
}
function syncTplForm() {
  pressColors($('#tpColors'), TP.color); pressBreaks($('#tpBreak'), TP.breakMin);
  const s = $('#tpStart').value.slice(0, 5), e = $('#tpEnd').value.slice(0, 5);
  if (!isHM(s) || !isHM(e)) { $('#tpSummary').textContent = 'Beginn und Ende eintragen.'; return; }
  const tp = { start: s, end: e, breakMin: TP.breakMin };
  const t0 = atHM(Date.now(), s);
  const note = lawNote({ start: t0, plannedEnd: t0 + tplLen(tp) * MIN, breakMin: TP.breakMin, extraMin: 0 });
  $('#tpSummary').textContent = `${dur(tplLen(tp) * MIN)} h Dienst · ${dur(tplNet(tp) * MIN)} h netto${hmToMin(e) <= hmToMin(s) ? ' · endet am Folgetag' : ''}${note ? ' · ' + note : ''}`;
}
$('#tplList').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (b) editTpl(state.tpls.find(t => t.id === b.dataset.tpl)); });
$('#tplNew').addEventListener('click', () => editTpl(null));
$('#tpBack').addEventListener('click', showTplList);
$('#tpColors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { TP.color = b.dataset.color; syncTplForm(); } });
$('#tpBreak').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { TP.breakMin = Number(b.dataset.v); syncTplForm(); } });
['#tpStart', '#tpEnd'].forEach(id => $(id).addEventListener('input', syncTplForm));
$('#tplForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!S) return;
  const name = $('#tpName').value.trim(), s = $('#tpStart').value.slice(0, 5), en = $('#tpEnd').value.slice(0, 5);
  if (!name) { $('#tpName').classList.add('err'); $('#tpName').focus(); setTimeout(() => $('#tpName').classList.remove('err'), 1400); return; }
  if (!isHM(s) || !isHM(en)) { toast('Bitte Beginn und Ende angeben.'); return; }
  const now = Date.now();
  const data = { name, start: s, end: en, breakMin: TP.breakMin, color: TP.color, u: now };
  if (TP.id) { const tp = state.tpls.find(t => t.id === TP.id); if (tp) Object.assign(tp, data); }
  else state.tpls.push(normTpl({ id: uid(), ...data }));
  state = normalize(state);
  commit(); showTplList();
  toast(TP.id ? 'Vorlage gespeichert' : `Vorlage „${name}“ angelegt`);
});
$('#tpDelete').addEventListener('click', () => {
  if (!TP.id || !S) return;
  const snap = snapshot(), tp = state.tpls.find(t => t.id === TP.id);
  state.tpls = state.tpls.filter(t => t.id !== TP.id);
  state.del[TP.id] = tombTs(tp);
  commit(); showTplList();
  toast(`Vorlage „${tp ? tp.name : ''}“ gelöscht`, { undo: snap });
});

/* ---------- Zeit-Karte: Ereignisse ---------- */
$('#stampList').addEventListener('click', e => {
  const b = e.target.closest('[data-shift-edit]') || e.target.closest('[data-shift]');
  if (!b) return;
  const sh = state.shifts.find(x => x.id === (b.dataset.shiftEdit || b.dataset.shift));
  if (sh) openShiftDialog(sh);
});
$('#extraPlus').addEventListener('click', () => addExtra(15));
$('#extraMinus').addEventListener('click', () => addExtra(-15));
$('#addShift').addEventListener('click', () => openShiftDialog(null, { date: ui.selDay || dayKey(Date.now()) }));
$('#openCatalog').addEventListener('click', openCatalog);
$('#stampsToday').addEventListener('click', () => { ui.selDay = null; renderTime(); renderWeek(); });
$('#bookBtn').addEventListener('click', () => openComposer(null, { kind: 'buchung' }));

/* ======================= Dongle slider ======================= */
const dongle = { busy: false, drag: null, suppress: false };
(() => {
  const el = $('#dongle'), knob = $('#dongleKnob');
  const max = () => el.clientWidth - knob.offsetWidth - 10;
  const reset = (animate = true) => { knob.style.transition = animate ? '' : 'none'; knob.style.transform = ''; };
  function finish(fromX) {
    if (dongle.busy) return;
    if (reduceMotion.matches) { reset(false); dongleAction(); return; }
    dongle.busy = true;
    const m = max();
    knob.style.transition = 'none';
    const a = knob.animate([{ transform: `translateX(${fromX}px)` }, { transform: `translateX(${m}px)` }], { duration: Math.max(110, 260 * (1 - fromX / m)), easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
    a.onfinish = () => {
      dongleAction();
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
    if (e.detail === 0) { dongleAction(); return; }
    finish(0);
  });
})();
$('#dockDongle').addEventListener('click', dongleAction);

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
  s = s.replace(/\s#(anfrage|todo|aufgabe|buchung|stunden)(?=\s)/i, (_, k) => { kind = k.toLowerCase() === 'stunden' ? 'buchung' : k.toLowerCase(); return ' '; });
  s = s.replace(/\s@([\p{L}][\p{L}\p{N}._-]*)/u, (_, n) => { from = n.replace(/[._]+/g, ' ').trim(); return ' '; });
  if (/\s!+(?=\s)/.test(s) || /!\s*$/.test(s)) { asap = true; s = s.replace(/\s!+(?=\s)/g, ' ').replace(/!+\s*$/, ' '); }
  const title = s.replace(/\s+/g, ' ').trim();
  if (!kind) kind = from ? 'anfrage' : (ui.kind !== 'alle' ? ui.kind : 'todo');
  return { title: title || (kind === 'buchung' ? 'Überstunden eintragen' : ''), kind, from, mode: asap ? 'asap' : 'einmalig' };
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
  qTimer = setTimeout(() => { ui.q = searchInput.value.trim(); if (ui.q && mobileMQ.matches && document.body.dataset.area === 'heute') setTab('aufgaben'); renderPlanner(); renderArea(); }, 90);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') { searchInput.value = ''; ui.q = ''; renderPlanner(); renderArea(); searchInput.blur(); } });
searchBox.addEventListener('click', () => { if (mobileMQ.matches) { searchBox.classList.add('expanded'); searchInput.focus(); } });
searchInput.addEventListener('blur', () => { if (!searchInput.value) searchBox.classList.remove('expanded'); });

$('#calGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-cal]'); if (!b) return;
  ui.day = ui.day === b.dataset.cal ? null : b.dataset.cal;
  renderCal(); renderPlanner(); renderCalAppts();
});
$('#calPrev').addEventListener('click', () => { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() - 1); ui.calMonth = d.getTime(); renderCal(); });
$('#calNext').addEventListener('click', () => { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() + 1); ui.calMonth = d.getTime(); renderCal(); });
$('#wkChart').addEventListener('click', e => {
  const b = e.target.closest('[data-day]'); if (!b) return;
  ui.selDay = b.dataset.day === dayKey(Date.now()) ? null : b.dataset.day;
  renderWeek(); renderShiftList(Date.now()); updateLive(Date.now());
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

$('#newBtn').addEventListener('click', () => contextNew());
$('#newBtn2').addEventListener('click', () => openComposer());
$('#dockAdd').addEventListener('click', () => contextNew());

/* ======================= Tabs (mobile) ======================= */
function setTab(t) {
  document.body.dataset.tab = t;
  $$('.dock-btn[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
  try { sessionStorage.setItem('workoholic:tab', t); } catch (e) {}
}
$$('.dock-btn[data-tab]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); setArea('heute'); }));
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
  else if (a === 'catalog') openCatalog();
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
    const now = Date.now();
    const rows = [['Datum', 'Wochentag', 'Dienst', 'Beginn', 'Ende (geplant)', 'Ausgedongelt', 'Pause (Min)', 'Überstunden (h:mm)', 'Arbeitszeit (h:mm)', 'Arbeitszeit (Std dezimal)', 'Überstunden (Std dezimal)']];
    for (const sh of state.shifts) {
      if (isPlanned(sh, now)) continue;
      const w = shiftWorked(sh, now);
      rows.push([new Date(sh.start).toLocaleDateString('de-DE'), WDL[new Date(sh.start).getDay()], sh.name.replace(/;/g, ','), hm(sh.start), hm(sh.plannedEnd), sh.live ? 'läuft' : sh.end != null ? hm(sh.end) : '', sh.breakMin, dur(sh.extraMin * MIN), dur(w), (w / HOUR).toFixed(2).replace('.', ','), (sh.extraMin / 60).toFixed(2).replace('.', ',')]);
    }
    download(`workoholic-arbeitszeiten-${stamp}.csv`, '﻿' + rows.map(r => r.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    toast(`${rows.length - 1} Dienste exportiert`);
  }
  else if (a === 'cleardone') {
    const done = state.items.filter(i => i.done);
    if (!done.length) { toast('Keine erledigten Einträge.'); return; }
    const snap = snapshot(), now = Date.now();
    state.items = state.items.filter(i => !i.done);
    done.forEach(i => { state.del[i.id] = tombTs(i); });
    commit(); toast(`${done.length} erledigte entfernt`, { undo: snap });
  }
  else if (a === 'demo') loadDemo();
  else if (a === 'wipe') {
    const r = await ask({ title: 'Alles löschen?', text: 'Entfernt alle Einträge, Dienste, Termine, Team-Notizen und Dateien – auch auf allen synchronisierten Geräten. Dienste-Katalog, Routinen-Vorlagen, Tresor und Passwort bleiben.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Alles löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
    if (!r) return;
    const snap = snapshot(); applyState({ ...blank(), tpls: state.tpls, routines: state.routines, settings: state.settings }); toast('Alles gelöscht', { undo: snap });
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
  const r = await ask({ title: 'Backup einspielen', text: `Das Backup enthält ${next.items.length} Einträge und ${next.shifts.length} Dienste. Zusammenführen behält alles Neuere; Ersetzen setzt den Stand exakt auf das Backup.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'replace', cls: 'btn-ghost btn-danger' }, { label: 'Zusammenführen', value: 'merge', cls: 'btn-accent', submit: true }] });
  if (!r) return;
  const snap = snapshot();
  if (r.value === 'replace') applyState(next);
  else { state = merge(state, next); commit(); }
  toast('Backup eingespielt', { undo: snap });
});

/* ======================= Demo data ======================= */
async function loadDemo() {
  if (state.items.length || state.shifts.length || state.appts.length || state.people.length || state.routines.length) {
    const r = await ask({ title: 'Beispieldaten laden?', text: 'Ersetzt Einträge, Dienste, Termine, Routinen und Team (auch auf synchronisierten Geräten). Dienste-Katalog und Dateien bleiben. Du kannst es direkt danach rückgängig machen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'ok', cls: 'btn-accent', submit: true }] });
    if (!r) return;
  }
  const snap = snapshot(), now = Date.now(), today = sod(now);
  const T = (dOff, h, m = 0) => { const d = new Date(today); d.setDate(d.getDate() + dOff); d.setHours(h, m, 0, 0); return d.getTime(); };
  const mk = o => normItem({ id: uid(), createdAt: now - (o.age || 0) * HOUR, updatedAt: now, ...o });
  const fri = (() => { let off = (5 - new Date(now).getDay() + 7) % 7; if (off === 0) off = 7; return off; })();
  const yKey = dayKey(T(-1, 12));
  const items = [
    mk({ title: 'Kurzer Blick auf den Vertragsentwurf', kind: 'anfrage', from: 'Jonas Weber', mode: 'asap', age: 1, notes: 'Klausel 4.2 – Haftung' }),
    mk({ title: 'Zahlen für die Q4-Präsentation', kind: 'anfrage', from: 'Sabine Krüger', mode: 'deadline', due: Math.max(now + 2.4 * HOUR, T(0, 16)), status: 'inarbeit', age: 20 }),
    mk({ title: 'Überstunden eintragen', kind: 'buchung', from: 'Mehmet Yilmaz', bDate: yKey, bShift: 'Nachtdienst', bMin: 90, mode: 'deadline', due: T(fri, 12), age: 5, notes: 'Übergabe dauerte länger' }),
    mk({ title: 'Überstunden eintragen', kind: 'buchung', from: 'Lena Hoffmann', bDate: dayKey(T(-3, 12)), bShift: 'Spätdienst', bMin: 45, mode: 'einmalig', age: 30 }),
    mk({ title: 'Feedback zum Onboarding-Konzept', kind: 'anfrage', from: 'Sabine Krüger', mode: 'deadline', due: T(fri, 12), age: 30 }),
    mk({ title: 'Quartalsbericht · Kapitel 3', kind: 'aufgabe', from: 'Lena Hoffmann', mode: 'dauer', durMin: 240, spentMs: 95 * MIN, due: T(fri, 15), age: 70 }),
    mk({ title: 'Kundentermin Müller GmbH vorbereiten', kind: 'aufgabe', mode: 'deadline', due: T(1, 10), age: 26 }),
    mk({ title: 'Reisekostenabrechnung einreichen', kind: 'todo', mode: 'deadline', due: T(-1, 17), age: 96 }),
    mk({ title: 'Postfach auf Inbox Zero', kind: 'todo', mode: 'repeat', repeat: 'weekdays', due: T(0, 17, 30), age: 300 }),
    mk({ title: 'Ideen fürs Team-Event sammeln', kind: 'todo', mode: 'einmalig', age: 120 }),
    mk({ title: 'Urlaubsantrag stellen', kind: 'todo', mode: 'einmalig', done: true, doneAt: now - 1.5 * HOUR, age: 48 })
  ];
  const tpl = id => state.tpls.find(t => t.id === id) || defaultTpls().find(t => t.id === id);
  const shifts = [];
  const add = (dOff, tp, extra = 0, early = 0) => {
    const t = tpl(tp); if (!t) return;
    const start = atHM(T(dOff, 0), t.start) + early * MIN;
    shifts.push({ id: uid(), date: dayKey(start), name: t.name, color: t.color, start, plannedEnd: endAfter(start, t.end, tplLen(t)), breakMin: t.breakMin, extraMin: extra, u: now });
  };
  const plan = [['tpl-frueh', 30], ['tpl-frueh', 0], ['tpl-spaet', 45], ['tpl-spaet', 0], ['tpl-tag', 15]];
  let j = 0;
  for (let i = 13; i >= 1; i--) {
    const d = new Date(T(-i, 0)); if (d.getDay() === 0 || d.getDay() === 6) continue;
    const [tp, ex] = plan[j++ % plan.length];
    add(-i, tp, ex);
  }
  const fr = tpl('tpl-frueh');
  if (fr) {
    const s0 = atHM(today, fr.start) + 2 * MIN, e0 = endAfter(s0, fr.end, tplLen(fr));
    if (now > s0 && now < e0 + 2 * HOUR) shifts.push({ id: uid(), date: dayKey(s0), name: fr.name, color: fr.color, start: s0, plannedEnd: e0, breakMin: fr.breakMin, extraMin: 0, live: true, u: now });
    else if (now >= e0) add(0, 'tpl-frueh', 15);
  }
  add(1, 'tpl-spaet');
  add(2, 'tpl-nacht');
  const P = (name, roles, parent) => ({ id: uid(), name, roles, parent, contact: '', u: now });
  const lena = P('Lena Hoffmann', ['Stationsleitung'], null);
  const sabine = P('Sabine Krüger', ['Schichtleitung', 'Praxisanleiterin'], lena.id);
  const jonas = P('Jonas Weber', ['Pflegefachkraft'], sabine.id);
  const mehmet = P('Mehmet Yilmaz', ['Pflegefachkraft', 'Hygienebeauftragter'], sabine.id);
  const anna = P('Anna Schulz', ['Auszubildende'], sabine.id);
  const N = (p, dOff, h, m, text) => ({ id: uid(), pid: p.id, text, at: T(dOff, h, m), u: now });
  const notes = [
    N(sabine, -9, 14, 10, 'Jahresgespräch vorbereitet – Wunsch: mehr Praxisanleitung, Fortbildung im Frühjahr.'),
    N(sabine, -2, 7, 45, 'Hat die Übergabe auf Station 3 übernommen, sehr strukturiert.'),
    N(mehmet, -1, 21, 50, 'Nachtdienst: Übergabe dauerte 1,5 Std länger – Stunden nachbuchen (siehe Planner).'),
    N(anna, -5, 11, 30, 'Probezeitgespräch: gute Entwicklung, braucht noch Sicherheit bei der Dokumentation.'),
    N(jonas, -3, 16, 5, 'Fragt nach Tausch Spätdienst Freitag ↔ Montag.')
  ];
  const R = (name, color, rhythm, steps, note) => ({ id: uid(), name, color, rhythm, note: note || '', steps: steps.map(text => ({ id: uid(), text })), u: now });
  const routines = [
    R('Schichtübergabe', 'gelb', 'weekdays', ['Übergabeprotokoll lesen', 'Patientenliste & Besonderheiten prüfen', 'Medikamente und BTM gegenzeichnen', 'Offene Anfragen im Planner durchgehen', 'Dienstplan-Änderungen ansprechen'], 'Zu Beginn jedes Dienstes.'),
    R('Wochenstart', 'lime', 'weekly', ['Dienstplan der Woche prüfen', 'Überstunden der Vorwoche kontrollieren', 'Termine im Kalender abgleichen', 'Team-Infos verschicken']),
    R('Monatsabschluss', 'blau', 'monthly', ['Arbeitszeiten als CSV exportieren', 'Überstunden mit der Verwaltung abgleichen', 'Stundenbuchungen der Kollegen erledigt?', 'Verschlüsseltes Backup speichern'])
  ];
  const runs = [
    { id: uid(), rid: routines[1].id, started: T(-7, 8), done: Object.fromEntries(routines[1].steps.map((s, i) => [s.id, T(-7, 8, 5 + i * 4)])), finished: T(-7, 8, 25), u: now },
    { id: uid(), rid: routines[0].id, started: T(0, 6, 5), done: { [routines[0].steps[0].id]: T(0, 6, 8), [routines[0].steps[1].id]: T(0, 6, 15) }, finished: null, u: now }
  ];
  const A = (title, dOff, h, m, durMin, location, notesTxt) => ({ id: uid(), title, start: T(dOff, h, m), end: T(dOff, h, m) + durMin * MIN, allDay: false, location: location || '', notes: notesTxt || '', alarm: 15, u: now });
  const appts = [
    A('Teambesprechung', 1, 10, 0, 60, 'Besprechungsraum 2', 'Themen: Dienstplan Dezember, Fortbildungen'),
    A('Jahresgespräch Sabine Krüger', 3, 13, 30, 45, 'Büro Stationsleitung'),
    A('Zahnarzt', 0, 16, 30, 30, 'Praxis Dr. Berg'),
    { id: uid(), title: 'Fortbildung Hygiene', start: T(8, 0), end: T(8, 0), allDay: true, location: 'Bildungszentrum', notes: '', alarm: 1440, u: now }
  ];
  applyState({ v: 3, items, shifts, tpls: state.tpls, appts, routines, runs, people: [lena, sabine, jonas, mehmet, anna], notes, files: state.files, del: {}, settings: { ...state.settings } });

  toast('Beispieldaten geladen', { undo: snap });
}

/* ======================= Bereiche ======================= */
const AREAS = ['heute', 'routinen', 'team', 'ablage'];
function syncDockTabs() {
  const heute = document.body.dataset.area === 'heute';
  $$('.dock-btn[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(heute && b.dataset.tab === document.body.dataset.tab)));
}
function setArea(a, opts = {}) {
  if (!AREAS.includes(a)) a = 'heute';
  document.body.dataset.area = a;
  $$('#areas [data-area]').forEach(b => b.setAttribute('aria-current', b.dataset.area === a ? 'page' : 'false'));
  syncDockTabs();
  try { sessionStorage.setItem('workoholic:area', a); } catch (e) {}
  if (!opts.keepScroll) scrollTo({ top: 0 });
  renderArea();
}
function renderArea() {
  if (!S) return;
  const a = document.body.dataset.area;
  if (a === 'routinen') renderRoutines();
  else if (a === 'team') renderTeam();
  else if (a === 'ablage') renderAblage();
  const set = (id, n) => { const el = $(id); el.textContent = n || ''; el.hidden = !n; };
  set('#nRoutinen', state.routines.filter(r => routineDue(r)).length);
  set('#nTeam', state.people.length);
  set('#nAblage', state.files.length);
}
function contextNew() {
  const a = document.body.dataset.area;
  if (a === 'routinen') openRoutineEditor(null);
  else if (a === 'team') openPersonDialog(null);
  else if (a === 'ablage') $('#fileInput').click();
  else openComposer();
}
$('#areas').addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) setArea(b.dataset.area); });

/* ======================= Termine & Kalender-Export ======================= */
const ALARMS = [[-1, 'Keine'], [0, 'Zum Beginn'], [15, '15 Min'], [30, '30 Min'], [60, '1 Std'], [1440, '1 Tag']];
const apptEnd = x => x.allDay ? addDays(sod(x.start), 1) : Math.max(x.end, x.start + MIN);
const apptsOn = key => { const a = fromKey(key), b = addDays(a, 1); return state.appts.filter(x => x.start < b && apptEnd(x) > a).sort((x, y) => (y.allDay - x.allDay) || x.start - y.start); };
const apptTime = x => x.allDay ? 'ganztägig' : `${hm(x.start)}–${hm(x.end)}`;
function renderCalAppts(now = Date.now()) {
  const key = ui.day || dayKey(now), t = fromKey(key), isToday = key === dayKey(now);
  const list = apptsOn(key);
  $('#caTitle').textContent = `Termine · ${isToday ? 'heute' : dateShort(t)}`;
  $('#caList').innerHTML = list.length
    ? list.slice(0, 5).map(x => `<li><button type="button" class="ca-row" data-appt="${x.id}"><span class="ca-time mono">${apptTime(x)}</span><span class="ca-title">${esc(x.title)}</span>${x.location ? `<span class="ca-loc">${esc(x.location)}</span>` : ''}</button></li>`).join('') + (list.length > 5 ? `<li class="ca-more">+${list.length - 5} weitere</li>` : '')
    : '<li class="ca-empty">Keine Termine.</li>';
}

/* iCalendar (RFC 5545) */
const te = new TextEncoder();
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsUtc = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsDay = t => { const d = new Date(t); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
function icsFold(line) {
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) {
    const b = te.encode(ch).length;
    if (bytes + b > 75) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
  }
  out.push(cur);
  return out.join('\r\n');
}
function buildIcs(events) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Workoholic//Termine//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const stamp = icsUtc(Date.now());
  for (const ev of events) {
    L.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`);
    if (ev.allDay) L.push(`DTSTART;VALUE=DATE:${icsDay(ev.start)}`, `DTEND;VALUE=DATE:${icsDay(addDays(sod(ev.start), 1))}`);
    else L.push(`DTSTART:${icsUtc(ev.start)}`, `DTEND:${icsUtc(Math.max(ev.end, ev.start + MIN))}`);
    L.push(`SUMMARY:${icsEsc(ev.title)}`);
    if (ev.location) L.push(`LOCATION:${icsEsc(ev.location)}`);
    if (ev.notes) L.push(`DESCRIPTION:${icsEsc(ev.notes)}`);
    if (ev.alarm >= 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(ev.title)}`, `TRIGGER:-PT${ev.alarm}M`, 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}
const apptEvent = x => ({ uid: `${x.id}@workoholic`, title: x.title, start: x.start, end: x.end, allDay: x.allDay, location: x.location, notes: x.notes, alarm: x.alarm });
const shiftEvent = sh => ({ uid: `${sh.id}@workoholic-dienst`, title: sh.name, start: sh.start, end: sh.plannedEnd, allDay: false, location: '', notes: `Dienst · Pause ${sh.breakMin} Min`, alarm: -1 });
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'termin';
function exportIcs(events, name) {
  if (!events.length) { toast('Keine Termine zum Exportieren.'); return; }
  const ics = buildIcs(events);
  if (navigator.standalone) { window.open('data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), '_blank'); return; } // iOS-Home-Bildschirm-App
  download(name, ics, 'text/calendar;charset=utf-8');
  toast('Kalenderdatei erstellt – öffnen, um sie in deinen Kalender zu übernehmen.');
}
function googleUrl(x) {
  const dates = x.allDay ? `${icsDay(x.start)}/${icsDay(addDays(sod(x.start), 1))}` : `${icsUtc(x.start)}/${icsUtc(Math.max(x.end, x.start + MIN))}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(x.title)}&dates=${dates}&details=${encodeURIComponent(x.notes || '')}&location=${encodeURIComponent(x.location || '')}`;
}
function outlookUrl(x) {
  const iso = t => x.allDay ? dayKey(t) : new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const end = x.allDay ? addDays(sod(x.start), 1) : Math.max(x.end, x.start + MIN);
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encodeURIComponent(x.title)}&startdt=${encodeURIComponent(iso(x.start))}&enddt=${encodeURIComponent(iso(end))}&allday=${x.allDay}&body=${encodeURIComponent(x.notes || '')}&location=${encodeURIComponent(x.location || '')}`;
}
const openExternal = url => window.open(url, '_blank', 'noopener,noreferrer');

const AP = { id: null, alarm: 15 };
function openApptDialog(x, opts = {}) {
  if (!S) return;
  closeMenu();
  AP.id = x ? x.id : null;
  AP.alarm = x ? x.alarm : 15;
  const day = x ? dayKey(x.start) : (opts.date || ui.day || dayKey(Date.now()));
  $('#apH').textContent = x ? 'Termin bearbeiten' : 'Neuer Termin';
  $('#apTitle').value = x ? x.title : '';
  $('#apTitle').classList.remove('err');
  $('#apDate').value = day;
  $('#apAllDay').checked = x ? x.allDay : false;
  let st = '09:00', en = '10:00';
  if (x && !x.allDay) { st = hm(x.start); en = hm(x.end); }
  else if (!x && day === dayKey(Date.now())) { const n = new Date(); n.setMinutes(n.getMinutes() < 30 ? 30 : 60, 0, 0); st = hm(n.getTime()); en = hm(n.getTime() + HOUR); }
  $('#apStart').value = st; $('#apEnd').value = en;
  $('#apLoc').value = x ? x.location : '';
  $('#apNotes').value = x ? x.notes : '';
  $('#apAlarm').innerHTML = ALARMS.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('');
  $('#apDelete').hidden = !x;
  syncApptDialog();
  openDlg($('#apptDlg'));
  if (!x && !mobileMQ.matches) setTimeout(() => $('#apTitle').focus(), 40);
}
function syncApptDialog() {
  $('#apTimes').hidden = $('#apAllDay').checked;
  $$('#apAlarm button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === AP.alarm)));
}
function readAppt() {
  const title = $('#apTitle').value.trim(), date = $('#apDate').value, allDay = $('#apAllDay').checked;
  if (!title) return { err: '#apTitle' };
  if (!isKey(date)) return { err: '#apDate' };
  let start, end;
  if (allDay) { start = fromKey(date); end = start; }
  else {
    const s = $('#apStart').value.slice(0, 5), e = $('#apEnd').value.slice(0, 5);
    if (!isHM(s)) return { err: '#apStart' };
    start = parseLocal(`${date}T${s}`);
    end = isHM(e) ? parseLocal(`${date}T${e}`) : start + HOUR;
    if (end === start) end = start + HOUR; else if (end < start) end = addDays(end, 1);
  }
  return { title, start, end, allDay, location: $('#apLoc').value.trim(), notes: $('#apNotes').value.trim(), alarm: AP.alarm };
}
function saveAppt(keepOpen) {
  if (!S) return null;
  const d = readAppt();
  if (d.err) { const el = $(d.err); el.classList.add('err'); el.focus(); setTimeout(() => el.classList.remove('err'), 1400); return null; }
  const now = Date.now();
  let x = AP.id ? state.appts.find(a => a.id === AP.id) : null;
  if (x) Object.assign(x, normAppt({ ...x, ...d, u: now }));
  else { x = normAppt({ id: uid(), ...d, u: now }); state.appts.push(x); AP.id = x.id; $('#apDelete').hidden = false; $('#apH').textContent = 'Termin bearbeiten'; }
  commit();
  const saved = state.appts.find(a => a.id === x.id);
  if (!keepOpen) {
    closeDlg($('#apptDlg'));
    toast(`Termin gespeichert · ${dateShort(saved.start)}`, { action: { label: 'In Kalender', fn: () => exportIcs([apptEvent(saved)], `termin-${dayKey(saved.start)}-${slug(saved.title)}.ics`) } });
  }
  return saved;
}
$('#apForm').addEventListener('submit', e => { e.preventDefault(); saveAppt(false); });
$('#apForm').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveAppt(false); } });
$('#apAllDay').addEventListener('change', syncApptDialog);
$('#apAlarm').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { AP.alarm = Number(b.dataset.v); syncApptDialog(); } });
$('#apDelete').addEventListener('click', () => {
  if (!AP.id) return;
  const snap = snapshot(), id = AP.id, rec = state.appts.find(a => a.id === id);
  state.appts = state.appts.filter(a => a.id !== id); state.del[id] = tombTs(rec);
  closeDlg($('#apptDlg')); commit(); toast('Termin gelöscht', { undo: snap });
});
$('#apptDlg').addEventListener('click', e => {
  const b = e.target.closest('[data-export]'); if (!b) return;
  const x = saveAppt(true); if (!x) return;
  if (b.dataset.export === 'ics') exportIcs([apptEvent(x)], `termin-${dayKey(x.start)}-${slug(x.title)}.ics`);
  else if (b.dataset.export === 'google') openExternal(googleUrl(x));
  else openExternal(outlookUrl(x));
});
$('#caList').addEventListener('click', e => { const b = e.target.closest('[data-appt]'); if (b) openApptDialog(state.appts.find(a => a.id === b.dataset.appt)); });
$('#caAdd').addEventListener('click', () => openApptDialog(null, { date: ui.day || dayKey(Date.now()) }));
$('#caExport').addEventListener('click', async () => {
  if (!S) return;
  const now = Date.now();
  const appts = state.appts.filter(x => apptEnd(x) > now - 30 * DAY);
  const shifts = state.shifts.filter(sh => isPlanned(sh, now));
  const r = await ask({ title: 'Kalender exportieren', text: `${appts.length} Termine (ab den letzten 30 Tagen)${shifts.length ? ` und ${shifts.length} geplante Dienste` : ''} als .ics-Datei – öffnen, um sie in Apple-, Outlook- oder Google-Kalender zu übernehmen.`,
    buttons: [{ label: 'Abbrechen', value: null }, ...(shifts.length ? [{ label: 'Termine + Dienste', value: 'both' }] : []), { label: 'Nur Termine', value: 'appts', cls: 'btn-accent', submit: true }] });
  if (!r) return;
  const evs = appts.map(apptEvent).concat(r.value === 'both' ? shifts.map(shiftEvent) : []);
  exportIcs(evs, `workoholic-kalender-${dayKey(now)}.ics`);
});

/* ======================= Routinen ======================= */
const runsOf = rid => state.runs.filter(r => r.rid === rid);
const openRunOf = rid => runsOf(rid).filter(r => !r.finished).sort((a, b) => b.started - a.started)[0] || null;
const lastFinished = rid => runsOf(rid).filter(r => r.finished).sort((a, b) => b.finished - a.finished)[0] || null;
function periodStart(rhythm, now) {
  if (rhythm === 'daily' || rhythm === 'weekdays') return sod(now);
  if (rhythm === 'weekly') return weekStart(now);
  if (rhythm === 'monthly') { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  return null;
}
function routineDue(r, now = Date.now()) {
  if (!r || r.rhythm === 'manual' || !r.steps.length) return false;
  if (r.rhythm === 'weekdays') { const wd = new Date(now).getDay(); if (wd === 0 || wd === 6) return false; }
  const lf = lastFinished(r.id);
  return !lf || lf.finished < periodStart(r.rhythm, now);
}
function renderRoutines(now = Date.now()) {
  const q = norm(ui.q);
  const list = state.routines.filter(r => !q || norm(`${r.name} ${r.note} ${r.steps.map(s => s.text).join(' ')}`).includes(q))
    .sort((a, b) => (routineDue(b, now) - routineDue(a, now)) || (!!openRunOf(b.id) - !!openRunOf(a.id)) || a.name.localeCompare(b.name, 'de'));
  const dueN = state.routines.filter(r => routineDue(r, now)).length;
  $('#rtSub').textContent = !state.routines.length ? 'Noch keine Routinen' : dueN ? `${dueN} ${dueN === 1 ? 'Routine' : 'Routinen'} fällig` : 'Alles im Takt';
  if (!state.routines.length) {
    $('#rtList').innerHTML = `<div class="empty area-empty"><h3>Deine Schablonen.</h3><p>Lege Abläufe an, die du immer wieder abarbeitest – z. B. Schichtübergabe, Wochenstart oder Monatsabschluss. Starten, abhaken, fertig.</p><div class="row"><button type="button" class="btn btn-accent" data-rt-new>${ico('plus')}Erste Routine</button></div></div>`;
    return;
  }
  if (!list.length) { $('#rtList').innerHTML = `<div class="empty area-empty"><h3>Nichts gefunden.</h3><p>Keine Routine passt zur Suche.</p></div>`; return; }
  $('#rtList').innerHTML = list.map(r => {
    const due = routineDue(r, now), run = openRunOf(r.id), lf = lastFinished(r.id);
    const total = runsOf(r.id).filter(x => x.finished).length;
    const doneN = run ? r.steps.filter(s => run.done[s.id]).length : 0;
    return `<article class="rt-card${due ? ' due' : ''}${run ? ' running' : ''}" data-rid="${r.id}" style="--c:${COLORS[r.color]}">
      <div class="rt-top"><h3 class="rt-name">${esc(r.name)}</h3>${due ? '<span class="pill pill-accent">fällig</span>' : ''}${run ? '<span class="pill pill-lime">läuft</span>' : ''}</div>
      <p class="rt-meta">${RHYTHMS[r.rhythm]} · ${r.steps.length} ${r.steps.length === 1 ? 'Schritt' : 'Schritte'} · ${lf ? `zuletzt ${dateShort(lf.finished)} ${hm(lf.finished)}` : 'noch nie abgeschlossen'}${total ? ` · ${total}×` : ''}</p>
      ${r.note ? `<p class="rt-note">${esc(firstLine(r.note))}</p>` : ''}
      ${run ? `<div class="rt-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${r.steps.length}" aria-valuenow="${doneN}"><i style="transform:scaleX(${r.steps.length ? doneN / r.steps.length : 0})"></i></div><p class="rt-meta">${doneN} von ${r.steps.length} erledigt · gestartet ${hm(run.started)}</p>` : ''}
      <div class="rt-actions"><button type="button" class="btn ${run || due ? 'btn-accent' : 'btn-light'} btn-sm" data-rt-start>${ico('play')}${run ? 'Fortsetzen' : 'Starten'}</button><button type="button" class="btn btn-ghost btn-sm" data-rt-edit>${ico('edit')}Bearbeiten</button></div>
    </article>`;
  }).join('');
}
$('#rtList').addEventListener('click', e => {
  if (e.target.closest('[data-rt-new]')) { openRoutineEditor(null); return; }
  const card = e.target.closest('[data-rid]'); if (!card) return;
  if (e.target.closest('[data-rt-edit]')) openRoutineEditor(state.routines.find(r => r.id === card.dataset.rid));
  else if (e.target.closest('[data-rt-start]')) startRoutine(card.dataset.rid);
});
$('#rtNew').addEventListener('click', () => openRoutineEditor(null));

/* ---------- Durchlauf ---------- */
let curRun = null;
function startRoutine(rid) {
  if (!S) return;
  const r = state.routines.find(x => x.id === rid); if (!r) return;
  if (!r.steps.length) { toast('Diese Routine hat noch keine Schritte.'); openRoutineEditor(r); return; }
  let run = openRunOf(rid);
  if (!run) { const now = Date.now(); run = normRun({ id: uid(), rid, started: now, done: {}, finished: null, u: now }); state.runs.push(run); commit(); }
  curRun = run.id;
  renderRunDialog();
  openDlg($('#runDlg'));
}
function renderRunDialog() {
  const run = state.runs.find(r => r.id === curRun), r = run && state.routines.find(x => x.id === run.rid);
  if (!run || !r) { if ($('#runDlg').open) closeDlg($('#runDlg')); return; }
  const n = r.steps.length, done = r.steps.filter(s => run.done[s.id]).length;
  $('#rnH').textContent = r.name;
  $('#rnMeta').textContent = `Gestartet ${dateShort(run.started)} um ${hm(run.started)} · ${done} von ${n} erledigt`;
  $('#rnBar').style.transform = `scaleX(${n ? done / n : 0})`;
  $('#rnNote').hidden = !r.note; $('#rnNote').textContent = r.note;
  $('#rnSteps').innerHTML = r.steps.map((s, i) => `<li><button type="button" class="rn-step${run.done[s.id] ? ' on' : ''}" data-step="${s.id}" aria-pressed="${!!run.done[s.id]}"><span class="check${run.done[s.id] ? ' on' : ''}" aria-hidden="true">${ico('check')}</span><span class="rn-n mono">${pad(i + 1)}</span><span class="rn-text">${esc(s.text)}</span>${run.done[s.id] ? `<span class="rn-at mono">${hm(run.done[s.id])}</span>` : ''}</button></li>`).join('');
  const fin = $('#rnFinish');
  fin.textContent = done === n ? 'Abschließen' : `Abschließen (${done}/${n})`;
  fin.className = 'btn ' + (done === n ? 'btn-accent' : 'btn-ghost');
}
$('#rnSteps').addEventListener('click', e => {
  const b = e.target.closest('[data-step]'); if (!b) return;
  const run = state.runs.find(r => r.id === curRun); if (!run) return;
  const id = b.dataset.step, now = Date.now();
  if (run.done[id]) delete run.done[id]; else run.done[id] = now;
  run.u = now; commit(); renderRunDialog();
  if (navigator.vibrate && run.done[id]) navigator.vibrate(8);
});
$('#rnFinish').addEventListener('click', () => {
  const run = state.runs.find(r => r.id === curRun), r = run && state.routines.find(x => x.id === run.rid); if (!run || !r) return;
  const snap = snapshot(), now = Date.now(), done = r.steps.filter(s => run.done[s.id]).length;
  run.finished = now; run.u = now;
  closeDlg($('#runDlg')); commit();
  toast(`${r.name} abgeschlossen · ${done}/${r.steps.length}`, { undo: snap });
});
$('#rnDiscard').addEventListener('click', async () => {
  const run = state.runs.find(r => r.id === curRun); if (!run) return;
  const a = await ask({ title: 'Durchlauf verwerfen?', text: 'Die Haken dieses Durchlaufs werden gelöscht. Die Routine selbst bleibt.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Verwerfen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!a) return;
  const snap = snapshot();
  state.runs = state.runs.filter(r => r.id !== run.id); state.del[run.id] = tombTs(run);
  closeDlg($('#runDlg')); commit(); toast('Durchlauf verworfen', { undo: snap });
});

/* ---------- Routine bearbeiten ---------- */
const RT = { id: null, color: 'lime', rhythm: 'manual' };
function openRoutineEditor(r) {
  if (!S) return;
  closeMenu();
  RT.id = r ? r.id : null; RT.color = r ? r.color : 'lime'; RT.rhythm = r ? r.rhythm : 'manual';
  $('#reH').textContent = r ? 'Routine bearbeiten' : 'Neue Routine';
  $('#reName').value = r ? r.name : '';
  $('#reName').classList.remove('err');
  $('#reSteps').value = r ? r.steps.map(s => s.text).join('\n') : '';
  $('#reNote').value = r ? r.note : '';
  renderColors($('#reColors'), RT.color);
  $('#reRhythm').innerHTML = Object.entries(RHYTHMS).map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('');
  $('#reDelete').hidden = !r;
  const runs = r ? runsOf(r.id).filter(x => x.finished).sort((a, b) => b.finished - a.finished).slice(0, 6) : [];
  $('#reHist').hidden = !runs.length;
  $('#reHistList').innerHTML = runs.map(x => `<li><span class="mono">${dateShort(x.finished)} ${hm(x.finished)}</span><span class="dim">${Object.keys(x.done).filter(k => r.steps.some(s => s.id === k)).length}/${r.steps.length} erledigt</span></li>`).join('');
  syncRoutineEditor();
  openDlg($('#routineDlg'));
  if (!r && !mobileMQ.matches) setTimeout(() => $('#reName').focus(), 40);
}
function syncRoutineEditor() {
  pressColors($('#reColors'), RT.color);
  $$('#reRhythm button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === RT.rhythm)));
  const n = $('#reSteps').value.split('\n').map(l => l.trim()).filter(Boolean).length;
  $('#reCount').textContent = `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`;
}
$('#reColors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { RT.color = b.dataset.color; syncRoutineEditor(); } });
$('#reRhythm').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { RT.rhythm = b.dataset.v; syncRoutineEditor(); } });
$('#reSteps').addEventListener('input', syncRoutineEditor);
$('#reForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!S) return;
  const name = $('#reName').value.trim();
  if (!name) { $('#reName').classList.add('err'); $('#reName').focus(); setTimeout(() => $('#reName').classList.remove('err'), 1400); return; }
  const lines = $('#reSteps').value.split('\n').map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean).slice(0, 100);
  const old = RT.id ? state.routines.find(r => r.id === RT.id) : null;
  const pool = old ? [...old.steps] : [];
  const steps = lines.map(text => { const i = pool.findIndex(s => s.text === text); if (i >= 0) return pool.splice(i, 1)[0]; return { id: uid(), text }; });
  const now = Date.now();
  const data = { name, color: RT.color, rhythm: RT.rhythm, steps, note: $('#reNote').value.trim(), u: now };
  if (old) Object.assign(old, normRoutine({ ...old, ...data }));
  else state.routines.push(normRoutine({ id: uid(), ...data }));
  closeDlg($('#routineDlg')); commit();
  toast(old ? 'Routine gespeichert' : `Routine „${name}“ angelegt`);
});
$('#reDelete').addEventListener('click', async () => {
  if (!RT.id) return;
  const r = state.routines.find(x => x.id === RT.id); if (!r) return;
  const a = await ask({ title: 'Routine löschen?', text: `„${r.name}“ und ihr Verlauf werden gelöscht.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!a) return;
  const snap = snapshot(), now = Date.now();
  for (const run of runsOf(r.id)) state.del[run.id] = tombTs(run);
  state.runs = state.runs.filter(x => x.rid !== r.id);
  state.routines = state.routines.filter(x => x.id !== r.id); state.del[r.id] = tombTs(r);
  closeDlg($('#routineDlg')); commit(); toast('Routine gelöscht', { undo: snap });
});

/* ======================= Team ======================= */
const teamUi = { pid: null, collapsed: new Set(), detail: false };
const personById = id => state.people.find(p => p.id === id) || null;
const kidsOf = pid => state.people.filter(p => p.parent === pid).sort((a, b) => a.name.localeCompare(b.name, 'de'));
const notesOf = pid => state.notes.filter(n => n.pid === pid).sort((a, b) => b.at - a.at || cmp(b.id, a.id));
function descendants(pid) { const out = new Set(); const walk = id => { for (const k of kidsOf(id)) { out.add(k.id); walk(k.id); } }; walk(pid); return out; }
const avHue = name => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (p, cls = '') => `<span class="tm-av ${cls}" style="--h:${avHue(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span>`;
function flatTree() {
  const out = [];
  const walk = (p, depth) => { out.push({ p, depth, kids: kidsOf(p.id).length }); if (!teamUi.collapsed.has(p.id)) for (const k of kidsOf(p.id)) walk(k, depth + 1); };
  for (const root of state.people.filter(p => !p.parent).sort((a, b) => a.name.localeCompare(b.name, 'de'))) walk(root, 0);
  return out;
}
function renderTeam() {
  const q = norm(ui.q);
  if (teamUi.pid && !personById(teamUi.pid)) teamUi.pid = null;
  if (!teamUi.pid && state.people.length && !mobileMQ.matches) teamUi.pid = flatTree()[0].p.id;
  document.body.classList.toggle('team-detail', !!(teamUi.detail && teamUi.pid));
  $('#tmSub').textContent = state.people.length ? `${state.people.length} ${state.people.length === 1 ? 'Person' : 'Personen'} · ${state.notes.length} ${state.notes.length === 1 ? 'Notiz' : 'Notizen'}` : 'Noch niemand im Team';
  let rows;
  if (q) {
    rows = state.people.filter(p => norm(`${p.name} ${p.roles.join(' ')} ${p.contact} ${notesOf(p.id).map(n => n.text).join(' ')}`).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')).map(p => ({ p, depth: 0, kids: 0 }));
  } else rows = flatTree();
  $('#tmTree').innerHTML = !state.people.length
    ? `<li class="empty area-empty"><h3>Dein Team.</h3><p>Leg Personen an, gib ihnen Rollen und ordne sie unter. Zu jeder Person sammelst du Notizen mit Datum und Uhrzeit.</p><div class="row"><button type="button" class="btn btn-accent" data-tm-new>${ico('plus')}Erste Person</button></div></li>`
    : rows.length ? rows.map(({ p, depth, kids }) => `<li class="tm-node${p.id === teamUi.pid ? ' sel' : ''}" style="--d:${depth}">
        ${kids ? `<button type="button" class="tm-caret" data-toggle="${p.id}" aria-expanded="${!teamUi.collapsed.has(p.id)}" aria-label="${teamUi.collapsed.has(p.id) ? 'Aufklappen' : 'Zuklappen'}">${ico('chev')}</button>` : '<span class="tm-caret-sp"></span>'}
        <button type="button" class="tm-row" data-pid="${p.id}" aria-current="${p.id === teamUi.pid}">${avatar(p)}<span class="tm-main"><span class="tm-name">${esc(p.name)}</span><span class="tm-roles">${p.roles.length ? p.roles.map(esc).join(' · ') : 'ohne Rolle'}</span></span>${notesOf(p.id).length ? `<span class="tm-count mono">${notesOf(p.id).length}</span>` : ''}</button>
      </li>`).join('') : '<li class="ca-empty">Niemand passt zur Suche.</li>';
  renderPersonDetail();
}
function renderPersonDetail() {
  const box = $('#tmDetail'), p = personById(teamUi.pid);
  if (!p) { box.innerHTML = state.people.length ? '<div class="tm-placeholder">Person auswählen</div>' : ''; return; }
  const boss = p.parent ? personById(p.parent) : null, kids = kidsOf(p.id), notes = notesOf(p.id);
  const items = state.items.filter(i => !i.done && i.from && norm(i.from) === norm(p.name));
  let lastDay = '', tl = '';
  for (const n of notes) {
    const dk = dayKey(n.at);
    if (dk !== lastDay) { const d = new Date(n.at); tl += `<li class="tl-day">${WDL[d.getDay()]}, ${d.getDate()}. ${MONL[d.getMonth()]} ${d.getFullYear()}</li>`; lastDay = dk; }
    tl += `<li class="tl-note" data-note="${n.id}"><span class="tl-time mono">${hm(n.at)}</span><div class="tl-body"><p class="tl-text">${esc(n.text)}</p>${n.edited ? `<span class="tl-edited">bearbeitet ${dateShort(n.edited)} ${hm(n.edited)}</span>` : ''}</div><span class="tl-act"><button type="button" class="icon-btn sm" data-note-edit aria-label="Notiz bearbeiten">${ico('edit')}</button></span></li>`;
  }
  const prev = $('#tmNote'), keep = prev && box.dataset.cur === p.id ? { v: prev.value, f: document.activeElement === prev, s: prev.selectionStart, e: prev.selectionEnd } : null;
  box.dataset.cur = p.id;
  box.innerHTML = `
    <button type="button" class="tm-back link" data-tm-back>← Team</button>
    <div class="tm-head">${avatar(p, 'big')}<div class="tm-head-main"><h2>${esc(p.name)}</h2>
      <div class="tm-chips">${p.roles.map(r => `<span class="pill pill-quiet">${esc(r)}</span>`).join('') || '<span class="dim">keine Rolle</span>'}</div></div>
      <button type="button" class="icon-btn" data-tm-edit aria-label="${esc(p.name)} bearbeiten">${ico('edit')}</button></div>
    <dl class="tm-facts">
      <div><dt>Berichtet an</dt><dd>${boss ? `<button type="button" class="link" data-pid="${boss.id}">${esc(boss.name)}</button>` : '—'}</dd></div>
      <div><dt>Team</dt><dd>${kids.length ? kids.map(k => `<button type="button" class="link" data-pid="${k.id}">${esc(k.name)}</button>`).join(', ') : '—'} <button type="button" class="link add" data-tm-child>+ darunter</button></dd></div>
      ${p.contact ? `<div><dt>Kontakt</dt><dd>${esc(p.contact)}</dd></div>` : ''}
    </dl>
    ${items.length ? `<div class="tm-items"><span class="f-label">Offen im Planner</span>${items.map(i => `<button type="button" class="tm-item" data-item="${i.id}">${ico(KINDS[i.kind].icon)}<span>${esc(i.title)}</span><span class="dim">${KINDS[i.kind].label}</span></button>`).join('')}</div>` : ''}
    <form class="tm-note-form" id="tmNoteForm"><label class="sr" for="tmNote">Notiz zu ${esc(p.name)}</label>
      <textarea class="input" id="tmNote" rows="3" placeholder="Notiz zu ${esc(p.name.split(' ')[0])} … (Zeitstempel kommt automatisch)" spellcheck="false" autocomplete="off"></textarea>
      <div class="tm-note-foot"><span class="dim" id="tmNoteHint">Strg/⌘ + Enter speichert</span><button type="submit" class="btn btn-accent btn-sm">Notiz speichern</button></div></form>
    <span class="f-label">Verlauf · ${notes.length} ${notes.length === 1 ? 'Notiz' : 'Notizen'}</span>
    <ul class="timeline">${tl || '<li class="ca-empty">Noch keine Notizen.</li>'}</ul>`;
  if (keep && keep.v) { const t = $('#tmNote'); t.value = keep.v; if (keep.f) { t.focus(); try { t.setSelectionRange(keep.s, keep.e); } catch (x) {} } }
}
$('#tmTree').addEventListener('click', e => {
  if (e.target.closest('[data-tm-new]')) { openPersonDialog(null); return; }
  const t = e.target.closest('[data-toggle]');
  if (t) { const id = t.dataset.toggle; teamUi.collapsed.has(id) ? teamUi.collapsed.delete(id) : teamUi.collapsed.add(id); renderTeam(); return; }
  const r = e.target.closest('[data-pid]');
  if (r) { teamUi.pid = r.dataset.pid; teamUi.detail = true; renderTeam(); if (mobileMQ.matches) scrollTo({ top: 0 }); }
});
$('#tmDetail').addEventListener('click', e => {
  if (e.target.closest('[data-tm-back]')) { teamUi.detail = false; renderTeam(); return; }
  if (e.target.closest('[data-tm-edit]')) { openPersonDialog(personById(teamUi.pid)); return; }
  if (e.target.closest('[data-tm-child]')) { openPersonDialog(null, { parent: teamUi.pid }); return; }
  const pl = e.target.closest('[data-pid]'); if (pl) { teamUi.pid = pl.dataset.pid; teamUi.detail = true; renderTeam(); return; }
  const it = e.target.closest('[data-item]'); if (it) { openComposer(find(it.dataset.item)); return; }
  const ne = e.target.closest('[data-note-edit]'); if (ne) { openNoteDialog(ne.closest('[data-note]').dataset.note); }
});
$('#tmDetail').addEventListener('submit', e => {
  if (e.target.id !== 'tmNoteForm') return;
  e.preventDefault(); addNote();
});
$('#tmDetail').addEventListener('keydown', e => { if (e.target.id === 'tmNote' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addNote(); } });
function addNote() {
  const p = personById(teamUi.pid), ta = $('#tmNote'); if (!p || !ta) return;
  const text = ta.value.trim(); if (!text) { ta.focus(); return; }
  const now = Date.now();
  ta.value = '';
  state.notes.push(normNote({ id: uid(), pid: p.id, text, at: now, u: now }));
  commit();
  toast(`Notiz zu ${p.name} gespeichert · ${hm(now)}`);
  setTimeout(() => { const t = $('#tmNote'); if (t && !mobileMQ.matches) t.focus(); }, 30);
}
$('#tmNew').addEventListener('click', () => openPersonDialog(null));

/* ---------- Notiz bearbeiten ---------- */
let editNoteId = null;
function openNoteDialog(id) {
  const n = state.notes.find(x => x.id === id); if (!n) return;
  editNoteId = id;
  const p = personById(n.pid);
  $('#nnH').textContent = `Notiz · ${p ? p.name : ''}`;
  $('#nnMeta').textContent = `Erfasst ${WDL[new Date(n.at).getDay()]}, ${dateShort(n.at)} um ${hm(n.at)}${n.edited ? ` · zuletzt bearbeitet ${dateShort(n.edited)} ${hm(n.edited)}` : ''}`;
  $('#nnText').value = n.text;
  openDlg($('#noteDlg'));
}
$('#nnForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = state.notes.find(x => x.id === editNoteId); if (!n) { closeDlg($('#noteDlg')); return; }
  const text = $('#nnText').value.trim(); if (!text) { $('#nnText').focus(); return; }
  if (text !== n.text) { const now = Date.now(); n.text = text; n.edited = now; n.u = now; commit(); toast('Notiz aktualisiert'); }
  closeDlg($('#noteDlg'));
});
$('#nnDelete').addEventListener('click', () => {
  const n = state.notes.find(x => x.id === editNoteId); if (!n) return;
  const snap = snapshot();
  state.notes = state.notes.filter(x => x.id !== n.id); state.del[n.id] = tombTs(n);
  closeDlg($('#noteDlg')); commit(); toast('Notiz gelöscht', { undo: snap });
});

/* ---------- Person anlegen / bearbeiten ---------- */
const PD = { id: null, roles: [] };
function openPersonDialog(p, opts = {}) {
  if (!S) return;
  closeMenu();
  PD.id = p ? p.id : null; PD.roles = p ? [...p.roles] : [];
  $('#pdH').textContent = p ? 'Person bearbeiten' : 'Neue Person';
  $('#pdName').value = p ? p.name : '';
  $('#pdName').classList.remove('err');
  $('#pdContact').value = p ? p.contact : '';
  $('#pdRoleIn').value = '';
  const blocked = p ? descendants(p.id) : new Set();
  const opts2 = state.people.filter(x => (!p || x.id !== p.id) && !blocked.has(x.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const parent = p ? p.parent : (opts.parent || '');
  $('#pdParent').innerHTML = `<option value="">— niemand (oberste Ebene) —</option>` + opts2.map(x => `<option value="${x.id}"${x.id === parent ? ' selected' : ''}>${esc(x.name)}${x.roles.length ? ' · ' + esc(x.roles[0]) : ''}</option>`).join('');
  $('#pdDelete').hidden = !p;
  renderRoleChips();
  openDlg($('#personDlg'));
  if (!p && !mobileMQ.matches) setTimeout(() => $('#pdName').focus(), 40);
}
function renderRoleChips() {
  $('#pdRoles').innerHTML = PD.roles.map((r, i) => `<span class="role-chip">${esc(r)}<button type="button" data-role-rm="${i}" aria-label="Rolle ${esc(r)} entfernen">${ico('x')}</button></span>`).join('') || '<span class="dim">Noch keine Rolle</span>';
  const all = [...new Set(state.people.flatMap(p => p.roles))].filter(r => !PD.roles.includes(r)).sort((a, b) => a.localeCompare(b, 'de'));
  $('#pdRoleSug').innerHTML = all.map(r => `<button type="button" class="chip" data-role-add="${esc(r)}">+ ${esc(r)}</button>`).join('');
  $('#pdRoleSug').hidden = !all.length;
}
function addRole(text) {
  for (const part of String(text).split(',')) { const t = part.trim().slice(0, 40); if (t && !PD.roles.includes(t) && PD.roles.length < 12) PD.roles.push(t); }
  renderRoleChips();
}
$('#pdRoleIn').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRole(e.target.value); e.target.value = ''; } });
$('#pdRoleAdd').addEventListener('click', () => { addRole($('#pdRoleIn').value); $('#pdRoleIn').value = ''; $('#pdRoleIn').focus(); });
$('#personDlg').addEventListener('click', e => {
  const rm = e.target.closest('[data-role-rm]'); if (rm) { PD.roles.splice(Number(rm.dataset.roleRm), 1); renderRoleChips(); return; }
  const ad = e.target.closest('[data-role-add]'); if (ad) { addRole(ad.dataset.roleAdd); }
});
$('#pdForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!S) return;
  const name = $('#pdName').value.trim();
  if (!name) { $('#pdName').classList.add('err'); $('#pdName').focus(); setTimeout(() => $('#pdName').classList.remove('err'), 1400); return; }
  if ($('#pdRoleIn').value.trim()) addRole($('#pdRoleIn').value);
  const now = Date.now();
  const data = { name, roles: PD.roles, parent: $('#pdParent').value || null, contact: $('#pdContact').value.trim(), u: now };
  let id = PD.id;
  const old = id ? personById(id) : null;
  if (old) Object.assign(old, normPerson({ ...old, ...data }));
  else { id = uid(); state.people.push(normPerson({ id, ...data })); }
  teamUi.pid = id; teamUi.detail = true;
  closeDlg($('#personDlg')); commit();
  if (document.body.dataset.area !== 'team') setArea('team');
  toast(old ? 'Gespeichert' : `${name} hinzugefügt`);
});
$('#pdDelete').addEventListener('click', async () => {
  const p = personById(PD.id); if (!p) return;
  const nn = notesOf(p.id).length, kk = kidsOf(p.id).length;
  const a = await ask({ title: `${p.name} entfernen?`, text: `${nn ? `${nn} ${nn === 1 ? 'Notiz wird' : 'Notizen werden'} mitgelöscht. ` : ''}${kk ? `${kk} unterstellte ${kk === 1 ? 'Person rückt' : 'Personen rücken'} eine Ebene hoch.` : ''}`.trim() || 'Die Person wird aus dem Team entfernt.',
    buttons: [{ label: 'Abbrechen', value: null }, { label: 'Entfernen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!a) return;
  const snap = snapshot(), now = Date.now();
  for (const k of kidsOf(p.id)) { k.parent = p.parent; k.u = now; }
  for (const n of notesOf(p.id)) state.del[n.id] = tombTs(n);
  state.notes = state.notes.filter(n => n.pid !== p.id);
  state.people = state.people.filter(x => x.id !== p.id); state.del[p.id] = tombTs(p);
  teamUi.pid = null; teamUi.detail = false;
  closeDlg($('#personDlg')); commit(); toast(`${p.name} entfernt`, { undo: snap });
});

/* ======================= Ablage (verschlüsselte Dateien) ======================= */
const IDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open('workoholic', 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('blobs', mode), req = fn(t.objectStore('blobs'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  return { get: id => run('readonly', s => s.get(id)), put: (id, v) => run('readwrite', s => s.put(v, id)), del: id => run('readwrite', s => s.delete(id)), keys: () => run('readonly', s => s.getAllKeys()), clear: () => run('readwrite', s => s.clear()) };
})();
const local = { ids: new Set(), ok: true };
async function refreshLocal() {
  try { local.ids = new Set(await IDB.keys()); local.ok = true; }
  catch (e) { local.ok = false; }
  if (local.ok && S) for (const id of [...local.ids]) if (!state.files.some(f => f.id === id)) { await IDB.del(id).catch(() => {}); local.ids.delete(id); }
}
const fmtBytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0).replace('.', ',')} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${(n / 1073741824).toFixed(2).replace('.', ',')} GB`;
const encSize = n => Math.ceil((n + 4) / 16384) * 16384 + 28;
const fileIcon = f => /^image\//.test(f.type) ? 'image' : /pdf|word|document|text|sheet|presentation|rtf/.test(f.type) || /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|odt)$/i.test(f.name) ? 'doc' : 'file';
const ab = { folder: '*' };

async function addFiles(list) {
  if (!S) return;
  const files = [...(list || [])]; if (!files.length) return;
  await refreshLocal();
  if (!local.ok) { toast('Die Dateiablage ist in diesem Browser-Modus nicht verfügbar.'); return; }
  let added = 0; const tooBig = [];
  for (const f of files) {
    if (f.size > V.MAX_FILE) { tooBig.push(f.name); continue; }
    const id = uid();
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const rec = await V.encryptFile(S.dek, id, bytes);
      bytes.fill(0);
      await IDB.put(id, rec);
    } catch (e) {
      toast(e && e.name === 'QuotaExceededError' ? 'Gerätespeicher voll – Datei konnte nicht abgelegt werden.' : `„${f.name}“ konnte nicht verschlüsselt werden.`);
      continue;
    }
    local.ids.add(id);
    const now = Date.now();
    state.files.push(normFile({ id, name: f.name, type: f.type, size: f.size, folder: ab.folder !== '*' ? ab.folder : '', added: now, remote: false, u: now }));
    added++;
  }
  if (added) { commit(); FileSync.kick(); }
  toast(`${added} ${added === 1 ? 'Datei' : 'Dateien'} verschlüsselt abgelegt${tooBig.length ? ` · ${tooBig.length} zu groß (max. 20 MB)` : ''}`);
}
async function fileBytes(f) {
  let rec = await IDB.get(f.id).catch(() => null);
  if (!rec) {
    if (!f.remote) throw new Error('Diese Datei liegt auf einem anderen Gerät und ist noch nicht hochgeladen.');
    if (!Sync.cfg()) throw new Error('Die Datei liegt nur im Tresor-Repo – Sync ist auf diesem Gerät nicht eingerichtet.');
    const r = await Sync.gh().getPath(`files/${f.id}`);
    if (!r) throw new Error('Datei im Tresor-Repo nicht gefunden.');
    rec = V.unpackFile(r.text);
    await IDB.put(f.id, rec).catch(() => {});
    local.ids.add(f.id);
  }
  return V.decryptFile(S.dek, f.id, rec.iv, rec.ct);
}
async function removeRemote(id) {
  if (!Sync.cfg()) return;
  try { const hit = (await Sync.gh().listDir('files')).find(x => x.name === id); if (hit) await Sync.gh().deletePath(`files/${id}`, hit.sha); } catch (e) { /* Aufräumen holt es nach */ }
}
const FileSync = {
  busy: false, again: false, msg: '', lastGc: 0,
  kick() { if (this.busy) this.again = true; else this.run(); },
  async run() {
    if (!S || !Sync.cfg() || Sync.halted) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.msg = '';
    try {
      await refreshLocal();
      const gh = Sync.gh();
      for (const f of state.files.filter(x => !x.remote && local.ids.has(x.id))) {
        const rec = await IDB.get(f.id); if (!rec) continue;
        try { await gh.putPath(`files/${f.id}`, V.packFile(rec.iv, rec.ct), null); }
        catch (e) { if (e.code !== 'conflict') throw e; }
        const cur = state.files.find(x => x.id === f.id);
        if (cur && !cur.remote) { cur.remote = true; cur.u = Date.now(); commit(); }
      }
      if (Date.now() - this.lastGc > HOUR) {
        this.lastGc = Date.now();
        for (const r of await gh.listDir('files')) if (state.del[r.name] && !state.files.some(f => f.id === r.name)) await gh.deletePath(`files/${r.name}`, r.sha).catch(() => {});
      }
    } catch (e) { this.msg = e.code === 'offline' ? 'Offline – Upload wird nachgeholt.' : (e.message || 'Fehler beim Hochladen'); }
    finally {
      this.busy = false;
      if (document.body.dataset.area === 'ablage') renderAblage();
      if (this.again) { this.again = false; this.run(); }
    }
  }
};

async function renderAblage() {
  if (!S) return;
  await refreshLocal();
  const q = norm(ui.q);
  const folders = [...new Set(state.files.map(f => f.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  if (ab.folder !== '*' && !folders.includes(ab.folder)) ab.folder = '*';
  $('#flFolders').innerHTML = [['*', 'Alle', state.files.length], ...folders.map(f => [f, f, state.files.filter(x => x.folder === f).length])]
    .map(([k, l, n]) => `<button type="button" class="fchip" data-folder="${esc(k)}" aria-selected="${ab.folder === k}">${esc(l)}<span class="n">${n}</span></button>`).join('');
  $('#flFolders').hidden = !folders.length;
  const list = state.files.filter(f => (ab.folder === '*' || f.folder === ab.folder) && (!q || norm(`${f.name} ${f.folder} ${f.note}`).includes(q))).sort((a, b) => b.added - a.added);
  $('#flSub').textContent = state.files.length ? `${state.files.length} ${state.files.length === 1 ? 'Datei' : 'Dateien'} · ${fmtBytes(state.files.reduce((s, f) => s + f.size, 0))}` : 'Noch leer';
  $('#flList').innerHTML = !state.files.length
    ? `<li class="empty area-empty"><h3>Deine Ablage.</h3><p>Dokumente, Fotos, PDFs – hier abgelegt werden sie auf deinem Gerät verschlüsselt und (mit Sync) verschlüsselt in deinem Tresor-Repo gesichert.</p><div class="row"><button type="button" class="btn btn-accent" data-fl-add>${ico('upload')}Dateien hinzufügen</button></div></li>`
    : list.length ? list.map(f => {
        const here = local.ids.has(f.id);
        const st = here && f.remote ? ['ok', 'Synchron'] : here ? (Sync.cfg() ? ['busy', 'Wird hochgeladen'] : ['local', 'Nur hier']) : f.remote ? ['cloud', 'In der Cloud'] : ['away', 'Anderes Gerät'];
        return `<li><button type="button" class="fl-row" data-fid="${f.id}"><span class="fl-ic">${ico(fileIcon(f))}</span><span class="fl-main"><span class="fl-name">${esc(f.name)}</span><span class="fl-sub">${fmtBytes(f.size)} · ${dateShort(f.added)}${f.folder ? ' · ' + esc(f.folder) : ''}${f.note ? ' · ' + esc(firstLine(f.note)) : ''}</span></span><span class="fl-state ${st[0]}">${st[1]}</span></button></li>`;
      }).join('') : '<li class="ca-empty">Keine Datei passt zu Suche oder Ordner.</li>';
  renderStorage();
}
async function renderStorage() {
  const st = navigator.storage;
  const est = st && st.estimate ? await st.estimate().catch(() => null) : null;
  const persisted = st && st.persisted ? await st.persisted().catch(() => false) : false;
  const vaultB = (localStorage.getItem(LS.vault) || '').length;
  const localB = state.files.filter(f => local.ids.has(f.id)).reduce((s, f) => s + encSize(f.size), 0);
  const remoteB = state.files.filter(f => f.remote).reduce((s, f) => s + encSize(f.size), 0) + vaultB;
  if (est && est.quota) {
    $('#sgDevVal').textContent = `${fmtBytes(est.usage || 0)} von ${fmtBytes(est.quota)}`;
    $('#sgDevBar').style.transform = `scaleX(${clamp((est.usage || 0) / est.quota, 0.004, 1)})`;
  } else { $('#sgDevVal').textContent = 'nicht ermittelbar'; $('#sgDevBar').style.transform = 'scaleX(0)'; }
  $('#sgDevSub').textContent = `Dateien ${fmtBytes(localB)} · Tresor ${fmtBytes(vaultB)} von ca. 5 MB${local.ok ? '' : ' · Dateiablage hier nicht verfügbar'}`;
  const pp = $('#sgPersist');
  pp.textContent = persisted ? 'dauerhaft gesichert' : 'Browser darf räumen';
  pp.className = 'pill ' + (persisted ? 'pill-lime' : 'pill-coral');
  $('#sgPersistBtn').hidden = persisted || !(st && st.persist);
  if (Sync.cfg()) {
    const c = Sync.cfg();
    $('#sgRepoVal').textContent = `${fmtBytes(remoteB)} von empfohlenen 1 GB`;
    $('#sgRepoBar').style.transform = `scaleX(${clamp(remoteB / 1073741824, 0.004, 1)})`;
    $('#sgRepoSub').textContent = `${c.owner}/${c.repo}${FileSync.busy ? ' · lädt hoch …' : FileSync.msg ? ' · ' + FileSync.msg : ''}`;
  } else {
    $('#sgRepoVal').textContent = 'kein Sync';
    $('#sgRepoBar').style.transform = 'scaleX(0)';
    $('#sgRepoSub').textContent = 'Dateien liegen nur auf diesem Gerät – Sync unter „Sicherheit & Sync“ einrichten.';
  }
}
$('#flFolders').addEventListener('click', e => { const b = e.target.closest('[data-folder]'); if (b) { ab.folder = b.dataset.folder; renderAblage(); } });
$('#flList').addEventListener('click', e => {
  if (e.target.closest('[data-fl-add]')) { $('#fileInput').click(); return; }
  const r = e.target.closest('[data-fid]'); if (r) openFile(r.dataset.fid);
});
$('#flAdd').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', e => { const fl = e.target.files; addFiles(fl).finally(() => { e.target.value = ''; }); });
$('#sgPersistBtn').addEventListener('click', async () => {
  const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist().catch(() => false) : false;
  toast(ok ? 'Speicher ist jetzt dauerhaft – der Browser räumt ihn nicht automatisch.' : 'Der Browser hat abgelehnt. Tipp: als App zum Home-Bildschirm hinzufügen und regelmäßig nutzen.');
  renderStorage();
});
(() => {
  const zone = $('#ablageArea'); let depth = 0;
  zone.addEventListener('dragenter', e => { if (!S || ![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); depth++; zone.classList.add('drop'); });
  zone.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
  zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('drop'); });
  zone.addEventListener('drop', e => { e.preventDefault(); depth = 0; zone.classList.remove('drop'); addFiles(e.dataTransfer.files); });
})();

/* ---------- Datei öffnen ---------- */
let curFile = null, fileUrl = null;
const revokeFile = () => { if (fileUrl) { URL.revokeObjectURL(fileUrl); fileUrl = null; } };
async function openFile(id) {
  const f = state.files.find(x => x.id === id); if (!f || !S) return;
  curFile = id; revokeFile();
  $('#fdH').textContent = f.name;
  $('#fdName').value = f.name; $('#fdFolder').value = f.folder; $('#fdNote').value = f.note;
  $('#fdFolderList').innerHTML = [...new Set(state.files.map(x => x.folder).filter(Boolean))].map(x => `<option value="${esc(x)}"></option>`).join('');
  $('#fdMeta').textContent = `${fmtBytes(f.size)} · abgelegt ${dateShort(f.added)} ${hm(f.added)}${f.type ? ' · ' + f.type : ''}`;
  $('#fdCloud').hidden = !(f.remote && local.ids.has(f.id));
  $('#fdShare').hidden = !(navigator.canShare);
  $('#fdOpen').hidden = true;
  $('#fdPreview').innerHTML = '<div class="fd-none">Entschlüssle …</div>';
  openDlg($('#fileDlg'));
  try {
    const bytes = await fileBytes(f);
    if (curFile !== id) return;
    fileUrl = URL.createObjectURL(new Blob([bytes], { type: f.type || 'application/octet-stream' }));
    const t = f.type || '';
    let html;
    if (/^image\//.test(t)) html = `<img src="${fileUrl}" alt="${esc(f.name)}">`;
    else if (/^video\//.test(t)) html = `<video src="${fileUrl}" controls playsinline></video>`;
    else if (/^audio\//.test(t)) html = `<audio src="${fileUrl}" controls></audio>`;
    else if (/^text\/|json|xml|csv/.test(t) || /\.(txt|md|csv|json|log)$/i.test(f.name)) html = `<pre class="fd-text">${esc(new TextDecoder().decode(bytes.subarray(0, 200000)))}</pre>`;
    else { html = `<div class="fd-none">${ico(fileIcon(f))}<span>${t === 'application/pdf' ? 'PDF – zum Ansehen öffnen oder herunterladen.' : 'Keine Vorschau für diesen Dateityp.'}</span></div>`; $('#fdOpen').hidden = false; }
    $('#fdPreview').innerHTML = html;
    if (document.body.dataset.area === 'ablage') renderAblage();
  } catch (e) { if (curFile === id) $('#fdPreview').innerHTML = `<div class="fd-none">${esc(e.message || 'Konnte nicht entschlüsselt werden.')}</div>`; }
}
$('#fileDlg').addEventListener('close', () => { revokeFile(); curFile = null; $('#fdPreview').innerHTML = ''; });
function saveBlobAs(name) { if (!fileUrl) { toast('Datei wird noch entschlüsselt …'); return; } const a = document.createElement('a'); a.href = fileUrl; a.download = name; document.body.append(a); a.click(); a.remove(); }
$('#fdDownload').addEventListener('click', () => { const f = state.files.find(x => x.id === curFile); if (f) saveBlobAs(f.name); });
$('#fdOpen').addEventListener('click', () => { if (fileUrl) window.open(fileUrl, '_blank'); });
$('#fdShare').addEventListener('click', async () => {
  const f = state.files.find(x => x.id === curFile); if (!f || !fileUrl) return;
  try {
    const blob = await (await fetch(fileUrl)).blob();
    const file = new File([blob], f.name, { type: f.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: f.name });
    else toast('Teilen wird hier nicht unterstützt – bitte herunterladen.');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Teilen nicht möglich.'); }
});
$('#fdForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = state.files.find(x => x.id === curFile); if (!f) return;
  const name = $('#fdName').value.trim() || f.name, folder = $('#fdFolder').value.trim(), note = $('#fdNote').value.trim();
  if (name !== f.name || folder !== f.folder || note !== f.note) { Object.assign(f, normFile({ ...f, name, folder, note, u: Date.now() })); commit(); toast('Gespeichert'); }
  closeDlg($('#fileDlg'));
});
$('#fdCloud').addEventListener('click', async () => {
  const f = state.files.find(x => x.id === curFile); if (!f || !f.remote) return;
  await IDB.del(f.id).catch(() => {}); local.ids.delete(f.id);
  closeDlg($('#fileDlg')); toast(`Lokale Kopie entfernt – ${fmtBytes(encSize(f.size))} frei. Beim Öffnen wird sie neu geladen.`);
  renderAblage();
});
$('#fdDelete').addEventListener('click', async () => {
  const f = state.files.find(x => x.id === curFile); if (!f) return;
  const a = await ask({ title: 'Datei löschen?', text: `„${f.name}“ wird auf allen Geräten und im Tresor-Repo gelöscht.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!a) return;
  state.files = state.files.filter(x => x.id !== f.id); state.del[f.id] = tombTs(f);
  await IDB.del(f.id).catch(() => {}); local.ids.delete(f.id);
  closeDlg($('#fileDlg')); commit(); removeRemote(f.id);
  toast('Datei gelöscht');
});

try { const a0 = sessionStorage.getItem('workoholic:area'); setArea(AREAS.includes(a0) ? a0 : 'heute', { keepScroll: true }); } catch (e) { setArea('heute', { keepScroll: true }); }

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
      FileSync.kick();
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
  IDB.clear().catch(() => {});
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
  if (k === 'n') { e.preventDefault(); contextNew(); }
  else if (/^[1-4]$/.test(e.key)) { e.preventDefault(); setArea(AREAS[Number(e.key) - 1]); }
  else if (e.key === '/') { e.preventDefault(); if (mobileMQ.matches) searchBox.classList.add('expanded'); searchInput.focus(); }
  else if (k === 'd' && !e.repeat) { e.preventDefault(); dongleAction(); }
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
