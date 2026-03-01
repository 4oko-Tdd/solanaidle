# Seeker Node -- Project Brief

## What Is Seeker Node?

Seeker Node is a wallet-native roguelike idle game built for Solana Mobile. You are a **node operator** in a decentralized cyberpunk world -- running missions, building power through the week, and rallying with other players to take down a **Protocol Leviathan** world boss every weekend. The only things that survive the weekly reset are rare boss drops and achievement badges.

This is not DeFi. Not P2E. Not a casino. It is a game designed to create daily habits around Solana Mobile usage, with deep integrations across **Solana Mobile, MagicBlock, and Metaplex Core**.

---

## The Game

### Weekly Epoch -- Roguelike Loop

Each week is an **epoch** -- a self-contained roguelike run. Monday you start fresh: Level 1, 3 lives, zero resources. By Friday you've built a unique character through missions, upgrades, and perk choices. Saturday the world boss spawns. Sunday night the epoch ends and everything resets -- except the rare loot you earned from the boss.

**Inspiration:** WoW raid drops. The boss is why you play. The rare drop is the chase.

### Three Classes

| Class | Specialty | Perk Pool |
|---|---|---|
| **Validator** | Speed -- faster mission completion | Speed + damage perks |
| **Staker** | Defense -- reduced failure chance | Defense + survival perks |
| **Oracle** | Loot -- better boss drop odds | Loot + drop chance perks |

### Mission Tiers (Monday -- Friday)

| Tier | Name | Description |
|---|---|---|
| 1 | Quick Swap | Short, low-risk scout op |
| 2 | Liquidity Run | Medium duration, balanced risk/reward |
| 3 | Deep Farm | Long, high-resource deep dive |

Missions reward **XP + epoch resources only** (Scrap, Crystal, Keys). No loot drops from missions -- all rare loot comes from the world boss.
`SKR` is a separate wallet token shown in the Resource Bar and used only for optional boss utilities.

### Roguelike Perk System

On every level-up, the player chooses **1 of 3 random perks**. Your build emerges from the choices you make.

