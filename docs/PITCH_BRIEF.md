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
> Seeker Node is the first game that makes Seeker owners open their phone every morning — and have a reason to come back that afternoon too.

**Why this works for judges:**
Stickiness is the hardest criterion to prove. We prove it through *mechanics*, not promises:
- Missions take 7–24 hours — return is physically required
- Daily challenges refresh every day with new goals tied to real progress
- Surge windows send push notifications 10 minutes before they open — real-time urgency
- The weekend boss is a shared event for the entire Seeker audience simultaneously

This isn't "you might get hooked" — this is "you're already hooked."

**What we do NOT center the narrative on:**
- Badges and NFT achievements — these are rewards for playing, not reasons to play
- MagicBlock technical details — those belong in the architecture slide, not the hook
- Listing integrations without connecting them to an emotion

**What we DO center:**
- The weekly loop creates a genuine daily habit: missions → wait → claim → challenges → repeat
- Surge windows turn a passive game into an active event at specific moments
- The weekend boss fight is a social event with real stakes for every player simultaneously
- Time is the only resource. No cheats, no skip, no pay-to-win.

---

## Deck Structure (12 slides)

```
1.  Title
2.  Problem / Opportunity
3.  What Is Seeker Node
4.  The Weekly Loop
5.  Daily Challenges          ← NEW — the stickiness proof
6.  Gameplay — classes + missions
7.  Perks + The Tension       ← updated: starter perk, SKR reroll
8.  World Boss + Surge        ← updated: surge windows and notifications
9.  Built for Seeker          ← updated: leaderboard titles
10. Solana Integrations       ← updated: full SKR economy
11. Under the Hood
12. Closing
```

---

## Slide Narrative

---

### Slide 1 — Title

**Goal:** Capture attention in 3 seconds. One phrase — everything is clear.

**Name:** SEEKER NODE
**Subtitle:** *The idle roguelike built to make Solana Mobile your daily ritual.*
**Hackathon:** Monolith · 2026
**Stack:** Solana Mobile · MagicBlock · Metaplex Core

*Don't overload it. No description. Just the name and one phrase.*

---

### Slide 2 — Problem / Opportunity

**Goal:** Claim the space we occupy.

**Slide thesis:**
> Most apps on mobile are opened because of habit. Solana Mobile needs habit-forming apps.

**Supporting copy:**
DeFi dashboards get checked. Games get *played*. Idle is among the top genres by DAU/MAU retention on mobile. Seeker Node creates a daily ritual baked into real time — missions that require return, challenges that reset daily, and surge windows that create moments of urgency.

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

| When | What happens |
|------|-------------|
| Monday | Pick a class. Start from zero. Receive your starter perk. |
| Daily | 3 challenges refresh — tied to missions, boss, and raids. New goals every day. |
| Mon–Fri | Launch missions → wait 7–24h → claim → upgrade → choose perks |
| Saturday 08:00, 20:00 | Surge windows open — 45 min of 2× contributions. Push notification 10 min before. |
| Saturday 00:00 | Leviathan spawns. All missions lock. |
| Sun 23:59 | Epoch ends. Drops. Full reset. |

**Emphasis:** Return is multi-layered: missions require it (timer), challenges reward it (daily), surge windows create urgency (real-time), and the boss demands it (weekend). Every layer is mechanical, not just a notification.

---

### Slide 5 — Daily Challenges ← THE STICKINESS PROOF

**Goal:** Show that the game has reasons to open it every day — not just when the timer rings.

**What it is:**
Every day, 3 challenges refresh. Each has a progress bar and a completion reward.

**Example challenges:**
- "Complete 2 missions" → +50 Scrap
- "Deal 500 Scrap worth of boss damage" → +10 Crystal
- "Join the boss fight today" → +5 Crystal
- "Complete a Liquidity Run" → rare drop chance

**The SKR loop:**
Don't like a challenge? Reroll it for 8 SKR. This creates a consistent daily SKR demand that extends the economy beyond the boss weekend.

