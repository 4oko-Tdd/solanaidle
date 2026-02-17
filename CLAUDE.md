# CLAUDE.md — Solana Idle Game

## Project Overview

Wallet-native idle/mission-based game for Solana Mobile (Seeker).
Player sends a character on timed missions (7h/12h/24h/48h), waits real time, claims results, upgrades, repeats.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui (`apps/web`)
- **Backend:** Hono (TypeScript) on Node.js (`apps/api`)
- **Database:** SQLite via better-sqlite3
- **Wallet:** @solana/wallet-adapter-react + @solana-mobile/wallet-adapter-mobile (MWA)
- **Shared types:** `packages/shared`
- **Target:** PWA → Bubblewrap → APK for Solana dApp Store

## Architecture

```
apps/web              → React SPA, communicates with API
apps/api              → Hono REST API, manages game state + timers
packages/shared       → TypeScript types shared between FE and BE
programs/progress-tracker → Anchor program: per-player-per-epoch progress PDA on MagicBlock ER
programs/vrf-roller       → Anchor program: VRF randomness via MagicBlock
programs/boss-tracker     → Anchor program: global boss HP PDA on MagicBlock ER (one per week)
```

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Run both frontend + backend in dev mode
pnpm --filter web dev # Frontend only
pnpm --filter api dev # Backend only
pnpm build            # Build all packages
```

## Code Conventions

- TypeScript strict mode everywhere
- Shared types in `packages/shared/src/types.ts` — import from `@solanaidle/shared`
- API routes go in `apps/api/src/routes/` — one file per resource
- Game logic (timers, RNG, mission resolution) in `apps/api/src/services/`
- React components in `apps/web/src/components/`
- Feature-specific code in `apps/web/src/features/{game,wallet,inventory}/`
- Custom hooks in `apps/web/src/hooks/`
- Use shadcn/ui components — don't hand-build standard UI elements
- Tailwind for all styling, no CSS modules

## Game Design Principles

- Time is the core resource — all missions use server-side timers
- No pay-to-win, no infinite farming
- Wallet = identity (signMessage auth) + ownership (claim rewards)
- MVP: off-chain progression, optional on-chain NFT claims for rare events
- Server authoritative: all timers, RNG, and state validation happen server-side

## MVP Scope (Hackathon)

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

## On-Chain Programs (MagicBlock Ephemeral Rollups)

Three separate Anchor programs, each with a distinct PDA lifecycle:

| Program | PDA Seed | Lifecycle | Purpose |
|---------|----------|-----------|---------|
| `progress-tracker` | `[b"progress", player, week_start]` | Per-player, per-epoch | Player score/missions/deaths mirror |
| `vrf-roller` | — | On-demand | Verifiable randomness for epoch bonuses |
| `boss-tracker` | `[b"boss", week_start]` | One global, per-weekend | Real-time boss HP via websocket |

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
- `apps/web/src/hooks/useBossER.ts` — Websocket subscription to boss PDA

**Resilience:** All ER calls are wrapped in try/catch. If ER is unavailable, the game continues via SQLite with 30s HTTP polling fallback.

## Important Notes

- All timers are SERVER-side (prevent client manipulation)
- RNG is server-side (can upgrade to commit-reveal later)
- Wallet interactions use `useWallet()` from `@solana/wallet-adapter-react`
- Mobile Wallet Adapter (MWA) is provided via `SolanaMobileWalletAdapter` in the wallets array
- Browser wallets (Phantom, etc.) self-register via Wallet Standard — no explicit adapter needed
- SQLite DB file lives at `apps/api/data/game.db` (gitignored)
- Anchor programs live in `programs/` — build with `anchor build`, deploy with `anchor deploy`
- Program IDs in `boss-tracker` are placeholder until first deploy — update in both `lib.rs` and `boss-er-service.ts`
