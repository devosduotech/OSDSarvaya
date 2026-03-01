
# OSDSarvaya Build & Release Guide

## Version
Current version: **1.1.4**

---

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

**Output:** `client/release/OSDSarvayaSetup.exe`

---

## Docker Deployment

### Using build.sh (Recommended)
```bash
# Clone repository
git clone https://github.com/devosduotech/OSDSarvaya.git
cd OSDSarvaya

# Build and run (uses latest git tag)
./build.sh
```

The `build.sh` script automatically:
- Reads the latest git tag for version
- Builds the Docker image with correct version
- Starts the containers

### Manual Docker Commands
```bash
# Development
docker compose up -d

# Production - pull latest and rebuild
git pull origin main
docker compose build
docker compose up -d
```

---

## Version Management

### Checking Current Version
```bash
# Check git tags
git tag -l

# Check server version at runtime
docker exec osdsarvaya-app cat /app/server/data/osdsarvaya.db
```

### Creating a New Release
```bash
# Update version in:
# - client/package.json
# - server/package.json

# Commit changes
git add .
git commit -m "Release v1.x.x"

# Create git tag
git tag -a v1.x.x -m "Release v1.x.x"

# Push to remote
git push origin main --tags
```

---

## Environment Variables (production.env)

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=change_this_to_a_secure_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
MESSAGES_PER_HOUR=60
ERPNEXT_URL=https://dvarika.osduotech.com
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
```

### Required Variables:
| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 3001) |
| JWT_SECRET | Secret for JWT tokens |
| ADMIN_USERNAME | Admin login username |
| ADMIN_PASSWORD | Admin login password |
| ERPNEXT_URL | ERPNext instance URL |
| ERPNEXT_API_KEY | ERPNext API key |
| ERPNEXT_API_SECRET | ERPNext API secret |

---

## Default Login
- Username: `admin`
- Password: `admin@123`

---

## Troubleshooting

### Docker health check failing
- Ensure `/api/health` endpoint is available
- Check logs: `docker logs osdsarvaya-app`

### Windows exe not starting
- Check Windows Firewall
- Ensure port 3001 is available
- Check logs at %APPDATA%/OSDSarvaya/logs/main.log

### License activation fails
- Verify internet connection
- Check ERPNext_URL is accessible
- Verify ERPNEXT_API_KEY and ERPNEXT_API_SECRET are correct

### WhatsApp disconnected
- Delete %APPDATA%/OSDSarvaya/ and restart
- On Docker: `docker compose down -v` to clear session

### Duplicate database files
- Ensure OSDSARVAYA_DATA environment variable is set correctly
- On Docker, use the volume mounts (osdsarvaya_data, osdsarvaya_session)

---

## File Structure

```
OSDSarvaya/
├── build.sh              # Build script (auto-detects version)
├── docker-compose.yml    # Docker compose config
├── Dockerfile           # Docker image definition
├── production.env       # Production environment variables
├── server/              # Backend server code
│   ├── server.js
│   ├── database.js
│   └── routes/
├── client/              # Frontend React app
│   ├── src/
│   ├── electron/        # Electron main process
│   └── release/        # Built executables
└── README.md
```

---

## Support

For build issues, contact OSDuo Tech.
