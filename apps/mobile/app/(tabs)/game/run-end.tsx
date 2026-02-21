import { ScrollView } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { useRouter } from "expo-router";

export default function RunEndRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { endedRun, refresh, character } = useGameState(isAuthenticated);

  return (
    <RunEndScreen
      run={endedRun!}
      character={character}
      onClose={() => { refresh(); router.back(); }}
    />
  );
}
