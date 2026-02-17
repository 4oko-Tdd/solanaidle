import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useQuests } from "../../hooks/useQuests";
import type { TokenResult, PortfolioResult, PriceWatchResult } from "../../hooks/useQuests";
import type { QuestId, ActiveBoost } from "@solanaidle/shared";
import { api } from "@/lib/api";
import {
  Search,
  Briefcase,
  TrendingUp,
  ArrowRightLeft,
  CheckCircle2,
  Zap,
  Clock,
  Gem,
  Loader2,
  AlertCircle,
  Coins,
  Info,
  ShieldCheck,
  Users,
  Droplets,
} from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import jupiterLogo from "../../assets/icons/poweredbyjupiter-dark.svg";
import scrapIcon from "@/assets/icons/scrap.png";
import crystalIcon from "@/assets/icons/tokens.png";
import artifactIcon from "@/assets/icons/key.png";

// ── Constants ──

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SWAP_AMOUNT = "1000000"; // 0.001 SOL in lamports

// ── Base64 helpers (chunk-safe for mobile) ──

function b64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64Encode(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode(...bytes.slice(i, i + CHUNK)));
  }
  return btoa(chunks.join(""));
}

// ── Reward icons ──

function RewardIcons({ scrap, crystal, artifact, boost }: {
  scrap?: number;
  crystal?: number;
  artifact?: number;
  boost?: { type: string; percentBonus: number };
}) {
  const BOOST_ICON: Record<string, { icon: React.ReactNode; cls: string }> = {
    xp: { icon: <Zap className="h-2.5 w-2.5" />, cls: "text-neon-amber" },
    speed: { icon: <Clock className="h-2.5 w-2.5" />, cls: "text-neon-cyan" },
    loot_chance: { icon: <Gem className="h-2.5 w-2.5" />, cls: "text-neon-purple" },
  };

  return (
    <div className="flex items-center gap-1.5">
      {!!scrap && (
        <span className="inline-flex items-center gap-0.5">
          <img src={scrapIcon} alt="" className="h-5 w-5" />
          <span className="text-[9px] font-mono text-white/50">{scrap}</span>
        </span>
      )}
      {!!crystal && (
        <span className="inline-flex items-center gap-0.5">
          <img src={crystalIcon} alt="" className="h-5 w-5" />
          <span className="text-[9px] font-mono text-white/50">{crystal}</span>
        </span>
      )}
      {!!artifact && (
        <span className="inline-flex items-center gap-0.5">
          <img src={artifactIcon} alt="" className="h-5 w-5" />
          <span className="text-[9px] font-mono text-white/50">{artifact}</span>
        </span>
      )}
      {boost && (
        <span className={`inline-flex items-center gap-0.5 ${BOOST_ICON[boost.type]?.cls ?? "text-neon-amber"}`}>
          {BOOST_ICON[boost.type]?.icon ?? <Zap className="h-2.5 w-2.5" />}
          <span className="text-[9px] font-mono opacity-70">+{boost.percentBonus}%</span>
        </span>
      )}
    </div>
  );
}

// ── Boost pill ──

const BOOST_LABEL: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  xp: { label: "XP", cls: "text-neon-amber border-neon-amber/20 bg-neon-amber/10", icon: <Zap className="h-2.5 w-2.5" /> },
  speed: { label: "Speed", cls: "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/10", icon: <Clock className="h-2.5 w-2.5" /> },
  loot_chance: { label: "Loot", cls: "text-neon-purple border-neon-purple/20 bg-neon-purple/10", icon: <Gem className="h-2.5 w-2.5" /> },
};

function BoostBar({ boosts }: { boosts: ActiveBoost[] }) {
  if (!boosts.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1">
      {boosts.map((b) => {
        const c = BOOST_LABEL[b.type] ?? BOOST_LABEL.xp;
        const mins = Math.max(0, Math.floor((new Date(b.expiresAt).getTime() - Date.now()) / 60000));
        return (
          <span key={`${b.type}-${b.source}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${c.cls}`}>
            {c.icon} +{b.percentBonus}% {c.label} <span className="opacity-50">{mins}m</span>
          </span>
        );
      })}
    </div>
  );
}

