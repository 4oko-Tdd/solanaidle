import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Raids</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeRaid ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                {raids.find((r) => r.id === activeRaid.raidId)?.name || activeRaid.raidId}
              </span>
              <Badge variant={activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? "outline" : "default"}>
                {activeRaid.timeRemaining && activeRaid.timeRemaining > 0
                  ? formatTime(activeRaid.timeRemaining)
                  : "Complete!"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Players committed: {activeRaid.committedPlayers.length}
            </div>
            {activeRaid.timeRemaining && activeRaid.timeRemaining > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleCommit}
                disabled={loading}
              >
                {loading ? "..." : "Join Raid"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={handleClaim}
                disabled={loading}
              >
                {loading ? "..." : "Claim Rewards"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {raids.map((raid) => (
              <div
                key={raid.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div>
                  <div className="font-medium text-sm">{raid.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {raid.requiredPlayers} players · {formatTime(raid.duration)} · {raid.lootMultiplier}x loot
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleStart(raid.id)}
                  disabled={loading}
                >
                  Start
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
