import { Pressable, Text, type PressableProps, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { Shadows } from "@/theme";
import type { ReactNode } from "react";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

const variantClasses = {
  default: "bg-neon-green/20 border border-neon-green/60",
  outline: "border border-white/20 bg-transparent",
  ghost: "bg-transparent",
  destructive: "bg-neon-red/20 border border-neon-red/60",
};

const variantShadow: Record<string, string | undefined> = {
  default: Shadows.glowGreen,
  outline: undefined,
  ghost: undefined,
  destructive: Shadows.glowRed,
};

const textClasses = {
  default: "text-neon-green",
  outline: "text-white/70",
  ghost: "text-white/50",
  destructive: "text-neon-red",
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
  ...props
}: ButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        boxShadow: !disabled ? variantShadow[variant] : undefined,
      })}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        "items-center justify-center rounded-lg",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
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
      )}
    </Pressable>
  );
}
