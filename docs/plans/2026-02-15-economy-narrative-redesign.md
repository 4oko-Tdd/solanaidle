# Economy & Narrative Redesign

**Date:** 2026-02-15
**Goal:** Rework the game economy into a clean roguelike loop with meaningful permanent progression, remove redundant systems, and deepen the cyberpunk Solana narrative across all player-facing text.

---

## Design Philosophy

Every epoch is a self-contained roguelike run. You start with nothing, build power through the week, and fight a community world boss on the weekend. The ONLY things that survive the reset are rare boss drops and achievement badges. No resource hoarding, no level banking, no loot clutter.

**Inspiration:** WoW raid drops. The boss is why you play. The rare drop is the chase.

---

## Epoch Structure

### Monday 00:00 UTC — Friday 23:59 UTC: The Grind

- Pick class (Validator / Staker / Oracle)
- 3 lives. Level 1. Zero resources.
- Run missions, earn resources, buy upgrades
- Build power score for the weekend boss
- Weekly buff from previous boss fight applies (if earned)

### Saturday 00:00 UTC: World Boss Spawns

- All regular missions **locked** — boss is the only content
- Boss has a shared HP pool (scaled to active player count that week)
- Players choose when to **"Join the Hunt"** — locks character into boss fight
- Earlier join = more time dealing passive damage = more contribution
- Boss fight runs through end of Sunday

### Saturday — Sunday: Boss Fight Active

- Character deals **passive damage** based on power (gear level + upgrades + score)
- **One critical strike** available: dump remaining resources for burst damage
- Boss HP bar visible to all players in real-time
- Guild members' damage stacks (incentive to coordinate)

### Sunday 23:59 UTC: Epoch Ends

- Boss killed → drop rolls for all participants based on **contribution %**
- Boss survives → no drops. Better luck next epoch.
- **Full reset:** level, resources, upgrades, skills, streak, lives — everything
- **Persists forever:** rare loot collection, achievement badges, NFT artifacts

---

## Boss Drop Table

All drops are **chance-based**, scaling with your contribution % to boss damage. Higher contribution = better odds. Nothing is guaranteed.

### Weekly Buffs (Next Epoch Only)

~15-20% base chance. Applies to the following epoch, then disappears.

| Buff | Effect |
|------|--------|
| Head Start | Begin epoch at Level 2 |
| Extra Life | Start with 4 lives instead of 3 |
| Supply Cache | Start with bonus starting resources |
| Lucky Node | +10% loot drop chance all week |
| Overclocked | -15% mission duration all week |

### Permanent Rare Loot (Forever)

~2-5% base chance. The chase items. Small but stacking passive perks.

| Item | Perk |
|------|------|
| Protocol Core | +2% loot drop chance |
| Genesis Shard | -3% mission duration |
| Consensus Fragment | -2% fail rate |
| Epoch Crystal | +5% XP gain |
| Leviathan Scale | +3% boss damage |

Multiple copies can drop but with diminishing returns (e.g., second Protocol Core gives +1.5%, third gives +1%, etc.) or hard cap at 3 copies.

**Leviathan Scale** creates a flywheel: more boss damage → better drop odds → more permanent loot → even more boss damage. Rewards long-term dedication.

### Data Cores (Inventory Expansion)

