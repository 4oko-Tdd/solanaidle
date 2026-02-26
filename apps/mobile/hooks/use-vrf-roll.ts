import React, { useState, useCallback, useEffect, useRef } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import bs58 from "bs58";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";

// Program ID — must match deployed vrf-roller program
const VRF_ROLLER_PROGRAM_ID = new PublicKey(
  "6poGeFLevD7oDWtY9FYHHXQ669vwJvMRa8R5iT98ESKN"
);

// MagicBlock VRF constants (from ephemeral-vrf-sdk::consts)
// These are the devnet addresses — update for mainnet
const VRF_PROGRAM_ID = new PublicKey(
  "VRFzBcmMEXpDUcTpSmXbcNMKjLPKuAHCFb3jRKr1V4L"
);
const DEFAULT_ORACLE_QUEUE = new PublicKey(
  "Eo1tMemqVhYsBGfMxiMGvBFrdpt8v57sz1GBxoxDCDi2"
);
const VRF_PROGRAM_IDENTITY_SEED = new TextEncoder().encode("identity");

const VRF_RESULT_SEED = new TextEncoder().encode("vrf_result");

// Account data layout offsets (after 8-byte discriminator)
const STATUS_OFFSET = 8 + 32 + 32; // discriminator + player + randomness
const STATUS_FULFILLED = 1;

export type VrfStatus =
  | "idle"
  | "requesting"
  | "waiting-oracle"
  | "fulfilled"
  | "error";

interface VrfRollResult {
  vrfAccount: string;
  /** Extra message signature (bs58), if a message was provided */
  messageSig?: string;
}

interface UseVrfRollReturn {
  /** Pass an optional message to sign in the same MWA session as the VRF tx */
  requestRoll: (messageToSign?: Uint8Array) => Promise<VrfRollResult | null>;
  vrfAccount: string | null;
  status: VrfStatus;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to request verifiable randomness from MagicBlock VRF.
 *
 * Flow:
 * 1. Build request_randomness instruction
 * 2. Player signs and sends transaction via MWA transact()
 * 3. Poll PDA until oracle fulfills (status = 1)
 * 4. Return PDA pubkey for backend to read
 */
export function useVrfRoll(): UseVrfRollReturn {
  const [status, setStatus] = useState<VrfStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [vrfAccount, setVrfAccount] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setVrfAccount(null);
  }, []);

  const requestRoll = useCallback(async (messageToSign?: Uint8Array): Promise<VrfRollResult | null> => {
    cancelledRef.current = false;
    try {
      setStatus("requesting");
      setError(null);

      // Create connection on demand — avoids a persistent WebSocket at module scope
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const { blockhash } = await connection.getLatestBlockhash();

      // transact() opens a SINGLE MWA session for both VRF tx + optional message signing
      const result = await transact(async (wallet) => {
        // Authorize the session (re-uses existing session if active)
        const authResult = await wallet.authorize({
          cluster: "devnet",
          identity: {
            name: "Seeker Node",
            uri: "https://seekernode.app",
            icon: "/icon.png",
          },
        });

        const publicKey = new PublicKey(
          Buffer.from(authResult.accounts[0].address)
        );

        // Derive VRF result PDA
        const [vrfResultPda] = PublicKey.findProgramAddressSync(
          [VRF_RESULT_SEED, publicKey.toBytes()],
          VRF_ROLLER_PROGRAM_ID
        );

        // Derive VRF program identity PDA
        const [vrfProgramIdentity] = PublicKey.findProgramAddressSync(
          [VRF_PROGRAM_IDENTITY_SEED],
          VRF_PROGRAM_ID
        );

        // Build the request_randomness instruction
        // Anchor discriminator for "request_randomness" = first 8 bytes of sha256("global:request_randomness")
        const discriminator = new Uint8Array([
          // sha256("global:request_randomness")[0..8]
          0xd5, 0x05, 0xad, 0xa6, 0x25, 0xec, 0x1f, 0x12,
        ]);

        // client_seed: u8 = random value for seed diversity
        const clientSeed = Math.floor(Math.random() * 256);
        const data = new Uint8Array(discriminator.length + 1);
        data.set(discriminator);
        data[discriminator.length] = clientSeed;

        const ix = new TransactionInstruction({
          programId: VRF_ROLLER_PROGRAM_ID,
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: vrfResultPda, isSigner: false, isWritable: true },
            { pubkey: DEFAULT_ORACLE_QUEUE, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: VRF_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: vrfProgramIdentity, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
          ],
          data: data as any,
        });

        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;

        // Sign and send VRF tx via MWA
        const signedTxs = await wallet.signAndSendTransactions({
          transactions: [tx],
        });

        // Sign the extra message in the SAME session (no second wallet popup)
        let messageSig: string | undefined;
        if (messageToSign) {
          const signed = await wallet.signMessages({
            addresses: [authResult.accounts[0].address],
            payloads: [messageToSign],
          });
          // MWA sign_messages returns message+signature; extract last 64 bytes (ed25519)
          const sigBytes = new Uint8Array(signed[0]);
          const sig64 = sigBytes.length > 64
            ? sigBytes.slice(sigBytes.length - 64)
            : sigBytes;
          messageSig = bs58.encode(sig64);
        }

        const [vrfPda] = PublicKey.findProgramAddressSync(
          [VRF_RESULT_SEED, publicKey.toBytes()],
          VRF_ROLLER_PROGRAM_ID
        );
        return { sig: signedTxs[0] as string, pdaAddress: vrfPda.toBase58(), messageSig };
      });

      const { sig, pdaAddress, messageSig } = result as { sig: string; pdaAddress: string; messageSig?: string };
      await connection.confirmTransaction(sig, "confirmed");

      if (!cancelledRef.current) {
        setStatus("waiting-oracle");
        setVrfAccount(pdaAddress);
      }

      // Poll PDA until fulfilled (max 10 seconds)
      const vrfResultPda = new PublicKey(pdaAddress);
      const fulfilled = await pollForFulfillment(
        vrfResultPda,
        connection,
        cancelledRef,
        10000
      );

      if (cancelledRef.current) return null;

      if (fulfilled) {
        setStatus("fulfilled");
        return { vrfAccount: pdaAddress, messageSig };
      } else {
        setError("Oracle timeout — randomness not fulfilled in time");
        setStatus("error");
        return null;
      }
    } catch (e) {
      if (cancelledRef.current) return null;
      const msg = e instanceof Error ? e.message : "VRF request failed";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  // Cancel any in-flight poll when the component unmounts
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return { requestRoll, vrfAccount, status, error, reset };
}

/**
 * Poll the VRF result PDA until status === fulfilled, timeout, or cancelled.
 */
async function pollForFulfillment(
  pda: PublicKey,
  connection: Connection,
  cancelledRef: React.MutableRefObject<boolean>,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();
  const interval = 1000; // 1 second

  while (Date.now() - start < timeoutMs) {
    if (cancelledRef.current) return false;
    await new Promise((r) => setTimeout(r, interval));
    if (cancelledRef.current) return false;

    try {
      const accountInfo = await connection.getAccountInfo(pda);
      if (accountInfo?.data) {
        const statusByte = accountInfo.data[STATUS_OFFSET];
        if (statusByte === STATUS_FULFILLED) {
          return true;
        }
      }
    } catch {
      // Ignore transient RPC errors during polling
    }
  }

  return false;
}
