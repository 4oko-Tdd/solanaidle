import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MissionClaimResponse } from "@solanaidle/shared";
import { Trophy, Skull, Heart, HeartCrack, Sparkles, Zap } from "lucide-react";
import scrapIcon from "@/assets/icons/scrap.png";
import crystalIcon from "@/assets/icons/tokens.png";
import artifactIcon from "@/assets/icons/key.png";

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
      <DialogContent
        className={`max-w-sm overflow-hidden p-0 ${
          isSuccess
            ? "border-neon-green/30 shadow-[0_0_40px_rgba(20,241,149,0.12),0_0_80px_rgba(153,69,255,0.06)]"
            : "border-neon-red/30 shadow-[0_0_40px_rgba(255,51,102,0.12)]"
        }`}
      >
        {/* Red flash overlay on failure */}
        {!isSuccess && (
          <div className="absolute inset-0 rounded-lg bg-neon-red/20 animate-red-flash pointer-events-none" />
        )}

        {/* Animated gradient top accent line */}
        {isSuccess && (
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-neon-green to-transparent animate-shimmer bg-[length:200%_100%]" />
        )}

        <div className="p-6">
          <DialogHeader className="items-center text-center">
            {/* Icon */}
            <div className="mb-3">
              {isSuccess ? (
                <Trophy className="h-14 w-14 text-neon-amber animate-bounce-in" />
              ) : (
                <Skull className="h-14 w-14 text-neon-red animate-shake" />
              )}
            </div>

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

          {/* Rewards */}
          {isSuccess && result.rewards && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-neon-green/60" />
                <p className="text-xs font-display text-neon-green/60 uppercase tracking-widest">Rewards Collected</p>
                <Sparkles className="h-3.5 w-3.5 text-neon-green/60" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <RewardCard
                  icon={<Zap className="h-4 w-4 text-neon-green" />}
                  label="XP"
                  value={`+${result.rewards.xp}`}
                  color="green"
                  delay={1}
                />
                <RewardCard
                  icon={<img src={scrapIcon} alt="" className="h-7 w-7" />}
                  label="Scrap"
                  value={`+${result.rewards.scrap}`}
                  color="green"
                  delay={2}
                />
                {result.rewards.crystal ? (
                  <RewardCard
                    icon={<img src={crystalIcon} alt="" className="h-5 w-5" />}
                    label="Tokens"
                    value={`+${result.rewards.crystal}`}
                    color="cyan"
                    delay={3}
                  />
                ) : null}
                {result.rewards.artifact ? (
                  <RewardCard
                    icon={<img src={artifactIcon} alt="" className="h-5 w-5" />}
                    label="Keys"
                    value={`+${result.rewards.artifact}`}
                    color="amber"
                    delay={4}
                  />
                ) : null}
              </div>

              {result.rewards?.streakMultiplier && result.rewards.streakMultiplier > 1 && (
                <div className="animate-stagger-in stagger-5 flex items-center justify-center gap-2 rounded-lg border border-neon-amber/20 bg-neon-amber/[0.06] px-3 py-2 animate-golden-glow">
                  <Sparkles className="h-4 w-4 text-neon-amber" />
                  <span className="font-display text-sm text-neon-amber">
                    {result.rewards.streakMultiplier}x Streak Bonus!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Lives remaining */}
          {!isSuccess && !isRunOver && livesRemaining !== undefined && (
            <div className="flex items-center justify-center gap-2 py-3">
              {Array.from({ length: 3 }, (_, i) =>
                i < livesRemaining ? (
                  <Heart key={i} className="h-5 w-5 fill-neon-red text-neon-red drop-shadow-[0_0_6px_rgba(255,51,102,0.4)]" />
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
            <p className="text-center text-sm text-muted-foreground pt-1">
              Node is recovering from slash. Check back in 1 hour.
            </p>
          )}

          <DialogFooter className="pt-4">
            {isSuccess ? (
              <button
                onClick={onClose}
                className="btn-shimmer w-full rounded-lg px-4 py-2.5 text-sm font-display uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
              </button>
            ) : (
              <Button onClick={onClose} className="w-full" variant={isRunOver ? "destructive" : "default"}>
                {isRunOver ? "View Results" : "Understood"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RewardCard({
  icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "green" | "cyan" | "amber";
  delay: number;
}) {
  const colorMap = {
    green: "border-neon-green/15 bg-neon-green/[0.04]",
    cyan: "border-neon-cyan/15 bg-neon-cyan/[0.04]",
    amber: "border-neon-amber/15 bg-neon-amber/[0.04]",
  };
  const valueColor = {
    green: "text-neon-green",
    cyan: "text-neon-cyan",
    amber: "text-neon-amber",
  };

  return (
    <div
      className={`animate-stagger-in stagger-${delay} flex items-center gap-2 rounded-lg border px-3 py-2 ${colorMap[color]}`}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`font-mono font-bold text-sm ${valueColor[color]}`}>{value}</span>
      </div>
    </div>
  );
}
