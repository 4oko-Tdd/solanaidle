import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import type { ActiveMission, MissionId } from "@solanaidle/shared";

interface GameNotificationsNativeModule {
  ensureChannel: () => Promise<void>;
  showNotification: (title: string, message: string, eventKey: string) => Promise<boolean>;
  scheduleNotification: (
    title: string,
    message: string,
    triggerAtMillis: number,
    eventKey: string
  ) => Promise<boolean>;
  cancelScheduledNotification: (eventKey: string) => Promise<boolean>;
}

const moduleRef = NativeModules.GameNotifications as GameNotificationsNativeModule | undefined;
const MISSION_READY_KEY = "mission_ready";
let initialized = false;

const MISSION_LABELS: Record<MissionId, string> = {
  scout: "Scout",
  expedition: "Expedition",
  deep_dive: "Deep Dive",
  boss: "Whale Hunt",
};

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS !== "android" || !moduleRef) return false;
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  return true;
}

export async function initGameNotifications(): Promise<boolean> {
  if (Platform.OS !== "android" || !moduleRef) return false;
  if (initialized) return true;
  try {
    const permitted = await ensurePermission();
    if (!permitted) return false;
    await moduleRef.ensureChannel();
    initialized = true;
    return true;
  } catch (error) {
    console.warn("[notifications] init failed", error);
    return false;
  }
}

export async function scheduleMissionReadyNotification(
  mission: ActiveMission | null
): Promise<void> {
  const ready = await initGameNotifications();
  if (!ready || !moduleRef) return;

  try {
    if (!mission) {
      await moduleRef.cancelScheduledNotification(MISSION_READY_KEY);
      return;
    }

    const triggerAt = Date.parse(mission.endsAt);
    if (!Number.isFinite(triggerAt)) return;

    const missionLabel = MISSION_LABELS[mission.missionId] ?? "Mission";
    await moduleRef.scheduleNotification(
      "Mission complete",
      `${missionLabel} finished. Tap to claim your rewards.`,
      triggerAt,
      MISSION_READY_KEY
    );
  } catch (error) {
    console.warn("[notifications] mission schedule failed", error);
  }
}

export async function notifyBossStarted(
  bossId: string,
  bossName: string
): Promise<void> {
  const ready = await initGameNotifications();
  if (!ready || !moduleRef) return;

  try {
    await moduleRef.showNotification(
      "World boss active",
      `${bossName} is live. Rally up and enter the hunt.`,
      `boss_started_${bossId}`
    );
  } catch (error) {
    console.warn("[notifications] boss notify failed", error);
  }
}

export async function notifyEpochFinished(runId: string): Promise<void> {
  const ready = await initGameNotifications();
  if (!ready || !moduleRef) return;

  try {
    await moduleRef.showNotification(
      "Epoch finished",
      "Your run ended. Tap to finalize and seal your score.",
      `epoch_finished_${runId}`
    );
  } catch (error) {
    console.warn("[notifications] epoch finished notify failed", error);
  }
}

export async function notifyEpochStarted(epochKey: string): Promise<void> {
  const ready = await initGameNotifications();
  if (!ready || !moduleRef) return;

  try {
    await moduleRef.showNotification(
      "New epoch started",
      "Weekly reset is live. Pick a class and start your run.",
      `epoch_started_${epochKey}`
    );
  } catch (error) {
    console.warn("[notifications] epoch started notify failed", error);
  }
}

export async function scheduleSurgeNotifications(
  surgeWindows: { startsAt: number }[]
): Promise<void> {
  const ready = await initGameNotifications();
  if (!ready || !moduleRef) return;
  for (const [i, w] of surgeWindows.entries()) {
    const notifyAt = w.startsAt - 10 * 60 * 1000;
    if (notifyAt <= Date.now()) continue;
    try {
      await moduleRef.scheduleNotification(
        "Surge Window Opening Soon",
        "Leviathan becomes vulnerable in 10 minutes. Prepare your OVERLOAD.",
        notifyAt,
        `surge_window_${i}`
      );
    } catch { /* silent */ }
  }
}
