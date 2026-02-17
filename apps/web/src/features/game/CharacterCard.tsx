import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Character, ClassId, WeeklyRun, CharacterState } from "@solanaidle/shared";
import { Heart, HeartCrack } from "lucide-react";
import { ClassIcon } from "@/components/ClassIcon";
import expIcon from "@/assets/icons/exp.png"



const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

interface Props {
  character: Character;
  classId?: ClassId | null;
  livesRemaining?: number;
  run?: WeeklyRun | null;
}

function getStatusBadge(state: CharacterState, runActive?: boolean) {
  if (runActive === false) {
    return <Badge variant="secondary" className="text-xs py-0 px-1.5 bg-muted text-muted-foreground">EPOCH OVER</Badge>;
  }
  if (state === "dead") {
    return <Badge variant="destructive" className="text-xs py-0 px-1.5 animate-pulse bg-neon-red/20 text-neon-red">SLASHED</Badge>;
  }
  if (state === "on_mission") {
    return <Badge className="text-xs py-0 px-1.5 bg-[#9945FF]/20 text-[#c4a0ff]">ON CHAIN</Badge>;
  }
  return <Badge className="text-xs py-0 px-1.5 bg-[#14F195]/15 text-[#14F195]">ONLINE</Badge>;
}

export function CharacterCard({ character, classId, livesRemaining, run }: Props) {
  const xpForNextLevel = Math.floor(75 * Math.pow(1.6, character.level - 1));
  const xpPercent = Math.min(100, Math.round((character.xp / xpForNextLevel) * 100));
  const lives = livesRemaining ?? 3;

  return (
    <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-3 space-y-2">
      {/* Row 1: Class + Level + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {classId && <ClassIcon classId={classId} className="h-10 w-10" />}
          <span className="text-sm font-display font-bold text-white">
            {classId ? CLASS_NAMES[classId] : "Node"}
          </span>
          <div className="flex items-center gap-1 text-[#4a7a9b]">

            <img src={expIcon} alt="" className="h-6 w-6" />
            <span className="text-xs font-mono font-bold text-white">Lv {character.level}</span>
          </div>
        </div>
        {getStatusBadge(character.state, run?.active)}
      </div>

      {/* Row 2: XP bar (thin) */}
      <div className="flex items-center gap-2">
        <Progress value={xpPercent} className="h-1.5 flex-1" />
        <span className="text-xs font-mono text-[#4a7a9b] shrink-0">
          {character.xp}/{xpForNextLevel}
        </span>
      </div>

      {/* Row 3: Lives + Score/Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }, (_, i) =>
            i < lives ? (
              <Heart key={i} className="h-3.5 w-3.5 fill-neon-red text-neon-red" />
            ) : (
              <HeartCrack key={i} className="h-3.5 w-3.5 text-[#1a3a5c]" />
            )
          )}
          {lives === 1 && (
            <span className="ml-1 text-xs font-bold text-neon-red">LAST LIFE</span>
          )}
        </div>
        {run && (
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-[#4a7a9b]">Score <span className="font-mono font-bold text-[#14F195]">{run.score}</span></span>
            {run.streak >= 2 && (
              <span className="text-[#4a7a9b]">
                Streak <span className={`font-mono font-bold ${run.streak >= 6 ? "text-neon-amber" : run.streak >= 4 ? "text-neon-red" : "text-[#14F195]"
                  }`}>{run.streak}x</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Warning banners */}
      {lives === 1 && run?.active && character.state !== "dead" && (
        <div className="rounded bg-neon-red/10 border border-neon-red/30 px-2 py-0.5 text-center animate-pulse">
          <span className="text-xs font-bold text-neon-red">FAILURE MEANS SLASHING. 1 LIFE REMAINING.</span>
        </div>
      )}
      {character.state === "dead" && character.reviveAt && (
        <p className="text-xs text-neon-red text-center">
          Back online at {new Date(character.reviveAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
