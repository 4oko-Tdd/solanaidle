import { View, Text, ScrollView } from "react-native";
export default function GameScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">NODE — coming in Task 10</Text>
      </View>
    </ScrollView>
  );
}
