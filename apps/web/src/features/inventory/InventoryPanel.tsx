import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Inventory, LootEntry } from "@solanaidle/shared";
import {
  Archive,
  Cpu,
  Cable,
  Fan,
  HardDrive,
  Key,
  ScanSearch,
  Package,
  Zap,
  Coins,
  Merge,
  X,
  Loader2,
} from "lucide-react";
import { CurrencyBar } from "@/components/CurrencyBar";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

const LOOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ram_stick: Cpu,
  lan_cable: Cable,
  nvme_fragment: HardDrive,
  cooling_fan: Fan,
  validator_key_shard: Key,
};

const TIER_LABEL: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
};

const TIER_PERK_TEXT: Record<number, string> = {
  1: "+5% loot, -1% time",
  2: "+10% loot, -2% time",
  3: "+15% loot, -3% time",
};

const TIER_STYLE: Record<number, string> = {
  1: "border-white/20 text-muted-foreground",
  2: "border-neon-cyan/50 text-neon-cyan",
  3: "border-neon-purple/50 text-neon-purple",
};

/** Sell price per 1 item (match backend) */
const SELL_PRICES: Record<number, { scrap: number; crystal?: number; artifact?: number }> = {
  1: { scrap: 10 },
  2: { scrap: 35, crystal: 5 },
  3: { scrap: 100, crystal: 20, artifact: 1 },
};

function formatPrice(tier: number): string {
  const p = SELL_PRICES[tier];
  if (!p) return "";
  const parts = [];
  if (p.scrap) parts.push(`${p.scrap} Lamports`);
  if (p.crystal) parts.push(`${p.crystal} Tokens`);
  if (p.artifact) parts.push(`${p.artifact} Keys`);
  return parts.join(", ");
}

interface LootItemCardProps {
  entry: LootEntry;
  selectedCount: number;
  onToggle: () => void;
}

function LootItemCard({ entry, selectedCount, onToggle }: LootItemCardProps) {
  const Icon = LOOT_ICONS[entry.itemId] ?? Archive;
  const tier = entry.tier ?? 1;
  const isSelected = selectedCount > 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col items-center rounded-xl border p-4 transition text-left w-full ${
        isSelected
          ? "border-neon-green/60 bg-neon-green/10 ring-2 ring-neon-green/40"
          : "border-white/[0.08] bg-white/[0.04] hover:border-neon-purple/30 hover:bg-white/[0.06]"
      }`}
    >
      <div className="relative mb-2 flex h-14 w-14 items-center justify-center rounded-lg bg-white/[0.06]">
        {entry.imageUrl ? (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className="h-10 w-10 object-contain"
          />
        ) : (
          <Icon className="h-8 w-8 text-neon-cyan" />
        )}
        <Badge
          variant="outline"
          className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] font-bold ${TIER_STYLE[tier] ?? TIER_STYLE[1]}`}
        >
          {TIER_LABEL[tier] ?? "I"}
        </Badge>
        {isSelected && (
          <span className="absolute bottom-0 right-0 rounded bg-neon-green px-1 font-mono text-[10px] text-black">
            ×{selectedCount}
          </span>
        )}
      </div>
      <span className="text-center text-sm font-medium text-white line-clamp-2">
        {entry.name}
      </span>
      <span className="mt-0.5 font-mono text-xs text-muted-foreground">
        ×{entry.quantity}
      </span>
      <span className="mt-1 text-[10px] text-muted-foreground">
        {TIER_PERK_TEXT[tier]}
      </span>
      <span className="mt-0.5 text-[10px] text-neon-green/90">
        Sell: {formatPrice(tier)}
      </span>
    </button>
  );
}

interface Props {
  inventory: Inventory;
  onRefresh?: () => void;
}

export function InventoryPanel({ inventory, onRefresh }: Props) {
  const loot = inventory.loot ?? [];
  const dropChance = inventory.lootDropChancePercent ?? 20;
  const speedPercent = inventory.lootSpeedPercent ?? 0;
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [selling, setSelling] = useState(false);
  const [merging, setMerging] = useState(false);

  const selectedList = Object.entries(selected).filter(([, q]) => q > 0);
  const totalSelected = selectedList.reduce((s, [, q]) => s + q, 0);
  const allSelectedTier1 =
    totalSelected === 3 &&
    selectedList.every(([itemId]) => {
      const e = loot.find((x) => x.itemId === itemId);
      return e && (e.tier ?? 1) === 1;
    });

  const handleToggle = useCallback(
    (entry: LootEntry) => {
      setSelected((prev) => {
        const cur = prev[entry.itemId] ?? 0;
        const next = cur >= entry.quantity ? 0 : cur + 1;
        if (next === 0) {
          const u = { ...prev };
          delete u[entry.itemId];
          return u;
        }
        return { ...prev, [entry.itemId]: next };
      });
    },
    []
  );

  const handleSell = useCallback(async () => {
    if (totalSelected === 0) return;
    setSelling(true);
    try {
      const items = selectedList.map(([itemId, quantity]) => ({ itemId, quantity }));
      await api("/inventory/loot/sell", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      addToast("Loot sold", "success");
      setSelected({});
      onRefresh?.();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Sell failed";
      addToast(msg, "error");
    } finally {
      setSelling(false);
    }
  }, [selectedList, totalSelected, addToast, onRefresh]);

  const handleMerge = useCallback(async () => {
    if (!allSelectedTier1) return;
    setMerging(true);
    try {
      const items = selectedList.map(([itemId, quantity]) => ({ itemId, quantity }));
      await api("/inventory/loot/merge", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      addToast("3× T1 → 1× T2 merged!", "success");
      setSelected({});
      onRefresh?.();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Merge failed";
      addToast(msg, "error");
    } finally {
      setMerging(false);
    }
  }, [selectedList, allSelectedTier1, addToast, onRefresh]);

  const clearSelection = useCallback(() => setSelected({}), []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencyBar inventory={inventory} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Package className="h-4 w-4" />
            Loot
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tap items to select. Sell for currency or merge 3× T1 → 1× T2.
          </p>
          {(dropChance > 20 || speedPercent > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-neon-green">
                <Zap className="h-3 w-3" />
                Loot chance {dropChance}%
              </span>
              {speedPercent > 0 && (
                <span className="flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-neon-cyan">
                  Missions {speedPercent}% faster
                </span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loot.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
              <ScanSearch className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No loot yet</p>
              <p className="text-xs text-muted-foreground/80">
                Complete missions to get random drops (base 20%).
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {loot.map((entry) => (
                  <LootItemCard
                    key={entry.itemId}
                    entry={entry}
                    selectedCount={selected[entry.itemId] ?? 0}
                    onToggle={() => handleToggle(entry)}
                  />
                ))}
              </div>

              {totalSelected > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <span className="text-xs text-muted-foreground">
                    Selected: {totalSelected}
                    {allSelectedTier1 && " (3× T1 → Merge)"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={clearSelection}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-neon-green text-black hover:bg-neon-green/90"
                    disabled={selling}
                    onClick={handleSell}
                  >
                    {selling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Coins className="h-3 w-3 mr-1" />}
                    Sell
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    disabled={!allSelectedTier1 || merging}
                    onClick={handleMerge}
                    title="Merge 3 tier-1 items into 1 random tier-2"
                  >
                    {merging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Merge className="h-3 w-3 mr-1" />}
                    Merge (3×T1→T2)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
