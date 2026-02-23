# MagicBlock ER Fixes — Design Doc
Date: 2026-02-21

## Bugs Being Fixed

### Bug 1 — Premature `lastOnChainDamage` update (boss-er-service.ts:502)
`buildPartiallySignedApplyDamageTx` updates `lastOnChainDamage` before the player's tx is confirmed.
The function is dead code (never called), but the bug must be fixed before any future caller is added.
**Fix:** Remove the premature `.set()`. Add a comment that callers must update `lastOnChainDamage` via a post-confirmation callback.

### Bug 2 — Server restart zeros `lastOnChainDamage` → double-damage on ER
`apply_damage` in Rust is additive (`total_damage.saturating_add(delta)`). After a restart, the in-memory map is empty so the first `applyDamageOnER` sends the full cumulative damage again, doubling the on-chain total_damage.
`total_damage` is at byte offset 64 in BossState (8 discriminator + 32 authority + 8 week_start + 8 max_hp + 8 current_hp).
**Fix:** Lazy sync — at the top of `applyDamageOnER`, if the week key is absent from `lastOnChainDamage`, fetch the boss PDA from the ER validator and read `total_damage`. This is a single ER read per server session per boss week.

### Bug 3 — Two separate ephemeral keypairs when `SERVER_KEYPAIR` not set
Both `er-service.ts` and `boss-er-service.ts` independently call `Keypair.generate()` when the env var is absent, producing different keys and different PDA authorities.
**Fix:** Extract `apps/api/src/services/server-keypair.ts` singleton module. Both services import from it.

### Bug 4 — `updateProgressOnER` hardcodes `"scout"` in auto-init fallback
When the PDA isn't yet in `delegatedPdas`, `updateProgressOnER` calls `initializeProgressOnChain` with `"scout"` regardless of the player's actual class.
**Fix:** Add `classId: string` parameter to `updateProgressOnER`. Update both callers:
- `mission-service.ts` already has `class_id` from the run query — pass it through.
- `runs.ts` already passes the class at run start — pass it here too.

### Bug 5 — `resolveErConnection` creates new `Connection` on every call (WebSocket leak)
Each `new Connection(url)` opens a WebSocket. Called on every mission claim and damage tick.
**Fix:** `const erConnectionCache = new Map<string, Connection>()` in each service. Return cached connection if present; create and cache if absent.

### Bug 6 (minor) — VRF result PDA derived twice in `use-vrf-roll.ts`
Lines 98–100 and 155–158 both call `findProgramAddressSync` for the same PDA.
**Fix:** Capture `vrfResultPda` from the first derivation and reuse it for the return value.

### Bug 7 (minor) — Router endpoint fetched on every ER call
`resolveErConnection` makes an HTTP request to the router on every `updateProgressOnER` and `applyDamageOnER` call.
**Fix:** Add `resolvedErEndpoints = new Map<string, string>()` keyed by PDA base58 address. Cache the resolved FQDN after first lookup. The cache lives for the server session (same lifetime as `delegatedPdas`).

## Non-Bug (confirmed)
The `Magic11111111111111111111111111111111111111` and `MagicContext1111111111111111111111111111111` addresses in `finalizeBossOnChain` are the real canonical MagicBlock program IDs per `magicblock-magic-program-api` crate source. Not a bug.

## Files Changed
- `apps/api/src/services/server-keypair.ts` — NEW singleton
- `apps/api/src/services/er-service.ts` — import shared keypair, add classId param, connection cache, router cache
- `apps/api/src/services/boss-er-service.ts` — import shared keypair, lazy sync, connection cache, router cache, fix premature update
- `apps/api/src/services/mission-service.ts` — pass classId to updateProgressOnER
- `apps/api/src/routes/runs.ts` — pass classId to updateProgressOnER
- `apps/mobile/hooks/use-vrf-roll.ts` — deduplicate PDA derivation
