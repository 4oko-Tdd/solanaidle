import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId, ClassId } from "@solanaidle/shared";
import { Clock, AlertTriangle, Lock } from "lucide-react";

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId) => void;
  characterLevel?: number;
  classId?: ClassId | null;
  durationModifier?: number;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

export function MissionPanel({ missions, characterState, onStart, characterLevel = 1, classId, durationModifier = 1 }: Props) {
  const canStart = characterState === "idle";

  const isTierLocked = (missionId: string): boolean => {
    if (missionId === "expedition" && characterLevel < 3) return true;
    if (missionId === "deep_dive" && characterLevel < 5) return true;
    if (missionId === "boss" && characterLevel < 5) return true;
    return false;
  };

  const getTierLabel = (missionId: string): string | null => {
    if (missionId === "expedition" && characterLevel < 3) return "Unlocks at Lv.3";
    if (missionId === "deep_dive" && characterLevel < 5) return "Unlocks at Lv.5";
    if (missionId === "boss" && characterLevel < 5) return "Unlocks at Lv.5";
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Missions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission) => {
          const locked = isTierLocked(mission.id);
          const lockLabel = getTierLabel(mission.id);
          const displayDuration = Math.floor(mission.duration * durationModifier);

          return (
            <div
              key={mission.id}
              className={`flex items-center justify-between rounded-lg border border-border p-3 ${locked ? "opacity-50" : ""}`}
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{mission.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(displayDuration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {mission.failRate}% risk
                  </span>
                </div>
                {lockLabel && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>{lockLabel}</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={!canStart || locked}
                onClick={() => onStart(mission.id)}
              >
                {locked ? "Locked" : "Start"}
              </Button>
            </div>
          );
        })}
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
