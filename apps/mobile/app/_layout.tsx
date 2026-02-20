import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { WalletProvider } from "@/providers/wallet-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Temporary until Task 8 creates the real ToastProvider
function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WalletProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="connect" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ToastProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
