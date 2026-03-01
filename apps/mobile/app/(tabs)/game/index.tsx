import { useEffect, useRef, useState } from "react";
import { ScrollView, View, ActivityIndicator, Text, Pressable, Alert, Modal } from "react-native";
import { useNavigation, useRouter, Tabs } from "expo-router";
import { useAuth } from "@/providers/auth-context";
import { useChallenges } from "@/hooks/use-challenges";
import { ChallengesPanel } from "@/features/game/challenges-panel";
import { paySkrOnChain } from "@/lib/skr";
import { useGameState } from "@/hooks/use-game-state";
import { useBoss } from "@/hooks/use-boss";
import { useDailyLogin } from "@/hooks/use-daily-login";
import { usePerks, notifyPerksChanged, setPerksPendingOptimistic } from "@/hooks/use-perks";
import { CharacterCard } from "@/features/game/character-card";
import { ClassPicker } from "@/features/game/class-picker";
import { MissionPanel } from "@/features/game/mission-panel";
import { MissionTimer } from "@/features/game/mission-timer";
import { MissionResultDialog } from "@/features/game/mission-result-dialog";
import { DailyLoginModal } from "@/features/game/daily-login-modal";
import { BossFight } from "@/features/game/boss-fight";
import { RunLog } from "@/features/game/run-log";
import { RunEndScreen } from "@/features/game/run-end-screen";
import { ScreenBg } from "@/components/screen-bg";
import { useToast } from "@/components/toast-provider";
import { api } from "@/lib/api";
import { useDevToolsEnabled } from "@/providers/dev-tools";
import {
  initGameNotifications,
  notifyBossStarted,
  notifyEpochFinished,
  notifyEpochStarted,
  scheduleMissionReadyNotification,
} from "@/lib/game-notifications";
import { Wrench, ChevronDown, ChevronUp, Lock, Zap } from "lucide-react-native";
import type { MissionId } from "@solanaidle/shared";

