# MagicBlock ER Bug Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 bugs in the MagicBlock Ephemeral Rollups backend services and mobile hook.

**Architecture:** All fixes are in TypeScript (API services + mobile hook). No Rust program changes needed. No new dependencies. Verification is `pnpm --filter api build` (tsc) after each task since no test infra exists yet.

**Tech Stack:** TypeScript, `@solana/web3.js`, Hono API, Expo/React Native

---

## Verification Command (run after every task)
```bash
pnpm --filter api build
```
Expected: exits 0, no TypeScript errors.

---

### Task 1: Shared server keypair singleton

**Why:** `er-service.ts` and `boss-er-service.ts` each call `Keypair.generate()` when `SERVER_KEYPAIR` env var is absent, producing two different keys and therefore two different PDA authorities.

**Files:**
- Create: `apps/api/src/services/server-keypair.ts`
- Modify: `apps/api/src/services/er-service.ts`
- Modify: `apps/api/src/services/boss-er-service.ts`

**Step 1: Create the singleton module**

Create `apps/api/src/services/server-keypair.ts`:

```typescript
import { Keypair } from "@solana/web3.js";

function loadKeypair(): Keypair {
  try {
    const keyStr = process.env.SERVER_KEYPAIR;
    if (keyStr) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyStr)));
    }
  } catch {
    console.warn("[Keypair] Failed to parse SERVER_KEYPAIR, using ephemeral key");
  }
  const kp = Keypair.generate();
  console.log(`[Keypair] Generated ephemeral server keypair: ${kp.publicKey.toBase58()}`);
  console.log("[Keypair] Set SERVER_KEYPAIR env var for persistent key in production");
  return kp;
}

export const serverKeypair = loadKeypair();
```

**Step 2: Replace keypair loading in `er-service.ts`**

In `apps/api/src/services/er-service.ts`:

Remove the entire `let serverKeypair: Keypair; try { ... } catch { ... }` block (lines 64–83).

Add at the top of the imports:
```typescript
import { serverKeypair } from "./server-keypair.js";
```

