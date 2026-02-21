import { View, Text, Image } from "react-native";
import type { Inventory } from "@solanaidle/shared";

interface Props {
  inventory: Inventory | null;
}

export function CurrencyBar({ inventory }: Props) {
  if (!inventory) return null;
  return (
    <View className="flex-row gap-5 px-4 py-2 bg-surface border-b border-white/[0.06]">
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/scrap.png")}
          style={{ width: 22, height: 22 }}
        />
        <Text className="text-neon-green font-mono text-base">{inventory.scrap ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/tokens.png")}
          style={{ width: 22, height: 22 }}
        />
        <Text className="text-neon-cyan font-mono text-base">{inventory.crystal ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Image
          source={require("@/assets/icons/key.png")}
          style={{ width: 22, height: 22 }}
        />
        <Text className="text-neon-amber font-mono text-base">{inventory.artifact ?? 0}</Text>
      </View>
    </View>
  );
}
