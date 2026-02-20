import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { WalletProvider } from "@/providers/wallet-provider";
import { ToastProvider } from "@/components/toast-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WalletProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
