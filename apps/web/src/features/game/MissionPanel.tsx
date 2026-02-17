import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId, ClassId, Inventory } from "@solanaidle/shared";
import { Clock, Skull, Lock, AlertTriangle, Sparkles, Shield, Minus, Plus, Crown, Fish } from "lucide-react";
import scrapIcon from "@/assets/icons/scrap.png";
import expIcon from "@/assets/icons/exp.png";
import crystalIcon from "@/assets/icons/tokens.png";
import artifactIcon from "@/assets/icons/key.png";

const REROLL_COST_PER_STACK = 10;
const MAX_REROLL_STACKS = 3;
const REROLL_REDUCTION = 2; // -2% per stack
const INSURANCE_COST = 5; // crystal

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => void;
  characterLevel?: number;
  classId?: ClassId | null;
  durationModifier?: number;
  livesRemaining?: number;
  inventory?: Inventory | null;
  bossDefeated?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

const RISK_LABELS: Record<string, Record<number, string>> = {
  scout: { 3: "Easy Swap", 2: "Risky Swap", 1: "Last Swap" },
  expedition: { 3: "Safe Stake", 2: "Risky Stake", 1: "Degen Stake" },
  deep_dive: { 3: "Yield Farm", 2: "Degen Farm", 1: "Rug Risk" },
  boss: { 3: "Whale Spotted", 2: "Do or Die", 1: "Final Stand" },
};

function getRiskLevel(missionId: string, lives: number): "safe" | "risky" | "dangerous" | "critical" {
  const failMap: Record<string, number> = { scout: 10, expedition: 25, deep_dive: 40, boss: 50 };
  const fail = failMap[missionId] ?? 10;
  if (lives === 1) return fail >= 25 ? "critical" : "dangerous";
  if (lives === 2) return fail >= 40 ? "dangerous" : "risky";
  if (fail >= 40) return "risky";
  return "safe";
}

const RISK_STYLES: Record<string, string> = {
  safe: "border-white/[0.06]",
  risky: "border-neon-amber/40",
  dangerous: "border-neon-red/40",
  critical: "border-neon-red bg-neon-red/5",
};

