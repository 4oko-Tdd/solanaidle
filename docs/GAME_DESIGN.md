# Game Design — Seeker Node

## Setting

Cyberpunk Solana. The blockchain is a sprawling digital city and the player is a **node operator** — a freelance agent keeping the chain alive by running missions across the network frontier. The world boss is a **Protocol Leviathan** — a corrupted mega-node threatening the entire network. Every week, the community rallies to take it down.

---

## Design Philosophy

Every epoch is a self-contained roguelike run. You start with nothing, build power through the week, and fight a community world boss on the weekend. The **only things that survive the reset** are rare boss drops and achievement badges.

No resource hoarding. No level banking. No loot clutter.

**Inspiration:** WoW raid drops. The boss is why you play. The rare drop is the chase.

---

## Core Loop

```
Monday    → Pick class, start fresh (Level 1, 3 lives, zero resources)
Mon–Fri   → Run missions → earn XP + resources → buy upgrades → choose perks on level-up
Saturday  → World Boss spawns → all missions lock → Join the Hunt
Sun 23:59 → Epoch ends → boss drops roll → full reset
```

Time is the fundamental resource. The player's decisions each epoch:
1. **Which missions to run** (risk vs. reward)
2. **How to spend resources** (upgrades now vs. hoard for boss OVERLOAD)
3. **Which perks to pick** (build strategy emerges from choices)
4. **When to join the boss fight** (earlier = more passive damage = more contribution)

---

## Weekly Epoch Structure

Each week is an **epoch** (matching Solana terminology). Epochs define the competitive and progression cycle.

### Monday 00:00 UTC — Friday 23:59 UTC: The Grind

- Pick class (Validator / Staker / Oracle)
- 3 lives. Level 1. Zero resources.
- Run missions, earn XP + resources (Scrap, Crystal, Keys)
- Spend resources on gear upgrades (Armor / Engine / Scanner)
- Choose roguelike perks on each level-up
- Build power score for the weekend boss
- Weekly buff from previous boss fight applies (if earned)

### Saturday 00:00 UTC: World Boss Spawns

- All regular missions **locked** — the boss is the only content
- Boss has a **shared HP pool** scaled to active player count that week
- Players choose when to **"Join the Hunt"** — locks character into boss fight
- Earlier join = more time dealing passive damage = more contribution %
- Boss fight runs through end of Sunday

### Saturday — Sunday: Boss Fight Active

- Character deals **passive damage** based on power (gear level + upgrades + score)
- **One OVERLOAD** available: dump remaining resources for a single burst of damage
- Boss HP bar visible to all players in **real-time via websocket** (powered by MagicBlock Ephemeral Rollups — `boss-tracker` program). A "LIVE" indicator appears when connected.
- Falls back to 30s HTTP polling when websocket is unavailable
- Guild members' damage stacks (incentive to coordinate)

### Sunday 23:59 UTC: Epoch Ends

- **Boss killed** → drop rolls for all participants based on contribution %
- **Boss survives** → no drops. Better luck next epoch.
- **Full reset:** level, resources, upgrades, perks, streak, lives — everything
- **Persists forever:** rare loot collection, achievement badges, NFT artifacts

---

## What Resets vs. What Persists

| Resets Every Epoch | Persists Forever |
|---|---|
| Character level | Permanent rare loot (boss drops) |
| Resources (Scrap, Crystal, Keys) | NFT artifacts (hand-crafted legendaries) |
| Gear upgrades (Armor/Engine/Scanner) | Achievement badges |
| Roguelike perks | Inventory capacity (Data Core expansions) |
| Streak counter | |
| Lives (3 per epoch) | |
| Weekly buffs (last 1 epoch only) | |

---

## Character

Each player has **1 character** per wallet.

### Classes

Players choose a class at the start of each epoch. Class affects mission performance, boss damage profile, and the roguelike perk pool.

| Class | Role | Speed | Fail Rate | Loot | Perk Pool Weight |
|---|---|---|---|---|---|
| Validator | Scout | -15% duration | +5% fail | Normal | Speed + damage perks |
| Staker | Guardian | Normal | Normal | Normal | Defense + survival perks |
| Oracle | Mystic | Normal | Normal | +30% rare loot | Loot + drop chance perks |

- **Validator** — fast and aggressive. Runs missions quicker but takes more risks.
- **Staker** — balanced and reliable. No bonuses, no penalties. The baseline.
- **Oracle** — patient and perceptive. Better boss drop odds but no speed advantage.

### Character States

| State | Description |
|---|---|
| `idle` | Available to run missions |
| `on_mission` | Deployed, cannot take other actions |
| `in_boss_fight` | Locked into weekend boss fight |
| `slashed` | Failed a mission and lost a life |

---

## Missions (Monday — Friday)

