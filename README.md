# Nidhi PWA v-1.7.0 — local PIN and QR transfer

## Publish on GitHub Pages
Upload this package's CONTENTS to the repository root, including all JS/CSS, vendor files, icons and .nojekyll. Settings > Pages > Deploy from a branch > main > /(root) > Save. No server, Google account, API key or custom workflow is required. Remove old drive.js, config.js and custom workflow files if still present.

## Before upgrading an existing ledger
Download an Excel copy from the OLD app first. Close other Nidhi tabs/windows before updating. Keep the same host/path. Refresh or close/reopen to load the new service worker. Do not clear site storage to update.

On first launch, name, a six-digit numeric PIN and confirmation are mandatory. Existing ledger and prepared Excel file are migrated into encrypted entries in the same IndexedDB store. PIN metadata and initial ledger/file encryption are committed in one transaction. A migration error does not intentionally erase the original data. The name is local profile metadata. The PIN cannot be recovered; keep a downloaded Excel copy.

## PIN lock
The PIN is required at every open and whenever the app returns after being hidden, left or losing window focus. Settings offers Lock now. Browser permission/file dialogs are treated separately while the page stays visible; actually hiding the page still locks it. Backgrounding stops QR cameras/timers, hides private content and releases the active session key. Returning requires the PIN.

Ledger, generated Excel file and reminder-message history use AES-256-GCM with keys derived from the PIN using PBKDF2-HMAC-SHA-256, 210,000 iterations and random salt. The PIN verifier is encrypted; the PIN and session key are not stored on disk. Wrong attempts have UI throttling. Six digits still have limited entropy: this does not replace device security, and a JS lock cannot guarantee OS app-switcher thumbnails or Android FLAG_SECURE behavior.

Forgotten PINs cannot decrypt this browser's ledger; no reset/backdoor is provided. Import a downloaded XLSX into a fresh browser profile after creating a new PIN there. Clearing storage loses local data and PIN configuration. Changing the PIN is not included in this version. Name remains editable in Settings.

## Tour and mandatory daily Excel
A short tour appears after the first successful unlock/setup. Skip, closing or completing it marks it seen; it does not repeat on every login or request permissions automatically.

Daily Excel preparation is ALWAYS ENABLED in the normal UI. Once per local calendar day while unlocked/open, an XLSX of all current ledger data and monthly plans is prepared and stored encrypted locally. Empty ledgers/plans have nothing to export. Only the latest generated file is kept. Manual export also refreshes it.

PREPARING A LOCAL FILE IS NOT AN EXTERNAL BACKUP. Open the prepared file and choose Download or Share to keep a copy outside browser storage. A closed PWA cannot reliably save files on a timer. Missed historical days are not reconstructed. Downloaded/shared XLSX files are unencrypted and Android-import compatible; keep them private.

## QR transfer — Android and PWA
No pairing, signaling or QR encryption. The sender chooses a range, calculates the exact required QR count, then displays complete record batches with Next/Back. The receiver scans each code and imports its records immediately, shows a horizontal progress bar and a success tick, and marks that code completed. Scanning it again shows Already completed and does not reinsert records.

Choose All, this month, last month, last 90 days (including today), last 3/6 calendar months, today/current data, or inclusive custom dates. Future records are excluded. A large selection such as 1,000 records can need hundreds of codes: count depends on actual text lengths. Above 30 codes, Excel is recommended. Each code is capped at 1,800 ASCII characters; a single oversized record must use Excel. The hard limit is 10,000 codes.

Both devices must run the updated format for independent per-page imports. Android -> PWA, PWA -> Android, Android -> Android and PWA -> PWA share NIDHI_QR2. Updated receivers also accept old Android PT_QR fragments, but old transfers only import after every fragment has been collected. Old Android versions cannot receive the new format. The earlier encrypted PWA pairing format is replaced.

