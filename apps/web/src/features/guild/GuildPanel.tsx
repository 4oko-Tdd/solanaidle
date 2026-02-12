import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { CreateGuildDialog } from "./CreateGuildDialog";
import { JoinGuildDialog } from "./JoinGuildDialog";
import { Users, Copy, Check, LogOut, Shield, Zap, Gift } from "lucide-react";
import type { Guild, GuildMember } from "@solanaidle/shared";

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export function GuildPanel() {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGuild = useCallback(async () => {
    try {
      const data = await api<{ guild: Guild | null; members: GuildMember[] }>("/guilds/mine");
      setGuild(data.guild);
      setMembers(data.members);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuild();
  }, [fetchGuild]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await api("/guilds/leave", { method: "POST" });
      setGuild(null);
      setMembers([]);
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!guild) return;
    await navigator.clipboard.writeText(guild.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return null;
  }

  if (!guild) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Users className="h-6 w-6 text-[#9945FF]" />
            <h3 className="text-lg font-display font-semibold text-white">Guild</h3>
          </div>
          <p className="text-xs text-[#4a7a9b] leading-relaxed">
            Team up with other validators. Create or join a guild to unlock co-op raids with boosted loot.
          </p>
        </div>

        {/* Empty state */}
        <div className="rounded-xl border border-dashed border-[#1a3a5c]/60 bg-[#0a1628]/40 p-8 text-center space-y-4">
          <Users className="h-10 w-10 text-[#4a7a9b]/40 mx-auto" />
          <p className="text-sm font-medium text-[#4a7a9b]">No guild yet</p>
          <p className="text-xs text-[#4a7a9b]/70 max-w-[260px] mx-auto leading-relaxed">
            Create your own guild or join an existing one with an invite code.
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <CreateGuildDialog onCreated={fetchGuild} />
            <JoinGuildDialog onJoined={fetchGuild} />
          </div>
        </div>

        {/* Guild perks */}
        <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
          <h4 className="text-sm font-display font-semibold text-white">Guild Perks</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-[#14F195] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Co-op Raids</p>
                <p className="text-[10px] text-[#4a7a9b]">Team up for Pool Raids (2p) and Protocol Sieges (3p) with massive loot multipliers.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Zap className="h-4 w-4 text-neon-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Boosted Rewards</p>
                <p className="text-[10px] text-[#4a7a9b]">Raids give 2-3x loot multiplier plus guaranteed Tokens on higher tiers.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Gift className="h-4 w-4 text-[#9945FF] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Invite Friends</p>
                <p className="text-[10px] text-[#4a7a9b]">Share your guild invite code. Up to 5 members per guild.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Guild info */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#9945FF]" />
            <h3 className="text-base font-display font-semibold text-white">{guild.name}</h3>
          </div>
          <Badge className="text-[10px] py-0 px-2 bg-[#9945FF]/15 text-[#c4a0ff] border-[#9945FF]/30">
            {guild.memberCount}/5
          </Badge>
        </div>

        {/* Invite code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-[#0d1f35] border border-[#1a3a5c]/40 px-3 py-2">
            <span className="text-[10px] text-[#4a7a9b] uppercase tracking-wider">Invite</span>
            <code className="font-mono text-sm text-white tracking-wider flex-1">{guild.inviteCode}</code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-[#4a7a9b] hover:text-white"
            onClick={handleCopyCode}
          >
            {copied ? <Check className="h-4 w-4 text-[#14F195]" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Members */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-[#4a7a9b] uppercase tracking-wider font-mono">Members</span>
          <div className="rounded-lg border border-[#1a3a5c]/30 overflow-hidden">
            {members.map((m, i) => (
              <div
                key={m.walletAddress}
                className={`flex items-center gap-2 px-3 py-2 ${
                  i !== members.length - 1 ? "border-b border-[#1a3a5c]/20" : ""
                }`}
              >
                <div className="h-2 w-2 rounded-full bg-[#14F195]" />
                <span className="font-mono text-xs text-[#7ab8d9]">
                  {truncateWallet(m.walletAddress)}
                </span>
              </div>
            ))}
            {guild.memberCount < 5 && (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1a3a5c]/20">
                <div className="h-2 w-2 rounded-full border border-[#1a3a5c]/40" />
                <span className="text-xs text-[#4a7a9b]/50 italic">
                  {5 - guild.memberCount} {5 - guild.memberCount === 1 ? "slot" : "slots"} open
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Leave */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-neon-red/70 hover:text-neon-red hover:bg-neon-red/10"
          onClick={handleLeave}
          disabled={leaving}
        >
          <LogOut className="h-3 w-3 mr-1.5" />
          {leaving ? "Leaving..." : "Leave Guild"}
        </Button>
      </div>
    </div>
  );
}
