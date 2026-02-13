import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

export function useAuth() {
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const address = publicKey?.toBase58();
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

      if (signMessage) {
        // Real wallet signing flow
        const messageBytes = new TextEncoder().encode(nonce);
        const signature = await signMessage(messageBytes);

        const bs58Module = await import("bs58");
        const signatureB58 = bs58Module.default.encode(
          new Uint8Array(signature),
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
        // Dev fallback: wallet doesn't expose signMessage
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
  }, [address, isAuthenticated, signMessage]);

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
