import { View, Text, Image } from "react-native";
import { Heart, HeartCrack } from "lucide-react-native";
import { Badge } from "@/components/ui";
import { Progress } from "@/components/ui";
import { Button } from "@/components/ui";
import { ClassIcon } from "@/components/class-icon";
import type { Character, ClassId, WeeklyRun, CharacterState, UpgradeInfo, Inventory } from "@solanaidle/shared";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

interface Props {
  character: Character;
  classId?: ClassId | null;
  upgradeInfo?: UpgradeInfo | null;
  inventory?: Inventory | null;
  run?: WeeklyRun | null;
  onPickClass?: () => void;
}

function getStatusBadge(state: CharacterState, runActive?: boolean) {
  if (runActive === false) {
    return <Badge variant="default">EPOCH OVER</Badge>;
  }
  if (state === "dead") {
    return <Badge variant="red">SLASHED</Badge>;
  }
  if (state === "on_mission") {
    return <Badge variant="purple">ON CHAIN</Badge>;
  }
  return <Badge variant="green">ONLINE</Badge>;
}

export function CharacterCard({ character, classId, run, onPickClass }: Props) {
  const xpForNextLevel = Math.floor(75 * Math.pow(1.6, character.level - 1));
  const xpPercent = Math.min(100, Math.round((character.xp / xpForNextLevel) * 100));
  const lives = run?.livesRemaining ?? 3;

  return (
    <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-3 gap-2">
      {/* Row 1: Class + Level + Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {classId ? (
            <ClassIcon classId={classId} size={40} />
          ) : null}
          <Text className="text-sm font-bold text-white">
            {classId ? CLASS_NAMES[classId] : "Node"}
          </Text>
          <View className="flex-row items-center gap-1">
            <Image
              source={require("@/assets/icons/exp.png")}
              style={{ width: 24, height: 24 }}
            />
            <Text className="text-xs font-mono font-bold text-white">Lv {character.level}</Text>
          </View>
        </View>
        {getStatusBadge(character.state, run?.active)}
      </View>

      {/* Row 2: XP bar */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Progress value={xpPercent} />
        </View>
        <Text className="text-xs font-mono text-[#4a7a9b] shrink-0">
          {character.xp}/{xpForNextLevel}
        </Text>
      </View>

      {/* Row 3: Lives + Score/Streak */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < lives ? (
              <Heart key={i} size={14} color="#FF3366" fill="#FF3366" />
            ) : (
              <HeartCrack key={i} size={14} color="#1a3a5c" />
            )
          )}
          {lives === 1 && (
            <Text className="ml-1 text-xs font-bold text-neon-red">LAST LIFE</Text>
          )}
        </View>
        {run ? (
          <View className="flex-row items-center gap-2.5">
            <Text className="text-xs text-[#4a7a9b]">
              Score{" "}
              <Text className="font-mono font-bold text-neon-green">{run.score}</Text>
            </Text>
            {run.streak >= 2 && (
              <Text className="text-xs text-[#4a7a9b]">
                Streak{" "}
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
            )}
          </View>
        ) : null}
      </View>

      {/* Pick class button if no class selected */}
      {!classId && onPickClass && (
        <Button size="sm" onPress={onPickClass} variant="outline">
          Pick Class
        </Button>
      )}

      {/* Warning banners */}
      {lives === 1 && run?.active && character.state !== "dead" && (
        <View className="rounded bg-neon-red/10 border border-neon-red/30 px-2 py-0.5 items-center">
          <Text className="text-xs font-bold text-neon-red">FAILURE MEANS SLASHING. 1 LIFE REMAINING.</Text>
        </View>
      )}
      {character.state === "dead" && character.reviveAt ? (
        <Text className="text-xs text-neon-red text-center">
          Back online at {new Date(character.reviveAt).toLocaleTimeString()}
        </Text>
      ) : null}
    </View>
  );
}
