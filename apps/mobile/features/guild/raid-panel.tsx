import { View, Text, ActivityIndicator } from "react-native";
import { Swords, Clock, Users, Trophy } from "lucide-react-native";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
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
}

export function RaidPanel({ raids, activeRaid, loading, startRaid, commitRaid, claimRaid }: Props) {
  if (raids.length === 0 && !activeRaid) return null;

  return (
    <GlassPanel contentStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row items-center gap-2.5">
        <Swords size={20} color="#FFB800" />
        <Text className="text-base font-display text-white">Raids</Text>
      </View>
      <Text className="text-xs text-[#4a7a9b] leading-relaxed">
        Co-op missions for your guild. Start a raid and wait for members to join before time runs out.
      </Text>

      {activeRaid ? (
        <View className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/[0.05] p-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-sm text-white">
              {raids.find((r) => r.id === activeRaid.raidId)?.name ?? activeRaid.raidId}
            </Text>
            {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
              <Badge variant="default">{formatTime(activeRaid.timeRemaining)}</Badge>
            ) : (
              <Badge variant="green">Complete!</Badge>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <Users size={12} color="#4a7a9b" />
            <Text className="text-xs text-[#4a7a9b] font-mono">
              {activeRaid.committedPlayers.length} committed
            </Text>
          </View>

          {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
            <Button
              size="sm"
              onPress={commitRaid}
              disabled={loading}
              className="w-full bg-[#FFB800]/20 border border-[#FFB800]/40"
            >
              <View className="flex-row items-center gap-1.5">
                {loading ? (
                  <ActivityIndicator size="small" color="#FFB800" />
                ) : (
                  <Swords size={12} color="#FFB800" />
                )}
                <Text className="text-xs font-mono text-neon-amber">Join Raid</Text>
              </View>
            </Button>
          ) : (
            <Button
              size="sm"
              onPress={claimRaid}
              disabled={loading}
              className="w-full bg-[#14F195]/20 border border-[#14F195]/40"
            >
              <View className="flex-row items-center gap-1.5">
                {loading ? (
                  <ActivityIndicator size="small" color="#14F195" />
                ) : (
                  <Trophy size={12} color="#14F195" />
                )}
                <Text className="text-xs font-mono text-neon-green">Claim Rewards</Text>
              </View>
            </Button>
          )}
        </View>
      ) : (
        <View className="gap-2">
          {raids.map((raid) => (
            <View
              key={raid.id}
              className="rounded-lg border border-[#1a3a5c]/40 bg-[#0d1f35]/60 p-3 gap-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-sm text-white">{raid.name}</Text>
                <Badge variant="amber">{`${raid.lootMultiplier}x loot`}</Badge>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1">
                  <Users size={12} color="#4a7a9b" />
                  <Text className="text-xs text-[#4a7a9b] font-mono">{raid.requiredPlayers}p</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color="#4a7a9b" />
                  <Text className="text-xs text-[#4a7a9b] font-mono">
                    {formatTime(raid.duration)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-[#4a7a9b]">{raid.description}</Text>
              <Button
                size="sm"
                onPress={() => startRaid(raid.id)}
                disabled={loading}
                className="w-full"
              >
                <View className="flex-row items-center gap-1">
                  {loading && <ActivityIndicator size="small" color="#14F195" />}
                  <Text className="text-xs font-mono text-neon-green">Start Raid</Text>
                </View>
              </Button>
            </View>
          ))}
        </View>
      )}
    </GlassPanel>
  );
}
