/* OPD Register — patient search across months (and optionally locations). */
(function (NS) {
  'use strict';
  var $ = NS.$, esc = NS.esc;

  var cache = null, cacheKey = '';

  function index(allLoc) {
    var key = NS.db.current + '|' + allLoc;
    if (cache && cacheKey === key) return cache;
    var rows = NS.allCases({ allLoc: allLoc });
    cache = rows.map(function (c) {
      var r = c.row;
      return {
        loc: c.loc, date: c.date, i: c.i, opd: r.opd || '', name: r.name || '',
        age: r.age || '', sex: r.sex || '', dept: r.department || '',
        dx: r.diagnosis || '', tx: r.treatment || '', addr: r.address || '', ct: r.caseType || '',
        hay: [r.opd, r.name, r.age, r.department, r.diagnosis, r.treatment, r.address].join(' ').toLowerCase()
      };
    }).reverse();
    cacheKey = key;
    return cache;
  }
  function invalidate() { cache = null; }

  function hl(text, terms) {
    var s = String(text || '');
    if (!terms.length) return esc(s);
    var out = esc(s);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function render() {
    var box = $('#hits');
    if (!box) return;
    var q = ($('#qBig').value || '').trim().toLowerCase();
    var allLoc = $('#searchAllLoc').checked;
    var rows = index(allLoc);
    var terms = q.split(/\s+/).filter(Boolean);
    var hits = terms.length ? rows.filter(function (r) { return terms.every(function (t) { return r.hay.indexOf(t) !== -1; }); }) : rows;
    var limited = hits.slice(0, 300);
    var sub = $('#searchSub');
    if (sub) sub.textContent = terms.length
      ? hits.length + ' match' + (hits.length === 1 ? '' : 'es') + (hits.length > 300 ? ' (first 300 shown)' : '') + (allLoc ? ' · all locations' : ' · ' + NS.db.current)
      : rows.length + ' patient records' + (allLoc ? ' · all locations' : ' · ' + NS.db.current) + ' — newest first';

    if (!limited.length) {
      box.innerHTML = '<div class="empty"><b>' + (terms.length ? 'Nothing matches' : 'No patients yet') + '</b>' +
        (terms.length ? 'Try a shorter word, or tick All locations.' : 'Patients you type into the register appear here.') + '</div>';
      return;
    }
    box.innerHTML = limited.map(function (r) {
      var meta = [r.age ? r.age + 'y' : '', r.sex === 'M' ? 'Male' : r.sex === 'F' ? 'Female' : r.sex === 'O' ? 'Other' : '', r.dept, r.dx]
        .filter(Boolean).join(' · ');
      return '<div class="hit" data-loc="' + esc(r.loc) + '" data-date="' + esc(r.date) + '" data-i="' + r.i + '" tabindex="0" role="button">' +
        '<div class="h1">' + hl(r.name || 'Unnamed', terms) + '<span class="num">' + hl(r.opd, terms) + '</span></div>' +
        '<div class="h2">' + hl(meta || 'No details', terms) + '</div>' +
        '<div class="h3">' + esc(NS.fmtDay(r.date)) + (allLoc ? ' · ' + esc(r.loc) : '') + '</div>' +
        '</div>';
    }).join('');
  }

  function open(hit) {
    var loc = hit.dataset.loc, date = hit.dataset.date, i = +hit.dataset.i;
    if (loc !== NS.db.current) {
      NS.switchLoc(loc);
      NS.renderLocUI && NS.renderLocUI();
    }
    NS.S.curM = date.slice(0, 7);
    NS.S.curD = date;
    NS.S.open[date] = true;
    NS.syncMonthInputs();
    NS.switchView('register');
    NS.renderRegisterAll();
    NS.selectDay(date, true);
    setTimeout(function () { NS.openSheet(date, i); }, 260);
  }

  function bind() {
    var big = $('#qBig');
    if (big) {
      big.addEventListener('input', NS.debounce(render, 120));
      big.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          var first = $('#hits .hit');
          if (first) open(first);
        }
      });
    }
    var chk = $('#searchAllLoc');
    if (chk) chk.addEventListener('change', render);
    var box = $('#hits');
    if (box) {
      box.addEventListener('click', function (ev) {
        var h = ev.target.closest('.hit');
        if (h) open(h);
      });
      box.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter') return;
        var h = ev.target.closest('.hit');
        if (h) open(h);
      });
    }
    NS.on('saved', invalidate);
    NS.on('location', invalidate);
  }

  NS.renderSearch = render;
  NS.bindSearch = bind;
})(window.OPD = window.OPD || {});