- **Common (80%)** -- stackable stat bonuses (speed, fail rate, resource gain, XP)
- **Rare (15%)** -- unique abilities (Lucky Escape, Double Down, Insurance Protocol, Critical Overload)
- **Legendary (5%)** -- game-changing powers (Immortal Node, Genesis Protocol, Leviathan's Eye, Chain Reaction)

The perk pool is weighted by class, so each class naturally builds differently while any class can get any perk.

**Starter Perk:** Every epoch, a bonus perk offer fires at run start — before the first level-up. The build begins at character creation.

**Perk Reroll (10 SKR):** Don't like the level-up options? Spend 10 SKR to refresh the offer once per level-up. The first roll isn't the only hand.

### The Spending Tension

Resources serve three competing purposes:

1. **Spend on gear upgrades** (Armor / Engine / Scanner) → stronger all week → more XP → more levels → more perks → higher power
2. **Hoard for OVERLOAD** → dump everything into one massive boss crit → more contribution % → better drop odds
3. **Spend SKR on utilities** → reroll bad perks (10 SKR), reroll daily challenges (8 SKR), unlock second mission slot (20 SKR), amplify OVERLOAD (18 SKR)

This is the core economic decision every epoch. There is no correct answer.

### Daily Challenges

Every day, 3 challenges refresh with new goals tied to real progression. Each has a progress bar and a completion reward.

Challenge types: complete missions, earn scrap, deal boss damage, join the boss fight, complete specific mission types, participate in raids. Progress tracks automatically from normal play.

**Reroll:** Spend 8 SKR to swap out any single challenge. Creates daily SKR demand beyond the boss weekend.

### Second Mission Slot

Unlock a parallel fast slot (scout missions only) for 20 SKR per epoch. Run a Quick Swap in the background while your main mission is active. Double the weekly resource throughput — useful all week, priced to create a meaningful decision.

### SKR Utility Layer

SKR is used throughout the week — not just during the boss fight:

| Purchase | Cost | When |
|----------|------|------|
| Perk Reroll | 10 SKR | Any level-up |
| Challenge Reroll | 8 SKR | Daily |
| Second Mission Slot | 20 SKR | Epoch start |
| Overload Amplifier | 18 SKR | Boss weekend |
| Reconnect Protocol | 25 SKR | Boss weekend |
| Raid License | 35 SKR | Boss weekend |

`destabilized` state still has a **free timed auto-recovery** path (no SKR required).

### World Boss -- Protocol Leviathan

The endgame. A community event every weekend.

- **Saturday 00:00 UTC:** Boss spawns. All regular missions lock.
- **Shared HP pool** scaled to active player count that week, tracked on-chain via MagicBlock ER for **real-time visibility** across all clients
- Players **"Join the Hunt"** -- locks character into the fight. Earlier join = more passive damage = more contribution.
- **OVERLOAD** -- dump remaining resources into one critical strike burst (HP drop visible instantly to all players via websocket)
- Optional SKR utility actions can be purchased during the fight (epoch-capped, no guaranteed win)
- **Sunday 23:59 UTC:** If the community kills the boss, drop rolls happen based on contribution %. If the boss survives, nobody gets drops.

**Surge Windows:**
Three windows per weekend — **Saturday 08:00**, **Saturday 20:00**, **Sunday 08:00** UTC — 45 minutes each. During a surge, passive contributions deal 2× damage. A push notification fires 10 minutes before each window opens. Players know when to OVERLOAD for maximum impact.

### Boss Drop Table

| Drop Type | Chance | Duration |
|---|---|---|
| **Weekly Buffs** (Head Start, Extra Life, Supply Cache, Lucky Node, Overclocked) | ~15-20% | Next epoch only |
| **Permanent Rare Loot** (Protocol Core, Genesis Shard, Consensus Fragment, Epoch Crystal, Leviathan Scale) | ~2-5% | Forever -- passive stat perks |
| **Data Cores** (inventory expansion) | ~3% | Forever -- +1 slot each |
| **NFT Artifacts** (hand-crafted legendaries) | ~1% | Forever -- unique perks, Metaplex Core NFTs |

### What Resets vs. What Persists

| Resets Every Epoch | Persists Forever |
|---|---|
| Level, resources, upgrades, perks, streak, lives | Permanent rare loot (boss drops) |
| Weekly buffs (1 epoch only) | NFT artifacts, achievement badges, inventory capacity |
| Boss monetization flags (reconnect/amp/license) | SKR wallet balance (on-chain token) |
| Daily challenges | Lifetime stats (missions, boss kills, raids, epochs) |
| Fast slot unlock | Leaderboard titles (earned from lifetime stats) |

### Lifetime Cosmetic Milestones

Lifetime stats accumulate across all epochs and unlock display titles on the leaderboard:

| Title | Requirement |
|-------|-------------|
| Node Operator | 10 missions completed |
| Network Ghost | 100 missions completed |
| Leviathan Hunter | 10 boss kills |
| Syndicate | 10 raids completed |
| Season Veteran | 5 epochs survived |
| Epoch Champion | 20 epochs survived |

Titles are cosmetic only — zero gameplay advantage. Visible to everyone on the leaderboard.

---

## Core Engagement Loop

```
Monday    → Pick class, start fresh (Level 1, 3 lives, zero resources)
Mon-Fri   → Run missions → earn XP + resources → buy upgrades → choose perks on level-up
Saturday  → World Boss spawns → all missions lock → Join the Hunt
Weekend   → Optional SKR utilities (Reconnect / Amp / License) if needed
Sun 23:59 → Epoch ends → boss drops roll → full reset → repeat
```

No infinite farming. Time is the core limiter. Lives are finite. Decisions have consequences. The boss is the chase.

---

## Solana Integrations

### Solana Mobile

The primary client is an **Android app built with Expo React Native (Expo Router)** for Solana Seeker devices. Wallet authentication uses **Mobile Wallet Adapter v2** via Wallet UI React Native integration.

Wallet serves three roles:
- **Identity** -- sign-in via signMessage nonce challenge
- **Ownership** -- permanent boss loot and achievement NFTs live in your wallet
- **Ritual** -- confirm meaningful on-chain actions (epoch start, VRF roll)
- **Utility** -- SKR boss purchases are wallet-signed SPL transfers, verified by backend before utility effects are applied

### MagicBlock

Three MagicBlock integrations bring game mechanics on-chain without sacrificing mobile UX:

- **VRF (Verifiable Random Function)** -- Epoch bonus rolls use on-chain VRF for provably fair randomness. Results are verifiable on Solana Explorer. Fallback to server-side RNG if unavailable.
- **Ephemeral Rollups (Progress)** -- Zero-fee on-chain progress tracking. Game state is checkpointed to Solana without transaction fees or extra signatures.
- **Ephemeral Rollups (Boss HP)** -- Real-time boss HP broadcast to all clients via websocket. One global BossState PDA per week, server-signed damage updates, instant visibility across all players. Falls back to HTTP polling when unavailable.

### Metaplex Core

Permanent boss drops and achievements are minted as **Metaplex Core assets** with the Attributes plugin, directly to the player's wallet (zero player signatures -- server-minted).

Two collections:
- **Seeker Node: Relics** -- Permanent rare boss loot (Protocol Core, Genesis Shard, etc.) and hand-crafted NFT artifacts
- **Seeker Node: Achievements** -- Badge NFTs for milestones (Boss Slayer, Streak Legend, Deep Explorer, Raid Victor, Epoch Champion)

## Anti-Cheat

All game state is **server-authoritative**:

- Timers are server-side -- players cannot accelerate missions
- RNG is server-side -- VRF for epoch bonuses, server RNG for missions
- Boss damage validated server-side -- no client damage reports
- Claim requires `now >= end_time` on the server
- Wallet = identity (signMessage auth with JWT) + ownership (on-chain assets)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Client | Expo SDK 53 + React Native + Expo Router + TypeScript |
| Web Client | React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Hono (TypeScript) on Node.js + SQLite (better-sqlite3) |
| On-Chain | Anchor (1 unified program: player progress + boss HP + VRF — all via MagicBlock ER, deployed devnet) |
| NFTs | Metaplex Core (Umi + mpl-core) |
| Wallet | Mobile Wallet Adapter v2 + `@wallet-ui/react-native-web3js` (mobile), `@solana/wallet-adapter-react` (web) |
| Monorepo | pnpm workspaces |
| Shared Types | @solanaidle/shared workspace package |
| Target | Android app (Seeker / Solana Mobile ecosystem) + web companion |

---

## Why This Matters

Solana Mobile needs apps that people open **every day**, not once. Seeker Node creates a weekly roguelike loop where the boss fight is the social event, the rare drop is the chase, and the wallet is not just a login button -- it is your loot vault and proof of legend.

Stickiness is built in at multiple layers:
- **Daily:** challenges reset and missions complete — reasons to open every morning
- **Weekly:** the surge windows create real-time urgency on specific days and hours
- **Epoch:** the boss weekend is a social event for the entire Seeker audience
- **Lifetime:** permanent drops, titles, and stats compound across every epoch

Each integration (Mobile Wallet Adapter, MagicBlock ER, Metaplex Core NFTs, SKR) serves a real gameplay purpose -- nothing is bolted on.

> "A cyberpunk roguelike idle game where your Solana wallet is your operator badge, your loot vault, and your proof of legend."

---

## Core Engagement Loop (Updated)

```
Monday    → Pick class, start fresh + receive starter perk offer
Daily     → Check & complete 3 daily challenges (refresh every day)
Mon–Fri   → Launch missions → wait → claim → upgrade → choose perks
           (unlock fast slot for parallel Quick Swap runs)
Sat/Sun   → Surge windows fire at 08:00, 20:00, 08:00 UTC (push notification 10min before)
Saturday  → World Boss spawns → all missions lock → Join the Hunt
Weekend   → OVERLOAD during surge for max impact; optional SKR utilities
Sun 23:59 → Epoch ends → boss drops roll → full reset → repeat
```

---

## Future Vision

- Publish to the Solana dApp Store
- Seasonal Leviathans with themed drop tables and evolving lore
- Expanded NFT economy (tradable relics, guild banners, limited-edition artifacts)
- Guild leaderboards and coordinated boss strategies
- Additional mission tiers and class-specific perks
