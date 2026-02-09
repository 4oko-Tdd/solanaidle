import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Character, ClassId } from "@solanaidle/shared";
import { Shield, Star, Heart, Zap, ShieldHalf, Sparkles } from "lucide-react";

interface Props {
  character: Character;
  classId?: ClassId | null;
  livesRemaining?: number;
}

const CLASS_DISPLAY: Record<ClassId, { icon: React.ReactNode; name: string }> = {
  scout: { icon: <Zap className="h-4 w-4 text-neon-amber" />, name: "Scout" },
  guardian: { icon: <ShieldHalf className="h-4 w-4 text-neon-cyan" />, name: "Guardian" },
  mystic: { icon: <Sparkles className="h-4 w-4 text-neon-purple" />, name: "Mystic" },
};

export function CharacterCard({ character, classId, livesRemaining }: Props) {
  const xpForNextLevel = character.level * 100;
  const xpPercent = Math.round((character.xp / xpForNextLevel) * 100);

  const stateBadge = {
    idle: { label: "Idle", variant: "secondary" as const },
    on_mission: { label: "On Mission", variant: "default" as const },
    dead: { label: "Dead", variant: "destructive" as const },
  }[character.state];

  const cls = classId ? CLASS_DISPLAY[classId] : null;

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            {cls && cls.icon}
            <span>{cls ? cls.name : "Character"}</span>
          </CardTitle>
          <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-neon-amber" />
            <span className="font-display">Level {character.level}</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {character.xp} / {xpForNextLevel} XP
          </span>
        </div>
        <Progress value={xpPercent} className="h-2" />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-neon-red" />
            <span>{livesRemaining != null ? `${livesRemaining} Lives` : `${character.hp} HP`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-neon-cyan" />
            <span className="font-mono">Gear Lv.{character.gearLevel}</span>
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
