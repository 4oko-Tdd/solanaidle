import { useGameState } from "@/hooks/useGameState";
import { CharacterCard } from "./CharacterCard";
import { ClassPicker } from "./ClassPicker";
import { MissionPanel } from "./MissionPanel";
import { MissionTimer } from "./MissionTimer";
import { UpgradePanel } from "./UpgradePanel";

import { BossFight } from "./BossFight";
import { PermanentCollection } from "./PermanentCollection";
import { PerkPicker } from "./PerkPicker";
import { GuildPanel } from "@/features/guild/GuildPanel";
import { RaidPanel } from "@/features/guild/RaidPanel";
import { MissionResultDialog } from "./MissionResultDialog";
import { RunLog } from "./RunLog";
import { RunEndScreen } from "./RunEndScreen";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { DailyLoginModal } from "./DailyLoginModal";
import { api } from "@/lib/api";
import type { DailyLoginStatus, ClassId } from "@solanaidle/shared";
import { useWalletSign } from "@/hooks/useWalletSign";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import {
  Swords,
  Users,
  Trophy,
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  Wrench,
  Skull,
  Crown,
  Heart,
  ShieldCheck,
  Clock,
  Radio,
} from "lucide-react";
import { ClassIcon } from "@/components/ClassIcon";
import magicblockLogo from "@/assets/icons/MagicBlock-Logo-Black.png";
import { InventoryPanel } from "@/features/inventory/InventoryPanel";
import { TrophyCase } from "./TrophyCase";
import { QuestPanel } from "./QuestPanel";
import { useState, useEffect } from "react";
import type { Inventory } from "@solanaidle/shared";

const CLASS_NAMES: Record<ClassId, string> = {
  scout: "Validator",
  guardian: "Staker",
  mystic: "Oracle",
};

const CLASS_STYLES: Record<ClassId, { text: string; border: string; gradient: string; glow: string }> = {
  scout: { text: "text-neon-amber", border: "border-neon-amber/40", gradient: "from-neon-amber via-neon-green to-neon-amber", glow: "shadow-[0_0_30px_rgba(255,184,0,0.12)]" },
  guardian: { text: "text-neon-cyan", border: "border-neon-cyan/40", gradient: "from-neon-cyan via-neon-green to-neon-cyan", glow: "shadow-[0_0_30px_rgba(0,212,255,0.12)]" },
  mystic: { text: "text-neon-purple", border: "border-neon-purple/40", gradient: "from-neon-purple via-neon-green to-neon-purple", glow: "shadow-[0_0_30px_rgba(153,69,255,0.12)]" },
};

function getWeekNumber(weekStart: string): number {
  const d = new Date(weekStart);
  const s = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((d.getTime() - s.getTime()) / 604800000 + 1);
}

function getGrade(score: number, missions: number, bossDefeated: boolean): { letter: string; color: string } {
  if (bossDefeated && score >= 500) return { letter: "S", color: "text-neon-purple" };
  if (bossDefeated || score >= 400) return { letter: "A", color: "text-neon-amber" };
  if (score >= 200 && missions >= 10) return { letter: "B", color: "text-neon-green" };
  if (score >= 100) return { letter: "C", color: "text-neon-cyan" };
  return { letter: "D", color: "text-muted-foreground" };
}

