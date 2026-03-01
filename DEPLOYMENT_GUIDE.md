
# OSDSarvaya - Installation & Deployment Guide

This guide covers installing OSDSarvaya on Windows and Ubuntu.

---

## Quick Comparison

| Feature | Windows | Ubuntu |
|---------|---------|--------|
| Installation | Run .exe installer | Clone repo + docker-compose |
| No. of Steps | 3 | 4 |
| Technical Skill | Minimal | Basic |

---

# Windows Installation

## Files Needed
Copy `OSDSarvayaSetup.exe` to the Windows laptop (via USB or Google Drive)

**Location:** `client/release/OSDSarvayaSetup.exe` (~99 MB)

## Installation Steps

### Step 1: Copy & Run
1. Copy `OSDSarvayaSetup.exe` to any folder (e.g., Desktop)
2. Double-click to run the installer
3. Follow the installation wizard

### Step 2: Access Application
Browser opens automatically: http://localhost:3001

### Step 3: Login
- Username: `admin`
- Password: `admin@123`

### Step 4: Activate License
1. Go to Settings → License & About
2. Enter License Key and Email
3. Click "Activate License"

### Step 5: Connect WhatsApp
1. Go to Settings (left sidebar)
2. Click "Connect WhatsApp"
3. Open WhatsApp on phone: Settings → Linked Devices → Link Device
4. Scan QR code

---

# Ubuntu Installation (Docker Compose)

## Prerequisites
- Ubuntu 20.04 or later
- Internet connection
- Docker & Docker Compose installed

## Installation Steps

### Step 1: Install Docker & Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

**Important:** Log out and log back in for group changes to take effect.

### Step 2: Clone Repository
```bash
git clone https://github.com/devosduotech/OSDSarvaya.git
cd OSDSarvaya
```

### Step 3: Configure Environment
Edit `production.env`:
```bash
nano production.env
```

Update with your values:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=change_this_to_a_secure_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
MESSAGES_PER_HOUR=60
ERPNEXT_URL=https://your-erpnext-site.com
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
```

### Step 4: Build & Run
```bash
# Build Docker image and start container
./build.sh
```

### Step 5: Verify Running
```bash
# Check container status
docker ps

# View logs
docker logs -f osdsarvaya-app
```

### Step 6: Access Application
Open browser: http://localhost:3001

Login: admin / admin@123

---

# Managing OSDSarvaya

## Windows

| Action | How |
|--------|-----|
| Start | Double-click OSDSarvaya shortcut |
| Stop | Close the application window |
| View Data | %APPDATA%/OSDSarvaya/data/ |

## Ubuntu (Docker)

| Action | Command |
|--------|---------|
| Start | docker compose up -d |
| Stop | docker compose down |
| Restart | docker compose restart |
| View Logs | docker logs -f osdsarvaya-app |
| Rebuild | ./build.sh |

---

# Troubleshooting

## Windows

**Issue:** App stuck on "Loading..."
- Check main.log at %APPDATA%/OSDSarvaya/logs/
- Ensure production.env is being loaded correctly

**Issue:** License activation fails
- Check internet connection
- Verify ERPNext_URL is accessible
- Check API credentials in production.env

**Issue:** WhatsApp disconnected
- Delete %APPDATA%/OSDSarvaya/ and restart

## Ubuntu

**Issue:** Permission denied
```bash
sudo usermod -aG docker $USER
# Log out and log back in
```

**Issue:** Port already in use
```bash
# Find what's using port 3001
sudo lsof -i :3001
```

**Issue:** Container won't start
```bash
# Check logs
docker logs osdsarvaya-app
```

---

# Updating OSDSarvaya

## Windows
Replace `OSDSarvayaSetup.exe` with the new version and reinstall.

## Ubuntu
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./build.sh
```

---

# Data Storage

## Windows
- Location: `%APPDATA%/OSDSarvaya/data/`
- Contains: WhatsApp session, database, license cache

## Ubuntu (Docker)
- Session: Docker volume `osdsarvaya_session`
- Database: Docker volume `osdsarvaya_data`

To backup:
```bash
docker cp osdsarvaya-app:/app/server/data ./backup
```

---

# License System

OSDSarvaya uses ERPNext for license management.

## Features:
- License key + email activation
- Hardware-based machine ID
- 24-hour offline grace period
- License validation on startup

## Test License:
- **Key:** OSDS-8C3T-3GY3-UXYH
- **Email:** info@osduotech.com

---

# Support

For issues, contact OSDuo Tech.
