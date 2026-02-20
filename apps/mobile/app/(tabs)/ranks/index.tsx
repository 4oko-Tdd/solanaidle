import { View, Text, ScrollView } from "react-native";
export default function RanksScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">RANKS — coming in Task 15</Text>
      </View>
    </ScrollView>
  );
}
