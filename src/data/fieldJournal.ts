import type { EntityId, JournalEntry } from '../domain/models';
import type { AppDataRepositories } from './contracts';

export type FieldJournalData = {
  entries: JournalEntry[];
};

export async function loadFieldJournal(
  repositories: AppDataRepositories,
  farmId: EntityId,
): Promise<FieldJournalData> {
  const entries = await repositories.journal.listByFarm(farmId);

  return {
    entries: entries
      .filter((entry) => entry.status !== 'planned')
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
  };
}
