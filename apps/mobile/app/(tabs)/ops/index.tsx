import { View, Text, ScrollView } from "react-native";
export default function OpsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">OPS — coming in Task 12</Text>
      </View>
    </ScrollView>
  );
}
