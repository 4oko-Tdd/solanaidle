import { useAuth } from "@/providers/auth-context";

// Provides signMessage and walletAddress in a shape compatible with lib/er.ts
export function useWalletSign() {
  const { signMessage, walletAddress } = useAuth();
  return { signMessage, walletAddress };
}
