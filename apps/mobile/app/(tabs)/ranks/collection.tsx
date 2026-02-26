import { ScrollView, View } from "react-native";
import { PermanentCollection } from "@/features/game/permanent-collection";
import { ScreenBg } from "@/components/screen-bg";

export default function CollectionRoute() {
  return (
    <ScreenBg>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="p-4">
          <PermanentCollection />
        </View>
      </ScrollView>
    </ScreenBg>
  );
}
