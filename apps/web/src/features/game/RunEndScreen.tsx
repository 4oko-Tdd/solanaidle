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
  Trophy,
  Zap,
  Heart,
  TrendingUp,
} from "lucide-react";
import { useVrfRoll } from "@/hooks/useVrfRoll";
import { ClassIcon } from "@/components/ClassIcon";
import type { WeeklyRun, RunEvent, ClassId, EpochFinalizeResponse, EpochBonusRewards } from "@solanaidle/shared";
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

const CLASS_STYLES: Record<ClassId, { text: string; border: string; gradient: string; glow: string; bg: string }> = {
  scout: { text: "text-neon-amber", border: "border-neon-amber/40", gradient: "from-neon-amber via-neon-green to-neon-amber", glow: "shadow-[0_0_30px_rgba(255,184,0,0.15)]", bg: "bg-neon-amber/5" },
  guardian: { text: "text-neon-cyan", border: "border-neon-cyan/40", gradient: "from-neon-cyan via-neon-green to-neon-cyan", glow: "shadow-[0_0_30px_rgba(0,212,255,0.15)]", bg: "bg-neon-cyan/5" },
  mystic: { text: "text-neon-purple", border: "border-neon-purple/40", gradient: "from-neon-purple via-neon-green to-neon-purple", glow: "shadow-[0_0_30px_rgba(153,69,255,0.15)]", bg: "bg-neon-purple/5" },
};

const MULTIPLIER_LABELS: Record<number, { color: string; label: string }> = {
  1: { color: "text-muted-foreground", label: "Standard" },
  1.5: { color: "text-neon-cyan", label: "Lucky" },
  2: { color: "text-neon-amber", label: "Rare" },
  3: { color: "text-neon-purple", label: "Legendary" },
};

