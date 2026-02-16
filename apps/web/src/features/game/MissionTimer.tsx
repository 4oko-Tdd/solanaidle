import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { ActiveMission, MissionType } from "@solanaidle/shared";

interface Props {
  activeMission: ActiveMission;
  missionDef: MissionType | undefined;
  onClaim: () => void;
  onSkip?: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function MissionTimer({
  activeMission,
  missionDef,
  onClaim,
  onSkip,
}: Props) {
  const [skipping, setSkipping] = useState(false);
  const remaining = activeMission.timeRemaining ?? 0;
  const isComplete = remaining <= 0;
  const totalDuration = missionDef?.duration ?? 1;
  const elapsed = totalDuration - remaining;
  const progressPercent = Math.min(
    100,
    Math.round((elapsed / totalDuration) * 100),
  );
  const isUrgent = !isComplete && progressPercent >= 90;

  const handleSkipTimer = async () => {
    setSkipping(true);
    try {
      await api("/dev/skip-timer", { method: "POST" });
      onSkip?.();
    } catch {
      // ignore errors in dev tool
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className={`rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3 transition-all duration-300 ${
      isComplete
        ? "border-neon-green/50 glow-green animate-glow-pulse"
        : isUrgent
        ? "border-neon-amber/40 glow-purple"
        : ""
    }`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-display font-semibold text-white">
          {missionDef?.name ?? "Transaction"} in Progress
        </h3>
          {isComplete && (
            <span className="text-xs font-medium text-neon-green font-mono uppercase tracking-wider animate-bounce-in">
              Complete!
            </span>
          )}
          {isUrgent && !isComplete && (
            <span className="text-xs font-medium text-neon-amber font-mono uppercase tracking-wider animate-urgency">
              Almost...
            </span>
          )}
      </div>
      <div className={isUrgent ? "animate-glow-pulse rounded-full" : ""}>
        <Progress value={progressPercent} className={`h-2.5 transition-all duration-500 ${isComplete ? "h-3" : ""}`} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className={`text-muted-foreground ${isUrgent ? "animate-urgency font-bold text-neon-amber" : ""}`}>
          {isComplete ? (
            <span className="text-neon-green font-bold animate-bounce-in">Ready to claim!</span>
          ) : (
            <span className="font-mono">{formatTime(remaining)}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && !isComplete && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSkipTimer}
              disabled={skipping}
              className="text-xs text-neon-amber border-neon-amber/50 hover:bg-neon-amber/10"
            >
              {skipping ? "Skipping..." : "Skip (Dev)"}
            </Button>
          )}
          <Button
            size="sm"
            disabled={!isComplete}
            onClick={onClaim}
            className={isComplete ? "btn-shimmer" : ""}
          >
            {isComplete ? "Claim Reward" : "In Progress..."}
          </Button>
        </div>
      </div>
    </div>
  );
}
