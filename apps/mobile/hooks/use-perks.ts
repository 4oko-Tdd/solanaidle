import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { PerkDefinition } from "@solanaidle/shared";

interface ActivePerkWithDef extends PerkDefinition {
  stacks: number;
}

interface PerkOffersResponse {
  offers: PerkDefinition[];
  hasPending: boolean;
}

interface PerkState {
  activePerks: ActivePerkWithDef[];
  offers: PerkDefinition[];
  hasPending: boolean;
  loading: boolean;
  error: string | null;
}

type PerksSyncMode = "refresh" | "state";
const listeners = new Set<(mode: PerksSyncMode) => void>();
let optimisticPending = false;

export function notifyPerksChanged() {
  listeners.forEach((listener) => listener("refresh"));
}

export function setPerksPendingOptimistic(pending: boolean) {
  optimisticPending = pending;
  listeners.forEach((listener) => listener("state"));
}

export function usePerks(enabled = true) {
  const [state, setState] = useState<PerkState>({
    activePerks: [],
    offers: [],
    hasPending: false,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({
        activePerks: [],
        offers: [],
        hasPending: false,
        loading: false,
        error: null,
      });
      return;
    }
    try {
      const [activeRes, offersRes] = await Promise.all([
        api<{ perks: ActivePerkWithDef[] }>("/perks/active"),
        api<PerkOffersResponse>("/perks/offers"),
      ]);
      setState({
        activePerks: activeRes.perks,
        offers: offersRes.offers,
        hasPending: offersRes.hasPending,
        loading: false,
        error: null,
      });
      if (!offersRes.hasPending) {
        optimisticPending = false;
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load perks",
      }));
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onSync = (mode: PerksSyncMode) => {
      if (mode === "refresh") {
        void refresh();
        return;
      }
      setState((s) => ({ ...s }));
    };
    listeners.add(onSync);
    return () => {
      listeners.delete(onSync);
    };
  }, [refresh]);

  const choosePerk = useCallback(async (perkId: string) => {
    setPerksPendingOptimistic(false);
    await api("/perks/choose", {
      method: "POST",
      body: JSON.stringify({ perkId }),
    });
    await refresh();
    notifyPerksChanged();
  }, [refresh]);

  return {
    ...state,
    hasPending: enabled ? (state.hasPending || optimisticPending) : false,
    choosePerk,
    refresh,
  };
}
