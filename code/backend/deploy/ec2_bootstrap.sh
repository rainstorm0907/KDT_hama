#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/main}"
BACKEND_DIR="$APP_DIR/code/backend"
PY_DIR="$BACKEND_DIR/src/main/python"
SERVICE_SOURCE="$BACKEND_DIR/deploy/hama-fastapi.service.example"
SERVICE_TARGET="/etc/systemd/system/hama-fastapi.service"
DOCKER_COMPOSE="${DOCKER_COMPOSE:-sudo docker compose}"

if [ ! -f "$PY_DIR/.env" ]; then
  echo "Missing $PY_DIR/.env"
  echo "Create it from .env.example and fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

cd "$PY_DIR"

python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

$DOCKER_COMPOSE -f "$BACKEND_DIR/opensearch/docker-compose.yml" up -d

for attempt in {1..40}; do
  if curl -fsS "${HAMA_OPENSEARCH_URL:-http://localhost:9200}" >/dev/null; then
    break
  fi
  echo "Waiting for OpenSearch... ($attempt/40)"
  sleep 3
done

PYTHONPATH="$BACKEND_DIR:$PY_DIR" .venv/bin/python -m opensearch.sync_from_supabase --recreate

sudo cp "$SERVICE_SOURCE" "$SERVICE_TARGET"
sudo systemctl daemon-reload
sudo systemctl enable hama-fastapi
sudo systemctl restart hama-fastapi

echo "FastAPI status:"
systemctl --no-pager --full status hama-fastapi || true

echo "Health check:"
curl -s http://localhost:8000/api/health
echo
