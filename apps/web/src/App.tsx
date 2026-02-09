import { ConnectButton } from "@/features/wallet/ConnectButton";
import { GameDashboard } from "@/features/game/GameDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Swords, Shield, Gem, Loader2 } from "lucide-react";

export default function App() {
  const { isAuthenticated, authLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Solana Idle</h1>
        <ConnectButton />
      </header>
      <main className="flex flex-1 flex-col">
        {authLoading ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isAuthenticated ? (
          <GameDashboard isAuthenticated={isAuthenticated} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="h-8 w-8" />
              <Swords className="h-10 w-10 text-foreground" />
              <Gem className="h-8 w-8" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                Solana Idle
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Send your character on missions, collect loot, upgrade gear, and
                earn NFTs -- all on Solana.
              </p>
            </div>

            <ConnectButton />

            <p className="text-xs text-muted-foreground">
              Works with any Solana wallet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
