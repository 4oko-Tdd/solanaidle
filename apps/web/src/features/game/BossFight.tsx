import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ToastProvider";
import { Swords, Users, Zap, Loader2 } from "lucide-react";
import type { WorldBoss } from "@solanaidle/shared";

interface Props {
  boss: WorldBoss;
  participantCount: number;
  totalDamage: number;
  playerContribution: number;
  hasJoined: boolean;
  overloadUsed: boolean;
  wsConnected?: boolean;
  onJoin: () => Promise<void>;
  onOverload: () => Promise<void>;
  onRefresh: () => void;
}

export function BossFight({ boss, participantCount, totalDamage, playerContribution, hasJoined, overloadUsed, wsConnected, onJoin, onOverload, onRefresh }: Props) {
  const { addToast } = useToast();
  const [joining, setJoining] = useState(false);
  const [overloading, setOverloading] = useState(false);

  const hpPercent = boss.maxHp > 0 ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const isDefeated = boss.killed;
  // hasJoined comes from props (server-tracked)
  const contributionPercent = totalDamage > 0 ? (playerContribution * 100).toFixed(1) : "0.0";

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoin();
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
      await onOverload();
      addToast("OVERLOAD! Critical damage dealt!", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      addToast(err.message || "Overload failed", "error");
    } finally {
      setOverloading(false);
    }
  };

  return (
    <div>
      {/* Boss panel */}
      <div className={`relative rounded-xl border overflow-hidden ${
        isDefeated
          ? "border-neon-green/30 bg-[#0a1628]/80 backdrop-blur-lg"
          : "border-neon-red/30 bg-[#0a1628]/80 backdrop-blur-lg"
      }`}>
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${
          isDefeated
            ? "bg-gradient-to-r from-neon-green via-neon-amber to-neon-green"
            : "bg-gradient-to-r from-neon-red via-neon-purple to-neon-red"
        }`} />

        <div className="p-4 space-y-3">
          {/* Name & HP */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em]">World Boss</p>
              {wsConnected && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
                  <span className="text-[10px] font-mono text-neon-green uppercase">Live</span>
                </span>
              )}
            </div>
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
                <span className="text-xs font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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
              <div className="text-sm text-muted-foreground">Hunters</div>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
              <Swords className="h-4 w-4 text-neon-amber mx-auto mb-1" />
              <div className="text-sm font-bold font-mono text-neon-amber">{totalDamage.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total DMG</div>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5 text-center">
              <Zap className="h-4 w-4 text-neon-purple mx-auto mb-1" />
              <div className="text-sm font-bold font-mono text-neon-purple">{contributionPercent}%</div>
              <div className="text-sm text-muted-foreground">Your Share</div>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Swords className="h-4 w-4 text-neon-green" />
                    <span className="text-sm font-display font-semibold text-neon-green">Hunting</span>
                  </div>
                  {overloadUsed ? (
                    <div className="flex items-center justify-center gap-2 h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] opacity-50">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-display font-semibold text-muted-foreground line-through">OVERLOAD</span>
                      <span className="text-xs text-muted-foreground ml-1">Used</span>
                    </div>
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
            </div>
          )}

          {isDefeated && (
            <div className="text-center space-y-2 pt-1">
              <p className="text-sm font-display font-bold text-neon-green">DEFEATED</p>
              <p className="text-sm text-muted-foreground">
                The Leviathan has been destroyed. Check rewards in your collection.
              </p>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
