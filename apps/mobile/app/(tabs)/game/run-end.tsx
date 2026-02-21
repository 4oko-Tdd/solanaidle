import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { useRouter } from "expo-router";

export default function RunEndRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { endedRun, refresh, character } = useGameState(isAuthenticated);

  if (!endedRun) {
    return (
      <View className="flex-1 bg-terminal items-center justify-center">
        <ActivityIndicator color="#00ff87" />
      </View>
    );
  }

  return (
    <RunEndScreen
      run={endedRun}
      character={character}
      onClose={() => { refresh(); router.back(); }}
    />
  );
}
