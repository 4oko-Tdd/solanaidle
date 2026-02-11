import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissionType, CharacterState, MissionId, ClassId } from "@solanaidle/shared";
import { Clock, Skull, Lock, AlertTriangle, Star, Sparkles } from "lucide-react";
import scrapIcon from "@/assets/icons/19.png";
import crystalIcon from "@/assets/icons/22.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  missions: MissionType[];
  characterState: CharacterState;
  onStart: (missionId: MissionId) => void;
  characterLevel?: number;
  classId?: ClassId | null;
  durationModifier?: number;
  livesRemaining?: number;
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

export function MissionPanel({ missions, characterState, onStart, characterLevel = 1, classId, durationModifier = 1, livesRemaining = 3 }: Props) {
  const canStart = characterState === "idle";
  const lives = Math.max(1, Math.min(3, livesRemaining));

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
                  onClick={() => onStart(mission.id)}
                  variant={riskLevel === "critical" || riskLevel === "dangerous" ? "destructive" : "default"}
                >
                  {locked ? "Locked" : "Start"}
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
