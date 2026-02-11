# Economy & Mechanics Polish — Design

## Changes

### 1. Gentle XP Curve
- Formula: `Math.floor(100 * Math.pow(1.5, level - 1))`
- Replaces flat `level * 100`
- Early levels fast, higher levels require harder missions
- Each level-up grants +1 skill point to active run

### 2. Reroll & Insurance (Pre-Mission Buffs)
**Reroll:** Spend scrap to reduce fail rate for one mission.
- 10 scrap per stack, max 3 stacks (-2% fail rate each, -6% total)
- Deducted on mission start, applied on claim

**Insurance:** Spend crystal to protect streak on failure.
- 5 crystal flat cost
- If mission fails: die + lose life as normal, but streak preserved
- One per mission

Storage: `active_missions` table gets `reroll_stacks INTEGER DEFAULT 0`, `insured INTEGER DEFAULT 0`.

UI: Two toggles on mission card before starting.

### 3. Rebalanced Gear Costs

| Level | Scrap | Crystal | Artifact |
|-------|-------|---------|----------|
| 1 | 20 | — | — |
| 2 | 50 | 10 | — |
| 3 | 120 | 30 | — |
| 4 | 250 | 60 | 2 |
| 5 | 500 | 120 | 5 |

Total per track: 940 scrap, 220 crystal, 7 artifact.
All 3 tracks: 2820 scrap, 660 crystal, 21 artifact.
