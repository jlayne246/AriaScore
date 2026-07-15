export const TAP_ZONE_RATIO = {
  portrait: 0.12,
  landscape: 0.20,
  performance: 0.25,
} as const;

export type TapAction =
  | "previous"
  | "next"
  | "toggleChrome"
  | "none";

export const getTapZoneRatio = ({
  isLandscape,
  isPerformanceMode,
}: {
  isLandscape: boolean;
  isPerformanceMode: boolean;
}) => {
  if (isPerformanceMode) {
    return TAP_ZONE_RATIO.performance;
  }

  return isLandscape
    ? TAP_ZONE_RATIO.landscape
    : TAP_ZONE_RATIO.portrait;
};

export const resolveTapAction = (
  x: number,
  width: number,
  zoneRatio: number,
  isPerformanceMode: boolean,
): TapAction => {
  const edgeWidth = width * zoneRatio;

  if (x <= edgeWidth) {
    return "previous";
  }

  if (x >= width - edgeWidth) {
    return "next";
  }

  return isPerformanceMode
    ? "none"
    : "toggleChrome";
};