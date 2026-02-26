import { useState } from "react";
import { ScrollView, View, ActivityIndicator, Text, Pressable, Alert, Modal } from "react-native";
import { useRouter, Tabs } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { useDailyLogin } from "@/hooks/use-daily-login";
import { usePerks } from "@/hooks/use-perks";
import { CharacterCard } from "@/features/game/character-card";
import { ClassPicker } from "@/features/game/class-picker";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { MissionResultDialog } from "@/features/game/mission-result-dialog";
import { DailyLoginModal } from "@/features/game/daily-login-modal";
import { PerkPicker } from "@/features/game/perk-picker";
import { BossFight } from "@/features/game/boss-fight";
import { RunLog } from "@/features/game/run-log";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { ScreenBg } from "@/components/screen-bg";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/api";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react-native";
import type { MissionId } from "@solanaidle/shared";

export default function GameScreen() {
  const router = useRouter();
  const { isAuthenticated, signMessage } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const { boss, join: bossJoin, overload: bossOverload, participantCount, totalDamage, playerContribution, hasJoined, overloadUsed, wsConnected, refresh: bossRefresh } = useBoss();
  const dailyLogin = useDailyLogin(isAuthenticated);
  const perks = usePerks();
  const [devOpen, setDevOpen] = useState(false);
  const [dailyDismissed, setDailyDismissed] = useState(false);

  // Show daily bonus modal when: loaded, unclaimed, has active run, not dismissed
  const showDaily =
    !dailyDismissed &&
    !gameState.loading &&
    !!gameState.activeRun &&
    !!dailyLogin.status &&
    !dailyLogin.status.claimedToday;

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
      // Pre-fetch perks while user views the result dialog — if a level-up
      // happened, offers will be ready by the time they close it
      perks.refresh();
    } catch (e: any) {
      toast(e?.message ?? "Failed to claim", "error");
    }
  };

  const handleCloseResult = () => {
    gameState.clearClaimResult();
    // If run ended (lives=0), the inline RunEndScreen check above
    // will render automatically on the next render cycle
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

  // Only show class picker when there is genuinely no run this week at all.
  // An ended run (active=0) blocks startRun on the server — fall through to
  // the main game view so dev buttons (Reset Player / New Epoch) are reachable.
  if (!gameState.activeRun && !gameState.endedRun && gameState.classes.length > 0) {
    return (
      <ScreenBg>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <ClassPicker
          classes={gameState.classes}
          currentClassId={null}
          onSelect={async (classId, sig) => {
            try {
              await gameState.startRun(classId, sig);
            } catch (e: any) {
              toast(e?.message ?? "Failed to start run", "error");
            }
          }}
        />
      </ScreenBg>
    );
  }

  // Show run-end screen when epoch ended but not yet sealed
  if (!gameState.activeRun && gameState.endedRun && !gameState.endedRun.endSignature) {
    return (
      <RunEndScreen
        run={gameState.endedRun}
        signMessage={signMessage}
        onClose={() => gameState.refresh()}
      />
    );
  }

  // Finalized epoch — score sealed, waiting for next week
  if (!gameState.activeRun && gameState.endedRun && gameState.endedRun.endSignature) {
    return (
      <ScreenBg>
        <Tabs.Screen options={{ tabBarStyle: {} }} />
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <Text className="text-2xl font-display text-neon-green">Epoch Sealed</Text>
          <Text className="text-base text-white/50 text-center leading-relaxed">
            Score: {gameState.endedRun.score} — Missions: {gameState.endedRun.missionsCompleted}
          </Text>
          <Text className="text-sm text-white/35 text-center">
            New epoch starts next week.
          </Text>
          {__DEV__ && (
            <Pressable
              onPress={async () => {
                try {
                  const r = await api<{ message: string }>("/dev/reset-epoch", { method: "POST" });
                  toast(r.message, "success");
                  await gameState.refresh();
                } catch (e: any) {
                  toast(e?.message ?? "Reset failed", "error");
                }
              }}
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "rgba(20,241,149,0.3)",
                backgroundColor: "rgba(20,241,149,0.06)",
              }}
            >
              <Text style={{ fontSize: 13, color: "#14F195", fontWeight: "700" }}>
                Dev: New Epoch
              </Text>
            </Pressable>
          )}
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
    {/* Explicitly reset tab bar — options from ClassPicker branch would otherwise persist */}
    <Tabs.Screen options={{ tabBarStyle: {} }} />
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
                    { label: "+Resources", color: "#4a7a9b", onPress: async () => { try { await api("/dev/add-resources", { method: "POST" }); toast("+Resources", "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    { label: "+XP", color: "#4a7a9b", onPress: async () => { try { const r = await api<{ message: string }>("/dev/add-xp", { method: "POST" }); toast(r.message, "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    ...(gameState.activeRun ? [
                      { label: "Skip Timer", color: "#4a7a9b", onPress: async () => { try { await api("/dev/skip-timer", { method: "POST" }); toast("Timer skipped", "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "End Epoch", color: "#ff4444", onPress: async () => { try { await api("/dev/end-epoch", { method: "POST" }); toast("Epoch ended", "warning"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "End epoch failed", "error"); } } },
                      { label: boss ? "Kill Boss" : "Spawn Boss", color: boss ? "#ff4444" : "#9945ff", onPress: async () => { try { const r = await api<{ message: string }>("/dev/spawn-boss", { method: "POST" }); toast(r.message, boss ? "warning" : "success"); await bossRefresh(); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    ] : [
                      { label: "New Epoch", color: "#14F195", onPress: async () => { try { const r = await api<{ message: string }>("/dev/reset-epoch", { method: "POST" }); toast(r.message, "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    ]),
                    { label: "Reset Daily", color: "#ffb800", onPress: async () => { try { await api("/dev/reset-daily", { method: "POST" }); toast("Daily reset — restart app", "success"); setDailyDismissed(false); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    { label: "Reset Player", color: "rgba(255,68,68,0.6)", onPress: () => Alert.alert("Wipe Data?", "Delete all player data?", [{ text: "Cancel" }, { text: "Confirm", style: "destructive", onPress: async () => { try { const r = await api<{ message: string }>("/dev/reset-player", { method: "POST" }); toast(r.message, "warning"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Reset failed", "error"); } } }]) },
                  ] as { label: string; color: string; onPress: () => void }[]
                ).map((btn) => (
                  <Pressable
                    key={btn.label}
                    onPress={btn.onPress}
                    hitSlop={8}
                    style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", minHeight: 40 }}
                  >
                    <Text style={{ fontSize: 12, color: btn.color, fontFamily: "Orbitron_400Regular" }}>{btn.label}</Text>
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
          <BossFight
            boss={boss}
            run={gameState.activeRun}
            participantCount={participantCount}
            totalDamage={totalDamage}
            playerContribution={playerContribution}
            hasJoined={hasJoined}
            overloadUsed={overloadUsed}
            wsConnected={wsConnected}
            onJoin={bossJoin}
            onOverload={bossOverload}
            onRefresh={bossRefresh}
          />
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
    <MissionResultDialog
      result={gameState.lastClaimResult}
      onClose={handleCloseResult}
      livesRemaining={gameState.activeRun?.livesRemaining}
    />
    <PerkPicker
      perks={{ offers: perks.offers, hasPending: perks.hasPending, loading: perks.loading }}
      inventory={gameState.inventory}
      onActivate={perks.choosePerk}
    />
    <Modal
      visible={showDaily}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setDailyDismissed(true)}
    >
      <View style={{ flex: 1 }}>
        <DailyLoginModal
          status={dailyLogin.status}
          loading={dailyLogin.loading}
          onClaim={dailyLogin.onClaim}
          onClose={() => setDailyDismissed(true)}
        />
      </View>
    </Modal>
    </ScreenBg>
  );
}