export function MissionPanel({ missions, characterState, onStart, characterLevel = 1, classId, durationModifier = 1, livesRemaining = 3, inventory, bossDefeated }: Props) {
  const canStart = characterState === "idle";
  const lives = Math.max(1, Math.min(3, livesRemaining));
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [rerollStacks, setRerollStacks] = useState(0);
  const [insured, setInsured] = useState(false);

  const scrapBalance = inventory?.scrap ?? 0;
  const crystalBalance = inventory?.crystal ?? 0;
  const rerollCost = rerollStacks * REROLL_COST_PER_STACK;
  const insuranceCost = insured ? INSURANCE_COST : 0;
  const canAffordReroll = scrapBalance >= (rerollStacks + 1) * REROLL_COST_PER_STACK;
  const canAffordInsurance = crystalBalance >= INSURANCE_COST;

  const handleStartMission = (missionId: MissionId) => {
    onStart(missionId, rerollStacks > 0 || insured ? { rerollStacks, insured } : undefined);
    setExpandedMission(null);
    setRerollStacks(0);
    setInsured(false);
  };

  const toggleExpanded = (missionId: string) => {
    if (expandedMission === missionId) {
      setExpandedMission(null);
    } else {
      setExpandedMission(missionId);
      setRerollStacks(0);
      setInsured(false);
    }
  };

  const isTierLocked = (missionId: string): boolean => {
    if (missionId === "expedition" && characterLevel < 2) return true;
    if (missionId === "deep_dive" && characterLevel < 3) return true;
    if (missionId === "boss" && characterLevel < 5) return true;
    return false;
  };

  const getTierLabel = (missionId: string): string | null => {
    if (missionId === "expedition" && characterLevel < 2) return "Unlocks at Lv.2";
    if (missionId === "deep_dive" && characterLevel < 3) return "Unlocks at Lv.3";
    if (missionId === "boss" && characterLevel < 5) return "Unlocks at Lv.5";
    return null;
  };

  const isBossDay = missions.length === 1 && missions[0].id === "boss";
  const bossLocked = characterLevel < 5;

  if (isBossDay && bossDefeated) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-neon-amber/40 bg-gradient-to-b from-neon-amber/10 via-neon-amber/5 to-transparent backdrop-blur-md p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.1),transparent_70%)] bg-black/30" />
          <div className="relative text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-amber/20 border-2 border-neon-amber/40 mx-auto">
              <Crown className="h-10 w-10 text-neon-amber drop-shadow-[0_0_16px_rgba(251,191,36,0.6)]" />
            </div>
            <div>
              <h2 className="text-2xl font-display text-neon-amber tracking-wide">WHALE DEFEATED</h2>
              <p className="text-xs font-mono text-neon-amber/60 mt-1 uppercase tracking-widest">Weekly boss slain</p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Sparkles className="h-4 w-4 text-neon-purple mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-purple">+2 SP</div>
                <div className="text-[10px] text-muted-foreground">Claimed</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Crown className="h-4 w-4 text-neon-amber mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-amber">Crown</div>
                <div className="text-[10px] text-muted-foreground">On ranks</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Fish className="h-4 w-4 text-neon-green mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-green">Slain</div>
                <div className="text-[10px] text-muted-foreground">This epoch</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Regular transactions return tomorrow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isBossDay) {
    const boss = missions[0];
    const displayDuration = Math.floor(boss.duration * durationModifier);
    const showExpanded = expandedMission === "boss";

    return (
      <div className="space-y-4">
        {/* Event header */}
        <div className="relative overflow-hidden rounded-xl border border-neon-amber/40 bg-gradient-to-b from-neon-amber/10 via-neon-amber/5 to-transparent backdrop-blur-md">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_70%)] bg-black/30 pointer-events-none" />
          <div className="relative p-5 text-center space-y-3">
            <p className="text-[10px] font-mono text-neon-amber/60 uppercase tracking-[0.2em]">Sunday Weekly Event</p>
            <div className="flex items-center justify-center gap-3">
              <Fish className="h-7 w-7 text-neon-amber drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
              <h2 className="text-3xl font-display text-neon-amber tracking-wide">WHALE HUNT</h2>
              <Fish className="h-7 w-7 text-neon-amber drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] -scale-x-100" />
            </div>
            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
              A massive whale has surfaced. One chance per epoch to take it down.
            </p>

            {/* Key rewards - what matters */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Sparkles className="h-4 w-4 text-neon-purple mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-purple">+2 SP</div>
                <div className="text-[10px] text-muted-foreground">Skill Points</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Crown className="h-4 w-4 text-neon-amber mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-amber">Crown</div>
                <div className="text-[10px] text-muted-foreground">Leaderboard</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
                <Sparkles className="h-4 w-4 text-neon-green mx-auto mb-1" />
                <div className="text-sm font-bold font-mono text-neon-green">20%</div>
                <div className="text-[10px] text-muted-foreground">NFT Drop</div>
              </div>
            </div>

            {/* Bonus loot info */}
            <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <img src={expIcon} alt="" className="h-[18px] w-[18px]" />
                <span className="font-mono">500-1000 XP</span>
              </span>
              <span className="flex items-center gap-1">
                <img src={scrapIcon} alt="" className="h-6 w-6" />
                <span className="font-mono">200-500</span>
              </span>
              <span className="flex items-center gap-1">
                <img src={crystalIcon} alt="" className="h-6 w-6" />
                <span className="font-mono">50-100</span>
              </span>
              <span className="flex items-center gap-1">
                <img src={artifactIcon} alt="" className="h-6 w-6" />
                <span className="font-mono">2-5</span>
              </span>
            </div>
          </div>

          {/* Boss stats bar */}
          <div className="border-t border-neon-amber/20 bg-white/[0.02] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{formatDuration(displayDuration)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-neon-red">
                <Skull className="h-3.5 w-3.5" />
                <span className="font-mono">{boss.failRate}% fail</span>
              </span>
            </div>
            {bossLocked ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Requires Lv.5</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="bg-neon-amber/20 text-neon-amber border border-neon-amber/40 hover:bg-neon-amber/30"
                disabled={!canStart}
                onClick={() => toggleExpanded("boss")}
              >
                {showExpanded ? "Cancel" : "Begin Hunt"}
              </Button>
            )}
          </div>

          {/* Expanded: reroll/insurance/launch */}
          {showExpanded && !bossLocked && (
            <div className="border-t border-neon-amber/20 bg-white/[0.02] px-5 py-3 space-y-2 animate-fade-in-up">
              {/* Reroll stacks */}
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Reroll</span>
                  <span className="text-neon-cyan ml-1 font-mono">-{rerollStacks * REROLL_REDUCTION}% fail</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={rerollStacks <= 0} onClick={() => setRerollStacks(s => s - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="font-mono text-sm w-4 text-center">{rerollStacks}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={rerollStacks >= MAX_REROLL_STACKS || !canAffordReroll} onClick={() => setRerollStacks(s => s + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  {rerollStacks > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <img src={scrapIcon} alt="" className="h-5 w-5" />
                      <span className="font-mono">{rerollCost}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Insurance */}
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="text-neon-amber ml-1">protect streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={insured ? "default" : "ghost"}
                    size="sm"
                    className={`h-6 text-xs px-2 ${insured ? "bg-neon-amber/20 text-neon-amber border border-neon-amber/40" : ""}`}
                    disabled={!insured && !canAffordInsurance}
                    onClick={() => setInsured(!insured)}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {insured ? "ON" : "OFF"}
                  </Button>
                  {insured && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <img src={crystalIcon} alt="" className="h-5 w-5" />
                      <span className="font-mono">{insuranceCost}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Adjusted fail rate */}
              {(rerollStacks > 0 || insured) && (
                <div className="text-xs text-center text-muted-foreground pt-1">
                  Fail rate: <span className="line-through">{boss.failRate}%</span>{" "}
                  <span className="text-neon-green font-mono">{Math.max(0, boss.failRate - rerollStacks * REROLL_REDUCTION)}%</span>
                  {insured && <span className="text-neon-amber ml-2">+ streak safe</span>}
                </div>
              )}

              <Button
                className="w-full bg-neon-amber/20 text-neon-amber border border-neon-amber/40 hover:bg-neon-amber/30"
                size="sm"
                onClick={() => handleStartMission("boss")}
              >
                Hunt the Whale
              </Button>
            </div>
          )}
        </div>

        {!canStart && (
          <p className="text-xs text-muted-foreground text-center">
            {characterState === "on_mission"
              ? "Node is processing on chain"
              : "Node is recovering from slash"}
          </p>
        )}
        {import.meta.env.DEV && (
          <p className="text-[9px] text-muted-foreground/50 text-center font-mono">
            dbg: state={characterState} lvl={characterLevel} canStart={String(canStart)} bossLocked={String(bossLocked)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
      <h3 className="text-base font-display font-semibold text-white">Transactions</h3>
      <div className="space-y-3">
        {missions.map((mission) => {
          const locked = isTierLocked(mission.id);
          const lockLabel = getTierLabel(mission.id);
          const displayDuration = Math.floor(mission.duration * durationModifier);
          const riskLevel = getRiskLevel(mission.id, lives);
          const dynamicLabel = RISK_LABELS[mission.id]?.[lives] ?? mission.name;

          const r = mission.rewards;

          return (
            <div
              key={mission.id}
              className={`rounded-lg border p-3 transition-all duration-200 bg-white/[0.02] space-y-2 ${locked ? "opacity-50 border-white/[0.06]" : `${RISK_STYLES[riskLevel]} ${!locked ? "hover:-translate-y-0.5 hover:bg-white/[0.04]" : ""}`
                } ${riskLevel === "critical" && !locked ? "animate-pulse" : ""}`}
            >
              {/* Top row: name + start button */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {riskLevel === "critical" && !locked && <Skull className="h-3.5 w-3.5 text-neon-red" />}
                    <p className={`font-medium text-sm ${riskLevel === "critical" && !locked ? "text-neon-red" :
                      riskLevel === "dangerous" && !locked ? "text-neon-red/80" :
                        riskLevel === "risky" && !locked ? "text-neon-amber" : ""
                      }`}>
                      {locked ? mission.name : dynamicLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{formatDuration(displayDuration)}</span>
                    </span>
                    <span className={`flex items-center gap-1 ${riskLevel === "critical" || riskLevel === "dangerous" ? "text-neon-red font-medium" :
                      riskLevel === "risky" ? "text-neon-amber" : ""
                      }`}>
                      <AlertTriangle className="h-3 w-3" />
                      <span className="font-mono">{mission.failRate}%</span>
                    </span>
                  </div>
                  {lockLabel && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      <span>{lockLabel}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!canStart || locked}
                  onClick={() => toggleExpanded(mission.id)}
                  variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
                >
                  {locked ? "Locked" : expandedMission === mission.id ? "Cancel" : "Start"}
                </Button>
              </div>

              {/* Rewards row */}
              {!locked && (
                <div className="flex items-center gap-3 border-t border-white/[0.04] pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <img src={expIcon} alt="" className="h-[18px] w-[18px]" />
                    <span className="font-mono">{r.xpRange[0]}-{r.xpRange[1]}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <img src={scrapIcon} alt="" className="h-6 w-6" />
                    <span className="font-mono">{r.scrap[0]}-{r.scrap[1]}</span>
                  </span>
                  {r.crystal && (
                    <span className="flex items-center gap-1">
                      <img src={crystalIcon} alt="" className="h-6 w-6" />
                      <span className="font-mono">{r.crystal[0]}-{r.crystal[1]}</span>
                    </span>
                  )}
                  {r.artifact && (
                    <span className="flex items-center gap-1">
                      <img src={artifactIcon} alt="" className="h-6 w-6" />
                      <span className="font-mono">{r.artifact[0]}-{r.artifact[1]}</span>
                    </span>
                  )}
                  {r.nftChance && r.nftChance > 0 && (
                    <span className="flex items-center gap-1 text-neon-amber">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-mono">{r.nftChance}%</span>
                    </span>
                  )}
                </div>
              )}

              {/* Reroll & Insurance panel */}
              {expandedMission === mission.id && !locked && (
                <div className="border-t border-white/[0.06] pt-2 space-y-2 animate-fade-in-up">
                  {/* Reroll stacks */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Reroll</span>
                      <span className="text-neon-cyan ml-1 font-mono">-{rerollStacks * REROLL_REDUCTION}% fail</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={rerollStacks <= 0}
                        onClick={() => setRerollStacks(s => s - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-mono text-sm w-4 text-center">{rerollStacks}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={rerollStacks >= MAX_REROLL_STACKS || !canAffordReroll}
                        onClick={() => setRerollStacks(s => s + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      {rerollStacks > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <img src={scrapIcon} alt="" className="h-5 w-5" />
                          <span className="font-mono">{rerollCost}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Insurance toggle */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Insurance</span>
                      <span className="text-neon-amber ml-1">protect streak</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={insured ? "default" : "ghost"}
                        size="sm"
                        className={`h-6 text-xs px-2 ${insured ? "bg-neon-amber/20 text-neon-amber border border-neon-amber/40" : ""}`}
                        disabled={!insured && !canAffordInsurance}
                        onClick={() => setInsured(!insured)}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {insured ? "ON" : "OFF"}
                      </Button>
                      {insured && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <img src={crystalIcon} alt="" className="h-5 w-5" />
                          <span className="font-mono">{insuranceCost}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Adjusted fail rate preview */}
                  {(rerollStacks > 0 || insured) && (
                    <div className="text-xs text-center text-muted-foreground pt-1">
                      Fail rate: <span className="line-through">{mission.failRate}%</span>{" "}
                      <span className="text-neon-green font-mono">{Math.max(0, mission.failRate - rerollStacks * REROLL_REDUCTION)}%</span>
                      {insured && <span className="text-neon-amber ml-2">+ streak safe</span>}
                    </div>
                  )}

                  {/* Launch button */}
                  <Button
                    className="w-full"
                    size="sm"
                    variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
                    onClick={() => handleStartMission(mission.id)}
                  >
                    Send Transaction
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {!canStart && (
          <p className="text-xs text-muted-foreground text-center">
            {characterState === "on_mission"
              ? "Node is processing on chain"
              : "Node is recovering from slash"}
          </p>
        )}
      </div>
    </div>
  );
}
