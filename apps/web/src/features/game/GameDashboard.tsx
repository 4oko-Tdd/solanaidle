import { useGameState } from "@/hooks/useGameState";
import { CharacterCard } from "./CharacterCard";
import { ClassPicker } from "./ClassPicker";
import { MissionPanel } from "./MissionPanel";
import { MissionTimer } from "./MissionTimer";
import { UpgradePanel } from "./UpgradePanel";
import { RunStatus } from "./RunStatus";
import { SkillTree } from "./SkillTree";
import { GuildPanel } from "@/features/guild/GuildPanel";
import { RaidPanel } from "@/features/guild/RaidPanel";
import { MissionResultDialog } from "./MissionResultDialog";
import { RunLog } from "./RunLog";
import { RunEndScreen } from "./RunEndScreen";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { DailyLoginModal } from "./DailyLoginModal";
import { api } from "@/lib/api";
import type { DailyLoginStatus } from "@solanaidle/shared";
import { useWalletSign } from "@/hooks/useWalletSign";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import {
  Swords,
  Sparkles,
  Users,
  Trophy,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Inventory } from "@solanaidle/shared";

type Tab = "game" | "skills" | "guild" | "ranks";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "game", label: "Game", icon: <Swords className="h-5 w-5" /> },
  { id: "skills", label: "Skills", icon: <Sparkles className="h-5 w-5" /> },
  { id: "guild", label: "Guild", icon: <Users className="h-5 w-5" /> },
  { id: "ranks", label: "Ranks", icon: <Trophy className="h-5 w-5" /> },
];

interface Props {
  isAuthenticated: boolean;
  onInventoryChange?: (inventory: Inventory | null) => void;
}

export function GameDashboard({ isAuthenticated, onInventoryChange }: Props) {
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
    upgradeTrack,
    refresh,
    clearClaimResult,
    startRun,
  } = useGameState(isAuthenticated);

  const { signMessage } = useWalletSign();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("game");
  const [dailyStatus, setDailyStatus] = useState<DailyLoginStatus | null>(null);
  const [showDailyModal, setShowDailyModal] = useState(false);

  useEffect(() => {
    onInventoryChange?.(inventory);
  }, [inventory, onInventoryChange]);

  useEffect(() => {
    if (!activeRun) return;
    const fetchDaily = async () => {
      try {
        const status = await api<DailyLoginStatus>("/daily/status");
        setDailyStatus(status);
        if (!status.claimedToday) {
          setShowDailyModal(true);
        }
      } catch { /* ignore */ }
    };
    fetchDaily();
  }, [activeRun?.id]);

  const handleDailyClaim = async () => {
    await api("/daily/claim", { method: "POST" });
    addToast("Daily bonus claimed!", "success");
    setShowDailyModal(false);
    await refresh();
  };

  useEffect(() => {
    if (!lastClaimResult) return;
    if (lastClaimResult.result === "success" && lastClaimResult.rewards) {
      const r = lastClaimResult.rewards;
      addToast(`+${r.scrap} Lamports${r.crystal ? `, +${r.crystal} Tokens` : ""}${r.artifact ? `, +${r.artifact} Keys` : ""}`, "success");
      if (r.streakMultiplier && r.streakMultiplier > 1) {
        addToast(`${r.streakMultiplier}x Streak Bonus!`, "warning");
      }
    } else if (lastClaimResult.result === "failure") {
      addToast("Transaction Failed!", "error");
    }
  }, [lastClaimResult, addToast]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-neon-purple" />
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

  // Show RunEndScreen first (seal score before starting new run)
  if (!activeRun && endedRun && !endedRun.endSignature) {
    return <RunEndScreen run={endedRun} signMessage={signMessage} onFinalized={refresh} />;
  }

  // Already finalized this week — show completed summary
  if (!activeRun && endedRun && endedRun.endSignature) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-4 animate-fade-in-up">
        <div className="text-center space-y-3">
          <Trophy className="h-16 w-16 text-neon-amber mx-auto" />
          <h2 className="text-3xl font-display text-gradient">Epoch Complete</h2>
          <p className="text-sm text-muted-foreground">
            Epoch {(() => {
              const d = new Date(endedRun.weekStart);
              const s = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
              return Math.ceil((d.getTime() - s.getTime()) / 604800000 + 1);
            })()} finalized. Come back next week for a new epoch.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-4">
          <div className="grid grid-cols-2 gap-3 text-center text-sm">
            <div className="bg-white/[0.04] rounded-lg p-2">
              <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Score</div>
              <div className="font-bold text-lg font-mono text-neon-green">{endedRun.score}</div>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-2">
              <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Missions</div>
              <div className="font-bold text-lg font-mono text-neon-green">{endedRun.missionsCompleted}</div>
            </div>
          </div>
        </div>
        <LeaderboardPanel />
      </div>
    );
  }

  if (!activeRun && classes.length > 0) {
    return <ClassPicker classes={classes} onSelect={startRun} signMessage={signMessage} />;
  }

  const activeMissionDef = activeMission
    ? missions.find((m) => m.id === activeMission.missionId)
    : undefined;

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto w-full max-w-md space-y-4 p-4">
          {activeTab === "game" && (
            <div className="animate-tab-in space-y-4">
              {activeRun && <RunStatus run={activeRun} characterState={character.state} />}

              <CharacterCard
                character={character}
                classId={activeRun?.classId}
                livesRemaining={activeRun?.livesRemaining}
                armorLevel={activeRun?.armorLevel}
                engineLevel={activeRun?.engineLevel}
                scannerLevel={activeRun?.scannerLevel}
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
                  inventory={inventory}
                />
              )}

              {activeRun && (
                <RunLog runId={activeRun.id} weekStart={activeRun.weekStart} />
              )}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="animate-tab-in space-y-4">
              {activeRun && <SkillTree onUpdate={refresh} />}
              {upgradeInfo && (
                <UpgradePanel upgradeInfo={upgradeInfo} onUpgrade={upgradeTrack} />
              )}
              {!activeRun && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Start an epoch to unlock skills.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "guild" && (
            <div className="animate-tab-in space-y-4">
              <GuildPanel />
              <RaidPanel />
            </div>
          )}

          {activeTab === "ranks" && <div className="animate-tab-in"><LeaderboardPanel /></div>}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-all relative ${
                activeTab === tab.id
                  ? "text-neon-green"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="transition-transform duration-150">{tab.icon}</span>
              <span>{tab.label}</span>
              <div className={`absolute -bottom-px left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-full transition-all duration-200 ${
                activeTab === tab.id ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              }`} />
            </button>
          ))}
        </div>
      </nav>

      <MissionResultDialog
        result={lastClaimResult}
        onClose={clearClaimResult}
        livesRemaining={activeRun?.livesRemaining}
      />

      {dailyStatus && (
        <DailyLoginModal
          status={dailyStatus}
          open={showDailyModal}
          onClaim={handleDailyClaim}
          onClose={() => setShowDailyModal(false)}
        />
      )}
    </>
  );
}
