import type {
  BackupSourceScore,
  PortableBackupScore,
} from "./backup.types";

export function mapScoreToPortable(
  score: BackupSourceScore,
  storedFileName: string | null,
  fileIncluded: boolean
): PortableBackupScore {
  return {
    id: score.id,
    title: score.title,
    originalFilename: score.originalFilename,

    documentType: score.documentType,
    composer: score.composer,
    arranger: score.arranger,
    editor: score.editor,
    publisher: score.publisher,
    genre: score.genre,
    keySignature: score.keySignature,
    timeSignature: score.timeSignature,
    pageCount: score.pageCount,

    storedFileName,
    fileIncluded,

    createdAt: score.createdAt,
    updatedAt: score.updatedAt,
    lastOpenedAt: score.lastOpenedAt,
  };
}