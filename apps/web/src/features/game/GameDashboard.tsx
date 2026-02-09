import { useGameState } from "@/hooks/useGameState";
import { CharacterCard } from "./CharacterCard";
import { ClassPicker } from "./ClassPicker";
import { MissionPanel } from "./MissionPanel";
import { MissionTimer } from "./MissionTimer";
import { InventoryPanel } from "@/features/inventory/InventoryPanel";
import { UpgradePanel } from "./UpgradePanel";
import { MissionResultDialog } from "./MissionResultDialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

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
    lastClaimResult,
    activeRun,
    classes,
    startMission,
    claimMission,
    upgradeGear,
    refresh,
    clearClaimResult,
    startRun,
  } = useGameState(isAuthenticated);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading game data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!character) return null;

  // Show class picker if no active run this week
  if (!activeRun && classes.length > 0) {
    return <ClassPicker classes={classes} onSelect={startRun} />;
  }

  const activeMissionDef = activeMission
    ? missions.find((m) => m.id === activeMission.missionId)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 w-9"
          aria-label="Refresh game data"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <CharacterCard character={character} />

      {activeMission ? (
        <MissionTimer
          activeMission={activeMission}
          missionDef={activeMissionDef}
          onClaim={claimMission}
          onSkip={refresh}
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

      <MissionResultDialog
        result={lastClaimResult}
        onClose={clearClaimResult}
      />
    </div>
  );
}
