<div align="center">

# OSDSarvaya

WhatsApp Bulk Messaging Application by OSDuo Tech

**Current version: v2.0.1**

</div>

---

## Quick Start

### Windows

1. Download `OSDSarvayaSetup.exe` from the [releases](../../releases)
2. Run the installer
3. Create admin account (first-time setup)
4. Activate license (requires internet)
5. Scan WhatsApp QR code to connect

### Ubuntu / Docker

Pull the pre-built image from GitHub Container Registry:

```bash
docker pull ghcr.io/devosduotech/osdsarvaya:latest   # or pin: :2.0.1
```

Or build locally with Docker Compose:

```bash
git clone https://github.com/devosduotech/OSDSarvaya.git
cd OSDSarvaya
APP_VERSION=2.0.1 docker compose up -d --build
```

Access at: http://localhost:3001

See [UPGRADE.md](UPGRADE.md) for upgrading existing installations.

---

## Features

### Messaging
- WhatsApp bulk messaging with per-hour rate limiting
- Campaign templates with variables (`{{name}}`, etc.) and attachments
- Group messaging, campaign queue (auto-start) and scheduling
- Automatic retry of failed sends (targeted, with accurate reporting)
- STOP / START / UNSUBSCRIBE opt-out handling via WhatsApp replies

### Platform (v2)
- **REST Notification API** for ERP/system integrations (`/api/notify/*`)
- **API Keys** (`osds_...`) with per-key management
- **Webhooks** with HMAC-SHA256 signatures and automatic retries
- Activity logs, dark mode, backup & restore (atomic)

### Licensing
- License activation via ERPNext integration
- 24-hour offline grace period

---

## First-Time Setup

On first launch, the application will prompt you to create an admin account:

1. Open application in browser (http://localhost:3001)
2. You will be redirected to Setup page
3. Create admin account:
   - Username: min 3 characters
   - Password: min 8 characters, 1 uppercase, 1 number
4. After setup, login with your credentials
5. Go to Settings → License & About → enter License Key and Email → Activate

---

## Documentation

| Document | Purpose |
|----------|---------|
| [USER_MANUAL.md](USER_MANUAL.md) | Configuration, deployment, usage |
| [UPGRADE.md](UPGRADE.md) | Upgrading existing installations |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [ROADMAP.md](ROADMAP.md) | Pending work & release planning |

The in-app Help and FAQ pages document the Notification API, API Keys, Webhooks, and ERP integration examples (ERPNext/Frappe).

---

## Support

For issues and questions, contact OSDuo Tech.
