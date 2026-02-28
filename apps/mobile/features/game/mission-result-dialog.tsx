import { useEffect, useState } from "react";
import { Modal, View, Text, Image, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation,
} from "react-native-reanimated";
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!result) { setRevealed(false); return; }
    const timer = setTimeout(() => setRevealed(true), 1200);
    return () => clearTimeout(timer);
  }, [result]);

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
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(5,10,18,0.96)", paddingHorizontal: 16 }}>
        <Animated.View
          style={[
            {
              width: "100%",
              maxWidth: 360,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isSuccess
                ? "rgba(20,241,149,0.2)"
                : "rgba(255,51,102,0.2)",
            },
            glowStyle,
          ]}
        >
          <LinearGradient
            colors={
              isSuccess
                ? ["#0c1f19", "#0a1628", "#091120"]
                : ["#241018", "#0a1628", "#091120"]
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ padding: 16, gap: 12 }}
          >
            {!revealed ? <RevealingScreen /> : <>
            {/* Gradient accent line at top */}
            {isSuccess && (
              <LinearGradient
                colors={["transparent", "#14F195", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 1,
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
                <Trophy size={46} color="#ffb800" />
              ) : (
                <Skull size={46} color="#FF3366" />
              )}
            </View>

            {/* Title + description */}
            <View style={{ alignItems: "center", gap: 6 }}>
              {isSuccess ? (
                <GradientText
                  colors={["#14F195", "#9945FF", "#14F195"]}
                  className="text-lg font-display text-center"
                >
                  Transaction Confirmed!
                </GradientText>
              ) : (
                <Text
                  className={`text-lg font-display text-center ${
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
                  <Sparkles size={10} color="rgba(20,241,149,0.5)" />
                  <Text
                    style={{
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: "rgba(20,241,149,0.5)",
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    Rewards Collected
                  </Text>
                  <Sparkles size={10} color="rgba(20,241,149,0.5)" />
                </View>

                {/* Reward grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {[
                    {
                      key: "xp",
                      icon: (
                        <Image
                          source={require("@/assets/icons/exp.png")}
                          style={{ width: 20, height: 20 }}
                        />
                      ),
                      label: "XP",
                      value: `+${result.rewards.xp}`,
                      borderColor: "rgba(20,241,149,0.12)",
                      bgColor: "rgba(20,241,149,0.04)",
                      valueColor: "#14F195",
                    },
                    {
                      key: "scrap",
                      icon: (
                        <Image
                          source={require("@/assets/icons/scrap.png")}
                          style={{ width: 24, height: 24 }}
                        />
                      ),
                      label: "Scrap",
                      value: `+${result.rewards.scrap}`,
                      borderColor: "rgba(20,241,149,0.12)",
                      bgColor: "rgba(20,241,149,0.04)",
                      valueColor: "#14F195",
                    },
                    ...(result.rewards.crystal
                      ? [{
                          key: "crystal",
                          icon: (
                            <Image
                              source={require("@/assets/icons/tokens.png")}
                              style={{ width: 18, height: 18 }}
                            />
                          ),
                          label: "Tokens",
                          value: `+${result.rewards.crystal}`,
                          borderColor: "rgba(0,212,255,0.12)",
                          bgColor: "rgba(0,212,255,0.04)",
                          valueColor: "#00D4FF",
                        }]
                      : []),
                    ...(result.rewards.artifact
                      ? [{
                          key: "artifact",
                          icon: (
                            <Image
                              source={require("@/assets/icons/key.png")}
                              style={{ width: 18, height: 18 }}
                            />
                          ),
                          label: "Keys",
                          value: `+${result.rewards.artifact}`,
                          borderColor: "rgba(255,184,0,0.12)",
                          bgColor: "rgba(255,184,0,0.04)",
                          valueColor: "#FFB800",
                        }]
                      : []),
                  ].map((item, idx, arr) => {
                    const isOddLast = arr.length % 2 === 1 && idx === arr.length - 1;
                    return (
                      <Animated.View
                        key={item.key}
                        style={[
                          { width: isOddLast ? "62%" : "48%" },
                          isOddLast ? { alignSelf: "center" } : null,
                          fadeInDelays[Math.min(idx, fadeInDelays.length - 1)],
                        ]}
                      >
                        <RewardCard
                          icon={item.icon}
                          label={item.label}
                          value={item.value}
                          borderColor={item.borderColor}
                          bgColor={item.bgColor}
                          valueColor={item.valueColor}
                        />
                      </Animated.View>
                    );
                  })}
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
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        boxShadow: "0 0 20px rgba(255,184,0,0.1), 0 0 40px rgba(255,184,0,0.04)",
                      }}
                    >
                      <Sparkles size={14} color="#FFB800" />
                      <Text
                        style={{
                          fontWeight: "800",
                          fontSize: 13,
                          color: "#FFB800",
                          letterSpacing: 0.5,
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
                    <Heart key={i} size={16} color="#FF3366" fill="#FF3366" />
                  ) : (
                    <HeartCrack key={i} size={16} color="rgba(255,255,255,0.15)" />
                  )
                )}
              </View>
            )}

            {result.result === "failure" && (
              <View
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  Streak lost.
                </Text>
                {!isRunOver ? (
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                    Node is recovering from slash. Check back in 1 hour.
                  </Text>
                ) : null}
              </View>
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
                      fontSize: 13,
                      color: "#000",
                      letterSpacing: 1.2,
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
            </>}
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
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor,
        backgroundColor: bgColor,
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: 56,
      }}
    >
      <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ justifyContent: "center", alignItems: "center", marginLeft: 2 }}>
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "800",
            color: valueColor,
            textAlign: "center",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function RevealingScreen() {
  return (
    <View style={{ alignItems: "center", gap: 20, paddingVertical: 28 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderColor: "rgba(20,241,149,0.3)",
        alignItems: "center", justifyContent: "center",
      }}>
        <ActivityIndicator size="large" color="#14F195" />
      </View>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={{ color: "#14F195", fontWeight: "800", fontSize: 15,
          letterSpacing: 1.2, textTransform: "uppercase" }}>
          Processing Transaction
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
          Verifying on-chain...
        </Text>
      </View>
      <ScanBar />
    </View>
  );
}

function ScanBar() {
  const tx = useSharedValue(-100);
  useEffect(() => {
    tx.value = withRepeat(
      withTiming(100, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
    return () => cancelAnimation(tx);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <View style={{ width: 200, height: 2,
      backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
      <Animated.View style={[
        { position: "absolute", width: 80, height: 2, borderRadius: 1, backgroundColor: "#14F195" },
        style,
      ]} />
    </View>
  );
}
