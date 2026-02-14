import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { QuestStatus } from "@solanaidle/shared";

// Response shapes from quest endpoints
export interface TokenResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
  logoURI: string | null;
  daily_volume: number | null;
  price: number | null;
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  priceChange24h: number | null;
  isVerified: boolean;
  organicScore: string | null;
}

export interface PortfolioResult {
  solBalance: number;
  solUsdPrice: number;
  totalUsd: number;
  tokens: { mint: string; uiAmount: number; usdPrice: number; usdValue: number }[];
}

export interface PriceWatchResult {
  priceChanges: {
    mint: string;
    isSOL: boolean;
    usdPrice: number;
    priceChange24h: number;
    held: number;
  }[];
}

interface QuestResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export function useQuests() {
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Persist quest results in the hook so they survive parent re-renders
  const [tokenResults, setTokenResults] = useState<TokenResult[] | null>(null);
  const [portfolioResults, setPortfolioResults] = useState<PortfolioResult | null>(null);
  const [priceWatchResults, setPriceWatchResults] = useState<PriceWatchResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<QuestStatus>("/quests/status");
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTokenScan = useCallback(
    async (query: string) => {
      const res = await api<QuestResponse<{ tokens: TokenResult[] }>>("/quests/token-scan", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setTokenResults(res.data?.tokens ?? []);
      await refresh();
      return res.data;
    },
    [refresh],
  );

  const completePortfolioCheck = useCallback(async () => {
    const res = await api<QuestResponse<PortfolioResult>>("/quests/portfolio-check", {
      method: "POST",
    });
    if (res.data) setPortfolioResults(res.data);
    await refresh();
    return res.data;
  }, [refresh]);

  const completePriceWatch = useCallback(async () => {
    const res = await api<QuestResponse<PriceWatchResult>>("/quests/pnl-report", {
      method: "POST",
    });
    if (res.data) setPriceWatchResults(res.data);
    await refresh();
    return res.data;
  }, [refresh]);

  const completeMicroSwap = useCallback(
    async (signature: string) => {
      const res = await api<QuestResponse>("/quests/micro-swap", {
        method: "POST",
        body: JSON.stringify({ signature }),
      });
      await refresh();
      return res;
    },
    [refresh],
  );

  return {
    status,
    loading,
    refresh,
    completeTokenScan,
    completePortfolioCheck,
    completePriceWatch,
    completeMicroSwap,
    tokenResults,
    portfolioResults,
    priceWatchResults,
  };
}
