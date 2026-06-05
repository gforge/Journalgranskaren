# KI-Journalgranskaren

A local, **offline-first** patient chart note viewer for Karolinska Institutet (KI). Load CSV or Excel journal exports, auto-map the columns, and review patient notes in a clean, MedBench-styled interface — all entirely in your browser, with no data ever leaving the machine.

## 🔗 Live demo

**View it in your browser (no install required):**
👉 **https://gforge.github.io/Journalgranskaren/**

The site is a static build deployed to the [`gh-pages`](https://github.com/gforge/Journalgranskaren/tree/gh-pages) branch by GitHub Actions on every push to `main`. It runs fully client-side, so the public demo is just as offline as a local build. Use the two bundled example dataset buttons on the welcome screen to explore the app without uploading a file.

The bundled examples use deliberately invalid pseudo-identifiers in the `Personnummer` column, such as `1970707-ABCD`, so they cannot be mistaken for real Swedish personal identity numbers.

> For real patient data, prefer a local build (`npm run build`) or the desktop executable (`npm run tauri build`) on an approved research computer.

## Features

- **CSV & Excel import** with automatic column detection (Swedish + English header aliases).
- **MedBench-style note viewer** with markdown rendering, note-type/author filters, labs and medications tabs.
- **Bilingual UI** (Svenska / English).
- **Local-only processing** — parsing and rendering happen entirely in browser/app memory. No network calls, no uploads.
- **Tamper-evident audit log** — every reviewer action is recorded in a local IndexedDB hash chain, verified on load and exportable to CSV (see below).

## 🔐 Tamper-evident audit log

Reviewer actions (loading a file, opening a chart, switching tabs, marking a patient done) are written to a local IndexedDB store. Each entry is cryptographically chained to the previous one:

```
hash(entry) = SHA-256( prevHash | timestamp | reviewer | action | patientId | details )
```

Every new entry stores both its own `hash` and the `prevHash` of the entry before it, forming a chain anchored at a genesis value of `0`. SHA-256 is computed with the Web Crypto API (`crypto.subtle`).

On the **Patient Overview** screen the chain is re-verified in the background and the result is shown as a badge:

- ✅ **Audit log chain integrity verified** — every entry's hash recomputes correctly and links to its predecessor.
- ⚠️ **Audit log integrity compromised** — a row was altered, removed, or re-ordered; the tooltip names the offending entry ID.

The full log, including the `Hash` and `PrevHash` columns, can be exported via **Export Audit Logs (CSV)** for external archival or review. Legacy entries written before the hash chain existed are skipped during verification so older logs don't trigger false alarms.

## Quick start

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
```

### Build a static bundle

```bash
npm run build    # outputs to /dist
```

Open `dist/index.html` in any modern browser — no hosting or server required.

### Build a desktop executable (Tauri)

```bash
npm run tauri build    # binaries land in src-tauri/target/release/
```

Produces a portable Windows `.exe` (runs without admin rights) or a macOS bundle.

## Deployment

Pushing to `main` triggers [`.github/workflows`](.github/workflows) which runs `npm ci && npm run build` and publishes `/dist` to the `gh-pages` branch via [`JamesIves/github-pages-deploy-action`](https://github.com/JamesIves/github-pages-deploy-action). The Vite `base` is set to `/Journalgranskaren/` to match the GitHub Pages path.

## Documentation

See [`docs/README.md`](docs/README.md) for the data-flow diagram, column-alias reference, included example datasets, and audit-log details. The architecture diagram lives in [`docs/architecture.puml`](docs/architecture.puml).

## License

See [LICENSE](LICENSE).
