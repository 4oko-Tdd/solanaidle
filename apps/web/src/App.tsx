import { ConnectButton } from "@/features/wallet/ConnectButton";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold">Solana Idle</h1>
        <ConnectButton />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">Connect your wallet to begin</p>
      </main>
    </div>
  );
}
