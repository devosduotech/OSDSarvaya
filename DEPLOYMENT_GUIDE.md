
# OSDSarvaya - Installation & Deployment Guide

This guide covers installing OSDSarvaya on Windows and Ubuntu.

---

## Quick Comparison

| Feature | Windows | Ubuntu |
|---------|---------|--------|
| Installation | Double-click .exe | Clone repo + docker-compose |
| No. of Steps | 3 | 6 |
| Technical Skill | Minimal | Basic |

---

# Windows Installation

## Files Needed
Copy `OSDSarvaya.exe` to the Windows laptop (via USB or Google Drive)

**Location:** `client/release/OSDSarvaya.exe` (~69 MB)

## Installation Steps

### Step 1: Copy & Run
1. Copy `OSDSarvaya.exe` to any folder (e.g., Desktop)
2. Double-click to run
3. Wait 10-15 seconds for first start

### Step 2: Access Application
Browser opens automatically: http://localhost:3001

### Step 3: Login
- Username: `admin`
- Password: `admin@123`

### Step 4: Connect WhatsApp
1. Go to Settings (left sidebar)
2. Click "Connect WhatsApp"
3. Open WhatsApp on phone: Settings → Linked Devices → Link Device
4. Scan QR code

---

# Ubuntu Installation (Docker Compose)

## Prerequisites
- Ubuntu 20.04 or later
- Internet connection

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
git clone https://github.com/YOUR_USERNAME/OSDSarvaya.git
cd OSDSarvaya
```

### Step 3: Configure Environment
```bash
# Generate a secure JWT_SECRET
openssl rand -base64 32
```

Edit `production.env`:
```bash
nano production.env
```

Update with your values:
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your_generated_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
MESSAGES_PER_HOUR=60
```

### Step 4: Build & Run
```bash
# Build Docker image and start container
docker-compose up -d --build
```

### Step 5: Verify Running
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 6: Access Application
Open browser: http://localhost:3001

Login: admin / admin@123

---

# Managing OSDSarvaya

## Windows

| Action | How |
|--------|-----|
| Start | Double-click OSDSarvaya.exe |
| Stop | Close the window |
| View Data | %APPDATA%/OSDSarvaya/ |

## Ubuntu (Docker)

| Action | Command |
|--------|---------|
| Start | docker-compose up -d |
| Stop | docker-compose down |
| Restart | docker-compose restart |
| View Logs | docker-compose logs -f |
| Rebuild | docker-compose up -d --build |

---

# Troubleshooting

## Windows

**Issue:** App not opening
- Make sure no other app is using port 3001
- Check Windows Firewall settings

**Issue:** WhatsApp disconnected
- Data may be corrupted. Delete `%APPDATA%/OSDSarvaya/` and restart

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

# Change port in production.env and docker-compose.yml
```

**Issue:** Container won't start
```bash
# Check logs
docker-compose logs
```

---

# Updating OSDSarvaya

## Windows
Replace `OSDSarvaya.exe` with the new version.

## Ubuntu
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

---

# Data Storage

## Windows
- Location: `%APPDATA%/OSDSarvaya/`
- Contains: WhatsApp session, database, logs

## Ubuntu (Docker)
- Session: Docker volume `osdsarvaya_session`
- Database: Docker volume `osdsarvaya_data`

To backup:
```bash
docker cp osdsarvaya-app:/app/server/data ./backup
```

---

# Support

For issues, contact OSDuo Tech.
