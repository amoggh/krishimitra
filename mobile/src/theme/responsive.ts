import { useEffect, useState } from "react";
import { Dimensions, ScaledSize, AccessibilityInfo } from "react-native";
import { breakpoints } from "./tokens";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  columns: number;
  contentMaxWidth: number;
  gutter: number;
}

export function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.desktop) {
    return "desktop";
  }
  if (width >= breakpoints.tablet) {
    return "tablet";
  }
  return "mobile";
}

export function computeResponsiveInfo(window: ScaledSize): ResponsiveInfo {
  const { width, height } = window;
  const breakpoint = getBreakpoint(width);
  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isTouch: isMobile || isTablet,
    columns: isDesktop ? 3 : isTablet ? 2 : 1,
    contentMaxWidth: breakpoints.desktopMax,
    gutter: isDesktop ? 24 : isTablet ? 20 : 16,
  };
}

/**
 * Hook providing live window dimensions and reactive breakpoint information.
 * Works seamlessly across Web, iOS, and Android.
 */
export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() =>
    computeResponsiveInfo(Dimensions.get("window"))
  );

  useEffect(() => {
    function handleChange({ window }: { window: ScaledSize }) {
      setInfo(computeResponsiveInfo(window));
    }

    const subscription = Dimensions.addEventListener("change", handleChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return info;
}

/**
 * Returns a value matching the current screen breakpoint.
 */
export function selectResponsive<T>(
  currentBreakpoint: Breakpoint,
  config: { mobile: T; tablet?: T; desktop?: T }
): T {
  if (currentBreakpoint === "desktop" && config.desktop !== undefined) {
    return config.desktop;
  }
  if (currentBreakpoint === "tablet" && config.tablet !== undefined) {
    return config.tablet;
  }
  return config.mobile;
}

/**
 * Hook to detect if the user has enabled reduced motion in their OS or browser.
 * Respects accessibility preferences across Android, iOS, and Web.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      listener?.remove?.();
    };
  }, []);

  return reduceMotion;
}

