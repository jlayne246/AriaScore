import { getDatabase } from '../../../utils/database';
import { BackupRepository } from './backup.repository';
import { BackupService } from './backup.service';

export async function createBackupService(): Promise<BackupService> {
  const db = await getDatabase();
  const repository = new BackupRepository(db);

  return new BackupService(repository);
}