export default function GameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isAuthenticated, signMessage, walletAddress, signAndSendTransaction, connection } = useAuth();
  const gameState = useGameState(isAuthenticated);
  const { toast } = useToast();
  const devToolsEnabled = useDevToolsEnabled();
  const {
    boss,
    join: bossJoin,
    overload: bossOverload,
    reconnect: bossReconnect,
    buyOverloadAmplifier: bossBuyOverloadAmplifier,
    buyRaidLicense: bossBuyRaidLicense,
    participantCount,
    totalDamage,
    playerContribution,
    hasJoined,
    overloadUsed,
    wsConnected,
    reconnectUsed,
    overloadAmpUsed,
    raidLicense,
    destabilized,
    monetizationCosts,
    surgeActive,
    nextSurge,
    refresh: bossRefresh,
  } = useBoss();
  const dailyLogin = useDailyLogin(isAuthenticated);
  const perks = usePerks();
  const challenges = useChallenges(isAuthenticated);
  const [devOpen, setDevOpen] = useState(false);
  const [dailyDismissed, setDailyDismissed] = useState(false);
  const hasObservedBossRef = useRef(false);
  const previousBossRef = useRef<typeof boss>(null);
  const hasObservedEpochRef = useRef(false);
  const previousEpochStateRef = useRef<{
    activeRunId: string | null;
    endedRunId: string | null;
    endedRunHasSignature: boolean;
    showInlineClassPicker: boolean;
  } | null>(null);
  const showInlineClassPicker =
    !gameState.loading &&
    !gameState.activeRun &&
    !gameState.endedRun &&
    gameState.classes.length > 0;

  useEffect(() => {
    if (!devToolsEnabled) setDevOpen(false);
  }, [devToolsEnabled]);

  useEffect(() => {
    void initGameNotifications();
  }, []);

  useEffect(() => {
    void scheduleMissionReadyNotification(gameState.activeMission);
  }, [gameState.activeMission?.endsAt, gameState.activeMission?.missionId]);

  const { activeMissions } = gameState;

  const handleClaimFast = async () => {
    try {
      const result = await gameState.claimMission('fast');
      if (result.result === 'success') {
        toast("Quick Swap complete! Rewards collected.", "success");
      } else {
        toast("Quick Swap failed.", "error");
      }
    } catch (e: any) {
      toast(e?.message ?? "Failed to claim fast slot", "error");
    }
  };

  const handleUnlockFastSlot = async () => {
    if (!walletAddress || !connection || !signAndSendTransaction) {
      Alert.alert("Wallet Required", "Connect your wallet to unlock the fast slot.");
      return;
    }
    try {
      const sig = await paySkrOnChain({
        walletAddress,
        amount: 20,
        connection,
        signAndSendTransaction,
      });
      await gameState.unlockFastSlot(sig);
      toast("Fast slot unlocked for this epoch!", "success");
    } catch (e: any) {
      Alert.alert("Unlock Failed", e?.message ?? "Could not unlock fast slot. Try again.");
    }
  };

  useEffect(() => {
    if (!hasObservedBossRef.current) {
      hasObservedBossRef.current = true;
      previousBossRef.current = boss;
      return;
    }
    const previous = previousBossRef.current;
    const bossStarted = !!boss && !boss.killed && (!previous || previous.killed || previous.id !== boss.id);
    if (bossStarted) {
      void notifyBossStarted(boss.id, boss.name);
    }
    previousBossRef.current = boss;
  }, [boss]);

  useEffect(() => {
    if (gameState.loading) return;

    const current = {
      activeRunId: gameState.activeRun?.id ?? null,
      endedRunId: gameState.endedRun?.id ?? null,
      endedRunHasSignature: !!gameState.endedRun?.endSignature,
      showInlineClassPicker,
    };

    if (!hasObservedEpochRef.current) {
      hasObservedEpochRef.current = true;
      previousEpochStateRef.current = current;
      return;
    }

    const previous = previousEpochStateRef.current;
    if (previous) {
      const justFinishedEpoch =
        !!previous.activeRunId &&
        !current.activeRunId &&
        !!current.endedRunId &&
        !current.endedRunHasSignature;

      if (justFinishedEpoch) {
        void notifyEpochFinished(current.endedRunId!);
      }

      const justStartedNewEpochWindow =
        !previous.showInlineClassPicker && current.showInlineClassPicker;

      if (justStartedNewEpochWindow) {
        const epochKey =
          current.endedRunId ??
          previous.endedRunId ??
          `${Date.now()}`;
        void notifyEpochStarted(epochKey);
      }
    }

    previousEpochStateRef.current = current;
  }, [
    gameState.loading,
    gameState.activeRun?.id,
    gameState.endedRun?.id,
    gameState.endedRun?.endSignature,
    showInlineClassPicker,
  ]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    parent.setOptions({
      tabBarStyle: showInlineClassPicker ? { display: "none" } : {},
    });
    return () => {
      parent.setOptions({ tabBarStyle: {} });
    };
  }, [navigation, showInlineClassPicker]);

  // Show daily bonus modal when: loaded, unclaimed, has active run, not dismissed
  const showDaily =
    !dailyDismissed &&
    !gameState.loading &&
    !!gameState.activeRun &&
    !!dailyLogin.status &&
    !dailyLogin.status.claimedToday;

  const handleStartMission = async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean; slot?: 'main' | 'fast' }) => {
    try {
      await gameState.startMission(missionId, options);
      toast(options?.slot === 'fast' ? "Quick Swap started!" : "Mission started!", "success");
    } catch (e: any) {
      toast(e?.message ?? "Failed to start", "error");
    }
  };

  const handleClaim = async () => {
    try {
      const previousLevel = gameState.character?.level ?? 0;
      const result = await gameState.claimMission();
      if ((result.character?.level ?? previousLevel) > previousLevel) {
        setPerksPendingOptimistic(true);
      }
      // Pre-fetch perks while user views the result dialog — if a level-up
      // happened, offers will be ready by the time they close it
      await perks.refresh();
      notifyPerksChanged();
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
  if (showInlineClassPicker) {
    return (
      <ScreenBg>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <ClassPicker
          classes={gameState.classes}
          currentClassId={null}
          signMessage={signMessage}
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
        signMessage={signMessage!}
        onClose={() => gameState.refresh()}
      />
    );
  }

  // Finalized epoch — score sealed, waiting for next week
  if (!gameState.activeRun && gameState.endedRun && gameState.endedRun.endSignature) {
    return (
      <ScreenBg>
        <Tabs.Screen options={{ tabBarStyle: {} }} />
        <View className="flex-1 justify-center p-3">
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(20,241,149,0.22)",
              backgroundColor: "#091120",
              padding: 16,
              gap: 12,
            }}
          >
            <View className="items-center gap-1.5">
              <Text className="text-xs font-mono text-neon-green/65 uppercase tracking-widest">Epoch Status</Text>
              <Text className="text-2xl font-display text-neon-green">Epoch Sealed</Text>
              <Text className="text-sm text-white/45 text-center">Run finalized. Waiting for next weekly reset.</Text>
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 items-center gap-1">
                <Text className="text-xs font-mono text-white/40 uppercase tracking-wider">Score</Text>
                <Text className="text-xl font-display text-neon-green">{gameState.endedRun.score}</Text>
              </View>
              <View className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 items-center gap-1">
                <Text className="text-xs font-mono text-white/40 uppercase tracking-wider">Missions</Text>
                <Text className="text-xl font-display text-neon-cyan">{gameState.endedRun.missionsCompleted}</Text>
              </View>
            </View>

              <Text className="text-xs text-white/35 text-center">
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
                marginTop: 2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "rgba(20,241,149,0.3)",
                backgroundColor: "rgba(20,241,149,0.06)",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: "#14F195", fontWeight: "700" }}>
                Dev: New Epoch
              </Text>
            </Pressable>
          )}
          </View>
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
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 12 }}
    >
      <View className="px-3 pt-2.5 pb-1 gap-1.5">
        {__DEV__ && devToolsEnabled && (
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
                    { label: boss ? "Kill Boss" : "Spawn Boss", color: boss ? "#ff4444" : "#9945ff", onPress: async () => { try { const r = await api<{ message: string }>("/dev/spawn-boss", { method: "POST" }); toast(r.message, boss ? "warning" : "success"); await bossRefresh(); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    ...(gameState.activeRun ? [
                      { label: "Skip Timer", color: "#4a7a9b", onPress: async () => { try { await api("/dev/skip-timer", { method: "POST" }); toast("Timer skipped", "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "End Epoch", color: "#ff4444", onPress: async () => { try { await api("/dev/end-epoch", { method: "POST" }); toast("Epoch ended", "warning"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "End epoch failed", "error"); } } },
                      { label: "+100 SKR", color: "#ffb800", onPress: async () => { try { const r = await api<{ message: string }>("/dev/add-skr", { method: "POST" }); toast(r.message, "success"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "Destabilize", color: "#ff3366", onPress: async () => { try { const r = await api<{ message: string }>("/dev/toggle-destabilized", { method: "POST" }); toast(r.message, "warning"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "Toggle License", color: "#14F195", onPress: async () => { try { const r = await api<{ message: string }>("/dev/toggle-raid-license", { method: "POST" }); toast(r.message, "success"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "Toggle Amp", color: "#9945ff", onPress: async () => { try { const r = await api<{ message: string }>("/dev/toggle-overload-amp", { method: "POST" }); toast(r.message, "success"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "Reset Boss SKR", color: "#4a7a9b", onPress: async () => { try { const r = await api<{ message: string }>("/dev/reset-boss-monetization", { method: "POST" }); toast(r.message, "info"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                    ] : [
                      { label: "New Epoch", color: "#14F195", onPress: async () => { try { const r = await api<{ message: string }>("/dev/reset-epoch", { method: "POST" }); toast(r.message, "success"); await gameState.refresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
                      { label: "+100 SKR", color: "#ffb800", onPress: async () => { try { const r = await api<{ message: string }>("/dev/add-skr", { method: "POST" }); toast(r.message, "success"); await bossRefresh(); } catch (e: any) { toast(e?.message ?? "Failed", "error"); } } },
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
            reconnectUsed={reconnectUsed}
            overloadAmplifierUsed={overloadAmpUsed}
            raidLicenseActive={raidLicense}
            destabilized={destabilized}
            monetizationCosts={monetizationCosts}
            surgeActive={surgeActive}
            nextSurge={nextSurge}
            onJoin={bossJoin}
            onOverload={bossOverload}
            onReconnect={bossReconnect}
            onBuyOverloadAmplifier={bossBuyOverloadAmplifier}
            onBuyRaidLicense={bossBuyRaidLicense}
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

        {/* Fast Slot Panel — visible only when there's an active run */}
        {!!gameState.activeRun && (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,184,0,0.22)",
              backgroundColor: "#0d0c05",
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Zap size={13} color="#FFB800" />
              <Text style={{ fontSize: 11, color: "#FFB800", fontFamily: "Orbitron_400Regular", letterSpacing: 2, textTransform: "uppercase" }}>
                Fast Slot
              </Text>
            </View>

            {activeMissions?.fast ? (
              /* Fast slot countdown card */
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: "#FFB800", fontFamily: "Orbitron_400Regular" }}>
                    Quick Swap Active
                  </Text>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Orbitron_400Regular" }}>
                    {activeMissions.fast.timeRemaining != null && activeMissions.fast.timeRemaining > 0
                      ? `${Math.floor(activeMissions.fast.timeRemaining / 60)}m ${activeMissions.fast.timeRemaining % 60}s`
                      : "Ready!"}
                  </Text>
                </View>
                {(activeMissions.fast.timeRemaining == null || activeMissions.fast.timeRemaining <= 0) && (
                  <Pressable
                    onPress={handleClaimFast}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "rgba(255,184,0,0.5)",
                      backgroundColor: "rgba(255,184,0,0.12)",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#FFB800", fontFamily: "Orbitron_700Bold" }}>
                      Claim Quick Swap
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : activeMissions?.fastSlotUnlocked ? (
              /* Start fast slot mission */
              <Pressable
                onPress={() => handleStartMission("scout", { slot: 'fast' })}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,184,0,0.5)",
                  backgroundColor: "rgba(255,184,0,0.1)",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, color: "#FFB800", fontFamily: "Orbitron_700Bold" }}>
                  Start Quick Swap (Fast Slot)
                </Text>
              </Pressable>
            ) : (
              /* Unlock fast slot */
              <Pressable
                onPress={handleUnlockFastSlot}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,184,0,0.25)",
                  backgroundColor: "rgba(255,184,0,0.05)",
                }}
              >
                <Lock size={13} color="rgba(255,184,0,0.65)" />
                <Text style={{ fontSize: 13, color: "rgba(255,184,0,0.65)", fontFamily: "Orbitron_400Regular" }}>
                  Unlock Fast Slot — 20 SKR
                </Text>
              </Pressable>
            )}
          </View>
        )}
        <RunLog run={gameState.activeRun ?? null} />
        {challenges.data && (
          <ChallengesPanel
            challenges={challenges.data.challenges}
            periodKey={challenges.data.periodKey}
            rerollCost={challenges.data.rerollCost}
            onReroll={async (questId) => {
              try {
                const sig = await paySkrOnChain({
                  walletAddress: walletAddress!,
                  amount: challenges.data!.rerollCost,
                  connection,
                  signAndSendTransaction: signAndSendTransaction!,
                });
                await challenges.rerollChallenge(questId, sig);
              } catch (e: any) {
                Alert.alert("Reroll Failed", e?.message ?? "Could not reroll challenge. Try again.");
              }
            }}
          />
        )}
      </View>
    </ScrollView>
    <MissionResultDialog
      result={gameState.lastClaimResult}
      onClose={handleCloseResult}
      livesRemaining={gameState.activeRun?.livesRemaining}
    />
    <Modal
      visible={showDaily}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setDailyDismissed(true)}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(10,22,40,0.98)" }}>
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
