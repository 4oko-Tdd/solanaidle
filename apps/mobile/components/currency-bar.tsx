import { View, Text, Image } from "react-native";
import type { Inventory } from "@solanaidle/shared";
import { SKR_TOKEN } from "@/lib/skr";

interface Props {
  inventory: Inventory | null;
  topInset?: number;
}

const RESOURCES = [
  {
    key: "scrap",
    icon: require("@/assets/icons/scrap.png"),
    iconSize: 30,
    color: "#14F195",
    getValue: (inv: Inventory) => inv.scrap ?? 0,
  },
  {
    key: "crystal",
    icon: require("@/assets/icons/tokens.png"),
    iconSize: 30,
    color: "#00d4ff",
    getValue: (inv: Inventory) => inv.crystal ?? 0,
  },
  {
    key: "artifact",
    icon: require("@/assets/icons/key.png"),
    iconSize: 30,
    color: "#ffb800",
    getValue: (inv: Inventory) => inv.artifact ?? 0,
  },
  {
    key: "skr",
    icon: { uri: SKR_TOKEN.iconUrl },
    iconSize: 24,
    color: "#9ED8FF",
    getValue: (inv: Inventory) => inv.skr ?? 0,
  },
] as const;

export function CurrencyBar({ inventory, topInset = 0 }: Props) {
  if (!inventory) return null;
  return (
    <View
      style={{
        overflow: "hidden",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(20,241,149,0.12)",
        boxShadow: "0 1px 8px rgba(20,241,149,0.06)",
        backgroundColor: "#0a1628",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          paddingTop: topInset + 8,
          paddingBottom: 8,
          backgroundColor: "#0a1628",
        }}
      >
        {RESOURCES.map((r) => (
          <View
            key={r.key}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Image source={r.icon} style={{ width: r.iconSize, height: r.iconSize }} />
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
    </View>
  );
}
