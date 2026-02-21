import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Swords, Users, Zap } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/toast-provider";
import type { WorldBoss, WeeklyRun } from "@solanaidle/shared";

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
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 items-center gap-2">
        <Swords size={32} color="rgba(74,122,155,0.3)" />
        <Text className="text-sm text-[#4a7a9b] font-mono text-center">No active boss this week</Text>
        <Text className="text-xs text-[#4a7a9b]/60 text-center leading-relaxed">
          A new Protocol Leviathan spawns each weekend. Check back Friday.
        </Text>
      </View>
    );
  }

  const hpPercent = boss.maxHp > 0 ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const isDefeated = boss.killed;
  const contributionPercent = totalDamage > 0 ? (playerContribution * 100).toFixed(1) : "0.0";

  const hpColor = hpPercent > 50 ? "#ff4444" : hpPercent > 20 ? "#ffb800" : "#00ff87";

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
    <View>
      <View
        className={`relative rounded-xl border overflow-hidden ${
          isDefeated ? "border-[#00ff87]/30" : "border-[#ff4444]/30"
        } bg-[#0a1628]/80`}
      >
        {/* Top accent strip */}
        <View
          className={`h-0.5 ${isDefeated ? "bg-[#00ff87]" : "bg-[#ff4444]"}`}
        />

        <View className="p-4 gap-3">
          {/* Name & HP label */}
          <View className="items-center gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-mono text-white/40 uppercase tracking-widest">World Boss</Text>
              {wsConnected && (
                <View className="flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#00ff87]" />
                  <Text className="text-[10px] font-mono text-[#00ff87] uppercase">Live</Text>
                </View>
              )}
            </View>
            <Text
              className={`text-2xl font-bold tracking-wide ${
                isDefeated ? "text-[#00ff87]" : "text-[#ff4444]"
              }`}
            >
              {boss.name}
            </Text>
          </View>

          {/* HP Bar */}
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-mono text-white/40">Integrity</Text>
              <Text className="text-xs font-mono font-bold" style={{ color: hpColor }}>
                {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
              </Text>
            </View>
            <View className="relative">
              <Progress value={hpPercent} color={hpColor} className="h-4" />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-xs font-mono font-bold text-white">
                  {hpPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Users size={16} color="#00d4ff" />
              <Text className="text-sm font-bold font-mono text-[#00d4ff]">{participantCount}</Text>
              <Text className="text-xs text-white/40">Hunters</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Swords size={16} color="#ffb800" />
              <Text className="text-sm font-bold font-mono text-[#ffb800]">{totalDamage.toLocaleString()}</Text>
              <Text className="text-xs text-white/40">Total DMG</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 items-center gap-1">
              <Zap size={16} color="#9945ff" />
              <Text className="text-sm font-bold font-mono text-[#9945ff]">{contributionPercent}%</Text>
              <Text className="text-xs text-white/40">Your Share</Text>
            </View>
          </View>

          {/* Actions */}
          {!isDefeated && (
            <View className="gap-2">
              {!hasJoined ? (
                <Button
                  onPress={handleJoin}
                  disabled={joining || !onJoin}
                  className="w-full bg-[#ff4444]/20 border border-[#ff4444]/40 h-11"
                >
                  <View className="flex-row items-center gap-2">
                    {joining ? (
                      <ActivityIndicator size="small" color="#ff4444" />
                    ) : (
                      <Swords size={16} color="#ff4444" />
                    )}
                    <Text className="text-sm font-bold text-[#ff4444]">Join the Hunt</Text>
                  </View>
                </Button>
              ) : (
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-center gap-2 py-1">
                    <Swords size={16} color="#00ff87" />
                    <Text className="text-sm font-bold text-[#00ff87]">Hunting</Text>
                  </View>
                  {overloadUsed ? (
                    <View className="flex-row items-center justify-center gap-2 h-11 rounded bg-white/[0.03] border border-white/[0.08] opacity-50">
                      <Zap size={16} color="rgba(255,255,255,0.4)" />
                      <Text className="text-sm font-bold text-white/40 line-through">OVERLOAD</Text>
                      <Text className="text-xs text-white/40 ml-1">Used</Text>
                    </View>
                  ) : (
                    <Button
                      onPress={handleOverload}
                      disabled={overloading || !onOverload}
                      className="w-full bg-[#9945ff]/20 border border-[#9945ff]/40 h-11"
                    >
                      <View className="flex-row items-center gap-2">
                        {overloading ? (
                          <ActivityIndicator size="small" color="#9945ff" />
                        ) : (
                          <Zap size={16} color="#9945ff" />
                        )}
                        <Text className="text-sm font-bold text-[#9945ff]">OVERLOAD</Text>
                      </View>
                    </Button>
                  )}
                </View>
              )}
            </View>
          )}

          {isDefeated && (
            <View className="items-center gap-2 pt-1">
              <Text className="text-sm font-bold text-[#00ff87]">DEFEATED</Text>
              <Text className="text-xs text-white/40 text-center">
                The Leviathan has been destroyed. Check rewards in your collection.
              </Text>
              {onRefresh && (
                <Button variant="outline" size="sm" onPress={onRefresh}>
                  Refresh
                </Button>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
