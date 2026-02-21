import { View, Text, ActivityIndicator, Modal } from "react-native";
import { useState } from "react";
import { Sparkles, Zap, Crown } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { PerkDefinition } from "@solanaidle/shared";

const TAILWIND_TO_HEX: Record<string, string> = {
  "text-neon-cyan": "#00d4ff",
  "text-neon-amber": "#ffb800",
  "text-neon-green": "#00ff87",
  "text-neon-purple": "#9945ff",
  "text-neon-red": "#ff4444",
  "text-white/40": "rgba(255,255,255,0.4)",
};

interface PerkPickerProps {
  perks: {
    offers: PerkDefinition[];
    hasPending: boolean;
    loading: boolean;
  } | null;
  inventory: import("@solanaidle/shared").Inventory | null;
  onActivate: (perkId: string) => Promise<void>;
}

type TierKey = "common" | "rare" | "legendary";

const TIER_CONFIG: Record<
  TierKey,
  {
    border: string;
    badge: string;
    badgeText: string;
    accent: string;
    Icon: typeof Sparkles;
    iconColor: string;
  }
> = {
  common: {
    border: "border-white/[0.12]",
    badge: "bg-white/10",
    badgeText: "text-white/50",
    accent: "",
    Icon: Sparkles,
    iconColor: "text-white/40",
  },
  rare: {
    border: "border-neon-cyan/40",
    badge: "bg-neon-cyan/20",
    badgeText: "text-neon-cyan",
    accent: "",
    Icon: Zap,
    iconColor: "text-neon-cyan",
  },
  legendary: {
    border: "border-neon-amber/40",
    badge: "bg-neon-amber/20",
    badgeText: "text-neon-amber",
    accent: "h-1 rounded-t-lg bg-neon-amber",
    Icon: Crown,
    iconColor: "text-neon-amber",
  },
};

function PerkCard({
  perk,
  onChoose,
  disabled,
}: {
  perk: PerkDefinition;
  onChoose: () => void;
  disabled: boolean;
}) {
  const tier = (perk.tier as TierKey) in TIER_CONFIG ? (perk.tier as TierKey) : "common";
  const cfg = TIER_CONFIG[tier];
  const { Icon } = cfg;

  return (
    <View className={`overflow-hidden rounded-lg border bg-[#0d1525] ${cfg.border}`}>
      {/* Legendary accent strip */}
      {cfg.accent ? <View className={cfg.accent} /> : null}

      <View className="flex-row items-center gap-3 p-3">
        {/* Icon */}
        <View className="shrink-0 items-center justify-center">
          <Icon size={20} color={TAILWIND_TO_HEX[cfg.iconColor] ?? "#ffffff"} />
        </View>

        {/* Text content */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text
              numberOfLines={1}
              className="text-sm font-bold text-white flex-1"
            >
              {perk.name}
            </Text>
            <View className={`rounded-full px-1.5 py-0.5 ${cfg.badge}`}>
              <Text className={`text-xs font-mono uppercase ${cfg.badgeText}`}>
                {perk.tier}
              </Text>
            </View>
          </View>
          <Text className="mt-0.5 text-sm leading-snug text-white/50">
            {perk.description}
          </Text>
          {perk.stackable ? (
            <Text className="mt-0.5 text-xs font-mono text-white/40">
              Stackable
            </Text>
          ) : null}
        </View>

        {/* Choose button */}
        <Button size="sm" onPress={onChoose} disabled={disabled} className="shrink-0">
          Choose
        </Button>
      </View>
    </View>
  );
}

export function PerkPicker({ perks, onActivate }: PerkPickerProps) {
  const [choosing, setChoosing] = useState(false);

  if (!perks || !perks.hasPending || perks.offers.length === 0) return null;

  if (perks.loading) {
    return (
      <Modal transparent animationType="fade" visible>
        <View className="flex-1 items-center justify-center bg-black/80">
          <ActivityIndicator color="#00d4ff" />
        </View>
      </Modal>
    );
  }

  const handleChoose = async (perkId: string) => {
    setChoosing(true);
    try {
      await onActivate(perkId);
    } finally {
      setChoosing(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible>
      <View className="flex-1 items-center justify-center bg-black/80 p-4">
        <View className="w-full max-w-md gap-4">
          {/* Header */}
          <View className="items-center gap-1">
            <Text className="text-2xl font-black uppercase tracking-wider text-neon-green">
              Level Up
            </Text>
            <Text className="text-xs text-white/50">
              Choose a perk to enhance your node
            </Text>
          </View>

          {/* Perk cards */}
          <View className="gap-2.5">
            {perks.offers.map((perk) => (
              <PerkCard
                key={perk.id}
                perk={perk}
                onChoose={() => handleChoose(perk.id)}
                disabled={choosing}
              />
            ))}
          </View>

          {/* Choosing indicator */}
          {choosing ? (
            <View className="flex-row items-center justify-center gap-2">
              <ActivityIndicator size="small" color="#ffffff80" />
              <Text className="text-xs text-white/50">Installing perk...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
