/* OPD Register — calendar, month register, patient editor sheet. */
(function (NS) {
  'use strict';
  var $ = NS.$, $$ = NS.$$, esc = NS.esc, pad = NS.pad;
  var S = NS.S;

  var mqNarrow = window.matchMedia('(max-width: 900px)');
  S.scope = 'month';
  S.rowFilter = '';
  S.onlyDay = '';
  S.missingOnly = false;
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
    if (S.rowFilter && rowsMatching(k).length) return true;
    if (Object.prototype.hasOwnProperty.call(S.open, k)) return S.open[k];
    /* a day opens itself when it has patients, is the selected day, or is today */
    return NS.cnt(k) > 0 || k === S.curD || k === NS.tKey();
  }

  /* ================= ROW MARKUP (desktop) ================= */
  /* One map of field -> width and header, plus an order per preset. The register used to
     write its cells out by hand, so "Treatment before Diagnosis" was a rewrite rather than
     a setting. */
  var COLW = { sr: 34, opd: 86, caseType: 52, department: 118, name: 140, age: 46, sex: 44,
               phone: 92, address: 120, diagnosis: 150, treatment: 152, followUp: 80, acts: 46 };
  var COLHEAD = { opd: 'OPD no.', caseType: 'Case', department: 'Department', name: 'Name',
                  age: 'Age', sex: 'Sex', phone: 'Mobile', address: 'Address',
                  diagnosis: 'Diagnosis', treatment: 'Treatment', followUp: 'Follow-up' };
  var ORDERS = {
    default: ['opd', 'caseType', 'department', 'name', 'age', 'sex', 'phone', 'address', 'diagnosis', 'treatment', 'followUp'],
    treat:   ['opd', 'caseType', 'department', 'name', 'age', 'sex', 'phone', 'address', 'treatment', 'diagnosis', 'followUp'],
    name:    ['name', 'opd', 'age', 'sex', 'department', 'diagnosis', 'treatment', 'followUp', 'phone', 'address', 'caseType']
  };
  function order() { return ORDERS[S.colOrder] || ORDERS.default; }

  function sel(v, cur) { return v === cur ? ' selected' : ''; }

  var CELL = {
    opd: function (r) {
      return '<td><input class="cellin num" data-f="opd" list="opdList" autocomplete="off" placeholder="OPD no." value="' + esc(r.opd) + '"></td>';
    },
    caseType: function (r) {
      return '<td><select class="cellin" data-f="caseType"><option value="New"' + sel('New', r.caseType) + '>New</option>' +
        '<option value="Old"' + sel('Old', r.caseType) + '>Old</option></select></td>';
    },
    department: function (r) {
      return '<td><input class="cellin" data-f="department" list="deptList" autocomplete="off" placeholder="Dept." value="' + esc(r.department) + '"></td>';
    },
    name: function (r) {
      return '<td><input class="cellin" data-f="name" autocomplete="off" placeholder="Patient name" value="' + esc(r.name) + '"></td>';
    },
    age: function (r) {
      return '<td><input class="cellin num" data-f="age" inputmode="text" autocomplete="off" placeholder="Age" value="' + esc(r.age) + '"></td>';
    },
    sex: function (r) {
      return '<td><select class="cellin" data-f="sex">' + ['', 'M', 'F', 'O'].map(function (v) {
        return '<option value="' + v + '"' + sel(v, r.sex) + '>' + (v || '—') + '</option>';
      }).join('') + '</select></td>';
    },
    phone: function (r) {
      return '<td><input class="cellin num" data-f="phone" inputmode="tel" autocomplete="off" placeholder="Mobile" value="' + esc(r.phone) + '"></td>';
    },
    address: function (r) {
      return '<td><input class="cellin" data-f="address" autocomplete="off" placeholder="Address" value="' + esc(r.address) + '"></td>';
    },
    diagnosis: function (r) {
      return '<td><input class="cellin" data-f="diagnosis" autocomplete="off" placeholder="Diagnosis" value="' + esc(r.diagnosis) + '"></td>';
    },
    treatment: function (r) {
      return '<td><input class="cellin" data-f="treatment" autocomplete="off" placeholder="Treatment" value="' + esc(r.treatment) + '"></td>';
    },
    followUp: function (r) {
      return '<td><input class="cellin num" data-f="followUp" type="date" value="' + esc(r.followUp) + '" title="Follow-up date"></td>';
    }
  };

  function rowHTML(r, i) {
    var cells = order().map(function (f) { return CELL[f](r); }).join('');
    return '<td class="sr num" draggable="true" data-drag="' + i + '" title="Drag this row to another day, or click to open the patient">' + (i + 1) + '</td>' +
      cells +
      '<td class="acts"><button class="rowrep" data-rep="' + i + '" title="Repeat the last prescription for this OPD no." aria-label="Repeat last prescription">&#8635;</button>' +
      '<button class="rowdel" data-del="' + i + '" title="Delete row" aria-label="Delete row">&times;</button></td>';
  }

  function tableHTML(k, list) {
    var cols = order();
    var cg = '<colgroup><col style="width:' + COLW.sr + 'px">' +
      cols.map(function (f) { return '<col style="width:' + COLW[f] + 'px">'; }).join('') +
      '<col style="width:' + COLW.acts + 'px"></colgroup>';
    var head = '<thead><tr><th>#</th>' + cols.map(function (f) { return '<th>' + COLHEAD[f] + '</th>'; }).join('') + '<th></th></tr></thead>';
    var body = list.map(function (x) {
      return '<tr class="drow" data-date="' + k + '" data-idx="' + x.i + '">' + rowHTML(x.r, x.i) + '</tr>';
    }).join('');
    return '<div class="tablewrap"><table class="reg" style="table-layout:fixed">' + cg + head + '<tbody data-tbody="' + k + '">' + body + '</tbody></table></div>';
  }

  function cardsHTML(k, list) {
    var out = list.map(function (x) {
      var r = x.r, i = x.i;
      if (!NS.hasD(r)) return '';
      var ini = (r.name || '?').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
      var meta = [NS.ageLabel(r.age), r.sex === 'M' ? 'Male' : r.sex === 'F' ? 'Female' : r.sex === 'O' ? 'Other' : '', r.department || '', r.diagnosis || '']
        .filter(Boolean).join(' · ');
      var due = r.followUp ? '<span class="due">↻ ' + esc(r.followUp.slice(8) + '/' + r.followUp.slice(5, 7)) + '</span>' : '';
      return '<button class="pcard" data-open="' + i + '">' +
        '<span class="ava">' + esc(ini) + '</span>' +
        '<span class="pm"><span class="pn">' + esc(r.name || 'Unnamed') + '</span>' +
        '<span class="pd">' + esc(meta || 'No details yet') + '</span></span>' +
        '<span class="pt num">' + esc(r.opd || '—') + due + '</span></button>';
    }).join('');
    var all = NS.ensureD(k).rows;
    var filled = all.filter(NS.hasD).length;
    var empty = all.length - filled;
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
      '<button data-daysearch="' + k + '" title="Search inside this day" aria-label="Search inside this day"><svg width="13" height="13"><use href="#i-search"/></svg></button>' +
      '<button data-printday="' + k + '" title="Print this day" aria-label="Print this day"><svg width="13" height="13"><use href="#i-print"/></svg></button>' +
      '<button class="danger" data-clear="' + k + '" title="Clear this day" aria-label="Clear this day"><svg width="13" height="13"><use href="#i-trash"/></svg></button>' +
      '</span></div>';
    if (open) {
      var list = rowsMatching(k);
      if (S.rowFilter && !list.length) {
        h += '<div class="empty" style="padding:14px">No row in this day matches “' + esc(S.rowFilter) + '”.</div>';
      } else {
        h += narrow() ? cardsHTML(k, list) : tableHTML(k, list);
      }
    }
    return h + '</section>';
  }

  /* the rows of a day that survive the row filter, each with its real index */
  function rowsMatching(k) {
    var rows = NS.ensureD(k).rows, q = S.rowFilter.trim().toLowerCase();
    var out = [];
    rows.forEach(function (r, i) {
      if (q) {
        if (!NS.hasD(r)) return;
        var hay = [r.opd, r.name, r.department, r.diagnosis, r.treatment, r.address, r.phone].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      out.push({ r: r, i: i });
    });
    return out;
  }

  /* Sunday-to-Saturday, the week the selected day falls in */
  function weekStart(k) {
    var d = new Date(k + 'T00:00:00');
    d.setDate(d.getDate() - d.getDay());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function weekDays(k) {
    var start = new Date(weekStart(k) + 'T00:00:00'), out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    }
    return out;
  }

  function visibleDays() {
    var out = [];
    if (S.onlyDay) return [S.onlyDay];
    if (S.missingOnly) {
      var miss = NS.missingDays(S.curM);
      for (var md = 1, mn = NS.dim(S.curM); md <= mn; md++) {
        var mk2 = S.curM + '-' + pad(md);
        if (miss[mk2]) out.push(mk2);
      }
      return out;
    }
    if (S.scope === 'week') {
      out = weekDays(S.curD || NS.tKey());
      if (S.filter === 'data') out = out.filter(function (k) { return NS.cnt(k) > 0; });
      if (S.filter === 'today') out = out.filter(function (k) { return k === NS.tKey(); });
      return out;
    }
    var mk = S.curM;
    for (var d = 1, n = NS.dim(mk); d <= n; d++) {
      var k = mk + '-' + pad(d);
      if (S.filter === 'data' && NS.cnt(k) === 0) continue;
      if (S.filter === 'today' && k !== NS.tKey()) continue;
      out.push(k);
    }
    return out;
  }

  /* ---- the week, as seven columns you can compare ---- */
  function weekGridHTML(days) {
    var totals = 0, perDay = [], busiest = { n: 0 };
    days.forEach(function (k) {
      var e = NS.ensureD(k);
      var list = e.rows.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return NS.hasD(x.r); });
      var q = S.rowFilter.trim().toLowerCase();
      if (q) list = list.filter(function (x) {
        return [x.r.opd, x.r.name, x.r.department, x.r.diagnosis, x.r.treatment, x.r.address, x.r.phone]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
      totals += list.length;
      perDay.push(list.length);
      if (list.length > busiest.n) busiest = { n: list.length, k: k };
      return { k: k, e: e, list: list };
    });

    var cols = days.map(function (k) {
      var e = NS.ensureD(k);
      var list = e.rows.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return NS.hasD(x.r); });
      var q = S.rowFilter.trim().toLowerCase();
      if (q) list = list.filter(function (x) {
        return [x.r.opd, x.r.name, x.r.department, x.r.diagnosis, x.r.treatment, x.r.address, x.r.phone]
          .join(' ').toLowerCase().indexOf(q) !== -1;
      });
      var d = new Date(k + 'T00:00:00');
      var st = e.status || 'working';
      var isToday = k === NS.tKey();
      var cards = list.map(function (x) {
        var r = x.r;
        return '<button class="wcard" data-wopen="' + k + ':' + x.i + '" title="Open ' + esc(r.name || 'patient') + '">' +
          '<b>' + esc(r.name || 'Unnamed') + '</b>' +
          '<span>' + esc([NS.ageLabel(r.age), r.sex === 'M' ? 'M' : r.sex === 'F' ? 'F' : '', r.department].filter(Boolean).join(' · ')) + '</span>' +
          (r.diagnosis ? '<em>' + esc(r.diagnosis) + '</em>' : '') +
          '</button>';
      }).join('');
      return '<div class="wcol' + (isToday ? ' today' : '') + '" data-wday="' + k + '">' +
        '<div class="wh"><b>' + d.toLocaleDateString(undefined, { weekday: 'short' }) + '</b>' +
        '<span class="num">' + d.getDate() + '</span>' +
        (st !== 'working' ? '<i class="ws st-' + st + '">' + NS.ST[st].s + '</i>' : '') +
        '<span class="wc num">' + (list.length || '') + '</span></div>' +
        '<div class="wb">' + (cards || '<span class="wnone">—</span>') + '</div>' +
        '<button class="wadd" data-wadd="' + k + '">+ Add</button>' +
        '</div>';
    }).join('');

    var avg = (totals / Math.max(1, perDay.filter(function (n) { return n > 0; }).length)).toFixed(1);
    return '<div class="wsum">' +
      '<span><b class="num">' + totals + '</b> patients this week</span>' +
      '<span><b class="num">' + avg + '</b> per active day</span>' +
      (busiest.k ? '<span>busiest <b>' + esc(NS.fmtDay(busiest.k)) + '</b> · <span class="num">' + busiest.n + '</span></span>' : '') +
      '</div>' +
      '<div class="weekgrid">' + cols + '</div>';
  }

  function renderRegister() {
    var host = $('#days');
    if (!host) return;
    NS.ensureM(S.curM);
    var days = visibleDays();
    if (S.scope === 'week' && !narrow()) {
      host.innerHTML = weekGridHTML(days);
    } else {
      host.innerHTML = days.length ? days.map(dayHTML).join('')
        : '<div class="empty"><b>No days to show</b>Switch the filter, or pick another month.</div>';
    }
    var only = $('#onlyDay');
    if (only) {
      var chips = '';
      if (S.onlyDay) chips += '<button class="chip" data-clearday="1" title="Show every day again">Only ' +
        esc(NS.fmtDay(S.onlyDay)) + ' <b style="margin-left:4px">&times;</b></button>';
      if (S.missingOnly) chips += '<button class="chip" data-clearmiss="1" style="border-color:var(--warn);color:var(--warn)" ' +
        'title="Show every day again">No diagnosis <b style="margin-left:4px">&times;</b></button>';
      only.hidden = !chips;
      only.innerHTML = chips;
    }
    var wk = S.scope === 'week';
    var wl = $('#weekLbl'), wp = $('#btnWeekPrev'), wn = $('#btnWeekNext');
    if (wl) {
      wl.hidden = !wk;
      if (wk) {
        var days7 = weekDays(S.curD || NS.tKey());
        var a = new Date(days7[0] + 'T00:00:00'), b = new Date(days7[6] + 'T00:00:00');
        wl.textContent = a.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' – ' +
          b.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    if (wp) wp.hidden = !wk;
    if (wn) wn.hidden = !wk;
    var t = $('#regTitle');
    if (t) t.textContent = NS.db.current;
    var sub = $('#regSub');
    if (sub) sub.textContent = (wk ? 'Week of ' + NS.fmtDay(weekStart(S.curD || NS.tKey())) : NS.fmtMonth(S.curM)) +
      ' · ' + NS.monthCount(S.curM) + ' patients this month · ' + NS.locNames().length + ' location' + (NS.locNames().length > 1 ? 's' : '');
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

  /* one patient's visits on half a page, for the file or the patient */
  function printSlip(k, i) {
    var row = ((NS.ent()[k] || {}).rows || [])[i];
    if (!row) return;
    var list = NS.patientHistory(row.opd, k, i);
    var visits = list.concat([{ date: k, i: i, row: row }]).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var esc2 = NS.esc;
    $('#slip').innerHTML =
      '<div class="sliphead"><div><b>' + esc2(NS.db.current) + '</b><span>OPD record — visit history</span></div>' +
      '<div style="text-align:right"><b>' + esc2(row.name || 'Unnamed') + '</b>' +
      '<span>' + esc2([row.opd ? 'OPD ' + row.opd : '', NS.ageLabel(row.age), row.sex === 'M' ? 'Male' : row.sex === 'F' ? 'Female' : '', row.phone].filter(Boolean).join(' · ')) + '</span></div></div>' +
      '<table class="st"><thead><tr><th>Date</th><th>Case</th><th>Dept.</th><th>Diagnosis</th><th>Treatment</th><th>Follow-up</th></tr></thead><tbody>' +
      visits.map(function (v) {
        return '<tr><td>' + esc2(NS.fmtDay(v.date)) + '</td><td>' + esc2(v.row.caseType || '') + '</td>' +
          '<td>' + esc2(v.row.department || '') + '</td><td>' + esc2(v.row.diagnosis || '') + '</td>' +
          '<td>' + esc2(v.row.treatment || '') + '</td><td>' + esc2(v.row.followUp ? NS.fmtDay(v.row.followUp) : '') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="slipfoot"><span>Printed ' + new Date().toLocaleDateString() + '</span><span>' + visits.length + ' visit' + (visits.length > 1 ? 's' : '') + '</span></div>';
    document.body.classList.add('printing-slip');
    setTimeout(function () {
      window.print();
      setTimeout(function () { document.body.classList.remove('printing-slip'); }, 400);
    }, 40);
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
  /* copy the last prescription for this OPD number into this row */
  function repeatLast(k, i) {
    var e = NS.ensureD(k), row = e.rows[i];
    if (!row || !String(row.opd || '').trim()) { NS.toast('This row has no OPD number yet.'); return false; }
    var prev = NS.patientHistory(row.opd, k, i)[0];
    if (!prev) { NS.toast('No earlier visit for OPD ' + row.opd + '.'); return false; }
    ['diagnosis', 'treatment'].forEach(function (f) {
      if (!prev.row[f]) return;
      row[f] = prev.row[f];
      var el = document.querySelector('.drow[data-date="' + k + '"][data-idx="' + i + '"] [data-f="' + f + '"]');
      if (el) el.value = prev.row[f];
    });
    NS.saveNow(); updateCount(k);
    NS.toast('Repeated the prescription from ' + NS.fmtDay(prev.date) + '.');
    return true;
  }

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

  /* a suggested next number, offered — never filled in behind the user's back */
  function renderNextOpd(row) {
    var box = $('#opdChip');
    if (!box) return;
    var nxt = NS.nextOpd();
    if (!nxt || String(row.opd || '').trim()) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    box.innerHTML = '<button type="button" class="chip" data-usenext="' + esc(nxt) + '">Next number <b>' + esc(nxt) + '</b></button>';
  }

  /* what happened last time, and a one-tap way to repeat the prescription */
  function renderHistory(k, i, row) {
    var box = $('#sheetHistory');
    if (!box) return;
    var list = NS.patientHistory(row.opd, k, i);
    if (!list.length) {
      box.innerHTML = '<div class="hist"><div class="hh">Previous visits<span class="grow"></span>' +
        (String(row.opd || '').trim() ? 'none recorded' : 'add an OPD no.') + '</div></div>';
      return;
    }
    var last = list[0];
    box.innerHTML = '<div class="hist"><div class="hh">Previous visits' +
      '<span style="text-transform:none;letter-spacing:0;font-weight:700;color:var(--muted-2)">last seen ' + esc(NS.humanGap(list[0].date)) + '</span>' +
      '<span class="grow"></span>' +
      '<button type="button" class="btn sm ghost" data-slip="1" title="Print this patient\'s visits">Print slip</button>' +
      '</div>' +
      list.slice(0, 6).map(function (v) {
        var bits = [v.row.department, v.row.diagnosis].filter(Boolean).map(esc).join(' · ') ||
          (v.row.treatment ? '' : '<span>no diagnosis recorded</span>');
        var tx = v.row.treatment ? '<div class="hb"><span>Rx</span> ' + esc(v.row.treatment) + '</div>' : '';
        return '<div class="hv"><div class="hd"><b>' + esc(NS.fmtDay(v.date)) + '</b>' +
          '<small>' + esc(v.row.caseType || '') + '</small><span class="grow"></span>' +
          '<small>' + esc(NS.ageLabel(v.row.age)) + '</small></div>' +
          '<div class="hb">' + (bits || '<span>no diagnosis</span>') + '</div>' + tx +
          '<div class="ha"><button type="button" class="btn sm ghost" data-copyvisit="' + v.date + '" data-ci="' + v.i + '">Copy this prescription</button></div></div>';
      }).join('') +
      (list.length > 6 ? '<div class="empty2">+' + (list.length - 6) + ' older visit' + (list.length - 6 > 1 ? 's' : '') + '</div>' : '') +
      '</div>';
    sheetCtx.lastVisit = last;
  }

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
    renderNextOpd(row);
    renderHistory(k, i, row);
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
          renderHistory(sheetCtx.k, sheetCtx.i, row);
          renderNextOpd(row);
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

    $('#opdChip').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-usenext]');
      if (!b) return;
      var inp = $('#f-opd');
      if (!inp) return;
      inp.value = b.dataset.usenext;
      var e = NS.ensureD(sheetCtx.k), row = e.rows[sheetCtx.i];
      if (row) row.opd = b.dataset.usenext;
      renderNextOpd(row || {});
      renderHistory(sheetCtx.k, sheetCtx.i, row || {});
      NS.sched();
    });

    $('#sheetHistory').addEventListener('click', function (ev) {
      var sl = ev.target.closest('[data-slip]');
      if (sl) { printSlip(sheetCtx.k, sheetCtx.i); return; }
      var b = ev.target.closest('[data-copyvisit]');
      if (!b) return;
      var k = b.dataset.copyvisit, i = +b.dataset.ci;
      var rec = ((NS.ent()[k] || {}).rows || [])[i];
      if (!rec) return;
      var e = NS.ensureD(sheetCtx.k), row = e.rows[sheetCtx.i];
      if (!row) return;
      ['diagnosis', 'treatment'].forEach(function (f) {
        if (!rec[f]) return;
        row[f] = rec[f];
        var inp = $('#f-' + f);
        if (inp) inp.value = rec[f];
      });
      NS.saveNow();
      NS.toast('Copied the prescription from ' + NS.fmtDay(k) + '.');
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
    var n = 0, guard = 0, snapshot = {};
    while (cur <= end && guard < 400) {
      var k = cur.getFullYear() + '-' + pad(cur.getMonth() + 1) + '-' + pad(cur.getDate());
      snapshot[k] = NS.daySnapshot(k);
      var e = NS.ensureD(k);
      e.status = status;
      if (note) e.note = note;
      n++;
      cur.setDate(cur.getDate() + 1); guard++;
    }
    NS.saveNow(); renderAll();
    NS.toast(n + ' day' + (n === 1 ? '' : 's') + ' marked ' + NS.ST[status].l.toLowerCase() + '.', 'Undo', function () {
      Object.keys(snapshot).forEach(function (k) { NS.restoreDay(k, snapshot[k]); });
      renderAll();
      NS.toast('Range restored.');
    });
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
        var before = NS.ensureD(k).status || 'working';
        NS.ensureD(k).status = el.value;
        el.className = 'selx st-' + el.value;
        var cell = document.querySelector('.cell[data-date="' + k + '"]');
        if (cell) { cell.className = cell.className.replace(/st-\w+/g, '').trim() + ' st-' + el.value; }
        NS.saveNow(); renderCal();
        if (before !== el.value) {
          (function (kk, prev, next) {
            NS.toast(NS.fmtDay(kk) + ' → ' + NS.ST[next].l + '.', 'Undo', function () {
              NS.ensureD(kk).status = prev;
              NS.saveNow(); renderAll();
            });
          })(k, before, el.value);
        }
        return;
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
      var ds = ev.target.closest('[data-daysearch]');
      if (ds) {
        S.onlyDay = ds.dataset.daysearch;
        var rf = $('#rowFilter');
        if (rf) { rf.value = ''; rf.placeholder = 'Filter this day'; rf.focus(); }
        S.rowFilter = '';
        renderRegister();
        NS.toast('Showing ' + NS.fmtDay(S.onlyDay) + ' only.', 'All days', function () {
          S.onlyDay = '';
  S.missingOnly = false;
          var r2 = $('#rowFilter'); if (r2) r2.placeholder = 'Filter rows';
          renderRegister();
        });
        return;
      }
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
      var rep = ev.target.closest('[data-rep]');
      if (rep) {
        var rtr = rep.closest('tr[data-date]');
        repeatLast(rtr.dataset.date, +rep.dataset.rep);
        return;
      }
      var wo = ev.target.closest('[data-wopen]');
      if (wo) {
        var parts = wo.dataset.wopen.split(':');
        openSheet(parts[0], +parts[1]);
        return;
      }
      var wa = ev.target.closest('[data-wadd]');
      if (wa) { openSheet(wa.dataset.wadd, null); return; }
      var sr = ev.target.closest('td.sr');
      if (sr) {
        var rowTr = sr.closest('tr[data-date]');
        if (rowTr) openSheet(rowTr.dataset.date, +rowTr.dataset.idx);
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
    bindDrag();

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

    var od = $('#onlyDay');
    if (od) od.addEventListener('click', function (ev) {
      var miss = ev.target.closest('[data-clearmiss]');
      var one = ev.target.closest('[data-clearday]');
      if (!miss && !one) return;
      if (miss) S.missingOnly = false;
      if (one) {
        S.onlyDay = '';
        var rf2 = $('#rowFilter'); if (rf2) rf2.placeholder = 'Filter rows';
      }
      renderRegister();
    });

    $('#regScope').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-scope]');
      if (!b) return;
      S.scope = b.dataset.scope;
      $$('#regScope button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (S.scope === 'week' && S.curD.slice(0, 7) !== S.curM) S.curD = S.curM + '-01';
      renderRegister();
    });

    var rf = $('#rowFilter');
    if (rf) {
      rf.addEventListener('input', NS.debounce(function () {
        S.rowFilter = rf.value;
        renderRegister();
      }, 180));
      rf.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { rf.value = ''; S.rowFilter = ''; renderRegister(); }
      });
    }

    var wp = $('#btnWeekPrev'), wn = $('#btnWeekNext');
    if (wp) wp.addEventListener('click', function () { shiftWeek(-1); });
    if (wn) wn.addEventListener('click', function () { shiftWeek(1); });

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
      var cls = S.scope === 'week' ? 'printing-week' : 'printing-register';
      document.body.classList.add(cls);
      setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove(cls); }, 400); }, 40);
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

  function shiftWeek(dir) {
    var d = new Date((S.curD || NS.tKey()) + 'T00:00:00');
    d.setDate(d.getDate() + 7 * dir);
    var k = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    S.curD = k;
    if (S.curM !== k.slice(0, 7)) { S.curM = k.slice(0, 7); NS.ensureM(S.curM); NS.syncMonthInputs(); }
    NS.saveNow();
    renderCal(); renderRegister(); renderChips();
  }

  function renderAll() {
    renderCal(); renderRegister(); renderChips(); refOpdList(); markSelected();
    NS.emit('render');
  }

  /* ---------- moving a patient to another day ---------- */
  var dragCtx = null;

  function moveRow(fromKey, fromIdx, toKey) {
    if (!fromKey || fromKey === toKey) return false;
    if (isNaN(fromIdx) || fromIdx < 0) return false;
    if (isNaN(fromIdx) || fromIdx < 0) return false;
    var src = NS.ensureD(fromKey), dst = NS.ensureD(toKey);
    var row = src.rows[fromIdx];
    if (!row || !NS.hasD(row)) { NS.toast('That row is empty.'); return false; }
    var snapFrom = NS.daySnapshot(fromKey), snapTo = NS.daySnapshot(toKey);
    var copy = Object.assign({}, row);
    src.rows.splice(fromIdx, 1);
    while (src.rows.length < NS.DROWS) src.rows.push(Object.assign({}, NS.ER));
    var slot = dst.rows.findIndex(function (r) { return !NS.hasD(r); });
    if (slot === -1) { dst.rows.push(copy); } else { dst.rows[slot] = copy; }
    S.open[toKey] = true;
    NS.saveNow(); renderAll();
    NS.toast('Moved ' + (copy.name || 'the patient') + ' to ' + NS.fmtDay(toKey) + '.', 'Undo', function () {
      NS.restoreDay(fromKey, snapFrom);
      NS.restoreDay(toKey, snapTo);
      renderAll();
      NS.toast('Move undone.');
    });
    return true;
  }

  function bindDrag() {
    var host = $('#days');
    host.addEventListener('dragstart', function (ev) {
      var handle = ev.target.closest ? ev.target.closest('td.sr[draggable]') : null;
      if (!handle) return;
      var tr = handle.closest('tr[data-date]');
      if (!tr) return;
      /* data-drag lives on the handle (the row-number cell), not on the <tr> */
      dragCtx = { k: tr.dataset.date, i: +handle.dataset.drag };
      tr.classList.add('dragging');
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        try { ev.dataTransfer.setData('text/plain', dragCtx.k + ':' + dragCtx.i); } catch (e) {}
      }
    });
    host.addEventListener('dragend', function () {
      dragCtx = null;
      $$('.dragging').forEach(function (el) { el.classList.remove('dragging'); });
      $$('.dayhead.dragover').forEach(function (el) { el.classList.remove('dragover'); });
    });
    host.addEventListener('dragover', function (ev) {
      var head = ev.target.closest ? ev.target.closest('.dayhead[data-date]') : null;
      if (!head || !dragCtx) return;
      if (head.dataset.date === dragCtx.k) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
      $$('.dayhead.dragover').forEach(function (el) { if (el !== head) el.classList.remove('dragover'); });
      head.classList.add('dragover');
    });
    host.addEventListener('dragleave', function (ev) {
      var head = ev.target.closest ? ev.target.closest('.dayhead[data-date]') : null;
      if (head) head.classList.remove('dragover');
    });
    host.addEventListener('drop', function (ev) {
      var head = ev.target.closest ? ev.target.closest('.dayhead[data-date]') : null;
      if (!head || !dragCtx) return;
      ev.preventDefault();
      head.classList.remove('dragover');
      moveRow(dragCtx.k, dragCtx.i, head.dataset.date);
      dragCtx = null;
    });
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
  NS.shiftWeek = shiftWeek;
  NS.showMissing = function () {
    S.missingOnly = true; S.onlyDay = ''; S.scope = 'month'; S.rowFilter = '';
    $$('#regScope button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.scope === 'month')); });
    renderRegister();
  };
  NS.printSlip = printSlip;
  NS.moveRow = moveRow;
  NS.repeatLast = repeatLast;
  NS.weekGridHTML = weekGridHTML;
  NS.weekDays = weekDays;
  NS.rowsMatching = rowsMatching;
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
