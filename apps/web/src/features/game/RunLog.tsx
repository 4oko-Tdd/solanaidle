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
  run_start: <Swords className="h-3.5 w-3.5 text-blue-500" />,
  mission_success: <Trophy className="h-3.5 w-3.5 text-yellow-500" />,
  mission_fail: <Skull className="h-3.5 w-3.5 text-red-500" />,
  death: <Skull className="h-3.5 w-3.5 text-red-600" />,
  revive: <Heart className="h-3.5 w-3.5 text-green-500" />,
  level_up: <ArrowUp className="h-3.5 w-3.5 text-blue-400" />,
  boss_kill: <Star className="h-3.5 w-3.5 text-yellow-500" />,
  skill_unlock: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
  nft_drop: <Gem className="h-3.5 w-3.5 text-yellow-400" />,
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
      return `Run started as ${d.classId}`;
    case "mission_success":
      return `${d.missionId} succeeded. +${d.xp} XP, +${d.scrap} scrap${d.crystal ? `, +${d.crystal} crystal` : ""}`;
    case "mission_fail":
      return d.escaped
        ? `${d.missionId} failed — Lucky Escape!`
        : `${d.missionId} failed. Lost 1 life. (${d.livesRemaining} remaining)`;
    case "death":
      return "Died. Recovering...";
    case "revive":
      return "Revived.";
    case "level_up":
      return `Leveled up to Lv.${d.newLevel}`;
    case "boss_kill":
      return "Shadow Boss defeated!";
    case "skill_unlock":
      return `Unlocked: ${d.skillName}`;
    case "nft_drop":
      return `RARE: NFT Drop — ${d.nftName}!`;
    case "run_end":
      return `Run ended. ${d.cause === "death" ? "No lives remaining." : "Score sealed."}`;
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
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium"
      >
        <span>Run Log</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5 max-h-60 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
          {!loading && events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">{EVENT_ICONS[event.eventType]}</span>
              <div>
                <span className="text-muted-foreground">Day {getDayNumber(weekStart, event.createdAt)} — </span>
                <span className={
                  event.eventType === "nft_drop" ? "font-bold text-yellow-500" :
                  event.eventType === "mission_fail" || event.eventType === "death" ? "text-red-400" :
                  event.eventType === "boss_kill" ? "font-bold text-yellow-500" :
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
