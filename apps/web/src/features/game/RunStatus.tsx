import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WeeklyRun, ClassId } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
}

const CLASS_ICONS: Record<ClassId, string> = {
  scout: "\u26A1",
  guardian: "\uD83D\uDEE1\uFE0F",
  mystic: "\uD83D\uDD2E",
};

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Scout",
  guardian: "Guardian",
  mystic: "Mystic",
};

export function RunStatus({ run }: Props) {
  const hearts = Array.from({ length: 3 }, (_, i) =>
    i < run.livesRemaining ? "\u2764\uFE0F" : "\uD83D\uDDA4"
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-1.5">
            <span>{CLASS_ICONS[run.classId]}</span>
            <span>{CLASS_NAMES[run.classId]}</span>
          </span>
          <span className="text-lg">{hearts.join("")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="text-muted-foreground">Score</div>
            <div className="font-bold">{run.score}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Missions</div>
            <div className="font-bold">{run.missionsCompleted}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Skill Pts</div>
            <div className="font-bold">{run.skillPoints}</div>
          </div>
        </div>
        {run.bossDefeated && (
          <Badge className="mt-2 w-full justify-center" variant="default">
            Boss Defeated!
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
