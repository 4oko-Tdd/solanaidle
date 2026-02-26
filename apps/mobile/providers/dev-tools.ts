import { useSyncExternalStore } from "react";

let devToolsEnabled = false;
let nodeTabTapCount = 0;
let tapResetTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return devToolsEnabled;
}

export function useDevToolsEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function registerNodeTabTap(): boolean {
  if (!__DEV__) return false;

  nodeTabTapCount += 1;
  if (tapResetTimer) clearTimeout(tapResetTimer);
  tapResetTimer = setTimeout(() => {
    nodeTabTapCount = 0;
  }, 1200);

  if (nodeTabTapCount >= 5) {
    nodeTabTapCount = 0;
    devToolsEnabled = !devToolsEnabled;
    emitChange();
    return true;
  }

  return false;
}
