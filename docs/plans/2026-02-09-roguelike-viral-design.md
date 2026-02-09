# Roguelike Viral Mechanics — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the idle game into a roguelike with weekly runs, character classes, guild raids, and on-chain airdrop rewards — creating a viral loop around Solana Mobile wallet engagement.

**Architecture:** Server-authoritative weekly run system. Classes and skill trees are config-driven. Guilds are lightweight (just wallet groups). Airdrops use weekly score calculations with on-chain NFT claims.

**Tech Stack:** Same stack (Hono + SQLite + React). New DB tables for runs, classes, guilds, raids, leaderboards.

---

## 1. Weekly Run Structure

### Core Loop (Enhanced)

```
Monday: New run starts → Pick a character class
Daily: Send on missions → Earn XP, loot, skill points
Thu-Fri: Unlock harder missions as character levels up
Weekend: Boss mission unlocks (high risk, high reward)
Sunday night: Run ends → Rewards calculated → Airdrop distributed
Monday: New run, keep permanent unlocks, try different class
```

### Run Progression Within a Week

- **Days 1-2:** Tier 1 missions only (Scout-level). Build base resources.
- **Days 3-4:** Tier 2 unlocks at character level 3. Better loot, more risk.
- **Days 5-6:** Tier 3 unlocks at level 5. Deep Dive territory.
- **Day 7:** Boss mission appears. One shot. Success = huge rewards + airdrop eligibility. Fail = run ends early.

### Run Lives

- Each run starts with **3 lives**
- Mission failure costs 1 life (character still revives after cooldown)
- Lose all 3 lives → run ends early, reduced weekly rewards
- Creates tension: risk the dangerous mission or play it safe?

### Permanent Progression (Survives Between Runs)

- **Class unlocks** — start with 1 (Scout), unlock more through achievements
- **Passive bonuses** — "All Scouts get +5% loot" (earned by completing X runs as Scout)
- **Cosmetic badges** — NFTs for milestones (beat 10 bosses, survive 5 full weeks, etc.)
- **Class mastery** — every 5 completed runs with a class unlocks a permanent passive

---

## 2. Character Classes

### 3 Classes (MVP)

| Class | Strength | Weakness | Playstyle |
|-------|----------|----------|-----------|
| **Scout** | -15% mission duration | +5% fail rate | Speed runner. More missions/day, slightly riskier. |
| **Guardian** | -10% fail rate | +20% mission duration | Safe player. Fewer missions, almost never dies. |
| **Mystic** | +30% rare loot & NFT chance | +10% fail rate, -10% base XP | Gambler. High risk, chases rare drops. |

### Skill Trees (3 nodes per class)

**Scout:**
```
[Swift Feet] -10% more duration reduction
      ↓
[Lucky Escape] 50% chance to survive a failed mission (1x per run)
      ↓
[Double Run] Can send on 2 missions simultaneously (once per day)
```

**Guardian:**
```
[Iron Will] +1 run life (4 total instead of 3)
      ↓
[Resource Shield] Keep 50% resources on death
      ↓
[Fortify] -5% additional fail rate on Tier 3 missions
```

**Mystic:**
```
[Third Eye] See mission outcome probability before starting
      ↓
[Ritual] +15% NFT drop chance on Deep Dive
      ↓
[Soul Link] On death, convert to 1h spirit mode — collect passive resources
```

### Skill Points

- Earned: 1 per successful mission, 3 for boss kill
- Reset each week (part of the run)
- 3 nodes per tree = max one branch in ~3 days of active play

---

## 3. Guild Missions (Viral Mechanic)

### Guilds

- Create or join a guild (3-5 members)
- Guild = group of wallet addresses
- Simple: name, invite code, member list
- No governance, no tokens

### Raid Missions

Special missions requiring 2+ guild members to commit characters simultaneously.

| Raid | Players | Duration | Reward |
|------|---------|----------|--------|
| Outpost | 2 | 4h | 2x loot for all |
| Stronghold | 3 | 12h | 3x loot + guaranteed Crystal |
| Void Gate | 4+ | 24h | 5x loot + NFT chance for all |

### Viral Trigger

You see the Void Gate raid but only have 2 guildmates. You need to invite someone to access the best rewards. The game mechanic itself creates the invitation.

### Guild Leaderboard

- Ranked by total successful missions (all members combined)
- Top 10 guilds get bonus airdrop at week end
- Guild rank visible to everyone

### Implementation

New DB tables:
- `guilds` (id, name, created_by, invite_code, created_at)
- `guild_members` (guild_id, character_id, joined_at)
- `raid_missions` (extends active_missions with required_players, committed_players)

New API routes: `/guilds` (create, join, leave, list members), `/raids` (list, commit, status)

---

## 4. Airdrop & Reward Economy

### Weekly Score

```
Score = XP earned + missions completed + (boss killed × 500) + guild raid bonus
```

### Reward Tiers

| Tier | Requirement | Reward |
|------|-------------|--------|
| Participated | 1+ mission that week | Participation badge (off-chain) |
| Active | Score > 500 | Resource airdrop (bonus for next run) |
| Elite | Top 20% of players | NFT badge + resource multiplier |
| Champion | Top 10 players | Unique NFT + potential token airdrop |
| Guild Elite | Top 3 guilds | All members get bonus NFT |

### On-chain vs Off-chain

| On-chain (wallet) | Off-chain (server) |
|---|---|
| Weekly badge NFTs | Resources (scrap, crystal, artifact) |
| Achievement NFTs | XP, levels, skill points |
| Guild Champion rewards | Run progress, lives |
| Future: governance tokens | Leaderboard position |

### Weekly Wallet Ritual

Every Sunday night, eligible players see: "Your weekly rewards are ready to claim." Open app → see ranking → sign transaction → claim NFT. This is the weekly wallet interaction for Solana Mobile.

### Anti-abuse

- Minimum 5 missions to be eligible
- Account age > 1 week for Elite+ tiers
- One wallet = one player
- Guild rewards require all members to be active that week

---

## 5. Future Roadmap (Not in MVP)

### Referral System
- Invite code per player
- Both players get bonus resources on first run
- Referral leaderboard with bonus rewards

### World Events
- Global mission counter (all players contribute)
- Milestone rewards when community hits targets
- Time-limited special missions with unique NFT drops

### Advanced Features
- Character prestige system (additional permanent bonuses)
- Seasonal themes and limited-time classes
- Trading post for resources (token-gated)
- On-chain game state via Anchor program
- Cross-guild tournaments

---

## 6. MVP Build Scope

### Build Now
- [ ] Weekly run system (start/end/reset)
- [ ] Run lives (3 per week)
- [ ] Character class selection (Scout, Guardian, Mystic)
- [ ] Class modifiers on mission outcomes
- [ ] Skill tree (3 nodes per class)
- [ ] Skill point earning and spending
- [ ] Boss mission (unlocks day 7)
- [ ] Guild CRUD (create, join, leave)
- [ ] Raid missions (Outpost, Stronghold)
- [ ] Weekly leaderboard
- [ ] Weekly reward calculation
- [ ] Claim reward flow (MVP: off-chain, prepare for on-chain)

### Document Only (Roadmap)
- Referral system
- World events
- Void Gate raid (4+ players)
- On-chain NFT minting for weekly rewards
- Seasonal content
- Trading post
