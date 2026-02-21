import { ScrollView, View } from "react-native";
import { PermanentCollection } from "@/features/game/permanent-collection";

export default function CollectionRoute() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-terminal"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-4">
        <PermanentCollection />
      </View>
    </ScrollView>
  );
}
