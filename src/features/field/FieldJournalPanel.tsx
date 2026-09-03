import { useEffect, useMemo, useState } from 'react';
import { Droplets, Leaf, Scissors, Sprout } from 'lucide-react';
import type { AppDataRepositories } from '../../data/contracts';
import { loadFieldJournal } from '../../data/fieldJournal';
import type { EntityId, JournalEntry, JournalEntryKind } from '../../domain/models';

type JournalFilter = 'all' | 'treatment' | 'irrigation' | 'work';

type FieldJournalPanelProps = {
  repositories: AppDataRepositories;
  farmId: EntityId;
};

const monthLabels = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function formatJournalDate(value: string) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, '0')} ${monthLabels[date.getMonth()]}`;
}

function getEntryIcon(kind: JournalEntryKind) {
  if (kind === 'irrigation') return Droplets;
  if (kind === 'pruning') return Scissors;
  if (kind === 'fertilization') return Sprout;
  return Leaf;
}

function getEntryMeta(entry: JournalEntry) {
  if (entry.status === 'cancelled') return 'Cancelado';
  if (entry.status === 'planned') return 'Pendiente';
  if (entry.kind === 'fertilization') return 'Registrado';
  return 'Completado';
}

function matchesFilter(entry: JournalEntry, filter: JournalFilter) {
  if (filter === 'all') return true;
  if (filter === 'treatment') return entry.kind === 'treatment';
  if (filter === 'irrigation') return entry.kind === 'irrigation';
  return ['pruning', 'fertilization', 'harvest', 'inspection'].includes(entry.kind);
}

export function FieldJournalPanel({ repositories, farmId }: FieldJournalPanelProps) {
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setEntries(null);
    setLoadFailed(false);

    loadFieldJournal(repositories, farmId)
      .then((data) => {
        if (active) setEntries(data.entries);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [farmId, repositories]);

  const visibleEntries = useMemo(
    () => (entries ?? []).filter((entry) => matchesFilter(entry, filter)),
    [entries, filter],
  );

  return (
    <section className="section-block section-block--last">
      <div className="section-heading">
        <div><span className="eyebrow">Cuaderno de campo</span><h1>Actividad reciente</h1></div>
        <button className="text-action" type="button" onClick={() => setFilter('all')}>Filtrar</button>
      </div>

      <div className="journal-filters">
        <button type="button" className={filter === 'all' ? 'journal-filter journal-filter--active' : 'journal-filter'} onClick={() => setFilter('all')}>Todas</button>
        <button type="button" className={filter === 'treatment' ? 'journal-filter journal-filter--active' : 'journal-filter'} onClick={() => setFilter('treatment')}>Tratamientos</button>
        <button type="button" className={filter === 'irrigation' ? 'journal-filter journal-filter--active' : 'journal-filter'} onClick={() => setFilter('irrigation')}>Riego</button>
        <button type="button" className={filter === 'work' ? 'journal-filter journal-filter--active' : 'journal-filter'} onClick={() => setFilter('work')}>Labores</button>
      </div>

      {entries === null ? (
        <div className="notice-card">
          <Sprout size={20} />
          <div><strong>{loadFailed ? 'No se pudo cargar el cuaderno' : 'Cargando actividad'}</strong><span>{loadFailed ? 'Revisa la conexión o la fuente de datos.' : 'Preparando tus últimas anotaciones.'}</span></div>
        </div>
      ) : (
        <div className="journal-list">
          {visibleEntries.map((entry) => {
            const Icon = getEntryIcon(entry.kind);
            return (
              <article key={entry.id} className="journal-entry">
                <div className="journal-entry__date">{formatJournalDate(entry.occurredAt)}</div>
                <div className="journal-entry__icon"><Icon size={20} /></div>
                <div className="journal-entry__copy"><strong>{entry.title}</strong><span>{entry.detail ?? 'Sin detalle'}</span></div>
                <small>{getEntryMeta(entry)}</small>
              </article>
            );
          })}
          {visibleEntries.length === 0 && (
            <article className="journal-entry">
              <div className="journal-entry__icon"><Sprout size={20} /></div>
              <div className="journal-entry__copy"><strong>Sin registros</strong><span>No hay anotaciones para este filtro.</span></div>
            </article>
          )}
        </div>
      )}

      <button className="primary-button primary-button--wide" type="button">+ Nueva anotación</button>
    </section>
  );
}
