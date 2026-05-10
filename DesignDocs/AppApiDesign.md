# Treetop Internal Platform API Design

## Overview

Treetop applications run inside isolated Docker containers, but privileged operations are centralized in the Treetop controller.

The controller acts as:

* orchestration layer
* AI gateway
* policy engine
* infrastructure manager

App containers communicate with the controller through authenticated internal APIs over a private Docker network.

---

# Goals

* Centralize privileged infrastructure access
* Prevent app containers from directly accessing provider secrets
* Support AI-native application capabilities
* Enforce quotas, limits, and policies centrally
* Keep runtime containers lightweight and sandboxed

---

# Core Architecture

```text id="jlwm2n"
App Container
    ↓
Internal Platform API
    ↓
Treetop Controller
    ↓
LLM Providers / Docker / Storage / Secrets
```

---

# Networking

All containers join a private internal Docker network.

Example:

```text id="0jlwm0"
treetop_internal
```

The controller is reachable only internally:

```text id="2jlwmm"
http://controller:3000
```

These APIs are not publicly exposed.

---

# Authentication

Each app container receives:

```text id="3jlwmx"
TREETOP_TOKEN
TREETOP_API
```

Example:

```text id="2jlwmd"
TREETOP_API=http://controller:3000
```

The token authenticates requests to internal APIs.

---

# Controller Responsibilities

The controller owns:

* AI provider access
* token accounting
* quotas/rate limiting
* orchestration
* policy enforcement
* usage tracking
* secret management

The controller may also expose:

* storage APIs
* logging APIs
* deployment APIs
* app metadata APIs

---

# App Container Responsibilities

App containers are responsible only for:

* running user applications
* serving HTTP traffic
* executing runtime commands
* calling internal platform APIs

App containers should NOT:

* possess provider API keys
* access Docker directly
* manage orchestration
* access host infrastructure

---

# Internal API Examples

Example endpoints:

```text id="0jlwmu"
POST /internal/ai/chat
POST /internal/storage/read
POST /internal/storage/write
GET  /internal/logs
```

These APIs are authenticated using the app token.

---

# AI API Example

Inside an app container:

```ts id="3jlwm7"
const response = await fetch(
  "http://controller:3000/internal/ai/chat",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TREETOP_TOKEN}`
    },
    body: JSON.stringify({
      messages
    })
  }
);
```

The controller:

1. validates the token
2. enforces quotas
3. selects provider/model
4. streams the response back

---

# Security Model

The controller acts as the platform trust boundary.

Only the controller may:

* access provider secrets
* orchestrate infrastructure
* manage deployments
* enforce policies

Runtime containers are treated as untrusted application sandboxes.

---

# Future Direction

This architecture naturally supports:

* centralized AI billing
* usage limits
* AI-native SDKs
* platform storage APIs
* vector search APIs
* image generation APIs
* app-scoped capabilities

Example future SDK:

```ts id="6jlwme"
import { ai } from "@treetop/sdk";

await ai.chat(...);
```

Internally, the SDK communicates with controller APIs.

---

# Summary

Treetop uses a centralized platform-controller architecture:

```text id="0jlwm9"
Sandboxed App Containers
        ↓
Authenticated Internal APIs
        ↓
Treetop Controller
        ↓
Privileged Infrastructure + AI Providers
```

This design provides:

* strong security boundaries
* centralized policy enforcement
* simplified runtime containers
* extensible AI-native platform capabilities
