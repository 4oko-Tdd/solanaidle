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
  scout: <Zap className="h-8 w-8 text-yellow-500" />,
  guardian: <ShieldHalf className="h-8 w-8 text-blue-500" />,
  mystic: <Sparkles className="h-8 w-8 text-purple-500" />,
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
      const signature = await signMessage(msg);
      await api(`/runs/${run.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ signature: signature ?? "dev-unsigned" }),
      });
      onFinalized();
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <div className="text-center space-y-3">
        <Skull className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Run Over</h2>
        <p className="text-sm text-muted-foreground">
          Week {weekNum} has ended. Seal your score on the leaderboard.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-center gap-2">
          {CLASS_ICONS[run.classId]}
          <span className="font-bold text-lg">
            {run.classId.charAt(0).toUpperCase() + run.classId.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Final Score</div>
            <div className="font-bold text-lg">{run.score}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Missions</div>
            <div className="font-bold text-lg">{run.missionsCompleted}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Deaths</div>
            <div className="font-bold text-lg text-red-500">{deaths}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="text-muted-foreground text-xs">Boss</div>
            <div className="font-bold text-lg">
              {run.bossDefeated ? (
                <Badge className="bg-yellow-500 text-black">Defeated</Badge>
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

      <p className="text-xs text-center text-muted-foreground">
        Sign with your wallet to finalize this score on the leaderboard.
      </p>
    </div>
  );
}
