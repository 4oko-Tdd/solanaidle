import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar, Image } from "react-native";
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_900Black } from "@expo-google-fonts/orbitron";
import { Rajdhani_400Regular, Rajdhani_600SemiBold, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";
import * as SplashScreen from "expo-splash-screen";
import { WalletProvider } from "@/providers/wallet-provider";
import { ToastProvider } from "@/components/toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  console.log("[RootLayout] render");
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_400Regular,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  console.log("[RootLayout] fontsLoaded =", fontsLoaded, "error =", fontsError);

  useEffect(() => {
    let cancelled = false;
    const preloadAssets = async () => {
      try {
        const assets = [
          require("../assets/bgcity.png"),
          require("../assets/icons/scrap.png"),
          require("../assets/icons/tokens.png"),
          require("../assets/icons/key.png"),
          require("../assets/icons/exp.png"),
          require("../assets/icons/characters/guardian.png"),
          require("../assets/icons/characters/mystic.png"),
          require("../assets/icons/characters/lisiy.png"),
        ];
        await Promise.all([
          ...assets.map((moduleId) => {
            const src = Image.resolveAssetSource(moduleId);
            return src?.uri ? Image.prefetch(src.uri) : Promise.resolve(true);
          }),
        ]);
      } catch (e) {
        console.warn("[RootLayout] asset preload failed", e);
      } finally {
        if (!cancelled) setAssetsLoaded(true);
      }
    };
    preloadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && assetsLoaded) {
      console.log("[RootLayout] fonts loaded, hiding splash");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsLoaded]);

  if (!fontsLoaded || !assetsLoaded) {
    console.log("[RootLayout] waiting for startup assets...");
    return null;
  }

  console.log("[RootLayout] rendering tree");

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#0a1628" />
      <WalletProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
        </ToastProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
