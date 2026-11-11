/* OPD Register — calendar, month register, patient editor sheet. */
(function (NS) {
  'use strict';
  var $ = NS.$, $$ = NS.$$, esc = NS.esc, pad = NS.pad;
  var S = NS.S;

  var mqNarrow = window.matchMedia('(max-width: 900px)');
  function narrow() { return mqNarrow.matches; }

  /* ================= CALENDAR ================= */
  function renderCal() {
    var grid = $('#calGrid');
    if (!grid) return;
    var mk = S.curM;
    NS.ensureM(mk);
    var p = mk.split('-').map(Number), total = NS.dim(mk);
    var firstDow = new Date(p[0], p[1] - 1, 1).getDay();
    var tk = NS.tKey();
    var h = '', cells = 0, patients = 0, worked = 0;
    for (var i = 0; i < firstDow; i++) h += '<div class="cell empty"></div>';
    for (var d = 1; d <= total; d++) {
      var k = mk + '-' + pad(d);
      var e = NS.ent()[k] || {};
      var st = e.status || 'working';
      var c = NS.cnt(k);
      patients += c;
      if (st === 'working' && c > 0) worked++;
      var cls = ['cell', 'st-' + st];
      if (k === S.curD) cls.push('sel');
      if (k === tk) cls.push('today');
      if (c) cls.push('has');
      h += '<button class="' + cls.join(' ') + '" data-date="' + k + '" title="' + esc(NS.ST[st].l + (c ? ' · ' + c + ' patient' + (c > 1 ? 's' : '') : '')) + '">' +
        '<span class="d num">' + d + '</span>' +
        '<span class="c">' + (c ? c + ' pt' + (c > 1 ? 's' : '') : NS.ST[st].s) + '</span>' +
        '<i class="flag"></i></button>';
      cells++;
    }
    grid.innerHTML = h;
    var sum = $('#calSum');
    if (sum) sum.textContent = patients + ' patients · ' + worked + ' working days with data';
  }

  function selectDay(k, scroll) {
    S.curD = k;
    if (S.curM !== k.slice(0, 7)) { S.curM = k.slice(0, 7); syncMonthInputs(); renderAll(); }
    else { markSelected(); renderCal(); }
    if (scroll !== false) {
      var head = document.querySelector('.dayhead[data-date="' + k + '"]');
      if (head) {
        if (!isOpen(k)) { S.open[k] = true; renderRegister(); head = document.querySelector('.dayhead[data-date="' + k + '"]'); }
        if (head) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  function markSelected() {
    $$('.dayhead').forEach(function (el) { el.classList.toggle('sel', el.dataset.date === S.curD); });
    $$('.day').forEach(function (el) { el.classList.toggle('sel', el.dataset.date === S.curD); });
  }

  function isOpen(k) {
    if (Object.prototype.hasOwnProperty.call(S.open, k)) return S.open[k];
    /* a day opens itself when it has patients, is the selected day, or is today */
    return NS.cnt(k) > 0 || k === S.curD || k === NS.tKey();
  }

  /* ================= ROW MARKUP (desktop) ================= */
  var COLS = [34, 90, 56, 124, 148, 50, 48, 98, 132, 158, 164, 86, 30];
  function sel(v, cur) { return v === cur ? ' selected' : ''; }

  function rowHTML(r, i) {
    return '<td class="sr num">' + (i + 1) + '</td>' +
      '<td><input class="cellin num" data-f="opd" list="opdList" autocomplete="off" placeholder="OPD no." value="' + esc(r.opd) + '"></td>' +
      '<td><select class="cellin" data-f="caseType"><option value="New"' + sel('New', r.caseType) + '>New</option><option value="Old"' + sel('Old', r.caseType) + '>Old</option></select></td>' +
      '<td><input class="cellin" data-f="department" list="deptList" autocomplete="off" placeholder="Dept." value="' + esc(r.department) + '"></td>' +
      '<td><input class="cellin" data-f="name" autocomplete="off" placeholder="Patient name" value="' + esc(r.name) + '"></td>' +
      '<td><input class="cellin num" data-f="age" inputmode="text" autocomplete="off" placeholder="Age" value="' + esc(r.age) + '"></td>' +
      '<td><select class="cellin" data-f="sex">' + ['', 'M', 'F', 'O'].map(function (s) {
        return '<option value="' + s + '"' + sel(s, r.sex) + '>' + (s || '—') + '</option>';
      }).join('') + '</select></td>' +
      '<td><input class="cellin num" data-f="phone" inputmode="tel" autocomplete="off" placeholder="Mobile" value="' + esc(r.phone) + '"></td>' +
      '<td><input class="cellin" data-f="address" autocomplete="off" placeholder="Address" value="' + esc(r.address) + '"></td>' +
      '<td><input class="cellin" data-f="diagnosis" autocomplete="off" placeholder="Diagnosis" value="' + esc(r.diagnosis) + '"></td>' +
      '<td><input class="cellin" data-f="treatment" autocomplete="off" placeholder="Treatment" value="' + esc(r.treatment) + '"></td>' +
      '<td><input class="cellin num" data-f="followUp" type="date" value="' + esc(r.followUp) + '" title="Follow-up date"></td>' +
      '<td class="acts"><button class="rowdel" data-del="' + i + '" title="Delete row" aria-label="Delete row">&times;</button></td>';
  }

  function tableHTML(k, rows) {
    var cg = '<colgroup>' + COLS.map(function (w) { return '<col style="width:' + w + 'px">'; }).join('') + '</colgroup>';
    var head = '<thead><tr><th>#</th><th>OPD no.</th><th>Case</th><th>Department</th><th>Name</th><th>Age</th><th>Sex</th><th>Mobile</th><th>Address</th><th>Diagnosis</th><th>Treatment</th><th>Follow-up</th><th></th></tr></thead>';
    var body = rows.map(function (r, i) {
      return '<tr class="drow" data-date="' + k + '" data-idx="' + i + '">' + rowHTML(r, i) + '</tr>';
    }).join('');
    return '<div class="tablewrap"><table class="reg" style="table-layout:fixed">' + cg + head + '<tbody data-tbody="' + k + '">' + body + '</tbody></table></div>';
  }

  function cardsHTML(k, rows) {
    var out = rows.map(function (r, i) {
      if (!NS.hasD(r)) return '';
      var ini = (r.name || '?').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
      var meta = [r.age ? r.age + 'y' : '', r.sex === 'M' ? 'Male' : r.sex === 'F' ? 'Female' : r.sex === 'O' ? 'Other' : '', r.department || '', r.diagnosis || '']
        .filter(Boolean).join(' · ');
      var due = r.followUp ? '<span class="due">↻ ' + esc(r.followUp.slice(8) + '/' + r.followUp.slice(5, 7)) + '</span>' : '';
      return '<button class="pcard" data-open="' + i + '">' +
        '<span class="ava">' + esc(ini) + '</span>' +
        '<span class="pm"><span class="pn">' + esc(r.name || 'Unnamed') + '</span>' +
        '<span class="pd">' + esc(meta || 'No details yet') + '</span></span>' +
        '<span class="pt num">' + esc(r.opd || '—') + due + '</span></button>';
    }).join('');
    var filled = rows.filter(NS.hasD).length;
    var empty = rows.length - filled;
    out += '<button class="addrow" data-add="' + k + '"><svg width="14" height="14"><use href="#i-plus"/></svg>' +
      (empty ? 'Add patient' : 'Add another patient') + '</button>';
    return '<div class="cards">' + out + '</div>';
  }

  function dayHTML(k) {
    var e = NS.ensureD(k);
    var c = NS.cnt(k);
    var st = e.status || 'working';
    var lbl = NS.fmtDay(k);
    var dow = k === NS.tKey() ? 'Today' : '';
    var open = isOpen(k);
    var h = '<section class="day' + (k === S.curD ? ' sel' : '') + '" data-date="' + k + '">' +
      '<div class="dayhead' + (k === S.curD ? ' sel' : '') + '" data-date="' + k + '">' +
      '<button class="dt" data-toggle="' + k + '" aria-expanded="' + open + '" title="Expand or collapse">' + esc(lbl) + (dow ? '<small>' + esc(dow) + '</small>' : '') + '</button>' +
      '<span class="cnt' + (c ? ' live' : '') + '" data-cnt="' + k + '">' + c + '</span>' +
      '<select class="selx st-' + st + '" data-dstat="' + k + '" aria-label="Day status for ' + k + '">' +
      NS.SO.map(function (x) { return '<option value="' + x + '"' + (st === x ? ' selected' : '') + '>' + NS.ST[x].l + '</option>'; }).join('') +
      '</select>' +
      '<input class="note" data-dnote="' + k + '" placeholder="Note — camp, festival, half day…" value="' + esc(e.note || '') + '">' +
      '<span class="dayacts">' +
      '<button data-add="' + k + '" title="Add a patient row" aria-label="Add a patient row"><svg width="14" height="14"><use href="#i-plus"/></svg></button>' +
      '<button data-printday="' + k + '" title="Print this day" aria-label="Print this day"><svg width="13" height="13"><use href="#i-print"/></svg></button>' +
      '<button class="danger" data-clear="' + k + '" title="Clear this day" aria-label="Clear this day"><svg width="13" height="13"><use href="#i-trash"/></svg></button>' +
      '</span></div>';
    if (open) h += narrow() ? cardsHTML(k, e.rows) : tableHTML(k, e.rows);
    return h + '</section>';
  }

  function visibleDays() {
    var mk = S.curM, out = [];
    for (var d = 1, n = NS.dim(mk); d <= n; d++) {
      var k = mk + '-' + pad(d);
      if (S.filter === 'data' && NS.cnt(k) === 0) continue;
      if (S.filter === 'today' && k !== NS.tKey()) continue;
      out.push(k);
    }
    return out;
  }

  function renderRegister() {
    var host = $('#days');
    if (!host) return;
    NS.ensureM(S.curM);
    var days = visibleDays();
    host.innerHTML = days.length ? days.map(dayHTML).join('')
      : '<div class="empty"><b>No days to show</b>Switch the filter, or pick another month.</div>';
    var t = $('#regTitle');
    if (t) t.textContent = NS.db.current;
    var sub = $('#regSub');
    if (sub) sub.textContent = NS.fmtMonth(S.curM) + ' · ' + NS.monthCount(S.curM) + ' patients · ' + NS.locNames().length + ' location' + (NS.locNames().length > 1 ? 's' : '');
  }

  /* ================= chips ================= */
  function renderChips() {
    var box = $('#chips');
    if (!box) return;
    var list = NS.recentCases(6);
    box.innerHTML = list.length ? list.map(function (c) {
      return '<button class="chip" data-case="' + esc(c.row.opd) + '" title="' + esc((c.row.name || '') + ' · ' + c.date) + '">' +
        '<b>' + esc(c.row.opd) + '</b><small>' + esc((c.row.name || '—').split(' ')[0]) + '</small></button>';
    }).join('') : '';
    var wrap = box.closest('.regbar');
    if (wrap) wrap.style.display = list.length ? '' : 'none';
  }

  function refOpdList() {
    var L = $('#opdList');
    if (!L) return;
    var seen = {}, out = [];
    NS.allCases().reverse().forEach(function (c) {
      var key = String(c.row.opd).toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      out.push('<option value="' + esc(c.row.opd) + '">' + esc((c.row.name || '') + (c.row.age ? ' · ' + c.row.age + 'y' : '') + (c.row.department ? ' · ' + c.row.department : '')) + '</option>');
    });
    L.innerHTML = out.slice(0, 400).join('');
  }

  /* ================= row mutations ================= */
  /* append one row to an already-rendered table, no re-render: typing must never lose focus */
  function appendRowDOM(k) {
    var e = NS.ensureD(k);
    var i = e.rows.length - 1;
    var tbody = document.querySelector('table.reg tbody[data-tbody="' + k + '"]');
    if (!tbody) { renderRegister(); return; }
    var tr = document.createElement('tr');
    tr.className = 'drow';
    tr.dataset.date = k; tr.dataset.idx = i;
    tr.innerHTML = rowHTML(e.rows[i], i);
    tbody.appendChild(tr);
    var w = document.querySelector('.tablewrap');
    if (w) w.scrollTop = w.scrollHeight;
  }

  function growDay(k) {
    var e = NS.ensureD(k);
    if (narrow()) { NS.sched(); return; }
    e.rows.push(Object.assign({}, NS.ER));
    appendRowDOM(k);
    NS.sched();
  }

  function addRow(k, focus) {
    var e = NS.ensureD(k);
    var i = e.rows.length;
    e.rows.push(Object.assign({}, NS.ER));
    S.open[k] = true;
    NS.saveNow();
    renderRegister();
    if (focus) {
      var el = document.querySelector('.drow[data-date="' + k + '"][data-idx="' + i + '"] [data-f="opd"]');
      if (el) el.focus();
    }
    return i;
  }

  function printDay(k) {
    NS.saveNow();
    S.open[k] = true;
    renderRegister();
    var day = document.querySelector('.day[data-date="' + k + '"]');
    if (!day) return;
    $$('.day').forEach(function (d) { d.classList.remove('printing'); });
    day.classList.add('printing');
    document.body.classList.add('printing-day');
    setTimeout(function () {
      window.print();
      setTimeout(function () {
        document.body.classList.remove('printing-day');
        day.classList.remove('printing');
      }, 400);
    }, 40);
  }

  function clearDay(k) {
    var snap = NS.daySnapshot(k);
    NS.ent()[k] = { status: 'working', note: '', rows: NS.blankRows(NS.DROWS) };
    NS.saveNow(); renderAll();
    NS.toast('Day cleared.', 'Undo', function () { NS.restoreDay(k, snap); renderAll(); });
  }

  function deleteRow(k, i) {
    var e = NS.ensureD(k), snap = NS.daySnapshot(k);
    e.rows.splice(i, 1);
    while (e.rows.length < NS.DROWS) e.rows.push(Object.assign({}, NS.ER));
    NS.saveNow(); renderRegister(); refOpdList();
    NS.toast('Row deleted.', 'Undo', function () { NS.restoreDay(k, snap); renderAll(); });
  }

  /* copy a patient into the next free row of the same day — families arrive together */
  function duplicate(k, i) {
    var e = NS.ensureD(k);
    var src = e.rows[i];
    if (!src || !NS.hasD(src)) { NS.toast('Nothing to duplicate in that row.'); return null; }
    var j = e.rows.findIndex(function (r) { return !NS.hasD(r); });
    if (j === -1) { e.rows.push(Object.assign({}, NS.ER)); j = e.rows.length - 1; }
    e.rows[j] = Object.assign({}, src, { opd: '', followUp: '' });
    S.open[k] = true;
    NS.saveNow(); renderRegister();
    NS.toast('Copied to row ' + (j + 1) + ' — add the OPD number.');
    return j;
  }

  function autofill(tr, k, i, rec) {
    var e = NS.ensureD(k), row = e.rows[i];
    if (!row) return;
    var v = {
      caseType: 'Old', department: rec.department || '', name: rec.name || '',
      age: rec.age || '', sex: rec.sex || '', address: rec.address || '',
      diagnosis: rec.diagnosis || '', treatment: rec.treatment || ''
    };
    Object.keys(v).forEach(function (f) {
      if (v[f] === '' && String(row[f] || '').trim() !== '') return;
      row[f] = v[f];
      var el = tr.querySelector('[data-f="' + f + '"]');
      if (el) el.value = v[f];
    });
    NS.saveNow(); updateCount(k);
  }

  function updateCount(k) {
    var el = document.querySelector('[data-cnt="' + k + '"]');
    if (el) {
      var c = NS.cnt(k);
      el.textContent = c;
      el.classList.toggle('live', c > 0);
    }
    var cell = document.querySelector('.cell[data-date="' + k + '"] .c');
    if (cell) cell.textContent = NS.cnt(k) ? NS.cnt(k) + ' pt' + (NS.cnt(k) > 1 ? 's' : '') : NS.ST[(NS.ent()[k] || {}).status || 'working'].s;
  }

  /* ================= patient sheet ================= */
  var sheetCtx = { k: null, i: null, prevFocus: null };

  /* the departments this location actually uses, most used first */
  function renderDeptChips() {
    var box = $('#deptChips');
    if (!box) return;
    var cur = String(($('#f-department') || {}).value || '').trim().toLowerCase();
    var list = NS.deptHistory(8);
    box.style.display = list.length ? '' : 'none';
    box.innerHTML = list.map(function (d) {
      var on = d.label.toLowerCase() === cur;
      return '<button type="button" class="chip" data-dept="' + esc(d.label) + '"' +
        (on ? ' style="border-color:var(--accent);background:var(--accent-l);color:var(--accent-d)"' : '') +
        '>' + esc(d.label) + ' <small>' + d.n + '</small></button>';
    }).join('');
  }

  function openSheet(k, i) {
    sheetCtx.k = k; sheetCtx.i = i; sheetCtx.prevFocus = document.activeElement;
    var e = NS.ensureD(k);
    if (i == null || i >= e.rows.length) {
      i = e.rows.findIndex(function (r) { return !NS.hasD(r); });
      if (i === -1) { addRow(k); i = e.rows.length - 1; }
      sheetCtx.i = i;
    }
    var row = e.rows[i];
    $('#sheetTitle').textContent = NS.fmtDay(k) + ' · ' + (row.name || 'New patient');
    var filled = e.rows.filter(NS.hasD).length;
    $('#sheetPos').textContent = (i + 1) + ' / ' + Math.max(e.rows.length, 1);
    Object.keys(NS.ER).forEach(function (f) {
      var el = $('#f-' + f);
      if (!el) return;
      el.value = row[f] == null ? NS.ER[f] : row[f];
    });
    var has = NS.hasD(row);
    $('#btnSheetDel').style.visibility = has ? 'visible' : 'hidden';
    $('#btnSheetDup').style.visibility = has ? 'visible' : 'hidden';
    renderDeptChips();
    $('#sheetHint').textContent = has ? 'Editing ' + (row.name || 'this patient') + ' — changes save as you type.' : 'Saves as you type.';
    $('#sheet').classList.add('on');
    $('#sheet').setAttribute('aria-hidden', 'false');
    $('#scrim').classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var f = $('#f-opd'); if (f) f.focus(); }, 220);
  }

  function closeSheet() {
    $('#sheet').classList.remove('on');
    $('#sheet').setAttribute('aria-hidden', 'true');
    $('#scrim').classList.remove('on');
    document.body.style.overflow = '';
    renderRegister(); renderCal(); renderChips(); refOpdList();
    if (NS.renderDashboard) NS.renderDashboard();
    if (sheetCtx.prevFocus && document.contains(sheetCtx.prevFocus)) sheetCtx.prevFocus.focus();
  }

  function sheetStep(dir) {
    var k = sheetCtx.k, e = NS.ensureD(k);
    var j = sheetCtx.i + dir;
    if (j < 0) { NS.toast('Start of ' + NS.fmtDay(k) + '.'); return; }
    if (j >= e.rows.length) {
      if (!NS.hasD(e.rows[sheetCtx.i])) { NS.toast('Fill this patient first.'); return; }
      e.rows.push(Object.assign({}, NS.ER));
      NS.saveNow();
    }
    openSheet(k, j);
  }

  function bindSheet() {
    var body = $('#sheetBody');
    if (!body) return;
    var flush = NS.debounce(function () { NS.saveNow(); }, 400);

    body.addEventListener('input', function (ev) {
      var el = ev.target;
      if (!el.dataset || !el.dataset.f) return;
      var e = NS.ensureD(sheetCtx.k), row = e.rows[sheetCtx.i];
      if (!row) return;
      row[el.dataset.f] = el.value;
      $('#btnSheetDel').style.visibility = NS.hasD(row) ? 'visible' : 'hidden';
      flush();
    });
    body.addEventListener('change', function (ev) {
      var el = ev.target;
      if (!el.dataset || !el.dataset.f) return;
      var e = NS.ensureD(sheetCtx.k), row = e.rows[sheetCtx.i];
      if (!row) return;
      if (el.dataset.f === 'age') {
        var convAge = NS.normaliseAge(el.value);
        if (convAge !== el.value) { el.value = convAge; NS.toast('Age from date of birth: ' + convAge + ' years.'); }
      }
      if (el.dataset.f === 'department') renderDeptChips();
      row[el.dataset.f] = el.value;
      if (el.dataset.f === 'opd') {
        var rec = NS.findCase(el.value);
        if (rec && String(rec.opd).toLowerCase() === String(el.value).toLowerCase()) {
          var copy = {};
          Object.keys(NS.ER).forEach(function (f) {
            if (f === 'opd' || f === 'caseType') return;
            if (String(row[f] || '').trim() === '' && rec[f]) copy[f] = rec[f];
          });
          Object.keys(copy).forEach(function (f) {
            row[f] = copy[f];
            var inp = $('#f-' + f);
            if (inp) inp.value = copy[f];
          });
          if (Object.keys(copy).length) NS.toast('Filled from OPD ' + el.value + '.');
        }
      }
      NS.saveNow();
    });
    body.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA') {
        ev.preventDefault();
        var fields = NS.DF.concat(['caseType', 'sex']);
        var idx = fields.indexOf(ev.target.dataset.f);
        if (idx >= 0 && idx < fields.length - 1) {
          var next = $('#f-' + fields[idx + 1]);
          if (next) next.focus();
        } else {
          sheetStep(1);
        }
      }
    });

    $('#deptChips').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-dept]');
      if (!b) return;
      var inp = $('#f-department');
      if (!inp) return;
      inp.value = b.dataset.dept;
      var e = NS.ensureD(sheetCtx.k), row = e.rows[sheetCtx.i];
      if (row) row.department = b.dataset.dept;
      renderDeptChips();
      NS.sched();
    });

    $('#btnSheetDup').addEventListener('click', function () {
      var k = sheetCtx.k, i = sheetCtx.i;
      NS.saveNow();
      var j = duplicate(k, i);
      if (j == null) return;
      openSheet(k, j);
    });

    $('#btnSheetClose').addEventListener('click', closeSheet);
    $('#scrim').addEventListener('click', closeSheet);
    $('#btnSheetSave').addEventListener('click', function () { NS.saveNow(); closeSheet(); });
    $('#btnSheetPrev').addEventListener('click', function () { sheetStep(-1); });
    $('#btnSheetDel').addEventListener('click', function () {
      var k = sheetCtx.k, i = sheetCtx.i;
      var snap = NS.daySnapshot(k);
      closeSheet();
      NS.ent()[k].rows.splice(i, 1);
      while (NS.ent()[k].rows.length < NS.DROWS) NS.ent()[k].rows.push(Object.assign({}, NS.ER));
      NS.saveNow(); renderAll();
      NS.toast('Patient removed.', 'Undo', function () { NS.restoreDay(k, snap); renderAll(); });
    });
  }

  /* ================= events ================= */
  function applyRange(from, to, status, note) {
    if (!from || !to) { NS.toast('Pick both dates.'); return 0; }
    if (from > to) { var t = from; from = to; to = t; }
    var cur = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
    var n = 0, guard = 0;
    while (cur <= end && guard < 400) {
      var k = cur.getFullYear() + '-' + pad(cur.getMonth() + 1) + '-' + pad(cur.getDate());
      var e = NS.ensureD(k);
      e.status = status;
      if (note) e.note = note;
      n++;
      cur.setDate(cur.getDate() + 1); guard++;
    }
    NS.saveNow(); renderAll();
    NS.toast(n + ' day' + (n === 1 ? '' : 's') + ' marked ' + NS.ST[status].l.toLowerCase() + '.');
    return n;
  }

  function bind() {
    var host = $('#days');

    host.addEventListener('input', function (ev) {
      var el = ev.target;
      if (el.dataset && el.dataset.dnote != null) { NS.ensureD(el.dataset.dnote).note = el.value; NS.sched(); return; }
      if (!el.dataset || !el.dataset.f) return;
      var tr = el.closest('tr[data-date]');
      if (!tr) return;
      var k = tr.dataset.date, i = +tr.dataset.idx, e = NS.ensureD(k);
      if (!e.rows[i]) return;
      e.rows[i][el.dataset.f] = el.value;
      NS.sched(); updateCount(k);
      if (i === e.rows.length - 1 && NS.hasD(e.rows[i])) growDay(k);
    });

    host.addEventListener('focusout', function (ev) {
      var el = ev.target;
      if (!el.dataset || !el.dataset.f) return;
      NS.saveNow();
      if (el.dataset.f === 'opd' || el.dataset.f === 'name') { refOpdList(); renderChips(); }
    });

    host.addEventListener('change', function (ev) {
      var el = ev.target;
      if (el.dataset && el.dataset.dstat) {
        var k = el.dataset.dstat;
        NS.ensureD(k).status = el.value;
        el.className = 'selx st-' + el.value;
        var cell = document.querySelector('.cell[data-date="' + k + '"]');
        if (cell) { cell.className = cell.className.replace(/st-\w+/g, '').trim() + ' st-' + el.value; }
        NS.saveNow(); renderCal(); return;
      }
      if (!el.dataset || !el.dataset.f) return;
      var tr = el.closest('tr[data-date]');
      if (!tr) return;
      var kk = tr.dataset.date, ii = +tr.dataset.idx, e = NS.ensureD(kk);
      if (!e.rows[ii]) return;
      if (el.dataset.f === 'age') {
        var conv = NS.normaliseAge(el.value);
        if (conv !== el.value) { el.value = conv; NS.toast('Age from date of birth: ' + conv + ' years.'); }
        el.value = conv;
      }
      e.rows[ii][el.dataset.f] = el.value;
      NS.saveNow(); updateCount(kk);
      if (el.dataset.f === 'opd') {
        var rec = NS.findCase(el.value);
        if (rec) { autofill(tr, kk, ii, rec); return; }
      }
      if (ii === e.rows.length - 1 && NS.hasD(e.rows[ii])) growDay(kk);
    });

    host.addEventListener('click', function (ev) {
      var add = ev.target.closest('[data-add]');
      if (add) { addRow(add.dataset.add, !narrow()); return; }
      var pd = ev.target.closest('[data-printday]');
      if (pd) { printDay(pd.dataset.printday); return; }
      var clr = ev.target.closest('[data-clear]');
      if (clr) {
        if (!confirm('Clear every patient and the note for this day?')) return;
        clearDay(clr.dataset.clear); return;
      }
      var del = ev.target.closest('[data-del]');
      if (del) {
        var tr = del.closest('tr[data-date]');
        deleteRow(tr.dataset.date, +del.dataset.del);
        return;
      }
      var tog = ev.target.closest('[data-toggle]');
      if (tog) {
        var k = tog.dataset.toggle;
        S.open[k] = !isOpen(k);
        renderRegister();
        return;
      }
      var open = ev.target.closest('[data-open]');
      if (open) { openSheet(open.closest('.day').dataset.date, +open.dataset.open); return; }
      var drow = ev.target.closest('tr.drow');
      if (drow && ev.target.tagName === 'TD') { /* click empty cell → focus first field */
        var f = drow.querySelector('[data-f]'); if (f) f.focus();
      }
    });

    /* keyboard inside the table: Enter / Ctrl+Enter / Alt+arrows */
    host.addEventListener('keydown', function (ev) {
      var el = ev.target;
      if (!el.dataset || !el.dataset.f) return;
      var tr = el.closest('tr[data-date]');
      if (!tr) return;
      var k = tr.dataset.date, i = +tr.dataset.idx;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        var e = NS.ensureD(k);
        if (i >= e.rows.length - 1) addRow(k, true);
        else {
          var next = document.querySelector('.drow[data-date="' + k + '"][data-idx="' + (i + 1) + '"] [data-f="' + el.dataset.f + '"]');
          if (next) { next.focus(); next.select && next.select(); }
        }
        NS.saveNow();
      } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        var dir = ev.key === 'ArrowDown' ? 1 : -1;
        var target = document.querySelector('.drow[data-date="' + k + '"][data-idx="' + (i + dir) + '"] [data-f="' + el.dataset.f + '"]');
        if (target) { ev.preventDefault(); target.focus(); }
      }
    });

    $('#calGrid').addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-date]');
      if (!c) return;
      NS.saveNow(); selectDay(c.dataset.date, true);
    });

    $('#regFilter').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-filter]');
      if (!b) return;
      S.filter = b.dataset.filter;
      NS.settingsSave();
      $$('#regFilter button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderRegister();
    });

    $('#chips').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-case]');
      if (!b) return;
      var rec = NS.findCase(b.dataset.case);
      if (!rec) return;
      var k = S.curD || NS.tKey();
      if (S.curM !== k.slice(0, 7)) { S.curM = k.slice(0, 7); syncMonthInputs(); }
      var e = NS.ensureD(k);
      var i = e.rows.findIndex(function (r) { return !NS.hasD(r); });
      if (i === -1) { e.rows.push(Object.assign({}, NS.ER)); i = e.rows.length - 1; }
      e.rows[i].opd = rec.opd || '';
      var copy = {};
      Object.keys(NS.ER).forEach(function (f) {
        if (f === 'opd') return;
        if (rec[f]) copy[f] = f === 'caseType' ? 'Old' : rec[f];
      });
      Object.keys(copy).forEach(function (f) { e.rows[i][f] = copy[f]; });
      S.open[k] = true;
      NS.saveNow(); renderAll();
      if (narrow()) openSheet(k, i);
      else {
        var tr = document.querySelector('.drow[data-date="' + k + '"][data-idx="' + i + '"]');
        if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); var f = tr.querySelector('[data-f="name"]'); if (f) f.focus(); }
      }
      NS.toast('Added ' + (rec.name || 'patient') + ' to ' + NS.fmtDay(k) + '.');
    });

    $('#btnPrintReg').addEventListener('click', function () {
      NS.saveNow();
      document.body.classList.add('printing-register');
      setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printing-register'); }, 400); }, 40);
    });

    window.addEventListener('resize', NS.debounce(function () {
      if (document.querySelector('#view-register') && !document.querySelector('#view-register').hidden) renderRegister();
    }, 250));
    if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', function () { renderRegister(); });
  }

  function syncMonthInputs() {
    var mp = $('#monthPick'); if (mp) mp.value = S.curM;
    var lbl = $('#btnMonthLabel'); if (lbl) lbl.textContent = NS.fmtMonth(S.curM);
    var sm = $('#statMonth'); if (sm && !sm.value) sm.value = S.curM;
  }

  function renderAll() {
    renderCal(); renderRegister(); renderChips(); refOpdList(); markSelected();
    NS.emit('render');
  }

  /* Ctrl+D: duplicate whichever patient is in front of the user */
  function duplicateCurrent() {
    if ($('#sheet').classList.contains('on')) {
      NS.saveNow();
      var j = duplicate(sheetCtx.k, sheetCtx.i);
      if (j != null) openSheet(sheetCtx.k, j);
      return true;
    }
    var tr = document.activeElement && document.activeElement.closest ? document.activeElement.closest('tr.drow') : null;
    if (!tr) { NS.toast('Open a patient (or click a row) first, then Ctrl+D.'); return false; }
    duplicate(tr.dataset.date, +tr.dataset.idx);
    return true;
  }

  NS.duplicateCurrent = duplicateCurrent;
  NS.renderCal = renderCal;
  NS.printDay = printDay;
  NS.duplicate = duplicate;
  NS.applyRange = applyRange;
  NS.renderRegister = renderRegister;
  NS.renderChips = renderChips;
  NS.refOpdList = refOpdList;
  NS.selectDay = selectDay;
  NS.openSheet = openSheet;
  NS.closeSheet = closeSheet;
  NS.addRow = addRow;
  NS.renderRegisterAll = renderAll;
  NS.syncMonthInputs = syncMonthInputs;
  NS.isNarrow = narrow;
  NS.bindRegister = bind;
  NS.bindSheet = bindSheet;
})(window.OPD = window.OPD || {});
