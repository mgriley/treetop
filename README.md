# Treetop
Run the servers of your dreams

> Work in progress

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Development

Starts the full stack with live reload. Source changes in `server/src/` restart the server automatically.

```bash
./scripts/dev.sh
```

| URL | Service |
|-----|---------|
| http://treetop.localhost | Treetop (via Traefik) |
| http://localhost:3000 | Treetop (direct) |
| http://localhost:8080 | Traefik dashboard |

## Production

Runs detached, no bind mounts, no dashboard port.

```bash
./scripts/prod.sh
```

| URL | Service |
|-----|---------|
| http://treetop.localhost | Treetop (via Traefik) |
