import { useEffect } from "react";
import { ScrollView, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { useDailyLogin } from "@/hooks/use-daily-login";
import { CharacterCard } from "@/features/game/character-card";
import { ClassPicker } from "@/features/game/class-picker";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { BossFight } from "@/features/game/boss-fight";
import { RunLog } from "@/features/game/run-log";
import { RunStatus } from "@/features/game/run-status";
import { CurrencyBar } from "@/components/currency-bar";
import { ScreenBg } from "@/components/screen-bg";
import { useToast } from "@/components/toast-provider";
import type { MissionId } from "@solanaidle/shared";

export default function GameScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const { boss, applyDamage } = useBoss(isAuthenticated);
  const { status: dailyStatus, onClaim: claimDaily } = useDailyLogin(isAuthenticated);

  // Navigate to daily login modal when reward is available and not yet claimed
  useEffect(() => {
    if (dailyStatus && !dailyStatus.claimedToday) {
      router.push("/(tabs)/game/daily-login");
    }
  }, [dailyStatus?.claimedToday]);

  const handleStartMission = async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => {
    try {
      await gameState.startMission(missionId, options);
      toast("Mission started!", "success");
    } catch (e: any) {
      toast(e?.message ?? "Failed to start", "error");
    }
  };

  const handleClaim = async () => {
    try {
      await gameState.claimMission();
      router.push("/(tabs)/game/run-end");
    } catch (e: any) {
      toast(e?.message ?? "Failed to claim", "error");
    }
  };

  if (gameState.loading) {
    return (
      <ScreenBg>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#00ff87" />
        </View>
      </ScreenBg>
    );
  }

  // No active run → show class picker first (matches web behavior)
  if (!gameState.activeRun && gameState.classes.length > 0) {
    return (
      <ScreenBg>
        <ClassPicker
          classes={gameState.classes}
          currentClassId={null}
          onSelect={async (classId, sig) => {
            await gameState.startRun(classId, sig);
          }}
        />
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <CurrencyBar inventory={gameState.inventory} />
      <View className="p-4 gap-4">
        {gameState.character && (
          <CharacterCard
            character={gameState.character}
            upgradeInfo={gameState.upgradeInfo}
            inventory={gameState.inventory}
            classId={gameState.activeRun?.classId ?? null}
            run={gameState.activeRun ?? null}
            onPickClass={() => router.push("/(tabs)/game/class-picker")}
          />
        )}
        {gameState.activeMission ? (
          <MissionTimer
            mission={gameState.activeMission}
            onClaim={handleClaim}
          />
        ) : boss ? (
          <BossFight boss={boss} run={gameState.activeRun} onOverload={applyDamage} />
        ) : (
          <MissionPanel
            missions={gameState.missions}
            characterState={gameState.character?.state ?? "idle"}
            onStart={handleStartMission}
            characterLevel={gameState.character?.level}
            classId={gameState.activeRun?.classId ?? null}
            inventory={gameState.inventory}
          />
        )}
        {gameState.activeRun && (
          <RunStatus run={gameState.activeRun} boss={boss} characterState={gameState.character?.state} />
        )}
        <RunLog run={gameState.activeRun ?? null} />
      </View>
    </ScrollView>
    </ScreenBg>
  );
}
