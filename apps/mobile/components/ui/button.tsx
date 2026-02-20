import { Pressable, Text, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
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
  const handlePress = async (e: any) => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        "items-center justify-center rounded",
        disabled && "opacity-40",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-mono tracking-widest",
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
