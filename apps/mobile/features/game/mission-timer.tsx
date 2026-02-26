import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Button } from "@/components/ui";
import { Progress } from "@/components/ui";
import { GlassPanel } from "@/components/glass-panel";
import { useFadeInUp, usePulse } from "@/lib/animations";
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

function CompleteLabel() {
  const fadeIn = useFadeInUp(0, 400);
  return (
    <Animated.View style={fadeIn}>
      <Text style={{ fontFamily: "RobotoMono_400Regular", fontSize: 16, color: "#14F195", textTransform: "uppercase", letterSpacing: 1.5 }}>
        Complete!
      </Text>
    </Animated.View>
  );
}

function UrgentTimer({ text }: { text: string }) {
  const pulseStyle = usePulse(true, 800, 0.5);
  return (
    <Animated.View style={pulseStyle}>
      <Text style={{ fontFamily: "RobotoMono_700Bold", fontSize: 16, color: "#ffb800" }}>
        {text}
      </Text>
    </Animated.View>
  );
}

function ReadyToClaim() {
  const fadeIn = useFadeInUp(100, 400);
  return (
    <Animated.View style={fadeIn}>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#14F195" }}>
        Ready to claim!
      </Text>
    </Animated.View>
  );
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
      glow={isComplete ? "green" : isUrgent ? "amber" : undefined}
      animateGlow={isComplete || isUrgent}
      contentStyle={{ padding: 20, gap: 14 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-display text-white">
          {missionName} in Progress
        </Text>
        {isComplete ? (
          <CompleteLabel />
        ) : isUrgent ? (
          <Text className="text-sm font-mono text-neon-amber uppercase tracking-wider">
            Almost...
          </Text>
        ) : null}
      </View>

      <Progress
        value={progressPercent}
        color={isComplete ? "#14F195" : isUrgent ? "#ffb800" : "#00d4ff"}
        className={isComplete ? "h-3.5" : ""}
      />

      <View className="flex-row items-center justify-between">
        {isComplete ? (
          <ReadyToClaim />
        ) : isUrgent ? (
          <UrgentTimer text={formatTime(timeRemaining)} />
        ) : (
          <Text className="text-base font-mono text-white/50">
            {formatTime(timeRemaining)}
          </Text>
        )}
        <Button
          size="md"
          variant={isComplete ? "gradient" : "default"}
          disabled={!isComplete}
          onPress={onClaim}
          shimmer={isComplete}
        >
          {isComplete ? "Claim Reward" : "In Progress..."}
        </Button>
      </View>
    </GlassPanel>
  );
}
