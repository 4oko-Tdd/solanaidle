import * as SecureStore from "expo-secure-store";

// Synchronous read — same ergonomics as localStorage
let authToken: string | null = SecureStore.getItem("auth_token");

export function setAuthToken(token: string) {
  authToken = token;
  SecureStore.setItem("auth_token", token);
}

export function clearAuthToken() {
  authToken = null;
  SecureStore.deleteItem("auth_token");
}

export function getAuthToken() {
  return authToken;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

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