**Why this matters for PMF:**
Daily challenges are the #1 stickiness driver in mobile idle games. They give players a goal every morning — independent of the mission timer. Players who completed their missions yesterday still have a reason to open the app today.

**Judge-facing stat:** 3 challenges × 7 days = 21 goal completions per epoch, before the boss even spawns.

---

### Slide 6 — Gameplay: Classes + Missions

**Goal:** Show depth through simplicity. Don't overload with details.

**Three classes (top half of slide):**

| Class | Identity | Advantage |
|-------|----------|-----------|
| Validator | Fast, aggressive | −15% mission duration |
| Staker | Reliable, defensive | Reduces failure impact |
| Oracle | Patient, lucky | +30% boss drop chance |

Class is chosen each epoch — experiment freely.

**Three missions (bottom half of slide):**

| Mission | Time | Risk |
|---------|------|------|
| Quick Swap (fast slot) | 7h | 10% |
| Liquidity Run | 12h | 25% |
| Deep Farm | 24h | 40% |

**New: Second Mission Slot**
Unlock a parallel fast slot for 20 SKR per epoch. Run a Quick Swap in the background while your main mission is active. Double the throughput. Pure economy — no risk to your main run.

**Caption:** All timers are server-side. The client accelerates nothing. Fair for everyone.

---

### Slide 7 — Perks + The Tension

**Goal:** Show X-factor through the depth of decisions.

**Top — Roguelike Perks:**

Every level-up: choose 1 of 3 random perks — your build emerges from choices made.

- **Common (80%)** — stackable stat bonuses: speed, resources, XP
- **Rare (15%)** — unique mechanics: Lucky Escape, Critical Overload (×1.5 crit on boss)
- **Legendary (5%)** — Chain Reaction: your OVERLOAD buffs your entire guild's damage for 1 hour

**New: Starter Perk**
Every epoch begins with a bonus perk offer before you've even launched a mission. The build starts at character creation, not level-up. First decision of the week.

**New: Perk Reroll (10 SKR)**
Don't like the options on a level-up? Spend 10 SKR to refresh the offer. The 3-perk choice you see isn't the only hand you get dealt.

**Bottom — The Tension (the key question every epoch):**

```
Spend on upgrades → stronger all week → more perks → higher passive boss damage
        vs.
Hoard for OVERLOAD → one massive crit → more contribution % → better drop odds
        vs.
Spend SKR on utilities → reroll bad perks, unlock fast slot, amplify OVERLOAD
```

*"There's no right answer. It depends on your class, your build, how the boss fight is going, and what your daily challenges are asking for."*

**This is the Innovation:** three competing resource sinks with different time horizons — weekly (upgrades), boss-moment (OVERLOAD), and persistent (SKR economy).

---

### Slide 8 — World Boss + Surge Windows ← EMOTIONAL MOMENT

**Goal:** Make judges *feel* what this is. Show the boss fight has urgency built into the time itself.

**Protocol Leviathan** — the weekly community boss.

- Spawns every Saturday 00:00 UTC
- HP scales with the number of active players that week
- One shared HP bar for the entire audience
- HP updates in real time via WebSocket — every player sees the same thing

**NEW: Surge Windows**
Three windows per weekend: **Saturday 08:00**, **Saturday 20:00**, **Sunday 08:00** UTC — 45 minutes each.

During a surge window: contributions deal **2× passive damage**. The optimal play becomes obvious. The timing creates genuine urgency.

Push notification fires 10 minutes before each window opens: *"Surge Window Opening Soon — Leviathan becomes vulnerable in 10 minutes."*

**Emotional quote for the slide:**
> When the surge notification fires and every Seeker owner opens the app at the same moment —
> you're not playing a game. You're participating in a shared event.

**Mechanics summary:**
- "Join the Hunt" — the earlier you join, the more passive damage you deal
- Surge windows — 3 moments per weekend where OVERLOAD timing matters most
- OVERLOAD — once per fight. Every remaining resource into one strike. HP drops on everyone's screen at once.
- Kill it → drops by contribution %. Don't kill it → nobody gets anything.

