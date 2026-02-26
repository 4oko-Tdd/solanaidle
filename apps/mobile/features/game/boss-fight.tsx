import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Swords, Users, Zap } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/toast-provider";
import { usePulse } from "@/lib/animations";
import { Shadows } from "@/theme";
import type { WorldBoss, WeeklyRun } from "@solanaidle/shared";

const SECTION_GAP = 12;
const PANEL_PADDING = 16;
const CARD_PADDING = 10;

function LiveDot() {
  const pulse = usePulse(true, 1200, 0.3);
  return (
    <Animated.View style={[pulse, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <View className="w-2 h-2 rounded-full bg-[#14F195]" />
      <Text className="text-sm font-mono text-[#14F195] uppercase">Live</Text>
    </Animated.View>
  );
}

interface Props {
  boss: WorldBoss | null;
  participantCount?: number;
  totalDamage?: number;
  playerContribution?: number;
  hasJoined?: boolean;
  overloadUsed?: boolean;
  reconnectUsed?: boolean;
  overloadAmplifierUsed?: boolean;
  raidLicenseActive?: boolean;
  destabilized?: boolean;
  monetizationCosts?: {
    reconnect: number;
    overloadAmplifier: number;
    raidLicense: number;
    freeRecoveryMinutes: number;
  };
  wsConnected?: boolean;
  run?: WeeklyRun | null;
  onJoin?: () => Promise<void>;
  onOverload?: () => Promise<void>;
  onReconnect?: () => Promise<void>;
  onBuyOverloadAmplifier?: () => Promise<void>;
  onBuyRaidLicense?: () => Promise<void>;
  onRefresh?: () => void;
}

export function BossFight({
  boss,
  participantCount = 0,
  totalDamage = 0,
  playerContribution = 0,
  hasJoined = false,
  overloadUsed = false,
  reconnectUsed = false,
  overloadAmplifierUsed = false,
  raidLicenseActive = false,
  destabilized = false,
  monetizationCosts = { reconnect: 25, overloadAmplifier: 18, raidLicense: 35, freeRecoveryMinutes: 15 },
  wsConnected = false,
  run,
  onJoin,
  onOverload,
  onReconnect,
  onBuyOverloadAmplifier,
  onBuyRaidLicense,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [overloading, setOverloading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [buyingAmp, setBuyingAmp] = useState(false);
  const [buyingLicense, setBuyingLicense] = useState(false);

  if (!boss) {
    return (
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,58,92,0.6)" }}>
        <BlurView intensity={60} tint="dark">
          <View style={{ backgroundColor: "rgba(10,22,40,0.95)", padding: 20, alignItems: "center", gap: 10 }}>
            <Swords size={36} color="rgba(74,122,155,0.3)" />
            <Text className="text-base text-[#4a7a9b] font-mono text-center">No active boss this week</Text>
            <Text className="text-sm text-[#4a7a9b]/60 text-center leading-relaxed">
              A new Protocol Leviathan spawns each weekend. Check back Friday.
            </Text>
          </View>
        </BlurView>
      </View>
    );
  }

  const hpPercent = boss.maxHp > 0 ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const isDefeated = boss.killed;
  const contributionPercent = totalDamage > 0 ? (playerContribution * 100).toFixed(1) : "0.0";

  const hpColor = hpPercent > 50 ? "#FF3366" : hpPercent > 20 ? "#ffb800" : "#14F195";

  const handleJoin = async () => {
    if (!onJoin) return;
    setJoining(true);
    try {
      await onJoin();
      toast("Joined the hunt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Failed to join", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleOverload = async () => {
    if (!onOverload) return;
    setOverloading(true);
    try {
      await onOverload();
      toast("OVERLOAD! Critical damage dealt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Overload failed", "error");
    } finally {
      setOverloading(false);
    }
  };

  const handleReconnect = async () => {
    if (!onReconnect) return;
    setReconnecting(true);
    try {
      await onReconnect();
      toast("Reconnect protocol activated", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Reconnect failed", "error");
    } finally {
      setReconnecting(false);
    }
  };

  const handleBuyAmp = async () => {
    if (!onBuyOverloadAmplifier) return;
    setBuyingAmp(true);
    try {
      await onBuyOverloadAmplifier();
      toast("Overload Amplifier armed (+10%)", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Purchase failed", "error");
    } finally {
      setBuyingAmp(false);
    }
  };

  const handleBuyLicense = async () => {
    if (!onBuyRaidLicense) return;
    setBuyingLicense(true);
    try {
      await onBuyRaidLicense();
      toast("Raid License activated (+5% efficiency)", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast(err.message || "Purchase failed", "error");
    } finally {
      setBuyingLicense(false);
    }
  };

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: isDefeated ? "rgba(20,241,149,0.3)" : "rgba(255,51,102,0.3)" }}>
      <BlurView intensity={60} tint="dark">
        <View style={{ backgroundColor: "rgba(10,22,40,0.95)" }}>
          {/* Top gradient accent strip */}
          <LinearGradient
            colors={isDefeated ? ["#14F195", "#ffb800", "#14F195"] : ["#FF3366", "#9945ff", "#FF3366"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2 }}
          />

          <View style={{ padding: PANEL_PADDING, gap: SECTION_GAP }}>
          {/* Name & HP label */}
          <View className="items-center gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-mono text-white/40 uppercase tracking-widest">World Boss</Text>
              {!isDefeated && <LiveDot />}
            </View>
            <Text
              className={`text-3xl font-display tracking-wide ${
                isDefeated ? "text-[#14F195]" : "text-[#FF3366]"
              }`}
            >
              {boss.name}
            </Text>
          </View>

          {/* HP Bar */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-mono text-white/50">Integrity</Text>
              <Text className="text-base font-display" style={{ color: hpColor }}>
                {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
              </Text>
            </View>
            <View className="relative">
              <Progress value={hpPercent} color={hpColor} className="h-5" />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-sm font-display text-white">
                  {hpPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-2">
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] items-center gap-1.5" style={{ padding: CARD_PADDING }}>
              <Users size={18} color="#00d4ff" />
              <Text className="text-base font-display text-[#00d4ff]">{participantCount}</Text>
              <Text className="text-sm text-white/50">Hunters</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] items-center gap-1.5" style={{ padding: CARD_PADDING }}>
              <Swords size={18} color="#ffb800" />
              <Text className="text-base font-display text-[#ffb800]">{totalDamage.toLocaleString()}</Text>
              <Text className="text-sm text-white/50">Total DMG</Text>
            </View>
            <View className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] items-center gap-1.5" style={{ padding: CARD_PADDING }}>
              <Zap size={18} color="#9945ff" />
              <Text className="text-base font-display text-[#9945ff]">{contributionPercent}%</Text>
              <Text className="text-sm text-white/50">Your Share</Text>
            </View>
          </View>

          {/* Actions */}
          {!isDefeated && (
            <View className="gap-2">
              {hasJoined && (
                <View
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    paddingHorizontal: CARD_PADDING,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                >
                  <Text className="text-xs font-mono text-white/55 uppercase tracking-wider">SKR Utility</Text>

                  <View className="flex-row flex-wrap gap-1.5">
                    <View className={`rounded-full px-2 py-0.5 border ${raidLicenseActive ? "border-neon-green/40 bg-neon-green/10" : "border-white/15 bg-white/5"}`}>
                      <Text className={`text-xs ${raidLicenseActive ? "text-neon-green" : "text-white/45"}`}>License {raidLicenseActive ? "ON" : "OFF"}</Text>
                    </View>
                    <View className={`rounded-full px-2 py-0.5 border ${overloadAmplifierUsed ? "border-neon-purple/40 bg-neon-purple/10" : "border-white/15 bg-white/5"}`}>
                      <Text className={`text-xs ${overloadAmplifierUsed ? "text-neon-purple" : "text-white/45"}`}>Amp {overloadAmplifierUsed ? "ON" : "OFF"}</Text>
                    </View>
                    <View className={`rounded-full px-2 py-0.5 border ${destabilized ? "border-neon-red/40 bg-neon-red/10" : "border-white/15 bg-white/5"}`}>
                      <Text className={`text-xs ${destabilized ? "text-neon-red" : "text-white/45"}`}>Node {destabilized ? "Unstable" : "Stable"}</Text>
                    </View>
                  </View>

                  <View className="gap-1.5">
                    <Button
                      variant={raidLicenseActive ? "default" : "outline"}
                      size="sm"
                      onPress={handleBuyLicense}
                      disabled={raidLicenseActive || buyingLicense}
                      className="w-full"
                    >
                      {raidLicenseActive ? "Raid License Active" : `Activate Raid License (${monetizationCosts.raidLicense} SKR)`}
                    </Button>
                    <Button
                      variant={overloadAmplifierUsed ? "default" : "outline"}
                      size="sm"
                      onPress={handleBuyAmp}
                      disabled={overloadAmplifierUsed || overloadUsed || buyingAmp}
                      className="w-full"
                    >
                      {overloadAmplifierUsed ? "Overload Amplifier Active" : `Activate Overload Amplifier (${monetizationCosts.overloadAmplifier} SKR)`}
                    </Button>
                    <Button
                      variant={destabilized ? "destructive" : "ghost"}
                      size="sm"
                      onPress={handleReconnect}
                      disabled={!destabilized || reconnectUsed || reconnecting}
                      className="w-full"
                    >
                      {reconnectUsed
                        ? "Reconnect Used"
                        : destabilized
                        ? `Activate Reconnect (${monetizationCosts.reconnect} SKR)`
                        : "Reconnect Unavailable"}
                    </Button>
                  </View>
                </View>
              )}

              {!hasJoined && (
                <View
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    paddingHorizontal: CARD_PADDING,
                    paddingVertical: 8,
                    gap: 4,
                  }}
                >
                  <Text className="text-xs font-mono text-white/55 uppercase tracking-wider">Before You Join</Text>
                  <Text className="text-xs text-white/65">1. Join Hunt to start passive contribution.</Text>
                  <Text className="text-xs text-white/65">2. One OVERLOAD per fight for burst damage.</Text>
                  <Text className="text-xs text-white/65">3. Destabilized node stops passive damage until recovery.</Text>
                  <Text className="text-xs text-white/65">4. Recovery: auto in ~{monetizationCosts.freeRecoveryMinutes}m or instant via Reconnect.</Text>
                </View>
              )}
              {!hasJoined ? (
                <Button
                  variant="destructive"
                  onPress={handleJoin}
                  disabled={joining || !onJoin}
                  className="w-full h-11"
                >
                  <View className="flex-row items-center gap-2">
                    {joining ? (
                      <ActivityIndicator size="small" color="#FF3366" />
                    ) : (
                      <Swords size={18} color="#FF3366" />
                    )}
                    <Text className="text-base font-display text-[#FF3366]">Join the Hunt</Text>
                  </View>
                </Button>
              ) : (
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-center gap-2 py-1">
                    <Swords size={18} color="#14F195" />
                    <Text className="text-base font-display text-[#14F195]">
                      {destabilized ? "Destabilized" : "Hunting"}
                    </Text>
                  </View>
                  {destabilized && (
                    <View className="rounded-lg border border-neon-red/35 bg-neon-red/10 px-3 py-2">
                      <Text className="text-xs text-neon-red text-center">
                        Node destabilized: passive contribution paused. Auto-recover in ~{monetizationCosts.freeRecoveryMinutes}m or use Reconnect.
                      </Text>
                    </View>
                  )}
                  {overloadUsed ? (
                    <View className="flex-row items-center justify-center gap-2 h-12 rounded bg-white/[0.03] border border-white/[0.08] opacity-50">
                      <Zap size={18} color="rgba(255,255,255,0.4)" />
                      <Text className="text-base font-display text-white/40 line-through">OVERLOAD</Text>
                      <Text className="text-sm text-white/40 ml-1">Used</Text>
                    </View>
                  ) : (
                    <Button
                      variant="ghost"
                      onPress={handleOverload}
                      disabled={overloading || !onOverload}
                      className="w-full h-11"
                      style={{
                        backgroundColor: "rgba(153,69,255,0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(153,69,255,0.4)",
                        boxShadow: Shadows.glowPurple,
                      }}
                    >
                      <View className="flex-row items-center gap-2">
                        {overloading ? (
                          <ActivityIndicator size="small" color="#9945ff" />
                        ) : (
                          <Zap size={18} color="#9945ff" />
                        )}
                        <Text className="text-base font-display text-[#9945ff]">OVERLOAD</Text>
                      </View>
                    </Button>
                  )}
                </View>
              )}
            </View>
          )}

          {isDefeated && (
            <View className="items-center gap-2 pt-1">
              <Text className="text-base font-display text-[#14F195]">DEFEATED</Text>
              <Text className="text-base text-white/40 text-center">
                The Leviathan has been destroyed. Check rewards in your collection.
              </Text>
              {onRefresh && (
                <Button variant="outline" size="md" onPress={onRefresh}>
                  Refresh
                </Button>
              )}
            </View>
          )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}
