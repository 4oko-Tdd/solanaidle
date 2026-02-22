import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  color?: string; // if provided, solid color fill; otherwise purple→green gradient
  className?: string;
}

export function Progress({ value, color, className }: ProgressProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const widthValue = useSharedValue(0);

  useEffect(() => {
    const pct = Math.min(100, Math.max(0, value)) / 100;
    widthValue.value = withTiming(pct * containerWidth, { duration: 400 });
  }, [value, containerWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: widthValue.value,
  }));

  return (
    <View
      className={cn("h-2 bg-white/10 overflow-hidden rounded-full", className)}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setContainerWidth(w);
        widthValue.value = (Math.min(100, Math.max(0, value)) / 100) * w;
      }}
    >
      <Animated.View style={[{ height: "100%", overflow: "hidden" }, animatedStyle]}>
        {color ? (
          <View style={{ width: containerWidth, height: "100%", backgroundColor: color }} />
        ) : (
          <LinearGradient
            colors={["#9945FF", "#14F195"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: containerWidth, height: "100%" }}
          />
        )}
      </Animated.View>
    </View>
  );
}