**Demo moment:** show the live HP bar dropping during a surge window, with the gold surge banner active. MagicBlock ER in action — real-time on-chain state in the presentation.

---

### Slide 9 — Built for Seeker

**Goal:** Answer the unasked judge question — "why Seeker specifically?"

**Thesis:**
> Seeker owners are early adopters. Early adopters want three things:
> status, competition, and shared rituals.
> Seeker Node delivers all three — every week, and every day.

**Three arguments:**

**1. Status through progression**
Each epoch resets — but rare boss drops persist forever. Leviathan Scale, NFT Artifacts — visible in your wallet. The longer you play, the stronger your base in the next epoch. Early players earn advantages that can't be bought.

Earned titles display on the leaderboard: *Node Operator* (10 missions), *Network Ghost* (100 missions), *Leviathan Hunter* (10 boss kills), *Epoch Champion* (20 epochs). Cosmetic — zero gameplay edge — but visible to every player watching the board.

**2. Competition through ranking**
Weekly leaderboard by epoch score. #1 earns the Epoch Champion title. A new race every week — open to everyone regardless of past performance.

**3. Shared ritual through the boss**
Protocol Leviathan is an event for the *entire* Seeker audience simultaneously. One boss. One HP bar. Three surge windows. A cultural moment for the community — not a solo session in a quiet corner.

**One-liner for the slide:**
> One-tap ritual: open → claim → challenges → launch → close. 60 seconds. Every morning.

*On the slide: only the 3 points (status / competition / ritual) + the one-liner above. The MWA, dApp Store, and Seeker community details — say them out loud, don't put them on the slide.*

**Voice arguments (not on slide):**
- MWA v2 removes all UX friction: one tap, no seed phrase, no extensions
- dApp Store — native discovery for an already-established Seeker audience
- The morning idle pattern is a native mobile use case — not browser, not desktop
- This is the first Seeker-native idle game. Not a port, not a wrapper.
- Push notifications tied to surge windows are mobile-native — impossible to replicate on web

---

### Slide 10 — Solana Integrations

**Goal:** Prove every integration serves a gameplay function. Remove any one — a core mechanic breaks.

| Integration | What it gives the game |
|-------------|----------------------|
| **Solana Mobile / MWA v2** | One tap — sign in. No seed phrase, no friction. Wallet = identity + loot vault. Native to Seeker, deployed on the dApp Store. |
| **SKR (Solana Mobile token)** | The in-game economy beyond the boss: perk rerolls (10 SKR), challenge rerolls (8 SKR), second mission slot (20 SKR), overload amplifier (18 SKR). Real token. Real utility. |
| **MagicBlock Ephemeral Rollups** | Real-time boss HP (WebSocket), zero-fee player progress tracking, VRF epoch bonuses. Single Anchor program on devnet. |
| **Metaplex Core** | Rare drops minted as Core assets — direct to your Seeker wallet. Server mints, zero player signatures. Rare loot lives on-chain forever. |

**Caption:** *Remove any one of these — a core mechanic breaks.*

**SKR Economy breakdown (for voice, not on slide):**

| Purchase | Cost | Frequency |
|----------|------|-----------|
| Perk Reroll | 10 SKR | Any level-up |
| Challenge Reroll | 8 SKR | Daily |
| Second Mission Slot | 20 SKR | Epoch start |
| Overload Amplifier | 18 SKR | Boss weekend |
| Reconnect Protocol | 25 SKR | Boss weekend |
| Raid License | 35 SKR | Boss weekend |

SKR has a reason to exist every day of the week — not just during the boss fight.

---

### Slide 11 — Under the Hood

**Goal:** Convince judges of execution quality. Also show long-term retention.

**Architecture (top):**

- **Frontend:** Expo React Native Android app (primary Seeker client) + React/Vite web companion
- **Backend:** Hono (TypeScript) + SQLite — server-authoritative, all timers on the server
- **On-chain:** Single unified Anchor program via MagicBlock ER (player progress + boss HP + VRF)
- **Resilience:** if ER is unavailable → SQLite + HTTP polling. The game doesn't go down.

