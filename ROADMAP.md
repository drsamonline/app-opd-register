# Roadmap

Ordered by *value per line of code*. Everything here is meant to be small enough to keep the
app one file — the moment a feature needs a framework, it belongs in another project.

## Next (small, high value)

| Item | Why | Cost |
|---|---|---|
| **Weekly / monthly digest** — one screen: patients per day, per department, new-vs-old, printed on one page | What a clinic actually reports upward | S |
| **Duplicate the last patient** (Ctrl+D) — same family, next member | Common in an OPD queue | XS |
| **Age from date of birth** — type `12/04/1987`, store the age | Removes the arithmetic error in the commonest field | S |
| **Mobile number + follow-up date** on a row, with "due this week" list | Two fields, one new panel; the register becomes a worklist | M |
| **Free-text department memory** — a chip row of the departments you actually use | The datalist is a fixed four | XS |
| **Bulk day actions** — mark a range as holiday, or copy a day's status | Camps and festival weeks | S |
| **Print a single day** — an A4 slip for the day's file | The register is printed, but so is one day | S |
| **Undo for import** — keep the previous database in memory for one step | Import replaces everything today | S |

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
