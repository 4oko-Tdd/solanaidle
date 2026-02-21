import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { LeaderboardPanel } from "@/features/game/leaderboard-panel";
import { BossFight } from "@/features/game/boss-fight";

export default function RanksScreen() {
  const { isAuthenticated } = useAuth();
  const { activeRun } = useGameState(isAuthenticated);
  const { boss, applyDamage } = useBoss(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        {boss && <BossFight boss={boss} run={activeRun} onOverload={applyDamage} />}
        <LeaderboardPanel isAuthenticated={isAuthenticated} />
      </View>
    </ScrollView>
  );
}
