# Stakes & Narrative — UI/UX Improvement Plan

**Date:** 2026-02-09
**Goal:** Make existing mechanics *feel* more impactful through stakes communication, narrative logging, dynamic risk framing, and wallet signature ceremonies.

---

## Summary of Changes

1. **Run Events Log** — New `run_events` DB table + API + UI timeline
2. **Weekly Run as Central Axis** — Prominent run header with status/lives/stakes text
3. **Dynamic Risk Labels** — Mission cards change name/color/tone based on lives remaining
4. **Wallet Signature Ceremonies** — Sign to begin run, sign to seal final score

---

## 1. Run Events Log

### Database

New table `run_events`:

```sql
CREATE TABLE run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES weekly_runs(id),
  event_type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_run_events_run ON run_events(run_id);
```

**Event types:**
- `run_start` — `{ classId, weekNumber }`
- `mission_success` — `{ missionId, xp, scrap, crystal, artifact, nftDrop }`
- `mission_fail` — `{ missionId, livesRemaining, escaped (boolean) }`
- `death` — `{ livesRemaining, reviveAt }`
- `revive` — `{}`
- `level_up` — `{ newLevel }`
- `boss_kill` — `{ rewards }`
- `skill_unlock` — `{ skillId, skillName }`
- `nft_drop` — `{ nftName, missionId }`
- `run_end` — `{ finalScore, missionsCompleted, cause: 'death' | 'voluntary' }`

### API

- `GET /runs/:id/events` — returns all events for a run, ordered by created_at
- Events are inserted inline in existing service methods (mission-service, run-service, skill-service)

### Frontend

New `RunLog.tsx` component — compact vertical timeline.

Each entry shows:
- **Day indicator:** "Day X" calculated from `run.week_start` vs `event.created_at`
- **Icon:** per event type (trophy, skull, arrow-up, sparkles, etc.)
- **Text:** narrative description generated client-side from event data

Example entries:
- "Day 1 — Scout mission successful. +15 scrap, +22 XP"
- "Day 2 — Expedition failed. Lost 1 life. (2 remaining)"
- "Day 3 — Unlocked Lucky Escape"
- "Day 5 — RARE: NFT Drop from Deep Dive!"
- "Day 6 — Death. Reviving..."

Placement: accessible from the Game tab, collapsible section below the mission panel.

---

## 2. Weekly Run as Central Axis

### Run Header (top of GameDashboard)

Persistent bar showing:
- **"Week {N} Run"** — week number of the year
- **Lives:** filled/broken heart icons + text when critical
- **Score:** current score
- **Status badge:** `ALIVE` (green) / `DEAD` (red pulse) / `RUN OVER` (gray)

### Stakes Text (on mission panel)

Contextual warnings based on lives:
- **3 lives:** missions show normal fail rate
- **2 lives:** amber warning — "Careful. 2 lives remaining."
- **1 life:** red banner — **"FAILURE MEANS DEATH. 1 LIFE REMAINING."**
- **Dead:** grayed missions — "Reviving in XX:XX"
- **Run over:** "Run ended. Final score: XXX. Start a new run?"

No backend changes needed — all data already available from `GET /runs/current`.

---

## 3. Dynamic Risk Labels

### Label Matrix

Mission cards get dynamic names based on lives remaining:

| Lives | Scout (10%) | Expedition (25%) | Deep Dive (40%) | Boss (50%) |
|-------|------------|-------------------|------------------|------------|
| 3     | Safe Run   | Risky Expedition  | Dangerous Dive   | Boss Fight |
| 2     | Careful Run | High-Risk Mission | Perilous Dive    | Do or Die  |
| 1     | Last Chance | Suicide Mission   | Death Wish       | Final Stand |

### Visual Treatment

- **Safe** (3 lives, low fail): green tint, normal card
- **Risky** (2 lives or medium fail): amber border
- **Dangerous** (1 life or high fail): red border, pulse animation
- **Critical** (1 life + high fail): dark red background, skull icon

### Fail Rate Display

Change from "25%" to **"25% chance of death"**.

All values use the already-adjusted class modifier rates.

---

## 4. Wallet Signature Ceremonies

### Start Run Signature

**Trigger:** Player picks class and taps "Begin Run"

**Confirmation dialog:**
- Title: "Commit to This Run"
- Body: "You are about to begin Week {N} as a {Class}. 3 lives. No turning back."
- Button: "Sign & Begin"

**Message:** `"BEGIN_RUN:week{N}:{classId}:{timestamp}"`

**Storage:** New column `weekly_runs.start_signature TEXT`

**Flow:** Dialog → signMessage → POST /runs/start with signature → run created

### End Run Signature

**Trigger:** Run ends (0 lives or voluntary) and player views results

**Results screen:**
- Full run summary: score, missions completed, deaths, loot collected
- Run log highlights
- Button: "Seal Your Fate" / "Claim Final Score"

**Message:** `"END_RUN:week{N}:score:{score}:{timestamp}"`

**Storage:** New column `weekly_runs.end_signature TEXT`

**Flow:** Results screen → signMessage → POST /runs/:id/finalize with signature → leaderboard entry created

**Note:** If run ends from 0 lives, the run is functionally over but leaderboard entry isn't finalized until signature. Player sees "Run Over" screen with sign prompt on next visit.

### DB Changes

```sql
ALTER TABLE weekly_runs ADD COLUMN start_signature TEXT;
ALTER TABLE weekly_runs ADD COLUMN end_signature TEXT;
```

---

## Implementation Order

1. **DB migrations** — run_events table + weekly_runs signature columns
2. **Backend: run events** — insert events in existing service methods
3. **Backend: signature endpoints** — modify /runs/start, add /runs/:id/finalize
4. **Frontend: RunLog** — new component with timeline UI
5. **Frontend: Run Header** — redesign top of GameDashboard
6. **Frontend: Dynamic Risk Labels** — update MissionPanel with label logic + visuals
7. **Frontend: Signature Flows** — start run dialog, end run results screen
8. **Frontend: Stakes Text** — contextual warnings on mission panel

---

## Files to Modify

### Backend
- `apps/api/src/db/schema.ts` — new table + columns
- `apps/api/src/services/mission-service.ts` — insert events on success/fail
- `apps/api/src/services/run-service.ts` — insert events on start/end, signature storage
- `apps/api/src/services/skill-service.ts` — insert event on unlock
- `apps/api/src/services/character-service.ts` — insert event on level up
- `apps/api/src/routes/runs.ts` — new /events endpoint, modify /start, add /finalize

### Frontend
- `apps/web/src/features/game/GameDashboard.tsx` — new run header layout
- `apps/web/src/features/game/RunStatus.tsx` — enhanced with week number, status badge
- `apps/web/src/features/game/MissionPanel.tsx` — dynamic labels, risk colors, stakes text
- `apps/web/src/features/game/ClassPicker.tsx` — signature flow on class selection
- `apps/web/src/features/game/RunLog.tsx` — NEW: timeline component
- `apps/web/src/features/game/RunEndScreen.tsx` — NEW: end-of-run results + signature
- `apps/web/src/features/game/MissionResultDialog.tsx` — enhanced failure messaging
