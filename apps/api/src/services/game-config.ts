import type { MissionType, CharacterClass, RaidMission, PerkDefinition } from "@solanaidle/shared";

// ── Missions (3 tiers, no boss — boss is now a community event) ──

export const MISSIONS: MissionType[] = [
  {
    id: "scout",
    name: "Quick Swap",
    duration: 3600,
    failRate: 10,
    rewards: { xpRange: [10, 25], scrap: [5, 15] },
  },
  {
    id: "expedition",
    name: "Liquidity Run",
    duration: 21600,
    failRate: 25,
    rewards: { xpRange: [50, 120], scrap: [20, 50], crystal: [3, 10] },
  },
  {
    id: "deep_dive",
    name: "Deep Farm",
    duration: 86400,
    failRate: 40,
    rewards: {
      xpRange: [150, 400],
      scrap: [50, 150],
      crystal: [10, 30],
      artifact: [0, 2],
    },
  },
];

// ── Gear Upgrades (reset each epoch — primary resource sink) ──

export const ARMOR_UPGRADES = [
  { level: 1, cost: { scrap: 50 }, failRateReduction: 2 },
  { level: 2, cost: { scrap: 120 }, failRateReduction: 4 },
  { level: 3, cost: { scrap: 200, crystal: 30 }, failRateReduction: 6 },
  { level: 4, cost: { scrap: 350, crystal: 80 }, failRateReduction: 9 },
  { level: 5, cost: { scrap: 500, crystal: 150, artifact: 20 }, failRateReduction: 12 },
];

export const ENGINE_UPGRADES = [
  { level: 1, cost: { scrap: 50 }, durationReduction: 0.05 },
  { level: 2, cost: { scrap: 120 }, durationReduction: 0.08 },
  { level: 3, cost: { scrap: 200, crystal: 30 }, durationReduction: 0.12 },
  { level: 4, cost: { scrap: 350, crystal: 80 }, durationReduction: 0.16 },
  { level: 5, cost: { scrap: 500, crystal: 150, artifact: 20 }, durationReduction: 0.20 },
];

export const SCANNER_UPGRADES = [
  { level: 1, cost: { scrap: 50 }, lootBonus: 0.05 },
  { level: 2, cost: { scrap: 120 }, lootBonus: 0.10 },
  { level: 3, cost: { scrap: 200, crystal: 30 }, lootBonus: 0.15 },
  { level: 4, cost: { scrap: 350, crystal: 80 }, lootBonus: 0.20 },
  { level: 5, cost: { scrap: 500, crystal: 150, artifact: 20 }, lootBonus: 0.30 },
];

export const MAX_TRACK_LEVEL = 5;
export const REVIVE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Faster start, steeper ramp: 75, 120, 192, 307, 491, 786, 1258...
export function xpForLevel(level: number): number {
  return Math.floor(75 * Math.pow(1.6, level - 1));
}

// Reroll & insurance costs (insurance now via perk, but reroll stays as resource cost)
export const REROLL_COST_PER_STACK = 10; // scrap per stack
export const REROLL_REDUCTION_PER_STACK = 2; // -2% fail rate per stack
export const MAX_REROLL_STACKS = 3;
export const INSURANCE_COST = 5; // crystal

export function getMission(id: string): MissionType | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getArmorReduction(level: number): number {
  if (level <= 0) return 0;
  const u = ARMOR_UPGRADES.find(u => u.level === level);
  return u?.failRateReduction ?? 0;
}

export function getEngineReduction(level: number): number {
  if (level <= 0) return 0;
  const u = ENGINE_UPGRADES.find(u => u.level === level);
  return u?.durationReduction ?? 0;
}

export function getScannerBonus(level: number): number {
  if (level <= 0) return 0;
  const u = SCANNER_UPGRADES.find(u => u.level === level);
  return u?.lootBonus ?? 0;
}

// ── Classes ──

export const CLASSES: CharacterClass[] = [
  {
    id: "scout",
    name: "Validator",
    description: "Fast block producer. Shorter missions, slightly riskier.",
    durationModifier: 0.85,
    failRateModifier: 5,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "guardian",
    name: "Staker",
    description: "Secures the chain. Safer missions, takes longer.",
    durationModifier: 1.2,
    failRateModifier: -10,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "mystic",
    name: "Oracle",
    description: "Reads the mempool. Better boss drop odds, less XP.",
    durationModifier: 1.0,
    failRateModifier: 0,
    lootModifier: 1.3,
    xpModifier: 0.9,
  },
];

