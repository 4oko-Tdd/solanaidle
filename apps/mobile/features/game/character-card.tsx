import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { Heart, HeartCrack } from "lucide-react-native";
import { Badge } from "@/components/ui";
import { Progress } from "@/components/ui";
import { Button } from "@/components/ui";
import { ClassIcon } from "@/components/class-icon";
import { GlassPanel } from "@/components/glass-panel";
import { GradientText } from "@/components/gradient-text";
import { usePulse } from "@/lib/animations";
import type { Character, ClassId, WeeklyRun, CharacterState, UpgradeInfo, Inventory } from "@solanaidle/shared";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

const CLASS_BORDER_COLORS: Record<ClassId, string> = {
  scout: "rgba(255,184,0,0.3)",
  guardian: "rgba(0,212,255,0.3)",
  mystic: "rgba(153,69,255,0.3)",
};

const CLASS_GRADIENTS: Record<ClassId, [string, string, string]> = {
  scout: ["#ffb800", "#ff8c00", "#ffb800"],
  guardian: ["#00d4ff", "#14F195", "#00d4ff"],
  mystic: ["#9945FF", "#FF3366", "#9945FF"],
};

interface Props {
  character: Character;
  classId?: ClassId | null;
  upgradeInfo?: UpgradeInfo | null;
  inventory?: Inventory | null;
  run?: WeeklyRun | null;
  onPickClass?: () => void;
}

function SlashedBadge() {
  const pulseStyle = usePulse(true, 1200, 0.4);
  return (
    <Animated.View style={pulseStyle}>
      <Badge variant="red">SLASHED</Badge>
    </Animated.View>
  );
}

function getStatusBadge(state: CharacterState, runActive?: boolean) {
  if (runActive === false) {
    return <Badge variant="default">EPOCH OVER</Badge>;
  }
  if (state === "dead") {
    return <SlashedBadge />;
  }
  if (state === "on_mission") {
    return <Badge variant="purple">ON CHAIN</Badge>;
  }
  return (
    <View style={{ backgroundColor: "rgba(20,241,149,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ fontFamily: "Orbitron_400Regular", fontSize: 13, color: "#14F195" }}>ONLINE</Text>
    </View>
  );
}

function LastLifeWarning() {
  const pulseStyle = usePulse(true, 1000, 0.4);
  return (
    <Animated.View style={[pulseStyle, { borderRadius: 4, backgroundColor: "rgba(255,51,102,0.1)", borderWidth: 1, borderColor: "rgba(255,51,102,0.3)", paddingHorizontal: 8, paddingVertical: 2, alignItems: "center" }]}>
      <Text style={{ fontFamily: "RobotoMono_400Regular", fontSize: 13, color: "#FF3366" }}>
        FAILURE MEANS SLASHING. 1 LIFE REMAINING.
      </Text>
    </Animated.View>
  );
}

export function CharacterCard({ character, classId, run, onPickClass }: Props) {
  const xpForNextLevel = Math.floor(75 * Math.pow(1.6, character.level - 1));
  const xpPercent = Math.min(100, Math.round((character.xp / xpForNextLevel) * 100));
  const lives = run?.livesRemaining ?? 3;

  const borderColor = classId ? CLASS_BORDER_COLORS[classId] : undefined;

  return (
    <GlassPanel
      contentStyle={{ gap: 8 }}
      glow={character.state === "idle" ? "green" : character.state === "dead" ? "red" : undefined}
      animateGlow={character.state === "dead"}
      borderColor={borderColor}
    >
      {/* Gradient accent strip */}
      {classId && (
        <LinearGradient
          colors={CLASS_GRADIENTS[classId]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 2, width: "100%" }}
        />
      )}

      {/* Content wrapper with padding (below the strip) */}
      <View style={{ padding: 16, gap: 10 }}>
      {/* Row 1: Class + Level + Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          {classId ? (
            <ClassIcon classId={classId} size={44} />
          ) : null}
          <Text className="text-lg font-display text-white">
            {classId ? CLASS_NAMES[classId] : "Node"}
          </Text>
          <View className="flex-row items-center gap-1">
            <Image
              source={require("@/assets/icons/exp.png")}
              style={{ width: 26, height: 26 }}
            />
            <GradientText className="text-sm font-display">Lv {character.level}</GradientText>
          </View>
        </View>
        {getStatusBadge(character.state, run?.active)}
      </View>

      {/* Row 2: XP bar */}
      <View className="flex-row items-center gap-2.5">
        <View className="flex-1">
          <Progress value={xpPercent} />
        </View>
        <Text className="text-sm font-mono text-[#4a7a9b] shrink-0">
          {character.xp}/{xpForNextLevel}
        </Text>
      </View>

      {/* Row 3: Lives + Score/Streak */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          {Array.from({ length: 3 }, (_, i) =>
            i < lives ? (
              <Heart key={i} size={16} color="#FF3366" fill="#FF3366" />
            ) : (
              <HeartCrack key={i} size={16} color="#1a3a5c" />
            )
          )}
          {lives === 1 && (
            <Text className="ml-1 text-sm font-mono text-neon-red">LAST LIFE</Text>
          )}
        </View>
        {run ? (
          <View className="flex-row items-center gap-3">
            <Text className="text-sm text-[#4a7a9b]">
              Score{" "}
              <Text className="font-display text-neon-green">{run.score}</Text>
            </Text>
            {run.streak >= 2 && (
              <Text className="text-sm text-[#4a7a9b]">
                Streak{" "}
                <Text
                  className={`font-display ${
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
        <Button size="md" onPress={onPickClass} variant="gradient">
          Pick Class
        </Button>
      )}

      {/* Warning banners */}
      {lives === 1 && run?.active && character.state !== "dead" && (
        <LastLifeWarning />
      )}
      {character.state === "dead" && character.reviveAt ? (
        <Text className="text-sm text-neon-red text-center">
          Back online at {new Date(character.reviveAt).toLocaleTimeString()}
        </Text>
      ) : null}
      </View>
    </GlassPanel>
  );
}
