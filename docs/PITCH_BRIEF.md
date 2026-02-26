# Pitch Brief — Seeker Node
### Hackathon: Monolith by Solana Mobile

---

## Hackathon Context

**Monolith** — a 5-week sprint for the Solana dApp Store.
Goal: an Android app for the Seeker community.

**Prize Pool:**
- $10,000 × 10 winners
- $5,000 × 5 honorable mentions
- $10,000 in SKR (bonus track)
- Featured dApp Store placement + marketing support from Solana Mobile
- Seeker devices for winning teams
- A call with Toly for winners and honorable mentions

**Judging Criteria (25% each):**
1. **Stickiness & PMF** — retention and fit for the Seeker audience
2. **User Experience** — polish, usability, mobile quality
3. **Innovation / X-factor** — originality and differentiation
4. **Presentation & Demo** — clarity of communication and demo quality

---

## Core Idea

**Key thesis:**
> Seeker Node is the first game that will make Seeker owners open their phone every morning.

**Why this works for judges:**
Stickiness is the hardest criterion to prove. We prove it through *mechanics*, not promises. Missions take 7–24 hours — it's physically impossible not to come back. The weekend boss is a shared event for the entire Seeker audience simultaneously. This isn't "you might get hooked" — this is "you're already hooked."

**What we do NOT center the narrative on:**
- Badges and NFT achievements — these are rewards for playing, not reasons to play
- MagicBlock technical details — those belong in the architecture slide, not the hook
- Listing integrations without connecting them to an emotion

**What we DO center:**
- The weekly loop creates a genuine habit: missions → wait → claim → repeat
- The weekend boss fight is a social event with real stakes for every player simultaneously
- Time is the only resource. No cheats, no skip, no pay-to-win.

---

## Deck Structure (11 slides)

```
1.  Title
2.  Problem / Opportunity
3.  What Is Seeker Node
4.  The Weekly Loop
5.  Gameplay — classes + missions     ← combined
6.  Perks + The Tension               ← combined
7.  World Boss                        ← emotional moment here
8.  Built for Seeker                  ← NEW slide
9.  Solana Integrations
10. Under the Hood — stack + what persists forever  ← combined
11. Closing
```

---

## Slide Narrative

---

### Slide 1 — Title

**Goal:** Capture attention in 3 seconds. One phrase — everything is clear.

**Name:** SEEKER NODE
**Subtitle:** *The idle roguelike built to make Solana Mobile your daily ritual.*
**Hackathon:** Monolith · 2026
**Stack:** Solana Mobile · MagicBlock · Metaplex Core · Jupiter

*Don't overload it. No description. Just the name and one phrase.*

---

### Slide 2 — Problem / Opportunity

**Goal:** Claim the space we occupy.

**Slide thesis:**
> Most apps on mobile are opened because of habit. Solana Mobile needs habit-forming apps.

**Supporting copy:**
DeFi dashboards get checked. Games get *played*. Idle is among the top genres by DAU/MAU retention on mobile. Seeker Node creates a daily ritual baked into real time.

*No specific percentages — the "source?" risk isn't worth it. The genre fact is enough and verifiable.*

---

### Slide 3 — What Is Seeker Node

**Goal:** Explain the project in 10 words.

**Headline:**
> A week-long roguelike where the weekend boss is the whole point.

**Three columns:**

| | |
|---|---|
| **Roguelike Loop** | Every Monday, start fresh. Every week, a unique build from random perks, upgrades, and decisions. |
| **Community Boss** | On Saturday, Protocol Leviathan spawns. Every player fights it together. Kill it — drops. Don't — nobody gets anything. |
| **Real Stakes** | Fail a mission — lose a life. Time can't be accelerated. No cheats. No skip. |

---

### Slide 4 — The Weekly Loop

**Goal:** Show why the player comes back — and that it's baked into the mechanics, not the notifications.

**Key insight for judges:** retention doesn't need to be incentivized — it's built into the design.

| Day | What happens |
|-----|-------------|
| Monday | Pick a class. Start from zero. |
| Mon–Fri | Launch missions → wait → claim → upgrade |
| Saturday | Leviathan spawns. All missions locked. |
| Sun 23:59 | Epoch ends. Drops. Full reset. |

