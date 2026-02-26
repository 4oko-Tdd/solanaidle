import { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Linking, Pressable } from "react-native";
import {
  Sparkles,
  Gift,
  Dice5,
  ShieldCheck,
  ExternalLink,
  Skull,
  Swords,
  Crown,
  Trophy,
  Zap,
  Heart,
  TrendingUp,
} from "lucide-react-native";
import { Button } from "@/components/ui";
import { ClassIcon } from "@/components/class-icon";
import { ScreenBg } from "@/components/screen-bg";
import { useVrfRoll } from "@/hooks/use-vrf-roll";
import { api } from "@/lib/api";
import type {
  WeeklyRun,
  RunEvent,
  ClassId,
  EpochFinalizeResponse,
  EpochBonusRewards,
} from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
  onClose: () => void;
}

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

const CLASS_TEXT_COLORS: Record<ClassId, string> = {
  scout: "text-neon-amber",
  guardian: "text-neon-cyan",
  mystic: "text-neon-purple",
};

const MULTIPLIER_LABELS: Record<number, { color: string; label: string }> = {
  1: { color: "text-white/50", label: "Standard" },
  1.5: { color: "text-neon-cyan", label: "Lucky" },
  2: { color: "text-neon-amber", label: "Rare" },
  3: { color: "text-neon-purple", label: "Legendary" },
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

function getGrade(
  score: number,
  missions: number,
  bossDefeated: boolean
): { letter: string; color: string } {
  if (bossDefeated && score >= 500) return { letter: "S", color: "text-neon-purple" };
  if (bossDefeated || score >= 400) return { letter: "A", color: "text-neon-amber" };
  if (score >= 200 && missions >= 10) return { letter: "B", color: "text-neon-green" };
  if (score >= 100) return { letter: "C", color: "text-neon-cyan" };
  return { letter: "D", color: "text-white/40" };
}

function MagicBlockNote() {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      <ShieldCheck size={12} color="#00d4ff" />
      <Text className="text-xs text-white/40">Randomness secured by MagicBlock VRF</Text>
    </View>
  );
}

