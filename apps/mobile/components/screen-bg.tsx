import { ImageBackground, View } from "react-native";
import type { ReactNode } from "react";

/**
 * Wraps a screen in the bgcity.png background image with a dark overlay.
 * Use this as the root wrapper in every screen to guarantee the background
 * shows regardless of React Navigation's scene container behavior.
 */
export function ScreenBg({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require("@/assets/bgcity.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: "rgba(10,22,40,0.45)" }}>
        {children}
      </View>
    </ImageBackground>
  );
}
