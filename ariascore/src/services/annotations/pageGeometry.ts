export interface PageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getContainedPageRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): PageRect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight
  );

  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}