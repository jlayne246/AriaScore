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
    composer: score.composer,
    originalFileName: score.originalFileName,
    storedFileName,
    fileIncluded,
    createdAt: score.createdAt,
    updatedAt: score.updatedAt,
    lastOpenedAt: score.lastOpenedAt,
  };
}