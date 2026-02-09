import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Character, ClassId } from "@solanaidle/shared";
import { Shield, Star, Heart } from "lucide-react";

interface Props {
  character: Character;
  classId?: ClassId | null;
  livesRemaining?: number;
}

const CLASS_DISPLAY: Record<string, { icon: string; name: string }> = {
  scout: { icon: "\u26A1", name: "Scout" },
  guardian: { icon: "\uD83D\uDEE1\uFE0F", name: "Guardian" },
  mystic: { icon: "\uD83D\uDD2E", name: "Mystic" },
};

export function CharacterCard({ character, classId, livesRemaining }: Props) {
  const xpForNextLevel = character.level * 100;
  const xpPercent = Math.round((character.xp / xpForNextLevel) * 100);

  const stateBadge = {
    idle: { label: "Idle", variant: "secondary" as const },
    on_mission: { label: "On Mission", variant: "default" as const },
    dead: { label: "Dead", variant: "destructive" as const },
  }[character.state];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            {classId && CLASS_DISPLAY[classId] && (
              <span>{CLASS_DISPLAY[classId].icon}</span>
            )}
            <span>{classId && CLASS_DISPLAY[classId] ? CLASS_DISPLAY[classId].name : "Character"}</span>
          </CardTitle>
          <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>Level {character.level}</span>
          </div>
          <span className="text-muted-foreground">
            {character.xp} / {xpForNextLevel} XP
          </span>
        </div>
        <Progress value={xpPercent} className="h-2" />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span>{livesRemaining != null ? `${livesRemaining} Lives` : `${character.hp} HP`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Gear Lv.{character.gearLevel}</span>
          </div>
        </div>
        {character.state === "dead" && character.reviveAt && (
          <p className="text-xs text-destructive">
            Revives at {new Date(character.reviveAt).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
