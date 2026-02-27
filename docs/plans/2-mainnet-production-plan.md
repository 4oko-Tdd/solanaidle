# Mainnet Production Plan

Prepared: February 27, 2026

## Dependency Rule

This plan is independent.
- It can run in parallel with Monolith submission.
- It is not required for Monolith submission.
- dApp Store publishing can proceed before this plan is complete.

## Goal

Launch safely on mainnet with production-grade keys, infra, and incident readiness.

## Phase 0: Production Controls (Week 1)

- [ ] Create dedicated mainnet authorities and treasury keys.
- [ ] Move authorities/treasury to multisig controls.
- [ ] Store secrets in managed secret manager, not local files.
- [ ] Document key ceremony and recovery process.

## Phase 1: Chain Readiness (Week 1-2)

- [ ] Finalize mainnet program IDs and immutable config map.
- [ ] Deploy and verify programs on mainnet.
- [ ] Validate authority checks on all privileged instructions.
- [ ] Complete dry-run flows for boss, progress, and reward settlement.

## Phase 2: Backend Readiness (Week 1-2)

- [ ] Replace single-node SQLite runtime dependency for production.
- [ ] Add structured logs and dashboards.
- [ ] Add alerting for API errors, boss tick failure, and RPC degradation.
- [ ] Configure RPC/WebSocket primary + fallback endpoints.

## Phase 3: Security and Load Validation (Week 2-3)

- [ ] Review auth nonce, signature verification, and replay protection.
- [ ] Test SKR payment verification under adversarial cases.
- [ ] Add integration tests for value-moving paths.
- [ ] Load test peak boss event concurrency and recovery behavior.

## Phase 4: Launch Cutover (Week 3)

- [ ] Promote production config in API and mobile build constants.
- [ ] Validate end-to-end mainnet flows on release candidate build.
- [ ] Start 7-day on-call rotation with incident runbooks.
- [ ] Publish launch communications and monitor live SLOs.

## Go/No-Go

- [ ] No known P0/P1 issues in auth, mission, boss, payment, or reward.
- [ ] Rollback tested for API and mobile versions.
- [ ] Critical alerts acknowledged within 15 minutes in drills.
- [ ] Mainnet launch sign-off from engineering, product, and ops.
