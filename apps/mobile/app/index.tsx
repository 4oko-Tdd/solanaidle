import { Redirect } from "expo-router";
import { useAuth } from "@/providers/auth-context";

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/game" />;
  }
  return <Redirect href="/connect" />;
}
