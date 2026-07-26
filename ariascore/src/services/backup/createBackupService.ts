import { getDatabase } from "../../../utils/database";

import { BackupExportService } from "./backup.export.service";
import { BackupRepository } from "./backup.repository";

export async function createBackupService(): Promise<BackupExportService> {
  const database = await getDatabase();
  const repository = new BackupRepository(database);

  return new BackupExportService(repository);
}