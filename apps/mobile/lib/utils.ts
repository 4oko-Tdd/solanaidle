import { type ClassValue, clsx } from "clsx";

// NativeWind v4 uses static class extraction — conflicts resolved at build time.
// tailwind-merge is not needed (and has no effect on RN StyleSheets).
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
