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

export function usePerks() {
  const [state, setState] = useState<PerkState>({
    activePerks: [],
    offers: [],
    hasPending: false,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
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
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load perks",
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const choosePerk = useCallback(async (perkId: string) => {
    await api("/perks/choose", {
      method: "POST",
      body: JSON.stringify({ perkId }),
    });
    await refresh();
  }, [refresh]);

  return {
    ...state,
    choosePerk,
    refresh,
  };
}
