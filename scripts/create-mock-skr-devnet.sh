#!/usr/bin/env bash
set -euo pipefail

# Creates a mock SKR SPL token mint on devnet and prints env vars
# for API + mobile app configuration.
#
# Requirements:
# - solana CLI configured for devnet
# - spl-token CLI installed
#
# Usage:
#   bash scripts/create-mock-skr-devnet.sh
#   SKR_INITIAL_SUPPLY=500000 bash scripts/create-mock-skr-devnet.sh

if ! command -v solana >/dev/null 2>&1; then
  echo "[SKR] Missing 'solana' CLI. Install from https://solana.com/docs/intro/installation"
  exit 1
fi

if ! command -v spl-token >/dev/null 2>&1; then
  echo "[SKR] Missing 'spl-token' CLI. Install with: solana-install init <version> (or cargo install spl-token-cli)"
  exit 1
fi

if ! SPL_VERSION="$(spl-token --version 2>&1)"; then
  echo "[SKR] 'spl-token' failed to start."
  echo "$SPL_VERSION"
  echo
  echo "If you see libssl/libcrypto errors on Apple Silicon:"
  echo "  1) /opt/homebrew/bin/brew install openssl@3"
  echo "  2) ensure /opt/homebrew/opt/openssl@3/lib/libssl.3.dylib exists"
  exit 1
fi

NETWORK="${SKR_NETWORK:-devnet}"
DECIMALS="${SKR_TOKEN_DECIMALS:-9}"
INITIAL_SUPPLY="${SKR_INITIAL_SUPPLY:-1000000}"
FEE_PAYER_KEYPAIR="${SKR_FEE_PAYER:-$(solana config get 2>/dev/null | awk -F': ' '/Keypair Path:/ {print $2}')}"
if [ -z "${FEE_PAYER_KEYPAIR}" ] || [ ! -f "${FEE_PAYER_KEYPAIR}" ]; then
  echo "[SKR] No valid fee payer keypair configured."
  echo "Set one of:"
  echo "  1) solana config set --keypair ~/.config/solana/id.json"
  echo "  2) SKR_FEE_PAYER=~/.config/solana/id.json bash scripts/create-mock-skr-devnet.sh"
  exit 1
fi

TREASURY_WALLET="${SKR_TREASURY_WALLET:-$(solana address -k "${FEE_PAYER_KEYPAIR}")}"

echo "[SKR] Creating ${NETWORK} mint (decimals=${DECIMALS})..."
MINT_ADDRESS="$(
  spl-token create-token \
    --decimals "${DECIMALS}" \
    --fee-payer "${FEE_PAYER_KEYPAIR}" \
    --mint-authority "${FEE_PAYER_KEYPAIR}" \
    --url "${NETWORK}" | awk '/Address:/ {print $2}'
)"

echo "[SKR] Ensuring treasury ATA for ${TREASURY_WALLET}..."
spl-token create-account "${MINT_ADDRESS}" \
  --owner "${TREASURY_WALLET}" \
  --fee-payer "${FEE_PAYER_KEYPAIR}" \
  --url "${NETWORK}" >/dev/null 2>&1 || true
TREASURY_ATA="$(
  ADDRESS_OUTPUT="$(
    spl-token address \
      --verbose \
      --token "${MINT_ADDRESS}" \
      --owner "${TREASURY_WALLET}" \
      --url "${NETWORK}"
  )"
  awk -F': ' '
    /Associated token address/ { print $2; found=1 }
    /Associated Token Address/ { print $2; found=1 }
    /Address:/ { addr=$2 }
    END { if (!found && addr != "") print addr }
  ' <<< "${ADDRESS_OUTPUT}" | tail -n 1
)"
if [ -z "${TREASURY_ATA}" ]; then
  echo "[SKR] Failed to derive treasury associated token account."
  exit 1
fi

echo "[SKR] Minting ${INITIAL_SUPPLY} SKR to treasury ATA..."
spl-token mint "${MINT_ADDRESS}" "${INITIAL_SUPPLY}" "${TREASURY_ATA}" \
  --mint-authority "${FEE_PAYER_KEYPAIR}" \
  --fee-payer "${FEE_PAYER_KEYPAIR}" \
  --url "${NETWORK}" >/dev/null

cat <<EOF

[SKR] Mock token created.

# apps/api/.env
SKR_MINT_ADDRESS=${MINT_ADDRESS}
SKR_TREASURY_WALLET=${TREASURY_WALLET}
SKR_TOKEN_DECIMALS=${DECIMALS}

# apps/mobile/.env
EXPO_PUBLIC_SKR_MINT_ADDRESS=${MINT_ADDRESS}
EXPO_PUBLIC_SKR_TREASURY_WALLET=${TREASURY_WALLET}
EXPO_PUBLIC_SKR_TOKEN_DECIMALS=${DECIMALS}

EOF
