import { useState } from "react";
import { View, Text, Image } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Lock, Sparkles, Shield, Minus, Plus, Crown, Fish, Skull } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { MissionType, CharacterState, MissionId, ClassId, Inventory } from "@solanaidle/shared";
import { GradientText } from "@/components/gradient-text";
import { useFadeInUp, usePulse } from "@/lib/animations";

const REROLL_COST_PER_STACK = 10;
const MAX_REROLL_STACKS = 3;
const REROLL_REDUCTION = 2;
const INSURANCE_COST = 5;

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => void;
  characterLevel?: number;
  classId?: ClassId | null;
  durationModifier?: number;
  livesRemaining?: number;
  inventory?: Inventory | null;
  bossDefeated?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

const RISK_LABELS: Record<string, Record<number, string>> = {
  scout: { 3: "Easy Swap", 2: "Risky Swap", 1: "Last Swap" },
  expedition: { 3: "Safe Stake", 2: "Risky Stake", 1: "Degen Stake" },
  deep_dive: { 3: "Yield Farm", 2: "Degen Farm", 1: "Rug Risk" },
  boss: { 3: "Whale Spotted", 2: "Do or Die", 1: "Final Stand" },
};

type RiskLevel = "safe" | "risky" | "dangerous" | "critical";

function getRiskLevel(missionId: string, lives: number): RiskLevel {
  const failMap: Record<string, number> = { scout: 10, expedition: 25, deep_dive: 40, boss: 50 };
  const fail = failMap[missionId] ?? 10;
  if (lives === 1) return fail >= 25 ? "critical" : "dangerous";
  if (lives === 2) return fail >= 40 ? "dangerous" : "risky";
  if (fail >= 40) return "risky";
  return "safe";
}

const RISK_BORDER_CLASSES: Record<RiskLevel, string> = {
  safe: "border-white/[0.06]",
  risky: "border-neon-amber/40",
  dangerous: "border-neon-red/40",
  critical: "border-neon-red bg-neon-red/5",
};

/** Animated wrapper for the expanded reroll/insurance drawer */
function ExpandedDrawer({ children }: { children: React.ReactNode }) {
  const fadeIn = useFadeInUp(0, 250);
  return (
    <Animated.View style={[fadeIn, { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 8, gap: 8 }]}>
      {children}
    </Animated.View>
  );
}

/** Pulsing wrapper for critical-risk mission cards */
function CriticalPulse({ children }: { children: React.ReactNode }) {
  const pulseStyle = usePulse(true, 1500, 0.6);
  return <Animated.View style={pulseStyle}>{children}</Animated.View>;
}

function RerollControl({
  rerollStacks,
  scrapBalance,
  rerollCost,
  onDecrease,
  onIncrease,
}: {
  rerollStacks: number;
  scrapBalance: number;
  rerollCost: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const nextRerollCost = (rerollStacks + 1) * REROLL_COST_PER_STACK;
  const canIncrease = rerollStacks < MAX_REROLL_STACKS && scrapBalance >= nextRerollCost;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base text-white/70">Reroll</Text>
          <Text className="text-sm text-neon-cyan font-mono">-{rerollStacks * REROLL_REDUCTION}% fail</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            hitSlop={12}
            disabled={rerollStacks <= 0}
            onPress={onDecrease}
            style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
          >
            <Minus size={20} color="rgba(255,255,255,0.6)" />
          </Button>
          <Text className="font-mono text-lg text-white" style={{ minWidth: 20, textAlign: "center" }}>
            {rerollStacks}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            hitSlop={12}
            disabled={!canIncrease}
            onPress={onIncrease}
            style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
          >
            <Plus size={20} color="rgba(255,255,255,0.6)" />
          </Button>
        </View>
      </View>
      <View className="flex-row items-center justify-between" style={{ minHeight: 20 }}>
        <Text className="text-xs text-white/40">
          Cost: {REROLL_COST_PER_STACK} scrap per stack
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Image source={require("@/assets/icons/scrap.png")} style={{ width: 22, height: 22 }} />
          <Text className="text-sm font-mono text-white/60">{rerollCost}</Text>
        </View>
      </View>
    </View>
  );
}

