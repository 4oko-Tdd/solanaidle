# Project Brief — Solana Idle

**Solana Mobile Hackathon Submission**

## Vision

A wallet-native idle / mission-based game that creates daily habits around Solana Mobile usage.

## Context

Solana Mobile needs apps that:
- Are used **daily**, not once
- Are embedded in the **rhythm of life**
- Use **wallet + signatures + on-chain ownership** as core mechanics — not just a login button

## What It Is

- Idle / text-based game
- Mobile-first
- Wallet-native
- Time-based engagement loop

**Not** DeFi, not P2E, not a casino.

## Core Concept

The player manages a character and sends them on long missions (7h / 12h / 24h / 48h).

During a mission the character may:
- Survive or perish
- Find loot / resources
- Advance progression

Rewards:
- MVP: off-chain (resources, upgrades)
- Rare events: claimable NFT to wallet

## Why Solana Mobile

- Wallet = account (sign-in via signMessage)
- Wallet = ownership (claim rewards)
- Wallet = ritual (confirm important actions)
- Future: Seed Vault UX, one-tap claim, device-native experience

> "This app is designed to create a daily habit around Solana Mobile usage."

## Core Engagement Loop

1. Open app
2. Send character on mission
3. Wait (real time)
4. Return to app
5. Claim result
6. Upgrade character
7. Repeat

No infinite farming. Time is the core limiter. Decisions have consequences.

## MVP Scope

### In Scope
- Wallet sign-in (Solana wallet)
- 1 character
- 3 mission types (short / medium / long)
- Server-side mission timer
- Mission result (success / fail + reward)
- Resource inventory
- 1 upgrade type
- Claim reward flow
- Basic UI (text + minimal graphics)

### Out of Scope (intentionally)
- Marketplace
- PVP
- Trading
- Full token economy
- Fully on-chain gameplay

## Economy (MVP)

- No "earn money" in MVP
- Progression over profit
- Resources are not tradable
- NFTs are rare trophies / badges
- No speculation layer

Future (noted, not built): seasons, leaderboard, limited tradable items.

## Anti-Cheat (MVP)

- All timers are server-side
- Users cannot accelerate missions
- Claim requires `now >= end_time`
- RNG is server-side (upgradable to commit-reveal)

## Hackathon Value Proposition

- Creates daily active usage
- Encourages long-term retention
- Uses wallet as a core mechanic
- Not another DeFi app
- Mobile-first by design

> "A wallet-native idle game designed to build daily habits on Solana Mobile."

## Post-Hackathon Vision

- Publish to Solana dApp Store
- Seasons, events, NFT economy
- Example of non-DeFi Solana Mobile app
