import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Zap, ShieldHalf, Sparkles, Loader2 } from "lucide-react";
import type { CharacterClass, ClassId } from "@solanaidle/shared";

interface Props {
  classes: CharacterClass[];
  onSelect: (classId: ClassId, signature?: string) => Promise<void>;
  signMessage: (msg: string) => Promise<string | null>;
}

const CLASS_ICONS: Record<ClassId, React.ReactNode> = {
  scout: <Zap className="h-6 w-6 text-yellow-500" />,
  guardian: <ShieldHalf className="h-6 w-6 text-blue-500" />,
  mystic: <Sparkles className="h-6 w-6 text-purple-500" />,
};

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

export function ClassPicker({ classes, onSelect, signMessage }: Props) {
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [signing, setSigning] = useState(false);

  const selectedClass = classes.find((c) => c.id === selected);
  const weekNum = getWeekNumber();

  const handleClassClick = (classId: ClassId) => {
    setSelected(classId);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSigning(true);
    try {
      const msg = `BEGIN_RUN:week${weekNum}:${selected}:${Date.now()}`;
      const signature = await signMessage(msg);
      await onSelect(selected, signature ?? undefined);
    } finally {
      setSigning(false);
      setConfirming(false);
      setSelected(null);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
    setSelected(null);
  };

  const formatModifier = (value: number, isMultiplier: boolean) => {
    if (isMultiplier) {
      if (value === 1.0) return null;
      const pct = Math.round((value - 1) * 100);
      return pct > 0 ? `+${pct}%` : `${pct}%`;
    }
    if (value === 0) return null;
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  return (
    <>
      <div className="mx-auto w-full max-w-md space-y-4 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Week {weekNum} Run</h2>
          <p className="text-sm text-muted-foreground">
            Choose your class. Each class has unique strengths and weaknesses.
          </p>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => handleClassClick(cls.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {CLASS_ICONS[cls.id]}
                  {cls.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{cls.description}</p>
                <div className="flex flex-wrap gap-1">
                  {formatModifier(cls.durationModifier, true) && (
                    <Badge variant={cls.durationModifier < 1 ? "default" : "destructive"}>
                      {cls.durationModifier < 1 ? "Speed" : "Slow"}: {formatModifier(cls.durationModifier, true)}
                    </Badge>
                  )}
                  {formatModifier(cls.failRateModifier, false) && (
                    <Badge variant={cls.failRateModifier < 0 ? "default" : "destructive"}>
                      Fail: {formatModifier(cls.failRateModifier, false)}
                    </Badge>
                  )}
                  {formatModifier(cls.lootModifier, true) && (
                    <Badge variant={cls.lootModifier > 1 ? "default" : "destructive"}>
                      Loot: {formatModifier(cls.lootModifier, true)}
                    </Badge>
                  )}
                  {formatModifier(cls.xpModifier, true) && (
                    <Badge variant={cls.xpModifier > 1 ? "default" : "destructive"}>
                      XP: {formatModifier(cls.xpModifier, true)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            {selected && CLASS_ICONS[selected]}
            <DialogTitle className="text-xl">Commit to This Run</DialogTitle>
            <DialogDescription>
              You are about to begin Week {weekNum} as a <strong>{selectedClass?.name}</strong>. 3 lives. No turning back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleConfirm} disabled={signing} className="w-full">
              {signing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing...</>
              ) : (
                "Sign & Begin"
              )}
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={signing} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
