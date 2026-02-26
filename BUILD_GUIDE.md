# OSDSarvaya Build & Release Guide

## Building Windows .exe

### Prerequisites
- Node.js installed (v18+ recommended)
- Windows OS (or Windows VM/cross-compiler)

### Commands

```bash
# Navigate to client directory
cd client

# Build Windows executable
npm run electron:build
```

**Output:** `client/release/OSDSarvaya.exe`

---

## Docker Deployment

### Development
```bash
docker compose up -d
```

### Production
```bash
# Pull latest code
git pull origin main

# Build and start
docker compose up -d --build
```

---

## Updating Production Server

```bash
# SSH to server
ssh user@your-server-ip

# Navigate to project directory
cd /path/to/OSDSarvaya

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

---

## Environment Variables (production.env)

```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your_secure_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
MESSAGES_PER_HOUR=60
```

---

## Default Login
- Username: `admin`
- Password: `admin@123`

---

## Troubleshooting

### Docker health check failing
- Ensure `/api/health` endpoint is available
- Check logs: `docker compose logs`

### Windows exe not starting
- Check Windows Firewall
- Ensure port 3001 is available

### WhatsApp disconnected
- Delete `%APPDATA%/OSDSarvaya/` and restart
