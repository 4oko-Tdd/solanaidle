import { useGameState } from "@/hooks/useGameState";
import { CharacterCard } from "./CharacterCard";
import { ClassPicker } from "./ClassPicker";
import { MissionPanel } from "./MissionPanel";
import { MissionTimer } from "./MissionTimer";
import { InventoryPanel } from "@/features/inventory/InventoryPanel";
import { UpgradePanel } from "./UpgradePanel";
import { RunStatus } from "./RunStatus";
import { SkillTree } from "./SkillTree";
import { GuildPanel } from "@/features/guild/GuildPanel";
import { RaidPanel } from "@/features/guild/RaidPanel";
import { MissionResultDialog } from "./MissionResultDialog";
import { RunLog } from "./RunLog";
import { RunEndScreen } from "./RunEndScreen";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { useWalletSign } from "@/hooks/useWalletSign";
import { Button } from "@/components/ui/button";
import {
  Swords,
  Sparkles,
  Users,
  Trophy,
  Loader2,
} from "lucide-react";
import { useState } from "react";

type Tab = "game" | "skills" | "guild" | "ranks";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "game", label: "Game", icon: <Swords className="h-5 w-5" /> },
  { id: "skills", label: "Skills", icon: <Sparkles className="h-5 w-5" /> },
  { id: "guild", label: "Guild", icon: <Users className="h-5 w-5" /> },
  { id: "ranks", label: "Ranks", icon: <Trophy className="h-5 w-5" /> },
];

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
    endedRun,
    startMission,
    claimMission,
    upgradeGear,
    refresh,
    clearClaimResult,
    startRun,
  } = useGameState(isAuthenticated);

  const { signMessage } = useWalletSign();
  const [activeTab, setActiveTab] = useState<Tab>("game");

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
        <Button variant="outline" size="sm" onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!character) return null;

  if (!activeRun && classes.length > 0) {
    return <ClassPicker classes={classes} onSelect={startRun} signMessage={signMessage} />;
  }

  if (!activeRun && endedRun && !endedRun.endSignature) {
    return <RunEndScreen run={endedRun} signMessage={signMessage} onFinalized={refresh} />;
  }

  const activeMissionDef = activeMission
    ? missions.find((m) => m.id === activeMission.missionId)
    : undefined;

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto w-full max-w-md space-y-4 p-4">
          {activeTab === "game" && (
            <>
              {activeRun && <RunStatus run={activeRun} characterState={character.state} />}

              <CharacterCard
                character={character}
                classId={activeRun?.classId}
                livesRemaining={activeRun?.livesRemaining}
              />

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
                  characterLevel={character.level}
                  classId={activeRun?.classId}
                  livesRemaining={activeRun?.livesRemaining}
                />
              )}

              {activeRun && (
                <RunLog runId={activeRun.id} weekStart={activeRun.weekStart} />
              )}

              {inventory && <InventoryPanel inventory={inventory} />}
            </>
          )}

          {activeTab === "skills" && (
            <>
              {activeRun && <SkillTree onUpdate={refresh} />}
              {upgradeInfo && (
                <UpgradePanel upgradeInfo={upgradeInfo} onUpgrade={upgradeGear} />
              )}
              {!activeRun && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Start a weekly run to unlock skills.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "guild" && (
            <>
              <GuildPanel />
              <RaidPanel />
            </>
          )}

          {activeTab === "ranks" && <LeaderboardPanel />}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <MissionResultDialog
        result={lastClaimResult}
        onClose={clearClaimResult}
        livesRemaining={activeRun?.livesRemaining}
      />
    </>
  );
}
