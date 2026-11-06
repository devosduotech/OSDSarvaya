FROM node:22-bookworm

# -----------------------------
# Build Arguments
# -----------------------------
ARG APP_VERSION=__VERSION__

# -----------------------------
# Install Chromium + Dependencies
# -----------------------------
# Debian bookworm is still supported and ships a current Chromium.
# The chromium package pulls in all required runtime libraries itself.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Global Environment Variables
# -----------------------------
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

# Let Puppeteer download its own Chrome build. Debian's system Chromium is
# known to hang WhatsApp Web after authentication (the `ready` event never
# fires), while Puppeteer's bundled Chrome works.
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

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
RUN mkdir -p /app/server/data

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "server.js"]
