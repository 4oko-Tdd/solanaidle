import { useState, useEffect, useRef, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { api } from "@/lib/api";

interface BossPdaResponse {
  pda: string;
  erValidatorUrl: string;
}

interface OnChainBossState {
  onChainHp: number | null;
  onChainMaxHp: number | null;
  onChainKilled: boolean | null;
  onChainParticipants: number | null;
  onChainTotalDamage: number | null;
  connected: boolean;
}

const INITIAL_STATE: OnChainBossState = {
  onChainHp: null,
  onChainMaxHp: null,
  onChainKilled: null,
  onChainParticipants: null,
  onChainTotalDamage: null,
  connected: false,
};

/**
 * Read a little-endian u64 from a Uint8Array at the given offset.
 */
function readU64LE(data: Uint8Array, offset: number): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return Number(view.getBigUint64(offset, true));
}

/**
 * Read a little-endian u32 from a Uint8Array at the given offset.
 */
function readU32LE(data: Uint8Array, offset: number): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getUint32(offset, true);
}

/**
 * Parse BossState account data at fixed byte offsets.
 *
 * Layout (after 8-byte Anchor discriminator):
 *   authority:         Pubkey  (32)
 *   week_start:        i64    (8)
 *   max_hp:            u64    (8)
 *   current_hp:        u64    (8)
 *   total_damage:      u64    (8)
 *   participant_count: u32    (4)
 *   killed:            bool   (1)
 *   spawned_at:        i64    (8)
 *   bump:              u8     (1)
 */
function parseBossState(data: Uint8Array): Omit<OnChainBossState, "connected"> {
  const offset = 8 + 32 + 8; // skip discriminator + authority + week_start
  const maxHp = readU64LE(data, offset);
  const currentHp = readU64LE(data, offset + 8);
  const totalDamage = readU64LE(data, offset + 16);
  const participantCount = readU32LE(data, offset + 24);
  const killed = data[offset + 28] === 1;

  return {
    onChainHp: currentHp,
    onChainMaxHp: maxHp,
    onChainKilled: killed,
    onChainParticipants: participantCount,
    onChainTotalDamage: totalDamage,
  };
}

export function useBossER(bossExists: boolean): OnChainBossState {
  const [state, setState] = useState<OnChainBossState>(INITIAL_STATE);
  const subscriptionRef = useRef<number | null>(null);
  const connectionRef = useRef<Connection | null>(null);

  const cleanup = useCallback(() => {
    if (subscriptionRef.current !== null && connectionRef.current) {
      connectionRef.current.removeAccountChangeListener(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    if (!bossExists) {
      cleanup();
      return;
    }

    let cancelled = false;

    async function subscribe() {
      try {
        const { pda, erValidatorUrl } = await api<BossPdaResponse>("/boss/pda");
        if (cancelled || !pda) return;

        const bossPda = new PublicKey(pda);
        const connection = new Connection(erValidatorUrl, {
          commitment: "confirmed",
          wsEndpoint: erValidatorUrl.replace(
            /^https?:\/\//,
            (m) => (m.startsWith("https") ? "wss://" : "ws://")
          ),
        });
        connectionRef.current = connection;

        // Initial fetch
        const accountInfo = await connection.getAccountInfo(bossPda);
        if (accountInfo?.data && !cancelled) {
          const parsed = parseBossState(new Uint8Array(accountInfo.data));
          setState({ ...parsed, connected: true });
        }

        // Subscribe to changes
        subscriptionRef.current = connection.onAccountChange(
          bossPda,
          (accountInfo) => {
            if (cancelled) return;
            const parsed = parseBossState(new Uint8Array(accountInfo.data));
            setState({ ...parsed, connected: true });
          },
          "confirmed"
        );
      } catch (err) {
        console.warn("[BossER] Websocket subscription failed:", err);
        if (!cancelled) {
          setState(INITIAL_STATE);
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [bossExists, cleanup]);

  return state;
}
