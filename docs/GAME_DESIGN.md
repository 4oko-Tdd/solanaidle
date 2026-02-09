# Game Design — Solana Idle

## Core Loop

```
Open App → Send on Mission → Wait (real time) → Claim Result → Upgrade → Repeat
```

Time is the fundamental resource. The player's main decision is **which mission to send their character on** and **when**.

## Character

Each player has **1 character** (MVP).

### Attributes
- **Level** — increases with XP from missions
- **HP** — determines survival chance; regenerates over time
- **Gear Score** — sum of equipped upgrades; affects loot quality

### State
- `idle` — available to send on missions
- `on_mission` — currently away, cannot take other actions
- `dead` — failed a mission, revives after cooldown (1h MVP)

## Missions

Three mission types in MVP:

| Mission | Duration | Risk | Reward |
|---------|----------|------|--------|
| Scout | 1h | Low (10% fail) | Small XP + common resources |
| Expedition | 6h | Medium (25% fail) | Good XP + uncommon resources |
| Deep Dive | 24h | High (40% fail) | Large XP + rare resources + NFT chance |

### Mission Flow
1. Player selects mission type
2. Server records `start_time` and `end_time`
3. Character state → `on_mission`
4. Player waits (closes app, comes back later)
5. When `now >= end_time`, player can claim
6. Server resolves outcome (RNG roll against risk %)
7. On success: XP + resources added
8. On failure: character → `dead`, revive cooldown starts

### Resolution Logic (Server-Side)
```
roll = random(0, 100)
if roll > mission.fail_rate:
  success → grant rewards
else:
  fail → character dies, cooldown starts
```

Loot quality is influenced by character level and gear score.

## Resources

MVP resources:

| Resource | Source | Use |
|----------|--------|-----|
| Scrap | All missions | Basic upgrade material |
| Crystal | Expedition+ | Advanced upgrades |
| Artifact | Deep Dive only | Rare, used for special upgrades |

Resources are **off-chain** in MVP. Stored in server database.

## Upgrades

MVP: **1 upgrade type** — Gear.

- Gear has levels (1–5 in MVP)
- Each level costs increasing resources
- Higher gear → better loot rolls, slightly lower fail rate

| Gear Level | Cost | Fail Rate Reduction |
|------------|------|-------------------|
| 1 | 10 Scrap | -0% (base) |
| 2 | 25 Scrap + 5 Crystal | -2% |
| 3 | 50 Scrap + 15 Crystal | -5% |
| 4 | 100 Scrap + 30 Crystal + 1 Artifact | -8% |
| 5 | 200 Scrap + 60 Crystal + 3 Artifact | -12% |

## NFT Claims (Rare Events)

- Deep Dive missions have a small chance (~5%) of triggering a rare event
- Rare event → player can **claim an NFT** to their wallet
- NFT is a badge/trophy — no marketplace in MVP
- Claim flow: server prepares mint → player signs with wallet → NFT lands in wallet

## Wallet Integration Points

| Action | Wallet Usage |
|--------|-------------|
| Sign In | `signMessage` — proves wallet ownership |
| Claim NFT | `signAndSendTransaction` — on-chain mint |
| View Badges | Read NFTs from wallet (display only) |

## Anti-Abuse

- 1 character per wallet
- All timers server-authoritative
- No way to skip or accelerate missions
- Rate limiting on API endpoints
- Wallet signature required for sensitive actions

## Future Design Space (Not in MVP)

- Multiple characters
- Character classes with different abilities
- Seasons with leaderboards
- Guild missions (multi-player)
- Tradable resources (token-gated)
- On-chain progression (Anchor program)
- Events with limited-time missions
