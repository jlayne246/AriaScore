import { describe, test, expect } from "@jest/globals";
import {
  getSpreadCount,
  physicalPageToSpreadIndex,
  spreadIndexToVisiblePages,
  type ReaderPaginationOptions,
} from "../reader/readerPagination";

describe("getSpreadCount", () => {
  test.each([
    {
      description: "returns zero for an empty document",
      options: {
        displayMode: "single",
        coverOffset: false,
        totalPages: 0,
      },
      expected: 0,
    },
    {
      description: "returns one spread per page in single mode",
      options: {
        displayMode: "single",
        coverOffset: false,
        totalPages: 5,
      },
      expected: 5,
    },
    {
      description: "groups pages into pairs without a cover offset",
      options: {
        displayMode: "double",
        coverOffset: false,
        totalPages: 6,
      },
      expected: 3,
    },
    {
      description: "allows a final unpaired page",
      options: {
        displayMode: "double",
        coverOffset: false,
        totalPages: 5,
      },
      expected: 3,
    },
    {
      description: "creates a separate cover spread",
      options: {
        displayMode: "double",
        coverOffset: true,
        totalPages: 6,
      },
      expected: 4,
    },
    {
      description: "handles an odd number of pages with a cover offset",
      options: {
        displayMode: "double",
        coverOffset: true,
        totalPages: 5,
      },
      expected: 3,
    },
  ] satisfies Array<{
    description: string;
    options: ReaderPaginationOptions;
    expected: number;
  }>)("$description", ({ options, expected }) => {
    expect(getSpreadCount(options)).toBe(expected);
  });
});

describe("physicalPageToSpreadIndex", () => {
  describe("single-page mode", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "single",
      coverOffset: false,
      totalPages: 5,
    };

    test.each([
      { page: 1, expected: 0 },
      { page: 2, expected: 1 },
      { page: 3, expected: 2 },
      { page: 4, expected: 3 },
      { page: 5, expected: 4 },
    ])("maps page $page to index $expected", ({ page, expected }) => {
      expect(
        physicalPageToSpreadIndex(page, options),
      ).toBe(expected);
    });
  });

  describe("double-page mode without cover offset", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "double",
      coverOffset: false,
      totalPages: 6,
    };

    test.each([
      { page: 1, expected: 0 },
      { page: 2, expected: 0 },
      { page: 3, expected: 1 },
      { page: 4, expected: 1 },
      { page: 5, expected: 2 },
      { page: 6, expected: 2 },
    ])("maps page $page to spread $expected", ({ page, expected }) => {
      expect(
        physicalPageToSpreadIndex(page, options),
      ).toBe(expected);
    });
  });

  describe("double-page mode with cover offset", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "double",
      coverOffset: true,
      totalPages: 6,
    };

    test.each([
      { page: 1, expected: 0 },
      { page: 2, expected: 1 },
      { page: 3, expected: 1 },
      { page: 4, expected: 2 },
      { page: 5, expected: 2 },
      { page: 6, expected: 3 },
    ])("maps page $page to spread $expected", ({ page, expected }) => {
      expect(
        physicalPageToSpreadIndex(page, options),
      ).toBe(expected);
    });
  });
});

describe("spreadIndexToVisiblePages", () => {
  describe("single-page mode", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "single",
      coverOffset: false,
      totalPages: 3,
    };

    test.each([
      {
        index: 0,
        expected: {
          index: 0,
          anchorPage: 1,
          pages: [1],
        },
      },
      {
        index: 1,
        expected: {
          index: 1,
          anchorPage: 2,
          pages: [2],
        },
      },
      {
        index: 2,
        expected: {
          index: 2,
          anchorPage: 3,
          pages: [3],
        },
      },
    ])("maps spread $index correctly", ({ index, expected }) => {
      expect(
        spreadIndexToVisiblePages(index, options),
      ).toEqual(expected);
    });
  });

  describe("double-page mode without cover offset", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "double",
      coverOffset: false,
      totalPages: 5,
    };

    test.each([
      {
        index: 0,
        expected: {
          index: 0,
          anchorPage: 1,
          pages: [1, 2],
        },
      },
      {
        index: 1,
        expected: {
          index: 1,
          anchorPage: 3,
          pages: [3, 4],
        },
      },
      {
        index: 2,
        expected: {
          index: 2,
          anchorPage: 5,
          pages: [5],
        },
      },
    ])("maps spread $index correctly", ({ index, expected }) => {
      expect(
        spreadIndexToVisiblePages(index, options),
      ).toEqual(expected);
    });
  });

  describe("double-page mode with cover offset", () => {
    const options: ReaderPaginationOptions = {
      displayMode: "double",
      coverOffset: true,
      totalPages: 6,
    };

    test.each([
      {
        index: 0,
        expected: {
          index: 0,
          anchorPage: 1,
          pages: [1],
        },
      },
      {
        index: 1,
        expected: {
          index: 1,
          anchorPage: 2,
          pages: [2, 3],
        },
      },
      {
        index: 2,
        expected: {
          index: 2,
          anchorPage: 4,
          pages: [4, 5],
        },
      },
      {
        index: 3,
        expected: {
          index: 3,
          anchorPage: 6,
          pages: [6],
        },
      },
    ])("maps spread $index correctly", ({ index, expected }) => {
      expect(
        spreadIndexToVisiblePages(index, options),
      ).toEqual(expected);
    });
  });
});

