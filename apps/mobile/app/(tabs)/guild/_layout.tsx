import { Stack } from "expo-router";
export default function GuildStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="raid" />
    </Stack>
  );
}
