import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const containerWidth = useRef(0);
  const widthValue = useSharedValue(0);

  useEffect(() => {
    const pct = Math.min(100, Math.max(0, value)) / 100;
    widthValue.value = withTiming(pct * containerWidth.current, { duration: 400 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: widthValue.value,
  }));

  return (
    <View
      className={cn("h-2 bg-white/10 overflow-hidden rounded-full", className)}
      onLayout={(e) => {
        containerWidth.current = e.nativeEvent.layout.width;
        // Set initial width immediately without animation
        widthValue.value = (Math.min(100, Math.max(0, value)) / 100) * containerWidth.current;
      }}
    >
      <Animated.View style={[{ height: "100%", overflow: "hidden" }, animatedStyle]}>
        <LinearGradient
          colors={["#9945FF", "#14F195"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
