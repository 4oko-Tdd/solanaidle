import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { PermanentLootItem, InventoryCapacity, WeeklyBuff } from "@solanaidle/shared";

interface CollectionData {
  items: PermanentLootItem[];
  capacity: InventoryCapacity;
  weeklyBuffs: WeeklyBuff[];
}

interface CollectionState {
  items: PermanentLootItem[];
  capacity: InventoryCapacity | null;
  weeklyBuffs: WeeklyBuff[];
  loading: boolean;
  error: string | null;
}

export function useCollection() {
  const [state, setState] = useState<CollectionState>({
    items: [],
    capacity: null,
    weeklyBuffs: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await api<CollectionData>("/collection");
      setState({
        items: data.items,
        capacity: data.capacity,
        weeklyBuffs: data.weeklyBuffs,
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load collection",
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sacrifice = useCallback(async (lootId: string) => {
    await api("/collection/sacrifice", {
      method: "POST",
      body: JSON.stringify({ lootId }),
    });
    await refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
    sacrifice,
  };
}
