import { ScrollView, View } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useRaid } from "@/hooks/use-raid";
import { RaidPanel } from "@/features/guild/raid-panel";

export default function RaidRoute() {
  const { isAuthenticated } = useAuth();
  const raidData = useRaid(isAuthenticated);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4">
        <RaidPanel {...raidData} />
      </View>
    </ScrollView>
  );
}
