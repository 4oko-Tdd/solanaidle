/**
 * Player authorization helpers for Ephemeral Rollup actions (mobile version).
 * Uses Buffer instead of btoa (not available in React Native).
 */

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

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
