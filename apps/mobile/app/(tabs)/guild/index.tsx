import { View, Text, ScrollView } from "react-native";
export default function GuildScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-terminal">
      <View className="p-4">
        <Text className="text-neon-green font-mono">GUILD — coming in Task 14</Text>
      </View>
    </ScrollView>
  );
}
