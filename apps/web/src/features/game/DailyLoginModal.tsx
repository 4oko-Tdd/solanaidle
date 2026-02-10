import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Check } from "lucide-react";
import type { DailyLoginStatus } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/19.png";
import crystalIcon from "@/assets/icons/22.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  status: DailyLoginStatus;
  open: boolean;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

export function DailyLoginModal({ status, open, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  };

  const reward = status.todayReward;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <Gift className="h-8 w-8 text-neon-amber animate-bounce-in" />
          <DialogTitle className="text-xl font-display">
            {claimed ? "Claimed!" : "Daily Bonus"}
          </DialogTitle>
          <DialogDescription>
            {claimed
              ? `Day ${status.streakDay} reward collected!`
              : `Day ${status.streakDay} of 7 — claim your daily reward!`}
          </DialogDescription>
        </DialogHeader>

        {/* 7-day calendar strip */}
        <div className="flex justify-between gap-1 py-2">
          {status.rewards.map((r) => {
            const isPast = r.day < status.streakDay;
            const isCurrent = r.day === status.streakDay;
            return (
              <div
                key={r.day}
                className={`flex flex-col items-center rounded-lg px-2 py-1.5 text-xs flex-1 ${
                  isCurrent
                    ? "bg-neon-amber/20 border border-neon-amber/40"
                    : isPast
                    ? "bg-white/[0.03] opacity-50"
                    : "bg-white/[0.03]"
                }`}
              >
                <span className="font-mono text-muted-foreground">D{r.day}</span>
                {isPast ? (
                  <Check className="h-3.5 w-3.5 text-neon-green mt-0.5" />
                ) : (
                  <Gift className={`h-3.5 w-3.5 mt-0.5 ${isCurrent ? "text-neon-amber" : "text-muted-foreground"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Today's reward */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wider">
            Today's Reward
          </p>
          <div className="flex items-center justify-center gap-4">
            {reward.scrap > 0 && (
              <div className="flex items-center gap-1">
                <img src={scrapIcon} alt="Scrap" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.scrap}</span>
              </div>
            )}
            {reward.crystal > 0 && (
              <div className="flex items-center gap-1">
                <img src={crystalIcon} alt="Crystal" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.crystal}</span>
              </div>
            )}
            {reward.artifact > 0 && (
              <div className="flex items-center gap-1">
                <img src={artifactIcon} alt="Artifact" className="h-5 w-5" />
                <span className="font-mono font-bold text-neon-green">+{reward.artifact}</span>
              </div>
            )}
          </div>
        </div>

        {claimed ? (
          <Button onClick={onClose} className="w-full">Continue</Button>
        ) : (
          <Button onClick={handleClaim} disabled={claiming} className="w-full">
            {claiming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
            ) : (
              "Claim Reward"
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
