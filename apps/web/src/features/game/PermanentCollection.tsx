import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCollection } from "@/hooks/useCollection";
import { useToast } from "@/components/ToastProvider";
import { Flame, Loader2, Zap, Cpu, Gem, Shield, Crosshair, Clock, Skull } from "lucide-react";

// Narrative-themed perk labels and icons
const PERK_META: Record<string, { label: string; icon: typeof Cpu; color: string; bgColor: string; borderColor: string }> = {
  loot_chance: { label: "Drop Rate", icon: Gem, color: "text-neon-amber", bgColor: "bg-neon-amber/10", borderColor: "border-neon-amber/20" },
  speed: { label: "Clock Speed", icon: Clock, color: "text-neon-cyan", bgColor: "bg-neon-cyan/10", borderColor: "border-neon-cyan/20" },
  fail_rate: { label: "Fault Tolerance", icon: Shield, color: "text-neon-green", bgColor: "bg-neon-green/10", borderColor: "border-neon-green/20" },
  xp: { label: "Data Throughput", icon: Cpu, color: "text-neon-purple", bgColor: "bg-neon-purple/10", borderColor: "border-neon-purple/20" },
  boss_damage: { label: "Strike Power", icon: Crosshair, color: "text-neon-red", bgColor: "bg-neon-red/10", borderColor: "border-neon-red/20" },
};

const DEFAULT_META = { label: "Unknown", icon: Cpu, color: "text-muted-foreground", bgColor: "bg-white/5", borderColor: "border-white/10" };

function formatPerkValue(perkType: string, value: number): string {
  if (perkType === "speed" || perkType === "fail_rate") return `${value > 0 ? "+" : ""}${value}%`;
  return `+${value}%`;
}

export function PermanentCollection() {
  const { items, capacity, weeklyBuffs, loading, sacrifice } = useCollection();
  const { addToast } = useToast();
  const [sacrificing, setSacrificing] = useState<string | null>(null);

  const handleSacrifice = async (lootId: string) => {
    if (!confirm("Burn this artifact? This action is irreversible.")) return;
    setSacrificing(lootId);
    try {
      await sacrifice(lootId);
      addToast("Artifact burned", "success");
    } catch (e: unknown) {
      const err = e as { message?: string };
      addToast(err.message || "Burn failed", "error");
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
      {/* Main panel */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg overflow-hidden">
        {/* Header with accent strip */}
        <div className="relative px-4 pt-4 pb-3 space-y-2">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-purple via-neon-amber to-neon-purple" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-neon-purple/10 border border-neon-purple/20">
                <Skull className="h-4 w-4 text-neon-purple" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white tracking-wide uppercase">Leviathan Salvage</h3>
                <p className="text-sm font-mono text-muted-foreground">Protocol artifacts • persist forever</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1">
              <div className="flex gap-0.5">
                {Array.from({ length: maxSlots }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < usedSlots ? "bg-neon-amber" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-muted-foreground">{usedSlots}/{maxSlots}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-4 pb-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-white/[0.06] bg-[#0d1525] p-5 text-center space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neon-purple/5 border border-neon-purple/10 mx-auto">
                <Skull className="h-5 w-5 text-neon-purple/30" />
              </div>
              <p className="text-sm font-display text-[#4a7a9b]">No salvage recovered</p>
              <p className="text-sm text-[#4a7a9b]/70 max-w-[240px] mx-auto leading-relaxed">
                Destroy the Protocol Leviathan to extract rare artifacts from its corrupted core.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const meta = PERK_META[item.perkType] || DEFAULT_META;
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border ${meta.borderColor} bg-[#0d1525] p-3 transition-colors hover:bg-[#111d30]`}
                  >
                    <div className={`flex items-center justify-center w-9 h-9 rounded-md ${meta.bgColor} border ${meta.borderColor} shrink-0`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-white truncate">{item.itemName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-mono font-bold ${meta.color}`}>
                          {formatPerkValue(item.perkType, item.perkValue)}
                        </span>
                        <span className="text-sm text-muted-foreground">{meta.label}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neon-red/30 hover:text-neon-red hover:bg-neon-red/10 shrink-0"
                      disabled={sacrificing === item.id}
                      onClick={() => handleSacrifice(item.id)}
                      title="Burn artifact"
                    >
                      {sacrificing === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Flame className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weekly buffs from previous boss */}
      {weeklyBuffs.length > 0 && (
        <div className="rounded-lg border border-neon-cyan/20 bg-[#0d1525] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-neon-cyan" />
            <h4 className="text-xs font-display font-semibold text-neon-cyan uppercase tracking-wider">Boss Buffs Active</h4>
          </div>
          <div className="space-y-1">
            {weeklyBuffs.map((buff) => (
              <div key={buff.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neon-cyan" />
                  <span className="text-foreground/80">{buff.buffName}</span>
                </div>
                {buff.consumed && (
                  <span className="text-xs font-mono text-muted-foreground/60 uppercase">consumed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
