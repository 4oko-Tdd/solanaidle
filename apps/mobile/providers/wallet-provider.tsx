import React from "react";
import { AuthProvider } from "./auth-context";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
