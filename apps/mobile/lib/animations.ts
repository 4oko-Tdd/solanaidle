import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  type AnimatedStyle,
} from "react-native-reanimated";
import { useEffect } from "react";
import type { ViewStyle } from "react-native";

/**
 * Pulsing glow shadow — matches web `.animate-glow-pulse`.
 * @param rgb - RGB values as comma-separated string, e.g. "20, 241, 149"
 * @param active - whether the animation should run
 */
export function useGlowPulse(
  rgb: string,
  active = true,
  duration = 2000,
): AnimatedStyle<ViewStyle> {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [rgb, duration, active]);

  return useAnimatedStyle(() => {
    if (progress.value < 0.01) return {};
    const intensity = 15 + progress.value * 15;
    const alpha = 0.15 + progress.value * 0.25;
    const alphaOuter = 0.05 + progress.value * 0.1;
    return {
      boxShadow: `0 0 ${intensity}px rgba(${rgb}, ${alpha.toFixed(2)}), 0 0 ${intensity * 2}px rgba(${rgb}, ${alphaOuter.toFixed(2)})`,
    };
  }, [rgb]);
}

/**
 * Fade-in-up entrance animation — matches web `.animate-fade-in-up`.
 */
export function useFadeInUp(delay = 0, duration = 300): AnimatedStyle<ViewStyle> {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.ease) }));
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

/**
 * Simple opacity pulse — used for SLASHED badge, critical cards, LIVE dot, urgent text.
 */
export function usePulse(
  active = true,
  duration = 1500,
  minOpacity = 0.4,
): AnimatedStyle<ViewStyle> {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(minOpacity, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
    return () => cancelAnimation(opacity);
  }, [active, duration, minOpacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

/**
 * Shimmer sweep for gradient buttons — matches web `.btn-shimmer`.
 * Returns animated style that translates a highlight band across the element.
 */
export function useShimmer(active = true, width = 300, duration = 2000): AnimatedStyle<ViewStyle> {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    if (active) {
      translateX.value = -width;
      translateX.value = withRepeat(
        withTiming(width, { duration, easing: Easing.linear }),
        -1,
      );
    } else {
      cancelAnimation(translateX);
      translateX.value = -width;
    }
    return () => cancelAnimation(translateX);
  }, [active, duration, width]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
}