// ── Roguelike Perk System ──

export const PERK_TIER_WEIGHTS = { common: 0.80, rare: 0.15, legendary: 0.05 };

// Class perk pool weighting — multiplier on perk appearance chance
export const CLASS_PERK_WEIGHTS: Record<string, Record<string, number>> = {
  scout: { speed: 1.5, damage: 1.5, defense: 0.7, loot: 0.8 },
  guardian: { speed: 0.8, damage: 0.7, defense: 1.5, survival: 1.5 },
  mystic: { speed: 0.8, damage: 0.7, loot: 1.5, boss_reward: 1.5 },
};

export const PERK_DEFINITIONS: PerkDefinition[] = [
  // Common perks (stackable)
  { id: "bandwidth_boost", name: "Bandwidth Boost", description: "+5% mission speed", tier: "common", effect: { speed: 0.05 }, stackable: true },
  { id: "reinforced_node", name: "Reinforced Node", description: "-3% fail rate", tier: "common", effect: { fail_rate: -0.03 }, stackable: true },
  { id: "data_miner", name: "Data Miner", description: "+8% resource gain", tier: "common", effect: { resource_gain: 0.08 }, stackable: true },
  { id: "signal_amp", name: "Signal Amp", description: "+5% XP gain", tier: "common", effect: { xp: 0.05 }, stackable: true },
  { id: "loot_scanner", name: "Loot Scanner", description: "+5% boss drop chance", tier: "common", effect: { loot_chance: 0.05 }, stackable: true },
  { id: "armor_plating", name: "Armor Plating", description: "-2% fail rate, +2% duration", tier: "common", effect: { fail_rate: -0.02, speed: -0.02 }, stackable: true },
  { id: "overclock_core", name: "Overclock Core", description: "-5% duration, +3% fail rate", tier: "common", effect: { speed: 0.05, fail_rate: 0.03 }, stackable: true },
  { id: "salvage_protocol", name: "Salvage Protocol", description: "+10% Lamports from missions", tier: "common", effect: { scrap_bonus: 0.10 }, stackable: true },
  { id: "token_siphon", name: "Token Siphon", description: "+15% Tokens from missions", tier: "common", effect: { crystal_bonus: 0.15 }, stackable: true },
  { id: "key_decoder", name: "Key Decoder", description: "+10% Keys from missions", tier: "common", effect: { artifact_bonus: 0.10 }, stackable: true },

  // Rare perks (unique per epoch)
  { id: "lucky_escape", name: "Lucky Escape", description: "50% chance to survive fatal mission (once/epoch)", tier: "rare", effect: { lucky_escape: 1 }, stackable: false },
  { id: "double_down", name: "Double Down", description: "Next mission: 2x rewards, 2x fail rate", tier: "rare", effect: { double_down: 1 }, stackable: false },
  { id: "insurance_protocol", name: "Insurance Protocol", description: "Streak protected on next failure", tier: "rare", effect: { insurance: 1 }, stackable: false },
  { id: "second_wind", name: "Second Wind", description: "Auto-revive on death (once/epoch)", tier: "rare", effect: { second_wind: 1 }, stackable: false },
  { id: "whale_detector", name: "Whale Detector", description: "+25% NFT artifact drop from boss", tier: "rare", effect: { nft_drop_chance: 0.25 }, stackable: false },
  { id: "early_access", name: "Early Access", description: "Join boss fight 6h before Saturday spawn", tier: "rare", effect: { early_access: 1 }, stackable: false },
  { id: "critical_overload", name: "Critical Overload", description: "OVERLOAD crit deals 1.5x damage", tier: "rare", effect: { crit_multiplier: 0.5 }, stackable: false },

  // Legendary perks (one per epoch max)
  { id: "immortal_node", name: "Immortal Node", description: "Cannot lose lives for next 3 missions", tier: "legendary", effect: { immortal_missions: 3 }, stackable: false },
  { id: "genesis_protocol", name: "Genesis Protocol", description: "Start next epoch with a free rare perk", tier: "legendary", effect: { genesis_protocol: 1 }, stackable: false },
  { id: "leviathans_eye", name: "Leviathan's Eye", description: "See boss HP thresholds and optimal crit timing", tier: "legendary", effect: { leviathans_eye: 1 }, stackable: false },
  { id: "chain_reaction", name: "Chain Reaction", description: "OVERLOAD boosts guild members +20% dmg for 1h", tier: "legendary", effect: { chain_reaction: 1 }, stackable: false },
];

