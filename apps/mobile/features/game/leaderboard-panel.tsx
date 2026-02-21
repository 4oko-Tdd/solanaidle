import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Trophy, Crown, Medal, Signal, Swords, Heart } from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClassIcon } from "@/components/class-icon";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@solanaidle/shared";

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={14} color="#ffb800" />;
  if (rank === 2) return <Medal size={14} color="rgba(255,255,255,0.4)" />;
  if (rank === 3) return <Medal size={14} color="rgba(255,184,0,0.6)" />;
  return (
    <Text className="font-mono text-[#4a7a9b] text-xs">#{rank}</Text>
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
        <Text className="text-xs text-[#4a7a9b] font-mono">Loading rankings...</Text>
      </View>
    );
  }

  const safeEntries = entries ?? [];

  if (safeEntries.length === 0) {
    return (
      <View className="gap-4">
        {/* Header */}
        <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Trophy size={24} color="#ffb800" />
            <Text className="text-lg font-display text-white">Epoch Leaderboard</Text>
          </View>
          <Text className="text-xs text-[#4a7a9b] leading-relaxed">
            Compete against other validators each epoch. Complete missions, build streaks, and hunt whales to climb the ranks.
          </Text>
        </View>

        {/* Empty state */}
        <View className="rounded-xl border border-dashed border-[#1a3a5c]/60 bg-[#0a1628]/40 p-8 items-center gap-3">
          <Signal size={40} color="rgba(74,122,155,0.4)" />
          <Text className="text-sm font-bold text-[#4a7a9b]">No rankings yet</Text>
          <Text className="text-xs text-[#4a7a9b]/70 text-center leading-relaxed max-w-[240px]">
            Be the first to finalize an epoch and claim the top spot on the leaderboard.
          </Text>
        </View>

        {/* How scoring works */}
        <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
          <Text className="text-sm font-bold text-white">How Scoring Works</Text>
          <View className="gap-2">
            <View className="flex-row items-start gap-2">
              <Swords size={14} color="#14F195" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Missions</Text>
                <Text className="text-xs text-[#4a7a9b]">Each successful transaction adds to your score. Harder missions = more points.</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2">
              <Crown size={14} color="#ffb800" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Streaks</Text>
                <Text className="text-xs text-[#4a7a9b]">Chain successful missions for multipliers: 2x HODL, 4x Diamond Hands, 6x To The Moon.</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2">
              <Heart size={14} color="#ff4444" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Survival</Text>
                <Text className="text-xs text-[#4a7a9b]">3 lives per epoch. Lose them all and your run ends — choose missions wisely.</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const displayEntries = expanded ? safeEntries : safeEntries.slice(0, 10);
  const myEntry = currentWallet ? safeEntries.find((e) => e.walletAddress === currentWallet) : null;

  return (
    <View className="gap-4">
      {/* Header */}
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Trophy size={20} color="#ffb800" />
            <Text className="text-base font-display text-white">Epoch Leaderboard</Text>
          </View>
          <Badge variant="default">
            {`${safeEntries.length} ${safeEntries.length === 1 ? "player" : "players"}`}
          </Badge>
        </View>
        <Text className="text-[11px] text-[#4a7a9b] leading-relaxed">
          Top validators this epoch. Finalize your run to lock in your score.
        </Text>
      </View>

      {/* Your rank highlight */}
      {myEntry && (
        <View className="rounded-xl border border-[#9945FF]/40 bg-[#9945FF]/[0.08] px-3 py-2.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-mono text-[#9945FF]">#{myEntry.rank}</Text>
            <ClassIcon classId={myEntry.classId} size={16} />
            <Text className="text-sm font-bold text-white">You</Text>
          </View>
          <Text className="font-bold font-mono text-[#14F195]">{myEntry.score}</Text>
        </View>
      )}

      {/* Leaderboard rows */}
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 overflow-hidden">
        <FlatList
          data={displayEntries}
          keyExtractor={(item) => String(item.rank)}
          scrollEnabled={false}
          renderItem={({ item: entry, index }) => {
            const isMe = !!(currentWallet && entry.walletAddress === currentWallet);
            const isLast = index === displayEntries.length - 1;
            return (
              <View
                className={`flex-row items-center justify-between px-3 py-2.5 ${
                  !isLast ? "border-b border-[#1a3a5c]/30" : ""
                } ${isMe ? "bg-[#9945FF]/[0.06]" : ""}`}
              >
                <View className="flex-row items-center gap-2.5">
                  <View className="w-6 items-center">
                    <RankIcon rank={entry.rank} />
                  </View>
                  <ClassIcon classId={entry.classId} size={14} />
                  <Text className={`font-mono text-xs ${isMe ? "text-white font-bold" : "text-[#7ab8d9]"}`}>
                    {isMe ? "You" : truncateWallet(entry.walletAddress)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2.5">
                  {entry.bossDefeated && <Crown size={14} color="#ffb800" />}
                  <Text className="text-xs text-[#4a7a9b] font-mono">{entry.missionsCompleted}m</Text>
                  <Text className="font-bold font-mono text-[#14F195]">{entry.score}</Text>
                </View>
              </View>
            );
          }}
        />

        {safeEntries.length > 10 && (
          <View className="px-3 py-2 border-t border-[#1a3a5c]/30">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setExpanded(!expanded)}
            >
              <Text className="text-xs text-[#4a7a9b]">
                {expanded ? "Show top 10" : `Show all ${safeEntries.length} players`}
              </Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}
