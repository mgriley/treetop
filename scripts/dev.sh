#!/bin/sh
docker build -t treetop-app-manager ./apps/manager
docker compose up --build "$@"
