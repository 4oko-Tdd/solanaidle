import { useConnector, useAccount } from "@solana/connector";
import { Button } from "@/components/ui/button";
import { clearAuthToken } from "@/lib/api";

export function ConnectButton() {
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
        No wallets found
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
          Connect {w.wallet.name}
        </Button>
      ))}
    </div>
  );
}
