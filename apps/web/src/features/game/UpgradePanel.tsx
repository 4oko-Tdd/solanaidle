import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UpgradeInfo } from "@solanaidle/shared";
import { ArrowUp } from "lucide-react";

interface Props {
  upgradeInfo: UpgradeInfo;
  onUpgrade: () => void;
}

export function UpgradePanel({ upgradeInfo, onUpgrade }: Props) {
  const { currentGearLevel, nextUpgrade } = upgradeInfo;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Gear Upgrade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          Current: <span className="font-bold font-mono text-neon-green">Level {currentGearLevel}</span>
        </p>
        {nextUpgrade ? (
          <>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Next level cost:</p>
              <div className="flex gap-2 flex-wrap">
                <span className="font-mono">{nextUpgrade.cost.scrap} Scrap</span>
                {nextUpgrade.cost.crystal ? (
                  <span className="font-mono">{nextUpgrade.cost.crystal} Crystal</span>
                ) : null}
                {nextUpgrade.cost.artifact ? (
                  <span className="font-mono">{nextUpgrade.cost.artifact} Artifact</span>
                ) : null}
              </div>
              <p>Fail rate reduction: <span className="font-mono text-neon-green">-{nextUpgrade.failRateReduction}%</span></p>
            </div>
            <Button
              size="sm"
              disabled={!nextUpgrade.canAfford}
              onClick={onUpgrade}
              className="w-full"
            >
              <ArrowUp className="h-4 w-4 mr-1 text-neon-green" />
              Upgrade to Level {nextUpgrade.level}
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Max level reached!</p>
        )}
      </CardContent>
    </Card>
  );
}
