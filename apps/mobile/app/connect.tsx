import { View, Text, Pressable } from "react-native";
import { useAuth } from "@/providers/auth-context";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function ConnectScreen() {
  const { authenticate, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)/game");
  }, [isAuthenticated, router]);

  return (
    <View className="flex-1 bg-terminal items-center justify-center px-8 gap-8">
      <View className="items-center gap-4">
        <Text className="text-neon-green font-mono text-4xl font-bold tracking-widest">
          SEEKER
        </Text>
        <Text className="text-neon-green font-mono text-4xl font-bold tracking-widest">
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
    </View>
  );
}
