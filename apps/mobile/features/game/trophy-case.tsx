import { View, Text, ActivityIndicator, Linking } from "react-native";
import { Award, Gem, ExternalLink } from "lucide-react-native";
import { useNfts } from "@/hooks/use-nfts";
import type { AchievementId } from "@solanaidle/shared";

const ACHIEVEMENT_ICONS: Record<AchievementId, string> = {
  boss_slayer: "💀",
  streak_master: "🔥",
  deep_explorer: "🌌",
  raid_victor: "⚔️",
  epoch_champion: "👑",
};

const EXPLORER_URL = "https://explorer.solana.com/address";
const CLUSTER = "?cluster=devnet";

function shortenAddress(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

interface Props {
  run?: { active?: boolean } | null;
  onViewCollection?: () => void;
}

export function TrophyCase({ run, onViewCollection }: Props) {
  const { relics, badges, loading } = useNfts();

  if (loading) {
    return (
      <View className="items-center justify-center py-6">
        <ActivityIndicator color="rgba(153,69,255,0.6)" size="small" />
      </View>
    );
  }

  if (badges.length === 0 && relics.length === 0) {
    return (
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 items-center gap-2">
        <View className="flex-row items-center gap-2 mb-1">
          <Award size={20} color="rgba(153,69,255,0.4)" />
          <Text className="text-sm font-bold text-white/50">Trophy Case</Text>
        </View>
        <Text className="text-sm text-white/40 text-center">
          Complete missions to earn permanent on-chain trophies
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <Award size={16} color="#9945ff" />
        <Text className="text-sm font-bold text-white">Trophy Case</Text>
        <Text className="ml-auto text-sm text-white/50 font-mono">
          {badges.length + relics.length} items
        </Text>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <View className="gap-1.5">
          <Text className="text-xs font-mono text-white/40 uppercase tracking-wider">Achievements</Text>
          <View className="flex-row flex-wrap gap-2">
            {badges.map((badge) => (
              <View
                key={badge.id}
                className="flex-row items-center gap-1.5 rounded-lg border border-[#9945FF]/20 bg-[#9945FF]/5 px-2.5 py-1.5"
              >
                <Text style={{ fontSize: 14 }}>
                  {ACHIEVEMENT_ICONS[badge.achievementId] ?? "🏅"}
                </Text>
                <View className="min-w-0">
                  <Text className="text-xs font-bold text-white" numberOfLines={1}>
                    {badge.name}
                  </Text>
                  <Text className="text-xs text-white/40">
                    {new Date(badge.earnedAt).toLocaleDateString()}
                  </Text>
                </View>
                {badge.mintAddress && (
                  <Text
                    className="ml-1 text-[#00d4ff]/60"
                    onPress={() =>
                      Linking.openURL(`${EXPLORER_URL}/${badge.mintAddress}${CLUSTER}`)
                    }
                  >
                    <ExternalLink size={11} color="rgba(0,212,255,0.6)" />
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Relics */}
      {relics.length > 0 && (
        <View className="gap-1.5">
          <Text className="text-xs font-mono text-white/40 uppercase tracking-wider">Relics</Text>
          <View className="flex-row flex-wrap gap-2">
            {relics.map((relic) => (
              <View
                key={relic.id}
                className="flex-row items-center gap-1.5 rounded-lg border border-[#ffb800]/20 bg-[#ffb800]/5 px-2.5 py-1.5"
              >
                <Gem size={13} color="#ffb800" />
                <View className="min-w-0">
                  <Text className="text-xs font-bold text-white" numberOfLines={1}>
                    {relic.name}
                  </Text>
                  <Text className="text-xs text-white/40">
                    {relic.missionId}
                  </Text>
                </View>
                {relic.mintAddress && (
                  <Text
                    className="ml-1"
                    onPress={() =>
                      Linking.openURL(`${EXPLORER_URL}/${relic.mintAddress}${CLUSTER}`)
                    }
                  >
                    <ExternalLink size={11} color="rgba(0,212,255,0.6)" />
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
