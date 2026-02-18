/**
 * Player authorization helpers for Ephemeral Rollup actions.
 *
 * Instead of signing ER transactions (which fail Phantom's devnet simulation),
 * the player signs a human-readable message. The signature is sent to the API
 * as proof of authorization, and the server submits the ER transaction.
 */

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Sign a mission claim authorization message.
 * Returns base64-encoded signature, or null if wallet doesn't support signMessage.
 */
export async function signClaim(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
  wallet: string
): Promise<string | null> {
  try {
    const msg = new TextEncoder().encode(
      `Authorize mission claim\nWallet: ${wallet}`
    );
    const sig = await signMessage(msg);
    return toBase64(sig);
  } catch {
    return null;
  }
}

/**
 * Sign a boss OVERLOAD authorization message.
 * Returns base64-encoded signature, or null if wallet doesn't support signMessage.
 */
export async function signOverload(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
  wallet: string
): Promise<string | null> {
  try {
    const msg = new TextEncoder().encode(
      `Authorize boss OVERLOAD\nWallet: ${wallet}`
    );
    const sig = await signMessage(msg);
    return toBase64(sig);
  } catch {
    return null;
  }
}
