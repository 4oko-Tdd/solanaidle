import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import { clusterApiUrl } from "@solana/web3.js";

const SOLANA_CLUSTER = (import.meta.env.VITE_SOLANA_CLUSTER || "devnet") as "devnet" | "mainnet-beta" | "testnet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => import.meta.env.VITE_RPC_URL || clusterApiUrl(SOLANA_CLUSTER),
    [],
  );

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "Seeker Node",
          uri: window.location.origin,
          icon: "favicon.ico",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: SOLANA_CLUSTER,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
