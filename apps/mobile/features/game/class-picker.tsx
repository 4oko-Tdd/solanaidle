import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { Button, Card, Badge } from "@/components/ui";
import { ClassIcon } from "@/components/class-icon";
import type { CharacterClass, ClassId } from "@solanaidle/shared";

interface Props {
  classes: CharacterClass[];
  currentClassId?: ClassId | null;
  onSelect: (classId: ClassId, signature?: string) => Promise<void>;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / 604800000 + 1);
}

function formatModifier(value: number, isMultiplier: boolean): string | null {
  if (isMultiplier) {
    if (value === 1.0) return null;
    const pct = Math.round((value - 1) * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }
  if (value === 0) return null;
  return value > 0 ? `+${value}%` : `${value}%`;
}

export function ClassPicker({ classes, currentClassId, onSelect }: Props) {
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [signing, setSigning] = useState(false);

  const selectedClass = classes.find((c) => c.id === selected);
  const weekNum = getWeekNumber();

  const handleClassPress = (classId: ClassId) => {
    setSelected(classId);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSigning(true);
    try {
      // Signature is optional — the mobile flow skips signMessage to keep UX simple
      // The server accepts "unsigned" as a valid nonce for class selection
      await onSelect(selected, undefined);
    } finally {
      setSigning(false);
      setConfirming(false);
      setSelected(null);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
    setSelected(null);
  };

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      >
        {/* Header */}
        <View className="items-center gap-2">
          <Text className="text-2xl font-display text-neon-green">Epoch {weekNum}</Text>
          <Text className="text-sm text-white/50 text-center">
            Choose your node type. Each has unique strengths and trade-offs.
          </Text>
        </View>

        {/* Class cards */}
        <View className="gap-3">
          {classes.map((cls) => {
            const speedMod = formatModifier(cls.durationModifier, true);
            const failMod = formatModifier(cls.failRateModifier, false);
            const lootMod = formatModifier(cls.lootModifier, true);
            const xpMod = formatModifier(cls.xpModifier, true);
            const isCurrent = currentClassId === cls.id;

            return (
              <Pressable
                key={cls.id}
                onPress={() => handleClassPress(cls.id)}
                className="active:opacity-80"
              >
                <Card highlight={isCurrent}>
                  {/* Title row */}
                  <View className="flex-row items-center gap-3">
                    <ClassIcon classId={cls.id} size={56} />
                    <View className="flex-1">
                      <Text className="text-lg font-display text-white">{cls.name}</Text>
                      {isCurrent && (
                        <Text className="text-xs text-neon-green font-mono">Current</Text>
                      )}
                    </View>
                  </View>

                  <Text className="text-sm text-white/70">{cls.description}</Text>

                  {/* Modifier badges */}
                  <View className="flex-row flex-wrap gap-1">
                    {speedMod && (
                      <Badge variant={cls.durationModifier < 1 ? "green" : "red"}>
                        {cls.durationModifier < 1 ? `Speed: ${speedMod}` : `Slow: ${speedMod}`}
                      </Badge>
                    )}
                    {failMod && (
                      <Badge variant={cls.failRateModifier < 0 ? "green" : "red"}>
                        {`Fail: ${failMod}`}
                      </Badge>
                    )}
                    {lootMod && (
                      <Badge variant={cls.lootModifier > 1 ? "green" : "red"}>
                        {`Loot: ${lootMod}`}
                      </Badge>
                    )}
                    {xpMod && (
                      <Badge variant={cls.xpModifier > 1 ? "green" : "red"}>
                        {`XP: ${xpMod}`}
                      </Badge>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal
        visible={confirming}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#0a1628] rounded-t-2xl border-t border-[#1a3a5c]/60 p-6 gap-4">
            {/* Class icon */}
            {selected && (
              <View className="items-center">
                <ClassIcon classId={selected} size={48} />
              </View>
            )}

            <View className="items-center gap-1">
              <Text className="text-xl font-display text-white">Commit to Epoch</Text>
              <Text className="text-sm text-white/50 text-center">
                You are about to begin Epoch {weekNum} as a{" "}
                <Text className="text-white font-sans-semibold">{selectedClass?.name}</Text>. 3 lives. No
                turning back.
              </Text>
            </View>

            {/* MagicBlock badge */}
            <View className="flex-row items-center justify-center gap-1.5">
              <ShieldCheck size={12} color="#00d4ff" />
              <Text className="text-xs text-white/40">Progress tracked on-chain via MagicBlock</Text>
            </View>

            <View className="gap-2">
              <Button
                onPress={handleConfirm}
                disabled={signing}
                size="lg"
                className="w-full"
              >
                {signing ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#14F195" />
                    <Text className="text-base font-display text-neon-green">Signing...</Text>
                  </View>
                ) : (
                  <Text className="text-base font-display text-neon-green">Sign &amp; Begin</Text>
                )}
              </Button>

              <Button
                variant="ghost"
                onPress={handleCancel}
                disabled={signing}
                size="lg"
                className="w-full"
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
