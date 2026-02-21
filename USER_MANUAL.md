
# CampBlast - User Manual

## 1. Introduction
Welcome to CampBlast! This document guides you through the setup, configuration, and usage of the CampBlast application, now updated with production-ready features for security and reliability.

---
## 2. Configuration
Before running the application, you need to configure it using environment variables. Create a `.env` file inside the `server/` directory by copying the `server/.env.example` file.

```bash
# Example server/.env file
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://your-domain.com
JWT_SECRET=a_very_long_and_secure_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

| Variable         | Description                                                               |
|------------------|---------------------------------------------------------------------------|
| `NODE_ENV`       | Set to `production` for deployments.                                      |
| `PORT`           | The port the server will run on.                                          |
| `CORS_ORIGIN`    | The URL of your frontend. Must be set for security.                       |
| `JWT_SECRET`     | A long, random string for securing login sessions.                        |
| `ADMIN_USERNAME` | The username for logging into the application.                            |
| `ADMIN_PASSWORD` | The password for logging into the application. **Change this!**           |

---
## 3. Production Deployment (Recommended)
The recommended way to deploy CampBlast is using the provided `Dockerfile`.

### 3.1. Building the Docker Image
1.  Navigate to the project's root directory.
2.  Run the build command: `docker build -t campblast .`

### 3.2. Running the Docker Container
Run the container with volumes to persist your WhatsApp session and database, and an environment file for configuration.

1. Create your `production.env` file in a secure location on your host with the production configuration from section 2.
2. Run the command:
```bash
docker run -d -p 3001:3001 --name campblast-app \
  -v campblast_session:/app/server/.wwebjs_auth \
  -v campblast_data:/app/server/data \
  --env-file ./path/to/your/production.env \
  --restart unless-stopped \
  campblast
```
*   `-v campblast_session:/app/server/.wwebjs_auth`: **(Critical)** Persists your WhatsApp login session.
*   `-v campblast_data:/app/server/data`: **(Critical)** Persists your SQLite database file.
*   `--env-file`: Securely passes your configuration to the container.

### 3.3. Accessing the Application
Navigate your browser to `http://<your_server_ip>:3001`.

---
## 4. Local Development Setup
**1. Backend:**
- Create a `.env` file in the `server` directory.
- `cd server`, run `npm install`, then `npm start`.

**2. Frontend:**
- `cd client`, run `npm install`, then `npm run dev`.
- Access the app at `http://localhost:5173`.

---
## 5. Application Usage Guide

### 5.1. Authentication
- On first access, you will be directed to a login page.
- Use the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you configured in your `.env` file to sign in.

### 5.2. Connecting to WhatsApp
- This process remains the same. Navigate to **Settings** and scan the QR code.

### 5.3. Backup and Restore
- On the **Settings** page, you'll find a new "Backup & Restore" section.
- **Export Data:** Click this to download a single JSON file containing all your application data. Store this file securely.
- **Import Data:** Click this to upload a previously exported backup file. **Warning:** Importing will overwrite all existing data.

---
## 6. Troubleshooting
For connection issues, the first step is always to check the logs.
- **Docker:** `docker logs -f campblast-app`
- **Local Development:** Check the terminal where you ran `npm start` in the `server` directory.

Common errors are related to missing system dependencies for the browser automation, which are handled by the Dockerfile but may be missing on a local machine.
