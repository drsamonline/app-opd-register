# Roadmap

Ordered by *value per line of code*. Everything here is meant to be small enough to keep the
app one file — the moment a feature needs a framework, it belongs in another project.

## Shipped

**3.1.0** — follow-up date + mobile number · follow-ups-due panel · monthly digest ·
duplicate patient · DOB→age · department memory · bulk day status · print one day ·
undo an import.

**3.2.0** — patient history with copy-prescription · next OPD number suggestion · row filter ·
week scope · undo for a bulk range · ages as months.

**3.3.0** — week as seven columns · print the week · printed visit slip · repeat last
prescription from a row · follow-ups by department · "last seen" gaps.

**3.4.0** — undo a deleted location · search inside one day · digest week totals and a
missing-diagnosis note · patient-list sort · the highlight-escaping fix.

**3.5.0** — drag a patient to another day · column-order presets · daily target line ·
missing-diagnosis mode · export the patient list · undo a day-status change.

**3.6.0** — IndexedDB storage with migration and fallback · optional passphrase lock
(AES-GCM-256) · off-screen rendering.

## Next (small, high value)

| Item | Why | Cost |
|---|---|---|
| **Week totals in the digest** — a weekly column beside the daily one | The week is reviewed; the month is filed | S |
| **Drag a patient to another day** | A patient seen on the wrong day is a two-minute fix today | M |
| **Undo for delete-location** | The only irreversible action left without one | XS |
| **Search inside one day** from the day header | The row filter spans every day; sometimes you want one | XS |
| **A "no diagnosis" nudge** — count rows saved without one | Catches a half-entered day before the digest | XS |
| **Sort the patient list by date or name** | Search results are newest-first only | XS |

## Then (worth the code)

| Item | Why | Cost |
|---|---|---|
| **Optional passphrase lock** (AES-GCM via WebCrypto, as in `app-encrypted-case-log`) | A shared machine is the real risk; the data is not encrypted at rest | M |
| **IndexedDB instead of localStorage** | Removes the ~5 MB ceiling; the honest limit today is roughly 40,000 rows | M |
| **Virtualised day list** — render 3 days above and below the viewport | A year of data in one scroll, still instant | M |
| **A second register shape** — IPD or a camp register, same engine | Reuse instead of a new app | M |
| **Hindi / Marathi / Gujarati UI** (strings in one object, `lang` switch) | Many staff type in the local script even if the app is English | M |
| **Footfall by hour** — a time field, then a heatmap | Staffing, and the only real reason to want time | M |
| **Share a month as a link-free file** — a self-contained HTML export of the statistics | Sending a report to someone who has no app | S |
| **Differential backup** — export only months changed since the last export | A backup you actually run weekly | S |

## Later (only if asked for)

- Multi-device sync through a file the user carries (no server), e.g. a QR of a month.
- A prescription pad template that fills from the diagnosis field.
- Lab values with reference ranges per sex and age.
- AYUSH / ICD-10 code columns for a scheme report.

## Deliberately not doing

- **A login, a server, or a "cloud".** The promise is that the register never leaves the
  device. Anything that breaks that belongs in a different product.
- **A framework.** React + a router + a state library would be ~150 KB of download and a
  build step, for a form.
- **Charts as a dependency.** A donut is two circles; a bar is a div.
- **Auto-incrementing OPD numbers owned by the app.** The hospital's number series is the
  hospital's, and a second series that disagrees with the paper register is worse than none.
- **Sending anything to analytics.** Including "anonymous usage stats".
