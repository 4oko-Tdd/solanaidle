import { View } from "react-native";
import { BlurView } from "expo-blur";
import Animated from "react-native-reanimated";
import type { ReactNode } from "react";
import type { ViewStyle, StyleProp } from "react-native";
import { Shadows } from "@/theme";
import { useGlowPulse } from "@/lib/animations";

type GlowColor = "green" | "purple" | "red" | "cyan" | "amber";

const GLOW_MAP: Record<GlowColor, string> = {
  green: Shadows.glowGreen,
  purple: Shadows.glowPurple,
  red: Shadows.glowRed,
  cyan: Shadows.glowCyan,
  amber: Shadows.glowAmber,
};

const GLOW_RGB: Record<GlowColor, string> = {
  green: "20, 241, 149",
  purple: "153, 69, 255",
  red: "255, 51, 102",
  cyan: "0, 212, 255",
  amber: "255, 184, 0",
};

interface Props {
  children: ReactNode;
  borderColor?: string;
  /** Outer wrapper style — use for boxShadow, margin, etc. */
  style?: StyleProp<ViewStyle>;
  /** Inner content area style — use for padding, gap, alignItems, etc. */
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Colored neon glow around the panel */
  glow?: GlowColor;
  /** Animate the glow with a pulsing effect (matches web animate-glow-pulse) */
  animateGlow?: boolean;
}

/**
 * Frosted-glass panel: BlurView + semi-transparent dark overlay.
 * Simulates web's `backdrop-blur-lg bg-[#0a1628]/80` effect.
 */
export function GlassPanel({
  children,
  borderColor = "rgba(26,58,92,0.6)",
  style,
  contentStyle,
  intensity = 60,
  glow,
  animateGlow,
}: Props) {
  const animated = !!glow && !!animateGlow;
  const glowAnimStyle = useGlowPulse(
    glow ? GLOW_RGB[glow] : "0,0,0",
    animated,
  );

  return (
    <Animated.View
      style={[
        {
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor,
          boxShadow: (!animated && glow) ? GLOW_MAP[glow] : undefined,
        },
        animated ? glowAnimStyle : undefined,
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
        <View
          style={[
            { backgroundColor: "rgba(10,22,40,0.95)", flex: 1 },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </BlurView>
    </Animated.View>
  );
}
