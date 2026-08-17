#!/usr/bin/env bash
set -euo pipefail

ENV_DIR="/etc/voicechat"
ENV_FILE="$ENV_DIR/backend.env"
TOKENS_DIR="$ENV_DIR/client-tokens"
LABEL="${1:-desktop-user}"

if [[ ! "$LABEL" =~ ^[a-zA-Z0-9_-]{1,48}$ ]]; then
  echo "Invalid token label." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Backend env file not found." >&2
  exit 1
fi

sudo mkdir -p "$TOKENS_DIR"
sudo chmod 0700 "$TOKENS_DIR"

token="$(openssl rand -base64 48 | tr -d '\n')"
token_hash="$(printf '%s' "$token" | sha256sum | awk '{print $1}')"
token_file="$TOKENS_DIR/$LABEL.token"

sudo install -m 0600 /dev/null "$token_file"
printf '%s\n' "$token" | sudo tee "$token_file" >/dev/null
sudo chown root:root "$token_file"

if sudo grep -q '^VOICECHAT_AUTH_TOKEN_SHA256_LIST=' "$ENV_FILE"; then
  current="$(sudo awk -F= '/^VOICECHAT_AUTH_TOKEN_SHA256_LIST=/{print $2}' "$ENV_FILE" | tail -n1)"
  if [[ -n "$current" ]]; then
    next="$current,$token_hash"
  else
    next="$token_hash"
  fi
  sudo sed -i "s/^VOICECHAT_AUTH_TOKEN_SHA256_LIST=.*/VOICECHAT_AUTH_TOKEN_SHA256_LIST=$next/" "$ENV_FILE"
else
  printf '\nVOICECHAT_AUTH_TOKEN_SHA256_LIST=%s\n' "$token_hash" | sudo tee -a "$ENV_FILE" >/dev/null
fi

sudo chown root:ubuntu "$ENV_FILE"
sudo chmod 0640 "$ENV_FILE"

docker compose -f /home/ubuntu/voicechat/ops/docker/docker-compose.voicechat.yml up -d voicechat-backend

echo "Client token provisioned. Retrieve it from the protected server token file only through an approved secure channel."
