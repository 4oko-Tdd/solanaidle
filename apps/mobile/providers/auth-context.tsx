import React, { createContext, useContext, useState, useCallback } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import {
  SolanaMobileWalletAdapterError,
  SolanaMobileWalletAdapterErrorCode,
} from "@solana-mobile/mobile-wallet-adapter-protocol";
import type { Connection, Transaction } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import bs58 from "bs58";
import { API_BASE, api, setAuthToken, clearAuthToken, getAuthToken } from "@/lib/api";
import type { AuthNonceResponse, AuthVerifyResponse } from "@solanaidle/shared";

interface AuthContextValue {
  isAuthenticated: boolean;
  walletAddress: string | null;
  authLoading: boolean;
  authError: string | null;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  signMessage: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
  signAndSendTransaction: ((tx: Transaction) => Promise<string>) | null;
  connection: Connection;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    connect,
    disconnect,
    signMessage: walletSignMessage,
    signAndSendTransaction: walletSignAndSendTransaction,
    connection,
  } = useMobileWallet();

  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [walletAddress, setWalletAddress] = useState<string | null>(
    SecureStore.getItem("wallet_address")
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const connectWithTimeout = useCallback(
    async (ms: number) => {
      return await Promise.race([
        connect(),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            reject(
              new SolanaMobileWalletAdapterError(
                SolanaMobileWalletAdapterErrorCode.ERROR_SESSION_TIMEOUT,
                "Wallet connection timed out"
              )
            );
          }, ms);
        }),
      ]);
    },
    [connect]
  );

  const authenticate = useCallback(async () => {
    if (isAuthenticated || authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      // Step 1: Connect wallet (opens MWA), get nonce
      const connectedAccount = await connectWithTimeout(20000);
      const walletAddr = connectedAccount.address.toString();

      const { nonce } = await api<AuthNonceResponse>("/auth/nonce");

      // Step 2: Sign nonce (opens MWA again if session closed)
      const signed = await walletSignMessage(new TextEncoder().encode(nonce));
      // MWA sign_messages returns message+signature concatenated;
      // extract last 64 bytes (ed25519 detached signature)
      const sigBytes = new Uint8Array(signed);
      const signature64 = sigBytes.length > 64
        ? sigBytes.slice(sigBytes.length - 64)
        : sigBytes;
      const signatureBase58 = bs58.encode(signature64);

      // Step 3: Verify with backend
      const res = await api<AuthVerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          publicKey: walletAddr,
          signature: signatureBase58,
          nonce,
        }),
      });

      setAuthToken(res.token);
      await SecureStore.setItemAsync("wallet_address", walletAddr);
      setWalletAddress(walletAddr);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[useAuth] authenticate failed:", err);
      if (
        err instanceof SolanaMobileWalletAdapterError &&
        err.code === SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND
      ) {
        setAuthError(
          "No Solana wallet found on this device. Install a wallet app and try again."
        );
      } else if (
        err instanceof SolanaMobileWalletAdapterError &&
        err.code === SolanaMobileWalletAdapterErrorCode.ERROR_SESSION_TIMEOUT
      ) {
        setAuthError(
          "Wallet request timed out. Open your wallet app and retry."
        );
      } else if (err instanceof TypeError && /Network request failed/i.test(err.message)) {
        setAuthError(
          `Cannot reach backend at ${API_BASE}. If you're on a phone, use your computer's LAN IP.`
        );
      } else {
        setAuthError("Wallet connection failed. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  }, [isAuthenticated, authLoading, connectWithTimeout, walletSignMessage]);

  const logout = useCallback(async () => {
    clearAuthToken();
    await disconnect();
    await SecureStore.deleteItemAsync("wallet_address");
    setWalletAddress(null);
    setIsAuthenticated(false);
    setAuthError(null);
  }, [disconnect]);

  // Expose wallet's signMessage for ER authorization (mission claim, boss overload)
  const signMessage = useCallback(
    async (msg: Uint8Array): Promise<Uint8Array> => walletSignMessage(msg),
    [walletSignMessage]
  );

  const signAndSendTransaction = useCallback(
    async (tx: Transaction): Promise<string> => walletSignAndSendTransaction(tx, 0),
    [walletSignAndSendTransaction]
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        walletAddress,
        authLoading,
        authError,
        authenticate,
        logout,
        signMessage,
        signAndSendTransaction,
        connection,
      }}
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
