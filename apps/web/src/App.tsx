import { ConnectButton } from "@/features/wallet/ConnectButton";
import { GameDashboard } from "@/features/game/GameDashboard";
import { useAuth } from "@/hooks/useAuth";

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
            <p className="text-muted-foreground">Authenticating...</p>
          </div>
        ) : isAuthenticated ? (
          <GameDashboard isAuthenticated={isAuthenticated} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-muted-foreground">
              Connect your wallet to begin
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
