import { useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { Swords, Clock, Users, Trophy, ShieldCheck, Lock } from "lucide-react-native";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import type { RaidMission, ActiveRaid } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  raids: RaidMission[];
  activeRaid: ActiveRaid | null;
  loading: boolean;
  memberCount?: number;
  startRaid: (raidId: string) => Promise<void>;
  commitRaid: () => Promise<void>;
  claimRaid: () => Promise<void>;
  raidLicenseActive?: boolean;
  raidLicenseCost?: number;
  onBuyRaidLicense?: () => Promise<void>;
  onBack?: () => void;
}

export function RaidPanel({
  raids,
  activeRaid,
  loading,
  memberCount = 0,
  startRaid,
  claimRaid,
  raidLicenseActive = false,
  raidLicenseCost = 35,
  onBuyRaidLicense,
  onBack,
}: Props) {
  const [buyingLicense, setBuyingLicense] = useState(false);

  const handleBuyLicense = async () => {
    if (!onBuyRaidLicense) return;
    setBuyingLicense(true);
    try { await onBuyRaidLicense(); }
    finally { setBuyingLicense(false); }
  };

  const handleStartRaid = async (raidId: string) => {
    try {
      await startRaid(raidId);
    } catch (e: any) {
      Alert.alert("Raid Failed", e?.message ?? "Could not start raid. Try again.");
    }
  };

  const handleClaimRaid = async () => {
    try {
      await claimRaid();
    } catch (e: any) {
      Alert.alert("Claim Failed", e?.message ?? "Could not claim rewards. Try again.");
    }
  };

  const licenseRow = (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: raidLicenseActive ? "rgba(20,241,149,0.35)" : "rgba(255,255,255,0.08)",
      backgroundColor: raidLicenseActive ? "rgba(20,241,149,0.06)" : "rgba(255,255,255,0.02)",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    }}>
      <ShieldCheck size={16} color={raidLicenseActive ? "#14F195" : "rgba(255,255,255,0.22)"} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text className={`text-[13px] font-display ${raidLicenseActive ? "text-[#14F195]" : "text-white/50"}`}>
          Raid License
        </Text>
        <Text className="text-[10px] font-mono text-white/40">
          +5% contribution efficiency this epoch
        </Text>
      </View>
      {raidLicenseActive ? (
        <View className="flex-row items-center gap-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-[#14F195]" />
          <Text className="text-[10px] font-mono text-[#14F195] uppercase tracking-wider">Active</Text>
        </View>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onPress={handleBuyLicense}
          disabled={buyingLicense || !onBuyRaidLicense}
          style={{
            borderWidth: 1,
            borderColor: "rgba(20,241,149,0.35)",
            backgroundColor: "rgba(20,241,149,0.08)",
          }}
        >
          {buyingLicense
            ? <ActivityIndicator size="small" color="#14F195" />
            : <Text className="font-display text-xs text-[#14F195]">{raidLicenseCost} SKR</Text>}
        </Button>
      )}
    </View>
  );

  if (raids.length === 0 && !activeRaid) {
    return (
      <GlassPanel contentStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
        {licenseRow}
        <View className="w-20 h-20 rounded-full bg-neon-amber/5 border border-neon-amber/10 items-center justify-center">
          <Swords size={36} color="#4a7a9b" />
        </View>
        <Text className="text-lg font-sans-bold text-[#4a7a9b]">No raids yet</Text>
        <Text className="text-base text-[#4a7a9b] text-center leading-relaxed max-w-[280px]">
          Gather your guild members and launch a co-op raid for boosted loot.
        </Text>
        {onBack && (
          <Button variant="outline" size="lg" onPress={onBack} className="w-full">
            Back to Guild
          </Button>
        )}
      </GlassPanel>
    );
  }

  return (
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <View className="flex-row items-center gap-2.5">
        <Swords size={24} color="#FFB800" />
        <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Raids</GradientText>
      </View>
      <Text className="text-base text-[#4a7a9b] leading-relaxed">
        Co-op missions for your guild. Start a raid to deploy all members automatically.
      </Text>

      {licenseRow}

      {activeRaid ? (
        <View className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/[0.05] p-4 gap-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-base text-white">
              {raids.find((r) => r.id === activeRaid.raidId)?.name ?? activeRaid.raidId}
            </Text>
            {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
              <Badge variant="default">{formatTime(activeRaid.timeRemaining)}</Badge>
            ) : (
              <Badge variant="green">Complete!</Badge>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            <Users size={16} color="#4a7a9b" />
            <Text className="text-sm text-[#4a7a9b] font-mono">
              {activeRaid.committedPlayers.length} deployed
            </Text>
          </View>

          {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
            <View className="rounded-md bg-[#0d1f35] border border-[#1a3a5c]/40 px-4 py-3 items-center">
              <Text className="text-sm text-[#4a7a9b] font-mono">Raid in progress — stand by</Text>
            </View>
          ) : (
            <Button
              size="md"
              onPress={handleClaimRaid}
              disabled={loading}
              className="w-full bg-[#14F195]/20 border border-[#14F195]/40"
            >
              <View className="flex-row items-center gap-2">
                {loading ? (
                  <ActivityIndicator size="small" color="#14F195" />
                ) : (
                  <Trophy size={16} color="#14F195" />
                )}
                <Text className="text-base font-mono text-neon-green">Claim Rewards</Text>
              </View>
            </Button>
          )}
        </View>
      ) : (
        <View className="gap-3">
          {raids.map((raid) => {
            const locked = memberCount < raid.requiredPlayers;
            const needed = raid.requiredPlayers - memberCount;
            return (
              <View
                key={raid.id}
                className="rounded-lg border border-[#1a3a5c]/40 bg-white/[0.02] p-4 gap-3"
                style={locked ? { opacity: 0.6 } : undefined}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    {locked && <Lock size={14} color="#4a7a9b" />}
                    <Text className="font-sans-bold text-base text-white">{raid.name}</Text>
                  </View>
                  <Badge variant="amber">{`${raid.lootMultiplier}x loot`}</Badge>
                </View>
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1.5">
                    <Users size={16} color="#4a7a9b" />
                    <Text className="text-sm text-[#4a7a9b] font-mono">{raid.requiredPlayers}p</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={16} color="#4a7a9b" />
                    <Text className="text-sm text-[#4a7a9b] font-mono">
                      {formatTime(raid.duration)}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">{raid.description}</Text>
                {locked ? (
                  <View className="rounded-md bg-white/[0.02] border border-[#1a3a5c]/30 px-4 py-3 items-center">
                    <Text className="text-sm text-[#4a7a9b] font-mono">
                      Need {needed} more {needed === 1 ? "member" : "members"}
                    </Text>
                  </View>
                ) : (
                  <Button
                    size="lg"
                    variant="gradient"
                    onPress={() => handleStartRaid(raid.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    <View className="flex-row items-center gap-2">
                      {loading && <ActivityIndicator size="small" color="#ffffff" />}
                      <Text className="text-base font-mono text-white">Start Raid</Text>
                    </View>
                  </Button>
                )}
              </View>
            );
          })}
        </View>
      )}
    </GlassPanel>
  );
}