function InsuranceControl({
  insured,
  crystalBalance,
  insuranceCost,
  onToggle,
}: {
  insured: boolean;
  crystalBalance: number;
  insuranceCost: number;
  onToggle: () => void;
}) {
  const canEnable = crystalBalance >= insuranceCost;
  const disabled = !insured && !canEnable;

  return (
    <View
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: insured ? "rgba(20,241,149,0.45)" : "rgba(255,255,255,0.16)",
        backgroundColor: insured ? "rgba(20,241,149,0.10)" : "rgba(255,255,255,0.03)",
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 6,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Shield size={16} color={insured ? "#14F195" : "rgba(255,255,255,0.55)"} />
          <View>
            <Text className={`text-sm font-mono ${insured ? "text-neon-green" : "text-white/75"}`}>
              Insurance
            </Text>
            <Text className="text-xs text-neon-amber/80">Protect streak on failure</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <Image source={require("@/assets/icons/tokens.png")} style={{ width: 20, height: 20 }} />
          <Text className="text-xs font-mono text-white/60">{insuranceCost}</Text>
        </View>
      </View>
      <Button
        variant={insured ? "default" : canEnable ? "outline" : "ghost"}
        size="sm"
        disabled={disabled}
        onPress={onToggle}
        className="w-full"
      >
        {insured
          ? "Disable insurance"
          : canEnable
          ? `Enable insurance (${insuranceCost})`
          : "Insurance unavailable"}
      </Button>
    </View>
  );
}

