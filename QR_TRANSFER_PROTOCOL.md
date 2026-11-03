# Nidhi shared QR transfer, version 2

Implemented by Android `NidhiQrProtocol.kt` and PWA `qr-protocol.js`.

No encryption, pairing, signaling service, network session, account or API key is involved. A QR exposes financial records to anyone able to scan it. Use only with an intended receiver.

## Sender

Select all data, this month, last month, last 90 calendar dates including today, last 3/6 calendar months including this month, today, or inclusive custom dates. End dates are capped at now. Calculate the exact required count before displaying. Each QR contains complete transactions. Long individual records that cannot fit are rejected with an Excel recommendation, never silently split or omitted.

Each envelope is at most 1,800 ASCII characters, using QR error correction M and a quiet zone. Unicode is retained by encoding JSON as UTF-8 bytes, then Base64. Base64 is encoding, NOT encryption. Counts vary by actual field lengths, serialization and Unicode content. Do not assume 1,000 records fit in seven codes. Over 30 pages prompts a recommendation to use XLSX; hard limit 10,000 codes.

Envelope: `NIDHI_QR2:` followed by JSON:

```
{"v":2,"id":"transfer-uuid","i":0,"n":7,"h":"64-lowercase-hex-SHA256","d":"base64-utf8-json-array"}
```

`i` is zero-based. Display labels are one-based. `h` is SHA-256 of the exact decoded `d` bytes, not of reserialized JSON. Every page uses the same random transfer ID and total. Hash verifies corruption, not sender authenticity.

Decoded `d` is an array of compact records:

- `t`: INCOME or EXPENSE
- `a`: numeric INR amount (PWA converts its integer paise to INR on send and back on receive)
- `c`: category name
- `e`: category emoji, optional/empty
- `ac`: account name, optional/default Default
- `n`: note, optional/empty
- `d`: description, optional/empty
- `dt`: Unix epoch milliseconds
- `ref`: transaction/UPI reference, optional/empty
- `u`: counterparty UPI, optional/empty

It transfers transaction records. Categories and accounts used by those records are reused/created; unused categories, monthly-plan configuration and account settings are transferred via XLSX instead.

## Receiver

User chooses Receive to authorize importing each valid page immediately. Validate envelope/version/index/size/hash and every record before any write. Commit one complete page using duplicate checks. Update page-completion receipt and progress only after successful import. Show tick, added count and duplicate count. Next/Back are sender controls; no automatic receipt acknowledgment goes back to the sender.

Keep an active transfer ID to prevent mixing unrelated pages. Pages can arrive out of order. Completion receipts store transfer ID, index, total and hash. If the exact page is scanned again, show Already completed and perform no further insertion. A changed payload for a completed index is rejected. Persist receipt history across reopening.

PWA writes ledger and receipt together in an encrypted local IndexedDB transaction (PIN storage protection is independent of plaintext transfer format). Android uses the existing Room transaction importer and stores the completion receipt after successful commit. If Android stops between commit and receipt save, rescan is safe: duplicate checks see existing records and skip them. No database migration is added.

Duplicate key: minute-level timestamp, amount to two decimals, normalized note/category/account, and type; or normalized transaction reference. Key text normalization collapses whitespace, case and Unicode compatibility variants. Existing matching records are retained; QR does not update them or propagate deletions. Different fields with no common reference can represent separate records, so arbitrary semantic identity cannot be inferred. PWA Excel's optional stable ID update flow remains separate.

## Legacy and deployment compatibility

Updated receivers also accept `PT_QR:index/total:fragment` legacy Android transfers. Those older pages are fragments of one JSON array; they can only be imported once all fragments are assembled. Already captured fragments are identified. Do not mix legacy senders in a receive session, because the old format has no transfer identifier.

Old Android versions do not understand `NIDHI_QR2:`. Update both sides for new per-page imports. The earlier experimental encrypted PWA pairing format is replaced. Existing unencrypted Android/PWA Excel files remain readable; PIN encryption affects only the local PWA store, not downloaded Excel or QR data.

Source checks only: real Android/PWA camera interoperability, page capacity/scanning quality and import/replay flows still need manual device verification. No builds or device tests have been run.
