import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { signClaim } from "@/lib/er";
import { useWalletSign } from "./use-wallet-sign";
import type {
  Character, ActiveMission, ActiveMissions, MissionType, Inventory,
  UpgradeInfo, MissionClaimResponse, MissionId,
  WeeklyRun, CharacterClass, ClassId, GearTrack,
} from "@solanaidle/shared";

interface GameState {
  character: Character | null;
  missions: MissionType[];
  activeMissions: ActiveMissions | null;
  inventory: Inventory | null;
  upgradeInfo: UpgradeInfo | null;
  loading: boolean;
  error: string | null;
  lastClaimResult: MissionClaimResponse | null;
  activeRun: WeeklyRun | null;
  classes: CharacterClass[];
  endedRun: WeeklyRun | null;
}

export function useGameState(isAuthenticated: boolean) {
  const { signMessage, walletAddress } = useWalletSign();

  const [state, setState] = useState<GameState>({
    character: null, missions: [], activeMissions: null,
    inventory: null, upgradeInfo: null, loading: true,
    error: null, lastClaimResult: null, activeRun: null,
    classes: [], endedRun: null,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      let char: Character;
      try {
        char = await api<Character>("/character");
      } catch (e: unknown) {
        const err = e as { error?: string };
        if (err.error === "CHARACTER_NOT_FOUND") {
          char = await api<Character>("/character", { method: "POST" });
        } else throw e;
      }
      const [missions, activeRes, inventory, upgradeInfo, runData, classData] =
        await Promise.all([
          api<MissionType[]>("/missions"),
          api<{ activeMission: ActiveMission | null; main: ActiveMission | null; fast: ActiveMission | null; fastSlotUnlocked: boolean }>("/missions/active"),
          api<Inventory>("/inventory"),
          api<UpgradeInfo>("/upgrades"),
          api<WeeklyRun | null>("/runs/current"),
          api<CharacterClass[]>("/runs/classes"),
        ]);
      let endedRun: WeeklyRun | null = null;
      if (!runData) {
        try { endedRun = await api<WeeklyRun | null>("/runs/ended"); }
        catch { endedRun = null; }
      }
      const activeMissions: ActiveMissions = {
        main: activeRes.main ?? activeRes.activeMission ?? null,
        fast: activeRes.fast ?? null,
        fastSlotUnlocked: activeRes.fastSlotUnlocked ?? false,
      };
      setState((s) => ({
        ...s, character: char, missions, activeMissions,
        inventory, upgradeInfo, activeRun: runData, classes: classData,
        endedRun, loading: false,
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({ ...s, loading: false, error: err.message || "Failed to load" }));
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  // Countdown timer — ticks both main and fast slot timeRemaining
  useEffect(() => {
    const hasMain = !!state.activeMissions?.main?.timeRemaining;
    const hasFast = !!state.activeMissions?.fast?.timeRemaining;
    if (!hasMain && !hasFast) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (!s.activeMissions) return s;
        const { main, fast, fastSlotUnlocked } = s.activeMissions;
        const newMain = main
          ? { ...main, timeRemaining: Math.max(0, (main.timeRemaining ?? 0) - 1) }
          : null;
        const newFast = fast
          ? { ...fast, timeRemaining: Math.max(0, (fast.timeRemaining ?? 0) - 1) }
          : null;
        return { ...s, activeMissions: { main: newMain, fast: newFast, fastSlotUnlocked } };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeMissions?.main?.missionId, state.activeMissions?.fast?.missionId]);

  const startMission = useCallback(
    async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean; slot?: 'main' | 'fast' }) => {
      const { slot, ...rest } = options ?? {};
      await api("/missions/start", { method: "POST", body: JSON.stringify({ missionId, ...rest, slot: slot ?? 'main' }) });
      await refresh();
    }, [refresh]);

  const claimMission = useCallback(async (slot: 'main' | 'fast' = 'main') => {
    if (slot === 'main') {
      if (!signMessage || !walletAddress) {
        throw new Error("Wallet signature required");
      }
      const playerSignature = await signClaim(signMessage, walletAddress);
      if (!playerSignature) {
        throw new Error("Mission claim was cancelled in wallet");
      }
      const result = await api<MissionClaimResponse>("/missions/claim", {
        method: "POST",
        body: JSON.stringify({ playerSignature, slot }),
      });
      setState((s) => ({ ...s, lastClaimResult: result }));
      await refresh();
      return result;
    } else {
      // Fast slot claim — no signature required
      const result = await api<MissionClaimResponse>("/missions/claim", {
        method: "POST",
        body: JSON.stringify({ slot }),
      });
      setState((s) => ({ ...s, lastClaimResult: result }));
      await refresh();
      return result;
    }
  }, [refresh, signMessage, walletAddress]);

  const upgradeTrack = useCallback(async (track: GearTrack) => {
    await api(`/upgrades/${track}`, { method: "POST" });
    await refresh();
  }, [refresh]);

  const clearClaimResult = useCallback(() => {
    setState((s) => ({ ...s, lastClaimResult: null }));
  }, []);

  const startRun = useCallback(async (classId: ClassId, signature?: string) => {
    await api("/runs/start", { method: "POST", body: JSON.stringify({ classId, signature }) });
    await refresh();
  }, [refresh]);

  const unlockFastSlot = useCallback(async (paymentSignature: string) => {
    await api("/runs/unlock-fast-slot", {
      method: "POST",
      body: JSON.stringify({ paymentSignature }),
    });
    await refresh();
  }, [refresh]);

  // Backward-compat: expose activeMission as main slot
  const activeMission = state.activeMissions?.main ?? null;

  return { ...state, activeMission, startMission, claimMission, upgradeTrack, refresh, clearClaimResult, startRun, unlockFastSlot };
}
