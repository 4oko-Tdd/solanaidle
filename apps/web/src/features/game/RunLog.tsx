import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Trophy,
  Skull,
  ArrowUp,
  Sparkles,
  Swords,
  Heart,
  ChevronDown,
  ChevronUp,
  Star,
  Gem,
} from "lucide-react";
import type { RunEvent, RunEventType } from "@solanaidle/shared";

interface Props {
  runId: string;
  weekStart: string;
}

const EVENT_ICONS: Record<RunEventType, React.ReactNode> = {
  run_start: <Swords className="h-3.5 w-3.5 text-neon-cyan" />,
  mission_success: <Trophy className="h-3.5 w-3.5 text-neon-green" />,
  mission_fail: <Skull className="h-3.5 w-3.5 text-neon-red" />,
  death: <Skull className="h-3.5 w-3.5 text-neon-red" />,
  revive: <Heart className="h-3.5 w-3.5 text-neon-green" />,
  level_up: <ArrowUp className="h-3.5 w-3.5 text-neon-cyan" />,
  boss_kill: <Star className="h-3.5 w-3.5 text-neon-amber" />,
  skill_unlock: <Sparkles className="h-3.5 w-3.5 text-neon-purple" />,
  nft_drop: <Gem className="h-3.5 w-3.5 text-neon-amber" />,
  run_end: <Swords className="h-3.5 w-3.5 text-muted-foreground" />,
};

function getDayNumber(weekStart: string, eventDate: string): number {
  const start = new Date(weekStart).getTime();
  const event = new Date(eventDate).getTime();
  return Math.floor((event - start) / 86400000) + 1;
}

function formatEvent(event: RunEvent): string {
  const d = event.data as Record<string, any>;
  switch (event.eventType) {
    case "run_start":
      return `Epoch started as ${d.classId}`;
    case "mission_success":
      return `${d.missionId} confirmed. +${d.xp} XP, +${d.scrap} lamports${d.crystal ? `, +${d.crystal} tokens` : ""}`;
    case "mission_fail":
      return d.escaped
        ? `${d.missionId} failed — Failover!`
        : `${d.missionId} failed. Lost 1 life. (${d.livesRemaining} remaining)`;
    case "death":
      return "Slashed. Recovering...";
    case "revive":
      return "Back online.";
    case "level_up":
      return `Leveled up to Lv.${d.newLevel}`;
    case "boss_kill":
      return "Whale Hunt complete!";
    case "skill_unlock":
      return `Unlocked: ${d.skillName}`;
    case "nft_drop":
      return `RARE: NFT Drop — ${d.nftName}!`;
    case "run_end":
      return `Epoch ended. ${d.cause === "death" ? "No lives remaining." : "Score finalized."}`;
    default:
      return event.eventType;
  }
}

export function RunLog({ runId, weekStart }: Props) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    api<RunEvent[]>(`/runs/${runId}/events`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [runId, expanded]);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium"
      >
        <span className="font-display">Epoch Log</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2 space-y-1.5 max-h-60 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-2 text-xs animate-slide-in-left">
              <span className="mt-0.5 shrink-0">{EVENT_ICONS[event.eventType]}</span>
              <div>
                <span className="text-muted-foreground font-mono">Day {getDayNumber(weekStart, event.createdAt)} — </span>
                <span className={
                  event.eventType === "nft_drop" ? "font-bold text-neon-amber" :
                  event.eventType === "mission_fail" || event.eventType === "death" ? "text-neon-red" :
                  event.eventType === "boss_kill" ? "font-bold text-neon-amber" :
                  ""
                }>
                  {formatEvent(event)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
