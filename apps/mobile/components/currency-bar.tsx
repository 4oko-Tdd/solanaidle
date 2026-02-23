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
        borderBottomColor: "rgba(255,255,255,0.06)",
      }}
    >
      <BlurView intensity={20} tint="dark">
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
            paddingVertical: 6,
            backgroundColor: "rgba(10,22,40,0.75)",
          }}
        >
          {RESOURCES.map((r) => (
            <View
              key={r.key}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Image source={r.icon} style={{ width: 22, height: 22 }} />
              <Text
                style={{
                  fontFamily: "Rajdhani_600SemiBold",
                  fontSize: 15,
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
