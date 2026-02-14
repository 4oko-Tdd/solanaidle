/**
 * Hook for Ephemeral Rollup progress delegation.
 *
 * Provides instruction builders for:
 * - Epoch start: initialize + delegate progress PDA to ER
 * - Epoch end: finalize + commit progress PDA back to Solana
 *
 * These instructions are bundled into the existing epoch start/end
 * transactions so the player signs ZERO extra times.
 */

import { useCallback, useState, useEffect } from "react";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { api } from "@/lib/api";

interface ERInfo {
  PROGRESS_PROGRAM_ID: string;
  DELEGATION_PROGRAM_ID: string;
  ER_ROUTER_URL: string;
  ER_VALIDATOR_URL: string;
  progressPda: string;
  weekStartTs: number;
}

const CLASS_ID_MAP: Record<string, number> = {
  scout: 0,
  guardian: 1,
  mystic: 2,
};

export function useEphemeralProgress() {
  const [erInfo, setErInfo] = useState<ERInfo | null>(null);

  // Fetch ER info from backend
  const fetchERInfo = useCallback(async () => {
    try {
      const info = await api<ERInfo>("/runs/er-info");
      setErInfo(info);
      return info;
    } catch (err) {
      console.warn("[useEphemeralProgress] Failed to fetch ER info:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchERInfo();
  }, [fetchERInfo]);

  /**
   * Build the initialize_and_delegate instruction for epoch start.
   * Returns null if ER info isn't available yet.
   */
  const buildDelegateIx = useCallback(
    (
      playerPubkey: PublicKey,
      classId: string
    ): TransactionInstruction | null => {
      if (!erInfo) return null;

      const programId = new PublicKey(erInfo.PROGRESS_PROGRAM_ID);
      const progressPda = new PublicKey(erInfo.progressPda);
      const classIdNum = CLASS_ID_MAP[classId] ?? 0;

      // Anchor discriminator for "initialize_and_delegate"
      const discriminator = new Uint8Array([
        0x5f, 0x9b, 0x3a, 0x7e, 0x12, 0xc4, 0xd8, 0x01,
      ]);

      // week_start as i64 LE
      const weekBytes = new Uint8Array(8);
      const view = new DataView(weekBytes.buffer);
      view.setBigInt64(0, BigInt(erInfo.weekStartTs), true);

      // Combine: discriminator(8) + week_start(8) + class_id(1)
      const data = new Uint8Array(8 + 8 + 1);
      data.set(discriminator, 0);
      data.set(weekBytes, 8);
      data[16] = classIdNum;

      return new TransactionInstruction({
        programId,
        keys: [
          { pubkey: playerPubkey, isSigner: true, isWritable: true },
          { pubkey: progressPda, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data: data as any,
      });
    },
    [erInfo]
  );

  /**
   * Build the finalize_and_commit instruction for epoch end.
   * Returns null if ER info isn't available yet.
   */
  const buildFinalizeIx = useCallback(
    (
      playerPubkey: PublicKey,
      magicContext: PublicKey,
      magicProgram: PublicKey
    ): TransactionInstruction | null => {
      if (!erInfo) return null;

      const programId = new PublicKey(erInfo.PROGRESS_PROGRAM_ID);
      const progressPda = new PublicKey(erInfo.progressPda);

      // Anchor discriminator for "finalize_and_commit"
      const discriminator = new Uint8Array([
        0xb7, 0x53, 0x6d, 0x91, 0x28, 0xe0, 0xaa, 0x03,
      ]);

      return new TransactionInstruction({
        programId,
        keys: [
          { pubkey: playerPubkey, isSigner: true, isWritable: true },
          { pubkey: progressPda, isSigner: false, isWritable: true },
          { pubkey: magicContext, isSigner: false, isWritable: false },
          { pubkey: magicProgram, isSigner: false, isWritable: false },
        ],
        data: discriminator as any,
      });
    },
    [erInfo]
  );

  return {
    erInfo,
    fetchERInfo,
    buildDelegateIx,
    buildFinalizeIx,
    progressPda: erInfo?.progressPda ?? null,
  };
}
