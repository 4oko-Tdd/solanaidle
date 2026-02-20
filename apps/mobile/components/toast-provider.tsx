import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { timeoutIds.current.forEach(clearTimeout); };
  }, []);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (toasts.length >= 5) return;
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    const tid = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timeoutIds.current = timeoutIds.current.filter((t) => t !== tid);
    }, 3000);
    timeoutIds.current.push(tid);
  }, [toasts.length]);

  const typeColors = { success: "#00ff87", error: "#ff4444", info: "#00d4ff" };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          left: 16,
          right: 16,
          zIndex: 9999,
          gap: 8,
        }}
        pointerEvents="none"
      >
        {toasts.map((t) => (
          <View
            key={t.id}
            style={{
              backgroundColor: "#111111",
              borderWidth: 1,
              borderColor: typeColors[t.type],
              padding: 12,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: typeColors[t.type], fontFamily: "SpaceMono-Regular", fontSize: 13 }}>
              {t.message}
            </Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
