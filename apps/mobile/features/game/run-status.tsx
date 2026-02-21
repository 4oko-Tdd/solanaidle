import { View, Text } from "react-native";
import { Heart, HeartCrack } from "lucide-react-native";
import { Badge } from "@/components/ui";
import { ClassIcon } from "@/components/class-icon";
import type { WeeklyRun, ClassId, CharacterState, WorldBoss } from "@solanaidle/shared";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

interface Props {
  run: WeeklyRun;
  boss?: WorldBoss | null;
  characterState?: CharacterState;
}

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

function getRunStatusBadge(run: WeeklyRun, characterState?: CharacterState) {
  if (!run.active) {
    return <Badge variant="default">EPOCH OVER</Badge>;
  }
  if (characterState === "dead") {
    return <Badge variant="red">SLASHED</Badge>;
  }
  return <Badge variant="green">ONLINE</Badge>;
}

export function RunStatus({ run, characterState }: Props) {
  const weekNum = getWeekNumber(run.weekStart);

  return (
    <View className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 gap-2">
      {/* Top row: Week + Class + Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-white">Epoch {weekNum}</Text>
          <View className="flex-row items-center gap-1">
            <ClassIcon classId={run.classId} size={14} />
            <Text className="text-xs text-white/50">{CLASS_NAMES[run.classId]}</Text>
          </View>
        </View>
        {getRunStatusBadge(run, characterState)}
      </View>

      {/* Bottom row: Lives + Score + Missions */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < run.livesRemaining ? (
              <Heart key={i} size={16} color="#ff4444" fill="#ff4444" />
            ) : (
              <HeartCrack key={i} size={16} color="rgba(255,255,255,0.2)" />
            )
          )}
          {run.livesRemaining === 1 && (
            <Text className="ml-1 text-xs font-bold text-neon-red">LAST LIFE</Text>
          )}
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-xs text-white/50">
            Score:{" "}
            <Text className="font-mono font-bold text-neon-green">{run.score}</Text>
          </Text>
          <Text className="text-xs text-white/50">
            Missions:{" "}
            <Text className="font-mono font-bold text-neon-green">{run.missionsCompleted}</Text>
          </Text>
          {run.streak >= 2 ? (
            <Text className="text-xs text-white/50">
              Streak:{" "}
              <Text
                className={`font-mono font-bold ${
                  run.streak >= 6
                    ? "text-neon-amber"
                    : run.streak >= 4
                    ? "text-neon-red"
                    : "text-neon-green"
                }`}
              >
                {run.streak}x
              </Text>
            </Text>
          ) : null}
        </View>
      </View>

      {/* Warning banners */}
      {run.livesRemaining === 1 && run.active && characterState !== "dead" ? (
        <View className="rounded bg-neon-red/10 border border-neon-red/30 px-2 py-1 items-center">
          <Text className="text-xs font-bold text-neon-red">FAILURE MEANS SLASHING. 1 LIFE REMAINING.</Text>
        </View>
      ) : null}
      {run.livesRemaining === 2 && run.active ? (
        <View className="rounded bg-neon-amber/10 border border-neon-amber/30 px-2 py-1 items-center">
          <Text className="text-xs font-medium text-neon-amber">Careful. 2 lives remaining.</Text>
        </View>
      ) : null}
    </View>
  );
}
