# Solana Idle -- Project Brief

**Solana Mobile Seeker Hackathon Submission**

---

## What Is Solana Idle?

Solana Idle is a wallet-native idle game built for Solana Mobile. You are a **node operator** in a decentralized cyberpunk world -- running missions, scavenging resources, upgrading gear, and climbing the weekly leaderboard. Every action is server-authoritative. Your wallet is your identity and your claim to ownership.

This is not DeFi. Not P2E. Not a casino. It is a game designed to create daily habits around Solana Mobile usage, with deep integrations across four hackathon tracks: **Solana Mobile, MagicBlock, Metaplex Core, and Jupiter**.

---

## The Game

### Weekly Epoch System

Each week is an **epoch**. At the start of an epoch, the player picks a class and receives 3 lives. The goal: run missions, survive, accumulate score, and finalize the epoch for rewards before the week resets.

### Three Classes

| Class | Specialty |
|---|---|
| **Validator** | Speed -- faster mission completion |
| **Staker** | Defense -- reduced failure chance |
| **Oracle** | Rare loot -- higher drop rates |

Each class has a **3-tier skill tree** that unlocks as the player progresses, adding permanent and temporary bonuses that shape playstyle.

### Mission Tiers

| Tier | Codename | Description |
|---|---|---|
| Quick Swap | Scout | Short, low-risk reconnaissance |
| Liquidity Run | Expedition | Medium duration, balanced risk/reward |
| Deep Farm | Deep Dive | Long, high-resource missions |
| Protocol Raid | Boss | Sunday-only endgame event (level 10+) |

All missions use **real-time server-side timers**. You send your operator out, wait, come back, and claim the result. Success or failure is determined server-side with no client manipulation possible.

### Resources

Three off-chain, server-authoritative resources drive progression:

- **Lamports** (scrap) -- common currency for upgrades
- **Tokens** (crystal) -- mid-tier resource for advanced gear
- **Keys** (artifact) -- rare resource for endgame content

### Gear Upgrades (3 Tracks)

| Track | Effect |
|---|---|
| **Armor** | Reduces mission failure chance |
| **Engine** | Increases mission speed |
| **Scanner** | Boosts loot quality and drop rates |

### Loot System

Missions can drop 5 item types, each with tier-based perks:

- RAM Stick
- LAN Cable
- NVMe Fragment
- Cooling Fan
- Validator Key Shard

Higher mission tiers and longer streaks increase the chance of rare drops.

### Streak System

Consecutive mission successes build a **streak multiplier** that amplifies rewards. Fail a mission and the streak resets. This creates a meaningful risk/reward tension: push for harder missions to grow the streak, or play safe to protect it.

### Guilds and Cooperative Raids

Players can form or join **guilds** and participate in cooperative raid events, pooling efforts for shared objectives and exclusive rewards.

### Daily Login Rewards

A 7-day login cycle grants escalating rewards for consecutive daily play, reinforcing the daily habit loop.

---

## Core Engagement Loop

```
Open app
  -> Pick class (weekly)
  -> Run missions
  -> Wait real time
  -> Claim results
  -> Upgrade gear + skills
  -> Repeat
  -> Finalize epoch (weekly)
```

No infinite farming. Time is the core limiter. Decisions have consequences. Lives are finite.

---

## Solana Integrations (4 Hackathon Tracks)

### 1. Solana Mobile

The game is built mobile-first as a **PWA packaged via Bubblewrap into an APK** for the Solana dApp Store. Wallet authentication uses **Mobile Wallet Adapter v2** with `createDefaultAddressSelector`, `createDefaultAuthorizationResultCache`, and `createDefaultWalletNotFoundHandler`. Browser wallets (Phantom, etc.) self-register via Wallet Standard.

Wallet serves three roles:
- **Identity** -- sign-in via signMessage nonce challenge
- **Ownership** -- claim NFT rewards to your wallet
- **Ritual** -- confirm meaningful on-chain actions

### 2. MagicBlock

Two MagicBlock products bring game mechanics on-chain without sacrificing mobile UX:

- **VRF (Verifiable Random Function)** -- Epoch bonus rolls use on-chain VRF for provably fair randomness. When an epoch finalizes, the player signs a transaction, the MagicBlock oracle fulfills it, and the backend reads the PDA to compute bonus rewards (multiplier, loot, or NFT). Results are verifiable on Solana Explorer. Fallback to server-side RNG if VRF is unavailable.
- **Ephemeral Rollups** -- Zero-fee on-chain progress tracking for score, missions completed, and deaths. Game state is checkpointed to Solana without burdening the player with transaction fees or signatures.

### 3. Metaplex Core

Rare achievements and mission drops are minted as **Metaplex Core assets** with the Attributes plugin, directly to the player's wallet with zero player signatures required (server-minted).

Two collections:
- **Solana Idle: Relics** -- Rare mission drop items minted as NFTs
- **Solana Idle: Achievements** -- Badge NFTs for major accomplishments:
  - Boss Slayer
  - Streak Legend
  - Deep Explorer
  - Raid Victor
  - Epoch Champion

### 4. Jupiter

The in-game **Intel tab** integrates Jupiter to create a quest system that bridges idle gameplay with real Solana DeFi data:

**Daily Quests:**
- Price Scout -- check a token price via Jupiter
- Token Scan -- explore token metadata
- Portfolio Check -- review wallet holdings
- PnL Report -- analyze profit and loss

**Weekly Quests:**
- Micro Swap -- execute a small swap through Jupiter
- Prediction Bet -- place a prediction on price movement

**Quest Rewards:** Resources (lamports, tokens, keys) plus temporary boosts (loot chance, speed, XP multiplier).

---

## Anti-Cheat

All game state is **server-authoritative**:

- Timers are server-side -- players cannot accelerate missions
- RNG is server-side -- upgradable to commit-reveal or VRF
- State validation happens on the backend -- no client trust
- Claim requires `now >= end_time` on the server
- Wallet = identity (signMessage auth with JWT) + ownership (on-chain assets)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Hono (TypeScript) on Node.js + SQLite (better-sqlite3) |
| On-Chain | Anchor (Solana programs for VRF + Ephemeral Rollups) |
| NFTs | Metaplex Core (Umi + mpl-core) |
| DeFi | Jupiter API (price, swap, limit orders) |
| Wallet | @solana/wallet-adapter-react + Mobile Wallet Adapter v2 |
| Monorepo | pnpm workspaces |
| Shared Types | @solanaidle/shared workspace package |
| Target | PWA -> Bubblewrap -> APK for Solana dApp Store |

---

## Why This Matters

Solana Mobile needs apps that people open **every day**, not once. Solana Idle creates a daily habit loop where the wallet is not just a login button -- it is a core game mechanic. Every epoch, every mission, every rare drop reinforces the connection between the player and the Solana ecosystem.

Four hackathon tracks. One cohesive game. No bolted-on integrations -- each piece (Mobile Wallet Adapter, MagicBlock VRF, Metaplex Core NFTs, Jupiter quests) serves a real gameplay purpose.

> "A cyberpunk idle game where your Solana wallet is your operator badge, your loot vault, and your proof of legend."

---

## Post-Hackathon Vision

- Publish to the Solana dApp Store
- Seasonal epochs with themed content and leaderboards
- Expanded NFT economy (tradable relics, guild banners)
- Additional on-chain integrations as the ecosystem evolves
- Example of what a non-DeFi, game-first Solana Mobile app looks like
