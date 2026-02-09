import { useConnector } from "@solana/connector";

export function useWalletSign() {
  const { selectedWallet } = useConnector();

  async function signMessage(message: string): Promise<string | null> {
    const signFeature =
      selectedWallet?.features?.["solana:signMessage"] ??
      selectedWallet?.features?.["standard:signMessage"];

    if (
      signFeature &&
      typeof (signFeature as { signMessage?: unknown }).signMessage === "function"
    ) {
      const messageBytes = new TextEncoder().encode(message);
      const result = await (
        signFeature as {
          signMessage: (opts: {
            message: Uint8Array;
            account: unknown;
          }) => Promise<{ signature: Uint8Array }>;
        }
      ).signMessage({
        message: messageBytes,
        account: selectedWallet?.accounts?.[0],
      });

      const bs58Module = await import("bs58");
      return bs58Module.default.encode(new Uint8Array(result.signature));
    }

    console.warn("[useWalletSign] signMessage not available, returning null");
    return null;
  }

  return { signMessage };
}
