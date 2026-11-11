/* OPD Register — the optional passphrase lock.

   PBKDF2-HMAC-SHA256 (310,000 iterations, random 16-byte salt) derives an AES-GCM-256 key;
   the whole database is encrypted as one blob and stored in place of the plain copy. The
   plain copy is only removed once the encrypted write has succeeded, so a failure can never
   destroy the register.

   Honest limits, stated in the UI too: this protects a register on a machine someone else
   can open. It cannot protect against a keylogger, a compromised browser, or a passphrase
   written on a sticky note. */
(function (NS) {
  'use strict';

  var ITER = 310000;
  var enc = null;            /* the derived CryptoKey, in memory only */
  var unlockedDb = null;     /* the decrypted database, held while unlocked */

  function subtle() {
    return (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;
  }
  function supported() { return !!subtle(); }

  function b64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str) {
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function derive(pass, salt, iter) {
    var te = new TextEncoder();
    return subtle().importKey('raw', te.encode(pass), { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (base) {
        return subtle().deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
      });
  }

  function encrypt(key, text) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return subtle().encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text))
      .then(function (ct) { return { iv: b64(iv), ct: b64(ct) }; });
  }

  function decrypt(key, rec) {
    return subtle().decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, key, unb64(rec.ct))
      .then(function (buf) { return new TextDecoder().decode(buf); });
  }

  /* ---------- state ---------- */
  function isLocked() { return !!NS.S.locked; }

  function vaultRecord(pass, db, existingSalt) {
    var salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));
    return derive(pass, salt, ITER).then(function (key) {
      return encrypt(key, JSON.stringify(db)).then(function (out) {
        enc = key;
        return {
          v: 1, iter: ITER, salt: b64(salt), iv: out.iv, ct: out.ct,
          at: Date.now()
        };
      });
    });
  }

  /* Turn the lock on: encrypt, write the vault, and only then drop the plain copy. */
  function enable(pass) {
    if (!supported()) return Promise.reject(new Error('This browser has no Web Crypto, so the register cannot be encrypted here.'));
    if (!pass || pass.length < 6) return Promise.reject(new Error('Use at least 6 characters.'));
    var db = NS.db;
    return vaultRecord(pass, db).then(function (rec) {
      return NS.storage.put('vault', rec).then(function () {
        return NS.storage.del('db').then(function () {
          NS.storage.clearMirror();
          NS.S.locked = true;
          NS.S.lockedNow = false;
          unlockedDb = db;
          return NS.storage.put('meta', { locked: true, at: Date.now() });
        });
      });
    }).then(function () { return true; });
  }

  /* Unlock: derive, decrypt, hand the database back. */
  function unlock(pass) {
    return NS.storage.get('vault').then(function (rec) {
      if (!rec) return Promise.reject(new Error('No encrypted register found.'));
      return derive(pass, unb64(rec.salt), rec.iter || ITER).then(function (key) {
        return decrypt(key, rec).then(function (text) {
          var db;
          try { db = JSON.parse(text); } catch (e) { throw new Error('The encrypted register is damaged.'); }
          enc = key;
          unlockedDb = db;
          NS.S.locked = true;       /* still a locked register… */
          NS.S.lockedNow = false;   /* …but unlocked for this session */
          return db;
        });
      }).catch(function (e) {
        if (e && /damaged/.test(e.message)) throw e;
        throw new Error('That passphrase does not open this register.');
      });
    });
  }

  /* Write the current database back into the vault. */
  function save(db) {
    if (!enc) return Promise.reject(new Error('Locked'));
    return encrypt(enc, JSON.stringify(db)).then(function (out) {
      return NS.storage.get('vault').then(function (rec) {
        rec = rec || { v: 1, iter: ITER, salt: null };
        rec.iv = out.iv; rec.ct = out.ct; rec.at = Date.now();
        return NS.storage.put('vault', rec);
      });
    });
  }

  /* Turn it off: decrypt is already in memory, so just write the plain copy back. */
  function disable(pass) {
    return unlock(pass).then(function (db) {
      return NS.storage.put('db', db).then(function () {
        return NS.storage.del('vault').then(function () {
          return NS.storage.put('meta', { locked: false, at: Date.now() });
        });
      });
    }).then(function () {
      NS.S.locked = false;
      NS.S.lockedNow = false;
      enc = null;
      return true;
    });
  }

  /* Drop the key from memory; the encrypted copy stays on disk. */
  function lockNow() {
    enc = null;
    unlockedDb = null;
    NS.S.lockedNow = true;
    return true;
  }

  function isUnlocked() { return !isLocked() || (!!enc && !NS.S.lockedNow); }

  NS.lock = {
    supported: supported,
    enable: enable,
    disable: disable,
    unlock: unlock,
    save: save,
    lockNow: lockNow,
    isLocked: isLocked,
    isUnlocked: isUnlocked
  };
})(window.OPD = window.OPD || {});
