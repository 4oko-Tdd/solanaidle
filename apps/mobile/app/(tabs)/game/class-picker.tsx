import { useAuth } from "@/providers/auth-context";
import { useGameState } from "@/hooks/use-game-state";
import { ClassPicker } from "@/features/game/class-picker";
import { Tabs, useRouter } from "expo-router";

export default function ClassPickerRoute() {
  const router = useRouter();
  const { isAuthenticated, signMessage } = useAuth();
  const { classes, startRun, activeRun } = useGameState(isAuthenticated);

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
      <ClassPicker
        classes={classes}
        currentClassId={activeRun?.classId ?? null}
        signMessage={signMessage}
        onSelect={async (classId: string, sig?: string) => {
          await startRun(classId as any, sig);
          router.back();
        }}
      />
    </>
  );
}
