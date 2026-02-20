import { Stack } from "expo-router";
export default function RanksStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="collection" />
    </Stack>
  );
}
