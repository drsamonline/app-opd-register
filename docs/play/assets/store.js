/* OPD Register — store, storage and shared helpers.
   One global namespace (OPD), classic scripts: works from file://, a WebView and a static host. */
(function (NS) {
  'use strict';

  /* ---------- constants ---------- */
  var K2 = 'dailyEntryRegister.v2';   // kept from v2 so existing data loads untouched
  var K1 = 'dailyEntryRegister.v1';
  var KS = 'opdRegister.settings';
  var DROWS = 5;
  var DLOC = 'Default Location';

  var ST = {
    working:    { l: 'Working day',   s: 'Working',    cls: 'working' },
    holiday:    { l: 'Holiday',       s: 'Holiday',    cls: 'holiday' },
    nonworking: { l: 'Non-working',   s: 'Non-working',cls: 'nonworking' },
    noactivity: { l: 'No activity',   s: 'No activity',cls: 'noactivity' }
  };
  var SO = ['working', 'holiday', 'nonworking', 'noactivity'];
  var ER = { opd: '', caseType: 'New', department: '', name: '', age: '', sex: '',
             address: '', diagnosis: '', treatment: '', phone: '', followUp: '' };
  /* DF decides what makes a row a patient. Phone and follow-up date are deliberately
     NOT in it: a date alone is not a patient, and counting it would inflate every total. */
  var DF = ['opd', 'department', 'name', 'age', 'address', 'diagnosis', 'treatment'];
  var DF_ALL = ['opd', 'caseType', 'department', 'name', 'age', 'sex', 'address', 'diagnosis', 'treatment', 'phone', 'followUp'];

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var todayKey = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var mKey = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  var dim = function (mk) { var p = mk.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); };
  var hasD = function (r) { return DF.some(function (f) { return String((r && r[f]) || '').trim() !== ''; }); };
  var blankRows = function (n) { return Array.from({ length: n }, function () { return Object.assign({}, ER); }); };
  var fmtDay = function (k) {
    var d = new Date(k + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  var fmtMonth = function (mk) {
    var p = mk.split('-').map(Number);
    return new Date(p[0], p[1] - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };
  var fmtMonthShort = function (mk) {
    var p = mk.split('-').map(Number);
    return new Date(p[0], p[1] - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };
  var debounce = function (fn, ms) {
    var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  };

  /* age in years from free text: 5, 5y, 6 mo, 3 days, 1.5 */
  function ageYears(v) {
    if (v == null) return null;
    var s = String(v).trim().toLowerCase();
    if (!s) return null;
    var m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return null;
    var n = parseFloat(m[0]);
    if (isNaN(n)) return null;
    if (/mo|month/.test(s)) return n / 12;
    if (/day|d\b/.test(s)) return n / 365;
    return n;
  }
  /* dd/mm/yyyy or yyyy-mm-dd typed into Age -> years. Anything else is returned untouched. */
  function normaliseAge(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return '';
    var m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    var y, mo, d;
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else {
      var m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!m2) return s;
      y = +m2[1]; mo = +m2[2]; d = +m2[3];
    }
    if (y < 100) y += (y > 30 ? 1900 : 2000);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return s;
    var dt = new Date(y, mo - 1, d);
    if (isNaN(dt.getTime()) || dt.getMonth() !== mo - 1) return s;
    var years = (Date.now() - dt.getTime()) / (365.2425 * 864e5);
    if (years < 0 || years >= 130) return s;
    return String(Math.floor(years));
  }

  /* department bucket: med / surg / gyn / ped / '' */
  function deptK(d) {
    d = String(d || '').trim().toLowerCase();
    if (!d) return '';
    if (/gyn|obs|obst/.test(d)) return 'gyn';
    if (/ped|paed|child/.test(d)) return 'ped';
    if (/med/.test(d)) return 'med';
    if (/surg/.test(d)) return 'surg';
    return '';
  }

  /* ---------- state ---------- */
  var DB = null;
  var S = { theme: 'light', filter: 'all', statMode: 'day', statCols: null, curM: '', curD: '', open: {} };
  var events = {};
  var saveState = 'saved';

  function on(evt, fn) { (events[evt] = events[evt] || []).push(fn); }
  function emit(evt, payload) { (events[evt] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error(e); } }); }

  /* ---------- storage ---------- */
  function defDB() {
    var o = { version: 3, current: DLOC, locations: {} };
    o.locations[DLOC] = { entries: {} };
    return o;
  }
  function validDB(o) {
    if (!o || typeof o !== 'object') return defDB();
    if (o.locations && typeof o.locations === 'object') {
      var L = {};
      Object.keys(o.locations).forEach(function (n) {
        var l = o.locations[n] || {};
        if (!l.entries || typeof l.entries !== 'object') l.entries = {};
        L[n] = l;
      });
      if (!Object.keys(L).length) L[DLOC] = { entries: {} };
      return { version: 3, current: (o.current && L[o.current]) ? o.current : Object.keys(L)[0], locations: L };
    }
    if (o.entries && typeof o.entries === 'object') {
      var one = { version: 3, current: DLOC, locations: {} };
      one.locations[DLOC] = { entries: o.entries };
      return one;
    }
    return defDB();
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(K2); } catch (e) {}
    if (!raw) { try { raw = localStorage.getItem(K1); } catch (e) {} }
    var parsed = null;
    if (raw) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
    DB = validDB(parsed);
    try {
      var st = JSON.parse(localStorage.getItem(KS) || '{}');
      if (st && typeof st === 'object') {
        if (st.theme === 'dark' || st.theme === 'light') S.theme = st.theme;
        if (st.filter) S.filter = st.filter;
      }
    } catch (e) {}
  }

  function settingsSave() {
    try { localStorage.setItem(KS, JSON.stringify({ theme: S.theme, filter: S.filter })); } catch (e) {}
  }

  function prune() {
    var E = ent();
    Object.keys(E).forEach(function (k) {
      var e = E[k];
      var any = (e.rows || []).some(hasD);
      var note = String(e.note || '').trim() !== '';
      if (!any && !note && (e.status || 'working') === 'working') delete E[k];
    });
  }

  var DEMO = false;
  function setDemo(v) { DEMO = !!v; }
  function isDemo() { return DEMO; }

  function saveNow() {
    if (DEMO) { setSaveState('saved'); emit('saved'); return; }
    setSaveState('busy');
    try {
      localStorage.setItem(K2, JSON.stringify(DB));
      setSaveState('saved');
    } catch (err) {
      try {
        prune();
        localStorage.setItem(K2, JSON.stringify(DB));
        setSaveState('saved');
        toast('Storage was full — empty days were dropped to make room.');
      } catch (e2) {
        setSaveState('err');
        toast('Could not save: this browser storage is full. Export a backup now.', 'Export', function () { NS.exportJson(); });
      }
    }
    emit('saved');
  }
  var sched = debounce(saveNow, 250);

  function setSaveState(s) {
    saveState = s;
    var chip = $('#saveChip'), txt = $('#saveTxt');
    if (!chip || !txt) return;
    chip.classList.toggle('busy', s === 'busy');
    chip.classList.toggle('err', s === 'err');
    txt.textContent = s === 'busy' ? 'Saving…' : s === 'err' ? 'Not saved' : 'Saved';
  }

  function bytes() {
    try { return new Blob([JSON.stringify(DB)]).size; } catch (e) { return 0; }
  }
  function humanSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  /* ---------- entries ---------- */
  function ent() { return DB.locations[DB.current].entries; }
  function locNames() { return Object.keys(DB.locations).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base' }); }); }

  function ensureD(k) {
    var E = ent(), e = E[k];
    if (!e) e = E[k] = { status: 'working', note: '', rows: blankRows(DROWS) };
    if (!Array.isArray(e.rows)) e.rows = blankRows(DROWS);
    while (e.rows.length < DROWS) e.rows.push(Object.assign({}, ER));
    return e;
  }
  function ensureM(mk) {
    for (var d = 1, n = dim(mk); d <= n; d++) ensureD(mk + '-' + pad(d));
  }
  function cnt(k) {
    var e = ent()[k];
    if (!e || !e.rows) return 0;
    var n = 0;
    e.rows.forEach(function (r) { if (hasD(r)) n++; });
    return n;
  }
  function monthCount(mk) {
    var E = ent(), n = 0;
    Object.keys(E).forEach(function (k) { if (k.slice(0, 7) === mk) n += cnt(k); });
    return n;
  }
  function rowsOfDay(k) {
    var e = ent()[k];
    return (e && e.rows) || [];
  }

  /* ---------- cases / autofill ---------- */
  function allCases(opts) {
    opts = opts || {};
    var E = opts.allLoc ? null : ent(), out = [];
    var locs = opts.allLoc ? Object.keys(DB.locations) : [DB.current];
    locs.forEach(function (ln) {
      var L = DB.locations[ln].entries || {};
      Object.keys(L).sort().forEach(function (d) {
        ((L[d] || {}).rows || []).forEach(function (r, idx) {
          if (!String(r.opd || '').trim()) return;
          out.push({ loc: ln, date: d, row: r, i: idx });
        });
      });
    });
    return out;
  }
  function recentCases(n) {
    var seen = {}, out = [], list = allCases().reverse();
    for (var i = 0; i < list.length; i++) {
      var key = String(list[i].row.opd || '').trim().toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1; out.push(list[i]);
      if (out.length >= n) break;
    }
    return out;
  }
  function findCase(opd) {
    var key = String(opd || '').trim().toLowerCase();
    if (!key) return null;
    var E = ent(), days = Object.keys(E).sort().reverse();
    for (var i = 0; i < days.length; i++) {
      var rows = (E[days[i]] || {}).rows || [];
      for (var j = rows.length - 1; j >= 0; j--) {
        if (String(rows[j].opd || '').trim().toLowerCase() === key) return rows[j];
      }
    }
    return null;
  }

  /* follow-ups due in the next N days, across the current location, oldest first */
  function dueFollowUps(days) {
    days = days == null ? 14 : days;
    var today = todayKey(), E = ent(), out = [];
    var limit = new Date(); limit.setDate(limit.getDate() + days);
    var limK = limit.getFullYear() + '-' + pad(limit.getMonth() + 1) + '-' + pad(limit.getDate());
    Object.keys(E).forEach(function (k) {
      ((E[k] || {}).rows || []).forEach(function (r, i) {
        var f = String(r.followUp || '').trim();
        if (!f || f < today || f > limK) return;
        out.push({ date: f, seen: k, i: i, row: r, overdue: false });
      });
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  }

  /* the departments used in this location, most used first */
  function deptHistory(limit) {
    var counts = {}, E = ent();
    Object.keys(E).forEach(function (k) {
      ((E[k] || {}).rows || []).forEach(function (r) {
        var d = String(r.department || '').trim();
        if (!d) return;
        var key = d.toLowerCase();
        counts[key] = counts[key] || { label: d, n: 0 };
        counts[key].n++;
      });
    });
    return Object.keys(counts).map(function (k) { return counts[k]; })
      .sort(function (a, b) { return b.n - a.n || a.label.localeCompare(b.label); })
      .slice(0, limit || 8);
  }

  /* ---------- toast + undo ---------- */
  var toastT = null, toastAct = null;
  function toast(msg, actionLabel, action) {
    var el = $('#toast'), m = $('#toastMsg'), b = $('#toastAct');
    if (!el) return;
    m.textContent = msg;
    toastAct = action || null;
    if (actionLabel && action) { b.hidden = false; b.textContent = actionLabel; }
    else { b.hidden = true; }
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); toastAct = null; }, action ? 7000 : 2600);
  }
  function bindToast() {
    var b = $('#toastAct');
    if (!b) return;
    b.addEventListener('click', function () {
      if (toastAct) toastAct();
      $('#toast').classList.remove('on');
      toastAct = null;
    });
  }

  /* snapshot for undo: deep clone of one day */
  function daySnapshot(k) {
    return JSON.parse(JSON.stringify(ent()[k] || null));
  }
  function restoreDay(k, snap) {
    if (snap) ent()[k] = snap; else delete ent()[k];
    saveNow(); emit('changed');
  }

  /* ---------- locations ---------- */
  function switchLoc(name) {
    if (!name || !DB.locations[name] || name === DB.current) return;
    saveNow();
    DB.current = name;
    saveNow();
    document.title = 'OPD Register — ' + name;
    emit('location');
  }
  function addLoc(name) {
    name = String(name || '').trim();
    if (!name) return 'Please type a name.';
    if (DB.locations[name]) return 'A location with that name already exists.';
    DB.locations[name] = { entries: {} };
    saveNow();
    switchLoc(name);
    return null;
  }
  function renameLoc(from, to) {
    to = String(to || '').trim();
    if (!to) return 'Please type a name.';
    if (to === from) return null;
    if (DB.locations[to]) return 'A location with that name already exists.';
    var L = {};
    Object.keys(DB.locations).forEach(function (k) { L[k === from ? to : k] = DB.locations[k]; });
    DB.locations = L;
    DB.current = to;
    saveNow(); emit('location');
    return null;
  }
  function delLoc(name) {
    if (locNames().length <= 1) return 'You must keep at least one location.';
    delete DB.locations[name];
    if (DB.current === name) DB.current = locNames()[0];
    saveNow(); emit('location');
    return null;
  }

  /* ---------- files ---------- */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function exportJson() {
    saveNow();
    download('opd-register-backup-' + todayKey() + '.json', JSON.stringify(DB, null, 2), 'application/json');
    toast('Backup saved — every location, every month.');
  }

  function importJson(file, done) {
    var r = new FileReader();
    r.onload = function () {
      var parsed;
      try { parsed = JSON.parse(r.result); } catch (e) { toast('That file is not valid JSON.'); return; }
      var next = validDB(parsed);
      // normalise rows: every field present, strings only
      Object.keys(next.locations).forEach(function (ln) {
        var E = next.locations[ln].entries || {};
        Object.keys(E).forEach(function (k) {
          var e = E[k];
          if (!Array.isArray(e.rows)) e.rows = blankRows(DROWS);
          e.rows.forEach(function (x) {
            Object.keys(ER).forEach(function (f) { if (typeof x[f] !== 'string') x[f] = x[f] == null ? ER[f] : String(x[f]); });
          });
          if (!e.status) e.status = 'working';
          if (typeof e.note !== 'string') e.note = '';
        });
      });
      var previous = DB;
      DB = next;
      saveNow();
      if (NS.onImported) NS.onImported(previous);
      emit('location'); emit('changed');
      toast('Imported ' + Object.keys(DB.locations).length + ' location(s).');
      if (done) done();
    };
    r.readAsText(file);
  }

  /* ---------- demo data (memory-safe: caller decides) ---------- */
  function demoDB() {
    var names = ['Ramesh Patel','Fatima Shaikh','Arjun Desai','Meena Joshi','Kiran Rao','Suresh Nair','Anita Shah','Vikram Singh','Priya Menon','Imran Qureshi','Lata Kulkarni','Devang Bhatt','Sneha Pillai','Mohan Yadav','Rekha Iyer','Aditya Verma'];
    var depts = ['Medicine','Gynec & Obs','Surgery','Pediatrics'];
    var dx = ['Fever, 3 days','Type 2 diabetes follow-up','Antenatal check, 28 weeks','Acute gastroenteritis','Hypertension, uncontrolled','URI with cough','Low back pain','Anemia, iron deficiency'];
    var tx = ['Tab Paracetamol 500 TDS','Metformin 500 BD, review 4 wk','Iron + folic acid, next visit 2 wk','ORS + Zinc, review 3 days','Amlodipine 5 OD','Levocetirizine 5 HS x 5 d','Physiotherapy + NSAID','Iron sucrose IV x 2'];
    var o = { version: 3, current: 'Akota OPD', locations: {} };
    var loc = o.locations['Akota OPD'] = { entries: {} };
    var base = new Date();
    var mk = mKey(base);
    var n = dim(mk);
    var opd = 24800;
    for (var d = 1; d <= n; d++) {
      var k = mk + '-' + pad(d);
      var wd = new Date(k + 'T00:00:00').getDay();
      var st = wd === 0 ? 'holiday' : (d % 17 === 0 ? 'noactivity' : 'working');
      var rows = blankRows(DROWS);
      var count = wd === 0 ? 0 : 4 + ((d * 7) % 6);
      for (var i = 0; i < count; i++) {
        var di = (d + i) % depts.length;
        var sex = depts[di] === 'Gynec & Obs' ? 'F' : ((d + i) % 2 ? 'M' : 'F');
        rows[i] = {
          opd: String(++opd),
          caseType: (i % 3 === 0) ? 'New' : 'Old',
          department: depts[di],
          name: names[(d + i * 3) % names.length],
          age: String(depts[di] === 'Pediatrics' ? 2 + ((d + i) % 12) : 18 + ((d * 3 + i * 5) % 60)),
          sex: sex,
          address: ['Akota','Alkapuri','Gorwa','Karelibaug','Manjalpur'][(d + i) % 5],
          diagnosis: dx[(d + i) % dx.length],
          treatment: tx[(d + i) % tx.length],
          phone: '9' + String(700000000 + ((d * 37 + i * 911) % 99999999)).slice(0, 9),
          followUp: ((d + i) % 3 === 0)
            ? (function () {
                var f = new Date(); f.setDate(f.getDate() + ((d + i) % 18) + 1);
                return f.getFullYear() + '-' + pad(f.getMonth() + 1) + '-' + pad(f.getDate());
              })()
            : ''
        };
      }
      while (rows.length < Math.max(DROWS, count + 1)) rows.push(Object.assign({}, ER));
      loc.entries[k] = { status: st, note: d === 5 ? 'Free camp — 40 screened' : '', rows: rows };
    }
    return o;
  }

  /* ---------- export ---------- */
  NS.$ = $; NS.$$ = $$; NS.esc = esc; NS.pad = pad; NS.dim = dim;
  NS.tKey = todayKey; NS.mKey = mKey; NS.fmtDay = fmtDay; NS.fmtMonth = fmtMonth; NS.fmtMonthShort = fmtMonthShort;
  NS.hasD = hasD; NS.blankRows = blankRows; NS.ageYears = ageYears; NS.deptK = deptK; NS.debounce = debounce;
  NS.normaliseAge = normaliseAge; NS.dueFollowUps = dueFollowUps; NS.deptHistory = deptHistory; NS.DF_ALL = DF_ALL;
  NS.ER = ER; NS.DF = DF; NS.DROWS = DROWS; NS.ST = ST; NS.SO = SO;
  NS.S = S;
  Object.defineProperty(NS, 'db', { get: function () { return DB; } });
  NS.load = load; NS.saveNow = saveNow; NS.sched = sched; NS.settingsSave = settingsSave;
  NS.setSaveState = setSaveState; NS.bytes = bytes; NS.humanSize = humanSize;
  NS.ent = ent; NS.locNames = locNames; NS.ensureD = ensureD; NS.ensureM = ensureM;
  NS.cnt = cnt; NS.monthCount = monthCount; NS.rowsOfDay = rowsOfDay;
  NS.allCases = allCases; NS.recentCases = recentCases; NS.findCase = findCase;
  NS.on = on; NS.emit = emit;
  NS.toast = toast; NS.bindToast = bindToast;
  NS.daySnapshot = daySnapshot; NS.restoreDay = restoreDay;
  NS.switchLoc = switchLoc; NS.addLoc = addLoc; NS.renameLoc = renameLoc; NS.delLoc = delLoc;
  NS.download = download; NS.exportJson = exportJson; NS.importJson = importJson; NS.demoDB = demoDB;
  NS.validDB = validDB; NS.setDemo = setDemo; NS.isDemo = isDemo;
})(window.OPD = window.OPD || {});
