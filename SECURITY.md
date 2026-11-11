# Security

## Reporting

Email **sohilmomin2000@gmail.com** with the version (bottom of *About & help*), what you did,
and what happened. Please do not open a public issue for a vulnerability that could expose a
register. Expect an answer within a week.

## What the app is, in security terms

- A static page. No server, no API, no authentication, no session, no third party.
- Patient data sits in `localStorage` for the origin you opened it from — **not encrypted**.
  Disk encryption and a device lock are the real controls; this app does not add any.
- The single-file build runs from `file://`, which browsers treat as a null origin: data is
  stored per file path, and copying the file elsewhere will not bring the data with it.
- The service worker caches only this app's own files, cache-first, same-origin only.
- Nothing is loaded from a CDN: no fonts, no icon set, no analytics script.

## In scope

XSS through a patient field (all output is escaped, and there is no `innerHTML` of raw
input), CSV/formula injection in an export, denial of service through an oversized import,
and anything that causes data loss or a silent write failure.

## Out of scope

Someone with access to your unlocked device reading your own register; the absence of
encryption at rest (documented above, by design, and a candidate for a future release);
malicious browser extensions.
