import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { ClassPicker } from "@/features/game/class-picker";
import { useRouter } from "expo-router";

export default function ClassPickerRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { classes, startRun, activeRun } = useGameState(isAuthenticated);

  return (
    <ClassPicker
      classes={classes}
      currentClassId={activeRun?.classId ?? null}
      onSelect={async (classId: string, sig?: string) => {
        await startRun(classId as any, sig);
        router.back();
      }}
    />
  );
}
