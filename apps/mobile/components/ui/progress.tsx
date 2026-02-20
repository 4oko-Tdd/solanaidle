import { View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  color?: string;
  className?: string;
}

export function Progress({ value, color = "#00ff87", className }: ProgressProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(100, Math.max(0, value))}%` as any, { duration: 400 }),
  }));

  return (
    <View
      className={cn("h-1.5 bg-white/10 overflow-hidden rounded-sm", className)}
    >
      <Animated.View
        style={[{ height: "100%", backgroundColor: color }, animatedStyle]}
      />
    </View>
  );
}
