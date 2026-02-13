import { ConnectButton } from "@/features/wallet/ConnectButton";
import { GameDashboard } from "@/features/game/GameDashboard";
import { CurrencyBar } from "@/components/CurrencyBar";
import { useAuth } from "@/hooks/useAuth";
import { Swords, Shield, Gem, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import type { Inventory } from "@solanaidle/shared";
import bgCity from "@/assets/icons/bgcity.png";

export default function App() {
  const { isAuthenticated, authLoading } = useAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const handleInventoryChange = useCallback((inv: Inventory | null) => setInventory(inv), []);

  return (
    <div className="flex h-dvh flex-col relative">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: `url(${bgCity})` }}
      />
      <div className="fixed inset-0 -z-10 bg-black/60" />
      <header className="shrink-0">
        <div className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-xl px-4">
          <h1 className="text-lg font-display text-gradient">Solana Idle</h1>
          {isAuthenticated && <ConnectButton compact />}
        </div>
        {isAuthenticated && inventory && (
          <div className="flex items-center justify-center border-b border-white/[0.06] bg-black/30 backdrop-blur-xl py-1.5">
            <CurrencyBar inventory={inventory} />
          </div>
        )}
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {authLoading ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-neon-purple" />
          </div>
        ) : isAuthenticated ? (
          <GameDashboard isAuthenticated={isAuthenticated} onInventoryChange={handleInventoryChange} />
        ) : (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-8 p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#9945FF]/[0.07] rounded-full blur-3xl" /><div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#14F195]/[0.05] rounded-full blur-3xl" /></div>
            <div className="flex items-center gap-3 animate-fade-in-up">
              <Shield className="h-8 w-8 text-neon-purple/60" />
              <Swords className="h-10 w-10 text-neon-green" />
              <Gem className="h-8 w-8 text-neon-cyan/60" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-3xl text-gradient font-display tracking-tight">
                Solana Idle
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Run your node, stake on missions, collect rewards, upgrade your setup, and
                earn NFTs - all on Solana.
              </p>
            </div>

            <ConnectButton />

            <p className="text-xs text-muted-foreground font-mono">
              Works with any Solana wallet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
