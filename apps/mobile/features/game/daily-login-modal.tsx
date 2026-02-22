import { useState } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView } from "react-native";
import { Gift, Check } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { DailyLoginStatus } from "@solanaidle/shared";

interface Props {
  status: DailyLoginStatus | null;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

export function DailyLoginModal({ status, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (!status) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  };

  const reward = status.todayReward;

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      >
        {/* Header */}
        <View className="items-center gap-2">
          <Gift size={32} color="#ffb800" />
          <Text className="text-xl font-display text-white">
            {claimed ? "Claimed!" : "Daily Bonus"}
          </Text>
          <Text className="text-sm text-white/50 text-center">
            {claimed
              ? `Day ${status.streakDay} reward collected!`
              : `Day ${status.streakDay} of 7 — claim your daily reward!`}
          </Text>
        </View>

        {/* 7-day calendar strip */}
        <View className="flex-row gap-1">
          {status.rewards.map((r) => {
            const isPast = r.day < status.streakDay;
            const isCurrent = r.day === status.streakDay;
            return (
              <View
                key={r.day}
                className={`flex-1 flex-col items-center rounded-lg px-1 py-1.5 ${
                  isCurrent
                    ? "bg-neon-amber/20 border border-neon-amber/40"
                    : isPast
                    ? "bg-white/[0.03] opacity-50"
                    : "bg-white/[0.03]"
                }`}
              >
                <Text className="font-mono text-xs text-white/40">D{r.day}</Text>
                {isPast ? (
                  <Check size={14} color="#14F195" />
                ) : (
                  <Gift
                    size={16}
                    color={isCurrent ? "#ffb800" : "rgba(255,255,255,0.2)"}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Today's reward */}
        <View className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 gap-3">
          <Text className="text-xs text-white/40 text-center uppercase tracking-wider">
            Today's Reward
          </Text>
          <View className="flex-row items-center justify-center gap-4">
            {reward.scrap > 0 && (
              <View className="flex-row items-center gap-1">
                <Image
                  source={require("@/assets/icons/scrap.png")}
                  style={{ width: 40, height: 40 }}
                />
                <Text className="font-display text-neon-green">+{reward.scrap}</Text>
              </View>
            )}
            {reward.crystal > 0 && (
              <View className="flex-row items-center gap-1">
                <Image
                  source={require("@/assets/icons/tokens.png")}
                  style={{ width: 40, height: 40 }}
                />
                <Text className="font-display text-neon-green">+{reward.crystal}</Text>
              </View>
            )}
            {reward.artifact > 0 && (
              <View className="flex-row items-center gap-1">
                <Image
                  source={require("@/assets/icons/key.png")}
                  style={{ width: 40, height: 40 }}
                />
                <Text className="font-display text-neon-green">+{reward.artifact}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action button */}
        {claimed ? (
          <Button onPress={onClose} size="lg" className="w-full">
            <Text className="text-base font-display text-neon-green">Continue</Text>
          </Button>
        ) : (
          <Button onPress={handleClaim} disabled={claiming} size="lg" className="w-full">
            {claiming ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#14F195" />
                <Text className="text-base font-display text-neon-green">Claiming...</Text>
              </View>
            ) : (
              <Text className="text-base font-display text-neon-green">Claim Reward</Text>
            )}
          </Button>
        )}
      </ScrollView>
    </View>
  );
}
