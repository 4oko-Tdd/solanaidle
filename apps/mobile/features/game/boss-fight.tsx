import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Swords, Users, Zap } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/toast-provider";
import { usePulse } from "@/lib/animations";
import { Shadows } from "@/theme";
import type { WorldBoss, WeeklyRun } from "@solanaidle/shared";

function LiveDot() {
  const pulse = usePulse(true, 1200, 0.3);
  return (
    <Animated.View style={[pulse, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <View className="w-2 h-2 rounded-full bg-[#14F195]" />
      <Text className="text-sm font-mono text-[#14F195] uppercase">Live</Text>
    </Animated.View>
  );
}

interface Props {
  boss: WorldBoss | null;
  participantCount?: number;
  totalDamage?: number;
  playerContribution?: number;
  hasJoined?: boolean;
  overloadUsed?: boolean;
  wsConnected?: boolean;
  run?: WeeklyRun | null;
  onJoin?: () => Promise<void>;
  onOverload?: () => Promise<void>;
  onRefresh?: () => void;
}

export function BossFight({
  boss,
  participantCount = 0,
  totalDamage = 0,
  playerContribution = 0,
  hasJoined = false,
  overloadUsed = false,
  wsConnected = false,
  run,
  onJoin,
  onOverload,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [overloading, setOverloading] = useState(false);

  if (!boss) {
    return (
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,58,92,0.6)" }}>
        <BlurView intensity={60} tint="dark">
          <View style={{ backgroundColor: "rgba(10,22,40,0.95)", padding: 20, alignItems: "center", gap: 10 }}>
            <Swords size={36} color="rgba(74,122,155,0.3)" />
            <Text className="text-base text-[#4a7a9b] font-mono text-center">No active boss this week</Text>
            <Text className="text-sm text-[#4a7a9b]/60 text-center leading-relaxed">
              A new Protocol Leviathan spawns each weekend. Check back Friday.
            </Text>
          </View>
        </BlurView>
      </View>
    );
  }

  const hpPercent = boss.maxHp > 0 ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const isDefeated = boss.killed;
  const contributionPercent = totalDamage > 0 ? (playerContribution * 100).toFixed(1) : "0.0";

  const hpColor = hpPercent > 50 ? "#FF3366" : hpPercent > 20 ? "#ffb800" : "#14F195";

  const handleJoin = async () => {
    if (!onJoin) return;
    setJoining(true);
    try {
      await onJoin();
      toast("Joined the hunt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Failed to join", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleOverload = async () => {
    if (!onOverload) return;
    setOverloading(true);
    try {
      await onOverload();
      toast("OVERLOAD! Critical damage dealt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Overload failed", "error");
    } finally {
      setOverloading(false);
    }
  };

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: isDefeated ? "rgba(20,241,149,0.3)" : "rgba(255,51,102,0.3)" }}>
      <BlurView intensity={60} tint="dark">
        <View style={{ backgroundColor: "rgba(10,22,40,0.95)" }}>
          {/* Top gradient accent strip */}
          <LinearGradient
            colors={isDefeated ? ["#14F195", "#ffb800", "#14F195"] : ["#FF3366", "#9945ff", "#FF3366"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2 }}
          />

          <View style={{ padding: 20, gap: 14 }}>
          {/* Name & HP label */}
          <View className="items-center gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-mono text-white/40 uppercase tracking-widest">World Boss</Text>
              {!isDefeated && <LiveDot />}
            </View>
            <Text
              className={`text-3xl font-display tracking-wide ${
                isDefeated ? "text-[#14F195]" : "text-[#FF3366]"
              }`}
            >
              {boss.name}
            </Text>
          </View>

          {/* HP Bar */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-mono text-white/50">Integrity</Text>
              <Text className="text-base font-display" style={{ color: hpColor }}>
                {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
              </Text>
            </View>
            <View className="relative">
              <Progress value={hpPercent} color={hpColor} className="h-5" />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-sm font-display text-white">
                  {hpPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-2.5">
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
              <Users size={18} color="#00d4ff" />
              <Text className="text-base font-display text-[#00d4ff]">{participantCount}</Text>
              <Text className="text-sm text-white/50">Hunters</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
              <Swords size={18} color="#ffb800" />
              <Text className="text-base font-display text-[#ffb800]">{totalDamage.toLocaleString()}</Text>
              <Text className="text-sm text-white/50">Total DMG</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 items-center gap-1.5">
              <Zap size={18} color="#9945ff" />
              <Text className="text-base font-display text-[#9945ff]">{contributionPercent}%</Text>
              <Text className="text-sm text-white/50">Your Share</Text>
            </View>
          </View>

          {/* Actions */}
          {!isDefeated && (
            <View className="gap-2">
              {!hasJoined ? (
                <Button
                  variant="destructive"
                  onPress={handleJoin}
                  disabled={joining || !onJoin}
                  className="w-full h-11"
                >
                  <View className="flex-row items-center gap-2">
                    {joining ? (
                      <ActivityIndicator size="small" color="#FF3366" />
                    ) : (
                      <Swords size={18} color="#FF3366" />
                    )}
                    <Text className="text-base font-display text-[#FF3366]">Join the Hunt</Text>
                  </View>
                </Button>
              ) : (
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-center gap-2 py-1">
                    <Swords size={18} color="#14F195" />
                    <Text className="text-base font-display text-[#14F195]">Hunting</Text>
                  </View>
                  {overloadUsed ? (
                    <View className="flex-row items-center justify-center gap-2 h-12 rounded bg-white/[0.03] border border-white/[0.08] opacity-50">
                      <Zap size={18} color="rgba(255,255,255,0.4)" />
                      <Text className="text-base font-display text-white/40 line-through">OVERLOAD</Text>
                      <Text className="text-sm text-white/40 ml-1">Used</Text>
                    </View>
                  ) : (
                    <Button
                      variant="ghost"
                      onPress={handleOverload}
                      disabled={overloading || !onOverload}
                      className="w-full h-11"
                      style={{
                        backgroundColor: "rgba(153,69,255,0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(153,69,255,0.4)",
                        boxShadow: Shadows.glowPurple,
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        {overloading ? (
                          <ActivityIndicator size="small" color="#9945ff" />
                        ) : (
                          <Zap size={18} color="#9945ff" />
                        )}
                        <Text className="text-base font-display text-[#9945ff]">OVERLOAD</Text>
                      </View>
                    </Button>
                  )}
                </View>
              )}
            </View>
          )}

          {isDefeated && (
            <View className="items-center gap-2 pt-1">
              <Text className="text-base font-display text-[#14F195]">DEFEATED</Text>
              <Text className="text-base text-white/40 text-center">
                The Leviathan has been destroyed. Check rewards in your collection.
              </Text>
              {onRefresh && (
                <Button variant="outline" size="md" onPress={onRefresh}>
                  Refresh
                </Button>
              )}
            </View>
          )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}
