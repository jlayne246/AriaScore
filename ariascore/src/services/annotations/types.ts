export type DrawingTool =
  | "pen"
  | "highlighter"
  | "eraser";

export type InputMode =
  | "stylus"
  | "touch"
  | "auto";

export interface AnnotationPoint {
  // Normalized page coordinates, between 0 and 1.
  x: number;
  y: number;
  pressure?: number;
}

interface AnnotationBase {
  id: string;
  pageIndex: number;
  color: string;
  opacity: number;

  // Relative to the unrotated page width.
  strokeWidth: number;

  createdAt: number;
  updatedAt: number;
}

export interface StrokeAnnotation
  extends AnnotationBase {
  type: "pen" | "highlighter";
  points: AnnotationPoint[];
}

export interface TextAnnotation
  extends AnnotationBase {
  type: "text";
  position: AnnotationPoint;
  text: string;
  fontSize: number;
}

export type Annotation =
  | StrokeAnnotation
  | TextAnnotation;

export interface AnnotationDocument {
  documentId: string;
  coordinateSystemVersion: 1;
  annotations: Annotation[];
}

export interface DrawingSettings {
  tool: DrawingTool;
  color: string;
  width: number;
  opacity: number;
  inputMode: InputMode;
  palmRejectionEnabled: boolean;
}