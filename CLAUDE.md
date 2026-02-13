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
apps/web     → React SPA, communicates with API
apps/api     → Hono REST API, manages game state + timers
packages/shared → TypeScript types shared between FE and BE
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

## Important Notes

- All timers are SERVER-side (prevent client manipulation)
- RNG is server-side (can upgrade to commit-reveal later)
- Wallet interactions use `useWallet()` from `@solana/wallet-adapter-react`
- Mobile Wallet Adapter (MWA) is provided via `SolanaMobileWalletAdapter` in the wallets array
- Browser wallets (Phantom, etc.) self-register via Wallet Standard — no explicit adapter needed
- SQLite DB file lives at `apps/api/data/game.db` (gitignored)
