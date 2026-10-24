# Blueprint Scanner

[![Node 22](https://img.shields.io/badge/node-22-brightgreen)](.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-234%20passing-success)](docs/TESTING.md)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#license)

**Public URL or HTML → structured frontend reverse-spec (Blueprint JSON).**
A high-signal snapshot of a site's *public* UI — design tokens, structure, forms, tech stack and WordPress/Elementor/JetEngine architecture — for rebuilds, audits, migrations and design extraction.
It does not clone backends, databases or secrets.

**Repo:** [youh4ck3dme/EEEEEE](https://github.com/youh4ck3dme/EEEEEE)

## What it does

- Scans a **public** `https://` page (or pasted HTML) into a versioned Blueprint JSON
- Same-origin multi-page crawl (1–20 pages) with **partial recovery** and transient **retry**
- Fetch chain: headless Chromium (Playwright) → static HTTP → **archive.org Wayback** fallback
- Extracts design tokens, CSS variables, typography, forms, headings, links, tech signals, assets, OG / JSON-LD metadata
- Optional **WordPress / JetEngine / Elementor** extraction: Elementor sections and globals, JetEngine dynamic fields and listing grids, REST/CCT hints, sitemap URLs
- Compiles an **importable Elementor template JSON** (v0.4 schema) from a blueprint
- **AI Rebuild Studio**: generates a system/user prompt + `tailwind.config.js` fragment and an SPA-aware Architecture Compiler prompt (copy-only — the app makes no LLM API calls and needs no AI key)
- History vault, side-by-side compare, JSON / ZIP / Elementor export
- **PWA & Asset Studio**: ingest a public GitHub repo (or a master image) → icon set, `favicon.ico`, `manifest.webmanifest`, HTML/Next.js head snippets, live preview and ZIP bundle — generated fully in the browser (Canvas + JSZip)

## What it does **not** do

- Clone server code, databases, `.env`, auth secrets or private APIs
- Bypass login walls or capture session cookies
- Scan private networks — localhost, RFC1918 and cloud-metadata addresses are blocked (SSRF guard)
- Promise 1:1 full-stack replication (target: ~70–90 % of the **public** frontend)

## Features

| Area | Capabilities |
|------|--------------|
| Ingest | URL scan · HTML paste · `baseUrl` for relative paths |
| Fetch chain | Headless (Playwright) → HTTP static → Wayback |
| Crawl | Same-origin BFS · `maxPages` 1–20 · per-URL fault isolation |
| Resilience | Partial `scanStatus` · AbortSignal cancel · HTTP retry with backoff · thin-HTML / SPA shell detection |
| Extract | Meta/SEO · headings · links · forms · tech detection · design tokens · CSS vars |
| WordPress | JetEngine dynamic-field catalog · listing grids · Elementor sections/globals · template JSON |
| Hardening | SSRF blocklist · asset caps (10 MB/file, 50 MB total, 40 files, 12 s timeout) · browser process shield · `withApiGuard` |
| AI | Rebuild prompt + Tailwind config fragment · Architecture Compiler prompt (copy-only) |
| PWA Studio | GitHub repo analysis · icon engine · favicon.ico · manifest · head snippets · ZIP |
| Storage | Browser vault (last 15 scans) · server DB (Neon Postgres or embedded PGlite) · JSON import |
| Auth | Better Auth (federated OAuth via broker: Google, X) · can be disabled |

## Tech stack

TanStack Start (React 19, file routes, server functions) · Vite + Nitro · Tailwind CSS 4 · Radix/shadcn UI · Zod · Playwright · node-html-parser · Better Auth + Kysely · Neon/`pg` or **PGlite** (Postgres in WASM) · JSZip · Vitest + Testing Library.

## Quick start

Requires **Node 22**.

```bash
git clone https://github.com/youh4ck3dme/EEEEEE.git
cd EEEEEE
npm ci
npx playwright install chromium   # needed for headless render; otherwise HTTP/Wayback fallback is used
npm run dev
```

Open `http://localhost:8080`, paste a public URL → **Vytvoriť blueprint** (the UI is in Slovak).

No `.env` is required for local development: without `DATABASE_URL` the app runs on an embedded PGlite database and applies `migrations/` on startup.

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | prod | Neon / Postgres connection. Unset → embedded PGlite. Migrations run on `npm run build` |
| `VITE_AUTH_ENABLED` | no | `false` disables sign-in; server functions use a dev user |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | prod (auth) | Better Auth base URL and secret |
| `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET` | prod (auth) | OAuth broker issuer and per-app client credentials |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | no | Custom Chromium binary (e.g. serverless) |
| `PREVIEW_THUMBNAIL_TIMEOUT_MS` | no | Headless thumbnail timeout |
| `SMOKE_BASE_URL`, `SMOKE_OUT_DIR`, `SMOKE_TIMEOUT_MS`, `BROWSER_SMOKE_TIMEOUT_MS` | no | Smoke test runner |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server on `0.0.0.0:8080` |
| `npm run build` | Production build, then `db:migrate` |
| `npm run build:dev` | Vite build (development mode) |
| `npm run preview` | Preview production build on `0.0.0.0:8080` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Vitest run (default suite) |
| `npm run test:unit` | Unit + integration (`tests/unit`, `tests/integration`) |
| `npm run test:smoke` | Playwright UI smoke (`tests/smoke/smoke-runner.mjs`) |
| `npm run test:all` | `test:unit` then `test:smoke` |
| `npm run db:migrate` | Apply `migrations/*.sql` to `DATABASE_URL` (skipped when unset) |

## Server API

TanStack server functions in `src/lib/blueprint/server.ts` (details in [API](docs/API.md)):

| Function | Method | Purpose |
|----------|--------|---------|
| `scanBlueprint` | POST | Scan URL/HTML → blueprint (options: `maxPages`, `render`, `wayback`, `captureAssets`, `wpJetEngine`) |
| `getBlueprint` | GET | Load a saved blueprint |
| `listBlueprints` | GET | List saved blueprints |
| `deleteBlueprint` | POST | Delete a blueprint |
| `compareBlueprintPair` | POST | Diff two blueprints |

## Exports

| Format | How |
|--------|-----|
| Blueprint JSON | Copy / download from the result view · `exportBlueprintJson` |
| ZIP archive | Captured assets + JSON · `exportBlueprintZip` |
| Elementor template | `elementor-template-import.json` (v0.4 schema) |
| AI Rebuild prompt | Clipboard · system + user prompt + Tailwind config fragment |
| Architecture prompt | SPA-aware UI rebuild brief (copy-only) |
| PWA bundle | ZIP with icons, `favicon.ico`, manifest and head snippets |

## Project structure

```text
src/
  routes/                 # TanStack Start routes (single-page app: index.tsx)
  components/blueprint/   # scan-form, blueprint-view, history-list, compare-panel
  components/pwa/         # PWA & Asset Studio
  components/ui/          # shadcn-style primitives
  lib/blueprint/          # scan pipeline, crawl, render, Wayback, design system,
                          # tech detection, WordPress/JetEngine, Elementor compiler, DB store
  lib/scanner/            # browser shield, asset guards, pipeline, API errors
  lib/ai-rebuild/         # rebuild prompter + architecture compiler
  lib/pwa/                # GitHub repo analysis, icon/manifest engine
  lib/auth/               # Better Auth server/client, middleware, PGlite dialect
  lib/seo/                # JSON-LD helpers
  lib/db.ts               # Neon ⇄ PGlite switch
migrations/               # 0001_auth.sql, 0002_blueprints.sql
tests/                    # unit/ · integration/ · smoke/ · fixtures/ · helpers/
scripts/                  # migrate, browser-smoke, preview-thumbnail, qa-scan
docs/                     # Architecture, Development, Testing, API, Security, Deployment, Runbook
.github/workflows/ci.yml  # typecheck + unit + build, then Playwright smoke
```

## Testing & CI

- **31 test files / 234 tests** (unit + integration) — passing, `tsc --noEmit` clean (verified 2026-10-24)
- CI (`.github/workflows/ci.yml`, Node 22): job 1 `typecheck` → `test:unit` → `build`; job 2 installs Chromium and runs the blocking browser smoke test

## Limitations

- **Thin HTML / SPA**: without a successful headless render, the shell may be empty (flagged via `isThinHtml`)
- **Login walls**: only the public DOM is visible
- **Asset budgets**: max 10 MB per file, 50 MB total, 40 assets per scan
- **Crawl size**: max 20 same-origin pages per scan
- **Serverless headless**: Playwright needs a Chromium binary — see [Deployment](docs/DEPLOYMENT.md)
- **PWA Studio GitHub ingest** uses the unauthenticated GitHub API (public repos only, 60 requests/hour per IP)
- `src/lib/multiplayer/` (WebRTC P2P client) is a scaffold — not wired into the UI and has no signaling endpoint yet
- `.grok/skills/` (`auth`, `neon`, `design-ui`, `multiplayer-p2p`) and `AGENTS.md` are Grok Build agent instructions from the scaffolding template; they are not part of the runtime app

## Documentation

| Doc | Audience |
|-----|----------|
| [Architecture](docs/ARCHITECTURE.md) | Engineers |
| [Development](docs/DEVELOPMENT.md) | Contributors |
| [Testing](docs/TESTING.md) | QA / CI |
| [API](docs/API.md) | Integrators |
| [Security](docs/SECURITY.md) | Security / ops |
| [Deployment](docs/DEPLOYMENT.md) | DevOps |
| [Runbook](docs/RUNBOOK.md) | On-call / support |
| [Contributing](CONTRIBUTING.md) | PRs |
| [Changelog](CHANGELOG.md) | Releases |

## License

Private — all rights reserved.
