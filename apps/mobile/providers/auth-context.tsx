import React, { createContext, useContext, useState, useCallback } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
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
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [walletAddress, setWalletAddress] = useState<string | null>(
    SecureStore.getItem("wallet_address")
  );
  const [authLoading, setAuthLoading] = useState(false);

  // signMessage wraps transact() — caller gets a consistent interface
  const signMessage = useCallback(
    async (msg: Uint8Array): Promise<Uint8Array> => {
      return transact(async (wallet) => {
        const auth = await wallet.authorize({
          chain: "solana:mainnet",
          identity: {
            name: "Seeker Node",
            uri: "https://seekernode.app",
            icon: "favicon.ico",
          },
        });

        const result = await wallet.signMessages({
          addresses: [auth.accounts[0].address],
          payloads: [msg],
        });
        return new Uint8Array(result.signedPayloads[0]);
      });
    },
    []
  );

  const authenticate = useCallback(async () => {
    if (isAuthenticated || authLoading) return;
    setAuthLoading(true);
    try {
      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      const { token, address } = await transact(async (wallet) => {
        const auth = await wallet.authorize({
          chain: "solana:mainnet",
          identity: {
            name: "Seeker Node",
            uri: "https://seekernode.app",
            icon: "favicon.ico",
          },
        });

        const walletAddr = auth.accounts[0].address;
        const signed = await wallet.signMessages({
          addresses: [walletAddr],
          payloads: [new TextEncoder().encode(nonce)],
        });

        const res = await api<AuthVerifyResponse>("/auth/verify", {
          method: "POST",
          body: JSON.stringify({
            publicKey: walletAddr,
            signature: Buffer.from(signed.signedPayloads[0]).toString("base64"),
            nonce,
          }),
        });

        return { token: res.token, address: walletAddr };
      });

      setAuthToken(token);
      await SecureStore.setItemAsync("wallet_address", address);
      setWalletAddress(address);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[useAuth] authenticate failed:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const logout = useCallback(async () => {
    clearAuthToken();
    await SecureStore.deleteItemAsync("wallet_address");
    await SecureStore.deleteItemAsync("mwa_auth");
    setWalletAddress(null);
    setIsAuthenticated(false);
  }, []);

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
