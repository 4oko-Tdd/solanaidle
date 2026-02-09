import { useConnector, useAccount } from "@solana/connector";
import { Button } from "@/components/ui/button";
import { clearAuthToken } from "@/lib/api";
import { Wallet, LogOut } from "lucide-react";

interface Props {
  compact?: boolean;
}

export function ConnectButton({ compact }: Props) {
  const { wallets, select, disconnect, connected, connecting } = useConnector();
  const { formatted } = useAccount();

  if (connecting) {
    return (
      <Button disabled variant="outline" size="sm">
        Connecting...
      </Button>
    );
  }

  if (connected && formatted) {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-muted-foreground">
            {formatted}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              clearAuthToken();
              disconnect();
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="font-mono text-xs">
          {formatted}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearAuthToken();
            disconnect();
          }}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <Button disabled variant="outline">
        <Wallet className="mr-2 h-4 w-4" />
        No wallets found
      </Button>
    );
  }

  // Full wallet list for landing page
  if (wallets.length === 1) {
    return (
      <Button onClick={() => select(wallets[0].wallet.name)} variant="default">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {wallets.map((w) => (
        <Button
          key={w.wallet.name}
          onClick={() => select(w.wallet.name)}
          variant="outline"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {w.wallet.name}
        </Button>
      ))}
    </div>
  );
}
