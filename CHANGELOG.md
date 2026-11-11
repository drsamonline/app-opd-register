# Changelog

## 3.8.0 — 2026-11-12

The lock story closed: it closes itself, and it can leave the device encrypted.

### Added
- **Auto-lock when idle** — never, 1, 5, 10 or 30 minutes (10 by default, once the lock is
  on). Any pointer, key, wheel or focus event re-arms it; when it fires, the register is
  saved, the key is dropped, the sheet and menu are closed, and the lock screen says why.
- **An encrypted backup** — *Download an encrypted backup* writes the vault itself: the
  ciphertext, useless without the passphrase, restorable on another machine. A plain JSON
  backup of a locked register would have been a hole in the lock, so it is not offered.
- **Restoring an encrypted backup** — the lock screen's backup button now recognises a vault
  file, asks for the passphrase already typed above, and restores it.
- **A column order per location** — two centres, two habits. A new location inherits the
  order in use at the time.

### Fixed
- The privacy panel still said the data lives in `localStorage`; it has been IndexedDB since
  3.6.0. It now also says the lock is optional.

### Tests
- 137 browser checks (was 127): the encrypted backup round-trip (and that it contains no
  patient names), a wrong passphrase on the backup, the idle lock, and per-location presets.

## 3.7.0 — 2026-11-11

The lock stays optional, and saying no is a first-class answer.

### Added
- **A one-time offer.** On first open the app asks whether to protect the register, with
  *Turn it on* and *Not now* beside each other, and says that skipping changes nothing else.
  The answer is remembered on the device and the offer never returns on its own.
- **A way back, always.** *Lock & privacy* in the ⋯ menu opens the lock panel from anywhere;
  the panel shows whether the register is encrypted and offers both directions.
- **An exit if the passphrase is lost.** The lock screen can start again from a backup file.
  It states exactly what that destroys — the encrypted register on this device — before it
  asks for the file, because a quiet "reset" would be a lie about what the lock means.

### Fixed
- **Settings were not being read at boot.** The rewrite that made loading asynchronous
  dropped the block that restores theme, day filter, column order, target and the lock
  choice, so every launch came up with the defaults. Found by the new "declining is
  remembered" check; there is now a reload test for the theme as well.
- A department bar with a count of zero drew a 2px sliver; an empty track is honest.

### Tests
- 127 browser checks (was 119).

## 3.6.0 — 2026-11-11

The heavy tier: the register outgrows `localStorage`, and it can be locked.

### Added
- **IndexedDB storage.** The database is written as a structured object instead of a JSON
  string on every keystroke — no 5 MB ceiling, no re-serialising the whole register for one
  character. A v2 `localStorage` register migrates in on first open and is left where it was.
  A browser without IndexedDB falls back to `localStorage`; the engine in use is shown in
  *About & help*.
- **A synchronous mirror on unload.** An IndexedDB write can be cut off when a tab closes, so
  a last-gasp copy goes to `localStorage` and is read only if the database is missing.
- **Optional passphrase lock.** AES-GCM-256 over the whole database, keyed by PBKDF2-HMAC-
  SHA256 (310,000 iterations, random 16-byte salt). The plain copy is deleted only after the
  encrypted write succeeds; the key is dropped on lock; the register is unreadable while
  locked, and the lock screen says plainly that the passphrase cannot be recovered.
- **Off-screen rendering** — `content-visibility:auto` on day sections, so the browser skips
  layout and paint for days that are not on screen.

### Changed
- Boot is asynchronous: storage, the vault and the migration resolve before the first render.
- `start()` runs once; a lock/unlock in the same page only re-renders, so listeners are never
  bound twice.

### Tests
- 106 node checks (was 101) and 119 browser checks (was 105): the engine, a reload, a v2
  migration, the forget/adopt handover, and the whole lock lifecycle — enable, reload, wrong
  passphrase, right passphrase, data intact, disable.

## 3.5.0 — 2026-11-11

The last of the small ones, in one pass — and the one medium one: a patient can be dragged
to the right day.

### Added
- **Drag a patient to another day** — grab the row number, drop it on a day header. The move
  is undoable; the row keeps every field.
- **Column order** — Default, Treatment-first, or Name-first, from *About & help → Display*.
  The register's cells are now generated from one field map instead of being written out by
  hand, which is what makes an order a setting rather than a rewrite.
