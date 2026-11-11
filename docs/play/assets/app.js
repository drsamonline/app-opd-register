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
      '<dt>Saved</dt><dd>' + (NS.isDemo() ? 'Demo — nothing is written'
        : (NS.S.locked ? 'Encrypted, in this browser' : 'In this browser only')) + '</dd>' +
      '<dt>Storage engine</dt><dd>' + (NS.storage.engine() === 'idb' ? 'IndexedDB' : 'localStorage (fallback)') + '</dd>';
    var rf = $('#railStore');
    if (rf) rf.textContent = NS.humanSize(b) + ' · ' + all + ' patients';
  }
  function renderInfo() {
    renderLocUI();
    updateStoreInfo();
    renderLockPanel();
    var line = $('#lastImport'), li = NS.S.lastImport;
    if (line) line.textContent = li ? ('Last import ' + li.when + ' · ' + li.mode + ' · ' + li.summary) : '';
  }

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
      if (act === 'lock') {
        switchView('info');
        setTimeout(function () {
          var p = $('#lockPass');
          if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      }
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
        if ($('#importDialog') && $('#importDialog').classList.contains('on')) {
          $('#importDialog').classList.remove('on');
          var sc = $('#dlgScrim'); if (sc) sc.classList.remove('on');
          document.body.style.overflow = '';
          return;
        }
        if ($('#csvDialog') && $('#csvDialog').classList.contains('on')) {
          $('#csvDialog').classList.remove('on');
          var sc2 = $('#dlgScrim'); if (sc2) sc2.classList.remove('on');
          document.body.style.overflow = '';
          return;
        }
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

  /* ---------------- the lock ---------------- */
  function showLock(msg) {
    var wrap = $('#lockWrap');
    if (!wrap) return;
    wrap.hidden = false;
    document.querySelector('.app').style.display = 'none';
    var err = $('#lockErr');
    if (msg) { err.hidden = false; err.textContent = msg; }
    setTimeout(function () { var i = $('#unlockPass'); if (i) i.focus(); }, 120);
  }
  function hideLock() {
    var wrap = $('#lockWrap');
    if (wrap) wrap.hidden = true;
    document.querySelector('.app').style.display = '';
    var p = $('#unlockPass'); if (p) p.value = '';
    var err = $('#lockErr'); if (err) { err.hidden = true; err.textContent = ''; }
  }

  function bindLock() {
    var form = $('#lockForm');
    if (!form) return;

    /* Forgot the passphrase? The encrypted register cannot be opened — but a backup file
       can replace it. This is the only honest exit, so it says exactly what it destroys. */
    var impBtn = $('#btnLockImport'), impFile = $('#lockImportFile');
    if (impBtn && impFile) {
      impBtn.addEventListener('click', function () {
        var ok = confirm('Start again from a backup file?\n\nThis DELETES the encrypted register on this device. ' +
          'If you do not have a backup, nothing can be recovered — the passphrase is the only key.');
        if (ok) impFile.click();
      });
      impFile.addEventListener('change', function () {
        var f = impFile.files && impFile.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          var text = String(r.result || '');
          var parsed = null;
          try { parsed = JSON.parse(text); } catch (e) { showLock('That file is not valid JSON.'); return; }

          /* an encrypted backup needs the passphrase already typed above */
          if (parsed && parsed.kind === 'vault') {
            var pass = $('#unlockPass').value;
            NS.lock.openVaultText(text, pass).then(function (db) {
              NS.S.locked = false; NS.S.lockedNow = false; NS.S.lockChoice = 'off';
              NS.settingsSave();
              NS.storage.del('vault').then(function () { return NS.storage.put('db', NS.validDB(db)); }).then(function () {
                NS.adopt(db); hideLock(); start();
                NS.toast('Restored from the encrypted backup. The lock is off.');
              });
            }).catch(function (e) { showLock(e && e.message ? e.message : 'Could not open that backup.'); });
            return;
          }

          var db0 = null;
          NS.openBackup(parsed).then(function (x) {
            db0 = NS.validDB(x);
            return NS.storage.del('vault');
          }).then(function () {
            var db = db0;
            return NS.storage.put('db', db).then(function () {
              NS.S.locked = false; NS.S.lockedNow = false; NS.S.lockChoice = 'off';
              NS.settingsSave();
              NS.adopt(db); hideLock(); start();
              NS.toast('Restored from the backup. The lock is off.');
            });
          }).catch(function (e) { showLock(e && e.message ? e.message : 'That backup could not be read.'); });
          return;

          var db = NS.validDB(parsed);
          NS.storage.del('vault').then(function () {
            return NS.storage.put('db', db);
          }).then(function () {
            return NS.storage.put('meta', { locked: false, at: Date.now() });
          }).then(function () {
            NS.S.locked = false;
            NS.S.lockedNow = false;
            NS.S.lockChoice = 'off';
            NS.settingsSave();
            NS.adopt(db);
            hideLock();
            start();
            NS.toast('Restored from the backup. The lock is off.');
          });
        };
        r.readAsText(f);
        impFile.value = '';
      });
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pass = $('#unlockPass').value;
      var btn = $('#btnUnlock');
      btn.disabled = true; btn.textContent = 'Opening…';
      NS.lock.unlock(pass).then(function (db) {
        NS.adopt(db);
        hideLock();
        start();
      }).catch(function (e) {
        showLock(e && e.message ? e.message : 'Could not open the register.');
      }).then(function () {
        btn.disabled = false; btn.textContent = 'Unlock';
      });
    });
  }

  /* The lock is optional, and the choice is made once and remembered — a prompt that
     nags every launch is the reason people turn features off. */
  function maybeShowNotice() {
    var el = $('#lockNotice');
    if (!el) return;
    var show = !NS.S.locked && !NS.S.lockChoice && NS.lock.supported() && !NS.isDemo();
    el.hidden = !show;
  }
  function hideNotice() { var el = $('#lockNotice'); if (el) el.hidden = true; }

  function bindNotice() {
    var on = $('#btnNoticeOn'), off = $('#btnNoticeOff');
    if (on) on.addEventListener('click', function () {
      hideNotice();
      switchView('info');
      setTimeout(function () {
        var panel = $('#lockPass');
        if (panel) { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); panel.focus(); }
      }, 200);
      NS.toast('Set a passphrase below. Nothing else changes.');
    });
    if (off) off.addEventListener('click', function () {
      hideNotice();
      NS.S.lockChoice = 'off';
      NS.settingsSave();
      NS.toast('Left unencrypted. Turn it on any time under About & help → Lock.');
    });
  }

  function renderLockPanel() {
    var state = $('#lockState'), on = $('#lockOnBox'), off = $('#lockOffBox');
    if (!state) return;
    if (!NS.lock.supported()) {
      state.innerHTML = '<p style="font-size:12.5px;color:var(--muted)">This browser has no Web Crypto, so the register cannot be encrypted here. The data stays unencrypted on this device.</p>';
      on.style.display = 'none'; off.style.display = 'none';
      return;
    }
    if (NS.S.locked) {
      state.innerHTML = '<p style="font-size:12.5px;color:var(--ok);font-weight:700">Encrypted with AES-GCM. Unlocked for this session.</p>';
      on.style.display = 'none'; off.style.display = 'flex';
      var idleSel = $('#setIdle');
      if (idleSel) idleSel.value = String(NS.S.lockIdle || 0);
    } else {
      state.innerHTML = '<p style="font-size:12.5px;color:var(--muted)">Off — the register is stored unencrypted in this browser.</p>';
      on.style.display = 'flex'; off.style.display = 'none';
    }
  }

  /* ---------- auto-lock when the machine is left alone ---------- */
  var idleT = null;
  function armIdle() {
    clearTimeout(idleT);
    if (!NS.S.locked || NS.S.lockedNow) return;
    var min = Number(NS.S.lockIdle) || 0;
    if (min <= 0) return;
    idleT = setTimeout(lockIdleNow, Math.max(500, min * 60000));
  }
  function lockIdleNow() {
    if (!NS.S.locked || NS.S.lockedNow) return;
    NS.saveNow();
    setTimeout(function () {
      NS.lock.lockNow();
      NS.forget();
      if (NS.closeSheet) NS.closeSheet();
      var m = $('#menu'); if (m) m.classList.remove('on');
      showLock('Locked after ' + (Number(NS.S.lockIdle) || 0) + ' minutes idle.');
    }, 250);
  }
  function bindIdle() {
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) {
      document.addEventListener(ev, armIdle, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') armIdle();
    });
  }

  function bindLockPanel() {
    var on = $('#btnLockOn');
    if (on) on.addEventListener('click', function () {
      var a = $('#lockPass').value, b = $('#lockPass2').value;
      if (a !== b) { NS.toast('The two passphrases do not match.'); return; }
      on.disabled = true; on.textContent = 'Encrypting…';
      NS.lock.enable(a).then(function () {
        $('#lockPass').value = ''; $('#lockPass2').value = '';
        NS.S.lockChoice = 'on';
        NS.settingsSave();
        hideNotice();
        NS.toast('Locked. The passphrase is not stored anywhere.');
        renderLockPanel(); updateStoreInfo();
      }).catch(function (e) {
        NS.toast(e && e.message ? e.message : 'Could not turn the lock on.');
      }).then(function () { on.disabled = false; on.textContent = 'Turn on the lock'; });
    });
    var off = $('#btnLockOff');
    if (off) off.addEventListener('click', function () {
      var pass = $('#lockOffPass').value;
      off.disabled = true;
      NS.lock.disable(pass).then(function () {
        $('#lockOffPass').value = '';
        NS.S.lockChoice = 'off';
        NS.settingsSave();
        NS.toast('The lock is off; the register is stored unencrypted again.');
        renderLockPanel(); updateStoreInfo();
      }).catch(function (e) {
        NS.toast(e && e.message ? e.message : 'That passphrase does not match.');
      }).then(function () { off.disabled = false; });
    });
    var idle = $('#setIdle');
    if (idle) {
      idle.value = String(NS.S.lockIdle || 0);
      idle.addEventListener('change', function () {
        NS.S.lockIdle = Number(idle.value) || 0;
        NS.settingsSave();
        armIdle();
        NS.toast(NS.S.lockIdle ? 'Locks after ' + NS.S.lockIdle + ' minutes idle.' : 'Auto-lock off.');
      });
    }

    var vex = $('#btnVaultExport');
    if (vex) vex.addEventListener('click', function () {
      NS.lock.exportVault().then(function (rec) {
        NS.download('opd-register-encrypted-' + NS.tKey() + '.json', JSON.stringify(rec, null, 2), 'application/json');
        NS.toast('Encrypted backup saved — it needs the passphrase to open.');
      }).catch(function (e) {
        NS.toast(e && e.message ? e.message : 'Could not export the encrypted backup.');
      });
    });

    var now = $('#btnLockNow');
    if (now) now.addEventListener('click', function () {
      NS.saveNow();
      setTimeout(function () {
        NS.lock.lockNow();
        NS.forget();
        showLock();
      }, 300);
    });
  }

  /* ---------------- boot ---------------- */
  function init() {
    bindLock();
    NS.load().then(function (state) {
      if (state === 'locked') {
        NS.S.curM = NS.mKey(new Date());
        showLock();
        return;
      }
      start();
    }).catch(function (e) {
      console.error(e);
      NS.toast('Storage could not be opened; the register is empty until it can be.');
      start();
    });
  }

  var started = false;
  function start() {
    /* start() runs once; after a lock/unlock in the same page it only re-renders, or every
       listener would be bound twice and every click would happen twice */
    if (started) {
      NS.renderRegisterAll();
      NS.renderDashboard();
      NS.renderSearch();
      renderLocUI();
      updateStoreInfo();
      renderLockPanel();
      maybeShowNotice();
      return;
    }
    started = true;
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
    bindLockPanel();
    bindNotice();
    bindIdle();
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
      sc.value = NS.locOrder ? NS.locOrder(NS.db.current) : NS.S.colOrder;
      sc.addEventListener('change', function () {
        /* the preset belongs to this location: two centres, two habits */
        NS.S.colOrder = sc.value;
        NS.S.colOrderByLoc[NS.db.current] = sc.value;
        NS.settingsSave();
        NS.renderRegister();
        NS.toast('Column order saved for ' + NS.db.current + '.');
      });
    }
    var mt = $('#setMonthTarget');
    if (mt) {
      mt.value = NS.S.monthTarget || '';
      mt.addEventListener('change', function () {
        var v = parseInt(mt.value, 10);
        NS.S.monthTarget = isNaN(v) || v < 0 ? 0 : Math.min(20000, v);
        mt.value = NS.S.monthTarget || '';
        NS.settingsSave();
        NS.toast(NS.S.monthTarget ? 'Monthly target: ' + NS.S.monthTarget + ' patients.' : 'Monthly target cleared.');
        if (NS.statsState && NS.statsState.mode === 'year') NS.runStats();
        NS.renderDashboard();
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
    function afterImport(msg) {
      NS.S.curM = NS.mKey(new Date());
      NS.S.curD = NS.tKey();
      NS.syncMonthInputs();
      afterLocationChange();
      NS.renderRegisterAll();
      updateStoreInfo();
      var line = $('#lastImport'), li = NS.S.lastImport;
      if (line) line.textContent = li ? ('Last import ' + li.when + ' · ' + li.mode + ' · ' + li.summary) : '';
      if (msg) NS.toast(msg);
    }

    /* ---------- a preview, so nobody merges blind ---------- */
    var pending = null, pendingPref = null, addedKeys = [];

    function closeDialog() {
      var d = $('#importDialog');
      if (d) { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); }
      var sc = $('#dlgScrim'); if (sc) sc.classList.remove('on');
      document.body.style.overflow = '';
      pending = null;
    }
    function openDialog(incoming, fileName) {
      /* one dialog at a time: a second one behind the first is a trap */
      var cvd = $('#csvDialog');
      if (cvd && cvd.classList.contains('on')) { cvd.classList.remove('on'); cvd.setAttribute('aria-hidden', 'true'); }
      var prefer = 'local';
      var dry = NS.mergeDB(NS.db, incoming, { dry: true, prefer: prefer });
      var here = 0;
      NS.locNames().forEach(function (n) {
        var E = NS.db.locations[n].entries || {};
        Object.keys(E).forEach(function (k) { here += ((E[k] || {}).rows || []).filter(NS.hasD).length; });
      });
      var fileLocs = Object.keys(incoming.locations).length, fileRows = 0, fileMonths = {};
      Object.keys(incoming.locations).forEach(function (n) {
        var E = incoming.locations[n].entries || {};
        Object.keys(E).forEach(function (k) {
          fileMonths[k.slice(0, 7)] = 1;
          fileRows += ((E[k] || {}).rows || []).filter(NS.hasD).length;
        });
      });

      function body(pref) {
        var d = pref === prefer ? dry : NS.mergeDB(NS.db, incoming, { dry: true, prefer: pref });
        var conf = d.conflicts.slice(0, 5).map(function (c) {
          return '<div class="conflict"><b>' + NS.esc(c.name || c.opd || 'patient') + '</b> · ' +
            NS.esc(NS.fmtDay(c.day)) + ' · ' +
            c.fields.map(function (f) {
              return NS.esc(f.f) + ': ' + NS.esc(String(f.mine)) + ' → ' + NS.esc(String(f.theirs));
            }).join(', ') + '</div>';
        }).join('');
        return '<p style="color:var(--muted)">' + NS.esc(fileName) + ' holds <b>' + fileLocs + '</b> location(s), ' +
          Object.keys(fileMonths).length + ' month(s) and <b>' + fileRows + '</b> patient(s).</p>' +
          '<table><thead><tr><th>If you merge</th><th class="n">Count</th></tr></thead><tbody>' +
          '<tr><td>Locations added</td><td class="n">' + d.locationsAdded + '</td></tr>' +
          '<tr><td>Days added</td><td class="n">' + d.daysAdded + '</td></tr>' +
          '<tr><td>Patients added</td><td class="n">' + d.rowsAdded + '</td></tr>' +
          '<tr><td>Existing patients topped up (empty fields only)</td><td class="n">' + d.rowsToppedUp + '</td></tr>' +
          '<tr><td>Already here, nothing to add</td><td class="n">' + d.rowsSkipped + '</td></tr>' +
          '<tr><td><b>Patients whose filled fields differ</b></td><td class="n" style="color:' +
            (d.conflicts.length ? 'var(--warn)' : 'inherit') + '">' + d.conflicts.length + '</td></tr>' +
          '</tbody></table>' +
          conf + (d.conflicts.length > 5 ? '<p style="margin-top:6px;color:var(--muted)">+' + (d.conflicts.length - 5) + ' more</p>' : '') +
          (d.conflicts.length ? '<div class="opt"><span style="color:var(--muted)">For those fields keep:</span>' +
            '<label><input type="radio" name="prefer" value="local"' + (pref === 'local' ? ' checked' : '') + '> what is here</label>' +
            '<label><input type="radio" name="prefer" value="incoming"' + (pref === 'incoming' ? ' checked' : '') + '> the file\'s</label></div>' : '') +
          '<p style="margin-top:10px;color:var(--muted)">Merging never deletes. Replacing throws away the ' + here +
          ' patient(s) currently on this device.</p>';
      }

      $('#dlgBody').innerHTML = body(prefer);
      $('#dlgBody').addEventListener('change', function (ev) {
        if (ev.target.name !== 'prefer') return;
        prefer = ev.target.value;
        $('#dlgBody').innerHTML = body(prefer);
        $('#dlgBody').addEventListener('change', arguments.callee, { once: true });
      });

      pending = incoming;
      pendingPref = function () { return prefer; };
      var d = $('#importDialog');
      d.classList.add('on'); d.setAttribute('aria-hidden', 'false');
      var sc = $('#dlgScrim'); if (sc) sc.classList.add('on');
      document.body.style.overflow = 'hidden';
      $('#dlgMerge').focus();
    }

    function applyImport(mode) {
      if (!pending) return;
      var incoming = pending;
      var before = JSON.parse(JSON.stringify(NS.db));
      var when = new Date().toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      var summary = '';

      if (mode === 'merge') {
        var stats = NS.mergeDB(NS.db, incoming, { prefer: pendingPref ? pendingPref() : 'local' });
        summary = stats.summary();
        addedKeys = stats.addedKeys;
        conflicts = stats.conflicts.slice();
      } else {
        NS.db.locations = incoming.locations;
        NS.db.current = incoming.current;
        var total = 0;
        NS.locNames().forEach(function (n) {
          var E = NS.db.locations[n].entries || {};
          Object.keys(E).forEach(function (k) { total += ((E[k] || {}).rows || []).filter(NS.hasD).length; });
        });
        summary = NS.locNames().length + ' location(s), ' + total + ' patient(s)';
      }

      NS.saveNow();
      NS.S.lastImport = {
        when: when, mode: mode === 'merge' ? 'merged' : 'replaced', summary: summary,
        keys: mode === 'merge' ? addedKeys : []
      };
      NS.settingsSave();
      closeDialog();
      afterImport((mode === 'merge' ? 'Merged: ' : 'Replaced: ') + summary);
      renderConflicts();
      /* differences are resolved in the register, so go where they are visible */
      if (conflicts.length) NS.switchView('register');

      NS.toast((mode === 'merge' ? 'Merged' : 'Replaced') + ' — ' + summary + '.', 'Undo', function () {
        NS.db.locations = before.locations;
        NS.db.current = before.current;
        NS.saveNow();
        afterImport('Import undone.');
      });
    }

    function importFile(file) {
      var r = new FileReader();
      r.onload = function () {
        var parsed;
        try { parsed = JSON.parse(r.result); } catch (e) { NS.toast('That file is not valid JSON.'); return; }
        if (parsed && parsed.kind === 'vault') { NS.toast('That is an encrypted backup — restore it from the lock screen.'); return; }
        NS.openBackup(parsed).then(function (db) {
          if (NS.resetLastFilter) NS.resetLastFilter();
          openDialog(NS.validDB(db), file.name || 'this file');
        }).catch(function (e) {
          NS.toast(e && e.message ? e.message : 'That backup could not be verified.');
        });
      };
      r.readAsText(file);
    }

    function wireImport(inputId) {
      var el = $('#' + inputId);
      if (!el) return;
      el.addEventListener('change', function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        importFile(f);
        ev.target.value = '';
      });
    }
    wireImport('fileMerge');
    wireImport('fileImport');

    /* ---------- differences left after a merge, resolved one field at a time ---------- */
    var conflicts = [];

    function renderConflicts() {
      var btn = $('#btnConflicts');
      if (btn) {
        btn.hidden = !conflicts.length;
        btn.textContent = 'Resolve ' + conflicts.length + ' difference' + (conflicts.length === 1 ? '' : 's');
      }
      var box = $('#cfBody');
      if (!box) return;
      if (!conflicts.length) {
        box.innerHTML = '<p style="color:var(--muted)">Nothing left to resolve.</p>';
        return;
      }
      box.innerHTML = '<p style="color:var(--muted)">Both sides had a value for these fields. What is here was kept; take the file\'s where it is right.</p>' +
        '<div class="cflist">' + conflicts.map(function (c, ci) {
          return '<div class="cfitem"><div class="cfh">' + NS.esc(c.name || 'Unnamed') +
            '<small>' + NS.esc(NS.fmtDay(c.day)) + (c.opd ? ' · OPD ' + NS.esc(c.opd) : '') + '</small></div>' +
            c.fields.map(function (f, fi) {
              return '<div class="cff"><b>' + NS.esc(f.f) + '</b>' +
                '<button class="opt2 keep" data-cf="' + ci + ':' + fi + ':mine">' + NS.esc(String(f.mine) || '—') + '</button>' +
                '<span style="color:var(--muted-2)">or</span>' +
                '<button class="opt2" data-cf="' + ci + ':' + fi + ':theirs">' + NS.esc(String(f.theirs) || '—') + '</button></div>';
            }).join('') + '</div>';
        }).join('') + '</div>';
    }

    function applyConflict(ci, fi, side) {
      var c = conflicts[ci];
      if (!c) return;
      var f = c.fields[fi];
      if (!f) return;
      var E = NS.db.locations[c.loc] && NS.db.locations[c.loc].entries;
      var rows = ((E || {})[c.day] || {}).rows || [];
      var row = rows.filter(function (x) {
        return String(x.opd || '').trim() === String(c.opd || '').trim() && String(x.name || '') === String(c.name || '');
      })[0];
      if (!row) { NS.toast('That patient is no longer there.'); conflicts.splice(ci, 1); renderConflicts(); return; }
      if (side === 'theirs') { row[f.f] = f.theirs; NS.saveNow(); }
      c.fields.splice(fi, 1);
      if (!c.fields.length) conflicts.splice(ci, 1);
      renderConflicts();
      if (side === 'theirs') {
        NS.renderRegisterAll();
        NS.toast('Took the file\'s ' + f.f + '.');
      }
    }

    if ($('#btnConflicts')) $('#btnConflicts').addEventListener('click', function () {
      renderConflicts();
      var d = $('#conflictDialog');
      d.classList.add('on'); d.setAttribute('aria-hidden', 'false');
      var sc = $('#dlgScrim'); if (sc) sc.classList.add('on');
      document.body.style.overflow = 'hidden';
    });
    if ($('#cfBody')) $('#cfBody').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-cf]');
      if (!b) return;
      var parts = b.dataset.cf.split(':');
      applyConflict(+parts[0], +parts[1], parts[2]);
    });
    ['#cfClose', '#cfDone'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () {
        var d = $('#conflictDialog');
        if (d) { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); }
        var sc = $('#dlgScrim'); if (sc) sc.classList.remove('on');
        document.body.style.overflow = '';
      });
    });

    /* ---------- a spreadsheet: map the columns, then the same preview ---------- */
    var csvText = '', csvRows = [];

    function openCsv(text, fileName) {
      csvText = text;
      csvRows = NS.parseCsv(text);
      if (csvRows.length < 2) { NS.toast('That file has no rows to import.'); return; }
      var headers = csvRows[0].map(function (h, i) { return String(h || '').trim() || ('Column ' + (i + 1)); });
      var shape = NS.csvShape(csvRows[0].join('|'));
      var remembered = (NS.S.csvMaps || {})[shape];
      var guess = remembered || NS.guessCsvMap(csvRows[0]);
      var FIELDS = [
        ['date', 'Date of visit'], ['opd', 'OPD no.'], ['name', 'Name'], ['age', 'Age'], ['sex', 'Sex'],
        ['department', 'Department'], ['address', 'Address'], ['diagnosis', 'Diagnosis'],
        ['treatment', 'Treatment'], ['phone', 'Mobile'], ['followUp', 'Follow-up']
      ];
      var opts = function (sel) {
        return '<option value="-1">— not in the file —</option>' + headers.map(function (h, i) {
          return '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + NS.esc(h) + '</option>';
        }).join('');
      };
      $('#csvBody').innerHTML =
        '<p style="color:var(--muted)">' + NS.esc(fileName) + ' · ' + (csvRows.length - 1) + ' row(s). ' +
        (remembered ? 'These columns were remembered from the last file of this shape — correct anything that is wrong.'
                    : 'The columns were guessed from the header — correct anything that is wrong.') + '</p>' +
        '<div class="mapgrid">' + FIELDS.map(function (f) {
          return '<label for="map-' + f[0] + '">' + f[1] + '</label><select id="map-' + f[0] + '" data-map="' + f[0] + '">' + opts(guess[f[0]]) + '</select>';
        }).join('') + '</div>' +
        '<div class="opt" style="margin-top:12px">' +
        '<label>Rows without a date go to <input type="date" id="csvDay" value="' + NS.tKey() + '" style="height:30px;border:1px solid var(--line);border-radius:6px;padding:0 6px"/></label>' +
        '<label><input type="checkbox" id="csvHeader" checked> first row is a header</label>' +
        '</div>' +
        '<div class="prev" id="csvPrev"></div>';

      var d = $('#csvDialog');
      d.classList.add('on'); d.setAttribute('aria-hidden', 'false');
      var sc = $('#dlgScrim'); if (sc) sc.classList.add('on');
      document.body.style.overflow = 'hidden';
      csvPreview();
      $('#csvBody').addEventListener('change', csvPreview);
    }

    function csvMap() {
      var m = {};
      NS.$$('#csvBody [data-map]').forEach(function (el) {
        var v = parseInt(el.value, 10);
        if (v >= 0) m[el.dataset.map] = v;
      });
      return m;
    }
    function csvPreview() {
      var conv = NS.csvToDB(csvText, csvMap(), {
        day: ($('#csvDay') || {}).value || NS.tKey(),
        location: NS.db.current,
        header: !$('#csvHeader') || $('#csvHeader').checked
      });
      var box = $('#csvPrev');
      if (box) box.textContent = conv.rows
        ? conv.rows + ' patient(s) will be read, across ' + conv.days + ' day(s)' + (conv.skipped ? ', ' + conv.skipped + ' empty row(s) skipped' : '') + '.'
        : 'No row has enough in it to become a patient — map at least one clinical column.';
      return conv;
    }
    function closeCsv() {
      var d = $('#csvDialog');
      if (d) { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); }
      var sc = $('#dlgScrim'); if (sc) sc.classList.remove('on');
      document.body.style.overflow = '';
    }

    var csvInput = $('#fileCsv');
    if (csvInput) csvInput.addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { openCsv(String(r.result || ''), f.name || 'the file'); };
      r.readAsText(f);
      ev.target.value = '';
    });
    ['#csvCancel', '#csvClose'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', closeCsv);
    });
    if ($('#csvGo')) $('#csvGo').addEventListener('click', function () {
      var conv = csvPreview();
      if (!conv.rows) { NS.toast('Nothing to import — check the column mapping.'); return; }
      /* remember this shape so next month's file maps itself */
      if (csvRows.length) {
        NS.S.csvMaps = NS.S.csvMaps || {};
        NS.S.csvMaps[NS.csvShape(csvRows[0].join('|'))] = csvMap();
        NS.settingsSave();
      }
      closeCsv();
      openDialog(NS.validDB(conv.db), (conv.rows + ' rows from a spreadsheet'));
    });

    if ($('#dlgMerge')) {
      $('#dlgMerge').addEventListener('click', function () { applyImport('merge'); });
      $('#dlgReplace').addEventListener('click', function () { applyImport('replace'); });
      $('#dlgCancel').addEventListener('click', closeDialog);
      $('#dlgClose').addEventListener('click', closeDialog);
      $('#dlgScrim').addEventListener('click', closeDialog);
    }

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
    maybeShowNotice();
    armIdle();

    var hash = (location.hash || '').replace('#', '');
    switchView(VIEWS.indexOf(hash) !== -1 ? hash : 'dash');

    /* safety nets */
    ['beforeunload', 'pagehide'].forEach(function (e) {
      window.addEventListener(e, function () {
        NS.saveNow();
        /* IndexedDB writes can be cut off when a tab closes: keep one synchronous copy */
        if (!NS.isDemo() && NS.storage.engine() === 'idb' && !(NS.S.locked && NS.S.lockedNow)) {
          NS.storage.mirror(NS.db);
        }
      });
    });
    window.addEventListener('blur', NS.saveNow);
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
