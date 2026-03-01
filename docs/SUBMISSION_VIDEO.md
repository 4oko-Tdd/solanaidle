# Seeker Node — Demo Video Script
### Monolith Hackathon · 2026

**Format:** Loom or screen record (YouTube/Vimeo accepted)
**Target length:** 2 min 30 sec
**Setup:** Android screen mirror + voice narration

---

## Before You Record

**App state to prepare:**
- [ ] Wallet already connected — skip auth friction entirely
- [ ] Active run in progress (mission timer counting down)
- [ ] Daily challenges loaded with 1–2 partially completed (progress bars visible)
- [ ] Boss spawned via dev bar (boss fight replaces the mission panel on the game tab)
- [ ] Surge active — tap "Toggle Surge" in dev bar to force it on (shows gold "SURGE ACTIVE" banner)
- [ ] At least one permanent loot item — tap "+Boss Loot" in dev bar to inject one
- [ ] Leaderboard has titled players visible — tap "Seed LB" in dev bar

**Dev bar quick actions (tap the "Dev" label with wrench icon at the top of the game screen):**
- Spawn Boss / Kill Boss — always visible, doesn't require active run
- +100 SKR — funds your wallet for OVERLOAD and rerolls
- Skip Timer — completes active mission instantly (only shown when mission is active)
- Toggle Surge — force-enables the 2× surge banner on the boss fight screen
- +Boss Loot — injects a permanent loot item (Leviathan Scale, Protocol Core, etc.) into your collection
- Seed LB — populates the leaderboard with 5 demo players with titles (Leviathan Hunter, Node Operator, etc.)

**Recording tips:**
- Tap slowly — judges need to follow
- Say the line *before* you tap, not after
- One continuous take looks more authentic than cuts

---

## SCENE 1 — Hook [0:00–0:15]

**Action:** App already on screen (game tab, mission timer running)

**Say:**
> "This is Seeker Node — a weekly roguelike idle game built for Solana Mobile.
> Let me show you why someone opens this every single day."

---

## SCENE 2 — Core Loop: Class + Mission [0:15–0:40]

**Action:** Show the character card — class badge visible (Validator / Staker / Oracle)

**Say:**
> "Each epoch you pick a class.
> Validator for speed. Staker for defense. Oracle for better drops.
> The build starts at character creation."

**Action:** Show active mission card with timer counting down

**Say:**
> "Launch a mission. Timer runs on the server.
> The client can't touch it.
> Fair for every player."

**Action:** Show starter perk — it appears in the Base tab under Upgrades at the start of a run

**Say:**
> "A starter perk fires before the first mission.
> Every run feels different."

---

## SCENE 3 — Daily Challenges [0:40–1:00]

**Action:** Scroll to the Challenges panel. Show 3 challenges, at least one with partial progress.

**Say:**
> "Every morning: three daily challenges.
> Progress tracks automatically from normal play.
> You open the app because there's a goal — not just a timer."

**Action:** Tap the reroll button on an incomplete challenge (shows shuffle icon + "8 SKR")

**Say:**
> "Don't like a challenge? Reroll for 8 SKR.
> That's daily SKR demand — the token economy runs all week, not just weekends."

---

## SCENE 3.5 — Guild + Raids [1:00–1:20]

**Action:** Navigate to the Guild tab. Show the guild card — name, member count badge (e.g., 3/5).

**Say:**
> "Guilds — up to 5 players.
> Shared invite code. No wallet permission required to join."

**Action:** Tap "View Raids". Show a raid card with its loot multiplier badge (e.g., "2× loot") and required player count.

**Say:**
> "Guild raids run alongside the boss fight.
> More members — better loot. This is why you share an invite code."

---

## SCENE 4 — Boss Fight [1:20–2:10]

**Action:** Boss fight replaces the mission panel on the game tab when a boss is spawned. Protocol Leviathan HP bar visible.

