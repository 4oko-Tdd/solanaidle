import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Zap, CheckCircle2, Sparkles } from "lucide-react";
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
      <div className="p-3 pt-2 space-y-1.5">
        {sortedSkills.map((skill) => {
          const isUnlocked = unlockedIds.includes(skill.id);
          const isAvailable = data.available.includes(skill.id);
          const canAfford = data.skillPoints >= skill.cost;
          const isLocked = !isUnlocked && !isAvailable;

          return (
            <div
              key={skill.id}
              className={`rounded-lg border px-2.5 py-2 transition-all duration-200 ${
                isUnlocked
                  ? "border-[#14F195]/40 bg-[#14F195]/[0.07]"
                  : isAvailable && canAfford
                    ? "border-[#9945FF]/50 bg-[#9945FF]/[0.06] border-dashed"
                    : isAvailable && !canAfford
                      ? "border-[#9945FF]/20 bg-[#0d1f35]/60"
                      : "border-[#1a3a5c]/30 bg-[#0d1f35]/40 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status icon */}
                  {isUnlocked ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#14F195]" />
                  ) : isLocked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[#4a7a9b]/50" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 shrink-0 text-[#9945FF]" />
                  )}

                  {/* Tier badge */}
                  <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${
                    isUnlocked
                      ? "bg-[#14F195]/10 text-[#14F195]"
                      : "bg-[#1a3a5c]/40 text-[#4a7a9b]"
                  }`}>
                    T{skill.tier}
                  </span>

                  {/* Name + Description inline */}
                  <div className="min-w-0">
                    <span className={`text-xs font-display font-medium ${
                      isUnlocked ? "text-white" : isAvailable ? "text-[#c4d4e0]" : "text-[#4a7a9b]"
                    }`}>
                      {skill.name}
                    </span>
                    <span className={`text-[10px] ml-1.5 ${
                      isUnlocked ? "text-[#7ab8d9]" : "text-[#4a7a9b]/70"
                    }`}>
                      {skill.description}
                    </span>
                  </div>
                </div>

                {/* Unlock button */}
                {!isUnlocked && isAvailable && (
                  <Button
                    size="sm"
                    className={`shrink-0 text-[10px] h-6 px-2 ${
                      canAfford
                        ? "bg-[#9945FF]/80 hover:bg-[#9945FF] text-white border border-[#9945FF]/50"
                        : "bg-transparent border border-[#4a7a9b]/30 text-[#4a7a9b]"
                    }`}
                    disabled={!canAfford || unlocking !== null}
                    onClick={() => handleUnlock(skill.id)}
                  >
                    {unlocking === skill.id ? "..." : (
                      <span className="flex items-center gap-0.5 font-mono">
                        <Sparkles className="h-2.5 w-2.5" />
                        {skill.cost}
                      </span>
                    )}
                  </Button>
                )}

                {/* Unlocked badge */}
                {isUnlocked && (
                  <span className="shrink-0 text-[9px] font-mono text-[#14F195]/70">ON</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
