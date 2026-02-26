import React from "react";
import { MobileWalletProvider } from "@wallet-ui/react-native-web3js";
import { clusterApiUrl } from "@solana/web3.js";
import { AuthProvider } from "./auth-context";

// MobileWalletProvider manages the MWA session and exposes useMobileWallet().
// AuthProvider wraps it to add JWT state and game-level auth helpers.
const chain = "solana:devnet";
const endpoint = clusterApiUrl("devnet");
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
