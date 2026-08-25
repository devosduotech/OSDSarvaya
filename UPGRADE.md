# Upgrade Guide

How to update an existing OSDSarvaya installation. Your WhatsApp session
(`osdsarvaya_session`) and database (`osdsarvaya_data`) are preserved across
upgrades — always confirm both volumes exist before upgrading.

---

## Docker (Ubuntu / production servers)

### Patch upgrade (e.g. 2.0.0 → 2.0.1)

```bash
cd /path/to/OSDSarvaya
git pull                          # or download the new tag
docker compose pull               # use pre-built GHCR image, then:
docker compose up -d --no-build

# — or build locally —
APP_VERSION=2.0.1 docker compose up -d --build
```

Verify after upgrade:

```bash
curl http://localhost:3001/api/version    # expect appVersion 2.0.1
docker logs -f osdsarvaya-app             # watch startup + scheduler lines
```

### Rollback

```bash
APP_VERSION=2.0.0 docker compose up -d --build
```

> Note: rolling back after the database has been migrated may not be supported.
> Take a backup first (Settings → Backup & Restore, or copy `osdsarvaya_data/osdsarvaya.db`).

### v1.x → v2.x (major upgrade)

1. Take a full backup: Settings → **Backup & Restore** → Export Data (save the JSON).
   Also copy the raw DB file as a second safety net.
2. Stop the stack: `docker compose down`
3. Fetch the new code and start with `APP_VERSION=2.x.y`.
4. Schema migrations run automatically on first start (`Database schema verified` in logs).
5. Log in; verify contacts/groups/templates are intact.
6. New in v2: create API keys and webhooks under Settings if you plan to integrate.

---

## Windows (desktop installer)

1. Close OSDSarvaya (check the system tray).
2. Download the new `OSDSarvayaSetup.exe` from [Releases](../../releases) and run it —
   it upgrades in place; data in `%APPDATA%\OSDSarvaya\data` is preserved.
3. Launch, log in, reconnect WhatsApp if prompted.

Rollback: install the older setup exe over it (data is kept).

---

## Troubleshooting upgrades

| Symptom | Fix |
|---------|-----|
| `/api/version` shows old version | Image not rebuilt/pulled — run with explicit `APP_VERSION`, check `docker images` |
| WhatsApp asks to re-scan QR | Session volume missing — check `osdsarvaya_session` mount exists |
| Container restart-looping | `docker logs osdsarvaya-app`; usually a bad `production.env` value |
| Healthcheck failing | Give Chromium ~30s on first boot; check `docker inspect --format '{{.State.Health.Status}}' osdsarvaya-app` |
