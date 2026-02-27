# Seeker Node

> A cyberpunk roguelike idle game where your Solana wallet is your operator badge, your loot vault, and your proof of legend.

Built mobile-first for **Solana Mobile (Seeker)**. Players are node operators running missions across a decentralized network, building power through the week, and rallying with others to take down a **Protocol Leviathan** world boss every weekend.

## Ecosystem Integrations

| Integration | How It's Used |
|-------------|--------------|
| **Solana Mobile + MWA** | Expo React Native Android client for Seeker devices. Sign-in via Mobile Wallet Adapter v2 + Wallet UI for React Native. |
| **MagicBlock Ephemeral Rollups** | Unified on-chain program: real-time boss HP broadcast via websocket, zero-fee player progress checkpointing. |
| **MagicBlock VRF** | Provably fair epoch bonus rolls — verifiable on-chain randomness for end-of-week rewards. |
| **Metaplex Core** | Server-mints NFT artifacts and achievement badges directly to player wallets (zero player signatures). |

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
| Mobile Client | Expo SDK 53 + React Native + Expo Router + TypeScript |
| Web Client | React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Hono (TypeScript) + SQLite via better-sqlite3 |
| Wallet | @wallet-ui/react-native-web3js + Mobile Wallet Adapter v2 (mobile), @solana/wallet-adapter-react (web) |
| On-chain | 3 Anchor programs on MagicBlock Ephemeral Rollups |
| NFTs | Metaplex Core (Umi + mpl-core) |
| Target | Android app (Seeker / Solana Mobile ecosystem) + web companion |

## Monorepo Structure

```
apps/mobile/        → Expo React Native app (primary Seeker client)
apps/web/           → React SPA (web companion) — deployed on Vercel
apps/api/           → Hono REST API (backend, game logic, timers) — deployed on VPS
packages/shared/    → TypeScript types shared between FE and BE
programs/solanaidle/   → Unified Anchor program: progress + boss HP + VRF on MagicBlock ER
scripts/            → Utility scripts (verify-er.ts, etc.)
```

## Quick Start

```bash
pnpm install
pnpm dev
```

This starts web + API:
- Web: `http://localhost:5173`
- API: `http://localhost:3000`

For Android (Expo mobile app), run separately:

```bash
pnpm --filter @solanaidle/mobile start
pnpm --filter @solanaidle/mobile android
```

If you run on a physical Seeker/Android device, set:
- `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3000/api`
- Keep API running on the same LAN (`pnpm --filter @solanaidle/api dev`)

See [Setup Guide](docs/SETUP.md) for full environment setup including server keypair, devnet SKR mock token setup, and program deployment.

Android action notifications are documented in the Setup Guide (`Android Action Notifications`): mission complete, boss active, epoch finished, and new epoch started.

## Live Deployments

| Service | URL |
|---------|-----|
| Web client | https://solanaidle.vercel.app |
| API | https://solanaidle.findparty.online/api |
| On-chain program | `2bDsZj9EiF81YYqQbXhxU8rQ6HAqRfTQXJH4BT5qHFtK` (devnet) |

API health check: `GET https://solanaidle.findparty.online/api/health`

## Documentation

| Doc | What it covers |
|-----|---------------|
| [Setup Guide](docs/SETUP.md) | Prerequisites, env vars, keypair setup, deployment, Android action notifications |
| [On-Chain Guide](docs/ONCHAIN.md) | Anchor programs, ER delegation, PDA lifecycle, verification |
| [Game Design](docs/GAME_DESIGN.md) | Core loop, classes, missions, perks, boss mechanics |
| [API Reference](docs/API.md) | All backend endpoints with request/response examples |
| [Monetization Plan](docs/MONETIZATION_PLAN.md) | SKR utility actions, pricing, and spend-routing model |
| [Project Brief](docs/PROJECT_BRIEF.md) | Vision and game concept |

## License

MIT
