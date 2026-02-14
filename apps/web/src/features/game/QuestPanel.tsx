import { useEffect, useState } from "react";
import { useQuests } from "../../hooks/useQuests";
import type { QuestId, ActiveBoost } from "@solanaidle/shared";
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
} from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import jupiterLogo from "../../assets/icons/poweredbyjupiter-dark.svg";

interface Props {
  onRefreshGame?: () => void;
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

// ── Compact quest row ──

function QuestRow({
  icon,
  iconCls,
  name,
  reward,
  completed,
  loading: busy,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  iconCls: string;
  name: string;
  reward: string;
  completed: boolean;
  loading: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconCls}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-display font-semibold text-white leading-none">{name}</span>
          <p className="text-[9px] font-mono text-neon-amber/60 mt-0.5">{reward}</p>
        </div>
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-neon-green shrink-0" />
        ) : onClick ? (
          <button
            onClick={onClick}
            disabled={busy}
            className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md text-[11px] font-mono text-white/80 font-semibold transition-colors shrink-0 flex items-center gap-1"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Go"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ── Main Panel ──

export function QuestPanel({ onRefreshGame }: Props) {
  const {
    status,
    loading,
    refresh,
    completeTokenScan,
    completePortfolioCheck,
    completePnlReport,
    completeMicroSwap,
  } = useQuests();

  const { addToast } = useToast();
  const [tokenQuery, setTokenQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const done = (id: QuestId) => status?.quests.find((q) => q.id === id)?.completed ?? false;

  const dailyCount = (["token_scan", "portfolio_check", "pnl_report"] as QuestId[])
    .filter(done).length;

  const QUEST_LABELS: Record<string, string> = {
    token_scan: "Token Lookup",
    portfolio: "Portfolio Check",
    pnl: "PnL Report",
    swap: "Micro Swap",
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      addToast(`${QUEST_LABELS[id] ?? "Quest"} complete!`, "success");
      onRefreshGame?.();
    } catch (e: any) {
      const msg = e?.message || "Something went wrong";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/[0.04] bg-[#0d1525] p-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white/5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="h-2 w-32 bg-white/[0.03] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Active boosts */}
      {status && <BoostBar boosts={status.activeBoosts} />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">x</button>
        </div>
      )}

      {/* Daily header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-semibold text-white/70 uppercase tracking-wider">Daily Intel</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < dailyCount ? "bg-neon-green" : "bg-white/10"}`} />
          ))}
          <span className="text-[9px] font-mono text-muted-foreground ml-0.5">{dailyCount}/3</span>
        </div>
      </div>

      {/* Token Lookup */}
      <QuestRow
        icon={<Search className="h-3.5 w-3.5 text-neon-green" />}
        iconCls="bg-neon-green/10 border border-neon-green/20"
        name="Token Lookup"
        reward="+20 scrap  +10% XP 1h"
        completed={done("token_scan")}
        loading={busy === "token_scan"}
      >
        {!done("token_scan") && (
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={tokenQuery}
              onChange={(e) => setTokenQuery(e.target.value)}
              placeholder="SOL, BONK, JUP..."
              className="flex-1 bg-[#0a1120] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-neon-green/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tokenQuery.trim()) {
                  run("token_scan", async () => {
                    await completeTokenScan(tokenQuery.trim());
                    setTokenQuery("");
                  });
                }
              }}
            />
            <button
              onClick={() => run("token_scan", async () => {
                await completeTokenScan(tokenQuery.trim());
                setTokenQuery("");
              })}
              disabled={!tokenQuery.trim() || busy === "token_scan"}
              className="px-3 py-1.5 bg-neon-green/15 text-neon-green border border-neon-green/25 hover:bg-neon-green/25 disabled:opacity-30 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-1 shrink-0"
            >
              {busy === "token_scan" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </button>
          </div>
        )}
      </QuestRow>

      {/* Portfolio Check */}
      <QuestRow
        icon={<Briefcase className="h-3.5 w-3.5 text-neon-cyan" />}
        iconCls="bg-neon-cyan/10 border border-neon-cyan/20"
        name="Portfolio Check"
        reward="+15 scrap  +10% Loot 1h"
        completed={done("portfolio_check")}
        loading={busy === "portfolio"}
        onClick={() => run("portfolio", () => completePortfolioCheck())}
      />

      {/* PnL Report */}
      <QuestRow
        icon={<TrendingUp className="h-3.5 w-3.5 text-neon-amber" />}
        iconCls="bg-neon-amber/10 border border-neon-amber/20"
        name="PnL Report"
        reward="+3 crystal  +10% Speed 1h"
        completed={done("pnl_report")}
        loading={busy === "pnl"}
        onClick={() => run("pnl", () => completePnlReport())}
      />

      {/* Weekly divider */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-display font-semibold text-white/70 uppercase tracking-wider">Weekly Op</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${done("micro_swap") ? "bg-neon-green" : "bg-white/10"}`} />
          <span className="text-[9px] font-mono text-muted-foreground ml-0.5">{done("micro_swap") ? 1 : 0}/1</span>
        </div>
      </div>

      {/* Micro Swap */}
      <QuestRow
        icon={<ArrowRightLeft className="h-3.5 w-3.5 text-neon-purple" />}
        iconCls="bg-neon-purple/10 border border-neon-purple/20"
        name="Micro Swap"
        reward="+50 scrap  +10 crystal  +1 key"
        completed={done("micro_swap")}
        loading={busy === "swap"}
        onClick={() => run("swap", () => completeMicroSwap("placeholder"))}
      />

      {/* Jupiter branding */}
      <div className="rounded-lg bg-[#0a1120] border border-white/[0.05] flex items-center justify-center py-2 mt-1">
        <img src={jupiterLogo} alt="Powered by Jupiter" className="h-4 opacity-80" />
      </div>
    </div>
  );
}
