# Game Design — Solana Idle

## Setting

Cyberpunk Solana. The world runs on a decentralized network and the player is a **node operator** — a freelance agent who keeps the chain alive by running missions across the digital frontier. Classes are named after real Solana network roles. Missions are network operations. Resources echo the Solana ecosystem.

## Core Loop

```
Connect Wallet → Pick Class (weekly) → Run Missions → Wait → Claim → Upgrade → Repeat
```

Time is the fundamental resource. The player's main decision is **which mission to run**, **when to run it**, and **how to spend resources between runs**.

---

## Weekly Epoch System

Each week is an **epoch** (matching Solana terminology). Epochs define the competitive cycle.

- Player picks a class at epoch start (wallet signature to commit)
- **3 lives** per epoch. Mission failure costs 1 life. 0 lives = run ends.
- Score accumulates from successful missions throughout the epoch
- At epoch end: score is sealed on-chain, leaderboard is updated
- **Resets each epoch:** upgrades, skills, streak
- **Carries over:** level, resources, loot

---

## Character

Each player has **1 character** per wallet.

### Classes

Players choose a class at the start of each epoch. Each class adjusts the core gameplay loop:

| Class | Role | Speed | Fail Rate | Loot | XP |
|-------|------|-------|-----------|------|----|
| Validator | Scout | -15% duration | +5% fail | Normal | Normal |
| Staker | Guardian | Normal | Normal | Normal | Normal |
| Oracle | Mystic | Normal | Normal | +30% rare loot | -10% XP |

- **Validator** — fast and aggressive. Runs missions quicker but takes more risks.
- **Staker** — balanced and reliable. No bonuses, no penalties. The baseline.
- **Oracle** — patient and perceptive. Finds better loot but levels slower.

### State

- `idle` — available to run missions
- `on_mission` — currently deployed, cannot take other actions
- `dead` — failed a mission and lost a life

---

## Missions

Four mission tiers, themed as network operations:

| Mission | Theme | Dev Duration | Real Duration | Fail Rate | Rewards | NFT Chance | Unlock |
|---------|-------|-------------|---------------|-----------|---------|------------|--------|
| Quick Swap | Scout op | ~30s | 7h | 10% | Small | 5% | Level 1 |
| Liquidity Run | Expedition | ~45s | 12h | 25% | Medium | 10% | Level 3 |
| Deep Farm | Deep dive | ~60s | 24h | 40% | Large + Keys | 15% | Level 6 |
| Protocol Raid | Boss fight | ~90s | 48h | 50% | Huge + artifact | 20% | Level 10, Sunday only |

### Mission Flow

1. Player selects a mission
2. Server records `start_time` and `end_time`
3. Character state changes to `on_mission`
4. Player waits (closes app, comes back later)
5. When `now >= end_time`, player can claim
6. Server resolves outcome (RNG roll against fail rate)
7. **Success:** XP + resources + possible loot drop added
8. **Failure:** character loses 1 life, streak resets (unless insured)

### Resolution Logic (Server-Side)

```
roll = random(0, 100)
adjusted_fail = mission.fail_rate - armor_bonus - reroll_bonus + class_modifier
if roll > adjusted_fail:
  success → grant rewards, build streak
else:
  fail → lose life, reset streak (unless insured)
```

Loot quality is influenced by character level, scanner upgrades, class bonuses, and streak multiplier.

---

## Resources

All resources are off-chain, stored in the server database.

| Resource | Internal Name | Source | Use |
|----------|--------------|--------|-----|
| Lamports | scrap | All missions | Basic upgrades, reroll stacks |
| Tokens | crystal | Liquidity Run+ | Advanced upgrades, insurance |
| Keys | artifact | Deep Farm+ | Rare upgrades |

---

## Gear Upgrades (3 Tracks)

Upgrades reset each epoch. Three independent tracks, each with 5 levels:

### Armor (Fail Rate Reduction)

Reduces the chance of mission failure.

| Level | Fail Rate Reduction |
|-------|-------------------|
| 1 | -2% |
| 2 | -4% |
| 3 | -6% |
| 4 | -9% |
| 5 | -12% |

### Engine (Mission Speed)

Reduces mission duration, getting results faster.

### Scanner (Loot Quality)

Increases loot drop chance and the likelihood of higher-tier drops.

Each level costs increasing resources (Lamports at lower levels, Tokens and Keys at higher levels).

---

## Skill Trees

Each class has its own skill tree with 3 tiers of abilities. Skills reset each epoch.

### Earning Skill Points

- Leveling up grants skill points
- Boss kills (Protocol Raid) grant bonus skill points

### Example Skills

| Skill | Class | Effect |
|-------|-------|--------|
| Lucky Escape | All | 50% chance to survive on mission failure (no life lost) |
| MEV Boost | Validator | +20% loot from Quick Swap missions |
| Consensus Shield | Staker | -10% fail rate on all missions |
| Data Siphon | Oracle | +15% rare loot from Deep Farm |

---

