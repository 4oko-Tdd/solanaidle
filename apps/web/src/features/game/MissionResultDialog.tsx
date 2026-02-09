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
import { Trophy, Skull, Sparkles, Heart, HeartCrack } from "lucide-react";

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
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          {isSuccess ? (
            <Trophy className="h-12 w-12 text-neon-amber animate-bounce-in mx-auto mb-2" />
          ) : (
            <Skull className="h-12 w-12 text-neon-red animate-shake mx-auto mb-2" />
          )}
          <DialogTitle className={`text-xl font-display ${isRunOver ? "text-neon-red" : ""}`}>
            {isSuccess
              ? "Mission Success!"
              : isRunOver
              ? "DEATH \u2014 Run Over"
              : "Mission Failed"}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your character returned with loot!"
              : isRunOver
              ? "No lives remaining. Your run has ended."
              : "Your character didn't make it back..."}
          </DialogDescription>
        </DialogHeader>

        {isSuccess && result.rewards && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-center font-display uppercase tracking-wider">Rewards:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">+{result.rewards.xp} XP</Badge>
              <Badge variant="secondary">+{result.rewards.scrap} Scrap</Badge>
              {result.rewards.crystal ? (
                <Badge variant="secondary">+{result.rewards.crystal} Crystal</Badge>
              ) : null}
              {result.rewards.artifact ? (
                <Badge variant="secondary">+{result.rewards.artifact} Artifact</Badge>
              ) : null}
            </div>
          </div>
        )}

        {result.nftDrop && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-neon-amber/50 bg-neon-amber/10 p-3">
            <Sparkles className="h-5 w-5 text-neon-amber animate-glow-pulse" />
            <span className="text-sm font-medium">NFT Drop: {result.nftDrop.nftName}</span>
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

        {!isSuccess && !isRunOver && (
          <p className="text-center text-sm text-muted-foreground">
            Character is recovering. Check back in 1 hour.
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
