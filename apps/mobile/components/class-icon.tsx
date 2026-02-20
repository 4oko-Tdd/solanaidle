import { Text } from "react-native";
import type { ClassId } from "@solanaidle/shared";

const CLASS_ICONS: Record<ClassId, string> = {
  scout: "◈",
  guardian: "⬡",
  mystic: "◆",
};

const CLASS_COLORS: Record<ClassId, string> = {
  scout: "#ffb800",
  guardian: "#00d4ff",
  mystic: "#9945ff",
};

export function ClassIcon({ classId, size = 20 }: { classId: ClassId; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: CLASS_COLORS[classId] }}>
      {CLASS_ICONS[classId]}
    </Text>
  );
}
