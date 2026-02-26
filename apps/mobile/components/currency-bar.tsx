import { View, Text, Image } from "react-native";
import { BlurView } from "expo-blur";
import type { Inventory } from "@solanaidle/shared";

interface Props {
  inventory: Inventory | null;
}

const RESOURCES = [
  {
    key: "scrap",
    icon: require("@/assets/icons/scrap.png"),
    color: "#14F195",
    getValue: (inv: Inventory) => inv.scrap ?? 0,
  },
  {
    key: "crystal",
    icon: require("@/assets/icons/tokens.png"),
    color: "#00d4ff",
    getValue: (inv: Inventory) => inv.crystal ?? 0,
  },
  {
    key: "artifact",
    icon: require("@/assets/icons/key.png"),
    color: "#ffb800",
    getValue: (inv: Inventory) => inv.artifact ?? 0,
  },
] as const;

export function CurrencyBar({ inventory }: Props) {
  if (!inventory) return null;
  return (
    <View
      style={{
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(20,241,149,0.12)",
        boxShadow: "0 1px 8px rgba(20,241,149,0.06)",
      }}
    >
      <BlurView intensity={20} tint="dark">
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 28,
            paddingVertical: 8,
            backgroundColor: "rgba(10,22,40,0.85)",
          }}
        >
          {RESOURCES.map((r) => (
            <View
              key={r.key}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Image source={r.icon} style={{ width: 26, height: 26 }} />
              <Text
                style={{
                  fontFamily: "Rajdhani_700Bold",
                  fontSize: 18,
                  color: r.color,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {r.getValue(inventory)}
              </Text>
            </View>
          ))}
        </View>
      </BlurView>
    </View>
  );
}
