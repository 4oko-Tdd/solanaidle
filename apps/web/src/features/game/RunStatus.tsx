import { Badge } from "@/components/ui/badge";
import { Heart, HeartCrack } from "lucide-react";
import type { WeeklyRun, ClassId, CharacterState } from "@solanaidle/shared";
import { ClassIcon } from "@/components/ClassIcon";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

interface Props {
  run: WeeklyRun;
  characterState?: CharacterState;
}

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 604800000) + 1);
}

function getRunStatusBadge(run: WeeklyRun, characterState?: CharacterState) {
  if (!run.active) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">EPOCH OVER</Badge>;
  }
  if (characterState === "dead") {
    return <Badge variant="destructive" className="animate-pulse animate-glow-pulse bg-neon-red/20 text-neon-red">SLASHED</Badge>;
  }
  return <Badge className="bg-neon-green/20 text-neon-green">ONLINE</Badge>;
}

export function RunStatus({ run, characterState }: Props) {
  const weekNum = getWeekNumber(run.weekStart);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-3 space-y-2">
      {/* Top row: Week + Class + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-display">Epoch {weekNum}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ClassIcon classId={run.classId} className="h-4 w-4" />
            {CLASS_NAMES[run.classId]}
          </span>
        </div>
        {getRunStatusBadge(run, characterState)}
      </div>

      {/* Bottom row: Lives + Score + Missions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < run.livesRemaining ? (
              <Heart key={i} className="h-4 w-4 fill-neon-red text-neon-red" />
            ) : (
              <HeartCrack key={i} className="h-4 w-4 text-muted-foreground/40" />
            )
          )}
          {run.livesRemaining === 1 && (
            <span className="ml-1 text-xs font-bold text-neon-red">LAST LIFE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Score: <span className="font-mono font-bold text-neon-green">{run.score}</span></span>
          <span className="text-muted-foreground">Missions: <span className="font-mono font-bold text-neon-green">{run.missionsCompleted}</span></span>
          {run.streak >= 2 && (
            <span className="text-muted-foreground">
              Streak: <span className={`font-mono font-bold ${
                run.streak >= 6 ? "text-neon-amber" : run.streak >= 4 ? "text-neon-red" : "text-neon-green"
              }`}>
                {run.streak}x
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Stakes text */}
      {run.livesRemaining === 1 && run.active && characterState !== "dead" && (
        <div className="rounded bg-neon-red/10 border border-neon-red/30 px-2 py-1 text-center animate-pulse">
          <span className="text-xs font-bold text-neon-red">FAILURE MEANS SLASHING. 1 LIFE REMAINING.</span>
        </div>
      )}
      {run.livesRemaining === 2 && run.active && (
        <div className="rounded bg-neon-amber/10 border border-neon-amber/30 px-2 py-1 text-center">
          <span className="text-xs font-medium text-neon-amber">Careful. 2 lives remaining.</span>
        </div>
      )}
    </div>
  );
}
