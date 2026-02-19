# Seeker Node

> A cyberpunk roguelike idle game where your Solana wallet is your operator badge, your loot vault, and your proof of legend.

Built mobile-first for **Solana Mobile (Seeker)**. Players are node operators running missions across a decentralized network, building power through the week, and rallying with others to take down a **Protocol Leviathan** world boss every weekend.

## Ecosystem Integrations

| Integration | How It's Used |
|-------------|--------------|
| **Solana Mobile + MWA** | Wallet-native PWA → APK for Solana dApp Store. Sign-in via Mobile Wallet Adapter v2. |
| **MagicBlock Ephemeral Rollups** | Two on-chain programs: real-time boss HP broadcast via websocket (boss-tracker), zero-fee player progress checkpointing (progress-tracker). |
| **MagicBlock VRF** | Provably fair epoch bonus rolls — verifiable on-chain randomness for end-of-week rewards. |
| **Metaplex Core** | Server-mints NFT artifacts and achievement badges directly to player wallets (zero player signatures). |
| **Jupiter** | "Intel" tab quests — daily/weekly tasks powered by Jupiter price, token, and swap APIs for in-game resources. |

## Game Loop

```
Monday 00:00 UTC → New weekly epoch starts
  ├── Pick a class: Validator / Staker / Oracle
  ├── Run missions: 7h / 12h / 24h real-time timers
  ├── Earn Scrap (currency) + resources
  ├── Upgrade gear (Armor / Engine / Scanner)
  └── Choose roguelike perks on every level-up

Saturday 00:00 UTC → World Boss spawns
  ├── All missions lock — boss is the only content
  ├── Players deal passive DPS based on their stats
  ├── OVERLOAD: sacrifice all resources for a one-time burst
  └── Boss HP tracked on-chain via MagicBlock ER (real-time websocket across all clients)

Sunday 23:59 UTC → Epoch ends
  ├── Boss killed → drop rolls based on contribution %
  ├── VRF bonus roll (provably fair via MagicBlock)
  ├── Leaderboard finalized + score sealed on-chain
  └── Full reset — only rare loot and achievement NFTs persist
```

No pay-to-win. No infinite farming. Time is the core resource. The boss is why you play. The rare drop is the chase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Hono (TypeScript) + SQLite via better-sqlite3 |
| Wallet | @solana/wallet-adapter-react + Mobile Wallet Adapter v2 |
| On-chain | 3 Anchor programs on MagicBlock Ephemeral Rollups |
| NFTs | Metaplex Core (Umi + mpl-core) |
| DeFi quests | Jupiter API |
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

## License

MIT
