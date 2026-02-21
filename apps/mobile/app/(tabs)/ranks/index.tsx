import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { LeaderboardPanel } from "@/features/game/leaderboard-panel";

export default function RanksScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <LeaderboardPanel isAuthenticated={isAuthenticated} />
      </View>
    </ScrollView>
  );
}
