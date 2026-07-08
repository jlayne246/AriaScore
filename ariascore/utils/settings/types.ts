export interface ReaderSettings {

    keepScreenAwake: boolean;

    autoHideControls: boolean;

    tapZones: boolean;

    pageAnimation:
        | "slide"
        | "fade"
        | "none";

    viewMode:
        | "single"
        | "double";

    performanceMode: boolean;

    gestureControls: boolean;

    // restoreLastPage: boolean;

    swipeNavigation: boolean;

    facialGestures: boolean;

    resumeLastPage: boolean;

    coverOffset: boolean;

    pageRenderQuality:
    | "standard"
    | "high"
    | "ultra";
}
