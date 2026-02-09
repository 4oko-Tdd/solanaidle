import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldHalf, Sparkles, Heart, HeartCrack } from "lucide-react";
import type { WeeklyRun, ClassId } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun;
}

const CLASS_CONFIG: Record<ClassId, { icon: React.ReactNode; name: string }> = {
  scout: { icon: <Zap className="h-4 w-4 text-yellow-500" />, name: "Scout" },
  guardian: { icon: <ShieldHalf className="h-4 w-4 text-blue-500" />, name: "Guardian" },
  mystic: { icon: <Sparkles className="h-4 w-4 text-purple-500" />, name: "Mystic" },
};

export function RunStatus({ run }: Props) {
  const cls = CLASS_CONFIG[run.classId];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-1.5">
            {cls.icon}
            <span>{cls.name}</span>
          </span>
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 3 }, (_, i) =>
              i < run.livesRemaining ? (
                <Heart key={i} className="h-4 w-4 fill-red-500 text-red-500" />
              ) : (
                <HeartCrack key={i} className="h-4 w-4 text-muted-foreground/40" />
              )
            )}
          </span>
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
