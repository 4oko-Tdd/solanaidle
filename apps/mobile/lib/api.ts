import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Synchronous read — same ergonomics as localStorage
let authToken: string | null = SecureStore.getItem("auth_token");

export function setAuthToken(token: string) {
  authToken = token;
  void SecureStore.setItemAsync("auth_token", token);
}

export function clearAuthToken() {
  authToken = null;
  void SecureStore.deleteItemAsync("auth_token");
}

export function getAuthToken() {
  return authToken;
}

function inferDevHostFromExpoConfig(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host) return null;
  return host;
}

function resolveApiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const devHost = inferDevHostFromExpoConfig();

  // 10.0.2.2 only works on Android emulator.
  if (configured?.includes("10.0.2.2") && devHost && !devHost.startsWith("10.0.2.2")) {
    return configured.replace("10.0.2.2", devHost);
  }

  return configured ?? (devHost ? `http://${devHost}:3000/api` : "http://localhost:3000/api");
}

export const API_BASE = resolveApiBase();

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "UNKNOWN", message: res.statusText }));
    throw err;
  }
  return res.json();
}
