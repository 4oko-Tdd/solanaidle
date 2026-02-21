import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { InventoryPanel } from "@/features/inventory/inventory-panel";

export default function InventoryRoute() {
  const { isAuthenticated } = useAuth();
  const { inventory } = useGameState(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4">
        <InventoryPanel inventory={inventory} />
      </View>
    </ScrollView>
  );
}
