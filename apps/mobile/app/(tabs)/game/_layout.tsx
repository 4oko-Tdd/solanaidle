import { Stack } from "expo-router";
export default function GameStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="run-end" />
      <Stack.Screen name="class-picker" options={{ presentation: "formSheet" }} />
      <Stack.Screen name="daily-login" options={{ presentation: "modal" }} />
    </Stack>
  );
}
