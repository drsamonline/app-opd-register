/* OPD Register — statistics: day-wise, month-wise, range. Table, print, Excel, CSV. */
(function (NS) {
  'use strict';
  var $ = NS.$, $$ = NS.$$, esc = NS.esc;

  var COLS = [
    { g: 'Summary', k: 'total', l: 'Total' },
    { g: 'Summary', k: 'male', l: 'Male' },
    { g: 'Summary', k: 'female', l: 'Female' },
    { g: 'Summary', k: 'newC', l: 'New' },
    { g: 'Summary', k: 'oldC', l: 'Follow-up' },
    { g: 'Departments', k: 'med', l: 'Medicine' },
    { g: 'Departments', k: 'surg', l: 'Surgery' },
    { g: 'Departments', k: 'gyn', l: 'Gynec & Obs' },
    { g: 'Departments', k: 'ped', l: 'Pediatrics' },
    { g: 'Sex within department', k: 'medM', l: 'Med M' },
    { g: 'Sex within department', k: 'medF', l: 'Med F' },
    { g: 'Sex within department', k: 'surgM', l: 'Surg M' },
    { g: 'Sex within department', k: 'surgF', l: 'Surg F' },
    { g: 'Sex within department', k: 'pedM', l: 'Ped M' },
    { g: 'Sex within department', k: 'pedF', l: 'Ped F' },
    { g: 'Activity', k: 'worked', l: 'Working days' },
    { g: 'Activity', k: 'avg', l: 'Avg / day' }
  ];
  var DEFAULT_ON = { total: 1, male: 1, female: 1, newC: 1, oldC: 1, med: 1, surg: 1, gyn: 1, ped: 1 };

  var state = { mode: 'day', rows: [], cols: [], title: '', sub: '', ran: false };

  function blank() {
    return { total: 0, male: 0, female: 0, newC: 0, oldC: 0, med: 0, surg: 0, gyn: 0, ped: 0, other: 0,
      medM: 0, medF: 0, surgM: 0, surgF: 0, pedM: 0, pedF: 0, gynM: 0, gynF: 0, worked: 0, days: 0 };
  }

  function addTo(s, r) {
    if (!NS.hasD(r)) return;
    s.total++;
    var sex = String(r.sex || '').trim().toUpperCase();
    var dk = NS.deptK(r.department);
    var isOld = String(r.caseType || '').trim().toLowerCase() === 'old';
    if (dk === 'gyn') { s.gyn++; s.gynF++; s.female++; }
    else {
      if (sex === 'M') s.male++; else if (sex === 'F') s.female++;
      if (dk === 'med') { s.med++; if (sex === 'M') s.medM++; else if (sex === 'F') s.medF++; }
      else if (dk === 'surg') { s.surg++; if (sex === 'M') s.surgM++; else if (sex === 'F') s.surgF++; }
      else if (dk === 'ped') { s.ped++; if (sex === 'M') s.pedM++; else if (sex === 'F') s.pedF++; }
      else s.other++;
    }
    if (isOld) s.oldC++; else s.newC++;
  }

  function dayStats(k) {
    var s = blank(), e = NS.ent()[k] || {};
    (e.rows || []).forEach(function (r) { addTo(s, r); });
    if ((e.status || 'working') === 'working' && s.total > 0) s.worked = 1;
    s.days = s.total > 0 ? 1 : 0;
    s.avg = s.total;
    return s;
  }

  function monthStats(mk) {
    var s = blank(), n = NS.dim(mk), activeDays = 0;
    for (var d = 1; d <= n; d++) {
      var one = dayStats(mk + '-' + NS.pad(d));
      Object.keys(one).forEach(function (key) { if (key !== 'avg') s[key] += one[key]; });
      if (one.total > 0) activeDays++;
    }
    s.days = activeDays;
    s.avg = activeDays ? +(s.total / activeDays).toFixed(1) : 0;
    return s;
  }

  function build() {
    var mode = state.mode;
    var rows = [], title = '', sub = '';
    if (mode === 'day') {
      var mk = $('#statMonth').value || NS.S.curM;
      var n = NS.dim(mk);
      for (var d = 1; d <= n; d++) {
        var k = mk + '-' + NS.pad(d);
        var s = dayStats(k);
        var st = (NS.ent()[k] || {}).status || 'working';
        rows.push({ label: new Date(k + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), s: s, note: st !== 'working' ? NS.ST[st].l : ((NS.ent()[k] || {}).note || '') });
      }
      title = NS.db.current + ' — day-wise, ' + NS.fmtMonth(mk);
      sub = 'Generated ' + new Date().toLocaleString();
    } else if (mode === 'month') {
      var yr = parseInt($('#statYear').value, 10) || new Date().getFullYear();
      for (var m = 1; m <= 12; m++) {
        var mk2 = yr + '-' + NS.pad(m);
        rows.push({ label: NS.fmtMonth(mk2), s: monthStats(mk2), note: '' });
      }
      title = NS.db.current + ' — month-wise, ' + yr;
      sub = 'Generated ' + new Date().toLocaleString();
    } else {
      var from = $('#statFrom').value, to = $('#statTo').value;
      if (!from || !to) { NS.toast('Pick both dates.'); return null; }
      if (from > to) { var t = from; from = to; to = t; }
      var cur = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
      var guard = 0;
      while (cur <= end && guard < 800) {
        var kk = cur.getFullYear() + '-' + NS.pad(cur.getMonth() + 1) + '-' + NS.pad(cur.getDate());
        rows.push({ label: new Date(kk + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }), s: dayStats(kk), note: '' });
        cur.setDate(cur.getDate() + 1); guard++;
      }
      title = NS.db.current + ' — ' + from + ' to ' + to;
      sub = 'Generated ' + new Date().toLocaleString();
    }
    var cols = getCols();
    state.rows = rows; state.cols = cols; state.title = title; state.sub = sub;
    return state;
  }

  function buildCols() {
    var box = $('#colsBox');
    if (!box) return;
    var g = {}, order = [];
    COLS.forEach(function (c) {
      if (!g[c.g]) { g[c.g] = []; order.push(c.g); }
      g[c.g].push(c);
    });
    box.innerHTML = order.map(function (name) {
      return '<div class="colgroup">' + esc(name) + '</div>' + g[name].map(function (c) {
        return '<label><input type="checkbox" data-col="' + c.k + '"' + (DEFAULT_ON[c.k] ? ' checked' : '') + '>' + esc(c.l) + '</label>';
      }).join('');
    }).join('');
  }

  function getCols() {
    return $$('#colsBox input:checked').map(function (el) { return el.dataset.col; });
  }

  function setMode(m) {
    state.mode = m;
    $$('#statMode button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    $('#fldMonth').hidden = m !== 'day';
    $('#fldYear').hidden = m !== 'month';
    $('#fldFrom').hidden = m !== 'range';
    $('#fldTo').hidden = m !== 'range';
  }

  function totals(rows, cols) {
    var t = blank();
    rows.forEach(function (r) {
      cols.forEach(function (c) {
        if (c === 'avg' || c === 'days') return;
        t[c] += r.s[c] || 0;
      });
    });
    var activeDays = rows.reduce(function (n, r) { return n + (r.s.total > 0 ? 1 : 0); }, 0);
    t.avg = activeDays ? +(t.total / activeDays).toFixed(1) : 0;
    t.days = activeDays;
    return t;
  }

  function render() {
    var out = $('#statOutput');
    if (!out || !state.ran) return;
    state.cols = getCols();          /* the ticked boxes are the truth, not the last build */
    var cols = state.cols;
    if (!cols.length) {
      out.innerHTML = '<div class="empty"><b>No columns selected</b>Tick at least one column above.</div>';
      return;
    }
    var t = totals(state.rows, cols);
    var h = '<table class="st"><caption>' + esc(state.title) + '<small>' + esc(state.sub) + ' · ' + state.rows.length + ' rows</small></caption><thead><tr><th>Period</th>' +
      cols.map(function (c) { return '<th>' + esc(label(c)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    state.rows.forEach(function (r) {
      var any = cols.some(function (c) { return (r.s[c] || 0) > 0; });
      h += '<tr><td>' + esc(r.label) + (r.note ? ' <span style="color:var(--muted-2);font-size:10.5px;font-weight:600">· ' + esc(r.note) + '</span>' : '') + '</td>' +
        cols.map(function (c) {
          var v = r.s[c];
          return '<td class="' + (v ? '' : 'z') + '">' + (v === 0 ? '–' : v) + '</td>';
        }).join('') + '</tr>';
    });
    h += '</tbody><tfoot><tr class="total"><td>Total</td>' +
      cols.map(function (c) { return '<td>' + t[c] + '</td>'; }).join('') + '</tr></tfoot></table>';
    out.innerHTML = h;
  }

  function label(k) {
    for (var i = 0; i < COLS.length; i++) if (COLS[i].k === k) return COLS[i].l;
    return k;
  }

  function run() {
    if (build() === null) return;
    state.ran = true;
    render();
    if (!state.rows.some(function (r) { return r.s.total > 0; })) {
      NS.toast('No patients in that period — the table is empty.');
    }
  }

  function tableData() {
    var cols = state.cols;
    var head = ['Period'].concat(cols.map(label));
    var body = state.rows.map(function (r) {
      return [r.label].concat(cols.map(function (c) { return r.s[c]; }));
    });
    var t = totals(state.rows, cols);
    body.push(['Total'].concat(cols.map(function (c) { return t[c]; })));
    return { head: head, body: body, title: state.title };
  }

  function exportExcel() {
    if (!state.ran) { NS.toast('Run the report first.'); return; }
    var d = tableData();
    var style = 'table{border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:11pt}' +
      'th{background:#1f5fd0;color:#fff;padding:6px 9px;border:1px solid #17479c;text-align:right}' +
      'th:first-child,td:first-child{text-align:left}' +
      'td{padding:5px 9px;border:1px solid #cfd8e6}' +
      'tr.total td{font-weight:bold;background:#eaf1ff}' +
      'caption{caption-side:top;text-align:left;font-weight:bold;font-size:12pt;padding-bottom:6px}';
    var html = '<html><head><meta charset="utf-8"><style>' + style + '</style></head><body>' +
      '<table><caption>' + esc(d.title) + '</caption><thead><tr>' +
      d.head.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.body.map(function (r, i) {
        return '<tr' + (i === d.body.length - 1 ? ' class="total"' : '') + '>' + r.map(function (x) { return '<td>' + esc(x) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></body></html>';
    NS.download('opd-stats-' + NS.tKey() + '.xls', html, 'application/vnd.ms-excel');
    NS.toast('Excel file downloaded.');
  }

  function exportCsv() {
    if (!state.ran) { NS.toast('Run the report first.'); return; }
    var d = tableData();
    var q = function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var csv = [d.head.map(q).join(',')].concat(d.body.map(function (r) { return r.map(q).join(','); })).join('\r\n');
    NS.download('opd-stats-' + NS.tKey() + '.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
    NS.toast('CSV downloaded.');
  }

  function exportMonthCsv(mk) {
    mk = mk || NS.S.curM;
    var rows = [['Date', 'Day status', 'Note', 'Sr', 'OPD no.', 'Case', 'Department', 'Name', 'Age', 'Sex', 'Address', 'Diagnosis', 'Treatment']];
    for (var d = 1, n = NS.dim(mk); d <= n; d++) {
      var k = mk + '-' + NS.pad(d), e = NS.ent()[k] || {};
      var sr = 0;
      (e.rows || []).forEach(function (r) {
        if (!NS.hasD(r)) return;
        sr++;
        rows.push([k, NS.ST[e.status || 'working'].l, e.note || '', sr, r.opd, r.caseType, r.department, r.name, r.age, r.sex, r.address, r.diagnosis, r.treatment]);
      });
    }
    var q = function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    NS.download('opd-' + NS.db.current.replace(/[^\w]+/g, '-') + '-' + mk + '.csv', '\ufeff' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n'), 'text/csv;charset=utf-8');
    NS.toast('Month exported as CSV.');
  }

  function print() {
    if (!state.ran) run();
    document.body.classList.add('printing-stats');
    setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printing-stats'); }, 400); }, 40);
  }

  function bind() {
    buildCols();
    $('#statMode').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-mode]');
      if (!b) return;
      setMode(b.dataset.mode);
      run();
    });
    $('#btnRunStats').addEventListener('click', run);
    $('#btnStatPrint').addEventListener('click', print);
    $('#btnStatExcel').addEventListener('click', exportExcel);
    $('#btnStatCsv').addEventListener('click', exportCsv);
    $('#btnColAll').addEventListener('click', function () { $$('#colsBox input').forEach(function (el) { el.checked = true; }); render(); });
    $('#btnColNone').addEventListener('click', function () { $$('#colsBox input').forEach(function (el) { el.checked = false; }); render(); });
    $('#colsBox').addEventListener('change', function (ev) { if (ev.target.dataset.col) render(); });
    ['#statMonth', '#statYear', '#statFrom', '#statTo'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('change', function () { if (state.ran) run(); });
    });
    setMode('day');
    var y = $('#statYear'); if (y) y.value = new Date().getFullYear();
    var f = $('#statFrom'), t = $('#statTo');
    if (f && t) { f.value = NS.S.curM + '-01'; t.value = NS.S.curM + '-' + NS.pad(NS.dim(NS.S.curM)); }
  }

  NS.bindStats = bind;
  NS.runStats = run;
  NS.exportMonthCsv = exportMonthCsv;
  NS.statsState = state;
})(window.OPD = window.OPD || {});
