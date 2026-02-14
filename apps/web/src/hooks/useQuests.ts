import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { QuestStatus } from "@solanaidle/shared";

interface SwapOrder {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  routePlan: unknown[];
  contextSlot?: number;
  swapTransaction?: string;
}

interface Prediction {
  id: string;
  marketId: string;
  title: string;
  description: string;
  options: { label: string; odds: number }[];
  expiresAt: string;
}

export function useQuests() {
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<QuestStatus>("/quests/status");
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const completePriceScout = useCallback(
    async (mint: string) => {
      await api("/quests/price-scout", {
        method: "POST",
        body: JSON.stringify({ mint }),
      });
      await refresh();
    },
    [refresh],
  );

  const completeTokenScan = useCallback(
    async (query: string) => {
      await api("/quests/token-scan", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      await refresh();
    },
    [refresh],
  );

  const completePortfolioCheck = useCallback(async () => {
    await api("/quests/portfolio-check", {
      method: "POST",
    });
    await refresh();
  }, [refresh]);

  const completePnlReport = useCallback(async () => {
    await api("/quests/pnl-report", {
      method: "POST",
    });
    await refresh();
  }, [refresh]);

  const completeMicroSwap = useCallback(
    async (signature: string) => {
      await api("/quests/micro-swap", {
        method: "POST",
        body: JSON.stringify({ signature }),
      });
      await refresh();
    },
    [refresh],
  );

  const completePredictionBet = useCallback(
    async (marketId: string, signature: string) => {
      await api("/quests/prediction-bet", {
        method: "POST",
        body: JSON.stringify({ marketId, signature }),
      });
      await refresh();
    },
    [refresh],
  );

  const getSwapOrder = useCallback(
    async (inputMint: string, outputMint: string, amount: number) => {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(amount),
      });
      return api<SwapOrder>(`/quests/swap-order?${params.toString()}`);
    },
    [],
  );

  const getPredictions = useCallback(async () => {
    return api<Prediction[]>("/quests/predictions");
  }, []);

  return {
    status,
    loading,
    refresh,
    completePriceScout,
    completeTokenScan,
    completePortfolioCheck,
    completePnlReport,
    completeMicroSwap,
    completePredictionBet,
    getSwapOrder,
    getPredictions,
  };
}
