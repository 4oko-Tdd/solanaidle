import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId, ClassId, Inventory } from "@solanaidle/shared";
import { Clock, Skull, Lock, AlertTriangle, Star, Sparkles, Shield, Minus, Plus } from "lucide-react";
import scrapIcon from "@/assets/icons/19.png";
import crystalIcon from "@/assets/icons/22.png";
import artifactIcon from "@/assets/icons/25.png";

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
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

const RISK_LABELS: Record<string, Record<number, string>> = {
  scout:     { 3: "Safe Run",     2: "Careful Run",      1: "Last Chance" },
  expedition:{ 3: "Risky Expedition", 2: "High-Risk Mission", 1: "Suicide Mission" },
  deep_dive: { 3: "Dangerous Dive",  2: "Perilous Dive",    1: "Death Wish" },
  boss:      { 3: "Boss Fight",      2: "Do or Die",        1: "Final Stand" },
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

export function MissionPanel({ missions, characterState, onStart, characterLevel = 1, classId, durationModifier = 1, livesRemaining = 3, inventory }: Props) {
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
    if (missionId === "expedition" && characterLevel < 3) return true;
    if (missionId === "deep_dive" && characterLevel < 5) return true;
    if (missionId === "boss" && characterLevel < 5) return true;
    return false;
  };

  const getTierLabel = (missionId: string): string | null => {
    if (missionId === "expedition" && characterLevel < 3) return "Unlocks at Lv.3";
    if (missionId === "deep_dive" && characterLevel < 5) return "Unlocks at Lv.5";
    if (missionId === "boss" && characterLevel < 5) return "Unlocks at Lv.5";
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Missions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
              className={`rounded-lg border p-3 transition-all duration-200 bg-white/[0.02] space-y-2 ${
                locked ? "opacity-50 border-white/[0.06]" : `${RISK_STYLES[riskLevel]} ${!locked ? "hover:-translate-y-0.5 hover:bg-white/[0.04]" : ""}`
              } ${riskLevel === "critical" && !locked ? "animate-pulse" : ""}`}
            >
              {/* Top row: name + start button */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {riskLevel === "critical" && !locked && <Skull className="h-3.5 w-3.5 text-neon-red" />}
                    <p className={`font-medium text-sm ${
                      riskLevel === "critical" && !locked ? "text-neon-red" :
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
                    <span className={`flex items-center gap-1 ${
                      riskLevel === "critical" || riskLevel === "dangerous" ? "text-neon-red font-medium" :
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
                    <Star className="h-3 w-3 text-neon-amber" />
                    <span className="font-mono">{r.xpRange[0]}-{r.xpRange[1]}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <img src={scrapIcon} alt="" className="h-3.5 w-3.5" />
                    <span className="font-mono">{r.scrap[0]}-{r.scrap[1]}</span>
                  </span>
                  {r.crystal && (
                    <span className="flex items-center gap-1">
                      <img src={crystalIcon} alt="" className="h-3.5 w-3.5" />
                      <span className="font-mono">{r.crystal[0]}-{r.crystal[1]}</span>
                    </span>
                  )}
                  {r.artifact && (
                    <span className="flex items-center gap-1">
                      <img src={artifactIcon} alt="" className="h-3.5 w-3.5" />
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
                          <img src={scrapIcon} alt="" className="h-3 w-3" />
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
                          <img src={crystalIcon} alt="" className="h-3 w-3" />
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
                    Launch Mission
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {!canStart && (
          <p className="text-xs text-muted-foreground text-center">
            {characterState === "on_mission"
              ? "Character is on a mission"
              : "Character is recovering"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
