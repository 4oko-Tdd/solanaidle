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
            : "rgba(26,58,92,0.6)",
          boxShadow: highlight ? Shadows.glowGreen : Shadows.md,
        },
        style,
      ]}
    >
      <BlurView intensity={50} tint="dark">
        <View
          style={{ backgroundColor: "rgba(10,22,40,0.95)", padding: 20, gap: 12 }}
          {...props}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
}
