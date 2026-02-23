import { View } from "react-native";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import type { ViewStyle, StyleProp } from "react-native";

interface Props {
  children: ReactNode;
  borderColor?: string;
  /** Outer wrapper style — use for boxShadow, margin, etc. */
  style?: StyleProp<ViewStyle>;
  /** Inner content area style — use for padding, gap, alignItems, etc. */
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
}

/**
 * Frosted-glass panel: BlurView + semi-transparent dark overlay.
 * Simulates web's `backdrop-blur-lg bg-[#0a1628]/80` effect.
 * Requires a visible background (ScreenBg overlay must be < 0.70).
 */
export function GlassPanel({
  children,
  borderColor = "rgba(26,58,92,0.6)",
  style,
  contentStyle,
  intensity = 25,
}: Props) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor,
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
        <View
          style={[
            { backgroundColor: "rgba(10,22,40,0.65)", flex: 1 },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
