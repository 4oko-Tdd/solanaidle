import { Modal, View, Text, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Trophy, Skull, Heart, HeartCrack, Sparkles, Zap } from "lucide-react-native";
import { Button } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import { useGlowPulse, useFadeInUp } from "@/lib/animations";
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

  const glowStyle = useGlowPulse(
    isSuccess ? "20, 241, 149" : "255, 51, 102",
    true,
  );
  const fadeIn1 = useFadeInUp(100);
  const fadeIn2 = useFadeInUp(200);
  const fadeIn3 = useFadeInUp(300);
  const fadeIn4 = useFadeInUp(400);
  const fadeIn5 = useFadeInUp(500);
  const fadeInDelays = [fadeIn1, fadeIn2, fadeIn3, fadeIn4, fadeIn5];

  return (
    <Modal
      visible={!!result}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/80 px-6">
        <Animated.View
          style={[
            {
              width: "100%",
              maxWidth: 380,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isSuccess
                ? "rgba(20,241,149,0.25)"
                : "rgba(255,51,102,0.25)",
            },
            glowStyle,
          ]}
        >
          <LinearGradient
            colors={
              isSuccess
                ? ["#0a1a12", "#0d0f18", "#0a0c14"]
                : ["#1a0a10", "#0d0f18", "#0a0c14"]
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 24, gap: 16 }}
          >
            {/* Gradient accent line at top */}
            {isSuccess && (
              <LinearGradient
                colors={["transparent", "#14F195", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 1.5,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              />
            )}

            {/* Icon */}
            <View style={{ alignItems: "center" }}>
              {isSuccess ? (
                <Trophy size={56} color="#ffb800" />
              ) : (
                <Skull size={56} color="#FF3366" />
              )}
            </View>

            {/* Title + description */}
            <View style={{ alignItems: "center", gap: 6 }}>
              {isSuccess ? (
                <GradientText
                  colors={["#14F195", "#9945FF", "#14F195"]}
                  className="text-xl font-display text-center"
                >
                  Transaction Confirmed!
                </GradientText>
              ) : (
                <Text
                  className={`text-xl font-display text-center ${
                    isRunOver ? "text-neon-red" : "text-white"
                  }`}
                >
                  {isRunOver ? "SLASHED \u2014 Epoch Over" : "Transaction Failed"}
                </Text>
              )}
              <Text className="text-sm text-white/40 text-center">
                {isSuccess
                  ? "Your node returned with rewards!"
                  : isRunOver
                  ? "No lives remaining. Your epoch has ended."
                  : "Your node got slashed..."}
              </Text>
            </View>

            {/* Rewards */}
            {isSuccess && result.rewards && (
              <View style={{ gap: 10 }}>
                {/* Section header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Sparkles size={12} color="rgba(20,241,149,0.5)" />
                  <Text
                    style={{
                      fontSize: 10,
                      letterSpacing: 2,
                      color: "rgba(20,241,149,0.5)",
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    Rewards Collected
                  </Text>
                  <Sparkles size={12} color="rgba(20,241,149,0.5)" />
                </View>

                {/* Reward grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Animated.View style={[{ flex: 1, minWidth: "45%" }, fadeInDelays[0]]}>
                    <RewardCard
                      icon={<Zap size={16} color="#14F195" />}
                      label="XP"
                      value={`+${result.rewards.xp}`}
                      borderColor="rgba(20,241,149,0.12)"
                      bgColor="rgba(20,241,149,0.04)"
                      valueColor="#14F195"
                    />
                  </Animated.View>

                  <Animated.View style={[{ flex: 1, minWidth: "45%" }, fadeInDelays[1]]}>
                    <RewardCard
                      icon={
                        <Image
                          source={require("@/assets/icons/scrap.png")}
                          style={{ width: 28, height: 28 }}
                        />
                      }
                      label="Scrap"
                      value={`+${result.rewards.scrap}`}
                      borderColor="rgba(20,241,149,0.12)"
                      bgColor="rgba(20,241,149,0.04)"
                      valueColor="#14F195"
                    />
                  </Animated.View>

                  {result.rewards.crystal ? (
                    <Animated.View style={[{ flex: 1, minWidth: "45%" }, fadeInDelays[2]]}>
                      <RewardCard
                        icon={
                          <Image
                            source={require("@/assets/icons/tokens.png")}
                            style={{ width: 20, height: 20 }}
                          />
                        }
                        label="Tokens"
                        value={`+${result.rewards.crystal}`}
                        borderColor="rgba(0,212,255,0.12)"
                        bgColor="rgba(0,212,255,0.04)"
                        valueColor="#00D4FF"
                      />
                    </Animated.View>
                  ) : null}

                  {result.rewards.artifact ? (
                    <Animated.View style={[{ flex: 1, minWidth: "45%" }, fadeInDelays[3]]}>
                      <RewardCard
                        icon={
                          <Image
                            source={require("@/assets/icons/key.png")}
                            style={{ width: 20, height: 20 }}
                          />
                        }
                        label="Keys"
                        value={`+${result.rewards.artifact}`}
                        borderColor="rgba(255,184,0,0.12)"
                        bgColor="rgba(255,184,0,0.04)"
                        valueColor="#FFB800"
                      />
                    </Animated.View>
                  ) : null}
                </View>

                {/* Streak bonus */}
                {result.rewards.streakMultiplier && result.rewards.streakMultiplier > 1 && (
                  <Animated.View style={fadeInDelays[4]}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "rgba(255,184,0,0.2)",
                        backgroundColor: "rgba(255,184,0,0.06)",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        boxShadow: "0 0 20px rgba(255,184,0,0.1), 0 0 40px rgba(255,184,0,0.04)",
                      }}
                    >
                      <Sparkles size={16} color="#FFB800" />
                      <Text
                        style={{
                          fontWeight: "800",
                          fontSize: 14,
                          color: "#FFB800",
                          letterSpacing: 1,
                        }}
                      >
                        {result.rewards.streakMultiplier}x Streak Bonus!
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            )}

            {/* Lives remaining indicator */}
            {!isSuccess && !isRunOver && livesRemaining !== undefined && (
              <View className="flex-row items-center justify-center gap-2">
                {Array.from({ length: 3 }, (_, i) =>
                  i < livesRemaining ? (
                    <Heart key={i} size={20} color="#FF3366" fill="#FF3366" />
                  ) : (
                    <HeartCrack key={i} size={20} color="rgba(255,255,255,0.15)" />
                  )
                )}
              </View>
            )}

            {/* Streak lost note */}
            {result.result === "failure" && (
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Streak lost.
              </Text>
            )}

            {/* Recovery note */}
            {!isSuccess && !isRunOver && (
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                Node is recovering from slash. Check back in 1 hour.
              </Text>
            )}

            {/* Action button */}
            {isSuccess ? (
              <Pressable onPress={onClose} style={{ borderRadius: 10, overflow: "hidden" }}>
                <LinearGradient
                  colors={["#14F195", "#9945FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 14,
                    alignItems: "center",
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      fontSize: 14,
                      color: "#000",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                    }}
                  >
                    Continue
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Button
                onPress={onClose}
                variant={isRunOver ? "destructive" : "default"}
                size="lg"
                className="w-full"
              >
                <Text
                  className={`text-base font-display ${
                    isRunOver ? "text-neon-red" : "text-white"
                  }`}
                >
                  {isRunOver ? "View Results" : "Understood"}
                </Text>
              </Button>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

function RewardCard({
  icon,
  label,
  value,
  borderColor,
  bgColor,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  borderColor: string;
  bgColor: string;
  valueColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor,
        backgroundColor: bgColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      {icon}
      <View>
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: valueColor,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
