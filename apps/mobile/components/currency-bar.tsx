import { View, Text, Image } from "react-native";
import type { Inventory } from "@solanaidle/shared";

interface Props {
  inventory: Inventory | null;
}

export function CurrencyBar({ inventory }: Props) {
  if (!inventory) return null;
  return (
    <View className="flex-row gap-4 px-4 py-2 bg-surface border-b border-white/[0.06]">
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/scrap.png")}
          style={{ width: 16, height: 16 }}
        />
        <Text className="text-white/70 font-mono text-sm">{inventory.scrap ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/tokens.png")}
          style={{ width: 16, height: 16 }}
        />
        <Text className="text-neon-cyan font-mono text-sm">{inventory.crystal ?? 0}</Text>
      </View>
      {(inventory.artifact ?? 0) > 0 && (
        <View className="flex-row items-center gap-1.5">
          <Image
            source={require("@/assets/icons/key.png")}
            style={{ width: 16, height: 16 }}
          />
          <Text className="text-neon-amber font-mono text-sm">{inventory.artifact}</Text>
        </View>
      )}
    </View>
  );
}
