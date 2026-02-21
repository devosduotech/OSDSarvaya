#!/bin/bash

set -e

echo "=========================================="
echo "  CampBlast Installation (Ubuntu)"
echo "=========================================="

echo ""
echo "Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose
    
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "Please logout and login again, then run this script again."
    exit 0
fi

echo "Docker already installed."

echo ""
echo "Step 2: Creating CampBlast directory..."
mkdir -p ~/campblast
cd ~/campblast

echo ""
echo "Step 3: Copying files from repository..."
echo "Please ensure you have cloned the CampBlast repository here."
echo "If you haven't, run: git clone https://github.com/YOUR_USERNAME/CampBlast.git"

if [ ! -f docker-compose.yml ]; then
    echo "ERROR: docker-compose.yml not found!"
    echo "Please clone the repository first."
    exit 1
fi

echo ""
echo "Step 4: Configuring production.env..."
if [ ! -f production.env ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    cat > production.env << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
MESSAGES_PER_HOUR=60
EOF
    echo "Created production.env with default settings."
    echo "You can edit it with: nano production.env"
fi

echo ""
echo "Step 5: Building and starting CampBlast..."
docker-compose up -d --build

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "CampBlast is running at: http://localhost:3001"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin@123"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f   # View logs"
echo "  docker-compose restart  # Restart"
echo "  docker-compose down     # Stop"
echo ""