**What persists forever (bottom):**

Epochs reset — but not everything:

- **Permanent Rare Loot** — Protocol Core, Leviathan Scale, etc. Stackable passive bonuses.
- **NFT Artifacts** — ~1% drop, hand-crafted, limited supply. The things players screenshot.
- **Data Cores** — +1 inventory slot forever. The longer you play, the stronger your foundation.
- **Leaderboard Titles** — Earned through lifetime play. Network Ghost, Leviathan Hunter, Epoch Champion. Can't be bought.

*Flywheel: more boss damage → better drops → even more boss damage next epoch.*

---

### Slide 12 — Closing

**Goal:** Be remembered. Not a summary — a moment.

**Headline:**
> Built to be the first thing you open every morning. And the second thing. And the third.

**One line below:**
Seeker Node — idle roguelike with a weekly epoch, daily challenges, surge windows, community world boss, and real stakes. The first game for Solana Mobile whose stickiness is built into the mechanics.

**Stack:** Solana Mobile · MagicBlock ER · Metaplex Core · SKR

---

## Demo Plan

**Order (2–3 minutes):**

1. Open the Android Expo app on Seeker
2. Connect wallet via MWA v2 — one tap, show the speed
3. Show Daily Challenges panel — 3 active quests with progress bars
4. Pick a class, launch a mission — show the timer (server-side). Show the starter perk offer fires immediately.
5. Go to the Boss screen → **HP bar LIVE** — updating in real time
6. Show a surge window banner active (gold, "2× Contributions")
7. OVERLOAD — resources → strike → everyone sees HP drop at once
8. Inventory — show permanent loot and a leaderboard title

**Key moments for judges:**
- Daily challenges answer "why open it today?" before the mission timer even matters
- The surge window banner is urgency you can see — it closes in 45 minutes
- The WebSocket HP bar update is MagicBlock ER in action. Live on-chain state right inside the presentation.
- The leaderboard title is persistent social status — earned, not bought

**Must say out loud:**
- Why Solana Mobile: MWA v2 removes all UX friction, dApp Store gives organic discovery
- Why this isn't a port or a wrapper: surge push notifications, daily challenges, and morning idle pattern are all mobile-native
- Anti-cheat: the client can't fake anything — everything is server-authoritative
- SKR: daily demand, not just weekend demand. The economy runs all week.

---

## Tone & Language

**Do:**
- Direct and punchy — like a Solana product
- Concrete mechanics instead of abstractions
- One emotional moment (boss + surge + HP bar) — felt, not reasoned
- "The boss is why you play. The rare drop is the chase." — WoW analogy as a cultural reference

**Don't:**
- "Your wallet is your badge / identity / proof of legend" — in the hook
- NFTs and achievements as the main UVP
- More than one stat per slide
- Words: "ecosystem", "synergy", "web3 gaming", "leverage", "empower"

---

## Answer to the Hard Judge Questions

**Q: Why does this HAVE to be on Solana Mobile?**

A (say out loud, don't read):
> Mobile Wallet Adapter makes onboarding a single tap — no seed phrase, no extensions, no friction. The dApp Store gives us direct access to the Seeker audience as an already-established community. And the key point: the morning idle pattern — open, claim, check challenges, launch — is a native mobile use case. Push notifications that fire 10 minutes before a surge window? That's mobile. Not browser, not desktop. Exactly mobile.

**Q: Why would someone keep playing after week 1?**

A:
> Three reasons. First, daily challenges give them a goal every morning — independent of whether their mission is done. Second, their permanent loot compounds — boss drops carry over every epoch, making them stronger next week. Third, the leaderboard titles show lifetime achievement — and you can't buy "Network Ghost" or "Leviathan Hunter". You earn them.

**Q: You're competing with every other idle game on mobile. What's different?**

A:
> Most idle games are solo experiences. This one has a shared weekly event for the entire Seeker audience — one HP bar, visible to everyone at once, dropping in real time when anyone hits OVERLOAD. And surge windows turn three specific moments every weekend into a communal rush. Nobody else on the dApp Store has this.