describe("input normalization", () => {
  const singleOptions: ReaderPaginationOptions = {
    displayMode: "single",
    coverOffset: false,
    totalPages: 5,
  };

  test.each([
    { page: -10, expected: 0 },
    { page: 0, expected: 0 },
    { page: 1.9, expected: 0 },
    { page: 5, expected: 4 },
    { page: 100, expected: 4 },
    { page: Number.NaN, expected: 0 },
    { page: Number.POSITIVE_INFINITY, expected: 0 },
    { page: Number.NEGATIVE_INFINITY, expected: 0 },
  ])(
    "normalizes physical page $page to spread $expected",
    ({ page, expected }) => {
      expect(
        physicalPageToSpreadIndex(
          page,
          singleOptions,
        ),
      ).toBe(expected);
    },
  );

  test.each([
    {
      index: -10,
      expected: {
        index: 0,
        anchorPage: 1,
        pages: [1],
      },
    },
    {
      index: 100,
      expected: {
        index: 4,
        anchorPage: 5,
        pages: [5],
      },
    },
    {
      index: 2.8,
      expected: {
        index: 2,
        anchorPage: 3,
        pages: [3],
      },
    },
    {
      index: Number.NaN,
      expected: {
        index: 0,
        anchorPage: 1,
        pages: [1],
      },
    },
    {
      index: Number.POSITIVE_INFINITY,
      expected: {
        index: 0,
        anchorPage: 1,
        pages: [1],
      },
    },
  ])(
    "normalizes spread index $index",
    ({ index, expected }) => {
      expect(
        spreadIndexToVisiblePages(
          index,
          singleOptions,
        ),
      ).toEqual(expected);
    },
  );
});

test("returns an empty spread for a document with no pages", () => {
  expect(
    spreadIndexToVisiblePages(0, {
      displayMode: "double",
      coverOffset: true,
      totalPages: 0,
    }),
  ).toEqual({
    index: 0,
    anchorPage: null,
    pages: [],
  });
});

describe("round-trip pagination", () => {
  test.each([
    {
      displayMode: "single",
      coverOffset: false,
      totalPages: 7,
    },
    {
      displayMode: "double",
      coverOffset: false,
      totalPages: 7,
    },
    {
      displayMode: "double",
      coverOffset: true,
      totalPages: 7,
    },
    {
      displayMode: "double",
      coverOffset: true,
      totalPages: 8,
    },
  ] satisfies ReaderPaginationOptions[])(
    "every page belongs to its calculated spread: $displayMode, coverOffset=$coverOffset, total=$totalPages",
    (options) => {
      for (
        let page = 1;
        page <= options.totalPages;
        page++
      ) {
        const index =
          physicalPageToSpreadIndex(
            page,
            options,
          );

        const spread =
          spreadIndexToVisiblePages(
            index,
            options,
          );

        expect(spread.pages).toContain(page);
      }
    },
  );
});

describe("spread coverage", () => {
  test.each([
    {
      displayMode: "single",
      coverOffset: false,
      totalPages: 7,
    },
    {
      displayMode: "double",
      coverOffset: false,
      totalPages: 7,
    },
    {
      displayMode: "double",
      coverOffset: true,
      totalPages: 7,
    },
  ] satisfies ReaderPaginationOptions[])(
    "covers every page exactly once: $displayMode, coverOffset=$coverOffset",
    (options) => {
      const spreadCount =
        getSpreadCount(options);

      const allPages = Array.from(
        { length: spreadCount },
        (_, index) =>
          spreadIndexToVisiblePages(
            index,
            options,
          ).pages,
      ).flat();

      expect(allPages).toEqual(
        Array.from(
          { length: options.totalPages },
          (_, index) => index + 1,
        ),
      );
    },
  );
});