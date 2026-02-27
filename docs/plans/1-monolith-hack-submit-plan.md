# Monolith Hack Submission Plan

Prepared: February 27, 2026

## Dependency Rule

This plan is standalone.
- It does not require mainnet launch.
- It does not require dApp Store publication.

## Fixed Date

- Monolith submission deadline: March 9, 2026 at 11:45 PM PT.
- Internal target submit time: March 9, 2026 at 8:00 PM PT.

## Goal

Ship a stable, demo-ready devnet build and complete submission package before deadline.

## Phase 0: Scope Lock (February 27 to March 1)

- [ ] Freeze non-essential features.
- [ ] Create submission branch and assign owners.
- [ ] Confirm exact demo script for 2-3 minutes.
- [ ] Mark Must/Should/Could tasks.

## Phase 1: Demo Stability (March 1 to March 6)

- [ ] Validate mobile happy path on physical Android: wallet connect -> mission -> boss -> claim.
- [ ] Fix all P0/P1 issues in auth, mission claim, boss fight, and reconnect.
- [ ] Validate websocket failure fallback and API retry behavior.
- [ ] Run 3 clean-install run-throughs with no blockers.

## Phase 2: Submission Assets (March 2 to March 7)

- [ ] Record demo video (2-3 minutes, mobile-first).
- [ ] Finalize deck (problem, loop, architecture, traction, roadmap).
- [ ] Verify README "How to run demo" with a second person.
- [ ] Prepare architecture diagram and links.

## Phase 3: Final Submit (March 7 to March 9)

- [ ] Fill and proofread submission form.
- [ ] Validate all links (video, repo, deck) in incognito mode.
- [ ] Tag repo `monolith-submission-2026-03-09`.
- [ ] Freeze to critical fixes only.
- [ ] Submit by March 9, 2026 at 8:00 PM PT.

## Exit Criteria

- [ ] Submission successfully sent.
- [ ] All linked assets accessible publicly.
- [ ] One commit/tag recorded as submission source of truth.
