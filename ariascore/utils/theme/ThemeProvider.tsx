
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

import { useColorScheme } from "react-native";

import AsyncStorage from
  "@react-native-async-storage/async-storage";

import {
  ThemePreference,
  ResolvedTheme,
  ThemeColors,
} from "./types";

import {
  lightColors,
  darkColors,
} from "./colors";

const THEME_STORAGE_KEY =
  "@ariascore:theme-preference";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  colors: ThemeColors;
  themeReady: boolean;

  setPreference: (
    preference: ThemePreference
  ) => Promise<void>;
}

export const ThemeContext =
  createContext<ThemeContextValue | undefined>(
    undefined
  );

interface Props {
  children: ReactNode;
}

export default function ThemeProvider({
  children,
}: Props) {
  const systemColorScheme = useColorScheme();

  useEffect(() => {
  console.log(
    "System colour scheme:",
    systemColorScheme
  );
}, [systemColorScheme]);

  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");

  const [themeReady, setThemeReady] =
    useState(false);

  const pendingWrite =
    useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      try {
        const stored =
          await AsyncStorage.getItem(
            THEME_STORAGE_KEY
          );

        if (
          active &&
          (
            stored === "system" ||
            stored === "light" ||
            stored === "dark"
          )
        ) {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.error(
          "Unable to load theme preference:",
          error
        );
      } finally {
        if (active) {
          setThemeReady(true);
        }
      }
    };

    void loadPreference();

    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback(
    async (value: ThemePreference) => {
      setPreferenceState(value);

      // Serialise writes so rapid theme changes
      // are persisted in the correct order.
      const write = pendingWrite.current
        .catch(() => undefined)
        .then(() =>
          AsyncStorage.setItem(
            THEME_STORAGE_KEY,
            value
          )
        );

      pendingWrite.current = write;

      try {
        await write;
      } catch (error) {
        console.error(
          "Unable to save theme preference:",
          error
        );

        throw error;
      }
    },
    []
  );

  const resolvedTheme: ResolvedTheme =
    preference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const isDark = resolvedTheme === "dark";

  const colors = isDark
    ? darkColors
    : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      isDark,
      colors,
      themeReady,
      setPreference,
    }),
    [
      preference,
      resolvedTheme,
      isDark,
      colors,
      themeReady,
      setPreference,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
