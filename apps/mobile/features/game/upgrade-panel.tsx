import { View, Text, Image } from "react-native";
import { Shield, Zap, Search, ArrowUp } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { UpgradeInfo, GearTrack } from "@solanaidle/shared";
import { GlassPanel } from "@/components/glass-panel";
import { GradientText } from "@/components/gradient-text";

const TAILWIND_TO_HEX: Record<string, string> = {
  "text-neon-cyan": "#00d4ff",
  "text-neon-amber": "#ffb800",
  "text-neon-green": "#14F195",
  "text-neon-purple": "#9945ff",
  "text-neon-red": "#FF3366",
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
    <GlassPanel contentStyle={{ padding: 20, gap: 14 }}>
      <Text className="text-lg font-display text-white" style={{ letterSpacing: 0.5 }}>Node Upgrades</Text>
      <View className="flex-row gap-2.5 items-stretch">
        {TRACKS.map((track) => {
          const info = upgradeInfo[track.id];
          const isMaxed = info.next === null;
          const { Icon } = track;

          return (
            <View
              key={track.id}
              className={`flex-1 items-center rounded-lg border ${track.borderAccent} bg-white/[0.02] p-3 gap-1.5`}
            >
              {/* Icon */}
              <View className={`${track.bgAccent} rounded-lg p-2`}>
                <Icon size={22} color={TAILWIND_TO_HEX[track.color] ?? "#ffffff"} />
              </View>

              {/* Label */}
              <Text className="text-sm font-sans-bold text-white">{track.label}</Text>

              {/* Level */}
              <Text className="text-base font-mono text-white/50">
                Lv {info.level}/{info.maxLevel}
              </Text>

              {/* Effect */}
              <Text className={`text-sm font-display ${track.color}`}>
                {info.effectLabel}
              </Text>

              {/* Spacer to push upgrade section to bottom */}
              <View className="flex-1" />

              {isMaxed ? (
                <Text className="text-sm font-display text-neon-green py-1">MAX</Text>
              ) : (
                <>
                  {/* Next level preview */}
                  <View className="border-t border-white/[0.06] pt-2 w-full items-center gap-0.5">
                    <Text className="text-xs text-white/40">Next</Text>
                    <Text className={`text-sm font-display ${track.color}`} numberOfLines={1}>
                      {info.next!.effectLabel}
                    </Text>
                  </View>

                  {/* Costs */}
                  <View className="flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <View className="flex-row items-center gap-0.5">
                      <Image
                        source={require("@/assets/icons/scrap.png")}
                        style={{ width: 22, height: 22 }}
                      />
                      <Text className="text-sm font-mono text-white/80">
                        {info.next!.cost.scrap}
                      </Text>
                    </View>
                    {info.next!.cost.crystal ? (
                      <View className="flex-row items-center gap-0.5">
                        <Image
                          source={require("@/assets/icons/tokens.png")}
                          style={{ width: 22, height: 22 }}
                        />
                        <Text className="text-sm font-mono text-white/80">
                          {info.next!.cost.crystal}
                        </Text>
                      </View>
                    ) : null}
                    {info.next!.cost.artifact ? (
                      <View className="flex-row items-center gap-0.5">
                        <Image
                          source={require("@/assets/icons/key.png")}
                          style={{ width: 22, height: 22 }}
                        />
                        <Text className="text-sm font-mono text-white/80">
                          {info.next!.cost.artifact}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Upgrade button */}
                  <Button
                    size="sm"
                    variant="gradient"
                    disabled={!info.next!.canAfford}
                    onPress={() => onUpgrade(track.id)}
                    className="w-full"
                  >
                    <View className="flex-row items-center gap-0.5">
                      <ArrowUp size={14} color="#ffffff" />
                      <Text className="text-sm font-mono-bold text-white">
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
    </GlassPanel>
  );
}
