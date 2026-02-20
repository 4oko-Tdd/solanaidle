import * as SecureStore from "expo-secure-store";

// Custom cache for MWA authorization — persists wallet auth across app restarts
export const walletCache = {
  get: async () => {
    const val = await SecureStore.getItemAsync("mwa_auth");
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  },
  set: async (value: unknown) => {
    await SecureStore.setItemAsync("mwa_auth", JSON.stringify(value));
  },
  clear: async () => {
    await SecureStore.deleteItemAsync("mwa_auth");
  },
};
