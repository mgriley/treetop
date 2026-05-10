# Treetop MVP Architecture Overview

## Goal

Treetop is a self-hosted mini PaaS that allows users to deploy sandboxed applications. The system should:

* Run as a Dockerized service
* Dynamically spawn/manage sibling Docker containers
* Auto-route incoming traffic to deployed apps
* Support both:

  * user-provided JavaScript apps
  * user-provided Docker images

The initial deployment target is a single Linux host using Docker Compose.

---

# High-Level Architecture

Host machine runs:

* Docker daemon
* Traefik reverse proxy
* Treetop control plane container
* Dynamically spawned user app containers

Architecture:

Internet
↓
Traefik
↓
User App Containers

Treetop orchestrates container lifecycle via Docker socket.

---

# Core Components

## 1. Traefik

Purpose:

* Reverse proxy
* Automatic routing
* Automatic service discovery from Docker labels

Responsibilities:

* Listen on ports 80/443
* Watch Docker daemon
* Route requests like:

  * foo.example.com → foo container
  * bar.example.com → bar container

Traefik should:

* use Docker provider
* expose dashboard optionally
* disable `exposedByDefault`

Traefik container requires:

* `/var/run/docker.sock` mounted read-only

---

## 2. Treetop Container

Node.js/Express application.

Responsibilities:

* API/UI
* Deploy user apps
* Stop/restart/delete apps
* Stream logs
* Manage metadata/state

Treetop container should:

* mount Docker socket
* use Docker CLI or Docker API (`dockerode`)
* dynamically create sibling containers

The Treetop container itself runs inside Docker Compose.

---

# Container Orchestration Model

Treetop dynamically launches user containers via Docker.

Example behavior:

* create container
* attach to shared `web` network
* assign Traefik labels
* expose app internally

Example labels:

* `traefik.enable=true`
* `traefik.http.routers.foo.rule=Host(\`foo.example.com`)`
* `traefik.http.services.foo.loadbalancer.server.port=3000`

Traefik auto-discovers containers and updates routing automatically.

No NGINX config generation or reloads required.

---

# Networking

Docker Compose should define a shared bridge network:

* `web`

All containers join this network:

* Traefik
* Treetop
* user app containers

This allows Traefik to reach dynamically created containers.

---

# Docker Socket Access

Treetop requires:

/var/run/docker.sock

mounted into the container.

This allows:

* container creation
* lifecycle management
* network management
* log inspection

Security note:

* Docker socket access is effectively root-equivalent
* Treetop is trusted infrastructure software
* Never expose Docker socket to arbitrary user containers

---

# Deployment Strategy

Use Docker Compose for initial deployment.

User install flow should be:

```bash
git clone ...
docker compose up -d
```

Compose stack initially includes:

* Traefik
* Treetop
* persistent volumes/networks

User app containers are NOT defined in compose.
They are dynamically managed by Treetop at runtime.

---

# Initial Tech Choices

* Node.js + Express
* Docker
* Docker Compose
* Traefik
* Optional: dockerode for Docker API access

---

# Recommended Initial Features

MVP API endpoints:

* deploy app
* list apps
* stop app
* delete app
* fetch logs

Support:

1. JS apps

   * Treetop creates runtime container and executes app

2. User-provided Docker images

   * Treetop launches image with constraints/networking/labels

---

# Future Expansion Ideas

Possible future upgrades:

* wildcard TLS
* authentication/multi-user support
* quotas/resource limits
* Firecracker isolation
* Kubernetes backend
* remote Docker hosts
* persistent databases
* app templates

For MVP:
focus on simplicity and single-host operation.