~3% base chance. Auto-applies on drop (doesn't take a slot). Each one permanently adds +1 inventory slot.

### NFT Artifacts (Hand-Crafted Legendaries)

~1% or event-only. Designed and added manually with custom art and lore. Minted as Metaplex Core NFTs. Unique perks that normal permanent loot doesn't have. Potentially limited quantity ("only 10 exist").

These are the true flex items. The thing players screenshot and talk about.

---

## Inventory System

- **Starting slots:** 3
- **Expanded by:** Data Core drops (boss) or sacrificing a permanent item (+1 slot)
- **Sacrifice tradeoff:** destroy a permanent loot item to free its slot AND gain +1 max slot. Painful but strategic — make room for potentially better future drops.
- **Inventory persists across epochs** (it's your permanent collection)

When inventory is full and a new item drops, player must choose: sacrifice an existing item to make room, or discard the new drop.

---

## What Gets Removed

| System | Why |
|--------|-----|
| Mission loot drops (RAM Stick, LAN Cable, NVMe Fragment, Cooling Fan, Validator Key Shard) | Replaced by boss-only permanent drops. Regular missions give resources only. |
| Loot merge (3x T1 → T2) | No longer needed — no tiered loot system |
| Loot sell | No longer needed |
| Loot passive bonuses (drop chance %, speed %) | Replaced by permanent boss loot perks |
| Loot tier system (T1/T2/T3) | Removed entirely |
| `character_loot` table | Replaced by permanent inventory table |
| `loot_items` table | Replaced by boss drop definitions |
| Resource carryover | Resources reset each epoch |
| Level carryover | Level resets each epoch |
| InventoryPanel merge/sell UI | Replaced by permanent collection UI |

---

## What Changes

### Missions (Regular, Mon-Fri)

- Still 4 tiers: Quick Swap / Liquidity Run / Deep Farm / Protocol Raid (boss removed as solo mission)
- Wait — boss is now a community event, not a mission. So only **3 mission tiers** remain:
  - **Quick Swap** (scout) — short, low risk
  - **Liquidity Run** (expedition) — medium, balanced
  - **Deep Farm** (deep_dive) — long, high risk, high reward
- No loot drops from missions. Only: XP + resources (Lamports, Tokens, Keys)
- Resources are spent on upgrades during the epoch

### Boss (Weekend Community Event)

- Replaces the solo "Whale Hunt" boss mission
- Shared HP pool, all players contribute
- Damage = f(power level, time in fight, guild bonuses, permanent loot perks)
- Critical strike = resource dump for burst damage
- Drop rolls on kill based on contribution %

### Upgrades (Within Epoch — Resource Sink)

Armor / Engine / Scanner tracks remain as the **deliberate resource spending** path:
- Spend resources now on upgrades → stronger all week → more XP → more levels → more perks → higher power
- Hoard resources for boss crit → bigger OVERLOAD burst → more contribution % → better drop odds

This is the core spending tension every epoch. Upgrades reset at epoch end.

### Roguelike Perk System (Replaces Skill Trees)

The old linear skill trees (fixed abilities per class, buy in order) are **replaced** by a roguelike perk choice system.

**On every level-up**, the player is offered **3 random perks**. Pick one, the others disappear. Your build emerges from the choices you made throughout the epoch.

#### Perk Tiers

**Common perks (80% of offers):** Small stackable stat bonuses. Can appear multiple times and stack.

| Perk | Effect | Stackable |
|------|--------|-----------|
| Bandwidth Boost | +5% mission speed | Yes |
| Reinforced Node | -3% fail rate | Yes |
| Data Miner | +8% resource gain | Yes |
| Signal Amp | +5% XP gain | Yes |
| Loot Scanner | +5% drop chance | Yes |
| Armor Plating | -2% fail rate, +2% duration | Yes |
| Overclock Core | -5% duration, +3% fail rate | Yes |
| Salvage Protocol | +10% Lamports from missions | Yes |
| Token Siphon | +15% Tokens from missions | Yes |
| Key Decoder | +10% Keys from missions | Yes |

**Rare perks (15% of offers):** Unique abilities that change how you play. Each can only be taken once.

| Perk | Effect |
|------|--------|
| Lucky Escape | 50% chance to survive a fatal mission (no life lost). Once per epoch. |
| Double Down | Next mission gives 2x rewards but 2x fail rate |
| Insurance Protocol | Streak is protected on next failure |
| Second Wind | When you die, auto-revive instantly (once per epoch) |
| Whale Detector | +25% NFT artifact drop chance from boss |
| Early Access | Can join boss fight 6 hours before Saturday spawn |
| Critical Overload | OVERLOAD crit deals 1.5x damage |

**Legendary perks (5% of offers):** Extremely powerful, game-changing. One per epoch max.

| Perk | Effect |
|------|--------|
| Immortal Node | Cannot lose lives for the next 3 missions |
| Genesis Protocol | Start the next epoch with a free rare perk already active |
| Leviathan's Eye | See boss HP thresholds and optimal crit timing |
| Chain Reaction | When you crit the boss, nearby guild members deal +20% damage for 1 hour |

#### Class Weighting

The perk pool is weighted by class:
- **Validator:** more speed and damage perks offered
- **Staker:** more defense and survival perks offered
- **Oracle:** more loot, drop chance, and boss reward perks offered

Any class CAN get any perk — just at different odds. This keeps builds varied while maintaining class identity.

#### Perk UI

On level-up, a modal appears with 3 perk cards:
- Perk name + icon
- Effect description
- Rarity indicator (common/rare/legendary glow)
- "Choose" button

No skipping — you must pick one. This prevents hoarding choices.

### Classes

- Validator / Staker / Oracle remain
- Class choice affects mission performance AND boss damage profile
- Class weights the roguelike perk pool (replaces old skill trees)

---

## Narrative & Naming Overhaul

### Internal → Display Name Alignment

Stop the split-brain. Pick one name and use it everywhere (code + UI + docs).

| Internal | Display | Context |
|----------|---------|---------|
| scrap | Lamports | Common resource |
| crystal | Tokens | Mid-tier resource |
| artifact | Keys | Rare resource |
| scout | Quick Swap | Mission tier 1 |
| expedition | Liquidity Run | Mission tier 2 |
| deep_dive | Deep Farm | Mission tier 3 |
| boss | World Boss / Protocol Leviathan | Weekend community event |

### Lore Framing

The game world is **Solana's network as a cyberpunk city.** Players are node operators — freelance agents who keep the chain running. The world boss is a **Protocol Leviathan** — a massive network threat that requires the entire community to take down.

**Epoch = network cycle.** Each week the network resets its state. Only the rarest artifacts survive the reset — fragments of the old chain baked into permanent storage.

**Boss = Protocol Leviathan.** A corrupted mega-node that threatens the network. It spawns every weekend. If the community can't kill it, it escapes and nobody gets drops. The more damage you deal, the better your chances at salvaging rare components from its wreckage.

**Permanent loot = on-chain artifacts.** These are fragments recovered from defeated Leviathans — protocol-level components that permanently enhance your node. They exist on-chain as Metaplex Core NFTs. They ARE the progression.

**Weekly buffs = residual charge.** Fighting the Leviathan leaves residual energy that boosts your node for the next cycle. Not permanent, but a reward for participation.

**Critical strike = resource overload.** You dump your accumulated resources into a single massive attack — overclocking your node beyond safe limits for one burst of damage.

### UI Text Tone

- **Direct, punchy, Solana-native.** Not generic fantasy.
- Mission names reference DeFi/crypto operations
- Status messages use network terminology (online, slashed, syncing, delegated)
- Death = "slashed" (already in use, keep it)
- Boss HP bar: "Protocol Leviathan — 847,230 / 1,000,000 integrity"
- Critical strike button: "OVERLOAD" with resource amount shown

---

## Database Changes

### New Tables

```sql
-- Permanent loot collection (survives epoch reset)
CREATE TABLE permanent_loot (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  item_id TEXT NOT NULL,          -- 'protocol_core', 'genesis_shard', etc.
  item_name TEXT NOT NULL,
  perk_type TEXT NOT NULL,        -- 'loot_chance', 'speed', 'fail_rate', 'xp', 'boss_damage'
  perk_value REAL NOT NULL,       -- +0.02, -0.03, etc.
  mint_address TEXT,              -- Metaplex Core NFT (if minted)
  dropped_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Weekly buffs (cleared each epoch)
CREATE TABLE weekly_buffs (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  buff_id TEXT NOT NULL,          -- 'head_start', 'extra_life', etc.
  buff_name TEXT NOT NULL,
  epoch_start TEXT NOT NULL,      -- which epoch this applies to
  consumed INTEGER NOT NULL DEFAULT 0
);

-- World boss state
CREATE TABLE world_boss (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  week_start TEXT NOT NULL UNIQUE,
  spawned_at TEXT NOT NULL,
  killed INTEGER NOT NULL DEFAULT 0
);

-- Boss fight participants + damage
CREATE TABLE boss_participants (
  boss_id TEXT NOT NULL REFERENCES world_boss(id),
  wallet_address TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  passive_damage INTEGER NOT NULL DEFAULT 0,
  crit_damage INTEGER NOT NULL DEFAULT 0,
  crit_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (boss_id, wallet_address)
);

-- Permanent inventory capacity
CREATE TABLE inventory_capacity (
  wallet_address TEXT PRIMARY KEY,
  max_slots INTEGER NOT NULL DEFAULT 3
);
```

### Tables to Remove

- `character_loot` — replaced by `permanent_loot`
- `loot_items` — no more mission loot definitions

### Tables to Modify

- `characters` — level resets each epoch (or remove level entirely, use epoch-local leveling only)
- `weekly_runs` — add `weekly_buff_id` column for applied buff

---

## Implementation Priority

### Phase 1: Economy Reset + Remove Loot
- Remove loot drop system (mission-service, loot-service, InventoryPanel merge/sell)
- Make level reset each epoch
- Make resources reset each epoch
- Remove solo boss mission

### Phase 2: World Boss
- World boss table + spawning logic (Saturday cron or on-demand)
- Join the Hunt endpoint (locks character into boss fight)
- Passive damage calculation (power = f(level, gear, score))
- Critical strike endpoint (resource dump → damage)
- Boss HP tracking + real-time status endpoint
- Kill resolution + contribution % calculation

### Phase 3: Boss Drops
- Drop table definitions (weekly buffs + permanent loot + data cores)
- Roll logic based on contribution %
- Permanent loot table + inventory system
- Weekly buff table + application at epoch start
- Sacrifice mechanic (destroy item → +1 slot)

### Phase 4: Frontend
- Boss fight UI (HP bar, join button, crit button, contribution display)
- Permanent collection UI (replaces current InventoryPanel)
- Weekly buff indicator
- Remove old loot/merge/sell UI

### Phase 5: NFT Artifacts
- Hand-crafted item definitions (admin-added)
- Metaplex Core minting for permanent loot
- NFT artifact display in collection

### Phase 6: Narrative Polish
- Rename all UI text to match new lore
- Protocol Leviathan boss presentation
- Overload (crit) UX
- Network-native status messages everywhere

---

## Files Affected

### Remove / Gut
- `apps/api/src/services/loot-service.ts` — remove entirely (or gut to just seed data removal)
- `apps/web/src/features/inventory/InventoryPanel.tsx` — full rewrite as permanent collection
- Mission loot drop logic in `mission-service.ts`
- Loot-related types in `packages/shared/src/types.ts`

### New
- `apps/api/src/services/boss-service.ts` — world boss logic
- `apps/api/src/services/drop-service.ts` — boss drop rolls
- `apps/api/src/services/permanent-loot-service.ts` — collection management
- `apps/api/src/routes/boss-routes.ts` — boss endpoints
- `apps/web/src/features/game/BossFight.tsx` — boss fight UI
- `apps/web/src/features/game/PermanentCollection.tsx` — collection display
- `apps/web/src/hooks/useBoss.ts` — boss state hook
- `apps/web/src/hooks/useCollection.ts` — permanent loot hook

### Modify
- `apps/api/src/services/mission-service.ts` — remove loot drops, remove solo boss
- `apps/api/src/services/run-service.ts` — epoch reset includes level, apply weekly buffs
- `apps/api/src/services/game-config.ts` — remove boss mission, remove loot config, add boss drop config
- `apps/api/src/db/schema.ts` — new tables, remove old loot tables
- `apps/api/src/index.ts` — register boss routes, boss spawning
- `apps/web/src/features/game/GameDashboard.tsx` — boss fight integration, remove loot references
- `apps/web/src/features/game/MissionPanel.tsx` — remove boss mission, lock during weekend
- `packages/shared/src/types.ts` — new boss/loot types, remove old loot types
