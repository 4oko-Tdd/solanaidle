import type { MissionType, UpgradeCost } from "@solanaidle/shared";

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

export const GEAR_UPGRADES: {
  level: number;
  cost: UpgradeCost;
  failRateReduction: number;
}[] = [
  { level: 1, cost: { scrap: 10 }, failRateReduction: 0 },
  { level: 2, cost: { scrap: 25, crystal: 5 }, failRateReduction: 2 },
  { level: 3, cost: { scrap: 50, crystal: 15 }, failRateReduction: 5 },
  {
    level: 4,
    cost: { scrap: 100, crystal: 30, artifact: 1 },
    failRateReduction: 8,
  },
  {
    level: 5,
    cost: { scrap: 200, crystal: 60, artifact: 3 },
    failRateReduction: 12,
  },
];

export const MAX_GEAR_LEVEL = 5;
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

export function getGearUpgrade(level: number) {
  return GEAR_UPGRADES.find((u) => u.level === level);
}

export function getFailRateReduction(gearLevel: number): number {
  const upgrade = GEAR_UPGRADES.find((u) => u.level === gearLevel);
  return upgrade?.failRateReduction ?? 0;
}
