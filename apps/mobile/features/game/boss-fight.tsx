import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Swords, Users, Zap, Clock, AlertTriangle, CheckCircle2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/toast-provider";
import { usePulse, useGlowPulse } from "@/lib/animations";
import { Colors } from "@/theme";
import type { WorldBoss, WeeklyRun, SurgeWindow } from "@solanaidle/shared";

const PAD = 16;
const INNER = 12;

function LiveDot() {
  const pulse = usePulse(true, 1200, 0.3);
  return (
    <Animated.View style={[pulse, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <View className="w-1.5 h-1.5 rounded-full bg-[#14F195]" />
      <Text className="text-[10px] font-mono text-[#14F195] uppercase tracking-widest">Live</Text>
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
  surgeActive?: boolean;
  nextSurge?: SurgeWindow | null;
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
  raidLicenseActive: _raidLicenseActive = false,
  destabilized = false,
  surgeActive = false,
  nextSurge = null,
  monetizationCosts = { reconnect: 25, overloadAmplifier: 18, raidLicense: 35, freeRecoveryMinutes: 15 },
  wsConnected = false,
  onJoin,
  onOverload,
  onReconnect,
  onBuyOverloadAmplifier,
  onRefresh,
}: Props) {
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [overloading, setOverloading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [buyingAmp, setBuyingAmp] = useState(false);

  const overloadGlow = useGlowPulse("153, 69, 255", hasJoined && !overloadUsed);
  const destabPulse = usePulse(destabilized, 900, 0.55);

  if (!boss) {
    return (
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,58,92,0.6)" }}>
        <BlurView intensity={60} tint="dark">
          <View className="items-center gap-3 py-6 px-5" style={{ backgroundColor: "rgba(10,22,40,0.95)" }}>
            <Swords size={36} color="rgba(74,122,155,0.3)" />
            <Text className="text-sm font-mono text-[#4a7a9b] text-center">No active boss this week</Text>
            <Text className="text-xs text-[#4a7a9b]/60 text-center leading-relaxed">
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
  const hpColor = hpPercent > 50 ? Colors.neonRed : hpPercent > 20 ? Colors.neonAmber : Colors.neonGreen;

  const handleJoin = async () => {
    if (!onJoin) return;
    setJoining(true);
    try { await onJoin(); toast("Joined the hunt!", "success"); }
    catch (e: unknown) { toast((e as { message?: string }).message || "Failed to join", "error"); }
    finally { setJoining(false); }
  };

  const handleOverload = async () => {
    if (!onOverload) return;
    setOverloading(true);
    try {
      await onOverload();
      toast(overloadAmplifierUsed ? "OVERLOAD +10%! Damage amplified!" : "OVERLOAD! Critical damage dealt!", "success");
    }
    catch (e: unknown) { toast((e as { message?: string }).message || "Overload failed", "error"); }
    finally { setOverloading(false); }
  };

  const handleReconnect = async () => {
    if (!onReconnect) return;
    setReconnecting(true);
    try { await onReconnect(); toast("Node reconnected", "success"); }
    catch (e: unknown) { toast((e as { message?: string }).message || "Reconnect failed", "error"); }
    finally { setReconnecting(false); }
  };

  const handleBuyAmp = async () => {
    if (!onBuyOverloadAmplifier) return;
    setBuyingAmp(true);
    try { await onBuyOverloadAmplifier(); toast("Overload Amplifier armed (+10%)", "success"); }
    catch (e: unknown) { toast((e as { message?: string }).message || "Purchase failed", "error"); }
    finally { setBuyingAmp(false); }
  };

  return (
    <View style={{
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDefeated ? "rgba(20,241,149,0.3)" : "rgba(255,51,102,0.3)",
    }}>
      <BlurView intensity={60} tint="dark">
        <View style={{ backgroundColor: "rgba(10,22,40,0.95)" }}>
          {/* Top gradient accent strip */}
          <LinearGradient
            colors={isDefeated
              ? [Colors.neonGreen, Colors.neonAmber, Colors.neonGreen]
              : [Colors.neonRed, "#9945ff", Colors.neonRed]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 2 }}
          />

          <View style={{ padding: PAD, gap: 14 }}>

            {/* ═══ ZONE 1: Boss Identity ═══ */}
            <View style={{ gap: 10 }}>

              {/* Label + live indicator */}
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-[10px] font-mono text-white/35 uppercase tracking-[3px]">
                  World Boss
                </Text>
                {!isDefeated && wsConnected && <LiveDot />}
              </View>

              {/* Boss name */}
              <Text className={`text-[28px] font-display tracking-wide text-center ${isDefeated ? "text-[#14F195]" : "text-[#FF3366]"}`}>
                {boss.name}
              </Text>

              {/* HP bar + numbers */}
              <View style={{ gap: 6 }}>
                <Progress value={hpPercent} color={hpColor} className="h-5" />
                <View className="flex-row items-center justify-between">
                  <Text className="text-[10px] font-mono text-white/35 uppercase tracking-wider">HP</Text>
                  <Text className="text-[11px] font-mono" style={{ color: hpColor }}>
                    {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
                    {"  ·  "}{hpPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row gap-2">
                {[
                  { icon: <Users size={16} color={Colors.neonCyan} />, value: String(participantCount), label: "Hunters", color: Colors.neonCyan },
                  { icon: <Swords size={16} color={Colors.neonAmber} />, value: totalDamage.toLocaleString(), label: "Total DMG", color: Colors.neonAmber },
                  { icon: <Zap size={16} color={Colors.neonPurple} />, value: `${contributionPercent}%`, label: "Your Share", color: Colors.neonPurple },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      padding: INNER,
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {stat.icon}
                    <Text className="text-[15px] font-display" style={{ color: stat.color }}>{stat.value}</Text>
                    <Text className="text-[11px] text-white/45">{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Surge window indicator */}
            {surgeActive && (
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 8, borderRadius: 8, borderWidth: 1,
                borderColor: "rgba(255,184,0,0.4)", backgroundColor: "rgba(255,184,0,0.08)",
                paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <Zap size={14} color="#FFB800" />
                <Text style={{ color: "#FFB800", fontSize: 12, fontWeight: "800",
                  letterSpacing: 1, textTransform: "uppercase" }}>
                  Surge Active — 2× Contributions
                </Text>
                <Zap size={14} color="#FFB800" />
              </View>
            )}
            {!surgeActive && nextSurge && (() => {
              const diffSec = Math.max(0, Math.floor((nextSurge.startsAt - Date.now()) / 1000));
              const h = Math.floor(diffSec / 3600);
              const m = Math.floor((diffSec % 3600) / 60);
              const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
              return (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  paddingHorizontal: 12, paddingVertical: 8,
                }}>
                  <Clock size={12} color="#4a7a9b" />
                  <Text style={{ color: "#4a7a9b", fontSize: 11, fontFamily: "monospace" }}>
                    Next surge in {label}
                  </Text>
                </View>
              );
            })()}

            {/* ═══ ZONE 2: Your Status — only when joined + not defeated ═══ */}
            {hasJoined && !isDefeated && (
              <>
                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: -PAD }} />

                {destabilized ? (
                  // Destabilized alert
                  <Animated.View style={[destabPulse, {
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,51,102,0.4)",
                    backgroundColor: "rgba(255,51,102,0.07)",
                    padding: INNER,
                    gap: 8,
                  }]}>
                    <View className="flex-row items-center gap-2">
                      <AlertTriangle size={13} color={Colors.neonRed} />
                      <Text className="font-display text-[13px] text-[#FF3366] uppercase tracking-wider flex-1">
                        Node Destabilized
                      </Text>
                      <Text className="text-[10px] font-mono text-white/30 uppercase">DMG Paused</Text>
                    </View>

                    <Text className="text-[12px] font-mono text-white/50 leading-[18px]">
                      Passive contribution paused. Auto-recovers in ~{monetizationCosts.freeRecoveryMinutes}m.
                    </Text>

                    {!reconnectUsed ? (
                      <Button
                        variant="destructive"
                        size="md"
                        onPress={handleReconnect}
                        disabled={reconnecting || !onReconnect}
                        className="w-full"
                      >
                        <View className="flex-row items-center gap-2">
                          {reconnecting
                            ? <ActivityIndicator size="small" color={Colors.neonRed} />
                            : <Zap size={14} color={Colors.neonRed} />}
                          <Text className="font-display text-sm text-[#FF3366]">
                            Reconnect Now  ·  {monetizationCosts.reconnect} SKR
                          </Text>
                        </View>
                      </Button>
                    ) : (
                      <View className="flex-row items-center gap-1.5 py-0.5">
                        <CheckCircle2 size={12} color="rgba(255,255,255,0.3)" />
                        <Text className="text-[11px] font-mono text-white/30">
                          Reconnect used · auto-recovery active
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                ) : (
                  // Stable row
                  <View className="flex-row items-center gap-2 px-0.5">
                    <View className="w-2 h-2 rounded-full bg-[#14F195]" />
                    <Text className="text-xs font-mono text-white/50">Node Stable · Hunting</Text>
                  </View>
                )}
              </>
            )}

            {/* ═══ ZONE 3: Primary Action ═══ */}
            {!isDefeated && (
              <>
                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: -PAD }} />

                {!hasJoined ? (
                  // Pre-join: briefing + join button
                  <View style={{ gap: 10 }}>
                    <View style={{ gap: 5 }}>
                      {[
                        "Join to start passive contribution.",
                        "Fire OVERLOAD once for a burst damage spike.",
                        "If destabilized, passive damage pauses until recovery.",
                        `Auto-recover in ~${monetizationCosts.freeRecoveryMinutes}m, or pay ${monetizationCosts.reconnect} SKR for instant reconnect.`,
                      ].map((line, i) => (
                        <View key={i} style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }}>
                          <Text className="text-[11px] font-mono text-white/25 mt-px">{i + 1}.</Text>
                          <Text className="text-[11px] font-mono text-white/45 flex-1 leading-[17px]">{line}</Text>
                        </View>
                      ))}
                    </View>
                    <Button
                      variant="destructive"
                      size="lg"
                      onPress={handleJoin}
                      disabled={joining || !onJoin}
                      className="w-full"
                    >
                      <View className="flex-row items-center gap-2">
                        {joining
                          ? <ActivityIndicator size="small" color={Colors.neonRed} />
                          : <Swords size={18} color={Colors.neonRed} />}
                        <Text className="font-display text-base text-[#FF3366]">Join the Hunt</Text>
                      </View>
                    </Button>
                  </View>

                ) : (
                  // Joined: amp row always visible, overload button or badge below
                  <View style={{ gap: 8 }}>

                    {/* Overload Amplifier — always available when joined */}
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: overloadAmplifierUsed ? "rgba(153,69,255,0.4)" : "rgba(255,255,255,0.08)",
                      backgroundColor: overloadAmplifierUsed ? "rgba(153,69,255,0.08)" : "rgba(255,255,255,0.02)",
                      paddingHorizontal: INNER,
                      paddingVertical: 9,
                      gap: 10,
                    }}>
                      <Zap size={14} color={overloadAmplifierUsed ? Colors.neonPurple : "rgba(255,255,255,0.22)"} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text className={`text-[13px] font-display ${overloadAmplifierUsed ? "text-[#9945ff]" : "text-white/50"}`}>
                          Overload Amplifier
                        </Text>
                        <Text className="text-[10px] font-mono text-white/40">
                          {overloadUsed
                            ? "+10% passive contribution"
                            : "+10% to OVERLOAD burst damage"}
                        </Text>
                      </View>
                      {overloadAmplifierUsed ? (
                        <View className="flex-row items-center gap-1.5">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#9945ff]" />
                          <Text className="text-[10px] font-mono text-[#9945ff] uppercase tracking-wider">Armed</Text>
                        </View>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={handleBuyAmp}
                          disabled={buyingAmp || !onBuyOverloadAmplifier}
                          style={{
                            borderWidth: 1,
                            borderColor: "rgba(153,69,255,0.4)",
                            backgroundColor: "rgba(153,69,255,0.12)",
                          }}
                        >
                          {buyingAmp
                            ? <ActivityIndicator size="small" color={Colors.neonPurple} />
                            : <Text className="font-display text-xs text-[#9945ff]">
                                {monetizationCosts.overloadAmplifier} SKR
                              </Text>}
                        </Button>
                      )}
                    </View>

                    {/* OVERLOAD button or spent badge */}
                    {overloadUsed ? (
                      <View className="flex-row items-center justify-center gap-1.5 py-1">
                        <Zap size={12} color="rgba(153,69,255,0.4)" />
                        <Text className="text-[11px] font-mono text-[#9945ff]/40 uppercase tracking-widest">
                          Overloaded
                        </Text>
                      </View>
                    ) : (
                      <Animated.View style={overloadGlow}>
                        <Button
                          variant="ghost"
                          size="lg"
                          onPress={handleOverload}
                          disabled={overloading || !onOverload}
                          className="w-full"
                          style={{
                            backgroundColor: "rgba(153,69,255,0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(153,69,255,0.5)",
                          }}
                        >
                          <View className="flex-row items-center gap-2">
                            {overloading
                              ? <ActivityIndicator size="small" color={Colors.neonPurple} />
                              : <Zap size={18} color={Colors.neonPurple} />}
                            <Text className="font-display text-base text-[#9945ff]">OVERLOAD BURST</Text>
                            {overloadAmplifierUsed && (
                              <View style={{
                                backgroundColor: "rgba(153,69,255,0.3)",
                                borderWidth: 1,
                                borderColor: "rgba(153,69,255,0.5)",
                                borderRadius: 4,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                              }}>
                                <Text className="text-[9px] font-mono text-[#9945ff]">+10%</Text>
                              </View>
                            )}
                          </View>
                        </Button>
                      </Animated.View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* ═══ Defeated state ═══ */}
            {isDefeated && (
              <>
                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: -PAD }} />
                <View className="items-center gap-2.5 pt-1">
                  <Text className="font-display text-base text-[#14F195] uppercase tracking-[3px]">Defeated</Text>
                  <Text className="text-sm text-white/40 text-center leading-5">
                    The Leviathan has been destroyed. Check rewards in your collection.
                  </Text>
                  {onRefresh && (
                    <Button variant="outline" size="sm" onPress={onRefresh}>
                      Refresh
                    </Button>
                  )}
                </View>
              </>
            )}

          </View>
        </View>
      </BlurView>
    </View>
  );
}
