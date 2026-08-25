# Changelog

All notable changes to OSDSarvaya are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is semver.

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