Three mission tiers, themed as network operations. **No loot drops from missions** — only XP + resources.

| Mission | Theme | Duration | Fail Rate | Rewards | Unlock |
|---|---|---|---|---|---|
| Quick Swap | Scout op | 7h | 10% | Small XP + Scrap | Level 1 |
| Liquidity Run | Expedition | 12h | 25% | Medium XP + Scrap + Crystal | Level 3 |
| Deep Farm | Deep dive | 24h | 40% | Large XP + all resources | Level 6 |

### Mission Flow

1. Player selects a mission
2. Server records `start_time` and `end_time`
3. Character state → `on_mission`
4. Player waits (closes app, comes back later)
5. When `now >= end_time`, player can claim
6. Server resolves outcome (RNG roll against fail rate)
7. **Success:** XP + resources granted, streak increments
8. **Failure:** lose 1 life, streak resets (unless insured by perk)

### Resolution Logic (Server-Side)

```
roll = random(0, 100)
adjusted_fail = mission.fail_rate
  - armor_bonus
  - perk_bonuses (Reinforced Node, Armor Plating, etc.)
  + class_modifier
if roll > adjusted_fail:
  success → grant rewards, build streak
else:
  fail → lose life, reset streak (unless Insurance Protocol perk active)
```

### Missions Lock on Weekends

When the world boss spawns Saturday 00:00 UTC, all regular missions are **locked**. The boss is the only content until the epoch ends Sunday 23:59 UTC.

---

## Resources

All resources are off-chain, stored in the server database. **Resources reset to zero every epoch.**

| Resource | Display Name | Source | Use |
|---|---|---|---|
| scrap | Scrap | All missions | Basic upgrades, OVERLOAD fuel |
| crystal | Crystal | Liquidity Run+ | Advanced upgrades, OVERLOAD fuel |
| artifact | Keys | Deep Farm | Rare upgrades, OVERLOAD fuel |

### The Spending Tension

Resources serve two competing purposes every epoch:

1. **Spend on upgrades** → stronger all week → more XP → more levels → more perks → higher power score → more passive boss damage
2. **Hoard for OVERLOAD** → dump everything into one massive boss crit → more contribution % → better drop odds

This is the core economic decision. There is no "correct" answer — it depends on your build, your class, and how the boss fight is going.

---

## Gear Upgrades (3 Tracks)

Upgrades reset each epoch. Three independent tracks, each with 5 levels. These are the primary resource sink during the grind phase.

### Armor (Fail Rate Reduction)

Reduces the chance of mission failure.

| Level | Fail Rate Reduction | Cost |
|---|---|---|
| 1 | -2% | 50 Scrap |
| 2 | -4% | 120 Scrap |
| 3 | -6% | 200 Scrap, 30 Crystal |
| 4 | -9% | 350 Scrap, 80 Crystal |
| 5 | -12% | 500 Scrap, 150 Crystal, 20 Keys |

### Engine (Mission Speed)

Reduces mission duration, getting results faster.

### Scanner (Loot Quality)

Increases boss drop chance and contribution bonus.

---

## Roguelike Perk System

The old linear skill trees are **replaced** by a roguelike perk choice system.

**On every level-up**, the player is offered **3 random perks**. Pick one, the others disappear. Your build emerges from the choices you made. No skipping — you must pick one.

### Common Perks (80% of offers)

Small stackable stat bonuses. Can appear multiple times and stack.

| Perk | Effect |
|---|---|
| Bandwidth Boost | +5% mission speed |
| Reinforced Node | -3% fail rate |
| Data Miner | +8% resource gain |
| Signal Amp | +5% XP gain |
| Loot Scanner | +5% boss drop chance |
| Armor Plating | -2% fail rate, +2% duration |
| Overclock Core | -5% duration, +3% fail rate |
| Salvage Protocol | +10% Scrap from missions |
| Token Siphon | +15% Crystal from missions |
| Key Decoder | +10% Keys from missions |

### Rare Perks (15% of offers)

Unique abilities that change how you play. Each can only be taken once per epoch.

| Perk | Effect |
|---|---|
| Lucky Escape | 50% chance to survive a fatal mission (no life lost). Once per epoch. |
| Double Down | Next mission gives 2x rewards but 2x fail rate |
| Insurance Protocol | Streak is protected on next failure |
| Second Wind | When you die, auto-revive instantly (once per epoch) |
| Whale Detector | +25% NFT artifact drop chance from boss |
| Early Access | Can join boss fight 6 hours before Saturday spawn |
| Critical Overload | OVERLOAD crit deals 1.5x damage |

### Legendary Perks (5% of offers)

Extremely powerful, game-changing. One per epoch max.

