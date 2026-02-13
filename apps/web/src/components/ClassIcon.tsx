import type { ClassId } from "@solanaidle/shared";
import lisiyIcon from "art/lisiy.png";
import guardianIcon from "art/guardian.png";
import mysticIcon from "art/mystic.png";

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
