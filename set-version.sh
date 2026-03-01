#!/bin/bash

# Get latest tag (remove 'v' prefix if present)
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//')

if [ -z "$LATEST_TAG" ]; then
    echo "No git tag found, using default version 1.1.0"
    LATEST_TAG="1.1.0"
fi

echo "Setting version to: $LATEST_TAG"

# Update docker-compose.yml - replace __VERSION__ placeholder
sed -i "s/__VERSION__/$LATEST_TAG/g" docker-compose.yml

echo "Updated docker-compose.yml with version $LATEST_TAG"
