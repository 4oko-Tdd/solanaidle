import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ImageBackground } from "react-native";
import { useFonts, Orbitron_400Regular, Orbitron_700Bold, Orbitron_900Black } from "@expo-google-fonts/orbitron";
import { Rajdhani_400Regular, Rajdhani_600SemiBold, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";
import * as SplashScreen from "expo-splash-screen";
import { WalletProvider } from "@/providers/wallet-provider";
import { ToastProvider } from "@/components/toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_400Regular,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ImageBackground
        source={require("../assets/bgcity.png")}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.25 }}
        resizeMode="cover"
      >
        <WalletProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
          </ToastProvider>
        </WalletProvider>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}
