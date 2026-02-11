# Gear Upgrade System — Multi-Track Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single gear level with 3 independent upgrade tracks (Armor, Engine, Scanner) that reset each weekly run.

**Architecture:** Store upgrade levels on `weekly_runs` table. Each track has 5 levels with escalating costs and effects. Mission service applies all three bonuses to fail rate, duration, and loot respectively.

**Tech Stack:** SQLite migration, shared types, Hono API routes, React frontend panel.

---

## Upgrade Tracks

| Track | Effect per Level | Levels | Max Bonus |
|-------|-----------------|--------|-----------|
| Armor (Shield) | Fail rate reduction: -2%, -3%, -5%, -8%, -12% | 5 | -12% |
| Engine (Zap) | Duration reduction: -5%, -8%, -12%, -16%, -20% | 5 | -20% |
| Scanner (Search) | Loot bonus: +5%, +10%, +15%, +20%, +30% | 5 | +30% |

## Cost Table (same for all tracks)

| Level | Scrap | Crystal | Artifact |
|-------|-------|---------|----------|
| 1 | 10 | — | — |
| 2 | 25 | 5 | — |
| 3 | 50 | 15 | — |
| 4 | 100 | 30 | 1 |
| 5 | 200 | 60 | 3 |

## Data Model

- `weekly_runs` table: add `armor_level`, `engine_level`, `scanner_level` (all INTEGER DEFAULT 0)
- Remove `gear_level` from `characters` table usage
- All levels reset to 0 at start of each weekly run

## API

- `POST /upgrades/:track` — track is `armor | engine | scanner`
- Response includes updated levels + inventory

## Mission Effects

- `failRate = base + classFailMod - armorReduction`
- `duration = base * classDurationMod * (1 - engineReduction)`
- `loot = roll * classLootMod * (1 + scannerBonus)`

## Frontend

- UpgradePanel: 3-column card layout with icon, level, effect, cost, upgrade button
- CharacterCard: show 3 small track level indicators instead of single gear level
- Only visible when active run exists (since levels are per-run)
