import { View, Text, ActivityIndicator, Linking } from "react-native";
import { Award, Gem, ExternalLink } from "lucide-react-native";
import { useNfts } from "@/hooks/use-nfts";
import type { AchievementId } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";

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
      <GlassPanel contentStyle={{ padding: 20, alignItems: "center", gap: 10 }}>
        <View className="flex-row items-center gap-2.5 mb-1">
          <Award size={24} color="rgba(153,69,255,0.4)" />
          <Text className="text-lg font-sans-bold text-white/50">Trophy Case</Text>
        </View>
        <Text className="text-lg text-white/40 text-center">
          Complete missions to earn permanent on-chain trophies
        </Text>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <View className="flex-row items-center gap-2.5">
        <Award size={22} color="#9945ff" />
        <Text className="text-lg font-sans-bold text-white">Trophy Case</Text>
        <Text className="ml-auto text-base text-white/50 font-mono">
          {badges.length + relics.length} items
        </Text>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-mono text-white/40 uppercase tracking-wider">Achievements</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {badges.map((badge) => (
              <View
                key={badge.id}
                className="flex-row items-center gap-2 rounded-lg border border-[#9945FF]/20 bg-[#9945FF]/5 px-3 py-2"
              >
                <Text style={{ fontSize: 18 }}>
                  {ACHIEVEMENT_ICONS[badge.achievementId] ?? "🏅"}
                </Text>
                <View className="min-w-0">
                  <Text className="text-base font-sans-bold text-white" numberOfLines={1}>
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
                    <ExternalLink size={14} color="rgba(0,212,255,0.6)" />
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Relics */}
      {relics.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-mono text-white/40 uppercase tracking-wider">Relics</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {relics.map((relic) => (
              <View
                key={relic.id}
                className="flex-row items-center gap-2 rounded-lg border border-[#ffb800]/20 bg-[#ffb800]/5 px-3 py-2"
              >
                <Gem size={15} color="#ffb800" />
                <View className="min-w-0">
                  <Text className="text-base font-sans-bold text-white" numberOfLines={1}>
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
                    <ExternalLink size={14} color="rgba(0,212,255,0.6)" />
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassPanel>
  );
}
