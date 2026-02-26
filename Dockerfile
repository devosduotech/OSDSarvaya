FROM node:18-bullseye

# -----------------------------
# Build Arguments
# -----------------------------
ARG APP_VERSION=v1.0.0

# -----------------------------
# Install Chromium + Dependencies
# -----------------------------
RUN apt-get update && apt-get install -y \
    chromium \
    libgbm1 \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Global Environment Variables
# -----------------------------
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app

# -----------------------------
# Install Backend Dependencies
# -----------------------------
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# -----------------------------
# Install & Build Frontend
# -----------------------------
WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client

#-----------------------------
# Install All deps incl dev
#-----------------------------
RUN npm install --include=dev
COPY client/ .
RUN npm run build

# -----------------------------
# Copy Backend Source Code
# -----------------------------
WORKDIR /app
COPY server/ ./server/

# -----------------------------
# Create Required Directories
# -----------------------------
RUN mkdir -p /app/server/.wwebjs_auth
RUN mkdir -p /app/server/data

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "server.js"]
