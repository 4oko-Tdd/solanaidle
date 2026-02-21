import { View, Text, Image } from "react-native";
import { Shield, Zap, Search, ArrowUp } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { UpgradeInfo, GearTrack } from "@solanaidle/shared";

const TAILWIND_TO_HEX: Record<string, string> = {
  "text-neon-cyan": "#00d4ff",
  "text-neon-amber": "#ffb800",
  "text-neon-green": "#00ff87",
  "text-neon-purple": "#9945ff",
  "text-neon-red": "#ff4444",
};

interface Props {
  upgradeInfo: UpgradeInfo | null;
  inventory: import("@solanaidle/shared").Inventory | null;
  onUpgrade: (track: GearTrack) => void;
}

const TRACKS: {
  id: GearTrack;
  label: string;
  Icon: typeof Shield;
  color: string;
  borderAccent: string;
  bgAccent: string;
}[] = [
  {
    id: "armor",
    label: "Firewall",
    Icon: Shield,
    color: "text-neon-cyan",
    borderAccent: "border-neon-cyan/20",
    bgAccent: "bg-neon-cyan/10",
  },
  {
    id: "engine",
    label: "Turbo",
    Icon: Zap,
    color: "text-neon-amber",
    borderAccent: "border-neon-amber/20",
    bgAccent: "bg-neon-amber/10",
  },
  {
    id: "scanner",
    label: "Scanner",
    Icon: Search,
    color: "text-neon-green",
    borderAccent: "border-neon-green/20",
    bgAccent: "bg-neon-green/10",
  },
];

export function UpgradePanel({ upgradeInfo, onUpgrade }: Props) {
  if (!upgradeInfo) return null;

  return (
    <View className="rounded-xl border border-[#1a3a5c]/60 bg-[#0a1628]/80 p-4 gap-3">
      <Text className="text-base font-bold text-white">Node Upgrades</Text>
      <View className="flex-row gap-2">
        {TRACKS.map((track) => {
          const info = upgradeInfo[track.id];
          const isMaxed = info.next === null;
          const { Icon } = track;

          return (
            <View
              key={track.id}
              className={`flex-1 items-center rounded-lg border ${track.borderAccent} bg-white/[0.02] p-2.5 gap-1`}
            >
              {/* Icon */}
              <View className={`${track.bgAccent} rounded-lg p-1.5`}>
                <Icon size={20} color={TAILWIND_TO_HEX[track.color] ?? "#ffffff"} />
              </View>

              {/* Label */}
              <Text className="text-xs font-bold text-white">{track.label}</Text>

              {/* Level */}
              <Text className="text-sm font-mono text-white/50">
                Lv {info.level}/{info.maxLevel}
              </Text>

              {/* Effect */}
              <Text className={`text-xs font-mono font-bold ${track.color}`}>
                {info.effectLabel}
              </Text>

              {isMaxed ? (
                <Text className="text-xs font-bold text-neon-green py-1">MAX</Text>
              ) : (
                <>
                  {/* Next level preview */}
                  <View className="border-t border-white/[0.06] pt-1.5 w-full items-center">
                    <Text className="text-[10px] text-white/50">
                      Next:{" "}
                      <Text className="font-mono font-bold text-white">
                        {info.next!.effectLabel}
                      </Text>
                    </Text>
                  </View>

                  {/* Costs */}
                  <View className="flex-row flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                    <View className="flex-row items-center gap-0.5">
                      <Image
                        source={require("@/assets/icons/scrap.png")}
                        style={{ width: 20, height: 20 }}
                      />
                      <Text className="text-xs font-mono text-white/80">
                        {info.next!.cost.scrap}
                      </Text>
                    </View>
                    {info.next!.cost.crystal ? (
                      <View className="flex-row items-center gap-0.5">
                        <Image
                          source={require("@/assets/icons/tokens.png")}
                          style={{ width: 20, height: 20 }}
                        />
                        <Text className="text-xs font-mono text-white/80">
                          {info.next!.cost.crystal}
                        </Text>
                      </View>
                    ) : null}
                    {info.next!.cost.artifact ? (
                      <View className="flex-row items-center gap-0.5">
                        <Image
                          source={require("@/assets/icons/key.png")}
                          style={{ width: 20, height: 20 }}
                        />
                        <Text className="text-xs font-mono text-white/80">
                          {info.next!.cost.artifact}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Upgrade button */}
                  <Button
                    size="sm"
                    disabled={!info.next!.canAfford}
                    onPress={() => onUpgrade(track.id)}
                    className="w-full"
                  >
                    <View className="flex-row items-center gap-0.5">
                      <ArrowUp size={12} color="#00ff87" />
                      <Text className="text-xs font-mono text-neon-green">
                        {" "}Lv {info.next!.level}
                      </Text>
                    </View>
                  </Button>
                </>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
