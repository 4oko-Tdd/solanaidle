import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Target, CheckCircle } from "lucide-react-native";
import { GlassPanel } from "@/components/glass-panel";
import { Button, Progress } from "@/components/ui";
import type { DailyChallenge } from "@solanaidle/shared";

interface Props {
  challenges: DailyChallenge[];
  periodKey: string;
  rerollCost: number;
  onReroll: (questId: string) => Promise<void>;
}

export function ChallengesPanel({ challenges, periodKey, rerollCost, onReroll }: Props) {
  return (
    <GlassPanel contentStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Target size={18} color="#9945FF" />
          <Text className="text-base font-display text-white" style={{ letterSpacing: 0.5 }}>
            Daily Challenges
          </Text>
        </View>
        <Text className="text-xs font-mono text-white/30">{periodKey}</Text>
      </View>
      {challenges.map(ch => (
        <ChallengeRow
          key={ch.id}
          challenge={ch}
          rerollCost={rerollCost}
          onReroll={() => onReroll(ch.id)}
        />
      ))}
    </GlassPanel>
  );
}

function ChallengeRow({ challenge: ch, rerollCost, onReroll }: {
  challenge: DailyChallenge;
  rerollCost: number;
  onReroll: () => Promise<void>;
}) {
  const [rolling, setRolling] = useState(false);
  const pct = Math.min(100, (ch.progress / ch.requirement) * 100);

  return (
    <View style={{
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
      gap: 8,
      borderColor: ch.completed ? "rgba(20,241,149,0.25)" : "rgba(255,255,255,0.07)",
      backgroundColor: ch.completed ? "rgba(20,241,149,0.04)" : "rgba(255,255,255,0.02)",
    }}>
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-sm flex-1 font-sans-bold ${ch.completed ? "text-[#14F195]" : "text-white"}`}
          style={{ marginRight: 8 }}
        >
          {ch.description}
        </Text>
        {ch.completed ? (
          <CheckCircle size={16} color="#14F195" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onPress={async () => { setRolling(true); try { await onReroll(); } finally { setRolling(false); } }}
            disabled={rolling}
            style={{ borderWidth: 1, borderColor: "rgba(20,241,149,0.2)",
              backgroundColor: "rgba(20,241,149,0.05)", paddingHorizontal: 8, paddingVertical: 4 }}
          >
            {rolling
              ? <ActivityIndicator size="small" color="#14F195" />
              : <Text className="text-[10px] font-mono text-[#14F195]">{rerollCost} SKR</Text>}
          </Button>
        )}
      </View>
      <Progress value={pct} className="h-1" />
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-mono text-white/30">{ch.progress} / {ch.requirement}</Text>
        <View className="flex-row items-center gap-2">
          {ch.rewardScrap > 0 && <Text className="text-xs font-mono text-[#14F195]">+{ch.rewardScrap} Scrap</Text>}
          {ch.rewardCrystal > 0 && <Text className="text-xs font-mono text-[#00D4FF]">+{ch.rewardCrystal} Tokens</Text>}
        </View>
      </View>
    </View>
  );
}
