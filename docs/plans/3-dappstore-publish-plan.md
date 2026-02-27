# dApp Store Publish Plan

Prepared: February 27, 2026

## Dependency Rule

This plan is standalone relative to mainnet.
- It can be executed without completing the mainnet plan.
- It can be executed in parallel with Monolith submission.

## Goal

Publish Seeker Node through Solana dApp Store review and release workflow.

## Phase 0: Listing Pack (Week 1)

- [ ] Create/verify publisher profile in Solana dApp Store portal.
- [ ] Prepare icon, screenshots, feature graphic, and short/long descriptions.
- [ ] Confirm support URL and privacy policy URL are live.
- [ ] Finalize category, tags, and product copy.

## Phase 1: Release Artifact (Week 1)

- [ ] Build signed Android production artifact from locked commit.
- [ ] Verify package ID, version code, and app signing consistency.
- [ ] Validate startup, wallet connect, mission, and boss flows on release build.
- [ ] Capture reviewer notes and known limitations clearly.

## Phase 2: Submit and Review (Week 1-2)

- [ ] Submit release in publisher portal.
- [ ] Track review comments in one issue thread.
- [ ] Respond to reviewer feedback within 24 hours.
- [ ] Ship patch release quickly if requested.

## Phase 3: Post-Acceptance Operations

- [ ] Confirm listing metadata and screenshots render correctly.
- [ ] Monitor crash rate, auth success, and API errors after listing goes live.
- [ ] Prepare changelog process for follow-up versions.

## Quality Gate

- [ ] Listing accepted or only non-blocking feedback remains.
- [ ] Release artifact reproducible from tagged source commit.
- [ ] Store-facing copy and URLs match actual product behavior.
