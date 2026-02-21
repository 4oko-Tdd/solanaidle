import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { CurrencyBar } from "@/components/currency-bar";

export default function BaseScreen() {
  const { isAuthenticated } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack } = useGameState(isAuthenticated);
  const { offers, hasPending, loading, choosePerk } = usePerks();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
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
      </View>
    </ScrollView>
  );
}
