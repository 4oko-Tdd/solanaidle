// ── Character ──

export type CharacterState = "idle" | "on_mission" | "dead";

export interface Character {
  id: string;
  walletAddress: string;
  level: number;
  xp: number;
  hp: number;
  state: CharacterState;
  reviveAt: string | null;
}

// ── Missions ──

export type MissionId = "scout" | "expedition" | "deep_dive" | "boss";

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
  streak: number; // current streak after this mission
}

export interface MissionRewards {
  xp: number;
  scrap: number;
  crystal?: number;
  artifact?: number;
  streakMultiplier?: number; // multiplier that was applied
}

// ── Inventory ──

export interface Inventory {
  scrap: number;
  crystal: number;
  artifact: number;
  /** Loot items from missions (drops) */
  loot?: LootEntry[];
  /** Bonus from owned loot: +X% drop chance (base 20%) */
  lootDropChancePercent?: number;
  /** Bonus from owned loot: mission duration -X% */
  lootSpeedPercent?: number;
}

export interface LootEntry {
  itemId: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  /** 1 = common, 2 = rare, 3 = epic. Higher = better perks. */
  tier: number;
}

// ── Upgrades ──

export interface UpgradeCost {
  scrap: number;
  crystal?: number;
  artifact?: number;
}

export type GearTrack = "armor" | "engine" | "scanner";

export interface TrackInfo {
  level: number;
  maxLevel: number;
  effectLabel: string;
  next: {
    level: number;
    cost: UpgradeCost;
    effectLabel: string;
    canAfford: boolean;
  } | null;
}

export interface UpgradeInfo {
  armor: TrackInfo;
  engine: TrackInfo;
  scanner: TrackInfo;
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
  | "MAX_LEVEL"
  | "CLAIM_NOT_FOUND"
  | "ALREADY_CLAIMED"
  | "NO_ACTIVE_RUN"
  | "RUN_ENDED"
  | "CLASS_ALREADY_CHOSEN"
  | "INSUFFICIENT_SKILL_POINTS"
  | "SKILL_ALREADY_UNLOCKED"
  | "SKILL_PREREQUISITE"
  | "GUILD_NOT_FOUND"
  | "GUILD_FULL"
  | "ALREADY_IN_GUILD"
  | "NOT_IN_GUILD"
  | "RAID_IN_PROGRESS"
  | "RAID_NOT_READY"
  | "NO_LIVES"
  | "BOSS_NOT_AVAILABLE"
  | "INVALID_MISSION"
  | "MISSION_LOCKED";

export interface ApiError {
  error: ErrorCode;
  message: string;
}

// ── Character Classes ──

export type ClassId = "scout" | "guardian" | "mystic";

export interface CharacterClass {
  id: ClassId;
  name: string;
  description: string;
  durationModifier: number;   // multiplier (0.85 = 15% faster)
  failRateModifier: number;   // additive (5 = +5% fail)
  lootModifier: number;       // multiplier (1.3 = +30% rare loot)
  xpModifier: number;         // multiplier (0.9 = -10% XP)
}

// ── Skill Trees ──

export interface SkillNode {
  id: string;
  classId: ClassId;
  name: string;
  description: string;
  tier: number; // 1, 2, 3
  cost: number; // skill points
}

export interface UnlockedSkill {
  skillId: string;
  unlockedAt: string;
}

// ── Weekly Runs ──

export interface WeeklyRun {
  id: string;
  walletAddress: string;
  classId: ClassId;
  weekStart: string;
  weekEnd: string;
  livesRemaining: number;
  score: number;
  skillPoints: number;
  missionsCompleted: number;
  bossDefeated: boolean;
  active: boolean;
  streak: number; // consecutive mission successes
  armorLevel: number;
  engineLevel: number;
  scannerLevel: number;
  startSignature?: string | null;
  endSignature?: string | null;
}

// ── Run Events ──

export type RunEventType =
  | "run_start"
  | "mission_success"
  | "mission_fail"
  | "death"
  | "revive"
  | "level_up"
  | "boss_kill"
  | "skill_unlock"
  | "nft_drop"
  | "run_end";

export interface RunEvent {
  id: string;
  runId: string;
  eventType: RunEventType;
  data: Record<string, unknown>;
  createdAt: string;
}

// ── Guilds ──

export interface Guild {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  memberCount: number;
}

export interface GuildMember {
  walletAddress: string;
  characterId: string;
  joinedAt: string;
}

// ── Raids ──

export type RaidId = "outpost" | "stronghold";

export interface RaidMission {
  id: RaidId;
  name: string;
  requiredPlayers: number;
  duration: number;
  lootMultiplier: number;
  description: string;
}

export interface ActiveRaid {
  id: string;
  raidId: RaidId;
  guildId: string;
  startedAt: string;
  endsAt: string;
  committedPlayers: string[]; // wallet addresses
  timeRemaining?: number;
}

// ── Epoch Finalization (VRF-powered) ──

export interface EpochBonusRewards {
  /** Resource multiplier applied (1.0x - 3.0x) */
  multiplier: number;
  /** Bonus scrap from VRF roll */
  bonusScrap: number;
  /** Bonus crystal from VRF roll */
  bonusCrystal: number;
  /** Bonus artifact from VRF roll */
  bonusArtifact: number;
  /** Loot tier dropped (1/2/3 or null if no drop) */
  lootTier: number | null;
  /** Loot item ID if dropped */
  lootItemId: string | null;
  /** Whether an NFT was dropped */
  nftDrop: boolean;
  /** Whether VRF was used (vs fallback) */
  vrfVerified: boolean;
  /** VRF account pubkey (for on-chain verification) */
  vrfAccount: string | null;
}

export interface EpochFinalizeResponse {
  finalized: boolean;
  bonus: EpochBonusRewards | null;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  classId: ClassId;
  score: number;
  missionsCompleted: number;
  bossDefeated: boolean;
}

// ── Extended Character (adds class & run info) ──

export interface CharacterWithRun extends Character {
  classId: ClassId | null;
  activeRun: WeeklyRun | null;
  skills: UnlockedSkill[];
}

// ── Daily Login ──

export interface DailyReward {
  day: number; // 1-7
  scrap: number;
  crystal: number;
  artifact: number;
}

export interface DailyLoginStatus {
  streakDay: number; // 1-7 (which day of the cycle)
  claimedToday: boolean;
  todayReward: DailyReward;
  rewards: DailyReward[]; // all 7 days for calendar display
}
