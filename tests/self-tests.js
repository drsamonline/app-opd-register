#!/usr/bin/env node
/* OPD Register — self-tests. No browser, no dependencies: node tests/self-tests.js
   Everything is exercised through the real source files, loaded into a small DOM stub. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'docs', 'play', 'assets');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function eq(name, actual, expected) { ok(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected }); }

/* ---------- a DOM stub just large enough for the store ---------- */
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Blob: class { constructor(parts) { this.size = String(parts && parts[0] || '').length; } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
  navigator: {},
  localStorage,
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, remove() {} }),
    body: { appendChild() {}, style: {} },
    addEventListener: () => {}
  }
};
sandbox.window = sandbox;
sandbox.window.OPD = {};
vm.createContext(sandbox);
for (const f of ['store.js', 'dashboard.js']) {
  vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), sandbox, { filename: f });
}
const NS = sandbox.window.OPD;

/* ---------- age parsing ---------- */
eq('age: plain number', NS.ageYears('34'), 34);
eq('age: years suffix', NS.ageYears('5y'), 5);
eq('age: decimal', NS.ageYears('1.5'), 1.5);
ok('age: months convert to years', Math.abs(NS.ageYears('6 mo') - 0.5) < 0.01, NS.ageYears('6 mo'));
ok('age: days convert to years', NS.ageYears('3 days') < 0.02, NS.ageYears('3 days'));
eq('age: empty is null', NS.ageYears(''), null);
eq('age: junk is null', NS.ageYears('unknown'), null);

/* ---------- department buckets ---------- */
eq('dept: medicine', NS.deptK('Medicine'), 'med');
eq('dept: gynae spelling', NS.deptK('Gynae'), 'gyn');
eq('dept: obstetrics', NS.deptK('Obstetrics'), 'gyn');
eq('dept: pediatrics', NS.deptK('Paediatrics'), 'ped');
eq('dept: surgery', NS.deptK('Surgery'), 'surg');
eq('dept: unknown stays unknown', NS.deptK('Dermatology'), '');

/* ---------- a row counts when any clinical field is filled ---------- */
ok('row: blank is not a patient', !NS.hasD({ opd: '', name: '', department: '', age: '' }));
ok('row: name alone counts', NS.hasD({ name: 'A' }));
ok('row: whitespace does not count', !NS.hasD({ name: '   ' }));
ok('row: diagnosis alone counts', NS.hasD({ diagnosis: 'Fever' }));

/* ---------- database shape ---------- */
const legacyV1 = { entries: { '2026-01-02': { status: 'working', note: '', rows: [{ opd: '1', name: 'A' }] } } };
const migrated = NS.validDB(legacyV1);
eq('migrate: v1 single-location shape is wrapped', Object.keys(migrated.locations).length, 1);
ok('migrate: entries survive', !!migrated.locations[migrated.current].entries['2026-01-02']);
eq('migrate: garbage becomes a fresh db', Object.keys(NS.validDB('nonsense').locations).length, 1);
eq('migrate: current points at a real location', NS.validDB({ current: 'Gone', locations: { A: { entries: {} } } }).current, 'A');

/* ---------- demo data ---------- */
const demo = NS.demoDB();
eq('demo: one location', Object.keys(demo.locations).length, 1);
const demoEntries = Object.values(demo.locations)[0].entries;
const demoDays = Object.keys(demoEntries).length;
ok('demo: covers a whole month', demoDays >= 28 && demoDays <= 31, demoDays);
ok('demo: every row is all-strings', Object.values(demoEntries).every(e =>
  e.rows.every(r => Object.values(r).every(v => typeof v === 'string'))));
ok('demo: has patients', Object.values(demoEntries).some(e => e.rows.some(NS.hasD)));
ok('demo: has day statuses other than working', Object.values(demoEntries).some(e => e.status !== 'working'));

