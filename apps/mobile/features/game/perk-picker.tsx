import { View, Text, ActivityIndicator, Modal } from "react-native";
import { useEffect, useState } from "react";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Zap, Crown } from "lucide-react-native";
import { Button } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import { useFadeInUp, useGlowPulse } from "@/lib/animations";
import { Shadows } from "@/theme";
import type { PerkDefinition } from "@solanaidle/shared";

const TAILWIND_TO_HEX: Record<string, string> = {
  "text-neon-cyan": "#00d4ff",
  "text-neon-amber": "#ffb800",
  "text-neon-green": "#14F195",
  "text-neon-purple": "#9945ff",
  "text-neon-red": "#FF3366",
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
  autoOpen?: boolean;
  showOpenButton?: boolean;
  onReroll?: () => Promise<void>;
  rerollCost?: number;
}

type TierKey = "common" | "rare" | "legendary";

const TIER_CONFIG: Record<
  TierKey,
  {
    border: string;
    badge: string;
    badgeText: string;
    hasAccentStrip: boolean;
    glow?: string;
    Icon: typeof Sparkles;
    iconColor: string;
  }
> = {
  common: {
    border: "border-white/[0.12]",
    badge: "bg-white/10",
    badgeText: "text-white/50",
    hasAccentStrip: false,
    Icon: Sparkles,
    iconColor: "text-white/40",
  },
  rare: {
    border: "border-neon-cyan/40",
    badge: "bg-neon-cyan/20",
    badgeText: "text-neon-cyan",
    hasAccentStrip: false,
    glow: Shadows.glowCyan,
    Icon: Zap,
    iconColor: "text-neon-cyan",
  },
  legendary: {
    border: "border-neon-amber/40",
    badge: "bg-neon-amber/20",
    badgeText: "text-neon-amber",
    hasAccentStrip: true,
    Icon: Crown,
    iconColor: "text-neon-amber",
  },
};

function LegendaryGlow({ children }: { children: React.ReactNode }) {
  const goldenGlow = useGlowPulse("255, 184, 0", true, 2000);
  return <Animated.View style={goldenGlow}>{children}</Animated.View>;
}

