import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Users, Copy, Check, LogOut, Shield, Zap, Gift } from "lucide-react-native";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import { useGuild } from "@/hooks/use-guild";
import { CreateGuildDialog } from "./create-guild-dialog";
import { JoinGuildDialog } from "./join-guild-dialog";
import * as Clipboard from "expo-clipboard";

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

interface Props {
  isAuthenticated: boolean;
  onViewRaid?: () => void;
}

export function GuildPanel({ isAuthenticated, onViewRaid }: Props) {
  const { guild, members, loading, createGuild, joinGuild, leaveGuild } =
    useGuild(isAuthenticated);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveGuild();
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!guild) return;
    await Clipboard.setStringAsync(guild.inviteCode);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  if (!guild) {
    return (
      <View className="gap-4">
        {/* Header */}
        <GlassPanel contentStyle={{ padding: 16, gap: 10 }}>
          <View className="flex-row items-center gap-2.5">
            <Users size={24} color="#9945FF" />
            <GradientText className="text-lg font-display" style={{ letterSpacing: 0.5 }}>Guild</GradientText>
          </View>
          <Text className="text-base text-[#4a7a9b] leading-relaxed">
            Team up with other validators. Create or join a guild to unlock co-op raids with boosted loot.
          </Text>
        </GlassPanel>

        {/* Empty state */}
        <GlassPanel contentStyle={{ padding: 20, alignItems: "center", gap: 14 }}>
          <View className="w-16 h-16 rounded-full bg-neon-purple/5 border border-neon-purple/10 items-center justify-center">
            <Users size={30} color="#4a7a9b" />
          </View>
          <Text className="text-lg font-sans-bold text-[#4a7a9b]">No guild yet</Text>
          <Text className="text-base text-[#4a7a9b] text-center leading-relaxed max-w-[280px]">
            Create your own guild or join an existing one with an invite code.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="gradient"
                size="lg"
                onPress={() => {
                  setShowJoin(false);
                  setShowCreate(true);
                }}
              >
                Create
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="outline"
                size="lg"
                onPress={() => {
                  setShowCreate(false);
                  setShowJoin(true);
                }}
              >
                Join
              </Button>
            </View>
          </View>
        </GlassPanel>

        <CreateGuildDialog
          show={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
          onCreate={createGuild}
        />
        <JoinGuildDialog
          show={showJoin}
          onClose={() => setShowJoin(false)}
          onJoined={() => setShowJoin(false)}
          onJoin={joinGuild}
        />

        {/* Guild perks */}
        <GlassPanel contentStyle={{ padding: 16, gap: 12 }}>
          <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>Guild Perks</Text>
          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              <View className="w-8 h-8 rounded-md bg-neon-green/10 border border-neon-green/20 items-center justify-center mt-0.5">
                <Shield size={16} color="#14F195" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Co-op Raids</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">
                  Team up for Pool Raids (2p) and Protocol Sieges (3p) with massive loot multipliers.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-8 h-8 rounded-md bg-neon-amber/10 border border-neon-amber/20 items-center justify-center mt-0.5">
                <Zap size={16} color="#FFB800" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Boosted Rewards</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">
                  Raids give 2-3x loot multiplier plus guaranteed Tokens on higher tiers.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-8 h-8 rounded-md bg-neon-purple/10 border border-neon-purple/20 items-center justify-center mt-0.5">
                <Gift size={16} color="#9945FF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-sans-bold text-white">Invite Friends</Text>
                <Text className="text-sm text-[#4a7a9b] leading-relaxed">
                  Share your guild invite code. Up to 5 members per guild.
                </Text>
              </View>
            </View>
          </View>
        </GlassPanel>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Guild info */}
      <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Users size={24} color="#9945FF" />
            <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>{guild.name}</Text>
          </View>
          <Badge variant="purple">{`${guild.memberCount}/5`}</Badge>
        </View>

        {/* Invite code */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2.5 rounded-lg bg-[#0d1f35] border border-[#1a3a5c]/40 px-4 py-3">
            <Text className="text-sm text-[#4a7a9b] uppercase tracking-wider">Invite</Text>
            <Text className="font-mono text-base text-white tracking-wider flex-1">
              {guild.inviteCode}
            </Text>
          </View>
          <Pressable
            onPress={handleCopyCode}
            className="h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]"
          >
            {copied ? (
              <Check size={18} color="#14F195" />
            ) : (
              <Copy size={18} color="#4a7a9b" />
            )}
          </Pressable>
        </View>

        {/* Members */}
        <View className="gap-2">
          <Text className="text-sm text-[#4a7a9b] uppercase tracking-wider font-mono">Members</Text>
          <View className="rounded-lg border border-[#1a3a5c]/30 overflow-hidden">
            {members.map((m, i) => (
              <View
                key={m.walletAddress}
                className={`flex-row items-center gap-2.5 px-4 py-3${
                  i !== members.length - 1 ? " border-b border-[#1a3a5c]/20" : ""
                }`}
              >
                <View className="h-2.5 w-2.5 rounded-full bg-[#14F195]" />
                <Text className="font-mono text-sm text-[#7ab8d9]">
                  {truncateWallet(m.walletAddress)}
                </Text>
              </View>
            ))}
            {guild.memberCount < 5 && (
              <View className="flex-row items-center gap-2.5 px-4 py-3 border-t border-[#1a3a5c]/20">
                <View className="h-2.5 w-2.5 rounded-full border border-[#1a3a5c]/40" />
                <Text className="text-sm text-[#4a7a9b] italic">
                  {5 - guild.memberCount}{" "}
                  {5 - guild.memberCount === 1 ? "slot" : "slots"} open
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* View Raids button */}
        {onViewRaid && (
          <Button variant="gradient" size="lg" onPress={onViewRaid} className="w-full">
            View Raids
          </Button>
        )}

        {/* Leave */}
        <Button
          variant="ghost"
          size="sm"
          onPress={handleLeave}
          disabled={leaving}
          className="w-full"
        >
          <View className="flex-row items-center gap-1.5">
            <LogOut size={14} color="#FF3366" />
            <Text className="text-sm font-mono text-neon-red">
              {leaving ? "Leaving..." : "Leave Guild"}
            </Text>
          </View>
        </Button>
      </GlassPanel>
    </View>
  );
}