type Tab = "game" | "intel" | "inventory" | "boss" | "guild" | "ranks";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "game", label: "Game", icon: <Swords className="h-5 w-5" /> },
  { id: "intel", label: "Intel", icon: <Radio className="h-5 w-5" /> },
  { id: "inventory", label: "Inventory", icon: <Package className="h-5 w-5" /> },
  { id: "boss", label: "Boss", icon: <Skull className="h-5 w-5" /> },
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
  const [devOpen, setDevOpen] = useState(false);
  const [devLootItem, setDevLootItem] = useState("ram_stick");
  const [devLootQty, setDevLootQty] = useState(1);
  const [devLootAdding, setDevLootAdding] = useState(false);

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

  // Finalized epoch state — used inside tabs below
  const isEpochFinalized = !activeRun && endedRun && endedRun.endSignature;

  if (!activeRun && !isEpochFinalized && classes.length > 0) {
    return <ClassPicker classes={classes} onSelect={startRun} signMessage={signMessage} />;
  }

  // Precompute epoch style vars if finalized
  const epochStyle = endedRun ? (CLASS_STYLES[endedRun.classId] ?? CLASS_STYLES.scout) : null;
  const epochWeekNum = endedRun ? getWeekNumber(endedRun.weekStart) : 0;
  const epochGrade = endedRun ? getGrade(endedRun.score, endedRun.missionsCompleted, endedRun.bossDefeated) : null;

  const activeMissionDef = activeMission
    ? missions.find((m) => m.id === activeMission.missionId)
    : undefined;

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto w-full max-w-md space-y-4 p-4">
          {activeTab === "game" && import.meta.env.DEV && (
            <div className="mb-2">
              <button
                onClick={() => setDevOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Wrench className="h-3 w-3" />
                Dev
                {devOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {devOpen && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {/* Always available */}
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => {
                    await api("/dev/add-resources", { method: "POST" });
                    addToast("+Resources", "success");
                    await refresh();
                  }}>+Resources</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => {
                    const res = await api<{ message: string }>("/dev/add-xp", { method: "POST" });
                    addToast(res.message, "success");
                    await refresh();
                  }}>+XP</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => {
                    const res = await api<{ message: string }>("/dev/reset-quests", { method: "POST" });
                    addToast(res.message, "success");
                    await refresh();
                  }}>Reset Quests</Button>

                  {/* Active run only */}
                  {activeRun && (
                    <>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={async () => {
                        await api("/dev/skip-timer", { method: "POST" });
                        addToast("Timer skipped", "success");
                        await refresh();
                      }}>Skip Timer</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-neon-red" onClick={async () => {
                        await api<{ message: string }>("/dev/end-epoch", { method: "POST" });
                        addToast("Epoch ended", "warning");
                        await refresh();
                      }}>End Epoch</Button>
                    </>
                  )}

                  {/* Finalized / no active run */}
                  {!activeRun && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-neon-green" onClick={async () => {
                      const res = await api<{ message: string }>("/dev/reset-epoch", { method: "POST" });
                      addToast(res.message, "success");
                      await refresh();
                    }}>New Epoch</Button>
                  )}

                  {/* Danger zone */}
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-neon-red/60" onClick={async () => {
                    if (!confirm("Wipe all player data?")) return;
                    const res = await api<{ message: string }>("/dev/reset-player", { method: "POST" });
                    addToast(res.message, "warning");
                    window.location.reload();
                  }}>Reset Player</Button>

                  {/* Loot adder */}
                  <div className="flex items-center gap-1.5 mt-1.5 w-full flex-wrap">
                    <select
                      value={devLootItem}
                      onChange={(e) => setDevLootItem(e.target.value)}
                      className="h-6 text-[10px] rounded border border-white/20 bg-white/5 text-foreground px-2"
                    >
                      <option value="ram_stick">RAM Stick</option>
                      <option value="lan_cable">LAN Cable</option>
                      <option value="nvme_fragment">NVMe Fragment</option>
                      <option value="cooling_fan">Cooling Fan</option>
                      <option value="validator_key_shard">Validator Key Shard</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={devLootQty}
                      onChange={(e) => setDevLootQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
                      className="h-6 w-12 text-[10px] rounded border border-white/20 bg-white/5 text-foreground px-1 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      disabled={devLootAdding}
                      onClick={async () => {
                        setDevLootAdding(true);
                        try {
                          const res = await api<{ message: string }>("/dev/add-loot", {
                            method: "POST",
                            body: JSON.stringify({ itemId: devLootItem, quantity: devLootQty }),
                          });
                          addToast(res.message, "success");
                          await refresh();
                        } catch {
                          addToast("Add loot failed", "error");
                        } finally {
                          setDevLootAdding(false);
                        }
                      }}
                    >
                      {devLootAdding ? "…" : "Add Loot"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "game" && isEpochFinalized && endedRun && epochStyle && epochGrade && (
            <div className="animate-tab-in space-y-3">
              {/* Hero — compact: avatar + info left, score right */}
              <div className={`relative rounded-2xl border border-white/[0.08] bg-[#0d1525] overflow-hidden ${epochStyle.glow}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${epochStyle.gradient}`} />

                <div className="flex items-center p-4 gap-4">
                  {/* Avatar with grade */}
                  <div className="relative shrink-0">
                    <div className={`rounded-full border-2 ${epochStyle.border} bg-[#111d30] p-1`}>
                      <ClassIcon classId={endedRun.classId} className="h-14 w-14 rounded-full" />
                    </div>
                    <div className={`absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#0d1525] border-2 ${epochStyle.border} flex items-center justify-center`}>
                      <span className={`text-[10px] font-display font-bold ${epochGrade.color}`}>{epochGrade.letter}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Trophy className="h-3 w-3 text-neon-amber shrink-0" />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Epoch {epochWeekNum}</span>
                    </div>
                    <span className={`text-sm font-display font-semibold ${epochStyle.text}`}>
                      {CLASS_NAMES[endedRun.classId]}
                    </span>
                  </div>

                  {/* Score — right aligned */}
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-display font-bold text-neon-green leading-none">{endedRun.score}</div>
                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5 uppercase tracking-wider">Score</p>
                  </div>
                </div>
              </div>

              {/* Stats — 4 column compact */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: <Swords className="h-3.5 w-3.5 text-neon-green" />, value: endedRun.missionsCompleted, label: "Missions", color: "text-neon-green" },
                  { icon: <Skull className="h-3.5 w-3.5 text-neon-red" />, value: 3 - endedRun.livesRemaining, label: "Deaths", color: "text-neon-red" },
                  { icon: <Crown className="h-3.5 w-3.5 text-neon-amber" />, value: endedRun.bossDefeated ? "Yes" : "—", label: "Boss", color: endedRun.bossDefeated ? "text-neon-amber" : "text-muted-foreground" },
                  { icon: <Heart className="h-3.5 w-3.5 text-neon-cyan" />, value: endedRun.livesRemaining, label: "Lives", color: "text-neon-cyan" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-[#0d1525] py-2 px-1.5 text-center">
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <div className={`font-bold text-sm font-mono leading-none ${stat.color}`}>{stat.value}</div>
                    <div className="text-[8px] text-muted-foreground font-mono uppercase mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* What carries over */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d1525] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-neon-green shrink-0" />
                  <div>
                    <h3 className="text-sm font-display font-semibold text-white leading-none">Waiting for Next Epoch</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Score sealed. New epoch starts next week.</p>
                  </div>
                </div>

                <div className="rounded-lg bg-[#111d30] p-3 space-y-2">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">What carries over</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {[
                      { keeps: true, text: "Permanent Boss Loot" },
                      { keeps: true, text: "Achievement Badges" },
                      { keeps: true, text: "Inventory Capacity" },
                      { keeps: false, text: "Level resets to 1" },
                      { keeps: false, text: "Resources reset to 0" },
                      { keeps: false, text: "Upgrades & Perks reset" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${item.keeps ? "bg-neon-green" : "bg-neon-red/60"}`} />
                        <span className={`text-[11px] ${item.keeps ? "text-foreground/80" : "text-muted-foreground"}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* On-chain badge */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <ShieldCheck className="h-3 w-3 text-neon-cyan/50" />
                <span className="text-[10px] text-muted-foreground/50">Sealed on-chain via</span>
                <img src={magicblockLogo} alt="MagicBlock" className="h-3 invert opacity-35" />
              </div>
            </div>
          )}

          {activeTab === "game" && !isEpochFinalized && (
            <div className="animate-tab-in space-y-4">
              <CharacterCard
                character={character}
                classId={activeRun?.classId}
                livesRemaining={activeRun?.livesRemaining}
                run={activeRun}
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
                  bossDefeated={activeRun?.bossDefeated}
                />
              )}

              {activeRun && (
                <RunLog runId={activeRun.id} weekStart={activeRun.weekStart} />
              )}
            </div>
          )}

          {activeTab === "boss" && (
            <div className="animate-tab-in space-y-4">
              <BossFight />
              {upgradeInfo && (
                <UpgradePanel upgradeInfo={upgradeInfo} onUpgrade={upgradeTrack} />
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

          {activeTab === "intel" && (
            <div className="animate-tab-in">
              <QuestPanel />
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="animate-tab-in space-y-4">
              {inventory && <InventoryPanel inventory={inventory} onRefresh={refresh} />}
              <PermanentCollection />
              <TrophyCase />
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a3a5c]/80 bg-[#0a1628]/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-all relative ${
                activeTab === tab.id
                  ? "text-[#14F195]"
                  : "text-[#4a7a9b] hover:text-[#7ab8d9]"
              }`}
            >
              <span className={`transition-all duration-200 ${activeTab === tab.id ? "scale-110 drop-shadow-[0_0_6px_rgba(20,241,149,0.4)]" : ""}`}>{tab.icon}</span>
              <span className={`font-medium ${activeTab === tab.id ? "text-[#14F195]" : ""}`}>{tab.label}</span>
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

      {activeRun && <PerkPicker />}
    </>
  );
}