| Perk | Effect |
|---|---|
| Immortal Node | Cannot lose lives for the next 3 missions |
| Genesis Protocol | Start the next epoch with a free rare perk already active |
| Leviathan's Eye | See boss HP thresholds and optimal crit timing |
| Chain Reaction | When you crit the boss, guild members deal +20% damage for 1 hour |

### Class Weighting

The perk pool is weighted by class:
- **Validator:** more speed and damage perks offered
- **Staker:** more defense and survival perks offered
- **Oracle:** more loot, drop chance, and boss reward perks offered

Any class CAN get any perk — just at different odds. Keeps builds varied while maintaining class identity.

### Perk UI

On level-up, a modal appears with 3 perk cards:
- Perk name + icon
- Effect description
- Rarity indicator (common / rare / legendary glow)
- "Choose" button

---

## World Boss — Protocol Leviathan

The endgame. A community event that replaces the old solo boss mission.

### Spawning

- Spawns every Saturday 00:00 UTC
- **Shared HP pool** scaled to active player count that week
- Formula: `base_hp * active_players * scaling_factor`

### Joining

- Players tap **"Join the Hunt"** to lock their character into the fight
- Once joined, you cannot run missions or leave until the epoch ends
- **Earlier join = more time dealing passive damage = higher contribution %**

### Damage

Players deal damage through two mechanisms:

**Passive Damage (continuous):**
```
damage_per_hour = base_power
  * (1 + gear_level_bonus)
  * (1 + perk_bonuses)
  * (1 + permanent_loot_bonuses)
  * guild_multiplier
```

**OVERLOAD (one-time critical strike):**
- Player dumps ALL remaining resources into one burst
- `crit_damage = (scrap * 1) + (crystal * 3) + (keys * 10)`
- Modified by perks (Critical Overload = 1.5x, Chain Reaction = guild boost)
- Can only be used **once per boss fight**
- Button text: "OVERLOAD" with resource amount shown

### Resolution (Sunday 23:59 UTC)

- **Boss killed:** drop rolls for ALL participants
  - Each player's contribution % = their total damage / total boss damage
  - Higher contribution = better drop odds
  - Drops are still chance-based — nothing is guaranteed
- **Boss survives:** no drops for anyone. The Leviathan escapes.

### Guild Coordination

- Guild members who join the fight together get a damage multiplier
- Chain Reaction perk: OVERLOAD boosts nearby guild members' damage
- Incentivizes coordinated join times and crit timing

---

## Boss Drop Table

All drops are **chance-based**, scaling with contribution %. Higher contribution = better odds. Nothing is guaranteed.

### Weekly Buffs (Next Epoch Only)

~15-20% base chance. Applies to the following epoch, then disappears. Consolation prize for participants who didn't get rare loot.

| Buff | Effect |
|---|---|
| Head Start | Begin next epoch at Level 2 |
| Extra Life | Start with 4 lives instead of 3 |
| Supply Cache | Start with bonus starting resources |
| Lucky Node | +10% boss drop chance all week |
| Overclocked | -15% mission duration all week |

### Permanent Rare Loot (Forever)

~2-5% base chance. The chase items. Small but stacking passive perks that persist across all future epochs.

| Item | Perk |
|---|---|
| Protocol Core | +2% boss drop chance |
| Genesis Shard | -3% mission duration |
| Consensus Fragment | -2% fail rate |
| Epoch Crystal | +5% XP gain |
| Leviathan Scale | +3% boss damage |

Multiple copies can drop with diminishing returns:
- 1st copy: full value
- 2nd copy: 75% value
- 3rd copy: 50% value (hard cap)

**Leviathan Scale flywheel:** more boss damage → better drop odds → more permanent loot → even more boss damage. Rewards long-term dedication.

### Data Cores (Inventory Expansion)

