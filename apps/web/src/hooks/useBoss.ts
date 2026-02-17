import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useBossER } from "./useBossER";
import type { WorldBoss } from "@solanaidle/shared";

interface BossStatus {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution?: number;
  hasJoined?: boolean;
  overloadUsed?: boolean;
}

interface BossState {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution: number;
  hasJoined: boolean;
  overloadUsed: boolean;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_DEFAULT = 30000;
const POLL_INTERVAL_WITH_WS = 120000;

export function useBoss() {
  const [state, setState] = useState<BossState>({
    boss: null,
    participantCount: 0,
    totalDamage: 0,
    playerContribution: 0,
    hasJoined: false,
    overloadUsed: false,
    loading: true,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to on-chain boss state via websocket
  const er = useBossER(state.boss !== null && !state.boss.killed);

  const refresh = useCallback(async () => {
    try {
      const data = await api<BossStatus>("/boss");
      setState({
        boss: data.boss,
        participantCount: data.participantCount,
        totalDamage: data.totalDamage,
        playerContribution: data.playerContribution ?? 0,
        hasJoined: data.hasJoined ?? false,
        overloadUsed: data.overloadUsed ?? false,
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load boss",
      }));
    }
  }, []);

  // Adjust polling interval based on websocket connection
  useEffect(() => {
    refresh();
    const interval = er.connected ? POLL_INTERVAL_WITH_WS : POLL_INTERVAL_DEFAULT;
    intervalRef.current = setInterval(refresh, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, er.connected]);

  const join = useCallback(async () => {
    await api("/boss/join", { method: "POST" });
    await refresh();
  }, [refresh]);

  const overload = useCallback(async () => {
    await api("/boss/overload", { method: "POST" });
    await refresh();
  }, [refresh]);

  // Merge on-chain state with HTTP state when websocket is connected
  const mergedBoss: WorldBoss | null = state.boss
    ? er.connected && er.onChainHp !== null
      ? {
          ...state.boss,
          currentHp: er.onChainHp,
          killed: er.onChainKilled ?? state.boss.killed,
        }
      : state.boss
    : null;

  return {
    ...state,
    boss: mergedBoss,
    participantCount: er.connected && er.onChainParticipants !== null
      ? er.onChainParticipants
      : state.participantCount,
    totalDamage: er.connected && er.onChainTotalDamage !== null
      ? er.onChainTotalDamage
      : state.totalDamage,
    wsConnected: er.connected,
    join,
    overload,
    refresh,
  };
}
