import { useNfts } from "@/hooks/useNfts";
import { Award, Gem, ExternalLink, Loader2 } from "lucide-react";
import type { AchievementId } from "@solanaidle/shared";

const ACHIEVEMENT_ICONS: Record<AchievementId, string> = {
  boss_slayer: "💀",
  streak_master: "🔥",
  deep_explorer: "🌌",
  raid_victor: "⚔️",
  epoch_champion: "👑",
};

const EXPLORER_URL = "https://explorer.solana.com/address";
const CLUSTER = "?cluster=devnet";

function shortenAddress(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export function TrophyCase() {
  const { relics, badges, loading } = useNfts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (badges.length === 0 && relics.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1525] p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Award className="h-5 w-5 text-neon-purple/40" />
          <span className="text-sm font-display font-semibold text-muted-foreground">
            Trophy Case
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Complete missions to earn permanent on-chain trophies
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1525] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-neon-purple" />
        <span className="text-sm font-display font-semibold text-white">
          Trophy Case
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {badges.length + relics.length} items
        </span>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Achievements
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-1.5 rounded-lg border border-neon-purple/20 bg-neon-purple/5 px-2.5 py-1.5"
              >
                <span className="text-sm">
                  {ACHIEVEMENT_ICONS[badge.achievementId] ?? "🏅"}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-white leading-none truncate">
                    {badge.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                </div>
                {badge.mintAddress && (
                  <a
                    href={`${EXPLORER_URL}/${badge.mintAddress}${CLUSTER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-neon-cyan/60 hover:text-neon-cyan transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relics */}
      {relics.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Relics
          </p>
          <div className="flex flex-wrap gap-2">
            {relics.map((relic) => (
              <div
                key={relic.id}
                className="flex items-center gap-1.5 rounded-lg border border-neon-amber/20 bg-neon-amber/5 px-2.5 py-1.5"
              >
                <Gem className="h-3.5 w-3.5 text-neon-amber shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-white leading-none truncate">
                    {relic.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {relic.missionId}
                  </p>
                </div>
                {relic.mintAddress && (
                  <a
                    href={`${EXPLORER_URL}/${relic.mintAddress}${CLUSTER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-neon-cyan/60 hover:text-neon-cyan transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
