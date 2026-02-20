import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { TrophyCaseData, RelicItem, BadgeItem } from "@solanaidle/shared";

export function useNfts() {
  const [relics, setRelics] = useState<RelicItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<TrophyCaseData>("/nfts");
      setRelics(data.relics);
      setBadges(data.badges);
    } catch {
      // Not critical — trophy case can be empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { relics, badges, loading, refresh };
}
