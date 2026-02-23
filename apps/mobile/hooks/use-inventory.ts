import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Inventory } from "@solanaidle/shared";

export function useInventory(isAuthenticated: boolean) {
  const [inventory, setInventory] = useState<Inventory | null>(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const inv = await api<Inventory>("/inventory");
      setInventory(inv);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, [fetch]);

  return inventory;
}
