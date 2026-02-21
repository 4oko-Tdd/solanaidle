import { useAuth } from "@/providers/auth-context";
import { useDailyLogin } from "@/hooks/use-daily-login";
import { DailyLoginModal } from "@/features/game/daily-login-modal";
import { useRouter } from "expo-router";

export default function DailyLoginRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dailyLogin = useDailyLogin(isAuthenticated);

  return (
    <DailyLoginModal
      {...dailyLogin}
      onClose={() => router.back()}
    />
  );
}
