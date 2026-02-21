import { ScrollView, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { CharacterCard } from "@/features/game/character-card";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { RunStatus } from "@/features/game/run-status";
import { CurrencyBar } from "@/components/currency-bar";
import { useToast } from "@/components/toast-provider";
import type { MissionId } from "@solanaidle/shared";

export default function GameScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const { boss } = useBoss(isAuthenticated);

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
      <View className="flex-1 bg-terminal items-center justify-center">
        <ActivityIndicator color="#00ff87" />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
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
            onPickClass={() => router.push("/(tabs)/game/class-picker")}
          />
        )}
        {gameState.activeMission ? (
          <MissionTimer
            mission={gameState.activeMission}
            onClaim={handleClaim}
          />
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
      </View>
    </ScrollView>
  );
}
