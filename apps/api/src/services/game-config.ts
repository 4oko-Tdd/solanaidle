import type { MissionType, CharacterClass, SkillNode, RaidMission } from "@solanaidle/shared";

export const MISSIONS: MissionType[] = [
  {
    id: "scout",
    name: "Scout",
    duration: 3600,
    failRate: 10,
    rewards: { xpRange: [10, 25], scrap: [5, 15] },
  },
  {
    id: "expedition",
    name: "Expedition",
    duration: 21600,
    failRate: 25,
    rewards: { xpRange: [50, 120], scrap: [20, 50], crystal: [3, 10] },
  },
  {
    id: "deep_dive",
    name: "Deep Dive",
    duration: 86400,
    failRate: 40,
    rewards: {
      xpRange: [150, 400],
      scrap: [50, 150],
      crystal: [10, 30],
      artifact: [0, 2],
      nftChance: 5,
    },
  },
];

export const ARMOR_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, failRateReduction: 2 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, failRateReduction: 3 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, failRateReduction: 5 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, failRateReduction: 8 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, failRateReduction: 12 },
];

export const ENGINE_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, durationReduction: 0.05 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, durationReduction: 0.08 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, durationReduction: 0.12 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, durationReduction: 0.16 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, durationReduction: 0.20 },
];

export const SCANNER_UPGRADES = [
  { level: 1, cost: { scrap: 10 }, lootBonus: 0.05 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, lootBonus: 0.10 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, lootBonus: 0.15 },
  { level: 4, cost: { scrap: 100, crystal: 30, artifact: 1 }, lootBonus: 0.20 },
  { level: 5, cost: { scrap: 200, crystal: 60, artifact: 3 }, lootBonus: 0.30 },
];

export const MAX_TRACK_LEVEL = 5;
export const REVIVE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const XP_PER_LEVEL = 100;

export const NFT_NAMES = [
  "Shadow Explorer Badge",
  "Abyssal Wanderer Mark",
  "Deep Void Sigil",
  "Phantom Diver Token",
  "Obsidian Pathfinder Crest",
];

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

export const CLASSES: CharacterClass[] = [
  {
    id: "scout",
    name: "Scout",
    description: "Speed runner. Faster missions, slightly riskier.",
    durationModifier: 0.85,
    failRateModifier: 5,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "guardian",
    name: "Guardian",
    description: "Tank. Safer missions, takes longer.",
    durationModifier: 1.2,
    failRateModifier: -10,
    lootModifier: 1.0,
    xpModifier: 1.0,
  },
  {
    id: "mystic",
    name: "Mystic",
    description: "Gambler. Higher rare loot, riskier, less XP.",
    durationModifier: 1.0,
    failRateModifier: 10,
    lootModifier: 1.3,
    xpModifier: 0.9,
  },
];

export const SKILL_TREES: SkillNode[] = [
  // Scout
  { id: "scout_swift", classId: "scout", name: "Swift Feet", description: "-10% more duration reduction", tier: 1, cost: 1 },
  { id: "scout_escape", classId: "scout", name: "Lucky Escape", description: "50% chance to survive a failed mission (1x/run)", tier: 2, cost: 2 },
  { id: "scout_double", classId: "scout", name: "Double Run", description: "Can send 2 missions simultaneously (1x/day)", tier: 3, cost: 3 },
  // Guardian
  { id: "guardian_iron", classId: "guardian", name: "Iron Will", description: "+1 run life (4 total)", tier: 1, cost: 1 },
  { id: "guardian_shield", classId: "guardian", name: "Resource Shield", description: "Keep 50% resources on death", tier: 2, cost: 2 },
  { id: "guardian_fortify", classId: "guardian", name: "Fortify", description: "-5% fail rate on Tier 3 missions", tier: 3, cost: 3 },
  // Mystic
  { id: "mystic_eye", classId: "mystic", name: "Third Eye", description: "See mission outcome probability", tier: 1, cost: 1 },
  { id: "mystic_ritual", classId: "mystic", name: "Ritual", description: "+15% NFT drop chance on Deep Dive", tier: 2, cost: 2 },
  { id: "mystic_soul", classId: "mystic", name: "Soul Link", description: "On death, collect passive resources for 1h", tier: 3, cost: 3 },
];

export const BOSS_MISSION: MissionType = {
  id: "boss",
  name: "Shadow Boss",
  duration: 43200, // 12h
  failRate: 50,
  rewards: { xpRange: [500, 1000], scrap: [200, 500], crystal: [50, 100], artifact: [2, 5], nftChance: 20 },
};

export const RAIDS: RaidMission[] = [
  { id: "outpost", name: "Outpost Raid", requiredPlayers: 2, duration: 14400, lootMultiplier: 2, description: "2-player raid. 4h. 2x loot." },
  { id: "stronghold", name: "Stronghold Siege", requiredPlayers: 3, duration: 43200, lootMultiplier: 3, description: "3-player raid. 12h. 3x loot + guaranteed Crystal." },
];

export const RUN_LIVES = 3;
export const BOSS_UNLOCK_LEVEL = 5;
export const TIER2_UNLOCK_LEVEL = 3;

export function getClass(id: string): CharacterClass | undefined {
  return CLASSES.find((c) => c.id === id);
}

export function getSkillsForClass(classId: string): SkillNode[] {
  return SKILL_TREES.filter((s) => s.classId === classId);
}

export function getRaid(id: string): RaidMission | undefined {
  return RAIDS.find((r) => r.id === id);
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 6) return 2.0;
  if (streak >= 4) return 1.5;
  if (streak >= 2) return 1.2;
  return 1.0;
}

export function getStreakLabel(streak: number): string | null {
  if (streak >= 6) return "Unstoppable";
  if (streak >= 4) return "On Fire";
  if (streak >= 2) return "Hot Streak";
  return null;
}