**Emphasis:** Missions take 7–24 hours. Players are physically required to return. This is not a notification trick — return is built into time.

---

### Slide 5 — Gameplay: Classes + Missions

**Goal:** Show depth through simplicity. Don't overload with details.

**Three classes (top half of slide):**

| Class | Identity | Advantage |
|-------|----------|-----------|
| Validator | Fast, aggressive | −15% mission duration |
| Staker | Reliable, defensive | Reduces failure impact. Defensive line. |
| Oracle | Patient, lucky | +30% boss drop chance |

Class is chosen each epoch — experiment freely.

**Three missions (bottom half of slide):**

| Mission | Time | Risk |
|---------|------|------|
| Quick Swap | 7h | 10% |
| Liquidity Run | 12h | 25% |
| Deep Farm | 24h | 40% |

**Caption:** All timers are server-side. The client accelerates nothing. Fair for everyone.

---

### Slide 6 — Perks + The Tension

**Goal:** Show X-factor through the depth of decisions.

**Top — Roguelike Perks:**

Every level-up: choose 1 of 3 random perks — your build emerges from choices made.

- **Common (80%)** — stackable stat bonuses: speed, resources, XP
- **Rare (15%)** — unique mechanics: Lucky Escape, Critical Overload (×1.5 crit on boss)
- **Legendary (5%)** — Chain Reaction: your OVERLOAD buffs your entire guild's damage for 1 hour

**Bottom — The Tension (the key question every epoch):**

```
Spend on upgrades → stronger all week → more perks → higher passive boss damage
        vs.
Hoard for OVERLOAD → one massive crit → more contribution % → better drop odds
```

*"There's no right answer. It depends on your class, your build, and how the boss fight is going."*

**This is the Innovation:** different strategies win in different weeks — depending on perks, class, and boss timing.

---

### Slide 7 — World Boss ← EMOTIONAL MOMENT

**Goal:** Make judges *feel* what this is. Don't explain — show.

**Protocol Leviathan** — the weekly community boss.

- Spawns every Saturday 00:00 UTC
- HP scales with the number of active players that week
- One shared HP bar for the entire audience
- HP updates in real time via WebSocket — every player sees the same thing

**Emotional quote for the slide:**
> When the HP bar drops live across every Seeker at the same time —
> you feel like you're part of something bigger than your own run.

**Mechanics:**
- "Join the Hunt" — the earlier you join, the more passive damage you deal
- OVERLOAD — once per fight. Every remaining resource into one strike. HP drops on everyone's screen at once.
- Kill it → drops by contribution %. Don't kill it → nobody gets anything.

**Second phrase for the slide:** *"Real-time shared state turns it into a communal event — everyone sees the same truth."*

**Demo moment:** show the HP bar with a LIVE indicator — updating live during the presentation.

---

### Slide 8 — Built for Seeker ← NEW

**Goal:** Answer the unasked judge question — "why Seeker specifically?"

**Thesis:**
> Seeker owners are early adopters. Early adopters want three things:
> status, competition, and shared rituals.
> Seeker Node delivers all three — every week.

**Three arguments:**

**1. Status through progression**
Each epoch resets — but rare boss drops persist forever. Leviathan Scale, NFT Artifacts — visible in your wallet. The longer you play, the stronger your base in the next epoch. Early players earn advantages that can't be bought.

**2. Competition through ranking**
Weekly leaderboard by epoch score. #1 earns the Epoch Champion NFT. A new race every week — open to everyone regardless of past performance.

**3. Shared ritual through the boss**
Protocol Leviathan is an event for the *entire* Seeker audience simultaneously. One boss. One HP bar. One weekend. A cultural moment for the community — not a solo session in a quiet corner.

**One-liner for the slide:**
> One-tap ritual: open → claim → launch → close. 30 seconds. Every morning.

*On the slide: only the 3 points (status / competition / ritual) + the one-liner above. The MWA, dApp Store, and Seeker community details — say them out loud, don't put them on the slide.*

**Voice arguments (not on slide):**
- MWA v2 removes all UX friction: one tap, no seed phrase, no extensions
- dApp Store — native discovery for an already-established Seeker audience
- The morning idle pattern is a native mobile use case — not browser, not desktop
- This is the first Seeker-native idle game. Not a port, not a wrapper.

