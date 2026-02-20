import { Stack } from "expo-router";
export default function BaseStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="inventory" />
    </Stack>
  );
}
