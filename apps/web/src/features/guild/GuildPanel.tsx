import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { CreateGuildDialog } from "./CreateGuildDialog";
import { JoinGuildDialog } from "./JoinGuildDialog";
import type { Guild, GuildMember } from "@solanaidle/shared";

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export function GuildPanel() {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchGuild = useCallback(async () => {
    try {
      const data = await api<{ guild: Guild | null; members: GuildMember[] }>("/guilds/mine");
      setGuild(data.guild);
      setMembers(data.members);
    } catch {
      // ignore
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

  if (!guild) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Guild</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Join a guild to unlock raid missions and earn bonus rewards.
          </p>
          <div className="flex gap-2">
            <CreateGuildDialog onCreated={fetchGuild} />
            <JoinGuildDialog onJoined={fetchGuild} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{guild.name}</span>
          <Badge variant="outline">{guild.memberCount}/5</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-0.5 text-xs flex-1 font-mono">
            {guild.inviteCode}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopyCode}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Members</div>
          {members.map((m) => (
            <div key={m.walletAddress} className="text-sm font-mono">
              {truncateWallet(m.walletAddress)}
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive"
          onClick={handleLeave}
          disabled={leaving}
        >
          {leaving ? "Leaving..." : "Leave Guild"}
        </Button>
      </CardContent>
    </Card>
  );
}
