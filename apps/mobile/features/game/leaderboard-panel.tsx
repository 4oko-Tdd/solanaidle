import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Trophy, Crown, Medal, Signal, Swords, Heart } from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClassIcon } from "@/components/class-icon";
import { GradientText } from "@/components/gradient-text";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={18} color="#ffb800" />;
  if (rank === 2) return <Medal size={18} color="rgba(255,255,255,0.4)" />;
  if (rank === 3) return <Medal size={18} color="rgba(255,184,0,0.6)" />;
  return (
    <Text className="font-mono text-[#4a7a9b] text-sm">#{rank}</Text>
  );
}

interface Props {
  isAuthenticated: boolean;
  currentWallet?: string;
}

export function LeaderboardPanel({ isAuthenticated, currentWallet }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api<LeaderboardEntry[]>("/runs/leaderboard");
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <View className="flex-col items-center justify-center gap-3 py-16">
        <ActivityIndicator color="#4a7a9b" size="small" />
        <Text className="text-sm text-[#4a7a9b] font-mono">Loading rankings...</Text>
      </View>
    );
  }

  const safeEntries = entries ?? [];

  if (safeEntries.length === 0) {
    return (
      <View className="gap-4">
        {/* Header */}
        <GlassPanel contentStyle={{ padding: 20, gap: 12 }}>
          <View className="flex-row items-center gap-2.5">
            <Trophy size={26} color="#ffb800" />
            <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Epoch Leaderboard</GradientText>
          </View>
          <Text className="text-base text-[#4a7a9b] leading-relaxed">
            Compete against other validators each epoch. Complete missions, build streaks, and hunt whales to climb the ranks.
          </Text>
        </GlassPanel>

        {/* Empty state */}
        <GlassPanel contentStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
          <View className="w-20 h-20 rounded-full bg-neon-amber/5 border border-neon-amber/10 items-center justify-center">
            <Signal size={36} color="#4a7a9b" />
          </View>
          <Text className="text-lg font-sans-bold text-[#4a7a9b]">No rankings yet</Text>
          <Text className="text-base text-[#4a7a9b] text-center leading-relaxed max-w-[280px]">
            Be the first to finalize an epoch and claim the top spot on the leaderboard.
          </Text>
        </GlassPanel>

        {/* How scoring works */}
        <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
          <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>How Scoring Works</Text>
          <View className="gap-3.5">
            <View className="flex-row items-start gap-3">
              <View className="w-9 h-9 rounded-md bg-neon-green/10 border border-neon-green/20 items-center justify-center mt-0.5">
                <Swords size={18} color="#14F195" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Missions</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">Each successful transaction adds to your score. Harder missions = more points.</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-9 h-9 rounded-md bg-neon-amber/10 border border-neon-amber/20 items-center justify-center mt-0.5">
                <Crown size={18} color="#ffb800" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Streaks</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">Chain successful missions for multipliers: 2x HODL, 4x Diamond Hands, 6x To The Moon.</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-9 h-9 rounded-md bg-neon-red/10 border border-neon-red/20 items-center justify-center mt-0.5">
                <Heart size={18} color="#FF3366" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Survival</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">3 lives per epoch. Lose them all and your run ends — choose missions wisely.</Text>
              </View>
            </View>
          </View>
        </GlassPanel>
      </View>
    );
  }

  const displayEntries = expanded ? safeEntries : safeEntries.slice(0, 10);
  const myEntry = currentWallet ? safeEntries.find((e) => e.walletAddress === currentWallet) : null;

  return (
    <View className="gap-4">
      {/* Header */}
      <GlassPanel contentStyle={{ padding: 20, gap: 10 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Trophy size={24} color="#ffb800" />
            <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Epoch Leaderboard</GradientText>
          </View>
          <Badge variant="default">
            {`${safeEntries.length} ${safeEntries.length === 1 ? "player" : "players"}`}
          </Badge>
        </View>
        <Text className="text-sm text-[#4a7a9b] leading-relaxed">
          Top validators this epoch. Finalize your run to lock in your score.
        </Text>
      </GlassPanel>

      {/* Your rank highlight */}
      {myEntry && (
        <GlassPanel glow="purple" contentStyle={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View className="flex-row items-center gap-3">
            <Text className="text-base font-mono text-[#9945FF]">#{myEntry.rank}</Text>
            <ClassIcon classId={myEntry.classId} size={20} />
            <Text className="text-base font-sans-bold text-white">You</Text>
          </View>
          <Text className="text-lg font-display text-[#14F195]">{myEntry.score}</Text>
        </GlassPanel>
      )}

      {/* Leaderboard rows */}
      <GlassPanel contentStyle={{ padding: 0 }}>
        <FlatList
          data={displayEntries}
          keyExtractor={(item) => String(item.rank)}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: entry, index }) => {
            const isMe = !!(currentWallet && entry.walletAddress === currentWallet);
            const isLast = index === displayEntries.length - 1;
            return (
              <View
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  !isLast ? "border-b border-[#1a3a5c]/30" : ""
                } ${isMe ? "bg-[#9945FF]/[0.06]" : ""}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-7 items-center">
                    <RankIcon rank={entry.rank} />
                  </View>
                  <ClassIcon classId={entry.classId} size={18} />
                  <View>
                    <Text className={`${isMe ? "font-mono-bold text-sm text-white" : "font-mono text-sm text-[#7ab8d9]"}`}>
                      {isMe ? "You" : (entry.displayName ?? truncateWallet(entry.walletAddress))}
                    </Text>
                    {entry.title && (
                      <Text className="text-[10px] font-mono text-[#9945FF] uppercase tracking-wider">
                        {entry.title}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center gap-3">
                  {entry.bossDefeated && <Crown size={16} color="#ffb800" />}
                  <Text className="text-sm text-[#4a7a9b] font-mono">{entry.missionsCompleted}m</Text>
                  <Text className="text-base font-display text-[#14F195]">{entry.score}</Text>
                </View>
              </View>
            );
          }}
        />

        {safeEntries.length > 10 && (
          <View className="px-4 py-3 border-t border-[#1a3a5c]/30">
            <Button
              variant="outline"
              size="md"
              onPress={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? "Show top 10" : `Show all ${safeEntries.length} players`}
            </Button>
          </View>
        )}
      </GlassPanel>
    </View>
  );
}