**Say:**
> "It's the weekend. Leviathan is live."

**Action:** Point to the HP bar — let it update for a second

**Say:**
> "This HP number updates in real time via WebSocket.
> MagicBlock Ephemeral Rollups —
> on-chain state, zero fees, broadcast to every player at once."

**Action:** Show the Surge banner (gold, "SURGE ACTIVE — 2× CONTRIBUTIONS") if active

**Say:**
> "Surge window is open. 45 minutes. Double contribution.
> A push notification went out 10 minutes ago.
> Everyone opens the app at the same time."

**Action:** Tap "Join the Hunt" (if not already joined)

**Say:**
> "Join the hunt. Earlier you join, more passive damage you rack up."

**Action:** Tap OVERLOAD — wallet signature prompt fires — approve it

**Say:**
> "OVERLOAD — every remaining resource into one strike.
> Wallet signature. On-chain."

**Action:** Watch the HP bar drop. Pause for 2 seconds on it.

**Say:**
> "Every player sees that drop.
> Same number. Same moment."

---

## SCENE 5 — Persistence + Leaderboard [2:10–2:35]

**Action:** Navigate to the Base tab. Scroll to the Permanent Collection section. Show a permanent loot item (use "+Boss Loot" in dev bar beforehand to ensure one exists).

**Say:**
> "Epoch ends Sunday. Everything resets —
> level, perks, resources.
> But not this."

**Action:** Tap the item — show its name (Leviathan Scale, Protocol Core, etc.)

**Say:**
> "Dropped from last week's boss kill.
> Metaplex Core NFT — minted to my wallet automatically.
> Zero signatures required from me.
> On-chain forever."

**Action:** Navigate to the Ranks tab. Show a player with a title.

**Say:**
> "Titles on the leaderboard.
> Leviathan Hunter. Network Ghost. Epoch Champion.
> You can't buy them."

---

## SCENE 6 — Close [2:35–2:50]

**Action:** Return to the main game screen (character card + mission timer visible)

**Say:**
> "Seeker Node.
> A 7-day roguelike where the boss fight is the social event,
> the rare drop is the chase,
> and your wallet is your proof of legend.
>
> Built for Seeker. Shipping now."

**Action:** Hold on the screen for 3 seconds. End recording.

---

## Timing Summary

| Scene | Segment | Duration |
|-------|---------|----------|
| 1 | Hook | 0:15 |
| 2 | Core Loop: Class + Mission | 0:25 |
| 3 | Daily Challenges + Reroll | 0:20 |
| 3.5 | Guild + Raids | 0:20 |
| 4 | Boss + Surge + OVERLOAD | 0:50 |
| 5 | Persistence + Leaderboard | 0:25 |
| 6 | Close | 0:15 |
| **Total** | | **~2:50** |

---

## Key Moments — Don't Skip These

These are the moments judges remember:

1. **Mission timer counting down** — proves the core mechanic is running live
2. **Daily challenges with progress bars** — answers "why open it today" before boss even matters
3. **Surge banner (gold, 2×)** — urgency you can see. Closes in 45 minutes.
4. **HP bar dropping after OVERLOAD** — MagicBlock ER live on screen. Real-time on-chain state.
5. **Permanent loot item** — shows something actually persists and has value

---

## Live Demo Talking Points (not in video)

If presenting alongside the video:

- **Why Solana Mobile specifically:** "MWA v2 is one tap — no seed phrase, no extensions. The dApp Store gives direct access to the Seeker audience. Surge push notifications are a mobile-native mechanic. You can't replicate this on web."
- **Anti-cheat:** "The client can't fake anything. Timers, RNG, damage — all server-side."
- **SKR economy:** "Daily demand from rerolls, not just weekend demand. The token runs all week."
- **Why not just another idle game:** "Most idle games are solo. This has one shared HP bar for the entire Seeker audience — dropping in real time when anyone OVERLOADs."
