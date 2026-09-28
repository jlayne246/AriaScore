export type BuildMode =
  | "development"
  | "preview"
  | "production";

const value = process.env.EXPO_PUBLIC_BUILD_MODE;

export const BUILD_MODE: BuildMode =
  value === "development" ||
  value === "preview" ||
  value === "production"
    ? value
    : "production";

export const IS_DEVELOPMENT_BUILD =
  BUILD_MODE === "development";

export const IS_PREVIEW_BUILD =
  BUILD_MODE === "preview";

export const IS_PRODUCTION_BUILD =
  BUILD_MODE === "production";

export const ENABLE_INTERNAL_FEATURES =
  !IS_PRODUCTION_BUILD;