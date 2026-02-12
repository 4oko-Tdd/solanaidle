import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Swords, Clock, Users, Loader2, Trophy } from "lucide-react";
import type { RaidMission, ActiveRaid } from "@solanaidle/shared";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function RaidPanel() {
  const [raids, setRaids] = useState<RaidMission[]>([]);
  const [activeRaid, setActiveRaid] = useState<ActiveRaid | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [available, active] = await Promise.all([
        api<RaidMission[]>("/raids"),
        api<ActiveRaid | null>("/raids/active"),
      ]);
      setRaids(available);
      setActiveRaid(active);
    } catch {
      // Not in a guild or error
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer for active raid
  useEffect(() => {
    if (!activeRaid || !activeRaid.timeRemaining || activeRaid.timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setActiveRaid((prev) => {
        if (!prev || !prev.timeRemaining) return prev;
        const remaining = Math.max(0, prev.timeRemaining - 1);
        return { ...prev, timeRemaining: remaining };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRaid?.id]);

  const handleStart = async (raidId: string) => {
    setLoading(true);
    try {
      await api("/raids/start", {
        method: "POST",
        body: JSON.stringify({ raidId }),
      });
      await fetchData();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      await api("/raids/commit", { method: "POST" });
      await fetchData();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setLoading(true);
    try {
      await api("/raids/claim", { method: "POST" });
      await fetchData();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  if (raids.length === 0 && !activeRaid) return null;

  return (
    <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <Swords className="h-5 w-5 text-neon-amber" />
        <h3 className="text-base font-display font-semibold text-white">Raids</h3>
      </div>
      <p className="text-[11px] text-[#4a7a9b] leading-relaxed">
        Co-op missions for your guild. Start a raid and wait for members to join before time runs out.
      </p>

      {activeRaid ? (
        <div className="rounded-lg border border-neon-amber/30 bg-neon-amber/[0.05] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm font-display text-white">
              {raids.find((r) => r.id === activeRaid.raidId)?.name || activeRaid.raidId}
            </span>
            <Badge className={`text-[10px] py-0 px-2 ${
              activeRaid.timeRemaining && activeRaid.timeRemaining > 0
                ? "bg-[#1a3a5c]/40 text-[#4a7a9b] border-[#1a3a5c]/60"
                : "bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30"
            }`}>
              {activeRaid.timeRemaining && activeRaid.timeRemaining > 0
                ? <span className="font-mono">{formatTime(activeRaid.timeRemaining)}</span>
                : "Complete!"}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#4a7a9b]">
            <Users className="h-3 w-3" />
            <span className="font-mono">
              {activeRaid.committedPlayers.length} committed
            </span>
          </div>

          {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
            <Button
              size="sm"
              className="w-full text-xs bg-neon-amber/20 text-neon-amber border border-neon-amber/40 hover:bg-neon-amber/30"
              onClick={handleCommit}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Swords className="h-3 w-3 mr-1.5" />}
              Join Raid
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/40 hover:bg-[#14F195]/30"
              onClick={handleClaim}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Trophy className="h-3 w-3 mr-1.5" />}
              Claim Rewards
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {raids.map((raid) => (
            <div
              key={raid.id}
              className="rounded-lg border border-[#1a3a5c]/40 bg-[#0d1f35]/60 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm font-display text-white">{raid.name}</span>
                <Badge className="text-[10px] py-0 px-2 bg-neon-amber/15 text-neon-amber border-neon-amber/30">
                  {raid.lootMultiplier}x loot
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#4a7a9b]">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-mono">{raid.requiredPlayers}p</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">{formatTime(raid.duration)}</span>
                </span>
              </div>
              <p className="text-[10px] text-[#4a7a9b]/70">{raid.description}</p>
              <Button
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => handleStart(raid.id)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Start Raid
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
