import React, { createContext, useContext, useState, useCallback } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

interface AuthContextValue {
  isAuthenticated: boolean;
  walletAddress: string | null;
  authLoading: boolean;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  signMessage: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { connect, disconnect, signMessage: walletSignMessage, account } = useMobileWallet();

  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [walletAddress, setWalletAddress] = useState<string | null>(
    SecureStore.getItem("wallet_address")
  );
  const [authLoading, setAuthLoading] = useState(false);

  const authenticate = useCallback(async () => {
    if (isAuthenticated || authLoading) return;
    setAuthLoading(true);
    try {
      // Step 1: Connect wallet (opens MWA), get nonce
      await connect();
      const walletAddr = account?.address.toString() ?? "";

      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      // Step 2: Sign nonce (opens MWA again if session closed)
      const signed = await walletSignMessage(new TextEncoder().encode(nonce));
      const signatureBase64 = Buffer.from(signed).toString("base64");

      // Step 3: Verify with backend
      const res = await api<AuthVerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          publicKey: walletAddr,
          signature: signatureBase64,
          nonce,
        }),
      });

      setAuthToken(res.token);
      await SecureStore.setItemAsync("wallet_address", walletAddr);
      setWalletAddress(walletAddr);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[useAuth] authenticate failed:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [isAuthenticated, authLoading, connect, account, walletSignMessage]);

  const logout = useCallback(async () => {
    clearAuthToken();
    await disconnect();
    await SecureStore.deleteItemAsync("wallet_address");
    setWalletAddress(null);
    setIsAuthenticated(false);
  }, [disconnect]);

  // Expose wallet's signMessage for ER authorization (mission claim, boss overload)
  const signMessage = useCallback(
    async (msg: Uint8Array): Promise<Uint8Array> => walletSignMessage(msg),
    [walletSignMessage]
  );

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, walletAddress, authLoading, authenticate, logout, signMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
