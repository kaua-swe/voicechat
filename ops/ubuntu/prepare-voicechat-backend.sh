#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/voicechat"
ENV_DIR="/etc/voicechat"
LOG_DIR="/var/log/voicechat"
ACME_DIR="/var/www/voicechat-acme"
SSL_DIR="/etc/ssl/voicechat"
SERVICE_USER="voicechat"
TOKEN_FILE="$ENV_DIR/bootstrap-token.txt"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Repository must be cloned to $APP_DIR before running this script." >&2
  exit 1
fi

sudo mkdir -p "$ENV_DIR" "$LOG_DIR" "$ACME_DIR" "$SSL_DIR"
sudo chmod 0750 "$ENV_DIR" "$SSL_DIR" "$LOG_DIR"
sudo chown root:ubuntu "$ENV_DIR"

if [[ ! -f "$ENV_DIR/backend.env" ]]; then
  token="$(openssl rand -base64 48 | tr -d '\n')"
  token_hash="$(printf '%s' "$token" | sha256sum | awk '{print $1}')"
  sudo install -m 0600 /dev/null "$TOKEN_FILE"
  printf '%s\n' "$token" | sudo tee "$TOKEN_FILE" >/dev/null
  sudo install -m 0640 ops/env/backend.env.example "$ENV_DIR/backend.env"
  sudo sed -i "s/^VOICECHAT_AUTH_TOKEN_SHA256=.*/VOICECHAT_AUTH_TOKEN_SHA256=$token_hash/" "$ENV_DIR/backend.env"
  sudo chown root:ubuntu "$ENV_DIR/backend.env"
fi

docker compose -f ops/docker/docker-compose.voicechat.yml build
docker compose -f ops/docker/docker-compose.voicechat.yml up -d

docker compose -f ops/docker/docker-compose.voicechat.yml ps

echo "Backend container prepared on loopback. Configure hostname-specific proxy/TLS separately."
