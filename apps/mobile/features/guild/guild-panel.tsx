import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Users, Copy, Check, LogOut, Shield, Zap, Gift } from "lucide-react-native";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
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
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  if (!guild) {
    return (
      <View className="gap-4">
        {/* Header */}
        <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4">
          <View className="flex-row items-center gap-2.5 mb-3">
            <Users size={24} color="#9945FF" />
            <Text className="text-lg font-bold text-white">Guild</Text>
          </View>
          <Text className="text-xs text-[#4a7a9b] leading-relaxed">
            Team up with other validators. Create or join a guild to unlock co-op raids with boosted loot.
          </Text>
        </View>

        {/* Empty state */}
        <View className="rounded-xl border border-[#1a3a5c]/60 border-dashed bg-[#0a1628]/40 p-8 items-center gap-4">
          <Users size={40} color="#4a7a9b" />
          <Text className="text-sm font-bold text-[#4a7a9b]">No guild yet</Text>
          <Text className="text-xs text-[#4a7a9b] text-center leading-relaxed max-w-[260px]">
            Create your own guild or join an existing one with an invite code.
          </Text>
          <View className="flex-row gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              onPress={() => {
                setShowJoin(false);
                setShowCreate((v) => !v);
              }}
              className="flex-1"
            >
              Create
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setShowCreate(false);
                setShowJoin((v) => !v);
              }}
              className="flex-1"
            >
              Join
            </Button>
          </View>
        </View>

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
        <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
          <Text className="text-sm font-bold text-white">Guild Perks</Text>
          <View className="gap-2">
            <View className="flex-row items-start gap-2.5">
              <Shield size={16} color="#14F195" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Co-op Raids</Text>
                <Text className="text-xs text-[#4a7a9b]">
                  Team up for Pool Raids (2p) and Protocol Sieges (3p) with massive loot multipliers.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2.5">
              <Zap size={16} color="#FFB800" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Boosted Rewards</Text>
                <Text className="text-xs text-[#4a7a9b]">
                  Raids give 2-3x loot multiplier plus guaranteed Tokens on higher tiers.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2.5">
              <Gift size={16} color="#9945FF" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-white">Invite Friends</Text>
                <Text className="text-xs text-[#4a7a9b]">
                  Share your guild invite code. Up to 5 members per guild.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Guild info */}
      <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Users size={20} color="#9945FF" />
            <Text className="text-base font-bold text-white">{guild.name}</Text>
          </View>
          <Badge variant="purple">{`${guild.memberCount}/5`}</Badge>
        </View>

        {/* Invite code */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-lg bg-[#0d1f35] border border-[#1a3a5c]/40 px-3 py-2">
            <Text className="text-xs text-[#4a7a9b] uppercase tracking-wider">Invite</Text>
            <Text className="font-mono text-sm text-white tracking-wider flex-1">
              {guild.inviteCode}
            </Text>
          </View>
          <Pressable
            onPress={handleCopyCode}
            className="h-9 w-9 items-center justify-center"
          >
            {copied ? (
              <Check size={16} color="#14F195" />
            ) : (
              <Copy size={16} color="#4a7a9b" />
            )}
          </Pressable>
        </View>

        {/* Members */}
        <View className="gap-1.5">
          <Text className="text-xs text-[#4a7a9b] uppercase tracking-wider font-mono">Members</Text>
          <View className="rounded-lg border border-[#1a3a5c]/30 overflow-hidden">
            {members.map((m, i) => (
              <View
                key={m.walletAddress}
                className={`flex-row items-center gap-2 px-3 py-2${
                  i !== members.length - 1 ? " border-b border-[#1a3a5c]/20" : ""
                }`}
              >
                <View className="h-2 w-2 rounded-full bg-[#14F195]" />
                <Text className="font-mono text-xs text-[#7ab8d9]">
                  {truncateWallet(m.walletAddress)}
                </Text>
              </View>
            ))}
            {guild.memberCount < 5 && (
              <View className="flex-row items-center gap-2 px-3 py-2 border-t border-[#1a3a5c]/20">
                <View className="h-2 w-2 rounded-full border border-[#1a3a5c]/40" />
                <Text className="text-xs text-[#4a7a9b] italic">
                  {5 - guild.memberCount}{" "}
                  {5 - guild.memberCount === 1 ? "slot" : "slots"} open
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* View Raids button */}
        {onViewRaid && (
          <Button variant="outline" size="sm" onPress={onViewRaid} className="w-full">
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
            <LogOut size={12} color="#ff4444" />
            <Text className="text-xs font-mono text-neon-red">
              {leaving ? "Leaving..." : "Leave Guild"}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  );
}
