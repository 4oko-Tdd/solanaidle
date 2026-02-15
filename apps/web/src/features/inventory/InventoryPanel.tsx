import { Badge } from "@/components/ui/badge";
import type { Inventory } from "@solanaidle/shared";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  inventory: Inventory;
  onRefresh?: () => void;
}

export function InventoryPanel({ inventory }: Props) {
  const resources = [
    { icon: scrapIcon, label: "Lamports", value: inventory.scrap, color: "text-neon-green" },
    { icon: crystalIcon, label: "Tokens", value: inventory.crystal, color: "text-neon-cyan" },
    { icon: artifactIcon, label: "Keys", value: inventory.artifact, color: "text-neon-purple" },
  ];

  return (
    <div className="space-y-4">
      {/* Resources */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-white">Resources</h3>
          <Badge className="text-[10px] py-0 px-2 bg-[#1a3a5c]/40 text-[#4a7a9b] border-[#1a3a5c]/60">
            Epoch
          </Badge>
        </div>
        <p className="text-[11px] text-[#4a7a9b] leading-relaxed">
          Resources are earned from missions and spent on upgrades. They reset each epoch.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {resources.map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-white/[0.08] bg-[#0d1525] p-3 text-center"
            >
              <img src={r.icon} alt={r.label} className="h-10 w-10 mx-auto mb-1.5" />
              <div className={`font-bold font-mono text-lg ${r.color}`}>{r.value}</div>
              <div className="text-[10px] text-muted-foreground">{r.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What resets */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a1628]/60 p-4 space-y-2">
        <h4 className="text-xs font-display font-semibold text-white">Economy Notes</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-red/60" />
            <span className="text-[11px] text-muted-foreground">Resources, upgrades, perks reset each epoch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-green" />
            <span className="text-[11px] text-foreground/80">Permanent loot and badges carry over forever</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-green" />
            <span className="text-[11px] text-foreground/80">Character level persists across epochs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
