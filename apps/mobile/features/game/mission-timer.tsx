import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Button } from "@/components/ui";
import { Progress } from "@/components/ui";
import { GlassPanel } from "@/components/glass-panel";
import type { ActiveMission } from "@solanaidle/shared";

interface Props {
  mission: ActiveMission;
  onClaim: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function MissionTimer({ mission, onClaim }: Props) {
  const [timeRemaining, setTimeRemaining] = useState(mission.timeRemaining ?? 0);

  useEffect(() => {
    setTimeRemaining(mission.timeRemaining ?? 0);
  }, [mission.missionId]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining > 0]);

  const isComplete = timeRemaining <= 0;

  // Calculate progress from endsAt and startedAt
  const startedAt = new Date(mission.startedAt).getTime();
  const endsAt = new Date(mission.endsAt).getTime();
  const totalDuration = Math.max(1, (endsAt - startedAt) / 1000);
  const elapsed = totalDuration - timeRemaining;
  const progressPercent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  const isUrgent = !isComplete && progressPercent >= 90;

  const MISSION_NAMES: Record<string, string> = {
    scout: "Token Swap",
    expedition: "Staking",
    deep_dive: "Yield Farm",
    boss: "Whale Hunt",
  };

  const missionName = MISSION_NAMES[mission.missionId] ?? "Transaction";

  return (
    <GlassPanel
      borderColor={
        isComplete
          ? "rgba(20,241,149,0.5)"
          : isUrgent
          ? "rgba(255,184,0,0.4)"
          : "rgba(26,58,92,0.6)"
      }
      style={
        isComplete
          ? { boxShadow: "0 0 20px #14F19540" }
          : isUrgent
          ? { boxShadow: "0 0 15px #ffb80030" }
          : undefined
      }
      contentStyle={{ padding: 16, gap: 12 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-display text-white">
          {missionName} in Progress
        </Text>
        {isComplete ? (
          <Text className="text-xs font-mono text-neon-green uppercase tracking-wider">
            Complete!
          </Text>
        ) : isUrgent ? (
          <Text className="text-xs font-mono text-neon-amber uppercase tracking-wider">
            Almost...
          </Text>
        ) : null}
      </View>

      <Progress
        value={progressPercent}
        color={isComplete ? "#14F195" : isUrgent ? "#ffb800" : "#00d4ff"}
      />

      <View className="flex-row items-center justify-between">
        <Text className={`text-sm ${isUrgent ? "font-mono-bold text-neon-amber" : "font-mono text-white/50"}`}>
          {isComplete ? (
            <Text className="text-neon-green font-sans-bold">Ready to claim!</Text>
          ) : (
            formatTime(timeRemaining)
          )}
        </Text>
        <Button
          size="sm"
          disabled={!isComplete}
          onPress={onClaim}
          style={isComplete ? { borderColor: "#14F195", borderWidth: 1 } : undefined}
        >
          {isComplete ? "Claim Reward" : "In Progress..."}
        </Button>
      </View>
    </GlassPanel>
  );
}
