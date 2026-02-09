# Solana Idle

A wallet-native idle game for Solana Mobile.

Send your character on timed missions, wait real time, claim results, upgrade, repeat. Your wallet is your identity and your ownership layer.

## Quick Start

```bash
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:5173`, API on `http://localhost:3000`.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend:** Hono + SQLite
- **Wallet:** ConnectorKit (@solana/connector)
- **Target:** Solana Mobile (Seeker) via PWA → APK

## Documentation

- [Project Brief](docs/PROJECT_BRIEF.md) — vision, goals, hackathon positioning
- [Tech Stack](docs/TECH_STACK.md) — stack decisions and rationale
- [Game Design](docs/GAME_DESIGN.md) — core loop, missions, economy
- [API Reference](docs/API.md) — backend endpoints

## License

MIT
