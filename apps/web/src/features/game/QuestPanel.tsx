import { useEffect, useState } from "react";
import { useQuests } from "../../hooks/useQuests";
import type { QuestId, QuestDefinition, QuestProgress, ActiveBoost } from "@solanaidle/shared";
import {
  Search,
  DollarSign,
  Briefcase,
  TrendingUp,
  ArrowRightLeft,
  Target,
  CheckCircle2,
  Zap,
  Clock,
  Gem,
} from "lucide-react";
import jupiterLogo from "../../assets/icons/poweredbyjupiter-bright.svg";

interface Props {
  onRefreshGame?: () => void;
}

type Quest = QuestDefinition & QuestProgress;

const QUEST_ICONS: Record<QuestId, React.ReactNode> = {
  price_scout: <DollarSign className="h-4 w-4" />,
  token_scan: <Search className="h-4 w-4" />,
  portfolio_check: <Briefcase className="h-4 w-4" />,
  pnl_report: <TrendingUp className="h-4 w-4" />,
  micro_swap: <ArrowRightLeft className="h-4 w-4" />,
  prediction_bet: <Target className="h-4 w-4" />,
};

const BOOST_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  xp: { label: "XP", color: "text-neon-amber border-neon-amber/30 bg-neon-amber/10", icon: <Zap className="h-3 w-3" /> },
  speed: { label: "Speed", color: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10", icon: <Clock className="h-3 w-3" /> },
  loot_chance: { label: "Loot", color: "text-neon-purple border-neon-purple/30 bg-neon-purple/10", icon: <Gem className="h-3 w-3" /> },
};

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function formatReward(quest: Quest): string {
  const parts: string[] = [];
  if (quest.reward.scrap) parts.push(`+${quest.reward.scrap} scrap`);
  if (quest.reward.crystal) parts.push(`+${quest.reward.crystal} crystal`);
  if (quest.reward.artifact) parts.push(`+${quest.reward.artifact} artifact`);
  if (quest.reward.boost) {
    const b = quest.reward.boost;
    const label = b.type === "xp" ? "XP" : b.type === "speed" ? "Speed" : "Loot%";
    parts.push(`+${b.percentBonus}% ${label}`);
  }
  return parts.join("  ");
}

// ── Boost Bar ──

