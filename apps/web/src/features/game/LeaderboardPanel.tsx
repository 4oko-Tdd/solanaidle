import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Medal, Loader2, Signal, Swords, Heart } from "lucide-react";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@solanaidle/shared";
import { ClassIcon } from "@/components/ClassIcon";

const RANK_ICONS: React.ReactNode[] = [
  <Trophy key="1" className="h-4 w-4 text-neon-amber" />,
  <Medal key="2" className="h-4 w-4 text-white/40" />,
  <Medal key="3" className="h-4 w-4 text-neon-amber/60" />,
];

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

interface Props {
  currentWallet?: string;
}

export function LeaderboardPanel({ currentWallet }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api<LeaderboardEntry[]>("/runs/leaderboard");
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#4a7a9b]" />
        <p className="text-xs text-[#4a7a9b]">Loading rankings...</p>
      </div>
    );
  }

  const safeEntries = entries ?? [];

  if (safeEntries.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Trophy className="h-6 w-6 text-neon-amber" />
            <h3 className="text-lg font-display font-semibold text-white">Epoch Leaderboard</h3>
          </div>
          <p className="text-xs text-[#4a7a9b] leading-relaxed">
            Compete against other validators each epoch. Complete missions, build streaks, and hunt whales to climb the ranks.
          </p>
        </div>

        {/* Empty state */}
        <div className="rounded-xl border border-dashed border-[#1a3a5c]/60 bg-[#0a1628]/40 p-8 text-center space-y-3">
          <Signal className="h-10 w-10 text-[#4a7a9b]/40 mx-auto" />
          <p className="text-sm font-medium text-[#4a7a9b]">No rankings yet</p>
          <p className="text-xs text-[#4a7a9b]/70 max-w-[240px] mx-auto leading-relaxed">
            Be the first to finalize an epoch and claim the top spot on the leaderboard.
          </p>
        </div>

        {/* How scoring works */}
        <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
          <h4 className="text-sm font-display font-semibold text-white">How Scoring Works</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <Swords className="h-4 w-4 text-[#14F195] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Missions</p>
                <p className="text-xs text-[#4a7a9b]">Each successful transaction adds to your score. Harder missions = more points.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Crown className="h-4 w-4 text-neon-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Streaks</p>
                <p className="text-xs text-[#4a7a9b]">Chain successful missions for multipliers: 2x HODL, 4x Diamond Hands, 6x To The Moon.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Heart className="h-4 w-4 text-neon-red shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white">Survival</p>
                <p className="text-xs text-[#4a7a9b]">3 lives per epoch. Lose them all and your run ends — choose missions wisely.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayEntries = expanded ? safeEntries : safeEntries.slice(0, 10);
  const myEntry = currentWallet ? safeEntries.find(e => e.walletAddress === currentWallet) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-neon-amber" />
            <h3 className="text-base font-display font-semibold text-white">Epoch Leaderboard</h3>
          </div>
          <Badge className="text-xs py-0 px-2 bg-[#1a3a5c]/40 text-[#4a7a9b] border-[#1a3a5c]/60">
            {safeEntries.length} {safeEntries.length === 1 ? "player" : "players"}
          </Badge>
        </div>
        <p className="text-[11px] text-[#4a7a9b] leading-relaxed">
          Top validators this epoch. Finalize your run to lock in your score.
        </p>
      </div>

      {/* Your rank highlight */}
      {myEntry && (
        <div className="rounded-xl border border-[#9945FF]/40 bg-[#9945FF]/[0.08] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#9945FF]">#{myEntry.rank}</span>
            <ClassIcon classId={myEntry.classId} className="h-4 w-4" />
            <span className="text-sm font-medium text-white">You</span>
          </div>
          <span className="font-bold font-mono text-[#14F195]">{myEntry.score}</span>
        </div>
      )}

      {/* Leaderboard rows */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg overflow-hidden">
        {displayEntries.map((entry, i) => {
          const isMe = currentWallet && entry.walletAddress === currentWallet;
          return (
            <div
              key={entry.rank}
              className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                i !== displayEntries.length - 1 ? "border-b border-[#1a3a5c]/30" : ""
              } ${isMe ? "bg-[#9945FF]/[0.06]" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 flex justify-center">
                  {entry.rank <= 3
                    ? RANK_ICONS[entry.rank - 1]
                    : <span className="font-mono text-[#4a7a9b] text-xs">#{entry.rank}</span>}
                </span>
                <ClassIcon classId={entry.classId} className="h-4 w-4" />
                <span className={`font-mono text-xs ${isMe ? "text-white font-medium" : "text-[#7ab8d9]"}`}>
                  {isMe ? "You" : (entry.displayName ?? truncateWallet(entry.walletAddress))}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {entry.bossDefeated && <Crown className="h-3.5 w-3.5 text-neon-amber" />}
                <span className="text-xs text-[#4a7a9b] font-mono">{entry.missionsCompleted}m</span>
                <span className="font-bold font-mono text-[#14F195]">{entry.score}</span>
              </div>
            </div>
          );
        })}

        {safeEntries.length > 10 && (
          <div className="px-3 py-2 border-t border-[#1a3a5c]/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-[#4a7a9b] hover:text-white"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show top 10" : `Show all ${safeEntries.length} players`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
