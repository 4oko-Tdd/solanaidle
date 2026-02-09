import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId } from "@solanaidle/shared";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId) => void;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

export function MissionPanel({ missions, characterState, onStart }: Props) {
  const canStart = characterState === "idle";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Missions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{mission.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(mission.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {mission.failRate}% risk
                </span>
              </div>
            </div>
            <Button
              size="sm"
              disabled={!canStart}
              onClick={() => onStart(mission.id)}
            >
              Start
            </Button>
          </div>
        ))}
        {!canStart && (
          <p className="text-xs text-muted-foreground text-center">
            {characterState === "on_mission"
              ? "Character is on a mission"
              : "Character is recovering"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
