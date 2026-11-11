# OPD Register

[![Live](docs/assets/badge-live.svg)](https://drsamonline.github.io/app-opd-register/play/)
![Offline](docs/assets/badge-offline.svg)
![Tests](docs/assets/badge-tests.svg)
![Dependencies](docs/assets/badge-deps.svg)
![Single file](docs/assets/badge-size.svg)
[![Licence](docs/assets/badge-licence.svg)](LICENSE)

**The daily OPD register, on one page, at typing speed — offline, no account, no server.**

Every day of the month is laid out and ready to type into. Counts, department splits and
the daily trend update as you write. Print the register for the file, export a day-wise
sheet to Excel, and keep several OPD centres apart in the same app. All of it lives in the
browser on your device; the page makes no network request at all.

| | |
|---|---|
| **Landing page** | https://drsamonline.github.io/app-opd-register/ |
| **Live app** | https://drsamonline.github.io/app-opd-register/play/ |
| **Demo** (sample month, memory only) | https://drsamonline.github.io/app-opd-register/play/index.html?demo=1 |
| **Single HTML file** | [`dist/opd-register.html`](dist/opd-register.html) — ~130 KB, opens from a USB stick |
| **Windows EXE / Android APK** | [releases](https://github.com/drsamonline/app-opd-register/releases/latest) |
| **Source** | https://github.com/drsamonline/app-opd-register |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md) |
| **All projects** | https://drsamonline.github.io/ |

<!-- shot:start -->

![Screenshot](docs/shot.png)

<!-- shot:end -->

Screens at both widths: [`docs/assets/app-desktop.png`](docs/assets/app-desktop.png),
[`docs/assets/app-mobile.png`](docs/assets/app-mobile.png),
[`docs/assets/app-sheet.png`](docs/assets/app-sheet.png) (the phone editor) and
[`docs/assets/app-stats.png`](docs/assets/app-stats.png). Badges are drawn locally by
`scripts/badges.py`; the icon set by `scripts/icons.py`. Nothing here is fetched from a
badge service, because an offline-first app should not need the internet to describe itself.

## Run it

`docs/play/index.html` is the whole app. No build step, no install, no dependencies.

```
node tests/self-tests.js     # 61 checks, no browser needed
python3 scripts/build.py     # the single-file build -> dist/opd-register.html
python3 scripts/badges.py    # the README badges
```

Append `?demo=1` for a generated month — real screens, real arithmetic, held in memory so
nothing is written to your device.

## What is in it

| View | What it does |
|---|---|
| **Dashboard** | Five KPIs (total, male, female, new, follow-up) with share-of-total; department bars; sex donut; a bar per day of the month; the last days with data (click to open); a short "reading" panel — busiest day, new-vs-follow-up, working days with no entry, female share, gyn share. |
| **Register** | The month calendar with day statuses and per-day counts; then one section per day: status dropdown, free-text note, patient count, add-row and clear-day. On a desktop a sticky, column-aligned grid; on a phone a card per patient and a full-screen editor. |
| **Statistics** | Day-wise, month-wise or any date range, with 17 selectable columns (summary, departments, sex-within-department, activity). Print, Excel (.xls) and CSV. |
| **Patients** | Ranked substring search over every month — name, OPD no., age, department, diagnosis, treatment, address — optionally across all locations. A hit opens that patient in the editor. |
| **About & help** | Storage used, patient and month counts, locations, backup and restore, keyboard reference, the counting rules, privacy and licence. |

Smaller things that earn their place: automatic OPD autofill for returning patients, recent
patient chips, undo on delete (row, patient, whole day), dark mode, a save indicator, a
storage-full fallback that prunes empty days rather than losing the entry, install-as-app,
and a single-file build for a USB stick.

## The counting rules, written down

A report nobody can explain is worse than no report, so the rules are in the app (About &
help) and here:

- **A row is a patient** when any of OPD no., department, name, age, address, diagnosis or
  treatment is filled. A half-typed row is still saved — nothing is ever thrown away for
  being incomplete.
- **Gynecology is female-only.** Any department containing *gyn*, *obs* or *obstet* is
  counted as female whatever the sex field says, and is counted once — not twice.
- **Under 15 also counts as Pediatrics.** A child entered under Medicine appears in both
  the Medicine and Pediatrics buckets. Age accepts `5`, `5y`, `1.5`, `6 mo`, `3 days`.
- **Day status is a label, not a filter.** Holiday, non-working and no-activity days are
  excluded from "per active day" averages, but their patients still count in the totals.

## Keyboard

`/` search · `N` new patient · `T` today · `D` dark mode · `1`–`5` sections ·
`Alt`+`←`/`→` month · `Enter` next row (adds one on the last row) · `Ctrl`+`Enter` add row ·
`↑`/`↓` move within a column · `Esc` close.

## Your data

One `localStorage` key (`dailyEntryRegister.v2`) holds every location and every month. No
account, no analytics, no cookie, no network call. Clearing site data erases it, so **export
a backup weekly** — the import restores everything, including the location names. The file
format is plain JSON and is compatible with the earlier v2 release of this app.

## Layout

```
docs/index.html          the landing page — its own design, not the app's
docs/play/               the app: index.html, assets/, sw.js, manifest, icons/
docs/play/assets/        app.css · store.js · register.js · dashboard.js · stats.js · search.js · app.js
docs/shot.png            the screenshot the pipeline captures
docs/assets/             screenshots and the generated badges
dist/opd-register.html   the single-file build (generated)
scripts/build.py         inlines css + js into the single file
scripts/badges.py        draws docs/assets/badge-*.svg
scripts/icons.py         renders the PWA icon set from icon.svg
tests/self-tests.js      61 checks over the real source, no browser
```

The app is six classic scripts in one namespace, not ES modules — so it also runs from
`file://` inside a WebView and from the EXE's bundled server without a build step.

## Builds

One push to `main` builds the portable EXE and the APK, publishes the rolling `app-latest`
release and deploys the demo to Pages, all from the same commit — so the live demo and the
released binary can never disagree. The pipeline lives in the public
[`app-builder`](https://github.com/drsamonline/app-builder) kit; this repo only calls it.

## Support

<img src="docs/assets/support-portrait.jpg" width="72" height="72" alt="Dr. Sohil Momin" align="left" style="border-radius:50%;margin-right:1rem">

Free, offline, accountless — and staying that way. If it earned its keep:

| | |
|---|---|
| UPI (India) | `drsohilboi@ybl` — payee Dr. Sohil Momin, open amount |
| GitHub Sponsors | [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) |
| Ko-fi | [ko-fi.com/matneo](https://ko-fi.com/matneo) |
| PayPal | [paypal.me/drsohilmomin](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN) |
| My books | [Amazon author store](https://www.amazon.com/stores/author/B08ZT331LY/allbooks?ccs_id=aed72b9f-71d9-41dc-adee-e9368a317acc) |
| More apps | [drsamonline.github.io](https://drsamonline.github.io/) |
| Email | [sohilmomin2000@gmail.com](mailto:sohilmomin2000@gmail.com) |

Nothing is gated behind it: no accounts, no tracking, no network requests.

## Attribution

- **Licence text** — [PolyForm Project](https://polyformproject.org/licenses/noncommercial/1.0.0), PolyForm Noncommercial 1.0.0.
- **Icons** — drawn for this app as inline SVG paths and one `icon.svg`. No icon font, no
  Font Awesome, no Lucide dependency.
- **Fonts** — the system UI font stack. Nothing is downloaded.
- **Charts** — a donut of two `<circle>` elements and a row of `<div>` bars. No chart library.
- **Patient data in the screenshots** — generated by the app's own `?demo=1` month; the
  names are invented.
- **Clinical conventions** (gynecology as female-only, under-15 as pediatrics) follow how the
  paper OPD register in an Indian district hospital is tallied; they are documented in the
  app so a reader can disagree with them explicitly.

## Licence

PolyForm Noncommercial 1.0.0 — see [`LICENSE`](LICENSE). © 2026 Dr Sohil Momin.
