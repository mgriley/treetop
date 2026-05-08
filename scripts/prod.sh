#!/bin/sh
# Runs just docker-compose.yml (no dev override) in detached mode, building images if necessary.
docker build -t treetop-app-manager ./apps/manager
docker compose -f docker-compose.yml up -d --build "$@"
