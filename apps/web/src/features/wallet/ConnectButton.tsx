import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuthToken } from "@/lib/api";
import { Wallet, LogOut, ChevronDown } from "lucide-react";

const SEEKER_ADAPTER_NAME = "Mobile Wallet Adapter";

interface Props {
  compact?: boolean;
}

export function ConnectButton({ compact }: Props) {
  const { wallets, select, disconnect, connected, connecting, publicKey } =
    useWallet();

  const formatted = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const availableWallets = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable,
  );

  // Pin Seeker (MWA) first, then the rest
  const seekerWallet = availableWallets.find(
    (w) => w.adapter.name === SEEKER_ADAPTER_NAME,
  );
  const otherWallets = availableWallets.filter(
    (w) => w.adapter.name !== SEEKER_ADAPTER_NAME,
  );

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
          <span className="text-xs font-mono text-neon-green/70">
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

  if (availableWallets.length === 0) {
    return (
      <Button disabled variant="outline">
        <Wallet className="mr-2 h-4 w-4" />
        No wallets found
      </Button>
    );
  }

  // Single wallet — just connect directly
  if (availableWallets.length === 1) {
    return (
      <Button
        onClick={() => select(availableWallets[0].adapter.name)}
        variant="default"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect {availableWallets[0].adapter.name === SEEKER_ADAPTER_NAME ? "Seeker" : availableWallets[0].adapter.name}
      </Button>
    );
  }

  // Multiple wallets — primary button for Seeker + dropdown for others
  const primaryWallet = seekerWallet ?? availableWallets[0];
  const primaryLabel =
    primaryWallet.adapter.name === SEEKER_ADAPTER_NAME
      ? "Seeker"
      : primaryWallet.adapter.name;
  const dropdownWallets = seekerWallet
    ? otherWallets
    : availableWallets.slice(1);

  return (
    <div className="flex items-center">
      <Button
        onClick={() => select(primaryWallet.adapter.name)}
        variant="default"
        className="rounded-r-none"
      >
        {primaryWallet.adapter.icon && (
          <img
            src={primaryWallet.adapter.icon}
            alt=""
            className="mr-2 h-4 w-4"
          />
        )}
        {primaryLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="rounded-l-none border-l border-l-white/20 px-2">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {dropdownWallets.map((w) => (
            <DropdownMenuItem
              key={w.adapter.name}
              onClick={() => select(w.adapter.name)}
              className="cursor-pointer"
            >
              {w.adapter.icon && (
                <img
                  src={w.adapter.icon}
                  alt=""
                  className="mr-2 h-4 w-4"
                />
              )}
              {w.adapter.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
