import { useEffect, useState } from "react";
import { ScrollView, View, ActivityIndicator, Text, Pressable, Alert } from "react-native";
import { useRouter, Tabs } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { useDailyLogin } from "@/hooks/use-daily-login";
import { CharacterCard } from "@/features/game/character-card";
import { ClassPicker } from "@/features/game/class-picker";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { BossFight } from "@/features/game/boss-fight";
import { RunLog } from "@/features/game/run-log";
import { ScreenBg } from "@/components/screen-bg";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/api";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react-native";
import type { MissionId } from "@solanaidle/shared";

export default function GameScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const { boss, applyDamage, refresh: bossRefresh } = useBoss(isAuthenticated);
  const { status: dailyStatus, onClaim: claimDaily } = useDailyLogin(isAuthenticated);
  const [devOpen, setDevOpen] = useState(false);

  // Navigate to daily login modal only once game is loaded and player has an active run
  useEffect(() => {
    if (!gameState.loading && gameState.activeRun && dailyStatus && !dailyStatus.claimedToday) {
      router.push("/(tabs)/game/daily-login");
    }
  }, [dailyStatus?.claimedToday, gameState.loading, !!gameState.activeRun]);

  const handleStartMission = async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => {
    try {
      await gameState.startMission(missionId, options);
      toast("Mission started!", "success");
    } catch (e: any) {
      toast(e?.message ?? "Failed to start", "error");
    }
  };

  const handleClaim = async () => {
    try {
      await gameState.claimMission();
      router.push("/(tabs)/game/run-end");
    } catch (e: any) {
      toast(e?.message ?? "Failed to claim", "error");
    }
  };

  if (gameState.loading) {
    return (
      <ScreenBg>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#14F195" />
        </View>
      </ScreenBg>
    );
  }

  // No active run → show class picker first (matches web behavior)
  if (!gameState.activeRun && gameState.classes.length > 0) {
    return (
      <ScreenBg>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <ClassPicker
          classes={gameState.classes}
          currentClassId={null}
          onSelect={async (classId, sig) => {
            await gameState.startRun(classId, sig);
          }}
        />
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4 gap-4">
        {__DEV__ && (
          <View>
            <Pressable
              onPress={() => setDevOpen((o) => !o)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Wrench size={12} color="#4a7a9b" />
              <Text style={{ fontSize: 11, color: "#4a7a9b", fontFamily: "Orbitron_400Regular" }}>Dev</Text>
              {devOpen ? <ChevronUp size={12} color="#4a7a9b" /> : <ChevronDown size={12} color="#4a7a9b" />}
            </Pressable>
            {devOpen && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {(
                  [
                    { label: "+Resources", color: "#4a7a9b", onPress: async () => { await api("/dev/add-resources", { method: "POST" }); toast("+Resources", "success"); await gameState.refresh(); } },
                    { label: "+XP", color: "#4a7a9b", onPress: async () => { const r = await api<{ message: string }>("/dev/add-xp", { method: "POST" }); toast(r.message, "success"); await gameState.refresh(); } },
                    ...(gameState.activeRun ? [
                      { label: "Skip Timer", color: "#4a7a9b", onPress: async () => { await api("/dev/skip-timer", { method: "POST" }); toast("Timer skipped", "success"); await gameState.refresh(); } },
                      { label: "End Epoch", color: "#ff4444", onPress: async () => { await api("/dev/end-epoch", { method: "POST" }); toast("Epoch ended", "warning"); await gameState.refresh(); } },
                      { label: boss ? "Kill Boss" : "Spawn Boss", color: boss ? "#ff4444" : "#9945ff", onPress: async () => { const r = await api<{ message: string }>("/dev/spawn-boss", { method: "POST" }); toast(r.message, boss ? "warning" : "success"); await bossRefresh(); await gameState.refresh(); } },
                    ] : [
                      { label: "New Epoch", color: "#14F195", onPress: async () => { const r = await api<{ message: string }>("/dev/reset-epoch", { method: "POST" }); toast(r.message, "success"); await gameState.refresh(); } },
                    ]),
                    { label: "Reset Player", color: "rgba(255,68,68,0.6)", onPress: () => Alert.alert("Wipe Data?", "Delete all player data?", [{ text: "Cancel" }, { text: "Confirm", style: "destructive", onPress: async () => { const r = await api<{ message: string }>("/dev/reset-player", { method: "POST" }); toast(r.message, "warning"); await gameState.refresh(); } }]) },
                  ] as { label: string; color: string; onPress: () => void }[]
                ).map((btn) => (
                  <Pressable
                    key={btn.label}
                    onPress={btn.onPress}
                    style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  >
                    <Text style={{ fontSize: 11, color: btn.color, fontFamily: "Orbitron_400Regular" }}>{btn.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
        {gameState.character && (
          <CharacterCard
            character={gameState.character}
            upgradeInfo={gameState.upgradeInfo}
            inventory={gameState.inventory}
            classId={gameState.activeRun?.classId ?? null}
            run={gameState.activeRun ?? null}
            onPickClass={() => router.push("/(tabs)/game/class-picker")}
          />
        )}
        {gameState.activeMission ? (
          <MissionTimer
            mission={gameState.activeMission}
            onClaim={handleClaim}
          />
        ) : boss ? (
          <BossFight boss={boss} run={gameState.activeRun} onOverload={applyDamage} />
        ) : (
          <MissionPanel
            missions={gameState.missions}
            characterState={gameState.character?.state ?? "idle"}
            onStart={handleStartMission}
            characterLevel={gameState.character?.level}
            classId={gameState.activeRun?.classId ?? null}
            inventory={gameState.inventory}
          />
        )}
        <RunLog run={gameState.activeRun ?? null} />
      </View>
    </ScrollView>
    </ScreenBg>
  );
}
