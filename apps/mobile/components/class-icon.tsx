import { Image } from "react-native";
import type { ClassId } from "@solanaidle/shared";

const CLASS_ICONS: Record<ClassId, ReturnType<typeof require>> = {
  scout: require("@/assets/icons/characters/lisiy.png"),
  guardian: require("@/assets/icons/characters/guardian.png"),
  mystic: require("@/assets/icons/characters/mystic.png"),
};

export function ClassIcon({ classId, size = 32 }: { classId: ClassId; size?: number }) {
  return (
    <Image
      source={CLASS_ICONS[classId]}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