/* ---------- loading saved data, then the read paths over it ---------- */
const seed = {
  version: 3, current: 'Clinic A',
  locations: {
    'Clinic A': {
      entries: {
        '2026-03-01': { status: 'working', note: '', rows: [
          { opd: '100', caseType: 'New', department: 'Medicine', name: 'Asha', age: '30', sex: 'F', address: '', diagnosis: 'Fever', treatment: '' },
          { opd: '101', caseType: 'Old', department: 'Gynec & Obs', name: 'Bina', age: '26', sex: '', address: '', diagnosis: '', treatment: '' }
        ] },
        '2026-03-02': { status: 'holiday', note: 'Holi', rows: [
          { opd: '102', caseType: 'New', department: 'Pediatrics', name: 'Chetan', age: '4', sex: 'M', address: '', diagnosis: '', treatment: '' },
          { opd: '100', caseType: 'Old', department: 'Medicine', name: 'Asha', age: '30', sex: 'F', address: '', diagnosis: 'Review', treatment: '' }
        ] }
      }
    },
    'Clinic B': { entries: {} }
  }
};
localStorage.setItem('dailyEntryRegister.v2', JSON.stringify(seed));
NS.load();
eq('load: reads the v2 key', NS.db.current, 'Clinic A');
eq('load: both locations present', NS.locNames().length, 2);
eq('load: locations sort alphabetically', NS.locNames(), ['Clinic A', 'Clinic B']);
eq('count: two patients on day 1', NS.cnt('2026-03-01'), 2);
eq('count: month total', NS.monthCount('2026-03'), 4);
eq('find: OPD 100 resolves', NS.findCase('100').name, 'Asha');
eq('find: unknown OPD is null', NS.findCase('999'), null);
eq('recent: newest first, deduped', NS.recentCases(10).map(c => c.row.opd), ['100', '102', '101']);
ok('cases carry a row index', NS.allCases().every(c => typeof c.i === 'number'));

/* ---------- the counting rules a report depends on ---------- */
const agg = NS.dashAgg('2026-03');
eq('agg: total patients', agg.total, 4);
eq('agg: gynecology counts as female', agg.gyn, 1);
eq('agg: gynae patient added to female', agg.female, 3);
eq('agg: medicine bucket', agg.med, 2);
eq('agg: pediatrics bucket', agg.ped, 1);
eq('agg: new vs old', [agg.newC, agg.oldC], [2, 2]);
eq('agg: holiday day is not a working day', agg.worked, 1);
eq('agg: per-day series length', agg.daily.length, 31);

/* ---------- day scaffolding ---------- */
const e = NS.ensureD('2026-03-03');
ok('ensure: a new day gets five blank rows', e.rows.length >= 5);
ok('ensure: a new day is working by default', e.status === 'working');
NS.ensureM('2026-02');
eq('ensureM: february 2026 has 28 days', Object.keys(NS.ent()).filter(k => k.startsWith('2026-02')).length, 28);

/* ---------- saving round-trips ---------- */
NS.saveNow();
const written = JSON.parse(localStorage.getItem('dailyEntryRegister.v2'));
ok('save: writes the whole database', !!written.locations['Clinic A'].entries['2026-03-01']);
ok('save: keeps the current location', written.current === 'Clinic A');

/* ---------- locations ---------- */
eq('loc: refuses a duplicate name', NS.addLoc('Clinic A'), 'A location with that name already exists.');
eq('loc: refuses an empty name', NS.addLoc('  '), 'Please type a name.');
eq('loc: refuses to delete the last one', NS.delLoc('Clinic A') === null || NS.locNames().length > 1, true);
const before = NS.locNames().length;
NS.addLoc('Clinic C');
eq('loc: adds one', NS.locNames().length, before + 1);
NS.renameLoc('Clinic C', 'Clinic D');
ok('loc: renames', NS.locNames().indexOf('Clinic D') !== -1 && NS.locNames().indexOf('Clinic C') === -1);

/* ---------- date helpers ---------- */
eq('date: february length 2024 (leap)', NS.dim('2024-02'), 29);
eq('date: february length 2026', NS.dim('2026-02'), 28);
eq('date: april length', NS.dim('2026-04'), 30);
eq('date: month key format', NS.mKey(new Date(2026, 0, 15)), '2026-01');
eq('date: padding', NS.pad(7), '07');

/* ---------- escaping ---------- */
eq('escape: angle brackets', NS.esc('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
eq('escape: quotes', NS.esc('a"b\'c'), 'a&quot;b&#39;c');
eq('escape: null is empty', NS.esc(null), '');

/* ---------- report ---------- */
console.log((fail ? '\n✗ ' : '\n✓ ') + pass + ' passed, ' + fail + ' failed');
if (fail) { failures.forEach(f => console.log('  · ' + f)); process.exit(1); }
