import { ReaderSettings } from "./types";

export const DEFAULT_SETTINGS: ReaderSettings = {

    keepScreenAwake: true,

    autoHideControls: true,

    tapZones: true,

    pageAnimation: "slide",

    viewMode: "single",

    performanceMode: false,

    gestureControls: false,

    // restoreLastPage: true,

    swipeNavigation: true,

    facialGestures: false,

    resumeLastPage: true,

    coverOffset: false,

    pageRenderQuality: "high"
};