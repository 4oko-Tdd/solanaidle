import { View, Text, ScrollView } from "react-native";
export default function BaseScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">BASE — coming in Task 13</Text>
      </View>
    </ScrollView>
  );
}
