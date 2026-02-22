import { View, Text, Image } from "react-native";
import { Badge } from "@/components/ui";
import type { Inventory } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";

interface Props {
  inventory: Inventory | null;
  onRefresh?: () => void;
}

export function InventoryPanel({ inventory }: Props) {
  if (!inventory) return null;

  const resources = [
    {
      source: require("@/assets/icons/scrap.png"),
      label: "Scrap",
      value: inventory.scrap,
      color: "text-neon-green",
    },
    {
      source: require("@/assets/icons/tokens.png"),
      label: "Tokens",
      value: inventory.crystal,
      color: "text-neon-cyan",
    },
    {
      source: require("@/assets/icons/key.png"),
      label: "Keys",
      value: inventory.artifact,
      color: "text-neon-purple",
    },
  ];

  return (
    <View className="gap-4">
      {/* Resources card */}
      <GlassPanel contentStyle={{ padding: 16, gap: 12 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-display text-white">Resources</Text>
          <Badge variant="default" className="bg-[#1a3a5c]/40 border-[#1a3a5c]/60">
            Epoch
          </Badge>
        </View>

        <Text className="text-sm text-[#4a7a9b] leading-relaxed">
          Resources are earned from missions and spent on upgrades. They reset each epoch.
        </Text>

        <View className="flex-row gap-2.5">
          {resources.map((r) => (
            <View
              key={r.label}
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 items-center"
            >
              <Image
                source={r.source}
                style={{ width: 40, height: 40 }}
                className="mb-1.5"
              />
              <Text className={`font-display text-lg ${r.color}`}>
                {r.value ?? 0}
              </Text>
              <Text className="text-xs text-white/50">{r.label}</Text>
            </View>
          ))}
        </View>
      </GlassPanel>

      {/* Economy notes */}
      <View className="rounded-xl border border-white/[0.06] bg-[#0a1628]/60 p-4 gap-2">
        <Text className="text-sm font-sans-bold text-white">Economy Notes</Text>
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <View className="w-1 h-1 rounded-full bg-neon-red/60" />
            <Text className="text-sm text-white/50">
              Resources, upgrades, perks reset each epoch
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-1 h-1 rounded-full bg-neon-green" />
            <Text className="text-sm text-white/80">
              Permanent loot and badges carry over forever
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-1 h-1 rounded-full bg-neon-green" />
            <Text className="text-sm text-white/80">
              Character level persists across epochs
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
