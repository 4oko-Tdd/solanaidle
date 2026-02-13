import { useWallet } from "@solana/wallet-adapter-react";

export function useWalletSign() {
  const { signMessage: walletSignMessage } = useWallet();

  async function signMessage(message: string): Promise<string | null> {
    if (!walletSignMessage) {
      console.warn("[useWalletSign] signMessage not available, returning null");
      return null;
    }

    const messageBytes = new TextEncoder().encode(message);
    const signature = await walletSignMessage(messageBytes);

    const bs58Module = await import("bs58");
    return bs58Module.default.encode(new Uint8Array(signature));
  }

  return { signMessage };
}
