import type { ClassId } from "@solanaidle/shared";
import lisiyIcon from "../../../../personaji/lisiy.png";
import guardianIcon from "../../../../personaji/guardian.png";
import mysticIcon from "../../../../personaji/mystic.png";

const CLASS_ICONS: Record<ClassId, string> = {
  scout: lisiyIcon,
  guardian: guardianIcon,
  mystic: mysticIcon,
};

interface Props {
  classId: ClassId;
  className?: string;
}

export function ClassIcon({ classId, className = "h-6 w-6" }: Props) {
  return (
    <img
      src={CLASS_ICONS[classId]}
      alt={classId}
      className={className}
    />
  );
}
