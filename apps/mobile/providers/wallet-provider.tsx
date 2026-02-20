import React from "react";
import { MobileWalletProvider, createSolanaDevnet } from "@wallet-ui/react-native-kit";
import { AuthProvider } from "./auth-context";

// MobileWalletProvider manages the MWA session and exposes useMobileWallet().
// AuthProvider wraps it to add JWT state and game-level auth helpers.
const cluster = createSolanaDevnet();
const identity = {
  name: "Seeker Node",
  uri: "https://seekernode.app",
  icon: "/icon.png", // relative to uri — required by MWA spec
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <MobileWalletProvider cluster={cluster} identity={identity}>
      <AuthProvider>{children}</AuthProvider>
    </MobileWalletProvider>
  );
}
