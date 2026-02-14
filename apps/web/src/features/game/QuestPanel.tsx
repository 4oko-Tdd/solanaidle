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
  ChevronRight,
  Loader2,
} from "lucide-react";
import jupiterLogo from "../../assets/icons/poweredbyjupiter-dark.svg";

interface Props {
  onRefreshGame?: () => void;
}

const BOOST_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  xp: { label: "XP Boost", color: "text-neon-amber border-neon-amber/20 bg-neon-amber/10", icon: <Zap className="h-3 w-3" /> },
  speed: { label: "Speed Boost", color: "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/10", icon: <Clock className="h-3 w-3" /> },
  loot_chance: { label: "Loot Boost", color: "text-neon-purple border-neon-purple/20 bg-neon-purple/10", icon: <Gem className="h-3 w-3" /> },
};

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
}

// ── Active Boosts ──

function BoostBar({ boosts }: { boosts: ActiveBoost[] }) {
  if (boosts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {boosts.map((b) => {
        const cfg = BOOST_STYLES[b.type] ?? BOOST_STYLES.xp;
        return (
          <div key={`${b.type}-${b.source}`} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono ${cfg.color}`}>
            {cfg.icon}
            <span>+{b.percentBonus}% {cfg.label}</span>
            <span className="opacity-50 text-[10px]">{formatTimeLeft(b.expiresAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Token Lookup Quest (combined price + token scan) ──

function TokenLookupCard({
  completed,
  onComplete,
}: {
  completed: boolean;
  onComplete: (query: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onComplete(query.trim());
    } finally {
      setSubmitting(false);
      setQuery("");
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shrink-0">
          <Search className="h-4.5 w-4.5 text-neon-green" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-display font-semibold text-white">Token Lookup</h4>
          <p className="text-[11px] text-muted-foreground">Search any token — get price & info</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-neon-amber/70">+20 scrap</span>
          <p className="text-[9px] font-mono text-neon-amber/50">+10% XP 1h</p>
        </div>
      </div>

      {completed ? (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-neon-green/5 border border-neon-green/10">
          <CheckCircle2 className="h-4 w-4 text-neon-green shrink-0" />
          <span className="text-xs text-neon-green font-mono">Completed today</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SOL, BONK, JUP..."
            className="flex-1 bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-neon-green/40 transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || submitting}
            className="px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-mono font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </button>
        </div>
      )}
    </div>
  );
}

// ── One-Click Quest Card ──

const ACCENT_CLASSES = {
  "neon-cyan": {
    iconBox: "bg-neon-cyan/10 border-neon-cyan/20",
    btn: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/25 hover:bg-neon-cyan/25",
  },
  "neon-amber": {
    iconBox: "bg-neon-amber/10 border-neon-amber/20",
    btn: "bg-neon-amber/15 text-neon-amber border-neon-amber/25 hover:bg-neon-amber/25",
  },
} as const;

function OneClickCard({
  icon,
  name,
  description,
  rewardLabel,
  rewardSub,
  completed,
  submitting,
  onComplete,
  accent = "neon-cyan",
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  rewardLabel: string;
  rewardSub?: string;
  completed: boolean;
  submitting: boolean;
  onComplete: () => void;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  const cls = ACCENT_CLASSES[accent];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${cls.iconBox}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-display font-semibold text-white">{name}</h4>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>

        {completed ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-neon-green" />
            <span className="text-[11px] text-neon-green font-mono">Done</span>
          </div>
        ) : (
          <button
            onClick={onComplete}
            disabled={submitting}
            className={`px-3 py-1.5 border disabled:opacity-30 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 shrink-0 ${cls.btn}`}
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
            Go
          </button>
        )}
      </div>
      <div className="mt-2 pl-12">
        <span className="text-[10px] font-mono text-neon-amber/60">{rewardLabel}</span>
        {rewardSub && <span className="text-[10px] font-mono text-neon-amber/40 ml-2">{rewardSub}</span>}
      </div>
    </div>
  );
}

// ── Micro Swap Card ──

function MicroSwapCard({
  completed,
  onComplete,
}: {
  completed: boolean;
  onComplete: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleSwap = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="h-4.5 w-4.5 text-neon-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-display font-semibold text-white">Micro Swap</h4>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple/70 border border-neon-purple/20">WEEKLY</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Swap any token pair via Jupiter</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono text-neon-amber/70">+50 scrap</span>
          <p className="text-[9px] font-mono text-neon-amber/50">+10 crystal +1 key</p>
        </div>
      </div>

      {completed ? (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-neon-green/5 border border-neon-green/10">
          <CheckCircle2 className="h-4 w-4 text-neon-green shrink-0" />
          <span className="text-xs text-neon-green font-mono">Completed this week</span>
        </div>
      ) : (
        <button
          onClick={handleSwap}
          disabled={submitting}
          className="w-full py-2.5 bg-neon-purple/15 text-neon-purple border border-neon-purple/25 hover:bg-neon-purple/25 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-mono font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
          Open Jupiter Swap
        </button>
      )}
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

  const [portfolioSubmitting, setPortfolioSubmitting] = useState(false);
  const [pnlSubmitting, setPnlSubmitting] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const isCompleted = (id: QuestId) => status?.quests.find((q) => q.id === id)?.completed ?? false;

  const dailyDone = ["token_scan", "portfolio_check", "pnl_report"]
    .filter((id) => isCompleted(id as QuestId)).length;

  const handlePortfolio = async () => {
    setPortfolioSubmitting(true);
    try { await completePortfolioCheck(); } finally { setPortfolioSubmitting(false); }
    onRefreshGame?.();
  };

  const handlePnl = async () => {
    setPnlSubmitting(true);
    try { await completePnlReport(); } finally { setPnlSubmitting(false); }
    onRefreshGame?.();
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1525] p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-3 w-40 bg-white/[0.03] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Active Boosts */}
      {status && status.activeBoosts.length > 0 && (
        <BoostBar boosts={status.activeBoosts} />
      )}

      {/* Daily progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">Daily Intel</h3>
          <p className="text-[10px] font-mono text-muted-foreground">Resets at midnight UTC</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < dailyDone ? "bg-neon-green" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{dailyDone}/3</span>
        </div>
      </div>

      {/* Token Lookup — the main interactive quest */}
      <TokenLookupCard
        completed={isCompleted("token_scan")}
        onComplete={async (query) => {
          await completeTokenScan(query);
          onRefreshGame?.();
        }}
      />

      {/* Portfolio + PnL — one-click quests */}
      <OneClickCard
        icon={<Briefcase className="h-4.5 w-4.5 text-neon-cyan" />}
        name="Portfolio Check"
        description="View your wallet holdings via Jupiter"
        rewardLabel="+15 scrap"
        rewardSub="+10% Loot 1h"
        completed={isCompleted("portfolio_check")}
        submitting={portfolioSubmitting}
        onComplete={handlePortfolio}
        accent="neon-cyan"
      />

      <OneClickCard
        icon={<TrendingUp className="h-4.5 w-4.5 text-neon-amber" />}
        name="PnL Report"
        description="Check profit & loss on your holdings"
        rewardLabel="+3 crystal"
        rewardSub="+10% Speed 1h"
        completed={isCompleted("pnl_report")}
        submitting={pnlSubmitting}
        onComplete={handlePnl}
        accent="neon-amber"
      />

      {/* Weekly section */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">Weekly Op</h3>
          <p className="text-[10px] font-mono text-muted-foreground">Resets every Monday</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isCompleted("micro_swap") ? "bg-neon-green" : "bg-white/10"}`} />
          <span className="text-[10px] font-mono text-muted-foreground">{isCompleted("micro_swap") ? 1 : 0}/1</span>
        </div>
      </div>

      <MicroSwapCard
        completed={isCompleted("micro_swap")}
        onComplete={async () => {
          // MVP: auto-complete — real swap flow will open Jupiter
          await completeMicroSwap("placeholder");
          onRefreshGame?.();
        }}
      />

      {/* Jupiter Branding */}
      <div className="rounded-xl bg-[#0a1120] border border-white/[0.06] flex items-center justify-center py-3">
        <img src={jupiterLogo} alt="Powered by Jupiter" className="h-5" />
      </div>
    </div>
  );
}
