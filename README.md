<div align="center">

# CampBlast

WhatsApp Bulk Messaging Application by OSDuo Tech

</div>

---

## Quick Start

### Windows

1. Download `CampBlast.exe` from the [releases](../../releases)
2. Double-click to run
3. Default login: `admin` / `admin@123`
4. Scan WhatsApp QR code to connect

### Ubuntu

```bash
# Run the install script
curl -sSL https://raw.githubusercontent.com/OSDuoTech/CampBlast/main/install-ubuntu.sh | bash
```

Or manual installation:

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Clone or download project
mkdir campblast && cd campblast
# Add your docker-compose.yml and production.env

# Build and run
docker-compose up -d
```

Access at: http://localhost:3001

---

## Default Credentials

- **Username:** admin
- **Password:** admin@123

---

## Features

- WhatsApp Bulk Messaging
- Contact Management with Opt-in/Out
- Campaign Templates
- Group Messaging
- Activity Logs
- Dark Mode Support
- Campaign Queue (auto-start)

---

## Support

For issues and questions, contact OSDuo Tech.
