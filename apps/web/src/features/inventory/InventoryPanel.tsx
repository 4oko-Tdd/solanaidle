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
        <CardTitle className="text-base">Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-lg border border-border p-2">
            <Wrench className="h-4 w-4 text-orange-400 mb-1" />
            <span className="text-lg font-bold">{inventory.scrap}</span>
            <span className="text-xs text-muted-foreground">Scrap</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-border p-2">
            <Gem className="h-4 w-4 text-blue-400 mb-1" />
            <span className="text-lg font-bold">{inventory.crystal}</span>
            <span className="text-xs text-muted-foreground">Crystal</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-border p-2">
            <Archive className="h-4 w-4 text-purple-400 mb-1" />
            <span className="text-lg font-bold">{inventory.artifact}</span>
            <span className="text-xs text-muted-foreground">Artifact</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
