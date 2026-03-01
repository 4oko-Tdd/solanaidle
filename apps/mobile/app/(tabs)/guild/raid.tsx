import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useRaid } from "@/hooks/use-raid";
import { useBoss } from "@/hooks/use-boss";
import { RaidPanel } from "@/features/guild/raid-panel";
import { ScreenBg } from "@/components/screen-bg";

export default function RaidRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const raidData = useRaid(isAuthenticated);
  const { raidLicense, buyRaidLicense, monetizationCosts } = useBoss();

  return (
    <ScreenBg>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="p-4">
          <RaidPanel
            raids={raidData.raids}
            activeRaid={raidData.activeRaid}
            loading={raidData.loading}
            memberCount={raidData.memberCount}
            startRaid={raidData.startRaid}
            commitRaid={raidData.commitRaid}
            claimRaid={raidData.claimRaid}
            raidLicenseActive={raidLicense}
            raidLicenseCost={monetizationCosts.raidLicense}
            onBuyRaidLicense={buyRaidLicense}
            onBack={() => router.back()}
          />
        </View>
      </ScrollView>
    </ScreenBg>
  );
}
