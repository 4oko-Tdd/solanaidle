import { useState } from "react";
import { View, Text, Image, ActivityIndicator, Pressable, ScrollView, TouchableWithoutFeedback } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gift, Check } from "lucide-react-native";
import { Button } from "@/components/ui";
import { GradientText } from "@/components/gradient-text";
import type { DailyLoginStatus } from "@solanaidle/shared";

interface Props {
  status: DailyLoginStatus | null;
  loading?: boolean;
  onClaim: () => Promise<void>;
  onClose: () => void;
}

export function DailyLoginModal({ status, loading, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Still loading or no data yet — show spinner with skip option
  if (!status) {
    return (
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", gap: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#ffb800" />
        ) : (
          <>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Could not load daily bonus</Text>
            <Button variant="outline" size="md" onPress={onClose}>
              Skip
            </Button>
          </>
        )}
      </View>
    );
  }

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  };

  const reward = status.todayReward;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 32, flexGrow: 1, justifyContent: "center" }}
        >
          <TouchableWithoutFeedback>
            <View>
              {/* Main card */}
              <View
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "rgba(255,184,0,0.25)",
                  boxShadow: "0 0 30px rgba(255,184,0,0.12), 0 0 60px rgba(255,184,0,0.04)",
                }}
              >
                <LinearGradient
                  colors={["#1a1400", "#0d0f18", "#0a0c14"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ padding: 24, gap: 20 }}
                >
                  {/* Header */}
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        backgroundColor: "rgba(255,184,0,0.1)",
                        borderWidth: 1.5,
                        borderColor: "rgba(255,184,0,0.35)",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 20px rgba(255,184,0,0.15)",
                      }}
                    >
                      <Gift size={28} color="#ffb800" />
                    </View>
                    <GradientText
                      colors={["#ffb800", "#fbbf24"]}
                      className="text-2xl font-display"
                    >
                      {claimed ? "Claimed!" : "Daily Bonus"}
                    </GradientText>
                    <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
                      {claimed
                        ? `Day ${status.streakDay} reward collected!`
                        : `Day ${status.streakDay} of 7 — claim your daily reward!`}
                    </Text>
                  </View>

                  {/* 7-day calendar strip */}
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {status.rewards.map((r) => {
                      const isPast = r.day < status.streakDay;
                      const isCurrent = r.day === status.streakDay;
                      return (
                        <View
                          key={r.day}
                          style={[
                            {
                              flex: 1,
                              alignItems: "center",
                              borderRadius: 10,
                              paddingVertical: 8,
                              gap: 4,
                            },
                            isCurrent
                              ? {
                                  backgroundColor: "rgba(255,184,0,0.12)",
                                  borderWidth: 1,
                                  borderColor: "rgba(255,184,0,0.4)",
                                  boxShadow: "0 0 12px rgba(255,184,0,0.15)",
                                }
                              : isPast
                              ? { backgroundColor: "rgba(20,241,149,0.05)", borderWidth: 1, borderColor: "rgba(20,241,149,0.15)" }
                              : { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: "RobotoMono_400Regular",
                              fontSize: 10,
                              color: isCurrent ? "#ffb800" : isPast ? "#14F195" : "rgba(255,255,255,0.3)",
                              letterSpacing: 0.5,
                            }}
                          >
                            D{r.day}
                          </Text>
                          {isPast ? (
                            <Check size={14} color="#14F195" />
                          ) : (
                            <Gift
                              size={14}
                              color={isCurrent ? "#ffb800" : "rgba(255,255,255,0.15)"}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Today's reward */}
                  <View style={{ alignItems: "center", gap: 6, paddingVertical: 4 }}>
                    <Text
                      style={{
                        fontFamily: "RobotoMono_400Regular",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                      }}
                    >
                      Today's Reward
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
                      {reward.scrap > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Image
                            source={require("@/assets/icons/scrap.png")}
                            style={{ width: 40, height: 40 }}
                          />
                          <Text style={{ fontSize: 18, fontFamily: "Rajdhani_700Bold", color: "#14F195" }}>+{reward.scrap}</Text>
                        </View>
                      )}
                      {reward.crystal > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Image
                            source={require("@/assets/icons/tokens.png")}
                            style={{ width: 40, height: 40 }}
                          />
                          <Text style={{ fontSize: 18, fontFamily: "Rajdhani_700Bold", color: "#14F195" }}>+{reward.crystal}</Text>
                        </View>
                      )}
                      {reward.artifact > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Image
                            source={require("@/assets/icons/key.png")}
                            style={{ width: 40, height: 40 }}
                          />
                          <Text style={{ fontSize: 18, fontFamily: "Rajdhani_700Bold", color: "#14F195" }}>+{reward.artifact}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Action button */}
                  {claimed ? (
                    <Button onPress={onClose} variant="gradient" size="lg" className="w-full">
                      Continue
                    </Button>
                  ) : (
                    <Button onPress={handleClaim} disabled={claiming} variant="gradient" size="lg" className="w-full">
                      {claiming ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text style={{ fontSize: 16, fontFamily: "RobotoMono_700Bold", color: "#ffffff" }}>Claiming...</Text>
                        </View>
                      ) : (
                        "Claim Reward"
                      )}
                    </Button>
                  )}
                </LinearGradient>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}
