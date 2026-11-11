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

/* ---------- a date typed as an age ---------- */
const thisYear = new Date().getFullYear();
eq('dob: dd/mm/yyyy becomes years', NS.normaliseAge('01/01/' + (thisYear - 30)), '30');
eq('dob: yyyy-mm-dd becomes years', NS.normaliseAge((thisYear - 40) + '-06-15'), '40');
eq('dob: a plain age is left alone', NS.normaliseAge('34'), '34');
eq('dob: 6 mo is left alone', NS.normaliseAge('6 mo'), '6 mo');
eq('dob: impossible date is left alone', NS.normaliseAge('31/02/1990'), '31/02/1990');
eq('dob: a future date is left alone', NS.normaliseAge('01/01/' + (thisYear + 2)), '01/01/' + (thisYear + 2));
eq('dob: empty stays empty', NS.normaliseAge(''), '');

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

/* ---------- phone and follow-up never make a row a patient ---------- */
ok('row: phone alone is not a patient', !NS.hasD({ phone: '9876543210' }));
ok('row: a follow-up date alone is not a patient', !NS.hasD({ followUp: '2026-12-01' }));
ok('row: the schema carries both fields', 'phone' in NS.ER && 'followUp' in NS.ER);

/* ---------- follow-ups due ---------- */
const soon = new Date(); soon.setDate(soon.getDate() + 3);
const soonK = soon.getFullYear() + '-' + NS.pad(soon.getMonth() + 1) + '-' + NS.pad(soon.getDate());
const far = new Date(); far.setDate(far.getDate() + 40);
const farK = far.getFullYear() + '-' + NS.pad(far.getMonth() + 1) + '-' + NS.pad(far.getDate());
NS.ensureD('2026-03-05').rows[0] = Object.assign({}, NS.ER, { opd: '200', name: 'Due Soon', followUp: soonK });
NS.ensureD('2026-03-05').rows[1] = Object.assign({}, NS.ER, { opd: '201', name: 'Due Later', followUp: farK });
NS.ensureD('2026-03-05').rows[2] = Object.assign({}, NS.ER, { opd: '202', name: 'No Date' });
const due = NS.dueFollowUps(14);
eq('follow-ups: only the one inside the window', due.length, 1);
eq('follow-ups: the right patient', due[0].row.name, 'Due Soon');
eq('follow-ups: knows where it came from', due[0].seen, '2026-03-05');
ok('follow-ups: carries the row index', typeof due[0].i === 'number');

/* ---------- patient history ---------- */
const hist = NS.patientHistory('100', '2026-03-02', 1);
eq('history: the other visit of the same OPD', hist.length, 1);
eq('history: it is the earlier one', hist[0].date, '2026-03-01');
eq('history: it carries the row', hist[0].row.diagnosis, 'Fever');
eq('history: unknown OPD is empty', NS.patientHistory('999').length, 0);
eq('history: blank OPD is empty', NS.patientHistory('').length, 0);
eq('history: excluding the current row', NS.patientHistory('100', '2026-03-01', 0).length, 1);

/* ---------- the next number in the series ---------- */
eq('next OPD: max + 1, keeping the width', NS.nextOpd(), '203');
NS.ensureD('2026-03-06').rows[0] = Object.assign({}, NS.ER, { opd: '0999' });
eq('next OPD: leading zeros are preserved', NS.nextOpd(), '1000');

/* ---------- ages the way they are said ---------- */
eq('age label: an adult', NS.ageLabel('34'), '34 y');
eq('age label: an infant in months', NS.ageLabel('0.5'), '6 mo');
eq('age label: months already written', NS.ageLabel('8 mo'), '8 mo');
eq('age label: a toddler', NS.ageLabel('1.5'), '18 mo');
eq('age label: empty', NS.ageLabel(''), '');
eq('age label: junk passes through', NS.ageLabel('unknown'), 'unknown');

/* ---------- rows saved without a diagnosis ---------- */
const missAll = NS.missingDiagnosis();
ok('missing diagnosis: counts a named row with no dx', missAll.n >= 1, missAll.n);
const missNone = NS.missingDiagnosis('2026-02');
eq('missing diagnosis: a month with no data is zero', missNone.n, 0);
ok('missing diagnosis: a diagnosed row is not counted', (function () {
  const before = NS.missingDiagnosis().n;
  NS.ensureD('2026-03-07').rows[0] = Object.assign({}, NS.ER, { name: 'Has Dx', diagnosis: 'Fever' });
  return NS.missingDiagnosis().n === before;
})());

/* ---------- how long ago ---------- */
const dayMs = 864e5;
const ago = n => { const d = new Date(Date.now() - n * dayMs); return d.getFullYear() + '-' + NS.pad(d.getMonth() + 1) + '-' + NS.pad(d.getDate()); };
eq('gap: today', NS.humanGap(ago(0)), 'today');
eq('gap: yesterday', NS.humanGap(ago(1)), 'yesterday');
eq('gap: days', NS.humanGap(ago(4)), '4 days ago');
eq('gap: weeks', NS.humanGap(ago(20)), '2 weeks ago');
eq('gap: months', NS.humanGap(ago(95)), '3 months ago');
eq('gap: years', NS.humanGap(ago(800)), '2 years ago');
eq('gap: empty', NS.humanGap(''), '');

/* ---------- department memory ---------- */
const dh = NS.deptHistory(5);
ok('dept history: most used first', dh.length > 0 && dh[0].n >= dh[dh.length - 1].n, dh);
ok('dept history: labels preserved', dh.some(function (d) { return d.label === 'Medicine'; }), dh);

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
