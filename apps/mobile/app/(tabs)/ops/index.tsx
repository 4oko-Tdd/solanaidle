import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { QuestPanel } from "@/features/game/quest-panel";
import { RunLog } from "@/features/game/run-log";

export default function OpsScreen() {
  const { isAuthenticated } = useAuth();
  const { activeRun } = useGameState(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <QuestPanel />
        <RunLog run={activeRun} />
      </View>
    </ScrollView>
  );
}
