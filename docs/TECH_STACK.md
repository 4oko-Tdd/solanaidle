# Tech Stack — Solana Idle

## Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 19 + Vite + TypeScript | Fast build, instant HMR, modern DX |
| UI | Tailwind CSS + shadcn/ui | Polished UI fast, zero-dependency components |
| Wallet | @solana/wallet-adapter-react + MWA | Standard Solana wallet integration + mobile support |
| Backend | Hono (TypeScript, Node.js) | Ultra-light, fast, shares types with frontend |
| Database | SQLite (better-sqlite3) | Zero config, embedded, perfect for MVP |
| Shared | TypeScript package | Single source of truth for types |
| Monorepo | pnpm workspaces | Simple, fast, no extra tooling |
| On-Chain | Anchor 0.32.1 (Solana programs) | VRF + Ephemeral Rollups via MagicBlock |
| Mobile | PWA → Bubblewrap → APK | Officially supported Solana dApp Store path |

## MagicBlock Integration

We use two MagicBlock products for on-chain game mechanics:

| Product | Purpose | Frequency |
|---------|---------|-----------|
| **VRF** | Verifiable random epoch bonus rolls | 1x per week |
| **Ephemeral Rollups** | Zero-fee on-chain progress tracking | Every mission |

Both are integrated with **zero extra wallet signatures** — delegation and VRF are bundled into existing epoch start/end transactions. See [MAGICBLOCK.md](./MAGICBLOCK.md) for full details.

## Decision Log

### Why PWA over React Native?
- Text-based idle game doesn't need native APIs
- PWA → APK is officially supported by Solana dApp Store
- Faster development, one codebase
- No Android build toolchain needed during hackathon

### Why Hono over Express/Fastify?
- Ultra-lightweight (~14KB)
- First-class TypeScript support
- Web-standard Request/Response API
- Easy to deploy anywhere (Node, Bun, Deno, Cloudflare)

### Why SQLite over Postgres?
- Zero configuration — just a file
- No separate database server to run
- Fast enough for single-server MVP
- Easy to upgrade to Postgres later if needed

### Why @solana/wallet-adapter-react?
- Standard wallet integration used by most Solana dApps
- Mobile Wallet Adapter (MWA) v2 for Solana Mobile / Seeker
- Browser wallets (Phantom, etc.) self-register via Wallet Standard
- Well-documented, battle-tested

### Why Anchor for on-chain programs?
- Standard framework for Solana programs
- Required by MagicBlock SDKs (VRF + ER)
- IDL generation for frontend/backend integration
- Macro-based account validation

### Why shadcn/ui?
- Copy-paste components (not a dependency)
- Cards, progress bars, buttons, dialogs — all needed for game UI
- Sits on Tailwind — no extra styling system
- Full control over component code

## Deployment Strategy

- Frontend: Vercel (static PWA)
- Backend: Railway or Render (Node.js)
- Database: SQLite file on backend server
- On-chain: Solana devnet (Anchor programs)
- ER Validator: MagicBlock devnet-us
