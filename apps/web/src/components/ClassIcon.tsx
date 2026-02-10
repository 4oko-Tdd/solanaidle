import type { ClassId } from "@solanaidle/shared";
import scoutIcon from "@/assets/icons/scout.png";
import guardianIcon from "@/assets/icons/guardian.png";
import mysticIcon from "@/assets/icons/mystic.png";

const CLASS_ICONS: Record<ClassId, string> = {
  scout: scoutIcon,
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
