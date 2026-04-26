#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Local development: load variables from a .env file if present.
# In AWS (ECS, Elastic Beanstalk, EC2), these variables are injected by the
# platform (Secrets Manager / Parameter Store / task-definition env) and the
# .env file is never present, so this block is safely skipped.
# ---------------------------------------------------------------------------
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Fail fast if any required variable is missing
: "${POSTGRES_USER:?POSTGRES_USER is required (set in .env or injected by AWS)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required (set in .env or injected by AWS)}"
: "${DB_USER:?DB_USER is required (set in .env or injected by AWS)}"
: "${DB_PASSWORD:?DB_PASSWORD is required (set in .env or injected by AWS)}"
: "${DB_NAME:=bowling}"   # default to 'bowling' if unset

docker pull node:lts-alpine

# Create the shared network; ignore error if it already exists
docker network create bowlingBallAppProject 2>/dev/null || true

# ---------------------------------------------------------------------------
# Start the Postgres container using credentials from the environment.
# AWS ECS: credentials arrive via the task-definition "secrets" block.
# ---------------------------------------------------------------------------
docker build -t postgres-custom:latest .
docker run -d \
  --network=bowlingBallAppProject \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  -e POSTGRES_USER="${POSTGRES_USER}" \
  -e POSTGRES_DB="${DB_NAME}" \
  --name=postgres \
  postgres-custom:latest

# ---------------------------------------------------------------------------
# Build and start the backend container
# ---------------------------------------------------------------------------
docker build -t backend:1.0.1 ./backend
docker run -i --rm \
  --network=bowlingBallAppProject \
  -p 3000:3000 \
  -e DB_NAME="${DB_NAME}" \
  -e DB_HOST=postgres \
  -e DB_USER="${DB_USER}" \
  -e DB_PASSWORD="${DB_PASSWORD}" \
  --name=backend \
  backend:1.0.1