export function getPerk(id: string): PerkDefinition | undefined {
  return PERK_DEFINITIONS.find(p => p.id === id);
}

// ── World Boss Config ──

export const BOSS_BASE_HP = 100000;
export const BOSS_SCALING_FACTOR = 0.8;
export const BOSS_NAME = "Protocol Leviathan";

// OVERLOAD damage: scrap*1 + crystal*3 + artifact*10
export const OVERLOAD_MULTIPLIERS = { scrap: 1, crystal: 3, artifact: 10 };

// ── Boss Drop Table ──

export const WEEKLY_BUFF_DEFINITIONS = [
  { id: "head_start", name: "Head Start", effect: "Begin epoch at Level 2" },
  { id: "extra_life", name: "Extra Life", effect: "Start with 4 lives instead of 3" },
  { id: "supply_cache", name: "Supply Cache", effect: "Start with bonus resources" },
  { id: "lucky_node", name: "Lucky Node", effect: "+10% boss drop chance all week" },
  { id: "overclocked", name: "Overclocked", effect: "-15% mission duration all week" },
];

export const PERMANENT_LOOT_DEFINITIONS = [
  { id: "protocol_core", name: "Protocol Core", perkType: "loot_chance" as const, perkValue: 0.02 },
  { id: "genesis_shard", name: "Genesis Shard", perkType: "speed" as const, perkValue: -0.03 },
  { id: "consensus_fragment", name: "Consensus Fragment", perkType: "fail_rate" as const, perkValue: -0.02 },
  { id: "epoch_crystal", name: "Epoch Crystal", perkType: "xp" as const, perkValue: 0.05 },
  { id: "leviathan_scale", name: "Leviathan Scale", perkType: "boss_damage" as const, perkValue: 0.03 },
];

// Base drop chances (modified by contribution %)
export const BOSS_DROP_CHANCES = {
  weekly_buff: 0.17,      // ~17% base
  permanent_loot: 0.03,   // ~3% base
  data_core: 0.03,        // ~3% base
  nft_artifact: 0.01,     // ~1% base
};

// Diminishing returns for multiple copies of same permanent loot
export const DIMINISHING_RETURNS = [1.0, 0.75, 0.50]; // 1st, 2nd, 3rd copy
export const MAX_COPIES_PER_ITEM = 3;

export const INVENTORY_STARTING_SLOTS = 3;

// ── Raids ──

export const RAIDS: RaidMission[] = [
  { id: "outpost", name: "Pool Raid", requiredPlayers: 2, duration: 14400, lootMultiplier: 2, description: "2-player raid. 4h. 2x loot." },
  { id: "stronghold", name: "Protocol Siege", requiredPlayers: 3, duration: 43200, lootMultiplier: 3, description: "3-player raid. 12h. 3x loot + guaranteed Tokens." },
];

// ── Run Config ──

export const RUN_LIVES = 3;
export const TIER2_UNLOCK_LEVEL = 3;
export const TIER3_UNLOCK_LEVEL = 6;

export function getClass(id: string): CharacterClass | undefined {
  return CLASSES.find((c) => c.id === id);
}

export function getRaid(id: string): RaidMission | undefined {
  return RAIDS.find((r) => r.id === id);
}

// Streak multiplier now applies to resource rewards (not loot — loot comes from boss only)
export function getStreakMultiplier(streak: number): number {
  if (streak >= 6) return 2.0;
  if (streak >= 4) return 1.5;
  if (streak >= 2) return 1.2;
  return 1.0;
}

export function getStreakLabel(streak: number): string | null {
  if (streak >= 6) return "To The Moon";
  if (streak >= 4) return "Diamond Hands";
  if (streak >= 2) return "HODL Streak";
  return null;
}
