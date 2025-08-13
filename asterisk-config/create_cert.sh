#!/bin/bash
set -euo pipefail

# Generate Asterisk TLS certs using mkcert (for local dev with trusted certs in browsers)
# Optional: set ASTERISK_CERT_HOSTNAMES to override SANs (space-separated)
# Optional: set CAROOT to control mkcert CA storage (default: /etc/ssl/mkcert)

KEYS_DIR="/etc/asterisk/keys"
CAROOT_DIR="${CAROOT:-/etc/ssl/mkcert}"
DEFAULT_HOSTNAMES=("localhost" "asterisk" "crm.local" "127.0.0.1" "::1")

# Use user-provided hostnames if set, else defaults
if [[ -n "${ASTERISK_CERT_HOSTNAMES:-}" ]]; then
  # shellcheck disable=SC2206
  HOSTNAMES=(${ASTERISK_CERT_HOSTNAMES})
else
  HOSTNAMES=("${DEFAULT_HOSTNAMES[@]}")
fi

mkdir -p "${KEYS_DIR}" "${CAROOT_DIR}"

# Install mkcert if absent
if ! command -v mkcert >/dev/null 2>&1; then
  echo "Installing mkcert..."
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64|amd64) MKCERT_URL="https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64" ;;
    aarch64|arm64) MKCERT_URL="https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
  esac
  curl -L "$MKCERT_URL" -o /usr/local/bin/mkcert
  chmod +x /usr/local/bin/mkcert
fi

# Prepare mkcert CA (won't install into system trust if not available; that's fine in container)
export CAROOT="${CAROOT_DIR}"
# Try to create/install local CA (ignore failures related to system trust stores in slim images)
mkcert -install || true

# Generate cert and key for provided hostnames
CERT_FILE="${KEYS_DIR}/asterisk.pem"
KEY_FILE="${KEYS_DIR}/asterisk.key"

# shellcheck disable=SC2068
mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" ${HOSTNAMES[@]}

# Export root CA so it can be imported into browsers if needed
if [[ -f "${CAROOT_DIR}/rootCA.pem" ]]; then
  cp -f "${CAROOT_DIR}/rootCA.pem" "${KEYS_DIR}/rootCA.pem"
fi

# Set permissions for Asterisk user
if id asterisk >/dev/null 2>&1; then
  chown asterisk:asterisk "$CERT_FILE" "$KEY_FILE" || true
  chown asterisk:asterisk "${KEYS_DIR}/rootCA.pem" || true
fi
chmod 644 "$CERT_FILE" || true
chmod 640 "$KEY_FILE" || true

echo "mkcert certificates generated: $CERT_FILE, $KEY_FILE"
if [[ -f "${KEYS_DIR}/rootCA.pem" ]]; then
  echo "Root CA exported to ${KEYS_DIR}/rootCA.pem. Import it into your OS/browser for WSS trust."
fi
