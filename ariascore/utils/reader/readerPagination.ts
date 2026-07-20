export type ReaderDisplayMode = "single" | "double";

export interface ReaderPaginationOptions {
  displayMode: ReaderDisplayMode;
  coverOffset: boolean;
  totalPages: number;
}

export interface VisibleSpread {
  index: number;
  anchorPage: number | null;
  pages: number[];
}

function toSafeInteger(
  value: number,
  fallback: number
): number {
  return Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

export function clampPage(
  page: number,
  totalPages: number,
): number {
  const safeTotalPages =
    Number.isFinite(totalPages)
      ? Math.max(0, Math.trunc(totalPages))
      : 0;

  if (safeTotalPages === 0) {
    return 0;
  }

  const requestedPage =
    Number.isFinite(page)
      ? Math.trunc(page)
      : 1;

  return Math.max(
    1,
    Math.min(requestedPage, safeTotalPages),
  );
}

function clampIndex(
  index: number,
  maxIndex: number
): number {
  if (maxIndex < 0) {
    return 0;
  }

  const safeIndex = Number.isFinite(index)
    ? Math.trunc(index)
    : 0;

  return Math.max(0, Math.min(safeIndex, maxIndex));
}

export function getSpreadCount({
  displayMode,
  coverOffset,
  totalPages,
}: ReaderPaginationOptions): number {
  if (totalPages <= 0) {
    return 0;
  }

  if (displayMode === "single") {
    return totalPages;
  }

  return coverOffset
    ? 1 + Math.ceil((totalPages - 1) / 2)
    : Math.ceil(totalPages / 2);
}

export function physicalPageToSpreadIndex(
  page: number,
  {
    displayMode,
    coverOffset,
    totalPages,
  }: ReaderPaginationOptions
): number {
  const safePage = clampPage(page, totalPages);

  if (displayMode === "single") {
    return safePage - 1;
  }

  if (coverOffset) {
    return safePage === 1
      ? 0
      : Math.ceil((safePage - 1) / 2);
  }

  return Math.floor((safePage - 1) / 2);
}

export function spreadIndexToVisiblePages(
  index: number,
  options: ReaderPaginationOptions
): VisibleSpread {
  const {
    displayMode,
    coverOffset,
    totalPages,
  } = options;

  if (totalPages <= 0) {
    return {
      index: 0,
      anchorPage: null,
      pages: [],
    };
  }

  const spreadCount = getSpreadCount(options);

  const safeIndex = clampIndex(
    index,
    spreadCount - 1
  );

  if (displayMode === "single") {
    const page = clampPage(safeIndex + 1, totalPages);

    return {
      index: safeIndex,
      anchorPage: page,
      pages: [page],
    };
  }

  if (coverOffset && safeIndex === 0) {
    return {
      index: 0,
      anchorPage: 1,
      pages: [1],
    };
  }

  const leftPage = coverOffset
    ? safeIndex * 2
    : safeIndex * 2 + 1;

  const pages = [leftPage];

  if (leftPage + 1 <= totalPages) {
    pages.push(leftPage + 1);
  }

  return {
    index: safeIndex,
    anchorPage: leftPage,
    pages,
  };
}