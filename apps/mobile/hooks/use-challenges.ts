import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { DailyChallengesStatus } from "@solanaidle/shared";

export function useChallenges(isAuthenticated: boolean) {
  const [data, setData] = useState<DailyChallengesStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      setData(await api<DailyChallengesStatus>("/challenges"));
    } catch { /* no character yet */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const rerollChallenge = useCallback(async (questId: string, paymentSignature: string) => {
    const res = await api<DailyChallengesStatus>("/challenges/reroll", {
      method: "POST",
      body: JSON.stringify({ questId, paymentSignature }),
    });
    setData(res);
  }, []);

  return { data, loading, refresh, rerollChallenge };
}