function PerkCard({
  perk,
  onChoose,
  disabled,
  index,
}: {
  perk: PerkDefinition;
  onChoose: () => void;
  disabled: boolean;
  index: number;
}) {
  const tier = (perk.tier as TierKey) in TIER_CONFIG ? (perk.tier as TierKey) : "common";
  const cfg = TIER_CONFIG[tier];
  const { Icon } = cfg;
  const fadeIn = useFadeInUp(index * 100, 300);

  const card = (
    <Animated.View style={fadeIn}>
      <View
        className={`overflow-hidden rounded-lg border bg-[#0d1525] ${cfg.border}`}
        style={{ boxShadow: cfg.glow }}
      >
        {/* Legendary gradient accent strip */}
        {cfg.hasAccentStrip && (
          <LinearGradient
            colors={["#ffb800", "#fbbf24"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
          />
        )}

        <View className="flex-row items-center gap-3 p-4">
          {/* Icon */}
          <View className="shrink-0 items-center justify-center">
            <Icon size={24} color={TAILWIND_TO_HEX[cfg.iconColor] ?? "#ffffff"} />
          </View>

          {/* Text content */}
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text
                numberOfLines={1}
                className="text-lg font-sans-bold text-white flex-1"
              >
                {perk.name}
              </Text>
              <View className={`rounded-full px-2.5 py-0.5 ${cfg.badge}`}>
                <Text className={`text-sm font-mono uppercase ${cfg.badgeText}`}>
                  {perk.tier}
                </Text>
              </View>
            </View>
            <Text className="mt-0.5 text-base leading-snug text-white/50" numberOfLines={2}>
              {perk.description}
            </Text>
            {perk.stackable ? (
              <Text className="mt-0.5 text-sm font-mono text-white/40">
                Stackable
              </Text>
            ) : null}
          </View>

          {/* Choose button */}
          <Button size="md" variant="gradient" onPress={onChoose} disabled={disabled} className="shrink-0">
            Choose
          </Button>
        </View>
      </View>
    </Animated.View>
  );

  return tier === "legendary" ? <LegendaryGlow>{card}</LegendaryGlow> : card;
}

function ModalContent({
  perks,
  onActivate,
  onClose,
  onReroll,
  rerollCost,
}: {
  perks: PerkDefinition[];
  onActivate: (id: string) => Promise<void>;
  onClose: () => void;
  onReroll?: () => Promise<void>;
  rerollCost?: number;
}) {
  const [choosing, setChoosing] = useState(false);
  const contentFadeIn = useFadeInUp(0, 350);

  const handleChoose = async (perkId: string) => {
    setChoosing(true);
    try {
      await onActivate(perkId);
    } finally {
      setChoosing(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-[#020305]/95 p-4">
      <Animated.View style={[contentFadeIn, { width: "100%", maxWidth: 400, gap: 16 }]}>
        {/* Header */}
        <View className="items-center gap-1">
          <GradientText className="text-2xl font-black uppercase tracking-wider">
            Level Up
          </GradientText>
          <Text className="text-base text-white/50">
            Choose a perk to enhance your node
          </Text>
        </View>

        {/* Perk cards */}
        <View className="gap-2.5">
          {perks.map((perk, i) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              index={i}
              onChoose={() => handleChoose(perk.id)}
              disabled={choosing}
            />
          ))}
        </View>

        {/* Choosing indicator */}
        {choosing ? (
          <View className="flex-row items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#ffffff80" />
            <Text className="text-base text-white/50">Installing perk...</Text>
          </View>
        ) : (
          <>
            {onReroll && (
              <View className="items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={async () => {
                    setChoosing(true);
                    try { await onReroll(); } finally { setChoosing(false); }
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(20,241,149,0.25)",
                    backgroundColor: "rgba(20,241,149,0.06)",
                  }}
                >
                  <Text className="text-xs font-mono text-[#14F195]">
                    Reroll offers ({rerollCost ?? 10} SKR)
                  </Text>
                </Button>
              </View>
            )}
            <View className="items-center">
              <Button variant="ghost" size="sm" onPress={onClose}>
                Later
              </Button>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

export function PerkPicker({
  perks,
  onActivate,
  autoOpen = true,
  showOpenButton = false,
  onReroll,
  rerollCost,
}: PerkPickerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!perks?.hasPending || perks.offers.length === 0) {
      setOpen(false);
      return;
    }
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen, perks?.hasPending, perks?.offers.length]);

  if (!perks || !perks.hasPending || perks.offers.length === 0) return null;

  if (perks.loading) {
    if (!open) {
      return showOpenButton ? (
        <View
          style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(20,241,149,0.35)",
            backgroundColor: "rgba(20,241,149,0.10)",
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Text className="text-sm font-mono text-white/75 uppercase tracking-wider">
            Level Up Ready
          </Text>
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#14F195" />
            <Text className="text-sm text-white/70">Preparing choices...</Text>
          </View>
        </View>
      ) : null;
    }
    return (
      <Modal transparent animationType="fade" visible statusBarTranslucent navigationBarTranslucent>
        <View className="flex-1 items-center justify-center bg-[#020305]/95">
          <ActivityIndicator color="#00d4ff" />
        </View>
      </Modal>
    );
  }

  return (
    <>
      {showOpenButton && !open ? (
        <View
          style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(20,241,149,0.35)",
            backgroundColor: "rgba(20,241,149,0.10)",
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Text className="text-sm font-mono text-white/75 uppercase tracking-wider">
            Level Up Ready
          </Text>
          <Text className="text-sm text-white/75">
            You have an unspent level-up choice.
          </Text>
          <Button size="sm" variant="gradient" onPress={() => setOpen(true)}>
            Open Level Up
          </Button>
        </View>
      ) : null}
      <Modal
        transparent
        animationType="fade"
        visible={open}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <ModalContent perks={perks.offers} onActivate={onActivate} onClose={() => setOpen(false)} onReroll={onReroll} rerollCost={rerollCost} />
      </Modal>
    </>
  );
}
