import { Badge } from "@/components/ui/badge";
import { Zap, ShieldHalf, Sparkles, Heart, HeartCrack } from "lucide-react";
import type { WeeklyRun, ClassId, CharacterState } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
  characterState?: CharacterState;
}

const CLASS_CONFIG: Record<ClassId, { icon: React.ReactNode; name: string }> = {
  scout: { icon: <Zap className="h-4 w-4 text-yellow-500" />, name: "Scout" },
  guardian: { icon: <ShieldHalf className="h-4 w-4 text-blue-500" />, name: "Guardian" },
  mystic: { icon: <Sparkles className="h-4 w-4 text-purple-500" />, name: "Mystic" },
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 604800000) + 1);
}

function getRunStatusBadge(run: WeeklyRun, characterState?: CharacterState) {
  if (!run.active) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">RUN OVER</Badge>;
  }
  if (characterState === "dead") {
    return <Badge variant="destructive" className="animate-pulse">DEAD</Badge>;
  }
  return <Badge className="bg-green-600 text-white">ALIVE</Badge>;
}

export function RunStatus({ run, characterState }: Props) {
  const cls = CLASS_CONFIG[run.classId];
  const weekNum = getWeekNumber(run.weekStart);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      {/* Top row: Week + Class + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Week {weekNum} Run</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {cls.icon}
            {cls.name}
          </span>
        </div>
        {getRunStatusBadge(run, characterState)}
      </div>

      {/* Bottom row: Lives + Score + Missions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < run.livesRemaining ? (
              <Heart key={i} className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <HeartCrack key={i} className="h-4 w-4 text-muted-foreground/40" />
            )
          )}
          {run.livesRemaining === 1 && (
            <span className="ml-1 text-xs font-bold text-red-500">LAST LIFE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Score: <span className="font-bold text-foreground">{run.score}</span></span>
          <span className="text-muted-foreground">Missions: <span className="font-bold text-foreground">{run.missionsCompleted}</span></span>
        </div>
      </div>

      {/* Stakes text */}
      {run.livesRemaining === 1 && run.active && characterState !== "dead" && (
        <div className="rounded bg-red-500/10 border border-red-500/30 px-2 py-1 text-center">
          <span className="text-xs font-bold text-red-500">FAILURE MEANS DEATH. 1 LIFE REMAINING.</span>
        </div>
      )}
      {run.livesRemaining === 2 && run.active && (
        <div className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-center">
          <span className="text-xs font-medium text-amber-500">Careful. 2 lives remaining.</span>
        </div>
      )}
    </div>
  );
}
