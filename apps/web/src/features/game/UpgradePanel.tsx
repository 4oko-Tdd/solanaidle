import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UpgradeInfo, GearTrack } from "@solanaidle/shared";
import { Shield, Zap, Search, ArrowUp } from "lucide-react";
import scrapIcon from "@/assets/icons/res1.png";
import crystalIcon from "@/assets/icons/res2.png";
import artifactIcon from "@/assets/icons/25.png";

interface Props {
  upgradeInfo: UpgradeInfo;
  onUpgrade: (track: GearTrack) => void;
}

const TRACKS: { id: GearTrack; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "armor", label: "Firewall", icon: <Shield className="h-5 w-5" />, color: "text-neon-cyan" },
  { id: "engine", label: "Turbo", icon: <Zap className="h-5 w-5" />, color: "text-neon-amber" },
  { id: "scanner", label: "Scanner", icon: <Search className="h-5 w-5" />, color: "text-neon-green" },
];

export function UpgradePanel({ upgradeInfo, onUpgrade }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Node Upgrades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 items-stretch">
          {TRACKS.map((track) => {
            const info = upgradeInfo[track.id];
            const isMaxed = info.next === null;

            return (
              <div
                key={track.id}
                className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 gap-1"
              >
                {/* Fixed top section */}
                <div className={track.color}>{track.icon}</div>
                <span className="text-xs font-display font-bold">{track.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Lv {info.level}/{info.maxLevel}
                </span>
                <span className={`text-[10px] font-mono font-bold ${track.color}`}>
                  {info.effectLabel}
                </span>

                {/* Spacer pushes bottom content down */}
                <div className="flex-1" />

                {isMaxed ? (
                  <span className="text-xs font-bold text-neon-green py-1">MAX</span>
                ) : (
                  <>
                    <div className="border-t border-white/[0.06] pt-1.5 w-full text-center">
                      <span className="text-[10px] text-muted-foreground">Next: <span className="font-mono font-bold text-foreground">{info.next!.effectLabel}</span></span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                      <div className="flex items-center gap-0.5">
                        <img src={scrapIcon} alt="" className="h-3 w-3" />
                        <span className="text-[10px] font-mono">{info.next!.cost.scrap}</span>
                      </div>
                      {info.next!.cost.crystal ? (
                        <div className="flex items-center gap-0.5">
                          <img src={crystalIcon} alt="" className="h-3 w-3" />
                          <span className="text-[10px] font-mono">{info.next!.cost.crystal}</span>
                        </div>
                      ) : null}
                      {info.next!.cost.artifact ? (
                        <div className="flex items-center gap-0.5">
                          <img src={artifactIcon} alt="" className="h-3 w-3" />
                          <span className="text-[10px] font-mono">{info.next!.cost.artifact}</span>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      size="sm"
                      disabled={!info.next!.canAfford}
                      onClick={() => onUpgrade(track.id)}
                      className="w-full text-xs h-7"
                    >
                      <ArrowUp className="h-3 w-3 mr-0.5" />
                      Lv {info.next!.level}
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
