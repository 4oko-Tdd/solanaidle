// jupiter-service.ts — Wraps Jupiter lite-api.jup.ag endpoints

const BASE = "https://lite-api.jup.ag";

/* ------------------------------------------------------------------ */
/*  1. Token price                                                     */
/* ------------------------------------------------------------------ */

export async function getTokenPrice(
  mintAddress: string
): Promise<{ price: number | null; mint: string }> {
  try {
    const res = await fetch(`${BASE}/price/v3?ids=${encodeURIComponent(mintAddress)}`);
    if (!res.ok) return { price: null, mint: mintAddress };
    const json = await res.json();
    const entry = json?.data?.[mintAddress];
    const price = typeof entry?.price === "number" ? entry.price : null;
    return { price, mint: mintAddress };
  } catch {
    return { price: null, mint: mintAddress };
  }
}

/* ------------------------------------------------------------------ */
/*  2. Token search                                                    */
/* ------------------------------------------------------------------ */

interface TokenSearchResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tags: string[];
  logoURI: string | null;
  daily_volume: number | null;
}

export async function searchToken(query: string): Promise<TokenSearchResult[]> {
  try {
    const res = await fetch(`${BASE}/tokens/v2/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json: unknown[] = await res.json();
    return json.slice(0, 10).map((t: any) => ({
      address: t.address ?? "",
      name: t.name ?? "",
      symbol: t.symbol ?? "",
      decimals: t.decimals ?? 0,
      tags: Array.isArray(t.tags) ? t.tags : [],
      logoURI: t.logoURI ?? null,
      daily_volume: t.daily_volume ?? null,
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  3. Wallet holdings                                                 */
/* ------------------------------------------------------------------ */

interface WalletToken {
  mint: string;
  symbol: string;
  amount: number;
  usdValue: number;
}

export async function getWalletHoldings(
  walletAddress: string
): Promise<{ tokens: WalletToken[]; totalUsd: number }> {
  try {
    const res = await fetch(`${BASE}/ultra/v1/holdings/${encodeURIComponent(walletAddress)}`);
    if (!res.ok) return { tokens: [], totalUsd: 0 };
    const json = await res.json();
    const raw: any[] = Array.isArray(json?.tokens) ? json.tokens : [];
    const tokens: WalletToken[] = raw.map((t: any) => ({
      mint: t.mint ?? t.address ?? "",
      symbol: t.symbol ?? "",
      amount: Number(t.amount ?? t.balance ?? 0),
      usdValue: Number(t.usdValue ?? t.valueUsd ?? 0),
    }));
    const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);
    return { tokens, totalUsd };
  } catch {
    return { tokens: [], totalUsd: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  4. Prediction events                                               */
/* ------------------------------------------------------------------ */

interface PredictionMarket {
  id: string;
  title: string;
  odds: number | null;
}

interface PredictionEvent {
  id: string;
  title: string;
  status: string;
  markets: PredictionMarket[];
}

export async function getPredictionEvents(): Promise<{ events: PredictionEvent[] }> {
  try {
    const res = await fetch(`${BASE}/events`);
    if (!res.ok) return { events: [] };
    const json = await res.json();
    const raw: any[] = Array.isArray(json) ? json : json?.events ?? [];
    const events: PredictionEvent[] = raw.slice(0, 10).map((e: any) => ({
      id: String(e.id ?? ""),
      title: e.title ?? "",
      status: e.status ?? "unknown",
      markets: (Array.isArray(e.markets) ? e.markets : [])
        .slice(0, 3)
        .map((m: any) => ({
          id: String(m.id ?? ""),
          title: m.title ?? "",
          odds: m.odds ?? null,
        })),
    }));
    return { events };
  } catch {
    return { events: [] };
  }
}

/* ------------------------------------------------------------------ */
/*  5. Swap order                                                      */
/* ------------------------------------------------------------------ */

interface SwapOrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
}

export async function getSwapOrder(
  params: SwapOrderParams
): Promise<{ transaction: string | null; error: string | null }> {
  try {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      taker: params.taker,
    });
    const res = await fetch(`${BASE}/ultra/v1/order?${qs.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      return { transaction: null, error: json?.error ?? json?.message ?? "Request failed" };
    }
    return {
      transaction: json?.transaction ?? null,
      error: json?.error ?? null,
    };
  } catch (err) {
    return { transaction: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
