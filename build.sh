#!/bin/bash

# Get latest version from git tag
VERSION=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//')

if [ -z "$VERSION" ]; then
    echo "No git tag found. Please create a tag first: git tag v1.0.0"
    exit 1
fi

echo "=========================================="
echo "Building OSDSarvaya v$VERSION"
echo "=========================================="

# Build and start containers
docker compose build --build-arg APP_VERSION=$VERSION
docker compose up -d

echo "=========================================="
echo "OSDSarvaya v$VERSION deployed!"
echo "Access at: http://localhost:3201"
echo "=========================================="
