import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/hooks/useCollection";
import { useToast } from "@/components/ToastProvider";
import { Archive, Trash2, Loader2, Sparkles, Zap } from "lucide-react";

const PERK_LABELS: Record<string, string> = {
  loot_chance: "Loot Chance",
  speed: "Speed",
  fail_rate: "Fail Rate",
  xp: "XP Bonus",
  boss_damage: "Boss DMG",
};

export function PermanentCollection() {
  const { items, capacity, weeklyBuffs, loading, sacrifice, refresh } = useCollection();
  const { addToast } = useToast();
  const [sacrificing, setSacrificing] = useState<string | null>(null);

  const handleSacrifice = async (lootId: string) => {
    if (!confirm("Sacrifice this item? It will be destroyed permanently.")) return;
    setSacrificing(lootId);
    try {
      await sacrifice(lootId);
      addToast("Item sacrificed", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      addToast(err.message || "Sacrifice failed", "error");
    } finally {
      setSacrificing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-neon-purple" />
      </div>
    );
  }

  const maxSlots = capacity?.maxSlots ?? 5;
  const usedSlots = items.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-neon-amber" />
            <h3 className="text-base font-display font-semibold text-white">Permanent Collection</h3>
          </div>
          <Badge className="text-[10px] py-0 px-2 bg-neon-amber/10 text-neon-amber border-neon-amber/30">
            {usedSlots}/{maxSlots} slots
          </Badge>
        </div>
        <p className="text-[11px] text-[#4a7a9b] leading-relaxed">
          Permanent loot carries over between epochs. Each item provides a passive perk.
        </p>

        {/* Items grid */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#1a3a5c]/60 bg-[#0a1628]/40 p-6 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-[#4a7a9b]/40 mx-auto" />
            <p className="text-sm text-[#4a7a9b]">No permanent loot yet</p>
            <p className="text-xs text-[#4a7a9b]/70 max-w-[220px] mx-auto">
              Defeat bosses and finalize epochs for a chance at permanent drops.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#0d1525] p-3"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-amber/10 border border-neon-amber/20 shrink-0">
                  <Sparkles className="h-5 w-5 text-neon-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.itemName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {PERK_LABELS[item.perkType] || item.perkType}: +{item.perkValue}%
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 shrink-0"
                  disabled={sacrificing === item.id}
                  onClick={() => handleSacrifice(item.id)}
                >
                  {sacrificing === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly buffs */}
      {weeklyBuffs.length > 0 && (
        <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neon-cyan" />
            <h4 className="text-sm font-display font-semibold text-neon-cyan">Active Buffs</h4>
          </div>
          <div className="space-y-1.5">
            {weeklyBuffs.map((buff) => (
              <div key={buff.id} className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 rounded-full bg-neon-cyan" />
                <span className="text-foreground/80">{buff.buffName}</span>
                {buff.consumed && (
                  <Badge className="text-[9px] py-0 px-1.5 bg-muted text-muted-foreground">Used</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
