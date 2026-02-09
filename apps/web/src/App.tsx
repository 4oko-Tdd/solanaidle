import { ConnectButton } from "@/features/wallet/ConnectButton";
import { GameDashboard } from "@/features/game/GameDashboard";
import { getAuthToken } from "@/lib/api";

export default function App() {
  const isAuthenticated = !!getAuthToken();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Solana Idle</h1>
        <ConnectButton />
      </header>
      <main className="flex flex-1 flex-col">
        {isAuthenticated ? (
          <GameDashboard isAuthenticated={isAuthenticated} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-muted-foreground">Connect your wallet to begin</p>
          </div>
        )}
      </main>
    </div>
  );
}
