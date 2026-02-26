import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import type { ReactNode } from "react";
import Animated, { FadeInDown, FadeOutUp, Layout } from "react-native-reanimated";
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return () => { timeoutIds.current.forEach(clearTimeout); };
  }, []);

  const toast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => {
      if (t.length >= 4) return [...t.slice(1), { id, message, type }];
      return [...t, { id, message, type }];
    });
    const tid = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timeoutIds.current = timeoutIds.current.filter((t) => t !== tid);
    }, 3200);
    timeoutIds.current.push(tid);
  }, []);

  const tone = {
    success: {
      label: "Success",
      accent: "#14F195",
      icon: CircleCheck,
      iconBg: "rgba(20,241,149,0.14)",
      border: "rgba(20,241,149,0.28)",
      bg: "rgba(8, 26, 22, 0.96)",
    },
    error: {
      label: "Error",
      accent: "#FF3366",
      icon: CircleAlert,
      iconBg: "rgba(255,51,102,0.16)",
      border: "rgba(255,51,102,0.30)",
      bg: "rgba(34, 10, 18, 0.96)",
    },
    warning: {
      label: "Warning",
      accent: "#FFB800",
      icon: TriangleAlert,
      iconBg: "rgba(255,184,0,0.16)",
      border: "rgba(255,184,0,0.30)",
      bg: "rgba(34, 22, 8, 0.96)",
    },
    info: {
      label: "Info",
      accent: "#00d4ff",
      icon: CircleHelp,
      iconBg: "rgba(0,212,255,0.14)",
      border: "rgba(0,212,255,0.30)",
      bg: "rgba(8, 20, 34, 0.96)",
    },
  } as const;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 74,
          left: 16,
          right: 16,
          zIndex: 9999,
          gap: 8,
        }}
        pointerEvents="none"
      >
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(180)}
            layout={Layout.springify().damping(18).stiffness(220)}
            style={{
              backgroundColor: tone[t.type].bg,
              borderWidth: 1,
              borderColor: tone[t.type].border,
              paddingHorizontal: 10,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tone[t.type].iconBg,
              }}
            >
              {React.createElement(tone[t.type].icon, { size: 15, color: tone[t.type].accent, strokeWidth: 2 })}
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text
                style={{
                  color: tone[t.type].accent,
                  fontFamily: "Rajdhani_700Bold",
                  fontSize: 11,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                }}
              >
                {tone[t.type].label}
              </Text>
              <Text
                numberOfLines={2}
                style={{ color: "rgba(255,255,255,0.9)", fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 16 }}
              >
                {t.message}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
