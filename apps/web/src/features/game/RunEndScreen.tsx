import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  Skull,
  Loader2,
  Zap,
  ShieldHalf,
  Sparkles,
} from "lucide-react";
import type { WeeklyRun, RunEvent, ClassId } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
  signMessage: (msg: string) => Promise<string | null>;
  onFinalized: () => void;
}

const CLASS_ICONS: Record<ClassId, React.ReactNode> = {
  scout: <Zap className="h-8 w-8 text-neon-amber" />,
  guardian: <ShieldHalf className="h-8 w-8 text-neon-cyan" />,
  mystic: <Sparkles className="h-8 w-8 text-neon-purple" />,
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

export function RunEndScreen({ run, signMessage, onFinalized }: Props) {
  const [signing, setSigning] = useState(false);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const weekNum = getWeekNumber(run.weekStart);

  useEffect(() => {
    api<RunEvent[]>(`/runs/${run.id}/events`)
      .then(setEvents)
      .catch(() => {});
  }, [run.id]);

  const deaths = events.filter((e) => e.eventType === "mission_fail" && !(e.data as any).escaped).length;

  const handleFinalize = async () => {
    setSigning(true);
    try {
      const msg = `END_RUN:week${weekNum}:score:${run.score}:${Date.now()}`;
      let signature: string | null = null;
      try {
        signature = await signMessage(msg);
      } catch (e) {
        console.warn("[RunEndScreen] signMessage failed, using fallback:", e);
      }
      await api(`/runs/${run.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ signature: signature ?? "unsigned" }),
      });
      await onFinalized();
    } catch (e) {
      console.error("[RunEndScreen] finalize failed:", e);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <div className="text-center space-y-3">
        <Skull className="h-16 w-16 text-neon-red animate-glow-pulse mx-auto" />
        <h2 className="text-3xl font-display text-neon-red">Run Over</h2>
        <p className="text-sm text-muted-foreground">
          Week {weekNum} has ended. Seal your score on the leaderboard.
        </p>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-center gap-2">
          {CLASS_ICONS[run.classId]}
          <span className="font-bold text-lg font-display">
            {run.classId.charAt(0).toUpperCase() + run.classId.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="bg-white/[0.04] rounded-lg p-2">
            <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Final Score</div>
            <div className="font-bold text-lg font-mono text-neon-green">{run.score}</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Missions</div>
            <div className="font-bold text-lg font-mono text-neon-green">{run.missionsCompleted}</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Deaths</div>
            <div className="font-bold text-lg font-mono text-neon-red">{deaths}</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2">
            <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Boss</div>
            <div className="font-bold text-lg">
              {run.bossDefeated ? (
                <Badge className="bg-neon-amber/20 text-neon-amber">Defeated</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleFinalize} disabled={signing} className="w-full" size="lg">
        {signing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
        ) : (
          "Seal Your Fate"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground font-mono">
        Sign with your wallet to finalize this score on the leaderboard.
      </p>
    </div>
  );
}
