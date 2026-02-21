import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { DailyLoginStatus } from "@solanaidle/shared";

interface UseDailyLoginReturn {
  status: DailyLoginStatus | null;
  loading: boolean;
  onClaim: () => Promise<void>;
}

export function useDailyLogin(isAuthenticated: boolean): UseDailyLoginReturn {
  const [status, setStatus] = useState<DailyLoginStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const s = await api<DailyLoginStatus>("/daily/status");
      setStatus(s);
    } catch {
      // ignore — daily login is non-critical
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const onClaim = useCallback(async () => {
    await api("/daily/claim", { method: "POST" });
    await fetchStatus();
  }, [fetchStatus]);

  return { status, loading, onClaim };
}