## Streak System

Consecutive successful missions build a streak counter.

- Streak multiplies loot rewards (scaling up to approximately 2x at high streaks)
- **Failure resets the streak to 0** (unless the player has active insurance)
- Streak is tracked per epoch and resets at epoch boundary

---

## Reroll Stacks & Insurance

### Reroll Stacks

- Purchased with Lamports
- Each stack reduces fail rate by 2% (additive)
- Consumed on mission completion regardless of outcome

### Insurance

- Purchased with Tokens
- Protects the player's streak on failure (streak is not reset)
- Does not prevent life loss
- Single-use: consumed when triggered

---

## Loot System

### Items

5 loot items, each available in 3 tiers:

| Item | Tiers |
|------|-------|
| RAM Stick | Common (T1), Rare (T2), Epic (T3) |
| LAN Cable | Common (T1), Rare (T2), Epic (T3) |
| NVMe Fragment | Common (T1), Rare (T2), Epic (T3) |
| Cooling Fan | Common (T1), Rare (T2), Epic (T3) |
| Validator Key Shard | Common (T1), Rare (T2), Epic (T3) |

### Drop Mechanics

- Base drop chance: 20%
- Boosted by: Scanner upgrades, owned loot perks, quest boosts, class bonuses (Oracle)
- **Hard cap: 55%**

### Passive Perks

Owned loot provides passive bonuses:

- Drop chance % increase
- Mission speed % reduction
- Other item-specific effects

---

## Guilds & Raids

### Guilds

- Create or join a guild via invite codes
- Guild membership enables cooperative raid missions

### Raid Types

| Raid | Players | Description |
|------|---------|-------------|
| Outpost | 2 | Cooperative timed mission, moderate loot multiplier |
| Stronghold | 3 | Cooperative timed mission, large loot multiplier |

Raids function as cooperative timed missions. All participating players must be idle and commit simultaneously. Loot is multiplied and distributed to all participants.

---

## Daily Login

7-day reward cycle with escalating resources:

- Day 1-7: increasing amounts of Lamports, Tokens, and occasional Keys
- Missing a day resets the streak back to Day 1
- Consistent daily logins yield significantly more resources over time

---

## NFTs (Metaplex Core)

All NFTs are minted as **Metaplex Core** assets with the Attributes plugin for on-chain metadata. The server mints directly to the player's wallet (zero player signatures required).

### Two Collections

- **Solana Idle: Relics** — rare mission drops
- **Solana Idle: Achievements** — milestone badges

### Relic NFTs

Rare drops from missions. 5 named relics:

1. Genesis Block Badge
2. Phantom Circuit
3. Epoch Shard
4. Consensus Core
5. Validator Signet

Drop chance is per-mission (5%-20% depending on tier) and boosted by Scanner upgrades, Oracle class, and loot perks.

### Achievement Badges

Earned through gameplay milestones:

| Achievement | Requirement |
|-------------|-------------|
| Boss Slayer | Complete your first Protocol Raid |
| Streak Legend | Reach a 10+ mission streak |
| Deep Explorer | Complete 50+ lifetime missions |
| Raid Victor | Complete any guild raid |
| Epoch Champion | Finish #1 on the weekly leaderboard |

### Viewing

All NFTs are viewable in Phantom and any Solana wallet that supports Metaplex Core assets.

---

## Jupiter Quests ("Intel" Tab)

Quests powered by Jupiter API integration. Players complete real DeFi-adjacent tasks for in-game rewards.

### Daily Quests (Free)

| Quest | Description |
|-------|-------------|
| Price Scout | Check a token price via Jupiter |
| Token Scan | Look up token metadata |
| Portfolio Check | Review wallet token balances |
| PnL Report | Check profit/loss on a position |

### Weekly Quests

| Quest | Description |
|-------|-------------|
| Micro Swap | Execute a small token swap via Jupiter |
| Prediction Bet | Place a prediction on price movement |

### Rewards

- Resources (Lamports, Tokens)
- Temporary boosts:
  - `loot_chance` — increased drop rate
  - `speed` — reduced mission duration
  - `xp` — increased experience gain

---

## Leaderboard

- Weekly rankings by epoch score
- Top 20 players displayed
- #1 player earns the **Epoch Champion** achievement badge (NFT)
- Scores are sealed on-chain at epoch end

---

## Wallet Integration Points

| Action | Wallet Usage |
|--------|-------------|
| Sign In | `signMessage` — proves wallet ownership via nonce challenge |
| Epoch Start | `signMessage` — commits class selection for the epoch |
| Epoch End | Score sealed on-chain |
| Claim NFT | Server mints to wallet (no player signature) |
| View NFTs | Read Metaplex Core assets from wallet |

---

## Anti-Abuse

- 1 character per wallet
- All timers are server-authoritative
- All RNG is server-side (upgradeable to commit-reveal or VRF)
- No way to skip or accelerate missions from the client
- Wallet signature ceremonies for epoch start and end
- Rate limiting on API endpoints
