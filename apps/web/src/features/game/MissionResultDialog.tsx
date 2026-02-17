import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MissionClaimResponse } from "@solanaidle/shared";
import { Trophy, Skull, Heart, HeartCrack } from "lucide-react";

interface Props {
  result: MissionClaimResponse | null;
  onClose: () => void;
  livesRemaining?: number;
}

export function MissionResultDialog({ result, onClose, livesRemaining }: Props) {
  if (!result) return null;

  const isSuccess = result.result === "success";
  const isRunOver = livesRemaining !== undefined && livesRemaining <= 0;

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-sm ${!isSuccess ? "border-neon-red/30" : "border-neon-green/30"}`}>
        {/* Red flash overlay on failure */}
        {!isSuccess && (
          <div className="absolute inset-0 rounded-lg bg-neon-red/20 animate-red-flash pointer-events-none" />
        )}

        <DialogHeader className="items-center text-center">
          {isSuccess ? (
            <Trophy className="h-14 w-14 text-neon-amber animate-bounce-in mx-auto mb-2 drop-shadow-[0_0_12px_rgba(255,184,0,0.5)]" />
          ) : (
            <Skull className={`h-14 w-14 text-neon-red animate-shake mx-auto mb-2 ${isRunOver ? "drop-shadow-[0_0_16px_rgba(255,51,102,0.6)]" : ""}`} />
          )}
          <DialogTitle className={`text-xl font-display ${isRunOver ? "text-neon-red animate-urgency" : isSuccess ? "text-gradient" : ""}`}>
            {isSuccess
              ? "Transaction Confirmed!"
              : isRunOver
              ? "SLASHED \u2014 Epoch Over"
              : "Transaction Failed"}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your node returned with rewards!"
              : isRunOver
              ? "No lives remaining. Your epoch has ended."
              : "Your node got slashed..."}
          </DialogDescription>
        </DialogHeader>

        {isSuccess && result.rewards && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-center font-display uppercase tracking-wider">Rewards:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="animate-stagger-in stagger-1">+{result.rewards.xp} XP</Badge>
              <Badge variant="secondary" className="animate-stagger-in stagger-2">+{result.rewards.scrap} Scrap</Badge>
              {result.rewards.crystal ? (
                <Badge variant="secondary" className="animate-stagger-in stagger-3">+{result.rewards.crystal} Tokens</Badge>
              ) : null}
              {result.rewards.artifact ? (
                <Badge variant="secondary" className="animate-stagger-in stagger-4">+{result.rewards.artifact} Keys</Badge>
              ) : null}
              {result.rewards?.streakMultiplier && result.rewards.streakMultiplier > 1 && (
                <Badge className="bg-neon-amber/20 text-neon-amber animate-stagger-in stagger-5 animate-glow-pulse">
                  {result.rewards.streakMultiplier}x Streak Bonus!
                </Badge>
              )}
            </div>
          </div>
        )}

        {!isSuccess && !isRunOver && livesRemaining !== undefined && (
          <div className="flex items-center justify-center gap-2 py-2">
            {Array.from({ length: 3 }, (_, i) =>
              i < livesRemaining ? (
                <Heart key={i} className="h-5 w-5 fill-neon-red text-neon-red" />
              ) : (
                <HeartCrack key={i} className="h-5 w-5 text-muted-foreground/40" />
              )
            )}
          </div>
        )}

        {result.result === "failure" && (
          <p className="text-xs text-muted-foreground text-center">Streak lost.</p>
        )}

        {!isSuccess && !isRunOver && (
          <p className="text-center text-sm text-muted-foreground">
            Node is recovering from slash. Check back in 1 hour.
          </p>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full" variant={isRunOver ? "destructive" : "default"}>
            {isSuccess ? "Continue" : isRunOver ? "View Results" : "Understood"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
