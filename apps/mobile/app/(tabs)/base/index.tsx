import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { usePerks } from "@/hooks/use-perks";
import { UpgradePanel } from "@/features/game/upgrade-panel";
import { PerkPicker } from "@/features/game/perk-picker";
import { TrophyCase } from "@/features/game/trophy-case";
import { PermanentCollection } from "@/features/game/permanent-collection";
import { ScreenBg } from "@/components/screen-bg";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { paySkrOnChain } from "@/lib/skr";

function SectionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "#091120",
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: open ? 1 : 0,
          borderBottomColor: "rgba(255,255,255,0.12)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text className="text-sm font-mono text-white/65 uppercase tracking-wider">{title}</Text>
        {open ? <ChevronUp size={16} color="#7ab8d9" /> : <ChevronDown size={16} color="#7ab8d9" />}
      </Pressable>
      {open ? <View style={{ padding: 12 }}>{children}</View> : null}
    </View>
  );
}

export default function BaseScreen() {
  const router = useRouter();
  const { isAuthenticated, walletAddress, signAndSendTransaction, connection } = useAuth();
  const { upgradeInfo, inventory, upgradeTrack, activeRun, refresh } = useGameState(isAuthenticated);
  const { offers, hasPending, loading, choosePerk, rerollPerks, refresh: refreshPerks } = usePerks();
  const navigation = useNavigation();
  const [showPermanent, setShowPermanent] = useState(false);
  const [showTrophy, setShowTrophy] = useState(false);

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
      <View style={{ flex: 1 }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(5,10,18,0.36)",
          }}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="p-3 gap-3">
            <UpgradePanel
              upgradeInfo={upgradeInfo}
              inventory={inventory}
              onUpgrade={upgradeTrack}
            />
            <PerkPicker
              perks={{ offers, hasPending, loading }}
              inventory={inventory}
              onActivate={choosePerk}
              autoOpen={false}
              showOpenButton
              onReroll={async () => {
                const sig = await paySkrOnChain({
                  walletAddress: walletAddress!,
                  amount: 10,
                  connection,
                  signAndSendTransaction: signAndSendTransaction!,
                });
                await rerollPerks(sig);
              }}
              rerollCost={10}
            />
            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "#091120",
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 8,
              }}
            >
              <Text className="text-sm font-mono text-white/65 uppercase tracking-wider">Base Guide</Text>
              <View style={{ gap: 6 }}>
                {[
                  "Spend resources on upgrades and perks to strengthen your run.",
                  "Use collection and trophies to track long-term progress.",
                ].map((text, index) => (
                  <View key={text} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <Text className="text-sm font-mono text-white/45">{index + 1}.</Text>
                    <Text className="text-sm text-white/75" style={{ flex: 1 }}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" }}>
                <Text className="text-sm font-mono text-white/55 uppercase tracking-wider">Epoch Rules</Text>
                {[
                  { keeps: false, text: "Resources reset each epoch" },
                  { keeps: false, text: "Upgrades reset each epoch" },
                  { keeps: true, text: "Boss loot persists" },
                  { keeps: true, text: "Badges persist" },
                ].map((item) => (
                  <View key={item.text} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: item.keeps ? "#14F195" : "rgba(255,51,102,0.8)",
                      }}
                    />
                    <Text className="text-sm" style={{ color: item.keeps ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)" }}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <SectionCard
              title="Permanent Collection"
              open={showPermanent}
              onToggle={() => setShowPermanent((v) => !v)}
            >
              <PermanentCollection />
            </SectionCard>
            <SectionCard
              title="Trophy Case"
              open={showTrophy}
              onToggle={() => setShowTrophy((v) => !v)}
            >
              <TrophyCase
                run={activeRun}
                onViewCollection={() => router.push("/(tabs)/ranks/collection")}
              />
            </SectionCard>
          </View>
        </ScrollView>
      </View>
    </ScreenBg>
  );
}
