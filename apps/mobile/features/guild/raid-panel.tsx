import { View, Text, ActivityIndicator } from "react-native";
import { Swords, Clock, Users, Trophy } from "lucide-react-native";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import type { RaidMission, ActiveRaid } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  raids: RaidMission[];
  activeRaid: ActiveRaid | null;
  loading: boolean;
  startRaid: (raidId: string) => Promise<void>;
  commitRaid: () => Promise<void>;
  claimRaid: () => Promise<void>;
  onBack?: () => void;
}

export function RaidPanel({ raids, activeRaid, loading, startRaid, commitRaid, claimRaid, onBack }: Props) {
  if (raids.length === 0 && !activeRaid) {
    return (
      <GlassPanel contentStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
        <View className="w-20 h-20 rounded-full bg-neon-amber/5 border border-neon-amber/10 items-center justify-center">
          <Swords size={36} color="#4a7a9b" />
        </View>
        <Text className="text-lg font-sans-bold text-[#4a7a9b]">No raids yet</Text>
        <Text className="text-base text-[#4a7a9b] text-center leading-relaxed max-w-[280px]">
          Gather your guild members and launch a co-op raid for boosted loot.
        </Text>
        {onBack && (
          <Button variant="outline" size="lg" onPress={onBack} className="w-full">
            Back to Guild
          </Button>
        )}
      </GlassPanel>
    );
  }

  return (
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <View className="flex-row items-center gap-2.5">
        <Swords size={24} color="#FFB800" />
        <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Raids</GradientText>
      </View>
      <Text className="text-base text-[#4a7a9b] leading-relaxed">
        Co-op missions for your guild. Start a raid and wait for members to join before time runs out.
      </Text>

      {activeRaid ? (
        <View className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/[0.05] p-4 gap-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-base text-white">
              {raids.find((r) => r.id === activeRaid.raidId)?.name ?? activeRaid.raidId}
            </Text>
            {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
              <Badge variant="default">{formatTime(activeRaid.timeRemaining)}</Badge>
            ) : (
              <Badge variant="green">Complete!</Badge>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <Users size={16} color="#4a7a9b" />
            <Text className="text-sm text-[#4a7a9b] font-mono">
              {activeRaid.committedPlayers.length} committed
            </Text>
          </View>

          {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
            <Button
              size="md"
              onPress={commitRaid}
              disabled={loading}
              className="w-full bg-[#FFB800]/20 border border-[#FFB800]/40"
            >
              <View className="flex-row items-center gap-2">
                {loading ? (
                  <ActivityIndicator size="small" color="#FFB800" />
                ) : (
                  <Swords size={16} color="#FFB800" />
                )}
                <Text className="text-base font-mono text-neon-amber">Join Raid</Text>
              </View>
            </Button>
          ) : (
            <Button
              size="md"
              onPress={claimRaid}
              disabled={loading}
              className="w-full bg-[#14F195]/20 border border-[#14F195]/40"
            >
              <View className="flex-row items-center gap-2">
                {loading ? (
                  <ActivityIndicator size="small" color="#14F195" />
                ) : (
                  <Trophy size={16} color="#14F195" />
                )}
                <Text className="text-base font-mono text-neon-green">Claim Rewards</Text>
              </View>
            </Button>
          )}
        </View>
      ) : (
        <View className="gap-3">
          {raids.map((raid) => (
            <View
              key={raid.id}
              className="rounded-lg border border-[#1a3a5c]/40 bg-white/[0.02] p-4 gap-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-base text-white">{raid.name}</Text>
                <Badge variant="amber">{`${raid.lootMultiplier}x loot`}</Badge>
              </View>
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1.5">
                  <Users size={16} color="#4a7a9b" />
                  <Text className="text-sm text-[#4a7a9b] font-mono">{raid.requiredPlayers}p</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={16} color="#4a7a9b" />
                  <Text className="text-sm text-[#4a7a9b] font-mono">
                    {formatTime(raid.duration)}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-[#4a7a9b] leading-relaxed">{raid.description}</Text>
              <Button
                size="lg"
                variant="gradient"
                onPress={() => startRaid(raid.id)}
                disabled={loading}
                className="w-full"
              >
                <View className="flex-row items-center gap-2">
                  {loading && <ActivityIndicator size="small" color="#ffffff" />}
                  <Text className="text-base font-mono text-white">Start Raid</Text>
                </View>
              </Button>
            </View>
          ))}
        </View>
      )}
    </GlassPanel>
  );
}
