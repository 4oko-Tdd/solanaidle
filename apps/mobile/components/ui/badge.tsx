import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: string | number;
  variant?: "default" | "green" | "amber" | "cyan" | "purple" | "red";
  className?: string;
}

const variantClasses = {
  default: "bg-white/10 border-white/20",
  green: "bg-neon-green/10 border-neon-green/30",
  amber: "bg-neon-amber/10 border-neon-amber/30",
  cyan: "bg-neon-cyan/10 border-neon-cyan/30",
  purple: "bg-neon-purple/10 border-neon-purple/30",
  red: "bg-neon-red/10 border-neon-red/30",
};

const textVariantClasses = {
  default: "text-white/60",
  green: "text-neon-green",
  amber: "text-neon-amber",
  cyan: "text-neon-cyan",
  purple: "text-neon-purple",
  red: "text-neon-red",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <View
      className={cn(
        "border px-2 py-0.5 flex-row items-center rounded-sm",
        variantClasses[variant],
        className
      )}
    >
      <Text className={cn("font-mono text-xs", textVariantClasses[variant])}>
        {children}
      </Text>
    </View>
  );
}
