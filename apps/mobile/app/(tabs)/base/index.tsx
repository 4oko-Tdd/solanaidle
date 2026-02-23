import { ScrollView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { TrophyCase } from "@/features/game/trophy-case";
import { PermanentCollection } from "@/features/game/permanent-collection";
import { ScreenBg } from "@/components/screen-bg";
import { GlassPanel } from "@/components/glass-panel";

export default function BaseScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack, activeRun } = useGameState(isAuthenticated);
  const { offers, hasPending, loading, choosePerk } = usePerks();

  return (
    <ScreenBg>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <UpgradePanel
          upgradeInfo={upgradeInfo}
          inventory={inventory}
          onUpgrade={upgradeTrack}
        />
        <PerkPicker
          perks={{ offers, hasPending, loading }}
          inventory={inventory}
          onActivate={choosePerk}
        />
        <PermanentCollection />
        <TrophyCase
          run={activeRun}
          onViewCollection={() => router.push("/(tabs)/ranks/collection")}
        />

        {/* Epoch Rules */}
        <GlassPanel contentStyle={{ padding: 12, gap: 8 }}>
          <Text className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Epoch Rules</Text>
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#FF3366]" />
              <Text className="text-xs font-mono text-white/50">Resets: missions, score, streak, boss</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#14F195]" />
              <Text className="text-xs font-mono text-white/50">Persists: gear, perks, inventory, salvage</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#ffb800]" />
              <Text className="text-xs font-mono text-white/50">Carry-over: 20% of resources</Text>
            </View>
          </View>
        </GlassPanel>
      </View>
    </ScrollView>
    </ScreenBg>
  );
}
