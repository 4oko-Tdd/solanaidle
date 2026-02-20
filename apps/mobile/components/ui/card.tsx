import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, style, ...props }: CardProps) {
  return (
    <View
      className={cn("bg-surface border border-white/[0.06] p-4 rounded", className)}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
