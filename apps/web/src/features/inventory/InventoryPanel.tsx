import { useState, useCallback } from "react";
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
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";
import ramStickIcon from "@/assets/icons/loot/ram_stick.png";
import lanCableIcon from "@/assets/icons/loot/lan_cable.png";
import nvmeFragmentIcon from "@/assets/icons/loot/NVMe_fragment.png";
import coolingFanIcon from "@/assets/icons/loot/cooling_fan.png";
import validatorKeyShardIcon from "@/assets/icons/loot/Validator_key_shard.png";

/** Custom loot images (art folder). Missing = fallback to LOOT_ICONS. */
const LOOT_IMAGES: Record<string, string> = {
  ram_stick: ramStickIcon,
  lan_cable: lanCableIcon,
  nvme_fragment: nvmeFragmentIcon,
  cooling_fan: coolingFanIcon,
  validator_key_shard: validatorKeyShardIcon,
};

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

const TIER_BORDER: Record<number, string> = {
  1: "border-[#4a7a9b]/40",
  2: "border-neon-cyan/50",
  3: "border-[#9945FF]/50",
};

const TIER_BADGE: Record<number, string> = {
  1: "bg-[#1a3a5c]/60 text-[#4a7a9b] border-[#4a7a9b]/30",
  2: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30",
  3: "bg-[#9945FF]/15 text-[#c4a0ff] border-[#9945FF]/30",
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
  if (p.scrap) parts.push(`${p.scrap}`);
  if (p.crystal) parts.push(`${p.crystal}`);
  if (p.artifact) parts.push(`${p.artifact}`);
  return parts.join(" / ");
}

interface LootItemCardProps {
  entry: LootEntry;
  selectedCount: number;
  onToggle: () => void;
}