- **Daily target** — a number in Display draws a dashed line across the dashboard trend and
  scales the chart to it, so "we plan 30 a day" is a line, not a guess.
- **Missing-diagnosis mode** — the reading panel's count now opens the register showing only
  the days that hold a patient with no diagnosis or treatment, with a chip to get back.
- **Export the patient list** — CSV of the list as it stands: filtered, sorted, all locations
  if ticked.
- **Undo a day-status change** — the last destructive action that had no undo.

### Changed
- The trend scales to the target with 12% headroom, so the line is never pinned to the edge.

### Tests
- 101 node checks and 105 browser checks (was 95).

## 3.4.0 — 2026-11-11

Six small things in one pass, all of them answers to "where did that entry go".

### Added
- **Undo a deleted location** — deleting a location used to be the one irreversible action
  in the app. The toast now puts it back, data and all.
- **Search inside one day** — a magnifier in the day header narrows the register to that day
  and points the row filter at it; a chip shows "Only Thu, 13 Nov" until you clear it.
- **Digest: week totals** — the monthly digest now has a week-by-week table (patients, new,
  follow-up, working days) beside the daily one.
- **Digest: a note on gaps** — if entries were saved without a diagnosis or treatment, the
  digest says how many, in amber.
- **"Rows without a diagnosis"** in the dashboard's reading panel, with a tap through to the
  register.
- **Sort the patient list** — newest, oldest, name A–Z, or OPD number.

### Fixed
- **Search highlighting broke entities.** Searching for `a` turned "Gynec &amp; Obs" into
  `&<mark>a</mark>mp;`, which printed the literal `&amp;`. Highlighting now splits the raw
  text and escapes each piece, so no search term can corrupt an escape.
- The digest's day table stretched to the height of the department table, leaving half a page
  of white space; the three blocks are now independent and the days run in two columns.

### Tests
- 101 node checks (was 98) and 95 browser checks (was 87).

## 3.3.0 — 2026-11-11

The third tier: the register now reads as a week, and a patient's history can leave the screen.

### Added
- **Week as seven columns** — in Week scope on a wide screen, one column per day with the
  patients in each, the day's status, a per-day count, and a weekly total above
  (patients, per active day, busiest day). A card opens that patient; `+ Add` starts one.
- **Print the week** — the Print button follows the scope: the month, or the week on one A4
  with the columns intact.
- **Printed visit slip** — *Print slip* in the history panel puts one patient's visits on
  half a page: date, case, department, diagnosis, treatment, follow-up.
- **Repeat the last prescription** as a row action (↻ in the actions cell), without opening
  anything.
- **Follow-ups due, by department** — the dashboard panel now opens with a count per
  department for the next fortnight.
- **"Last seen 3 months ago"** on the history header — the interval matters as much as the
  visit.

### Changed
- Demo month rebuilt: returning patients are ~1 in 7 (they were 2 in 3), and sex no longer
  follows the department index — every surgeon was a woman, which made the demo's sex split
  read 75/25.
- Actions column widened for the second row button.

### Tests
- 98 node checks (was 91) and 87 browser checks (was 79).

## 3.2.0 — 2026-11-11

The second tier of the roadmap: the register answers the question asked in the room.

### Added
- **Patient history** in the editor — every earlier visit under the same OPD number, newest
  first, with department, diagnosis and prescription, and a button to copy that prescription
  into today's row. Clicking a row's number opens the editor on any screen.
- **Next number in the series** — suggested from the highest number already used in this
  location, offered as a one-tap chip, never applied behind your back. Leading zeros kept.
- **Row filter** — narrow the visible rows of every day by name, OPD no., diagnosis,
  treatment, address or phone; days with a match open themselves.
- **Week scope** — the register shows the seven days of the week you are in, with ‹ › steps,
  instead of the whole month.
- **Undo for a bulk day range** — the same toast as a single day.
- **Ages as they are said** — `8 mo`, `18 mo`, `34 y` wherever an age is displayed.

### Changed
- The editor's history sits above the fields, because "what did I give last time" is the
  first question, not the last.
- Column widths trimmed so thirteen columns fit a 1440-wide screen without scrolling.
- Demo month now includes returning patients, so the history panel has something to show.

### Tests
- 91 node checks (was 77) and 79 browser checks (was 66).

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
