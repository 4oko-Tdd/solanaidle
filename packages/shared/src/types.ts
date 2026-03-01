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

export interface ActiveMissions {
  main: ActiveMission | null;
  fast: ActiveMission | null;
  fastSlotUnlocked: boolean;
}

export type MissionResult = "success" | "failure";

export interface MissionClaimResponse {
  result: MissionResult;
  rewards: MissionRewards | null;
  character: Character;
  streak: number; // current streak after this mission
  erTx?: string;           // base64 partially-signed Transaction (player must sign + send)
  erValidatorUrl?: string; // ER endpoint for submission
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
  skr?: number;
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
  | "PERK_NOT_AVAILABLE"
  | "INVENTORY_FULL"
  | "BOSS_ALREADY_JOINED"
  | "GUILD_NOT_FOUND"
  | "GUILD_FULL"
  | "ALREADY_IN_GUILD"
  | "NOT_IN_GUILD"
  | "RAID_IN_PROGRESS"
  | "RAID_NOT_READY"
  | "NO_LIVES"
  | "BOSS_NOT_AVAILABLE"
  | "INVALID_MISSION"
  | "MISSION_LOCKED"
  | "INSUFFICIENT_SKR"
  | "SKR_PAYMENT_SIGNATURE_REQUIRED"
  | "SKR_PAYMENT_ALREADY_USED"
  | "INVALID_SKR_PAYMENT"
  | "FAST_SLOT_LOCKED"
  | "FAST_SLOT_SCOUT_ONLY"
  | "ALREADY_UNLOCKED"
  | "ALREADY_REROLLED"
  | "PAYMENT_SIGNATURE_REQUIRED"
  | "SIGNATURE_REQUIRED"
  | "INVALID_QUEST_ID"
  | "QUEST_ID_REQUIRED";

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

// ── Perks (replaces skill trees) ──

export type PerkTier = "common" | "rare" | "legendary";

export interface PerkDefinition {
  id: string;
  name: string;
  description: string;
  tier: PerkTier;
  effect: Record<string, number>;
  stackable: boolean;
}

export interface ActivePerk {
  perkId: string;
  stacks: number;
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
  missionsCompleted: number;
  bossDefeated: boolean;
  active: boolean;
  streak: number; // consecutive mission successes
  armorLevel: number;
  engineLevel: number;
  scannerLevel: number;
  perks: ActivePerk[];
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
  | "perk_pick"
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
  displayName?: string;
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
  /** Score multiplier applied (1.0x - 3.0x) */
  multiplier: number;
  /** Score after multiplier */
  boostedScore: number;
  /** Original score before multiplier */
  originalScore: number;
  /** @deprecated Resources no longer granted at epoch end */
  bonusScrap: number;
  /** @deprecated Resources no longer granted at epoch end */
  bonusCrystal: number;
  /** @deprecated Resources no longer granted at epoch end */
  bonusArtifact: number;
  /** Whether a permanent loot item was dropped */
  permanentLootDrop: boolean;
  /** Permanent loot item ID if dropped */
  permanentLootItemId: string | null;
  /** Whether VRF was used (vs fallback) */
  vrfVerified: boolean;
  /** VRF account pubkey (for on-chain verification) */
  vrfAccount: string | null;
}

export interface EpochFinalizeResponse {
  finalized: boolean;
  bonus: EpochBonusRewards | null;
}

// ── On-Chain Progress (Ephemeral Rollups) ──

export interface OnChainProgress {
  /** Player wallet pubkey */
  player: string;
  /** Epoch start timestamp */
  weekStart: number;
  /** Class: 0=scout, 1=guardian, 2=mystic */
  classId: number;
  /** Cumulative score */
  score: number;
  /** Missions completed */
  missionsCompleted: number;
  /** Deaths count */
  deaths: number;
  /** Boss defeated flag */
  bossDefeated: boolean;
  /** Last update timestamp */
  lastUpdate: number;
}

export interface ERStatus {
  /** Whether the progress PDA is currently delegated to ER */
  delegated: boolean;
  /** The progress PDA pubkey */
  progressAccount: string | null;
  /** Last sync timestamp */
  lastSync: number | null;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  classId: ClassId;
  score: number;
  missionsCompleted: number;
  bossDefeated: boolean;
  displayName?: string;
  title?: string;
}

// ── Extended Character (adds class & run info) ──

export interface CharacterWithRun extends Character {
  classId: ClassId | null;
  activeRun: WeeklyRun | null;
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

// ── Permanent Loot & Inventory ──

export interface PermanentLootItem {
  id: string;
  itemId: string;
  itemName: string;
  perkType: "loot_chance" | "speed" | "fail_rate" | "xp" | "boss_damage";
  perkValue: number;
  mintAddress?: string;
  droppedAt: string;
}

export interface InventoryCapacity {
  walletAddress: string;
  maxSlots: number;
}

// ── Weekly Buffs ──

export interface WeeklyBuff {
  id: string;
  buffId: string;
  buffName: string;
  epochStart: string;
  consumed: boolean;
}

// ── World Boss ──

export interface WorldBoss {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  weekStart: string;
  spawnedAt: string;
  killed: boolean;
}

export interface BossParticipant {
  bossId: string;
  walletAddress: string;
  joinedAt: string;
  passiveDamage: number;
  critDamage: number;
  critUsed: boolean;
}

export type BossDropType = "weekly_buff" | "permanent_loot" | "data_core" | "nft_artifact";

export interface OverloadResponse {
  success: boolean;
  damage?: number;
  erTx?: string;           // base64 partially-signed Transaction (player must sign + send)
  erValidatorUrl?: string; // ER endpoint for submission
}

// ── On-Chain Boss State (Ephemeral Rollups) ──

export interface OnChainBossState {
  /** Server keypair (sole authority) */
  authority: string;
  /** Week start timestamp */
  weekStart: number;
  /** Maximum HP at spawn */
  maxHp: number;
  /** Current HP */
  currentHp: number;
  /** Total cumulative damage */
  totalDamage: number;
  /** Number of participants */
  participantCount: number;
  /** Whether boss is killed */
  killed: boolean;
  /** Spawn timestamp */
  spawnedAt: number;
}

// ── Achievement Badges & Relic NFTs ──

export type AchievementId =
  | "boss_slayer"
  | "streak_master"
  | "deep_explorer"
  | "raid_victor"
  | "epoch_champion";

export interface BadgeItem {
  id: string;
  achievementId: AchievementId;
  name: string;
  earnedAt: string;
  mintAddress: string | null;
}

export interface RelicItem {
  id: string;
  name: string;
  missionId: string;
  mintAddress: string | null;
  claimedAt: string | null;
}

export interface TrophyCaseData {
  relics: RelicItem[];
  badges: BadgeItem[];
}

// ── Daily Challenges ──
export type ChallengeType = "missions" | "scrap" | "crystal" | "boss_join" | "overload" | "raid" | "liquidity_run";

export interface ChallengeDefinition {
  id: string;
  description: string;
  requirement: number;
  rewardScrap: number;
  rewardCrystal: number;
  type: ChallengeType;
}

export interface DailyChallenge extends ChallengeDefinition {
  progress: number;
  completed: boolean;
  rerolled: boolean;
}

export interface DailyChallengesStatus {
  challenges: DailyChallenge[];
  periodKey: string;
  rerollCost: number;
}

// ── Boss Surge ──
export interface SurgeWindow {
  startsAt: number;
  endsAt: number;
}
