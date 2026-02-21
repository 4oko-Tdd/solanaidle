import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { Shadows } from "@/theme";

interface CardProps extends ViewProps {
  highlight?: boolean;
}

export function Card({ highlight, children, style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: highlight
            ? "rgba(20,241,149,0.4)"
            : "rgba(255,255,255,0.06)",
          boxShadow: highlight ? Shadows.glowGreen : Shadows.md,
        },
        style,
      ]}
    >
      <BlurView intensity={28} tint="dark">
        <View
          style={{ backgroundColor: "rgba(10,22,40,0.82)", padding: 20, gap: 12 }}
          {...props}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
