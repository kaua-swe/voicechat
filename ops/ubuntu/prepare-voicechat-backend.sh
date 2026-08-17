#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/voicechat"
BACKEND_DIR="$APP_DIR/backend"
ENV_DIR="/etc/voicechat"
LOG_DIR="/var/log/voicechat"
ACME_DIR="/var/www/voicechat-acme"
SSL_DIR="/etc/ssl/voicechat"
SERVICE_USER="voicechat"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Repository must be cloned to $APP_DIR before running this script." >&2
  exit 1
fi

sudo id -u "$SERVICE_USER" >/dev/null 2>&1 || sudo useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
sudo mkdir -p "$ENV_DIR" "$LOG_DIR" "$ACME_DIR" "$SSL_DIR"
sudo chown "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"
sudo chmod 0750 "$ENV_DIR" "$SSL_DIR"

corepack pnpm install --frozen-lockfile
corepack pnpm backend:build
corepack pnpm backend:test

if [[ ! -f "$ENV_DIR/backend.env" ]]; then
  echo "Create $ENV_DIR/backend.env from ops/env/backend.env.example with real server-only values." >&2
  exit 2
fi

sudo install -m 0644 "$APP_DIR/ops/systemd/voicechat-backend.service" /etc/systemd/system/voicechat-backend.service
sudo systemctl daemon-reload
sudo systemctl enable voicechat-backend.service
sudo systemctl restart voicechat-backend.service
sudo systemctl --no-pager --full status voicechat-backend.service

echo "Backend service prepared. Configure hostname-specific TLS/proxy only after origin certificate files exist."
