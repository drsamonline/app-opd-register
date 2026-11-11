/* OPD Register — storage.
   IndexedDB is the primary engine (structured clone, no JSON stringify, no 5 MB ceiling).
   localStorage stays as the fallback and as the one-time migration source, so an existing
   register opens untouched and a browser without IndexedDB keeps working. */
(function (NS) {
  'use strict';

  var DB_NAME = 'opd-register';
  var STORE = 'kv';
  var VER = 1;

  /* the keys, and where each one lives in localStorage for the fallback */
  var LS = {
    db: 'dailyEntryRegister.v2',   /* the key v2 of this app used — do not change it */
    legacy: 'dailyEntryRegister.v1',
    vault: 'opdRegister.vault',
    meta: 'opdRegister.meta',
    mirror: 'opdRegister.mirror'
  };

  var engine = 'ls';
  var idb = null;
  var readyResolve;
  var ready = new Promise(function (res) { readyResolve = res; });

  function openIdb() {
    return new Promise(function (res) {
      var settled = false;
      var done = function (e) { if (!settled) { settled = true; res(e); } };
      var req;
      try { req = indexedDB.open(DB_NAME, VER); } catch (err) { return done('ls'); }
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = function () { idb = req.result; done('idb'); };
      req.onerror = function () { done('ls'); };
      req.onblocked = function () { done('ls'); };
      /* never let a hung open keep the register off the screen */
      setTimeout(function () { done('ls'); }, 2000);
    });
  }

  function lsGet(key) {
    try {
      var raw = localStorage.getItem(LS[key] || key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) { return null; }
  }
  function lsPut(key, val) {
    try { localStorage.setItem(LS[key] || key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function lsDel(key) {
    try { localStorage.removeItem(LS[key] || key); } catch (e) {}
  }

  function tx(mode) {
    return idb.transaction(STORE, mode).objectStore(STORE);
  }

  function get(key) {
    return ready.then(function () {
      if (engine === 'ls' || !idb) return lsGet(key);
      return new Promise(function (res) {
        var r;
        try { r = tx('readonly').get(key); } catch (e) { return res(lsGet(key)); }
        r.onsuccess = function () { res(r.result == null ? null : r.result); };
        r.onerror = function () { res(lsGet(key)); };
      });
    });
  }

  function put(key, val) {
    return ready.then(function () {
      if (engine === 'ls' || !idb) return lsPut(key, val);
      return new Promise(function (res) {
        var r;
        try { r = tx('readwrite').put(val, key); } catch (e) { return res(lsPut(key, val)); }
        r.onsuccess = function () { res(true); };
        r.onerror = function () { res(lsPut(key, val)); };
      });
    });
  }

  function del(key) {
    return ready.then(function () {
      lsDel(key);
      if (engine === 'ls' || !idb) return true;
      return new Promise(function (res) {
        var r;
        try { r = tx('readwrite').delete(key); } catch (e) { return res(false); }
        r.onsuccess = function () { res(true); };
        r.onerror = function () { res(false); };
      });
    });
  }

  /* ---------- boot ---------- */
  function init() {
    return openIdb().then(function (e) {
      engine = e;
      readyResolve(engine);
      return engine;
    });
  }

  /* The plain database, migrating from localStorage the first time.
     Returns { db, source } — source is 'idb' | 'mirror' | 'ls' | 'none'. */
  function readDb() {
    return get('db').then(function (v) {
      if (v) return { db: v, source: 'idb' };
      /* a write that did not finish before the tab closed leaves a mirror */
      return get('mirror').then(function (m) {
        if (m && m.db) return { db: m.db, source: 'mirror' };
        var raw = null;
        try { raw = localStorage.getItem(LS.db) || localStorage.getItem(LS.legacy); } catch (e) {}
        if (!raw) return { db: null, source: 'none' };
        try { return { db: JSON.parse(raw), source: 'ls' }; } catch (e) { return { db: null, source: 'none' }; }
      });
    });
  }

  /* a synchronous last-gasp copy on unload — IndexedDB writes can be cut off */
  function mirror(db) {
    try {
      var s = JSON.stringify(db);
      if (s.length < 3 * 1024 * 1024) localStorage.setItem(LS.mirror, JSON.stringify({ at: Date.now(), db: db }));
    } catch (e) { /* full or unavailable: the IndexedDB copy is the real one */ }
  }

  function clearMirror() { lsDel('mirror'); }

  NS.storage = {
    init: init,
    ready: ready,
    get: get,
    put: put,
    del: del,
    readDb: readDb,
    mirror: mirror,
    clearMirror: clearMirror,
    engine: function () { return engine; },
    keys: LS
  };
})(window.OPD = window.OPD || {});
