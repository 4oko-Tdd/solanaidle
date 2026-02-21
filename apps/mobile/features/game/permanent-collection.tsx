import { useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { Flame, Zap, Cpu, Gem, Shield, Crosshair, Clock, Skull } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useCollection } from "@/hooks/use-collection";
import { useToast } from "@/components/toast-provider";

const PERK_META: Record<string, { label: string; Icon: typeof Cpu; color: string; bgColor: string; borderColor: string }> = {
  loot_chance: { label: "Drop Rate", Icon: Gem, color: "#ffb800", bgColor: "rgba(255,184,0,0.1)", borderColor: "#ffb80033" },
  speed: { label: "Clock Speed", Icon: Clock, color: "#00d4ff", bgColor: "rgba(0,212,255,0.1)", borderColor: "#00d4ff33" },
  fail_rate: { label: "Fault Tolerance", Icon: Shield, color: "#00ff87", bgColor: "rgba(0,255,135,0.1)", borderColor: "#00ff8733" },
  xp: { label: "Data Throughput", Icon: Cpu, color: "#9945ff", bgColor: "rgba(153,69,255,0.1)", borderColor: "#9945ff33" },
  boss_damage: { label: "Strike Power", Icon: Crosshair, color: "#ff4444", bgColor: "rgba(255,68,68,0.1)", borderColor: "#ff444433" },
};

const DEFAULT_META = { label: "Unknown", Icon: Cpu, color: "#888", bgColor: "rgba(255,255,255,0.05)", borderColor: "#ffffff1a" };

function formatPerkValue(perkType: string, value: number): string {
  if (perkType === "speed" || perkType === "fail_rate") return `${value > 0 ? "+" : ""}${value}%`;
  return `+${value}%`;
}

export function PermanentCollection() {
  const { items, capacity, weeklyBuffs, loading, sacrifice } = useCollection();
  const { toast } = useToast();
  const [sacrificing, setSacrificing] = useState<string | null>(null);

  const handleSacrifice = (lootId: string) => {
    Alert.alert(
      "Burn Artifact",
      "Burn this artifact? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Burn",
          style: "destructive",
          onPress: async () => {
            setSacrificing(lootId);
            try {
              await sacrifice(lootId);
              toast("Artifact burned", "success");
            } catch (e: unknown) {
              const err = e as { message?: string };
              toast(err.message ?? "Burn failed", "error");
            } finally {
              setSacrificing(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color="#9945ff" />
      </View>
    );
  }

  const maxSlots = capacity?.maxSlots ?? 5;
  const usedSlots = items.length;

  return (
    <View className="gap-3">
      {/* Main panel */}
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 overflow-hidden">
        {/* Header */}
        <View className="px-4 pt-4 pb-3 gap-2">
          <View className="h-0.5 bg-neon-purple absolute top-0 left-0 right-0" />
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-md bg-neon-purple/10 border border-neon-purple/20 items-center justify-center">
                <Skull size={16} color="#9945ff" />
              </View>
              <View>
                <Text className="text-sm font-bold text-white uppercase tracking-wide">Leviathan Salvage</Text>
                <Text className="text-xs font-mono text-white/50">Protocol artifacts • persist forever</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1">
              <View className="flex-row gap-0.5">
                {Array.from({ length: maxSlots }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: i < usedSlots ? "#ffb800" : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </View>
              <Text className="text-xs font-mono text-white/50">{usedSlots}/{maxSlots}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View className="px-4 pb-4">
          {items.length === 0 ? (
            <View className="rounded-lg border border-white/[0.06] bg-[#0d1525] p-5 items-center gap-2">
              <View className="w-12 h-12 rounded-full bg-neon-purple/5 border border-neon-purple/10 items-center justify-center">
                <Skull size={20} color="#9945ff50" />
              </View>
              <Text className="text-sm text-[#4a7a9b]">No salvage recovered</Text>
              <Text className="text-xs text-[#4a7a9b]/70 text-center leading-relaxed">
                Destroy the Protocol Leviathan to extract rare artifacts from its corrupted core.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {items.map((item) => {
                const meta = PERK_META[item.perkType] ?? DEFAULT_META;
                const { Icon } = meta;

                return (
                  <View
                    key={item.id}
                    style={{ borderColor: meta.borderColor, borderWidth: 1 }}
                    className="flex-row items-center gap-3 rounded-lg bg-[#0d1525] p-3"
                  >
                    <View
                      style={{ backgroundColor: meta.bgColor, borderColor: meta.borderColor, borderWidth: 1 }}
                      className="w-9 h-9 rounded-md items-center justify-center shrink-0"
                    >
                      <Icon size={16} color={meta.color} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-white" numberOfLines={1}>{item.itemName}</Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Text style={{ color: meta.color }} className="text-xs font-mono font-bold">
                          {formatPerkValue(item.perkType, item.perkValue)}
                        </Text>
                        <Text className="text-xs text-white/50">{meta.label}</Text>
                      </View>
                    </View>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => handleSacrifice(item.id)}
                      disabled={sacrificing === item.id}
                    >
                      {sacrificing === item.id ? (
                        <ActivityIndicator size="small" color="#ff4444" />
                      ) : (
                        <Flame size={12} color="#ff444450" />
                      )}
                    </Button>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Weekly buffs */}
      {weeklyBuffs.length > 0 && (
        <View className="rounded-lg border border-neon-cyan/20 bg-[#0d1525] p-3 gap-2">
          <View className="flex-row items-center gap-2">
            <Zap size={14} color="#00d4ff" />
            <Text className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">Boss Buffs Active</Text>
          </View>
          <View className="gap-1">
            {weeklyBuffs.map((buff) => (
              <View key={buff.id} className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-1 h-1 rounded-full bg-neon-cyan" />
                  <Text className="text-xs text-white/80">{buff.buffName}</Text>
                </View>
                {buff.consumed && (
                  <Text className="text-xs font-mono text-white/40 uppercase">consumed</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
