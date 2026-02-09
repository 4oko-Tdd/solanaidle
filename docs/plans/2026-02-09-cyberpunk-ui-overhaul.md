# Cyberpunk UI Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the UI from clean-minimal dark theme to a neon cyberpunk / Solana aesthetic with glassmorphism, gradient accents, animations, and game feel.

**Architecture:** Foundation-first approach — update CSS variables, tailwind config, and base shadcn components first, then enhance game components. Most changes are styling-only (no logic changes). Custom keyframe animations in tailwind config + index.css.

**Tech Stack:** Tailwind CSS, shadcn/ui components, CSS @keyframes, Google Fonts (Orbitron for display, JetBrains Mono for data)

---

### Task 1: Theme Foundation — CSS variables + Tailwind config + fonts

### Task 2: Base component upgrades — Card, Button, Badge, Progress (glassmorphism + glow)

### Task 3: App shell — Header, bottom tabs, landing page

### Task 4: Game components — RunStatus, CharacterCard, InventoryPanel

### Task 5: Mission components — MissionPanel, MissionTimer

### Task 6: Dialog components — MissionResultDialog, ClassPicker, RunEndScreen

### Task 7: Secondary components — RunLog, LeaderboardPanel, UpgradePanel, SkillTree

### Task 8: Build + verify

---