~3% base chance. Auto-applies on drop (doesn't take an inventory slot). Each one permanently adds +1 inventory slot.

### NFT Artifacts (Hand-Crafted Legendaries)

~1% or event-only. Designed and added manually with custom art and lore. Minted as **Metaplex Core** NFTs. Unique perks that normal permanent loot doesn't have. Potentially limited quantity ("only 10 exist").

These are the true flex items. The thing players screenshot and talk about.

---

## Inventory System

Your permanent collection of rare boss loot.

- **Starting slots:** 3
- **Expanded by:** Data Core drops (boss) or sacrificing a permanent item (+1 slot)
- **Sacrifice tradeoff:** destroy a permanent loot item to free its slot AND gain +1 max slot. Painful but strategic — make room for potentially better future drops.
- **Inventory persists across epochs** (it's your permanent collection)

When inventory is full and a new item drops:
- **Sacrifice** an existing item to make room (and gain +1 max slot)
- **Discard** the new drop

---

## Streak System

Consecutive successful missions build a streak counter.

- Streak multiplies resource rewards (scaling up to ~2x at high streaks)
- **Failure resets the streak to 0** (unless Insurance Protocol perk is active)
- Streak resets at epoch boundary
- Reaching 10+ streak earns the **Streak Legend** achievement badge

---

## Guilds & Raids

### Guilds

- Create or join a guild via invite codes
- Guild membership enables cooperative raid missions
- Guild members get a boss damage multiplier when fighting together

### Raid Types

| Raid | Players | Description |
|---|---|---|
| Outpost | 2 | Cooperative timed mission, moderate loot multiplier |
| Stronghold | 3 | Cooperative timed mission, large loot multiplier |

Raids function as cooperative timed missions during the weekday grind. All participating players must be idle and commit simultaneously. Rewards are multiplied and distributed to all participants.

---

## Daily Login

7-day reward cycle with escalating resources:

- Day 1-7: increasing amounts of Scrap, Crystal, and occasional Keys
- Missing a day resets the streak back to Day 1
- Resources from login are epoch-local (reset with everything else)

---

## NFTs (Metaplex Core)

All NFTs are minted as **Metaplex Core** assets with the Attributes plugin for on-chain metadata. The server mints directly to the player's wallet — zero player signatures required.

### Two Collections

- **Seeker Node: Relics** — permanent boss loot drops (Protocol Core, Genesis Shard, etc.)
- **Seeker Node: Achievements** — milestone badges

### Achievement Badges

Earned through gameplay milestones:

| Achievement | Requirement |
|---|---|
| Boss Slayer | Participate in killing a Protocol Leviathan |
| Streak Legend | Reach a 10+ mission streak in a single epoch |
| Deep Explorer | Complete 50+ lifetime missions |
| Raid Victor | Complete any guild raid |
| Epoch Champion | Finish #1 on the weekly leaderboard |

### Viewing

All NFTs are viewable in Phantom, Magic Eden, Tensor, and any Solana wallet that supports Metaplex Core assets.

---

## Jupiter Quests ("Intel" Tab)

Quests powered by Jupiter API integration. Players complete real DeFi-adjacent tasks for in-game rewards.

### Daily Quests (Free)

| Quest | Description |
|---|---|
| Price Scout | Check a token price via Jupiter |
| Token Scan | Look up token metadata |
| Portfolio Check | Review wallet token balances |
| PnL Report | Check profit/loss on a position |

### Weekly Quests

| Quest | Description |
|---|---|
| Micro Swap | Execute a small token swap via Jupiter |
| Prediction Bet | Place a prediction on price movement |

### Rewards

- Resources (Scrap, Crystal)
- Temporary boosts: loot chance, speed, XP gain

---

## Leaderboard

- Weekly rankings by epoch score
- Top 20 players displayed
- #1 player earns the **Epoch Champion** achievement badge (NFT)
- Scores sealed on-chain at epoch end via MagicBlock Ephemeral Rollups

---

## Narrative & Terminology

The game world is **Solana's network as a cyberpunk city.**

| Concept | In-Game Term | Lore |
|---|---|---|
| Weekly cycle | Epoch | Network resets its state each week |
| Death | Slashed | Node was penalized for failure |
| World Boss | Protocol Leviathan | Corrupted mega-node threatening the network |
| Boss crit | OVERLOAD | Overclock your node beyond safe limits |
| Permanent loot | On-chain artifacts | Fragments recovered from defeated Leviathans |
| Weekly buffs | Residual charge | Energy left over from fighting the Leviathan |
| Resources | Scrap / Crystal / Keys | Network-native currency |
| Missions | Network operations | Quick Swap, Liquidity Run, Deep Farm |

### UI Text Tone

- **Direct, punchy, Solana-native.** Not generic fantasy.
- Mission names reference DeFi/crypto operations
- Status messages use network terminology (online, slashed, syncing, delegated)
- Boss HP bar: "Protocol Leviathan — 847,230 / 1,000,000 integrity"
- Critical strike button: "OVERLOAD" with resource amount shown

---

## Wallet Integration Points

| Action | Wallet Usage |
|---|---|
| Sign In | `signMessage` — proves wallet ownership via nonce challenge |
| Epoch Start | `signMessage` — commits class selection + ER delegation |
| Epoch End | Score sealed on-chain via Ephemeral Rollups |
| VRF Bonus | `signTransaction` — requests on-chain randomness (MagicBlock VRF) |
| Claim NFT | Server mints to wallet (no player signature) |
| View NFTs | Read Metaplex Core assets from wallet |

---

## Anti-Abuse

- 1 character per wallet
- All timers are server-authoritative
- All RNG is server-side (VRF for epoch bonuses, server RNG for missions)
- No way to skip or accelerate missions from the client
- Wallet signature ceremonies for epoch start and end
- Rate limiting on API endpoints
- Boss damage validated server-side (no client damage reports)
