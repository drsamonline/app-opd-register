# Privacy

**This app collects nothing.** There is no account, no analytics, no cookie, no crash
reporter and no network request. Open the developer tools, watch the network panel, and you
will see the app load its own files and stop.

## What is stored, and where

Your register is kept in this browser's **IndexedDB** (database `opd-register`), in one
record. Browsers without IndexedDB fall back to `localStorage` under the key
`dailyEntryRegister.v2`. It holds the patient rows you typed — OPD number, case type,
department, name, age, sex, address, diagnosis, treatment — plus each day's status and note,
the location names, and which month you were last looking at.

That data never leaves the device unless **you** export it. `Export backup` writes a JSON
file wherever your browser puts downloads; what happens to that file is up to you.

## What that means in practice

- **By default the register is not encrypted at rest.** Anyone with the device and the
  browser profile can read it. Turn on the passphrase lock (*About & help → Lock*) to encrypt
  it with AES-GCM-256; then the database on disk is ciphertext and the key exists only in
  memory while unlocked. Either way, use the operating system's disk encryption and a screen
  lock if the machine is shared.
- **The passphrase cannot be recovered.** There is no reset link and no backdoor; that is the
  point. Export a backup before you turn the lock on. If it is lost, the lock screen can start
  again from a backup file — which deletes the encrypted register, and says so before it does.
- **The lock is offered once and can be refused.** Declining is stored on the device (in the
  settings key, alongside your theme) so the app does not ask again; nothing else changes.
- **Clearing site data deletes the register.** So does uninstalling the PWA with its data.
  Export a backup weekly; keep it somewhere you would keep the paper register.
- **The demo** (`?demo=1`) is generated in memory and is never written to storage.
- If you import a backup, that file's contents replace what is stored — the app does not
  merge, and does not keep a copy of the previous state.

## Patient data and the law

A register of named patients is personal data. Under India's Digital Personal Data
Protection Act, 2023 the treating doctor is the data fiduciary for it, and the duties that
follow — purpose limitation, accuracy, security safeguards, erasure when no longer needed —
sit with you, not with this software. The app is built to make the "no third party" part
easy: nothing is transmitted, so there is no processor to contract with and no transfer to
disclose.

This is a plain-language summary, not legal advice.

## Contact

Dr Sohil Momin — sohilmomin2000@gmail.com
