import { Modal, View, Text } from "react-native";
import { Trophy, Skull, Heart, HeartCrack } from "lucide-react-native";
import { Button, Badge } from "@/components/ui";
import type { MissionClaimResponse } from "@solanaidle/shared";

interface Props {
  result: MissionClaimResponse | null;
  onClose: () => void;
  livesRemaining?: number;
}

export function MissionResultDialog({ result, onClose, livesRemaining }: Props) {
  if (!result) return null;

  const isSuccess = result.result === "success";
  const isRunOver = livesRemaining !== undefined && livesRemaining <= 0;

  return (
    <Modal
      visible={!!result}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70 px-6">
        <View
          className={`w-full max-w-sm rounded-2xl border bg-surface p-6 gap-4 ${
            isSuccess ? "border-neon-green/30" : "border-neon-red/30"
          }`}
        >
          {/* Icon */}
          <View className="items-center">
            {isSuccess ? (
              <Trophy size={56} color="#ffb800" />
            ) : (
              <Skull size={56} color="#ff4444" />
            )}
          </View>

          {/* Title + description */}
          <View className="items-center gap-1">
            <Text
              className={`text-xl font-bold text-center ${
                isRunOver
                  ? "text-neon-red"
                  : isSuccess
                  ? "text-neon-green"
                  : "text-white"
              }`}
            >
              {isSuccess
                ? "Transaction Confirmed!"
                : isRunOver
                ? "SLASHED \u2014 Epoch Over"
                : "Transaction Failed"}
            </Text>
            <Text className="text-sm text-white/50 text-center">
              {isSuccess
                ? "Your node returned with rewards!"
                : isRunOver
                ? "No lives remaining. Your epoch has ended."
                : "Your node got slashed..."}
            </Text>
          </View>

          {/* Rewards */}
          {isSuccess && result.rewards && (
            <View className="gap-2">
              <Text className="text-sm font-medium text-center text-white uppercase tracking-wider">
                Rewards:
              </Text>
              <View className="flex-row flex-wrap justify-center gap-2">
                <Badge variant="green">+{result.rewards.xp} XP</Badge>
                <Badge variant="green">+{result.rewards.scrap} Scrap</Badge>
                {result.rewards.crystal ? (
                  <Badge variant="cyan">+{result.rewards.crystal} Tokens</Badge>
                ) : null}
                {result.rewards.artifact ? (
                  <Badge variant="amber">+{result.rewards.artifact} Keys</Badge>
                ) : null}
                {result.rewards.streakMultiplier && result.rewards.streakMultiplier > 1 && (
                  <Badge variant="amber">
                    {result.rewards.streakMultiplier}x Streak Bonus!
                  </Badge>
                )}
              </View>
            </View>
          )}

          {/* Lives remaining indicator */}
          {!isSuccess && !isRunOver && livesRemaining !== undefined && (
            <View className="flex-row items-center justify-center gap-2">
              {Array.from({ length: 3 }, (_, i) =>
                i < livesRemaining ? (
                  <Heart key={i} size={20} color="#ff4444" fill="#ff4444" />
                ) : (
                  <HeartCrack key={i} size={20} color="rgba(255,255,255,0.2)" />
                )
              )}
            </View>
          )}

          {/* Streak lost note */}
          {result.result === "failure" && (
            <Text className="text-xs text-white/40 text-center">Streak lost.</Text>
          )}

          {/* Recovery note */}
          {!isSuccess && !isRunOver && (
            <Text className="text-sm text-white/40 text-center">
              Node is recovering from slash. Check back in 1 hour.
            </Text>
          )}

          {/* Action button */}
          <Button
            onPress={onClose}
            variant={isRunOver ? "destructive" : "default"}
            size="lg"
            className="w-full"
          >
            <Text
              className={`text-base font-bold ${
                isRunOver ? "text-neon-red" : "text-neon-green"
              }`}
            >
              {isSuccess ? "Continue" : isRunOver ? "View Results" : "Understood"}
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
