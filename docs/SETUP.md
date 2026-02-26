# Setup Guide

How to get Seeker Node running locally, configure the server keypair, and deploy on-chain programs.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 20 | [nodejs.org](https://nodejs.org) |
| pnpm | >= 8 | `npm install -g pnpm` |
| Expo / Android | Expo SDK 53 runtime | Seeker device or Android emulator |
| Rust | 1.85+ | [rustup.rs](https://rustup.rs) |
| Solana CLI | 2.3+ | `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"` |
| Anchor | 0.32.1 | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1` |

Rust, Solana CLI, and Anchor are only needed if you're deploying or modifying the on-chain programs.

## Quick Start

```bash
pnpm install
pnpm dev
```

This starts web (`http://localhost:5173`) and API (`http://localhost:3000`).
For the Android Expo app, run mobile separately:

```bash
pnpm --filter @solanaidle/mobile start
pnpm --filter @solanaidle/mobile android
```

To run services separately:

```bash
pnpm --filter @solanaidle/web dev   # web client only
pnpm --filter @solanaidle/api dev   # backend only
pnpm --filter @solanaidle/mobile start   # Expo dev server
```

## Mobile (Expo RN) Networking

Mobile API base is resolved in this order:
1. `EXPO_PUBLIC_API_URL` (explicit override)
2. Expo host IP auto-detection (`http://<host>:3000/api`)
3. Fallback `http://localhost:3000/api`

For physical Seeker/Android device, explicitly set:

```bash
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3000/api pnpm --filter @solanaidle/mobile start
```

If you see `TypeError: Network request failed` during wallet auth, the app cannot reach API from the device. Use your LAN IP (not `localhost`) and ensure API is running (`pnpm --filter @solanaidle/api dev`) on the same network.

## Environment Variables

The API reads from `apps/api/.env` (gitignored). Create it:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVER_KEYPAIR` | Yes | JSON byte array of the Solana keypair used for on-chain writes |
| `SOLANA_RPC_URL` | No | Defaults to `https://api.devnet.solana.com` |
| `ER_VALIDATOR_URL` | No | Defaults to `https://devnet-us.magicblock.app` |
| `ER_ROUTER_URL` | No | Defaults to `https://devnet-router.magicblock.app` |
| `JWT_SECRET` | No | Auto-generated if not set |

### Server Keypair

The server keypair is the **sole authority** for writing to on-chain PDAs. Both the progress-tracker and boss-tracker programs enforce `has_one = authority` — only the keypair that initialized a PDA can update it.

**Option A: Use your deploy wallet** (recommended for dev)

```bash
# Your deploy wallet is at ~/.config/solana/solana-idle.json
# Copy the byte array into .env:
echo "SERVER_KEYPAIR=$(cat ~/.config/solana/solana-idle.json)" >> apps/api/.env
```

**Option B: Generate a new keypair**

```bash
solana-keygen new --outfile ~/.config/solana/server-keypair.json --no-bip39-passphrase
echo "SERVER_KEYPAIR=$(cat ~/.config/solana/server-keypair.json)" >> apps/api/.env
```

Then fund it on devnet:

```bash
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/server-keypair.json) --url devnet
```

If no `SERVER_KEYPAIR` is set, the API generates an ephemeral keypair at startup (logged to console). This works for testing but PDAs won't persist across restarts.

## Database

SQLite database is auto-created at `apps/api/data/game.db` on first run. No setup needed.

To reset: delete the file and restart the API.

## On-Chain Programs

Three Anchor programs live in `programs/`. They're already deployed to devnet — you only need to redeploy if you modify them.

| Program | ID | Purpose |
|---------|----|---------|
| `progress-tracker` | `8umphbZnJMMVNqR5QnaMurNCf6TcpbgQV5CWKKbChzcL` | Per-player progress PDA |
| `boss-tracker` | `AeMcgM2YYj4fFrMGEUvPeS3YcHiaDaUeSXYXjz5382up` | Global boss HP PDA |
| `vrf-roller` | See `programs/vrf-roller/src/lib.rs` | VRF randomness |

### Building Programs

```bash
# Build all programs
anchor build

# Note: `anchor build -p <name>` may fail with overflow-checks quirk on 0.32.1
# Use `anchor build` (all programs) as a workaround
```

### Deploying Programs

```bash
# Set your deploy wallet
solana config set --keypair ~/.config/solana/solana-idle.json
solana config set --url devnet

# Deploy (costs ~3 SOL per program)
anchor deploy -p progress-tracker --provider.cluster devnet
anchor deploy -p boss-tracker --provider.cluster devnet
```

After deploying, update the program ID in:
- `programs/<name>/src/lib.rs` (`declare_id!`)
- `apps/api/src/services/er-service.ts` or `boss-er-service.ts`
- Any frontend hooks that reference the program ID

### Verifying ER State

A verification script reads live PDA data from the ER:

```bash
# Boss PDA only
pnpm --filter @solanaidle/api exec tsx ../../scripts/verify-er.ts

# Boss + specific player's progress
pnpm --filter @solanaidle/api exec tsx ../../scripts/verify-er.ts <PLAYER_WALLET_ADDRESS>
```

Output shows delegation status, ER endpoint, and decoded on-chain data (HP, damage, score, etc.).

## Project Structure

```
apps/
  mobile/                 → Expo React Native Android app (primary Seeker client)
    app/                  → Expo Router routes
    features/             → Mobile gameplay UI modules
    hooks/                → Mobile hooks (auth, boss, VRF, missions)
  web/                    → React SPA (Vite + Tailwind + shadcn/ui)
    src/
      components/         → Reusable UI components
      features/           → Feature modules (game/, wallet/, inventory/)
      hooks/              → Custom React hooks
  api/                    → Hono REST API
    src/
      routes/             → API route handlers (one file per resource)
      services/           → Game logic, ER services, boss service
    data/                 → SQLite database (gitignored)
    .env                  → Environment variables (gitignored)

packages/
  shared/                 → TypeScript types (@solanaidle/shared)

programs/
  progress-tracker/       → Anchor: player progress ER
  boss-tracker/           → Anchor: boss HP ER
  vrf-roller/             → Anchor: VRF randomness

scripts/
  verify-er.ts            → ER PDA verification tool
```
