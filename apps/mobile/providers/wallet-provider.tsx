import React from "react";
import { MobileWalletProvider } from "@wallet-ui/react-native-web3js";
import { clusterApiUrl } from "@solana/web3.js";
import { AuthProvider } from "./auth-context";
import Constants from "expo-constants";

// MobileWalletProvider manages the MWA session and exposes useMobileWallet().
// AuthProvider wraps it to add JWT state and game-level auth helpers.
const clusterName = (Constants.expoConfig?.extra?.solanaCluster as string) || process.env.EXPO_PUBLIC_SOLANA_CLUSTER || "devnet";
const chain = `solana:${clusterName}` as const;
const endpoint = process.env.EXPO_PUBLIC_RPC_URL || clusterApiUrl(clusterName as "devnet" | "mainnet-beta" | "testnet");
const identity = {
  name: "Seeker Node",
  uri: "https://seekernode.app",
  icon: "/icon.png", // relative to uri — required by MWA spec
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <MobileWalletProvider chain={chain} endpoint={endpoint} identity={identity}>
      <AuthProvider>{children}</AuthProvider>
    </MobileWalletProvider>
  );
}
