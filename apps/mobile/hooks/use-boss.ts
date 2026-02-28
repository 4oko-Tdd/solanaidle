import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { signOverload } from "@/lib/er";
import { useBossER } from "./use-boss-er";
import { paySkrOnChain } from "@/lib/skr";
import { useAuth } from "@/providers/auth-context";
import { scheduleSurgeNotifications } from "@/lib/game-notifications";
import type { WorldBoss, SurgeWindow } from "@solanaidle/shared";

interface BossStatus {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution?: number;
  hasJoined?: boolean;
  overloadUsed?: boolean;
  skrBalance?: number;
  reconnectUsed?: boolean;
  overloadAmpUsed?: boolean;
  raidLicense?: boolean;
  destabilized?: boolean;
  surgeActive?: boolean;
  nextSurge?: SurgeWindow | null;
  surgeWindows?: SurgeWindow[];
  monetizationCosts?: {
    reconnect: number;
    overloadAmplifier: number;
    raidLicense: number;
    freeRecoveryMinutes: number;
  };
}

interface BossState {
  boss: WorldBoss | null;
  participantCount: number;
  totalDamage: number;
  playerContribution: number;
  hasJoined: boolean;
  overloadUsed: boolean;
  skrBalance: number;
  reconnectUsed: boolean;
  overloadAmpUsed: boolean;
  raidLicense: boolean;
  destabilized: boolean;
  surgeActive: boolean;
  nextSurge: SurgeWindow | null;
  surgeWindows: SurgeWindow[];
  monetizationCosts: {
    reconnect: number;
    overloadAmplifier: number;
    raidLicense: number;
    freeRecoveryMinutes: number;
  };
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_DEFAULT = 30000;
const POLL_INTERVAL_WITH_WS = 120000;

export function useBoss() {
  const { signMessage, walletAddress, signAndSendTransaction, connection } = useAuth();
  const [state, setState] = useState<BossState>({
    boss: null,
    participantCount: 0,
    totalDamage: 0,
    playerContribution: 0,
    hasJoined: false,
    overloadUsed: false,
    skrBalance: 0,
    reconnectUsed: false,
    overloadAmpUsed: false,
    raidLicense: false,
    destabilized: false,
    surgeActive: false,
    nextSurge: null,
    surgeWindows: [],
    monetizationCosts: {
      reconnect: 25,
      overloadAmplifier: 18,
      raidLicense: 35,
      freeRecoveryMinutes: 15,
    },
    loading: true,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to on-chain boss state via websocket
  const er = useBossER(state.boss !== null && !state.boss.killed);

  const refresh = useCallback(async () => {
    try {
      const data = await api<BossStatus>("/boss");
      setState({
        boss: data.boss,
        participantCount: data.participantCount,
        totalDamage: data.totalDamage,
        playerContribution: data.playerContribution ?? 0,
        hasJoined: data.hasJoined ?? false,
        overloadUsed: data.overloadUsed ?? false,
        skrBalance: data.skrBalance ?? 0,
        reconnectUsed: data.reconnectUsed ?? false,
        overloadAmpUsed: data.overloadAmpUsed ?? false,
        raidLicense: data.raidLicense ?? false,
        destabilized: data.destabilized ?? false,
        surgeActive: data.surgeActive ?? false,
        nextSurge: data.nextSurge ?? null,
        surgeWindows: data.surgeWindows ?? [],
        monetizationCosts: data.monetizationCosts ?? {
          reconnect: 25,
          overloadAmplifier: 18,
          raidLicense: 35,
          freeRecoveryMinutes: 15,
        },
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load boss",
      }));
    }
  }, []);

  // Adjust polling interval based on websocket connection
  useEffect(() => {
    refresh();
    const interval = er.connected ? POLL_INTERVAL_WITH_WS : POLL_INTERVAL_DEFAULT;
    intervalRef.current = setInterval(refresh, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, er.connected]);

  const join = useCallback(async () => {
    await api("/boss/join", { method: "POST" });
    // Schedule surge notifications after joining
    if (state.surgeWindows.length > 0) {
      scheduleSurgeNotifications(state.surgeWindows).catch(() => {});
    }
    await refresh();
  }, [refresh, state.surgeWindows]);

  const overload = useCallback(async () => {
    if (!signMessage || !walletAddress) {
      throw new Error("Wallet signature required");
    }
    const playerSignature = await signOverload(signMessage, walletAddress);
    if (!playerSignature) {
      throw new Error("Boss OVERLOAD was cancelled in wallet");
    }
    await api("/boss/overload", {
      method: "POST",
      body: JSON.stringify({ playerSignature }),
    });
    await refresh();
  }, [refresh, signMessage, walletAddress]);

  const reconnect = useCallback(async () => {
    if (!walletAddress || !signAndSendTransaction) {
      throw new Error("Wallet transaction signature required");
    }
    const paymentSignature = await paySkrOnChain({
      walletAddress,
      amount: state.monetizationCosts.reconnect,
      connection,
      signAndSendTransaction,
    });
    await api("/boss/reconnect", {
      method: "POST",
      body: JSON.stringify({ paymentSignature }),
    });
    await refresh();
  }, [connection, refresh, signAndSendTransaction, state.monetizationCosts.reconnect, walletAddress]);

  const buyOverloadAmplifier = useCallback(async () => {
    if (!walletAddress || !signAndSendTransaction) {
      throw new Error("Wallet transaction signature required");
    }
    const paymentSignature = await paySkrOnChain({
      walletAddress,
      amount: state.monetizationCosts.overloadAmplifier,
      connection,
      signAndSendTransaction,
    });
    await api("/boss/overload-amplifier", {
      method: "POST",
      body: JSON.stringify({ paymentSignature }),
    });
    await refresh();
  }, [connection, refresh, signAndSendTransaction, state.monetizationCosts.overloadAmplifier, walletAddress]);

  const buyRaidLicense = useCallback(async () => {
    if (!walletAddress || !signAndSendTransaction) {
      throw new Error("Wallet transaction signature required");
    }
    const paymentSignature = await paySkrOnChain({
      walletAddress,
      amount: state.monetizationCosts.raidLicense,
      connection,
      signAndSendTransaction,
    });
    await api("/boss/raid-license", {
      method: "POST",
      body: JSON.stringify({ paymentSignature }),
    });
    await refresh();
  }, [connection, refresh, signAndSendTransaction, state.monetizationCosts.raidLicense, walletAddress]);

  // Merge on-chain state with HTTP state when websocket is connected.
  // Only trust on-chain HP if it's a valid value (≤ maxHp). If the ER PDA
  // was mis-initialised its HP will be > maxHp — fall back to SQLite in that case.
  const onChainHpValid =
    er.connected &&
    er.onChainHp !== null &&
    er.onChainHp <= (state.boss?.maxHp ?? 0);
  const mergedBoss: WorldBoss | null = state.boss
    ? onChainHpValid
      ? {
          ...state.boss,
          currentHp: er.onChainHp!,
          killed: er.onChainKilled ?? state.boss.killed,
        }
      : state.boss
    : null;

  return {
    ...state,
    boss: mergedBoss,
    participantCount: onChainHpValid && er.onChainParticipants !== null
      ? er.onChainParticipants
      : state.participantCount,
    totalDamage: onChainHpValid && er.onChainTotalDamage !== null
      ? er.onChainTotalDamage
      : state.totalDamage,
    wsConnected: er.connected,
    surgeActive: state.surgeActive,
    nextSurge: state.nextSurge,
    surgeWindows: state.surgeWindows,
    join,
    overload,
    reconnect,
    buyOverloadAmplifier,
    buyRaidLicense,
    refresh,
  };
}
