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
  var signKey = null;        /* an HMAC key from the same passphrase, for signing backups */
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

  /* One PBKDF2 pass, two keys: the first 32 bytes encrypt, the last 32 sign. A vault written
     before 3.12 has no `kdf` marker and still uses the original single-key derivation. */
  function derivePair(pass, salt, iter, legacy) {
    var te = new TextEncoder();
    return subtle().importKey('raw', te.encode(pass), { name: 'PBKDF2' }, false, ['deriveKey', 'deriveBits'])
      .then(function (base) {
        var params = { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' };
        if (legacy) {
          return subtle().deriveKey(params, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
            .then(function (k) { return { enc: k, sign: null }; });
        }
        return subtle().deriveBits(params, base, 512).then(function (bits) {
          var all = new Uint8Array(bits);
          var aesBytes = all.slice(0, 32), macBytes = all.slice(32, 64);
          return Promise.all([
            subtle().importKey('raw', aesBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']),
            subtle().importKey('raw', macBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
          ]).then(function (keys) { return { enc: keys[0], sign: keys[1] }; });
        });
      });
  }
  function derive(pass, salt, iter, legacy) {
    return derivePair(pass, salt, iter, legacy).then(function (pair) { return pair.enc; });
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
    return derivePair(pass, salt, ITER).then(function (pair) {
      return encrypt(pair.enc, JSON.stringify(db)).then(function (out) {
        enc = pair.enc;
        signKey = pair.sign;
        return {
          v: 1, kdf: 'split', iter: ITER, salt: b64(salt), iv: out.iv, ct: out.ct,
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
      var legacy = rec.kdf !== 'split';
      return derivePair(pass, unb64(rec.salt), rec.iter || ITER, legacy).then(function (pair) {
        var key = pair.enc;
        return decrypt(key, rec).then(function (text) {
          var db;
          try { db = JSON.parse(text); } catch (e) { throw new Error('The encrypted register is damaged.'); }
          enc = key;
          signKey = pair.sign;
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
    signKey = null;
    unlockedDb = null;
    NS.S.lockedNow = true;
    return true;
  }

  function isUnlocked() { return !isLocked() || (!!enc && !NS.S.lockedNow); }

  /* ---------- signing a backup with the passphrase ---------- */
  function hasSigner() { return !!signKey; }
  function sign(text) {
    if (!signKey) return Promise.resolve('');
    return subtle().sign('HMAC', signKey, new TextEncoder().encode(text)).then(function (sig) {
      var b = new Uint8Array(sig), out = '';
      for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      return out;
    }).catch(function () { return ''; });
  }
  function verify(text, sig) {
    if (!signKey || !sig) return Promise.resolve(false);
    return sign(text).then(function (mine) { return mine && mine === sig; });
  }

  /* ---------- a backup you can carry ----------
     A plain JSON backup of an encrypted register would defeat the lock, so the export is the
     ciphertext itself: useless without the passphrase, restorable on another device. */
  function exportVault() {
    return NS.storage.get('vault').then(function (rec) {
      if (!rec) throw new Error('This register is not locked, so there is no encrypted backup to make.');
      return {
        app: 'opd-register', kind: 'vault', v: 1,
        note: 'Encrypted OPD register. Needs the passphrase that created it.',
        exported: new Date().toISOString(),
        vault: rec
      };
    });
  }

  /* the same, from text, so it can be tested without a file input */
  function openVaultText(text, pass) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) { return Promise.reject(new Error('That file is not valid JSON.')); }
    var rec = parsed && parsed.kind === 'vault' ? parsed.vault : (parsed && parsed.ct ? parsed : null);
    if (!rec || !rec.ct || !rec.salt) return Promise.reject(new Error('That is not an encrypted OPD backup.'));
    if (!pass) return Promise.reject(new Error('Enter the passphrase this backup was made with.'));
    return derive(pass, unb64(rec.salt), rec.iter || ITER).then(function (key) {
      return decrypt(key, rec).then(function (plain) {
        var db;
        try { db = JSON.parse(plain); } catch (e) { throw new Error('The backup is damaged.'); }
        return db;
      }).catch(function (e) {
        if (e && /damaged/.test(e.message)) throw e;
        throw new Error('That passphrase does not open this backup.');
      });
    });
  }

  NS.lock = {
    supported: supported,
    enable: enable,
    disable: disable,
    unlock: unlock,
    save: save,
    lockNow: lockNow,
    exportVault: exportVault,
    openVaultText: openVaultText,
    isLocked: isLocked,
    isUnlocked: isUnlocked,
    hasSigner: hasSigner,
    sign: sign,
    verify: verify
  };
})(window.OPD = window.OPD || {});
