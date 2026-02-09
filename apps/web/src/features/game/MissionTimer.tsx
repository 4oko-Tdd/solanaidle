import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ActiveMission, MissionType } from "@solanaidle/shared";

interface Props {
  activeMission: ActiveMission;
  missionDef: MissionType | undefined;
  onClaim: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function MissionTimer({ activeMission, missionDef, onClaim }: Props) {
  const remaining = activeMission.timeRemaining ?? 0;
  const isComplete = remaining <= 0;
  const totalDuration = missionDef?.duration ?? 1;
  const elapsed = totalDuration - remaining;
  const progressPercent = Math.min(
    100,
    Math.round((elapsed / totalDuration) * 100),
  );

  return (
    <Card className={isComplete ? "border-green-500/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {missionDef?.name ?? "Mission"} in Progress
          </CardTitle>
          {isComplete && (
            <span className="text-xs font-medium text-green-500">
              Complete!
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isComplete ? "Ready to claim!" : formatTime(remaining)}
          </span>
          <Button size="sm" disabled={!isComplete} onClick={onClaim}>
            {isComplete ? "Claim Reward" : "In Progress..."}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
