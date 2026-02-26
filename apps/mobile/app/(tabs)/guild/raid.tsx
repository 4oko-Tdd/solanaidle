import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useRaid } from "@/hooks/use-raid";
import { RaidPanel } from "@/features/guild/raid-panel";
import { ScreenBg } from "@/components/screen-bg";

export default function RaidRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const raidData = useRaid(isAuthenticated);

  return (
    <ScreenBg>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="p-4">
          <RaidPanel {...raidData} onBack={() => router.back()} />
        </View>
      </ScrollView>
    </ScreenBg>
  );
}