export function RunEndScreen({ run, onClose }: Props) {
  const [phase, setPhase] = useState<"summary" | "rolling" | "bonus" | "done">("summary");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [bonus, setBonus] = useState<EpochBonusRewards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestRoll, status: vrfStatus, reset: resetVrf } = useVrfRoll();
  const weekNum = getWeekNumber(run.weekStart);

  useEffect(() => {
    api<RunEvent[]>(`/runs/${run.id}/events`)
      .then(setEvents)
      .catch(() => {});
  }, [run.id]);

  const deaths = events.filter(
    (e) => e.eventType === "mission_fail" && !(e.data as any)?.escaped
  ).length;
  const grade = getGrade(run.score, run.missionsCompleted, run.bossDefeated);

  const handleFinalize = async () => {
    setError(null);
    setPhase("rolling");

    try {
      // Build epoch-end message to sign in the same MWA session as the VRF tx
      const msg = `END_RUN:week${weekNum}:score:${run.score}:${Date.now()}`;
      const msgBytes = new TextEncoder().encode(msg);

      // Single MWA session: VRF tx + message signature (one wallet popup)
      const rollResult = await requestRoll(msgBytes);

      if (!rollResult) {
        throw new Error("VRF roll failed");
      }

      const signature = rollResult.messageSig ?? "vrf-authorized";

      // Finalize with backend (includes VRF account for bonus calc)
      const result = await api<EpochFinalizeResponse>(`/runs/${run.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({
          signature,
          vrfAccount: rollResult.vrfAccount,
        }),
      });

      if (result.bonus) {
        setBonus(result.bonus);
        setPhase("bonus");
      } else {
        setPhase("done");
        onClose();
      }
    } catch (e) {
      console.error("[RunEndScreen] finalize failed:", e);
      setError("Finalization failed. Try again.");
      setPhase("summary");
      resetVrf();
    }
  };

  const handleContinue = () => {
    setPhase("done");
    onClose();
  };

  const classTextColor = CLASS_TEXT_COLORS[run.classId] ?? "text-neon-amber";

  // ── Rolling phase ──
  if (phase === "rolling") {
    const steps = [
      { key: "requesting", label: "Requesting randomness", Icon: Dice5 },
      { key: "waiting-oracle", label: "Oracle verifying", Icon: ShieldCheck },
      { key: "fulfilled", label: "Calculating bonus", Icon: Sparkles },
    ];
    const activeIdx = steps.findIndex((s) => s.key === vrfStatus);

    return (
      <ScreenBg>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
        <View className="rounded-2xl border border-neon-purple/20 bg-[#091120] overflow-hidden">
          <View className="h-1 bg-neon-purple/60" />
          <View className="p-6 gap-6 items-center">
            {/* Animated dice */}
            <View className="w-20 h-20 rounded-full bg-neon-purple/10 border border-neon-purple/30 items-center justify-center">
              <ActivityIndicator color="#9945ff" size="large" />
            </View>

            <View className="items-center gap-1">
              <Text className="text-2xl font-display text-neon-purple">Rolling Rewards</Text>
              <Text className="text-xs text-white/40 font-mono">Epoch {weekNum} Finalization</Text>
            </View>

            {/* Progress steps */}
            <View className="w-full gap-2">
              {steps.map((step, i) => {
                const isActive = step.key === vrfStatus;
                const isDone = activeIdx > i;
                const { Icon } = step;
                return (
                  <View
                    key={step.key}
                    className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 border ${
                      isActive
                        ? "bg-neon-purple/10 border-neon-purple/30"
                        : isDone
                        ? "bg-neon-green/5 border-neon-green/20"
                        : "bg-white/[0.02] border-transparent"
                    }`}
                  >
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center ${
                        isDone
                          ? "bg-neon-green/20"
                          : isActive
                          ? "bg-neon-purple/20"
                          : "bg-white/5"
                      }`}
                    >
                      {isDone ? (
                        <ShieldCheck size={14} color="#14F195" />
                      ) : isActive ? (
                        <ActivityIndicator size="small" color="#9945ff" />
                      ) : (
                        <Icon size={14} color="rgba(255,255,255,0.2)" />
                      )}
                    </View>
                    <Text
                      className={`text-sm font-sans-semibold ${
                        isDone
                          ? "text-neon-green/80"
                          : isActive
                          ? "text-neon-purple"
                          : "text-white/20"
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}

              {vrfStatus === "error" && (
                <View className="flex-row items-center gap-3 rounded-lg px-3 py-2.5 bg-neon-amber/5 border border-neon-amber/20">
                  <View className="w-7 h-7 rounded-full bg-neon-amber/20 items-center justify-center">
                    <Zap size={14} color="#ffb800" />
                  </View>
                  <Text className="text-sm text-neon-amber">Using server randomness</Text>
                </View>
              )}
            </View>

            <MagicBlockNote />
          </View>
        </View>
        </ScrollView>
      </ScreenBg>
    );
  }

  // ── Bonus reveal phase ──
  if (phase === "bonus" && bonus) {
    const mult = MULTIPLIER_LABELS[bonus.multiplier] ?? { color: "text-neon-green", label: "Bonus" };
    const scoreDelta = bonus.boostedScore - bonus.originalScore;
    const rollToneColor =
      bonus.multiplier >= 3 ? "#9945ff" : bonus.multiplier >= 2 ? "#ffb800" : bonus.multiplier > 1 ? "#00d4ff" : "#4a7a9b";

    return (
      <ScreenBg>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        >
          <View className="rounded-2xl border border-neon-amber/20 bg-[#091120] overflow-hidden">
            <View className="h-1 bg-neon-amber/60" />
            <View className="p-4 items-center gap-2.5">
              <View className="w-14 h-14 rounded-full bg-neon-amber/10 border border-neon-amber/20 items-center justify-center">
                <Gift size={30} color="#ffb800" />
              </View>
              <Text className="text-xl font-display text-neon-amber">Epoch Bonus Result</Text>
              <Text className="text-sm text-white/50 text-center">Your roll has been applied to final score.</Text>
              {bonus.vrfVerified && (
                <View className="flex-row items-center gap-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1">
                  <ShieldCheck size={12} color="#00d4ff" />
                  <Text className="text-xs text-neon-cyan font-sans-semibold">VRF verified</Text>
                </View>
              )}
            </View>
          </View>

          <View className="rounded-xl border border-white/[0.08] bg-[#091120] p-4 gap-3">
            <View className="items-center gap-1">
              <Text className="text-xs font-mono text-white/40 uppercase tracking-widest">Your Roll</Text>
              <Text className={`text-5xl font-sans-bold ${mult.color}`}>{bonus.multiplier}x</Text>
              <Text className="text-xs text-white/45">{mult.label} multiplier</Text>
            </View>

            <View className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
              <View className="flex-row items-center justify-between">
                <View className="items-center">
                  <Text className="text-xs text-white/40 uppercase tracking-wider">Before</Text>
                  <Text className="text-lg font-mono text-white/75">{bonus.originalScore}</Text>
                </View>
                <TrendingUp size={18} color={rollToneColor} />
                <View className="items-center">
                  <Text className="text-xs text-white/40 uppercase tracking-wider">Final</Text>
                  <Text className="text-2xl font-display text-neon-green">{bonus.boostedScore}</Text>
                </View>
              </View>
            </View>

            <View className="items-center">
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: scoreDelta > 0 ? "rgba(20,241,149,0.35)" : "rgba(255,255,255,0.14)",
                  backgroundColor: scoreDelta > 0 ? "rgba(20,241,149,0.12)" : "rgba(255,255,255,0.05)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: scoreDelta > 0 ? "#14F195" : "rgba(255,255,255,0.55)",
                    fontFamily: "RobotoMono_400Regular",
                  }}
                >
                  {scoreDelta > 0 ? `+${scoreDelta} bonus score` : "No score bonus"}
                </Text>
              </View>
            </View>
          </View>

          {bonus.permanentLootDrop && bonus.permanentLootItemId && (
            <View className="rounded-xl border border-neon-amber/20 bg-neon-amber/5 p-3 flex-row items-center justify-center gap-2.5">
              <Sparkles size={16} color="#ffb800" />
              <View className="items-center">
                <Text className="text-xs text-neon-amber/70 uppercase tracking-wider">Permanent Loot</Text>
                <Text className="text-sm font-sans-bold text-neon-amber">{bonus.permanentLootItemId}</Text>
              </View>
            </View>
          )}

          {bonus.vrfVerified && bonus.vrfAccount && (
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://explorer.solana.com/address/${bonus.vrfAccount}?cluster=devnet`
                )
              }
              className="rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 py-2"
            >
              <Text className="text-xs text-neon-cyan/80 text-center">Open VRF proof on Solana Explorer</Text>
            </Pressable>
          )}

          <Button onPress={handleContinue} size="lg" className="w-full">
            <Text className="text-base font-display text-neon-green">Apply & Continue</Text>
          </Button>

          <MagicBlockNote />
        </ScrollView>
      </ScreenBg>
    );
  }

  // ── Summary phase (default) ──
  return (
    <ScreenBg>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      >
      {/* Hero card */}
      <View className="rounded-2xl border border-white/[0.08] bg-[#091120] overflow-hidden">
        <View className="p-4 items-center gap-3">
          {/* Epoch label */}
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5">
            <Trophy size={10} color="#ffb800" />
            <Text className="text-xs font-mono text-white/40 uppercase tracking-wider">
              Epoch {weekNum} Complete
            </Text>
          </View>

          {/* Character + score */}
          <View className="flex-row items-center gap-4">
            {/* Avatar + grade */}
            <View className="relative">
              <View className="rounded-full border-2 border-white/20 bg-[#091120] p-1.5 items-center justify-center w-16 h-16">
                <ClassIcon classId={run.classId} size={40} />
              </View>
              <View className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-terminal border-2 border-white/20 items-center justify-center">
                <Text className={`text-xs font-sans-bold ${grade.color}`}>{grade.letter}</Text>
              </View>
            </View>

            {/* Class + score */}
            <View>
              <Text className={`text-sm font-sans-semibold ${classTextColor}`}>
                {CLASS_NAMES[run.classId]}
              </Text>
              <Text className="text-4xl font-sans-bold text-neon-green leading-none mt-0.5">
                {run.score}
              </Text>
              <Text className="text-xs text-white/40 font-mono uppercase tracking-widest mt-0.5">
                Final Score
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats grid — 2x2 */}
      <View className="flex-row gap-2.5 flex-wrap">
        <View className="flex-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#091120] p-3 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-lg bg-neon-green/10 items-center justify-center">
            <Swords size={18} color="#14F195" />
          </View>
          <View>
            <Text className="font-mono-bold text-lg text-neon-green leading-none">
              {run.missionsCompleted}
            </Text>
            <Text className="text-xs text-white/40 font-mono uppercase mt-0.5">Missions</Text>
          </View>
        </View>

        <View className="flex-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#091120] p-3 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-lg bg-neon-red/10 items-center justify-center">
            <Skull size={18} color="#FF3366" />
          </View>
          <View>
            <Text className="font-mono-bold text-lg text-neon-red leading-none">{deaths}</Text>
            <Text className="text-xs text-white/40 font-mono uppercase mt-0.5">Deaths</Text>
          </View>
        </View>

        <View className="flex-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#091120] p-3 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-lg bg-neon-amber/10 items-center justify-center">
            <Crown size={18} color="#ffb800" />
          </View>
          <View>
            <Text
              className={`font-mono-bold text-lg leading-none ${
                run.bossDefeated ? "text-neon-amber" : "text-white/40"
              }`}
            >
              {run.bossDefeated ? "Slain" : "—"}
            </Text>
            <Text className="text-xs text-white/40 font-mono uppercase mt-0.5">Boss</Text>
          </View>
        </View>

        <View className="flex-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#091120] p-3 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-lg bg-neon-cyan/10 items-center justify-center">
            <Heart size={18} color="#00d4ff" />
          </View>
          <View>
            <Text className="font-mono-bold text-lg text-neon-cyan leading-none">
              {run.livesRemaining}
            </Text>
            <Text className="text-xs text-white/40 font-mono uppercase mt-0.5">Lives Left</Text>
          </View>
        </View>
      </View>

      {/* VRF CTA card */}
      <View className="rounded-2xl border border-neon-purple/25 bg-[#091120] overflow-hidden">
        <View className="p-4 gap-3">
          <View className="flex-row items-center justify-center gap-2">
            <Dice5 size={20} color="#9945ff" />
            <Text className="text-base font-display text-neon-purple">On-Chain Bonus Roll</Text>
          </View>

          {/* Multiplier chance bars */}
          <View className="flex-row gap-1.5 px-1">
            {[
              { mult: "1x", pct: 70, label: "70%", color: "#ffffff30" },
              { mult: "1.5x", pct: 20, label: "20%", color: "#00d4ff66" },
              { mult: "2x", pct: 8, label: "8%", color: "#ffb80066" },
              { mult: "3x", pct: 2, label: "2%", color: "#9945ff66" },
            ].map((tier) => (
              <View key={tier.mult} className="flex-1 items-center gap-1">
                <Text className="text-xs font-display text-white/80">{tier.mult}</Text>
                <View className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <View
                    style={{
                      width: `${tier.pct}%`,
                      height: "100%",
                      backgroundColor: tier.color,
                      borderRadius: 9999,
                    }}
                  />
                </View>
                <Text className="text-xs font-mono text-white/40">{tier.label}</Text>
              </View>
            ))}
          </View>

          <Text className="text-xs text-center text-white/40 leading-relaxed">
            Seal your score on the leaderboard with verifiable on-chain randomness.
          </Text>

          {error && <Text className="text-xs text-center text-neon-red">{error}</Text>}

          <Button
            onPress={handleFinalize}
            disabled={phase !== "summary"}
            size="lg"
            className="w-full bg-neon-purple/20 border border-neon-purple/40"
          >
            <View className="flex-row items-center gap-2">
              <Dice5 size={20} color="#9945ff" />
              <Text className="text-base font-display text-neon-purple">Finalize &amp; Roll</Text>
            </View>
          </Button>
        </View>

        <View className="py-2 bg-white/[0.02] border-t border-white/[0.04] items-center">
          <MagicBlockNote />
        </View>
      </View>
      </ScrollView>
    </ScreenBg>
  );
}
