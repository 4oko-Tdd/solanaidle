# Tech Stack — Solana Idle

## Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 19 + Vite + TypeScript | Fast build, instant HMR, modern DX |
| UI | Tailwind CSS + shadcn/ui | Polished UI fast, zero-dependency components |
| Wallet | @solana/connector (ConnectorKit) | Official Solana Foundation lib, built-in mobile support |
| Backend | Hono (TypeScript, Node.js) | Ultra-light, fast, shares types with frontend |
| Database | SQLite (better-sqlite3) | Zero config, embedded, perfect for MVP |
| Shared | TypeScript package | Single source of truth for types |
| Monorepo | pnpm workspaces | Simple, fast, no extra tooling |
| Mobile | PWA → Bubblewrap → APK | Officially supported Solana dApp Store path |

## Decision Log

### Why PWA over React Native?
- Text-based idle game doesn't need native APIs
- PWA → APK is officially supported by Solana dApp Store
- Faster development, one codebase
- No Android build toolchain needed during hackathon
- React Native adds complexity without benefit here

### Why Hono over Express/Fastify?
- Ultra-lightweight (~14KB)
- First-class TypeScript support
- Web-standard Request/Response API
- Easy to deploy anywhere (Node, Bun, Deno, Cloudflare)
- Simpler API than Express

### Why SQLite over Postgres?
- Zero configuration — just a file
- No separate database server to run
- Fast enough for single-server MVP
- Easy to upgrade to Postgres later if needed
- Works great with better-sqlite3 (sync API, very fast)

### Why ConnectorKit over legacy Wallet Adapter?
- Newest official library from Solana Foundation
- Built-in Mobile Wallet Adapter support (`enableMobile: true`)
- Cleaner hook-based API (`useConnector`, `useAccount`)
- Framework-agnostic core with React bindings
- Wallet Standard protocol support

### Why TypeScript everywhere?
- Shared types between frontend and backend — single source of truth
- Catch errors at compile time
- Better IDE support and autocomplete
- One language = faster context switching during hackathon

### Why shadcn/ui?
- Copy-paste components (not a dependency)
- Cards, progress bars, buttons, dialogs — all needed for game UI
- Sits on Tailwind — no extra styling system
- Looks polished out of the box — important for hackathon judges
- Full control over component code

## Deployment Strategy (Hackathon)

- Frontend: Vercel (static PWA)
- Backend: Railway or Render (Node.js)
- Database: SQLite file on backend server
- Domain: free subdomain from hosting provider

## Future Considerations (Post-Hackathon)

- Migrate SQLite → Postgres for multi-server
- Add Redis for session management
- Consider Bun runtime for backend performance
- Add CDN for static assets
- Evaluate Anchor program for on-chain game state
