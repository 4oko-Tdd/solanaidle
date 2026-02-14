// jupiter-service.ts — Wraps Jupiter lite-api.jup.ag endpoints

const BASE = "https://lite-api.jup.ag";

/* ------------------------------------------------------------------ */
/*  1. Token price (single)                                            */
/* ------------------------------------------------------------------ */

export async function getTokenPrice(
  mintAddress: string
): Promise<{ price: number | null; mint: string }> {
  try {
    const res = await fetch(`${BASE}/price/v3?ids=${encodeURIComponent(mintAddress)}`);
    if (!res.ok) return { price: null, mint: mintAddress };
    const json = await res.json();
    // Response: { [mint]: { usdPrice: number } } (no nested data key)
    const entry = json?.[mintAddress] ?? json?.data?.[mintAddress];
    const price = entry?.usdPrice ?? entry?.price ?? null;
    return { price: typeof price === "number" ? price : price ? parseFloat(price) : null, mint: mintAddress };
  } catch {
    return { price: null, mint: mintAddress };
  }
}

/* ------------------------------------------------------------------ */
/*  1b. Token prices (batch — up to 50)                                */
/* ------------------------------------------------------------------ */

export interface TokenPriceEntry {
  mint: string;
  usdPrice: number | null;
  priceChange24h: number | null;
}

export async function getTokenPrices(
  mints: string[]
): Promise<TokenPriceEntry[]> {
  if (!mints.length) return [];
  try {
    const ids = mints.slice(0, 50).join(",");
    const res = await fetch(`${BASE}/price/v3?ids=${encodeURIComponent(ids)}`);
    if (!res.ok) return mints.map((m) => ({ mint: m, usdPrice: null, priceChange24h: null }));
    const json = await res.json();
    return mints.map((mint) => {
      const entry = json?.[mint] ?? json?.data?.[mint];
      const raw = entry?.usdPrice ?? entry?.price ?? null;
      const usdPrice = raw != null ? (typeof raw === "number" ? raw : parseFloat(raw)) : null;
      const change = entry?.priceChange24h ?? null;
      const priceChange24h = change != null ? (typeof change === "number" ? change : parseFloat(change)) : null;
      return { mint, usdPrice, priceChange24h };
    });
  } catch {
    return mints.map((m) => ({ mint: m, usdPrice: null, priceChange24h: null }));
  }
}

/* ------------------------------------------------------------------ */
/*  2. Token search                                                    */
/* ------------------------------------------------------------------ */

export interface TokenSearchResult {
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

export async function searchToken(query: string): Promise<TokenSearchResult[]> {
  try {
    const res = await fetch(`${BASE}/tokens/v2/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json: unknown[] = await res.json();
    return json.slice(0, 10).map((t: any) => ({
      address: t.id ?? t.address ?? "",
      name: t.name ?? "",
      symbol: t.symbol ?? "",
      decimals: t.decimals ?? 0,
      tags: Array.isArray(t.tags) ? t.tags : [],
      logoURI: t.icon ?? t.logoURI ?? null,
      daily_volume: t.daily_volume ?? null,
      price: t.usdPrice ?? null,
      mcap: t.mcap ?? null,
      liquidity: t.liquidity ?? null,
      holderCount: t.holderCount ?? null,
      priceChange24h: t.stats24h?.priceChange ?? null,
      isVerified: !!t.isVerified,
      organicScore: t.organicScoreLabel ?? null,
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  3. Wallet holdings                                                 */
/* ------------------------------------------------------------------ */

export interface WalletHolding {
  mint: string;
  uiAmount: number;
  decimals: number;
}

export interface WalletHoldingsResult {
  solBalance: number;
  tokens: WalletHolding[];
}

export async function getWalletHoldings(
  walletAddress: string
): Promise<WalletHoldingsResult> {
  try {
    const res = await fetch(`${BASE}/ultra/v1/holdings/${encodeURIComponent(walletAddress)}`);
    if (!res.ok) return { solBalance: 0, tokens: [] };
    const json = await res.json();
    // Holdings response: { uiAmount: SOL_balance, tokens: { [mint]: [{ uiAmount, decimals }] } }
    const solBalance = Number(json?.uiAmount ?? 0);
    const tokensMap = json?.tokens ?? {};
    const tokens: WalletHolding[] = Object.entries(tokensMap).map(([mint, accounts]: [string, any]) => {
      // Each value is an array of accounts — take the first
      const acct = Array.isArray(accounts) ? accounts[0] : accounts;
      return {
        mint,
        uiAmount: Number(acct?.uiAmount ?? 0),
        decimals: Number(acct?.decimals ?? 0),
      };
    });
    return { solBalance, tokens };
  } catch {
    return { solBalance: 0, tokens: [] };
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
): Promise<{ transaction: string | null; requestId: string | null; error: string | null }> {
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
      return { transaction: null, requestId: null, error: json?.error ?? json?.message ?? "Request failed" };
    }
    return {
      transaction: json?.transaction ?? null,
      requestId: json?.requestId ?? null,
      error: json?.error ?? null,
    };
  } catch (err) {
    return { transaction: null, requestId: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/* ------------------------------------------------------------------ */
/*  6. Execute swap                                                    */
/* ------------------------------------------------------------------ */

export async function executeSwap(
  signedTransaction: string,
  requestId: string
): Promise<{ status: string; signature: string | null; error: string | null }> {
  try {
    const res = await fetch("https://api.jup.ag/ultra/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTransaction, requestId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { status: "error", signature: null, error: json?.error ?? json?.message ?? "Execute failed" };
    }
    return {
      status: json?.status ?? "success",
      signature: json?.signature ?? null,
      error: null,
    };
  } catch (err) {
    return { status: "error", signature: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
