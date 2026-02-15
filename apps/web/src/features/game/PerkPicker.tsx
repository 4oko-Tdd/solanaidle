import { usePerks } from "@/hooks/usePerks";
import { Button } from "@/components/ui/button";
import type { PerkDefinition } from "@solanaidle/shared";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const TIER_STYLES: Record<string, { border: string; glow: string; badge: string; badgeText: string }> = {
  common: {
    border: "border-white/20",
    glow: "",
    badge: "bg-white/10",
    badgeText: "text-muted-foreground",
  },
  rare: {
    border: "border-neon-cyan/50",
    glow: "shadow-[0_0_20px_rgba(0,212,255,0.15)]",
    badge: "bg-neon-cyan/20",
    badgeText: "text-neon-cyan",
  },
  legendary: {
    border: "border-neon-amber/50",
    glow: "shadow-[0_0_30px_rgba(255,184,0,0.2)]",
    badge: "bg-neon-amber/20",
    badgeText: "text-neon-amber",
  },
};

function PerkCard({ perk, onChoose, disabled }: { perk: PerkDefinition; onChoose: () => void; disabled: boolean }) {
  const style = TIER_STYLES[perk.tier] || TIER_STYLES.common;

  return (
    <div className={`flex flex-col items-center gap-3 rounded-xl border ${style.border} ${style.glow} bg-[#0d1525] p-4 text-center`}>
      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${style.badge} ${style.badgeText}`}>
        {perk.tier}
      </span>
      <h3 className="text-sm font-display font-semibold text-white">{perk.name}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{perk.description}</p>
      {perk.stackable && (
        <span className="text-[10px] text-muted-foreground/60 font-mono">Stackable</span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-auto w-full"
        onClick={onChoose}
        disabled={disabled}
      >
        Choose
      </Button>
    </div>
  );
}

export function PerkPicker() {
  const { offers, hasPending, choosePerk, loading } = usePerks();
  const [choosing, setChoosing] = useState(false);

  if (loading || !hasPending || offers.length === 0) return null;

  const handleChoose = async (perkId: string) => {
    setChoosing(true);
    try {
      await choosePerk(perkId);
    } finally {
      setChoosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-display font-bold text-white">Level Up!</h2>
          <p className="text-xs text-muted-foreground">Choose a perk to enhance your node</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {offers.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              onChoose={() => handleChoose(perk.id)}
              disabled={choosing}
            />
          ))}
        </div>

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