---

### Slide 9 — Solana Integrations

**Goal:** Prove every integration serves a gameplay function. Remove any one — a core mechanic breaks.

| Integration | What it gives the game |
|-------------|----------------------|
| **Solana Mobile / MWA v2** | One tap — sign in. No seed phrase, no friction. Wallet = identity + loot vault. Native to Seeker, deployed on the dApp Store. |
| **MagicBlock Ephemeral Rollups** | Real-time boss HP (WebSocket), zero-fee player progress tracking. 3 Anchor programs on devnet. |
| **Metaplex Core** | Rare drops minted as Core assets — direct to your Seeker wallet. Server mints, zero player signatures. Rare loot lives on-chain forever. |
| **Jupiter** | Intel tab: daily quests (Price Scout, PnL Report) and weekly quests (Micro Swap) for in-game resources. |

**Caption:** *Remove any one of these — a core mechanic breaks.*

---

### Slide 10 — Under the Hood

**Goal:** Convince judges of execution quality. Also show long-term retention.

**Architecture (top):**

- **Frontend:** React 19 + Vite + Tailwind + shadcn/ui → PWA → Bubblewrap → APK
- **Backend:** Hono (TypeScript) + SQLite — server-authoritative, all timers on the server
- **On-chain:** 3 Anchor programs via MagicBlock ER (progress-tracker, boss-tracker, vrf-roller)
- **Resilience:** if ER is unavailable → SQLite + HTTP polling. The game doesn't go down.

**What persists forever (bottom):**

Epochs reset — but not everything:

- **Permanent Rare Loot** — Protocol Core, Leviathan Scale, etc. Stackable passive bonuses.
- **NFT Artifacts** — ~1% drop, hand-crafted, limited supply. The things players screenshot.
- **Data Cores** — +1 inventory slot forever. The longer you play, the stronger your foundation.

*Flywheel: more boss damage → better drops → even more boss damage next epoch.*

---

### Slide 11 — Closing

**Goal:** Be remembered. Not a summary — a moment.

**Headline:**
> Built to be the first thing you open every morning.

**One line below:**
Seeker Node — idle roguelike with a weekly epoch, community world boss, and real stakes. The first game for Solana Mobile whose stickiness is built into the mechanics.

**Stack:** Solana Mobile · MagicBlock ER · Metaplex Core · Jupiter

---

## Demo Plan

**Order (2–3 minutes):**

1. Open the app on Android / PWA
2. Connect wallet via MWA v2 — one tap, show the speed
3. Pick a class, launch a mission — show the timer (server-side)
4. Go to the Boss screen → **HP bar LIVE** — updating in real time
5. OVERLOAD — resources → strike → everyone sees HP drop at once
6. Inventory — show permanent loot from past epochs

**Key moment for judges:** the WebSocket HP bar update is MagicBlock ER in action. Live on-chain state right inside the presentation.

**Must say out loud:**
- Why Solana Mobile: MWA v2 removes all UX friction, dApp Store gives organic discovery
- Why this isn't a port or a wrapper: the mechanic is tied to mobile patterns (open → claim → close, 30 seconds)
- Anti-cheat: the client can't fake anything — everything is server-authoritative

---

## Tone & Language

**Do:**
- Direct and punchy — like a Solana product
- Concrete mechanics instead of abstractions
- One emotional moment (boss + HP bar) — felt, not reasoned
- "The boss is why you play. The rare drop is the chase." — WoW analogy as a cultural reference

**Don't:**
- "Your wallet is your badge / identity / proof of legend" — in the hook
- NFTs and achievements as the main UVP
- More than one stat per slide
- Words: "ecosystem", "synergy", "web3 gaming", "leverage", "empower"

---

## Answer to the Hard Judge Question

**Q: Why does this HAVE to be on Solana Mobile?**

A (say out loud, don't read):
> Mobile Wallet Adapter makes onboarding a single tap — no seed phrase, no extensions, no friction. The dApp Store gives us direct access to the Seeker audience as an already-established community. And the key point: the morning idle pattern — open, claim, launch, close in 30 seconds — is a native mobile use case. Not browser, not desktop. Exactly mobile.
