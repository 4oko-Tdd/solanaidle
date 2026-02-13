import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from "@solana/web3.js";

// Program ID — must match deployed vrf-roller program
const VRF_ROLLER_PROGRAM_ID = new PublicKey(
  "VRFro11erXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// MagicBlock VRF constants (from ephemeral_vrf_sdk::consts)
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

interface UseVrfRollReturn {
  requestRoll: () => Promise<string | null>;
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
 * 2. Player signs and sends transaction
 * 3. Poll PDA until oracle fulfills (status = 1)
 * 4. Return PDA pubkey for backend to read
 */
export function useVrfRoll(): UseVrfRollReturn {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<VrfStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [vrfAccount, setVrfAccount] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setVrfAccount(null);
  }, []);

  const requestRoll = useCallback(async (): Promise<string | null> => {
    if (!publicKey || !sendTransaction) {
      setError("Wallet not connected");
      setStatus("error");
      return null;
    }

    try {
      setStatus("requesting");
      setError(null);

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
        // Pre-computed: sha256("global:request_randomness")[0..8]
        0xd5, 0xf5, 0x7c, 0x1f, 0xf4, 0x4a, 0x92, 0xd6,
      ]);

      // client_seed: u8 = random value for seed diversity
      const clientSeed = Math.floor(Math.random() * 256);
      const data = new Uint8Array(discriminator.length + 1);
      data.set(discriminator);
      data[discriminator.length] = clientSeed;

      // Account keys for request_randomness context
      // The #[vrf] macro adds extra accounts. Based on the SDK, the accounts are:
      // 1. payer (signer, mut)
      // 2. vrf_result (mut)
      // 3. oracle_queue (mut)
      // 4. system_program
      // 5. vrf_program (the MagicBlock VRF program)
      // 6. vrf_program_identity
      // 7. slot_hashes sysvar
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
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setStatus("waiting-oracle");
      setVrfAccount(vrfResultPda.toBase58());

      // Poll PDA until fulfilled (max 10 seconds)
      const fulfilled = await pollForFulfillment(
        connection,
        vrfResultPda,
        10000
      );

      if (fulfilled) {
        setStatus("fulfilled");
        return vrfResultPda.toBase58();
      } else {
        setError("Oracle timeout — randomness not fulfilled in time");
        setStatus("error");
        return null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "VRF request failed";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, [publicKey, sendTransaction, connection]);

  return { requestRoll, vrfAccount, status, error, reset };
}

/**
 * Poll the VRF result PDA until status === fulfilled or timeout.
 */
async function pollForFulfillment(
  connection: ReturnType<typeof useConnection>["connection"],
  pda: PublicKey,
  timeoutMs: number
): Promise<boolean> {
  const start = Date.now();
  const interval = 1000; // 1 second

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, interval));

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
