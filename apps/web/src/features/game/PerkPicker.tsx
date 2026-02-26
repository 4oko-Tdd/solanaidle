import type { usePerks } from "@/hooks/usePerks";
import { Button } from "@/components/ui/button";
import type { PerkDefinition } from "@solanaidle/shared";
import { useState } from "react";
import { Loader2, Sparkles, Zap, Crown } from "lucide-react";

const TIER_CONFIG: Record<
  string,
  {
    border: string;
    glow: string;
    badge: string;
    badgeText: string;
    animate: string;
    accent: string;
    Icon: typeof Sparkles;
    iconColor: string;
  }
> = {
  common: {
    border: "border-white/[0.12]",
    glow: "",
    badge: "bg-white/10",
    badgeText: "text-muted-foreground",
    animate: "",
    accent: "",
    Icon: Sparkles,
    iconColor: "text-white/40",
  },
  rare: {
    border: "border-neon-cyan/40",
    glow: "shadow-[0_0_15px_rgba(0,212,255,0.1)]",
    badge: "bg-neon-cyan/20",
    badgeText: "text-neon-cyan",
    animate: "",
    accent: "",
    Icon: Zap,
    iconColor: "text-neon-cyan",
  },
  legendary: {
    border: "border-neon-amber/40",
    glow: "",
    badge: "bg-neon-amber/20",
    badgeText: "text-neon-amber",
    animate: "animate-golden-glow",
    accent: "h-1 rounded-t-lg bg-gradient-to-r from-neon-amber to-yellow-400",
    Icon: Crown,
    iconColor: "text-neon-amber",
  },
};

function PerkCard({
  perk,
  onChoose,
  disabled,
}: {
  perk: PerkDefinition;
  onChoose: () => void;
  disabled: boolean;
}) {
  const cfg = TIER_CONFIG[perk.tier] || TIER_CONFIG.common;
  const { Icon } = cfg;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-[#0d1525] ${cfg.border} ${cfg.glow} ${cfg.animate}`}
    >
      {/* Legendary accent strip */}
      {cfg.accent && <div className={cfg.accent} />}

      <div className="flex items-center gap-3 p-3">
        {/* Icon area */}
        <div className="flex shrink-0 items-center justify-center">
          <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-display font-semibold text-white">
              {perk.name}
            </h3>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-mono uppercase ${cfg.badge} ${cfg.badgeText}`}
            >
              {perk.tier}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
            {perk.description}
          </p>
          {perk.stackable && (
            <span className="mt-0.5 block text-sm font-mono text-muted-foreground/60">
              Stackable
            </span>
          )}
        </div>

        {/* Choose button */}
        <Button
          size="sm"
          className="shrink-0"
          onClick={onChoose}
          disabled={disabled}
        >
          Choose
        </Button>
      </div>
    </div>
  );
}

interface Props {
  perks: ReturnType<typeof usePerks>;
}

export function PerkPicker({ perks }: Props) {
  const { offers, hasPending, choosePerk, loading } = perks;
  const [choosing, setChoosing] = useState(false);

  if (!hasPending || offers.length === 0) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleChoose = async (perkId: string) => {
    setChoosing(true);
    try {
      await choosePerk(perkId);
    } finally {
      setChoosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-gradient text-2xl font-display font-black uppercase tracking-wider">
            Level Up
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose a perk to enhance your node
          </p>
        </div>

        {/* Perk cards — single column */}
        <div className="grid grid-cols-1 gap-2.5">
          {offers.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              onChoose={() => handleChoose(perk.id)}
              disabled={choosing}
            />
          ))}
        </div>

        {/* Choosing indicator */}
        {choosing && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Installing perk...
          </div>
        )}
      </div>
    </div>
  );
}
