
import React, { useMemo, useState } from "react";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { MenuOption } from "react-native-popup-menu";


import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

export type JumpToPageSelection = {
  type: "go-to-page";
  page: number;
};

interface ReaderJumpToPageProps {

  currentPage: number;
  totalPages: number;

  minimumPage: number;
  maximumPage: number;
}

const ReaderJumpToPage = ({
  currentPage,
  totalPages,
  minimumPage,
  maximumPage,
}: ReaderJumpToPageProps) => {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [pageInput, setPageInput] =
    useState(String(currentPage));

  const targetPage = Number(pageInput);

  const isValid =
    /^\d+$/.test(pageInput) &&
    Number.isSafeInteger(targetPage) &&
    targetPage >= minimumPage &&
    targetPage <= maximumPage;

  const isExcerpt =
    minimumPage > 1 ||
    maximumPage < totalPages;

  return (
    <View style={styles.container}>

      {/* CURRENT PAGE */}

      <Text style={styles.currentPage}>
        Current page: {currentPage} of {totalPages}
      </Text>

      {/* PAGE INPUT */}

      <View style={styles.inputRow}>
        <TextInput
          cursorColor={colors.accent}
          selectionColor={colors.accent}
          style={[
            styles.pageInput,
            pageInput.length > 0 &&
              !isValid &&
              styles.invalidInput,
          ]}
          value={pageInput}
          onChangeText={(value) =>
            setPageInput(
              value.replace(/[^0-9]/g, "")
            )
          }
          keyboardType="number-pad"
          placeholder="Page number"
          placeholderTextColor={colors.tertiaryText}
          selectTextOnFocus
          accessibilityLabel="Page number"
        />

        <Text style={styles.totalPages}>
          / {totalPages}
        </Text>

        <MenuOption
          value={{
            type: "go-to-page",
            page: targetPage,
          } satisfies JumpToPageSelection}
          disabled={!isValid}
          customStyles={{
            optionWrapper: {
              padding: 0,
            },
          }}
        >
          <View
            style={[
              styles.goButton,
              {
                backgroundColor: colors.accent,
                opacity: isValid ? 1 : 0.45,
              },
            ]}
          >
            <Text style={styles.goLabel}>
              Go
            </Text>
          </View>
        </MenuOption>
      </View>

      <Text
        style={[
          styles.rangeLabel,
          pageInput.length > 0 &&
            !isValid && {
              color: colors.danger,
            },
        ]}
      >
        Enter a page between {minimumPage} and{" "}
        {maximumPage}.
      </Text>

      {/* EXCERPT NOTICE */}

      {isExcerpt && (
        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.secondaryText}
          />

          <Text style={styles.noticeText}>
            Navigation is restricted to the
            current setlist excerpt.
          </Text>
        </View>
      )}

      {/* FIRST / LAST PAGE */}

      <View style={styles.shortcutRow}>
        <MenuOption
          value={{
            type: "go-to-page",
            page: minimumPage,
          } satisfies JumpToPageSelection}
          disabled={currentPage === minimumPage}
          customStyles={{
            optionWrapper: {
              flex: 1,
              padding: 0,
            },
          }}
        >
          <View
            style={[
              styles.shortcutButton,
              currentPage === minimumPage && {
                opacity: 0.45,
              },
            ]}
          >
            <Ionicons
              name="play-skip-back-outline"
              size={18}
              color={colors.accent}
            />

            <View>
              <Text style={styles.shortcutLabel}>
                First page
              </Text>

              <Text style={styles.shortcutSubtitle}>
                Page {minimumPage}
              </Text>
            </View>
          </View>
        </MenuOption>

        <MenuOption
          value={{
            type: "go-to-page",
            page: maximumPage,
          } satisfies JumpToPageSelection}
          disabled={currentPage === maximumPage}
          customStyles={{
            optionWrapper: {
              flex: 1,
              padding: 0,
            },
          }}
        >
          <View
            style={[
              styles.shortcutButton,
              currentPage === maximumPage && {
                opacity: 0.45,
              },
            ]}
          >
            <View>
              <Text style={styles.shortcutLabel}>
                Last page
              </Text>

              <Text style={styles.shortcutSubtitle}>
                Page {maximumPage}
              </Text>
            </View>

            <Ionicons
              name="play-skip-forward-outline"
              size={18}
              color={colors.accent}
            />
          </View>
        </MenuOption>
      </View>

      <View style={styles.divider} />

      {/* THUMBNAIL BROWSER */}

      <MenuOption
        value="jump"
        customStyles={{
          optionWrapper: {
            padding: 0,
          },
        }}
      >
        <View style={styles.browseRow}>
          <Ionicons
            name="grid-outline"
            size={24}
            color={colors.accent}
          />

          <View style={styles.details}>
            <Text style={styles.browseLabel}>
              Browse Pages
            </Text>

            <Text style={styles.shortcutSubtitle}>
              View page thumbnails
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.tertiaryText}
          />
        </View>
      </MenuOption>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingTop: 14,
    gap: 10,
  },

  currentPage: {
    fontSize: 13,
    color: colors.secondaryText,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  pageInput: {
    flex: 1,
    minWidth: 0,
    height: 44,

    backgroundColor: colors.surfaceSecondary,

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,

    paddingHorizontal: 12,

    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },

  invalidInput: {
    borderColor: colors.danger,
  },

  totalPages: {
    fontSize: 15,
    color: colors.secondaryText,
    fontVariant: ["tabular-nums"],
  },

  goButton: {
    minWidth: 60,
    height: 44,
    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",
  },

  goLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onAccent,
  },

  rangeLabel: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",

    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,

    padding: 8,
    gap: 6,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.secondaryText,
  },

  shortcutRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  shortcutButton: {
    minHeight: 56,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,

    paddingHorizontal: 8,
    paddingVertical: 10,

    gap: 8,
  },

  shortcutLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondaryText,
  },

  shortcutSubtitle: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: colors.surfaceSecondary,
    marginVertical: 4,
  },

  browseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 10,
    borderRadius: 8,
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  browseLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
});

export default ReaderJumpToPage;