function LootItemCard({ entry, selectedCount, onToggle }: LootItemCardProps) {
  const customImg = LOOT_IMAGES[entry.itemId];
  const Icon = LOOT_ICONS[entry.itemId] ?? Archive;
  const tier = entry.tier ?? 1;
  const isSelected = selectedCount > 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col items-center rounded-xl border p-2.5 transition-all text-left w-full ${
        isSelected
          ? "border-[#14F195]/60 bg-[#14F195]/[0.08] ring-1 ring-[#14F195]/30"
          : `${TIER_BORDER[tier] ?? TIER_BORDER[1]} bg-[#0d1f35]/60 hover:bg-[#0d1f35]/80`
      }`}
    >
      <div className="relative mb-1 flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#1a3a5c]/40">
        {customImg ? (
          <img src={customImg} alt={entry.name} className="h-[4.5rem] w-[4.5rem] object-contain" />
        ) : entry.imageUrl ? (
          <img src={entry.imageUrl} alt={entry.name} className="h-[4.5rem] w-[4.5rem] object-contain" />
        ) : (
          <Icon className={`h-12 w-12 ${tier === 3 ? "text-[#c4a0ff]" : tier === 2 ? "text-neon-cyan" : "text-[#7ab8d9]"}`} />
        )}
        <Badge
          className={`absolute -right-1.5 -top-1.5 h-4 min-w-4 rounded-full px-1 py-0 text-[9px] font-bold ${TIER_BADGE[tier] ?? TIER_BADGE[1]}`}
        >
          {TIER_LABEL[tier] ?? "I"}
        </Badge>
        {isSelected && (
          <span className="absolute -bottom-1 -right-1 rounded bg-[#14F195] px-1 font-mono text-[9px] font-bold text-black">
            x{selectedCount}
          </span>
        )}
      </div>
      <span className="text-center text-xs font-medium text-white line-clamp-1">
        {entry.name}
      </span>
      <span className="font-mono text-[10px] text-[#4a7a9b]">
        x{entry.quantity}
      </span>
      <span className="mt-0.5 text-[9px] text-[#4a7a9b]/70">
        {TIER_PERK_TEXT[tier]}
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
  const [devLootItem, setDevLootItem] = useState("ram_stick");
  const [devLootQty, setDevLootQty] = useState(1);
  const [devLootAdding, setDevLootAdding] = useState(false);

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
      addToast("3x T1 → 1x T2 merged!", "success");
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

  const handleDevAddLoot = useCallback(async () => {
    setDevLootAdding(true);
    try {
      const res = await api<{ message: string }>("/dev/add-loot", {
        method: "POST",
        body: JSON.stringify({ itemId: devLootItem, quantity: devLootQty }),
      });
      addToast(res.message, "success");
      onRefresh?.();
    } catch {
      addToast("Add loot failed", "error");
    } finally {
      setDevLootAdding(false);
    }
  }, [devLootItem, devLootQty, addToast, onRefresh]);

  return (
    <div className="space-y-4">
      {/* Dev: Add loot (only in development) */}
      {import.meta.env.DEV && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-[10px] font-medium text-amber-200/90 uppercase tracking-wider">Dev: выдать лут</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={devLootItem}
              onChange={(e) => setDevLootItem(e.target.value)}
              className="h-8 text-xs rounded border border-white/20 bg-white/5 text-foreground px-2 min-w-[140px]"
            >
              <option value="ram_stick">RAM Stick</option>
              <option value="lan_cable">LAN Cable</option>
              <option value="nvme_fragment">NVMe Fragment</option>
              <option value="cooling_fan">Cooling Fan</option>
              <option value="validator_key_shard">Validator Key Shard</option>
            </select>
            <input
              type="number"
              min={1}
              max={99}
              value={devLootQty}
              onChange={(e) => setDevLootQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
              className="h-8 w-14 text-xs rounded border border-white/20 bg-white/5 text-foreground px-2 text-center"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              disabled={devLootAdding}
              onClick={handleDevAddLoot}
            >
              {devLootAdding ? "…" : "Выдать"}
            </Button>
          </div>
        </div>
      )}

      {/* Loot bonuses (if any) */}
      {(dropChance > 20 || speedPercent > 0) && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#14F195]/[0.08] border border-[#14F195]/20 px-2.5 py-1">
            <Zap className="h-3 w-3 text-[#14F195]" />
            <span className="text-[11px] font-mono text-[#14F195]">Loot {dropChance}%</span>
          </div>
          {speedPercent > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-neon-cyan/[0.08] border border-neon-cyan/20 px-2.5 py-1">
              <Clock className="h-3 w-3 text-neon-cyan" />
              <span className="text-[11px] font-mono text-neon-cyan">-{speedPercent}% time</span>
            </div>
          )}
        </div>
      )}

      {/* Loot section */}
      <div className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 backdrop-blur-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-[#9945FF]" />
            <h3 className="text-base font-display font-semibold text-white">Loot</h3>
          </div>
          {loot.length > 0 && (
            <Badge className="text-[10px] py-0 px-2 bg-[#1a3a5c]/40 text-[#4a7a9b] border-[#1a3a5c]/60">
              {loot.reduce((s, e) => s + e.quantity, 0)} items
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-[#4a7a9b] leading-relaxed">
          Tap to select. Sell for resources or merge 3x T1 into a random T2.
        </p>

        {loot.length === 0 ? (
          <div className="space-y-4">
            {/* Empty state */}
            <div className="rounded-xl border border-dashed border-[#1a3a5c]/60 bg-[#0a1628]/40 p-8 text-center space-y-3">
              <ScanSearch className="h-10 w-10 text-[#4a7a9b]/40 mx-auto" />
              <p className="text-sm font-medium text-[#4a7a9b]">No loot yet</p>
              <p className="text-xs text-[#4a7a9b]/70 max-w-[240px] mx-auto leading-relaxed">
                Complete missions to find hardware drops. Base drop chance is 20% per success.
              </p>
            </div>

            {/* How loot works */}
            <div className="space-y-2">
              <h4 className="text-xs font-display font-semibold text-white">How Loot Works</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <Package className="h-3.5 w-3.5 text-[#14F195] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-medium text-white">Random Drops</p>
                    <p className="text-[10px] text-[#4a7a9b]">Every successful mission has a chance to drop hardware components (T1, T2, T3).</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Zap className="h-3.5 w-3.5 text-neon-amber shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-medium text-white">Passive Bonuses</p>
                    <p className="text-[10px] text-[#4a7a9b]">Each loot item gives passive bonuses: increased drop chance and faster mission times.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#9945FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-medium text-white">Sell or Merge</p>
                    <p className="text-[10px] text-[#4a7a9b]">Sell loot for Lamports/Tokens/Keys, or merge 3x Tier I into a random Tier II upgrade.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sell prices reference */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-display font-semibold text-white">Sell Prices</h4>
              <div className="rounded-lg border border-[#1a3a5c]/30 overflow-hidden">
                {[1, 2, 3].map((tier, i) => {
                  const p = SELL_PRICES[tier]!;
                  return (
                    <div key={tier} className={`flex items-center justify-between px-3 py-1.5 ${i < 2 ? "border-b border-[#1a3a5c]/20" : ""}`}>
                      <span className="text-[10px] text-[#4a7a9b] font-mono">Tier {TIER_LABEL[tier]}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <img src={scrapIcon} alt="" className="h-3 w-3" />
                          <span className="text-[10px] font-mono text-white">{p.scrap}</span>
                        </span>
                        {p.crystal && (
                          <span className="flex items-center gap-0.5">
                            <img src={crystalIcon} alt="" className="h-3 w-3" />
                            <span className="text-[10px] font-mono text-white">{p.crystal}</span>
                          </span>
                        )}
                        {p.artifact && (
                          <span className="flex items-center gap-0.5">
                            <img src={artifactIcon} alt="" className="h-3 w-3" />
                            <span className="text-[10px] font-mono text-white">{p.artifact}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {loot.map((entry) => (
                <LootItemCard
                  key={entry.itemId}
                  entry={entry}
                  selectedCount={selected[entry.itemId] ?? 0}
                  onToggle={() => handleToggle(entry)}
                />
              ))}
            </div>

            {/* Selection action bar */}
            {totalSelected > 0 && (
              <div className="rounded-lg border border-[#1a3a5c]/40 bg-[#0d1f35]/80 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#4a7a9b]">
                    {totalSelected} selected
                    {allSelectedTier1 && <span className="text-neon-cyan ml-1">— ready to merge</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-[#4a7a9b] hover:text-white px-2"
                    onClick={clearSelection}
                  >
                    <X className="h-3 w-3 mr-0.5" />
                    Clear
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/40 hover:bg-[#14F195]/30"
                    disabled={selling}
                    onClick={handleSell}
                  >
                    {selling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Coins className="h-3 w-3 mr-1" />}
                    Sell
                  </Button>
                  <Button
                    size="sm"
                    className={`flex-1 h-8 text-xs ${
                      allSelectedTier1
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30"
                        : "bg-[#1a3a5c]/30 text-[#4a7a9b] border border-[#1a3a5c]/40"
                    }`}
                    disabled={!allSelectedTier1 || merging}
                    onClick={handleMerge}
                    title="Merge 3 tier-1 items into 1 random tier-2"
                  >
                    {merging ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Merge className="h-3 w-3 mr-1" />}
                    Merge 3xT1
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
