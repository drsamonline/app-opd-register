/* OPD Register — dashboard: KPIs, department share, sex split, trend, reading. */
(function (NS) {
  'use strict';
  var $ = NS.$, esc = NS.esc;

  function agg(mk) {
    var E = NS.ent(), n = NS.dim(mk);
    var a = { total: 0, male: 0, female: 0, other: 0, newC: 0, oldC: 0, med: 0, surg: 0, gyn: 0, ped: 0, other: 0, dept: {}, daily: [], days: 0, worked: 0 };
    for (var d = 1; d <= n; d++) {
      var k = mk + '-' + NS.pad(d);
      var e = E[k] || {};
      var rows = e.rows || [];
      var dayN = 0;
      rows.forEach(function (r) {
        if (!NS.hasD(r)) return;
        dayN++; a.total++;
        var sex = String(r.sex || '').trim().toUpperCase();
        var isOld = String(r.caseType || '').trim().toLowerCase() === 'old';
        var dk = NS.deptK(r.department);
        if (dk === 'gyn') { a.gyn++; a.female++; }
        else {
          if (sex === 'M') a.male++;
          else if (sex === 'F') a.female++;
          else a.other++;
          if (dk) a[dk]++; else a.other++;
        }
        if (dk !== 'gyn') { if (isOld) a.oldC++; else a.newC++; }
        else { if (isOld) a.oldC++; else a.newC++; }
        var dn = String(r.department || '').trim() || 'Unspecified';
        a.dept[dn] = (a.dept[dn] || 0) + 1;
      });
      if ((e.status || 'working') === 'working' && dayN > 0) a.worked++;
      a.daily.push({ k: k, d: d, n: dayN, status: e.status || 'working' });
      if (dayN > 0) a.days++;
    }
    return a;
  }

  function pct(v, t) { return t ? Math.round(v / t * 100) : 0; }

  function render() {
    var mk = NS.S.curM || NS.mKey(new Date());
    var a = agg(mk);
    var t = $('#dashTitle'), sub = $('#dashSub');
    if (t) t.textContent = NS.db.current;
    if (sub) sub.textContent = NS.fmtMonth(mk) + ' · ' + (a.worked || a.days) + ' active day' + ((a.worked || a.days) === 1 ? '' : 's');

    var perDay = a.days ? (a.total / a.days) : 0;
    set('kTotal', a.total); set('kTotalSub', a.total ? perDay.toFixed(1) + ' per active day' : 'nothing recorded yet');
    set('kMale', a.male); set('kMaleSub', a.total ? pct(a.male, a.total) + '% of total' : '—');
    set('kFemale', a.female); set('kFemaleSub', a.total ? pct(a.female, a.total) + '% of total' : '—');
    set('kNew', a.newC); set('kNewSub', a.total ? pct(a.newC, a.total) + '% of total' : '—');
    set('kOld', a.oldC); set('kOldSub', a.total ? pct(a.oldC, a.total) + '% of total' : '—');

    /* departments */
    var box = $('#dDept');
    var order = [['Medicine', a.med, 'b1'], ['Gynec & Obs', a.gyn, 'b2'], ['Surgery', a.surg, 'b3'], ['Pediatrics', a.ped, 'b4']];
    var maxD = Math.max(1, a.med, a.gyn, a.surg, a.ped);
    var extra = Object.keys(a.dept).filter(function (k) { return !NS.deptK(k); });
    var extraN = extra.reduce(function (s, k) { return s + a.dept[k]; }, 0);
    if (extraN) order.push(['Other / unspecified', extraN, 'b6']);
    if (box) box.innerHTML = order.map(function (o) {
      return '<div class="bar ' + o[2] + '"><span class="bl">' + esc(o[0]) + '</span>' +
        '<span class="bt"><i class="bf" style="width:' + Math.round(o[1] / maxD * 100) + '%"></i></span>' +
        '<span class="bv num">' + o[1] + '<small>' + (a.total ? pct(o[1], a.total) : 0) + '%</small></span></div>';
    }).join('');

    /* sex donut */
    var sexBox = $('#dSex');
    if (sexBox) {
      var r = 42, c = 2 * Math.PI * r;
      var mShare = a.total ? a.male / a.total : 0;
      var fShare = a.total ? a.female / a.total : 0;
      var oShare = Math.max(0, 1 - mShare - fShare);
      var segs = [
        { v: a.male, s: mShare, col: 'var(--info)', label: 'Male' },
        { v: a.female, s: fShare, col: 'var(--violet)', label: 'Female' },
        { v: a.other, s: oShare, col: 'var(--muted-2)', label: 'Not stated' }
      ];
      var off = 0;
      var arcs = segs.map(function (g) {
        var len = g.s * c;
        var el = '<circle r="' + r + '" cx="52" cy="52" fill="none" stroke="' + g.col + '" stroke-width="13" ' +
          'stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 52 52)"/>';
        off += len;
        return el;
      }).join('');
      sexBox.innerHTML =
        '<div class="donut"><svg viewBox="0 0 104 104" width="104" height="104">' +
        '<circle r="' + r + '" cx="52" cy="52" fill="none" stroke="var(--line-2)" stroke-width="13"/>' + arcs + '</svg>' +
        '<div class="ctr"><b class="num">' + a.total + '</b><span>patients</span></div></div>' +
        '<div class="legendx">' + segs.map(function (g) {
          return '<div><i style="background:' + g.col + '"></i>' + g.label + '<b class="num">' + g.v + '</b><small>' + (a.total ? pct(g.v, a.total) : 0) + '%</small></div>';
        }).join('') + '</div>';
    }

    /* trend */
    var tr = $('#dTrend');
    if (tr) {
      var maxT = Math.max(1, Math.max.apply(null, a.daily.map(function (x) { return x.n; })));
      tr.innerHTML = '<div class="trendwrap">' + a.daily.map(function (x) {
        var h = Math.round(x.n / maxT * 100);
        var cls = x.n === 0 ? 'z' : (x.n === maxT ? 'hi' : '');
        var dow = new Date(x.k + 'T00:00:00').getDay();
        var weekend = (dow === 0);
        return '<div class="tcol" title="' + esc(NS.fmtDay(x.k) + ' · ' + x.n + ' patient' + (x.n === 1 ? '' : 's')) + '">' +
          '<span class="tval num">' + (x.n || '') + '</span>' +
          '<i class="tbar ' + cls + (weekend ? ' wk' : '') + '" style="height:' + (x.n ? Math.max(6, h) : 2) + '%"></i>' +
          '<span class="tlab">' + (x.d % 5 === 1 || x.d === 1 ? x.d : '') + '</span></div>';
      }).join('') + '</div>';
      var hint = $('#dTrendHint');
      if (hint) hint.textContent = a.total ? 'peak ' + maxT + ' · average ' + (a.total / (a.days || 1)).toFixed(1) : 'patients per day';
    }

    /* recent */
    var rc = $('#dRecent');
    if (rc) {
      var recent = a.daily.filter(function (x) { return x.n > 0; }).slice(-8).reverse();
      rc.innerHTML = recent.length ? '<table class="minitable"><thead><tr><th>Day</th><th>Status</th><th style="text-align:right">Patients</th></tr></thead><tbody>' +
        recent.map(function (x) {
          return '<tr class="clickable" data-goday="' + x.k + '"><td>' + esc(NS.fmtDay(x.k)) + '</td>' +
            '<td style="color:var(--muted)">' + NS.ST[x.status].s + '</td><td class="n">' + x.n + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<div class="empty"><b>No patients this month</b>Open the register to start typing.</div>';
    }

    /* follow-ups due */
    var fw = $('#dFollow');
    if (fw) {
      var due = NS.dueFollowUps(14);
      var byDept = {};
      due.forEach(function (f) {
        var d = String(f.row.department || '').trim() || 'Unspecified';
        byDept[d] = (byDept[d] || 0) + 1;
      });
      var deptLine = Object.keys(byDept).sort(function (a, b) { return byDept[b] - byDept[a]; }).slice(0, 4)
        .map(function (d) { return '<span class="chip" style="pointer-events:none;min-height:24px;font-size:11px">' + esc(d) + ' <b>' + byDept[d] + '</b></span>'; })
        .join('');
      fw.innerHTML = due.length ? (deptLine ? '<div class="chips" style="padding:8px 12px;border-bottom:1px solid var(--line-2)">' + deptLine + '</div>' : '') +
        '<table class="minitable"><thead><tr><th>Due</th><th>Patient</th><th style="text-align:right">OPD</th></tr></thead><tbody>' +
        due.slice(0, 8).map(function (f) {
          var d = new Date(f.date + 'T00:00:00');
          var lbl = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
          return '<tr class="clickable" data-goday="' + f.seen + '" data-goi="' + f.i + '"><td>' + esc(lbl) + '</td>' +
            '<td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(f.row.name || '—') +
            (f.row.phone ? ' <span style="color:var(--muted-2)">· ' + esc(f.row.phone) + '</span>' : '') + '</td>' +
            '<td class="n">' + esc(f.row.opd || '—') + '</td></tr>';
        }).join('') + '</tbody></table>'
        + (due.length > 8 ? '<div style="padding:8px 12px;font-size:11.5px;color:var(--muted)">+' + (due.length - 8) + ' more in the next two weeks</div>' : '')
        : '<div class="empty"><b>Nothing due</b>Set a follow-up date on a patient to see it here.</div>';
    }

    /* reading / insights */
    var ins = $('#dInsights');
    if (ins) {
      var busiest = a.daily.reduce(function (b, x) { return x.n > b.n ? x : b; }, { n: 0, k: null });
      var zeroDays = a.daily.filter(function (x) { return x.n === 0 && x.status === 'working' && x.d <= new Date().getDate(); }).length;
      var oldRatio = a.total ? Math.round(a.oldC / a.total * 100) : 0;
      var miss = NS.missingDiagnosis(mk);
      var rowsI = [
        ['Busiest day', busiest.n ? NS.fmtDay(busiest.k) + ' · ' + busiest.n : '—', busiest.n / Math.max(1, a.total)],
        ['New vs follow-up', a.newC + ' / ' + a.oldC, a.newC / Math.max(1, a.total)],
        ['Working days with no entry', zeroDays + '', 1 - zeroDays / Math.max(1, NS.dim(mk))],
        ['Female share', (a.total ? pct(a.female, a.total) : 0) + '%', a.female / Math.max(1, a.total)],
        ['Gyn share of OPD', (a.total ? pct(a.gyn, a.total) : 0) + '%', a.gyn / Math.max(1, a.total)],
        ['Rows without a diagnosis', miss.n + (miss.n ? ' · tap to fix' : ''), 1 - miss.n / Math.max(1, a.total)]
      ];
      ins.className = 'readlist';
      var missRow = rowsI[rowsI.length - 1];
      ins.innerHTML = rowsI.map(function (r) {
        var isMiss = r === missRow && miss.n > 0;
        return '<div class="row"' + (isMiss ? ' data-miss="1" style="cursor:pointer"' : '') + '>' +
          '<span class="rk">' + esc(r[0]) + '</span><span class="rv"' + (isMiss ? ' style="color:var(--warn)"' : '') + '>' + esc(r[1]) + '</span></div>';
      }).join('');
    }
  }

  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  function bind() {
    document.addEventListener('click', function (ev) {
      var go = ev.target.closest('[data-goday]');
      if (!go) return;
      var k = go.dataset.goday;
      var idx = go.dataset.goi;
      NS.S.curM = k.slice(0, 7);
      NS.S.curD = k;
      NS.S.open[k] = true;
      NS.syncMonthInputs();
      NS.switchView('register');
      NS.selectDay(k, true);
      if (idx != null) setTimeout(function () { NS.openSheet(k, +idx); }, 300);
    });
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-miss]')) return;
      NS.S.rowFilter = '';
      NS.S.onlyDay = '';
      NS.switchView('register');
    });
    var b = $('#btnDashRegister');
    if (b) b.addEventListener('click', function () { NS.switchView('register'); });
  }

  NS.renderDashboard = render;
  NS.dashAgg = agg;
  NS.bindDashboard = bind;
})(window.OPD = window.OPD || {});
