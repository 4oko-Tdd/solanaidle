import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ShieldHalf, Sparkles, Trophy, Crown, Medal } from "lucide-react";
import { api } from "@/lib/api";
import type { LeaderboardEntry, ClassId } from "@solanaidle/shared";

const CLASS_ICONS: Record<ClassId, React.ReactNode> = {
  scout: <Zap className="h-3.5 w-3.5 text-yellow-500" />,
  guardian: <ShieldHalf className="h-3.5 w-3.5 text-blue-500" />,
  mystic: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
};

const RANK_ICONS: React.ReactNode[] = [
  <Trophy key="1" className="h-4 w-4 text-yellow-500" />,
  <Medal key="2" className="h-4 w-4 text-gray-400" />,
  <Medal key="3" className="h-4 w-4 text-amber-600" />,
];

function truncateWallet(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

interface Props {
  currentWallet?: string;
}

export function LeaderboardPanel({ currentWallet }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api<LeaderboardEntry[]>("/runs/leaderboard");
        setEntries(data);
      } catch {
        // ignore
      }
    };
    fetchLeaderboard();
  }, []);

  if (entries.length === 0) return null;

  const displayEntries = expanded ? entries : entries.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Weekly Leaderboard</span>
          <Badge variant="outline">{entries.length} players</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {displayEntries.map((entry) => {
          const isMe = currentWallet && entry.walletAddress === currentWallet;
          return (
            <div
              key={entry.rank}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                isMe ? "bg-primary/10 font-medium" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 flex justify-center">
                  {entry.rank <= 3
                    ? RANK_ICONS[entry.rank - 1]
                    : <span className="font-mono text-muted-foreground text-xs">#{entry.rank}</span>}
                </span>
                {CLASS_ICONS[entry.classId]}
                <span className="font-mono text-xs">
                  {isMe ? "You" : truncateWallet(entry.walletAddress)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {entry.bossDefeated && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                <span className="font-bold">{entry.score}</span>
              </div>
            </div>
          );
        })}

        {entries.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : `Show all ${entries.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