Records use the same INR/epoch/category/account/note/reference fields on both platforms. Unicode is encoded as UTF-8/Base64 (encoding, not encryption), with a SHA-256 corruption check. Categories/accounts used by records are created or reused. Monthly-plan configuration and unused choices travel via Excel, not QR. A camera-less device can display codes but needs Excel import to receive data. Sender display is manual; wait for the receiver's tick before Next, because there is no return acknowledgment channel.

Completion is remembered locally across reopening. PWA commits ledger and receipt atomically in IndexedDB. Android commits through the existing duplicate-safe Room importer, then persists completion status. A repeat after interruption skips existing rows before marking completion. Different transfer IDs cannot be mixed in one session; restart Receive for a new transfer. Received matching records are kept, not overwritten. Leaving/locking pauses QR scanning; return to Receive to continue using the same sender codes.

Plain QR data is visible to anyone who scans the display. Only show it to the intended recipient. No camera images or financial data are uploaded. PIN encryption still protects the PWA's local store; downloaded/shared XLSX and shared QR payloads remain unencrypted and require no backup password.

See QR_TRANSFER_PROTOCOL.md for the exact shared format and backward-compatibility limits.

## Duplicate checks
Import and QR preview/merge skip matching payment references, or minute-level date/time + amount + type + note + category + account (normalizing case/whitespace). Repeated unchanged imports add no matching duplicates. Exports omit duplicate rows without deleting existing browser records. Changed metadata with no reference may represent a distinct record, so perfect semantic duplicate detection cannot be promised. Identical duplicate keys are treated as the same record.

## Other features retained
App-style Home, four tabs, floating Add, History, bottom-sheet dialogs, colours/themes/wallpapers, mandatory profile name, category/account dropdowns with Create new dialogs, monthly income/commitment checkboxes, Analyze with weekly/monthly/yearly totals and read-only what-if targets, Excel import/export/sharing and the install invitation are retained.

Reminders and daily morning/end-of-day summaries are OPTIONAL and consent-based. Checks run while unlocked/open or on return, not as reliable closed-app alarms. Device notifications require explicit permission and can expose financial amounts on the lock screen. No push backend is included. Native XLSX sharing is used only if supported; otherwise download and attach manually.

## Privacy and deployment
No Google Drive integration, analytics server or API configuration. Records stay on this browser unless exported/shared or transferred via QR. GitHub Pages receives normal asset requests. Camera decoding is local. Chosen share destinations handle files under their own policies. Local browser data does not migrate between hosts/profiles/devices automatically.

Use HTTPS (GitHub Pages provides it). Web Crypto and camera access need a secure context. Install prompts, cameras and device notifications depend on browser/platform support. Bundled libraries: JSZip 3.10.1, qrcode-generator 1.4.4 and qr-scanner 1.4.2, used under MIT; licenses/notices are included. No runtime CDN is required. Future code updates need a new CACHE suffix in sw.js.

## Verification
JS syntax, module paths and package/offline-shell assets were checked. PIN migration, background locking, real camera/per-page QR transfers and cross-device duplicate merges HAVE NOT BEEN TESTED ON REAL DEVICES. Manually verify with a copied/non-critical ledger before production use. No user ledger or Android database was changed to build this package.

Designed and developed by Pruthvi Raj CP.

## Excel record updates
PWA Excel exports retain an optional Nidhi record ID column. Excel imports can preview changed matching records and explicitly update them if chosen. Shared Android/PWA QR uses reference/fingerprint duplicate checks and keeps existing records; it does not apply this PWA-only stable-ID update mechanism.

## v-1.7.0 upgrade note
Upload all files, including qr-protocol.js and sw.js. Build/install the updated Android working copy for NIDHI_QR2 send/receive. Older Android receivers cannot read new-format codes; use Excel for older versions. Downloaded Excel is already plain XLSX with no password. Local PWA PIN encryption is retained only for stored data and is not applied to exported files or QR payloads. Real cross-device camera interoperability and Android compilation have not been verified in this task.

