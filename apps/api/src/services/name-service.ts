import { Connection, PublicKey } from "@solana/web3.js";
import {
  getFavoriteDomain,
  reverseLookup,
} from "@bonfida/spl-name-service";

// Domains (.sol, .skr) only exist on mainnet — always resolve against mainnet
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const ALLDOMAIN_API = "https://api.alldomains.id/reverse-lookup";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  name: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(address: string): string | null | undefined {
  const entry = cache.get(address);
  if (!entry) return undefined; // not cached
  if (Date.now() > entry.expiresAt) {
    cache.delete(address);
    return undefined; // expired
  }
  return entry.name; // null means "no name found"
}

function setCached(address: string, name: string | null): void {
  cache.set(address, { name, expiresAt: Date.now() + TTL_MS });
}

async function resolveSol(address: string): Promise<string | null> {
  try {
    const connection = new Connection(MAINNET_RPC, "confirmed");
    const pubkey = new PublicKey(address);
    const { domain } = await getFavoriteDomain(connection, pubkey);
    const name = await reverseLookup(connection, domain);
    return `${name}.sol`;
  } catch {
    return null;
  }
}

async function resolveSkr(address: string): Promise<string | null> {
  try {
    const res = await fetch(`${ALLDOMAIN_API}/${address}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { domains?: { name: string; tld: string }[] };
    const skr = data.domains?.find((d) => d.tld === "skr");
    return skr ? `${skr.name}.skr` : null;
  } catch {
    return null;
  }
}

export async function resolveName(address: string): Promise<string | null> {
  const cached = getCached(address);
  if (cached !== undefined) return cached;

  const [sol, skr] = await Promise.allSettled([resolveSol(address), resolveSkr(address)]);

  const name =
    (sol.status === "fulfilled" ? sol.value : null) ??
    (skr.status === "fulfilled" ? skr.value : null);

  setCached(address, name);
  return name;
}

export async function batchResolve(
  addresses: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(addresses)];
  await Promise.allSettled(unique.map((a) => resolveName(a)));

  const result = new Map<string, string>();
  for (const addr of unique) {
    const name = getCached(addr);
    if (name) result.set(addr, name);
  }
  return result;
}
