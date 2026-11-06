# Roadmap & Pending Work

Status as of **v2.0.2** (2026-11-06). This is the planning source of truth —
update it when items are picked up or completed.

> v2.0.2 (2026-11-06) shipped toolchain/WhatsApp reliability: Docker builds on
> node:22-bookworm with Puppeteer's bundled Chrome, `whatsapp-web.js` pinned to
> upstream `main` (064a3d5a) fixing the "authenticated but never ready" hang,
> persistent session across restarts, pull-only Docker Compose, GHCR release
> workflow (v* tags → `<version>` + `latest`), Windows NSIS installer workflow,
> and docs/example-env refresh. The security criticals below were NOT part of
> v2.0.2 and remain the top priority for v2.0.3.

---

## 1. Audit remediation status

A full code audit was performed after v2.0.0. Items #4–#11 + Low/Hygiene shipped
in v2.0.1. The critical items were deliberately deferred.

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Default/hardcoded JWT secret fallback (`server.js`), default secret shipped in `production.env` + Windows installer → admin token forgery possible on default installs | Critical | ⬜ Pending (v2.0.3) |
| 2 | ERPNext license API credentials hardcoded in source & git history | Critical | ⬜ Pending (v2.0.3) |
| 3 | `/api/license/*` routes unauthenticated (activate/deactivate/status/machine-id) | Critical | ⬜ Pending (v2.0.3) |
| 4 | Duplicate campaign sends (multi-group contacts; retry-all) | High | ✅ v2.0.1 |
| 5 | WhatsApp auto-reconnect crash | High | ✅ v2.0.1 |
| 6 | Broken change-password flow | High | ✅ v2.0.1 |
| 7 | No rate limiting anywhere | High | ✅ v2.0.1 |
| 8 | Webhook SSRF + secret exposure in list endpoints | High | ✅ v2.0.1 |
| 9 | ReDoS via Notification API variables | High | ✅ v2.0.1 |
| 10 | Non-atomic backup restore | High | ✅ v2.0.1 |
| 11 | Electron/Chromium weak flags | High | ✅ v2.0.1 |

## 2. Proposed releases

### v2.0.3 — Security criticals (#1–#3)

(The v2.0.2 version number was consumed by the 2026-11-06 reliability release, see above.)
- [ ] Refuse to start without a strong `JWT_SECRET`; generate & persist one at first-run setup
- [ ] Rotate ERPNext API key/secret at the ERPNext side, then remove all hardcoded values from code
- [ ] Purge credentials from git history (`git filter-repo`) — requires force-push coordination
- [ ] Regenerate Windows installer + Docker image AFTER secret removal
- [ ] Require admin JWT for license activate/deactivate/status/machine-id
- Open questions: how do fresh installs get their secret in Docker (auto-generate vs env-only)? Who owns ERPNext credential rotation?

### v2.1.0 — Correctness & integrations
- [ ] Timezone handling: store UTC, render per-user TZ; remove hardcoded IST offset
- [ ] Consent: stop auto-opting-in contacts created via Notification API (configurable flag)
- [ ] Fix duplicate-phone handling in `notify /send` (PK collision logs false failures)
- [ ] Emit `campaign.started` / `campaign.stopped` webhooks; dedicated failure event
- [ ] Implement or remove `scheduleAt` in `/api/notify/send|bulk`
- [ ] JWT refresh/revocation strategy

### v2.2.0 — Scale & hardening
- [ ] Pagination for `GET /api/data` (contacts/runs/logs)
- [ ] Replace sql.js with a file-backed engine (e.g. better-sqlite3) — removes O(n) export-per-write
- [ ] Stop swallowing DB errors in `db.all/get`
- [ ] Remove `dangerouslySetInnerHTML` from FAQ/Help
- [ ] Request size caps per endpoint

### Infrastructure (continuous)
- [x] Release automation: every `v*` tag publishes GHCR images (`<version>` + `latest`) — v2.0.2
- [x] Release automation: every `v*` tag builds the Windows NSIS installer and attaches it to the release — v2.0.2
- [ ] GitHub Actions CI: install → lint/typecheck → jest → docker build on push/PR
- [ ] Backfill release page for v2.0.1 (GHCR only)
- [ ] Multi-arch Docker images (amd64 + arm64)
- [ ] Windows installer code signing certificate (removes SmartScreen warnings)

## 3. Known small debts
- README previously referenced a missing `build.sh` (fixed in docs; decide whether to actually provide the script)
- `fluent-ffmpeg` coverage reports bloat packaged node_modules (~10s of MB) — prune in packaging step
- ~~`production.env.example` committed as template~~ — done in v2.0.2
- `@electron/rebuild` devDependency removed (unused by electron-builder) — done in v2.0.2
