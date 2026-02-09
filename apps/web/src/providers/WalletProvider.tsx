import { useMemo } from "react";
import { AppProvider } from "@solana/connector/react";
import { getDefaultConfig, getDefaultMobileConfig } from "@solana/connector/headless";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const connectorConfig = useMemo(() => {
    return getDefaultConfig({
      appName: "Solana Idle",
      appUrl: window.location.origin,
      autoConnect: true,
      enableMobile: true,
    });
  }, []);

  const mobile = useMemo(
    () =>
      getDefaultMobileConfig({
        appName: "Solana Idle",
        appUrl: window.location.origin,
      }),
    [],
  );

  return (
    <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
      {children}
    </AppProvider>
  );
}
