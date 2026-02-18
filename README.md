# Solana Idle

A wallet-native idle/roguelike game built for Solana Mobile (Seeker).

Players are **node operators** in a cyberpunk Solana network — sending characters on timed missions, surviving hazards, upgrading gear, and fighting a weekly world boss. Your wallet is your identity and ownership layer.

## Game Loop

```
Monday 00:00 UTC → New weekly epoch starts
  ├── Pick a class: Scout / Guardian / Mystic
  ├── Run missions: 7h / 12h / 24h / 48h real-time timers
  ├── Earn Scrap (currency) + random loot drops
  ├── Upgrade gear to boost stats
  └── Build streaks for multipliers

Saturday 00:00 UTC → World Boss spawns
  ├── All players deal passive DPS based on their stats
  ├── OVERLOAD: sacrifice inventory for massive burst damage
  └── Boss HP is tracked on-chain via MagicBlock ER (real-time websocket)

Sunday 23:59 UTC → Epoch ends
  ├── VRF bonus roll (provably fair via MagicBlock)
  ├── Leaderboard finalized
  └── On-chain progress committed to Solana base layer
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Hono (TypeScript) + SQLite via better-sqlite3 |
| Wallet | @solana/wallet-adapter-react + Mobile Wallet Adapter (MWA) |
| On-chain | 3 Anchor programs on MagicBlock Ephemeral Rollups |
| Target | PWA → Bubblewrap → APK for Solana dApp Store |

## Monorepo Structure

```
apps/web/               → React SPA (frontend)
apps/api/               → Hono REST API (backend, game logic, timers)
packages/shared/        → TypeScript types shared between FE and BE
programs/progress-tracker/ → Per-player progress PDA on MagicBlock ER
programs/boss-tracker/     → Global boss HP PDA on MagicBlock ER
programs/vrf-roller/       → VRF randomness for epoch bonus rolls
scripts/                → Utility scripts (verify-er.ts, etc.)
```

## Quick Start

```bash
pnpm install
pnpm dev
```

Frontend: `http://localhost:5173` | API: `http://localhost:3000`

See [Setup Guide](docs/SETUP.md) for full environment setup including server keypair and program deployment.

## Documentation

| Doc | What it covers |
|-----|---------------|
| [Setup Guide](docs/SETUP.md) | Prerequisites, env vars, keypair setup, deployment |
| [On-Chain Guide](docs/ONCHAIN.md) | Anchor programs, ER delegation, PDA lifecycle, verification |
| [Game Design](docs/GAME_DESIGN.md) | Core loop, classes, missions, perks, boss mechanics |
| [API Reference](docs/API.md) | All backend endpoints with request/response examples |
| [Project Brief](docs/PROJECT_BRIEF.md) | Vision and game concept |

## Integrations

- **Solana Mobile** — wallet-native PWA targeting Seeker
- **MagicBlock** — VRF for provably fair rewards + ER for real-time on-chain state
- **Metaplex Core** — NFT drops for rare boss loot and achievements
- **Jupiter** — in-game quests that bridge to real DeFi actions

## License

MIT
