import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Inventory } from "@solanaidle/shared";
import { Wrench, Gem, Archive } from "lucide-react";

interface Props {
  inventory: Inventory;
}

export function InventoryPanel({ inventory }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
            <Wrench className="h-4 w-4 text-neon-amber mb-1" />
            <span className="text-lg font-mono font-bold text-neon-green">{inventory.scrap}</span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Lamports</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
            <Gem className="h-4 w-4 text-neon-cyan mb-1" />
            <span className="text-lg font-mono font-bold text-neon-green">{inventory.crystal}</span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Tokens</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
            <Archive className="h-4 w-4 text-neon-purple mb-1" />
            <span className="text-lg font-mono font-bold text-neon-green">{inventory.artifact}</span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Keys</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