export function MissionPanel({
  missions,
  characterState,
  onStart,
  characterLevel = 1,
  durationModifier = 1,
  livesRemaining = 3,
  inventory,
  bossDefeated,
}: Props) {
  const canStart = characterState === "idle";
  const lives = Math.max(1, Math.min(3, livesRemaining));
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [missionOptions, setMissionOptions] = useState<{ rerollStacks: number; insured: boolean }>({
    rerollStacks: 0,
    insured: false,
  });

  const scrapBalance = inventory?.scrap ?? 0;
  const crystalBalance = inventory?.crystal ?? 0;
  const rerollCost = missionOptions.rerollStacks * REROLL_COST_PER_STACK;

  const handleStartMission = (mission: MissionType) => {
    onStart(mission.id, missionOptions.rerollStacks > 0 || missionOptions.insured ? { rerollStacks: missionOptions.rerollStacks, insured: missionOptions.insured } : undefined);
    setExpandedMission(null);
    setMissionOptions({ rerollStacks: 0, insured: false });
  };

  const toggleExpanded = (id: string) => {
    setExpandedMission((prev) => {
      const next = prev === id ? null : id;
      if (next !== prev) setMissionOptions({ rerollStacks: 0, insured: false });
      return next;
    });
  };

  const isTierLocked = (missionId: string): boolean => {
    if (missionId === "expedition" && characterLevel < 3) return true;
    if (missionId === "deep_dive" && characterLevel < 6) return true;
    if (missionId === "boss" && characterLevel < 5) return true;
    return false;
  };

  const getTierLabel = (missionId: string): string | null => {
    if (missionId === "expedition" && characterLevel < 3) return "Unlocks at Lv.3";
    if (missionId === "deep_dive" && characterLevel < 6) return "Unlocks at Lv.6";
    if (missionId === "boss" && characterLevel < 5) return "Unlocks at Lv.5";
    return null;
  };

  const isBossDay = missions.length === 1 && missions[0].id === "boss";
  const bossLocked = characterLevel < 5;

  // Boss defeated screen
  if (isBossDay && bossDefeated) {
    return (
      <View className="gap-4">
        <View className="rounded-xl border border-neon-amber/40 overflow-hidden">
          <LinearGradient
            colors={["rgba(255,184,0,0.1)", "rgba(255,184,0,0.03)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 24, gap: 16, alignItems: "center" }}
          >
            <View className="w-24 h-24 rounded-full bg-neon-amber/20 border-2 border-neon-amber/40 items-center justify-center">
              <Crown size={44} color="#ffb800" />
            </View>
            <View className="items-center gap-1.5">
              <Text className="text-3xl font-display text-neon-amber tracking-wide">WHALE DEFEATED</Text>
              <Text className="text-sm font-mono text-neon-amber/60 uppercase tracking-widest">Weekly boss slain</Text>
            </View>
            <View className="flex-row gap-2.5 w-full">
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Sparkles size={18} color="#9945ff" />
                <Text className="text-base font-display text-neon-purple">+2 SP</Text>
                <Text className="text-sm text-white/50">Claimed</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Crown size={18} color="#ffb800" />
                <Text className="text-base font-display text-neon-amber">Crown</Text>
                <Text className="text-sm text-white/50">On ranks</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Fish size={18} color="#14F195" />
                <Text className="text-base font-display text-neon-green">Slain</Text>
                <Text className="text-sm text-white/50">This epoch</Text>
              </View>
            </View>
            <Text className="text-base text-white/50 text-center">
              Regular transactions return tomorrow.
            </Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // Boss day view
  if (isBossDay) {
    const boss = missions[0];
    const displayDuration = Math.floor(boss.duration * durationModifier);
    const showExpanded = expandedMission === "boss";

    return (
      <View className="gap-4">
        <View className="rounded-xl border border-neon-amber/40 overflow-hidden">
          {/* Header with gradient bg */}
          <LinearGradient
            colors={["rgba(255,184,0,0.1)", "rgba(255,184,0,0.05)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 20, gap: 12, alignItems: "center" }}
          >
            <Text className="text-sm font-mono text-neon-amber/60 uppercase tracking-[0.2em]">Sunday Weekly Event</Text>
            <View className="flex-row items-center gap-3">
              <Fish size={32} color="#ffb800" />
              <Text className="text-3xl font-display text-neon-amber tracking-wide" style={{ letterSpacing: 0.5 }}>WHALE HUNT</Text>
              <Fish size={32} color="#ffb800" style={{ transform: [{ scaleX: -1 }] }} />
            </View>
            <Text className="text-base text-white/50 text-center max-w-[280px]">
              A massive whale has surfaced. One chance per epoch to take it down.
            </Text>

            {/* Key rewards */}
            <View className="flex-row gap-2.5 w-full">
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Sparkles size={18} color="#9945ff" />
                <Text className="text-base font-display text-neon-purple">+2 SP</Text>
                <Text className="text-sm text-white/50">Skill Points</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Crown size={18} color="#ffb800" />
                <Text className="text-base font-display text-neon-amber">Crown</Text>
                <Text className="text-sm text-white/50">Leaderboard</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
                <Sparkles size={18} color="#14F195" />
                <Text className="text-base font-display text-neon-green">20%</Text>
                <Text className="text-sm text-white/50">NFT Drop</Text>
              </View>
            </View>

            {/* Bonus loot */}
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/exp.png")} style={{ width: 20, height: 20 }} />
                <Text className="text-sm font-mono text-white/50">500-1000 XP</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/scrap.png")} style={{ width: 22, height: 22 }} />
                <Text className="text-sm font-mono text-white/50">200-500</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/tokens.png")} style={{ width: 22, height: 22 }} />
                <Text className="text-sm font-mono text-white/50">50-100</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/key.png")} style={{ width: 22, height: 22 }} />
                <Text className="text-sm font-mono text-white/50">2-5</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Boss stats bar */}
          <View className="border-t border-neon-amber/20 bg-white/[0.02] px-5 py-3.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Clock size={16} color="rgba(255,255,255,0.5)" />
                <Text className="text-sm font-mono text-white/50">{formatDuration(displayDuration)}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Skull size={16} color="#FF3366" />
                <Text className="text-sm font-mono text-neon-red">{boss.failRate}% fail</Text>
              </View>
            </View>
            {bossLocked ? (
              <View className="flex-row items-center gap-1.5">
                <Lock size={16} color="rgba(255,255,255,0.5)" />
                <Text className="text-base text-white/50">Requires Lv.5</Text>
              </View>
            ) : (
              <Button
                size="md"
                variant="outline"
                className="border-neon-amber/40"
                disabled={!canStart}
                onPress={() => toggleExpanded("boss")}
              >
                {showExpanded ? "Cancel" : "Begin Hunt"}
              </Button>
            )}
          </View>

          {/* Expanded reroll/insurance/launch */}
          {showExpanded && !bossLocked && (
            <ExpandedDrawer>
              <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
                {/* Reroll stacks */}
                <RerollControl
                  rerollStacks={missionOptions.rerollStacks}
                  scrapBalance={scrapBalance}
                  rerollCost={rerollCost}
                  onDecrease={() => setMissionOptions((prev) => ({ ...prev, rerollStacks: prev.rerollStacks - 1 }))}
                  onIncrease={() => setMissionOptions((prev) => ({ ...prev, rerollStacks: prev.rerollStacks + 1 }))}
                />

                {/* Insurance */}
                <InsuranceControl
                  insured={missionOptions.insured}
                  crystalBalance={crystalBalance}
                  insuranceCost={INSURANCE_COST}
                  onToggle={() => setMissionOptions((prev) => ({ ...prev, insured: !prev.insured }))}
                />

                {/* Adjusted fail rate */}
                {(missionOptions.rerollStacks > 0 || missionOptions.insured) && (
                  <Text className="text-base text-center text-white/50">
                    Fail rate:{" "}
                    <Text style={{ textDecorationLine: "line-through" }}>{boss.failRate}%</Text>{" "}
                    <Text className="text-neon-green font-mono">{Math.max(0, boss.failRate - missionOptions.rerollStacks * REROLL_REDUCTION)}%</Text>
                    {missionOptions.insured ? <Text className="text-neon-amber ml-2"> + streak safe</Text> : null}
                  </Text>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  variant="gradient"
                  onPress={() => handleStartMission(boss)}
                >
                  Hunt the Whale
                </Button>
              </View>
            </ExpandedDrawer>
          )}
        </View>

        {!canStart && (
          <Text className="text-base text-white/50 text-center">
            {characterState === "on_mission"
              ? "Node is processing on chain"
              : "Node is recovering from slash"}
          </Text>
        )}
      </View>
    );
  }

  // Normal mission list
  return (
    <View
      className="rounded-xl border p-4 gap-2.5"
      style={{
        borderColor: "rgba(26,58,92,0.6)",
        backgroundColor: "#081222",
      }}
    >
      <View className="gap-1">
        <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Transactions</GradientText>
        <Text className="text-sm text-white/45">
          Select mission, tune risk modifiers, send.
        </Text>
      </View>
      <View className="gap-2">
        {missions.map((mission) => {
          const locked = isTierLocked(mission.id);
          const lockLabel = getTierLabel(mission.id);
          const displayDuration = Math.floor(mission.duration * durationModifier);
          const riskLevel = getRiskLevel(mission.id, lives);
          const dynamicLabel = RISK_LABELS[mission.id]?.[lives] ?? mission.name;
          const r = mission.rewards;
          const isExpanded = expandedMission === mission.id;
          const isCritical = riskLevel === "critical" && !locked;

          const cardContent = (
            <View
              className={`rounded-lg border p-3.5 bg-[#0a1628] gap-2.5 ${
                locked ? "opacity-50 border-white/[0.06]" : RISK_BORDER_CLASSES[riskLevel]
              }`}
              style={{ backgroundColor: "#0d1f34", overflow: "hidden" }}
            >
                {/* Top row: name + start button */}
                <View className="flex-row items-center justify-between">
                  <View className="gap-1.5 flex-1 mr-2">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className={`font-sans-semibold text-base ${
                          riskLevel === "critical" && !locked
                            ? "text-neon-red"
                            : riskLevel === "dangerous" && !locked
                            ? "text-neon-red/80"
                            : riskLevel === "risky" && !locked
                            ? "text-neon-amber"
                            : "text-white"
                        }`}
                      >
                        {locked ? mission.name : dynamicLabel}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2.5">
                      <View
                        className="flex-row items-center gap-1.5 rounded-md px-2 py-1"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      >
                        <Clock size={14} color="rgba(255,255,255,0.5)" />
                        <Text className="text-sm font-mono text-white/50">{formatDuration(displayDuration)}</Text>
                      </View>
                      <View
                        className="flex-row items-center gap-1.5 rounded-md px-2 py-1"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      >
                        <Skull
                          size={14}
                          color={
                            (riskLevel === "critical" || riskLevel === "dangerous") && !locked
                              ? "#FF3366"
                              : riskLevel === "risky" && !locked
                              ? "#ffb800"
                              : "rgba(255,255,255,0.5)"
                          }
                        />
                        <Text
                          className={`text-sm font-mono ${
                            (riskLevel === "critical" || riskLevel === "dangerous") && !locked
                              ? "text-neon-red"
                              : riskLevel === "risky" && !locked
                              ? "text-neon-amber"
                              : "text-white/50"
                          }`}
                        >
                          {mission.failRate}%
                        </Text>
                      </View>
                    </View>
                    {lockLabel && (
                      <View className="flex-row items-center gap-1.5">
                        <Lock size={14} color="rgba(255,255,255,0.5)" />
                        <Text className="text-sm text-white/50">{lockLabel}</Text>
                      </View>
                    )}
                  </View>
                  <Button
                    size="md"
                    disabled={!canStart || locked}
                    onPress={() => toggleExpanded(mission.id)}
                    variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : isExpanded ? "outline" : "gradient"}
                  >
                    {locked ? "Locked" : isExpanded ? "Cancel" : "Start"}
                  </Button>
                </View>

                {/* Rewards row */}
                {!locked && (
                  <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-white/[0.04] pt-2.5">
                    <View className="flex-row items-center gap-1.5">
                      <Image source={require("@/assets/icons/exp.png")} style={{ width: 20, height: 20 }} />
                      <Text className="text-sm font-mono text-white/50">{r.xpRange[0]}-{r.xpRange[1]}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Image source={require("@/assets/icons/scrap.png")} style={{ width: 22, height: 22 }} />
                      <Text className="text-sm font-mono text-white/50">{r.scrap[0]}-{r.scrap[1]}</Text>
                    </View>
                    {r.crystal && (
                      <View className="flex-row items-center gap-1.5">
                        <Image source={require("@/assets/icons/tokens.png")} style={{ width: 20, height: 20 }} />
                        <Text className="text-sm font-mono text-white/50">{r.crystal[0]}-{r.crystal[1]}</Text>
                      </View>
                    )}
                    {r.artifact && (
                      <View className="flex-row items-center gap-1.5">
                        <Image source={require("@/assets/icons/key.png")} style={{ width: 20, height: 20 }} />
                        <Text className="text-sm font-mono text-white/50">{r.artifact[0]}-{r.artifact[1]}</Text>
                      </View>
                    )}
                    {r.nftChance != null && r.nftChance > 0 && (
                      <View className="flex-row items-center gap-1.5">
                        <Sparkles size={14} color="#ffb800" />
                        <Text className="text-sm font-mono text-neon-amber">{r.nftChance}%</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Reroll & Insurance panel */}
                {isExpanded && !locked && (
                  <ExpandedDrawer>
                    {/* Reroll stacks */}
                    <RerollControl
                      rerollStacks={missionOptions.rerollStacks}
                      scrapBalance={scrapBalance}
                      rerollCost={rerollCost}
                      onDecrease={() => setMissionOptions((prev) => ({ ...prev, rerollStacks: prev.rerollStacks - 1 }))}
                      onIncrease={() => setMissionOptions((prev) => ({ ...prev, rerollStacks: prev.rerollStacks + 1 }))}
                    />

                    {/* Insurance toggle */}
                    <InsuranceControl
                      insured={missionOptions.insured}
                      crystalBalance={crystalBalance}
                      insuranceCost={INSURANCE_COST}
                      onToggle={() => setMissionOptions((prev) => ({ ...prev, insured: !prev.insured }))}
                    />

                    {/* Adjusted fail rate preview */}
                    {(missionOptions.rerollStacks > 0 || missionOptions.insured) && (
                      <Text className="text-sm text-center text-white/50">
                        Fail rate:{" "}
                        <Text style={{ textDecorationLine: "line-through" }}>{mission.failRate}%</Text>{" "}
                        <Text className="text-neon-green font-mono">
                          {Math.max(0, mission.failRate - missionOptions.rerollStacks * REROLL_REDUCTION)}%
                        </Text>
                        {missionOptions.insured ? <Text className="text-neon-amber"> + streak safe</Text> : null}
                      </Text>
                    )}

                    {/* Launch button */}
                    <Button
                      className="w-full"
                      size="lg"
                      variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "gradient"}
                      onPress={() => handleStartMission(mission)}
                    >
                      Send Transaction
                    </Button>
                  </ExpandedDrawer>
                )}
            </View>
          );

          return isCritical ? (
            <CriticalPulse key={mission.id}>{cardContent}</CriticalPulse>
          ) : (
            <View key={mission.id}>{cardContent}</View>
          );
        })}

        {!canStart && (
          <Text className="text-sm text-white/50 text-center">
            {characterState === "on_mission"
              ? "Node is processing on chain"
              : "Node is recovering from slash"}
          </Text>
        )}
      </View>
    </View>
  );
}
