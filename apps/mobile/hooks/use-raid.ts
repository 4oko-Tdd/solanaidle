import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import type { RaidMission, ActiveRaid } from "@solanaidle/shared";

interface RaidState {
  raids: RaidMission[];
  activeRaid: ActiveRaid | null;
  loading: boolean;
}

export function useRaid(isAuthenticated: boolean) {
  const [state, setState] = useState<RaidState>({
    raids: [],
    activeRaid: null,
    loading: false,
  });

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [available, active] = await Promise.all([
        api<RaidMission[]>("/raids"),
        api<ActiveRaid | null>("/raids/active"),
      ]);
      setState((s) => ({ ...s, raids: available, activeRaid: active }));
    } catch {
      // Not in a guild or network error — leave state as-is
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Countdown timer for active raid
  useEffect(() => {
    if (!state.activeRaid?.timeRemaining || state.activeRaid.timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (!s.activeRaid || !s.activeRaid.timeRemaining) return s;
        const remaining = Math.max(0, s.activeRaid.timeRemaining - 1);
        return { ...s, activeRaid: { ...s.activeRaid, timeRemaining: remaining } };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeRaid?.id]);

  const startRaid = useCallback(
    async (raidId: string) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        await api("/raids/start", { method: "POST", body: JSON.stringify({ raidId }) });
        await fetchData();
      } catch {
        // error
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [fetchData]
  );

  const commitRaid = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await api("/raids/commit", { method: "POST" });
      await fetchData();
    } catch {
      // error
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [fetchData]);

  const claimRaid = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await api("/raids/claim", { method: "POST" });
      await fetchData();
    } catch {
      // error
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [fetchData]);

  return { ...state, startRaid, commitRaid, claimRaid };
}