function getWeekNumber(weekStart: string): number {
  const date = new Date(weekStart);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

function getGrade(score: number, missions: number, bossDefeated: boolean): { letter: string; color: string } {
  if (bossDefeated && score >= 500) return { letter: "S", color: "text-neon-purple" };
  if (bossDefeated || score >= 400) return { letter: "A", color: "text-neon-amber" };
  if (score >= 200 && missions >= 10) return { letter: "B", color: "text-neon-green" };
  if (score >= 100) return { letter: "C", color: "text-neon-cyan" };
  return { letter: "D", color: "text-muted-foreground" };
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
  const grade = getGrade(run.score, run.missionsCompleted, run.bossDefeated);

  const handleFinalize = async () => {
    setError(null);
    setPhase("rolling");

    try {
      // Step 1: Request VRF randomness (player signs one MagicBlock tx)
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

  const style = CLASS_STYLES[run.classId] ?? CLASS_STYLES.scout;

  // ── Rolling phase ──
  if (phase === "rolling") {
    const steps = [
      { key: "requesting", label: "Requesting randomness", icon: Dice5 },
      { key: "waiting-oracle", label: "Oracle verifying", icon: ShieldCheck },
      { key: "fulfilled", label: "Calculating bonus", icon: Sparkles },
    ];
    const activeIdx = steps.findIndex((s) => s.key === vrfStatus);

    return (
      <div className="mx-auto w-full max-w-md p-4 animate-fade-in-up">
        <div className="relative rounded-2xl border border-neon-purple/20 bg-[#0d1525] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple animate-shimmer" style={{ backgroundSize: "200% 100%" }} />

          <div className="p-6 space-y-6">
            {/* Animated dice */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-neon-purple/10 animate-ping" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[#12102a] border border-neon-purple/30">
                <Dice5 className="h-10 w-10 text-neon-purple animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display text-neon-purple">Rolling Rewards</h2>
              <p className="text-xs text-muted-foreground font-mono">Epoch {weekNum} Finalization</p>
            </div>

            {/* Progress steps */}
            <div className="space-y-2.5">
              {steps.map((step, i) => {
                const isActive = step.key === vrfStatus;
                const isDone = activeIdx > i;
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                      isActive ? "bg-neon-purple/10 border border-neon-purple/30" :
                      isDone ? "bg-neon-green/5 border border-neon-green/20" :
                      "bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${
                      isDone ? "bg-neon-green/20" : isActive ? "bg-neon-purple/20" : "bg-white/5"
                    }`}>
                      {isDone ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-neon-green" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 text-neon-purple animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      isDone ? "text-neon-green/80" : isActive ? "text-neon-purple" : "text-muted-foreground/40"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}

              {vrfStatus === "error" && (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-neon-amber/5 border border-neon-amber/20">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-neon-amber/20">
                    <Zap className="h-3.5 w-3.5 text-neon-amber" />
                  </div>
                  <span className="text-sm text-neon-amber">Using server randomness</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground/60">Powered by</span>
              <img src={magicblockLogo} alt="MagicBlock" className="h-3.5 invert opacity-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Bonus reveal phase ──
  if (phase === "bonus" && bonus) {
    const mult = MULTIPLIER_LABELS[bonus.multiplier] ?? { color: "text-neon-green", label: "Bonus" };

    return (
      <div className="mx-auto w-full max-w-md p-4 space-y-4 animate-fade-in-up">
        {/* Header card */}
        <div className="relative rounded-2xl border border-neon-amber/20 bg-[#0d1525] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-amber via-neon-purple to-neon-amber" />

          <div className="p-5 text-center space-y-3">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-neon-amber/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-neon-amber/10">
                <Gift className="h-9 w-9 text-neon-amber animate-bounce-in" />
              </div>
            </div>
            <h2 className="text-2xl font-display text-neon-amber">Epoch Bonus!</h2>
            {bonus.vrfVerified && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1">
                <ShieldCheck className="h-3 w-3 text-neon-cyan" />
                <span className="text-xs text-neon-cyan font-medium">Verified by</span>
                <img src={magicblockLogo} alt="MagicBlock" className="h-3 invert" />
              </div>
            )}
          </div>
        </div>

        {/* Score multiplier — big reveal */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1525] p-4 text-center animate-stagger-in stagger-1">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">{mult.label} Roll</p>
          <div className={`text-5xl font-display font-bold ${mult.color} animate-scale-pop`}>
            {bonus.multiplier}x
          </div>
          <p className="text-xs text-muted-foreground mt-2">Score Multiplier</p>
        </div>

        {/* Score boost result */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4 animate-stagger-in stagger-2">
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <div className="text-lg font-mono text-muted-foreground">{bonus.originalScore}</div>
              <p className="text-xs text-muted-foreground uppercase">Before</p>
            </div>
            <TrendingUp className={`h-5 w-5 ${mult.color} shrink-0`} />
            <div className="text-center">
              <div className={`text-2xl font-display font-bold ${bonus.multiplier > 1 ? "text-neon-green" : "text-foreground"}`}>
                {bonus.boostedScore}
              </div>
              <p className="text-xs text-muted-foreground uppercase">Final Score</p>
            </div>
          </div>
        </div>

        {/* Permanent loot drop */}
        {bonus.permanentLootDrop && bonus.permanentLootItemId && (
          <div className="animate-stagger-in stagger-3">
            <div className="rounded-xl border border-neon-amber/20 bg-neon-amber/5 p-3 flex items-center justify-center gap-2.5 animate-golden-glow">
              <Sparkles className="h-4 w-4 text-neon-amber" />
              <span className="text-sm font-display font-bold text-neon-amber">
                Permanent Loot: {bonus.permanentLootItemId}
              </span>
            </div>
          </div>
        )}

        {/* Explorer link */}
        {bonus.vrfVerified && bonus.vrfAccount && (
          <a
            href={`https://explorer.solana.com/address/${bonus.vrfAccount}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-neon-cyan/60 hover:text-neon-cyan transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Verify on Solana Explorer</span>
          </a>
        )}

        {/* Continue */}
        <Button
          onClick={handleContinue}
          className="w-full btn-shimmer h-12 text-base font-display"
          size="lg"
        >
          Continue
        </Button>

        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs text-muted-foreground/50">Powered by</span>
          <img src={magicblockLogo} alt="MagicBlock" className="h-3.5 invert opacity-35" />
        </div>
      </div>
    );
  }

  // ── Summary phase (default) ──
  return (
    <div className="mx-auto w-full max-w-md p-4 space-y-4 animate-fade-in-up">
      {/* Hero card */}
      <div className={`relative rounded-2xl border border-white/[0.08] bg-[#0d1525] overflow-hidden ${style.glow}`}>
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`} />

        <div className="p-4 text-center space-y-3">
          {/* Epoch label */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5">
            <Trophy className="h-2.5 w-2.5 text-neon-amber" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Epoch {weekNum} Complete</span>
          </div>

          {/* Character + score in a row */}
          <div className="flex items-center justify-center gap-4">
            {/* Avatar + grade */}
            <div className="relative shrink-0">
              <div className={`rounded-full border-2 ${style.border} bg-[#111d30] p-1.5`}>
                <ClassIcon classId={run.classId} className="h-14 w-14 rounded-full" />
              </div>
              <div className={`absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#0d1525] border-2 ${style.border} flex items-center justify-center`}>
                <span className={`text-xs font-display font-bold ${grade.color}`}>{grade.letter}</span>
              </div>
            </div>

            {/* Class + score */}
            <div className="text-left">
              <span className={`text-xs font-display font-medium ${style.text}`}>
                {CLASS_NAMES[run.classId]}
              </span>
              <div className="text-4xl font-display font-bold text-neon-green leading-none mt-0.5">{run.score}</div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Final Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid — 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 flex items-center gap-3 animate-stagger-in stagger-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon-green/10 shrink-0">
            <Swords className="h-4.5 w-4.5 text-neon-green" />
          </div>
          <div>
            <div className="font-bold text-lg font-mono text-neon-green leading-none">{run.missionsCompleted}</div>
            <div className="text-xs text-muted-foreground font-mono uppercase mt-0.5">Missions</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 flex items-center gap-3 animate-stagger-in stagger-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon-red/10 shrink-0">
            <Skull className="h-4.5 w-4.5 text-neon-red" />
          </div>
          <div>
            <div className="font-bold text-lg font-mono text-neon-red leading-none">{deaths}</div>
            <div className="text-xs text-muted-foreground font-mono uppercase mt-0.5">Deaths</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 flex items-center gap-3 animate-stagger-in stagger-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon-amber/10 shrink-0">
            <Crown className="h-4.5 w-4.5 text-neon-amber" />
          </div>
          <div>
            <div className="font-bold text-lg font-mono leading-none">
              {run.bossDefeated ? (
                <span className="text-neon-amber">Slain</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono uppercase mt-0.5">Boss</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 flex items-center gap-3 animate-stagger-in stagger-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon-cyan/10 shrink-0">
            <Heart className="h-4.5 w-4.5 text-neon-cyan" />
          </div>
          <div>
            <div className="font-bold text-lg font-mono text-neon-cyan leading-none">{run.livesRemaining}</div>
            <div className="text-xs text-muted-foreground font-mono uppercase mt-0.5">Lives Left</div>
          </div>
        </div>
      </div>

      {/* Streak / upgrades mini-row */}
      {(run.streak > 0 || run.armorLevel > 0 || run.engineLevel > 0 || run.scannerLevel > 0) && (
        <div className="flex items-center justify-center gap-3 py-1 animate-stagger-in stagger-5">
          {run.streak > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-neon-green" />
              <span className="text-muted-foreground">Streak</span>
              <span className="font-mono font-bold text-neon-green">{run.streak}</span>
            </div>
          )}
          {run.armorLevel > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-neon-cyan" />
              <span className="font-mono text-neon-cyan">{run.armorLevel}</span>
            </div>
          )}
        </div>
      )}

      {/* VRF CTA card */}
      <div className="rounded-2xl border border-neon-purple/25 bg-[#12102a] overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Dice5 className="h-5 w-5 text-neon-purple" />
            <span className="text-base font-display font-medium text-neon-purple">On-Chain Bonus Roll</span>
          </div>

          {/* Multiplier chance bars */}
          <div className="grid grid-cols-4 gap-1.5 px-1">
            {[
              { mult: "1x", pct: "70%", color: "bg-muted-foreground/30" },
              { mult: "1.5x", pct: "20%", color: "bg-neon-cyan/40" },
              { mult: "2x", pct: "8%", color: "bg-neon-amber/40" },
              { mult: "3x", pct: "2%", color: "bg-neon-purple/40" },
            ].map((tier) => (
              <div key={tier.mult} className="text-center">
                <div className="text-xs font-mono font-bold text-foreground/80">{tier.mult}</div>
                <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${tier.color}`} style={{ width: tier.pct }} />
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5">{tier.pct}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Seal your score on the leaderboard with verifiable on-chain randomness.
          </p>

          {error && (
            <p className="text-xs text-center text-neon-red">{error}</p>
          )}

          <Button
            onClick={handleFinalize}
            disabled={phase !== "summary"}
            className="w-full bg-[#2a1854] text-neon-purple border border-neon-purple/40 hover:bg-[#351e6b] text-base h-12 font-display"
            size="lg"
          >
            <Dice5 className="mr-2 h-5 w-5" />
            Finalize & Roll
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-2 bg-white/[0.02] border-t border-white/[0.04]">
          <span className="text-xs text-muted-foreground/50">Powered by</span>
          <img src={magicblockLogo} alt="MagicBlock" className="h-3.5 invert opacity-35" />
        </div>
      </div>
    </div>
  );
}
