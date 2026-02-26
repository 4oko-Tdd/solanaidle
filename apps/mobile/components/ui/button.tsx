import { Pressable, Text, View, type PressableProps, type GestureResponderEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { Shadows } from "@/theme";
import { useShimmer } from "@/lib/animations";
import type { ReactNode } from "react";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost" | "destructive" | "gradient";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  /** Animated shimmer sweep on gradient variant (matches web btn-shimmer) */
  shimmer?: boolean;
}

const variantClasses = {
  default: "bg-neon-green/20 border border-neon-green/60",
  outline: "border border-white/20 bg-white/[0.03]",
  ghost: "bg-transparent",
  destructive: "bg-neon-red/20 border border-neon-red/60",
  gradient: "overflow-hidden",
};

const variantShadow: Record<string, string | undefined> = {
  default: Shadows.glowGreen,
  outline: undefined,
  ghost: undefined,
  destructive: Shadows.glowRed,
  gradient: Shadows.glowPurple,
};

const textClasses = {
  default: "text-neon-green",
  outline: "text-white/70",
  ghost: "text-white/50",
  destructive: "text-neon-red",
  gradient: "text-white",
};

const sizeClasses = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2.5",
  lg: "px-6 py-4",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function Button({
  variant = "default",
  size = "md",
  children,
  className,
  onPress,
  disabled,
  shimmer: shimmerProp,
  ...props
}: ButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const isGradient = variant === "gradient";
  const shimmerActive = !!shimmerProp && isGradient && !disabled;
  const shimmerStyle = useShimmer(shimmerActive);

  const content =
    typeof children === "string" ? (
      <Text
        className={cn(
          "font-mono-bold tracking-widest",
          textClasses[variant],
          textSizeClasses[size]
        )}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        boxShadow: !disabled ? variantShadow[variant] : undefined,
        borderRadius: 8,
        overflow: "hidden" as const,
      })}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        "items-center justify-center rounded-lg",
        className
      )}
      {...props}
    >
      {isGradient && (
        <LinearGradient
          colors={["#9945FF", "#14F195"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 }}
        />
      )}
      {content}
      {/* Shimmer overlay */}
      {shimmerActive && (
        <Animated.View
          style={[
            shimmerStyle,
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 60,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.2)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </Pressable>
  );
}