## Shared Android/PWA navigation (v-1.7.0)
Both main navigation bars use Home, Stats, History, Settings in that order, with the same icon shapes. Android keeps its existing features and navigation IDs. PWA Monthly Plan, Excel and QR Transfer are secondary screens reached from Home/Settings rather than extra bottom tabs.

Home card order: allowance, this month, cash flow, expense breakdown, recent transactions, monthly plan, Add transaction tools, QR transfer tools. Expenses align right; cards use subtle selected-accent surfaces/borders. Android retains screenshot OCR; the PWA uses Excel import as its corresponding second transaction tool. SMS/other-app notification capture, Google Drive and native biometric preferences remain Android-specific and have not been removed from Android. The PWA remains local-only with its mandatory PIN and daily Excel preparation.

PWA Stats now has Income/Expenses views, weekly/monthly/yearly navigation, a category chart/list, category drill-down into History, and a small Analyze icon. History also has All/Income/Expenses tabs and week/month/year navigation. Regular Stats/History week boundaries follow the platform locale; Analyze's historical weekly aggregation remains Monday-based. Grouping labels and exact period dates are displayed.

Analyze is reached through a compact Home shortcut or the Stats chart icon. Weekly/Monthly/Yearly is a segmented selector; Period is an outlined dropdown instead of full-width primary buttons. No recorded data, categories, accounts or monthly-plan configuration is removed by these UI changes.

PWA Back (app bar/browser gesture) returns from main sections to Home; an open dialog is dismissed first. At Home, two Back presses request leaving the app and lock it. The browser/OS controls whether a tab or installed window actually closes. Android keeps its double-Back exit on Home, and main Stats/History/Settings Back returns Home. Native secondary activities retain their existing caller-return behavior. Old PWA overview/transactions/preferences hashes are recognized; Analyze remains available through its older insights hash.

Upload ALL files, including stats.js, calendar-periods.js, app-style.css and sw.js. Keep the same URL/path and do not clear browser storage. Existing PIN, records and saved choices remain. JavaScript syntax and Android layout XML were checked; no Android build or browser/device navigation/UI tests were run.


## Complete package — UI build 22

This folder contains the complete static PWA, including shared Stats/History/Recent record rows, current UI fixes, PIN access, Excel import/export, local daily file preparation, QR transfers, notification summaries, appearance settings and update controls. No build, Google keys or GitHub Actions are required.

Upload all contents of this folder, including `vendor/`, `.nojekyll`, `record-row.js`, and `record-row.css`, into the existing GitHub Pages publishing root. Preserve the hosting URL. Do not clear users' site storage.

Existing users: Settings → Check for updates → Update now. If the first reopen still shows an earlier release, reopen once more and check again. Settings should show **UI build 22**. Normal cold launches open Home; unlocking after a window switch preserves the current page. Explicit notification/manifest shortcut launches retain their destinations. Offline app files are read from one release cache, never a different waiting release.

The package does not contain users' ledger/PIN data. No Android build or browser/device runtime tests were run for this delivery. JavaScript syntax, local module references, service-worker shell paths and ZIP contents were checked.


UI build 24: Home has a dedicated dashboard renderer. Main-tab navigation is scoped to the navigation buttons. A screen-render failure replaces the content with its own retry message instead of leaving another screen visible under the selected tab.


## UI build 26

Stats and History share one Back/title/period/filter header. Stats begins with All / Income / Expenses. History groups the visible records by local calendar day, with daily income/expense totals and overall totals that follow the period, type, account and search filters. Light/Dark/System selection is in Settings → Appearance. Analyze remains accessible from Home and Stats' Period totals card.

The Android working copy at F:\Android\MoneyLedger has matching compact headers, period totals, Stats All tab, shared surface/transaction/chart colors and Plain/Mist/Dune/Aurora choices; its other wallpapers and native features are retained. No database schema change is needed for this UI update.

Upload every file from this ZIP to the same GitHub Pages root, then apply Update now. The PIN screen and Settings show UI build 26. Do not clear site data. JavaScript syntax and local file references, Android XML and ZIP integrity were checked. No Gradle build or device/browser runtime tests were run.
