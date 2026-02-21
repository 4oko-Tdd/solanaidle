import { View, Text, Image } from "react-native";
import type { Inventory } from "@solanaidle/shared";

interface Props {
  inventory: Inventory | null;
}

export function CurrencyBar({ inventory }: Props) {
  if (!inventory) return null;
  return (
    <View
      className="flex-row justify-center gap-6 py-2 border-b border-white/[0.06]"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <View className="flex-row items-center gap-2">
        <Image
          source={require("@/assets/icons/scrap.png")}
          style={{ width: 32, height: 32 }}
        />
        <Text className="text-neon-green font-mono text-lg">{inventory.scrap ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Image
          source={require("@/assets/icons/tokens.png")}
          style={{ width: 32, height: 32 }}
        />
        <Text className="text-neon-cyan font-mono text-lg">{inventory.crystal ?? 0}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Image
          source={require("@/assets/icons/key.png")}
          style={{ width: 32, height: 32 }}
        />
        <Text className="text-neon-amber font-mono text-lg">{inventory.artifact ?? 0}</Text>
      </View>
    </View>
  );
}
