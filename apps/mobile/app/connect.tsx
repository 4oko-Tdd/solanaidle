import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-context";
import { useRouter } from "expo-router";
import { ScreenBg } from "@/components/screen-bg";
import { useEffect } from "react";

export default function ConnectScreen() {
  const { authenticate, isAuthenticated, authLoading, authError } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)/game");
  }, [isAuthenticated, router]);

  return (
    <ScreenBg>
    <View className="flex-1 items-center justify-center px-8 gap-8" style={{ paddingTop: insets.top }}>
      <View className="items-center gap-4">
        <Text className="text-neon-green font-mono-bold text-4xl tracking-widest">
          SEEKER
        </Text>
        <Text className="text-neon-green font-mono-bold text-4xl tracking-widest">
          NODE
        </Text>
        <Text className="text-white/40 font-mono text-sm text-center mt-2">
          Deploy your node. Run missions.{"\n"}Survive the epoch.
        </Text>
      </View>

      <Pressable
        onPress={authenticate}
        disabled={authLoading}
        className="w-full rounded border border-neon-green/60 bg-neon-green/10 py-4 items-center"
      >
        <Text className="text-neon-green font-mono text-base tracking-widest">
          {authLoading ? "CONNECTING..." : "CONNECT WALLET"}
        </Text>
      </Pressable>

      <Text className="text-white/20 font-mono text-xs text-center">
        Requires a Solana wallet app installed on this device
      </Text>
      {authError ? (
        <Text className="text-red-400/90 font-mono text-xs text-center">
          {authError}
        </Text>
      ) : null}
    </View>
    </ScreenBg>
  );
}
