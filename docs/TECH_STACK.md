# Tech Stack — Solana Idle

## Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 19 + Vite + TypeScript | Fast build, instant HMR, modern DX |
| UI | Tailwind CSS + shadcn/ui | Polished UI fast, zero-dependency components |
| Wallet | @solana/wallet-adapter-react + MWA v2 | Standard Solana wallet integration + mobile support |
| Backend | Hono (TypeScript, Node.js) | Ultra-light, fast, shares types with frontend |
| Database | SQLite (better-sqlite3) | Zero config, embedded, perfect for MVP |
| Shared | TypeScript package (`@solanaidle/shared`) | Single source of truth for types |
| Monorepo | pnpm workspaces | Simple, fast, no extra tooling |
| On-Chain | Anchor 0.32.1 (Solana programs) | VRF + Ephemeral Rollups via MagicBlock |
| NFTs | Metaplex Core (`@metaplex-foundation/mpl-core`) | Relic drops + achievement badges as Core assets |
| DeFi | Jupiter API | In-game quest system (price, swap, portfolio) |
| Mobile | PWA → Bubblewrap → APK | Officially supported Solana dApp Store path |

## Solana Integration Stack

Four hackathon tracks are integrated:

### 1. Solana Mobile
- PWA with Mobile Wallet Adapter v2 for Seeker
- Bubblewrap wraps PWA into APK for dApp Store submission
- Browser wallets (Phantom, etc.) self-register via Wallet Standard
- MWA adapter: `createDefaultAddressSelector`, `createDefaultAuthorizationResultCache`, `createDefaultWalletNotFoundHandler`

### 2. MagicBlock
- **VRF** — Verifiable random epoch bonus rolls (1x per week at finalization)
- **Ephemeral Rollups** — Zero-fee on-chain progress tracking (every mission claim)
- Both bundled into existing wallet signatures — zero extra popups
- On-chain programs: `vrf-roller` + `progress-tracker` (Anchor)
- See [MAGICBLOCK.md](./MAGICBLOCK.md)

### 3. Metaplex Core
- **Umi framework** with `@metaplex-foundation/umi-bundle-defaults`
- **Core assets** with Attributes plugin for on-chain game data
- Two collections: "Solana Idle: Relics" and "Solana Idle: Achievements"
- Server-side minting (keypair as update authority + payer)
- Zero player signatures for NFT minting
- See [METAPLEX.md](./METAPLEX.md)

### 4. Jupiter
- Jupiter API for real-time token data (prices, portfolio, PnL)
- In-game quest system with daily/weekly challenges
- Quests reward game resources + temporary boosts
- No Jupiter SDK dependency — direct API calls from backend

## Architecture

```
apps/
  web/           → React SPA (Vite, Tailwind, shadcn/ui)
  api/           → Hono REST API (Node.js, SQLite)

packages/
  shared/        → TypeScript types shared between FE and BE

programs/
  vrf-roller/    → MagicBlock VRF on-chain program (Anchor)
  progress-tracker/ → Ephemeral Rollups progress PDA (Anchor)
```

## Key Dependencies

### Backend (`apps/api`)
| Package | Purpose |
|---------|---------|
| `hono` | HTTP framework |
| `better-sqlite3` | SQLite database |
| `@solana/web3.js` | Solana RPC + transaction building |
| `@metaplex-foundation/umi` | Metaplex Umi framework |
| `@metaplex-foundation/mpl-core` | Core NFT minting |
| `jsonwebtoken` | JWT auth tokens |
| `tweetnacl` | Signature verification |
| `bs58` | Base58 encoding |

### Frontend (`apps/web`)
| Package | Purpose |
|---------|---------|
| `react` 19 | UI framework |
| `@solana/wallet-adapter-react` | Wallet connection |
| `@solana-mobile/wallet-adapter-mobile` | MWA v2 for Seeker |
| `lucide-react` | Icons |
| `tailwindcss` | Styling |

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

### Why Metaplex Core over Token Metadata?
- Simpler API — single account per asset (no associated token accounts)
- Attributes plugin stores game data directly on-chain
- Lower rent costs than traditional NFTs
- Collection-level authority management
- Server can mint to any wallet without player signatures

### Why Server-Side Minting?
- Zero UX friction — player just plays, NFTs appear in wallet
- Server keypair as update authority maintains control
- Graceful degradation — game works even if minting fails
- No wallet popup fatigue for mobile idle game

### Why Jupiter API (not SDK)?
- Direct HTTP calls are simpler than SDK integration
- Only need price/portfolio data, not full swap routing
- Backend proxies requests — no CORS issues
- Quest system validates server-side — can't be faked

## Deployment Strategy

- **Frontend:** Vercel (static PWA)
- **Backend:** Railway or Render (Node.js)
- **Database:** SQLite file on backend server (`apps/api/data/game.db`)
- **On-chain programs:** Solana devnet (Anchor)
- **ER Validator:** MagicBlock devnet-us
- **NFT collections:** Solana devnet (Metaplex Core)
- **Mint keypair:** `MINT_KEYPAIR` env var or auto-generated to `apps/api/data/mint-keypair.json`
