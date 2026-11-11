# Changelog

## 3.1.0 — 2026-11-11

The first tier of the roadmap, all of it small enough to stay one file.

### Added
- **Follow-up date and mobile number** on every row, in the grid and in the phone editor.
  Neither counts as a patient on its own, so a stray date can never inflate a total.
- **Follow-ups due** panel on the dashboard — everyone due in the next 14 days, with the
  phone number; a click opens that patient.
- **Monthly digest** in Statistics: one printable page — totals, department share, every day
  with its status and note, and a signature line.
- **Duplicate patient** — Ctrl+D, or the copy button in the editor. OPD number and follow-up
  date are cleared on the copy, because they belong to the visit, not the person.
- **A date typed into Age becomes an age** (`01/01/1990` → 35), so the arithmetic that goes
  wrong most often is done for you.
- **Department memory** — the editor offers the departments this location actually uses,
  most used first, with counts.
- **Mark a range of days** holiday / non-working / no-activity with one note, for a festival
  week or a camp.
- **Print one day** on its own, from that day's header.
- **Undo an import** — the previous database is held for one step.

### Changed
- Register grid widened to thirteen columns; column widths fixed so every day lines up.
- `sw.js` precaches the icon set; cache version bumped to `opd-v3.1.0`.

### Tests
- 77 node checks (was 61) and 66 browser checks (was 53).

## 3.0.0 — 2026-11-11

A redesign and a rebuild of the v2 single file. Same data, same key
(`dailyEntryRegister.v2`), so an existing register opens untouched.

### Added
- **Patients view** — search every month (and every location, on request) by name, OPD
  number, age, department, diagnosis, treatment or address. A hit opens that patient.
- **Undo** on every destructive action: delete a row, delete a patient, clear a day.
- **Dark mode**, remembered between visits, and a "Saved / Saving… / Not saved" indicator.
- **CSV export** of a whole month, alongside the existing Excel export.
- **Keyboard entry** — Enter to the next row, Ctrl+Enter to add a row, arrow keys within a
  column, `N`, `T`, `/`, `1`–`5`, Alt+←/→, Esc.
- **Mobile editor sheet** — a full-screen form with Previous / Done, instead of a
  horizontally scrolling table on a phone.
- **Demo month** (`?demo=1`) generated in memory, for trying the app without touching data.
- **Storage-full fallback** — empty days are pruned so a real entry is never lost, and a
  failed save says so instead of failing silently.
- **Single-file build** (`dist/opd-register.html`), a service worker, an install prompt and
  a proper icon set.

### Changed
- **Layout rebuilt**: a left rail on desktop and a bottom tab bar on a phone, a sticky month
  bar, hairline panels instead of cards, and one accent colour. Type scales with the
  viewport; every control is at least 44 px on touch.
- **Register** is scannable: day sections collapse when empty, the day header carries status,
  note, count and actions, and the grid has fixed column widths so days line up.
- **Dashboard** reads rather than decorates: share-of-total under every KPI, a bar per day,
  and a "reading" panel with the busiest day, new-vs-follow-up and female share.
- **Statistics** keeps the ticked columns in sync with the table, and no longer re-renders
  into a stale column set.
- Code split into six files with a test suite; the app is now buildable and reviewable
  rather than one 1,500-line file.

### Fixed
- Typing in the last row of a day re-rendered the table and dropped focus mid-word.
- The year / from / to date fields showed in the wrong report mode.
- A sheet or menu stayed open when you changed section.
- Horizontal scroll on a 320 px screen.
- A `<select>` day status could show a stale colour after the calendar re-rendered.

## 2.0.0
Single-file register: month calendar, day statuses, multi-location, dashboard, day/month/range
statistics with selectable columns, Excel and JSON export, PWA install.

## 1.0.0
First version: a month of rows, saved to `localStorage`.
