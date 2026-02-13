import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  Loader2,
  Sparkles,
  Gift,
  Dice5,
  ShieldCheck,
  ExternalLink,
  Skull,
  Swords,
  Crown,
} from "lucide-react";
import { useVrfRoll } from "@/hooks/useVrfRoll";
import { ClassIcon } from "@/components/ClassIcon";
import type { WeeklyRun, RunEvent, ClassId, EpochFinalizeResponse, EpochBonusRewards } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";
import magicblockLogo from "@/assets/icons/MagicBlock-Logo-Black.png";

interface Props {
  run: WeeklyRun;
  signMessage: (msg: string) => Promise<string | null>;
  onFinalized: () => void;
}

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

const CLASS_STYLES: Record<ClassId, { text: string; border: string; gradient: string }> = {
  scout: { text: "text-neon-amber", border: "border-neon-amber/40", gradient: "from-neon-amber via-neon-green to-neon-amber" },
  guardian: { text: "text-neon-cyan", border: "border-neon-cyan/40", gradient: "from-neon-cyan via-neon-green to-neon-cyan" },
  mystic: { text: "text-neon-purple", border: "border-neon-purple/40", gradient: "from-neon-purple via-neon-green to-neon-purple" },
};

const MULTIPLIER_COLORS: Record<number, string> = {
  1: "text-muted-foreground",
  1.5: "text-neon-cyan",
  2: "text-neon-amber",
  3: "text-neon-purple",
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

export function RunEndScreen({ run, signMessage, onFinalized }: Props) {
  const [phase, setPhase] = useState<"summary" | "rolling" | "bonus" | "done">("summary");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [bonus, setBonus] = useState<EpochBonusRewards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestRoll, status: vrfStatus, error: vrfError, reset: resetVrf } = useVrfRoll();
  const weekNum = getWeekNumber(run.weekStart);

  useEffect(() => {
    api<RunEvent[]>(`/runs/${run.id}/events`)
      .then(setEvents)
      .catch(() => {});
  }, [run.id]);

  const deaths = events.filter((e) => e.eventType === "mission_fail" && !(e.data as any).escaped).length;

  const handleFinalize = async () => {
    setError(null);
    setPhase("rolling");

    try {
      // Step 1: Request VRF randomness (player signs one Solana tx)
      let vrfAccount: string | null = null;
      try {
        vrfAccount = await requestRoll();
      } catch (e) {
        console.warn("[RunEndScreen] VRF request failed, continuing without:", e);
      }

      // Step 2: Sign the epoch end message
      const msg = `END_RUN:week${weekNum}:score:${run.score}:${Date.now()}`;
      let signature: string | null = null;
      try {
        signature = await signMessage(msg);
      } catch (e) {
        console.warn("[RunEndScreen] signMessage failed, using fallback:", e);
      }

      // Step 3: Finalize with backend (includes VRF account for bonus calc)
      const result = await api<EpochFinalizeResponse>(`/runs/${run.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({
          signature: signature ?? "unsigned",
          vrfAccount,
        }),
      });

      if (result.bonus) {
        setBonus(result.bonus);
        setPhase("bonus");
      } else {
        setPhase("done");
        await onFinalized();
      }
    } catch (e) {
      console.error("[RunEndScreen] finalize failed:", e);
      setError("Finalization failed. Try again.");
      setPhase("summary");
      resetVrf();
    }
  };

  const handleContinue = async () => {
    setPhase("done");
    await onFinalized();
  };

  // Rolling phase — show VRF status
  if (phase === "rolling") {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-4">
        <div className="rounded-xl border border-neon-purple/20 bg-[#0d1525] p-6 text-center space-y-4">
          <Dice5 className="h-16 w-16 text-neon-purple animate-spin mx-auto" />
          <h2 className="text-2xl font-display text-neon-purple">Rolling Rewards</h2>
          <p className="text-sm text-muted-foreground">
            {vrfStatus === "requesting" && "Requesting on-chain randomness..."}
            {vrfStatus === "waiting-oracle" && "MagicBlock oracle verifying..."}
            {vrfStatus === "fulfilled" && "Randomness verified! Calculating bonus..."}
            {vrfStatus === "error" && "VRF unavailable — using server randomness..."}
            {vrfStatus === "idle" && "Preparing transaction..."}
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <span className="text-[10px] text-muted-foreground">Powered by</span>
            <img src={magicblockLogo} alt="MagicBlock" className="h-4 invert opacity-60" />
          </div>
        </div>
      </div>
    );
  }

  // Bonus reveal phase
  if (phase === "bonus" && bonus) {
    const multColor = MULTIPLIER_COLORS[bonus.multiplier] ?? "text-neon-green";

    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-4">
        <div className="rounded-xl border border-neon-amber/20 bg-[#0d1525] p-5 text-center space-y-3">
          <Gift className="h-16 w-16 text-neon-amber animate-bounce-in mx-auto" />
          <h2 className="text-3xl font-display text-neon-amber">Epoch Bonus!</h2>
          {bonus.vrfVerified && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-neon-cyan">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified by</span>
              <img src={magicblockLogo} alt="MagicBlock" className="h-3.5 invert" />
            </div>
          )}
        </div>

        {/* Multiplier */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4 text-center">
          <span className={`text-5xl font-display font-bold ${multColor}`}>
            {bonus.multiplier}x
          </span>
          <p className="text-xs text-muted-foreground mt-1">Reward Multiplier</p>
        </div>

        {/* Resource rewards */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4 space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center">
            Bonus Rewards
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#111d30] rounded-lg p-2 space-y-1">
              <img src={scrapIcon} alt="Scrap" className="h-8 w-8 mx-auto" />
              <div className="font-bold font-mono text-neon-green">+{bonus.bonusScrap}</div>
              <div className="text-[10px] text-muted-foreground">Lamports</div>
            </div>
            <div className="bg-[#111d30] rounded-lg p-2 space-y-1">
              <img src={crystalIcon} alt="Crystal" className="h-8 w-8 mx-auto" />
              <div className="font-bold font-mono text-neon-cyan">+{bonus.bonusCrystal}</div>
              <div className="text-[10px] text-muted-foreground">Tokens</div>
            </div>
            <div className="bg-[#111d30] rounded-lg p-2 space-y-1">
              <img src={artifactIcon} alt="Artifact" className="h-8 w-8 mx-auto" />
              <div className="font-bold font-mono text-neon-purple">+{bonus.bonusArtifact}</div>
              <div className="text-[10px] text-muted-foreground">Keys</div>
            </div>
          </div>

          {/* Loot drop */}
          {bonus.lootItemId && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/[0.08]">
              <Sparkles className="h-4 w-4 text-neon-amber" />
              <span className="text-sm font-medium">
                Tier {bonus.lootTier} Loot Drop!
              </span>
            </div>
          )}

          {/* NFT drop */}
          {bonus.nftDrop && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/[0.08]">
              <Sparkles className="h-4 w-4 text-neon-purple" />
              <span className="text-sm font-medium text-neon-purple">
                Rare NFT Drop!
              </span>
            </div>
          )}
        </div>

        {/* VRF verification link */}
        {bonus.vrfVerified && bonus.vrfAccount && (
          <a
            href={`https://explorer.solana.com/address/${bonus.vrfAccount}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-neon-cyan/70 hover:text-neon-cyan transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Verify on Solana Explorer</span>
          </a>
        )}

        {/* MagicBlock branding */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Powered by</span>
          <img src={magicblockLogo} alt="MagicBlock" className="h-4 invert opacity-50" />
        </div>

        <Button onClick={handleContinue} className="w-full" size="lg">
          Continue
        </Button>
      </div>
    );
  }

  // Summary phase (default)
  const style = CLASS_STYLES[run.classId] ?? CLASS_STYLES.scout;

  return (
    <div className="mx-auto w-full max-w-md space-y-5 p-4 animate-fade-in-up">
      {/* Hero header with character */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d1525] overflow-hidden">
        {/* Subtle gradient accent top */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`} />

        <div className="p-5 text-center space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Epoch {weekNum}</p>
          <h2 className="text-3xl font-display text-gradient">Epoch Complete</h2>

          {/* Character avatar + class */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className={`rounded-full border-2 ${style.border} bg-[#111d30] p-1.5`}>
              <ClassIcon classId={run.classId} className="h-16 w-16 rounded-full" />
            </div>
            <span className={`text-sm font-display font-medium ${style.text}`}>
              {CLASS_NAMES[run.classId]}
            </span>
          </div>

          {/* Big score */}
          <div className="pt-2">
            <div className="text-5xl font-display font-bold text-neon-green">{run.score}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">FINAL SCORE</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 text-center">
          <Swords className="h-4 w-4 text-neon-green mx-auto mb-1" />
          <div className="font-bold text-lg font-mono text-neon-green">{run.missionsCompleted}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Missions</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 text-center">
          <Skull className="h-4 w-4 text-neon-red mx-auto mb-1" />
          <div className="font-bold text-lg font-mono text-neon-red">{deaths}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Deaths</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 text-center">
          <Crown className="h-4 w-4 text-neon-amber mx-auto mb-1" />
          <div className="font-bold text-lg">
            {run.bossDefeated ? (
              <span className="text-neon-amber">Yes</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Boss</div>
        </div>
      </div>

      {/* VRF bonus roll CTA */}
      <div className="rounded-2xl border border-neon-purple/30 bg-[#12102a] p-4 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Dice5 className="h-5 w-5 text-neon-purple" />
          <span className="text-base font-display font-medium text-neon-purple">On-Chain Bonus Roll</span>
        </div>
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Roll for a bonus multiplier (up to <span className="text-neon-purple font-medium">3x</span>) on your epoch rewards using verifiable on-chain randomness. Your score will be sealed on the leaderboard.
        </p>

        {error && (
          <p className="text-xs text-center text-neon-red">{error}</p>
        )}

        <Button
          onClick={handleFinalize}
          disabled={phase !== "summary"}
          className="w-full bg-[#2a1854] text-neon-purple border border-neon-purple/40 hover:bg-[#351e6b] text-base h-12"
          size="lg"
        >
          <Dice5 className="mr-2 h-5 w-5" />
          Finalize & Roll
        </Button>

        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/60">Powered by</span>
          <img src={magicblockLogo} alt="MagicBlock" className="h-3.5 invert opacity-40" />
        </div>
      </div>
    </div>
  );
}
