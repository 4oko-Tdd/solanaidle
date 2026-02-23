import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { useRouter } from "expo-router";
import { ScreenBg } from "@/components/screen-bg";

export default function RunEndRoute() {
  const router = useRouter();
  const { isAuthenticated, signMessage } = useAuth();
  const { endedRun, refresh } = useGameState(isAuthenticated);

  if (!endedRun) {
    return (
      <ScreenBg>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#14F195" />
        </View>
      </ScreenBg>
    );
  }

  return (
    <RunEndScreen
      run={endedRun}
      signMessage={signMessage}
      onClose={() => { refresh(); router.back(); }}
    />
  );
}
