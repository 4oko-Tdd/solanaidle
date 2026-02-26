import { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import {
  Trophy,
  ArrowUp,
  Sparkles,
  Swords,
  Heart,
  ChevronDown,
  ChevronUp,
  Gem,
  Skull,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { GlassPanel } from "@/components/glass-panel";
import type { RunEvent, RunEventType, WeeklyRun } from "@solanaidle/shared";

interface Props {
  run: WeeklyRun | null;
}

// Event type → icon mapping (built as a function to allow hooks-free JSX)
function getEventIcon(eventType: RunEventType): React.ReactNode {
  switch (eventType) {
    case "run_start":
      return <Swords size={16} color="#00d4ff" />;
    case "mission_success":
      return <Trophy size={16} color="#14F195" />;
    case "mission_fail":
      return <Skull size={16} color="#FF3366" />;
    case "death":
      return <Skull size={16} color="#FF3366" />;
    case "revive":
      return <Heart size={16} color="#14F195" />;
    case "level_up":
      return <ArrowUp size={16} color="#00d4ff" />;
    case "boss_kill":
      return (
        <Image
          source={require("@/assets/icons/exp.png")}
          style={{ width: 20, height: 20 }}
        />
      );
    case "perk_pick":
      return <Sparkles size={16} color="#9945ff" />;
    case "nft_drop":
      return <Gem size={16} color="#ffb800" />;
    case "run_end":
      return <Swords size={16} color="rgba(255,255,255,0.4)" />;
    default:
      return <Swords size={16} color="rgba(255,255,255,0.4)" />;
  }
}

function getDayNumber(weekStart: string, eventDate: string): number {
  const start = new Date(weekStart).getTime();
  const event = new Date(eventDate).getTime();
  return Math.floor((event - start) / 86400000) + 1;
}

function formatEvent(event: RunEvent): string {
  const d = event.data as Record<string, unknown>;
  switch (event.eventType) {
    case "run_start":
      return `Epoch started as ${d.classId}`;
    case "mission_success":
      return `${d.missionId} confirmed. +${d.xp} XP, +${d.scrap} scrap${d.crystal ? `, +${d.crystal} tokens` : ""}`;
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
    case "perk_pick":
      return `Perk acquired: ${d.perkName ?? d.perkId}${d.tier ? ` [${d.tier}]` : ""}`;
    case "nft_drop":
      return `RARE: NFT Drop — ${d.nftName}!`;
    case "run_end":
      return `Epoch ended. ${d.cause === "death" ? "No lives remaining." : "Score finalized."}`;
    default:
      return event.eventType;
  }
}

function getEventTextClass(eventType: RunEventType): string {
  switch (eventType) {
    case "nft_drop":
    case "boss_kill":
      return "font-sans-bold text-neon-amber";
    case "mission_fail":
    case "death":
      return "text-neon-red";
    default:
      return "text-white/80";
  }
}

export function RunLog({ run }: Props) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || !run) return;
    setLoading(true);
    api<RunEvent[]>(`/runs/${run.id}/events`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [run?.id, expanded]);

  if (!run) return null;

  return (
    <GlassPanel contentStyle={{ padding: 0 }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <Text className="text-base font-display text-white">
          Epoch Log
        </Text>
        {expanded ? (
          <ChevronUp size={16} color="rgba(255,255,255,0.6)" />
        ) : (
          <ChevronDown size={16} color="rgba(255,255,255,0.6)" />
        )}
      </Pressable>

      {expanded && (
        <View className="border-t border-white/[0.06] px-4 pb-4 pt-2.5">
          {loading && (
            <View className="items-center py-2">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
            </View>
          )}
          {!loading && events.length === 0 && (
            <Text className="text-sm text-white/40">No events yet.</Text>
          )}
          {!loading && events.length > 0 && (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View className="h-2" />}
              renderItem={({ item: event }) => (
                <View className="flex-row items-start gap-2">
                  <View className="mt-0.5 shrink-0">
                    {getEventIcon(event.eventType)}
                  </View>
                  <View className="flex-1 flex-row flex-wrap">
                    <Text className="text-sm font-mono text-white/40">
                      Day {getDayNumber(run.weekStart, event.createdAt)} —{" "}
                    </Text>
                    <Text className={`text-sm ${getEventTextClass(event.eventType)}`}>
                      {formatEvent(event)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </GlassPanel>
  );
}