function BoostBar({ boosts }: { boosts: ActiveBoost[] }) {
  if (boosts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {boosts.map((boost) => {
        const cfg = BOOST_CONFIG[boost.type] ?? BOOST_CONFIG.xp;
        return (
          <div
            key={`${boost.type}-${boost.source}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${cfg.color}`}
          >
            {cfg.icon}
            <span>+{boost.percentBonus}% {cfg.label}</span>
            <span className="opacity-60">{formatTimeRemaining(boost.expiresAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading Skeleton ──

function QuestSkeleton() {
  return (
    <div className="bg-[#111d30] border border-white/10 rounded-lg p-3 animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded mb-2" />
      <div className="h-3 w-full bg-white/5 rounded mb-1" />
      <div className="h-3 w-2/3 bg-white/5 rounded mb-3" />
      <div className="h-7 w-full bg-white/5 rounded" />
    </div>
  );
}

// ── Quest Card (self-contained with its own input state) ──

function QuestCard({
  quest,
  onComplete,
}: {
  quest: Quest;
  onComplete: (id: QuestId, inputValue?: string) => Promise<void>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsInput = quest.id === "price_scout" || quest.id === "token_scan";
  const placeholder =
    quest.id === "price_scout"
      ? "Token mint address..."
      : quest.id === "token_scan"
        ? "Token name or symbol..."
        : "";

  const buttonLabel: Record<QuestId, string> = {
    price_scout: "Scout",
    token_scan: "Scan",
    portfolio_check: "Check",
    pnl_report: "Report",
    micro_swap: "Swap",
    prediction_bet: "View Markets",
  };

  const handleSubmit = async () => {
    if (needsInput && !inputValue.trim()) return;
    setSubmitting(true);
    try {
      await onComplete(quest.id, inputValue.trim() || undefined);
    } finally {
      setSubmitting(false);
      setInputValue("");
    }
  };

  return (
    <div className="bg-[#111d30] border border-white/10 rounded-lg p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-neon-green">{QUEST_ICONS[quest.id]}</span>
        <span className="font-display font-semibold text-sm text-white">
          {quest.name}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {quest.description}
      </p>

      {/* Reward preview */}
      <div className="text-[10px] font-mono text-neon-amber/80">
        {formatReward(quest)}
      </div>

      {/* Action or completed state */}
      {quest.completed ? (
        <div className="flex items-center gap-1.5 mt-1">
          <CheckCircle2 className="h-4 w-4 text-neon-green" />
          <span className="text-xs font-mono text-neon-green">Completed</span>
          {quest.result && (
            <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[120px]">
              {typeof quest.result === "object" && "price" in quest.result
                ? `$${quest.result.price}`
                : typeof quest.result === "object" && "symbol" in quest.result
                  ? String(quest.result.symbol)
                  : ""}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-1">
          {needsInput && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-[#0a1120] border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-neon-green/40"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || (needsInput && !inputValue.trim())}
            className="w-full bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 disabled:opacity-40 disabled:cursor-not-allowed rounded px-3 py-1.5 text-xs font-mono font-semibold transition-colors"
          >
            {submitting ? "..." : buttonLabel[quest.id]}
          </button>
        </div>
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
    completePriceScout,
    completeTokenScan,
    completePortfolioCheck,
    completePnlReport,
    completeMicroSwap,
    completePredictionBet,
  } = useQuests();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const findQuest = (id: QuestId): Quest | undefined =>
    status?.quests.find((q) => q.id === id);

  const dailyQuestIds: QuestId[] = ["price_scout", "token_scan", "portfolio_check", "pnl_report"];
  const weeklyQuestIds: QuestId[] = ["micro_swap", "prediction_bet"];

  const handleComplete = async (questId: QuestId, inputValue?: string) => {
    switch (questId) {
      case "price_scout":
        if (!inputValue) return;
        await completePriceScout(inputValue);
        break;
      case "token_scan":
        if (!inputValue) return;
        await completeTokenScan(inputValue);
        break;
      case "portfolio_check":
        await completePortfolioCheck();
        break;
      case "pnl_report":
        await completePnlReport();
        break;
      case "micro_swap":
        // MVP: placeholder signature — real swap flow to be added
        await completeMicroSwap("placeholder");
        break;
      case "prediction_bet":
        // MVP: placeholder — real prediction UI to be added
        await completePredictionBet("placeholder", "placeholder");
        break;
    }
    onRefreshGame?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Active Boosts */}
      {status && <BoostBar boosts={status.activeBoosts} />}

      {/* Daily Intel */}
      <div>
        <h3 className="font-display font-semibold text-sm text-white mb-0.5">
          Daily Intel
        </h3>
        <p className="text-[10px] font-mono text-muted-foreground mb-3">
          Free daily quests — resets at midnight UTC
        </p>

        <div className="grid grid-cols-2 gap-2">
          {loading && !status
            ? Array.from({ length: 4 }).map((_, i) => <QuestSkeleton key={i} />)
            : dailyQuestIds.map((qid) => {
                const quest = findQuest(qid);
                if (!quest) return null;
                return (
                  <QuestCard
                    key={qid}
                    quest={quest}
                    onComplete={handleComplete}
                  />
                );
              })}
        </div>
      </div>

      {/* Weekly Ops */}
      <div>
        <h3 className="font-display font-semibold text-sm text-white mb-0.5">
          Weekly Ops
        </h3>
        <p className="text-[10px] font-mono text-muted-foreground mb-3">
          Requires a wallet transaction
        </p>

        <div className="grid grid-cols-2 gap-2">
          {loading && !status
            ? Array.from({ length: 2 }).map((_, i) => <QuestSkeleton key={i} />)
            : weeklyQuestIds.map((qid) => {
                const quest = findQuest(qid);
                if (!quest) return null;
                return (
                  <QuestCard
                    key={qid}
                    quest={quest}
                    onComplete={handleComplete}
                  />
                );
              })}
        </div>
      </div>

      {/* Jupiter Branding */}
      <div className="rounded-xl bg-[#0d1525] border border-white/[0.08] flex items-center justify-center py-3 px-4">
        <img
          src={jupiterLogo}
          alt="Powered by Jupiter"
          className="h-5"
        />
      </div>
    </div>
  );
}
