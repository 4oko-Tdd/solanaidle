import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Text, type TextProps } from "react-native";

interface Props extends TextProps {
  colors?: [string, string, ...string[]];
}

/**
 * Gradient text — matches web's `.text-gradient` (Solana purple → green).
 * Renders text with a linear-gradient fill via MaskedView.
 */
export function GradientText({
  colors = ["#9945FF", "#14F195"],
  style,
  children,
  ...rest
}: Props) {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: "transparent" }]} {...rest}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]} {...rest}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
