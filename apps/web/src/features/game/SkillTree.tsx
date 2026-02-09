import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import type { SkillNode, UnlockedSkill } from "@solanaidle/shared";

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skill Tree</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedSkills.map((skill, i) => {
          const isUnlocked = unlockedIds.includes(skill.id);
          const isAvailable = data.available.includes(skill.id);
          const canAfford = data.skillPoints >= skill.cost;

          return (
            <div key={skill.id}>
              {i > 0 && (
                <div className="flex justify-center py-0.5">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div
                className={`rounded-lg border p-3 ${
                  isUnlocked
                    ? "border-primary bg-primary/10"
                    : isAvailable && canAfford
                      ? "border-dashed border-primary/50"
                      : "border-muted opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {skill.name}
                      {isUnlocked && (
                        <Badge variant="default" className="text-xs py-0">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {skill.description}
                    </div>
                  </div>
                  {!isUnlocked && isAvailable && (
                    <Button
                      size="sm"
                      variant={canAfford ? "default" : "outline"}
                      disabled={!canAfford || unlocking !== null}
                      onClick={() => handleUnlock(skill.id)}
                    >
                      {unlocking === skill.id ? "..." : `${skill.cost} SP`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
