import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { DailyChallengesStatus } from "@solanaidle/shared";

export function useChallenges(isAuthenticated: boolean) {
  const [data, setData] = useState<DailyChallengesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<DailyChallengesStatus>("/challenges"));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load challenges");
    } finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const rerollChallenge = useCallback(async (questId: string, paymentSignature: string) => {
    const res = await api<DailyChallengesStatus>("/challenges/reroll", {
      method: "POST",
      body: JSON.stringify({ questId, paymentSignature }),
    });
    setData(res);
  }, []);

  return { data, loading, error, refresh, rerollChallenge };
}
