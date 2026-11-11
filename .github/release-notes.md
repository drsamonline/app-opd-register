**OPD Register — every build of `main`, from the same commit.**

| File | What it is |
|---|---|
| `app-opd-register-portable.exe` | Windows, portable. No installer, no admin rights. |
| `app-opd-register.apk` | Android. Sideload it; works with no signal. |
| `app-opd-register.html` | The whole app in one file — open it from a USB stick. |
| `app-opd-register-linux` | AppImage/tar for Linux. |

Live demo: https://drsamonline.github.io/app-opd-register/play/
Landing page: https://drsamonline.github.io/app-opd-register/

Built from `{{sha}}`. The live demo and these binaries always come from the same commit,
so they cannot disagree.

**Your data stays on the device.** No account, no server, no network request. Export a JSON
backup weekly — that file is the register.
