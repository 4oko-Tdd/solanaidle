import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Clock, Lock, AlertTriangle, Sparkles, Shield, Minus, Plus, Crown, Fish } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { MissionType, CharacterState, MissionId, ClassId, Inventory } from "@solanaidle/shared";

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
  const [rerollStacks, setRerollStacks] = useState(0);
  const [insured, setInsured] = useState(false);

  const scrapBalance = inventory?.scrap ?? 0;
  const crystalBalance = inventory?.crystal ?? 0;
  const rerollCost = rerollStacks * REROLL_COST_PER_STACK;
  const insuranceCost = insured ? INSURANCE_COST : 0;
  const canAffordReroll = scrapBalance >= (rerollStacks + 1) * REROLL_COST_PER_STACK;
  const canAffordInsurance = crystalBalance >= INSURANCE_COST;

  const handleStartMission = (missionId: MissionId) => {
    onStart(missionId, rerollStacks > 0 || insured ? { rerollStacks, insured } : undefined);
    setExpandedMission(null);
    setRerollStacks(0);
    setInsured(false);
  };

  const toggleExpanded = (missionId: string) => {
    if (expandedMission === missionId) {
      setExpandedMission(null);
    } else {
      setExpandedMission(missionId);
      setRerollStacks(0);
      setInsured(false);
    }
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
        <View className="rounded-xl border border-neon-amber/40 bg-neon-amber/10 p-6 gap-4 items-center">
          <View className="w-20 h-20 rounded-full bg-neon-amber/20 border-2 border-neon-amber/40 items-center justify-center">
            <Crown size={40} color="#ffb800" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-neon-amber tracking-wide">WHALE DEFEATED</Text>
            <Text className="text-xs font-mono text-neon-amber/60 uppercase tracking-widest">Weekly boss slain</Text>
          </View>
          <View className="flex-row gap-2 w-full">
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Sparkles size={16} color="#9945ff" />
              <Text className="text-sm font-bold font-mono text-neon-purple">+2 SP</Text>
              <Text className="text-xs text-white/50">Claimed</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Crown size={16} color="#ffb800" />
              <Text className="text-sm font-bold font-mono text-neon-amber">Crown</Text>
              <Text className="text-xs text-white/50">On ranks</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Fish size={16} color="#00ff87" />
              <Text className="text-sm font-bold font-mono text-neon-green">Slain</Text>
              <Text className="text-xs text-white/50">This epoch</Text>
            </View>
          </View>
          <Text className="text-sm text-white/50 text-center">
            Regular transactions return tomorrow.
          </Text>
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
          {/* Header */}
          <View className="bg-neon-amber/10 p-5 gap-3 items-center">
            <Text className="text-xs font-mono text-neon-amber/60 uppercase tracking-[0.2em]">Sunday Weekly Event</Text>
            <View className="flex-row items-center gap-3">
              <Fish size={28} color="#ffb800" />
              <Text className="text-3xl font-bold text-neon-amber tracking-wide">WHALE HUNT</Text>
              <Fish size={28} color="#ffb800" />
            </View>
            <Text className="text-sm text-white/50 text-center max-w-[260px]">
              A massive whale has surfaced. One chance per epoch to take it down.
            </Text>

            {/* Key rewards */}
            <View className="flex-row gap-2 w-full">
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
                <Sparkles size={16} color="#9945ff" />
                <Text className="text-sm font-bold font-mono text-neon-purple">+2 SP</Text>
                <Text className="text-xs text-white/50">Skill Points</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
                <Crown size={16} color="#ffb800" />
                <Text className="text-sm font-bold font-mono text-neon-amber">Crown</Text>
                <Text className="text-xs text-white/50">Leaderboard</Text>
              </View>
              <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
                <Sparkles size={16} color="#00ff87" />
                <Text className="text-sm font-bold font-mono text-neon-green">20%</Text>
                <Text className="text-xs text-white/50">NFT Drop</Text>
              </View>
            </View>

            {/* Bonus loot */}
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/exp.png")} style={{ width: 18, height: 18 }} />
                <Text className="text-xs font-mono text-white/50">500-1000 XP</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/scrap.png")} style={{ width: 20, height: 20 }} />
                <Text className="text-xs font-mono text-white/50">200-500</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/tokens.png")} style={{ width: 20, height: 20 }} />
                <Text className="text-xs font-mono text-white/50">50-100</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Image source={require("@/assets/icons/key.png")} style={{ width: 20, height: 20 }} />
                <Text className="text-xs font-mono text-white/50">2-5</Text>
              </View>
            </View>
          </View>

          {/* Boss stats bar */}
          <View className="border-t border-neon-amber/20 bg-white/[0.02] px-5 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color="rgba(255,255,255,0.5)" />
                <Text className="text-xs font-mono text-white/50">{formatDuration(displayDuration)}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <AlertTriangle size={14} color="#ff4444" />
                <Text className="text-xs font-mono text-neon-red">{boss.failRate}% fail</Text>
              </View>
            </View>
            {bossLocked ? (
              <View className="flex-row items-center gap-1.5">
                <Lock size={14} color="rgba(255,255,255,0.5)" />
                <Text className="text-sm text-white/50">Requires Lv.5</Text>
              </View>
            ) : (
              <Button
                size="sm"
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
            <View className="border-t border-neon-amber/20 bg-white/[0.02] px-5 py-3 gap-2">
              {/* Reroll stacks */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm text-white/50">Reroll</Text>
                  <Text className="text-sm text-neon-cyan font-mono ml-1">-{rerollStacks * REROLL_REDUCTION}% fail</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={rerollStacks <= 0}
                    onPress={() => setRerollStacks((s) => s - 1)}
                  >
                    <Minus size={12} color="rgba(255,255,255,0.5)" />
                  </Button>
                  <Text className="font-mono text-sm text-white w-4 text-center">{rerollStacks}</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={rerollStacks >= MAX_REROLL_STACKS || !canAffordReroll}
                    onPress={() => setRerollStacks((s) => s + 1)}
                  >
                    <Plus size={12} color="rgba(255,255,255,0.5)" />
                  </Button>
                  {rerollStacks > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Image source={require("@/assets/icons/scrap.png")} style={{ width: 16, height: 16 }} />
                      <Text className="text-sm font-mono text-white/50">{rerollCost}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Insurance */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm text-white/50">Insurance</Text>
                  <Text className="text-sm text-neon-amber ml-1">protect streak</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Button
                    variant={insured ? "default" : "ghost"}
                    size="sm"
                    disabled={!insured && !canAffordInsurance}
                    onPress={() => setInsured(!insured)}
                  >
                    <View className="flex-row items-center gap-1">
                      <Shield size={12} color={insured ? "#00ff87" : "rgba(255,255,255,0.5)"} />
                      <Text className={`text-xs font-mono ${insured ? "text-neon-green" : "text-white/50"}`}>
                        {insured ? "ON" : "OFF"}
                      </Text>
                    </View>
                  </Button>
                  {insured && (
                    <View className="flex-row items-center gap-1">
                      <Image source={require("@/assets/icons/tokens.png")} style={{ width: 16, height: 16 }} />
                      <Text className="text-sm font-mono text-white/50">{insuranceCost}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Adjusted fail rate */}
              {(rerollStacks > 0 || insured) && (
                <Text className="text-xs text-center text-white/50">
                  Fail rate:{" "}
                  <Text style={{ textDecorationLine: "line-through" }}>{boss.failRate}%</Text>{" "}
                  <Text className="text-neon-green font-mono">{Math.max(0, boss.failRate - rerollStacks * REROLL_REDUCTION)}%</Text>
                  {insured ? <Text className="text-neon-amber ml-2"> + streak safe</Text> : null}
                </Text>
              )}

              <Button
                className="w-full border-neon-amber/40"
                size="sm"
                variant="outline"
                onPress={() => handleStartMission("boss")}
              >
                Hunt the Whale
              </Button>
            </View>
          )}
        </View>

        {!canStart && (
          <Text className="text-sm text-white/50 text-center">
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
    <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
      <Text className="text-base font-bold text-white">Transactions</Text>
      <View className="gap-3">
        {missions.map((mission) => {
          const locked = isTierLocked(mission.id);
          const lockLabel = getTierLabel(mission.id);
          const displayDuration = Math.floor(mission.duration * durationModifier);
          const riskLevel = getRiskLevel(mission.id, lives);
          const dynamicLabel = RISK_LABELS[mission.id]?.[lives] ?? mission.name;
          const r = mission.rewards;
          const isExpanded = expandedMission === mission.id;

          return (
            <View
              key={mission.id}
              className={`rounded-lg border p-3 bg-white/[0.02] gap-2 ${
                locked ? "opacity-50 border-white/[0.06]" : RISK_BORDER_CLASSES[riskLevel]
              }`}
            >
              {/* Top row: name + start button */}
              <View className="flex-row items-center justify-between">
                <View className="gap-1 flex-1 mr-2">
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className={`font-medium text-sm ${
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
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Clock size={12} color="rgba(255,255,255,0.5)" />
                      <Text className="text-xs font-mono text-white/50">{formatDuration(displayDuration)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <AlertTriangle
                        size={12}
                        color={
                          (riskLevel === "critical" || riskLevel === "dangerous") && !locked
                            ? "#ff4444"
                            : riskLevel === "risky" && !locked
                            ? "#ffb800"
                            : "rgba(255,255,255,0.5)"
                        }
                      />
                      <Text
                        className={`text-xs font-mono ${
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
                    <View className="flex-row items-center gap-1">
                      <Lock size={12} color="rgba(255,255,255,0.5)" />
                      <Text className="text-xs text-white/50">{lockLabel}</Text>
                    </View>
                  )}
                </View>
                <Button
                  size="sm"
                  disabled={!canStart || locked}
                  onPress={() => toggleExpanded(mission.id)}
                  variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
                >
                  {locked ? "Locked" : isExpanded ? "Cancel" : "Start"}
                </Button>
              </View>

              {/* Rewards row */}
              {!locked && (
                <View className="flex-row items-center gap-3 border-t border-white/[0.04] pt-2">
                  <View className="flex-row items-center gap-1">
                    <Image source={require("@/assets/icons/exp.png")} style={{ width: 18, height: 18 }} />
                    <Text className="text-xs font-mono text-white/50">{r.xpRange[0]}-{r.xpRange[1]}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Image source={require("@/assets/icons/scrap.png")} style={{ width: 22, height: 22 }} />
                    <Text className="text-xs font-mono text-white/50">{r.scrap[0]}-{r.scrap[1]}</Text>
                  </View>
                  {r.crystal && (
                    <View className="flex-row items-center gap-1">
                      <Image source={require("@/assets/icons/tokens.png")} style={{ width: 20, height: 20 }} />
                      <Text className="text-xs font-mono text-white/50">{r.crystal[0]}-{r.crystal[1]}</Text>
                    </View>
                  )}
                  {r.artifact && (
                    <View className="flex-row items-center gap-1">
                      <Image source={require("@/assets/icons/key.png")} style={{ width: 20, height: 20 }} />
                      <Text className="text-xs font-mono text-white/50">{r.artifact[0]}-{r.artifact[1]}</Text>
                    </View>
                  )}
                  {r.nftChance != null && r.nftChance > 0 && (
                    <View className="flex-row items-center gap-1">
                      <Sparkles size={12} color="#ffb800" />
                      <Text className="text-xs font-mono text-neon-amber">{r.nftChance}%</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Reroll & Insurance panel */}
              {isExpanded && !locked && (
                <View className="border-t border-white/[0.06] pt-2 gap-2">
                  {/* Reroll stacks */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs text-white/50">Reroll</Text>
                      <Text className="text-xs text-neon-cyan font-mono ml-1">-{rerollStacks * REROLL_REDUCTION}% fail</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={rerollStacks <= 0}
                        onPress={() => setRerollStacks((s) => s - 1)}
                      >
                        <Minus size={12} color="rgba(255,255,255,0.5)" />
                      </Button>
                      <Text className="font-mono text-sm text-white">{rerollStacks}</Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={rerollStacks >= MAX_REROLL_STACKS || !canAffordReroll}
                        onPress={() => setRerollStacks((s) => s + 1)}
                      >
                        <Plus size={12} color="rgba(255,255,255,0.5)" />
                      </Button>
                      {rerollStacks > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Image source={require("@/assets/icons/scrap.png")} style={{ width: 16, height: 16 }} />
                          <Text className="text-xs font-mono text-white/50">{rerollCost}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Insurance toggle */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs text-white/50">Insurance</Text>
                      <Text className="text-xs text-neon-amber ml-1">protect streak</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Button
                        variant={insured ? "default" : "ghost"}
                        size="sm"
                        disabled={!insured && !canAffordInsurance}
                        onPress={() => setInsured(!insured)}
                      >
                        <View className="flex-row items-center gap-1">
                          <Shield size={12} color={insured ? "#00ff87" : "rgba(255,255,255,0.5)"} />
                          <Text className={`text-xs font-mono ${insured ? "text-neon-green" : "text-white/50"}`}>
                            {insured ? "ON" : "OFF"}
                          </Text>
                        </View>
                      </Button>
                      {insured && (
                        <View className="flex-row items-center gap-1">
                          <Image source={require("@/assets/icons/tokens.png")} style={{ width: 16, height: 16 }} />
                          <Text className="text-xs font-mono text-white/50">{insuranceCost}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Adjusted fail rate preview */}
                  {(rerollStacks > 0 || insured) && (
                    <Text className="text-xs text-center text-white/50">
                      Fail rate:{" "}
                      <Text style={{ textDecorationLine: "line-through" }}>{mission.failRate}%</Text>{" "}
                      <Text className="text-neon-green font-mono">
                        {Math.max(0, mission.failRate - rerollStacks * REROLL_REDUCTION)}%
                      </Text>
                      {insured ? <Text className="text-neon-amber"> + streak safe</Text> : null}
                    </Text>
                  )}

                  {/* Launch button */}
                  <Button
                    className="w-full"
                    size="sm"
                    variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
                    onPress={() => handleStartMission(mission.id)}
                  >
                    Send Transaction
                  </Button>
                </View>
              )}
            </View>
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
