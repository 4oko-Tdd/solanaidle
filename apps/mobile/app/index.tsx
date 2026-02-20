import { Redirect } from "expo-router";
import { useAuth } from "@/providers/auth-context";

export default function Index() {
  const { isAuthenticated } = useAuth();
  // Note: isAuthenticated is derived from a sync SecureStore read at startup.
  // A stale/expired JWT will redirect here → /(tabs)/game and hit a 401 on the
  // first API call, which triggers logout. Acceptable for MVP.

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/game" />;
  }
  return <Redirect href="/connect" />;
}
