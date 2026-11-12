# Roadmap

**There is no open backlog.** This file is a ledger, not a wish list: everything that was
planned is either shipped or refused, with the reason written next to it. A list that keeps
growing is a way of never finishing.

## Shipped

| Version | What it added |
|---|---|
| 3.0.0 | Five views (dashboard, register, statistics, patients, about/help) behind a rail and a bottom bar · month register with day statuses · dashboard · day/month/range statistics · print, Excel, JSON · split into six files with a test suite |
| 3.1.0 | Follow-up date + mobile per row · follow-ups due · monthly digest · duplicate patient · date-into-age · department memory · bulk day status · print one day · undo an import |
| 3.2.0 | Patient history with copy-prescription · next OPD number · row filter · week scope · undo a bulk range · ages as months |
| 3.3.0 | Week as seven columns · print the week · printed visit slip · repeat prescription from a row · follow-ups by department · "last seen" gaps |
| 3.4.0 | Undo a deleted location · search inside one day · digest week totals and a gap note · patient-list sort · the highlight-escaping fix |
| 3.5.0 | Drag a patient to another day · column-order presets · daily target line · missing-diagnosis mode · export the patient list · undo a day status |
| 3.6.0 | IndexedDB storage with migration and fallback · optional passphrase lock (AES-GCM) · off-screen rendering |
| 3.7.0 | The lock offered once with a real opt-out · menu shortcut · start-again-from-backup · settings restored at boot |
| 3.8.0 | Auto-lock when idle · encrypted backup out and back in · column order per location |
| 3.9.0 | Year view · merge an import · "what changed" after an import · signature line on the printed week |
| 3.10.0 | Import preview · undo an import · field-level merge · monthly target |
| 3.11.0 | CSV import with a column mapper · named merge conflicts · "added by the last import" · checksummed backups |
| 3.12.0 | Conflict queue resolved per field · passphrase-signed backups · month CSV in the register's order · CSV mappings remembered |
| 3.13.0 | Printing fixed (text table, A4 widths, no placeholders) · printable conflict sheet · round-trip test · backup-age reminder |
| 3.14.0 | Print preview · landscape register · a choice of printed columns |
| 3.15.0 | Day totals on the printed sheet · paper size remembered · two copies · print the patient list |

## Not doing — with the reason

| Refused | Why |
|---|---|
| **Two-way sync over a folder or a network** | The file is a backup, not a transport. A merge that runs itself on a schedule is a way to lose a register quietly. Dropped by the author. |
| **A server, an account, a "cloud"** | The promise is that the register never leaves the device. Anything that breaks it is a different product. |
| **Multi-language UI** | Dropped by the author. One language, one clinical tool. |
| **A framework, a router, a state library** | 150 KB of download and a build step, for a form. The app is six classic scripts and one stylesheet. |
| **A chart library** | A donut is two circles; a bar is a div; a trend is 31 divs. |
| **App-owned OPD numbering** | The hospital's series is the hospital's. The app suggests the next number; it never owns it. |
| **Analytics of any kind** | Including "anonymous usage". There is no network call in the code. |
| **An IPD / indoor register** | A different document with different fields. It would be a second app reusing the engine, not a column here. |
| **Lab values with reference ranges** | That is a results system, not a register. |
| **A prescription pad** | A4 legal requirements per state; the treatment field is a summary, not a prescription. |
| **Hourly footfall** | Needs a time per patient that nobody enters. A field that is always empty is a lie in a report. |

## Known limits, stated rather than queued

- **Single device.** No sync, by decision. Moving a register means exporting a file.
- **Unencrypted by default.** The lock is opt-in; the lock screen says the passphrase cannot
  be recovered.
- **IndexedDB ceiling.** ~50 MB in practice, far beyond decades of a single clinic.
- **Merging reconciles fields, not intent.** A patient whose filled fields differ is queued
  for a human decision, not guessed at.
- **The app cannot verify it is up to date.** There is no network call, so no update check;
  the release page is the place to look.
