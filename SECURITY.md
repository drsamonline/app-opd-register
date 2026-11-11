# Security

## Reporting

Email **sohilmomin2000@gmail.com** with the version (bottom of *About & help*), what you did,
and what happened. Please do not open a public issue for a vulnerability that could expose a
register. Expect an answer within a week.

## What the app is, in security terms

- A static page. No server, no API, no authentication, no session, no third party.
- Patient data sits in IndexedDB (or `localStorage` as a fallback) for the origin you opened
  it from. **Unencrypted by default.** The optional passphrase lock encrypts the whole
  database with AES-GCM-256 (PBKDF2-HMAC-SHA256, 310,000 iterations, random 16-byte salt),
  stores it in place of the plain copy, and keeps the key in memory only while unlocked.
- The single-file build runs from `file://`, which browsers treat as a null origin: data is
  stored per file path, and copying the file elsewhere will not bring the data with it.
- The service worker caches only this app's own files, cache-first, same-origin only.
- Nothing is loaded from a CDN: no fonts, no icon set, no analytics script.

## In scope

XSS through a patient field (all output is escaped, and there is no `innerHTML` of raw
input), CSV/formula injection in an export, denial of service through an oversized import,
a way to read the vault without the passphrase, a lock that loses data on enable or disable,
and anything that causes data loss or a silent write failure.

## Out of scope

Someone with access to your unlocked device reading your own register; a passphrase that was
written down or reused; a compromised browser or a keylogger (no web app can defend against
one); malicious browser extensions.
