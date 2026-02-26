import { Stack } from "expo-router";
export default function GameStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="run-end" />
      <Stack.Screen name="class-picker" options={{ presentation: "formSheet" }} />
    </Stack>
  );
}
