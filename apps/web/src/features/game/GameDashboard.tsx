import { useGameState } from "@/hooks/useGameState";
import { CharacterCard } from "./CharacterCard";
import { MissionPanel } from "./MissionPanel";
import { MissionTimer } from "./MissionTimer";
import { InventoryPanel } from "@/features/inventory/InventoryPanel";
import { UpgradePanel } from "./UpgradePanel";

interface Props {
  isAuthenticated: boolean;
}

export function GameDashboard({ isAuthenticated }: Props) {
  const {
    character,
    missions,
    activeMission,
    inventory,
    upgradeInfo,
    loading,
    error,
    startMission,
    claimMission,
    upgradeGear,
  } = useGameState(isAuthenticated);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!character) return null;

  const activeMissionDef = activeMission
    ? missions.find((m) => m.id === activeMission.missionId)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <CharacterCard character={character} />

      {activeMission ? (
        <MissionTimer
          activeMission={activeMission}
          missionDef={activeMissionDef}
          onClaim={claimMission}
        />
      ) : (
        <MissionPanel
          missions={missions}
          characterState={character.state}
          onStart={startMission}
        />
      )}

      {inventory && <InventoryPanel inventory={inventory} />}
      {upgradeInfo && (
        <UpgradePanel upgradeInfo={upgradeInfo} onUpgrade={upgradeGear} />
      )}
    </div>
  );
}
