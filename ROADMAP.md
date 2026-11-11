# Roadmap

Ordered by *value per line of code*. Everything here is meant to be small enough to keep the
app one file — the moment a feature needs a framework, it belongs in another project.

## Shipped in 3.1.0

Follow-up date + mobile number · follow-ups-due panel · monthly digest · duplicate patient ·
DOB→age · department memory · bulk day status · print one day · undo an import.

## Next (small, high value)

| Item | Why | Cost |
|---|---|---|
| **Patient history panel** — every visit for one OPD number, oldest first, with the gaps | The question actually asked in the room is "what did I give last time" | M |
| **Suggest the next OPD number** from the last one typed today (never owned, only suggested) | Typing the series by hand invites a duplicate | S |
| **Filter the rows of a day** by a word, on the day header | A nine-patient day is fine; a thirty-patient camp is not | S |
| **Infants as months** — show `8 mo` instead of `0` wherever an age is printed | `0y` in a pediatric line reads like a bug | XS |
| **Undo for a bulk day range** — the same toast as a single day | The most destructive action in the app today has no undo | S |
| **Copy a previous visit's diagnosis + treatment** into a new row of the same patient | Duplicate covers the person, not the prescription | S |
| **A weekly view** — seven day columns, for a week at a glance | The month is long; the week is what gets reviewed | M |

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
