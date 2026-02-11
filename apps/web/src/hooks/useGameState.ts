import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type {
  Character,
  ActiveMission,
  MissionType,
  Inventory,
  UpgradeInfo,
  MissionClaimResponse,
  MissionId,
  WeeklyRun,
  CharacterClass,
  ClassId,
  GearTrack,
} from "@solanaidle/shared";

interface GameState {
  character: Character | null;
  missions: MissionType[];
  activeMission: ActiveMission | null;
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
  const [state, setState] = useState<GameState>({
    character: null,
    missions: [],
    activeMission: null,
    inventory: null,
    upgradeInfo: null,
    loading: true,
    error: null,
    lastClaimResult: null,
    activeRun: null,
    classes: [],
    endedRun: null,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setState((s) => ({ ...s, loading: true, error: null }));

      let char: Character;
      try {
        char = await api<Character>("/character");
      } catch (e: unknown) {
        const err = e as { error?: string; message?: string };
        if (err.error === "CHARACTER_NOT_FOUND") {
          char = await api<Character>("/character", { method: "POST" });
        } else throw e;
      }

      const [missions, activeRes, inventory, upgradeInfo, runData, classData] =
        await Promise.all([
          api<MissionType[]>("/missions"),
          api<{ activeMission: ActiveMission | null }>("/missions/active"),
          api<Inventory>("/inventory"),
          api<UpgradeInfo>("/upgrades"),
          api<WeeklyRun | null>("/runs/current"),
          api<CharacterClass[]>("/runs/classes"),
        ]);

      let endedRun: WeeklyRun | null = null;
      if (!runData) {
        try {
          endedRun = await api<WeeklyRun | null>("/runs/ended");
        } catch { endedRun = null; }
      }

      setState((s) => ({
        ...s,
        character: char,
        missions,
        activeMission: activeRes.activeMission,
        inventory,
        upgradeInfo,
        activeRun: runData,
        classes: classData,
        endedRun,
        loading: false,
      }));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Failed to load",
      }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll active mission timer
  useEffect(() => {
    if (!state.activeMission || !state.activeMission.timeRemaining) return;
    const interval = setInterval(() => {
      setState((s) => {
        if (!s.activeMission) return s;
        const remaining = Math.max(
          0,
          (s.activeMission.timeRemaining ?? 0) - 1,
        );
        return {
          ...s,
          activeMission: { ...s.activeMission, timeRemaining: remaining },
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeMission?.missionId]);

  const startMission = useCallback(
    async (missionId: MissionId, options?: { rerollStacks?: number; insured?: boolean }) => {
      await api<{ activeMission: ActiveMission }>("/missions/start", {
        method: "POST",
        body: JSON.stringify({ missionId, ...options }),
      });
      await refresh();
    },
    [refresh],
  );

  const claimMission = useCallback(async () => {
    const result = await api<MissionClaimResponse>("/missions/claim", {
      method: "POST",
    });
    setState((s) => ({ ...s, lastClaimResult: result }));
    await refresh();
    return result;
  }, [refresh]);

  const upgradeTrack = useCallback(async (track: GearTrack) => {
    await api(`/upgrades/${track}`, { method: "POST" });
    await refresh();
  }, [refresh]);

  const clearClaimResult = useCallback(() => {
    setState((s) => ({ ...s, lastClaimResult: null }));
  }, []);

  const startRun = useCallback(
    async (classId: ClassId, signature?: string) => {
      await api("/runs/start", {
        method: "POST",
        body: JSON.stringify({ classId, signature }),
      });
      await refresh();
    },
    [refresh],
  );

  return {
    ...state,
    startMission,
    claimMission,
    upgradeTrack,
    refresh,
    clearClaimResult,
    startRun,
  };
}
