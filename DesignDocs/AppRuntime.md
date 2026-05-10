# Treetop Git-Repo App Runtime Design

## Overview

Treetop is a self-hosted mini PaaS focused initially on JavaScript applications.

The first supported app format is:

* a public Git repository containing a Node.js application.

Treetop downloads the repository, creates a persistent workspace, installs dependencies, and runs the application inside an isolated Docker container.

The system supports two execution modes:

* Development mode (`npm run dev`)
* Production mode (`npm start`)

The design intentionally leverages existing JavaScript tooling (Vite, Next.js, nodemon, tsx, etc.) instead of implementing custom hot reload logic.

---

# Goals

## Initial Goals

* Extremely simple architecture
* Support JavaScript Git repos only
* Persistent editable workspaces
* AI-assisted file editing
* Hot reload during development
* Simple production deployment
* Docker-based isolation

---

# Non-Goals (Initial MVP)

* Arbitrary runtime/language support
* Browser IDE
* Kubernetes
* Multi-host orchestration
* Custom build systems
* Automatic framework detection beyond basic Node conventions

---

# Core Architecture

## Main Components

### Treetop Controller

Node.js/Express service responsible for:

* cloning repositories
* managing workspaces
* launching containers
* AI orchestration
* file editing
* log streaming
* routing integration

### Workspace

Persistent filesystem directory containing app source code.

Example:

```text
/treetop-data/apps/<app-id>/workspace
```

### Runtime Container

Docker container responsible for:

* installing dependencies
* running dev server
* running production server

The container mounts the workspace as a volume.

### Traefik

Reverse proxy used for:

* automatic routing
* HTTPS/TLS
* preview URLs
* production domains

---

# App Lifecycle

## 1. Import App

User provides:

```text
https://github.com/example/my-app
```

Treetop:

1. creates app metadata
2. clones Git repository into workspace
3. creates runtime container
4. mounts workspace into container

---

# Workspace Model

The workspace is the canonical source of truth.

Containers are considered disposable execution environments.

Example:

```text
workspace/
  package.json
  src/
  public/
```

The controller may directly read/write workspace files.

---

# Node.js Repo Convention

Initially supported repos must contain:

```text
package.json
```

Preferred scripts:

```json
{
  "scripts": {
    "dev": "...",
    "start": "..."
  }
}
```

---

# Development Mode

## Purpose

Development mode is used for:

* AI-assisted editing
* rapid iteration
* live preview
* hot reload

---

## Startup Flow

Inside the runtime container:

```bash
npm install
npm run dev
```

The dev process remains continuously running.

The container mounts the workspace directory:

```text
/workspace
```

---

# Hot Reload Strategy

Treetop does NOT implement custom file watching or reload logic.

Instead:

* the AI edits files directly inside the workspace
* existing JS tooling handles reload automatically

Examples:

* Vite
* Next.js
* nodemon
* tsx watch

This keeps Treetop framework-agnostic and dramatically simplifies implementation.

---

# AI Editing Flow

1. AI modifies workspace files
2. files change on disk
3. existing dev tooling detects changes
4. app reloads automatically

No container restart is required.

---

# Production Mode

## Purpose

Production mode serves stable deployed applications.

---

## Startup Flow

Inside the runtime container:

```bash
npm install
npm start
```

Production containers:

* do not support live editing
* do not run hot reload tooling
* are treated as immutable runtimes

---

# Networking

All runtime containers join a shared Docker network:

```text
web
```

Traefik automatically routes traffic using Docker labels.

Example:

```text
foo.example.com
```

→ routed to corresponding container.

---

# Container Responsibilities

## Runtime Container

Responsibilities:

* run Node.js process
* install dependencies
* expose HTTP server
* execute npm scripts

NOT responsible for:

* orchestration
* AI loop
* Git operations
* routing
* authentication

---

# Controller Responsibilities

The controller owns:

* Git cloning
* workspace management
* AI orchestration
* file editing
* Docker orchestration
* routing metadata
* log streaming

The controller may execute commands inside containers using:

* Docker exec
* Docker API

---

# Runtime Adapter Direction

Initial MVP supports only Node.js repositories.

Future versions may introduce runtime adapters for:

* Python
* Rust
* Go
* Dockerfile-based projects

Adapters would define:

* install command
* dev command
* start command
* runtime image
* port conventions

The core architecture remains unchanged.

---

# Recommended Initial Constraints

To keep the MVP simple:

* support only public Git repos
* support only Node.js apps
* require package.json
* assume HTTP server behavior
* use convention over configuration

---

# Summary

The core Treetop model is:

```text
Git Repo
    ↓
Persistent Workspace
    ↓
Runtime Container
    ↓
npm run dev / npm start
    ↓
Traefik Routing
```

Development mode relies on existing JavaScript hot reload tooling, while Treetop focuses on:

* orchestration
* AI editing
* workspace management
* deployment
* routing
* container lifecycle
