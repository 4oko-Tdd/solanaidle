import { useEffect } from "react";
import { ScrollView, View, Text } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { TrophyCase } from "@/features/game/trophy-case";
import { PermanentCollection } from "@/features/game/permanent-collection";
import { ScreenBg } from "@/components/screen-bg";

export default function BaseScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack, activeRun, refresh } = useGameState(isAuthenticated);
  const { offers, hasPending, loading, choosePerk, refresh: refreshPerks } = usePerks();
  const navigation = useNavigation();

  // Re-fetch game state & perks when tab gains focus (e.g. after a new epoch or level-up on GAME tab)
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      refresh();
      refreshPerks();
    });
    return unsub;
  }, [navigation, refresh, refreshPerks]);

  return (
    <ScreenBg>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        <UpgradePanel
          upgradeInfo={upgradeInfo}
          inventory={inventory}
          onUpgrade={upgradeTrack}
        />
        <PerkPicker
          perks={{ offers, hasPending, loading }}
          inventory={inventory}
          onActivate={choosePerk}
        />
        <PermanentCollection />
        <TrophyCase
          run={activeRun}
          onViewCollection={() => router.push("/(tabs)/ranks/collection")}
        />

        {/* Epoch Rules — compact like web */}
        <View
          style={{
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
            backgroundColor: "rgba(10,22,40,0.60)",
            padding: 12,
            gap: 6,
          }}
        >
          <Text className="text-sm font-mono text-white/40 uppercase tracking-wider">Epoch Rules</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 4 }}>
            {[
              { keeps: false, text: "Resources reset" },
              { keeps: false, text: "Upgrades reset" },
              { keeps: true, text: "Boss Loot persists" },
              { keeps: true, text: "Badges persist" },
            ].map((item) => (
              <View key={item.text} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: item.keeps ? "#14F195" : "rgba(255,51,102,0.6)",
                  }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "RobotoMono_400Regular",
                    color: item.keeps ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
    </ScreenBg>
  );
}
