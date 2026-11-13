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
const blank = () => ({ v: 3, items: [], shifts: [], tpls: defaultTpls(), appts: [], routines: [], runs: [], people: [], notes: [], files: [], checks: [], docs: [], ops: [], del: {}, settings: { targetMin: 480, name: '', u: 0 } });
const RHYTHMS = { manual: 'Bei Bedarf', daily: 'Täglich', weekdays: 'Werktags', weekly: 'Wöchentlich', monthly: 'Monatlich' };
const COLLECTIONS = ['items', 'shifts', 'tpls', 'appts', 'routines', 'runs', 'people', 'notes', 'files', 'checks', 'docs', 'ops'];
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
    imp: !!x.imp,
    op: x.op ? String(x.op).slice(0, 40) : null,
    doc: x.doc ? String(x.doc).slice(0, 40) : null,
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
  const crew = [];
  for (const c of (Array.isArray(x.crew) ? x.crew : [])) {
    const name = String((c && c.name) || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (name && crew.length < 6 && !crew.some(y => y.name.toLowerCase() === name.toLowerCase())) crew.push({ id: c.id ? String(c.id).slice(0, 40) : null, name });
  }
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
    tpl: x.tpl ? String(x.tpl).slice(0, 40) : null,
    unit: String(x.unit || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    crew,
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
  return { id: String(x.id || uid()), name: str(x.name, 60).trim() || 'Routine', color: COLORS[x.color] ? x.color : 'lime', rhythm: RHYTHMS[x.rhythm] ? x.rhythm : 'manual', steps, note: str(x.note, 1000),
    tpls: [...new Set((Array.isArray(x.tpls) ? x.tpls : []).map(v => String(v).slice(0, 40)).filter(Boolean))].slice(0, 20).sort(),
    units: [...new Set((Array.isArray(x.units) ? x.units : []).map(v => String(v).replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean))].slice(0, 10), u: num(x.u) || 1 };
}
function normRun(x) {
  const started = num(x && x.started);
  if (started == null || !x.rid) return null;
  const done = {};
  for (const k of Object.keys(x.done || {}).sort()) { const v = num(x.done[k]); if (v) done[k] = v; }
  return { id: String(x.id || uid()), rid: String(x.rid), started, done, finished: num(x.finished), u: num(x.u) || 1 };
}
/* Amtsbezeichnungen (Kurzform wie im Bericht). Erkennt auch „pkin“, „PK'in“ oder „Polizeioberkommissarin“ in alten Rollen. */
const RANKS = ['PKA', 'PKAin', 'PK', 'PKin', 'POK', 'POKin', 'PHK', 'PHKin', 'EPHK', 'EPHKin', 'KK', 'KKin', 'KOK', 'KOKin', 'KHK', 'KHKin', 'EKHK', 'EKHKin', 'PR', 'PRin', 'POR', 'PORin', 'KR', 'KRin', 'KOR', 'KORin', 'PD', 'PDin', 'LPD', 'LPDin', 'KD', 'KDin', 'LKD', 'LKDin'];
const RANK_LONG = { 'polizeikommissaranwärter': 'PKA', 'kommissaranwärter': 'PKA', 'polizeikommissar': 'PK', 'polizeioberkommissar': 'POK', 'polizeihauptkommissar': 'PHK', 'erster polizeihauptkommissar': 'EPHK', 'erste polizeihauptkommissar': 'EPHK', 'kriminalkommissar': 'KK', 'kriminaloberkommissar': 'KOK', 'kriminalhauptkommissar': 'KHK', 'erster kriminalhauptkommissar': 'EKHK', 'erste kriminalhauptkommissar': 'EKHK', 'polizeirat': 'PR', 'polizeirät': 'PR', 'polizeioberrat': 'POR', 'polizeioberrät': 'POR', 'kriminalrat': 'KR', 'kriminalrät': 'KR', 'kriminaloberrat': 'KOR', 'kriminaloberrät': 'KOR' };
function rankNorm(t) {
  const c = String(t || '').replace(/[’'´`.]/g, '').replace(/\s+/g, ' ').replace(/ in$/i, 'in').trim(); if (!c) return '';
  const hit = RANKS.find(r => r.toLowerCase() === c.toLowerCase()); if (hit) return hit;
  const l = c.toLowerCase(), fem = /in$/.test(l), base = fem ? l.slice(0, -2) : l;
  return RANK_LONG[base] ? RANK_LONG[base] + (fem ? 'in' : '') : (RANK_LONG[l] || '');
}
/** Amtsbezeichnung einer Person: eigenes Feld, sonst aus einer Rolle erkannt. */
const rankOfPerson = p => (p ? rankNorm(p.rank) || String(p.rank || '').trim() || (p.roles || []).map(rankNorm).find(Boolean) || '' : '');
function normPerson(x) {
  if (!x || !x.name) return null;
  const roles = [];
  for (const r of (Array.isArray(x.roles) ? x.roles : [])) { const t = str(r, 40).trim(); if (t && !roles.includes(t) && roles.length < 12) roles.push(t); }
  return { id: String(x.id || uid()), name: str(x.name, 80).trim() || 'Person', rank: rankNorm(x.rank) || str(x.rank, 12).trim(), roles, parent: x.parent ? String(x.parent) : null, contact: str(x.contact, 200), u: num(x.u) || 1 };
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
/** WaffG-Prüfstand: erlaubte Eingaben (feste Reihenfolge = kanonische Form) */
const WF_DEFAULT = () => ({
  obj: 'messer', messer: 'einhand', len: 9, beidseitig: false, springOeffnung: 'seitlich', springGrund: 'keiner', dolch: false, faustAusn: false,
  schuss: 'kurzHalb', teilHalb: true, erlaubnis: 'keine', jagdZweck: false, geladen: false,
  srs: 'ptb', kws: false, druck: 'f75', echt: true, hist: 'perk', mun: 'patrone', hieb: 'schlagstock', sonst: 'reizPtb', anschein: 'softair',
  handlung: 'fuehren', zugriff: 'zugriff', ort: 'oeffentlich', zweck: 'keiner',
  schussOrt: 'sonst', schiessErl: false, empfBer: false, grenze: 'rein', grenzErl: false, gewerbe: false, herstErl: false, gefahr: true,
  alter: 'erw', vorsatz: 'vorsatz', ausnahme: false, fund: false, verbot41: false
});
const WF_ENUMS = {
  obj: ['messer', 'schuss', 'srs', 'druck', 'hist', 'munition', 'hieb', 'sonst', 'anschein', 'kriegswaffe'],
  messer: ['einhand', 'feststehend', 'klapp', 'multi', 'spring', 'fall', 'faust', 'butterfly', 'getarnt'],
  springOeffnung: ['seitlich', 'frontal'],
  springGrund: ['keiner', 'einhaendig', 'beruf'],
  schuss: ['kurzHalb', 'kurzSonst', 'lang', 'voll', 'pump', 'getarnt', 'teil'],
  erlaubnis: ['keine', 'wbk', 'waffenschein', 'jagd'],
  srs: ['ptb', 'ohne'],
  druck: ['spiel05', 'f75', 'alt70', 'ueber75'],
  hist: ['lunte', 'perk', 'zuend', 'perkMehr', 'deko', 'salut'],
  mun: ['patrone', 'kartusche', 'verboten', 'reizGeschoss', 'kw'],
  hieb: ['schlagstock', 'teleskop', 'blank', 'schlagring', 'nunchaku', 'wurfstern', 'getarnt'],
  sonst: ['reizPtb', 'reizOhne', 'tierSpray', 'eigPtb', 'eigOhne', 'taser', 'tierEig', 'armbrust', 'schleuder', 'brand', 'bogen'],
  anschein: ['softair', 'nachbildung', 'spielzeug'],
  handlung: ['besitz', 'erwerb', 'fuehren', 'ueberlassen', 'schiessen', 'verbringen', 'herstellen', 'handel', 'aufbewahrung'],
  zugriff: ['zugriff', 'nicht', 'behaeltnis'],
  ort: ['oeffentlich', 'veranstaltung', 'fernverkehr', 'zone', 'fremd', 'eigen'],
  zweck: ['keiner', 'beruf', 'sport', 'anerkannt', 'gastro', 'film', 'rettung', 'anliefer', 'hausrecht'],
  schussOrt: ['stand', 'besitztum', 'sonst', 'notwehr'],
  grenze: ['rein', 'eu', 'dritt'],
  alter: ['erw', 'jug', 'kind'],
  vorsatz: ['vorsatz', 'fahrl']
};
const WF_LEVEL_KEYS = ['erlaubt', 'hinweis', 'owi', 'straftat'];
/** Übernimmt Prüfungen aus der ersten Fassung (VUF-Felder) in das neue Schema. */
function wfMigrate(x) {
  const o = {};
  const ob = x.objektart, H = x.handlung;
  o.handlung = H === 'transport' ? 'fuehren' : H;
  if (H === 'transport') o.zugriff = 'behaeltnis';
  o.ort = { normal: 'oeffentlich', veranstaltung: 'veranstaltung', oepnv: 'fernverkehr', zone: 'zone' }[x.ort];
  o.alter = x.volljaehrig === false ? 'jug' : 'erw';
  o.vorsatz = x.vorsatz === false ? 'fahrl' : 'vorsatz';
  if (x.berechtigt) o.zweck = 'anerkannt';
  if (ob === 'messer') { o.obj = 'messer'; o.messer = x.messerBauart === 'multi' ? 'multi' : x.messerBauart; o.len = x.klingenlaenge; o.beidseitig = x.beidseitig; o.springOeffnung = x.springOeffnung; o.dolch = x.dolch; o.springGrund = x.berechtigt ? 'einhaendig' : 'keiner'; }
  else if (ob === 'schuss') {
    if (x.schussZustand === 'deko' || x.schussZustand === 'antik') { o.obj = 'hist'; o.hist = x.schussZustand === 'deko' ? 'deko' : 'perk'; }
    else { o.obj = 'schuss'; o.schuss = x.vollautomat ? 'voll' : 'kurzSonst'; }
    o.erlaubnis = x.schusserlaubnis;
  } else if (ob === 'srs') { o.obj = 'srs'; o.srs = x.srsPtb === false ? 'ohne' : 'ptb'; o.kws = !!x.kwSchein; }
  else if (ob === 'druck') { o.obj = 'druck'; o.druck = { spielzeug: 'spiel05', f75: 'f75', ueber75: 'ueber75' }[x.druckEnergie]; }
  else if (ob === 'munition') { o.obj = 'munition'; o.mun = x.munKriegswaffe ? 'kw' : x.munFrei ? 'kartusche' : 'patrone'; o.erlaubnis = x.munErlaubnis ? 'wbk' : 'keine'; }
  else if (ob === 'anschein') { o.obj = 'anschein'; o.anschein = 'nachbildung'; }
  else if (ob === 'kriegswaffe') o.obj = 'kriegswaffe';
  else if (ob === 'sonstige') {
    const it = x.sonstigeItem;
    const hieb = { schlagstock: 'schlagstock', teleskop: 'teleskop', schlagring: 'schlagring', wurfstern: 'wurfstern', nunchaku: 'nunchaku' }[it];
    if (hieb) { o.obj = 'hieb'; o.hieb = hieb; }
    else { o.obj = 'sonst'; o.sonst = { praezschleuder: 'schleuder', elektro: 'eigOhne', armbrust: 'armbrust', pfefferPtb: 'reizPtb', pfefferOhne: 'reizOhne' }[it]; }
  }
  return o;
}
function wfNormState(x) {
  if (x && typeof x === 'object' && x.objektart && !x.obj) x = wfMigrate(x);
  const d = WF_DEFAULT(), o = {};
  for (const k of Object.keys(d)) {
    const v = x && x[k];
    if (WF_ENUMS[k]) o[k] = WF_ENUMS[k].includes(v) ? v : d[k];
    else if (typeof d[k] === 'boolean') o[k] = typeof v === 'boolean' ? v : d[k];
    else { const n = Number(v); o[k] = Number.isFinite(n) ? clamp(Math.round(n * 2) / 2, 2, 30) : d[k]; }
  }
  return o;
}
function normCheck(x) {
  const at = num(x && x.at);
  if (at == null || !x.st || typeof x.st !== 'object') return null;
  return { id: String(x.id || uid()), at, title: str(x.title, 120).trim(), st: wfNormState(x.st), level: WF_LEVEL_KEYS.includes(x.level) ? x.level : 'hinweis', verdict: str(x.verdict, 160), text: str(x.text, 8000), u: num(x.u) || 1 };
}
/**
 * Schriftliche Arbeiten (Vorgänge). `data` ist das Antwortobjekt des jeweiligen Moduls (z. B. js/vuf.js) und wird
 * in kanonischer Schlüsselreihenfolge gehalten, damit alle Geräte bitgleich übereinstimmen. Liegt – wie alles – nur
 * verschlüsselt im Tresor.
 */
const DOC_MAX = 200000; // Zeichen JSON je Vorgang
function canon(v, depth = 0) {
  if (depth > 6) return null;
  if (Array.isArray(v)) return v.slice(0, 200).map(x => canon(x, depth + 1));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) { if (/^[\w.-]{1,40}$/.test(k)) o[k] = canon(v[k], depth + 1); } return o; }
  if (typeof v === 'string') return v.slice(0, 20000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean' || v === null) return v;
  return null;
}
function normDoc(x) {
  if (!x || typeof x !== 'object' || !x.id) return null;
  const now = Date.now();
  const d = {
    id: String(x.id).slice(0, 40), type: str(x.type, 24), title: str(x.title, 120),
    status: x.status === 'fertig' ? 'fertig' : 'entwurf', step: Math.max(0, Math.round(Number(x.step) || 0)),
    data: canon(x.data && typeof x.data === 'object' ? x.data : {}),
    createdAt: num(x.createdAt) || now, u: num(x.u) || num(x.updatedAt) || now
  };
  if (!d.type) return null;
  if (JSON.stringify(d.data).length > DOC_MAX) return null;
  return d;
}
/** Einsatz in einer Schicht. `end` = beendet; Abschluss über Ergebnis, „keine Maßnahmen“ oder verknüpfte To-dos (item.op). */
function normOp(x) {
  const start = num(x && x.start);
  if (start == null || !x.sid) return null;
  const end = num(x.end);
  return { id: String(x.id || uid()), sid: String(x.sid).slice(0, 40), n: clamp(Math.round(Number(x.n) || 1), 1, 999), start, end: end != null && end >= start ? end : null,
    title: str(x.title, 80).trim(), place: str(x.place, 120).trim(), note: str(x.note, 4000), outcome: str(x.outcome, 4000), none: !!x.none, u: num(x.u) || 1 };
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
  b.checks = normList(s.checks, normCheck).filter(live).sort((a, c) => a.at - c.at || cmp(a.id, c.id));
  b.docs = normList(s.docs, normDoc).filter(live).sort((a, c) => a.createdAt - c.createdAt || cmp(a.id, c.id));
  const sids = new Set(b.shifts.map(x => x.id));
  b.ops = normList(s.ops, normOp).filter(live).filter(o => sids.has(o.sid)).sort((a, c) => a.start - c.start || cmp(a.id, c.id));
  const oids = new Set(b.ops.map(o => o.id));
  for (const it of b.items) if (it.op && !oids.has(it.op)) it.op = null;
  const dids = new Set(b.docs.map(d => d.id));
  for (const it of b.items) if (it.doc && !dids.has(it.doc)) it.doc = null;
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
  if (planned) { openStartSheet({ planned: planned.id }); return; }
  openStartSheet();
}
function startShift(tpl, extra = {}) {
  if (!S || liveShift()) return null;
  const now = Date.now(), snap = extra.snap || snapshot();
  const len = tpl ? tplLen(tpl) : state.settings.targetMin + 30;
  const sh = normShift({ id: uid(), date: dayKey(now), name: tpl ? tpl.name : 'Dienst', color: tpl ? tpl.color : 'lime', start: now,
    plannedEnd: tpl ? endAfter(now, tpl.end, len) : now + len * MIN, breakMin: tpl ? tpl.breakMin : 30, extraMin: 0, live: true,
    tpl: tpl ? tpl.id : null, crew: extra.crew || [], unit: extra.unit || '', u: now });
  state.shifts.push(sh);
  commit();
  toast(`Eingedongelt · ${sh.name} bis ${hm(sh.plannedEnd)}`, { undo: snap });
  if (navigator.vibrate) navigator.vibrate(12);
  return sh;
}
async function endShift(id) {
  const sh = state.shifts.find(s => s.id === id); if (!sh || !sh.live) return;
  const openOps = state.ops.filter(o => o.sid === id && o.end == null);
  const noClose = state.ops.filter(o => o.sid === id && o.end != null && opState(o).k === 'missing');
  const rtOpen = routinesFor(sh).filter(r => r.steps.length).map(r => { const run = runInShift(r, sh); return run && run.finished ? null : `${r.name} (${run ? `${r.steps.filter(x => run.done[x.id]).length}/${r.steps.length}` : 'nicht begonnen'})`; }).filter(Boolean);
  if (openOps.length || noClose.length || rtOpen.length) {
    const lines = [];
    if (openOps.length) lines.push(`${openOps.map(o => 'E' + o.n).join(', ')} ${openOps.length === 1 ? 'läuft' : 'laufen'} noch und ${openOps.length === 1 ? 'wird' : 'werden'} mit dem Dienstende beendet.`);
    if (noClose.length) lines.push(`Ohne Abschluss: ${noClose.map(o => `E${o.n}${o.title ? ' ' + o.title : ''}`).join(', ')}.`);
    if (rtOpen.length) lines.push(`Routinen offen: ${rtOpen.join(', ')}.`);
    lines.push('Abschluss und Maßnahmen kannst du auch danach noch eintragen.');
    const first = openOps[0] || noClose[0];
    const r0 = await ask({ title: openOps.length ? (openOps.length === 1 ? `Einsatz E${openOps[0].n} läuft noch` : `${openOps.length} Einsätze laufen noch`) : 'Noch offen in dieser Schicht', text: lines.join(' '), buttons: [{ label: 'Abbrechen', value: null }, ...(first ? [{ label: 'Einsätze ansehen', value: 'show' }] : []), { label: 'Ausdongeln', value: 'go', cls: 'btn-accent', submit: true }] });
    if (!r0) return;
    if (r0.value === 'show') { openOp(first.id); return; }
  }
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
  for (const o of state.ops) if (o.sid === cur.id && o.end == null) { o.end = Math.max(o.start, endAt); o.u = Date.now(); }
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
  const r = baseRank(it, now);
  return it.imp ? [r[0] - 0.5, r[1]] : r;
}
function baseRank(it, now) {
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
  if (it.imp) return 'imp';
  if (it.mode === 'asap') return 'asap';
  const d = dueOf(it);
  if (d != null) { if (d < now) return 'overdue'; if (d < eod(now)) return 'today'; return 'soon'; }
  return 'open';
}
const GROUPS = [['imp', 'Wichtig'], ['asap', 'Schnellstmöglich'], ['overdue', 'Überfällig'], ['today', 'Heute'], ['soon', 'Demnächst'], ['open', 'Ohne Termin'], ['done', 'Erledigt']];

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

const opCountTag = sid => { const n = state.ops.filter(o => o.sid === sid).length; return n ? `<span class="pill pill-quiet mono op-count" title="${n} ${n === 1 ? 'Einsatz' : 'Einsätze'}">${n} E</span>` : ''; };
function renderShiftList(now) {
  const key = ui.selDay || dayKey(now), t = fromKey(key), isToday = key === dayKey(now);
  const list = shiftsOn(key).sort((a, b) => a.start - b.start);
  const total = list.reduce((s, x) => s + shiftWorked(x, now), 0);
  $('#stampsTitle').textContent = `${isToday ? 'Heute' : dateShort(t)}${list.length && total ? ` · ${dur(total)} h` : ''}`;
  $('#stampsToday').hidden = isToday;
  $('#stampList').innerHTML = list.length ? list.map(sh => {
    const planned = isPlanned(sh, now);
    const endTxt = sh.live ? `<span class="run"><i class="pulse"></i>läuft</span>` : `<span class="mono">${hm(sh.end != null && sh.end < sh.plannedEnd ? sh.end : sh.plannedEnd)}</span>`;
    return `<li class="stamp shift" data-shift="${sh.id}"><i class="cdot" style="background:${COLORS[sh.color]}"></i><span class="sh-name">${esc(sh.name)}</span><span class="mono dim">${hm(sh.start)}–</span>${endTxt}${planned ? '<span class="pill pill-quiet">geplant</span>' : ''}<span class="grow"></span>${opCountTag(sh.id)}${sh.extraMin ? `<span class="mono extra-tag">+${dur(sh.extraMin * MIN)}</span>` : ''}<button class="icon-btn sm" type="button" data-shift-edit="${sh.id}" aria-label="${esc(sh.name)} ${hm(sh.start)} bearbeiten">${ico('edit')}</button></li>`;
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
  if (ui.q) { const q = norm(ui.q), o = it.op ? state.ops.find(x => x.id === it.op) : null; if (!norm(`${it.title} ${it.notes} ${it.from} ${o ? o.title + ' ' + o.place : ''}`).includes(q)) return false; }
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
  const iop = it.op ? state.ops.find(x => x.id === it.op) : null;
  if (iop) pills.push(`<button type="button" class="pill pill-outline op-pill" data-act="op" data-op="${esc(iop.id)}" aria-label="Einsatz ${iop.n} öffnen">E${iop.n}${iop.title ? ' · ' + esc(iop.title.length > 18 ? iop.title.slice(0, 17) + '…' : iop.title) : ''}</button>`);
  if (!it.done && it.kind === 'buchung' && it.bMin) pills.push(`<span class="pill pill-blue">${ico('clockplus')}+${dur(it.bMin * MIN)}</span>`);
  pills.push(urgencyPill(it, now));
  if (it.mode === 'dauer' && !it.done) pills.push(`<button type="button" class="tbtn${it.timerStart ? ' on' : ''}" data-act="timer" aria-label="${it.timerStart ? 'Timer pausieren' : 'Timer starten'}">${ico(it.timerStart ? 'pause' : 'play')}</button>`);

  const diff = d != null ? d - now : null;
  const cls = ['item'];
  if (it.done) cls.push('done');
  else if (it.mode === 'asap' || it.timerStart) cls.push('hot');
  if (!it.done && it.imp) cls.push('imp');
  else if (diff != null && diff < 0) cls.push('late');
  return `<li class="${cls.join(' ')}" data-id="${it.id}" tabindex="0" aria-label="${esc(it.title)} – ${esc(k.label)}${it.done ? ', erledigt' : ''}">
    ${tile}
    <div class="main"><div class="title">${!it.done && it.imp ? '<span class="imp-star" aria-label="wichtig">★</span>' : ''}${esc(it.title)}</div><div class="sub">${sub.join(' · ')}</div></div>
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
    arr.sort(g === 'imp' ? (x, y) => x.createdAt - y.createdAt || cmp(x.id, y.id) : byRank(now));
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
  renderOpCard(now);
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
  $('#cImp').checked = !!(preset.imp ?? it.imp);
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
    const iop = it.op ? state.ops.find(x => x.id === it.op) : null;
    if (iop) bits.push(`aus Einsatz E${iop.n}${iop.title ? ' · ' + iop.title : ''} (${dateShort(iop.start)})`);
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
  const data = { title, notes: $('#cNotes').value.trim(), imp: $('#cImp').checked, kind: C.kind, from: C.kind === 'todo' ? '' : $('#cFrom').value.trim(), mode: C.mode, status: C.status, due: null, durMin: null, repeat: null, repDay: null,
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
  SH.carry = !sh && opts.carry ? opts.carry : null;
  SH.tpl = sh ? sh.tpl : null;
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
  $('#shName').value = tp.name; SH.color = tp.color; SH.breakMin = tp.breakMin; SH.tpl = tp.id;
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
  // Vorlage merken (Routinen hängen daran) – aber nur, solange der Name noch zur Vorlage passt
  const tplRec = SH.tpl && state.tpls.find(t => t.id === SH.tpl);
  data.tpl = tplRec && norm(tplRec.name) === norm(name) ? tplRec.id : (state.tpls.find(t => norm(t.name) === norm(name)) || {}).id || null;
  const carry = !SH.id && live && SH.carry ? SH.carry : null;
  if (carry) { data.crew = resolveCrew(carry.crew, now); data.unit = carry.unit; }
  let newId = null;
  if (SH.id) {
    const sh = state.shifts.find(x => x.id === SH.id);
    if (!sh) { toast('Dieser Dienst wurde inzwischen auf einem anderen Gerät gelöscht.'); closeDlg($('#shiftDlg')); return; }
    Object.assign(sh, normShift({ ...sh, ...data }));
  } else { newId = uid(); state.shifts.push(normShift({ id: newId, ...data })); }
  SH.carry = null;
  closeDlg($('#shiftDlg'));
  commit();
  if (live && newId) setTimeout(() => shiftBriefing(newId), reduceMotion.matches ? 0 : mobileMQ.matches ? 340 : 220);
  toast(SH.id ? 'Dienst gespeichert' : live ? `Eingedongelt · ${name} bis ${hm(f.plannedEnd)}` : f.start > now ? `${name} geplant · ${dateShort(f.start)}` : 'Dienst eingetragen', { undo: snap });
}
$('#shDelete').addEventListener('click', () => {
  if (!SH.id) return;
  const snap = snapshot(), id = SH.id, rec = state.shifts.find(x => x.id === id);
  state.shifts = state.shifts.filter(x => x.id !== id);
  state.del[id] = tombTs(rec);
  const gone = state.ops.filter(o => o.sid === id);
  for (const o of gone) state.del[o.id] = tombTs(o);
  state.ops = state.ops.filter(o => o.sid !== id);
  closeDlg($('#shiftDlg')); commit();
  toast(`Dienst gelöscht${gone.length ? ` · ${gone.length} ${gone.length === 1 ? 'Einsatz' : 'Einsätze'}` : ''}`, { undo: snap });
});

/* ---------- Dienst beginnen (Vorlage wählen) ---------- */
$('#startCustom').addEventListener('click', () => {
  const pending = $('#stNewName').value.trim(); if (pending) addCrewName();
  const carry = { crew: ST.crew.slice(), unit: $('#stUnit').value.trim().replace(/\s+/g, ' ').slice(0, 40) };
  closeDlg($('#startDlg'));
  setTimeout(() => openShiftDialog(null, { live: true, date: dayKey(Date.now()), carry }), mobileMQ.matches ? 320 : 200);
});
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
$('#stampsToday').addEventListener('click', () => { ui.selDay = null; renderTime(); renderWeek(); renderOpCard(); });
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
    if (act.dataset.act === 'op') { openOp(act.dataset.op); return; }
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
  let s = ` ${raw} `, kind = null, from = '', asap = false, imp = false;
  if (/\s\*+(?=\s)/.test(s)) { imp = true; s = s.replace(/\s\*+(?=\s)/g, ' '); }
  s = s.replace(/\s#(anfrage|todo|aufgabe|buchung|stunden)(?=\s)/i, (_, k) => { kind = k.toLowerCase() === 'stunden' ? 'buchung' : k.toLowerCase(); return ' '; });
  s = s.replace(/\s@([\p{L}][\p{L}\p{N}._-]*)/u, (_, n) => { from = n.replace(/[._]+/g, ' ').trim(); return ' '; });
  if (/\s!+(?=\s)/.test(s) || /!\s*$/.test(s)) { asap = true; s = s.replace(/\s!+(?=\s)/g, ' ').replace(/!+\s*$/, ' '); }
  const title = s.replace(/\s+/g, ' ').trim();
  if (!kind) kind = from ? 'anfrage' : (ui.kind !== 'alle' ? ui.kind : 'todo');
  return { title: title || (kind === 'buchung' ? 'Überstunden eintragen' : ''), kind, from, mode: asap ? 'asap' : 'einmalig', imp };
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
  renderWeek(); renderShiftList(Date.now()); updateLive(Date.now()); renderOpCard();
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
    const r = await ask({ title: 'Alles löschen?', text: 'Entfernt alle Einträge, Dienste, Termine, Team-Notizen, gespeicherten Prüfungen, Dateien, Einsätze und schriftlichen Vorgänge – auch auf allen synchronisierten Geräten. Dienste-Katalog, Routinen-Vorlagen, Tresor und Passwort bleiben.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Alles löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
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
  const r = await ask({ title: 'Backup einspielen', text: `Das Backup enthält ${next.items.length} Einträge, ${next.shifts.length} Dienste und ${next.docs.length} schriftliche Vorgänge. Zusammenführen behält alles Neuere; Ersetzen setzt den Stand exakt auf das Backup.`, buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'replace', cls: 'btn-ghost btn-danger' }, { label: 'Zusammenführen', value: 'merge', cls: 'btn-accent', submit: true }] });
  if (!r) return;
  const snap = snapshot();
  if (r.value === 'replace') applyState(next);
  else { state = merge(state, next); commit(); }
  toast('Backup eingespielt', { undo: snap });
});

/* ======================= Demo data ======================= */
async function loadDemo() {
  if (state.items.length || state.shifts.length || state.appts.length || state.people.length || state.routines.length) {
    const r = await ask({ title: 'Beispieldaten laden?', text: 'Ersetzt Einträge, Dienste, Termine, Routinen und Team (auch auf synchronisierten Geräten). Dienste-Katalog, Dateien, gespeicherte Prüfungen und schriftliche Vorgänge bleiben. Du kannst es direkt danach rückgängig machen.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Ersetzen', value: 'ok', cls: 'btn-accent', submit: true }] });
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
  const liveSh = shifts.find(s => s.live) || shifts.filter(s => s.date === dayKey(now)).sort((a, b) => b.start - a.start)[0];
  const ops = [];
  if (liveSh) {
    Object.assign(liveSh, { tpl: 'tpl-frueh', crew: [{ id: jonas.id, name: jonas.name }], unit: 'Stf 21/03' });
  }
  if (liveSh && Math.min(now, liveSh.end ?? now) - liveSh.start > 2 * HOUR) {
    const o1 = { id: uid(), sid: liveSh.id, n: 1, start: liveSh.start + 50 * MIN, end: liveSh.start + 95 * MIN, title: 'Ruhestörung', place: 'Marktstraße 12', note: 'Laute Musik, Mieter einsichtig.', outcome: 'Lage beruhigt, Musik leiser gestellt.', none: true, u: now };
    const o2 = { id: uid(), sid: liveSh.id, n: 2, start: liveSh.start + 100 * MIN, end: liveSh.start + 115 * MIN, title: 'Verkehrsunfall', place: 'Kreuzung Bahnhofstraße', note: 'Blechschaden, zwei Pkw.', outcome: 'Unfallaufnahme vor Ort.', none: false, u: now };
    ops.push(o1, o2);
    items.push(mk({ title: 'Verkehrsunfallanzeige schreiben', kind: 'aufgabe', mode: 'einmalig', imp: true, op: o2.id, age: 1, notes: 'Aus Einsatz 2 · Verkehrsunfall' }), mk({ title: 'Lichtbilder sichern', kind: 'aufgabe', mode: 'einmalig', op: o2.id, age: 1 }));
  }
  items[7].imp = true;
  routines[0].tpls = ['tpl-frueh', 'tpl-spaet', 'tpl-nacht'];
  routines.push(R('Fahrzeugcheck', 'koralle', 'manual', ['Tankstand und Reifen', 'Funkgerät und Akkus', 'Erste-Hilfe-Set vollständig', 'Warnweste, Absperrband'], 'Vor der ersten Fahrt.'));
  routines[routines.length - 1].units = ['Stf 21/03'];
  applyState({ v: 3, items, shifts, tpls: state.tpls, appts, routines, runs, people: [lena, sabine, jonas, mehmet, anna], notes, files: state.files, checks: state.checks, docs: state.docs, ops, del: {}, settings: { ...state.settings } });

  toast('Beispieldaten geladen', { undo: snap });
}

/* ======================= Bereiche ======================= */
const AREAS = ['heute', 'routinen', 'team', 'ablage', 'waffg', 'freiheit', 'schreiben'];
function syncDockTabs() {
  const heute = document.body.dataset.area === 'heute';
  $$('.dock-btn[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(heute && b.dataset.tab === document.body.dataset.tab)));
}
function setArea(a, opts = {}) {
  if (!AREAS.includes(a)) a = 'heute';
  document.body.dataset.area = a;
  $$('#areas [data-area]').forEach(b => b.setAttribute('aria-current', b.dataset.area === a ? 'page' : 'false'));
  const cur = $(`#areas [data-area="${a}"]`), nav = $('#areas');
  if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: Math.max(0, cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
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
  else if (a === 'waffg') renderWaffg();
  else if (a === 'freiheit' && window.WFE) WFE.render();
  else if (a === 'schreiben' && window.WWriter) WWriter.render();
  const set = (id, n) => { const el = $(id); el.textContent = n || ''; el.hidden = !n; };
  set('#nRoutinen', state.routines.filter(r => routineDue(r)).length);
  set('#nTeam', state.people.length);
  set('#nAblage', state.files.length);
  set('#nWaffg', state.checks.length);
  // Abschnitte eines Vorgangs zählen nicht einzeln – der Vorgang steht für sie in der Liste
  const teil = new Set(state.docs.filter(d => d.type === 'vorgang').flatMap(d => (Array.isArray(d.data.teile) ? d.data.teile : []).map(t => t && t.id)));
  set('#nSchreiben', state.docs.filter(d => d.status !== 'fertig' && !teil.has(d.id)).length);
}
function contextNew() {
  const a = document.body.dataset.area;
  if (a === 'routinen') openRoutineEditor(null);
  else if (a === 'team') openPersonDialog(null);
  else if (a === 'ablage') $('#fileInput').click();
  else if (a === 'waffg') wfReset();
  else if (a === 'freiheit') { if (window.WFE) WFE.reset(); }
  else if (a === 'schreiben') { if (window.WWriter) WWriter.newDoc(); }
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
      <p class="rt-meta">${RHYTHMS[r.rhythm]}${r.tpls.length || r.units.length ? ' · ' + esc([...r.tpls.map(id => (state.tpls.find(t => t.id === id) || {}).name).filter(Boolean), ...r.units].join(', ')) : ''} · ${r.steps.length} ${r.steps.length === 1 ? 'Schritt' : 'Schritte'} · ${lf ? `zuletzt ${dateShort(lf.finished)} ${hm(lf.finished)}` : 'noch nie abgeschlossen'}${total ? ` · ${total}×` : ''}</p>
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
const RT = { id: null, color: 'lime', rhythm: 'manual', tpls: new Set() };
function openRoutineEditor(r) {
  if (!S) return;
  closeMenu();
  RT.id = r ? r.id : null; RT.color = r ? r.color : 'lime'; RT.rhythm = r ? r.rhythm : 'manual'; RT.tpls = new Set(r ? r.tpls : []);
  $('#reTpls').innerHTML = state.tpls.map(t => `<button type="button" data-tpl="${esc(t.id)}"><i class="op-rt-dot" style="--rc:${COLORS[t.color]}"></i>${esc(t.name)}</button>`).join('') || '<span class="hint">Noch keine Dienst-Vorlagen im Katalog.</span>';
  $('#reUnits').value = r ? r.units.join(', ') : '';
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
  $$('#reTpls button').forEach(b => b.setAttribute('aria-pressed', String(RT.tpls.has(b.dataset.tpl))));
  const n = $('#reSteps').value.split('\n').map(l => l.trim()).filter(Boolean).length;
  $('#reCount').textContent = `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`;
}
$('#reColors').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { RT.color = b.dataset.color; syncRoutineEditor(); } });
$('#reRhythm').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { RT.rhythm = b.dataset.v; syncRoutineEditor(); } });
$('#reTpls').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (!b) return; if (RT.tpls.has(b.dataset.tpl)) RT.tpls.delete(b.dataset.tpl); else RT.tpls.add(b.dataset.tpl); syncRoutineEditor(); });
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
  const units = $('#reUnits').value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
  const data = { name, color: RT.color, rhythm: RT.rhythm, steps, note: $('#reNote').value.trim(), tpls: [...RT.tpls].filter(id => state.tpls.some(t => t.id === id)), units, u: now };
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
        <button type="button" class="tm-row" data-pid="${p.id}" aria-current="${p.id === teamUi.pid}">${avatar(p)}<span class="tm-main"><span class="tm-name">${esc(p.name)}</span><span class="tm-roles">${[rankOfPerson(p), ...p.roles.filter(r => !rankOfPerson(p) || rankNorm(r) !== rankOfPerson(p))].filter(Boolean).map(esc).join(' · ') || 'ohne Rolle'}</span></span>${notesOf(p.id).length ? `<span class="tm-count mono">${notesOf(p.id).length}</span>` : ''}</button>
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
      <div class="tm-chips">${rankOfPerson(p) ? `<span class="pill pill-lime">${esc(rankOfPerson(p))}</span>` : ''}${p.roles.filter(r => !rankOfPerson(p) || rankNorm(r) !== rankOfPerson(p)).map(r => `<span class="pill pill-quiet">${esc(r)}</span>`).join('') || (rankOfPerson(p) ? '' : '<span class="dim">keine Rolle</span>')}</div></div>
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
  const rk = rankOfPerson(p);
  $('#pdRank').innerHTML = `<option value="">— keine —</option>` + [...RANKS, ...(rk && !RANKS.includes(rk) ? [rk] : [])].map(r => `<option value="${esc(r)}"${r === rk ? ' selected' : ''}>${esc(r)}</option>`).join('');
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
  const data = { name, rank: $('#pdRank').value, roles: PD.roles, parent: $('#pdParent').value || null, contact: $('#pdContact').value.trim(), u: now };
  let id = PD.id;
  const old = id ? personById(id) : null;
  // Umbenennen: Anfragen/Aufgaben hängen am Namen – mitziehen, damit die Zuordnung im Team bleibt
  let moved = 0;
  if (old && norm(old.name) !== norm(name)) for (const it of state.items) if (it.from && norm(it.from) === norm(old.name)) { it.from = name.slice(0, 60); touch(it); moved++; }
  if (old) Object.assign(old, normPerson({ ...old, ...data }));
  else { id = uid(); state.people.push(normPerson({ id, ...data })); }
  teamUi.pid = id; teamUi.detail = true;
  closeDlg($('#personDlg')); commit();
  if (document.body.dataset.area !== 'team') setArea('team');
  toast(old ? `Gespeichert${moved ? ` · ${moved} ${moved === 1 ? 'Eintrag' : 'Einträge'} übernommen` : ''}` : `${name} hinzugefügt`);
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
/** Bild/Datei aus einem Modul (z. B. Unfallskizze) verschlüsselt in der Ablage speichern – gibt die Datei-ID zurück. */
async function addBlob(blob, name, folder) {
  if (!S || !blob) return null;
  await refreshLocal();
  if (!local.ok) { toast('Die Dateiablage ist in diesem Browser-Modus nicht verfügbar.'); return null; }
  if (blob.size > V.MAX_FILE) { toast('Datei zu groß (max. 20 MB).'); return null; }
  const id = uid();
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const rec = await V.encryptFile(S.dek, id, bytes);
    bytes.fill(0);
    await IDB.put(id, rec);
  } catch (e) { toast(e && e.name === 'QuotaExceededError' ? 'Gerätespeicher voll – Bild konnte nicht gespeichert werden.' : 'Bild konnte nicht verschlüsselt werden.'); return null; }
  local.ids.add(id);
  const now = Date.now();
  state.files.push(normFile({ id, name, type: blob.type || 'application/octet-stream', size: blob.size, folder: folder || '', added: now, remote: false, u: now }));
  commit(); FileSync.kick();
  return id;
}
async function fileBlob(id) {
  if (!S) return null;
  const f = state.files.find(x => x.id === id); if (!f) return null;
  const bytes = await fileBytes(f);
  return new Blob([bytes], { type: f.type || 'application/octet-stream' });
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

/* ======================= Schicht: Besetzung, Einsätze, Routinen, Briefing ======================= */
const opsOf = sid => state.ops.filter(o => o.sid === sid).sort((a, b) => a.start - b.start || a.n - b.n);
const opById = id => state.ops.find(o => o.id === id) || null;
const opTodos = oid => state.items.filter(i => i.op === oid);
const joinDe = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1];
const unitKey = s => norm(s).replace(/\s+/g, ' ').trim();
const hmIn = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** Abschluss-Stand eines Einsatzes für Liste und Dialog. */
function opState(o) {
  const t = opTodos(o.id), open = t.filter(i => !i.done).length;
  if (o.end == null) return { k: 'run', l: 'läuft' };
  if (open) return { k: 'todo', l: `${open} ${open === 1 ? 'Maßnahme' : 'Maßnahmen'} offen` };
  if (o.none) return { k: 'done', l: 'keine Maßnahmen' };
  if (t.length) return { k: 'done', l: 'Maßnahmen erledigt' };
  if (o.outcome.trim()) return { k: 'done', l: 'abgeschlossen' };
  return { k: 'missing', l: 'Abschluss fehlt' };
}
/** Routinen, die zur Schicht gehören: über die Dienst-Vorlage oder das Einsatzmittel. */
function routinesFor(sh) {
  if (!sh) return [];
  const u = unitKey(sh.unit);
  return state.routines.filter(r => (sh.tpl && r.tpls.includes(sh.tpl)) || (u && r.units.some(x => unitKey(x) === u)));
}
/** Durchlauf einer Routine in dieser Schicht (Start ab 15 Min vor Dienstbeginn). */
const runInShift = (r, sh) => runsOf(r.id).filter(x => x.started >= sh.start - 15 * MIN && (sh.live || x.started <= (sh.end ?? sh.plannedEnd))).sort((a, b) => b.started - a.started)[0] || null;
/** Schicht für die Schichtkarte: die laufende, sonst die letzte des gewählten Tages (Woche) mit Einsätzen oder Besetzung. */
function opShift(now = Date.now()) {
  const key = ui.selDay && ui.selDay !== dayKey(now) ? ui.selDay : null;
  if (!key) { const live = liveShift(); if (live) return live; }
  return shiftsOn(key || dayKey(now)).filter(s => !isPlanned(s, now) && (opsOf(s.id).length || s.crew.length || s.unit)).sort((a, b) => b.start - a.start)[0] || null;
}
/** Name aus dem Team (folgt Umbenennungen), sonst der bei Dienstbeginn eingetragene. */
const crewName = c => { const p = c.id && state.people.find(x => x.id === c.id); return p ? p.name : c.name; };
const crewChip = c => { const n = crewName(c); return `<span class="op-av" style="--h:${avHue(n)}" aria-hidden="true">${esc(initials(n))}</span>`; };
const crewLine = crew => `<span class="op-crew"><span class="op-avs">${crew.map(crewChip).join('')}</span><span>mit ${esc(joinDe(crew.map(crewName)))}</span></span>`;

function renderOpCard(now = Date.now()) {
  const card = $('#opCard'), sh = opShift(now);
  card.hidden = !sh;
  if (!sh) return;
  const live = !!sh.live, ops = opsOf(sh.id);
  card.style.setProperty('--c', COLORS[sh.color]);
  card.classList.toggle('is-live', live);
  $('#opKicker').textContent = live ? 'Schicht läuft' : sh.date === dayKey(now) ? `Schicht beendet · ${hm(sh.end ?? sh.plannedEnd)}` : `Schicht vom ${dateShort(sh.start)}`;
  $('#opH').textContent = `${sh.name} · ${hm(sh.start)}–${hm(sh.plannedEnd)}`;
  $('#opMeta').innerHTML = (sh.crew.length ? crewLine(sh.crew) : '<span class="dim">Besetzung nicht eingetragen</span>')
    + (sh.unit ? `<span class="pill pill-outline mono op-unit">${esc(sh.unit)}</span>` : '');
  $('#opAdd').hidden = !live;
  $('#opEditCrew').textContent = sh.crew.length || sh.unit ? 'Besetzung ändern' : 'Besetzung eintragen';
  const todosOpen = ops.reduce((n, o) => n + opTodos(o.id).filter(i => !i.done).length, 0), running = ops.filter(o => o.end == null).length, missing = ops.filter(o => opState(o).k === 'missing').length;
  $('#opStats').innerHTML = ops.length ? [`<b class="mono">${ops.length}</b> ${ops.length === 1 ? 'Einsatz' : 'Einsätze'}`, running ? `<b class="mono">${running}</b> läuft` : '', todosOpen ? `<b class="mono">${todosOpen}</b> ${todosOpen === 1 ? 'Maßnahme' : 'Maßnahmen'} offen` : '', missing ? `<b class="mono">${missing}</b> ohne Abschluss` : ''].filter(Boolean).join('<i aria-hidden="true">·</i>') : '';
  $('#opList').innerHTML = ops.length ? ops.map(o => {
    const st = opState(o);
    return `<li><button type="button" class="op-row" data-op="${esc(o.id)}" data-st="${st.k}"><span class="op-n mono">E${o.n}</span><span class="op-main"><span class="op-t">${esc(o.title || 'Einsatz ohne Stichwort')}</span><span class="op-s">${o.place ? esc(o.place) + ' · ' : ''}<span class="mono">${hm(o.start)}${o.end != null ? '–' + hm(o.end) : ''}</span></span></span><span class="op-st">${st.k === 'run' ? '<i class="pulse"></i>' : ''}${esc(st.l)}</span></button></li>`;
  }).join('') : `<li class="op-empty">${live ? 'Noch kein Einsatz – für jeden Einsatz einmal „+ Einsatz“ tippen.' : 'Keine Einsätze in dieser Schicht.'}</li>`;
  const rts = routinesFor(sh);
  $('#opRt').hidden = !rts.length;
  $('#opRtList').innerHTML = rts.map(r => {
    const run = runInShift(r, sh), n = r.steps.length, d = run ? r.steps.filter(s => run.done[s.id]).length : 0, fin = run && run.finished;
    return `<li><button type="button" class="op-rt-row${fin ? ' done' : run ? ' run' : ''}" data-rt="${esc(r.id)}" style="--rc:${COLORS[r.color]}"><span class="op-rt-dot" aria-hidden="true"></span><span class="op-rt-n">${esc(r.name)}</span><span class="op-rt-p mono">${fin ? ico('check') + 'erledigt' : run ? `${d}/${n}` : `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`}</span></button></li>`;
  }).join('');
}
$('#opAdd').addEventListener('click', addOp);
$('#opEditCrew').addEventListener('click', () => { const sh = opShift(); if (sh) openStartSheet({ edit: sh.id }); });
$('#opList').addEventListener('click', e => { const b = e.target.closest('[data-op]'); if (b) openOp(b.dataset.op); });
$('#opRtList').addEventListener('click', e => { const b = e.target.closest('[data-rt]'); const sh = opShift(); if (b && sh) startShiftRoutine(b.dataset.rt, sh); });
function startShiftRoutine(rid, sh) {
  const r = state.routines.find(x => x.id === rid); if (!r || !S) return;
  if (!r.steps.length) { startRoutine(rid); return; }
  let run = runInShift(r, sh);
  if (!run && !sh.live) { toast('Die Schicht ist beendet – Routinen startest du in der laufenden Schicht.'); return; }
  if (!run) { const now = Date.now(); run = normRun({ id: uid(), rid, started: now, done: {}, finished: null, u: now }); state.runs.push(run); commit(); }
  curRun = run.id; renderRunDialog(); openDlg($('#runDlg'));
}

/* ---------- Einsatz ---------- */
const OP_WORDS = ['Ruhestörung', 'Verkehrsunfall', 'Streitigkeit', 'Diebstahl', 'Körperverletzung', 'Sachbeschädigung', 'Hilfeersuchen', 'Hilflose Person', 'Vermisste Person', 'Verkehrskontrolle', 'Alarmauslösung', 'Gefahrenstelle'];
const OP_TODO_WORDS = ['Anzeige schreiben', 'Bericht fertigen', 'Vorgang anlegen', 'Lichtbilder sichern', 'Asservate erfassen', 'Zeugen nachvernehmen', 'Mitteilung an Behörde', 'Nachbericht'];
const OPD = { id: null, imp: false, mode: null, moreT: false, moreM: false };
/** Häufig genutzte Vorschläge zuerst (eigene Einsätze bzw. Maßnahmen), sonst feste Reihenfolge. */
function rankWords(base, used) {
  const cnt = new Map();
  for (const t of used) { const k = norm(t); if (k) cnt.set(k, (cnt.get(k) || 0) + 1); }
  return base.map((w, i) => ({ w, i, c: cnt.get(norm(w)) || 0 })).sort((a, b) => b.c - a.c || a.i - b.i).map(x => x.w);
}
const suggHtml = (words, more, moreKey, show) => {
  const shown = more ? words : words.slice(0, show), rest = words.length - shown.length;
  return shown.map(w => `<button type="button" class="chip sm" data-v="${esc(w)}">${moreKey === 'm' ? '+ ' : ''}${esc(w)}</button>`).join('')
    + (rest > 0 ? `<button type="button" class="chip sm more" data-more="${moreKey}" aria-label="${rest} weitere Vorschläge">Mehr · ${rest}</button>` : '');
};
/** Vorschläge im Einsatz: Stichwort nur solange leer bzw. gefiltert beim Tippen; Maßnahmen ohne bereits angelegte. */
function renderOpSugg() {
  const o = opById(OPD.id); if (!o) return;
  const q = norm($('#opTitle').value);
  const words = rankWords(OP_WORDS, state.ops.filter(x => x.id !== o.id).map(x => x.title));
  const tList = !q ? words : words.filter(w => norm(w).startsWith(q) && norm(w) !== q);
  $('#opTitleChips').innerHTML = q ? suggHtml(tList, true, 't', 6) : suggHtml(tList, OPD.moreT, 't', 6);
  const have = new Set(opTodos(o.id).map(i => norm(i.title)));
  const mWords = rankWords(OP_TODO_WORDS, state.items.filter(i => i.op).map(i => i.title)).filter(w => !have.has(norm(w)));
  $('#opTodoChips').innerHTML = suggHtml(mWords, OPD.moreM, 'm', 4);
}
let opSaveT = 0;
function addOp() {
  const sh = liveShift(); if (!S || !sh) return;
  const now = Date.now(), n = opsOf(sh.id).reduce((m, o) => Math.max(m, o.n), 0) + 1;
  const o = normOp({ id: uid(), sid: sh.id, n, start: now, end: null, u: now });
  state.ops.push(o); commit();
  if (navigator.vibrate) navigator.vibrate(10);
  openOp(o.id, { fresh: true });
}
function openOp(id, opts = {}) {
  const o = opById(id); if (!o || !S) return;
  OPD.id = id; OPD.imp = false; OPD.mode = null; OPD.moreT = false; OPD.moreM = false;
  $('#opTitle').value = o.title; $('#opPlace').value = o.place; $('#opNote').value = o.note; $('#opOutcome').value = o.outcome;
  $('#opStart').value = hmIn(o.start); $('#opEnd').value = o.end != null ? hmIn(o.end) : '';
  $('#opTodoIn').value = '';
  syncOp();
  openDlg($('#opDlg'));
  if (opts.fresh && !mobileMQ.matches) setTimeout(() => $('#opTitle').focus(), 40);
}
function syncOp() {
  const o = opById(OPD.id); if (!o) return;
  const sh = state.shifts.find(s => s.id === o.sid), st = opState(o);
  $('#opDH').textContent = `Einsatz ${o.n}${o.title ? ' · ' + o.title : ''}`;
  $('#opDMeta').innerHTML = `${sh ? esc(sh.name) + ' · ' : ''}${dateShort(o.start)} · <span class="mono">${hm(o.start)}${o.end != null ? '–' + hm(o.end) : ''}</span> · <span class="op-st-inline" data-st="${st.k}">${esc(st.l)}</span>`;
  const todos = opTodos(o.id).sort((a, b) => (a.done - b.done) || a.createdAt - b.createdAt);
  // Abschluss: „keine Maßnahmen“ oder „Maßnahmen“ (sobald To-dos existieren, steht es fest)
  const mode = o.none ? 'none' : todos.length ? 'mass' : OPD.mode;
  $$('#opMode [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  const noneBtn = $('#opMode [data-mode="none"]');
  noneBtn.disabled = todos.length > 0;
  noneBtn.title = todos.length ? 'Es gibt schon Maßnahmen zu diesem Einsatz' : '';
  $('#opMeasures').hidden = mode !== 'mass';
  $('#opSecLage').classList.toggle('is-done', !!o.title.trim());
  $('#opSecVerlauf').classList.toggle('is-done', o.end != null);
  $('#opSecAbschluss').classList.toggle('is-done', st.k === 'done');
  renderOpSugg();
  $('#opTodos').innerHTML = todos.map(i => `<li class="op-todo${i.done ? ' done' : ''}" data-id="${esc(i.id)}"><button type="button" class="check${i.done ? ' on' : ''}" data-opt="done" aria-label="${i.done ? 'Wieder öffnen' : 'Erledigt'}">${ico('check')}</button><button type="button" class="op-todo-t" data-opt="edit">${esc(i.title)}</button><button type="button" class="op-imp" data-opt="imp" aria-pressed="${i.imp}" aria-label="Wichtig">★</button></li>`).join('');
  $('#opTodoImp').setAttribute('aria-pressed', String(OPD.imp));
  $('#opDocs').hidden = !window.WWriter || o.none;
  const docs = [...new Set(todos.filter(i => i.doc).map(i => i.doc))].map(id => state.docs.find(d => d.id === id)).filter(Boolean);
  $('#opDocList').innerHTML = docs.map(d => `<button type="button" class="op-docrow" data-open-doc="${esc(d.id)}"><span class="op-doc-k">${esc(({ vermisst: 'VM', hgv: 'HG' }[d.type] || d.type.toUpperCase()))}</span><span class="op-docrow-m"><b>${esc(d.title)}</b><small>Öffnen</small></span><span class="pill ${d.status === 'fertig' ? 'pill-lime' : 'pill-quiet'}">${d.status === 'fertig' ? 'fertig' : 'Entwurf'}</span></button>`).join('');
  $('#opDocList').hidden = !docs.length;
  const ended = o.end != null;
  $('#opDone').textContent = ended ? 'Fertig' : 'Einsatz beenden';
  $('#opReopen').hidden = !ended;
}
function opDirty() { const o = opById(OPD.id); if (!o) return; o.u = Date.now(); save(); clearTimeout(opSaveT); opSaveT = setTimeout(() => { renderOpCard(); syncOp(); }, 180); }
/** Uhrzeit aus dem Dialog in einen Zeitpunkt der Schicht übersetzen (Nachtdienste über Mitternacht). */
function opTimeFrom(o, hhmm, after) {
  if (!/^\d{2}:\d{2}/.test(hhmm || '')) return null;
  const sh = state.shifts.find(s => s.id === o.sid), base = sh ? sh.start : o.start;
  let t = atHM(base, hhmm.slice(0, 5));
  if (t < base - 2 * HOUR) t = addDays(t, 1);
  if (after != null && t < after) t = addDays(t, 1);
  return t;
}
$('#opForm').addEventListener('input', e => {
  const o = opById(OPD.id); if (!o) return;
  const id = e.target.id;
  if (id === 'opTitle') { o.title = e.target.value.slice(0, 80); renderOpSugg(); }
  else if (id === 'opPlace') o.place = e.target.value.slice(0, 120);
  else if (id === 'opNote') o.note = e.target.value.slice(0, 4000);
  else if (id === 'opOutcome') o.outcome = e.target.value.slice(0, 4000);
  else return;
  opDirty();
});
$('#opMode').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); const o = opById(OPD.id); if (!b || !o || b.disabled) return;
  const m = b.dataset.mode;
  if (m === 'none') { o.none = !o.none; OPD.mode = o.none ? 'none' : null; }
  else { o.none = false; OPD.mode = OPD.mode === 'mass' && !opTodos(o.id).length ? null : 'mass'; }
  opDirty(); syncOp();
  if (OPD.mode === 'mass' && !mobileMQ.matches) setTimeout(() => $('#opTodoIn').focus(), 40);
});
$('#opStart').addEventListener('change', e => { const o = opById(OPD.id); if (!o) return; const t = opTimeFrom(o, e.target.value); if (t == null) return; o.start = t; if (o.end != null && o.end < t) o.end = t; opDirty(); syncOp(); });
$('#opEnd').addEventListener('change', e => { const o = opById(OPD.id); if (!o) return; const t = e.target.value ? opTimeFrom(o, e.target.value, o.start) : null; o.end = t; opDirty(); syncOp(); });
$('#opTitleChips').addEventListener('click', e => {
  if (e.target.closest('[data-more]')) { OPD.moreT = true; renderOpSugg(); return; }
  const c = e.target.closest('[data-v]'); const o = opById(OPD.id); if (!c || !o) return;
  o.title = c.dataset.v; $('#opTitle').value = o.title; opDirty(); syncOp();
  if (!mobileMQ.matches) $('#opPlace').focus();
});
$('#opTodoChips').addEventListener('click', e => {
  if (e.target.closest('[data-more]')) { OPD.moreM = true; renderOpSugg(); return; }
  const c = e.target.closest('[data-v]'); if (c) addOpTodo(c.dataset.v);
});
$('#opTodoAdd').addEventListener('click', () => { const v = $('#opTodoIn').value; if (!v.trim()) { $('#opTodoIn').focus(); return; } addOpTodo(v); $('#opTodoIn').value = ''; $('#opTodoIn').focus(); });
$('#opTodoIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#opTodoAdd').click(); } });
$('#opTodoImp').addEventListener('click', () => { OPD.imp = !OPD.imp; syncOp(); });
function addOpTodo(title, extra = {}) {
  const o = opById(OPD.id); if (!o || !S || !String(title).trim()) return null;
  const now = Date.now();
  const it = normItem({ id: uid(), title: String(title).trim().slice(0, 300), notes: `Aus Einsatz ${o.n}${o.title ? ' · ' + o.title : ''} (${dateShort(o.start)} ${hm(o.start)})`, kind: 'aufgabe', mode: 'einmalig', imp: OPD.imp, op: o.id, createdAt: now, updatedAt: now, ...extra });
  state.items.push(it);
  if (o.none) o.none = false;
  OPD.mode = 'mass';
  o.u = now; OPD.imp = false;
  commit(); syncOp();
  toast(`To-do im Planner: ${it.title}`);
  return it;
}
$('#opTodos').addEventListener('click', e => {
  const b = e.target.closest('[data-opt]'), li = e.target.closest('[data-id]'); if (!b || !li) return;
  const it = find(li.dataset.id); if (!it) return;
  if (b.dataset.opt === 'done') { completeItem(it.id); syncOp(); }
  else if (b.dataset.opt === 'imp') { it.imp = !it.imp; touch(it); commit(); syncOp(); }
  else openComposer(it);
});
$('#composer').addEventListener('close', () => { if ($('#opDlg').open) syncOp(); });
/** Vorbelegung für einen schriftlichen Vorgang aus Einsatz und Schicht: Zeitpunkt, Rufname, Besatzung. */
function docPreset(o) {
  const sh = state.shifts.find(s => s.id === o.sid);
  return { einsatz: { datum: dayKey(o.start), zeit: hmIn(o.start), ...shiftCrewPreset(sh) } };
}
/** Rufname und Besatzung einer Schicht für schriftliche Vorgänge (eigener Name, wenn vollständig eingetragen). */
function shiftCrewPreset(sh) {
  if (!sh) return {};
  const me = state.settings.name.trim();
  const crew = [...(me.includes(' ') ? [{ name: me }] : []), ...sh.crew.map(c => ({ name: crewName(c) }))];
  return { rufname: sh.unit || '', kraefte: crew };
}
$('#opDocs').addEventListener('click', e => {
  const o = opById(OPD.id); if (!o || !window.WWriter) return;
  const ex = e.target.closest('[data-open-doc]');
  if (ex) { closeDlg($('#opDlg')); setTimeout(() => { setArea('schreiben'); WWriter.open(ex.dataset.openDoc); }, mobileMQ.matches ? 320 : 200); return; }
  const b = e.target.closest('[data-doc]'); if (!b) return;
  const name = b.dataset.name, type = b.dataset.doc, preset = docPreset(o);
  closeDlg($('#opDlg'));
  setTimeout(() => {
    setArea('schreiben');
    const d = WWriter.newDoc(type, preset);
    if (d) { OPD.id = o.id; addOpTodo(`Schriftliche Arbeit fertigstellen: ${name}`, { doc: d.id }); OPD.id = null; }
  }, mobileMQ.matches ? 320 : 200);
});
$('#opReopen').addEventListener('click', () => { const o = opById(OPD.id); if (!o) return; o.end = null; $('#opEnd').value = ''; opDirty(); syncOp(); });
$('#opForm').addEventListener('submit', e => {
  e.preventDefault();
  const o = opById(OPD.id); if (!o) { closeDlg($('#opDlg')); return; }
  const now = Date.now(), wasOpen = o.end == null;
  if (wasOpen) o.end = Math.max(now, o.start);
  o.u = now;
  closeDlg($('#opDlg')); commit();
  if (wasOpen) { const st = opState(o); toast(`Einsatz ${o.n} beendet · ${st.l}`); }
});
$('#opDelete').addEventListener('click', async () => {
  const o = opById(OPD.id); if (!o) return;
  const n = opTodos(o.id).length;
  const r = await ask({ title: `Einsatz ${o.n} löschen?`, text: n ? `Die ${n} verknüpften To-dos bleiben im Planner, verlieren aber die Zuordnung.` : 'Der Einsatz wird aus der Schicht entfernt.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Löschen', value: 'ok', cls: 'btn-ghost btn-danger', submit: true }] });
  if (!r) return;
  const snap = snapshot();
  for (const it of opTodos(o.id)) { it.op = null; touch(it); }
  state.ops = state.ops.filter(x => x.id !== o.id); state.del[o.id] = tombTs(o);
  closeDlg($('#opDlg')); commit(); toast(`Einsatz ${o.n} gelöscht`, { undo: snap });
});
$('#opDlg').addEventListener('close', () => { clearTimeout(opSaveT); if (S && OPD.id) commit(); OPD.id = null; });

/* ---------- Dienst beginnen: Schicht, Besetzung, Einsatzmittel ---------- */
const ST = { tpl: null, crew: [], planned: null, edit: null };
function crewPool() {
  const pool = [], have = new Set(), seenKey = n => norm(n);
  const push = (id, name) => { const k = seenKey(name); if (!name || have.has(k)) return; have.add(k); pool.push({ id: id || null, name }); };
  for (const sh of [...state.shifts].sort((a, b) => b.start - a.start)) for (const c of sh.crew) { const p = (c.id && state.people.find(x => x.id === c.id)) || state.people.find(x => seenKey(x.name) === seenKey(c.name)); push(p ? p.id : c.id, p ? p.name : c.name); }
  for (const p of [...state.people].sort(byName)) push(p.id, p.name);
  for (const c of ST.crew) push(c.id, c.name);
  return pool;
}
const recentUnits = () => { const out = []; for (const sh of [...state.shifts].sort((a, b) => b.start - a.start)) if (sh.unit && !out.some(u => unitKey(u) === unitKey(sh.unit))) out.push(sh.unit); return out.slice(0, 6); };
function openStartSheet(opts = {}) {
  if (!S) return;
  ST.planned = opts.planned || null; ST.edit = opts.edit || null;
  const base = state.shifts.find(s => s.id === (ST.edit || ST.planned)) || null;
  ST.tpl = base ? (base.tpl || (state.tpls.find(t => t.name === base.name) || {}).id || '') : null;
  ST.crew = base ? base.crew.map(c => ({ id: c.id, name: c.name })) : [];
  $('#stUnit').value = base ? base.unit : '';
  $('#stNewName').value = '';
  $('#stNames').innerHTML = state.people.map(p => `<option value="${esc(p.name)}"></option>`).join('');
  renderStartSheet();
  openDlg($('#startDlg'));
}
function renderStartSheet() {
  const now = Date.now(), base = state.shifts.find(s => s.id === (ST.edit || ST.planned)) || null;
  $('#stH').textContent = ST.edit ? 'Besetzung' : 'Dienst beginnen';
  $('#stLead').innerHTML = ST.edit ? `Wer ist in dieser Schicht dabei, mit welchem Einsatzmittel? (${esc(base ? base.name : '')})` : `Beginn ist jetzt (<b class="mono">${hm(now)}</b>). Wähle die Schicht, mit wem du unterwegs bist und – wenn du magst – das Einsatzmittel.`;
  $('#stTplBox').hidden = !!ST.edit;
  $('#startCustom').hidden = $('#startCatalog').hidden = !!ST.edit;
  if (!ST.edit) {
    if (ST.planned && base) $('#startTpls').innerHTML = `<button type="button" class="tpl-btn" data-tpl="__planned" aria-pressed="true" style="--c:${COLORS[base.color]}"><span class="tpl-name">${esc(base.name)} · geplant</span><span class="tpl-time mono">${hm(base.start)}–${hm(base.plannedEnd)}</span><span class="tpl-end">Beginn jetzt · Ende ${hm(base.plannedEnd)}</span></button><button type="button" class="tpl-btn free" data-tpl="__other"><span class="tpl-name">Andere Schicht</span><span class="tpl-end">statt des geplanten Dienstes</span></button>`;
    else $('#startTpls').innerHTML = state.tpls.map(tp => `<button type="button" class="tpl-btn" data-tpl="${esc(tp.id)}" aria-pressed="${ST.tpl === tp.id}" style="--c:${COLORS[tp.color]}"><span class="tpl-name">${esc(tp.name)}</span><span class="tpl-time mono">${tp.start}–${tp.end}</span><span class="tpl-end">bis ${hm(endAfter(now, tp.end, tplLen(tp)))} · ${dur(tplNet(tp) * MIN)} h netto</span></button>`).join('')
      + `<button type="button" class="tpl-btn free" data-tpl="" aria-pressed="${ST.tpl === ''}"><span class="tpl-name">Ohne Vorlage</span><span class="tpl-time mono">${dur(state.settings.targetMin * MIN)} h + 30 Min</span><span class="tpl-end">Ende danach anpassen</span></button>`;
  }
  const sel = new Set(ST.crew.map(c => norm(c.name)));
  const pool = crewPool();
  $('#stCrew').innerHTML = pool.length ? pool.map(c => `<button type="button" class="chip st-crew-chip" data-name="${esc(c.name)}" data-pid="${esc(c.id || '')}" aria-pressed="${sel.has(norm(c.name))}">${crewChip(c)}${esc(c.name)}</button>`).join('') : '<p class="hint st-hint">Noch niemand im Team – unten den Namen eintragen. Neue Personen landen im Team.</p>';
  const last = [...state.shifts].filter(s => s.id !== (ST.edit || '') && (s.crew.length || s.unit)).sort((a, b) => b.start - a.start)[0];
  const lastTxt = last ? [last.crew.map(c => c.name).join(' · '), last.unit].filter(Boolean).join(' · ') : '';
  $('#stLast').hidden = !last || !lastTxt || (ST.crew.length > 0);
  $('#stLast').textContent = last ? `↺ Wie zuletzt: ${lastTxt}` : '';
  const u = $('#stUnit').value.trim();
  $('#stUnitChips').innerHTML = recentUnits().map(x => `<button type="button" class="chip sm" data-unit="${esc(x)}" aria-pressed="${unitKey(x) === unitKey(u)}">${esc(x)}</button>`).join('');
  const tplId = ST.edit || ST.planned ? (base && base.tpl) || ST.tpl : ST.tpl;
  const rts = routinesFor({ tpl: tplId, unit: u });
  const open = state.items.filter(i => !i.done), imp = open.filter(i => i.imp).length;
  $('#stPreview').innerHTML = ST.edit ? (rts.length ? `<span class="f-label">Routinen in dieser Schicht</span><div class="st-rts">${rts.map(r => `<span class="pill" style="--rc:${COLORS[r.color]}"><i class="op-rt-dot"></i>${esc(r.name)}</span>`).join('')}</div>` : '')
    : `<span class="f-label">Das erwartet dich</span><div class="st-rts">${rts.map(r => `<span class="pill" style="--rc:${COLORS[r.color]}"><i class="op-rt-dot"></i>${esc(r.name)}</span>`).join('')}<span class="pill pill-quiet">${open.length} ${open.length === 1 ? 'offenes To-do' : 'offene To-dos'}${imp ? ` · ${imp} wichtig` : ''}</span></div>`;
  const ready = ST.edit || ST.planned || ST.tpl !== null;
  // erledigte Abschnitte markieren (Nummer wird gelb)
  $('#stTplBox').classList.toggle('is-done', !!(ST.planned || ST.tpl !== null));
  $('#stCrew').closest('.sec').classList.toggle('is-done', ST.crew.length > 0);
  $('#stUnit').closest('.sec').classList.toggle('is-done', !!u);
  $('#stGo').disabled = !ready;
  $('#stGo').textContent = ST.edit ? 'Speichern' : 'Dienst beginnen';
}
$('#startTpls').addEventListener('click', e => {
  const b = e.target.closest('[data-tpl]'); if (!b) return;
  if (b.dataset.tpl === '__other') { ST.planned = null; ST.tpl = null; }
  else if (b.dataset.tpl !== '__planned') ST.tpl = b.dataset.tpl;
  renderStartSheet();
});
$('#stCrew').addEventListener('click', e => {
  const b = e.target.closest('[data-name]'); if (!b) return;
  const name = b.dataset.name, i = ST.crew.findIndex(c => norm(c.name) === norm(name));
  if (i >= 0) ST.crew.splice(i, 1); else if (ST.crew.length < 6) ST.crew.push({ id: b.dataset.pid || null, name });
  renderStartSheet();
});
function addCrewName() {
  const inp = $('#stNewName'), name = inp.value.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!name) { inp.focus(); return; }
  const p = state.people.find(x => norm(x.name) === norm(name));
  if (!ST.crew.some(c => norm(c.name) === norm(name)) && ST.crew.length < 6) ST.crew.push({ id: p ? p.id : null, name: p ? p.name : name });
  inp.value = '';
  renderStartSheet();
  if (!mobileMQ.matches) inp.focus();
}
$('#stAddName').addEventListener('click', addCrewName);
$('#stNewName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCrewName(); } });
$('#stLast').addEventListener('click', () => {
  const last = [...state.shifts].filter(s => s.id !== (ST.edit || '') && (s.crew.length || s.unit)).sort((a, b) => b.start - a.start)[0]; if (!last) return;
  ST.crew = last.crew.map(c => ({ id: c.id, name: c.name })); if (last.unit) $('#stUnit').value = last.unit;
  renderStartSheet();
});
$('#stUnit').addEventListener('input', () => renderStartSheet());
$('#stUnitChips').addEventListener('click', e => { const b = e.target.closest('[data-unit]'); if (!b) return; $('#stUnit').value = unitKey($('#stUnit').value) === unitKey(b.dataset.unit) ? '' : b.dataset.unit; renderStartSheet(); });
$('#stForm').addEventListener('submit', e => { e.preventDefault(); confirmStart(); });
/* Besetzung → Team: Bekannte verknüpfen, neue Namen als Person anlegen */
function resolveCrew(list, now = Date.now()) {
  return (list || []).map(c => {
    const p = (c.id && state.people.find(x => x.id === c.id)) || state.people.find(x => norm(x.name) === norm(c.name));
    if (p) return { id: p.id, name: p.name };
    const np = normPerson({ id: uid(), name: c.name, roles: [], parent: null, contact: '', u: now });
    state.people.push(np); return { id: np.id, name: np.name };
  });
}
function confirmStart() {
  if (!S) return;
  const now = Date.now(), unit = $('#stUnit').value.trim().replace(/\s+/g, ' ').slice(0, 40);
  const pending = $('#stNewName').value.trim(); if (pending) addCrewName();
  if (!ST.edit && !ST.planned && ST.tpl === null) return;
  const snap = snapshot();
  const crew = resolveCrew(ST.crew, now);
  if (ST.edit) {
    const sh = state.shifts.find(s => s.id === ST.edit);
    if (sh) { sh.crew = crew; sh.unit = unit; sh.u = now; }
    closeDlg($('#startDlg')); commit(); toast('Besetzung gespeichert', { undo: snap });
    return;
  }
  let sh;
  if (ST.planned) {
    sh = state.shifts.find(s => s.id === ST.planned);
    if (!sh || liveShift()) { closeDlg($('#startDlg')); return; }
    sh.live = true; sh.start = now; sh.date = dayKey(now); sh.end = null; sh.crew = crew; sh.unit = unit; sh.u = now;
    if (!sh.tpl) sh.tpl = (state.tpls.find(t => t.name === sh.name) || {}).id || null;
    if (sh.plannedEnd <= now) sh.plannedEnd = now + state.settings.targetMin * MIN;
    commit();
    toast(`Eingedongelt · ${sh.name} bis ${hm(sh.plannedEnd)}`, { undo: snap });
    if (navigator.vibrate) navigator.vibrate(12);
  } else sh = startShift(ST.tpl ? state.tpls.find(t => t.id === ST.tpl) || null : null, { crew, unit, snap });
  closeDlg($('#startDlg'));
  if (sh) setTimeout(() => shiftBriefing(sh.id), reduceMotion.matches ? 0 : mobileMQ.matches ? 340 : 220);
}

/* ---------- Schichtbriefing: alle offenen To-dos fliegen ein – wichtige oben, dann die ältesten ---------- */
const ageWords = ms => { const d = Math.floor(ms / DAY); if (d >= 2) return `seit ${d} Tagen`; if (d === 1) return 'seit gestern'; const h = Math.floor(ms / HOUR); return h >= 1 ? `seit ${h} Std` : 'neu'; };
function briefRow(it, now) {
  const k = KINDS[it.kind], o = it.op ? opById(it.op) : null;
  const tile = it.from ? `<span class="tile t-${it.kind}" aria-hidden="true">${esc(initials(it.from))}</span>` : `<span class="tile t-${it.kind}" aria-hidden="true">${ico(k.icon)}</span>`;
  const sub = [k.label + (it.from ? ' · ' + esc(it.from) : ''), ageWords(now - it.createdAt), o ? `aus Einsatz E${o.n}` : ''].filter(Boolean).join(' · ');
  return `<li class="br-row${it.imp ? ' imp' : ''}" data-id="${esc(it.id)}">${tile}<span class="br-main"><span class="br-t">${it.imp ? '<span class="imp-star" aria-label="wichtig">★</span>' : ''}${esc(it.title)}</span><span class="br-s">${sub}</span></span>${urgencyPill(it, now)}</li>`;
}
function shiftBriefing(sid) {
  const sh = state.shifts.find(s => s.id === sid); if (!sh || !S) return;
  const now = Date.now();
  const open = state.items.filter(i => !i.done);
  const byAge = (a, b) => a.createdAt - b.createdAt || cmp(a.id, b.id);
  const imp = open.filter(i => i.imp).sort(byAge), rest = open.filter(i => !i.imp).sort(byAge);
  const MAX = 9, restShown = rest.slice(0, Math.max(3, MAX - imp.length));
  const rts = routinesFor(sh);
  const apts = state.appts.filter(a => a.allDay ? (a.start < addDays(fromKey(dayKey(sh.start)), 1) && apptEnd(a) > fromKey(dayKey(sh.start))) : (a.start < sh.plannedEnd && apptEnd(a) > sh.start)).sort((a, b) => (b.allDay - a.allDay) || a.start - b.start);
  const loose = state.ops.filter(o => o.sid !== sid && o.end != null && now - o.start < 30 * DAY && opState(o).k === 'missing').sort((a, b) => a.start - b.start);
  $('#brKick').textContent = `Schicht beginnt · ${hm(sh.start)}`;
  $('#brH').textContent = sh.name;
  $('#brMeta').innerHTML = [sh.crew.length ? crewLine(sh.crew) : '', sh.unit ? `<span class="pill pill-outline mono">${esc(sh.unit)}</span>` : '', `<span class="mono dim">bis ${hm(sh.plannedEnd)}</span>`].filter(Boolean).join('');
  const sec = (t, rows) => rows.length ? `<span class="br-sec">${t}</span><ul class="br-list">${rows.map(i => briefRow(i, now)).join('')}</ul>` : '';
  $('#brBody').innerHTML = (open.length ? sec(`Wichtig · ${imp.length}`, imp) + sec(imp.length ? `Offen, älteste zuerst · ${rest.length}` : `Offene To-dos, älteste zuerst · ${rest.length}`, restShown) + (rest.length > restShown.length ? `<p class="br-more">und ${rest.length - restShown.length} weitere im Planner</p>` : '') : '<div class="br-empty"><b>Keine offenen To-dos.</b><span>Freie Fahrt in die Schicht.</span></div>')
    + (apts.length ? `<span class="br-sec">Termine in dieser Schicht · ${apts.length}</span><ul class="br-list">${apts.slice(0, 5).map(a => `<li class="br-row br-ap" data-appt="${esc(a.id)}"><span class="op-n mono">${a.allDay ? 'Tag' : hm(a.start)}</span><span class="br-main"><span class="br-t">${esc(a.title)}</span><span class="br-s">${a.allDay ? 'ganztägig' : `${hm(a.start)}–${hm(apptEnd(a))}`}${a.location ? ' · ' + esc(a.location) : ''}</span></span></li>`).join('')}</ul>` : '')
    + (loose.length ? `<span class="br-sec">Einsätze ohne Abschluss · ${loose.length}</span><ul class="br-list">${loose.slice(0, 5).map(o => `<li class="br-row br-op" data-op="${esc(o.id)}"><span class="op-n mono">E${o.n}</span><span class="br-main"><span class="br-t">${esc(o.title || 'Einsatz ohne Stichwort')}</span><span class="br-s">${esc(dateShort(o.start))} · ${hm(o.start)}${o.place ? ' · ' + esc(o.place) : ''}</span></span><span class="pill pill-quiet">Abschluss fehlt</span></li>`).join('')}</ul>` : '')
    + (rts.length ? `<span class="br-sec">Routinen in dieser Schicht</span><div class="st-rts br-rts">${rts.map(r => `<span class="pill" style="--rc:${COLORS[r.color]}"><i class="op-rt-dot"></i>${esc(r.name)}</span>`).join('')}</div>` : '');
  const d = $('#briefDlg');
  openDlg(d);
  const rows = $$('.br-sec, .br-row, .br-more, .br-empty, .br-rts', d);
  const red = reduceMotion.matches;
  rows.forEach((el, i) => el.animate(red ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(22px) scale(.97)' }, { opacity: 1, transform: 'none' }],
    { duration: red ? 180 : 460, delay: red ? 0 : 140 + i * 55, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' }));
  setTimeout(() => $('#brGo').focus(), 60);
}
$('#briefDlg').addEventListener('close', () => {
  if (!S) return;
  setArea('heute', { keepScroll: true });
  if (mobileMQ.matches) setTab('aufgaben');
  const card = $('#opCard');
  if (card && !card.hidden) card.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  if (reduceMotion.matches) return;
  $$('#list .item').slice(0, 12).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 80 + i * 35, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' }));
});
$('#brBody').addEventListener('click', e => {
  const o = e.target.closest('[data-op]');
  if (o) { closeDlg($('#briefDlg')); setTimeout(() => openOp(o.dataset.op), 260); return; }
  const ap = e.target.closest('[data-appt]');
  if (ap) { const x = state.appts.find(a => a.id === ap.dataset.appt); closeDlg($('#briefDlg')); if (x) setTimeout(() => openApptDialog(x), 260); return; }
  const r = e.target.closest('[data-id]'); if (!r) return; const it = find(r.dataset.id); closeDlg($('#briefDlg')); if (it) setTimeout(() => openComposer(it), 260);
});

/* ======================= WaffG-Prüfstand ======================= */
/* Wortlaute: amtliche Fassung von gesetze-im-internet.de (Archiv QuantLaw, Stand 07.11.2026), WaffG zuletzt geändert durch Art. 12 Abs. 20 G v. 22.10.2026 (BGBl. I Nr. 318). Amtliche Werke, § 5 UrhG. */
const WF_LAW = {"waffe":{"ref":"§ 1 Abs. 2 WaffG","t":"Waffen sind 1. Schusswaffen oder ihnen gleichgestellte Gegenstände und 2. tragbare Gegenstände, a) die ihrem Wesen nach dazu bestimmt sind, die Angriffs- oder Abwehrfähigkeit von Menschen zu beseitigen oder herabzusetzen, insbesondere Hieb- und Stoßwaffen; b) die, ohne dazu bestimmt zu sein, insbesondere wegen ihrer Beschaffenheit, Handhabung oder Wirkungsweise geeignet sind, die Angriffs- oder Abwehrfähigkeit von Menschen zu beseitigen oder herabzusetzen, und die in diesem Gesetz genannt sind."},"umgang":{"ref":"§ 1 Abs. 3 WaffG","t":"Umgang mit einer Waffe oder Munition hat, wer diese erwirbt, besitzt, überlässt, führt, verbringt, mitnimmt, damit schießt, herstellt, bearbeitet, instand setzt oder damit Handel treibt. Umgang mit einer Schusswaffe hat auch, wer diese unbrauchbar macht."},"alter":{"ref":"§ 2 Abs. 1 WaffG","t":"Der Umgang mit Waffen oder Munition ist nur Personen gestattet, die das 18. Lebensjahr vollendet haben."},"jugendReiz":{"ref":"§ 3 Abs. 2 WaffG","t":"Jugendliche dürfen abweichend von § 2 Abs. 1 Umgang mit geprüften Reizstoffsprühgeräten haben."},"erwerb":{"ref":"Anlage 1 Abschnitt 2 Nr. 1 WaffG","t":"erwirbt eine Waffe oder Munition, wer die tatsächliche Gewalt darüber erlangt"},"besitz":{"ref":"Anlage 1 Abschnitt 2 Nr. 2 WaffG","t":"besitzt eine Waffe oder Munition, wer die tatsächliche Gewalt darüber ausübt"},"ueberlassen":{"ref":"Anlage 1 Abschnitt 2 Nr. 3 WaffG","t":"überlässt eine Waffe oder Munition, wer die tatsächliche Gewalt darüber einem anderen einräumt"},"fuehren":{"ref":"Anlage 1 Abschnitt 2 Nr. 4 WaffG","t":"führt eine Waffe, wer die tatsächliche Gewalt darüber außerhalb der eigenen Wohnung, Geschäftsräume, des eigenen befriedeten Besitztums oder einer Schießstätte ausübt"},"verbringen":{"ref":"Anlage 1 Abschnitt 2 Nr. 5 WaffG","t":"verbringt eine Waffe oder Munition, wer diese Waffe oder Munition über die Grenze zum dortigen Verbleib oder mit dem Ziel des Besitzwechsels in den, durch den oder aus dem Geltungsbereich des Gesetzes zu einer anderen Person oder zu sich selbst transportieren lässt oder selbst transportiert"},"mitnehmen":{"ref":"Anlage 1 Abschnitt 2 Nr. 6 WaffG","t":"nimmt eine Waffe oder Munition mit, wer diese Waffe oder Munition vorübergehend auf einer Reise ohne Aufgabe des Besitzes zur Verwendung über die Grenze in den, durch den oder aus dem Geltungsbereich des Gesetzes bringt"},"schiessen":{"ref":"Anlage 1 Abschnitt 2 Nr. 7 WaffG","t":"schießt, wer mit einer Schusswaffe Geschosse durch einen Lauf verschießt, Kartuschenmunition abschießt, mit Patronen- oder Kartuschenmunition Reiz- oder andere Wirkstoffe verschießt oder pyrotechnische Munition verschießt"},"herstellen":{"ref":"Anlage 1 Abschnitt 2 Nr. 8.1 WaffG","t":"werden Waffen oder Munition hergestellt, wenn aus Rohteilen oder Materialien ein Endprodukt oder wesentliche Teile eines Endproduktes erzeugt werden oder bei einer Waffe das führende wesentliche Teil durch ein Teil, das noch nicht in einer Waffe verbaut war, ersetzt wird; eine Schusswaffe ist hergestellt, wenn sie weißfertig im Sinne von § 2 Absatz 5 des Beschussgesetzes ist oder der Austausch des führenden wesentlichen Teils abgeschlossen ist; als Herstellen von Munition gilt auch das Wiederladen von Hülsen"},"bearbeiten":{"ref":"Anlage 1 Abschnitt 2 Nr. 8.2 WaffG","t":"wird eine Schusswaffe bearbeitet, wenn 8.2.1 sie verkürzt, in der Schussfolge verändert oder so geändert wird, dass andere Munition oder Geschosse anderer Kaliber aus ihr verschossen werden können (Umbau), 8.2.2 wesentliche Teile, zu deren Einpassung eine Nacharbeit erforderlich ist, ausgetauscht werden, sofern nicht Nummer 8.1 zutrifft, 8.2.3 Arbeiten an der Schusswaffe durchgeführt werden, die eine Beschusspflicht gemäß § 3 Absatz 2 des Beschussgesetzes auslösen, wenn nicht die Nummern 8.1, 8.2.1 oder 8.2.2 zutreffen (Instandsetzung); eine Schusswaffe wird nicht bearbeitet, wenn lediglich geringfügige Änderungen, insbesondere am Schaft oder an der Zieleinrichtung, vorgenommen werden"},"handel":{"ref":"Anlage 1 Abschnitt 2 Nr. 9 WaffG","t":"treibt Waffenhandel, wer gewerbsmäßig oder selbstständig im Rahmen einer wirtschaftlichen Unternehmung Schusswaffen oder Munition ankauft, feilhält, Bestellungen entgegennimmt oder aufsucht, anderen überlässt oder den Erwerb, den Vertrieb oder das Überlassen vermittelt"},"kinderJug":{"ref":"Anlage 1 Abschnitt 2 Nr. 10, 11 WaffG","t":"sind Kinder Personen, die noch nicht 14 Jahre alt sind, 11. sind Jugendliche Personen, die mindestens 14, aber noch nicht 18 Jahre alt sind"},"schussbereit":{"ref":"Anlage 1 Abschnitt 2 Nr. 12 WaffG","t":"ist eine Waffe schussbereit, wenn sie geladen ist, das heißt, dass Munition oder Geschosse in der Trommel, im in die Waffe eingefügten Magazin oder im Patronen- oder Geschosslager sind, auch wenn sie nicht gespannt ist"},"zugriffsbereit":{"ref":"Anlage 1 Abschnitt 2 Nr. 13 WaffG","t":"ist eine Schusswaffe zugriffsbereit, wenn sie unmittelbar in Anschlag gebracht werden kann; sie ist nicht zugriffsbereit, wenn sie in einem verschlossenen Behältnis mitgeführt wird, ein Messer ist nicht zugriffsbereit, wenn es nur mit mehr als drei Handgriffen erreicht werden kann"},"schusswaffe":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.1 WaffG","t":"Schusswaffen sind Gegenstände, die zum Angriff oder zur Verteidigung, zur Signalgebung, zur Jagd, zur Distanzinjektion, zur Markierung, zum Sport oder zum Spiel bestimmt sind und bei denen Geschosse durch einen Lauf getrieben werden."},"armbrustDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.2.3 WaffG","t":"bei denen bestimmungsgemäß feste Körper gezielt verschossen werden, deren Antriebsenergie durch Muskelkraft oder eine andere Energiequelle eingebracht und durch eine Sperrvorrichtung gespeichert oder gehalten werden kann (zum Beispiel Armbrüste, Pfeilabschussgeräte)"},"teile":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.3 WaffG","t":"Wesentliche Teile von Schusswaffen und Schalldämpfer stehen, soweit in diesem Gesetz nichts anderes bestimmt ist, den Schusswaffen gleich, für die sie bestimmt sind."},"dekoDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.4 WaffG","t":"Schusswaffen sind unbrauchbar gemacht, wenn die zuständige Behörde eines Mitgliedstaates der Europäischen Union für diese Schusswaffen eine Bescheinigung nach Artikel 3 Absatz 4 der Durchführungsverordnung (EU) 2015/2403 der Kommission vom 15. Dezember 2015 zur Festlegung gemeinsamer Leitlinien über Deaktivierungsstandards und -techniken, die gewährleisten, dass Feuerwaffen bei der Deaktivierung endgültig unbrauchbar gemacht werden (ABl. L 333 vom 19.12.2015, S. 62), die zuletzt durch die Durchführungsverordnung (EU) 2018/337 (ABl. L 65 vom 8.3.2018, S. 1) geändert worden ist, ausgestellt hat und die zuständige Behörde die Schusswaffen gemäß Artikel 5 der Durchführungsverordnung (EU) 2015/2403 gekennzeichnet hat."},"salutDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.5.1 WaffG","t":"veränderte Langwaffen, die unter anderem für Theateraufführungen, Foto-, Film- oder Fernsehaufnahmen bestimmt sind, wenn sie die nachstehenden Anforderungen erfüllen"},"anschein":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 1.6 WaffG","t":"Anscheinswaffen sind 1.6.1 Schusswaffen, die ihrer äußeren Form nach im Gesamterscheinungsbild den Anschein von Feuerwaffen (Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.1) hervorrufen und bei denen zum Antrieb der Geschosse keine heißen Gase verwendet werden, 1.6.2 Nachbildungen von Schusswaffen mit dem Aussehen von Schusswaffen nach Nummer 1.6.1 oder 1.6.3 unbrauchbar gemachte Schusswaffen mit dem Aussehen von Schusswaffen nach Nummer 1.6.1. Ausgenommen sind solche Gegenstände, die erkennbar nach ihrem Gesamterscheinungsbild zum Spiel oder für Brauchtumsveranstaltungen bestimmt sind oder die Teil einer kulturhistorisch bedeutsamen Sammlung im Sinne des § 17 sind oder werden sollen oder Schusswaffen, für die gemäß § 10 Abs. 4 eine Erlaubnis zum Führen erforderlich ist. Erkennbar nach ihrem Gesamterscheinungsbild zum Spiel bestimmt sind insbesondere Gegenstände, deren Größe die einer entsprechenden Feuerwaffe um 50 Prozent über- oder unterschreiten, neonfarbene Materialien enthalten oder keine Kennzeichnungen von Feuerwaffen aufweisen."},"feuerwaffe":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.1 WaffG","t":"Feuerwaffen; dies sind Schusswaffen nach Nummer 1.1, bei denen ein Geschoss mittels heißer Gase durch einen oder aus einem Lauf getrieben wird."},"automatik":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.2 WaffG","t":"Automatische Schusswaffen; dies sind Schusswaffen, die nach Abgabe eines Schusses selbsttätig erneut schussbereit werden und bei denen aus demselben Lauf durch einmalige Betätigung des Abzuges oder einer anderen Schussauslösevorrichtung mehrere Schüsse abgegeben werden können (Vollautomaten) oder durch einmalige Betätigung des Abzuges oder einer anderen Schussauslösevorrichtung jeweils nur ein Schuss abgegeben werden kann (Halbautomaten). Als automatische Schusswaffen gelten auch Schusswaffen, die mit allgemein gebräuchlichen Werkzeugen in automatische Schusswaffen geändert werden können. Als Vollautomaten gelten auch in Halbautomaten geänderte Vollautomaten, die mit den in Satz 2 genannten Hilfsmitteln wieder in Vollautomaten zurückgeändert werden können. Double-Action-Revolver sind keine halbautomatischen Schusswaffen."},"langkurz":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.5 WaffG","t":"Langwaffen; dies sind Schusswaffen, deren Lauf und Verschluss in geschlossener Stellung insgesamt länger als 30 cm sind und deren kürzeste bestimmungsgemäß verwendbare Gesamtlänge 60 cm überschreitet; Kurzwaffen sind alle anderen Schusswaffen."},"srsDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.6 bis 2.8 WaffG","t":"Schreckschusswaffen; dies sind Schusswaffen mit einem Kartuschenlager, die zum Abschießen von Kartuschenmunition bestimmt sind. 2.7 Reizstoffwaffen; dies sind Schusswaffen mit einem Patronen- oder Kartuschenlager, die zum Verschießen von Reiz- oder anderen Wirkstoffen bestimmt sind. 2.8 Signalwaffen; dies sind Schusswaffen mit einem Patronen- oder Kartuschenlager oder tragbare Gegenstände nach Nummer 1.2.1, die zum Verschießen pyrotechnischer Munition bestimmt sind."},"druckDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.9 WaffG","t":"Druckluft- und Federdruckwaffen und Waffen, bei denen zum Antrieb der Geschosse kalte Treibgase verwendet werden; Federdruckwaffen sind Schusswaffen, bei denen entweder Federkraft direkt ein Geschoss antreibt (auch als Federkraftwaffen bezeichnet) oder ein federbelasteter Kolben in einem Zylinder bewegt wird und ein vom Kolben erzeugtes Luftpolster das Geschoss antreibt. Druckluftwaffen sind Schusswaffen, bei denen Luft in einen Druckbehälter vorkomprimiert und gespeichert sowie über ein Ventilsystem zum Geschossantrieb freigegeben wird."},"nachbildung":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 6 WaffG","t":"Nachbildungen von Schusswaffen sind Gegenstände, — die nicht als Schusswaffen hergestellt wurden, — die die äußere Form einer Schusswaffe haben, — aus denen nicht geschossen werden kann und — die nicht mit allgemein gebräuchlichen Werkzeugen so umgebaut oder verändert werden können, dass aus ihnen Munition, Ladungen oder Geschosse verschossen werden können."},"hieb":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.1 WaffG","t":"Hieb- und Stoßwaffen (Gegenstände, die ihrem Wesen nach dazu bestimmt sind, unter unmittelbarer Ausnutzung der Muskelkraft durch Hieb, Stoß, Stich, Schlag oder Wurf Verletzungen beizubringen)"},"eigDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.2.1 WaffG","t":"die unter Ausnutzung einer anderen als mechanischen Energie Verletzungen beibringen (z. B. Elektroimpulsgeräte)"},"reizDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.2.2 WaffG","t":"aus denen Reizstoffe versprüht oder ausgestoßen werden, die eine Reichweite bis zu 2 m haben (Reizstoffsprühgeräte)"},"schleuderDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.3 WaffG","t":"Schleudern, die zur Erreichung einer höchstmöglichen Bewegungsenergie eine Armstütze oder eine vergleichbare Vorrichtung besitzen oder für eine solche Vorrichtung eingerichtet sind (Präzisionsschleudern), sowie Armstützen und vergleichbare Vorrichtungen für die vorbezeichneten Gegenstände."},"springDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 2.1.1 WaffG","t":"deren Klingen auf Knopf- oder Hebeldruck hervorschnellen und hierdurch oder beim Loslassen der Sperrvorrichtung festgestellt werden können (Springmesser)"},"fallDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 2.1.2 WaffG","t":"deren Klingen beim Lösen einer Sperrvorrichtung durch ihre Schwerkraft oder durch eine Schleuderbewegung aus dem Griff hervorschnellen und selbsttätig oder beim Loslassen der Sperrvorrichtung festgestellt werden (Fallmesser)"},"faustDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 2.1.3 WaffG","t":"mit einem quer zur feststehenden oder feststellbaren Klinge verlaufenden Griff, die bestimmungsgemäß in der geschlossenen Faust geführt oder eingesetzt werden (Faustmesser)"},"butterflyDef":{"ref":"Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 2.1.4 WaffG","t":"Faltmesser mit zweigeteilten, schwenkbaren Griffen (Butterflymesser)"},"v1211":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.2.1.1 und 1.2.1.2 WaffG","t":"Vollautomaten im Sinne der Anlage 1 Abschnitt 1 Unterabschnitt 1 Nr. 2.2 sind oder 1.2.1.2 Vorderschaftrepetierflinten, bei denen anstelle des Hinterschaftes ein Kurzwaffengriff vorhanden ist oder die Waffengesamtlänge in der kürzest möglichen Verwendungsform weniger als 95 cm oder die Lauflänge weniger als 45 cm beträgt, sind"},"v122":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.2.2 WaffG","t":"ihrer Form nach geeignet sind, einen anderen Gegenstand vorzutäuschen oder die mit Gegenständen des täglichen Gebrauchs verkleidet sind (z. B. Koppelschlosspistolen, Schießkugelschreiber, Stockgewehre, Taschenlampenpistolen)"},"v131":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.1 WaffG","t":"Hieb- oder Stoßwaffen, die ihrer Form nach geeignet sind, einen anderen Gegenstand vorzutäuschen, oder die mit Gegenständen des täglichen Gebrauchs verkleidet sind"},"v132":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.2 WaffG","t":"Stahlruten, Totschläger oder Schlagringe"},"v133":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.3 WaffG","t":"sternförmige Scheiben, die nach ihrer Beschaffenheit und Handhabung zum Wurf auf ein Ziel bestimmt und geeignet sind, die Gesundheit zu beschädigen (Wurfsterne)"},"v134":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.4 WaffG","t":"Gegenstände, bei denen leicht entflammbare Stoffe so verteilt und entzündet werden, dass schlagartig ein Brand entstehen kann; oder in denen unter Verwendung explosionsgefährlicher oder explosionsfähiger Stoffe eine Explosion ausgelöst werden kann"},"v135":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.5 WaffG","t":"Gegenstände mit Reiz- oder anderen Wirkstoffen, es sei denn, dass die Stoffe als gesundheitlich unbedenklich amtlich zugelassen sind und die Gegenstände - in der Reichweite und Sprühdauer begrenzt sind und - zum Nachweis der gesundheitlichen Unbedenklichkeit, der Reichweiten- und der Sprühdauerbegrenzung ein amtliches Prüfzeichen tragen"},"v136":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.6 WaffG","t":"Gegenstände, die unter Ausnutzung einer anderen als mechanischen Energie Verletzungen beibringen (z. B. Elektroimpulsgeräte), sofern sie nicht als gesundheitlich unbedenklich amtlich zugelassen sind und ein amtliches Prüfzeichen tragen zum Nachweis der gesundheitlichen Unbedenklichkeit; sowie Distanz-Elektroimpulsgeräte, die mit dem Abschuss- oder Auslösegerät durch einen leitungsfähigen Flüssigkeitsstrahl einen Elektroimpuls übertragen oder durch Leitung verbundene Elektroden zur Übertragung eines Elektroimpulses am Körper aufbringen"},"v137":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.7 WaffG","t":"Präzisionsschleudern nach Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.3 sowie Armstützen und vergleichbare Vorrichtungen für die vorbezeichneten Gegenstände"},"v138":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.3.8 WaffG","t":"Gegenstände, die nach ihrer Beschaffenheit und Handhabung dazu bestimmt sind, durch Drosseln die Gesundheit zu schädigen (z. B. Nun-Chakus)"},"v141":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.4.1 WaffG","t":"Spring- und Fallmesser nach Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 2.1.1 und 2.1.2. Hiervon ausgenommen sind Springmesser, wenn die Klinge seitlich aus dem Griff herausspringt und der aus dem Griff herausragende Teil der Klinge - höchstens 8,5 cm lang ist und - nicht zweiseitig geschliffen ist, soweit ein berechtigtes Interesse besteht, das eine einhändige Nutzung erforderlich macht, oder der Umgang im Zusammenhang mit der Berufsausübung erfolgt"},"v144":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.4.4 WaffG","t":"Gegenstände, die unter Ausnutzung einer anderen als mechanischen Energie Tieren Verletzungen beibringen (z. B. Elektroimpulsgeräte), sofern sie nicht als gesundheitlich unbedenklich amtlich zugelassen sind und ein amtliches Prüfzeichen tragen zum Nachweis der gesundheitlichen Unbedenklichkeit oder bestimmungsgemäß in der Tierhaltung Verwendung finden"},"v15":{"ref":"Anlage 2 Abschnitt 1 Nr. 1.5.4 WaffG","t":"Munition und Geschosse nach Anlage 1 Abschnitt 3 Nummer 1.5 sowie Munition mit Geschossen, die einen Hartkern (mindestens 400 HB 25 – Brinellhärte – bzw. 421 HV – Vickershärte –) enthalten, sowie entsprechende Geschosse, ausgenommen pyrotechnische Munition, die bestimmungsgemäß zur Signalgebung bei der Gefahrenabwehr dient"},"erlPflicht":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 1 WaffG","t":"Der Umgang, ausgenommen das Überlassen, mit Waffen im Sinne des § 1 Absatz 2 Nummer 1 (Anlage 1 Abschnitt 1 Unterabschnitt 1 Nummer 1 bis 4.3) und der dafür bestimmten Munition bedarf der Erlaubnis, soweit solche Waffen oder Munition nicht nach Unterabschnitt 2 für die dort bezeichneten Arten des Umgangs von der Erlaubnispflicht freigestellt sind."},"frei11":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.1 WaffG","t":"Druckluft-, Federdruckwaffen und Waffen, bei denen zum Antrieb der Geschosse kalte Treibgase Verwendung finden, wenn den Geschossen eine Bewegungsenergie von nicht mehr als 7,5 Joule erteilt wird, und die das Kennzeichen nach Anlage 1 Abbildung 1 zur Ersten Verordnung zum Waffengesetz vom 24. Mai 1976 (BGBl. I S. 1285) in der zum Zeitpunkt des Inkrafttretens dieses Gesetzes geltenden Fassung oder ein durch Rechtsverordnung nach § 25 Nummer 1 bestimmtes Zeichen tragen, sofern a) diese nicht nach ihrer Beschaffenheit in Bezug auf Geschosse mit einer Länge von mehr als 30 mm mehrschüssig sind und b) die Bestätigung zum Aufbringen des Kennzeichens nach § 11 Absatz 6 Satz 4 der Beschussverordnung oder das Aufbringen des Kennzeichens nach § 11 Absatz 6 Satz 5 der Beschussverordnung nicht vor dem 24. Juli 2025 erfolgt ist"},"frei13":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.3 WaffG","t":"Schreckschuss-, Reizstoff- und Signalwaffen, a) die der zugelassenen Bauart nach § 8 des Beschussgesetzes entsprechen und das Zulassungszeichen nach Anlage 1 Abbildung 2 zur Ersten Verordnung zum Waffengesetz vom 24. Mai 1976 (BGBl. I S. 1285) in der zum Zeitpunkt des Inkrafttretens dieses Gesetzes geltenden Fassung oder ein durch Rechtsverordnung nach § 25 Nummer 1 bestimmtes Zeichen tragen oder b) die den Rechtsvorschriften eines anderen Mitgliedstaates entsprechen, die dieser der Europäischen Kommission nach Artikel 4 Absatz 2 der Durchführungsrichtlinie (EU) 2019/69 der Kommission vom 16. Januar 2019 zur Festlegung technischer Spezifikationen für Schreckschuss- und Signalwaffen gemäß der Richtlinie 91/477/EWG des Rates über die Kontrolle des Erwerbs und des Besitzes von Waffen als Maßnahme zur Umsetzung dieser Durchführungsrichtlinie mitgeteilt hat"},"freiAntik":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.5 bis 1.7 WaffG","t":"einläufige Einzelladerwaffen mit Zündhütchenzündung (Perkussionswaffen), deren Modell vor dem 1. Januar 1871 entwickelt worden ist; 1.6 Schusswaffen mit Lunten- oder Funkenzündung, deren Modell vor dem 1. Januar 1871 entwickelt worden ist; 1.7 Schusswaffen mit Zündnadelzündung, deren Modell vor dem 1. Januar 1871 entwickelt worden ist"},"freiFuehren":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 3 WaffG","t":"Erlaubnisfreies Führen 3.1 Schusswaffen mit Lunten- oder Funkenzündung, deren Modell vor dem 1. Januar 1871 entwickelt worden ist; 3.2 Armbrüste; 3.3 unbrauchbar gemachte Schusswaffen."},"kwsDef":{"ref":"Anlage 2 Abschnitt 2 Unterabschnitt 3 Nr. 2 WaffG","t":"Führen ohne Sachkunde-, Bedürfnis- und Haftpflichtversicherungsnachweis (§ 4 Abs. 1 Nr. 3 bis 5) - Kleiner Waffenschein 2.1 Schreckschuss-, Reizstoff- und Signalwaffen nach Unterabschnitt 2 Nr. 1.3."},"spiel":{"ref":"Anlage 2 Abschnitt 3 Unterabschnitt 2 WaffG","t":"Vom Gesetz mit Ausnahme des § 42a ausgenommene Waffen 1. Schusswaffen (Anlage 1 Abschnitt 1 Unterabschnitt 1 Nummer 1.1, ausgenommen Blasrohre), a) die zum Spiel bestimmt sind, wenn aus ihnen nur Geschosse verschossen werden können, denen eine Bewegungsenergie von nicht mehr als 0,5 Joule (J) erteilt wird, es sei denn, sie können mit allgemein gebräuchlichen Werkzeugen so geändert werden, dass die Bewegungsenergie der Geschosse über 0,5 Joule (J) steigt"},"wbk":{"ref":"§ 10 Abs. 1 Satz 1 WaffG","t":"Die Erlaubnis zum Erwerb und Besitz von Waffen wird durch eine Waffenbesitzkarte oder durch Eintragung in eine bereits vorhandene Waffenbesitzkarte erteilt."},"munErl":{"ref":"§ 10 Abs. 3 Satz 1 und 2 WaffG","t":"Die Erlaubnis zum Erwerb und Besitz von Munition wird durch Eintragung in eine Waffenbesitzkarte für die darin eingetragenen Schusswaffen erteilt. In den übrigen Fällen wird die Erlaubnis durch einen Munitionserwerbsschein für eine bestimmte Munitionsart erteilt"},"waffenschein":{"ref":"§ 10 Abs. 4 Satz 1 und 4 WaffG","t":"Die Erlaubnis zum Führen einer Waffe wird durch einen Waffenschein erteilt. Eine Erlaubnis nach Satz 1 zum Führen von Schusswaffen wird für bestimmte Schusswaffen auf höchstens drei Jahre erteilt; die Geltungsdauer kann zweimal um höchstens je drei Jahre verlängert werden, sie ist kürzer zu bemessen, wenn nur ein vorübergehendes Bedürfnis nachgewiesen wird. Der Geltungsbereich des Waffenscheins ist auf bestimmte Anlässe oder Gebiete zu beschränken, wenn ein darüber hinausgehendes Bedürfnis nicht nachgewiesen wird. Die Voraussetzungen für die Erteilung einer Erlaubnis zum Führen von Schreckschuss-, Reizstoff- und Signalwaffen sind in der Anlage 2 Abschnitt 2 Unterabschnitt 3 Nr. 2 und 2.1 genannt (Kleiner Waffenschein)."},"ausn12":{"ref":"§ 12 Abs. 1 WaffG","t":"Einer Erlaubnis zum Erwerb und Besitz einer Waffe bedarf nicht, wer diese 1. als Inhaber einer Waffenbesitzkarte von einem Berechtigten a) lediglich vorübergehend, höchstens aber für einen Monat für einen von seinem Bedürfnis umfassten Zweck oder im Zusammenhang damit, oder b) vorübergehend zum Zweck der sicheren Verwahrung oder der Beförderung erwirbt; 2. vorübergehend von einem Berechtigten zur gewerbsmäßigen Beförderung, zur gewerbsmäßigen Lagerung oder zur gewerbsmäßigen Ausführung von Verschönerungen oder ähnlicher Arbeiten an der Waffe erwirbt; 3. von einem oder für einen Berechtigten erwirbt, wenn und solange er a) auf Grund eines Arbeits- oder Ausbildungsverhältnisses, b) als Beauftragter oder Mitglied einer jagdlichen oder schießsportlichen Vereinigung, einer anderen sportlichen Vereinigung zur Abgabe von Startschüssen oder einer zur Brauchtumspflege Waffen tragenden Vereinigung, c) als Beauftragter einer in § 55 Abs. 1 Satz 1 bezeichneten Stelle, d) als Charterer von seegehenden Schiffen zur Abgabe von Seenotsignalen den Besitz über die Waffe nur nach den Weisungen des Berechtigten ausüben darf; 4. von einem anderen, a) dem er die Waffe vorübergehend überlassen hat, ohne dass es hierfür der Eintragung in die Erlaubnisurkunde bedurfte, oder b) nach dem Abhandenkommen wieder erwirbt; 5. auf einer Schießstätte (§ 27) lediglich vorübergehend zum Schießen auf dieser Schießstätte erwirbt; 6. auf einer Reise in den oder durch den Geltungsbereich des Gesetzes nach § 32 berechtigt mitnimmt."},"fremd":{"ref":"§ 12 Abs. 3 Nr. 1 WaffG","t":"diese mit Zustimmung eines anderen in dessen Wohnung, Geschäftsräumen oder befriedetem Besitztum oder dessen Schießstätte zu einem von seinem Bedürfnis umfassten Zweck oder im Zusammenhang damit führt"},"transport":{"ref":"§ 12 Abs. 3 Nr. 2 WaffG","t":"diese nicht schussbereit und nicht zugriffsbereit von einem Ort zu einem anderen Ort befördert, sofern der Transport der Waffe zu einem von seinem Bedürfnis umfassten Zweck oder im Zusammenhang damit erfolgt"},"schiessFrei":{"ref":"§ 12 Abs. 4 WaffG","t":"Einer Erlaubnis zum Schießen mit einer Schusswaffe bedarf nicht, wer auf einer Schießstätte (§ 27) schießt. Das Schießen außerhalb von Schießstätten ist darüber hinaus ohne Schießerlaubnis nur zulässig 1. durch den Inhaber des Hausrechts oder mit dessen Zustimmung im befriedeten Besitztum a) mit Schusswaffen, deren Geschossen eine Bewegungsenergie von nicht mehr als 7,5 Joule (J) erteilt wird oder deren Bauart nach § 7 des Beschussgesetzes zugelassen ist, sofern die Geschosse das Besitztum nicht verlassen können, b) mit Schusswaffen, aus denen nur Kartuschenmunition verschossen werden kann, 2. durch Personen, die den Regeln entsprechend als Teilnehmer an genehmigten Sportwettkämpfen nach Absatz 3 Nr. 3 mit einer Langwaffe an Schießständen schießen, 3. mit Schusswaffen, aus denen nur Kartuschenmunition verschossen werden kann, a) durch Mitwirkende an Theateraufführungen und diesen gleich zu achtenden Vorführungen, b) zum Vertreiben von Vögeln in landwirtschaftlichen Betrieben, 4. mit Signalwaffen bei Not- und Rettungsübungen, 5. mit Schreckschuss- oder mit Signalwaffen zur Abgabe von Start- oder Beendigungszeichen im Auftrag der Veranstalter bei Sportveranstaltungen, wenn optische oder akustische Signalgebung erforderlich ist."},"jagd":{"ref":"§ 13 Abs. 6 Satz 1 WaffG","t":"Ein Jäger darf Jagdwaffen zur befugten Jagdausübung einschließlich des Ein- und Anschießens im Revier, zur Ausbildung von Jagdhunden im Revier, zum Jagdschutz oder zum Forstschutz ohne Erlaubnis führen und mit ihnen schießen; er darf auch im Zusammenhang mit diesen Tätigkeiten die Jagdwaffen nicht schussbereit ohne Erlaubnis führen."},"ueberl34":{"ref":"§ 34 Abs. 1 Satz 1 und 2 WaffG","t":"Waffen oder Munition dürfen nur berechtigten Personen überlassen werden. Die Berechtigung muss offensichtlich sein oder nachgewiesen werden."},"aufbew":{"ref":"§ 36 Abs. 1 WaffG","t":"Wer Waffen oder Munition besitzt, hat die erforderlichen Vorkehrungen zu treffen, um zu verhindern, dass diese Gegenstände abhanden kommen oder Dritte sie unbefugt an sich nehmen."},"fund37c":{"ref":"§ 37c Abs. 1 WaffG","t":"Wer Waffen oder Munition, deren Erwerb der Erlaubnis bedarf, in Besitz nimmt 1. beim Tod eines Waffenbesitzers, als Finder oder in ähnlicher Weise, 2. als Insolvenzverwalter, Zwangsverwalter, Gerichtsvollzieher oder in ähnlicher Weise, hat dies der zuständigen Behörde unverzüglich anzuzeigen."},"ausweis38":{"ref":"§ 38 Abs. 1 Satz 1 Nr. 1 Buchst. a WaffG","t":"Wer eine Waffe führt, muss folgende Dokumente mit sich führen: 1. seinen Personalausweis oder Pass und a) wenn es einer Erlaubnis zum Erwerb bedarf, die Waffenbesitzkarte oder, wenn es einer Erlaubnis zum Führen bedarf, den Waffenschein,"},"faust40":{"ref":"§ 40 Abs. 3 Satz 1 WaffG","t":"Inhaber einer jagdrechtlichen Erlaubnis und Angehörige von Leder oder Pelz verarbeitenden Berufen dürfen abweichend von § 2 Abs. 3 Umgang mit Faustmessern nach Anlage 2 Abschnitt 1 Nr. 1.4.2 haben, sofern sie diese Messer zur Ausübung ihrer Tätigkeit benötigen."},"bka40":{"ref":"§ 40 Abs. 4 Satz 1 WaffG","t":"Das Bundeskriminalamt kann auf Antrag von den Verboten der Anlage 2 Abschnitt 1 allgemein oder für den Einzelfall Ausnahmen zulassen, wenn die Interessen des Antragstellers auf Grund besonderer Umstände das öffentliche Interesse an der Durchsetzung des Verbots überwiegen."},"fund40":{"ref":"§ 40 Abs. 5 WaffG","t":"Wer eine in Anlage 2 Abschnitt 1 bezeichnete Waffe als Erbe, Finder oder in ähnlicher Weise in Besitz nimmt, hat dies der zuständigen Behörde unverzüglich anzuzeigen. Die zuständige Behörde kann die Waffen oder Munition sicherstellen oder anordnen, dass innerhalb einer angemessenen Frist die Waffen oder Munition unbrauchbar gemacht, von Verbotsmerkmalen befreit oder einem nach diesem Gesetz Berechtigten überlassen werden, oder dass der Erwerber einen Antrag nach Absatz 4 stellt. Das Verbot des Umgangs mit Waffen oder Munition wird nicht wirksam, solange die Frist läuft oder eine ablehnende Entscheidung nach Absatz 4 dem Antragsteller noch nicht bekannt gegeben worden ist."},"verbot41":{"ref":"§ 41 Abs. 1 Satz 1 WaffG (Auszug)","t":"Die zuständige Behörde kann jemandem den Besitz von Waffen oder Munition, deren Erwerb nicht der Erlaubnis bedarf, und den Erwerb solcher Waffen oder Munition untersagen,"},"veranst":{"ref":"§ 42 Abs. 1 WaffG","t":"Wer an öffentlichen Vergnügungen, Volksfesten, Sportveranstaltungen, Messen, Ausstellungen, Märkten oder ähnlichen öffentlichen Veranstaltungen teilnimmt, darf keine Waffen im Sinne des § 1 Abs. 2 führen. Dies gilt auch, wenn für die Teilnahme ein Eintrittsgeld zu entrichten ist, sowie für Theater-, Kino-, und Diskothekenbesuche und für Tanzveranstaltungen."},"veranstAusn":{"ref":"§ 42 Abs. 4 WaffG","t":"Die Absätze 1 bis 3 sind nicht anzuwenden 1. auf die Mitwirkenden an Theateraufführungen und diesen gleich zu achtenden Vorführungen, wenn zu diesem Zweck ungeladene oder mit Kartuschenmunition geladene Schusswaffen oder Waffen im Sinne des § 1 Abs. 2 Nr. 2 geführt werden, 2. auf das Schießen in Schießstätten (§ 27), 3. soweit eine Schießerlaubnis nach § 10 Abs. 5 vorliegt, 4. auf das gewerbliche Ausstellen der in Absatz 1 genannten Waffen auf Messen und Ausstellungen."},"messer4a":{"ref":"§ 42 Abs. 4a WaffG","t":"Absatz 1 gilt entsprechend für das Führen von Messern. Ausgenommen vom Verbot des Führens von Messern sind: 1. Anlieferverkehr, 2. Gewerbetreibende und ihre Beschäftigten und von den Gewerbetreibenden Beauftragte, die Messer im Zusammenhang mit ihrer Berufsausübung führen, 3. Personen, die ein Messer nicht zugriffsbereit von einem Ort zum anderen befördern, 4. Personen, die ein Messer in oder auf bestimmten Gebäuden oder Flächen mit öffentlichem Verkehr sowie in Verkehrsmitteln und Einrichtungen des öffentlichen Personenverkehrs, in oder auf denen Menschenansammlungen auftreten können und die einem Hausrecht unterliegen mit Zustimmung des Hausrechtsbereichsinhabers führen, wenn das Führen dem Zweck des Aufenthaltes in dem Hausrechtsbereich dient oder im Zusammenhang damit steht, 5. das gewerbliche Ausstellen von Messern auf Messen, Märkten und Ausstellungen, 6. Rettungskräfte und Einsatzkräfte im Zivil- und Katastrophenschutz im Zusammenhang mit der Tätigkeit, 7. Mitwirkende an Foto-, Film- oder Fernsehaufnahmen, Theateraufführungen oder historischen Darstellungen, wenn zu diesem Zweck Messer geführt werden, 8. Personen, die Messer im Zusammenhang mit der Brauchtumspflege, der Jagd oder der Ausübung des Sports führen, 9. Inhaber gastronomischer Betriebe, ihre Beschäftigten und Beauftragten sowie deren Kundinnen und Kunden, 10. Personen, die Messer im Zusammenhang mit einem allgemein anerkannten Zweck führen."},"zone":{"ref":"§ 42 Abs. 5 Satz 1 WaffG (Auszug)","t":"Die Landesregierungen können durch Rechtsverordnung das Führen von Waffen im Sinne des § 1 Absatz 2 und von Messern verbieten oder beschränken"},"zoneAusn":{"ref":"§ 42 Abs. 5 Satz 2 und 3 WaffG","t":"In der Rechtsverordnung nach Satz 1 ist eine Ausnahme vom Verbot oder von der Beschränkung für Fälle vorzusehen, in denen für das Führen der Waffe oder des Messers ein berechtigtes Interesse vorliegt. Ein berechtigtes Interesse liegt in der Regel vor 1. für das Führen von Waffen a) für Inhaber waffenrechtlicher Erlaubnisse, mit Ausnahme einer Erlaubnis nach § 10 Absatz 4 Satz 4, b) für Personen, die eine Waffe nicht zugriffsbereit von einem Ort zum anderen befördern, c) in den Fällen des Satzes 1 Nummer 3 für Personen, die eine Waffe mit Zustimmung eines anderen in dessen Hausrechtsbereich nach Satz 1 Nummer 3 führen, wenn das Führen dem Zweck des Aufenthaltes in dem Hausrechtsbereich dient oder im Zusammenhang damit steht, d) für Rettungskräfte und Einsatzkräfte im Zivil- und Katastrophenschutz im Zusammenhang mit der Tätigkeit; 2. für das Führen von Messern in den Fällen des Absatzes 4a Satz 2."},"f42a":{"ref":"§ 42a WaffG","t":"Es ist verboten 1. Anscheinswaffen, 2. Hieb- und Stoßwaffen nach Anlage 1 Abschnitt 1 Unterabschnitt 2 Nr. 1.1 oder 3. Messer mit einhändig feststellbarer Klinge (Einhandmesser) oder feststehende Messer mit einer Klingenlänge über 12 cm zu führen. (2) Absatz 1 gilt nicht 1. für die Verwendung bei Foto-, Film- oder Fernsehaufnahmen oder Theateraufführungen, 2. für den Transport in einem verschlossenen Behältnis, 3. für das Führen der Gegenstände nach Absatz 1 Nr. 2 und 3, sofern ein berechtigtes Interesse vorliegt. Weitergehende Regelungen bleiben unberührt. (3) Ein berechtigtes Interesse nach Absatz 2 Satz 1 Nr. 3 liegt insbesondere vor, wenn das Führen der Gegenstände im Zusammenhang mit der Berufsausübung erfolgt, der Brauchtumspflege, dem Sport oder einem allgemein anerkannten Zweck dient."},"f42b":{"ref":"§ 42b Abs. 1 WaffG","t":"Es ist verboten, 1. Waffen im Sinne des § 1 Absatz 2 oder 2. Messer in Verkehrsmitteln des öffentlichen Personenfernverkehrs und in seitlich umschlossenen Einrichtungen des öffentlichen Personenfernverkehrs, insbesondere Gebäuden und Haltepunkten, zu führen, soweit nicht eine Rechtsverordnung nach Absatz 2 besteht. Satz 1 gilt nicht 1. für das Führen von Waffen in den Fällen des § 42 Absatz 5 Satz 3 Nummer 1 Buchstabe a, b und d, 2. für das Führen von Messern in den Fällen des § 42 Absatz 4a Satz 2, 3. für Personen, die eine Waffe oder ein Messer mit Zustimmung des Verkehrsunternehmens führen, wenn das Führen dem Zweck des Aufenthalts in dem Hausrechtsbereich dient oder im Zusammenhang damit steht."},"bahn42b":{"ref":"§ 42b Abs. 2 WaffG","t":"Für das Gebiet der Bahnanlagen der Eisenbahnen des Bundes wird das Bundesministerium des Innern und für Heimat ermächtigt, durch Rechtsverordnung ohne Zustimmung des Bundesrates das Führen von Waffen im Sinne des § 1 Absatz 2 und von Messern zu verbieten oder zu beschränken, wenn das Verbot oder die Beschränkung zur Abwehr von Gefahren für die öffentliche Sicherheit erforderlich ist. In der Rechtsverordnung nach Satz 1 sind Ausnahmen vom Verbot oder von der Beschränkung entsprechend Absatz 1 Satz 2 vorzusehen. Die Ermächtigung nach Satz 1 kann durch Rechtsverordnung auf das Bundespolizeipräsidium übertragen werden. Die Befugnis der Bundespolizeibehörden, das Mitführen von Waffen und gefährlichen Gegenständen durch Allgemeinverfügung zu regeln, bleibt unberührt."},"kontr42c":{"ref":"§ 42c WaffG","t":"Die zuständige Behörde kann zur Durchsetzung gesetzlicher Waffen- und Messerverbote nach § 42 Absatz 1 Satz 1, Absatz 4a Satz 1 und § 42b Absatz 1 sowie von Waffen- und Messerverbotszonen nach § 42 Absatz 5 im räumlichen Geltungsbereich dieser gesetzlichen Waffen- und Messerverbote sowie im räumlichen Geltungsbereich der Waffen- und Messerverbotszonen Personen kurzzeitig anhalten, befragen, mitgeführte Sachen in Augenschein nehmen sowie die Person durchsuchen."},"p51":{"ref":"§ 51 Abs. 1 WaffG","t":"Mit Freiheitsstrafe von einem Jahr bis zu fünf Jahren wird bestraft, wer entgegen § 2 Absatz 3 in Verbindung mit Anlage 2 Abschnitt 1 Nummer 1.2.1.1 oder 1.2.1.2, eine dort genannte Schusswaffe zum Verschießen von Patronenmunition nach Anlage 1 Abschnitt 1 Unterabschnitt 3 Nr. 1.1 erwirbt, besitzt, überlässt, führt, verbringt, mitnimmt, herstellt, bearbeitet, instand setzt oder damit Handel treibt."},"p51r":{"ref":"§ 51 Abs. 2 bis 4 WaffG","t":"In besonders schweren Fällen ist die Strafe Freiheitsstrafe von einem Jahr bis zu zehn Jahren. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter gewerbsmäßig oder als Mitglied einer Bande, die sich zur fortgesetzten Begehung solcher Straftaten verbunden hat, unter Mitwirkung eines anderen Bandenmitgliedes handelt. (3) In minder schweren Fällen ist die Strafe Freiheitsstrafe bis zu drei Jahren oder Geldstrafe. (4) Handelt der Täter fahrlässig, so ist die Strafe Freiheitsstrafe bis zu zwei Jahren oder Geldstrafe."},"p52_1":{"ref":"§ 52 Abs. 1 Nr. 1 WaffG","t":"Mit Freiheitsstrafe von sechs Monaten bis zu fünf Jahren wird bestraft, wer 1. entgegen § 2 Absatz 3 in Verbindung mit Anlage 2 Abschnitt 1 Nr. 1.1 oder 1.3.4 eine dort genannte Schusswaffe oder einen dort genannten Gegenstand erwirbt, besitzt, überlässt, führt, verbringt, mitnimmt, herstellt, bearbeitet, instand setzt oder damit Handel treibt,"},"p52_1_2b":{"ref":"§ 52 Abs. 1 Nr. 2 Buchst. b WaffG","t":"§ 2 Abs. 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1, eine halbautomatische Kurzwaffe zum Verschießen von Patronenmunition nach Anlage 1 Abschnitt 1 Unterabschnitt 3 Nr. 1.1 erwirbt, besitzt oder führt,"},"p52_1_2c":{"ref":"§ 52 Abs. 1 Nr. 2 Buchst. c und d WaffG","t":"§ 2 Abs. 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1 in Verbindung mit § 21 Abs. 1 Satz 1 oder § 21a eine Schusswaffe oder Munition herstellt, bearbeitet, instand setzt oder damit Handel treibt, d) § 2 Abs. 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1 in Verbindung mit § 29 Absatz 1 Satz 1 oder § 32 Absatz 1 Satz 1 eine Schusswaffe oder Munition in den oder durch den Geltungsbereich dieses Gesetzes verbringt oder mitnimmt,"},"p52_3_1":{"ref":"§ 52 Abs. 3 Nr. 1 WaffG","t":"Mit Freiheitsstrafe bis zu drei Jahren oder mit Geldstrafe wird bestraft, wer 1. entgegen § 2 Absatz 3 in Verbindung mit Anlage 2 Abschnitt 1 Nummer 1.2.2 bis 1.2.4.2, 1.2.5, 1.3.1 bis 1.3.3, 1.3.5 bis 1.3.8, 1.4.1 Satz 1, Nr. 1.4.2 bis 1.4.4 oder 1.5.3 bis 1.5.7 einen dort genannten Gegenstand erwirbt, besitzt, überlässt, führt, verbringt, mitnimmt, herstellt, bearbeitet, instand setzt oder damit Handel treibt,"},"p52_3_2":{"ref":"§ 52 Abs. 3 Nr. 2 WaffG","t":"ohne Erlaubnis nach § 2 Abs. 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1 a) eine Schusswaffe erwirbt, besitzt, führt oder b) Munition erwirbt oder besitzt, wenn die Tat nicht in Absatz 1 Nr. 2 Buchstabe a oder b mit Strafe bedroht ist,"},"p52_3_3":{"ref":"§ 52 Abs. 3 Nr. 3 und 4 WaffG","t":"ohne Erlaubnis nach § 2 Abs. 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1 in Verbindung mit § 26 Abs. 1 Satz 1 eine Schusswaffe herstellt, bearbeitet oder instand setzt, 4. ohne Erlaubnis nach § 2 Absatz 2 in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1 in Verbindung mit a) § 29 Absatz 1 Satz 1 eine dort genannte Schusswaffe oder Munition aus dem Geltungsbereich dieses Gesetzes in einen anderen Mitgliedstaat verbringt oder b) § 32 Absatz 1a Satz 1 eine dort genannte Schusswaffe oder Munition in einen anderen Mitgliedstaat mitnimmt,"},"p52_3_7":{"ref":"§ 52 Abs. 3 Nr. 7 und 7a WaffG","t":"entgegen § 34 Abs. 1 Satz 1 eine erlaubnispflichtige Schusswaffe oder erlaubnispflichtige Munition einem Nichtberechtigten überlässt, 7a. entgegen § 36 Absatz 1 Satz 1 in Verbindung mit einer Rechtsverordnung nach § 36 Absatz 5 Satz 1 eine dort genannte Vorkehrung für eine Schusswaffe nicht, nicht richtig oder nicht rechtzeitig trifft und dadurch die Gefahr verursacht, dass eine Schusswaffe oder Munition abhandenkommt oder darauf unbefugt zugegriffen wird,"},"p52_3_8":{"ref":"§ 52 Abs. 3 Nr. 8 bis 10 WaffG","t":"einer vollziehbaren Anordnung nach § 41 Abs. 1 Satz 1 oder Abs. 2 zuwiderhandelt, 9. entgegen § 42 Abs. 1 eine Waffe führt oder 10 entgegen § 57 Abs. 5 Satz 1 den Besitz über eine Schusswaffe oder Munition ausübt."},"p52_2":{"ref":"§ 52 Abs. 2 WaffG","t":"Der Versuch ist strafbar."},"p52_4":{"ref":"§ 52 Abs. 4 bis 6 WaffG","t":"Handelt der Täter in den Fällen des Absatzes 1 Nr. 1, 2 Buchstabe b, c oder d oder Nr. 3 oder des Absatzes 3 Nummer 1 bis 7, 8, 9 oder 10 fahrlässig, so ist die Strafe bei den bezeichneten Taten nach Absatz 1 Freiheitsstrafe bis zu zwei Jahren oder Geldstrafe, bei Taten nach Absatz 3 Freiheitsstrafe bis zu einem Jahr oder Geldstrafe. (5) In besonders schweren Fällen des Absatzes 1 Nr. 1 ist die Strafe Freiheitsstrafe von einem Jahr bis zu zehn Jahren. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter gewerbsmäßig oder als Mitglied einer Bande, die sich zur fortgesetzten Begehung solcher Straftaten verbunden hat, unter Mitwirkung eines anderen Bandenmitgliedes handelt. (6) In minder schweren Fällen des Absatzes 1 ist die Strafe Freiheitsstrafe bis zu drei Jahren oder Geldstrafe."},"p53_1":{"ref":"§ 53 Abs. 1 Nr. 1 WaffG","t":"Ordnungswidrig handelt, wer vorsätzlich oder fahrlässig 1. entgegen § 2 Abs. 1 eine nicht erlaubnispflichtige Waffe oder nicht erlaubnispflichtige Munition erwirbt oder besitzt,"},"p53_3":{"ref":"§ 53 Abs. 1 Nr. 3 WaffG","t":"ohne Erlaubnis nach § 2 Abs. 2 in Verbindung mit Abs. 4, dieser in Verbindung mit Anlage 2 Abschnitt 2 Unterabschnitt 1 Satz 1, mit einer Schusswaffe schießt"},"p53_16":{"ref":"§ 53 Abs. 1 Nr. 16 WaffG","t":"entgegen § 34 Abs. 1 Satz 1 eine nicht erlaubnispflichtige Waffe oder nicht erlaubnispflichtige Munition einem Nichtberechtigten überlässt"},"p53_20":{"ref":"§ 53 Abs. 1 Nr. 20 WaffG","t":"entgegen § 38 Absatz 1 Satz 1 oder Absatz 2 ein dort genanntes Dokument nicht mit sich führt oder nicht oder nicht rechtzeitig aushändigt"},"p53_21":{"ref":"§ 53 Abs. 1 Nr. 21a bis 21c WaffG","t":"entgegen § 42 Absatz 4a Satz 1 in Verbindung mit Absatz 1 ein Messer führt, 21b. entgegen § 42a Abs. 1 eine Anscheinswaffe, eine dort genannte Hieb- oder Stoßwaffe oder ein dort genanntes Messer führt, 21c. entgegen § 42b Absatz 1 eine Waffe oder ein Messer führt"},"p53_23":{"ref":"§ 53 Abs. 1 Nr. 23 WaffG","t":"einer Rechtsverordnung nach § 15a Absatz 4, § 27 Absatz 7 Satz 2, § 36 Absatz 5, den §§ 39a, 39c Absatz 1 oder 2 Satz 1, § 42 Absatz 5 Satz 1 oder § 42b Absatz 2 Satz 1 oder § 47 oder einer vollziehbaren Anordnung auf Grund einer solchen Rechtsverordnung zuwiderhandelt, soweit die Rechtsverordnung für einen bestimmten Tatbestand auf diese Bußgeldvorschrift verweist"},"p53_2":{"ref":"§ 53 Abs. 2 WaffG","t":"Die Ordnungswidrigkeit kann mit einer Geldbuße bis zu zehntausend Euro geahndet werden."},"einzug":{"ref":"§ 54 Abs. 1 und 2 WaffG","t":"Ist eine Straftat nach den §§ 51, 52 Abs. 1, 2 oder 3 Nr. 1, 2 oder 3 oder Abs. 5 begangen worden, so werden Gegenstände, 1. auf die sich diese Straftat bezieht oder 2. die durch sie hervorgebracht oder zu ihrer Begehung oder Vorbereitung gebraucht worden oder bestimmt gewesen sind, eingezogen. (2) Ist eine sonstige Straftat nach § 52 oder eine Ordnungswidrigkeit nach § 53 begangen worden, so können in Absatz 1 bezeichnete Gegenstände eingezogen werden."},"kw57":{"ref":"§ 57 Abs. 1 Satz 1 WaffG","t":"Dieses Gesetz gilt nicht für Kriegswaffen im Sinne des Gesetzes über die Kontrolle von Kriegswaffen."},"kwDef":{"ref":"§ 1 Abs. 1 KrWaffKontrG","t":"Zur Kriegsführung bestimmte Waffen im Sinne dieses Gesetzes (Kriegswaffen) sind die in der Anlage zu diesem Gesetz (Kriegswaffenliste) aufgeführten Gegenstände, Stoffe und Organismen."},"kw22a":{"ref":"§ 22a Abs. 1 KrWaffKontrG","t":"Mit Freiheitsstrafe von einem Jahr bis zu fünf Jahren wird bestraft, wer 1. Kriegswaffen ohne Genehmigung nach § 2 Abs. 1 herstellt, 2. die tatsächliche Gewalt über Kriegswaffen ohne Genehmigung nach § 2 Abs. 2 von einem anderen erwirbt oder einem anderen überläßt, 3. im Bundesgebiet außerhalb eines abgeschlossenen Geländes Kriegswaffen ohne Genehmigung nach § 3 Abs. 1 oder 2 befördern läßt oder selbst befördert; dies gilt nicht für Selbstbeförderungen in den Fällen des § 12 Absatz 6 Nummer 1 sowie für Inhaber einer Waffenbesitzkarte für Kriegswaffen gemäß § 59 Absatz 4 des Waffengesetzes von 1972 im Rahmen von Umzugshandlungen durch den Inhaber der Erlaubnis, 4. Kriegswaffen einführt, ausführt, durch das Bundesgebiet durchführt oder aus dem Bundesgebiet verbringt, ohne daß die hierzu erforderliche Beförderung genehmigt ist, 5. mit Seeschiffen, welche die Bundesflagge führen, oder mit Luftfahrzeugen, die in die Luftfahrzeugrolle der Bundesrepublik Deutschland eingetragen sind, absichtlich oder wissentlich Kriegswaffen ohne Genehmigung nach § 4 befördert, die außerhalb des Bundesgebietes ein- und ausgeladen und durch das Bundesgebiet nicht durchgeführt werden, 6. über Kriegswaffen sonst die tatsächliche Gewalt ausübt, ohne daß a) der Erwerb der tatsächlichen Gewalt auf einer Genehmigung nach diesem Gesetz beruht oder b) eine Anzeige nach § 12 Abs. 6 Nr. 1 oder § 26a erstattet worden ist, oder 7. einen Vertrag über den Erwerb oder das Überlassen ohne Genehmigung nach § 4a Abs. 1 vermittelt oder eine Gelegenheit hierzu nachweist oder einen Vertrag ohne Genehmigung nach § 4a Abs. 2 abschließt."},"kw22ar":{"ref":"§ 22a Abs. 2 bis 4 KrWaffKontrG","t":"In besonders schweren Fällen ist die Strafe Freiheitsstrafe von einem Jahr bis zu zehn Jahren. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter in den Fällen des Absatzes 1 Nr. 1 bis 4, 6 oder 7 gewerbsmäßig oder als Mitglied einer Bande, die sich zur fortgesetzten Begehung solcher Straftaten verbunden hat, unter Mitwirkung eines anderen Bandenmitglieds handelt. (3) In minder schweren Fällen ist die Strafe Freiheitsstrafe bis zu drei Jahren oder Geldstrafe. (4) Wer fahrlässig eine in Absatz 1 Nummer 1 bis 4, 6 oder Nummer 7 bezeichnete Handlung begeht, wird mit Freiheitsstrafe bis zu zwei Jahren oder mit Geldstrafe bestraft."},"s15":{"ref":"§ 15 StGB","t":"Strafbar ist nur vorsätzliches Handeln, wenn nicht das Gesetz fahrlässiges Handeln ausdrücklich mit Strafe bedroht."},"s16":{"ref":"§ 16 Abs. 1 StGB","t":"Wer bei Begehung der Tat einen Umstand nicht kennt, der zum gesetzlichen Tatbestand gehört, handelt nicht vorsätzlich. Die Strafbarkeit wegen fahrlässiger Begehung bleibt unberührt."},"s17":{"ref":"§ 17 StGB","t":"Fehlt dem Täter bei Begehung der Tat die Einsicht, Unrecht zu tun, so handelt er ohne Schuld, wenn er diesen Irrtum nicht vermeiden konnte. Konnte der Täter den Irrtum vermeiden, so kann die Strafe nach § 49 Abs. 1 gemildert werden."},"s23":{"ref":"§ 23 Abs. 1 StGB","t":"Der Versuch eines Verbrechens ist stets strafbar, der Versuch eines Vergehens nur dann, wenn das Gesetz es ausdrücklich bestimmt."},"s32":{"ref":"§ 32 StGB","t":"Wer eine Tat begeht, die durch Notwehr geboten ist, handelt nicht rechtswidrig. (2) Notwehr ist die Verteidigung, die erforderlich ist, um einen gegenwärtigen rechtswidrigen Angriff von sich oder einem anderen abzuwenden."},"s52":{"ref":"§ 52 Abs. 1 und 2 StGB","t":"Verletzt dieselbe Handlung mehrere Strafgesetze oder dasselbe Strafgesetz mehrmals, so wird nur auf eine Strafe erkannt. (2) Sind mehrere Strafgesetze verletzt, so wird die Strafe nach dem Gesetz bestimmt, das die schwerste Strafe androht. Sie darf nicht milder sein, als die anderen anwendbaren Gesetze es zulassen."},"o10":{"ref":"§ 10 OWiG","t":"Als Ordnungswidrigkeit kann nur vorsätzliches Handeln geahndet werden, außer wenn das Gesetz fahrlässiges Handeln ausdrücklich mit Geldbuße bedroht."},"o11":{"ref":"§ 11 OWiG","t":"Wer bei Begehung einer Handlung einen Umstand nicht kennt, der zum gesetzlichen Tatbestand gehört, handelt nicht vorsätzlich. Die Möglichkeit der Ahndung wegen fahrlässigen Handelns bleibt unberührt. (2) Fehlt dem Täter bei Begehung der Handlung die Einsicht, etwas Unerlaubtes zu tun, namentlich weil er das Bestehen oder die Anwendbarkeit einer Rechtsvorschrift nicht kennt, so handelt er nicht vorwerfbar, wenn er diesen Irrtum nicht vermeiden konnte."},"o19":{"ref":"§ 19 Abs. 1 OWiG","t":"Verletzt dieselbe Handlung mehrere Gesetze, nach denen sie als Ordnungswidrigkeit geahndet werden kann, oder ein solches Gesetz mehrmals, so wird nur eine einzige Geldbuße festgesetzt."},"o21":{"ref":"§ 21 OWiG","t":"Ist eine Handlung gleichzeitig Straftat und Ordnungswidrigkeit, so wird nur das Strafgesetz angewendet. Auf die in dem anderen Gesetz angedrohten Nebenfolgen kann erkannt werden. (2) Im Falle des Absatzes 1 kann die Handlung jedoch als Ordnungswidrigkeit geahndet werden, wenn eine Strafe nicht verhängt wird."}};
/* WaffG-Prüfstand – Prüflogik nach dem amtlichen Wortlaut (WaffG zuletzt geändert durch Art. 12 Abs. 20 G v. 22.10.2026, BGBl. I Nr. 318).
   Ergebnis ist eine Liste von Prüfungen (Straftat / OWi / Einzelfall / kein Verstoß) mit Tatbestandsmerkmalen für die Subsumtion. Keine Rechtsberatung. */
const WF_STAND = 'WaffG i. d. F. vom 22.10.2026 (BGBl. 2026 I Nr. 318)';
const WF_RANK = { erlaubt: 0, hinweis: 1, owi: 2, straftat: 3 };
const WF_PEN = {
  kw: { norm: '§ 22a Abs. 1 KrWaffKontrG', folge: 'Freiheitsstrafe von 1 bis 5 Jahren (Verbrechen)', rank: 70, verbrechen: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 22a Abs. 4 KrWaffKontrG)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 22a Abs. 3)', bs: 'besonders schwerer Fall (gewerbsmäßig, Bande): 1 bis 10 Jahre (§ 22a Abs. 2)', law: ['kw57', 'kwDef', 'kw22a', 'kw22ar'] },
  p51: { norm: '§ 51 Abs. 1 WaffG', folge: 'Freiheitsstrafe von 1 bis 5 Jahren (Verbrechen)', rank: 60, verbrechen: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 51 Abs. 4)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 51 Abs. 3)', bs: 'besonders schwerer Fall (gewerbsmäßig, Bande): 1 bis 10 Jahre (§ 51 Abs. 2)', einz: true, law: ['p51', 'p51r', 'einzug'] },
  p52_1_1: { norm: '§ 52 Abs. 1 Nr. 1 WaffG', folge: 'Freiheitsstrafe von 6 Monaten bis 5 Jahren', rank: 50, versuch: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 52 Abs. 4)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 52 Abs. 6)', bs: 'besonders schwerer Fall (gewerbsmäßig, Bande): 1 bis 10 Jahre (§ 52 Abs. 5)', einz: true, law: ['p52_1', 'p52_2', 'p52_4', 'einzug'] },
  p52_1_2a: { norm: '§ 52 Abs. 1 Nr. 2 Buchst. a WaffG', folge: 'Freiheitsstrafe von 6 Monaten bis 5 Jahren', rank: 50, versuch: true, fahrl: null, ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 52 Abs. 6)', einz: true, law: ['p52_1', 'p52_2', 'p52_4', 'einzug'] },
  p52_1_2b: { norm: '§ 52 Abs. 1 Nr. 2 Buchst. b WaffG', folge: 'Freiheitsstrafe von 6 Monaten bis 5 Jahren', rank: 50, versuch: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 52 Abs. 4)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 52 Abs. 6)', einz: true, law: ['p52_1_2b', 'p52_2', 'p52_4', 'einzug'] },
  p52_1_2c: { norm: '§ 52 Abs. 1 Nr. 2 Buchst. c WaffG', folge: 'Freiheitsstrafe von 6 Monaten bis 5 Jahren', rank: 50, versuch: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 52 Abs. 4)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 52 Abs. 6)', einz: true, law: ['p52_1_2c', 'p52_2', 'p52_4', 'einzug'] },
  p52_1_2d: { norm: '§ 52 Abs. 1 Nr. 2 Buchst. d WaffG', folge: 'Freiheitsstrafe von 6 Monaten bis 5 Jahren', rank: 50, versuch: true, fahrl: 'Freiheitsstrafe bis 2 Jahre oder Geldstrafe (§ 52 Abs. 4)', ms: 'minder schwerer Fall: bis 3 Jahre oder Geldstrafe (§ 52 Abs. 6)', einz: true, law: ['p52_1_2c', 'p52_2', 'p52_4', 'einzug'] },
  p52_3_1: { norm: '§ 52 Abs. 3 Nr. 1 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', einz: true, law: ['p52_3_1', 'p52_4', 'einzug'] },
  p52_3_2a: { norm: '§ 52 Abs. 3 Nr. 2 Buchst. a WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', einz: true, law: ['p52_3_2', 'p52_4', 'einzug'] },
  p52_3_2b: { norm: '§ 52 Abs. 3 Nr. 2 Buchst. b WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', einz: true, law: ['p52_3_2', 'p52_4', 'einzug'] },
  p52_3_3: { norm: '§ 52 Abs. 3 Nr. 3 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', einz: true, law: ['p52_3_3', 'p52_4', 'einzug'] },
  p52_3_4: { norm: '§ 52 Abs. 3 Nr. 4 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', law: ['p52_3_3', 'p52_4', 'einzug'] },
  p52_3_7: { norm: '§ 52 Abs. 3 Nr. 7 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', law: ['p52_3_7', 'ueberl34', 'p52_4'] },
  p52_3_7a: { norm: '§ 52 Abs. 3 Nr. 7a WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: null, law: ['p52_3_7', 'aufbew'] },
  p52_3_8: { norm: '§ 52 Abs. 3 Nr. 8 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', law: ['p52_3_8', 'verbot41', 'p52_4'] },
  p52_3_9: { norm: '§ 52 Abs. 3 Nr. 9 WaffG', folge: 'Freiheitsstrafe bis 3 Jahre oder Geldstrafe', rank: 40, fahrl: 'Freiheitsstrafe bis 1 Jahr oder Geldstrafe (§ 52 Abs. 4)', law: ['p52_3_8', 'veranst', 'veranstAusn', 'p52_4'] }
};
const wfOwi = (nr, law) => ({ norm: `§ 53 Abs. 1 Nr. ${nr} WaffG`, folge: 'Geldbuße bis 10.000 € (§ 53 Abs. 2)', rank: 20, owi: true, fahrl: 'auch fahrlässig ahndbar („vorsätzlich oder fahrlässig“, § 53 Abs. 1)', law: [...law, 'p53_2'] });
const WF_ZWECK_42A = new Set(['beruf', 'sport', 'anerkannt', 'gastro', 'rettung', 'anliefer']);
const WF_ZWECK_4A = new Set(['beruf', 'sport', 'anerkannt', 'gastro', 'film', 'rettung', 'anliefer', 'hausrecht']);
const WF_ZWECK_LABEL = { keiner: 'kein besonderer Zweck', beruf: 'Berufsausübung', sport: 'Sport, Jagd, Brauchtum', anerkannt: 'allgemein anerkannter Zweck', gastro: 'Gastronomie', film: 'Foto, Film, Theater', rettung: 'Rettungs- oder Einsatzkräfte', anliefer: 'Anlieferverkehr', hausrecht: 'Zustimmung des Hausrechtsinhabers' };
const WF_H = {
  besitz: { label: 'Besitz', verb: 'besitzt', law: 'besitz' }, erwerb: { label: 'Erwerb', verb: 'erwirbt', law: 'erwerb' },
  fuehren: { label: 'Führen', verb: 'führt', law: 'fuehren' }, ueberlassen: { label: 'Überlassen', verb: 'überlässt', law: 'ueberlassen' },
  schiessen: { label: 'Schießen', verb: 'schießt', law: 'schiessen' }, verbringen: { label: 'Verbringen / Mitnehmen', verb: 'verbringt', law: 'verbringen' },
  herstellen: { label: 'Herstellen / Bearbeiten', verb: 'stellt her bzw. bearbeitet', law: 'herstellen' }, handel: { label: 'Handel treiben', verb: 'treibt damit Handel', law: 'handel' },
  aufbewahrung: { label: 'Aufbewahrung', verb: 'bewahrt auf', law: 'aufbew' }
};
const WF_CAT = { verboten: 'verbotene Waffe (Anlage 2 Abschn. 1)', erlpfl: 'erlaubnispflichtig (Anlage 2 Abschn. 2 UA 1)', frei: 'Waffe, für diesen Umgang erlaubnisfrei', messer: 'Messer (keine Waffe i. S. d. § 1 Abs. 2)', ausgenommen: 'vom Gesetz bis auf § 42a ausgenommen', nicht: 'vom WaffG nicht erfasst', kw: 'Kriegswaffe (KrWaffKontrG)', verbotenOhne: 'verboten, aber ohne Straf- oder Bußgeldnorm' };
const wfCmF = v => Number(v).toFixed(1).replace('.', ',');

/** Einstufung des Gegenstands */
function wfClass(s) {
  const L = s.len, c = { waffe: true, schuss: false, messer: false, mun: false, f42a: null, minAge: 18, fuehrErl: null, law: [], notes: [] };
  const V = (vnr, pen, label, acc, law, why) => Object.assign(c, { cat: 'verboten', vnr, pen, label, acc, law, why });
  const set = o => Object.assign(c, o);
  if (s.obj === 'messer') {
    c.messer = true;
    const m = s.messer;
    if (m === 'einhand') set({ key: 'einhand', cat: 'messer', waffe: false, minAge: 0, f42a: 'messer', label: 'Einhandmesser', acc: 'ein Einhandmesser (Messer mit einhändig feststellbarer Klinge)', law: ['f42a'] });
    else if (m === 'feststehend') {
      if (s.dolch) set({ key: 'dolch', cat: 'frei', f42a: 'hieb', label: `Dolch / Kampfmesser, Klinge ${wfCmF(L)} cm (Hieb- und Stoßwaffe)`, acc: `einen Dolch bzw. ein als Waffe bestimmtes feststehendes Messer mit einer Klingenlänge von ${wfCmF(L)} cm`, law: ['hieb', 'waffe'] });
      else set({ key: 'feststehend', cat: 'messer', waffe: false, minAge: 0, f42a: L > 12 ? 'messer' : null, label: `Feststehendes Messer, Klinge ${wfCmF(L)} cm`, acc: `ein feststehendes Messer mit einer Klingenlänge von ${wfCmF(L)} cm`, law: ['f42a'] });
    } else if (m === 'klapp') set({ key: 'klapp', cat: 'messer', waffe: false, minAge: 0, label: 'Zweihand-Klappmesser', acc: 'ein zweihändig zu öffnendes Klappmesser' });
    else if (m === 'multi') set({ key: 'multi', cat: 'messer', waffe: false, minAge: 0, label: 'Taschenmesser / Multitool', acc: 'ein Taschenmesser bzw. Multitool' });
    else if (m === 'spring') {
      const form = s.springOeffnung === 'seitlich' && L <= 8.5 && !s.beidseitig;
      const acc = `ein Springmesser (Klinge springt ${s.springOeffnung === 'seitlich' ? 'seitlich' : 'frontal'} heraus, Klingenlänge ${wfCmF(L)} cm${s.beidseitig ? ', zweiseitig geschliffen' : ''})`;
      if (form && s.springGrund !== 'keiner') set({ key: 'springFrei', cat: 'frei', f42a: 'messer', label: 'Springmesser – Ausnahme nach Nr. 1.4.1 Satz 2', acc, law: ['springDef', 'v141'], frei: 'Anlage 2 Abschnitt 1 Nr. 1.4.1 Satz 2 (seitlich, ≤ 8,5 cm, einseitig geschliffen und ' + (s.springGrund === 'beruf' ? 'Umgang im Zusammenhang mit der Berufsausübung)' : 'berechtigtes Interesse, das eine einhändige Nutzung erforderlich macht)') });
      else V('Anlage 2 Abschnitt 1 Nr. 1.4.1 Satz 1', 'p52_3_1', 'Springmesser (verboten)', acc, ['springDef', 'v141'],
        s.springOeffnung === 'frontal' ? 'Frontal herausspringende Klinge: Die Ausnahme in Satz 2 erfasst nur seitlich herausspringende Klingen.'
          : !form ? `Die Ausnahme setzt eine seitlich herausspringende, höchstens 8,5 cm lange, nicht zweiseitig geschliffene Klinge voraus – hier ${L > 8.5 ? 'Klinge über 8,5 cm' : 'zweiseitig geschliffen'}.`
            : 'Formell ausnahmefähig, aber seit 31.10.2024 nur bei einem berechtigten Interesse, das eine einhändige Nutzung erfordert, oder im Zusammenhang mit der Berufsausübung – beides liegt nach den Angaben nicht vor.');
    } else if (m === 'fall') V('Anlage 2 Abschnitt 1 Nr. 1.4.1 Satz 1', 'p52_3_1', 'Fallmesser', 'ein Fallmesser', ['fallDef', 'v141'], 'Fallmesser sind ausnahmslos verboten.');
    else if (m === 'faust') {
      if (s.faustAusn) set({ key: 'faustFrei', cat: 'frei', label: 'Faustmesser – Ausnahme § 40 Abs. 3', acc: 'ein Faustmesser', law: ['faustDef', 'faust40'], frei: '§ 40 Abs. 3 Satz 1 WaffG (Jäger bzw. Leder/Pelz verarbeitende Berufe, zur Tätigkeit benötigt)' });
      else V('Anlage 2 Abschnitt 1 Nr. 1.4.2', 'p52_3_1', 'Faustmesser', 'ein Faustmesser', ['faustDef', 'faust40'], 'Faustmesser sind verboten; Ausnahme nur für Jäger und Leder/Pelz verarbeitende Berufe zur Ausübung der Tätigkeit (§ 40 Abs. 3).');
    } else if (m === 'butterfly') V('Anlage 2 Abschnitt 1 Nr. 1.4.3', 'p52_3_1', 'Butterflymesser', 'ein Butterflymesser (Balisong)', ['butterflyDef'], 'Butterflymesser sind ausnahmslos verboten.');
    else V('Anlage 2 Abschnitt 1 Nr. 1.3.1', 'p52_3_1', 'Getarnte Hieb-/Stoßwaffe (z. B. Gürtelschnallenmesser)', 'eine als Alltagsgegenstand getarnte Stichwaffe (z. B. Gürtelschnallen- oder Kugelschreibermesser)', ['v131'], 'Hieb- oder Stoßwaffen, die einen anderen Gegenstand vortäuschen oder mit Alltagsgegenständen verkleidet sind, sind verboten.');
  } else if (s.obj === 'schuss') {
    c.schuss = true;
    const t = s.schuss;
    if (t === 'kurzHalb') set({ key: 'kurzHalb', cat: 'erlpfl', pen: 'p52_1_2b', label: 'Halbautomatische Kurzwaffe (Pistole)', acc: 'eine halbautomatische Kurzwaffe (Selbstladepistole) für Patronenmunition', law: ['automatik', 'langkurz', 'erlPflicht', 'p52_1_2b'] });
    else if (t === 'kurzSonst') set({ key: 'kurzSonst', cat: 'erlpfl', pen: 'p52_3_2a', label: 'Revolver / Repetier- oder Einzellader-Kurzwaffe', acc: 'eine Kurzwaffe (Revolver bzw. Repetier- oder Einzellader-Kurzwaffe)', law: ['langkurz', 'automatik', 'erlPflicht', 'p52_3_2'] });
    else if (t === 'lang') set({ key: 'lang', cat: 'erlpfl', pen: 'p52_3_2a', label: 'Langwaffe (Büchse, Flinte, auch halbautomatisch)', acc: 'eine Langwaffe (Büchse bzw. Flinte)', law: ['langkurz', 'erlPflicht', 'p52_3_2'] });
    else if (t === 'voll') V('Anlage 2 Abschnitt 1 Nr. 1.2.1.1', 'p51', 'Vollautomatische Schusswaffe', 'eine vollautomatische Schusswaffe für Patronenmunition', ['automatik', 'v1211', 'p51'], 'Vollautomaten sind verbotene Waffen. Steht die Waffe in der Kriegswaffenliste (Nr. 29, 30), gilt allein das KrWaffKontrG (§ 57 Abs. 1 WaffG) – dann Objektart „Kriegswaffe“ wählen.');
    else if (t === 'pump') V('Anlage 2 Abschnitt 1 Nr. 1.2.1.2', 'p51', 'Vorderschaftrepetierflinte mit Kurzwaffengriff bzw. verkürzt', 'eine Vorderschaftrepetierflinte mit Kurzwaffengriff anstelle des Hinterschaftes bzw. mit einer Gesamtlänge unter 95 cm oder einer Lauflänge unter 45 cm', ['v1211', 'p51'], 'Diese Vorderschaftrepetierflinten sind verboten; § 51 Abs. 1 erfasst sie ausdrücklich.');
    else if (t === 'getarnt') V('Anlage 2 Abschnitt 1 Nr. 1.2.2 / 1.2.3', 'p52_3_1', 'Getarnte bzw. unüblich verkürzbare Schusswaffe', 'eine als anderer Gegenstand getarnte bzw. über das übliche Maß hinaus zerlegbare oder verkürzbare Schusswaffe (z. B. Kugelschreiber- oder Koppelschlosspistole)', ['v122', 'p52_3_1'], 'Schusswaffen, die einen anderen Gegenstand vortäuschen, mit Alltagsgegenständen verkleidet oder über das jagdlich-sportlich übliche Maß hinaus verkürzbar oder zerlegbar sind, sind verboten.');
    else set({ key: 'teil', cat: 'erlpfl', pen: s.teilHalb ? 'p52_1_2b' : 'p52_3_2a', label: 'Wesentliches Teil / Schalldämpfer', acc: `ein wesentliches Teil (z. B. Lauf, Verschluss, Gehäuse) bzw. einen Schalldämpfer ${s.teilHalb ? 'einer halbautomatischen Kurzwaffe' : 'einer erlaubnispflichtigen Schusswaffe'}`, law: ['teile', 'erlPflicht', s.teilHalb ? 'p52_1_2b' : 'p52_3_2'], notes: ['Wesentliche Teile und Schalldämpfer stehen der Schusswaffe gleich, für die sie bestimmt sind (Anlage 1 Abschn. 1 UA 1 Nr. 1.3).'] });
  } else if (s.obj === 'srs') {
    c.schuss = true;
    if (s.srs === 'ptb') set({ key: 'srsPtb', cat: 'frei', fuehrErl: 'kws', pen: 'p52_3_2a', label: 'SRS-Waffe mit Zulassungszeichen (PTB)', acc: 'eine Schreckschuss-, Reizstoff- oder Signalwaffe mit amtlichem Zulassungszeichen (PTB im Kreis)', law: ['srsDef', 'frei13', 'kwsDef', 'waffenschein'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.3 (Erwerb und Besitz)' });
    else set({ key: 'srsOhne', cat: 'erlpfl', pen: 'p52_3_2a', label: 'SRS-Waffe ohne Zulassungszeichen', acc: 'eine Schreckschuss-, Reizstoff- oder Signalwaffe ohne amtliches Zulassungszeichen', law: ['srsDef', 'frei13', 'erlPflicht', 'p52_3_2'], notes: ['Ohne Zulassungszeichen bzw. EU-Konformität greift die Freistellung nach Nr. 1.3 nicht – der Umgang ist erlaubnispflichtig wie bei einer scharfen Schusswaffe.'] });
  } else if (s.obj === 'druck') {
    c.schuss = true;
    const d = s.druck;
    if (d === 'spiel05') {
      c.schuss = false; c.waffe = false;
      if (s.echt) set({ key: 'softair', cat: 'ausgenommen', f42a: 'anschein', minAge: 0, label: 'Softair bis 0,5 J (täuschend echt)', acc: 'eine Softair-Waffe mit einer Geschossenergie von höchstens 0,5 Joule, die im Gesamterscheinungsbild einer Feuerwaffe gleicht (Anscheinswaffe)', law: ['spiel', 'anschein', 'f42a'] });
      else set({ key: 'softairSpiel', cat: 'nicht', minAge: 0, label: 'Softair-Spielzeug bis 0,5 J', acc: 'ein erkennbar als Spielzeug gestaltetes Softair-Gerät bis 0,5 Joule', law: ['spiel', 'anschein'] });
    } else if (d === 'f75') set({ key: 'f75', cat: 'frei', fuehrErl: 'waffenschein', pen: 'p52_3_2a', label: 'Druckluft-/CO₂-/Federdruckwaffe bis 7,5 J (F im Fünfeck)', acc: 'eine Druckluft-, CO₂- bzw. Federdruckwaffe mit höchstens 7,5 Joule und F-Kennzeichen', law: ['druckDef', 'frei11', 'waffenschein'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.1 (nur Erwerb und Besitz)', notes: ['Freistellung nur bei „F im Fünfeck“; Einschränkungen für Mehrschüsser mit Geschossen über 30 mm und für Kennzeichnungen ab dem 24.07.2025 (Nr. 1.1 Buchst. a, b).'] });
    else if (d === 'alt70') set({ key: 'alt70', cat: 'frei', fuehrErl: 'waffenschein', pen: 'p52_3_2a', label: 'Druckluft-/Federdruckwaffe hergestellt vor 1970', acc: 'eine vor dem 1. Januar 1970 hergestellte Druckluft- bzw. Federdruckwaffe', law: ['druckDef', 'waffenschein'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.2 (nur Erwerb und Besitz)' });
    else set({ key: 'ueber75', cat: 'erlpfl', pen: 'p52_3_2a', label: 'Druckluftwaffe über 7,5 J', acc: 'eine Druckluftwaffe mit einer Geschossenergie von mehr als 7,5 Joule', law: ['druckDef', 'erlPflicht', 'p52_3_2'] });
  } else if (s.obj === 'hist') {
    c.schuss = true;
    const h = s.hist;
    if (h === 'lunte') set({ key: 'lunte', cat: 'frei', label: 'Lunten-/Funkenschlosswaffe (Modell vor 1871)', acc: 'eine Schusswaffe mit Lunten- oder Funkenzündung (Modell vor 1871)', law: ['freiAntik', 'freiFuehren'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.6 und 3.1 (Erwerb, Besitz und Führen)' });
    else if (h === 'perk') set({ key: 'perk', cat: 'frei', fuehrErl: 'waffenschein', pen: 'p52_3_2a', label: 'Einläufiger Perkussions-Einzellader (Modell vor 1871)', acc: 'einen einläufigen Perkussions-Einzellader (Vorderlader mit Zündhütchenzündung, Modell vor 1871)', law: ['freiAntik', 'waffenschein'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.5 (nur Erwerb und Besitz)' });
    else if (h === 'zuend') set({ key: 'zuend', cat: 'frei', fuehrErl: 'waffenschein', pen: 'p52_3_2a', label: 'Zündnadelwaffe (Modell vor 1871)', acc: 'eine Zündnadelwaffe (Modell vor 1871)', law: ['freiAntik', 'waffenschein'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.7 (nur Erwerb und Besitz)' });
    else if (h === 'perkMehr') set({ key: 'perkMehr', cat: 'erlpfl', pen: 'p52_3_2a', label: 'Perkussionsrevolver / mehrläufiger Vorderlader', acc: 'einen Perkussionsrevolver bzw. mehrläufigen Vorderlader', law: ['freiAntik', 'erlPflicht', 'p52_3_2'], notes: ['Die Freistellung nach Nr. 1.5 erfasst nur einläufige Einzellader – Perkussionsrevolver sind erlaubnispflichtig.'] });
    else if (h === 'deko') set({ key: 'deko', cat: 'frei', f42a: 'anschein', label: 'Dekowaffe (unbrauchbar gemacht, EU-Bescheinigung)', acc: 'eine unbrauchbar gemachte Schusswaffe (Dekorationswaffe) mit dem Aussehen einer Feuerwaffe', law: ['dekoDef', 'anschein', 'freiFuehren'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 2b und 3.3', notes: ['Anzeigepflicht nach § 37d (Verstoß: § 53 Abs. 1 Nr. 8). Ohne EU-Deaktivierungsbescheinigung und Kennzeichnung gilt die Waffe nicht als unbrauchbar gemacht – dann wie die ursprüngliche Schusswaffe prüfen.'] });
    else set({ key: 'salut', cat: 'erlpfl', pen: 'p52_3_2a', label: 'Salutwaffe', acc: 'eine Salutwaffe (umgebaute Langwaffe für Kartuschenmunition)', law: ['salutDef', 'erlPflicht', 'p52_3_2'], notes: ['Bedürfnis u. a. für Theater, Film, Brauchtum (§ 39b); Kartuschenmunition dafür ist erlaubnisfrei.'] });
  } else if (s.obj === 'munition') {
    c.waffe = false; c.mun = true;
    const u = s.mun;
    if (u === 'patrone') set({ key: 'patrone', cat: 'erlpfl', pen: 'p52_3_2b', label: 'Patronenmunition für erlaubnispflichtige Schusswaffen', acc: 'Patronenmunition für erlaubnispflichtige Schusswaffen', law: ['munErl', 'erlPflicht', 'p52_3_2'] });
    else if (u === 'kartusche') set({ key: 'kartusche', cat: 'frei', label: 'Kartuschenmunition für SRS-Waffen', acc: 'Kartuschenmunition für zugelassene Schreckschuss-, Reizstoff- bzw. Signalwaffen', law: ['frei13'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.4' });
    else if (u === 'verboten') V('Anlage 2 Abschnitt 1 Nr. 1.5.3 bis 1.5.7', 'p52_3_1', 'Verbotene Munition', 'verbotene Munition (z. B. mit Hartkern-, Leuchtspur-, Brand- oder Sprenggeschossen)', ['v15', 'p52_3_1'], 'Panzerbrechende Munition, Munition mit Spreng-, Brand- oder Leuchtspursätzen, Hartkern- und Treibspiegelmunition u. a. sind verboten.');
    else if (u === 'reizGeschoss') set({ key: 'reizGeschoss', cat: 'verbotenOhne', label: 'Reizstoff-/Betäubungsgeschosse ohne Prüfzeichen', acc: 'Reizstoff- bzw. Betäubungsgeschosse ohne amtliches Prüfzeichen', vnr: 'Anlage 2 Abschnitt 1 Nr. 1.5.1 / 1.5.2', law: ['p52_3_1'] });
    else set({ key: 'kwMun', cat: 'kw', label: 'Munition für Kriegswaffen (Kriegswaffenliste)', acc: 'Munition für Kriegswaffen', law: ['kw57', 'kwDef', 'kw22a'] });
  } else if (s.obj === 'hieb') {
    const h = s.hieb;
    if (h === 'schlagstock') set({ key: 'schlagstock', cat: 'frei', f42a: 'hieb', label: 'Schlagstock (Hieb- und Stoßwaffe)', acc: 'einen Schlagstock', law: ['hieb', 'f42a'] });
    else if (h === 'teleskop') set({ key: 'teleskop', cat: 'frei', f42a: 'hieb', label: 'Teleskopschlagstock (Hieb- und Stoßwaffe)', acc: 'einen ausziehbaren Teleskopschlagstock', law: ['hieb', 'f42a'], notes: ['BGH, Beschl. v. 21.04.2022 – 3 StR 81/22: Hieb- und Stoßwaffe, aber kein verbotener Totschläger – § 52 Abs. 3 Nr. 1 greift nicht.'] });
    else if (h === 'blank') set({ key: 'blank', cat: 'frei', f42a: 'hieb', label: 'Dolch, Bajonett, Schwert, Säbel, Wurfmesser', acc: 'eine Blankwaffe (Dolch, Bajonett, Schwert, Säbel bzw. Wurfmesser)', law: ['hieb', 'f42a'] });
    else if (h === 'schlagring') V('Anlage 2 Abschnitt 1 Nr. 1.3.2', 'p52_3_1', 'Schlagring / Totschläger / Stahlrute', 'einen Schlagring bzw. Totschläger oder eine Stahlrute', ['v132', 'p52_3_1'], 'Stahlruten, Totschläger und Schlagringe sind verboten.');
    else if (h === 'nunchaku') V('Anlage 2 Abschnitt 1 Nr. 1.3.8', 'p52_3_1', 'Nun-Chaku / Würgeholz', 'ein Nun-Chaku', ['v138', 'p52_3_1'], 'Gegenstände, die zum Drosseln bestimmt sind (z. B. Nun-Chakus), sind verboten.');
    else if (h === 'wurfstern') V('Anlage 2 Abschnitt 1 Nr. 1.3.3', 'p52_3_1', 'Wurfstern', 'einen Wurfstern', ['v133', 'p52_3_1'], 'Wurfsterne sind verboten (Wurfmesser dagegen sind Hieb- und Stoßwaffen).');
    else V('Anlage 2 Abschnitt 1 Nr. 1.3.1', 'p52_3_1', 'Getarnte Hieb-/Stoßwaffe (z. B. Stockdegen)', 'eine getarnte Hieb- oder Stoßwaffe (z. B. Stockdegen)', ['v131', 'p52_3_1'], 'Hieb- oder Stoßwaffen, die einen anderen Gegenstand vortäuschen oder mit Alltagsgegenständen verkleidet sind, sind verboten.');
  } else if (s.obj === 'sonst') {
    const o = s.sonst;
    if (o === 'reizPtb') set({ key: 'reizPtb', cat: 'frei', minAge: 14, label: 'Reizstoffsprühgerät mit amtlichem Prüfzeichen', acc: 'ein Reizstoffsprühgerät mit amtlichem Prüfzeichen', law: ['reizDef', 'v135', 'jugendReiz'], frei: 'Anlage 2 Abschnitt 1 Nr. 1.3.5 (Ausnahme bei Zulassung und Prüfzeichen); keine Erlaubnispflicht' });
    else if (o === 'reizOhne') V('Anlage 2 Abschnitt 1 Nr. 1.3.5', 'p52_3_1', 'Reizstoffgerät ohne Prüfzeichen', 'ein Reizstoffsprühgerät ohne amtliches Prüfzeichen', ['reizDef', 'v135', 'p52_3_1'], 'Gegenstände mit Reizstoffen ohne amtliche Zulassung, Reichweiten-/Sprühdauerbegrenzung und Prüfzeichen sind verboten.');
    else if (o === 'tierSpray') set({ key: 'tierSpray', cat: 'nicht', waffe: false, minAge: 0, label: 'Tierabwehrspray (nur gegen Tiere bestimmt)', acc: 'ein ausschließlich zur Tierabwehr bestimmtes Abwehrspray', law: ['waffe', 'reizDef', 'v135'], notes: ['Keine Waffe nach § 1 Abs. 2 Nr. 2 Buchst. a, wenn es nach Aufmachung und Kennzeichnung allein gegen Tiere bestimmt ist. Ist es (auch) gegen Menschen bestimmt und fehlt das Prüfzeichen, ist es verboten (Nr. 1.3.5). Im Zweifel entscheidet das BKA (§ 2 Abs. 5).'] });
    else if (o === 'eigPtb') set({ key: 'eigPtb', cat: 'frei', label: 'Elektroimpulsgerät mit Prüfzeichen', acc: 'ein Elektroimpulsgerät mit amtlichem Prüfzeichen', law: ['eigDef', 'v136'], frei: 'Anlage 2 Abschnitt 1 Nr. 1.3.6 (Ausnahme bei Zulassung und Prüfzeichen); keine Erlaubnispflicht' });
    else if (o === 'eigOhne') V('Anlage 2 Abschnitt 1 Nr. 1.3.6', 'p52_3_1', 'Elektroimpulsgerät ohne Prüfzeichen', 'ein Elektroimpulsgerät ohne amtliches Prüfzeichen', ['eigDef', 'v136', 'p52_3_1'], 'Elektroimpulsgeräte ohne amtliche Zulassung und Prüfzeichen sind verboten.');
    else if (o === 'taser') V('Anlage 2 Abschnitt 1 Nr. 1.3.6', 'p52_3_1', 'Distanz-Elektroimpulsgerät (Taser)', 'ein Distanz-Elektroimpulsgerät (Taser)', ['v136', 'p52_3_1'], 'Distanz-Elektroimpulsgeräte sind ausnahmslos verboten – auch mit Prüfzeichen.');
    else if (o === 'tierEig') V('Anlage 2 Abschnitt 1 Nr. 1.4.4', 'p52_3_1', 'Elektroimpulsgerät gegen Tiere ohne Prüfzeichen', 'ein Elektroimpulsgerät gegen Tiere ohne amtliches Prüfzeichen', ['v144', 'p52_3_1'], 'Geräte, die Tieren mittels Elektroimpuls Verletzungen beibringen, sind ohne Prüfzeichen verboten – ausgenommen Geräte für Tierhaltung und Hundeausbildung (z. B. Viehtreiber).');
    else if (o === 'armbrust') set({ key: 'armbrust', cat: 'frei', schuss: true, label: 'Armbrust', acc: 'eine Armbrust', law: ['armbrustDef', 'freiFuehren'], frei: 'Anlage 2 Abschnitt 2 Unterabschnitt 2 Nr. 1.8 und 3.2 (Erwerb, Besitz und Führen)' });
    else if (o === 'schleuder') V('Anlage 2 Abschnitt 1 Nr. 1.3.7', 'p52_3_1', 'Präzisionsschleuder (mit Armstütze)', 'eine Präzisionsschleuder mit Armstütze', ['schleuderDef', 'v137', 'p52_3_1'], 'Schleudern mit Armstütze oder vergleichbarer Vorrichtung sowie die Armstützen selbst sind verboten.');
    else if (o === 'brand') V('Anlage 2 Abschnitt 1 Nr. 1.3.4', 'p52_1_1', 'Brand- oder Sprengvorrichtung (z. B. Molotow-Cocktail)', 'eine Brand- bzw. Sprengvorrichtung (z. B. Molotow-Cocktail)', ['v134', 'p52_1'], 'Gegenstände, mit denen schlagartig ein Brand oder eine Explosion ausgelöst werden kann, sind verboten; schon die Anleitung zur Herstellung ist strafbar (§ 40 Abs. 1, § 52 Abs. 1 Nr. 4). Daneben ggf. Sprengstoffgesetz.');
    else set({ key: 'bogen', cat: 'nicht', waffe: false, minAge: 0, label: 'Pfeilbogen, Blasrohr, Harpune', acc: 'einen Pfeilbogen, ein Blasrohr bzw. eine Harpune', law: ['schusswaffe', 'spiel'], notes: ['Pfeilbogen haben weder Lauf noch Sperrvorrichtung und sind keine Schusswaffen. Blasrohre sind bis auf § 42a ausgenommen (Anlage 2 Abschn. 3 UA 2 Nr. 2), Harpunengeräte bis auf § 2 Abs. 1 und § 41 (Abschn. 3 UA 1).'] });
  } else if (s.obj === 'anschein') {
    c.waffe = false; c.minAge = 0;
    if (s.anschein === 'softair') set({ key: 'softair', cat: 'ausgenommen', f42a: 'anschein', label: 'Softair bis 0,5 J (täuschend echt)', acc: 'eine Softair-Waffe bis 0,5 Joule im Aussehen einer Feuerwaffe (Anscheinswaffe)', law: ['anschein', 'spiel', 'f42a'] });
    else if (s.anschein === 'nachbildung') set({ key: 'nachbildung', cat: 'ausgenommen', f42a: 'anschein', label: 'Nachbildung / Attrappe einer Schusswaffe', acc: 'eine Nachbildung einer Schusswaffe (Anscheinswaffe)', law: ['nachbildung', 'anschein', 'f42a'] });
    else set({ key: 'spielzeug', cat: 'nicht', label: 'Erkennbares Spielzeug', acc: 'eine erkennbar als Spielzeug gestaltete Waffennachbildung', law: ['anschein'], notes: ['Keine Anscheinswaffe, wenn das Gesamterscheinungsbild erkennbar auf Spiel hindeutet – z. B. Größe ± 50 %, Neonfarben, keine Kennzeichnungen von Feuerwaffen (Anlage 1 Abschn. 1 UA 1 Nr. 1.6).'] });
  } else set({ key: 'kw', cat: 'kw', label: 'Kriegswaffe (Kriegswaffenliste)', acc: 'eine Kriegswaffe im Sinne der Kriegswaffenliste (z. B. Sturmgewehr, Maschinenpistole, Handgranate)', law: ['kw57', 'kwDef', 'kw22a'] });
  return c;
}

/** Analyse: liefert alle einschlägigen Prüfungen */
function wfAnalyze(st) {
  const s = st, c = wfClass(s), F = [], path = [], gen = [];
  let H = s.handlung;
  const note = t => gen.push(t);
  if (H === 'fuehren' && s.ort === 'eigen') { H = 'besitz'; note('In der eigenen Wohnung, den eigenen Geschäftsräumen und dem eigenen befriedeten Besitztum wird eine Waffe nicht „geführt“ (Anlage 1 Abschn. 2 Nr. 4) – geprüft wird der Besitz.'); }
  if (c.mun && H === 'fuehren') { H = 'besitz'; note('Munition wird nicht „geführt“ – das Mitführen ist Besitz (Ausübung der tatsächlichen Gewalt).'); }
  if (c.mun && H === 'schiessen') H = 'besitz';
  const HV = WF_H[H];
  path.push(c.label, WF_CAT[c.cat], HV.label + (H === 'fuehren' ? ` · ${WF_ORT_LABEL[s.ort]}` : ''));
  const ex = (t) => path.push(t);
  const fahrl = s.vorsatz === 'fahrl';
  const zugriffsbereit = s.zugriff === 'zugriff';
  const tbObj = (m) => ({ m: m || 'Tatobjekt', s: `${c.label}${c.vnr ? ' – ' + c.vnr : ''}`, law: c.law.slice(0, 3), v: 'ja' });
  const tbAct = (verb) => ({ m: 'Tathandlung: ' + (verb || HV.verb), s: wfActPhrase(s, H), law: [WF_H[H].law], v: 'ja' });
  const add = (level, title, o = {}) => { F.push({ level, title, pen: o.pen || null, reason: o.reason || '', tb: o.tb || [], hints: o.hints || [], law: o.law || [], key: o.key || title }); };
  const crime = (penKey, title, reason, tb, hints = [], law = []) => { const p = WF_PEN[penKey]; add('straftat', title, { pen: p, reason, tb, hints, law: [...law, ...p.law] }); };
  const owi = (nr, lawKey, title, reason, tb, hints = [], law = []) => { const p = wfOwi(nr, [lawKey]); add('owi', title, { pen: p, reason, tb, hints, law: [...law, ...p.law] }); };
  const ok = (title, reason, law = [], hints = []) => add('erlaubt', title, { reason, law, hints });
  const hint = (title, reason, law = [], hints = []) => add('hinweis', title, { reason, law, hints });

  /* ---------- Kriegswaffen: allein KrWaffKontrG ---------- */
  if (c.cat === 'kw') {
    ex('§ 57 Abs. 1 WaffG → KrWaffKontrG');
    if (s.ausnahme) ok('Genehmigung nach dem KrWaffKontrG', 'Mit Genehmigung (§§ 2 ff. KrWaffKontrG) ist der Umgang erlaubt.', ['kw22a']);
    else {
      const nr = { besitz: 'Nr. 6 (tatsächliche Gewalt ohne Genehmigung)', erwerb: 'Nr. 2 (Erwerb der tatsächlichen Gewalt)', ueberlassen: 'Nr. 2 (Überlassen)', fuehren: 'Nr. 3 und 6 (Befördern außerhalb eines abgeschlossenen Geländes, tatsächliche Gewalt)', herstellen: 'Nr. 1 (Herstellen)', verbringen: 'Nr. 4 (Ein-, Aus-, Durchfuhr)', handel: 'Nr. 2 bzw. 7 (Überlassen, Vermitteln)', schiessen: 'Nr. 6 (tatsächliche Gewalt)', aufbewahrung: 'Nr. 6 (tatsächliche Gewalt)' }[H];
      crime('kw', 'Unerlaubter Umgang mit Kriegswaffen', `Das WaffG gilt für Kriegswaffen nicht (§ 57 Abs. 1). Strafbar nach § 22a Abs. 1 ${nr} KrWaffKontrG.`,
        [tbObj('Tatobjekt: Kriegswaffe'), tbAct(), { m: 'Ohne Genehmigung nach dem KrWaffKontrG', s: 'Keine Genehmigung angegeben', law: ['kw22a'], v: 'ja' }],
        ['Bei freiwilliger, unverzüglicher Ablieferung entfällt die Strafe nach § 22a Abs. 1 Nr. 3 und 4 (§ 22a Abs. 5).']);
    }
    return wfFinish(s, c, H, F, path, gen);
  }

  /* ---------- Verbotene Gegenstände (§ 2 Abs. 3, Anlage 2 Abschn. 1) ---------- */
  if (c.cat === 'verboten') {
    ex('Anlage 2 Abschn. 1 → § 2 Abs. 3: Umgang verboten');
    if (s.ausnahme) ok('Ausnahme vom Verbot', 'Behördlicher Auftrag (§ 40 Abs. 2) oder Ausnahme des BKA (§ 40 Abs. 4) liegt vor.', ['bka40']);
    else if (s.fund && (H === 'besitz' || H === 'erwerb' || H === 'aufbewahrung')) hint('Inbesitznahme als Erbe oder Finder', 'Unverzügliche Anzeige vorausgesetzt, wird das Verbot nicht wirksam, solange die behördliche Frist läuft (§ 40 Abs. 5). Danach: Unbrauchbarmachung, Abgabe oder Antrag beim BKA.', ['fund40']);
    else crime(c.pen, `Umgang mit verbotener Waffe: ${c.label}`, c.why,
      [tbObj('Tatobjekt: verbotener Gegenstand'), tbAct(H === 'schiessen' ? 'besitzt (und schießt)' : H === 'aufbewahrung' ? 'besitzt' : undefined),
        { m: 'Entgegen § 2 Abs. 3 – keine Ausnahme', s: 'Kein behördlicher Auftrag (§ 40 Abs. 2), keine BKA-Ausnahme (§ 40 Abs. 4), keine laufende Frist nach Fund oder Erbe (§ 40 Abs. 5)', law: ['bka40', 'fund40'], v: 'ja' }],
      c.pen === 'p51' ? ['§ 51 ist ein Verbrechen: Versuch stets strafbar (§ 23 Abs. 1 StGB).'] : []);
  }
  if (c.cat === 'verbotenOhne') hint('Verbotene Munition ohne Sanktionsnorm', `${c.vnr}: Der Umgang ist verboten (§ 2 Abs. 3), § 52 Abs. 3 Nr. 1 erfasst aber nur Nr. 1.5.3 bis 1.5.7 und § 53 enthält keinen Bußgeldtatbestand. Sicherstellung und Einziehung nach Gefahrenabwehrrecht prüfen.`, ['p52_3_1']);

  /* ---------- Erlaubnispflichtige Schusswaffen und Munition ---------- */
  const jagdLang = s.erlaubnis === 'jagd' && (c.key === 'lang' || c.key === 'patrone');
  const besitzErl = s.erlaubnis === 'wbk' || s.erlaubnis === 'waffenschein' || jagdLang || s.ausnahme;
  const fuehrErl = s.erlaubnis === 'waffenschein' || (s.erlaubnis === 'jagd' && s.jagdZweck && c.schuss) || s.ausnahme;
  const besitzTb = () => [tbObj('Tatobjekt: erlaubnispflichtige ' + (c.mun ? 'Munition' : 'Schusswaffe')), tbAct(),
    { m: 'Ohne Erlaubnis', s: s.erlaubnis === 'keine' ? 'Keine WBK, kein Munitionserwerbsschein, keine Ausnahme nach § 12' : 'Die vorhandene Erlaubnis deckt diesen Umgang nicht', law: [c.mun ? 'munErl' : 'wbk', 'ausn12'], v: 'ja' }];
  const besitzCrime = (extra) => crime(c.pen, `${extra || (H === 'erwerb' ? 'Erwerb' : 'Besitz')} ohne Erlaubnis: ${c.label}`,
    c.key === 'kurzHalb' || (c.key === 'teil' && s.teilHalb) ? 'Halbautomatische Kurzwaffen sind in § 52 Abs. 1 Nr. 2 Buchst. b besonders erfasst (6 Monate bis 5 Jahre).' : 'Der Umgang mit erlaubnispflichtigen Schusswaffen und Munition bedarf der Erlaubnis (§ 2 Abs. 2 i. V. m. Anlage 2 Abschn. 2 UA 1).',
    besitzTb(), c.notes || []);
  if (c.cat === 'erlpfl') {
    ex('Anlage 2 Abschn. 2 UA 1 → § 2 Abs. 2: Erlaubnis nötig');
    if (H === 'besitz' || H === 'erwerb') {
      if (besitzErl) ok(`${HV.label} mit Erlaubnis`, jagdLang ? 'Jahresjagdscheininhaber erwerben Langwaffen ohne Erlaubnis (§ 13 Abs. 3) – WBK binnen zwei Wochen beantragen (sonst § 53 Abs. 1 Nr. 7). Munition für Langwaffen: § 13 Abs. 5.' : 'Die Waffenbesitzkarte bzw. Munitionserlaubnis deckt Erwerb und Besitz (§ 10 Abs. 1, 3).', ['wbk', 'munErl']);
      else if (s.fund) hint('Inbesitznahme als Erbe oder Finder', 'Erbe/Finder müssen die Inbesitznahme unverzüglich anzeigen (§ 37c Abs. 1); die Behörde kann sicherstellen oder Fristen setzen. Bei unverzüglicher Anzeige und Abgabe fehlt es regelmäßig am Vorsatz eines unerlaubten Besitzes – Einzelfall.', ['fund37c']);
      else besitzCrime();
    } else if (H === 'fuehren') {
      const transport = !zugriffsbereit && !s.geladen;
      if (s.ort === 'fremd' && besitzErl) ok('Führen in fremdem Hausrechtsbereich (§ 12 Abs. 3 Nr. 1)', 'Mit Zustimmung des Berechtigten in dessen Wohnung, Geschäftsräumen, befriedetem Besitztum oder Schießstätte zu einem vom Bedürfnis umfassten Zweck – keine Führerlaubnis nötig.', ['fremd']);
      else if (transport && besitzErl) ok('Erlaubnisfreier Transport (§ 12 Abs. 3 Nr. 2)', 'Nicht schussbereit und nicht zugriffsbereit befördert – zu einem vom Bedürfnis umfassten Zweck (z. B. Schießstätte, Büchsenmacher, Jagd). Nicht zugriffsbereit ist die Schusswaffe jedenfalls im verschlossenen Behältnis (Anlage 1 Abschn. 2 Nr. 13).', ['transport', 'zugriffsbereit', 'schussbereit'], s.zugriff === 'nicht' ? ['Sicher „nicht zugriffsbereit“ ist eine Schusswaffe nur im verschlossenen Behältnis.'] : []);
      else if (fuehrErl) ok(s.erlaubnis === 'jagd' ? 'Führen zur Jagd (§ 13 Abs. 6)' : 'Führen mit Waffenschein', s.erlaubnis === 'jagd' ? 'Jäger dürfen Jagdwaffen zur befugten Jagdausübung, zum Jagd- und Forstschutz ohne Erlaubnis führen.' : 'Der Waffenschein erlaubt das Führen (§ 10 Abs. 4).', [s.erlaubnis === 'jagd' ? 'jagd' : 'waffenschein', 'ausweis38'], ['Ausweis und Waffenschein (bzw. Jagdschein) sind mitzuführen und auf Verlangen auszuhändigen (§ 38; Verstoß: § 53 Abs. 1 Nr. 20).']);
      else if (!besitzErl) besitzCrime('Besitz und Führen');
      else crime(c.pen, `Führen ohne Waffenschein: ${c.label}`, 'Die WBK erlaubt nur Erwerb und Besitz. Wer die Waffe zugriffsbereit oder schussbereit außerhalb der eigenen Räume bei sich hat, führt sie und braucht einen Waffenschein (§ 10 Abs. 4).',
        [tbObj('Tatobjekt: erlaubnispflichtige Schusswaffe'), tbAct('führt'), { m: 'Ohne Erlaubnis zum Führen', s: 'WBK vorhanden, aber kein Waffenschein; ' + (s.geladen ? 'schussbereit' : 'zugriffsbereit') + ' – Transportprivileg (§ 12 Abs. 3 Nr. 2) greift nicht', law: ['waffenschein', 'transport', 'zugriffsbereit'], v: 'ja' }],
        ['Besitz bleibt erlaubt; strafbar ist allein das Führen.']);
    } else if (H === 'ueberlassen') {
      if (!besitzErl) besitzCrime('Besitz (vor dem Überlassen)');
      if (!s.empfBer) crime('p52_3_7', 'Überlassen an Nichtberechtigten', 'Waffen und Munition dürfen nur berechtigten Personen überlassen werden; die Berechtigung muss offensichtlich sein oder nachgewiesen werden (§ 34 Abs. 1).',
        [tbObj('Tatobjekt: erlaubnispflichtige ' + (c.mun ? 'Munition' : 'Schusswaffe')), tbAct('überlässt'), { m: 'Empfänger nicht berechtigt', s: 'Empfänger hat keine passende Erlaubnis', law: ['ueberl34'], v: 'ja' }],
        ['Wer eine erlaubnispflichtige Schusswaffe erwirbt, um sie einem Nichtberechtigten zu überlassen, macht sich nach § 52 Abs. 1 Nr. 2 Buchst. a strafbar (6 Monate bis 5 Jahre).']);
      else ok('Überlassen an Berechtigten', 'Zulässig, wenn die Berechtigung offensichtlich ist oder nachgewiesen wird (§ 34 Abs. 1). Überlassen ist binnen zwei Wochen anzuzeigen (§ 37a; Verstoß: § 53 Abs. 1 Nr. 8).', ['ueberl34']);
    } else if (H === 'schiessen') {
      if (!besitzErl) besitzCrime();
      wfShoot(s, c, ok, owi, hint);
      if (s.schussOrt === 'sonst' && !fuehrErl && besitzErl) crime(c.pen, `Führen ohne Waffenschein: ${c.label}`, 'Wer außerhalb der eigenen Räume schießt, führt die Waffe zugleich zugriffs- und schussbereit.', [tbObj(), tbAct('führt'), { m: 'Ohne Erlaubnis zum Führen', s: 'Kein Waffenschein', law: ['waffenschein'], v: 'ja' }]);
    } else if (H === 'verbringen') {
      if (s.grenze === 'dritt') hint('Verbringen in einen Drittstaat', 'Waffenrechtlich erlaubnisfrei (Anlage 2 Abschn. 2 UA 2 Nr. 8). Außenwirtschaftsrecht bleibt unberührt – Ausfuhr ohne Genehmigung nach VO (EU) 258/2012: § 53 Abs. 1a WaffG, daneben AWG.', ['verbringen']);
      else if (s.grenzErl || s.ausnahme) ok('Verbringen mit Erlaubnis', s.grenze === 'rein' ? 'Erlaubnis nach § 29 bzw. § 32 (Europäischer Feuerwaffenpass) liegt vor; Dokumente mitführen (§ 38).' : 'Erlaubnis nach § 29 Abs. 1 bzw. § 32 Abs. 1a liegt vor.', ['verbringen', 'mitnehmen']);
      else if (s.grenze === 'rein') crime('p52_1_2d', 'Verbringen/Mitnehmen nach Deutschland ohne Erlaubnis', 'Das Verbringen oder Mitnehmen einer erlaubnispflichtigen Schusswaffe oder Munition in oder durch den Geltungsbereich des Gesetzes bedarf der Erlaubnis (§§ 29, 32).', [tbObj(), tbAct('verbringt bzw. nimmt mit'), { m: 'Ohne Erlaubnis nach § 29 Abs. 1 bzw. § 32 Abs. 1', s: 'Keine Erlaubnis', law: ['verbringen', 'mitnehmen'], v: 'ja' }]);
      else crime('p52_3_4', 'Verbringen/Mitnehmen in einen anderen Mitgliedstaat ohne Erlaubnis', 'Für das Verbringen bzw. Mitnehmen aus Deutschland in einen anderen EU-/Schengen-Staat ist eine Erlaubnis nötig (§ 29 Abs. 1, § 32 Abs. 1a).', [tbObj(), tbAct('verbringt bzw. nimmt mit'), { m: 'Ohne Erlaubnis', s: 'Keine Erlaubnis', law: ['verbringen', 'mitnehmen'], v: 'ja' }]);
    } else if (H === 'herstellen' || H === 'handel') {
      if (c.key === 'patrone' && H === 'herstellen' && !s.gewerbe) ok('Nichtgewerbsmäßiges Laden von Munition', 'Waffenrechtlich erlaubnisfrei (Anlage 2 Abschn. 2 UA 2 Nr. 6.1) – erforderlich ist aber die sprengstoffrechtliche Erlaubnis (§ 27 SprengG).', ['herstellen']);
      else if (s.herstErl || s.ausnahme) ok(H === 'handel' ? 'Waffenhandel mit Erlaubnis' : 'Herstellung mit Erlaubnis', H === 'handel' || s.gewerbe ? 'Erlaubnis nach § 21 liegt vor.' : 'Erlaubnis nach § 26 liegt vor.', [H === 'handel' ? 'handel' : 'herstellen']);
      else if (H === 'handel' || s.gewerbe) crime('p52_1_2c', H === 'handel' ? 'Waffenhandel ohne Erlaubnis' : 'Gewerbsmäßige Herstellung ohne Erlaubnis', 'Gewerbsmäßige Herstellung, Bearbeitung, Instandsetzung und Waffenhandel bedürfen der Erlaubnis nach § 21.', [tbObj(), tbAct(H === 'handel' ? 'treibt Waffenhandel' : 'stellt gewerbsmäßig her bzw. bearbeitet'), { m: 'Ohne Erlaubnis nach § 21', s: 'Keine Erlaubnis', law: [H === 'handel' ? 'handel' : 'herstellen', 'bearbeiten'], v: 'ja' }]);
      else crime('p52_3_3', 'Nichtgewerbsmäßige Herstellung ohne Erlaubnis', 'Auch die private Herstellung, Bearbeitung (z. B. Umbau, Verkürzen) oder Instandsetzung einer Schusswaffe bedarf der Erlaubnis (§ 26).', [tbObj(), tbAct('stellt her bzw. bearbeitet'), { m: 'Ohne Erlaubnis nach § 26', s: 'Keine Erlaubnis', law: ['herstellen', 'bearbeiten'], v: 'ja' }]);
    } else if (H === 'aufbewahrung') {
      if (!besitzErl) besitzCrime();
      if (s.gefahr) crime('p52_3_7a', 'Verletzung der Aufbewahrungspflicht mit Gefahr', 'Wer die nach § 36 i. V. m. der AWaffV vorgeschriebenen Vorkehrungen nicht trifft und dadurch die Gefahr verursacht, dass eine Schusswaffe oder Munition abhandenkommt oder Unbefugte darauf zugreifen, macht sich strafbar.',
        [tbObj(), { m: 'Vorkehrung nach § 36 Abs. 1 i. V. m. AWaffV nicht getroffen', s: 'z. B. nicht im zertifizierten Sicherheitsbehältnis', law: ['aufbew'], v: 'ja' }, { m: 'Dadurch konkrete Gefahr des Abhandenkommens oder unbefugten Zugriffs', s: 'laut Angabe', law: ['p52_3_7'], v: 'ja' }], ['Fahrlässige Begehung ist bei Nr. 7a nicht strafbar (§ 52 Abs. 4 nennt Nr. 7a nicht).']);
      else hint('Aufbewahrung ohne konkrete Gefahr', 'Ohne verursachte Gefahr keine Straftat nach § 52 Abs. 3 Nr. 7a. Die Behörde kann Anordnungen treffen (§ 36 Abs. 6); ein Verstoß dagegen ist ordnungswidrig (§ 53 Abs. 1 Nr. 4). Zuverlässigkeit (§ 5) prüfen.', ['aufbew']);
    }
  }

  /* ---------- Erlaubnisfreie Waffen ---------- */
  if (c.cat === 'frei') {
    ex(c.frei ? 'erlaubnisfrei: ' + c.frei : 'keine Erlaubnispflicht');
    if (H === 'fuehren' && c.fuehrErl) {
      const licensed = c.fuehrErl === 'kws' ? (s.kws || s.erlaubnis === 'waffenschein') : s.erlaubnis === 'waffenschein';
      const transport = !zugriffsbereit && !s.geladen;
      const lab = c.fuehrErl === 'kws' ? 'kleinen Waffenschein' : 'Waffenschein';
      const labDat = c.fuehrErl === 'kws' ? 'kleinem Waffenschein' : 'Waffenschein';
      if (s.ort === 'fremd') ok('Führen in fremdem Hausrechtsbereich (§ 12 Abs. 3 Nr. 1)', 'Mit Zustimmung des Inhabers in dessen Wohnung, Geschäftsräumen, befriedetem Besitztum oder Schießstätte keine Führerlaubnis nötig.', ['fremd']);
      else if (transport) ok('Erlaubnisfreier Transport (§ 12 Abs. 3 Nr. 2)', 'Nicht schuss- und nicht zugriffsbereit von Ort zu Ort befördert (z. B. vom Händler nach Hause, zur Schießstätte) – keine Führerlaubnis nötig.', ['transport', 'zugriffsbereit'], ['Sicher „nicht zugriffsbereit“ ist die Waffe im verschlossenen Behältnis.']);
      else if (licensed) ok(`Führen mit ${labDat}`, c.fuehrErl === 'kws' ? 'Der kleine Waffenschein erlaubt das Führen zugelassener SRS-Waffen (§ 10 Abs. 4 Satz 4).' : 'Der Waffenschein erlaubt das Führen (§ 10 Abs. 4).', ['waffenschein', 'ausweis38'], ['Ausweis und Waffenschein mitführen und auf Verlangen aushändigen (§ 38; Verstoß: § 53 Abs. 1 Nr. 20). Das Schießen ist damit nicht erlaubt.']);
      else crime('p52_3_2a', `Führen ohne ${lab}: ${c.label}`, c.fuehrErl === 'kws' ? 'SRS-Waffen sind nur für Erwerb und Besitz freigestellt. Wer sie zugriffsbereit außerhalb der eigenen Räume bei sich hat, führt eine Schusswaffe ohne die nach § 10 Abs. 4 Satz 4 nötige Erlaubnis – Straftat, keine bloße Ordnungswidrigkeit.' : 'Die Freistellung umfasst nur Erwerb und Besitz (Anlage 2 Abschn. 2 UA 2 Nr. 1); zum Führen bedarf es eines Waffenscheins.',
        [tbObj('Tatobjekt: Schusswaffe'), tbAct('führt'), { m: `Ohne Erlaubnis zum Führen (${lab})`, s: `kein ${lab}; ${s.geladen ? 'schussbereit' : 'zugriffsbereit'} – Transportprivileg greift nicht`, law: ['waffenschein', 'kwsDef', 'zugriffsbereit', 'transport'], v: 'ja' }],
        ['Alternative: Transport nicht schuss- und nicht zugriffsbereit, z. B. im verschlossenen Behältnis (§ 12 Abs. 3 Nr. 2).']);
    } else if (H === 'schiessen' && c.schuss) {
      wfShoot(s, c, ok, owi, hint);
      if (s.schussOrt === 'sonst' && c.fuehrErl && !(c.fuehrErl === 'kws' ? (s.kws || s.erlaubnis === 'waffenschein') : s.erlaubnis === 'waffenschein')) crime('p52_3_2a', `Führen ohne ${c.fuehrErl === 'kws' ? 'kleinen ' : ''}Waffenschein`, 'Wer außerhalb der eigenen Räume schießt, führt die Waffe zugleich zugriffs- und schussbereit.', [tbObj(), tbAct('führt'), { m: 'Ohne Erlaubnis zum Führen', s: 'keine Führerlaubnis', law: ['waffenschein', 'kwsDef'], v: 'ja' }]);
    } else if (H === 'ueberlassen') {
      if (!s.empfBer) owi(16, 'p53_16', 'Überlassen an Nichtberechtigten', 'Auch erlaubnisfreie Waffen dürfen nur Berechtigten überlassen werden – etwa nicht an Personen unter 18 (bei Reizstoffsprühgeräten unter 14) oder bei Waffenbesitzverbot (§ 34 Abs. 1).', [tbObj('Tatobjekt: nicht erlaubnispflichtige Waffe'), tbAct('überlässt'), { m: 'Empfänger nicht berechtigt', s: 'laut Angabe', law: ['ueberl34', 'alter'], v: 'ja' }]);
      else ok('Überlassen an Berechtigten', 'Zulässig (§ 34 Abs. 1).', ['ueberl34']);
    } else if ((H === 'herstellen' || H === 'handel') && c.schuss) {
      const frei = c.key === 'lunte' || c.key === 'armbrust' || (H === 'handel' && ['perk', 'zuend', 'deko'].includes(c.key));
      if (frei) ok(H === 'handel' ? 'Erlaubnisfreier Handel' : 'Erlaubnisfreie Herstellung', 'Anlage 2 Abschn. 2 UA 2 Nr. 4 bzw. 5.', [H === 'handel' ? 'handel' : 'herstellen']);
      else if (s.herstErl || s.ausnahme) ok('Mit Erlaubnis nach § 21 bzw. § 26', 'Erlaubnis liegt vor.', ['handel']);
      else if (H === 'handel' || s.gewerbe) crime('p52_1_2c', H === 'handel' ? 'Waffenhandel ohne Erlaubnis' : 'Gewerbsmäßige Herstellung ohne Erlaubnis', 'Auch SRS- und Druckluftwaffen sind Schusswaffen; nur Erwerb und Besitz sind freigestellt, Handel und Herstellung nicht (§ 21).', [tbObj('Tatobjekt: Schusswaffe'), tbAct(), { m: 'Ohne Erlaubnis nach § 21', s: 'Keine Erlaubnis', law: ['handel', 'herstellen'], v: 'ja' }]);
      else crime('p52_3_3', 'Nichtgewerbsmäßige Herstellung ohne Erlaubnis', 'Herstellung, Bearbeitung und Instandsetzung von Schusswaffen bedürfen der Erlaubnis nach § 26, soweit nicht freigestellt.', [tbObj('Tatobjekt: Schusswaffe'), tbAct('stellt her bzw. bearbeitet'), { m: 'Ohne Erlaubnis nach § 26', s: 'Keine Erlaubnis', law: ['herstellen', 'bearbeiten'], v: 'ja' }]);
    } else if (H === 'aufbewahrung') hint('Aufbewahrung erlaubnisfreier Waffen', 'Es gilt § 36 Abs. 1 (erforderliche Vorkehrungen gegen Abhandenkommen und unbefugten Zugriff, besonders gegenüber Kindern). Eine Straftat nach § 52 Abs. 3 Nr. 7a scheidet regelmäßig aus.', ['aufbew']);
  }
  /* Alter (§ 2 Abs. 1, § 3) */
  if (c.cat === 'frei' && c.minAge && ['besitz', 'erwerb', 'fuehren', 'schiessen', 'verbringen', 'aufbewahrung'].includes(H)) {
    const age = { erw: 18, jug: 14, kind: 0 }[s.alter];
    if (age < c.minAge && !s.ausnahme) owi(1, 'p53_1', 'Umgang unter der Altersgrenze', c.minAge === 14 ? 'Geprüfte Reizstoffsprühgeräte sind ab 14 erlaubt (§ 3 Abs. 2) – darunter nicht.' : 'Der Umgang mit Waffen ist erst ab 18 gestattet (§ 2 Abs. 1). Ausnahmen: Ausbildung oder Arbeit unter Aufsicht (§ 3 Abs. 1), behördliche Ausnahme (§ 3 Abs. 3).',
      [tbObj('Tatobjekt: nicht erlaubnispflichtige Waffe'), { m: 'Tathandlung: erwirbt oder besitzt', s: wfActPhrase(s, H), law: ['erwerb', 'besitz'], v: 'ja' }, { m: 'Entgegen § 2 Abs. 1: Person unter ' + c.minAge, s: s.alter === 'kind' ? 'Kind (unter 14)' : 'Jugendlicher (14 bis 17)', law: ['alter', 'jugendReiz', 'kinderJug'], v: 'ja' }]);
  }
  /* Waffenverbot im Einzelfall (§ 41) */
  if (s.verbot41 && (c.cat === 'frei' || c.cat === 'erlpfl') && ['besitz', 'erwerb', 'fuehren', 'schiessen', 'aufbewahrung'].includes(H)) crime('p52_3_8', 'Verstoß gegen ein Waffenverbot (§ 41)', 'Einer vollziehbaren Untersagung von Erwerb und Besitz zuwidergehandelt.', [tbObj(), tbAct(), { m: 'Vollziehbare Anordnung nach § 41 Abs. 1 oder 2', s: 'laut Angabe', law: ['verbot41'], v: 'ja' }]);

  /* ---------- Führen: § 42a und Orte (§ 42, § 42b, Verbotszonen) ---------- */
  if (H === 'fuehren') {
    const locked = s.zugriff === 'behaeltnis', nichtZug = s.zugriff !== 'zugriff';
    if (c.f42a) {
      const art = { anschein: 'Anscheinswaffe (Nr. 1)', hieb: 'Hieb- und Stoßwaffe (Nr. 2)', messer: c.key === 'feststehend' ? 'feststehendes Messer mit Klinge über 12 cm (Nr. 3)' : 'Messer mit einhändig feststellbarer Klinge (Nr. 3)' }[c.f42a];
      const ber = c.f42a !== 'anschein' && WF_ZWECK_42A.has(s.zweck);
      if (locked) ok('§ 42a: Transport im verschlossenen Behältnis', 'Das Führverbot gilt nicht für den Transport in einem verschlossenen Behältnis (§ 42a Abs. 2 Nr. 2).', ['f42a']);
      else if (s.zweck === 'film') ok('§ 42a: Foto, Film, Theater', 'Ausnahme nach § 42a Abs. 2 Nr. 1.', ['f42a']);
      else if (ber) ok('§ 42a: berechtigtes Interesse', `Berechtigtes Interesse (§ 42a Abs. 2 Nr. 3, Abs. 3): ${WF_ZWECK_LABEL[s.zweck]}.`, ['f42a'], ['Das Interesse muss konkret und nachvollziehbar sein; der Zusammenhang zwischen Gegenstand und Zweck ist darzulegen.']);
      else owi('21b', 'p53_21', `Führverbot § 42a: ${art}`, c.f42a === 'anschein' ? 'Anscheinswaffen dürfen nicht geführt werden; ein berechtigtes Interesse hilft hier nicht (§ 42a Abs. 2 Nr. 3 gilt nur für Nr. 2 und 3).' : 'Kein verschlossenes Behältnis, kein berechtigtes Interesse und kein Fall von Foto, Film oder Theater.',
        [tbObj('Tatobjekt: ' + art), tbAct('führt'), { m: 'Keine Ausnahme nach § 42a Abs. 2', s: (s.zugriff === 'nicht' ? 'nicht zugriffsbereit, aber nicht im verschlossenen Behältnis; ' : '') + 'kein berechtigtes Interesse', law: ['f42a'], v: 'ja' }],
        s.zugriff === 'nicht' ? ['Die Drei-Handgriffe-Regel gilt für § 42 Abs. 4a und § 42b – bei § 42a hilft nur das verschlossene Behältnis.'] : []);
    }
    const isWaffe = c.waffe && c.cat !== 'ausgenommen' && c.cat !== 'nicht';
    const isMesser = c.messer && !isWaffe;
    const erlInh = s.erlaubnis === 'wbk' || s.erlaubnis === 'waffenschein' || s.erlaubnis === 'jagd';
    const messerAusn = nichtZug ? 'nicht zugriffsbereit befördert (Nr. 3)' : WF_ZWECK_4A.has(s.zweck) ? WF_ZWECK_LABEL[s.zweck] : null;
    if (s.ort === 'veranstaltung') {
      if (isWaffe) {
        if (s.ausnahme) ok('§ 42: behördliche Ausnahme', 'Ausnahme nach § 42 Abs. 2 liegt vor; Bescheid mitführen (§ 42 Abs. 3).', ['veranst']);
        else if (c.key === 'deko') hint('§ 42: Dekowaffe bei öffentlicher Veranstaltung', 'Unbrauchbar gemachte Schusswaffen stehen systematisch bei den Schusswaffen (Anlage 1 Abschn. 1 UA 1 Nr. 1.4); ob sie „Waffen“ i. S. d. § 42 Abs. 1 sind (dann § 52 Abs. 3 Nr. 9), ist nicht abschließend geklärt. Das Führverbot für Anscheinswaffen (§ 42a) gilt jedenfalls.', ['veranst', 'dekoDef']);
        else crime('p52_3_9', 'Führen einer Waffe bei öffentlicher Veranstaltung', 'Wer an einer öffentlichen Veranstaltung teilnimmt, darf keine Waffen i. S. d. § 1 Abs. 2 führen. Ein Waffenschein, ein kleiner Waffenschein oder der verschlossene Transport ändern daran nichts.',
          [tbObj('Tatobjekt: Waffe i. S. d. § 1 Abs. 2'), tbAct('führt'), { m: 'Teilnahme an einer öffentlichen Veranstaltung', s: 'Volksfest, Markt, Messe, Sportveranstaltung, Kino, Theater, Disko, Tanz u. ä.', law: ['veranst'], v: 'ja' }, { m: 'Keine Ausnahme (§ 42 Abs. 2, 4)', s: s.zweck === 'film' ? 'Ausnahme gilt nur für Mitwirkende an Theateraufführungen mit ungeladenen oder Kartuschenwaffen – prüfen' : 'keine', law: ['veranstAusn'], v: s.zweck === 'film' ? 'offen' : 'ja' }],
          ['Tatbestandsmerkmal „teilnimmt“: Wer die Veranstaltung nur durchquert, ohne teilzunehmen, ist umstritten – Einzelfall.']);
      } else if (isMesser) {
        if (messerAusn) ok('§ 42 Abs. 4a: Ausnahme vom Messerverbot', `Ausnahme: ${messerAusn}.`, ['messer4a']);
        else owi('21a', 'p53_21', 'Messer bei öffentlicher Veranstaltung', 'Seit 31.10.2024 gilt das Führverbot bei öffentlichen Veranstaltungen auch für Messer jeder Art (§ 42 Abs. 4a) – keine der zehn Ausnahmen liegt vor.', [tbObj('Tatobjekt: Messer'), tbAct('führt'), { m: 'Teilnahme an einer öffentlichen Veranstaltung', s: 'laut Angabe', law: ['veranst'], v: 'ja' }, { m: 'Keine Ausnahme nach § 42 Abs. 4a Satz 2', s: 'zugriffsbereit, kein anerkannter Zweck', law: ['messer4a', 'zugriffsbereit'], v: 'ja' }]);
      }
    } else if (s.ort === 'fernverkehr' || s.ort === 'zone') {
      const fern = s.ort === 'fernverkehr';
      const waffeAusn = erlInh ? 'Inhaber einer waffenrechtlichen Erlaubnis (außer kleiner Waffenschein)' : nichtZug ? 'nicht zugriffsbereit befördert' : s.zweck === 'rettung' ? 'Rettungs-/Einsatzkräfte' : s.zweck === 'hausrecht' ? 'Zustimmung des Hausrechtsinhabers' : null;
      const mAusn = messerAusn || (s.zweck === 'hausrecht' ? 'Zustimmung des Hausrechtsinhabers' : null);
      const viaMesser = isWaffe && !waffeAusn && c.messer && mAusn;
      const ausn = isWaffe ? (waffeAusn || (viaMesser ? mAusn : null)) : isMesser ? mAusn : null;
      if (isWaffe || isMesser) {
        if (ausn) ok(fern ? '§ 42b: Ausnahme' : 'Verbotszone: Ausnahme (regelmäßig berechtigtes Interesse)', `Ausnahme: ${ausn}.`, [fern ? 'f42b' : 'zoneAusn'], viaMesser ? ['Der Gegenstand ist Waffe und Messer zugleich. Ob die Messer-Ausnahmen (§ 42 Abs. 4a Satz 2) auch für ihn gelten, ist nicht geklärt – hier zugunsten der Person angenommen.'] : []);
        else if (fern) owi('21c', 'p53_21', `${isWaffe ? 'Waffe' : 'Messer'} im öffentlichen Personenfernverkehr`, 'In Fernzügen, Fernbussen und seitlich umschlossenen Einrichtungen des Fernverkehrs (Bahnhofsgebäude, Haltepunkte) gilt ein Führverbot für Waffen und Messer (§ 42b Abs. 1).',
          [tbObj(isWaffe ? 'Tatobjekt: Waffe i. S. d. § 1 Abs. 2' : 'Tatobjekt: Messer'), tbAct('führt'), { m: 'In Verkehrsmitteln/umschlossenen Einrichtungen des Personenfernverkehrs', s: 'laut Angabe', law: ['f42b'], v: 'ja' }, { m: 'Keine Ausnahme nach § 42b Abs. 1 Satz 2', s: isWaffe ? 'kein Erlaubnisinhaber, zugriffsbereit' + (s.kws ? ' – der kleine Waffenschein ist ausdrücklich ausgenommen' : '') : 'zugriffsbereit, kein anerkannter Zweck', law: ['f42b', 'zoneAusn', 'messer4a'], v: 'ja' }],
          ['Eine Rechtsverordnung nach § 42b Abs. 2 für Bahnanlagen des Bundes ist nicht erlassen (Stand Archiv 07.11.2026). Allgemeinverfügungen der Bundespolizei bleiben unberührt (§ 42b Abs. 2 Satz 4) – deren Inhalt gesondert prüfen. Kontrollbefugnis: § 42c.']);
        else owi(23, 'p53_23', `${isWaffe ? 'Waffe' : 'Messer'} in einer Waffen-/Messerverbotszone`, 'Verstoß gegen eine Verbotszonen-Verordnung nach § 42 Abs. 5 (bzw. ÖPNV-Verordnung) – ordnungswidrig, soweit die Verordnung auf § 53 Abs. 1 Nr. 23 verweist.',
          [tbObj(), tbAct('führt'), { m: 'Im räumlichen und zeitlichen Geltungsbereich einer Verbotszonen-Verordnung', s: 'konkrete Verordnung (Gebiet, Uhrzeiten) prüfen', law: ['zone'], v: 'offen' }, { m: 'Keine Ausnahme der Verordnung (regelmäßig berechtigtes Interesse)', s: 'laut Angabe', law: ['zoneAusn'], v: 'ja' }, { m: 'Verweis der Verordnung auf § 53 Abs. 1 Nr. 23', s: 'in der Verordnung nachsehen', law: ['p53_23'], v: 'offen' }],
          ['Nahverkehr (S-Bahn, Bus, Straßenbahn) und Bahnhöfe des Nahverkehrs fallen nicht unter § 42b Abs. 1, sondern nur unter Landesverordnungen (§ 42 Abs. 5 Satz 1 Nr. 3).']);
      }
    }
  }
  return wfFinish(s, c, H, F, path, gen);
}

function wfShoot(s, c, ok, owi, hint) {
  if (s.schussOrt === 'stand') return ok('Schießen auf einer Schießstätte', 'Auf Schießstätten (§ 27) bedarf es keiner Schießerlaubnis (§ 12 Abs. 4 Satz 1).', ['schiessFrei']);
  if (s.erlaubnis === 'jagd' && s.jagdZweck && c.schuss) return ok('Schießen zur Jagd (§ 13 Abs. 6)', 'Jäger dürfen mit Jagdwaffen zur befugten Jagdausübung schießen.', ['jagd']);
  if (s.schiessErl || s.ausnahme) return ok('Schießen mit Schießerlaubnis', 'Erlaubnisschein nach § 10 Abs. 5 liegt vor.', ['schiessFrei']);
  if (s.schussOrt === 'notwehr') return hint('Schuss in Notwehr', 'Das Schießen kann durch Notwehr gerechtfertigt sein (§ 32 StGB: erforderliche Verteidigung gegen einen gegenwärtigen rechtswidrigen Angriff). Besitz und Führen bleiben gesondert zu prüfen.', ['s32']);
  if (s.schussOrt === 'besitztum') {
    const fine = c.key === 'f75' || c.key === 'srsPtb' || c.key === 'softair';
    if (fine) return ok('Schießen im befriedeten Besitztum (§ 12 Abs. 4 Nr. 1)', c.key === 'srsPtb' ? 'Mit Zustimmung des Hausrechtsinhabers zulässig, wenn nur Kartuschenmunition verschossen wird.' : 'Mit Zustimmung des Hausrechtsinhabers zulässig, wenn die Geschosse (≤ 7,5 J) das Besitztum nicht verlassen können.', ['schiessFrei'], ['Signal- und Leuchtmunition, die das Grundstück verlässt, ist nicht erfasst.']);
  }
  return owi(3, 'p53_3', 'Schießen ohne Erlaubnis', s.schussOrt === 'besitztum' ? 'Im befriedeten Besitztum ist das Schießen ohne Erlaubnis nur mit Waffen bis 7,5 J (Geschosse verlassen das Besitztum nicht) oder mit reinen Kartuschenwaffen zulässig (§ 12 Abs. 4 Nr. 1).' : 'Außerhalb von Schießstätten und befriedetem Besitztum ist das Schießen nur mit Schießerlaubnis zulässig – auch mit kleinem Waffenschein, etwa an Silvester.',
    [{ m: 'Tatobjekt: Schusswaffe', s: c.label, law: ['schusswaffe'], v: 'ja' }, { m: 'Tathandlung: schießt', s: 'Geschosse durch einen Lauf, Kartuschen-, Reizstoff- oder pyrotechnische Munition', law: ['schiessen'], v: 'ja' }, { m: 'Ohne Erlaubnis und ohne Ausnahme nach § 12 Abs. 4', s: 'keine Schießstätte, keine Schießerlaubnis', law: ['schiessFrei'], v: 'ja' }]);
}

const WF_ORT_LABEL = { oeffentlich: 'öffentlicher Raum', veranstaltung: 'öffentliche Veranstaltung', fernverkehr: 'Personenfernverkehr', zone: 'Verbotszone / ÖPNV-Verordnung', fremd: 'fremder Hausrechtsbereich mit Zustimmung', eigen: 'eigene Wohnung / Besitztum' };
function wfActPhrase(s, H) {
  if (H === 'fuehren') return `außerhalb der eigenen Räume (${WF_ORT_LABEL[s.ort]}), ${{ zugriff: 'zugriffsbereit', nicht: 'nicht zugriffsbereit', behaeltnis: 'im verschlossenen Behältnis' }[s.zugriff]}${s.geladen && ['schuss', 'srs', 'druck', 'hist'].includes(s.obj) ? ', schussbereit' : ''}`;
  if (H === 'schiessen') return { stand: 'auf einer Schießstätte', besitztum: 'im befriedeten Besitztum', sonst: 'an einem sonstigen Ort', notwehr: 'in einer Notwehrlage' }[s.schussOrt];
  if (H === 'verbringen') return { rein: 'nach bzw. durch Deutschland', eu: 'aus Deutschland in einen anderen Mitgliedstaat', dritt: 'in einen Drittstaat' }[s.grenze];
  if (H === 'ueberlassen') return s.empfBer ? 'an eine berechtigte Person' : 'an eine nicht berechtigte Person';
  return 'tatsächliche Gewalt ' + (H === 'erwerb' ? 'erlangt' : 'ausgeübt');
}

/** Gewichtung, Vorsatz/Fahrlässigkeit, Alter, Konkurrenzen */
function wfFinish(s, c, H, F, path, gen) {
  const fahrl = s.vorsatz === 'fahrl';
  for (const f of F) {
    if (!f.pen) continue;
    if (f.level === 'straftat') {
      if (fahrl) {
        if (f.pen.fahrl) { f.folge = f.pen.fahrl; f.hints.unshift('Fahrlässige Begehung ist strafbar: ' + f.pen.fahrl + '.'); }
        else { f.level = 'hinweis'; f.title += ' – nur vorsätzlich strafbar'; f.folge = 'keine Strafbarkeit bei Fahrlässigkeit (§ 15 StGB)'; }
      } else f.folge = f.pen.folge;
      if (f.pen.versuch) f.hints.push('Versuch strafbar (§ 52 Abs. 2).');
      if (f.pen.verbrechen) f.hints.push('Verbrechen (§ 12 Abs. 1 StGB) – Versuch stets strafbar (§ 23 Abs. 1 StGB).');
      if (f.pen.ms) f.hints.push(f.pen.ms[0].toUpperCase() + f.pen.ms.slice(1) + '.');
      if (f.pen.bs) f.hints.push(f.pen.bs[0].toUpperCase() + f.pen.bs.slice(1) + '.');
      if (f.pen.einz) f.hints.push('Einziehung der Tatgegenstände zwingend (§ 54 Abs. 1).');
      else if (f.pen.norm.includes('WaffG')) f.hints.push('Einziehung möglich (§ 54 Abs. 2).');
    } else if (f.level === 'owi') { f.folge = f.pen.folge; if (fahrl) f.hints.unshift('Auch fahrlässig ahndbar (§ 53 Abs. 1).'); f.hints.push('Einziehung möglich (§ 54 Abs. 2).'); }
  }
  if (s.alter === 'kind') for (const f of F) if (f.level === 'straftat' || f.level === 'owi') { f.level = 'hinweis'; f.folge = 'keine Ahndung (Kind unter 14)'; f.hints.unshift('Kind unter 14: schuldunfähig bzw. nicht vorwerfbar (§ 19 StGB, § 12 Abs. 1 OWiG). Verantwortlichkeit des Überlassenden prüfen (§ 34; § 52 Abs. 3 Nr. 7 bzw. § 53 Abs. 1 Nr. 16).'); }
  if (s.alter === 'jug' && F.some(f => f.level === 'straftat')) gen.push('Jugendlicher (14 bis 17): Jugendgerichtsgesetz anwenden (§ 3 JGG: Verantwortlichkeit).');
  const order = f => WF_RANK[f.level] * 100 + (f.pen ? f.pen.rank : 0);
  F.sort((a, b) => order(b) - order(a));
  const viol = F.filter(f => f.level === 'straftat' || f.level === 'owi');
  if (!F.length) {
    const why = { messer: 'Das Messer ist keine Waffe; Erwerb, Besitz und Führen sind ohne Erlaubnis zulässig, soweit keine Führverbote (§ 42a, § 42 Abs. 4a, § 42b, Verbotszone) greifen.', frei: 'Für diesen Umgang ist keine Erlaubnis nötig' + (c.frei ? ` (${c.frei})` : '') + '.', nicht: 'Der Gegenstand unterfällt dem Waffengesetz nicht.', ausgenommen: 'Der Gegenstand ist bis auf das Führverbot nach § 42a vom Gesetz ausgenommen.', erlpfl: 'Die Erlaubnis deckt den Umgang.' }[c.cat] || 'Nach den Angaben ist kein Verstoß ersichtlich.';
    F.push({ level: 'erlaubt', title: 'Kein Verstoß ersichtlich', reason: why, tb: [], hints: c.notes ? [...c.notes] : [], law: c.law.slice(0, 3), folge: 'Kein Verstoß' });
  }
  if (viol.length > 1) {
    const st = viol.filter(f => f.level === 'straftat'), ow = viol.filter(f => f.level === 'owi');
    if (st.length > 1) gen.push('Mehrere Straftatbestände durch dieselbe Handlung: Tateinheit (§ 52 StGB) – Strafe aus dem schwersten Gesetz. Besitz und Führen derselben Waffe sind ein einheitliches Dauerdelikt.');
    if (st.length && ow.length) gen.push('Straftat und Ordnungswidrigkeit treffen zusammen: Es wird nur das Strafgesetz angewendet (§ 21 Abs. 1 OWiG); die OWi lebt auf, wenn keine Strafe verhängt wird (§ 21 Abs. 2 OWiG).');
    if (!st.length && ow.length > 1) gen.push('Mehrere Ordnungswidrigkeiten durch dieselbe Handlung: nur eine Geldbuße (§ 19 OWiG) nach dem Gesetz mit der höchsten Androhung.');
  }
  for (const f of F) if (f.level === 'erlaubt' && !f.folge) f.folge = 'Kein Verstoß';
  for (const f of F) if (f.level === 'hinweis' && !f.folge) f.folge = 'Einzelfall prüfen';
  const main = F[0];
  path.push('→ ' + { straftat: 'Straftat', owi: 'Ordnungswidrigkeit', hinweis: 'Einzelfallprüfung', erlaubt: 'kein Verstoß' }[main.level]);
  return { level: main.level, main, findings: F, path, gen, cls: c, H, verdict: main.title, paragraph: main.pen ? main.pen.norm : (main.law[0] && WF_LAW[main.law[0]] ? WF_LAW[main.law[0]].ref : '—'), folge: main.folge, reason: main.reason, hinweis: [...(c.notes && main.level !== 'erlaubt' ? c.notes : []), ...main.hints] };
}

/** Text für Anzeige / Vermerk */
function wfReport(s, r) {
  const c = r.cls, H = r.H;
  const header = { straftat: 'STRAFANZEIGE – SACHVERHALTSDARSTELLUNG', owi: 'ANZEIGE EINER ORDNUNGSWIDRIGKEIT – SACHVERHALT', erlaubt: 'AKTENVERMERK – KEIN VERSTOSS FESTSTELLBAR', hinweis: 'PRÜFVERMERK – EINZELFALLPRÜFUNG ERFORDERLICH' }[r.level];
  const ort = { oeffentlich: 'im öffentlichen Verkehrsraum', veranstaltung: 'als Teilnehmer einer öffentlichen Veranstaltung ([Art der Veranstaltung])', fernverkehr: 'in einem Verkehrsmittel bzw. einer umschlossenen Einrichtung des öffentlichen Personenfernverkehrs ([Zug/Bahnhof])', zone: 'im Geltungsbereich der [Verbotszonen-Verordnung]', fremd: 'in fremden Räumen bzw. auf fremdem befriedetem Besitztum mit Zustimmung des Berechtigten', eigen: 'in der eigenen Wohnung' }[s.ort];
  const zug = { zugriff: 'zugriffsbereit', nicht: 'nicht zugriffsbereit verstaut', behaeltnis: 'in einem verschlossenen Behältnis' }[s.zugriff];
  const tat = {
    besitz: `${c.acc} in Besitz hatte (tatsächliche Gewalt ausübte)`, erwerb: `${c.acc} erwarb (die tatsächliche Gewalt darüber erlangte)`,
    fuehren: `${c.acc} ${ort} ${zug}${s.geladen && c.schuss ? ' und schussbereit (geladen)' : ''} bei sich führte`,
    ueberlassen: `${c.acc} einer ${s.empfBer ? 'berechtigten' : 'nicht berechtigten'} Person ([Personalien Empfänger]) überließ`,
    schiessen: `${c.acc} besaß und damit ${{ stand: 'auf einer Schießstätte', besitztum: 'im befriedeten Besitztum', sonst: 'außerhalb einer Schießstätte am Feststellungsort', notwehr: 'in einer behaupteten Notwehrlage' }[s.schussOrt]} schoss`,
    verbringen: `${c.acc} ${{ rein: 'nach bzw. durch Deutschland', eu: 'aus Deutschland in einen anderen Mitgliedstaat', dritt: 'in einen Drittstaat' }[s.grenze]} verbrachte bzw. mitnahm`,
    herstellen: `${c.acc} ${s.gewerbe ? 'gewerbsmäßig ' : ''}herstellte, bearbeitete bzw. instand setzte`, handel: `mit Gegenständen der Art „${c.label}“ Handel trieb`,
    aufbewahrung: `${c.acc} aufbewahrte, ohne die vorgeschriebenen Vorkehrungen zu treffen${s.gefahr ? ', wodurch die Gefahr des Abhandenkommens bzw. des unbefugten Zugriffs entstand' : ''}`
  }[H];
  const lines = [header, '', '1. Sachverhalt', `Am [Datum] gegen [Uhrzeit] Uhr wurde in [Ort/Anschrift] festgestellt, dass die betroffene Person [Personalien] ${tat}.`, '', '2. Rechtliche Würdigung'];
  const viol = r.findings.filter(f => f.level !== 'erlaubt');
  if (!viol.length) lines.push(r.main.reason);
  viol.forEach((f, i) => {
    lines.push(`${viol.length > 1 ? (i + 1) + ') ' : ''}${f.title}${f.pen ? ' – ' + f.pen.norm : ''}`);
    if (f.reason) lines.push(f.reason);
    const tb = f.tb.filter(t => t.m);
    if (tb.length) lines.push('Tatbestand: ' + tb.map(t => `${t.m.replace(/^Tat(objekt|handlung): /, '')} (${t.v === 'ja' ? '+' : t.v === 'nein' ? '−' : '?'})`).join('; ') + '.');
    if (f.folge) lines.push('Rechtsfolge: ' + f.folge + '.');
  });
  if (r.findings.some(f => f.level === 'straftat')) lines.push(s.vorsatz === 'fahrl' ? 'Subjektiv: fahrlässige Begehung.' : 'Subjektiv: vorsätzliches Handeln (Kenntnis der tatbestandlichen Umstände, z. B. Art und Beschaffenheit des Gegenstands).');
  if (r.gen.length) { lines.push('', '3. Konkurrenzen und Hinweise'); r.gen.forEach(g => lines.push('– ' + g)); }
  const extra = [...new Set(viol.flatMap(f => f.hints))].filter(h => !/^(Versuch|Einziehung|Verbrechen|Minder|Besonders)/i.test(h)).slice(0, 4);
  if (extra.length) { if (!r.gen.length) lines.push('', '3. Hinweise'); extra.forEach(h => lines.push('– ' + h)); }
  lines.push('', `Hinweis: Orientierende Einschätzung mit dem WaffG-Prüfstand (${WF_STAND}); ersetzt keine juristische oder behördliche Prüfung. Maßgeblich sind der Einzelfall, Feststellungsbescheide des BKA (§ 2 Abs. 5 WaffG) und das einschlägige Landesrecht (Verbotszonen).`);
  return lines.join('\n');
}

/* ---------- Subsumtionshilfen für die i-Knöpfe ---------- */
/* t: Titel · law: Wortlaut (Schlüssel aus WF_LAW) · merk: Tatbestandsmerkmale / Voraussetzungen · hin: Prüfhinweise, Abgrenzung · rspr: geprüfte Rechtsprechung · see: verwandte Begriffe */
const WF_TIPS = {
  waffe: { t: 'Waffenbegriff (§ 1 Abs. 2)', law: ['waffe'], merk: ['Nr. 1: Schusswaffen und gleichgestellte Gegenstände (Anlage 1 Abschn. 1 UA 1).', 'Nr. 2 a: tragbare Gegenstände, die ihrem Wesen nach dazu bestimmt sind, die Angriffs- oder Abwehrfähigkeit von Menschen zu beseitigen oder herabzusetzen – maßgeblich ist die objektive Zweckbestimmung durch Konstruktion und Herstellung, nicht die Verwendungsabsicht.', 'Nr. 2 b: Gegenstände, die dazu nur geeignet sind und im Gesetz ausdrücklich genannt werden (Spring-, Fall-, Faust-, Butterflymesser; Elektroimpulsgeräte gegen Tiere).'], hin: ['Gewöhnliche Messer (Küchen-, Taschen-, Einhandmesser) sind keine Waffen – für sie gelten nur die Führverbote (§ 42 Abs. 4a, § 42a Abs. 1 Nr. 3, § 42b, Verbotszonen).', 'Die Waffeneigenschaft entscheidet über § 2 Abs. 1 (Alter 18), § 42 Abs. 1 (Straftat statt OWi bei Veranstaltungen) und § 41.'], see: ['hieb', 'umgang'] },
  umgang: { t: 'Umgang (§ 1 Abs. 3)', law: ['umgang'], merk: ['Erwerben, Besitzen, Überlassen, Führen, Verbringen, Mitnehmen, Schießen, Herstellen, Bearbeiten, Instandsetzen, Handeltreiben – abschließend aufgezählt.', 'Definitionen der einzelnen Umgangsarten: Anlage 1 Abschn. 2.'], see: ['erwerb', 'besitz', 'ueberlassen', 'fuehren', 'schiessen', 'verbringen', 'herstellen', 'handel'] },
  erwerb: { t: 'Erwerb', law: ['erwerb'], merk: ['Erlangen der tatsächlichen Gewalt (Sachherrschaft mit Herrschaftswillen).', 'Ein Rechtsgeschäft ist nicht nötig – auch Fund, Erbe, Wegnahme oder kurzzeitige Übernahme (Verwahrung, Transport, „mal halten“).', 'Mitverfügungsgewalt genügt.'], rspr: ['BGH, Beschl. v. 06.08.2007 – 4 StR 431/06 (NStZ 2008, 158): Auch eine nur vorübergehende Erlangung der tatsächlichen Gewalt, etwa zur Verwahrung oder Beförderung, ist Erwerb; Mitverfügungsgewalt reicht.'], see: ['besitz'] },
  besitz: { t: 'Besitz', law: ['besitz'], merk: ['Ausüben der tatsächlichen Gewalt: tatsächliche Möglichkeit, nach eigenem Willen über die Sache zu verfügen, und Herrschaftswille.', 'Eigentum ist unerheblich; Mitbesitz mehrerer ist möglich (z. B. gemeinsame Wohnung, Fahrzeug) – Wissen und Wollen der Mitverfügung festzustellen.', 'Dauerdelikt: beginnt mit dem Erwerb, endet mit Aufgabe der Sachherrschaft.'], hin: ['Wer Waffe und Munition nur in der Wohnung hat, besitzt; wer sie mitnimmt, führt zusätzlich (Tateinheit).'], rspr: ['BGH, Beschl. v. 06.08.2007 – 4 StR 431/06: Mitverfügungsgewalt genügt; ohne eigenen Zugriff kommt nur Beihilfe in Betracht.'], see: ['erwerb', 'fuehren'] },
  ueberlassen: { t: 'Überlassen', law: ['ueberlassen', 'ueberl34'], merk: ['Einräumen der tatsächlichen Gewalt an einen anderen (Übergabe, Zugriff ermöglichen).', 'Der Überlassende muss im Zeitpunkt der Übergabe selbst die tatsächliche Gewalt haben.', 'Nur an Berechtigte: Die Berechtigung muss offensichtlich sein oder nachgewiesen werden (WBK, Alter, kein Waffenverbot).'], hin: ['Erlaubnispflichtige Waffen/Munition an Nichtberechtigte: Straftat (§ 52 Abs. 3 Nr. 7); erlaubnisfreie: OWi (§ 53 Abs. 1 Nr. 16).', 'Wer erwirbt, um an Nichtberechtigte zu überlassen: § 52 Abs. 1 Nr. 2 Buchst. a.'], see: ['erwerb'] },
  fuehren: { t: 'Führen', law: ['fuehren'], merk: ['Ausüben der tatsächlichen Gewalt …', '… außerhalb der eigenen Wohnung, der eigenen Geschäftsräume, des eigenen befriedeten Besitztums oder einer Schießstätte.'], hin: ['Die Waffe muss nicht am Körper getragen werden: Tasche, Rucksack, Handschuhfach oder Kofferraum genügen – das Fahrzeug ist kein befriedetes Besitztum.', 'Zugriffsbereitschaft ist kein Merkmal des Führens. Sie entscheidet aber über Ausnahmen: Transport (§ 12 Abs. 3 Nr. 2), Messer (§ 42 Abs. 4a Nr. 3, § 42b), § 42a (verschlossenes Behältnis).', 'Fremde Wohnung/Grundstück: Führen liegt vor, eine Führerlaubnis ist mit Zustimmung des Inhabers entbehrlich (§ 12 Abs. 3 Nr. 1).', 'Munition wird nicht geführt – Mitnahme ist Besitz.'], see: ['zugriffsbereit', 'transport', 'fremd', 'waffenschein'] },
  zugriffsbereit: { t: 'Zugriffsbereit / nicht zugriffsbereit', law: ['zugriffsbereit'], merk: ['Schusswaffe: zugriffsbereit, wenn sie unmittelbar in Anschlag gebracht werden kann; nicht zugriffsbereit jedenfalls im verschlossenen Behältnis.', 'Messer: nicht zugriffsbereit, wenn es nur mit mehr als drei Handgriffen erreicht werden kann (z. B. Rucksack absetzen, öffnen, Innenfach öffnen, Etui öffnen).'], hin: ['Die Drei-Handgriffe-Regel gilt für § 42 Abs. 4a Nr. 3, § 42 Abs. 5 Satz 3 und § 42b. Für das Führverbot des § 42a zählt allein der Transport im verschlossenen Behältnis.', 'Handgriffe konkret dokumentieren (Lichtbilder, Reihenfolge).'], see: ['schussbereit', 'behaeltnis'] },
  behaeltnis: { t: 'Verschlossenes Behältnis (§ 42a Abs. 2 Nr. 2)', law: ['f42a'], merk: ['Transport in einem verschlossenen Behältnis.'], hin: ['Gesetzlich nicht definiert. Sicher erfasst: abgeschlossene Behältnisse (Schloss, Zahlenschloss, Plombe). Ob eine nur geschlossene Tasche oder ein zugezogener Reißverschluss genügt, ist nicht geklärt.', 'Für Schusswaffen bestimmt Anlage 1 Abschn. 2 Nr. 13: im verschlossenen Behältnis nicht zugriffsbereit.'], see: ['zugriffsbereit'] },
  schussbereit: { t: 'Schussbereit', law: ['schussbereit'], merk: ['Geladen: Munition oder Geschosse in Trommel, eingefügtem Magazin oder Patronen-/Geschosslager – auch ungespannt.'], hin: ['Ein eingesetztes, gefülltes Magazin genügt, auch ohne Patrone im Lauf. Der Transport nach § 12 Abs. 3 Nr. 2 verlangt „nicht schussbereit“.'], see: ['zugriffsbereit', 'transport'] },
  transport: { t: 'Erlaubnisfreier Transport (§ 12 Abs. 3 Nr. 2)', law: ['transport', 'zugriffsbereit', 'schussbereit'], merk: ['Nicht schussbereit (ungeladen).', 'Nicht zugriffsbereit (sicher: verschlossenes Behältnis).', 'Von einem Ort zu einem anderen Ort – Transport, kein Verweilen.', 'Zu einem vom Bedürfnis umfassten Zweck oder im Zusammenhang damit (z. B. Schießstätte, Jagd, Büchsenmacher, Waffenbehörde); bei erlaubnisfreien Waffen ein nachvollziehbarer Anlass (Kauf, Reparatur).'], hin: ['Ohne Besitzerlaubnis hilft das Transportprivileg nicht – der Besitz bleibt strafbar.', 'Das Privileg gilt nicht für das Führverbot bei öffentlichen Veranstaltungen (§ 42 Abs. 1).'], see: ['fuehren'] },
  fremd: { t: 'Führen im fremden Hausrechtsbereich (§ 12 Abs. 3 Nr. 1)', law: ['fremd'], merk: ['Mit Zustimmung des Berechtigten.', 'In dessen Wohnung, Geschäftsräumen, befriedetem Besitztum oder Schießstätte.', 'Zu einem vom Bedürfnis umfassten Zweck oder im Zusammenhang damit.'], see: ['fuehren'] },
  schiessen: { t: 'Schießen', law: ['schiessen', 'schiessFrei'], merk: ['Geschosse durch einen Lauf verschießen, Kartuschenmunition abschießen, Reiz-/Wirkstoffe verschießen oder pyrotechnische Munition verschießen.', 'Ohne Erlaubnis nur auf Schießstätten oder in den Fällen des § 12 Abs. 4 (u. a. befriedetes Besitztum mit Zustimmung: ≤ 7,5 J und Geschosse verlassen es nicht, oder reine Kartuschenwaffen).'], hin: ['Der kleine Waffenschein erlaubt nur das Führen – nicht das Schießen in der Öffentlichkeit (z. B. Silvester): § 53 Abs. 1 Nr. 3.', 'Wer außerhalb schießt, führt die Waffe zugleich.', 'Notwehr (§ 32 StGB) kann das Schießen rechtfertigen, nicht aber einen unerlaubten Besitz.'], see: ['s32'] },
  verbringen: { t: 'Verbringen und Mitnehmen', law: ['verbringen', 'mitnehmen'], merk: ['Verbringen: über die Grenze zum dortigen Verbleib oder mit dem Ziel des Besitzwechsels.', 'Mitnehmen: vorübergehend auf einer Reise ohne Aufgabe des Besitzes zur Verwendung.'], hin: ['Erlaubnispflichtige Schusswaffen nach Deutschland ohne Erlaubnis: § 52 Abs. 1 Nr. 2 Buchst. d; aus Deutschland in einen Mitgliedstaat: § 52 Abs. 3 Nr. 4.', 'Erlaubnisfrei: u. a. F-Druckluftwaffen, zugelassene SRS, Dekowaffen, Armbrüste (Anlage 2 Abschn. 2 UA 2 Nr. 7) – Recht des Zielstaats beachten.', 'Europäischer Feuerwaffenpass und Erlaubnisschein mitführen (§ 38).'] },
  herstellen: { t: 'Herstellen, Bearbeiten, Instandsetzen', law: ['herstellen', 'bearbeiten'], merk: ['Herstellen: aus Rohteilen ein Endprodukt oder wesentliche Teile erzeugen; Austausch des führenden wesentlichen Teils; Wiederladen von Hülsen.', 'Bearbeiten: Verkürzen, Ändern der Schussfolge, Umbau auf andere Munition, Austausch wesentlicher Teile mit Nacharbeit, beschusspflichtige Arbeiten.'], hin: ['Gewerbsmäßig ohne Erlaubnis (§ 21): § 52 Abs. 1 Nr. 2 Buchst. c; privat ohne Erlaubnis (§ 26): § 52 Abs. 3 Nr. 3.', 'Geringfügige Änderungen an Schaft oder Zieleinrichtung sind kein Bearbeiten.', '3D-gedruckte Schusswaffen und wesentliche Teile: Herstellen.'] },
  handel: { t: 'Waffenhandel', law: ['handel'], merk: ['Gewerbsmäßig oder selbstständig im Rahmen einer wirtschaftlichen Unternehmung.', 'Ankaufen, Feilhalten, Bestellungen entgegennehmen oder aufsuchen, Überlassen oder Vermitteln – Schusswaffen oder Munition.'], hin: ['Ohne Erlaubnis nach § 21: § 52 Abs. 1 Nr. 2 Buchst. c (6 Monate bis 5 Jahre).', 'Handel mit tragbaren Gegenständen (Messer, Schlagstöcke) ist erlaubnisfrei – mit verbotenen Gegenständen aber strafbar (§ 52 Abs. 3 Nr. 1).'] },
  aufbew: { t: 'Aufbewahrung (§ 36)', law: ['aufbew', 'p52_3_7'], merk: ['Erforderliche Vorkehrungen gegen Abhandenkommen und unbefugten Zugriff (Einzelheiten: AWaffV, Sicherheitsbehältnisse nach Widerstandsgrad).', 'Straftat (§ 52 Abs. 3 Nr. 7a) nur, wenn dadurch die Gefahr des Abhandenkommens oder unbefugten Zugriffs verursacht wird.'], hin: ['Nr. 7a ist nur vorsätzlich strafbar (§ 52 Abs. 4 nennt Nr. 7a nicht).', 'Auch ohne Straftat: Zweifel an der Zuverlässigkeit (§ 5 Abs. 1 Nr. 2 Buchst. b) – Widerruf der Erlaubnis prüfen.'] },
  hieb: { t: 'Hieb- und Stoßwaffen', law: ['hieb', 'f42a'], merk: ['Gegenstände, die ihrem Wesen nach dazu bestimmt sind, durch Hieb, Stoß, Stich, Schlag oder Wurf Verletzungen beizubringen.', 'Objektive Zweckbestimmung: Konstruktion als Waffe (Dolch, Stilett, Bajonett, Schwert, Säbel, Schlagstock, Wurfmesser).'], hin: ['Werkzeuge (Küchen-, Jagd-, Arbeitsmesser) sind keine Hieb- und Stoßwaffen, auch wenn sie gefährlich sind.', 'Erlaubnisfrei ab 18; Führen verboten (§ 42a Abs. 1 Nr. 2) außer bei berechtigtem Interesse, im verschlossenen Behältnis oder für Foto/Film/Theater.', 'Bei öffentlichen Veranstaltungen: Straftat nach § 52 Abs. 3 Nr. 9.'], rspr: ['BGH, Beschl. v. 21.04.2022 – 3 StR 81/22: Der Teleskopschlagstock ist eine Hieb- und Stoßwaffe (Anlage 1 Abschn. 1 UA 2 Nr. 1.1), aber kein Totschläger – § 52 Abs. 3 Nr. 1 greift nicht.'], see: ['waffe', 'f42a'] },
  f42a: { t: 'Führverbot § 42a', law: ['f42a', 'p53_21'], merk: ['Nr. 1: Anscheinswaffen.', 'Nr. 2: Hieb- und Stoßwaffen.', 'Nr. 3: Einhandmesser (Klinge einhändig feststellbar – jede Länge) und feststehende Messer mit Klinge über 12 cm.', 'Ausnahmen: Foto, Film, Fernsehen, Theater; Transport im verschlossenen Behältnis; berechtigtes Interesse (nur Nr. 2 und 3).'], hin: ['Berechtigtes Interesse (Abs. 3): Berufsausübung, Brauchtumspflege, Sport, allgemein anerkannter Zweck – etwa Wandern, Angeln, Picknick, Handwerk. Selbstverteidigung ist kein anerkannter Zweck.', 'Klingenlänge: Länge der Klinge ohne Griff; „einhändig feststellbar“: Öffnen und Arretieren mit einer Hand möglich (Daumenpin, Flipper, Loch).', 'Rechtsfolge: OWi nach § 53 Abs. 1 Nr. 21b, Geldbuße bis 10.000 €.'], see: ['behaeltnis', 'hieb', 'anschein'] },
  veranst: { t: 'Öffentliche Veranstaltungen (§ 42)', law: ['veranst', 'veranstAusn', 'p52_3_8'], merk: ['Teilnahme an öffentlichen Vergnügungen, Volksfesten, Sportveranstaltungen, Messen, Ausstellungen, Märkten oder ähnlichen Veranstaltungen – auch Theater, Kino, Diskothek, Tanz.', 'Führen einer Waffe i. S. d. § 1 Abs. 2.'], hin: ['Mit einer Waffe: Straftat nach § 52 Abs. 3 Nr. 9 (auch mit Waffenschein oder kleinem Waffenschein). Mit einem Messer: OWi nach § 53 Abs. 1 Nr. 21a (Abs. 4a).', 'Kein Transportprivileg für Waffen. Ausnahmen nur durch Behörde (Abs. 2) und Abs. 4 (Theater, Schießstätte, Schießerlaubnis, gewerbliches Ausstellen).', '„Teilnehmen“: wer die Veranstaltung besucht; bloßes Durchqueren ohne Teilnahme ist Einzelfall.'], see: ['messer4a'] },
  messer4a: { t: 'Messer bei öffentlichen Veranstaltungen (§ 42 Abs. 4a)', law: ['messer4a', 'p53_21'], merk: ['Seit 31.10.2024: Führverbot für Messer jeder Art bei öffentlichen Veranstaltungen.', 'Zehn abschließende Ausnahmen, u. a. nicht zugriffsbereite Beförderung (Nr. 3), Gastronomie (Nr. 9), allgemein anerkannter Zweck (Nr. 10).'], hin: ['Verstoß: OWi nach § 53 Abs. 1 Nr. 21a.', 'Messer, die zugleich Waffen sind (Spring-, Fall-, Faust-, Butterflymesser, Dolche), fallen unter § 42 Abs. 1 – Straftat.'], see: ['veranst', 'zugriffsbereit'] },
  f42b: { t: 'Personenfernverkehr (§ 42b)', law: ['f42b', 'bahn42b', 'kontr42c'], merk: ['Verkehrsmittel des öffentlichen Personenfernverkehrs (ICE, IC/EC, Fernbus) und seitlich umschlossene Einrichtungen des Fernverkehrs (Bahnhofsgebäude, Haltepunkte).', 'Waffen i. S. d. § 1 Abs. 2 und Messer.'], hin: ['Ausnahmen für Waffen: Inhaber waffenrechtlicher Erlaubnisse (nicht: kleiner Waffenschein), nicht zugriffsbereite Beförderung, Rettungs- und Einsatzkräfte, Zustimmung des Verkehrsunternehmens. Für Messer zusätzlich alle Ausnahmen des § 42 Abs. 4a Satz 2.', 'Nahverkehr (S-Bahn, RE/RB, Bus, Straßenbahn) ist nicht erfasst – dort nur Landesverordnungen (§ 42 Abs. 5 Satz 1 Nr. 3).', 'Eine Verordnung des BMI nach § 42b Abs. 2 für Bahnanlagen des Bundes ist nicht erlassen (amtlicher Bestand 07.11.2026). Allgemeinverfügungen der Bundespolizei bleiben unberührt (Abs. 2 Satz 4) – ihr Inhalt ist gesondert maßgeblich.', 'Kontrollbefugnis: § 42c (anhalten, befragen, Sachen in Augenschein nehmen, durchsuchen).', 'Verstoß: OWi nach § 53 Abs. 1 Nr. 21c.'], see: ['zone', 'zugriffsbereit'] },
  zone: { t: 'Waffen- und Messerverbotszonen (§ 42 Abs. 5)', law: ['zone', 'zoneAusn', 'p53_23'], merk: ['Landesverordnung für bestimmte Straßen, Plätze, Gebäude, Verkehrsmittel und Einrichtungen des ÖPNV, Jugend- und Bildungseinrichtungen.', 'Räumlicher und zeitlicher Geltungsbereich laut Verordnung.'], hin: ['Ordnungswidrig nur, wenn die Verordnung auf § 53 Abs. 1 Nr. 23 verweist – immer die konkrete Verordnung (Gebiet, Uhrzeiten, Ausnahmen) prüfen.', 'Die Verordnung muss Ausnahmen für berechtigte Interessen vorsehen; regelmäßig: Erlaubnisinhaber (nicht kleiner Waffenschein), nicht zugriffsbereiter Transport, Rettungskräfte, für Messer die Fälle des § 42 Abs. 4a Satz 2.'], see: ['f42b'] },
  anschein: { t: 'Anscheinswaffen', law: ['anschein', 'nachbildung', 'f42a'], merk: ['Schusswaffen ohne heiße Gase (Softair, Druckluft) mit dem Gesamterscheinungsbild einer Feuerwaffe, Nachbildungen und unbrauchbar gemachte Schusswaffen mit diesem Aussehen.', 'Nicht: erkennbares Spielzeug (Größe ± 50 %, Neonfarben, keine Kennzeichnungen), Brauchtum, kulturhistorische Sammlung – und Waffen, für deren Führen eine Erlaubnis nötig ist (SRS, F-Druckluftwaffen).'], hin: ['Führverbot § 42a Abs. 1 Nr. 1 (OWi Nr. 21b). Ein berechtigtes Interesse hilft nicht; ausgenommen sind nur Foto/Film/Theater und der Transport im verschlossenen Behältnis.', 'Softair bis 0,5 J und Nachbildungen sind im Übrigen vom WaffG ausgenommen – § 42 und § 42b gelten für sie nicht.'], see: ['f42a'] },
  spiel: { t: 'Vom Gesetz ausgenommene Gegenstände', law: ['spiel'], merk: ['Spielzeug-Schusswaffen bis 0,5 J (nicht mit gebräuchlichem Werkzeug steigerbar), Blasrohre, Amorces-Spielzeug, Nachbildungen – ausgenommen bis auf § 42a.'], see: ['anschein'] },
  v141: { t: 'Spring- und Fallmesser', law: ['springDef', 'fallDef', 'v141'], merk: ['Springmesser: Klinge schnellt auf Knopf- oder Hebeldruck hervor und wird festgestellt.', 'Fallmesser: Klinge schnellt durch Schwerkraft oder Schleuderbewegung hervor.', 'Ausnahme (nur Springmesser): Klinge springt seitlich heraus, höchstens 8,5 cm, nicht zweiseitig geschliffen – und berechtigtes Interesse, das eine einhändige Nutzung erfordert, oder Umgang im Zusammenhang mit der Berufsausübung (seit 31.10.2024).'], hin: ['Frontal herausspringende Klingen (OTF) und Fallmesser: immer verboten (§ 52 Abs. 3 Nr. 1).', 'Auch das ausnahmsweise erlaubte Springmesser ist Waffe (§ 1 Abs. 2 Nr. 2 b) und einhändig feststellbar: Führverbot § 42a Abs. 1 Nr. 3, bei Veranstaltungen § 52 Abs. 3 Nr. 9.', 'Abgrenzung Einhandmesser: Die Klinge wird von Hand (Daumen, Flipper) geöffnet, nicht durch Federkraft auf Knopfdruck – „Assisted Opening“ mit Federunterstützung nach manuellem Anschub ist umstritten.'], see: ['f42a'] },
  faustDef: { t: 'Faustmesser', law: ['faustDef', 'faust40'], merk: ['Griff quer zur Klinge; bestimmungsgemäß in der geschlossenen Faust geführt.'], hin: ['Verboten (Anlage 2 Abschn. 1 Nr. 1.4.2) – Ausnahme für Jäger und Leder/Pelz verarbeitende Berufe zur Ausübung der Tätigkeit (§ 40 Abs. 3).'] },
  butterflyDef: { t: 'Butterflymesser', law: ['butterflyDef'], merk: ['Faltmesser mit zweigeteilten, schwenkbaren Griffen (Balisong).'], hin: ['Ausnahmslos verboten (Anlage 2 Abschn. 1 Nr. 1.4.3) – auch Trainer mit stumpfer Klinge, wenn sie die Merkmale erfüllen; Zweifel: Feststellungsbescheid BKA.'] },
  v131: { t: 'Getarnte Hieb- und Stoßwaffen', law: ['v131'], merk: ['Täuschen ihrer Form nach einen anderen Gegenstand vor oder sind mit Alltagsgegenständen verkleidet.'], hin: ['Beispiele: Stockdegen, Gürtelschnallendolch, Kugelschreiber- oder Kreditkartenmesser, Haarbürstendolch.'] },
  automatik: { t: 'Voll- und Halbautomaten', law: ['automatik', 'langkurz'], merk: ['Halbautomat: lädt selbsttätig nach, je Abzug ein Schuss. Vollautomat: mehrere Schüsse je Abzug.', 'Double-Action-Revolver sind keine Halbautomaten.', 'Kurzwaffe: Lauf und Verschluss bis 30 cm oder Gesamtlänge bis 60 cm.'], hin: ['Halbautomatische Kurzwaffe ohne Erlaubnis: § 52 Abs. 1 Nr. 2 Buchst. b (6 Monate bis 5 Jahre, Versuch strafbar). Ein Gesetzentwurf (BT-Drs. 21/7557), dies zum Verbrechen nach § 51 hochzustufen, ist im amtlichen Stand vom 22.10.2026 nicht enthalten.', 'Vollautomaten: § 51 (Verbrechen) bzw. KrWaffKontrG, wenn in der Kriegswaffenliste.'], see: ['langkurz'] },
  langkurz: { t: 'Lang- und Kurzwaffen', law: ['langkurz', 'feuerwaffe'], merk: ['Langwaffe: Lauf und Verschluss zusammen länger als 30 cm und kürzeste bestimmungsgemäße Gesamtlänge über 60 cm.', 'Kurzwaffe: alle anderen Schusswaffen (Pistolen, Revolver).'] },
  v1211: { t: 'Verbotene Schusswaffen nach § 51', law: ['v1211', 'p51'], merk: ['Vollautomaten (auch zurückänderbare umgebaute Vollautomaten).', 'Vorderschaftrepetierflinten mit Kurzwaffengriff anstelle des Hinterschaftes, Gesamtlänge unter 95 cm oder Lauf unter 45 cm.'], hin: ['§ 51 Abs. 1 ist ein Verbrechen: 1 bis 5 Jahre; Versuch stets strafbar; fahrlässig bis 2 Jahre.', 'Kriegswaffen (z. B. Sturmgewehre der KWL Nr. 29) unterfallen allein dem KrWaffKontrG (§ 57 WaffG).'], see: ['kw'] },
  v122: { t: 'Getarnte und verkürzbare Schusswaffen', law: ['v122'], merk: ['Täuschen einen anderen Gegenstand vor (Koppelschloss-, Kugelschreiber-, Stock-, Taschenlampenpistolen).', 'Über das jagdlich-sportlich übliche Maß hinaus zusammenklappbar, -schiebbar, verkürzbar oder schnell zerlegbar (Nr. 1.2.3).'] },
  teile: { t: 'Wesentliche Teile und Schalldämpfer', law: ['teile'], merk: ['Lauf/Gaslauf, Verschluss (Kopf und Träger), Patronenlager, Gehäuse (Ober- und Unterteil, bei Kurzwaffen: Griffstück), vorgearbeitete Teile.', 'Stehen der Schusswaffe gleich, für die sie bestimmt sind.'], hin: ['Teile einer halbautomatischen Kurzwaffe: wie die Waffe selbst nach § 52 Abs. 1 Nr. 2 Buchst. b.'] },
  srsDef: { t: 'Schreckschuss-, Reizstoff- und Signalwaffen', law: ['srsDef', 'frei13', 'kwsDef'], merk: ['Kartuschenlager zum Abschießen von Kartuschenmunition, Reizstoffen oder pyrotechnischer Munition.', 'Erlaubnisfrei (Erwerb, Besitz ab 18) nur mit Zulassungszeichen „PTB im Kreis“ bzw. nach EU-Durchführungsrichtlinie 2019/69.'], hin: ['Führen nur mit kleinem Waffenschein (§ 10 Abs. 4 Satz 4); ohne ihn: Straftat nach § 52 Abs. 3 Nr. 2 Buchst. a.', 'Schießen nur auf Schießstätten oder im befriedeten Besitztum (§ 12 Abs. 4) – sonst OWi (§ 53 Abs. 1 Nr. 3), auch an Silvester.', 'Ohne Zulassungszeichen: erlaubnispflichtig wie eine scharfe Waffe.'], see: ['kwsDef', 'schiessen'] },
  frei13: { t: 'SRS-Waffen mit Zulassung', law: ['frei13', 'kwsDef'], see: ['srsDef'] },
  kwsDef: { t: 'Kleiner Waffenschein', law: ['waffenschein', 'kwsDef'], merk: ['Erlaubnis zum Führen zugelassener SRS-Waffen – ohne Sachkunde-, Bedürfnis- und Versicherungsnachweis; Zuverlässigkeit und persönliche Eignung, Alter 18.'], hin: ['Erlaubt nicht das Schießen außerhalb der Fälle des § 12 Abs. 4.', 'Kein Freibrief bei öffentlichen Veranstaltungen (§ 42 Abs. 1) und im Fernverkehr (§ 42b) – dort ausdrücklich keine Ausnahme.', 'Mitführen mit Ausweis (§ 38; OWi Nr. 20).'], see: ['srsDef'] },
  waffenschein: { t: 'Waffenschein', law: ['waffenschein', 'ausweis38'], merk: ['Erlaubnis zum Führen bestimmter Schusswaffen, höchstens drei Jahre, ggf. örtlich oder anlassbezogen beschränkt.'], hin: ['Die WBK erlaubt nur Erwerb und Besitz – nicht das Führen.', 'Jäger führen Jagdwaffen zur Jagd ohne Waffenschein (§ 13 Abs. 6).'], see: ['wbk', 'jagd'] },
  wbk: { t: 'Waffenbesitzkarte', law: ['wbk', 'munErl'], merk: ['Erlaubnis zum Erwerb und Besitz (Art, Anzahl, Kaliber); Erwerbserlaubnis ein Jahr, Besitz unbefristet.', 'Munition: Eintragung in der WBK für die eingetragenen Waffen, sonst Munitionserwerbsschein.'], hin: ['Vorübergehender Erwerb ohne Eintragung: § 12 Abs. 1 (z. B. bis zu einem Monat von einem Berechtigten für einen vom Bedürfnis umfassten Zweck).'], see: ['ausn12'] },
  ausn12: { t: 'Ausnahmen von der Erlaubnispflicht (§ 12 Abs. 1)', law: ['ausn12'] },
  jagd: { t: 'Jäger (§ 13 Abs. 6)', law: ['jagd'], merk: ['Führen und Schießen mit Jagdwaffen zur befugten Jagdausübung, zum Ein- und Anschießen im Revier, zur Hundeausbildung, zum Jagd- und Forstschutz.', 'Auf dem Weg dorthin: nicht schussbereit.'], hin: ['Jahresjagdschein: Erwerb von Langwaffen ohne Erlaubnis, WBK binnen zwei Wochen beantragen (§ 13 Abs. 3); Langwaffenmunition erlaubnisfrei (§ 13 Abs. 5).'] },
  frei11: { t: 'Druckluft-, CO₂- und Federdruckwaffen bis 7,5 J', law: ['druckDef', 'frei11'], merk: ['Höchstens 7,5 J und Kennzeichen „F im Fünfeck“.', 'Erlaubnisfrei nur Erwerb und Besitz ab 18.'], hin: ['Führen nur mit Waffenschein – zugriffsbereit in der Öffentlichkeit: Straftat (§ 52 Abs. 3 Nr. 2 Buchst. a). Transport nicht schuss- und nicht zugriffsbereit ist erlaubt.', 'Schießen: Schießstätte oder befriedetes Besitztum mit Zustimmung, wenn die Geschosse es nicht verlassen.', 'Keine Anscheinswaffen, weil das Führen erlaubnispflichtig ist.'], see: ['transport', 'schiessen'] },
  druckDef: { t: 'Druckluft- und Federdruckwaffen', law: ['druckDef'], see: ['frei11'] },
  freiAntik: { t: 'Antike Schusswaffen (Modell vor 1871)', law: ['freiAntik', 'freiFuehren'], merk: ['Erlaubnisfrei Erwerb und Besitz: einläufige Perkussions-Einzellader, Lunten-/Funkenschlosswaffen, Zündnadelwaffen – jeweils Modell vor 1871 (Repliken eingeschlossen).', 'Erlaubnisfrei führen: nur Lunten- und Funkenschlosswaffen (Nr. 3.1).'], hin: ['Perkussionsrevolver und mehrläufige Perkussionswaffen sind nicht freigestellt.', 'Schwarzpulver unterfällt dem Sprengstoffgesetz.'] },
  freiFuehren: { t: 'Erlaubnisfreies Führen', law: ['freiFuehren'], merk: ['Lunten-/Funkenschlosswaffen vor 1871, Armbrüste, unbrauchbar gemachte Schusswaffen.'], hin: ['Dekowaffen mit dem Aussehen einer Feuerwaffe bleiben Anscheinswaffen – Führverbot § 42a.'] },
  dekoDef: { t: 'Dekorationswaffen', law: ['dekoDef'], merk: ['EU-Deaktivierungsbescheinigung und Kennzeichnung nach DVO (EU) 2015/2403.'], hin: ['Ohne Bescheinigung und Kennzeichnung: nicht unbrauchbar im Rechtssinn – wie die ursprüngliche Schusswaffe prüfen.', 'Anzeigepflicht § 37d (Verstoß: § 53 Abs. 1 Nr. 8).'], see: ['anschein'] },
  salutDef: { t: 'Salutwaffen', law: ['salutDef'], merk: ['Umgebaute Langwaffen für Kartuschenmunition (Theater, Film, Brauchtum).'], hin: ['Erlaubnispflichtig (WBK); Bedürfnis nach § 39b.'] },
  munErl: { t: 'Munition', law: ['munErl', 'p52_3_2'], merk: ['Patronenmunition für erlaubnispflichtige Schusswaffen: Erwerb und Besitz nur mit Eintragung in der WBK oder Munitionserwerbsschein.'], hin: ['Ohne Erlaubnis: § 52 Abs. 3 Nr. 2 Buchst. b. Munition wird nicht „geführt“.', 'Kartuschenmunition für zugelassene SRS: erlaubnisfrei ab 18.'] },
  v15: { t: 'Verbotene Munition', law: ['v15', 'p52_3_1'], merk: ['Nr. 1.5.3 bis 1.5.7: u. a. Treibspiegel-, Hartkern-, panzerbrechende, Spreng-, Brand-, Leuchtspurmunition, bestimmte Knallkartuschen und Kleinschrot, Munition nur für Kriegswaffen/Behörden.'], hin: ['Nr. 1.5.1 und 1.5.2 (Betäubungs- und Reizstoffgeschosse ohne Prüfzeichen) sind verboten, aber nicht strafbewehrt.'] },
  reizDef: { t: 'Reizstoffsprühgeräte', law: ['reizDef', 'v135', 'jugendReiz'], merk: ['Reizstoff-Reichweite bis 2 m.', 'Erlaubt nur mit amtlicher Zulassung, begrenzter Reichweite und Sprühdauer und amtlichem Prüfzeichen – sonst verboten (Nr. 1.3.5).'], hin: ['Geprüfte Reizstoffsprühgeräte: Umgang ab 14 (§ 3 Abs. 2), Führen erlaubt – aber nicht bei öffentlichen Veranstaltungen (Straftat § 52 Abs. 3 Nr. 9) und im Fernverkehr (§ 42b).', 'Tierabwehrsprays ohne Prüfzeichen, die ausschließlich gegen Tiere bestimmt sind, sind keine Waffen; im Zweifel BKA-Feststellung (§ 2 Abs. 5).'] },
  eigDef: { t: 'Elektroimpulsgeräte', law: ['eigDef', 'v136', 'v144'], merk: ['Kontaktgeräte mit amtlicher Zulassung und Prüfzeichen: erlaubnisfreie Waffe ab 18.', 'Ohne Prüfzeichen: verboten (Nr. 1.3.6).', 'Distanz-Elektroimpulsgeräte (Taser): immer verboten.'] },
  armbrustDef: { t: 'Armbrüste', law: ['armbrustDef', 'freiFuehren'], merk: ['Schusswaffen gleichgestellt; erlaubnisfrei Erwerb, Besitz und Führen ab 18.'], hin: ['Schießen außerhalb von Schießstätten ohne Erlaubnis: OWi (§ 53 Abs. 1 Nr. 3), da Armbrüste regelmäßig über 7,5 J liegen.', 'Als Waffe: Führverbot bei öffentlichen Veranstaltungen (Straftat) und im Fernverkehr.'] },
  schusswaffe: { t: 'Schusswaffe', law: ['schusswaffe', 'armbrustDef'], merk: ['Bestimmung zu Angriff, Verteidigung, Signal, Jagd, Distanzinjektion, Markierung, Sport oder Spiel.', 'Geschosse werden durch einen Lauf getrieben.'], hin: ['Pfeilbogen haben keinen Lauf und keine Sperrvorrichtung – keine Schusswaffen.'] },
  kw: { t: 'Kriegswaffen', law: ['kw57', 'kwDef', 'kw22a', 'kw22ar'], merk: ['Gegenstände der Kriegswaffenliste (Anlage zum KrWaffKontrG), z. B. Maschinenpistolen, Sturmgewehre, Handgranaten, Panzerfäuste.'], hin: ['Das WaffG gilt nicht (§ 57 Abs. 1); Strafbarkeit allein nach § 22a KrWaffKontrG (Verbrechen, 1 bis 5 Jahre).', 'Freiwillige, unverzügliche Ablieferung kann Straffreiheit bewirken (§ 22a Abs. 5).'] },
  alter: { t: 'Altersgrenzen', law: ['alter', 'jugendReiz', 'kinderJug', 'p53_1'], merk: ['Umgang mit Waffen grundsätzlich ab 18 (§ 2 Abs. 1).', 'Geprüfte Reizstoffsprühgeräte ab 14 (§ 3 Abs. 2); Ausbildung/Arbeit unter Aufsicht (§ 3 Abs. 1); behördliche Ausnahmen (§ 3 Abs. 3).'], hin: ['Messer ohne Waffeneigenschaft haben keine Altersgrenze.', 'Erwerb/Besitz erlaubnisfreier Waffen unter 18: OWi § 53 Abs. 1 Nr. 1.', 'Kinder unter 14: schuldunfähig (§ 19 StGB) bzw. nicht vorwerfbar (§ 12 Abs. 1 OWiG) – Überlassenden prüfen (§ 34).'] },
  vorsatz: { t: 'Vorsatz, Fahrlässigkeit, Irrtum', law: ['s15', 's16', 's17', 'o10', 'o11'], merk: ['Vorsatz: Wissen und Wollen aller Tatumstände – Art und Beschaffenheit des Gegenstands (Öffnungsmechanismus, Klingenlänge, Joule, Zulassungszeichen), Ort, Fehlen der Erlaubnis. Eventualvorsatz genügt.', 'Fahrlässigkeit nur strafbar, wo das Gesetz es bestimmt (§ 52 Abs. 4, § 51 Abs. 4); Ordnungswidrigkeiten nach § 53 auch fahrlässig.'], hin: ['Irrtum über Tatumstände (z. B. „dachte, die Klinge sei kürzer“): kein Vorsatz (§ 16 StGB) – Fahrlässigkeit prüfen.', 'Irrtum über das Verbot („wusste nicht, dass Butterflymesser verboten sind“): Verbotsirrtum (§ 17 StGB), in der Regel vermeidbar – Erkundigungspflicht.', 'Beweisanzeichen dokumentieren: Erwerbsweg, Verpackung, Hinweise des Verkäufers, Einlassung.'] },
  konkurrenz: { t: 'Konkurrenzen', law: ['s52', 'o19', 'o21'], merk: ['Mehrere Straftatbestände durch dieselbe Handlung: Tateinheit, Strafe aus dem schwersten Gesetz.', 'Straftat und OWi: nur das Strafgesetz; die OWi kann geahndet werden, wenn keine Strafe verhängt wird.', 'Mehrere OWi durch dieselbe Handlung: eine Geldbuße.'], hin: ['Besitz und Führen derselben Waffe: einheitliches Dauerdelikt.'] },
  einzug: { t: 'Einziehung (§ 54)', law: ['einzug'], merk: ['Zwingend bei §§ 51, 52 Abs. 1, 2, Abs. 3 Nr. 1 bis 3, Abs. 5.', 'Im Übrigen (sonstige Straftaten nach § 52, OWi nach § 53) möglich.'], hin: ['Sicherstellung/Beschlagnahme vor Ort nach StPO bzw. Polizeirecht.'] },
  ausnahme: { t: 'Behördliche Ausnahmen', law: ['bka40', 'ausn12'], merk: ['Verbotene Waffen: behördlicher oder gerichtlicher Auftrag (§ 40 Abs. 2), Ausnahme des BKA (§ 40 Abs. 4).', 'Erlaubnispflicht: Ausnahmen nach § 12 Abs. 1 bis 4, Einzelfallausnahme (§ 12 Abs. 5).', 'Veranstaltungen: Ausnahme der Behörde (§ 42 Abs. 2).'] },
  fund: { t: 'Fund und Erbe', law: ['fund40', 'fund37c'], merk: ['Verbotene Waffen: unverzügliche Anzeige; das Verbot wird während der behördlichen Frist nicht wirksam (§ 40 Abs. 5).', 'Erlaubnispflichtige Waffen: unverzügliche Anzeige (§ 37c Abs. 1); Erben: WBK binnen eines Monats beantragen (§ 20).'] },
  verbot41: { t: 'Waffenverbot im Einzelfall (§ 41)', law: ['verbot41', 'p52_3_8'], merk: ['Vollziehbare Untersagung von Erwerb und Besitz – auch erlaubnisfreier Waffen.'], hin: ['Zuwiderhandlung: Straftat nach § 52 Abs. 3 Nr. 8; im Nationalen Waffenregister abfragen.'] },
  s32: { t: 'Notwehr', law: ['s32'], hin: ['Rechtfertigt die Verteidigungshandlung (z. B. den Schuss), nicht den vorangehenden unerlaubten Besitz oder das Führen.'] },
  ueberl34: { t: 'Überlassen an Berechtigte (§ 34)', law: ['ueberl34'], see: ['ueberlassen'] },
  erlPflicht: { t: 'Erlaubnispflicht (Anlage 2 Abschn. 2 UA 1)', law: ['erlPflicht'], merk: ['Erlaubnispflichtig ist der Umgang – außer Überlassen – mit Schusswaffen und der dafür bestimmten Munition, soweit nicht freigestellt.'], hin: ['Tragbare Gegenstände (Messer, Hieb- und Stoßwaffen, Reizstoff- und Elektroimpulsgeräte) sind nie erlaubnispflichtig – sie sind erlaubnisfrei oder verboten.'] },
  verboten: { t: 'Verbotene Waffen (Anlage 2 Abschn. 1)', law: ['p52_3_1', 'p52_1'], merk: ['Der Umgang ist verboten (§ 2 Abs. 3) – auch Besitz zu Hause.'], hin: ['Strafrahmen nach Nummer: § 51 (Vollautomaten, bestimmte Pumpguns), § 52 Abs. 1 Nr. 1 (Nr. 1.1, 1.3.4), § 52 Abs. 3 Nr. 1 (übrige).', 'Einziehung zwingend (§ 54 Abs. 1).'] }
};
const WF_TIP_ALIAS = { springDef: 'v141', fallDef: 'v141', v132: 'verboten', v133: 'verboten', v134: 'verboten', v135: 'reizDef', v136: 'eigDef', v137: 'verboten', v138: 'verboten', v144: 'eigDef', nachbildung: 'anschein', p52_3_1: 'verboten', faust40: 'faustDef', schiessFrei: 'schiessen', mitnehmen: 'verbringen', bearbeiten: 'herstellen', ausweis38: 'waffenschein', kwDef: 'kw', kw57: 'kw', kw22a: 'kw', s15: 'vorsatz', s16: 'vorsatz', s17: 'vorsatz', o10: 'vorsatz', o11: 'vorsatz', s52: 'konkurrenz', o19: 'konkurrenz', o21: 'konkurrenz', fund40: 'fund', fund37c: 'fund', bka40: 'ausnahme', f42b: 'f42b', bahn42b: 'f42b', zoneAusn: 'zone', veranstAusn: 'veranst', p53_21: 'f42a', p53_23: 'zone', p53_1: 'alter', jugendReiz: 'alter', kinderJug: 'alter', p53_3: 'schiessen', p53_16: 'ueberlassen', p52_3_7: 'aufbew', p52_3_8: 'verbot41', p52_3_2: 'erlPflicht', p52_1_2b: 'automatik', p51: 'v1211', frei13: 'srsDef' };

/* ---------- Prüfstand: Oberfläche ---------- */
const WF_LEVEL = {
  erlaubt: { label: 'Kein Verstoß', short: 'Erlaubt', c: COLORS.lime },
  hinweis: { label: 'Einzelfallprüfung', short: 'Einzelfall', c: COLORS.blau },
  owi: { label: 'Ordnungswidrigkeit', short: 'OWi', c: COLORS.gelb },
  straftat: { label: 'Straftat', short: 'Straftat', c: COLORS.koralle }
};
const O = (value, label, desc, i) => ({ value, label, desc, i });
const WF_OBJ = [
  O('messer', 'Messer / Klinge', 'Einhand-, Spring-, Butterfly-, feststehende Messer …', 'waffe'),
  O('schuss', 'Scharfe Schusswaffe', 'Pistole, Revolver, Gewehr, Vollautomat, Teile', 'erlPflicht'),
  O('srs', 'Schreckschuss / Reizstoff / Signal', 'SRS-Waffen mit oder ohne PTB-Zeichen', 'srsDef'),
  O('druck', 'Druckluft / CO₂ / Softair', 'Luftgewehr, Luftpistole, Softair', 'frei11'),
  O('hist', 'Antik-, Deko- & Salutwaffen', 'Vorderlader vor 1871, Dekowaffen, Salutwaffen', 'freiAntik'),
  O('munition', 'Munition', 'Patronen, Kartuschen, verbotene Munition', 'munErl'),
  O('hieb', 'Hieb-, Stoß- & Schlagwaffen', 'Schlagstock, Teleskop, Dolch, Schlagring, Nun-Chaku …', 'hieb'),
  O('sonst', 'Reizstoff, Elektroimpuls & Sonstige', 'Pfefferspray, Elektroschocker, Taser, Armbrust, Zwille, Molotow …', 'reizDef'),
  O('anschein', 'Anscheinswaffe / Nachbildung', 'Softair bis 0,5 J, Attrappen, Spielzeug', 'anschein'),
  O('kriegswaffe', 'Kriegswaffe', 'Sturmgewehr, MP, Handgranate (KrWaffKontrG)', 'kw')
];
const WF_ITEMS = {
  messer: ['messer', 'Bauart', [O('einhand', 'Einhandmesser', 'Klinge einhändig feststellbar (Daumenpin, Flipper)', 'f42a'), O('feststehend', 'Feststehendes Messer', 'Küchen-, Jagd-, Outdoor- oder Kampfmesser', 'f42a'), O('klapp', 'Zweihand-Klappmesser', 'nur beidhändig zu öffnen', 'messer4a'), O('multi', 'Taschenmesser / Multitool', 'kleines Klappmesser, Werkzeug', 'messer4a'), O('spring', 'Springmesser', 'Klinge schnellt auf Knopfdruck heraus', 'v141'), O('fall', 'Fallmesser', 'Klinge fällt durch Schwerkraft heraus', 'v141'), O('faust', 'Faustmesser', 'Griff quer zur Klinge', 'faustDef'), O('butterfly', 'Butterfly / Balisong', 'zweigeteilter, schwenkbarer Griff', 'butterflyDef'), O('getarnt', 'Getarntes Messer', 'Gürtelschnalle, Kugelschreiber, Kreditkarte', 'v131')]],
  schuss: ['schuss', 'Waffenart', [O('kurzHalb', 'Pistole (halbautomatisch)', 'Selbstladepistole für Patronenmunition', 'automatik'), O('kurzSonst', 'Revolver / sonstige Kurzwaffe', 'Revolver, Repetier-, Einzellader-Kurzwaffe', 'langkurz'), O('lang', 'Langwaffe', 'Büchse, Flinte – auch halbautomatisch', 'langkurz'), O('voll', 'Vollautomat', 'Dauerfeuer – § 51', 'v1211'), O('pump', 'Pumpgun mit Pistolengriff', 'oder < 95 cm / Lauf < 45 cm – § 51', 'v1211'), O('getarnt', 'Getarnte / verkürzbare Schusswaffe', 'Kugelschreiber-, Koppelschloss-, Stockpistole', 'v122'), O('teil', 'Wesentliches Teil / Schalldämpfer', 'Lauf, Verschluss, Gehäuse, Griffstück', 'teile')]],
  srs: ['srs', 'Kennzeichnung', [O('ptb', 'Mit Zulassungszeichen (PTB im Kreis)', 'oder EU-konform nach RL 2019/69', 'srsDef'), O('ohne', 'Ohne Zulassungszeichen', 'z. B. Import ohne Zulassung', 'srsDef')]],
  druck: ['druck', 'Energie und Kennzeichnung', [O('spiel05', 'Softair bis 0,5 J', 'Spielzeug-Energie', 'spiel'), O('f75', 'Bis 7,5 J mit „F im Fünfeck“', 'erlaubnisfrei Erwerb und Besitz', 'frei11'), O('alt70', 'Hergestellt vor 1970', 'ohne F-Zeichen, Altbestand', 'druckDef'), O('ueber75', 'Über 7,5 J', 'erlaubnispflichtig', 'erlPflicht')]],
  hist: ['hist', 'Art', [O('lunte', 'Lunten- / Funkenschloss', 'Modell vor 1871', 'freiAntik'), O('perk', 'Perkussions-Einzellader, einläufig', 'Vorderlader mit Zündhütchen, Modell vor 1871', 'freiAntik'), O('zuend', 'Zündnadelwaffe', 'Modell vor 1871', 'freiAntik'), O('perkMehr', 'Perkussionsrevolver / mehrläufig', 'nicht freigestellt', 'freiAntik'), O('deko', 'Dekowaffe', 'mit EU-Deaktivierungsbescheinigung', 'dekoDef'), O('salut', 'Salutwaffe', 'umgebaut für Kartuschen', 'salutDef')]],
  munition: ['mun', 'Munitionsart', [O('patrone', 'Patronenmunition', 'für erlaubnispflichtige Schusswaffen', 'munErl'), O('kartusche', 'Kartuschen für SRS', 'mit Prüfzeichen', 'munErl'), O('verboten', 'Verbotene Munition', 'Hartkern, Leuchtspur, Brand, Spreng, Treibspiegel', 'v15'), O('reizGeschoss', 'Reizstoff-/Betäubungsgeschosse', 'ohne Prüfzeichen (Nr. 1.5.1/1.5.2)', 'v15'), O('kw', 'Kriegswaffenmunition', 'Kriegswaffenliste', 'kw')]],
  hieb: ['hieb', 'Gegenstand', [O('schlagstock', 'Schlagstock', 'Hieb- und Stoßwaffe', 'hieb'), O('teleskop', 'Teleskopschlagstock', 'BGH 3 StR 81/22: kein Totschläger', 'hieb'), O('blank', 'Dolch, Bajonett, Schwert, Säbel', 'auch Wurfmesser', 'hieb'), O('schlagring', 'Schlagring / Totschläger / Stahlrute', 'verboten', 'verboten'), O('nunchaku', 'Nun-Chaku', 'Würgeholz – verboten', 'verboten'), O('wurfstern', 'Wurfstern', 'verboten', 'verboten'), O('getarnt', 'Getarnte Hieb-/Stoßwaffe', 'Stockdegen, Gürtelschnallendolch', 'v131')]],
  sonst: ['sonst', 'Gegenstand', [O('reizPtb', 'Reizstoffsprühgerät mit Prüfzeichen', 'Pfeffer-/CS-Spray, ab 14', 'reizDef'), O('reizOhne', 'Reizstoffgerät ohne Prüfzeichen', 'gegen Menschen bestimmt – verboten', 'reizDef'), O('tierSpray', 'Tierabwehrspray', 'nur gegen Tiere bestimmt', 'reizDef'), O('eigPtb', 'Elektroschocker mit Prüfzeichen', 'Kontaktgerät', 'eigDef'), O('eigOhne', 'Elektroschocker ohne Prüfzeichen', 'verboten', 'eigDef'), O('taser', 'Distanz-Elektroimpulsgerät', 'Taser – immer verboten', 'eigDef'), O('tierEig', 'Elektroimpulsgerät gegen Tiere', 'ohne Prüfzeichen, kein Viehtreiber', 'eigDef'), O('armbrust', 'Armbrust', 'Schusswaffen gleichgestellt', 'armbrustDef'), O('schleuder', 'Präzisionsschleuder', 'Zwille mit Armstütze – verboten', 'verboten'), O('brand', 'Brand- / Sprengvorrichtung', 'Molotow-Cocktail u. ä.', 'verboten'), O('bogen', 'Bogen, Blasrohr, Harpune', 'nicht oder kaum erfasst', 'schusswaffe')]],
  anschein: ['anschein', 'Art', [O('softair', 'Softair bis 0,5 J, täuschend echt', 'Anscheinswaffe', 'anschein'), O('nachbildung', 'Nachbildung / Attrappe', 'nicht schießfähig', 'anschein'), O('spielzeug', 'Erkennbares Spielzeug', 'Neonfarben, ±50 % Größe', 'anschein')]]
};
const WF_HANDLUNG_OPTS = [O('besitz', 'Besitz', 'tatsächliche Gewalt, z. B. zu Hause', 'besitz'), O('erwerb', 'Erwerb', 'tatsächliche Gewalt erlangen – auch kurz', 'erwerb'), O('fuehren', 'Führen', 'außerhalb der eigenen Räume dabeihaben', 'fuehren'), O('ueberlassen', 'Überlassen', 'einem anderen die Gewalt einräumen', 'ueberlassen'), O('schiessen', 'Schießen', 'Geschosse, Kartuschen, Reizstoff, Pyrotechnik', 'schiessen'), O('verbringen', 'Verbringen / Mitnehmen', 'über die Grenze', 'verbringen'), O('herstellen', 'Herstellen / Bearbeiten', 'bauen, umbauen, verkürzen, instand setzen', 'herstellen'), O('handel', 'Handel treiben', 'gewerbsmäßig ankaufen, feilhalten, vermitteln', 'handel'), O('aufbewahrung', 'Aufbewahrung', 'Sicherung gegen Abhandenkommen', 'aufbew')];
const WF_ORT_OPTS = [O('oeffentlich', 'Öffentlicher Raum', 'Straße, Park, Auto', 'fuehren'), O('veranstaltung', 'Öffentliche Veranstaltung', 'Volksfest, Markt, Kino, Disko, Stadion – § 42', 'veranst'), O('fernverkehr', 'Personenfernverkehr', 'ICE/IC, Fernbus, Fernbahnhof – § 42b', 'f42b'), O('zone', 'Verbotszone / ÖPNV-Verordnung', 'Landesverordnung – § 42 Abs. 5', 'zone'), O('fremd', 'Fremde Wohnung / Grundstück', 'mit Zustimmung – § 12 Abs. 3 Nr. 1', 'fremd'), O('eigen', 'Eigene Wohnung / Grundstück', 'kein Führen, nur Besitz', 'fuehren')];
const WF_ZUGRIFF_OPTS = [O('zugriff', 'Zugriffsbereit', 'griffbereit am Körper, in Jacke, Handschuhfach', 'zugriffsbereit'), O('nicht', 'Nicht zugriffsbereit', 'Messer: mehr als 3 Handgriffe', 'zugriffsbereit'), O('behaeltnis', 'Verschlossenes Behältnis', 'abgeschlossen (Schloss, Plombe)', 'behaeltnis')];
const WF_ZWECK_OPTS = [O('keiner', 'Kein besonderer Zweck', '', null), O('beruf', 'Berufsausübung', 'Handwerk, Gewerbe, Dienst', 'f42a'), O('sport', 'Sport, Jagd, Brauchtum', '', 'f42a'), O('anerkannt', 'Allgemein anerkannter Zweck', 'Wandern, Angeln, Picknick, Camping', 'f42a'), O('gastro', 'Gastronomie', 'Betrieb, Personal, Gäste', 'messer4a'), O('film', 'Foto, Film, Theater', '', 'f42a'), O('rettung', 'Rettungs-/Einsatzkräfte', 'Zivil- und Katastrophenschutz', 'messer4a'), O('anliefer', 'Anlieferverkehr', '', 'messer4a'), O('hausrecht', 'Zustimmung des Hausrechtsinhabers', 'z. B. Verkehrsunternehmen', 'f42b')];
const WF_SCHUSSORT_OPTS = [O('stand', 'Schießstätte', 'zugelassene Anlage – § 27', 'schiessen'), O('besitztum', 'Befriedetes Besitztum', 'eigener Garten mit Zustimmung', 'schiessen'), O('sonst', 'Sonstiger Ort', 'öffentlich, Feld, Silvester auf der Straße', 'schiessen'), O('notwehr', 'Notwehrlage', '§ 32 StGB', 's32')];
const WF_GRENZE_OPTS = [O('rein', 'Nach / durch Deutschland', '', 'verbringen'), O('eu', 'Aus Deutschland in einen EU-/Schengen-Staat', '', 'verbringen'), O('dritt', 'In einen Drittstaat', '', 'verbringen')];
const WF_ERL_OPTS = [O('keine', 'Keine Erlaubnis', '', null), O('wbk', 'WBK / Munitions\u00aderwerbs\u00adschein', 'nur Erwerb und Besitz', 'wbk'), O('waffenschein', 'Waffenschein', 'auch Führen', 'waffenschein'), O('jagd', 'Jagdschein (Jäger)', '§ 13', 'jagd')];
const WF_HANDLUNG = Object.fromEntries(WF_HANDLUNG_OPTS.map(o => [o.value, o.label]));
const wf = { st: WF_DEFAULT(), res: null, gen: '', text: '', edited: false, title: '', ver: 1, drawn: 0, histHtml: null, savedSig: '', savedId: null, open: new Set() };
const wfCm = v => Number(v).toFixed(1).replace('.', ',');
const wfCtx = st => { const o = WF_OBJ.find(x => x.value === st.obj) || WF_OBJ[0]; return st.obj === 'kriegswaffe' ? o.label : `${o.label} · ${WF_HANDLUNG[st.handlung] || ''}`; };
const wfIsSchuss = s => ['schuss', 'srs', 'druck', 'hist'].includes(s.obj) || (s.obj === 'sonst' && s.sonst === 'armbrust');
function wfRecalc() {
  wf.res = wfAnalyze(wf.st);
  wf.gen = wfReport(wf.st, wf.res);
  if (!wf.edited) wf.text = wf.gen;
}
wfRecalc();

const wfI = (key, label) => key && (WF_TIPS[key] || WF_LAW[key]) ? `<button type="button" class="wf-i" data-info="${key}" aria-label="Erläuterung: ${esc(label || '')}"><span aria-hidden="true">i</span></button>` : '';
const wfOpt = (key, o) => `<div class="wf-optw${o.i ? ' has-i' : ''}"><button type="button" class="wf-opt" data-wk="${key}" data-wv="${o.value}" aria-pressed="${wf.st[key] === o.value}"><span class="wf-opt-dot" aria-hidden="true"></span><span class="wf-opt-txt"><span class="wf-opt-l">${esc(o.label)}</span>${o.desc ? `<span class="wf-opt-d">${esc(o.desc)}</span>` : ''}</span></button>${wfI(o.i, o.label)}</div>`;
const wfChoice = (key, opts, cls = '') => `<div class="wf-choice ${cls}" role="group">${opts.map(o => wfOpt(key, o)).join('')}</div>`;
const wfToggle = (label, key, info, yes = 'Ja', no = 'Nein') => `<div class="wf-toggle"><span class="wf-toggle-l">${esc(label)}${wfI(info, label)}</span><div class="seg wf-seg" role="group" aria-label="${esc(label)}">${[[true, yes], [false, no]].map(([v, l]) => `<button type="button" data-wk="${key}" data-wv="${v}" aria-pressed="${wf.st[key] === v}">${esc(l)}</button>`).join('')}</div></div>`;
const wfEnumSeg = (label, key, opts, info) => `<div class="wf-toggle"><span class="wf-toggle-l">${esc(label)}${wfI(info, label)}</span><div class="seg wf-seg" role="group" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" data-wk="${key}" data-wv="${v}" aria-pressed="${wf.st[key] === v}">${esc(l)}</button>`).join('')}</div></div>`;
const wfBox = (...parts) => { const p = parts.filter(Boolean); return p.length ? `<div class="wf-box">${p.join('')}</div>` : ''; };
const wfSub = t => `<span class="wf-box-l">${esc(t)}</span>`;
const wfThr = () => wf.st.messer === 'spring' ? 8.5 : 12;
const wfLenHtml = () => `${wfCm(wf.st.len)}<small> cm</small>`;
function wfSlider() {
  const s = wf.st, thr = wfThr(), over = s.len > thr;
  return wfBox(`<div class="wf-len-top"><label for="wfLen">Klingenlänge</label><span class="wf-len mono${over ? ' over' : ''}" id="wfLenVal">${wfLenHtml()}</span></div>`,
    `<div class="wf-range-wrap${over ? ' over' : ''}" style="--thr:${((thr - 2) / 28).toFixed(4)}"><i class="wf-thr" aria-hidden="true"></i><input type="range" class="wf-range" id="wfLen" min="2" max="30" step="0.5" value="${s.len}" style="--f:${((s.len - 2) / 28).toFixed(4)}" aria-valuetext="${wfCm(s.len)} Zentimeter"></div>`,
    `<div class="wf-scale"><span>2</span><span>Grenze ${wfCm(thr)} cm</span><span>30</span></div>`,
    s.messer === 'spring' ? wfToggle('Zweiseitig geschliffen?', 'beidseitig', 'v141') : wfToggle('Als Waffe konstruiert (Dolch, Stilett, Bajonett, Kampfmesser)?', 'dolch', 'hieb'));
}
function wfFormHtml() {
  const s = wf.st, secs = [];
  secs.push(['Was liegt vor?', 'waffe', wfChoice('obj', WF_OBJ, 'wf-objs')]);
  const it = WF_ITEMS[s.obj];
  if (it) {
    const [key, title, opts] = it;
    let b = wfChoice(key, opts);
    if (s.obj === 'messer') {
      if (s.messer === 'spring') b += wfSub('Öffnung und Ausnahme') + wfChoice('springOeffnung', [O('seitlich', 'Klinge springt seitlich heraus', 'ausnahmefähig bis 8,5 cm, einseitig', 'v141'), O('frontal', 'Klinge springt frontal heraus (OTF)', 'ausnahmslos verboten', 'v141')], 'wf-sub') + wfChoice('springGrund', [O('keiner', 'Kein besonderer Grund', ''), O('einhaendig', 'Berechtigtes Interesse an einhändiger Nutzung', 'z. B. Behinderung, Rettungsdienst', 'v141'), O('beruf', 'Umgang im Zusammenhang mit der Berufsausübung', '', 'v141')], 'wf-sub');
      if (s.messer === 'spring' || s.messer === 'feststehend') b += wfSlider();
      if (s.messer === 'faust') b += wfBox(wfToggle('Jäger oder Leder/Pelz verarbeitender Beruf – zur Tätigkeit benötigt?', 'faustAusn', 'faustDef'));
    }
    if (s.obj === 'schuss' && s.schuss === 'teil') b += wfBox(wfToggle('Teil einer halbautomatischen Kurzwaffe?', 'teilHalb', 'teile'));
    if (s.obj === 'druck' && s.druck === 'spiel05') b += wfBox(wfToggle('Sieht täuschend echt aus (wie eine Feuerwaffe)?', 'echt', 'anschein'));
    secs.push([title, it[2][0].i, b]);
  }
  if (s.obj !== 'kriegswaffe') {
    const hs = WF_HANDLUNG_OPTS.filter(o => (o.value !== 'schiessen' || wfIsSchuss(s)) && (o.value !== 'aufbewahrung' || wfIsSchuss(s) || s.obj === 'munition'));
    secs.push(['Handlung (Umgangsart)', 'umgang', wfChoice('handlung', hs)]);
  } else secs.push(['Handlung', 'kw', wfChoice('handlung', WF_HANDLUNG_OPTS.filter(o => !['schiessen', 'aufbewahrung'].includes(o.value)))]);
  const H = s.handlung;
  if (H === 'fuehren' && s.obj !== 'munition') {
    let b = wfChoice('ort', WF_ORT_OPTS);
    if (s.ort !== 'eigen') {
      b += wfSub('Zugriff') + wfChoice('zugriff', WF_ZUGRIFF_OPTS, 'wf-sub');
      if (wfIsSchuss(s)) b += wfBox(wfToggle('Geladen (schussbereit)?', 'geladen', 'schussbereit'));
      b += wfSub('Zweck / Anlass') + wfChoice('zweck', WF_ZWECK_OPTS, 'wf-sub wf-compact');
    }
    secs.push(['Ort, Zugriff & Zweck', 'fuehren', b]);
  } else if (H === 'schiessen') secs.push(['Wo wird geschossen?', 'schiessen', wfChoice('schussOrt', WF_SCHUSSORT_OPTS) + wfBox(wfToggle('Schießerlaubnis (§ 10 Abs. 5) vorhanden?', 'schiessErl', 'schiessen'))]);
  else if (H === 'ueberlassen') secs.push(['Empfänger', 'ueberlassen', wfBox(wfToggle('Empfänger berechtigt (Erlaubnis, Alter, kein Waffenverbot)?', 'empfBer', 'ueberl34'))]);
  else if (H === 'verbringen') secs.push(['Grenze', 'verbringen', wfChoice('grenze', WF_GRENZE_OPTS) + wfBox(wfToggle('Erlaubnis (§ 29, § 32, Feuerwaffenpass) vorhanden?', 'grenzErl', 'verbringen'))]);
  else if (H === 'herstellen' || H === 'handel') secs.push(['Gewerbe & Erlaubnis', H, wfBox(H === 'herstellen' ? wfToggle('Gewerbsmäßig?', 'gewerbe', 'herstellen') : '', wfToggle(`Erlaubnis nach ${H === 'handel' || s.gewerbe ? '§ 21' : '§ 26'} vorhanden?`, 'herstErl', H))]);
  else if (H === 'aufbewahrung') secs.push(['Aufbewahrung', 'aufbew', wfBox(wfToggle('Vorkehrungen nicht getroffen und dadurch Gefahr des Abhandenkommens oder unbefugten Zugriffs?', 'gefahr', 'aufbew'))]);
  const erlRel = ['schuss', 'munition'].includes(s.obj) || (s.obj === 'srs' && s.srs === 'ohne') || (s.obj === 'druck' && s.druck !== 'spiel05') || (s.obj === 'hist' && s.hist !== 'lunte' && s.hist !== 'deko') || (H === 'fuehren' && ['fernverkehr', 'zone'].includes(s.ort));
  const per = [];
  if (erlRel && s.obj !== 'kriegswaffe') per.push(wfSub('Waffenrechtliche Erlaubnis') + wfChoice('erlaubnis', WF_ERL_OPTS, 'wf-sub wf-compact'));
  const box = [];
  if (s.erlaubnis === 'jagd' && erlRel && wfIsSchuss(s)) box.push(wfToggle('Im Zusammenhang mit Jagd, Jagd- oder Forstschutz?', 'jagdZweck', 'jagd'));
  if (s.obj === 'srs' && s.srs === 'ptb' && (H === 'fuehren' || H === 'schiessen')) box.push(wfToggle('Kleiner Waffenschein vorhanden?', 'kws', 'kwsDef'));
  box.push(wfToggle(s.obj === 'kriegswaffe' ? 'Genehmigung nach dem KrWaffKontrG?' : 'Behördliche Ausnahme / Genehmigung für genau diesen Umgang?', 'ausnahme', s.obj === 'kriegswaffe' ? 'kw' : 'ausnahme'));
  if (['besitz', 'erwerb', 'aufbewahrung'].includes(H) && s.obj !== 'kriegswaffe') box.push(wfToggle('Als Erbe oder Finder in Besitz genommen und unverzüglich angezeigt?', 'fund', 'fund'));
  if (s.obj !== 'kriegswaffe' && !['messer', 'anschein'].includes(s.obj)) box.push(wfToggle('Behördliches Waffenverbot (§ 41) besteht?', 'verbot41', 'verbot41'));
  per.push(wfBox(...box));
  secs.push(['Erlaubnisse & Ausnahmen', 'ausnahme', per.join('')]);
  secs.push(['Person & Vorsatz', 'vorsatz', wfBox(wfEnumSeg('Alter', 'alter', [['erw', '18+'], ['jug', '14–17'], ['kind', 'unter 14']], 'alter'), wfEnumSeg('Schuldform', 'vorsatz', [['vorsatz', 'Vorsatz'], ['fahrl', 'Fahrlässig']], 'vorsatz'))]);
  return secs.map(([t, i, b], n) => `<section class="wf-sec"><div class="wf-sec-head"><span class="wf-sec-n mono">${pad(n + 1)}</span><h3 class="wf-sec-t">${esc(t)}</h3>${wfI(i, t)}</div>${b}</section>`).join('');
}

function renderWfLive() {
  const el = $('#wfLive'), r = wf.res, L = WF_LEVEL[r.level];
  el.style.setProperty('--c', L.c);
  el.innerHTML = `<span class="wf-live-dot" aria-hidden="true"></span><span class="wf-live-l">${esc(L.label)}</span><span class="wf-live-v">${esc(r.verdict)}</span><span class="wf-live-go">Ergebnis${ico('chev')}</span>`;
  el.setAttribute('aria-label', `Ergebnis: ${L.label} – ${r.verdict}. Zum Ergebnis springen`);
  const say = `${L.label}: ${r.verdict}`, an = $('#wfSay');
  if (an.textContent !== say) an.textContent = say;
}
function wfStaleUi() { const b = $('#wfRegen'); if (b) b.hidden = !(wf.edited && wf.text !== wf.gen); }
const wfLawChips = keys => [...new Set(keys || [])].filter(k => WF_LAW[k]).map(k => `<button type="button" class="wf-law" data-info="${k}">${esc(WF_LAW[k].ref.replace(' WaffG', '').replace(/^Anlage (\d) Abschnitt (\d+)/, 'Anl. $1 Abschn. $2').replace('Unterabschnitt', 'UA'))}</button>`).join('');
function wfSubsumHtml(f, i) {
  const L = WF_LEVEL[f.level], s = wf.st, viol = f.level === 'straftat' || f.level === 'owi';
  const norm = f.pen ? f.pen.norm : '';
  const tat = wfActPhrase(s, wf.res.H);
  const ober = viol ? `Die Person könnte ${f.level === 'owi' ? 'ordnungswidrig gehandelt haben' : 'sich strafbar gemacht haben'} nach <b>${esc(norm)}</b> – ${esc(f.title)}.` : esc(f.reason);
  const rows = f.tb.map(t => `<li class="wf-tb-row"><span class="wf-tb-v ${t.v === 'ja' ? 'ja' : t.v === 'nein' ? 'nein' : 'offen'}" aria-label="${t.v === 'ja' ? 'erfüllt' : t.v === 'nein' ? 'nicht erfüllt' : 'offen'}">${t.v === 'ja' ? '+' : t.v === 'nein' ? '−' : '?'}</span><span class="wf-tb-main"><span class="wf-tb-m">${esc(t.m)}</span><span class="wf-tb-s">${esc(t.s || '')}</span>${t.law && t.law.length ? `<span class="wf-laws">${wfLawChips(t.law)}</span>` : ''}</span></li>`).join('');
  const subj = !viol ? '' : f.level === 'owi' ? 'Vorsatz oder Fahrlässigkeit (§ 53 Abs. 1, § 10 OWiG). Irrtum über Tatumstände: § 11 Abs. 1 OWiG; fehlende Unrechtseinsicht: § 11 Abs. 2 OWiG.'
    : s.vorsatz === 'fahrl' ? `Fahrlässigkeit: Sorgfaltspflichtverletzung bei Erkennbarkeit der Umstände – strafbar, ${esc(f.folge)}.` : 'Vorsatz (§ 15 StGB): Wissen und Wollen aller Tatumstände, Eventualvorsatz genügt. Irrtum über einen Tatumstand schließt den Vorsatz aus (§ 16 StGB); Unkenntnis des Verbots ist Verbotsirrtum (§ 17 StGB), meist vermeidbar.';
  const body = viol ? `<p class="wf-ober">${ober}</p>
      <span class="wf-gk">I. Objektiver Tatbestand</span><ol class="wf-tb">${rows}</ol>
      <span class="wf-gk">II. Subjektiver Tatbestand</span><p class="wf-gp">${subj} ${wfI('vorsatz', 'Vorsatz')}</p>
      <span class="wf-gk">III. Rechtswidrigkeit und Schuld</span><p class="wf-gp">Rechtfertigungsgründe (z. B. Notwehr, § 32 StGB) decken regelmäßig nur die Abwehrhandlung, nicht den Besitz oder das Führen. Schuld: Alter (§ 19 StGB, JGG), Verbotsirrtum (§ 17 StGB).</p>
      <span class="wf-gk">IV. Ergebnis</span><p class="wf-gp"><b>${esc(L.label)}</b> – ${esc(f.folge || '')}.</p>`
    : `<p class="wf-ober">${ober}</p>${rows ? `<ol class="wf-tb">${rows}</ol>` : ''}`;
  const hints = f.hints.length ? `<ul class="wf-hints">${f.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : '';
  const laws = f.law.length ? `<span class="wf-laws wf-laws-f">${wfLawChips(f.law)}</span>` : '';
  const open = wf.open.has(f.key) || (i === 0 && !wf.open.size);
  return `<details class="wf-sb" data-fk="${esc(f.key)}" style="--c:${L.c}"${open ? ' open' : ''}><summary><span class="wf-h-dot" aria-hidden="true"></span><span class="wf-sb-t">${esc(f.title)}</span><span class="wf-sb-n mono">${esc(norm || L.short)}</span></summary><div class="wf-sb-b">${body}${hints}${laws}</div></details>`;
}
function renderWfResult() {
  const box = $('#wfRes'), r = wf.res, L = WF_LEVEL[r.level], m = r.main;
  const big = r.level === 'owi' ? 'Ordnungs&shy;widrigkeit' : r.level === 'hinweis' ? 'Einzelfall&shy;prüfung' : esc(L.label);
  box.dataset.level = r.level;
  box.style.setProperty('--c', L.c);
  const others = r.findings.length > 1 ? `<span class="f-label">Alle Prüfpunkte (${r.findings.length})</span>` : '<span class="f-label">Subsumtion</span>';
  box.innerHTML = `<div class="card-head"><div><span class="spaced">Ergebnis</span><p class="wf-ctx">${esc(wfCtx(wf.st))}</p></div><span class="pill wf-src" title="${esc(WF_STAND)}">WaffG 22.10.2026</span></div>
    <div class="wf-level">${big}</div>
    <div class="wf-meter" role="img" aria-label="Einstufung: ${esc(L.label)}">${WF_LEVEL_KEYS.map(k => `<span class="${k === r.level ? 'on' : ''}" style="--c:${WF_LEVEL[k].c}"><i></i><b>${esc(WF_LEVEL[k].short)}</b></span>`).join('')}</div>
    <h3 class="wf-verdict">${esc(m.title)}</h3>
    <dl class="wf-facts"><div><dt>${m.pen ? 'Vorschrift' : 'Grundlage'}</dt><dd class="mono">${esc(r.paragraph)}</dd></div><div><dt>Rechtsfolge</dt><dd>${esc(m.folge || '')}</dd></div></dl>
    <p class="wf-reason">${esc(m.reason)}</p>
    ${others}<div class="wf-sbs">${r.findings.map(wfSubsumHtml).join('')}</div>
    ${r.gen.length ? `<span class="f-label">Konkurrenzen & Hinweise${wfI('konkurrenz', 'Konkurrenzen')}</span><ul class="wf-hints">${r.gen.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    <span class="f-label">Prüfpfad</span>
    <ol class="wf-path">${r.path.map((p, i) => `<li class="${i === r.path.length - 1 ? 'fin' : ''}"><span>${esc(String(p).replace(/^→ /, ''))}</span></li>`).join('')}</ol>
    <div class="wf-text-head"><label class="f-label" for="wfText">Text für Anzeige / Meldung</label><button type="button" class="link wf-regen" id="wfRegen" hidden>${ico('repeat')}Neu erzeugen</button></div>
    <textarea class="input wf-text" id="wfText" spellcheck="false" rows="12"></textarea>
    <p class="wf-note">Platzhalter in eckigen Klammern ([Datum], [Personalien] …) vor der Verwendung ausfüllen. Der Text ist frei bearbeitbar.</p>
    <label class="sr" for="wfTitle">Notiz oder Aktenzeichen</label>
    <input class="input wf-title" id="wfTitle" maxlength="120" placeholder="Notiz / Aktenzeichen (optional)" autocomplete="off" spellcheck="false" enterkeyhint="done">
    <div class="wf-actions"><button type="button" class="btn btn-accent" id="wfCopy">Kopieren</button><button type="button" class="btn btn-ghost" id="wfSave">${ico('check')}Speichern</button><button type="button" class="btn btn-ghost" id="wfTodo">${ico('brief')}Als Aufgabe</button></div>`;
  $('#wfText').value = wf.text;
  $('#wfTitle').value = wf.title;
  wfStaleUi();
}
function renderWfHist() {
  const q = norm(ui.q);
  const list = state.checks.filter(c => !q || norm(`${c.title} ${c.verdict} ${c.text} ${WF_LEVEL[c.level].label}`).includes(q)).slice().reverse();
  const html = list.length ? list.map(c => {
    const L = WF_LEVEL[c.level];
    return `<li class="wf-h" style="--c:${L.c}"><button type="button" class="wf-h-row" data-check="${esc(c.id)}"><span class="wf-h-dot" aria-hidden="true"></span><span class="wf-h-main"><span class="wf-h-t">${esc(c.title || c.verdict)}</span><span class="wf-h-m">${esc(L.label)} · ${esc(wfCtx(c.st))}${c.title ? ' · ' + esc(c.verdict) : ''}</span></span><span class="wf-h-at mono">${esc(dateShort(c.at))}<br>${hm(c.at)}</span></button><button type="button" class="icon-btn sm wf-h-del" data-check-del="${esc(c.id)}" aria-label="Prüfung löschen">${ico('x')}</button></li>`;
  }).join('') : `<li class="wf-h-empty">${q ? 'Keine gespeicherte Prüfung passt zur Suche.' : 'Noch nichts gespeichert. „Speichern“ legt die Prüfung samt Text verschlüsselt im Tresor ab – mit Zeitstempel.'}</li>`;
  if (html !== wf.histHtml) { wf.histHtml = html; $('#wfHist').innerHTML = html; }
  const n = $('#wfHistN'); n.textContent = state.checks.length ? String(state.checks.length) : ''; n.hidden = !state.checks.length;
}
function renderWaffg(force) {
  if (!S) return;
  if (force || wf.drawn !== wf.ver) {
    wf.drawn = wf.ver;
    $('#wfForm').innerHTML = wfFormHtml();
    renderWfResult();
    renderWfLive();
    wfLiveVis();
  }
  renderWfHist();
}
function wfChanged() { wf.ver++; wf.open.clear(); wfRecalc(); }

/* ---------- Info-Sheet (Subsumtionshilfe) ---------- */
/** Gliedert den Wortlaut: Absätze, Nummern und Buchstaben beginnen in einer neuen Zeile. */
const WF_NOBREAK = /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Lebensjahr)/;
const wfQuoteFmt = t => t
  .replace(/ (\(\d+[a-z]?\)) /g, '\n$1 ')
  .replace(/ (\d{1,2}(?:\.\d{1,2})*[a-z]?\.) (?=(\S+))/g, (m, n, w, off, all) => WF_NOBREAK.test(w) || /(und|oder|bis|Nr\.|Nummer|Abs\.|Absatz|Satz|§)$/.test(all.slice(Math.max(0, off - 8), off)) ? m : '\n' + n + ' ')
  .replace(/ ([a-z]{1,2}\)) (?=[A-Za-zÄÖÜäöü„§])/g, '\n   $1 ')
  .replace(/ - (?=[a-zäöü])/g, '\n– ');
function wfInfoHtml(key) {
  const tip = WF_TIPS[key] || WF_TIPS[WF_TIP_ALIAS[key]] || null;
  const laws = [...new Set([...(tip && tip.law ? tip.law : []), ...(WF_LAW[key] && !(tip && tip.law && tip.law.includes(key)) ? [key] : [])])].filter(k => WF_LAW[k]);
  const title = tip ? tip.t : (WF_LAW[key] ? WF_LAW[key].ref : 'Erläuterung');
  const sec = (h, arr, cls = '') => arr && arr.length ? `<span class="f-label">${h}</span><ul class="wf-hints ${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const quotes = laws.map(k => `<figure class="wf-q"><figcaption><span class="pill pill-outline mono">${esc(WF_LAW[k].ref)}</span></figcaption><blockquote>${esc(wfQuoteFmt(WF_LAW[k].t))}</blockquote></figure>`).join('');
  const see = tip && tip.see ? `<span class="f-label">Siehe auch</span><div class="wf-see">${tip.see.filter(k => WF_TIPS[k]).map(k => `<button type="button" class="chip wf-see-b" data-info="${k}">${esc(WF_TIPS[k].t)}</button>`).join('')}</div>` : '';
  return { title, html: `${tip && tip.merk ? sec('Tatbestandsmerkmale & Voraussetzungen', tip.merk, 'wf-merk') : ''}${quotes ? `<span class="f-label">Wortlaut</span>${quotes}` : ''}${tip ? sec('Prüfhinweise & Abgrenzung', tip.hin) + sec('Rechtsprechung', tip.rspr) : ''}${see}<p class="wf-note">Wortlaut: amtliche Fassung (gesetze-im-internet.de), ${esc(WF_STAND)}. Keine Rechtsberatung.</p>` };
}
function wfOpenInfo(key) {
  const { title, html } = wfInfoHtml(key);
  $('#wiH').textContent = title;
  $('#wiBody').innerHTML = html;
  openDlg($('#wfInfoDlg'));
  $('#wfInfoDlg .sheet').scrollTop = 0;
}
$('#wiBody').addEventListener('click', e => { const b = e.target.closest('[data-info]'); if (b) { const { title, html } = wfInfoHtml(b.dataset.info); $('#wiH').textContent = title; $('#wiBody').innerHTML = html; $('#wfInfoDlg .sheet').scrollTop = 0; } });

/* ---------- Eingaben ---------- */
$('#wfForm').addEventListener('click', e => {
  const inf = e.target.closest('[data-info]'); if (inf) { wfOpenInfo(inf.dataset.info); return; }
  const b = e.target.closest('button[data-wk]'); if (!b) return;
  const k = b.dataset.wk, raw = b.dataset.wv;
  const v = raw === 'true' ? true : raw === 'false' ? false : raw;
  if (wf.st[k] === v) return;
  wf.st[k] = v;
  if (k === 'obj' || k === 'handlung') { const sel = wf.st; if (!wfIsSchuss(sel) && (sel.handlung === 'schiessen' || (sel.handlung === 'aufbewahrung' && sel.obj !== 'munition'))) sel.handlung = 'besitz'; if (sel.obj === 'kriegswaffe' && ['schiessen', 'aufbewahrung'].includes(sel.handlung)) sel.handlung = 'besitz'; }
  wfChanged(); renderWaffg();
  const nb = $(`#wfForm button[data-wk="${k}"][data-wv="${raw}"]`);
  if (nb) nb.focus({ preventScroll: true });
});
$('#wfForm').addEventListener('input', e => {
  if (e.target.id !== 'wfLen') return;
  const v = clamp(Math.round(Number(e.target.value) * 2) / 2, 2, 30);
  wf.st.len = v;
  const over = v > wfThr();
  e.target.style.setProperty('--f', ((v - 2) / 28).toFixed(4));
  e.target.setAttribute('aria-valuetext', `${wfCm(v)} Zentimeter`);
  e.target.parentElement.classList.toggle('over', over);
  const val = $('#wfLenVal'); val.innerHTML = wfLenHtml(); val.classList.toggle('over', over);
  wfChanged(); wf.drawn = wf.ver; // Formular bleibt stehen (Schieberegler nicht unterbrechen)
  renderWfResult(); renderWfLive();
});

/* Live-Leiste: zeigt das Ergebnis, solange die Ergebniskarte nicht im Blick ist */
function wfLiveVis() {
  if (document.body.dataset.area !== 'waffg') return;
  const r = $('#wfRes').getBoundingClientRect();
  $('#wfLive').classList.toggle('quiet', r.top < innerHeight - 140 && r.top + 300 > 0);
}
let wfRaf = 0;
addEventListener('scroll', () => { if (!wfRaf) wfRaf = requestAnimationFrame(() => { wfRaf = 0; wfLiveVis(); }); }, { passive: true });
addEventListener('resize', () => wfLiveVis(), { passive: true });
$('#wfLive').addEventListener('click', () => $('#wfRes').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }));

/* Ergebnis: Subsumtion, Text, Speichern, Aufgabe */
$('#wfRes').addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details.wf-sb')) return; if (d.open) wf.open.add(d.dataset.fk); else wf.open.delete(d.dataset.fk); if (!wf.open.size && !d.open) wf.open.add('__none__'); }, true);
$('#wfRes').addEventListener('input', e => {
  if (e.target.id === 'wfText') { wf.text = e.target.value; wf.edited = wf.text !== wf.gen; wfStaleUi(); }
  else if (e.target.id === 'wfTitle') wf.title = e.target.value;
});
$('#wfRes').addEventListener('keydown', e => { if (e.target.id === 'wfTitle' && e.key === 'Enter') { e.preventDefault(); wfSave(); } });
$('#wfRes').addEventListener('click', e => {
  const inf = e.target.closest('[data-info]'); if (inf) { e.preventDefault(); wfOpenInfo(inf.dataset.info); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'wfCopy') wfCopy(b);
  else if (b.id === 'wfSave') wfSave();
  else if (b.id === 'wfTodo') wfTodo();
  else if (b.id === 'wfRegen') {
    const prev = wf.text;
    wf.text = wf.gen; wf.edited = false; $('#wfText').value = wf.text; wfStaleUi();
    toast('Text neu erzeugt', { action: { label: 'Rückgängig', fn: () => { wf.text = prev; wf.edited = prev !== wf.gen; const t = $('#wfText'); if (t) t.value = prev; wfStaleUi(); } } });
  }
});
function wfCopy(btn) {
  const done = ok => {
    toast(ok ? 'Text kopiert' : 'Kopieren nicht möglich – Text bitte markieren und kopieren.');
    if (!ok) { const t = $('#wfText'); t.focus(); t.select(); return; }
    btn.textContent = 'Kopiert ✓'; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = 'Kopieren'; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(wf.text).then(() => done(true), () => done(false));
  else done(false);
}
function wfSave() {
  if (!S) return;
  const sig = JSON.stringify([wf.st, wf.text, wf.title.trim()]);
  if (sig === wf.savedSig && state.checks.some(c => c.id === wf.savedId)) { toast('Diese Prüfung ist schon gespeichert.'); return; }
  const now = Date.now();
  const c = normCheck({ id: uid(), at: now, title: wf.title, st: wf.st, level: wf.res.level, verdict: wf.res.verdict, text: wf.text, u: now });
  state.checks.push(c);
  wf.savedSig = sig; wf.savedId = c.id;
  commit();
  toast(`Prüfung gespeichert · ${hm(now)}`);
}
function wfTodo() {
  if (!S) return;
  const r = wf.res, now = Date.now(), t = wf.title.trim();
  const what = { straftat: 'Strafanzeige', owi: 'OWi-Anzeige', erlaubt: 'Aktenvermerk', hinweis: 'Prüfvermerk' }[r.level];
  const snap = snapshot();
  state.items.push(normItem({ id: uid(), title: `${what}: ${r.verdict}${t ? ' · ' + t : ''}`, notes: wf.text, kind: 'aufgabe', mode: r.level === 'straftat' || r.level === 'owi' ? 'asap' : 'einmalig', createdAt: now, updatedAt: now }));
  commit();
  toast(`Aufgabe angelegt · ${what}`, { undo: snap });
}
async function wfReset() {
  if (wf.edited && wf.text !== wf.gen && wf.savedSig !== JSON.stringify([wf.st, wf.text, wf.title.trim()])) {
    const r = await ask({ title: 'Neue Prüfung?', text: 'Dein bearbeiteter Text ist nicht gespeichert und geht verloren.', buttons: [{ label: 'Abbrechen', value: null }, { label: 'Neu beginnen', value: 'y', cls: 'btn-accent', submit: true }] });
    if (!r) return;
  }
  wf.st = WF_DEFAULT(); wf.title = ''; wf.edited = false; wf.savedSig = ''; wf.savedId = null;
  wfChanged(); renderWaffg();
  scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}
$('#wfReset').addEventListener('click', wfReset);

/* Verlauf */
$('#wfHist').addEventListener('click', e => {
  const del = e.target.closest('[data-check-del]');
  if (del) {
    const c = state.checks.find(x => x.id === del.dataset.checkDel); if (!c) return;
    const snap = snapshot();
    state.checks = state.checks.filter(x => x.id !== c.id); state.del[c.id] = tombTs(c);
    commit(); toast('Prüfung gelöscht', { undo: snap });
    return;
  }
  const row = e.target.closest('[data-check]'); if (!row) return;
  const c = state.checks.find(x => x.id === row.dataset.check); if (!c) return;
  wf.st = wfNormState(c.st); wf.title = c.title; wf.edited = false;
  wfChanged();
  wf.text = c.text || wf.gen; wf.edited = wf.text !== wf.gen;
  wf.savedSig = JSON.stringify([wf.st, wf.text, wf.title.trim()]); wf.savedId = c.id;
  renderWaffg();
  toast(`Prüfung vom ${dateShort(c.at)} ${hm(c.at)} geladen`);
  if (mobileMQ.matches) $('#wfRes').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  else scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
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
  else if (/^[1-7]$/.test(e.key)) { e.preventDefault(); setArea(AREAS[Number(e.key) - 1]); }
  else if (e.key === '/') { e.preventDefault(); if (mobileMQ.matches) searchBox.classList.add('expanded'); searchInput.focus(); }
  else if (k === 'd' && !e.repeat) { e.preventDefault(); dongleAction(); }
  else if (k === 'e' && !e.repeat) { e.preventDefault(); if (liveShift()) addOp(); else toast('Einsätze gehören zu einer laufenden Schicht – erst eindongeln (D).'); }
  else if (k === 'l') { e.preventDefault(); lock('manual'); }
  else if (k === 's') { e.preventDefault(); setArea(document.body.dataset.area === 'schreiben' ? 'heute' : 'schreiben'); }
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

/* ======================= Brücke für Bereiche (Schriftliche Arbeiten) ======================= */
/* Bewusst schmal: Zugriff nur auf die Vorgänge, nie auf Schlüssel oder Umschlag. Ohne entsperrten Tresor liefert alles null/false. */
window.WBridge = Object.freeze({
  unlocked: () => !!S,
  docs: () => (S ? state.docs : null),
  find: id => (S ? state.docs.find(d => d.id === id) || null : null),
  add(doc) { if (!S) return null; const d = normDoc({ ...doc, id: doc.id || uid() }); if (!d) return null; delete state.del[d.id]; state.docs.push(d); save(); return d; },
  /** Änderungen am Vorgang: Zeitstempel setzen, verschlüsselt speichern, Sync anstoßen. renderAll nur bei Bedarf. */
  touch(doc, full = false) {
    if (!S || !doc) return;
    doc.u = Date.now();
    if (doc.status === 'fertig') {
      const now = Date.now(), open = state.items.filter(i => i.doc === doc.id && !i.done);
      for (const it of open) { it.done = true; it.doneAt = now; it.status = 'offen'; it.updatedAt = now; }
      if (open.length) { commit(); toast(`Erledigt: ${open[0].title}`); return; }
    }
    if (full) commit(); else save();
  },
  remove(id) { if (!S) return null; const d = state.docs.find(x => x.id === id); if (!d) return null; const snap = snapshot(); state.docs = state.docs.filter(x => x.id !== id); state.del[id] = tombTs(d); commit(); return snap; },
  snapshot: () => (S ? snapshot() : null),
  restore: snap => { if (S && snap) restore(snap); },
  name: () => (S ? state.settings.name : ''),
  /** Teamliste für die Besatzung: zuletzt im Dienst zuerst, dann alphabetisch; Rollen enthalten u. a. die Amtsbezeichnung. */
  team: () => { if (!S) return []; const me = state.settings.name.trim(); const mp = me ? state.people.find(x => norm(x.name) === norm(me)) : null; const out = me ? [{ name: me, roles: mp ? [...mp.roles] : [], rank: rankOfPerson(mp) }] : []; const seen = new Set(out.map(o => norm(o.name))); for (const c of crewPool()) { const p = (c.id && state.people.find(x => x.id === c.id)) || state.people.find(x => norm(x.name) === norm(c.name)); const n = p ? p.name : c.name; if (!n || seen.has(norm(n))) continue; seen.add(norm(n)); out.push({ name: n, roles: p ? [...p.roles] : [], rank: rankOfPerson(p) }); } return out; },
  /** Vorbelegung neuer Vorgänge aus der laufenden Schicht (Rufname, Besatzung). */
  preset: () => { if (!S) return null; const sh = liveShift(); return sh ? { einsatz: shiftCrewPreset(sh) } : null; },
  /** Offenen Punkt als Todo in den Planner übernehmen (z. B. „Lichtbildmappe fertigen“). */
  addTodo(title, notes = '') { if (!S || !String(title || '').trim()) return null; const it = normItem({ id: uid(), title: String(title).trim(), notes: String(notes || ''), kind: 'todo', mode: 'einmalig' }); state.items.push(it); commit(); return it; },
  /** Verschlüsselte Ablage für Module: Bild speichern (→ ID) und wieder lesen (→ Blob). */
  addBlob, fileBlob,
  toast, ask, openDlg, closeDlg, download, esc, uid, hm, pad, mobile: () => mobileMQ.matches,
  bump
});

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
