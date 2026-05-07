# Recommended Local Development Setup for Treetop

## Goal

Run the complete Treetop stack locally on macOS using Docker Compose, including:

* Traefik reverse proxy
* Treetop control server
* dynamically spawned user app containers

This should allow:

* local development of Treetop
* testing dynamic container spawning
* testing Traefik routing
* testing subdomain/path routing
* realistic production-like behavior

---

# Recommended Project Structure

```text id="s6ux6a"
treetop/
├── docker-compose.yml
├── traefik/
│   └── traefik.yml
├── apps/
│   └── sample-app/
├── server/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── data/
```

---

# Core Local Architecture

Docker Desktop (macOS)
└── Docker daemon
├── Traefik container
├── Treetop container
└── dynamically spawned app containers

Treetop communicates with Docker through:

```id="mxlckw"
/var/run/docker.sock
```

---

# Local docker-compose.yml

Use Compose to start:

* Traefik
* Treetop

Example structure:

```yaml id="b2qpxs"
services:
  traefik:
    image: traefik:v3

    command:
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80

    ports:
      - "80:80"
      - "8080:8080"

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

    networks:
      - web

  treetop:
    build: ./server

    ports:
      - "3000:3000"

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./server:/app

    networks:
      - web

networks:
  web:
```

---

# Development Workflow

## Start infrastructure

```bash id="n71yp3"
docker compose up --build
```

This launches:

* Traefik
* Treetop

---

# Local Routing Strategy

For local development, use wildcard localhost domains.

Examples:

* foo.localhost
* bar.localhost
* test.localhost

Modern browsers resolve:

```id="26nsmz"
*.localhost
```

to:

```id="i8t7jb"
127.0.0.1
```

automatically.

This is ideal for local Traefik testing.

---

# Example Dynamic App Deployment

Treetop should spawn containers similar to:

```bash id="nbt4l6"
docker run -d \
  --network treetop_web \
  -l traefik.enable=true \
  -l traefik.http.routers.foo.rule=Host(`foo.localhost`) \
  -l traefik.http.services.foo.loadbalancer.server.port=3000 \
  sample-app
```

Then:

* visiting `http://foo.localhost`
* routes traffic automatically to that container

No manual config required.

---

# Important Networking Detail

Docker Compose automatically prefixes network names.

If compose project name is:

```id="v4g3sf"
treetop
```

then network becomes:

```id="5b0dbs"
treetop_web
```

Treetop must attach spawned containers to the correct network.

Use:

```bash id="c6nt9s"
docker network ls
```

to inspect network names.

---

# Recommended Local Dev Approach

## Treetop container

Run in "live dev" mode:

* bind mount source code
* use nodemon
* auto-restart on changes

Example:

```yaml id="x16y4h"
command: npm run dev
```

---

# Sample Test App

Create a tiny sample container:

Example Express app:

* listens on port 3000
* returns:

  * hostname
  * request info

This helps verify:

* networking
* routing
* container lifecycle

---

# Helpful Debugging Commands

## View containers

```bash id="bm7rws"
docker ps
```

## View logs

```bash id="v4lj7g"
docker compose logs -f
```

## Inspect networks

```bash id="25l5yl"
docker network inspect treetop_web
```

## Test routing

```bash id="5v1pmb"
curl -H "Host: foo.localhost" http://localhost
```

---

# Important macOS Notes

Docker Desktop runs Linux containers inside a lightweight VM.

This is normal and works fine.

Docker socket mounting still works correctly:

```id="z9q2zq"
/var/run/docker.sock
```

No special Linux setup required.

---

# Recommended Initial Scope

For MVP:

* single host only
* HTTP only
* no auth initially
* no persistence beyond simple volumes

Focus first on:

1. container lifecycle
2. routing
3. developer experience

before adding:

* TLS
* multi-user support
* quotas
* isolation hardening
* orchestration scaling
