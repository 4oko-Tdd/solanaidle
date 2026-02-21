import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { GuildPanel } from "@/features/guild/guild-panel";

export default function GuildScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4">
        <GuildPanel
          isAuthenticated={isAuthenticated}
          onViewRaid={() => router.push("/(tabs)/guild/raid")}
        />
      </View>
    </ScrollView>
  );
}
