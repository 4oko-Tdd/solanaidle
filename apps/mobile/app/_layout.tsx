import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_900Black } from "@expo-google-fonts/orbitron";
import { Rajdhani_400Regular, Rajdhani_600SemiBold, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";
import * as SplashScreen from "expo-splash-screen";
import { WalletProvider } from "@/providers/wallet-provider";
import { ToastProvider } from "@/components/toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  console.log("[RootLayout] render");
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
    if (fontsLoaded) {
      console.log("[RootLayout] fonts loaded, hiding splash");
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log("[RootLayout] waiting for fonts...");
    return null;
  }

  console.log("[RootLayout] rendering tree");

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <WalletProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
        </ToastProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
