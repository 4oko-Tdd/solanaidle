import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { ClassIcon } from "@/components/ClassIcon";
import type { SkillNode, UnlockedSkill, ClassId } from "@solanaidle/shared";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

interface SkillTreeData {
  classId: string;
  skillPoints: number;
  skills: SkillNode[];
  unlocked: UnlockedSkill[];
  available: string[];
}

interface Props {
  onUpdate?: () => void;
}

export function SkillTree({ onUpdate }: Props) {
  const [data, setData] = useState<SkillTreeData | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      const result = await api<SkillTreeData>("/skills");
      setData(result);
    } catch {
      // No active run or error — just don't show
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleUnlock = async (skillId: string) => {
    setUnlocking(skillId);
    try {
      const result = await api<SkillTreeData>("/skills/unlock", {
        method: "POST",
        body: JSON.stringify({ skillId }),
      });
      setData(result);
      onUpdate?.();
    } catch {
      // Handle error silently
    } finally {
      setUnlocking(null);
    }
  };

  if (!data || data.skills.length === 0) return null;

  const sortedSkills = [...data.skills].sort((a, b) => a.tier - b.tier);
  const unlockedIds = data.unlocked.map((u) => u.skillId);
  const unlockedCount = unlockedIds.length;
  const totalCount = data.skills.length;

  return (
    <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-[#1a3a5c]/40">
        <div className="flex items-center gap-2.5">
          <ClassIcon classId={data.classId as ClassId} className="h-6 w-6" />
          <div>
            <h3 className="text-base font-display font-semibold text-white">
              {CLASS_NAMES[data.classId as ClassId] ?? data.classId} Skills
            </h3>
            <p className="text-[11px] text-[#4a7a9b] font-mono">
              {unlockedCount}/{totalCount} unlocked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-[#9945FF]/15 border border-[#9945FF]/30 px-2.5 py-1">
          <Sparkles className="h-3.5 w-3.5 text-[#9945FF]" />
          <span className="text-sm font-mono font-bold text-[#c4a0ff]">{data.skillPoints}</span>
          <span className="text-[10px] text-[#9945FF]/70 font-mono">SP</span>
        </div>
      </div>

      {/* Skill nodes */}
      <div className="p-4 space-y-1">
        {sortedSkills.map((skill, i) => {
          const isUnlocked = unlockedIds.includes(skill.id);
          const isAvailable = data.available.includes(skill.id);
          const canAfford = data.skillPoints >= skill.cost;
          const isLocked = !isUnlocked && !isAvailable;

          return (
            <div key={skill.id}>
              {/* Connector line between nodes */}
              {i > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-px h-3 ${
                      unlockedIds.includes(sortedSkills[i - 1].id)
                        ? "bg-[#14F195]/40"
                        : "bg-[#1a3a5c]/60"
                    }`} />
                    <ChevronDown className={`h-3 w-3 ${
                      unlockedIds.includes(sortedSkills[i - 1].id)
                        ? "text-[#14F195]/40"
                        : "text-[#1a3a5c]/60"
                    }`} />
                  </div>
                </div>
              )}

              {/* Skill node */}
              <div
                className={`rounded-lg border p-3 transition-all duration-200 ${
                  isUnlocked
                    ? "border-[#14F195]/40 bg-[#14F195]/[0.07] shadow-[0_0_12px_rgba(20,241,149,0.08)]"
                    : isAvailable && canAfford
                      ? "border-[#9945FF]/50 bg-[#9945FF]/[0.06] border-dashed hover:bg-[#9945FF]/[0.1] cursor-pointer"
                      : isAvailable && !canAfford
                        ? "border-[#9945FF]/20 bg-[#0d1f35]/60"
                        : "border-[#1a3a5c]/30 bg-[#0d1f35]/40 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Status icon */}
                    <div className={`shrink-0 mt-0.5 rounded-md p-1.5 ${
                      isUnlocked
                        ? "bg-[#14F195]/15"
                        : isAvailable
                          ? "bg-[#9945FF]/15"
                          : "bg-[#1a3a5c]/30"
                    }`}>
                      {isUnlocked ? (
                        <CheckCircle2 className="h-4 w-4 text-[#14F195]" />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4 text-[#4a7a9b]/60" />
                      ) : (
                        <Zap className="h-4 w-4 text-[#9945FF]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Tier + Name row */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isUnlocked
                            ? "bg-[#14F195]/10 text-[#14F195]"
                            : "bg-[#1a3a5c]/40 text-[#4a7a9b]"
                        }`}>
                          T{skill.tier}
                        </span>
                        <span className={`font-medium text-sm font-display ${
                          isUnlocked ? "text-white" : isAvailable ? "text-[#c4d4e0]" : "text-[#4a7a9b]"
                        }`}>
                          {skill.name}
                        </span>
                        {isUnlocked && (
                          <Badge className="text-[10px] py-0 px-1.5 bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30">
                            Active
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className={`text-xs mt-1 leading-relaxed ${
                        isUnlocked ? "text-[#7ab8d9]" : "text-[#4a7a9b]"
                      }`}>
                        {skill.description}
                      </p>
                    </div>
                  </div>

                  {/* Unlock button */}
                  {!isUnlocked && isAvailable && (
                    <Button
                      size="sm"
                      className={`shrink-0 text-xs h-8 ${
                        canAfford
                          ? "bg-[#9945FF]/80 hover:bg-[#9945FF] text-white border border-[#9945FF]/50 shadow-[0_0_10px_rgba(153,69,255,0.2)]"
                          : "bg-transparent border border-[#4a7a9b]/30 text-[#4a7a9b]"
                      }`}
                      disabled={!canAfford || unlocking !== null}
                      onClick={() => handleUnlock(skill.id)}
                    >
                      {unlocking === skill.id ? (
                        "..."
                      ) : (
                        <span className="flex items-center gap-1 font-mono">
                          <Sparkles className="h-3 w-3" />
                          {skill.cost} SP
                        </span>
                      )}
                    </Button>
                  )}

                  {/* Locked indicator */}
                  {isLocked && (
                    <span className="shrink-0 text-[10px] font-mono text-[#4a7a9b]/50 mt-1">
                      Tier {skill.tier}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