// ── Format helpers ──

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n > 0) return `$${n.toFixed(4)}`;
  return "$0";
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toPrecision(3)}`;
  return "$0";
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtBal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n < 0.01 ? n.toFixed(4) : n.toFixed(2);
}

function fmtChange(pct: number): { text: string; cls: string } {
  const sign = pct >= 0 ? "+" : "";
  const text = `${sign}${pct.toFixed(1)}%`;
  const cls = pct > 0 ? "text-neon-green bg-neon-green/10 border-neon-green/20" :
    pct < 0 ? "text-red-400 bg-red-400/10 border-red-400/20" :
    "text-white/40 bg-white/5 border-white/10";
  return { text, cls };
}

function mintLabel(mint: string, isSOL?: boolean): string {
  if (isSOL || mint === SOL_MINT) return "SOL";
  return mint.slice(0, 4);
}

// ── Compact result strips ──

function PortfolioStrip({ data }: { data: PortfolioResult }) {
  return (
    <div className="mt-1.5 flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03] text-[10px] font-mono overflow-hidden">
      <span className="text-white/70">SOL: {fmtBal(data.solBalance)}</span>
      <span className="text-white/30">({fmtUsd(data.solBalance * data.solUsdPrice)})</span>
      <span className="text-white/20">|</span>
      <span className="text-neon-green font-semibold">Total: {fmtUsd(data.totalUsd)}</span>
    </div>
  );
}

function PriceWatchStrip({ data }: { data: PriceWatchResult }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {data.priceChanges.slice(0, 5).map((p) => {
        const { text, cls } = fmtChange(p.priceChange24h);
        return (
          <span key={p.mint} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-mono ${cls}`}>
            {mintLabel(p.mint, p.isSOL)} {text}
          </span>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function QuestPanel() {
  const {
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
  } = useQuests();

  const { signTransaction, publicKey } = useWallet();
  const { addToast } = useToast();
  const [tokenQuery, setTokenQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapSig, setSwapSig] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const done = (id: QuestId) => status?.quests.find((q) => q.id === id)?.completed ?? false;

  const dailyCount = (["token_scan", "portfolio_check", "pnl_report"] as QuestId[])
    .filter(done).length;

  const QUEST_LABELS: Record<string, string> = {
    token_scan: "Recon Scan",
    portfolio: "Vault Audit",
    priceWatch: "Signal Sweep",
    swap: "Supply Run",
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      addToast(`${QUEST_LABELS[id] ?? "Quest"} complete!`, "success");
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setBusy(null);
    }
  };

  // Real micro swap flow
  const handleMicroSwap = async () => {
    if (!signTransaction || !publicKey) {
      throw new Error("Wallet not connected");
    }

    const order = await api<{ transaction: string; requestId: string; error?: string }>(
      `/quests/swap-order?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${SWAP_AMOUNT}`
    );
    if (!order.transaction) {
      throw new Error(order.error || "Failed to get swap order");
    }

    const txBytes = b64Decode(order.transaction);
    const tx = VersionedTransaction.deserialize(txBytes);
    const signed = await signTransaction(tx);
    const signedB64 = b64Encode(signed.serialize());

    const execResult = await api<{ status: string; signature: string }>(
      "/quests/execute-swap",
      {
        method: "POST",
        body: JSON.stringify({ signedTransaction: signedB64, requestId: order.requestId }),
      }
    );

    const sig = execResult.signature;
    setSwapSig(sig);
    await completeMicroSwap(sig);
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-white/[0.04] bg-[#0d1525] p-2.5 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/5" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Active boosts */}
      {status && <BoostBar boosts={status.activeBoosts} />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">x</button>
        </div>
      )}

      {/* Info block */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0b1220] px-2.5 py-2">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Info className="h-3 w-3 text-neon-cyan/60 shrink-0" />
          <span className="text-[10px] font-display text-white/50 flex-1">
            Field ops powered by Jupiter. Complete tasks to earn resources & boosts.
          </span>
          <span className="text-[9px] text-white/20">{showInfo ? "−" : "+"}</span>
        </button>
        {showInfo && (
          <div className="mt-1.5 pl-5 space-y-1 text-[9px] text-white/35 leading-relaxed">
            <p>Daily ops reset every 24h. Weekly ops reset on Monday.</p>
            <p>Each op rewards Scrap, Tokens, or Keys — plus temporary boosts to XP, loot chance, or mission speed.</p>
            <p>Supply Run performs a real 0.001 SOL swap on Solana via Jupiter.</p>
          </div>
        )}
      </div>

      {/* Daily header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-display font-semibold text-white/70 uppercase tracking-wider">Daily Ops</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < dailyCount ? "bg-neon-green" : "bg-white/10"}`} />
          ))}
          <span className="text-[9px] font-mono text-muted-foreground ml-0.5">{dailyCount}/3</span>
        </div>
      </div>

      {/* ── Recon Scan (Token Search) ── */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-neon-green/10 border border-neon-green/20">
            <Search className="h-3 w-3 text-neon-green" />
          </div>
          <span className="text-[12px] font-display font-semibold text-white leading-none flex-1">Recon Scan</span>
          <RewardIcons scrap={20} boost={{ type: "xp", percentBonus: 10 }} />
          {done("token_scan") && <CheckCircle2 className="h-3.5 w-3.5 text-neon-green shrink-0" />}
        </div>
        {/* Search input — hidden once completed */}
        {!done("token_scan") && <div className="flex gap-1 mt-1.5">
          <input
            type="text"
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="SOL, BONK, JUP..."
            className="flex-1 bg-[#0a1120] border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-neon-green/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && tokenQuery.trim()) {
                run("token_scan", async () => {
                  await completeTokenScan(tokenQuery.trim());
                });
              }
            }}
          />
          <button
            onClick={() => {
              if (tokenQuery.trim()) {
                run("token_scan", async () => {
                  await completeTokenScan(tokenQuery.trim());
                });
              }
            }}
            disabled={!tokenQuery.trim() || busy === "token_scan"}
            className="px-2 py-1 bg-neon-green/15 text-neon-green border border-neon-green/25 hover:bg-neon-green/25 disabled:opacity-30 rounded text-[11px] font-mono font-semibold transition-colors shrink-0"
          >
            {busy === "token_scan" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          </button>
        </div>}
        {/* Token results — max 3, two-row compact cards */}
        {tokenResults && tokenResults.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {tokenResults.slice(0, 3).map((t) => {
              const ch = t.priceChange24h;
              const chSign = ch != null && ch >= 0 ? "+" : "";
              const chCls = ch != null ? (ch > 0 ? "text-neon-green" : ch < 0 ? "text-red-400" : "text-white/40") : "";
              return (
                <div key={t.address} className="rounded bg-white/[0.03] px-2 py-1">
                  {/* Row 1: icon + symbol + name + price + 24h change */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {t.logoURI ? (
                      <img src={t.logoURI} alt={t.symbol} className="w-4 h-4 rounded-full shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Coins className="h-2.5 w-2.5 text-white/30" />
                      </div>
                    )}
                    <span className="font-semibold text-white">{t.symbol}</span>
                    {t.isVerified && <ShieldCheck className="h-2.5 w-2.5 text-neon-green/50 shrink-0" />}
                    <span className="text-white/25 truncate flex-1">{t.name}</span>
                    {t.price != null && (
                      <span className="font-mono text-white/70 text-[10px]">{fmtPrice(t.price)}</span>
                    )}
                    {ch != null && (
                      <span className={`font-mono text-[9px] ${chCls}`}>{chSign}{ch.toFixed(1)}%</span>
                    )}
                  </div>
                  {/* Row 2: mcap, liquidity, holders, volume */}
                  <div className="flex items-center gap-2.5 mt-0.5 text-[9px] font-mono text-white/30 pl-[22px]">
                    {t.mcap != null && t.mcap > 0 && (
                      <span title="Market Cap">MCap ${fmtCompact(t.mcap)}</span>
                    )}
                    {t.liquidity != null && t.liquidity > 0 && (
                      <span className="inline-flex items-center gap-0.5" title="Liquidity">
                        <Droplets className="h-2 w-2" />${fmtCompact(t.liquidity)}
                      </span>
                    )}
                    {t.holderCount != null && t.holderCount > 0 && (
                      <span className="inline-flex items-center gap-0.5" title="Holders">
                        <Users className="h-2 w-2" />{fmtCompact(t.holderCount)}
                      </span>
                    )}
                    {t.daily_volume != null && t.daily_volume > 0 && (
                      <span title="24h Volume">Vol ${fmtCompact(t.daily_volume)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tokenResults && tokenResults.length === 0 && (
          <p className="text-[9px] text-white/25 mt-1 text-center">No tokens found</p>
        )}
      </div>

      {/* ── Vault Audit (Portfolio) ── */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-neon-cyan/10 border border-neon-cyan/20">
            <Briefcase className="h-3 w-3 text-neon-cyan" />
          </div>
          <span className="text-[12px] font-display font-semibold text-white leading-none flex-1">Vault Audit</span>
          <RewardIcons scrap={15} boost={{ type: "loot_chance", percentBonus: 10 }} />
          {done("portfolio_check") ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-neon-green shrink-0" />
          ) : (
            <button
              onClick={() => run("portfolio", async () => { await completePortfolioCheck(); })}
              disabled={busy === "portfolio"}
              className="px-2 py-0.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded text-[10px] font-mono text-white/80 font-semibold transition-colors shrink-0"
            >
              {busy === "portfolio" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Go"}
            </button>
          )}
        </div>
        {portfolioResults && <PortfolioStrip data={portfolioResults} />}
      </div>

      {/* ── Signal Sweep (Price Watch) ── */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-neon-amber/10 border border-neon-amber/20">
            <TrendingUp className="h-3 w-3 text-neon-amber" />
          </div>
          <span className="text-[12px] font-display font-semibold text-white leading-none flex-1">Signal Sweep</span>
          <RewardIcons crystal={3} boost={{ type: "speed", percentBonus: 10 }} />
          {done("pnl_report") ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-neon-green shrink-0" />
          ) : (
            <button
              onClick={() => run("priceWatch", async () => { await completePriceWatch(); })}
              disabled={busy === "priceWatch"}
              className="px-2 py-0.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded text-[10px] font-mono text-white/80 font-semibold transition-colors shrink-0"
            >
              {busy === "priceWatch" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Go"}
            </button>
          )}
        </div>
        {priceWatchResults && <PriceWatchStrip data={priceWatchResults} />}
      </div>

      {/* Weekly divider */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] font-display font-semibold text-white/70 uppercase tracking-wider">Weekly Op</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${done("micro_swap") ? "bg-neon-green" : "bg-white/10"}`} />
          <span className="text-[9px] font-mono text-muted-foreground ml-0.5">{done("micro_swap") ? 1 : 0}/1</span>
        </div>
      </div>

      {/* ── Supply Run (Micro Swap) ── */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-neon-purple/10 border border-neon-purple/20">
            <ArrowRightLeft className="h-3 w-3 text-neon-purple" />
          </div>
          <span className="text-[12px] font-display font-semibold text-white leading-none flex-1">Supply Run</span>
          <RewardIcons scrap={50} crystal={10} artifact={1} />
          {done("micro_swap") ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-neon-green shrink-0" />
          ) : (
            <button
              onClick={() => run("swap", handleMicroSwap)}
              disabled={busy === "swap" || !signTransaction}
              className="px-2 py-0.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded text-[10px] font-mono text-white/80 font-semibold transition-colors shrink-0"
            >
              {busy === "swap" ? <Loader2 className="h-3 w-3 animate-spin" /> : "0.001 SOL"}
            </button>
          )}
        </div>
        {(done("micro_swap") || swapSig) && (
          <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] text-[10px] font-mono">
            <CheckCircle2 className="h-3 w-3 text-neon-green shrink-0" />
            <span className="text-neon-green">0.001 SOL → USDC</span>
            {swapSig && (
              <span className="text-white/20 truncate">{swapSig.slice(0, 8)}…</span>
            )}
          </div>
        )}
      </div>

      {/* Jupiter branding */}
      <div className="rounded-lg bg-[#0a1120] border border-white/[0.05] flex items-center justify-center py-1.5 mt-0.5">
        <img src={jupiterLogo} alt="Powered by Jupiter" className="h-3.5 opacity-80" />
      </div>
    </div>
  );
}
