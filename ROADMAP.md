# Roadmap

Ordered by *value per line of code*. Everything here is meant to be small enough to keep the
app one file — the moment a feature needs a framework, it belongs in another project.

## Shipped

**3.1.0** — follow-up date + mobile number · follow-ups-due panel · monthly digest ·
duplicate patient · DOB→age · department memory · bulk day status · print one day ·
undo an import.

**3.2.0** — patient history with copy-prescription · next OPD number suggestion · row filter ·
week scope · undo for a bulk range · ages as months.

## Next (small, high value)

| Item | Why | Cost |
|---|---|---|
| **A week at a glance** — seven *columns*, not seven sections | The week scope lists days; comparing them side by side is the actual job | M |
| **Print the week** — one A4 with the seven days and a weekly total | What a weekly review asks for | S |
| **History as a printable slip** — one patient's visits on half a page | Handed to the patient, or filed | S |
| **"Repeat last visit" without opening history** — a row action | The copy exists; reaching it takes two taps | XS |
| **Department-level follow-up counts** — due next week, by department | Staffing the OPD, not the file | S |
| **A patient's gaps** — "last seen 3 months ago" on the history header | The interval matters as much as the visit | XS |

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
