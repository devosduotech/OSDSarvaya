# Changelog

All notable changes to OSDSarvaya are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is semver.

## [2.0.2] - 2026-11-06

Docker toolchain & WhatsApp reliability release.

### Fixed
- Docker builds failed with `404 Not Found` — base image moved from EOL
  `node:18-bullseye` (stale Debian 11 security repo) to `node:22-bookworm`
- WhatsApp stuck on "Authenticating" → `FAILED`: `whatsapp-web.js` 1.34.6's
  store injection threw on renamed WhatsApp Web modules
  (`WAWebBizGatingUtils`, `WAWebSetPushnameConnAction`), so `ready` never
  fired. Dependency pinned to upstream `main`
  (`pedroslopez/whatsapp-web.js@064a3d5a`), which fixes injection and
  duplicate `authenticated` events
- Debian system Chromium hung WhatsApp Web after authentication — Puppeteer's
  bundled Chrome is used instead
- WhatsApp session deleted on every container restart due to session removal
  in graceful shutdown; now removed only on explicit Disconnect
- DNS timeouts for WhatsApp domains inside the container (public resolvers
  configured in compose)
- Stale WhatsApp client objects could leave the UI stuck on "Connecting"

### Changed
- Docker Compose now pulls the pre-built GHCR image by default
  (`pull_policy: always`); local builds live in `docker-compose.build.yml`
- Docker release automation (GitHub Actions): every `v*` tag publishes
  `<version>` and `latest` images to GHCR
- Windows installer automation (GitHub Actions): every `v*` tag builds
  `OSDSarvayaSetup.exe` and attaches it to the GitHub release
- Session storage consolidated into `osdsarvaya_data` (single volume;
  old `osdsarvaya_session` mount retired)
- Client statuses now expose an intermediate `AUTHENTICATED`
  ("Authenticating...") state
- Container memory limit raised to 2 GB (Chromium peaks above 1 GB)

## [2.0.1] - 2026-08-25

Security hardening & reliability release based on a full code audit of v2.0.0.

### Fixed
- Campaigns: duplicate sends eliminated (`SELECT DISTINCT` for contacts in multiple groups)
- Campaign retries now target only failed contacts; reports stay accurate as failures recover
- Campaign queue drains even after a manual stop
- WhatsApp auto-reconnect (ReferenceError on disconnect) fixed
- Change-password flow fixed (was reading JWT secret from an unwritten location)
- Backup restore is atomic — failed restores can no longer wipe data

### Security
- Rate limiting: login/setup/password-change/license endpoints and Notification API (per key)
- Webhook SSRF validation at create/update and at delivery time (private/internal targets blocked)
- Webhook secrets no longer returned by list/read endpoints (one-time display on creation)
- ReDoS hardening for template variables from the Notification API
- Chromium/Electron hardening: removed web-security-disabling flags
- Removed PII/token leakage from logs

### Changed
- `messagesPerHour` validated (1–10000) via API and clamped in engines
- `/api/data` no longer exposes webhook secrets
- Docker image published to GHCR; compose file references it by default
- Windows packaging: server services/utils copied correctly, runtime data/tests excluded from installer

### Added
- 21 automated tests (security utils, rate limiter, API smoke)

## [2.0.0]

Major feature release.

### Added
- REST Notification API (`/api/notify/send|template|bulk|status|logs`)
- API Key management (`osds_...` keys, hashed at rest, one-time display)
- Webhooks with HMAC-SHA256 signatures and retry backoff (1s/5s/25s)
- Campaign status events over Socket.io + live Dashboard banner
- ERP integration guide (ERPNext/Frappe examples in Help)

## [1.1.x]

Iterative releases through v1.1.32 (see `git log`): WhatsApp connection fixes for
Windows/Docker, bulk contact update/delete, test infrastructure, database backups,
WhatsApp debug logging. No GitHub releases were published between v1.1.31 and v2.0.1.

---

### Upgrade notes
- v1.x → v2.0.0: database schema migrations run automatically on first start; session/data volumes are preserved.
- See [UPGRADE.md](UPGRADE.md) for step-by-step upgrade procedures.
