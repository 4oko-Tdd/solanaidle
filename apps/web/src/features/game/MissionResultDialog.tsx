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
import { Trophy, Skull, Sparkles } from "lucide-react";

interface Props {
  result: MissionClaimResponse | null;
  onClose: () => void;
}

export function MissionResultDialog({ result, onClose }: Props) {
  if (!result) return null;

  const isSuccess = result.result === "success";

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          {isSuccess ? (
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
          ) : (
            <Skull className="h-12 w-12 text-red-500 mx-auto mb-2" />
          )}
          <DialogTitle className="text-xl">
            {isSuccess ? "Mission Success!" : "Mission Failed"}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your character returned with loot!"
              : "Your character didn't make it back..."}
          </DialogDescription>
        </DialogHeader>

        {isSuccess && result.rewards && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-center">Rewards:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">+{result.rewards.xp} XP</Badge>
              <Badge variant="secondary">+{result.rewards.scrap} Scrap</Badge>
              {result.rewards.crystal ? (
                <Badge variant="secondary">
                  +{result.rewards.crystal} Crystal
                </Badge>
              ) : null}
              {result.rewards.artifact ? (
                <Badge variant="secondary">
                  +{result.rewards.artifact} Artifact
                </Badge>
              ) : null}
            </div>
          </div>
        )}

        {result.nftDrop && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">
              NFT Drop: {result.nftDrop.nftName}
            </span>
          </div>
        )}

        {!isSuccess && (
          <p className="text-center text-sm text-muted-foreground">
            Character is recovering. Check back in 1 hour.
          </p>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            {isSuccess ? "Continue" : "Understood"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
