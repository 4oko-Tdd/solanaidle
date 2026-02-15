import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBoss } from "@/hooks/useBoss";
import { useToast } from "@/components/ToastProvider";
import { Skull, Swords, Users, Zap, Loader2, Clock } from "lucide-react";

export function BossFight() {
  const { boss, participantCount, totalDamage, playerContribution, loading, join, overload, refresh } = useBoss();
  const { addToast } = useToast();
  const [joining, setJoining] = useState(false);
  const [overloading, setOverloading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-neon-purple" />
      </div>
    );
  }

  if (!boss) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d1525] p-6 text-center space-y-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-neon-red/10 border border-neon-red/20 mx-auto">
          <Skull className="h-7 w-7 text-neon-red/40" />
        </div>
        <h3 className="text-lg font-display text-muted-foreground">No Active Boss</h3>
        <p className="text-xs text-muted-foreground/70 max-w-[260px] mx-auto">
          The Protocol Leviathan spawns on Saturdays. Check back then to join the hunt.
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Clock className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/50 font-mono">Boss phase starts Saturday</span>
        </div>
      </div>
    );
  }

  const hpPercent = boss.maxHp > 0 ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const isDefeated = boss.killed;
  const hasJoined = playerContribution > 0;
  const contributionPercent = totalDamage > 0 ? ((playerContribution / totalDamage) * 100).toFixed(1) : "0.0";

  const handleJoin = async () => {
    setJoining(true);
    try {
      await join();
      addToast("Joined the hunt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      addToast(err.message || "Failed to join", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleOverload = async () => {
    setOverloading(true);
    try {
      await overload();
      addToast("OVERLOAD! Critical damage dealt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      addToast(err.message || "Overload failed", "error");
    } finally {
      setOverloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Boss header */}
      <div className={`relative rounded-2xl border overflow-hidden ${
        isDefeated
          ? "border-neon-green/30 bg-gradient-to-b from-neon-green/5 to-transparent"
          : "border-neon-red/30 bg-gradient-to-b from-neon-red/5 to-transparent"
      }`}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isDefeated
            ? "bg-gradient-to-r from-neon-green via-neon-amber to-neon-green"
            : "bg-gradient-to-r from-neon-red via-neon-purple to-neon-red"
        }`} />

        <div className="p-5 space-y-4">
          {/* Name & HP */}
          <div className="text-center space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">World Boss</p>
            <h2 className={`text-2xl font-display tracking-wide ${isDefeated ? "text-neon-green" : "text-neon-red"}`}>
              {boss.name}
            </h2>
          </div>

          {/* HP Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono">Integrity</span>
              <span className={`font-mono font-bold ${
                hpPercent > 50 ? "text-neon-red" : hpPercent > 20 ? "text-neon-amber" : "text-neon-green"
              }`}>
                {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={hpPercent}
                className="h-4 bg-white/[0.06]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {hpPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
              <Users className="h-4 w-4 text-neon-cyan mx-auto mb-1" />
              <div className="text-sm font-bold font-mono text-neon-cyan">{participantCount}</div>
              <div className="text-[10px] text-muted-foreground">Hunters</div>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
              <Swords className="h-4 w-4 text-neon-amber mx-auto mb-1" />
              <div className="text-sm font-bold font-mono text-neon-amber">{totalDamage.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Total DMG</div>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
              <Zap className="h-4 w-4 text-neon-purple mx-auto mb-1" />
              <div className="text-sm font-bold font-mono text-neon-purple">{contributionPercent}%</div>
              <div className="text-[10px] text-muted-foreground">Your Share</div>
            </div>
          </div>

          {/* Actions */}
          {!isDefeated && (
            <div className="space-y-2">
              {!hasJoined ? (
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30 h-11 font-display"
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Swords className="h-4 w-4 mr-2" />
                  )}
                  Join the Hunt
                </Button>
              ) : (
                <Button
                  onClick={handleOverload}
                  disabled={overloading}
                  className="w-full bg-neon-purple/20 text-neon-purple border border-neon-purple/40 hover:bg-neon-purple/30 h-11 font-display animate-glow-pulse"
                >
                  {overloading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  OVERLOAD
                </Button>
              )}
            </div>
          )}

          {isDefeated && (
            <div className="text-center space-y-2 pt-1">
              <p className="text-sm font-display font-bold text-neon-green">DEFEATED</p>
              <p className="text-xs text-muted-foreground">
                The Leviathan has been destroyed. Check rewards in your collection.
              </p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
