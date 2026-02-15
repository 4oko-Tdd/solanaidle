import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { WorldBoss } from "@solanaidle/shared";

interface BossStatus {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution?: number;
}

interface BossState {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution: number;
  loading: boolean;
  error: string | null;
}

export function useBoss() {
  const [state, setState] = useState<BossState>({
    boss: null,
    participantCount: 0,
    totalDamage: 0,
    playerContribution: 0,
    loading: true,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api<BossStatus>("/boss");
      setState({
        boss: data.boss,
        participantCount: data.participantCount,
        totalDamage: data.totalDamage,
        playerContribution: data.playerContribution ?? 0,
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

  useEffect(() => {
    refresh();
    // Poll every 30s during boss phase
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const join = useCallback(async () => {
    await api("/boss/join", { method: "POST" });
    await refresh();
  }, [refresh]);

  const overload = useCallback(async () => {
    await api("/boss/overload", { method: "POST" });
    await refresh();
  }, [refresh]);

  return {
    ...state,
    join,
    overload,
    refresh,
  };
}
