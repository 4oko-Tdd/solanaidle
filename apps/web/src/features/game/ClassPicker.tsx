import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CharacterClass, ClassId } from "@solanaidle/shared";

interface Props {
  classes: CharacterClass[];
  onSelect: (classId: ClassId) => Promise<void>;
}

const CLASS_ICONS: Record<ClassId, string> = {
  scout: "\u26A1",
  guardian: "\uD83D\uDEE1\uFE0F",
  mystic: "\uD83D\uDD2E",
};

export function ClassPicker({ classes, onSelect }: Props) {
  const [selecting, setSelecting] = useState<ClassId | null>(null);

  const handleSelect = async (classId: ClassId) => {
    setSelecting(classId);
    try {
      await onSelect(classId);
    } finally {
      setSelecting(null);
    }
  };

  const formatModifier = (value: number, isMultiplier: boolean) => {
    if (isMultiplier) {
      if (value === 1.0) return null;
      const pct = Math.round((value - 1) * 100);
      return pct > 0 ? `+${pct}%` : `${pct}%`;
    }
    // Additive (fail rate)
    if (value === 0) return null;
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">New Weekly Run</h2>
        <p className="text-sm text-muted-foreground">
          Choose your class for this week. Each class has unique strengths and
          weaknesses.
        </p>
      </div>

      <div className="space-y-3">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => !selecting && handleSelect(cls.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{CLASS_ICONS[cls.id]}</span>
                {cls.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {cls.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {formatModifier(cls.durationModifier, true) && (
                  <Badge
                    variant={
                      cls.durationModifier < 1 ? "default" : "destructive"
                    }
                  >
                    {cls.durationModifier < 1 ? "Speed" : "Slow"}:{" "}
                    {formatModifier(cls.durationModifier, true)}
                  </Badge>
                )}
                {formatModifier(cls.failRateModifier, false) && (
                  <Badge
                    variant={
                      cls.failRateModifier < 0 ? "default" : "destructive"
                    }
                  >
                    Fail: {formatModifier(cls.failRateModifier, false)}
                  </Badge>
                )}
                {formatModifier(cls.lootModifier, true) && (
                  <Badge
                    variant={cls.lootModifier > 1 ? "default" : "destructive"}
                  >
                    Loot: {formatModifier(cls.lootModifier, true)}
                  </Badge>
                )}
                {formatModifier(cls.xpModifier, true) && (
                  <Badge
                    variant={cls.xpModifier > 1 ? "default" : "destructive"}
                  >
                    XP: {formatModifier(cls.xpModifier, true)}
                  </Badge>
                )}
              </div>
              <Button className="w-full mt-2" disabled={selecting !== null}>
                {selecting === cls.id ? "Starting..." : `Play as ${cls.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
