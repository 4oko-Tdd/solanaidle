import { useState, useEffect, useCallback, useRef } from "react";
import { useConnector, useAccount } from "@solana/connector";
import { api, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

export function useAuth() {
  const { connected, disconnect, selectedWallet } = useConnector();
  const { address } = useAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [authLoading, setAuthLoading] = useState(false);
  const authInFlight = useRef(false);

  const authenticate = useCallback(async () => {
    if (!address || isAuthenticated || authInFlight.current) return;
    authInFlight.current = true;
    setAuthLoading(true);

    try {
      // Step 1: get nonce from API
      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      let token: string;

      // Step 2: try to sign message with wallet
      const signFeature =
        selectedWallet?.features?.["solana:signMessage"] ??
        selectedWallet?.features?.["standard:signMessage"];

      if (
        signFeature &&
        typeof (signFeature as { signMessage?: unknown }).signMessage ===
          "function"
      ) {
        // Real wallet signing flow
        const messageBytes = new TextEncoder().encode(nonce);
        const result = await (
          signFeature as {
            signMessage: (opts: {
              message: Uint8Array;
              account: unknown;
            }) => Promise<{ signature: Uint8Array }>;
          }
        ).signMessage({
          message: messageBytes,
          account: selectedWallet?.accounts?.[0],
        });

        const bs58Module = await import("bs58");
        const signatureB58 = bs58Module.default.encode(
          new Uint8Array(result.signature),
        );

        const verifyRes = await api<AuthVerifyResponse>("/auth/verify", {
          method: "POST",
          body: JSON.stringify({
            publicKey: address,
            signature: signatureB58,
            nonce,
          }),
        });
        token = verifyRes.token;
      } else {
        // Dev fallback: wallet doesn't expose signMessage (common in dev without browser extension)
        console.warn("[useAuth] signMessage not available, using dev auth");
        const res = await api<{ token: string }>("/auth/dev-login", {
          method: "POST",
          body: JSON.stringify({ publicKey: address }),
        });
        token = res.token;
      }

      setAuthToken(token);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[useAuth] Primary auth failed:", err);
      // Fallback to dev-login if primary flow throws (e.g. user rejects sign)
      try {
        const res = await api<{ token: string }>("/auth/dev-login", {
          method: "POST",
          body: JSON.stringify({ publicKey: address }),
        });
        setAuthToken(res.token);
        setIsAuthenticated(true);
      } catch {
        console.error("[useAuth] Dev auth also failed");
      }
    } finally {
      setAuthLoading(false);
      authInFlight.current = false;
    }
  }, [address, isAuthenticated, selectedWallet]);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (connected && address && !isAuthenticated) {
      authenticate();
    }
  }, [connected, address, isAuthenticated, authenticate]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected && isAuthenticated) {
      clearAuthToken();
      setIsAuthenticated(false);
    }
  }, [connected, isAuthenticated]);

  const logout = useCallback(() => {
    clearAuthToken();
    setIsAuthenticated(false);
    disconnect();
  }, [disconnect]);

  return { isAuthenticated, authLoading, logout };
}