Also remove the `Keypair` import from `@solana/web3.js` (it's no longer needed locally) — keep the rest of the import.

**Step 3: Replace keypair loading in `boss-er-service.ts`**

In `apps/api/src/services/boss-er-service.ts`:

Remove the entire `let serverKeypair: Keypair; try { ... } catch { ... }` block (lines 53–72).

Add at the top of the imports:
```typescript
import { serverKeypair } from "./server-keypair.js";
```

Also remove `Keypair` from the `@solana/web3.js` import if it's now unused.

**Step 4: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 5: Commit**
```bash
git add apps/api/src/services/server-keypair.ts apps/api/src/services/er-service.ts apps/api/src/services/boss-er-service.ts
git commit -m "fix(er): shared server keypair singleton to avoid split ephemeral keys"
```

---

### Task 2: Cache ER connections (prevent WebSocket leak)

**Why:** Both services call `new Connection(url, "confirmed")` on every `resolveErConnection` call, leaking WebSocket connections.

**Files:**
- Modify: `apps/api/src/services/er-service.ts`
- Modify: `apps/api/src/services/boss-er-service.ts`

**Step 1: Add connection cache to `er-service.ts`**

After the `erConnection` constant (around line 88), add:
```typescript
const erConnectionCache = new Map<string, Connection>();
```

In `resolveErConnection`, replace:
```typescript
return new Connection(url, "confirmed");
```
with:
```typescript
const cached = erConnectionCache.get(url);
if (cached) return cached;
const conn = new Connection(url, "confirmed");
erConnectionCache.set(url, conn);
return conn;
```

**Step 2: Add connection cache to `boss-er-service.ts`**

After the `erConnection` constant (around line 80), add:
```typescript
const erConnectionCache = new Map<string, Connection>();
```

In `resolveErConnection` of boss-er-service.ts, replace:
```typescript
return new Connection(url, "confirmed");
```
with:
```typescript
const cached = erConnectionCache.get(url);
if (cached) return cached;
const conn = new Connection(url, "confirmed");
erConnectionCache.set(url, conn);
return conn;
```

**Step 3: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 4: Commit**
```bash
git add apps/api/src/services/er-service.ts apps/api/src/services/boss-er-service.ts
git commit -m "fix(er): cache resolved ER connections to prevent WebSocket leak"
```

---

### Task 3: Cache router endpoint lookups per PDA

**Why:** `resolveErConnection` makes an HTTP request to the MagicBlock router on every single ER call. The delegation endpoint for a PDA doesn't change mid-epoch.

**Files:**
- Modify: `apps/api/src/services/er-service.ts`
- Modify: `apps/api/src/services/boss-er-service.ts`

**Step 1: Add endpoint cache to `er-service.ts`**

After the `erConnectionCache` map, add:
```typescript
const resolvedErEndpoints = new Map<string, string>(); // pdaBase58 → fqdn URL
```

In `resolveErConnection`, wrap the router fetch with a cache check. Replace the body of the try block:
```typescript
// Check cache first
const cached = resolvedErEndpoints.get(accountPda.toBase58());
if (cached) {
  return erConnectionCache.get(cached) ?? (() => {
    const conn = new Connection(cached, "confirmed");
    erConnectionCache.set(cached, conn);
    return conn;
  })();
}

const resp = await fetch(ER_ROUTER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getDelegationStatus",
    params: [accountPda.toBase58()],
  }),
});
const json = await resp.json() as { result?: { isDelegated: boolean; fqdn?: string } };
if (json.result?.isDelegated && json.result.fqdn) {
  const url = json.result.fqdn.replace(/\/$/, "");
  resolvedErEndpoints.set(accountPda.toBase58(), url);
  if (url !== ER_VALIDATOR_URL) {
    console.log(`[ER] PDA delegated to ${url} (not default ${ER_VALIDATOR_URL})`);
  }
  const existing = erConnectionCache.get(url);
  if (existing) return existing;
  const conn = new Connection(url, "confirmed");
  erConnectionCache.set(url, conn);
  return conn;
}
```

**Step 2: Same cache in `boss-er-service.ts`**

After the `erConnectionCache` map in boss-er-service.ts, add:
```typescript
const resolvedErEndpoints = new Map<string, string>(); // pdaBase58 → fqdn URL
```

Apply the same router-cache pattern to `resolveErConnection` in boss-er-service.ts (identical code, different log prefix `[BossER]`).

**Step 3: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 4: Commit**
```bash
git add apps/api/src/services/er-service.ts apps/api/src/services/boss-er-service.ts
git commit -m "fix(er): cache router endpoint per PDA to reduce HTTP overhead"
```

---

### Task 4: Fix `updateProgressOnER` hardcoded `"scout"` classId

**Why:** The auto-init fallback in `updateProgressOnER` passes `"scout"` regardless of the player's actual class, writing wrong on-chain data for guardian/mystic players.

**Files:**
- Modify: `apps/api/src/services/er-service.ts`
- Modify: `apps/api/src/services/mission-service.ts`
- Modify: `apps/api/src/routes/runs.ts`

**Step 1: Add `classId` param to `updateProgressOnER` in `er-service.ts`**

Change the function signature from:
```typescript
export async function updateProgressOnER(
  playerWallet: string,
  weekStart: number,
  score: number,
  missionsCompleted: number,
  deaths: number,
  bossDefeated: boolean
): Promise<void>
```
to:
```typescript
export async function updateProgressOnER(
  playerWallet: string,
  weekStart: number,
  score: number,
  missionsCompleted: number,
  deaths: number,
  bossDefeated: boolean,
  classId = "scout"
): Promise<void>
```

In the body, replace the hardcoded `"scout"`:
```typescript
// Before:
await initializeProgressOnChain(playerWallet, weekStart, "scout");
// After:
await initializeProgressOnChain(playerWallet, weekStart, classId);
```
(There are two occurrences — lines ~437 and ~517. Fix both.)

**Step 2: Update `mission-service.ts` caller**

At line ~365, the query already fetches `wallet_address, week_start, score, missions_completed, boss_defeated` from `weekly_runs`. Add `class_id` to the query:

```typescript
const runRow = db.prepare(
  "SELECT wallet_address, week_start, score, missions_completed, boss_defeated, class_id FROM weekly_runs WHERE id = ?"
).get(runId) as {
  wallet_address: string;
  week_start: string;
  score: number;
  missions_completed: number;
  boss_defeated: number;
  class_id: string;
} | undefined;
```

Then pass `runRow.class_id` as the last argument:
```typescript
updateProgressOnER(
  runRow.wallet_address,
  weekStartTs,
  runRow.score,
  runRow.missions_completed,
  deathCount?.cnt ?? 0,
  runRow.boss_defeated === 1,
  runRow.class_id       // ← add this
).catch(() => {});
```

**Step 3: Update `runs.ts` caller**

At line ~41 in `apps/api/src/routes/runs.ts`, `body.classId` is already in scope:
```typescript
// Before:
.then(() => updateProgressOnER(wallet, weekStartTs, 0, 0, 0, false))
// After:
.then(() => updateProgressOnER(wallet, weekStartTs, 0, 0, 0, false, body.classId))
```

**Step 4: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 5: Commit**
```bash
git add apps/api/src/services/er-service.ts apps/api/src/services/mission-service.ts apps/api/src/routes/runs.ts
git commit -m "fix(er): pass actual classId to updateProgressOnER instead of hardcoded scout"
```

---

### Task 5: Lazy-sync `lastOnChainDamage` on server restart

**Why:** After a restart `lastOnChainDamage` is empty. `applyDamageOnER` computes `delta = totalDamageSoFar - 0` and sends the full cumulative damage again, doubling `total_damage` on-chain (Rust uses `saturating_add`).

**BossState byte layout** (needed to parse `total_damage`):
```
offset 0:  discriminator (8 bytes)
offset 8:  authority     (32 bytes)
offset 40: week_start    (8 bytes)
offset 48: max_hp        (8 bytes)
offset 56: current_hp    (8 bytes)
offset 64: total_damage  (8 bytes)  ← read this
```

**Files:**
- Modify: `apps/api/src/services/boss-er-service.ts`

**Step 1: Add helper to read `total_damage` from ER**

After the `lastOnChainDamage` Map declaration, add:

```typescript
const BOSS_TOTAL_DAMAGE_OFFSET = 64; // discriminator(8) + authority(32) + week_start(8) + max_hp(8) + current_hp(8)

/**
 * Read the current total_damage from the boss PDA on the ER validator.
 * Used to re-sync lastOnChainDamage after a server restart.
 * Returns 0 if the PDA doesn't exist or can't be read.
 */
async function readTotalDamageFromER(bossPda: PublicKey, weekStart: number): Promise<number> {
  try {
    const targetEr = await resolveErConnection(bossPda);
    const accountInfo = await targetEr.getAccountInfo(bossPda);
    if (!accountInfo?.data || accountInfo.data.length < BOSS_TOTAL_DAMAGE_OFFSET + 8) return 0;
    return Number(accountInfo.data.readBigUInt64LE(BOSS_TOTAL_DAMAGE_OFFSET));
  } catch {
    return 0;
  }
}
```

**Step 2: Add lazy sync at top of `applyDamageOnER`**

At the very start of `applyDamageOnER`, after the `const key = weekStart.toString();` line, add:

```typescript
// Lazy sync: if the server restarted, lastOnChainDamage is empty.
// Read current total_damage from ER to avoid re-sending stale deltas.
if (!lastOnChainDamage.has(key)) {
  const [bossPda] = deriveBossPda(weekStart);
  const onChainDamage = await readTotalDamageFromER(bossPda, weekStart);
  lastOnChainDamage.set(key, onChainDamage);
  if (onChainDamage > 0) {
    console.log(`[BossER] Synced lastOnChainDamage from ER after restart: week=${weekStart}, total_damage=${onChainDamage}`);
  }
}
```

**Step 3: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 4: Commit**
```bash
git add apps/api/src/services/boss-er-service.ts
git commit -m "fix(er): lazy-sync lastOnChainDamage from ER on server restart to prevent double-damage"
```

---

### Task 6: Fix premature `lastOnChainDamage` update in `buildPartiallySignedApplyDamageTx`

**Why:** Line 502 of `boss-er-service.ts` updates `lastOnChainDamage` before the player's transaction is confirmed or even sent. If the player never sends it, the delta is "consumed" and passive ticks skip that damage forever. The function is dead code (never called) but must be corrected before any future caller is added.

**Files:**
- Modify: `apps/api/src/services/boss-er-service.ts`

**Step 1: Remove the premature update and add a comment**

Find the block in `buildPartiallySignedApplyDamageTx` (around line 499–502):
```typescript
// Update lastOnChainDamage now so passive ticks don't re-send the same delta
lastOnChainDamage.set(key, totalDamageSoFar);
```

Replace with:
```typescript
// NOTE: Do NOT update lastOnChainDamage here.
// The caller must call applyDamageOnER() after the player's tx confirms,
// which will compute delta=0 and skip cleanly — OR the caller must explicitly
// update lastOnChainDamage after confirmation via a dedicated callback.
// Updating here (before confirmation) would cause passive ticks to skip
// the damage forever if the player never sends the tx.
```

**Step 2: Verify**
```bash
pnpm --filter api build
```
Expected: 0 errors.

**Step 3: Commit**
```bash
git add apps/api/src/services/boss-er-service.ts
git commit -m "fix(er): remove premature lastOnChainDamage update in buildPartiallySignedApplyDamageTx"
```

---

### Task 7: Deduplicate VRF result PDA derivation in `use-vrf-roll.ts`

**Why:** `PublicKey.findProgramAddressSync` is called twice for the exact same PDA (lines 98–100 and 155–158) inside the same `transact()` closure.

**Files:**
- Modify: `apps/mobile/hooks/use-vrf-roll.ts`

**Step 1: Remove the second derivation**

Inside the `transact()` closure, the first derivation is:
```typescript
// Line 98-100:
const [vrfResultPda] = PublicKey.findProgramAddressSync(
  [VRF_RESULT_SEED, publicKey.toBytes()],
  VRF_ROLLER_PROGRAM_ID
);
```

The second derivation (lines 154–158) re-derives the same PDA just to return the address:
```typescript
// Lines 154-158 — REMOVE THIS:
const [vrfPda] = PublicKey.findProgramAddressSync(
  [VRF_RESULT_SEED, publicKey.toBytes()],
  VRF_ROLLER_PROGRAM_ID
);
// Return both signature and pda address
return { sig: signedTxs[0] as string, pdaAddress: vrfPda.toBase58() };
```

Replace with (using the already-computed `vrfResultPda`):
```typescript
return { sig: signedTxs[0] as string, pdaAddress: vrfResultPda.toBase58() };
```

**Step 2: Verify** (TypeScript check for mobile)
```bash
pnpm --filter mobile tsc --noEmit
```
If that command isn't available, just confirm the file has no TypeScript errors by reading it through.

**Step 3: Commit**
```bash
git add apps/mobile/hooks/use-vrf-roll.ts
git commit -m "fix(vrf): remove duplicate VRF result PDA derivation"
```

---

## Summary of commits
1. `fix(er): shared server keypair singleton to avoid split ephemeral keys`
2. `fix(er): cache resolved ER connections to prevent WebSocket leak`
3. `fix(er): cache router endpoint per PDA to reduce HTTP overhead`
4. `fix(er): pass actual classId to updateProgressOnER instead of hardcoded scout`
5. `fix(er): lazy-sync lastOnChainDamage from ER on server restart to prevent double-damage`
6. `fix(er): remove premature lastOnChainDamage update in buildPartiallySignedApplyDamageTx`
7. `fix(vrf): remove duplicate VRF result PDA derivation`
