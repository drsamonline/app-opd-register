/* OPD Register — shell: boot, views, month navigation, theme, menu, shortcuts. */
(function (NS) {
  'use strict';
  var $ = NS.$, $$ = NS.$$, esc = NS.esc;
  var VIEWS = ['dash', 'register', 'stats', 'search', 'info'];
  var current = 'dash';

  /* ---------------- views ---------------- */
  function switchView(v) {
    if (VIEWS.indexOf(v) === -1) v = 'dash';
    /* a modal must never survive a section change */
    if ($('#sheet') && $('#sheet').classList.contains('on')) NS.closeSheet();
    if ($('#menu')) $('#menu').classList.remove('on');
    current = v;
    $$('#railNav button, #tabbar button').forEach(function (b) {
      if (b.dataset.view === v) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    VIEWS.forEach(function (name) {
      var el = $('#view-' + name);
      if (el) el.hidden = name !== v;
    });
    if (v === 'dash') NS.renderDashboard();
    if (v === 'register') NS.renderRegisterAll();
    if (v === 'stats') { if (!NS.statsState.ran) NS.runStats(); }
    if (v === 'search') NS.renderSearch();
    if (v === 'info') renderInfo();
    try { history.replaceState(null, '', v === 'dash' ? location.pathname + location.search : '#' + v); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------- month ---------------- */
  function shiftMonth(delta) {
    var p = NS.S.curM.split('-').map(Number);
    var dt = new Date(p[0], p[1] - 1 + delta, 1);
    NS.S.curM = NS.mKey(dt);
    if (NS.S.curD.slice(0, 7) !== NS.S.curM) NS.S.curD = NS.S.curM + '-01';
    NS.saveNow();
    NS.syncMonthInputs();
    NS.ensureM(NS.S.curM);
    NS.renderCal(); NS.renderRegister(); NS.renderChips();
    if (current === 'dash') NS.renderDashboard();
  }
  function goToday() {
    var t = new Date();
    NS.S.curM = NS.mKey(t);
    NS.S.curD = NS.tKey();
    NS.S.open[NS.S.curD] = true;
    NS.saveNow();
    NS.syncMonthInputs();
    NS.ensureM(NS.S.curM);
    NS.renderCal(); NS.renderRegister(); NS.renderChips();
    if (current !== 'register') switchView('register');
    NS.selectDay(NS.S.curD, true);
  }

  /* ---------------- theme ---------------- */
  function applyTheme(t) {
    NS.S.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    var btn = $('#btnTheme');
    if (btn) btn.innerHTML = '<svg width="17" height="17"><use href="#' + (t === 'dark' ? 'i-sun' : 'i-moon') + '"/></svg>';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0c1219' : '#1f5fd0');
    NS.settingsSave();
  }

  /* ---------------- locations ---------------- */
  function renderLocUI() {
    var sel = $('#locSelect');
    if (sel) {
      sel.innerHTML = NS.locNames().map(function (n) {
        return '<option value="' + esc(n) + '"' + (n === NS.db.current ? ' selected' : '') + '>' + esc(n) + '</option>';
      }).join('');
    }
    var box = $('#locList');
    if (box) {
      box.innerHTML = NS.locNames().map(function (n) {
        var L = NS.db.locations[n].entries || {};
        var months = {}, patients = 0;
        Object.keys(L).forEach(function (k) {
          months[k.slice(0, 7)] = 1;
          ((L[k] || {}).rows || []).forEach(function (r) { if (NS.hasD(r)) patients++; });
        });
        return '<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:6px 8px;border:1px solid ' +
          (n === NS.db.current ? 'var(--accent)' : 'var(--line)') + ';border-radius:8px;background:' +
          (n === NS.db.current ? 'var(--accent-l)' : 'transparent') + '">' +
          '<b style="flex:1">' + esc(n) + '</b>' +
          '<span style="color:var(--muted);font-size:11.5px">' + patients + ' patients · ' + Object.keys(months).length + ' mo</span>' +
          (n === NS.db.current ? '<span style="font-size:10.5px;font-weight:800;color:var(--accent-d)">CURRENT</span>' : '') + '</div>';
      }).join('');
    }
    document.title = 'OPD Register — ' + NS.db.current;
  }

  function afterLocationChange() {
    NS.renderLocUI && NS.renderLocUI();
    renderLocUI();
    NS.ensureM(NS.S.curM);
    NS.renderCal(); NS.renderRegister(); NS.renderChips(); NS.refOpdList();
    NS.renderDashboard(); NS.renderSearch();
    updateStoreInfo();
  }

  function addLocation() {
    var n = prompt('Name of the new location or OPD centre:', '');
    if (n === null) return;
    var err = NS.addLoc(n);
    if (err) { alert(err); return; }
    afterLocationChange();
    NS.toast('Location "' + n.trim() + '" created.');
  }
  function renameLocation() {
    var from = NS.db.current;
    var n = prompt('Rename "' + from + '" to:', from);
    if (n === null) return;
    var err = NS.renameLoc(from, n);
    if (err) { alert(err); return; }
    afterLocationChange();
    NS.toast('Renamed.');
  }
  function deleteLocation() {
    var name = NS.db.current;
    if (NS.locNames().length <= 1) { alert('You must keep at least one location.'); return; }
    if (!confirm('Delete "' + name + '" and every entry in it?')) return;
    var snapshot = JSON.parse(JSON.stringify(NS.db.locations[name]));
    NS.delLoc(name);
    afterLocationChange();
    NS.toast('Location "' + name + '" deleted.', 'Undo', function () {
      NS.db.locations[name] = snapshot;
      NS.db.current = name;
      NS.saveNow();
      afterLocationChange();
      NS.toast('"' + name + '" restored.');
    });
  }

  /* ---------------- info panel ---------------- */
  function updateStoreInfo() {
    var dl = $('#storeInfo');
    if (!dl) return;
    var all = NS.allCases({ allLoc: true }).length;
    var months = {};
    NS.locNames().forEach(function (n) {
      Object.keys(NS.db.locations[n].entries || {}).forEach(function (k) { months[k.slice(0, 7)] = 1; });
    });
    var b = NS.bytes();
    dl.innerHTML =
      '<dt>Storage used</dt><dd>' + NS.humanSize(b) + '</dd>' +
      '<dt>Locations</dt><dd>' + NS.locNames().length + '</dd>' +
      '<dt>Patients</dt><dd>' + all + '</dd>' +
      '<dt>Months with data</dt><dd>' + Object.keys(months).length + '</dd>' +
      '<dt>Saved</dt><dd>' + (NS.isDemo() ? 'Demo — nothing is written' : 'In this browser only') + '</dd>';
    var rf = $('#railStore');
    if (rf) rf.textContent = NS.humanSize(b) + ' · ' + all + ' patients';
  }
  function renderInfo() { renderLocUI(); updateStoreInfo(); }

  /* ---------------- menu ---------------- */
  function openMenu() {
    var m = $('#menu'), btn = $('#btnMenu');
    var r = btn.getBoundingClientRect();
    m.classList.add('on');
    var w = m.offsetWidth || 210;
    m.style.top = Math.round(r.bottom + 6) + 'px';
    m.style.left = Math.round(Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  }
  function closeMenu() { $('#menu').classList.remove('on'); }

  function bindMenu() {
    $('#btnMenu').addEventListener('click', function (ev) {
      ev.stopPropagation();
      var m = $('#menu');
      if (m.classList.contains('on')) closeMenu(); else openMenu();
    });
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest('#menu') && !ev.target.closest('#btnMenu')) closeMenu();
    });
    $('#menu').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b) return;
      closeMenu();
      var act = b.dataset.act;
      if (act === 'export') NS.exportJson();
      if (act === 'csv') NS.exportMonthCsv(NS.S.curM);
      if (act === 'print') { NS.switchView('register'); setTimeout(function () { $('#btnPrintReg').click(); }, 120); }
      if (act === 'about') NS.switchView('info');
      if (act === 'today') goToday();
      if (act === 'newpatient') newPatient();
      if (act === 'demo') loadDemo();
      if (act === 'install' && window.__installPrompt) { window.__installPrompt.prompt(); window.__installPrompt = null; }
    });
  }

  function newPatient() {
    var k = NS.S.curD || NS.tKey();
    if (NS.S.curM !== k.slice(0, 7)) { NS.S.curM = k.slice(0, 7); NS.syncMonthInputs(); }
    NS.S.open[k] = true;
    NS.switchView('register');
    NS.renderRegisterAll();
    NS.selectDay(k, true);
    setTimeout(function () { NS.openSheet(k, null); }, 200);
  }

  function loadDemo() {
    if (!confirm('Load demo data? It replaces what is on screen until you reload the page — nothing is saved over your real data.')) return;
    NS.setDemo(true);
    var demo = NS.demoDB();
    // swap the live database for the demo, in memory only
    NS.db.locations = demo.locations;
    NS.db.current = demo.current;
    NS.S.curM = NS.mKey(new Date());
    NS.S.curD = NS.tKey();
    NS.syncMonthInputs();
    NS.ensureM(NS.S.curM);
    afterLocationChange();
    NS.toast('Demo data loaded — reload the page to go back to your own data.');
    switchView('dash');
  }

  /* ---------------- bulk day range ---------------- */
  function bindRange() {
    var btn = $('#btnRange'), panel = $('#rangePanel');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        if (!$('#rangeFrom').value) $('#rangeFrom').value = NS.S.curM + '-01';
        if (!$('#rangeTo').value) $('#rangeTo').value = NS.S.curM + '-' + NS.pad(NS.dim(NS.S.curM));
        $('#rangeFrom').focus();
      }
    });
    $('#rangeCancel').addEventListener('click', function () {
      panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    });
    $('#rangeApply').addEventListener('click', function () {
      var n = NS.applyRange($('#rangeFrom').value, $('#rangeTo').value, $('#rangeStatus').value, $('#rangeNote').value.trim());
      if (n) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); $('#rangeNote').value = ''; }
    });
  }

  /* ---------------- shortcuts ---------------- */
  function typing(el) {
    if (!el) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
  }
  function bindKeys() {
    document.addEventListener('keydown', function (ev) {
      var k = ev.key;
      if (k === 'Escape') {
        if ($('#sheet').classList.contains('on')) { NS.closeSheet(); return; }
        if ($('#menu').classList.contains('on')) { closeMenu(); return; }
      }
      if ((ev.ctrlKey || ev.metaKey) && (k === 'd' || k === 'D')) {
        ev.preventDefault(); NS.duplicateCurrent(); return;
      }
      if (ev.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) {
        ev.preventDefault(); shiftMonth(k === 'ArrowLeft' ? -1 : 1); return;
      }
      if (typing(ev.target)) return;
      if (ev.metaKey || ev.ctrlKey) return;
      if (k === '/') { ev.preventDefault(); NS.switchView('search'); var q = $('#qBig'); if (q) { q.focus(); q.select(); } return; }
      if (k === 'n' || k === 'N') { ev.preventDefault(); newPatient(); return; }
      if (k === 't' || k === 'T') { ev.preventDefault(); goToday(); return; }
      if (k === 'd' || k === 'D') { applyTheme(NS.S.theme === 'dark' ? 'light' : 'dark'); return; }
      if (k >= '1' && k <= '5') { switchView(VIEWS[+k - 1]); return; }
    });
  }

  /* ---------------- boot ---------------- */
  function init() {
    NS.load();
    NS.S.curM = NS.mKey(new Date());
    NS.S.curD = NS.tKey();
    var demoParam = /[?&]demo=1/.test(location.search);
    if (demoParam) {
      NS.setDemo(true);
      var d = NS.demoDB();
      NS.db.locations = d.locations;
      NS.db.current = d.current;
      NS.S.curM = NS.mKey(new Date());
      NS.S.curD = NS.tKey();
    }

    applyTheme(NS.S.theme);
    NS.bindToast();
    NS.bindRegister();
    NS.bindSheet();
    NS.bindDashboard();
    NS.bindStats();
    NS.bindSearch();
    bindMenu();
    bindRange();
    bindKeys();

    $$('#railNav button, #tabbar button').forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.dataset.view); });
    });
    $('#btnPrevMonth').addEventListener('click', function () { shiftMonth(-1); });
    $('#btnNextMonth').addEventListener('click', function () { shiftMonth(1); });
    $('#btnToday').addEventListener('click', goToday);
    $('#btnMonthLabel').addEventListener('click', function () {
      var mp = $('#monthPick');
      if (mp.showPicker) { try { mp.showPicker(); return; } catch (e) {} }
      mp.focus(); mp.click();
    });
    $('#monthPick').addEventListener('change', function (ev) {
      if (!ev.target.value) return;
      NS.S.curM = ev.target.value;
      if (NS.S.curD.slice(0, 7) !== NS.S.curM) NS.S.curD = NS.S.curM + '-01';
      NS.saveNow(); NS.syncMonthInputs(); NS.ensureM(NS.S.curM);
      NS.renderCal(); NS.renderRegister(); NS.renderChips();
      if (current === 'dash') NS.renderDashboard();
    });
    $('#btnTheme').addEventListener('click', function () { applyTheme(NS.S.theme === 'dark' ? 'light' : 'dark'); });
    $('#locSelect').addEventListener('change', function (ev) { NS.switchLoc(ev.target.value); });
    $('#btnAddLoc').addEventListener('click', addLocation);
    $('#btnRenameLoc').addEventListener('click', renameLocation);
    $('#btnDelLoc').addEventListener('click', deleteLocation);
    $('#btnExportJson').addEventListener('click', NS.exportJson);
    $('#btnExportCsvAll').addEventListener('click', function () { NS.exportMonthCsv(NS.S.curM); });
    var sc = $('#setCols'), st = $('#setTarget');
    if (sc) {
      sc.value = NS.S.colOrder;
      sc.addEventListener('change', function () {
        NS.S.colOrder = sc.value;
        NS.settingsSave();
        NS.renderRegister();
        NS.toast('Column order saved.');
      });
    }
    if (st) {
      st.value = NS.S.target || '';
      st.addEventListener('change', function () {
        var v = parseInt(st.value, 10);
        NS.S.target = isNaN(v) || v < 0 ? 0 : Math.min(200, v);
        st.value = NS.S.target || '';
        NS.settingsSave();
        NS.renderDashboard();
        NS.toast(NS.S.target ? 'Target: ' + NS.S.target + ' patients a day.' : 'Target cleared.');
      });
    }
    $('#fileImport').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      if (!confirm('Import "' + f.name + '"? This replaces everything currently stored.')) { ev.target.value = ''; return; }
      NS.importJson(f, function () {
        NS.S.curM = NS.mKey(new Date());
        NS.S.curD = NS.tKey();
        NS.syncMonthInputs();
        afterLocationChange();
        NS.renderRegisterAll();
      });
      ev.target.value = '';
    });

    var top = $('#qTop');
    if (top) top.addEventListener('input', function () {
      var q = $('#qBig');
      if (q) q.value = top.value;
      NS.switchView('search');
      NS.renderSearch();
      var big = $('#qBig');
      if (big) big.focus();
    });

    /* an import replaces everything — keep the old database in memory for one step */
    NS.onImported = function (previous) {
      NS.toast('Backup imported.', 'Undo', function () {
        NS.db.locations = previous.locations;
        NS.db.current = previous.current;
        NS.saveNow();
        afterLocationChange();
        NS.renderRegisterAll();
        NS.toast('Previous data restored.');
      });
    };

    /* recents for the register chips */
    NS.on('changed', function () { NS.renderChips(); updateStoreInfo(); });
    NS.on('saved', function () { updateStoreInfo(); });
    NS.on('location', function () { renderLocUI(); });

    /* render the first screen */
    NS.ensureM(NS.S.curM);
    NS.syncMonthInputs();
    NS.renderCal();
    NS.renderRegister();
    NS.renderChips();
    NS.refOpdList();
    NS.renderDashboard();
    NS.renderSearch();
    renderLocUI();
    updateStoreInfo();

    var hash = (location.hash || '').replace('#', '');
    switchView(VIEWS.indexOf(hash) !== -1 ? hash : 'dash');

    /* safety nets */
    ['beforeunload', 'pagehide', 'blur'].forEach(function (e) { window.addEventListener(e, NS.saveNow); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') NS.saveNow(); });
    window.addEventListener('storage', function (ev) {
      if (ev.key === 'dailyEntryRegister.v2' && !NS.isDemo()) NS.toast('This register was changed in another tab — reload to see it.');
    });

    /* install prompt */
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      window.__installPrompt = e;
      var mi = $('#miInstall');
      if (mi) mi.style.display = '';
    });
    window.addEventListener('appinstalled', function () {
      var mi = $('#miInstall');
      if (mi) mi.style.display = 'none';
      NS.toast('Installed. It now opens like any other app.');
    });

    /* service worker — offline */
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline caching is a bonus, not a requirement */ });
    }
  }

  NS.switchView = switchView;
  NS.shiftMonth = shiftMonth;
  NS.goToday = goToday;
  NS.applyTheme = applyTheme;
  NS.renderLocUI = renderLocUI;
  NS.newPatient = newPatient;
  NS.loadDemo = loadDemo;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.OPD = window.OPD || {});
