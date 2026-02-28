# CLAUDE.md — Solana Idle Game

## Project Overview

Wallet-native idle/mission-based game for Solana Mobile (Seeker).
Player sends a character on timed missions (7h/12h/24h/48h), waits real time, claims results, upgrades, repeats.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Mobile client:** Expo SDK 53 + React Native + Expo Router (`apps/mobile`)
- **Web client:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui (`apps/web`)
- **Backend:** Hono (TypeScript) on Node.js (`apps/api`)
- **Database:** SQLite via better-sqlite3
- **Wallet:** `@wallet-ui/react-native-web3js` + Mobile Wallet Adapter v2 (mobile), `@solana/wallet-adapter-react` (web)
- **Shared types:** `packages/shared`
- **Target:** Android app for Seeker / Solana Mobile ecosystem + web companion

## Architecture

```
apps/mobile      → Expo React Native app, primary Seeker client
apps/web         → React SPA, companion client
apps/api         → Hono REST API, manages game state + timers
packages/shared  → TypeScript types shared between FE and BE
programs/solanaidle → Unified Anchor program: progress tracker + boss HP + VRF on MagicBlock ER
```

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Run web + backend in dev mode
pnpm --filter @solanaidle/mobile start   # Expo mobile dev server
pnpm --filter @solanaidle/mobile android # Run on Android
pnpm --filter @solanaidle/web dev # Web client only
pnpm --filter @solanaidle/api dev # Backend only
pnpm build            # Build all packages
```

## Code Conventions

- TypeScript strict mode everywhere
- Shared types in `packages/shared/src/types.ts` — import from `@solanaidle/shared`
- API routes go in `apps/api/src/routes/` — one file per resource
- Game logic (timers, RNG, mission resolution) in `apps/api/src/services/`
- Wallet name resolution in `apps/api/src/services/name-service.ts` — resolves `.sol` (Bonfida SNS) and `.skr` (AllDomains) against mainnet, 24h in-memory cache, exposed via `batchResolve()`
- Mobile routes in `apps/mobile/app/`, mobile features in `apps/mobile/features/`, mobile hooks in `apps/mobile/hooks/`
- Web components in `apps/web/src/components/`
- Web feature code in `apps/web/src/features/{game,wallet,inventory}/`
- Web hooks in `apps/web/src/hooks/`
- Use shadcn/ui components — don't hand-build standard UI elements
- Tailwind for all styling, no CSS modules

## Game Design Principles

- Time is the core resource — all missions use server-side timers
- No pay-to-win, no infinite farming
- Wallet = identity (signMessage auth) + ownership (claim rewards)
- MVP: off-chain progression, optional on-chain NFT claims for rare events
- Server authoritative: all timers, RNG, and state validation happen server-side

## MVP Scope

**In scope:** wallet sign-in, 1 character, 3 mission types, server timers, success/fail + rewards, resource inventory, 1 upgrade type, claim flow, basic UI
**Out of scope:** marketplace, PVP, trading, tokenomics, fully on-chain gameplay

## File Naming

- Components: PascalCase (`MissionCard.tsx`)
- Hooks: camelCase with `use` prefix (`useMission.ts`)
- Routes: kebab-case (`mission-routes.ts`)
- Services: kebab-case (`mission-service.ts`)
- Types: PascalCase for type names, camelCase for fields

## Testing

- Backend: vitest for unit tests on services
- Frontend: vitest + testing-library for component tests
- No E2E in MVP — manual testing is fine

## On-Chain Program (MagicBlock Ephemeral Rollups)

Single unified Anchor program `solanaidle` with three PDA types:

| PDA | Seed | Lifecycle | Purpose |
|-----|------|-----------|---------|
| `PlayerProgress` | `[b"progress", player, week_start]` | Per-player, per-epoch | Player score/missions/deaths mirror |
| `VrfResult` | `[b"vrf_result", player]` | On-demand | Verifiable randomness for epoch bonuses |
| `BossState` | `[b"boss", week_start]` | One global, per-weekend | Real-time boss HP via websocket |

**Deployed:** `2bDsZj9EiF81YYqQbXhxU8rQ6HAqRfTQXJH4BT5qHFtK` (devnet) — upgrade authority `./keys/dev.json`

**Server-authority pattern:** The API server holds a keypair (`SERVER_KEYPAIR` env var) that is the sole writer for ER updates. Players never sign damage transactions.

**Boss HP data flow:**
- Boss spawn → `initializeBossOnChain` (base layer init + delegate to ER)
- Passive damage tick / OVERLOAD → `applyDamageOnER` (free tx on ER, delta-based)
- Boss killed / weekend ends → `finalizeBossOnChain` (commit + undelegate to base layer)
- Frontend subscribes to one PDA via websocket → instant HP updates across all clients
- SQLite remains source of truth for participant details; ER is for real-time HP broadcast

**Key services:**
- `apps/api/src/services/er-service.ts` — Player progress ER operations
- `apps/api/src/services/boss-er-service.ts` — Boss HP ER operations
- `apps/web/src/hooks/useBossER.ts` + `apps/mobile/hooks/use-boss-er.ts` — websocket subscription to boss PDA

**Resilience:** All ER calls are wrapped in try/catch. If ER is unavailable, the game continues via SQLite with 30s HTTP polling fallback.

## Important Notes

- All timers are SERVER-side (prevent client manipulation)
- RNG is server-side (can upgrade to commit-reveal later)
- Mobile auth uses Wallet UI RN (`useMobileWallet`) and MWA `signMessage` + backend nonce verify
- Web wallet flow remains wallet-adapter based
- For physical Android/Seeker testing, set `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3000/api` for API reachability
- SQLite DB file lives at `apps/api/data/game.db` (gitignored)
- Anchor programs live in `programs/` — build with `anchor build`, deploy with `anchor deploy`
- Program IDs in `boss-tracker` are placeholder until first deploy — update in both `lib.rs` and `boss-er-service.ts`
