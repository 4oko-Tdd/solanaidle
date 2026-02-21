import { ScrollView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { TrophyCase } from "@/features/game/trophy-case";
import { PermanentCollection } from "@/features/game/permanent-collection";
import { CurrencyBar } from "@/components/currency-bar";

export default function BaseScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack, activeRun } = useGameState(isAuthenticated);
  const { offers, hasPending, loading, choosePerk } = usePerks();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <CurrencyBar inventory={inventory} />
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
        <View className="rounded-lg border border-white/[0.06] bg-[#0a1628]/60 p-3 gap-1.5">
          <Text className="text-xs font-mono text-white/50 uppercase tracking-wider">Epoch Rules</Text>
          <View className="gap-1">
            <Text className="text-xs text-white/40">↺ Resets: missions, score, streak, boss</Text>
            <Text className="text-xs text-white/40">✓ Persists: gear, perks, inventory, salvage</Text>
            <Text className="text-xs text-white/40">⚡ Carry-over: 20% of resources</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
