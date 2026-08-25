# OSDSarvaya — User Manual

Applies to **v2.0.1**.

## 1. Introduction

OSDSarvaya is a locally deployable WhatsApp campaign automation platform for
secure, controlled bulk messaging — personalized messages with attachments to
targeted contact groups, without third-party SaaS messaging providers.

---

## 2. Configuration

Configuration comes from `production.env` (repo root; Docker Compose loads it via `env_file`).
There is no `.env` in the server directory for production use.

```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=<long-random-string>        # REQUIRED — see Security note below
MESSAGES_PER_HOUR=30                   # default send rate
ERPNEXT_URL=https://<your-erpnext-site>
ERPNEXT_API_KEY=<key>
ERPNEXT_API_SECRET=<secret>
```

> **Security note:** v2.0.1 still falls back to a built-in default if `JWT_SECRET`
> is unset. Always set a long random value (`openssl rand -hex 32`). This is being
> made mandatory in v2.0.2 (see ROADMAP.md).

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` for deployments |
| `PORT` | Server port (default 3001) |
| `CORS_ORIGIN` | Allowed browser origin (`*` by default) |
| `JWT_SECRET` | Secret used to sign admin login tokens |
| `MESSAGES_PER_HOUR` | Global default send rate |
| `ERPNEXT_*` | License server connection |

---

## 3. Deployment

### 3.1 Docker Compose (recommended)

```bash
git clone https://github.com/devosduotech/OSDSarvaya.git
cd OSDSarvaya
APP_VERSION=2.0.1 docker compose up -d --build     # or: docker compose pull && docker compose up -d
```

The compose file persists:
- `./osdsarvaya_session` → WhatsApp Web login session
- `./osdsarvaya_data` → SQLite database + license cache

Healthcheck runs every 30s against `/api/health`.

### 3.2 Pre-built image

```bash
docker pull ghcr.io/devosduotech/osdsarvaya:2.0.1   # or :latest
```

### 3.3 Windows desktop

Download `OSDSarvayaSetup.exe` from [Releases](../../releases) and install.
Data lives in `%APPDATA%\OSDSarvaya\data`.

### 3.4 First-time setup

1. Open http://localhost:3001 → you are redirected to the Setup page
2. Create the admin account (username ≥ 3 chars; password ≥ 8 chars with 1 uppercase and 1 number)
3. Log in
4. Settings → **License & About** → enter License Key + Email → **Activate License** (needs internet)
5. Connect WhatsApp (next section)

---

## 4. Connecting WhatsApp

Settings → scan the QR code with the phone linked to your WhatsApp account.
Status is shown live; the app auto-reconnects after brief disconnects.
If authentication fails, disconnect and re-scan.

**Opt-out handling:** incoming messages `STOP` / `UNSUBSCRIBE` mark the contact
opted-out; `START` / `SUBSCRIBE` / `OPTIN` opts them back in.

---

## 5. Application usage

### Campaigns
Create templates (with `{{name}}`-style variables and optional attachments),
select groups, then **Start** (runs immediately), **Schedule**, or queue while
another campaign is running. The Dashboard shows a live banner while a campaign
is running with a Stop button. Failed sends are retried automatically.

### Contacts & groups
Import contacts (CSV/bulk), manage opt-in status individually or in bulk,
organize into groups.

### Backup & restore
Settings → Backup & Restore. Export downloads a JSON snapshot; Import restores it.
Restores are atomic since v2.0.1 — either everything applies or nothing changes.
Keep exported backups secure (they contain contact PII).

### Integrations (v2)
- **API Keys** (Settings): create `osds_...` keys for external systems. The full key is shown once.
- **Notification API**: `POST /api/notify/send`, `/template`, `/bulk`; status via `/status/:externalId`. Auth header: `x-api-key`.
- **Webhooks**: subscribe to `message.sent`, `message.failed`, `campaign.completed`, etc. Payloads are signed (`X-OSDSarvaya-Signature: sha256=<hmac>`).

Full endpoint documentation with curl examples: in-app **Help** page;
ERPNext/Frappe integration samples: in-app **Help → ERP Integration Guide**.

---

## 6. Troubleshooting

Check logs first:
- Docker: `docker logs -f osdsarvaya-app`
- Windows: `%APPDATA%\OSDSarvaya\logs` (electron-log)
- Dev: terminal running the server

| Problem | Likely cause / fix |
|---------|--------------------|
| QR never appears | Chromium missing/deps — Docker image ships Chromium; on bare metal install deps per Dockerfile |
| "WhatsApp not connected" when starting campaigns | Reconnect from Settings first |
| Healthcheck unhealthy | Wait ~30s after boot; check logs for DB/permission errors |
| Login rejected after restart | `JWT_SECRET` changed between runs — keep it stable in production.env |
| Rate limited (HTTP 429) | Too many requests — see Retry-After header; login is limited to 20/15min per IP |
