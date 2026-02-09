// ── Character ──

export type CharacterState = "idle" | "on_mission" | "dead";

export interface Character {
  id: string;
  walletAddress: string;
  level: number;
  xp: number;
  hp: number;
  gearLevel: number;
  state: CharacterState;
  reviveAt: string | null;
}

// ── Missions ──

export type MissionId = "scout" | "expedition" | "deep_dive";

export interface MissionType {
  id: MissionId;
  name: string;
  duration: number; // seconds
  failRate: number; // percentage (0-100)
  rewards: MissionRewardRange;
}

export interface MissionRewardRange {
  xpRange: [number, number];
  scrap: [number, number];
  crystal?: [number, number];
  artifact?: [number, number];
  nftChance?: number; // percentage
}

export interface ActiveMission {
  missionId: MissionId;
  startedAt: string;
  endsAt: string;
  timeRemaining?: number;
}

export type MissionResult = "success" | "failure";

export interface MissionClaimResponse {
  result: MissionResult;
  rewards: MissionRewards | null;
  nftDrop: NftDrop | null;
  character: Character;
}

export interface MissionRewards {
  xp: number;
  scrap: number;
  crystal?: number;
  artifact?: number;
}

// ── Inventory ──

export interface Inventory {
  scrap: number;
  crystal: number;
  artifact: number;
}

// ── Upgrades ──

export interface UpgradeCost {
  scrap: number;
  crystal?: number;
  artifact?: number;
}

export interface UpgradeInfo {
  currentGearLevel: number;
  nextUpgrade: {
    level: number;
    cost: UpgradeCost;
    failRateReduction: number;
    canAfford: boolean;
  } | null;
}

// ── NFT Claims ──

export interface NftDrop {
  id: string;
  missionId: MissionId;
  nftName: string;
  claimedAt: string | null;
}

// ── Auth ──

export interface AuthNonceResponse {
  nonce: string;
}

export interface AuthVerifyRequest {
  publicKey: string;
  signature: string;
  nonce: string;
}

export interface AuthVerifyResponse {
  token: string;
}

// ── API Errors ──

export type ErrorCode =
  | "UNAUTHORIZED"
  | "CHARACTER_NOT_FOUND"
  | "CHARACTER_EXISTS"
  | "MISSION_IN_PROGRESS"
  | "MISSION_NOT_COMPLETE"
  | "CHARACTER_DEAD"
  | "INSUFFICIENT_RESOURCES"
  | "MAX_GEAR_LEVEL"
  | "CLAIM_NOT_FOUND"
  | "ALREADY_CLAIMED";

export interface ApiError {
  error: ErrorCode;
  message: string;
}
